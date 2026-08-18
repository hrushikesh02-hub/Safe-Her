import { createFileRoute } from "@tanstack/react-router";
import { useState , useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAlertHistory } from "@/services/userService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/user/history")({ component: HistoryPage });

const filters = ["All", "Active", "Resolved", "Pending"] as const;

function HistoryPage() {
  const [f, setF] = useState<(typeof filters)[number]>("All");
  const [history, setHistory] = useState<any[]>([]);
  useEffect(() => {
  loadHistory();
}, []);

async function loadHistory() {
  try {
    const response = await getAlertHistory();

    setHistory(response.data.data);
  } catch (error) {
    toast.error("Failed to load alert history");
  }
}
  const rows =
  f === "All"
    ? history
    : history.filter((r) => r.status === f.toLowerCase());
  return (
    <div className="space-y-6">
      <PageHeader title="Emergency alert history" desc="Every alert is logged with status and assigned responder." />
      <div className="flex flex-wrap gap-2">
        {filters.map((x) => (
          <button key={x} onClick={() => setF(x)} className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-medium transition",
            f === x ? "border-primary bg-primary text-white" : "hover:border-primary/40"
          )}>{x}</button>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-4">Alert ID</th><th className="p-4">Date</th><th className="p-4">Location</th><th className="p-4">Status</th><th className="p-4">Assigned volunteer</th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
  <tr key={r._id} className="hover:bg-muted/30">
    <td className="p-4 font-mono text-xs">
      {r._id.slice(-6)}
    </td>

    <td className="p-4">
      {new Date(r.createdAt).toLocaleString()}
    </td>

    <td className="p-4">
      {r.latitude}, {r.longitude}
    </td>

    <td className="p-4">
      <StatusBadge status={r.status} />
    </td>

    <td className="p-4">
      --
    </td>
  </tr>
))}
          </tbody>
        </table>
      </div>
    </div>
  );
}