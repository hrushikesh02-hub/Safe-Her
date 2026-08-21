import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { getRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck,
  ShieldAlert,
  Mic,
  MicOff,
  Activity,
  Navigation,
  Siren,
  Power,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Phone,
  Volume2,
  Zap,
  Play,
  Loader2,
  Radio,
  Send,
} from "lucide-react";
import {
  analyzeFusion,
  triggerFusionSOS,
} from "@/services/fusionAIService";
import { toast } from "sonner";

export const Route = createFileRoute("/user/ai-fusion")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (getRole() !== "user") throw redirect({ to: "/login" });
  },
  component: SafetyShieldPage,
});

const CANCEL_COUNTDOWN_SEC = 5;
const AUTO_EVAL_INTERVAL_MS = 4000;

interface AccelSample {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

const EMERGENCY_KEYWORDS = [
  "help",
  "save",
  "save me",
  "help me",
  "please help",
  "please help me",
  "somebody help",
  "bachao",
  "mujhe bachao",
  "emergency",
  "danger",
  "in danger",
  "call police",
  "call the police",
  "stop",
  "leave me",
  "leave me alone",
  "don't touch me",
  "don't touch",
  "dont touch",
  "dont touch me",
  "let me go",
  "get away",
  "touch",
  "attack",
  "trouble",
  "rescue",
];

function SafetyShieldPage() {
  const navigate = useNavigate();

  // Protection Master & Sensor Toggles
  const [isMonitoring, setIsMonitoring] = useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [movementEnabled, setMovementEnabled] = useState<boolean>(true);
  const [locationEnabled, setLocationEnabled] = useState<boolean>(true);

  // Live Sensor Signals
  const [micActive, setMicActive] = useState<boolean>(false);
  const [speechActive, setSpeechActive] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [lastHeardSpeech, setLastHeardSpeech] = useState<string>("");
  const [manualKeywordText, setManualKeywordText] = useState<string>("");
  const [motionActive, setMotionActive] = useState<boolean>(false);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [voiceRiskScore, setVoiceRiskScore] = useState<number>(10);
  const [movementRiskScore, setMovementRiskScore] = useState<number>(10);
  const [recentAnomalies, setRecentAnomalies] = useState<string[]>([]);

  // Overall Safety Score & Status
  const [safetyScore, setSafetyScore] = useState<number>(95);
  const [safetyLevel, setSafetyLevel] = useState<"SAFE" | "ELEVATED" | "EMERGENCY">("SAFE");
  const [evaluating, setEvaluating] = useState<boolean>(false);

  // Coordinates
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Emergency trigger & cancellation
  const [isEmergencyTriggered, setIsEmergencyTriggered] = useState<boolean>(false);
  const [emergencyReason, setEmergencyReason] = useState<string>("Distress Detected");
  const [countdown, setCountdown] = useState<number>(CANCEL_COUNTDOWN_SEC);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);

  // Refs
  const countdownRef = useRef<any>(null);
  const autoEvalRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const accelSamplesRef = useRef<AccelSample[]>([]);
  const lastKeywordTriggerRef = useRef<number>(0);
  const isMonitoringRef = useRef<boolean>(true);
  const voiceEnabledRef = useRef<boolean>(true);

  useEffect(() => {
    isMonitoringRef.current = isMonitoring;
    voiceEnabledRef.current = voiceEnabled;
  }, [isMonitoring, voiceEnabled]);

