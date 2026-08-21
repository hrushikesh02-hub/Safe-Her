import { createFileRoute } from "@tanstack/react-router";
import {
  Home,
  Bell,
  Activity,
  UserCircle,
} from "lucide-react";
import {
  DashboardLayout,
  type NavItem,
} from "@/components/layout/DashboardLayout";
import { useEffect, useState } from "react";
import { getVolunteerProfile } from "@/services/volunteerService";

import { getUser } from "@/lib/auth";

const items: NavItem[] = [
  { label: "Dashboard", shortLabel: "Home", to: "/volunteer/dashboard", icon: <Home className="size-4" /> },
  { label: "Alert Feed", shortLabel: "Alerts", to: "/volunteer/alerts", icon: <Bell className="size-4 text-amber-600" /> },
  { label: "Active Incidents", shortLabel: "Tasks", to: "/volunteer/incidents", icon: <Activity className="size-4 text-red-600" /> },
  { label: "Volunteer Profile", shortLabel: "Profile", to: "/volunteer/profile", icon: <UserCircle className="size-4" /> },
];

function VolunteerLayout() {
  const cached = getUser();
  const [user, setUser] = useState({
    name: cached?.name || "Volunteer",
    role: "Community Responder",
    profileImage: cached?.profileImage || "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await getVolunteerProfile();
        if (res.data?.data) {
          setUser({
            name: res.data.data.name || "Volunteer",
            role: res.data.data.isVerified ? "Verified Responder" : "Pending Verification",
            profileImage: res.data.data.profileImage || "",
          });
        }
      } catch (error) {
        console.error("Failed to load volunteer profile:", error);
      }
    };

    loadProfile();

    const handleProfileUpdate = (e: any) => {
      const updated = e.detail || getUser();
      if (updated) {
        setUser((prev) => ({
          ...prev,
          name: updated.name || prev.name,
          profileImage: updated.profileImage || "",
        }));
      }
    };

    window.addEventListener("user-profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("user-profile-updated", handleProfileUpdate);
  }, []);

  return (
    <DashboardLayout
      portal="Volunteer"
      items={items}
      user={user}
    />
  );
}

export const Route = createFileRoute("/volunteer")({
  component: VolunteerLayout,
});