import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  History,
  Inbox,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getVolunteerIncidents } from "@/services/volunteerService";
import type { Incident, IncidentStatistics } from "@/services/volunteerService";

import { UserAvatar } from "@/components/ui/UserAvatar";

export const Route = createFileRoute("/volunteer/incidents/")({
  component: IncidentHistory,
});

// =====================================================
// TYPES
// =====================================================

type StatusFilter = "all" | "accepted" | "resolved";
type SortOrder = "newest" | "oldest";

// =====================================================
// HELPERS
// =====================================================

function formatDateTime(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function getErrorStatusCode(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { status?: number } }).response === "object"
  ) {
    return (error as { response?: { status?: number } }).response?.status;
  }
  return undefined;
}

// =====================================================
// COMPONENT
// =====================================================

function IncidentHistory() {
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [statistics, setStatistics] = useState<IncidentStatistics>({
    totalIncidents: 0,
    acceptedIncidents: 0,
    resolvedIncidents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  const loadIncidents = useCallback(async () => {
    setLoading(true);

    try {
      const response = await getVolunteerIncidents();
      setIncidents(response.data.data ?? []);
      setStatistics(
        response.data.statistics ?? {
          totalIncidents: 0,
          acceptedIncidents: 0,
          resolvedIncidents: 0,
        }
      );
      setNotFound(false);
      setAccessDenied(false);
    } catch (error: unknown) {
      const status = getErrorStatusCode(error);

      if (status === 401) {
        toast.error("Session expired. Please log in again.");
        navigate({ to: "/login" });
        return;
      }

      if (status === 403) {
        setAccessDenied(true);
        return;
      }

      if (status === 404) {
        setNotFound(true);
        return;
      }

      if (status === 500) {
        toast.error("Server error while loading incident history.");
        return;
      }

      toast.error("Unable to load incident history");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  // ---------------------------------------------------
  // Derived data — filter, search, sort, stats
  // ---------------------------------------------------

  const visibleIncidents = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = incidents.filter((incident) => {
      if (statusFilter !== "all" && incident.status !== statusFilter) {
        return false;
      }

      if (!query) return true;

      const name = incident.user?.name?.toLowerCase() ?? "";
      const phone = incident.user?.phone?.toLowerCase() ?? "";
      const alertId = incident._id.toLowerCase();

      return name.includes(query) || phone.includes(query) || alertId.includes(query);
    });

    const sorted = [...filtered].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });

    return sorted;
  }, [incidents, search, statusFilter, sortOrder]);

  const handleViewDetails = useCallback(
    (id: string) => {
      navigate({ to: "/volunteer/incidents/$id", params: { id } });
    },
    [navigate]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incident History"
        desc="View all incidents you have responded to."
      />

      {accessDenied ? (
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Access Denied</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={<CheckCircle2 className="size-5" />}
              label="Resolved Incidents"
              value={statistics.resolvedIncidents}
              tone="success"
              loading={loading}
            />
            <StatCard
              icon={<ShieldCheck className="size-5" />}
              label="Accepted Incidents"
              value={statistics.acceptedIncidents}
              tone="primary"
              loading={loading}
            />
            <StatCard
              icon={<History className="size-5" />}
              label="Total Incidents"
              value={statistics.totalIncidents}
              tone="muted"
              loading={loading}
            />
          </div>

          {/* Search + filters + sort */}
          <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone, or alert ID"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-full border bg-muted/40 p-1">
                {(["all", "accepted", "resolved"] as StatusFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                      statusFilter === filter
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {/* List */}
          {loading ? (
            <IncidentGridSkeleton />
          ) : notFound || visibleIncidents.length === 0 ? (
            <EmptyState hasIncidents={incidents.length > 0} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleIncidents.map((incident, index) => (
                <motion.div
                  key={incident._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.03 }}
                  className="flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={incident.user?.profileImage}
                          name={incident.user?.name || "User"}
                          role="user"
                          size="md"
                        />
                        <div>
                          <div className="text-sm font-semibold">
                            {incident.user?.name || "Unknown user"}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="size-3" />
                            {incident.user?.phone || "—"}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={incident.status} />
                    </div>

                    <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="size-3.5" />
                        {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        Incident: {formatDateTime(incident.createdAt)}
                      </div>
                      {incident.status === "resolved" && (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-3.5" />
                          Resolved: {formatDateTime(incident.updatedAt)}
                        </div>
                      )}
                      <div className="pt-1 text-[11px] uppercase tracking-wider text-muted-foreground/70">
                        Alert ID · {incident._id.slice(-6)}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={() => handleViewDetails(incident._id)}
                  >
                    View Details
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// =====================================================
// SUBCOMPONENTS
// =====================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "success" | "primary" | "muted";
  loading: boolean;
}

function StatCard({ icon, label, value, tone, loading }: StatCardProps) {
  const toneClasses: Record<StatCardProps["tone"], string> = {
    success: "bg-success/10 text-success",
    primary: "bg-primary/10 text-primary",
    muted: "bg-muted text-foreground",
  };

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={cn("grid size-10 place-items-center rounded-full", toneClasses[tone])}>
          {icon}
        </div>
        {loading ? (
          <div className="h-7 w-10 animate-pulse rounded bg-muted" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </div>
      <div className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function EmptyState({ hasIncidents }: { hasIncidents: boolean }) {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-muted">
        <Inbox className="size-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 font-semibold">
        {hasIncidents ? "No incidents match your search." : "No incident history found."}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasIncidents
          ? "Try adjusting your search or filters."
          : "Incidents you accept or resolve will appear here."}
      </p>
      {!hasIncidents && (
        <Button className="mt-5" onClick={() => navigate({ to: "/volunteer/alerts" })}>
          Go to Alert Feed
        </Button>
      )}
    </div>
  );
}

function IncidentGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="size-11 animate-pulse rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
          <div className="mt-4 h-9 w-full animate-pulse rounded-md bg-muted" />
        </div>
      ))}
    </div>
  );
}