  /* ==============================================================
     1. GEOLOCATION TRACKING
  ============================================================== */
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        const spd = (pos.coords.speed ?? 0) * 3.6;
        setCurrentSpeed(spd);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  /* ==============================================================
     2. ACCELEROMETER / DEVICE MOTION LISTENER
  ============================================================== */
  useEffect(() => {
    if (!movementEnabled || !isMonitoring) {
      setMotionActive(false);
      return;
    }

    const handleMotion = (e: DeviceMotionEvent) => {
      setMotionActive(true);
      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (!acc) return;

      const x = acc.x ?? 0;
      const y = acc.y ?? 0;
      const z = acc.z ?? 0;
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      accelSamplesRef.current.push({ x, y, z, timestamp: Date.now() });
      if (accelSamplesRef.current.length > 30) accelSamplesRef.current.shift();

      // Detect severe fall or violent shake impact (> 26 m/s²)
      if (magnitude > 26) {
        const now = Date.now();
        if (now - lastKeywordTriggerRef.current > 4000) {
          lastKeywordTriggerRef.current = now;
          setMovementRiskScore(90);
          setRecentAnomalies((prev) => [
            `🚨 Sudden High-G Impact / Fall detected (${magnitude.toFixed(1)} m/s²)`,
            ...prev.slice(0, 4),
          ]);
          triggerAutoEmergency("High-G Impact / Physical Fall Detected");
        }
      }
    };

    window.addEventListener("devicemotion", handleMotion);
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, [movementEnabled, isMonitoring]);

  /* ==============================================================
     3. DISTRESS KEYWORD HANDLER
  ============================================================== */
  const handleKeywordMatch = useCallback((matchedText: string, source: string = "Spoken") => {
    const lower = matchedText.toLowerCase().trim();
    const matched = EMERGENCY_KEYWORDS.find((kw) => lower.includes(kw));

    if (matched) {
      const now = Date.now();
      if (now - lastKeywordTriggerRef.current < 2500) return;
      lastKeywordTriggerRef.current = now;

      setLastHeardSpeech(matchedText);
      setVoiceRiskScore(98);
      setRecentAnomalies((prev) => [
        `🚨 ${source} Distress Keyword Detected: "${matched}" in "${matchedText}"`,
        ...prev.slice(0, 4),
      ]);

      // Play emergency alert sound
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch {}

      toast.error(`🚨 Emergency Distress Keyword Detected: "${matched}"`, { duration: 5000 });
      triggerAutoEmergency(`Voice Distress Keyword: "${matched}"`);
    } else {
      setLastHeardSpeech(matchedText);
    }
  }, []);

  /* ==============================================================
     4. CONTINUOUS SPEECH RECOGNITION (Independent Pipeline)
  ============================================================== */
  useEffect(() => {
    if (!isMonitoring || !voiceEnabled) {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {}
        speechRecognitionRef.current = null;
      }
      setSpeechActive(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("SpeechRecognition API not available in this browser.");
      setSpeechActive(false);
      return;
    }

    let recognition: any = null;

    try {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setSpeechActive(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          handleKeywordMatch(transcript.trim(), "Spoken");
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error !== "no-speech") {
          console.warn("SpeechRecognition notice:", e?.error);
        }
      };

      recognition.onend = () => {
        if (isMonitoringRef.current && voiceEnabledRef.current) {
          try {
            recognition.start();
          } catch {}
        } else {
          setSpeechActive(false);
        }
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (err) {
      console.warn("Could not start SpeechRecognition:", err);
      setSpeechActive(false);
    }

    return () => {
      if (recognition) {
        try {
          recognition.stop();
        } catch {}
      }
    };
  }, [isMonitoring, voiceEnabled, handleKeywordMatch]);

  /* ==============================================================
     5. WEB AUDIO ANALYSER (Acoustic Decibel / Scream Monitor)
  ============================================================== */
  useEffect(() => {
    if (!isMonitoring || !voiceEnabled) {
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {}
        audioContextRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setMicActive(false);
      setAudioLevel(0);
      return;
    }

    let isCancelled = false;

    async function initAudio() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setMicActive(true);

        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkLevel = () => {
          if (!streamRef.current || !streamRef.current.active || isCancelled) return;
          analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));

          // Acoustic Scream / Loud Distress trigger (> 105 level)
          if (avg > 105) {
            const now = Date.now();
            if (now - lastKeywordTriggerRef.current > 4000) {
              lastKeywordTriggerRef.current = now;
              setVoiceRiskScore(92);
              setRecentAnomalies((prev) => [
                `🚨 High Decibel Acoustic Scream Detected (${Math.round(avg)})`,
                ...prev.slice(0, 4),
              ]);
              triggerAutoEmergency("Acoustic Scream / High Decibel Distress");
            }
          }

          requestAnimationFrame(checkLevel);
        };
        requestAnimationFrame(checkLevel);
      } catch (err) {
        console.warn("Audio mic stream not granted:", err);
        setMicActive(false);
      }
    }

    initAudio();

