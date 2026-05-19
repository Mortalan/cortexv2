# CORTEX: THE MASTER REFERENCE BIBLE & OPERATIONAL MANUAL
## [VERSION 1.4 - MAY 2026]

---

### **SYSTEM STARTUP COMMAND (COPY-PASTE TO NEW CHAT)**
> "Read this CORTEX_MASTER_DOC.md file and the cortexlab.md file. This is the absolute source of truth for Project CORTEX. You are the lead System Engineer and Security Architect. List the current progress and suggest the next atomic step for the Lab Environment."

---

## 1. PROJECT MISSION & IDENTITY
**Project Name:** CORTEX (Centralized Operations, Response, & Technical EXecution)
**Goal:** A high-sovereignty, AI-augmented MSP stack for 500 endpoints and 7 technicians. 
**Compliance:** NIST 2.0, ISO 27001, POPIA.
**Branding:** "The Nervous System" (VDS) + "The Brain" (VIKI).
**Domain:** rmmservice.co.za (Pseudo-Production Lab)

---

## 2. INFRASTRUCTURE & HARDWARE

### 2.1 THE GATEWAY (HAPROXY NODE)
- **Host:** Ubuntu 22.04 LTS (192.168.50.239)
- **Role:** SSL Termination, SNI Routing, ACME Challenge handling.
- **SSL:** Let's Encrypt (Wildcard *.rmmservice.co.za).

### 2.2 THE NERVOUS SYSTEM (VDS NODE)
- **Host:** Ubuntu 26.04 LTS (Hardened via Custom ISO / LUKS)
- **Hardware:** VDS M (Cloud.co.za, Isando, SA)
- **Specs:** 4 Dedicated Xeon Cores, 32GB RAM, 600GB NVMe.
- **Roles:** Real-time management, Ingress, Persistent connectivity.

### 2.3 THE BRAIN (VIKI INTELLIGENCE NODE)
- **Host:** Proxmox VE 9.x (192.168.50.240) - **FULLY OPERATIONAL**
- **Hardware:** AMD Ryzen 7 5700, 32GB RAM.
- **GPU:** NVIDIA RTX 4060 (Passed through to VM 101).
- **Storage:**
    - **Boot/VMs:** 500GB NVMe (LVM-Thin).
    - **Data Lake:** 4TB HDD (Passed through to VM 102) - Mounted at /mnt/data_lake (BTRFS).
- **Architecture:** CORTEX VM Triad:
    - **Core (100):** 192.168.50.241 (Service Stack)
    - **AI (101):** 192.168.50.242 (Intelligence)
    - **Lake (102):** 192.168.50.243 (Forensics)
- **Roles:** Behavioral Triage, Historical Log Analysis, n8n decision logic.

---

## 3. THE CORTEX SOFTWARE STACK (DOCKER)
- **Ingress:** Traefik (Internal routing on 192.168.50.241).
- **RMM:** NetLock 3.0.0 (Unified remote access, patching, monitoring).
- **Forensics/EDR:** Velociraptor (VQL-driven threat hunting).
- **Ticketing:** GLPI (Manual support records & Asset DB) - **RESTORED**.
- **Automation:** n8n + Redis (Queueing and AI orchestration).
- **Backups:** Bareos (to Wasabi S3) + Restic (to Backblaze B2).
- **AI Hub:** VIKI (Local LLM via RTX 4060).
- **Security Reflex:** Reflex Daemon (Python-based autonomous response engine on Port 9090).

---

## 4. NETWORK TOPOLOGY & DATA FLOW
1. **Public/Local Ingress:** Client -> `rmmservice.co.za` -> Public IP -> HAProxy (192.168.50.239).
2. **Reverse Proxy:** HAProxy (SSL Term) -> CORTEX-Core Traefik (192.168.50.241:80).
3. **Telemetry Pipe:** VDS (Velociraptor/NetLock) -> Redis -> n8n -> VIKI.
4. **Forensic Lake:** VDS Logs -> WireGuard Tunnel -> VIKI 4TB HDD.
5. **Heartbeat:** VDS pings VIKI every 60s. If down, VDS enters **"Reflex Mode"** (Defender/ASR only) and queues logs in Redis via the Reflex Daemon.

---

## 5. OPERATIONAL SCRIPTS & UTILITIES
- **audit_and_prep.sh:** Golden image security audit. Verifies container health, MFA labels, Reflex state, and BTRFS mounts.
- **compliance_report.py:** Automated NIST 2.0 reporter. Queries Velociraptor VQL for asset management, auth anomalies, and monitoring status.
- **simulate_breach.sh:** Injects synthetic threat telemetry (e.g., Mimikatz) into the n8n triage webhook to test AI response logic.
- **deploy_dashboard.sh:** Synchronizes React 19 dashboard `dist` folder to the Nginx service.

