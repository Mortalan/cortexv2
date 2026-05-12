# CORTEX LAB: EXECUTION TRACKER

## CURRENT STATUS
- **Lab Node:** VIKI (192.168.50.240)
- **Access:** root@192.168.50.240 (SSH)
- **Hypervisor:** Proxmox VE 9.x (TRANSITIONING)
- **Path:** /opt/cortex/ (Unified v2 Structure)
- **GitHub:** https://github.com/Mortalan/cortexv2
- **Services Map (v2 Initialized):**
    - Dashboard (React 19): https://rmmservice.co.za/ (OFFLINE - Pending VM Deployment)
    - NetLock RMM: https://rmm.rmmservice.co.za/ (OFFLINE)
    - Velociraptor EDR: https://edr.rmmservice.co.za/ (OFFLINE)
    - n8n Automation: https://automation.rmmservice.co.za/ (OFFLINE)
    - GLPI Ticketing: https://glpi.rmmservice.co.za/ (ACTIVE - PRODUCTION RESTORED)
    - Authelia Identity: https://auth.rmmservice.co.za/ (OFFLINE)
    - MinIO S3: https://s3.rmmservice.co.za/ (OFFLINE)
    - Bareos Backup: (INITIALIZED)
- **Data Lake:** /mnt/data_lake (BTRFS)
- **Phase:** PHASE 13 INITIALIZED - REPORTING & COMPLIANCE

## CORTEX v2 MILESTONES
1. [x] **Nuclear Wipe & Filesystem Purge** (Legacy Cleanup)
2. [x] **Unified Scaffold** (/opt/cortex/)
3. [x] **Unified Secrets** (/opt/cortex/.env)
4. [x] **Core Ingress & Identity** (Traefik + Authelia + GLPI)
5. [x] **Secondary Service Migration** (NetLock, Velociraptor, n8n)
6. [x] **Next-Gen Dashboard** (React 19 + 3D Neural-Core Redesign)
7. [x] **Network Migration:** Successfully moved to 192.168.50.X Subnet.
8. [x] **Production Restore:** Resolved GLPI "White Page" and QoS latency.
9. [ ] **VIKI Resurrection:** Deploy Proxmox VE 9.x and VM Triad.

## NEXT IMMEDIATE STEP
**Resurrection of the Brain (VIKI).**
- **Atomic Step:** Configure Proxmox 9.x for IOMMU and deploy the CORTEX VM Triad (Core, AI, Lake).
- **Validation:** Restore 3D Dashboard and AI Telemetry pipes.

## MANUAL INTERVENTION REQUIRED
1. **Load Artifacts:** Execute `/opt/cortex/infrastructure/viki/deploy_artifacts.sh` on VIKI.
2. **Deploy Dashboard:** If changes are pushed to GitHub, run `bash infrastructure/viki/deploy_dashboard.sh` on VIKI to sync the pre-built `dist` folder.

---
*Last Updated: Tuesday, 12 May 2026 (Session Close)*
