# Source Validation Guide

Test data source accessibility before running scrapers to catch issues early.

## 🎯 Features

- **URL Accessibility Testing** - Check if endpoints are reachable
- **Format Validation** - Verify CSV, PDF, JSON, API formats
- **Response Time Monitoring** - Track performance
- **Error Detection** - Identify connection issues, timeouts, 404s
- **Pre-Flight Checks** - Run before expensive scraping operations

## 🖥️ Admin Panel Usage

### Quick Test (Recommended)

1. Open admin panel: http://localhost:8000
2. Find the scraper you want to test
3. Click the **"🔍 Test"** button in the top-right corner
4. View results instantly:

```
✅ 2/2 sources accessible
✅ Healthcare datasets (570ms)
✅ Budget datasets (148ms)
```

### Results Indicators

| Icon | Meaning | Description |
|------|---------|-------------|
| ✅ | All Pass | All sources accessible |
| ⚠️ | Partial | Some sources accessible |
| ❌ | Failed | All sources failed |

### Example Output

**Success:**
```
✅ 2/2 sources accessible
✅ Main portal (415ms)
✅ Alternative access (954ms)
```

**Partial Failure:**
```
⚠️ 1/2 sources accessible
✅ Healthcare datasets (570ms)
❌ Budget datasets
   Status: 404
   Error: Not Found
```

**Complete Failure:**
```
❌ 0/2 sources accessible
❌ Main portal
   Error: Connection failed - host unreachable
❌ API endpoint
   Error: Timeout after 10s
```

## 🔧 CLI Usage

### Validate a Specific Scraper

```bash
cd hippocratic
python data_sources/source_validator.py openfiscal
```

Output:
```
🔍 Validating sources for: openfiscal

📊 California Open FI$Cal
   Total sources: 2
   ✅ Accessible: 2
   ❌ Failed: 0

✅ Main portal
   URL: https://open.fiscal.ca.gov/
   Status: 200 (415ms)
   Type: text/html
```

### Available Scrapers

```bash
# Validate Open FI$Cal
python data_sources/source_validator.py openfiscal

# Validate State Controller
python data_sources/source_validator.py sco

# Validate data.ca.gov
python data_sources/source_validator.py data_ca_gov

# Validate CHHS Portal
python data_sources/source_validator.py chhs
```

### Exit Codes

- **0** - All sources accessible
- **1** - One or more sources failed

Use in scripts:
```bash
if python data_sources/source_validator.py openfiscal; then
    echo "Sources OK, starting scraper..."
    python data_sources/scrape_openfiscal.py
else
    echo "Sources not accessible, aborting."
    exit 1
fi
```

## 🐍 Python API

### Basic Usage

```python
from source_validator import SourceValidator

validator = SourceValidator()

# Validate all sources for a scraper
result = validator.validate_scraper_sources('openfiscal')

if result['summary']['all_accessible']:
    print("✅ All sources accessible!")
    # Run scraper
else:
    print(f"❌ {result['summary']['failed']} sources failed")
    for source in result['sources']:
        if not source['accessible']:
            print(f"  - {source['description']}: {source['error']}")

validator.close()
```

### Validate Specific Formats

```python
from source_validator import SourceValidator

validator = SourceValidator(timeout=15)  # Custom timeout

# CSV file
csv_result = validator.validate_csv(
    'https://data.ca.gov/dataset.csv',
    expected_columns=['name', 'address', 'license']
)

if csv_result['accessible'] and csv_result['valid_format']:
    print(f"✅ CSV valid with {len(csv_result['columns'])} columns")
    if not csv_result['expected_columns_present']:
        print(f"⚠️ Missing columns: {csv_result['missing_columns']}")

# PDF file
pdf_result = validator.validate_pdf('https://sco.ca.gov/budget.pdf')

if pdf_result['valid_format']:
    print(f"✅ Valid PDF ({pdf_result['content_length']} bytes)")

# JSON API
json_result = validator.validate_json(
    'https://api.example.com/data',
    expected_keys=['results', 'total', 'page']
)

if json_result['valid_format']:
    print(f"✅ Valid JSON with keys: {json_result['top_level_keys']}")

validator.close()
```

### Validate Multiple Endpoints

```python
# API with multiple endpoints
api_result = validator.validate_api(
    base_url='https://data.chhs.ca.gov/api/v1',
    endpoints=[
        'datasets',
        'metadata',
        'search?q=health'
    ]
)

print(f"Accessible: {api_result['summary']['accessible']}/{api_result['summary']['total']}")
```

### SODA API (Socrata)

```python
# CHHS uses Socrata Open Data API
soda_result = validator.validate_soda_api(
    domain='data.chhs.ca.gov',
    dataset_id='abcd-1234',
    app_token='your_token_here'  # Optional
)

if soda_result['accessible']:
    print(f"Dataset: {soda_result['metadata']['name']}")
    print(f"Columns: {soda_result['metadata']['columns']}")
```

### CKAN API (data.ca.gov)

