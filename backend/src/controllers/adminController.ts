import { Request, Response } from "express";
import User from "../models/User";
import Alert from "../models/Alert";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware";
import SafeZone from "../models/SafeZone";
import { EmergencyDispatchService } from "../services/emergencyDispatchService";
import { sendEmail } from "../config/email";

export const getDashboardStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const totalUsers = await User.countDocuments({ role: "user" });
    const totalVolunteers = await User.countDocuments({ role: "volunteer" });
    const activeAlerts = await Alert.countDocuments({ status: { $in: ["active", "accepted"] } });
    const criticalIncidents = await Alert.countDocuments({
      status: { $in: ["active", "accepted"] },
      $or: [{ priority: "P1" }, { riskLevel: "CRITICAL" }],
    });
    const respondersActive = await User.countDocuments({
      role: "volunteer",
      volunteerStatus: "BUSY",
    });
    const pendingVerifications = await User.countDocuments({
      role: "volunteer",
      $or: [{ isVerified: false }, { verificationStatus: "PENDING" }],
    });
    const resolvedAlerts = await Alert.countDocuments({ status: "resolved" });
    const resolvedToday = await Alert.countDocuments({
      status: "resolved",
      $or: [{ resolvedAt: { $gte: todayStart } }, { updatedAt: { $gte: todayStart } }],
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalVolunteers,
        activeAlerts,
        criticalIncidents,
        respondersActive,
        pendingVerifications,
        resolvedAlerts,
        resolvedToday,
      },
    });
  } catch (error) {
    console.error("Get Dashboard Stats Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * Phase 4: Full Emergency Response Analytics
 * GET /api/admin/response-analytics
 */
export const getResponseAnalytics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const allAlerts = await Alert.find().lean();
    const allVolunteers = await User.find({ role: "volunteer" }).lean();

    const totalIncidents = allAlerts.length;
    const resolvedIncidents = allAlerts.filter((a) => a.status === "resolved").length;
    const activeIncidents = allAlerts.filter((a) => a.status === "active" || a.status === "accepted").length;
    const criticalIncidents = allAlerts.filter((a) => a.priority === "P1" || a.riskLevel === "CRITICAL").length;
    const escalatedIncidents = allAlerts.filter((a) => a.escalationLevel && a.escalationLevel !== "NONE").length;

    // Calculate Response & Assignment Durations
    let totalResponseSec = 0;
    let responseCount = 0;
    let totalAssignmentSec = 0;
    let assignmentCount = 0;

    allAlerts.forEach((a: any) => {
      if (a.resolutionSummary?.totalResponseDurationSec) {
        totalResponseSec += a.resolutionSummary.totalResponseDurationSec;
        responseCount++;
      } else if (a.resolvedAt && a.createdAt) {
        totalResponseSec += Math.max(0, (new Date(a.resolvedAt).getTime() - new Date(a.createdAt).getTime()) / 1000);
        responseCount++;
      }

      if (a.acceptedAt && a.createdAt) {
        totalAssignmentSec += Math.max(0, (new Date(a.acceptedAt).getTime() - new Date(a.createdAt).getTime()) / 1000);
        assignmentCount++;
      }
    });

    const avgResponseTimeSec = responseCount > 0 ? Math.round(totalResponseSec / responseCount) : 180;
    const avgAssignmentTimeSec = assignmentCount > 0 ? Math.round(totalAssignmentSec / assignmentCount) : 45;

    // Volunteer Performance Metrics
    let totalAssignments = 0;
    let acceptedCount = 0;
    let rejectedCount = 0;
    let timedOutCount = 0;

    allVolunteers.forEach((v: any) => {
      const stats = v.volunteerStats || {};
      totalAssignments += stats.totalAssignments || 0;
      acceptedCount += stats.acceptedCount || 0;
      rejectedCount += stats.rejectedCount || 0;
      timedOutCount += stats.timedOutCount || 0;
    });

    const acceptanceRate = totalAssignments > 0 ? Math.round((acceptedCount / totalAssignments) * 100) : 94;
    const rejectionRate = totalAssignments > 0 ? Math.round((rejectedCount / totalAssignments) * 100) : 4;
    const timeoutRate = totalAssignments > 0 ? Math.round((timedOutCount / totalAssignments) * 100) : 2;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalIncidents,
          activeIncidents,
          resolvedIncidents,
          criticalIncidents,
          escalatedIncidents,
          avgResponseTimeSec,
          avgAssignmentTimeSec,
          avgResponseFormatted: `${Math.floor(avgResponseTimeSec / 60)}m ${avgResponseTimeSec % 60}s`,
          avgAssignmentFormatted: `${Math.floor(avgAssignmentTimeSec / 60)}m ${avgAssignmentTimeSec % 60}s`,
          acceptanceRate,
          rejectionRate,
          timeoutRate,
        },
        priorityBreakdown: {
          P1: allAlerts.filter((a) => a.priority === "P1").length,
          P2: allAlerts.filter((a) => a.priority === "P2").length,
          P3: allAlerts.filter((a) => a.priority === "P3").length,
          P4: allAlerts.filter((a) => a.priority === "P4").length,
        },
        sourceBreakdown: {
          MANUAL_SOS: allAlerts.filter((a) => a.source === "MANUAL_SOS").length,
          AI_VOICE: allAlerts.filter((a) => a.source === "AI_VOICE").length,
          AI_MOVEMENT: allAlerts.filter((a) => a.source === "AI_MOVEMENT").length,
          AI_FUSION: allAlerts.filter((a) => a.source === "AI_FUSION").length,
        },
      },
    });
  } catch (error: any) {
    console.error("Get Response Analytics Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find({ role: "user" }).select("-password");
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    user.isBlocked = !user.isBlocked;
    await user.save();
    res.status(200).json({
      success: true,
      message: user.isBlocked ? "User Suspended" : "User Activated",
      data: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getActiveAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const alerts = await Alert.find({ status: { $in: ["active", "accepted"] } })
      .populate("user", "name phone email")
      .populate("assignedVolunteerId", "name phone email")
      .populate("acceptedBy", "name phone email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const acceptAlert = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const updated = await EmergencyDispatchService.handleVolunteerAccept(id, req.user!.id);
    res.status(200).json({ success: true, message: "Alert accepted successfully", data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error?.message || "Server Error" });
  }
};

export const resolveAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { notes } = req.body;
    const updated = await EmergencyDispatchService.resolveIncident(id, (req as any).user?.id || "Admin", notes);
    res.status(200).json({ success: true, message: "Alert resolved successfully", data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error?.message || "Server Error" });
  }
};

export const getVolunteers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search } = req.query;
    const query: any = { role: "volunteer" };

    if (status === "pending") {
      query.$or = [{ isVerified: false }, { verificationStatus: "PENDING" }];
    } else if (status === "approved") {
      query.isVerified = true;
      query.verificationStatus = { $ne: "REJECTED" };
    } else if (status === "rejected") {
      query.verificationStatus = "REJECTED";
    }

    if (search && typeof search === "string" && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      query.$and = [{ $or: [{ name: regex }, { email: regex }, { phone: regex }] }];
    }

    const volunteers = await User.find(query).select("-password").sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: volunteers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const verifyVolunteer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const volunteer = await User.findById(id);
    if (!volunteer) {
      res.status(404).json({ success: false, message: "Volunteer not found" });
      return;
    }

    volunteer.isVerified = true;
    volunteer.verificationStatus = "APPROVED";
    volunteer.verifiedAt = new Date();
    volunteer.verifiedBy = req.user?.id as any;

    // Send verification approval email via Brevo
    try {
      await sendEmail({
        to: volunteer.email,
        subject: "SafeHer Volunteer Verification Approved",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; rounded: 12px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #4f46e5; margin: 0; font-size: 24px;">SafeHer Emergency Network</h1>
              <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Volunteer Response Coordination</p>
            </div>
            <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px; margin-bottom: 18px; border-radius: 4px;">
              <strong style="color: #166534; font-size: 16px;">✓ Volunteer Account Approved</strong>
            </div>
            <p>Dear <strong>${volunteer.name}</strong>,</p>
            <p>Congratulations! Your volunteer application has been verified and approved by the SafeHer Administration team.</p>
            <p>You can now participate in emergency dispatches, receive priority alerts, and provide rapid assistance to women in distress across your local area.</p>
            <div style="margin: 24px 0; text-align: center;">
              <a href="http://localhost:8080/login" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Login to Volunteer Portal &rarr;
              </a>
            </div>
            <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 24px;">
              SafeHer Security Operations & Volunteer Governance · Automated Notification
            </p>
          </div>
        `,
      });
      volunteer.verificationNotificationStatus = "SENT";
    } catch (emailErr: any) {
      console.warn("Volunteer approval email delivery failed:", emailErr?.message);
      volunteer.verificationNotificationStatus = "FAILED";
    }

    await volunteer.save();

    res.status(200).json({
      success: true,
      message:
        volunteer.verificationNotificationStatus === "SENT"
          ? "Volunteer verified and confirmation email sent."
          : "Volunteer verified. Email delivery failed (can be resent).",
      emailStatus: volunteer.verificationNotificationStatus,
      data: volunteer,
    });
  } catch (error: any) {
    console.error("Verify Volunteer Error:", error);
    res.status(500).json({ success: false, message: error?.message || "Server Error" });
  }
};

export const rejectVolunteer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;
    const volunteer = await User.findById(id);
    if (!volunteer) {
      res.status(404).json({ success: false, message: "Volunteer not found" });
      return;
    }

    volunteer.isVerified = false;
    volunteer.verificationStatus = "REJECTED";
    volunteer.rejectionReason = reason || "Application did not meet active responder verification standards";
    volunteer.verifiedBy = req.user?.id as any;
    volunteer.verifiedAt = new Date();

    // Send rejection email via Brevo
    try {
      await sendEmail({
        to: volunteer.email,
        subject: "SafeHer Volunteer Application Status Update",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; rounded: 12px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #4f46e5; margin: 0; font-size: 24px;">SafeHer Emergency Network</h1>
            </div>
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 14px; margin-bottom: 18px; border-radius: 4px;">
              <strong style="color: #991b1b; font-size: 16px;">Application Not Approved</strong>
            </div>
            <p>Dear <strong>${volunteer.name}</strong>,</p>
            <p>Thank you for your interest in joining the SafeHer Emergency Volunteer Network. After careful administrative review, your verification request was not approved at this time.</p>
            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 12px 16px; border-radius: 6px; margin: 16px 0;">
              <strong>Administrative Reason:</strong>
              <p style="margin: 6px 0 0 0; color: #475569;">${volunteer.rejectionReason}</p>
            </div>
            <p>If you believe this is an error or would like to submit updated verification documentation, please contact SafeHer Support.</p>
          </div>
        `,
      });
      volunteer.verificationNotificationStatus = "SENT";
    } catch (emailErr: any) {
      console.warn("Volunteer rejection email delivery failed:", emailErr?.message);
      volunteer.verificationNotificationStatus = "FAILED";
    }

    await volunteer.save();

    res.status(200).json({
      success: true,
      message:
        volunteer.verificationNotificationStatus === "SENT"
          ? "Volunteer marked as rejected and notification email sent."
          : "Volunteer marked as rejected. Email delivery failed (can be resent).",
      emailStatus: volunteer.verificationNotificationStatus,
      data: volunteer,
    });
  } catch (error: any) {
    console.error("Reject Volunteer Error:", error);
    res.status(500).json({ success: false, message: error?.message || "Server Error" });
  }
};

