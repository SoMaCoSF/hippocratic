// ==============================================================================
// file_id: SOM-SCR-0019-v4.0.0
// name: page.tsx
// description: Sidebar-based map UI with financial data, observation checklist, and clickable duplicates
// project_id: HIPPOCRATIC
// category: script
// tags: [web, nextjs, map, sidebar, duplicates, fraud-detection, financials, observations]
// created: 2026-01-16
// modified: 2026-01-28
// version: 4.0.0
// agent_id: AGENT-PRIME-002
// execution: Next.js page
// ==============================================================================

"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import type { Facility, FacilityAllMin } from "@/lib/facilities";
import { haversineMiles, formatAddress, googleMapsLink, streetViewLink, zillowLink } from "@/lib/facilities";
import {
  detectDuplicates,
  getDuplicateBadgeClass,
  getPrimaryDuplicateType,
  type DuplicateGroup,
  type DuplicateResult,
  type DuplicateType,
} from "@/lib/duplicates";
import {
  parseFinancialCSV,
  formatCurrency,
  formatNumber,
  hasFinancialData,
  type FinancialData,
} from "@/lib/financials";
import {
  loadDraft,
  saveDraft,
  type FacilityObservationDraft,
  type YesNoUnknown,
} from "@/lib/observations";

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
type DuplicateFilter = DuplicateType | "any" | "none";
type SortOption = "name" | "distance" | "category" | "duplicates";

function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim();
}

function locationKey(f: Facility): string {
  return [norm(f.address), norm(f.city), norm(f.zip)].join("|");
}

