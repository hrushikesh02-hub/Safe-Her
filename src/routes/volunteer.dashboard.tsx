import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CheckCircle2,
  Activity,
  Clock,
  ListChecks,
  MapPin,
  Loader2,
  Bot,
  Siren,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getVolunteerDashboard,
  acceptAlert,
  resolveAlert,
  updateVolunteerLocation,
} from "@/services/volunteerService";
import { toast } from "sonner";

export const Route = createFileRoute("/volunteer/dashboard")({
  component: VolDashboard,
});

const REFRESH_INTERVAL_MS = 10_000; // 10 seconds

interface DashboardVolunteer {
  id: string;
  name: string;
  email: string;
  phone: string;
  profileImage: string | null;
  isVerified: boolean;
}

interface DashboardStatistics {
  totalAlerts: number;
  activeAlerts: number;
  acceptedAlerts: number;
  resolvedAlerts: number;
}

interface RecentAlertUser {
  name?: string;
  email?: string;
  phone?: string;
  profileImage?: string;
}

interface RecentAlert {
  _id: string;
  user?: RecentAlertUser;
  latitude: number;
  longitude: number;
  status: "active" | "accepted" | "resolved";
  createdAt: string;
  // AI fields
  source?: "MANUAL_SOS" | "AI_VOICE" | "AI_MOVEMENT" | "AI_FUSION";
  riskLevel?: string;
  riskScore?: number;
  distressType?: string;
  detectedKeywords?: string[];
  // Phase 2
  movementRiskScore?: number;
  movementAnomalyType?: string;
  gpsContextScore?: number;
  finalRiskScore?: number;
  fusionSource?: string;
}

interface VolunteerDashboardData {
  volunteer: DashboardVolunteer;
  statistics: DashboardStatistics;
  recentAlerts: RecentAlert[];
}

