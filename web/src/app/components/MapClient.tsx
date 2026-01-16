// ==============================================================================
// file_id: SOM-SCR-0016-v0.1.0
// name: MapClient.tsx
// description: Leaflet map client component (free OSM tiles) with selectable facility markers
// project_id: HIPPOCRATIC
// category: script
// tags: [web, leaflet, map, osm, facilities]
// created: 2026-01-16
// modified: 2026-01-16
// version: 0.1.0
// agent_id: AGENT-CURSOR-OPENAI
// execution: Imported by Next.js (dynamic ssr:false)
// ==============================================================================

"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { useEffect, useMemo } from "react";
import type { Facility } from "@/lib/facilities";

// Fix default marker icons in bundlers
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function Recenter({ center }: { center: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    // Important: don't constantly force a zoom level; it makes user zoom feel "broken".
    // Only bump zoom if the map is extremely zoomed out.
    const current = map.getZoom();
    const nextZoom = current < 8 ? 12 : current;
    map.flyTo([center.lat, center.lng], nextZoom, { animate: true, duration: 0.6 });
  }, [center, map]);
  return null;
}

export function MapClient({
  facilities,
  selectedId,
  onSelect,
  center,
}: {
  facilities: Facility[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  center: { lat: number; lng: number } | null;
}) {
  const markers = useMemo(() => {
    // Avoid trying to render thousands of markers in MVP; encourage filtering.
    const withCoords = facilities.filter((f) => f.lat != null && f.lng != null);
    return withCoords.slice(0, 800);
  }, [facilities]);

  const initialCenter: [number, number] = center ? [center.lat, center.lng] : [36.7783, -119.4179]; // CA center-ish
  const initialZoom = center ? 12 : 6;

  return (
    <MapContainer center={initialCenter} zoom={initialZoom} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} />
      {markers.map((f) => (
        <Marker
          key={f.id}
          position={[f.lat as number, f.lng as number]}
          eventHandlers={{
            click: () => onSelect(f.id),
          }}
        >
          <Popup>
            <div className="text-sm font-semibold">{f.name}</div>
            <div className="text-xs text-zinc-700">{f.categoryName ?? ""}</div>
            <div className="text-xs text-zinc-700">{[f.address, f.city, f.zip].filter(Boolean).join(", ")}</div>
            {selectedId === f.id ? <div className="mt-1 text-xs">Selected</div> : null}
          </Popup>
        </Marker>
      ))}
      {facilities.length > markers.length ? (
        // MapContainer children can include fragments; keep simple text note via an empty div overlay in page layout instead.
        <></>
      ) : null}
    </MapContainer>
  );
}



