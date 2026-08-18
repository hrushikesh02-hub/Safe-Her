import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, delta, icon, tone = "primary",
}: {
  label: string;
  value: string | number;
  delta?: string;
  icon?: ReactNode;
  tone?: "primary" | "emergency" | "success" | "warning";
}) {
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    emergency: "bg-emergency/10 text-emergency",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning",
  }[tone];
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-elegant">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        {icon && <span className={cn("grid size-9 place-items-center rounded-xl", toneClasses)}>{icon}</span>}
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
      {delta && <div className="mt-1 text-xs text-success">{delta}</div>}
    </div>
  );
}