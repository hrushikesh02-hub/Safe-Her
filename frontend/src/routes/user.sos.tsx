import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Siren,
  MapPin,
  CheckCircle2,
  X,
  Clock,
  User as UserIcon,
  Phone,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Radio,
  ArrowRight,
  Sparkles,
  Camera,
  Video as VideoIcon,
  Lock,
  Loader2,
  RefreshCw,
  PhoneCall,
  Navigation,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { sendSOS, resolveAlert } from "@/services/sosService";
import { getAlertHistory } from "@/services/userService";
import { uploadIncidentEvidence } from "@/services/adminService";
import { UserAvatar } from "@/components/ui/UserAvatar";

export const Route = createFileRoute("/user/sos")({ component: SOSPage });

type PageState = "idle" | "counting" | "active" | "resolved";

interface ActiveAlert {
  _id: string;
  latitude: number;
  longitude: number;
  status: "active" | "accepted" | "resolved";
  source?: string;
  priority?: "P1" | "P2" | "P3" | "P4";
  priorityScore?: number;
  responseStatus?: string;
  assignedVolunteerId?: {
    _id?: string;
    name?: string;
    phone?: string;
    email?: string;
    profileImage?: string;
  } | string;
  acceptedBy?: {
    _id?: string;
    name?: string;
    phone?: string;
    email?: string;
    profileImage?: string;
  } | string;
  assignedVolunteerName?: string;
  assignedVolunteerPhone?: string;
  estimatedEtaMinutes?: number;
  responderLiveLocation?: {
    latitude: number;
    longitude: number;
    updatedAt: string;
  };
  createdAt: string;
}

const COUNTDOWN_SECONDS = 3;

