# Data Source Tracking System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    California .gov Data Sources                     │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────┐ │
│  │  CHHS    │  │   HCAI   │  │   CDPH   │  │   CDSS   │  │ CMS  │ │
│  │ Portal   │  │          │  │          │  │          │  │      │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬──┘ │
│       │             │             │             │            │    │
└───────┼─────────────┼─────────────┼─────────────┼────────────┼────┘
        │             │             │             │            │
        └─────────────┴─────────────┴─────────────┴────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────────────┐
        │         Discovery & Ingestion Pipeline              │
        │                                                      │
        │  ┌──────────────┐       ┌──────────────┐           │
        │  │  SODA API    │       │   CKAN API   │           │
        │  │  (Socrata)   │       │  (data.ca)   │           │
        │  └──────┬───────┘       └──────┬───────┘           │
        │         │                      │                    │
        │         └──────────┬───────────┘                    │
        │                    │                                │
        │         ┌──────────▼──────────┐                    │
        │         │  Discovery Engine   │                    │
        │         │  - Keyword Filter   │                    │
        │         │  - Metadata Extract │                    │
        │         │  - Priority Assign  │                    │
        │         └──────────┬──────────┘                    │
        │                    │                                │
        └────────────────────┼────────────────────────────────┘
                             │
                             ▼
        ┌─────────────────────────────────────────────────────┐
        │              SQLite Database (local.db)             │
        │                                                      │
        │  ┌──────────────────┐  ┌──────────────────┐        │
        │  │  data_sources    │  │  ingestion_logs  │        │
        │  │  - URL           │  │  - Source ID     │        │
        │  │  - Domain        │  │  - Status        │        │
        │  │  - Title         │  │  - Records       │        │
        │  │  - Format        │  │  - Errors        │        │
        │  │  - Priority      │  │  - Timing        │        │
        │  │  - Status        │  └──────────────────┘        │
        │  └──────────────────┘                               │
        │                                                      │
        │  ┌──────────────────┐  ┌──────────────────┐        │
        │  │  facilities      │  │  financials      │        │
        │  │  (existing)      │  │  (existing)      │        │
        │  └──────────────────┘  └──────────────────┘        │
        │                                                      │
        │  ┌──────────────────────────────────────┐          │
        │  │  data_source_changes                 │          │
        │  │  - Change Type                       │          │
        │  │  - Change Count                      │          │
        │  │  - Details                           │          │
        │  └──────────────────────────────────────┘          │
        └─────────────────────────────────────────────────────┘
                             │
                             ▼
        ┌─────────────────────────────────────────────────────┐
        │              Hippocratic Web App                    │
        │                                                      │
        │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
        │  │   Map    │  │ Explorer │  │Financial │          │
        │  │  View    │  │  Table   │  │  Charts  │          │
        │  └──────────┘  └──────────┘  └──────────┘          │
        │                                                      │
        │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
        │  │ Network  │  │ Stacked  │  │  Ingest  │          │
        │  │  Graph   │  │   View   │  │  Admin   │          │
        │  └──────────┘  └──────────┘  └──────────┘          │
        └─────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Discovery Phase
```
California .gov Websites
        │
        ├─► CHHS Portal (SODA API)
        │   └─► Query: healthcare datasets
        │       └─► Filter: keywords
        │           └─► Extract: metadata
        │
        ├─► data.ca.gov (CKAN API)
        │   └─► Search: "healthcare facility license"
        │       └─► Filter: relevance
        │           └─► Extract: resources
        │
        └─► Direct URLs
            └─► Check: accessibility
                └─► Parse: format
                    └─► Store: metadata
```

### 2. Tracking Phase
```
Discovered Dataset
        │
        ├─► Check URL accessibility
        │   └─► GET request (HEAD)
        │       └─► Extract headers
        │           ├─► Last-Modified
        │           ├─► Content-Length
        │           └─► Content-Type
        │
        ├─► Assign Priority
        │   ├─► 10: Facility locations, Financial data
        │   ├─► 8-9: Licensing, Inspections
        │   ├─► 5-7: Quality metrics, Statistics
        │   └─► 1-4: Archived data, Reports
        │
        └─► Update Database
            └─► INSERT INTO data_sources
                ├─► url, domain, title
                ├─► format, update_frequency
                ├─► priority, status
                └─► metadata (JSON)
```

### 3. Ingestion Phase
```
Active Data Source
        │
        ├─► Download Data
        │   ├─► CSV: Direct parse
        │   ├─► JSON: Direct parse
        │   ├─► Excel: Convert to CSV
        │   ├─► PDF: OCR + Extract
        │   └─► API: Query endpoint
        │
        ├─► Transform Data
        │   ├─► Map columns to schema
        │   ├─► Validate data types
        │   ├─► Clean and normalize
        │   └─► Deduplicate records
        │
        ├─► Load Data
        │   ├─► INSERT new records
        │   ├─► UPDATE existing records
        │   ├─► SKIP duplicates
        │   └─► Log statistics
        │
        └─► Update Tracking
            ├─► last_ingested timestamp
            ├─► record_count
            ├─► status (active/error)
            └─► Log to ingestion_logs
```

### 4. Monitoring Phase
```
Scheduled Check (Daily/Weekly/Monthly)
        │
        ├─► Query Active Sources
        │   └─► WHERE status = 'active'
        │       └─► ORDER BY priority DESC
        │
        ├─► Check for Updates
        │   ├─► Compare last_modified
        │   ├─► Compare file_size
        │   └─► Compare record_count
        │
        ├─► Detect Changes
        │   ├─► New records
        │   ├─► Updated records
        │   ├─► Deleted records
        │   └─► Schema changes
        │
        └─► Trigger Actions
            ├─► Re-ingest if changed
            ├─► Log to data_source_changes
            ├─► Send alert email
            └─► Update dashboard
```