export default function Home() {
  const [data, setData] = useState<FacilityAllMin | null>(null);
  const [financialData, setFinancialData] = useState<Map<string, FinancialData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("ALL");
  const [status, setStatus] = useState<"ALL" | "IN_SERVICE" | "NOT_IN_SERVICE">("ALL");
  const [duplicateFilter, setDuplicateFilter] = useState<DuplicateFilter>("any");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [stackedOnly, setStackedOnly] = useState(false);

  const [userLoc, setUserLoc] = useState<Geo | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [radiusMiles, setRadiusMiles] = useState<number>(100);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Start collapsed on mobile
  const [showDuplicateList, setShowDuplicateList] = useState<DuplicateGroup | null>(null);
  const [observationDraft, setObservationDraft] = useState<FacilityObservationDraft | null>(null);

  // Load facility data
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

  // Load financial data
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/data/enrichment/state/CA/hcai_hhah_util_2024.csv");
        if (res.ok) {
          const text = await res.text();
          setFinancialData(parseFinancialCSV(text));
        }
      } catch {
        // Financial data is optional
      }
    })();
  }, []);

  // Load observation draft when selection changes
  useEffect(() => {
    if (selectedId) {
      setObservationDraft(loadDraft("CA", selectedId));
    } else {
      setObservationDraft(null);
    }
  }, [selectedId]);

  // Auto-expand sidebar on desktop, keep collapsed on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarCollapsed(false);
      }
    };
    handleResize(); // Check on mount
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Duplicate detection
  const duplicateResult = useMemo<DuplicateResult | null>(() => {
    if (!data) return null;
    return detectDuplicates(data.records);
  }, [data]);

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

  // Stacked facility IDs (2+ at same address)
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

    const qLower = norm(q);
    const rows: FacilityWithDistance[] = [];

    for (const f of data.records) {
      // Stacked filter
      if (stackedOnly && !stackedIds.has(f.id)) continue;

      // Duplicate filter
      if (duplicateFilter !== "any" && duplicateResult) {
        const dupes = duplicateResult.byFacility.get(f.id);
        if (duplicateFilter === "none") {
          if (dupes && dupes.length > 0) continue;
        } else {
          if (!dupes || !dupes.some((g) => g.type === duplicateFilter)) continue;
        }
      }

      // Category filter
      if (category !== "ALL" && f.categoryName !== category) continue;

      // Status filter
      if (status === "IN_SERVICE" && f.inService !== true) continue;
      if (status === "NOT_IN_SERVICE" && f.inService !== false) continue;

      // Search filter
      if (qLower) {
        const hay = [f.name, f.categoryName, f.address, f.city, f.zip, f.phone, f.licenseNumber, f.businessName]
          .map(norm)
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
    if (sortBy === "distance" && userLoc) {
      rows.sort((a, b) => (a.distanceMiles ?? 1e9) - (b.distanceMiles ?? 1e9));
    } else if (sortBy === "category") {
      rows.sort((a, b) => (a.categoryName ?? "").localeCompare(b.categoryName ?? ""));
    } else if (sortBy === "duplicates" && duplicateResult) {
      rows.sort((a, b) => {
        const aDupes = duplicateResult.byFacility.get(a.id)?.length ?? 0;
        const bDupes = duplicateResult.byFacility.get(b.id)?.length ?? 0;
        return bDupes - aDupes;
      });
    } else {
      rows.sort((a, b) => a.name.localeCompare(b.name));
    }

    return rows;
  }, [data, q, category, status, duplicateFilter, userLoc, radiusMiles, duplicateResult, sortBy, stackedOnly, stackedIds]);

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
        setSortBy("distance");
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const getDupeGroups = (id: string): DuplicateGroup[] => {
    return duplicateResult?.byFacility.get(id) ?? [];
  };

  // Get financial data for a facility
  const getFinancials = useCallback((f: Facility): FinancialData | null => {
    // Try to match by ID first, then by license number
    if (f.id && financialData.has(f.id)) {
      return financialData.get(f.id) ?? null;
    }
    if (f.licenseNumber && financialData.has(`lic:${f.licenseNumber}`)) {
      return financialData.get(`lic:${f.licenseNumber}`) ?? null;
    }
    return null;
  }, [financialData]);

  // Observation handlers
  const setObservationField = useCallback(<K extends keyof FacilityObservationDraft>(
    key: K,
    value: FacilityObservationDraft[K]
  ) => {
    setObservationDraft((d) => d ? { ...d, [key]: value } : null);
  }, []);

  const saveObservation = useCallback(() => {
    if (observationDraft) {
      saveDraft("CA", observationDraft);
      setObservationDraft(loadDraft("CA", observationDraft.facilityId));
    }
  }, [observationDraft]);

  // Get facilities from a duplicate group
  const getDuplicateFacilities = useCallback((group: DuplicateGroup): Facility[] => {
    if (!data) return [];
    return group.facilityIds
      .map((id) => data.records.find((r) => r.id === id))
      .filter((f): f is Facility => f !== undefined);
  }, [data]);

  const clearFilters = () => {
    setQ("");
    setCategory("ALL");
    setStatus("ALL");
    setDuplicateFilter("any");
    setStackedOnly(false);
  };

  const hasActiveFilters = q || category !== "ALL" || status !== "ALL" || duplicateFilter !== "any" || stackedOnly;

  return (
    <div className="h-screen w-screen bg-zinc-900 flex flex-col overflow-hidden relative">
      {/* Top Navigation Bar - Always Visible */}
      <div className="bg-zinc-900/95 backdrop-blur border-b border-zinc-700 sticky top-0 z-[1100]">
        <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="md:hidden flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center"
            aria-label={sidebarCollapsed ? "Open filters" : "Close filters"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <Link
            href="/"
            className="flex-shrink-0 px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
          >
            🗺️ Map
          </Link>
          <Link
            href="/explorer"
            className="flex-shrink-0 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium"
          >
            📊 Explorer
          </Link>
          <Link
            href="/stacked"
            className="flex-shrink-0 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium"
          >
            📍 Stacked
          </Link>
          <Link
            href="/network"
            className="flex-shrink-0 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium"
          >
            🕸️ Network
          </Link>
          <Link
            href="/financials"
            className="flex-shrink-0 px-3 py-1 rounded-full bg-green-600 hover:bg-green-500 text-white text-xs font-medium"
          >
            💰 Financials
          </Link>
          <Link
            href="/ingest"
            className="flex-shrink-0 px-3 py-1 rounded-full bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-medium"
          >
            📥 Ingest
          </Link>
          <Link
            href="/about"
            className="flex-shrink-0 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium"
          >
            ℹ️ About
          </Link>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">

      {/* Sidebar - overlay on mobile, inline on desktop */}
      <div
        className={`
          h-full bg-zinc-900 border-r border-zinc-700 flex flex-col transition-all duration-300
          ${sidebarCollapsed
            ? "w-0 md:w-12 overflow-hidden"
            : "w-full md:w-96 fixed md:relative inset-0 z-[1050] md:z-auto"
          }
        `}
      >
        {/* Sidebar Header */}
        <div className="p-2 sm:p-3 border-b border-zinc-700 flex items-center justify-between min-w-[300px] md:min-w-0">
          {!sidebarCollapsed && (
            <div className="ml-14 md:ml-0">
              <h1 className="text-base sm:text-lg font-bold text-white">Hippocratic</h1>
              <p className="text-[10px] sm:text-xs text-zinc-400">CA Healthcare Fraud Detection</p>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex p-2 rounded-lg hover:bg-zinc-800 text-zinc-400"
          >
            <svg className={`w-5 h-5 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {!sidebarCollapsed && (
          <>
            {/* Compact Stats */}
            <div className="p-1.5 border-b border-zinc-700 grid grid-cols-4 gap-1">
              <button
                onClick={() => { clearFilters(); }}
                className={`rounded p-1 text-center transition-colors ${
                  !hasActiveFilters ? "bg-blue-600/20 ring-1 ring-blue-400" : "bg-zinc-800 hover:bg-zinc-700"
                }`}
              >
                <div className="text-xs font-bold text-blue-400">{data?.records.length.toLocaleString() ?? 0}</div>
                <div className="text-[7px] text-zinc-500">All</div>
              </button>
              <button
                onClick={() => { setDuplicateFilter(duplicateFilter === "address" ? "any" : "address"); setStackedOnly(false); }}
                className={`rounded p-1 text-center transition-colors ${
                  duplicateFilter === "address" ? "bg-amber-600/20 ring-1 ring-amber-400" : "bg-zinc-800 hover:bg-zinc-700"
                }`}
              >
                <div className="text-xs font-bold text-amber-400">{duplicateResult?.summary.address ?? 0}</div>
                <div className="text-[7px] text-zinc-500">Addr</div>
              </button>
              <button
                onClick={() => { setDuplicateFilter(duplicateFilter === "phone" ? "any" : "phone"); setStackedOnly(false); }}
                className={`rounded p-1 text-center transition-colors ${
                  duplicateFilter === "phone" ? "bg-purple-600/20 ring-1 ring-purple-400" : "bg-zinc-800 hover:bg-zinc-700"
                }`}
              >
                <div className="text-xs font-bold text-purple-400">{duplicateResult?.summary.phone ?? 0}</div>
                <div className="text-[7px] text-zinc-500">Phone</div>
              </button>
              <button
                onClick={() => { setDuplicateFilter(duplicateFilter === "admin" ? "any" : "admin"); setStackedOnly(false); }}
                className={`rounded p-1 text-center transition-colors ${
                  duplicateFilter === "admin" ? "bg-pink-600/20 ring-1 ring-pink-400" : "bg-zinc-800 hover:bg-zinc-700"
                }`}
              >
                <div className="text-xs font-bold text-pink-400">{duplicateResult?.summary.admin ?? 0}</div>
                <div className="text-[7px] text-zinc-500">Admin</div>
              </button>
            </div>

            {/* Filters - Single Row Each */}
            <div className="p-1.5 border-b border-zinc-700 space-y-1.5">
              {/* Categories & Status */}
              <div className="flex gap-1.5">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[10px] text-white"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as typeof status)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[10px] text-white"
                >
                  <option value="ALL">All Status</option>
                  <option value="IN_SERVICE">In Service</option>
                  <option value="NOT_IN_SERVICE">Not In Service</option>
                </select>
              </div>

              {/* Stacked & Duplicate Filters */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => { setStackedOnly(!stackedOnly); setDuplicateFilter("any"); }}
                  className={`flex-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    stackedOnly ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  📍 Stacked
                </button>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[10px] text-white"
                >
                  <option value="name">Sort: Name</option>
                  <option value="distance">Sort: Distance</option>
                  <option value="category">Sort: Category</option>
                  <option value="duplicates">Sort: Duplicates</option>
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-[10px] text-red-400 hover:text-red-300"
                >
                  Clear filters
                </button>
              )}
            </div>


            {/* Results List - Scrollable */}
            <div className="flex-1 overflow-auto p-1.5 sm:p-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="text-red-400 text-sm p-4">{error}</div>
              ) : filtered.length === 0 ? (
                <div className="text-zinc-500 text-sm text-center py-8">No facilities found</div>
              ) : (
                <div className="space-y-1.5 sm:space-y-2">
                  {filtered.slice(0, 100).map((f) => {
                    const dupeGroups = getDupeGroups(f.id);
                    const hasDuplicates = dupeGroups.length > 0;
                    const isStacked = stackedIds.has(f.id);
                    const primaryType = getPrimaryDuplicateType(dupeGroups);
                    const isSelected = selectedId === f.id;
                    const fin = isSelected ? getFinancials(f) : null;
                    const mapsLink = googleMapsLink(f);
                    const streetLink = streetViewLink(f);

                    return (
                      <div
                        key={f.id}
                        id={`card-${f.id}`}
                        onClick={() => onSelect(f.id)}
                        className={`rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-blue-500/20 border-blue-500"
                            : hasDuplicates
                              ? primaryType === "multiple"
                                ? "bg-red-500/10 border-red-500/40 hover:border-red-500"
                                : "bg-amber-500/10 border-amber-500/40 hover:border-amber-500"
                              : isStacked
                                ? "bg-amber-500/5 border-amber-500/30 hover:border-amber-500"
                                : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-500"
                        }`}
                      >
                        {/* Card Header - always visible */}
                        <div className="p-2 sm:p-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-white text-sm sm:text-base leading-tight">{f.name}</div>
                              <div className="text-xs sm:text-sm text-blue-400 mt-0.5">{f.categoryName}</div>
                              {/* Clickable address */}
                              {mapsLink ? (
                                <a
                                  href={mapsLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-sm text-zinc-300 hover:text-blue-300 hover:underline truncate block mt-1"
                                >
                                  📍 {f.address}, {f.city}
                                </a>
                              ) : (
                                <div className="text-sm text-zinc-400 truncate mt-1">{f.address}, {f.city}</div>
                              )}
                            </div>
                            <div className="text-right shrink-0 space-y-1">
                              {f.distanceMiles != null && (
                                <div className="text-sm font-medium text-blue-400">{f.distanceMiles.toFixed(1)} mi</div>
                              )}
                              <div className={`text-sm font-medium px-2 py-0.5 rounded ${f.inService ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {f.inService ? "✓ Active" : "✗ Inactive"}
                              </div>
                            </div>
                          </div>

                          {/* Phone and Quick Info Row */}
                          <div className="flex items-center justify-between mt-2">
                            {f.phone && (
                              <a
                                href={`tel:${f.phone.replace(/[^0-9+]/g, "")}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-sm text-green-400 hover:text-green-300 hover:underline"
                              >
                                📞 {f.phone}
                              </a>
                            )}
                            {/* Quick Rating Stars */}
                            <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                              {[1, 2, 3, 4, 5].map((star) => {
                                const draft = loadDraft("CA", f.id);
                                const filled = draft?.rating != null && draft.rating >= star;
                                return (
                                  <button
                                    key={star}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const currentDraft = loadDraft("CA", f.id) || {
                                        facilityId: f.id,
                                        rating: null,
                                        signagePresent: null,
                                        appearsOpen: null,
                                        doorLocked: null,
                                        staffedObserved: null,
                                        clientsObserved: null,
                                        notes: "",
                                      };
                                      currentDraft.rating = currentDraft.rating === star ? null : star;
                                      saveDraft("CA", currentDraft);
                                      setObservationDraft({ ...currentDraft });
                                    }}
                                    className={`text-lg ${filled ? "text-yellow-400" : "text-zinc-600 hover:text-yellow-400"}`}
                                    title={`Rate ${star} star${star > 1 ? "s" : ""}`}
                                  >
                                    ★
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Financial Preview - show brief data when available */}
                          {(() => {
                            const finPreview = getFinancials(f);
                            if (finPreview && hasFinancialData(finPreview)) {
                              const revenue = finPreview.hospiceTotalRevenue;
                              const netIncome = finPreview.hospiceNetIncome;
                              const totalVisits = (finPreview.hhahMediCalVisits ?? 0) + (finPreview.hhahMedicareVisits ?? 0);
                              if (revenue != null) {
                                return (
                                  <div className="mt-2 flex items-center gap-3 text-sm">
                                    <span className="text-zinc-400">💰</span>
                                    <span className="text-green-400 font-medium">{formatCurrency(revenue)}</span>
                                    {netIncome != null && (
                                      <span className={netIncome < 0 ? "text-red-400" : "text-emerald-400"}>
                                        ({netIncome >= 0 ? "+" : ""}{formatCurrency(netIncome)})
                                      </span>
                                    )}
                                  </div>
                                );
                              } else if (totalVisits > 0) {
                                return (
                                  <div className="mt-2 flex items-center gap-2 text-sm">
                                    <span className="text-zinc-400">📊</span>
                                    <span className="text-blue-400">{formatNumber(totalVisits)} visits</span>
                                  </div>
                                );
                              }
                            }
                            return null;
                          })()}

                          {/* Duplicate badges - clickable */}
                          {(hasDuplicates || isStacked) && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {isStacked && !hasDuplicates && (
                                <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium">
                                  📍 stacked: {locationCounts.get(locationKey(f))}
                                </span>
                              )}
                              {dupeGroups.map((g, i) => (
                                <button
                                  key={i}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDuplicateList(showDuplicateList?.value === g.value ? null : g);
                                  }}
                                  className={`text-xs px-2 py-1 rounded border cursor-pointer hover:opacity-80 font-medium ${getDuplicateBadgeClass(g.type)}`}
                                >
                                  {g.type}: {g.facilityIds.length} →
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Expanded content when selected */}
                        {isSelected && (
                          <div className="border-t border-zinc-700 p-2.5 space-y-3">
                            {/* Quick Links */}
                            <div className="flex flex-wrap gap-2">
                              {mapsLink && (
                                <a
                                  href={mapsLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] px-2 py-1 rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                                >
                                  Google Maps
                                </a>
                              )}
                              {streetLink && (
                                <a
                                  href={streetLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] px-2 py-1 rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                                >
                                  Street View
                                </a>
                              )}
                              {zillowLink(f) && (
                                <a
                                  href={zillowLink(f)!}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] px-2 py-1 rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                                >
                                  Zillow
                                </a>
                              )}
                            </div>

                            {/* License Info */}
                            {f.licenseNumber && (
                              <div className="text-xs text-zinc-400">
                                License: {f.licenseNumber} ({f.licenseStatus ?? "Unknown"})
                              </div>
                            )}

                            {/* Financial Data */}
                            {fin && hasFinancialData(fin) && (
                              <div className="bg-zinc-800 rounded-lg p-2">
                                <div className="text-[10px] text-zinc-500 font-medium mb-1.5">HCAI Financial Data (2024)</div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {(fin.hhahMediCalVisits != null || fin.hhahMedicareVisits != null) && (
                                    <>
                                      <div>
                                        <div className="text-zinc-500">Medi-Cal Visits</div>
                                        <div className="text-zinc-200">{formatNumber(fin.hhahMediCalVisits)}</div>
                                      </div>
                                      <div>
                                        <div className="text-zinc-500">Medicare Visits</div>
                                        <div className="text-zinc-200">{formatNumber(fin.hhahMedicareVisits)}</div>
                                      </div>
                                    </>
                                  )}
                                  {fin.hospiceTotalRevenue != null && (
                                    <>
                                      <div>
                                        <div className="text-zinc-500">Total Revenue</div>
                                        <div className="text-green-400">{formatCurrency(fin.hospiceTotalRevenue)}</div>
                                      </div>
                                      <div>
                                        <div className="text-zinc-500">Net Income</div>
                                        <div className={fin.hospiceNetIncome != null && fin.hospiceNetIncome < 0 ? "text-red-400" : "text-green-400"}>
                                          {formatCurrency(fin.hospiceNetIncome)}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                  {(fin.hospiceMediCalRevenue != null || fin.hospiceMedicareRevenue != null) && (
                                    <>
                                      <div>
                                        <div className="text-zinc-500">Medi-Cal Rev</div>
                                        <div className="text-zinc-200">{formatCurrency(fin.hospiceMediCalRevenue)}</div>
                                      </div>
                                      <div>
                                        <div className="text-zinc-500">Medicare Rev</div>
                                        <div className="text-zinc-200">{formatCurrency(fin.hospiceMedicareRevenue)}</div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Observation Checklist */}
                            {observationDraft && (
                              <div className="bg-zinc-800 rounded-lg p-2">
                                <div className="text-[10px] text-zinc-500 font-medium mb-1.5">Field Observation Checklist</div>
                                <div className="space-y-1.5">
                                  {[
                                    { key: "signagePresent" as const, label: "Signage present" },
                                    { key: "appearsOpen" as const, label: "Appears open" },
                                    { key: "doorLocked" as const, label: "Door locked" },
                                    { key: "staffedObserved" as const, label: "Staff observed" },
                                    { key: "clientsObserved" as const, label: "Clients observed" },
                                  ].map(({ key, label }) => (
                                    <div key={key} className="flex items-center justify-between">
                                      <span className="text-xs text-zinc-400">{label}</span>
                                      <div className="flex gap-1">
                                        {(["yes", "no", "unknown"] as const).map((v) => (
                                          <button
                                            key={v}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setObservationField(key, v);
                                            }}
                                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                                              observationDraft[key] === v
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
                                    value={observationDraft.notes}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      setObservationField("notes", e.target.value);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="Notes..."
                                    className="w-full mt-1 p-1.5 rounded bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 placeholder-zinc-500 resize-none"
                                    rows={2}
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      saveObservation();
                                    }}
                                    className="w-full py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
                                  >
                                    Save Observation
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filtered.length > 100 && (
                    <div className="text-center text-zinc-500 text-xs py-2">
                      Showing 100 of {filtered.length}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Search Box - Below Scrolling List */}
            <div className="p-1.5 border-t border-zinc-700">
              <div className="relative">
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search facilities..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
                {q && (
                  <button
                    onClick={() => setQ("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-sm"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

          </>
        )}

        {/* Collapsed sidebar icons - desktop only */}
        {sidebarCollapsed && (
          <div className="hidden md:flex flex-1 flex-col items-center py-4 gap-4">
            <Link href="/explorer" className="p-2 rounded-lg bg-blue-600 text-white" title="Data Explorer">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </Link>
            <Link href="/network" className="p-2 rounded-lg bg-purple-600 text-white" title="Network Analysis">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </Link>
            <Link href="/stacked" className="p-2 rounded-lg bg-amber-600 text-black" title="Fraud Dashboard">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </Link>
            <Link href="/about" className="p-2 rounded-lg bg-zinc-700 text-white" title="About & Schema">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Link>
          </div>
        )}
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
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
            duplicatesByFacility={duplicateResult?.byFacility ?? new Map()}
            financialData={financialData}
            onShowDuplicates={(g) => setShowDuplicateList(showDuplicateList?.value === g.value ? null : g)}
            currentFilter={duplicateFilter}
            onFilterChange={(f) => { setDuplicateFilter(f); setStackedOnly(false); }}
          />
        )}

        {/* Floating buttons */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          <button
            onClick={requestGeo}
            disabled={geoLoading}
            className="w-10 h-10 rounded-lg bg-zinc-800/90 backdrop-blur border border-zinc-700 flex items-center justify-center text-white shadow-lg hover:bg-zinc-700 transition-colors"
            title="Find my location"
          >
            {geoLoading ? (
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>

        {/* Duplicate List Panel */}
        {showDuplicateList && (
          <div className="absolute top-4 left-4 right-4 z-[1001] max-w-md mx-auto">
            <div className="bg-zinc-900/95 backdrop-blur border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-zinc-700">
                <div>
                  <div className="text-sm font-medium text-white">
                    {showDuplicateList.type.charAt(0).toUpperCase() + showDuplicateList.type.slice(1)} Duplicates
                  </div>
                  <div className="text-xs text-zinc-400 truncate max-w-[200px]">
                    {showDuplicateList.value}
                  </div>
                </div>
                <button
                  onClick={() => setShowDuplicateList(null)}
                  className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                {getDuplicateFacilities(showDuplicateList).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      onSelect(f.id);
                      setShowDuplicateList(null);
                    }}
                    className={`w-full text-left p-2 rounded-lg hover:bg-zinc-700/50 transition-colors ${
                      selectedId === f.id ? "bg-blue-500/20 border border-blue-500" : "bg-zinc-800/50"
                    }`}
                  >
                    <div className="font-medium text-white text-sm truncate">{f.name}</div>
                    <div className="text-xs text-zinc-400 truncate">{f.categoryName}</div>
                    <div className="text-xs text-zinc-500 truncate">{f.address}, {f.city}</div>
                    {f.phone && (
                      <div className="text-xs text-green-400 mt-0.5">📞 {f.phone}</div>
                    )}
                  </button>
                ))}
              </div>
              <div className="p-2 border-t border-zinc-700 text-center">
                <span className="text-xs text-zinc-500">
                  {showDuplicateList.facilityIds.length} facilities share this {showDuplicateList.type}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
