import api from "./api";

/**
 * Volunteer profile shape returned by the backend.
 * GET /volunteer/profile
 * PUT /volunteer/profile
 */
export interface Volunteer {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  profileImage: string | null;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VolunteerProfileResponse {
  success: boolean;
  message: string;
  data: Volunteer;
}

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
  return api.get(`/volunteer/alerts/${id}`);
};

export const acceptAlert = (id: string) => {
  return api.put(`/volunteer/alerts/${id}/accept`);
};

export const resolveAlert = (id: string) => {
  return api.put(`/volunteer/alerts/${id}/resolve`);
};

export const updateVolunteerProfile = (formData: FormData) => {
  return api.put<VolunteerProfileResponse>("/volunteer/profile", formData);
};

/**
 * A single incident record in the volunteer's history.
 * GET /volunteer/incidents
 */
export interface IncidentUser {
  name: string;
  phone: string;
  profileImage?: string;
}

export interface IncidentAcceptedVolunteer {
  name: string;
  phone?: string;
  profileImage?: string;
}

export interface Incident {
  _id: string;
  latitude: number;
  longitude: number;
  status: "accepted" | "resolved";
  createdAt: string;
  updatedAt: string;
  user: IncidentUser;
  acceptedBy?: IncidentAcceptedVolunteer;
}

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
  data: Incident[];
}

export const getVolunteerIncidents = () => {
  return api.get<IncidentHistoryResponse>("/volunteer/incidents");
};

/**
 * Update volunteer's current GPS location.
 * PUT /volunteer/location
 * This enables the backend to find nearby volunteers when an SOS is triggered.
 */
export const updateVolunteerLocation = (latitude: number, longitude: number) => {
  return api.put("/volunteer/location", { latitude, longitude });
};