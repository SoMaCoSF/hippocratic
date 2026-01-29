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
        
        if self.app:
            self.setup_routes()
    
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
        
        // Auto-refresh every 30 seconds
        setInterval(refreshStats, 30000);
    </script>
</head>
<body>
    <div class="header">
        <h1>🏥 Hippocratic Admin</h1>
        <p>California Healthcare Fraud Detection System</p>
        <p style="font-size: 0.9em; margin-top: 10px;">Uptime: {stats['uptime']}</p>
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
        <div class="scraper-grid">
            <button class="scraper-btn" onclick="startScraper('openfiscal')">
                💰 Open FI$Cal<br>
                <small style="opacity: 0.7;">Budget Data</small>
            </button>
            <button class="scraper-btn" onclick="startScraper('sco')">
                📊 State Controller<br>
                <small style="opacity: 0.7;">Spending Data</small>
            </button>
            <button class="scraper-btn" onclick="startScraper('data_ca_gov')">
                🏛️ data.ca.gov<br>
                <small style="opacity: 0.7;">API Data</small>
            </button>
            <button class="scraper-btn" onclick="startScraper('chhs')">
                🏥 CHHS Portal<br>
                <small style="opacity: 0.7;">Health Data</small>
            </button>
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
        
        # Get DB stats
        try:
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
                except:
                    budgets = 0
                    sources = 0
                
                conn.close()
            else:
                facilities = financials = budgets = sources = 0
        except Exception as e:
            logger.error(f"Error getting DB stats: {e}")
            facilities = financials = budgets = sources = 0
        
        return {
            **self.stats,
            'uptime': str(uptime).split('.')[0],
            'facilities_count': facilities,
            'financials_count': financials,
            'budgets_count': budgets,
            'sources_count': sources,
            'db_records': facilities + financials + budgets,
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
        
        try:
            logger.info(f"Starting scraper: {scraper_name}")
            
            # Create session with OTel
            session = PrivacyProxySession(
                enable_otel=ADAPTER_OTEL,
                strip_cookies=False,  # Opt-in only
                randomize_fingerprint=False  # Opt-in only
            )
            
            self.active_sessions[scraper_name] = session
            
            # TODO: Actually run the scraper
            await asyncio.sleep(5)  # Simulate scraping
            
            logger.info(f"Scraper completed: {scraper_name}")
            
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
