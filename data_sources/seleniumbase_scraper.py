#!/usr/bin/env python3
"""
SeleniumBase Budget Data Scraper
Robust scraping of California government budget portals
"""

import sys
import time
from pathlib import Path
import logging

# Setup
sys.stdout.reconfigure(encoding='utf-8')
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

try:
    from seleniumbase import SB
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    logger.warning("SeleniumBase not available. Install with: pip install seleniumbase")


class BudgetScraper:
    """Scrape California government budget data using SeleniumBase"""
    
    def __init__(self):
        self.data_dir = Path(__file__).parent.parent / 'data' / 'budget'
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.downloads_dir = self.data_dir / 'downloads'
        self.downloads_dir.mkdir(exist_ok=True)
    
    def scrape_sco_portal(self):
        """
        Scrape State Controller's Office By The Numbers portal
        https://bythenumbers.sco.ca.gov/
        """
        if not SELENIUM_AVAILABLE:
            logger.error("SeleniumBase not installed")
            return
        
        logger.info("="*70)
        logger.info("🌐 SCRAPING SCO BY THE NUMBERS PORTAL")
        logger.info("="*70)
        
        with SB(uc=True, headless=False) as sb:  # uc=True enables undetected mode
            try:
                # Navigate to SCO portal
                logger.info("\n📍 Navigating to SCO portal...")
                sb.open("https://bythenumbers.sco.ca.gov/")
                sb.sleep(2)
                
                logger.info("✓ Page loaded successfully")
                
                # Take a screenshot
                screenshot = self.data_dir / 'sco_portal.png'
                sb.save_screenshot(str(screenshot))
                logger.info(f"📸 Screenshot saved: {screenshot}")
                
                # Look for data download links
                logger.info("\n🔍 Searching for data download links...")
                
                # Common patterns in government portals
                patterns = [
                    'a:contains("Raw Data")',
                    'a:contains("Download")',
                    'a:contains("Export")',
                    'a:contains("CSV")',
                    'button:contains("Download")',
                ]
                
                links_found = []
                for pattern in patterns:
                    try:
                        elements = sb.find_elements(pattern)
                        for el in elements:
                            text = el.text.strip()
                            href = el.get_attribute('href')
                            if text and href:
                                links_found.append({'text': text, 'href': href})
                                logger.info(f"  Found: {text} -> {href}")
                    except:
                        continue
                
                # Get page title and URL
                title = sb.get_title()
                url = sb.get_current_url()
                
                logger.info(f"\n📄 Page Title: {title}")
                logger.info(f"🔗 Current URL: {url}")
                
                # Extract visible text for analysis
                page_text = sb.get_page_source()
                
                # Look for dataset information
                if 'dataset' in page_text.lower() or 'expenditure' in page_text.lower():
                    logger.info("\n✓ Found expenditure/dataset references on page")
                
                logger.info(f"\n💡 Manual Download Instructions:")
                logger.info("   1. Browser window will stay open")
                logger.info("   2. Navigate to 'Raw Data' or 'Datasets' section")
                logger.info("   3. Download 'State Expenditure Detail' CSV")
                logger.info("   4. Files will be saved to data/budget/downloads/")
                
                # Keep browser open for manual interaction
                logger.info("\n⏸️  Browser will remain open for 60 seconds...")
                logger.info("   Use this time to manually download files if needed")
                time.sleep(60)
                
                return {
                    'status': 'success',
                    'title': title,
                    'url': url,
                    'links_found': len(links_found),
                    'screenshot': str(screenshot)
                }
                
            except Exception as e:
                logger.error(f"❌ Error scraping SCO portal: {e}")
                return {'error': str(e)}
    
    def scrape_ebudget_portal(self):
        """
        Scrape eBudget Open Data portal
        https://ebudget.ca.gov/opendata/
        """
        if not SELENIUM_AVAILABLE:
            logger.error("SeleniumBase not installed")
            return
        
        logger.info("\n="*70)
        logger.info("🌐 SCRAPING eBUDGET OPEN DATA PORTAL")
        logger.info("="*70)
        
        with SB(uc=True, headless=False) as sb:
            try:
                logger.info("\n📍 Navigating to eBudget portal...")
                sb.open("https://ebudget.ca.gov/opendata/")
                sb.sleep(3)
                
                logger.info("✓ Page loaded")
                
                # Take screenshot
                screenshot = self.data_dir / 'ebudget_portal.png'
                sb.save_screenshot(str(screenshot))
                logger.info(f"📸 Screenshot: {screenshot}")
                
                # Get page info
                title = sb.get_title()
                url = sb.get_current_url()
                
                logger.info(f"\n📄 Title: {title}")
                logger.info(f"🔗 URL: {url}")
                
                # Look for API endpoints or data links
                page_source = sb.get_page_source()
                
                # Search for JSON/API references
                if '.json' in page_source.lower():
                    logger.info("\n✓ Found JSON data references")
                
                # Look for download buttons
                try:
                    download_btns = sb.find_elements('a:contains("Download"), button:contains("Download")')
                    logger.info(f"\n🔽 Found {len(download_btns)} download buttons")
                except:
                    pass
                
                logger.info("\n⏸️  Browser open for 60 seconds for manual exploration...")
                time.sleep(60)
                
                return {
                    'status': 'success',
                    'title': title,
                    'screenshot': str(screenshot)
                }
                
            except Exception as e:
                logger.error(f"❌ Error: {e}")
                return {'error': str(e)}
    
    def scrape_dhcs_data(self):
        """
        Scrape Department of Health Care Services fiscal data
        https://www.dhcs.ca.gov/dataandstats/statistics/Pages/default.aspx
        """
        if not SELENIUM_AVAILABLE:
            logger.error("SeleniumBase not installed")
            return
        
        logger.info("\n="*70)
        logger.info("🌐 SCRAPING DHCS FISCAL DATA")
        logger.info("="*70)
        
        with SB(uc=True, headless=False) as sb:
            try:
                logger.info("\n📍 Navigating to DHCS...")
                sb.open("https://www.dhcs.ca.gov/dataandstats/statistics/Pages/default.aspx")
                sb.sleep(3)
                
                logger.info("✓ Page loaded")
                
                screenshot = self.data_dir / 'dhcs_data.png'
                sb.save_screenshot(str(screenshot))
                
                # Look for Excel/PDF downloads
                page_source = sb.get_page_source()
                
                if '.xlsx' in page_source or '.xls' in page_source:
                    logger.info("\n✓ Found Excel file references")
                
                if 'budget' in page_source.lower() or 'expenditure' in page_source.lower():
                    logger.info("✓ Found budget/expenditure references")
                
                logger.info("\n⏸️  Browser open for manual download...")
                time.sleep(60)
                
                return {
                    'status': 'success',
                    'screenshot': str(screenshot)
                }
                
            except Exception as e:
                logger.error(f"❌ Error: {e}")
                return {'error': str(e)}


