import Alert from "../models/Alert";
import User from "../models/User";
import SafeZone from "../models/SafeZone";
import { SafetyHotspotEngine } from "./safetyHotspotEngine";
import { AIInsightEngine } from "./aiInsightEngine";
import { SafetyRecommendationEngine } from "./safetyRecommendationEngine";

export class SafetyReportService {
  /**
   * Generates a complete executive Safety Intelligence Report payload.
   */
  public static async generateFullReport(options: {
    startDate?: Date;
    endDate?: Date;
  } = {}) {
    const query: any = {};
    if (options.startDate || options.endDate) {
      query.createdAt = {};
      if (options.startDate) query.createdAt.$gte = options.startDate;
      if (options.endDate) query.createdAt.$lte = options.endDate;
    }

    const [alerts, users, volunteers, safeZones] = await Promise.all([
      Alert.find(query).populate("user", "name").populate("acceptedBy", "name").populate("assignedVolunteerId", "name").lean(),
      User.countDocuments({ role: "user" }),
      User.find({ role: "volunteer" }).lean(),
      SafeZone.find().lean(),
    ]);

    const totalIncidents = alerts.length;
    const criticalIncidents = alerts.filter((a: any) => a.priority === "P1" || a.riskLevel === "CRITICAL").length;
    const highRiskIncidents = alerts.filter((a: any) => a.riskLevel === "HIGH").length;
    const resolvedIncidents = alerts.filter((a: any) => a.status === "resolved").length;
    const activeIncidents = alerts.filter((a: any) => a.status === "active" || a.status === "accepted").length;

    // Response time calculations
    let totalRespSec = 0;
    let respCount = 0;
    let totalAssignSec = 0;
    let assignCount = 0;

    alerts.forEach((a: any) => {
      if (a.resolutionSummary?.totalResponseDurationSec) {
        totalRespSec += a.resolutionSummary.totalResponseDurationSec;
        respCount++;
      } else if (a.resolvedAt && a.createdAt) {
        totalRespSec += Math.max(0, (new Date(a.resolvedAt).getTime() - new Date(a.createdAt).getTime()) / 1000);
        respCount++;
      }
      if (a.acceptedAt && a.createdAt) {
        totalAssignSec += Math.max(0, (new Date(a.acceptedAt).getTime() - new Date(a.createdAt).getTime()) / 1000);
        assignCount++;
      }
    });

    const avgResponseTimeSec = respCount > 0 ? Math.round(totalRespSec / respCount) : 0;
    const avgAssignmentTimeSec = assignCount > 0 ? Math.round(totalAssignSec / assignCount) : 0;

    // Volunteer statistics
    let totalAssignments = 0;
    let acceptedAssignments = 0;
    let rejectedAssignments = 0;
    let timedOutAssignments = 0;

    volunteers.forEach((v: any) => {
      const stats = v.volunteerStats || {};
      totalAssignments += stats.totalAssignments || 0;
      acceptedAssignments += stats.acceptedCount || 0;
      rejectedAssignments += stats.rejectedCount || 0;
      timedOutAssignments += stats.timedOutCount || 0;
    });

    const acceptanceRate = totalAssignments > 0 ? Math.round((acceptedAssignments / totalAssignments) * 100) : 100;
    const rejectionRate = totalAssignments > 0 ? Math.round((rejectedAssignments / totalAssignments) * 100) : 0;
    const timeoutRate = totalAssignments > 0 ? Math.round((timedOutAssignments / totalAssignments) * 100) : 0;

    // Signals attribution
    const signalCounts: Record<string, number> = {
      "Voice Distress": 0,
      "Screaming / High Decibel": 0,
      "Help Keywords": 0,
      "Movement Anomaly": 0,
      "Sudden Stop": 0,
      "Route Deviation": 0,
      "Manual SOS Button": 0,
    };

    alerts.forEach((a: any) => {
      if (a.source === "MANUAL_SOS") signalCounts["Manual SOS Button"]++;
      if (a.distressType?.toLowerCase().includes("scream") || a.distressType?.toLowerCase().includes("voice")) signalCounts["Voice Distress"]++;
      if (a.distressType?.toLowerCase().includes("scream")) signalCounts["Screaming / High Decibel"]++;
      if (a.detectedKeywords && a.detectedKeywords.length > 0) signalCounts["Help Keywords"]++;
      if (a.movementAnomalyType || a.movementRiskScore > 40) signalCounts["Movement Anomaly"]++;
      if (a.suddenStop) signalCounts["Sudden Stop"]++;
      if (a.routeDeviated) signalCounts["Route Deviation"]++;
    });

    const totalSignalTriggers = Object.values(signalCounts).reduce((a, b) => a + b, 0) || 1;
    const topSignals = Object.entries(signalCounts)
      .map(([signal, count]) => ({
        signal,
        count,
        percentage: Math.round((count / totalSignalTriggers) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // Hotspots
    const hotspots = await SafetyHotspotEngine.calculateHotspots({
      startDate: options.startDate,
      endDate: options.endDate,
    });

    // AI Insights & Recommendations
    const insights = AIInsightEngine.generateInsights({
      totalIncidents,
      criticalIncidents,
      highRiskIncidents,
      avgResponseTimeSec,
      avgAssignmentTimeSec,
      acceptanceRate,
      rejectionRate,
      timeoutRate,
      topSignals,
      hotspots,
    });

    const recommendations = SafetyRecommendationEngine.generateRecommendations({
      hotspots,
      avgResponseTimeSec,
      timeoutRate,
      acceptanceRate,
      topSignals,
      activeVolunteersCount: volunteers.filter((v: any) => v.isVerified).length,
      criticalIncidents,
    });

    return {
      generatedAt: new Date().toISOString(),
      reportPeriod: {
        startDate: options.startDate ? options.startDate.toISOString() : "All Historical",
        endDate: options.endDate ? options.endDate.toISOString() : "Present",
      },
      summary: {
        totalUsers: users,
        totalVolunteers: volunteers.length,
        verifiedVolunteers: volunteers.filter((v: any) => v.isVerified).length,
        totalIncidents,
        activeIncidents,
        resolvedIncidents,
        criticalIncidents,
        highRiskIncidents,
        avgResponseTimeSec,
        avgAssignmentTimeSec,
        avgResponseFormatted: `${Math.floor(avgResponseTimeSec / 60)}m ${avgResponseTimeSec % 60}s`,
        avgAssignmentFormatted: `${Math.floor(avgAssignmentTimeSec / 60)}m ${avgAssignmentTimeSec % 60}s`,
        safeZonesCount: safeZones.length,
      },
      riskBreakdown: {
        critical: criticalIncidents,
        high: highRiskIncidents,
        medium: alerts.filter((a: any) => a.riskLevel === "MEDIUM").length,
        low: alerts.filter((a: any) => a.riskLevel === "LOW" || !a.riskLevel).length,
        averageRiskScore: totalIncidents > 0 ? Math.round(alerts.reduce((sum: number, a: any) => sum + (a.finalRiskScore || a.riskScore || 50), 0) / totalIncidents) : 0,
      },
      priorityBreakdown: {
        P1: alerts.filter((a: any) => a.priority === "P1").length,
        P2: alerts.filter((a: any) => a.priority === "P2").length,
        P3: alerts.filter((a: any) => a.priority === "P3").length,
        P4: alerts.filter((a: any) => a.priority === "P4").length,
      },
      sourceBreakdown: {
        MANUAL_SOS: alerts.filter((a: any) => a.source === "MANUAL_SOS").length,
        AI_VOICE: alerts.filter((a: any) => a.source === "AI_VOICE").length,
        AI_MOVEMENT: alerts.filter((a: any) => a.source === "AI_MOVEMENT").length,
        AI_FUSION: alerts.filter((a: any) => a.source === "AI_FUSION").length,
      },
      volunteerPerformance: {
        totalAssignments,
        acceptanceRate,
        rejectionRate,
        timeoutRate,
        activeResponders: volunteers.filter((v: any) => v.volunteerStatus === "BUSY" || v.volunteerStatus === "ONLINE").length,
      },
      topSignals,
      hotspots,
      insights,
      recommendations,
    };
  }

  /**
   * Generates CSV format string of aggregated safety incidents.
   */
  public static async exportIncidentsCSV(options: {
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<string> {
    const query: any = {};
    if (options.startDate || options.endDate) {
      query.createdAt = {};
      if (options.startDate) query.createdAt.$gte = options.startDate;
      if (options.endDate) query.createdAt.$lte = options.endDate;
    }

    const alerts = await Alert.find(query)
      .populate("user", "name email phone")
      .populate("assignedVolunteerId", "name phone")
      .populate("acceptedBy", "name phone")
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      "Incident ID",
      "Date & Time",
      "Priority",
      "Risk Level",
      "Risk Score",
      "Source",
      "Status",
      "Latitude",
      "Longitude",
      "Distress Type",
      "Route Deviated",
      "Assigned Responder",
      "Resolution Time (sec)",
    ];

    const rows = alerts.map((a: any) => {
      const respTime = a.resolutionSummary?.totalResponseDurationSec ||
        (a.resolvedAt && a.createdAt ? Math.round((new Date(a.resolvedAt).getTime() - new Date(a.createdAt).getTime()) / 1000) : "N/A");

      const responder = a.acceptedBy?.name || a.assignedVolunteerId?.name || a.assignedVolunteerName || "Unassigned";

      return [
        `"${a._id}"`,
        `"${new Date(a.createdAt).toISOString()}"`,
        `"${a.priority || 'P2'}"`,
        `"${a.riskLevel || 'MEDIUM'}"`,
        a.finalRiskScore || a.riskScore || 0,
        `"${a.source || 'MANUAL_SOS'}"`,
        `"${a.status}"`,
        a.latitude,
        a.longitude,
        `"${a.distressType || 'None'}"`,
        a.routeDeviated ? "YES" : "NO",
        `"${responder}"`,
        respTime,
      ].join(",");
    });

    return [headers.join(","), ...rows].join("\n");
  }
}
