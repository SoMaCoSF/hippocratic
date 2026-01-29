# GitHub Actions Automation Setup

Complete guide for setting up automated data scraping with GitHub Actions.

## 🤖 Overview

Four automated workflows run on schedule to continuously gather data:

1. **Open FI$Cal Scraper** - Mondays 6 AM UTC
2. **State Controller Data** - Tuesdays 6 AM UTC  
3. **API Data Fetcher** - Wednesdays 6 AM UTC
4. **Budget Parser** - Thursdays 6 AM UTC

## 📅 Workflow Schedule

```yaml
# scrape-openfiscal.yml - Every Monday
- cron: '0 6 * * 1'

# scrape-sco-data.yml - Every Tuesday
- cron: '0 6 * * 2'

# fetch-api-data.yml - Every Wednesday
- cron: '0 6 * * 3'

# parse-budgets.yml - Every Thursday
- cron: '0 6 * * 4'
```

All workflows can also be **manually triggered** via the Actions tab.

## 🔧 Setup Instructions

### 1. Enable GitHub Actions

GitHub Actions should be enabled by default. Verify:

1. Go to your repository on GitHub
2. Click **Settings** → **Actions** → **General**
3. Ensure "Allow all actions and reusable workflows" is selected
4. Click **Save**

### 2. Configure Secrets (Optional - for Proxy)

If you want to use proxies to avoid rate limits:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add:
   - `USE_PROXY` = `true`
   - `PROXY_URL` = `http://username:password@proxy-server:port`

**Recommended Proxy Providers:**
- [BrightData](https://brightdata.com/) - Best for .gov sites
- [Oxylabs](https://oxylabs.io/) - Residential proxies
- [Smartproxy](https://smartproxy.com/) - Budget option
- [IPRoyal](https://iproyal.com/) - Datacenter proxies

### 3. Test Locally First

Before deploying to GitHub Actions, test scrapers locally:

```bash
# Install dependencies
pip install seleniumbase requests pandas openpyxl pdfplumber

# Install Chrome driver
sbase install chromedriver latest

# Test Open FI$Cal scraper
cd data_sources
python scrape_openfiscal.py --headless

# Test SCO scraper
python seleniumbase_scraper.py --headless

# Test API fetcher
python quick_fetch.py

# Test budget parser
python budget_parser.py --parse-all
```

### 4. Manual Trigger (First Run)

To test the workflows:

1. Go to **Actions** tab on GitHub
2. Select a workflow (e.g., "Scrape Open FI$Cal Data")
3. Click **Run workflow** → **Run workflow**
4. Monitor the job logs

### 5. View Results

After successful runs:

- **Data Files**: Check `data/budget/`, `data/metadata/`, `data/processed/`
- **Database**: `local.db` will be updated
- **Admin Dashboard**: View logs at `https://hippocratic.vercel.app/ingest`
- **Commits**: Automated commits from `github-actions[bot]`

## 🔍 Monitoring

### GitHub Actions Dashboard

View all workflow runs:
```
https://github.com/YOUR_USERNAME/hippocratic/actions
```

### Check Workflow Status

Each workflow logs:
- ✅ Success/❌ Failure status
- Number of files downloaded
- Execution time
- Any error messages

### Admin Dashboard

Your web app dashboard shows:
- Recent ingestion logs
- Success/error counts
- Data source status
- Budget statistics

## 🐛 Troubleshooting

### Workflow Fails with "Permission denied"

**Fix**: Enable write permissions for workflows
1. **Settings** → **Actions** → **General**
2. Scroll to "Workflow permissions"
3. Select "Read and write permissions"
4. Click **Save**

### Selenium/Chrome Issues

**Fix**: The workflow auto-installs ChromeDriver:
```yaml
- name: Install Chrome for Selenium
  run: sbase install chromedriver latest
```

If issues persist, update SeleniumBase:
```bash
pip install --upgrade seleniumbase
```

### Rate Limiting / 403 Errors

**Fix**: Enable proxy rotation
1. Add secrets: `USE_PROXY=true`, `PROXY_URL=your_proxy`
2. Or add multiple proxies to `data_sources/proxies.txt`

### Database Lock Errors

**Fix**: The workflows run on different days to avoid conflicts. If you manually trigger multiple workflows, wait for each to complete.

## 🔄 Proxy Configuration

### Environment Variables

```bash
# Enable proxy
export USE_PROXY=true

# Single proxy
export PROXY_URL="http://username:password@proxy.example.com:8080"

# Rotation strategy
export PROXY_ROTATION="random"  # or "round-robin", "sticky"
```

### Proxy List File

Edit `data_sources/proxies.txt`:

```
# One proxy per line
http://proxy1.example.com:8080
http://user:pass@proxy2.example.com:8080
http://proxy3.example.com:8080
```

### Test Proxy Config

```bash
cd data_sources
python proxy_config.py
```

## 📊 Expected Data Flow

```
GitHub Actions (Scheduled)
    ↓
Run Scrapers (SeleniumBase)
    ↓
Download CSVs/PDFs/Excel
    ↓
Save to data/ directory
    ↓
Update local.db
    ↓
Commit changes (github-actions bot)
    ↓
Push to repository
    ↓
Vercel auto-deploys
    ↓
Dashboard shows new data
```

## 🚨 Fraud Detection Automation

The **Budget Parser** workflow includes fraud detection:

```yaml
- name: Create GitHub issue for anomalies
  if: success()
  uses: actions/github-script@v7
```

**Triggers automatic issue creation when:**
- Budget amounts exceed thresholds
- Duplicate facility payments detected
- Missing required documentation
- Suspicious payment patterns

Issues are labeled: `fraud-alert`, `automated`

## 🎯 Next Steps

1. **Run Manual Tests**: Trigger each workflow once
2. **Monitor First Week**: Check daily for any failures
3. **Adjust Schedules**: Modify cron if needed (more/less frequent)
4. **Add More Sources**: Create new workflows for additional data sources
5. **Set Up Alerts**: Configure GitHub notifications for workflow failures

## 📝 Customization

### Change Schedule

Edit the `cron` expression in workflow files:

```yaml
# Every day at 3 AM UTC
- cron: '0 3 * * *'

# Twice a week (Monday & Thursday)
- cron: '0 6 * * 1,4'

# First day of each month
- cron: '0 6 1 * *'
```

### Add New Data Source

1. Create scraper: `data_sources/scrape_new_source.py`
2. Create workflow: `.github/workflows/scrape-new-source.yml`
3. Add to database: Update `data_sources/seed_data.sql`
4. Test locally, then push

## 🔐 Security Notes

- Never commit proxy credentials to the repo
- Use GitHub Secrets for sensitive data
- Rotate proxy credentials regularly
- Monitor for suspicious access patterns
- Review automated commits periodically

## ✅ Success Criteria

Your automation is working correctly when:

✅ Workflows run on schedule without errors  
✅ New data appears in `data/` directories  
✅ `local.db` is updated with new records  
✅ Admin dashboard shows ingestion logs  
✅ No rate limiting or 403 errors  
✅ Fraud alerts create GitHub issues automatically  

---

**Status**: 🚀 Ready to Deploy  
**Maintainer**: somacosf@gmail.com  
**Last Updated**: 2026-01-29
