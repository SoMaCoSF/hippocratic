# Database Population Guide

## Overview

The Hippocratic application uses a SQLite database (`local.db`) to store facilities and financial data. This document explains how to populate and manage the database.

## Database Schema

### Tables

1. **facilities** - California healthcare facilities
   - `id` (TEXT, PRIMARY KEY)
   - `name`, `license_number`, `category_name`, etc.
   - `lat`, `lng` for mapping
   - `in_service` status

2. **financials** - Financial data from HCAI reports
   - `id` (INTEGER, PRIMARY KEY, AUTO INCREMENT)
   - `facility_id` (foreign key to facilities)
   - `license_number` for joining
   - `year`, `total_revenue`, `total_expenses`, `net_income`
   - `total_visits` for utilization metrics

## Populating the Database

### Prerequisites

- Python 3.x installed
- Data files in place:
  - `web/public/data/state/CA/all.min.json` (facilities)
  - `web/public/data/enrichment/state/CA/hcai_hhah_util_2024.csv` (financials)

### Running the Population Script

```bash
cd hippocratic
python populate_db.py
```

This script will:
1. Create the database schema (if it doesn't exist)
2. Load all facilities from the JSON file
3. Load financial records from the CSV file
4. Create indexes for optimal query performance

### Expected Results

- **Facilities:** ~15,700+ records
- **Financials:** ~4,200+ records (only facilities with financial data)

### Output Example

```
Populating database...

[OK] Database schema created
[OK] Loaded 15743 facilities
[OK] Loaded 4242 financial records

[SUCCESS] Database populated successfully!
   Facilities: 15743
   Financials: 4242
```

## Data Sources

### Facilities Data

Source: California CDPH licensing database  
File: `all.min.json`  
Contains: All licensed healthcare facilities in California

### Financial Data

Source: HCAI HHAH Utilization Report 2024  
File: `hcai_hhah_util_2024.csv`  
Contains:
- Hospice total operating revenue
- Hospice net income
- Home Health visits (Medi-Cal and Medicare)

### CSV Column Mapping

| CSV Column | Database Column |
|---|---|
| LICENSE_NO | license_number |
| FAC_NAME | facility_name |
| FAC_NO | oshpd_id |
| HOSPICE_TOT_OPER_REVENUE | total_revenue |
| HOSPICE_NET_INCOME | net_income |
| HHAH_MEDI_CAL_VISITS | (part of total_visits) |
| HHAH_MEDICARE_VISITS | (part of total_visits) |

## API Endpoints

The database is accessed through Next.js API routes:

### GET /api/facilities

Query facilities from the database.

**Parameters:**
- `category` - filter by category name
- `county` - filter by county
- `inService` - filter by service status (true/false)
- `limit` - max records to return (default: 1000)
- `offset` - pagination offset (default: 0)

**Response:**
```json
{
  "facilities": [...],
  "count": 1000
}
```

### GET /api/financials

Query financial data from the database.

**Parameters:**
- `facilityId` - filter by facility ID
- `limit` - max records to return (default: 1000)

**Response:**
```json
{
  "financials": [...],
  "count": 4242
}
```

## Usage in the App

### Financials Page

The `/financials` page fetches data from the database:

```typescript
// Fetch from database API routes
const [facilityRes, financialRes] = await Promise.all([
  fetch("/api/facilities?limit=10000"),
  fetch("/api/financials?limit=10000"),
]);
```

It then processes and visualizes:
- Total revenue, expenses, net income
- Revenue by category charts
- Top/bottom performing facilities
- Detailed financial tables

## Maintenance

### Updating Data

To refresh the database with new data:

1. Update the source files (JSON and CSV)
2. Delete the old database: `rm local.db`
3. Run the population script: `python populate_db.py`

### Backup

To backup the database:

```bash
cp local.db local.db.backup
```

### Verifying Data

To check database contents:

```bash
sqlite3 local.db "SELECT COUNT(*) FROM facilities;"
sqlite3 local.db "SELECT COUNT(*) FROM financials;"
```

## Deployment

### Local Development

The database is stored at `hippocratic/local.db` and is automatically used by the Next.js dev server.

### Vercel Production

For production deployment on Vercel:
1. The database file is included in the deployment
2. Vercel uses SQLite in read-only mode
3. For write operations (admin/ingest), consider using Turso (remote SQLite)

### Turso Integration (Optional)

To use Turso for remote database:

1. Set up Turso database
2. Set environment variable: `TURSO_DATABASE_URL`
3. Run population script with Turso connection
4. API routes automatically use Turso if URL is set

## Troubleshooting

### No Financial Records

If you get 0 financial records, check:
- CSV file column names match the script expectations
- CSV file has actual data rows
- License numbers in CSV match facilities

### Missing Facilities

If facilities count is low:
- Verify JSON file path is correct
- Check JSON structure matches expected format
- Look for parsing errors in the script output

### Database Locked

If you get "database is locked" errors:
- Close all connections to the database
- Restart the Next.js dev server
- Check for multiple processes accessing the database

---

**Last Updated:** 2026-01-29  
**Database Version:** 1.0  
**Total Records:** 15,743 facilities + 4,242 financial records
