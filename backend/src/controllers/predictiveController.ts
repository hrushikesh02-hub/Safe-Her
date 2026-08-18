import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { PredictiveSafetyService } from "../services/predictiveSafetyService";

export const evaluatePredictiveSafety = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const { latitude, longitude, recentMovementVolatility, hourOverride } = req.body;

    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude must be valid numbers",
      });
    }

    if (latNum < -90 || latNum > 90) {
      return res.status(400).json({
        success: false,
        message: "Latitude must be between -90 and 90",
      });
    }

    if (lngNum < -180 || lngNum > 180) {
      return res.status(400).json({
        success: false,
        message: "Longitude must be between -180 and 180",
      });
    }

    let volatilityNum = 0.0;
    if (recentMovementVolatility !== undefined) {
      volatilityNum = parseFloat(recentMovementVolatility);
      if (isNaN(volatilityNum) || volatilityNum < 0) {
        volatilityNum = 0.0;
      }
    }

    let parsedHour: number | undefined = undefined;
    if (hourOverride !== undefined && hourOverride !== null) {
      parsedHour = parseInt(hourOverride, 10);
      if (isNaN(parsedHour) || parsedHour < 0 || parsedHour > 23) {
        return res.status(400).json({
          success: false,
          message: "hourOverride must be an integer between 0 and 23",
        });
      }
    }

    const result = await PredictiveSafetyService.evaluateSafety({
      userId,
      latitude: latNum,
      longitude: lngNum,
      recentMovementVolatility: volatilityNum,
      hourOverride: parsedHour,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[PredictiveController] evaluate error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to evaluate predictive safety",
    });
  }
};

export const getUserTrends = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const trends = await PredictiveSafetyService.getUserTrends(userId);
    return res.status(200).json({
      success: true,
      data: trends,
    });
  } catch (error: any) {
    console.error("[PredictiveController] trends error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve safety trends",
    });
  }
};

export const getAdminPredictiveInsights = async (req: AuthRequest, res: Response) => {
  try {
    const insights = await PredictiveSafetyService.getAdminPredictiveInsights();
    return res.status(200).json({
      success: true,
      data: insights,
    });
  } catch (error: any) {
    console.error("[PredictiveController] admin insights error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve admin predictive insights",
    });
  }
};
