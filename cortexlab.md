# CORTEX LAB: EXECUTION TRACKER

## CURRENT STATUS
- **Lab Node:** VIKI (192.168.50.240)
- **Access:** root@192.168.50.240 (SSH)
- **Hypervisor:** Proxmox VE 9.x (**ACTIVE**)
- **Path:** /opt/cortex/ (Unified v2 Structure)
- **GitHub:** https://github.com/Mortalan/cortexv2
- **Services Map (v2 Operational):**
    - Dashboard (React 19): https://rmmservice.co.za/ (**ONLINE**)
    - NetLock RMM: https://rmm.rmmservice.co.za/ (**ONLINE**)
    - Velociraptor EDR: https://edr.rmmservice.co.za/ (**ONLINE - Telemetry Restored**)
    - n8n Automation: https://automation.rmmservice.co.za/ (**ONLINE**)
    - GLPI Ticketing: https://glpi.rmmservice.co.za/ (**ONLINE - Secured**)
    - Authelia Identity: https://auth.rmmservice.co.za/ (**ONLINE**)
    - MinIO S3: https://s3.rmmservice.co.za/ (**ONLINE**)
    - Bareos Backup: (INITIALIZED)
- **Data Lake:** /mnt/data_lake (BTRFS) - Passed to VM 102.
- **Phase:** PHASE 14 - AI TRIAGE ACTIVATION

## CORTEX v2 MILESTONES
1. [x] **Nuclear Wipe & Filesystem Purge** (Legacy Cleanup)
2. [x] **Unified Scaffold** (/opt/cortex/)
3. [x] **Unified Secrets** (/opt/cortex/.env)
4. [x] **Core Ingress & Identity** (Traefik + Authelia + GLPI)
5. [x] **Secondary Service Migration** (NetLock, Velociraptor, n8n)
6. [x] **Next-Gen Dashboard** (React 19 + 3D Neural-Core Redesign)
7. [x] **Network Migration:** Successfully moved to 192.168.50.X Subnet.
8. [x] **VIKI Resurrection:** Deployed Proxmox VE 9.1 and VM Triad (100, 101, 102).
9. [x] **EDR mTLS Alignment:** Implemented Traefik TCP Passthrough for Velociraptor.
10. [x] **Compliance Baseline:** Completed NIST 2.0 Audit and Asset discovery.

## NEXT IMMEDIATE STEP
**AI-Driven Behavioral Triage Activation.**
- **Atomic Step:** Link Velociraptor alerts to n8n and forward to the VIKI AI Node (101).
- **Validation:** Trigger a test alert and verify AI risk scoring in the 3D Dashboard.

## MANUAL INTERVENTION REQUIRED
- **NONE.** System is currently stable.

---
*Last Updated: Wednesday, 13 May 2026 (Session Close)*
