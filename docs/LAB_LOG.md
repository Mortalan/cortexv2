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

### SNAPSHOT HISTORY
- `@snapshots/baseline_20260519`: Initial stable forensic state.
- `@snapshots/PANGO_20260529`: Pre-demo stable code refactoring and database baseline recovery.