function SOSPage() {
  const navigate = useNavigate();

  const [state, setState] = useState<PageState>("idle");
  const [countdown, setCountdown] = useState<number>(COUNTDOWN_SECONDS);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isResolving, setIsResolving] = useState<boolean>(false);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [currentAlert, setCurrentAlert] = useState<ActiveAlert | null>(null);

  // Camera Evidence Recording States
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [evidenceUploaded, setEvidenceUploaded] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(false);

  const countdownTimerRef = useRef<any>(null);
  const pollTimerRef = useRef<any>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const liveSyncTimerRef = useRef<any>(null);
  const currentAlertIdRef = useRef<string | null>(null);
  const isResolvingRef = useRef<boolean>(false);
  const mimeTypeRef = useRef<string>("video/webm");

  // 1. Live GPS tracking
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        toast.error("Please enable GPS so responders can locate you.");
      },
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // 2. Poll active alerts to check if user already has an active emergency
  const checkActiveAlert = useCallback(async () => {
    // If currently resolving or already marked resolved, don't re-activate from stale poll
    if (isResolvingRef.current) return;

    try {
      const res = await getAlertHistory();
      const list: ActiveAlert[] = res.data?.data || [];
      const active = list.find((a) => a.status === "active" || a.status === "accepted");

      if (active) {
        currentAlertIdRef.current = active._id;
        setCurrentAlert(active);
        setState((prev) => (prev === "counting" ? prev : "active"));
      } else {
        // If there are no active/accepted alerts and we are in active state, transition to resolved
        setState((prev) => {
          if (prev === "active") {
            stopCamera();
            return "resolved";
          }
          return prev;
        });
      }
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    checkActiveAlert();
    pollTimerRef.current = setInterval(checkActiveAlert, 2500);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [checkActiveAlert]);

  // Keep alert ID ref updated
  useEffect(() => {
    if (currentAlert?._id) {
      currentAlertIdRef.current = currentAlert._id;
    }
  }, [currentAlert?._id]);

  // Function to upload recorded video chunk to backend
  const uploadCurrentEvidenceBlob = useCallback(async (isFinal = false) => {
    const alertId = currentAlertIdRef.current;
    if (!alertId || recordedChunksRef.current.length === 0) return;

    try {
      const mime = mimeTypeRef.current || "video/webm";
      const blob = new Blob(recordedChunksRef.current, { type: mime });
      if (blob.size < 100) return; // Skip empty buffers

      const formData = new FormData();
      formData.append("media", blob, `evidence_${alertId}_${Date.now()}.webm`);
      formData.append("mediaType", "VIDEO");
      formData.append("durationSec", String(recordingSeconds || (isFinal ? 10 : 5)));

      await uploadIncidentEvidence(alertId, formData);
      setEvidenceUploaded(true);
    } catch (uploadErr) {
      console.warn("Evidence upload notice:", uploadErr);
    }
  }, [recordingSeconds]);

  // 3. Complete and Leak-Proof Camera Cleanup
  const stopCamera = useCallback(async () => {
    // Stop timers
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (liveSyncTimerRef.current) {
      clearInterval(liveSyncTimerRef.current);
      liveSyncTimerRef.current = null;
    }

    // Flush and stop MediaRecorder
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {
        console.warn("MediaRecorder stop notice:", e);
      }
      mediaRecorderRef.current = null;
    }

    // Release all camera/microphone hardware tracks immediately
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (e) {
        console.warn("MediaStream track stop notice:", e);
      }
      mediaStreamRef.current = null;
    }

    // Detach stream from video element
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }

    setCameraActive(false);
    setRecordingSeconds(0);
  }, []);

  // 4. Robust Camera Acquisition & Continuous Live Evidence Sync
  const startCamera = async () => {
    if (mediaStreamRef.current && mediaStreamRef.current.active) {
      setCameraActive(true);
      return;
    }

    setIsStartingCamera(true);
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser");
      }

      let stream: MediaStream | null = null;

      // Try video first
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        });
      } catch (vidErr) {
        console.warn("Video with ideal constraints failed, trying default:", vidErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (!stream) throw new Error("Could not acquire camera stream");

      mediaStreamRef.current = stream;
      setCameraActive(true);

      // Attach to video DOM element immediately
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.muted = true;
        videoPreviewRef.current.play().catch((err) => console.log("Play notice:", err));
      }

      // Start MediaRecorder for evidence
      try {
        recordedChunksRef.current = [];
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
          ? "video/webm;codecs=vp8"
          : MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : "video/mp4";

        mimeTypeRef.current = mimeType || "video/webm";

        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = async () => {
          await uploadCurrentEvidenceBlob(true);
        };

        // Emit slice every 2 seconds for fresh buffer chunks
        recorder.start(2000);

        // Schedule periodic live evidence uploads so admin receives active live video
        if (liveSyncTimerRef.current) clearInterval(liveSyncTimerRef.current);
        liveSyncTimerRef.current = setInterval(() => {
          if (currentAlertIdRef.current && recordedChunksRef.current.length > 0) {
            uploadCurrentEvidenceBlob(false);
          }
        }, 4000);

        // Initial rapid snapshot upload after 3 seconds so admin dashboard immediately gets video
        setTimeout(() => {
          if (currentAlertIdRef.current && recordedChunksRef.current.length > 0) {
            uploadCurrentEvidenceBlob(false);
          }
        }, 3000);

      } catch (recErr) {
        console.warn("MediaRecorder setup warning:", recErr);
      }

      // Start recording seconds counter
      setRecordingSeconds(0);
      if (!recordingTimerRef.current) {
        recordingTimerRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
      }
    } catch (err: any) {
      console.error("Camera acquisition error:", err);
      setCameraError(err?.message || "Camera permission requested. Please allow camera access.");
      setCameraActive(false);
    } finally {
      setIsStartingCamera(false);
    }
  };

  // Auto-start camera when emergency becomes active, ensure stop otherwise
  useEffect(() => {
    if (state === "active") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [state, stopCamera]);

  // Callback ref to attach stream immediately upon DOM mount
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoPreviewRef.current = node;
    if (node && mediaStreamRef.current) {
      node.srcObject = mediaStreamRef.current;
      node.muted = true;
      node.play().catch(() => {});
    }
  }, []);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (liveSyncTimerRef.current) clearInterval(liveSyncTimerRef.current);
      stopCamera();
    };
  }, [stopCamera]);

  // Handle SOS button tap -> Starts short countdown to avoid accidental taps
  function handleSOSTap() {
    setState("counting");
    setCountdown(COUNTDOWN_SECONDS);

    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          dispatchSOS();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function cancelSOS() {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setState("idle");
    toast.info("SOS cancelled.");
  }

  async function dispatchSOS() {
    setIsSending(true);
    try {
      const lat = coords?.lat || 19.9019;
      const lng = coords?.lng || 74.4944;

      const res = await sendSOS({
        latitude: lat,
        longitude: lng,
        source: "MANUAL_SOS",
        priority: "P1",
        riskLevel: "CRITICAL",
        riskScore: 90,
      });

      if (res.data?.data) {
        currentAlertIdRef.current = res.data.data._id;
        setCurrentAlert(res.data.data);
      }
      setState("active");
      toast.success("🚨 Emergency Alert Dispatched to Responders!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to trigger SOS. Please call emergency services.");
      setState("idle");
    } finally {
      setIsSending(false);
    }
  }

  // Handle "I am Safe Now" resolution
  async function handleMarkSafe() {
    const alertId = currentAlertIdRef.current || currentAlert?._id;
    setIsResolving(true);
    isResolvingRef.current = true;

    // 1. Upload final captured evidence
    await uploadCurrentEvidenceBlob(true);

    // 2. Immediately terminate camera/audio capture and recording hardware
    stopCamera();

    try {
      if (alertId) {
        await resolveAlert(alertId, "User marked safe via SOS dismiss button");
      }
      toast.success("🛡️ Incident marked safe. Responders and contacts notified.");
    } catch (err: any) {
      console.warn("Resolve error:", err);
      toast.info("Incident ended.");
    } finally {
      setIsResolving(false);
      isResolvingRef.current = false;
      setCurrentAlert(null);
      currentAlertIdRef.current = null;
      setState("resolved");
    }
  }

  // Extract Assigned Responder Details
  const responderObj =
    typeof currentAlert?.acceptedBy === "object" && currentAlert.acceptedBy !== null
      ? currentAlert.acceptedBy
      : typeof currentAlert?.assignedVolunteerId === "object" && currentAlert.assignedVolunteerId !== null
      ? currentAlert.assignedVolunteerId
      : null;

  const volunteerName =
    responderObj?.name ||
    currentAlert?.assignedVolunteerName ||
    (currentAlert?.status === "accepted" ? "Assigned Volunteer" : null);

  const volunteerPhone =
    responderObj?.phone ||
    currentAlert?.assignedVolunteerPhone ||
    null;

  const volunteerPhoto = responderObj?.profileImage || null;

  const responseStatusBadge = (() => {
    const rs = currentAlert?.responseStatus;
    if (rs === "ARRIVED") return { text: "Arrived on Scene", color: "bg-emerald-600 text-white" };
    if (rs === "NEARBY") return { text: "Arriving Soon (< 500m)", color: "bg-blue-600 text-white" };
    if (rs === "RESPONDING") return { text: "En Route to You", color: "bg-indigo-600 text-white" };
    if (rs === "ASSIGNED" || currentAlert?.status === "accepted") return { text: "Volunteer Assigned", color: "bg-purple-600 text-white" };
    return { text: "Dispatching Volunteer...", color: "bg-amber-500 text-white" };
  })();

  return (
    <div className="w-full max-w-xl mx-auto px-3 sm:px-4 py-2 sm:py-6 space-y-4 sm:space-y-6 text-center">
      {/* ===================================================================
          STATE 1: IDLE (Standard Ready State)
      =================================================================== */}
      {state === "idle" && (
        <div className="space-y-4 sm:space-y-6">
          <div className="px-2">
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-foreground">
              Emergency SOS
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
              Tap the button below if you are in immediate danger or need rapid assistance.
            </p>
          </div>

          {/* Big Tactile SOS Button */}
          <div className="py-4 sm:py-8 flex justify-center items-center">
            <button
              onClick={handleSOSTap}
              disabled={isSending}
              className="size-36 sm:size-48 md:size-52 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white flex flex-col items-center justify-center shadow-xl shadow-red-500/30 transition-all duration-150 border-4 border-red-100 dark:border-red-900 sos-button-pulse cursor-pointer select-none"
              aria-label="Send Emergency SOS Alert"
            >
              <Siren className="size-10 sm:size-14 mb-1 animate-pulse" />
              <span className="text-xl sm:text-3xl font-black tracking-wider">SOS</span>
              <span className="text-[9px] sm:text-[11px] font-medium text-red-100 mt-0.5">Tap for help</span>
            </button>
          </div>

          <div className="bg-muted/40 rounded-2xl p-3.5 sm:p-5 border border-border/60 text-xs text-muted-foreground text-left max-w-md mx-auto space-y-2">
            <div className="font-semibold text-foreground flex items-center gap-1.5 text-xs sm:text-sm">
              <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
              What happens when you tap SOS?
            </div>
            <ul className="list-disc pl-4 space-y-1.5 text-[11px] sm:text-xs leading-relaxed">
              <li>Your emergency contacts receive an instant alert with your live GPS location.</li>
              <li>Nearby verified community volunteers and responders are dispatched.</li>
              <li>Live camera evidence is securely streamed to safety admins in real time.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ===================================================================
          STATE 2: COUNTING DOWN (To cancel accidental taps)
      =================================================================== */}
      {state === "counting" && (
        <div className="space-y-4 py-2 sm:py-6">
          <div className="bg-red-50 dark:bg-red-950/40 border-2 border-red-500 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-center space-y-4 max-w-md mx-auto shadow-md">
            <div className="size-16 sm:size-20 rounded-full bg-red-600 text-white text-2xl sm:text-3xl font-black flex items-center justify-center mx-auto animate-bounce shadow-md">
              {countdown}
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-red-950 dark:text-red-200">
                Triggering Emergency Alert...
              </h2>
              <p className="text-xs text-red-800 dark:text-red-300 mt-1 leading-relaxed">
                Dispatching in <span className="font-bold">{countdown} seconds</span> to emergency contacts and nearby verified responders.
              </p>
            </div>

            <div className="pt-2 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <Button
                size="lg"
                variant="outline"
                onClick={cancelSOS}
                className="w-full font-bold text-xs h-11 sm:h-12 border-red-300 hover:bg-red-100 dark:border-red-800"
              >
                <X className="size-4 mr-1.5" /> Cancel (I'm Safe)
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={dispatchSOS}
                className="w-full font-bold text-xs h-11 sm:h-12 bg-red-600 hover:bg-red-700 text-white shadow-sm"
              >
                Send Immediately
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          STATE 3: ACTIVE EMERGENCY DISPATCH & CAMERA EVIDENCE
      =================================================================== */}
      {state === "active" && (
        <div className="space-y-3 sm:space-y-5">
          <div className="bg-red-50 dark:bg-red-950/40 border-2 border-red-500 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 text-center space-y-3.5 sm:space-y-5 shadow-md">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-red-200 dark:border-red-900/60 pb-2.5 sm:pb-3 flex-wrap">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-black text-xs sm:text-sm uppercase tracking-wider">
                <span className="size-2.5 rounded-full bg-red-600 animate-ping shrink-0" />
                Emergency Active
              </div>
              <span className="font-mono text-[11px] sm:text-xs text-red-900 dark:text-red-300 font-bold bg-white dark:bg-card px-2 py-0.5 rounded-md border border-red-200 dark:border-red-900">
                #{currentAlert?._id?.slice(-6) || "SOS"}
              </span>
            </div>

            <div>
              <h2 className="text-lg sm:text-2xl font-black text-red-950 dark:text-red-200">
                Help is being coordinated
              </h2>
              <p className="text-xs text-red-800 dark:text-red-300 mt-0.5 leading-relaxed">
                Stay calm. Your live GPS coordinates and live camera stream are broadcasting to responders.
              </p>
            </div>

            {/* ASSIGNED VOLUNTEER CARD (Prominently displayed & responsive) */}
            <div className="bg-white dark:bg-card rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-red-200 dark:border-red-900/60 text-left shadow-xs space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ShieldAlert className="size-3.5 text-primary shrink-0" /> Assigned Responder
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${responseStatusBadge.color}`}>
                  {responseStatusBadge.text}
                </span>
              </div>

              {volunteerName ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 p-2.5 sm:p-3 rounded-xl border">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <UserAvatar
                      src={volunteerPhoto}
                      name={volunteerName}
                      role="volunteer"
                      size="md"
                      className="ring-2 ring-emerald-500/50 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-foreground text-xs sm:text-base truncate">
                          {volunteerName}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-bold border border-emerald-500/30 shrink-0 flex items-center gap-0.5">
                          <ShieldCheck className="size-3" /> Verified
                        </span>
                      </div>
                      {currentAlert?.estimatedEtaMinutes != null && (
                        <div className="text-[11px] sm:text-xs text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 mt-0.5">
                          <Navigation className="size-3 shrink-0" /> ETA: ~{currentAlert.estimatedEtaMinutes} min arrival
                        </div>
                      )}
                    </div>
                  </div>

                  {volunteerPhone && (
                    <a
                      href={`tel:${volunteerPhone}`}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-xs transition-colors shrink-0"
                    >
                      <PhoneCall className="size-3.5" />
                      <span>Call Responder</span>
                    </a>
                  )}
                </div>
              ) : (
                <div className="p-2.5 sm:p-3 bg-muted/30 rounded-xl border flex items-center gap-3">
                  <div className="size-8 sm:size-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <RefreshCw className="size-4 text-amber-600 animate-spin" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-xs sm:text-sm text-foreground block">
                      Searching nearest verified volunteer...
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-muted-foreground block leading-tight">
                      AI dispatch engine is routing the closest available responder to your GPS location.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Live Camera Evidence Recorder Viewport */}
            <div className="rounded-xl sm:rounded-2xl border-2 border-red-400 bg-black p-2.5 sm:p-3 text-white space-y-2 overflow-hidden shadow-inner">
              <div className="flex items-center justify-between px-1 gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-red-500 animate-ping shrink-0" />
                  <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-red-400 flex items-center gap-1">
                    <VideoIcon className="size-3 shrink-0" /> Live Evidence Feed ({recordingSeconds}s)
                  </span>
                </div>
                <Badge className="bg-black/80 text-white border-white/20 text-[9px] sm:text-[10px] flex items-center gap-1 font-mono">
                  <Lock className="size-2.5 text-yellow-400 shrink-0" /> Admin Restricted
                </Badge>
              </div>

              {/* Video Element */}
              <div className="relative rounded-xl overflow-hidden aspect-video bg-neutral-900 flex items-center justify-center min-h-[160px] sm:min-h-[220px] max-h-[320px] w-full">
                <video
                  ref={setVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
                />
                {!cameraActive && (
                  <div className="flex flex-col items-center justify-center text-xs text-muted-foreground p-4 text-center space-y-2">
                    <Camera className="size-7 sm:size-8 text-white/50 animate-pulse" />
                    <span className="text-white font-medium text-xs">
                      {isStartingCamera
                        ? "Opening camera..."
                        : cameraError
                        ? cameraError
                        : "Camera recording standby"}
                    </span>
                    <Button
                      size="sm"
                      onClick={startCamera}
                      disabled={isStartingCamera}
                      className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold px-3.5 h-8 shadow-md"
                    >
                      <Camera className="size-3.5 mr-1.5" />
                      {isStartingCamera ? "Starting..." : "Turn Camera On"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] text-white/70 px-1 pt-0.5">
                <span className="truncate">Streaming to Safety Admins</span>
                {evidenceUploaded ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="size-3" /> Live Feed Active
                  </span>
                ) : (
                  <span className="text-yellow-300 font-medium shrink-0">Connecting live stream...</span>
                )}
              </div>
            </div>

            {/* GPS Location Bar */}
            <div className="bg-white dark:bg-card rounded-xl p-2.5 border border-red-200 dark:border-red-900/50 flex items-center justify-between text-xs flex-wrap gap-1">
              <span className="text-muted-foreground flex items-center gap-1 text-[11px] sm:text-xs">
                <MapPin className="size-3.5 text-red-500 shrink-0" /> GPS Location:
              </span>
              <span className="font-mono font-bold text-foreground text-[11px] sm:text-xs">
                {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Acquiring coordinates..."}
              </span>
            </div>

            {/* I'M SAFE NOW ACTION BUTTON (Calls backend resolution) */}
            <div className="pt-1">
              <Button
                size="lg"
                variant="outline"
                disabled={isResolving}
                onClick={handleMarkSafe}
                className="w-full h-11 sm:h-12 text-xs sm:text-sm font-bold border-red-300 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-800 dark:border-red-900 transition-all shadow-xs"
              >
                {isResolving ? (
                  <div className="flex items-center justify-center gap-2 text-foreground">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    <span>Resolving Emergency...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>I am Safe Now (Dismiss Emergency)</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          STATE 4: RESOLVED
      =================================================================== */}
      {state === "resolved" && (
        <div className="bg-card rounded-2xl sm:rounded-3xl border p-5 sm:p-8 text-center space-y-4 max-w-md mx-auto shadow-xs">
          <div className="size-12 sm:size-14 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="size-7 sm:size-8" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">Emergency Resolved</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              The emergency incident has been successfully concluded. Camera recordings have ended and your contacts have been notified of your safety.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Button
              onClick={() => {
                stopCamera();
                setState("idle");
              }}
              className="w-full text-xs font-bold h-10"
            >
              Back to SOS Ready State
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/user/dashboard" })}
              className="w-full text-xs font-medium h-9"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}