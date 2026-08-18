from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from app.services.predictive_engine import PredictiveSafetyEngine

router = APIRouter(prefix="/api/v1/predictive", tags=["Predictive Safety Intelligence"])

class PredictiveEvaluateRequest(BaseModel):
    latitude: float = Field(..., description="Current latitude")
    longitude: float = Field(..., description="Current longitude")
    safe_zones: Optional[List[Dict[str, Any]]] = Field(default=[], description="List of safe zones")
    historical_incidents: Optional[List[Dict[str, Any]]] = Field(default=[], description="List of historical incidents")
    recent_movement_volatility: Optional[float] = Field(default=0.0, description="Movement volatility index 0.0 - 1.0")
    hour_override: Optional[int] = Field(default=None, description="Optional hour override for testing (0-23)")

@router.post("/evaluate")
async def evaluate_predictive_risk(payload: PredictiveEvaluateRequest):
    result = PredictiveSafetyEngine.evaluate_predictive_risk(
        latitude=payload.latitude,
        longitude=payload.longitude,
        safe_zones=payload.safe_zones or [],
        historical_incidents=payload.historical_incidents or [],
        recent_movement_volatility=payload.recent_movement_volatility or 0.0,
        hour_override=payload.hour_override
    )
    return {
        "status": "success",
        "data": result
    }

@router.get("/temporal-factor")
async def get_temporal_factor(hour: Optional[int] = None):
    factor = PredictiveSafetyEngine.calculate_temporal_risk(hour)
    return {
        "status": "success",
        "data": factor
    }
