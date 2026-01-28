// ==============================================================================
// file_id: SOM-SCR-0021-v1.0.0
// name: migrate.ts
// description: Migration script to load facility data into SQLite
// project_id: HIPPOCRATIC
// category: script
// tags: [migration, database, sqlite]
// created: 2026-01-28
// version: 1.0.0
// usage: npx tsx scripts/migrate.ts
// ==============================================================================

import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

// Create local database
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

interface Facility {
  id: string;
  name: string;
  licenseNumber?: string;
  categoryCode?: string;
  categoryName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  phone?: string;
  lat?: number;
  lng?: number;
  inService?: boolean;
  businessName?: string;
  contactEmail?: string;
}

interface FinancialRecord {
  OSHPD_ID?: string;
  FAC_NAME?: string;
  LICENSE_NUM?: string;
  TOT_OP_REV?: string;
  TOT_OP_EXP?: string;
  NET_FR_OP?: string;
  TOT_PAT_REV?: string;
  VISITS?: string;
}

// Schema
const schema = `
DROP TABLE IF EXISTS facility_duplicates;
DROP TABLE IF EXISTS duplicate_groups;
DROP TABLE IF EXISTS observations;
DROP TABLE IF EXISTS financials;
DROP TABLE IF EXISTS facilities;

CREATE TABLE facilities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  license_number TEXT,
  category_code TEXT,
  category_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  county TEXT,
  phone TEXT,
  lat REAL,
  lng REAL,
  in_service INTEGER DEFAULT 1,
  business_name TEXT,
  contact_email TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_facilities_category ON facilities(category_name);
CREATE INDEX idx_facilities_county ON facilities(county);
CREATE INDEX idx_facilities_city ON facilities(city);
CREATE INDEX idx_facilities_phone ON facilities(phone);
CREATE INDEX idx_facilities_address ON facilities(address);
CREATE INDEX idx_facilities_business ON facilities(business_name);
CREATE INDEX idx_facilities_in_service ON facilities(in_service);

CREATE TABLE financials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  facility_id TEXT,
  oshpd_id TEXT,
  facility_name TEXT,
  license_number TEXT,
  year INTEGER,
  total_revenue REAL,
  total_expenses REAL,
  net_income REAL,
  total_visits INTEGER,
  total_patients INTEGER,
  revenue_per_visit REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (facility_id) REFERENCES facilities(id)
);

CREATE INDEX idx_financials_facility ON financials(facility_id);
CREATE INDEX idx_financials_license ON financials(license_number);

CREATE TABLE observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  facility_id TEXT NOT NULL,
  rating INTEGER CHECK(rating >= 1 AND rating <= 5),
  notes TEXT,
  observed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (facility_id) REFERENCES facilities(id)
);

CREATE INDEX idx_observations_facility ON observations(facility_id);

CREATE TABLE duplicate_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_type TEXT NOT NULL,
  group_key TEXT NOT NULL,
  facility_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dups_type ON duplicate_groups(group_type);
CREATE INDEX idx_dups_key ON duplicate_groups(group_key);

CREATE TABLE facility_duplicates (
  facility_id TEXT NOT NULL,
  group_id INTEGER NOT NULL,
  PRIMARY KEY (facility_id, group_id),
  FOREIGN KEY (facility_id) REFERENCES facilities(id),
  FOREIGN KEY (group_id) REFERENCES duplicate_groups(id)
);

CREATE INDEX idx_fac_dups_facility ON facility_duplicates(facility_id);
CREATE INDEX idx_fac_dups_group ON facility_duplicates(group_id);
`;

// Parse CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Normalize strings for duplicate detection
function normalize(str: string | undefined | null): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

