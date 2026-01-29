"""
Record Deduplicator - SOC Ghost Catalog Integration
Deduplicates records across ingestion jobs and maintains ghost catalog
"""

import hashlib
import json
import sqlite3
from typing import Dict, List, Any, Optional
from datetime import datetime

class RecordDeduplicator:
    """Deduplicates records and tracks in ghost catalog."""
    
    def __init__(self, db_path: str = "local.db"):
        self.db_path = db_path
        self.init_tables()
    
    def init_tables(self):
        """Initialize deduplication and ghost catalog tables."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Record hashes for deduplication
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS record_hashes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                record_type TEXT NOT NULL,
                record_hash TEXT NOT NULL UNIQUE,
                record_id INTEGER,
                table_name TEXT,
                first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                seen_count INTEGER DEFAULT 1
            )
        """)
        
        # Job history with SOC numbering
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS job_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_number TEXT NOT NULL UNIQUE,
                scraper_name TEXT NOT NULL,
                start_time DATETIME NOT NULL,
                end_time DATETIME,
                status TEXT DEFAULT 'running',
                records_fetched INTEGER DEFAULT 0,
                records_new INTEGER DEFAULT 0,
                records_duplicate INTEGER DEFAULT 0,
                bytes_downloaded INTEGER DEFAULT 0,
                error_message TEXT,
                metadata TEXT
            )
        """)
        
        # Ghost catalog - tracks all entities ever seen
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ghost_catalog (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                entity_name TEXT,
                content_hash TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                first_job TEXT,
                last_job TEXT,
                appearances INTEGER DEFAULT 1,
                data_snapshot TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(entity_type, entity_id)
            )
        """)
        
        # Job logs
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS job_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_number TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                level TEXT NOT NULL,
                message TEXT NOT NULL,
                metadata TEXT,
                FOREIGN KEY (job_number) REFERENCES job_history(job_number)
            )
        """)
        
        conn.commit()
        conn.close()
    
    def generate_job_number(self) -> str:
        """Generate SOC-#### job number."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get last job number
        cursor.execute("SELECT MAX(CAST(SUBSTR(job_number, 5) AS INTEGER)) FROM job_history WHERE job_number LIKE 'SOC-%'")
        result = cursor.fetchone()
        
        if result and result[0]:
            next_num = result[0] + 1
        else:
            next_num = 1
        
        conn.close()
        return f"SOC-{next_num:04d}"
    
    def start_job(self, scraper_name: str, metadata: Optional[Dict] = None) -> str:
        """Start a new job and return job number."""
        job_number = self.generate_job_number()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO job_history (job_number, scraper_name, start_time, metadata)
            VALUES (?, ?, ?, ?)
        """, (
            job_number,
            scraper_name,
            datetime.now().isoformat(),
            json.dumps(metadata) if metadata else None
        ))
        
        conn.commit()
        conn.close()
        
        self.log_job(job_number, 'info', f'Started job {job_number} for scraper: {scraper_name}')
        
        return job_number
    
    def log_job(self, job_number: str, level: str, message: str, metadata: Optional[Dict] = None):
        """Add log entry for a job."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO job_logs (job_number, level, message, metadata)
            VALUES (?, ?, ?, ?)
        """, (
            job_number,
            level,
            message,
            json.dumps(metadata) if metadata else None
        ))
        
        conn.commit()
        conn.close()
    
    def compute_hash(self, record: Dict[str, Any], key_fields: List[str]) -> str:
        """Compute hash for record based on key fields."""
        # Sort key fields to ensure consistent hashing
        key_data = {k: record.get(k) for k in sorted(key_fields) if k in record}
        key_str = json.dumps(key_data, sort_keys=True)
        return hashlib.sha256(key_str.encode()).hexdigest()
    
    def is_duplicate(self, record: Dict[str, Any], record_type: str, key_fields: List[str]) -> bool:
        """Check if record is a duplicate."""
        record_hash = self.compute_hash(record, key_fields)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id FROM record_hashes 
            WHERE record_type = ? AND record_hash = ?
        """, (record_type, record_hash))
        
        result = cursor.fetchone()
        
        if result:
            # Update last seen and count
            cursor.execute("""
                UPDATE record_hashes 
                SET last_seen = ?, seen_count = seen_count + 1
                WHERE record_type = ? AND record_hash = ?
            """, (datetime.now().isoformat(), record_type, record_hash))
            conn.commit()
            conn.close()
            return True
        
        conn.close()
        return False
    
    def register_record(self, record: Dict[str, Any], record_type: str, key_fields: List[str], 
                       table_name: str, record_id: int, job_number: str):
        """Register a new record in deduplication system and ghost catalog."""
        record_hash = self.compute_hash(record, key_fields)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Add to record hashes
        cursor.execute("""
            INSERT INTO record_hashes (record_type, record_hash, record_id, table_name)
            VALUES (?, ?, ?, ?)
        """, (record_type, record_hash, record_id, table_name))
        
        # Add to ghost catalog
        entity_id = str(record.get(key_fields[0])) if key_fields else str(record_id)
        entity_name = record.get('name') or record.get('facilityName') or record.get('title')
        
        cursor.execute("""
            INSERT INTO ghost_catalog (entity_type, entity_id, entity_name, content_hash, first_job, last_job, data_snapshot)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(entity_type, entity_id) DO UPDATE SET
                content_hash = excluded.content_hash,
                last_job = excluded.last_job,
                appearances = appearances + 1,
                data_snapshot = excluded.data_snapshot,
                updated_at = CURRENT_TIMESTAMP
        """, (
            record_type,
            entity_id,
            entity_name,
            record_hash,
            job_number,
            job_number,
            json.dumps(record)
        ))
        
        conn.commit()
        conn.close()
    
    def complete_job(self, job_number: str, status: str = 'completed', 
                    records_fetched: int = 0, records_new: int = 0, 
                    records_duplicate: int = 0, bytes_downloaded: int = 0,
                    error_message: Optional[str] = None):
        """Mark job as complete with stats."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE job_history 
            SET end_time = ?, status = ?, records_fetched = ?, 
                records_new = ?, records_duplicate = ?, bytes_downloaded = ?,
                error_message = ?
            WHERE job_number = ?
        """, (
            datetime.now().isoformat(),
            status,
            records_fetched,
            records_new,
            records_duplicate,
            bytes_downloaded,
            error_message,
            job_number
        ))
        
        conn.commit()
        conn.close()
        
        self.log_job(job_number, 'info', 
                    f'Job completed: {records_new} new, {records_duplicate} duplicate records')
    
    def get_job_history(self, limit: int = 100) -> List[Dict]:
        """Get recent job history."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM job_history 
            ORDER BY start_time DESC 
            LIMIT ?
        """, (limit,))
        
        jobs = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return jobs
    
    def get_job_logs(self, job_number: str) -> List[Dict]:
        """Get logs for a specific job."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM job_logs 
            WHERE job_number = ? 
            ORDER BY timestamp ASC
        """, (job_number,))
        
        logs = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return logs
    
    def get_ghost_catalog(self, entity_type: Optional[str] = None, limit: int = 100) -> List[Dict]:
        """Get entries from ghost catalog."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        if entity_type:
            cursor.execute("""
                SELECT * FROM ghost_catalog 
                WHERE entity_type = ?
                ORDER BY updated_at DESC 
                LIMIT ?
            """, (entity_type, limit))
        else:
            cursor.execute("""
                SELECT * FROM ghost_catalog 
                ORDER BY updated_at DESC 
                LIMIT ?
            """, (limit,))
        
        entries = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return entries
    
    def get_stats(self) -> Dict:
        """Get deduplication and ghost catalog stats."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Total jobs
        cursor.execute("SELECT COUNT(*) FROM job_history")
        total_jobs = cursor.fetchone()[0]
        
        # Total records in ghost catalog
        cursor.execute("SELECT COUNT(*) FROM ghost_catalog")
        total_entities = cursor.fetchone()[0]
        
        # Total duplicates caught
        cursor.execute("SELECT SUM(records_duplicate) FROM job_history")
        total_duplicates = cursor.fetchone()[0] or 0
        
        # Active vs ghosted entities
        cursor.execute("SELECT status, COUNT(*) FROM ghost_catalog GROUP BY status")
        status_counts = {row[0]: row[1] for row in cursor.fetchall()}
        
        conn.close()
        
        return {
            'total_jobs': total_jobs,
            'total_entities': total_entities,
            'total_duplicates_prevented': total_duplicates,
            'active_entities': status_counts.get('active', 0),
            'ghosted_entities': status_counts.get('ghosted', 0)
        }


if __name__ == "__main__":
    # Test the deduplicator
    dedup = RecordDeduplicator()
    
    # Start a test job
    job_num = dedup.start_job('test_scraper', {'source': 'data.ca.gov'})
    print(f"Started job: {job_num}")
    
    # Simulate some records
    test_record = {
        'name': 'Test Facility',
        'license': 'L123456',
        'address': '123 Main St'
    }
    
    key_fields = ['license', 'name']
    
    if not dedup.is_duplicate(test_record, 'facility', key_fields):
        dedup.register_record(test_record, 'facility', key_fields, 'facilities', 1, job_num)
        print("Registered new record")
    else:
        print("Duplicate detected!")
    
    # Try again - should be duplicate
    if dedup.is_duplicate(test_record, 'facility', key_fields):
        print("Correctly identified duplicate on second try")
    
    # Complete job
    dedup.complete_job(job_num, 'completed', records_fetched=1, records_new=1, records_duplicate=1)
    
    # Show stats
    stats = dedup.get_stats()
    print(f"\nStats: {stats}")
    
    # Show job history
    history = dedup.get_job_history(10)
    print(f"\nJob History: {len(history)} jobs")
    for job in history:
        print(f"  {job['job_number']}: {job['scraper_name']} - {job['status']}")
