import express from "express";
import { createAlert , getAlertHistory , getActiveAlerts , acceptAlert , resolveAlert,getAlertById} from "../controllers/alertController";
import { verifyToken , authorizeRoles} from "../middleware/authMiddleware";

const router = express.Router();

router.post(
  "/",
  verifyToken,
  authorizeRoles("user"),
  createAlert
);
router.get("/history", verifyToken, getAlertHistory);
router.get(
  "/active",
  verifyToken,
  authorizeRoles("admin", "volunteer"),
  getActiveAlerts
);
router.get(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "volunteer"),
  getAlertById
);

router.put(
  "/:id/accept",
  verifyToken,
  authorizeRoles("admin", "volunteer"),
  acceptAlert
);

router.put(
  "/:id/resolve",
  verifyToken,
  authorizeRoles("admin", "volunteer"),
  resolveAlert
);
export default router;