function VolDashboard() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState<VolunteerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Location sharing
  const [locationShared, setLocationShared] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const locationSharedRef = useRef(false);

  /* ---- Auto-share location on mount ---- */
  const shareLocation = useCallback(async () => {
    if (locationSharedRef.current || sharingLocation) return;
    if (!navigator.geolocation) return;

    setSharingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await updateVolunteerLocation(
            pos.coords.latitude,
            pos.coords.longitude
          );
          setLocationShared(true);
          locationSharedRef.current = true;
          console.log(
            `📍 Volunteer location shared: ${pos.coords.latitude}, ${pos.coords.longitude}`
          );
        } catch (err) {
          console.error("Failed to update volunteer location:", err);
        } finally {
          setSharingLocation(false);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        setSharingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [sharingLocation]);

  useEffect(() => {
    shareLocation();
  }, [shareLocation]);

  /* ---- Dashboard data ---- */
  const loadDashboard = useCallback(async () => {
    try {
      const response = await getVolunteerDashboard();
      setDashboard(response.data.data as VolunteerDashboardData);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) {
        toast.error("Session expired. Please log in again.");
        navigate({ to: "/login" });
        return;
      }
      if (status === 404) { toast.error("Dashboard data not found."); return; }
      if (status === 500) { toast.error("Server error while loading dashboard."); return; }
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  async function handleAccept(id: string) {
    try {
      await acceptAlert(id);
      toast.success("Alert Accepted");
      loadDashboard();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to accept alert");
    }
  }

  async function handleResolve(id: string) {
    try {
      await resolveAlert(id);
      toast.success("Alert Resolved");
      loadDashboard();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to resolve alert");
    }
  }

  const statistics = dashboard?.statistics;
  const recentAlerts = dashboard?.recentAlerts ?? [];
  const showSkeleton = loading && !dashboard;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Volunteer dashboard"
        desc="Stay ready. Lives are saved in minutes."
      />

      {/* Location sharing status banner */}
      <div
        className={`rounded-2xl border p-4 flex items-center justify-between text-sm ${
          locationShared
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
            : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
        }`}
      >
        <div className="flex items-center gap-2">
          {sharingLocation ? (
            <Loader2 className="size-4 animate-spin" />
          ) : locationShared ? (
            <MapPin className="size-4" />
          ) : (
            <MapPin className="size-4" />
          )}
          <span className="font-medium">
            {sharingLocation
              ? "Updating your location for nearby SOS detection..."
              : locationShared
              ? "Your location is active — you will receive alerts for nearby SOS incidents"
              : "Location not shared — you may miss nearby emergency alerts"}
          </span>
        </div>
        {!locationShared && !sharingLocation && (
          <Button size="sm" variant="outline" onClick={shareLocation}>
            Share Location
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {showSkeleton ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Nearby Alerts"
              value={(statistics?.activeAlerts ?? 0).toString()}
              icon={<Bell className="size-4" />}
              tone="emergency"
            />
            <StatCard
              label="Accepted Cases"
              value={(statistics?.acceptedAlerts ?? 0).toString()}
              icon={<Activity className="size-4" />}
            />
            <StatCard
              label="Resolved Cases"
              value={(statistics?.resolvedAlerts ?? 0).toString()}
              icon={<CheckCircle2 className="size-4" />}
              tone="success"
            />
            <StatCard
              label="Total Alerts"
              value={(statistics?.totalAlerts ?? 0).toString()}
              icon={<ListChecks className="size-4" />}
              tone="warning"
            />
          </>
        )}
      </div>

      {/* Alert feed */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Top incoming alerts</h2>
          <Button asChild variant="outline" size="sm">
            <Link to="/volunteer/alerts">Open feed</Link>
          </Button>
        </div>

        {showSkeleton ? (
          <div className="space-y-3">
            <AlertRowSkeleton />
            <AlertRowSkeleton />
            <AlertRowSkeleton />
          </div>
        ) : recentAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Bell className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No active emergency alerts.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentAlerts.map((a) => (
              <div
                key={a._id}
                className={`flex items-start justify-between rounded-xl border p-4 gap-4 ${
                  a.source === "AI_VOICE"
                    ? "border-purple-300 bg-purple-500/5"
                    : a.source === "AI_MOVEMENT"
                    ? "border-blue-300 bg-blue-500/5"
                    : a.source === "AI_FUSION"
                    ? "border-rose-300 bg-rose-500/5"
                    : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  {/* Source + User row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-sm font-semibold">{a.user?.name}</div>

                    {/* Source badge */}
                    {a.source === "AI_VOICE" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-bold px-2 py-0.5 border border-purple-300">
                        <Bot className="size-2.5" />
                        AI VOICE
                      </span>
                    ) : a.source === "AI_MOVEMENT" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 border border-blue-300">
                        <Activity className="size-2.5" />
                        AI MOVEMENT
                      </span>
                    ) : a.source === "AI_FUSION" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-[10px] font-bold px-2 py-0.5 border border-rose-300">
                        <Bot className="size-2.5" />
                        AI FUSION
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-bold px-2 py-0.5 border border-red-300">
                        <Siren className="size-2.5" />
                        MANUAL SOS
                      </span>
                    )}
                  </div>

                  {/* Location + time */}
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {a.user?.phone} · {a.latitude?.toFixed(4)}, {a.longitude?.toFixed(4)} ·{" "}
                    {formatCreatedAt(a.createdAt)} · ID {a._id.slice(-6)}
                  </div>

                  {/* AI risk info (shown only for AI_VOICE alerts) */}
                  {a.source === "AI_VOICE" && (
                    <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                      {a.riskLevel && (
                        <span
                          className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                            a.riskLevel === "CRITICAL"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                              : a.riskLevel === "HIGH"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          }`}
                        >
                          Risk: {a.riskLevel} ({a.riskScore}/100)
                        </span>
                      )}
                      {a.distressType && (
                        <span className="text-[11px] text-muted-foreground capitalize">
                          Detection: <strong>{a.distressType}</strong>
                        </span>
                      )}
                      {a.detectedKeywords && a.detectedKeywords.length > 0 && (
                        <span className="text-[11px] text-red-500 font-medium">
                          Keywords: {a.detectedKeywords.join(", ")}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Maps link */}
                  <a
                    href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-1"
                  >
                    <MapPin className="size-3" /> View on Map
                  </a>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      a.status === "active"
                        ? "bg-emergency/15 text-emergency"
                        : a.status === "accepted"
                        ? "bg-warning/15 text-warning"
                        : "bg-success/15 text-success"
                    }`}
                  >
                    {a.status}
                  </span>

                  <div className="flex gap-2">
                    {a.status === "active" && (
                      <Button
                        size="sm"
                        className="bg-success text-white hover:bg-success/90"
                        onClick={() => handleAccept(a._id)}
                      >
                        Accept
                      </Button>
                    )}
                    {a.status === "accepted" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleResolve(a._id)}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatCreatedAt(createdAt: string) {
  if (!createdAt) return "";
  return new Date(createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-7 w-16 animate-pulse rounded bg-muted" />
    </div>
  );
}

function AlertRowSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-xl border p-4">
      <div className="space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-3 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-8 w-20 animate-pulse rounded bg-muted" />
    </div>
  );
}