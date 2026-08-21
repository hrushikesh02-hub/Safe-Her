export interface ISafetyRecommendation {
  id: string;
  category: "DEPLOYMENT" | "COVERAGE" | "MONITORING" | "INFRASTRUCTURE" | "ENGAGEMENT";
  priority: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  action: string;
  rationale: string;
  affectedArea?: string;
  suggestedTimeline: string;
}

export class SafetyRecommendationEngine {
  /**
   * Generates practical, advisory recommendations based on active risk, hotspot density and response efficiency.
   */
  public static generateRecommendations(data: {
    hotspots: Array<{ name: string; latitude: number; longitude: number; incidentCount: number; averageRisk: number; safeZonesNearby: number; peakHour?: string }>;
    avgResponseTimeSec: number;
    timeoutRate: number;
    acceptanceRate: number;
    topSignals: Array<{ signal: string; percentage: number }>;
    activeVolunteersCount: number;
    criticalIncidents: number;
  }): ISafetyRecommendation[] {
    const recommendations: ISafetyRecommendation[] = [];

    // 1. Hotspot Coverage Recommendations
    if (data.hotspots && data.hotspots.length > 0) {
      const highestDensity = data.hotspots[0];
      if (highestDensity.incidentCount >= 2 && highestDensity.safeZonesNearby === 0) {
        recommendations.push({
          id: "rec_safezone_deploy",
          category: "INFRASTRUCTURE",
          priority: "HIGH",
          title: `Establish Safe Zone Near ${highestDensity.name}`,
          action: `Register a verified Safe Zone or partner location within 500m of coordinates (${highestDensity.latitude}, ${highestDensity.longitude}).`,
          rationale: `${highestDensity.incidentCount} incidents recorded in this zone with 0 nearby safe refuges.`,
          affectedArea: highestDensity.name,
          suggestedTimeline: "Immediate (Next 48 Hours)",
        });
      }

      if (highestDensity.peakHour && highestDensity.peakHour !== "Various") {
        recommendations.push({
          id: "rec_peak_patrol",
          category: "DEPLOYMENT",
          priority: "MEDIUM",
          title: `Increase Responder Standby during ${highestDensity.peakHour}`,
          action: `Notify verified community volunteers to maintain active availability around ${highestDensity.name} during peak hours (${highestDensity.peakHour}).`,
          rationale: `Historical analytics identify ${highestDensity.peakHour} as the highest-density distress window.`,
          affectedArea: highestDensity.name,
          suggestedTimeline: "Ongoing weekly scheduling",
        });
      }
    }

    // 2. Response & Timeout Recommendations
    if (data.timeoutRate > 8) {
      recommendations.push({
        id: "rec_timeout_tuning",
        category: "ENGAGEMENT",
        priority: "HIGH",
        title: "Recruit & Verify Additional Volunteers",
        action: "Approve pending volunteer applications and conduct outreach to expand responder coverage in under-served zones.",
        rationale: `Volunteer timeout rate is ${data.timeoutRate}%, indicating local responders may be off-duty or distant.`,
        suggestedTimeline: "This Week",
      });
    }

    // 3. Signal Specific Recommendations
    const routeDevSignal = data.topSignals.find((s) => s.signal.toLowerCase().includes("route"));
    if (routeDevSignal && routeDevSignal.percentage >= 20) {
      recommendations.push({
        id: "rec_route_monitoring",
        category: "MONITORING",
        priority: "MEDIUM",
        title: "Calibrate Route Deviation Sensitivity",
        action: "Promote Safe-Path navigation and check-in prompt configurations for users traveling after dusk.",
        rationale: `Route deviation was detected in ${routeDevSignal.percentage}% of distress evaluations.`,
        suggestedTimeline: "Continuous Advisory",
      });
    }

    // 4. Low Volunteer Density Alert
    if (data.activeVolunteersCount < 3) {
      recommendations.push({
        id: "rec_onboard_volunteers",
        category: "COVERAGE",
        priority: "HIGH",
        title: "Expand Active Volunteer Responder Network",
        action: "Review and approve pending volunteer verifications in the admin verification queue.",
        rationale: `Only ${data.activeVolunteersCount} active responders are currently registered, reducing redundancy during simultaneous emergencies.`,
        suggestedTimeline: "Immediate",
      });
    }

    // Fallback advisory if database is clean
    if (recommendations.length === 0) {
      recommendations.push({
        id: "rec_baseline_ready",
        category: "MONITORING",
        priority: "LOW",
        title: "Maintain Real-Time Command Center Monitoring",
        action: "Keep telemetry ingestion active and review weekly risk distribution reports.",
        rationale: "All safety metrics are operating within normal baseline parameters.",
        suggestedTimeline: "Routine",
      });
    }

    return recommendations;
  }
}
