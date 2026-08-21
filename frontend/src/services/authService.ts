import api from "./api";

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "user" | "volunteer" | "admin";
}

export interface VerifyOtpData {
  email: string;
  otp: string;
}

export const login = async (data: LoginData) => {
  const response = await api.post("/auth/login", data);
  return response.data;
};

export const register = async (data: RegisterData) => {
  const response = await api.post("/auth/register", data);
  return response.data;
};

export const verifyOtp = async (data: VerifyOtpData) => {
  const response = await api.post("/auth/verify-otp", data);
  return response.data;
};

export const resendOtp = async (email: string) => {
  const response = await api.post("/auth/resend-otp", { email });
  return response.data;
};