import mongoose from "mongoose";
import Alert, { IAlert, IAssignmentRecord, ITimelineEvent } from "../models/Alert";
import User, { IUser } from "../models/User";
import Contact from "../models/Contact";
import { IncidentPriorityEngine, PriorityClassificationResult } from "./incidentPriorityEngine";
import { VolunteerRankingEngine, CandidateVolunteer, RankedVolunteer } from "./volunteerRankingEngine";
import { sendEmail } from "../config/email";

// Configurable constants
const VOLUNTEER_SEARCH_RADIUS_KM = parseFloat(process.env.VOLUNTEER_SEARCH_RADIUS_KM || "5.0");
const DEFAULT_RESPONSE_TIMEOUT_SEC = parseInt(process.env.VOLUNTEER_RESPONSE_TIMEOUT_SECONDS || "35", 10);

// Active timers for volunteer timeout handling
const activeAssignmentTimers = new Map<string, NodeJS.Timeout>();

export interface EmergencyDispatchInput {
  alertId: string;
  userId: string;
  latitude: number;
  longitude: number;
  source: "MANUAL_SOS" | "AI_VOICE" | "AI_MOVEMENT" | "AI_FUSION";
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskScore?: number;
  distressType?: string;
  detectedKeywords?: string[];
  movementAnomaly?: string;
  routeDeviated?: boolean;
  suddenStop?: boolean;
  gpsContextScore?: number;
  fusionSource?: string;
}

