import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getActiveAlerts,
  acceptAlert,
  resolveAlert,
  reassignAlert,
  escalateAlert,
  getVolunteers,
  getIncidentEvidence,
} from "@/services/adminService";
import { toast } from "sonner";
import {
  Search,
  RefreshCw,
  MapPin,
  ShieldAlert,
  Bot,
  User,
  Phone,
  Clock,
  ArrowRightLeft,
  AlertTriangle,
  Radio,
  Eye,
  Play,
  FileDown,
  Activity,
  CheckCircle2,
  Volume2,
  Video as VideoIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import OSMMap, { MapMarker } from "@/components/OSMMap";
import { useState, useEffect, useMemo, useRef } from "react";

export const Route = createFileRoute("/admin/monitoring")({ component: Monitoring });

function Monitoring() {
  const [search, setSearch] = useState("");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [evidence, setEvidence] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const pollRef = useRef<any>(null);
  const selectedIncidentRef = useRef<any>(null);

  useEffect(() => {
    selectedIncidentRef.current = selectedIncident;
  }, [selectedIncident]);

  useEffect(() => {
    loadAlerts(false);
    loadVolunteers();

    pollRef.current = setInterval(() => {
      loadAlerts(true);
      if (selectedIncidentRef.current?._id) {
        loadEvidence(selectedIncidentRef.current._id, true);
      }
    }, 4000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (selectedIncident?._id) {
      loadEvidence(selectedIncident._id, false);
    }
  }, [selectedIncident?._id]);

  async function loadEvidence(incidentId: string, silent = false) {
    try {
      const res = await getIncidentEvidence(incidentId);
      setEvidence(res.data?.data || null);
    } catch {
      if (!silent) setEvidence(null);
    }
  }

  async function loadVolunteers() {
    try {
      const res = await getVolunteers();
      setVolunteers(res.data.data);
    } catch {
      // Non-blocking
    }
  }

  async function loadAlerts(silent = false) {
    if (!silent) setLoading(true);
    try {
      const response = await getActiveAlerts();
      const list = response.data.data || [];
      setAlerts(list);
      setLastUpdated(new Date().toLocaleTimeString());

      // Update selected incident if already selected, or default to first P1 incident
      if (list.length > 0) {
        setSelectedIncident((prev: any) => {
          if (!prev) return list[0];
          const updated = list.find((a: any) => a._id === prev._id);
          return updated || list[0];
        });
      } else {
        setSelectedIncident(null);
      }
    } catch (error) {
      if (!silent) toast.error("Unable to load active incidents");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert: any) => {
      const matchesSearch =
        alert.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        alert._id.toLowerCase().includes(search.toLowerCase()) ||
        alert.source?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || alert.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || alert.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [alerts, search, statusFilter, priorityFilter]);

  async function handleAccept(id: string) {
    try {
      await acceptAlert(id);
      toast.success("Incident Accepted by Admin Dispatch");
      loadAlerts(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to accept alert");
    }
  }

  async function handleResolve(id: string) {
    const notes = window.prompt("Resolution Notes (e.g., User safely assisted):") || "";
    try {
      await resolveAlert(id, notes);
      toast.success("Incident Marked Resolved");
      loadAlerts(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to resolve alert");
    }
  }

  async function handleReassign(id: string) {
    const volId = window.prompt("Enter Volunteer ID to assign (or leave empty for best ranked candidate):");
    try {
      await reassignAlert(id, volId ? volId.trim() : undefined);
      toast.success("Incident Reassigned Successfully");
      loadAlerts(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Reassignment failed");
    }
  }

  async function handleEscalate(id: string) {
    try {
      await escalateAlert(id, {
        priority: "P1",
        escalationLevel: "HIGH_ESCALATION",
        reason: "Admin Command Center Manual P1 Escalation",
      });
      toast.success("Incident Escalated to P1 CRITICAL");
      loadAlerts(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Escalation failed");
    }
  }

  // Generate Map Markers
  const mapCenter = useMemo(() => {
    if (selectedIncident) {
      return { lat: selectedIncident.latitude, lng: selectedIncident.longitude };
    }
    return { lat: 12.9716, lng: 77.5946 };
  }, [selectedIncident]);

  const mapMarkers = useMemo(() => {
    const markers: MapMarker[] = [];
    if (selectedIncident) {
      // 1. User Distress Location
      markers.push({
        id: `user-${selectedIncident._id}`,
        latitude: selectedIncident.latitude,
        longitude: selectedIncident.longitude,
        title: `EMERGENCY: ${selectedIncident.user?.name || "User in Distress"}`,
        iconType: "emergency",
        popupContent: `
          <div style="font-family: sans-serif; font-size: 12px; padding: 4px;">
            <strong style="color: #dc2626;">EMERGENCY SOS: ${selectedIncident.user?.name || "User"}</strong><br/>
            Priority: <b>${selectedIncident.priority || "P1"}</b> (${selectedIncident.source})<br/>
            Risk Score: <b>${selectedIncident.riskScore || 90}/100</b><br/>
            Phone: ${selectedIncident.user?.phone || "Private"}
          </div>
        `,
      });

      // 2. Responder Live Location
      const responderLoc = selectedIncident.responderLiveLocation;
      if (responderLoc?.latitude && responderLoc?.longitude) {
        markers.push({
          id: `responder-${selectedIncident._id}`,
          latitude: responderLoc.latitude,
          longitude: responderLoc.longitude,
          title: `Responder: ${selectedIncident.acceptedBy?.name || selectedIncident.assignedVolunteerName || "Volunteer"}`,
          iconType: "responder",
          popupContent: `
            <div style="font-family: sans-serif; font-size: 12px; padding: 4px;">
              <strong style="color: #2563eb;">RESPONDER: ${selectedIncident.acceptedBy?.name || selectedIncident.assignedVolunteerName || "Volunteer"}</strong><br/>
              Status: <b>${selectedIncident.responseStatus || "RESPONDING"}</b><br/>
              ETA: <b>~${selectedIncident.estimatedEtaMinutes || 1} min</b>
            </div>
          `,
        });
      }
    }
    return markers;
  }, [selectedIncident]);

  const routeCoordinates = useMemo(() => {
    if (selectedIncident?.responderLiveLocation?.latitude && selectedIncident?.responderLiveLocation?.longitude) {
      return [
        [selectedIncident.latitude, selectedIncident.longitude] as [number, number],
        [selectedIncident.responderLiveLocation.latitude, selectedIncident.responderLiveLocation.longitude] as [number, number],
      ];
    }
    return [];
  }, [selectedIncident]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="size-5 text-red-600 animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Live Incident Monitoring
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time geospatial tracking, responder navigation & active emergency telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full font-bold border border-emerald-300">
            <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
            LIVE
          </span>
          <span className="text-xs text-muted-foreground">
            Updated: <span className="font-semibold text-foreground">{lastUpdated || "Syncing..."}</span>
          </span>
          <Button size="sm" variant="outline" onClick={() => loadAlerts(false)} disabled={loading} className="text-xs">
            <RefreshCw className={`size-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Incident Switcher & Filter Ribbon */}
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search incident ID, user..."
            className="pl-9 h-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground font-semibold">Priority:</span>
          {["all", "P1", "P2", "P3"].map((p) => (
            <Button
              key={p}
              size="sm"
              variant={priorityFilter === p ? "default" : "outline"}
              onClick={() => setPriorityFilter(p)}
              className="text-xs h-8 px-2.5 font-bold"
            >
              {p}
            </Button>
          ))}

          <span className="text-xs text-muted-foreground font-semibold ml-2">Status:</span>
          {["all", "active", "accepted", "resolved"].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
              className="capitalize text-xs h-8 px-2.5"
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Split-Screen Control Area */}
      {filteredAlerts.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
          <CheckCircle2 className="size-10 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="font-semibold text-sm">No emergency incidents matching criteria.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left / Main Geospatial Map View (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-red-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Live Tactical Map
                  </span>
                </div>
                {selectedIncident && (
                  <span className="text-xs font-medium text-muted-foreground">
                    Target: {selectedIncident.latitude != null ? Number(selectedIncident.latitude).toFixed(4) : "N/A"}, {selectedIncident.longitude != null ? Number(selectedIncident.longitude).toFixed(4) : "N/A"}
                  </span>
                )}
              </div>

              {/* Leaflet Map Component */}
              <div className="relative rounded-xl overflow-hidden border">
                <OSMMap
                  center={mapCenter}
                  zoom={15}
                  markers={mapMarkers}
                  routeCoordinates={routeCoordinates}
                  className="w-full h-[420px]"
                />

                {/* Distance & ETA Overlay Floating Card */}
                {selectedIncident && (
                  <div className="absolute top-3 left-3 z-[1000] bg-card/95 backdrop-blur border rounded-xl p-3 shadow-lg text-xs space-y-1 max-w-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-red-600 animate-ping" />
                      <span className="font-bold text-foreground">
                        {selectedIncident.user?.name || "Distress Location"}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      Source: <span className="font-semibold text-foreground">{selectedIncident.source}</span>
                    </div>
                    {selectedIncident.estimatedEtaMinutes != null && (
                      <div className="text-emerald-600 font-bold text-xs pt-0.5">
                        ETA to Scene: ~{selectedIncident.estimatedEtaMinutes} min
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Active Incident List selector pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                {filteredAlerts.map((a: any) => {
                  const isSelected = selectedIncident?._id === a._id;
                  const isP1 = a.priority === "P1" || a.riskLevel === "CRITICAL";
                  return (
                    <button
                      key={a._id}
                      onClick={() => setSelectedIncident(a)}
                      className={`px-3 py-2 rounded-xl text-left border text-xs shrink-0 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                          : "border-border bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`size-2 rounded-full ${
                            isP1 ? "bg-red-600 animate-pulse" : "bg-amber-500"
                          }`}
                        />
                        <span className="font-bold text-foreground">{a.user?.name || "User"}</span>
                        <span className="text-[10px] text-muted-foreground">#{a._id.slice(-4)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Control & Telemetry Panel (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {selectedIncident ? (
              <div className="space-y-4">
                {/* Incident Status Card */}
                <div
                  className={`rounded-2xl border p-5 shadow-sm space-y-4 ${
                    selectedIncident.priority === "P1" || selectedIncident.riskLevel === "CRITICAL"
                      ? "border-red-500/40 bg-red-500/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-black px-2.5 py-1 rounded-full ${
                          selectedIncident.priority === "P1"
                            ? "bg-red-600 text-white animate-pulse"
                            : "bg-amber-500 text-white"
                        }`}
                      >
                        🚨 {selectedIncident.priority || "P1"} CRITICAL
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-card border text-foreground">
                        {selectedIncident.responseStatus || selectedIncident.status}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      #{selectedIncident._id.slice(-6)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-card p-2.5 rounded-xl border">
                      <span className="text-muted-foreground block text-[11px]">User in Distress</span>
                      <span className="font-bold text-foreground text-sm">
                        {selectedIncident.user?.name || "User"}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        {selectedIncident.user?.phone || "Private Phone"}
                      </span>
                    </div>

                    <div className="bg-card p-2.5 rounded-xl border">
                      <span className="text-muted-foreground block text-[11px]">Assigned Responder</span>
                      <span className="font-bold text-primary text-sm">
                        {selectedIncident.acceptedBy?.name ||
                          selectedIncident.assignedVolunteerId?.name ||
                          selectedIncident.assignedVolunteerName ||
                          "Searching..."}
                      </span>
                      <span className="text-[11px] text-emerald-600 font-semibold block">
                        ETA: ~{selectedIncident.estimatedEtaMinutes || 1} min
                      </span>
                    </div>
                  </div>

                  {/* AI Explainable Risk Reasons */}
                  {selectedIncident.priorityReasons && selectedIncident.priorityReasons.length > 0 && (
                    <div className="text-xs bg-muted/40 p-2.5 rounded-xl border text-muted-foreground">
                      <span className="font-bold text-red-600">AI Risk Reasons:</span>{" "}
                      {selectedIncident.priorityReasons.join(" · ")}
                    </div>
                  )}

                  {/* Administrative Action Controls */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReassign(selectedIncident._id)}
                      className="text-xs flex-1"
                    >
                      <ArrowRightLeft className="size-3.5 mr-1" />
                      Reassign
                    </Button>

                    {selectedIncident.priority !== "P1" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEscalate(selectedIncident._id)}
                        className="text-xs text-red-600 border-red-200"
                      >
                        <AlertTriangle className="size-3.5 mr-1" />
                        Escalate (P1)
                      </Button>
                    )}

                    {selectedIncident.status === "active" && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                        onClick={() => handleAccept(selectedIncident._id)}
                      >
                        Accept
                      </Button>
                    )}

                    {selectedIncident.status !== "resolved" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleResolve(selectedIncident._id)}
                        className="text-xs"
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>

                {/* Live Emergency Evidence Player (Audio / Video) */}
                {(() => {
                  const backendBase = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api$/, "");
                  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
                  const buildStreamUrl = (relativeUrl: string) => `${backendBase}${relativeUrl}?token=${encodeURIComponent(token || "")}`;
                  const hasVideo = !!evidence?.videoRecording?.url;
                  const hasAudio = !!evidence?.audioRecording?.url;

                  return (
                    <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                          <Radio className={`size-3.5 ${hasVideo || hasAudio ? "text-red-600 animate-pulse" : "text-amber-500"}`} />
                          Emergency Evidence Stream
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => selectedIncident?._id && loadEvidence(selectedIncident._id)}
                            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 border px-2 py-0.5 rounded hover:bg-muted/60 transition-colors"
                          >
                            <RefreshCw className="size-2.5" /> Sync
                          </button>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            hasVideo || hasAudio ? "bg-red-100 text-red-700 dark:bg-red-950" : "bg-muted text-muted-foreground"
                          }`}>
                            {hasVideo || hasAudio ? "EVIDENCE ACTIVE" : "AWAITING STREAM"}
                          </span>
                        </div>
                      </div>

                      {hasVideo ? (
                        <div className="space-y-1.5">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <VideoIcon className="size-3 text-red-500" /> Emergency Camera Recording
                            {evidence.videoRecording.durationSec ? ` (${evidence.videoRecording.durationSec}s)` : ""}:
                          </span>
                          <div className="rounded-xl overflow-hidden bg-black border aspect-video max-h-56 relative flex items-center justify-center">
                            <video
                              key={evidence.videoRecording.url}
                              controls
                              playsInline
                              preload="auto"
                              className="w-full h-full object-contain"
                              src={buildStreamUrl(evidence.videoRecording.url)}
                            >
                              Your browser does not support the video tag.
                            </video>
                          </div>
                        </div>
                      ) : null}

                      {hasAudio ? (
                        <div className="space-y-1 pt-1">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Volume2 className="size-3 text-blue-500" /> Emergency Audio Clip
                            {evidence.audioRecording.durationSec ? ` (${evidence.audioRecording.durationSec}s)` : ""}:
                          </span>
                          <audio
                            key={evidence.audioRecording.url}
                            controls
                            preload="auto"
                            className="w-full"
                            src={buildStreamUrl(evidence.audioRecording.url)}
                          />
                        </div>
                      ) : null}

                      {!hasVideo && !hasAudio && (
                        <div className="p-3 bg-muted/20 border border-dashed rounded-xl text-center space-y-1">
                          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                            <span className="size-2 rounded-full bg-amber-500 animate-ping" />
                            <span>Listening for incoming audio/camera stream...</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground/80">
                            When victim's camera or microphone triggers, video/voice recordings will stream directly into this command tile.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Real-Time Live Incident Timeline */}
                <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Activity className="size-3.5 text-primary" /> Live Incident Timeline
                    </h3>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Auto-Syncing
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {(!selectedIncident.responseTimeline || selectedIncident.responseTimeline.length === 0) ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        Emergency incident initiated. Waiting for responder milestones...
                      </p>
                    ) : (
                      selectedIncident.responseTimeline.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs border-l-2 border-primary/40 pl-3 py-1">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-foreground text-[11px]">
                                {item.event.replace(/_/g, " ")}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {new Date(item.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-muted-foreground text-[11px] mt-0.5">{item.description}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">
                Select an incident from the map to monitor telemetry.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}