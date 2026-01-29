// ==============================================================================
// file_id: SOM-SCR-0028-v3.0.0
// name: page.tsx
// description: Admin dashboard + data ingest page (AUTH REQUIRED)
// project_id: HIPPOCRATIC
// category: script
// tags: [web, nextjs, ingest, csv, data-import, auth, dashboard]
// created: 2026-01-28
// modified: 2026-01-29
// version: 3.0.0
// ==============================================================================

"use client";

import Link from "next/link";
import { useState, useCallback, useMemo, useRef, Suspense, useEffect } from "react";
import { AuthGuard } from "@/app/components/AuthGuard";

// Field definitions for mapping
const FACILITY_FIELDS = [
  { key: "id", label: "ID", required: true, desc: "Unique identifier" },
  { key: "name", label: "Name", required: true, desc: "Facility name" },
  { key: "licenseNumber", label: "License #", required: false, desc: "State license number" },
  { key: "categoryCode", label: "Category Code", required: false, desc: "e.g., HHA, HSP" },
  { key: "categoryName", label: "Category Name", required: false, desc: "Full category name" },
  { key: "address", label: "Address", required: false, desc: "Street address" },
  { key: "city", label: "City", required: false, desc: "City name" },
  { key: "state", label: "State", required: false, desc: "State code" },
  { key: "zip", label: "ZIP", required: false, desc: "ZIP code" },
  { key: "county", label: "County", required: false, desc: "County name" },
  { key: "phone", label: "Phone", required: false, desc: "Phone number" },
  { key: "lat", label: "Latitude", required: false, desc: "Latitude coordinate" },
  { key: "lng", label: "Longitude", required: false, desc: "Longitude coordinate" },
  { key: "inService", label: "In Service", required: false, desc: "Active status (true/false)" },
  { key: "businessName", label: "Business/Owner", required: false, desc: "Licensee business name" },
  { key: "contactEmail", label: "Admin Email", required: false, desc: "Administrator email" },
];

const FINANCIAL_FIELDS = [
  { key: "licenseNumber", label: "License #", required: true, desc: "For joining to facilities" },
  { key: "facNo", label: "Facility No", required: false, desc: "HCAI facility ID" },
  { key: "facName", label: "Facility Name", required: false, desc: "Name in financial data" },
  { key: "hhahMediCalVisits", label: "HHA Medi-Cal Visits", required: false, desc: "Home health Medi-Cal visits" },
  { key: "hhahMedicareVisits", label: "HHA Medicare Visits", required: false, desc: "Home health Medicare visits" },
  { key: "hospiceMediCalPatients", label: "Hospice Medi-Cal Patients", required: false, desc: "Hospice Medi-Cal count" },
  { key: "hospiceMedicarePatients", label: "Hospice Medicare Patients", required: false, desc: "Hospice Medicare count" },
  { key: "hospiceMediCalRevenue", label: "Hospice Medi-Cal Revenue", required: false, desc: "Hospice Medi-Cal $" },
  { key: "hospiceMedicareRevenue", label: "Hospice Medicare Revenue", required: false, desc: "Hospice Medicare $" },
  { key: "hospiceTotalRevenue", label: "Hospice Total Revenue", required: false, desc: "Total hospice revenue" },
  { key: "hospiceNetIncome", label: "Hospice Net Income", required: false, desc: "Net income (can be negative)" },
];

type DataType = "facilities" | "financials";
type ColumnMapping = Record<string, string>; // csvColumn -> fieldKey

interface ParsedCSV {
  headers: string[];
  rows: string[][];
  rowCount: number;
}

// Parse CSV handling quoted fields
function parseCSV(text: string): ParsedCSV {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [], rowCount: 0 };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);

  return { headers, rows, rowCount: rows.length };
}

