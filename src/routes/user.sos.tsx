import { createFileRoute } from "@tanstack/react-router";
import {
  Siren,
  MapPin,
  CheckCircle2,
  X,
  Clock,
  User as UserIcon,
  Phone,
  Video as VideoIcon,
  Volume2,
  Camera,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Radio,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sendSOS } from "@/services/sosService";
import { getAlertHistory } from "@/services/userService";
import { uploadIncidentEvidence } from "@/services/adminService";

export const Route = createFileRoute("/user/sos")({ component: SOSPage });

type PageState = "idle" | "counting" | "active" | "resolved";
export type AlertStatus = "active" | "accepted" | "resolved";

export interface Alert {
  _id: string;
  latitude: number;
  longitude: number;
  status: AlertStatus;
  priority?: "P1" | "P2" | "P3" | "P4";
  priorityScore?: number;
  priorityReasons?: string[];
  responseStatus?: string;
  assignedVolunteerId?: any;
  assignedVolunteerName?: string;
  assignedVolunteerPhone?: string;
  estimatedEtaMinutes?: number;
  responderLiveLocation?: {
    latitude: number;
    longitude: number;
    updatedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Coordinates {
  latitude: string;
  longitude: string;
}

const POLL_INTERVAL_MS = 2000;
const COUNTDOWN_SECONDS = 5;

function SOSPage() {
  const [state, setState] = useState<PageState>("idle");
  const [count, setCount] = useState(COUNTDOWN_SECONDS);
  const [isSending, setIsSending] = useState(false);

  const [location, setLocation] = useState<Coordinates>({ latitude: "", longitude: "" });
  const locationErrorShownRef = useRef(false);

  const [alertId, setAlertId] = useState<string | null>(null);
  const [currentAlert, setCurrentAlert] = useState<Alert | null>(null);

  // Emergency evidence recording states
  const [emergencyRecordingEnabled, setEmergencyRecordingEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<"audio_video" | "audio_only" | "none">("none");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const autoUploadIntervalRef = useRef<any>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

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
          toast.error("Please enable GPS Location so responders can find you.");
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

  // ---- Emergency Evidence Recorder Lifecycle ----
  function getSupportedMimeType(preferred: string[]) {
    for (const mt of preferred) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mt)) return mt;
    }
    return undefined;
  }

