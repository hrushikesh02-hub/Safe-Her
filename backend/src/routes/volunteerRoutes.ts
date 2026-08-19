import express from "express";
import {
  getDashboard,
  getAlerts,
  getAlertById,
  acceptAlert,
  rejectAlert,
  resolveAlert,
  getProfile,
  updateProfile,
  getVolunteerIncidents,
  updateVolunteerLocation,
} from "../controllers/volunteerController";
import {
  startResponse,
  markNearby,
  markArrived,
  updateResponderLocation,
} from "../controllers/alertController";

import {
  verifyToken,
  authorizeRoles,
} from "../middleware/authMiddleware";

import { upload } from "../middleware/upload";

const router = express.Router();

/**
 * All volunteer routes require:
 * 1. Valid JWT
 * 2. Volunteer role
 */
router.use(verifyToken);
router.use(authorizeRoles("volunteer"));

/* ================= Dashboard ================= */
router.get("/dashboard", getDashboard);

/* ================= Alerts ================= */
router.get("/alerts", getAlerts);
router.get("/alerts/:id", getAlertById);
router.put("/alerts/:id/accept", acceptAlert);
router.post("/alerts/:id/accept", acceptAlert);
router.post("/alerts/:id/reject", rejectAlert);
router.put("/alerts/:id/resolve", resolveAlert);
router.post("/alerts/:id/resolve", resolveAlert);
router.post("/alerts/:id/start-response", startResponse);
router.post("/alerts/:id/nearby", markNearby);
router.post("/alerts/:id/arrived", markArrived);
router.post("/alerts/:id/responder-location", updateResponderLocation);

/* ================= Incident History ================= */
router.get("/incidents", getVolunteerIncidents);

/* ================= Location ================= */
router.put("/location", updateVolunteerLocation);
router.post("/location", updateVolunteerLocation);

/* ================= Profile ================= */
router.get("/profile", getProfile);
router.put(
  "/profile",
  upload.single("profileImage"),
  updateProfile
);

export default router;