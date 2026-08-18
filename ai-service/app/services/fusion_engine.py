"""
Multi-Modal Fusion Engine
--------------------------
Combines Voice Risk, Movement Risk, and GPS Context Risk
into a single FINAL RISK SCORE using configurable weighted fusion.

Formula:
  final_score = voice_score × w_voice + movement_score × w_movement + gps_score × w_gps

Default weights: voice=0.5, movement=0.3, gps=0.2

Recommendations:
  0–30   → SAFE
  31–50  → MONITOR
  51–75  → ALERT
  76–100 → CRITICAL_SOS
"""
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

RECOMMENDATIONS = [
    (30, "SAFE"),
    (50, "MONITOR"),
    (75, "ALERT"),
    (100, "CRITICAL_SOS"),
]


class FusionEngine:
    """
    Weighted multi-modal risk fusion engine.
    Accepts voice, movement, and GPS context scores and fuses them
    into a single unified risk score.
    """

    DEFAULT_WEIGHTS = {"voice": 0.5, "movement": 0.3, "gps": 0.2}

    def __init__(self):
        self.model_name = "SafeHer Multi-Modal Fusion Engine v1"

    def fuse(
        self,
        voice_risk_score: int = 0,
        movement_risk_score: int = 0,
        gps_context_score: int = 0,
        weights: Optional[Dict[str, float]] = None,
        scenario: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Returns fused risk score, level, recommendation, and breakdown.
        """
        if scenario:
            return self._get_demo_scenario(scenario)

        w = weights or self.DEFAULT_WEIGHTS
        w_voice = float(w.get("voice", 0.5))
        w_movement = float(w.get("movement", 0.3))
        w_gps = float(w.get("gps", 0.2))

        # Normalize weights to sum to 1.0
        total_w = w_voice + w_movement + w_gps
        if total_w > 0:
            w_voice /= total_w
            w_movement /= total_w
            w_gps /= total_w

        final_score = int(
            voice_risk_score * w_voice
            + movement_risk_score * w_movement
            + gps_context_score * w_gps
        )
        final_score = max(0, min(100, final_score))
        final_level = self._score_to_level(final_score)
        recommendation = self._get_recommendation(final_score)

        # Escalation override: if any single component is CRITICAL (>= 90),
        # final score should be at least 70
        max_component = max(voice_risk_score, movement_risk_score, gps_context_score)
        if max_component >= 90 and final_score < 70:
            final_score = 70
            final_level = "HIGH"
            recommendation = "ALERT"

        return {
            "success": True,
            "final_risk_score": final_score,
            "final_risk_level": final_level,
            "recommendation": recommendation,
            "component_scores": {
                "voice_risk_score": voice_risk_score,
                "movement_risk_score": movement_risk_score,
                "gps_context_score": gps_context_score,
            },
            "risk_breakdown": {
                "voice_contribution": round(voice_risk_score * w_voice, 1),
                "movement_contribution": round(movement_risk_score * w_movement, 1),
                "gps_contribution": round(gps_context_score * w_gps, 1),
                "weights_used": {
                    "voice": round(w_voice, 3),
                    "movement": round(w_movement, 3),
                    "gps": round(w_gps, 3),
                },
            },
            "details": {
                "model_name": self.model_name,
                "demo_mode": False,
            }
        }

    @staticmethod
    def _score_to_level(score: int) -> str:
        if score <= 30:
            return "LOW"
        elif score <= 50:
            return "MEDIUM"
        elif score <= 75:
            return "HIGH"
        return "CRITICAL"

    @staticmethod
    def _get_recommendation(score: int) -> str:
        for threshold, rec in RECOMMENDATIONS:
            if score <= threshold:
                return rec
        return "CRITICAL_SOS"

    # ─────────────────────────────────────────────
    # Demo Scenarios
    # ─────────────────────────────────────────────

    def _get_demo_scenario(self, scenario: str) -> Dict[str, Any]:
        sc = scenario.lower()

        presets = {
            "safe": {
                "final_risk_score": 12,
                "final_risk_level": "LOW",
                "recommendation": "SAFE",
                "component_scores": {"voice_risk_score": 15, "movement_risk_score": 8, "gps_context_score": 10},
                "risk_breakdown": {"voice_contribution": 7.5, "movement_contribution": 2.4, "gps_contribution": 2.0, "weights_used": self.DEFAULT_WEIGHTS},
                "details": {"scenario": "All Clear (Demo)", "demo_mode": True, "model_name": self.model_name},
            },
            "low_risk": {
                "final_risk_score": 35,
                "final_risk_level": "MEDIUM",
                "recommendation": "MONITOR",
                "component_scores": {"voice_risk_score": 30, "movement_risk_score": 40, "gps_context_score": 35},
                "risk_breakdown": {"voice_contribution": 15.0, "movement_contribution": 12.0, "gps_contribution": 7.0, "weights_used": self.DEFAULT_WEIGHTS},
                "details": {"scenario": "Low Risk Monitoring (Demo)", "demo_mode": True, "model_name": self.model_name},
            },
            "voice_only": {
                "final_risk_score": 48,
                "final_risk_level": "MEDIUM",
                "recommendation": "MONITOR",
                "component_scores": {"voice_risk_score": 92, "movement_risk_score": 10, "gps_context_score": 10},
                "risk_breakdown": {"voice_contribution": 46.0, "movement_contribution": 3.0, "gps_contribution": 2.0, "weights_used": self.DEFAULT_WEIGHTS},
                "details": {"scenario": "Voice Distress Only (Demo)", "demo_mode": True, "model_name": self.model_name},
            },
            "movement_only": {
                "final_risk_score": 30,
                "final_risk_level": "LOW",
                "recommendation": "MONITOR",
                "component_scores": {"voice_risk_score": 10, "movement_risk_score": 85, "gps_context_score": 10},
                "risk_breakdown": {"voice_contribution": 5.0, "movement_contribution": 25.5, "gps_contribution": 2.0, "weights_used": self.DEFAULT_WEIGHTS},
                "details": {"scenario": "Movement Anomaly Only (Demo)", "demo_mode": True, "model_name": self.model_name},
            },
            "high_risk": {
                "final_risk_score": 68,
                "final_risk_level": "HIGH",
                "recommendation": "ALERT",
                "component_scores": {"voice_risk_score": 75, "movement_risk_score": 65, "gps_context_score": 55},
                "risk_breakdown": {"voice_contribution": 37.5, "movement_contribution": 19.5, "gps_contribution": 11.0, "weights_used": self.DEFAULT_WEIGHTS},
                "details": {"scenario": "High Risk Scenario (Demo)", "demo_mode": True, "model_name": self.model_name},
            },
            "critical_fusion": {
                "final_risk_score": 91,
                "final_risk_level": "CRITICAL",
                "recommendation": "CRITICAL_SOS",
                "component_scores": {"voice_risk_score": 98, "movement_risk_score": 92, "gps_context_score": 75},
                "risk_breakdown": {"voice_contribution": 49.0, "movement_contribution": 27.6, "gps_contribution": 15.0, "weights_used": self.DEFAULT_WEIGHTS},
                "details": {"scenario": "Critical Multi-Modal Emergency (Demo)", "demo_mode": True, "model_name": self.model_name},
            },
        }

        result = presets.get(sc, presets["safe"])
        return {"success": True, **result}
