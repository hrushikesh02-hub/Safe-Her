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
  Mic,
  Activity,
  Navigation,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  User,
  Plus,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getAlertHistory,
  getEmergencyContacts,
  getUserProfile,
} from "@/services/userService";
import { toast } from "sonner";
import { UserAvatar } from "@/components/ui/UserAvatar";

export const Route = createFileRoute("/user/dashboard")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const role = getRole();
    if (role !== "user") {
      throw redirect({ to: "/login" });
    }
  },
  component: UserDashboard,
});

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  profileImage?: string;
}

interface AlertItem {
  _id: string;
  status: "active" | "accepted" | "resolved";
  priority?: string;
  source?: string;
  assignedVolunteerName?: string;
  estimatedEtaMinutes?: number;
  createdAt: string;
}

function UserDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [contactsCount, setContactsCount] = useState<number>(0);
  const [activeAlert, setActiveAlert] = useState<AlertItem | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<AlertItem[]>([]);
  const [isShieldActive, setIsShieldActive] = useState<boolean>(true);
  const [locationEnabled, setLocationEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  const loadDashboard = useCallback(async () => {
    try {
      const [profileRes, alertRes, contactsRes] = await Promise.all([
        getUserProfile(),
        getAlertHistory(),
        getEmergencyContacts(),
      ]);

      setUser(profileRes.data);
      setContactsCount(contactsRes.data?.data?.length || 0);

      const alerts: AlertItem[] = [...(alertRes.data?.data || [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setRecentAlerts(alerts.slice(0, 4));

      // Check for active incident
      const currentActive = alerts.find(
        (a) => a.status === "active" || a.status === "accepted"
      );
      setActiveAlert(currentActive || null);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => setLocationEnabled(true),
          () => setLocationEnabled(false)
        );
      }
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) {
        toast.error("Session expired. Please log in again.");
        navigate({ to: "/login" });
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 8000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  const firstName = user?.name ? user.name.split(" ")[0] : "there";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 1. Main Greeting & Status Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
        <div className="flex items-center gap-3.5">
          <Link to="/user/profile" title="View profile">
            <UserAvatar
              src={user?.profileImage}
              name={user?.name || "User"}
              role="user"
              size="lg"
              className="border-2 border-indigo-200 shadow-xs hover:ring-2 hover:ring-indigo-400 transition-all cursor-pointer"
            />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeAlert ? "An emergency response is currently active." : "You're safe right now."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-semibold">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Safety monitoring active</span>
          </div>
        </div>
      </div>

      {/* 2. Active Emergency Alert Banner (if incident is ongoing) */}
      {activeAlert && (
        <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-4 sm:p-5 text-red-950 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Siren className="size-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-red-700">EMERGENCY ACTIVE</span>
                  <Badge variant="destructive" className="text-[10px] uppercase">
                    {activeAlert.priority || "P1"}
                  </Badge>
                </div>
                <p className="text-xs text-red-800 mt-1">
                  {activeAlert.assignedVolunteerName
                    ? `Responder ${activeAlert.assignedVolunteerName} has been assigned.`
                    : "Coordinating nearest verified responders."}
                </p>
              </div>
            </div>

            <Link to="/user/sos">
              <Button size="sm" variant="destructive" className="w-full sm:w-auto font-bold text-xs h-9">
                View Emergency Status &rarr;
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 3. Primary Protection Status & Emergency SOS Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left Column: Safety Monitoring Status & SOS Action */}
        <div className="md:col-span-7 bg-card rounded-2xl border border-border/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="size-5 text-emerald-600" />
                <h2 className="text-base font-bold text-foreground">Safety Protection</h2>
              </div>
              <Link to="/user/ai-fusion" className="text-xs text-indigo-600 hover:underline font-semibold">
                Manage Shield
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border/60 text-center">
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                <div className="text-[11px] text-muted-foreground font-medium">Voice</div>
                <div className="text-xs font-bold text-emerald-700 mt-1">Active</div>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                <div className="text-[11px] text-muted-foreground font-medium">Movement</div>
                <div className="text-xs font-bold text-emerald-700 mt-1">Active</div>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                <div className="text-[11px] text-muted-foreground font-medium">Location</div>
                <div className="text-xs font-bold text-emerald-700 mt-1">
                  {locationEnabled ? "Sharing" : "GPS On"}
                </div>
              </div>
            </div>
          </div>

          {/* Emergency SOS Big Action Card */}
          <div className="bg-red-50/60 rounded-xl p-4 sm:p-5 border border-red-200/80 text-center">
            <h3 className="text-sm font-bold text-red-950">Need Immediate Help?</h3>
            <p className="text-xs text-red-800/90 mt-1 max-w-sm mx-auto">
              Tap to send an instant alert to your trusted emergency contacts and nearby verified community responders.
            </p>
            <div className="mt-4">
              <Link to="/user/sos">
                <Button
                  size="lg"
                  className="w-full sm:w-auto px-8 h-12 bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md rounded-xl sos-button-pulse"
                >
                  <Siren className="size-4 mr-2" />
                  Trigger Emergency SOS
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Safety Actions & Trusted Contacts */}
        <div className="md:col-span-5 space-y-5">
          {/* Trusted Contacts Card */}
          <div className="bg-card rounded-2xl border border-border/80 p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-foreground">Trusted Contacts</h3>
              </div>
              <Link to="/user/contacts" className="text-xs text-indigo-600 hover:underline font-semibold">
                View ({contactsCount})
              </Link>
            </div>

            {contactsCount === 0 ? (
              <div className="my-4 p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 text-center">
                <p className="text-xs text-amber-900 font-medium">No contacts added yet</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Add someone you trust so they are alerted during an emergency.
                </p>
                <Link to="/user/contacts">
                  <Button size="sm" variant="outline" className="mt-2.5 h-7 text-xs border-amber-300">
                    <Plus className="size-3 mr-1" /> Add Contact
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="mt-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{contactsCount} trusted {contactsCount === 1 ? "person" : "people"}</span> will receive instant automated alerts with your live location.
              </div>
            )}

            <div className="pt-3 border-t border-border/60 mt-3 flex items-center justify-between">
              <Link to="/user/safe-zones" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5">
                <MapPin className="size-3.5 text-indigo-500" />
                Nearby Safe Havens
              </Link>
              <ArrowRight className="size-3 text-muted-foreground" />
            </div>
          </div>

          {/* Quick Safe Shield Switch Card */}
          <div className="bg-card rounded-2xl border border-border/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">Safety Status</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                PROTECTED
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              SafeHer is running in the background to detect acoustic distress, route deviations, or sudden stops.
            </p>
            <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between">
              <Link to="/user/ai-fusion" className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1">
                Open Safety Shield Controls <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Recent Safety Activity Timeline (Clean & Human) */}
      <div className="bg-card rounded-2xl border border-border/80 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <h3 className="text-base font-bold text-foreground">Recent Safety Activity</h3>
          </div>
          <Link to="/user/history" className="text-xs text-indigo-600 hover:underline font-semibold">
            All History
          </Link>
        </div>

        {recentAlerts.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-xs">
            <CheckCircle2 className="size-6 text-emerald-500 mx-auto mb-1.5 opacity-80" />
            <p className="font-medium text-foreground">No past incidents</p>
            <p className="mt-0.5">Your safety history is clear.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {recentAlerts.map((alert) => (
              <div key={alert._id} className="py-3 flex items-center justify-between text-xs first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div
                    className={`size-2.5 rounded-full ${
                      alert.status === "active" ? "bg-red-500 animate-pulse" : "bg-slate-300"
                    }`}
                  />
                  <div>
                    <span className="font-semibold text-foreground">
                      {alert.source ? alert.source.replace("_", " ") : "Emergency SOS"}
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div>
                  <Badge variant={alert.status === "resolved" ? "secondary" : "destructive"} className="text-[10px]">
                    {alert.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}