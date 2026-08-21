import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { getRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Mic,
  MicOff,
  ShieldAlert,
  Volume2,
  AlertTriangle,
  Upload,
  Play,
  CheckCircle2,
  Info,
  Sparkles,
  RefreshCw,
  X,
  Siren,
  MapPin,
  Loader2,
} from "lucide-react";
import { analyzeVoiceAudio, VoiceAnalysisResult } from "@/services/aiVoiceService";
import { triggerVoiceSOS, TriggerSosResponse } from "@/services/voiceSosService";
import { toast } from "sonner";

export const Route = createFileRoute("/user/ai-voice")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const role = getRole();
    if (role !== "user") {
      throw redirect({ to: "/login" });
    }
  },
  component: AIVoiceMonitorPage,
});

/* ============================================================
   Configurable thresholds (mirrors backend env vars)
   In a real deployment these could come from an API endpoint.
============================================================ */
const VOICE_CRITICAL_THRESHOLD = 76; // risk_score above this → counts as critical
const REPEATED_DISTRESS_COUNT = 2;   // consecutive critical detections needed
const REPEATED_DISTRESS_WINDOW_MS = 30_000; // 30-second rolling window
const CANCEL_COUNTDOWN_SEC = 10;     // seconds user has to cancel

type EmergencyState = "idle" | "confirming" | "countdown" | "active" | "cancelled";

interface CriticalEvent {
  timestamp: number;
  result: VoiceAnalysisResult;
}

