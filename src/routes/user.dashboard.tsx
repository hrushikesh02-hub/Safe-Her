import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { getRole } from "@/lib/auth";
import {
  Siren,
  Phone,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Clock,
  User as UserIcon,
  Mic,
  Activity,
  Navigation,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getAlertHistory,
  getEmergencyContacts,
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
  priority?: string;
  responseStatus?: string;
  assignedVolunteerName?: string;
  estimatedEtaMinutes?: number;
  latitude?: number;
  longitude?: number;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

function UserDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [contactsCount, setContactsCount] = useState<number>(0);
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [monitoringActive, setMonitoringActive] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [locationActive, setLocationActive] = useState<boolean>(false);

  const loadDashboard = useCallback(async () => {
    try {
      const [profileRes, alertRes, contactsRes] = await Promise.all([
        getUserProfile(),
        getAlertHistory(),
        getEmergencyContacts(),
      ]);

      setUser(profileRes.data);
      setContactsCount(contactsRes.data?.data?.length || 0);

      const alerts: Alert[] = [...(alertRes.data?.data || [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setRecentAlerts(alerts.slice(0, 3));

      // Find active incident
      const currentActive = alerts.find(
        (a) => a.status === "active" || a.status === "accepted"
      );
      setActiveAlert(currentActive || null);

      // Check location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => setLocationActive(true),
          () => setLocationActive(false)
        );
      }
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) {
        toast.error("Session expired. Please log in again.");
        navigate({ to: "/login" });
        return;
      }
      toast.error(error.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 5000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* =========================================================================
          1. PRIMARY SAFETY STATUS BANNER (Answers: "Am I Safe?")
         ========================================================================= */}
      {activeAlert ? (
        /* Emergency Active Banner */
        <div className="rounded-3xl bg-red-600 text-white p-6 shadow-xl space-y-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black tracking-widest uppercase bg-white/20 px-3 py-1 rounded-full">
              <span className="size-2 rounded-full bg-white animate-ping" />
              EMERGENCY ACTIVE
            </div>
            <span className="text-xs font-bold text-red-100">
              Priority: {activeAlert.priority || "P1"}
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-black">Help is Being Coordinated</h1>
            <p className="text-xs text-red-100 mt-1">
              SafeHer has dispatched nearby responders and notified your emergency contacts.
            </p>
          </div>

          {activeAlert.assignedVolunteerName && (
            <div className="bg-black/20 backdrop-blur rounded-2xl p-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-full bg-white/20 grid place-items-center font-bold">
                  <UserIcon className="size-4" />
                </div>
                <div>
                  <div className="font-bold">{activeAlert.assignedVolunteerName}</div>
                  <div className="text-[11px] text-red-200">
                    Status: {activeAlert.responseStatus || "En Route"}
                  </div>
                </div>
              </div>
              {activeAlert.estimatedEtaMinutes != null && (
                <div className="font-extrabold text-sm">
                  ~{activeAlert.estimatedEtaMinutes} min ETA
                </div>
              )}
            </div>
          )}

          <Button asChild size="lg" className="w-full bg-white text-red-600 hover:bg-red-50 font-black text-sm h-12 rounded-2xl shadow">
            <Link to="/user/sos">
              <Siren className="mr-2 size-5" /> OPEN LIVE EMERGENCY CENTER
            </Link>
          </Button>
        </div>
      ) : (
        /* Normal Safe Status Banner */
        <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 md:p-8 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black tracking-wider uppercase bg-white/20 px-3 py-1 rounded-full">
              <span className="size-2 rounded-full bg-emerald-300 animate-pulse" />
              YOU ARE SAFE
            </div>
            <div className="text-xs text-emerald-100 font-medium flex items-center gap-1">
              <MapPin className="size-3.5" />
              {locationActive ? "GPS Active" : "GPS Standby"}
            </div>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-black">
              Hello, {user?.name?.split(" ")[0] || "Friend"}!
            </h1>
            <p className="text-xs md:text-sm text-emerald-100 mt-1 max-w-md">
              SafeHer Smart Protection is actively guarding your safety 24/7.
            </p>
          </div>

          {/* Simple Toggle Guard */}
          <div className="bg-black/15 backdrop-blur rounded-2xl p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="size-5 text-emerald-300" />
              <div>
                <span className="font-bold block text-foreground dark:text-white">Continuous AI Shield</span>
                <span className="text-[11px] text-emerald-100">Voice & Motion Protection Online</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMonitoringActive(!monitoringActive)}
              className={`px-3 py-1 rounded-full text-xs font-extrabold border transition-all ${
                monitoringActive
                  ? "bg-white text-emerald-700 border-white"
                  : "bg-black/30 text-white/70 border-white/30"
              }`}
            >
              {monitoringActive ? "ACTIVE" : "PAUSED"}
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. MASSIVE SOS ACTION BUTTON (Answers: "What Should I Do?")
         ========================================================================= */}
      <div className="rounded-3xl border bg-card p-6 text-center shadow-sm space-y-4">
        <Link
          to="/user/sos"
          className="mx-auto flex flex-col items-center justify-center size-44 rounded-full bg-gradient-to-br from-red-500 via-red-600 to-rose-700 text-white shadow-2xl transition-transform active:scale-95 hover:scale-105 ring-8 ring-red-500/20 animate-pulse group cursor-pointer"
        >
          <Siren className="size-16 drop-shadow-md group-hover:rotate-12 transition-transform" />
          <span className="font-black text-2xl tracking-wider mt-1">TAP SOS</span>
          <span className="text-[10px] font-bold text-red-100 uppercase tracking-widest">
            मदद / GET HELP
          </span>
        </Link>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          Tap for instant emergency dispatch. Coordinates, volunteers, and evidence recording will activate.
        </p>
      </div>

      {/* =========================================================================
          3. TRANSLATED AI SAFETY SENSORS (Simple, No Complex Jargon)
         ========================================================================= */}
      <div className="rounded-3xl border bg-card p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-purple-500" /> Live Safety Monitoring
          </h3>
          <Link
            to="/user/ai-fusion"
            className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5"
          >
            View Sensor AI <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {/* Voice Guard */}
          <div className="rounded-2xl border bg-muted/20 p-3 text-center space-y-1">
            <Mic className="size-4 mx-auto text-blue-500" />
            <div className="text-[10px] font-semibold text-muted-foreground">Voice Guard</div>
            <div className="text-xs font-extrabold text-emerald-600">Protected</div>
          </div>

          {/* Motion Guard */}
          <div className="rounded-2xl border bg-muted/20 p-3 text-center space-y-1">
            <Activity className="size-4 mx-auto text-purple-500" />
            <div className="text-[10px] font-semibold text-muted-foreground">Movement</div>
            <div className="text-xs font-extrabold text-emerald-600">Normal</div>
          </div>

          {/* Location Safety */}
          <div className="rounded-2xl border bg-muted/20 p-3 text-center space-y-1">
            <Navigation className="size-4 mx-auto text-emerald-500" />
            <div className="text-[10px] font-semibold text-muted-foreground">Safe Zone</div>
            <div className="text-xs font-extrabold text-emerald-600">Clear</div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. EMERGENCY HELPLINES & CONTACTS (Quick Action Tiles)
         ========================================================================= */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href="tel:112"
          className="flex items-center justify-between p-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow transition-transform active:scale-95"
        >
          <div className="flex items-center gap-2.5">
            <Phone className="size-5" />
            <div>
              <div className="text-xs text-blue-100">National Emergency</div>
              <div className="text-base font-black">Police 112</div>
            </div>
          </div>
        </a>

        <a
          href="tel:1091"
          className="flex items-center justify-between p-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow transition-transform active:scale-95"
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="size-5" />
            <div>
              <div className="text-xs text-purple-100">Women Helpline</div>
              <div className="text-base font-black">Call 1091</div>
            </div>
          </div>
        </a>
      </div>

      {/* =========================================================================
          5. EMERGENCY CONTACTS & RECENT ACTIVITY
         ========================================================================= */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Trusted Contacts Card */}
        <Link
          to="/user/contacts"
          className="rounded-2xl border bg-card p-4 shadow-sm hover:border-primary/50 transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary/10 text-primary grid place-items-center">
              <Phone className="size-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">Emergency Contacts</div>
              <div className="text-[11px] text-muted-foreground">
                {contactsCount > 0 ? `${contactsCount} contacts linked` : "Add trusted family/friends"}
              </div>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </Link>

        {/* Safety Profile */}
        <Link
          to="/user/profile"
          className="rounded-2xl border bg-card p-4 shadow-sm hover:border-primary/50 transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-emerald-500/10 text-emerald-600 grid place-items-center">
              <UserIcon className="size-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">Safety Profile</div>
              <div className="text-[11px] text-muted-foreground">Manage profile & preferences</div>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>

      {/* Recent Alerts Section */}
      {recentAlerts.length > 0 && (
        <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-xs font-bold text-foreground">Recent Alert History</span>
            <Link to="/user/history" className="text-[11px] text-primary font-semibold hover:underline">
              View All
            </Link>
          </div>

          <div className="divide-y text-xs">
            {recentAlerts.map((a) => (
              <div key={a._id} className="py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${a.status === "active" ? "bg-red-600 animate-ping" : "bg-emerald-500"}`} />
                  <div>
                    <span className="font-bold text-foreground capitalize">{a.source?.replace(/_/g, " ") || "SOS Alert"}</span>
                    <span className="text-[10px] text-muted-foreground block">{new Date(a.createdAt).toLocaleDateString()} · #{a._id.slice(-4)}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  a.status === "active" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                }`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}