export class EmergencyDispatchService {
  /**
   * Primary entry point when any SOS incident is created (Manual, Voice AI, Movement AI, Fusion).
   * 1. Runs IncidentPriorityEngine (P1-P4)
   * 2. Adds initial timeline events
   * 3. Finds eligible nearby volunteers
   * 4. Runs VolunteerRankingEngine
   * 5. Selects top candidate and initiates assignment + timeout
   * 6. Dispatches notifications to emergency contacts & selected volunteer
   */
  static async initiateEmergencyDispatch(input: EmergencyDispatchInput): Promise<IAlert | null> {
    try {
      const alert = await Alert.findById(input.alertId);
      if (!alert) return null;

      // 1. Classify Priority (P1/P2/P3/P4)
      const priorityResult: PriorityClassificationResult = await IncidentPriorityEngine.classify({
        finalRiskScore: input.riskScore ?? (alert.finalRiskScore || alert.riskScore || 50),
        riskLevel: input.riskLevel ?? alert.riskLevel ?? "HIGH",
        source: input.source,
        distressType: input.distressType ?? alert.distressType,
        detectedKeywords: input.detectedKeywords ?? alert.detectedKeywords ?? [],
        movementAnomaly: input.movementAnomaly ?? alert.movementAnomalyType,
        routeDeviated: input.routeDeviated ?? alert.routeDeviated ?? false,
      });

      // Update Alert with priority classification
      alert.priority = priorityResult.priority;
      alert.priorityScore = priorityResult.priority_score;
      alert.priorityReasons = priorityResult.reasons;
      alert.responseStatus = "ASSIGNMENT_PENDING";

      // 2. Initialize Response Timeline
      if (!alert.responseTimeline) {
        alert.responseTimeline = [];
      }

      alert.responseTimeline.push({
        timestamp: new Date(),
        event: "INCIDENT_CREATED",
        description: `Emergency incident created via ${input.source}. Priority classified as ${priorityResult.priority} (${priorityResult.priority_label} - Score: ${priorityResult.priority_score}/100)`,
        actor: "System",
      });

      // 3. Notify Trusted Emergency Contacts immediately
      this.notifyEmergencyContacts(input.userId, alert, input).catch((err) =>
        console.error("[EmergencyDispatch] Emergency contacts notification error:", err?.message || err)
      );

      // 4. Find Eligible Volunteers
      const eligibleVolunteers = await this.findEligibleVolunteers(input.latitude, input.longitude);

      if (eligibleVolunteers.length === 0) {
        // No volunteers available in radius -> trigger escalation
        alert.escalationLevel = "ADMIN_ALERT";
        alert.aiRecommendation = "Prototype AI Recommendation: No nearby active volunteer found. Escalated to Admin Control Center & Emergency Contacts.";
        alert.responseTimeline.push({
          timestamp: new Date(),
          event: "NO_VOLUNTEERS_AVAILABLE",
          description: `No eligible volunteers found within ${VOLUNTEER_SEARCH_RADIUS_KM}km radius. Incident remains in high alert.`,
          actor: "IncidentPriorityEngine",
        });

        await alert.save();
        return alert;
      }

      // 5. Rank Volunteers using the Ranking Engine
      const rankedCandidates: RankedVolunteer[] = await VolunteerRankingEngine.rankResponders(
        input.latitude,
        input.longitude,
        eligibleVolunteers,
        VOLUNTEER_SEARCH_RADIUS_KM
      );

      if (rankedCandidates.length === 0) {
        alert.escalationLevel = "ADMIN_ALERT";
        alert.aiRecommendation = "Prototype AI Recommendation: No responsive volunteer candidate available. Admin intervention advised.";
        alert.responseTimeline.push({
          timestamp: new Date(),
          event: "NO_SUITABLE_CANDIDATE",
          description: "All detected volunteers are currently unavailable.",
          actor: "VolunteerRankingEngine",
        });
        await alert.save();
        return alert;
      }

      // 6. Select Candidate(s)
      const topCandidate = rankedCandidates[0];
      const timeoutSeconds = priorityResult.recommended_timeout_seconds || DEFAULT_RESPONSE_TIMEOUT_SEC;

      alert.assignedVolunteerId = new mongoose.Types.ObjectId(topCandidate.volunteerId);
      alert.assignedVolunteerName = topCandidate.name;
      alert.assignedVolunteerPhone = topCandidate.phone;
      alert.assignedAt = new Date();
      alert.estimatedEtaMinutes = topCandidate.estimatedEtaMinutes;
      alert.responseStatus = "ASSIGNMENT_PENDING";
      alert.aiRecommendation = `Prototype AI Recommendation: Assigned to top-ranked volunteer ${topCandidate.name} (${topCandidate.distanceKm}km, ETA: ${topCandidate.estimatedEtaMinutes}m, Score: ${topCandidate.responseScore}/100).`;

      if (!alert.assignmentHistory) {
        alert.assignmentHistory = [];
      }

      const assignmentRecord: IAssignmentRecord = {
        volunteerId: new mongoose.Types.ObjectId(topCandidate.volunteerId),
        volunteerName: topCandidate.name,
        volunteerEmail: topCandidate.email,
        volunteerPhone: topCandidate.phone,
        distanceKm: topCandidate.distanceKm,
        responseScore: topCandidate.responseScore,
        status: "NOTIFIED",
        notifiedAt: new Date(),
      };

      alert.assignmentHistory.push(assignmentRecord);

      alert.responseTimeline.push({
        timestamp: new Date(),
        event: "VOLUNTEER_NOTIFIED",
        description: `Selected top responder ${topCandidate.name} (${topCandidate.distanceKm}km away, Score: ${topCandidate.responseScore}/100). Awaiting acceptance within ${timeoutSeconds}s.`,
        actor: "SmartAssignmentEngine",
      });

      try {
        await alert.save();
      } catch (saveErr: any) {
        if (saveErr?.name === "VersionError") {
          const freshAlert = await Alert.findById(alert._id);
          if (freshAlert) {
            freshAlert.priority = alert.priority;
            freshAlert.priorityScore = alert.priorityScore;
            freshAlert.priorityReasons = alert.priorityReasons;
            freshAlert.responseStatus = alert.responseStatus;
            freshAlert.assignedVolunteerId = alert.assignedVolunteerId;
            freshAlert.assignedVolunteerName = alert.assignedVolunteerName;
            freshAlert.assignedVolunteerPhone = alert.assignedVolunteerPhone;
            freshAlert.assignedAt = alert.assignedAt;
            freshAlert.estimatedEtaMinutes = alert.estimatedEtaMinutes;
            freshAlert.aiRecommendation = alert.aiRecommendation;
            if (alert.assignmentHistory) freshAlert.assignmentHistory = alert.assignmentHistory;
            if (alert.responseTimeline) freshAlert.responseTimeline = alert.responseTimeline;
            await freshAlert.save();
          }
        } else {
          throw saveErr;
        }
      }

      // 7. Dispatch Email / In-App Notification to Volunteer
      this.sendVolunteerNotificationEmail(topCandidate, alert).catch((err) =>
        console.error("[EmergencyDispatch] Volunteer notification error:", err?.message || err)
      );

      // 8. Arm Volunteer Response Timeout Timer
      this.armAssignmentTimeout(alert._id.toString(), topCandidate.volunteerId, timeoutSeconds);

      return alert;
    } catch (error: any) {
      console.error("[EmergencyDispatchService] Dispatch failure:", error);
      return null;
    }
  }

