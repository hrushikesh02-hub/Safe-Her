import api from "./api";

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

export interface FusionSosPayload {
  latitude: number;
  longitude: number;
  finalRiskScore?: number;
  finalRiskLevel?: string;
  riskScore?: number;
  movementRiskScore?: number;
  gpsContextScore?: number;
  distressType?: string;
  movementAnomalyType?: string;
  fusionSource?: string;
  detectedKeywords?: string[];
}

export const analyzeFusion = async (payload: {
  voice_risk_score?: number;
  movement_risk_score?: number;
  gps_context_score?: number;
  weights?: { voice: number; movement: number; gps: number };
  scenario?: string;
}): Promise<{ success: boolean; data: FusionAnalysisResult; should_trigger_sos: boolean; auto_sos_threshold: number }> => {
  const res = await api.post("/ai/fusion/analyze", payload);
  return res.data;
};

export const triggerFusionSOS = async (payload: FusionSosPayload) => {
  const res = await api.post("/ai/fusion/trigger-sos", payload);
  return res.data;
};
