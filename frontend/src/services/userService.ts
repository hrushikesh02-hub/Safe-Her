import api from "./api";

export const getUserProfile = async () => {
  const response = await api.get("/auth/profile", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  return response.data;
};

export const updateUserProfile = (formData: FormData) => {
  return api.put("/users/profile", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 30000, // 30s timeout for image uploads
  });
};

export const getEmergencyContacts = () => {
  return api.get("/contacts");
};

export const addEmergencyContact = (data:any) => {
  return api.post("/contacts", data);
};

export const updateEmergencyContact = (id:string, data:any) => {
  return api.put(`/contacts/${id}`, data);
};

export const deleteEmergencyContact = (id:string) => {
  return api.delete(`/contacts/${id}`);
};

export const getAlertHistory = () => {
  return api.get("/alerts/history");
};

export const getSafeZones = () => {
  return api.get("/users/safe-zones");
};

export const getSupportTeams = () => {
  return api.get("/users/support-teams");
};

export const requestSupport = (
  volunteerId: string
) => {
  return api.post(
    "/users/request-support",
    {
      volunteerId,
    }
  );
};

export const getNearbySafeZones = (
  lat: number,
  lng: number
) => {
  return api.get(
    `/users/nearby-safe-zones?lat=${lat}&lng=${lng}`
  );
};