  /**
   * Search for registered, unblocked, active volunteers
   */
  static async findEligibleVolunteers(lat: number, lng: number): Promise<CandidateVolunteer[]> {
    const volunteers = await User.find({
      role: "volunteer",
      isBlocked: false,
      lastKnownLatitude: { $exists: true, $ne: null },
      lastKnownLongitude: { $exists: true, $ne: null },
    }).lean();

    return volunteers.map((v: any) => ({
      id: v._id.toString(),
      name: v.name,
      email: v.email,
      phone: v.phone,
      latitude: v.lastKnownLatitude,
      longitude: v.lastKnownLongitude,
      volunteerStatus: v.volunteerStatus || "AVAILABLE",
      lastLocationAt: v.lastLocationAt,
      volunteerStats: v.volunteerStats || {
        totalAssignments: 0,
        acceptedCount: 0,
        rejectedCount: 0,
        timedOutCount: 0,
        resolvedCount: 0,
        averageResponseTimeSec: 0,
      },
    }));
  }

  /**
   * Handle Volunteer Acceptance
   */
  static async handleVolunteerAccept(alertId: string, volunteerId: string): Promise<IAlert | null> {
    const alert = await Alert.findById(alertId);
    if (!alert) throw new Error("Incident not found");

    if (alert.status === "resolved" || alert.responseStatus === "RESOLVED") {
      throw new Error("Incident is already resolved");
    }

    // Clear any active timeout timer
    this.clearAssignmentTimeout(alertId);

    const volunteer = await User.findById(volunteerId);
    if (!volunteer) throw new Error("Volunteer not found");

    const now = new Date();
    alert.status = "accepted";
    alert.acceptedBy = volunteer._id as mongoose.Types.ObjectId;
    alert.assignedVolunteerId = volunteer._id as mongoose.Types.ObjectId;
    alert.assignedVolunteerName = volunteer.name;
    alert.assignedVolunteerPhone = volunteer.phone;
    alert.acceptedAt = now;
    alert.responseStatus = "RESPONDING";
    alert.respondingAt = now;

    // Update assignment history record
    if (alert.assignmentHistory && alert.assignmentHistory.length > 0) {
      const lastRec = alert.assignmentHistory[alert.assignmentHistory.length - 1];
      if (lastRec.volunteerId.toString() === volunteerId) {
        lastRec.status = "ACCEPTED";
        lastRec.respondedAt = now;
      }
    }

    // Add timeline event
    alert.responseTimeline?.push({
      timestamp: now,
      event: "VOLUNTEER_ACCEPTED",
      description: `${volunteer.name} accepted the emergency dispatch and is now actively responding.`,
      actor: volunteer.name,
    });

    alert.aiRecommendation = `Prototype AI Recommendation: ${volunteer.name} en route. Live tracking and ETA calculation active.`;

    await alert.save();

    // Update Volunteer statistics
    await User.findByIdAndUpdate(volunteerId, {
      volunteerStatus: "BUSY",
      $inc: {
        "volunteerStats.totalAssignments": 1,
        "volunteerStats.acceptedCount": 1,
      },
    });

    return alert;
  }

