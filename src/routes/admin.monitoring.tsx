import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { getActiveAlerts ,acceptAlert,resolveAlert} from "@/services/adminService";
import { toast } from "sonner";
import { Search, RefreshCw, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState ,useEffect,useMemo} from "react";

export const Route = createFileRoute("/admin/monitoring")({ component: Monitoring });


function Monitoring() {
  const [search, setSearch] = useState("");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
  loadAlerts();
}, []);

async function loadAlerts() {
  try {
    const response = await getActiveAlerts();

    setAlerts(response.data.data);

  } catch (error) {
    console.error(error);
    toast.error("Unable to load alerts");
  }
}
const filteredAlerts = useMemo(() => {
  return alerts.filter((alert: any) => {
    const matchesSearch =
      alert.user?.name
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      alert._id.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      alert.status === statusFilter;

    return matchesSearch && matchesStatus;
  });
}, [alerts, search, statusFilter]);

async function handleAccept(id: string) {
  try {
    await acceptAlert(id);
    toast.success("Alert Accepted");
    loadAlerts();
  } catch (error) {
    console.error(error);
    toast.error("Unable to accept alert");
  }
}

async function handleResolve(id: string) {
  try {
    await resolveAlert(id);
    toast.success("Alert Resolved");
    loadAlerts();
  } catch (error) {
    console.error(error);
    toast.error("Unable to resolve alert");
  }
}

  return (
    <div className="space-y-6">
      <PageHeader title="Emergency monitoring" desc="Real-time view of every active incident." action={<StatusBadge status="Live" />} />
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">

  <div className="relative w-full lg:w-96">

    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

    <Input
      placeholder="Search User or SOS ID..."
      className="pl-10"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />

  </div>
  <div className="flex flex-wrap gap-3">

  <Button
    variant={statusFilter === "all" ? "default" : "outline"}
    onClick={() => setStatusFilter("all")}
  >
    All
  </Button>

  <Button
    variant={statusFilter === "active" ? "default" : "outline"}
    onClick={() => setStatusFilter("active")}
  >
    Active
  </Button>

  <Button
    variant={statusFilter === "accepted" ? "default" : "outline"}
    onClick={() => setStatusFilter("accepted")}
  >
    Accepted
  </Button>

  <Button
    variant={statusFilter === "resolved" ? "default" : "outline"}
    onClick={() => setStatusFilter("resolved")}
  >
    Resolved
  </Button>

</div>

  <div className="flex gap-3">

    <Button onClick={loadAlerts}>
  <RefreshCw className="mr-2 h-4 w-4" />
  Refresh
</Button>

  </div>

</div>
<div className="grid gap-4">

  {filteredAlerts.map((alert: any) => (

  <div
    key={alert._id}
    className="rounded-2xl border bg-card p-5 shadow-sm"
  >

    <div className="flex items-center justify-between">

      <div>
        <h3 className="font-semibold">
          {alert.user?.name}
        </h3>

        <p className="text-sm text-muted-foreground">
          {alert.user?.phone}
        </p>
      </div>

      <StatusBadge status={alert.status} />

    </div>
    

    <div className="mt-4 space-y-2 text-sm">

      <p>
        <strong>SOS ID:</strong> {alert._id}
      </p>

      <p>
        <strong>Latitude:</strong> {alert.latitude}
      </p>

      <p>
        <strong>Longitude:</strong> {alert.longitude}
      </p>

      <p>
        <strong>Volunteer:</strong>{" "}
        {alert.acceptedBy?.name || "Not Assigned"}
      </p>

      <p>
        <strong>Created:</strong>{" "}
        {new Date(alert.createdAt).toLocaleString()}
      </p>
      <div className="mt-5 flex gap-3">

  {alert.status === "active" && (
    <Button
      size="sm"
      onClick={() => handleAccept(alert._id)}
    >
      Accept
    </Button>
  )}

  {alert.status !== "resolved" && (
    <Button
      size="sm"
      variant="destructive"
      onClick={() => handleResolve(alert._id)}
    >
      Resolve
    </Button>
  )}

</div>

    </div>

  </div>

))}

</div>
</div>
  );
}