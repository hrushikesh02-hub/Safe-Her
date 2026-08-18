import logging
from fastapi import APIRouter, HTTPException
from app.schemas.movement_schema import FusionAnalysisRequest, FusionAnalysisResponse
from app.services.fusion_engine import FusionEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/fusion", tags=["Multi-Modal Risk Fusion"])

fusion_engine = FusionEngine()


@router.post("/analyze", response_model=FusionAnalysisResponse)
async def analyze_fusion(req: FusionAnalysisRequest):
    """
    POST /api/fusion/analyze
    Combines voice_risk_score + movement_risk_score + gps_context_score
    using configurable weights to produce a single FINAL RISK SCORE.

    Default weights: voice=0.5, movement=0.3, gps=0.2

    Returns:
      final_risk_score (0-100), final_risk_level, recommendation
      (SAFE | MONITOR | ALERT | CRITICAL_SOS)
    """
    try:
        if req.scenario:
            logger.info(f"Fusion demo scenario: {req.scenario}")
            result = fusion_engine.fuse(scenario=req.scenario)
            return FusionAnalysisResponse(**result)

        weights_dict = None
        if req.weights:
            weights_dict = {
                "voice": req.weights.voice,
                "movement": req.weights.movement,
                "gps": req.weights.gps,
            }

        result = fusion_engine.fuse(
            voice_risk_score=req.voice_risk_score or 0,
            movement_risk_score=req.movement_risk_score or 0,
            gps_context_score=req.gps_context_score or 0,
            weights=weights_dict,
        )

        return FusionAnalysisResponse(**result)

    except Exception as e:
        logger.error(f"Fusion analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Fusion analysis error: {str(e)}")


@router.get("/scenarios")
async def get_fusion_scenarios():
    """
    Returns demo scenarios for Multi-Modal Fusion presentation mode.
    """
    return {
        "success": True,
        "scenarios": [
            {"id": "safe", "label": "All Clear — No Risk", "expected": "SAFE (12)"},
            {"id": "low_risk", "label": "Low Risk — Monitoring", "expected": "MONITOR (35)"},
            {"id": "voice_only", "label": "Voice Distress Only", "expected": "MONITOR (48)"},
            {"id": "movement_only", "label": "Movement Anomaly Only", "expected": "MONITOR (30)"},
            {"id": "high_risk", "label": "High Multi-Modal Risk", "expected": "ALERT (68)"},
            {"id": "critical_fusion", "label": "Critical Emergency — All Channels", "expected": "CRITICAL_SOS (91)"},
        ]
    }
