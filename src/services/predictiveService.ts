import api from "./api";

export interface PredictiveEvaluationParams {
  latitude: number;
  longitude: number;
  recentMovementVolatility?: number;
  hourOverride?: number;
}

export const evaluatePredictiveSafety = (data: PredictiveEvaluationParams) => {
  return api.post("/predictive/evaluate", data);
};

export const getUserSafetyTrends = () => {
  return api.get("/predictive/trends");
};

export const getAdminPredictiveInsights = () => {
  return api.get("/predictive/admin-insights");
};
