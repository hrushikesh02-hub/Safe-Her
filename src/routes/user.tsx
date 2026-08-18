import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard, UserCircle, Phone, Siren, MapPin, Users, Building2, History, Mic, Activity, Layers, Sparkles } from "lucide-react";
import { DashboardLayout, type NavItem } from "@/components/layout/DashboardLayout";
import { useEffect, useState } from "react";
import { getUserProfile } from "@/services/userService";

const items: NavItem[] = [
  { label: "Dashboard", to: "/user/dashboard", icon: <LayoutDashboard className="size-4" /> },
  { label: "Predictive Safety AI", to: "/user/predictive-safety", icon: <Sparkles className="size-4 text-purple-500" /> },
  { label: "Unified Safety AI", to: "/user/ai-fusion", icon: <Layers className="size-4" /> },
  { label: "AI Voice Monitor", to: "/user/ai-voice", icon: <Mic className="size-4" /> },
  { label: "AI Movement Monitor", to: "/user/ai-movement", icon: <Activity className="size-4" /> },
  { label: "Safety Profile", to: "/user/profile", icon: <UserCircle className="size-4" /> },
  { label: "Emergency Contacts", to: "/user/contacts", icon: <Phone className="size-4" /> },
  { label: "Emergency SOS", to: "/user/sos", icon: <Siren className="size-4" /> },
  { label: "Live Location", to: "/user/location", icon: <MapPin className="size-4" /> },
  { label: "Support Teams", to: "/user/support-teams", icon: <Users className="size-4" /> },
  { label: "Safe Zones", to: "/user/safe-zones", icon: <Building2 className="size-4" /> },
  { label: "Alert History", to: "/user/history", icon: <History className="size-4" /> },
];

function UserLayout() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await getUserProfile();
        setUser(res.data);
      } catch (err) {
        console.log(err);
      }
    }

    loadUser();
  }, []);

  return (
    <DashboardLayout
      portal="User"
      items={items}
      user={{
        name: user?.name || "User",
        role: "Protected User",
      }}
    />
  );
}

export const Route = createFileRoute("/user")({
  component: UserLayout,
});

