from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from app.services.priority_classifier import IncidentPriorityClassifier
from app.services.responder_ranker import VolunteerRankingEngine, haversine_km

router = APIRouter(prefix="/api/v1/response", tags=["Emergency Response Coordination"])

class ClassifyPriorityRequest(BaseModel):
    final_risk_score: Optional[float] = Field(default=0.0)
    risk_level: Optional[str] = Field(default="MEDIUM")
    source: Optional[str] = Field(default="MANUAL_SOS")
    distress_type: Optional[str] = Field(default="unknown")
    detected_keywords: Optional[List[str]] = Field(default=[])
    movement_anomaly: Optional[str] = Field(default=None)
    route_deviated: Optional[bool] = Field(default=False)

class RankRespondersRequest(BaseModel):
    incident_latitude: float
    incident_longitude: float
    volunteers: List[Dict[str, Any]]
    max_radius_km: Optional[float] = Field(default=5.0)

class EstimateEtaRequest(BaseModel):
    volunteer_lat: float
    volunteer_lng: float
    incident_lat: float
    incident_lng: float
    speed_kmh: Optional[float] = Field(default=25.0)

@router.post("/classify-priority")
async def classify_priority(payload: ClassifyPriorityRequest):
    result = IncidentPriorityClassifier.classify_priority(
        final_risk_score=payload.final_risk_score or 0.0,
        risk_level=payload.risk_level or "MEDIUM",
        source=payload.source or "MANUAL_SOS",
        distress_type=payload.distress_type or "unknown",
        detected_keywords=payload.detected_keywords or [],
        movement_anomaly=payload.movement_anomaly,
        route_deviated=payload.route_deviated or False,
    )
    return {
        "status": "success",
        "data": result,
    }

@router.post("/rank-responders")
async def rank_responders(payload: RankRespondersRequest):
    ranked = VolunteerRankingEngine.rank_candidates(
        incident_lat=payload.incident_latitude,
        incident_lng=payload.incident_longitude,
        volunteers=payload.volunteers,
        max_radius_km=payload.max_radius_km or 5.0,
    )
    return {
        "status": "success",
        "total_eligible": len(ranked),
        "data": ranked,
    }

@router.post("/estimate-eta")
async def estimate_eta(payload: EstimateEtaRequest):
    dist_km = haversine_km(
        payload.volunteer_lat,
        payload.volunteer_lng,
        payload.incident_lat,
        payload.incident_lng
    )
    speed = max(5.0, payload.speed_kmh or 25.0)
    eta_mins = round(max(1.0, (dist_km / speed) * 60.0 + 1.5), 1)

    return {
        "status": "success",
        "data": {
            "distanceKm": round(dist_km, 2),
            "estimatedEtaMinutes": eta_mins,
            "calculatedSpeedKmh": speed,
        }
    }
