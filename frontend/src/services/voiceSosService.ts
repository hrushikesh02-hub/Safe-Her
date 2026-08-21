import api from "./api";

export interface TriggerSosPayload {
  latitude: number;
  longitude: number;
  riskLevel?: string;
  riskScore?: number;
  distressType?: string;
  confidence?: number;
  detectedKeywords?: string[];
}

export interface TriggerSosResponse {
  success: boolean;
  message: string;
  isDuplicate: boolean;
  data: {
    _id: string;
    user: string;
    latitude: number;
    longitude: number;
    status: "active" | "accepted" | "resolved";
    source: "AI_VOICE" | "MANUAL_SOS";
    riskLevel?: string;
    riskScore?: number;
    distressType?: string;
    confidence?: number;
    detectedKeywords?: string[];
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Trigger an automatic AI Voice SOS.
 * Returns existing active incident if one was created within the last 5 minutes
 * (duplicate protection enforced server-side).
 */
export const triggerVoiceSOS = async (
  payload: TriggerSosPayload
): Promise<TriggerSosResponse> => {
  const response = await api.post<TriggerSosResponse>(
    "/ai/voice/trigger-sos",
    payload
  );
  return response.data;
};

/**
 * Update the volunteer's current GPS location so they can be found
 * during nearby volunteer search when an SOS is triggered.
 */
export const updateVolunteerLocation = async (
  latitude: number,
  longitude: number
): Promise<void> => {
  await api.put("/volunteer/location", { latitude, longitude });
};
