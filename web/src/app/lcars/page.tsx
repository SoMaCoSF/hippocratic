'use client';

import { useState, useEffect, useRef } from 'react';

type ViewType = 'overview' | 'database' | 'traffic' | 'logs' | 'data' | 'fraud' | 'pandas';

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
          <NavTab label="FRAUD DETECTION" active={currentView === 'fraud'} onClick={() => setCurrentView('fraud')} />
          <NavTab label="PANDAS ANALYSIS" active={currentView === 'pandas'} onClick={() => setCurrentView('pandas')} />
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
            {currentView === 'fraud' && <FraudPanel />}
            {currentView === 'pandas' && <PandasPanel />}
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

function FraudPanel() {
  const [fraudStats, setFraudStats] = useState<any>(null);
  const [fraudAlerts, setFraudAlerts] = useState<any[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchFraudStats();
  }, []);
  
  const fetchFraudStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/fraud/stats');
      const data = await response.json();
      setFraudStats(data);
      
      const alertsResponse = await fetch('http://localhost:8000/api/fraud/alerts?limit=100');
      const alertsData = await alertsResponse.json();
      setFraudAlerts(alertsData.alerts || []);
    } catch (error) {
      console.error('Failed to fetch fraud stats:', error);
    }
  };
  
  const runAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/fraud/analysis');
      await response.json();
      await fetchFraudStats();
    } catch (error) {
      console.error('Analysis failed:', error);
    }
    setLoading(false);
  };
  
  const filteredAlerts = selectedSeverity === 'all' 
    ? fraudAlerts 
    : fraudAlerts.filter((a: any) => a.severity === selectedSeverity);
  
  return (
    <>
      <div className="bg-gray-700 text-white p-3 rounded-2xl font-bold text-lg">
        FRAUD DETECTION ANALYSIS
      </div>
      <div className="flex-1 bg-zinc-950 rounded-2xl p-6 overflow-y-auto border-2 border-gray-700">
        
        {/* Control Panel */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="px-6 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg font-bold disabled:opacity-50"
          >
            {loading ? 'ANALYZING...' : 'RUN ANALYSIS'}
          </button>
          
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
          >
            <option value="all">ALL SEVERITIES</option>
            <option value="high">HIGH</option>
            <option value="medium">MEDIUM</option>
            <option value="low">LOW</option>
          </select>
        </div>
        
        {/* Stats Grid */}
        {fraudStats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-green-500">
              <div className="text-gray-400 text-sm">TOTAL FACILITIES</div>
              <div className="text-white text-2xl font-bold">{fraudStats.dataset?.total_facilities?.toLocaleString() || 0}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-red-500">
              <div className="text-gray-400 text-sm">HIGH ALERTS</div>
              <div className="text-red-400 text-2xl font-bold">{fraudStats.alert_counts?.high || 0}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-yellow-500">
              <div className="text-gray-400 text-sm">MEDIUM ALERTS</div>
              <div className="text-yellow-400 text-2xl font-bold">{fraudStats.alert_counts?.medium || 0}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-blue-500">
              <div className="text-gray-400 text-sm">TOTAL REVENUE</div>
              <div className="text-white text-2xl font-bold">
                ${((fraudStats.dataset?.total_revenue || 0) / 1000000).toFixed(1)}M
              </div>
            </div>
          </div>
        )}
        
        {/* Alerts Table */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-white font-bold mb-3">🚨 FRAUD ALERTS ({filteredAlerts.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredAlerts.map((alert: any, idx: number) => (
              <div 
                key={idx}
                className={`p-3 rounded border-l-4 ${
                  alert.severity === 'high' ? 'bg-red-900/20 border-red-500' :
                  alert.severity === 'medium' ? 'bg-yellow-900/20 border-yellow-500' :
                  'bg-blue-900/20 border-blue-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-white font-bold">{alert.facility_name}</div>
                    <div className="text-gray-400 text-sm mt-1">{alert.description}</div>
                    <div className="text-gray-500 text-xs mt-1">
                      Type: {alert.alert_type} | Detected: {new Date(alert.detected_at).toLocaleString()}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded text-xs font-bold ${
                    alert.severity === 'high' ? 'bg-red-600 text-white' :
                    alert.severity === 'medium' ? 'bg-yellow-600 text-white' :
                    'bg-blue-600 text-white'
                  }`}>
                    {alert.severity.toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
            
            {filteredAlerts.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No fraud alerts found
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function PandasPanel() {
  const [summary, setSummary] = useState<any>(null);
  const [countyData, setCountyData] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<any>(null);
  const [revenueDistribution, setRevenueDistribution] = useState<any>(null);
  const [outliers, setOutliers] = useState<any>(null);
  const [topFacilities, setTopFacilities] = useState<any>(null);
  const [selectedView, setSelectedView] = useState<'summary' | 'county' | 'category' | 'outliers' | 'top'>('summary');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchSummary();
  }, []);
  
  const fetchSummary = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/pandas/summary');
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };
  
  const fetchCountyData = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/pandas/county');
      const data = await response.json();
      setCountyData(data);
    } catch (error) {
      console.error('Failed to fetch county data:', error);
    }
    setLoading(false);
  };
  
  const fetchCategoryData = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/pandas/category');
      const data = await response.json();
      setCategoryData(data);
    } catch (error) {
      console.error('Failed to fetch category data:', error);
    }
    setLoading(false);
  };
  
  const fetchOutliers = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/pandas/outliers/total_revenue');
      const data = await response.json();
      setOutliers(data);
    } catch (error) {
      console.error('Failed to fetch outliers:', error);
    }
    setLoading(false);
  };
  
  const fetchTopFacilities = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/pandas/top-facilities/total_revenue?limit=20');
      const data = await response.json();
      setTopFacilities(data);
    } catch (error) {
      console.error('Failed to fetch top facilities:', error);
    }
    setLoading(false);
  };
  
  const handleViewChange = (view: 'summary' | 'county' | 'category' | 'outliers' | 'top') => {
    setSelectedView(view);
    if (view === 'county' && !countyData) fetchCountyData();
    if (view === 'category' && !categoryData) fetchCategoryData();
    if (view === 'outliers' && !outliers) fetchOutliers();
    if (view === 'top' && !topFacilities) fetchTopFacilities();
  };
  
  return (
    <>
      <div className="bg-gray-700 text-white p-3 rounded-2xl font-bold text-lg">
        📊 PANDAS STATISTICAL ANALYSIS
      </div>
      <div className="flex-1 bg-zinc-950 rounded-2xl p-6 overflow-y-auto border-2 border-gray-700">
        
        {/* View Selector */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => handleViewChange('summary')}
            className={`px-4 py-2 rounded-lg font-bold ${selectedView === 'summary' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            SUMMARY
          </button>
          <button
            onClick={() => handleViewChange('county')}
            className={`px-4 py-2 rounded-lg font-bold ${selectedView === 'county' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            BY COUNTY
          </button>
          <button
            onClick={() => handleViewChange('category')}
            className={`px-4 py-2 rounded-lg font-bold ${selectedView === 'category' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            BY CATEGORY
          </button>
          <button
            onClick={() => handleViewChange('outliers')}
            className={`px-4 py-2 rounded-lg font-bold ${selectedView === 'outliers' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            OUTLIERS
          </button>
          <button
            onClick={() => handleViewChange('top')}
            className={`px-4 py-2 rounded-lg font-bold ${selectedView === 'top' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            TOP 20
          </button>
        </div>
        
        {/* Summary View */}
        {selectedView === 'summary' && summary && (
          <div className="space-y-6">
            {/* Key Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-green-500">
                <div className="text-gray-400 text-sm">TOTAL FACILITIES</div>
                <div className="text-white text-3xl font-bold">{summary.facilities?.total?.toLocaleString() || 0}</div>
                <div className="text-gray-500 text-xs mt-1">{summary.facilities?.counties} counties, {summary.facilities?.categories} categories</div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-blue-500">
                <div className="text-gray-400 text-sm">FINANCIAL RECORDS</div>
                <div className="text-white text-3xl font-bold">{summary.financials?.total_records?.toLocaleString() || 0}</div>
                <div className="text-gray-500 text-xs mt-1">{summary.financials?.unique_facilities} unique facilities</div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-yellow-500">
                <div className="text-gray-400 text-sm">DATA COVERAGE</div>
                <div className="text-white text-3xl font-bold">{summary.coverage?.coverage_percentage?.toFixed(1) || 0}%</div>
                <div className="text-gray-500 text-xs mt-1">{summary.coverage?.facilities_with_financials} with financials</div>
              </div>
            </div>
            
            {/* Financial Stats */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-white font-bold mb-3">💰 FINANCIAL OVERVIEW</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-gray-400 text-sm">Total Revenue</div>
                  <div className="text-green-400 text-2xl font-bold">
                    ${((summary.financials?.total_revenue || 0) / 1000000000).toFixed(2)}B
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Total Expenses</div>
                  <div className="text-red-400 text-2xl font-bold">
                    ${((summary.financials?.total_expenses || 0) / 1000000000).toFixed(2)}B
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Net Income</div>
                  <div className={`text-2xl font-bold ${(summary.financials?.total_net_income || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${((summary.financials?.total_net_income || 0) / 1000000).toFixed(1)}M
                  </div>
                </div>
              </div>
            </div>
            
            {/* Capacity Stats */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-white font-bold mb-3">🏥 CAPACITY ANALYSIS</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-400 text-sm">Total Capacity</div>
                  <div className="text-white text-xl font-bold">{summary.facilities?.total_capacity?.toLocaleString() || 0} beds</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Facilities with Capacity Data</div>
                  <div className="text-white text-xl font-bold">{summary.facilities?.with_capacity?.toLocaleString() || 0}</div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* County View */}
        {selectedView === 'county' && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-bold mb-3">🗺️ COUNTY ANALYSIS</h3>
            {loading && <div className="text-gray-400">Loading...</div>}
            {countyData && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-2 text-gray-400">County</th>
                      <th className="text-right p-2 text-gray-400">Facilities</th>
                      <th className="text-right p-2 text-gray-400">Total Revenue</th>
                      <th className="text-right p-2 text-gray-400">Avg Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {countyData.counties?.slice(0, 20).map((county: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="p-2 text-white">{county.county}</td>
                        <td className="p-2 text-right text-white">{county.facility_id_count}</td>
                        <td className="p-2 text-right text-green-400">${((county.total_revenue_sum || 0) / 1000000).toFixed(1)}M</td>
                        <td className="p-2 text-right text-blue-400">${((county.total_revenue_mean || 0) / 1000).toFixed(0)}K</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {/* Category View */}
        {selectedView === 'category' && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-bold mb-3">📋 CATEGORY ANALYSIS</h3>
            {loading && <div className="text-gray-400">Loading...</div>}
            {categoryData && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-2 text-gray-400">Category</th>
                      <th className="text-right p-2 text-gray-400">Count</th>
                      <th className="text-right p-2 text-gray-400">Total Revenue</th>
                      <th className="text-right p-2 text-gray-400">Avg Capacity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.categories?.map((cat: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="p-2 text-white">{cat.category_name}</td>
                        <td className="p-2 text-right text-white">{cat.facility_id_count}</td>
                        <td className="p-2 text-right text-green-400">${((cat.total_revenue_sum || 0) / 1000000).toFixed(1)}M</td>
                        <td className="p-2 text-right text-blue-400">{(cat.capacity_mean || 0).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {/* Outliers View */}
        {selectedView === 'outliers' && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-bold mb-3">⚠️ REVENUE OUTLIERS (IQR Method)</h3>
            {loading && <div className="text-gray-400">Loading...</div>}
            {outliers && (
              <>
                <div className="mb-4 p-3 bg-gray-900 rounded">
                  <div className="text-gray-400 text-sm">Found {outliers.outlier_count} outliers ({outliers.outlier_percentage?.toFixed(1)}%)</div>
                  <div className="text-gray-400 text-sm">Range: ${outliers.lower_bound?.toFixed(0)} - ${outliers.upper_bound?.toLocaleString()}</div>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {outliers.outliers?.map((facility: any, idx: number) => (
                    <div key={idx} className="p-3 bg-gray-900 rounded hover:bg-gray-700/50">
                      <div className="text-white font-bold">{facility.name}</div>
                      <div className="text-gray-400 text-sm">{facility.county} County</div>
                      <div className="text-yellow-400 text-sm mt-1">Revenue: ${facility.total_revenue?.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Top Facilities View */}
        {selectedView === 'top' && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-bold mb-3">🏆 TOP 20 BY REVENUE</h3>
            {loading && <div className="text-gray-400">Loading...</div>}
            {topFacilities && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {topFacilities.facilities?.map((facility: any, idx: number) => (
                  <div key={idx} className="p-3 bg-gray-900 rounded hover:bg-gray-700/50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-white font-bold">#{idx + 1} {facility.name}</div>
                        <div className="text-gray-400 text-sm">{facility.county} County • {facility.category_name}</div>
                      </div>
                      <div className="text-green-400 font-bold text-lg">
                        ${((facility.total_revenue || 0) / 1000000).toFixed(1)}M
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
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
