# 🏥 Hippocratic - California Healthcare Fraud Detection

> *"First, do no harm"* - Applied to data collection too.

A comprehensive platform for detecting healthcare fraud, waste, and abuse in California medical facilities using publicly available government data.

## 🎯 Mission

Protect vulnerable patients by identifying suspicious patterns in:
- Healthcare facility licensing and operations
- Financial disclosures and utilization reports
- Duplicate facility registrations (potential shell companies)
- Budget allocations and government spending
- Network analysis of ownership and administration

## ✨ Features

### 📊 Interactive Dashboards
- **Map View**: Geo-visualization of 5,000+ California healthcare facilities
- **Financial Analysis**: Revenue, expenses, and profitability tracking
- **Network Graph**: OSINT visualization of ownership networks
- **Duplicate Detection**: Identify facilities with matching addresses, phones, owners
- **Admin Dashboard**: Real-time data ingestion monitoring

### 🤖 Automated Data Collection
- **GitHub Actions**: Scheduled weekly scraping of government portals
- **45+ Data Sources**: Tracked from CA.gov, CDPH, HCAI, CHHS, CMS
- **Budget Parsing**: PDF, Excel, CSV parsing for financial data
- **Fraud Alerts**: Automatic GitHub issue creation for anomalies

### 🔐 Security & Ethics
- **Password Protected**: Admin functions require authentication
- **Ethical Scraping**: 3-second rate limits, robots.txt compliance
- **Transparent Logging**: All data collection logged publicly
- **Open Source**: Full transparency in methods and code

## 🚀 Quick Start

### Web Application (Localhost)

```bash
# Clone repository
git clone https://github.com/SoMaCoSF/hippocratic.git
cd hippocratic

# Install dependencies
cd web && npm install

# Start development server
npm run dev
```

Visit: `http://localhost:3000`

### Data Scrapers

```bash
# Install Python dependencies
pip install seleniumbase requests pandas openpyxl pdfplumber

# Install Chrome driver
sbase install chromedriver latest

# Run scrapers
cd data_sources
python scrape_openfiscal.py --headless
python quick_fetch.py
```

See [RUN_LOCALHOST.md](./RUN_LOCALHOST.md) for detailed instructions.

## 📚 Documentation

- **[ETHICAL_SCRAPING_POLICY.md](./ETHICAL_SCRAPING_POLICY.md)** - Our commitment to responsible data collection
- **[GITHUB_ACTIONS_SETUP.md](./GITHUB_ACTIONS_SETUP.md)** - Automated scraping setup
- **[RUN_LOCALHOST.md](./RUN_LOCALHOST.md)** - Local development guide
- **[CA_GOV_DATA_RESEARCH.md](./CA_GOV_DATA_RESEARCH.md)** - Data source inventory
- **[BUDGET_TRACKING.md](./data_sources/BUDGET_TRACKING.md)** - Budget system guide

## 🏗️ Architecture

```
hippocratic/
├── .github/workflows/       # GitHub Actions for automated scraping
├── web/                     # Next.js web application
│   ├── src/app/            # Pages (map, financials, ingest, etc)
│   └── src/lib/            # Database utilities
├── data_sources/            # Data collection scripts
│   ├── ethical_scraper.py  # Ethical scraping framework
│   ├── proxy_config.py     # Proxy rotation
│   └── *.py                # Individual scrapers
├── visualization/           # ManimGL network visualizations
├── data/                    # Scraped data (git-ignored except metadata)
└── local.db                # SQLite database
```

## 🤝 Ethical Data Collection

**We take ethics seriously.** Our scrapers:

✅ **Rate Limit**: 3 seconds minimum between requests  
✅ **Identify Properly**: Clear User-Agent with contact info  
✅ **Respect robots.txt**: 100% compliance  
✅ **Honor 429 Responses**: Exponential backoff on rate limits  
✅ **Off-Peak Hours**: Scheduled during low-traffic periods  
✅ **Transparent Logging**: All activity logged publicly  
✅ **Open Source**: Full code visibility  
✅ **Responsive**: 24-hour response to concerns  

**Contact**: somacosf@gmail.com

Read our full [Ethical Scraping Policy](./ETHICAL_SCRAPING_POLICY.md).

## 📊 Data Sources

### Currently Tracked (45+ sources)

**Healthcare Facility Data:**
- CDPH Licensed Healthcare Facility Listing
- HCAI Facility Bed Types & Counts
- CMS Provider of Service Files
- Hospice & Home Health Agency Utilization

**Financial Data:**
- HCAI Annual Utilization Reports
- Hospital Financial Disclosure
- Facility Cost Reports

**Budget Data:**
- California State Budget Portal
- Open FI$Cal Transparency Portal
- State Controller "By The Numbers"
- County Budget Documents

**Federal Data:**
- CMS Cost Reports
- Medicare Provider Data
- Medicaid Spending

See [CA_GOV_DATA_INVENTORY.md](./data_sources/CA_GOV_DATA_INVENTORY.md) for complete list.

## 🎨 Technology Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Responsive styling
- **Leaflet.js** - Interactive maps
- **ECharts** - Data visualizations

### Backend
- **SQLite** (libsql) - Embedded database
- **Next.js API Routes** - RESTful endpoints
- **Vercel** - Serverless deployment

