import { Response } from "express";
import Alert, { IAlert } from "../models/Alert";
import User from "../models/User";
import { AuthRequest } from "../middleware/authMiddleware";
import mongoose from "mongoose";
import { EmergencyDispatchService } from "../services/emergencyDispatchService";

/* ===================================================================
   createAlert — manual SOS / generic SOS dispatch
   Phase 4: Initiates EmergencyDispatchService immediately
=================================================================== */
export const createAlert = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      latitude,
      longitude,
      source,
      riskLevel,
      riskScore,
      distressType,
      confidence,
      detectedKeywords,
      movementAnomaly,
      routeDeviated,
    } = req.body;

    if (latitude == null || longitude == null) {
      res.status(400).json({ success: false, message: "Location is required" });
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    const alert = await Alert.create({
      user: req.user?.id,
      latitude: lat,
      longitude: lng,
      status: "active",
      source: source || "MANUAL_SOS",
      riskLevel: riskLevel || "HIGH",
      riskScore: riskScore || undefined,
      distressType: distressType || undefined,
      confidence: confidence || undefined,
      detectedKeywords: detectedKeywords || [],
      routeDeviated: routeDeviated || false,
    });

    console.log(`✅ [SOS CREATED] ID: ${alert._id} | User: ${req.user?.id} | Source: ${alert.source}`);

    // Fire-and-forget Phase 4 Dispatch Engine
    EmergencyDispatchService.initiateEmergencyDispatch({
      alertId: (alert._id as mongoose.Types.ObjectId).toString(),
      userId: req.user!.id,
      latitude: lat,
      longitude: lng,
      source: source || "MANUAL_SOS",
      riskLevel: riskLevel || "HIGH",
      riskScore: riskScore,
      distressType,
      detectedKeywords,
      movementAnomaly,
      routeDeviated,
    }).catch((err) => console.error("[createAlert] Dispatch error:", err));

    res.status(201).json({
      success: true,
      message: "SOS Alert created and emergency dispatch initiated",
      data: alert,
    });
  } catch (error: any) {
    console.error("Create Alert Error:", error);
    res.status(500).json({ success: false, message: error?.message || "Server Error" });
  }
};

/* ===================================================================
   getAlertHistory — User's own alerts
=================================================================== */
export const getAlertHistory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const alerts = await Alert.find({ user: req.user?.id })
      .populate("assignedVolunteerId", "name phone email profileImage")
      .populate("acceptedBy", "name phone email profileImage")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: alerts });
  } catch (error: any) {
    console.error("Get Alert History Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ===================================================================
   getActiveAlerts — Admin / Volunteer viewing active alerts
=================================================================== */
export const getActiveAlerts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const alerts = await Alert.find({ status: { $in: ["active", "accepted"] } })
      .populate("user", "name phone email profileImage")
      .populate("assignedVolunteerId", "name phone email profileImage")
      .populate("acceptedBy", "name phone email profileImage")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: alerts });
  } catch (error: any) {
    console.error("Get Active Alerts Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ===================================================================
   getAlertById
=================================================================== */
export const getAlertById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid Alert ID" });
      return;
    }

    const alert = await Alert.findById(id)
      .populate("user", "name phone email profileImage isVerified")
      .populate("assignedVolunteerId", "name phone email profileImage")
      .populate("acceptedBy", "name phone email profileImage")
      .populate("assignmentHistory.volunteerId", "name phone email profileImage");

    if (!alert) {
      res.status(404).json({ success: false, message: "Alert not found" });
      return;
    }

    res.status(200).json({ success: true, data: alert });
  } catch (error: any) {
    console.error("Get Alert By ID Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ===================================================================
   acceptAlert — Volunteer accepts assignment
=================================================================== */
export const acceptAlert = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const volunteerId = req.user!.id;

    const updated = await EmergencyDispatchService.handleVolunteerAccept(id, volunteerId);
    if (!updated) {
      res.status(404).json({ success: false, message: "Alert not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Emergency assignment accepted. You are now responding.",
      data: updated,
    });
  } catch (error: any) {
    console.error("Accept Alert Error:", error);
    res.status(400).json({ success: false, message: error?.message || "Failed to accept alert" });
  }
};

/* ===================================================================
   rejectAlert — Volunteer declines assignment (with reason)
=================================================================== */
export const rejectAlert = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;
    const volunteerId = req.user!.id;

    const updated = await EmergencyDispatchService.handleVolunteerReject(id, volunteerId, reason);

    res.status(200).json({
      success: true,
      message: "Assignment declined. Incident auto-reassigned to next candidate.",
      data: updated,
    });
  } catch (error: any) {
    console.error("Reject Alert Error:", error);
    res.status(400).json({ success: false, message: error?.message || "Failed to decline alert" });
  }
};

