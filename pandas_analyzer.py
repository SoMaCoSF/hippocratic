"""
Pandas-Based Data Analysis Module
Comprehensive statistical analysis and profiling of ingested healthcare data
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')

import sqlite3
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime
import json

class PandasAnalyzer:
    """Advanced data analysis using pandas for healthcare fraud detection."""
    
    def __init__(self, db_path: str = "local.db"):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
    
    def __del__(self):
        if hasattr(self, 'conn'):
            self.conn.close()
    
    def load_facilities(self) -> pd.DataFrame:
        """Load facilities data into pandas DataFrame."""
        query = """
            SELECT 
                id, name, license_number, category_code, category_name,
                address, city, county, zip, phone,
                lat, lng, in_service, business_name, owner_name, admin_name,
                capacity, created_at
            FROM facilities
        """
        df = pd.read_sql_query(query, self.conn)
        return df
    
    def load_financials(self) -> pd.DataFrame:
        """Load financial data into pandas DataFrame."""
        query = """
            SELECT 
                id, facility_id, oshpd_id, facility_name, license_number,
                year, total_revenue, total_expenses, net_income,
                total_visits, total_patients, revenue_per_visit,
                created_at
            FROM financials
        """
        df = pd.read_sql_query(query, self.conn)
        return df
    
    def load_merged_data(self) -> pd.DataFrame:
        """Load facilities merged with financial data."""
        query = """
            SELECT 
                f.id as facility_id,
                f.name,
                f.license_number,
                f.category_name,
                f.city,
                f.county,
                f.capacity,
                fin.year,
                fin.total_revenue,
                fin.total_expenses,
                fin.net_income,
                fin.total_visits,
                fin.total_patients,
                fin.revenue_per_visit
            FROM facilities f
            LEFT JOIN financials fin ON f.license_number = fin.license_number
        """
        df = pd.read_sql_query(query, self.conn)
        return df
    
    def get_data_profile(self, table: str = "facilities") -> Dict[str, Any]:
        """Get comprehensive data profile for a table."""
        
        if table == "facilities":
            df = self.load_facilities()
        elif table == "financials":
            df = self.load_financials()
        else:
            df = self.load_merged_data()
        
        profile = {
            'table': table,
            'total_rows': len(df),
            'total_columns': len(df.columns),
            'memory_usage': f"{df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB",
            'columns': {},
            'timestamp': datetime.now().isoformat()
        }
        
        # Column-level analysis
        for col in df.columns:
            col_profile = {
                'dtype': str(df[col].dtype),
                'null_count': int(df[col].isnull().sum()),
                'null_percentage': float(df[col].isnull().sum() / len(df) * 100),
                'unique_count': int(df[col].nunique())
            }
            
            # Numeric column statistics
            if pd.api.types.is_numeric_dtype(df[col]):
                col_profile.update({
                    'mean': float(df[col].mean()) if not df[col].isnull().all() else None,
                    'median': float(df[col].median()) if not df[col].isnull().all() else None,
                    'std': float(df[col].std()) if not df[col].isnull().all() else None,
                    'min': float(df[col].min()) if not df[col].isnull().all() else None,
                    'max': float(df[col].max()) if not df[col].isnull().all() else None,
                    'q25': float(df[col].quantile(0.25)) if not df[col].isnull().all() else None,
                    'q75': float(df[col].quantile(0.75)) if not df[col].isnull().all() else None
                })
            
            # String column statistics
            elif pd.api.types.is_string_dtype(df[col]) or df[col].dtype == 'object':
                if df[col].notna().any():
                    col_profile.update({
                        'avg_length': float(df[col].str.len().mean()) if not df[col].isnull().all() else None,
                        'max_length': int(df[col].str.len().max()) if not df[col].isnull().all() else None,
                        'most_common': str(df[col].mode().iloc[0]) if len(df[col].mode()) > 0 else None
                    })
            
            profile['columns'][col] = col_profile
        
        return profile
    
    def get_county_analysis(self) -> Dict[str, Any]:
        """Analyze facilities and financials by county."""
        df = self.load_merged_data()
        
        county_stats = df.groupby('county').agg({
            'facility_id': 'count',
            'capacity': 'sum',
            'total_revenue': ['sum', 'mean', 'median'],
            'net_income': ['sum', 'mean'],
            'total_visits': 'sum'
        }).round(2)
        
        county_stats.columns = ['_'.join(col).strip('_') for col in county_stats.columns.values]
        county_stats = county_stats.reset_index()
        
        # Convert to dict
        result = {
            'counties': county_stats.to_dict('records'),
            'total_counties': len(county_stats),
            'top_revenue_county': county_stats.nlargest(1, 'total_revenue_sum').iloc[0]['county'] if len(county_stats) > 0 else None,
            'top_facilities_county': county_stats.nlargest(1, 'facility_id_count').iloc[0]['county'] if len(county_stats) > 0 else None
        }
        
        return result
    
    def get_category_analysis(self) -> Dict[str, Any]:
        """Analyze by facility category."""
        df = self.load_merged_data()
        
        category_stats = df.groupby('category_name').agg({
            'facility_id': 'count',
            'capacity': ['sum', 'mean'],
            'total_revenue': ['sum', 'mean'],
            'net_income': ['sum', 'mean'],
            'total_visits': 'sum'
        }).round(2)
        
        category_stats.columns = ['_'.join(col).strip('_') for col in category_stats.columns.values]
        category_stats = category_stats.reset_index()
        
        return {
            'categories': category_stats.to_dict('records'),
            'total_categories': len(category_stats)
        }
    
    def get_revenue_distribution(self, bins: int = 10) -> Dict[str, Any]:
        """Analyze revenue distribution across facilities."""
        df = self.load_financials()
        df = df[df['total_revenue'].notna() & (df['total_revenue'] > 0)]
        
        if len(df) == 0:
            return {'bins': [], 'counts': [], 'total': 0}
        
        # Create histogram
        hist, bin_edges = np.histogram(df['total_revenue'], bins=bins)
        
        return {
            'bins': [f"${int(bin_edges[i]):,} - ${int(bin_edges[i+1]):,}" for i in range(len(bin_edges)-1)],
            'counts': hist.tolist(),
            'total': len(df),
            'mean_revenue': float(df['total_revenue'].mean()),
            'median_revenue': float(df['total_revenue'].median()),
            'total_revenue': float(df['total_revenue'].sum())
        }
    
    def get_capacity_analysis(self) -> Dict[str, Any]:
        """Analyze facility capacity distribution."""
        df = self.load_facilities()
        df = df[df['capacity'].notna() & (df['capacity'] > 0)]
        
        if len(df) == 0:
            return {'total': 0}
        
        return {
            'total_facilities': len(df),
            'total_capacity': int(df['capacity'].sum()),
            'mean_capacity': float(df['capacity'].mean()),
            'median_capacity': float(df['capacity'].median()),
            'max_capacity': int(df['capacity'].max()),
            'min_capacity': int(df['capacity'].min()),
            'capacity_percentiles': {
                'p25': float(df['capacity'].quantile(0.25)),
                'p50': float(df['capacity'].quantile(0.50)),
                'p75': float(df['capacity'].quantile(0.75)),
                'p90': float(df['capacity'].quantile(0.90)),
                'p95': float(df['capacity'].quantile(0.95))
            }
        }
    
    def get_time_series_analysis(self) -> Dict[str, Any]:
        """Analyze financial trends over time."""
        df = self.load_financials()
        df = df[df['year'].notna()]
        
        if len(df) == 0:
            return {'years': [], 'data': {}}
        
        yearly_stats = df.groupby('year').agg({
            'total_revenue': ['sum', 'mean', 'count'],
            'total_expenses': ['sum', 'mean'],
            'net_income': ['sum', 'mean'],
            'total_visits': 'sum'
        }).round(2)
        
        yearly_stats.columns = ['_'.join(col).strip('_') for col in yearly_stats.columns.values]
        yearly_stats = yearly_stats.reset_index()
        
        return {
            'years': yearly_stats['year'].tolist(),
            'data': yearly_stats.to_dict('records')
        }
    
    def get_correlation_matrix(self) -> Dict[str, Any]:
        """Calculate correlation matrix for numeric columns."""
        df = self.load_merged_data()
        
        # Select numeric columns
        numeric_cols = ['capacity', 'total_revenue', 'total_expenses', 
                       'net_income', 'total_visits', 'total_patients', 'revenue_per_visit']
        
        df_numeric = df[numeric_cols].dropna()
        
        if len(df_numeric) == 0:
            return {'columns': [], 'matrix': []}
        
        corr_matrix = df_numeric.corr().round(3)
        
        return {
            'columns': corr_matrix.columns.tolist(),
            'matrix': corr_matrix.values.tolist()
        }
    
    def get_outlier_analysis(self, column: str = 'total_revenue', 
                            threshold: float = 3.0) -> Dict[str, Any]:
        """Identify outliers using IQR method."""
        df = self.load_merged_data()
        df = df[df[column].notna()]
        
        if len(df) == 0 or column not in df.columns:
            return {'outliers': [], 'count': 0}
        
        Q1 = df[column].quantile(0.25)
        Q3 = df[column].quantile(0.75)
        IQR = Q3 - Q1
        
        lower_bound = Q1 - threshold * IQR
        upper_bound = Q3 + threshold * IQR
        
        outliers = df[(df[column] < lower_bound) | (df[column] > upper_bound)]
        
        return {
            'column': column,
            'threshold': threshold,
            'lower_bound': float(lower_bound),
            'upper_bound': float(upper_bound),
            'outlier_count': len(outliers),
            'total_count': len(df),
            'outlier_percentage': float(len(outliers) / len(df) * 100),
            'outliers': outliers[['name', 'county', column]].head(50).to_dict('records')
        }
    
    def get_summary_statistics(self) -> Dict[str, Any]:
        """Get comprehensive summary statistics."""
        facilities_df = self.load_facilities()
        financials_df = self.load_financials()
        merged_df = self.load_merged_data()
        
        return {
            'facilities': {
                'total': len(facilities_df),
                'with_capacity': int(facilities_df['capacity'].notna().sum()),
                'total_capacity': int(facilities_df['capacity'].sum()) if facilities_df['capacity'].notna().any() else 0,
                'counties': int(facilities_df['county'].nunique()),
                'categories': int(facilities_df['category_name'].nunique())
            },
            'financials': {
                'total_records': len(financials_df),
                'unique_facilities': int(financials_df['license_number'].nunique()),
                'years': sorted(financials_df['year'].unique().tolist()) if financials_df['year'].notna().any() else [],
                'total_revenue': float(financials_df['total_revenue'].sum()) if financials_df['total_revenue'].notna().any() else 0,
                'total_expenses': float(financials_df['total_expenses'].sum()) if financials_df['total_expenses'].notna().any() else 0,
                'total_net_income': float(financials_df['net_income'].sum()) if financials_df['net_income'].notna().any() else 0
            },
            'coverage': {
                'facilities_with_financials': int(merged_df[merged_df['total_revenue'].notna()]['facility_id'].nunique()),
                'coverage_percentage': float(merged_df[merged_df['total_revenue'].notna()]['facility_id'].nunique() / len(facilities_df) * 100) if len(facilities_df) > 0 else 0
            }
        }
    
    def get_top_facilities(self, metric: str = 'total_revenue', 
                          limit: int = 20) -> Dict[str, Any]:
        """Get top facilities by specified metric."""
        df = self.load_merged_data()
        df = df[df[metric].notna()]
        
        if len(df) == 0:
            return {'facilities': [], 'metric': metric}
        
        top_facilities = df.nlargest(limit, metric)
        
        return {
            'metric': metric,
            'facilities': top_facilities[[
                'name', 'county', 'category_name', metric
            ]].to_dict('records')
        }
    
    def export_analysis_report(self, filename: str = "pandas_analysis_report.json"):
        """Export comprehensive analysis report."""
        report = {
            'generated_at': datetime.now().isoformat(),
            'summary': self.get_summary_statistics(),
            'data_profile_facilities': self.get_data_profile('facilities'),
            'data_profile_financials': self.get_data_profile('financials'),
            'county_analysis': self.get_county_analysis(),
            'category_analysis': self.get_category_analysis(),
            'revenue_distribution': self.get_revenue_distribution(),
            'capacity_analysis': self.get_capacity_analysis(),
            'time_series': self.get_time_series_analysis(),
            'correlation': self.get_correlation_matrix(),
            'outliers_revenue': self.get_outlier_analysis('total_revenue'),
            'top_facilities_revenue': self.get_top_facilities('total_revenue'),
            'top_facilities_visits': self.get_top_facilities('total_visits')
        }
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"📊 Analysis report exported to: {filename}")
        return report


if __name__ == "__main__":
    print("📊 Pandas Data Analyzer - Healthcare Fraud Detection")
    print("=" * 60)
    
    analyzer = PandasAnalyzer()
    
    print("\n🔍 Running comprehensive analysis...")
    
    # Summary statistics
    summary = analyzer.get_summary_statistics()
    print(f"\n✅ Total Facilities: {summary['facilities']['total']:,}")
    print(f"✅ Total Financial Records: {summary['financials']['total_records']:,}")
    print(f"✅ Coverage: {summary['coverage']['coverage_percentage']:.1f}%")
    print(f"✅ Total Revenue: ${summary['financials']['total_revenue']:,.0f}")
    
    # County analysis
    print("\n🗺️ Top 5 Counties by Revenue:")
    county_data = analyzer.get_county_analysis()
    for i, county in enumerate(county_data['counties'][:5], 1):
        print(f"  {i}. {county['county']}: ${county.get('total_revenue_sum', 0):,.0f}")
    
    # Category analysis
    print("\n📋 Facility Categories:")
    category_data = analyzer.get_category_analysis()
    for i, cat in enumerate(category_data['categories'][:5], 1):
        print(f"  {i}. {cat['category_name']}: {cat['facility_id_count']} facilities")
    
    # Outliers
    print("\n⚠️ Revenue Outliers:")
    outliers = analyzer.get_outlier_analysis('total_revenue')
    print(f"  Found {outliers['outlier_count']} outliers ({outliers['outlier_percentage']:.1f}%)")
    
    # Export full report
    print("\n📄 Generating full analysis report...")
    analyzer.export_analysis_report()
    
    print("\n✅ Analysis complete!")