### Data Collection
- **Python 3.11+** - Scraping scripts
- **SeleniumBase** - Browser automation
- **Pandas** - Data processing
- **PDFPlumber** - PDF parsing

### Automation
- **GitHub Actions** - Scheduled workflows
- **Proxy Rotation** - Rate limit protection

## 🗺️ Pages

### Public Pages
- `/` - Landing page
- `/map` - Interactive facility map (5,000+ facilities)
- `/explorer` - Data table view with sorting/filtering
- `/network` - OSINT network graph of connections
- `/stacked` - Duplicate facility detection
- `/financials` - Financial analysis with charts
- `/about` - Project documentation

### Protected Pages
- `/ingest` - Admin dashboard (authentication required)
  - Data source monitoring
  - Ingestion logs
  - Budget statistics
  - Manual CSV upload

## 🔒 Authentication

Admin functions are protected by email verification:

1. Access `/ingest`
2. Enter email: `somacosf@gmail.com`
3. Check console for verification key
4. Enter key to access dashboard

To add authorized emails, edit `web/src/app/api/auth/login/route.ts`:

```typescript
const AUTHORIZED_EMAILS = [
  'somacosf@gmail.com',
  'your-email@example.com'
];
```

## 🚨 Fraud Detection

The system automatically detects:

### Duplicate Facilities
- Same address, different license
- Same phone, different owner
- Same admin email across facilities
- Identical business names

### Financial Anomalies
- Revenue/expense mismatches
- Unusually high profit margins
- Missing required disclosures
- Inconsistent patient counts

### Budget Irregularities
- Duplicate payments to same facility
- Payments exceeding allocated budgets
- Missing documentation
- Suspicious timing patterns

**Alerts**: Anomalies create GitHub issues automatically via workflows.

## 📈 Deployment

### Vercel (Production)

```bash
cd web
vercel --prod
```

**Live URL**: https://hippocratic.vercel.app

### GitHub Actions (Automated)

Workflows run automatically on schedule:
- **Monday 6 AM UTC**: Open FI$Cal scraper
- **Tuesday 6 AM UTC**: State Controller scraper
- **Wednesday 6 AM UTC**: API data fetcher
- **Thursday 6 AM UTC**: Budget parser + fraud alerts

Manual trigger: GitHub → Actions → Select workflow → Run workflow

## 🧪 Testing

### Test Ethical Scraper

```bash
cd data_sources
python ethical_scraper.py
```

### Test Database Connection

```bash
python -c "import sqlite3; conn = sqlite3.connect('local.db'); print(f'Tables: {[t[0] for t in conn.execute(\"SELECT name FROM sqlite_master WHERE type=\\\"table\\\"\").fetchall()]}'); conn.close()"
```

### Test API Endpoints

```bash
# Start dev server
cd web && npm run dev

# Test endpoints
curl http://localhost:3000/api/facilities?limit=5
curl http://localhost:3000/api/financials?limit=5
curl http://localhost:3000/api/data-sources
```

## 🐛 Troubleshooting

### Port 3000 in use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### Database locked
```bash
rm .next/dev/lock
cd web && npm run dev
```

### Selenium issues
```bash
sbase install chromedriver latest
```

See [RUN_LOCALHOST.md](./RUN_LOCALHOST.md) for more troubleshooting.

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Follow ethical scraping guidelines
4. Add tests if applicable
5. Submit a pull request

**Code of Conduct**: Be respectful, ethical, and transparent.

## 📧 Contact

- **Email**: somacosf@gmail.com
- **GitHub Issues**: https://github.com/SoMaCoSF/hippocratic/issues
- **Response Time**: Within 24 hours

**For Government IT Teams**: We're happy to coordinate data collection, use alternative access methods, or adjust our practices. Please reach out!

## ⚖️ Legal

### Data Sources
All data collected is:
- ✅ Publicly available government data
- ✅ Required by law to be public (CPRA)
- ✅ Accessed through official portals
- ✅ Not protected by authentication

### Use of Data
- Academic/Research purpose (non-commercial)
- Public good mission (fraud detection)
- Protects vulnerable patients
- Supports government oversight

### Compliance
- Computer Fraud and Abuse Act (CFAA) ✅
- California Public Records Act (CPRA) ✅
- Terms of Service for each portal ✅
- Robots.txt directives ✅

## 📜 License

MIT License - See [LICENSE](./LICENSE) for details.

**Note**: While our code is MIT licensed, data collected from government sources may have separate terms of use. Please review source-specific policies.

## 🙏 Acknowledgments

- California Department of Public Health (CDPH)
- Healthcare Access and Information (HCAI)
- California Health and Human Services (CHHS)
- Centers for Medicare & Medicaid Services (CMS)
- California State Controller's Office

Thank you to the public servants who maintain these transparency portals.

## 📊 Stats

- **5,000+** healthcare facilities mapped
- **$2.1B+** in tracked healthcare spending
- **45+** government data sources
- **143** datasets discovered
- **26** budget sources identified
- **4** automated workflows
- **3 second** rate limit (very conservative)

---

**Built with ❤️ for California healthcare transparency**  
**Last Updated**: 2026-01-29  
**Status**: 🚀 Production Ready
