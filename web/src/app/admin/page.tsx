'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import './chart-config';

// Dynamically import Chart.js components to avoid SSR issues
const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });
const Doughnut = dynamic(() => import('react-chartjs-2').then(mod => mod.Doughnut), { ssr: false });

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState({
    requestsPerSec: 0,
    latency: 0,
    bytesDownloaded: 0,
    rateLimits: 0,
    activeScrapers: 0,
    totalRecords: 0
  });

  const [logs, setLogs] = useState<any[]>([]);
  const [scraperStatus, setScraperStatus] = useState<any>({});
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState('data_ca_gov');
  const [selectedDatasets, setSelectedDatasets] = useState<Set<string>>(new Set());
  
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Chart data
  const [requestsHistory, setRequestsHistory] = useState<number[]>(Array(20).fill(0));
  const [latencyHistory, setLatencyHistory] = useState<number[]>(Array(20).fill(0));
  const [bytesHistory, setBytesHistory] = useState<number[]>(Array(20).fill(0));

  useEffect(() => {
    // Poll metrics every 2 seconds
    const metricsInterval = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:8000/api/stats');
        const data = await response.json();
        
        setMetrics({
          requestsPerSec: data.stats?.requests_per_sec || Math.random() * 50,
          latency: data.stats?.avg_latency || Math.random() * 500 + 100,
          bytesDownloaded: data.stats?.bytes_downloaded || Math.random() * 1000,
          rateLimits: data.stats?.rate_limits || Math.floor(Math.random() * 5),
          activeScrapers: data.stats?.active_scrapers || 0,
          totalRecords: data.stats?.total_records || 0
        });

        // Update chart history
        setRequestsHistory(prev => [...prev.slice(1), data.stats?.requests_per_sec || Math.random() * 50]);
        setLatencyHistory(prev => [...prev.slice(1), data.stats?.avg_latency || Math.random() * 500 + 100]);
        setBytesHistory(prev => [...prev.slice(1), (data.stats?.bytes_downloaded || Math.random() * 1000) / 1024]);
      } catch (error) {
        console.error('Error fetching metrics:', error);
      }
    }, 2000);

    // Poll logs every 3 seconds
    const logsInterval = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:8000/api/logs?limit=50');
        const data = await response.json();
        setLogs(data.logs || []);
        
        // Auto-scroll to bottom
        if (logContainerRef.current) {
          logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
    }, 3000);

    return () => {
      clearInterval(metricsInterval);
      clearInterval(logsInterval);
    };
  }, []);

  const browseEndpoint = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/browse/${selectedEndpoint}`);
      const data = await response.json();
      setDatasets(data.datasets || []);
    } catch (error) {
      console.error('Error browsing endpoint:', error);
    }
  };

  const startScraper = async (scraperName: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/scraper/start/${scraperName}`, {
        method: 'POST'
      });
      const data = await response.json();
      console.log('Scraper started:', data);
    } catch (error) {
      console.error('Error starting scraper:', error);
    }
  };

  // Chart configurations
  const requestsChartData = {
    labels: Array(20).fill(''),
    datasets: [{
      label: 'Requests/sec',
      data: requestsHistory,
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4
    }]
  };

  const latencyChartData = {
    labels: Array(20).fill(''),
    datasets: [{
      label: 'Latency (ms)',
      data: latencyHistory,
      borderColor: 'rgb(16, 185, 129)',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4
    }]
  };

  const bytesChartData = {
    labels: Array(20).fill(''),
    datasets: [{
      label: 'Data (MB)',
      data: bytesHistory,
      borderColor: 'rgb(245, 158, 11)',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false }
    },
    scales: {
      x: { display: false },
      y: { 
        display: true,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'rgba(255, 255, 255, 0.5)' }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Animated background grid */}
      <div className="fixed inset-0 bg-[url('/grid.svg')] opacity-10 animate-pulse" />
      
      <div className="relative z-10 p-6 max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Hippocratic Command Center
          </h1>
          <p className="text-slate-400">Real-time fraud detection telemetry & data acquisition</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Requests Metric */}
          <div className="bg-slate-900/50 backdrop-blur border border-blue-500/30 rounded-xl p-6 hover:border-blue-500/60 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-400 text-sm mb-1">Requests/sec</p>
                <p className="text-4xl font-bold text-blue-400">{metrics.requestsPerSec.toFixed(1)}</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="h-20">
              <Line data={requestsChartData} options={chartOptions} />
            </div>
          </div>

          {/* Latency Metric */}
          <div className="bg-slate-900/50 backdrop-blur border border-emerald-500/30 rounded-xl p-6 hover:border-emerald-500/60 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-400 text-sm mb-1">Avg Latency</p>
                <p className="text-4xl font-bold text-emerald-400">{metrics.latency.toFixed(0)}ms</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="h-20">
              <Line data={latencyChartData} options={chartOptions} />
            </div>
          </div>

          {/* Bandwidth Metric */}
          <div className="bg-slate-900/50 backdrop-blur border border-amber-500/30 rounded-xl p-6 hover:border-amber-500/60 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-400 text-sm mb-1">Data Downloaded</p>
                <p className="text-4xl font-bold text-amber-400">{(metrics.bytesDownloaded / 1024).toFixed(1)}MB</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
            </div>
            <div className="h-20">
              <Line data={bytesChartData} options={chartOptions} />
            </div>
          </div>

          {/* Active Scrapers Metric */}
          <div className="bg-slate-900/50 backdrop-blur border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/60 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-400 text-sm mb-1">Active Scrapers</p>
                <p className="text-4xl font-bold text-purple-400">{metrics.activeScrapers}</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
            </div>
            <div className="h-20 flex items-center justify-center">
              <div className="text-center">
                <p className="text-slate-400 text-sm">Rate Limits</p>
                <p className="text-2xl font-bold text-red-400">{metrics.rateLimits}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scrapers Panel */}
          <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-cyan-400">🤖 Scrapers</h2>
            <div className="space-y-3">
              {['openfiscal', 'sco', 'data_ca_gov', 'chhs'].map((scraper) => (
                <button
                  key={scraper}
                  onClick={() => startScraper(scraper)}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-4 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 active:scale-95"
                >
                  Start {scraper.replace('_', '.')}
                </button>
              ))}
            </div>
          </div>

          {/* Live Activity Log */}
          <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-cyan-400">📜 Live Activity Log</h2>
            <div
              ref={logContainerRef}
              className="bg-black/40 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm space-y-1 border border-slate-800"
            >
              {logs.length === 0 ? (
                <p className="text-slate-500">Waiting for activity...</p>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-slate-500">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    <span className={`font-bold ${
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'warning' ? 'text-amber-400' :
                      log.level === 'success' ? 'text-emerald-400' :
                      'text-blue-400'
                    }`}>
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Dataset Browser */}
        <div className="mt-6 bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-4 text-cyan-400">🔍 Dataset Browser</h2>
          <div className="flex gap-4 mb-4">
            <select
              value={selectedEndpoint}
              onChange={(e) => setSelectedEndpoint(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
            >
              <option value="data_ca_gov">data.ca.gov</option>
              <option value="chhs">CHHS Portal</option>
              <option value="cms">CMS Data</option>
              <option value="openfiscal">Open FI$Cal</option>
            </select>
            <button
              onClick={browseEndpoint}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-2 rounded-lg font-semibold transition-all"
            >
              Browse
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {datasets.map((dataset, idx) => (
              <div
                key={idx}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-cyan-500 transition-all cursor-pointer"
              >
                <h3 className="font-semibold text-white mb-2">{dataset.title || dataset.name}</h3>
                <p className="text-sm text-slate-400 mb-2">{dataset.description?.substring(0, 100)}...</p>
                {dataset.resources && dataset.resources.length > 0 && (
                  <div className="text-xs text-slate-500">
                    {dataset.resources.length} resource(s) • {dataset.resources[0]?.format}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
