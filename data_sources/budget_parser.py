#!/usr/bin/env python3
"""
Budget Document Parser
Extracts financial data from California state and county budget documents
"""

import sqlite3
import requests
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import logging

# PDF parsing libraries (optional, install as needed)
try:
    import PyPDF2
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    logging.warning("PyPDF2 not available. PDF parsing will be limited.")

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    logging.warning("pandas not available. Excel parsing will be limited.")

# Setup
sys.stdout.reconfigure(encoding='utf-8')
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class BudgetParser:
    """Parse California state and county budget documents"""
    
    def __init__(self, db_path: str = 'local.db'):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        
        # Initialize budget schema
        self.init_budget_schema()
    
    def init_budget_schema(self):
        """Initialize budget-specific database tables"""
        schema_path = Path(__file__).parent / 'budget_schema.sql'
        if schema_path.exists():
            with open(schema_path, 'r') as f:
                self.conn.executescript(f.read())
            logger.info("Budget schema initialized")
        
        # Load budget sources
        sources_path = Path(__file__).parent / 'budget_sources.sql'
        if sources_path.exists():
            with open(sources_path, 'r') as f:
                self.conn.executescript(f.read())
            logger.info("Budget sources loaded")
        
        self.conn.commit()
    
    def parse_sco_expenditures(self, url: str = None) -> Dict:
        """
        Parse State Controller's Office expenditure data
        These are typically CSV files with government spending
        """
        logger.info("Parsing SCO expenditure data...")
        
        if not url:
            # Use the main SCO raw data export
            url = "https://bythenumbers.sco.ca.gov/Raw-Data"
        
        try:
            # For demo, we'll show structure. In production, download CSV
            stats = {
                'jurisdiction': 'state',
                'jurisdiction_name': 'California',
                'records_parsed': 0,
                'healthcare_records': 0,
                'total_amount': 0
            }
            
            # Example of what we'd parse from SCO CSV:
            # Columns: Fiscal Year, Agency, Department, Program, Amount, Description
            
            logger.info(f"Would parse expenditure data from: {url}")
            logger.info("Looking for healthcare-related departments:")
            logger.info("  - Department of Health Care Services (DHCS)")
            logger.info("  - Department of Public Health (CDPH)")
            logger.info("  - Department of State Hospitals (DSH)")
            logger.info("  - Department of Developmental Services (DDS)")
            
            return stats
            
        except Exception as e:
            logger.error(f"Error parsing SCO data: {e}")
            return {'error': str(e)}
    
    def parse_ebudget_opendata(self, fiscal_year: int = 2026) -> Dict:
        """
        Parse eBudget Open Data JSON
        Structured budget data in machine-readable format
        """
        logger.info(f"Parsing eBudget Open Data for FY {fiscal_year}...")
        
        try:
            # eBudget provides JSON endpoints
            url = f"https://ebudget.ca.gov/opendata/budget_{fiscal_year}.json"
            
            logger.info(f"Would fetch structured budget from: {url}")
            logger.info("Extracting healthcare allocations:")
            logger.info("  - Health and Human Services Agency")
            logger.info("  - Medi-Cal expenditures")
            logger.info("  - Public health programs")
            logger.info("  - Mental health services")
            
            return {
                'fiscal_year': fiscal_year,
                'status': 'demo',
                'message': 'Structure defined, ready for implementation'
            }
            
        except Exception as e:
            logger.error(f"Error parsing eBudget data: {e}")
            return {'error': str(e)}
    
    def parse_county_budget_pdf(self, county: str, pdf_path: str) -> Dict:
        """
        Parse county budget PDF document
        Extract healthcare spending tables
        """
        logger.info(f"Parsing {county} County budget PDF...")
        
        if not PDF_AVAILABLE:
            logger.warning("PyPDF2 not installed. Install with: pip install PyPDF2")
            return {'error': 'PDF parsing not available'}
        
        try:
            stats = {
                'county': county,
                'pages': 0,
                'tables_found': 0,
                'healthcare_budget': None
            }
            
            # Example of what we'd extract from county budget PDFs:
            logger.info("Looking for sections:")
            logger.info("  - Department of Health Services budget")
            logger.info("  - Public Health Division")
            logger.info("  - Behavioral/Mental Health")
            logger.info("  - Healthcare safety net programs")
            
            # Pattern matching for budget tables:
            # - Look for $ amounts in millions/billions
            # - Extract department names and allocations
            # - Find revenue sources (federal, state, local)
            
            return stats
            
        except Exception as e:
            logger.error(f"Error parsing county PDF: {e}")
            return {'error': str(e)}
    
    def extract_facility_payments(self, jurisdiction: str = 'California', fiscal_year: int = 2024):
        """
        Extract payments to specific healthcare facilities
        Links budget data to facility records
        """
        logger.info(f"Extracting facility payments for {jurisdiction} FY{fiscal_year}...")
        
        try:
            cursor = self.conn.cursor()
            
            # Example: Match DHCS provider payments to our facilities
            logger.info("Matching payments to facilities:")
            logger.info("  1. Query Medi-Cal provider payments")
            logger.info("  2. Match by license number or name")
            logger.info("  3. Insert into facility_payments table")
            
            # Example query structure:
            example_payment = {
                'facility_name': 'Example Hospital',
                'facility_license': '123456789',
                'payment_amount': 5000000.00,
                'payment_type': 'Medi-Cal',
                'fiscal_year': fiscal_year,
                'payer_jurisdiction': 'state',
                'payer_agency': 'DHCS'
            }
            
            logger.info(f"Example payment record: {example_payment}")
            
            return {
                'status': 'demo',
                'records': 0,
                'total_payments': 0
            }
            
        except Exception as e:
            logger.error(f"Error extracting payments: {e}")
            return {'error': str(e)}
    
    def generate_spending_summary(self):
        """
        Generate healthcare spending summary by jurisdiction
        Aggregates budget data for analysis
        """
        logger.info("Generating healthcare spending summary...")
        
        try:
            cursor = self.conn.cursor()
            
            # Aggregate budget data
            logger.info("Calculating summaries:")
            logger.info("  - Total healthcare budget by county")
            logger.info("  - Per capita healthcare spending")
            logger.info("  - Federal vs state vs local funding breakdown")
            logger.info("  - Year-over-year growth rates")
            
            # This would populate healthcare_spending_summary table
            
            return {
                'status': 'demo',
                'summaries_created': 0
            }
            
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return {'error': str(e)}
    
    def list_budget_sources(self):
        """List all tracked budget data sources"""
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT title, url, domain, format, priority
            FROM data_sources
            WHERE data_type = 'budget'
            ORDER BY priority DESC, domain, title
        ''')
        
        sources = cursor.fetchall()
        return [dict(row) for row in sources]
    
    def show_budget_coverage(self):
        """Show what budget data is available"""
        print("\n" + "="*70)
        print("📊 BUDGET DATA COVERAGE")
        print("="*70)
        
        cursor = self.conn.cursor()
        
        # By jurisdiction
        cursor.execute('''
            SELECT 
                CASE 
                    WHEN domain LIKE '%sco.ca.gov%' OR domain LIKE '%ebudget.ca.gov%' 
                        OR domain LIKE '%dof.ca.gov%' OR domain LIKE '%dhcs.ca.gov%'
                        OR domain LIKE '%lao.ca.gov%' OR domain LIKE '%bsa.ca.gov%'
                    THEN 'STATE'
                    ELSE 'COUNTY'
                END as jurisdiction_type,
                COUNT(*) as count
            FROM data_sources
            WHERE data_type = 'budget'
            GROUP BY jurisdiction_type
        ''')
        
        print("\nBy Jurisdiction Type:")
        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[1]} sources")
        
        # By format
        cursor.execute('''
            SELECT format, COUNT(*) as count
            FROM data_sources
            WHERE data_type = 'budget'
            GROUP BY format
            ORDER BY count DESC
        ''')
        
        print("\nBy Format:")
        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[1]} sources")
        
        # Total
        cursor.execute("SELECT COUNT(*) FROM data_sources WHERE data_type = 'budget'")
        total = cursor.fetchone()[0]
        print(f"\nTotal Budget Sources: {total}")
        print("="*70)
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()


def main():
    """Main entry point"""
    parser = BudgetParser()
    
    try:
        print("\n" + "="*70)
        print("🏛️  CALIFORNIA BUDGET DATA PARSER")
        print("="*70)
        
        # Show coverage
        parser.show_budget_coverage()
        
        # List top budget sources
        print("\n📋 Top Priority Budget Sources:\n")
        sources = parser.list_budget_sources()
        for i, source in enumerate(sources[:10], 1):
            print(f"{i}. [{source['priority']}] {source['title']}")
            print(f"   URL: {source['url']}")
            print(f"   Format: {source['format']}")
            print()
        
        # Demo parsing functions
        print("\n" + "="*70)
        print("🔍 PARSING DEMONSTRATIONS")
        print("="*70)
        
        print("\n1. State Controller's Office Expenditures:")
        parser.parse_sco_expenditures()
        
        print("\n2. eBudget Open Data:")
        parser.parse_ebudget_opendata(2026)
        
        print("\n3. Facility Payment Extraction:")
        parser.extract_facility_payments()
        
        print("\n" + "="*70)
        print("✅ BUDGET PARSER INITIALIZED")
        print("="*70)
        print("\nNext steps:")
        print("  1. Install PDF parsing: pip install PyPDF2 pdfplumber")
        print("  2. Install Excel parsing: pip install pandas openpyxl")
        print("  3. Uncomment parsing functions to run actual ingestion")
        print("  4. Set up scheduled jobs to update budget data")
        
    finally:
        parser.close()


if __name__ == '__main__':
    main()
