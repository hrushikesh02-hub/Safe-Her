import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import MapView from "@/components/MapView";
import { useCallback, useEffect, useRef, useState } from "react";
import { getAlertById, resolveAlert } from "@/services/volunteerService";

export const Route = createFileRoute("/volunteer/incidents/$id")({
  component: IncidentDetails,
});

// =====================================================
// TYPES
// =====================================================

type AlertStatus = "active" | "accepted" | "resolved";

interface AlertUser {
  _id: string;
  name?: string;
  phone?: string;
  email?: string;
  profileImage?: string;
}

interface AcceptedVolunteer {
  _id: string;
  name?: string;
}

interface Alert {
  _id: string;
  latitude: number;
  longitude: number;
  status: AlertStatus;
  createdAt: string;
  updatedAt: string;
  user?: AlertUser;
  acceptedBy?: AcceptedVolunteer;
}

interface TimelineEntry {
  label: string;
  time: string;
}

interface BackendResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

const POLL_INTERVAL_MS = 5000;

// =====================================================
// HELPERS
// =====================================================

function formatDateTime(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function formatStatusLabel(status?: AlertStatus): string {
  if (!status) return "Pending";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function buildTimeline(alert: Alert | null): TimelineEntry[] {
  if (!alert) return [];

  const entries: TimelineEntry[] = [
    { label: "Alert Created", time: formatDateTime(alert.createdAt) },
  ];

  if (alert.status === "accepted" || alert.status === "resolved") {
    entries.push({
      label: alert.acceptedBy?.name
        ? `Accepted by ${alert.acceptedBy.name}`
        : "Accepted by Volunteer",
      time: formatDateTime(alert.updatedAt),
    });
  }

  if (alert.status === "resolved") {
    entries.push({
      label: "Resolved",
      time: formatDateTime(alert.updatedAt),
    });
  }

  return entries;
}

function getErrorStatusCode(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { status?: number } }).response === "object"
  ) {
    return (error as { response?: { status?: number } }).response?.status;
  }
  return undefined;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { message?: string } } }).response === "object"
  ) {
    const message = (error as { response?: { data?: { message?: string } } }).response?.data
      ?.message;
    if (message) return message;
  }
  return fallback;
}

// =====================================================
// COMPONENT
// =====================================================

