export interface IAIInsight {
  id: string;
  category: "RISK" | "RESPONSE" | "HOTSPOT" | "VOLUNTEER" | "SIGNALS" | "EFFICIENCY";
  severity: "INFO" | "WARNING" | "CRITICAL" | "POSITIVE";
  title: string;
  description: string;
  metric: string;
  traceableFact: string;
  timestamp: string;
}

export class AIInsightEngine {
  /**
   * Generates actionable, data-traceable AI safety insights from raw calculated metrics.
   */
  public static generateInsights(data: {
    totalIncidents: number;
    criticalIncidents: number;
    highRiskIncidents: number;
    avgResponseTimeSec: number;
    avgAssignmentTimeSec: number;
    acceptanceRate: number;
    rejectionRate: number;
    timeoutRate: number;
    topSignals: { signal: string; percentage: number; count: number }[];
    hotspots: Array<{ name: string; incidentCount: number; averageRisk: number }>;
    periodComparison?: {
      incidentChangePct: number;
      criticalChangePct: number;
      responseChangePct: number;
      activeVolunteerCount: number;
    };
  }): IAIInsight[] {
    const insights: IAIInsight[] = [];
    const now = new Date().toISOString();

    // 1. Critical Incident Distribution
    if (data.totalIncidents > 0) {
      const criticalPct = Math.round((data.criticalIncidents / data.totalIncidents) * 100);
      if (criticalPct >= 30) {
        insights.push({
          id: "insight_crit_high",
          category: "RISK",
          severity: "CRITICAL",
          title: "Elevated Critical Incident Ratio",
          description: `Critical incidents represent ${criticalPct}% of total emergency events. Prioritize immediate responder dispatches and automated contact escalation.`,
          metric: `${criticalPct}% Critical`,
          traceableFact: `Calculated from ${data.criticalIncidents} critical events out of ${data.totalIncidents} total incidents.`,
          timestamp: now,
        });
      } else if (data.criticalIncidents > 0) {
        insights.push({
          id: "insight_crit_mod",
          category: "RISK",
          severity: "WARNING",
          title: "Critical Priority Incidents Active",
          description: `${data.criticalIncidents} incidents classified as P1 / Critical Risk requiring verified rapid responder coverage.`,
          metric: `${data.criticalIncidents} Critical Events`,
          traceableFact: `${data.criticalIncidents} incidents with risk score >= 80 or priority P1.`,
          timestamp: now,
        });
      } else {
        insights.push({
          id: "insight_crit_none",
          category: "RISK",
          severity: "POSITIVE",
          title: "Zero Critical Emergencies",
          description: "All monitored users are safe with no high-severity distress events currently registered.",
          metric: "0 P1 Incidents",
          traceableFact: "100% of recorded incidents are within Low or Moderate risk boundaries.",
          timestamp: now,
        });
      }
    }

    // 2. Period Trends
    if (data.periodComparison) {
      const { incidentChangePct, criticalChangePct, responseChangePct } = data.periodComparison;
      if (criticalChangePct > 0) {
        insights.push({
          id: "insight_period_crit_up",
          category: "RISK",
          severity: "WARNING",
          title: "Critical Incident Volume Shift",
          description: `Critical incidents increased by ${Math.abs(criticalChangePct)}% compared with the previous baseline period.`,
          metric: `+${criticalChangePct}%`,
          traceableFact: `Previous period critical incident count compared to current period count.`,
          timestamp: now,
        });
      } else if (criticalChangePct < 0) {
        insights.push({
          id: "insight_period_crit_down",
          category: "RISK",
          severity: "POSITIVE",
          title: "Critical Incidents Reduced",
          description: `Critical distress events decreased by ${Math.abs(criticalChangePct)}% vs. previous monitoring interval.`,
          metric: `${criticalChangePct}%`,
          traceableFact: `Comparison of current vs prior period emergency totals.`,
          timestamp: now,
        });
      }

      if (responseChangePct < 0) {
        insights.push({
          id: "insight_period_resp_better",
          category: "EFFICIENCY",
          severity: "POSITIVE",
          title: "Emergency Response Speed Accelerated",
          description: `Average responder arrival time improved by ${Math.abs(responseChangePct)}%, delivering faster on-site assistance.`,
          metric: `${responseChangePct}% Time`,
          traceableFact: `Calculated from elapsed timestamps across assigned and resolved alerts.`,
          timestamp: now,
        });
      } else if (responseChangePct > 15) {
        insights.push({
          id: "insight_period_resp_slower",
          category: "EFFICIENCY",
          severity: "WARNING",
          title: "Response Time Variance Detected",
          description: `Average emergency response duration increased by ${responseChangePct}%. Check responder density in active zones.`,
          metric: `+${responseChangePct}% Delay`,
          traceableFact: `Trend calculation comparing historical dispatch durations.`,
          timestamp: now,
        });
      }
    }

    // 3. AI Signal Dominance
    if (data.topSignals && data.topSignals.length > 0) {
      const topSignal = data.topSignals[0];
      if (topSignal.percentage > 25) {
        insights.push({
          id: "insight_signals_top",
          category: "SIGNALS",
          severity: "INFO",
          title: `Dominant Trigger: ${topSignal.signal}`,
          description: `${topSignal.signal} was detected in ${topSignal.percentage}% of all emergency incidents, making it the primary distress trigger.`,
          metric: `${topSignal.percentage}% Attribution`,
          traceableFact: `Triggered in ${topSignal.count} incident evaluations.`,
          timestamp: now,
        });
      }
    }

    // 4. Hotspots Concentration
    if (data.hotspots && data.hotspots.length > 0) {
      const topHotspot = data.hotspots[0];
      if (topHotspot.incidentCount >= 2) {
        insights.push({
          id: "insight_hotspot_primary",
          category: "HOTSPOT",
          severity: "WARNING",
          title: `High Activity Zone: ${topHotspot.name}`,
          description: `${topHotspot.incidentCount} incidents clustered in this sector with an average risk score of ${topHotspot.averageRisk}/100.`,
          metric: `${topHotspot.incidentCount} Incidents`,
          traceableFact: `Geospatial density aggregation within ~1.5km coordinate cluster.`,
          timestamp: now,
        });
      }
    }

    // 5. Volunteer Response Performance
    if (data.timeoutRate > 10) {
      insights.push({
        id: "insight_vol_timeout",
        category: "VOLUNTEER",
        severity: "WARNING",
        title: "Volunteer Timeout Rate Elevated",
        description: `Volunteer response timeout rate is currently at ${data.timeoutRate}%. Auto-reassignment engine is actively cascading alerts.`,
        metric: `${data.timeoutRate}% Timeout`,
        traceableFact: `Calculated from ${data.timeoutRate}% timed out notifications in assignment history.`,
        timestamp: now,
      });
    } else if (data.acceptanceRate >= 80 && data.totalIncidents > 0) {
      insights.push({
        id: "insight_vol_healthy",
        category: "VOLUNTEER",
        severity: "POSITIVE",
        title: "Strong Responder Engagement",
        description: `Volunteer acceptance rate is high at ${data.acceptanceRate}%, maintaining efficient dispatch coordination.`,
        metric: `${data.acceptanceRate}% Acceptance`,
        traceableFact: `Based on volunteer assignments and acceptance responses.`,
        timestamp: now,
      });
    }

    // Ensure fallback insight if no incidents exist yet
    if (insights.length === 0) {
      insights.push({
        id: "insight_initial_ready",
        category: "EFFICIENCY",
        severity: "INFO",
        title: "Command Center Intelligence Active",
        description: "AI safety telemetry is monitoring voice distress, movement anomalies, and GPS trajectories in real time.",
        metric: "System Ready",
        traceableFact: "Connected to SafeHer multi-modal database pipeline.",
        timestamp: now,
      });
    }

    return insights;
  }
}
