# Database Path Fix - Financial Data Now Working

## Problem Identified

The Financials page was showing all $0 values, but the Network page showed $624.4M in revenue. This indicated:
1. **Data existed** in the database (Network page could read it from CSV)
2. **API routes couldn't find it** (Financials page queries the database)

## Root Cause

There were **two `local.db` files**:
- `hippocratic/local.db` - populated with 15,743 facilities and 4,242 financial records
- `hippocratic/web/local.db` - empty or had old data without license numbers

The API routes in `web/src/app/api/` were looking for `local.db` relative to their execution context, which was finding the wrong (empty) database.

## Solution Implemented

### 1. Copy Database to Correct Location
```bash
Copy-Item local.db web/local.db -Force
```

### 2. Fix Database Path Resolution
Updated `web/src/lib/db.ts` to use `process.cwd()` for consistent path resolution:

```typescript
const dbPath = process.env.TURSO_DATABASE_URL || `file:${process.cwd()}/local.db`;
```

This ensures the API always finds the database at the project root, regardless of where the code is executed from.

### 3. Verification

**Before Fix:**
```json
{
  "licenseNumber": null,
  "totalRevenue": 0,
  "netIncome": 0
}
```

**After Fix:**
```json
{
  "licenseNumber": "550007601",
  "facilityName": "ZENITH HEALTHCARE INC.",
  "totalRevenue": 2091320,
  "netIncome": 695876
}
```

## Database Statistics

- **Facilities:** 15,743
- **Financial Records:** 4,242 (1,796 with revenue > 0)
- **Total Revenue:** $624.4M
- **Categories:** Hospice, Home Health, Skilled Nursing, etc.

## Files Changed

1. `web/local.db` - copied from root with full data
2. `web/src/lib/db.ts` - fixed path resolution
3. Deployed to Vercel production

## Testing

✅ Localhost API returns correct data with license numbers  
✅ Financials page displays charts and statistics  
✅ Network page shows financial data with color coding  
✅ Main map page filters by financial data  
✅ Deployed to hippocratic.vercel.app

## Next Steps

Consider using environment variables to explicitly set the database path in production, or migrate to Turso cloud database for better scalability.
