# Multi-Database Configuration Guide

Configure multiple databases and route scrapers to specific targets from the admin panel.

## 🎯 Use Cases

### 1. **Separate Testing Database**
```
Main DB (Production):     ← openfiscal, sco
Testing DB (Experiments): ← data_ca_gov, chhs
```

### 2. **Environment Isolation**
```
Production DB:   ← All production scrapers
Staging DB:      ← Testing new data sources
Development DB:  ← Local development
```

### 3. **Data Segregation**
```
Financial DB:    ← openfiscal, sco (budget data)
Healthcare DB:   ← data_ca_gov, chhs (facility data)
```

### 4. **Client-Specific Databases**
```
Client A DB:     ← Specific scrapers for Client A
Client B DB:     ← Specific scrapers for Client B
```

## 🖥️ Admin Panel Configuration

### Access Database Config

1. Start admin server: `python hippocratic_admin.py`
2. Open: http://localhost:8000
3. Scroll to **"🗄️ Database Configuration"** section

### Add a New Database

**Example: Testing Database (SQLite)**
```
Database Key:  testing
Display Name:  Testing Database
Type:          SQLite (Local)
Path:          testing.db
Auth Token:    (leave empty for SQLite)
```

Click **"➕ Add Database"**

**Example: Staging Database (Turso)**
```
Database Key:  staging
Display Name:  Staging Environment
Type:          Turso (Cloud)
Path:          libsql://hippocratic-staging.turso.io
Auth Token:    eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

### Route Scrapers to Databases

In the **"Scraper → Database Routing"** section:

```
openfiscal      [Main Production DB ▼]
sco             [Main Production DB ▼]
data_ca_gov     [Testing Database   ▼]  ← Changed
chhs            [Testing Database   ▼]  ← Changed
```

Changes are **saved automatically**.

### View Current Routing

Scraper buttons show their target database:

```
┌────────────────────┐
│  💰 Open FI$Cal   │
│   Budget Data      │
│   → main           │  ← Current DB
└────────────────────┘
```

## 📁 Configuration Files

### `db_configs.json`
```json
{
  "main": {
    "name": "Main Production DB",
    "type": "turso",
    "path": "libsql://hippocratic-db.turso.io",
    "token": "eyJhbGc...",
    "description": "Primary database for production data"
  },
  "testing": {
    "name": "Testing Database",
    "type": "sqlite",
    "path": "testing.db",
    "token": "",
    "description": "Local testing database"
  },
  "staging": {
    "name": "Staging Environment",
    "type": "turso",
    "path": "libsql://hippocratic-staging.turso.io",
    "token": "eyJhbGc...",
    "description": "Staging Turso database"
  }
}
```

### `scraper_db_mappings.json`
```json
{
  "openfiscal": "main",
  "sco": "main",
  "data_ca_gov": "testing",
  "chhs": "staging"
}
```

## 🔄 How It Works

### 1. Scraper Starts
```
User clicks "💰 Open FI$Cal" button
  ↓
Admin server checks: scraper_db_mappings.json
  → openfiscal = "main"
  ↓
Loads db_configs.json["main"]
  → path: libsql://hippocratic-db.turso.io
  → token: eyJhbGc...
  ↓
Scraper connects to Main Production DB
  ↓
