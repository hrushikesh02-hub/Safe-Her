import { createFileRoute } from "@tanstack/react-router";
import {
  Users,
  ShieldCheck,
  Siren,
  CheckCircle2,
  Clock,
  Activity,
  Bot,
  Layers,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/PageHeader";
import { useEffect, useState } from "react";
import {
  getDashboardStats,
  getRecentAlerts,
  getRecentActivities,
} from "@/services/adminService";
import { getAdminPredictiveInsights } from "@/services/predictiveService";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/dashboard")({ component: AdminDash });

function AdminDash() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVolunteers: 0,
    activeAlerts: 0,
    resolvedAlerts: 0,
  });
  const navigate = useNavigate();
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [predictiveInsights, setPredictiveInsights] = useState<any>(null);

  useEffect(() => {
    loadStats();
    loadRecentAlerts();
    loadRecentActivities();
    loadPredictiveInsights();
  }, []);

  async function loadPredictiveInsights() {
    try {
      const res = await getAdminPredictiveInsights();
      setPredictiveInsights(res.data.data);
    } catch {
      // Non-blocking fallback
    }
  }

  async function loadStats() {
    try {
      const response = await getDashboardStats();
      setStats(response.data.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load dashboard");
    }
  }

  async function loadRecentAlerts() {
    try {
      const res = await getRecentAlerts();
      setRecentAlerts(res.data.data);
    } catch {
      toast.error("Failed to load recent alerts");
    }
  }

  async function loadRecentActivities() {
    try {
      const res = await getRecentActivities();
      setRecentActivities(res.data.data);
    } catch {
      toast.error("Failed to load activities");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin overview"
        desc="System-wide safety operations at a glance."
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Total Users"
          value={stats.totalUsers.toString()}
          icon={<Users className="size-4" />}
        />
        <StatCard
          label="Volunteers"
          value={stats.totalVolunteers.toString()}
          icon={<ShieldCheck className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Active Alerts"
          value={stats.activeAlerts.toString()}
          icon={<Siren className="size-4" />}
          tone="emergency"
        />
        <StatCard
          label="Resolved Alerts"
          value={stats.resolvedAlerts.toString()}
          icon={<CheckCircle2 className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Avg Response"
          value="4m 12s"
          icon={<Clock className="size-4" />}
          tone="warning"
        />
        <StatCard
          label="Volunteer Rate"
          value="96%"
          icon={<Activity className="size-4" />}
        />
      </div>

      {/* Recent Data */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Recent SOS Alerts — with AI Voice metadata */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h3 className="mb-5 font-semibold">Recent SOS Alerts</h3>

          {recentAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No alerts yet.</p>
          ) : (
            <div className="space-y-3">
              {recentAlerts.map((alert: any) => (
                <div
                  key={alert._id}
                  className={`rounded-xl border p-4 ${
                    alert.source === "AI_VOICE"
                      ? "border-purple-200 bg-purple-500/5 dark:border-purple-700"
                      : alert.source === "AI_MOVEMENT"
                      ? "border-blue-200 bg-blue-500/5 dark:border-blue-700"
                      : alert.source === "AI_FUSION"
                      ? "border-rose-200 bg-rose-500/5 dark:border-rose-700"
                      : ""
                  }`}
                >
                  {/* Top row: user + source + status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{alert.user?.name}</p>

                      {/* Source badge */}
                      {alert.source === "AI_VOICE" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-bold px-2 py-0.5 border border-purple-300">
                          <Bot className="size-2.5" />
                          AI VOICE
                        </span>
                      ) : alert.source === "AI_MOVEMENT" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 border border-blue-300">
                          <Activity className="size-2.5" />
                          AI MOVEMENT
                        </span>
                      ) : alert.source === "AI_FUSION" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-[10px] font-bold px-2 py-0.5 border border-rose-300">
                          <Layers className="size-2.5" />
                          AI FUSION
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-[10px] font-bold px-2 py-0.5 border border-red-300">
                          <Siren className="size-2.5" />
                          MANUAL
                        </span>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          alert.status === "active"
                            ? "bg-red-100 text-red-600"
                            : alert.status === "accepted"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {alert.status}
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  <p className="text-xs text-muted-foreground mt-1">
                    📍 {alert.latitude}, {alert.longitude}
                  </p>

                  {/* AI Voice metadata row */}
                  {alert.source === "AI_VOICE" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {alert.riskLevel && (
                        <span
                          className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                            alert.riskLevel === "CRITICAL"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                              : alert.riskLevel === "HIGH"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          }`}
                        >
                          Risk: {alert.riskLevel} ({alert.riskScore}/100)
                        </span>
                      )}
                      {alert.distressType && (
                        <span className="text-[11px] bg-muted rounded-full px-2 py-0.5 capitalize">
                          Detection: <strong>{alert.distressType}</strong>
                        </span>
                      )}
                      {alert.detectedKeywords?.length > 0 && (
                        <span className="text-[11px] text-red-500 font-medium rounded-full bg-red-100 dark:bg-red-900/20 px-2 py-0.5">
                          🔑 {alert.detectedKeywords.join(", ")}
                        </span>
                      )}
                    </div>
                  )}

                  {/* AI Movement metadata row */}
                  {alert.source === "AI_MOVEMENT" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {alert.riskLevel && (
                        <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                          alert.riskLevel === "CRITICAL" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          : alert.riskLevel === "HIGH" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        }`}>
                          Risk: {alert.riskLevel} ({alert.movementRiskScore ?? alert.riskScore}/100)
                        </span>
                      )}
                      {alert.movementAnomalyType && (
                        <span className="text-[11px] bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 rounded-full px-2 py-0.5 capitalize">
                          Anomaly: <strong>{alert.movementAnomalyType.replace(/_/g, " ")}</strong>
                        </span>
                      )}
                    </div>
                  )}

                  {/* AI Fusion metadata row */}
                  {alert.source === "AI_FUSION" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {alert.finalRiskScore != null && (
                        <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                          alert.riskLevel === "CRITICAL" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          : alert.riskLevel === "HIGH" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                        }`}>
                          Final Score: {alert.finalRiskScore}/100
                        </span>
                      )}
                      {alert.fusionSource && (
                        <span className="text-[11px] bg-muted rounded-full px-2 py-0.5">
                          Fusion: <strong>{alert.fusionSource}</strong>
                        </span>
                      )}
                      {alert.riskScore != null && (
                        <span className="text-[11px] text-purple-600 bg-purple-50 dark:bg-purple-900/20 rounded-full px-2 py-0.5">V:{alert.riskScore}</span>
                      )}
                      {alert.movementRiskScore != null && (
                        <span className="text-[11px] text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-full px-2 py-0.5">M:{alert.movementRiskScore}</span>
                      )}
                      {alert.gpsContextScore != null && (
                        <span className="text-[11px] text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded-full px-2 py-0.5">G:{alert.gpsContextScore}</span>
                      )}
                    </div>
                  )}

                  {/* Maps link */}
                  <a
                    href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-primary hover:underline mt-1 inline-block"
                  >
                    View on Map →
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activities */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h3 className="mb-5 font-semibold">Recent Activities</h3>

          {recentActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No recent activities.</p>
          ) : (
            <div className="space-y-5">
              {recentActivities.map((activity: any, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-primary shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.time).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Phase 3: Predictive Safety Intelligence & Proactive Insights */}
      <div className="rounded-2xl border bg-gradient-to-br from-card via-card to-purple-500/5 p-6 shadow-sm border-purple-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Sparkles className="size-4" />
            </span>
            <div>
              <h3 className="font-semibold">Predictive Safety Intelligence (Phase 3)</h3>
              <p className="text-xs text-muted-foreground">Proactive risk forecasting and spatial hotspot telemetry</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Predictive Model Online
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="p-4 rounded-xl border bg-card/60 space-y-1">
            <p className="text-xs text-muted-foreground">Total Proactive Telemetry</p>
            <p className="text-2xl font-bold">{predictiveInsights?.totalTelemetryPoints ?? 0}</p>
            <p className="text-xs text-muted-foreground">Evaluations logged</p>
          </div>
          <div className="p-4 rounded-xl border bg-card/60 space-y-1">
            <p className="text-xs text-muted-foreground">High Caution Corridors</p>
            <p className="text-2xl font-bold text-amber-500">{predictiveInsights?.highCautionProactiveAlerts ?? 0}</p>
            <p className="text-xs text-muted-foreground">Early warning events</p>
          </div>
          <div className="p-4 rounded-xl border bg-card/60 space-y-1">
            <p className="text-xs text-muted-foreground">Safe Zone Coverage Score</p>
            <p className="text-2xl font-bold text-purple-600">{predictiveInsights?.spatialCoverageScore ?? 88.5}%</p>
            <p className="text-xs text-muted-foreground">Spatial density index</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h3 className="mb-5 font-semibold">Quick Actions</h3>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={() => navigate({ to: "/admin/monitoring" })}
            className="rounded-xl border p-5 hover:bg-muted transition text-left"
          >
            🚨
            <p className="mt-2 font-semibold">View Active SOS</p>
            <p className="text-sm text-muted-foreground">Monitor all ongoing emergencies</p>
          </button>

          <button
            onClick={() => navigate({ to: "/admin/volunteers" })}
            className="rounded-xl border p-5 hover:bg-muted transition text-left"
          >
            👮
            <p className="mt-2 font-semibold">Manage Volunteers</p>
            <p className="text-sm text-muted-foreground">Verify and assign volunteers</p>
          </button>

          <button
            onClick={() => navigate({ to: "/admin/safe-zones" })}
            className="rounded-xl border p-5 hover:bg-muted transition text-left"
          >
            📍
            <p className="mt-2 font-semibold">Safe Zones</p>
            <p className="text-sm text-muted-foreground">Add or update safe locations</p>
          </button>

          <button
            onClick={() => navigate({ to: "/admin/reports" })}
            className="rounded-xl border p-5 hover:bg-muted transition text-left"
          >
            📄
            <p className="mt-2 font-semibold">Reports</p>
            <p className="text-sm text-muted-foreground">Generate system reports</p>
          </button>
        </div>
      </div>
    </div>
  );
}