---

## 6. CURRENT PROJECT STATE (AS OF MAY 19, 2026)
### ACTIVE TASKS
- [ ] **Phase 14.8:** Validate Reflex Mode transition via `simulate_breach.sh`.
- [ ] **Phase 14.9:** Review and optimize Status Monitor on the React 19 Dashboard.
- [ ] **Phase 15.2:** Optimize NetLock Web Console certificate handshake.

### COMPLETED MILESTONES
- [x] **Phase 15.1 (Forensic Lake Integration):** Migrated Ollama model storage to the 4TB Forensic Lake (AI-101) with persistent NFS mount.
- [x] **Emergency Ingress Stabilization:** Migrated Traefik logs, Authelia config, and LLDAP data to local storage on CORE-100 to resolve NFS I/O saturation lockups.
- [x] **Forensic Lake Alignment:** Migrated all service data from CORE-100 local storage to the 4TB BTRFS HDD on LAKE-102 via NFS.
- [x] **NetLock Licensed:** Successfully activated NetLock 3.0.0 via API Key; license valid until 2030.
- [x] **BTRFS Snapshot Baseline:** Verified metadata health and established initial snapshot `@snapshots/baseline_20260519`.
- [x] **LAKE-102 Recovery:** Expanded root disk to 20GB and restored SSH access.
- [x] **Mole Run: Reflex Architecture:** Integrated Reflex Daemon (Port 9090) for autonomous mode switching and playbook execution.
- [x] **Mole Run: NetLock Stabilization:** Resolved RMM restart loop via **Immutable Dependency Injection**.
- [x] **Gateway Integration:** Configured HAProxy (192.168.50.239) with SSL termination and SNI routing.

---

## 8. THE PHOENIX PROTOCOL: CORTEX v2 TRANSITION
**Objective:** Complete scrap and rebuild to eliminate path drift (`cortex` vs `cortex-lab`) and credential corruption.

### 8.1 PRE-FLIGHT CHECKLIST (DONE)
- [x] Push current `cortex` (v1) to GitHub (Backup).
- [x] Document current stable service labels.

### 8.2 THE CLEAN SWEEP (DONE)
- [x] **Nuclear Wipe & Filesystem Purge** (Legacy Cleanup complete on VIKI).

### 8.3 CORTEX v2 INITIALIZATION (COMPLETE)
1. **New Repository:** `https://github.com/Mortalan/cortexv2`
2. **Fresh Scaffold:** Unified `/opt/cortex/` structure.
3. **Core Services:** Re-deployed Traefik, Authelia, and GLPI.
4. **User Management:** Integrated **LLDAP** (`auth-admin.rmmservice.co.za`).
5. **Brain Resurrection:** Deployed **VM Triad** (Core, AI, Lake) on VIKI.

---

## 9. DASHBOARD & UI (REACT 19)
- **Engine:** Custom React 19 + TypeScript (Vite) + Three.js.
- **Aesthetic:** Cinematic 3D Neural-Core (Server Hallway).
- **Deployment:** Pre-built locally -> Synced to `/opt/cortex/infrastructure/viki/services/dashboard-react/dist` -> Mounted to Nginx container.
- **Maintenance:** Run `/opt/cortex/infrastructure/viki/deploy_dashboard.sh` after updating the `dist` folder.

## [SESSION UPDATE - 18 MAY 2026]
### INTELLIGENCE (AI-DRIVEN TRIAGE)
- **Status:** **FULLY OPERATIONAL**. 
- **Endpoint:** `https://automation.rmmservice.co.za/webhook/89ecafed-8deb-4ed1-b2de-bbc526e25cb1/telemetry/triage`
- **Verification:** Successfully processed `mimikatz.exe` mock telemetry using `llama3:latest` on GPU.

### INFRASTRUCTURE (CORE-100)
- **NetLock:** Investigation into "License Expired" gate remains blocked. Confirmed `members_portal_api_key` in DB and `401 Unauthorized` sync errors. Files marked immutable to prevent data loss.
- **SQLite:** Installed on CORE-100 for future database-level automation analysis.
ock:** Resolved Restart Loop using **Immutable Dependency Injection** (`chattr +i`). Server is now stable in Sovereign Mode, awaiting License activation.
- **Identity:** Authelia transitioned to LLDAP backend. Unified SSO established.
- **Gateway:** HAProxy configuration generated and verified for node .239.

### TELEMETRY (AGGREGATOR)
- **Vector:** Reconfigured as central aggregator on Port 5140. Dual sinks implemented (Lake + n8n).

### INTELLIGENCE (AI-101)
- **Status:** **FULLY OPERATIONAL**.
- **Resolution:** Resolved 'digest mismatch' via disk expansion (20GB) and cache purge. `llama3` and `phi` models active on GPU.
