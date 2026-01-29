#!/usr/bin/env python3
"""Initialize the data sources database"""

import sqlite3
import sys
from pathlib import Path

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

def init_database():
    """Initialize database with schema and seed data"""
    db_path = Path(__file__).parent.parent / 'local.db'
    schema_path = Path(__file__).parent / 'schema.sql'
    seed_path = Path(__file__).parent / 'seed_data.sql'
    
    print(f"Initializing database: {db_path}")
    
    conn = sqlite3.connect(db_path)
    
    # Load schema
    print("Loading schema...")
    with open(schema_path, 'r') as f:
        conn.executescript(f.read())
    
    # Load seed data
    print("Loading seed data...")
    with open(seed_path, 'r') as f:
        conn.executescript(f.read())
    
    conn.commit()
    
    # Verify
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM data_sources")
    count = cursor.fetchone()[0]
    
    print(f"✓ Database initialized with {count} data sources")
    
    conn.close()

if __name__ == '__main__':
    init_database()
