# California Government Healthcare Data Sources Research

## 🔍 **Deep Research: CDPH & CA.gov Medical Facilities & Financial Data**

*Compiled: January 28, 2026*
*Purpose: Identify all available California government datasets for healthcare fraud detection*

---

## 📋 **Executive Summary**

California maintains extensive healthcare facility and financial data across multiple state agencies. This research identifies key data sources, APIs, formats, and access methods for integration into the Hippocratic fraud detection platform.

---

## 🏛️ **Primary Data Sources**

### 1. **CDPH - California Department of Public Health**

**Website:** `cdph.ca.gov`

**Key Datasets:**

#### A. **Healthcare Facility Licensing**
- **URL:** `https://www.cdph.ca.gov/Programs/CHCQ/LCP/Pages/default.aspx`
- **Data:** Licensed healthcare facilities (hospitals, clinics, surgical centers)
- **Format:** PDF lists, CSV exports
- **Update Frequency:** Monthly
- **Fields:**
  - Facility name, address, county
  - License number, type
  - Capacity (beds)
  - Administrator contact
  - License status and dates

#### B. **Healthcare-Associated Infections (HAI) Data**
- **URL:** `https://www.cdph.ca.gov/Programs/CHCQ/HAI/Pages/default.aspx`
- **Data:** Infection rates by facility
- **Format:** Excel, CSV
- **Update Frequency:** Quarterly

#### C. **Skilled Nursing Facilities**
- **URL:** `https://www.cdph.ca.gov/Programs/CHCQ/LCP/CDPH Document Library/LNC-AFL-SNF-List.pdf`
- **Data:** All licensed SNFs in California
- **Format:** PDF, requires parsing
- **Fields:** Facility name, city, county, beds, administrator

---

### 2. **HCAI - Healthcare Access and Information**

**Website:** `hcai.ca.gov` (formerly OSHPD)

**Key Datasets:**

#### A. **Hospital Financial Data**
- **URL:** `https://hcai.ca.gov/data-and-reports/cost-transparency/hospital-chargemasters/`
- **Data:** Hospital financial disclosures, chargemasters
- **Format:** CSV, Excel
- **Update Frequency:** Annual
- **Fields:**
  - Hospital ID (OSHPD ID)
  - Total operating revenue
  - Total operating expenses
  - Net patient revenue
  - Bad debt, charity care
  - Patient days, discharges

#### B. **Home Health Agency & Hospice Utilization**
- **URL:** `https://hcai.ca.gov/data-and-reports/healthcare-utilization/`
- **Filename:** `hcai_hhah_util_2024.csv` (already in project!)
- **Data:** Revenue, expenses, visits for HHA/hospice
- **Format:** CSV
- **Update Frequency:** Annual
- **Fields:**
  - OSHPD ID, License number
  - Total operating revenue
  - Total operating expenses
  - Net from operations
  - Total patient revenue
  - Number of visits

#### C. **Ambulatory Surgery Center Data**
- **URL:** `https://hcai.ca.gov/data-and-reports/healthcare-utilization/ambulatory-surgery/`
- **Data:** ASC utilization and financial data
- **Format:** CSV, Excel
- **Update Frequency:** Annual

#### D. **Long-Term Care Facilities**
- **URL:** `https://hcai.ca.gov/data-and-reports/healthcare-facility-data/long-term-care/`
- **Data:** Skilled nursing facilities, capacity, utilization
- **Format:** CSV
- **Update Frequency:** Annual

---

### 3. **CDSS - California Department of Social Services**

**Website:** `cdss.ca.gov`

**Key Datasets:**

#### A. **Community Care Licensing**
- **URL:** `https://www.ccld.dss.ca.gov/carefacilitysearch/`
- **Interactive Database:** Searchable by facility type, location
- **Facility Types:**
  - Adult residential facilities
  - Residential care for elderly
  - Foster family agencies
  - Group homes
  - Day care

**API/Bulk Access:**
- **CHHS Open Data Portal:** `data.chhs.ca.gov`
- **Dataset:** "Community Care Facilities"
- **Format:** JSON, CSV via SODA API
- **API Endpoint:** `https://data.chhs.ca.gov/resource/[dataset-id].json`

