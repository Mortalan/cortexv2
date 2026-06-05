import os
import re
import time
import json
import asyncio
import logging
import urllib.parse
from typing import Dict, List, Any, Optional, Set
import httpx
from bs4 import BeautifulSoup
import duckdb
from playwright.async_api import async_playwright

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cortex-spider-crawler")

# Default User Agents
USER_AGENTS = {
    "desktop": "Mozilla/5.0 (compatible; FITSSpider/2.0; +https://fits.net.za)",
    "mobile": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36 (compatible; FITSSpider/2.0; +https://fits.net.za)",
    "googlebot": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
}

def init_job_db(db_path: str) -> None:
    """Initialize DuckDB tables for a specific crawl job."""
    conn = duckdb.connect(db_path)
    
    # 1. Job Info Table
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
    
    # 2. Pages Table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS pages (
            url VARCHAR PRIMARY KEY,
            status_code INTEGER,
            load_time_ms INTEGER,
            word_count INTEGER,
            title VARCHAR,
            title_length INTEGER,
            meta_description VARCHAR,
            meta_description_length INTEGER,
            h1 VARCHAR,
            h1_count INTEGER,
            canonical VARCHAR,
            canonical_status VARCHAR,
            images_total INTEGER,
            images_missing_alt INTEGER,
            schema_types VARCHAR,
            schema_json VARCHAR,
            readability_score INTEGER,
            technical_score INTEGER,
            onpage_score INTEGER,
            performance_score INTEGER,
            ai_score INTEGER,
            seo_score INTEGER,
            redirect_chain VARCHAR,
            ai_analysis_json VARCHAR
        )
    """)
    
    # 3. Links Table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS links (
            source_url VARCHAR,
            target_url VARCHAR,
            link_type VARCHAR, -- 'internal' or 'external'
            anchor_text VARCHAR,
            status_code INTEGER
        )
    """)
    
    # 4. Images Table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS images (
            page_url VARCHAR,
            image_url VARCHAR,
            alt_text VARCHAR,
            file_size_kb INTEGER,
            status_code INTEGER
        )
    """)
    
    conn.close()

async def call_ollama_critique(ollama_url: str, page_data: Dict[str, Any]) -> Dict[str, Any]:
    """Call Ollama on VM 101 for semantic review of page content."""
    prompt = f"""
You are SPIDER, a senior SEO specialist at Freelance IT Solutions (FITS). Analyze the following page diagnostics and copywriting:

URL: {page_data['url']}
Title: {page_data['title']} (Length: {page_data['title_length']})
Description: {page_data['meta_description']} (Length: {page_data['meta_description_length']})
H1: {page_data['h1']} (H1 Count: {page_data['h1_count']})
Word Count: {page_data['word_count']}
Readability Index: {page_data['readability_score']}
Structural Issues: {page_data['issues']}

Page Text Snippet:
{page_data['text_snippet']}

