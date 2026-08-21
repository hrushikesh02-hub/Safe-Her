import { createFileRoute } from "@tanstack/react-router";
import { Building2, Navigation, Hospital, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getNearbySafeZones } from "@/services/userService";
import OSMMap, { MapMarker } from "@/components/OSMMap";

export const Route = createFileRoute("/user/safe-zones")({
  component: SafeZonesPage,
});

function SafeZonesPage() {
  const [location, setLocation] = useState({
    latitude: 19.901873,
    longitude: 74.494342,
  });

  const [places, setPlaces] = useState<any[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);

  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    }
    return `${distance.toFixed(1)} km`;
  };

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const current = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLocation(current);

        try {
          const response = await getNearbySafeZones(current.latitude, current.longitude);
          if (response.data?.data) {
            setPlaces(response.data.data);
          }
        } catch (err) {
          console.log(err);
        }
      },
      () => {
        toast.error("Unable to fetch location");
      },
      {
        enableHighAccuracy: true,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Prepare map markers
  const markers: MapMarker[] = [
    {
      id: "current-user",
      latitude: location.latitude,
      longitude: location.longitude,
      title: "Your Location",
      iconType: "user",
      popupContent: "<b>📍 Your Live Location</b>",
    },
    ...places.map((place: any) => {
      const pLat = place.location?.latitude ?? place.latitude;
      const pLng = place.location?.longitude ?? place.longitude;
      const pName = place.displayName?.text ?? place.name ?? "Safe Zone";
      const pAddress = place.formattedAddress ?? place.address ?? "";
      const pType = place.primaryType ?? place.type ?? "safe_zone";
      const iconType: "hospital" | "police" | "safe_zone" = pType.includes("hospital")
        ? "hospital"
        : pType.includes("police")
        ? "police"
        : "safe_zone";

      return {
        id: place.id || place._id,
        latitude: pLat,
        longitude: pLng,
        title: pName,
        iconType,
        popupContent: `
          <div style="font-family: sans-serif; min-width: 180px; padding: 4px;">
            <b style="font-size: 13px; color: #1e293b;">${pName}</b>
            <p style="font-size: 11px; color: #64748b; margin: 3px 0;">${pAddress}</p>
            <p style="font-size: 11px; color: #7c3aed; font-weight: 600; margin: 4px 0;">
              📍 ${getDistance(location.latitude, location.longitude, pLat, pLng)} away
            </p>
            <a href="https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${location.latitude},${location.longitude}%3B${pLat},${pLng}" 
               target="_blank" 
               style="display: inline-block; margin-top: 6px; padding: 4px 8px; background: #7c3aed; color: white; border-radius: 6px; text-decoration: none; font-size: 11px; font-weight: 500;">
              🧭 Directions
            </a>
          </div>
        `,
      };
    }),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nearby Safe Zones"
        desc="Verified hospitals, police stations, shelters, and designated refuge points."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
        <div className="rounded-2xl overflow-hidden border bg-card shadow-sm">
          <OSMMap
            center={{
              lat: selectedPlace
                ? selectedPlace.location?.latitude ?? selectedPlace.latitude
                : location.latitude,
              lng: selectedPlace
                ? selectedPlace.location?.longitude ?? selectedPlace.longitude
                : location.longitude,
            }}
            zoom={15}
            markers={markers}
            className="w-full h-[520px]"
          />
        </div>

        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
          {places.length === 0 ? (
            <div className="p-6 text-center rounded-2xl border bg-card text-muted-foreground text-sm">
              <Building2 className="size-8 mx-auto mb-2 opacity-50" />
              Scanning for nearby safe zones...
            </div>
          ) : (
            places.map((place: any) => {
              const pLat = place.location?.latitude ?? place.latitude;
              const pLng = place.location?.longitude ?? place.longitude;
              const pName = place.displayName?.text ?? place.name ?? "Safe Zone";
              const pAddress = place.formattedAddress ?? place.address ?? "";
              const pType = place.primaryType ?? place.type ?? "safe_zone";

              return (
                <div
                  key={place.id || place._id}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md transition ${
                    selectedPlace?.id === place.id ? "ring-2 ring-primary border-primary" : ""
                  }`}
                  onClick={() => setSelectedPlace(place)}
                >
                  <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <Building2 className="size-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{pName}</div>
                    <div className="text-xs text-muted-foreground truncate">{pAddress}</div>
                    <div className="mt-1 text-xs text-primary capitalize">{pType.replace("_", " ")}</div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground">
                      📍 {getDistance(location.latitude, location.longitude, pLat, pLng)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default SafeZonesPage;