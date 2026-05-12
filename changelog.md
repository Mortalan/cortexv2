# CORTEX CHANGELOG
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