Data is written to correct database
```

### 2. Console Output
```
Starting scraper: openfiscal
Target database: Main Production DB (main)
Database type: turso
Database path: libsql://hippocratic-db.turso.io
...
Scraper completed: openfiscal
Data written to: Main Production DB
```

## 🎨 Example Configurations

### Development Setup
```json
{
  "main": {
    "name": "Local Development",
    "type": "sqlite",
    "path": "local.db",
    "token": ""
  }
}
```

**All scrapers** → `local.db`

### Staging + Production
```json
{
  "main": {
    "name": "Production",
    "type": "turso",
    "path": "libsql://hippocratic-prod.turso.io",
    "token": "prod_token"
  },
  "staging": {
    "name": "Staging",
    "type": "turso",
    "path": "libsql://hippocratic-staging.turso.io",
    "token": "staging_token"
  }
}
```

**Mappings:**
- Production scrapers → `main`
- Test scrapers → `staging`

### Client Isolation
```json
{
  "main": {
    "name": "Internal Use",
    "type": "sqlite",
    "path": "internal.db"
  },
  "client_a": {
    "name": "Client A Database",
    "type": "turso",
    "path": "libsql://client-a.turso.io",
    "token": "client_a_token"
  },
  "client_b": {
    "name": "Client B Database",
    "type": "turso",
    "path": "libsql://client-b.turso.io",
    "token": "client_b_token"
  }
}
```

**Mappings:**
- `openfiscal` → `client_a`
- `sco` → `client_b`
- `data_ca_gov` → `main`

## 🔐 Security Best Practices

### 1. **Don't Commit Tokens**
Add to `.gitignore`:
```
db_configs.json
scraper_db_mappings.json
```

### 2. **Use Environment Variables**
```bash
export TURSO_STAGING_TOKEN="eyJhbGc..."
export TURSO_PROD_TOKEN="eyJhbGc..."
```

Reference in config:
```json
{
  "staging": {
    "token": "${TURSO_STAGING_TOKEN}"
  }
}
```

### 3. **Rotate Tokens Regularly**
```bash
# Create new token
turso db tokens create hippocratic-prod

# Update in admin panel
# Revoke old token
turso db tokens revoke <old_token>
```

## 🧪 Testing New Databases

### 1. Create Test Database
```bash
# Local
touch test_scrape.db
sqlite3 test_scrape.db < turso_vector_setup.sql

# Or Turso
turso db create hippocratic-test
turso db shell hippocratic-test < turso_vector_setup.sql
```

### 2. Add in Admin Panel
```
Key:  test
Name: Test Scrape Database
Type: sqlite (or turso)
Path: test_scrape.db (or libsql://...)
```

### 3. Route One Scraper
```
data_ca_gov → Test Scrape Database
```

### 4. Run & Verify
```bash
# Run scraper
# (Click button in admin panel)

# Check data
sqlite3 test_scrape.db "SELECT COUNT(*) FROM facilities"
```

### 5. Promote to Production
If successful:
```
# Update mapping
data_ca_gov → Main Production DB
```

## 📊 Monitoring Multiple Databases

### Dashboard Stats
The admin dashboard shows aggregate stats from **all configured databases**:

```
Total Records: 45,231  (across all DBs)
  ├── main:    30,000
  ├── testing: 10,000
  └── staging:  5,231
```

### API Endpoints

**Get all databases:**
```bash
curl http://localhost:8000/api/databases
```

**Get scraper mappings:**
```bash
curl http://localhost:8000/api/scrapers/mappings
```

**Create database:**
```bash
curl -X POST http://localhost:8000/api/databases \
  -H "Content-Type: application/json" \
  -d '{
    "key": "testing",
    "name": "Testing DB",
    "type": "sqlite",
    "path": "testing.db"
  }'
```

**Update mapping:**
```bash
curl -X POST http://localhost:8000/api/scrapers/mappings \
  -H "Content-Type: application/json" \
  -d '{
    "scraper": "openfiscal",
    "database": "testing"
  }'
```

## 🚨 Important Notes

1. **Cannot Delete Main DB** - The `main` database is protected
2. **Auto-Remap on Delete** - If you delete a DB, scrapers are remapped to `main`
3. **Configs Persist** - Settings saved to JSON files (survive restarts)
4. **No Data Migration** - Changing a mapping doesn't move existing data
5. **Schema Must Match** - All databases need same schema structure

## 🔄 Migration Between Databases

### Export from One DB
```bash
sqlite3 testing.db .dump > testing_data.sql
```

### Import to Another
```bash
# SQLite
sqlite3 main.db < testing_data.sql

# Turso
turso db shell hippocratic-prod < testing_data.sql
```

## ✅ Best Practices

1. **Start with Testing DB** - Route new scrapers to test DB first
2. **Monitor Logs** - Check console output for target database
3. **Backup Before Changes** - Export data before switching
4. **Use Descriptive Names** - Clear database names in config
5. **Document Mappings** - Keep notes on why scrapers route where
6. **Regular Reviews** - Periodically review and clean up unused DBs

---

**Multi-Database. Maximum Flexibility.** 🚀
