import api from "./api";

export const getDashboardStats = () => {
  return api.get("/admin/dashboard");
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

export const acceptAlert = (id: string) => {
  return api.put(`/admin/alerts/${id}/accept`);
};

export const resolveAlert = (id: string) => {
  return api.put(`/admin/alerts/${id}/resolve`);
};

export const getVolunteers = () => {
  return api.get("/admin/volunteers");
};

export const verifyVolunteer = (id: string) => {
  return api.put(`/admin/volunteers/${id}/verify`);
};

export const rejectVolunteer = (id: string) => {
  return api.delete(`/admin/volunteers/${id}`);
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