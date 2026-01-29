# California .gov Data Source Tracking System

## Overview

This system automatically discovers, tracks, and ingests data from California government (.gov) websites to continuously expand the Hippocratic fraud detection platform.

---

## 📁 Files

- **`CA_GOV_DATA_INVENTORY.md`** - Comprehensive inventory of all known CA .gov data sources
- **`schema.sql`** - Database schema for tracking data sources
- **`seed_data.sql`** - Initial set of 20+ known data sources
- **`ingestion_pipeline.py`** - Automated discovery and ingestion system

---

## 🗄️ Database Schema

### `data_sources` Table
Tracks all discovered .gov data sources:
- URL, domain, title, description
- Data type (facilities, financial, licensing, etc.)
- Format (CSV, JSON, Excel, PDF, API)
- Update frequency (daily, weekly, monthly, etc.)
- Last checked/modified/ingested timestamps
- Priority (1-10)
- Status (discovered, active, inactive, error)

### `ingestion_logs` Table
Tracks every ingestion attempt:
- Source ID, start/end times
- Records processed/inserted/updated/skipped
- Error messages
- Execution time

### `data_source_changes` Table
Tracks detected changes:
- Change type (new/updated/deleted records, schema changes)
- Change count and details

---

## 🚀 Quick Start

### 1. Initialize Database

```bash
cd hippocratic
sqlite3 local.db < data_sources/schema.sql
sqlite3 local.db < data_sources/seed_data.sql
```

### 2. Install Dependencies

```bash
pip install requests
```

### 3. Run Discovery

```bash
python data_sources/ingestion_pipeline.py
```

This will:
- Discover new datasets from CHHS Open Data Portal
- Discover datasets from data.ca.gov
- Add them to the database
- List top priority sources

---

## 📊 Data Sources Tracked

### Current Sources (20+)

**CHHS Open Data Portal** (data.chhs.ca.gov)
- Healthcare Facility Locations
- Licensed Healthcare Facilities
- Hospital Financial Data

**HCAI** (hcai.ca.gov)
- Hospital Financial Reports
- Healthcare Facility Data
- Healthcare Workforce Data

**CDPH** (cdph.ca.gov)
- Facility Master List
- Healthcare Facility Consumer Info
- Healthcare-Associated Infections

**CDSS** (cdss.ca.gov)
- Community Care Licensing
- CCL Facility Search

**CMS** (data.cms.gov)
- Hospital General Information
- Nursing Home Compare
- Home Health Compare
- Medicare Cost Reports

**Data.ca.gov**
- Portal Package List
- Healthcare Facilities

**Medical Board** (mbc.ca.gov)
- Physician License Verification
- Medical Board Statistics

---

## 🔄 Automated Discovery

The pipeline automatically discovers new datasets by:

1. **Querying Open Data APIs**
   - CHHS SODA API
   - Data.ca.gov CKAN API

2. **Keyword Filtering**
   - Searches for: health, hospital, facility, medical, care, patient, clinic, nursing, hospice, license

3. **Metadata Extraction**
   - Title, description, format
   - Update frequency, file size
   - Last modified date

4. **Priority Assignment**
   - Based on data type and relevance
   - 10 = Critical (facility locations, financial data)
   - 5 = Medium (statistics, reports)
   - 1 = Low (archived data)

---

## 📈 Usage Examples

### List All Data Sources

```python
from data_sources.ingestion_pipeline import DataSourceManager

manager = DataSourceManager()
sources = manager.list_data_sources()

for source in sources:
    print(f"{source['title']} - {source['url']}")
```

### Check for Updates

```python
manager = DataSourceManager()
manager.check_all_sources()
```

### Discover New Datasets

```python
manager = DataSourceManager()
manager.run_discovery()
```

### Query Database Directly

```bash
sqlite3 local.db "SELECT title, url, format, priority FROM data_sources WHERE priority >= 8 ORDER BY priority DESC"
```

---

## 🎯 Next Steps

### Phase 1: Foundation (✅ Complete)
- [x] Database schema
- [x] Seed data with known sources
- [x] Basic discovery pipeline
- [x] Documentation

### Phase 2: Automation (In Progress)
- [ ] Scheduled discovery (daily/weekly)
- [ ] Automated download and parsing
- [ ] Change detection
- [ ] Email alerts for new data

### Phase 3: Advanced Features
- [ ] API integration for real-time data
- [ ] PDF parsing and OCR
- [ ] Excel file conversion
- [ ] Data validation and quality checks
- [ ] Deduplication across sources
- [ ] Historical tracking and versioning

---

## 🛠️ Integration with Hippocratic

### Current Integration
- Database schema added to `local.db`
- Tracked sources feed into existing ingestion system
- Priority sources processed first

### Future Integration
- API endpoint: `/api/data-sources` to view tracked sources
- Admin dashboard for managing sources
- Automated nightly ingestion jobs
- Real-time status monitoring

---

## 📝 Adding New Data Sources

### Manual Addition

```sql
INSERT INTO data_sources (url, domain, title, description, data_type, format, update_frequency, priority)
VALUES (
    'https://example.ca.gov/data.csv',
    'example.ca.gov',
    'Example Dataset',
    'Description of the dataset',
    'facilities',
    'CSV',
    'monthly',
    8
);
```

### Programmatic Addition

```python
manager = DataSourceManager()
manager.add_data_source({
    'url': 'https://example.ca.gov/data.csv',
    'domain': 'example.ca.gov',
    'title': 'Example Dataset',
    'description': 'Description',
    'metadata': json.dumps({'key': 'value'})
})
```

---

## 🔍 Monitoring

### Check Ingestion Status

```sql
SELECT 
    ds.title,
    il.status,
    il.records_processed,
    il.completed_at
FROM ingestion_logs il
JOIN data_sources ds ON il.data_source_id = ds.id
ORDER BY il.started_at DESC
LIMIT 10;
```

### View Recent Changes

```sql
SELECT 
    ds.title,
    dsc.change_type,
    dsc.change_count,
    dsc.detected_at
FROM data_source_changes dsc
JOIN data_sources ds ON dsc.data_source_id = ds.id
ORDER BY dsc.detected_at DESC
LIMIT 10;
```

---

## 🚨 Troubleshooting

**Error: Module 'requests' not found**
```bash
pip install requests
```

**Error: Database locked**
- Close any open connections to `local.db`
- Check for running processes

**No datasets discovered**
- Check internet connection
- Verify API endpoints are accessible
- Check rate limiting (add delays between requests)

---

## 📚 Resources

- [CHHS Open Data Portal](https://data.chhs.ca.gov/)
- [California Open Data Portal](https://data.ca.gov/)
- [HCAI Data & Reports](https://hcai.ca.gov/data-and-reports/)
- [CDPH Licensing](https://www.cdph.ca.gov/Programs/CHCQ/LCP/)
- [Socrata SODA API Docs](https://dev.socrata.com/)
- [CKAN API Docs](https://docs.ckan.org/en/latest/api/)

---

## 🤝 Contributing

To add new data sources:
1. Add entry to `seed_data.sql`
2. Test with `ingestion_pipeline.py`
3. Document in `CA_GOV_DATA_INVENTORY.md`
4. Submit PR with description

---

**Built for continuous expansion of the Hippocratic fraud detection platform** 🦛
