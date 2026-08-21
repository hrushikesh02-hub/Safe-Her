import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "user" | "volunteer" | "admin";
  profileImage?: string;
  isVerified?: boolean;
  isEmailVerified?: boolean;
};

type AuthContextType = {
  user: User | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUserProfileState: (updatedFields: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          // ignore corrupted JSON
        }
      }
    }
  }, []);

  const login = (user: User, token: string) => {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", token);
    setUser(user);
    window.dispatchEvent(new CustomEvent("user-profile-updated", { detail: user }));
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
  };

  const updateUserProfileState = (updatedFields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem("user", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("user-profile-updated", { detail: updated }));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUserProfileState }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};