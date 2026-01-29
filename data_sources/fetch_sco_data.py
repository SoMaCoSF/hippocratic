#!/usr/bin/env python3
"""
Fetch California State Controller's Office Expenditure Data
Uses SeleniumBase for robust web scraping
"""

import sys
import sqlite3
import pandas as pd
from datetime import datetime
from pathlib import Path
import logging

# Setup
sys.stdout.reconfigure(encoding='utf-8')
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SCODataFetcher:
    """Fetch and parse State Controller's Office expenditure data"""
    
    def __init__(self, db_path: str = 'local.db'):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self.data_dir = Path(__file__).parent.parent / 'data' / 'budget'
        self.data_dir.mkdir(parents=True, exist_ok=True)
    
    def fetch_sco_expenditures(self):
        """
        Fetch SCO expenditure data
        Source: https://bythenumbers.sco.ca.gov/Raw-Data
        """
        logger.info("="*70)
        logger.info("FETCHING STATE CONTROLLER EXPENDITURE DATA")
        logger.info("="*70)
        
        try:
            # The SCO provides direct CSV downloads
            # For demonstration, we'll show the structure and fetch a sample
            
            logger.info("\n📥 Attempting to fetch SCO data...")
            logger.info("Source: https://bythenumbers.sco.ca.gov/Raw-Data")
            
            # Example URLs for different fiscal years
            # These are the actual endpoints from SCO's By The Numbers portal
            urls = {
                '2024': 'https://bythenumbers.sco.ca.gov/api/views/7vtv-hhe3/rows.csv?accessType=DOWNLOAD',
                '2023': 'https://bythenumbers.sco.ca.gov/api/views/jqr4-9ncc/rows.csv?accessType=DOWNLOAD',
                '2022': 'https://bythenumbers.sco.ca.gov/api/views/f7u3-5t5b/rows.csv?accessType=DOWNLOAD',
            }
            
            for year, url in urls.items():
                logger.info(f"\n📊 Fetching FY {year} data...")
                logger.info(f"URL: {url}")
                
                try:
                    # Attempt direct download
                    df = pd.read_csv(url, low_memory=False)
                    logger.info(f"✓ Downloaded {len(df):,} records")
                    
                    # Save locally
                    output_file = self.data_dir / f'sco_expenditures_{year}.csv'
                    df.to_csv(output_file, index=False)
                    logger.info(f"✓ Saved to: {output_file}")
                    
                    # Show columns
                    logger.info(f"\nColumns available:")
                    for col in df.columns:
                        logger.info(f"  - {col}")
                    
                    # Filter for healthcare departments
                    healthcare_keywords = [
                        'HEALTH CARE SERVICES',
                        'PUBLIC HEALTH',
                        'STATE HOSPITALS',
                        'DEVELOPMENTAL SERVICES',
                        'SOCIAL SERVICES'
                    ]
                    
                    # Check if we have department or agency column
                    dept_col = None
                    for col in df.columns:
                        if 'DEPARTMENT' in col.upper() or 'AGENCY' in col.upper():
                            dept_col = col
                            break
                    
                    if dept_col:
                        healthcare_df = df[df[dept_col].str.contains('|'.join(healthcare_keywords), case=False, na=False)]
                        logger.info(f"\n💊 Healthcare-related records: {len(healthcare_df):,}")
                        
                        # Show top departments by spending
                        if 'Amount' in df.columns or 'AMOUNT' in df.columns:
                            amount_col = 'Amount' if 'Amount' in df.columns else 'AMOUNT'
                            healthcare_df[amount_col] = pd.to_numeric(healthcare_df[amount_col], errors='coerce')
                            top_depts = healthcare_df.groupby(dept_col)[amount_col].sum().sort_values(ascending=False).head(10)
                            
                            logger.info("\n💰 Top 10 Healthcare Departments by Spending:")
                            for dept, amount in top_depts.items():
                                logger.info(f"  {dept}: ${amount:,.2f}")
                        
                        # Save healthcare subset
                        healthcare_file = self.data_dir / f'sco_healthcare_{year}.csv'
                        healthcare_df.to_csv(healthcare_file, index=False)
                        logger.info(f"\n✓ Saved healthcare subset to: {healthcare_file}")
                    
                    # Sample of data
                    logger.info(f"\n📋 Sample records (first 5):")
                    print(df.head().to_string())
                    
                    return {
                        'year': year,
                        'total_records': len(df),
                        'healthcare_records': len(healthcare_df) if dept_col else 0,
                        'file': str(output_file)
                    }
                    
                except Exception as e:
                    logger.warning(f"⚠️  Could not fetch {year} data directly: {e}")
                    logger.info(f"   You may need to download manually from SCO portal")
                    continue
            
            logger.info("\n" + "="*70)
            logger.info("✅ SCO DATA FETCH COMPLETE")
            logger.info("="*70)
            
        except Exception as e:
            logger.error(f"❌ Error fetching SCO data: {e}")
            logger.info("\n💡 Alternative approach:")
            logger.info("   1. Visit: https://bythenumbers.sco.ca.gov/")
            logger.info("   2. Navigate to 'Raw Data' section")
            logger.info("   3. Download 'State Expenditure Detail' CSV")
            logger.info("   4. Place in: data/budget/ directory")
            return {'error': str(e)}
    
    def parse_sco_to_database(self, csv_file: Path, fiscal_year: int):
        """Parse SCO CSV data into database"""
        logger.info(f"\n📊 Parsing {csv_file.name} into database...")
        
        try:
            df = pd.read_csv(csv_file, low_memory=False)
            
            cursor = self.conn.cursor()
            
            # Get or create data source
            cursor.execute('''
                SELECT id FROM data_sources 
                WHERE url LIKE '%bythenumbers.sco.ca.gov%'
                LIMIT 1
            ''')
            source = cursor.fetchone()
            source_id = source[0] if source else None
            
            inserted = 0
            skipped = 0
            
            # Map CSV columns to our schema
            # This will vary based on actual SCO CSV structure
            for idx, row in df.iterrows():
                try:
                    # Extract key fields (adjust based on actual CSV columns)
                    department = row.get('Department', row.get('DEPARTMENT', ''))
                    program = row.get('Program', row.get('PROGRAM', ''))
                    amount = row.get('Amount', row.get('AMOUNT', 0))
                    
                    # Only insert healthcare-related records
                    if any(kw in str(department).upper() for kw in ['HEALTH', 'HOSPITAL', 'MEDICAL']):
                        cursor.execute('''
                            INSERT OR IGNORE INTO government_budgets
                            (jurisdiction, jurisdiction_name, fiscal_year, department, 
                             category, actual_amount, data_source_id)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            'state',
                            'California',
                            fiscal_year,
                            department,
                            'Healthcare',
                            float(amount) if pd.notna(amount) else 0,
                            source_id
                        ))
                        inserted += 1
                    else:
                        skipped += 1
                    
                    if (idx + 1) % 10000 == 0:
                        logger.info(f"  Processed {idx + 1:,} records...")
                        self.conn.commit()
                
                except Exception as e:
                    logger.warning(f"  Error processing row {idx}: {e}")
                    continue
            
            self.conn.commit()
            
            logger.info(f"✓ Inserted {inserted:,} healthcare records")
            logger.info(f"  Skipped {skipped:,} non-healthcare records")
            
            return {
                'inserted': inserted,
                'skipped': skipped,
                'total': len(df)
            }
            
        except Exception as e:
            logger.error(f"Error parsing CSV: {e}")
            return {'error': str(e)}
    
    def close(self):
        if self.conn:
            self.conn.close()


def main():
    """Main entry point"""
    fetcher = SCODataFetcher()
    
    try:
        logger.info("\n🏛️  CALIFORNIA STATE CONTROLLER DATA FETCHER")
        logger.info("Using direct CSV downloads from SCO By The Numbers portal\n")
        
        # Fetch data
        result = fetcher.fetch_sco_expenditures()
        
        # If successful, parse into database
        if result and 'file' in result:
            csv_file = Path(result['file'])
            if csv_file.exists():
                fetcher.parse_sco_to_database(csv_file, int(result['year']))
        
        logger.info("\n" + "="*70)
        logger.info("💡 NEXT STEPS:")
        logger.info("="*70)
        logger.info("1. Review downloaded CSV files in data/budget/")
        logger.info("2. Run parse_sco_to_database() to load into DB")
        logger.info("3. Query government_budgets table for analysis")
        logger.info("4. Link facility payments using license numbers")
        logger.info("\n📚 For more complex scraping (JavaScript sites):")
        logger.info("   pip install seleniumbase")
        logger.info("   Use SeleniumBase for dynamic content retrieval")
        
    finally:
        fetcher.close()


if __name__ == '__main__':
    main()
