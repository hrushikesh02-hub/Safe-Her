import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Siren,
  ShieldAlert,
  Users,
  UserCheck,
  CheckCircle2,
  Clock,
  Activity,
  Bot,
  MapPin,
  Eye,
  Radio,
  ArrowRight,
  RefreshCw,
  Phone,
  Navigation,
  Flame,
  TrendingUp,
  TrendingDown,
  Sparkles,
  AlertTriangle,
  FileDown,
  Download,
  Filter,
  Search,
  Bell,
  Compass,
  Zap,
  Volume2,
  Footprints,
  ShieldCheck,
  Lightbulb,
  Check,
  FileText,
  SlidersHorizontal,
  Layers,
  BarChart2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import OSMMap, { MapMarker } from "@/components/OSMMap";
import { useEffect, useState, useRef, useMemo } from "react";
import {
  getCommandCenterOverview,
  getRiskAnalytics,
  getSignalAnalytics,
  getSafetyHotspots,
  getTimeAnalytics,
  getVolunteerAnalytics,
  getAIInsights,
  getAdminAlertCenter,
  getAllIncidents,
  getIncidentReportData,
  getActiveAlerts,
  getSafeZones,
  acceptAlert,
  resolveAlert,
  CommandCenterOverview,
  RiskAnalytics,
  SignalAnalytics,
  Hotspot,
  TimeAnalytics,
  VolunteerAnalytics,
  AIInsight,
  SafetyRecommendation,
  AdminAlert,
  IncidentReportData,
} from "@/services/adminService";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import FileSaver from "file-saver";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

export const Route = createFileRoute("/admin/dashboard")({ component: AdminCommandCenter });

const RISK_COLORS = {
  CRITICAL: "#ef4444", // Red
  HIGH: "#f97316",     // Orange
  MEDIUM: "#eab308",   // Yellow
  LOW: "#22c55e",      // Green
};

const SIGNAL_COLORS = ["#6366f1", "#ec4899", "#8b5cf6", "#3b82f6", "#14b8a6", "#f59e0b", "#10b981", "#64748b"];

// Deterministic mock data for DEMO MODE
const DEMO_OVERVIEW: CommandCenterOverview = {
  activeIncidents: 3,
  criticalIncidents: 2,
  highRiskIncidents: 1,
  resolvedIncidents: 24,
  totalIncidents: 27,
  respondersActive: 4,
  totalUsers: 142,
  totalVolunteers: 18,
  verifiedVolunteers: 15,
  safeZonesCount: 8,
  avgResponseTimeSec: 195,
  avgResolutionTimeSec: 620,
  avgResponseFormatted: "3m 15s",
  avgResolutionFormatted: "10m 20s",
  comparisons: {
    todayVsYesterday: { incidentChangePct: 15, criticalChangePct: -25, todayCount: 6, yesterdayCount: 5 },
    weekVsLastWeek: { incidentChangePct: -10, criticalChangePct: -18, thisWeekCount: 22, lastWeekCount: 25 },
    monthVsLastMonth: { incidentChangePct: -8, criticalChangePct: -12, thisMonthCount: 58, lastMonthCount: 63 },
  },
};

const DEMO_RISK: RiskAnalytics = {
  distribution: { CRITICAL: 5, HIGH: 8, MEDIUM: 10, LOW: 4, total: 27, avgRiskScore: 68, criticalPercentage: 19 },
  dailyTrend: [
    { date: "Mon", critical: 1, high: 2, medium: 3, low: 1, total: 7, avgRisk: 62 },
    { date: "Tue", critical: 0, high: 1, medium: 2, low: 2, total: 5, avgRisk: 48 },
    { date: "Wed", critical: 2, high: 1, medium: 1, low: 0, total: 4, avgRisk: 79 },
    { date: "Thu", critical: 1, high: 3, medium: 2, low: 1, total: 7, avgRisk: 71 },
    { date: "Fri", critical: 2, high: 2, medium: 3, low: 0, total: 7, avgRisk: 84 },
    { date: "Sat", critical: 1, high: 1, medium: 2, low: 1, total: 5, avgRisk: 65 },
    { date: "Sun", critical: 0, high: 1, medium: 1, low: 1, total: 3, avgRisk: 52 },
  ],
  weeklyTrend: [
    { week: "W-5", total: 18, critical: 4, avgRisk: 64 },
    { week: "W-4", total: 22, critical: 5, avgRisk: 70 },
    { week: "W-3", total: 19, critical: 3, avgRisk: 58 },
    { week: "W-2", total: 25, critical: 6, avgRisk: 74 },
    { week: "W-1", total: 20, critical: 3, avgRisk: 61 },
    { week: "W-Now", total: 27, critical: 5, avgRisk: 68 },
  ],
  monthlyTrend: [
    { month: "May", total: 74, critical: 16, avgRisk: 66 },
    { month: "Jun", total: 82, critical: 19, avgRisk: 72 },
    { month: "Jul", total: 69, critical: 12, avgRisk: 59 },
    { month: "Aug", total: 63, critical: 11, avgRisk: 55 },
  ],
};

const DEMO_SIGNALS: SignalAnalytics = {
  signals: [
    { signal: "Voice Distress", count: 18, percentage: 38 },
    { signal: "Route Deviation", count: 12, percentage: 25 },
    { signal: "Movement Anomaly", count: 9, percentage: 19 },
    { signal: "Help Keywords", count: 5, percentage: 10 },
    { signal: "Sudden Stop", count: 4, percentage: 8 },
  ],
  totalDetections: 48,
  sources: [
    { source: "AI_VOICE", incidentCount: 11, criticalCount: 4, criticalPercentage: 36, averageRisk: 82, avgResponseDurationSec: 180 },
    { source: "AI_FUSION", incidentCount: 8, criticalCount: 3, criticalPercentage: 38, averageRisk: 88, avgResponseDurationSec: 165 },
    { source: "AI_MOVEMENT", incidentCount: 5, criticalCount: 1, criticalPercentage: 20, averageRisk: 64, avgResponseDurationSec: 210 },
    { source: "MANUAL_SOS", incidentCount: 3, criticalCount: 1, criticalPercentage: 33, averageRisk: 75, avgResponseDurationSec: 150 },
  ],
};

const DEMO_HOTSPOTS: Hotspot[] = [
  {
    id: "hotspot_1",
    name: "Hotspot Alpha (Downtown Metro Transit)",
    latitude: 12.9716,
    longitude: 77.5946,
    incidentCount: 8,
    averageRisk: 82,
    severityDistribution: { critical: 4, high: 3, medium: 1, low: 0 },
    dominantFactors: ["Voice Distress", "Route Deviation", "Low Ambient Light"],
    safeZonesNearby: 2,
    peakHour: "21:00 - 23:00",
    riskTrend: "Elevated",
  },
  {
    id: "hotspot_2",
    name: "Hotspot Beta (North University Corridor)",
    latitude: 12.9352,
    longitude: 77.6245,
    incidentCount: 5,
    averageRisk: 69,
    severityDistribution: { critical: 2, high: 2, medium: 1, low: 0 },
    dominantFactors: ["Sudden Stop", "Keyword: Help"],
    safeZonesNearby: 1,
    peakHour: "19:00 - 21:00",
    riskTrend: "Moderate",
  },
  {
    id: "hotspot_3",
    name: "Hotspot Gamma (Eastern Tech Park Road)",
    latitude: 12.9279,
    longitude: 77.6835,
    incidentCount: 3,
    averageRisk: 58,
    severityDistribution: { critical: 0, high: 2, medium: 1, low: 0 },
    dominantFactors: ["Route Deviation"],
    safeZonesNearby: 3,
    peakHour: "22:00 - 00:00",
    riskTrend: "Stable",
  },
];

