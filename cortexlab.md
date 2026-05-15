# CORTEX LAB: EXECUTION TRACKER

## CURRENT STATUS
- **Lab Node:** VIKI (192.168.50.240)
- **Access:** root@192.168.50.240 (SSH)
- **Hypervisor:** Proxmox VE 9.x (**ACTIVE**)
- **Path:** /opt/cortex/ (Unified v2 Structure)
- **GitHub:** https://github.com/Mortalan/cortexv2
- **Services Map (v2 Operational):**
    - Dashboard (React 19): https://rmmservice.co.za/ (**ONLINE**)
    - NetLock RMM: https://rmm.rmmservice.co.za/ (**RESTART LOOP - Connection Failure**)
    - Velociraptor EDR: https://edr.rmmservice.co.za/ (**ONLINE**)
    - n8n Automation: https://automation.rmmservice.co.za/ (**ONLINE**)
    - GLPI Ticketing: https://glpi.rmmservice.co.za/ (**ONLINE**)
    - Authelia Identity: https://auth.rmmservice.co.za/ (**ONLINE**)
    - MinIO S3: https://s3.rmmservice.co.za/ (**ONLINE**)
    - Bareos Backup: (INITIALIZED)
- **Data Lake:** /mnt/data_lake (BTRFS) - Passed to VM 102.
- **Phase:** PHASE 14 - AI TRIAGE ACTIVATION (RECOVERY MODE)

## CORTEX v2 MILESTONES
1. [x] **Nuclear Wipe & Filesystem Purge** (Legacy Cleanup)
2. [x] **Unified Scaffold** (/opt/cortex/)
3. [x] **Unified Secrets** (/opt/cortex/.env)
4. [x] **Core Ingress & Identity** (Traefik + Authelia + GLPI)
5. [x] **Secondary Service Migration** (NetLock, Velociraptor, n8n)
6. [x] **Next-Gen Dashboard** (React 19 + 3D Neural-Core Redesign)
7. [x] **Network Migration:** Successfully moved to 192.168.50.X Subnet.
8. [x] **VIKI Resurrection:** Deployed Proxmox VE 9.1 and VM Triad (100, 101, 102).
9. [x] **Mole Run: Diagnostic Completion:** Identified post-migration regressions in NetLock config loading and AI-VM SSH availability.

## NEXT IMMEDIATE STEP
**Recover NetLock RMM and AI-VM Access.**
- **Atomic Step 1:** Inject `ConnectionStrings__DefaultConnection` environment variable into `netlock-rmm-server` to bypass corrupted appsettings load.
- **Atomic Step 2:** Access AI-VM (101) via Proxmox console to fix SSH "Connection refused" (Noble Cloud-Init hang).
- **Validation:** Confirm NetLock is "Running" and `ssh ubuntu@192.168.50.242` succeeds.

## MANUAL INTERVENTION REQUIRED
- **PROXMOX CONSOLE:** Access AI-VM (101) manually if SSH remains refused after next boot.

---
*Last Updated: Friday, 15 May 2026 (Session Close)*
