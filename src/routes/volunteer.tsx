import { createFileRoute } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Bell,
  ClipboardList,
  UserCircle,
} from "lucide-react";
import {
  DashboardLayout,
  type NavItem,
} from "@/components/layout/DashboardLayout";
import { useEffect, useState } from "react";
import { getVolunteerProfile } from "@/services/volunteerService";

const items: NavItem[] = [
  {
    label: "Dashboard",
    to: "/volunteer/dashboard",
    icon: <LayoutDashboard className="size-4" />,
  },
  {
    label: "Alert Feed",
    to: "/volunteer/alerts",
    icon: <Bell className="size-4" />,
  },
  {
    label: "Incident Details",
    to: "/volunteer/incidents",
    icon: <ClipboardList className="size-4" />,
  },
  {
    label: "Profile",
    to: "/volunteer/profile",
    icon: <UserCircle className="size-4" />,
  },
];

function VolunteerLayout() {
  const [user, setUser] = useState({
    name: "",
    role: "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await getVolunteerProfile();

        setUser({
          name: res.data.data.name,
          role: res.data.data.isVerified
            ? "Verified Volunteer"
            : "Volunteer",
        });
      } catch (error) {
        console.error("Failed to load volunteer profile:", error);
      }
    };

    loadProfile();
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