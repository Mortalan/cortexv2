# CORTEX CHANGELOG

## 2026-05-19
- **Phase 15.1 Completion:** Successfully migrated Ollama model storage (5.9GB) to the 4TB Forensic Lake (NFS) on AI-101. Updated `ollama.service` with persistent `OLLAMA_MODELS` environment variable.
- **Emergency Ingress Restoration:** Resolved system-wide 504 errors caused by NFS I/O saturation.
    - Migrated Traefik logs to local storage on CORE-100.
    - Migrated Authelia config/DB to local storage on CORE-100.
    - Restored LLDAP service with local storage and corrected JWT/Admin-Pass configuration.
- **Monitoring Upgrade:** Updated `status_check.sh` to be multi-node aware, monitoring services across Core-100 and AI-101.
- **Documentation Parity:** Updated `CORTEX_MASTER_DOC.md` and `cortexlab.md` to reflect the new local-storage hybrid architecture and Phase 15.1 completion.

## 2026-05-18
- **Intelligence Workflow Activation:** Successfully established communication between n8n (CORE-100) and Ollama (AI-101).
- **Network Patch:** Reconfigured `ollama.service` to bind to `0.0.0.0:11434`, enabling cross-VM API calls.
- **Webhook Gateway:** Implemented Traefik router bypass for n8n webhooks to allow automated telemetry ingestion without Authelia MFA blocking.
- **Workflow Verification:** Successfully tested `CORTEX: Behavioral Triage v2` workflow using mock mimikatz telemetry.
- **NetLock License Audit:** Investigated "License Expired" blocker. Confirmed sync failure (401) with Members Portal. Identified that `package.zip` and `metadata.json` were manually secured via `chattr +i` in a previous session to prevent cleanup loops. Found `members_portal_api_key` in DB but failed to locate the actual license blob.
- **Tooling:** Installed `sqlite3` on CORE-100 for database-level telemetry and configuration auditing.

## 2026-05-15
- **Mole Run: Post-Migration Diagnosis:** Identified regression in NetLock RMM where `appsettings.json` bind-mount is ignored, resulting in empty DB configuration at runtime.
- **Regression:** CORTEX-AI (101) SSH service in "Connection refused" state following Cloud-Init boot on 192.168.50.242.
- **Action:** Injected VIKI SSH key into VM Triad via `qm set --sshkey`.
- **Status:** Project in "Recovery Mode" to restore RMM and AI acceleration.
- **Mole Run: NetLock Stabilization:** Updated `netlock_server_settings.json` and `netlock_web_settings.json` to bypass certificate requirements (forced HTTP) and skip Members Portal sync (401 loop).
- Security Hardening: Applied Authelia MFA protection label to `netlock-rmm-web-console` service in `docker-compose.yml`.
- **Identity Integration:** Transitioned Authelia authentication backend from file-based to LLDAP (`ldap://lldap:3890`) for unified identity management.
- **Gateway Restoration:** Generated `haproxy.cfg` for node `192.168.50.239`, enabling SSL termination and SNI routing for the `rmmservice.co.za` domain.
- **Telemetry Verification:** Reconfigured Vector as a central aggregator. Added TCP socket source (Port 5140) for VDS telemetry offload and implemented dual sinks to the Forensic Lake and n8n triage webhook.
- **Reflex Integration:** Synchronized Vector mode configurations (`vector_normal.yaml` and `vector_reflex.yaml`) with the new aggregator logic to ensure consistent telemetry flow during autonomous failover.


## 2026-05-07
- **Project Initiation:** Created `cortexproject.md` (Bible) and auxiliary tracking files.
- **Naming Convention:** Finalized project name as **CORTEX**.
- **Hardware Update:** Updated VIKI specs to AMD Ryzen 7 5700 and RTX 4060 after verification of lab machine.
- **Lab Research:** Verified NetLock 3.0.0 is running on VIKI (192.168.50.240) via Docker.
- **Phase 4 Initialization:** Established `infrastructure/viki/` directory and defined `docker-compose.yml` for GPU-accelerated Ollama deployment.
- **Phase 4 Completion:** Successfully deployed Ollama with RTX 4060 GPU passthrough. Verified local inference with TinyLlama.
- **Infrastructure Unification:** Reorganized VIKI node file structure into a unified `infrastructure/viki/` directory.
- **404 Resolution:** Hardened NetLock deployment by removing static IP assignments and fixing Traefik mount paths.
- **Phase 5 Completion:** Established secure WireGuard tunnel between VDS (10.10.10.1) and VIKI (10.10.10.2). Verified connectivity via handshake and ping.
- **Phase 6 Completion:** Deployed GLPI Ticketing with MariaDB 10.11 backend on the 4TB Data Lake.
- **Phase 7 Completion:** Implemented S3 Simulation via MinIO; initialized `backups` and `forensics` buckets.
- **Phase 8 Completion:** Hardened all services with Authelia MFA Identity Gate.
- **Phase 9 Completion:** Established Vector Telemetry pipe for real-time forensic offload.
- **Phase 10 Completion:** Verified 'Reflex Mode' autonomous failover logic.
- **Unified Command:** Deployed Homer Management Portal at `http://192.168.50.240`.
- **End of Session:** Syncing context for reset.

## 2026-05-11
- **Domain Transition:** Migrated Lab environment to `rmmservice.co.za`. 
- **Gateway Integration:** Configured HAProxy (192.168.50.239) for SNI routing and SSL termination (Self-signed wildcard).
- **Ingress Repair:** Fixed 404/503 errors by updating Traefik `trustedIPs` for Authelia compatibility and correcting MinIO routing labels.
- **Phoenix Protocol Executed:** Full scrap and rebuild to `/opt/cortex/` unified structure.
- **Credential Unification:** All services (Authelia, EDR, S3) synchronized to `admin` / `password`.
- **UI Modernization:** Applied advanced Glassmorphic theme to Homer dashboard.
- **Identity Management:** Deployed LLDAP for web-based user management at `auth-admin.rmmservice.co.za`.
- **GitHub Migration:** Moved source of truth to `https://github.com/Mortalan/cortexv2`.

## 2026-05-12
- **Network Migration:** Successfully transitioned entire environment from 10.0.0.X to **192.168.50.X** subnet.
- **Gateway Update:** Synchronized HAProxy (Happy) backend IPs and Let's Encrypt certificates.
- **Production Restore:** Recovered GLPI instance (fitsdev.co.za) by resolving proxy trust mismatches and disabling router-level QoS throttling.
- **Architectural Shift:** Designated **Proxmox VE 9.x** as the primary hypervisor for the VIKI node to mitigate filesystem corruption risks.
- **Disaster Recovery:** Created Proxmox 9.1 bootable media for hardware resurrection.
- **Infrastructure Audit:** Verified 1Gbps line speed and healthy database integrity for production assets.

