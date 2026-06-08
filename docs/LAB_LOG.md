# CORTEX: LAB EXECUTION LOG
## [VERSION 2.2] - RECENT MILESTONES & ACTIVE STATUS

> [!NOTE]
> Detailed notes for completed historical phases (Phases 15 through 25) have been archived to optimize context size.
> Full history backup: [/home/louis/cortex/archive/backup_20260608/docs/LAB_LOG.md](file:///home/louis/cortex/archive/backup_20260608/docs/LAB_LOG.md)

### CURRENT PROGRESS OVERVIEW
- [x] Phases 15 - 25: Isolated microservices migration, Traefik routing gateway, SEO/Health scanners, and Standalone SPIDER SEO/GEO crawler stack with local db staging (Archive Ref: [backup_20260608/docs/LAB_LOG.md](file:///home/louis/cortex/archive/backup_20260608/docs/LAB_LOG.md))
- [ ] **Phase 20: Microsoft 365 Graph Calendar Integration - PLANNING**
- [ ] **Phase 21: Overtime Tracker FastAPI Port & GLPI Ticket hook - PLANNING**
- [ ] **Phase 22: Emergency API Kill Switch - PLANNING**

---

### BACKLOG & PLANNING TO-DOs
- [ ] **Velociraptor Ticket Ingestion:** Create tickets in GLPI for all critical/high security alerts triggered by Velociraptor (ensuring critical events are tracked even when dashboard is unattended).
- [ ] **MinIO Backup Failure Tickets:** Monitor MinIO backup scripts/events and automatically open a GLPI ticket if a backup job fails.
- [ ] **RMM Alert Consolidation Window Expansion:** Update [glpi_rmm_consolidator.php](file:///usr/local/bin/glpi_rmm_consolidator.php) on `192.168.50.232` to expand the consolidation time window from 2 hours (`7200` seconds) to 12 hours (`43200` seconds) to handle long-running resource alerts.

---

### SNAPSHOT HISTORY
- `@snapshots/baseline_20260519`: Initial stable forensic state.
- `@snapshots/PANGO_20260529`: Pre-demo stable code refactoring and database baseline recovery.
- `@snapshots/VOOP_20260605`: Decoupled scanner consoles, report save/export controls, and scrollable responsive dashboard layout.
- `@snapshots/SPIDER_DEPLOY_20260605`: Standalone FITS SPIDER crawler stack deployed with GEO audits, auto-fixes, and Google SERP simulator.
- `@snapshots/SPIDER_INGRESS_PERMS_20260608`: Resolved SPIDER app visibility permissions mapping in dashboard UI and Reflex daemon.
