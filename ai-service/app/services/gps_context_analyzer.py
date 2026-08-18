"""
GPS Context Analyzer Service
-----------------------------
Analyzes GPS position context to compute a risk score based on:
- Proximity to safe zones (hospitals, police stations, etc.)
- Time of day (late night hours = higher baseline risk)
- Isolation (no safe zones within 1km)
- Speed anomaly in isolation (vehicle speed in deserted area)
"""
import logging
import math
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Late night hours (11 PM - 5 AM)
LATE_NIGHT_HOURS = list(range(23, 24)) + list(range(0, 6))
ISOLATED_RADIUS_M = 1000.0    # meters — no safe zone within this = isolated
SAFE_ZONE_NEAR_M = 200.0      # within this = in safe zone


class GPSContextAnalyzer:
    """
    Analyzes GPS position and environmental context to compute a risk score.
    Considers: safe zone proximity, time of day, isolation, speed context.
    """

    def __init__(self):
        self.model_name = "SafeHer GPS Context Risk Analyzer v1"

    def analyze(
        self,
        latitude: float,
        longitude: float,
        speed_kmh: float = 0.0,
        hour_of_day: Optional[int] = None,
        safe_zones: Optional[List[Dict[str, Any]]] = None,
        stationary_duration_sec: float = 0.0,
    ) -> Dict[str, Any]:
        """
        Returns GPS context risk score (0–100) and contextual flags.
        """
        safe_zones = safe_zones or []

        # Find nearest safe zone
        nearest_m, in_safe_zone = self._nearest_safe_zone(latitude, longitude, safe_zones)

        # Time risk
        is_late_night = (hour_of_day is not None) and (hour_of_day in LATE_NIGHT_HOURS)

        # Isolation
        is_isolated = (nearest_m is None) or (nearest_m > ISOLATED_RADIUS_M)

        # Compute score
        score = self._compute_score(
            in_safe_zone=in_safe_zone,
            nearest_m=nearest_m,
            is_late_night=is_late_night,
            is_isolated=is_isolated,
            speed_kmh=speed_kmh,
            stationary_duration_sec=stationary_duration_sec,
        )

        score = max(0, min(100, score))
        risk_level = self._score_to_level(score)

        return {
            "success": True,
            "gps_context_score": score,
            "risk_level": risk_level,
            "is_in_safe_zone": in_safe_zone,
            "nearest_safe_zone_m": round(nearest_m, 1) if nearest_m is not None else None,
            "is_isolated": is_isolated,
            "is_late_night": is_late_night,
            "details": {
                "latitude": latitude,
                "longitude": longitude,
                "speed_kmh": speed_kmh,
                "hour_of_day": hour_of_day,
                "safe_zones_checked": len(safe_zones),
                "model_name": self.model_name,
            }
        }

    # ─────────────────────────────────────────────
    # Helpers
    # ─────────────────────────────────────────────

    @staticmethod
    def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6_371_000  # Earth radius in meters
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = (
            math.sin(d_lat / 2) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(d_lon / 2) ** 2
        )
        return R * 2 * math.atan2(math.sqrt(max(0.0, a)), math.sqrt(max(0.0, 1 - a)))

    def _nearest_safe_zone(
        self,
        lat: float,
        lon: float,
        safe_zones: List[Dict[str, Any]]
    ) -> Tuple[Optional[float], bool]:
        """Returns (nearest_distance_m, is_in_safe_zone)."""
        if not safe_zones:
            return None, False

        distances = [
            self._haversine_m(lat, lon, sz.get("latitude", 0), sz.get("longitude", 0))
            for sz in safe_zones
        ]

        nearest = min(distances)
        radius = safe_zones[distances.index(nearest)].get("radius_m", 500.0)
        in_zone = nearest <= radius

        return nearest, in_zone

    def _compute_score(
        self,
        in_safe_zone: bool,
        nearest_m: Optional[float],
        is_late_night: bool,
        is_isolated: bool,
        speed_kmh: float,
        stationary_duration_sec: float,
    ) -> int:
        score = 0

        # In a safe zone → low base
        if in_safe_zone:
            score += 5
            if is_late_night:
                score += 5
            return score  # Capped low if in safe zone

        # Distance from nearest safe zone
        if nearest_m is None:
            score += 40  # No known safe zones at all
        elif nearest_m > 2000:
            score += 35
        elif nearest_m > 1000:
            score += 25
        elif nearest_m > 500:
            score += 15
        else:
            score += 5

        # Late night
        if is_late_night:
            score += 20

        # Isolation (no safe zone within 1km)
        if is_isolated:
            score += 15

        # Speed in isolated zone (potentially being driven away)
        if is_isolated and speed_kmh > 40:
            score += 15
        elif is_isolated and speed_kmh > 80:
            score += 10  # additional

        # Long stationary in isolated area at night
        if is_isolated and is_late_night and stationary_duration_sec > 300:
            score += 10

        return score

    @staticmethod
    def _score_to_level(score: int) -> str:
        if score <= 30:
            return "LOW"
        elif score <= 50:
            return "MEDIUM"
        elif score <= 75:
            return "HIGH"
        return "CRITICAL"
