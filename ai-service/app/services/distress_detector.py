import os
import re
import logging
from typing import Dict, Any, List, Tuple
from app.services.risk_calculator import VoiceRiskCalculator

logger = logging.getLogger(__name__)

EMERGENCY_KEYWORDS = [
    "help",
    "save me",
    "please help",
    "help me",
    "bachao",
    "mujhe bachao",
    "sos",
    "danger",
    "stop",
    "don't touch me"
]

class DistressDetector:
    """
    Prototype Voice Distress Detection classifier.
    Combines spectral feature rules, keyword matching interface,
    and preset Demo Mode overrides.
    """
    def __init__(self, demo_mode: bool = True):
        self.demo_mode = demo_mode or (os.getenv("AI_DEMO_MODE", "true").lower() == "true")
        self.model_name = "Prototype Voice Distress Detection"
        self.risk_calculator = VoiceRiskCalculator()

    def detect(
        self,
        audio_features: Dict[str, Any],
        scenario_override: Optional[str] = None,
        transcription_text: str = ""
    ) -> Dict[str, Any]:
        """
        Runs distress analysis on extracted audio features or demo scenario.
        Returns full analysis output object.
        """
        # If scenario_override or Demo Mode active with specific request
        if scenario_override:
            return self._get_demo_scenario_result(scenario_override, audio_features)

        # Keyword detection
        detected_keywords = self._detect_keywords(transcription_text)

        # Feature-based rule classification
        distress_detected, distress_type, confidence = self._classify_from_features(audio_features)

        # Boost distress if emergency keywords detected
        if detected_keywords and not distress_detected:
            distress_detected = True
            distress_type = "distress"
            confidence = max(confidence, 0.75)

        # Compute risk score
        risk_score, risk_level = self.risk_calculator.calculate(
            distress_type=distress_type,
            confidence=confidence,
            detected_keywords=detected_keywords,
            audio_features=audio_features
        )

        return {
            "success": True,
            "distress_detected": distress_detected,
            "distress_type": distress_type,
            "confidence": round(confidence, 2),
            "voice_risk_score": risk_score,
            "risk_level": risk_level,
            "detected_keywords": detected_keywords,
            "details": {
                "rms_energy": audio_features.get("rms_energy", 0.0),
                "spectral_centroid_hz": audio_features.get("spectral_centroid_hz", 0.0),
                "zero_crossing_rate": audio_features.get("zero_crossing_rate", 0.0),
                "duration_sec": audio_features.get("duration_sec", 0.0),
                "demo_mode": False,
                "model_name": self.model_name
            }
        }

    def _classify_from_features(self, features: Dict[str, Any]) -> Tuple[bool, str, float]:
        """
        Acoustic heuristic classification for prototype:
        - High spectral centroid (>2800 Hz) + High RMS energy (>0.15) -> Scream
        - Medium-high centroid (>2000 Hz) + High ZCR (>0.08) -> Shouting
        - Moderate RMS energy (>0.05) -> Speech
        - Low energy -> Normal
        """
        rms = features.get("rms_energy", 0.0)
        centroid = features.get("spectral_centroid_hz", 0.0)
        zcr = features.get("zero_crossing_rate", 0.0)

        if centroid >= 2800 and rms >= 0.15:
            return True, "scream", 0.91
        elif centroid >= 2000 and (rms >= 0.12 or zcr >= 0.10):
            return True, "shouting", 0.82
        elif rms >= 0.20 and zcr >= 0.12:
            return True, "distress", 0.78
        elif rms >= 0.04:
            return False, "speech", 0.95
        else:
            return False, "normal", 0.98

    def _detect_keywords(self, text: str) -> List[str]:
        if not text:
            return []
        text_lower = text.lower()
        found = []
        for kw in EMERGENCY_KEYWORDS:
            if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
                found.append(kw)
        return found

    def _get_demo_scenario_result(self, scenario: str, audio_features: Dict[str, Any]) -> Dict[str, Any]:
        sc = scenario.lower()
        if sc == "scream":
            return {
                "success": True,
                "distress_detected": True,
                "distress_type": "scream",
                "confidence": 0.94,
                "voice_risk_score": 92,
                "risk_level": "CRITICAL",
                "detected_keywords": [],
                "details": {
                    "scenario": "Scream (Demo)",
                    "demo_mode": True,
                    "model_name": self.model_name
                }
            }
        elif sc in ["help_keyword", "keyword", "help"]:
            return {
                "success": True,
                "distress_detected": True,
                "distress_type": "distress",
                "confidence": 0.88,
                "voice_risk_score": 80,
                "risk_level": "CRITICAL",
                "detected_keywords": ["help", "save me"],
                "details": {
                    "scenario": "Help Keyword (Demo)",
                    "demo_mode": True,
                    "model_name": self.model_name
                }
            }
        elif sc == "shouting":
            return {
                "success": True,
                "distress_detected": True,
                "distress_type": "shouting",
                "confidence": 0.83,
                "voice_risk_score": 65,
                "risk_level": "HIGH",
                "detected_keywords": [],
                "details": {
                    "scenario": "Repeated Shouting (Demo)",
                    "demo_mode": True,
                    "model_name": self.model_name
                }
            }
        elif sc == "critical":
            return {
                "success": True,
                "distress_detected": True,
                "distress_type": "scream",
                "confidence": 0.97,
                "voice_risk_score": 98,
                "risk_level": "CRITICAL",
                "detected_keywords": ["bachao", "help me"],
                "details": {
                    "scenario": "Critical Distress (Demo)",
                    "demo_mode": True,
                    "model_name": self.model_name
                }
            }
        else:  # Normal
            return {
                "success": True,
                "distress_detected": False,
                "distress_type": "normal",
                "confidence": 0.96,
                "voice_risk_score": 15,
                "risk_level": "LOW",
                "detected_keywords": [],
                "details": {
                    "scenario": "Normal Speech (Demo)",
                    "demo_mode": True,
                    "model_name": self.model_name
                }
            }
