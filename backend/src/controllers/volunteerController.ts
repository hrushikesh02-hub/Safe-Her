import { Response } from "express";
import { Types } from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware";
import Alert from "../models/Alert";
import User, { IUser } from "../models/User";
import { EmergencyDispatchService } from "../services/emergencyDispatchService";

const requireVolunteer = async (
  req: AuthRequest,
  res: Response,
  selectFields = ""
): Promise<IUser | null> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Unauthorized.",
    });
    return null;
  }

  const query = User.findById(req.user.id);
  if (selectFields) query.select(selectFields);
  const volunteer = await query;

  if (!volunteer) {
    res.status(404).json({
      success: false,
      message: "Volunteer not found.",
    });
    return null;
  }

  if (volunteer.role !== "volunteer") {
    res.status(403).json({
      success: false,
      message: "Access denied.",
    });
    return null;
  }

  return volunteer;
};

/**
 * Volunteer Dashboard
 * GET /api/volunteer/dashboard
 */
export const getDashboard = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const volunteer = await requireVolunteer(req, res, "-password");
    if (!volunteer) return;

    const [
      totalAlerts,
      activeAlerts,
      assignedToMeAlerts,
      acceptedAlerts,
      resolvedAlerts,
      rawRecentAlerts,
    ] = await Promise.all([
      Alert.countDocuments(),
      Alert.countDocuments({ status: "active" }),
      Alert.countDocuments({ assignedVolunteerId: req.user!.id, status: "active" }),
      Alert.countDocuments({ status: "accepted", acceptedBy: req.user!.id }),
      Alert.countDocuments({ status: "resolved", acceptedBy: req.user!.id }),
      Alert.find({
        $or: [
          { assignedVolunteerId: req.user!.id },
          { acceptedBy: req.user!.id },
          { status: { $in: ["active", "accepted", "resolved"] } },
        ],
      })
        .populate("user", "name email phone profileImage isVerified")
        .sort({ createdAt: -1 })
        .limit(12),
    ]);

    // Filter out alerts where user was deleted and format response
    const recentAlerts = rawRecentAlerts.filter((a) => a.user != null);

    res.status(200).json({
      success: true,
      message: "Dashboard fetched successfully.",
      data: {
        volunteer: {
          id: volunteer._id,
          name: volunteer.name,
          email: volunteer.email,
          phone: volunteer.phone,
          profileImage: volunteer.profileImage,
          isVerified: volunteer.isVerified,
          volunteerStatus: volunteer.volunteerStatus || "AVAILABLE",
          volunteerStats: volunteer.volunteerStats,
          lastKnownLatitude: volunteer.lastKnownLatitude,
          lastKnownLongitude: volunteer.lastKnownLongitude,
        },
        statistics: {
          totalAlerts,
          activeAlerts,
          assignedToMeAlerts,
          acceptedAlerts,
          resolvedAlerts,
        },
        recentAlerts,
      },
    });
  } catch (error) {
    console.error("Volunteer Dashboard Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard.",
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

/**
 * Get All Alerts available to volunteer
 * GET /api/volunteer/alerts
 */
export const getAlerts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const volunteer = await requireVolunteer(req, res);
    if (!volunteer) return;

    const { status } = req.query;
    const filter: any = {};

    if (status && ["active", "accepted", "resolved"].includes(status as string)) {
      filter.status = status;
    }

    const rawAlerts = await Alert.find(filter)
      .populate("user", "name email phone profileImage isVerified")
      .populate("assignedVolunteerId", "name email phone profileImage")
      .populate("acceptedBy", "name email phone profileImage")
      .sort({ createdAt: -1 });

    const alerts = rawAlerts.filter((a) => a.user != null);

    res.status(200).json({
      success: true,
      message: "Alerts fetched successfully.",
      total: alerts.length,
      data: alerts,
    });
  } catch (error) {
    console.error("Get Alerts Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch alerts.",
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

/**
 * Get Single Alert Details
 * GET /api/volunteer/alerts/:id
 */
export const getAlertById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid alert ID." });
      return;
    }

    const volunteer = await requireVolunteer(req, res);
    if (!volunteer) return;

    const alert = await Alert.findById(id)
      .populate("user", "name email phone profileImage isVerified")
      .populate("assignedVolunteerId", "name email phone profileImage")
      .populate("acceptedBy", "name email phone profileImage")
      .lean();

    if (!alert) {
      res.status(404).json({ success: false, message: "Alert not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Alert fetched successfully.",
      data: alert,
    });
  } catch (error) {
    console.error("Get Alert By ID Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch alert.",
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

/**
 * Accept Alert
 * PUT /api/volunteer/alerts/:id/accept
 * POST /api/volunteer/alerts/:id/accept
 */
export const acceptAlert = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const volunteer = await requireVolunteer(req, res);
    if (!volunteer) return;

    const updatedAlert = await EmergencyDispatchService.handleVolunteerAccept(id, req.user!.id);
    if (!updatedAlert) {
      res.status(404).json({ success: false, message: "Alert not found or already handled" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "SOS alert accepted successfully. Dispatch status: RESPONDING.",
      data: updatedAlert,
    });
  } catch (error: any) {
    console.error("Accept Alert Error:", error);
    res.status(400).json({
      success: false,
      message: error?.message || "Failed to accept alert.",
    });
  }
};

/**
 * Reject Alert
 * POST /api/volunteer/alerts/:id/reject
 */
export const rejectAlert = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;
    const volunteer = await requireVolunteer(req, res);
    if (!volunteer) return;

    const updatedAlert = await EmergencyDispatchService.handleVolunteerReject(id, req.user!.id, reason);

    res.status(200).json({
      success: true,
      message: "Alert declined. Reassigned to next candidate.",
      data: updatedAlert,
    });
  } catch (error: any) {
    console.error("Reject Alert Error:", error);
    res.status(400).json({
      success: false,
      message: error?.message || "Failed to reject alert.",
    });
  }
};

/**
 * Resolve Alert
 * PUT /api/volunteer/alerts/:id/resolve
 * POST /api/volunteer/alerts/:id/resolve
 */
export const resolveAlert = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { notes } = req.body;
    const volunteer = await requireVolunteer(req, res);
    if (!volunteer) return;

    const updatedAlert = await EmergencyDispatchService.resolveIncident(id, req.user!.id, notes);
    if (!updatedAlert) {
      res.status(404).json({ success: false, message: "Alert not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "SOS alert resolved successfully. Post-incident summary recorded.",
      data: updatedAlert,
    });
  } catch (error: any) {
    console.error("Resolve Alert Error:", error);
    res.status(400).json({
      success: false,
      message: error?.message || "Failed to resolve alert.",
    });
  }
};

