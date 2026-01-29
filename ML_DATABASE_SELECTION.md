# ML Fraud Detection - Database Selection Guide

## ✅ **FIXED - Database Selection Now Available!**

The ML fraud detection system now supports **multi-database selection**, allowing you to choose which database to analyze.

---

## 🎯 **What Changed:**

### **Before:**
- ❌ Hardcoded to `local.db` only
- ❌ No database selection
- ❌ Couldn't analyze different datasets

### **After:**
- ✅ Select from configured databases
- ✅ Analyze any SQLite database
- ✅ Configure contamination rate
- ✅ Shows database info in results

---

## 📊 **LCARS Interface - Database Selection**

### **Access:**
```
http://localhost:3000/lcars
```

**Steps:**
1. Click **"ML DETECTION"** tab
2. **SELECT DATABASE** dropdown (top left)
3. **CONTAMINATION** dropdown (top right)
4. Click **"RUN COMPREHENSIVE ML ANALYSIS"**
5. Results show database used

### **Database Selector:**
```
┌─ SELECT DATABASE ────────────────────────────┐
│ Main Production DB (sqlite) - local.db      │ ▼
└──────────────────────────────────────────────┘
```

Shows:
- Database name
- Database type (sqlite/turso)
- File path

### **Contamination Selector:**
```
┌─ CONTAMINATION (FRAUD RATE) ─────────────────┐
│ 10% (Balanced)                               │ ▼
└──────────────────────────────────────────────┘
```

Options:
- **5% (Conservative)** - Fewer false positives
- **10% (Balanced)** - Default, recommended
- **15% (Aggressive)** - More detections
- **20% (Very Aggressive)** - Maximum sensitivity

### **Results Display:**
After analysis, shows:
```
Database: main • Path: local.db • Contamination: 10%
```

---

## 🔧 **API Usage with Database Selection:**

### **Run ML Analysis on Specific Database:**
```bash
# Default database (main)
curl http://localhost:8000/api/ml/run-all

# Specific database
curl http://localhost:8000/api/ml/run-all?db_key=testing&contamination=0.15

# Production database
curl http://localhost:8000/api/ml/run-all?db_key=production&contamination=0.1
```

### **Get High-Risk Facilities:**
```bash
# From main database
curl http://localhost:8000/api/ml/high-risk?limit=50&db_key=main

# From testing database
curl http://localhost:8000/api/ml/high-risk?limit=50&db_key=testing
```

---

## 💻 **Python Usage:**

### **Analyze Specific Database:**
```python
from ml_fraud_detector import MLFraudDetector

# Analyze main database
detector = MLFraudDetector(db_path="local.db")
results = detector.run_all_models(contamination=0.1)

# Analyze testing database
detector = MLFraudDetector(db_path="testing.db")
results = detector.run_all_models(contamination=0.15)

# Analyze custom database
detector = MLFraudDetector(db_path="path/to/custom.db")
results = detector.run_all_models()
```

### **Connection Verification:**
When you initialize, you'll see:
```
📂 Connecting to database: local.db
✅ Database connected: 15743 facilities, 8484 financial records
```

---

## 🗄️ **Database Configuration:**

### **Current Databases (from `db_config.json`):**

**1. Main Production DB**
- Key: `main`
- Type: `sqlite`
- Path: `local.db`
- Status: ✅ Available
- Records: 15,743 facilities, 8,484 financials

**2. Testing Database**
- Key: `testing`
- Type: `sqlite`
- Path: `testing.db`
- Status: ⚠️ Not created yet
- Records: 0

### **Add New Database:**

**Via LCARS:**
1. Go to **DATABASE** tab
2. Click **"Add Database"**
3. Configure name, type, path
4. Save

**Via API:**
```bash
curl -X POST http://localhost:8000/api/databases \
  -H "Content-Type: application/json" \
  -d '{
    "key": "fraud_archive",
    "name": "Fraud Archive 2023",
    "type": "sqlite",
    "path": "archive_2023.db",
    "description": "Historical fraud cases"
  }'
```

**Manually edit `db_config.json`:**
```json
{
  "main": {
    "name": "Main Production DB",
    "type": "sqlite",
    "path": "local.db"
  },
  "fraud_2023": {
    "name": "Fraud Cases 2023",
    "type": "sqlite",
    "path": "fraud_2023.db"
  }
}
```

---

## 🎯 **Use Cases:**

### **1. Compare Datasets:**
```python
# Analyze current year
detector_2024 = MLFraudDetector(db_path="data_2024.db")
results_2024 = detector_2024.run_all_models()

# Analyze previous year
detector_2023 = MLFraudDetector(db_path="data_2023.db")
results_2023 = detector_2023.run_all_models()

# Compare anomaly rates
print(f"2023: {results_2023['models']['ensemble']['anomaly_rate']:.1f}%")
print(f"2024: {results_2024['models']['ensemble']['anomaly_rate']:.1f}%")
```

### **2. Test Different Contamination Rates:**
```python
detector = MLFraudDetector(db_path="local.db")

# Conservative (fewer alerts)
results_5 = detector.run_isolation_forest(contamination=0.05)
print(f"5%: {results_5['anomalies_detected']} anomalies")

# Aggressive (more alerts)
results_20 = detector.run_isolation_forest(contamination=0.20)
print(f"20%: {results_20['anomalies_detected']} anomalies")
```

### **3. Analyze Scraped Data:**
```python
# After scraper runs and populates testing.db
detector = MLFraudDetector(db_path="testing.db")
results = detector.run_all_models(contamination=0.1)

# Check quality
if results['models']['ensemble']['anomaly_rate'] > 50:
    print("⚠️ Data quality issue - too many anomalies")
else:
    print("✅ Data quality good")
```

