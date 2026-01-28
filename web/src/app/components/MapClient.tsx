// ==============================================================================
// file_id: SOM-SCR-0016-v4.0.0
// name: MapClient.tsx
// description: Leaflet map with facility card popups and financial data
// project_id: HIPPOCRATIC
// category: script
// tags: [web, leaflet, map, osm, facilities, mobile, duplicates, financials]
// created: 2026-01-16
// modified: 2026-01-28
// version: 4.0.0
// agent_id: AGENT-PRIME-002
// execution: Imported by Next.js (dynamic ssr:false)
// ==============================================================================

"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, CircleMarker, useMapEvents } from "react-leaflet";
import { useEffect, useMemo, useState, memo, useCallback } from "react";
import type { Facility } from "@/lib/facilities";
import { googleMapsLink, streetViewLink, zillowLink } from "@/lib/facilities";
import {
  type DuplicateGroup,
  getPrimaryDuplicateType,
  getDuplicateColor,
  getDuplicateBadgeClass,
} from "@/lib/duplicates";
import { formatCurrency, formatNumber, type FinancialData, hasFinancialData } from "@/lib/financials";
import { loadDraft, saveDraft, type FacilityObservationDraft, type YesNoUnknown } from "@/lib/observations";

// Marker colors
const COLORS = {
  standard: "#3b82f6", // blue
  selected: "#ef4444", // red
  address: "#f59e0b", // amber
  phone: "#a855f7", // purple
  owner: "#06b6d4", // cyan
  admin: "#ec4899", // pink
  multiple: "#ef4444", // red
};