/**
 * Update Volunteer Location & Responder Live Tracking
 * PUT /api/volunteer/location
 */
export const updateVolunteerLocation = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const volunteer = await requireVolunteer(req, res);
    if (!volunteer) return;

    const { latitude, longitude, alertId } = req.body;

    if (latitude == null || longitude == null) {
      res.status(400).json({ success: false, message: "latitude and longitude are required" });
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    await User.findByIdAndUpdate(req.user!.id, {
      lastKnownLatitude: lat,
      lastKnownLongitude: lng,
      lastLocationAt: new Date(),
    });

    let updatedAlert = null;
    if (alertId && Types.ObjectId.isValid(alertId)) {
      try {
        updatedAlert = await EmergencyDispatchService.updateResponderLocation(alertId, req.user!.id, lat, lng);
      } catch (err: any) {
        console.warn("Could not update responder live location on alert:", err?.message);
      }
    }

    res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: { latitude: lat, longitude: lng, alert: updatedAlert },
    });
  } catch (error) {
    console.error("Update Volunteer Location Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update location.",
    });
  }
};

/**
 * Get Volunteer Incident History
 * GET /api/volunteer/incidents
 */
export const getVolunteerIncidents = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const volunteer = await requireVolunteer(req, res);
    if (!volunteer) return;

    const incidents = await Alert.find({
      $or: [{ acceptedBy: req.user!.id }, { assignedVolunteerId: req.user!.id }],
    })
      .populate("user", "name email phone profileImage")
      .populate("acceptedBy", "name email phone profileImage")
      .sort({ updatedAt: -1 });

    const statistics = {
      totalIncidents: incidents.length,
      acceptedIncidents: incidents.filter((i) => i.status === "accepted").length,
      resolvedIncidents: incidents.filter((i) => i.status === "resolved").length,
    };

    res.status(200).json({
      success: true,
      message: "Incident history fetched successfully.",
      statistics,
      total: incidents.length,
      data: incidents,
    });
  } catch (error) {
    console.error("Get Volunteer Incidents Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch incident history.",
    });
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const volunteer = await requireVolunteer(req, res, "-password");
    if (!volunteer) return;

    res.status(200).json({
      success: true,
      message: "Volunteer profile fetched successfully.",
      data: volunteer,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const volunteer = await requireVolunteer(req, res);
    if (!volunteer) return;

    const { name, phone, volunteerStatus } = req.body;
    if (name) volunteer.name = name.trim();
    if (phone) volunteer.phone = phone.trim();
    if (volunteerStatus && ["AVAILABLE", "BUSY", "OFFLINE"].includes(volunteerStatus)) {
      volunteer.volunteerStatus = volunteerStatus;
    }
    if (req.file) volunteer.profileImage = req.file.path;

    await volunteer.save();
    const updated = await User.findById(req.user!.id).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};