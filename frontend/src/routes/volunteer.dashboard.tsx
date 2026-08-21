import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CheckCircle2,
  Activity,
  Clock,
  MapPin,
  Siren,
  ShieldCheck,
  ArrowRight,
  XCircle,
  Navigation,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getVolunteerDashboard,
  acceptAlert,
  rejectAlert,
  resolveAlert,
  updateVolunteerLocation,
} from "@/services/volunteerService";
import { toast } from "sonner";
import { UserAvatar } from "@/components/ui/UserAvatar";

export const Route = createFileRoute("/volunteer/dashboard")({
  component: VolDashboard,
});

const REFRESH_INTERVAL_MS = 3000;

interface VolunteerProfile {
  id: string;
  name: string;
  isVerified: boolean;
  profileImage?: string;
}

interface VolunteerStats {
  totalAlerts: number;
  activeAlerts: number;
  assignedToMeAlerts?: number;
  acceptedAlerts: number;
  resolvedAlerts: number;
}

interface AlertItem {
  _id: string;
  user?: { _id?: string; name?: string; phone?: string; profileImage?: string };
  latitude: number;
  longitude: number;
  status: "active" | "accepted" | "resolved";
  createdAt: string;
  priority?: "P1" | "P2" | "P3" | "P4";
  responseStatus?: string;
  estimatedEtaMinutes?: number;
  assignedVolunteerId?: any;
  acceptedBy?: any;
  source?: string;
  riskLevel?: string;
}

