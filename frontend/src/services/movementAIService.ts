import api from "./api";

export interface MovementAnalysisResult {
  success: boolean;
  movement_risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  anomaly_detected: boolean;
  anomaly_type: string;
  details?: Record<string, any>;
}

export interface GPSContextResult {
  success: boolean;
  gps_context_score: number;
  risk_level: string;
  is_in_safe_zone: boolean;
  nearest_safe_zone_m?: number;
  is_isolated: boolean;
  is_late_night: boolean;
  details?: Record<string, any>;
}

export interface MovementSosPayload {
  latitude: number;
  longitude: number;
  movementRiskScore?: number;
  movementAnomalyType?: string;
  gpsContextScore?: number;
  riskLevel?: string;
  routeDeviated?: boolean;
  suddenStop?: boolean;
  stationaryAlert?: boolean;
}

/**
 * Analyze movement + GPS data via Node backend → FastAPI.
 */
export const analyzeMovement = async (payload: {
  acceleration_samples?: Array<{ x: number; y: number; z: number; timestamp?: number }>;
  speed_kmh?: number;
  heading_deg?: number;
  elapsed_sec?: number;
  previous_speed_kmh?: number;
  stationary_duration_sec?: number;
  latitude?: number;
  longitude?: number;
  scenario?: string;
}): Promise<{ movement: MovementAnalysisResult; gps_context: GPSContextResult | null }> => {
  const res = await api.post("/ai/movement/analyze", payload);
  return res.data;
};

/**
 * Trigger an AI_MOVEMENT SOS incident.
 */
export const triggerMovementSOS = async (payload: MovementSosPayload) => {
  const res = await api.post("/ai/movement/trigger-sos", payload);
  return res.data;
};