// Create icons at different sizes for zoom levels
const createIcon = (color: string, size: number, selected: boolean = false) => {
  const actualSize = selected ? size * 1.8 : size;
  
  if (selected) {
    // Pillar of light effect for selected marker
    return L.divIcon({
      className: "custom-marker-selected",
      html: `
        <div style="position: relative; width: ${actualSize}px; height: ${actualSize}px;">
          <!-- Pillar of light beam -->
          <div style="
            position: absolute;
            bottom: ${actualSize / 2}px;
            left: 50%;
            transform: translateX(-50%);
            width: 4px;
            height: 200px;
            background: linear-gradient(to top, ${color}, transparent);
            animation: pillarPulse 2s ease-in-out infinite;
            opacity: 0.8;
            z-index: -1;
          "></div>
          
          <!-- Outer glow rings -->
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: ${actualSize * 2}px;
            height: ${actualSize * 2}px;
            background: radial-gradient(circle, ${color}40, transparent 70%);
            border-radius: 50%;
            animation: pulseGlow 2s ease-in-out infinite;
          "></div>
          
          <!-- Middle ring -->
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: ${actualSize * 1.5}px;
            height: ${actualSize * 1.5}px;
            background: ${color};
            opacity: 0.3;
            border-radius: 50%;
            animation: pulseRing 2s ease-in-out infinite;
          "></div>
          
          <!-- Main marker -->
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: ${actualSize}px;
            height: ${actualSize}px;
            background: ${color};
            border: 4px solid white;
            border-radius: 50%;
            box-shadow: 0 0 20px ${color}, 0 0 40px ${color}80, 0 4px 12px rgba(0,0,0,0.6);
            cursor: pointer;
            animation: bounce 2s ease-in-out infinite;
          "></div>
        </div>
        <style>
          @keyframes pillarPulse {
            0%, 100% { opacity: 0.4; height: 180px; }
            50% { opacity: 0.8; height: 220px; }
          }
          @keyframes pulseGlow {
            0%, 100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.3; }
            50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.6; }
          }
          @keyframes pulseRing {
            0%, 100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.2; }
            50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.4; }
          }
          @keyframes bounce {
            0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
            50% { transform: translate(-50%, -50%) translateY(-4px); }
          }
        </style>
      `,
      iconSize: [actualSize * 2, actualSize * 2],
      iconAnchor: [actualSize, actualSize],
    });
  }
  
  // Normal marker
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: ${actualSize}px;
      height: ${actualSize}px;
      background: ${color};
      border: ${Math.max(2, size / 6)}px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      cursor: pointer;
      transition: transform 0.1s ease;
    " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"></div>`,
    iconSize: [actualSize, actualSize],
    iconAnchor: [actualSize / 2, actualSize / 2],
  });
};

// Get marker size based on zoom level
function getMarkerSize(zoom: number): number {
  if (zoom >= 15) return 24;
  if (zoom >= 13) return 20;
  if (zoom >= 11) return 16;
  if (zoom >= 9) return 14;
  if (zoom >= 7) return 12;
  return 10;
}

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

// Component to track zoom level
function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
}

// Memoized marker
const FacilityMarker = memo(function FacilityMarker({
  facility,
  isSelected,
  duplicateGroups,
  onSelect,
  markerSize,
}: {
  facility: Facility;
  isSelected: boolean;
  duplicateGroups?: DuplicateGroup[];
  onSelect: (id: string) => void;
  markerSize: number;
}) {
  if (facility.lat == null || facility.lng == null) return null;

  // Determine marker color based on duplicate type
  let color = COLORS.standard;
  if (isSelected) {
    color = COLORS.selected;
  } else if (duplicateGroups && duplicateGroups.length > 0) {
    const primaryType = getPrimaryDuplicateType(duplicateGroups);
    color = getDuplicateColor(primaryType);
  }

  const icon = createIcon(color, markerSize, isSelected);

  // Build duplicate info for popup
  const dupeInfo = duplicateGroups && duplicateGroups.length > 0 ? (
    <div className="mt-2 pt-2 border-t border-zinc-300">
      <div className="text-xs font-semibold text-red-600 mb-1">Duplicates Found:</div>
      {duplicateGroups.map((g, i) => (
        <div key={i} className="text-xs text-zinc-600">
          • {g.type}: {g.facilityIds.length} facilities share this
        </div>
      ))}
    </div>
  ) : null;

  return (
    <Marker
      position={[facility.lat, facility.lng]}
      icon={icon}
      eventHandlers={{
        click: () => onSelect(facility.id),
      }}
    >
      <Popup>
        <div className="min-w-[250px] max-w-[300px]">
          <div className="font-bold text-sm text-zinc-900">{facility.name}</div>
          <div className="text-xs text-blue-600 font-medium mt-1">{facility.categoryName ?? "Unknown type"}</div>
          <div className="text-xs text-zinc-500 mt-1">
            {[facility.address, facility.city, facility.zip].filter(Boolean).join(", ")}
          </div>
          {facility.phone && (
            <a href={`tel:${facility.phone}`} className="text-xs text-blue-600 mt-1 block hover:underline">
              📞 {facility.phone}
            </a>
          )}
          {facility.licenseNumber && (
            <div className="text-xs text-zinc-500 mt-1">License: {facility.licenseNumber}</div>
          )}
          <div className={`text-xs mt-2 font-semibold ${facility.inService ? "text-green-600" : "text-red-600"}`}>
            {facility.inService ? "✓ In Service" : "✗ Not In Service"}
          </div>
          {dupeInfo}
        </div>
      </Popup>
    </Marker>
  );
});

// Floating facility card overlay component
function FacilityCardOverlay({
  facility,
  financialData,
  duplicateGroups,
  onClose,
  onShowDuplicates,
}: {
  facility: Facility;
  financialData?: FinancialData | null;
  duplicateGroups?: DuplicateGroup[];
  onClose: () => void;
  onShowDuplicates?: (group: DuplicateGroup) => void;
}) {
  const [draft, setDraft] = useState<FacilityObservationDraft>(() => loadDraft("CA", facility.id));
  const mapsLink = googleMapsLink(facility);
  const streetLink = streetViewLink(facility);
  const zLink = zillowLink(facility);

  const handleRating = (star: number) => {
    const newDraft = { ...draft, rating: draft.rating === star ? null : star };
    setDraft(newDraft);
    saveDraft("CA", newDraft);
  };

  const setField = <K extends keyof FacilityObservationDraft>(key: K, value: FacilityObservationDraft[K]) => {
    const newDraft = { ...draft, [key]: value };
    setDraft(newDraft);
  };

  const saveObservation = () => {
    saveDraft("CA", draft);
    setDraft(loadDraft("CA", facility.id));
  };

  const hasDuplicates = duplicateGroups && duplicateGroups.length > 0;
  const primaryType = hasDuplicates ? getPrimaryDuplicateType(duplicateGroups) : null;

  return (
    <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[1100] max-h-[70vh] overflow-y-auto">
      <div className={`bg-zinc-900/95 backdrop-blur border rounded-xl shadow-2xl ${
        hasDuplicates
          ? primaryType === "multiple"
            ? "border-red-500"
            : "border-amber-500"
          : "border-zinc-700"
      }`}>
        {/* Header */}
        <div className="p-3 border-b border-zinc-700 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-bold text-white text-base leading-tight">{facility.name}</div>
            <div className="text-sm text-blue-400 mt-0.5">{facility.categoryName}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className={`text-xs font-medium px-2 py-1 rounded ${
              facility.inService ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            }`}>
              {facility.inService ? "Active" : "Inactive"}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Address & Contact */}
          <div className="space-y-1">
            {mapsLink ? (
              <a
                href={mapsLink}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-zinc-300 hover:text-blue-300 hover:underline block"
              >
                📍 {facility.address}, {facility.city} {facility.zip}
              </a>
            ) : (
              <div className="text-sm text-zinc-400">{facility.address}, {facility.city}</div>
            )}
            {facility.phone && (
              <a
                href={`tel:${facility.phone.replace(/[^0-9+]/g, "")}`}
                className="text-sm text-green-400 hover:text-green-300 hover:underline block"
              >
                📞 {facility.phone}
              </a>
            )}
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap gap-2">
            {mapsLink && (
              <a href={mapsLink} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600">
                Google Maps
              </a>
            )}
            {streetLink && (
              <a href={streetLink} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600">
                Street View
              </a>
            )}
            {zLink && (
              <a href={zLink} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600">
                Zillow
              </a>
            )}
          </div>

          {/* Star Rating */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Rating:</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  className={`text-xl ${draft.rating != null && draft.rating >= star ? "text-yellow-400" : "text-zinc-600 hover:text-yellow-400"}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Financial Data */}
          {financialData && hasFinancialData(financialData) && (
            <div className="bg-zinc-800 rounded-lg p-2">
              <div className="text-[10px] text-zinc-500 font-medium mb-1.5">HCAI Financial Data (2024)</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(financialData.hhahMediCalVisits != null || financialData.hhahMedicareVisits != null) && (
                  <>
                    <div>
                      <div className="text-zinc-500">Medi-Cal Visits</div>
                      <div className="text-zinc-200">{formatNumber(financialData.hhahMediCalVisits)}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Medicare Visits</div>
                      <div className="text-zinc-200">{formatNumber(financialData.hhahMedicareVisits)}</div>
                    </div>
                  </>
                )}
                {financialData.hospiceTotalRevenue != null && (
                  <>
                    <div>
                      <div className="text-zinc-500">Total Revenue</div>
                      <div className="text-green-400">{formatCurrency(financialData.hospiceTotalRevenue)}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Net Income</div>
                      <div className={financialData.hospiceNetIncome != null && financialData.hospiceNetIncome < 0 ? "text-red-400" : "text-green-400"}>
                        {formatCurrency(financialData.hospiceNetIncome)}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Duplicate badges */}
          {hasDuplicates && (
            <div className="flex flex-wrap gap-1.5">
              {duplicateGroups.map((g, i) => (
                <button
                  key={i}
                  onClick={() => onShowDuplicates?.(g)}
                  className={`text-xs px-2 py-1 rounded border cursor-pointer hover:opacity-80 font-medium ${getDuplicateBadgeClass(g.type)}`}
                >
                  {g.type}: {g.facilityIds.length} →
                </button>
              ))}
            </div>
          )}

          {/* Observation Checklist */}
          <div className="bg-zinc-800 rounded-lg p-2">
            <div className="text-[10px] text-zinc-500 font-medium mb-1.5">Field Observation Checklist</div>
            <div className="space-y-1.5">
              {[
                { key: "signagePresent" as const, label: "Signage" },
                { key: "appearsOpen" as const, label: "Open" },
                { key: "doorLocked" as const, label: "Locked" },
                { key: "staffedObserved" as const, label: "Staff" },
                { key: "clientsObserved" as const, label: "Clients" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">{label}</span>
                  <div className="flex gap-1">
                    {(["yes", "no", "unknown"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setField(key, v)}
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          draft[key] === v
                            ? "bg-blue-500 text-white"
                            : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                        }`}
                      >
                        {v === "yes" ? "Y" : v === "no" ? "N" : "?"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <textarea
                value={draft.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Notes..."
                className="w-full mt-1 p-1.5 rounded bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 placeholder-zinc-500 resize-none"
                rows={2}
              />
              <button
                onClick={saveObservation}
                className="w-full py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
              >
                Save Observation
              </button>
            </div>
          </div>

          {/* License Info */}
          {facility.licenseNumber && (
            <div className="text-xs text-zinc-500">
              License: {facility.licenseNumber} ({facility.licenseStatus ?? "Unknown"})
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type DuplicateFilterType = "address" | "phone" | "owner" | "admin" | "any" | "none";

export function MapClient({
  facilities,
  selectedId,
  onSelect,
  center,
  userLocation,
  duplicatesByFacility,
  financialData,
  onShowDuplicates,
  currentFilter,
  onFilterChange,
}: {
  facilities: Facility[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  center: { lat: number; lng: number } | null;
  userLocation?: { lat: number; lng: number } | null;
  duplicatesByFacility?: Map<string, DuplicateGroup[]>;
  financialData?: Map<string, FinancialData>;
  onShowDuplicates?: (group: DuplicateGroup) => void;
  currentFilter?: DuplicateFilterType;
  onFilterChange?: (filter: DuplicateFilterType) => void;
}) {
  const [mapReady, setMapReady] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(6);

  const handleZoomChange = useCallback((zoom: number) => {
    setCurrentZoom(zoom);
  }, []);

  const markerSize = getMarkerSize(currentZoom);

  const markers = useMemo(() => {
    return facilities.filter((f) => f.lat != null && f.lng != null).slice(0, 500);
  }, [facilities]);

  const initialCenter: [number, number] = center
    ? [center.lat, center.lng]
    : userLocation
      ? [userLocation.lat, userLocation.lng]
      : [36.7783, -119.4179];

  const initialZoom = center || userLocation ? 12 : 6;

  // Count duplicates for legend
  const duplicateCounts = useMemo(() => {
    if (!duplicatesByFacility) return { address: 0, phone: 0, owner: 0, admin: 0, multiple: 0 };

    let address = 0, phone = 0, owner = 0, admin = 0, multiple = 0;
    for (const f of markers) {
      const groups = duplicatesByFacility.get(f.id);
      if (!groups || groups.length === 0) continue;

      const types = new Set(groups.map((g) => g.type));
      if (types.size > 1) {
        multiple++;
      } else {
        const t = groups[0].type;
        if (t === "address") address++;
        else if (t === "phone") phone++;
        else if (t === "owner") owner++;
        else if (t === "admin") admin++;
      }
    }
    return { address, phone, owner, admin, multiple };
  }, [duplicatesByFacility, markers]);

  const totalDupes = duplicateCounts.address + duplicateCounts.phone + duplicateCounts.owner + duplicateCounts.admin + duplicateCounts.multiple;

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
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <Recenter center={center} />
        <ZoomTracker onZoomChange={handleZoomChange} />

        {/* User location indicator */}
        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={10}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.6,
              weight: 3,
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
            duplicateGroups={duplicatesByFacility?.get(f.id)}
            onSelect={onSelect}
            markerSize={markerSize}
          />
        ))}
      </MapContainer>

      {/* Enhanced map legend - CLICKABLE FILTERS */}
      <div className="hidden md:block absolute bottom-4 left-4 z-[1000] bg-zinc-900/95 backdrop-blur rounded-xl p-3 text-xs shadow-xl border border-zinc-700">
        <div className="font-bold text-zinc-300 mb-2">Filter by Type (click)</div>
        <div className="space-y-1">
          {/* Standard / All */}
          <button
            onClick={() => onFilterChange?.("any")}
            className={`w-full flex items-center gap-2 px-2 py-1 rounded transition-colors ${
              currentFilter === "any" || !currentFilter ? "bg-blue-500/30 ring-1 ring-blue-400" : "hover:bg-zinc-800"
            }`}
          >
            <span className="w-3 h-3 rounded-full" style={{ background: COLORS.standard }} />
            <span className="text-zinc-300">All facilities</span>
          </button>

          {/* No duplicates */}
          <button
            onClick={() => onFilterChange?.("none")}
            className={`w-full flex items-center gap-2 px-2 py-1 rounded transition-colors ${
              currentFilter === "none" ? "bg-zinc-500/30 ring-1 ring-zinc-400" : "hover:bg-zinc-800"
            }`}
          >
            <span className="w-3 h-3 rounded-full border border-zinc-500" style={{ background: "transparent" }} />
            <span className="text-zinc-400">No duplicates</span>
          </button>

          {totalDupes > 0 && (
            <>
              {duplicateCounts.address > 0 && (
                <button
                  onClick={() => onFilterChange?.("address")}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded transition-colors ${
                    currentFilter === "address" ? "bg-amber-500/30 ring-1 ring-amber-400" : "hover:bg-zinc-800"
                  }`}
                >
                  <span className="w-3 h-3 rounded-full" style={{ background: COLORS.address }} />
                  <span className="text-zinc-300">Address ({duplicateCounts.address})</span>
                </button>
              )}
              {duplicateCounts.phone > 0 && (
                <button
                  onClick={() => onFilterChange?.("phone")}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded transition-colors ${
                    currentFilter === "phone" ? "bg-purple-500/30 ring-1 ring-purple-400" : "hover:bg-zinc-800"
                  }`}
                >
                  <span className="w-3 h-3 rounded-full" style={{ background: COLORS.phone }} />
                  <span className="text-zinc-300">Phone ({duplicateCounts.phone})</span>
                </button>
              )}
              {duplicateCounts.owner > 0 && (
                <button
                  onClick={() => onFilterChange?.("owner")}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded transition-colors ${
                    currentFilter === "owner" ? "bg-cyan-500/30 ring-1 ring-cyan-400" : "hover:bg-zinc-800"
                  }`}
                >
                  <span className="w-3 h-3 rounded-full" style={{ background: COLORS.owner }} />
                  <span className="text-zinc-300">Owner ({duplicateCounts.owner})</span>
                </button>
              )}
              {duplicateCounts.admin > 0 && (
                <button
                  onClick={() => onFilterChange?.("admin")}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded transition-colors ${
                    currentFilter === "admin" ? "bg-pink-500/30 ring-1 ring-pink-400" : "hover:bg-zinc-800"
                  }`}
                >
                  <span className="w-3 h-3 rounded-full" style={{ background: COLORS.admin }} />
                  <span className="text-zinc-300">Admin ({duplicateCounts.admin})</span>
                </button>
              )}
              {duplicateCounts.multiple > 0 && (
                <button
                  onClick={() => onFilterChange?.("any")}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded transition-colors hover:bg-zinc-800`}
                >
                  <span className="w-3 h-3 rounded-full" style={{ background: COLORS.multiple }} />
                  <span className="text-zinc-300">Multiple ({duplicateCounts.multiple})</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Facility count badge - positioned to avoid mobile menu button */}
      <div className="absolute top-4 left-20 md:left-4 z-[1000] bg-zinc-900/95 backdrop-blur rounded-lg px-3 py-2 text-xs font-medium border border-zinc-700">
        <span className="text-blue-400">{markers.length}</span>
        <span className="text-zinc-400"> facilities on map</span>
        {markers.length >= 500 && (
          <span className="text-amber-400 ml-1">(max 500)</span>
        )}
      </div>

      {/* Selected Facility Card Overlay */}
      {selectedId && (() => {
        const selectedFacility = markers.find((f) => f.id === selectedId);
        if (!selectedFacility) return null;

        const fin = financialData?.get(selectedFacility.id) ||
          (selectedFacility.licenseNumber ? financialData?.get(`lic:${selectedFacility.licenseNumber}`) : null);

        return (
          <FacilityCardOverlay
            facility={selectedFacility}
            financialData={fin}
            duplicateGroups={duplicatesByFacility?.get(selectedId)}
            onClose={() => onSelect("")}
            onShowDuplicates={onShowDuplicates}
          />
        );
      })()}
    </div>
  );
}
