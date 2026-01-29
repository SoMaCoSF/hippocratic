#!/bin/bash
# Export local database to SQL dump for Turso import

echo "Exporting local SQLite database..."
sqlite3 web/local.db .dump > database_dump.sql

echo "✓ Database exported to database_dump.sql"
echo ""
echo "Next steps:"
echo "1. Install Turso CLI: curl -sSfL https://get.tur.so/install.sh | bash"
echo "2. Login: turso auth login"
echo "3. Create database: turso db create hippocratic-prod"
echo "4. Import data: turso db shell hippocratic-prod < database_dump.sql"
echo "5. Get URL: turso db show hippocratic-prod --url"
echo "6. Get token: turso db tokens create hippocratic-prod"
echo "7. Add to Vercel environment variables"
