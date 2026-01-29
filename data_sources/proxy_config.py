"""
Proxy configuration for web scraping to avoid rate limits and bot detection.
Supports multiple proxy providers and rotation strategies.
"""

import os
import random
from typing import Optional, Dict, List

class ProxyConfig:
    """Manages proxy configuration for scrapers."""
    
    def __init__(self):
        self.use_proxy = os.getenv('USE_PROXY', 'false').lower() == 'true'
        self.proxy_url = os.getenv('PROXY_URL')
        self.proxy_list_file = os.getenv('PROXY_LIST_FILE', 'data_sources/proxies.txt')
        self.proxy_rotation = os.getenv('PROXY_ROTATION', 'random')  # 'random', 'round-robin', 'sticky'
        
        self.proxies: List[str] = []
        self.current_index = 0
        
        if self.use_proxy:
            self._load_proxies()
    
    def _load_proxies(self):
        """Load proxies from environment or file."""
        if self.proxy_url:
            # Single proxy from environment
            self.proxies = [self.proxy_url]
        elif os.path.exists(self.proxy_list_file):
            # Multiple proxies from file
            with open(self.proxy_list_file, 'r') as f:
                self.proxies = [line.strip() for line in f if line.strip() and not line.startswith('#')]
        
        if not self.proxies:
            print("⚠️  Proxy enabled but no proxies configured. Running without proxy.")
            self.use_proxy = False
    
    def get_proxy(self) -> Optional[str]:
        """Get next proxy based on rotation strategy."""
        if not self.use_proxy or not self.proxies:
            return None
        
        if self.proxy_rotation == 'random':
            return random.choice(self.proxies)
        elif self.proxy_rotation == 'round-robin':
            proxy = self.proxies[self.current_index]
            self.current_index = (self.current_index + 1) % len(self.proxies)
            return proxy
        elif self.proxy_rotation == 'sticky':
            # Always use the first proxy
            return self.proxies[0]
        
        return None
    
    def get_proxy_dict(self) -> Optional[Dict[str, str]]:
        """Get proxy in requests-compatible dict format."""
        proxy = self.get_proxy()
        if proxy:
            return {
                'http': proxy,
                'https': proxy
            }
        return None
    
    def get_selenium_proxy(self) -> Optional[str]:
        """Get proxy in Selenium-compatible format."""
        return self.get_proxy()


# Popular free proxy providers (for testing only - use paid proxies in production)
FREE_PROXY_SOURCES = [
    'https://www.proxy-list.download/api/v1/get?type=http',
    'https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=10000&country=US',
    'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt'
]

# Recommended paid proxy providers (add your credentials to .env)
PAID_PROXY_PROVIDERS = {
    'brightdata': 'http://username:password@brd.superproxy.io:22225',
    'oxylabs': 'http://username:password@pr.oxylabs.io:7777',
    'smartproxy': 'http://username:password@gate.smartproxy.com:7000',
    'geosurf': 'http://username:password@shared.geosurf.com:8000'
}


def fetch_free_proxies(limit: int = 10) -> List[str]:
    """
    Fetch free proxies from public sources (for testing only).
    WARNING: Free proxies are unreliable and often blocked by .gov sites.
    """
    import requests
    
    proxies = []
    for source in FREE_PROXY_SOURCES:
        try:
            response = requests.get(source, timeout=10)
            if response.ok:
                proxy_list = response.text.strip().split('\n')
                proxies.extend([p.strip() for p in proxy_list if p.strip()])
        except Exception as e:
            print(f"Failed to fetch from {source}: {e}")
    
    # Return unique proxies, limited to specified count
    return list(set(proxies))[:limit]


def test_proxy(proxy: str, test_url: str = 'https://www.google.com') -> bool:
    """Test if a proxy is working."""
    import requests
    
    try:
        proxies = {'http': proxy, 'https': proxy}
        response = requests.get(test_url, proxies=proxies, timeout=10)
        return response.ok
    except Exception:
        return False


def setup_selenium_proxy(driver_options, proxy_url: str):
    """Configure Selenium ChromeOptions with proxy."""
    from selenium.webdriver.common.proxy import Proxy, ProxyType
    
    proxy = Proxy()
    proxy.proxy_type = ProxyType.MANUAL
    proxy.http_proxy = proxy_url
    proxy.ssl_proxy = proxy_url
    
    proxy.add_to_capabilities(driver_options.to_capabilities())
    
    return driver_options


if __name__ == '__main__':
    """Test proxy configuration."""
    config = ProxyConfig()
    
    print("🔧 Proxy Configuration:")
    print(f"  Use Proxy: {config.use_proxy}")
    print(f"  Proxies Loaded: {len(config.proxies)}")
    print(f"  Rotation Strategy: {config.proxy_rotation}")
    
    if config.proxies:
        print(f"\n🎲 Testing proxy rotation:")
        for i in range(5):
            proxy = config.get_proxy()
            print(f"  [{i+1}] {proxy}")
    
    # Test fetching free proxies
    print(f"\n🌐 Fetching free proxies (for testing):")
    free = fetch_free_proxies(limit=5)
    print(f"  Found {len(free)} free proxies")
    
    # Test a proxy
    if free:
        print(f"\n🧪 Testing first free proxy:")
        working = test_proxy(free[0])
        print(f"  {free[0]} - {'✅ Working' if working else '❌ Failed'}")