function IncidentDetails() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [alert, setAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [resolving, setResolving] = useState(false);

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
        const body = response.data as BackendResponse<Alert>;

        if (!isMountedRef.current) return;

        setAlert(body.data);
        setNotFound(false);
        setAccessDenied(false);

        if (body.data.status === "resolved") {
          clearPolling();
        }
      } catch (error: unknown) {
        if (!isMountedRef.current) return;

        const status = getErrorStatusCode(error);

        if (status === 401) {
          clearPolling();
          toast.error("Session expired. Please log in again.");
          navigate({ to: "/login" });
          return;
        }

        if (status === 403) {
          clearPolling();
          setAccessDenied(true);
          return;
        }

        if (status === 404) {
          clearPolling();
          setNotFound(true);
          return;
        }

        if (status === 500) {
          toast.error("Server error while loading alert.");
          return;
        }

        // Network failure or unknown error: fail silently in the background,
        // the next poll (or the user) will retry automatically.
        if (!isBackground) {
          toast.error("Unable to load alert");
        }
      } finally {
        if (isMountedRef.current && !isBackground) {
          setLoading(false);
        }
      }
    },
    [id, navigate, clearPolling]
  );

  // Initial load
  useEffect(() => {
    isMountedRef.current = true;
    if (id) {
      loadAlert(false);
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [id, loadAlert]);

  // Polling — every 5s until resolved, stopped on unmount
  useEffect(() => {
    if (!id) return;

    clearPolling();

    pollRef.current = setInterval(() => {
      loadAlert(true);
    }, POLL_INTERVAL_MS);

    return () => {
      clearPolling();
    };
  }, [id, loadAlert, clearPolling]);

  // Stop polling immediately once resolved
  useEffect(() => {
    if (alert?.status === "resolved") {
      clearPolling();
    }
  }, [alert?.status, clearPolling]);

  const handleResolved = useCallback(async () => {
    if (resolving) return;

    setResolving(true);

    try {
      await resolveAlert(id);
      toast.success("Incident Resolved");
      await loadAlert(false);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to resolve alert"));
    } finally {
      if (isMountedRef.current) {
        setResolving(false);
      }
    }
  }, [id, resolving, loadAlert]);

  const timeline = buildTimeline(alert);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incident details"
        desc={`Alert ID · ${id}`}
        action={<StatusBadge status={formatStatusLabel(alert?.status)} />}
      />

      {accessDenied ? (
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Access Denied</p>
        </div>
      ) : notFound ? (
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Alert not found.</p>
        </div>
      ) : loading && !alert ? (
        <IncidentSkeleton />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
          <div className="space-y-4">
            {alert && <MapView latitude={alert.latitude} longitude={alert.longitude} />}

            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h3 className="font-semibold">Timeline</h3>
              <ol className="mt-4 space-y-3">
                {timeline.map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{t.label}</div>
                      <div className="text-xs text-muted-foreground">{t.time}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">User</div>
              <div className="mt-2 flex items-center gap-3">
                {alert?.user?.profileImage ? (
                  <img
                    src={alert.user.profileImage}
                    alt={
                      alert.user?.name
                        ? `Profile photo of ${alert.user.name}`
                        : "User profile photo"
                    }
                    className="size-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="grid size-12 place-items-center rounded-full gradient-hero font-bold text-white">
                    {alert?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
                <div>
                  <div className="font-semibold">{alert?.user?.name}</div>
                  <div className="text-xs text-muted-foreground">Phone: {alert?.user?.phone}</div>
                  {alert?.user?.email && (
                    <div className="text-xs text-muted-foreground">Email: {alert.user.email}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Emergency details</div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Latitude</span>
                  <span className="font-medium">{alert?.latitude}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Longitude</span>
                  <span className="font-medium">{alert?.longitude}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{formatDateTime(alert?.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="font-medium">{formatDateTime(alert?.updatedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">{alert?.status}</span>
                </div>
                {alert?.acceptedBy?.name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Accepted Volunteer</span>
                    <span className="font-medium">{alert.acceptedBy.name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Alert ID</span>
                  <span className="font-medium">{alert?._id.slice(-6)}</span>
                </div>
              </div>
            </div>

            {alert?.status === "resolved" ? (
              <div className="rounded-2xl border bg-success/10 p-5 text-center shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full bg-success/15 px-4 py-2 text-sm font-semibold text-success">
                  <CheckCircle2 className="size-4" />
                  Incident Successfully Resolved
                </div>
              </div>
            ) : alert?.status === "active" ? (
              <div className="rounded-2xl border bg-card p-5 text-center shadow-sm">
                <p className="text-sm text-muted-foreground">This alert has not yet been accepted.</p>
              </div>
            ) : alert?.status === "accepted" ? (
              <div className="space-y-2">
                <Button
                  onClick={handleResolved}
                  disabled={resolving}
                  aria-busy={resolving}
                  className="w-full bg-success text-white hover:bg-success/90"
                >
                  <CheckCircle2 className="mr-2 size-4" />
                  {resolving ? "Resolving..." : "Mark resolved"}
                </Button>
              </div>
            ) : null}
          </aside>
        </div>
      )}
    </div>
  );
}

function IncidentSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
      <div className="space-y-4">
        <div className="h-64 w-full animate-pulse rounded-2xl bg-muted" />
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="mt-4 space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
      <aside className="space-y-4">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="h-3 w-10 animate-pulse rounded bg-muted" />
          <div className="mt-3 flex items-center gap-3">
            <div className="size-12 animate-pulse rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="h-3 w-28 animate-pulse rounded bg-muted" />
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      </aside>
    </div>
  );
}