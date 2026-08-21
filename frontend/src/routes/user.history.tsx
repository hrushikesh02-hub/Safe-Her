import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { getAlertHistory } from "@/services/userService";
import { toast } from "sonner";
import { Clock, CheckCircle2, Siren, MapPin, UserCheck } from "lucide-react";

export const Route = createFileRoute("/user/history")({ component: HistoryPage });

const filters = ["All", "Active", "Resolved"] as const;

function HistoryPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    try {
      const response = await getAlertHistory();
      setHistory(response.data.data || []);
    } catch {
      toast.error("Failed to load alert history");
    } finally {
      setLoading(false);
    }
  }

  const filteredRows =
    filter === "All"
      ? history
      : history.filter((r) => r.status === filter.toLowerCase());

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Incident & Alert History
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review past emergency triggers, response statuses, and resolution logs.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {filters.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              filter === tab
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-muted-foreground">Loading history...</div>
      ) : filteredRows.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border/80 p-8 text-center space-y-2 shadow-xs">
          <CheckCircle2 className="size-8 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">No alerts found</h3>
          <p className="text-xs text-muted-foreground">There are no logged alerts for the selected filter.</p>
        </div>
      ) : (
        <>
          {/* Mobile View: Clean Timeline Cards */}
          <div className="space-y-3 lg:hidden">
            {filteredRows.map((r) => (
              <div key={r._id} className="bg-card rounded-2xl border border-border/80 p-4 shadow-xs space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-foreground">#{r._id.slice(-6)}</span>
                  <Badge variant={r.status === "resolved" ? "secondary" : "destructive"} className="text-[10px]">
                    {r.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  <span>{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <div className="text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  <span>{r.latitude ? `${Number(r.latitude).toFixed(4)}, ${Number(r.longitude).toFixed(4)}` : "Location Shared"}</span>
                </div>
                {r.assignedVolunteerName && (
                  <div className="text-foreground font-medium flex items-center gap-1.5 pt-1 border-t border-border/60">
                    <UserCheck className="size-3.5 text-emerald-600" />
                    <span>Responder: {r.assignedVolunteerName}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop View: Clean Structured Table */}
          <div className="hidden lg:block overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-left uppercase tracking-wider text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Alert ID</th>
                  <th className="py-3.5 px-4 font-bold">Date & Time</th>
                  <th className="py-3.5 px-4 font-bold">Trigger Source</th>
                  <th className="py-3.5 px-4 font-bold">Location</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold">Assigned Responder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRows.map((r) => (
                  <tr key={r._id} className="hover:bg-muted/30">
                    <td className="py-3.5 px-4 font-mono font-bold text-foreground">#{r._id.slice(-6)}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="py-3.5 px-4 font-medium text-foreground">{r.source ? r.source.replace("_", " ") : "Manual SOS"}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {r.latitude ? `${Number(r.latitude).toFixed(4)}, ${Number(r.longitude).toFixed(4)}` : "GPS Logged"}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={r.status === "resolved" ? "secondary" : "destructive"} className="text-[10px]">
                        {r.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-foreground font-medium">
                      {r.assignedVolunteerName || "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}