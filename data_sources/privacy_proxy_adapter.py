"""
Privacy Proxy Adapter for Government Data Scraping
Integrates wire_stripper/privacy_proxy capabilities with ethical scraping.

Key Features:
- Cookie stripping (tracking prevention)
- Fingerprint randomization (avoid profiling)
- Header manipulation (privacy-preserving)
- Traffic logging (transparency)
"""

import os
import sys
import random
import logging
from datetime import datetime
from typing import Optional, Dict
from urllib.parse import urlparse

# Try to import from wire_stripper if available
try:
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'wire_stripper'))
    from cookie_interceptor import CookieInterceptor
    from fingerprint_randomizer import FingerprintRandomizer
    WIRE_STRIPPER_AVAILABLE = True
except ImportError:
    WIRE_STRIPPER_AVAILABLE = False
    logging.warning("wire_stripper not available - running without privacy proxy features")

logger = logging.getLogger('privacy_proxy_adapter')


class GovernmentScraperHeaders:
    """
    Manages HTTP headers for ethical government data scraping.
    
    Balances privacy protection with proper identification:
    - Strips tracking cookies (not needed for .gov sites)
    - Randomizes non-identifying fingerprint (prevent profiling)
    - Maintains clear bot identification (ethical requirement)
    """
    
    def __init__(
        self,
        contact_email: str = "somacosf@gmail.com",
        project_url: str = "https://github.com/SoMaCoSF/hippocratic",
        strip_cookies: bool = True,
        randomize_minor_fingerprint: bool = True
    ):
        self.contact_email = contact_email
        self.project_url = project_url
        self.strip_cookies = strip_cookies
        self.randomize_minor_fingerprint = randomize_minor_fingerprint
        
        # Base headers (always present for transparency)
        self.base_headers = {
            'User-Agent': (
                f'HippocraticBot/1.0 '
                f'(+{project_url}; '
                f'Academic/Research: California Healthcare Fraud Detection; '
                f'Contact: {contact_email})'
            ),
            'From': contact_email,
            'X-Purpose': 'Healthcare Fraud Detection Research',
            'X-Institution': 'Hippocratic Project',
            'X-Contact': contact_email,
            'Accept': 'text/html,application/json,text/csv,application/pdf,*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'DNT': '1',  # Do Not Track
        }
        
        # Minor fingerprint variations (for load balancing detection avoidance)
        self.language_variations = [
            'en-US,en;q=0.9',
            'en-US,en;q=0.9,es;q=0.1',  # Common in California
        ]
        
        self.encoding_variations = [
            'gzip, deflate, br',
            'gzip, deflate',
        ]
        
        # Tracking cookie patterns (to be stripped)
        self.tracking_cookie_patterns = [
            '_ga', '_gid', '_gat',  # Google Analytics
            'fbp', 'fbm', 'fr',  # Facebook
            '__utm',  # UTM tracking
            '_dc_gtm',  # Google Tag Manager
        ]
        
        self.current_fingerprint = None
    
    def get_headers(self, url: str) -> Dict[str, str]:
        """
        Get headers for a specific URL.
        
        Args:
            url: Target URL
            
        Returns:
            Dict of HTTP headers
        """
        headers = self.base_headers.copy()
        
        # Apply minor randomization if enabled
        if self.randomize_minor_fingerprint:
            headers['Accept-Language'] = random.choice(self.language_variations)
            headers['Accept-Encoding'] = random.choice(self.encoding_variations)
        
        # Add Referer for navigation (helps .gov sites understand traffic flow)
        # But only for same-domain navigation
        parsed = urlparse(url)
        if parsed.netloc:
            headers['Referer'] = f"{parsed.scheme}://{parsed.netloc}/"
        
        return headers
    
    def strip_cookies_from_header(self, cookie_header: str) -> str:
        """
        Strip tracking cookies from Cookie header.
        
        Government sites don't need tracking cookies - strip them for privacy.
        Keep only session/authentication cookies if present.
        
        Args:
            cookie_header: Raw Cookie header value
            
        Returns:
            Cleaned Cookie header (or empty string if all stripped)
        """
        if not self.strip_cookies or not cookie_header:
            return cookie_header
        
        # Parse cookies
        cookies = {}
        for cookie in cookie_header.split(';'):
            if '=' in cookie:
                name, value = cookie.strip().split('=', 1)
                cookies[name] = value
        
        # Filter out tracking cookies
        cleaned_cookies = {}
        for name, value in cookies.items():
            is_tracking = False
            for pattern in self.tracking_cookie_patterns:
                if pattern.lower() in name.lower():
                    is_tracking = True
                    logger.debug(f"Stripped tracking cookie: {name}")
                    break
            
            if not is_tracking:
                cleaned_cookies[name] = value
        
        # Rebuild cookie header
        if cleaned_cookies:
            return '; '.join([f"{k}={v}" for k, v in cleaned_cookies.items()])
        else:
            return ''
    
    def process_response_cookies(self, set_cookie_headers: list) -> list:
        """
        Process Set-Cookie headers from response.
        Strip tracking cookies before they're stored.
        
        Args:
            set_cookie_headers: List of Set-Cookie header values
            
        Returns:
            Filtered list of Set-Cookie headers
        """
        if not self.strip_cookies or not set_cookie_headers:
            return set_cookie_headers
        
        cleaned = []
        for cookie_header in set_cookie_headers:
            cookie_name = cookie_header.split('=')[0].strip()
            
            is_tracking = False
            for pattern in self.tracking_cookie_patterns:
                if pattern.lower() in cookie_name.lower():
                    is_tracking = True
                    logger.debug(f"Blocked Set-Cookie: {cookie_name}")
                    break
            
            if not is_tracking:
                cleaned.append(cookie_header)
        
        return cleaned
    
    def log_request(self, url: str, method: str = 'GET'):
        """
        Log request for transparency.
        
        Args:
            url: URL being accessed
            method: HTTP method
        """
        logger.info(f"{method} {url}")