// Auto-detect column mappings based on header names
function autoMapColumns(headers: string[], dataType: DataType): ColumnMapping {
  const fields = dataType === "facilities" ? FACILITY_FIELDS : FINANCIAL_FIELDS;
  const mapping: ColumnMapping = {};

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Common mappings
  const aliases: Record<string, string[]> = {
    id: ["id", "facilityid", "fac_id", "facility_id"],
    name: ["name", "facilityname", "fac_name", "facility_name", "facname"],
    licenseNumber: ["license", "licensenumber", "license_number", "lic_num", "license_num", "license_no", "licno"],
    categoryCode: ["categorycode", "category_code", "cat_code", "type_code", "lic_cat"],
    categoryName: ["categoryname", "category_name", "category", "type", "facilitytype"],
    address: ["address", "street", "streetaddress", "fac_str_addr", "street_address"],
    city: ["city", "fac_city"],
    state: ["state", "st"],
    zip: ["zip", "zipcode", "zip_code", "fac_zip", "postal"],
    county: ["county", "fac_county"],
    phone: ["phone", "telephone", "fac_phone", "phone_number"],
    lat: ["lat", "latitude", "y"],
    lng: ["lng", "lon", "longitude", "x"],
    inService: ["inservice", "in_service", "active", "status"],
    businessName: ["businessname", "business_name", "owner", "licensee", "licenseename"],
    contactEmail: ["email", "contactemail", "contact_email", "admin_email", "administrator"],
    facNo: ["fac_no", "facno", "oshpd_id", "facility_number"],
    facName: ["fac_name", "facname", "facility_name"],
    hhahMediCalVisits: ["hhah_medi_cal_visits", "hha_medical_visits", "medical_visits"],
    hhahMedicareVisits: ["hhah_medicare_visits", "hha_medicare_visits", "medicare_visits"],
    hospiceMediCalPatients: ["hospice_pats_paid_by_medi_cal", "hospice_medical_patients"],
    hospiceMedicarePatients: ["hospice_pats_paid_by_medicare", "hospice_medicare_patients"],
    hospiceMediCalRevenue: ["hospice_medi_cal_revenue", "hospice_medical_revenue"],
    hospiceMedicareRevenue: ["hospice_medicare_revenue"],
    hospiceTotalRevenue: ["hospice_tot_oper_revenue", "hospice_total_revenue", "total_revenue"],
    hospiceNetIncome: ["hospice_net_income", "net_income", "net_fr_op"],
  };

  for (const header of headers) {
    const norm = normalize(header);
    for (const field of fields) {
      const fieldAliases = aliases[field.key] || [normalize(field.key)];
      if (fieldAliases.some((a) => norm === a || norm.includes(a) || a.includes(norm))) {
        mapping[header] = field.key;
        break;
      }
    }
  }

  return mapping;
}

// Convert row to record using mapping
function rowToRecord(row: string[], headers: string[], mapping: ColumnMapping): Record<string, unknown> {
  const record: Record<string, unknown> = {};

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const fieldKey = mapping[header];
    if (fieldKey && row[i] !== undefined) {
      let value: unknown = row[i];

      // Type conversion
      if (["lat", "lng"].includes(fieldKey)) {
        value = parseFloat(row[i]) || null;
      } else if (fieldKey === "inService") {
        const v = row[i].toLowerCase();
        value = v === "true" || v === "1" || v === "yes" || v === "y";
      } else if (
        [
          "hhahMediCalVisits",
          "hhahMedicareVisits",
          "hospiceMediCalPatients",
          "hospiceMedicarePatients",
          "hospiceMediCalRevenue",
          "hospiceMedicareRevenue",
          "hospiceTotalRevenue",
          "hospiceNetIncome",
        ].includes(fieldKey)
      ) {
        value = parseFloat(row[i].replace(/[,$]/g, "")) || null;
      }

      record[fieldKey] = value;
    }
  }

  return record;
}

