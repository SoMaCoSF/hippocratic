// ==============================================================================
// file_id: SOM-SCR-0016-v1.1.0
// name: MapClient.tsx
// description: Leaflet map with stable rendering, clustering hints, and mobile-first design
// project_id: HIPPOCRATIC
// category: script
// tags: [web, leaflet, map, osm, facilities, mobile]
// created: 2026-01-16
// modified: 2026-01-16
// version: 1.1.0
// agent_id: AGENT-PRIME-002
// execution: Imported by Next.js (dynamic ssr:false)
// ==============================================================================

"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, CircleMarker } from "react-leaflet";
import { useEffect, useMemo, useState, useCallback, memo } from "react";
import type { Facility } from "@/lib/facilities";

// Custom marker icons
const createIcon = (color: string, selected: boolean = false) => {
  const size = selected ? 14 : 10;
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ${selected ? 'transform: scale(1.5);' : ''}
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const defaultIcon = createIcon("#3b82f6");
const selectedIcon = createIcon("#ef4444", true);
const stackedIcon = createIcon("#f59e0b");

function Recenter({ center, zoom }: { center: { lat: number; lng: number } | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    const current = map.getZoom();
    const nextZoom = zoom ?? (current < 8 ? 12 : current);
    map.flyTo([center.lat, center.lng], nextZoom, { animate: true, duration: 0.4 });
  }, [center, zoom, map]);
  return null;
}

// Memoized marker to prevent re-renders
const FacilityMarker = memo(function FacilityMarker({
  facility,
  isSelected,
  isStacked,
  onSelect,
}: {
  facility: Facility;
  isSelected: boolean;
  isStacked: boolean;
  onSelect: (id: string) => void;
}) {
  if (facility.lat == null || facility.lng == null) return null;

  const icon = isSelected ? selectedIcon : isStacked ? stackedIcon : defaultIcon;

  return (
    <Marker
      position={[facility.lat, facility.lng]}
      icon={icon}
      eventHandlers={{
        click: () => onSelect(facility.id),
      }}
    >
      <Popup>
        <div className="min-w-[200px]">
          <div className="font-semibold text-sm text-zinc-900">{facility.name}</div>
          <div className="text-xs text-zinc-600 mt-1">{facility.categoryName ?? "Unknown type"}</div>
          <div className="text-xs text-zinc-500 mt-1">
            {[facility.address, facility.city, facility.zip].filter(Boolean).join(", ")}
          </div>
          {facility.phone && (
            <a href={`tel:${facility.phone}`} className="text-xs text-blue-600 mt-1 block">
              {facility.phone}
            </a>
          )}
          <div className={`text-xs mt-2 font-medium ${facility.inService ? 'text-green-600' : 'text-red-600'}`}>
            {facility.inService ? '● In Service' : '● Not In Service'}
          </div>
        </div>
      </Popup>
    </Marker>
  );
});

export function MapClient({
  facilities,
  selectedId,
  onSelect,
  center,
  userLocation,
  stackedIds,
}: {
  facilities: Facility[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  center: { lat: number; lng: number } | null;
  userLocation?: { lat: number; lng: number } | null;
  stackedIds?: Set<string>;
}) {
  const [mapReady, setMapReady] = useState(false);

  const markers = useMemo(() => {
    return facilities.filter((f) => f.lat != null && f.lng != null).slice(0, 500);
  }, [facilities]);

  const initialCenter: [number, number] = center
    ? [center.lat, center.lng]
    : userLocation
      ? [userLocation.lat, userLocation.lng]
      : [36.7783, -119.4179];

  const initialZoom = center || userLocation ? 12 : 6;

  return (
    <div className="relative h-full w-full">
      {!mapReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <div className="text-sm text-zinc-400">Loading map...</div>
          </div>
        </div>
      )}
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        className="h-full w-full"
        whenReady={() => setMapReady(true)}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <Recenter center={center} />

        {/* User location indicator */}
        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={8}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.5,
              weight: 2,
            }}
          >
            <Popup>Your location</Popup>
          </CircleMarker>
        )}

        {markers.map((f) => (
          <FacilityMarker
            key={f.id}
            facility={f}
            isSelected={selectedId === f.id}
            isStacked={stackedIds?.has(f.id) ?? false}
            onSelect={onSelect}
          />
        ))}
      </MapContainer>

      {/* Map legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-zinc-900/90 backdrop-blur rounded-lg px-3 py-2 text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Facility
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Stacked
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Selected
          </span>
        </div>
      </div>

      {markers.length >= 500 && (
        <div className="absolute top-4 left-4 z-[1000] bg-amber-500/90 text-black px-3 py-1.5 rounded-lg text-xs font-medium">
          Showing 500 of {facilities.length} — zoom in or filter
        </div>
      )}
    </div>
  );
}
