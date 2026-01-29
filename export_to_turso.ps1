# PowerShell script to export local database for Turso

Write-Host "Exporting local SQLite database..." -ForegroundColor Cyan
sqlite3 web/local.db .dump | Out-File -FilePath database_dump.sql -Encoding UTF8

Write-Host "✓ Database exported to database_dump.sql" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Install Turso CLI: irm https://get.turso.tech/install.ps1 | iex"
Write-Host "2. Login: turso auth login"
Write-Host "3. Create database: turso db create hippocratic-prod"
Write-Host "4. Import data: turso db shell hippocratic-prod < database_dump.sql"
Write-Host "5. Get URL: turso db show hippocratic-prod --url"
Write-Host "6. Get token: turso db tokens create hippocratic-prod"
Write-Host "7. Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to Vercel environment variables"
Write-Host "8. Redeploy on Vercel"
