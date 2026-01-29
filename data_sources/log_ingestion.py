#!/usr/bin/env python3
"""
Log ingestion results to the database for dashboard tracking.
"""

import sys
import sqlite3
import os
from datetime import datetime
import argparse
import json

def log_ingestion(
    source_name: str,
    status: str,
    records_inserted: int = 0,
    records_updated: int = 0,
    records_skipped: int = 0,
    error_message: str = None,
    execution_time_ms: int = None
):
    """
    Log ingestion results to the database.
    
    Args:
        source_name: Name of the data source
        status: 'success', 'error', 'partial'
        records_inserted: Number of new records
        records_updated: Number of updated records
        records_skipped: Number of skipped records
        error_message: Error description if any
        execution_time_ms: Execution time in milliseconds
    """
    
    db_path = os.path.join(os.path.dirname(__file__), '..', 'local.db')
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get data source ID
        cursor.execute("SELECT id FROM data_sources WHERE title LIKE ?", (f'%{source_name}%',))
        result = cursor.fetchone()
        
        if not result:
            print(f"⚠️  Data source '{source_name}' not found in database")
            # Still log with NULL source_id
            source_id = None
        else:
            source_id = result[0]
        
        # Insert log
        cursor.execute("""
            INSERT INTO ingestion_logs (
                data_source_id,
                started_at,
                status,
                records_inserted,
                records_updated,
                records_skipped,
                error_message,
                execution_time_ms
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            source_id,
            datetime.utcnow().isoformat(),
            status,
            records_inserted,
            records_updated,
            records_skipped,
            error_message,
            execution_time_ms
        ))
        
        conn.commit()
        log_id = cursor.lastrowid
        
        print(f"✅ Logged ingestion #{log_id} for '{source_name}' - Status: {status}")
        
        if status == 'success':
            print(f"   📊 Inserted: {records_inserted}, Updated: {records_updated}, Skipped: {records_skipped}")
        
        if error_message:
            print(f"   ❌ Error: {error_message}")
        
        return log_id
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        return None
    finally:
        if conn:
            conn.close()


def main():
    parser = argparse.ArgumentParser(description='Log data ingestion results')
    parser.add_argument('--source', required=True, help='Data source name')
    parser.add_argument('--status', required=True, choices=['success', 'error', 'partial'])
    parser.add_argument('--inserted', type=int, default=0, help='Records inserted')
    parser.add_argument('--updated', type=int, default=0, help='Records updated')
    parser.add_argument('--skipped', type=int, default=0, help='Records skipped')
    parser.add_argument('--files', type=int, help='Number of files processed')
    parser.add_argument('--error', help='Error message')
    parser.add_argument('--time', type=int, help='Execution time in milliseconds')
    
    args = parser.parse_args()
    
    # If --files provided, use as records_inserted
    if args.files:
        args.inserted = args.files
    
    log_ingestion(
        source_name=args.source,
        status=args.status,
        records_inserted=args.inserted,
        records_updated=args.updated,
        records_skipped=args.skipped,
        error_message=args.error,
        execution_time_ms=args.time
    )


if __name__ == '__main__':
    # Reconfigure stdout for UTF-8
    sys.stdout.reconfigure(encoding='utf-8')
    main()
