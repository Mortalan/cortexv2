# CORTEX: CHANGELOG
## [JUNE 2026]

> [!NOTE]
> Historical logs prior to June 8, 2026 have been archived to optimize context size. 
> Full history backup: [/home/louis/cortex/archive/backup_20260608/docs/CHANGELOG.md](file:///home/louis/cortex/archive/backup_20260608/docs/CHANGELOG.md)

### 08 JUNE 2026 - RESOLVED DUCKDB NFS LOCK CONTENTIONS, BS4 CRAWL CRASH, AND REDIS SOCKET TIMEOUTS IN SPIDER (MOLE RUN MODE)
- **NFS Lock Conflicts Resolved via Staging:** Designed and implemented a local staging storage system (`LOCAL_DB_DIR` at `/app/db_local` mapping to the fast local SSD VM disk) for active writes. Crawls are executed on local storage to bypass network file system locking limitations (`local_lock=none` on `/mnt/data_lake`). Upon completion, the worker copies the finalized DuckDB database file to the persistent data lake (`/mnt/data_lake/audit/spider/`) and cleans up the local copy.
- **Dynamic Database Path Resolver:** Refactored [spider_app.py](file:///home/louis/cortex/infrastructure/viki/services/spider/spider_app.py) endpoints (`get_job_status`, `get_job_pages`, `get_job_links`, `export_job_csv`, and `get_pdf_report`) to resolve DB paths dynamically via a new `get_job_db_path()` helper that checks local storage first, then falls back to data lake storage.
- **Master Database Local Migration:** Integrated automated migration of `spider_master.db` from `/mnt/data_lake` to `/app/db_local` upon container startup inside `init_master_db()`, preventing lock conflicts during concurrent dashboard queries of the job history.
- **Redis Socket Timeout Fix:** Configured the Redis client in [spider_worker.py](file:///home/louis/cortex/infrastructure/viki/services/spider/spider_worker.py) with robust socket connection settings (`socket_timeout=15`, `socket_connect_timeout=5`, `socket_keepalive=True`, `retry_on_timeout=True`) and caught `redis.exceptions.TimeoutError` specifically in the main execution loop to handle empty queue block-pops (`blpop`) cleanly without log spam.
- **DOM Depth Recursion Fix:** Resolved `'NoneType' object is not callable` BeautifulSoup crash during recursive DOM traversal in [spider_crawler.py](file:///home/louis/cortex/infrastructure/viki/services/spider/spider_crawler.py) by replacing `find_children(recursive=False)` with `find_all(recursive=False)`.
