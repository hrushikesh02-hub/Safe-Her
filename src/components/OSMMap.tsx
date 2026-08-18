import { useEffect, useRef, useState } from "react";

export interface MapMarker {
  id?: string | number;
  latitude: number;
  longitude: number;
  title?: string;
  popupContent?: string | HTMLElement;
  iconType?: "user" | "police" | "hospital" | "safe_zone" | "danger";
}

interface OSMMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  className?: string;
  style?: React.CSSProperties;
  onMapClick?: (lat: number, lng: number) => void;
  showUserPulse?: boolean;
}

export default function OSMMap({
  center,
  zoom = 15,
  markers = [],
  className = "w-full h-[500px] rounded-2xl overflow-hidden border shadow-sm",
  style,
  onMapClick,
}: OSMMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !mapContainerRef.current) return;

    let isMounted = true;

    // Dynamically load leaflet only in browser
    import("leaflet").then((leafletModule) => {
      if (!isMounted || !mapContainerRef.current) return;
      const L = leafletModule.default || leafletModule;

      // Fix icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [center.lat, center.lng],
          zoom: zoom,
          zoomControl: true,
          attributionControl: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        const markersLayer = L.layerGroup().addTo(map);
        markersLayerRef.current = markersLayer;

        if (onMapClick) {
          map.on("click", (e: any) => {
            onMapClick(e.latlng.lat, e.latlng.lng);
          });
        }

        mapInstanceRef.current = map;
      }

      // Render markers
      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();

        markers.forEach((m) => {
          if (m.latitude && m.longitude) {
            let icon;
            if (m.iconType === "user") {
              icon = L.divIcon({
                className: "custom-user-marker",
                html: `
                  <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
                    <div style="position: absolute; width: 24px; height: 24px; background: rgba(59, 130, 246, 0.4); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                    <div style="position: relative; width: 14px; height: 14px; background: #2563eb; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
                  </div>
                `,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              });
            } else {
              let color = "#7c3aed";
              let glyph = "📍";
              if (m.iconType === "police") {
                color = "#2563eb";
                glyph = "👮";
              } else if (m.iconType === "hospital") {
                color = "#dc2626";
                glyph = "🏥";
              } else if (m.iconType === "danger") {
                color = "#ea580c";
                glyph = "⚠️";
              } else if (m.iconType === "safe_zone") {
                color = "#059669";
                glyph = "🛡️";
              }

              icon = L.divIcon({
                className: "custom-poi-marker",
                html: `
                  <div style="background: ${color}; color: white; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.35); border: 2px solid white;">
                    <span style="transform: rotate(45deg); font-size: 14px;">${glyph}</span>
                  </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -28],
              });
            }

            const marker = L.marker([m.latitude, m.longitude], { icon });
            if (m.popupContent) {
              marker.bindPopup(m.popupContent);
            } else if (m.title) {
              marker.bindPopup(`<b>${m.title}</b>`);
            }
            markersLayerRef.current.addLayer(marker);
          }
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isClient, center.lat, center.lng, markers]);

  // Handle center pan
  useEffect(() => {
    if (mapInstanceRef.current && center.lat && center.lng) {
      mapInstanceRef.current.panTo([center.lat, center.lng], { animate: true });
    }
  }, [center.lat, center.lng]);

  // Clean up
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  if (!isClient) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted/40 animate-pulse text-xs text-muted-foreground`} style={style}>
        Loading OpenStreetMap...
      </div>
    );
  }

  return <div ref={mapContainerRef} className={className} style={style} />;
}
