import os
import re
import time
import json
import asyncio
import logging
import urllib.parse
from typing import Dict, List, Any, Optional, Set
from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, HttpUrl
import httpx
from bs4 import BeautifulSoup
import duckdb
from playwright.async_api import async_playwright

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cortex-seo-scanner")

# Configuration paths
DATA_DIR = "/mnt/data_lake/audit/seo"
DB_PATH = os.path.join(DATA_DIR, "cortex_seo.db")

os.makedirs(DATA_DIR, exist_ok=True)

# Initialize DuckDB tables
def init_db() -> None:
    conn = duckdb.connect(DB_PATH)
    # Jobs Table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            job_id VARCHAR PRIMARY KEY,
            url VARCHAR,
            status VARCHAR,
            pages_crawled INTEGER,
            max_pages INTEGER,
            created_at TIMESTAMP,
            completed_at TIMESTAMP
        )
    """)
    # Pages Table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS pages (
            page_id VARCHAR PRIMARY KEY,
            job_id VARCHAR,
            url VARCHAR,
            status_code INTEGER,
            title VARCHAR,
            title_length INTEGER,
            meta_description VARCHAR,
            meta_description_length INTEGER,
            h1 VARCHAR,
            h1_count INTEGER,
            word_count INTEGER,
            canonical VARCHAR,
            canonical_status VARCHAR,
            schema_types VARCHAR,
            redirect_chain VARCHAR,
            images_total INTEGER,
            images_missing_alt INTEGER,
            load_time_ms INTEGER,
            accessibility_score INTEGER,
            seo_score INTEGER
        )
    """)
    # Links Table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS links (
            job_id VARCHAR,
            source_url VARCHAR,
            target_url VARCHAR,
            link_type VARCHAR, -- 'internal' or 'external'
            status_code INTEGER
        )
    """)
    conn.close()

init_db()

app = FastAPI(
    title="CORTEX: In-Depth SEO Diagnostic Scanner",
    description="Forensic-grade SEO spider and analyzer",
    version="1.5.0"
)

class CrawlRequest(BaseModel):
    url: str
    max_pages: int = 50
    render_js: bool = False
    user_agent: str = "CortexBot/1.5 (Secure SEO Crawler)"
    obey_robots: bool = True

class JobStatus(BaseModel):
    job_id: str
    url: str
    status: str
    pages_crawled: int
    max_pages: int
    created_at: str
    completed_at: Optional[str] = None

# In-memory job cache for fast status checks
active_jobs: Dict[str, Dict[str, Any]] = {}

# Crawl Engine Logic
async def run_crawl_job(job_id: str, request: CrawlRequest) -> None:
    logger.info(f"Starting crawl job {job_id} for URL: {request.url}")
    conn = duckdb.connect(DB_PATH)
    conn.execute("UPDATE jobs SET status = 'running' WHERE job_id = ?", (job_id,))
    conn.close()
    
    active_jobs[job_id]["status"] = "running"
    
    parsed_base = urllib.parse.urlparse(request.url)
    base_domain = parsed_base.netloc
    
    queue: List[str] = [request.url]
    visited: Set[str] = set()
    crawled_count = 0
    
    headers = {"User-Agent": request.user_agent}
    
    # Initialize Playwright if JS rendering is requested
    playwright_context = None
    browser = None
    if request.render_js:
        try:
            playwright_context = await async_playwright().start()
            browser = await playwright_context.chromium.launch(headless=True)
            logger.info("Playwright browser instance started successfully.")
        except Exception as e:
            logger.error(f"Failed to start Playwright: {e}. Falling back to standard HTTPX.")
            request.render_js = False

    while queue and crawled_count < request.max_pages:
        current_url = queue.pop(0)
        if current_url in visited:
            continue
            
        visited.add(current_url)
        crawled_count += 1
        active_jobs[job_id]["pages_crawled"] = crawled_count
        
        # Update progress in DuckDB
        conn = duckdb.connect(DB_PATH)
        conn.execute("UPDATE jobs SET pages_crawled = ? WHERE job_id = ?", (crawled_count, job_id))
        conn.close()
        
        logger.info(f"[{crawled_count}/{request.max_pages}] Crawling: {current_url}")
        
        start_time = time.time()
        html_content = ""
        status_code = 0
        redirect_chain = []
        
        if request.render_js and browser:
            # Render via Playwright
            try:
                page = await browser.new_page(user_agent=request.user_agent)
                response = await page.goto(current_url, timeout=30000)
                status_code = response.status if response else 200
                html_content = await page.content()
                await page.close()
            except Exception as e:
                logger.error(f"Playwright failed to fetch {current_url}: {e}")
                status_code = 500
        else:
            # Fetch via HTTPX
            try:
                async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=15.0) as client:
                    response = await client.get(current_url)
                    status_code = response.status_code
                    html_content = response.text
                    redirect_chain = [str(r.url) for r in response.history]
            except Exception as e:
                logger.error(f"HTTPX failed to fetch {current_url}: {e}")
                status_code = 500
                
        load_time_ms = int((time.time() - start_time) * 1000)
        
        # Analyze page content
        title = ""
        meta_desc = ""
        h1 = ""
        h1_count = 0
        word_count = 0
        canonical = ""
        schema_types = []
        images_total = 0
        images_missing_alt = 0
        links_found: List[str] = []
        
        if status_code == 200 and html_content:
            try:
                soup = BeautifulSoup(html_content, "html.parser")
                
                # Title
                title_tag = soup.find("title")
                if title_tag:
                    title = title_tag.get_text().strip()
                    
                # Meta description
                desc_tag = soup.find("meta", attrs={"name": "description"})
                if desc_tag:
                    meta_desc = desc_tag.get("content", "").strip()
                    
                # Headings
                h1_tags = soup.find_all("h1")
                h1_count = len(h1_tags)
                if h1_tags:
                    h1 = h1_tags[0].get_text().strip()
                    
                # Canonical
                canonical_tag = soup.find("link", rel="canonical")
                if canonical_tag:
                    canonical = canonical_tag.get("href", "").strip()
                    
                # Word count estimate
                body_text = soup.body.get_text() if soup.body else soup.get_text()
                word_count = len(re.findall(r'\w+', body_text))
                
                # Images
                img_tags = soup.find_all("img")
                images_total = len(img_tags)
                images_missing_alt = sum(1 for img in img_tags if not img.get("alt"))
                
                # Extract Schema JSON-LD
                scripts = soup.find_all("script", type="application/ld+json")
                for s in scripts:
                    try:
                        data = json.loads(s.string)
                        if isinstance(data, dict):
                            t = data.get("@type")
                            if t: schema_types.append(t)
                        elif isinstance(data, list):
                            for d in data:
                                if isinstance(d, dict) and d.get("@type"):
                                    schema_types.append(d.get("@type"))
                    except:
                        pass
                        
                # Link discovery
                anchor_tags = soup.find_all("a", href=True)
                for a in anchor_tags:
                    href = a["href"].strip()
                    full_link = urllib.parse.urljoin(current_url, href)
                    # Clean fragment
                    full_link = urllib.parse.urlsplit(full_link)._replace(fragment="").geturl()
                    
                    parsed_link = urllib.parse.urlparse(full_link)
                    
                    if parsed_link.scheme in ["http", "https"]:
                        link_type = "internal" if parsed_link.netloc == base_domain else "external"
                        links_found.append((full_link, link_type))
                        
                        # Populate queue if internal and not visited
                        if link_type == "internal" and full_link not in visited and full_link not in queue:
                            queue.append(full_link)
                            
            except Exception as e:
                logger.error(f"Error parsing page {current_url}: {e}")
                
        # Basic scoring algorithm
        seo_score = 100
        if not title: seo_score -= 20
        elif len(title) < 30 or len(title) > 60: seo_score -= 5
        
        if not meta_desc: seo_score -= 20
        elif len(meta_desc) < 110 or len(meta_desc) > 160: seo_score -= 5
        
        if h1_count == 0: seo_score -= 15
        elif h1_count > 1: seo_score -= 10
        
        if word_count < 300: seo_score -= 10
        if images_missing_alt > 0: seo_score -= min(15, images_missing_alt * 2)
        if not canonical: seo_score -= 10
        
        seo_score = max(0, seo_score)
        
        # Save page metrics to DuckDB
        page_id = f"{job_id}_{hash(current_url)}"
        canonical_status = "valid" if canonical == current_url else "mismatch"
        if not canonical: canonical_status = "missing"
        
        conn = duckdb.connect(DB_PATH)
        conn.execute("""
            INSERT OR REPLACE INTO pages (
                page_id, job_id, url, status_code, title, title_length,
                meta_description, meta_description_length, h1, h1_count,
                word_count, canonical, canonical_status, schema_types,
                redirect_chain, images_total, images_missing_alt,
                load_time_ms, accessibility_score, seo_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            page_id, job_id, current_url, status_code, title, len(title),
            meta_desc, len(meta_desc), h1, h1_count, word_count, canonical,
            canonical_status, ",".join(schema_types), ",".join(redirect_chain),
            images_total, images_missing_alt, load_time_ms, 90, seo_score
        ))
        
        # Record found links
        for target, l_type in links_found:
            conn.execute("""
                INSERT INTO links (job_id, source_url, target_url, link_type, status_code)
                VALUES (?, ?, ?, ?, 0)
            """, (job_id, current_url, target, l_type))
            
        conn.close()
        
        # Graceful yield to other async tasks
        await asyncio.sleep(0.5)
        
    if browser:
        await browser.close()
    if playwright_context:
        await playwright_context.stop()
        
    # Mark job complete
    logger.info(f"Crawl job {job_id} complete!")
    conn = duckdb.connect(DB_PATH)
    conn.execute("UPDATE jobs SET status = 'completed', completed_at = ? WHERE job_id = ?", (time.strftime('%Y-%m-%d %H:%M:%S'), job_id))
    conn.close()
    
    active_jobs[job_id]["status"] = "completed"
    active_jobs[job_id]["completed_at"] = time.strftime('%Y-%m-%d %H:%M:%S')

