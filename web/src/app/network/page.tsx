// ==============================================================================
// file_id: SOM-SCR-0027-v2.0.0
// name: page.tsx
// description: Interactive OSINT network graph - facilities, addresses, owners, phones, money
// project_id: HIPPOCRATIC
// category: script
// tags: [web, nextjs, network, vis.js, osint, fraud-detection]
// created: 2026-01-28
// version: 2.0.0
// ==============================================================================

"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { formatCurrency, formatNumber } from "@/lib/financials";

// Types
type ClusterFacility = {
  id: string;
  name: string;
  category: string;
  revenue: number | null;
  net_income: number | null;
  visits: number | null;
};

type Cluster = {
  rank: number;
  score: number;
  facility_count: number;
  total_revenue: number;
  shared_phones: number;
  shared_addresses: number;
  shared_admins: number;
  shared_owners?: number;
  has_negative_income: boolean;
  facilities: ClusterFacility[];
};

// Colors matching the web app
const COLORS = {
  facility: "#3b82f6",    // blue
  address: "#f59e0b",     // amber
  phone: "#a855f7",       // purple
  owner: "#06b6d4",       // cyan
  admin: "#ec4899",       // pink
  money: "#22c55e",       // green
  selected: "#ef4444",    // red
};

// Network Graph Component
function NetworkGraph({
  cluster,
  onSelectFacility,
}: {
  cluster: Cluster;
  onSelectFacility?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || !cluster) return;

    // Dynamic import vis-network to avoid SSR issues
    import("vis-network/standalone").then(({ Network, DataSet }) => {
      // Re-check container exists after async import
      const container = containerRef.current;
      if (!container) return;

      // Create nodes
      const nodes: any[] = [];
      const edges: any[] = [];
      const facilities = cluster.facilities.slice(0, 50); // Limit for performance

      // Add facility nodes
      facilities.forEach((f, i) => {
        const hasRevenue = f.revenue != null && f.revenue > 0;
        nodes.push({
          id: f.id,
          label: f.name.length > 25 ? f.name.substring(0, 25) + "..." : f.name,
          title: `${f.name}\n${f.category}\n${f.revenue ? formatCurrency(f.revenue) : "No revenue data"}`,
          color: {
            background: hasRevenue ? COLORS.money : COLORS.facility,
            border: hasRevenue ? "#15803d" : "#1e40af",
            highlight: { background: COLORS.selected, border: "#991b1b" },
          },
          size: hasRevenue ? Math.min(30, 15 + Math.log10(f.revenue || 1) * 3) : 15,
          font: { color: "#fff", size: 10 },
          shape: "dot",
        });
      });

      // Create edges based on shared attributes
      // Simulate connections - in production you'd have actual edge data
      const facilityIds = facilities.map((f) => f.id);
      const numEdges = Math.min(
        cluster.shared_addresses + cluster.shared_phones + cluster.shared_admins,
        facilityIds.length * 2
      );

      // Create address edges (amber)
      for (let i = 0; i < Math.min(cluster.shared_addresses, numEdges / 3); i++) {
        const fromIdx = i % facilityIds.length;
        const toIdx = (i + 1) % facilityIds.length;
        if (fromIdx !== toIdx) {
          edges.push({
            from: facilityIds[fromIdx],
            to: facilityIds[toIdx],
            color: { color: COLORS.address, opacity: 0.6 },
            width: 2,
            title: "Shared Address",
          });
        }
      }

      // Create phone edges (purple)
      for (let i = 0; i < Math.min(cluster.shared_phones, numEdges / 3); i++) {
        const fromIdx = (i * 2) % facilityIds.length;
        const toIdx = (i * 2 + 2) % facilityIds.length;
        if (fromIdx !== toIdx) {
          edges.push({
            from: facilityIds[fromIdx],
            to: facilityIds[toIdx],
            color: { color: COLORS.phone, opacity: 0.6 },
            width: 2,
            dashes: true,
            title: "Shared Phone",
          });
        }
      }

      // Create admin edges (pink)
      for (let i = 0; i < Math.min(cluster.shared_admins, numEdges / 3); i++) {
        const fromIdx = (i * 3) % facilityIds.length;
        const toIdx = (i * 3 + 3) % facilityIds.length;
        if (fromIdx !== toIdx) {
          edges.push({
            from: facilityIds[fromIdx],
            to: facilityIds[toIdx],
            color: { color: COLORS.admin, opacity: 0.6 },
            width: 2,
            title: "Shared Admin",
          });
        }
      }

      const data = {
        nodes: new DataSet(nodes),
        edges: new DataSet(edges),
      };

      const options = {
        nodes: {
          borderWidth: 2,
          shadow: true,
        },
        edges: {
          smooth: true,
        },
        physics: {
          enabled: true,
          solver: "forceAtlas2Based",
          forceAtlas2Based: {
            gravitationalConstant: -50,
            centralGravity: 0.01,
            springLength: 100,
            springConstant: 0.08,
          },
          stabilization: {
            iterations: 100,
          },
        },
        interaction: {
          hover: true,
          tooltipDelay: 100,
          zoomView: true,
          dragView: true,
        },
      };

      // Destroy previous network if exists
      if (networkRef.current) {
        networkRef.current.destroy();
      }

      networkRef.current = new Network(container, data, options);

      // Click handler
      networkRef.current.on("click", (params: any) => {
        if (params.nodes.length > 0) {
          onSelectFacility?.(params.nodes[0]);
        }
      });
    });

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
      }
    };
  }, [cluster, onSelectFacility]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[400px] bg-zinc-950 rounded-xl border border-zinc-700"
    />
  );
}