```python
# data.ca.gov uses CKAN
ckan_result = validator.validate_ckan_api(
    domain='data.ca.gov',
    package_id='healthcare-facilities'
)

if ckan_result['accessible']:
    print(f"Package: {ckan_result['metadata']['name']}")
    print(f"Resources: {ckan_result['metadata']['resources']}")
    
    for resource in ckan_result['resources']:
        status = "✅" if resource['accessible'] else "❌"
        print(f"{status} {resource['name']} ({resource['format']})")
```

## 📊 Validation Results Structure

```python
{
    'scraper': 'openfiscal',
    'name': 'California Open FI$Cal',
    'timestamp': '2026-01-29T10:30:00',
    'sources': [
        {
            'url': 'https://open.fiscal.ca.gov/',
            'description': 'Main portal',
            'expected_type': 'portal',
            'accessible': True,
            'status_code': 200,
            'content_type': 'text/html',
            'content_length': '45231',
            'response_time_ms': 415,
            'error': None
        },
        # ... more sources
    ],
    'summary': {
        'total': 2,
        'accessible': 2,
        'failed': 0,
        'all_accessible': True
    }
}
```

## 🔍 What Gets Validated

### For Each Scraper

| Scraper | Sources Validated |
|---------|-------------------|
| **openfiscal** | Open FI$Cal portal, By The Numbers portal |
| **sco** | Raw data portal, Public pay API |
| **data_ca_gov** | Healthcare API, Budget API |
| **chhs** | CHHS API metadata, Dataset browser |

### Validation Checks

1. **HTTP Status** - 200 OK expected
2. **Response Time** - Measured in milliseconds
3. **Content Type** - Verify expected format (HTML, JSON, CSV, PDF)
4. **Content Length** - File size (if available)
5. **Redirects** - Follow and validate final URL
6. **Timeout** - 10 second default (configurable)
7. **SSL/TLS** - Certificate validation
8. **Format Structure** - Parse and validate data format

### CSV-Specific Checks

- ✅ Valid CSV structure
- ✅ Header row present
- ✅ Expected columns exist
- ✅ Sample rows parseable

### JSON-Specific Checks

- ✅ Valid JSON syntax
- ✅ Expected keys present
- ✅ Data type validation (object vs array)
- ✅ Array length

### PDF-Specific Checks

- ✅ Valid PDF magic number (`%PDF`)
- ✅ Content-Type header
- ✅ File size reasonable

## 🚨 Common Issues

### Issue: Connection Timeout

```
❌ Timeout after 10s
```

**Solution:** Increase timeout in validator
```python
validator = SourceValidator(timeout=30)
```

### Issue: 403 Forbidden

```
❌ Status: 403
```

**Causes:**
- Bot detection (use privacy proxy)
- Missing authentication
- Rate limiting

**Solution:** Enable privacy features or add auth token

### Issue: 404 Not Found

```
❌ Status: 404
```

**Causes:**
- URL changed
- Dataset removed
- Typo in URL

**Solution:** Update source URL in `source_validator.py`

### Issue: Invalid Format

```
❌ CSV parse error: Expected comma delimiter
```

**Causes:**
- Server returned HTML error page instead of CSV
- File format changed
- Corrupted download

**Solution:** Check actual response content, may need authentication

## 🔄 Integration with Scrapers

### Pre-Flight Check in Scraper

```python
from source_validator import SourceValidator

def scrape_with_validation():
    # Validate before scraping
    validator = SourceValidator()
    result = validator.validate_scraper_sources('openfiscal')
    
    if not result['summary']['all_accessible']:
        logger.error("Pre-flight check failed!")
        for source in result['sources']:
            if not source['accessible']:
                logger.error(f"  {source['description']}: {source['error']}")
        return False
    
    validator.close()
    
    # All sources OK, proceed with scraping
    logger.info("Pre-flight check passed ✅")
    # ... actual scraping code ...
    
    return True
```

### GitHub Actions Integration

```yaml
name: Scrape Open FI$Cal

on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM daily

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      # Validate sources first
      - name: Validate data sources
        run: |
          python data_sources/source_validator.py openfiscal
      
      # Only run scraper if validation passed
      - name: Run scraper
        if: success()
        run: |
          python data_sources/scrape_openfiscal.py
```

## 📈 Best Practices

1. **Always validate before scraping** - Catch issues early
2. **Run validation daily** - Monitor source availability
3. **Log validation results** - Track downtime patterns
4. **Set reasonable timeouts** - Balance speed vs reliability
5. **Handle partial failures** - Some sources may be temporarily down
6. **Update sources promptly** - When validation detects changes
7. **Monitor response times** - Detect performance degradation

## 🔐 Privacy & Ethics

The validator:
- ✅ Uses proper User-Agent identification
- ✅ Respects robots.txt (manual check recommended)
- ✅ Makes minimal HEAD/GET requests
- ✅ Downloads only necessary data (samples only)
- ✅ Implements timeout limits
- ✅ Uses established HTTP standards

For production scraping, enable full ethical scraping features.

---

**Validate Early. Scrape Confidently.** 🚀
