# CORTEX LAB: EXECUTION TRACKER

## CURRENT STATUS
- **Lab Node:** VIKI (10.0.0.240)
- **Access:** root@10.0.0.240 (SSH)
- **Hardware:** Ryzen 7 5700 / RTX 4060 / 4TB HDD
- **Path:** /opt/cortex/ (Unified v2 Structure)
- **GitHub:** https://github.com/Mortalan/cortexv2
- **Services Map (v2 Initialized):**
    - Dashboard (React 19): https://rmmservice.co.za/ (ACTIVE - 3D Neural-Core Live)
    - NetLock RMM: https://rmm.rmmservice.co.za/ (ACTIVE)
    - Velociraptor EDR: https://edr.rmmservice.co.za/ (ACTIVE)
    - n8n Automation: https://automation.rmmservice.co.za/ (ACTIVE)
    - GLPI Ticketing: https://glpi.rmmservice.co.za/ (ACTIVE)
    - Authelia Identity: https://auth.rmmservice.co.za/ (ACTIVE)
    - MinIO S3: https://s3.rmmservice.co.za/ (ACTIVE)
    - Bareos Backup: (INITIALIZED)
    - Ollama AI: http://viki-ollama:11434/ (v0.3.4 - INTEGRATED with n8n)
    - WireGuard Tunnel: (ACTIVE)
    - Traefik Ingress: (ACTIVE)
- **Data Lake:** /mnt/data_lake (BTRFS)
- **Phase:** PHASE 13 INITIALIZED - REPORTING & COMPLIANCE

## THE 11-PHASE BLUEPRINT (v1 ARCHIVE)
1.  [x] Phase 1-11 COMPLETE.

## CORTEX v2 MILESTONES
1. [x] **Nuclear Wipe & Filesystem Purge** (Legacy Cleanup)
2. [x] **Unified Scaffold** (/opt/cortex/)
3. [x] **Unified Secrets** (/opt/cortex/.env)
4. [x] **Core Ingress & Identity** (Traefik + Authelia + GLPI)
5. [x] **Secondary Service Migration** (NetLock, Velociraptor, n8n)
6. [x] **Next-Gen Dashboard** (React 19 + 3D Neural-Core Redesign)
7. [x] **AI Telemetry Pipe** (n8n + Ollama v0.3.4 + Llama3)
8. [x] **EDR Telemetry Automation** (VQL Forwarding + n8n Triage)
9. [x] **Phase 13: Reporting & Compliance** (In Progress)
    - [x] Bareos Stack Initialization
    - [ ] Bareos Job Definitions (Forensic Lake / GLPI DB)
    - [ ] NIST 2.0 Compliance Scripting

## NEXT IMMEDIATE STEP
**Phase 13: Reporting & Compliance (Continued).**
- **Atomic Step:** Configure Bareos Job Definitions targeting `/mnt/data_lake` and scheduled GLPI database dumps.
- **Visuals:** Finalize any remaining 3D environment optimizations for the Status Monitor.

## MANUAL INTERVENTION REQUIRED
1. **Load Artifacts:** Execute `/opt/cortex/infrastructure/viki/deploy_artifacts.sh` on VIKI.
2. **Deploy Dashboard:** If changes are pushed to GitHub, run `bash infrastructure/viki/deploy_dashboard.sh` on VIKI to sync the pre-built `dist` folder.

---
*Last Updated: Tuesday, 12 May 2026 (Session Close)*