  // Synchronously kill all active camera/mic tracks to immediately turn off camera hardware
  const releaseMediaHardware = () => {
    if (autoUploadIntervalRef.current) {
      clearInterval(autoUploadIntervalRef.current);
      autoUploadIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      mediaStreamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    setIsRecording(false);
    setRecordingType("none");
  };

  const startEmergencyRecording = async (targetAlertId: string) => {
    if (!emergencyRecordingEnabled) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      console.warn("MediaDevices API not available for evidence capture.");
      return;
    }

    try {
      let videoStream: MediaStream | null = null;
      let audioStream: MediaStream | null = null;
      let type: "audio_video" | "audio_only" = "audio_video";

      // Try to acquire camera + mic
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        });
      } catch {
        // Fallback to audio only
        try {
          audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          type = "audio_only";
        } catch {
          console.warn("Emergency media access not granted.");
          return;
        }
      }

      const combinedStream = videoStream || audioStream;
      if (!combinedStream) return;

      mediaStreamRef.current = combinedStream;
      recordedChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      // Live camera preview
      if (type === "audio_video" && videoPreviewRef.current && combinedStream) {
        videoPreviewRef.current.srcObject = combinedStream;
        videoPreviewRef.current.muted = true;
        videoPreviewRef.current.play().catch(() => {});
      }

      const videoMimes = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
      const audioMimes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"];
      const mimeType = type === "audio_video"
        ? getSupportedMimeType(videoMimes)
        : getSupportedMimeType(audioMimes);

      const recorderOptions: MediaRecorderOptions = {};
      if (mimeType) recorderOptions.mimeType = mimeType;

      const recorder = new MediaRecorder(combinedStream, recorderOptions);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      const uploadCurrentSnapshot = async () => {
        if (!recorder || recorder.state === "inactive" || !targetAlertId) return;
        try {
          recorder.requestData();
          await new Promise((r) => setTimeout(r, 100));
          if (recordedChunksRef.current.length === 0) return;

          const durationSec = Math.round((Date.now() - recordingStartTimeRef.current) / 1000);
          const actualMime = recorder.mimeType || (type === "audio_video" ? "video/webm" : "audio/webm");
          const ext = actualMime.includes("mp4") ? "mp4" : "webm";
          const blob = new Blob(recordedChunksRef.current, { type: actualMime });

          if (blob.size > 0) {
            const formData = new FormData();
            formData.append("media", blob, `evidence_${targetAlertId}.${ext}`);
            formData.append("mediaType", type === "audio_video" ? "VIDEO" : "AUDIO");
            formData.append("durationSec", durationSec.toString());
            await uploadIncidentEvidence(targetAlertId, formData);
          }
        } catch (snapErr) {
          console.warn("Snapshot upload warning:", snapErr);
        }
      };

      recorder.onstop = async () => {
        const durationSec = Math.round((Date.now() - recordingStartTimeRef.current) / 1000);
        const actualMime = recorder.mimeType || (type === "audio_video" ? "video/webm" : "audio/webm");
        const ext = actualMime.includes("mp4") ? "mp4" : "webm";
        const blob = new Blob(recordedChunksRef.current, { type: actualMime });

        releaseMediaHardware();

        if (blob.size > 0 && targetAlertId) {
          const formData = new FormData();
          formData.append("media", blob, `evidence_${targetAlertId}.${ext}`);
          formData.append("mediaType", type === "audio_video" ? "VIDEO" : "AUDIO");
          formData.append("durationSec", durationSec.toString());

          try {
            await uploadIncidentEvidence(targetAlertId, formData);
            toast.success("Emergency evidence saved securely in official report.");
          } catch (uploadErr: any) {
            console.warn("Evidence final upload:", uploadErr);
          }
        }
      };

      recorder.onerror = () => {
        releaseMediaHardware();
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingType(type);

      // Auto-upload snapshot at 4 seconds so admin sees video live
      setTimeout(() => {
        uploadCurrentSnapshot();
      }, 4000);

      // Continuous snapshot every 12 seconds
      autoUploadIntervalRef.current = setInterval(() => {
        uploadCurrentSnapshot();
      }, 12000);
    } catch (e) {
      console.warn("Recorder error:", e);
    }
  };

  const stopEmergencyRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
    releaseMediaHardware();
  };

  const handleSend = useCallback(async () => {
    if (isSending) return;

    if (!location.latitude || !location.longitude) {
      toast.error("Waiting for GPS Location. Please keep location enabled.");
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
        throw new Error("Invalid SOS response from server");
      }

      setAlertId(created._id);
      setCurrentAlert(created);
      setState("active");
      toast.success("🚨 EMERGENCY ALERT SENT! Responders are being notified.");

      // Start emergency audio/video recording
      startEmergencyRecording(created._id);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to send SOS");
      setState("idle");
      setCount(COUNTDOWN_SECONDS);
    } finally {
      setIsSending(false);
    }
  }, [isSending, location, emergencyRecordingEnabled]);

  useEffect(() => {
    if (state === "counting" && count === 0) {
      handleSend();
    }
  }, [state, count, handleSend]);

  // ---- Real-time Polling for Status Resolution ----
  const pollAlertStatus = useCallback(async () => {
    if (!alertId) return;

    try {
      const res = await getAlertHistory();
      const alerts: Alert[] = res.data.data;
      const current = alerts.find((a) => a._id === alertId);

      if (current) {
        setCurrentAlert(current);

        // When incident is resolved in real time by admin or volunteer
        if (current.status === "resolved") {
          setState("resolved");
          stopEmergencyRecording(); // Immediately turn off camera and save recording
          try {
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          } catch {}
        }
      }
    } catch (error) {
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

    pollAlertStatus();
    pollRef.current = window.setInterval(pollAlertStatus, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [state, alertId, pollAlertStatus]);

  function trigger() {
    if (!location.latitude || !location.longitude) {
      toast.error("Acquiring GPS location. Please wait a second...");
      return;
    }

    setCount(COUNTDOWN_SECONDS);
    setState("counting");
  }

  function cancel() {
    stopEmergencyRecording();
    setState("idle");
    setCount(COUNTDOWN_SECONDS);
    toast.success("Emergency cancelled");
  }

  return (
    <div className="max-w-md mx-auto space-y-4 pb-8">
      {/* Top Simple Header */}
      <div className="flex items-center justify-between bg-card border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className={`size-3 rounded-full ${location.latitude ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
          <div>
            <h1 className="font-extrabold text-sm text-foreground tracking-tight">SafeHer Emergency</h1>
            <p className="text-[11px] text-muted-foreground">
              {location.latitude ? "GPS Protected & Connected" : "Locating your position..."}
            </p>
          </div>
        </div>

        {/* Camera Toggle Button */}
        <button
          type="button"
          onClick={() => setEmergencyRecordingEnabled(!emergencyRecordingEnabled)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
            emergencyRecordingEnabled
              ? "bg-primary/10 border-primary/40 text-primary"
              : "bg-muted border-border text-muted-foreground"
          }`}
        >
          <Camera className="size-3.5" />
          <span>Camera: {emergencyRecordingEnabled ? "ON" : "OFF"}</span>
        </button>
      </div>

      {/* =========================================================================
          STATE 1: IDLE / READY TO PRESS SOS
         ========================================================================= */}
      {state === "idle" && (
        <div className="space-y-4">
          <div className="rounded-3xl border bg-card p-6 text-center shadow-lg relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent pointer-events-none" />

            <div className="space-y-6 relative z-10 py-4">
              {/* Massive SOS Button */}
              <button
                type="button"
                onClick={trigger}
                aria-label="Press for Immediate Emergency Help"
                className="mx-auto grid size-56 place-items-center rounded-full bg-gradient-to-br from-red-500 via-red-600 to-rose-700 text-white shadow-2xl transition-transform active:scale-90 hover:scale-105 ring-8 ring-red-500/20 animate-pulse cursor-pointer"
              >
                <div className="space-y-2 text-center">
                  <Siren className="mx-auto size-20 drop-shadow-md" />
                  <span className="block font-black text-3xl tracking-wider">TAP SOS</span>
                  <span className="block text-xs font-semibold text-red-100 uppercase tracking-widest">
                    मदद / HELP
                  </span>
                </div>
              </button>

              <div className="space-y-1">
                <h2 className="font-extrabold text-base text-foreground">Tap Red Button For Help</h2>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Alerts nearby verified volunteers, police helpline & starts evidence recording.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Direct Helplines (Big Accessible Buttons) */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href="tel:112"
              className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow transition-transform active:scale-95"
            >
              <Phone className="size-4" />
              <span>Police 112</span>
            </a>
            <a
              href="tel:1091"
              className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow transition-transform active:scale-95"
            >
              <ShieldAlert className="size-4" />
              <span>Women 1091</span>
            </a>
          </div>
        </div>
      )}

      {/* =========================================================================
          STATE 2: COUNTDOWN TIMER (Cancel if mistake)
         ========================================================================= */}
      {state === "counting" && (
        <div className="rounded-3xl border bg-card p-6 text-center shadow-xl space-y-6 py-8">
          <div className="space-y-1">
            <h2 className="font-black text-xl text-red-600">Sending Emergency Alert</h2>
            <p className="text-xs text-muted-foreground">Tap CANCEL below if pressed by mistake</p>
          </div>

          {/* Countdown Circle */}
          <div className="mx-auto grid size-48 place-items-center rounded-full bg-red-600 text-white shadow-2xl ring-8 ring-red-300 dark:ring-red-950 animate-bounce">
            <span className="font-black text-8xl leading-none">{count}</span>
          </div>

          {/* Big Cancel Button */}
          <Button
            type="button"
            variant="outline"
            onClick={cancel}
            className="w-full h-14 rounded-2xl text-base font-extrabold border-2 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <X className="mr-2 size-5" /> CANCEL (Galti Se Daba / Mistake)
          </Button>
        </div>
      )}

      {/* =========================================================================
          STATE 3: ACTIVE EMERGENCY (Help Dispatched)
         ========================================================================= */}
      {state === "active" && (
        <div className="space-y-4">
          {/* Top Urgent Status Banner */}
          <div className="rounded-2xl bg-red-600 text-white p-4 text-center shadow-lg space-y-1">
            <div className="flex items-center justify-center gap-2 font-black text-base tracking-wide">
              <span className="size-3 rounded-full bg-white animate-ping" />
              🚨 HELP IS ON THE WAY
            </div>
            <p className="text-xs text-red-100 font-medium">
              Stay calm. Your live GPS coordinates are being shared with responders.
            </p>
          </div>

          {/* Live Camera Preview (If Recording) */}
          {isRecording && recordingType === "audio_video" && (
            <div className="relative rounded-2xl overflow-hidden border-2 border-red-500 bg-black aspect-video max-h-48 mx-auto shadow-md">
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-600 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow">
                <span className="size-2 rounded-full bg-white animate-ping" />
                <span>REC · CAMERA ON</span>
              </div>
              <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur text-white text-[10px] px-2 py-0.5 rounded font-mono">
                Auto-Transmitting Evidence
              </div>
            </div>
          )}

          {/* Assigned Volunteer / Responder Card */}
          <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-bold text-foreground">Assigned Helper / Volunteer</span>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {currentAlert?.responseStatus || "RESPONDING"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="size-12 rounded-full bg-primary/10 grid place-items-center text-primary font-black text-base shrink-0">
                <UserIcon className="size-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-sm text-foreground truncate">
                  {currentAlert?.assignedVolunteerName || "Searching nearest helper..."}
                </div>
                {currentAlert?.estimatedEtaMinutes != null && (
                  <div className="text-xs text-emerald-600 font-bold flex items-center gap-1 pt-0.5">
                    <Clock className="size-3.5" />
                    Arrival Time: ~{currentAlert.estimatedEtaMinutes} min
                  </div>
                )}
              </div>

              {/* One-Tap Call Responder */}
              {currentAlert?.assignedVolunteerPhone && (
                <a
                  href={`tel:${currentAlert.assignedVolunteerPhone}`}
                  className="size-12 rounded-2xl bg-emerald-600 text-white grid place-items-center shrink-0 hover:bg-emerald-700 shadow-md transition-transform active:scale-95"
                  aria-label="Call Responder"
                >
                  <Phone className="size-6" />
                </a>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <a
              href="tel:112"
              className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow transition-transform active:scale-95"
            >
              <Phone className="size-4" /> CALL POLICE (112)
            </a>

            <Button
              type="button"
              variant="outline"
              onClick={cancel}
              className="w-full h-12 rounded-2xl font-bold text-xs border-muted-foreground/30 text-muted-foreground hover:bg-muted"
            >
              <CheckCircle2 className="mr-1.5 size-4 text-emerald-600" /> I AM SAFE (Resolve Alert)
            </Button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STATE 4: INCIDENT RESOLVED & SAFE (Camera Automatically OFF)
         ========================================================================= */}
      {state === "resolved" && (
        <div className="rounded-3xl border bg-card p-6 text-center shadow-xl space-y-6 py-8">
          <div className="mx-auto grid size-28 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 ring-8 ring-emerald-100/50">
            <CheckCircle2 className="size-16" />
          </div>

          <div className="space-y-1.5">
            <h2 className="font-black text-2xl text-emerald-600">YOU ARE SAFE NOW!</h2>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              The emergency incident has been safely resolved. Camera and recording have stopped automatically.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => setState("idle")}
            className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base shadow-lg"
          >
            I'M OK · Back to Safe Screen
          </Button>
        </div>
      )}
    </div>
  );
}