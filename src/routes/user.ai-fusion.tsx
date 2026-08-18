import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { getRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Activity, AlertTriangle, Bot, CheckCircle2, Info, Layers, Loader2,
  MapPin, Play, RefreshCw, Siren, Sparkles, TrendingUp, X, Zap,
} from "lucide-react";
import { analyzeFusion, triggerFusionSOS, type FusionAnalysisResult } from "@/services/fusionAIService";
import { analyzeMovement } from "@/services/movementAIService";
import { toast } from "sonner";

export const Route = createFileRoute("/user/ai-fusion")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (getRole() !== "user") throw redirect({ to: "/login" });
  },
  component: AIFusionDashboard,
});

/* ── Constants ─────────────────────────────────────────────────────── */
const FUSION_SOS_THRESHOLD = 78;
const CANCEL_COUNTDOWN_SEC = 10;
const AUTO_ANALYZE_INTERVAL_MS = 8000;

type EmergencyState = "idle" | "confirming" | "countdown" | "active" | "cancelled";

function AIFusionDashboard() {
  const [fusionResult, setFusionResult] = useState<FusionAnalysisResult | null>(null);
  const [voiceScore, setVoiceScore] = useState<number>(0);
  const [movementScore, setMovementScore] = useState<number>(0);
  const [gpsScore, setGpsScore] = useState<number>(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [history, setHistory] = useState<Array<{ time: string; result: FusionAnalysisResult }>>([]);

  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const gpsWatchRef = useRef<number | null>(null);

  const [emergencyState, setEmergencyState] = useState<EmergencyState>("idle");
  const [cancelCountdown, setCancelCountdown] = useState(CANCEL_COUNTDOWN_SEC);
  const [activeIncident, setActiveIncident] = useState<any | null>(null);
  const [sosTriggerInProgress, setSosTriggerInProgress] = useState(false);
  const criticalCountRef = useRef(0);
  const cancelTimerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  /* GPS */
  useEffect(() => {
    if (!navigator.geolocation) return;
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCurrentSpeed(((pos.coords.speed ?? 0) * 3.6));
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 4000 }
    );
    return () => { if (gpsWatchRef.current != null) navigator.geolocation.clearWatch(gpsWatchRef.current); };
  }, []);

  /* Countdown */
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
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (cancelTimerRef.current) clearInterval(cancelTimerRef.current);
  }, []);

  /* SOS */
  const fireSOS = useCallback(async () => {
    if (sosTriggerInProgress || emergencyState === "active") return;
    setSosTriggerInProgress(true);
    try {
      if (!gpsLocation) { toast.error("GPS unavailable."); setEmergencyState("idle"); return; }
      const res = await triggerFusionSOS({
        latitude: gpsLocation.lat,
        longitude: gpsLocation.lng,
        finalRiskScore: fusionResult?.final_risk_score,
        finalRiskLevel: fusionResult?.final_risk_level,
        riskScore: fusionResult?.component_scores.voice_risk_score,
        movementRiskScore: fusionResult?.component_scores.movement_risk_score,
        gpsContextScore: fusionResult?.component_scores.gps_context_score,
        fusionSource: "VOICE+MOVEMENT+GPS",
      });
      setActiveIncident(res.data);
      setEmergencyState("active");
      criticalCountRef.current = 0;
      toast.error("🚨 FUSION SOS CREATED — All Contacts & Volunteers Notified!", { duration: 8000 });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "SOS failed. Use manual SOS immediately.");
      setEmergencyState("idle");
    } finally {
      setSosTriggerInProgress(false);
    }
  }, [gpsLocation, fusionResult, sosTriggerInProgress, emergencyState]);

  /* Evaluate */
  const evaluateFusion = useCallback((result: FusionAnalysisResult) => {
    if (result.final_risk_score >= FUSION_SOS_THRESHOLD && emergencyState === "idle") {
      criticalCountRef.current = 1;
      setEmergencyState("confirming");
      toast.warning("⚠️ High unified risk score — monitoring...", { duration: 4000 });
    } else if (result.final_risk_score >= FUSION_SOS_THRESHOLD && emergencyState === "confirming") {
      criticalCountRef.current += 1;
      if (criticalCountRef.current >= 2) setEmergencyState("countdown");
    }
  }, [emergencyState]);

  /* Analyze */
  const runFusionAnalysis = useCallback(async (overrides?: {
    voice?: number; movement?: number; gps?: number; scenario?: string;
  }) => {
    setAnalyzing(true);
    try {
      let finalVoice = overrides?.voice ?? voiceScore;
      let finalMovement = overrides?.movement ?? movementScore;
      let finalGps = overrides?.gps ?? gpsScore;

      // If monitoring is on, try to auto-fetch a fresh movement sample
      if (isMonitoring && !overrides?.scenario) {
        try {
          const mv = await analyzeMovement({
            speed_kmh: currentSpeed,
            latitude: gpsLocation?.lat,
            longitude: gpsLocation?.lng,
          });
          finalMovement = mv.movement.movement_risk_score;
          finalGps = mv.gps_context?.gps_context_score ?? finalGps;
        } catch {}
      }

      const res = await analyzeFusion({
        voice_risk_score: finalVoice,
        movement_risk_score: finalMovement,
        gps_context_score: finalGps,
        scenario: overrides?.scenario,
      });

      setFusionResult(res.data);
      setVoiceScore(res.data.component_scores.voice_risk_score);
      setMovementScore(res.data.component_scores.movement_risk_score);
      setGpsScore(res.data.component_scores.gps_context_score);
      setHistory(prev => [{ time: new Date().toLocaleTimeString(), result: res.data }, ...prev.slice(0, 9)]);
      evaluateFusion(res.data);
    } catch {
      toast.error("Fusion analysis error.");
    } finally {
      setAnalyzing(false);
    }
  }, [voiceScore, movementScore, gpsScore, gpsLocation, currentSpeed, isMonitoring, evaluateFusion]);

  const startMonitoring = () => {
    setIsMonitoring(true);
    runFusionAnalysis();
    intervalRef.current = setInterval(runFusionAnalysis, AUTO_ANALYZE_INTERVAL_MS);
    toast.success("🔁 Unified Risk Engine activated.");
  };

  const stopMonitoring = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsMonitoring(false);
  };

  const cancelEmergency = () => {
    if (cancelTimerRef.current) clearInterval(cancelTimerRef.current);
    criticalCountRef.current = 0;
    setEmergencyState("cancelled");
    setTimeout(() => setEmergencyState("idle"), 2500);
    toast.success("Emergency cancelled.");
  };

  /* Color helpers */
  const riskColor = (level: string | undefined) =>
    level === "CRITICAL" ? "bg-destructive text-destructive-foreground"
    : level === "HIGH" ? "bg-amber-600 text-white"
    : level === "MEDIUM" ? "bg-yellow-500 text-slate-900"
    : "bg-emerald-600 text-white";

  const recColor = (rec: string | undefined) => ({
    SAFE: "text-emerald-600", MONITOR: "text-yellow-600",
    ALERT: "text-amber-600", CRITICAL_SOS: "text-destructive",
  }[rec ?? "SAFE"] ?? "text-muted-foreground");

  const scoreBar = (score: number, label: string, icon: React.ReactNode, weight: string) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">({weight})</span>
        </div>
        <span className="font-bold">{score}<span className="text-xs font-normal text-muted-foreground">/100</span></span>
      </div>
      <Progress value={score} className="h-2.5" />
    </div>
  );

  /* ── Render ────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Emergency overlay */}
      {emergencyState !== "idle" && (
        <div className={`rounded-3xl border-2 p-6 md:p-8 shadow-lg ${
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
                  <div className="font-bold text-amber-700 dark:text-amber-400 text-lg">⚠️ High Unified Risk Score</div>
                  <p className="text-sm text-amber-600 dark:text-amber-300 mt-1">Score: {fusionResult?.final_risk_score}/100 · Watching for confirmation...</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => { criticalCountRef.current = 0; setEmergencyState("idle"); }}>
                <X className="mr-1 size-4" /> Dismiss
              </Button>
            </div>
          )}
          {emergencyState === "countdown" && (
            <div className="flex items-start gap-4 justify-between flex-wrap">
              <div className="flex items-center gap-3">
                <Siren className="size-10 text-red-600 animate-bounce shrink-0" />
                <div>
                  <div className="font-bold text-red-700 dark:text-red-400 text-xl">🚨 CRITICAL RISK CONFIRMED</div>
                  <div className="text-sm text-red-600 dark:text-red-300 mt-1">Unified Score: <strong>{fusionResult?.final_risk_score}/100</strong> · {fusionResult?.recommendation}</div>
                  <div className="mt-2 text-sm font-semibold text-red-700 dark:text-red-300">
                    Auto SOS in <span className="text-3xl font-black">{cancelCountdown}</span>s
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
                <Siren className="size-10 text-red-600" />
                <div>
                  <div className="font-bold text-red-700 dark:text-red-400 text-xl">🚨 FUSION SOS ACTIVE</div>
                  <p className="text-sm text-red-500 mt-1">Emergency contacts and nearby volunteers notified via email.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {[
                  ["ID", activeIncident._id?.slice(-8).toUpperCase()],
                  ["Source", "FUSION"],
                  ["Final Score", `${activeIncident.finalRiskScore ?? "?"}/100`],
                  ["Status", activeIncident.status],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-xl border border-red-300 bg-white/40 dark:bg-black/20 p-3">
                    <div className="text-xs text-muted-foreground">{l}</div>
                    <div className="font-bold text-xs mt-1 capitalize">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {emergencyState === "cancelled" && (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-8 text-emerald-500" />
              <div className="font-semibold text-emerald-700 dark:text-emerald-400">Emergency cancelled. Monitoring continues.</div>
            </div>
          )}
        </div>
      )}

      {/* Hero */}
      <div className="rounded-3xl gradient-hero p-6 text-white shadow-elegant md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/80">
              <Sparkles className="size-4 text-yellow-300" />
              SafeHer AI · Phase 2 · Unified Risk Engine
            </div>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">Multi-Modal Safety Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Voice + Movement + GPS context scores fused into a single real-time risk assessment. SOS triggered automatically when unified score ≥ {FUSION_SOS_THRESHOLD}.
            </p>
            {gpsLocation && (
              <div className="mt-2 text-xs text-white/60">
                <MapPin className="inline size-3 mr-1" />
                {gpsLocation.lat.toFixed(4)}, {gpsLocation.lng.toFixed(4)} · {currentSpeed.toFixed(1)} km/h
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {!isMonitoring ? (
              <Button onClick={startMonitoring} size="lg" className="bg-white text-slate-900 hover:bg-white/90 font-semibold shadow-lg">
                <Activity className="mr-2 size-5" /> Start Risk Engine
              </Button>
            ) : (
              <Button onClick={stopMonitoring} size="lg" variant="destructive" className="font-semibold shadow-lg">
                <X className="mr-2 size-5" /> Stop Engine
              </Button>
            )}
          </div>
        </div>
      </div>

      <Alert className="bg-blue-500/10 border-blue-500/30">
        <Info className="size-4 text-blue-600" />
        <AlertTitle className="text-sm font-semibold text-blue-900 dark:text-blue-200">Fusion Formula</AlertTitle>
        <AlertDescription className="text-xs text-blue-800 dark:text-blue-300 mt-1 font-mono">
          Final Score = Voice×50% + Movement×30% + GPS×20%
          · SOS threshold = {FUSION_SOS_THRESHOLD}/100
        </AlertDescription>
      </Alert>

      {/* Phase 3 Predictive Intelligence Link */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400">
            <Sparkles className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Proactive Early Warning Active (Phase 3)</p>
            <p className="text-xs text-muted-foreground">Spatial hotspot clustering, temporal hazard modeling, and check-in safety timers.</p>
          </div>
        </div>
        <Link to="/user/predictive-safety">
          <Button size="sm" variant="outline" className="text-xs border-purple-300 hover:bg-purple-500/10 text-purple-700 dark:text-purple-300">
            Open Predictive Safety →
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        {/* Final score card */}
        <Card className="md:col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Layers className="size-5 text-primary" />Unified Risk Score</CardTitle>
            <CardDescription>Weighted combination of all three AI channels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {/* Big score */}
            <div className="rounded-2xl border bg-muted/30 p-6 flex flex-col items-center text-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">Final Risk Score</span>
                {fusionResult && (
                  <Badge className={riskColor(fusionResult.final_risk_level)}>
                    {fusionResult.final_risk_level}
                  </Badge>
                )}
              </div>
              <div className="text-6xl font-extrabold tracking-tight">
                {fusionResult?.final_risk_score ?? 0}<span className="text-2xl font-medium text-muted-foreground"> / 100</span>
              </div>
              {fusionResult?.recommendation && (
                <div className={`text-lg font-bold tracking-wide ${recColor(fusionResult.recommendation)}`}>
                  → {fusionResult.recommendation}
                </div>
              )}
              <div className="w-full max-w-md">
                <Progress value={fusionResult?.final_risk_score ?? 0} className="h-4" />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>0 SAFE</span><span>30</span><span>50</span><span>78 SOS</span><span>100</span>
                </div>
              </div>
            </div>

            {/* Component bars */}
            <div className="space-y-4">
              {scoreBar(fusionResult?.component_scores.voice_risk_score ?? voiceScore, "Voice AI", <Bot className="size-4 text-purple-500" />, "50%")}
              {scoreBar(fusionResult?.component_scores.movement_risk_score ?? movementScore, "Movement AI", <Activity className="size-4 text-blue-500" />, "30%")}
              {scoreBar(fusionResult?.component_scores.gps_context_score ?? gpsScore, "GPS Context", <MapPin className="size-4 text-emerald-500" />, "20%")}
            </div>

            {/* Contributions */}
            {fusionResult?.risk_breakdown && (
              <div className="rounded-xl border p-4 bg-muted/20 grid grid-cols-3 text-center text-xs gap-2">
                <div>
                  <div className="text-muted-foreground">Voice</div>
                  <div className="font-bold mt-1">+{fusionResult.risk_breakdown.voice_contribution}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Movement</div>
                  <div className="font-bold mt-1">+{fusionResult.risk_breakdown.movement_contribution}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">GPS</div>
                  <div className="font-bold mt-1">+{fusionResult.risk_breakdown.gps_contribution}</div>
                </div>
              </div>
            )}

            {/* Manual SOS button */}
            {emergencyState === "idle" && fusionResult && fusionResult.final_risk_score >= 50 && (
              <Button className="w-full bg-destructive text-white hover:bg-destructive/90" size="lg"
                onClick={() => setEmergencyState("countdown")}>
                <Siren className="mr-2 size-5" /> Trigger Emergency SOS
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Demo + manual controls */}
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Zap className="size-5 text-indigo-500" />Demo Scenarios</CardTitle>
            <CardDescription>Test fusion scenarios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              ["safe", "All Clear 🟢", "text-emerald-500"],
              ["low_risk", "Low Risk — Monitor 🟡", "text-yellow-500"],
              ["voice_only", "Voice Distress Only 🎤", "text-purple-500"],
              ["movement_only", "Movement Anomaly Only 🚶", "text-blue-500"],
              ["high_risk", "High Risk ⚠️", "text-amber-500"],
              ["critical_fusion", "Critical Emergency 🆘", "text-red-600"],
            ].map(([id, label, color]) => (
              <Button key={id} variant="outline" className="w-full justify-start text-xs font-medium"
                disabled={analyzing} onClick={() => runFusionAnalysis({ scenario: id })}>
                <Play className={`mr-2 size-3.5 ${color}`} />{label}
              </Button>
            ))}
          </CardContent>

          {/* Manual sliders alternate: manual input boxes */}
          <CardContent className="border-t pt-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Manual Input</p>
            {[
              ["Voice", voiceScore, setVoiceScore, "text-purple-500"],
              ["Movement", movementScore, setMovementScore, "text-blue-500"],
              ["GPS", gpsScore, setGpsScore, "text-emerald-500"],
            ].map(([label, val, setter, color]: any) => (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${color}`}>{label} Score</span>
                  <span className="font-bold">{val}</span>
                </div>
                <input
                  type="range" min={0} max={100} value={val}
                  onChange={(e) => setter(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            ))}
            <Button className="w-full mt-2" size="sm" disabled={analyzing}
              onClick={() => runFusionAnalysis({ voice: voiceScore, movement: movementScore, gps: gpsScore })}>
              {analyzing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <TrendingUp className="mr-2 size-4" />}
              Analyze Now
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Fusion Analysis Log</CardTitle>
            <CardDescription>Recent unified risk assessments</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setHistory([])} className="text-xs">
            <RefreshCw className="mr-1 size-3" /> Clear
          </Button>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">No analysis yet. Start monitoring or run a demo.</div>
          ) : (
            <div className="divide-y text-xs">
              {history.map((item, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-muted-foreground">{item.time}</span>
                    <span className={`font-bold ${recColor(item.result.recommendation)}`}>{item.result.recommendation}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      V:{item.result.component_scores.voice_risk_score} M:{item.result.component_scores.movement_risk_score} G:{item.result.component_scores.gps_context_score}
                    </span>
                    <span className="font-bold">→ {item.result.final_risk_score}/100</span>
                    <Badge className={riskColor(item.result.final_risk_level)}>{item.result.final_risk_level}</Badge>
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
