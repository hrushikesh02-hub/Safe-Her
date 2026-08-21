import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import OSMMap, { MapMarker } from "@/components/OSMMap";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/user/location")({
  component: LocationPage,
});

function LocationPage() {
  const [location, setLocation] = useState({
    latitude: 19.901873,
    longitude: 74.494342,
    accuracy: "Calculating...",
    updated: new Date().toLocaleTimeString(),
  });

  const [hasLocation, setHasLocation] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setLocation({
          latitude,
          longitude,
          accuracy: `${Math.round(position.coords.accuracy)} m`,
          updated: new Date().toLocaleTimeString(),
        });
        setHasLocation(true);
      },
      (err) => {
        console.warn("Location fetch note:", err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const markers: MapMarker[] = [
    {
      id: "current-user",
      latitude: location.latitude,
      longitude: location.longitude,
      title: "Your Current Location",
      iconType: "user",
      popupContent: `
        <div style="font-family: sans-serif; padding: 4px;">
          <b style="color: #2563eb;">📍 Your Live Location</b><br/>
          <span style="font-size: 11px; color: #64748b;">Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}</span><br/>
          <span style="font-size: 11px; color: #10b981;">● Accuracy: ${location.accuracy}</span>
        </div>
      `,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Live Location Tracking"
          desc="Real-time precision GPS tracking powered by OpenStreetMap."
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                  setLocation({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: `${Math.round(pos.coords.accuracy)} m`,
                    updated: new Date().toLocaleTimeString(),
                  });
                  toast.success("Location refreshed");
                });
              }
            }}
          >
            <Navigation className="size-3.5 text-primary" />
            Center Location
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="relative rounded-2xl overflow-hidden border bg-card shadow-sm">
          <OSMMap
            center={{
              lat: location.latitude,
              lng: location.longitude,
            }}
            zoom={17}
            markers={markers}
            className="w-full h-[520px]"
          />
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Latitude
            </div>
            <div className="mt-1 font-semibold text-lg font-mono">
              {location.latitude.toFixed(6)}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Longitude
            </div>
            <div className="mt-1 font-semibold text-lg font-mono">
              {location.longitude.toFixed(6)}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Last Updated
            </div>
            <div className="mt-1 font-semibold">
              {location.updated}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Accuracy
            </div>
            <div className="mt-1 font-semibold text-emerald-600 dark:text-emerald-400">
              {location.accuracy}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Location Status
            </div>
            <div className="mt-2">
              <StatusBadge status="Live" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default LocationPage;