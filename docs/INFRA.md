# CORTEX: INFRASTRUCTURE & NETWORK
## [VERSION 2.0]

### 1. CORE NODES (VM TRIAD)
- **CORE-100 (192.168.50.241):** 
    - Ingress: Traefik
    - RMM: NetLock 3.0.0 (Licensed)
    - Identity: LLDAP + Authelia (SSO)
    - Ticketing: GLPI
- **AI-101 (192.168.50.242):**
    - Intelligence: Ollama (RTX 4060)
    - Automation: n8n + Redis
- **LAKE-102 (192.168.50.243):**
    - Storage: 4TB BTRFS HDD (/mnt/data_lake)
    - Roles: Forensic logging, Snapshot management.

### 2. GATEWAY & EXTERNAL
- **Host:** Ubuntu 22.04 (192.168.50.239)
- **Role:** HAProxy (SSL Termination: *.rmmservice.co.za)

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

#### **Protocol for Adding New Features / Subdomains**
When adding a new component that requires a public subdomain (e.g., `newservice.rmmservice.co.za`):
1. **User Notification (DNS Step):** The AI Agent **MUST** explicitly instruct the Service Manager to point the new subdomain via A record to the public gateway IP:
   > **Public Gateway IP:** `156.155.97.18`
2. **DNS Propagation Check:** Wait for the DNS record to propagate before proceeding with certificate re-issuance.
3. **HAProxy Configuration:** Add the new subdomain to `/etc/haproxy/haproxy.cfg` under `frontend fe_https` (SNI matching rule and routing backend).
4. **Certbot Re-issuance:** Run the Certbot standalone command on the HAProxy server, appending the new domain with `-d newservice.rmmservice.co.za`.
5. **Unified PEM Generation:** Concatenate the private key and full chain, and overwrite `/etc/haproxy/rmmservice.co.za.pem`.
6. **Reload Gateway:** Reload HAProxy via `systemctl reload haproxy`.

### 6. SYSTEM STABILITY & KERNEL TUNING
- **Problem:** Virtual machines (specifically `CORTEX-CORE` VM 100) running on Proxmox 9.x (kernel 6.8.x) can experience userspace hangs (e.g., SSH login hangs, Traefik connection timeouts), caused by `kcompactd0` memory compaction lockups in the guest kernel under memory pressure. This subsequently crashes the Proxmox status daemon (`pvestatd`) with a segmentation fault (`SEGV`).
- **Workaround:** Proactive memory compaction is disabled host-wide and guest-wide.
- **Implementation:** Added `vm.compaction_proactiveness=0` inside `/etc/sysctl.d/60-kcompactd-lockup-fix.conf` on the Proxmox host (`192.168.50.240`) and all three virtual machines (`192.168.50.241`, `192.168.50.242`, `192.168.50.243`).
- **Command applied:** `echo "vm.compaction_proactiveness=0" | sudo tee /etc/sysctl.d/60-kcompactd-lockup-fix.conf && sudo sysctl -p /etc/sysctl.d/60-kcompactd-lockup-fix.conf`



