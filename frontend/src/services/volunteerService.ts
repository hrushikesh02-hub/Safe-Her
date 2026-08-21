import api from "./api";

export interface VolunteerStats {
  totalAssignments: number;
  acceptedCount: number;
  rejectedCount: number;
  timedOutCount: number;
  resolvedCount: number;
  averageResponseTimeSec: number;
}

export interface Volunteer {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  profileImage: string | null;
  isVerified: boolean;
  verificationStatus?: "PENDING" | "APPROVED" | "REJECTED";
  isBlocked: boolean;
  volunteerStatus?: "AVAILABLE" | "BUSY" | "OFFLINE";
  volunteerStats?: VolunteerStats;
  lastKnownLatitude?: number;
  lastKnownLongitude?: number;
  createdAt: string;
  updatedAt: string;
}

export interface VolunteerProfileResponse {
  success: boolean;
  message: string;
  data: Volunteer;
}

export interface TimelineEvent {
  timestamp: string;
  event: string;
  description: string;
  actor?: string;
}

export interface AssignmentRecord {
  volunteerId: string | any;
  volunteerName?: string;
  volunteerEmail?: string;
  volunteerPhone?: string;
  distanceKm?: number;
  responseScore?: number;
  status: "NOTIFIED" | "ACCEPTED" | "REJECTED" | "TIMED_OUT";
  notifiedAt: string;
  respondedAt?: string;
  rejectionReason?: string;
}

export interface AlertDetail {
  _id: string;
  latitude: number;
  longitude: number;
  status: "active" | "accepted" | "resolved";
  source: "MANUAL_SOS" | "AI_VOICE" | "AI_MOVEMENT" | "AI_FUSION";
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskScore?: number;
  distressType?: string;
  confidence?: number;
  detectedKeywords?: string[];
  movementAnomalyType?: string;
  routeDeviated?: boolean;
  suddenStop?: boolean;
  finalRiskScore?: number;
  fusionSource?: string;

  // Phase 4 fields
  priority?: "P1" | "P2" | "P3" | "P4";
  priorityScore?: number;
  priorityReasons?: string[];
  responseStatus?: "CREATED" | "AI_DETECTED" | "NOTIFYING" | "ASSIGNMENT_PENDING" | "ASSIGNED" | "RESPONDING" | "NEARBY" | "ARRIVED" | "RESOLVED" | "CANCELLED" | "REASSIGNED";
  assignmentHistory?: AssignmentRecord[];
  assignedVolunteerId?: any;
  assignedVolunteerName?: string;
  assignedVolunteerPhone?: string;
  assignedAt?: string;
  acceptedAt?: string;
  respondingAt?: string;
  arrivedAt?: string;
  resolvedAt?: string;
  estimatedEtaMinutes?: number;
  responderLiveLocation?: {
    latitude: number;
    longitude: number;
    updatedAt: string;
  };
  aiRecommendation?: string;
  escalationLevel?: "NONE" | "ADMIN_ALERT" | "HIGH_ESCALATION";
  responseTimeline?: TimelineEvent[];
  resolutionSummary?: {
    incidentType: string;
    priority: string;
    initialRisk: number;
    mainFactors: string[];
    assignmentDurationSec: number;
    totalResponseDurationSec: number;
    responderName: string;
    resolvedAt: string;
  };

  user?: {
    _id?: string;
    name?: string;
    phone?: string;
    email?: string;
    profileImage?: string;
    isVerified?: boolean;
  };
  acceptedBy?: {
    _id?: string;
    name?: string;
    phone?: string;
    profileImage?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type Incident = AlertDetail;

export const getVolunteerProfile = () => {
  return api.get<VolunteerProfileResponse>("/volunteer/profile");
};

export const getVolunteerDashboard = () => {
  return api.get("/volunteer/dashboard");
};

export const getAlerts = (status?: string) => {
  return api.get("/volunteer/alerts", {
    params: status ? { status } : {},
  });
};

export const getAlertById = (id: string) => {
  return api.get<{ success: boolean; data: AlertDetail }>(`/alerts/${id}`);
};

export const acceptAlert = (id: string) => {
  return api.post(`/alerts/${id}/accept`);
};

export const rejectAlert = (id: string, reason?: string) => {
  return api.post(`/alerts/${id}/reject`, { reason });
};

export const startResponse = (id: string) => {
  return api.post(`/alerts/${id}/start-response`);
};

export const markNearby = (id: string) => {
  return api.post(`/alerts/${id}/nearby`);
};

export const markArrived = (id: string) => {
  return api.post(`/alerts/${id}/arrived`);
};

export const resolveAlert = (id: string, notes?: string) => {
  return api.post(`/alerts/${id}/resolve`, { notes });
};

export const updateResponderLiveLocation = (
  alertId: string,
  latitude: number,
  longitude: number
) => {
  return api.post(`/alerts/${alertId}/responder-location`, { latitude, longitude });
};

export const updateVolunteerLocation = (latitude: number, longitude: number, alertId?: string) => {
  return api.put("/volunteer/location", { latitude, longitude, alertId });
};

export const getIncidentTimeline = (id: string) => {
  return api.get(`/alerts/${id}/timeline`);
};

export const updateVolunteerProfile = (formData: FormData) => {
  return api.put<VolunteerProfileResponse>("/volunteer/profile", formData);
};

export interface IncidentStatistics {
  totalIncidents: number;
  acceptedIncidents: number;
  resolvedIncidents: number;
}

export interface IncidentHistoryResponse {
  success: boolean;
  message: string;
  statistics: IncidentStatistics;
  total: number;
  data: AlertDetail[];
}

export const getVolunteerIncidents = () => {
  return api.get<IncidentHistoryResponse>("/volunteer/incidents");
};