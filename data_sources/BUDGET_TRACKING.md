# 🏛️ California Budget & Financial Data Tracking System

## Overview

Extended system to track and parse California state and county budgets, with focus on healthcare spending and payments to facilities. This enables following the money from government budgets to healthcare providers.

---

## 📊 New Database Tables

### `government_budgets`
Master table for tracking budget allocations and expenditures
- **Jurisdiction**: State, county, or city level
- **Fiscal Year**: Annual budget cycles
- **Department/Category**: Healthcare, mental health, public health
- **Amounts**: Budgeted vs actual spending
- **Recipients**: Facilities or programs receiving funds

### `budget_line_items`
Detailed line items from budget documents
- Links to parent budget record
- Account codes and descriptions
- Individual amounts and types (revenue/expenditure/transfer)

### `facility_payments`
Government payments to specific healthcare facilities
- Links to facility records
- **Payment details**: Date, amount, type (Medi-Cal, Medicare, grants)
- **Source tracking**: State, federal, or county funding
- **Enables**: Money flow analysis from budget to facility

### `budget_documents`
Tracks the actual budget PDF/Excel files
- **Document metadata**: URL, local path, format, size
- **Parsing status**: Track which documents have been processed
- **Extracted data**: Number of tables/records extracted

### `healthcare_spending_summary`
Aggregated healthcare spending by jurisdiction
- **Total budgets**: Healthcare, mental health, public health
- **Per capita spending**: Population-adjusted comparisons
- **Funding sources**: Federal, state, local breakdown

---

## 🎯 Budget Data Sources

### State-Level (10 sources)

**State Controller's Office**
- **By The Numbers**: Comprehensive state expenditure data
- **Public Pay**: State/local employee salaries including healthcare workers
- Format: CSV, updated quarterly
- Priority: 10 (Critical)

**eBudget Portal**
- **Open Data API**: Machine-readable budget data (JSON)
- **Budget Publications**: Annual enacted budgets (PDF)
- Real-time access to state budget information

**Legislative Analyst's Office (LAO)**
- Independent analysis of state budget
- Healthcare spending analysis and forecasts
- Format: PDF reports

**Department of Finance**
- Historical budget data and forecasts
- Multi-year projections
- Format: Excel spreadsheets

**Department of Health Care Services (DHCS)**
- Medi-Cal budget and expenditure data
- **Fiscal Forecasting**: Real-time fiscal monitoring
- Formats: Excel, quarterly updates
- Priority: 10 (Critical - direct healthcare spending)

### County-Level (18+ sources)

**Top 10 Counties by Population:**
1. **Los Angeles County**
   - Budget portal + Open Data portal
   - Largest county healthcare budget in CA
   
2. **San Diego County**
   - Budget documents + Open Data
   - Health & Human Services Agency budget
   
3. **Orange County**
   - OC Health Care Agency budget
   
4. **Riverside County**
   - Public health and behavioral health budgets
   
5. **San Bernardino County**
   - Department of Behavioral Health
   
6. **Santa Clara County**
   - Budget portal + Open Data
   - Major healthcare spending county
   
7. **Alameda County**
   - Healthcare Services budget
   
8. **Sacramento County**
   - Department of Health Services budget
   
9. **Contra Costa County**
   - Health Services budget
   
10. **Fresno County**
    - Public health budget

**Each county provides:**
- Annual budget documents (PDF)
- Comprehensive Annual Financial Reports (CAFRs)
- Open data portals (where available)
- Department-specific budgets

### Additional Sources (6 sources)

- **Cities/Counties Annual Reports** (State Controller)
- **State Auditor Reports** (fraud/waste audits)
- **CalPERS Employer Statistics** (pension costs)
- **Medicare Cost Reports** (federal reimbursement data)

**Total Budget Sources: 34+**

---

## 🔄 Data Flow

```
Government Budget Documents
        │
        ├─► State Budget (eBudget, SCO, DOF)
        │   ├─► DHCS Allocations
        │   ├─► Public Health Funding
        │   └─► Mental Health Programs
        │
        ├─► County Budgets (58 counties)
        │   ├─► Health Services Dept
        │   ├─► Behavioral Health
        │   └─► Public Health Division
        │
        └─► Facility Payments
            ├─► Medi-Cal Reimbursements
            ├─► Medicare Payments
            ├─► State Grants
            └─► County Contracts
                    │
                    ▼
            Match to Facilities Database
                    │
                    ├─► Link by License Number
                    ├─► Link by Facility Name
                    └─► Link by Address
                    │
                    ▼
            Fraud Detection Analysis
                    │
                    ├─► Unexplained large payments
                    ├─► Multiple funding sources
                    ├─► Budget vs actual variances
                    └─► Cross-reference with violations
```

