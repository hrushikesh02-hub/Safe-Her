import OSMMap, { MapMarker } from "./OSMMap";

interface MapViewProps {
  latitude: number;
  longitude: number;
  markers?: MapMarker[];
  className?: string;
}

export default function MapView({
  latitude,
  longitude,
  markers = [],
  className = "w-full h-[450px] rounded-2xl overflow-hidden border shadow-sm",
}: MapViewProps) {
  const allMarkers: MapMarker[] = [
    {
      id: "center-marker",
      latitude,
      longitude,
      title: "Current Location",
      iconType: "user",
    },
    ...markers,
  ];

  return (
    <OSMMap
      center={{ lat: latitude, lng: longitude }}
      zoom={15}
      markers={allMarkers}
      className={className}
    />
  );
}