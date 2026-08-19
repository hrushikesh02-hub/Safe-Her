import { useEffect, useRef, useState } from "react";

export interface MapMarker {
  id?: string | number;
  latitude: number;
  longitude: number;
  title?: string;
  popupContent?: string | HTMLElement;
  iconType?: "user" | "emergency" | "responder" | "police" | "hospital" | "safe_zone" | "danger";
}

interface OSMMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  routeCoordinates?: [number, number][];
  className?: string;
  style?: React.CSSProperties;
  onMapClick?: (lat: number, lng: number) => void;
  showUserPulse?: boolean;
}

export default function OSMMap({
  center,
  zoom = 15,
  markers = [],
  routeCoordinates = [],
  className = "w-full h-[500px] rounded-2xl overflow-hidden border shadow-sm",
  style,
  onMapClick,
}: OSMMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !mapContainerRef.current) return;

    let isMounted = true;

    // Dynamically load leaflet in browser
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

        markersLayerRef.current = L.layerGroup().addTo(map);
        routeLayerRef.current = L.layerGroup().addTo(map);

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
            if (m.iconType === "emergency") {
              icon = L.divIcon({
                className: "custom-emergency-marker",
                html: `
                  <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                    <div style="position: absolute; width: 32px; height: 32px; background: rgba(220, 38, 38, 0.45); border-radius: 50%; animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                    <div style="position: relative; width: 18px; height: 18px; background: #dc2626; border: 3px solid white; border-radius: 50%; box-shadow: 0 3px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 9px; font-weight: 900;">!</div>
                  </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
              });
            } else if (m.iconType === "responder") {
              icon = L.divIcon({
                className: "custom-responder-marker",
                html: `
                  <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                    <div style="position: absolute; width: 28px; height: 28px; background: rgba(37, 99, 235, 0.35); border-radius: 50%; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>
                    <div style="position: relative; width: 16px; height: 16px; background: #2563eb; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>
                  </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
              });
            } else if (m.iconType === "user") {
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

      // Render route polyline if available
      if (routeLayerRef.current) {
        routeLayerRef.current.clearLayers();
        if (routeCoordinates && routeCoordinates.length >= 2) {
          const polyline = L.polyline(routeCoordinates, {
            color: "#2563eb",
            weight: 4,
            dashArray: "6, 8",
            opacity: 0.85,
          });
          routeLayerRef.current.addLayer(polyline);

          // Fit bounds to show both user and responder
          if (mapInstanceRef.current) {
            mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [40, 40] });
          }
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isClient, center.lat, center.lng, markers, routeCoordinates]);

  // Handle center pan
  useEffect(() => {
    if (mapInstanceRef.current && center.lat && center.lng && (!routeCoordinates || routeCoordinates.length < 2)) {
      mapInstanceRef.current.panTo([center.lat, center.lng], { animate: true });
    }
  }, [center.lat, center.lng, routeCoordinates]);

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