async function migrate() {
  console.log("Starting migration...");

  // Initialize schema
  console.log("Creating database schema...");
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await db.execute(statement);
  }
  console.log("Schema created.");

  // Load facilities JSON
  const dataDir = path.join(__dirname, "../public/data/state/CA");
  const jsonPath = path.join(dataDir, "all.min.json");

  console.log(`Loading facilities from ${jsonPath}...`);
  const jsonData = fs.readFileSync(jsonPath, "utf-8");
  const jsonParsed = JSON.parse(jsonData);

  // Handle both array and object with records property
  const facilities: Facility[] = Array.isArray(jsonParsed)
    ? jsonParsed
    : jsonParsed.records || [];

  console.log(`Loaded ${facilities.length} facilities.`);

  // Insert facilities in batches
  const batchSize = 500;
  let inserted = 0;

  for (let i = 0; i < facilities.length; i += batchSize) {
    const batch = facilities.slice(i, i + batchSize);

    for (const f of batch) {
      try {
        await db.execute({
          sql: `
            INSERT INTO facilities (
              id, name, license_number, category_code, category_name,
              address, city, state, zip, county, phone,
              lat, lng, in_service, business_name, contact_email
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            f.id,
            f.name || "",
            f.licenseNumber || null,
            f.categoryCode || null,
            f.categoryName || null,
            f.address || null,
            f.city || null,
            f.state || "CA",
            f.zip || null,
            f.county || null,
            f.phone || null,
            f.lat || null,
            f.lng || null,
            f.inService ? 1 : 0,
            f.businessName || null,
            f.contactEmail || null,
          ],
        });
        inserted++;
      } catch (err) {
        console.error(`Error inserting facility ${f.id}:`, err);
      }
    }

    console.log(`Inserted ${inserted}/${facilities.length} facilities...`);
  }

  console.log(`Total facilities inserted: ${inserted}`);

  // Load financial data
  const financialPath = path.join(
    __dirname,
    "../public/data/enrichment/state/CA/hcai_hhah_util_2024.csv"
  );

  if (fs.existsSync(financialPath)) {
    console.log(`Loading financial data from ${financialPath}...`);
    const csvData = fs.readFileSync(financialPath, "utf-8");
    const lines = csvData.split("\n").filter((l) => l.trim());

    if (lines.length > 1) {
      const headers = parseCSVLine(lines[0]);
      let financialInserted = 0;

      // Create license number lookup
      const licenseToId = new Map<string, string>();
      for (const f of facilities) {
        if (f.licenseNumber) {
          licenseToId.set(normalize(f.licenseNumber), f.id);
        }
      }

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const record: Record<string, string> = {};
        headers.forEach((h, idx) => {
          record[h] = values[idx] || "";
        });

        const licenseNum = record["LICENSE_NUM"] || record["LIC_NUM"] || "";
        const facilityId = licenseToId.get(normalize(licenseNum)) || null;

        try {
          await db.execute({
            sql: `
              INSERT INTO financials (
                facility_id, oshpd_id, facility_name, license_number, year,
                total_revenue, total_expenses, net_income, total_visits
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
              facilityId,
              record["OSHPD_ID"] || null,
              record["FAC_NAME"] || null,
              licenseNum || null,
              2024,
              parseFloat(record["TOT_OP_REV"] || "0") || 0,
              parseFloat(record["TOT_OP_EXP"] || "0") || 0,
              parseFloat(record["NET_FR_OP"] || "0") || 0,
              parseInt(record["VISITS"] || "0") || 0,
            ],
          });
          financialInserted++;
        } catch (err) {
          // Skip errors silently
        }
      }

      console.log(`Inserted ${financialInserted} financial records.`);
    }
  } else {
    console.log("No financial data file found, skipping...");
  }

  // Compute duplicates
  console.log("Computing duplicate groups...");

  // Address duplicates
  const addressGroups = new Map<string, string[]>();
  for (const f of facilities) {
    const key = normalize(f.address);
    if (key.length > 5) {
      if (!addressGroups.has(key)) addressGroups.set(key, []);
      addressGroups.get(key)!.push(f.id);
    }
  }

  // Phone duplicates
  const phoneGroups = new Map<string, string[]>();
  for (const f of facilities) {
    const key = normalize(f.phone);
    if (key.length >= 10) {
      if (!phoneGroups.has(key)) phoneGroups.set(key, []);
      phoneGroups.get(key)!.push(f.id);
    }
  }

  // Owner duplicates
  const ownerGroups = new Map<string, string[]>();
  for (const f of facilities) {
    const key = normalize(f.businessName);
    if (key.length > 3) {
      if (!ownerGroups.has(key)) ownerGroups.set(key, []);
      ownerGroups.get(key)!.push(f.id);
    }
  }

  // Admin duplicates
  const adminGroups = new Map<string, string[]>();
  for (const f of facilities) {
    const key = normalize(f.contactEmail);
    if (key.length > 5) {
      if (!adminGroups.has(key)) adminGroups.set(key, []);
      adminGroups.get(key)!.push(f.id);
    }
  }

  // Insert duplicate groups
  async function insertDuplicateGroups(
    groups: Map<string, string[]>,
    type: string
  ) {
    let count = 0;
    for (const [key, ids] of groups) {
      if (ids.length < 2) continue;

      const result = await db.execute({
        sql: `INSERT INTO duplicate_groups (group_type, group_key, facility_count) VALUES (?, ?, ?)`,
        args: [type, key, ids.length],
      });

      const groupId = result.lastInsertRowid;

      for (const fid of ids) {
        try {
          await db.execute({
            sql: `INSERT INTO facility_duplicates (facility_id, group_id) VALUES (?, ?)`,
            args: [fid, groupId],
          });
        } catch {
          // Skip duplicates
        }
      }
      count++;
    }
    console.log(`Inserted ${count} ${type} duplicate groups.`);
  }

  await insertDuplicateGroups(addressGroups, "address");
  await insertDuplicateGroups(phoneGroups, "phone");
  await insertDuplicateGroups(ownerGroups, "owner");
  await insertDuplicateGroups(adminGroups, "admin");

  // Summary
  const facilityCount = await db.execute("SELECT COUNT(*) as c FROM facilities");
  const financialCount = await db.execute("SELECT COUNT(*) as c FROM financials");
  const dupGroupCount = await db.execute("SELECT COUNT(*) as c FROM duplicate_groups");

  console.log("\n=== Migration Complete ===");
  console.log(`Facilities: ${(facilityCount.rows[0] as any).c}`);
  console.log(`Financial records: ${(financialCount.rows[0] as any).c}`);
  console.log(`Duplicate groups: ${(dupGroupCount.rows[0] as any).c}`);
  console.log("Database saved to: local.db");
}

migrate().catch(console.error);
