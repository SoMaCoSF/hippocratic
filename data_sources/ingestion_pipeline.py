#!/usr/bin/env python3
"""
Data Source Ingestion Pipeline
Automated system for discovering, tracking, and ingesting California .gov data sources
"""

import sqlite3
import requests
import json
import csv
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DataSourceManager:
    """Manages data source discovery, tracking, and ingestion"""
    
    def __init__(self, db_path: str = 'local.db'):
        self.db_path = db_path
        self.conn = None
        self.init_database()
    
    def init_database(self):
        """Initialize database with schema"""
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        
        # Read and execute schema
        schema_path = Path(__file__).parent / 'schema.sql'
        if schema_path.exists():
            with open(schema_path, 'r') as f:
                self.conn.executescript(f.read())
        
        # Load seed data
        seed_path = Path(__file__).parent / 'seed_data.sql'
        if seed_path.exists():
            with open(seed_path, 'r') as f:
                self.conn.executescript(f.read())
        
        self.conn.commit()
        logger.info("Database initialized")
    
    def discover_chhs_datasets(self) -> List[Dict]:
        """Discover datasets from CHHS Open Data Portal"""
        logger.info("Discovering CHHS datasets...")
        
        try:
            # CHHS uses Socrata SODA API
            base_url = "https://data.chhs.ca.gov/api/3/action/package_list"
            response = requests.get(base_url, timeout=30)
            response.raise_for_status()
            
            datasets = response.json().get('result', [])
            logger.info(f"Found {len(datasets)} datasets on CHHS portal")
            
            discovered = []
            for dataset_id in datasets[:50]:  # Limit to first 50 for now
                try:
                    # Get dataset details
                    detail_url = f"https://data.chhs.ca.gov/api/3/action/package_show?id={dataset_id}"
                    detail_response = requests.get(detail_url, timeout=10)
                    detail_data = detail_response.json().get('result', {})
                    
                    # Check if healthcare-related
                    title = detail_data.get('title', '').lower()
                    description = detail_data.get('notes', '').lower()
                    
                    if any(keyword in title + description for keyword in [
                        'health', 'hospital', 'facility', 'medical', 'care',
                        'patient', 'clinic', 'nursing', 'hospice', 'license'
                    ]):
                        discovered.append({
                            'url': f"https://data.chhs.ca.gov/dataset/{dataset_id}",
                            'domain': 'data.chhs.ca.gov',
                            'title': detail_data.get('title'),
                            'description': detail_data.get('notes'),
                            'metadata': json.dumps(detail_data)
                        })
                        
                except Exception as e:
                    logger.warning(f"Error fetching dataset {dataset_id}: {e}")
                    continue
            
            logger.info(f"Discovered {len(discovered)} healthcare-related datasets")
            return discovered
            
        except Exception as e:
            logger.error(f"Error discovering CHHS datasets: {e}")
            return []
    
    def discover_data_ca_gov(self) -> List[Dict]:
        """Discover datasets from data.ca.gov"""
        logger.info("Discovering data.ca.gov datasets...")
        
        try:
            # Search for healthcare-related datasets
            search_url = "https://data.ca.gov/api/3/action/package_search"
            params = {
                'q': 'healthcare OR hospital OR medical OR facility',
                'rows': 100
            }
            
            response = requests.get(search_url, params=params, timeout=30)
            response.raise_for_status()
            
            results = response.json().get('result', {}).get('results', [])
            logger.info(f"Found {len(results)} healthcare datasets on data.ca.gov")
            
            discovered = []
            for dataset in results:
                discovered.append({
                    'url': f"https://data.ca.gov/dataset/{dataset.get('name')}",
                    'domain': 'data.ca.gov',
                    'title': dataset.get('title'),
                    'description': dataset.get('notes'),
                    'metadata': json.dumps(dataset)
                })
            
            return discovered
            
        except Exception as e:
            logger.error(f"Error discovering data.ca.gov datasets: {e}")
            return []
    
    def add_data_source(self, source: Dict) -> Optional[int]:
        """Add a new data source to the database"""
        try:
            cursor = self.conn.cursor()
            cursor.execute('''
                INSERT OR IGNORE INTO data_sources 
                (url, domain, title, description, metadata, status)
                VALUES (?, ?, ?, ?, ?, 'discovered')
            ''', (
                source.get('url'),
                source.get('domain'),
                source.get('title'),
                source.get('description'),
                source.get('metadata')
            ))
            self.conn.commit()
            
            if cursor.lastrowid:
                logger.info(f"Added data source: {source.get('title')}")
                return cursor.lastrowid
            return None
            
        except Exception as e:
            logger.error(f"Error adding data source: {e}")
            return None
    
    def check_data_source(self, source_id: int) -> Dict:
        """Check if a data source has been updated"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM data_sources WHERE id = ?', (source_id,))
        source = dict(cursor.fetchone())
        
        try:
            # Make HEAD request to check last-modified
            response = requests.head(source['url'], timeout=10, allow_redirects=True)
            
            last_modified = response.headers.get('Last-Modified')
            content_length = response.headers.get('Content-Length')
            
            # Update database
            cursor.execute('''
                UPDATE data_sources 
                SET last_checked = ?, 
                    last_modified = ?,
                    file_size = ?,
                    updated_at = ?
                WHERE id = ?
            ''', (
                datetime.now().isoformat(),
                last_modified,
                int(content_length) if content_length else None,
                datetime.now().isoformat(),
                source_id
            ))
            self.conn.commit()
            
            return {
                'status': 'success',
                'last_modified': last_modified,
                'file_size': content_length
            }
            
        except Exception as e:
            logger.error(f"Error checking source {source_id}: {e}")
            return {'status': 'error', 'error': str(e)}
    
    def list_data_sources(self, status: Optional[str] = None) -> List[Dict]:
        """List all data sources, optionally filtered by status"""
        cursor = self.conn.cursor()
        
        if status:
            cursor.execute('SELECT * FROM data_sources WHERE status = ? ORDER BY priority DESC', (status,))
        else:
            cursor.execute('SELECT * FROM data_sources ORDER BY priority DESC')
        
        return [dict(row) for row in cursor.fetchall()]
    
    def run_discovery(self):
        """Run full discovery process"""
        logger.info("Starting data source discovery...")
        
        # Discover from CHHS
        chhs_sources = self.discover_chhs_datasets()
        for source in chhs_sources:
            self.add_data_source(source)
        
        # Discover from data.ca.gov
        ca_sources = self.discover_data_ca_gov()
        for source in ca_sources:
            self.add_data_source(source)
        
        logger.info("Discovery complete")
    
    def check_all_sources(self):
        """Check all active data sources for updates"""
        sources = self.list_data_sources(status='active')
        logger.info(f"Checking {len(sources)} active data sources...")
        
        for source in sources:
            self.check_data_source(source['id'])
            time.sleep(1)  # Rate limiting
        
        logger.info("Check complete")
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()


def main():
    """Main entry point"""
    manager = DataSourceManager()
    
    try:
        # Run discovery
        manager.run_discovery()
        
        # List all sources
        sources = manager.list_data_sources()
        print(f"\n✓ Total data sources tracked: {len(sources)}")
        
        # Show top priority sources
        print("\nTop Priority Sources:")
        for source in sources[:10]:
            print(f"  [{source['priority']}] {source['title']}")
            print(f"      {source['url']}")
            print(f"      Domain: {source['domain']} | Format: {source['format']} | Status: {source['status']}")
            print()
        
    finally:
        manager.close()


if __name__ == '__main__':
    main()
