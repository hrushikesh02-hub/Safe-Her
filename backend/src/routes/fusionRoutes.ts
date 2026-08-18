import express from "express";
import { verifyToken } from "../middleware/authMiddleware";
import {
  analyzeFusionController,
  triggerFusionSOS,
} from "../controllers/fusionController";

const router = express.Router();

router.use(verifyToken);

/**
 * POST /api/ai/fusion/analyze
 * Combine voice + movement + gps scores into unified risk score
 * Body: { voice_risk_score, movement_risk_score, gps_context_score, weights?, scenario? }
 */
router.post("/analyze", analyzeFusionController);

/**
 * POST /api/ai/fusion/trigger-sos
 * Create an AI_FUSION SOS incident (with duplicate protection)
 */
router.post("/trigger-sos", triggerFusionSOS);

export default router;
