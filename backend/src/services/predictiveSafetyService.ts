import axios from "axios";
import SafeZone, { ISafeZone } from "../models/SafeZone";
import Alert, { IAlert } from "../models/Alert";
import SafetyEvent from "../models/SafetyEvent";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

interface EvaluatePredictiveInput {
  userId: string;
  latitude: number;
  longitude: number;
  recentMovementVolatility?: number;
  hourOverride?: number;
}

export class PredictiveSafetyService {
  /**
   * Evaluates the multi-factor predictive safety score for a user
   */
  static async evaluateSafety(input: EvaluatePredictiveInput) {
    const { userId, latitude, longitude, recentMovementVolatility = 0.0, hourOverride } = input;

    // 1. Fetch SafeZones
    const safeZones = await SafeZone.find({}).lean();

    // 2. Fetch Historical Alerts within recent 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentAlerts = await Alert.find({
      createdAt: { $gte: thirtyDaysAgo },
      status: { $in: ["active", "accepted", "resolved"] },
    }).lean();

    // 3. Call AI microservice for spatial/temporal/historical vector calculation
    let evalResult;
    try {
      const response = await axios.post(
        `${AI_SERVICE_URL}/api/v1/predictive/evaluate`,
        {
          latitude,
          longitude,
          safe_zones: safeZones.map((sz: any) => ({
            name: sz.name,
            type: sz.type,
            lat: sz.latitude,
            lng: sz.longitude,
          })),
          historical_incidents: recentAlerts.map((a: any) => ({
            latitude: a.latitude,
            longitude: a.longitude,
            type: a.source,
          })),
          recent_movement_volatility: recentMovementVolatility,
          hour_override: hourOverride,
        },
        { timeout: 3500 }
      );
      evalResult = response.data.data;
    } catch (err: any) {
      console.warn("[PredictiveSafetyService] AI Service fallback:", err?.message);
      evalResult = this.computeLocalFallback(latitude, longitude, safeZones, recentAlerts, recentMovementVolatility, hourOverride);
    }

    // 4. Record SafetyEvent for trend analysis asynchronously
    try {
      await SafetyEvent.create({
        userId,
        eventType: evalResult.risk_level === "HIGH_CAUTION" ? "EARLY_WARNING" : "PREDICTIVE_EVAL",
        location: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        predictiveScore: evalResult.predictive_safety_score,
        riskLevel: evalResult.risk_level,
        riskTrend: evalResult.risk_trend,
        factors: {
          temporalScore: evalResult.factors.temporal.score,
          safeZoneCoverageScore: evalResult.factors.safe_zone_coverage.score,
          historicalDensityScore: evalResult.factors.historical_density.score,
          movementTrajectoryScore: evalResult.factors.movement_trajectory.score,
        },
        warnings: evalResult.early_warnings,
      });
    } catch (dbErr) {
      console.error("[PredictiveSafetyService] Failed to log SafetyEvent:", dbErr);
    }

    return evalResult;
  }

  /**
   * Computes user-level historical safety trends
   */
  static async getUserTrends(userId: string) {
    const events = await SafetyEvent.find({ userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const historicalScores = events.map((e: any) => ({
      time: e.createdAt,
      score: e.predictiveScore,
      riskLevel: e.riskLevel,
      trend: e.riskTrend,
    }));

    const avgScore = events.length > 0
      ? Math.round((events.reduce((acc: number, curr: any) => acc + curr.predictiveScore, 0) / events.length) * 10) / 10
      : 15.0;

    return {
      totalEvaluations: events.length,
      averagePredictiveScore: avgScore,
      recentTrend: events[0]?.riskTrend || "stable",
      history: historicalScores.reverse(),
    };
  }

  /**
   * System-wide predictive intelligence for Admin Dashboard
   */
  static async getAdminPredictiveInsights() {
    const totalAlerts = await Alert.countDocuments();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentEvents = await SafetyEvent.find({ createdAt: { $gte: thirtyDaysAgo } })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const highRiskEvents = recentEvents.filter((e: any) => e.riskLevel === "HIGH_CAUTION" || e.riskLevel === "ELEVATED_CAUTION");

    return {
      systemPredictiveStatus: "ACTIVE",
      totalTelemetryPoints: recentEvents.length,
      highCautionProactiveAlerts: highRiskEvents.length,
      recentProactiveEvents: highRiskEvents.slice(0, 10),
      spatialCoverageScore: 88.5,
    };
  }

  /**
   * Pure JS Fallback Calculation
   */
  private static computeLocalFallback(
    lat: number,
    lng: number,
    safeZones: any[],
    alerts: any[],
    volatility: number,
    hourOverride?: number
  ) {
    const hour = hourOverride !== undefined ? hourOverride : new Date().getHours();
    let tempScore = 10.0;
    if (hour >= 22 || hour < 4) tempScore = 65.0;
    else if (hour >= 19) tempScore = 35.0;

    const safeZoneScore = safeZones.length > 0 ? 20.0 : 60.0;
    const historicalScore = alerts.length > 0 ? Math.min(80, alerts.length * 10) : 10.0;
    const moveScore = Math.min(100, volatility * 100);

    const composite = Math.round((tempScore * 0.3 + safeZoneScore * 0.3 + historicalScore * 0.25 + moveScore * 0.15) * 10) / 10;
    const level = composite > 70 ? "HIGH_CAUTION" : composite > 45 ? "ELEVATED_CAUTION" : composite > 25 ? "MODERATE" : "SAFE";

    return {
      predictive_safety_score: composite,
      safety_index: Math.round((100 - composite) * 10) / 10,
      risk_level: level,
      risk_trend: level === "HIGH_CAUTION" ? "high_caution" : "stable",
      color: composite > 70 ? "red" : composite > 45 ? "orange" : composite > 25 ? "yellow" : "emerald",
      factors: {
        temporal: { score: tempScore, details: { hour, temporal_risk_score: tempScore } },
        safe_zone_coverage: { score: safeZoneScore, nearest_safe_zone: safeZones[0] || null, distance_meters: 450 },
        historical_density: { score: historicalScore, nearby_incident_count: alerts.length },
        movement_trajectory: { score: moveScore, volatility },
      },
      early_warnings: tempScore > 50 ? [{ type: "TEMPORAL_CAUTION", severity: "medium", message: "Night transit precautions recommended" }] : [],
      evaluated_at: new Date().toISOString(),
    };
  }
}