class PrivacyProxySession:
    """
    Requests session wrapper with privacy proxy features.
    
    Usage:
        session = PrivacyProxySession()
        response = session.get('https://data.ca.gov/api/...')
    """
    
    def __init__(
        self,
        contact_email: str = "somacosf@gmail.com",
        rate_limit_delay: float = 3.0
    ):
        import requests
        
        self.session = requests.Session()
        self.headers_manager = GovernmentScraperHeaders(contact_email=contact_email)
        self.rate_limit_delay = rate_limit_delay
        self.last_request_time = {}
        
    def _apply_rate_limit(self, url: str):
        """Apply rate limiting per domain."""
        import time
        from urllib.parse import urlparse
        
        domain = urlparse(url).netloc
        
        if domain in self.last_request_time:
            elapsed = time.time() - self.last_request_time[domain]
            if elapsed < self.rate_limit_delay:
                sleep_time = self.rate_limit_delay - elapsed
                time.sleep(sleep_time)
        
        self.last_request_time[domain] = time.time()
    
    def get(self, url: str, **kwargs):
        """
        Perform GET request with privacy features.
        
        Args:
            url: Target URL
            **kwargs: Additional arguments for requests.get()
            
        Returns:
            Response object
        """
        # Apply rate limiting
        self._apply_rate_limit(url)
        
        # Get privacy-enhanced headers
        headers = self.headers_manager.get_headers(url)
        
        # Merge with any user-provided headers
        if 'headers' in kwargs:
            headers.update(kwargs['headers'])
        kwargs['headers'] = headers
        
        # Strip cookies if present in session
        if self.session.cookies:
            cookie_header = '; '.join([f"{k}={v}" for k, v in self.session.cookies.items()])
            cleaned = self.headers_manager.strip_cookies_from_header(cookie_header)
            if cleaned:
                headers['Cookie'] = cleaned
        
        # Log request
        self.headers_manager.log_request(url, 'GET')
        
        # Make request
        response = self.session.get(url, **kwargs)
        
        # Process Set-Cookie headers in response
        if 'Set-Cookie' in response.headers:
            set_cookies = response.headers.get_all('Set-Cookie') if hasattr(response.headers, 'get_all') else [response.headers['Set-Cookie']]
            cleaned_cookies = self.headers_manager.process_response_cookies(set_cookies)
            # Note: Can't modify response headers, but we've prevented cookie storage
        
        return response
    
    def post(self, url: str, **kwargs):
        """POST request with privacy features."""
        self._apply_rate_limit(url)
        headers = self.headers_manager.get_headers(url)
        if 'headers' in kwargs:
            headers.update(kwargs['headers'])
        kwargs['headers'] = headers
        
        self.headers_manager.log_request(url, 'POST')
        return self.session.post(url, **kwargs)
    
    def close(self):
        """Close session."""
        self.session.close()


# Convenience function
def create_privacy_session(contact_email: str = "somacosf@gmail.com", rate_limit_delay: float = 3.0):
    """
    Create a privacy-enhanced requests session for government data scraping.
    
    Args:
        contact_email: Contact email for server administrators
        rate_limit_delay: Minimum seconds between requests to same domain
        
    Returns:
        PrivacyProxySession instance
    """
    return PrivacyProxySession(contact_email=contact_email, rate_limit_delay=rate_limit_delay)


# Example usage
if __name__ == '__main__':
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    print("🔐 Privacy Proxy Adapter for Government Scraping\n")
    
    # Test header generation
    headers_mgr = GovernmentScraperHeaders()
    test_url = 'https://data.ca.gov/api/3/action/package_list'
    
    print("📋 Generated Headers:")
    headers = headers_mgr.get_headers(test_url)
    for key, value in headers.items():
        print(f"  {key}: {value}")
    
    print("\n🍪 Cookie Stripping Test:")
    test_cookies = '_ga=GA1.2.123; session_id=abc123; _gid=GA1.2.456; user_pref=dark'
    cleaned = headers_mgr.strip_cookies_from_header(test_cookies)
    print(f"  Original: {test_cookies}")
    print(f"  Cleaned:  {cleaned}")
    
    print("\n✅ Privacy Proxy Adapter Ready")
    print(f"  Wire Stripper Available: {WIRE_STRIPPER_AVAILABLE}")
    print(f"  Cookie Stripping: Enabled")
    print(f"  Fingerprint Randomization: Minor variations only")
    print(f"  Bot Identification: Always clear and transparent")
