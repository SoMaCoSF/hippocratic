#!/usr/bin/env python3
"""
Populate the SQLite database with facilities and financial data.
"""

import sqlite3
import json
import csv
import os

def create_tables(conn):
    """Create the database schema."""
    cursor = conn.cursor()
    
    # Create facilities table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS facilities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        license_number TEXT,
        category_code TEXT,
        category_name TEXT,
        address TEXT,
        city TEXT,
        county TEXT,
        zip TEXT,
        phone TEXT,
        lat REAL,
        lng REAL,
        in_service INTEGER,
        business_name TEXT,
        owner_name TEXT,
        admin_name TEXT,
        capacity INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create financials table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS financials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        facility_id TEXT,
        oshpd_id TEXT,
        facility_name TEXT,
        license_number TEXT,
        year INTEGER,
        total_revenue REAL,
        total_expenses REAL,
        net_income REAL,
        total_visits INTEGER,
        total_patients INTEGER,
        revenue_per_visit REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (facility_id) REFERENCES facilities(id)
    )
    ''')
    
    # Create indexes
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_facilities_license ON facilities(license_number)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_financials_license ON financials(license_number)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_financials_facility ON financials(facility_id)')
    
    conn.commit()
    print('[OK] Database schema created')

def load_facilities(conn):
    """Load facilities from JSON file."""
    cursor = conn.cursor()
    
    json_path = 'web/public/data/state/CA/all.min.json'
    if not os.path.exists(json_path):
        print(f'⚠ File not found: {json_path}')
        return 0
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    records = data.get('records', [])
    inserted = 0
    
    for rec in records:
        try:
            cursor.execute('''
                INSERT OR REPLACE INTO facilities (
                    id, name, license_number, category_code, category_name,
                    address, city, county, zip, phone, lat, lng, in_service,
                    business_name, owner_name, admin_name, capacity
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                rec.get('id'),
                rec.get('name'),
                rec.get('licenseNumber'),
                rec.get('categoryCode'),
                rec.get('categoryName'),
                rec.get('address'),
                rec.get('city'),
                rec.get('county'),
                rec.get('zip'),
                rec.get('phone'),
                rec.get('lat'),
                rec.get('lng'),
                1 if rec.get('inService') else 0,
                rec.get('businessName'),
                rec.get('ownerName'),
                rec.get('adminName'),
                rec.get('capacity'),
            ))
            inserted += 1
        except Exception as e:
            print(f'Error inserting facility {rec.get("id")}: {e}')
    
    conn.commit()
    print(f'[OK] Loaded {inserted} facilities')
    return inserted

def load_financials(conn):
    """Load financial data from CSV file."""
    cursor = conn.cursor()
    
    csv_path = 'web/public/data/enrichment/state/CA/hcai_hhah_util_2024.csv'
    if not os.path.exists(csv_path):
        print(f'⚠ File not found: {csv_path}')
        return 0
    
    inserted = 0
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            try:
                license_num = row.get('LICENSE_NO', '').strip()
                if not license_num:
                    continue
                
                # Parse financial values
                total_revenue = 0
                net_income = 0
                total_visits = 0
                
                # Try to extract revenue from hospice columns
                hospice_rev = row.get('HOSPICE_TOT_OPER_REVENUE', '0')
                if hospice_rev and hospice_rev.strip():
                    try:
                        total_revenue = float(hospice_rev.replace(',', '').replace('$', ''))
                    except:
                        pass
                
                # Net income
                hospice_net = row.get('HOSPICE_NET_INCOME', '0')
                if hospice_net and hospice_net.strip():
                    try:
                        net_income = float(hospice_net.replace(',', '').replace('$', ''))
                    except:
                        pass
                
                # Visits
                medicaid_visits = row.get('HHAH_MEDI_CAL_VISITS', '0')
                medicare_visits = row.get('HHAH_MEDICARE_VISITS', '0')
                try:
                    total_visits = int(float(medicaid_visits or 0)) + int(float(medicare_visits or 0))
                except:
                    pass
                
                # Only insert if we have some financial data
                if total_revenue > 0 or net_income != 0 or total_visits > 0:
                    cursor.execute('''
                        INSERT INTO financials (
                            oshpd_id, facility_name, license_number, year,
                            total_revenue, total_expenses, net_income, total_visits
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        row.get('FAC_NO', ''),
                        row.get('FAC_NAME', ''),
                        license_num,
                        2024,
                        total_revenue,
                        total_revenue - net_income,  # expenses = revenue - net_income
                        net_income,
                        total_visits,
                    ))
                    inserted += 1
            except Exception as e:
                print(f'Error inserting financial data: {e}')
    
    conn.commit()
    print(f'[OK] Loaded {inserted} financial records')
    return inserted

def main():
    """Main function."""
    print('Populating database...\n')
    
    conn = sqlite3.connect('local.db')
    
    try:
        create_tables(conn)
        fac_count = load_facilities(conn)
        fin_count = load_financials(conn)
        
        print(f'\n[SUCCESS] Database populated successfully!')
        print(f'   Facilities: {fac_count}')
        print(f'   Financials: {fin_count}')
    except Exception as e:
        print(f'\n[ERROR] {e}')
    finally:
        conn.close()

if __name__ == '__main__':
    main()
