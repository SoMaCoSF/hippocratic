"""
Financial Analyzer - Detect fraud patterns in healthcare data
Analyzes 45,000+ records for anomalies, outliers, and suspicious patterns
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')

import sqlite3
import statistics
from typing import Dict, List, Any, Tuple, Optional
from datetime import datetime
import json

class FinancialAnalyzer:
    """Analyze healthcare financial data for fraud detection."""
    
    def __init__(self, db_path: str = "local.db"):
        self.db_path = db_path
        self.init_analysis_tables()
    
    def init_analysis_tables(self):
        """Initialize tables for financial analysis results."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Fraud alerts table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fraud_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                facility_id INTEGER,
                facility_name TEXT,
                description TEXT,
                metrics TEXT,
                detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'new',
                investigated_by TEXT,
                notes TEXT
            )
        """)
        
        # Financial metrics table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS financial_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                facility_id INTEGER,
                metric_type TEXT NOT NULL,
                metric_value REAL,
                percentile REAL,
                z_score REAL,
                is_outlier BOOLEAN,
                calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Cluster analysis table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS facility_clusters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                facility_id INTEGER,
                cluster_id INTEGER,
                cluster_type TEXT,
                shared_attributes TEXT,
                risk_score REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        conn.close()
    
    def get_dataset_stats(self) -> Dict[str, Any]:
        """Get statistics about the dataset."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        stats = {}
        
        # Total facilities
        cursor.execute("SELECT COUNT(*) FROM facilities")
        stats['total_facilities'] = cursor.fetchone()[0]
        
        # Total financials
        cursor.execute("SELECT COUNT(*) FROM financials")
        stats['total_financials'] = cursor.fetchone()[0]
        
        # Facilities with financials
        cursor.execute("""
            SELECT COUNT(DISTINCT f.id) 
            FROM facilities f 
            JOIN financials fin ON f.license_number = fin.license_number
        """)
        stats['facilities_with_financials'] = cursor.fetchone()[0]
        
        # Total revenue
        cursor.execute("""
            SELECT SUM(total_revenue)
            FROM financials 
            WHERE total_revenue IS NOT NULL
        """)
        result = cursor.fetchone()[0]
        stats['total_revenue'] = result if result else 0
        
        # Revenue statistics
        cursor.execute("""
            SELECT 
                AVG(total_revenue),
                MIN(total_revenue),
                MAX(total_revenue)
            FROM financials 
            WHERE total_revenue IS NOT NULL 
            AND total_revenue > 0
        """)
        avg, min_rev, max_rev = cursor.fetchone()
        stats['avg_revenue'] = avg if avg else 0
        stats['min_revenue'] = min_rev if min_rev else 0
        stats['max_revenue'] = max_rev if max_rev else 0
        
        conn.close()
        return stats
    
    def detect_high_revenue_low_patients(self, threshold: float = 2.0) -> List[Dict]:
        """Find facilities with unusually high revenue per patient."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get facilities with financial data
        cursor.execute("""
            SELECT 
                f.id,
                f.name,
                f.license_number,
                f.address,
                f.city,
                fin.total_revenue as revenue,
                fin.total_visits as total_visits,
                fin.total_revenue / NULLIF(fin.total_visits, 0) as revenue_per_visit
            FROM facilities f
            JOIN financials fin ON f.license_number = fin.license_number
            WHERE fin.total_revenue IS NOT NULL
            AND fin.total_visits IS NOT NULL
            AND fin.total_revenue > 0
            AND fin.total_visits > 0
        """)
        
        records = cursor.fetchall()
        
        if not records:
            conn.close()
            return []
        
        # Calculate revenue per visit statistics
        rev_per_visits = [r['revenue_per_visit'] for r in records if r['revenue_per_visit']]
        
        if not rev_per_visits:
            conn.close()
            return []
        
        mean = statistics.mean(rev_per_visits)
        stdev = statistics.stdev(rev_per_visits) if len(rev_per_visits) > 1 else 0
        
        alerts = []
        for record in records:
            if record['revenue_per_visit']:
                z_score = (record['revenue_per_visit'] - mean) / stdev if stdev > 0 else 0
                
                if abs(z_score) > threshold:
                    alert = {
                        'facility_id': record['id'],
                        'facility_name': record['name'],
                        'license': record['license_number'],
                        'address': f"{record['address']}, {record['city']}",
                        'revenue': record['revenue'],
                        'total_visits': record['total_visits'],
                        'revenue_per_visit': record['revenue_per_visit'],
                        'z_score': z_score,
                        'severity': 'high' if abs(z_score) > 3 else 'medium'
                    }
                    alerts.append(alert)
        
        # Sort by z_score descending
        alerts.sort(key=lambda x: abs(x['z_score']), reverse=True)
        
        conn.close()
        return alerts
    
    def detect_duplicate_addresses(self) -> List[Dict]:
        """Find multiple facilities at the same address."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                address,
                city,
                COUNT(*) as facility_count,
            GROUP_CONCAT(name, ' | ') as facilities,
            GROUP_CONCAT(license_number, ', ') as licenses
            FROM facilities
            WHERE address IS NOT NULL AND address != ''
            GROUP BY LOWER(address), LOWER(city)
            HAVING COUNT(*) > 1
            ORDER BY facility_count DESC
        """)
        
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return results
    
    def detect_missing_financials(self) -> List[Dict]:
        """Find facilities without financial data."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                f.id,
                f.name,
                f.license_number,
                f.address,
                f.city,
                f.capacity
            FROM facilities f
            LEFT JOIN financials fin ON f.license_number = fin.license_number
            WHERE fin.id IS NULL
            AND f.capacity > 10
            ORDER BY f.capacity DESC
        """)
        
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return results
    
    def detect_extreme_profit_margins(self, threshold: float = 0.5) -> List[Dict]:
        """Find facilities with unusually high or low profit margins."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                f.id,
                f.name,
                f.license_number,
                fin.total_revenue as revenue,
                fin.net_income as net_income,
                fin.net_income / NULLIF(fin.total_revenue, 0) as profit_margin
            FROM facilities f
            JOIN financials fin ON f.license_number = fin.license_number
            WHERE fin.total_revenue IS NOT NULL
            AND fin.net_income IS NOT NULL
            AND fin.total_revenue > 0
        """)
        
        records = cursor.fetchall()
        
        alerts = []
        for record in records:
            if record['profit_margin'] is not None:
                # Flag if margin > 50% or < -20%
                if record['profit_margin'] > threshold or record['profit_margin'] < -0.2:
                    alerts.append({
                        'facility_id': record['id'],
                        'facility_name': record['name'],
                        'license': record['license_number'],
                        'revenue': record['revenue'],
                        'net_income': record['net_income'],
                        'profit_margin': record['profit_margin'],
                        'margin_pct': record['profit_margin'] * 100,
                        'severity': 'high' if abs(record['profit_margin']) > 0.7 else 'medium'
                    })
        
        alerts.sort(key=lambda x: abs(x['profit_margin']), reverse=True)
        
        conn.close()
        return alerts
    
    def detect_rapid_growth(self, growth_threshold: float = 2.0) -> List[Dict]:
        """Find facilities with rapid revenue growth (if multi-year data available)."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # This would need multi-year financial data
        # For now, return empty list
        # TODO: Implement when multi-year data is available
        
        conn.close()
        return []
    
    def analyze_shared_administrators(self) -> List[Dict]:
        """Find administrators managing multiple facilities."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                admin_name,
                COUNT(*) as facility_count,
                GROUP_CONCAT(name, ' | ') as facilities,
                SUM(capacity) as total_capacity
            FROM facilities
            WHERE admin_name IS NOT NULL 
            AND admin_name != ''
            AND admin_name != 'N/A'
            GROUP BY LOWER(admin_name)
            HAVING COUNT(*) > 1
            ORDER BY facility_count DESC
        """)
        
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return results
    
    def run_full_analysis(self) -> Dict[str, Any]:
        """Run all fraud detection analyses."""
        print("🔍 Starting comprehensive financial analysis...")
        
        results = {
            'dataset_stats': self.get_dataset_stats(),
            'timestamp': datetime.now().isoformat(),
            'analyses': {}
        }
        
        print("  ├─ Analyzing revenue-to-patient ratios...")
        high_rev_alerts = self.detect_high_revenue_low_patients()
        results['analyses']['high_revenue_low_patients'] = {
            'count': len(high_rev_alerts),
            'alerts': high_rev_alerts[:20]  # Top 20
        }
        
        print("  ├─ Detecting duplicate addresses...")
        dup_addresses = self.detect_duplicate_addresses()
        results['analyses']['duplicate_addresses'] = {
            'count': len(dup_addresses),
            'clusters': dup_addresses[:20]
        }
        
        print("  ├─ Finding missing financial data...")
        missing_fin = self.detect_missing_financials()
        results['analyses']['missing_financials'] = {
            'count': len(missing_fin),
            'facilities': missing_fin[:20]
        }
        
        print("  ├─ Analyzing profit margins...")
        extreme_margins = self.detect_extreme_profit_margins()
        results['analyses']['extreme_profit_margins'] = {
            'count': len(extreme_margins),
            'alerts': extreme_margins[:20]
        }
        
        print("  └─ Analyzing shared administrators...")
        shared_admins = self.analyze_shared_administrators()
        results['analyses']['shared_administrators'] = {
            'count': len(shared_admins),
            'clusters': shared_admins[:20]
        }
        
        # Save fraud alerts to database
        self.save_fraud_alerts(results)
        
        print("\n✅ Analysis complete!")
        print(f"   Total facilities analyzed: {results['dataset_stats']['total_facilities']:,}")
        print(f"   High revenue/patient alerts: {results['analyses']['high_revenue_low_patients']['count']}")
        print(f"   Duplicate address clusters: {results['analyses']['duplicate_addresses']['count']}")
        print(f"   Missing financial data: {results['analyses']['missing_financials']['count']}")
        print(f"   Extreme profit margins: {results['analyses']['extreme_profit_margins']['count']}")
        print(f"   Shared administrators: {results['analyses']['shared_administrators']['count']}")
        
        return results
    
    def save_fraud_alerts(self, analysis_results: Dict):
        """Save fraud alerts to database."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Clear old alerts
        cursor.execute("DELETE FROM fraud_alerts WHERE status = 'new'")
        
        # Save high revenue alerts
        for alert in analysis_results['analyses']['high_revenue_low_patients']['alerts']:
            cursor.execute("""
                INSERT INTO fraud_alerts (alert_type, severity, facility_id, facility_name, description, metrics)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                'high_revenue_per_patient',
                alert['severity'],
                alert['facility_id'],
                alert['facility_name'],
                f"Revenue per visit: ${alert['revenue_per_visit']:.2f} (Z-score: {alert['z_score']:.2f})",
                json.dumps({'revenue': alert['revenue'], 'total_visits': alert['total_visits'], 'z_score': alert['z_score']})
            ))
        
        # Save extreme margin alerts
        for alert in analysis_results['analyses']['extreme_profit_margins']['alerts']:
            cursor.execute("""
                INSERT INTO fraud_alerts (alert_type, severity, facility_id, facility_name, description, metrics)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                'extreme_profit_margin',
                alert['severity'],
                alert['facility_id'],
                alert['facility_name'],
                f"Profit margin: {alert['margin_pct']:.1f}% (Revenue: ${alert['revenue']:,.0f})",
                json.dumps({'revenue': alert['revenue'], 'net_income': alert['net_income'], 'margin': alert['profit_margin']})
            ))
        
        conn.commit()
        conn.close()
    
    def get_fraud_alerts(self, limit: int = 100) -> List[Dict]:
        """Get fraud alerts from database."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM fraud_alerts 
            WHERE status = 'new'
            ORDER BY severity DESC, detected_at DESC
            LIMIT ?
        """, (limit,))
        
        alerts = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return alerts
    
    def export_analysis_report(self, results: Dict, filename: str = "fraud_analysis_report.json"):
        """Export analysis results to JSON file."""
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"📄 Report exported to: {filename}")


if __name__ == "__main__":
    print("🏥 Hippocratic Financial Analyzer")
    print("=" * 50)
    
    analyzer = FinancialAnalyzer()
    
    # Run full analysis
    results = analyzer.run_full_analysis()
    
    # Export report
    analyzer.export_analysis_report(results)
    
    print("\n📊 Top Fraud Alerts:")
    alerts = analyzer.get_fraud_alerts(10)
    for i, alert in enumerate(alerts, 1):
        print(f"  {i}. [{alert['severity'].upper()}] {alert['facility_name']}")
        print(f"     {alert['description']}")
