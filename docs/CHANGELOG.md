# CORTEX: CHANGELOG
## [JUNE 2026]

> [!NOTE]
> Historical logs prior to June 8, 2026 have been archived to optimize context size. 
> Full history backup: [/home/louis/cortex/archive/backup_20260608/docs/CHANGELOG.md](file:///home/louis/cortex/archive/backup_20260608/docs/CHANGELOG.md)


### 08-09 JUNE 2026 - RESOLVED NETLOCK RMM ROUTING, AGENT SYNC INTERVALS, LAKE-102 RECOVERY, AND MONACO AMD LOADER CONFLICTS (MOLE RUN MODE)
- **NetLock Ingress Routing Deployed:** Added `nl-backend.rmmservice.co.za` (port 7080) and `nl-relay.rmmservice.co.za` (port 7081) ingress routing rules to the Traefik dynamic configurations on both gateway nodes (`192.168.50.251` and `192.168.50.252`), enabling RMM daemon check-ins and remote controls.
- **RMM Agent Sync Interval Tuning:** Modified the NetLock policy registration inside the `dogha6` MySQL database on VM 100, changing the client check-in interval from 30 minutes to 1 minute to enable real-time dashboard telemetry.
- **Forensic NFS Lake-102 Guest Recovery:** Hard-reset the forensics VM `LAKE-102` (`192.168.50.243`) and rebooted LXC containers `201-204` to resolve a stale ZFS/BTRFS NFS lockup that was causing `504 Gateway Timeout` gateway-wide.
- **Monaco AMD Loader Collision Fix:** Resolved browser console script crashes (`TypeError: define is not a function` in Monaco's async components) by (1) modifying the third-party libraries (`xterm.min.js`, `leaflet.js`, `leaflet.markercluster.js`, `quill.js`) to target `define.xxx` instead of `define.amd` to prevent AMD registration, and (2) prepending a global `Object.defineProperty` define-interceptor to `custom.js` that intercepts and ignores attempts to set `window.define = undefined` globally.
- **Missing Asset Recovery:** Deployed a persistent empty `fullscreen.js` script with Brotli/Gzip variants to resolve a console 404 error caused by missing upstream assets.
- **SSO / Tenant Permissions Alignment:** Granted administrative and technician accounts (`admin` and `Vitto`) multi-tenant access rights to `Default`, `Private`, and `FITS` tenants inside the database accounts table to prevent dashboard view desynchronization after session invalidations.

### 08 JUNE 2026 - RESOLVED DUCKDB NFS LOCK CONTENTIONS, BS4 CRAWL CRASH, AND REDIS SOCKET TIMEOUTS IN SPIDER (MOLE RUN MODE)
- **NFS Lock Conflicts Resolved via Staging:** Designed and implemented a local staging storage system (`LOCAL_DB_DIR` at `/app/db_local` mapping to the fast local SSD VM disk) for active writes. Crawls are executed on local storage to bypass network file system locking limitations (`local_lock=none` on `/mnt/data_lake`). Upon completion, the worker copies the finalized DuckDB database file to the persistent data lake (`/mnt/data_lake/audit/spider/`) and cleans up the local copy.
- **Dynamic Database Path Resolver:** Refactored [spider_app.py](file:///home/louis/cortex/infrastructure/viki/services/spider/spider_app.py) endpoints (`get_job_status`, `get_job_pages`, `get_job_links`, `export_job_csv`, and `get_pdf_report`) to resolve DB paths dynamically via a new `get_job_db_path()` helper that checks local storage first, then falls back to data lake storage.
- **Master Database Local Migration:** Integrated automated migration of `spider_master.db` from `/mnt/data_lake` to `/app/db_local` upon container startup inside `init_master_db()`, preventing lock conflicts during concurrent dashboard queries of the job history.
- **Redis Socket Timeout Fix:** Configured the Redis client in [spider_worker.py](file:///home/louis/cortex/infrastructure/viki/services/spider/spider_worker.py) with robust socket connection settings (`socket_timeout=15`, `socket_connect_timeout=5`, `socket_keepalive=True`, `retry_on_timeout=True`) and caught `redis.exceptions.TimeoutError` specifically in the main execution loop to handle empty queue block-pops (`blpop`) cleanly without log spam.
- **DOM Depth Recursion Fix:** Resolved `'NoneType' object is not callable` BeautifulSoup crash during recursive DOM traversal in [spider_crawler.py](file:///home/louis/cortex/infrastructure/viki/services/spider/spider_crawler.py) by replacing `find_children(recursive=False)` with `find_all(recursive=False)`.