---

## 🛠️ Budget Parser Features

### Implemented
- ✅ Database schema for budget tracking
- ✅ 34+ budget data sources seeded
- ✅ Parser framework with demo functions
- ✅ Source prioritization

### Parsing Capabilities (Ready to Implement)

**CSV Parsing** (State Controller data)
```python
parser.parse_sco_expenditures()
# Extracts: Department, Program, Amount, Description
# Filters: Healthcare-related departments
# Links: To facility records
```

**JSON Parsing** (eBudget Open Data)
```python
parser.parse_ebudget_opendata(fiscal_year=2026)
# Extracts: Agency allocations, program budgets
# Focuses: Health & Human Services
```

**PDF Parsing** (County budgets)
```python
parser.parse_county_budget_pdf('Los Angeles', 'path/to/budget.pdf')
# Extracts: Budget tables, department allocations
# Identifies: Healthcare spending sections
```

**Excel Parsing** (DHCS data)
```python
parser.parse_dhcs_fiscal_data()
# Extracts: Medi-Cal expenditures
# Links: Provider payments to facilities
```

**Facility Payment Extraction**
```python
parser.extract_facility_payments('California', 2024)
# Matches: Payments to facility records
# Creates: Money flow visualization
```

---

## 📈 Use Cases

### 1. **Track Money to Facilities**
```sql
SELECT 
    f.name,
    f.license_number,
    SUM(fp.payment_amount) as total_payments,
    COUNT(fp.id) as payment_count,
    GROUP_CONCAT(DISTINCT fp.payment_type) as payment_types
FROM facilities f
JOIN facility_payments fp ON f.id = fp.facility_id
WHERE fp.fiscal_year = 2024
GROUP BY f.id
ORDER BY total_payments DESC
LIMIT 20;
```

### 2. **County Healthcare Spending Comparison**
```sql
SELECT 
    jurisdiction_name,
    fiscal_year,
    total_healthcare_budget,
    per_capita_spending,
    (federal_funding + state_funding + local_funding) as total_funding
FROM healthcare_spending_summary
WHERE fiscal_year = 2024
ORDER BY total_healthcare_budget DESC;
```

### 3. **Identify Unusual Payment Patterns**
```sql
SELECT 
    f.name,
    f.category,
    fp.payment_amount,
    fp.payment_type,
    AVG(fp2.payment_amount) as avg_payment_for_category
FROM facility_payments fp
JOIN facilities f ON fp.facility_id = f.id
JOIN facility_payments fp2 ON fp2.payment_type = fp.payment_type
JOIN facilities f2 ON fp2.facility_id = f2.id AND f2.category = f.category
WHERE fp.fiscal_year = 2024
AND fp.payment_amount > (SELECT AVG(payment_amount) * 3 FROM facility_payments WHERE payment_type = fp.payment_type)
GROUP BY fp.id
ORDER BY fp.payment_amount DESC;
```

### 4. **Budget Variance Analysis**
```sql
SELECT 
    department,
    category,
    SUM(budgeted_amount) as budgeted,
    SUM(actual_amount) as actual,
    SUM(variance) as total_variance,
    AVG(variance_percent) as avg_variance_pct
FROM government_budgets
WHERE fiscal_year = 2024
AND jurisdiction = 'state'
GROUP BY department, category
HAVING ABS(avg_variance_pct) > 10
ORDER BY ABS(total_variance) DESC;
```

---

## 🚀 Quick Start

### 1. Initialize Budget Schema
```bash
cd hippocratic
python data_sources/budget_parser.py
```

This will:
- Create 5 new database tables
- Load 34+ budget data sources
- Show coverage statistics
- Demonstrate parsing functions

### 2. Install Parsing Libraries
```bash
pip install PyPDF2 pdfplumber pandas openpyxl
```

### 3. Download Budget Documents
```python
from data_sources.budget_parser import BudgetParser

parser = BudgetParser()

# Download state budget
parser.download_budget_document(
    url='https://ebudget.ca.gov/budget/publication/2025-26/enacted.pdf',
    jurisdiction='state',
    fiscal_year=2026
)

# Download county budget
parser.download_budget_document(
    url='https://ceo.lacounty.gov/budget/2024-25-final-budget.pdf',
    jurisdiction='county',
    jurisdiction_name='Los Angeles County',
    fiscal_year=2025
)
```