function VolDashboard() {
  const navigate = useNavigate();

  const [volunteer, setVolunteer] = useState<VolunteerProfile | null>(null);
  const [stats, setStats] = useState<VolunteerStats>({
    totalAlerts: 0,
    activeAlerts: 0,
    acceptedAlerts: 0,
    resolvedAlerts: 0,
  });
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationSharing, setLocationSharing] = useState(false);

  const locWatchRef = useRef<number | null>(null);

  const loadData = useCallback(async (silent = false) => {
    try {
      const res = await getVolunteerDashboard();
      if (res.data?.data) {
        setVolunteer(res.data.data.volunteer);
        setStats(res.data.data.statistics);
        setAlerts(res.data.data.recentAlerts || []);
      }
    } catch {
      if (!silent) toast.error("Failed to sync volunteer dashboard.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadData]);

  // Location sharing toggle
  function toggleLocation(checked: boolean) {
    setLocationSharing(checked);
    if (checked) {
      if (navigator.geolocation) {
        locWatchRef.current = navigator.geolocation.watchPosition(
          async (pos) => {
            try {
              await updateVolunteerLocation(pos.coords.latitude, pos.coords.longitude);
            } catch {}
          },
          () => {
            toast.error("Please enable GPS Location permission.");
            setLocationSharing(false);
          },
          { enableHighAccuracy: true }
        );
        toast.success("Live location sharing active for dispatch.");
      }
    } else {
      if (locWatchRef.current) navigator.geolocation.clearWatch(locWatchRef.current);
      toast.info("Location sharing paused.");
    }
  }

  async function handleAccept(id: string) {
    try {
      await acceptAlert(id);
      toast.success("Emergency Accepted! Navigate to incident.");
      await loadData(true);
      navigate({ to: "/volunteer/incidents/$id", params: { id } });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to accept incident.");
    }
  }

  async function handleReject(id: string) {
    try {
      await rejectAlert(id, "UNAVAILABLE");
      toast.info("Incident rejected. Reassigning to nearest responder.");
      await loadData(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reject.");
    }
  }

  // Find priority alert assigned to this volunteer or active nearby (exclude resolved)
  const activeEmergency = alerts.find((a) => {
    if (a.status === "resolved") return false;
    const volId = volunteer?.id;
    const acceptedById = typeof a.acceptedBy === "object" ? a.acceptedBy?._id : a.acceptedBy;
    const assignedId = typeof a.assignedVolunteerId === "object" ? a.assignedVolunteerId?._id : a.assignedVolunteerId;

    if (a.status === "accepted" && volId && String(acceptedById) === String(volId)) {
      return true;
    }
    if (a.status === "active") {
      if (!assignedId || (volId && String(assignedId) === String(volId))) {
        return true;
      }
    }
    return false;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <Link to="/volunteer/profile" title="View profile">
            <UserAvatar
              src={volunteer?.profileImage}
              name={volunteer?.name || "Volunteer"}
              role="volunteer"
              size="lg"
              className="border-2 border-emerald-200 shadow-xs hover:ring-2 hover:ring-emerald-400 transition-all cursor-pointer"
            />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Volunteer Responder Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {volunteer?.isVerified ? "Verified Community Responder" : "Verification in progress"}
            </p>
          </div>
        </div>

        {/* Location toggle */}
        <div className="flex items-center gap-3 bg-card px-4 py-2 rounded-xl border border-border/80 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Navigation className="size-3.5 text-indigo-600" />
            <span>Ready for Dispatches</span>
          </div>
          <Switch checked={locationSharing} onCheckedChange={toggleLocation} />
        </div>
      </div>

      {/* Priority Action Card: If there is an active emergency */}
      {activeEmergency && (
        <div className="bg-red-50 border-2 border-red-500 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-red-600 animate-ping" />
              <span className="font-extrabold text-sm text-red-700 uppercase tracking-wider">
                {activeEmergency.status === "accepted" ? "ACTIVE RESPONSE IN PROGRESS" : "NEW EMERGENCY ALERT"}
              </span>
            </div>
            <Badge variant="destructive" className="font-bold text-xs">
              {activeEmergency.priority || "P1"}
            </Badge>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-red-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Person in Need:</span>
              <div className="flex items-center gap-2">
                <UserAvatar
                  src={activeEmergency.user?.profileImage}
                  name={activeEmergency.user?.name || "SafeHer User"}
                  role="user"
                  size="xs"
                />
                <span className="font-bold text-foreground">{activeEmergency.user?.name || "SafeHer User"}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Source:</span>
              <span className="font-medium text-foreground">
                {activeEmergency.source ? activeEmergency.source.replace("_", " ") : "Emergency SOS"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Incident ID:</span>
              <span className="font-mono text-foreground font-semibold">#{activeEmergency._id.slice(-6)}</span>
            </div>
            {activeEmergency.estimatedEtaMinutes && (
              <div className="flex justify-between pt-1 border-t border-slate-100">
                <span className="text-muted-foreground">Estimated ETA:</span>
                <span className="font-extrabold text-indigo-700">~{activeEmergency.estimatedEtaMinutes} min</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {activeEmergency.status === "active" ? (
              <>
                <Button
                  size="lg"
                  onClick={() => handleAccept(activeEmergency._id)}
                  className="flex-1 font-bold text-xs h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                >
                  <CheckCircle2 className="size-4 mr-1.5" /> Accept & Navigate
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => handleReject(activeEmergency._id)}
                  className="flex-1 font-bold text-xs h-11 border-red-300 text-red-700 hover:bg-red-100 rounded-xl"
                >
                  <XCircle className="size-4 mr-1.5" /> Reject (Unavailable)
                </Button>
              </>
            ) : (
              <Link to="/volunteer/incidents/$id" params={{ id: activeEmergency._id }} className="w-full">
                <Button size="lg" className="w-full font-bold text-xs h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                  Open Active Incident Controls &rarr;
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Overview Statistics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-2xl border border-border/80 shadow-xs text-center">
          <div className="text-xs text-muted-foreground font-medium">Assigned Alerts</div>
          <div className="text-2xl font-bold text-foreground mt-1">{stats.totalAlerts}</div>
        </div>
        <div className="bg-card p-4 rounded-2xl border border-border/80 shadow-xs text-center">
          <div className="text-xs text-muted-foreground font-medium">Active Right Now</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{stats.activeAlerts}</div>
        </div>
        <div className="bg-card p-4 rounded-2xl border border-border/80 shadow-xs text-center">
          <div className="text-xs text-muted-foreground font-medium">Accepted by You</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{stats.acceptedAlerts}</div>
        </div>
        <div className="bg-card p-4 rounded-2xl border border-border/80 shadow-xs text-center">
          <div className="text-xs text-muted-foreground font-medium">Resolved Safely</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.resolvedAlerts}</div>
        </div>
      </div>

      {/* Recent Dispatches List */}
      <div className="bg-card rounded-2xl border border-border/80 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-foreground">Recent Incidents Feed</h3>
          <Link to="/volunteer/alerts" className="text-xs text-indigo-600 font-semibold hover:underline">
            View All Alerts
          </Link>
        </div>

        {alerts.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            <CheckCircle2 className="size-6 text-emerald-500 mx-auto mb-1.5 opacity-80" />
            <p className="font-medium text-foreground">No active dispatches</p>
            <p className="mt-0.5">Keep your location turned on to receive emergency alerts.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {alerts.slice(0, 5).map((a) => (
              <div key={a._id} className="py-3 flex items-center justify-between text-xs first:pt-0 last:pb-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">
                      {a.user?.name || "SafeHer User"}
                    </span>
                    <Badge variant={a.status === "resolved" ? "secondary" : "destructive"} className="text-[10px]">
                      {a.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · #{a._id.slice(-6)}
                  </p>
                </div>

                <Link to="/volunteer/incidents/$id" params={{ id: a._id }}>
                  <Button size="sm" variant="outline" className="h-8 text-xs font-semibold">
                    Details &rarr;
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}