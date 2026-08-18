import { Response } from "express";
import { Types } from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware";
import Alert from "../models/Alert";
import User, { IUser } from "../models/User";

/**
 * Shared helper: verifies the requester is authenticated, exists in the DB,
 * and has the "volunteer" role. Sends the appropriate error response and
 * returns null if any check fails; otherwise returns the volunteer document.
 */
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
      acceptedAlerts,
      resolvedAlerts,
      recentAlerts,
    ] = await Promise.all([
      Alert.countDocuments(),
      Alert.countDocuments({ status: "active" }),
      Alert.countDocuments({ status: "accepted", acceptedBy: req.user!.id }),
      Alert.countDocuments({ status: "resolved", acceptedBy: req.user!.id }),
      Alert.find({ acceptedBy: req.user!.id })
        .populate("user", "name email phone profileImage")
        .sort({ updatedAt: -1 })
        .limit(5),
    ]);

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
        },
        statistics: {
          totalAlerts,
          activeAlerts,
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
 * Get All SOS Alerts
 * GET /api/volunteer/alerts
 * Optional Query:
 * ?status=active
 * ?status=accepted
 * ?status=resolved
 */
export const getAlerts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const volunteer = await requireVolunteer(req, res);
    if (!volunteer) return;

    const { status } = req.query;

    const filter: { status?: "active" | "accepted" | "resolved" } = {};

    if (
      status &&
      ["active", "accepted", "resolved"].includes(status as string)
    ) {
      filter.status = status as "active" | "accepted" | "resolved";
    }

    const alerts = await Alert.find(filter)
      .populate("user", "name email phone profileImage")
      .populate("acceptedBy", "name email phone profileImage")
      .sort({ createdAt: -1 });

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
 * Get Single Alert
 * GET /api/volunteer/alerts/:id
 */
export const getAlertById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid alert ID.",
      });
      return;
    }

    const volunteer = await requireVolunteer(req, res);
    if (!volunteer) return;

    const alert = await Alert.findById(id)
      .populate("user", "name email phone profileImage isVerified")
      .populate("acceptedBy", "name email phone profileImage")
      .lean();

    if (!alert) {
      res.status(404).json({
        success: false,
        message: "Alert not found.",
      });
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
 * Accept SOS Alert
 * PUT /api/volunteer/alerts/:id/accept
 */
export const acceptAlert = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid alert ID.",
      });
      return;
    }

    // Verifies auth + existence + "volunteer" role (previously missing here)
    const volunteer = await requireVolunteer(req, res);
    if (!volunteer) return;

    // Atomically accept the alert only if it's still active
    const updatedAlert = await Alert.findOneAndUpdate(
      {
        _id: id,
        status: "active",
      },
      {
        $set: {
          status: "accepted",
          acceptedBy: req.user!.id,
        },
      },
      {
        new: true,
      }
    )
      .populate("user", "name email phone profileImage")
      .populate("acceptedBy", "name email phone profileImage");

    if (!updatedAlert) {
      res.status(400).json({
        success: false,
        message: "This alert has already been accepted or resolved.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "SOS alert accepted successfully.",
      data: updatedAlert,
    });
  } catch (error) {
    console.error("Accept Alert Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to accept alert.",
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

/**
 * Resolve SOS Alert
 * PUT /api/volunteer/alerts/:id/resolve
 */
export const resolveAlert = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid alert ID.",
      });
      return;
    }

    const volunteer = await requireVolunteer(req, res);
    if (!volunteer) return;

    const alert = await Alert.findById(id);

    if (!alert) {
      res.status(404).json({
        success: false,
        message: "Alert not found.",
      });
      return;
    }

    if (alert.status === "active") {
      res.status(400).json({
        success: false,
        message: "Accept the alert before resolving it.",
      });
      return;
    }

    if (alert.status === "resolved") {
      res.status(400).json({
        success: false,
        message: "This alert has already been resolved.",
      });
      return;
    }

    if (!alert.acceptedBy || alert.acceptedBy.toString() !== req.user!.id) {
      res.status(403).json({
        success: false,
        message: "Only the assigned volunteer can resolve this alert.",
      });
      return;
    }

    alert.status = "resolved";
    await alert.save();

    const updatedAlert = await Alert.findById(alert._id)
      .populate("user", "name email phone profileImage")
      .populate("acceptedBy", "name email phone profileImage");

    res.status(200).json({
      success: true,
      message: "SOS alert resolved successfully.",
      data: updatedAlert,
    });
  } catch (error) {
    console.error("Resolve Alert Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resolve alert.",
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

/**
 * Get Volunteer Profile
 * GET /api/volunteer/profile
 */
export const getProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const volunteer = await requireVolunteer(req, res, "-password");
    if (!volunteer) return;

    res.status(200).json({
      success: true,
      message: "Volunteer profile fetched successfully.",
      data: {
        id: volunteer._id,
        name: volunteer.name,
        email: volunteer.email,
        phone: volunteer.phone,
        role: volunteer.role,
        profileImage: volunteer.profileImage,
        isVerified: volunteer.isVerified,
        isBlocked: volunteer.isBlocked,
        createdAt: volunteer.createdAt,
        updatedAt: volunteer.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get Volunteer Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch volunteer profile.",
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

/**
 * Update Volunteer Profile
 * PUT /api/volunteer/profile
 */
export const updateProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const volunteer = await requireVolunteer(req, res);
    if (!volunteer) return;

    const { name, phone } = req.body;

    if (name && name.trim() !== "") {
      volunteer.name = name.trim();
    }

    if (phone && phone !== volunteer.phone) {
      const existingUser = await User.findOne({
        phone,
        _id: { $ne: volunteer._id },
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          message: "Phone number already exists.",
        });
        return;
      }

      volunteer.phone = phone;
    }

    if (req.file) {
      volunteer.profileImage = req.file.path;
    }

    await volunteer.save();

    const updatedVolunteer = await User.findById(req.user!.id).select(
      "-password"
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updatedVolunteer,
    });
  } catch (error) {
    console.error("Update Volunteer Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile.",
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

/**
 * Update Volunteer Location
 * PUT /api/volunteer/location
 * Stores the volunteer's current GPS position for nearby SOS detection
 */
export const updateVolunteerLocation = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const volunteer = await requireVolunteer(req, res);
    if (!volunteer) return;

    const { latitude, longitude } = req.body;

    if (latitude == null || longitude == null) {
      res.status(400).json({
        success: false,
        message: "latitude and longitude are required",
      });
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude values",
      });
      return;
    }

    await User.findByIdAndUpdate(req.user!.id, {
      lastKnownLatitude: lat,
      lastKnownLongitude: lng,
      lastLocationAt: new Date(),
    });

    console.log(`📍 Volunteer ${volunteer.name} location updated: ${lat}, ${lng}`);

    res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: { latitude: lat, longitude: lng, updatedAt: new Date() },
    });
  } catch (error) {
    console.error("Update Volunteer Location Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update location.",
      error: error instanceof Error ? error.message : "Internal Server Error",
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
      acceptedBy: req.user!.id,
    })
      .populate("user", "name email phone profileImage")
      .populate("acceptedBy", "name email phone profileImage")
      .sort({ updatedAt: -1 });

    const statistics = {
      totalIncidents: incidents.length,
      acceptedIncidents: incidents.filter(
        (incident) => incident.status === "accepted"
      ).length,
      resolvedIncidents: incidents.filter(
        (incident) => incident.status === "resolved"
      ).length,
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
      error:
        error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};