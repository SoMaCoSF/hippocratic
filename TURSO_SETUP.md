# Turso Setup for Vercel Production

## Problem
The financials page works on localhost but not Vercel because Vercel's serverless functions can't access the local SQLite database (`local.db`).

## Solution: Use Turso (Cloud SQLite)

Turso is a cloud-hosted SQLite database that works perfectly with Vercel. Here's how to set it up:

### Step 1: Create Turso Account & Database

1. **Sign up for Turso** (free tier is generous):
   ```
   https://turso.tech/
   ```

2. **Install Turso CLI** (Windows):
   ```powershell
   irm https://get.turso.tech/install.ps1 | iex
   ```

3. **Login to Turso**:
   ```bash
   turso auth login
   ```

4. **Create a new database**:
   ```bash
   turso db create hippocratic-prod
   ```

5. **Get the database URL**:
   ```bash
   turso db show hippocratic-prod --url
   ```
   Copy this URL (looks like: `libsql://hippocratic-prod-[username].turso.io`)

6. **Create an auth token**:
   ```bash
   turso db tokens create hippocratic-prod
   ```
   Copy this token (starts with `eyJ...`)

### Step 2: Upload Data to Turso

We need to upload the local database to Turso:

```bash
# From the hippocratic directory
turso db shell hippocratic-prod < schema.sql
```

Or manually upload using the Turso CLI:

```bash
# Connect to Turso database
turso db shell hippocratic-prod

# Then manually run the populate_db.py script but pointing to Turso
# OR export local.db and import to Turso:
sqlite3 local.db .dump > dump.sql
turso db shell hippocratic-prod < dump.sql
```

### Step 3: Configure Vercel Environment Variables

1. Go to your Vercel project: https://vercel.com/somacosfs-projects/hippocratic

2. Go to **Settings** > **Environment Variables**

3. Add these two variables:
   - **Name:** `TURSO_DATABASE_URL`  
     **Value:** `libsql://hippocratic-prod-[your-username].turso.io`
   
   - **Name:** `TURSO_AUTH_TOKEN`  
     **Value:** `eyJ[your-token-here]...`

4. Set both to **Production, Preview, and Development**

5. **Redeploy** the app (or it will auto-redeploy on next commit)

### Step 4: Verify

After deployment, check:
```
https://hippocratic.vercel.app/api/financials?limit=5
```

Should return financial data with revenue values!

---

## Quick Alternative: Export Local DB and Use Turso CLI

If you have the Turso CLI installed:

```bash
cd hippocratic

# Export local database
sqlite3 web/local.db .dump > database_dump.sql

# Create Turso database
turso db create hippocratic-prod

# Import the dump
turso db shell hippocratic-prod < database_dump.sql

# Get credentials
turso db show hippocratic-prod --url
turso db tokens create hippocratic-prod
```

Then add those to Vercel environment variables!

---

## Current Database Stats

Your local database has:
- **15,743** facilities
- **4,242** financial records
- **$624.4M** total revenue

All of this needs to be in Turso for Vercel to access it!