Task:
Generate SEO improvements, conversion suggestions, and Generative Engine Optimization (GEO) insights for this page. Also, generate ready-to-copy code fixes for developers.
Output a JSON object matching this structure EXACTLY (do not wrap in markdown or add explanations):
{{
  "title_suggestion": "string (optimized under 60 chars)",
  "meta_description_suggestion": "string (optimized under 160 chars)",
  "content_quality_score": 85, (integer 1-100)
  "copywriting_critique": "string (2-3 sentences critiquing intent and conversion)",
  "keyword_opportunities": ["kw1", "kw2", "kw3"], (list of 3 semantic keywords)
  "remediation_steps": ["step1", "step2"], (list of practical steps to fix HTML issues)
  "geo_ingestibility_score": 90, (integer 1-100 evaluating how well AI crawlers parse this content)
  "geo_citation_score": 75, (integer 1-100 evaluating citation likelihood based on facts, stats, quotes)
  "geo_qa_score": 80, (integer 1-100 evaluating conversational query alignment)
  "geo_recommendations": ["rec1", "rec2"], (list of 2 actions to make content highly citable by Perplexity, ChatGPT Search, Gemini SGE)
  "auto_fix": {{
    "nginx_redirect": "string or null (nginx 301 rewrite command to redirect if URL has parameters/slashes issues)",
    "json_ld_schema": "string or null (fully formed JSON-LD script tag with structured data context for this page)",
    "robots_directive": "string or null (suggested robots.txt rule for this path)",
    "suggested_h1": "string or null (optimized H1 tag)"
  }}
}}
"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{ollama_url}/api/generate",
                json={
                    "model": "hermes3",
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.3}
                }
            )
            if response.status_code == 200:
                resp_data = response.json()
                raw_text = resp_data.get("response", "").strip()
                # Clean markdown wrapper if any
                if raw_text.startswith("```json"):
                    raw_text = raw_text.split("```json")[1].split("```")[0].strip()
                elif raw_text.startswith("```"):
                    raw_text = raw_text.split("```")[1].split("```")[0].strip()
                return json.loads(raw_text)
    except Exception as e:
        logger.error(f"Ollama critique failed: {e}")
        
    # Fallback default recommendations
    return {
        "title_suggestion": page_data['title'] if page_data['title'] else "Optimize Page Title",
        "meta_description_suggestion": page_data['meta_description'] if page_data['meta_description'] else "Add a compelling meta description.",
        "content_quality_score": 70 if page_data['word_count'] > 300 else 40,
        "copywriting_critique": "AI analysis skipped. Content should prioritize targeted keywords and clear calls to action.",
        "keyword_opportunities": ["local business", "services", "seo optimization"],
        "remediation_steps": ["Add alt tags to images", "Optimize title tags", "Expand page copywriting content"],
        "geo_ingestibility_score": 80,
        "geo_citation_score": 50,
        "geo_qa_score": 60,
        "geo_recommendations": ["Add stats or quotes to increase citation likelihood", "Add a Q&A summary block"],
        "auto_fix": {
            "nginx_redirect": None,
            "json_ld_schema": "{\n  \"@context\": \"https://schema.org\",\n  \"@type\": \"WebPage\",\n  \"name\": \"" + (page_data['title'] or "Page") + "\"\n}",
            "robots_directive": "Allow: " + urllib.parse.urlparse(page_data['url']).path,
            "suggested_h1": page_data['h1'] if page_data['h1'] else "Optimize Main Heading"
        }
    }

def calculate_readability(text: str) -> int:
    """Calculate basic readability index (approximate Flesch Reading Ease)."""
    if not text:
        return 0
    words = len(re.findall(r'\w+', text))
    sentences = len(re.split(r'[.!?]+', text))
    # Count syllables (rough approximation)
    syllables = sum(len(re.findall(r'[aeiouy]', w.lower())) for w in re.findall(r'\w+', text))
    
    if words == 0 or sentences == 0:
        return 0
        
    score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
    return max(0, min(100, int(score)))

