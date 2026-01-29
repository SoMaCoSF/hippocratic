#!/usr/bin/env python3
"""
Scrape California Open FI$Cal with SeleniumBase
Navigate portal and download actual expenditure data
"""

import sys
import time
from pathlib import Path
import logging

sys.stdout.reconfigure(encoding='utf-8')
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

try:
    from seleniumbase import SB
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False


def scrape_openfiscal():
    """
    Scrape Open FI$Cal portal with SeleniumBase
    https://open.fiscal.ca.gov/
    """
    if not SELENIUM_AVAILABLE:
        logger.error("SeleniumBase not installed: pip install seleniumbase")
        return
    
    logger.info("="*70)
    logger.info("🤖 SCRAPING OPEN FI$CAL WITH SELENIUMBASE")
    logger.info("="*70)
    logger.info("\nPortal: https://open.fiscal.ca.gov/")
    logger.info("Method: SeleniumBase undetected mode")
    logger.info("="*70)
    
    data_dir = Path(__file__).parent.parent / 'data' / 'budget' / 'openfiscal'
    data_dir.mkdir(parents=True, exist_ok=True)
    
    with SB(uc=True, headless=False) as sb:
        try:
            # Navigate to portal
            logger.info("\n📍 Step 1: Opening Open FI$Cal portal...")
            sb.open("https://open.fiscal.ca.gov/")
            sb.sleep(3)
            
            logger.info("✓ Portal loaded")
            
            # Take screenshot
            screenshot = data_dir / 'openfiscal_home.png'
            sb.save_screenshot(str(screenshot))
            logger.info(f"📸 Screenshot: {screenshot}")
            
            # Get page title
            title = sb.get_title()
            logger.info(f"📄 Page Title: {title}")
            
            # Look for download/data links
            logger.info("\n📍 Step 2: Searching for data download links...")
            
            try:
                # Common patterns for download links
                download_patterns = [
                    'a:contains("Download")',
                    'a:contains("Data")',
                    'a:contains("Expenditure")',
                    'a:contains("CSV")',
                    'button:contains("Download")'
                ]
                
                found_links = []
                for pattern in download_patterns:
                    try:
                        elements = sb.find_elements(pattern)
                        for el in elements:
                            text = el.text.strip()
                            href = el.get_attribute('href')
                            if text and href:
                                found_links.append({'text': text, 'href': href})
                                logger.info(f"  Found: {text}")
                    except:
                        continue
                
                if found_links:
                    logger.info(f"\n✓ Found {len(found_links)} potential download links")
                else:
                    logger.info("\n⚠️  No obvious download links found")
                    logger.info("   Will explore navigation menu...")
                
            except Exception as e:
                logger.warning(f"Error searching links: {e}")
            
            # Try to find and click "Download Expenditures" link
            logger.info("\n📍 Step 3: Looking for expenditure download page...")
            
            try:
                # Check if there's a download expenditures link
                if sb.is_element_visible('a:contains("Download Expenditures")'):
                    logger.info("✓ Found 'Download Expenditures' link")
                    sb.click('a:contains("Download Expenditures")')
                    sb.sleep(2)
                    
                    screenshot2 = data_dir / 'openfiscal_download_page.png'
                    sb.save_screenshot(str(screenshot2))
                    logger.info(f"📸 Download page screenshot: {screenshot2}")
                    
                elif sb.is_element_visible('a[href*="download"]'):
                    logger.info("✓ Found download link in navigation")
                    sb.click('a[href*="download"]')
                    sb.sleep(2)
                    
                else:
                    logger.info("⚠️  No direct download link found")
                    logger.info("   Checking page source for data URLs...")
                    
                    page_source = sb.get_page_source()
                    if '.csv' in page_source.lower():
                        logger.info("✓ Found CSV references in page source")
                    if 'api' in page_source.lower():
                        logger.info("✓ Found API references in page source")
                
            except Exception as e:
                logger.warning(f"Navigation error: {e}")
            
            # Get current URL
            current_url = sb.get_current_url()
            logger.info(f"\n🔗 Current URL: {current_url}")
            
            # Extract all links for analysis
            logger.info("\n📍 Step 4: Extracting all links from page...")
            all_links = sb.find_elements("a")
            
            data_links = []
            for link in all_links:
                try:
                    href = link.get_attribute('href')
                    text = link.text.strip()
                    
                    if href and any(kw in href.lower() for kw in ['data', 'download', 'csv', 'api', 'expenditure']):
                        data_links.append({'text': text, 'href': href})
                except:
                    continue
            
            if data_links:
                logger.info(f"\n✓ Found {len(data_links)} data-related links:")
                for link in data_links[:10]:  # Show first 10
                    logger.info(f"  {link['text'][:50]}: {link['href']}")
            
            # Manual interaction instructions
            logger.info("\n" + "="*70)
            logger.info("⏸️  MANUAL INTERACTION MODE")
            logger.info("="*70)
            logger.info("\n📋 INSTRUCTIONS:")
            logger.info("1. Browser window is now open")
            logger.info("2. Navigate to data download section")
            logger.info("3. Click download buttons for CSV files")
            logger.info("4. Files will download to your Downloads folder")
            logger.info("5. Move files to: data/budget/openfiscal/")
            logger.info("\n⏰ Browser will stay open for 120 seconds...")
            logger.info("   (Press Ctrl+C to close early)")
            
            time.sleep(120)
            
            logger.info("\n" + "="*70)
            logger.info("✅ SCRAPING SESSION COMPLETE")
            logger.info("="*70)
            logger.info(f"\n📁 Check your Downloads folder for CSV files")
            logger.info(f"📸 Screenshots saved to: {data_dir}")
            
            return {
                'status': 'success',
                'title': title,
                'url': current_url,
                'data_links': len(data_links),
                'screenshots': [str(screenshot)]
            }
            
        except Exception as e:
            logger.error(f"❌ Error: {e}")
            return {'error': str(e)}


def main():
    """Main entry point"""
    logger.info("\n🤖 OPEN FI$CAL SELENIUMBASE SCRAPER")
    logger.info("="*70)
    logger.info("Using SeleniumBase for robust portal navigation")
    logger.info("Features:")
    logger.info("  ✓ Undetected mode (bypasses bot detection)")
    logger.info("  ✓ Manual interaction support")
    logger.info("  ✓ Screenshot documentation")
    logger.info("  ✓ Link extraction and analysis")
    logger.info("="*70)
    
    if not SELENIUM_AVAILABLE:
        logger.error("\n❌ SeleniumBase not installed")
        logger.info("Install: pip install seleniumbase")
        return
    
    result = scrape_openfiscal()
    
    if result and result.get('status') == 'success':
        logger.info("\n💡 NEXT STEPS:")
        logger.info("1. Check Downloads folder for CSV files")
        logger.info("2. Move CSVs to: data/budget/openfiscal/")
        logger.info("3. Run: python data_sources/fetch_openfiscal.py")
        logger.info("4. Data will be parsed into database")


if __name__ == '__main__':
    main()
