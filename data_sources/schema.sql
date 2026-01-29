-- ==============================================================================
-- Data Source Tracking Schema
-- Tracks all .gov data sources for automated ingestion
-- ==============================================================================

-- Table: data_sources
-- Tracks all discovered .gov data sources
CREATE TABLE IF NOT EXISTS data_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,
    domain TEXT NOT NULL,  -- e.g., 'hcai.ca.gov', 'cdph.ca.gov'
    title TEXT,
    description TEXT,
    data_type TEXT,  -- 'facilities', 'financial', 'licensing', 'inspection', etc.
    format TEXT,  -- 'CSV', 'JSON', 'XML', 'PDF', 'Excel', 'API'
    update_frequency TEXT,  -- 'daily', 'weekly', 'monthly', 'quarterly', 'annual'
    last_checked DATETIME,
    last_modified DATETIME,
    last_ingested DATETIME,
    file_size INTEGER,  -- in bytes
    record_count INTEGER,
    status TEXT DEFAULT 'discovered',  -- 'discovered', 'active', 'inactive', 'error'
    priority INTEGER DEFAULT 5,  -- 1-10, higher = more important
    notes TEXT,
    metadata JSON,  -- Additional metadata as JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table: ingestion_logs
-- Tracks every ingestion attempt
CREATE TABLE IF NOT EXISTS ingestion_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_source_id INTEGER NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    status TEXT,  -- 'running', 'success', 'error', 'partial'
    records_processed INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    error_message TEXT,
    execution_time_ms INTEGER,
    FOREIGN KEY (data_source_id) REFERENCES data_sources(id)
);

-- Table: data_source_changes
-- Tracks changes detected in data sources
CREATE TABLE IF NOT EXISTS data_source_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_source_id INTEGER NOT NULL,
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    change_type TEXT,  -- 'new_records', 'updated_records', 'deleted_records', 'schema_change'
    change_count INTEGER,
    details JSON,
    FOREIGN KEY (data_source_id) REFERENCES data_sources(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_sources_domain ON data_sources(domain);
CREATE INDEX IF NOT EXISTS idx_data_sources_status ON data_sources(status);
CREATE INDEX IF NOT EXISTS idx_data_sources_priority ON data_sources(priority);
CREATE INDEX IF NOT EXISTS idx_data_sources_last_checked ON data_sources(last_checked);
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_source ON ingestion_logs(data_source_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_status ON ingestion_logs(status);
CREATE INDEX IF NOT EXISTS idx_changes_source ON data_source_changes(data_source_id);
