// ==============================================================================
// file_id: SOM-SCR-0019-v0.1.1
// name: page.tsx
// description: Main UI (map + search + filters + same-address stack toggle)
// project_id: HIPPOCRATIC
// category: script
// tags: [web, nextjs, map, search, filter, fraud]
// created: 2026-01-16
// modified: 2026-01-16
// version: 0.1.1
// agent_id: AGENT-CURSOR-OPENAI
// execution: Next.js page
// ==============================================================================

"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Facility, FacilityAllMin } from "@/lib/facilities";
import { haversineMiles, norm } from "@/lib/facilities";
import { FacilityCard } from "@/app/components/FacilityCard";

const MapClient = dynamic(
  () => import("@/app/components/MapClient").then((m) => m.MapClient),
  { ssr: false },
);

type Geo = { lat: number; lng: number };
type FacilityWithDistance = Facility & { distanceMiles?: number };

function uniqSorted(xs: string[]) {
  return Array.from(new Set(xs)).sort((a, b) => a.localeCompare(b));
}

function locationKey(f: Facility): string {
  // Normalize for “stacked licenses” detection. (We’ll add phone/email/etc later.)
  return [
    norm(f.address),
    norm(f.city),
    norm(f.zip),
  ].join("|");
}

export default function Home() {
  const [data, setData] = useState<FacilityAllMin | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("ALL");
  const [status, setStatus] = useState<"ALL" | "IN_SERVICE" | "NOT_IN_SERVICE" | "UNKNOWN">("ALL");
  const [sameLocationOnly, setSameLocationOnly] = useState<boolean>(false);

  const [userLoc, setUserLoc] = useState<Geo | null>(null);
  const [radiusMiles, setRadiusMiles] = useState<number>(10);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRef = useRef<HTMLDivElement | null>(null);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    // Theme: default dark; persisted in localStorage.
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("hippocratic.theme") : null;
    const isDark = stored ? stored === "dark" : true;
    setDark(isDark);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", isDark);
    }

    (async () => {
      try {
        const res = await fetch("/data/state/CA/all.min.json", { cache: "force-cache" });
        if (!res.ok) throw new Error(`Failed to load data: ${res.status}`);
        const j = (await res.json()) as FacilityAllMin;
        setData(j);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  const byId = useMemo(() => {
    const m = new Map<string, Facility>();
    if (!data) return m;
    for (const r of data.records) m.set(r.id, r);
    return m;
  }, [data]);

  const locationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!data) return counts;
    for (const r of data.records) {
      const k = locationKey(r);
      if (!k) continue;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return counts;
  }, [data]);

  const categories = useMemo(() => {
    if (!data) return [];
    return uniqSorted(
      data.records
        .map((r) => (r.categoryName ? String(r.categoryName) : ""))
        .filter(Boolean),
    );
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];

    const qn = norm(q);
    const wantCategory = category !== "ALL" ? category : null;

    const rows: FacilityWithDistance[] = [];
    for (const f of data.records) {
      if (sameLocationOnly) {
        const c = locationCounts.get(locationKey(f)) ?? 0;
        if (c <= 1) continue;
      }
      if (wantCategory && f.categoryName !== wantCategory) continue;

      if (status === "IN_SERVICE" && f.inService !== true) continue;
      if (status === "NOT_IN_SERVICE" && f.inService !== false) continue;
      if (status === "UNKNOWN" && f.inService != null) continue;

      if (qn) {
        const hay = [
          f.name,
          f.categoryName,
          f.categoryCode,
          f.licenseStatus,
          f.licenseNumber,
          f.address,
          f.city,
          f.zip,
          f.county,
          f.phone,
        ]
          .map(norm)
          .join(" | ");
        if (!hay.includes(qn)) continue;
      }

      if (userLoc && f.lat != null && f.lng != null) {
        const d = haversineMiles(userLoc, { lat: f.lat, lng: f.lng });
        if (radiusMiles > 0 && d > radiusMiles) continue;
        rows.push({ ...f, distanceMiles: d });
      } else {
        rows.push(f);
      }
    }

    if (userLoc) {
      rows.sort((a, b) => (a.distanceMiles ?? 1e9) - (b.distanceMiles ?? 1e9));
    } else {
      rows.sort((a, b) => a.name.localeCompare(b.name));
    }
    return rows;
  }, [data, q, category, status, userLoc, radiusMiles, sameLocationOnly, locationCounts]);

  const mapCenter = useMemo<Geo | null>(() => {
    if (userLoc) return userLoc;
    const sel = selectedId ? byId.get(selectedId) ?? null : null;
    if (sel?.lat != null && sel?.lng != null) return { lat: sel.lat, lng: sel.lng };
    return null;
  }, [selectedId, userLoc, byId]);

  const visibleForMap = useMemo(() => filtered.slice(0, 800), [filtered]);

  const onSelect = (id: string) => {
    setSelectedId(id);
    // the ref is attached to selected card wrapper below
    setTimeout(() => selectedRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 0);
  };

  const requestGeo = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setError(err.message),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  return (
    <div className="h-screen w-screen bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between gap-3 border-b bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Hippocratic — CA Facility Map
          </div>
          <div className="truncate text-xs text-zinc-600 dark:text-zinc-400">
            Data: {data ? `${data.recordCount.toLocaleString()} facilities (all.min.json)` : "loading…"}
            {data?.generatedAt ? ` • built ${data.generatedAt}` : ""}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            href="/stacked"
          >
            Stacked dashboard
          </Link>
          <button
            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            onClick={() => {
              const next = !dark;
              setDark(next);
              if (typeof document !== "undefined") document.documentElement.classList.toggle("dark", next);
              if (typeof window !== "undefined") window.localStorage.setItem("hippocratic.theme", next ? "dark" : "light");
            }}
            type="button"
          >
            {dark ? "Light" : "Dark"}
          </button>
          <button
            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            onClick={requestGeo}
            type="button"
          >
            Near me
          </button>
          <button
            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            onClick={() => {
              setUserLoc(null);
              setSelectedId(null);
              setQ("");
              setCategory("ALL");
              setStatus("ALL");
            }}
            type="button"
          >
            Reset
          </button>
        </div>
      </header>

      <div className="grid h-[calc(100vh-57px)] grid-cols-1 lg:grid-cols-[440px_1fr]">
        <aside className="flex h-full flex-col border-r bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b px-4 py-3 dark:border-zinc-800">
            <div className="grid grid-cols-1 gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search any field: hospice, home health, name, zip, phone…"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="rounded-md border border-zinc-200 bg-white px-2 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="ALL">All types</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "ALL" | "IN_SERVICE" | "NOT_IN_SERVICE" | "UNKNOWN")
                  }
                  className="rounded-md border border-zinc-200 bg-white px-2 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="ALL">All status</option>
                  <option value="IN_SERVICE">In service</option>
                  <option value="NOT_IN_SERVICE">Not in service</option>
                  <option value="UNKNOWN">Unknown</option>
                </select>
                <input
                  type="number"
                  min={0}
                  value={radiusMiles}
                  onChange={(e) => setRadiusMiles(Number(e.target.value))}
                  className="rounded-md border border-zinc-200 bg-white px-2 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  title="Near-me radius (miles). 0 disables radius filter."
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={sameLocationOnly}
                  onChange={(e) => setSameLocationOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
                Show only “stacked” facilities (same address)
              </label>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                Showing <span className="font-medium">{filtered.length.toLocaleString()}</span> results
                {userLoc ? ` within ${radiusMiles} mi` : ""}.
                {filtered.length > 800 ? " Map shows first 800—refine filters to reduce." : ""}
              </div>
              {error ? <div className="text-xs text-red-600">{error}</div> : null}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-3">
            <div className="space-y-2">
              {filtered.slice(0, 300).map((f) => {
                const wrapProps =
                  selectedId === f.id
                    ? { ref: (el: HTMLDivElement | null) => { selectedRef.current = el; } }
                    : {};
                return (
                  <div key={f.id} {...wrapProps}>
                    <FacilityCard
                      facility={f}
                      selected={selectedId === f.id}
                      distanceMiles={("distanceMiles" in f ? f.distanceMiles : null) ?? null}
                      sameLocationCount={locationCounts.get(locationKey(f)) ?? null}
                      onSelect={onSelect}
                    />
                  </div>
                );
              })}
              {filtered.length > 300 ? (
                <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
                  List is capped at 300 for the MVP. Refine search/filters (or use near-me radius).
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <main className="relative h-full">
          <MapClient facilities={visibleForMap} selectedId={selectedId} onSelect={onSelect} center={mapCenter} />
          {userLoc ? (
            <div className="absolute left-3 top-3 rounded-md border border-zinc-200 bg-white/95 px-3 py-2 text-xs text-zinc-800 shadow dark:border-zinc-800 dark:bg-zinc-950/90 dark:text-zinc-200">
              Near me: {userLoc.lat.toFixed(4)}, {userLoc.lng.toFixed(4)}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