function IngestPageContent() {
  // Tab state
  const [activeTab, setActiveTab] = useState<"dashboard" | "ingest">("dashboard");
  
  // Dashboard state
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [ingestionLogs, setIngestionLogs] = useState<any[]>([]);
  const [budgetStats, setBudgetStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Ingest state
  const [dataType, setDataType] = useState<DataType>("facilities");
  const [csvData, setCsvData] = useState<ParsedCSV | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState(10);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fields = dataType === "facilities" ? FACILITY_FIELDS : FINANCIAL_FIELDS;

  // Load dashboard data
  useEffect(() => {
    if (activeTab === "dashboard") {
      loadDashboardData();
    }
  }, [activeTab]);
  
  const loadDashboardData = async () => {
    setStatsLoading(true);
    try {
      const [sourcesRes, logsRes, budgetRes] = await Promise.all([
        fetch('/api/data-sources'),
        fetch('/api/ingestion-logs?limit=20'),
        fetch('/api/budget-stats')
      ]);
      
      if (sourcesRes.ok) {
        const data = await sourcesRes.json();
        setDataSources(data.sources || []);
      }
      
      if (logsRes.ok) {
        const data = await logsRes.json();
        setIngestionLogs(data.logs || []);
      }
      
      if (budgetRes.ok) {
        const data = await budgetRes.json();
        setBudgetStats(data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);
      setExportStatus(null);
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const parsed = parseCSV(text);

          if (parsed.headers.length === 0) {
            setError("No headers found in CSV file");
            return;
          }

          setCsvData(parsed);

          // Auto-map columns
          const autoMapping = autoMapColumns(parsed.headers, dataType);
          setMapping(autoMapping);
        } catch (err) {
          setError(`Parse error: ${err instanceof Error ? err.message : String(err)}`);
        }
      };
      reader.onerror = () => setError("Failed to read file");
      reader.readAsText(file);
    },
    [dataType]
  );

  const handleMappingChange = useCallback((csvColumn: string, fieldKey: string) => {
    setMapping((prev) => {
      const next = { ...prev };
      if (fieldKey === "") {
        delete next[csvColumn];
      } else {
        next[csvColumn] = fieldKey;
      }
      return next;
    });
  }, []);

  const convertedRecords = useMemo(() => {
    if (!csvData) return [];
    return csvData.rows.map((row) => rowToRecord(row, csvData.headers, mapping));
  }, [csvData, mapping]);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    const requiredFields = fields.filter((f) => f.required).map((f) => f.key);
    const mappedFields = new Set(Object.values(mapping));

    for (const req of requiredFields) {
      if (!mappedFields.has(req)) {
        errors.push(`Required field "${req}" is not mapped`);
      }
    }

    // Check for duplicates in mapping
    const mappedValues = Object.values(mapping);
    const seen = new Set<string>();
    for (const v of mappedValues) {
      if (seen.has(v)) {
        errors.push(`Field "${v}" is mapped multiple times`);
      }
      seen.add(v);
    }

    return errors;
  }, [mapping, fields]);

  const handleExportJSON = useCallback(() => {
    if (convertedRecords.length === 0) return;

    const output =
      dataType === "facilities"
        ? { records: convertedRecords, meta: { count: convertedRecords.length, exportedAt: new Date().toISOString() } }
        : convertedRecords;

    const blob = new Blob([JSON.stringify(output, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = dataType === "facilities" ? "facilities.json" : "financials.json";
    a.click();
    URL.revokeObjectURL(url);

    setExportStatus(`Exported ${convertedRecords.length} records to ${a.download}`);
  }, [convertedRecords, dataType]);

  const clearData = useCallback(() => {
    setCsvData(null);
    setMapping({});
    setFileName("");
    setError(null);
    setExportStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleSaveToStorage = useCallback(() => {
    if (convertedRecords.length === 0) return;

    const key = dataType === "facilities" ? "hippocratic_facilities_import" : "hippocratic_financials_import";
    localStorage.setItem(key, JSON.stringify(convertedRecords));
    setExportStatus(`Saved ${convertedRecords.length} records to browser storage (${key})`);
  }, [convertedRecords, dataType]);

  const handleSaveToDatabase = useCallback(async () => {
    if (convertedRecords.length === 0) return;

    setExportStatus("Saving to database...");

    try {
      const endpoint = dataType === "facilities" ? "/api/facilities" : "/api/financials";
      const payload = dataType === "facilities" 
        ? { facilities: convertedRecords }
        : { financials: convertedRecords };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to save: ${response.statusText}`);
      }

      const result = await response.json();
      setExportStatus(`✅ Successfully saved ${result.inserted} records to database!`);
      
      // Clear data after successful save
      setTimeout(() => {
        clearData();
      }, 2000);
    } catch (err) {
      setExportStatus(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [convertedRecords, dataType, clearData]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top Navigation Bar */}
      <div className="bg-zinc-900/95 backdrop-blur border-b border-zinc-700 sticky top-0 z-50">
        <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto">
          <Link
            href="/map"
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
            className="flex-shrink-0 px-3 py-1 rounded-full bg-yellow-600 text-white text-xs font-medium"
          >
            📥 Admin
          </Link>
          <Link
            href="/about"
            className="flex-shrink-0 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium"
          >
            ℹ️ About
          </Link>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="bg-zinc-900 border-b border-zinc-700 px-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "dashboard"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveTab("ingest")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "ingest"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            📥 Manual Ingest
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            
            {statsLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                <p className="mt-4 text-zinc-400">Loading dashboard...</p>
              </div>
            ) : (
              <>
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-700">
                    <div className="text-zinc-400 text-sm mb-2">Data Sources Tracked</div>
                    <div className="text-3xl font-bold text-blue-400">{dataSources.length}</div>
                  </div>
                  
                  <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-700">
                    <div className="text-zinc-400 text-sm mb-2">Budget Records</div>
                    <div className="text-3xl font-bold text-green-400">
                      {budgetStats?.totalBudgetRecords?.toLocaleString() || 0}
                    </div>
                  </div>
                  
                  <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-700">
                    <div className="text-zinc-400 text-sm mb-2">Healthcare Spending</div>
                    <div className="text-3xl font-bold text-yellow-400">
                      ${((budgetStats?.healthcareSpending?.total || 0) / 1000000).toFixed(1)}M
                    </div>
                  </div>
                  
                  <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-700">
                    <div className="text-zinc-400 text-sm mb-2">Facility Payments</div>
                    <div className="text-3xl font-bold text-purple-400">
                      {budgetStats?.facilityPayments?.toLocaleString() || 0}
                    </div>
                  </div>
                </div>
                
                {/* Data Sources */}
                <div className="bg-zinc-900 rounded-lg border border-zinc-700">
                  <div className="p-6 border-b border-zinc-700">
                    <h2 className="text-xl font-bold">Data Sources</h2>
                    <p className="text-sm text-zinc-400 mt-1">
                      {dataSources.filter((s: any) => s.data_type === 'budget').length} budget sources, 
                      {' '}{dataSources.filter((s: any) => s.data_type !== 'budget').length} healthcare sources
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-zinc-800/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Priority</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Title</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Domain</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Format</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-700">
                        {dataSources.slice(0, 20).map((source: any) => (
                          <tr key={source.id} className="hover:bg-zinc-800/30">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                                source.priority >= 9 ? 'bg-red-500/20 text-red-400' :
                                source.priority >= 7 ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-blue-500/20 text-blue-400'
                              }`}>
                                {source.priority}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium">{source.title}</div>
                              <div className="text-xs text-zinc-500 truncate max-w-xs">{source.url}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                              {source.domain}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                source.data_type === 'budget' ? 'bg-green-500/20 text-green-400' :
                                source.data_type === 'financial' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-blue-500/20 text-blue-400'
                              }`}>
                                {source.data_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                              {source.format}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                source.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                source.status === 'error' ? 'bg-red-500/20 text-red-400' :
                                'bg-zinc-500/20 text-zinc-400'
                              }`}>
                                {source.status || 'discovered'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 mr-3"
                              >
                                🔗
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Recent Ingestion Logs */}
                <div className="bg-zinc-900 rounded-lg border border-zinc-700">
                  <div className="p-6 border-b border-zinc-700">
                    <h2 className="text-xl font-bold">Recent Ingestion Logs</h2>
                    <p className="text-sm text-zinc-400 mt-1">
                      Last {ingestionLogs.length} ingestion attempts
                    </p>
                  </div>
                  
                  <div className="divide-y divide-zinc-700">
                    {ingestionLogs.length === 0 ? (
                      <div className="p-8 text-center text-zinc-500">
                        No ingestion logs yet. Run data fetchers to populate.
                      </div>
                    ) : (
                      ingestionLogs.map((log: any) => (
                        <div key={log.id} className="p-4 hover:bg-zinc-800/30">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className={`w-2 h-2 rounded-full ${
                                  log.status === 'success' ? 'bg-green-400' :
                                  log.status === 'error' ? 'bg-red-400' :
                                  log.status === 'partial' ? 'bg-yellow-400' :
                                  'bg-blue-400'
                                }`}></span>
                                <span className="font-medium">{log.source_title || log.source_domain}</span>
                                <span className="text-xs text-zinc-500">
                                  {new Date(log.started_at).toLocaleString()}
                                </span>
                              </div>
                              <div className="mt-2 text-sm text-zinc-400 flex gap-4">
                                <span>✓ {log.records_inserted?.toLocaleString() || 0} inserted</span>
                                <span>↻ {log.records_updated?.toLocaleString() || 0} updated</span>
                                <span>⊗ {log.records_skipped?.toLocaleString() || 0} skipped</span>
                                {log.execution_time_ms && (
                                  <span>⏱️ {(log.execution_time_ms / 1000).toFixed(2)}s</span>
                                )}
                              </div>
                              {log.error_message && (
                                <div className="mt-2 text-sm text-red-400">
                                  Error: {log.error_message}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                {/* Budget Statistics */}
                {budgetStats?.topDepartments && budgetStats.topDepartments.length > 0 && (
                  <div className="bg-zinc-900 rounded-lg border border-zinc-700">
                    <div className="p-6 border-b border-zinc-700">
                      <h2 className="text-xl font-bold">Top Budget Departments</h2>
                    </div>
                    
                    <div className="p-6">
                      <div className="space-y-3">
                        {budgetStats.topDepartments.map((dept: any, i: number) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium truncate">{dept.department}</div>
                              <div className="text-xs text-zinc-500">{dept.record_count} records</div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-400">
                                ${(dept.total_amount / 1000000).toFixed(1)}M
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Quick Actions */}
                <div className="bg-zinc-900 rounded-lg border border-zinc-700">
                  <div className="p-6 border-b border-zinc-700">
                    <h2 className="text-xl font-bold">Quick Actions</h2>
                  </div>
                  
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={loadDashboardData}
                      className="px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      🔄 Refresh Dashboard
                    </button>
                    
                    <button
                      onClick={() => setActiveTab("ingest")}
                      className="px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      📥 Manual Ingest
                    </button>
                    
                    <a
                      href="https://github.com/SoMaCoSF/hippocratic/issues/1"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors text-center"
                    >
                      📊 View Live Ingestion Status
                    </a>
                    
                    <div className="px-4 py-3 bg-zinc-800 rounded-lg text-sm">
                      <div className="font-medium mb-1">Run Scrapers:</div>
                      <code className="text-xs text-zinc-400">
                        python data_sources/scrape_openfiscal.py
                      </code>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Manual Ingest Tab */}
        {activeTab === "ingest" && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold mb-6">Manual Data Ingestion</h1>

            {/* Data Type Selection */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
              <div className="text-sm font-medium text-zinc-300 mb-3">Data Type</div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setDataType("facilities");
                    if (csvData) setMapping(autoMapColumns(csvData.headers, "facilities"));
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dataType === "facilities"
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  Facilities
                </button>
                <button
                  onClick={() => {
                    setDataType("financials");
                    if (csvData) setMapping(autoMapColumns(csvData.headers, "financials"));
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dataType === "financials"
                      ? "bg-green-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  Financial Data
                </button>
              </div>
            </div>

            {/* File Upload */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
              <div className="text-sm font-medium text-zinc-300 mb-3">Upload CSV File</div>

              <div className="flex items-center gap-4">
                <label className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center cursor-pointer hover:border-zinc-500 transition-colors">
                    {fileName ? (
                      <div>
                        <div className="text-lg font-medium text-white">{fileName}</div>
                        <div className="text-sm text-zinc-400 mt-1">
                          {csvData ? `${csvData.rowCount.toLocaleString()} rows, ${csvData.headers.length} columns` : "Parsing..."}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-zinc-400 mb-2">Click to select a CSV file</div>
                        <div className="text-xs text-zinc-500">or drag and drop</div>
                      </div>
                    )}
                  </div>
                </label>

                {csvData && (
                  <button
                    onClick={clearData}
                    className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm"
                  >
                    Clear
                  </button>
                )}
              </div>

              {error && <div className="mt-4 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">{error}</div>}
            </div>

            {/* Column Mapping */}
            {csvData && (
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-medium text-zinc-300">Column Mapping</div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {Object.keys(mapping).length} of {csvData.headers.length} columns mapped
                    </div>
                  </div>
                  {validationErrors.length > 0 && (
                    <div className="text-amber-400 text-xs">
                      {validationErrors.length} validation issue{validationErrors.length > 1 ? "s" : ""}
                    </div>
                  )}
                </div>

                {validationErrors.length > 0 && (
                  <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <div className="text-sm text-amber-400 font-medium mb-1">Validation Issues:</div>
                    <ul className="text-xs text-amber-300 space-y-1">
                      {validationErrors.map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {csvData.headers.map((header) => (
                    <div key={header} className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-zinc-400 truncate" title={header}>
                          {header}
                        </div>
                        <div className="text-[10px] text-zinc-600 truncate">
                          {csvData.rows[0]?.[csvData.headers.indexOf(header)] || "-"}
                        </div>
                      </div>
                      <select
                        value={mapping[header] || ""}
                        onChange={(e) => handleMappingChange(header, e.target.value)}
                        className={`w-32 text-xs bg-zinc-700 border rounded px-2 py-1 ${
                          mapping[header]
                            ? "border-green-500/50 text-green-400"
                            : "border-zinc-600 text-zinc-400"
                        }`}
                      >
                        <option value="">-- Skip --</option>
                        {fields.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label} {f.required ? "*" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            {csvData && convertedRecords.length > 0 && (
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium text-zinc-300">
                    Preview ({Math.min(previewCount, convertedRecords.length)} of {convertedRecords.length.toLocaleString()})
                  </div>
                  <select
                    value={previewCount}
                    onChange={(e) => setPreviewCount(Number(e.target.value))}
                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300"
                  >
                    <option value={5}>5 rows</option>
                    <option value={10}>10 rows</option>
                    <option value={25}>25 rows</option>
                    <option value={50}>50 rows</option>
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-800/50">
                      <tr>
                        <th className="text-left px-3 py-2 text-zinc-400 font-medium">#</th>
                        {Object.values(mapping).map((fieldKey) => (
                          <th key={fieldKey} className="text-left px-3 py-2 text-zinc-400 font-medium">
                            {fields.find((f) => f.key === fieldKey)?.label || fieldKey}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {convertedRecords.slice(0, previewCount).map((record, i) => (
                        <tr key={i} className="hover:bg-zinc-800/30">
                          <td className="px-3 py-2 text-zinc-500">{i + 1}</td>
                          {Object.values(mapping).map((fieldKey) => (
                            <td key={fieldKey} className="px-3 py-2 text-zinc-300 truncate max-w-48">
                              {String(record[fieldKey] ?? "-")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Export Actions */}
            {csvData && convertedRecords.length > 0 && (
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <div className="text-sm font-medium text-zinc-300 mb-4">Export Options</div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleSaveToDatabase}
                    disabled={validationErrors.length > 0}
                    className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                      validationErrors.length > 0
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-500 text-white"
                    }`}
                  >
                    💾 Save to Database
                  </button>

                  <button
                    onClick={handleExportJSON}
                    disabled={validationErrors.length > 0}
                    className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                      validationErrors.length > 0
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-500 text-white"
                    }`}
                  >
                    Download JSON
                  </button>

                  <button
                    onClick={handleSaveToStorage}
                    disabled={validationErrors.length > 0}
                    className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                      validationErrors.length > 0
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : "bg-zinc-700 hover:bg-zinc-600 text-white"
                    }`}
                  >
                    Save to Browser Storage
                  </button>

                  <div className="flex-1" />

                  <div className="text-sm text-zinc-400 self-center">
                    {convertedRecords.length.toLocaleString()} records ready
                  </div>
                </div>

                {exportStatus && (
                  <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                    {exportStatus}
                  </div>
                )}
              </div>
            )}

            {/* Field Reference */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
              <div className="text-sm font-medium text-zinc-300 mb-4">
                {dataType === "facilities" ? "Facility" : "Financial"} Fields Reference
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                {fields.map((f) => (
                  <div key={f.key} className="flex items-start gap-2 p-2 bg-zinc-800/30 rounded">
                    <div className="flex-1">
                      <div className="text-sm text-white">
                        {f.label}
                        {f.required && <span className="text-red-400 ml-1">*</span>}
                      </div>
                      <div className="text-xs text-zinc-500">{f.desc}</div>
                    </div>
                    <code className="text-[10px] text-zinc-600 bg-zinc-800 px-1 rounded">{f.key}</code>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="border-t border-zinc-800 pt-6">
              <div className="flex flex-wrap gap-4">
                <Link href="/map" className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium">
                  Map View
                </Link>
                <Link href="/explorer" className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium">
                  Data Explorer
                </Link>
                <Link href="/network" className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium">
                  Network Graph
                </Link>
                <Link href="/about" className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium">
                  About & Schema
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function IngestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AuthGuard>
        <IngestPageContent />
      </AuthGuard>
    </Suspense>
  );
}
