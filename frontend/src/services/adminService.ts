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
    audioUrl?: string;
    videoUrl?: string;
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

/* ===================================================================
   PHASE 5 — AI SAFETY INTELLIGENCE COMMAND CENTER API
=================================================================== */

export interface PeriodComparison {
  incidentChangePct: number;
  criticalChangePct: number;
  todayCount?: number;
  yesterdayCount?: number;
  thisWeekCount?: number;
  lastWeekCount?: number;
  thisMonthCount?: number;
  lastMonthCount?: number;
}

export interface CommandCenterOverview {
  activeIncidents: number;
  criticalIncidents: number;
  highRiskIncidents: number;
  resolvedIncidents: number;
  totalIncidents: number;
  respondersActive: number;
  totalUsers: number;
  totalVolunteers: number;
  verifiedVolunteers: number;
  safeZonesCount: number;
  avgResponseTimeSec: number;
  avgResolutionTimeSec: number;
  avgResponseFormatted: string;
  avgResolutionFormatted: string;
  comparisons: {
    todayVsYesterday: PeriodComparison;
    weekVsLastWeek: PeriodComparison;
    monthVsLastMonth: PeriodComparison;
  };
}

export interface RiskAnalytics {
  distribution: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
    total: number;
    avgRiskScore: number;
    criticalPercentage: number;
  };
  dailyTrend: Array<{
    date: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
    avgRisk: number;
  }>;
  weeklyTrend: Array<{
    week: string;
    total: number;
    critical: number;
    avgRisk: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    total: number;
    critical: number;
    avgRisk: number;
  }>;
}

export interface SignalAnalytics {
  signals: Array<{
    signal: string;
    count: number;
    percentage: number;
  }>;
  totalDetections: number;
  sources: Array<{
    source: string;
    incidentCount: number;
    criticalCount: number;
    criticalPercentage: number;
    averageRisk: number;
    avgResponseDurationSec: number;
  }>;
}

export interface Hotspot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  incidentCount: number;
  averageRisk: number;
  severityDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  dominantFactors: string[];
  safeZonesNearby: number;
  peakHour?: string;
  riskTrend?: string;
}

export interface TimeAnalytics {
  hourly: Array<{
    hour: number;
    hourLabel: string;
    totalIncidents: number;
    criticalIncidents: number;
    avgRiskScore: number;
  }>;
  dayOfWeek: Array<{
    day: string;
    dayIndex: number;
    totalIncidents: number;
    criticalIncidents: number;
    avgRiskScore: number;
  }>;
  peakHour: string;
}

export interface VolunteerAnalytics {
  summary: {
    totalVolunteers: number;
    verifiedVolunteers: number;
    activeNow: number;
    totalAssignments: number;
    acceptedAssignments: number;
    rejectedAssignments: number;
    timedOutAssignments: number;
    acceptanceRate: number;
    rejectionRate: number;
    timeoutRate: number;
  };
  responders: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    status: string;
    isVerified: boolean;
    totalAssignments: number;
    acceptedCount: number;
    resolvedCount: number;
    acceptanceRate: number;
    avgResponseMinutes: number;
  }>;
}

export interface AIInsight {
  id: string;
  category: "RISK" | "RESPONSE" | "HOTSPOT" | "VOLUNTEER" | "SIGNALS" | "EFFICIENCY";
  severity: "INFO" | "WARNING" | "CRITICAL" | "POSITIVE";
  title: string;
  description: string;
  metric: string;
  traceableFact: string;
  timestamp: string;
}

export interface SafetyRecommendation {
  id: string;
  category: "DEPLOYMENT" | "COVERAGE" | "MONITORING" | "INFRASTRUCTURE" | "ENGAGEMENT";
  priority: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  action: string;
  rationale: string;
  affectedArea?: string;
  suggestedTimeline: string;
}

export interface AdminAlert {
  id: string;
  incidentId: string;
  type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  timestamp: string;
  location: { latitude: number; longitude: number };
}

export const getCommandCenterOverview = () => {
  return api.get<{ success: boolean; data: CommandCenterOverview }>("/admin/command-center/overview");
};

export const getRiskAnalytics = () => {
  return api.get<{ success: boolean; data: RiskAnalytics }>("/admin/command-center/risk-analytics");
};

export const getSignalAnalytics = () => {
  return api.get<{ success: boolean; data: SignalAnalytics }>("/admin/command-center/signal-analytics");
};

export const getSafetyHotspots = (params?: { startDate?: string; endDate?: string; minIncidents?: number }) => {
  return api.get<{ success: boolean; data: { hotspots: Hotspot[]; totalHotspots: number } }>("/admin/command-center/hotspots", { params });
};

export const getTimeAnalytics = () => {
  return api.get<{ success: boolean; data: TimeAnalytics }>("/admin/command-center/time-analytics");
};

export const getVolunteerAnalytics = () => {
  return api.get<{ success: boolean; data: VolunteerAnalytics }>("/admin/command-center/volunteer-analytics");
};

export const getAIInsights = () => {
  return api.get<{ success: boolean; data: { insights: AIInsight[]; recommendations: SafetyRecommendation[]; generatedAt: string } }>("/admin/command-center/ai-insights");
};

export const getAdminAlertCenter = () => {
  return api.get<{ success: boolean; data: { alerts: AdminAlert[]; unreadCount: number } }>("/admin/command-center/alerts");
};

export const getFullSafetyReport = (params?: { startDate?: string; endDate?: string }) => {
  return api.get<{ success: boolean; data: any }>("/admin/command-center/full-report", { params });
};

export const downloadIncidentsCSV = async (params?: { startDate?: string; endDate?: string }) => {
  const response = await api.get("/admin/command-center/export-csv", {
    params,
    responseType: "blob",
  });
  return response.data;
};