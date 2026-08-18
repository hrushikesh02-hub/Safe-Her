import axios from "axios";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

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
  fileBuffer?: Buffer,
  filename: string = "audio.wav",
  mimeType: string = "audio/wav",
  scenario?: string
): Promise<VoiceAnalysisResult> => {
  try {
    const formData = new FormData();

    if (scenario) {
      formData.append("scenario", scenario);
    }

    if (fileBuffer) {
      const blob = new Blob([fileBuffer as unknown as BlobPart], { type: mimeType });
      formData.append("file", blob, filename);
    }

    const response = await axios.post<VoiceAnalysisResult>(
      `${AI_SERVICE_URL}/api/voice/analyze`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 15000,
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("AI Voice Service call failed:", error?.message || error);

    // Fallback if AI service is offline or unreachable
    if (scenario) {
      return getDemoFallbackResponse(scenario);
    }

    return {
      success: false,
      distress_detected: false,
      distress_type: "error",
      confidence: 0,
      voice_risk_score: 0,
      risk_level: "LOW",
      detected_keywords: [],
      details: {
        error: error?.message || "AI Service unavailable",
        fallback: true,
      },
    };
  }
};

export const getDemoFallbackResponse = (scenario: string): VoiceAnalysisResult => {
  const sc = scenario ? scenario.toLowerCase() : "normal";
  if (sc === "scream") {
    return {
      success: true,
      distress_detected: true,
      distress_type: "scream",
      confidence: 0.94,
      voice_risk_score: 92,
      risk_level: "CRITICAL",
      detected_keywords: [],
      details: { scenario: "Scream (Fallback Demo)", demo_mode: true },
    };
  } else if (sc === "help_keyword" || sc === "help") {
    return {
      success: true,
      distress_detected: true,
      distress_type: "distress",
      confidence: 0.88,
      voice_risk_score: 80,
      risk_level: "CRITICAL",
      detected_keywords: ["help", "save me"],
      details: { scenario: "Help Keyword (Fallback Demo)", demo_mode: true },
    };
  } else if (sc === "shouting") {
    return {
      success: true,
      distress_detected: true,
      distress_type: "shouting",
      confidence: 0.83,
      voice_risk_score: 65,
      risk_level: "HIGH",
      detected_keywords: [],
      details: { scenario: "Shouting (Fallback Demo)", demo_mode: true },
    };
  } else if (sc === "critical") {
    return {
      success: true,
      distress_detected: true,
      distress_type: "scream",
      confidence: 0.97,
      voice_risk_score: 98,
      risk_level: "CRITICAL",
      detected_keywords: ["bachao", "help me"],
      details: { scenario: "Critical Panic (Fallback Demo)", demo_mode: true },
    };
  } else {
    return {
      success: true,
      distress_detected: false,
      distress_type: "normal",
      confidence: 0.96,
      voice_risk_score: 15,
      risk_level: "LOW",
      detected_keywords: [],
      details: { scenario: "Normal (Fallback Demo)", demo_mode: true },
    };
  }
};
