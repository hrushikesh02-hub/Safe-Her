import { Response } from "express";
import Alert from "../models/Alert";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware";
import { analyzeFusion } from "../services/fusionAIService";
import { notifyContactsAndVolunteers } from "./alertController";

const FUSION_AUTO_SOS_THRESHOLD = parseInt(
  process.env.FUSION_AUTO_SOS_THRESHOLD || "78"
);
const DUPLICATE_SOS_WINDOW_MINUTES = 0.25;

/* ===================================================================
   POST /api/ai/fusion/analyze
   Analyze combined risk scores via FastAPI fusion engine
=================================================================== */
export const analyzeFusionController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { voice_risk_score, movement_risk_score, gps_context_score, weights, scenario } =
      req.body;

    const result = await analyzeFusion({
      voice_risk_score: voice_risk_score ?? 0,
      movement_risk_score: movement_risk_score ?? 0,
      gps_context_score: gps_context_score ?? 0,
      weights,
      scenario,
    });

    res.status(200).json({
      success: true,
      data: result,
      auto_sos_threshold: FUSION_AUTO_SOS_THRESHOLD,
      should_trigger_sos: result.final_risk_score >= FUSION_AUTO_SOS_THRESHOLD,
    });
  } catch (error: any) {
    console.error("Fusion analyze controller error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Fusion analysis failed",
    });
  }
};

/* ===================================================================
   POST /api/ai/fusion/trigger-sos
   Create AI_FUSION SOS incident
=================================================================== */
export const triggerFusionSOS = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const {
      latitude,
      longitude,
      finalRiskScore,
      finalRiskLevel,
      riskScore,       // voice score (compat)
      movementRiskScore,
      gpsContextScore,
      distressType,
      movementAnomalyType,
      fusionSource,
      detectedKeywords,
    } = req.body;

    if (latitude == null || longitude == null) {
      res.status(400).json({
        success: false,
        message: "latitude and longitude are required",
      });
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // Duplicate protection
    const windowStart = new Date(
      Date.now() - DUPLICATE_SOS_WINDOW_MINUTES * 60 * 1000
    );

    const existing = await Alert.findOne({
      user: userId,
      source: "AI_FUSION",
      status: { $in: ["active", "accepted"] },
      createdAt: { $gte: windowStart },
    }).sort({ createdAt: -1 });

    if (existing) {
      res.status(200).json({
        success: true,
        message: "Active fusion SOS already exists",
        isDuplicate: true,
        data: existing,
      });
      return;
    }

    const alert = await Alert.create({
      user: new mongoose.Types.ObjectId(userId),
      latitude: lat,
      longitude: lng,
      status: "active",
      source: "AI_FUSION",
      riskLevel: finalRiskLevel || "CRITICAL",
      riskScore: riskScore || undefined,
      movementRiskScore: movementRiskScore || undefined,
      gpsContextScore: gpsContextScore || undefined,
      finalRiskScore: finalRiskScore || undefined,
      fusionSource: fusionSource || "VOICE+MOVEMENT+GPS",
      distressType: distressType || undefined,
      movementAnomalyType: movementAnomalyType || undefined,
      detectedKeywords: Array.isArray(detectedKeywords) ? detectedKeywords : [],
    });

    console.log(`✅ AI Fusion SOS created: ${alert._id}`);

    // Determine distress description for emails
    const descType = [
      distressType && `voice:${distressType}`,
      movementAnomalyType && `movement:${movementAnomalyType}`,
    ]
      .filter(Boolean)
      .join(", ") || "multi-modal";

    // Fire-and-forget notifications
    notifyContactsAndVolunteers(
      userId,
      (alert._id as mongoose.Types.ObjectId).toString(),
      lat,
      lng,
      "AI_FUSION",
      finalRiskLevel || "CRITICAL",
      finalRiskScore || 0,
      descType,
      Array.isArray(detectedKeywords) ? detectedKeywords : []
    ).catch((err) => console.error("Fusion SOS notification error:", err));

    res.status(201).json({
      success: true,
      message: "AI Fusion SOS triggered successfully",
      isDuplicate: false,
      data: alert,
    });
  } catch (error: any) {
    console.error("Trigger fusion SOS error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to trigger fusion SOS",
    });
  }
};
