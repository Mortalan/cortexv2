# CORTEX: LAB EXECUTION LOG
## [VERSION 2.1] - RECENT MILESTONES & ACTIVE STATUS

> [!NOTE]
> Detailed notes for completed historical phases (Phases 15 through 18) have been archived to optimize context size.
> Full history backup: [/home/louis/cortex/archive/backup_20260603/docs/LAB_LOG.md](file:///home/louis/cortex/archive/backup_20260603/docs/LAB_LOG.md)

### CURRENT PROGRESS OVERVIEW
- [x] Phases 15 - 18: Core AI/Viki Voice Interface, Speech-to-Text, 3D Canvas, Reports Compile, Forensic Data Lake, GHL integration (Archive Ref: [backup_20260603/docs/LAB_LOG.md](file:///home/louis/cortex/archive/backup_20260603/docs/LAB_LOG.md))
- [x] **Phase 19: LXC Container Parallel Migration - COMPLETED**
- [x] **SSO Home Redirection, Dashboard Telemetry Cache-Busting & GLPI SSL Pass-Through Hardening (Mole Run) - COMPLETED**
- [x] **Phase 23: In-Depth SEO Diagnostic Scanner (cortex-seo-scanner) - COMPLETED**
- [x] **Phase 24: Comprehensive Website Health & Security Auditor (cortex-web-auditor) - COMPLETED**
- [x] **Phase 25: Deployed Standalone SPIDER SEO & GEO Crawler Stack - COMPLETED**
- [ ] **Phase 20: Microsoft 365 Graph Calendar Integration - PLANNING**


---

### RECENT PHASE DETAILS

#### **Phase 19: Decentralized Service Deployment & Route Ingestion (Completed June 3, 2026)**
1. **LXC Node Provisioning:** Deployed `deploy_lxcs.sh` to provision 4 lightweight LXC nodes on hypervisor `192.168.50.240` (Intel i7 cluster):
   - `LXC 201` (`cortex-ingress`): Traefik / Authelia / LLDAP (192.168.50.251)
   - `LXC 202` (`cortex-command`): React Dashboard, Reflex Daemon, Hermes, Vector (192.168.50.252)
   - `LXC 203` (`cortex-glpi`): MariaDB / GLPI Ticketing (192.168.50.253)
   - `LXC 204` (`cortex-automation`): Redis / n8n Automation (192.168.50.254)
2. **Shared NFS Mounts:** Configured read-only/read-write dynamic BTRFS Forensic Data Lake mounts to `/mnt/data_lake` across all LXC instances.
3. **SSO & Ingress Hardening:** 
   - Realigned Authelia's `default_redirection_url` to target primary domain `https://rmmservice.co.za`.
   - Updated frontend Ollama targets in [App.tsx](file:///home/louis/cortex/infrastructure/viki/services/dashboard-react/src/App.tsx) to resolve to `/api/viki/`.
   - Prevented stale dashboard cache status states by adding query cache-busters.
4. **GLPI SSL Resolution:** Deployed custom Apache `reverse-proxy.conf` inside the GLPI container, forcing secure cookie generation (`X-Forwarded-Proto` -> `HTTPS=on`) to prevent insecure URL warnings.
5. **Gateway Pivot:** Pivoted HAProxy gateway (`192.168.50.239`) backend target to route through LXC 201, verifying all 16 subdomains.

---

#### **Phases 23 & 24: SEO & Security Auditing Microservices Integration (Completed June 5, 2026)**
1. **Microservices Deployment:**
   - Deployed `cortex-seo-scanner` on `192.168.50.252` port `8090`.
   - Deployed `cortex-web-auditor` on `192.168.50.252` port `8091`.
2. **SSO Ingress Routing:**
   - Modified Traefik dynamic provider config `cortex-services.yml` to route `/api/seo` and `/api/audit` to their respective containers.
   - Configured high routing priority (`120`) and path prefix stripping middleware to prevent collision with catch-all `/api` rules.
3. **UI Layout Decoupling & Scrollability:**
   - Decoupled inline interactive consoles from the homepage into dedicated routing sub-pages (`/?mode=seo`, `/?mode=audit`, `/?mode=qc`) to keep the dashboard clean.
   - Resolved mobile/tablet layout freezing by enabling responsive HTML/body container scroll rules.
4. **Report Export Hardening:**
   - Fixed DuckDB connection closure errors in the SEO scanner remediate endpoint.
   - Added actionable remediation tips directly as a new column in the SEO CSV exporter.
   - Built client-side Markdown and JSON report generators for the Website Auditor to save logs locally.

---

#### **Phase 25: Deployed Standalone SPIDER SEO & GEO Crawler Stack (Completed June 5, 2026)**
1. **Isolated Service Stack:** Deployed `cortex-spider` Docker service stack on `192.168.50.252` port `8092`. Uses FastAPI webserver (`spider-app`), a background worker (`spider-worker`), and a private broker (`spider-redis`).
2. **DuckDB Database-per-Job:** Crawl datasets are written to self-contained DuckDB databases in `/mnt/data_lake/audit/spider/job_*.db` to prevent write locking and enable easy backup/removal.
3. **GEO (Generative Engine Optimization) Audits:** Configured crawler to invoke Ollama on VM 101 to evaluate content against AI Ingestibility, Citation Likelihood, and Conversational Q&A indexes, outputting optimization suggestions for AI search visibility (Perplexity, ChatGPT Search, Gemini SGE).
4. **Developer Auto-Fix & Google SERP Simulator:** 
   - Backend auto-generates Nginx redirects, robots.txt, and JSON-LD structured schema script blocks.
   - Built an interactive Google search results preview modal in the frontend (Google dark theme styling) featuring character limit warnings, visual text truncation, one-click AI recommendation overrides, and HTML tags export.
5. **Playwright PDF Compilation:** Integrates an A4 print PDF compiler that loads a custom FITS-branded HTML print template (Orbitron and Inter fonts, Cyan/Orange accents) into headless Playwright chromium and calls `page.pdf()`, generating high-quality client reports.
6. **SSO Gateway routing:** Configured Traefik rules in `cortex-services.yml` for `/api/spider` (Authelia SSO protected) and restarted Traefik. Integrated SPIDER in the React dashboard gateway matrix and updated `status_check.sh`.
7. **NFS File Lock & System Hardening (Mole Run - June 8, 2026):** Deployed a local staging storage solution (`/app/db_local` mapping to fast SSD local disk) to bypass DuckDB's concurrent file locking limitations on NFS network shares (which threw `Conflicting lock is held in PID 0` errors). Implemented dynamic database path resolution (`get_job_db_path`) in [spider_app.py](file:///home/louis/cortex/infrastructure/viki/services/spider/spider_app.py), automated local master DB migration, and added post-crawl archiving to the persistent data lake in [spider_worker.py](file:///home/louis/cortex/infrastructure/viki/services/spider/spider_worker.py). Resolved the BeautifulSoup recursion crash in [spider_crawler.py](file:///home/louis/cortex/infrastructure/viki/services/spider/spider_crawler.py) and configured Redis socket keepalives and `blpop` timeout exceptions to prevent worker log pollution.

---

### SNAPSHOT HISTORY
- `@snapshots/baseline_20260519`: Initial stable forensic state.
- `@snapshots/PANGO_20260529`: Pre-demo stable code refactoring and database baseline recovery.
- `@snapshots/VOOP_20260605`: Decoupled scanner consoles, report save/export controls, and scrollable responsive dashboard layout.
- `@snapshots/SPIDER_DEPLOY_20260605`: Standalone FITS SPIDER crawler stack deployed with GEO audits, auto-fixes, and Google SERP simulator.
