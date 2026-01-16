// ==============================================================================
// file_id: SOM-SCR-0019-v1.1.0
// name: page.tsx
// description: Mobile-first map UI with bottom sheet search/results
// project_id: HIPPOCRATIC
// category: script
// tags: [web, nextjs, map, search, mobile-first]
// created: 2026-01-16
// modified: 2026-01-16
// version: 1.1.0
// agent_id: AGENT-PRIME-002
// execution: Next.js page
// ==============================================================================

"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Facility, FacilityAllMin } from "@/lib/facilities";
import { haversineMiles, norm } from "@/lib/facilities";

const MapClient = dynamic(
  () => import("@/app/components/MapClient").then((m) => m.MapClient),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-zinc-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
);

type Geo = { lat: number; lng: number };
type FacilityWithDistance = Facility & { distanceMiles?: number };

function norm2(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim();
}

function locationKey(f: Facility): string {
  return [norm2(f.address), norm2(f.city), norm2(f.zip)].join("|");
}

// Bottom sheet states
type SheetState = "collapsed" | "peek" | "expanded";

export default function Home() {
  const [data, setData] = useState<FacilityAllMin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState<string>("ALL");
  const [status, setStatus] = useState<"ALL" | "IN_SERVICE" | "NOT_IN_SERVICE">("ALL");
  const [stackedOnly, setStackedOnly] = useState(false);

  const [userLoc, setUserLoc] = useState<Geo | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [radiusMiles, setRadiusMiles] = useState<number>(25);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>("peek");

  const listRef = useRef<HTMLDivElement>(null);

  // Load data
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/data/state/CA/all.min.json", { cache: "force-cache" });
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
        setData(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Location counts for stacked detection
  const locationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!data) return counts;
    for (const r of data.records) {
      const k = locationKey(r);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return counts;
  }, [data]);

  // Stacked facility IDs
  const stackedIds = useMemo(() => {
    const ids = new Set<string>();
    if (!data) return ids;
    for (const r of data.records) {
      if ((locationCounts.get(locationKey(r)) ?? 0) > 1) {
        ids.add(r.id);
      }
    }
    return ids;
  }, [data, locationCounts]);

  // Categories
  const categories = useMemo(() => {
    if (!data) return [];
    const cats = new Set<string>();
    data.records.forEach((r) => r.categoryName && cats.add(r.categoryName));
    return Array.from(cats).sort();
  }, [data]);

  // Filtered results
  const filtered = useMemo(() => {
    if (!data) return [];

    const qLower = norm2(q);
    const rows: FacilityWithDistance[] = [];

    for (const f of data.records) {
      // Stacked filter
      if (stackedOnly && !stackedIds.has(f.id)) continue;

      // Category filter
      if (category !== "ALL" && f.categoryName !== category) continue;

      // Status filter
      if (status === "IN_SERVICE" && f.inService !== true) continue;
      if (status === "NOT_IN_SERVICE" && f.inService !== false) continue;

      // Search filter
      if (qLower) {
        const hay = [f.name, f.categoryName, f.address, f.city, f.zip, f.phone, f.licenseNumber]
          .map(norm2)
          .join(" ");
        if (!hay.includes(qLower)) continue;
      }

      // Distance filter
      if (userLoc && f.lat != null && f.lng != null) {
        const d = haversineMiles(userLoc, { lat: f.lat, lng: f.lng });
        if (d > radiusMiles) continue;
        rows.push({ ...f, distanceMiles: d });
      } else {
        rows.push(f);
      }
    }

    // Sort
    if (userLoc) {
      rows.sort((a, b) => (a.distanceMiles ?? 1e9) - (b.distanceMiles ?? 1e9));
    } else {
      rows.sort((a, b) => a.name.localeCompare(b.name));
    }

    return rows;
  }, [data, q, category, status, stackedOnly, userLoc, radiusMiles, stackedIds]);

  // Map center
  const mapCenter = useMemo<Geo | null>(() => {
    if (selectedId) {
      const f = data?.records.find((r) => r.id === selectedId);
      if (f?.lat != null && f?.lng != null) return { lat: f.lat, lng: f.lng };
    }
    if (userLoc) return userLoc;
    return null;
  }, [selectedId, userLoc, data]);

  const visibleForMap = useMemo(() => filtered.slice(0, 500), [filtered]);

  const onSelect = (id: string) => {
    setSelectedId(id);
    setSheetState("peek");
    // Scroll to card
    setTimeout(() => {
      const el = document.getElementById(`card-${id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  };

  const requestGeo = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const sheetHeight = sheetState === "expanded" ? "70vh" : sheetState === "peek" ? "35vh" : "80px";

  return (
    <div className="h-screen w-screen bg-zinc-900 overflow-hidden">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <div className="text-zinc-400">Loading facilities...</div>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-red-400 text-center p-4">{error}</div>
          </div>
        ) : (
          <MapClient
            facilities={visibleForMap}
            selectedId={selectedId}
            onSelect={onSelect}
            center={mapCenter}
            userLocation={userLoc}
            stackedIds={stackedIds}
          />
        )}
      </div>

      {/* Floating action buttons */}
      <div className="absolute top-4 right-4 z-[1001] flex flex-col gap-2">
        <button
          onClick={requestGeo}
          disabled={geoLoading}
          className="w-12 h-12 rounded-full bg-zinc-800/90 backdrop-blur border border-zinc-700 flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
          title="Find my location"
        >
          {geoLoading ? (
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>

        <Link
          href="/stacked"
          className="w-12 h-12 rounded-full bg-amber-500/90 backdrop-blur flex items-center justify-center text-black shadow-lg active:scale-95 transition-transform"
          title="Stacked facilities dashboard"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </Link>
      </div>

      {/* Bottom sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 z-[1001] bg-zinc-900/95 backdrop-blur-lg rounded-t-2xl border-t border-zinc-700 transition-all duration-300 ease-out"
        style={{ height: sheetHeight }}
      >
        {/* Drag handle */}
        <div
          className="flex justify-center py-3 cursor-pointer"
          onClick={() => {
            if (sheetState === "collapsed") setSheetState("peek");
            else if (sheetState === "peek") setSheetState("expanded");
            else setSheetState("peek");
          }}
        >
          <div className="w-10 h-1 rounded-full bg-zinc-600" />
        </div>

        {/* Search bar */}
        <div className="px-4 pb-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search facilities..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                onFocus={() => setSheetState("expanded")}
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 rounded-xl border ${showFilters ? 'bg-blue-500 border-blue-500' : 'bg-zinc-800 border-zinc-700'} text-white`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="ALL">All types</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="ALL">All status</option>
                <option value="IN_SERVICE">In service</option>
                <option value="NOT_IN_SERVICE">Not in service</option>
              </select>
              <button
                onClick={() => setStackedOnly(!stackedOnly)}
                className={`px-3 py-2 rounded-lg text-sm ${stackedOnly ? 'bg-amber-500 text-black' : 'bg-zinc-800 border border-zinc-700 text-white'}`}
              >
                Stacked only
              </button>
              {userLoc && (
                <select
                  value={radiusMiles}
                  onChange={(e) => setRadiusMiles(Number(e.target.value))}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value={5}>5 mi</option>
                  <option value={10}>10 mi</option>
                  <option value={25}>25 mi</option>
                  <option value={50}>50 mi</option>
                  <option value={100}>100 mi</option>
                </select>
              )}
            </div>
          )}

          {/* Result count */}
          <div className="mt-2 text-xs text-zinc-400">
            {filtered.length.toLocaleString()} facilities
            {userLoc && ` within ${radiusMiles} mi`}
            {stackedOnly && " (stacked)"}
          </div>
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          className="overflow-auto px-4 pb-8"
          style={{ height: `calc(${sheetHeight} - 160px)` }}
        >
          <div className="space-y-2">
            {filtered.slice(0, 100).map((f) => (
              <div
                key={f.id}
                id={`card-${f.id}`}
                onClick={() => onSelect(f.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                  selectedId === f.id
                    ? "bg-blue-500/20 border-blue-500"
                    : "bg-zinc-800/50 border-zinc-700 active:bg-zinc-700"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-white truncate">{f.name}</div>
                    <div className="text-xs text-zinc-400 truncate mt-0.5">
                      {f.categoryName}
                    </div>
                    <div className="text-xs text-zinc-500 truncate mt-0.5">
                      {f.address}, {f.city}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {f.distanceMiles != null && (
                      <div className="text-xs text-blue-400">{f.distanceMiles.toFixed(1)} mi</div>
                    )}
                    <div className={`text-xs mt-1 ${f.inService ? 'text-green-400' : 'text-red-400'}`}>
                      {f.inService ? "Active" : "Inactive"}
                    </div>
                    {stackedIds.has(f.id) && (
                      <div className="text-xs text-amber-400 mt-1">Stacked</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length > 100 && (
              <div className="text-center text-zinc-500 text-sm py-4">
                Showing 100 of {filtered.length} — refine search
              </div>
            )}
            {filtered.length === 0 && !loading && (
              <div className="text-center text-zinc-500 py-8">
                No facilities found. Try adjusting filters.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Header overlay */}
      <div className="absolute top-4 left-4 z-[1001]">
        <div className="bg-zinc-900/90 backdrop-blur rounded-xl px-4 py-2 border border-zinc-700">
          <div className="font-semibold text-white">Hippocratic</div>
          <div className="text-xs text-zinc-400">CA Healthcare Facilities</div>
        </div>
      </div>
    </div>
  );
}
