// ==============================================================================
// file_id: SOM-SCR-0021-v0.1.0
// name: web/src/app/stacked/page.tsx
// description: Visualization dashboard for “stacked” facilities (same address) with category/multi-category filters
// project_id: HIPPOCRATIC
// category: script
// tags: [web, dashboard, fraud, stacking, visualization]
// created: 2026-01-16
// modified: 2026-01-16
// version: 0.1.0
// agent_id: AGENT-CURSOR-OPENAI
// execution: Next.js page
// ==============================================================================

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FacilityAllMin } from "@/lib/facilities";
import { norm } from "@/lib/facilities";
import { buildStacks, mapsSearchForAddress, zillowForAddress, type StackGroup } from "@/lib/stacking";
import { StackCharts } from "@/app/components/StackCharts";

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1 text-xs font-semibold",
        active
          ? "border-blue-400 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200"
          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function CategoryBar({ g }: { g: StackGroup }) {
  const entries = Object.entries(g.categories).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return (
    <div className="mt-2 space-y-1">
      {entries.map(([cat, count]) => {
        const pct = Math.round((count / g.total) * 100);
        return (
          <div key={cat} className="flex items-center gap-2">
            <div className="w-48 truncate text-[11px] text-zinc-700 dark:text-zinc-300" title={cat}>
              {cat}
            </div>
            <div className="h-2 flex-1 rounded bg-zinc-100 dark:bg-zinc-800">
              <div className="h-2 rounded bg-blue-500" style={{ width: `${pct}%` }} />
            </div>
            <div className="w-16 text-right text-[11px] text-zinc-600 dark:text-zinc-400">
              {count} ({pct}%)
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function StackedDashboard() {
  const [data, setData] = useState<FacilityAllMin | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [minStack, setMinStack] = useState(2);
  const [multiCategoryOnly, setMultiCategoryOnly] = useState(false);
  const [categoryMode, setCategoryMode] = useState<"ANY" | "STACKED_OF_CATEGORY">("ANY");
  const [category, setCategory] = useState<string>("HOSPICE");

  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
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

  const categories = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.records.map((r) => r.categoryName).filter(Boolean) as string[])).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [data]);

  const stacks = useMemo(() => {
    if (!data) return [];
    return buildStacks(data.records);
  }, [data]);

  const filtered = useMemo(() => {
    const qn = norm(q);
    let rows = stacks.filter((g) => g.total >= minStack);

    if (multiCategoryOnly) rows = rows.filter((g) => g.distinctCategories > 1);

    if (categoryMode === "STACKED_OF_CATEGORY") {
      rows = rows.filter((g) => (g.categories[category] ?? 0) >= minStack);
    }

    if (qn) {
      rows = rows.filter((g) => {
        if (norm(g.addressLabel).includes(qn)) return true;
        // search within facility names/categories quickly
        const cats = Object.keys(g.categories).join(" ");
        if (norm(cats).includes(qn)) return true;
        for (const f of g.facilities) {
          if (norm(f.name).includes(qn)) return true;
          if (norm(f.phone).includes(qn)) return true;
        }
        return false;
      });
    }

    return rows;
  }, [stacks, q, minStack, multiCategoryOnly, categoryMode, category]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100">
      <header className="border-b bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">Stacked facilities dashboard (CA)</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              Grouped by normalized address • {data ? `${data.recordCount.toLocaleString()} facilities loaded` : "loading…"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
              href="/"
            >
              ← Map
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4">
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <div className="mb-4">
          <StackCharts
            groups={filtered}
            onPickStackKey={(key) => {
              setExpandedKey(key);
              // keep page UX simple: scroll to list
              setTimeout(() => window.scrollTo({ top: 520, behavior: "smooth" }), 0);
            }}
          />
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Search</div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Address, facility name, phone, category…"
                className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Pill active={categoryMode === "ANY"} onClick={() => setCategoryMode("ANY")}>
                  Any stacked address
                </Pill>
                <Pill active={categoryMode === "STACKED_OF_CATEGORY"} onClick={() => setCategoryMode("STACKED_OF_CATEGORY")}>
                  Stacked of category
                </Pill>
                {categoryMode === "STACKED_OF_CATEGORY" ? (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="rounded-md border border-zinc-200 bg-white px-2 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Filters</div>
              <div className="mt-2 grid grid-cols-1 gap-2">
                <label className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-zinc-700 dark:text-zinc-300">Min stack size</span>
                  <input
                    type="number"
                    min={2}
                    value={minStack}
                    onChange={(e) => setMinStack(Math.max(2, Number(e.target.value)))}
                    className="w-20 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={multiCategoryOnly}
                    onChange={(e) => setMultiCategoryOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  Only addresses with multiple categories
                </label>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  Showing <span className="font-semibold">{filtered.length.toLocaleString()}</span> stacked addresses.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3">
          {filtered.slice(0, 200).map((g) => {
            const expanded = expandedKey === g.key;
            return (
              <div
                key={g.key}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{g.addressLabel}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="rounded-full border border-zinc-200 px-2 py-0.5 dark:border-zinc-800">
                        Total: {g.total}
                      </span>
                      <span className="rounded-full border border-zinc-200 px-2 py-0.5 dark:border-zinc-800">
                        Categories: {g.distinctCategories}
                      </span>
                      <a
                        className="text-blue-700 hover:underline dark:text-blue-300"
                        href={mapsSearchForAddress(g.addressLabel)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open in Maps
                      </a>
                      <a
                        className="text-blue-700 hover:underline dark:text-blue-300"
                        href={zillowForAddress(g.addressLabel)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Zillow
                      </a>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedKey(expanded ? null : g.key)}
                    className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    {expanded ? "Hide details" : "View details"}
                  </button>
                </div>

                <CategoryBar g={g} />

                {expanded ? (
                  <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Facilities at this address ({g.total})
                    </div>
                    <div className="mt-2 space-y-2">
                      {g.facilities.map((f) => (
                        <div
                          key={f.id}
                          className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs dark:border-zinc-800 dark:bg-zinc-900/40"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-semibold">{f.name}</div>
                            <div className="text-zinc-600 dark:text-zinc-400">{f.categoryName ?? "Unknown"}</div>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-zinc-700 dark:text-zinc-300">
                            {f.licenseStatus ? <span>License: {f.licenseStatus}</span> : null}
                            {f.npi ? <span>NPI: {f.npi}</span> : null}
                            {f.phone ? <span>Phone: {f.phone}</span> : null}
                            {f.licenseExpirationDate ? <span>Exp: {f.licenseExpirationDate}</span> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}

          {filtered.length > 200 ? (
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
              Results capped at 200 for the MVP. Use search and filters to narrow down.
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}


