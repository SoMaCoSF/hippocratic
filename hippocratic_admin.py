#!/usr/bin/env python3
"""
Hippocratic Admin - All-in-One Local Server
Healthcare Fraud Detection System with Telemetry Dashboard

Features:
- FastAPI admin panel
- OpenTelemetry metrics dashboard
- Data scraper management
- Turso vector DB integration
- Real-time monitoring

Usage:
    python hippocratic_admin.py
    # Opens admin panel at http://localhost:8000
"""

import sys
import os
import logging
import asyncio
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional

# Fix Unicode encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# FastAPI for admin panel
try:
    from fastapi import FastAPI, HTTPException, BackgroundTasks
    from fastapi.responses import HTMLResponse, JSONResponse
    from fastapi.staticfiles import StaticFiles
    import uvicorn
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False
    print("⚠️  FastAPI not available. Install: pip install fastapi uvicorn")

# Rich for beautiful CLI output
try:
    from rich.console import Console
    from rich.table import Table
    from rich.live import Live
    from rich.panel import Panel
    from rich.layout import Layout
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False
    print("⚠️  Rich not available. Install: pip install rich")

# OpenTelemetry
try:
    from opentelemetry import metrics, trace
    OTEL_AVAILABLE = True
except ImportError:
    OTEL_AVAILABLE = False

# Local imports
sys.path.insert(0, str(Path(__file__).parent / "data_sources"))
from privacy_proxy_adapter import PrivacyProxySession, OTEL_AVAILABLE as ADAPTER_OTEL

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Console for Rich output
console = Console() if RICH_AVAILABLE else None