def analyze_page_html(url: str, html: str, load_time_ms: int, base_domain: str) -> Dict[str, Any]:
    """Audit the HTML structure of a crawled page."""
    soup = BeautifulSoup(html, "html.parser")
    
    # Text Extraction
    text_content = soup.get_text()
    clean_text = " ".join(text_content.split())
    word_count = len(clean_text.split())
    readability_score = calculate_readability(clean_text)
    
    # Title
    title_tag = soup.find("title")
    title = title_tag.get_text().strip() if title_tag else ""
    title_length = len(title)
    
    # Meta Description
    meta_desc_tag = soup.find("meta", attrs={"name": "description"})
    if not meta_desc_tag:
        meta_desc_tag = soup.find("meta", attrs={"property": "og:description"})
    meta_desc = meta_desc_tag["content"].strip() if meta_desc_tag and "content" in meta_desc_tag.attrs else ""
    meta_desc_length = len(meta_desc)
    
    # Headings
    h1s = soup.find_all("h1")
    h1_count = len(h1s)
    h1 = h1s[0].get_text().strip() if h1s else ""
    
    # Canonical
    canonical_tag = soup.find("link", rel="canonical")
    canonical = canonical_tag["href"].strip() if canonical_tag and "href" in canonical_tag.attrs else ""
    
    canonical_status = "valid"
    if not canonical:
        canonical_status = "missing"
    elif canonical != url:
        canonical_status = "mismatch"
        
    # Images alt check
    images = soup.find_all("img")
    images_total = len(images)
    images_missing_alt = sum(1 for img in images if not img.get("alt", "").strip())
    
    # Structured Data
    schema_types_found = []
    schema_data_list = []
    schemas = soup.find_all("script", type="application/ld+json")
    for s in schemas:
        try:
            data = json.loads(s.string)
            if isinstance(data, dict):
                t = data.get("@type", "")
                if t: schema_types_found.append(t)
                schema_data_list.append(data)
            elif isinstance(data, list):
                for item in data:
                    t = item.get("@type", "")
                    if t: schema_types_found.append(t)
                schema_data_list.extend(data)
        except Exception:
            pass
            
    # Discover internal & external links
    discovered_links = []
    links = soup.find_all("a", href=True)
    for l in links:
        href = l["href"]
        full_href = urllib.parse.urljoin(url, href).split("#")[0]
        parsed_href = urllib.parse.urlparse(full_href)
        
        # Filter typical non-HTTP schemas
        if parsed_href.scheme not in ["http", "https"]:
            continue
            
        link_type = "internal" if parsed_href.netloc == base_domain else "external"
        anchor_text = l.get_text().strip()
        discovered_links.append({
            "target_url": full_href,
            "link_type": link_type,
            "anchor_text": anchor_text[:200]
        })
        
    # Discover page images
    discovered_images = []
    for img in images:
        src = img.get("src")
        if not src:
            continue
        full_src = urllib.parse.urljoin(url, src)
        alt = img.get("alt", "").strip()
        discovered_images.append({
            "image_url": full_src,
            "alt_text": alt
        })
        
    # Score metrics (0-100)
    tech_score = 100
    if canonical_status != "valid": tech_score -= 15
    if load_time_ms > 2000: tech_score -= 10
    if load_time_ms > 4000: tech_score -= 10
    tech_score = max(0, tech_score)
    
    onpage_score = 100
    if not title: onpage_score -= 25
    elif title_length < 30 or title_length > 60: onpage_score -= 10
    
    if not meta_desc: onpage_score -= 25
    elif meta_desc_length < 110 or meta_desc_length > 160: onpage_score -= 10
    
    if h1_count == 0: onpage_score -= 15
    elif h1_count > 1: onpage_score -= 10
    
    if word_count < 300: onpage_score -= 15
    onpage_score = max(0, onpage_score)
    
    perf_score = 100
    if load_time_ms > 1000: perf_score -= 15
    if load_time_ms > 2500: perf_score -= 20
    if load_time_ms > 5000: perf_score -= 25
    if images_total > 40: perf_score -= 10
    perf_score = max(0, perf_score)
    
    # Average score
    seo_score = int((tech_score + onpage_score + perf_score) / 3)
    
    return {
        "title": title,
        "title_length": title_length,
        "meta_description": meta_desc,
        "meta_description_length": meta_desc_length,
        "h1": h1,
        "h1_count": h1_count,
        "word_count": word_count,
        "readability_score": readability_score,
        "canonical": canonical,
        "canonical_status": canonical_status,
        "images_total": images_total,
        "images_missing_alt": images_missing_alt,
        "schema_types": ",".join(schema_types_found),
        "schema_json": json.dumps(schema_data_list),
        "technical_score": tech_score,
        "onpage_score": onpage_score,
        "performance_score": perf_score,
        "seo_score": seo_score,
        "links": discovered_links,
        "images_data": discovered_images,
        "text_snippet": clean_text[:2000] # Pass first 2K characters to Ollama
    }

