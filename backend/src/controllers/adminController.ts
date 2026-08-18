import { Request, Response } from "express";
import User from "../models/User";
import Alert from "../models/Alert";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware";
import SafeZone from "../models/SafeZone";

export const getDashboardStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const totalUsers = await User.countDocuments({
      role: "user",
    });

    const totalVolunteers = await User.countDocuments({
      role: "volunteer",
    });

    const activeAlerts = await Alert.countDocuments({
      status: {
        $in: ["active", "accepted"],
      },
    });

    const resolvedAlerts = await Alert.countDocuments({
      status: "resolved",
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalVolunteers,
        activeAlerts,
        resolvedAlerts,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const users = await User.find({
  role: "user",
}).select("-password");

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const toggleUserStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    user.isBlocked = !user.isBlocked;

    await user.save();

    res.status(200).json({
      success: true,
      message: user.isBlocked
        ? "User Suspended"
        : "User Activated",
      data: user,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getActiveAlerts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const alerts = await Alert.find({
      status: { $in: ["active", "accepted"] },
    })
      .populate("user", "name phone")
      .populate("acceptedBy", "name phone")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const acceptAlert = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const alert = await Alert.findById(id);

    if (!alert) {
      res.status(404).json({
        success: false,
        message: "Alert not found",
      });
      return;
    }

    alert.status = "accepted";

    alert.acceptedBy = new mongoose.Types.ObjectId(req.user!.id);

    await alert.save();

    const updatedAlert = await Alert.findById(id)
      .populate("user", "name phone")
      .populate("acceptedBy", "name phone");

    res.status(200).json({
      success: true,
      message: "Alert accepted successfully",
      data: updatedAlert,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const resolveAlert = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const alert = await Alert.findById(id);

    if (!alert) {
      res.status(404).json({
        success: false,
        message: "Alert not found",
      });
      return;
    }

    alert.status = "resolved";

    await alert.save();

    res.status(200).json({
      success: true,
      message: "Alert resolved successfully",
      data: alert,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getVolunteers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const volunteers = await User.find({
      role: "volunteer",
    }).select("-password");

    res.status(200).json({
      success: true,
      data: volunteers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const verifyVolunteer = async (
  req: Request,
  res: Response
): Promise<void> => {

  try {

    const { id } = req.params;

    const volunteer = await User.findById(id);

    if (!volunteer) {

      res.status(404).json({
        success:false,
        message:"Volunteer not found"
      });

      return;
    }

    volunteer.isVerified = true;

    await volunteer.save();

    res.status(200).json({
      success:true,
      message:"Volunteer Verified Successfully",
      data: volunteer
    });

  } catch(error){

    console.error(error);

    res.status(500).json({
      success:false,
      message:"Server Error"
    });

  }

};

export const rejectVolunteer = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Volunteer Rejected",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getSafeZones = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {

    const zones = await SafeZone.find();

    res.status(200).json({
      success: true,
      data: zones,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Server Error",
    });

  }
};

export const addSafeZone = async (
  req: Request,
  res: Response
): Promise<void> => {

  try {

    const zone = await SafeZone.create(req.body);

    res.status(201).json({
      success: true,
      data: zone,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Server Error",
    });

  }

};

export const deleteSafeZone = async (
  req: Request,
  res: Response
): Promise<void> => {

  try {

    await SafeZone.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Deleted",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Server Error",
    });

  }

};

export const getReports = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const totalUsers = await User.countDocuments({
      role: "user",
    });

    const totalVolunteers = await User.countDocuments({
      role: "volunteer",
      isVerified: true,
    });

    const activeAlerts = await Alert.countDocuments({
      status: {
        $in: ["active", "accepted"],
      },
    });

    const resolvedAlerts = await Alert.countDocuments({
      status: "resolved",
    });

    const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalVolunteers,
        activeAlerts,
        resolvedAlerts,
      },
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success:false,
      message:"Server Error",
    });

  }
};

export const getRecentAlerts = async (req: any, res: any) => {
  try {
    const alerts = await Alert.find()
      .populate("user", "name")
      .populate("acceptedBy", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: alerts,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getRecentActivities = async (req: any, res: any) => {
  try {
    const alerts = await Alert.find({
      status: { $in: ["accepted", "resolved"] },
    })
      .populate("acceptedBy", "name")
      .sort({ updatedAt: -1 })
      .limit(5);

    const activities = alerts.map((a: any) => ({
  title:
    a.status === "accepted"
      ? `${a.acceptedBy?.name || "Volunteer"} accepted an SOS`
      : `${a.acceptedBy?.name || "Volunteer"} resolved an SOS`,
  time: a.updatedAt,
}));

    res.json({
      success: true,
      data: activities,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};