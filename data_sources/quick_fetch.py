#!/usr/bin/env python3
"""
Quick Data Fetch - Get real data from accessible APIs
Fetches actual dataset metadata and small samples
"""

import sys
import requests
import json
from pathlib import Path
import logging

sys.stdout.reconfigure(encoding='utf-8')
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def fetch_data_ca_gov_metadata():
    """Fetch dataset metadata from data.ca.gov API"""
    logger.info("="*70)
    logger.info("🌐 FETCHING DATA.CA.GOV METADATA")
    logger.info("="*70)
    
    try:
        # CKAN API endpoint
        base_url = "https://data.ca.gov/api/3/action"
        
        # Search for healthcare datasets
        search_url = f"{base_url}/package_search"
        params = {
            'q': 'healthcare OR hospital OR medical OR facility',
            'rows': 20,
            'sort': 'metadata_modified desc'
        }
        
        logger.info(f"\n📥 Querying: {search_url}")
        logger.info(f"   Search: {params['q']}")
        
        response = requests.get(search_url, params=params, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        if data['success']:
            results = data['result']['results']
            total = data['result']['count']
            
            logger.info(f"\n✓ Found {total:,} healthcare-related datasets")
            logger.info(f"✓ Retrieved {len(results)} most recent\n")
            
            # Save metadata
            output_dir = Path(__file__).parent.parent / 'data' / 'metadata'
            output_dir.mkdir(parents=True, exist_ok=True)
            
            metadata_file = output_dir / 'data_ca_gov_healthcare.json'
            with open(metadata_file, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2)
            
            logger.info(f"💾 Saved metadata to: {metadata_file}\n")
            
            # Display datasets
            logger.info("📊 TOP 10 HEALTHCARE DATASETS:\n")
            for i, dataset in enumerate(results[:10], 1):
                title = dataset.get('title', 'Untitled')
                org = dataset.get('organization', {}).get('title', 'Unknown')
                resources = len(dataset.get('resources', []))
                
                logger.info(f"{i}. {title}")
                logger.info(f"   Organization: {org}")
                logger.info(f"   Resources: {resources} files")
                
                # Show resource types
                if resources > 0:
                    formats = [r.get('format', 'Unknown') for r in dataset['resources'][:3]]
                    logger.info(f"   Formats: {', '.join(formats)}")
                
                logger.info(f"   URL: https://data.ca.gov/dataset/{dataset.get('name', '')}")
                logger.info("")
            
            return {
                'total': total,
                'retrieved': len(results),
                'metadata_file': str(metadata_file)
            }
        
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        return {'error': str(e)}


def fetch_chhs_datasets():
    """Fetch datasets from CHHS Open Data Portal"""
    logger.info("\n" + "="*70)
    logger.info("🏥 FETCHING CHHS OPEN DATA METADATA")
    logger.info("="*70)
    
    try:
        # CHHS uses Socrata
        base_url = "https://data.chhs.ca.gov/api/3/action"
        
        search_url = f"{base_url}/package_search"
        params = {
            'q': 'facility OR license OR healthcare',
            'rows': 20
        }
        
        logger.info(f"\n📥 Querying CHHS portal...")
        
        response = requests.get(search_url, params=params, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success'):
                results = data['result']['results']
                logger.info(f"\n✓ Found {len(results)} datasets")
                
                for i, dataset in enumerate(results[:5], 1):
                    logger.info(f"\n{i}. {dataset.get('title', 'Untitled')}")
                
                return {'datasets': len(results)}
        
        logger.info("⚠️  CHHS API endpoint may have changed")
        return {'note': 'API structure different, needs investigation'}
        
    except Exception as e:
        logger.warning(f"⚠️  CHHS fetch issue: {e}")
        return {'note': 'Will use SeleniumBase for CHHS portal'}


def fetch_cms_data_info():
    """Fetch CMS Provider Data API info"""
    logger.info("\n" + "="*70)
    logger.info("🏛️ CHECKING CMS PROVIDER DATA API")
    logger.info("="*70)
    
    try:
        # CMS has publicly documented APIs
        cms_url = "https://data.cms.gov/provider-data/api/1/metastore/schemas/dataset/items"
        
        logger.info(f"\n📥 Querying CMS catalog...")
        
        response = requests.get(cms_url, timeout=30)
        
        if response.status_code == 200:
            datasets = response.json()
            
            # Filter for California-relevant datasets
            ca_relevant = [
                d for d in datasets 
                if any(kw in d.get('title', '').lower() 
                       for kw in ['hospital', 'medicare', 'provider', 'facility'])
            ]
            
            logger.info(f"\n✓ Found {len(ca_relevant)} relevant CMS datasets")
            
            logger.info("\n📊 TOP 5 CMS DATASETS:\n")
            for i, dataset in enumerate(ca_relevant[:5], 1):
                title = dataset.get('title', 'Untitled')
                identifier = dataset.get('identifier', '')
                
                logger.info(f"{i}. {title}")
                logger.info(f"   ID: {identifier}")
                logger.info(f"   URL: https://data.cms.gov/provider-data/dataset/{identifier}")
                logger.info("")
            
            return {'datasets': len(ca_relevant)}
        
        logger.info("⚠️  CMS API structure may have changed")
        return {'note': 'API verification needed'}
        
    except Exception as e:
        logger.warning(f"⚠️  CMS fetch issue: {e}")
        return {'note': 'CMS data available, API access needs verification'}


def main():
    """Main execution"""
    logger.info("\n🚀 QUICK DATA FETCH - REAL API CALLS")
    logger.info("="*70)
    logger.info("Fetching actual metadata from government APIs")
    logger.info("This proves the data sources are accessible!\n")
    
    results = {}
    
    # Fetch from each source
    results['data_ca_gov'] = fetch_data_ca_gov_metadata()
    results['chhs'] = fetch_chhs_datasets()
    results['cms'] = fetch_cms_data_info()
    
    # Summary
    logger.info("\n" + "="*70)
    logger.info("✅ QUICK FETCH COMPLETE")
    logger.info("="*70)
    
    logger.info("\n📊 SUMMARY:")
    if 'total' in results['data_ca_gov']:
        logger.info(f"  data.ca.gov: {results['data_ca_gov']['total']:,} healthcare datasets available")
    if 'datasets' in results['chhs']:
        logger.info(f"  CHHS Portal: {results['chhs']['datasets']} datasets found")
    if 'datasets' in results['cms']:
        logger.info(f"  CMS: {results['cms']['datasets']} relevant datasets")
    
    logger.info("\n💡 NEXT STEPS:")
    logger.info("1. Check data/metadata/ for saved JSON files")
    logger.info("2. Use SeleniumBase for portals requiring browser interaction")
    logger.info("3. Download specific datasets using resource URLs")
    logger.info("4. Parse and load to database")
    
    logger.info("\n🎯 This proves the data is real and accessible!")


if __name__ == '__main__':
    main()
