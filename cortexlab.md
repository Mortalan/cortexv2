# CORTEX LAB: EXECUTION TRACKER

## CURRENT STATUS
- **Lab Node:** VIKI (192.168.50.240)
- **Access:** root@192.168.50.240 (SSH)
- **Hypervisor:** Proxmox VE 9.x (**ACTIVE**)
- **Path:** /opt/cortex/ (Unified v2 Structure)
- **GitHub:** https://github.com/Mortalan/cortexv2
- **Services Map (v2 Initialized):**
    - Dashboard (React 19): https://rmmservice.co.za/ (OFFLINE - Pending DNS Fix)
    - NetLock RMM: https://rmm.rmmservice.co.za/ (OFFLINE)
    - Velociraptor EDR: https://edr.rmmservice.co.za/ (OFFLINE)
    - n8n Automation: https://automation.rmmservice.co.za/ (OFFLINE)
    - GLPI Ticketing: https://glpi.rmmservice.co.za/ (**UNINSTALLED** - Ready for Web Setup)
    - Authelia Identity: https://auth.rmmservice.co.za/ (OFFLINE)
    - MinIO S3: https://s3.rmmservice.co.za/ (OFFLINE)
    - Bareos Backup: (INITIALIZED)
- **Data Lake:** /mnt/data_lake (BTRFS) - Passed to VM 102.
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
9. [x] **VIKI Resurrection:** Deployed Proxmox VE 9.1 and VM Triad (100, 101, 102).

## NEXT IMMEDIATE STEP
**DNS Hardening & Dashboard Sync.**
- **Atomic Step:** Update Cloudflare/Public DNS to point `*.rmmservice.co.za` to the Gateway Public IP (`156.155.97.18`).
- **Validation:** Complete GLPI web setup and sync the pre-built `dist` folder to the Dashboard VM.

## MANUAL INTERVENTION REQUIRED
1. **DNS Update:** Point `glpi.rmmservice.co.za` to `156.155.97.18` at the registrar level.
2. **GLPI Web Setup:** Visit [https://glpi.rmmservice.co.za](https://glpi.rmmservice.co.za) once DNS resolves.

---
*Last Updated: Wednesday, 13 May 2026 (Session Close)*
