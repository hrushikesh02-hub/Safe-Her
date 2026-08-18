import express from "express";
import { verifyToken } from "../middleware/authMiddleware";
import {
  analyzeMovementController,
  triggerMovementSOS,
} from "../controllers/movementController";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * POST /api/ai/movement/analyze
 * Analyze accelerometer + GPS data for movement anomalies
 * Body: MovementAnalysisPayload (see movementAIService.ts)
 */
router.post("/analyze", analyzeMovementController);

/**
 * POST /api/ai/movement/trigger-sos
 * Create an AI_MOVEMENT SOS incident (with duplicate protection)
 */
router.post("/trigger-sos", triggerMovementSOS);

export default router;
