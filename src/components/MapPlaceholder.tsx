import { MapPin } from "lucide-react";

export function MapPlaceholder({ height = "h-96", label = "Live Location" }: { height?: string; label?: string }) {
  return (
    <div className={`relative ${height} w-full overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-secondary/10 to-emergency/10`}>
      {/* grid */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(109,40,217,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(109,40,217,0.12) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* routes */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 400 300">
        <path d="M40,260 C120,200 180,220 260,140 S360,40 380,30" stroke="var(--secondary)" strokeWidth="3" fill="none" strokeDasharray="6 6" />
      </svg>
      {/* you */}
      <div className="absolute left-[12%] bottom-[10%]">
        <div className="relative">
          <div className="absolute inset-0 size-10 rounded-full bg-emergency/40 ring-grow" />
          <div className="relative grid size-10 place-items-center rounded-full bg-emergency text-white shadow-elegant">
            <MapPin className="size-5" />
          </div>
        </div>
        <div className="mt-1 rounded-md bg-card px-2 py-0.5 text-[10px] font-semibold shadow">You</div>
      </div>
      {/* responder */}
      <div className="absolute right-[10%] top-[8%]">
        <div className="grid size-9 place-items-center rounded-full bg-success text-white shadow-elegant">
          <MapPin className="size-4" />
        </div>
        <div className="mt-1 rounded-md bg-card px-2 py-0.5 text-[10px] font-semibold shadow">Responder</div>
      </div>
      <div className="absolute left-4 top-4 rounded-lg bg-card/90 px-3 py-1.5 text-xs font-semibold shadow">{label}</div>
    </div>
  );
}