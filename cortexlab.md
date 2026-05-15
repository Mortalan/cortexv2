# CORTEX LAB: EXECUTION TRACKER

## CURRENT STATUS
- **Lab Node:** VIKI (192.168.50.240)
- **Access:** root@192.168.50.240 (SSH)
- **Hypervisor:** Proxmox VE 9.x (**ACTIVE**)
- **Path:** /opt/cortex/ (Unified v2 Structure)
- **GitHub:** https://github.com/Mortalan/cortexv2
- **GPU:** RTX 4060 Passthrough to AI-VM (101) (**VERIFIED**)

## PHASE 14: RECOVERY & STABILIZATION (MAY 2026)

### 14.1 INFRASTRUCTURE (CORE-100)
- [x] **MySQL 8.0 Crash:** Resolved by switching CPU to `x86-64-v2-AES`.
- [x] **Data Corruption:** Wiped incompatible MariaDB data; re-initialized MySQL 8.0 schema.
- [x] **NetLock Stability:** Server connecting to DB. Bypassed Members Portal (401) and Certificate check failures via `appsettings.json`.
- [x] **Web Console:** Secured with Authelia MFA Gate.

### 14.2 INTELLIGENCE (AI-101)
- [x] **SSH Recovery:** Restored access via jump-host & key injection.
- [x] **Disk Expansion:** Grew scsi0 from 3.5GB -> 20GB; resized `sda1` online.
- [x] **GPU Driver:** `nvidia-container-toolkit` installed; `nvidia-smi` confirms RTX 4060.
- [x] **Ollama:** Installed & Verified (`vram-based default context 8.0 GiB`).
- [x] **Model Verification:** Resolving `digest mismatch` on model pulls. (Fixed via disk expansion & cache clear)

## NEXT STEPS (RE-START)
1. **Identity:** Finalize Authelia LLDAP backend integration.
2. **Gateway:** Configure HAProxy (192.168.50.239) for external `rmmservice.co.za` access.
3. **Telemetry:** Verify Vector flow from VDS to VIKI.

---
*Last Updated: Friday, 15 May 2026 (Session Close)*
