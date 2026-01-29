# 🤖 SeleniumBase Guide for Budget Data Scraping

## Overview

[SeleniumBase](https://github.com/seleniumbase/SeleniumBase) is a powerful Python framework for web automation, created by the maintainer of Selenium. It's perfect for scraping California government budget data that uses JavaScript, has anti-bot protection, or requires interaction.

**Creator:** Michael Mintz (@mdmintz)  
**GitHub:** https://github.com/seleniumbase/SeleniumBase  
**Stars:** 12.1k+  
**Tutorial:** www.upscrolled.com

---

## Why SeleniumBase for Government Sites?

### Problems with Standard Scraping:
- ❌ JavaScript-heavy pages (React, Angular, Vue)
- ❌ Bot detection (Cloudflare, DataDome)
- ❌ Dynamic content loading
- ❌ CAPTCHA challenges
- ❌ Session management
- ❌ Cookie consent popups

### SeleniumBase Solutions:
- ✅ **Undetected Chrome Mode** (`uc=True`) - Bypasses bot detection
- ✅ **JavaScript Execution** - Handles dynamic content
- ✅ **Auto-wait** - Waits for elements to load
- ✅ **Screenshot Capture** - Document your scraping
- ✅ **Multiple Browsers** - Chrome, Firefox, Edge
- ✅ **Headless Mode** - Run in background
- ✅ **CDP Mode** - Chrome DevTools Protocol for stealth

---

## Installation

```bash
pip install seleniumbase
```

**Verify installation:**
```bash
seleniumbase install
```

This installs browser drivers automatically.

---

## Basic Usage

### 1. Simple Page Visit
```python
from seleniumbase import SB

with SB(uc=True) as sb:  # uc=True = Undetected Chrome
    sb.open("https://bythenumbers.sco.ca.gov/")
    sb.save_screenshot("sco_portal.png")
    print(sb.get_title())
```

### 2. Find and Click Elements
```python
with SB(uc=True) as sb:
    sb.open("https://data.ca.gov/")
    
    # Wait for and click element
    sb.click('a:contains("Datasets")')
    
    # Type in search box
    sb.type('input[name="q"]', "healthcare budget")
    
    # Press enter
    sb.press_keys('input[name="q"]', "\n")
    
    sb.sleep(2)  # Wait for results
```

### 3. Extract Data
```python
with SB(uc=True) as sb:
    sb.open("https://ebudget.ca.gov/")
    
    # Get all links
    links = sb.find_elements("a")
    for link in links:
        text = link.text
        href = link.get_attribute("href")
        print(f"{text} -> {href}")
    
    # Get page text
    page_source = sb.get_page_source()
```

---

## Budget Scraping Examples

### Example 1: SCO By The Numbers
```python
from seleniumbase import SB
from pathlib import Path

def scrape_sco_expenditures():
    """Scrape State Controller expenditure data"""
    
    with SB(uc=True, headless=False) as sb:
        # Navigate to portal
        sb.open("https://bythenumbers.sco.ca.gov/")
        sb.sleep(2)
        
        # Look for "Raw Data" link
        try:
            sb.click('a:contains("Raw Data")')
            sb.sleep(2)
        except:
            print("Raw Data link not found, trying alternative...")
        
        # Look for download button
        try:
            sb.click('button:contains("Download")')
            sb.sleep(1)
            
            # Select CSV format
            sb.click('a:contains("CSV")')
            
            print("✓ Download initiated")
        except:
            print("Manual download required")
        
        # Keep browser open for manual interaction
        input("Press Enter after downloading files...")
```

### Example 2: eBudget Open Data
```python
def scrape_ebudget_json():
    """Scrape eBudget structured data"""
    
    with SB(uc=True) as sb:
        sb.open("https://ebudget.ca.gov/opendata/")
        sb.sleep(3)
        
        # Execute JavaScript to find JSON endpoints
        json_links = sb.execute_script("""
            return Array.from(document.querySelectorAll('a'))
                .filter(a => a.href.includes('.json'))
                .map(a => a.href);
        """)
        
        print(f"Found {len(json_links)} JSON endpoints:")
        for link in json_links:
            print(f"  {link}")
        
        return json_links
```

### Example 3: DHCS Fiscal Data (Excel Files)
```python
import time

def scrape_dhcs_excel():
    """Download Excel files from DHCS"""
    
    with SB(uc=True, headless=False) as sb:
        sb.open("https://www.dhcs.ca.gov/dataandstats/statistics/Pages/default.aspx")
        sb.sleep(3)
        
        # Find all Excel file links
        excel_links = sb.find_elements('a[href$=".xlsx"], a[href$=".xls"]')
        
        print(f"Found {len(excel_links)} Excel files")
        
        for i, link in enumerate(excel_links, 1):
            try:
                text = link.text.strip()
                href = link.get_attribute("href")
                
                if 'budget' in text.lower() or 'fiscal' in text.lower():
                    print(f"{i}. Downloading: {text}")
                    link.click()
                    time.sleep(2)  # Wait for download
            except:
                continue
```

---

## Advanced Features

### 1. Handle CAPTCHA
```python
with SB(uc=True) as sb:
    sb.open("https://protected-site.ca.gov/")
    
    # If CAPTCHA appears, SeleniumBase UC mode often bypasses it
    # If not, pause for manual solving:
    if sb.is_element_visible("iframe[title*='reCAPTCHA']"):
        input("Solve CAPTCHA and press Enter...")
```

### 2. Handle Cookie Consent
```python
with SB(uc=True) as sb:
    sb.open("https://data.ca.gov/")
    
    # Accept cookies if popup appears
    try:
        sb.click('button:contains("Accept")', timeout=5)
    except:
        pass  # No cookie popup
```

### 3. Wait for Dynamic Content
```python
with SB(uc=True) as sb:
    sb.open("https://dynamic-site.ca.gov/")
    
    # Wait for specific element
    sb.wait_for_element("div.data-loaded", timeout=30)
    
    # Wait for text to appear
    sb.wait_for_text("Total Budget:", "div.summary")
    
    # Wait for element to disappear (loading spinner)
    sb.wait_for_element_not_visible("div.spinner")
```

### 4. Extract Tables
```python
with SB(uc=True) as sb:
    sb.open("https://budget-site.ca.gov/")
    
    # Get table as list of lists
    table = sb.execute_script("""
        const table = document.querySelector('table.budget-data');
        const rows = Array.from(table.rows);
        return rows.map(row => 
            Array.from(row.cells).map(cell => cell.textContent.trim())
        );
    """)
    
    for row in table:
        print(row)
```

### 5. Download Files
```python
import os

def download_with_seleniumbase():
    # Set download directory
    download_dir = os.path.join(os.getcwd(), "downloads")
    
    with SB(uc=True, downloads_dir=download_dir) as sb:
        sb.open("https://data-portal.ca.gov/")
        
        # Click download button
        sb.click('a:contains("Download CSV")')
        
        # Wait for download to complete
        sb.sleep(5)
        
        # Check downloads folder
        files = os.listdir(download_dir)
        print(f"Downloaded: {files}")
```

---

## Best Practices for .gov Sites

### 1. **Use Undetected Mode**
```python
with SB(uc=True) as sb:  # Always use uc=True for .gov sites
    pass
```

### 2. **Add Delays**
```python
sb.open("https://site.ca.gov/")
sb.sleep(2)  # Let page fully load
sb.click("button")
sb.sleep(1)  # Wait between actions
```

### 3. **Handle Errors Gracefully**
```python
try:
    sb.click('button:contains("Download")', timeout=10)
except Exception as e:
    print(f"Download button not found: {e}")
    # Try alternative method
```

### 4. **Take Screenshots**
```python
sb.save_screenshot("step1_login.png")
sb.click("button#login")
sb.save_screenshot("step2_dashboard.png")
```

### 5. **Respect Rate Limits**
```python
import time

for url in urls:
    sb.open(url)
    # Scrape data
    time.sleep(5)  # Be nice to government servers
```

---

## California Budget Scraping Workflow

### Complete Example
```python
from seleniumbase import SB
import pandas as pd
from pathlib import Path
import time

class CaliforniaBudgetScraper:
    def __init__(self):
        self.data_dir = Path("data/budget")
        self.data_dir.mkdir(parents=True, exist_ok=True)
    
    def scrape_all_sources(self):
        """Scrape all California budget sources"""
        
        sources = [
            {
                'name': 'SCO Expenditures',
                'url': 'https://bythenumbers.sco.ca.gov/',
                'method': self.scrape_sco
            },
            {
                'name': 'eBudget Data',
                'url': 'https://ebudget.ca.gov/opendata/',
                'method': self.scrape_ebudget
            },
            {
                'name': 'DHCS Fiscal',
                'url': 'https://www.dhcs.ca.gov/dataandstats/statistics/',
                'method': self.scrape_dhcs
            }
        ]
        
        results = []
        
        for source in sources:
            print(f"\n{'='*60}")
            print(f"Scraping: {source['name']}")
            print(f"{'='*60}")
            
            try:
                result = source['method']()
                results.append({
                    'source': source['name'],
                    'status': 'success',
                    'data': result
                })
            except Exception as e:
                print(f"❌ Error: {e}")
                results.append({
                    'source': source['name'],
                    'status': 'error',
                    'error': str(e)
                })
            
            time.sleep(5)  # Rate limiting
        
        return results
    
    def scrape_sco(self):
        """Scrape SCO data"""
        with SB(uc=True, headless=False) as sb:
            sb.open("https://bythenumbers.sco.ca.gov/")
            sb.sleep(3)
            
            # Take screenshot
            screenshot = self.data_dir / "sco_screenshot.png"
            sb.save_screenshot(str(screenshot))
            
            # Look for data links
            links = sb.find_elements("a")
            data_links = []
            
            for link in links:
                text = link.text.lower()
                if any(kw in text for kw in ['data', 'download', 'export', 'csv']):
                    data_links.append({
                        'text': link.text,
                        'href': link.get_attribute('href')
                    })
            
            return {
                'screenshot': str(screenshot),
                'links_found': len(data_links),
                'data_links': data_links
            }
    
    def scrape_ebudget(self):
        """Scrape eBudget data"""
        # Similar implementation
        pass
    
    def scrape_dhcs(self):
        """Scrape DHCS data"""
        # Similar implementation
        pass

# Run scraper
if __name__ == '__main__':
    scraper = CaliforniaBudgetScraper()
    results = scraper.scrape_all_sources()
    
    print("\n" + "="*60)
    print("SCRAPING COMPLETE")
    print("="*60)
    for result in results:
        status_icon = "✅" if result['status'] == 'success' else "❌"
        print(f"{status_icon} {result['source']}: {result['status']}")
```

---

## Debugging Tips

### 1. **Run in Non-Headless Mode**
```python
with SB(uc=True, headless=False) as sb:  # See what's happening
    pass
```

### 2. **Use Breakpoints**
```python
sb.open("https://site.ca.gov/")
import pdb; pdb.set_trace()  # Pause here
sb.click("button")
```

### 3. **Check Element Exists**
```python
if sb.is_element_visible("button#download"):
    sb.click("button#download")
else:
    print("Button not found")
```

### 4. **Print Page Source**
```python
print(sb.get_page_source())
```

---

## Resources

- **Official Docs:** https://seleniumbase.io/
- **GitHub:** https://github.com/seleniumbase/SeleniumBase
- **Tutorial Video:** www.upscrolled.com
- **Examples:** https://github.com/seleniumbase/SeleniumBase/tree/master/examples
- **Discord:** Join for support and tips

---

## Next Steps

1. **Test the scraper:** `python data_sources/seleniumbase_scraper.py`
2. **Customize for specific sites:** Modify selectors and workflows
3. **Automate downloads:** Set up scheduled scraping
4. **Parse downloaded data:** Use pandas to process CSV/Excel files
5. **Load to database:** Insert into government_budgets table

---

**SeleniumBase makes scraping .gov sites easy and reliable!** 🤖✨

*Reference: SeleniumBase by @mdmintz - 12.1k+ stars on GitHub*
