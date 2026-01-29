-- ==============================================================================
-- Budget Tracking Schema Extension
-- Tracks government budget data at state, county, and facility levels
-- ==============================================================================

-- Table: government_budgets
-- Tracks annual budget allocations and expenditures
CREATE TABLE IF NOT EXISTS government_budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jurisdiction TEXT NOT NULL,  -- 'state', 'county', 'city'
    jurisdiction_name TEXT NOT NULL,  -- 'California', 'Los Angeles County', etc.
    fiscal_year INTEGER NOT NULL,
    department TEXT,  -- 'Health Services', 'Public Health', etc.
    category TEXT,  -- 'Healthcare', 'Mental Health', 'Public Health', etc.
    subcategory TEXT,  -- More specific categorization
    
    -- Budget Amounts
    budgeted_amount REAL,  -- Planned/appropriated amount
    actual_amount REAL,  -- Actual expenditure
    variance REAL,  -- Difference between budgeted and actual
    variance_percent REAL,  -- Percentage variance
    
    -- Additional Details
    fund_source TEXT,  -- 'General Fund', 'Federal', 'Special Revenue', etc.
    recipient_name TEXT,  -- Facility or provider name if applicable
    recipient_license TEXT,  -- License number if applicable
    program_name TEXT,  -- Specific program or grant
    
    -- Metadata
    data_source_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (data_source_id) REFERENCES data_sources(id)
);

-- Table: budget_line_items
-- Detailed line items from budget documents
CREATE TABLE IF NOT EXISTS budget_line_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id INTEGER NOT NULL,
    line_number TEXT,
    account_code TEXT,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    item_type TEXT,  -- 'revenue', 'expenditure', 'transfer'
    
    FOREIGN KEY (budget_id) REFERENCES government_budgets(id)
);

-- Table: facility_payments
-- Track payments from government to specific facilities
CREATE TABLE IF NOT EXISTS facility_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    facility_id INTEGER,
    facility_name TEXT,
    facility_license TEXT,
    
    -- Payment Details
    payment_date DATE,
    fiscal_year INTEGER,
    payment_amount REAL NOT NULL,
    payment_type TEXT,  -- 'Medi-Cal', 'Medicare', 'Grant', 'Contract', etc.
    program_name TEXT,
    
    -- Source
    payer_jurisdiction TEXT,  -- 'state', 'federal', 'county'
    payer_name TEXT,
    payer_agency TEXT,  -- 'DHCS', 'CMS', etc.
    
    -- Metadata
    data_source_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (facility_id) REFERENCES facilities(id),
    FOREIGN KEY (data_source_id) REFERENCES data_sources(id)
);

-- Table: budget_documents
-- Track the actual budget PDF/Excel files
CREATE TABLE IF NOT EXISTS budget_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jurisdiction TEXT NOT NULL,
    jurisdiction_name TEXT NOT NULL,
    fiscal_year INTEGER NOT NULL,
    document_type TEXT,  -- 'proposed_budget', 'enacted_budget', 'mid_year_review', 'cafr', etc.
    
    -- Document Info
    title TEXT,
    url TEXT NOT NULL,
    file_path TEXT,  -- Local path if downloaded
    file_format TEXT,  -- 'PDF', 'Excel', 'CSV'
    file_size INTEGER,  -- bytes
    page_count INTEGER,
    
    -- Processing Status
    downloaded_at DATETIME,
    parsed_at DATETIME,
    parse_status TEXT,  -- 'pending', 'success', 'partial', 'error'
    parse_error TEXT,
    extracted_tables INTEGER,  -- Number of tables extracted
    
    -- Metadata
    data_source_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (data_source_id) REFERENCES data_sources(id)
);

-- Table: healthcare_spending_summary
-- Aggregated view of healthcare spending by jurisdiction
CREATE TABLE IF NOT EXISTS healthcare_spending_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jurisdiction TEXT NOT NULL,
    jurisdiction_name TEXT NOT NULL,
    fiscal_year INTEGER NOT NULL,
    
    -- Summary Amounts
    total_healthcare_budget REAL,
    total_healthcare_spent REAL,
    mental_health_budget REAL,
    mental_health_spent REAL,
    public_health_budget REAL,
    public_health_spent REAL,
    
    -- Per Capita
    population INTEGER,
    per_capita_spending REAL,
    
    -- Sources
    federal_funding REAL,
    state_funding REAL,
    local_funding REAL,
    
    -- Metadata
    data_source_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (data_source_id) REFERENCES data_sources(id),
    UNIQUE(jurisdiction, jurisdiction_name, fiscal_year)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_govt_budgets_jurisdiction ON government_budgets(jurisdiction, jurisdiction_name, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_govt_budgets_department ON government_budgets(department);
CREATE INDEX IF NOT EXISTS idx_govt_budgets_category ON government_budgets(category);
CREATE INDEX IF NOT EXISTS idx_govt_budgets_recipient ON government_budgets(recipient_name, recipient_license);

CREATE INDEX IF NOT EXISTS idx_facility_payments_facility ON facility_payments(facility_id, facility_license);
CREATE INDEX IF NOT EXISTS idx_facility_payments_date ON facility_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_facility_payments_fiscal_year ON facility_payments(fiscal_year);

CREATE INDEX IF NOT EXISTS idx_budget_docs_jurisdiction ON budget_documents(jurisdiction, jurisdiction_name, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_budget_docs_parse_status ON budget_documents(parse_status);

CREATE INDEX IF NOT EXISTS idx_healthcare_summary_jurisdiction ON healthcare_spending_summary(jurisdiction, jurisdiction_name, fiscal_year);