  /**
   * Handle Volunteer Rejection (with reason) & Auto-Reassignment
   */
  static async handleVolunteerReject(alertId: string, volunteerId: string, reason?: string): Promise<IAlert | null> {
    const alert = await Alert.findById(alertId);
    if (!alert) throw new Error("Incident not found");

    // Clear timeout
    this.clearAssignmentTimeout(alertId);

    const now = new Date();
    const volunteer = await User.findById(volunteerId);
    const volunteerName = volunteer?.name || "Volunteer";

    // Mark last record as REJECTED
    if (alert.assignmentHistory && alert.assignmentHistory.length > 0) {
      const lastRec = alert.assignmentHistory[alert.assignmentHistory.length - 1];
      if (lastRec.volunteerId.toString() === volunteerId) {
        lastRec.status = "REJECTED";
        lastRec.respondedAt = now;
        lastRec.rejectionReason = reason || "Declined response";
      }
    }

    alert.responseTimeline?.push({
      timestamp: now,
      event: "VOLUNTEER_REJECTED",
      description: `${volunteerName} declined dispatch: "${reason || "No reason provided"}". Automatic reassignment triggered.`,
      actor: volunteerName,
    });

    // Update Volunteer statistics
    await User.findByIdAndUpdate(volunteerId, {
      $inc: {
        "volunteerStats.totalAssignments": 1,
        "volunteerStats.rejectedCount": 1,
      },
    });

    await alert.save();

    // Automatically find & assign next eligible candidate
    return this.reassignNextCandidate(alertId);
  }

  /**
   * Handle Volunteer Timeout & Auto-Reassignment
   */
  static async handleVolunteerTimeout(alertId: string, volunteerId: string): Promise<IAlert | null> {
    const alert = await Alert.findById(alertId);
    if (!alert) return null;

    // Check if alert was already accepted or resolved
    if (alert.responseStatus !== "ASSIGNMENT_PENDING" && alert.responseStatus !== "NOTIFYING") {
      return alert;
    }

    const now = new Date();
    const volunteer = await User.findById(volunteerId);
    const volunteerName = volunteer?.name || "Volunteer";

    // Mark as TIMED_OUT
    if (alert.assignmentHistory && alert.assignmentHistory.length > 0) {
      const lastRec = alert.assignmentHistory[alert.assignmentHistory.length - 1];
      if (lastRec.volunteerId.toString() === volunteerId && lastRec.status === "NOTIFIED") {
        lastRec.status = "TIMED_OUT";
        lastRec.respondedAt = now;
      }
    }

    alert.responseTimeline?.push({
      timestamp: now,
      event: "VOLUNTEER_TIMEOUT",
      description: `${volunteerName} did not respond within the designated window. Automatic failover reassignment initiated.`,
      actor: "SmartAssignmentEngine",
    });

    // Update volunteer stats
    await User.findByIdAndUpdate(volunteerId, {
      $inc: {
        "volunteerStats.totalAssignments": 1,
        "volunteerStats.timedOutCount": 1,
      },
    });

    await alert.save();

    // Automatically trigger reassignment
    return this.reassignNextCandidate(alertId);
  }