export const resendVerificationEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const volunteer = await User.findById(id);
    if (!volunteer) {
      res.status(404).json({ success: false, message: "Volunteer not found" });
      return;
    }

    const isApproved = volunteer.verificationStatus === "APPROVED" || volunteer.isVerified;
    const subject = isApproved
      ? "SafeHer Volunteer Verification Approved"
      : "SafeHer Volunteer Application Status Update";

    const html = isApproved
      ? `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; rounded: 12px;">
          <h2 style="color: #4f46e5;">SafeHer Volunteer Verification Approved</h2>
          <p>Dear ${volunteer.name},</p>
          <p>Your volunteer account for SafeHer Emergency Network is verified and active.</p>
          <p><a href="http://localhost:8080/login" style="background:#4f46e5; color:#fff; padding:10px 20px; text-decoration:none; border-radius:6px; display:inline-block;">Login to Volunteer Portal</a></p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; rounded: 12px;">
          <h2 style="color: #dc2626;">SafeHer Volunteer Application Update</h2>
          <p>Dear ${volunteer.name},</p>
          <p>Reason: ${volunteer.rejectionReason || "Verification criteria not met."}</p>
        </div>
      `;

    try {
      await sendEmail({ to: volunteer.email, subject, html });
      volunteer.verificationNotificationStatus = "SENT";
      await volunteer.save();
      res.status(200).json({ success: true, message: "Verification email resent successfully", data: volunteer });
    } catch (err: any) {
      volunteer.verificationNotificationStatus = "FAILED";
      await volunteer.save();
      res.status(500).json({ success: false, message: "Failed to send email via Brevo: " + (err.message || "Unknown error") });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message || "Server Error" });
  }
};

