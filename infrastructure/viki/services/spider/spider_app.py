import os
import re
import uuid
import json
import time
import asyncio
import logging
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from jinja2 import Template
import duckdb
import redis
from playwright.async_api import async_playwright

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cortex-spider-app")

REDIS_URL = os.getenv("REDIS_URL", "redis://cortex-spider-redis:6379/0")
DATA_DIR = os.getenv("DATA_DIR", "/mnt/data_lake/audit/spider")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://192.168.50.242:11434")

# Global master database of jobs
MASTER_DB = os.path.join(DATA_DIR, "spider_master.db")
os.makedirs(DATA_DIR, exist_ok=True)

def get_db_conn(db_path: str, read_only: bool = False, max_retries: int = 5, delay: float = 0.2):
    """Retrieve a DuckDB connection with transient lock conflict retries."""
    for i in range(max_retries):
        try:
            return duckdb.connect(db_path, read_only=read_only)
        except Exception as e:
            if "lock" in str(e).lower() and i < max_retries - 1:
                time.sleep(delay)
                continue
            raise e

# Initialize master job store
def init_master_db():
    with get_db_conn(MASTER_DB) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                job_id VARCHAR PRIMARY KEY,
                url VARCHAR,
                status VARCHAR,
                pages_crawled INTEGER,
                max_pages INTEGER,
                created_at TIMESTAMP,
                completed_at TIMESTAMP,
                render_js BOOLEAN,
                user_agent VARCHAR
            )
        """)

init_master_db()

app = FastAPI(
    title="SPIDER: Premium Decoupled SEO Scanner",
    description="FITS-branded high-performance SEO crawler & reporting engine",
    version="2.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CrawlRequest(BaseModel):
    url: str
    max_pages: int = 50
    render_js: bool = False
    user_agent: str = "desktop"
    obey_robots: bool = True

# Helper to sync master job record
def sync_job_status(job_id: str, url: str, status: str, pages_crawled: int, max_pages: int, render_js: bool, user_agent: str):
    with get_db_conn(MASTER_DB) as conn:
        conn.execute("""
            INSERT OR REPLACE INTO jobs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            job_id, url, status, pages_crawled, max_pages,
            time.strftime("%Y-%m-%d %H:%M:%S"),
            None if status == "running" else time.strftime("%Y-%m-%d %H:%M:%S"),
            render_js, user_agent
        ))

