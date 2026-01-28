# Hippocratic Database Documentation

## Overview

The Hippocratic application uses **Turso SQLite** (via `@libsql/client`) for persistent data storage. The database is configured to work both locally (`local.db`) and in production via Turso's hosted SQLite service.

## Database Location

- **Local Development**: `hippocratic/web/local.db`
- **Production (Vercel)**: Turso hosted database (configured via environment variables)

## Environment Variables

```bash
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

## Schema

### 1. `facilities` Table
Primary table storing all California healthcare facility data.

```sql
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

-- Indexes for performance
CREATE INDEX idx_facilities_category ON facilities(category_name);
CREATE INDEX idx_facilities_county ON facilities(county);
CREATE INDEX idx_facilities_city ON facilities(city);
CREATE INDEX idx_facilities_phone ON facilities(phone);
CREATE INDEX idx_facilities_address ON facilities(address);
CREATE INDEX idx_facilities_business ON facilities(business_name);
CREATE INDEX idx_facilities_in_service ON facilities(in_service);
```

**Fields:**
- `id`: Unique identifier (UUID or generated)
- `name`: Facility name
- `license_number`: State license number
- `category_code`: Facility type code
- `category_name`: Human-readable facility type
- `address`, `city`, `state`, `zip`, `county`: Location data
- `phone`: Contact phone number
- `lat`, `lng`: Geocoded coordinates
- `in_service`: Boolean (1=active, 0=inactive)
- `business_name`: Owner/operator business name
- `contact_email`: Administrative contact email

### 2. `financials` Table
Financial data for facilities (revenue, expenses, visits).

```sql
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
```

**Fields:**
- `facility_id`: Foreign key to facilities table
- `oshpd_id`: Office of Statewide Health Planning and Development ID
- `year`: Fiscal year
- `total_revenue`: Total operating revenue
- `total_expenses`: Total operating expenses
- `net_income`: Net income from operations
- `total_visits`: Patient visit count
- `revenue_per_visit`: Calculated metric

### 3. `observations` Table
User-submitted observations and ratings for facilities.

```sql
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
```

**Fields:**
- `facility_id`: Foreign key to facilities table
- `rating`: 1-5 star rating
- `notes`: Free-text observations
- `observed_at`: When the observation was made
- `created_at`: When the record was created

### 4. `duplicate_groups` Table
Tracks groups of facilities with suspicious shared attributes.

```sql
CREATE TABLE duplicate_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_type TEXT NOT NULL,
  group_key TEXT NOT NULL,
  facility_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dups_type ON duplicate_groups(group_type);
CREATE INDEX idx_dups_key ON duplicate_groups(group_key);
```

**Fields:**
- `group_type`: Type of duplication (`address`, `phone`, `owner`, `admin`)
- `group_key`: Normalized value that's shared (e.g., normalized phone number)
- `facility_count`: Number of facilities in this group

### 5. `facility_duplicates` Table
Junction table linking facilities to duplicate groups.

```sql
CREATE TABLE facility_duplicates (
  facility_id TEXT NOT NULL,
  group_id INTEGER NOT NULL,
  PRIMARY KEY (facility_id, group_id),
  FOREIGN KEY (facility_id) REFERENCES facilities(id),
  FOREIGN KEY (group_id) REFERENCES duplicate_groups(id)
);

CREATE INDEX idx_fac_dups_facility ON facility_duplicates(facility_id);
CREATE INDEX idx_fac_dups_group ON facility_duplicates(group_id);
```

**Purpose:** Many-to-many relationship between facilities and duplicate groups. A facility can be in multiple groups (e.g., shares address with one group, shares phone with another).

## Data Migration

### Running the Migration Script

```bash
cd hippocratic/web
npx tsx scripts/migrate.ts
```

This script:
1. Creates the schema
2. Loads facilities from `public/data/state/CA/all.min.json`
3. Loads financial data from `public/data/enrichment/state/CA/hcai_hhah_util_2024.csv`
4. Computes duplicate groups based on:
   - Shared addresses (normalized)
   - Shared phone numbers (normalized)
   - Shared business names (normalized)
   - Shared admin emails (normalized)
5. Populates all tables

### Data Sources

- **Facilities**: California Department of Social Services, CDPH, OSHPD
- **Financial Data**: HCAI Home Health Agency & Hospice Utilization 2024
- **Duplicates**: Computed via normalization and grouping

## Current Status

⚠️ **The web application is NOT yet connected to the database.**

Currently using:
- Static JSON files (`/public/data/state/CA/all.min.json`)
- Static CSV files (`/public/data/enrichment/state/CA/hcai_hhah_util_2024.csv`)

To connect the web app to Turso:
1. Set environment variables in Vercel
2. Create API routes (`/api/facilities`, `/api/financials`, etc.)
3. Replace static file fetches with database queries
4. Enable user observations to persist

## Query Examples

### Get all facilities in a county
```sql
SELECT * FROM facilities 
WHERE county = 'Los Angeles' 
AND in_service = 1;
```

### Get facilities with financial data
```sql
SELECT f.*, fin.total_revenue, fin.net_income
FROM facilities f
LEFT JOIN financials fin ON f.id = fin.facility_id
WHERE fin.year = 2024;
```

### Find duplicate groups with most facilities
```sql
SELECT group_type, group_key, facility_count
FROM duplicate_groups
WHERE facility_count >= 5
ORDER BY facility_count DESC;
```

### Get all facilities in a duplicate group
```sql
SELECT f.*
FROM facilities f
JOIN facility_duplicates fd ON f.id = fd.facility_id
WHERE fd.group_id = 123;
```

### Find facilities with negative income
```sql
SELECT f.name, f.address, fin.net_income
FROM facilities f
JOIN financials fin ON f.id = fin.facility_id
WHERE fin.net_income < 0
ORDER BY fin.net_income ASC;
```

## Future Enhancements

1. **Real-time sync**: Replace static JSON with database queries
2. **User authentication**: Store user observations with auth
3. **API endpoints**: RESTful API for facility data
4. **Advanced queries**: Full-text search, geospatial queries
5. **Audit trail**: Track changes to facility data
6. **Webhooks**: Notify on new suspicious patterns