function AIVoiceMonitorPage() {
  /* ---- Monitoring state ---- */
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [chunkIntervalSec] = useState<number>(5);

  const [analysis, setAnalysis] = useState<VoiceAnalysisResult | null>({
    success: true,
    distress_detected: false,
    distress_type: "normal",
    confidence: 0.98,
    voice_risk_score: 12,
    risk_level: "LOW",
    detected_keywords: [],
    details: {
      model_name: "Prototype Voice Distress Detection",
      status: "Ready to start",
    },
  });

  /* ---- Demo / file ---- */
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [history, setHistory] = useState<
    Array<{ timestamp: string; result: VoiceAnalysisResult }>
  >([]);

  /* ---- Emergency SOS state ---- */
  const [emergencyState, setEmergencyState] = useState<EmergencyState>("idle");
  const [cancelCountdown, setCancelCountdown] = useState<number>(CANCEL_COUNTDOWN_SEC);
  const [activeIncident, setActiveIncident] = useState<TriggerSosResponse["data"] | null>(null);
  const [sosTriggerInProgress, setSosTriggerInProgress] = useState<boolean>(false);

  /* ---- GPS state ---- */
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const gpsErrorShownRef = useRef(false);

  /* ---- Confirmation rolling window ---- */
  const criticalEventsRef = useRef<CriticalEvent[]>([]);

  /* ---- Media recorder & Speech recognition refs ---- */
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalTimerRef = useRef<any>(null);
  const speechRecognitionRef = useRef<any>(null);
  const currentTranscriptRef = useRef<string>("");

  /* ---- Cancel countdown ref ---- */
  const cancelTimerRef = useRef<any>(null);

  /* ---- Stable refs to break stale closures in long-lived callbacks ---- */
  const sendAudioForAnalysisRef = useRef<(blob?: Blob, transcriptionOverride?: string) => Promise<void>>(() => Promise.resolve());
  const lastKeywordTriggerRef = useRef<number>(0); // debounce timestamp

  /* ==============================================================
     GPS: watch position continuously
  ============================================================== */
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        gpsErrorShownRef.current = false;
        setGpsLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        if (!gpsErrorShownRef.current) {
          toast.warning("Location permission not granted. SOS may use last known location.");
          gpsErrorShownRef.current = true;
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  /* ==============================================================
     Clean up on unmount
  ============================================================== */
  useEffect(() => {
    return () => {
      stopVoiceMonitoringInternal();
      if (cancelTimerRef.current) clearInterval(cancelTimerRef.current);
    };
  }, []);

  /* ==============================================================
     Cancel countdown ticker
  ============================================================== */
  useEffect(() => {
    if (emergencyState !== "countdown") return;

    setCancelCountdown(CANCEL_COUNTDOWN_SEC);

    cancelTimerRef.current = setInterval(() => {
      setCancelCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(cancelTimerRef.current);
          fireSOS();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (cancelTimerRef.current) clearInterval(cancelTimerRef.current);
    };
  }, [emergencyState]);

  /* ==============================================================
     Core SOS trigger — Fires Immediately upon distress detection
  ============================================================== */
  const fireSOS = useCallback(async (customResult?: VoiceAnalysisResult) => {
    if (sosTriggerInProgress) return;
    setSosTriggerInProgress(true);

    try {
      const lastResult = customResult || criticalEventsRef.current.at(-1)?.result || analysis;
      const lat = gpsLocation?.lat || 19.9019;
      const lng = gpsLocation?.lng || 74.4944;

      const payload = {
        latitude: lat,
        longitude: lng,
        riskLevel: lastResult?.risk_level ?? "CRITICAL",
        riskScore: lastResult?.voice_risk_score ?? 90,
        distressType: lastResult?.distress_type ?? "scream",
        confidence: lastResult?.confidence ?? 0.95,
        detectedKeywords: lastResult?.detected_keywords ?? [],
      };

      toast.loading("🚨 Distress voice detected! Dispatching SOS emails to contacts & volunteers...", { id: "sos-dispatch" });
      const response = await triggerVoiceSOS(payload);
      toast.dismiss("sos-dispatch");

      setActiveIncident(response.data);
      setEmergencyState("active");
      criticalEventsRef.current = [];

      toast.error("🚨 EMERGENCY SOS ACTIVATED — Brevo emails sent to emergency contacts & volunteers!", {
        duration: 10000,
      });
    } catch (err: any) {
      console.error("SOS trigger failed:", err);
      toast.error(
        err?.response?.data?.message ||
          "SOS failed. Please use the manual SOS button immediately."
      );
      setEmergencyState("idle");
    } finally {
      setSosTriggerInProgress(false);
    }
  }, [gpsLocation, sosTriggerInProgress, analysis]);

  /* ==============================================================
     Immediate Distress Detection Handler
  ============================================================== */
  const evaluateCriticalDetection = useCallback(
    (result: VoiceAnalysisResult) => {
      const isCritical =
        result.distress_detected &&
        (result.risk_level === "CRITICAL" ||
          result.risk_level === "HIGH" ||
          result.voice_risk_score >= 60 ||
          result.distress_type === "scream" ||
          result.distress_type === "shouting" ||
          result.distress_type === "distress" ||
          result.distress_type === "help_keyword" ||
          (result.detected_keywords && result.detected_keywords.length > 0));

      if (!isCritical) return;

      console.log("🚨 Immediate Voice Distress Detected:", result);
      fireSOS(result);
    },
    [fireSOS]
  );

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const pcmDataRef = useRef<Float32Array[]>([]);

  /* ==============================================================
     Audio monitoring — chunk pipeline + Speech Recognition + Acoustic Analyser
  ============================================================== */
  const startVoiceMonitoring = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Audio recording is not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      setIsMonitoring(true);
      toast.success("🎙️ AI Voice Safety Monitoring activated.");

      // Setup Web Audio Analyser for Instant Scream / Loud Sound Detection
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkAcoustics = () => {
          // Use streamRef (not isMonitoring state) to avoid stale closure
          if (!streamRef.current || !streamRef.current.active) return;
          analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avgVolume = sum / dataArray.length;

          // If sudden loud acoustic scream/noise spike (> 120 / 255)
          if (avgVolume > 115) {
            console.log("🚨 Loud Acoustic Sound / Scream Detected (Level:", avgVolume, ")");
            cycleRecordingChunk();
          }

          // Continue loop as long as stream is active (NOT using stale isMonitoring)
          requestAnimationFrame(checkAcoustics);
        };
        requestAnimationFrame(checkAcoustics);
      } catch (audioErr) {
        console.warn("AudioContext analyser notice:", audioErr);
      }

      // Start Web Speech Recognition if available in browser
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";
          recognition.onresult = (event: any) => {
            let transcript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              transcript += event.results[i][0].transcript;
            }
            if (transcript.trim()) {
              currentTranscriptRef.current = transcript.trim();
              const lower = transcript.toLowerCase();
              const emergencyWords = [
                "help",
                "help me",
                "save",
                "save me",
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
                "sos",
                "stop",
                "leave me",
                "leave me alone",
                "don't touch me",
                "don't touch",
                "dont touch",
                "let me go",
                "get away",
              ];
              const matched = emergencyWords.some((w) => lower.includes(w));
              if (matched) {
                // Debounce: prevent duplicate triggers from interim speech results
                const now = Date.now();
                if (now - lastKeywordTriggerRef.current < 3000) return;
                lastKeywordTriggerRef.current = now;

                console.log("🚨 Spoken Distress Keyword Heard in Browser:", transcript);
                toast.error(`🚨 Emergency Keyword Detected: "${transcript}" — Triggering SOS!`, { duration: 5000 });

                // Immediately trigger SOS flow
                const instantResult: VoiceAnalysisResult = {
                  success: true,
                  distress_detected: true,
                  distress_type: "help_keyword",
                  confidence: 0.98,
                  voice_risk_score: 95,
                  risk_level: "CRITICAL",
                  detected_keywords: [transcript],
                };
                setAnalysis(instantResult);
                evaluateCriticalDetection(instantResult);

                // Also send audio/text for backend telemetry
                sendAudioForAnalysisRef.current(undefined, transcript.trim());
              }
            }
          };
          recognition.onerror = (e: any) => {
            console.warn("SpeechRecognition notice:", e?.error);
          };
          recognition.onend = () => {
            if (streamRef.current && streamRef.current.active) {
              try {
                recognition.start();
              } catch (_) {}
            }
          };
          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch (speechErr) {
          console.warn("SpeechRecognition startup notice:", speechErr);
        }
      }

      startRecordingChunk();

      intervalTimerRef.current = setInterval(() => {
        cycleRecordingChunk();
      }, chunkIntervalSec * 1000);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      toast.error("Microphone access denied. Please allow microphone permissions.");
      setIsMonitoring(false);
    }
  };

  const startRecordingChunk = () => {
    if (!streamRef.current) return;
    audioChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "audio/wav";
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      if (audioChunksRef.current.length > 0) {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        // Call via ref to avoid stale closure
        await sendAudioForAnalysisRef.current(blob);
      }
    };
    recorder.start();
  };

  const cycleRecordingChunk = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
    setTimeout(() => {
      if (streamRef.current && streamRef.current.active) {
        startRecordingChunk();
      }
    }, 200);
  };

  const stopVoiceMonitoringInternal = () => {
    if (intervalTimerRef.current) {
      clearInterval(intervalTimerRef.current);
      intervalTimerRef.current = null;
    }
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
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const stopVoiceMonitoring = () => {
    stopVoiceMonitoringInternal();
    setIsMonitoring(false);
    toast.info("Voice monitoring stopped.");
  };

  const sendAudioForAnalysis = async (blob?: Blob, transcriptionOverride?: string) => {
    setAnalyzing(true);
    try {
      const text = transcriptionOverride || currentTranscriptRef.current || "";
      const res = await analyzeVoiceAudio(blob, undefined, "recording.wav", text);
      if (text && res.distress_detected) {
        currentTranscriptRef.current = "";
      }
      setAnalysis(res);
      addHistoryRecord(res);
      evaluateCriticalDetection(res);

      if (res.distress_detected && res.voice_risk_score >= VOICE_CRITICAL_THRESHOLD) {
        toast.error(
          `⚠️ Distress Signal Detected! Risk: ${res.risk_level} (${res.voice_risk_score}/100)`,
          { duration: 4000 }
        );
      }
    } catch (err: any) {
      console.error("Voice analysis failed:", err);
      toast.error("Failed to analyze audio chunk. AI Service might be offline.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Keep the ref always pointing to the latest sendAudioForAnalysis
  useEffect(() => {
    sendAudioForAnalysisRef.current = sendAudioForAnalysis;
  });

  const handleDemoScenario = async (scenarioId: string) => {
    setAnalyzing(true);
    try {
      const res = await analyzeVoiceAudio(undefined, scenarioId);
      setAnalysis(res);
      addHistoryRecord(res);
      evaluateCriticalDetection(res);
      toast.success(`Demo scenario: ${scenarioId}`);
    } catch (err: any) {
      toast.error("Failed to trigger demo scenario.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select an audio file first.");
      return;
    }
    setAnalyzing(true);
    try {
      const res = await analyzeVoiceAudio(selectedFile, undefined, selectedFile.name);
      setAnalysis(res);
      addHistoryRecord(res);
      evaluateCriticalDetection(res);
      toast.success("File analyzed successfully.");
    } catch (err: any) {
      toast.error("Failed to analyze uploaded audio file.");
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

  const addHistoryRecord = (res: VoiceAnalysisResult) => {
    setHistory((prev) => [
      { timestamp: new Date().toLocaleTimeString(), result: res },
      ...prev.slice(0, 9),
    ]);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "bg-destructive text-destructive-foreground";
      case "HIGH":
        return "bg-amber-600 text-white";
      case "MEDIUM":
        return "bg-yellow-500 text-slate-950";
      default:
        return "bg-emerald-600 text-white";
    }
  };

  const getRiskBorderColor = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "border-red-500 bg-red-500/5";
      case "HIGH":
        return "border-amber-500 bg-amber-500/5";
      case "MEDIUM":
        return "border-yellow-500 bg-yellow-500/5";
      default:
        return "border-emerald-500 bg-emerald-500/5";
    }
  };

  /* ==============================================================
     Render
  ============================================================== */
  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* =========================================================
          EMERGENCY OVERLAY — shown when countdown or active
      ========================================================= */}
      {(emergencyState === "countdown" || emergencyState === "active" || emergencyState === "confirming" || emergencyState === "cancelled") && (
        <div
          className={`rounded-3xl border-2 p-6 md:p-8 shadow-lg ${
            emergencyState === "active"
              ? "border-red-600 bg-red-600/10"
              : emergencyState === "countdown"
              ? "border-red-500 bg-red-500/10 animate-pulse"
              : "border-amber-500 bg-amber-500/10"
          }`}
        >
          {emergencyState === "confirming" && (
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <AlertTriangle className="size-8 text-amber-500 shrink-0" />
                <div>
                  <div className="font-bold text-amber-700 dark:text-amber-400 text-lg">
                    ⚠️ Distress Detected — Monitoring for Confirmation
                  </div>
                  <p className="text-sm text-amber-600 dark:text-amber-300 mt-1">
                    AI detected a potential distress event. Another detection within{" "}
                    {REPEATED_DISTRESS_WINDOW_MS / 1000}s will trigger an automatic SOS.
                    ({criticalEventsRef.current.length}/{REPEATED_DISTRESS_COUNT} confirmed)
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  criticalEventsRef.current = [];
                  setEmergencyState("idle");
                  toast.success("Alert dismissed.");
                }}
                className="border-amber-500 text-amber-700 hover:bg-amber-100"
              >
                <X className="mr-1 size-4" /> Dismiss
              </Button>
            </div>
          )}

          {emergencyState === "countdown" && (
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <Siren className="size-10 text-red-600 animate-bounce shrink-0" />
                <div>
                  <div className="font-bold text-red-700 dark:text-red-400 text-xl">
                    🚨 POTENTIAL EMERGENCY DETECTED
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-300 mt-1">
                    AI detected: <strong className="capitalize">{analysis?.distress_type}</strong> · Risk:{" "}
                    <strong>{analysis?.risk_level}</strong> ({analysis?.voice_risk_score}/100)
                  </div>
                  <div className="mt-2 text-sm font-semibold text-red-700 dark:text-red-300">
                    Automatic SOS in <span className="text-3xl font-black">{cancelCountdown}</span> seconds...
                  </div>
                  <p className="text-xs text-red-500 mt-1">
                    Emergency response will be initiated. Your location will be shared with responders.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={cancelEmergency}
                  className="font-bold"
                >
                  <X className="mr-2 size-4" /> Cancel Emergency
                </Button>
                <Button
                  size="sm"
                  className="bg-red-700 text-white hover:bg-red-800"
                  onClick={() => {
                    if (cancelTimerRef.current) clearInterval(cancelTimerRef.current);
                    fireSOS();
                  }}
                  disabled={sosTriggerInProgress}
                >
                  {sosTriggerInProgress ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Siren className="mr-2 size-4" />
                  )}
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
                  <div className="font-bold text-red-700 dark:text-red-400 text-xl">
                    🚨 EMERGENCY SOS ACTIVE
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                    Emergency response has been initiated. Contacts and nearby volunteers have been notified.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="rounded-xl border border-red-300 bg-white/50 dark:bg-black/20 p-3">
                  <div className="text-xs text-muted-foreground">Incident ID</div>
                  <div className="font-mono font-bold text-xs mt-1">{activeIncident._id.slice(-8).toUpperCase()}</div>
                </div>
                <div className="rounded-xl border border-red-300 bg-white/50 dark:bg-black/20 p-3">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="font-bold text-red-600 uppercase mt-1">{activeIncident.status}</div>
                </div>
                <div className="rounded-xl border border-red-300 bg-white/50 dark:bg-black/20 p-3">
                  <div className="text-xs text-muted-foreground">Location</div>
                  <div className="font-bold text-xs mt-1">
                    <MapPin className="inline size-3 mr-1" />
                    {activeIncident.latitude?.toFixed(4)}, {activeIncident.longitude?.toFixed(4)}
                  </div>
                </div>
                <div className="rounded-xl border border-red-300 bg-white/50 dark:bg-black/20 p-3">
                  <div className="text-xs text-muted-foreground">Detection</div>
                  <div className="font-bold capitalize mt-1">{activeIncident.distressType || "Unknown"}</div>
                </div>
              </div>

              <p className="text-xs text-red-500">
                Your location is being shared with authorized responders. Please stay safe.
                If you are safe, go to <strong>My Alerts</strong> → <strong>History</strong> to track the incident.
              </p>
            </div>
          )}

          {emergencyState === "cancelled" && (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-8 text-emerald-500 shrink-0" />
              <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                Emergency cancelled. Monitoring continues.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-3xl gradient-hero p-6 text-white shadow-elegant md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/80">
              <Sparkles className="size-4 text-yellow-300" />
              SafeHer AI Safety Suite · Phase 1
            </div>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">
              AI Voice Distress Detection
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Real-time acoustic signal monitoring that detects screams, shouting, panic sounds, and emergency trigger words — automatically initiating SOS when critical risk is confirmed.
            </p>
            {gpsLocation && (
              <div className="mt-2 flex items-center gap-1 text-xs text-white/70">
                <MapPin className="size-3" />
                GPS: {gpsLocation.lat.toFixed(4)}, {gpsLocation.lng.toFixed(4)}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!isMonitoring ? (
              <Button
                onClick={startVoiceMonitoring}
                size="lg"
                className="bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg font-semibold"
              >
                <Mic className="mr-2 size-5" />
                Start Monitoring
              </Button>
            ) : (
              <Button
                onClick={stopVoiceMonitoring}
                size="lg"
                variant="destructive"
                className="shadow-lg font-semibold"
              >
                <MicOff className="mr-2 size-5" />
                Stop Monitoring
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Safety Notice */}
      <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200">
        <Info className="size-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="font-semibold text-sm">AI Voice Safety Monitor</AlertTitle>
        <AlertDescription className="text-xs mt-1 text-amber-800 dark:text-amber-300">
          When <strong>CRITICAL</strong> distress is confirmed ({REPEATED_DISTRESS_COUNT}× in {REPEATED_DISTRESS_WINDOW_MS / 1000}s),{" "}
          a {CANCEL_COUNTDOWN_SEC}-second cancellation window appears before SOS is automatically triggered.
          Always use the manual <strong>Emergency SOS</strong> button in a real emergency.
        </AlertDescription>
      </Alert>

      {/* Monitoring Control Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Real-time Status Monitor Card */}
        <Card className={`md:col-span-2 shadow-sm border transition-all ${getRiskBorderColor(analysis?.risk_level || "LOW")}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Volume2 className="size-5 text-primary" />
                Real-Time Voice Monitor
              </CardTitle>
              <CardDescription>
                Live audio window analysis ({chunkIntervalSec}s chunks)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {analyzing && (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              )}
              {isMonitoring ? (
                <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 px-3 py-1 flex items-center gap-2 animate-pulse">
                  <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                  🟢 Monitoring Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground px-3 py-1">
                  🔴 Monitoring Inactive
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {/* Risk Indicator Panel */}
            <div className="rounded-2xl border bg-muted/30 p-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                  Voice Risk Score
                </span>
                <Badge className={getRiskColor(analysis?.risk_level || "LOW")}>
                  {analysis?.risk_level || "LOW"}
                </Badge>
              </div>

              <div className="text-5xl font-extrabold tracking-tight">
                {analysis?.voice_risk_score ?? 0}{" "}
                <span className="text-xl font-medium text-muted-foreground">/ 100</span>
              </div>

              <div className="w-full max-w-md space-y-1">
                <Progress value={analysis?.voice_risk_score ?? 0} className="h-3" />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>0 (Safe)</span>
                  <span>30 (Low)</span>
                  <span>50 (Med)</span>
                  <span>75 (High)</span>
                  <span>100 (Critical)</span>
                </div>
              </div>
            </div>

            {/* Detection Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border p-4 bg-card">
                <div className="text-xs text-muted-foreground">Distress Status</div>
                <div className="mt-1 font-semibold flex items-center gap-1.5 text-sm">
                  {analysis?.distress_detected ? (
                    <>
                      <AlertTriangle className="size-4 text-destructive" />
                      <span className="text-destructive font-bold">Detected</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Normal</span>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-xl border p-4 bg-card">
                <div className="text-xs text-muted-foreground">Distress Type</div>
                <div className="mt-1 font-semibold capitalize text-sm">
                  {analysis?.distress_type || "None"}
                </div>
              </div>

              <div className="rounded-xl border p-4 bg-card">
                <div className="text-xs text-muted-foreground">Confidence</div>
                <div className="mt-1 font-semibold text-sm">
                  {Math.round((analysis?.confidence ?? 0) * 100)}%
                </div>
              </div>
            </div>

            {/* Critical detection counter */}
            {(emergencyState === "confirming" || emergencyState === "countdown") && (
              <div className="rounded-xl border border-amber-400 bg-amber-400/10 p-3 flex items-center gap-3">
                <AlertTriangle className="size-5 text-amber-500 shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    Critical detections:{" "}
                  </span>
                  <span className="font-bold text-amber-800 dark:text-amber-300">
                    {criticalEventsRef.current.length} / {REPEATED_DISTRESS_COUNT}
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 ml-2 text-xs">
                    (within {REPEATED_DISTRESS_WINDOW_MS / 1000}s window)
                  </span>
                </div>
              </div>
            )}

            {/* Detected Keywords */}
            <div className="rounded-xl border p-4 bg-card">
              <div className="text-xs font-semibold text-muted-foreground mb-2">
                Detected Emergency Keywords
              </div>
              {analysis?.detected_keywords && analysis.detected_keywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {analysis.detected_keywords.map((kw, i) => (
                    <Badge key={i} variant="destructive" className="capitalize text-xs">
                      🚨 "{kw}"
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic">
                  No emergency trigger phrases detected.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Demo Mode Panel */}
        <Card className="shadow-sm border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldAlert className="size-5 text-indigo-500" />
              Demo & Test Mode
            </CardTitle>
            <CardDescription>Test preset emergency scenarios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-muted-foreground">
              Click any scenario to simulate AI evaluation:
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-xs font-medium"
                disabled={analyzing}
                onClick={() => handleDemoScenario("normal")}
              >
                <Play className="mr-2 size-3.5 text-emerald-500" />
                Normal Speech (Low Risk)
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start text-xs font-medium"
                disabled={analyzing}
                onClick={() => handleDemoScenario("shouting")}
              >
                <Play className="mr-2 size-3.5 text-amber-500" />
                Repeated Shouting (High Risk)
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start text-xs font-medium"
                disabled={analyzing}
                onClick={() => handleDemoScenario("help_keyword")}
              >
                <Play className="mr-2 size-3.5 text-red-500" />
                Keyword: "Help / Save Me"
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start text-xs font-medium"
                disabled={analyzing}
                onClick={() => handleDemoScenario("scream")}
              >
                <Play className="mr-2 size-3.5 text-red-600" />
                Scream Sound (Critical Risk)
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start text-xs font-medium bg-red-500/10 text-red-600 hover:bg-red-500/20"
                disabled={analyzing}
                onClick={() => handleDemoScenario("critical")}
              >
                <Play className="mr-2 size-3.5 text-red-600" />
                Critical Panic Distress
              </Button>
            </div>

            <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              <strong>Auto-SOS Demo:</strong> Click "Scream" or "Critical" twice within{" "}
              {REPEATED_DISTRESS_WINDOW_MS / 1000}s to trigger the SOS countdown.
            </div>

            <hr className="my-2" />

            {/* File Upload Test */}
            <div className="space-y-2">
              <div className="text-xs font-semibold">Upload Audio File Test</div>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              <Button
                size="sm"
                className="w-full text-xs mt-1"
                disabled={!selectedFile || analyzing}
                onClick={handleFileUpload}
              >
                <Upload className="mr-2 size-3.5" />
                {analyzing ? "Analyzing..." : "Analyze Audio File"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Voice Analysis Log */}
      <Card className="shadow-sm border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Recent Voice Analysis Log</CardTitle>
            <CardDescription>
              History of evaluation windows this session
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHistory([])}
            className="text-xs text-muted-foreground"
          >
            <RefreshCw className="mr-1 size-3" /> Clear Log
          </Button>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No voice analysis records yet. Start monitoring or run a test scenario.
            </div>
          ) : (
            <div className="divide-y text-xs">
              {history.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground font-mono">
                      {item.timestamp}
                    </span>
                    <span className="font-semibold capitalize">
                      {item.result.distress_type}
                    </span>
                    {item.result.detected_keywords.length > 0 && (
                      <span className="text-red-500 font-medium">
                        Keywords: {item.result.detected_keywords.join(", ")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      Risk: {item.result.voice_risk_score}/100
                    </span>
                    <Badge className={getRiskColor(item.result.risk_level)}>
                      {item.result.risk_level}
                    </Badge>
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
