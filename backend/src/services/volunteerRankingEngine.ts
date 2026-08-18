import axios from "axios";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface CandidateVolunteer {
  id: string;
  name: string;
  email: string;
  phone: string;
  latitude: number;
  longitude: number;
  volunteerStatus?: string;
  lastLocationAt?: Date;
  volunteerStats?: {
    totalAssignments: number;
    acceptedCount: number;
    rejectedCount: number;
    timedOutCount: number;
    resolvedCount: number;
    averageResponseTimeSec: number;
  };
}

export interface RankedVolunteer {
  volunteerId: string;
  name: string;
  email: string;
  phone: string;
  distanceKm: number;
  estimatedEtaMinutes: number;
  availability: boolean;
  locationFreshness: string;
  responseScore: number;
  factors?: any;
}

export class VolunteerRankingEngine {
  static async rankResponders(
    incidentLat: number,
    incidentLng: number,
    volunteers: CandidateVolunteer[],
    maxRadiusKm: number = 5.0
  ): Promise<RankedVolunteer[]> {
    try {
      const response = await axios.post(
        `${AI_SERVICE_URL}/api/v1/response/rank-responders`,
        {
          incident_latitude: incidentLat,
          incident_longitude: incidentLng,
          volunteers: volunteers.map((v) => ({
            id: v.id,
            name: v.name,
            email: v.email,
            phone: v.phone,
            latitude: v.latitude,
            longitude: v.longitude,
            volunteerStatus: v.volunteerStatus || "AVAILABLE",
            locationFreshness: this.getLocationFreshness(v.lastLocationAt),
            volunteerStats: v.volunteerStats || {},
          })),
          max_radius_km: maxRadiusKm,
        },
        { timeout: 3000 }
      );
      return response.data.data;
    } catch (err: any) {
      console.warn("[VolunteerRankingEngine] Fallback to local ranking:", err?.message);
      return this.localFallback(incidentLat, incidentLng, volunteers, maxRadiusKm);
    }
  }

  private static getLocationFreshness(lastLocationAt?: Date): string {
    if (!lastLocationAt) return "MODERATE";
    const ageMs = Date.now() - new Date(lastLocationAt).getTime();
    if (ageMs < 10 * 60 * 1000) return "GOOD"; // < 10 mins
    if (ageMs < 60 * 60 * 1000) return "MODERATE"; // < 1 hour
    return "STALE";
  }

  private static localFallback(
    incidentLat: number,
    incidentLng: number,
    volunteers: CandidateVolunteer[],
    maxRadiusKm: number
  ): RankedVolunteer[] {
    const scored: RankedVolunteer[] = [];

    for (const v of volunteers) {
      if (v.latitude == null || v.longitude == null) continue;
      const distKm = haversineKm(incidentLat, incidentLng, v.latitude, v.longitude);
      if (distKm > maxRadiusKm) continue;

      const distScore = Math.max(0, 100 * (1 - distKm / maxRadiusKm));
      const availScore = v.volunteerStatus === "BUSY" ? 30 : v.volunteerStatus === "OFFLINE" ? 0 : 100;
      const etaMinutes = Math.round((Math.max(1, (distKm / 25) * 60 + 1.5)) * 10) / 10;
      const etaScore = Math.max(0, Math.min(100, 100 - etaMinutes * 5));
      const freshness = this.getLocationFreshness(v.lastLocationAt);
      const freshnessScore = freshness === "GOOD" ? 100 : freshness === "MODERATE" ? 60 : 20;

      const stats = v.volunteerStats || { totalAssignments: 0, acceptedCount: 0 };
      const histScore = stats.totalAssignments > 0 ? (stats.acceptedCount / stats.totalAssignments) * 100 : 75;

      const compositeScore = Math.round(
        distScore * 0.45 +
        availScore * 0.20 +
        etaScore * 0.20 +
        freshnessScore * 0.10 +
        histScore * 0.05
      );

      scored.push({
        volunteerId: v.id,
        name: v.name,
        email: v.email,
        phone: v.phone,
        distanceKm: Math.round(distKm * 100) / 100,
        estimatedEtaMinutes: etaMinutes,
        availability: v.volunteerStatus !== "OFFLINE" && v.volunteerStatus !== "BUSY",
        locationFreshness: freshness,
        responseScore: compositeScore,
      });
    }

    scored.sort((a, b) => b.responseScore - a.responseScore);
    return scored;
  }
}