### 4. Parse and Extract Data
```python
# Parse state expenditures
parser.parse_sco_expenditures()

# Extract facility payments
parser.extract_facility_payments('California', 2024)

# Generate spending summary
parser.generate_spending_summary()
```

---

## 📊 Data Integration

### Links to Existing Data

**Facilities Table**
- Match facility_payments to facilities by license_number or name
- Enables: "Which facilities receive most government funding?"

**Financials Table**
- Compare reported revenue to government payments
- Detect: Revenue discrepancies or unreported income

**Duplicate Detection**
- Cross-reference multiple facilities receiving payments
- Find: Same owner/admin receiving payments through multiple entities

**OSINT Network**
- Visualize money flow from government to facility networks
- Show: Connections between funded facilities

---

## 🎯 Fraud Detection Opportunities

### Red Flags
1. **Excessive Payments**: Facilities receiving significantly more than peers
2. **Multiple Sources**: Same facility/owner receiving from multiple programs
3. **Budget Discrepancies**: Reported revenue doesn't match government payments
4. **Duplicate Recipients**: Same address/phone receiving multiple payments
5. **Variance Patterns**: Consistent over/under budget in specific categories

### Analysis Queries

**Find facilities with payments from 3+ sources:**
```sql
SELECT 
    f.name,
    COUNT(DISTINCT fp.payment_type) as payment_sources,
    SUM(fp.payment_amount) as total_received
FROM facilities f
JOIN facility_payments fp ON f.id = fp.facility_id
WHERE fp.fiscal_year = 2024
GROUP BY f.id
HAVING payment_sources >= 3
ORDER BY total_received DESC;
```

**Compare financial reports to government payments:**
```sql
SELECT 
    f.name,
    fin.total_revenue as reported_revenue,
    SUM(fp.payment_amount) as govt_payments,
    (fin.total_revenue - SUM(fp.payment_amount)) as other_revenue
FROM facilities f
JOIN financials fin ON f.license_number = fin.license_number
LEFT JOIN facility_payments fp ON f.id = fp.facility_id
WHERE fin.year = 2024 AND fp.fiscal_year = 2024
GROUP BY f.id
HAVING other_revenue < 0  -- Reported revenue less than govt payments
ORDER BY other_revenue ASC;
```

---

## 📝 Next Steps

### Phase 1: Core Implementation
- [ ] Implement PDF table extraction
- [ ] Implement Excel parsing for DHCS data
- [ ] Download and parse top 5 county budgets
- [ ] Extract State Controller expenditure data
- [ ] Link facility payments to facility records

### Phase 2: Automation
- [ ] Scheduled downloads of budget documents
- [ ] Automated parsing when new budgets published
- [ ] Alert system for large payment changes
- [ ] Monthly facility payment updates

### Phase 3: Analysis & Visualization
- [ ] Budget dashboard in web app
- [ ] Money flow visualization in ManimGL
- [ ] Interactive payment exploration
- [ ] County spending comparison charts
- [ ] Fraud risk scoring based on payment patterns

---

## 🔐 Data Sources by Priority

### Priority 10 (Critical - Implement First)
1. State Controller's Office - Expenditures (CSV)
2. DHCS Budget & Statistics (Excel)
3. eBudget Open Data (JSON)
4. Los Angeles County Budget (PDF)
5. Medicare Cost Reports (CSV)

### Priority 9 (High Priority)
6. DHCS Fiscal Forecasting (Excel)
7. eBudget Annual Budget (PDF)
8. Department of Finance Data (Excel)
9. Counties Annual Report (Excel)
10. San Diego County Budget (PDF)

### Priority 8 (Medium-High)
11-20. Remaining major county budgets and state reports

### Priority 6-7 (Medium)
21-34. Smaller county budgets, audit reports, pension data

---

## 💡 Example Insights

With this system, you can answer questions like:

- "How much government money went to facilities with duplicate addresses?"
- "Which county spends the most per capita on healthcare?"
- "What's the variance between budgeted and actual healthcare spending?"
- "Which facilities receive payments from both Medi-Cal and Medicare?"
- "Are there facilities with government payments but no financial reports?"
- "What percentage of county budgets go to healthcare vs other services?"

---

**System ready to track government money flow to healthcare facilities** 🏛️💰

*Last Updated: January 28, 2026*
