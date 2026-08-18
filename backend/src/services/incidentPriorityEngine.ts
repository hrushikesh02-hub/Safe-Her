import axios from "axios";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

export interface PriorityClassificationInput {
  finalRiskScore?: number;
  riskLevel?: string;
  source?: string;
  distressType?: string;
  detectedKeywords?: string[];
  movementAnomaly?: string;
  routeDeviated?: boolean;
}

export interface PriorityClassificationResult {
  priority: "P1" | "P2" | "P3" | "P4";
  priority_label: string;
  priority_score: number;
  reasons: string[];
  max_responders: number;
  recommended_timeout_seconds: number;
}

export class IncidentPriorityEngine {
  static async classify(input: PriorityClassificationInput): Promise<PriorityClassificationResult> {
    try {
      const response = await axios.post(
        `${AI_SERVICE_URL}/api/v1/response/classify-priority`,
        {
          final_risk_score: input.finalRiskScore ?? 50,
          risk_level: input.riskLevel ?? "MEDIUM",
          source: input.source ?? "MANUAL_SOS",
          distress_type: input.distressType ?? "unknown",
          detected_keywords: input.detectedKeywords ?? [],
          movement_anomaly: input.movementAnomaly,
          route_deviated: input.routeDeviated ?? false,
        },
        { timeout: 3000 }
      );
      return response.data.data;
    } catch (err: any) {
      console.warn("[IncidentPriorityEngine] Fallback to local heuristic:", err?.message);
      return this.localFallback(input);
    }
  }

  private static localFallback(input: PriorityClassificationInput): PriorityClassificationResult {
    const reasons: string[] = [];
    let priorityScore = Math.min(100, Math.max(0, input.finalRiskScore ?? 50));

    if (input.source === "AI_VOICE" || input.source === "AI_FUSION") {
      reasons.push(`AI automated distress trigger (${input.source})`);
      if (input.distressType && ["screaming", "distress_speech"].includes(input.distressType.toLowerCase())) {
        reasons.push("Acoustic scream / acute distress voice signature detected");
        priorityScore = Math.max(priorityScore, 88);
      }
    }

    if (input.detectedKeywords && input.detectedKeywords.length > 0) {
      reasons.push(`Emergency verbal keywords detected: ${input.detectedKeywords.join(", ")}`);
      priorityScore = Math.max(priorityScore, 80);
    }

    if (input.movementAnomaly && input.movementAnomaly !== "normal") {
      reasons.push(`Abnormal movement dynamic: ${input.movementAnomaly}`);
      priorityScore = Math.max(priorityScore, 70);
    }

    if (input.routeDeviated) {
      reasons.push("Unplanned trajectory deviation into high-risk corridor");
    }

    let priority: "P1" | "P2" | "P3" | "P4" = "P2";
    let priorityLabel = "HIGH";
    let maxResponders = 1;
    let timeoutSec = 45;

    if (input.riskLevel === "CRITICAL" || priorityScore >= 75) {
      priority = "P1";
      priorityLabel = "CRITICAL";
      maxResponders = 2;
      timeoutSec = 30;
    } else if (input.riskLevel === "HIGH" || priorityScore >= 50) {
      priority = "P2";
      priorityLabel = "HIGH";
      maxResponders = 1;
      timeoutSec = 45;
    } else if (priorityScore >= 25) {
      priority = "P3";
      priorityLabel = "MEDIUM";
      maxResponders = 1;
      timeoutSec = 60;
    } else {
      priority = "P4";
      priorityLabel = "LOW";
      maxResponders = 1;
      timeoutSec = 90;
    }

    if (reasons.length === 0) {
      reasons.push(`Emergency dispatch initiated via ${input.source || "MANUAL_SOS"}`);
    }

    return {
      priority,
      priority_label: priorityLabel,
      priority_score: Math.round(priorityScore),
      reasons,
      max_responders: maxResponders,
      recommended_timeout_seconds: timeoutSec,
    };
  }
}
