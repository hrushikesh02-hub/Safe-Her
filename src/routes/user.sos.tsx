import { createFileRoute } from "@tanstack/react-router";
import { Siren, MapPin, CheckCircle2, X, Clock } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { sendSOS } from "@/services/sosService";
import { getAlertHistory } from "@/services/userService";

export const Route = createFileRoute("/user/sos")({ component: SOSPage });

type PageState = "idle" | "counting" | "active" | "resolved";
export type AlertStatus = "active" | "accepted" | "resolved";

export interface Alert {
  _id: string;
  latitude: number;
  longitude: number;
  status: AlertStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SOSResponse {
  success: boolean;
  message?: string;
  data: Alert;
}

interface Coordinates {
  latitude: string;
  longitude: string;
}

const POLL_INTERVAL_MS = 5000;
const COUNTDOWN_SECONDS = 5;

function SOSPage() {
  const [state, setState] = useState<PageState>("idle");
  const [count, setCount] = useState(COUNTDOWN_SECONDS);
  const [isSending, setIsSending] = useState(false);

  const [location, setLocation] = useState<Coordinates>({ latitude: "", longitude: "" });
  const locationErrorShownRef = useRef(false);

  const [alertId, setAlertId] = useState<string | null>(null);
  const [alertStatus, setAlertStatus] = useState<AlertStatus | null>(null);

  const pollRef = useRef<number | null>(null);

  // ---- Location tracking ----
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        locationErrorShownRef.current = false;
        setLocation({
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        });
      },
      () => {
        if (!locationErrorShownRef.current) {
          toast.error("Location permission denied. Enable location to send SOS.");
          locationErrorShownRef.current = true;
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ---- Countdown ----
  useEffect(() => {
    if (state !== "counting" || count <= 0) return;

    const t = window.setTimeout(() => setCount((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [state, count]);

  const handleSend = useCallback(async () => {
    if (isSending) return;

    if (!location.latitude || !location.longitude) {
      toast.error("Unable to get your location. SOS was not sent.");
      setState("idle");
      setCount(COUNTDOWN_SECONDS);
      return;
    }

    setIsSending(true);

    try {
      const res = await sendSOS({
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
      });

      const created = ((res as any)?.data?.data ?? (res as any)?.data) as Alert | undefined;

      if (!created?._id) {
        console.error("Unexpected sendSOS() response shape:", res);
        throw new Error("Invalid SOS response from server");
      }

      setAlertId(created._id);
      setAlertStatus(created.status || "active");
      setState("active");
      toast.success("SOS Alert Sent Successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to send SOS");
      setState("idle");
      setCount(COUNTDOWN_SECONDS);
    } finally {
      setIsSending(false);
    }
  }, [isSending, location]);

  // Countdown reaching zero triggers the actual send.
  useEffect(() => {
    if (state === "counting" && count === 0) {
      handleSend();
    }
  }, [state, count, handleSend]);

  // ---- Polling ----
  const pollAlertStatus = useCallback(async () => {
    if (!alertId) return;

    try {
      const res = await getAlertHistory();
      const alerts: Alert[] = res.data.data;
      const current = alerts.find((a) => a._id === alertId);

      if (current) {
        setAlertStatus(current.status);

        if (current.status === "resolved") {
          setState("resolved");
        }
      }
    } catch (error) {
      // Do not crash the page on a failed poll; just try again next tick.
      console.error("Polling failed:", error);
    }
  }, [alertId]);

  useEffect(() => {
    if (state !== "active" || !alertId) {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollAlertStatus(); // immediate check, then interval
    pollRef.current = window.setInterval(pollAlertStatus, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [state, alertId, pollAlertStatus]);

  // Stop polling once resolved (covered above, but explicit safety net on state change)
  useEffect(() => {
    if (state === "resolved" && pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [state]);

  function trigger() {
    if (!location.latitude || !location.longitude) {
      toast.error("Waiting for your location. Please enable location access.");
      return;
    }

    setCount(COUNTDOWN_SECONDS);
    setState("counting");

    toast("Triggering SOS in 5 seconds...", { duration: 2500 });
  }

  function cancel() {
    setState("idle");
    setCount(COUNTDOWN_SECONDS);
    toast.success("Alert cancelled");
  }

  const progress = alertStatus === "resolved" ? 100 : alertStatus === "accepted" ? 60 : alertStatus === "active" ? 20 : 0;

  const statusMessage =
    state === "idle"
      ? "No active alert"
      : state === "counting"
      ? "Confirming…"
      : state === "resolved"
      ? "Alert resolved"
      : alertStatus === "accepted"
      ? "Volunteer Accepted Your SOS"
      : "Waiting for volunteer acceptance...";

  function handleBigButtonClick() {
    if (state === "idle") {
      trigger();
    } else if (state === "counting") {
      cancel();
    }
    // No-op for "active" / "resolved" — no destructive action available from the main button.
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Emergency SOS" desc="Press the button. Help is on the way." />

      <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
        <div className="relative grid place-items-center rounded-3xl border bg-card p-10 shadow-sm">
          <div className="relative grid place-items-center">
            {state === "active" && (
              <div className="absolute inset-0 m-auto size-72 rounded-full bg-emergency/30 ring-grow" />
            )}
            <button
              onClick={handleBigButtonClick}
              disabled={isSending}
              className={`relative grid size-64 place-items-center rounded-full text-white shadow-emergency transition md:size-72 ${
                state === "resolved" ? "bg-success" : "bg-emergency"
              } ${state === "idle" ? "sos-pulse hover:scale-105" : ""}`}
              aria-label="Activate emergency SOS"
            >
              <div className="text-center">
                {state === "counting" ? (
                  <>
                    <div className="text-xs uppercase tracking-widest">
                      {isSending ? "Sending" : "Sending in"}
                    </div>
                    <div className="mt-1 text-7xl font-bold">{isSending ? "…" : count}</div>
                  </>
                ) : state === "active" ? (
                  <>
                    <Siren className="mx-auto size-14" />
                    <div className="mt-2 text-2xl font-bold">ALERT SENT</div>
                    <div className="text-xs uppercase tracking-widest">Help is on the way</div>
                  </>
                ) : state === "resolved" ? (
                  <>
                    <CheckCircle2 className="mx-auto size-14" />
                    <div className="mt-2 text-2xl font-bold">RESOLVED</div>
                  </>
                ) : (
                  <>
                    <Siren className="mx-auto size-16" />
                    <div className="mt-2 text-3xl font-bold">SOS</div>
                    <div className="text-[11px] uppercase tracking-widest opacity-90">Press to activate</div>
                  </>
                )}
              </div>
            </button>
          </div>

          {state === "counting" && (
            <Button onClick={cancel} variant="outline" className="mt-8" disabled={isSending}>
              <X className="mr-2 size-4" />
              Cancel alert
            </Button>
          )}

          {state === "active" && (
            <p className="mt-8 text-center text-xs text-muted-foreground">
              A volunteer will resolve this alert once help has arrived.
            </p>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="size-4 text-primary" />
              Current Location
            </div>

            <div className="mt-3 text-sm">Latitude : {location.latitude || "--"}</div>

            <div className="text-xs text-muted-foreground">Longitude : {location.longitude || "--"}</div>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="size-4 text-primary" />
              Emergency status
            </div>
            <div className="mt-3 text-sm">{statusMessage}</div>

            {state === "active" && (
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-emergency transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">SOS Delivery Status</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {alertStatus === "accepted" ? "Volunteer is on the way." : "Alert is being processed..."}
                </div>
              </div>
            )}

            {state === "resolved" && (
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-success transition-all" style={{ width: "100%" }} />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">Incident Successfully Resolved</div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="text-sm font-semibold">Emergency Response</div>

            <div className="mt-3 text-sm">Nearest responders have been notified.</div>

            <div className="mt-2 text-xs text-muted-foreground">{statusMessage}</div>

            <div className="mt-4 text-xs text-muted-foreground">
              Alert Timestamp · {new Date().toLocaleString()}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}