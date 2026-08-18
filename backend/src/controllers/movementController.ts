import { Response } from "express";
import Alert from "../models/Alert";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware";
import { analyzeMovement, analyzeGPSContext } from "../services/movementAIService";
import { notifyContactsAndVolunteers } from "./alertController";
import SafeZone from "../models/SafeZone";

const MOVEMENT_CRITICAL_THRESHOLD = parseInt(
  process.env.MOVEMENT_CRITICAL_THRESHOLD || "70"
);
const DUPLICATE_SOS_WINDOW_MINUTES = 0.25;

/* ===================================================================
   POST /api/ai/movement/analyze
   Analyze movement data via FastAPI, return result to frontend
=================================================================== */
export const analyzeMovementController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const payload = req.body;

    // Enrich with safe zones from DB for GPS context (fire-and-forget enrichment)
    let safeZones: any[] = [];
    try {
      const zones = await SafeZone.find().lean();
      safeZones = zones.map((z: any) => ({
        latitude: z.latitude,
        longitude: z.longitude,
        radius_m: z.radius ?? 500,
        name: z.name || "",
      }));
    } catch (e) {
      console.warn("⚠ Could not fetch SafeZones for GPS context:", e);
    }

    const result = await analyzeMovement(payload);

    // Also run GPS context if coordinates provided
    let gpsContext = null;
    if (payload.latitude != null && payload.longitude != null) {
      try {
        gpsContext = await analyzeGPSContext({
          latitude: parseFloat(payload.latitude),
          longitude: parseFloat(payload.longitude),
          speed_kmh: payload.speed_kmh,
          hour_of_day: new Date().getHours(),
          safe_zones: safeZones,
          stationary_duration_sec: payload.stationary_duration_sec,
        });
      } catch (e) {
        console.warn("⚠ GPS context analysis failed:", e);
      }
    }

    res.status(200).json({
      success: true,
      movement: result,
      gps_context: gpsContext,
    });
  } catch (error: any) {
    console.error("Movement analyze controller error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Movement analysis failed",
    });
  }
};

/* ===================================================================
   POST /api/ai/movement/trigger-sos
   Create AI_MOVEMENT SOS incident with duplicate protection
=================================================================== */
export const triggerMovementSOS = async (
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
      movementRiskScore,
      movementAnomalyType,
      gpsContextScore,
      riskLevel,
      routeDeviated,
      suddenStop,
      stationaryAlert,
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
      source: "AI_MOVEMENT",
      status: { $in: ["active", "accepted"] },
      createdAt: { $gte: windowStart },
    }).sort({ createdAt: -1 });

    if (existing) {
      res.status(200).json({
        success: true,
        message: "Active movement SOS already exists",
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
      source: "AI_MOVEMENT",
      riskLevel: riskLevel || "HIGH",
      riskScore: movementRiskScore || undefined,
      movementRiskScore: movementRiskScore || undefined,
      movementAnomalyType: movementAnomalyType || undefined,
      gpsContextScore: gpsContextScore || undefined,
      routeDeviated: routeDeviated || false,
      suddenStop: suddenStop || false,
      stationaryAlert: stationaryAlert || false,
    });

    console.log(`✅ AI Movement SOS created: ${alert._id}`);

    // Fire-and-forget notifications
    notifyContactsAndVolunteers(
      userId,
      (alert._id as mongoose.Types.ObjectId).toString(),
      lat,
      lng,
      "AI_MOVEMENT",
      riskLevel || "HIGH",
      movementRiskScore || 0,
      movementAnomalyType || "unknown",
      []
    ).catch((err) => console.error("Movement SOS notification error:", err));

    res.status(201).json({
      success: true,
      message: "AI Movement SOS triggered successfully",
      isDuplicate: false,
      data: alert,
    });
  } catch (error: any) {
    console.error("Trigger movement SOS error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to trigger movement SOS",
    });
  }
};