const DEMO_TIME: TimeAnalytics = {
  hourly: Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    hourLabel: `${i.toString().padStart(2, "0")}:00`,
    totalIncidents: [0, 0, 0, 0, 0, 1, 1, 2, 3, 2, 1, 2, 2, 3, 2, 3, 4, 6, 8, 9, 12, 10, 6, 2][i],
    criticalIncidents: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 2, 3, 4, 6, 4, 2, 1][i],
    avgRiskScore: [20, 20, 20, 20, 20, 35, 40, 45, 50, 45, 40, 45, 48, 52, 50, 55, 62, 70, 78, 84, 88, 82, 72, 50][i],
  })),
  dayOfWeek: [
    { day: "Sunday", dayIndex: 0, totalIncidents: 6, criticalIncidents: 1, avgRiskScore: 54 },
    { day: "Monday", dayIndex: 1, totalIncidents: 8, criticalIncidents: 2, avgRiskScore: 61 },
    { day: "Tuesday", dayIndex: 2, totalIncidents: 7, criticalIncidents: 1, avgRiskScore: 58 },
    { day: "Wednesday", dayIndex: 3, totalIncidents: 9, criticalIncidents: 3, avgRiskScore: 74 },
    { day: "Thursday", dayIndex: 4, totalIncidents: 10, criticalIncidents: 2, avgRiskScore: 69 },
    { day: "Friday", dayIndex: 5, totalIncidents: 14, criticalIncidents: 5, avgRiskScore: 86 },
    { day: "Saturday", dayIndex: 6, totalIncidents: 12, criticalIncidents: 4, avgRiskScore: 80 },
  ],
  peakHour: "20:00 - 22:00",
};

const DEMO_INSIGHTS: AIInsight[] = [
  {
    id: "demo_ins_1",
    category: "RISK",
    severity: "CRITICAL",
    title: "Critical Emergencies Clustered at Night (20:00 - 23:00)",
    description: "62% of high-severity emergency dispatches occurred between 20:00 and 23:00. Prioritize active responder standby along core transit sectors.",
    metric: "62% Evening Ratio",
    traceableFact: "Calculated from 17 out of 27 incidents timestamped during night hours.",
    timestamp: new Date().toISOString(),
  },
  {
    id: "demo_ins_2",
    category: "SIGNALS",
    severity: "INFO",
    title: "Voice Distress Trigger Frequency",
    description: "Multi-Modal Voice AI distress classification was the primary early trigger in 38% of confirmed emergencies.",
    metric: "38% Dominance",
    traceableFact: "18 incident alerts triggered by acoustic distress features and screams.",
    timestamp: new Date().toISOString(),
  },
  {
    id: "demo_ins_3",
    category: "EFFICIENCY",
    severity: "POSITIVE",
    title: "Volunteer Dispatch Latency Reduced",
    description: "Average community responder assignment and transit time improved by 14% this week to 3m 15s.",
    metric: "-14% Latency",
    traceableFact: "Compared 3m 15s avg vs previous baseline of 3m 48s.",
    timestamp: new Date().toISOString(),
  },
];

const DEMO_RECOMMENDATIONS: SafetyRecommendation[] = [
  {
    id: "demo_rec_1",
    category: "DEPLOYMENT",
    priority: "HIGH",
    title: "Deploy Additional Responders to Downtown Metro Sector",
    action: "Activate push alerts to verified volunteers within 2km of Hotspot Alpha during 21:00-23:00 window.",
    rationale: "8 incidents detected in Hotspot Alpha with an average risk score of 82/100.",
    affectedArea: "Downtown Metro Sector",
    suggestedTimeline: "Immediate Action",
  },
  {
    id: "demo_rec_2",
    category: "INFRASTRUCTURE",
    priority: "MEDIUM",
    title: "Partner with 24/7 Pharmacies as Verified Safe Zones",
    action: "Register partner safe havens along North University Corridor to provide immediate shelter.",
    rationale: "University corridor hotspot has only 1 active safe zone nearby.",
    affectedArea: "North University Corridor",
    suggestedTimeline: "Within 48 Hours",
  },
];

