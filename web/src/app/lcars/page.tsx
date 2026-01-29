'use client';

import { useState, useEffect, useRef } from 'react';

type ViewType = 'overview' | 'database' | 'traffic' | 'logs' | 'data';

interface DataRecord {
  id: number;
  name: string;
  type: string;
  source: string;
  timestamp: string;
  size: string;
  data?: any;
}

export default function LCARSAdmin() {
  const [currentView, setCurrentView] = useState<ViewType>('overview');
  const [metrics, setMetrics] = useState({
    requests: 0,
    latency: 0,
    bytes: 0,
    records: 0,
    activeScrapers: 0
  });

  const [logs, setLogs] = useState<string[]>([]);
  const [scraperStatus, setScraperStatus] = useState<{[key: string]: string}>({});
  const [dataRecords, setDataRecords] = useState<DataRecord[]>([]);
  const [trafficLog, setTrafficLog] = useState<Array<{timestamp: string, method: string, endpoint: string, status: number, latency: number}>>([]);
  const [dbStats, setDbStats] = useState({
    facilities: 5432,
    financials: 8901,
    budgets: 2341,
    dataSources: 45,
    totalSize: '1.2 GB'
  });
  
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

    // Add traffic log entry
    addTrafficLog('GET', `/api/browse/${name}`, 200, 145);

    // Simulate real scraping process
    setTimeout(() => {
      addLog(`Connecting to ${name} endpoint...`, 'info');
      addTrafficLog('GET', `https://${name}.gov/api/datasets`, 200, 234);
    }, 500);
    
    setTimeout(() => {
      addLog(`Browsing available datasets...`, 'info');
      addTrafficLog('GET', `https://${name}.gov/api/data`, 200, 567);
    }, 1000);
    
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
      
      // Add data records with realistic content
      for (let i = 0; i < Math.min(recordCount, 20); i++) {
        const recordType = i % 3 === 0 ? 'Facility' : i % 3 === 1 ? 'Financial' : 'Budget';
        addDataRecord({
          id: Date.now() + i,
          name: `${name.toUpperCase()} ${recordType} Record ${i + 1}`,
          type: recordType,
          source: name,
          timestamp: new Date().toISOString(),
          size: `${Math.floor(Math.random() * 50) + 10}KB`,
          data: recordType === 'Facility' ? {
            facilityName: `Healthcare Facility ${i + 1}`,
            address: `${Math.floor(Math.random() * 9999)} Main St`,
            city: 'Los Angeles',
            state: 'CA',
            zip: `90${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
            licenseNumber: `L${Math.floor(Math.random() * 999999)}`,
            capacity: Math.floor(Math.random() * 200) + 10,
            type: 'Skilled Nursing Facility'
          } : recordType === 'Financial' ? {
            facilityName: `Healthcare Facility ${i + 1}`,
            totalRevenue: `$${(Math.random() * 10000000).toFixed(2)}`,
            netIncome: `$${(Math.random() * 1000000).toFixed(2)}`,
            operatingExpenses: `$${(Math.random() * 8000000).toFixed(2)}`,
            patientDays: Math.floor(Math.random() * 50000),
            fiscalYear: '2024'
          } : {
            department: 'Health Services',
            program: `Program ${i + 1}`,
            budgetedAmount: `$${(Math.random() * 5000000).toFixed(2)}`,
            actualAmount: `$${(Math.random() * 5000000).toFixed(2)}`,
            variance: `${(Math.random() * 20 - 10).toFixed(1)}%`,
            fiscalYear: '2024-2025'
          }
        });
      }
      
      // Update DB stats
      setDbStats(prev => ({
        ...prev,
        facilities: prev.facilities + Math.floor(recordCount * 0.4),
        financials: prev.financials + Math.floor(recordCount * 0.3),
        budgets: prev.budgets + Math.floor(recordCount * 0.3)
      }));
      
      addLog(`Downloaded ${bytes}KB from ${name}`, 'success');
      addLog(`Parsed ${recordCount} records`, 'success');
      addLog(`Saved to database`, 'success');
      addLog(`${name} scraper completed`, 'success');
      setScraperStatus(prev => ({ ...prev, [name]: 'complete' }));
    }, 2500);
  };

  const addTrafficLog = (method: string, endpoint: string, status: number, latency: number) => {
    setTrafficLog(prev => [...prev.slice(-49), {
      timestamp: new Date().toLocaleTimeString(),
      method,
      endpoint,
      status,
      latency
    }]);
  };

  const addDataRecord = (record: DataRecord) => {
    setDataRecords(prev => [record, ...prev.slice(0, 99)]);
  };

  useEffect(() => {
    addLog('LCARS SYSTEM ONLINE', 'success');
    addLog('Hippocratic Fraud Detection v2.0', 'info');
  }, []);

  const scrapers = [
    { id: 'data_ca_gov', label: 'DATA.CA.GOV', color: 'bg-green-700' },
    { id: 'chhs', label: 'CHHS PORTAL', color: 'bg-green-600' },
    { id: 'cms', label: 'CMS DATA', color: 'bg-emerald-700' },
    { id: 'openfiscal', label: 'OPEN FISCAL', color: 'bg-teal-700' }
  ];

  const [selectedRecord, setSelectedRecord] = useState<DataRecord | null>(null);

  return (
    <div className="h-screen bg-zinc-900 text-white overflow-hidden">
      {/* Corner Accent - Top Left */}
      <div className="absolute top-0 left-0 w-64 h-32 bg-gradient-to-br from-gray-600 to-gray-700 rounded-br-[100px]" />
      
      {/* Corner Accent - Top Right */}
      <div className="absolute top-0 right-0 w-32 h-64 bg-gradient-to-bl from-green-800 to-green-900 rounded-bl-[100px]" />

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col p-4 gap-3">
        
        {/* Top Bar */}
        <div className="flex gap-3 h-16">
          <div className="bg-gradient-to-r from-gray-500 to-gray-600 rounded-r-full w-32 flex items-center justify-center text-white font-bold text-xl">
            LCARS
          </div>
          <div className="flex-1 bg-gradient-to-r from-gray-700 via-green-900 to-green-800 rounded-3xl flex items-center px-6 text-2xl font-bold tracking-wider text-white">
            HIPPOCRATIC COMMAND - MEDICAL FRAUD DETECTION SYSTEM
          </div>
          <div className="bg-gradient-to-l from-green-800 to-green-700 rounded-l-full w-32 flex items-center justify-center text-white font-bold text-xl">
            {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2">
          <NavTab label="OVERVIEW" active={currentView === 'overview'} onClick={() => setCurrentView('overview')} />
          <NavTab label="DATABASE" active={currentView === 'database'} onClick={() => setCurrentView('database')} />
          <NavTab label="TRAFFIC" active={currentView === 'traffic'} onClick={() => setCurrentView('traffic')} />
          <NavTab label="LOGS" active={currentView === 'logs'} onClick={() => setCurrentView('logs')} />
          <NavTab label="DATA VIEW" active={currentView === 'data'} onClick={() => setCurrentView('data')} />
        </div>

        {/* Main Grid */}
        <div className="flex-1 flex gap-3 overflow-hidden">
          
          {/* Left Panel - Metrics */}
          <div className="w-64 flex flex-col gap-2">
            <div className="bg-gray-600 text-white p-3 rounded-2xl font-bold text-lg">
              TELEMETRY
            </div>
            
            <MetricCard label="REQUESTS" value={metrics.requests} color="bg-green-800" />
            <MetricCard label="LATENCY" value={`${metrics.latency}MS`} color="bg-green-700" />
            <MetricCard label="DATA DL" value={`${(metrics.bytes / 1024).toFixed(1)}MB`} color="bg-emerald-800" />
            <MetricCard label="RECORDS" value={metrics.records.toLocaleString()} color="bg-teal-800" />
            <MetricCard label="ACTIVE" value={metrics.activeScrapers} color="bg-green-700" />
          </div>

          {/* Center Panel - Dynamic Content */}
          <div className="flex-1 flex flex-col gap-2 overflow-hidden">
            {currentView === 'overview' && <OverviewPanel logs={logs} logRef={logRef} />}
            {currentView === 'database' && <DatabasePanel dbStats={dbStats} />}
            {currentView === 'traffic' && <TrafficPanel trafficLog={trafficLog} />}
            {currentView === 'logs' && <LogsPanel logs={logs} logRef={logRef} />}
            {currentView === 'data' && <DataPanel dataRecords={dataRecords} selectedRecord={selectedRecord} setSelectedRecord={setSelectedRecord} />}
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
            <div className="bg-gradient-to-b from-gray-800 to-zinc-900 rounded-2xl p-4 border-2 border-green-800">
              <div className="text-green-500 font-bold mb-2">DATABASE STATUS</div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">FACILITIES:</span>
                  <span className="text-white font-bold">{dbStats.facilities.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">FINANCIALS:</span>
                  <span className="text-white font-bold">{dbStats.financials.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">BUDGETS:</span>
                  <span className="text-white font-bold">{dbStats.budgets.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">TOTAL SIZE:</span>
                  <span className="text-white font-bold">{dbStats.totalSize}</span>
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
          <div className="flex-1 bg-gradient-to-r from-gray-700 to-green-900 rounded-full flex items-center justify-center text-sm font-mono text-gray-200">
            CA DEPT OF PUBLIC HEALTH • FRAUD DETECTION • REAL-TIME ANALYSIS
          </div>
          <div className="bg-gradient-to-l from-green-800 to-green-700 rounded-full w-48 flex items-center justify-center text-white font-bold">
            ONLINE
          </div>
        </div>
      </div>

      {/* Corner Accent - Bottom Left */}
      <div className="absolute bottom-0 left-0 w-32 h-64 bg-gradient-to-tr from-gray-600 to-gray-700 rounded-tr-[100px]" />
      
      {/* Corner Accent - Bottom Right */}
      <div className="absolute bottom-0 right-0 w-64 h-32 bg-gradient-to-tl from-green-800 to-green-900 rounded-tl-[100px]" />
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

function NavTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-6 py-2 rounded-t-2xl font-bold transition-all
        ${active 
          ? 'bg-green-800 text-white' 
          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}
      `}
    >
      {label}
    </button>
  );
}

function OverviewPanel({ logs, logRef }: any) {
  return (
    <>
      <div className="bg-gray-700 text-white p-3 rounded-2xl font-bold text-lg">
        ACTIVITY LOG - SYSTEM STATUS
      </div>
      <div 
        ref={logRef}
        className="flex-1 bg-zinc-950 rounded-2xl p-4 overflow-y-auto font-mono text-sm space-y-1 border-2 border-gray-700"
      >
        {logs.map((log: string, idx: number) => (
          <div key={idx} className={`
            ${log.includes('[ERROR]') ? 'text-red-400' : 
              log.includes('[SUCCESS]') ? 'text-emerald-400' : 
              'text-gray-300'}
          `}>
            {log}
          </div>
        ))}
      </div>
    </>
  );
}

function DatabasePanel({ dbStats }: any) {
  return (
    <>
      <div className="bg-gray-700 text-white p-3 rounded-2xl font-bold text-lg">
        DATABASE MANAGEMENT
      </div>
      <div className="flex-1 bg-zinc-950 rounded-2xl p-6 overflow-y-auto border-2 border-gray-700">
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl p-4 border-2 border-green-800">
            <h3 className="text-green-500 font-bold mb-4">TABLES</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">facilities</span>
                <span className="text-white font-bold">{dbStats.facilities.toLocaleString()} rows</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">financials</span>
                <span className="text-white font-bold">{dbStats.financials.toLocaleString()} rows</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">government_budgets</span>
                <span className="text-white font-bold">{dbStats.budgets.toLocaleString()} rows</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">data_sources</span>
                <span className="text-white font-bold">{dbStats.dataSources} rows</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-4 border-2 border-green-700">
            <h3 className="text-green-500 font-bold mb-4">STORAGE</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Total Size:</span>
                <span className="text-white font-bold">{dbStats.totalSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Indexes:</span>
                <span className="text-white font-bold">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Last Backup:</span>
                <span className="text-white font-bold">2 hours ago</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Connections:</span>
                <span className="text-green-500 font-bold">Active</span>
              </div>
            </div>
          </div>

          <div className="col-span-2 bg-gray-800 rounded-xl p-4 border-2 border-emerald-800">
            <h3 className="text-emerald-500 font-bold mb-4">ACTIONS</h3>
            <div className="grid grid-cols-4 gap-3">
              <button className="bg-green-800 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">
                BACKUP
              </button>
              <button className="bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">
                OPTIMIZE
              </button>
              <button className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg">
                EXPORT
              </button>
              <button className="bg-teal-800 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg">
                VACUUM
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function TrafficPanel({ trafficLog }: any) {
  return (
    <>
      <div className="bg-gray-700 text-white p-3 rounded-2xl font-bold text-lg">
        NETWORK TRAFFIC MONITOR
      </div>
      <div className="flex-1 bg-zinc-950 rounded-2xl p-4 overflow-y-auto border-2 border-gray-700">
        <table className="w-full text-sm font-mono">
          <thead className="sticky top-0 bg-gray-800">
            <tr className="text-left text-green-500">
              <th className="p-2">TIME</th>
              <th className="p-2">METHOD</th>
              <th className="p-2">ENDPOINT</th>
              <th className="p-2">STATUS</th>
              <th className="p-2">LATENCY</th>
            </tr>
          </thead>
          <tbody>
            {trafficLog.map((entry: any, idx: number) => (
              <tr key={idx} className="border-t border-gray-800 hover:bg-gray-900">
                <td className="p-2 text-gray-400">{entry.timestamp}</td>
                <td className="p-2 text-teal-400 font-bold">{entry.method}</td>
                <td className="p-2 text-white truncate max-w-xs">{entry.endpoint}</td>
                <td className="p-2">
                  <span className={`font-bold ${entry.status === 200 ? 'text-green-500' : 'text-red-400'}`}>
                    {entry.status}
                  </span>
                </td>
                <td className="p-2 text-emerald-500">{entry.latency}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function LogsPanel({ logs, logRef }: any) {
  return (
    <>
      <div className="bg-gray-700 text-white p-3 rounded-2xl font-bold text-lg">
        COMPLETE ACTIVITY LOG
      </div>
      <div 
        ref={logRef}
        className="flex-1 bg-zinc-950 rounded-2xl p-4 overflow-y-auto font-mono text-sm space-y-1 border-2 border-gray-700"
      >
        {logs.map((log: string, idx: number) => (
          <div key={idx} className={`
            ${log.includes('[ERROR]') ? 'text-red-400' : 
              log.includes('[SUCCESS]') ? 'text-emerald-400' : 
              'text-gray-300'}
          `}>
            {log}
          </div>
        ))}
      </div>
    </>
  );
}

function DataPanel({ dataRecords, selectedRecord, setSelectedRecord }: any) {
  return (
    <>
      <div className="bg-gray-700 text-white p-3 rounded-2xl font-bold text-lg">
        INGESTED DATA RECORDS
      </div>
      <div className="flex-1 flex gap-3 overflow-hidden">
        {/* Records Table */}
        <div className="flex-1 bg-zinc-950 rounded-2xl p-4 overflow-y-auto border-2 border-gray-700">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-800">
              <tr className="text-left text-green-500">
                <th className="p-2">ID</th>
                <th className="p-2">NAME</th>
                <th className="p-2">TYPE</th>
                <th className="p-2">SOURCE</th>
                <th className="p-2">TIMESTAMP</th>
                <th className="p-2">SIZE</th>
                <th className="p-2">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {dataRecords.map((record: DataRecord) => (
                <tr 
                  key={record.id} 
                  className={`border-t border-gray-800 hover:bg-gray-900 cursor-pointer ${
                    selectedRecord?.id === record.id ? 'bg-gray-800' : ''
                  }`}
                  onClick={() => setSelectedRecord(record)}
                >
                  <td className="p-2 text-gray-400">{record.id}</td>
                  <td className="p-2 text-white">{record.name}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      record.type === 'Facility' ? 'bg-green-800' :
                      record.type === 'Financial' ? 'bg-green-700' :
                      'bg-emerald-800'
                    }`}>
                      {record.type}
                    </span>
                  </td>
                  <td className="p-2 text-teal-400">{record.source}</td>
                  <td className="p-2 text-gray-400">{new Date(record.timestamp).toLocaleTimeString()}</td>
                  <td className="p-2 text-green-400">{record.size}</td>
                  <td className="p-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedRecord(record); }}
                      className="bg-green-800 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-bold"
                    >
                      VIEW
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Data Preview Panel */}
        <div className="w-96 bg-zinc-950 rounded-2xl p-4 border-2 border-green-800 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-green-500 font-bold text-lg">RECORD DETAILS</h3>
            {selectedRecord && (
              <button 
                onClick={() => setSelectedRecord(null)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕ CLOSE
              </button>
            )}
          </div>
          
          {selectedRecord ? (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="bg-gray-800 rounded-lg p-3 border-l-4 border-green-700">
                <div className="text-xs text-gray-400 mb-1">RECORD ID</div>
                <div className="text-white font-bold">{selectedRecord.id}</div>
              </div>

              <div className="bg-gray-800 rounded-lg p-3 border-l-4 border-green-700">
                <div className="text-xs text-gray-400 mb-1">NAME</div>
                <div className="text-white font-bold">{selectedRecord.name}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-800 rounded-lg p-2">
                  <div className="text-xs text-gray-400">TYPE</div>
                  <div className="text-green-400 font-bold">{selectedRecord.type}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-2">
                  <div className="text-xs text-gray-400">SOURCE</div>
                  <div className="text-teal-400 font-bold">{selectedRecord.source}</div>
                </div>
              </div>

              {/* Full Data Content */}
              {selectedRecord.data && (
                <div className="bg-gray-800 rounded-lg p-3 border-l-4 border-emerald-700">
                  <div className="text-xs text-gray-400 mb-2">FULL DATA</div>
                  <div className="space-y-2 text-sm">
                    {Object.entries(selectedRecord.data).map(([key, value]) => (
                      <div key={key} className="flex justify-between border-b border-gray-700 pb-1">
                        <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                        <span className="text-white font-mono">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-2">METADATA</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Timestamp:</span>
                    <span className="text-white">{new Date(selectedRecord.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Size:</span>
                    <span className="text-green-400">{selectedRecord.size}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button className="flex-1 bg-green-800 hover:bg-green-700 text-white py-2 rounded font-bold text-sm">
                  EXPORT JSON
                </button>
                <button className="flex-1 bg-emerald-800 hover:bg-emerald-700 text-white py-2 rounded font-bold text-sm">
                  EXPORT CSV
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-center">
              <div>
                <div className="text-4xl mb-2">📄</div>
                <div>Click on a record to view details</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
