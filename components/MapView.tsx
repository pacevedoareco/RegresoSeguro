"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix standard Leaflet default icon paths in Next.js bundle
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  pickup?: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
  driver?: { lat: number; lng: number } | null;
  onMapClick?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

export default function MapView({
  center = [-34.6037, -58.3816], // Default: Buenos Aires Obelisco
  zoom = 13,
  pickup,
  destination,
  driver,
  onMapClick,
  interactive = true,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{
    pickup?: L.Marker;
    destination?: L.Marker;
    driver?: L.Marker;
  }>({});

  // Map is initialized once on mount. center/zoom/onMapClick/interactive are handled
  // by their own effects below to avoid re-creating the map instance on every render.
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center,
        zoom,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      map.on("click", (e: L.LeafletMouseEvent) => {
        if (onMapClick && interactive) {
          onMapClick(e.latlng.lat, e.latlng.lng);
        }
      });

      mapInstanceRef.current = map;
    }

    return () => {
      // Keep map alive unless unmounted
    };
    // Intentional empty deps — map is created once on mount; subsequent prop changes handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center when changed — only center and zoom are needed; map instance is a stable ref
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  // Update pickup marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (pickup) {
      const pickupIcon = L.divIcon({
        className: "custom-pickup-pin",
        html: `<div style="background-color:#2563eb;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">A</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      if (markersRef.current.pickup) {
        markersRef.current.pickup.setLatLng([pickup.lat, pickup.lng]);
      } else {
        markersRef.current.pickup = L.marker([pickup.lat, pickup.lng], {
          icon: pickupIcon,
        }).addTo(map);
      }
    } else if (markersRef.current.pickup) {
      markersRef.current.pickup.remove();
      delete markersRef.current.pickup;
    }
  }, [pickup]);

  // Update destination marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (destination) {
      const destIcon = L.divIcon({
        className: "custom-dest-pin",
        html: `<div style="background-color:#16a34a;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">B</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      if (markersRef.current.destination) {
        markersRef.current.destination.setLatLng([
          destination.lat,
          destination.lng,
        ]);
      } else {
        markersRef.current.destination = L.marker(
          [destination.lat, destination.lng],
          { icon: destIcon }
        ).addTo(map);
      }
    } else if (markersRef.current.destination) {
      markersRef.current.destination.remove();
      delete markersRef.current.destination;
    }
  }, [destination]);

  // Update driver marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (driver) {
      const driverIcon = L.divIcon({
        className: "custom-driver-pin",
        html: `<div style="background-color:#9333ea;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🚗</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      if (markersRef.current.driver) {
        markersRef.current.driver.setLatLng([driver.lat, driver.lng]);
      } else {
        markersRef.current.driver = L.marker([driver.lat, driver.lng], {
          icon: driverIcon,
        }).addTo(map);
      }
    } else if (markersRef.current.driver) {
      markersRef.current.driver.remove();
      delete markersRef.current.driver;
    }
  }, [driver]);

  // Fit bounds if both pickup & destination are present
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (pickup && destination) {
      const bounds = L.latLngBounds(
        [pickup.lat, pickup.lng],
        [destination.lat, destination.lng]
      );
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [pickup, destination]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full min-h-[260px] rounded-2xl overflow-hidden shadow-inner z-0"
    />
  );
}
