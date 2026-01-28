// ==============================================================================
// file_id: SOM-SCR-0028-v2.0.0
// name: page.tsx
// description: Data ingest page - upload CSV files and convert to facility/financial data (AUTH REQUIRED)
// project_id: HIPPOCRATIC
// category: script
// tags: [web, nextjs, ingest, csv, data-import, auth]
// created: 2026-01-28
// modified: 2026-01-28
// version: 2.0.0
// ==============================================================================

"use client";

import Link from "next/link";
import { useState, useCallback, useMemo, useRef, Suspense } from "react";
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
  const [dataType, setDataType] = useState<DataType>("facilities");
  const [csvData, setCsvData] = useState<ParsedCSV | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState(10);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fields = dataType === "facilities" ? FACILITY_FIELDS : FINANCIAL_FIELDS;

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
            className="flex-shrink-0 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium"
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
            <h1 className="text-sm sm:text-base font-bold text-white">Data Ingest</h1>
            <p className="text-[10px] sm:text-xs text-zinc-400">Upload CSV files to import facility or financial data</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
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
            <Link href="/" className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium">
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
      </main>
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
