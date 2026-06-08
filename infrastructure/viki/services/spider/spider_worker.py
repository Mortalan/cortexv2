import os
import json
import asyncio
import logging
import httpx
import redis
import duckdb
from spider_crawler import run_crawl_job, get_db_conn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cortex-spider-worker")

REDIS_URL = os.getenv("REDIS_URL", "redis://cortex-spider-redis:6379/0")
DATA_DIR = os.getenv("DATA_DIR", "/mnt/data_lake/audit/spider")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://192.168.50.242:11434")
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "http://192.168.50.254:5678/webhook/spider-audit")

os.makedirs(DATA_DIR, exist_ok=True)

async def trigger_n8n_webhook(job_id: str, url: str, db_path: str):
    """Notify n8n of the completed audit with key metrics and AI suggestions."""
    logger.info(f"[SPIDER-WORKER] Querying summary for n8n notification: {job_id}")
    try:
        with get_db_conn(db_path, read_only=True) as conn:
            # Fetch averages
            summary = conn.execute("""
                SELECT 
                    COUNT(*) as pages_count,
                    AVG(seo_score) as avg_seo,
                    AVG(technical_score) as avg_tech,
                    AVG(onpage_score) as avg_onpage,
                    AVG(performance_score) as avg_perf,
                    AVG(ai_score) as avg_ai
                FROM pages
            """).fetchone()
            
            # Fetch worst pages
            worst_pages = conn.execute("""
                SELECT url, seo_score, title FROM pages 
                ORDER BY seo_score ASC LIMIT 3
            """).fetchall()
        
        if not summary:
            return
            
        payload = {
            "job_id": job_id,
            "target_url": url,
            "metrics": {
                "pages_crawled": summary[0],
                "average_seo_score": int(summary[1] or 0),
                "average_technical_score": int(summary[2] or 0),
                "average_onpage_score": int(summary[3] or 0),
                "average_performance_score": int(summary[4] or 0),
                "average_ai_score": int(summary[5] or 0)
            },
            "worst_pages": [
                {"url": p[0], "score": p[1], "title": p[2]} for p in worst_pages
            ],
            "report_download_url": f"https://cortex.rmmservice.co.za/api/spider/job/{job_id}/report/pdf"
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(N8N_WEBHOOK_URL, json=payload)
            logger.info(f"[SPIDER-WORKER] Triggered n8n webhook. Status: {response.status_code}")
    except Exception as e:
        logger.error(f"[SPIDER-WORKER] Webhook trigger failed: {e}")

async def main():
    logger.info("==================================================")
    logger.info("  SPIDER WORKER DAEMON RUNNING")
    logger.info(f"  Redis URL: {REDIS_URL}")
    logger.info(f"  Data Lake: {DATA_DIR}")
    logger.info("==================================================")
    
    # Establish connection to private Redis broker
    r = redis.Redis.from_url(REDIS_URL)
    
    while True:
        try:
            # Block-pop a job item from the 'spider_jobs' queue list
            queue_item = r.blpop("spider_jobs", timeout=5)
            if not queue_item:
                await asyncio.sleep(1)
                continue
                
            # Parse payload
            _, payload_data = queue_item
            job = json.loads(payload_data.decode("utf-8"))
            
            job_id = job["job_id"]
            url = job["url"]
            max_pages = job.get("max_pages", 50)
            render_js = job.get("render_js", False)
            user_agent_key = job.get("user_agent", "desktop")
            obey_robots = job.get("obey_robots", True)
            
            db_path = os.path.join(DATA_DIR, f"{job_id}.db")
            
            logger.info(f"[SPIDER-WORKER] Starting crawl for job_id={job_id} url={url}")
            
            await run_crawl_job(
                job_id=job_id,
                url=url,
                max_pages=max_pages,
                render_js=render_js,
                user_agent_key=user_agent_key,
                obey_robots=obey_robots,
                ollama_url=OLLAMA_URL,
                db_path=db_path
            )
            
            # Post-crawl webhook dispatch to n8n
            await trigger_n8n_webhook(job_id, url, db_path)
            
        except redis.ConnectionError:
            logger.error("[SPIDER-WORKER] Redis connection lost. Retrying in 5s...")
            await asyncio.sleep(5)
        except Exception as e:
            logger.error(f"[SPIDER-WORKER] Core loop exception: {e}")
            await asyncio.sleep(2)

if __name__ == "__main__":
    asyncio.run(main())
