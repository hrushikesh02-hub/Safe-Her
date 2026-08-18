import { Response } from "express";
import User from "../models/User";
import { AuthRequest } from "../middleware/authMiddleware";
import SafeZone from "../models/SafeZone";
import AssistanceRequest from "../models/AssistanceRequest";
import axios from "axios";

export const updateProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    console.log("========== UPDATE PROFILE ==========");
    console.log("Headers:", req.headers);
    console.log("Content-Type:", req.headers["content-type"]);
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);
    console.log("USER:", req.user);

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const { name, phone } = req.body;

    if (name) {
      user.name = name.trim();
    }

    if (phone) {
      user.phone = phone.trim();
    }

    if (req.file) {
      user.profileImage = (req.file as any).path;
    }

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        profileImage: updatedUser.profileImage,
        isVerified: updatedUser.isVerified,
        isBlocked: updatedUser.isBlocked,
      },
    });
  } catch (error: any) {
    console.error("========== UPDATE PROFILE ERROR ==========");
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const getSafeZones = async (req: any, res: any) => {
  try {
    const zones = await SafeZone.find();

    res.status(200).json({
      success: true,
      data: zones,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getSupportTeams = async (req: any, res: any) => {
  try {
    const volunteers = await User.find({
      role: "volunteer",
      isVerified: true,
      isBlocked: false,
    }).select("-password");

    res.status(200).json({
      success: true,
      data: volunteers,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const requestSupport = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { volunteerId } = req.body;

    const volunteer = await User.findById(volunteerId);

    if (!volunteer || volunteer.role !== "volunteer") {
      res.status(404).json({
        success: false,
        message: "Volunteer not found",
      });
      return;
    }

    const alreadyRequested = await AssistanceRequest.findOne({
      user: req.user?.id,
      volunteer: volunteerId,
      status: "pending",
    });

    if (alreadyRequested) {
      res.status(400).json({
        success: false,
        message: "Request already sent",
      });
      return;
    }

    const request = await AssistanceRequest.create({
      user: req.user?.id,
      volunteer: volunteerId,
    });

    res.status(201).json({
      success: true,
      message: "Support request sent",
      data: request,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getNearbySafeZones = async (req: any, res: any) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      res.status(400).json({
        success: false,
        message: "Latitude and Longitude are required",
      });
      return;
    }

    const response = await axios.post(
      "https://places.googleapis.com/v1/places:searchNearby",
      {
        includedTypes: [
          "hospital",
          "police",
          "pharmacy",
          "fire_station",
        ],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: {
              latitude: Number(lat),
              longitude: Number(lng),
            },
            radius: 5000,
          },
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY!,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.location,places.formattedAddress,places.rating,places.primaryType,places.currentOpeningHours.openNow",
        },
      }
    );

    res.status(200).json({
      success: true,
      data: response.data.places ?? [],
    });
  } catch (error: any) {
    console.log(error.response?.data || error.message);

    res.status(500).json({
      success: false,
      message: "Unable to fetch nearby safe zones",
    });
  }
};