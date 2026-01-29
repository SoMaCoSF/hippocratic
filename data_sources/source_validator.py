"""
Source Validator - Test accessibility of government data sources
Validates URLs, file formats, and data structure before scraping
"""

import sys
import requests
import json
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse
import time
from datetime import datetime
import logging

# Fix Unicode encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

logger = logging.getLogger(__name__)

class SourceValidator:
    """Validates data source accessibility and format."""
    
    def __init__(self, timeout: int = 10):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'HippocraticBot/1.0 (Healthcare Fraud Detection; +https://github.com/somacosf/hippocratic)',
        })
    
    def validate_url(self, url: str) -> Dict[str, Any]:
        """Test if URL is accessible."""
        result = {
            'url': url,
            'accessible': False,
            'status_code': None,
            'content_type': None,
            'content_length': None,
            'response_time_ms': None,
            'error': None,
            'timestamp': datetime.now().isoformat()
        }
        
        try:
            start = time.time()
            response = self.session.head(url, timeout=self.timeout, allow_redirects=True)
            elapsed_ms = int((time.time() - start) * 1000)
            
            result['accessible'] = response.status_code == 200
            result['status_code'] = response.status_code
            result['content_type'] = response.headers.get('Content-Type', 'unknown')
            result['content_length'] = response.headers.get('Content-Length', 'unknown')
            result['response_time_ms'] = elapsed_ms
            
            # If HEAD fails, try GET
            if response.status_code != 200:
                start = time.time()
                response = self.session.get(url, timeout=self.timeout, stream=True)
                elapsed_ms = int((time.time() - start) * 1000)
                
                result['accessible'] = response.status_code == 200
                result['status_code'] = response.status_code
                result['content_type'] = response.headers.get('Content-Type', 'unknown')
                result['content_length'] = response.headers.get('Content-Length', 'unknown')
                result['response_time_ms'] = elapsed_ms
            
        except requests.exceptions.Timeout:
            result['error'] = f'Timeout after {self.timeout}s'
        except requests.exceptions.ConnectionError:
            result['error'] = 'Connection failed - host unreachable'
        except requests.exceptions.TooManyRedirects:
            result['error'] = 'Too many redirects'
        except Exception as e:
            result['error'] = str(e)
        
        return result
    
    def validate_csv(self, url: str, expected_columns: Optional[List[str]] = None) -> Dict[str, Any]:
        """Validate CSV file accessibility and structure."""
        result = self.validate_url(url)
        
        if not result['accessible']:
            return result
        
        result['format'] = 'csv'
        result['valid_format'] = False
        result['columns'] = []
        result['sample_rows'] = 0
        
        try:
            # Download first few KB to check format
            response = self.session.get(url, timeout=self.timeout, stream=True)
            
            # Read first 5KB
            chunk = b''
            for line in response.iter_lines(chunk_size=1024):
                chunk += line + b'\n'
                if len(chunk) > 5120:  # 5KB
                    break
            
            # Try to parse as CSV
            import csv
            from io import StringIO
            
            text = chunk.decode('utf-8', errors='ignore')
            reader = csv.reader(StringIO(text))
            
            # Get headers
            headers = next(reader)
            result['columns'] = headers
            result['valid_format'] = len(headers) > 0
            
            # Count sample rows
            row_count = 0
            for _ in reader:
                row_count += 1
                if row_count >= 5:  # Just sample
                    break
            
            result['sample_rows'] = row_count
            
            # Check expected columns
            if expected_columns:
                missing = [col for col in expected_columns if col not in headers]
                result['expected_columns_present'] = len(missing) == 0
                result['missing_columns'] = missing
            
        except Exception as e:
            result['error'] = f'CSV parse error: {str(e)}'
        
        return result
    
    def validate_pdf(self, url: str) -> Dict[str, Any]:
        """Validate PDF file accessibility."""
        result = self.validate_url(url)
        
        if not result['accessible']:
            return result
        
        result['format'] = 'pdf'
        result['valid_format'] = False
        
        try:
            # Check if content-type is PDF
            if 'pdf' in result['content_type'].lower():
                result['valid_format'] = True
            else:
                # Download first few bytes to check magic number
                response = self.session.get(url, timeout=self.timeout, stream=True)
                chunk = next(response.iter_content(chunk_size=1024))
                
                # PDF magic number: %PDF
                if chunk.startswith(b'%PDF'):
                    result['valid_format'] = True
                    result['content_type'] = 'application/pdf'
        
        except Exception as e:
            result['error'] = f'PDF validation error: {str(e)}'
        
        return result
    
    def validate_json(self, url: str, expected_keys: Optional[List[str]] = None) -> Dict[str, Any]:
        """Validate JSON API endpoint."""
        result = self.validate_url(url)
        
        if not result['accessible']:
            return result
        
        result['format'] = 'json'
        result['valid_format'] = False
        
        try:
            response = self.session.get(url, timeout=self.timeout)
            data = response.json()
            
            result['valid_format'] = True
            result['top_level_keys'] = list(data.keys()) if isinstance(data, dict) else []
            result['is_array'] = isinstance(data, list)
            result['array_length'] = len(data) if isinstance(data, list) else None
            
            # Check expected keys
            if expected_keys and isinstance(data, dict):
                missing = [key for key in expected_keys if key not in data]
                result['expected_keys_present'] = len(missing) == 0
                result['missing_keys'] = missing
        
        except json.JSONDecodeError as e:
            result['error'] = f'Invalid JSON: {str(e)}'
        except Exception as e:
            result['error'] = f'JSON validation error: {str(e)}'
        
        return result
    
    def validate_api(self, base_url: str, endpoints: List[str]) -> Dict[str, Any]:
        """Validate multiple API endpoints."""
        results = {
            'base_url': base_url,
            'timestamp': datetime.now().isoformat(),
            'endpoints': []
        }
        
        for endpoint in endpoints:
            full_url = f"{base_url.rstrip('/')}/{endpoint.lstrip('/')}"
            result = self.validate_url(full_url)
            result['endpoint'] = endpoint
            results['endpoints'].append(result)
        
        # Summary
        accessible_count = sum(1 for r in results['endpoints'] if r['accessible'])
        results['summary'] = {
            'total': len(endpoints),
            'accessible': accessible_count,
            'failed': len(endpoints) - accessible_count
        }
        
        return results
    
    def validate_soda_api(self, domain: str, dataset_id: str, app_token: Optional[str] = None) -> Dict[str, Any]:
        """Validate Socrata Open Data API (SODA) endpoint."""
        url = f"https://{domain}/resource/{dataset_id}.json?$limit=1"
        
        if app_token:
            self.session.headers['X-App-Token'] = app_token
        
        result = self.validate_json(url)
        result['api_type'] = 'SODA'
        result['domain'] = domain
        result['dataset_id'] = dataset_id
        
        # Try to get metadata
        try:
            meta_url = f"https://{domain}/api/views/{dataset_id}.json"
            meta_response = self.session.get(meta_url, timeout=self.timeout)
            metadata = meta_response.json()
            
            result['metadata'] = {
                'name': metadata.get('name'),
                'description': metadata.get('description'),
                'rows': metadata.get('rowsUpdatedAt'),
                'columns': len(metadata.get('columns', []))
            }
        except:
            pass  # Metadata optional
        
        return result
    
    def validate_ckan_api(self, domain: str, package_id: str) -> Dict[str, Any]:
        """Validate CKAN API endpoint (data.ca.gov uses CKAN)."""
        url = f"https://{domain}/api/3/action/package_show?id={package_id}"
        
        result = self.validate_json(url)
        result['api_type'] = 'CKAN'
        result['domain'] = domain
        result['package_id'] = package_id
        
        try:
            response = self.session.get(url, timeout=self.timeout)
            data = response.json()
            
            if data.get('success'):
                package = data.get('result', {})
                result['metadata'] = {
                    'name': package.get('title'),
                    'description': package.get('notes'),
                    'resources': len(package.get('resources', [])),
                    'tags': [t['name'] for t in package.get('tags', [])]
                }
                
                # Validate each resource
                result['resources'] = []
                for resource in package.get('resources', [])[:5]:  # Max 5
                    res_result = {
                        'name': resource.get('name'),
                        'format': resource.get('format'),
                        'url': resource.get('url')
                    }
                    
                    # Quick check if resource URL is accessible
                    if resource.get('url'):
                        check = self.validate_url(resource['url'])
                        res_result['accessible'] = check['accessible']
                        res_result['status_code'] = check['status_code']
                    
                    result['resources'].append(res_result)
        
        except Exception as e:
            result['error'] = f'CKAN validation error: {str(e)}'
        
        return result
    
    def validate_scraper_sources(self, scraper_name: str) -> Dict[str, Any]:
        """Validate all sources for a specific scraper."""
        
        sources = {
            'openfiscal': {
                'name': 'California Open FI$Cal',
                'urls': [
                    {'url': 'https://open.fiscal.ca.gov/', 'type': 'portal', 'description': 'Main portal'},
                    {'url': 'https://bythenumbers.sco.ca.gov/', 'type': 'portal', 'description': 'Alternative access'},
                ]
            },
            'sco': {
                'name': 'State Controller\'s Office',
                'urls': [
                    {'url': 'https://bythenumbers.sco.ca.gov/Raw-Data', 'type': 'portal', 'description': 'Raw data portal'},
                    {'url': 'https://publicpay.ca.gov/', 'type': 'api', 'description': 'Public pay data'},
                ]
            },
            'data_ca_gov': {
                'name': 'data.ca.gov',
                'urls': [
                    {'url': 'https://data.ca.gov/api/3/action/package_search?q=healthcare', 'type': 'json', 'description': 'Healthcare datasets'},
                    {'url': 'https://data.ca.gov/api/3/action/package_search?q=budget', 'type': 'json', 'description': 'Budget datasets'},
                ]
            },
            'chhs': {
                'name': 'CHHS Open Data Portal',
                'urls': [
                    {'url': 'https://data.chhs.ca.gov/api/views/metadata/v1', 'type': 'json', 'description': 'API metadata'},
                    {'url': 'https://data.chhs.ca.gov/browse?limitTo=datasets&page=1', 'type': 'portal', 'description': 'Dataset browser'},
                ]
            }
        }
        
        if scraper_name not in sources:
            return {'error': f'Unknown scraper: {scraper_name}'}
        
        config = sources[scraper_name]
        results = {
            'scraper': scraper_name,
            'name': config['name'],
            'timestamp': datetime.now().isoformat(),
            'sources': []
        }
        
        for source in config['urls']:
            logger.info(f"Validating {source['description']}: {source['url']}")
            
            if source['type'] == 'json':
                result = self.validate_json(source['url'])
            elif source['type'] == 'csv':
                result = self.validate_csv(source['url'])
            elif source['type'] == 'pdf':
                result = self.validate_pdf(source['url'])
            else:
                result = self.validate_url(source['url'])
            
            result['description'] = source['description']
            result['expected_type'] = source['type']
            results['sources'].append(result)
        
        # Summary
        accessible_count = sum(1 for s in results['sources'] if s['accessible'])
        results['summary'] = {
            'total': len(results['sources']),
            'accessible': accessible_count,
            'failed': len(results['sources']) - accessible_count,
            'all_accessible': accessible_count == len(results['sources'])
        }
        
        return results
    
    def close(self):
        """Close the session."""
        self.session.close()