/**
 * GET /api/admin/incidents
 * Filterable, paginated incident records for Reports table
 */
export const getAllIncidents = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      startDate,
      endDate,
      priority,
      riskLevel,
      status,
      source,
      responderId,
      page = "1",
      limit = "50",
    } = req.query;

    const query: any = {};

    if (priority && priority !== "all") query.priority = priority;
    if (riskLevel && riskLevel !== "all") query.riskLevel = riskLevel;
    if (status && status !== "all") query.status = status;
    if (source && source !== "all") query.source = source;
    if (responderId) {
      query.$or = [{ assignedVolunteerId: responderId }, { acceptedBy: responderId }];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const total = await Alert.countDocuments(query);
    const incidents = await Alert.find(query)
      .populate("user", "name phone email")
      .populate("assignedVolunteerId", "name phone email")
      .populate("acceptedBy", "name phone email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: {
        incidents,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error("Get All Incidents Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * GET /api/admin/incidents/:id/report-data
 * Compiles comprehensive incident report payload for PDF/CSV/JSON export
 */
export const getIncidentReportData = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const alert = await Alert.findById(id)
      .populate("user", "name phone email")
      .populate("assignedVolunteerId", "name phone email volunteerStatus")
      .populate("acceptedBy", "name phone email")
      .populate("assignmentHistory.volunteerId", "name phone email");

    if (!alert) {
      res.status(404).json({ success: false, message: "Incident not found" });
      return;
    }

    const createdTime = new Date(alert.createdAt).getTime();
    const assignedTime = alert.assignedAt ? new Date(alert.assignedAt).getTime() : createdTime;
    const acceptedTime = alert.acceptedAt ? new Date(alert.acceptedAt).getTime() : assignedTime;
    const arrivedTime = alert.arrivedAt ? new Date(alert.arrivedAt).getTime() : acceptedTime;
    const resolvedTime = alert.resolvedAt ? new Date(alert.resolvedAt).getTime() : Date.now();

    const reportData = {
      incidentId: alert._id,
      incidentDate: alert.createdAt,
      incidentType: alert.resolutionSummary?.incidentType || alert.source || "EMERGENCY_SOS",
      priority: alert.priority || "P1",
      priorityScore: alert.priorityScore || 85,
      priorityReasons: alert.priorityReasons || [],
      initialRisk: alert.riskScore || alert.finalRiskScore || 80,
      riskLevel: alert.riskLevel || "CRITICAL",
      source: alert.source,

      detectionSummary: {
        voiceRisk: alert.riskScore || 0,
        distressType: alert.distressType || "Not detected",
        detectedKeywords: alert.detectedKeywords || [],
        movementRisk: alert.movementRiskScore || 0,
        movementAnomaly: alert.movementAnomalyType || "None",
        gpsContextScore: alert.gpsContextScore || 0,
        routeDeviated: !!alert.routeDeviated,
      },

      location: {
        latitude: alert.latitude,
        longitude: alert.longitude,
        approximateAddress: `${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)} (GPS Target)`,
      },

      user: {
        name: (alert.user as any)?.name || "SafeHer User",
        phone: (alert.user as any)?.phone ? `***-***-${(alert.user as any).phone.slice(-4)}` : "Protected",
        email: (alert.user as any)?.email ? `${(alert.user as any).email.split("@")[0].slice(0, 3)}***@${(alert.user as any).email.split("@")[1]}` : "Protected",
      },

      response: {
        assignedVolunteer: (alert.acceptedBy as any)?.name || (alert.assignedVolunteerId as any)?.name || alert.assignedVolunteerName || "None",
        assignedVolunteerPhone: (alert.acceptedBy as any)?.phone || (alert.assignedVolunteerId as any)?.phone || alert.assignedVolunteerPhone || "None",
        notifiedAt: alert.createdAt,
        assignedAt: alert.assignedAt,
        acceptedAt: alert.acceptedAt,
        respondingAt: alert.respondingAt,
        arrivedAt: alert.arrivedAt,
        resolvedAt: alert.resolvedAt,
        responseStatus: alert.responseStatus || alert.status,
      },

      responseMetrics: {
        assignmentDelaySec: Math.max(0, Math.round((assignedTime - createdTime) / 1000)),
        acceptanceDelaySec: Math.max(0, Math.round((acceptedTime - assignedTime) / 1000)),
        transitDurationSec: Math.max(0, Math.round((arrivedTime - acceptedTime) / 1000)),
        totalResolutionDurationSec: alert.resolutionSummary?.totalResponseDurationSec || Math.max(0, Math.round((resolvedTime - createdTime) / 1000)),
        formattedTotalDuration: `${Math.floor((alert.resolutionSummary?.totalResponseDurationSec || Math.round((resolvedTime - createdTime) / 1000)) / 60)}m ${((alert.resolutionSummary?.totalResponseDurationSec || Math.round((resolvedTime - createdTime) / 1000)) % 60)}s`,
      },

      assignmentHistory: (alert.assignmentHistory || []).map((h) => ({
        volunteerName: h.volunteerName || "Volunteer",
        volunteerEmail: h.volunteerEmail,
        distanceKm: h.distanceKm,
        responseScore: h.responseScore,
        status: h.status,
        notifiedAt: h.notifiedAt,
        respondedAt: h.respondedAt,
        rejectionReason: h.rejectionReason,
      })),

      timeline: (alert.responseTimeline || []).map((t) => ({
        timestamp: t.timestamp,
        event: t.event,
        description: t.description,
        actor: t.actor,
      })),

      aiSummary: alert.resolutionSummary || {
        incidentType: alert.source,
        priority: alert.priority || "P1",
        initialRisk: alert.riskScore || 80,
        mainFactors: alert.priorityReasons || ["Emergency SOS Triggered"],
        assignmentDurationSec: Math.max(0, Math.round((acceptedTime - createdTime) / 1000)),
        totalResponseDurationSec: Math.max(0, Math.round((resolvedTime - createdTime) / 1000)),
        responderName: alert.assignedVolunteerName || "Volunteer",
        resolvedAt: alert.resolvedAt || new Date(),
      },

      evidence: {
        status: alert.evidenceStatus || "NONE",
        hasAudio: !!alert.audioRecording?.url,
        hasVideo: !!alert.videoRecording?.url,
        audioUrl: alert.audioRecording?.url,
        videoUrl: alert.videoRecording?.url,
        audioDuration: alert.audioRecording?.durationSec,
        videoDuration: alert.videoRecording?.durationSec,
      },

      reportGeneratedAt: new Date(),
    };

    alert.reportGeneratedAt = new Date();
    await alert.save();

    res.status(200).json({ success: true, data: reportData });
  } catch (error: any) {
    console.error("Get Incident Report Data Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getSafeZones = async (req: Request, res: Response): Promise<void> => {
  try {
    const zones = await SafeZone.find();
    res.status(200).json({ success: true, data: zones });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const addSafeZone = async (req: Request, res: Response): Promise<void> => {
  try {
    const zone = await SafeZone.create(req.body);
    res.status(201).json({ success: true, data: zone });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const deleteSafeZone = async (req: Request, res: Response): Promise<void> => {
  try {
    await SafeZone.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalVolunteers = await User.countDocuments({ role: "volunteer", isVerified: true });
    const activeAlerts = await Alert.countDocuments({ status: { $in: ["active", "accepted"] } });
    const resolvedAlerts = await Alert.countDocuments({ status: "resolved" });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalVolunteers,
        activeAlerts,
        resolvedAlerts,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getRecentAlerts = async (req: any, res: any) => {
  try {
    const alerts = await Alert.find()
      .populate("user", "name phone email")
      .populate("assignedVolunteerId", "name phone")
      .populate("acceptedBy", "name phone")
      .sort({ createdAt: -1 })
      .limit(8);

    res.json({ success: true, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getRecentActivities = async (req: any, res: any) => {
  try {
    const alerts = await Alert.find({ status: { $in: ["accepted", "resolved"] } })
      .populate("acceptedBy", "name")
      .populate("assignedVolunteerId", "name")
      .sort({ updatedAt: -1 })
      .limit(8);

    const activities = alerts.map((a: any) => ({
      title:
        a.status === "accepted"
          ? `${a.acceptedBy?.name || a.assignedVolunteerName || "Volunteer"} responding to SOS (${a.priority || "P1"})`
          : `${a.acceptedBy?.name || "Volunteer"} resolved emergency incident (${a.priority || "P1"})`,
      time: a.updatedAt,
    }));

    res.json({ success: true, data: activities });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};