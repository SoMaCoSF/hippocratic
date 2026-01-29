# Running Hippocratic Locally

Complete guide for running the entire fraud detection platform on localhost.

## 🖥️ Local Development Setup

### Prerequisites

- **Node.js** 18+ (for Next.js web app)
- **Python** 3.10+ (for data scrapers)
- **Git** (for version control)
- **Chrome** (for SeleniumBase scrapers)

### Installation

#### 1. Clone Repository

```bash
git clone https://github.com/SoMaCoSF/hippocratic.git
cd hippocratic
```

#### 2. Install Python Dependencies

```bash
pip install seleniumbase requests pandas openpyxl pdfplumber PyPDF2
sbase install chromedriver latest
```

#### 3. Install Node.js Dependencies

```bash
cd web
npm install
```

#### 4. Initialize Database

```bash
# From hippocratic root directory
cd data_sources
python init_db.py

# Verify tables
cd ..
python -c "import sqlite3; conn = sqlite3.connect('local.db'); print([t[0] for t in conn.execute('SELECT name FROM sqlite_master WHERE type=\"table\"').fetchall()]); conn.close()"
```

## 🚀 Running the Application

### Start Web App (Next.js)

```bash
cd web
npm run dev
```

**Access at**: `http://localhost:3000`

**Pages Available**:
- `/` - Landing page
- `/map` - Main map interface
- `/explorer` - Data table view
- `/network` - OSINT network graph
- `/stacked` - Duplicate facilities
- `/financials` - Financial analysis
- `/ingest` - Admin dashboard (password protected)
- `/about` - Documentation

### Login to Admin Dashboard

1. Go to `http://localhost:3000/ingest`
2. Enter email: `somacosf@gmail.com`
3. Check console for verification key
4. Enter key to access dashboard

## 🔍 Running Data Scrapers Locally

### Open FI$Cal Scraper (Budget Data)

```bash
cd data_sources
python scrape_openfiscal.py
```

**Options**:
```bash
# Headless mode (no browser window)
python scrape_openfiscal.py --headless

# Specify output directory
python scrape_openfiscal.py --output ../data/budget/openfiscal

# With proxy
export USE_PROXY=true
export PROXY_URL="http://proxy.example.com:8080"
python scrape_openfiscal.py --headless
```

**Output**: CSV files in `data/budget/openfiscal/`

### State Controller Scraper (SCO Data)

```bash
cd data_sources
python seleniumbase_scraper.py
```

**Options**:
```bash
# Headless mode
python seleniumbase_scraper.py --headless

# Different target URL
python seleniumbase_scraper.py --url "https://bythenumbers.sco.ca.gov/"
```

**Output**: CSV files in `data/budget/sco/`

### API Data Fetcher (data.ca.gov, CHHS, CMS)

```bash
cd data_sources
python quick_fetch.py
```

**Output**: JSON metadata in `data/metadata/`

### Full Ingestion Pipeline

```bash
cd data_sources
python ingestion_pipeline.py --discover --download
```

**What it does**:
1. Discovers datasets from CHHS SODA API
2. Discovers datasets from data.ca.gov CKAN API
3. Downloads available CSV/JSON files
4. Saves metadata to database
5. Logs ingestion results

### Budget Parser (PDFs, Excel, CSVs)

```bash
cd data_sources
python budget_parser.py --parse-all --output ../data/processed/budgets
```

**Options**:
```bash
# Parse specific source
python budget_parser.py --source "State Budget"

# Update database with results
python budget_parser.py --update-db

# Extract only healthcare spending
python budget_parser.py --filter healthcare
```

**Output**: Parsed data in `data/processed/budgets/`

## 🗄️ Database Management

### View Database Contents

```bash
# List all tables
python -c "import sqlite3; conn = sqlite3.connect('local.db'); print('\\n'.join([t[0] for t in conn.execute('SELECT name FROM sqlite_master WHERE type=\"table\"').fetchall()])); conn.close()"

# Count records in each table
python -c "import sqlite3; conn = sqlite3.connect('local.db'); tables = [t[0] for t in conn.execute('SELECT name FROM sqlite_master WHERE type=\"table\"').fetchall()]; [print(f'{t}: {conn.execute(f\"SELECT COUNT(*) FROM {t}\").fetchone()[0]}') for t in tables]; conn.close()"

# View recent ingestion logs
python -c "import sqlite3; conn = sqlite3.connect('local.db'); [print(row) for row in conn.execute('SELECT * FROM ingestion_logs ORDER BY started_at DESC LIMIT 5').fetchall()]; conn.close()"
```

### Export Database

```bash
python export_db.py
```

**Output**: `local_export.sql`

### Populate Database with Sample Data

```bash
python populate_db.py
```

**Loads**:
- All facilities from `web/public/data/facilities/all.min.json`
- Financial data from `web/public/data/enrichment/state/CA/hcai_hhah_util_2024.csv`

## 🔧 Testing Individual Components

### Test Proxy Configuration

```bash
cd data_sources
python proxy_config.py
```

### Test Database Connection

```bash
python -c "from web.src.lib.db import getDb; db = getDb(); print('✅ Database connected'); result = db.execute('SELECT COUNT(*) FROM facilities'); print(f'Facilities: {result.rows[0][0] if result.rows else 0}')"
```

