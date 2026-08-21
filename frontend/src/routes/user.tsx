import { createFileRoute } from "@tanstack/react-router";
import {
  Home,
  ShieldCheck,
  Siren,
  Phone,
  UserCircle,
  History,
  MapPin,
} from "lucide-react";
import { DashboardLayout, type NavItem } from "@/components/layout/DashboardLayout";
import { useEffect, useState } from "react";
import { getUserProfile } from "@/services/userService";

import { getUser } from "@/lib/auth";

const items: NavItem[] = [
  { label: "Home", shortLabel: "Home", to: "/user/dashboard", icon: <Home className="size-4" /> },
  { label: "Safety Shield", shortLabel: "Shield", to: "/user/ai-fusion", icon: <ShieldCheck className="size-4 text-emerald-600" /> },
  { label: "Emergency SOS", shortLabel: "SOS", to: "/user/sos", icon: <Siren className="size-4 text-red-600" /> },
  { label: "Emergency Contacts", shortLabel: "Contacts", to: "/user/contacts", icon: <Phone className="size-4 text-blue-600" /> },
  { label: "Incident History", shortLabel: "History", to: "/user/history", icon: <History className="size-4" /> },
  { label: "Safe Zones Map", shortLabel: "Safe Zones", to: "/user/safe-zones", icon: <MapPin className="size-4" /> },
  { label: "My Profile", shortLabel: "Profile", to: "/user/profile", icon: <UserCircle className="size-4" /> },
];

function UserLayout() {
  const cached = getUser();
  const [user, setUser] = useState<any>(cached);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await getUserProfile();
        if (res.data) {
          setUser(res.data);
        }
      } catch (err) {
        console.log(err);
      }
    }

    loadUser();

    const handleProfileUpdate = (e: any) => {
      const updated = e.detail || getUser();
      if (updated) {
        setUser((prev: any) => ({ ...prev, ...updated }));
      }
    };

    window.addEventListener("user-profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("user-profile-updated", handleProfileUpdate);
  }, []);

  return (
    <DashboardLayout
      portal="User"
      items={items}
      user={{
        name: user?.name || "Protected User",
        role: "SafeHer Member",
        profileImage: user?.profileImage || "",
      }}
    />
  );
}

export const Route = createFileRoute("/user")({
  component: UserLayout,
});
