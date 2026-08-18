import express from "express";
import {getVolunteers,verifyVolunteer,rejectVolunteer,
  getDashboardStats,acceptAlert,resolveAlert,
  getAllUsers,deleteUser,toggleUserStatus,getActiveAlerts, getSafeZones,
  addSafeZone,
  deleteSafeZone,getReports
} from "../controllers/adminController";
import {
  verifyToken,
  authorizeRoles,
} from "../middleware/authMiddleware";
import {
  getRecentAlerts,
  getRecentActivities,
} from "../controllers/adminController";

const router = express.Router();

router.get(
  "/dashboard",
  verifyToken,
  authorizeRoles("admin"),
  getDashboardStats
);

router.get(
  "/users",
  verifyToken,
  authorizeRoles("admin"),
  getAllUsers
);

router.delete(
  "/users/:id",
  verifyToken,
  authorizeRoles("admin"),
  deleteUser
);

router.put(
  "/users/:id/status",
  verifyToken,
  authorizeRoles("admin"),
  toggleUserStatus
);

router.get(
  "/alerts",
  verifyToken,
  authorizeRoles("admin"),
  getActiveAlerts
);

router.put(
  "/alerts/:id/accept",
  verifyToken,
  authorizeRoles("admin"),
  acceptAlert
);

router.put(
  "/alerts/:id/resolve",
  verifyToken,
  authorizeRoles("admin"),
  resolveAlert
);

router.get(
  "/volunteers",
  verifyToken,
  authorizeRoles("admin"),
  getVolunteers
);

router.put(
  "/volunteers/:id/verify",
  verifyToken,
  authorizeRoles("admin"),
  verifyVolunteer
);

router.delete(
  "/volunteers/:id",
  verifyToken,
  authorizeRoles("admin"),
  rejectVolunteer
);

router.get(
  "/safe-zones",
  verifyToken,
  authorizeRoles("admin"),
  getSafeZones
);

router.post(
  "/safe-zones",
  verifyToken,
  authorizeRoles("admin"),
  addSafeZone
);

router.delete(
  "/safe-zones/:id",
  verifyToken,
  authorizeRoles("admin"),
  deleteSafeZone
);

router.get(
  "/reports",
  verifyToken,
  authorizeRoles("admin"),
  getReports
);

router.get(
  "/recent-alerts",
  verifyToken,
  authorizeRoles("admin"),
  getRecentAlerts
);

router.get(
  "/recent-activities",
  verifyToken,
  authorizeRoles("admin"),
  getRecentActivities
);

export default router;