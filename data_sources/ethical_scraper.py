"""
Ethical web scraping utilities for government data collection.
Implements rate limiting, robots.txt compliance, and polite delays.
"""

import time
import requests
from urllib.parse import urlparse, urljoin
from urllib.robotparser import RobotFileParser
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict
import random

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('ethical_scraper')


class EthicalScraper:
    """
    Ethical web scraper that respects robots.txt, implements rate limiting,
    and identifies itself properly to server administrators.
    """
    
    def __init__(
        self,
        user_agent: str = "HippocraticBot/1.0 (+https://github.com/SoMaCoSF/hippocratic; Research/Academic Purpose)",
        rate_limit_delay: float = 2.0,  # Seconds between requests
        max_retries: int = 3,
        timeout: int = 30,
        respect_robots_txt: bool = True
    ):
        """
        Initialize ethical scraper.
        
        Args:
            user_agent: Identifies the bot to server admins
            rate_limit_delay: Minimum seconds between requests (default 2s)
            max_retries: Maximum retry attempts on failure
            timeout: Request timeout in seconds
            respect_robots_txt: Whether to check robots.txt (default True)
        """
        self.user_agent = user_agent
        self.rate_limit_delay = rate_limit_delay
        self.max_retries = max_retries
        self.timeout = timeout
        self.respect_robots_txt = respect_robots_txt
        
        # Track request times per domain
        self.last_request_time: Dict[str, datetime] = {}
        
        # Cache robots.txt parsers
        self.robots_cache: Dict[str, RobotFileParser] = {}
        
        # Session for connection pooling
        self.session = requests.Session()
        
        # Try to use privacy proxy adapter if available
        # NOTE: Privacy features are OFF by default - must opt-in
        try:
            from privacy_proxy_adapter import GovernmentScraperHeaders
            self.headers_manager = GovernmentScraperHeaders(
                contact_email='somacosf@gmail.com',
                strip_cookies=False,  # OFF by default
                randomize_minor_fingerprint=False  # OFF by default
            )
            logger.info("Privacy proxy adapter available (features disabled by default)")
        except ImportError:
            self.headers_manager = None
            logger.info("Privacy proxy adapter not available - using basic headers")
            # Fallback to basic headers
            self.session.headers.update({
                'User-Agent': self.user_agent,
                'Accept': 'text/html,application/json,text/csv,application/pdf',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'From': 'somacosf@gmail.com',  # Contact email for server admins
            })
        
        logger.info(f"Initialized EthicalScraper with {rate_limit_delay}s rate limit")
    
    def _get_domain(self, url: str) -> str:
        """Extract domain from URL."""
        parsed = urlparse(url)
        return f"{parsed.scheme}://{parsed.netloc}"
    
    def _check_robots_txt(self, url: str) -> bool:
        """
        Check if URL is allowed by robots.txt.
        
        Returns:
            True if allowed, False if disallowed
        """
        if not self.respect_robots_txt:
            return True
        
        domain = self._get_domain(url)
        
        # Check cache first
        if domain not in self.robots_cache:
            robots_url = urljoin(domain, '/robots.txt')
            rp = RobotFileParser()
            rp.set_url(robots_url)
            
            try:
                rp.read()
                self.robots_cache[domain] = rp
                logger.info(f"Loaded robots.txt from {domain}")
            except Exception as e:
                logger.warning(f"Could not load robots.txt from {domain}: {e}")
                # Assume allowed if robots.txt doesn't exist
                return True
        
        rp = self.robots_cache[domain]
        allowed = rp.can_fetch(self.user_agent, url)
        
        if not allowed:
            logger.warning(f"URL blocked by robots.txt: {url}")
        
        return allowed
    
    def _apply_rate_limit(self, url: str):
        """
        Apply rate limiting per domain.
        Ensures minimum delay between requests to same domain.
        """
        domain = self._get_domain(url)
        
        if domain in self.last_request_time:
            elapsed = (datetime.now() - self.last_request_time[domain]).total_seconds()
            
            if elapsed < self.rate_limit_delay:
                sleep_time = self.rate_limit_delay - elapsed
                # Add small random jitter to avoid thundering herd
                sleep_time += random.uniform(0, 0.5)
                logger.debug(f"Rate limiting: sleeping {sleep_time:.2f}s for {domain}")
                time.sleep(sleep_time)
        
        self.last_request_time[domain] = datetime.now()
    
    def get(self, url: str, **kwargs) -> Optional[requests.Response]:
        """
        Perform ethical GET request with rate limiting and retry logic.
        
        Args:
            url: URL to fetch
            **kwargs: Additional arguments for requests.get()
        
        Returns:
            Response object or None on failure
        """
        # Check robots.txt
        if not self._check_robots_txt(url):
            logger.error(f"Skipping {url} - blocked by robots.txt")
            return None
        
        # Apply rate limiting
        self._apply_rate_limit(url)
        
        # Retry logic
        for attempt in range(self.max_retries):
            try:
                logger.info(f"Fetching {url} (attempt {attempt + 1}/{self.max_retries})")
                
                # Use privacy-enhanced headers if available
                if self.headers_manager:
                    privacy_headers = self.headers_manager.get_headers(url)
                    if 'headers' in kwargs:
                        privacy_headers.update(kwargs['headers'])
                    kwargs['headers'] = privacy_headers
                
                response = self.session.get(
                    url,
                    timeout=self.timeout,
                    **kwargs
                )
                
                response.raise_for_status()
                logger.info(f"✅ Successfully fetched {url} ({response.status_code})")
                return response
                
            except requests.exceptions.HTTPError as e:
                status_code = e.response.status_code
                
                if status_code == 429:  # Too Many Requests
                    # Exponential backoff
                    backoff_time = self.rate_limit_delay * (2 ** attempt)
                    logger.warning(f"Rate limited (429) - backing off {backoff_time}s")
                    time.sleep(backoff_time)
                    
                elif status_code in [403, 451]:  # Forbidden / Unavailable for Legal Reasons
                    logger.error(f"Access forbidden ({status_code}) for {url}")
                    return None
                    
                elif status_code >= 500:  # Server error
                    logger.warning(f"Server error ({status_code}) - retrying...")
                    time.sleep(self.rate_limit_delay * 2)
                    
                else:
                    logger.error(f"HTTP error {status_code} for {url}: {e}")
                    return None
                    
            except requests.exceptions.Timeout:
                logger.warning(f"Timeout on attempt {attempt + 1} for {url}")
                time.sleep(self.rate_limit_delay)
                
            except requests.exceptions.ConnectionError as e:
                logger.warning(f"Connection error on attempt {attempt + 1} for {url}: {e}")
                time.sleep(self.rate_limit_delay * 2)
                
            except Exception as e:
                logger.error(f"Unexpected error for {url}: {e}")
                return None
        
        logger.error(f"❌ Failed to fetch {url} after {self.max_retries} attempts")
        return None
    
    def download_file(self, url: str, output_path: str) -> bool:
        """
        Download file with progress tracking.
        
        Args:
            url: URL to download
            output_path: Local file path to save
        
        Returns:
            True if successful, False otherwise
        """
        response = self.get(url, stream=True)
        
        if not response:
            return False
        
        try:
            total_size = int(response.headers.get('content-length', 0))
            
            with open(output_path, 'wb') as f:
                downloaded = 0
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        
                        if total_size > 0:
                            percent = (downloaded / total_size) * 100
                            logger.debug(f"Download progress: {percent:.1f}%")
            
            logger.info(f"✅ Downloaded {url} to {output_path} ({downloaded} bytes)")
            return True
            
        except Exception as e:
            logger.error(f"Error downloading {url}: {e}")
            return False
    
    def close(self):
        """Close session and cleanup."""
        self.session.close()
        logger.info("EthicalScraper session closed")