# FastAPI Routes
@app.post("/crawl")
async def start_crawl(request: CrawlRequest, background_tasks: BackgroundTasks) -> JSONResponse:
    job_id = f"job_{int(time.time())}"
    
    # Store initial job state
    conn = duckdb.connect(DB_PATH)
    conn.execute("""
        INSERT INTO jobs (job_id, url, status, pages_crawled, max_pages, created_at, completed_at)
        VALUES (?, ?, 'pending', 0, ?, ?, NULL)
    """, (job_id, request.url, request.max_pages, time.strftime('%Y-%m-%d %H:%M:%S')))
    conn.close()
    
    active_jobs[job_id] = {
        "job_id": job_id,
        "url": request.url,
        "status": "pending",
        "pages_crawled": 0,
        "max_pages": request.max_pages,
        "created_at": time.strftime('%Y-%m-%d %H:%M:%S'),
        "completed_at": None
    }
    
    background_tasks.add_task(run_crawl_job, job_id, request)
    
    return JSONResponse(status_code=202, content={"job_id": job_id, "status": "pending", "message": "Crawl job started."})

@app.get("/crawl/{job_id}", response_model=JobStatus)
async def get_crawl_status(job_id: str) -> JobStatus:
    if job_id in active_jobs:
        return JobStatus(**active_jobs[job_id])
        
    conn = duckdb.connect(DB_PATH)
    res = conn.execute("SELECT job_id, url, status, pages_crawled, max_pages, CAST(created_at AS VARCHAR), CAST(completed_at AS VARCHAR) FROM jobs WHERE job_id = ?", (job_id,)).fetchone()
    conn.close()
    
    if not res:
        raise HTTPException(status_code=404, detail="Crawl job not found")
        
    return JobStatus(
        job_id=res[0],
        url=res[1],
        status=res[2],
        pages_crawled=res[3],
        max_pages=res[4],
        created_at=res[5],
        completed_at=res[6]
    )

