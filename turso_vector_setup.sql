-- Turso Vector Database Schema for Hippocratic
-- Extends existing schema with vector embeddings for semantic search

-- Enable vector extension (Turso supports this natively)
-- Note: Run with turso db shell or via libsql client

-- Vector embeddings for facilities (for semantic search)
CREATE TABLE IF NOT EXISTS facility_embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    facility_id INTEGER NOT NULL,
    embedding_model TEXT NOT NULL DEFAULT 'all-MiniLM-L6-v2',
    embedding BLOB NOT NULL,  -- F32_BLOB vector
    embedding_dim INTEGER NOT NULL DEFAULT 384,
    text_content TEXT NOT NULL,  -- Original text that was embedded
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (facility_id) REFERENCES facilities(id)
);

-- Index for faster vector search
CREATE INDEX IF NOT EXISTS idx_facility_embeddings_facility 
ON facility_embeddings(facility_id);

-- Vector embeddings for financial records
CREATE TABLE IF NOT EXISTS financial_embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    financial_id INTEGER NOT NULL,
    embedding_model TEXT NOT NULL DEFAULT 'all-MiniLM-L6-v2',
    embedding BLOB NOT NULL,
    embedding_dim INTEGER NOT NULL DEFAULT 384,
    text_content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (financial_id) REFERENCES financials(id)
);

CREATE INDEX IF NOT EXISTS idx_financial_embeddings_financial 
ON financial_embeddings(financial_id);

-- Vector embeddings for budget records (for anomaly detection)
CREATE TABLE IF NOT EXISTS budget_embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id INTEGER NOT NULL,
    embedding_model TEXT NOT NULL DEFAULT 'all-MiniLM-L6-v2',
    embedding BLOB NOT NULL,
    embedding_dim INTEGER NOT NULL DEFAULT 384,
    text_content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (budget_id) REFERENCES government_budgets(id)
);

CREATE INDEX IF NOT EXISTS idx_budget_embeddings_budget 
ON budget_embeddings(budget_id);

-- Fraud patterns (embeddings for known fraud indicators)
CREATE TABLE IF NOT EXISTS fraud_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_name TEXT NOT NULL,
    pattern_description TEXT NOT NULL,
    pattern_type TEXT NOT NULL,  -- 'financial', 'behavioral', 'network'
    severity TEXT NOT NULL,  -- 'low', 'medium', 'high', 'critical'
    embedding_model TEXT NOT NULL DEFAULT 'all-MiniLM-L6-v2',
    embedding BLOB NOT NULL,
    embedding_dim INTEGER NOT NULL DEFAULT 384,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Semantic search queries (cache common searches)
CREATE TABLE IF NOT EXISTS search_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_text TEXT NOT NULL UNIQUE,
    embedding BLOB NOT NULL,
    embedding_dim INTEGER NOT NULL DEFAULT 384,
    result_ids TEXT,  -- JSON array of result IDs
    hit_count INTEGER DEFAULT 1,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_search_cache_query 
ON search_cache(query_text);

-- Vector search metadata
CREATE TABLE IF NOT EXISTS vector_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_count INTEGER DEFAULT 0,
    last_embedding_update DATETIME,
    embedding_model TEXT NOT NULL,
    embedding_dim INTEGER NOT NULL,
    avg_embedding_time_ms REAL,
    notes TEXT
);

-- Insert initial metadata
INSERT OR IGNORE INTO vector_metadata (table_name, embedding_model, embedding_dim) VALUES
    ('facility_embeddings', 'all-MiniLM-L6-v2', 384),
    ('financial_embeddings', 'all-MiniLM-L6-v2', 384),
    ('budget_embeddings', 'all-MiniLM-L6-v2', 384);

-- Seed common fraud patterns for vector matching
INSERT OR IGNORE INTO fraud_patterns (pattern_name, pattern_description, pattern_type, severity, embedding, embedding_dim) VALUES
    ('Duplicate Billing', 'Same services billed multiple times for same patient on same day', 'financial', 'high', X'', 384),
    ('Ghost Patients', 'Billing for services to patients who do not exist or are deceased', 'financial', 'critical', X'', 384),
    ('Upcoding', 'Billing for more expensive services than actually provided', 'financial', 'high', X'', 384),
    ('Unbundling', 'Billing separately for services that should be billed together', 'financial', 'medium', X'', 384),
    ('Shell Company', 'Multiple facilities with same address, phone, or owner', 'network', 'high', X'', 384),
    ('Phantom Billing', 'Billing for services never provided', 'behavioral', 'critical', X'', 384),
    ('Kickbacks', 'Payments for patient referrals or unnecessary services', 'behavioral', 'critical', X'', 384),
    ('False Cost Reports', 'Inflated expenses to justify higher reimbursements', 'financial', 'high', X'', 384);

-- Views for easy querying

-- Facilities with embeddings
CREATE VIEW IF NOT EXISTS facilities_with_vectors AS
SELECT 
    f.*,
    fe.embedding,
    fe.embedding_dim,
    fe.text_content as embedded_text,
    fe.created_at as embedding_created_at
FROM facilities f
LEFT JOIN facility_embeddings fe ON f.id = fe.facility_id
WHERE fe.id IS NOT NULL;

-- Financial records with embeddings
CREATE VIEW IF NOT EXISTS financials_with_vectors AS
SELECT 
    f.*,
    fe.embedding,
    fe.embedding_dim,
    fe.text_content as embedded_text,
    fe.created_at as embedding_created_at
FROM financials f
LEFT JOIN financial_embeddings fe ON f.id = fe.financial_id
WHERE fe.id IS NOT NULL;

-- Statistics view
CREATE VIEW IF NOT EXISTS vector_stats AS
SELECT 
    'facilities' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT facility_id) as unique_entities,
    AVG(LENGTH(embedding)) as avg_embedding_size
FROM facility_embeddings
UNION ALL
SELECT 
    'financials',
    COUNT(*),
    COUNT(DISTINCT financial_id),
    AVG(LENGTH(embedding))
FROM financial_embeddings
UNION ALL
SELECT 
    'budgets',
    COUNT(*),
    COUNT(DISTINCT budget_id),
    AVG(LENGTH(embedding))
FROM budget_embeddings;

-- Function to calculate cosine similarity (will be implemented in Python/libsql)
-- Turso supports custom functions via libsql client

-- Comments for Turso-specific features
-- Note: To use vector search in Turso:
-- 1. Install libsql client: pip install libsql-client
-- 2. Use vector_search() function: SELECT * FROM facilities ORDER BY vector_distance(embedding, ?)
-- 3. Or use Python wrapper with sentence-transformers for embeddings

COMMIT;