@app.post("/crawl")
async def start_crawl(request: CrawlRequest):
    """Start a new crawl by registering it in master db and queuing it in Redis."""
    target_url = request.url
    if not target_url.startswith("http://") and not target_url.startswith("https://"):
        target_url = "https://" + target_url
        
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    
    # Initialize the job DB
    job_db_path = os.path.join(DATA_DIR, f"{job_id}.db")
    
    # Initialize DuckDB file for the job
    with get_db_conn(job_db_path) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS job_info (
                job_id VARCHAR PRIMARY KEY,
                url VARCHAR,
                status VARCHAR,
                pages_crawled INTEGER,
                max_pages INTEGER,
                created_at TIMESTAMP,
                completed_at TIMESTAMP,
                config_json VARCHAR
            )
        """)
        conn.execute("INSERT INTO job_info VALUES (?, ?, ?, ?, ?, ?, ?, ?)", (
            job_id, target_url, "created", 0, request.max_pages,
            time.strftime("%Y-%m-%d %H:%M:%S"), None, json.dumps(request.model_dump())
        ))
    
    # Sync to master registry
    sync_job_status(job_id, target_url, "running", 0, request.max_pages, request.render_js, request.user_agent)
    
    # Queue task in Redis
    try:
        r = redis.Redis.from_url(REDIS_URL)
        payload = {
            "job_id": job_id,
            "url": target_url,
            "max_pages": request.max_pages,
            "render_js": request.render_js,
            "user_agent": request.user_agent,
            "obey_robots": request.obey_robots
        }
        r.rpush("spider_jobs", json.dumps(payload))
        logger.info(f"[SPIDER] Queued crawl job: {job_id} for {target_url}")
    except Exception as e:
        logger.error(f"[SPIDER] Failed to queue job to Redis: {e}")
        # Mark as failed in master db
        sync_job_status(job_id, target_url, "failed", 0, request.max_pages, request.render_js, request.user_agent)
        raise HTTPException(status_code=500, detail="Broker queue unavailable.")
        
    return {"status": "queued", "job_id": job_id, "url": target_url}

@app.get("/jobs")
async def list_jobs():
    """Retrieve all history of crawl jobs."""
    with get_db_conn(MASTER_DB, read_only=True) as conn:
        results = conn.execute("SELECT * FROM jobs ORDER BY created_at DESC").fetchall()
    
    jobs_list = []
    for r in results:
        jobs_list.append({
            "job_id": r[0],
            "url": r[1],
            "status": r[2],
            "pages_crawled": r[3],
            "max_pages": r[4],
            "created_at": str(r[5]),
            "completed_at": str(r[6]) if r[6] else None,
            "render_js": r[7],
            "user_agent": r[8]
        })
    return jobs_list

@app.get("/job/{job_id}")
async def get_job_status(job_id: str):
    """Poll progress details for a specific crawl job."""
    job_db_path = os.path.join(DATA_DIR, f"{job_id}.db")
    if not os.path.exists(job_db_path):
        raise HTTPException(status_code=404, detail="Job DB file not found.")
        
    try:
        with get_db_conn(job_db_path, read_only=True) as conn:
            info = conn.execute("SELECT status, pages_crawled, max_pages, created_at, completed_at FROM job_info").fetchone()
    except Exception as e:
        logger.error(f"Error reading job DB {job_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to query job info database.")
        
    if not info:
        raise HTTPException(status_code=404, detail="Job entry not initialized.")
        
    # Update master db with latest crawled count
    with get_db_conn(MASTER_DB) as conn:
        conn.execute("UPDATE jobs SET status = ?, pages_crawled = ?, completed_at = ? WHERE job_id = ?", (
            info[0], info[1], info[4] if info[0] == "completed" else None, job_id
        ))
    
    return {
        "job_id": job_id,
        "status": info[0],
        "pages_crawled": info[1],
        "max_pages": info[2],
        "created_at": str(info[3]),
        "completed_at": str(info[4]) if info[4] else None
    }

@app.get("/job/{job_id}/pages")
async def get_job_pages(
    job_id: str,
    status_filter: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    """Retrieve detailed page audit statistics from a job database."""
    job_db_path = os.path.join(DATA_DIR, f"{job_id}.db")
    if not os.path.exists(job_db_path):
        raise HTTPException(status_code=404, detail="Crawl data file not found.")
        
    query = "SELECT * FROM pages WHERE 1=1"
    params = []
    
    if status_filter:
        if status_filter == "error":
            query += " AND status_code >= 400"
        elif status_filter == "redirect":
            query += " AND status_code >= 300 AND status_code < 400"
        elif status_filter == "success":
            query += " AND status_code = 200"
        elif status_filter == "missing_title":
            query += " AND (title = '' OR title IS NULL)"
        elif status_filter == "missing_desc":
            query += " AND (meta_description = '' OR meta_description IS NULL)"
        elif status_filter == "missing_alt":
            query += " AND images_missing_alt > 0"
            
    if search:
        query += " AND (url LIKE ? OR title LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
        
    query += " ORDER BY seo_score ASC"
    
    try:
        with get_db_conn(job_db_path, read_only=True) as conn:
            results = conn.execute(query, params).fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {e}")
        
    pages_list = []
    for r in results:
        ai_data = {}
        if r[23]:
            try:
                ai_data = json.loads(r[23])
            except Exception:
                pass
                
        pages_list.append({
            "url": r[0],
            "status_code": r[1],
            "load_time_ms": r[2],
            "word_count": r[3],
            "title": r[4],
            "title_length": r[5],
            "meta_description": r[6],
            "meta_description_length": r[7],
            "h1": r[8],
            "h1_count": r[9],
            "canonical": r[10],
            "canonical_status": r[11],
            "images_total": r[12],
            "images_missing_alt": r[13],
            "schema_types": r[14].split(",") if r[14] else [],
            "readability_score": r[16],
            "technical_score": r[17],
            "onpage_score": r[18],
            "performance_score": r[19],
            "ai_score": r[20],
            "seo_score": r[21],
            "redirect_chain": r[22].split(",") if r[22] else [],
            "ai_analysis": ai_data,
            "ttfb_ms": r[24] if len(r) > 24 else r[2],
            "dom_depth": r[25] if len(r) > 25 else 0,
            "dom_element_count": r[26] if len(r) > 26 else 0,
            "soft_404_flag": r[27] if len(r) > 27 else False,
            "blindspot_has_hidden_text": r[28] if len(r) > 28 else False,
            "blindspot_hidden_text": r[29] if len(r) > 29 else "",
            "elementor_optimization_active": r[30] if len(r) > 30 else False,
            "header_nesting_valid": r[31] if len(r) > 31 else True,
            "date_freshness_valid": r[32] if len(r) > 32 else True,
            "word_rule_met": r[33] if len(r) > 33 else True,
            "schema_conflicts": r[34].split(",") if (len(r) > 34 and r[34]) else [],
            "executive_priority_ledger": json.loads(r[35]) if (len(r) > 35 and r[35]) else []
        })
        
    return pages_list

@app.get("/job/{job_id}/links")
async def get_job_links(job_id: str):
    """Retrieve discovered link relationships (internal & external) for visual mapping."""
    job_db_path = os.path.join(DATA_DIR, f"{job_id}.db")
    if not os.path.exists(job_db_path):
        raise HTTPException(status_code=404, detail="Job crawl data not found.")
        
    with get_db_conn(job_db_path, read_only=True) as conn:
        links = conn.execute("SELECT source_url, target_url, link_type, anchor_text FROM links LIMIT 1000").fetchall()
    
    return [
        {"source": l[0], "target": l[1], "type": l[2], "anchor": l[3]} for l in links
    ]

@app.get("/job/{job_id}/export/csv")
async def export_job_csv(job_id: str):
    """Generate and export audit results as a CSV spreadsheet."""
    job_db_path = os.path.join(DATA_DIR, f"{job_id}.db")
    if not os.path.exists(job_db_path):
        raise HTTPException(status_code=404, detail="Crawl dataset not found.")
        
    csv_file_path = os.path.join(DATA_DIR, f"{job_id}_export.csv")
    
    # Export using DuckDB COPY statement
    with get_db_conn(job_db_path, read_only=True) as conn:
        conn.execute(f"COPY pages TO '{csv_file_path}' (HEADER, DELIMITER ',')")
    
    return FileResponse(
        csv_file_path,
        media_type="text/csv",
        filename=f"spider_seo_audit_{job_id}.csv"
    )

@app.get("/job/{job_id}/report/pdf")
async def get_pdf_report(job_id: str):
    """Render a premium white-label client PDF audit report utilizing FITS branding."""
    job_db_path = os.path.join(DATA_DIR, f"{job_id}.db")
    if not os.path.exists(job_db_path):
        raise HTTPException(status_code=404, detail="Job database not found.")
        
    with get_db_conn(job_db_path, read_only=True) as conn:
        # 1. Fetch site overall score & specs
        job_info = conn.execute("SELECT url, created_at FROM job_info").fetchone()
        if not job_info:
            raise HTTPException(status_code=404, detail="Job metadata missing.")
            
        target_url = job_info[0]
        scan_date = job_info[1]
        
        # 2. Fetch page metrics averages
        summary = conn.execute("""
            SELECT 
                COUNT(*) as pages_count,
                AVG(seo_score) as avg_seo,
                AVG(technical_score) as avg_tech,
                AVG(onpage_score) as avg_onpage,
                AVG(performance_score) as avg_perf,
                AVG(ai_score) as avg_ai,
                SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errors,
                SUM(CASE WHEN title = '' OR title IS NULL THEN 1 ELSE 0 END) as missing_titles,
                SUM(CASE WHEN meta_description = '' OR meta_description IS NULL THEN 1 ELSE 0 END) as missing_descs,
                SUM(images_missing_alt) as missing_alts
            FROM pages
        """).fetchone()
        
        # 3. Fetch list of critical pages (lowest SEO scores first)
        crawled_pages = conn.execute("""
            SELECT url, status_code, seo_score, title, meta_description, h1, word_count, canonical_status, images_total, images_missing_alt, ai_analysis_json
            FROM pages
            ORDER BY seo_score ASC LIMIT 15
        """).fetchall()
        
        # 4. Fetch consolidated priority ledger items from all pages
        ledger_rows = conn.execute("SELECT executive_priority_ledger_json FROM pages WHERE executive_priority_ledger_json IS NOT NULL").fetchall()
    
    consolidated_ledger = []
    seen_vulns = set()
    for row in ledger_rows:
        if row[0]:
            try:
                items = json.loads(row[0])
                for item in items:
                    vuln = item.get("Vulnerability Detected")
                    if vuln and vuln not in seen_vulns:
                        seen_vulns.add(vuln)
                        consolidated_ledger.append({
                            "pillar": item.get("Audit Pillar", "General"),
                            "vulnerability": vuln,
                            "impact": item.get("Technical Impact", "N/A"),
                            "strategy": item.get("Platform Resolution Strategy", "N/A")
                        })
            except Exception:
                pass
                
    pages_list = []
    for p in crawled_pages:
        ai_data = {}
        if p[10]:
            try:
                ai_data = json.loads(p[10])
            except Exception:
                pass
        pages_list.append({
            "url": p[0],
            "status_code": p[1],
            "seo_score": p[2],
            "title": p[3],
            "meta_description": p[4],
            "h1": p[5],
            "word_count": p[6],
            "canonical": p[7],
            "images_total": p[8],
            "images_missing_alt": p[9],
            "ai_suggestions": ai_data
        })
        
    # 4. Premium HTML template styled with FITS branding
    html_template = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Orbitron:wght@600;800&display=swap');
            
            body {
                font-family: 'Inter', sans-serif;
                color: #2D3748;
                margin: 0;
                padding: 0;
                background-color: #FFFFFF;
                line-height: 1.5;
            }
            
            /* Cover Page styles */
            .cover-page {
                page-break-after: always;
                background: radial-gradient(circle at center, #0B132B 0%, #06070B 100%);
                color: #FFFFFF;
                height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                padding: 50px;
                box-sizing: border-box;
            }
            
            .header-logo {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .logo-icon {
                width: 50px;
                height: 50px;
            }
            
            .fits-brand {
                font-family: 'Orbitron', sans-serif;
                font-weight: 800;
                font-size: 24px;
                letter-spacing: 2px;
                color: #00AFEF;
            }
            
            .fits-subbrand {
                color: #FFFFFF;
            }
            
            .cover-content {
                margin-top: 100px;
            }
            
            .report-title {
                font-family: 'Orbitron', sans-serif;
                font-size: 44px;
                font-weight: 800;
                line-height: 1.2;
                margin-bottom: 20px;
                background: linear-gradient(90deg, #00AFEF, #FFFFFF);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                text-shadow: 0 0 15px rgba(0, 175, 239, 0.5);
            }
            
            .report-subtitle {
                font-size: 18px;
                color: #BAC4D6;
                margin-bottom: 50px;
                text-transform: uppercase;
                letter-spacing: 2px;
            }
            
            .metadata-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                padding-top: 30px;
                max-width: 600px;
            }
            
            .metadata-item h4 {
                margin: 0;
                font-size: 12px;
                color: #FF8C00;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .metadata-item p {
                margin: 5px 0 0 0;
                font-size: 16px;
                color: #FFFFFF;
                font-weight: 500;
            }
            
            /* Inner Page Content Styles */
            .page {
                page-break-after: always;
                padding: 40px;
                box-sizing: border-box;
            }
            
            .page-title {
                font-family: 'Orbitron', sans-serif;
                font-size: 24px;
                font-weight: 800;
                color: #0B132B;
                border-bottom: 3px solid #00AFEF;
                padding-bottom: 10px;
                margin-top: 0;
                margin-bottom: 30px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .section-desc {
                font-size: 14px;
                color: #4A5568;
                margin-bottom: 20px;
            }
            
            /* Score Wheels & Charts */
            .metrics-summary-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
                margin-bottom: 40px;
            }
            
            .metric-card {
                background: #F7FAFC;
                border-left: 4px solid #00AFEF;
                border-radius: 6px;
                padding: 20px;
                text-align: center;
                box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            }
            
            .metric-card.seo {
                border-left-color: #FF8C00;
                background: #FFFDF5;
            }
            
            .metric-val {
                font-family: 'Orbitron', sans-serif;
                font-size: 32px;
                font-weight: 800;
                color: #2D3748;
                margin: 10px 0;
            }
            
            .metric-val.score-green { color: #38A169; }
            .metric-val.score-orange { color: #DD6B20; }
            .metric-val.score-red { color: #E53E3E; }
            
            .metric-label {
                font-size: 12px;
                color: #718096;
                text-transform: uppercase;
                font-weight: 600;
            }
            
            /* Table formatting */
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                font-size: 13px;
            }
            
            th {
                background-color: #0B132B;
                color: #FFFFFF;
                text-align: left;
                padding: 12px 10px;
                font-weight: 600;
                text-transform: uppercase;
                font-size: 11px;
                letter-spacing: 0.5px;
            }
            
            td {
                padding: 12px 10px;
                border-bottom: 1px solid #E2E8F0;
                word-break: break-all;
            }
            
            tr:nth-child(even) {
                background-color: #F8FAFC;
            }
            
            .badge {
                display: inline-block;
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
            }
            
            .badge-green { background-color: #DEF7EC; color: #03543F; }
            .badge-orange { background-color: #FEF3C7; color: #92400E; }
            .badge-red { background-color: #FDE8E8; color: #9B1C1C; }
            
            /* AI suggestion formatting */
            .ai-rec-box {
                background-color: #F0F9FF;
                border-left: 4px solid #00AFEF;
                padding: 15px;
                border-radius: 4px;
                margin-top: 10px;
                font-size: 12px;
            }
            
            .ai-rec-title {
                font-weight: 700;
                color: #0369A1;
                margin-bottom: 5px;
            }
            
            .footer-info {
                display: flex;
                justify-content: space-between;
                font-size: 10px;
                color: #A0AEC0;
                border-top: 1px solid #E2E8F0;
                padding-top: 15px;
                margin-top: auto;
            }
        </style>
    </head>
    <body>
    
        <!-- Page 1: Cover Page -->
        <div class="cover-page">
            <div class="header-logo">
                <!-- FITS Logo Mask Icon -->
                <svg class="logo-icon" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="45" stroke="#00AFEF" stroke-width="8"/>
                    <path d="M35 35H65V45H45V55H60V65H45V75H35V35Z" fill="#00AFEF"/>
                    <rect x="65" y="55" width="10" height="20" fill="#FF8C00"/>
                </svg>
                <div class="fits-brand">FITS <span class="fits-subbrand">SPIDER</span></div>
            </div>
            
            <div class="cover-content">
                <div class="report-title">SEARCH ENGINE AUDIT & CRITIQUE</div>
                <div class="report-subtitle">Comprehensive SEO & AI Semantic Analysis</div>
                
                <div class="metadata-grid">
                    <div class="metadata-item">
                        <h4>Target URL</h4>
                        <p>{{ target_url }}</p>
                    </div>
                    <div class="metadata-item">
                        <h4>Generated On</h4>
                        <p>{{ scan_date }}</p>
                    </div>
                    <div class="metadata-item">
                        <h4>Audit Operator</h4>
                        <p>Freelance IT Solutions</p>
                    </div>
                    <div class="metadata-item">
                        <h4>Compliance Status</h4>
                        <p>{% if avg_seo >= 85 %}COMPLIANT{% else %}ACTION REQUIRED{% endif %}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Page 2: Executive Summary -->
        <div class="page">
            <div class="page-title">Executive Summary</div>
            <p class="section-desc">FITS SPIDER has evaluated the crawl topology, page-level HTML structures, schema compliance, and load times for the site. Below are the consolidated scoring indicators across the four core diagnostic matrices:</p>
            
            <div class="metrics-summary-grid">
                <div class="metric-card seo">
                    <div class="metric-label">OVERALL SEO SCORE</div>
                    <div class="metric-val {% if avg_seo >= 85 %}score-green{% elif avg_seo >= 60 %}score-orange{% else %}score-red{% endif %}">{{ avg_seo }}</div>
                    <div class="metric-label">Weighted Average</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">TECHNICAL HEALTH</div>
                    <div class="metric-val {% if avg_tech >= 85 %}score-green{% elif avg_tech >= 60 %}score-orange{% else %}score-red{% endif %}">{{ avg_tech }}</div>
                    <div class="metric-label">Index & Redirects</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">ON-PAGE HEALTH</div>
                    <div class="metric-val {% if avg_onpage >= 85 %}score-green{% elif avg_onpage >= 60 %}score-orange{% else %}score-red{% endif %}">{{ avg_onpage }}</div>
                    <div class="metric-label">Meta Tags & Headings</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">AI CONTENT SCORE</div>
                    <div class="metric-val {% if avg_ai >= 85 %}score-green{% elif avg_ai >= 60 %}score-orange{% else %}score-red{% endif %}">{{ avg_ai }}</div>
                    <div class="metric-label">Copy & Intent Review</div>
                </div>
            </div>
            
            <h3 style="font-family: 'Orbitron', sans-serif; color: #0B132B; margin-top: 30px;">Critical Crawl Issues</h3>
            <p>During the spider crawl of <strong>{{ pages_count }}</strong> discoverable pages, the following critical faults were discovered:</p>
            
            <ul style="font-size: 14px; color: #4A5568; line-height: 1.8;">
                <li><strong>Broken Links & Client Errors (4xx/5xx):</strong> {{ errors }} pages returned invalid status codes.</li>
                <li><strong>Missing Title Tags:</strong> {{ missing_titles }} pages lack title tags, causing search engines to auto-generate bad snippets.</li>
                <li><strong>Missing Meta Descriptions:</strong> {{ missing_descs }} pages lack meta descriptions, hurting Click-Through Rates (CTR).</li>
                <li><strong>Unlabeled Graphics (Alt tags):</strong> {{ missing_alts }} images lack descriptive alt texts, leaving them invisible to Google Image search.</li>
            </ul>
            
            <div class="footer-info">
                <span>FITS SPIDER SEO Report &copy; 2026</span>
                <span>Target: {{ target_url }}</span>
            </div>
        </div>
        
        <!-- Page 3: Executive Priority Ledger -->
        <div class="page">
            <div class="page-title">Executive Priority Ledger</div>
            <p class="section-desc">The following prioritization matrix lists all technical, performance, and schema vulnerabilities discovered across the website, ordered by engineering impact:</p>
            
            <table>
                <thead>
                    <tr>
                        <th style="width: 15%;">Audit Pillar</th>
                        <th style="width: 25%;">Vulnerability Detected</th>
                        <th style="width: 30%;">Technical Impact</th>
                        <th style="width: 30%;">Platform Resolution Strategy</th>
                    </tr>
                </thead>
                <tbody>
                    {% if consolidated_ledger %}
                        {% for item in consolidated_ledger %}
                        <tr>
                            <td style="font-weight: bold; font-family: 'Orbitron', sans-serif; font-size: 11px; color: #00AFEF;">{{ item.pillar }}</td>
                            <td style="font-size: 12px; font-weight: 500;">{{ item.vulnerability }}</td>
                            <td style="font-size: 11px; color: #4A5568;">{{ item.impact }}</td>
                            <td style="font-size: 11px; color: #2D3748; background-color: #F0F9FF; border-left: 2px solid #00AFEF; padding-left: 5px;">{{ item.strategy }}</td>
                        </tr>
                        {% endfor %}
                    {% else %}
                        <tr>
                            <td colspan="4" style="text-align: center; color: #718096; padding: 20px;">No technical or schema vulnerabilities detected across the audited pages. Complete compliance achieved.</td>
                        </tr>
                    {% endif %}
                </tbody>
            </table>
            
            <div class="footer-info" style="margin-top: 40px;">
                <span>FITS SPIDER SEO Report &copy; 2026</span>
                <span>Target: {{ target_url }}</span>
            </div>
        </div>
        
        <!-- Page 4: Page Level Audit details -->
        <div class="page">
            <div class="page-title">Page-Level Diagnostics</div>
            <p class="section-desc">The table below details the top pages with the lowest SEO optimization scores, highlighting specific structural and AI recommendations:</p>
            
            <table>
                <thead>
                    <tr>
                        <th style="width: 40%;">URL</th>
                        <th style="width: 10%; text-align: center;">Status</th>
                        <th style="width: 15%; text-align: center;">SEO Score</th>
                        <th style="width: 15%;">Issues</th>
                        <th style="width: 20%;">AI Snippet Critique</th>
                    </tr>
                </thead>
                <tbody>
                    {% for page in pages %}
                    <tr>
                        <td style="font-weight: 500; font-size: 11px;">{{ page.url }}</td>
                        <td style="text-align: center;">
                            <span class="badge {% if page.status_code == 200 %}badge-green{% elif page.status_code >= 300 and page.status_code < 400 %}badge-orange{% else %}badge-red{% endif %}">
                                {{ page.status_code }}
                            </span>
                        </td>
                        <td style="text-align: center; font-weight: bold; font-family: 'Orbitron', sans-serif;">
                            <span style="color: {% if page.seo_score >= 85 %}#38A169{% elif page.seo_score >= 60 %}#DD6B20{% else %}#E53E3E{% endif %};">
                                {{ page.seo_score }}
                            </span>
                        </td>
                        <td style="font-size: 11px;">
                            {% if not page.title %}Title Missing<br>{% endif %}
                            {% if not page.meta_description %}Desc Missing<br>{% endif %}
                            {% if page.images_missing_alt > 0 %}{{ page.images_missing_alt }} images missing alt{% endif %}
                        </td>
                        <td>
                            {% if page.ai_suggestions.copywriting_critique %}
                            <div class="ai-rec-box">
                                <div class="ai-rec-title">FITS AI Suggestion</div>
                                {{ page.ai_suggestions.copywriting_critique }}
                                <br>
                                <strong style="color: #FF8C00;">Keywords:</strong> {{ page.ai_suggestions.keyword_opportunities|join(', ') }}
                            </div>
                            {% else %}
                            No critical copy flaws detected.
                            {% endif %}
                        </td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
            
            <div class="footer-info" style="margin-top: 40px;">
                <span>FITS SPIDER SEO Report &copy; 2026</span>
                <span>Target: {{ target_url }}</span>
            </div>
        </div>
        
    </body>
    </html>
    """
    
    # 5. Render Jinja HTML with crawl dataset variables
    template = Template(html_template)
    rendered_html = template.render(
        target_url=target_url,
        scan_date=str(scan_date),
        pages_count=summary[0],
        avg_seo=int(summary[1] or 0),
        avg_tech=int(summary[2] or 0),
        avg_onpage=int(summary[3] or 0),
        avg_perf=int(summary[4] or 0),
        avg_ai=int(summary[5] or 0),
        errors=summary[6],
        missing_titles=summary[7],
        missing_descs=summary[8],
        missing_alts=summary[9],
        pages=pages_list,
        consolidated_ledger=consolidated_ledger
    )
    
    # 6. Feed rendered HTML into headless Playwright to generate PDF
    pdf_bytes = b""
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.set_content(rendered_html)
            # Give Google Fonts a brief moment to download
            await asyncio.sleep(1.0)
            
            pdf_bytes = await page.pdf(
                format="A4",
                print_background=True,
                margin={
                    "top": "0mm",
                    "bottom": "0mm",
                    "left": "0mm",
                    "right": "0mm"
                }
            )
            await browser.close()
    except Exception as e:
        logger.error(f"Failed rendering PDF via Playwright: {e}")
        raise HTTPException(status_code=500, detail="Headless PDF compilation failed.")
        
    # Return binary PDF stream
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=FITS_SPIDER_SEO_Audit_{job_id}.pdf"}
    )

@app.get("/")
async def get_index():
    return FileResponse(os.path.join(os.path.dirname(__file__), "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

