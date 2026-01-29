#!/usr/bin/env python3
"""
Test Ingestion Pipeline
Demonstrates full ingestion workflow for a California .gov dataset
"""

import sqlite3
import requests
import csv
import json
import sys
from datetime import datetime
from pathlib import Path
from io import StringIO

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

class TestIngestion:
    """Test ingestion for a specific CA .gov data source"""
    
    def __init__(self, db_path: str = 'local.db'):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
    
    def log_ingestion_start(self, source_id: int) -> int:
        """Log the start of an ingestion"""
        cursor = self.conn.cursor()
        cursor.execute('''
            INSERT INTO ingestion_logs (data_source_id, status)
            VALUES (?, 'running')
        ''', (source_id,))
        self.conn.commit()
        return cursor.lastrowid
    
    def log_ingestion_complete(self, log_id: int, stats: dict):
        """Log the completion of an ingestion"""
        cursor = self.conn.cursor()
        cursor.execute('''
            UPDATE ingestion_logs
            SET completed_at = ?,
                status = ?,
                records_processed = ?,
                records_inserted = ?,
                records_updated = ?,
                records_skipped = ?,
                error_message = ?,
                execution_time_ms = ?
            WHERE id = ?
        ''', (
            datetime.now().isoformat(),
            stats.get('status', 'success'),
            stats.get('processed', 0),
            stats.get('inserted', 0),
            stats.get('updated', 0),
            stats.get('skipped', 0),
            stats.get('error'),
            stats.get('execution_time_ms', 0),
            log_id
        ))
        self.conn.commit()
    
    def test_cms_hospital_data(self):
        """Test ingestion of CMS Hospital General Information dataset"""
        print("🏥 Testing CMS Hospital General Information Ingestion")
        print("=" * 70)
        
        # Get data source from database
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT * FROM data_sources 
            WHERE domain = 'data.cms.gov' 
            AND title LIKE '%Hospital General%'
            LIMIT 1
        ''')
        source = cursor.fetchone()
        
        if not source:
            print("❌ Data source not found in database")
            return
        
        source_dict = dict(source)
        print(f"✓ Found data source: {source_dict['title']}")
        print(f"  URL: {source_dict['url']}")
        print()
        
        # Start ingestion log
        log_id = self.log_ingestion_start(source_dict['id'])
        start_time = datetime.now()
        
        stats = {
            'processed': 0,
            'inserted': 0,
            'updated': 0,
            'skipped': 0,
            'status': 'success'
        }
        
        try:
            # Fetch data from CMS API
            print("📥 Fetching data from CMS API...")
            api_url = "https://data.cms.gov/provider-data/api/1/datastore/query/xubh-q36u/0"
            params = {
                'conditions': [
                    {'property': 'state', 'value': 'CA'}
                ],
                'limit': 100  # Limit for testing
            }
            
            response = requests.post(api_url, json=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            results = data.get('results', [])
            print(f"✓ Fetched {len(results)} California hospitals")
            print()
            
            # Process each hospital
            print("📊 Processing records...")
            for record in results:
                stats['processed'] += 1
                
                # Extract facility data
                facility_name = record.get('facility_name', '')
                address = record.get('address', '')
                city = record.get('city', '')
                state = record.get('state', '')
                zip_code = record.get('zip_code', '')
                phone = record.get('phone_number', '')
                hospital_type = record.get('hospital_type', '')
                ownership = record.get('hospital_ownership', '')
                
                # Check if facility already exists
                cursor.execute('''
                    SELECT id FROM facilities 
                    WHERE name = ? AND address = ?
                ''', (facility_name, address))
                
                existing = cursor.fetchone()
                
                if existing:
                    stats['skipped'] += 1
                else:
                    # Insert new facility
                    try:
                        cursor.execute('''
                            INSERT INTO facilities 
                            (name, address, city, state, zip, phone, category, license_type)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            facility_name,
                            address,
                            city,
                            state,
                            zip_code,
                            phone,
                            hospital_type or 'Hospital',
                            ownership
                        ))
                        stats['inserted'] += 1
                        
                        if stats['inserted'] % 10 == 0:
                            print(f"  ✓ Inserted {stats['inserted']} facilities...")
                            
                    except sqlite3.IntegrityError:
                        stats['skipped'] += 1
            
            self.conn.commit()
            
            # Calculate execution time
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds() * 1000
            stats['execution_time_ms'] = int(execution_time)
            
            # Update data source
            cursor.execute('''
                UPDATE data_sources
                SET last_ingested = ?,
                    record_count = ?,
                    status = 'active',
                    updated_at = ?
                WHERE id = ?
            ''', (
                datetime.now().isoformat(),
                stats['inserted'],
                datetime.now().isoformat(),
                source_dict['id']
            ))
            self.conn.commit()
            
            print()
            print("✅ Ingestion Complete!")
            print(f"  Processed: {stats['processed']}")
            print(f"  Inserted: {stats['inserted']}")
            print(f"  Skipped: {stats['skipped']}")
            print(f"  Execution Time: {stats['execution_time_ms']}ms")
            
        except Exception as e:
            stats['status'] = 'error'
            stats['error'] = str(e)
            print(f"❌ Error: {e}")
        
        finally:
            # Log completion
            self.log_ingestion_complete(log_id, stats)
    
    def test_data_ca_gov_search(self):
        """Test searching data.ca.gov for healthcare datasets"""
        print("\n🔍 Testing data.ca.gov Dataset Discovery")
        print("=" * 70)
        
        try:
            search_url = "https://data.ca.gov/api/3/action/package_search"
            params = {
                'q': 'healthcare facility license',
                'rows': 10
            }
            
            print("📥 Searching for healthcare datasets...")
            response = requests.get(search_url, params=params, timeout=30)
            response.raise_for_status()
            
            results = response.json().get('result', {}).get('results', [])
            print(f"✓ Found {len(results)} datasets")
            print()
            
            for i, dataset in enumerate(results, 1):
                print(f"{i}. {dataset.get('title')}")
                print(f"   URL: https://data.ca.gov/dataset/{dataset.get('name')}")
                print(f"   Organization: {dataset.get('organization', {}).get('title', 'N/A')}")
                
                # Check if we have resources (downloadable files)
                resources = dataset.get('resources', [])
                if resources:
                    print(f"   Resources: {len(resources)} files")
                    for res in resources[:2]:  # Show first 2
                        print(f"     - {res.get('name')} ({res.get('format')})")
                print()
            
        except Exception as e:
            print(f"❌ Error: {e}")
    
    def show_tracked_sources(self):
        """Show all tracked data sources"""
        print("\n📊 Currently Tracked Data Sources")
        print("=" * 70)
        
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT domain, COUNT(*) as count, 
                   SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
            FROM data_sources
            GROUP BY domain
            ORDER BY count DESC
        ''')
        
        print(f"{'Domain':<25} {'Total':<10} {'Active':<10}")
        print("-" * 45)
        
        for row in cursor.fetchall():
            print(f"{row[0]:<25} {row[1]:<10} {row[2]:<10}")
        
        cursor.execute('SELECT COUNT(*) FROM data_sources')
        total = cursor.fetchone()[0]
        
        print("-" * 45)
        print(f"{'TOTAL':<25} {total:<10}")
        print()
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()


def main():
    """Main entry point"""
    tester = TestIngestion()
    
    try:
        # Show tracked sources
        tester.show_tracked_sources()
        
        # Test data.ca.gov search
        tester.test_data_ca_gov_search()
        
        # Test CMS ingestion
        # tester.test_cms_hospital_data()  # Uncomment to run actual ingestion
        
        print("\n" + "=" * 70)
        print("✅ Test Complete!")
        print("=" * 70)
        print("\nTo run actual ingestion, uncomment the test_cms_hospital_data() call")
        print("in the main() function.")
        
    finally:
        tester.close()


if __name__ == '__main__':
    main()