  /**
   * Reassign incident to next best ranked candidate
   */
  static async reassignNextCandidate(alertId: string, preferredVolunteerId?: string): Promise<IAlert | null> {
    const alert = await Alert.findById(alertId);
    if (!alert) return null;

    // If preferred volunteer specified (e.g. by admin)
    if (preferredVolunteerId) {
      const directVol = await User.findById(preferredVolunteerId);
      if (directVol) {
        alert.assignedVolunteerId = directVol._id as mongoose.Types.ObjectId;
        alert.assignedVolunteerName = directVol.name;
        alert.assignedVolunteerPhone = directVol.phone;
        alert.assignedAt = new Date();
        alert.responseStatus = "ASSIGNMENT_PENDING";

        alert.assignmentHistory?.push({
          volunteerId: directVol._id as mongoose.Types.ObjectId,
          volunteerName: directVol.name,
          volunteerEmail: directVol.email,
          volunteerPhone: directVol.phone,
          status: "NOTIFIED",
          notifiedAt: new Date(),
        });

        alert.responseTimeline?.push({
          timestamp: new Date(),
          event: "ADMIN_REASSIGNED",
          description: `Admin manually assigned incident to ${directVol.name}.`,
          actor: "Admin",
        });

        await alert.save();
        this.armAssignmentTimeout(alertId, directVol._id.toString(), DEFAULT_RESPONSE_TIMEOUT_SEC);
        return alert;
      }
    }

    // Otherwise find all eligible candidates excluding already attempted ones
    const attemptedVolunteerIds = new Set(
      (alert.assignmentHistory || []).map((h) => h.volunteerId.toString())
    );

    const allEligible = await this.findEligibleVolunteers(alert.latitude, alert.longitude);
    const unattempted = allEligible.filter((v) => !attemptedVolunteerIds.has(v.id));

    if (unattempted.length === 0) {
      // Escalation: No further volunteers available
      alert.escalationLevel = "HIGH_ESCALATION";
      alert.aiRecommendation = "Prototype AI Recommendation: All nearby volunteers exhausted. Immediate Admin Escalation and Emergency Services notification required.";
      alert.responseTimeline?.push({
        timestamp: new Date(),
        event: "ESCALATION_TRIGGERED",
        description: "All candidate volunteers exhausted. High priority emergency escalation dispatched to Admin Control.",
        actor: "EmergencyEscalationEngine",
      });
      await alert.save();
      return alert;
    }

    const ranked: RankedVolunteer[] = await VolunteerRankingEngine.rankResponders(
      alert.latitude,
      alert.longitude,
      unattempted,
      VOLUNTEER_SEARCH_RADIUS_KM
    );

    if (ranked.length === 0) {
      alert.escalationLevel = "HIGH_ESCALATION";
      await alert.save();
      return alert;
    }

    const nextCandidate = ranked[0];
    alert.assignedVolunteerId = new mongoose.Types.ObjectId(nextCandidate.volunteerId);
    alert.assignedVolunteerName = nextCandidate.name;
    alert.assignedVolunteerPhone = nextCandidate.phone;
    alert.assignedAt = new Date();
    alert.estimatedEtaMinutes = nextCandidate.estimatedEtaMinutes;
    alert.responseStatus = "REASSIGNED";

    alert.assignmentHistory?.push({
      volunteerId: new mongoose.Types.ObjectId(nextCandidate.volunteerId),
      volunteerName: nextCandidate.name,
      volunteerEmail: nextCandidate.email,
      volunteerPhone: nextCandidate.phone,
      distanceKm: nextCandidate.distanceKm,
      responseScore: nextCandidate.responseScore,
      status: "NOTIFIED",
      notifiedAt: new Date(),
    });

    alert.responseTimeline?.push({
      timestamp: new Date(),
      event: "REASSIGNED_TO_VOLUNTEER",
      description: `Reassigned to next best candidate ${nextCandidate.name} (${nextCandidate.distanceKm}km, Score: ${nextCandidate.responseScore}/100).`,
      actor: "SmartAssignmentEngine",
    });

    await alert.save();

    this.sendVolunteerNotificationEmail(nextCandidate, alert).catch((err) =>
      console.error("[EmergencyDispatch] Reassignment email error:", err)
    );

    this.armAssignmentTimeout(alertId, nextCandidate.volunteerId, DEFAULT_RESPONSE_TIMEOUT_SEC);

    return alert;
  }

  /**
   * Update Live Responder GPS Location & recalculate ETA
   */
  static async updateResponderLocation(
    alertId: string,
    volunteerId: string,
    lat: number,
    lng: number
  ): Promise<IAlert | null> {
    const alert = await Alert.findById(alertId);
    if (!alert) throw new Error("Incident not found");

    const assignedIdStr = (alert.assignedVolunteerId as any)?._id?.toString() || alert.assignedVolunteerId?.toString();
    if (!assignedIdStr) {
      alert.assignedVolunteerId = new mongoose.Types.ObjectId(volunteerId);
    }

    const now = new Date();
    alert.responderLiveLocation = {
      latitude: lat,
      longitude: lng,
      updatedAt: now,
    };

    // Calculate distance to user incident
    const distKm = haversineDistanceKm(lat, lng, alert.latitude, alert.longitude);
    const speed = 25.0; // km/h urban transit
    const etaMinutes = Math.round(Math.max(1.0, (distKm / speed) * 60.0 + 1.0) * 10) / 10;
    alert.estimatedEtaMinutes = etaMinutes;

    // Automatic transition to NEARBY if within 300 meters
    if (distKm <= 0.3 && alert.responseStatus === "RESPONDING") {
      alert.responseStatus = "NEARBY";
      alert.responseTimeline?.push({
        timestamp: now,
        event: "RESPONDER_NEARBY",
        description: `Volunteer is within ${Math.round(distKm * 1000)}m of emergency scene.`,
        actor: alert.assignedVolunteerName || "Volunteer",
      });
    }

    await alert.save();

    // Also update volunteer's profile last known location
    await User.findByIdAndUpdate(volunteerId, {
      lastKnownLatitude: lat,
      lastKnownLongitude: lng,
      lastLocationAt: now,
    });

    return alert;
  }