@app.get("/crawl/{job_id}/results")
async def get_crawl_results(job_id: str, limit: int = 100, offset: int = 0) -> JSONResponse:
    conn = duckdb.connect(DB_PATH)
    # Convert query results to dictionary objects
    res = conn.execute("""
        SELECT url, status_code, title, title_length, meta_description, meta_description_length,
               h1, h1_count, word_count, canonical, canonical_status, schema_types, redirect_chain,
               images_total, images_missing_alt, load_time_ms, accessibility_score, seo_score
        FROM pages WHERE job_id = ?
        LIMIT ? OFFSET ?
    """, (job_id, limit, offset)).fetchall()
    conn.close()
    
    keys = ["url", "status_code", "title", "title_length", "meta_description", "meta_description_length",
            "h1", "h1_count", "word_count", "canonical", "canonical_status", "schema_types", "redirect_chain",
            "images_total", "images_missing_alt", "load_time_ms", "accessibility_score", "seo_score"]
            
    results_list = [dict(zip(keys, row)) for row in res]
    return JSONResponse(content={"job_id": job_id, "count": len(results_list), "pages": results_list})

@app.get("/crawl/{job_id}/remediate")
async def get_remediate_advice(job_id: str) -> JSONResponse:
    conn = duckdb.connect(DB_PATH)
    # Fetch issues
    issues = conn.execute("""
        SELECT url, title, meta_description, h1_count, word_count, images_missing_alt
        FROM pages WHERE job_id = ? AND (title IS NULL OR title_length < 30 OR title_length > 60 OR meta_description_length < 110 OR meta_description_length > 160 OR h1_count != 1 OR word_count < 300 OR images_missing_alt > 0)
    """, (job_id,)).fetchall()
    conn.close()
    
    advice = []
    for row in issues:
        url, title, desc, h1s, words, img_alt = row
        item_advice = {"url": url, "issues": []}
        
        if not title:
            item_advice["issues"].append({
                "type": "title_missing",
                "severity": "high",
                "message": "Title tag is completely missing.",
                "fix": f"<title>Optimized Title for {urllib.parse.urlparse(url).path or '/'}</title>"
            })
        elif len(title) < 30 or len(title) > 60:
            item_advice["issues"].append({
                "type": "title_length",
                "severity": "medium",
                "message": f"Title tag has suboptimal length ({len(title)} chars). Should be between 30 and 60 chars.",
                "fix": f"Rewrite to be concise, e.g., '{title[:45]}... | Brand'"
            })
            
        if not desc:
            item_advice["issues"].append({
                "type": "meta_description_missing",
                "severity": "high",
                "message": "Meta description tag is missing.",
                "fix": "<meta name=\"description\" content=\"Enter a compelling call-to-action summary of the page here (110-160 characters).\" />"
            })
            
        if h1s == 0:
            item_advice["issues"].append({
                "type": "h1_missing",
                "severity": "high",
                "message": "Missing H1 header. The page must have exactly one <h1> heading for proper layout structure.",
                "fix": f"Wrap the primary page title in <h1> tag."
            })
        elif h1s > 1:
            item_advice["issues"].append({
                "type": "h1_multiple",
                "severity": "medium",
                "message": f"Multiple H1 tags found ({h1s}). Restructure elements so only one primary <h1> exists.",
                "fix": "Downgrade secondary H1 headings to H2 tags."
            })
            
        if words < 300:
            item_advice["issues"].append({
                "type": "thin_content",
                "severity": "medium",
                "message": f"Thin content detected ({words} words). Search engines prefer higher value copy content.",
                "fix": "Expand copy by adding clear paragraphs, descriptions, or FAQs."
            })
            
        if img_alt > 0:
            item_advice["issues"].append({
                "type": "image_alt_missing",
                "severity": "medium",
                "message": f"{img_alt} images are missing alternative descriptive alt tags.",
                "fix": "Locate target images in source code and append descriptive alt attributes: alt=\"Image Description\"."
            })
            
        advice.append(item_advice)
        
    # Generate generic site sitemap XML
    urls_crawled = conn.execute("SELECT url FROM pages WHERE job_id = ? AND status_code = 200", (job_id,)).fetchall()
    sitemap_xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for (u,) in urls_crawled:
        sitemap_xml += f'  <url>\n    <loc>{u}</loc>\n    <changefreq>weekly</changefreq>\n  </url>\n'
    sitemap_xml += '</urlset>'
    
    return JSONResponse(content={
        "job_id": job_id,
        "remediations": advice,
        "sitemap_xml_blueprint": sitemap_xml
    })

