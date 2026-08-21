import { Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  Shield,
  LogOut,
  Menu,
  X,
  Siren,
  Home,
  Sparkles,
  Phone,
  UserCircle,
  Bell,
  Activity,
  ChevronRight,
  ShieldCheck,
  MapPin,
  FileBarChart,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/UserAvatar";

export interface NavItem {
  label: string;
  shortLabel?: string;
  to: string;
  icon: ReactNode;
}

export function DashboardLayout({
  portal,
  items,
  user,
}: {
  portal: "User" | "Volunteer" | "Admin";
  items: NavItem[];
  user: { name: string; role: string; profileImage?: string };
}) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  // Mobile Bottom Navigation Mapping
  const mobileNavItems: NavItem[] =
    portal === "User"
      ? [
          { label: "Home", shortLabel: "Home", to: "/user/dashboard", icon: <Home className="size-5" /> },
          { label: "Shield", shortLabel: "Shield", to: "/user/ai-fusion", icon: <ShieldCheck className="size-5 text-emerald-600" /> },
          { label: "SOS", shortLabel: "SOS", to: "/user/sos", icon: <Siren className="size-6 text-white" /> },
          { label: "Contacts", shortLabel: "Contacts", to: "/user/contacts", icon: <Phone className="size-5" /> },
          { label: "Profile", shortLabel: "Profile", to: "/user/profile", icon: <UserCircle className="size-5" /> },
        ]
      : portal === "Volunteer"
      ? [
          { label: "Dashboard", shortLabel: "Home", to: "/volunteer/dashboard", icon: <Home className="size-5" /> },
          { label: "Alerts", shortLabel: "Alerts", to: "/volunteer/alerts", icon: <Bell className="size-5" /> },
          { label: "Incidents", shortLabel: "Tasks", to: "/volunteer/incidents", icon: <Activity className="size-5" /> },
          { label: "Profile", shortLabel: "Profile", to: "/volunteer/profile", icon: <UserCircle className="size-5" /> },
        ]
      : [
          { label: "Overview", shortLabel: "Overview", to: "/admin/dashboard", icon: <Home className="size-5" /> },
          { label: "Monitoring", shortLabel: "Live", to: "/admin/monitoring", icon: <Activity className="size-5" /> },
          { label: "Volunteers", shortLabel: "Volunteers", to: "/admin/volunteers", icon: <Users className="size-5" /> },
          { label: "Reports", shortLabel: "Reports", to: "/admin/reports", icon: <FileBarChart className="size-5" /> },
        ];

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      {/* Desktop Sidebar (lg and up) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-border/80 bg-card text-card-foreground transition-transform duration-200 ease-in-out lg:translate-x-0 hidden lg:flex lg:flex-col justify-between"
        )}
      >
        <div>
          {/* Logo & Portal Badge */}
          <div className="flex h-16 items-center justify-between px-5 border-b border-border/60">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white shadow-sm">
                <Shield className="size-4.5" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-foreground">SafeHer</span>
                <span className="ml-2 text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {portal}
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <nav className="p-3 space-y-1">
            {items.map((it) => {
              const active = loc.pathname === it.to;
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-indigo-50 text-indigo-950 font-semibold border border-indigo-200/60 shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className={cn("size-5 flex items-center justify-center", active ? "text-indigo-600" : "text-muted-foreground")}>
                    {it.icon}
                  </span>
                  <span>{it.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card at bottom of Desktop Sidebar */}
        <div className="p-3 border-t border-border/60">
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <UserAvatar
                src={user.profileImage}
                name={user.name}
                role={user.role?.toLowerCase()}
                size="sm"
              />
              <div className="min-w-0">
                <div className="font-semibold text-foreground truncate">{user.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">{user.role}</div>
              </div>
            </div>
            <Link
              to="/login"
              aria-label="Sign out"
              className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 pb-20 lg:pb-8">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-border/60 bg-background/90 px-4 sm:px-6 backdrop-blur-md">
          {/* Mobile brand or Desktop breadcrumb */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <div className="grid size-7 place-items-center rounded-lg bg-indigo-600 text-white">
                <Shield className="size-4" />
              </div>
              <span className="font-bold text-sm text-foreground">SafeHer</span>
            </Link>

            <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
              <span>{portal}</span>
              <ChevronRight className="size-3.5" />
              <span className="font-semibold text-foreground">
                {items.find((i) => i.to === loc.pathname)?.label || "Dashboard"}
              </span>
            </div>
          </div>

          {/* Right actions: Emergency button or status */}
          <div className="flex items-center gap-2.5">
            {portal === "User" && (
              <Link to="/user/sos">
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 px-3 text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs rounded-lg"
                >
                  <Siren className="size-3.5 mr-1" />
                  SOS
                </Button>
              </Link>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-2 border-l border-border/60">
              <span className="hidden sm:inline font-medium text-foreground">
                {user.name.split(" ")[0]}
              </span>
              <UserAvatar
                src={user.profileImage}
                name={user.name}
                role={user.role?.toLowerCase()}
                size="sm"
              />
            </div>
          </div>
        </header>

        {/* Page Viewport Max Width */}
        <main className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile App Bottom Navigation Bar (<lg) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-card/95 backdrop-blur-md border-t border-border/80 px-2 py-1.5 flex items-center justify-around shadow-lg"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {mobileNavItems.map((item) => {
          const active = loc.pathname === item.to;
          const isSos = item.to === "/user/sos";

          if (isSos) {
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-col items-center justify-center -mt-5"
                aria-label="Emergency SOS Button"
              >
                <div className="size-13 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-95 transition-transform border-2 border-white">
                  <Siren className="size-6" />
                </div>
                <span className="text-[10px] font-bold text-red-600 mt-1">SOS</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-lg transition-colors text-xs",
                active ? "text-indigo-600 font-bold" : "text-muted-foreground hover:text-foreground font-medium"
              )}
            >
              <div className={cn("p-1 rounded-md", active && "bg-indigo-50")}>{item.icon}</div>
              <span className="text-[10px] tracking-tight">{item.shortLabel || item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}