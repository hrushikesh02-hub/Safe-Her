import api from "./api";

export const sendSOS = async (data: {
  latitude: number;
  longitude: number;
}) => {

  console.log("SENDING SOS", data);

  const response = await api.post("/alerts", data);

  console.log("RESPONSE", response);

  return response;
};