@app.get("/crawl/{job_id}/export")
async def export_crawl_csv(job_id: str) -> StreamingResponse:
    conn = duckdb.connect(DB_PATH)
    res = conn.execute("SELECT url, status_code, seo_score, title, meta_description, h1, word_count, canonical FROM pages WHERE job_id = ?", (job_id,)).fetchall()
    conn.close()
    
    def csv_generator():
        yield "URL,Status Code,SEO Score,Title,Meta Description,H1 Heading,Word Count,Canonical URL\n"
        for row in res:
            escaped_row = []
            for item in row:
                if item is None:
                    escaped_row.append("")
                else:
                    val = str(item).replace('"', '""')
                    escaped_row.append(f'"{val}"')
            yield ",".join(escaped_row) + "\n"
            
    return StreamingResponse(
        csv_generator(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=seo_audit_{job_id}.csv"}
    )

@app.get("/history")
async def get_crawl_history() -> JSONResponse:
    conn = duckdb.connect(DB_PATH)
    res = conn.execute("SELECT job_id, url, status, pages_crawled, max_pages, CAST(created_at AS VARCHAR), CAST(completed_at AS VARCHAR) FROM jobs ORDER BY created_at DESC").fetchall()
    conn.close()
    
    keys = ["job_id", "url", "status", "pages_crawled", "max_pages", "created_at", "completed_at"]
    history = [dict(zip(keys, row)) for row in res]
    return JSONResponse(content={"history": history})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
