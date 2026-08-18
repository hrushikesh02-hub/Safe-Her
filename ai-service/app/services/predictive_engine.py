import math
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in meters"""
    R = 6371000  # radius of Earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class PredictiveSafetyEngine:
    """
    Evaluates proactive, predictive safety factors based on:
    1. Temporal Risk Factor (Time of day, night/late hours)
    2. Proximity to designated Safe Zones
    3. Historical Incident Cluster density nearby with distance & recency decay
    4. Movement stability / Route consistency trajectory
    5. Environmental isolation estimate
    """

    @staticmethod
    def calculate_temporal_risk(hour: Optional[int] = None) -> Dict[str, Any]:
        """Calculates risk factor based on time of day (0-100 scale)."""
        if hour is None:
            hour = datetime.now().hour

        if 7 <= hour < 19:
            score = 10.0
            category = "daylight_standard"
            desc = "Normal daytime travel window"
        elif 19 <= hour < 22:
            score = 35.0
            category = "evening_caution"
            desc = "Evening hours - moderate vigilance recommended"
        elif 22 <= hour or hour < 4:
            score = 68.0
            category = "late_night_elevated"
            desc = "Late night transit - elevated situational risk"
        else:
            score = 42.0
            category = "early_morning"
            desc = "Early morning window - low pedestrian activity"

        return {
            "hour": hour,
            "temporal_risk_score": score,
            "category": category,
            "description": desc
        }

    @staticmethod
    def evaluate_predictive_risk(
        latitude: float,
        longitude: float,
        safe_zones: List[Dict[str, Any]],
        historical_incidents: List[Dict[str, Any]],
        recent_movement_volatility: float = 0.0,
        hour_override: Optional[int] = None
    ) -> Dict[str, Any]:
        
        # 1. Temporal Risk
        temp_info = PredictiveSafetyEngine.calculate_temporal_risk(hour_override)
        temp_score = temp_info["temporal_risk_score"]

        # 2. Safe Zone Proximity
        nearest_safe_zone = None
        min_safe_zone_dist = float("inf")
        for sz in safe_zones:
            sz_lat = sz.get("latitude") or sz.get("lat") or (sz.get("location", {}).get("coordinates", [0, 0])[1] if "location" in sz else 0)
            sz_lng = sz.get("longitude") or sz.get("lng") or (sz.get("location", {}).get("coordinates", [0, 0])[0] if "location" in sz else 0)
            if sz_lat and sz_lng:
                d = calculate_distance(latitude, longitude, float(sz_lat), float(sz_lng))
                if d < min_safe_zone_dist:
                    min_safe_zone_dist = d
                    nearest_safe_zone = {
                        "name": sz.get("name", "Designated Safe Zone"),
                        "type": sz.get("type", "safe_shelter"),
                        "distance_meters": round(d, 1),
                        "latitude": float(sz_lat),
                        "longitude": float(sz_lng)
                    }

        if min_safe_zone_dist <= 300:
            safe_zone_risk = 5.0
        elif min_safe_zone_dist <= 1000:
            safe_zone_risk = 25.0
        elif min_safe_zone_dist <= 3000:
            safe_zone_risk = 50.0
        else:
            safe_zone_risk = 75.0

        # 3. Historical Incident Proximity & Decay Cluster
        nearby_incidents = 0
        incident_weighted_risk = 0.0
        now_ts = datetime.now(timezone.utc).timestamp()

        for inc in historical_incidents:
            inc_lat = inc.get("latitude") or (inc.get("location", {}).get("coordinates", [0, 0])[1] if "location" in inc else None)
            inc_lng = inc.get("longitude") or (inc.get("location", {}).get("coordinates", [0, 0])[0] if "location" in inc else None)
            if inc_lat is not None and inc_lng is not None:
                dist = calculate_distance(latitude, longitude, float(inc_lat), float(inc_lng))
                if dist <= 1500: # within 1.5km
                    nearby_incidents += 1
                    # Spatial decay
                    dist_decay = max(0.1, 1.0 - (dist / 1500.0))
                    
                    # Temporal age decay (if timestamp available)
                    age_decay = 1.0
                    inc_created = inc.get("createdAt") or inc.get("time")
                    if inc_created:
                        try:
                            if isinstance(inc_created, str):
                                inc_dt = datetime.fromisoformat(inc_created.replace("Z", "+00:00"))
                                age_days = (now_ts - inc_dt.timestamp()) / 86400.0
                                age_decay = max(0.2, 1.0 - min(1.0, age_days / 30.0))
                        except Exception:
                            age_decay = 1.0

                    incident_weighted_risk += (dist_decay * age_decay * 18.0)

        historical_risk = min(90.0, incident_weighted_risk)

        # 4. Movement Volatility (0.0 - 1.0)
        movement_risk = min(100.0, recent_movement_volatility * 100.0)

        # Composite Predictive Risk Score (Weighted Formula)
        # Weights: Temporal (30%), Safe Zone Coverage (30%), Historical Clusters (25%), Movement Trend (15%)
        composite_score = (
            temp_score * 0.30 +
            safe_zone_risk * 0.30 +
            historical_risk * 0.25 +
            movement_risk * 0.15
        )
        composite_score = round(min(100.0, max(0.0, composite_score)), 1)

        # Determine Risk Level & Risk Trend
        if composite_score < 25:
            level = "SAFE"
            trend = "stable"
            color = "emerald"
        elif composite_score < 50:
            level = "MODERATE"
            trend = "stable"
            color = "yellow"
        elif composite_score < 75:
            level = "ELEVATED_CAUTION"
            trend = "elevating"
            color = "orange"
        else:
            level = "HIGH_CAUTION"
            trend = "high_caution"
            color = "red"

        # Calculate Confidence Level
        # Confidence increases with available data density
        signals_available = 1 # GPS is present
        if safe_zones and len(safe_zones) > 0:
            signals_available += 1
        if historical_incidents is not None:
            signals_available += 1
        if recent_movement_volatility is not None:
            signals_available += 1

        if signals_available >= 4:
            confidence = "HIGH"
        elif signals_available >= 2:
            confidence = "MEDIUM"
        else:
            confidence = "LOW"

        # Generate Early Warning Recommendations
        warnings = []
        if temp_score >= 55:
            warnings.append({
                "type": "TEMPORAL_CAUTION",
                "severity": "medium",
                "message": "Late night transit: Stay on main well-lit thoroughfares.",
                "action": "Enable safety check-in timer"
            })
        if safe_zone_risk >= 60:
            dist_str = f"{round(min_safe_zone_dist/1000, 1)} km" if min_safe_zone_dist != float("inf") else "Unknown"
            warnings.append({
                "type": "ISOLATION_CAUTION",
                "severity": "medium",
                "message": f"Nearest verified safe zone is {dist_str} away.",
                "action": "Review nearest shelter points"
            })
        if nearby_incidents > 0:
            warnings.append({
                "type": "HISTORICAL_CLUSTER",
                "severity": "high" if nearby_incidents >= 3 else "medium",
                "message": f"{nearby_incidents} safety incident(s) reported in this 1.5km corridor in the past 30 days.",
                "action": "Keep emergency contacts accessible"
            })
        if recent_movement_volatility >= 0.5:
            warnings.append({
                "type": "MOVEMENT_VOLATILITY",
                "severity": "medium",
                "message": "Unusual movement volatility or rapid directional changes detected.",
                "action": "Stay in safe area"
            })

        return {
            "predictive_safety_score": composite_score,
            "safety_index": round(100.0 - composite_score, 1),
            "risk_level": level,
            "risk_trend": trend,
            "confidence": confidence,
            "color": color,
            "factors": {
                "temporal": {
                    "score": round(temp_score, 1),
                    "details": temp_info
                },
                "safe_zone_coverage": {
                    "score": round(safe_zone_risk, 1),
                    "nearest_safe_zone": nearest_safe_zone,
                    "distance_meters": round(min_safe_zone_dist, 1) if min_safe_zone_dist != float("inf") else None
                },
                "historical_density": {
                    "score": round(historical_risk, 1),
                    "nearby_incident_count": nearby_incidents
                },
                "movement_trajectory": {
                    "score": round(movement_risk, 1),
                    "volatility": recent_movement_volatility
                }
            },
            "early_warnings": warnings,
            "evaluated_at": datetime.now(timezone.utc).isoformat()
        }
