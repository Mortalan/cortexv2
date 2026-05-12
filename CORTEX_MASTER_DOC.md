# CORTEX: THE MASTER REFERENCE BIBLE & OPERATIONAL MANUAL
## [VERSION 1.1 - MAY 2026]

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
- **Host:** Ubuntu 22.04 LTS (10.0.0.239)
- **Role:** SSL Termination, SNI Routing, ACME Challenge handling.
- **SSL:** Let's Encrypt (Wildcard *.rmmservice.co.za).

### 2.2 THE NERVOUS SYSTEM (VDS NODE)
- **Host:** Ubuntu 26.04 LTS (Hardened via Custom ISO / LUKS)
- **Hardware:** VDS M (Cloud.co.za, Isando, SA)
- **Specs:** 4 Dedicated Xeon Cores, 32GB RAM, 600GB NVMe.
- **Roles:** Real-time management, Ingress, Persistent connectivity.

### 2.3 THE BRAIN (VIKI INTELLIGENCE NODE)
- **Host:** Local Test Bench (10.0.0.240)
- **Hardware:** AMD Ryzen 7 5700, 32GB RAM.
- **GPU:** NVIDIA RTX 4060 (Dedicated to LLM Inference).
- **Storage:** 4TB HDD (Forensic Data Lake) - Mounted at /mnt/data_lake (BTRFS).
- **Roles:** Behavioral Triage, Historical Log Analysis, n8n decision logic.

---

## 3. THE CORTEX SOFTWARE STACK (DOCKER)
- **Ingress:** Traefik (Internal routing behind HAProxy).
- **RMM:** NetLock 3.0.0 (Unified remote access, patching, monitoring).
- **Forensics/EDR:** Velociraptor (VQL-driven threat hunting).
- **Ticketing:** GLPI (Manual support records & Asset DB).
- **Automation:** n8n + Redis (Queueing and AI orchestration).
- **Backups:** Bareos (to Wasabi S3) + Restic (to Backblaze B2).
- **AI Hub:** VIKI (Local LLM via RTX 4060).

---

## 4. NETWORK TOPOLOGY & DATA FLOW
1. **Public/Local Ingress:** Client -> `rmmservice.co.za` -> Public IP -> HAProxy (10.0.0.239).
2. **Reverse Proxy:** HAProxy (SSL Term) -> VIKI Traefik (10.0.0.240:80).
3. **Telemetry Pipe:** VDS (Velociraptor/NetLock) -> Redis -> n8n -> VIKI.
4. **Forensic Lake:** VDS Logs -> WireGuard Tunnel -> VIKI 4TB HDD.
5. **Heartbeat:** VDS pings VIKI every 60s. If down, VDS enters **"Reflex Mode"** (Defender/ASR only) and queues logs in Redis.

---

## 5. AGENT PROTOCOLS & GOVERNANCE

### 5.1 THE TRIAD OF EXECUTION
To ensure absolute sovereign integrity and performance, all operations must pass through the following three lenses:

1. **THE BOARD:** A collective of 10 virtualized MSP board members, each an elite specialist (Networking, Compliance, Automation, Client Success, etc.). They provide the strategic mandate and high-level architectural approval.
2. **RED TEAM:** A group of professional offensive security specialists. Their role is to aggressively pentest every configuration, port exposure, and line of code before it moves to production. If it's not hardened, it's not CORTEX.
3. **THE MOLE:** A senior subterranean developer and efficiency architect. The Mole performs deep-dive logic scans, identifies broken links or orphaned variables, verifies API parity, and ensures zero-redundancy code.

### 5.2 OPERATIONAL PROTOCOLS (MANDATORY FOR GEMINI CLI)
1. **Autonomous Atomic Commits:** After every single code generation or structural change, the agent MUST perform the commit autonomously: `git add . && git commit -m "CORTEX: [Specific Task Description]"`.
2. **Root Execution:** All deployment and infrastructure commands on VIKI (10.0.0.240) are executed as `root`. Do not use `sudo`.
3. **Documentation Parity:** Ensure any change in ports, networks, or volumes is immediately updated in the "Topology" section of the current session.
4. **No Hallucinations:** Never invent hardware. If a spec is missing, ask.
5. **Context Management:** After 5-7 tasks, explicitly suggest a session restart using the Startup Command above to prevent context bloat and drifting.
6. **Read-Only Bible:** This Master Doc is the "Redline." Any deviation must be explicitly approved by the user.