/* ===================================================================
   startResponse — Responder indicates en-route navigation started
=================================================================== */
export const startResponse = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const alert = await Alert.findById(id);
    if (!alert) {
      res.status(404).json({ success: false, message: "Alert not found" });
      return;
    }

    alert.responseStatus = "RESPONDING";
    alert.respondingAt = new Date();
    alert.responseTimeline?.push({
      timestamp: new Date(),
      event: "RESPONSE_STARTED",
      description: `${req.user?.id ? "Volunteer" : "Responder"} initiated active route navigation to emergency location.`,
      actor: alert.assignedVolunteerName || "Volunteer",
    });

    await alert.save();
    res.status(200).json({ success: true, message: "Response started", data: alert });
  } catch (error: any) {
    console.error("Start Response Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ===================================================================
   markNearby — Responder indicates proximity (within 300m)
=================================================================== */
export const markNearby = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const alert = await Alert.findById(id);
    if (!alert) {
      res.status(404).json({ success: false, message: "Alert not found" });
      return;
    }

    alert.responseStatus = "NEARBY";
    alert.responseTimeline?.push({
      timestamp: new Date(),
      event: "RESPONDER_NEARBY",
      description: "Responder arrived within proximity of the emergency site.",
      actor: alert.assignedVolunteerName || "Volunteer",
    });

    await alert.save();
    res.status(200).json({ success: true, message: "Marked nearby", data: alert });
  } catch (error: any) {
    console.error("Mark Nearby Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ===================================================================
   markArrived — Volunteer arrived on scene
=================================================================== */
export const markArrived = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const updated = await EmergencyDispatchService.markVolunteerArrived(id, req.user!.id);
    if (!updated) {
      res.status(404).json({ success: false, message: "Alert not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Arrived at emergency location",
      data: updated,
    });
  } catch (error: any) {
    console.error("Mark Arrived Error:", error);
    res.status(400).json({ success: false, message: error?.message || "Failed to mark arrived" });
  }
};

/* ===================================================================
   updateResponderLocation — Update live location & recalculate ETA
=================================================================== */
export const updateResponderLocation = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { latitude, longitude } = req.body;

    if (latitude == null || longitude == null) {
      res.status(400).json({ success: false, message: "latitude and longitude required" });
      return;
    }

    const updated = await EmergencyDispatchService.updateResponderLocation(
      id,
      req.user!.id,
      parseFloat(latitude),
      parseFloat(longitude)
    );

    res.status(200).json({
      success: true,
      message: "Responder location & ETA updated",
      data: updated,
    });
  } catch (error: any) {
    console.error("Update Responder Location Error:", error);
    res.status(400).json({ success: false, message: error?.message || "Failed to update location" });
  }
};

/* ===================================================================
   resolveAlert — Resolve incident & generate AI structured summary
=================================================================== */
export const resolveAlert = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { notes } = req.body;

    const updated = await EmergencyDispatchService.resolveIncident(id, req.user!.id, notes);
    if (!updated) {
      res.status(404).json({ success: false, message: "Alert not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Incident resolved successfully. AI summary generated.",
      data: updated,
    });
  } catch (error: any) {
    console.error("Resolve Alert Error:", error);
    res.status(400).json({ success: false, message: error?.message || "Failed to resolve alert" });
  }
};

/* ===================================================================
   reassignAlert — Admin or system reassignment
=================================================================== */
export const reassignAlert = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { volunteerId } = req.body;

    const updated = await EmergencyDispatchService.reassignNextCandidate(id, volunteerId);
    if (!updated) {
      res.status(404).json({ success: false, message: "Alert not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Incident reassigned successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("Reassign Alert Error:", error);
    res.status(400).json({ success: false, message: error?.message || "Failed to reassign alert" });
  }
};

/* ===================================================================
   escalateAlert — Admin or system priority escalation
=================================================================== */
export const escalateAlert = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { priority, escalationLevel, reason } = req.body;

    const alert = await Alert.findById(id);
    if (!alert) {
      res.status(404).json({ success: false, message: "Alert not found" });
      return;
    }

    if (priority) alert.priority = priority;
    alert.escalationLevel = escalationLevel || "HIGH_ESCALATION";
    alert.responseTimeline?.push({
      timestamp: new Date(),
      event: "MANUAL_ESCALATION",
      description: `Incident escalated by Admin. Priority: ${alert.priority}. Reason: ${reason || "High operational risk"}`,
      actor: "Admin",
    });

    await alert.save();

    res.status(200).json({
      success: true,
      message: "Incident escalated successfully",
      data: alert,
    });
  } catch (error: any) {
    console.error("Escalate Alert Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ===================================================================
   getIncidentTimeline — Return full event log
=================================================================== */
export const getIncidentTimeline = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const alert = await Alert.findById(id).select("responseTimeline priority priorityReasons responseStatus");
    if (!alert) {
      res.status(404).json({ success: false, message: "Alert not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        timeline: alert.responseTimeline || [],
        priority: alert.priority,
        priorityReasons: alert.priorityReasons,
        responseStatus: alert.responseStatus,
      },
    });
  } catch (error: any) {
    console.error("Get Incident Timeline Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ===================================================================
   getIncidentResponders — Return ranked candidates and assignment history
=================================================================== */
export const getIncidentResponders = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const alert = await Alert.findById(id)
      .populate("assignedVolunteerId", "name phone email volunteerStatus lastLocationAt")
      .populate("assignmentHistory.volunteerId", "name phone email volunteerStatus");

    if (!alert) {
      res.status(404).json({ success: false, message: "Alert not found" });
      return;
    }

    const eligible = await EmergencyDispatchService.findEligibleVolunteers(alert.latitude, alert.longitude);

    res.status(200).json({
      success: true,
      data: {
        assignedVolunteer: alert.assignedVolunteerId,
        assignmentHistory: alert.assignmentHistory || [],
        eligibleNearbyCount: eligible.length,
        eligibleCandidates: eligible,
      },
    });
  } catch (error: any) {
    console.error("Get Incident Responders Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};