---

## 📊 **Database Requirements:**

For ML fraud detection to work, your database must have:

### **Required Tables:**
```sql
-- Facilities table
CREATE TABLE facilities (
    id TEXT PRIMARY KEY,
    name TEXT,
    license_number TEXT,
    category_name TEXT,
    county TEXT,
    capacity INTEGER,
    lat REAL,
    lng REAL
    -- other columns...
);

-- Financials table
CREATE TABLE financials (
    id INTEGER PRIMARY KEY,
    facility_id TEXT,
    license_number TEXT,
    year INTEGER,
    total_revenue REAL,
    total_expenses REAL,
    net_income REAL,
    total_visits INTEGER,
    total_patients INTEGER,
    revenue_per_visit REAL
    -- other columns...
);
```

### **Minimum Data:**
- ✅ At least 100 facilities with financial data
- ✅ Valid numeric values (no all-NULL columns)
- ✅ Linked facilities ↔ financials (via license_number)

### **Validation Check:**
```python
detector = MLFraudDetector(db_path="your_db.db")
# Will print:
# ✅ Database connected: X facilities, Y financial records

# If you see:
# ❌ Database connection failed: no such table: facilities
# → Your database doesn't have the required schema
```

---

## ⚙️ **Advanced Configuration:**

### **Contamination Rate Guide:**

| Rate | Use Case | Description |
|------|----------|-------------|
| 5% | **Production audits** | High confidence, few false positives |
| 10% | **General screening** | Balanced, recommended default |
| 15% | **Comprehensive review** | More detections, manual review needed |
| 20% | **Data exploration** | Maximum sensitivity, many alerts |

### **When to Adjust:**

**Increase contamination (15-20%) when:**
- New, untrusted data source
- Known high fraud area
- Initial data exploration
- Want comprehensive review

**Decrease contamination (5%) when:**
- Limited investigation resources
- Need high confidence
- Production fraud alerts
- Regulatory reporting

---

## 🔍 **Troubleshooting:**

### **Issue: "Database connection failed: no such table"**
**Solution:** Database doesn't have required schema
```bash
# Check if tables exist
sqlite3 your_db.db "SELECT name FROM sqlite_master WHERE type='table';"

# If missing, run population script
python populate_db.py --db your_db.db
```

### **Issue: "No data available for ML analysis"**
**Solution:** No facilities have financial data
```sql
-- Check data
SELECT COUNT(*) FROM facilities;
SELECT COUNT(*) FROM financials;
SELECT COUNT(*) 
FROM facilities f 
JOIN financials fin ON f.license_number = fin.license_number;
```

### **Issue: Database dropdown empty in LCARS**
**Solution:** No databases configured
```bash
# Check config file
cat db_config.json

# Create if missing
echo '{"main": {"name": "Main DB", "type": "sqlite", "path": "local.db"}}' > db_config.json

# Restart admin server
python hippocratic_admin.py
```

---

## ✅ **Verification:**

### **Test Database Selection:**

1. **Check available databases:**
```bash
curl http://localhost:8000/api/databases
```

2. **Run analysis on main:**
```bash
curl http://localhost:8000/api/ml/run-all?db_key=main
```

3. **Verify in LCARS:**
- Open `http://localhost:3000/lcars`
- Click "ML DETECTION"
- See database dropdown populated
- Select database and run

---

## 📈 **Example Workflow:**

### **Scenario: Analyze Monthly Data**

**1. Populate new database:**
```bash
# Scrape new month's data
python scraper.py --output january_2024.db

# Verify data
sqlite3 january_2024.db "SELECT COUNT(*) FROM facilities;"
```

**2. Add to configuration:**
```python
import json

# Load config
with open('db_config.json', 'r') as f:
    config = json.load(f)

# Add new database
config['january_2024'] = {
    'name': 'January 2024 Data',
    'type': 'sqlite',
    'path': 'january_2024.db',
    'description': 'Monthly fraud screening'
}

# Save
with open('db_config.json', 'w') as f:
    json.dump(config, f, indent=2)
```

**3. Run ML analysis:**
```python
from ml_fraud_detector import MLFraudDetector

detector = MLFraudDetector(db_path='january_2024.db')
results = detector.run_all_models(contamination=0.10)

print(f"Analyzed: {results['models']['iforest']['total_samples']} facilities")
print(f"High-risk: {results['models']['ensemble']['anomalies_detected']} facilities")
```

**4. Review in LCARS:**
- Select "January 2024 Data" from dropdown
- Click run
- Review high-risk facilities
- Export report

---

## 🎯 **Best Practices:**

1. **Always verify database connection:**
   - Check console output for connection confirmation
   - Verify facility/financial counts

2. **Start with default contamination (10%):**
   - Adjust based on results
   - Document your threshold choice

3. **Compare across databases:**
   - Benchmark new data against historical
   - Track anomaly rate trends

4. **Document database purpose:**
   - Use descriptive names
   - Add descriptions in config

5. **Regular cleanup:**
   - Archive old databases
   - Remove unused configs

---

## ✅ **System Status:**

**✅ DATABASE SELECTION WORKING**

- [x] Multi-database support
- [x] Database dropdown in LCARS
- [x] Contamination rate selection
- [x] API parameter support
- [x] Python library support
- [x] Connection verification
- [x] Error handling
- [x] Results show database used
- [x] Documentation complete
- [x] Tested and committed

---

**You can now select which database to analyze!** 🚀

Access via:
- **LCARS:** `http://localhost:3000/lcars` → ML DETECTION tab → Select database dropdown
- **API:** `curl http://localhost:8000/api/ml/run-all?db_key=YOUR_DB`
- **Python:** `MLFraudDetector(db_path="your_db.db")`
