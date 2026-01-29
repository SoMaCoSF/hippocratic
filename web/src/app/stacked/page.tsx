// ==============================================================================
// file_id: SOM-SCR-0021-v2.0.0
// name: web/src/app/stacked/page.tsx
// description: Stacked facilities dashboard with enhanced duplicate detection
// project_id: HIPPOCRATIC
// category: script
// tags: [web, dashboard, fraud, stacking, mobile-first, duplicates]
// created: 2026-01-16
// modified: 2026-01-28
// version: 2.0.0
// agent_id: AGENT-PRIME-002
// execution: Next.js page
// ==============================================================================

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FacilityAllMin } from "@/lib/facilities";
import { norm } from "@/lib/facilities";
import { buildStacks, mapsSearchForAddress, zillowForAddress, type StackGroup } from "@/lib/stacking";
import { StackCharts } from "@/app/components/StackCharts";
import {
  detectDuplicates,
  getDuplicateBadgeClass,
  type DuplicateResult,
  type DuplicateType,
} from "@/lib/duplicates";

function CategoryBars({ g }: { g: StackGroup }) {
  const entries = Object.entries(g.categories).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = Math.max(...entries.map(([, c]) => c));

  return (
    <div className="mt-3 space-y-1.5">
      {entries.map(([cat, count]) => (
        <div key={cat} className="flex items-center gap-2">
          <div className="w-24 sm:w-32 truncate text-xs text-zinc-400" title={cat}>
            {cat}
          </div>
          <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <div className="w-8 text-right text-xs text-zinc-500">{count}</div>
        </div>
      ))}
    </div>
  );
}

type DuplicateFilter = "all" | DuplicateType;

