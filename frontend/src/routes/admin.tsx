import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard, Users, ShieldCheck, Activity, MapPin, FileBarChart } from "lucide-react";
import { DashboardLayout, type NavItem } from "@/components/layout/DashboardLayout";
import { useEffect, useState } from "react";
import { getUserProfile } from "@/services/userService";
import { getUser } from "@/lib/auth";

const items: NavItem[] = [
  { label: "Command Center", shortLabel: "Overview", to: "/admin/dashboard", icon: <LayoutDashboard className="size-4" /> },
  { label: "Emergency Monitoring", shortLabel: "Live", to: "/admin/monitoring", icon: <Activity className="size-4 text-red-600" /> },
  { label: "Volunteer Management", shortLabel: "Volunteers", to: "/admin/volunteers", icon: <ShieldCheck className="size-4 text-emerald-600" /> },
  { label: "User Accounts", shortLabel: "Users", to: "/admin/users", icon: <Users className="size-4" /> },
  { label: "Safe Zones", shortLabel: "Zones", to: "/admin/safe-zones", icon: <MapPin className="size-4" /> },
  { label: "Reports & Logs", shortLabel: "Reports", to: "/admin/reports", icon: <FileBarChart className="size-4" /> },
];

function AdminLayout() {
  const cached = getUser();
  const [adminUser, setAdminUser] = useState({
    name: cached?.name || "Administrator",
    role: "Safety Operations",
    profileImage: cached?.profileImage || "",
  });

  useEffect(() => {
    async function loadAdmin() {
      try {
        const res = await getUserProfile();
        if (res.data) {
          setAdminUser({
            name: res.data.name || "Administrator",
            role: "Safety Operations",
            profileImage: res.data.profileImage || "",
          });
        }
      } catch (err) {
        console.warn("Could not refresh admin profile:", err);
      }
    }

    loadAdmin();

    const handleProfileUpdate = (e: any) => {
      const updated = e.detail || getUser();
      if (updated) {
        setAdminUser((prev) => ({
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
      portal="Admin"
      items={items}
      user={adminUser}
    />
  );
}

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});