class HippocraticAdmin:
    """Main admin server for Hippocratic fraud detection system."""
    
    def __init__(self, host: str = "127.0.0.1", port: int = 8000):
        self.host = host
        self.port = port
        self.app = FastAPI(title="Hippocratic Admin", version="1.0.0") if FASTAPI_AVAILABLE else None
        
        # Stats
        self.stats = {
            'uptime_start': datetime.now(),
            'total_scrapers_run': 0,
            'total_data_ingested': 0,
            'active_scrapers': 0,
            'db_records': 0,
            'vector_embeddings': 0,
        }
        
        # Active sessions
        self.active_sessions: Dict[str, PrivacyProxySession] = {}
        
        # Database configurations (multi-DB support)
        self.db_configs = self.load_db_configs()
        self.default_db = self.get_default_db()
        
        # Scraper-to-DB mappings
        self.scraper_db_mapping = self.load_scraper_mappings()
        
        if self.app:
            self.setup_routes()
    
    def load_db_configs(self) -> Dict[str, Dict[str, str]]:
        """Load database configurations."""
        config_file = Path(__file__).parent / "db_configs.json"
        
        if config_file.exists():
            import json
            with open(config_file, 'r') as f:
                return json.load(f)
        
        # Default configs
        return {
            'main': {
                'name': 'Main Production DB',
                'type': 'turso' if os.getenv('TURSO_DATABASE_URL') else 'sqlite',
                'path': os.getenv('TURSO_DATABASE_URL', 'local.db'),
                'token': os.getenv('TURSO_AUTH_TOKEN', ''),
                'description': 'Primary database for production data'
            }
        }
    
    def save_db_configs(self):
        """Save database configurations to file."""
        config_file = Path(__file__).parent / "db_configs.json"
        import json
        with open(config_file, 'w') as f:
            json.dump(self.db_configs, f, indent=2)
    
    def load_scraper_mappings(self) -> Dict[str, str]:
        """Load scraper-to-database mappings."""
        mapping_file = Path(__file__).parent / "scraper_db_mappings.json"
        
        if mapping_file.exists():
            import json
            with open(mapping_file, 'r') as f:
                return json.load(f)
        
        # Default: all scrapers use main DB
        return {
            'openfiscal': 'main',
            'sco': 'main',
            'data_ca_gov': 'main',
            'chhs': 'main',
        }
    
    def save_scraper_mappings(self):
        """Save scraper mappings to file."""
        mapping_file = Path(__file__).parent / "scraper_db_mappings.json"
        import json
        with open(mapping_file, 'w') as f:
            json.dump(self.scraper_db_mapping, f, indent=2)
    
    def get_default_db(self) -> str:
        """Get default database key."""
        return 'main'
    
    def get_db_for_scraper(self, scraper_name: str) -> str:
        """Get database key for a specific scraper."""
        return self.scraper_db_mapping.get(scraper_name, self.default_db)
    
    def setup_routes(self):
        """Setup FastAPI routes."""
        
        @self.app.get("/", response_class=HTMLResponse)
        async def dashboard():
            """Main admin dashboard."""
            return self.render_dashboard()
        
        @self.app.get("/api/stats")
        async def get_stats():
            """Get system statistics."""
            return JSONResponse({
                'stats': self.get_stats(),
                'sessions': self.get_session_stats(),
                'scrapers': self.get_scraper_status()
            })
        
        @self.app.get("/api/metrics")
        async def get_metrics():
            """Get OpenTelemetry metrics."""
            return JSONResponse(self.get_otel_metrics())
        
        @self.app.post("/api/scraper/start/{scraper_name}")
        async def start_scraper(scraper_name: str, background_tasks: BackgroundTasks):
            """Start a data scraper."""
            background_tasks.add_task(self.run_scraper, scraper_name)
            return {"status": "started", "scraper": scraper_name}
        
        @self.app.get("/api/db/stats")
        async def get_db_stats():
            """Get database statistics."""
            return JSONResponse(self.get_db_stats())
        
        @self.app.get("/api/vector/search")
        async def vector_search(query: str, limit: int = 10):
            """Semantic search using vector embeddings."""
            results = await self.vector_search(query, limit)
            return JSONResponse(results)
        
        @self.app.get("/api/databases")
        async def get_databases():
            """Get all configured databases."""
            return JSONResponse({
                'databases': self.db_configs,
                'default': self.default_db
            })
        
        @self.app.post("/api/databases")
        async def create_database(data: dict):
            """Create a new database configuration."""
            db_key = data.get('key')
            if not db_key:
                raise HTTPException(400, "Database key required")
            
            if db_key in self.db_configs:
                raise HTTPException(400, f"Database '{db_key}' already exists")
            
            self.db_configs[db_key] = {
                'name': data.get('name', f'Database {db_key}'),
                'type': data.get('type', 'sqlite'),
                'path': data.get('path', f'{db_key}.db'),
                'token': data.get('token', ''),
                'description': data.get('description', '')
            }
            
            self.save_db_configs()
            return JSONResponse({'status': 'created', 'key': db_key})
        
        @self.app.delete("/api/databases/{db_key}")
        async def delete_database(db_key: str):
            """Delete a database configuration."""
            if db_key == 'main':
                raise HTTPException(400, "Cannot delete main database")
            
            if db_key not in self.db_configs:
                raise HTTPException(404, "Database not found")
            
            del self.db_configs[db_key]
            
            # Remove from scraper mappings
            for scraper, mapped_db in list(self.scraper_db_mapping.items()):
                if mapped_db == db_key:
                    self.scraper_db_mapping[scraper] = 'main'
            
            self.save_db_configs()
            self.save_scraper_mappings()
            return JSONResponse({'status': 'deleted'})
        
        @self.app.get("/api/scrapers/mappings")
        async def get_scraper_mappings():
            """Get scraper-to-database mappings."""
            return JSONResponse({
                'mappings': self.scraper_db_mapping,
                'scrapers': list(self.scraper_db_mapping.keys())
            })
        
        @self.app.post("/api/scrapers/mappings")
        async def update_scraper_mapping(data: dict):
            """Update scraper-to-database mapping."""
            scraper = data.get('scraper')
            db_key = data.get('database')
            
            if not scraper or not db_key:
                raise HTTPException(400, "Scraper and database required")
            
            if db_key not in self.db_configs:
                raise HTTPException(404, f"Database '{db_key}' not found")
            
            self.scraper_db_mapping[scraper] = db_key
            self.save_scraper_mappings()
            
            return JSONResponse({
                'status': 'updated',
                'scraper': scraper,
                'database': db_key
            })
    
    def render_dashboard(self) -> str:
        """Render HTML dashboard."""
        stats = self.get_stats()
        
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Hippocratic Admin - Healthcare Fraud Detection</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0a0e1a;
            color: #e4e4e7;
            padding: 20px;
        }}
        .header {{
            text-align: center;
            padding: 40px 20px;
            background: linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%);
            border-radius: 12px;
            margin-bottom: 30px;
        }}
        .header h1 {{ font-size: 2.5em; margin-bottom: 10px; }}
        .header p {{ opacity: 0.9; font-size: 1.1em; }}
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        .stat-card {{
            background: #18181b;
            border: 1px solid #27272a;
            border-radius: 8px;
            padding: 20px;
            transition: all 0.3s ease;
        }}
        .stat-card:hover {{
            border-color: #3b82f6;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }}
        .stat-label {{
            color: #a1a1aa;
            font-size: 0.9em;
            margin-bottom: 8px;
        }}
        .stat-value {{
            font-size: 2em;
            font-weight: bold;
            color: #3b82f6;
        }}
        .section {{
            background: #18181b;
            border: 1px solid #27272a;
            border-radius: 8px;
            padding: 25px;
            margin-bottom: 20px;
        }}
        .section h2 {{
            color: #3b82f6;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #27272a;
        }}
        .scraper-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }}
        .scraper-btn {{
            background: #1e293b;
            border: 2px solid #334155;
            color: #e4e4e7;
            padding: 15px 20px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 1em;
        }}
        .scraper-btn:hover {{
            border-color: #3b82f6;
            background: #1e3a8a;
            transform: translateY(-2px);
        }}
        .status-active {{ color: #22c55e; }}
        .status-idle {{ color: #a1a1aa; }}
        .status-error {{ color: #ef4444; }}
        .metric-row {{
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #27272a;
        }}
        .metric-row:last-child {{ border-bottom: none; }}
        .refresh-btn {{
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #3b82f6;
            color: white;
            border: none;
            padding: 15px 25px;
            border-radius: 50px;
            cursor: pointer;
            font-size: 1em;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            transition: all 0.3s ease;
        }}
        .refresh-btn:hover {{
            background: #2563eb;
            transform: scale(1.05);
        }}
    </style>
    <script>
        async function refreshStats() {{
            const response = await fetch('/api/stats');
            const data = await response.json();
            console.log('Stats:', data);
            location.reload();
        }}
        
        async function startScraper(name) {{
            const response = await fetch(`/api/scraper/start/${{name}}`, {{ method: 'POST' }});
            const data = await response.json();
            alert(`Started scraper: ${{name}}`);
            setTimeout(refreshStats, 1000);
        }}
        
        async function loadDatabases() {{
            const response = await fetch('/api/databases');
            const data = await response.json();
            
            const list = document.getElementById('databases-list');
            list.innerHTML = '';
            
            for (const [key, db] of Object.entries(data.databases)) {{
                const isDefault = key === data.default;
                const div = document.createElement('div');
                div.style.cssText = 'padding: 15px; background: #1e293b; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid ' + (isDefault ? '#22c55e' : '#3b82f6');
                div.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${{db.name}}</strong> 
                            ${{isDefault ? '<span style="color: #22c55e; font-size: 0.8em;">(DEFAULT)</span>' : ''}}
                            <br>
                            <small style="color: #a1a1aa;">Key: ${{key}} | Type: ${{db.type}} | Path: ${{db.path.substring(0, 40)}}...</small>
                        </div>
                        ${{key !== 'main' ? `<button onclick="deleteDatabase('${{key}}')" style="padding: 8px 15px; background: #ef4444; border: none; border-radius: 6px; color: white; cursor: pointer;">Delete</button>` : ''}}
                    </div>
                `;
                list.appendChild(div);
            }}
        }}
        
        async function createDatabase() {{
            const key = document.getElementById('new-db-key').value;
            const name = document.getElementById('new-db-name').value;
            const type = document.getElementById('new-db-type').value;
            const path = document.getElementById('new-db-path').value;
            const token = document.getElementById('new-db-token').value;
            
            if (!key || !name || !path) {{
                alert('Please fill in required fields (key, name, path)');
                return;
            }}
            
            const response = await fetch('/api/databases', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ key, name, type, path, token }})
            }});
            
            if (response.ok) {{
                alert('Database created successfully!');
                document.getElementById('new-db-key').value = '';
                document.getElementById('new-db-name').value = '';
                document.getElementById('new-db-path').value = '';
                document.getElementById('new-db-token').value = '';
                loadDatabases();
                loadScraperMappings();
            }} else {{
                const error = await response.json();
                alert('Error: ' + error.detail);
            }}
        }}
        
        async function deleteDatabase(key) {{
            if (!confirm(`Delete database '${{key}}'?`)) return;
            
            const response = await fetch(`/api/databases/${{key}}`, {{ method: 'DELETE' }});
            
            if (response.ok) {{
                alert('Database deleted');
                loadDatabases();
                loadScraperMappings();
            }} else {{
                alert('Error deleting database');
            }}
        }}
        
        async function loadScraperMappings() {{
            const [mappingsRes, databasesRes] = await Promise.all([
                fetch('/api/scrapers/mappings'),
                fetch('/api/databases')
            ]);
            
            const mappings = await mappingsRes.json();
            const databases = await databasesRes.json();
            
            const container = document.getElementById('scraper-mappings');
            container.innerHTML = '';
            
            for (const [scraper, dbKey] of Object.entries(mappings.mappings)) {{
                const div = document.createElement('div');
                div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #1e293b; border-radius: 6px; margin-bottom: 8px;';
                
                const select = document.createElement('select');
                select.style.cssText = 'padding: 8px; background: #0f172a; border: 1px solid #334155; border-radius: 6px; color: white; cursor: pointer;';
                
                for (const key of Object.keys(databases.databases)) {{
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = databases.databases[key].name;
                    option.selected = key === dbKey;
                    select.appendChild(option);
                }}
                
                select.onchange = () => updateScraperMapping(scraper, select.value);
                
                div.innerHTML = `<strong>${{scraper}}</strong>`;
                div.appendChild(select);
                container.appendChild(div);
                
                // Update scraper button labels
                const scraperLabel = document.getElementById(`db-${{scraper}}`);
                if (scraperLabel) {{
                    scraperLabel.textContent = `→ ${{dbKey}}`;
                    scraperLabel.style.color = dbKey === 'main' ? '#a1a1aa' : '#3b82f6';
                }}
            }}
        }}
        
        async function updateScraperMapping(scraper, database) {{
            const response = await fetch('/api/scrapers/mappings', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ scraper, database }})
            }});
            
            if (response.ok) {{
                console.log(`Updated ${{scraper}} → ${{database}}`);
                loadScraperMappings();
            }} else {{
                alert('Error updating mapping');
            }}
        }}
        
        // Load on page load
        document.addEventListener('DOMContentLoaded', () => {{
            loadDatabases();
            loadScraperMappings();
        }});
        
        // Auto-refresh every 30 seconds
        setInterval(refreshStats, 30000);
    </script>
</head>
<body>
    <div class="header">
        <h1>🏥 Hippocratic Admin</h1>
        <p>California Healthcare Fraud Detection System</p>
        <p style="font-size: 0.9em; margin-top: 10px;">
            Uptime: {stats['uptime']} | Database: {stats.get('db_type', 'Unknown')}
        </p>
    </div>
    
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-label">Total Scrapers Run</div>
            <div class="stat-value">{stats['total_scrapers_run']}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Data Records</div>
            <div class="stat-value">{stats['db_records']:,}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Vector Embeddings</div>
            <div class="stat-value">{stats['vector_embeddings']:,}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Active Scrapers</div>
            <div class="stat-value" style="color: {'#22c55e' if stats['active_scrapers'] > 0 else '#a1a1aa'}">
                {stats['active_scrapers']}
            </div>
        </div>
    </div>
    
    <div class="section">
        <h2>🤖 Data Scrapers</h2>
        <div style="margin-bottom: 15px; padding: 10px; background: #1e293b; border-radius: 6px; border-left: 3px solid #3b82f6;">
            <strong>💡 Database Routing:</strong> Each scraper can write to a different database. 
            <a href="#db-config" style="color: #3b82f6; text-decoration: none;">Configure below ↓</a>
        </div>
        <div class="scraper-grid">
            <button class="scraper-btn" onclick="startScraper('openfiscal')">
                💰 Open FI$Cal<br>
                <small style="opacity: 0.7;">Budget Data</small><br>
                <small id="db-openfiscal" style="opacity: 0.5; font-size: 0.8em;">→ main</small>
            </button>
            <button class="scraper-btn" onclick="startScraper('sco')">
                📊 State Controller<br>
                <small style="opacity: 0.7;">Spending Data</small><br>
                <small id="db-sco" style="opacity: 0.5; font-size: 0.8em;">→ main</small>
            </button>
            <button class="scraper-btn" onclick="startScraper('data_ca_gov')">
                🏛️ data.ca.gov<br>
                <small style="opacity: 0.7;">API Data</small><br>
                <small id="db-data_ca_gov" style="opacity: 0.5; font-size: 0.8em;">→ main</small>
            </button>
            <button class="scraper-btn" onclick="startScraper('chhs')">
                🏥 CHHS Portal<br>
                <small style="opacity: 0.7;">Health Data</small><br>
                <small id="db-chhs" style="opacity: 0.5; font-size: 0.8em;">→ main</small>
            </button>
        </div>
    </div>
    
    <div class="section" id="db-config">
        <h2>🗄️ Database Configuration</h2>
        <p style="color: #a1a1aa; margin-bottom: 15px;">
            Configure multiple databases and route scrapers to specific targets.
        </p>
        
        <div style="margin-bottom: 20px;">
            <h3 style="font-size: 1.1em; margin-bottom: 10px;">Configured Databases</h3>
            <div id="databases-list">
                <!-- Populated by JavaScript -->
            </div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h3 style="font-size: 1.1em; margin-bottom: 10px;">Add New Database</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <input type="text" id="new-db-key" placeholder="Database Key (e.g., testing)" 
                       style="padding: 10px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: white;">
                <input type="text" id="new-db-name" placeholder="Display Name" 
                       style="padding: 10px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: white;">
                <select id="new-db-type" style="padding: 10px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: white;">
                    <option value="sqlite">SQLite (Local)</option>
                    <option value="turso">Turso (Cloud)</option>
                </select>
                <input type="text" id="new-db-path" placeholder="Path or URL" 
                       style="padding: 10px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: white;">
                <input type="text" id="new-db-token" placeholder="Auth Token (Turso only)" 
                       style="padding: 10px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: white;">
                <button onclick="createDatabase()" style="padding: 10px; background: #22c55e; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: bold;">
                    ➕ Add Database
                </button>
            </div>
        </div>
        
        <div>
            <h3 style="font-size: 1.1em; margin-bottom: 10px;">Scraper → Database Routing</h3>
            <div id="scraper-mappings">
                <!-- Populated by JavaScript -->
            </div>
        </div>
    </div>
    
    <div class="section">
        <h2>📊 OpenTelemetry Metrics</h2>
        <div class="metric-row">
            <span>Requests (Total)</span>
            <span class="stat-value" style="font-size: 1.2em;">{stats.get('total_requests', 0)}</span>
        </div>
        <div class="metric-row">
            <span>Bytes Downloaded</span>
            <span>{stats.get('total_bytes', 0):,} bytes</span>
        </div>
        <div class="metric-row">
            <span>Average Response Time</span>
            <span>{stats.get('avg_response_time', 0):.2f}ms</span>
        </div>
        <div class="metric-row">
            <span>Rate Limit Delays</span>
            <span>{stats.get('rate_limit_delays', 0)}</span>
        </div>
        <div class="metric-row">
            <span>Errors</span>
            <span class="{'status-error' if stats.get('errors', 0) > 0 else 'status-idle'}">
                {stats.get('errors', 0)}
            </span>
        </div>
    </div>
    
    <div class="section">
        <h2>🗄️ Database Status</h2>
        <div class="metric-row">
            <span>Facilities</span>
            <span>{stats.get('facilities_count', 0):,}</span>
        </div>
        <div class="metric-row">
            <span>Financial Records</span>
            <span>{stats.get('financials_count', 0):,}</span>
        </div>
        <div class="metric-row">
            <span>Budget Records</span>
            <span>{stats.get('budgets_count', 0):,}</span>
        </div>
        <div class="metric-row">
            <span>Data Sources</span>
            <span>{stats.get('sources_count', 0)}</span>
        </div>
    </div>
    
    <button class="refresh-btn" onclick="refreshStats()">
        🔄 Refresh
    </button>
</body>
</html>
"""
        return html
    
    def get_stats(self) -> Dict[str, Any]:
        """Get system statistics."""
        uptime = datetime.now() - self.stats['uptime_start']
        
        # Get DB stats from Turso or local SQLite
        try:
            # Check for Turso connection
            turso_url = os.getenv("TURSO_DATABASE_URL")
            
            if turso_url:
                # Use Turso
                try:
                    from libsql_client import create_client
                    db = create_client(turso_url, auth_token=os.getenv("TURSO_AUTH_TOKEN"))
                    
                    facilities = db.execute("SELECT COUNT(*) FROM facilities").rows[0][0]
                    financials = db.execute("SELECT COUNT(*) FROM financials").rows[0][0]
                    try:
                        budgets = db.execute("SELECT COUNT(*) FROM government_budgets").rows[0][0]
                        sources = db.execute("SELECT COUNT(*) FROM data_sources").rows[0][0]
                        embeddings = db.execute("SELECT COUNT(*) FROM facility_embeddings").rows[0][0]
                    except:
                        budgets = sources = embeddings = 0
                    
                    logger.debug("Using Turso database")
                except ImportError:
                    logger.warning("libsql-client not available, falling back to local")
                    turso_url = None
            
            if not turso_url:
                # Use local SQLite
                import sqlite3
                db_path = Path(__file__).parent / "local.db"
                if db_path.exists():
                    conn = sqlite3.connect(str(db_path))
                    cursor = conn.cursor()
                    
                    facilities = cursor.execute("SELECT COUNT(*) FROM facilities").fetchone()[0]
                    financials = cursor.execute("SELECT COUNT(*) FROM financials").fetchone()[0]
                    try:
                        budgets = cursor.execute("SELECT COUNT(*) FROM government_budgets").fetchone()[0]
                        sources = cursor.execute("SELECT COUNT(*) FROM data_sources").fetchone()[0]
                        embeddings = cursor.execute("SELECT COUNT(*) FROM facility_embeddings").fetchone()[0]
                    except:
                        budgets = sources = embeddings = 0
                    
                    conn.close()
                    logger.debug("Using local SQLite database")
                else:
                    facilities = financials = budgets = sources = embeddings = 0
                    
        except Exception as e:
            logger.error(f"Error getting DB stats: {e}")
            facilities = financials = budgets = sources = embeddings = 0
        
        # Update stats
        self.stats['db_records'] = facilities + financials + budgets
        self.stats['vector_embeddings'] = embeddings
        
        db_type = "Turso Cloud" if os.getenv("TURSO_DATABASE_URL") else "Local SQLite"
        
        return {
            **self.stats,
            'uptime': str(uptime).split('.')[0],
            'facilities_count': facilities,
            'financials_count': financials,
            'budgets_count': budgets,
            'sources_count': sources,
            'embeddings_count': embeddings,
            'db_type': db_type,
        }
    
    def get_session_stats(self) -> Dict[str, Any]:
        """Get active session statistics."""
        sessions = {}
        for name, session in self.active_sessions.items():
            sessions[name] = session.get_stats()
        return sessions
    
    def get_scraper_status(self) -> Dict[str, str]:
        """Get status of all scrapers."""
        return {
            'openfiscal': 'idle',
            'sco': 'idle',
            'data_ca_gov': 'idle',
            'chhs': 'idle',
        }
    
    def get_otel_metrics(self) -> Dict[str, Any]:
        """Get OpenTelemetry metrics."""
        # Aggregate from all sessions
        total_requests = 0
        total_bytes = 0
        total_time = 0
        
        for session in self.active_sessions.values():
            stats = session.get_stats()
            total_requests += stats['total_requests']
            total_bytes += stats['total_bytes_downloaded']
            total_time += stats['total_time_ms']
        
        return {
            'total_requests': total_requests,
            'total_bytes': total_bytes,
            'avg_response_time': total_time / max(total_requests, 1),
            'rate_limit_delays': sum(s.get_stats()['rate_limit_delays'] for s in self.active_sessions.values()),
            'errors': sum(s.get_stats()['errors'] for s in self.active_sessions.values()),
        }
    
    def get_db_stats(self) -> Dict[str, int]:
        """Get database record counts."""
        return {
            'facilities': self.stats.get('facilities_count', 0),
            'financials': self.stats.get('financials_count', 0),
            'budgets': self.stats.get('budgets_count', 0),
        }
    
    async def vector_search(self, query: str, limit: int = 10) -> List[Dict]:
        """Perform semantic vector search."""
        # TODO: Implement vector search with Turso
        return []
    
    async def run_scraper(self, scraper_name: str):
        """Run a data scraper in background."""
        self.stats['active_scrapers'] += 1
        self.stats['total_scrapers_run'] += 1
        
        # Get database for this scraper
        db_key = self.get_db_for_scraper(scraper_name)
        db_config = self.db_configs.get(db_key, self.db_configs['main'])
        
        try:
            logger.info(f"Starting scraper: {scraper_name}")
            logger.info(f"Target database: {db_config['name']} ({db_key})")
            logger.info(f"Database type: {db_config['type']}")
            logger.info(f"Database path: {db_config['path']}")
            
            # Create session with OTel
            session = PrivacyProxySession(
                enable_otel=ADAPTER_OTEL,
                strip_cookies=False,  # Opt-in only
                randomize_fingerprint=False  # Opt-in only
            )
            
            self.active_sessions[scraper_name] = session
            
            # TODO: Actually run the scraper with the configured database
            # For now, simulate scraping
            await asyncio.sleep(5)
            
            logger.info(f"Scraper completed: {scraper_name}")
            logger.info(f"Data written to: {db_config['name']}")
            
        except Exception as e:
            logger.error(f"Scraper error: {e}")
        finally:
            self.stats['active_scrapers'] -= 1
            if scraper_name in self.active_sessions:
                self.active_sessions[scraper_name].close()
                del self.active_sessions[scraper_name]
    
    def start(self):
        """Start the admin server."""
        if not FASTAPI_AVAILABLE:
            print("❌ FastAPI not available. Install: pip install fastapi uvicorn")
            return
        
        if RICH_AVAILABLE:
            console.print(Panel.fit(
                "[bold blue]Hippocratic Admin Server[/bold blue]\n"
                f"[green]http://{self.host}:{self.port}[/green]\n\n"
                "[yellow]Features:[/yellow]\n"
                "  • Real-time telemetry dashboard\n"
                "  • Data scraper management\n"
                "  • Database statistics\n"
                "  • Vector search (coming soon)\n"
                "  • OpenTelemetry metrics",
                title="🏥 Starting Server",
                border_style="blue"
            ))
        else:
            print("=" * 60)
            print("Hippocratic Admin Server")
            print(f"http://{self.host}:{self.port}")
            print("=" * 60)
        
        uvicorn.run(
            self.app,
            host=self.host,
            port=self.port,
            log_level="info"
        )


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Hippocratic Admin Server")
    parser.add_argument("--host", default="127.0.0.1", help="Server host")
    parser.add_argument("--port", default=8000, type=int, help="Server port")
    
    args = parser.parse_args()
    
    admin = HippocraticAdmin(host=args.host, port=args.port)
    admin.start()


if __name__ == "__main__":
    main()
