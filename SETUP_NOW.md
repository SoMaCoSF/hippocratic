# 🚀 Setup Turso NOW - Step by Step

## Current Status
✅ Turso CLI installed  
✅ Database exported (database_dump.sql - 5.8 MB)  
⏳ Need to: Create cloud database and configure Vercel

---

## Run These Commands (Copy & Paste)

### Step 1: Login to Turso
Open a **NEW PowerShell window** (so Turso is in PATH), then run:

```powershell
cd D:\somacosf\outputs\Ca_med_fraud\hippocratic
turso auth login
```

This will open your browser - sign in with GitHub or email.

---

### Step 2: Create Database

```powershell
turso db create hippocratic-prod
```

You should see: ✓ Created database hippocratic-prod

---

### Step 3: Import Your Data (takes ~30 seconds)

```powershell
Get-Content database_dump.sql | turso db shell hippocratic-prod
```

Wait for it to complete... You'll see SQL statements being executed.

---

### Step 4: Get Your Credentials

**Get the Database URL:**
```powershell
turso db show hippocratic-prod --url
```

**Copy the output!** It looks like:
```
libsql://hippocratic-prod-[your-username].turso.io
```

**Get the Auth Token:**
```powershell
turso db tokens create hippocratic-prod
```

**Copy this token!** It's a long string starting with `eyJ...`

---

### Step 5: Verify Data Was Imported

```powershell
turso db shell hippocratic-prod "SELECT COUNT(*) FROM facilities"
turso db shell hippocratic-prod "SELECT COUNT(*) FROM financials WHERE total_revenue > 0"
```

Should show:
- 15743 facilities
- 1796 financials with revenue

---

### Step 6: Add to Vercel

1. Go to: https://vercel.com/somacosfs-projects/hippocratic/settings/environment-variables

2. Click **"Add New"**

3. Add Variable #1:
   - **Name:** `TURSO_DATABASE_URL`
   - **Value:** `libsql://hippocratic-prod-[your-value].turso.io`
   - **Environments:** Check all three boxes (Production, Preview, Development)
   - Click **"Save"**

4. Add Variable #2:
   - **Name:** `TURSO_AUTH_TOKEN`
   - **Value:** `eyJ[your-long-token]...`
   - **Environments:** Check all three boxes
   - Click **"Save"**

---

### Step 7: Redeploy to Vercel

Back in PowerShell:
```powershell
cd D:\somacosf\outputs\Ca_med_fraud\hippocratic\web
vercel --prod
```

Wait for deployment to complete (~1 minute)

---

### Step 8: TEST IT! 🎉

Open these URLs:

**API Test:**
https://hippocratic.vercel.app/api/financials?limit=3

Should show real financial data with revenue!

**Financials Page:**
https://hippocratic.vercel.app/financials

Should show **$624.4M** in total revenue! 💰

---

## If You Get Stuck

**Turso not found after install?**
- Close and reopen PowerShell
- Or run: `$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")`

**Import taking forever?**
- It's 5.8 MB, should take 30-60 seconds
- If it hangs, press Ctrl+C and try: `turso db shell hippocratic-prod < database_dump.sql`

**Vercel still shows $0?**
- Double-check environment variables are saved
- Try: `vercel --prod --force` to force rebuild
- Check logs: `vercel logs`

---

## 💡 Pro Tip

After this works, you can update the cloud database anytime:
```powershell
cd D:\somacosf\outputs\Ca_med_fraud\hippocratic
python export_db.py
Get-Content database_dump.sql | turso db shell hippocratic-prod
```

---

Ready? Open a NEW PowerShell and start with Step 1! 🚀