    return () => {
      isCancelled = true;
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isMonitoring, voiceEnabled]);

  /* ==============================================================
     6. PERIODIC AI FUSION RISK EVALUATION
  ============================================================== */
  const runEvaluation = useCallback(async () => {
    if (!isMonitoring || isEmergencyTriggered) return;
    setEvaluating(true);
    try {
      const res = await analyzeFusion({
        voice_risk_score: voiceEnabled ? voiceRiskScore : 0,
        movement_risk_score: movementEnabled ? movementRiskScore : 0,
        gps_context_score: locationEnabled ? 12 : 0,
      });

      if (res.success && res.data) {
        const risk = res.data.final_risk_score;
        const computedSafety = Math.max(5, 100 - risk);
        setSafetyScore(computedSafety);

        if (risk >= 75) {
          setSafetyLevel("EMERGENCY");
          triggerAutoEmergency("High Multi-Channel Fusion Risk Detected");
        } else if (risk >= 50) {
          setSafetyLevel("ELEVATED");
        } else {
          setSafetyLevel("SAFE");
        }
      }
    } catch {
      // Non-blocking
    } finally {
      setEvaluating(false);
    }
  }, [
    isMonitoring,
    isEmergencyTriggered,
    voiceEnabled,
    movementEnabled,
    locationEnabled,
    voiceRiskScore,
    movementRiskScore,
  ]);

  useEffect(() => {
    if (isMonitoring) {
      runEvaluation();
      autoEvalRef.current = setInterval(runEvaluation, AUTO_EVAL_INTERVAL_MS);
    } else {
      if (autoEvalRef.current) clearInterval(autoEvalRef.current);
    }
    return () => {
      if (autoEvalRef.current) clearInterval(autoEvalRef.current);
    };
  }, [isMonitoring, runEvaluation]);

  /* ==============================================================
     7. EMERGENCY COUNTDOWN & DISPATCH
  ============================================================== */
  function triggerAutoEmergency(reason: string = "Distress Signal Detected") {
    setEmergencyReason(reason);
    setIsEmergencyTriggered(true);
    setCountdown(CANCEL_COUNTDOWN_SEC);

    if (countdownRef.current) clearInterval(countdownRef.current);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          dispatchEmergencySOS(reason);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function cancelEmergency() {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setIsEmergencyTriggered(false);
    setVoiceRiskScore(10);
    setMovementRiskScore(10);
    setSafetyLevel("SAFE");
    setSafetyScore(95);
    toast.success("Emergency cancelled — Safety Shield monitoring continues.");
  }

  async function dispatchEmergencySOS(reason: string = "Safety Shield Automated Distress") {
    if (isDispatching) return;
    setIsDispatching(true);
    try {
      const lat = coords?.lat || 19.9019;
      const lng = coords?.lng || 74.4944;

      toast.loading("🚨 Dispatching Emergency Alert & notifying contacts & volunteers...", {
        id: "shield-sos",
      });

      await triggerFusionSOS({
        latitude: lat,
        longitude: lng,
        riskScore: 92,
        finalRiskScore: 92,
        finalRiskLevel: "CRITICAL",
        distressType: reason,
      });

      toast.dismiss("shield-sos");
      toast.error("🚨 EMERGENCY SOS ACTIVATED — Brevo emails sent & volunteers alerted!", {
        duration: 8000,
      });

      navigate({ to: "/user/sos" });
    } catch (err: any) {
      toast.dismiss("shield-sos");
      toast.error(
        err?.response?.data?.message ||
          "SOS dispatch failed. Please use the manual Emergency SOS button."
      );
      navigate({ to: "/user/sos" });
    } finally {
      setIsDispatching(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Safety Shield
            </h1>
            <Badge className="bg-emerald-600 text-white font-semibold text-xs">
              All-In-One AI Protection
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            24/7 background guardian actively listening for distress keywords, screams, and sudden falls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isMonitoring && (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 px-3 py-1 flex items-center gap-1.5 animate-pulse">
              <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
              Live Protection Active
            </Badge>
          )}
        </div>
      </div>

      {/* Emergency Countdown Intercept Banner */}
      {isEmergencyTriggered && (
        <div className="bg-red-50 dark:bg-red-950/40 border-2 border-red-500 rounded-2xl p-4 sm:p-5 text-red-950 dark:text-red-200 shadow-xl animate-pulse overflow-hidden">
          <div className="flex items-start gap-3 sm:gap-3.5">
            <div className="size-10 sm:size-12 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Siren className="size-5 sm:size-6 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-red-700 dark:text-red-400">
                  🚨 POTENTIAL DISTRESS DETECTED!
                </h3>
              </div>
              <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                <span className="text-xs text-red-700 dark:text-red-300 font-medium">
                  Dispatching automated SOS to contacts & nearby volunteers in:
                </span>
                <span className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">
                  {countdown}s
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full">
            <Button
              variant="outline"
              onClick={cancelEmergency}
              className="w-full sm:flex-1 font-bold text-xs sm:text-sm h-11 border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-900 dark:text-red-200"
            >
              I'm Safe (Cancel Alert)
            </Button>
            <Button
              variant="destructive"
              onClick={() => dispatchEmergencySOS(emergencyReason)}
              disabled={isDispatching}
              className="w-full sm:flex-1 font-bold text-xs sm:text-sm h-11 bg-red-600 hover:bg-red-700 text-white shadow-md"
            >
              {isDispatching ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Siren className="size-4 mr-2" />
              )}
              Trigger SOS Immediately
            </Button>
          </div>
        </div>
      )}

      {/* Primary Shield Card */}
      <div className="bg-card rounded-2xl border border-border/80 p-5 sm:p-8 shadow-xs text-center space-y-6">
        {/* Shield Icon & Status */}
        <div className="flex flex-col items-center">
          <div
            className={`size-20 sm:size-24 rounded-full flex items-center justify-center transition-all shadow-md ${
              isMonitoring
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border-4 border-emerald-300 dark:border-emerald-700 animate-pulse"
                : "bg-muted text-muted-foreground border-2 border-border"
            }`}
          >
            {isMonitoring ? (
              <ShieldCheck className="size-10 sm:size-12" />
            ) : (
              <Power className="size-8 sm:size-10" />
            )}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            <Badge
              className={`text-xs font-bold px-3 py-1 ${
                isMonitoring
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isMonitoring ? "● SHIELD ONLINE & PROTECTING" : "SHIELD PAUSED"}
            </Badge>

            <Badge
              variant="outline"
              className="text-xs font-semibold px-3 py-1 border-emerald-300 text-emerald-700 dark:text-emerald-300"
            >
              Safety Score: {safetyScore}%
            </Badge>
          </div>

          <h2 className="text-xl font-bold text-foreground mt-2">
            {isMonitoring
              ? "All-In-One Protection Active"
              : "Safety Shield is Paused"}
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mt-1">
            {isMonitoring
              ? "SafeHer AI is listening for spoken keywords ('help me', 'save', 'don't touch me'), distress screams, and device fall impacts."
              : "Activate Safety Shield whenever walking alone, traveling at night, or in unfamiliar locations."}
          </p>
        </div>

        {/* Live Audio Activity & Voice Visualizer */}
        {isMonitoring && voiceEnabled && (
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 text-left space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-300">
                <Volume2 className="size-4 text-indigo-600 animate-pulse" />
                Live Microphone & Speech Listener
                {speechActive ? (
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    (● Speech Listener Active)
                  </span>
                ) : (
                  <span className="text-[11px] font-normal text-amber-600">
                    (Speech API ready)
                  </span>
                )}
              </div>
              <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-400">
                Audio Volume: {audioLevel}%
              </span>
            </div>

            {/* Audio Level Bar */}
            <Progress value={audioLevel} className="h-2 bg-indigo-100 dark:bg-indigo-950" />

            {/* Real-time Speech Transcript Display */}
            <div className="text-xs bg-white/80 dark:bg-black/40 rounded-lg p-3 border border-indigo-100 dark:border-indigo-900/40 space-y-1">
              <div className="text-[11px] text-muted-foreground font-semibold flex items-center justify-between">
                <span>Microphone Speech Transcript:</span>
                <span className="text-[10px] text-indigo-600 font-mono">
                  Listening for: "help me", "save me", "don't touch me", "bachao"
                </span>
              </div>
              <p className="font-mono text-sm font-bold text-foreground">
                {lastHeardSpeech ? `"${lastHeardSpeech}"` : <span className="text-muted-foreground italic font-normal">Speak into your microphone to test...</span>}
              </p>
            </div>
          </div>
        )}

        {/* Protection Sensor Toggles */}
        <div className="bg-muted/40 rounded-xl p-4 border border-border/60 text-left space-y-3.5">
          {/* Voice Detection Switch */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0">
                <Mic className="size-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                  Voice Distress & Keyword Detection
                  {voiceEnabled && isMonitoring && (
                    <span className="size-2 rounded-full bg-emerald-500 inline-block" />
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Listens for 'help me', 'save', 'don't touch me', and acoustic screams
                </div>
              </div>
            </div>
            <Switch
              checked={voiceEnabled && isMonitoring}
              onCheckedChange={(checked) => setVoiceEnabled(checked)}
              disabled={!isMonitoring}
            />
          </div>

          {/* Movement Detection Switch */}
          <div className="pt-3 border-t border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
                <Activity className="size-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                  Movement Anomaly & Fall Detection
                  {motionActive && isMonitoring && (
                    <span className="size-2 rounded-full bg-emerald-500 inline-block" />
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Tracks 3-axis accelerometer for sudden impacts, forced running, or falls
                </div>
              </div>
            </div>
            <Switch
              checked={movementEnabled && isMonitoring}
              onCheckedChange={(checked) => setMovementEnabled(checked)}
              disabled={!isMonitoring}
            />
          </div>

          {/* Location Context Switch */}
          <div className="pt-3 border-t border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
                <Navigation className="size-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">
                  Live GPS & Safe Zone Context
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {coords
                    ? `GPS: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} (${currentSpeed.toFixed(1)} km/h)`
                    : "Acquiring satellite GPS coordinates..."}
                </div>
              </div>
            </div>
            <Switch
              checked={locationEnabled && isMonitoring}
              onCheckedChange={(checked) => setLocationEnabled(checked)}
              disabled={!isMonitoring}
            />
          </div>
        </div>

        {/* Recent Anomaly Stream */}
        {recentAnomalies.length > 0 && (
          <div className="text-left space-y-2">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Recent Detection Feed
            </div>
            <div className="space-y-1.5">
              {recentAnomalies.map((anom, idx) => (
                <div
                  key={idx}
                  className="text-xs bg-muted/60 rounded-lg px-3 py-1.5 border border-border/60 font-medium text-foreground"
                >
                  {anom}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instant Distress Word Test Chips & Phrase Simulator */}
        <div className="rounded-xl border border-dashed border-indigo-200 dark:border-indigo-900/60 p-4 text-left space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-foreground">
                Instant Distress Keyword Simulator
              </h3>
            </div>
            <span className="text-[10px] text-muted-foreground">1-Tap Testing</span>
          </div>

          {/* Quick Distress Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleKeywordMatch("Help me! Please help!", "Simulated")}
              className="text-xs font-semibold justify-start h-9 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
            >
              <Play className="size-3 text-indigo-600 mr-1.5" />
              "Help Me"
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleKeywordMatch("Save me! I need help!", "Simulated")}
              className="text-xs font-semibold justify-start h-9 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
            >
              <Play className="size-3 text-indigo-600 mr-1.5" />
              "Save Me"
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleKeywordMatch("Don't touch me! Leave me alone!", "Simulated")}
              className="text-xs font-semibold justify-start h-9 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
            >
              <Play className="size-3 text-indigo-600 mr-1.5" />
              "Don't Touch Me"
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleKeywordMatch("Mujhe bachao! Bachao!", "Simulated")}
              className="text-xs font-semibold justify-start h-9 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
            >
              <Play className="size-3 text-indigo-600 mr-1.5" />
              "Bachao"
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleKeywordMatch("Emergency! Call the police!", "Simulated")}
              className="text-xs font-semibold justify-start h-9 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
            >
              <Play className="size-3 text-indigo-600 mr-1.5" />
              "Call Police"
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMovementRiskScore(90);
                setRecentAnomalies((prev) => [
                  `🚨 Simulated Sudden Fall & High-G Impact`,
                  ...prev.slice(0, 4),
                ]);
                triggerAutoEmergency("Simulated Physical Fall / Sudden Impact");
              }}
              className="text-xs font-semibold justify-start h-9 border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-950/50"
            >
              <Play className="size-3 text-purple-600 mr-1.5" />
              Sudden Fall
            </Button>
          </div>

          {/* Type Any Phrase Input */}
          <div className="pt-2 flex items-center gap-2">
            <Input
              type="text"
              placeholder="Or type any phrase to test (e.g. 'help me', 'save me')..."
              value={manualKeywordText}
              onChange={(e) => setManualKeywordText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && manualKeywordText.trim()) {
                  handleKeywordMatch(manualKeywordText.trim(), "Typed");
                  setManualKeywordText("");
                }
              }}
              className="h-8 text-xs bg-background"
            />
            <Button
              size="sm"
              onClick={() => {
                if (manualKeywordText.trim()) {
                  handleKeywordMatch(manualKeywordText.trim(), "Typed");
                  setManualKeywordText("");
                }
              }}
              className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3"
            >
              <Send className="size-3 mr-1" /> Test
            </Button>
          </div>
        </div>

        {/* Main Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Button
            size="lg"
            variant={isMonitoring ? "outline" : "default"}
            onClick={() => {
              const nextState = !isMonitoring;
              setIsMonitoring(nextState);
              toast.info(nextState ? "Safety Shield Activated" : "Safety Shield Paused");
            }}
            className="w-full sm:flex-1 h-12 text-xs font-bold rounded-xl"
          >
            <Power className="size-4 mr-2" />
            {isMonitoring ? "Pause Safety Shield" : "Activate Protection"}
          </Button>

          <Link to="/user/sos" className="w-full sm:flex-1">
            <Button
              size="lg"
              variant="destructive"
              className="w-full h-12 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md"
            >
              <Siren className="size-4 mr-2" />
              Manual Emergency SOS
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
