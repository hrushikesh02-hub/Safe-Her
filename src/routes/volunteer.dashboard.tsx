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
  ShieldAlert,
  ArrowRight,
  XCircle,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getVolunteerDashboard,
  acceptAlert,
  rejectAlert,
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
  volunteerStatus?: string;
}

interface DashboardStatistics {
  totalAlerts: number;
  activeAlerts: number;
  assignedToMeAlerts?: number;
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
  // Phase 4 fields
  priority?: "P1" | "P2" | "P3" | "P4";
  priorityScore?: number;
  priorityReasons?: string[];
  responseStatus?: string;
  estimatedEtaMinutes?: number;
  assignedVolunteerId?: string;

  // AI fields
  source?: "MANUAL_SOS" | "AI_VOICE" | "AI_MOVEMENT" | "AI_FUSION";
  riskLevel?: string;
  riskScore?: number;
  distressType?: string;
  detectedKeywords?: string[];
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
      toast.success("Incident Accepted! Navigating to live tracking...");
      navigate({ to: `/volunteer/incidents/${id}` });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to accept alert");
    }
  }

  async function handleDecline(id: string) {
    const reason = window.prompt("Reason for declining dispatch (optional):") || "Volunteer unavailable";
    try {
      await rejectAlert(id, reason);
      toast.info("Incident declined. System will reassign to next available volunteer.");
      loadDashboard();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to decline alert");
    }
  }

  async function handleResolve(id: string) {
    const notes = window.prompt("Enter resolution notes (optional):") || "";
    try {
      await resolveAlert(id, notes);
      toast.success("Alert Resolved and Post-Incident Summary generated");
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
        title="Volunteer Dashboard"
        desc="AI Intelligent Emergency Response & Dispatch Hub."
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
          ) : (
            <MapPin className="size-4" />
          )}
          <span className="font-medium">
            {sharingLocation
              ? "Updating your GPS location for smart dispatch ranking..."
              : locationShared
              ? "Live GPS tracking active — eligible for proximity-ranked emergency assignments"
              : "Location not shared — please share location to receive nearby dispatches"}
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
              label="Active Emergencies"
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
              label="Resolved Incidents"
              value={(statistics?.resolvedAlerts ?? 0).toString()}
              icon={<CheckCircle2 className="size-4" />}
              tone="success"
            />
            <StatCard
              label="Total System Incidents"
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
          <div>
            <h2 className="text-lg font-semibold">Priority Emergency Dispatches</h2>
            <p className="text-xs text-muted-foreground">Ranked by distance, availability, and response metrics</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/volunteer/alerts">View all alerts</Link>
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
            <CheckCircle2 className="size-8 text-emerald-500" />
            <p className="text-sm font-medium">All clear! No active emergency dispatches right now.</p>
            <p className="text-xs text-muted-foreground">You will be immediately notified when a nearby incident occurs.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentAlerts.map((a) => (
              <div
                key={a._id}
                className={`flex flex-col md:flex-row md:items-center justify-between rounded-xl border p-4 gap-4 transition-all ${
                  a.priority === "P1" || a.riskLevel === "CRITICAL"
                    ? "border-red-400 bg-red-500/5 shadow-sm"
                    : a.priority === "P2" || a.riskLevel === "HIGH"
                    ? "border-amber-400 bg-amber-500/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex-1 min-w-0">
                  {/* Priority & Source Badges */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {/* Priority Badge */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full text-[11px] font-extrabold px-2.5 py-0.5 border ${
                        a.priority === "P1"
                          ? "bg-red-600 text-white border-red-700 animate-pulse"
                          : a.priority === "P2"
                          ? "bg-amber-500 text-white border-amber-600"
                          : a.priority === "P3"
                          ? "bg-blue-500 text-white border-blue-600"
                          : "bg-slate-500 text-white border-slate-600"
                      }`}
                    >
                      <ShieldAlert className="size-3" />
                      {a.priority || "P1"} CRITICAL
                    </span>

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
                        AI MULTI-MODAL FUSION
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-bold px-2 py-0.5 border border-red-300">
                        <Siren className="size-2.5" />
                        MANUAL SOS
                      </span>
                    )}

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold uppercase rounded px-2 py-0.5 ${
                        a.responseStatus === "RESPONDING"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                          : a.responseStatus === "NEARBY"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                          : a.responseStatus === "ARRIVED"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                          : a.status === "active"
                          ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                      }`}
                    >
                      {a.responseStatus || a.status}
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-foreground">
                    User: {a.user?.name || "Anonymous SafeHer User"}
                  </div>

                  {/* Location + time */}
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Phone: {a.user?.phone || "Private"} · Coordinates: {a.latitude?.toFixed(4)}, {a.longitude?.toFixed(4)} ·{" "}
                    {formatCreatedAt(a.createdAt)} · ID #{a._id.slice(-6)}
                  </div>

                  {/* Priority reasons */}
                  {a.priorityReasons && a.priorityReasons.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-red-600 dark:text-red-400">Detection Reasons:</span>
                      {a.priorityReasons.map((r, i) => (
                        <span key={i} className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
                          • {r}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* ETA if available */}
                  {a.estimatedEtaMinutes != null && (
                    <div className="mt-1 text-xs font-semibold text-primary inline-flex items-center gap-1">
                      <Clock className="size-3" /> Estimated ETA: ~{a.estimatedEtaMinutes} min
                    </div>
                  )}
                </div>

                {/* Response Actions */}
                <div className="flex flex-row md:flex-col items-center md:items-end gap-2 shrink-0">
                  {a.status === "active" && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => handleAccept(a._id)}
                      >
                        Accept &amp; Respond
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDecline(a._id)}
                      >
                        <XCircle className="size-3.5 mr-1" />
                        Decline
                      </Button>
                    </div>
                  )}

                  {a.status === "accepted" && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={() => navigate({ to: `/volunteer/incidents/${a._id}` })}
                      >
                        Live Tracking <ArrowRight className="size-3.5 ml-1" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleResolve(a._id)}
                      >
                        Resolve
                      </Button>
                    </div>
                  )}

                  {a.status === "resolved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate({ to: `/volunteer/incidents/${a._id}` })}
                    >
                      View Summary
                    </Button>
                  )}
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