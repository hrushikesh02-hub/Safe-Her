import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls =
    s.includes("resolved") || s.includes("active") && s !== "active" ? "bg-success/15 text-success" :
    s === "active" ? "bg-emergency/15 text-emergency" :
    s.includes("pending") || s.includes("on-duty") ? "bg-warning/15 text-warning" :
    s.includes("suspended") || s.includes("reject") ? "bg-emergency/15 text-emergency" :
    s.includes("available") ? "bg-success/15 text-success" :
    "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", cls)}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}