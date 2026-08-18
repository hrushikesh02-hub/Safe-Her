from typing import Dict, Any, List

class IncidentPriorityClassifier:
    """
    Classifies incident emergency priority into P1, P2, P3, P4 based on multi-channel risk indicators.
    - P1 (Critical): Extreme risk (score >= 75), active screams, critical fusion, multiple distress channels.
    - P2 (High): Moderate-high risk (score >= 50), keywords detected, significant route deviation.
    - P3 (Medium): Moderate risk, manual emergency alerts without critical distress signals.
    - P4 (Low / Informational): Precautionary checks, low volatility alarms.
    """

    @staticmethod
    def classify_priority(
        final_risk_score: float = 0.0,
        risk_level: str = "MEDIUM",
        source: str = "MANUAL_SOS",
        distress_type: str = "unknown",
        detected_keywords: List[str] = None,
        movement_anomaly: str = None,
        route_deviated: bool = False
    ) -> Dict[str, Any]:
        detected_keywords = detected_keywords or []
        reasons = []
        priority_score = min(100.0, max(0.0, float(final_risk_score or 50.0)))

        # Evaluate signals
        if source == "AI_VOICE" or source == "AI_FUSION":
            reasons.append(f"AI automated distress trigger ({source})")
            if distress_type and distress_type.lower() in ["screaming", "distress_speech", "screaming_voice"]:
                reasons.append("Acoustic scream / acute distress voice signature detected")
                priority_score = max(priority_score, 88.0)
        
        if detected_keywords and len(detected_keywords) > 0:
            reasons.append(f"Emergency verbal keywords detected: {', '.join(detected_keywords)}")
            priority_score = max(priority_score, 80.0)

        if movement_anomaly and movement_anomaly != "normal":
            reasons.append(f"Abnormal movement dynamic: {movement_anomaly}")
            priority_score = max(priority_score, 70.0)

        if route_deviated:
            reasons.append("Unplanned trajectory deviation into high-risk corridor")

        if risk_level == "CRITICAL" or priority_score >= 75.0:
            priority = "P1"
            priority_label = "CRITICAL"
            max_responders = 2
            timeout_seconds = 30
        elif risk_level == "HIGH" or priority_score >= 50.0:
            priority = "P2"
            priority_label = "HIGH"
            max_responders = 1
            timeout_seconds = 45
        elif priority_score >= 25.0:
            priority = "P3"
            priority_label = "MEDIUM"
            max_responders = 1
            timeout_seconds = 60
        else:
            priority = "P4"
            priority_label = "LOW"
            max_responders = 1
            timeout_seconds = 90

        if not reasons:
            reasons.append(f"Emergency dispatch initiated via {source}")

        return {
            "priority": priority,
            "priority_label": priority_label,
            "priority_score": round(priority_score, 1),
            "reasons": reasons,
            "max_responders": max_responders,
            "recommended_timeout_seconds": timeout_seconds,
        }
