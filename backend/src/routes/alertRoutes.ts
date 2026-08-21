import express from "express";
import {
  createAlert,
  getAlertHistory,
  getActiveAlerts,
  getAlertById,
  acceptAlert,
  rejectAlert,
  startResponse,
  markNearby,
  markArrived,
  updateResponderLocation,
  resolveAlert,
  reassignAlert,
  escalateAlert,
  getIncidentTimeline,
  getIncidentResponders,
} from "../controllers/alertController";
import {
  uploadEvidence,
  getIncidentEvidence,
  streamEvidenceFile,
  getEvidenceAccessLogs,
} from "../controllers/evidenceController";
import { evidenceUpload } from "../middleware/evidenceUpload";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware";

const router = express.Router();

// User triggers SOS
router.post("/", verifyToken, authorizeRoles("user", "volunteer", "admin"), createAlert);

// User views own history
router.get("/history", verifyToken, getAlertHistory);

// Active alerts for monitoring (Admin / Volunteer)
router.get(
  "/active",
  verifyToken,
  authorizeRoles("admin", "volunteer"),
  getActiveAlerts
);

// Single alert details (Admin / Volunteer / User)
router.get("/:id", verifyToken, getAlertById);

// Incident timeline
router.get("/:id/timeline", verifyToken, getIncidentTimeline);

// Incident candidates & assignment history
router.get(
  "/:id/responders",
  verifyToken,
  authorizeRoles("admin", "volunteer"),
  getIncidentResponders
);

// Volunteer response actions
router.post(
  "/:id/accept",
  verifyToken,
  authorizeRoles("volunteer", "admin", "user"),
  acceptAlert
);

router.put(
  "/:id/accept",
  verifyToken,
  authorizeRoles("volunteer", "admin", "user"),
  acceptAlert
);

router.post(
  "/:id/reject",
  verifyToken,
  authorizeRoles("volunteer", "admin", "user"),
  rejectAlert
);

router.post(
  "/:id/start-response",
  verifyToken,
  authorizeRoles("volunteer", "admin", "user"),
  startResponse
);

router.post(
  "/:id/nearby",
  verifyToken,
  authorizeRoles("volunteer", "admin", "user"),
  markNearby
);

router.post(
  "/:id/arrived",
  verifyToken,
  authorizeRoles("volunteer", "admin", "user"),
  markArrived
);

router.post(
  "/:id/responder-location",
  verifyToken,
  authorizeRoles("volunteer", "admin", "user"),
  updateResponderLocation
);

// Incident resolution
router.post(
  "/:id/resolve",
  verifyToken,
  authorizeRoles("admin", "volunteer", "user"),
  resolveAlert
);

router.put(
  "/:id/resolve",
  verifyToken,
  authorizeRoles("admin", "volunteer", "user"),
  resolveAlert
);

// Admin Reassignment & Escalation
router.post(
  "/:id/reassign",
  verifyToken,
  authorizeRoles("admin"),
  reassignAlert
);

router.post(
  "/:id/escalate",
  verifyToken,
  authorizeRoles("admin"),
  escalateAlert
);

// Emergency Evidence Endpoints
router.post(
  "/:id/evidence",
  verifyToken,
  evidenceUpload.single("media"),
  uploadEvidence
);

router.get(
  "/:id/evidence",
  verifyToken,
  authorizeRoles("admin"),
  getIncidentEvidence
);

router.get(
  "/:id/evidence/stream/:filename",
  verifyToken,
  authorizeRoles("admin"),
  streamEvidenceFile
);

router.get(
  "/:id/evidence/logs",
  verifyToken,
  authorizeRoles("admin"),
  getEvidenceAccessLogs
);

export default router;