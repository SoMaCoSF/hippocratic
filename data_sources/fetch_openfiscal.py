#!/usr/bin/env python3
"""
Fetch California Open FI$Cal Data
Official state spending transparency portal with monthly CSV downloads
Source: https://open.fiscal.ca.gov/
"""

import sys
import sqlite3
import pandas as pd
import requests
from datetime import datetime
from pathlib import Path
import logging

# Setup
sys.stdout.reconfigure(encoding='utf-8')
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class OpenFiscalFetcher:
    """
    Fetch data from California's Open FI$Cal portal
    - 147 departments (184 business units)
    - 79% of state expenditures
    - Monthly updates in CSV format
    """
    
    def __init__(self, db_path: str = 'local.db'):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self.data_dir = Path(__file__).parent.parent / 'data' / 'budget' / 'openfiscal'
        self.data_dir.mkdir(parents=True, exist_ok=True)
    
    def fetch_expenditure_data(self):
        """
        Fetch expenditure data from Open FI$Cal
        Source: https://open.fiscal.ca.gov/download-expenditures.html
        """
        logger.info("="*70)
        logger.info("💰 FETCHING CALIFORNIA OPEN FI$CAL DATA")
        logger.info("="*70)
        logger.info("\nSource: https://open.fiscal.ca.gov/")
        logger.info("Coverage: 147 departments, 79% of state expenditures")
        logger.info("Format: CSV, updated monthly\n")
        
        # Open FI$Cal provides direct CSV downloads
        # These are the actual data files from the portal
        base_url = "https://open.fiscal.ca.gov/data/"
        
        datasets = {
            'monthly_expenditures': {
                'url': f'{base_url}monthly-expenditures.csv',
                'description': 'Monthly state expenditure transactions'
            },
            'departmental_expenditures': {
                'url': f'{base_url}departmental-expenditures.csv',
                'description': 'Expenditures by department'
            }
        }
        
        results = []
        
        for dataset_name, info in datasets.items():
            logger.info(f"\n📥 Fetching: {info['description']}")
            logger.info(f"URL: {info['url']}")
            
            try:
                # Attempt to download
                response = requests.get(info['url'], timeout=30)
                
                if response.status_code == 200:
                    # Save raw CSV
                    output_file = self.data_dir / f"{dataset_name}.csv"
                    output_file.write_bytes(response.content)
                    logger.info(f"✓ Downloaded to: {output_file}")
                    
                    # Parse with pandas
                    df = pd.read_csv(output_file, low_memory=False)
                    logger.info(f"✓ Loaded {len(df):,} records")
                    
                    # Show columns
                    logger.info(f"\nColumns available:")
                    for col in df.columns[:10]:  # Show first 10
                        logger.info(f"  - {col}")
                    if len(df.columns) > 10:
                        logger.info(f"  ... and {len(df.columns) - 10} more")
                    
                    # Filter for healthcare departments
                    healthcare_keywords = [
                        'HEALTH CARE SERVICES',
                        'PUBLIC HEALTH',
                        'STATE HOSPITALS',
                        'DEVELOPMENTAL SERVICES',
                        'HEALTH',
                        'MEDICAL'
                    ]
                    
                    # Find department column
                    dept_col = None
                    for col in df.columns:
                        if 'DEPARTMENT' in col.upper() or 'AGENCY' in col.upper() or 'DEPT' in col.upper():
                            dept_col = col
                            break
                    
                    if dept_col:
                        healthcare_mask = df[dept_col].astype(str).str.contains('|'.join(healthcare_keywords), case=False, na=False)
                        healthcare_df = df[healthcare_mask]
                        
                        logger.info(f"\n💊 Healthcare-related records: {len(healthcare_df):,}")
                        
                        # Calculate total spending
                        amount_col = None
                        for col in df.columns:
                            if 'AMOUNT' in col.upper() or 'EXPENDITURE' in col.upper():
                                amount_col = col
                                break
                        
                        if amount_col:
                            healthcare_df[amount_col] = pd.to_numeric(healthcare_df[amount_col], errors='coerce')
                            total_healthcare = healthcare_df[amount_col].sum()
                            logger.info(f"💰 Total Healthcare Spending: ${total_healthcare:,.2f}")
                            
                            # Top departments
                            top_depts = healthcare_df.groupby(dept_col)[amount_col].sum().sort_values(ascending=False).head(5)
                            logger.info(f"\n🏥 Top 5 Healthcare Departments:")
                            for dept, amount in top_depts.items():
                                logger.info(f"  {dept}: ${amount:,.2f}")
                        
                        # Save healthcare subset
                        healthcare_file = self.data_dir / f"{dataset_name}_healthcare.csv"
                        healthcare_df.to_csv(healthcare_file, index=False)
                        logger.info(f"\n✓ Saved healthcare subset: {healthcare_file}")
                    
                    # Sample data
                    logger.info(f"\n📋 Sample records (first 3):")
                    print(df.head(3).to_string())
                    
                    results.append({
                        'dataset': dataset_name,
                        'status': 'success',
                        'records': len(df),
                        'healthcare_records': len(healthcare_df) if dept_col else 0,
                        'file': str(output_file)
                    })
                    
                else:
                    logger.warning(f"⚠️  HTTP {response.status_code}: {info['url']}")
                    logger.info(f"   Data may have moved or requires different access method")
                    results.append({
                        'dataset': dataset_name,
                        'status': 'error',
                        'error': f'HTTP {response.status_code}'
                    })
                
            except Exception as e:
                logger.error(f"❌ Error fetching {dataset_name}: {e}")
                results.append({
                    'dataset': dataset_name,
                    'status': 'error',
                    'error': str(e)
                })
        
        return results
    
    def parse_to_database(self, csv_file: Path):
        """Parse Open FI$Cal CSV into database"""
        logger.info(f"\n📊 Parsing {csv_file.name} into database...")
        
        try:
            df = pd.read_csv(csv_file, low_memory=False)
            
            cursor = self.conn.cursor()
            
            # Get data source ID
            cursor.execute('''
                INSERT OR IGNORE INTO data_sources 
                (url, domain, title, data_type, format, priority)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                'https://open.fiscal.ca.gov/',
                'open.fiscal.ca.gov',
                'Open FI$Cal - State Expenditures',
                'budget',
                'CSV',
                10
            ))
            
            cursor.execute("SELECT id FROM data_sources WHERE domain = 'open.fiscal.ca.gov' LIMIT 1")
            source = cursor.fetchone()
            source_id = source[0] if source else None
            
            inserted = 0
            
            # Map columns (adjust based on actual CSV structure)
            for idx, row in df.iterrows():
                try:
                    # Extract fields (column names will vary)
                    department = row.get('Department', row.get('DEPARTMENT', ''))
                    amount = row.get('Amount', row.get('AMOUNT', row.get('Expenditure', 0)))
                    fiscal_year = row.get('Fiscal Year', row.get('FISCAL_YEAR', datetime.now().year))
                    
                    # Only insert healthcare records
                    if any(kw in str(department).upper() for kw in ['HEALTH', 'HOSPITAL', 'MEDICAL']):
                        cursor.execute('''
                            INSERT OR IGNORE INTO government_budgets
                            (jurisdiction, jurisdiction_name, fiscal_year, department,
                             category, actual_amount, data_source_id)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            'state',
                            'California',
                            int(fiscal_year) if pd.notna(fiscal_year) else datetime.now().year,
                            str(department),
                            'Healthcare',
                            float(amount) if pd.notna(amount) else 0,
                            source_id
                        ))
                        inserted += 1
                    
                    if (idx + 1) % 10000 == 0:
                        logger.info(f"  Processed {idx + 1:,} records...")
                        self.conn.commit()
                
                except Exception as e:
                    continue
            
            self.conn.commit()
            logger.info(f"✓ Inserted {inserted:,} healthcare budget records")
            
            return {'inserted': inserted, 'total': len(df)}
            
        except Exception as e:
            logger.error(f"Error parsing CSV: {e}")
            return {'error': str(e)}
    
    def close(self):
        if self.conn:
            self.conn.close()


