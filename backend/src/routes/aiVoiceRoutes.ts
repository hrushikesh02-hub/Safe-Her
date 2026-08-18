import express, { Response } from "express";
import multer from "multer";
import { verifyToken, AuthRequest } from "../middleware/authMiddleware";
import {
  analyzeVoiceAudio,
  getDemoFallbackResponse,
} from "../services/voiceAIService";
import Alert from "../models/Alert";
import mongoose from "mongoose";
import { notifyContactsAndVolunteers } from "../controllers/alertController";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
  },
});

/* ===================================================================
   Configurable thresholds (from env)
=================================================================== */
const VOICE_CRITICAL_THRESHOLD = parseFloat(
  process.env.VOICE_CRITICAL_THRESHOLD || "76"
);
const DUPLICATE_SOS_WINDOW_MINUTES = 0.25; // 15-second throttle to allow rapid response

/**
 * POST /api/ai/voice/analyze
 * Protected route for voice distress analysis
 */
router.post(
  "/analyze",
  verifyToken,
  upload.single("file"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const scenario = req.body?.scenario as string | undefined;
      const file = req.file;

      if (!file && !scenario) {
        res.status(400).json({
          success: false,
          message: "Either an audio file or demo scenario must be provided.",
        });
        return;
      }

      const result = await analyzeVoiceAudio(
        file?.buffer,
        file?.originalname || "recording.wav",
        file?.mimetype || "audio/wav",
        scenario
      );

      res.status(200).json(result);
    } catch (error: any) {
      console.error("AI Voice Analyze Route Error:", error);
      res.status(500).json({
        success: false,
        message: error?.message || "Internal server error analyzing voice",
      });
    }
  }
);

/**
 * GET /api/ai/voice/scenarios
 * Returns preset scenarios for Demo Mode
 */
router.get(
  "/scenarios",
  verifyToken,
  async (_req: AuthRequest, res: Response) => {
    res.status(200).json({
      success: true,
      scenarios: [
        { id: "normal", label: "Normal Speech", expected_risk: "LOW (15)" },
        {
          id: "shouting",
          label: "Repeated Shouting",
          expected_risk: "HIGH (65)",
        },
        {
          id: "help_keyword",
          label: "Help Keyword ('Help / Save Me')",
          expected_risk: "CRITICAL (80)",
        },
        {
          id: "scream",
          label: "Scream Sound",
          expected_risk: "CRITICAL (92)",
        },
        {
          id: "critical",
          label: "Critical Panic Distress",
          expected_risk: "CRITICAL (98)",
        },
      ],
    });
  }
);

/**
 * POST /api/ai/voice/trigger-sos
 * Authenticated endpoint: creates an AI_VOICE SOS incident.
 * Implements duplicate protection: if user already has an active AI_VOICE alert
 * created within the last DUPLICATE_SOS_WINDOW_MINUTES, returns that existing alert.
 *
 * Body:
 *   latitude: number (required)
 *   longitude: number (required)
 *   riskLevel: string
 *   riskScore: number
 *   distressType: string
 *   confidence: number
 *   detectedKeywords: string[]
 */
router.post(
  "/trigger-sos",
  verifyToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const {
        latitude,
        longitude,
        riskLevel,
        riskScore,
        distressType,
        confidence,
        detectedKeywords,
      } = req.body;

      if (latitude == null || longitude == null) {
        res.status(400).json({
          success: false,
          message: "latitude and longitude are required to trigger SOS",
        });
        return;
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (isNaN(lat) || isNaN(lng)) {
        res.status(400).json({
          success: false,
          message: "Invalid latitude or longitude",
        });
        return;
      }

      // ---- Duplicate SOS Protection ----
      const windowStart = new Date(
        Date.now() - DUPLICATE_SOS_WINDOW_MINUTES * 60 * 1000
      );

      const existingAlert = await Alert.findOne({
        user: userId,
        source: "AI_VOICE",
        status: { $in: ["active", "accepted"] },
        createdAt: { $gte: windowStart },
      }).sort({ createdAt: -1 });

      if (existingAlert) {
        console.log(
          `⚠ Duplicate SOS blocked — existing active AI_VOICE alert: ${existingAlert._id}`
        );
        res.status(200).json({
          success: true,
          message: "Active AI Voice SOS already exists — updated existing incident",
          isDuplicate: true,
          data: existingAlert,
        });
        return;
      }

      // ---- Create new AI_VOICE Alert ----
      const alert = await Alert.create({
        user: new mongoose.Types.ObjectId(userId),
        latitude: lat,
        longitude: lng,
        status: "active",
        source: "AI_VOICE",
        riskLevel: riskLevel || "CRITICAL",
        riskScore: riskScore != null ? Number(riskScore) : undefined,
        distressType: distressType || undefined,
        confidence: confidence != null ? Number(confidence) : undefined,
        detectedKeywords: Array.isArray(detectedKeywords)
          ? detectedKeywords
          : [],
      });

      console.log(`✅ AI Voice SOS created: ${alert._id}`);

      // Fire-and-forget notifications — do NOT block the response
      notifyContactsAndVolunteers(
        userId,
        (alert._id as mongoose.Types.ObjectId).toString(),
        lat,
        lng,
        "AI_VOICE",
        riskLevel || "CRITICAL",
        riskScore != null ? Number(riskScore) : 0,
        distressType || "unknown",
        Array.isArray(detectedKeywords) ? detectedKeywords : []
      ).catch((err) =>
        console.error("AI SOS notification error:", err)
      );

      res.status(201).json({
        success: true,
        message: "AI Voice SOS triggered successfully",
        isDuplicate: false,
        data: alert,
      });
    } catch (error: any) {
      console.error("AI Voice Trigger SOS Error:", error);
      res.status(500).json({
        success: false,
        message: error?.message || "Internal server error triggering SOS",
      });
    }
  }
);

export default router;
