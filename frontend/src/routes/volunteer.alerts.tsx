import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { useCallback, useEffect, useState } from "react";
import { getAlerts, acceptAlert } from "@/services/volunteerService";

import { UserAvatar } from "@/components/ui/UserAvatar";

export const Route = createFileRoute("/volunteer/alerts")({ component: AlertsFeed });

const REFRESH_INTERVAL_MS = 10000; // 10 seconds

interface Victim {
  _id: string;
  name?: string;
  phone?: string;
  email?: string;
  profileImage?: string;
}

interface Volunteer {
  _id: string;
  name?: string;
}

interface Alert {
  _id: string;
  user?: Victim;
  latitude: number;
  longitude: number;
  status: "active" | "accepted" | "resolved";
  source: "MANUAL_SOS" | "AI_VOICE" | "AI_MOVEMENT" | "AI_FUSION";
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskScore?: number;
  distressType?: string;
  confidence?: number;
  detectedKeywords?: string[];
  acceptedBy?: Volunteer;
  createdAt: string;
}

function AlertsFeed() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadAlerts = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    try {
      const response = await getAlerts();
      setAlerts(response.data?.data || []);
    } catch (error) {
      console.error("Failed to load alerts feed:", error);
      if (!background) toast.error("Unable to load alert feed.");
    } finally {
      if (!background) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(() => {
      loadAlerts(true);
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadAlerts]);

  async function handleAccept(id: string) {
    setActingId(id);
    try {
      await acceptAlert(id);
      toast.success("Emergency accepted! Opening incident response center.");
      navigate({ to: "/volunteer/incidents/$id", params: { id } });
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to accept alert.";
      toast.error(msg);
      loadAlerts();
    } finally {
      setActingId(null);
    }
  }

  function handleViewDetails(id: string) {
    navigate({
      to: "/volunteer/incidents/$id",
      params: { id },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emergency Alert Feed"
        desc="Real-time distress signals from women requiring immediate nearby community assistance."
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border bg-card py-16 text-center shadow-sm">
          <p className="text-sm text-muted-foreground animate-pulse">Scanning for emergency signals...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border bg-card py-16 text-center shadow-sm">
          <Bell className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No active emergency alerts.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {alerts.map((a) => (
            <div key={a._id} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <UserAvatar
                    src={a.user?.profileImage}
                    name={a.user?.name || "Victim"}
                    role="user"
                    size="md"
                  />

                  <div>
                    <div className="text-xs text-muted-foreground font-mono">Alert ID · #{a._id.slice(-6)}</div>
                    <div className="mt-1 text-lg font-bold text-foreground">{a.user?.name || "SafeHer Protected User"}</div>
                    <div className="text-xs text-muted-foreground">{a.user?.phone || "Emergency Broadcast Active"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Lat: {a.latitude?.toFixed(4)} | Lng: {a.longitude?.toFixed(4)}
                    </div>
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    a.status === "active"
                      ? "bg-emergency/15 text-emergency"
                      : a.status === "accepted"
                      ? "bg-warning/15 text-warning"
                      : "bg-success/15 text-success"
                  }`}
                >
                  {a.status.toUpperCase()}
                </span>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                {a.source ? `🚨 ${a.source.replace("_", " ")}:` : "Emergency SOS triggered."}{" "}
                User shared live coordinates and requested immediate responder assistance.
              </p>

              <div className="mt-2 text-xs text-muted-foreground">{formatCreatedAt(a.createdAt)}</div>

              <div className="mt-4 flex gap-2">
                {a.status === "active" && (
                  <Button
                    className="flex-1 bg-success text-white"
                    disabled={actingId === a._id}
                    onClick={() => handleAccept(a._id)}
                  >
                    {actingId === a._id ? "Accepting..." : "Accept"}
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleViewDetails(a._id)}
                >
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
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

function AlertCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="size-10 shrink-0 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-3 w-40 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="mt-4 h-3 w-full animate-pulse rounded bg-muted" />
      <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-muted" />
      <div className="mt-4 flex gap-2">
        <div className="h-9 flex-1 animate-pulse rounded-md bg-muted" />
        <div className="h-9 flex-1 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}