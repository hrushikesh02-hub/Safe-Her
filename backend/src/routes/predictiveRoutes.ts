import express from "express";
import {
  evaluatePredictiveSafety,
  getUserTrends,
  getAdminPredictiveInsights,
} from "../controllers/predictiveController";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware";

const router = express.Router();

// Evaluate current user predictive safety
router.post("/evaluate", verifyToken, evaluatePredictiveSafety);

// Get user risk score historical trend
router.get("/trends", verifyToken, getUserTrends);

// Admin predictive insights
router.get("/admin-insights", verifyToken, authorizeRoles("admin"), getAdminPredictiveInsights);

export default router;
