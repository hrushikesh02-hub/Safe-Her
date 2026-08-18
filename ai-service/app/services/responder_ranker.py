import math
from typing import List, Dict, Any

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class VolunteerRankingEngine:
    """
    Ranks nearby volunteers based strictly on operational parameters:
    1. Distance (45%)
    2. Availability (20%)
    3. Estimated ETA (20%)
    4. Location Freshness (10%)
    5. Historical Response Performance (5%)
    Zero sensitive personal attributes are used.
    """

    @staticmethod
    def rank_candidates(
        incident_lat: float,
        incident_lng: float,
        volunteers: List[Dict[str, Any]],
        max_radius_km: float = 5.0
    ) -> List[Dict[str, Any]]:
        scored_candidates = []

        for v in volunteers:
            v_lat = v.get("latitude") or v.get("lastKnownLatitude")
            v_lng = v.get("longitude") or v.get("lastKnownLongitude")

            if v_lat is None or v_lng is None:
                continue

            dist_km = haversine_km(incident_lat, incident_lng, float(v_lat), float(v_lng))
            if dist_km > max_radius_km:
                continue

            # 1. Distance Score (0-100): 0km -> 100, 5km -> 0
            dist_score = max(0.0, 100.0 * (1.0 - (dist_km / max_radius_km)))

            # 2. Availability Score (0-100)
            status = v.get("volunteerStatus", "AVAILABLE")
            avail_score = 100.0 if status == "AVAILABLE" else (30.0 if status == "BUSY" else 0.0)

            # 3. ETA Calculation (Assumes ~25 km/h urban transit -> ~2.4 mins per km + 1.5 min prep)
            eta_minutes = round(max(1.0, (dist_km / 25.0) * 60.0 + 1.5), 1)
            # ETA score: <= 3 min -> 100, 15 min -> 20
            eta_score = max(0.0, min(100.0, 100.0 - (eta_minutes * 5.0)))

            # 4. Location Freshness
            freshness_str = v.get("locationFreshness", "GOOD")
            freshness_score = 100.0 if freshness_str == "GOOD" else (60.0 if freshness_str == "MODERATE" else 20.0)

            # 5. Historical Response Performance
            stats = v.get("volunteerStats", {})
            accepted = stats.get("acceptedCount", 0)
            total = stats.get("totalAssignments", 0)
            history_score = (accepted / total * 100.0) if total > 0 else 75.0

            # Composite Response Score (Weights: 45%, 20%, 20%, 10%, 5%)
            response_score = (
                dist_score * 0.45 +
                avail_score * 0.20 +
                eta_score * 0.20 +
                freshness_score * 0.10 +
                history_score * 0.05
            )
            response_score = round(min(100.0, max(0.0, response_score)), 1)

            scored_candidates.append({
                "volunteerId": str(v.get("id") or v.get("_id") or ""),
                "name": v.get("name", "Volunteer Responder"),
                "email": v.get("email", ""),
                "phone": v.get("phone", ""),
                "distanceKm": round(dist_km, 2),
                "estimatedEtaMinutes": eta_minutes,
                "availability": status == "AVAILABLE",
                "locationFreshness": freshness_str,
                "responseScore": response_score,
                "factors": {
                    "distanceScore": round(dist_score, 1),
                    "availabilityScore": round(avail_score, 1),
                    "etaScore": round(eta_score, 1),
                    "freshnessScore": round(freshness_score, 1),
                    "historyScore": round(history_score, 1),
                }
            })

        # Sort descending by composite response score
        scored_candidates.sort(key=lambda x: x["responseScore"], reverse=True)
        return scored_candidates
