# California Government Data Source Inventory

## Overview
This document tracks all California .gov data sources for healthcare fraud detection.

---

## 🏥 Healthcare Facilities Data

### 1. **California Health and Human Services Open Data Portal**
- **URL:** https://data.chhs.ca.gov/
- **API:** SODA API (Socrata)
- **Key Datasets:**
  - Healthcare Facility Locations
  - Licensing and Certification
  - Financial and Utilization Data
  - Inspection Reports
- **Format:** JSON, CSV, XML
- **Update Frequency:** Varies by dataset
- **Status:** ✅ Active

### 2. **HCAI (Healthcare Access and Information)**
- **URL:** https://hcai.ca.gov/data-and-reports/
- **Direct Downloads:**
  - Hospital Financial Data
  - Utilization Statistics
  - Quality Metrics
  - Capacity Reports
- **Format:** Excel (XLSX), CSV, PDF
- **Update Frequency:** Annual/Quarterly
- **Status:** ✅ Active

### 3. **CDPH (California Department of Public Health)**
- **URL:** https://www.cdph.ca.gov/Programs/CHCQ/LCP/Pages/HFCLD.aspx
- **Datasets:**
  - Healthcare Facility Directory
  - Licensing Data
  - Complaint/Incident Reports
  - Enforcement Actions
- **Format:** CSV, PDF
- **Update Frequency:** Monthly
- **Status:** ✅ Active

### 4. **California Data Portal (data.ca.gov)**
- **URL:** https://data.ca.gov/
- **API:** CKAN API + SODA
- **Healthcare Datasets:** 200+
- **Format:** Multiple (JSON, CSV, XML, PDF)
- **Update Frequency:** Varies
- **Status:** ✅ Active

---

## 💰 Financial & Regulatory Data

### 5. **Office of Statewide Health Planning and Development (OSHPD)**
- **URL:** https://oshpd.ca.gov/data-and-reports/
- **Datasets:**
  - Hospital Annual Financial Data
  - Patient Discharge Data (restricted)
  - Emergency Department Data
  - Ambulatory Surgery Data
- **Format:** CSV, Excel
- **Update Frequency:** Annual
- **Status:** ✅ Active (now part of HCAI)

### 6. **California Department of Social Services (CDSS)**
- **URL:** https://www.cdss.ca.gov/inforesources/research-and-data
- **Datasets:**
  - Adult and Senior Care Facilities
  - Foster Care Licensing
  - Community Care Licensing Division Data
- **Format:** CSV, PDF
- **Update Frequency:** Quarterly
- **Status:** ✅ Active

### 7. **Medical Board of California**
- **URL:** https://www.mbc.ca.gov/
- **Datasets:**
  - Physician Licenses
  - Disciplinary Actions
  - Complaint Data
- **Format:** Searchable database, PDF reports
- **Update Frequency:** Real-time
- **Status:** ✅ Active

---

## 🔬 Inspection & Compliance Data

### 8. **CDPH Healthcare-Associated Infections Program**
- **URL:** https://www.cdph.ca.gov/Programs/CHCQ/HAI/Pages/ProgramHome.aspx
- **Datasets:**
  - Hospital-Acquired Infection Rates
  - Compliance Reports
  - Quality Metrics
- **Format:** CSV, PDF
- **Update Frequency:** Quarterly
- **Status:** ✅ Active

### 9. **CMS (Federal - California subset)**
- **URL:** https://data.cms.gov/
- **Datasets:**
  - Hospital Compare Data
  - Nursing Home Compare
  - Home Health Compare
  - Medicare Cost Reports
- **Format:** JSON, CSV via API
- **Update Frequency:** Quarterly/Annual
- **Status:** ✅ Active

---

## 📊 Open Data APIs

### CHHS SODA API
```
Base URL: https://data.chhs.ca.gov/api/
Documentation: https://dev.socrata.com/
```

**Key Endpoints:**
- `/resource/[dataset-id].json` - Get dataset as JSON
- `/resource/[dataset-id].csv` - Get dataset as CSV
- Supports: Filtering, sorting, pagination, aggregation

**Example:**
```bash
curl "https://data.chhs.ca.gov/resource/gx58-3k4k.json?$limit=5"
```

### Data.ca.gov CKAN API
```
Base URL: https://data.ca.gov/api/3/action/
Documentation: https://docs.ckan.org/en/latest/api/
```

**Key Endpoints:**
- `package_list` - List all datasets
- `package_show?id=[dataset]` - Get dataset metadata
- `datastore_search?resource_id=[id]` - Query datastore

---

## 🎯 Priority Datasets for Ingestion

### Phase 1 (Current)
- [x] Healthcare Facility Locations (all.min.json)
- [x] HCAI Hospice/Home Health Financial Data (hcai_hhah_util_2024.csv)
- [x] Duplicate detection (addresses, phones, owners)

### Phase 2 (Next)
- [ ] Hospital Financial Data (OSHPD)
- [ ] Skilled Nursing Facility Data
- [ ] Community Care Licensing (CDSS)
- [ ] Physician Licensing (Medical Board)

### Phase 3 (Future)
- [ ] Inspection Reports
- [ ] Complaint/Enforcement Data
- [ ] Medicare Cost Reports
- [ ] Quality Metrics
- [ ] Hospital-Acquired Infection Data

---

## 🔄 Data Update Schedule

| Dataset | Source | Frequency | Last Updated | Next Check |
|---------|--------|-----------|--------------|------------|
| Facility Locations | CDPH | Monthly | 2026-01-25 | 2026-02-25 |
| Financial Data | HCAI | Annual | 2024-12-31 | 2025-12-31 |
| Licensing Status | CDPH | Daily | Real-time | Continuous |
| Medicare Data | CMS | Quarterly | 2024-Q4 | 2025-Q1 |

---

## 🛠️ Ingestion Pipeline Status

### Implemented
- ✅ CSV file parsing
- ✅ JSON file parsing
- ✅ SQLite database storage
- ✅ Duplicate detection
- ✅ Financial data matching

### In Progress
- 🔄 Automated data source tracking (this document)
- 🔄 Database table for data source URLs
- 🔄 Scheduled update checks

### Planned
- ⏳ SODA API integration
- ⏳ CKAN API integration
- ⏳ Automated daily/weekly/monthly crawlers
- ⏳ Change detection (diff tracking)
- ⏳ Alert system for new data
- ⏳ Data validation and quality checks

---

## 📝 Notes

- Many datasets require manual download (no direct API)
- Some data is behind authentication/registration
- PDF files need OCR/parsing
- Excel files need conversion to CSV
- Update frequencies vary widely
- Some data is restricted (patient-level data)

---

## 🔗 Useful Links

- [CHHS Open Data Handbook](https://data.chhs.ca.gov/pages/resources/)
- [Socrata Open Data API](https://dev.socrata.com/)
- [California Open Data Portal](https://data.ca.gov/)
- [HCAI Data Downloads](https://hcai.ca.gov/data-and-reports/)
- [CDPH Licensing Data](https://www.cdph.ca.gov/Programs/CHCQ/LCP/Pages/HFCLD.aspx)