---

## Component Details

### Discovery Engine
**File:** `ingestion_pipeline.py`

**Functions:**
- `discover_chhs_datasets()` - Query CHHS SODA API
- `discover_data_ca_gov()` - Query data.ca.gov CKAN API
- `add_data_source()` - Add new source to database
- `check_data_source()` - Verify source accessibility
- `list_data_sources()` - Query tracked sources

**APIs Used:**
- CHHS: `https://data.chhs.ca.gov/api/3/action/package_list`
- data.ca.gov: `https://data.ca.gov/api/3/action/package_search`

### Database Schema
**File:** `schema.sql`

**Tables:**
1. **data_sources** - Master registry
   - Primary key: `id`
   - Unique: `url`
   - Indexes: `domain`, `status`, `priority`, `last_checked`

2. **ingestion_logs** - Audit trail
   - Primary key: `id`
   - Foreign key: `data_source_id`
   - Indexes: `data_source_id`, `status`

3. **data_source_changes** - Change detection
   - Primary key: `id`
   - Foreign key: `data_source_id`
   - Index: `data_source_id`

### Test Ingestion
**File:** `test_ingestion.py`

**Features:**
- Test CMS Hospital API ingestion
- Search data.ca.gov for datasets
- Show tracked sources by domain
- Log ingestion statistics

**Demo:**
```bash
python data_sources/test_ingestion.py
```

---

## Integration Points

### 1. Existing Facilities Table
```sql
INSERT INTO facilities (
    name, address, city, state, zip, phone,
    category, license_type, license_number
)
SELECT 
    facility_name,
    address,
    city,
    state,
    zip_code,
    phone,
    facility_type,
    ownership,
    license_no
FROM ingested_data;
```

### 2. Existing Financials Table
```sql
INSERT INTO financials (
    facility_id, license_number, year,
    total_revenue, total_expenses, net_income,
    total_visits, avg_daily_census
)
SELECT 
    f.id,
    license_no,
    reporting_year,
    total_operating_revenue,
    total_operating_expenses,
    net_income,
    total_patient_visits,
    average_daily_census
FROM ingested_financial_data ifd
JOIN facilities f ON ifd.license_no = f.license_number;
```

### 3. Web Application API
```typescript
// Future API endpoint
GET /api/data-sources
  ?status=active
  &priority>=8
  &domain=hcai.ca.gov

Response:
{
  "sources": [
    {
      "id": 1,
      "title": "Hospital Financial Reports",
      "url": "https://hcai.ca.gov/...",
      "format": "Excel",
      "last_ingested": "2026-01-28T10:00:00Z",
      "record_count": 450
    }
  ]
}
```

---

## Scalability

### Current Capacity
- **Tracked Sources:** 19
- **Discovered Sources:** 10+
- **Total Potential:** 200+

### Performance
- **Discovery:** ~2 seconds per API query
- **Ingestion:** ~1000 records/second (CSV)
- **Database Size:** ~10MB for 19 sources
- **Estimated Full Scale:** ~500MB for 200 sources

### Optimization Strategies
1. **Parallel Processing:** Ingest multiple sources simultaneously
2. **Incremental Updates:** Only fetch changed records
3. **Caching:** Store API responses for 24 hours
4. **Batch Inserts:** Insert 1000 records at a time
5. **Indexes:** Optimize queries with proper indexes

---

## Error Handling

### Network Errors
```python
try:
    response = requests.get(url, timeout=30)
    response.raise_for_status()
except requests.Timeout:
    log_error("Timeout", source_id)
except requests.HTTPError as e:
    log_error(f"HTTP {e.response.status_code}", source_id)
```

### Data Validation
```python
def validate_facility(record):
    required = ['name', 'address', 'city']
    for field in required:
        if not record.get(field):
            raise ValidationError(f"Missing {field}")
```

### Duplicate Detection
```python
cursor.execute('''
    SELECT id FROM facilities 
    WHERE name = ? AND address = ?
''', (name, address))

if cursor.fetchone():
    stats['skipped'] += 1
else:
    cursor.execute('INSERT INTO facilities ...')
    stats['inserted'] += 1
```

---

## Future Enhancements

### Phase 1: Automation
- [ ] Cron jobs for scheduled ingestion
- [ ] Email alerts for new data
- [ ] Slack/Discord webhooks
- [ ] Admin dashboard

### Phase 2: Advanced Features
- [ ] PDF parsing with OCR
- [ ] Excel file conversion
- [ ] API rate limiting
- [ ] Retry logic with exponential backoff

### Phase 3: Intelligence
- [ ] ML-based data quality scoring
- [ ] Predictive update detection
- [ ] Anomaly detection
- [ ] Cross-source entity resolution

---

## Monitoring & Alerts

### Health Checks
```sql
-- Sources that haven't been checked recently
SELECT title, last_checked
FROM data_sources
WHERE status = 'active'
AND last_checked < datetime('now', '-7 days')
ORDER BY priority DESC;
```

### Ingestion Status
```sql
-- Recent ingestion failures
SELECT ds.title, il.error_message, il.started_at
FROM ingestion_logs il
JOIN data_sources ds ON il.data_source_id = ds.id
WHERE il.status = 'error'
ORDER BY il.started_at DESC
LIMIT 10;
```

### Change Detection
```sql
-- Recent changes detected
SELECT ds.title, dsc.change_type, dsc.change_count
FROM data_source_changes dsc
JOIN data_sources ds ON dsc.data_source_id = ds.id
WHERE dsc.detected_at > datetime('now', '-7 days')
ORDER BY dsc.detected_at DESC;
```

---

**System designed for continuous expansion and automated monitoring** 🦛
