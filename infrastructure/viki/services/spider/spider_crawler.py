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
    
    # 2. Pages Table (Expanded schema)
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
            ai_analysis_json VARCHAR,
            ttfb_ms INTEGER,
            dom_depth INTEGER,
            dom_element_count INTEGER,
            soft_404_flag BOOLEAN,
            blindspot_has_hidden_text BOOLEAN,
            blindspot_hidden_text VARCHAR,
            elementor_optimization_active BOOLEAN,
            header_nesting_valid BOOLEAN,
            date_freshness_valid BOOLEAN,
            word_rule_met BOOLEAN,
            schema_conflicts VARCHAR,
            executive_priority_ledger_json VARCHAR
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
    "json_ld_schema": "string or null (fully formed JSON-LD script tag with structured data context for this page, utilizing a unified @graph pattern linking Organization/LocalBusiness with Wikidata/Wikipedia sameAs URLs)",
    "robots_directive": "string or null (suggested robots.txt rule for this path targeting AI agents like Google-Extended and OpenAI-SearchBot)",
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

def analyze_page_html(
    url: str,
    html: str,
    load_time_ms: int,
    base_domain: str,
    raw_html: Optional[str] = None,
    ajax_requests: int = 0,
    wp_rest_requests: int = 0,
    ttfb_ms: int = 0
) -> Dict[str, Any]:
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
        
    # Images alt check & CLS Check (dimensions)
    images = soup.find_all("img")
    images_total = len(images)
    images_missing_alt = sum(1 for img in images if not img.get("alt", "").strip())
    
    missing_dimensions = 0
    for img in images:
        has_width = img.has_attr("width") or (img.has_attr("style") and "width" in img["style"])
        has_height = img.has_attr("height") or (img.has_attr("style") and "height" in img["style"])
        if not has_width or not has_height:
            missing_dimensions += 1
            
    # Structured Data & Theme Conflicts Scanner
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
            
    schema_counts = {}
    schema_conflicts = []
    for t in schema_types_found:
        schema_counts[t] = schema_counts.get(t, 0) + 1
    for t, cnt in schema_counts.items():
        if cnt > 1 and t in ["LocalBusiness", "Organization", "WebSite"]:
            schema_conflicts.append(f"Duplicate {t} schemas found ({cnt} instances)")
            
    # Soft 404 Check
    soft_404_flag = False
    lower_text = clean_text.lower()
    patterns = ["page not found", "404 not found", "404 error", "error 404", "requested could not be found", "page doesn't exist"]
    if any(p in lower_text for p in patterns):
        title_lower = title.lower()
        h1_lowers = [h.get_text().lower() for h in h1s]
        if any(p in title_lower for p in patterns) or any(any(p in h for p in patterns) for h in h1_lowers):
            soft_404_flag = True
            
    # AI Blindspot Check
    blindspot_has_hidden_text = False
    blindspot_hidden_text = ""
    if raw_html:
        soup_raw = BeautifulSoup(raw_html, "html.parser")
        # Strip script/style from raw soup
        for s in soup_raw(["script", "style", "noscript", "iframe"]):
            s.decompose()
        raw_text_content = " ".join(soup_raw.get_text().split())
        
        # Find rendered text chunks missing from raw text
        rendered_chunks = [c.strip() for c in re.split(r'[.!?]+', clean_text) if len(c.strip()) > 15]
        hidden_chunks = []
        clean_raw_text = " ".join(raw_text_content.split()).lower()
        for chunk in rendered_chunks:
            clean_chunk = " ".join(chunk.split()).lower()
            if clean_chunk not in clean_raw_text:
                hidden_chunks.append(chunk)
        if hidden_chunks:
            blindspot_has_hidden_text = True
            blindspot_hidden_text = "; ".join(hidden_chunks[:10])
            
    # DOM Depth & Element Count
    max_depth = 0
    total_elements = 0
    def get_depth(element, current_depth):
        nonlocal max_depth, total_elements
        total_elements += 1
        max_depth = max(max_depth, current_depth)
        for child in element.find_children(recursive=False):
            get_depth(child, current_depth + 1)
    body = soup.find("body")
    if body:
        get_depth(body, 1)
    else:
        html_tag = soup.find("html")
        if html_tag:
            get_depth(html_tag, 1)
            
    # Elementor optimization check
    elementor_optimization_active = False
    elementor_markers = ["elementor-frontend-js", "elementor-post-", "elementorFrontendConfig"]
    if any(m in html for m in elementor_markers):
        if "elementor.min.css" in html or "elementor-inline-css" in html:
            elementor_optimization_active = True
            
    # Strict Header Hierarchy
    headers = soup.find_all(re.compile(r'^h[1-6]$'))
    header_sequence = [int(h.name[1]) for h in headers]
    header_nesting_valid = True
    for i in range(len(header_sequence) - 1):
        curr_level = header_sequence[i]
        next_level = header_sequence[i+1]
        if next_level > curr_level + 1:
            header_nesting_valid = False
            break
            
    # Temporal Freshness Verification
    schema_date_modified = None
    for item in schema_data_list:
        def find_date_modified(obj):
            if isinstance(obj, dict):
                if "dateModified" in obj: return obj["dateModified"]
                for k, v in obj.items():
                    res = find_date_modified(v)
                    if res: return res
            elif isinstance(obj, list):
                for sub in obj:
                    res = find_date_modified(sub)
                    if res: return res
            return None
        val = find_date_modified(item)
        if val:
            schema_date_modified = val
            break
            
    visual_date_str = None
    time_tag = soup.find("time")
    if time_tag and time_tag.has_attr("datetime"):
        visual_date_str = time_tag["datetime"]
    else:
        date_el = soup.find(class_=re.compile(r'(entry-date|post-date|published|updated|date)', re.I))
        if date_el:
            visual_date_str = date_el.get_text().strip()
            
    date_freshness_valid = True
    if schema_date_modified and visual_date_str:
        schema_year_match = re.search(r'\b(20\d{2})\b', schema_date_modified)
        visual_year_match = re.search(r'\b(20\d{2})\b', visual_date_str)
        if schema_year_match and visual_year_match:
            if schema_year_match.group(1) != visual_year_match.group(1):
                date_freshness_valid = False
                
    # 100-Word Rule
    word_rule_met = True
    if title:
        title_words = [w.lower() for w in re.findall(r'\w+', title) if len(w) > 3]
        body_words = [w.lower() for w in re.findall(r'\w+', clean_text)[:100]]
        if title_words and body_words:
            matched_keywords = [w for w in title_words if w in body_words]
            if not matched_keywords:
                word_rule_met = False
                
    # Discover internal & external links
    discovered_links = []
    links = soup.find_all("a", href=True)
    for l in links:
        href = l["href"]
        full_href = urllib.parse.urljoin(url, href).split("#")[0]
        parsed_href = urllib.parse.urlparse(full_href)
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
        
    # Executive Priority Ledger
    ledger = []
    if canonical_status != "valid":
        ledger.append({
            "Audit Pillar": "Indexation",
            "Vulnerability Detected": f"Canonical mismatch or missing (Status: {canonical_status})",
            "Technical Impact": "Search engines may index duplicate URLs or wrong page versions.",
            "Platform Resolution Strategy": "Add a self-referencing canonical tag to the page HTML."
        })
    if soft_404_flag:
        ledger.append({
            "Audit Pillar": "Indexation",
            "Vulnerability Detected": "Soft-404 error state detected (200 OK returned for error text)",
            "Technical Impact": "Search engines index blank or error pages, wasting crawl budget.",
            "Platform Resolution Strategy": "Configure the web server to return a proper 404 Not Found HTTP response status code."
        })
    if blindspot_has_hidden_text:
        ledger.append({
            "Audit Pillar": "Indexation",
            "Vulnerability Detected": "AI Blindspot Check: JS-dependent text invisible to non-rendering bots",
            "Technical Impact": "AI engines (GPTBot, ClaudeBot, etc.) will fail to ingest and index this content.",
            "Platform Resolution Strategy": "Move critical content blocks out of JS-dependent templates into static server-side HTML."
        })
    if ttfb_ms > 800:
        ledger.append({
            "Audit Pillar": "Performance",
            "Vulnerability Detected": f"High Time to First Byte (TTFB: {ttfb_ms}ms)",
            "Technical Impact": "Slow initial server response delays page rendering and hurts user experience.",
            "Platform Resolution Strategy": "Implement server-side caching (Redis/Memcached) and optimize database queries."
        })
    if ajax_requests > 3 or wp_rest_requests > 3:
        ledger.append({
            "Audit Pillar": "Performance",
            "Vulnerability Detected": f"Excessive WP REST/Ajax calls during loading ({ajax_requests} admin-ajax, {wp_rest_requests} REST)",
            "Technical Impact": "Exhausts server memory and increases page weight, leading to high load latency.",
            "Platform Resolution Strategy": "Consolidate Elementor widgets and combine server requests to minimize dynamic callbacks."
        })
    if max_depth > 32 or total_elements > 800:
        ledger.append({
            "Audit Pillar": "Performance",
            "Vulnerability Detected": f"Excessive DOM complexity (Depth: {max_depth}, Elements: {total_elements})",
            "Technical Impact": "Increases browser layout shift calculation time and causes Interaction to Next Paint (INP) delays.",
            "Platform Resolution Strategy": "Simplify Elementor section wrappers and avoid deeply nested container elements."
        })
    if missing_dimensions > 0:
        ledger.append({
            "Audit Pillar": "Performance",
            "Vulnerability Detected": f"Images missing explicit width/height attributes ({missing_dimensions} total)",
            "Technical Impact": "Causes layout shifts (Cumulative Layout Shift) when images load, degrading core web vitals.",
            "Platform Resolution Strategy": "Specify width and height attributes in HTML img tags or enforce them via Elementor styles."
        })
    if schema_conflicts:
        ledger.append({
            "Audit Pillar": "Schema",
            "Vulnerability Detected": f"Conflicting duplicate schema tags ({', '.join(schema_conflicts)})",
            "Technical Impact": "Confuses search engine crawlers and causes indexing errors in Google Search Console.",
            "Platform Resolution Strategy": "Consolidate schemas into a single global SEO plugin (RankMath/Yoast) and remove redundant template blocks."
        })
    if not header_nesting_valid:
        ledger.append({
            "Audit Pillar": "Schema",
            "Vulnerability Detected": "Broken header nesting sequence logic",
            "Technical Impact": "Degrades document structural semantics, confusing search bot topic extraction.",
            "Platform Resolution Strategy": "Reorder headings to ensure they follow a strict hierarchy (H1 -> H2 -> H3 etc.)."
        })
    if not date_freshness_valid:
        ledger.append({
            "Audit Pillar": "Schema",
            "Vulnerability Detected": "Temporal date mismatch between visual stamps and schema dateModified",
            "Technical Impact": "Decreases reliability and authority trust scores in AI retrieval systems.",
            "Platform Resolution Strategy": "Sync visual post dates to update metadata properties in schema output blocks."
        })
    if not word_rule_met:
        ledger.append({
            "Audit Pillar": "Schema",
            "Vulnerability Detected": "The 100-Word Rule: Target intent keywords missing from opening copy",
            "Technical Impact": "Reduces relevance grading for conversational search/RAG indexing.",
            "Platform Resolution Strategy": "Ensure primary search query terms are written directly within the opening 100 words of page body copy."
        })
        
    # Score metrics (0-100)
    tech_score = 100
    if canonical_status != "valid": tech_score -= 15
    if load_time_ms > 2000: tech_score -= 10
    if load_time_ms > 4000: tech_score -= 10
    if soft_404_flag: tech_score -= 20
    if blindspot_has_hidden_text: tech_score -= 15
    tech_score = max(0, tech_score)
    
    onpage_score = 100
    if not title: onpage_score -= 25
    elif title_length < 30 or title_length > 60: onpage_score -= 10
    if not meta_desc: onpage_score -= 25
    elif meta_desc_length < 110 or meta_desc_length > 160: onpage_score -= 10
    if h1_count == 0: onpage_score -= 15
    elif h1_count > 1: onpage_score -= 10
    if word_count < 300: onpage_score -= 15
    if not header_nesting_valid: onpage_score -= 10
    if not word_rule_met: onpage_score -= 10
    onpage_score = max(0, onpage_score)
    
    # Performance score calculations
    perf_score = 100
    if load_time_ms > 1000: perf_score -= 15
    if load_time_ms > 2500: perf_score -= 20
    if load_time_ms > 5000: perf_score -= 25
    if images_total > 40: perf_score -= 10
    if missing_dimensions > 0: perf_score -= 10
    if max_depth > 32 or total_elements > 800: perf_score -= 15
    if ajax_requests > 3 or wp_rest_requests > 3: perf_score -= 10
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
        "text_snippet": clean_text[:2000],
        "ttfb_ms": ttfb_ms,
        "dom_depth": max_depth,
        "dom_element_count": total_elements,
        "soft_404_flag": soft_404_flag,
        "blindspot_has_hidden_text": blindspot_has_hidden_text,
        "blindspot_hidden_text": blindspot_hidden_text,
        "elementor_optimization_active": elementor_optimization_active,
        "header_nesting_valid": header_nesting_valid,
        "date_freshness_valid": date_freshness_valid,
        "word_rule_met": word_rule_met,
        "schema_conflicts": ",".join(schema_conflicts),
        "executive_priority_ledger_json": json.dumps(ledger)
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
    
    # Robots.txt Audit
    robots_audit_result = {
        "has_robots": False,
        "has_google_extended": False,
        "has_openai_searchbot": False,
        "has_applebot_extended": False,
        "has_gptbot": False,
        "issues": []
    }
    robots_url = f"{parsed_base.scheme}://{base_domain}/robots.txt"
    user_agent = USER_AGENTS.get(user_agent_key, USER_AGENTS["desktop"])
    headers = {"User-Agent": user_agent}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            robots_resp = await client.get(robots_url)
            if robots_resp.status_code == 200:
                robots_audit_result["has_robots"] = True
                content = robots_resp.text.lower()
                
                if "google-extended" in content:
                    robots_audit_result["has_google_extended"] = True
                if "openai-searchbot" in content:
                    robots_audit_result["has_openai_searchbot"] = True
                if "applebot-extended" in content:
                    robots_audit_result["has_applebot_extended"] = True
                if "gptbot" in content:
                    robots_audit_result["has_gptbot"] = True
                    
                missing = []
                if not robots_audit_result["has_google_extended"]: missing.append("Google-Extended")
                if not robots_audit_result["has_openai_searchbot"]: missing.append("OpenAI-SearchBot")
                if not robots_audit_result["has_applebot_extended"]: missing.append("Applebot-Extended")
                if not robots_audit_result["has_gptbot"]: missing.append("GPTBot")
                
                if missing:
                    robots_audit_result["issues"].append(f"Missing explicit AI agent access control for: {', '.join(missing)}")
            else:
                robots_audit_result["issues"].append("robots.txt not found or returned non-200 status code")
    except Exception as e:
        robots_audit_result["issues"].append(f"Failed to fetch robots.txt: {e}")
        
    queue: List[str] = [url]
    visited: Set[str] = set()
    crawled_count = 0
    
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
        raw_html_content = None
        status_code = 0
        redirect_chain = []
        
        # Double-pass: pre-fetch raw HTML via HTTPX to compare for the AI Blindspot Check
        # Run on first 10 pages for optimization
        if render_js and crawled_count <= 10:
            try:
                async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=10.0) as client:
                    raw_resp = await client.get(current_url)
                    if raw_resp.status_code == 200:
                        raw_html_content = raw_resp.text
            except Exception as e:
                logger.error(f"HTTPX pre-fetch error for blindspot check on {current_url}: {e}")
                
        ajax_requests = 0
        wp_rest_requests = 0
        ttfb_ms = 0
        
        if render_js and browser:
            try:
                page = await browser.new_page(user_agent=user_agent)
                
                # Listen to requests to count ajax/REST API calls
                def handle_request(req):
                    nonlocal ajax_requests, wp_rest_requests
                    req_url = req.url.lower()
                    if "admin-ajax.php" in req_url:
                        ajax_requests += 1
                    elif "wp-json" in req_url:
                        wp_rest_requests += 1
                
                page.on("request", handle_request)
                
                response = await page.goto(current_url, timeout=20000, wait_until="networkidle")
                status_code = response.status if response else 200
                html_content = await page.content()
                
                # Evaluate TTFB using Navigation Timing API
                timing = await page.evaluate("""() => {
                    const nav = performance.getEntriesByType("navigation")[0];
                    if (nav) {
                        return {
                            ttfb: Math.round(nav.responseStart - nav.requestStart)
                        };
                    }
                    return null;
                }""")
                if timing and "ttfb" in timing:
                    ttfb_ms = timing["ttfb"]
                else:
                    ttfb_ms = int((time.time() - start_time) * 1000)
                    
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
                    ttfb_ms = int((time.time() - start_time) * 1000)
            except Exception as e:
                logger.error(f"HTTPX error fetching {current_url}: {e}")
                status_code = 500
                
        load_time_ms = int((time.time() - start_time) * 1000)
        
        # Process and Save results if HTTP success
        if status_code == 200 and html_content:
            analysis = analyze_page_html(
                url=current_url,
                html=html_content,
                load_time_ms=load_time_ms,
                base_domain=base_domain,
                raw_html=raw_html_content,
                ajax_requests=ajax_requests,
                wp_rest_requests=wp_rest_requests,
                ttfb_ms=ttfb_ms
            )
            
            # Inject robots issues into the first page priority ledger
            if crawled_count == 1 and robots_audit_result["issues"]:
                ledger = json.loads(analysis["executive_priority_ledger_json"])
                for issue in robots_audit_result["issues"]:
                    ledger.append({
                        "Audit Pillar": "Indexation",
                        "Vulnerability Detected": issue,
                        "Technical Impact": "AI agents crawl and scrap content without restriction or ignore indexing policies.",
                        "Platform Resolution Strategy": "Add explicit User-agent rules inside robots.txt to govern GPTBot and other AI crawlers."
                    })
                analysis["executive_priority_ledger_json"] = json.dumps(ledger)
                
            # Run Ollama AI analysis only on key pages to conserve resources
            ai_critique = {}
            if crawled_count <= 4:
                issues = []
                if not analysis["title"]: issues.append("Missing Page Title")
                if not analysis["meta_description"]: issues.append("Missing Meta Description")
                if analysis["word_count"] < 300: issues.append("Thin copy content (under 300 words)")
                if analysis["images_missing_alt"] > 0: issues.append(f"{analysis['images_missing_alt']} images lack alt tags")
                if analysis["soft_404_flag"]: issues.append("Soft-404 error template returned")
                if analysis["blindspot_has_hidden_text"]: issues.append("JS-rendered content hidden from raw HTML")
                
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
            analysis["seo_score"] = seo_score
            analysis["ai_score"] = ai_score
            
            # Save to DuckDB
            conn = duckdb.connect(db_path)
            conn.execute("""
                INSERT OR REPLACE INTO pages 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                current_url, status_code, load_time_ms, analysis["word_count"],
                analysis["title"], analysis["title_length"], analysis["meta_description"], analysis["meta_description_length"],
                analysis["h1"], analysis["h1_count"], analysis["canonical"], analysis["canonical_status"],
                analysis["images_total"], analysis["images_missing_alt"], analysis["schema_types"], analysis["schema_json"],
                analysis["readability_score"], analysis["technical_score"], analysis["onpage_score"],
                analysis["performance_score"], analysis["ai_score"], analysis["seo_score"], ",".join(redirect_chain), json.dumps(ai_critique),
                analysis["ttfb_ms"], analysis["dom_depth"], analysis["dom_element_count"], analysis["soft_404_flag"],
                analysis["blindspot_has_hidden_text"], analysis["blindspot_hidden_text"], analysis["elementor_optimization_active"],
                analysis["header_nesting_valid"], analysis["date_freshness_valid"], analysis["word_rule_met"],
                analysis["schema_conflicts"], analysis["executive_priority_ledger_json"]
            ))
            
            # Save links
            for link in analysis["links"]:
                t_url = link["target_url"]
                if link["link_type"] == "internal" and t_url not in visited and t_url not in queue:
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
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                current_url, status_code, load_time_ms, 0, "", 0, "", 0, "", 0, "", "missing",
                0, 0, "", "[]", 0, 30, 10, 20, 20, 20, ",".join(redirect_chain), "{}",
                load_time_ms, 0, 0, False, False, "", False, True, True, True, "", "[]"
            ))
            conn.close()
            
        # Update progress counter
        conn = duckdb.connect(db_path)
        conn.execute("UPDATE job_info SET pages_crawled = ? WHERE job_id = ?", (crawled_count, job_id))
        conn.close()
        
        await asyncio.sleep(0.5)
        
    # After crawl, check for orphan pages
    conn = duckdb.connect(db_path)
    all_pages = [r[0] for r in conn.execute("SELECT url FROM pages").fetchall()]
    for p_url in all_pages:
        if p_url != url: # ignore homepage
            inbound_count = conn.execute("SELECT COUNT(*) FROM links WHERE target_url = ? AND source_url != ?", (p_url, p_url)).fetchone()[0]
            if inbound_count == 0:
                page_data = conn.execute("SELECT executive_priority_ledger_json, technical_score, seo_score FROM pages WHERE url = ?", (p_url,)).fetchone()
                if page_data:
                    ledger = json.loads(page_data[0])
                    ledger.append({
                        "Audit Pillar": "Indexation",
                        "Vulnerability Detected": "Orphan page structure detected (no internal inbound links)",
                        "Technical Impact": "Search engine crawlers and AI agents will fail to discover and index this page naturally.",
                        "Platform Resolution Strategy": "Add internal links pointing to this URL from high-authority parent/landing pages."
                    })
                    new_tech_score = max(0, page_data[1] - 15)
                    # rough re-average
                    new_seo_score = int((new_tech_score + (page_data[2]*4 - page_data[1]*4)/4)/2)
                    conn.execute("UPDATE pages SET executive_priority_ledger_json = ?, technical_score = ?, seo_score = ? WHERE url = ?", (json.dumps(ledger), new_tech_score, new_seo_score, p_url))
    conn.close()
    
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
