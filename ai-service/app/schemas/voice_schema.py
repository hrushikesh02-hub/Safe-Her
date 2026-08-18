from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class VoiceAnalysisResponse(BaseModel):
    success: bool = True
    distress_detected: bool
    distress_type: str = Field(description="Types: normal, speech, scream, shouting, distress")
    confidence: float = Field(ge=0.0, le=1.0)
    voice_risk_score: int = Field(ge=0, le=100)
    risk_level: str = Field(description="LOW, MEDIUM, HIGH, CRITICAL")
    detected_keywords: List[str] = Field(default_factory=list)
    details: Optional[Dict[str, Any]] = None

class DemoScenarioRequest(BaseModel):
    scenario: str = Field(description="normal, scream, help_keyword, shouting, critical")
