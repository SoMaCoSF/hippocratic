#!/usr/bin/env python3
"""Export local SQLite database to SQL dump for Turso import."""

import sqlite3
import sys

def export_database():
    """Export the local database to a SQL dump file."""
    try:
        print("Exporting local SQLite database...")
        
        # Connect to local database
        conn = sqlite3.connect('web/local.db')
        
        # Export to SQL dump
        with open('database_dump.sql', 'w', encoding='utf-8') as f:
            for line in conn.iterdump():
                f.write(f'{line}\n')
        
        conn.close()
        
        print("[OK] Database exported to database_dump.sql")
        file_size = len(open('database_dump.sql', 'r', encoding='utf-8').read())
        print(f"[OK] File size: {file_size:,} bytes")
        print("\nNext steps:")
        print("1. Sign up at https://turso.tech/")
        print("2. Install Turso CLI")
        print("   Windows: irm https://get.turso.tech/install.ps1 | iex")
        print("   Mac/Linux: curl -sSfL https://get.tur.so/install.sh | bash")
        print("3. Login: turso auth login")
        print("4. Create database: turso db create hippocratic-prod")
        print("5. Import data: turso db shell hippocratic-prod < database_dump.sql")
        print("6. Get credentials:")
        print("   turso db show hippocratic-prod --url")
        print("   turso db tokens create hippocratic-prod")
        print("7. Add to Vercel environment variables:")
        print("   TURSO_DATABASE_URL = libsql://hippocratic-prod-xxx.turso.io")
        print("   TURSO_AUTH_TOKEN = eyJ...")
        
        return 0
    except Exception as e:
        print(f"Error: {e}")
        return 1

if __name__ == '__main__':
    sys.exit(export_database())
