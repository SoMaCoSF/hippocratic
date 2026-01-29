import sqlite3

conn = sqlite3.connect('local.db')
cursor = conn.cursor()

# Check what's in financials table
cursor.execute('SELECT license_number, facility_name, total_revenue, net_income FROM financials WHERE total_revenue > 0 LIMIT 10')
print('Financials with revenue:')
for row in cursor.fetchall():
    print(f'  License: {row[0]}, Name: {row[1]}, Revenue: ${row[2]:,.2f}, Net: ${row[3]:,.2f}')

# Check total count
cursor.execute('SELECT COUNT(*) FROM financials WHERE total_revenue > 0')
count = cursor.fetchone()[0]
print(f'\nTotal records with revenue: {count}')

# Check if license_number is NULL
cursor.execute('SELECT COUNT(*) FROM financials WHERE license_number IS NULL')
null_count = cursor.fetchone()[0]
print(f'Records with NULL license_number: {null_count}')

conn.close()