  /**
   * Step to Mark Volunteer Arrived
   */
  static async markVolunteerArrived(alertId: string, volunteerId: string): Promise<IAlert | null> {
    const alert = await Alert.findById(alertId);
    if (!alert) throw new Error("Incident not found");

    const now = new Date();
    alert.responseStatus = "ARRIVED";
    alert.arrivedAt = now;
    alert.estimatedEtaMinutes = 0;

    alert.responseTimeline?.push({
      timestamp: now,
      event: "RESPONDER_ARRIVED",
      description: `${alert.assignedVolunteerName || "Volunteer"} arrived at the incident scene. Providing direct assistance.`,
      actor: alert.assignedVolunteerName || "Volunteer",
    });

    alert.aiRecommendation = "Prototype AI Recommendation: Volunteer on scene. Ensure safety and verify user well-being before concluding incident.";

    await alert.save();
    return alert;
  }

  /**
   * Resolve Incident & Generate Post-Incident AI Structured Summary
   */
  static async resolveIncident(
    alertId: string,
    resolverId: string,
    resolutionNotes?: string
  ): Promise<IAlert | null> {
    const alert = await Alert.findById(alertId);
    if (!alert) throw new Error("Incident not found");

    const now = new Date();
    const resolver = await User.findById(resolverId);
    const resolverName = resolver?.name || "Responder";

    alert.status = "resolved";
    alert.responseStatus = "RESOLVED";
    alert.resolvedAt = now;

    // Calculate durations
    const createdTime = new Date(alert.createdAt).getTime();
    const assignedTime = alert.assignedAt ? new Date(alert.assignedAt).getTime() : createdTime;
    const acceptedTime = alert.acceptedAt ? new Date(alert.acceptedAt).getTime() : assignedTime;
    const resolvedTime = now.getTime();

    const assignmentDurationSec = Math.max(0, Math.round((acceptedTime - createdTime) / 1000));
    const totalResponseDurationSec = Math.max(0, Math.round((resolvedTime - createdTime) / 1000));

    // Formulate main factors from stored facts
    const mainFactors: string[] = [];
    if (alert.distressType) mainFactors.push(`Distress signature: ${alert.distressType}`);
    if (alert.detectedKeywords && alert.detectedKeywords.length > 0) {
      mainFactors.push(`Keywords: ${alert.detectedKeywords.join(", ")}`);
    }
    if (alert.movementAnomalyType) mainFactors.push(`Movement anomaly: ${alert.movementAnomalyType}`);
    if (alert.routeDeviated) mainFactors.push("GPS corridor deviation detected");
    if (mainFactors.length === 0) mainFactors.push(`Triggered via ${alert.source}`);

    // AI Structured Summary
    alert.resolutionSummary = {
      incidentType: `AI ${alert.source || "MANUAL_SOS"} Emergency`,
      priority: alert.priority || "P2",
      initialRisk: alert.finalRiskScore || alert.riskScore || 50,
      mainFactors,
      assignmentDurationSec,
      totalResponseDurationSec,
      responderName: alert.assignedVolunteerName || resolverName,
      resolvedAt: now,
    };

    alert.responseTimeline?.push({
      timestamp: now,
      event: "INCIDENT_RESOLVED",
      description: `Incident successfully resolved by ${resolverName}. Total response duration: ${Math.round(totalResponseDurationSec / 60)}m ${totalResponseDurationSec % 60}s. ${resolutionNotes ? `Notes: "${resolutionNotes}"` : ""}`,
      actor: resolverName,
    });

    await alert.save();

    // Free up volunteer if assigned
    if (alert.assignedVolunteerId) {
      await User.findByIdAndUpdate(alert.assignedVolunteerId, {
        volunteerStatus: "AVAILABLE",
        $inc: {
          "volunteerStats.resolvedCount": 1,
        },
      });
    }

    return alert;
  }