**Fields:**
- Facility number
- Name, address, city, zip, county
- Facility type, capacity
- License issue date, expiration date
- Administrator name
- Phone number

---

### 4. **CHHS - California Health & Human Services Open Data Portal**

**Website:** `data.chhs.ca.gov`

**API:** Socrata SODA API

**Key Datasets:**

#### A. **Healthcare Facility Locations**
- **Dataset ID:** Search "healthcare facility" on portal
- **Format:** JSON, CSV, XML
- **API Access:** Yes (SODA API)
- **Example:**
  ```
  https://data.chhs.ca.gov/resource/[dataset-id].json?$limit=5000
  ```

#### B. **Medical Fraud Enforcement**
- **Dataset:** Medi-Cal program integrity data (if available)
- **Format:** CSV, PDF reports
- **Access:** May require public records request

---

### 5. **CA.gov Open Data Portal**

**Website:** `data.ca.gov`

**Platform:** Socrata-powered open data portal

**Key Datasets:**

#### A. **State Licensing & Regulatory Data**
- **Search:** "healthcare", "medical", "facility"
- **Format:** JSON, CSV, XML
- **API:** SODA API enabled

#### B. **Budget & Financial Data**
- **URL:** `data.ca.gov`
- **Search:** "health budget", "healthcare spending"
- **Format:** CSV, Excel

---

### 6. **CMS - Centers for Medicare & Medicaid Services**

*Federal data relevant to California*

**Website:** `data.cms.gov`

**Key Datasets:**

#### A. **Medicare Cost Reports**
- **URL:** `https://www.cms.gov/data-research/statistics-trends-and-reports/cost-reports`
- **Data:** Detailed financial data for Medicare-certified facilities
- **Format:** CSV (large files, 100MB+)
- **Fields:**
  - Provider number
  - Facility name, address
  - Total costs, total charges
  - Medicare utilization
  - Bad debt, charity care

#### B. **Care Compare**
- **URL:** `https://www.medicare.gov/care-compare/`
- **Data:** Quality ratings, ownership, services
- **API:** Yes (data.medicare.gov)
- **Format:** JSON, CSV

#### C. **Provider of Services Files**
- **URL:** `https://data.cms.gov/provider-characteristics`
- **Data:** All Medicare-certified facilities
- **Format:** CSV
- **Update Frequency:** Monthly

---

## 🔌 **API Access & Integration**

### CHHS SODA API

**Base URL:** `https://data.chhs.ca.gov/resource/`

**Authentication:** Optional (app token recommended)

**Example Request:**
```bash
curl "https://data.chhs.ca.gov/resource/[dataset-id].json?$limit=1000&$offset=0"
```

**Query Parameters:**
- `$limit` - Number of records
- `$offset` - Pagination offset
- `$where` - SQL-like filtering
- `$select` - Column selection
- `$order` - Sorting

**Response Format:** JSON

---

## 📊 **Data Integration Strategy**

### Phase 1: Core Facility Data
1. **CDSS Community Care Licensing** (CHHS API)
   - Pull all facility records
   - Daily sync for updates
   - Store in `facilities` table

2. **HCAI Financial Data** (CSV downloads)
   - Annual bulk import
   - Match by OSHPD ID / License Number
   - Store in `financials` table

### Phase 2: Validation & Enrichment
3. **CDPH Licensing Status**
   - Verify facility licenses
   - Flag expired/suspended licenses

4. **CMS Medicare Data**
   - Cross-reference with federal data
   - Identify discrepancies

### Phase 3: Real-Time Monitoring
5. **Set up automated scrapers**
   - Check for new licenses
   - Monitor facility status changes
   - Alert on license revocations

---

## 🛠️ **Recommended Implementation**

### 1. Create Data Ingestion Scripts

