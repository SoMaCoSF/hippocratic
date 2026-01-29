# Ghost Catalog Directive - SOC Job System

## 🎯 Purpose

The Ghost Catalog maintains a **complete historical record** of every entity ever processed by the Hippocratic system, even after deletion or modification. It implements the **SOC (SomaCoSF Operations Center) job numbering system** for full audit trail.

## 📋 SOC Job Numbering

```
SOC-0001  →  First job
SOC-0002  →  Second job
SOC-9999  →  9999th job
```

Every data ingestion operation gets a **unique SOC job number**:
- Sequential numbering
- Never reused
- Permanent audit trail
- Cross-referenced in all tables

## 🗄️ Database Schema

### 1. **job_history**
Tracks every SOC job ever run:

```sql
CREATE TABLE job_history (
    id INTEGER PRIMARY KEY,
    job_number TEXT UNIQUE,          -- SOC-####
    scraper_name TEXT,               -- Which scraper ran
    start_time DATETIME,
    end_time DATETIME,
    status TEXT,                     -- running, completed, failed
    records_fetched INTEGER,
    records_new INTEGER,
    records_duplicate INTEGER,
    bytes_downloaded INTEGER,
    error_message TEXT,
    metadata TEXT                    -- JSON metadata
);
```

### 2. **job_logs**
Complete log of every action in every job:

```sql
CREATE TABLE job_logs (
    id INTEGER PRIMARY KEY,
    job_number TEXT,                 -- SOC-####
    timestamp DATETIME,
    level TEXT,                      -- info, warning, error, success
    message TEXT,
    metadata TEXT                    -- Additional context
);
```

### 3. **ghost_catalog**
The master catalog of all entities ever seen:

```sql
CREATE TABLE ghost_catalog (
    id INTEGER PRIMARY KEY,
    entity_type TEXT,                -- facility, financial, budget
    entity_id TEXT,                  -- External ID (license #, etc)
    entity_name TEXT,
    content_hash TEXT,               -- SHA256 of key fields
    status TEXT,                     -- active, ghosted, deleted
    first_job TEXT,                  -- SOC-#### when first seen
    last_job TEXT,                   -- SOC-#### when last seen
    appearances INTEGER,             -- How many times seen
    data_snapshot TEXT,              -- JSON snapshot of data
    created_at DATETIME,
    updated_at DATETIME
);
```

### 4. **record_hashes**
Deduplication tracking:

```sql
CREATE TABLE record_hashes (
    id INTEGER PRIMARY KEY,
    record_type TEXT,
    record_hash TEXT UNIQUE,         -- SHA256 hash
    record_id INTEGER,               -- ID in main table
    table_name TEXT,
    first_seen DATETIME,
    last_seen DATETIME,
    seen_count INTEGER               -- Duplicate count
);
```

## 🔄 How It Works

### Job Lifecycle:

```
1. START JOB
   ├─> Generate SOC-#### number
   ├─> Create job_history record
   └─> Log: "Started job SOC-0123"

2. FETCH DATA
   ├─> Download from source
   ├─> Log each step
   └─> Track bytes downloaded

3. DEDUPLICATION
   For each record:
   ├─> Compute hash (license + name + address)
   ├─> Check record_hashes table
   ├─> If duplicate:
   │   ├─> Increment seen_count
   │   ├─> Update last_seen
   │   └─> Skip insert
   └─> If new:
       ├─> Insert to main table
       ├─> Add to record_hashes
       └─> Register in ghost_catalog

4. GHOST CATALOG UPDATE
   ├─> Upsert entity (by entity_type + entity_id)
   ├─> Update last_job = SOC-####
   ├─> Increment appearances
   ├─> Save data snapshot
   └─> Mark timestamp

5. COMPLETE JOB
   ├─> Update end_time
   ├─> Set status = completed
   ├─> Save stats (new/duplicate counts)
   └─> Log: "Job SOC-0123 completed"
```

## 📊 Deduplication Strategy

### Key Fields by Type:

**Facilities:**
- License Number
- Name
- Address

**Financials:**
- Facility License
- Fiscal Year
- Report Type

**Budgets:**
- Department
- Program
- Fiscal Year

### Hash Computation:
```python
key_data = {k: record[k] for k in sorted(key_fields)}
key_str = json.dumps(key_data, sort_keys=True)
hash = hashlib.sha256(key_str.encode()).hexdigest()
```

## 🎯 Ghost Catalog Rules

### Entity States:

1. **active** - Currently in system
2. **ghosted** - Removed from main tables but tracked
3. **deleted** - Explicitly deleted

### Appearance Tracking:

- First time seen → `first_job = SOC-0123`
- Every subsequent appearance → `appearances++`
- Last time seen → `last_job = SOC-0456`

### Data Snapshots:

Each appearance saves full record JSON:
```json
{
  "facilityName": "Example Hospital",
  "license": "L123456",
  "address": "123 Main St",
  "capacity": 100
}
```

## 📈 Statistics

The system tracks:
- **Total Jobs**: All SOC jobs run
- **Total Entities**: Unique entities ever seen
- **Duplicates Prevented**: Records not re-inserted
- **Active Entities**: Currently in system
- **Ghosted Entities**: Historical records

## 🔍 Query Examples

### Get Job History:
```python
dedup = RecordDeduplicator()
history = dedup.get_job_history(limit=100)
# Returns last 100 SOC jobs
```

### Get Job Logs:
```python
logs = dedup.get_job_logs('SOC-0123')
# Returns all logs for specific job
```

### Check Ghost Catalog:
```python
entities = dedup.get_ghost_catalog(entity_type='facility')
# Returns all facilities ever seen
```

### Deduplication Stats:
```python
stats = dedup.get_stats()
# {
#   'total_jobs': 456,
#   'total_entities': 12345,
#   'total_duplicates_prevented': 8901,
#   'active_entities': 5432,
#   'ghosted_entities': 6913
# }
```

## 🚀 Integration with Admin Panel

### New Tab: "JOB HISTORY"

Shows table of all SOC jobs:
```
SOC-0123 | data_ca_gov  | 2024-01-28 | completed | 1500 new, 234 dup
SOC-0124 | chhs         | 2024-01-28 | completed | 2341 new, 156 dup
SOC-0125 | openfiscal   | 2024-01-28 | running   | ...
```

Click job → View full logs

### New Tab: "GHOST CATALOG"

Shows all entities ever tracked:
```
Facility L123456 | First: SOC-0001 | Last: SOC-0125 | Seen: 45 times
Facility L234567 | First: SOC-0012 | Last: SOC-0089 | Seen: 12 times (GHOSTED)
```

## 💾 Disk Usage on Vercel

### Problem:
- Vercel serverless: **50 MB max per function**
- Vercel deployment: **250 MB total**

### Solution:
- **All data** → Turso database (external, unlimited)
- **Logs** → Turso tables (not filesystem)
- **Ghost catalog** → Turso (persistent across deployments)
- **Job history** → Turso (permanent audit trail)

### Benefits:
- ✅ Unlimited storage (Turso free tier: 9 GB)
- ✅ Survives deployments
- ✅ Queryable with SQL
- ✅ Cross-reference SOC jobs
- ✅ Full audit compliance

## 🔐 Audit Trail

Every operation is tracked:
1. **Who**: Scraper name
2. **What**: Records fetched/saved
3. **When**: Exact timestamps
4. **Where**: Source URL (in metadata)
5. **How**: Success/failure status
6. **Why**: Error messages if failed

## ✅ Implementation Checklist

- [x] RecordDeduplicator class
- [x] SOC job numbering
- [x] Ghost catalog tables
- [x] Job history tracking
- [x] Job logging system
- [ ] Admin panel integration
- [ ] API endpoints for jobs
- [ ] Job history viewer
- [ ] Ghost catalog browser
- [ ] Deduplication metrics dashboard

---

**Ghost Catalog Directive: Complete Historical Accountability** 👻