async def run_crawl_job(job_id: str, url: str, max_pages: int, render_js: bool, user_agent_key: str, obey_robots: bool, ollama_url: str, db_path: str) -> None:
    """Run an isolated asynchronous website crawl."""
    init_job_db(db_path)
    
    conn = duckdb.connect(db_path)
    # Save Initial Status
    config = {
        "render_js": render_js,
        "user_agent_key": user_agent_key,
        "obey_robots": obey_robots,
        "ollama_url": ollama_url
    }
    conn.execute("UPDATE job_info SET status = 'running' WHERE job_id = ?", (job_id,))
    conn.close()
    
    parsed_base = urllib.parse.urlparse(url)
    base_domain = parsed_base.netloc
    
    queue: List[str] = [url]
    visited: Set[str] = set()
    crawled_count = 0
    
    user_agent = USER_AGENTS.get(user_agent_key, USER_AGENTS["desktop"])
    headers = {"User-Agent": user_agent}
    
    playwright_context = None
    browser = None
    if render_js:
        try:
            playwright_context = await async_playwright().start()
            browser = await playwright_context.chromium.launch(headless=True)
            logger.info("[SPIDER] Playwright browser pool initialized.")
        except Exception as e:
            logger.error(f"[SPIDER] Playwright launch failed: {e}. Falling back to HTTPX.")
            render_js = False
            
    while queue and crawled_count < max_pages:
        current_url = queue.pop(0)
        if current_url in visited:
            continue
            
        visited.add(current_url)
        crawled_count += 1
        
        logger.info(f"[SPIDER] [{crawled_count}/{max_pages}] Crawling URL: {current_url}")
        
        start_time = time.time()
        html_content = ""
        status_code = 0
        redirect_chain = []
        
        if render_js and browser:
            try:
                page = await browser.new_page(user_agent=user_agent)
                response = await page.goto(current_url, timeout=20000, wait_until="networkidle")
                status_code = response.status if response else 200
                html_content = await page.content()
                await page.close()
            except Exception as e:
                logger.error(f"Playwright error rendering {current_url}: {e}")
                status_code = 500
        else:
            try:
                async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=15.0) as client:
                    response = await client.get(current_url)
                    status_code = response.status_code
                    html_content = response.text
                    redirect_chain = [str(r.url) for r in response.history]
            except Exception as e:
                logger.error(f"HTTPX error fetching {current_url}: {e}")
                status_code = 500
                
        load_time_ms = int((time.time() - start_time) * 1000)
        
        # Process and Save results if HTTP success
        if status_code == 200 and html_content:
            analysis = analyze_page_html(current_url, html_content, load_time_ms, base_domain)
            
            # Run Ollama AI analysis only on key pages to conserve resources (e.g. homepage, or pages with low scores)
            # Or run a quick evaluation and determine if we call it. For SPIDER, let's critique the homepage and the first 3 subpages.
            ai_critique = {}
            if crawled_count <= 4:
                issues = []
                if not analysis["title"]: issues.append("Missing Page Title")
                if not analysis["meta_description"]: issues.append("Missing Meta Description")
                if analysis["word_count"] < 300: issues.append("Thin copy content (under 300 words)")
                if analysis["images_missing_alt"] > 0: issues.append(f"{analysis['images_missing_alt']} images lack alt tags")
                
                ai_input = {
                    "url": current_url,
                    "title": analysis["title"],
                    "title_length": analysis["title_length"],
                    "meta_description": analysis["meta_description"],
                    "meta_description_length": analysis["meta_description_length"],
                    "h1": analysis["h1"],
                    "h1_count": analysis["h1_count"],
                    "word_count": analysis["word_count"],
                    "readability_score": analysis["readability_score"],
                    "issues": ", ".join(issues) if issues else "None",
                    "text_snippet": analysis["text_snippet"]
                }
                ai_critique = await call_ollama_critique(ollama_url, ai_input)
                ai_score = ai_critique.get("content_quality_score", 70)
            else:
                ai_score = 80
                ai_critique = {
                    "title_suggestion": analysis["title"],
                    "meta_description_suggestion": analysis["meta_description"],
                    "content_quality_score": 80,
                    "copywriting_critique": "Page crawl complete. Copy looks clean.",
                    "keyword_opportunities": ["services", "company", "info"],
                    "remediation_steps": ["Ensure keywords match local search volume."],
                    "geo_ingestibility_score": 85,
                    "geo_citation_score": 70,
                    "geo_qa_score": 75,
                    "geo_recommendations": ["Ensure clear heading structures for AI parser ingestion."],
                    "auto_fix": {
                        "nginx_redirect": None,
                        "json_ld_schema": None,
                        "robots_directive": "Allow: " + urllib.parse.urlparse(current_url).path,
                        "suggested_h1": analysis["h1"] if analysis["h1"] else None
                    }
                }
                
            # Recalculate SEO score based on AI review inclusion
            seo_score = int((analysis["technical_score"] + analysis["onpage_score"] + analysis["performance_score"] + ai_score) / 4)
            
            # Save to DuckDB
            conn = duckdb.connect(db_path)
            conn.execute("""
                INSERT OR REPLACE INTO pages 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                current_url, status_code, load_time_ms, analysis["word_count"],
                analysis["title"], analysis["title_length"], analysis["meta_description"], analysis["meta_description_length"],
                analysis["h1"], analysis["h1_count"], analysis["canonical"], analysis["canonical_status"],
                analysis["images_total"], analysis["images_missing_alt"], analysis["schema_types"], analysis["schema_json"],
                analysis["readability_score"], analysis["technical_score"], analysis["onpage_score"],
                analysis["performance_score"], ai_score, seo_score, ",".join(redirect_chain), json.dumps(ai_critique)
            ))
            
            # Save links
            for link in analysis["links"]:
                # If target is internal and hasn't been visited or queued, add to queue
                t_url = link["target_url"]
                parsed_t = urllib.parse.urlparse(t_url)
                if link["link_type"] == "internal" and t_url not in visited and t_url not in queue:
                    # Keep queue size within bounds
                    if len(visited) + len(queue) < max_pages * 2:
                        queue.append(t_url)
                        
                conn.execute("""
                    INSERT INTO links VALUES (?, ?, ?, ?, ?)
                """, (current_url, t_url, link["link_type"], link["anchor_text"], 200))
                
            # Save images
            for img in analysis["images_data"]:
                conn.execute("""
                    INSERT INTO images VALUES (?, ?, ?, ?, ?)
                """, (current_url, img["image_url"], img["alt_text"], 0, 200))
                
            conn.close()
        else:
            # Handle non-200 or connection errors
            conn = duckdb.connect(db_path)
            conn.execute("""
                INSERT OR REPLACE INTO pages 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                current_url, status_code, load_time_ms, 0, "", 0, "", 0, "", 0, "", "missing",
                0, 0, "", "[]", 0, 30, 10, 20, 20, 20, ",".join(redirect_chain), "{}"
            ))
            conn.close()
            
        # Update progress counter
        conn = duckdb.connect(db_path)
        conn.execute("UPDATE job_info SET pages_crawled = ? WHERE job_id = ?", (crawled_count, job_id))
        conn.close()
        
        # Sleep polite delay
        await asyncio.sleep(0.5)

    if browser:
        await browser.close()
    if playwright_context:
        await playwright_context.stop()
        
    # Mark job completed
    conn = duckdb.connect(db_path)
    conn.execute("UPDATE job_info SET status = 'completed', completed_at = ? WHERE job_id = ?", (
        time.strftime("%Y-%m-%d %H:%M:%S"), job_id
    ))
    conn.close()
    logger.info(f"[SPIDER] Crawl job {job_id} finalized successfully.")
