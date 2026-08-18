import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { getRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Activity, AlertTriangle, CheckCircle2, Info, Loader2,
  MapPin, Navigation, Play, RefreshCw, Siren, Sparkles, X, Zap,
} from "lucide-react";
import { analyzeMovement, triggerMovementSOS } from "@/services/movementAIService";
import { toast } from "sonner";

export const Route = createFileRoute("/user/ai-movement")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (getRole() !== "user") throw redirect({ to: "/login" });
  },
  component: AIMovementMonitorPage,
});

/* ─── Constants ─────────────────────────────────────────────────────── */
const MOVEMENT_CRITICAL_THRESHOLD = 70;
const REPEATED_ANOMALY_COUNT = 2;
const REPEATED_ANOMALY_WINDOW_MS = 30_000;
const CANCEL_COUNTDOWN_SEC = 10;
const SAMPLE_INTERVAL_MS = 5_000;
const STATIONARY_SPEED_KMH = 1.0;

type EmergencyState = "idle" | "confirming" | "countdown" | "active" | "cancelled";

interface AccelSample { x: number; y: number; z: number; timestamp: number; }
interface CriticalEvent { timestamp: number; result: any; }

function AIMovementMonitorPage() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [movementResult, setMovementResult] = useState<any | null>(null);
  const [gpsContext, setGpsContext] = useState<any | null>(null);
  const [history, setHistory] = useState<Array<{ time: string; result: any }>>([]);

  // GPS state
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [stationaryDuration, setStationaryDuration] = useState<number>(0);
  const stationaryStartRef = useRef<number | null>(null);

  // Accelerometer
  const accelSamplesRef = useRef<AccelSample[]>([]);
  const prevSpeedRef = useRef<number>(0);

  // Emergency
  const [emergencyState, setEmergencyState] = useState<EmergencyState>("idle");
  const [cancelCountdown, setCancelCountdown] = useState(CANCEL_COUNTDOWN_SEC);
  const [activeIncident, setActiveIncident] = useState<any | null>(null);
  const [sosTriggerInProgress, setSosTriggerInProgress] = useState(false);
  const criticalEventsRef = useRef<CriticalEvent[]>([]);
  const cancelTimerRef = useRef<any>(null);

  const intervalRef = useRef<any>(null);
  const gpsWatchRef = useRef<number | null>(null);

  /* ── GPS watch ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!navigator.geolocation) return;
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const speed = (pos.coords.speed ?? 0) * 3.6; // m/s → km/h
        setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCurrentSpeed(speed);

        if (speed < STATIONARY_SPEED_KMH) {
          if (!stationaryStartRef.current) stationaryStartRef.current = Date.now();
          setStationaryDuration(Math.floor((Date.now() - stationaryStartRef.current) / 1000));
        } else {
          stationaryStartRef.current = null;
          setStationaryDuration(0);
        }

        prevSpeedRef.current = speed;
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
    return () => {
      if (gpsWatchRef.current != null) navigator.geolocation.clearWatch(gpsWatchRef.current);
    };
  }, []);

  /* ── Accelerometer ──────────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      accelSamplesRef.current.push({
        x: acc.x ?? 0, y: acc.y ?? 0, z: acc.z ?? 0,
        timestamp: Date.now(),
      });
      // Keep last 50 samples only
      if (accelSamplesRef.current.length > 50) accelSamplesRef.current.shift();
    };
    window.addEventListener("devicemotion", handler);
    return () => window.removeEventListener("devicemotion", handler);
  }, []);

  /* ── Cancel countdown ────────────────────────────────────────────────── */
  useEffect(() => {
    if (emergencyState !== "countdown") return;
    setCancelCountdown(CANCEL_COUNTDOWN_SEC);
    cancelTimerRef.current = setInterval(() => {
      setCancelCountdown((prev) => {
        if (prev <= 1) { clearInterval(cancelTimerRef.current); fireSOS(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (cancelTimerRef.current) clearInterval(cancelTimerRef.current); };
  }, [emergencyState]);

  useEffect(() => () => {
    stopMonitoring();
    if (cancelTimerRef.current) clearInterval(cancelTimerRef.current);
  }, []);

  /* ── SOS trigger ─────────────────────────────────────────────────────── */
  const fireSOS = useCallback(async () => {
    if (sosTriggerInProgress || emergencyState === "active") return;
    setSosTriggerInProgress(true);
    try {
      const lastResult = criticalEventsRef.current.at(-1)?.result;
      if (!gpsLocation?.lat || !gpsLocation?.lng) {
        toast.error("GPS unavailable. Enable location permission.");
        setEmergencyState("idle");
        return;
      }
      const res = await triggerMovementSOS({
        latitude: gpsLocation.lat,
        longitude: gpsLocation.lng,
        movementRiskScore: lastResult?.movement_risk_score,
        movementAnomalyType: lastResult?.anomaly_type,
        gpsContextScore: gpsContext?.gps_context_score,
        riskLevel: lastResult?.risk_level || "HIGH",
        routeDeviated: lastResult?.anomaly_type === "route_deviation",
        suddenStop: lastResult?.anomaly_type === "sudden_stop",
        stationaryAlert: lastResult?.anomaly_type === "stationary_long",
      });
      setActiveIncident(res.data);
      setEmergencyState("active");
      criticalEventsRef.current = [];
      toast.error("🚨 MOVEMENT SOS CREATED — Contacts & Volunteers Notified!", { duration: 8000 });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "SOS failed. Use manual SOS immediately.");
      setEmergencyState("idle");
    } finally {
      setSosTriggerInProgress(false);
    }
  }, [gpsLocation, gpsContext, sosTriggerInProgress, emergencyState]);

  /* ── Confirmation logic ─────────────────────────────────────────────── */
  const evaluateResult = useCallback((result: any) => {
    const now = Date.now();
    const isCritical =
      result.anomaly_detected &&
      result.movement_risk_score >= MOVEMENT_CRITICAL_THRESHOLD;

    if (!isCritical) return;

    criticalEventsRef.current = [
      ...criticalEventsRef.current.filter(e => now - e.timestamp < REPEATED_ANOMALY_WINDOW_MS),
      { timestamp: now, result },
    ];
    const count = criticalEventsRef.current.length;

    if (emergencyState === "idle" || emergencyState === "confirming") {
      if (count === 1) {
        setEmergencyState("confirming");
        toast.warning(`⚠️ Movement anomaly: ${result.anomaly_type} — monitoring...`, { duration: 4000 });
      } else if (count >= REPEATED_ANOMALY_COUNT) {
        setEmergencyState("countdown");
      }
    }
  }, [emergencyState]);

  /* ── Monitoring loop ─────────────────────────────────────────────────── */
  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    try {
      const samples = [...accelSamplesRef.current];
      const data = await analyzeMovement({
        acceleration_samples: samples,
        speed_kmh: currentSpeed,
        previous_speed_kmh: prevSpeedRef.current,
        elapsed_sec: SAMPLE_INTERVAL_MS / 1000,
        stationary_duration_sec: stationaryDuration,
        latitude: gpsLocation?.lat,
        longitude: gpsLocation?.lng,
      });
      setMovementResult(data.movement);
      setGpsContext(data.gps_context);
      setHistory(prev => [
        { time: new Date().toLocaleTimeString(), result: data.movement },
        ...prev.slice(0, 9),
      ]);
      evaluateResult(data.movement);
      accelSamplesRef.current = [];
    } catch (err: any) {
      toast.error("Movement analysis error.");
    } finally {
      setAnalyzing(false);
    }
  }, [currentSpeed, stationaryDuration, gpsLocation, evaluateResult]);

  const startMonitoring = () => {
    setIsMonitoring(true);
    toast.success("📡 Movement Safety Monitoring activated.");
    intervalRef.current = setInterval(runAnalysis, SAMPLE_INTERVAL_MS);
  };

  const stopMonitoring = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsMonitoring(false);
  };

  const handleDemo = async (scenario: string) => {
    setAnalyzing(true);
    try {
      const data = await analyzeMovement({ scenario });
      setMovementResult(data.movement);
      setGpsContext(data.gps_context);
      setHistory(prev => [{ time: new Date().toLocaleTimeString(), result: data.movement }, ...prev.slice(0, 9)]);
      evaluateResult(data.movement);
      toast.success(`Demo: ${scenario}`);
    } catch {
      toast.error("Demo failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  const cancelEmergency = () => {
    if (cancelTimerRef.current) clearInterval(cancelTimerRef.current);
    criticalEventsRef.current = [];
    setEmergencyState("cancelled");
    setTimeout(() => setEmergencyState("idle"), 2000);
    toast.success("Emergency cancelled.");
  };

  const riskColor = (level: string) =>
    level === "CRITICAL" ? "bg-destructive text-destructive-foreground"
    : level === "HIGH" ? "bg-amber-600 text-white"
    : level === "MEDIUM" ? "bg-yellow-500 text-slate-950"
    : "bg-emerald-600 text-white";

  const anomalyLabel = (type: string) => ({
    normal: "Normal Movement",
    sudden_stop: "⛔ Sudden Stop",
    abnormal_speed: "🚀 Abnormal Speed",
    route_deviation: "🔀 Route Deviation",
    stationary_long: "🧍 Long Stationary",
    panic_movement: "🆘 Panic Movement",
  }[type] ?? type);

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Emergency Overlay */}
      {(emergencyState !== "idle") && (
        <div className={`rounded-3xl border-2 p-6 md:p-8 shadow-lg transition-all ${
          emergencyState === "active" ? "border-red-600 bg-red-600/10"
          : emergencyState === "countdown" ? "border-red-500 bg-red-500/10 animate-pulse"
          : emergencyState === "confirming" ? "border-amber-500 bg-amber-500/10"
          : "border-emerald-500 bg-emerald-500/10"
        }`}>
          {emergencyState === "confirming" && (
            <div className="flex items-start gap-4 justify-between flex-wrap">
              <div className="flex items-center gap-3">
                <AlertTriangle className="size-8 text-amber-500 shrink-0" />
                <div>
                  <div className="font-bold text-amber-700 dark:text-amber-400 text-lg">⚠️ Movement Anomaly Detected</div>
                  <p className="text-sm text-amber-600 dark:text-amber-300 mt-1">
                    One more anomaly within {REPEATED_ANOMALY_WINDOW_MS/1000}s will trigger SOS.
                    ({criticalEventsRef.current.length}/{REPEATED_ANOMALY_COUNT} confirmed)
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => { criticalEventsRef.current = []; setEmergencyState("idle"); }}>
                <X className="mr-1 size-4" /> Dismiss
              </Button>
            </div>
          )}

          {emergencyState === "countdown" && (
            <div className="flex items-start gap-4 justify-between flex-wrap">
              <div className="flex items-center gap-3">
                <Siren className="size-10 text-red-600 animate-bounce shrink-0" />
                <div>
                  <div className="font-bold text-red-700 dark:text-red-400 text-xl">🚨 MOVEMENT EMERGENCY DETECTED</div>
                  <div className="text-sm text-red-600 dark:text-red-300 mt-1">
                    Anomaly: <strong className="capitalize">{movementResult?.anomaly_type}</strong> · Risk: <strong>{movementResult?.risk_level}</strong> ({movementResult?.movement_risk_score}/100)
                  </div>
                  <div className="mt-2 text-sm font-semibold text-red-700 dark:text-red-300">
                    Auto SOS in <span className="text-3xl font-black">{cancelCountdown}</span>s...
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="destructive" size="lg" onClick={cancelEmergency}>
                  <X className="mr-2 size-4" /> Cancel Emergency
                </Button>
                <Button size="sm" className="bg-red-700 text-white hover:bg-red-800"
                  onClick={() => { if (cancelTimerRef.current) clearInterval(cancelTimerRef.current); fireSOS(); }}
                  disabled={sosTriggerInProgress}>
                  {sosTriggerInProgress ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Siren className="mr-2 size-4" />}
                  Trigger Now
                </Button>
              </div>
            </div>
          )}

          {emergencyState === "active" && activeIncident && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Siren className="size-10 text-red-600 shrink-0" />
                <div>
                  <div className="font-bold text-red-700 dark:text-red-400 text-xl">🚨 MOVEMENT SOS ACTIVE</div>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">Contacts and nearby volunteers have been notified.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {[
                  ["Incident ID", activeIncident._id?.slice(-8).toUpperCase()],
                  ["Status", activeIncident.status],
                  ["Anomaly", activeIncident.movementAnomalyType || "unknown"],
                  ["Risk Score", `${activeIncident.movementRiskScore ?? "?"}/100`],
                ].map(([label, val]) => (
                  <div key={label} className="rounded-xl border border-red-300 bg-white/50 dark:bg-black/20 p-3">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="font-bold text-xs mt-1 capitalize">{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {emergencyState === "cancelled" && (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-8 text-emerald-500 shrink-0" />
              <div className="font-semibold text-emerald-700 dark:text-emerald-400">Emergency cancelled. Monitoring continues.</div>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="rounded-3xl gradient-hero p-6 text-white shadow-elegant md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/80">
              <Sparkles className="size-4 text-yellow-300" />
              SafeHer AI Safety Suite · Phase 2
            </div>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">Movement Safety Monitor</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Real-time accelerometer + GPS analysis detecting sudden stops, route deviation, abnormal speed, and panic movement — with automatic SOS.
            </p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/70">
              {gpsLocation && <span><MapPin className="inline size-3 mr-1" />{gpsLocation.lat.toFixed(4)}, {gpsLocation.lng.toFixed(4)}</span>}
              <span><Navigation className="inline size-3 mr-1" />{currentSpeed.toFixed(1)} km/h</span>
              {stationaryDuration > 0 && <span>🧍 Stationary {Math.floor(stationaryDuration/60)}m {stationaryDuration%60}s</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isMonitoring ? (
              <Button onClick={startMonitoring} size="lg" className="bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg font-semibold">
                <Activity className="mr-2 size-5" /> Start Monitoring
              </Button>
            ) : (
              <Button onClick={stopMonitoring} size="lg" variant="destructive" className="shadow-lg font-semibold">
                <X className="mr-2 size-5" /> Stop Monitoring
              </Button>
            )}
          </div>
        </div>
      </div>

      <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200">
        <Info className="size-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="font-semibold text-sm">Movement Safety Monitor</AlertTitle>
        <AlertDescription className="text-xs mt-1 text-amber-800 dark:text-amber-300">
          When anomaly risk ≥ {MOVEMENT_CRITICAL_THRESHOLD} is confirmed {REPEATED_ANOMALY_COUNT}× in {REPEATED_ANOMALY_WINDOW_MS/1000}s,
          a {CANCEL_COUNTDOWN_SEC}s cancellation window appears before SOS. Works on mobile with accelerometer access.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Risk Card */}
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="size-5 text-primary" /> Movement Risk Monitor
              </CardTitle>
              <CardDescription>Live accelerometer + GPS analysis every {SAMPLE_INTERVAL_MS/1000}s</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {analyzing && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
              {isMonitoring
                ? <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 px-3 py-1 animate-pulse flex gap-2 items-center"><span className="size-2 rounded-full bg-emerald-500 animate-ping" />🟢 Active</Badge>
                : <Badge variant="outline" className="text-muted-foreground">🔴 Inactive</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {/* Score display */}
            <div className="rounded-2xl border bg-muted/30 p-6 flex flex-col items-center text-center space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Movement Risk Score</span>
                <Badge className={riskColor(movementResult?.risk_level || "LOW")}>
                  {movementResult?.risk_level || "LOW"}
                </Badge>
              </div>
              <div className="text-5xl font-extrabold tracking-tight">
                {movementResult?.movement_risk_score ?? 0}<span className="text-xl font-medium text-muted-foreground"> / 100</span>
              </div>
              <div className="w-full max-w-md space-y-1">
                <Progress value={movementResult?.movement_risk_score ?? 0} className="h-3" />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>0 Safe</span><span>30</span><span>50</span><span>70 High</span><span>100 Critical</span>
                </div>
              </div>
            </div>

            {/* Anomaly + GPS context grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border p-4 bg-card">
                <div className="text-xs text-muted-foreground">Anomaly</div>
                <div className="mt-1 font-semibold text-sm">
                  {movementResult?.anomaly_detected ? (
                    <span className="text-destructive">{anomalyLabel(movementResult.anomaly_type)}</span>
                  ) : <span className="text-emerald-600">Normal</span>}
                </div>
              </div>
              <div className="rounded-xl border p-4 bg-card">
                <div className="text-xs text-muted-foreground">Speed</div>
                <div className="mt-1 font-semibold text-sm">{currentSpeed.toFixed(1)} km/h</div>
              </div>
              <div className="rounded-xl border p-4 bg-card">
                <div className="text-xs text-muted-foreground">GPS Context</div>
                <div className="mt-1 font-semibold text-sm">
                  {gpsContext ? (
                    <span className={gpsContext.gps_context_score > 50 ? "text-amber-600" : "text-emerald-600"}>
                      Score: {gpsContext.gps_context_score}/100
                    </span>
                  ) : <span className="text-muted-foreground">—</span>}
                </div>
              </div>
              {gpsContext && (
                <>
                  <div className="rounded-xl border p-4 bg-card">
                    <div className="text-xs text-muted-foreground">Safe Zone</div>
                    <div className="mt-1 font-semibold text-sm">
                      {gpsContext.is_in_safe_zone ? <span className="text-emerald-600">✅ Yes</span> : <span className="text-muted-foreground">❌ No</span>}
                    </div>
                  </div>
                  <div className="rounded-xl border p-4 bg-card">
                    <div className="text-xs text-muted-foreground">Isolated</div>
                    <div className="mt-1 font-semibold text-sm">
                      {gpsContext.is_isolated ? <span className="text-amber-600">⚠️ Yes</span> : <span className="text-emerald-600">No</span>}
                    </div>
                  </div>
                  <div className="rounded-xl border p-4 bg-card">
                    <div className="text-xs text-muted-foreground">Late Night</div>
                    <div className="mt-1 font-semibold text-sm">
                      {gpsContext.is_late_night ? <span className="text-amber-600">🌙 Yes</span> : <span className="text-emerald-600">No</span>}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Confirmation counter */}
            {(emergencyState === "confirming" || emergencyState === "countdown") && (
              <div className="rounded-xl border border-amber-400 bg-amber-400/10 p-3 flex items-center gap-3">
                <AlertTriangle className="size-5 text-amber-500 shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold text-amber-700 dark:text-amber-400">Anomaly detections: </span>
                  <span className="font-bold">{criticalEventsRef.current.length}/{REPEATED_ANOMALY_COUNT}</span>
                  <span className="text-xs text-amber-600 ml-2">(within {REPEATED_ANOMALY_WINDOW_MS/1000}s)</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Demo Panel */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Zap className="size-5 text-indigo-500" />Demo Scenarios</CardTitle>
            <CardDescription>Test movement detection scenarios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              ["normal_walk", "Normal Walking", "text-emerald-500"],
              ["sudden_stop", "Sudden Stop ⛔", "text-red-600"],
              ["abnormal_speed", "Abnormal Speed 🚀", "text-red-500"],
              ["route_deviation", "Route Deviation 🔀", "text-amber-500"],
              ["stationary_long", "Long Stationary 🧍", "text-yellow-500"],
              ["panic_movement", "Panic Movement 🆘", "text-red-600"],
            ].map(([id, label, color]) => (
              <Button key={id} variant="outline" className="w-full justify-start text-xs font-medium" disabled={analyzing} onClick={() => handleDemo(id)}>
                <Play className={`mr-2 size-3.5 ${color}`} />{label}
              </Button>
            ))}
            <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground mt-2">
              <strong>Auto-SOS Demo:</strong> Click "Sudden Stop" or "Panic Movement" twice within {REPEATED_ANOMALY_WINDOW_MS/1000}s to trigger countdown.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Log */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Movement Analysis Log</CardTitle>
            <CardDescription>Recent detection windows this session</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setHistory([])} className="text-xs">
            <RefreshCw className="mr-1 size-3" /> Clear
          </Button>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">No analysis yet. Start monitoring or run a demo scenario.</div>
          ) : (
            <div className="divide-y text-xs">
              {history.map((item, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground font-mono">{item.time}</span>
                    <span className={`font-semibold ${item.result.anomaly_detected ? "text-destructive" : "text-emerald-600"}`}>
                      {anomalyLabel(item.result.anomaly_type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">Score: {item.result.movement_risk_score}/100</span>
                    <Badge className={riskColor(item.result.risk_level)}>{item.result.risk_level}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
