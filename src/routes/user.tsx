import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard, UserCircle, Phone, Siren, MapPin, Users, Building2, History, Mic, Activity, Layers, Sparkles } from "lucide-react";
import { DashboardLayout, type NavItem } from "@/components/layout/DashboardLayout";
import { useEffect, useState } from "react";
import { getUserProfile } from "@/services/userService";

const items: NavItem[] = [
  { label: "Home / Safety Status", to: "/user/dashboard", icon: <LayoutDashboard className="size-4" /> },
  { label: "Emergency SOS", to: "/user/sos", icon: <Siren className="size-4 text-red-500" /> },
  { label: "Emergency Contacts", to: "/user/contacts", icon: <Phone className="size-4 text-blue-500" /> },
  { label: "Safety Shield (AI)", to: "/user/ai-fusion", icon: <Sparkles className="size-4 text-purple-500" /> },
  { label: "My Profile", to: "/user/profile", icon: <UserCircle className="size-4" /> },
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

