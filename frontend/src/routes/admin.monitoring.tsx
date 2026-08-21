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
  Maximize2,
  Minimize2,
  X,
  Layers,
  FileText,
  SlidersHorizontal,
  Flame,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import OSMMap, { MapMarker } from "@/components/OSMMap";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useState, useEffect, useMemo, useRef } from "react";

export const Route = createFileRoute("/admin/monitoring")({ component: Monitoring });

type MobileTab = "all" | "map" | "details" | "evidence" | "timeline";

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
  const [mobileTab, setMobileTab] = useState<MobileTab>("map");
  const [isMapExpanded, setIsMapExpanded] = useState(false);
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
      setVolunteers(res.data?.data || []);
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
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

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
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        alert.user?.name?.toLowerCase().includes(q) ||
        alert._id.toLowerCase().includes(q) ||
        alert.source?.toLowerCase().includes(q) ||
        alert.priority?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" || alert.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || alert.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [alerts, search, statusFilter, priorityFilter]);

  const p1Count = useMemo(() => alerts.filter((a) => a.priority === "P1" || a.riskLevel === "CRITICAL").length, [alerts]);
  const activeCount = useMemo(() => alerts.filter((a) => a.status === "active").length, [alerts]);

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
    if (selectedIncident && selectedIncident.latitude != null && selectedIncident.longitude != null) {
      return { lat: Number(selectedIncident.latitude), lng: Number(selectedIncident.longitude) };
    }
    return { lat: 12.9716, lng: 77.5946 };
  }, [selectedIncident]);

  const mapMarkers = useMemo(() => {
    const markers: MapMarker[] = [];
    if (selectedIncident && selectedIncident.latitude != null && selectedIncident.longitude != null) {
      // 1. User Distress Location
      markers.push({
        id: `user-${selectedIncident._id}`,
        latitude: Number(selectedIncident.latitude),
        longitude: Number(selectedIncident.longitude),
        title: `EMERGENCY: ${selectedIncident.user?.name || "User in Distress"}`,
        iconType: "emergency",
        popupContent: `
          <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; padding: 4px; line-height: 1.4;">
            <strong style="color: #dc2626; font-size: 13px;">🚨 EMERGENCY: ${selectedIncident.user?.name || "User"}</strong><br/>
            Priority: <b>${selectedIncident.priority || "P1"}</b> (${selectedIncident.source || "Manual SOS"})<br/>
            Risk Score: <b>${selectedIncident.riskScore || 90}/100</b><br/>
            Phone: <b>${selectedIncident.user?.phone || "Private"}</b>
          </div>
        `,
      });

      // 2. Responder Live Location
      const responderLoc = selectedIncident.responderLiveLocation;
      if (responderLoc?.latitude && responderLoc?.longitude) {
        markers.push({
          id: `responder-${selectedIncident._id}`,
          latitude: Number(responderLoc.latitude),
          longitude: Number(responderLoc.longitude),
          title: `Responder: ${selectedIncident.acceptedBy?.name || selectedIncident.assignedVolunteerName || "Volunteer"}`,
          iconType: "responder",
          popupContent: `
            <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; padding: 4px; line-height: 1.4;">
              <strong style="color: #2563eb; font-size: 13px;">👮 RESPONDER: ${selectedIncident.acceptedBy?.name || selectedIncident.assignedVolunteerName || "Volunteer"}</strong><br/>
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
    if (
      selectedIncident?.latitude != null &&
      selectedIncident?.longitude != null &&
      selectedIncident?.responderLiveLocation?.latitude &&
      selectedIncident?.responderLiveLocation?.longitude
    ) {
      return [
        [Number(selectedIncident.latitude), Number(selectedIncident.longitude)] as [number, number],
        [Number(selectedIncident.responderLiveLocation.latitude), Number(selectedIncident.responderLiveLocation.longitude)] as [number, number],
      ];
    }
    return [];
  }, [selectedIncident]);

  const hasVideoEvidence = !!evidence?.videoRecording?.url;
  const hasAudioEvidence = !!evidence?.audioRecording?.url;
  const hasAnyEvidence = hasVideoEvidence || hasAudioEvidence;

  return (
    <div className="space-y-3.5 sm:space-y-5 pb-6">
      {/* Header & Status Bar */}
      <div className="flex flex-col gap-2.5 sm:gap-3 bg-card border rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="size-8 sm:size-9 rounded-lg sm:rounded-xl bg-red-600/10 dark:bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
              <Radio className="size-4 sm:size-5 text-red-600 dark:text-red-400 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-bold tracking-tight text-foreground truncate">
                  Live Monitoring
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold border border-emerald-500/20">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                  LIVE
                </span>
                {p1Count > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full font-bold border border-red-500/30 animate-pulse">
                    <Flame className="size-3" />
                    {p1Count} Critical P1
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">
                Real-time geospatial tracking & emergency telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto shrink-0">
            <div className="text-[10px] sm:text-xs text-muted-foreground hidden xs:block text-right">
              <span className="opacity-70">Updated:</span> <span className="font-mono font-medium text-foreground">{lastUpdated || "Syncing..."}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => loadAlerts(false)}
              disabled={loading}
              className="text-xs h-8 px-2.5 sm:px-3 rounded-lg"
              title="Refresh incidents"
            >
              <RefreshCw className={`size-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Filter & Search Ribbon */}
      <div className="rounded-xl sm:rounded-2xl border bg-card p-3 sm:p-4 shadow-xs space-y-2.5 sm:space-y-3">
        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search incident ID, victim name, source, priority..."
            className="pl-9 pr-8 h-9 text-xs sm:text-sm rounded-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Scrollable Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar sm:flex-wrap text-xs">
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider mr-1">
              Priority:
            </span>
            {["all", "P1", "P2", "P3"].map((p) => {
              const isActive = priorityFilter === p;
              const isP1 = p === "P1";
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriorityFilter(p)}
                  className={`px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-bold transition-all shrink-0 border ${
                    isActive
                      ? isP1
                        ? "bg-red-600 text-white border-red-600 shadow-xs"
                        : "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card hover:bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {p === "all" ? "All" : p}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-border shrink-0 mx-1 hidden sm:block" />

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider mr-1">
              Status:
            </span>
            {["all", "active", "accepted", "resolved"].map((s) => {
              const isActive = statusFilter === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`capitalize px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-medium transition-all shrink-0 border ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                      : "bg-card hover:bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>

          {(search || priorityFilter !== "all" || statusFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPriorityFilter("all");
                setStatusFilter("all");
              }}
              className="text-[10px] sm:text-xs text-muted-foreground hover:text-red-500 underline ml-auto shrink-0"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Mobile Tab Switcher (<lg screens) */}
      <div className="lg:hidden">
        <div className="grid grid-cols-4 gap-1 bg-muted/60 p-1 rounded-xl border">
          <button
            type="button"
            onClick={() => setMobileTab("map")}
            className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-medium transition-all ${
              mobileTab === "map"
                ? "bg-card text-foreground font-bold shadow-xs border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MapPin className="size-3.5 text-red-500" />
            <span>Map</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab("details")}
            className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-medium transition-all relative ${
              mobileTab === "details"
                ? "bg-card text-foreground font-bold shadow-xs border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldAlert className="size-3.5 text-primary" />
            <span>Ops</span>
            {selectedIncident && (
              <span className="size-1.5 rounded-full bg-red-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileTab("evidence")}
            className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-medium transition-all relative ${
              mobileTab === "evidence"
                ? "bg-card text-foreground font-bold shadow-xs border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <VideoIcon className={`size-3.5 ${hasAnyEvidence ? "text-red-600 animate-pulse" : "text-muted-foreground"}`} />
            <span>Stream</span>
            {hasAnyEvidence && (
              <span className="size-1.5 rounded-full bg-red-600 animate-ping" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileTab("timeline")}
            className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-medium transition-all ${
              mobileTab === "timeline"
                ? "bg-card text-foreground font-bold shadow-xs border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="size-3.5 text-emerald-500" />
            <span>Timeline</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredAlerts.length === 0 ? (
        <div className="rounded-xl sm:rounded-2xl border bg-card p-8 sm:p-14 text-center text-muted-foreground space-y-2">
          <CheckCircle2 className="size-10 sm:size-12 text-muted-foreground/60 mx-auto mb-1" />
          <h3 className="font-bold text-foreground text-sm sm:text-base">No active incidents matching criteria</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {alerts.length === 0
              ? "All zones are safe. No active SOS alerts currently reporting in dispatch center."
              : "Try clearing your priority or status filters to view other alerts."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3.5 sm:gap-5 lg:grid-cols-12">
          {/* Left Column: Tactical Map & Incidents List (7 cols on Desktop) */}
          <div
            className={`lg:col-span-7 space-y-3 sm:space-y-4 ${
              mobileTab !== "map" && mobileTab !== "all" ? "hidden lg:block" : "block"
            }`}
          >
            <div className="rounded-xl sm:rounded-2xl border bg-card p-3 sm:p-4 shadow-xs space-y-3">
              {/* Map Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <MapPin className="size-4 text-red-500 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground truncate">
                    Tactical GPS Feed
                  </span>
                  {selectedIncident && (
                    <span className="text-[10px] sm:text-xs font-mono font-bold text-red-600 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                      #{selectedIncident._id.slice(-4)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsMapExpanded(!isMapExpanded)}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground border rounded-lg px-2 py-1 bg-muted/30 transition-colors"
                    title={isMapExpanded ? "Compact map" : "Expand map height"}
                  >
                    {isMapExpanded ? (
                      <>
                        <Minimize2 className="size-3" />
                        <span className="hidden sm:inline">Compact</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="size-3" />
                        <span className="hidden sm:inline">Expand</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Map Container */}
              <div className="relative rounded-lg sm:rounded-xl overflow-hidden border">
                <OSMMap
                  center={mapCenter}
                  zoom={15}
                  markers={mapMarkers}
                  routeCoordinates={routeCoordinates}
                  className={`w-full transition-all duration-300 ${
                    isMapExpanded
                      ? "h-[420px] sm:h-[500px] lg:h-[560px]"
                      : "h-[260px] sm:h-[350px] lg:h-[420px]"
                  }`}
                />

                {/* Floating Telemetry Badge positioned safely at top-right to NOT collide with leaflet zoom controls */}
                {selectedIncident && (
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-[1000] bg-card/95 backdrop-blur border rounded-lg sm:rounded-xl p-2 sm:p-2.5 shadow-lg text-[10px] sm:text-xs space-y-0.5 max-w-[160px] sm:max-w-[200px]">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-red-600 animate-ping shrink-0" />
                      <span className="font-bold text-foreground truncate">
                        {selectedIncident.user?.name || "Distress Target"}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-[10px] truncate">
                      Source: <span className="font-medium text-foreground">{selectedIncident.source || "SOS"}</span>
                    </div>
                    {selectedIncident.estimatedEtaMinutes != null && (
                      <div className="text-emerald-600 font-bold text-[10px] sm:text-xs">
                        ETA: ~{selectedIncident.estimatedEtaMinutes} min
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Active Incident Carousel / Selector Pills */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5 font-medium">
                  <span>Select Active Incident ({filteredAlerts.length})</span>
                  <span className="text-[10px]">Swipe horizontally ➔</span>
                </div>

                <div className="flex items-stretch gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scrollbar-thin">
                  {filteredAlerts.map((a: any) => {
                    const isSelected = selectedIncident?._id === a._id;
                    const isP1 = a.priority === "P1" || a.riskLevel === "CRITICAL";

                    return (
                      <button
                        key={a._id}
                        type="button"
                        onClick={() => {
                          setSelectedIncident(a);
                          // Auto switch to details on mobile if tapped
                          if (window.innerWidth < 1024 && mobileTab === "map") {
                            setMobileTab("details");
                          }
                        }}
                        className={`p-2 sm:p-2.5 rounded-xl text-left border shrink-0 transition-all min-w-[170px] sm:min-w-[200px] flex flex-col justify-between gap-1.5 ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-xs"
                            : "border-border bg-card hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 w-full">
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                              isP1 ? "bg-red-600 text-white animate-pulse" : "bg-amber-500 text-white"
                            }`}
                          >
                            {a.priority || "P1"}
                          </span>
                          <span className="text-[9px] font-mono text-muted-foreground">
                            #{a._id.slice(-4)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 min-w-0">
                          <UserAvatar
                            src={a.user?.profileImage}
                            name={a.user?.name || "User"}
                            role="user"
                            size="xs"
                            className="shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-foreground text-xs truncate block">
                              {a.user?.name || "Victim"}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate block capitalize">
                              {a.status}
                            </span>
                          </div>
                        </div>

                        <div className="text-[9px] text-muted-foreground flex items-center justify-between border-t pt-1 w-full">
                          <span className="truncate">{a.source || "Manual SOS"}</span>
                          <span className="font-mono font-medium text-foreground">
                            {a.createdAt ? new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Incident Telemetry, Evidence & Timeline (5 cols on Desktop) */}
          <div className="lg:col-span-5 space-y-3 sm:space-y-4">
            {selectedIncident ? (
              <>
                {/* 1. Incident Status & Dispatch Operations Card */}
                <div
                  className={`rounded-xl sm:rounded-2xl border p-3.5 sm:p-5 shadow-xs space-y-3.5 ${
                    selectedIncident.priority === "P1" || selectedIncident.riskLevel === "CRITICAL"
                      ? "border-red-500/40 bg-red-500/5"
                      : "border-border bg-card"
                  } ${mobileTab !== "details" && mobileTab !== "all" ? "hidden lg:block" : "block"}`}
                >
                  {/* Status Banner */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span
                        className={`text-[11px] sm:text-xs font-black px-2.5 py-0.5 rounded-full ${
                          selectedIncident.priority === "P1"
                            ? "bg-red-600 text-white animate-pulse"
                            : "bg-amber-500 text-white"
                        }`}
                      >
                        🚨 {selectedIncident.priority || "P1"}
                      </span>
                      <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-card border text-foreground capitalize">
                        {selectedIncident.responseStatus || selectedIncident.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      #{selectedIncident._id.slice(-6)}
                    </span>
                  </div>

                  {/* Victim and Responder Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 text-xs">
                    {/* Victim Box */}
                    <div className="bg-card p-2.5 rounded-xl border flex items-start gap-2.5">
                      <UserAvatar
                        src={selectedIncident.user?.profileImage}
                        name={selectedIncident.user?.name || "User"}
                        role="user"
                        size="sm"
                        className="mt-0.5 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-muted-foreground block text-[10px]">User in Distress</span>
                        <span className="font-bold text-foreground text-xs sm:text-sm truncate block">
                          {selectedIncident.user?.name || "User"}
                        </span>
                        {selectedIncident.user?.phone ? (
                          <a
                            href={`tel:${selectedIncident.user.phone}`}
                            className="text-[11px] text-primary hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <Phone className="size-3" />
                            <span className="truncate">{selectedIncident.user.phone}</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-muted-foreground block truncate">
                            Private Phone
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Responder Box */}
                    <div className="bg-card p-2.5 rounded-xl border flex items-start gap-2.5">
                      <UserAvatar
                        src={
                          selectedIncident.acceptedBy?.profileImage ||
                          selectedIncident.assignedVolunteerId?.profileImage
                        }
                        name={
                          selectedIncident.acceptedBy?.name ||
                          selectedIncident.assignedVolunteerId?.name ||
                          selectedIncident.assignedVolunteerName ||
                          "Volunteer"
                        }
                        role="volunteer"
                        size="sm"
                        className="mt-0.5 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-muted-foreground block text-[10px]">Assigned Responder</span>
                        <span className="font-bold text-primary text-xs sm:text-sm truncate block">
                          {selectedIncident.acceptedBy?.name ||
                            selectedIncident.assignedVolunteerId?.name ||
                            selectedIncident.assignedVolunteerName ||
                            "Searching candidate..."}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                          ETA: ~{selectedIncident.estimatedEtaMinutes || 1} min
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AI Explainable Risk Reasons */}
                  {selectedIncident.priorityReasons && selectedIncident.priorityReasons.length > 0 && (
                    <div className="text-xs bg-muted/40 p-2.5 rounded-xl border text-muted-foreground space-y-1">
                      <span className="font-bold text-red-600 dark:text-red-400 block text-[11px]">
                        AI Risk Assessment:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {selectedIncident.priorityReasons.map((reason: string, idx: number) => (
                          <span
                            key={idx}
                            className="bg-card border px-2 py-0.5 rounded-md text-[10px] font-medium text-foreground"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Administrative Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReassign(selectedIncident._id)}
                      className="text-xs h-9 font-medium"
                    >
                      <ArrowRightLeft className="size-3.5 mr-1 text-muted-foreground" />
                      Reassign
                    </Button>

                    {selectedIncident.priority !== "P1" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEscalate(selectedIncident._id)}
                        className="text-xs text-red-600 hover:text-red-700 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/40 h-9 font-medium"
                      >
                        <AlertTriangle className="size-3.5 mr-1" />
                        Escalate P1
                      </Button>
                    )}

                    {selectedIncident.status === "active" && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-bold"
                        onClick={() => handleAccept(selectedIncident._id)}
                      >
                        <CheckCircle2 className="size-3.5 mr-1" />
                        Accept Dispatch
                      </Button>
                    )}

                    {selectedIncident.status !== "resolved" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleResolve(selectedIncident._id)}
                        className="text-xs h-9 font-bold"
                      >
                        Resolve SOS
                      </Button>
                    )}
                  </div>
                </div>

                {/* 2. Live Emergency Evidence Player (Audio / Video) */}
                <div
                  className={`rounded-xl sm:rounded-2xl border bg-card p-3.5 sm:p-4 shadow-xs space-y-3 ${
                    mobileTab !== "evidence" && mobileTab !== "all" ? "hidden lg:block" : "block"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-foreground">
                      <Radio
                        className={`size-3.5 ${
                          hasAnyEvidence ? "text-red-600 animate-pulse" : "text-amber-500"
                        }`}
                      />
                      Live Evidence Stream
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => selectedIncident?._id && loadEvidence(selectedIncident._id)}
                        className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 border px-2 py-1 rounded-md bg-muted/30 transition-colors"
                      >
                        <RefreshCw className="size-2.5" /> Sync Stream
                      </button>
                      <span
                        className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          hasAnyEvidence
                            ? "bg-red-500/10 text-red-600 border border-red-500/20"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {hasAnyEvidence ? "ACTIVE STREAM" : "AWAITING"}
                      </span>
                    </div>
                  </div>

                  {(() => {
                    const backendBase = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api$/, "");
                    const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
                    const buildStreamUrl = (relativeUrl: string, timestamp?: any) =>
                      `${backendBase}${relativeUrl}?token=${encodeURIComponent(token || "")}&_t=${encodeURIComponent(timestamp || "")}`;

                    return (
                      <>
                        {hasVideoEvidence ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                                <VideoIcon className="size-3.5 text-red-500" /> Live Camera Stream
                                {evidence.videoRecording.durationSec
                                  ? ` (${evidence.videoRecording.durationSec}s)`
                                  : ""}
                              </span>
                              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                BROADCASTING
                              </span>
                            </div>
                            <div className="rounded-xl overflow-hidden bg-black border aspect-video max-h-64 relative flex items-center justify-center shadow-inner">
                              <video
                                key={`${evidence.videoRecording.url}_${evidence.videoRecording.recordedAt || ""}`}
                                controls
                                autoPlay
                                muted
                                playsInline
                                preload="auto"
                                className="w-full h-full object-contain"
                                src={buildStreamUrl(evidence.videoRecording.url, evidence.videoRecording.recordedAt)}
                              >
                                Your browser does not support the video tag.
                              </video>
                            </div>
                          </div>
                        ) : null}

                        {hasAudioEvidence ? (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                              <Volume2 className="size-3.5 text-blue-500" /> Microphone Capture
                              {evidence.audioRecording.durationSec
                                ? ` (${evidence.audioRecording.durationSec}s)`
                                : ""}
                            </span>
                            <audio
                              key={evidence.audioRecording.url}
                              controls
                              preload="auto"
                              className="w-full h-10"
                              src={buildStreamUrl(evidence.audioRecording.url)}
                            />
                          </div>
                        ) : null}

                        {!hasAnyEvidence && (
                          <div className="p-4 bg-muted/20 border border-dashed rounded-xl text-center space-y-1.5">
                            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-medium">
                              <span className="size-2 rounded-full bg-amber-500 animate-ping" />
                              <span>Listening for victim camera / voice stream...</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                              When victim sensor triggers, audio recordings and video captures will live-stream directly into this console.
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* 3. Real-Time Live Incident Timeline */}
                <div
                  className={`rounded-xl sm:rounded-2xl border bg-card p-3.5 sm:p-4 shadow-xs space-y-3 ${
                    mobileTab !== "timeline" && mobileTab !== "all" ? "hidden lg:block" : "block"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Activity className="size-3.5 text-primary shrink-0" />
                      <span>Live Response Milestones</span>
                    </h3>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 shrink-0">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Syncing
                    </span>
                  </div>

                  <div className="space-y-2 max-h-56 sm:max-h-64 overflow-y-auto pr-1">
                    {!selectedIncident.responseTimeline || selectedIncident.responseTimeline.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        Emergency incident initiated. Waiting for responder milestones...
                      </p>
                    ) : (
                      selectedIncident.responseTimeline.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 text-xs border-l-2 border-primary/40 pl-3 py-1"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-foreground text-[11px] capitalize">
                                {item.event ? item.event.replace(/_/g, " ") : "Milestone"}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : ""}
                              </span>
                            </div>
                            <p className="text-muted-foreground text-[11px] mt-0.5">{item.description}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl sm:rounded-2xl border bg-card p-8 text-center text-xs sm:text-sm text-muted-foreground">
                Select an incident from the map to monitor telemetry.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}