export default function StackedDashboard() {
  const [data, setData] = useState<FacilityAllMin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [minStack, setMinStack] = useState(2);
  const [multiCategoryOnly, setMultiCategoryOnly] = useState(false);
  const [duplicateTypeFilter, setDuplicateTypeFilter] = useState<DuplicateFilter>("all");
  const [showCharts, setShowCharts] = useState(true);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

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

  // Duplicate detection
  const duplicateResult = useMemo<DuplicateResult | null>(() => {
    if (!data) return null;
    return detectDuplicates(data.records);
  }, [data]);

  const stacks = useMemo(() => {
    if (!data) return [];
    return buildStacks(data.records);
  }, [data]);

  const filtered = useMemo(() => {
    const qn = norm(q);
    let rows = stacks.filter((g) => g.total >= minStack);

    if (multiCategoryOnly) rows = rows.filter((g) => g.distinctCategories > 1);

    // Filter by duplicate type
    if (duplicateTypeFilter !== "all" && duplicateResult) {
      rows = rows.filter((g) => {
        return g.facilities.some((f) => {
          const dupes = duplicateResult.byFacility.get(f.id);
          return dupes?.some((d) => d.type === duplicateTypeFilter);
        });
      });
    }

    if (qn) {
      rows = rows.filter((g) => {
        if (norm(g.addressLabel).includes(qn)) return true;
        const cats = Object.keys(g.categories).join(" ");
        if (norm(cats).includes(qn)) return true;
        for (const f of g.facilities) {
          if (norm(f.name).includes(qn)) return true;
        }
        return false;
      });
    }

    return rows;
  }, [stacks, q, minStack, multiCategoryOnly, duplicateTypeFilter, duplicateResult]);

  // Stats
  const stats = useMemo(() => {
    const totalStacked = filtered.reduce((sum, g) => sum + g.total, 0);
    const maxStack = filtered.length > 0 ? Math.max(...filtered.map((g) => g.total)) : 0;
    return { totalStacked, maxStack, addresses: filtered.length };
  }, [filtered]);

  // Count facilities with each duplicate type
  const dupeCounts = useMemo(() => {
    if (!duplicateResult) return { address: 0, phone: 0, owner: 0, admin: 0 };
    const counts = { address: 0, phone: 0, owner: 0, admin: 0 };
    duplicateResult.byFacility.forEach((groups) => {
      const types = new Set(groups.map((g) => g.type));
      if (types.has("address")) counts.address++;
      if (types.has("phone")) counts.phone++;
      if (types.has("owner")) counts.owner++;
      if (types.has("admin")) counts.admin++;
    });
    return counts;
  }, [duplicateResult]);

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Top Navigation Bar */}
      <div className="bg-zinc-900/95 backdrop-blur border-b border-zinc-700 sticky top-0 z-50">
        <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto">
          <Link
            href="/"
            className="flex-shrink-0 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium"
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
            className="flex-shrink-0 px-3 py-1 rounded-full bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium"
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

      {/* Page Header */}
      <header className="bg-zinc-900/50 backdrop-blur border-b border-zinc-800">
        <div className="px-3 sm:px-4 py-2 sm:py-3">
          <div>
            <h1 className="text-sm sm:text-base font-semibold">Fraud Detection Dashboard</h1>
            <p className="text-[10px] sm:text-xs text-zinc-400">
              {loading ? "Loading..." : `${stats.addresses.toLocaleString()} stacked addresses`}
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-4xl mx-auto">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="bg-zinc-800/50 rounded-xl p-2 sm:p-3 border border-zinc-700">
            <div className="text-lg sm:text-2xl font-bold text-amber-400">{stats.addresses.toLocaleString()}</div>
            <div className="text-[10px] sm:text-xs text-zinc-400">Addresses</div>
          </div>
          <div className="bg-zinc-800/50 rounded-xl p-2 sm:p-3 border border-zinc-700">
            <div className="text-lg sm:text-2xl font-bold text-blue-400">{stats.totalStacked.toLocaleString()}</div>
            <div className="text-[10px] sm:text-xs text-zinc-400">Facilities</div>
          </div>
          <div className="bg-zinc-800/50 rounded-xl p-2 sm:p-3 border border-zinc-700">
            <div className="text-lg sm:text-2xl font-bold text-red-400">{stats.maxStack}</div>
            <div className="text-[10px] sm:text-xs text-zinc-400">Max stack</div>
          </div>
          <div className="bg-zinc-800/50 rounded-xl p-2 sm:p-3 border border-zinc-700">
            <div className="text-lg sm:text-2xl font-bold text-purple-400">{dupeCounts.phone.toLocaleString()}</div>
            <div className="text-[10px] sm:text-xs text-zinc-400">Phone dups</div>
          </div>
        </div>

        {/* Search & filters */}
        <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700 mb-4">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search address, name..."
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => setShowCharts(!showCharts)}
              className={`px-4 rounded-xl border ${showCharts ? 'bg-blue-500 border-blue-500' : 'bg-zinc-900 border-zinc-700'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 bg-zinc-900 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 border border-zinc-700">
              <span className="text-[10px] sm:text-xs text-zinc-400">Min:</span>
              <select
                value={minStack}
                onChange={(e) => setMinStack(Number(e.target.value))}
                className="bg-transparent text-xs sm:text-sm focus:outline-none"
              >
                {[2, 3, 4, 5, 10, 20].map((n) => (
                  <option key={n} value={n}>{n}+</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setMultiCategoryOnly(!multiCategoryOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs ${
                multiCategoryOnly
                  ? 'bg-amber-500 text-black'
                  : 'bg-zinc-900 border border-zinc-700'
              }`}
            >
              Multi-category
            </button>

            <select
              value={duplicateTypeFilter}
              onChange={(e) => setDuplicateTypeFilter(e.target.value as DuplicateFilter)}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs"
            >
              <option value="all">All duplicates</option>
              <option value="address">Address ({dupeCounts.address})</option>
              <option value="phone">Phone ({dupeCounts.phone})</option>
              <option value="owner">Owner ({dupeCounts.owner})</option>
              <option value="admin">Admin ({dupeCounts.admin})</option>
            </select>
          </div>
        </div>

        {/* Charts */}
        {showCharts && !loading && (
          <div className="mb-4">
            <StackCharts
              groups={filtered}
              onPickStackKey={(key) => {
                setExpandedKey(key);
                setTimeout(() => {
                  document.getElementById(`stack-${key}`)?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
            />
          </div>
        )}

        {/* Results */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              No stacked addresses found
            </div>
          ) : (
            filtered.slice(0, 100).map((g) => {
              const expanded = expandedKey === g.key;
              return (
                <div
                  key={g.key}
                  id={`stack-${g.key}`}
                  className={`rounded-xl border transition-colors ${
                    expanded
                      ? 'bg-zinc-800 border-blue-500'
                      : 'bg-zinc-800/50 border-zinc-700'
                  }`}
                >
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedKey(expanded ? null : g.key)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{g.addressLabel}</div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                            {g.total} facilities
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                            {g.distinctCategories} types
                          </span>
                        </div>
                      </div>
                      <svg
                        className={`w-5 h-5 text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    <CategoryBars g={g} />
                  </div>

                  {expanded && (
                    <div className="border-t border-zinc-700 p-4">
                      {/* Quick links */}
                      <div className="flex gap-2 mb-4">
                        <a
                          href={mapsSearchForAddress(g.addressLabel)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-700 text-sm hover:bg-zinc-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          Google Maps
                        </a>
                        <a
                          href={zillowForAddress(g.addressLabel)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-700 text-sm hover:bg-zinc-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          Zillow
                        </a>
                      </div>

                      {/* Facility list */}
                      <div className="space-y-2">
                        {g.facilities.map((f) => {
                          const dupeGroups = duplicateResult?.byFacility.get(f.id) ?? [];
                          const hasDupes = dupeGroups.length > 0;

                          return (
                            <Link
                              key={f.id}
                              href={`/?facility=${f.id}`}
                              className={`block p-3 rounded-lg border cursor-pointer hover:border-blue-500 transition-colors ${
                                hasDupes
                                  ? 'bg-red-900/20 border-red-500/30 hover:bg-red-900/30'
                                  : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="font-medium text-sm truncate">{f.name}</div>
                                  <div className="text-xs text-zinc-400 mt-0.5">{f.categoryName}</div>
                                </div>
                                <span className={`shrink-0 text-xs px-2 py-0.5 rounded ${
                                  f.inService ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {f.inService ? 'Active' : 'Inactive'}
                                </span>
                              </div>

                              {/* Duplicate badges */}
                              {hasDupes && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {dupeGroups.map((dg, i) => (
                                    <span
                                      key={i}
                                      className={`text-[10px] px-1.5 py-0.5 rounded border ${getDuplicateBadgeClass(dg.type)}`}
                                    >
                                      {dg.type}: {dg.facilityIds.length}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-zinc-500">
                                {f.licenseNumber && <span>License: {f.licenseNumber}</span>}
                                {f.phone && (
                                  <span onClick={(e) => e.preventDefault()} className="text-blue-400">
                                    {f.phone}
                                  </span>
                                )}
                                {f.licenseExpirationDate && <span>Expires: {f.licenseExpirationDate}</span>}
                              </div>
                              
                              <div className="text-[10px] text-blue-400 mt-2">Click to view on map →</div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {filtered.length > 100 && (
            <div className="text-center py-4 text-zinc-500 text-sm">
              Showing 100 of {filtered.length} — use filters to narrow results
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
