import Alert from "../models/Alert";
import SafeZone from "../models/SafeZone";

export interface IHotspotResult {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  incidentCount: number;
  averageRisk: number;
  severityDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  dominantFactors: string[];
  safeZonesNearby: number;
  peakHour?: string;
  riskTrend?: string;
}

export class SafetyHotspotEngine {
  /**
   * Calculate geographic hotspots using density-based coordinate clustering.
   * Clusters incidents within approximately ~1.5km (0.015 coordinate delta).
   */
  public static async calculateHotspots(options: {
    startDate?: Date;
    endDate?: Date;
    minIncidents?: number;
  } = {}): Promise<IHotspotResult[]> {
    const { startDate, endDate, minIncidents = 1 } = options;

    const query: any = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const alerts = await Alert.find(query)
      .select("latitude longitude riskLevel riskScore finalRiskScore priority detectedKeywords distressType movementAnomalyType routeDeviated createdAt")
      .lean();

    if (!alerts || alerts.length === 0) {
      return [];
    }

    const safeZones = await SafeZone.find().lean();

    // Group alerts into spatial grid bins (~1.5km precision: ~0.015 degrees)
    const GRID_PRECISION = 0.015;
    const clusters: Map<string, any[]> = new Map();

    for (const alert of alerts) {
      if (typeof alert.latitude !== "number" || typeof alert.longitude !== "number") continue;
      const latBin = Math.round(alert.latitude / GRID_PRECISION) * GRID_PRECISION;
      const lngBin = Math.round(alert.longitude / GRID_PRECISION) * GRID_PRECISION;
      const key = `${latBin.toFixed(3)}_${lngBin.toFixed(3)}`;

      if (!clusters.has(key)) {
        clusters.set(key, []);
      }
      clusters.get(key)!.push(alert);
    }

    const hotspots: IHotspotResult[] = [];
    let hotspotIndex = 1;

    for (const [key, clusterAlerts] of clusters.entries()) {
      if (clusterAlerts.length < minIncidents) continue;

      let sumLat = 0;
      let sumLng = 0;
      let sumRisk = 0;
      const severity = { critical: 0, high: 0, medium: 0, low: 0 };
      const factorCounts: Record<string, number> = {};
      const hourCounts: Record<number, number> = {};

      for (const a of clusterAlerts) {
        sumLat += a.latitude;
        sumLng += a.longitude;
        const score = a.finalRiskScore || a.riskScore || (a.riskLevel === "CRITICAL" ? 90 : a.riskLevel === "HIGH" ? 75 : 50);
        sumRisk += score;

        const level = (a.riskLevel || (score >= 80 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW")).toUpperCase();
        if (level === "CRITICAL") severity.critical++;
        else if (level === "HIGH") severity.high++;
        else if (level === "MEDIUM") severity.medium++;
        else severity.low++;

        // Factors
        if (a.distressType) factorCounts[a.distressType] = (factorCounts[a.distressType] || 0) + 1;
        if (a.routeDeviated) factorCounts["Route Deviation"] = (factorCounts["Route Deviation"] || 0) + 1;
        if (a.movementAnomalyType) factorCounts[a.movementAnomalyType] = (factorCounts[a.movementAnomalyType] || 0) + 1;
        if (a.detectedKeywords && Array.isArray(a.detectedKeywords)) {
          a.detectedKeywords.forEach((kw: string) => {
            factorCounts[`Keyword: ${kw}`] = (factorCounts[`Keyword: ${kw}`] || 0) + 1;
          });
        }

        if (a.createdAt) {
          const hour = new Date(a.createdAt).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      }

      const count = clusterAlerts.length;
      const avgLat = Number((sumLat / count).toFixed(5));
      const avgLng = Number((sumLng / count).toFixed(5));
      const avgRisk = Math.round(sumRisk / count);

      // Top contributing factors
      const topFactors = Object.entries(factorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([factor]) => factor);

      if (topFactors.length === 0) {
        topFactors.push("High Incident Frequency");
      }

      // Peak hour
      let peakHour = "Various";
      let maxHourCount = 0;
      for (const [hour, hCount] of Object.entries(hourCounts)) {
        if (hCount > maxHourCount) {
          maxHourCount = hCount;
          const h = parseInt(hour, 10);
          peakHour = `${h.toString().padStart(2, "0")}:00 - ${(h + 1).toString().padStart(2, "0")}:00`;
        }
      }

      // Safe zones nearby (~2.5km distance)
      const safeZonesNearby = safeZones.filter((sz: any) => {
        if (!sz.location?.coordinates && !sz.latitude) return false;
        const szLat = sz.latitude || sz.location?.coordinates[1];
        const szLng = sz.longitude || sz.location?.coordinates[0];
        const dLat = Math.abs(szLat - avgLat);
        const dLng = Math.abs(szLng - avgLng);
        return dLat < 0.025 && dLng < 0.025;
      }).length;

      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const letter = letters[(hotspotIndex - 1) % letters.length];
      const name = `Hotspot ${letter} (Sector ${avgLat.toFixed(2)}, ${avgLng.toFixed(2)})`;

      hotspots.push({
        id: `hotspot_${key}`,
        name,
        latitude: avgLat,
        longitude: avgLng,
        incidentCount: count,
        averageRisk: avgRisk,
        severityDistribution: severity,
        dominantFactors: topFactors,
        safeZonesNearby,
        peakHour,
        riskTrend: severity.critical > 0 ? "Elevated" : "Moderate",
      });

      hotspotIndex++;
    }

    // Sort by highest incident count and average risk
    return hotspots.sort((a, b) => b.incidentCount * b.averageRisk - a.incidentCount * a.averageRisk);
  }
}
