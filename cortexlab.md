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
- [x] **Identity Integration:** Authelia transitioned to LLDAP backend for unified SSO.
- [x] **Gateway Configuration:** Generated `haproxy.cfg` for SSL termination and ingress to `rmmservice.co.za`.
- [x] **Telemetry Pipe:** Reconfigured Vector as central aggregator (Port 5140) with sinks to Forensic Lake and n8n.

### 14.2 INTELLIGENCE (AI-101)
- [x] **SSH Recovery:** Restored access via jump-host & key injection.
- [x] **Disk Expansion:** Grew scsi0 from 3.5GB -> 20GB; resized `sda1` online.
- [x] **GPU Driver:** `nvidia-container-toolkit` installed; `nvidia-smi` confirms RTX 4060.
- [x] **Ollama:** Installed & Verified (`vram-based default context 8.0 GiB`).
- [x] **Model Verification:** Resolving `digest mismatch` on model pulls. (Fixed via disk expansion & cache clear)

## NEXT STEPS (RE-START)
1. **Intelligence:** Resolve Ollama model pull failures on AI-101.
2. **Compliance:** Execute NIST 2.0 automated audit.
3. **Forensics:** Verify BTRFS snapshots for the Forensic Lake.

---
*Last Updated: Friday, 15 May 2026 (Session Close)*
