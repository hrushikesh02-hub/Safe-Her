import api from "./api";

export interface IncidentReportData {
  incidentId: string;
  incidentDate: string;
  incidentType: string;
  priority: string;
  priorityScore: number;
  priorityReasons: string[];
  initialRisk: number;
  riskLevel: string;
  source: string;
  detectionSummary: {
    voiceRisk: number;
    distressType: string;
    detectedKeywords: string[];
    movementRisk: number;
    movementAnomaly: string;
    gpsContextScore: number;
    routeDeviated: boolean;
  };
  location: {
    latitude: number;
    longitude: number;
    approximateAddress: string;
  };
  user: {
    name: string;
    phone: string;
    email: string;
  };
  response: {
    assignedVolunteer: string;
    assignedVolunteerPhone: string;
    notifiedAt?: string;
    assignedAt?: string;
    acceptedAt?: string;
    respondingAt?: string;
    arrivedAt?: string;
    resolvedAt?: string;
    responseStatus: string;
  };
  responseMetrics: {
    assignmentDelaySec: number;
    acceptanceDelaySec: number;
    transitDurationSec: number;
    totalResolutionDurationSec: number;
    formattedTotalDuration: string;
  };
  assignmentHistory: {
    volunteerName: string;
    volunteerEmail?: string;
    distanceKm?: number;
    responseScore?: number;
    status: string;
    notifiedAt: string;
    respondedAt?: string;
    rejectionReason?: string;
  }[];
  timeline: {
    timestamp: string;
    event: string;
    description: string;
    actor?: string;
  }[];
  aiSummary: {
    incidentType: string;
    priority: string;
    initialRisk: number;
    mainFactors: string[];
    assignmentDurationSec: number;
    totalResponseDurationSec: number;
    responderName: string;
    resolvedAt: string;
  };
  evidence: {
    status: string;
    hasAudio: boolean;
    hasVideo: boolean;
    audioDuration?: number;
    videoDuration?: number;
  };
  reportGeneratedAt: string;
}

export const getDashboardStats = () => {
  return api.get("/admin/dashboard");
};

export const getResponseAnalytics = () => {
  return api.get("/admin/response-analytics");
};

export const getAllUsers = () => {
  return api.get("/admin/users");
};

export const deleteUser = (id: string) => {
  return api.delete(`/admin/users/${id}`);
};

export const toggleUserStatus = (id: string) => {
  return api.put(`/admin/users/${id}/status`);
};

export const getActiveAlerts = () => {
  return api.get("/admin/alerts");
};

export const getAllIncidents = (params?: {
  startDate?: string;
  endDate?: string;
  priority?: string;
  riskLevel?: string;
  status?: string;
  source?: string;
  responderId?: string;
  page?: number;
  limit?: number;
}) => {
  return api.get("/admin/incidents", { params });
};

export const getIncidentReportData = (id: string) => {
  return api.get<{ success: boolean; data: IncidentReportData }>(`/admin/incidents/${id}/report-data`);
};

export const acceptAlert = (id: string) => {
  return api.post(`/alerts/${id}/accept`);
};

export const resolveAlert = (id: string, notes?: string) => {
  return api.post(`/alerts/${id}/resolve`, { notes });
};

export const reassignAlert = (id: string, volunteerId?: string) => {
  return api.post(`/alerts/${id}/reassign`, { volunteerId });
};

export const escalateAlert = (id: string, data: { priority?: string; escalationLevel?: string; reason?: string }) => {
  return api.post(`/alerts/${id}/escalate`, data);
};

export const getVolunteers = (status?: string, search?: string) => {
  return api.get("/admin/volunteers", { params: { status, search } });
};

export const verifyVolunteer = (id: string) => {
  return api.post(`/admin/volunteers/${id}/verify`);
};

export const rejectVolunteer = (id: string, reason?: string) => {
  return api.post(`/admin/volunteers/${id}/reject`, { reason });
};

export const resendVerificationEmail = (id: string) => {
  return api.post(`/admin/volunteers/${id}/resend-email`);
};

export const getIncidentEvidence = (id: string) => {
  return api.get(`/alerts/${id}/evidence`);
};

export const getEvidenceLogs = (id: string) => {
  return api.get(`/alerts/${id}/evidence/logs`);
};

export const uploadIncidentEvidence = (id: string, formData: FormData) => {
  return api.post(`/alerts/${id}/evidence`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000, // 2 minute timeout for large media uploads
  });
};

export const getSafeZones = () => {
  return api.get("/admin/safe-zones");
};

export const addSafeZone = (data: any) => {
  return api.post("/admin/safe-zones", data);
};

export const deleteSafeZone = (id: string) => {
  return api.delete(`/admin/safe-zones/${id}`);
};

export const getReports = () => {
  return api.get("/admin/reports");
};

export const getRecentAlerts = () =>
  api.get("/admin/recent-alerts");

export const getRecentActivities = () =>
  api.get("/admin/recent-activities");