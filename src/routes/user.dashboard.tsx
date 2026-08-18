import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { getRole } from "@/lib/auth";
import { Siren, Phone, Building2, ArrowUpRight } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  getAlertHistory,
  getEmergencyContacts,
  getNearbySafeZones,
  getUserProfile,
} from "@/services/userService";
import { toast } from "sonner";

export const Route = createFileRoute("/user/dashboard")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;

    const role = getRole();

    if (role !== "user") {
      throw redirect({
        to: "/login",
      });
    }
  },

  component: UserDashboard,
});

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  profileImage: string | null;
  role: string;
  createdAt: string;
}

interface Alert {
  _id: string;
  status: "active" | "accepted" | "resolved";
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

interface DashboardStats {
  totalAlerts: number;
  activeAlerts: number;
  contactsCount: number;
  safeZonesCount: number;
}

function UserDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats>({
    totalAlerts: 0,
    activeAlerts: 0,
    contactsCount: 0,
    safeZonesCount: 0,
  });

  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [user, setUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const [profileRes, alertRes, contactsRes] = await Promise.all([
        getUserProfile(),
        getAlertHistory(),
        getEmergencyContacts(),
      ]);

      setUser(profileRes.data);

      const alerts: Alert[] = [...alertRes.data.data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setRecentAlerts(alerts);

      const activeCount = alerts.filter(
        (a) => a.status === "active" || a.status === "accepted"
      ).length;

      setStats((prev) => ({
        ...prev,
        totalAlerts: alerts.length,
        activeAlerts: activeCount,
        contactsCount: contactsRes.data.data.length,
      }));

      // Get current location and fetch nearby safe zones (fire-and-forget,
      // does not block the main dashboard load/loading state)
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const safeZoneRes = await getNearbySafeZones(
              position.coords.latitude,
              position.coords.longitude
            );

            setStats((prev) => ({
              ...prev,
              safeZonesCount: safeZoneRes.data.data.length,
            }));
          } catch (err) {
            console.error(err);
            setStats((prev) => ({ ...prev, safeZonesCount: 0 }));
          }
        },
        () => {
          toast.error("Location permission denied");
          setStats((prev) => ({ ...prev, safeZonesCount: 0 }));
        }
      );
    } catch (error: any) {
      const status = error?.response?.status;

      if (status === 401) {
        toast.error("Session expired. Please log in again.");
        navigate({ to: "/login" });
        return;
      }

      if (status === 403) {
        setAccessDenied(true);
        return;
      }

      if (status === 404) {
        toast.error("Dashboard data not found.");
        return;
      }

      if (status === 500) {
        toast.error("Server error while loading dashboard.");
        return;
      }

      toast.error(error.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border bg-card py-16 text-center shadow-sm">
        <p className="text-sm font-medium">Access denied.</p>
        <p className="text-xs text-muted-foreground">You don't have permission to view this dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl gradient-hero p-6 text-white shadow-elegant md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/80">Stay safe today</div>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">
              Hi {user?.name || "User"}, your network is ready 24/7
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              Your emergency network is ready. Press SOS anytime for instant help.
            </p>
          </div>
          <Button asChild size="lg" className="bg-emergency text-white hover:bg-emergency/90 shadow-elegant">
            <Link to="/user/sos">
              <Siren className="mr-2 size-5" />
              Open SOS
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard label="Total Alerts" value={stats.totalAlerts.toString()} />
            <StatCard
              label="Active Alerts"
              value={stats.activeAlerts.toString()}
              icon={<Siren className="size-4" />}
              tone="emergency"
            />
            <StatCard
              label="Emergency Contacts"
              value={stats.contactsCount.toString()}
              icon={<Phone className="size-4" />}
              tone="success"
            />
            <StatCard
              label="Nearby Safe Zones"
              value={stats.safeZonesCount.toString()}
              icon={<Building2 className="size-4" />}
              tone="warning"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent activity</h2>
            <Link to="/user/history" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>

          {loading ? (
            <RecentActivitySkeleton />
          ) : recentAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <p className="text-sm text-muted-foreground">No emergency alerts yet.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {recentAlerts.map((a) => (
                <li key={a._id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-semibold">SOS Alert</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleString()}
                      {a.latitude != null && a.longitude != null && (
                        <> · {a.latitude}, {a.longitude}</>
                      )}
                    </div>
                  </div>

                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <QuickAction to="/user/sos" title="Emergency SOS" desc="Trigger an alert" tone="emergency" />
          <QuickAction to="/user/ai-voice" title="AI Voice Monitor" desc="Real-time distress audio analysis" />
          <QuickAction to="/user/contacts" title="Trusted contacts" desc="Add or edit contacts" />
          <QuickAction to="/user/safe-zones" title="Find safe zones" desc="Hospitals & police nearby" />
        </div>
      </div>
    </div>
  );
}

function QuickAction({ to, title, desc, tone }: { to: string; title: string; desc: string; tone?: "emergency" }) {
  return (
    <Link
      to={to}
      className={`block rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-elegant ${
        tone === "emergency" ? "bg-emergency text-white" : "bg-card"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className={`mt-1 text-xs ${tone === "emergency" ? "text-white/80" : "text-muted-foreground"}`}>
            {desc}
          </div>
        </div>
        <ArrowUpRight className="size-4 opacity-70" />
      </div>
    </Link>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-7 w-16 animate-pulse rounded bg-muted" />
    </div>
  );
}

function RecentActivitySkeleton() {
  return (
    <ul className="divide-y">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-center justify-between py-3">
          <div className="space-y-2">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-3 w-36 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
        </li>
      ))}
    </ul>
  );
}