// ==============================================================================
// Data Explorer Page - Sortable table with charts and duplicate detection
// ==============================================================================

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Facility, FacilityAllMin } from "@/lib/facilities";
import { norm } from "@/lib/facilities";
import {
  detectDuplicates,
  getDuplicateBadgeClass,
  type DuplicateResult,
  type DuplicateType,
} from "@/lib/duplicates";

type SortKey = "name" | "category" | "city" | "county" | "status" | "duplicates";
type SortDir = "asc" | "desc";

function locationKey(f: Facility): string {
  return [norm(f.address), norm(f.city), norm(f.zip)].join("|");
}

export default function ExplorerPage() {
  const [data, setData] = useState<FacilityAllMin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("ALL");
  const [status, setStatus] = useState<"ALL" | "IN_SERVICE" | "NOT_IN_SERVICE">("ALL");
  const [duplicateFilter, setDuplicateFilter] = useState<DuplicateType | "any" | "none">("any");
  const [stackedOnly, setStackedOnly] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);
  const pageSize = 50;

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

  const duplicateResult = useMemo<DuplicateResult | null>(() => {
    if (!data) return null;
    return detectDuplicates(data.records);
  }, [data]);

  const locationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!data) return counts;
    for (const r of data.records) {
      const k = locationKey(r);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return counts;
  }, [data]);

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

  const categories = useMemo(() => {
    if (!data) return [];
    const cats = new Set<string>();
    data.records.forEach((r) => r.categoryName && cats.add(r.categoryName));
    return Array.from(cats).sort();
  }, [data]);

  // Filtered and sorted
  const filtered = useMemo(() => {
    if (!data) return [];
    const qLower = norm(q);
    let rows = data.records.filter((f) => {
      if (stackedOnly && !stackedIds.has(f.id)) return false;
      if (duplicateFilter !== "any" && duplicateResult) {
        const dupes = duplicateResult.byFacility.get(f.id);
        if (duplicateFilter === "none") {
          if (dupes && dupes.length > 0) return false;
        } else {
          if (!dupes || !dupes.some((g) => g.type === duplicateFilter)) return false;
        }
      }
      if (category !== "ALL" && f.categoryName !== category) return false;
      if (status === "IN_SERVICE" && f.inService !== true) return false;
      if (status === "NOT_IN_SERVICE" && f.inService !== false) return false;
      if (qLower) {
        const hay = [f.name, f.categoryName, f.address, f.city, f.county, f.zip, f.phone, f.licenseNumber]
          .map(norm)
          .join(" ");
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });

    // Sort
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortKey === "category") {
        cmp = (a.categoryName ?? "").localeCompare(b.categoryName ?? "");
      } else if (sortKey === "city") {
        cmp = (a.city ?? "").localeCompare(b.city ?? "");
      } else if (sortKey === "county") {
        cmp = (a.county ?? "").localeCompare(b.county ?? "");
      } else if (sortKey === "status") {
        cmp = (a.inService ? 1 : 0) - (b.inService ? 1 : 0);
      } else if (sortKey === "duplicates") {
        const aDupes = duplicateResult?.byFacility.get(a.id)?.length ?? 0;
        const bDupes = duplicateResult?.byFacility.get(b.id)?.length ?? 0;
        cmp = bDupes - aDupes;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [data, q, category, status, duplicateFilter, stackedOnly, stackedIds, duplicateResult, sortKey, sortDir]);

  // Stats for charts
  const stats = useMemo(() => {
    if (!data) return null;

    const categoryCount: Record<string, number> = {};
    const countyCount: Record<string, number> = {};
    const statusCount = { active: 0, inactive: 0 };

    for (const f of data.records) {
      if (f.categoryName) {
        categoryCount[f.categoryName] = (categoryCount[f.categoryName] ?? 0) + 1;
      }
      if (f.county) {
        countyCount[f.county] = (countyCount[f.county] ?? 0) + 1;
      }
      if (f.inService) {
        statusCount.active++;
      } else {
        statusCount.inactive++;
      }
    }

    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const topCounties = Object.entries(countyCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return { categoryCount, countyCount, statusCount, topCategories, topCounties };
  }, [data]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <span className="text-zinc-600">↕</span>;
    return <span className="text-blue-400">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Top Navigation Bar */}
      <div className="bg-zinc-900/95 backdrop-blur border-b border-zinc-700 sticky top-0 z-50">
        <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto">
          <Link href="/map" className="flex-shrink-0 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium">
            🗺️ Map
          </Link>
          <Link href="/explorer" className="flex-shrink-0 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-medium">
            📊 Explorer
          </Link>
          <Link href="/stacked" className="flex-shrink-0 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium">
            📍 Stacked
          </Link>
          <Link href="/network" className="flex-shrink-0 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium">
            🕸️ Network
          </Link>
          <Link href="/financials" className="flex-shrink-0 px-3 py-1 rounded-full bg-green-600 hover:bg-green-500 text-white text-xs font-medium">
            💰 Financials
          </Link>
          <Link href="/ingest" className="flex-shrink-0 px-3 py-1 rounded-full bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-medium">
            📥 Ingest
          </Link>
          <Link href="/about" className="flex-shrink-0 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium">
            ℹ️ About
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className="bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        <div className="px-4 py-3">
          <h1 className="font-bold text-lg">Data Explorer</h1>
          <p className="text-xs text-zinc-400">
            {loading ? "Loading..." : `${filtered.length.toLocaleString()} of ${data?.records.length.toLocaleString()} facilities`}
          </p>
        </div>
      </header>

      <main className="p-4 max-w-7xl mx-auto">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Charts Row */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Status Chart */}
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
              <h3 className="font-semibold mb-3 text-sm">Status Distribution</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-green-400">Active</span>
                    <span>{stats.statusCount.active.toLocaleString()}</span>
                  </div>
                  <div className="h-3 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${(stats.statusCount.active / (stats.statusCount.active + stats.statusCount.inactive)) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-red-400">Inactive</span>
                    <span>{stats.statusCount.inactive.toLocaleString()}</span>
                  </div>
                  <div className="h-3 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500"
                      style={{ width: `${(stats.statusCount.inactive / (stats.statusCount.active + stats.statusCount.inactive)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Top Categories */}
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
              <h3 className="font-semibold mb-3 text-sm">Top Categories</h3>
              <div className="space-y-1.5">
                {stats.topCategories.slice(0, 5).map(([cat, count]) => (
                  <div key={cat} className="flex items-center gap-2">
                    <div className="flex-1 text-xs text-zinc-400 truncate">{cat}</div>
                    <div className="w-20 h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${(count / stats.topCategories[0][1]) * 100}%` }}
                      />
                    </div>
                    <div className="w-12 text-right text-xs text-zinc-500">{count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Counties */}
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
              <h3 className="font-semibold mb-3 text-sm">Top Counties</h3>
              <div className="space-y-1.5">
                {stats.topCounties.slice(0, 5).map(([county, count]) => (
                  <div key={county} className="flex items-center gap-2">
                    <div className="flex-1 text-xs text-zinc-400 truncate">{county}</div>
                    <div className="w-20 h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${(count / stats.topCounties[0][1]) * 100}%` }}
                      />
                    </div>
                    <div className="w-12 text-right text-xs text-zinc-500">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Stats */}
        {duplicateResult && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700 text-center">
              <div className="text-xl font-bold text-amber-400">{duplicateResult.summary.address}</div>
              <div className="text-xs text-zinc-500">Address Groups</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700 text-center">
              <div className="text-xl font-bold text-purple-400">{duplicateResult.summary.phone}</div>
              <div className="text-xs text-zinc-500">Phone Groups</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700 text-center">
              <div className="text-xl font-bold text-cyan-400">{duplicateResult.summary.owner}</div>
              <div className="text-xs text-zinc-500">Owner Groups</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700 text-center">
              <div className="text-xl font-bold text-pink-400">{duplicateResult.summary.admin}</div>
              <div className="text-xs text-zinc-500">Admin Groups</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700 text-center">
              <div className="text-xl font-bold text-red-400">{duplicateResult.summary.totalFacilitiesWithDupes}</div>
              <div className="text-xs text-zinc-500">Facilities w/ Dups</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700 mb-4">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0); }}
              placeholder="Search all fields..."
              className="flex-1 min-w-[200px] bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(0); }}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as typeof status); setPage(0); }}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="ALL">All Status</option>
              <option value="IN_SERVICE">In Service</option>
              <option value="NOT_IN_SERVICE">Not In Service</option>
            </select>
            <select
              value={duplicateFilter}
              onChange={(e) => { setDuplicateFilter(e.target.value as typeof duplicateFilter); setPage(0); }}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="any">All Duplicates</option>
              <option value="none">No Duplicates</option>
              <option value="address">Address Dups</option>
              <option value="phone">Phone Dups</option>
              <option value="owner">Owner Dups</option>
              <option value="admin">Admin Dups</option>
            </select>
            <button
              onClick={() => { setStackedOnly(!stackedOnly); setPage(0); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                stackedOnly ? "bg-amber-500 text-black" : "bg-zinc-900 border border-zinc-700"
              }`}
            >
              Stacked Only
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700 bg-zinc-800">
                  <th className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-zinc-700" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1">Name <SortIcon column="name" /></div>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-zinc-700" onClick={() => handleSort("category")}>
                    <div className="flex items-center gap-1">Category <SortIcon column="category" /></div>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-zinc-700" onClick={() => handleSort("city")}>
                    <div className="flex items-center gap-1">City <SortIcon column="city" /></div>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-zinc-700" onClick={() => handleSort("county")}>
                    <div className="flex items-center gap-1">County <SortIcon column="county" /></div>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-zinc-700" onClick={() => handleSort("status")}>
                    <div className="flex items-center gap-1">Status <SortIcon column="status" /></div>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-zinc-700" onClick={() => handleSort("duplicates")}>
                    <div className="flex items-center gap-1">Duplicates <SortIcon column="duplicates" /></div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                      No facilities found
                    </td>
                  </tr>
                ) : (
                  paged.map((f) => {
                    const dupeGroups = duplicateResult?.byFacility.get(f.id) ?? [];
                    return (
                      <tr key={f.id} className="border-b border-zinc-700/50 hover:bg-zinc-700/30">
                        <td className="px-4 py-3">
                          <div className="font-medium">{f.name}</div>
                          <div className="text-xs text-zinc-500">{f.address}</div>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{f.categoryName}</td>
                        <td className="px-4 py-3 text-zinc-400">{f.city}</td>
                        <td className="px-4 py-3 text-zinc-400">{f.county}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            f.inService ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                          }`}>
                            {f.inService ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {dupeGroups.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {dupeGroups.map((g, i) => (
                                <span
                                  key={i}
                                  className={`text-[10px] px-1.5 py-0.5 rounded border ${getDuplicateBadgeClass(g.type)}`}
                                >
                                  {g.type}: {g.facilityIds.length}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-zinc-700 flex items-center justify-between bg-zinc-800/50">
            <div className="text-sm text-zinc-400">
              Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1 rounded bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-600"
              >
                ← Prev
              </button>
              <span className="text-sm">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 rounded bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-600"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
