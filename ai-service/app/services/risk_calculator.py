from typing import Dict, Any, List, Tuple

class VoiceRiskCalculator:
    def __init__(
        self,
        scream_weight: int = 50,
        shouting_weight: int = 30,
        keyword_weight: int = 30,
        high_confidence_weight: int = 20,
    ):
        self.scream_weight = scream_weight
        self.shouting_weight = shouting_weight
        self.keyword_weight = keyword_weight
        self.high_confidence_weight = high_confidence_weight

    def calculate(
        self,
        distress_type: str,
        confidence: float,
        detected_keywords: List[str],
        audio_features: Dict[str, Any],
    ) -> Tuple[int, str]:
        """
        Calculates voice_risk_score (0-100) and risk_level (LOW, MEDIUM, HIGH, CRITICAL).
        """
        score = 0

        dt_lower = distress_type.lower()
        if dt_lower == "scream":
            score += self.scream_weight
        elif dt_lower in ["shouting", "shout"]:
            score += self.shouting_weight
        elif dt_lower in ["distress", "help_keyword", "keyword", "panic"]:
            score += 40

        # Keywords presence add weight
        if detected_keywords:
            score += self.keyword_weight * len(detected_keywords)

        # High confidence add-on
        if confidence >= 0.8:
            score += self.high_confidence_weight
        elif confidence >= 0.6:
            score += 10

        # Feature checks (high energy / high centroid add-on)
        rms = audio_features.get("rms_energy", 0.0)
        centroid = audio_features.get("spectral_centroid_hz", 0.0)
        if rms > 0.35 and centroid > 3000:
            score += 15

        # Cap score between 0 and 100
        score = max(0, min(100, score))

        # Determine level
        if score <= 30:
            level = "LOW"
        elif score <= 50:
            level = "MEDIUM"
        elif score <= 75:
            level = "HIGH"
        else:
            level = "CRITICAL"

        return score, level
