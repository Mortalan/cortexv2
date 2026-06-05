# CORTEX: INFRASTRUCTURE & NETWORK
## [VERSION 2.0]

> [!NOTE]
> Backup of the original unified infrastructure documentation:
> [/home/louis/cortex/archive/backup_20260603/docs/INFRA.md](file:///home/louis/cortex/archive/backup_20260603/docs/INFRA.md)

### 1. CORE NODES & SERVICES (LXC DECENTRALIZATION)
Cortex has decentralized its operations from a single VM into four dedicated LXC containers on the hypervisor (192.168.50.240) sharing a dynamic BTRFS Forensic Data Lake under `/mnt/data_lake`:
- **LXC Ingress & Identity (201 - 192.168.50.251):**
    - Router: Traefik Ingress (v2.11)
    - Identity: LLDAP + Authelia SSO (Session parameters: `expiration: 24h`, `inactivity: 12h`)
- **LXC Core Command (202 - 192.168.50.252):**
    - UI: React Dashboard (Served via Nginx)
    - APIs: Reflex Daemon (Flask API), Hermes API Gateway
    - Forensic Logs: Vector Collector, Velociraptor EDR Console
    - Scanners: SEO Scanner (port 8090), Web Auditor (port 8091)
    - **SPIDER:** Standalone FITS SEO & GEO Crawler (Port 8092 FastAPI server + async task worker utilizing private Redis queue)
- **LXC GLPI Ticketing (203 - 192.168.50.253):**
    - Ticketing: GLPI + Apache SSL Pass-Through reverse-proxy
- **LXC Automation (204 - 192.168.50.254):**
    - Automation: n8n canvas portal + Redis broker
- **Primary VM 100 (192.168.50.241):**
    - RMM: NetLock 3.0.0 Console (Licensed)
- **Primary AI VM 101 (192.168.50.242):**
    - Intelligence: Ollama (RTX 4060 GPU acceleration, models: `hermes3`)
- **Forensics VM LAKE-102 (192.168.50.243):**
    - Storage: 4TB ZFS/BTRFS Data Lake `/mnt/data_lake` NFS shared to LXC containers

### 3. NETWORK TOPOLOGY
Client -> HAProxy -> Traefik -> Service Container.
Inter-VM communication via 192.168.50.0/24.
Forensic logs via WireGuard tunnel to LAKE-102.

### 4. DEPLOYMENT & ROUTING PROTOCOLS
To prevent infrastructure degradation (404s/502s/401s), the following rules must be strictly observed:
- **Execution Boundaries:** Development tools and AI agents operate on the local source repository. **Never** assume local command execution reaches the Docker daemon. You must manually SSH into the server (`192.168.50.241` / `240`), execute `git pull`, and run `docker compose up -d` to ingest config changes.
- **Router Overlap:** Never assign the same Traefik `Host()` rule to multiple active containers (e.g., legacy Homer Dashboard and React Dashboard). This causes unpredictable round-robin 502/404 routing. Ensure obsolete containers have `traefik.enable=false`.
- **External Proxies:** For routing to external nodes (e.g., `Ollama` at `192.168.50.242`), Traefik Docker labels are insufficient. A `file` provider must be used inside `/etc/traefik/dynamic` (e.g., `ollama.yml`) with a defined `loadBalancer.servers.url`.
- **Authentication Conflicts:** Services that rely on internal native GUI basic authentication (such as `Velociraptor EDR`) must **not** be wrapped in Traefik's `authelia@docker` middleware. Double-wrapping authentication layers results in an unavoidable `401 Unauthorized` loop. 
- **Traefik Dashboard:** The Traefik API requires the trailing slash (`/dashboard/`) when accessed via standard routing links.
- **Python / Host-Level Services:** Services running on the host systemd (e.g., `viki-agent` listening on port `9092` on VM 100) are routed via dynamic Traefik file providers (`dynamic/viki-agent.yml`) using `http.services` with `loadBalancer.servers` pointing to host loopback or internal IP endpoints to bypass Docker boundaries seamlessly.

### 5. SSL & DOMAIN WORKFLOW (MULTI-DOMAIN SAN)
To maintain 100% automated, zero-maintenance SSL renewals, CORTEX uses a **Multi-Domain SAN SSL certificate** terminated at the HAProxy gateway (`192.168.50.239`). Wildcard certificates are bypassed to avoid manual DNS challenge dependencies.

#### **Active SAN Domains List**
The unified certificate covers the following 16 active cluster domains:
1. `rmmservice.co.za` (Main Dashboard Ingress)
2. `cortex.rmmservice.co.za` (Dashboard Alias)
3. `auth.rmmservice.co.za` (Authelia SSO Ingress)
4. `auth-admin.rmmservice.co.za` (LLDAP Admin Console)
5. `automation.rmmservice.co.za` (n8n Webhook / Canvas)
6. `backup.rmmservice.co.za` (Bareos Admin)
7. `glpi.rmmservice.co.za` (GLPI Ingress)
8. `hermes.rmmservice.co.za` (Hermes API Gateway)
9. `s3.rmmservice.co.za` (MinIO S3 API Endpoint)
10. `s3-console.rmmservice.co.za` (MinIO Console Console)
11. `rmm.rmmservice.co.za` (Netlock Web Gateway)
12. `nl-webconsole.rmmservice.co.za` (Netlock Web Client)
13. `nl-backend.rmmservice.co.za` (Netlock Daemon API)
14. `nl-relay.rmmservice.co.za` (Netlock Client Relay)
15. `traefik.rmmservice.co.za` (Traefik Admin Dashboard)
16. `edr.rmmservice.co.za` (Velociraptor Admin Console)

#### **SSO Session Timing & Auto-Login Ingress**
- **Authelia Session Configurations:** Authelia's cookie session parameters are tuned in [configuration.yml](file:///home/louis/cortex/infrastructure/viki/services/authelia/configuration.yml) to prevent false logouts during background SPA (Single Page Application) polling:
  * `expiration: 24h` (maximum login token life)
  * `inactivity: 12h` (prevents timeouts when client-side AJAX requests to `/api` bypass the Authelia middleware proxy)
- **SSO Auto-Login Endpoint:** The backend [reflex_daemon.py](file:///home/louis/cortex/infrastructure/viki/services/reflex/reflex_daemon.py) hosts a `/api/permissions/me` route that parses Authelia injected headers. The frontend checks this on mount and logs users in automatically, bypassing the double-login gateway overlay while preserving local fallbacks.

#### **Protocol for Adding New Features / Subdomains**
When adding a new component that requires a public subdomain (e.g., `newservice.rmmservice.co.za`):
1. **User Notification (DNS Step):** The AI Agent **MUST** explicitly instruct the Service Manager to point the new subdomain via A record to the public gateway IP:
   > **Public Gateway IP:** `156.155.97.18`
2. **DNS Propagation Check:** Wait for the DNS record to propagate before proceeding with certificate re-issuance.
3. **HAProxy Configuration:** Add the new subdomain to `/etc/haproxy/haproxy.cfg` under `frontend fe_https` (SNI matching rule and routing backend).
4. **Certbot Re-issuance:** Run the Certbot standalone command on the HAProxy server, appending the new domain with `-d newservice.rmmservice.co.za`.
5. **Automated Deploy Hook:** Rebuilding the unified PEM bundle and reloading HAProxy is fully automated via the Let's Encrypt deploy hook located at `/etc/letsencrypt/renewal-hooks/deploy/haproxy-reload.sh` on the HAProxy host. Ensure the new domain is appended to the `for DOM in ...` loop within the script.

### 6. SYSTEM STABILITY & KERNEL TUNING
- **Problem:** Virtual machines (specifically `CORTEX-CORE` VM 100) running on Proxmox 9.x (kernel 6.8.x) can experience userspace hangs (e.g., SSH login hangs, Traefik connection timeouts), caused by `kcompactd0` memory compaction lockups in the guest kernel under memory pressure. This subsequently crashes the Proxmox status daemon (`pvestatd`) with a segmentation fault (`SEGV`).
- **Workaround:** Proactive memory compaction is disabled host-wide and guest-wide.
- **Implementation:** Added `vm.compaction_proactiveness=0` inside `/etc/sysctl.d/60-kcompactd-lockup-fix.conf` on the Proxmox host (`192.168.50.240`) and all three virtual machines (`192.168.50.241`, `192.168.50.242`, `192.168.50.243`).
- **Command applied:** `echo "vm.compaction_proactiveness=0" | sudo tee /etc/sysctl.d/60-kcompactd-lockup-fix.conf && sudo sysctl -p /etc/sysctl.d/60-kcompactd-lockup-fix.conf`