if __name__ == "__main__":
    # CLI testing
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python source_validator.py [scraper_name]")
        print("Scrapers: openfiscal, sco, data_ca_gov, chhs")
        sys.exit(1)
    
    validator = SourceValidator()
    scraper_name = sys.argv[1]
    
    print(f"\n🔍 Validating sources for: {scraper_name}\n")
    
    result = validator.validate_scraper_sources(scraper_name)
    
    if 'error' in result:
        print(f"❌ Error: {result['error']}")
    else:
        print(f"📊 {result['name']}")
        print(f"   Total sources: {result['summary']['total']}")
        print(f"   ✅ Accessible: {result['summary']['accessible']}")
        print(f"   ❌ Failed: {result['summary']['failed']}")
        print()
        
        for source in result['sources']:
            status = "✅" if source['accessible'] else "❌"
            print(f"{status} {source['description']}")
            print(f"   URL: {source['url']}")
            print(f"   Status: {source['status_code']} ({source['response_time_ms']}ms)")
            if source.get('error'):
                print(f"   Error: {source['error']}")
            if source.get('content_type'):
                print(f"   Type: {source['content_type']}")
            print()
    
    validator.close()
    
    # Exit with error code if validation failed
    if not result.get('summary', {}).get('all_accessible', False):
        sys.exit(1)
