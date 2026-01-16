<!--
===============================================================================
file_id: SOM-DOC-0002-v1.0.0
name: README.md
description: Project overview, setup, and data pipeline for Hippocratic - CA healthcare facility compliance tool
project_id: HIPPOCRATIC
category: documentation
tags: [readme, healthcare, compliance, california, facilities, next.js]
created: 2026-01-16
modified: 2026-01-16
version: 1.0.0
agent:
  id: AGENT-PRIME-002
  name: agent_prime
  model: claude-opus-4-5-20251101
execution:
  type: documentation
  invocation: Read for setup and commands
===============================================================================
-->

# Hippocratic

**v1.0.0** | California Healthcare Facility License Compliance Tool

A Next.js web application for California healthcare facility license compliance checking. Designed for inspectors auditing hospice, home health, and adult health services for state license compliance.

**Live Demo**: [hippocratic.vercel.app](https://hippocratic.vercel.app)

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.1.2 (App Router) |
| Frontend | React 19.2.3, TypeScript 5.x |
| Styling | Tailwind CSS 4.x |
| Maps | Leaflet 1.9.4 + react-leaflet 5.0.0 |
| Charts | ECharts 6.0.0 |
| Data | Static JSON (no backend DB) |
| Data Processing | Python 3.13+ (openpyxl) |
| Deployment | Vercel |

---

## Directory Structure

```
hippocratic/
├── web/                           # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # Main map + search UI
│   │   │   ├── layout.tsx         # Root layout
│   │   │   ├── stacked/page.tsx   # Stacked facilities dashboard
│   │   │   └── components/
│   │   │       ├── MapClient.tsx  # Leaflet map
│   │   │       ├── FacilityCard.tsx
│   │   │       └── StackCharts.tsx
│   │   └── lib/
│   │       ├── facilities.ts      # Types & helpers
│   │       ├── observations.ts    # Local storage logic
│   │       └── stacking.ts        # Address grouping
│   └── public/data/state/CA/
│       ├── all.min.json           # 15,743 facility records
│       └── by_zip/                # Per-ZIP JSON files
├── data/
│   ├── source/                    # Raw CHHS data
│   └── derived/                   # Processed data
├── scripts/                       # Python utilities
└── README.md
```

---

## Core Features

### 1. Main Search + Map Interface (`/`)
- Full-text search across all facility fields (name, address, license #, etc.)
- Filters: facility category, license status (In Service/Not In Service)
- Geolocation: "Near me" + radius filter
- "Stacked" toggle: Show facilities sharing same address
- Dark/Light mode
- Interactive Leaflet map with markers and popups

### 2. Stacked Facilities Dashboard (`/stacked`)
- **Purpose**: Fraud detection - identifies multiple facilities at same address
- Histogram of stack sizes
- Bar chart of top stacked addresses
- Scatter plot (categories vs stack size)
- Links to Google Maps and Zillow for verification
- Expandable facility details

### 3. Field Observation Checklist (MVP)
- Yes/No/Unknown questions for site visits:
  - Signage present
  - Appears open
  - Door locked
  - Staff observed
  - Clients observed
- Free-text notes
- Saved to browser localStorage only (no backend sync yet)

---

## Getting Started

### Web Application

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Data Pipeline (Python)

```bash
# Create virtual environment
uv venv .venv
.venv\Scripts\activate.ps1  # Windows
# source .venv/bin/activate  # macOS/Linux

# Install dependencies
uv pip install openpyxl requests
```

---

## Data Pipeline Commands

### Pre-scrub + split by ZIP

Generates map/card-friendly facility objects and splits into per-ZIP files:

```bash
python scripts/prescrub_split_by_zip.py --input data/ca_lic_health_facilities.json --out data/derived --state CA
```

**Outputs:**
- `data/derived/state/<STATE>/index.json`: lookup table of ZIP counts
- `data/derived/state/<STATE>/by_zip/<ZIP>.json`: facilities per ZIP

### Refresh from CHHS Source

The upstream dataset: [Licensed and Certified Healthcare Facility Listing](https://data.chhs.ca.gov/dataset/healthcare-facility-locations)

```bash
python scripts/fetch_chhs_dataset.py --dataset healthcare-facility-locations --out data/source/chhs/healthcare-facility-locations
```

**Outputs:**
- `data/source/chhs/healthcare-facility-locations/*.table.json`: datastore exports
- `data/source/chhs/healthcare-facility-locations/manifest.json`: fetch log

---

## Data Model

**Facility Record** includes:
- `id`, `name`, `npi`, `hcaiId`
- `categoryName`, `categoryCode` (e.g., "HOSPICE", "PRIMARY CARE CLINIC")
- `licenseStatus`, `licenseNumber`, `licenseEffectiveDate`, `licenseExpirationDate`
- `address`, `city`, `zip`, `county`, `phone`
- `lat`, `lng` (geolocation)

**Data Source**: CHHS Open Data Portal (updated monthly)

---

## Current Limitations (MVP)

1. Observations stored only in browser localStorage
2. Photo upload not implemented (placeholder UI only)
3. Max 300 facilities in sidebar, 800 map markers
4. No user authentication
5. No backend API or audit trail
6. No cloud sync for observations

---

## Future Enhancements

1. **Backend API**: Server-side observation storage
2. **User Authentication**: Inspector accounts
3. **Photo Storage**: Cloud storage for site visit photos
4. **Offline Support**: PWA for field use
5. **Audit Trail**: Full observation history
6. **Multi-state Support**: Expand beyond California
7. **Real-time Data Sync**: CHHS API integration
8. **Report Generation**: PDF export of inspections

---

## License

Private repository - All rights reserved.

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 1.0.0 | 2026-01-16 | Initial public release - version freeze |
