import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  FileDown,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Radio,
  FileText,
  Calendar,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Video as VideoIcon,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { useEffect, useState, useMemo } from "react";
import {
  getReports,
  getAllIncidents,
  getIncidentReportData,
  IncidentReportData,
} from "@/services/adminService";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import FileSaver from "file-saver";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/reports")({ component: Reports });

function Reports() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVolunteers: 0,
    activeAlerts: 0,
    resolvedAlerts: 0,
  });

  const [incidents, setIncidents] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filter states
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Report Modal state
  const [inspectData, setInspectData] = useState<IncidentReportData | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  useEffect(() => {
    loadStats();
    loadIncidents();
  }, [priorityFilter, statusFilter, sourceFilter, startDate, endDate]);

  async function loadStats() {
    try {
      const response = await getReports();
      setStats(response.data.data);
    } catch {
      // Non-blocking
    }
  }

  async function loadIncidents() {
    setLoading(true);
    try {
      const res = await getAllIncidents({
        priority: priorityFilter !== "all" ? priorityFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        source: sourceFilter !== "all" ? sourceFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 100,
      });

      setIncidents(res.data?.data?.incidents || []);
      setTotalCount(res.data?.data?.total || 0);
    } catch (err) {
      toast.error("Failed to load incidents list");
    } finally {
      setLoading(false);
    }
  }

  const filteredIncidents = useMemo(() => {
    return incidents.filter((a) => {
      const q = search.toLowerCase();
      return (
        a._id.toLowerCase().includes(q) ||
        a.user?.name?.toLowerCase().includes(q) ||
        a.assignedVolunteerName?.toLowerCase().includes(q) ||
        a.source?.toLowerCase().includes(q)
      );
    });
  }, [incidents, search]);

  /* ===================================================================
     Evidence Media Downloader
  =================================================================== */
  async function downloadEvidenceMedia(relativeUrl: string, filename: string) {
    try {
      toast.info(`Preparing ${filename} download...`);
      const backendBase = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api$/, "");
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
      const streamUrl = `${backendBase}${relativeUrl}?token=${encodeURIComponent(token)}`;
      const res = await fetch(streamUrl);
      if (!res.ok) throw new Error("Failed to fetch recording stream");
      const blob = await res.blob();
      FileSaver.saveAs(blob, filename);
      toast.success(`Evidence file ${filename} downloaded successfully!`);
    } catch (err: any) {
      toast.error("Download failed: " + (err.message || "Network Error"));
    }
  }

  /* ===================================================================
     Single Incident Detailed PDF Export
  =================================================================== */
  async function downloadSingleIncidentPDF(id: string) {
    try {
      toast.info("Generating Comprehensive Incident Report...");
      const res = await getIncidentReportData(id);
      const r = res.data.data;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header Banner
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageWidth, 32, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("SAFEHER EMERGENCY INCIDENT REPORT", 14, 18);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Official Emergency Operations Record · ID #${r.incidentId}`, 14, 26);

      // Section 1: Overview
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("1. Incident Overview & Telemetry", 14, 42);

      autoTable(doc, {
        startY: 46,
        theme: "striped",
        head: [["Attribute", "Value", "Attribute", "Value"]],
        body: [
          ["Incident ID", `#${r.incidentId.slice(-8)}`, "Timestamp", new Date(r.incidentDate).toLocaleString()],
          ["Priority Level", `${r.priority} (${r.priorityScore}/100)`, "Risk Level", `${r.riskLevel} (${r.initialRisk}/100)`],
          ["Incident Source", r.source, "Current State", r.response?.responseStatus || "RESOLVED"],
          ["Target Coordinates", `${r.location?.latitude != null ? Number(r.location.latitude).toFixed(4) : "N/A"}, ${r.location?.longitude != null ? Number(r.location.longitude).toFixed(4) : "N/A"}`, "Victim Identifier", r.user?.name || "Anonymous"],
        ],
        headStyles: { fillColor: [30, 41, 59], fontSize: 9 },
        bodyStyles: { fontSize: 8.5 },
      });

      // Section 2: Sensor & Threat Vectors
      const nextY1 = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("2. AI Threat Analysis & Sensor Vectors", 14, nextY1);

      autoTable(doc, {
        startY: nextY1 + 4,
        theme: "grid",
        head: [["Sensor Domain", "Computed Risk", "Diagnostics & Signals"]],
        body: [
          ["Voice Acoustic Analysis", `${r.detectionSummary.voiceRisk}/100`, `Distress Type: ${r.detectionSummary.distressType} | Keywords: ${r.detectionSummary.detectedKeywords?.join(", ") || "None"}`],
          ["Movement Kinematics", `${r.detectionSummary.movementRisk}/100`, `Anomaly: ${r.detectionSummary.movementAnomaly} | Route Deviated: ${r.detectionSummary.routeDeviated ? "Yes" : "No"}`],
          ["GPS Context Score", `${r.detectionSummary.gpsContextScore}/100`, "Spatial safety corridor & temporal risk evaluation"],
        ],
        headStyles: { fillColor: [51, 65, 85], fontSize: 9 },
        bodyStyles: { fontSize: 8.5 },
      });

      // Section 3: Response Milestones & Delay Metrics
      const nextY2 = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("3. Responder Dispatch & Response Milestones", 14, nextY2);

      autoTable(doc, {
        startY: nextY2 + 4,
        theme: "grid",
        head: [["Milestone", "Timestamp", "Metric", "Elapsed Duration"]],
        body: [
          ["Incident Created", new Date(r.incidentDate).toLocaleTimeString(), "Assignment Delay", `${r.responseMetrics.assignmentDelaySec}s`],
          ["Assigned to Responder", r.response.assignedAt ? new Date(r.response.assignedAt).toLocaleTimeString() : "N/A", "Acceptance Delay", `${r.responseMetrics.acceptanceDelaySec}s`],
          ["Responder Accepted", r.response.acceptedAt ? new Date(r.response.acceptedAt).toLocaleTimeString() : "N/A", "Transit Duration", `${r.responseMetrics.transitDurationSec}s`],
          ["Arrived on Scene", r.response.arrivedAt ? new Date(r.response.arrivedAt).toLocaleTimeString() : "N/A", "Total Resolution Time", r.responseMetrics.formattedTotalDuration],
          ["Resolved", r.response.resolvedAt ? new Date(r.response.resolvedAt).toLocaleTimeString() : "N/A", "Assigned Volunteer", r.response.assignedVolunteer],
        ],
        headStyles: { fillColor: [79, 70, 229], fontSize: 9 },
        bodyStyles: { fontSize: 8.5 },
      });

      // Section 4: Incident Timeline Events
      let nextY3 = (doc as any).lastAutoTable.finalY + 10;
      if (nextY3 > pageHeight - 60) {
        doc.addPage();
        nextY3 = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("4. Incident Event Timeline", 14, nextY3);

      const timelineRows = r.timeline.map((t: any) => [
        new Date(t.timestamp).toLocaleTimeString(),
        t.event.replace(/_/g, " "),
        t.actor || "System",
        t.description,
      ]);

      autoTable(doc, {
        startY: nextY3 + 4,
        theme: "striped",
        head: [["Time", "Event", "Actor", "Description"]],
        body: timelineRows.length > 0 ? timelineRows : [["N/A", "INITIALIZED", "System", "Incident recorded"]],
        headStyles: { fillColor: [51, 65, 85], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
      });

      // Section 5: AI Post-Incident Summary & Evidence Retention
      let nextY4 = (doc as any).lastAutoTable.finalY + 10;
      if (nextY4 > pageHeight - 50) {
        doc.addPage();
        nextY4 = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("5. AI Structured Incident Summary & Evidence Record", 14, nextY4);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`• Primary Factors: ${r.aiSummary.mainFactors?.join(" · ") || "Standard emergency trigger"}`, 16, nextY4 + 8);
      doc.text(`• Assigned Responder: ${r.aiSummary.responderName || "Volunteer"}`, 16, nextY4 + 14);
      doc.text(`• Total Active Response Duration: ${r.responseMetrics.formattedTotalDuration}`, 16, nextY4 + 20);
      doc.text(`• Video Evidence Archive: ${r.evidence?.hasVideo ? `Captured (${r.evidence.videoDuration || 0}s) · Tamper-evident secure storage` : "None"}`, 16, nextY4 + 26);
      doc.text(`• Audio Evidence Archive: ${r.evidence?.hasAudio ? `Captured (${r.evidence.audioDuration || 0}s) · Tamper-evident secure storage` : "None"}`, 16, nextY4 + 32);

      // Footer
      const footerY = pageHeight - 12;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`SafeHer Security Operations © 2026 · Confidential Emergency Record · Generated ${new Date().toLocaleString()}`, pageWidth / 2, footerY, { align: "center" });

      doc.save(`SafeHer_Incident_${r.incidentId.slice(-6)}.pdf`);
      toast.success("Incident PDF Report Downloaded!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to generate report");
    }
  }

  /* ===================================================================
     Bulk Reports PDF / CSV / JSON
  =================================================================== */
  function exportBulkPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Banner
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageWidth, 30, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("SafeHer Emergency Incidents Master Report", 14, 16);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleString()} · Filtered Records: ${filteredIncidents.length}`, 14, 24);

    const rows = filteredIncidents.map((a) => [
      `#${a._id.slice(-6)}`,
      new Date(a.createdAt).toLocaleDateString(),
      a.priority || "P1",
      `${a.riskScore || a.finalRiskScore || 85}`,
      a.source || "SOS",
      a.user?.name || "User",
      a.assignedVolunteerName || "Volunteer",
      a.responseStatus || a.status,
    ]);

    autoTable(doc, {
      startY: 38,
      theme: "grid",
      head: [["ID", "Date", "Priority", "Risk", "Source", "User", "Responder", "State"]],
      body: rows,
      headStyles: { fillColor: [79, 70, 229], fontSize: 8.5 },
      bodyStyles: { fontSize: 8 },
    });

    doc.save(`SafeHer_Incidents_Report_${Date.now()}.pdf`);
    toast.success("Master PDF Report Downloaded");
  }

  function exportBulkCSV() {
    let csv = "Incident ID,Date,Priority,Risk Score,Source,User,Responder,Status,Latitude,Longitude\n";
    filteredIncidents.forEach((a) => {
      csv += `"${a._id}","${new Date(a.createdAt).toLocaleString()}","${a.priority || "P1"}","${a.riskScore || 85}","${a.source}","${a.user?.name || "User"}","${a.assignedVolunteerName || "Volunteer"}","${a.status}","${a.latitude}","${a.longitude}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    FileSaver.saveAs(blob, `SafeHer_Incidents_Report_${Date.now()}.csv`);
    toast.success("CSV Report Downloaded");
  }

  function exportBulkJSON() {
    const jsonStr = JSON.stringify(filteredIncidents, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    FileSaver.saveAs(blob, `SafeHer_Incidents_Report_${Date.now()}.json`);
    toast.success("JSON Report Downloaded");
  }

  async function handleInspect(id: string) {
    setInspectLoading(true);
    try {
      const res = await getIncidentReportData(id);
      setInspectData(res.data.data);
    } catch {
      toast.error("Unable to load incident details");
    } finally {
      setInspectLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incident Intelligence & Report Center"
        desc="Generate single and batch incident reports, audit emergency response telemetry, and export data in PDF, CSV, or JSON."
      />

      {/* Top Stat Ribbon */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground block">Total Incidents</span>
            <span className="text-2xl font-black text-foreground">{totalCount}</span>
          </div>
          <FileText className="size-8 text-primary opacity-70" />
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground block">Active Emergencies</span>
            <span className="text-2xl font-black text-red-600">{stats.activeAlerts}</span>
          </div>
          <ShieldAlert className="size-8 text-red-600 opacity-70" />
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground block">Resolved Incidents</span>
            <span className="text-2xl font-black text-emerald-600">{stats.resolvedAlerts}</span>
          </div>
          <CheckCircle2 className="size-8 text-emerald-600 opacity-70" />
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground block">Active Responders</span>
            <span className="text-2xl font-black text-blue-600">{stats.totalVolunteers}</span>
          </div>
          <Clock className="size-8 text-blue-600 opacity-70" />
        </div>
      </div>

      {/* Filter and Export Ribbon */}
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search Incident ID, User, Responder..."
              className="pl-9 h-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Bulk Export Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold">Export Master Data:</span>
            <Button size="sm" variant="outline" onClick={exportBulkPDF} className="text-xs h-8">
              <FileDown className="size-3.5 mr-1 text-red-600" /> PDF
            </Button>
            <Button size="sm" variant="outline" onClick={exportBulkCSV} className="text-xs h-8">
              <FileDown className="size-3.5 mr-1 text-emerald-600" /> CSV
            </Button>
            <Button size="sm" variant="outline" onClick={exportBulkJSON} className="text-xs h-8">
              <Download className="size-3.5 mr-1 text-blue-600" /> JSON
            </Button>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t text-xs">
          <div>
            <span className="text-muted-foreground block mb-1">Priority:</span>
            <select
              className="w-full h-8 px-2 rounded-lg border bg-background text-xs"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="P1">P1 (Critical)</option>
              <option value="P2">P2 (High)</option>
              <option value="P3">P3 (Medium)</option>
              <option value="P4">P4 (Low)</option>
            </select>
          </div>

          <div>
            <span className="text-muted-foreground block mb-1">State:</span>
            <select
              className="w-full h-8 px-2 rounded-lg border bg-background text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All States</option>
              <option value="active">Active</option>
              <option value="accepted">Accepted / Responding</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div>
            <span className="text-muted-foreground block mb-1">Source:</span>
            <select
              className="w-full h-8 px-2 rounded-lg border bg-background text-xs"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="all">All Sources</option>
              <option value="MANUAL_SOS">Manual SOS</option>
              <option value="AI_VOICE">AI Voice Distress</option>
              <option value="AI_MOVEMENT">AI Movement Anomaly</option>
              <option value="AI_FUSION">AI Multi-Modal Fusion</option>
            </select>
          </div>

          <div>
            <span className="text-muted-foreground block mb-1">Date Filter:</span>
            <input
              type="date"
              className="w-full h-8 px-2 rounded-lg border bg-background text-xs"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Incident Report Table */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-sm text-foreground">
            Incident Records ({filteredIncidents.length})
          </h3>
          <Button size="sm" variant="ghost" onClick={loadIncidents} disabled={loading} className="text-xs h-7">
            <RefreshCw className={`size-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Reload
          </Button>
        </div>

        {filteredIncidents.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-xs">
            No incident records match the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-3.5">Incident ID</th>
                  <th className="p-3.5">Date & Time</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Risk Score</th>
                  <th className="p-3.5">Source</th>
                  <th className="p-3.5">Location</th>
                  <th className="p-3.5">Assigned Responder</th>
                  <th className="p-3.5">State</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredIncidents.map((a) => {
                  const isP1 = a.priority === "P1" || a.riskLevel === "CRITICAL";
                  return (
                    <tr key={a._id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-foreground">
                        #{a._id.slice(-6)}
                      </td>
                      <td className="p-3.5 text-muted-foreground">
                        {new Date(a.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                            isP1
                              ? "bg-red-600 text-white"
                              : a.priority === "P2"
                              ? "bg-amber-500 text-white"
                              : "bg-blue-500 text-white"
                          }`}
                        >
                          {a.priority || "P1"}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-foreground">
                        {a.riskScore || a.finalRiskScore || 85}/100
                      </td>
                      <td className="p-3.5 text-muted-foreground">
                        <span className="bg-muted px-1.5 py-0.5 rounded text-[11px]">
                          {a.source}
                        </span>
                      </td>
                      <td className="p-3.5 text-muted-foreground font-mono text-[11px]">
                        {a.latitude != null && a.longitude != null
                          ? `${Number(a.latitude).toFixed(3)}, ${Number(a.longitude).toFixed(3)}`
                          : "N/A"}
                      </td>
                      <td className="p-3.5 font-semibold text-primary">
                        {a.acceptedBy?.name || a.assignedVolunteerId?.name || a.assignedVolunteerName || "None"}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            a.status === "active"
                              ? "bg-red-100 text-red-700"
                              : a.status === "accepted"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {a.responseStatus || a.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleInspect(a._id)}
                          className="text-xs h-7 px-2"
                        >
                          <Eye className="size-3 mr-1" /> View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadSingleIncidentPDF(a._id)}
                          className="text-xs h-7 px-2 font-bold text-primary"
                        >
                          <FileDown className="size-3 mr-1" /> PDF Report
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Inspection Modal */}
      <Dialog open={!!inspectData} onOpenChange={(open) => !open && setInspectData(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span>Incident Record #{inspectData?.incidentId?.slice(-8)}</span>
              <span className="text-xs bg-red-600 text-white font-extrabold px-2 py-0.5 rounded-full">
                {inspectData?.priority} {inspectData?.riskLevel}
              </span>
            </DialogTitle>
          </DialogHeader>

          {inspectData && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-xl border">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Victim Name</span>
                  <span className="font-bold text-foreground">{inspectData.user?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Responder</span>
                  <span className="font-bold text-primary">{inspectData.response?.assignedVolunteer}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Total Response Time</span>
                  <span className="font-bold text-foreground">{inspectData.responseMetrics?.formattedTotalDuration}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Coordinates</span>
                  <span className="font-mono text-foreground">{inspectData.location?.approximateAddress}</span>
                </div>
              </div>

              {/* Emergency Evidence Media Player & Direct Download */}
              {inspectData.evidence && (inspectData.evidence.hasVideo || inspectData.evidence.hasAudio || inspectData.evidence.videoUrl || inspectData.evidence.audioUrl) && (() => {
                const backendBase = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api$/, "");
                const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
                const buildStreamUrl = (url: string) => `${backendBase}${url}?token=${encodeURIComponent(token)}`;

                return (
                  <div className="rounded-xl border bg-muted/20 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                        <Radio className="size-3.5 text-red-600 animate-pulse" />
                        Captured Emergency Recordings
                      </span>
                      <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-950 px-2 py-0.5 rounded font-bold">
                        VERIFIED EVIDENCE
                      </span>
                    </div>

                    {inspectData.evidence.videoUrl && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <VideoIcon className="size-3 text-red-500" /> Emergency Video Recording ({inspectData.evidence.videoDuration || 0}s)
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => inspectData.evidence?.videoUrl && downloadEvidenceMedia(inspectData.evidence.videoUrl, `evidence_video_${inspectData.incidentId.slice(-6)}.webm`)}
                            className="h-6 text-[10px] px-2 font-bold"
                          >
                            <Download className="size-2.5 mr-1" /> Download Video File
                          </Button>
                        </div>
                        <video
                          controls
                          playsInline
                          preload="auto"
                          className="w-full rounded-lg bg-black max-h-48"
                          src={buildStreamUrl(inspectData.evidence.videoUrl)}
                        />
                      </div>
                    )}

                    {inspectData.evidence.audioUrl && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Volume2 className="size-3 text-blue-500" /> Emergency Voice Recording ({inspectData.evidence.audioDuration || 0}s)
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => inspectData.evidence?.audioUrl && downloadEvidenceMedia(inspectData.evidence.audioUrl, `evidence_voice_${inspectData.incidentId.slice(-6)}.webm`)}
                            className="h-6 text-[10px] px-2 font-bold"
                          >
                            <Download className="size-2.5 mr-1" /> Download Audio File
                          </Button>
                        </div>
                        <audio
                          controls
                          preload="auto"
                          className="w-full"
                          src={buildStreamUrl(inspectData.evidence.audioUrl)}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Factors */}
              <div>
                <span className="font-bold text-foreground block mb-1">AI Detection & Factors:</span>
                <p className="text-muted-foreground bg-muted/30 p-2.5 rounded-xl border">
                  {inspectData.aiSummary?.mainFactors?.join(" · ")}
                </p>
              </div>

              {/* Timeline */}
              <div>
                <span className="font-bold text-foreground block mb-1">Response Milestones:</span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {inspectData.timeline?.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b pb-1 text-[11px]">
                      <span className="font-medium text-foreground">{t.event.replace(/_/g, " ")}</span>
                      <span className="text-muted-foreground font-mono">{new Date(t.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <Button size="sm" variant="outline" onClick={() => setInspectData(null)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => downloadSingleIncidentPDF(inspectData.incidentId)}
                  className="bg-primary text-white font-bold"
                >
                  <FileDown className="size-3.5 mr-1" /> Download Full PDF Report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}