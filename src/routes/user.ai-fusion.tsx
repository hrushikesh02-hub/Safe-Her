import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { getRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  ShieldAlert,
  Mic,
  Activity,
  Navigation,
  Sparkles,
  Siren,
  Power,
  RefreshCw,
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  analyzeFusion,
  triggerFusionSOS,
  type FusionAnalysisResult,
} from "@/services/fusionAIService";
import { analyzeVoiceAudio } from "@/services/aiVoiceService";
import { toast } from "sonner";

export const Route = createFileRoute("/user/ai-fusion")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (getRole() !== "user") throw redirect({ to: "/login" });
  },
  component: SimpleSafetyShield,
});

const CANCEL_COUNTDOWN_SEC = 5;
const AUTO_EVAL_INTERVAL_MS = 2000;

function SimpleSafetyShield() {
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [fusionResult, setFusionResult] = useState<FusionAnalysisResult | null>(null);

  // Subsystem health states
  const [voiceAvailable, setVoiceAvailable] = useState(true);
  const [motionAvailable, setMotionAvailable] = useState(true);
  const [locationAvailable, setLocationAvailable] = useState(true);
  const [predictionAvailable, setPredictionAvailable] = useState(true);

  // Live Sensor Risk Trackers
  const liveVoiceRiskRef = useRef<number>(14);
  const liveMotionRiskRef = useRef<number>(12);
  const liveGpsRiskRef = useRef<number>(15);

  // GPS Coordinates
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const gpsWatchRef = useRef<number | null>(null);

  // Audio / Speech Recognition Refs
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const currentTranscriptRef = useRef<string>("");
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [speechActive, setSpeechActive] = useState(false);

  // Emergency / Distress State
  const [isDistressDetected, setIsDistressDetected] = useState(false);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [cancelCountdown, setCancelCountdown] = useState(CANCEL_COUNTDOWN_SEC);
  const countdownTimerRef = useRef<any>(null);
  const autoEvalTimerRef = useRef<any>(null);

  /* 1. Track Real Geolocation & Time-based Context */
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationAvailable(false);
      return;
    }

    // Evaluate time-based context risk (night hours 22:00 - 05:00 have higher base risk)
    const hour = new Date().getHours();
    const isNight = hour >= 22 || hour < 5;
    liveGpsRiskRef.current = isNight ? 28 : 14;

    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLocationAvailable(true);
        setGpsLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        // Speed context if moving fast
        if (pos.coords.speed && pos.coords.speed > 5) {
          liveGpsRiskRef.current = Math.min(45, (liveGpsRiskRef.current || 15) + 10);
        }
      },
      () => {
        setLocationAvailable(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    return () => {
      if (gpsWatchRef.current != null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
      }
    };
  }, []);

  /* 2. Track Live Device Motion / Accelerometer */
  useEffect(() => {
    const handleMotion = (event: DeviceMotionEvent) => {
      setMotionAvailable(true);
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 9.8;
      const mag = Math.sqrt(x * x + y * y + z * z);
      const delta = Math.abs(mag - 9.8); // Deviation from gravity

      if (delta > 15) {
        // Sudden violent shake / impact / fall
        liveMotionRiskRef.current = 85;
      } else if (delta > 8) {
        // Fast running / heavy movement
        liveMotionRiskRef.current = 45;
      } else if (delta > 2) {
        // Normal walking / hand movement
        liveMotionRiskRef.current = 22;
      } else {
        // Stationary
        liveMotionRiskRef.current = 12;
      }
    };

    if (typeof window !== "undefined" && "DeviceMotionEvent" in window) {
      window.addEventListener("devicemotion", handleMotion);
    }

    return () => {
      if (typeof window !== "undefined" && "DeviceMotionEvent" in window) {
        window.removeEventListener("devicemotion", handleMotion);
      }
    };
  }, []);

  /* 3. Start Live Microphone, AnalyserNode Volume & Speech Recognition */
  const startLiveVoiceGuard = useCallback(async () => {
    // If already active, don't restart
    if (audioStreamRef.current && audioStreamRef.current.active) return;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setVoiceAvailable(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      audioStreamRef.current = stream;
      setVoiceAvailable(true);

      // Setup Web Audio Analyser for Real-time Sound Intensity Tracking
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkLiveVolume = () => {
          if (!audioStreamRef.current || !audioStreamRef.current.active) return;
          analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avgVolume = sum / dataArray.length;

          if (avgVolume > 110) {
            // Loud scream / shout spike
            liveVoiceRiskRef.current = 95;
            triggerImmediateDistress("scream", 95);
          } else if (avgVolume > 60) {
            // Talking / Loud ambient sound
            liveVoiceRiskRef.current = Math.min(65, Math.round(20 + (avgVolume - 60) * 0.8));
          } else if (avgVolume > 20) {
            // Low murmur / room noise
            liveVoiceRiskRef.current = Math.min(30, Math.round(12 + avgVolume * 0.3));
          } else {
            // Quiet
            liveVoiceRiskRef.current = 14;
          }

          requestAnimationFrame(checkLiveVolume);
        };
        requestAnimationFrame(checkLiveVolume);
      } catch (audioErr) {
        console.warn("AudioContext init notice:", audioErr);
      }

      // Start Web Speech Recognition
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";

          recognition.onresult = async (event: any) => {
            let transcript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              transcript += event.results[i][0].transcript;
            }

            if (transcript.trim()) {
              currentTranscriptRef.current = transcript.trim();
              setLiveTranscript(transcript.trim());
              console.log("🎤 Speech heard:", transcript.trim());
              const lower = transcript.toLowerCase();
              const emergencyWords = [
                "help",
                "help me",
                "save me",
                "please help",
                "please help me",
                "bachao",
                "mujhe bachao",
                "emergency",
                "danger",
                "in danger",
                "call police",
                "sos",
                "stop",
                "leave me",
                "don't touch me",
              ];

              const matched = emergencyWords.some((w) => lower.includes(w));
              if (matched) {
                console.log("🚨 DISTRESS KEYWORD MATCHED:", transcript);
                toast.warning(`🎤 Heard: "${transcript.trim()}" — Triggering distress!`, { duration: 3000 });
                liveVoiceRiskRef.current = 98;
                triggerImmediateDistress("distress_keyword", 98);
              }
            }
          };

          recognition.onerror = (e: any) => {
            console.warn("SpeechRecognition error:", e?.error);
            if (e?.error === 'not-allowed') {
              toast.error("Microphone access denied. Please allow mic access.");
            }
          };

          recognition.onstart = () => {
            console.log("🎤 Speech recognition STARTED");
            setSpeechActive(true);
          };

          recognition.onend = () => {
            console.log("🎤 Speech recognition ENDED, restarting...");
            setSpeechActive(false);
            if (audioStreamRef.current && audioStreamRef.current.active) {
              try {
                recognition.start();
              } catch (_) {}
            }
          };

          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch (speechErr) {
          console.warn("SpeechRecognition init error:", speechErr);
        }
      }
    } catch (err) {
      console.warn("Microphone access notice:", err);
      setVoiceAvailable(false);
    }
  }, []);

  const stopLiveVoiceGuard = useCallback(() => {
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (_) {}
      audioContextRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (_) {}
      speechRecognitionRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
  }, []);

  /* Helper to immediately trigger distress */
  const triggerImmediateDistress = useCallback((reason: string, score: number) => {
    setIsDistressDetected(true);
    setFusionResult((prev) => ({
      success: true,
      final_risk_score: score,
      final_risk_level: "CRITICAL",
      recommendation: "CRITICAL_SOS",
      component_scores: {
        voice_risk_score: score,
        movement_risk_score: liveMotionRiskRef.current,
        gps_context_score: liveGpsRiskRef.current,
      },
      risk_breakdown: {
        voice_contribution: 50,
        movement_contribution: 25,
        gps_contribution: 25,
        weights_used: { voice: 0.5, movement: 0.3, gps: 0.2 },
      },
    }));
  }, []);

  /* 4. Real Multi-Modal AI Risk Evaluation */
  const runEvaluation = useCallback(
    async (scenarioOverride?: string, voiceRiskOverride?: number) => {
      setAnalyzing(true);

      try {
        const vRisk = voiceRiskOverride ?? liveVoiceRiskRef.current;
        const mRisk = liveMotionRiskRef.current;
        const gRisk = liveGpsRiskRef.current;

        const res = await analyzeFusion({
          voice_risk_score: vRisk,
          movement_risk_score: mRisk,
          gps_context_score: gRisk,
          scenario: scenarioOverride,
        });

        // API returns { success, data: FusionAnalysisResult, should_trigger_sos }
        const fusionData = res.data || res;
        setFusionResult(fusionData);
        setMotionAvailable(true);
        setPredictionAvailable(true);

        const voiceAloneCritical = vRisk >= 75;

        const isCritical =
          voiceAloneCritical ||
          fusionData.final_risk_score >= 78 ||
          fusionData.final_risk_level === "CRITICAL" ||
          fusionData.recommendation === "CRITICAL_SOS" ||
          res.should_trigger_sos === true;

        if (isCritical) {
          setIsDistressDetected(true);
        } else {
          setIsDistressDetected(false);
        }
      } catch (err: any) {
        console.error("[SafetyShield] Backend analysis error:", err);
        setPredictionAvailable(false);
      } finally {
        setAnalyzing(false);
      }
    },
    []
  );

  const executeAutoSOSRef = useRef<() => Promise<void>>(async () => {});

  /* 4. Trigger Automatic SOS when Critical */
  const executeAutoSOS = useCallback(async () => {
    try {
      const lat = gpsLocation?.lat || 19.8911;
      const lng = gpsLocation?.lng || 74.4819;

      toast.loading("🚨 Dispatching Emergency SOS to contacts & nearby volunteers...", { id: "fusion-sos" });

      await triggerFusionSOS({
        latitude: lat,
        longitude: lng,
        finalRiskScore: fusionResult?.final_risk_score || 95,
        finalRiskLevel: fusionResult?.final_risk_level || "CRITICAL",
        riskScore: fusionResult?.component_scores?.voice_risk_score || 95,
        movementRiskScore: fusionResult?.component_scores?.movement_risk_score || 80,
        gpsContextScore: fusionResult?.component_scores?.gps_context_score || 75,
        fusionSource: "AI_SAFETY_SHIELD",
      });

      toast.dismiss("fusion-sos");
      setIsEmergencyActive(true);
      setIsDistressDetected(false);
      toast.error("🚨 Automatic SOS Triggered! Emergency network & volunteers alerted.", { duration: 8000 });
    } catch (err: any) {
      toast.dismiss("fusion-sos");
      console.error("[AutoSOS] Failed:", err);
      toast.error(err?.message || "Emergency dispatch communication error");
    }
  }, [gpsLocation, fusionResult]);

  useEffect(() => {
    executeAutoSOSRef.current = executeAutoSOS;
  }, [executeAutoSOS]);

  /* 5. Manage Monitoring Lifecycle (Pause polling when distress is detected) */
  useEffect(() => {
    if (isMonitoring && !isEmergencyActive && !isDistressDetected) {
      startLiveVoiceGuard();
      runEvaluation();
      autoEvalTimerRef.current = setInterval(() => runEvaluation(), AUTO_EVAL_INTERVAL_MS);
    } else {
      if (autoEvalTimerRef.current) {
        clearInterval(autoEvalTimerRef.current);
        autoEvalTimerRef.current = null;
      }
    }

    return () => {
      if (autoEvalTimerRef.current) {
        clearInterval(autoEvalTimerRef.current);
        autoEvalTimerRef.current = null;
      }
    };
  }, [isMonitoring, isEmergencyActive, isDistressDetected]);

  /* 6. Countdown Guard on Distress Detection (Solid, non-resetting ticker) */
  useEffect(() => {
    if (!isDistressDetected || isEmergencyActive) return;

    console.log("🔴 DISTRESS DETECTED — Starting 3s countdown to auto-SOS");
    toast.error("🔴 DISTRESS DETECTED — SOS in 3 seconds!", { duration: 3000, id: "distress-countdown" });
    setCancelCountdown(3);

    const timer = setInterval(() => {
      setCancelCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          executeAutoSOSRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isDistressDetected, isEmergencyActive]);

  const handleCancelEmergency = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setIsDistressDetected(false);
    setIsEmergencyActive(false);
    runEvaluation("safe");
    toast.success("Emergency check cancelled.");
  };

  // Determine overall safety state
  const riskScore = fusionResult?.final_risk_score ?? 15;
  const isSafe = riskScore < 50 && !isDistressDetected && !isEmergencyActive;
  const isElevated = riskScore >= 50 && riskScore < 78 && !isEmergencyActive;

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12">
      {/* ── HEADER ────────────────────────────────────────────── */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center justify-center gap-2">
          <Sparkles className="size-6 text-primary" /> SAFETY SHIELD AI
        </h1>
        <p className="text-xs text-muted-foreground">
          Continuous multi-sensor background intelligence
        </p>
      </div>

      {/* ── EMERGENCY ACTIVE BANNER ──────────────────────────── */}
      {isEmergencyActive ? (
        <div className="rounded-3xl bg-red-600 text-white p-6 shadow-2xl space-y-4 animate-pulse text-center">
          <div className="size-16 rounded-full bg-white/20 grid place-items-center mx-auto">
            <Siren className="size-10 text-white" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-widest bg-white/20 inline-block px-3 py-1 rounded-full">
              🚨 EMERGENCY ACTIVE
            </div>
            <h2 className="text-2xl font-black mt-2">Automatic SOS Has Been Triggered</h2>
            <p className="text-xs text-red-100 mt-1 max-w-sm mx-auto">
              SafeHer has escalated this incident to nearby responders and your emergency network.
            </p>
          </div>
          <Button asChild size="lg" className="w-full bg-white text-red-600 hover:bg-red-50 font-black h-12 rounded-2xl shadow">
            <Link to="/user/sos">
              <Siren className="mr-2 size-5" /> VIEW EMERGENCY
            </Link>
          </Button>
        </div>
      ) : isDistressDetected ? (
        /* ── DISTRESS DETECTED (COUNTDOWN) ─────────────────── */
        <div className="rounded-3xl bg-rose-600 text-white p-6 shadow-2xl space-y-4 text-center">
          <div className="size-16 rounded-full bg-white/20 grid place-items-center mx-auto animate-bounce">
            <AlertOctagon className="size-10 text-white" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-widest bg-white/20 inline-block px-3 py-1 rounded-full">
              🔴 DISTRESS DETECTED
            </div>
            <h2 className="text-2xl font-black mt-2">SafeHer Detected a Possible Emergency</h2>
            <p className="text-xs text-rose-100 mt-1">
              Checking your safety... Automatic SOS in{" "}
              <span className="font-extrabold text-lg underline">{cancelCountdown}s</span>
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleCancelEmergency}
              variant="outline"
              size="lg"
              className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold rounded-2xl h-12"
            >
              I'M OK · CANCEL
            </Button>
            <Button
              onClick={executeAutoSOS}
              size="lg"
              className="flex-1 bg-white text-rose-600 hover:bg-rose-50 font-black rounded-2xl h-12 shadow"
            >
              DISPATCH NOW
            </Button>
          </div>
        </div>
      ) : isMonitoring ? (
        /* ── MAIN ACTIVE SHIELD CARD ────────────────────────── */
        <div
          className={`rounded-3xl p-6 md:p-8 text-white shadow-xl space-y-6 text-center transition-all ${
            isSafe
              ? "bg-gradient-to-br from-emerald-600 to-teal-700"
              : "bg-gradient-to-br from-amber-600 to-orange-700"
          }`}
        >
          <div className="size-20 rounded-full bg-white/20 grid place-items-center mx-auto shadow-inner">
            {isSafe ? (
              <ShieldCheck className="size-12 text-emerald-200" />
            ) : (
              <ShieldAlert className="size-12 text-amber-200" />
            )}
          </div>

          <div>
            <div className="text-xs font-black tracking-widest uppercase bg-white/20 inline-block px-3 py-1 rounded-full">
              {isSafe ? "🟢 SAFE" : "🟡 SAFETY ALERT"}
            </div>
            <h2 className="text-2xl font-black mt-2">
              {isSafe ? "Your Safety Monitoring is Active" : "Unusual Activity Detected"}
            </h2>
            <p className="text-xs text-white/80 mt-1">
              {isSafe
                ? "All AI protection channels are continuously safeguarding you."
                : "Elevated risk observed. Keep your phone accessible."}
            </p>
          </div>

          {/* Real Safety Score Display */}
          <div className="bg-black/20 backdrop-blur rounded-2xl p-4 max-w-xs mx-auto space-y-1">
            <div className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
              AI Risk Index
            </div>
            <div className="text-3xl font-black tracking-tight">{riskScore} / 100</div>
            <div className="text-[10px] font-extrabold tracking-widest uppercase text-white/90">
              {fusionResult?.final_risk_level || (isSafe ? "LOW RISK" : "ELEVATED")}
            </div>
          </div>

          {/* Toggle Button */}
          <Button
            onClick={() => setIsMonitoring(false)}
            size="lg"
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white border-white/40 font-black rounded-2xl h-11 w-full max-w-xs mx-auto flex items-center justify-center gap-2"
          >
            <Power className="size-4" /> STOP MONITORING
          </Button>
        </div>
      ) : (
        /* ── MONITORING OFF STATE ───────────────────────────── */
        <div className="rounded-3xl border bg-card p-8 shadow-sm space-y-6 text-center">
          <div className="size-20 rounded-full bg-muted grid place-items-center mx-auto">
            <ShieldAlert className="size-12 text-muted-foreground" />
          </div>

          <div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              ⚪ MONITORING OFF
            </div>
            <h2 className="text-xl font-bold text-foreground mt-1">Safety Shield is Inactive</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Enable monitoring for automatic distress, motion anomaly, and emergency detection.
            </p>
          </div>

          <Button
            onClick={() => setIsMonitoring(true)}
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl h-12 w-full max-w-xs shadow"
          >
            <Power className="size-5 mr-2" /> START MONITORING
          </Button>
        </div>
      )}

      {/* ── AI SENSOR STATUS TILES ────────────────────────────── */}
      <div className="rounded-3xl border bg-card p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            AI Safety Status
          </span>
          {analyzing && (
            <span className="text-[10px] text-primary flex items-center gap-1 font-semibold">
              <RefreshCw className="size-3 animate-spin" /> Live Syncing
            </span>
          )}
        </div>

        <div className="divide-y text-xs">
          {/* Voice Guard */}
          <div className="py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Mic className="size-4 text-blue-500" />
              <span className="font-semibold text-foreground">Voice Guard</span>
            </div>
            <span
              className={`font-bold flex items-center gap-1 ${
                voiceAvailable ? "text-emerald-600" : "text-muted-foreground"
              }`}
            >
              {voiceAvailable ? (
                <>
                  <CheckCircle2 className="size-3.5" /> Active
                </>
              ) : (
                <>
                  <XCircle className="size-3.5" /> Unavailable
                </>
              )}
            </span>
          </div>

          {/* Movement Sensor */}
          <div className="py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity className="size-4 text-purple-500" />
              <span className="font-semibold text-foreground">Movement Anomaly</span>
            </div>
            <span
              className={`font-bold flex items-center gap-1 ${
                motionAvailable ? "text-emerald-600" : "text-muted-foreground"
              }`}
            >
              {motionAvailable ? (
                <>
                  <CheckCircle2 className="size-3.5" /> Active
                </>
              ) : (
                <>
                  <XCircle className="size-3.5" /> Unavailable
                </>
              )}
            </span>
          </div>

          {/* Location & GPS */}
          <div className="py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Navigation className="size-4 text-emerald-500" />
              <span className="font-semibold text-foreground">Location Guard</span>
            </div>
            <span
              className={`font-bold flex items-center gap-1 ${
                locationAvailable ? "text-emerald-600" : "text-muted-foreground"
              }`}
            >
              {locationAvailable ? (
                <>
                  <CheckCircle2 className="size-3.5" /> Active
                </>
              ) : (
                <>
                  <XCircle className="size-3.5" /> Unavailable
                </>
              )}
            </span>
          </div>

          {/* Predictive Safety */}
          <div className="py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="size-4 text-amber-500" />
              <span className="font-semibold text-foreground">Prediction Engine</span>
            </div>
            <span
              className={`font-bold flex items-center gap-1 ${
                predictionAvailable ? "text-emerald-600" : "text-muted-foreground"
              }`}
            >
              {predictionAvailable ? (
                <>
                  <CheckCircle2 className="size-3.5" /> Active
                </>
              ) : (
                <>
                  <XCircle className="size-3.5" /> Unavailable
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* ── LIVE TRANSCRIPT DISPLAY ─────────────────────────── */}
      {isMonitoring && (
        <div className="rounded-2xl border bg-card p-4 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider flex items-center gap-1">
              <Mic className="size-3" /> Live Voice Monitor
            </span>
            <span className={`text-[10px] font-bold flex items-center gap-1 ${speechActive ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              <span className={`inline-block size-2 rounded-full ${speechActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
              {speechActive ? 'Listening' : 'Inactive'}
            </span>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 min-h-[40px] text-foreground/70 italic">
            {liveTranscript ? `"${liveTranscript}"` : 'Speak to see transcript here...'}
          </div>
        </div>
      )}

      {/* ── SIMULATION / TEST BAR (FOR DEMO SCENARIOS) ───────── */}
      <div className="rounded-2xl border bg-muted/30 p-4 text-xs space-y-3">
        <div className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
          Safety Scenario Test Controls
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => runEvaluation("safe")}
            className="text-[11px] h-8 bg-card"
          >
            Test Normal
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => runEvaluation("high_risk")}
            className="text-[11px] h-8 bg-card text-amber-600"
          >
            Test High Risk
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => runEvaluation("critical_fusion")}
            className="text-[11px] h-8 bg-card text-red-600 font-bold"
          >
            Test Emergency
          </Button>
        </div>
        <div className="border-t pt-2">
          <Button
            size="sm"
            onClick={() => {
              console.log("🚨 MANUAL TEST: Triggering voice SOS directly");
              toast.warning('🚨 Manual SOS Test — Triggering distress!', { duration: 3000 });
              liveVoiceRiskRef.current = 98;
              triggerImmediateDistress("manual_test_distress", 98);
            }}
            className="w-full h-10 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl"
          >
            <Siren className="size-4 mr-2" /> TEST VOICE SOS (Simulate Distress)
          </Button>
        </div>
      </div>
    </div>
  );
}
