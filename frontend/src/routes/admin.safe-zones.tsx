import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useEffect, useState } from "react";
import { getNearbySafeZones } from "@/services/userService";
import OSMMap, { MapMarker } from "@/components/OSMMap";
import { Building2, Search, MapPin } from "lucide-react";

export const Route = createFileRoute("/admin/safe-zones")({
  component: AdminSafeZones,
});

const defaultCenter = {
  lat: 19.901873,
  lng: 74.494342,
};

function AdminSafeZones() {
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [places, setPlaces] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState(defaultCenter);

  useEffect(() => {
    searchSafePlaces(defaultCenter.lat, defaultCenter.lng);
  }, []);

  async function searchSafePlaces(lat: number, lng: number) {
    try {
      const response = await getNearbySafeZones(lat, lng);
      setPlaces(response.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedPlace(null);
    setSelectedLocation({ lat, lng });
    searchSafePlaces(lat, lng);
  };

  const markers: MapMarker[] = [
    {
      id: "selected-center",
      latitude: selectedLocation.lat,
      longitude: selectedLocation.lng,
      title: "Inspection Location",
      iconType: "user",
      popupContent: `<b>📍 Selected Point</b><br/><span style="font-size: 11px;">Lat: ${selectedLocation.lat.toFixed(6)}, Lng: ${selectedLocation.lng.toFixed(6)}</span>`,
    },
    ...places.map((place: any) => {
      const pLat = place.location?.latitude ?? place.latitude;
      const pLng = place.location?.longitude ?? place.longitude;
      const pName = place.displayName?.text ?? place.name ?? "Safe Zone";
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
        popupContent: `<b>${pName}</b><br/><span style="font-size: 11px; color: #64748b;">${place.formattedAddress ?? place.address ?? ""}</span>`,
      };
    }),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Safe Zones Management"
        desc="Explore and manage designated refuge hubs and community emergency zones."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
        <div className="rounded-2xl overflow-hidden border bg-card shadow-sm">
          <OSMMap
            center={selectedLocation}
            zoom={15}
            markers={markers}
            onMapClick={handleMapClick}
            className="w-full h-[520px]"
          />
        </div>

        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
          {places.length === 0 ? (
            <div className="p-6 text-center rounded-2xl border bg-card text-muted-foreground text-sm">
              <Building2 className="size-8 mx-auto mb-2 opacity-50" />
              Click anywhere on the map to search nearby safe zones.
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
                  onClick={() => {
                    setSelectedPlace(place);
                    setSelectedLocation({ lat: pLat, lng: pLng });
                  }}
                >
                  <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <Building2 className="size-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{pName}</div>
                    <div className="text-xs text-muted-foreground truncate">{pAddress}</div>
                    <div className="mt-1 text-xs text-primary capitalize">{pType.replace("_", " ")}</div>
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

export default AdminSafeZones;