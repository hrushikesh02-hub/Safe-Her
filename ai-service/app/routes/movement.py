import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from app.schemas.movement_schema import (
    MovementAnalysisRequest,
    MovementAnalysisResponse,
    GPSContextRequest,
    GPSContextResponse,
)
from app.services.movement_analyzer import MovementAnalyzer
from app.services.gps_context_analyzer import GPSContextAnalyzer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/movement", tags=["Movement & GPS Intelligence"])

movement_analyzer = MovementAnalyzer()
gps_context_analyzer = GPSContextAnalyzer()


@router.post("/analyze", response_model=MovementAnalysisResponse)
async def analyze_movement(req: MovementAnalysisRequest):
    """
    POST /api/movement/analyze
    Analyzes accelerometer + GPS movement data for safety anomalies.

    Detects: sudden_stop | abnormal_speed | route_deviation | stationary_long | panic_movement
    Returns: movement_risk_score (0-100), risk_level, anomaly_type
    """
    try:
        if req.scenario:
            logger.info(f"Movement demo scenario: {req.scenario}")
            result = movement_analyzer.analyze(
                acceleration_samples=[],
                scenario=req.scenario,
            )
            return MovementAnalysisResponse(**result)

        # Convert pydantic samples to plain dicts
        samples = [
            {"x": s.x, "y": s.y, "z": s.z, "timestamp": s.timestamp}
            for s in (req.acceleration_samples or [])
        ]

        result = movement_analyzer.analyze(
            acceleration_samples=samples,
            speed_kmh=req.speed_kmh or 0.0,
            heading_deg=req.heading_deg,
            elapsed_sec=req.elapsed_sec or 5.0,
            previous_speed_kmh=req.previous_speed_kmh,
            expected_heading_deg=req.expected_heading_deg,
            stationary_duration_sec=req.stationary_duration_sec or 0.0,
        )

        return MovementAnalysisResponse(**result)

    except Exception as e:
        logger.error(f"Movement analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Movement analysis error: {str(e)}")


@router.post("/gps-context", response_model=GPSContextResponse)
async def analyze_gps_context(req: GPSContextRequest):
    """
    POST /api/movement/gps-context
    Analyzes GPS position context for risk factors:
    safe zone proximity, time of day, isolation, speed.
    """
    try:
        safe_zones = [
            sz.model_dump() if hasattr(sz, "model_dump") else sz.dict()
            for sz in (req.safe_zones or [])
        ]

        result = gps_context_analyzer.analyze(
            latitude=req.latitude,
            longitude=req.longitude,
            speed_kmh=req.speed_kmh or 0.0,
            hour_of_day=req.hour_of_day,
            safe_zones=safe_zones,
            stationary_duration_sec=req.stationary_duration_sec or 0.0,
        )

        return GPSContextResponse(**result)

    except Exception as e:
        logger.error(f"GPS context analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"GPS context error: {str(e)}")


@router.get("/scenarios")
async def get_movement_scenarios():
    """
    Returns demo scenarios for Movement AI presentation mode.
    """
    return {
        "success": True,
        "scenarios": [
            {"id": "normal_walk", "label": "Normal Walking", "expected_risk": "LOW (8)"},
            {"id": "sudden_stop", "label": "Sudden Stop Detected", "expected_risk": "CRITICAL (85)"},
            {"id": "abnormal_speed", "label": "Abnormal Speed", "expected_risk": "HIGH (70)"},
            {"id": "route_deviation", "label": "Route Deviation", "expected_risk": "HIGH (60)"},
            {"id": "stationary_long", "label": "Long Stationary Period", "expected_risk": "MEDIUM (55)"},
            {"id": "panic_movement", "label": "Panic / Erratic Movement", "expected_risk": "CRITICAL (92)"},
        ]
    }