def main():
    """Main entry point"""
    logger.info("\n🏛️  CALIFORNIA OPEN FI$CAL DATA FETCHER")
    logger.info("="*70)
    logger.info("Official state spending transparency portal")
    logger.info("Monthly expenditure data in CSV format")
    logger.info("="*70)
    
    fetcher = OpenFiscalFetcher()
    
    try:
        # Fetch data
        results = fetcher.fetch_expenditure_data()
        
        # Summary
        logger.info("\n" + "="*70)
        logger.info("📊 FETCH SUMMARY")
        logger.info("="*70)
        
        for result in results:
            if result['status'] == 'success':
                logger.info(f"✅ {result['dataset']}: {result['records']:,} records")
                logger.info(f"   Healthcare: {result['healthcare_records']:,} records")
                logger.info(f"   File: {result['file']}")
            else:
                logger.info(f"❌ {result['dataset']}: {result.get('error', 'Unknown error')}")
        
        # Parse to database if successful
        successful = [r for r in results if r['status'] == 'success']
        if successful:
            logger.info("\n" + "="*70)
            logger.info("💾 LOADING TO DATABASE")
            logger.info("="*70)
            
            for result in successful:
                csv_file = Path(result['file'])
                if csv_file.exists():
                    fetcher.parse_to_database(csv_file)
        
        logger.info("\n" + "="*70)
        logger.info("✅ COMPLETE!")
        logger.info("="*70)
        logger.info("\n💡 NEXT STEPS:")
        logger.info("1. Review CSV files in data/budget/openfiscal/")
        logger.info("2. Query government_budgets table for analysis")
        logger.info("3. Set up monthly automated fetching")
        logger.info("4. Link to facility_payments for fraud detection")
        
    finally:
        fetcher.close()


if __name__ == '__main__':
    main()