  /**
   * Arm Timeout Timer for Volunteer
   */
  private static armAssignmentTimeout(alertId: string, volunteerId: string, timeoutSec: number) {
    this.clearAssignmentTimeout(alertId);

    const timer = setTimeout(async () => {
      try {
        console.log(`⏱ Volunteer ${volunteerId} timed out on incident ${alertId} (${timeoutSec}s)`);
        await EmergencyDispatchService.handleVolunteerTimeout(alertId, volunteerId);
      } catch (err) {
        console.error(`[EmergencyDispatch] Timeout processing error for alert ${alertId}:`, err);
      } finally {
        activeAssignmentTimers.delete(alertId);
      }
    }, timeoutSec * 1000);

    activeAssignmentTimers.set(alertId, timer);
  }

  private static clearAssignmentTimeout(alertId: string) {
    const existing = activeAssignmentTimers.get(alertId);
    if (existing) {
      clearTimeout(existing);
      activeAssignmentTimers.delete(alertId);
    }
  }

  /**
   * Helper: Send Rich Volunteer Notification Email
   */
  private static async sendVolunteerNotificationEmail(candidate: RankedVolunteer, alert: IAlert) {
    try {
      const mapsUrl = `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`;
      const dateTime = new Date().toLocaleString();
      const subject = `🚨 [${alert.priority || "P1"} EMERGENCY] SafeHer Responder Dispatch Required (${candidate.distanceKm}km)`;

      const reasonsHtml =
        alert.priorityReasons && alert.priorityReasons.length > 0
          ? `<tr>
              <td style="padding:10px 12px; background-color:#f8f9fa; border:1px solid #eeeeee; font-size:14px; color:#555555;">Detection Factors</td>
              <td style="padding:10px 12px; background-color:#ffffff; border:1px solid #eeeeee; font-size:14px; color:#d90429; font-weight:bold;">${alert.priorityReasons.join("<br/>• ")}</td>
            </tr>`
          : "";

      const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8" /><title>SafeHer Emergency Dispatch</title></head>
        <body style="margin:0; padding:0; background-color:#f2f2f2; font-family: Arial, sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" style="max-width:600px; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
                  <tr>
                    <td style="background-color:#7c3aed; padding:24px; text-align:center;">
                      <h1 style="color:#ffffff; margin:0; font-size:22px;">🚨 SafeHer Priority Emergency Dispatch</h1>
                      <p style="color:#ede9fe; margin:6px 0 0; font-size:13px;">Selected based on proximity (${candidate.distanceKm}km) & response score (${candidate.responseScore}/100)</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px;">
                      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px;margin-bottom:16px;text-align:center;">
                        <div style="font-size:28px;font-weight:bold;color:#d90429;">PRIORITY ${alert.priority || "P1"}</div>
                        <div style="font-size:14px;color:#666;margin-top:4px;">Risk Level: ${alert.riskLevel || "CRITICAL"} (${alert.finalRiskScore || alert.riskScore || 85}/100)</div>
                      </div>

                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-bottom:20px;">
                        <tr>
                          <td style="padding:10px 12px; background-color:#f8f9fa; border:1px solid #eeeeee; font-size:14px; color:#555555; width:40%;">Distance / ETA</td>
                          <td style="padding:10px 12px; background-color:#ffffff; border:1px solid #eeeeee; font-size:14px; color:#111111; font-weight:bold;">${candidate.distanceKm} km (~${candidate.estimatedEtaMinutes} mins)</td>
                        </tr>
                        <tr>
                          <td style="padding:10px 12px; background-color:#f8f9fa; border:1px solid #eeeeee; font-size:14px; color:#555555;">Date &amp; Time</td>
                          <td style="padding:10px 12px; background-color:#ffffff; border:1px solid #eeeeee; font-size:14px; color:#111111; font-weight:bold;">${dateTime}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px 12px; background-color:#f8f9fa; border:1px solid #eeeeee; font-size:14px; color:#555555;">Incident ID</td>
                          <td style="padding:10px 12px; background-color:#ffffff; border:1px solid #eeeeee; font-size:14px; color:#111111; font-weight:bold;">${alert._id}</td>
                        </tr>
                        ${reasonsHtml}
                      </table>

                      <div style="text-align:center; padding:12px 0 20px;">
                        <a href="${mapsUrl}" target="_blank" rel="noreferrer"
                          style="background-color:#7c3aed; color:#ffffff; text-decoration:none; font-size:15px; font-weight:bold; padding:14px 32px; border-radius:8px; display:inline-block;">
                          📍 View Location &amp; Accept in Dashboard
                        </a>
                      </div>

                      <div style="background-color:#f5f3ff; border:1px solid #ddd6fe; border-radius:8px; padding:14px 18px;">
                        <p style="margin:0 0 6px; font-size:14px; color:#7c3aed; font-weight:bold;">Action Required:</p>
                        <p style="margin:0; font-size:13px; color:#333; line-height:1.5;">
                          Please open your <strong>SafeHer Volunteer Dashboard</strong> to accept or decline. If no action is taken within the timeout window, the system will automatically reassign the incident.
                        </p>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
      `;

      await sendEmail({ to: candidate.email, subject, html });
      console.log(`✅ [EmergencyDispatch] Responder dispatch email delivered to ${candidate.email}`);
    } catch (e: any) {
      console.warn(`[EmergencyDispatch] Failed to send email to ${candidate.email}:`, e?.message);
    }
  }

  /**
   * Helper: Notify Emergency Contacts
   */
  private static async notifyEmergencyContacts(userId: string, alert: IAlert, input: EmergencyDispatchInput) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const contacts = await Contact.find({ user: userId });
      if (contacts.length === 0) return;

      const mapsUrl = `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`;
      const dateTime = new Date().toLocaleString();
      const subject = `🚨 EMERGENCY SOS ALERT [${alert.priority || "P1"}] - ${user.name} Needs Immediate Help`;

      for (const contact of contacts) {
        try {
          const html = `
          <!DOCTYPE html>
          <html>
            <body style="font-family: Arial, sans-serif; background-color:#f8f9fa; padding:20px;">
              <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:10px; overflow:hidden; border:1px solid #e5e7eb;">
                <div style="background:#dc2626; color:#ffffff; padding:20px; text-align:center;">
                  <h2 style="margin:0;">🚨 Emergency SOS Alert (${alert.priority || "P1"})</h2>
                  <p style="margin:6px 0 0; font-size:14px;">SafeHer Emergency Notification System</p>
                </div>
                <div style="padding:20px;">
                  <p style="font-size:15px; color:#1f2937;">Dear <strong>${contact.contactName}</strong>,</p>
                  <p style="font-size:14px; color:#374151; line-height:1.5;">
                    <strong>${user.name}</strong> triggered an emergency distress alert via SafeHer. Nearby responders and emergency monitoring have been notified.
                  </p>
                  <ul style="font-size:14px; color:#374151; line-height:1.6;">
                    <li><strong>Priority:</strong> ${alert.priority || "P1"} (${alert.riskLevel || "CRITICAL"})</li>
                    <li><strong>Time:</strong> ${dateTime}</li>
                    <li><strong>User Phone:</strong> ${user.phone}</li>
                    <li><strong>Incident ID:</strong> ${alert._id}</li>
                  </ul>
                  <div style="text-align:center; margin:24px 0;">
                    <a href="${mapsUrl}" target="_blank" style="background:#dc2626; color:#ffffff; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:bold; display:inline-block;">
                      📍 View Live Incident Map
                    </a>
                  </div>
                </div>
              </div>
            </body>
          </html>
          `;
          await sendEmail({ to: contact.contactEmail, subject, html });
        } catch (err: any) {
          console.warn(`[EmergencyDispatch] Failed to email contact ${contact.contactEmail}:`, err?.message);
        }
      }
    } catch (err: any) {
      console.error("[EmergencyDispatch] Error notifying emergency contacts:", err?.message);
    }
  }
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