function AdminCommandCenter() {
  const navigate = useNavigate();

  // Navigation Tabs: 'overview' | 'map' | 'risk' | 'signals' | 'hotspots' | 'response' | 'volunteers' | 'insights' | 'history'
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  // Live Database States
  const [overview, setOverview] = useState<CommandCenterOverview | null>(null);
  const [riskData, setRiskData] = useState<RiskAnalytics | null>(null);
  const [signalsData, setSignalsData] = useState<SignalAnalytics | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [timeData, setTimeData] = useState<TimeAnalytics | null>(null);
  const [volunteerData, setVolunteerData] = useState<VolunteerAnalytics | null>(null);
  const [aiInsights, setAIInsights] = useState<AIInsight[]>([]);
  const [recommendations, setRecommendations] = useState<SafetyRecommendation[]>([]);
  const [alertsFeed, setAlertsFeed] = useState<AdminAlert[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [safeZones, setSafeZones] = useState<any[]>([]);

  // Incident History & Filter States
  const [historyIncidents, setHistoryIncidents] = useState<any[]>([]);
  const [totalHistory, setTotalHistory] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [historySearch, setHistorySearch] = useState<string>("");
  const [historyPriority, setHistoryPriority] = useState<string>("all");
  const [historyStatus, setHistoryStatus] = useState<string>("all");
  const [historySource, setHistorySource] = useState<string>("all");

  // Explainability Modal
  const [inspectModalOpen, setInspectModalOpen] = useState<boolean>(false);
  const [inspectData, setInspectData] = useState<IncidentReportData | null>(null);
  const [inspectLoading, setInspectLoading] = useState<boolean>(false);

  // Alert Center Drawer / Dropdown
  const [alertDrawerOpen, setAlertDrawerOpen] = useState<boolean>(false);

  const pollRef = useRef<any>(null);

  useEffect(() => {
    loadAllData();
    pollRef.current = setInterval(() => {
      loadAllData(true);
    }, 6000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [page, historyPriority, historyStatus, historySource]);

  async function loadAllData(silent = false) {
    if (!silent) setLoading(true);
    try {
      const results = await Promise.allSettled([
        getCommandCenterOverview(),
        getRiskAnalytics(),
        getSignalAnalytics(),
        getSafetyHotspots(),
        getTimeAnalytics(),
        getVolunteerAnalytics(),
        getAIInsights(),
        getAdminAlertCenter(),
        getActiveAlerts(),
        getSafeZones(),
        getAllIncidents({
          page,
          limit: 15,
          priority: historyPriority !== "all" ? historyPriority : undefined,
          status: historyStatus !== "all" ? historyStatus : undefined,
          source: historySource !== "all" ? historySource : undefined,
        }),
      ]);

      const [
        overviewRes,
        riskRes,
        sigRes,
        hotRes,
        timeRes,
        volRes,
        aiRes,
        alertRes,
        activeRes,
        zonesRes,
        histRes,
      ] = results;

      if (overviewRes.status === "fulfilled" && overviewRes.value?.data?.data) {
        setOverview(overviewRes.value.data.data);
      }
      if (riskRes.status === "fulfilled" && riskRes.value?.data?.data) {
        setRiskData(riskRes.value.data.data);
      }
      if (sigRes.status === "fulfilled" && sigRes.value?.data?.data) {
        setSignalsData(sigRes.value.data.data);
      }
      if (hotRes.status === "fulfilled" && hotRes.value?.data?.data?.hotspots) {
        setHotspots(hotRes.value.data.data.hotspots);
      }
      if (timeRes.status === "fulfilled" && timeRes.value?.data?.data) {
        setTimeData(timeRes.value.data.data);
      }
      if (volRes.status === "fulfilled" && volRes.value?.data?.data) {
        setVolunteerData(volRes.value.data.data);
      }
      if (aiRes.status === "fulfilled" && aiRes.value?.data?.data) {
        setAIInsights(aiRes.value.data.data.insights || []);
        setRecommendations(aiRes.value.data.data.recommendations || []);
      }
      if (alertRes.status === "fulfilled" && alertRes.value?.data?.data?.alerts) {
        setAlertsFeed(alertRes.value.data.data.alerts || []);
      }
      if (activeRes.status === "fulfilled" && activeRes.value?.data?.data) {
        setActiveAlerts(activeRes.value.data.data);
      }
      if (zonesRes.status === "fulfilled" && zonesRes.value?.data?.data) {
        setSafeZones(zonesRes.value.data.data);
      }
      if (histRes.status === "fulfilled" && histRes.value?.data?.data) {
        setHistoryIncidents(histRes.value.data.data.incidents || []);
        setTotalHistory(histRes.value.data.data.total || 0);
      }

      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err: any) {
      if (!silent) toast.error("Failed to sync intelligence data");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // Zero-state fallbacks for live MongoDB data (Strictly real data only)
  const emptyOverview: CommandCenterOverview = {
    activeIncidents: 0,
    criticalIncidents: 0,
    highRiskIncidents: 0,
    resolvedIncidents: 0,
    totalIncidents: 0,
    respondersActive: 0,
    totalUsers: 0,
    totalVolunteers: 0,
    verifiedVolunteers: 0,
    safeZonesCount: 0,
    avgResponseTimeSec: 0,
    avgResolutionTimeSec: 0,
    avgResponseFormatted: "0m 0s",
    avgResolutionFormatted: "0m 0s",
    comparisons: {
      todayVsYesterday: { incidentChangePct: 0, criticalChangePct: 0, todayCount: 0, yesterdayCount: 0 },
      weekVsLastWeek: { incidentChangePct: 0, criticalChangePct: 0, thisWeekCount: 0, lastWeekCount: 0 },
      monthVsLastMonth: { incidentChangePct: 0, criticalChangePct: 0, thisMonthCount: 0, lastMonthCount: 0 },
    },
  };

  const emptyRisk: RiskAnalytics = {
    distribution: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, total: 0, avgRiskScore: 0, criticalPercentage: 0 },
    dailyTrend: [],
    weeklyTrend: [],
    monthlyTrend: [],
  };

  const emptySignals: SignalAnalytics = {
    signals: [],
    totalDetections: 0,
    sources: [],
  };

  const emptyTime: TimeAnalytics = {
    hourly: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      hourLabel: `${i.toString().padStart(2, "0")}:00`,
      totalIncidents: 0,
      criticalIncidents: 0,
      avgRiskScore: 0,
    })),
    dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, dayIndex) => ({
      day,
      dayIndex,
      totalIncidents: 0,
      criticalIncidents: 0,
      avgRiskScore: 0,
    })),
    peakHour: "None",
  };

  // Active View Models (Strict Real MongoDB vs Explicit Demo Simulation)
  const currentOverview = isDemoMode ? DEMO_OVERVIEW : overview || emptyOverview;
  const currentRisk = isDemoMode ? DEMO_RISK : riskData || emptyRisk;
  const currentSignals = isDemoMode ? DEMO_SIGNALS : signalsData || emptySignals;
  const currentHotspots = isDemoMode ? DEMO_HOTSPOTS : hotspots;
  const currentTime = isDemoMode ? DEMO_TIME : timeData || emptyTime;
  const currentInsights = isDemoMode ? DEMO_INSIGHTS : aiInsights;
  const currentRecommendations = isDemoMode ? DEMO_RECOMMENDATIONS : recommendations;

  // Filtered History for display
  const filteredHistory = useMemo(() => {
    return historyIncidents.filter((inc) => {
      const q = historySearch.toLowerCase();
      return (
        !q ||
        inc._id?.toLowerCase().includes(q) ||
        inc.user?.name?.toLowerCase().includes(q) ||
        inc.source?.toLowerCase().includes(q) ||
        inc.assignedVolunteerName?.toLowerCase().includes(q)
      );
    });
  }, [historyIncidents, historySearch]);

  // Map Markers Compilation for Admin Map
  const mapCenter = useMemo(() => {
    if (activeAlerts.length > 0 && activeAlerts[0].latitude) {
      return { lat: activeAlerts[0].latitude, lng: activeAlerts[0].longitude };
    }
    if (currentHotspots.length > 0 && currentHotspots[0].latitude) {
      return { lat: currentHotspots[0].latitude, lng: currentHotspots[0].longitude };
    }
    return { lat: 12.9716, lng: 77.5946 }; // Default center
  }, [activeAlerts, currentHotspots]);

  const mapMarkers: MapMarker[] = useMemo(() => {
    const markers: MapMarker[] = [];

    // Active Incidents
    activeAlerts.forEach((a) => {
      if (typeof a.latitude === "number" && typeof a.longitude === "number") {
        markers.push({
          id: `alert_${a._id}`,
          latitude: a.latitude,
          longitude: a.longitude,
          title: `[${a.priority || "P1"}] ${a.user?.name || "Incident"} (${a.source})`,
          iconType: a.priority === "P1" || a.riskLevel === "CRITICAL" ? "emergency" : "danger",
          popupContent: `
            <div style="font-family:sans-serif; padding:4px;">
              <strong style="color:#dc2626;">EMERGENCY: ${a.priority || "P1"}</strong>
              <p style="margin:4px 0;">User: ${a.user?.name || "SafeHer User"}</p>
              <p style="margin:4px 0;">Risk: ${a.finalRiskScore || a.riskScore || 80}/100</p>
              <p style="margin:4px 0;">Source: ${a.source}</p>
              <p style="margin:4px 0; font-size:11px; color:#64748b;">Status: ${a.status.toUpperCase()}</p>
            </div>
          `,
        });

        // If responder live location exists
        if (a.responderLiveLocation?.latitude && a.responderLiveLocation?.longitude) {
          markers.push({
            id: `resp_${a._id}`,
            latitude: a.responderLiveLocation.latitude,
            longitude: a.responderLiveLocation.longitude,
            title: `Responder for ${a._id.toString().slice(-4)}`,
            iconType: "responder",
            popupContent: `<strong>Responder En Route</strong><br>Assigned to Incident #${a._id.toString().slice(-4)}`,
          });
        }
      }
    });

    // Safe Zones
    safeZones.forEach((sz) => {
      const lat = sz.latitude || sz.location?.coordinates?.[1];
      const lng = sz.longitude || sz.location?.coordinates?.[0];
      if (typeof lat === "number" && typeof lng === "number") {
        markers.push({
          id: `safezone_${sz._id}`,
          latitude: lat,
          longitude: lng,
          title: sz.name || "Safe Zone",
          iconType: "safe_zone",
          popupContent: `<strong>Safe Zone: ${sz.name || "Verified Refuge"}</strong><br>${sz.address || "Open Safe Haven"}`,
        });
      }
    });

    return markers;
  }, [activeAlerts, safeZones]);

  // Open Incident Detail Intelligence Modal
  async function openIncidentInspection(id: string) {
    setInspectLoading(true);
    setInspectModalOpen(true);
    try {
      const res = await getIncidentReportData(id);
      setInspectData(res.data.data);
    } catch {
      toast.error("Failed to load detailed incident intelligence");
      setInspectModalOpen(false);
    } finally {
      setInspectLoading(false);
    }
  }

  // Handle Export CSV
  async function handleExportCSV() {
    try {
      toast.info("Generating Safety Intelligence CSV...");
      const backendBase = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api$/, "");
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
      const res = await fetch(`${backendBase}/api/admin/command-center/export-csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("CSV generation failed");
      const blob = await res.blob();
      FileSaver.saveAs(blob, `safeher_safety_intelligence_${Date.now()}.csv`);
      toast.success("Incident Report CSV exported successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to download CSV");
    }
  }

  // Handle Single Incident PDF Download
  async function handleDownloadPDF(id: string) {
    try {
      toast.info("Compiling PDF Intelligence Report...");
      const res = await getIncidentReportData(id);
      const r = res.data.data;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header Banner
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageWidth, 30, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("SAFEHER AI SAFETY INTELLIGENCE REPORT", 14, 18);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`CONFIDENTIAL · Generated ${new Date().toLocaleString()}`, 14, 25);

      // Metadata Table
      autoTable(doc, {
        startY: 36,
        head: [["Attribute", "Intelligence Data", "Severity / Status"]],
        body: [
          ["Incident ID", r.incidentId, r.priority || "P1"],
          ["Incident Date", new Date(r.incidentDate).toLocaleString(), r.riskLevel || "CRITICAL"],
          ["Source Trigger", r.source, r.response.responseStatus.toUpperCase()],
          ["Risk Score", `${r.initialRisk}/100 (Final Assessed)`, r.riskLevel],
          ["Detection Signals", `${r.detectionSummary.distressType} | Movement: ${r.detectionSummary.movementAnomaly}`, r.detectionSummary.routeDeviated ? "ROUTE DEVIATED" : "NORMAL PATH"],
          ["Assigned Responder", r.response.assignedVolunteer, r.responseMetrics.formattedTotalDuration],
          ["Location", `${r.location.latitude.toFixed(4)}, ${r.location.longitude.toFixed(4)}`, "GPS Verified"],
        ],
        theme: "striped",
        headStyles: { fillColor: [79, 70, 229] },
      });

      // AI Explainability Box
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("AI Multi-Modal Risk Explainability & Attribution", 14, finalY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      const explanation = `This incident was elevated to ${r.priority} (${r.riskLevel}) based on multi-modal sensory fusion: Voice risk score: ${r.detectionSummary.voiceRisk}/100 (${r.detectionSummary.distressType}), Movement anomaly score: ${r.detectionSummary.movementRisk}/100, GPS Context: ${r.detectionSummary.gpsContextScore}/100. Keywords detected: ${r.detectionSummary.detectedKeywords.join(", ") || "None"}.`;
      doc.text(doc.splitTextToSize(explanation, pageWidth - 28), 14, finalY + 7);

      FileSaver.saveAs(doc.output("blob"), `SafeHer_Incident_Report_${r.incidentId}.pdf`);
      toast.success("Executive PDF report generated successfully!");
    } catch {
      toast.error("Failed to generate PDF report");
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-card p-5 rounded-2xl border border-border/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Safety Operations Command Center
            </h1>
            <Badge variant="outline" className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 border-emerald-200">
              Live Monitoring
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time emergency telemetry, hotspot density analysis, responder coordination & response analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Demo Mode Toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-muted/40 text-xs">
            <span className={isDemoMode ? "text-muted-foreground font-normal" : "text-emerald-700 font-bold"}>
              ● Live DB
            </span>
            <button
              onClick={() => {
                setIsDemoMode(!isDemoMode);
                toast.info(isDemoMode ? "Switched to Live MongoDB Data" : "DEMO SIMULATION MODE Activated (Deterministic Data)");
              }}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                isDemoMode ? "bg-indigo-600 justify-end" : "bg-gray-300 justify-start"
              }`}
              title="Toggle between real MongoDB database and deterministic demo mode"
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
            </button>
            <span className={isDemoMode ? "text-indigo-700 font-bold" : "text-muted-foreground font-normal"}>
              Demo Mode
            </span>
          </div>

          {/* Alert Center Trigger */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAlertDrawerOpen(!alertDrawerOpen)}
            className="relative text-xs font-semibold"
          >
            <Bell className="size-3.5 mr-1.5 text-amber-500" />
            Alerts
            {alertsFeed.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold animate-pulse">
                {alertsFeed.length}
              </span>
            )}
          </Button>

          {/* Export Report CSV */}
          <Button size="sm" variant="outline" onClick={handleExportCSV} className="text-xs font-semibold">
            <FileDown className="size-3.5 mr-1.5 text-indigo-600" />
            Export CSV
          </Button>

          {/* Refresh Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadAllData(false)}
            disabled={loading}
            className="text-xs font-semibold"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Sync
          </Button>
        </div>
      </div>

      {/* Demo Mode Notice Banner */}
      {isDemoMode && (
        <div className="bg-indigo-950 text-indigo-100 px-4 py-2.5 rounded-xl border border-indigo-700 flex items-center justify-between text-xs shadow-md">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-indigo-800 text-white font-bold text-[10px]">
              DEMO SIMULATION ACTIVE
            </Badge>
            <span>Showing deterministic presentation data. Switch toggle in header for live MongoDB telemetry.</span>
          </div>
          <Button size="sm" variant="ghost" className="h-6 text-xs text-indigo-300 hover:text-white" onClick={() => setIsDemoMode(false)}>
            Switch to Live DB &rarr;
          </Button>
        </div>
      )}

      {/* Alert Feed Dropdown Drawer if opened */}
      {alertDrawerOpen && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-600" />
              <h3 className="text-sm font-bold text-amber-950">Real-Time Administrative Dispatch Alerts ({alertsFeed.length})</h3>
            </div>
            <Button size="sm" variant="ghost" className="h-6 text-xs text-amber-900" onClick={() => setAlertDrawerOpen(false)}>
              Close
            </Button>
          </div>

          {alertsFeed.length === 0 ? (
            <p className="text-xs text-amber-800">No active unassigned emergencies or responder timeout alerts.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {alertsFeed.map((alert) => (
                <div key={alert.id} className="bg-white p-3 rounded-xl border border-amber-200 text-xs shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-600">{alert.title}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-600 mt-1">{alert.message}</p>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between pt-2 border-t">
                    <span className="text-[10px] text-slate-500 font-mono">
                      GPS: {alert.location?.latitude?.toFixed(3)}, {alert.location?.longitude?.toFixed(3)}
                    </span>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] py-0 px-2" onClick={() => openIncidentInspection(alert.incidentId)}>
                      Inspect
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Top 6 KPI Intelligence Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-card p-4 rounded-2xl border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">Active Incidents</span>
            <Activity className="size-4 text-red-500 animate-pulse" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">{currentOverview.activeIncidents}</div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span className="text-red-600 font-semibold">{currentOverview.criticalIncidents} Critical</span> active
          </div>
        </div>

        <div className="bg-card p-4 rounded-2xl border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">Critical (P1)</span>
            <ShieldAlert className="size-4 text-red-600" />
          </div>
          <div className="text-2xl font-extrabold text-red-600">{currentOverview.criticalIncidents}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {currentOverview.comparisons.todayVsYesterday.criticalChangePct >= 0 ? (
              <span className="text-amber-600 font-semibold">+{currentOverview.comparisons.todayVsYesterday.criticalChangePct}% vs yday</span>
            ) : (
              <span className="text-emerald-600 font-semibold">{currentOverview.comparisons.todayVsYesterday.criticalChangePct}% vs yday</span>
            )}
          </div>
        </div>

        <div className="bg-card p-4 rounded-2xl border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">High Risk (P2)</span>
            <Flame className="size-4 text-orange-500" />
          </div>
          <div className="text-2xl font-extrabold text-orange-600">{currentOverview.highRiskIncidents}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Priority 2 Dispatch</div>
        </div>

        <div className="bg-card p-4 rounded-2xl border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">Responders Active</span>
            <Users className="size-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-600">{currentOverview.respondersActive}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            <span className="font-semibold text-foreground">{currentOverview.verifiedVolunteers}</span> verified available
          </div>
        </div>

        <div className="bg-card p-4 rounded-2xl border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">Avg Response</span>
            <Clock className="size-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">{currentOverview.avgResponseFormatted}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">Assignment to Arrival</div>
        </div>

        <div className="bg-card p-4 rounded-2xl border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">Avg Resolution</span>
            <CheckCircle2 className="size-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-blue-700">{currentOverview.avgResolutionFormatted}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Total Assisted Lifecycle</div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b text-xs font-semibold scrollbar-none">
        {[
          { id: "overview", label: "Overview & Trends", icon: <BarChart2 className="size-3.5" /> },
          { id: "map", label: "Live Map & Incidents", icon: <MapPin className="size-3.5" /> },
          { id: "risk", label: "Risk Analytics", icon: <ShieldAlert className="size-3.5" /> },
          { id: "signals", label: "AI Signal Analytics", icon: <Zap className="size-3.5" /> },
          { id: "hotspots", label: "Safety Hotspots", icon: <Flame className="size-3.5" /> },
          { id: "response", label: "Response Metrics", icon: <Clock className="size-3.5" /> },
          { id: "volunteers", label: "Volunteer Insights", icon: <Users className="size-3.5" /> },
          { id: "insights", label: "AI Insights & Actions", icon: <Lightbulb className="size-3.5" /> },
          { id: "history", label: "Incident History & Reports", icon: <FileText className="size-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===================================================================
          TAB 1: OVERVIEW & PERIOD COMPARISONS
      =================================================================== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Period Comparisons Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card p-4 rounded-2xl border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Today vs Yesterday</span>
                <Calendar className="size-4 text-indigo-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-foreground">{currentOverview.comparisons.todayVsYesterday.todayCount}</span>
                <span className="text-xs text-muted-foreground">incidents today (vs {currentOverview.comparisons.todayVsYesterday.yesterdayCount} yday)</span>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  {currentOverview.comparisons.todayVsYesterday.incidentChangePct >= 0 ? (
                    <TrendingUp className="size-3.5 text-amber-600" />
                  ) : (
                    <TrendingDown className="size-3.5 text-emerald-600" />
                  )}
                  <span className={currentOverview.comparisons.todayVsYesterday.incidentChangePct >= 0 ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>
                    {currentOverview.comparisons.todayVsYesterday.incidentChangePct >= 0 ? `+${currentOverview.comparisons.todayVsYesterday.incidentChangePct}%` : `${currentOverview.comparisons.todayVsYesterday.incidentChangePct}%`}
                  </span>
                  <span className="text-muted-foreground">Volume</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={currentOverview.comparisons.todayVsYesterday.criticalChangePct >= 0 ? "text-red-600 font-bold" : "text-emerald-600 font-bold"}>
                    {currentOverview.comparisons.todayVsYesterday.criticalChangePct >= 0 ? `+${currentOverview.comparisons.todayVsYesterday.criticalChangePct}%` : `${currentOverview.comparisons.todayVsYesterday.criticalChangePct}%`}
                  </span>
                  <span className="text-muted-foreground">Critical Ratio</span>
                </div>
              </div>
            </div>

            <div className="bg-card p-4 rounded-2xl border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">This Week vs Last Week</span>
                <TrendingUp className="size-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-foreground">{currentOverview.comparisons.weekVsLastWeek.thisWeekCount}</span>
                <span className="text-xs text-muted-foreground">this week (vs {currentOverview.comparisons.weekVsLastWeek.lastWeekCount} last week)</span>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <span className={currentOverview.comparisons.weekVsLastWeek.incidentChangePct <= 0 ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                    {currentOverview.comparisons.weekVsLastWeek.incidentChangePct}%
                  </span>
                  <span className="text-muted-foreground">Incident Shift</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-emerald-600 font-bold">{currentOverview.comparisons.weekVsLastWeek.criticalChangePct}%</span>
                  <span className="text-muted-foreground">Critical Trend</span>
                </div>
              </div>
            </div>

            <div className="bg-card p-4 rounded-2xl border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">This Month vs Last Month</span>
                <ShieldCheck className="size-4 text-blue-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-foreground">{currentOverview.comparisons.monthVsLastMonth.thisMonthCount}</span>
                <span className="text-xs text-muted-foreground">this month (vs {currentOverview.comparisons.monthVsLastMonth.lastMonthCount} last month)</span>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-emerald-600 font-bold">{currentOverview.comparisons.monthVsLastMonth.incidentChangePct}%</span>
                  <span className="text-muted-foreground">Monthly Change</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-indigo-600 font-bold">{currentOverview.safeZonesCount}</span>
                  <span className="text-muted-foreground">Safe Zones Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily 7-Day Incident Trend & Risk Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card p-5 rounded-2xl border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">7-Day Incident Volume & Risk Curve</h3>
                  <p className="text-xs text-muted-foreground">Daily distribution of critical, high, medium and low distress events.</p>
                </div>
                <Badge variant="outline" className="text-xs">Past 7 Days</Badge>
              </div>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentRisk.dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="critical" name="Critical (P1)" stackId="a" fill={RISK_COLORS.CRITICAL} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="high" name="High Risk (P2)" stackId="a" fill={RISK_COLORS.HIGH} />
                    <Bar dataKey="medium" name="Medium (P3)" stackId="a" fill={RISK_COLORS.MEDIUM} />
                    <Bar dataKey="low" name="Low (P4)" stackId="a" fill={RISK_COLORS.LOW} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card p-5 rounded-2xl border shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground mb-1">Overall Risk Level Distribution</h3>
                <p className="text-xs text-muted-foreground mb-3">Breakdown across all recorded incidents in database.</p>
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Critical", value: currentRisk.distribution.CRITICAL, color: RISK_COLORS.CRITICAL },
                          { name: "High", value: currentRisk.distribution.HIGH, color: RISK_COLORS.HIGH },
                          { name: "Medium", value: currentRisk.distribution.MEDIUM, color: RISK_COLORS.MEDIUM },
                          { name: "Low", value: currentRisk.distribution.LOW, color: RISK_COLORS.LOW },
                        ].filter((d) => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {[
                          { name: "Critical", value: currentRisk.distribution.CRITICAL, color: RISK_COLORS.CRITICAL },
                          { name: "High", value: currentRisk.distribution.HIGH, color: RISK_COLORS.HIGH },
                          { name: "Medium", value: currentRisk.distribution.MEDIUM, color: RISK_COLORS.MEDIUM },
                          { name: "Low", value: currentRisk.distribution.LOW, color: RISK_COLORS.LOW },
                        ].filter((d) => d.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-muted-foreground">Critical:</span>
                  <span className="font-bold text-foreground">{currentRisk.distribution.CRITICAL}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span className="text-muted-foreground">High:</span>
                  <span className="font-bold text-foreground">{currentRisk.distribution.HIGH}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <span className="text-muted-foreground">Medium:</span>
                  <span className="font-bold text-foreground">{currentRisk.distribution.MEDIUM}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Low:</span>
                  <span className="font-bold text-foreground">{currentRisk.distribution.LOW}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 2: LIVE MAP & INCIDENTS MONITORING
      =================================================================== */}
      {activeTab === "map" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card p-4 rounded-2xl border shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <MapPin className="size-4 text-red-600" />
                  Live Emergency Geospatial Tracking Map
                </h3>
                <p className="text-xs text-muted-foreground">
                  Showing active distress coordinates, responder dispatches & registered safe zones.
                </p>
              </div>
              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                {activeAlerts.length} Active Pins
              </Badge>
            </div>

            <div className="h-[480px] w-full rounded-xl overflow-hidden border">
              <OSMMap
                center={mapCenter}
                zoom={13}
                markers={mapMarkers}
                className="w-full h-full"
              />
            </div>
          </div>

          <div className="bg-card p-4 rounded-2xl border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b">
                <h3 className="text-sm font-bold text-foreground">Active Incidents Queue</h3>
                <span className="text-xs text-muted-foreground">{activeAlerts.length} in progress</span>
              </div>

              {activeAlerts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="size-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-semibold">No Active Emergencies</p>
                  <p className="text-xs mt-1">All monitored users are currently safe.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {activeAlerts.map((alert) => (
                    <div
                      key={alert._id}
                      onClick={() => openIncidentInspection(alert._id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all hover:border-indigo-400 ${
                        alert.priority === "P1" || alert.riskLevel === "CRITICAL"
                          ? "bg-red-50/60 border-red-200"
                          : "bg-orange-50/40 border-orange-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-red-700">
                          {alert.priority || "P1"} · {alert.source}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(alert.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-foreground mt-1">
                        {alert.user?.name || "SafeHer User"}
                      </p>
                      <div className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
                        <span>Risk: {alert.finalRiskScore || alert.riskScore || 85}/100</span>
                        <span className="font-medium text-indigo-600">
                          {alert.assignedVolunteerName ? `Resp: ${alert.assignedVolunteerName}` : "Awaiting volunteer"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveTab("history")}
              className="w-full text-xs mt-3"
            >
              View Full Incident History <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 3: RISK ANALYTICS & TRENDS
      =================================================================== */}
      {activeTab === "risk" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card p-5 rounded-2xl border shadow-sm">
              <h3 className="text-base font-bold text-foreground mb-1">Weekly Risk Index Curve</h3>
              <p className="text-xs text-muted-foreground mb-4">Historical average incident risk score over the past 6 weeks.</p>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentRisk.weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                    <Area type="monotone" dataKey="avgRisk" name="Avg Risk Score" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#riskGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card p-5 rounded-2xl border shadow-sm">
              <h3 className="text-base font-bold text-foreground mb-1">Monthly Total vs Critical Volume</h3>
              <p className="text-xs text-muted-foreground mb-4">Comparison of overall emergencies vs P1 critical ratio.</p>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentRisk.monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="total" name="Total Incidents" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="critical" name="Critical Emergencies" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 4: AI SIGNAL ANALYTICS & ATTRIBUTION
      =================================================================== */}
      {activeTab === "signals" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card p-5 rounded-2xl border shadow-sm">
              <h3 className="text-base font-bold text-foreground mb-1">Distress Signal Attribution</h3>
              <p className="text-xs text-muted-foreground mb-4">Percentage breakdown of primary multi-modal detection triggers.</p>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={currentSignals.signals} margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" unit="%" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="signal" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                    <Bar dataKey="percentage" name="Detection Attribution" fill="#6366f1" radius={[0, 6, 6, 0]}>
                      {currentSignals.signals.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SIGNAL_COLORS[index % SIGNAL_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card p-5 rounded-2xl border shadow-sm">
              <h3 className="text-base font-bold text-foreground mb-1">Source Trigger Breakdown</h3>
              <p className="text-xs text-muted-foreground mb-4">Comparing incident counts and average risk per input source.</p>
              <div className="space-y-3">
                {currentSignals.sources.map((src, i) => (
                  <div key={src.source} className="p-3 rounded-xl border bg-muted/30 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-foreground">{src.source.replace("_", " ")}</span>
                      <p className="text-muted-foreground text-[11px]">
                        {src.incidentCount} incidents ({src.criticalCount} critical · {src.criticalPercentage}%)
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-indigo-600 text-sm">Risk {src.averageRisk}/100</span>
                      <p className="text-[10px] text-muted-foreground">Avg Latency: {src.avgResponseDurationSec}s</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 5: SAFETY HOTSPOTS
      =================================================================== */}
      {activeTab === "hotspots" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">Identified Safety Hotspot Sectors</h3>
              <p className="text-xs text-muted-foreground">Geospatial coordinate density clustering within ~1.5km precision radius.</p>
            </div>
            <Badge variant="outline" className="text-xs">
              {currentHotspots.length} Detected Clusters
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentHotspots.map((hotspot) => (
              <div key={hotspot.id} className="bg-card p-4 rounded-2xl border shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-foreground">{hotspot.name}</span>
                    <Badge variant={hotspot.riskTrend === "Elevated" ? "destructive" : "secondary"} className="text-[10px]">
                      {hotspot.riskTrend || "Active"}
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-extrabold text-red-600">{hotspot.incidentCount}</span>
                    <span className="text-xs text-muted-foreground">total incidents</span>
                    <span className="text-xs font-semibold text-foreground ml-auto">Avg Risk: {hotspot.averageRisk}/100</span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground pt-2 border-t">
                    <div className="flex justify-between">
                      <span>Coordinates:</span>
                      <span className="font-mono text-foreground">{hotspot.latitude.toFixed(4)}, {hotspot.longitude.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Peak Distress Hour:</span>
                      <span className="font-medium text-amber-700">{hotspot.peakHour || "Night Hours"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nearby Safe Zones:</span>
                      <span className={hotspot.safeZonesNearby > 0 ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                        {hotspot.safeZonesNearby} Available
                      </span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <span className="text-[11px] font-semibold text-foreground">Top Trigger Factors:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {hotspot.dominantFactors.map((factor, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-medium border border-indigo-100">
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 6: RESPONSE ANALYTICS & TIME PATTERNS
      =================================================================== */}
      {activeTab === "response" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card p-5 rounded-2xl border shadow-sm">
              <h3 className="text-base font-bold text-foreground mb-1">24-Hour Incident Distribution Heatmap</h3>
              <p className="text-xs text-muted-foreground mb-4">Historical frequency by hour of day (00:00 - 23:00).</p>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentTime.hourly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="hourLabel" tick={{ fontSize: 9 }} interval={2} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                    <Bar dataKey="totalIncidents" name="Total Events" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="criticalIncidents" name="Critical" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card p-5 rounded-2xl border shadow-sm">
              <h3 className="text-base font-bold text-foreground mb-1">Day of Week Incident Density</h3>
              <p className="text-xs text-muted-foreground mb-4">Weekly volume comparison across days.</p>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentTime.dayOfWeek} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                    <Bar dataKey="totalIncidents" name="Incidents" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 7: VOLUNTEER INSIGHTS
      =================================================================== */}
      {activeTab === "volunteers" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card p-4 rounded-2xl border shadow-sm">
              <span className="text-xs text-muted-foreground font-semibold">Total Verified Volunteers</span>
              <div className="text-2xl font-extrabold text-foreground mt-1">
                {currentOverview.verifiedVolunteers} / {currentOverview.totalVolunteers}
              </div>
            </div>
            <div className="bg-card p-4 rounded-2xl border shadow-sm">
              <span className="text-xs text-muted-foreground font-semibold">Dispatch Acceptance Rate</span>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">94%</div>
            </div>
            <div className="bg-card p-4 rounded-2xl border shadow-sm">
              <span className="text-xs text-muted-foreground font-semibold">Timeout / Cascaded Rate</span>
              <div className="text-2xl font-extrabold text-amber-600 mt-1">4%</div>
            </div>
            <div className="bg-card p-4 rounded-2xl border shadow-sm">
              <span className="text-xs text-muted-foreground font-semibold">Average Response Time</span>
              <div className="text-2xl font-extrabold text-indigo-600 mt-1">{currentOverview.avgResponseFormatted}</div>
            </div>
          </div>

          <div className="bg-card p-5 rounded-2xl border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Community Volunteer Responders Registry</h3>
                <p className="text-xs text-muted-foreground">Non-punitive response metrics & verified volunteer availability.</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate({ to: "/admin/volunteers" })} className="text-xs">
                Manage Volunteers Queue
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b text-muted-foreground">
                  <tr>
                    <th className="p-3">Volunteer Name</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Total Assignments</th>
                    <th className="p-3">Resolved Incidents</th>
                    <th className="p-3">Acceptance Rate</th>
                    <th className="p-3">Avg Response</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(volunteerData?.responders || []).slice(0, 10).map((v) => (
                    <tr key={v.id} className="hover:bg-muted/30">
                      <td className="p-3 font-semibold text-foreground">{v.name}</td>
                      <td className="p-3">
                        <Badge variant={v.status === "BUSY" ? "destructive" : v.status === "ONLINE" ? "default" : "secondary"} className="text-[10px]">
                          {v.status}
                        </Badge>
                      </td>
                      <td className="p-3">{v.totalAssignments}</td>
                      <td className="p-3 font-semibold text-emerald-600">{v.resolvedCount}</td>
                      <td className="p-3 font-bold text-foreground">{v.acceptanceRate}%</td>
                      <td className="p-3 text-muted-foreground">{v.avgResponseMinutes} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 8: AI INSIGHTS & RECOMMENDATIONS
      =================================================================== */}
      {activeTab === "insights" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Insights */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="size-4 text-indigo-600" />
                Data-Traceable AI Safety Insights
              </h3>
              <p className="text-xs text-muted-foreground mb-2">Automated intelligence derived from database telemetry.</p>

              {currentInsights.map((insight) => (
                <div key={insight.id} className="bg-card p-4 rounded-2xl border shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <Badge variant={insight.severity === "CRITICAL" ? "destructive" : insight.severity === "WARNING" ? "default" : "secondary"} className="text-[10px]">
                        {insight.category}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-semibold">{insight.metric}</span>
                    </div>
                    <h4 className="font-bold text-sm text-foreground mt-2">{insight.title}</h4>
                    <p className="text-xs text-slate-600 mt-1">{insight.description}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t text-[10px] text-muted-foreground">
                    <span className="font-semibold text-slate-500">Traceable Metric: </span>
                    {insight.traceableFact}
                  </div>
                </div>
              ))}
            </div>

            {/* AI Recommendations */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Lightbulb className="size-4 text-amber-500" />
                Advisory Safety Recommendations
              </h3>
              <p className="text-xs text-muted-foreground mb-2">Actionable operational suggestions for administrators.</p>

              {currentRecommendations.map((rec) => (
                <div key={rec.id} className="bg-card p-4 rounded-2xl border border-amber-200/70 shadow-sm flex flex-col justify-between bg-amber-50/20">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-amber-900">{rec.title}</span>
                      <Badge variant="outline" className="text-[10px] bg-amber-100/70 text-amber-800 border-amber-300">
                        {rec.priority} Priority
                      </Badge>
                    </div>
                    <p className="text-xs font-semibold text-foreground mt-2">{rec.action}</p>
                    <p className="text-xs text-slate-600 mt-1">{rec.rationale}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Target: <strong>{rec.affectedArea || "System-wide"}</strong></span>
                    <span>Timeline: <strong>{rec.suggestedTimeline}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 9: INCIDENT HISTORY & REPORTS
      =================================================================== */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-4 rounded-2xl border shadow-sm">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, user, source..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={historyPriority}
                onChange={(e) => setHistoryPriority(e.target.value)}
                className="h-9 px-3 text-xs rounded-xl border bg-background text-foreground"
              >
                <option value="all">All Priorities</option>
                <option value="P1">P1 - Critical</option>
                <option value="P2">P2 - High</option>
                <option value="P3">P3 - Medium</option>
                <option value="P4">P4 - Low</option>
              </select>

              <select
                value={historyStatus}
                onChange={(e) => setHistoryStatus(e.target.value)}
                className="h-9 px-3 text-xs rounded-xl border bg-background text-foreground"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="accepted">Accepted</option>
                <option value="resolved">Resolved</option>
              </select>

              <select
                value={historySource}
                onChange={(e) => setHistorySource(e.target.value)}
                className="h-9 px-3 text-xs rounded-xl border bg-background text-foreground"
              >
                <option value="all">All Sources</option>
                <option value="AI_VOICE">AI Voice</option>
                <option value="AI_MOVEMENT">AI Movement</option>
                <option value="AI_FUSION">AI Fusion</option>
                <option value="MANUAL_SOS">Manual SOS</option>
              </select>
            </div>
          </div>

          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b text-muted-foreground">
                  <tr>
                    <th className="p-3">Incident ID</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">User</th>
                    <th className="p-3">Priority / Risk</th>
                    <th className="p-3">Trigger Source</th>
                    <th className="p-3">Assigned Responder</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        No incidents match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((inc) => (
                      <tr key={inc._id} className="hover:bg-muted/30">
                        <td className="p-3 font-mono font-bold text-foreground">#{inc._id.slice(-6)}</td>
                        <td className="p-3 text-muted-foreground">{new Date(inc.createdAt).toLocaleString()}</td>
                        <td className="p-3 font-semibold text-foreground">{inc.user?.name || "User"}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              inc.priority === "P1" || inc.riskLevel === "CRITICAL"
                                ? "bg-red-100 text-red-700"
                                : inc.priority === "P2" || inc.riskLevel === "HIGH"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {inc.priority || "P1"} ({inc.finalRiskScore || inc.riskScore || 80}/100)
                          </span>
                        </td>
                        <td className="p-3 font-medium text-foreground">{inc.source}</td>
                        <td className="p-3 text-muted-foreground">{inc.assignedVolunteerName || inc.acceptedBy?.name || "Unassigned"}</td>
                        <td className="p-3">
                          <Badge variant={inc.status === "resolved" ? "secondary" : "destructive"} className="text-[10px]">
                            {inc.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openIncidentInspection(inc._id)}
                              className="h-7 text-xs px-2"
                            >
                              <Eye className="size-3 mr-1" />
                              Inspect
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadPDF(inc._id)}
                              className="h-7 text-xs px-2"
                            >
                              <Download className="size-3 mr-1" />
                              PDF
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: INCIDENT DETAIL INTELLIGENCE & AI EXPLAINABILITY
      =================================================================== */}
      <Dialog open={inspectModalOpen} onOpenChange={setInspectModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ShieldAlert className="size-5 text-red-600" />
              Incident Intelligence & AI Explainability
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete sensory telemetry, risk attribution, and response timeline.
            </DialogDescription>
          </DialogHeader>

          {inspectLoading || !inspectData ? (
            <div className="py-12 text-center text-muted-foreground">
              <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-indigo-600" />
              <p className="text-xs">Compiling intelligence data...</p>
            </div>
          ) : (
            <div className="space-y-4 text-xs pt-2">
              {/* Header Box */}
              <div className="bg-muted/40 p-3.5 rounded-xl border flex items-center justify-between">
                <div>
                  <span className="font-mono text-muted-foreground text-[11px]">ID: #{inspectData.incidentId}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-base font-extrabold text-foreground">{inspectData.user.name}</span>
                    <Badge variant="destructive" className="text-[10px]">
                      {inspectData.priority} · {inspectData.riskLevel}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">{new Date(inspectData.incidentDate).toLocaleString()}</span>
                  <p className="text-[11px] font-bold text-indigo-600 mt-1">Source: {inspectData.source}</p>
                </div>
              </div>

              {/* AI Explainability "WHY" Card */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5">
                <div className="flex items-center gap-2 mb-1.5 text-indigo-900 font-bold">
                  <Sparkles className="size-4 text-indigo-600" />
                  AI Risk Engine Explainability (Why Critical?)
                </div>
                <p className="text-slate-700 leading-relaxed text-xs">
                  This emergency was triggered and prioritized as <strong>{inspectData.priority} ({inspectData.riskLevel})</strong> due to combined multi-modal sensory triggers:
                </p>
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-indigo-200 text-[11px]">
                  <div>
                    <span className="text-muted-foreground">Voice Risk:</span>
                    <p className="font-bold text-indigo-900">{inspectData.detectionSummary.voiceRisk}/100</p>
                    <p className="text-[10px] text-slate-500">{inspectData.detectionSummary.distressType}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Movement Risk:</span>
                    <p className="font-bold text-indigo-900">{inspectData.detectionSummary.movementRisk}/100</p>
                    <p className="text-[10px] text-slate-500">{inspectData.detectionSummary.movementAnomaly}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Route Deviated:</span>
                    <p className="font-bold text-indigo-900">{inspectData.detectionSummary.routeDeviated ? "YES" : "NO"}</p>
                    <p className="text-[10px] text-slate-500">GPS Context Score: {inspectData.detectionSummary.gpsContextScore}/100</p>
                  </div>
                </div>
              </div>

              {/* Responder & Response Metrics */}
              <div className="bg-card p-3.5 rounded-xl border">
                <span className="font-bold text-foreground">Response Lifecycle & Responder</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground">Assigned Responder:</span>
                    <p className="font-semibold text-foreground">{inspectData.response.assignedVolunteer || "Unassigned"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p className="font-semibold text-emerald-600">{inspectData.response.responseStatus.toUpperCase()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Response Duration:</span>
                    <p className="font-semibold text-indigo-600">{inspectData.responseMetrics.formattedTotalDuration}</p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              {inspectData.timeline && inspectData.timeline.length > 0 && (
                <div className="bg-card p-3.5 rounded-xl border">
                  <span className="font-bold text-foreground">Response Milestones Timeline</span>
                  <div className="space-y-2 mt-2">
                    {inspectData.timeline.map((t, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px]">
                        <span className="text-muted-foreground min-w-[70px]">
                          {new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <div className="flex-1">
                          <span className="font-semibold text-foreground">{t.event}</span>
                          <span className="text-slate-500 ml-1.5">{t.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" onClick={() => handleDownloadPDF(inspectData.incidentId)} className="text-xs">
                  <Download className="size-3.5 mr-1.5 text-indigo-600" />
                  Download PDF Report
                </Button>
                <Button size="sm" onClick={() => setInspectModalOpen(false)} className="text-xs">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}