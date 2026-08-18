import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { useCallback, useEffect, useState } from "react";
import { getAlerts, acceptAlert } from "@/services/volunteerService";

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
  latitude: number;
  longitude: number;
  status: "active" | "accepted" | "resolved";
  createdAt: string;
  updatedAt: string;
  user?: Victim;
  acceptedBy?: Volunteer;
}

function AlertsFeed() {
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    try {
      const response = await getAlerts("active");
      setAlerts(response.data.data as Alert[]);
    } catch (error: any) {
      const status = error?.response?.status;

      if (status === 401) {
        toast.error("Session expired. Please log in again.");
        navigate({ to: "/login" });
        return;
      }

      if (status === 404) {
        toast.error("Alerts not found.");
        return;
      }

      if (status === 500) {
        toast.error("Server error while loading alerts.");
        return;
      }

      toast.error("Unable to load alerts");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadAlerts();

    const interval = setInterval(() => {
      loadAlerts();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [loadAlerts]);

  async function handleAccept(id: string) {
    if (acceptingId) return; // prevent double-clicking any accept button

    setAcceptingId(id);

    try {
      await acceptAlert(id);

      toast.success("Alert Accepted");

      navigate({
        to: "/volunteer/incidents/$id",
        params: { id },
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to accept alert");
    } finally {
      setAcceptingId(null);
      loadAlerts();
    }
  }

  function handleViewDetails(id: string) {
    navigate({
      to: "/volunteer/incidents/$id",
      params: { id },
    });
  }

  const showSkeleton = loading && alerts.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Alert feed" desc="Real-time emergency alerts near you." />

      {showSkeleton ? (
        <div className="grid gap-4 md:grid-cols-2">
          <AlertCardSkeleton />
          <AlertCardSkeleton />
          <AlertCardSkeleton />
          <AlertCardSkeleton />
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
                  {a.user?.profileImage ? (
                    <img
                      src={a.user.profileImage}
                      alt={a.user?.name || "Victim"}
                      className="size-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="grid size-10 shrink-0 place-items-center rounded-full gradient-hero text-sm font-bold text-white">
                      {a.user?.name?.charAt(0)?.toUpperCase() || "V"}
                    </div>
                  )}

                  <div>
                    <div className="text-xs text-muted-foreground">Alert ID · {a._id.slice(-6)}</div>
                    <div className="mt-1 text-lg font-bold">{a.user?.name}</div>
                    <div className="text-sm text-muted-foreground">{a.user?.phone}</div>
                    <div className="text-sm text-muted-foreground">
                      Lat: {a.latitude} | Lng: {a.longitude}
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

              <p className="mt-3 text-sm text-muted-foreground">
                User triggered an SOS and shared live location. Please respond immediately if available.
              </p>

              <div className="mt-2 text-xs text-muted-foreground">{formatCreatedAt(a.createdAt)}</div>

              <div className="mt-4 flex gap-2">
                {a.status === "active" && (
                  <Button
                    className="flex-1 bg-success text-white"
                    disabled={acceptingId === a._id}
                    onClick={() => handleAccept(a._id)}
                  >
                    {acceptingId === a._id ? "Accepting..." : "Accept"}
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