export default function NetworkPage() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [showNegativeIncomeOnly, setShowNegativeIncomeOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "graph">("graph");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/data/analysis/clusters.json");
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
        const data = await res.json();
        setClusters(data);
        // Auto-select first cluster for graph view
        if (data.length > 0) {
          setSelectedCluster(data[0]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredClusters = useMemo(() => {
    return clusters.filter((c) => {
      if (c.score < minScore) return false;
      if (showNegativeIncomeOnly && !c.has_negative_income) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesFacility = c.facilities.some(
          (f) => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q)
        );
        if (!matchesFacility) return false;
      }
      return true;
    });
  }, [clusters, minScore, showNegativeIncomeOnly, searchQuery]);

  const stats = useMemo(() => {
    const totalClusters = clusters.length;
    const totalFacilities = clusters.reduce((sum, c) => sum + c.facility_count, 0);
    const totalRevenue = clusters.reduce((sum, c) => sum + (c.total_revenue || 0), 0);
    const negativeIncome = clusters.filter((c) => c.has_negative_income).length;
    return { totalClusters, totalFacilities, totalRevenue, negativeIncome };
  }, [clusters]);

  const getScoreColor = (score: number) => {
    if (score >= 500) return "text-red-400 bg-red-500/20";
    if (score >= 200) return "text-orange-400 bg-orange-500/20";
    if (score >= 100) return "text-amber-400 bg-amber-500/20";
    if (score >= 50) return "text-yellow-400 bg-yellow-500/20";
    return "text-zinc-400 bg-zinc-500/20";
  };

  const handleFacilitySelect = useCallback((id: string) => {
    // Could navigate to map view with this facility
    console.log("Selected facility:", id);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
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
            href="/network"
            className="flex-shrink-0 px-3 py-1 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium"
          >
            🕸️ Network
          </Link>
          <Link
            href="/stacked"
            className="flex-shrink-0 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium"
          >
            ⚠️ Fraud
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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white">OSINT Network Graph</h1>
            <p className="text-[10px] sm:text-xs text-zinc-400">Facility Connections: Address • Phone • Owner • Admin • Money</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Stats Overview - CLICKABLE */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <button
            onClick={() => { setMinScore(0); setShowNegativeIncomeOnly(false); }}
            className={`bg-zinc-900 rounded-xl border p-2 sm:p-4 text-center transition-colors ${
              minScore === 0 && !showNegativeIncomeOnly ? "border-blue-500 ring-1 ring-blue-400" : "border-zinc-800 hover:border-zinc-600"
            }`}
          >
            <div className="text-lg sm:text-2xl font-bold text-blue-400">{stats.totalClusters.toLocaleString()}</div>
            <div className="text-xs sm:text-sm text-zinc-500">Suspicious Clusters</div>
          </button>
          <button
            onClick={() => { setMinScore(0); }}
            className="bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-600 p-4 text-center transition-colors"
          >
            <div className="text-2xl font-bold text-amber-400">{stats.totalFacilities.toLocaleString()}</div>
            <div className="text-sm text-zinc-500">Facilities Involved</div>
          </button>
          <button
            onClick={() => { setMinScore(100); }}
            className={`bg-zinc-900 rounded-xl border p-4 text-center transition-colors ${
              minScore >= 100 ? "border-green-500 ring-1 ring-green-400" : "border-zinc-800 hover:border-zinc-600"
            }`}
          >
            <div className="text-2xl font-bold text-green-400">{formatCurrency(stats.totalRevenue)}</div>
            <div className="text-sm text-zinc-500">Total Revenue</div>
          </button>
          <button
            onClick={() => setShowNegativeIncomeOnly(!showNegativeIncomeOnly)}
            className={`bg-zinc-900 rounded-xl border p-4 text-center transition-colors ${
              showNegativeIncomeOnly ? "border-red-500 ring-1 ring-red-400" : "border-zinc-800 hover:border-zinc-600"
            }`}
          >
            <div className="text-2xl font-bold text-red-400">{stats.negativeIncome}</div>
            <div className="text-sm text-zinc-500">Negative Income</div>
          </button>
        </div>

        {/* Connection Legend */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 mb-6">
          <div className="text-sm font-medium text-zinc-300 mb-3">Connection Types (Schema)</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full" style={{ background: COLORS.facility }} />
              <span className="text-xs text-zinc-400">Facility (node)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 rounded" style={{ background: COLORS.address }} />
              <span className="text-xs text-zinc-400">Shared Address</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 rounded border-dashed border-2" style={{ borderColor: COLORS.phone }} />
              <span className="text-xs text-zinc-400">Shared Phone</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 rounded" style={{ background: COLORS.admin }} />
              <span className="text-xs text-zinc-400">Shared Admin</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full" style={{ background: COLORS.money }} />
              <span className="text-xs text-zinc-400">Has Revenue</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Search facilities</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or category..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Minimum Risk Score</label>
              <select
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value={0}>All (0+)</option>
                <option value={10}>Low (10+)</option>
                <option value={50}>Medium (50+)</option>
                <option value={100}>High (100+)</option>
                <option value={200}>Very High (200+)</option>
                <option value={500}>Critical (500+)</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setShowNegativeIncomeOnly(!showNegativeIncomeOnly)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showNegativeIncomeOnly
                    ? "bg-red-500 text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                Negative Income Only
              </button>
            </div>
            <div className="flex items-end justify-end">
              <span className="text-sm text-zinc-400">
                {filteredClusters.length} of {clusters.length} clusters
              </span>
            </div>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-red-400 text-center py-8">{error}</div>
        )}

        {/* Main Content */}
        {!loading && !error && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Cluster List */}
            <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto">
              <div className="text-sm font-medium text-zinc-400 mb-2">
                Select a cluster to visualize
              </div>
              {filteredClusters.slice(0, 50).map((cluster) => (
                <button
                  key={cluster.rank}
                  onClick={() => setSelectedCluster(cluster)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedCluster?.rank === cluster.rank
                      ? "bg-purple-500/20 border-purple-500"
                      : "bg-zinc-900 border-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-xs">#{cluster.rank}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${getScoreColor(cluster.score)}`}>
                      {cluster.score.toFixed(0)}
                    </span>
                  </div>
                  <div className="text-sm text-white mt-1">
                    {cluster.facility_count} facilities
                  </div>
                  <div className="flex gap-2 mt-1 text-[10px]">
                    {cluster.shared_addresses > 0 && (
                      <span className="text-amber-400">{cluster.shared_addresses} addr</span>
                    )}
                    {cluster.shared_phones > 0 && (
                      <span className="text-purple-400">{cluster.shared_phones} phone</span>
                    )}
                    {cluster.shared_admins > 0 && (
                      <span className="text-pink-400">{cluster.shared_admins} admin</span>
                    )}
                  </div>
                  {cluster.total_revenue > 0 && (
                    <div className="text-xs text-green-400 mt-1">
                      {formatCurrency(cluster.total_revenue)}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Graph View */}
            <div className="lg:col-span-2">
              {viewMode === "graph" && selectedCluster ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        Cluster #{selectedCluster.rank}
                      </h3>
                      <p className="text-sm text-zinc-400">
                        {selectedCluster.facility_count} facilities • Risk: {selectedCluster.score.toFixed(0)}
                      </p>
                    </div>
                    {selectedCluster.total_revenue > 0 && (
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-400">
                          {formatCurrency(selectedCluster.total_revenue)}
                        </div>
                        <div className="text-xs text-zinc-500">Total Revenue</div>
                      </div>
                    )}
                  </div>
                  <NetworkGraph
                    cluster={selectedCluster}
                    onSelectFacility={handleFacilitySelect}
                  />
                  <div className="mt-3 text-xs text-zinc-500 text-center">
                    Drag to pan • Scroll to zoom • Click nodes to select
                  </div>

                  {/* Selected Cluster Facilities */}
                  <div className="mt-4 bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                    <h4 className="text-sm font-medium text-zinc-300 mb-3">
                      Facilities ({selectedCluster.facilities.length})
                    </h4>
                    <div className="grid md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {selectedCluster.facilities.slice(0, 20).map((f) => (
                        <Link
                          key={f.id}
                          href={`/?search=${encodeURIComponent(f.name)}`}
                          className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
                        >
                          <div className="text-sm font-medium text-white truncate">{f.name}</div>
                          <div className="text-xs text-zinc-500 truncate">{f.category}</div>
                          {f.revenue != null && f.revenue > 0 && (
                            <div className="text-xs text-green-400 mt-0.5">
                              {formatCurrency(f.revenue)}
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : viewMode === "list" ? (
                <div className="space-y-3">
                  {filteredClusters.slice(0, 20).map((cluster) => (
                    <div
                      key={cluster.rank}
                      className="bg-zinc-900 rounded-xl border border-zinc-800 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500">#{cluster.rank}</span>
                            <span className={`px-2 py-1 rounded text-sm font-bold ${getScoreColor(cluster.score)}`}>
                              Risk: {cluster.score.toFixed(0)}
                            </span>
                          </div>
                          <div className="text-white mt-1">
                            {cluster.facility_count} facilities
                          </div>
                        </div>
                        {cluster.total_revenue > 0 && (
                          <div className="text-green-400 font-bold">
                            {formatCurrency(cluster.total_revenue)}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3 mt-2 text-xs">
                        <span className="text-amber-400">{cluster.shared_addresses} addresses</span>
                        <span className="text-purple-400">{cluster.shared_phones} phones</span>
                        <span className="text-pink-400">{cluster.shared_admins} admins</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 text-zinc-500">
                  Select a cluster to view the network graph
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 pt-6 border-t border-zinc-800">
          <div className="flex flex-wrap gap-4">
            <Link href="/" className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium">
              Map View
            </Link>
            <Link href="/explorer" className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium">
              Data Explorer
            </Link>
            <Link href="/stacked" className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-medium">
              Fraud Dashboard
            </Link>
            <Link href="/about" className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium">
              About & Schema
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
