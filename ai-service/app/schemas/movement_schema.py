from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


# ─────────────────────────────────────────────
# Movement Analysis
# ─────────────────────────────────────────────

class AccelerationSample(BaseModel):
    x: float = Field(default=0.0, description="X-axis acceleration (m/s²)")
    y: float = Field(default=0.0, description="Y-axis acceleration (m/s²)")
    z: float = Field(default=9.8, description="Z-axis acceleration (m/s²)")
    timestamp: Optional[float] = Field(default=None, description="Unix timestamp ms")


class MovementAnalysisRequest(BaseModel):
    acceleration_samples: Optional[List[AccelerationSample]] = Field(
        default_factory=list,
        description="List of accelerometer readings from the device"
    )
    speed_kmh: Optional[float] = Field(
        default=0.0, ge=0.0, description="Current GPS speed in km/h"
    )
    heading_deg: Optional[float] = Field(
        default=None, description="Current compass heading in degrees (0-360)"
    )
    elapsed_sec: Optional[float] = Field(
        default=5.0, description="Monitoring window in seconds"
    )
    previous_speed_kmh: Optional[float] = Field(
        default=None, description="Speed from previous window (for deceleration detection)"
    )
    expected_heading_deg: Optional[float] = Field(
        default=None, description="Route heading if user set a planned route"
    )
    stationary_duration_sec: Optional[float] = Field(
        default=0.0, description="Total time user has been stationary"
    )
    scenario: Optional[str] = Field(
        default=None,
        description="Demo scenario override: normal_walk | sudden_stop | abnormal_speed | route_deviation | stationary_long | panic_movement"
    )


class MovementAnalysisResponse(BaseModel):
    success: bool = True
    movement_risk_score: int = Field(ge=0, le=100)
    risk_level: str = Field(description="LOW, MEDIUM, HIGH, CRITICAL")
    anomaly_detected: bool
    anomaly_type: str = Field(description="normal | sudden_stop | abnormal_speed | route_deviation | stationary_long | panic_movement")
    details: Optional[Dict[str, Any]] = None


# ─────────────────────────────────────────────
# GPS Context Analysis (embedded in movement request)
# ─────────────────────────────────────────────

class SafeZoneInfo(BaseModel):
    latitude: float
    longitude: float
    name: Optional[str] = ""
    radius_m: Optional[float] = 500.0


class GPSContextRequest(BaseModel):
    latitude: float
    longitude: float
    speed_kmh: Optional[float] = 0.0
    hour_of_day: Optional[int] = Field(default=None, ge=0, le=23)
    safe_zones: Optional[List[SafeZoneInfo]] = Field(default_factory=list)
    stationary_duration_sec: Optional[float] = 0.0


class GPSContextResponse(BaseModel):
    success: bool = True
    gps_context_score: int = Field(ge=0, le=100)
    risk_level: str
    is_in_safe_zone: bool
    nearest_safe_zone_m: Optional[float] = None
    is_isolated: bool
    is_late_night: bool
    details: Optional[Dict[str, Any]] = None


# ─────────────────────────────────────────────
# Multi-Modal Fusion
# ─────────────────────────────────────────────

class FusionWeights(BaseModel):
    voice: float = Field(default=0.5, ge=0.0, le=1.0)
    movement: float = Field(default=0.3, ge=0.0, le=1.0)
    gps: float = Field(default=0.2, ge=0.0, le=1.0)


class FusionAnalysisRequest(BaseModel):
    voice_risk_score: Optional[int] = Field(default=0, ge=0, le=100)
    movement_risk_score: Optional[int] = Field(default=0, ge=0, le=100)
    gps_context_score: Optional[int] = Field(default=0, ge=0, le=100)
    weights: Optional[FusionWeights] = None
    scenario: Optional[str] = Field(
        default=None,
        description="Demo: safe | low_risk | voice_only | movement_only | high_risk | critical_fusion"
    )


class FusionAnalysisResponse(BaseModel):
    success: bool = True
    final_risk_score: int = Field(ge=0, le=100)
    final_risk_level: str = Field(description="LOW, MEDIUM, HIGH, CRITICAL")
    recommendation: str = Field(description="SAFE | MONITOR | ALERT | CRITICAL_SOS")
    component_scores: Dict[str, Any]
    risk_breakdown: Dict[str, Any]
    details: Optional[Dict[str, Any]] = None
