import express from "express";
import {
  getDashboard,
  getAlerts,
  getAlertById,
  acceptAlert,
  resolveAlert,
  getProfile,
  updateProfile,
  getVolunteerIncidents,
  updateVolunteerLocation,
} from "../controllers/volunteerController";

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

/* ================= Incident History ================= */

router.get("/incidents", getVolunteerIncidents);

/* ================= Single Alert ================= */

router.get("/alerts/:id", getAlertById);

router.put("/alerts/:id/accept", acceptAlert);

router.put("/alerts/:id/resolve", resolveAlert);

/* ================= Location ================= */

router.put("/location", updateVolunteerLocation);

/* ================= Profile ================= */

router.get("/profile", getProfile);

router.put(
  "/profile",
  upload.single("profileImage"),
  updateProfile
);

export default router;