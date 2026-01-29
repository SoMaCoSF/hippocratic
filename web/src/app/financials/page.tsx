// ==============================================================================
// file_id: SOM-SCR-0030-v1.0.0
// name: page.tsx
// description: Financial analysis page - money-focused dashboard with charts
// project_id: HIPPOCRATIC
// category: script
// tags: [web, nextjs, financials, charts, analysis]
// created: 2026-01-28
// version: 1.0.0
// ==============================================================================

"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { formatCurrency, formatNumber } from "@/lib/financials";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

export default function FinancialsPage() {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        console.log("Fetching financial data...");
        // Fetch from database API routes
        const [facilityRes, financialRes] = await Promise.all([
          fetch("/api/facilities?limit=10000"),
          fetch("/api/financials?limit=10000"),
        ]);

        if (facilityRes.ok) {
          const facilityData = await facilityRes.json();
          console.log("Facilities loaded:", facilityData.facilities?.length);
          console.log("Sample facility:", facilityData.facilities?.[0]);
          setFacilities(facilityData.facilities || []);
        } else {
          console.error("Failed to fetch facilities:", facilityRes.status);
        }

        if (financialRes.ok) {
          const financialData = await financialRes.json();
          console.log("Financials loaded:", financialData.financials?.length);
          console.log("Sample financial:", financialData.financials?.[0]);
          const withRevenue = financialData.financials?.filter((f: any) => f.totalRevenue > 0);
          console.log("Financials with revenue > 0:", withRevenue?.length);
          setFinancials(financialData.financials || []);
        } else {
          console.error("Failed to fetch financials:", financialRes.status);
        }
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const financialStats = useMemo(() => {
    const stats = {
      totalRevenue: 0,
      totalExpenses: 0,
      totalNetIncome: 0,
      facilitiesWithData: 0,
      negativeIncome: 0,
      totalVisits: 0,
      revenueByCategory: new Map<string, number>(),
      topRevenue: [] as Array<{ name: string; revenue: number; netIncome: number; category: string }>,
      bottomIncome: [] as Array<{ name: string; revenue: number; netIncome: number; category: string }>,
    };

    // Create a map of license number to facility for quick lookup
    const facilityMap = new Map<string, any>();
    facilities.forEach((f) => {
      if (f.licenseNumber) {
        facilityMap.set(f.licenseNumber, f);
      }
    });

    // Process financials
    financials.forEach((fin) => {
      const facility = facilityMap.get(fin.licenseNumber);
      
      const revenue = fin.totalRevenue ?? 0;
      const expenses = fin.totalExpenses ?? 0;
      const netIncome = fin.netIncome ?? 0;
      const visits = fin.totalVisits ?? 0;

      if (revenue > 0 || netIncome !== 0 || visits > 0) {
        stats.totalRevenue += revenue;
        stats.totalExpenses += expenses;
        stats.totalNetIncome += netIncome;
        stats.totalVisits += visits;
        stats.facilitiesWithData++;

        if (netIncome < 0) {
          stats.negativeIncome++;
        }

        // Revenue by category
        const cat = facility?.categoryName ?? "Unknown";
        stats.revenueByCategory.set(cat, (stats.revenueByCategory.get(cat) ?? 0) + revenue);

        // Top/bottom performers
        if (revenue > 0) {
          stats.topRevenue.push({ 
            name: facility?.name || fin.facilityName || "Unknown", 
            revenue, 
            netIncome, 
            category: cat 
          });
          stats.bottomIncome.push({ 
            name: facility?.name || fin.facilityName || "Unknown", 
            revenue, 
            netIncome, 
            category: cat 
          });
        }
      }
    });

    stats.topRevenue.sort((a, b) => b.revenue - a.revenue).splice(20);
    stats.bottomIncome.sort((a, b) => a.netIncome - b.netIncome).splice(20);

    return stats;
  }, [facilities, financials]);

  // Chart options
  const revenueByCategory = useMemo(() => {
    const categories = Array.from(financialStats.revenueByCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      title: { text: "Revenue by Category", textStyle: { color: "#fff" } },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        data: categories.map(([cat]) => cat.length > 20 ? cat.slice(0, 20) + "..." : cat),
        axisLabel: { rotate: 45, color: "#aaa", fontSize: 10 },
      },
      yAxis: { type: "value", axisLabel: { color: "#aaa", formatter: (v: number) => `$${(v / 1e6).toFixed(1)}M` } },
      series: [{
        data: categories.map(([, rev]) => rev),
        type: "bar",
        itemStyle: { color: "#10b981" },
      }],
      backgroundColor: "#18181b",
      grid: { left: "10%", right: "5%", bottom: "20%", top: "15%" },
    };
  }, [financialStats]);

  const topRevenueChart = useMemo(() => {
    const top = financialStats.topRevenue.slice(0, 15);
    return {
      title: { text: "Top 15 by Revenue", textStyle: { color: "#fff", fontSize: 14 } },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        data: top.map(f => f.name.length > 15 ? f.name.slice(0, 15) + "..." : f.name),
        axisLabel: { rotate: 45, color: "#aaa", fontSize: 9 },
      },
      yAxis: { type: "value", axisLabel: { color: "#aaa", formatter: (v: number) => `$${(v / 1e6).toFixed(1)}M` } },
      series: [{
        data: top.map(f => f.revenue),
        type: "bar",
        itemStyle: { color: "#3b82f6" },
      }],
      backgroundColor: "#18181b",
      grid: { left: "10%", right: "5%", bottom: "25%", top: "12%" },
    };
  }, [financialStats]);

  const bottomIncomeChart = useMemo(() => {
    const bottom = financialStats.bottomIncome.slice(0, 15);
    return {
      title: { text: "Bottom 15 by Net Income", textStyle: { color: "#fff", fontSize: 14 } },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        data: bottom.map(f => f.name.length > 15 ? f.name.slice(0, 15) + "..." : f.name),
        axisLabel: { rotate: 45, color: "#aaa", fontSize: 9 },
      },
      yAxis: { type: "value", axisLabel: { color: "#aaa", formatter: (v: number) => `$${(v / 1e6).toFixed(1)}M` } },
      series: [{
        data: bottom.map(f => f.netIncome),
        type: "bar",
        itemStyle: { color: "#ef4444" },
      }],
      backgroundColor: "#18181b",
      grid: { left: "10%", right: "5%", bottom: "25%", top: "12%" },
    };
  }, [financialStats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top Navigation Bar */}
      <div className="bg-zinc-900/95 backdrop-blur border-b border-zinc-700 sticky top-0 z-50">
        <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto">
          <Link href="/" className="flex-shrink-0 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium">
            🗺️ Map
          </Link>
          <Link href="/explorer" className="flex-shrink-0 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium">
            📊 Explorer
          </Link>
          <Link href="/stacked" className="flex-shrink-0 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium">
            📍 Stacked
          </Link>
          <Link href="/network" className="flex-shrink-0 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium">
            🕸️ Network
          </Link>
          <Link href="/financials" className="flex-shrink-0 px-3 py-1 rounded-full bg-green-600 text-white text-xs font-medium">
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

      {/* Main Content */}
      <main className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">💰 Financial Analysis</h1>
          <p className="text-zinc-400 text-sm sm:text-base">
            Revenue, expenses, and profitability analysis for California healthcare facilities
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <div className="text-2xl sm:text-3xl font-bold text-green-400">{formatCurrency(financialStats.totalRevenue)}</div>
            <div className="text-xs text-zinc-500 mt-1">Total Revenue</div>
          </div>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <div className="text-2xl sm:text-3xl font-bold text-red-400">{formatCurrency(financialStats.totalExpenses)}</div>
            <div className="text-xs text-zinc-500 mt-1">Total Expenses</div>
          </div>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <div className={`text-2xl sm:text-3xl font-bold ${financialStats.totalNetIncome >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatCurrency(financialStats.totalNetIncome)}
            </div>
            <div className="text-xs text-zinc-500 mt-1">Net Income</div>
          </div>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <div className="text-2xl sm:text-3xl font-bold text-blue-400">{formatNumber(financialStats.totalVisits)}</div>
            <div className="text-xs text-zinc-500 mt-1">Total Visits</div>
          </div>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <div className="text-2xl sm:text-3xl font-bold text-white">{financialStats.facilitiesWithData.toLocaleString()}</div>
            <div className="text-xs text-zinc-500 mt-1">Facilities</div>
          </div>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <div className="text-2xl sm:text-3xl font-bold text-amber-400">{financialStats.negativeIncome}</div>
            <div className="text-xs text-zinc-500 mt-1">Negative Income</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <ReactECharts option={revenueByCategory} style={{ height: "400px" }} />
          </div>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <ReactECharts option={topRevenueChart} style={{ height: "400px" }} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <ReactECharts option={bottomIncomeChart} style={{ height: "400px" }} />
          </div>
        </div>

        {/* Top Performers Table */}
        <div className="mt-6 bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <h2 className="text-xl font-bold text-white mb-4">Top 20 Revenue Generators</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 px-3 text-zinc-400 font-medium">#</th>
                  <th className="text-left py-2 px-3 text-zinc-400 font-medium">Facility</th>
                  <th className="text-left py-2 px-3 text-zinc-400 font-medium">Category</th>
                  <th className="text-right py-2 px-3 text-zinc-400 font-medium">Revenue</th>
                  <th className="text-right py-2 px-3 text-zinc-400 font-medium">Net Income</th>
                  <th className="text-right py-2 px-3 text-zinc-400 font-medium">Margin</th>
                </tr>
              </thead>
              <tbody>
                {financialStats.topRevenue.map((f, i) => {
                  const margin = f.revenue > 0 ? (f.netIncome / f.revenue) * 100 : 0;
                  return (
                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/50">
                      <td className="py-2 px-3 text-zinc-500">{i + 1}</td>
                      <td className="py-2 px-3 text-white">{f.name}</td>
                      <td className="py-2 px-3 text-zinc-400 text-xs">{f.category}</td>
                      <td className="py-2 px-3 text-right text-green-400 font-medium">{formatCurrency(f.revenue)}</td>
                      <td className={`py-2 px-3 text-right font-medium ${f.netIncome >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {formatCurrency(f.netIncome)}
                      </td>
                      <td className={`py-2 px-3 text-right text-xs ${margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {margin.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
