"""
Endpoint Browser - Discover available datasets at government endpoints
Lists files, datasets, and resources available for scraping
"""

import sys
import requests
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

# Fix Unicode encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

logger = logging.getLogger(__name__)

class EndpointBrowser:
    """Browse and list available datasets at government endpoints."""
    
    def __init__(self, timeout: int = 10):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'HippocraticBot/1.0 (Healthcare Fraud Detection; +https://github.com/somacosf/hippocratic)',
        })
    
    def browse_data_ca_gov(self, search_query: str = "", limit: int = 100) -> Dict[str, Any]:
        """Browse datasets on data.ca.gov (CKAN API)."""
        url = f"https://data.ca.gov/api/3/action/package_search"
        params = {
            'q': search_query or 'healthcare OR budget OR facilities',
            'rows': limit,
            'sort': 'metadata_modified desc'
        }
        
        result = {
            'endpoint': 'data.ca.gov',
            'api_type': 'CKAN',
            'timestamp': datetime.now().isoformat(),
            'datasets': []
        }
        
        try:
            response = self.session.get(url, params=params, timeout=self.timeout)
            data = response.json()
            
            if data.get('success'):
                results = data.get('result', {})
                result['total'] = results.get('count', 0)
                
                for package in results.get('results', []):
                    dataset = {
                        'id': package.get('id'),
                        'name': package.get('name'),
                        'title': package.get('title'),
                        'description': package.get('notes', '')[:200],
                        'organization': package.get('organization', {}).get('title', 'N/A'),
                        'modified': package.get('metadata_modified'),
                        'tags': [t['name'] for t in package.get('tags', [])],
                        'resources': []
                    }
                    
                    for resource in package.get('resources', []):
                        dataset['resources'].append({
                            'id': resource.get('id'),
                            'name': resource.get('name'),
                            'format': resource.get('format'),
                            'url': resource.get('url'),
                            'size': resource.get('size'),
                            'description': resource.get('description', '')[:100]
                        })
                    
                    result['datasets'].append(dataset)
        
        except Exception as e:
            result['error'] = str(e)
        
        return result
    
    def browse_chhs(self, category: str = "", limit: int = 100) -> Dict[str, Any]:
        """Browse datasets on CHHS Open Data Portal (Socrata)."""
        # CHHS discovery API
        url = "https://data.chhs.ca.gov/api/catalog/v1"
        params = {
            'limit': limit,
            'offset': 0
        }
        
        if category:
            params['categories'] = category
        
        result = {
            'endpoint': 'data.chhs.ca.gov',
            'api_type': 'Socrata',
            'timestamp': datetime.now().isoformat(),
            'datasets': []
        }
        
        try:
            response = self.session.get(url, params=params, timeout=self.timeout)
            data = response.json()
            
            result['total'] = data.get('resultSetSize', 0)
            
            for item in data.get('results', []):
                resource = item.get('resource', {})
                dataset = {
                    'id': resource.get('id'),
                    'name': resource.get('name'),
                    'description': resource.get('description', '')[:200],
                    'category': item.get('classification', {}).get('categories', []),
                    'modified': resource.get('updatedAt'),
                    'type': resource.get('type'),
                    'url': f"https://data.chhs.ca.gov/d/{resource.get('id')}",
                    'api_url': f"https://data.chhs.ca.gov/resource/{resource.get('id')}.json",
                    'download_url': f"https://data.chhs.ca.gov/api/views/{resource.get('id')}/rows.csv?accessType=DOWNLOAD"
                }
                
                result['datasets'].append(dataset)
        
        except Exception as e:
            result['error'] = str(e)
        
        return result
    
    def browse_cms_data(self, dataset_type: str = "provider") -> Dict[str, Any]:
        """Browse CMS (Centers for Medicare & Medicaid Services) datasets."""
        # CMS Data API endpoints
        endpoints = {
            'provider': 'https://data.cms.gov/provider-data/api/1/metastore/schemas/dataset/items',
            'medicare': 'https://data.cms.gov/medicare/api/1/metastore/schemas/dataset/items',
            'medicaid': 'https://data.cms.gov/medicaid/api/1/metastore/schemas/dataset/items'
        }
        
        url = endpoints.get(dataset_type, endpoints['provider'])
        
        result = {
            'endpoint': 'data.cms.gov',
            'api_type': 'CMS Open Data',
            'dataset_type': dataset_type,
            'timestamp': datetime.now().isoformat(),
            'datasets': []
        }
        
        try:
            response = self.session.get(url, timeout=self.timeout)
            data = response.json()
            
            for item in data[:50]:  # Limit to 50
                dataset = {
                    'id': item.get('identifier'),
                    'title': item.get('title'),
                    'description': item.get('description', '')[:200],
                    'modified': item.get('modified'),
                    'keywords': item.get('keyword', []),
                    'distributions': []
                }
                
                for dist in item.get('distribution', []):
                    dataset['distributions'].append({
                        'title': dist.get('title'),
                        'format': dist.get('format'),
                        'url': dist.get('downloadURL'),
                        'media_type': dist.get('mediaType')
                    })
                
                result['datasets'].append(dataset)
            
            result['total'] = len(result['datasets'])
        
        except Exception as e:
            result['error'] = str(e)
        
        return result
    
    def browse_openfiscal(self) -> Dict[str, Any]:
        """Browse Open FI$Cal available datasets (manual list)."""
        # Open FI$Cal doesn't have a direct API for listing all datasets
        # This is a curated list of known endpoints
        result = {
            'endpoint': 'open.fiscal.ca.gov',
            'api_type': 'Manual Curated List',
            'timestamp': datetime.now().isoformat(),
            'datasets': [
                {
                    'id': 'state-spending',
                    'title': 'State Spending Data',
                    'description': 'Detailed state spending transactions',
                    'portal_url': 'https://open.fiscal.ca.gov/spending.html',
                    'data_url': 'https://bythenumbers.sco.ca.gov/Raw-Data/Spending-Data',
                    'format': 'CSV'
                },
                {
                    'id': 'state-revenue',
                    'title': 'State Revenue Data',
                    'description': 'State revenue collections by source',
                    'portal_url': 'https://open.fiscal.ca.gov/revenue.html',
                    'data_url': 'https://bythenumbers.sco.ca.gov/Raw-Data/Revenue-Data',
                    'format': 'CSV'
                },
                {
                    'id': 'public-pay',
                    'title': 'Public Employee Pay',
                    'description': 'Compensation for public employees',
                    'portal_url': 'https://publicpay.ca.gov/',
                    'data_url': 'https://publicpay.ca.gov/Reports/RawExport.aspx',
                    'format': 'CSV'
                },
                {
                    'id': 'budget-detail',
                    'title': 'Budget Detail',
                    'description': 'Line-item budget details',
                    'portal_url': 'https://open.fiscal.ca.gov/budget.html',
                    'data_url': 'https://bythenumbers.sco.ca.gov/Raw-Data/Budget-Data',
                    'format': 'CSV'
                }
            ],
            'total': 4
        }
        
        return result
    
    def browse_all_endpoints(self) -> Dict[str, Any]:
        """Browse all configured government endpoints."""
        return {
            'timestamp': datetime.now().isoformat(),
            'endpoints': {
                'data_ca_gov': self.browse_data_ca_gov(),
                'chhs': self.browse_chhs(),
                'cms': self.browse_cms_data(),
                'openfiscal': self.browse_openfiscal()
            }
        }
    
    def close(self):
        """Close the session."""
        self.session.close()


if __name__ == "__main__":
    import sys
    
    browser = EndpointBrowser()
    
    if len(sys.argv) > 1:
        endpoint = sys.argv[1]
        
        if endpoint == 'data.ca.gov':
            result = browser.browse_data_ca_gov()
        elif endpoint == 'chhs':
            result = browser.browse_chhs()
        elif endpoint == 'cms':
            result = browser.browse_cms_data()
        elif endpoint == 'openfiscal':
            result = browser.browse_openfiscal()
        else:
            print(f"Unknown endpoint: {endpoint}")
            sys.exit(1)
        
        print(json.dumps(result, indent=2))
    else:
        print("Usage: python endpoint_browser.py [data.ca.gov|chhs|cms|openfiscal]")
        sys.exit(1)
    
    browser.close()
