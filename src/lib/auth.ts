export const getToken = () => {
  if (typeof window === "undefined") return null;

  return localStorage.getItem("token");
};

export const getUser = () => {
  if (typeof window === "undefined") return null;

  return JSON.parse(
    localStorage.getItem("user") || "null"
  );
};

export const getRole = () => {
  const user = getUser();

  return user?.role;
};