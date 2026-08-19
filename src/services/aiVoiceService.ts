import api from "./api";

export interface VoiceAnalysisResult {
  success: boolean;
  distress_detected: boolean;
  distress_type: string;
  confidence: number;
  voice_risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  detected_keywords: string[];
  details?: Record<string, any>;
}

export const analyzeVoiceAudio = async (
  audioBlob?: Blob,
  scenario?: string,
  filename: string = "recording.wav",
  transcription?: string
): Promise<VoiceAnalysisResult> => {
  const formData = new FormData();

  if (scenario) {
    formData.append("scenario", scenario);
  }

  if (transcription) {
    formData.append("transcription", transcription);
  }

  if (audioBlob) {
    formData.append("file", audioBlob, filename);
  }

  const response = await api.post<VoiceAnalysisResult>("/ai/voice/analyze", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const getDemoScenarios = async () => {
  const response = await api.get("/ai/voice/scenarios");
  return response.data;
};
