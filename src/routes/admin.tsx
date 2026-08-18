import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard, Users, ShieldCheck, Activity, MapPin, FileBarChart } from "lucide-react";
import { DashboardLayout, type NavItem } from "@/components/layout/DashboardLayout";

const items: NavItem[] = [
  { label: "Dashboard", to: "/admin/dashboard", icon: <LayoutDashboard className="size-4" /> },
  { label: "User Management", to: "/admin/users", icon: <Users className="size-4" /> },
  { label: "Volunteer Verification", to: "/admin/volunteers", icon: <ShieldCheck className="size-4" /> },
  { label: "Emergency Monitoring", to: "/admin/monitoring", icon: <Activity className="size-4" /> },
  { label: "Safe Zones", to: "/admin/safe-zones", icon: <MapPin className="size-4" /> },
  { label: "Reports", to: "/admin/reports", icon: <FileBarChart className="size-4" /> },
];

export const Route = createFileRoute("/admin")({
  component: () => <DashboardLayout portal="Admin" items={items} user={{ name: "Admin Console", role: "Super admin" }} />,
});