# Vector Search & Admin Panel Guide

Complete guide for the Hippocratic Admin Panel with Vector Search capabilities.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd hippocratic
pip install -r requirements-admin.txt
```

### 2. Initialize Vector Database

```bash
# Apply vector schema to Turso or local SQLite
sqlite3 local.db < turso_vector_setup.sql

# Or for Turso cloud:
turso db shell hippocratic-db < turso_vector_setup.sql
```

### 3. Generate Embeddings

```bash
# Embed all facilities for semantic search
python vector_search.py --embed-all --db local.db
```

### 4. Start Admin Server

```bash
python hippocratic_admin.py
```

**Access**: `http://localhost:8000`

## 🎯 What You Get

### Admin Panel Features
- **Real-time Dashboard** - Live stats and metrics
- **Scraper Management** - Start/stop data scrapers
- **OpenTelemetry Metrics** - Request rates, latency, throughput
- **Database Statistics** - Record counts, embeddings status
- **Vector Search** - Semantic search across all data (coming soon)

### Vector Search Capabilities
- **Semantic Search** - Natural language queries
- **Similar Facilities** - Find related facilities
- **Fraud Pattern Matching** - Compare against known fraud indicators
- **Anomaly Detection** - Identify unusual patterns

## 📊 Admin Dashboard

### Main Screen

```
┌─────────────────────────────────────────────────────────────┐
│         🏥 Hippocratic Admin                                │
│         California Healthcare Fraud Detection System         │
│         Uptime: 2h 34m 12s                                  │
└─────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Scrapers Run │ Data Records │   Embeddings │ Active Tasks │
│      12      │    45,231    │    12,450    │      2       │
└──────────────┴──────────────┴──────────────┴──────────────┘

🤖 Data Scrapers
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Open FI$Cal  │ State Contr. │ data.ca.gov  │ CHHS Portal  │
│ Budget Data  │ Spending     │ API Data     │ Health Data  │
└──────────────┴──────────────┴──────────────┴──────────────┘

📊 OpenTelemetry Metrics
  Requests (Total):      1,234
  Bytes Downloaded:      52.4 MB
  Avg Response Time:     342 ms
  Rate Limit Delays:     156
  Errors:                0

🗄️ Database Status
  Facilities:            5,432
  Financial Records:     8,901
  Budget Records:        2,341
  Data Sources:          45
```

## 🔍 Vector Search

### Semantic Search

```python
from vector_search import VectorSearch

vs = VectorSearch(db_path="local.db")

# Natural language search
results = vs.search_facilities("hospice facilities in Los Angeles with fraud history")

for result in results:
    print(f"{result['name']} - Similarity: {result['similarity']:.3f}")
```

### Find Similar Facilities

```python
# Find facilities similar to a known fraudulent one
similar = vs.find_similar_facilities(facility_id=123, limit=10)

for facility in similar:
    print(f"{facility['name']} ({facility['city']}) - {facility['similarity']:.3f}")
```

### Fraud Pattern Matching

```python
# Coming soon: Compare against known fraud patterns
patterns = vs.find_matching_fraud_patterns(facility_id=123)

for pattern in patterns:
    print(f"{pattern['name']}: {pattern['severity']} - {pattern['similarity']:.3f}")
```

## 📈 OpenTelemetry Integration

### Start OTel Collector

```bash
docker run -d --name otel-collector \
  -p 4317:4317 \
  -p 16686:16686 \
  otel/opentelemetry-collector:latest
```

### Enable in Admin Server

```python
# Admin server automatically uses OTel if available
# Metrics are displayed in the dashboard
```

### View Metrics

- **Dashboard**: http://localhost:8000
- **Prometheus**: http://localhost:9090 (if configured)
- **Jaeger**: http://localhost:16686 (if configured)

## 🗄️ Database Schema

### Vector Tables

**`facility_embeddings`**
- Stores 384-dim vectors for each facility
- Used for semantic search
- Updated when facility data changes

**`financial_embeddings`**
- Vectors for financial records
- Enables anomaly detection

**`budget_embeddings`**
- Budget record vectors
- Fraud pattern matching

**`fraud_patterns`**
- Known fraud indicator vectors
- Pre-seeded with 8 common patterns

### Views

**`facilities_with_vectors`**
```sql
SELECT * FROM facilities_with_vectors 
WHERE similarity(embedding, ?) > 0.7
```

**`vector_stats`**
```sql
SELECT * FROM vector_stats;
-- Shows embedding counts per table
```

## 🎨 Customization

### Custom Embedding Model

```python
# Use a different model
vs = VectorSearch(
    model_name="paraphrase-MiniLM-L6-v2",  # Faster
    device="cuda"  # Use GPU if available
)
```