```python
# hippocratic/scripts/fetch_chhs_data.py

import requests

CHHS_API_BASE = "https://data.chhs.ca.gov/resource/"
DATASET_IDS = {
    "community_care": "your-dataset-id.json",
    "healthcare_facilities": "another-dataset-id.json"
}

def fetch_chhs_dataset(dataset_name, limit=5000, offset=0):
    url = f"{CHHS_API_BASE}{DATASET_IDS[dataset_name]}"
    params = {
        "$limit": limit,
        "$offset": offset,
        "$order": ":id"
    }
    response = requests.get(url, params=params)
    return response.json()

def sync_facilities():
    offset = 0
    while True:
        facilities = fetch_chhs_dataset("community_care", offset=offset)
        if not facilities:
            break
        
        # Insert into database
        for facility in facilities:
            insert_facility(facility)
        
        offset += 5000
```

### 2. Schedule Regular Updates

```bash
# crontab entry
0 2 * * * cd /path/to/hippocratic && python scripts/fetch_chhs_data.py
```

### 3. Create API Endpoints

```typescript
// hippocratic/web/src/app/api/sync/chhs/route.ts

export async function POST() {
  // Trigger CHHS data sync
  await syncCHHSData();
  return NextResponse.json({ status: "synced" });
}
```

---

## 📈 **Data Quality & Coverage**

### Current Coverage (in database):
- ✅ CDSS Community Care Facilities: **15,743** facilities
- ✅ HCAI Home Health/Hospice: **5,102** financial records
- ⚠️ Duplicate detection: **2,945** groups identified

### Missing Data Sources:
- ❌ Real-time CDPH licensing status
- ❌ Hospital financial disclosures (HCAI)
- ❌ Ambulatory surgery center data
- ❌ CMS Medicare cost reports
- ❌ Medi-Cal claims data (restricted)

---

## 🔐 **Data Access Restrictions**

### Public Data (No Auth Required):
- CHHS open data portal
- HCAI annual reports
- CMS public files
- CDSS facility search

### Restricted Data (Auth Required):
- Individual patient records (HIPAA)
- Real-time claims data (Medi-Cal)
- Investigation files (confidential)
- Provider complaint details

### How to Request Access:
1. **Public Records Act Request**
   - Submit to CDPH/HCAI
   - Specify data elements needed
   - Expect 10-30 day response

2. **Data Use Agreement**
   - For research purposes
   - Requires IRB approval
   - Sign data sharing agreement

---

## 📝 **Next Steps**

### Immediate Actions:
1. ☐ Register for CHHS API app token
2. ☐ Download latest HCAI hospital financial data
3. ☐ Create automated sync script for CHHS facilities
4. ☐ Set up CMS data pipeline
5. ☐ Document all data source schemas

### Medium-Term:
6. ☐ Build facility matching/deduplication algorithm
7. ☐ Create dashboard for data coverage metrics
8. ☐ Set up alerts for facility status changes
9. ☐ Integrate Medicare quality ratings

### Long-Term:
10. ☐ Request Medi-Cal claims data access
11. ☐ Partner with state auditors for enforcement data
12. ☐ Build predictive fraud detection models
13. ☐ Create API for external fraud investigators

---

## 🔗 **Key URLs**

### California State:
- CDPH: https://cdph.ca.gov
- HCAI: https://hcai.ca.gov
- CDSS: https://cdss.ca.gov
- CHHS Open Data: https://data.chhs.ca.gov
- CA Open Data: https://data.ca.gov

### Federal:
- CMS Data: https://data.cms.gov
- Care Compare: https://medicare.gov/care-compare
- NPI Registry: https://npiregistry.cms.hhs.gov

---

## 📞 **Contacts**

### Data Access Support:
- **CHHS Open Data:** opendata@chhs.ca.gov
- **HCAI Data:** HCAIData@hcai.ca.gov
- **CDSS Licensing:** ccld@dss.ca.gov
- **CMS Open Data:** CMS-Data-Help@cms.hhs.gov

---

## 📚 **Additional Resources**

- California Public Records Act Guide
- SODA API Documentation: https://dev.socrata.com
- HCAI Data Portal User Guide
- CMS Data Use Agreement Templates

---

**Last Updated:** January 28, 2026
**Researcher:** Hippocratic AI Assistant
**Status:** Comprehensive research complete, ready for implementation
