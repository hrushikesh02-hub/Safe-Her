"""
Movement Analyzer Service
-------------------------
Analyzes device accelerometer + GPS data to detect:
- Sudden stops (deceleration jerk)
- Abnormal speed (too fast / too slow for context)
- Route deviation (heading mismatch)
- Long stationary periods
- Panic/erratic movement (high jerk variance)
"""
import logging
import math
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)


class MovementAnalyzer:
    """
    Prototype Movement Distress Analyzer.
    Uses accelerometer jerk analysis and GPS patterns to detect anomalies.
    Includes Demo Mode with preset scenario responses.
    """

    # Thresholds
    JERK_SUDDEN_STOP_THRESHOLD = 15.0   # m/s³ — sudden deceleration
    JERK_PANIC_THRESHOLD = 20.0         # m/s³ — erratic motion
    SPEED_HIGH_THRESHOLD = 120.0        # km/h — abnormally fast (vehicle emergency)
    SPEED_WALK_MAX = 7.0                # km/h — typical walk max
    HEADING_DEVIATION_THRESHOLD = 45.0  # degrees — significant route deviation
    STATIONARY_ALERT_SEC = 600.0        # 10 min stationary = risk

    def __init__(self, demo_mode: bool = True):
        self.demo_mode = demo_mode
        self.model_name = "SafeHer Movement Anomaly Detector v1"

    def analyze(
        self,
        acceleration_samples: List[Dict[str, Any]],
        speed_kmh: float = 0.0,
        heading_deg: Optional[float] = None,
        elapsed_sec: float = 5.0,
        previous_speed_kmh: Optional[float] = None,
        expected_heading_deg: Optional[float] = None,
        stationary_duration_sec: float = 0.0,
        scenario: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Main entry point. Returns movement risk score and anomaly type.
        """
        if scenario:
            return self._get_demo_scenario(scenario)

        # Compute jerk (rate of acceleration change)
        jerk_magnitude = self._compute_jerk(acceleration_samples, elapsed_sec)

        # Detect anomaly type
        anomaly_type, anomaly_detected = self._classify_movement(
            jerk_magnitude=jerk_magnitude,
            speed_kmh=speed_kmh,
            previous_speed_kmh=previous_speed_kmh,
            heading_deg=heading_deg,
            expected_heading_deg=expected_heading_deg,
            stationary_duration_sec=stationary_duration_sec,
        )

        # Compute risk score
        risk_score, risk_level = self._compute_risk_score(
            anomaly_type=anomaly_type,
            jerk_magnitude=jerk_magnitude,
            speed_kmh=speed_kmh,
            stationary_duration_sec=stationary_duration_sec,
        )

        return {
            "success": True,
            "movement_risk_score": risk_score,
            "risk_level": risk_level,
            "anomaly_detected": anomaly_detected,
            "anomaly_type": anomaly_type,
            "details": {
                "jerk_magnitude": round(jerk_magnitude, 3),
                "speed_kmh": speed_kmh,
                "stationary_duration_sec": stationary_duration_sec,
                "heading_deviation_deg": self._heading_deviation(heading_deg, expected_heading_deg),
                "sample_count": len(acceleration_samples),
                "elapsed_sec": elapsed_sec,
                "model_name": self.model_name,
                "demo_mode": False,
            }
        }

    # ─────────────────────────────────────────────
    # Internal Analysis Methods
    # ─────────────────────────────────────────────

    def _compute_jerk(self, samples: List[Dict[str, Any]], elapsed_sec: float) -> float:
        """
        Jerk = rate of change of acceleration (m/s³).
        Computed as the standard deviation of acceleration magnitude changes.
        """
        if len(samples) < 2:
            return 0.0

        magnitudes = [
            math.sqrt(s.get("x", 0)**2 + s.get("y", 0)**2 + s.get("z", 0)**2)
            for s in samples
        ]

        # Compute differences (first derivative of magnitude)
        diffs = [abs(magnitudes[i+1] - magnitudes[i]) for i in range(len(magnitudes)-1)]

        if not diffs:
            return 0.0

        # Jerk = mean rate of acceleration change over time window
        mean_diff = sum(diffs) / len(diffs)
        return mean_diff / max(elapsed_sec / len(diffs), 0.001)

    def _heading_deviation(
        self,
        current: Optional[float],
        expected: Optional[float]
    ) -> Optional[float]:
        if current is None or expected is None:
            return None
        diff = abs(current - expected) % 360
        return min(diff, 360 - diff)

    def _classify_movement(
        self,
        jerk_magnitude: float,
        speed_kmh: float,
        previous_speed_kmh: Optional[float],
        heading_deg: Optional[float],
        expected_heading_deg: Optional[float],
        stationary_duration_sec: float,
    ) -> Tuple[str, bool]:
        """
        Returns (anomaly_type, anomaly_detected).
        Priority order: panic > sudden_stop > abnormal_speed > route_deviation > stationary_long > normal
        """
        # Panic movement (high erratic jerk)
        if jerk_magnitude >= self.JERK_PANIC_THRESHOLD:
            return "panic_movement", True

        # Sudden stop (high jerk + speed dropped dramatically)
        if (
            jerk_magnitude >= self.JERK_SUDDEN_STOP_THRESHOLD and
            previous_speed_kmh is not None and
            previous_speed_kmh > 15.0 and
            speed_kmh < 5.0
        ):
            return "sudden_stop", True

        # Abnormal speed
        if speed_kmh > self.SPEED_HIGH_THRESHOLD:
            return "abnormal_speed", True

        # Route deviation
        deviation = self._heading_deviation(heading_deg, expected_heading_deg)
        if deviation is not None and deviation > self.HEADING_DEVIATION_THRESHOLD:
            return "route_deviation", True

        # Long stationary
        if stationary_duration_sec >= self.STATIONARY_ALERT_SEC:
            return "stationary_long", True

        return "normal", False

    def _compute_risk_score(
        self,
        anomaly_type: str,
        jerk_magnitude: float,
        speed_kmh: float,
        stationary_duration_sec: float,
    ) -> Tuple[int, str]:
        """
        Returns (risk_score 0-100, risk_level).
        """
        base_scores = {
            "panic_movement": 85,
            "sudden_stop": 80,
            "abnormal_speed": 65,
            "route_deviation": 55,
            "stationary_long": 50,
            "normal": 10,
        }

        score = base_scores.get(anomaly_type, 10)

        # Modifier: high jerk boosts score
        if jerk_magnitude > 25.0:
            score = min(100, score + 10)
        elif jerk_magnitude > 18.0:
            score = min(100, score + 5)

        # Modifier: very long stationary
        if anomaly_type == "stationary_long" and stationary_duration_sec > 1800:
            score = min(100, score + 15)

        # Modifier: extreme speed
        if speed_kmh > 150:
            score = min(100, score + 10)

        score = max(0, min(100, score))

        if score <= 30:
            level = "LOW"
        elif score <= 50:
            level = "MEDIUM"
        elif score <= 75:
            level = "HIGH"
        else:
            level = "CRITICAL"

        return score, level

    # ─────────────────────────────────────────────
    # Demo Scenarios
    # ─────────────────────────────────────────────

    def _get_demo_scenario(self, scenario: str) -> Dict[str, Any]:
        sc = scenario.lower()
        scenarios = {
            "normal_walk": {
                "movement_risk_score": 8,
                "risk_level": "LOW",
                "anomaly_detected": False,
                "anomaly_type": "normal",
                "details": {
                    "scenario": "Normal Walking (Demo)",
                    "jerk_magnitude": 1.2,
                    "speed_kmh": 4.5,
                    "model_name": self.model_name,
                    "demo_mode": True,
                }
            },
            "sudden_stop": {
                "movement_risk_score": 85,
                "risk_level": "CRITICAL",
                "anomaly_detected": True,
                "anomaly_type": "sudden_stop",
                "details": {
                    "scenario": "Sudden Stop Detected (Demo)",
                    "jerk_magnitude": 22.4,
                    "speed_kmh": 0.0,
                    "previous_speed_kmh": 45.0,
                    "model_name": self.model_name,
                    "demo_mode": True,
                }
            },
            "abnormal_speed": {
                "movement_risk_score": 70,
                "risk_level": "HIGH",
                "anomaly_detected": True,
                "anomaly_type": "abnormal_speed",
                "details": {
                    "scenario": "Abnormal Speed (Demo)",
                    "jerk_magnitude": 3.1,
                    "speed_kmh": 145.0,
                    "model_name": self.model_name,
                    "demo_mode": True,
                }
            },
            "route_deviation": {
                "movement_risk_score": 60,
                "risk_level": "HIGH",
                "anomaly_detected": True,
                "anomaly_type": "route_deviation",
                "details": {
                    "scenario": "Route Deviation (Demo)",
                    "jerk_magnitude": 2.8,
                    "heading_deviation_deg": 78.0,
                    "model_name": self.model_name,
                    "demo_mode": True,
                }
            },
            "stationary_long": {
                "movement_risk_score": 55,
                "risk_level": "MEDIUM",
                "anomaly_detected": True,
                "anomaly_type": "stationary_long",
                "details": {
                    "scenario": "Long Stationary Period (Demo)",
                    "jerk_magnitude": 0.3,
                    "stationary_duration_sec": 780.0,
                    "model_name": self.model_name,
                    "demo_mode": True,
                }
            },
            "panic_movement": {
                "movement_risk_score": 92,
                "risk_level": "CRITICAL",
                "anomaly_detected": True,
                "anomaly_type": "panic_movement",
                "details": {
                    "scenario": "Panic/Erratic Movement (Demo)",
                    "jerk_magnitude": 28.7,
                    "speed_kmh": 12.3,
                    "model_name": self.model_name,
                    "demo_mode": True,
                }
            },
        }

        result = scenarios.get(sc, scenarios["normal_walk"])
        return {"success": True, **result}
