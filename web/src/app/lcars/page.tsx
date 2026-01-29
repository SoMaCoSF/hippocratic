'use client';

import { useState, useEffect, useRef } from 'react';

export default function LCARSAdmin() {
  const [metrics, setMetrics] = useState({
    requests: 0,
    latency: 0,
    bytes: 0,
    records: 0,
    activeScrapers: 0
  });

  const [logs, setLogs] = useState<string[]>([]);
  const [scraperStatus, setScraperStatus] = useState<{[key: string]: string}>({});
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, level: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    setLogs(prev => [...prev.slice(-49), logEntry]);
    
    setTimeout(() => {
      if (logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight;
      }
    }, 0);
  };

  const runScraper = async (name: string) => {
    setScraperStatus(prev => ({ ...prev, [name]: 'running' }));
    addLog(`Initializing ${name} scraper...`, 'info');
    
    setMetrics(prev => ({ ...prev, activeScrapers: prev.activeScrapers + 1 }));

    // Simulate real scraping process
    setTimeout(() => addLog(`Connecting to ${name} endpoint...`, 'info'), 500);
    setTimeout(() => addLog(`Browsing available datasets...`, 'info'), 1000);
    setTimeout(() => {
      const recordCount = Math.floor(Math.random() * 10000) + 1000;
      const bytes = Math.floor(Math.random() * 5000) + 500;
      const latency = Math.floor(Math.random() * 300) + 100;
      
      setMetrics(prev => ({
        requests: prev.requests + 3,
        latency: Math.round((prev.latency + latency) / 2),
        bytes: prev.bytes + bytes,
        records: prev.records + recordCount,
        activeScrapers: prev.activeScrapers - 1
      }));
      
      addLog(`Downloaded ${bytes}KB from ${name}`, 'success');
      addLog(`Parsed ${recordCount} records`, 'success');
      addLog(`${name} scraper completed`, 'success');
      setScraperStatus(prev => ({ ...prev, [name]: 'complete' }));
    }, 2500);
  };

  useEffect(() => {
    addLog('LCARS SYSTEM ONLINE', 'success');
    addLog('Hippocratic Fraud Detection v2.0', 'info');
  }, []);

  const scrapers = [
    { id: 'data_ca_gov', label: 'DATA.CA.GOV', color: 'bg-emerald-500' },
    { id: 'chhs', label: 'CHHS PORTAL', color: 'bg-green-500' },
    { id: 'cms', label: 'CMS DATA', color: 'bg-teal-500' },
    { id: 'openfiscal', label: 'OPEN FISCAL', color: 'bg-lime-500' }
  ];

  return (
    <div className="h-screen bg-zinc-900 text-white overflow-hidden">
      {/* Corner Accent - Top Left */}
      <div className="absolute top-0 left-0 w-64 h-32 bg-gradient-to-br from-gray-600 to-gray-700 rounded-br-[100px]" />
      
      {/* Corner Accent - Top Right */}
      <div className="absolute top-0 right-0 w-32 h-64 bg-gradient-to-bl from-emerald-600 to-green-700 rounded-bl-[100px]" />

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col p-4 gap-3">
        
        {/* Top Bar */}
        <div className="flex gap-3 h-16">
          <div className="bg-gradient-to-r from-gray-500 to-gray-600 rounded-r-full w-32 flex items-center justify-center text-white font-bold text-xl">
            LCARS
          </div>
          <div className="flex-1 bg-gradient-to-r from-gray-700 via-emerald-700 to-green-700 rounded-3xl flex items-center px-6 text-2xl font-bold tracking-wider text-white">
            HIPPOCRATIC COMMAND - MEDICAL FRAUD DETECTION SYSTEM
          </div>
          <div className="bg-gradient-to-l from-emerald-500 to-green-600 rounded-l-full w-32 flex items-center justify-center text-white font-bold text-xl">
            {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Main Grid */}
        <div className="flex-1 flex gap-3">
          
          {/* Left Panel - Metrics */}
          <div className="w-64 flex flex-col gap-2">
            <div className="bg-gray-600 text-white p-3 rounded-2xl font-bold text-lg">
              TELEMETRY
            </div>
            
            <MetricCard label="REQUESTS" value={metrics.requests} color="bg-emerald-600" />
            <MetricCard label="LATENCY" value={`${metrics.latency}MS`} color="bg-green-600" />
            <MetricCard label="DATA DL" value={`${(metrics.bytes / 1024).toFixed(1)}MB`} color="bg-teal-600" />
            <MetricCard label="RECORDS" value={metrics.records.toLocaleString()} color="bg-lime-600" />
            <MetricCard label="ACTIVE" value={metrics.activeScrapers} color="bg-emerald-500" />
          </div>

          {/* Center Panel - Logs */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="bg-gray-700 text-white p-3 rounded-2xl font-bold text-lg">
              ACTIVITY LOG - SYSTEM STATUS
            </div>
            
            <div 
              ref={logRef}
              className="flex-1 bg-zinc-950 rounded-2xl p-4 overflow-y-auto font-mono text-sm space-y-1 border-2 border-gray-700"
            >
              {logs.map((log, idx) => (
                <div key={idx} className={`
                  ${log.includes('[ERROR]') ? 'text-red-400' : 
                    log.includes('[SUCCESS]') ? 'text-emerald-400' : 
                    'text-gray-300'}
                `}>
                  {log}
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel - Scrapers */}
          <div className="w-72 flex flex-col gap-2">
            <div className="bg-green-600 text-white p-3 rounded-2xl font-bold text-lg">
              DATA ACQUISITION
            </div>
            
            {scrapers.map(scraper => (
              <button
                key={scraper.id}
                onClick={() => runScraper(scraper.id)}
                disabled={scraperStatus[scraper.id] === 'running'}
                className={`
                  ${scraper.color} 
                  ${scraperStatus[scraper.id] === 'running' ? 'opacity-50 cursor-not-allowed animate-pulse' : 'hover:opacity-80'}
                  ${scraperStatus[scraper.id] === 'complete' ? 'border-4 border-white' : ''}
                  text-white font-bold text-lg p-4 rounded-2xl transition-all transform active:scale-95
                  flex items-center justify-between
                `}
              >
                <span>{scraper.label}</span>
                {scraperStatus[scraper.id] === 'running' && (
                  <span className="animate-spin">⟳</span>
                )}
                {scraperStatus[scraper.id] === 'complete' && (
                  <span>✓</span>
                )}
              </button>
            ))}

            <div className="flex-1" />

            {/* Quick Stats */}
            <div className="bg-gradient-to-b from-gray-800 to-zinc-900 rounded-2xl p-4 border-2 border-emerald-600">
              <div className="text-emerald-400 font-bold mb-2">DATABASE STATUS</div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">FACILITIES:</span>
                  <span className="text-white font-bold">5,432</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">FINANCIALS:</span>
                  <span className="text-white font-bold">8,901</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">BUDGETS:</span>
                  <span className="text-white font-bold">2,341</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex gap-3 h-12">
          <div className="bg-gradient-to-r from-gray-600 to-gray-700 rounded-full w-48 flex items-center justify-center text-white font-bold">
            SYSTEM NOMINAL
          </div>
          <div className="flex-1 bg-gradient-to-r from-gray-700 to-emerald-700 rounded-full flex items-center justify-center text-sm font-mono text-gray-200">
            CA DEPT OF PUBLIC HEALTH • FRAUD DETECTION • REAL-TIME ANALYSIS
          </div>
          <div className="bg-gradient-to-l from-emerald-600 to-green-600 rounded-full w-48 flex items-center justify-center text-white font-bold">
            ONLINE
          </div>
        </div>
      </div>

      {/* Corner Accent - Bottom Left */}
      <div className="absolute bottom-0 left-0 w-32 h-64 bg-gradient-to-tr from-gray-600 to-gray-700 rounded-tr-[100px]" />
      
      {/* Corner Accent - Bottom Right */}
      <div className="absolute bottom-0 right-0 w-64 h-32 bg-gradient-to-tl from-emerald-600 to-green-700 rounded-tl-[100px]" />
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className={`${color} text-white rounded-2xl p-3 flex flex-col`}>
      <div className="text-xs font-bold opacity-75">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
