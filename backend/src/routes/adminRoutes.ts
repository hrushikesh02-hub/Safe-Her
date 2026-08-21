import express from "express";
import {
  getVolunteers,
  verifyVolunteer,
  rejectVolunteer,
  resendVerificationEmail,
  getDashboardStats,
  acceptAlert,
  resolveAlert,
  getAllUsers,
  deleteUser,
  toggleUserStatus,
  getActiveAlerts,
  getAllIncidents,
  getIncidentReportData,
  getSafeZones,
  addSafeZone,
  deleteSafeZone,
  getReports,
  getRecentAlerts,
  getRecentActivities,
  getResponseAnalytics,
  getCommandCenterOverview,
  getRiskAnalytics,
  getSignalAnalytics,
  getSafetyHotspots,
  getTimeAnalytics,
  getVolunteerAnalytics,
  getAIInsights,
  getAdminAlertCenter,
  getFullSafetyReport,
  exportIncidentsCSV,
} from "../controllers/adminController";
import {
  verifyToken,
  authorizeRoles,
} from "../middleware/authMiddleware";

const router = express.Router();

router.use(verifyToken);
router.use(authorizeRoles("admin"));

// Phase 5: AI Safety Intelligence Command Center Endpoints
router.get("/command-center/overview", getCommandCenterOverview);
router.get("/command-center/risk-analytics", getRiskAnalytics);
router.get("/command-center/signal-analytics", getSignalAnalytics);
router.get("/command-center/hotspots", getSafetyHotspots);
router.get("/command-center/time-analytics", getTimeAnalytics);
router.get("/command-center/volunteer-analytics", getVolunteerAnalytics);
router.get("/command-center/ai-insights", getAIInsights);
router.get("/command-center/alerts", getAdminAlertCenter);
router.get("/command-center/full-report", getFullSafetyReport);
router.get("/command-center/export-csv", exportIncidentsCSV);

// Existing Legacy & Phase 4 Endpoints
router.get("/dashboard", getDashboardStats);
router.get("/response-analytics", getResponseAnalytics);

// User Management
router.get("/users", getAllUsers);
router.delete("/users/:id", deleteUser);
router.put("/users/:id/status", toggleUserStatus);

// Alerts & Incidents
router.get("/alerts", getActiveAlerts);
router.get("/incidents", getAllIncidents);
router.get("/incidents/:id/report-data", getIncidentReportData);
router.put("/alerts/:id/accept", acceptAlert);
router.post("/alerts/:id/accept", acceptAlert);
router.put("/alerts/:id/resolve", resolveAlert);
router.post("/alerts/:id/resolve", resolveAlert);

// Volunteer Verification Center
router.get("/volunteers", getVolunteers);
router.put("/volunteers/:id/verify", verifyVolunteer);
router.post("/volunteers/:id/verify", verifyVolunteer);
router.post("/volunteers/:id/reject", rejectVolunteer);
router.delete("/volunteers/:id", rejectVolunteer);
router.post("/volunteers/:id/resend-email", resendVerificationEmail);

// Safe Zones
router.get("/safe-zones", getSafeZones);
router.post("/safe-zones", addSafeZone);
router.delete("/safe-zones/:id", deleteSafeZone);

// Intelligence & Activity Feed
router.get("/reports", getReports);
router.get("/recent-alerts", getRecentAlerts);
router.get("/recent-activities", getRecentActivities);

export default router;