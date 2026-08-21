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
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { sendSOS } from "@/services/sosService";
import { getAlertHistory } from "@/services/userService";
import { uploadIncidentEvidence } from "@/services/adminService";

export const Route = createFileRoute("/user/sos")({ component: SOSPage });

type PageState = "idle" | "counting" | "active" | "resolved";

interface ActiveAlert {
  _id: string;
  latitude: number;
  longitude: number;
  status: "active" | "accepted" | "resolved";
  priority?: "P1" | "P2" | "P3" | "P4";
  priorityScore?: number;
  assignedVolunteerName?: string;
  assignedVolunteerPhone?: string;
  estimatedEtaMinutes?: number;
  createdAt: string;
}

const COUNTDOWN_SECONDS = 3;

function SOSPage() {
  const navigate = useNavigate();

  const [state, setState] = useState<PageState>("idle");
  const [countdown, setCountdown] = useState<number>(COUNTDOWN_SECONDS);
  const [isSending, setIsSending] = useState<boolean>(false);

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
  const currentAlertIdRef = useRef<string | null>(null);

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
    try {
      const res = await getAlertHistory();
      const list: ActiveAlert[] = res.data?.data || [];
      const active = list.find((a) => a.status === "active" || a.status === "accepted");
      if (active) {
        currentAlertIdRef.current = active._id;
        setCurrentAlert(active);
        setState("active");
      } else if (state === "active") {
        setState("resolved");
      }
    } catch {
      // Non-blocking
    }
  }, [state]);

  useEffect(() => {
    checkActiveAlert();
    pollTimerRef.current = setInterval(checkActiveAlert, 3000);
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

  // 3. Robust Camera Acquisition
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

      // Try video first (guaranteed webcam access without mic conflict)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch (vidErr) {
        console.warn("Video without audio failed, trying default constraints:", vidErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (!stream) throw new Error("Could not acquire video stream");

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

        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = async () => {
          const alertId = currentAlertIdRef.current;
          if (recordedChunksRef.current.length > 0 && alertId) {
            try {
              const blob = new Blob(recordedChunksRef.current, {
                type: mimeType || "video/webm",
              });
              const formData = new FormData();
              formData.append("media", blob, `evidence_${alertId}_${Date.now()}.webm`);
              formData.append("mediaType", "VIDEO");
              formData.append("durationSec", "10");

              await uploadIncidentEvidence(alertId, formData);
              setEvidenceUploaded(true);
              toast.success("🔒 Emergency camera evidence stored in database (Admin access only).");
            } catch (uploadErr) {
              console.error("Evidence upload error:", uploadErr);
            }
          }
        };

        recorder.start(3000); // 3 second chunks
      } catch (recErr) {
        console.warn("MediaRecorder warning:", recErr);
      }

      // Start recording timer
      setRecordingSeconds(0);
      if (!recordingTimerRef.current) {
        recordingTimerRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
      }

      toast.info("📹 Live Emergency Camera Evidence is active and recording.");
    } catch (err: any) {
      console.error("Camera acquisition error:", err);
      setCameraError(err?.message || "Camera permission requested. Please allow camera access.");
      setCameraActive(false);
    } finally {
      setIsStartingCamera(false);
    }
  };

  const stopCamera = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Auto-start camera when emergency becomes active
  useEffect(() => {
    if (state === "active") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [state]);

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
    };
  }, []);

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

  return (
    <div className="max-w-xl mx-auto py-4 sm:py-8 space-y-6 text-center">
      {/* ===================================================================
          STATE 1: IDLE (Standard Ready State)
      =================================================================== */}
      {state === "idle" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Emergency SOS
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Tap the button below if you are in immediate danger or need rapid assistance.
            </p>
          </div>

          {/* Big Tactile SOS Button */}
          <div className="py-8 flex justify-center">
            <button
              onClick={handleSOSTap}
              disabled={isSending}
              className="size-48 sm:size-56 rounded-full bg-red-600 hover:bg-red-700 text-white flex flex-col items-center justify-center shadow-xl shadow-red-500/30 active:scale-95 transition-all duration-150 border-4 border-red-100 sos-button-pulse cursor-pointer select-none"
              aria-label="Send Emergency SOS Alert"
            >
              <Siren className="size-14 sm:size-16 mb-2 animate-pulse" />
              <span className="text-3xl font-black tracking-wider">SOS</span>
              <span className="text-[11px] font-medium text-red-100 mt-1">Tap for help</span>
            </button>
          </div>

          <div className="bg-muted/40 rounded-2xl p-4 sm:p-5 border border-border/60 text-xs text-muted-foreground text-left max-w-md mx-auto space-y-2">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-600" />
              What happens when you tap SOS?
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>Your emergency contacts receive an instant email/SMS alert with your live location.</li>
              <li>Nearby verified community volunteers are notified for rapid on-site assistance.</li>
              <li>Live camera evidence recording activates and is securely stored in MongoDB strictly for Safety Admins.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ===================================================================
          STATE 2: COUNTING DOWN (To cancel accidental taps)
      =================================================================== */}
      {state === "counting" && (
        <div className="space-y-6 py-6">
          <div className="bg-red-50 border-2 border-red-500 rounded-3xl p-8 text-center space-y-4 max-w-md mx-auto shadow-md">
            <div className="size-20 rounded-full bg-red-600 text-white text-3xl font-black flex items-center justify-center mx-auto animate-bounce">
              {countdown}
            </div>

            <div>
              <h2 className="text-xl font-bold text-red-950">Sending Emergency Alert...</h2>
              <p className="text-xs text-red-800 mt-1">
                Dispatching in {countdown} seconds to contacts and nearby responders.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                variant="outline"
                onClick={cancelSOS}
                className="w-full font-bold text-xs h-11 border-red-300 hover:bg-red-100"
              >
                <X className="size-4 mr-1.5" /> Cancel (I'm Safe)
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={dispatchSOS}
                className="w-full font-bold text-xs h-11 bg-red-600 hover:bg-red-700 text-white"
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
        <div className="space-y-6">
          <div className="bg-red-50 dark:bg-red-950/40 border-2 border-red-500 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-md">
            <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 font-extrabold text-sm uppercase tracking-wider">
              <span className="size-3 rounded-full bg-red-600 animate-ping" />
              Emergency Response Active
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-red-950 dark:text-red-200">
                Help is being coordinated
              </h2>
              <p className="text-xs text-red-800 dark:text-red-300 mt-1 max-w-sm mx-auto">
                Stay calm. Your live GPS coordinates are being shared with verified responders.
              </p>
            </div>

            {/* Live Camera Evidence Recorder Viewport */}
            <div className="rounded-2xl border-2 border-red-400 bg-black p-3 text-white space-y-2 overflow-hidden shadow-inner">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="text-[11px] font-bold tracking-wider uppercase text-red-400 flex items-center gap-1">
                    <VideoIcon className="size-3" /> Live Camera Evidence ({recordingSeconds}s)
                  </span>
                </div>
                <Badge className="bg-black/80 text-white border-white/20 text-[10px] flex items-center gap-1 font-mono">
                  <Lock className="size-2.5 text-yellow-400" /> Admin Restricted
                </Badge>
              </div>

              {/* Video Element */}
              <div className="relative rounded-xl overflow-hidden aspect-video bg-neutral-900 flex items-center justify-center min-h-[220px]">
                <video
                  ref={setVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
                />
                {!cameraActive && (
                  <div className="flex flex-col items-center justify-center text-xs text-muted-foreground p-6 text-center space-y-2.5">
                    <Camera className="size-10 text-white/50 animate-pulse" />
                    <span className="text-white font-medium text-xs">
                      {isStartingCamera
                        ? "Opening camera..."
                        : cameraError
                        ? cameraError
                        : "Click below to allow camera evidence recording"}
                    </span>
                    <Button
                      size="sm"
                      onClick={startCamera}
                      disabled={isStartingCamera}
                      className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold px-4 h-9 shadow-md"
                    >
                      <Camera className="size-3.5 mr-1.5" />
                      {isStartingCamera ? "Starting Camera..." : "Turn Camera On"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] text-white/70 px-1 pt-0.5">
                <span>Storing in MongoDB database as emergency evidence</span>
                {evidenceUploaded ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Uploaded to Database
                  </span>
                ) : (
                  <span className="text-yellow-300 font-medium">Recording active clip...</span>
                )}
              </div>
            </div>

            {/* Emergency Metadata Card */}
            <div className="bg-white dark:bg-card rounded-2xl p-4 border border-red-200 dark:border-red-900/50 text-left text-xs space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-muted-foreground">Incident ID:</span>
                <span className="font-mono font-bold text-foreground">
                  #{currentAlert?._id?.slice(-6) || "INC-ACTIVE"}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-muted-foreground">Location Tracking:</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live GPS Active ({coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Tracking..."})
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-muted-foreground">Assigned Responder:</span>
                <span className="font-bold text-foreground">
                  {currentAlert?.assignedVolunteerName || "Coordinating nearest volunteer..."}
                </span>
              </div>

              {currentAlert?.estimatedEtaMinutes && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Estimated Arrival:</span>
                  <span className="font-extrabold text-indigo-700 dark:text-indigo-400">
                    ~{currentAlert.estimatedEtaMinutes} minutes
                  </span>
                </div>
              )}
            </div>

            {/* I'm safe now action */}
            <div className="pt-2">
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  stopCamera();
                  setState("idle");
                  toast.success("Incident marked as safe.");
                }}
                className="w-full h-12 text-xs font-bold border-red-300 hover:bg-red-100 dark:border-red-900"
              >
                <CheckCircle2 className="size-4 mr-1.5 text-emerald-600" />
                I am Safe Now (Dismiss Emergency)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          STATE 4: RESOLVED
      =================================================================== */}
      {state === "resolved" && (
        <div className="bg-card rounded-3xl border p-8 text-center space-y-4 max-w-md mx-auto shadow-xs">
          <div className="size-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="size-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Emergency Resolved</h2>
          <p className="text-xs text-muted-foreground">
            The emergency incident has been successfully concluded and your contacts notified.
          </p>
          <Button onClick={() => setState("idle")} className="w-full text-xs font-bold h-10">
            Return to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}