def main():
    """Main entry point"""
    logger.info("\n🤖 SELENIUMBASE BUDGET DATA SCRAPER")
    logger.info("="*70)
    logger.info("Using SeleniumBase for robust web scraping")
    logger.info("Features:")
    logger.info("  ✓ Undetected Chrome mode (bypasses bot detection)")
    logger.info("  ✓ JavaScript execution")
    logger.info("  ✓ Dynamic content handling")
    logger.info("  ✓ Screenshot capture")
    logger.info("="*70)
    
    if not SELENIUM_AVAILABLE:
        logger.error("\n❌ SeleniumBase not installed")
        logger.info("Install with: pip install seleniumbase")
        return
    
    scraper = BudgetScraper()
    
    # Menu
    logger.info("\n📋 AVAILABLE SCRAPERS:")
    logger.info("  1. SCO By The Numbers (State Controller expenditures)")
    logger.info("  2. eBudget Open Data (State budget JSON/API)")
    logger.info("  3. DHCS Fiscal Data (Healthcare spending)")
    logger.info("  4. Run all scrapers")
    
    logger.info("\n🚀 Starting SCO portal scraper...")
    logger.info("   (Browser will open - you can manually navigate and download)")
    
    # Run SCO scraper
    result = scraper.scrape_sco_portal()
    
    logger.info("\n" + "="*70)
    logger.info("✅ SCRAPING COMPLETE")
    logger.info("="*70)
    logger.info(f"\n📁 Downloaded files location: {scraper.downloads_dir}")
    logger.info(f"📸 Screenshots saved to: {scraper.data_dir}")
    logger.info("\n💡 To scrape other portals, modify main() function")


if __name__ == '__main__':
    main()