class GovernmentDataCollector(EthicalScraper):
    """
    Specialized scraper for government data with extra conservative settings.
    """
    
    def __init__(self):
        super().__init__(
            user_agent=(
                "HippocraticBot/1.0 "
                "(+https://github.com/SoMaCoSF/hippocratic; "
                "Academic/Research: California Healthcare Fraud Detection; "
                "Contact: somacosf@gmail.com)"
            ),
            rate_limit_delay=3.0,  # 3 seconds between requests (very conservative)
            max_retries=2,  # Lower retries to avoid hammering
            timeout=45,  # Longer timeout for government sites
            respect_robots_txt=True
        )
        
        # Additional headers for transparency
        self.session.headers.update({
            'X-Purpose': 'Healthcare Fraud Detection Research',
            'X-Institution': 'Hippocratic Project',
            'X-Contact': 'somacosf@gmail.com'
        })
        
        logger.info("Initialized GovernmentDataCollector with conservative settings")
    
    def log_collection_activity(self, source: str, success: bool, records: int = 0):
        """
        Log data collection activity for transparency and audit trail.
        
        Args:
            source: Data source name
            success: Whether collection succeeded
            records: Number of records collected
        """
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'source': source,
            'success': success,
            'records': records,
            'user_agent': self.user_agent
        }
        
        # Log to file for transparency
        with open('data_sources/collection_log.jsonl', 'a') as f:
            import json
            f.write(json.dumps(log_entry) + '\n')
        
        logger.info(f"Logged collection: {source} - {'✅' if success else '❌'} - {records} records")


# Example usage
if __name__ == '__main__':
    # Test ethical scraper
    scraper = GovernmentDataCollector()
    
    # Test robots.txt compliance
    test_urls = [
        'https://data.ca.gov/api/3/action/package_list',
        'https://data.chhs.ca.gov/api/views/metadata/v1',
        'https://openfiscal.ca.gov/'
    ]
    
    print("\n🤖 Testing Ethical Scraper\n")
    
    for url in test_urls:
        print(f"Testing: {url}")
        
        # Check robots.txt
        domain = scraper._get_domain(url)
        allowed = scraper._check_robots_txt(url)
        print(f"  Robots.txt: {'✅ Allowed' if allowed else '❌ Blocked'}")
        
        if allowed:
            # Test fetch with rate limiting
            response = scraper.get(url)
            if response:
                print(f"  Status: {response.status_code}")
                print(f"  Size: {len(response.content)} bytes")
            else:
                print(f"  ❌ Failed to fetch")
        
        print()
    
    scraper.close()
    print("✅ Test complete - check data_sources/collection_log.jsonl for activity log")
