import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  ShieldAlert,
  Bot,
  Activity,
  Siren,
  Sparkles,
  Phone,
  User as UserIcon,
  Calendar,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import MapView from "@/components/MapView";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAlertById,
  acceptAlert,
  rejectAlert,
  startResponse,
  markNearby,
  markArrived,
  resolveAlert,
  updateResponderLiveLocation,
  AlertDetail,
  TimelineEvent,
} from "@/services/volunteerService";

export const Route = createFileRoute("/volunteer/incidents/$id")({
  component: IncidentDetails,
});

const POLL_INTERVAL_MS = 4000;

function IncidentDetails() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [alert, setAlert] = useState<AlertDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [liveLocationWatcher, setLiveLocationWatcher] = useState<number | null>(null);

  const isMountedRef = useRef(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const loadAlert = useCallback(
    async (isBackground = false) => {
      if (!isBackground) {
        setLoading(true);
      }

      try {
        const response = await getAlertById(id);
        if (!isMountedRef.current) return;

        setAlert(response.data.data);

        if (response.data.data.status === "resolved") {
          clearPolling();
        }
      } catch (error: any) {
        if (!isMountedRef.current) return;
        const status = error?.response?.status;

        if (status === 401) {
          clearPolling();
          toast.error("Session expired. Please log in again.");
          navigate({ to: "/login" });
          return;
        }

        if (!isBackground) {
          toast.error("Failed to load incident details");
        }
      } finally {
        if (!isBackground && isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [id, navigate, clearPolling]
  );

  useEffect(() => {
    isMountedRef.current = true;
    loadAlert(false);

    pollRef.current = setInterval(() => {
      loadAlert(true);
    }, POLL_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      clearPolling();
      if (liveLocationWatcher != null) {
        navigator.geolocation.clearWatch(liveLocationWatcher);
      }
    };
  }, [loadAlert, clearPolling, liveLocationWatcher]);

  // Live GPS tracking when responding
  useEffect(() => {
    if (
      alert &&
      (alert.responseStatus === "RESPONDING" ||
        alert.responseStatus === "NEARBY" ||
        alert.status === "accepted") &&
      navigator.geolocation &&
      liveLocationWatcher == null
    ) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          updateResponderLiveLocation(id, pos.coords.latitude, pos.coords.longitude).catch((e) =>
            console.warn("Live location sync failed:", e?.message)
          );
        },
        (err) => console.warn("Watch position error:", err),
        { enableHighAccuracy: true, timeout: 8000 }
      );
      setLiveLocationWatcher(watchId);
    }
  }, [alert, id, liveLocationWatcher]);

  async function handleAccept() {
    setActionLoading(true);
    try {
      await acceptAlert(id);
      toast.success("Emergency Dispatch Accepted! You are now responding.");
      loadAlert(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to accept dispatch");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStartResponse() {
    setActionLoading(true);
    try {
      await startResponse(id);
      toast.success("Response Started. Live GPS routing enabled.");
      loadAlert(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to start response");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMarkNearby() {
    setActionLoading(true);
    try {
      await markNearby(id);
      toast.success("Marked Nearby. Incident user notified of your proximity.");
      loadAlert(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMarkArrived() {
    setActionLoading(true);
    try {
      await markArrived(id);
      toast.success("Marked Arrived on Scene. Providing on-site support.");
      loadAlert(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to mark arrived");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResolve() {
    const notes = window.prompt("Enter incident resolution notes (optional):") || "";
    setActionLoading(true);
    try {
      await resolveAlert(id, notes);
      toast.success("Incident successfully resolved! AI summary formulated.");
      loadAlert(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to resolve incident");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading && !alert) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground animate-pulse">Loading incident coordination center...</p>
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive font-semibold">Incident record not found.</p>
        <Button onClick={() => navigate({ to: "/volunteer/dashboard" })} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const timeline = alert.responseTimeline || [];
  const statusSteps = [
    { key: "NOTIFIED", label: "Notified" },
    { key: "ASSIGNED", label: "Assigned" },
    { key: "RESPONDING", label: "En Route" },
    { key: "NEARBY", label: "Nearby (<300m)" },
    { key: "ARRIVED", label: "On Scene" },
    { key: "RESOLVED", label: "Resolved" },
  ];

  const currentStatus = alert.responseStatus || (alert.status === "resolved" ? "RESOLVED" : alert.status === "accepted" ? "RESPONDING" : "ASSIGNED");

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Incident #${alert._id.slice(-6)}`}
        desc={`Emergency Response Coordination Hub — ${alert.source}`}
        action={
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                alert.priority === "P1"
                  ? "bg-red-600 text-white animate-pulse"
                  : alert.priority === "P2"
                  ? "bg-amber-500 text-white"
                  : "bg-blue-500 text-white"
              }`}
            >
              {alert.priority || "P1"} PRIORITY
            </span>
            <StatusBadge status={alert.status === "resolved" ? "Resolved" : alert.status === "accepted" ? "In Progress" : "Pending"} />
          </div>
        }
      />

      {/* State Machine Stepper */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Response State Machine
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {statusSteps.map((s, idx) => {
            const isPassed =
              statusSteps.findIndex((x) => x.key === currentStatus) >= idx ||
              alert.status === "resolved";
            const isCurrent = currentStatus === s.key;
            return (
              <div
                key={s.key}
                className={`p-2.5 rounded-lg border text-center text-xs font-semibold transition-all ${
                  isCurrent
                    ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                    : isPassed
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-border text-muted-foreground opacity-60"
                }`}
              >
                <div className="text-[10px] text-muted-foreground">Step {idx + 1}</div>
                <div>{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary Actions & Info Banner */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Map & Location */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <MapPin className="size-5 text-red-500" /> Emergency Incident Location
              </h2>
              {alert.estimatedEtaMinutes != null && (
                <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Clock className="size-3.5" /> Estimated ETA: ~{alert.estimatedEtaMinutes} min
                </span>
              )}
            </div>

            <div className="h-72 w-full rounded-xl overflow-hidden border">
              <MapView latitude={alert.latitude} longitude={alert.longitude} />
            </div>

            {/* Quick Actions Row */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {alert.status === "active" && (
                <Button
                  onClick={handleAccept}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                >
                  <CheckCircle2 className="size-4 mr-2" />
                  Accept Emergency Assignment
                </Button>
              )}

              {alert.status === "accepted" && alert.responseStatus !== "ARRIVED" && (
                <>
                  <Button
                    onClick={handleStartResponse}
                    disabled={actionLoading || alert.responseStatus === "RESPONDING"}
                    variant="outline"
                    className="flex-1"
                  >
                    <Navigation className="size-4 mr-2 text-primary" />
                    En Route Navigation
                  </Button>
                  <Button
                    onClick={handleMarkNearby}
                    disabled={actionLoading || alert.responseStatus === "NEARBY"}
                    variant="outline"
                    className="flex-1"
                  >
                    <MapPin className="size-4 mr-2 text-amber-500" />
                    Mark Proximity Nearby (&lt;300m)
                  </Button>
                  <Button
                    onClick={handleMarkArrived}
                    disabled={actionLoading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1"
                  >
                    <CheckCircle2 className="size-4 mr-2" />
                    Mark Arrived on Scene
                  </Button>
                </>
              )}

              {alert.status !== "resolved" && (
                <Button
                  onClick={handleResolve}
                  disabled={actionLoading}
                  variant="destructive"
                  className="flex-1"
                >
                  Resolve Incident
                </Button>
              )}

              <Button asChild variant="outline">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${alert.latitude},${alert.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Google Maps
                </a>
              </Button>
            </div>
          </div>

          {/* AI Structured Post-Incident Summary (If Resolved) */}
          {alert.resolutionSummary && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-6 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300 mb-3">
                <Sparkles className="size-5" /> AI Incident Resolution Summary
              </div>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Incident Type</span>
                  <div className="font-semibold">{alert.resolutionSummary.incidentType}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Priority / Risk</span>
                  <div className="font-semibold text-red-600">
                    {alert.resolutionSummary.priority} (Initial Risk: {alert.resolutionSummary.initialRisk}/100)
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Assignment Response Duration</span>
                  <div className="font-semibold">{alert.resolutionSummary.assignmentDurationSec} seconds</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Total Response Duration</span>
                  <div className="font-semibold">
                    {Math.floor(alert.resolutionSummary.totalResponseDurationSec / 60)}m{" "}
                    {alert.resolutionSummary.totalResponseDurationSec % 60}s
                  </div>
                </div>
              </div>

              {alert.resolutionSummary.mainFactors && alert.resolutionSummary.mainFactors.length > 0 && (
                <div className="mt-4">
                  <span className="text-xs text-muted-foreground font-semibold">Primary Risk Factors:</span>
                  <ul className="list-disc list-inside text-xs mt-1 space-y-0.5 text-foreground/80">
                    {alert.resolutionSummary.mainFactors.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Response Event Timeline */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
              <Clock className="size-4 text-primary" /> Incident Response Timeline
            </h3>
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events recorded yet.</p>
            ) : (
              <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {timeline.map((evt, idx) => (
                  <div key={idx} className="relative pl-8 text-sm">
                    <div className="absolute left-1.5 top-1 size-3.5 rounded-full bg-primary border-2 border-background ring-2 ring-primary/20" />
                    <div className="flex items-center justify-between flex-wrap">
                      <span className="font-semibold text-foreground">{evt.event}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{evt.description}</p>
                    {evt.actor && (
                      <span className="inline-block mt-1 text-[10px] text-primary/80 bg-primary/5 px-2 py-0.5 rounded">
                        Actor: {evt.actor}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Victim & AI Detection Context */}
        <div className="space-y-6">
          {/* User Details Card */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
              <UserIcon className="size-4 text-primary" /> User in Distress
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Full Name</span>
                <div className="font-semibold">{alert.user?.name || "Anonymous SafeHer User"}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Emergency Contact Phone</span>
                <div className="font-semibold text-primary flex items-center gap-1.5 mt-0.5">
                  <Phone className="size-3.5" />
                  <a href={`tel:${alert.user?.phone}`}>{alert.user?.phone || "Not provided"}</a>
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Created Timestamp</span>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Calendar className="size-3.5" /> {new Date(alert.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* AI Intelligence & Priority Insights */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
              <Bot className="size-4 text-purple-500" /> AI Detection Signals
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Distress Source:</span>
                <span className="font-semibold">{alert.source}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Priority Classification:</span>
                <span className="font-bold text-red-600">{alert.priority || "P1"} ({alert.priorityScore || 85}/100)</span>
              </div>
              {alert.distressType && (
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Voice Acoustic Distress:</span>
                  <span className="font-semibold capitalize text-purple-600">{alert.distressType}</span>
                </div>
              )}
              {alert.movementAnomalyType && (
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Movement Anomaly:</span>
                  <span className="font-semibold capitalize text-blue-600">{alert.movementAnomalyType}</span>
                </div>
              )}
              {alert.routeDeviated && (
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Route Corridor:</span>
                  <span className="font-semibold text-amber-600">Deviated trajectory</span>
                </div>
              )}
              {alert.detectedKeywords && alert.detectedKeywords.length > 0 && (
                <div className="py-1">
                  <span className="text-muted-foreground block mb-1">Verbal Keywords:</span>
                  <div className="flex flex-wrap gap-1">
                    {alert.detectedKeywords.map((k, i) => (
                      <span key={i} className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold text-[10px]">
                        "{k}"
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Explainable AI Reasons */}
            {alert.priorityReasons && alert.priorityReasons.length > 0 && (
              <div className="mt-4 pt-3 border-t">
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1">Explainable AI Reasons:</span>
                <ul className="text-[11px] space-y-1 text-muted-foreground">
                  {alert.priorityReasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-red-500 font-bold">•</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}