---

## 6. CURRENT PROJECT STATE (AS OF MAY 11, 2026)
### ACTIVE TASKS
- [x] Phase 12.3: Implement Dashboard real-time alerting for AI classifications.
- [x] Phase 13.1: Automated NIST 2.0 Compliance Reporting via Bareos/Forensic Lake.

### COMPLETED MILESTONES
- [x] **Autonomous Response:** Implemented Reflex API and Playbooks for automated host isolation.
- [x] Phase 1-10: All services functional in Lab environment.
- [x] Documentation Sync & Security Audit Script.
- [x] Strategic pivot to Real-Domain / Real-SSL for Lab (Pseudo-Prod).
- [x] Ingress Stability: Resolved Authelia protocol mismatch and MinIO routing ambiguity.
- [x] **Dashboard Evolution:** Transitioned from Homer to custom React 19 + Topology Monitor.
- [x] **Intelligence Integration:** Upgraded VIKI to Ollama v0.3.4 (RTX 4060) with Llama3 support.
- [x] **Automated Triage:** Verified NIST 2.0-aligned Behavioral Triage workflow in n8n.
- [x] **Telemetry Automation:** Deployed Velociraptor VQL forwarders and automated n8n triage loop.
- [x] **Real-time Alerting:** Integrated AI-driven 'CRITICAL' threat indicators into React 19 Dashboard.

---

## 8. THE PHOENIX PROTOCOL: CORTEX v2 TRANSITION
**Objective:** Complete scrap and rebuild to eliminate path drift (`cortex` vs `cortex-lab`) and credential corruption.

### 8.1 PRE-FLIGHT CHECKLIST (DONE)
- [x] Push current `cortex` (v1) to GitHub (Backup).
- [x] Document current stable service labels.

### 8.2 THE CLEAN SWEEP (TO BE DONE ON VIKI)
1. **Docker Nuclear Wipe:**
   ```bash
   docker rm -f $(docker ps -aq)
   docker system prune -a -f --volumes
   docker network rm $(docker network ls -q)
   ```
2. **Filesystem Purge:**
   ```bash
   rm -rf /root/cortex
   rm -rf /root/cortex-lab
   # Data Lake remains persistent for forensics
   ```

### 8.3 CORTEX v2 INITIALIZATION
1. **New Repository:** Initialize `cortexv2` on GitHub. 
   - **URL:** `https://github.com/Mortalan/cortexv2`
   - **Token:** Stored in `/opt/cortex/.env` (v2 Standard).
2. **Fresh Scaffold:**
   - Unified folder structure: `/opt/cortex/`
   - Single source of truth for secrets: `/opt/cortex/.env`
   - **Lab Defaults:** `admin` / `password` (Unified across Authelia, EDR, and S3).
3. **Core Services:** Re-deployed Traefik, Authelia, and GLPI first to verify the new Ingress.
4. **User Management:** Integrated **LLDAP** for modern web-based identity management (`auth-admin.rmmservice.co.za`).
5. **Domain Lock:** Hard-locked `rmmservice.co.za` from Step 1.

---

## 9. DASHBOARD & UI (REACT 19)
- **Engine:** Custom React 19 + TypeScript (Vite).
- **Styling:** Vanilla CSS (Modern Dark Glassmorphism).
- **Deployment:** Dockerized (Nginx) on VIKI.
- **Path:** `/opt/cortex/infrastructure/viki/services/dashboard-react/`
- **Designer Access:** 
  1. Push changes to GitHub repository.
  2. Execute `/opt/cortex/deploy_dashboard.sh` on VIKI to rebuild and deploy.

