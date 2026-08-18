import axios from "axios";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

export interface MovementAnalysisResult {
  success: boolean;
  movement_risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  anomaly_detected: boolean;
  anomaly_type: string;
  details?: Record<string, any>;
}

export interface MovementAnalysisPayload {
  acceleration_samples?: Array<{ x: number; y: number; z: number; timestamp?: number }>;
  speed_kmh?: number;
  heading_deg?: number;
  elapsed_sec?: number;
  previous_speed_kmh?: number;
  expected_heading_deg?: number;
  stationary_duration_sec?: number;
  scenario?: string;
}

/**
 * Calls the FastAPI movement analysis endpoint.
 * Falls back to demo scenario if AI service is offline.
 */
export async function analyzeMovement(
  payload: MovementAnalysisPayload
): Promise<MovementAnalysisResult> {
  try {
    const response = await axios.post<MovementAnalysisResult>(
      `${AI_SERVICE_URL}/api/movement/analyze`,
      payload,
      { timeout: 10000 }
    );
    return response.data;
  } catch (error: any) {
    console.warn(
      "⚠ Movement AI Service offline — using demo fallback:",
      error?.message
    );
    return getDemoMovementFallback(payload.scenario);
  }
}

/**
 * Calls the FastAPI GPS context analysis endpoint.
 */
export async function analyzeGPSContext(payload: {
  latitude: number;
  longitude: number;
  speed_kmh?: number;
  hour_of_day?: number;
  safe_zones?: Array<{ latitude: number; longitude: number; radius_m?: number; name?: string }>;
  stationary_duration_sec?: number;
}): Promise<{
  success: boolean;
  gps_context_score: number;
  risk_level: string;
  is_in_safe_zone: boolean;
  nearest_safe_zone_m?: number;
  is_isolated: boolean;
  is_late_night: boolean;
  details?: Record<string, any>;
}> {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/movement/gps-context`,
      payload,
      { timeout: 10000 }
    );
    return response.data;
  } catch (error: any) {
    console.warn("⚠ GPS Context AI offline — using fallback:", error?.message);
    return {
      success: true,
      gps_context_score: 20,
      risk_level: "LOW",
      is_in_safe_zone: false,
      nearest_safe_zone_m: undefined,
      is_isolated: false,
      is_late_night: false,
      details: { demo_mode: true, reason: "AI service offline" },
    };
  }
}

/**
 * Demo fallback when AI service is offline.
 */
function getDemoMovementFallback(scenario?: string): MovementAnalysisResult {
  const fallbacks: Record<string, MovementAnalysisResult> = {
    normal_walk: {
      success: true,
      movement_risk_score: 8,
      risk_level: "LOW",
      anomaly_detected: false,
      anomaly_type: "normal",
      details: { demo_mode: true, scenario: "normal_walk" },
    },
    sudden_stop: {
      success: true,
      movement_risk_score: 85,
      risk_level: "CRITICAL",
      anomaly_detected: true,
      anomaly_type: "sudden_stop",
      details: { demo_mode: true, scenario: "sudden_stop" },
    },
    abnormal_speed: {
      success: true,
      movement_risk_score: 70,
      risk_level: "HIGH",
      anomaly_detected: true,
      anomaly_type: "abnormal_speed",
      details: { demo_mode: true, scenario: "abnormal_speed" },
    },
    route_deviation: {
      success: true,
      movement_risk_score: 60,
      risk_level: "HIGH",
      anomaly_detected: true,
      anomaly_type: "route_deviation",
      details: { demo_mode: true, scenario: "route_deviation" },
    },
    stationary_long: {
      success: true,
      movement_risk_score: 55,
      risk_level: "MEDIUM",
      anomaly_detected: true,
      anomaly_type: "stationary_long",
      details: { demo_mode: true, scenario: "stationary_long" },
    },
    panic_movement: {
      success: true,
      movement_risk_score: 92,
      risk_level: "CRITICAL",
      anomaly_detected: true,
      anomaly_type: "panic_movement",
      details: { demo_mode: true, scenario: "panic_movement" },
    },
  };

  return fallbacks[scenario || "normal_walk"] || fallbacks["normal_walk"];
}
