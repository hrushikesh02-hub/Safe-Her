import axios from "axios";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

export interface FusionAnalysisResult {
  success: boolean;
  final_risk_score: number;
  final_risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendation: "SAFE" | "MONITOR" | "ALERT" | "CRITICAL_SOS";
  component_scores: {
    voice_risk_score: number;
    movement_risk_score: number;
    gps_context_score: number;
  };
  risk_breakdown: {
    voice_contribution: number;
    movement_contribution: number;
    gps_contribution: number;
    weights_used: { voice: number; movement: number; gps: number };
  };
  details?: Record<string, any>;
}

export interface FusionPayload {
  voice_risk_score?: number;
  movement_risk_score?: number;
  gps_context_score?: number;
  weights?: { voice: number; movement: number; gps: number };
  scenario?: string;
}

/**
 * Calls FastAPI /api/fusion/analyze.
 * Falls back to demo result if AI service is offline.
 */
export async function analyzeFusion(
  payload: FusionPayload
): Promise<FusionAnalysisResult> {
  try {
    const response = await axios.post<FusionAnalysisResult>(
      `${AI_SERVICE_URL}/api/fusion/analyze`,
      payload,
      { timeout: 10000 }
    );
    return response.data;
  } catch (error: any) {
    console.warn(
      "⚠ Fusion AI Service offline — using demo fallback:",
      error?.message
    );
    return getDemoFusionFallback(payload);
  }
}

function getDemoFusionFallback(payload: FusionPayload): FusionAnalysisResult {
  if (payload.scenario) {
    const scenarioScores: Record<string, FusionAnalysisResult> = {
      safe: {
        success: true, final_risk_score: 12, final_risk_level: "LOW",
        recommendation: "SAFE",
        component_scores: { voice_risk_score: 15, movement_risk_score: 8, gps_context_score: 10 },
        risk_breakdown: { voice_contribution: 7.5, movement_contribution: 2.4, gps_contribution: 2.0, weights_used: { voice: 0.5, movement: 0.3, gps: 0.2 } },
        details: { demo_mode: true },
      },
      critical_fusion: {
        success: true, final_risk_score: 91, final_risk_level: "CRITICAL",
        recommendation: "CRITICAL_SOS",
        component_scores: { voice_risk_score: 98, movement_risk_score: 92, gps_context_score: 75 },
        risk_breakdown: { voice_contribution: 49.0, movement_contribution: 27.6, gps_contribution: 15.0, weights_used: { voice: 0.5, movement: 0.3, gps: 0.2 } },
        details: { demo_mode: true },
      },
      high_risk: {
        success: true, final_risk_score: 68, final_risk_level: "HIGH",
        recommendation: "ALERT",
        component_scores: { voice_risk_score: 75, movement_risk_score: 65, gps_context_score: 55 },
        risk_breakdown: { voice_contribution: 37.5, movement_contribution: 19.5, gps_contribution: 11.0, weights_used: { voice: 0.5, movement: 0.3, gps: 0.2 } },
        details: { demo_mode: true },
      },
    };
    if (scenarioScores[payload.scenario]) return scenarioScores[payload.scenario];
  }

  // Compute a simple fallback
  const v = payload.voice_risk_score ?? 0;
  const m = payload.movement_risk_score ?? 0;
  const g = payload.gps_context_score ?? 0;
  const score = Math.round(v * 0.5 + m * 0.3 + g * 0.2);

  return {
    success: true,
    final_risk_score: score,
    final_risk_level: score <= 30 ? "LOW" : score <= 50 ? "MEDIUM" : score <= 75 ? "HIGH" : "CRITICAL",
    recommendation: score <= 30 ? "SAFE" : score <= 50 ? "MONITOR" : score <= 75 ? "ALERT" : "CRITICAL_SOS",
    component_scores: { voice_risk_score: v, movement_risk_score: m, gps_context_score: g },
    risk_breakdown: {
      voice_contribution: v * 0.5,
      movement_contribution: m * 0.3,
      gps_contribution: g * 0.2,
      weights_used: { voice: 0.5, movement: 0.3, gps: 0.2 },
    },
    details: { demo_mode: true, reason: "AI service offline — client-side computation" },
  };
}