### Test API Endpoints

```bash
# Start Next.js dev server
cd web && npm run dev &

# Test facilities API
curl http://localhost:3000/api/facilities?limit=5

# Test financials API
curl http://localhost:3000/api/financials?limit=5

# Test data sources API
curl http://localhost:3000/api/data-sources

# Test ingestion logs API
curl http://localhost:3000/api/ingestion-logs?limit=10

# Test budget stats API
curl http://localhost:3000/api/budget-stats
```

## 🎨 ManimGL Visualizations

### Interactive Network Visualization

```bash
cd visualization
manimgl interactive_network.py InteractiveNetworkScene
```

**Controls**:
- **Click node**: Highlight connections
- **Arrow keys**: Navigate
- **Q**: Quit
- **R**: Reset view
- **F**: Toggle fullscreen

### Static Network Visualization

```bash
cd visualization
manimgl osint_network.py FinancialNetworkScene
```

## 🐛 Troubleshooting

### Port 3000 Already in Use

```bash
# Find and kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:3000 | xargs kill -9
```

### Database Locked Error

```bash
# Close all database connections
# Delete lock file if exists
rm .next/dev/lock

# Restart dev server
cd web && npm run dev
```

### Selenium Chrome Driver Issues

```bash
# Reinstall ChromeDriver
sbase install chromedriver latest

# Or manually specify version
sbase install chromedriver 120
```

### Module Not Found Errors

```bash
# Reinstall Python dependencies
pip install --upgrade seleniumbase requests pandas openpyxl pdfplumber PyPDF2

# Reinstall Node dependencies
cd web && rm -rf node_modules && npm install
```

### Proxy Connection Errors

```bash
# Test proxy manually
curl -x http://proxy.example.com:8080 https://www.google.com

# Disable proxy temporarily
export USE_PROXY=false
```

## 📊 Viewing Results

### Check Scraped Data

```bash
# List downloaded files
ls -lh data/budget/openfiscal/
ls -lh data/budget/sco/
ls -lh data/metadata/

# View file contents
head data/budget/openfiscal/*.csv
cat data/metadata/data_ca_gov_healthcare.json | jq '.'
```

### Check Database Updates

```bash
# Count facilities
python -c "import sqlite3; print(sqlite3.connect('local.db').execute('SELECT COUNT(*) FROM facilities').fetchone()[0])"

# Count financial records
python -c "import sqlite3; print(sqlite3.connect('local.db').execute('SELECT COUNT(*) FROM financials').fetchone()[0])"

# Recent ingestion logs
python -c "import sqlite3; [print(row) for row in sqlite3.connect('local.db').execute('SELECT started_at, status, records_inserted FROM ingestion_logs ORDER BY started_at DESC LIMIT 5').fetchall()]"
```

## 🔄 Full Development Workflow

### 1. Start All Services

```bash
# Terminal 1: Web app
cd web && npm run dev

# Terminal 2: Watch for file changes (optional)
cd hippocratic && git status

# Terminal 3: Run scrapers as needed
cd data_sources && python scrape_openfiscal.py --headless
```

### 2. Make Changes

- Edit Next.js pages in `web/src/app/`
- Edit scrapers in `data_sources/`
- Edit database schema in `data_sources/schema.sql`

### 3. Test Changes

- Browser auto-refreshes for Next.js changes
- Re-run scrapers to test scraper changes
- Check console for errors

### 4. Commit and Push

```bash
git add -A
git commit -m "Description of changes"
git push
```

### 5. Deploy to Vercel

```bash
cd web
vercel --prod
```

## 📝 Environment Variables

Create `.env.local` in `web/` directory:

```bash
# Database (optional - uses local.db by default)
# TURSO_DATABASE_URL=libsql://your-database.turso.io
# TURSO_AUTH_TOKEN=your-token

# Authentication
AUTHORIZED_EMAILS=somacosf@gmail.com

# Proxy (optional)
USE_PROXY=false
PROXY_URL=http://proxy.example.com:8080
PROXY_ROTATION=random
```

## ✅ Success Checklist

- [ ] Web app running on localhost:3000
- [ ] All pages load without errors
- [ ] Can log into admin dashboard
- [ ] Database has facility and financial records
- [ ] Scrapers run without errors
- [ ] Data appears in `data/` directories
- [ ] Admin dashboard shows ingestion logs
- [ ] ManimGL visualizations render
- [ ] API endpoints return data

## 🎯 Quick Commands Cheat Sheet

```bash
# Start web app
cd web && npm run dev

# Run all scrapers
cd data_sources && python scrape_openfiscal.py --headless && python seleniumbase_scraper.py --headless && python quick_fetch.py

# Rebuild database
cd data_sources && python init_db.py && cd .. && python populate_db.py

# Check database
python -c "import sqlite3; conn = sqlite3.connect('local.db'); print(f'Facilities: {conn.execute(\"SELECT COUNT(*) FROM facilities\").fetchone()[0]}, Financials: {conn.execute(\"SELECT COUNT(*) FROM financials\").fetchone()[0]}'); conn.close()"

# Deploy to Vercel
cd web && vercel --prod

# Commit changes
git add -A && git commit -m "Update" && git push
```

---

**Happy Hacking! 🚀**  
For issues: https://github.com/SoMaCoSF/hippocratic/issues
