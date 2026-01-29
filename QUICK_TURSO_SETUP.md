# ⚡ Quick Turso Setup for Vercel

## The Problem
**Financials work on localhost but not Vercel** because Vercel can't access your local `local.db` file.

## The Solution
Use **Turso** (cloud SQLite) - it's free and takes 5 minutes!

---

## Step-by-Step Setup

### 1. Install Turso CLI (2 minutes)

**Windows (PowerShell as Admin):**
```powershell
irm https://get.turso.tech/install.ps1 | iex
```

**Mac/Linux:**
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

Then restart your terminal.

### 2. Create Turso Database (1 minute)

```bash
cd hippocratic

# Login (opens browser)
turso auth login

# Create database
turso db create hippocratic-prod

# Import your data (this file is already created!)
turso db shell hippocratic-prod < database_dump.sql
```

Wait for import to complete... ⏳

### 3. Get Your Credentials (30 seconds)

```bash
# Get database URL
turso db show hippocratic-prod --url

# Get auth token
turso db tokens create hippocratic-prod
```

**Copy both** of these values!

### 4. Add to Vercel (1 minute)

1. Go to: https://vercel.com/somacosfs-projects/hippocratic/settings/environment-variables

2. Add these two variables:

   **Variable 1:**
   - Name: `TURSO_DATABASE_URL`
   - Value: `libsql://hippocratic-prod-[your-username].turso.io`
   - Environments: ✅ Production, ✅ Preview, ✅ Development

   **Variable 2:**
   - Name: `TURSO_AUTH_TOKEN`
   - Value: `eyJ[your-long-token-here]...`
   - Environments: ✅ Production, ✅ Preview, ✅ Development

3. Click "Save"

### 5. Redeploy (30 seconds)

```bash
cd hippocratic/web
vercel --prod
```

Or just push to git and it auto-deploys!

---

## ✅ Verify It Works

After deployment, visit:
```
https://hippocratic.vercel.app/api/financials?limit=3
```

You should see:
```json
{
  "financials": [
    {
      "licenseNumber": "550007601",
      "totalRevenue": 2091320,
      "netIncome": 695876,
      ...
    }
  ]
}
```

**Then check the financials page:**
```
https://hippocratic.vercel.app/financials
```

Should show **$624.4M** in revenue! 🎉

---

## What Just Happened?

- ✅ Your local database (15,743 facilities, 4,242 financials) is now in the cloud
- ✅ Vercel can access it via Turso's API
- ✅ Your code already supports this (see `web/src/lib/db.ts`)
- ✅ Localhost will still use local.db, Vercel uses Turso

---

## Troubleshooting

**Import failed?**
```bash
# Check if database exists
turso db list

# Try smaller import
head -n 10000 database_dump.sql | turso db shell hippocratic-prod
```

**Vercel still shows $0?**
1. Check environment variables are set correctly
2. Redeploy with `vercel --prod --force`
3. Check Vercel logs: `vercel logs hippocratic-production`

**Need to update data?**
```bash
# Export local changes
python export_db.py

# Re-import to Turso
turso db shell hippocratic-prod < database_dump.sql
```

---

## Cost

Turso free tier includes:
- ✅ 9 GB storage
- ✅ 1 billion row reads/month
- ✅ 25 million row writes/month

Your database is only **5.8 MB** - you're fine! 🎉
