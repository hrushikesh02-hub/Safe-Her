import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Siren,
  ShieldAlert,
  Users,
  UserCheck,
  CheckCircle2,
  Clock,
  Activity,
  Bot,
  MapPin,
  Eye,
  Radio,
  ArrowRight,
  RefreshCw,
  Phone,
  Navigation,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import {
  getDashboardStats,
  getActiveAlerts,
  getRecentActivities,
  getResponseAnalytics,
} from "@/services/adminService";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/dashboard")({ component: AdminDash });

function AdminDash() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVolunteers: 0,
    activeAlerts: 0,
    criticalIncidents: 0,
    respondersActive: 0,
    pendingVerifications: 0,
    resolvedAlerts: 0,
    resolvedToday: 0,
  });

  const [activeIncidents, setActiveIncidents] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");
  const pollRef = useRef<any>(null);

  useEffect(() => {
    loadAllData();
    pollRef.current = setInterval(() => {
      loadAllData(true);
    }, 8000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function loadAllData(silent = false) {
    if (!silent) setLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        if (!silent) toast.error("No active session. Please log in as Admin.");
        return;
      }

      const results = await Promise.allSettled([
        getDashboardStats(),
        getActiveAlerts(),
        getRecentActivities(),
        getResponseAnalytics(),
      ]);

      const [statsRes, alertsRes, actRes, analyticsRes] = results;

      if (statsRes.status === "fulfilled" && statsRes.value?.data?.data) {
        setStats(statsRes.value.data.data);
      }
      if (alertsRes.status === "fulfilled" && alertsRes.value?.data?.data) {
        setActiveIncidents(alertsRes.value.data.data);
      }
      if (actRes.status === "fulfilled" && actRes.value?.data?.data) {
        setRecentActivities(actRes.value.data.data);
      }
      if (analyticsRes.status === "fulfilled" && analyticsRes.value?.data?.data) {
        setAnalytics(analyticsRes.value.data.data);
      }

      const anyRejected = results.some((r) => r.status === "rejected");
      if (anyRejected && !silent) {
        const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
        const status = rejected?.reason?.response?.status;
        if (status === 401 || status === 403) {
          toast.error("Access denied or session expired. Please log in again as Admin.");
        }
      }

      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err: any) {
      if (!silent) toast.error("Failed to sync command center data");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Live Status & Manual Refresh */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Emergency Command Center
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time incident dispatch control, responder coordination & active distress monitoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs text-muted-foreground hidden sm:inline-block">
              Live sync: <span className="font-semibold text-foreground">{lastRefreshed}</span>
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadAllData(false)}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Top-Level Real-Time Command Center Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="ACTIVE EMERGENCIES"
          value={stats.activeAlerts.toString()}
          icon={<Siren className="size-5" />}
          tone="emergency"
        />
        <StatCard
          label="CRITICAL P1 ALERTS"
          value={stats.criticalIncidents.toString()}
          icon={<ShieldAlert className="size-5 text-red-600" />}
          tone="emergency"
        />
        <StatCard
          label="RESPONDERS ACTIVE"
          value={stats.respondersActive.toString()}
          icon={<Radio className="size-5 text-blue-600" />}
          tone="warning"
        />
        <StatCard
          label="PENDING VERIFICATIONS"
          value={stats.pendingVerifications.toString()}
          icon={<UserCheck className="size-5" />}
        />
        <StatCard
          label="RESOLVED TODAY"
          value={stats.resolvedToday.toString()}
          icon={<CheckCircle2 className="size-5 text-emerald-600" />}
          tone="success"
        />
      </div>

      {/* Prominent ACTIVE EMERGENCIES Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Siren className="size-5 text-red-600 animate-pulse" />
            <h2 className="text-lg font-bold text-foreground">
              Active Emergencies ({activeIncidents.length})
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/admin/monitoring" })}
            className="text-xs text-primary font-semibold hover:underline"
          >
            Open Live Map Monitor &rarr;
          </Button>
        </div>

        {activeIncidents.length === 0 ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
            <CheckCircle2 className="size-10 text-emerald-600 mx-auto mb-2" />
            <h3 className="font-semibold text-base text-foreground">All Clear & Safe</h3>
            <p className="text-xs text-muted-foreground mt-1">
              No active distress incidents at this moment. The system is actively listening for emergency signals.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeIncidents.map((incident: any) => {
              const isP1 = incident.priority === "P1" || incident.riskLevel === "CRITICAL";
              return (
                <div
                  key={incident._id}
                  className={`rounded-2xl border p-5 shadow-sm transition-all flex flex-col justify-between ${
                    isP1
                      ? "border-red-500/60 bg-red-500/5 ring-1 ring-red-500/20"
                      : "border-amber-400/60 bg-amber-500/5"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Priority & State */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-black px-2.5 py-1 rounded-full ${
                          isP1 ? "bg-red-600 text-white animate-pulse" : "bg-amber-500 text-white"
                        }`}
                      >
                        🚨 {incident.priority || "P1"} — {incident.riskLevel || "CRITICAL"}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-card border text-foreground">
                        {incident.responseStatus || incident.status}
                      </span>
                    </div>

                    {/* Metadata summary */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Incident: #{incident._id.slice(-6)}</span>
                        <span className="font-bold text-foreground">
                          Risk: {incident.riskScore || incident.finalRiskScore || 90}/100
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-foreground mt-1">
                        {incident.user?.name || "SafeHer User in Distress"}
                      </h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="size-3 text-red-500 shrink-0" />
                        {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)} ({incident.source})
                      </p>
                    </div>

                    {/* Responder block */}
                    <div className="rounded-xl border bg-card/80 p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Assigned Responder:</span>
                        <span className="font-semibold text-primary">
                          {incident.acceptedBy?.name ||
                            incident.assignedVolunteerId?.name ||
                            incident.assignedVolunteerName ||
                            "Searching candidate..."}
                        </span>
                      </div>
                      {incident.estimatedEtaMinutes != null && (
                        <div className="flex items-center justify-between text-emerald-600">
                          <span>Estimated ETA:</span>
                          <span className="font-bold">~{incident.estimatedEtaMinutes} min</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t flex items-center gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                      onClick={() => navigate({ to: "/admin/monitoring" })}
                    >
                      <Radio className="size-3.5 mr-1" />
                      MONITOR LIVE
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => navigate({ to: "/admin/monitoring" })}
                    >
                      <Eye className="size-3.5 mr-1" />
                      VIEW
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Grid: AI Dispatch Matrix & Live Responder Activity Log */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Phase 4 AI Emergency Dispatch Matrix */}
        {analytics && (
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h3 className="font-semibold text-lg flex items-center justify-between mb-4">
              <span className="flex items-center gap-2">
                <Bot className="size-5 text-primary" /> AI Emergency Dispatch Matrix
              </span>
              <span className="text-xs text-muted-foreground font-normal">Real-Time Performance</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
              <div className="bg-muted/40 p-3 rounded-xl border">
                <span className="text-muted-foreground block">P1 Critical Cases</span>
                <span className="text-xl font-extrabold text-red-600">{analytics.priorityBreakdown?.P1 || 0}</span>
              </div>
              <div className="bg-muted/40 p-3 rounded-xl border">
                <span className="text-muted-foreground block">P2 High Priority</span>
                <span className="text-xl font-extrabold text-amber-600">{analytics.priorityBreakdown?.P2 || 0}</span>
              </div>
              <div className="bg-muted/40 p-3 rounded-xl border">
                <span className="text-muted-foreground block">Avg Assignment</span>
                <span className="text-xl font-extrabold text-foreground">{analytics.summary?.avgAssignmentFormatted || "42s"}</span>
              </div>
              <div className="bg-muted/40 p-3 rounded-xl border">
                <span className="text-muted-foreground block">Acceptance Rate</span>
                <span className="text-xl font-extrabold text-emerald-600">{analytics.summary?.acceptanceRate || 96}%</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground border-t pt-3 flex items-center justify-between">
              <span>Average Total Resolution Time:</span>
              <span className="font-bold text-foreground">{analytics.summary?.avgResponseFormatted || "3m 12s"}</span>
            </div>
          </div>
        )}

        {/* Live Responder Activity Log */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-lg flex items-center gap-2">
            <Activity className="size-5 text-primary" /> Live Responder Operations Log
          </h3>

          {recentActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No recent responder activity logged.</p>
          ) : (
            <div className="space-y-3">
              {recentActivities.slice(0, 5).map((act: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 rounded-xl border p-3 text-sm">
                  <div className="size-2 rounded-full bg-primary mt-1.5 shrink-0 animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground text-xs">{act.title}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(act.time).toLocaleTimeString()} · {new Date(act.time).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}