### Batch Processing

```python
# Embed facilities in larger batches
vs.embed_all_facilities(batch_size=500)
```

### Custom Search

```python
# Implement custom scoring
def custom_search(query, limit=10):
    results = vs.search_facilities(query, limit=100)
    
    # Apply custom filters
    filtered = [r for r in results if r['similarity'] > 0.8]
    
    # Custom ranking
    return sorted(filtered, key=custom_score)
```

## 🚨 Fraud Detection Patterns

Pre-seeded patterns in `fraud_patterns` table:

1. **Duplicate Billing** - Same services billed multiple times
2. **Ghost Patients** - Billing for non-existent patients
3. **Upcoding** - Billing for more expensive services
4. **Unbundling** - Separating bundled services
5. **Shell Company** - Multiple facilities, same ownership
6. **Phantom Billing** - Services never provided
7. **Kickbacks** - Payments for referrals
8. **False Cost Reports** - Inflated expenses

## 📊 API Endpoints

### GET `/`
Admin dashboard (HTML)

### GET `/api/stats`
System statistics (JSON)

### GET `/api/metrics`
OpenTelemetry metrics (JSON)

### POST `/api/scraper/start/{scraper_name}`
Start a data scraper

### GET `/api/db/stats`
Database record counts

### GET `/api/vector/search?query=...&limit=10`
Semantic search (coming soon)

## 🔧 Configuration

### Environment Variables

```bash
# Database
export TURSO_DATABASE_URL="libsql://your-db.turso.io"
export TURSO_AUTH_TOKEN="your-token"

# OpenTelemetry
export OTEL_ENDPOINT="http://localhost:4317"

# Admin Server
export ADMIN_HOST="0.0.0.0"
export ADMIN_PORT="8000"

# Vector Search
export EMBEDDING_MODEL="all-MiniLM-L6-v2"
export EMBEDDING_DEVICE="cpu"  # or "cuda"
```

### Config File (Optional)

```yaml
# admin_config.yaml
server:
  host: "127.0.0.1"
  port: 8000

database:
  path: "local.db"
  # Or Turso:
  # url: "libsql://your-db.turso.io"
  # token: "your-token"

vector_search:
  model: "all-MiniLM-L6-v2"
  device: "cpu"
  batch_size: 100

opentelemetry:
  enabled: true
  endpoint: "http://localhost:4317"

scrapers:
  openfiscal:
    enabled: true
    schedule: "0 6 * * 1"  # Monday 6 AM
  sco:
    enabled: true
    schedule: "0 6 * * 2"  # Tuesday 6 AM
```

## 🐛 Troubleshooting

### "sentence-transformers not available"
```bash
pip install sentence-transformers torch
```

### "FastAPI not available"
```bash
pip install fastapi uvicorn
```

### "Port 8000 already in use"
```bash
python hippocratic_admin.py --port 8001
```

### Embeddings taking too long
```bash
# Use GPU if available
export EMBEDDING_DEVICE="cuda"

# Or use smaller model
export EMBEDDING_MODEL="paraphrase-MiniLM-L3-v2"
```

### Database connection errors
```bash
# Check database exists
ls -lh local.db

# Apply schema
sqlite3 local.db < turso_vector_setup.sql

# Verify tables
sqlite3 local.db "SELECT name FROM sqlite_master WHERE type='table';"
```

## 📚 Next Steps

1. **Generate Embeddings**: `python vector_search.py --embed-all`
2. **Start Admin**: `python hippocratic_admin.py`
3. **Run Scrapers**: Click scraper buttons in dashboard
4. **Monitor**: Watch OpenTelemetry metrics
5. **Search**: Use vector search API
6. **Deploy**: Export to Turso cloud for production

## 🎯 Production Deployment

### Turso Cloud

```bash
# Create Turso database
turso db create hippocratic-prod

# Apply schema
turso db shell hippocratic-prod < turso_vector_setup.sql

# Get connection URL
turso db show hippocratic-prod

# Update environment
export TURSO_DATABASE_URL="libsql://hippocratic-prod.turso.io"
export TURSO_AUTH_TOKEN="your-token"

# Run admin server
python hippocratic_admin.py --host 0.0.0.0
```

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements-admin.txt .
RUN pip install -r requirements-admin.txt

COPY . .

CMD ["python", "hippocratic_admin.py", "--host", "0.0.0.0"]
```

```bash
docker build -t hippocratic-admin .
docker run -p 8000:8000 hippocratic-admin
```

---

**Admin Panel + Vector Search = Powerful Fraud Detection** 🚀
