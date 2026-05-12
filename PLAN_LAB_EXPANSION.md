# LAB EXPANSION PLAN: PROJECT CORTEX

## REPOSITORIES
- **Lab:** `https://github.com/Mortalan/cortex-lab`
- **Production:** `https://github.com/Mortalan/cortex-prod`

## Phase 1: Ingress & Foundation (Traefik)
### 1. Goal
Transition from direct port exposure (80/7080/7081) to a unified ingress gateway (Traefik) on VIKI.

### 2. Proposed Changes
- **Traefik Deployment:** `traefik:v3.0` on `netlock-network`.
- **NetLock Refactoring:** Move to labels, remove direct port 80 exposure.

## Phase 2: Monitoring & Forensics (Velociraptor)
### 1. Goal
Deploy Velociraptor for VQL-driven threat hunting.
### 2. Proposed Changes
- **Velociraptor Server:** `velociraptor/velociraptor:latest`.
- **Data Lake:** Mount `/home/netlock/velociraptor/data` to VIKI's 4TB HDD.

## Phase 3: Automation Hub (n8n + Redis)
### 1. Goal
Establish an automation layer.
### 2. Proposed Changes
- **Services:** `redis:7-alpine`, `n8nio/n8n:latest`.
- **Integration:** Configure webhooks and API keys for NetLock/Velociraptor.

## Phase 4: Intelligence Hub (VIKI AI)
### 1. Goal
Private LLM inference using RTX 4060.
### 2. Proposed Changes
- **Service:** `ollama/ollama:latest` with NVIDIA GPU passthrough.
- **Model:** Llama 3 (8B) or similar.

## Phase 5: Connectivity & Backups
### 1. Goal
Secure P2P tunnel and redundant backups.
### 2. Proposed Changes
- **WireGuard:** `linuxserver/wireguard` for log offload simulation.
- **Backups:** `bareos` + `restic` (to local 4TB HDD in lab phase).

## Phase 6: Ticketing & Asset Management (GLPI)
### 1. Goal
Deploy a lab instance of GLPI for support record management and asset tracking.
### 2. Proposed Changes
- **GLPI Deployment:** diouxx/glpi + MariaDB.
- **Routing:** Proxied via Traefik at `/glpi`.

## Phase 7: S3 Simulation (MinIO)
### 1. Goal
Simulate Wasabi S3 and Backblaze B2 environments.
### 2. Proposed Changes
- **Deployment:** MinIO on the 4TB HDD (`/mnt/data_lake/s3_sim`).

## Phase 8: Identity & MFA (Authelia)
### 1. Goal
Implement the "MFA-Gate" requirement from the Master Doc for secure ingress.
### 2. Proposed Changes
- **Deployment:** `authelia/authelia:latest` + Redis.
- **Integration:** Traefik ForwardAuth middleware to protect NetLock, GLPI, and n8n.

## Phase 9: Log Aggregation (Vector)
### 1. Goal
Simulate the "Telemetry Pipe" and log offloading to the 4TB HDD.
### 2. Proposed Changes
- **Deployment:** `timberio/vector:latest-alpine`.
- **Flow:** Agent Logs -> Vector -> WireGuard -> VIKI HDD.

## Phase 10: "Reflex Mode" Simulation
### 1. Goal
Test the failover logic where the VDS enters a hardened "Reflex Mode" if connection to VIKI is lost.
### 2. Proposed Changes
- **Scripting:** n8n or Python script to monitor WireGuard heartbeats.

## Phase 11: Environment Versioning & Snapshoting
### 1. Goal
Create a "Golden Image" of the lab environment to allow safe testing of new features without data loss or production impact.
### 2. Proposed Changes
- **Configuration Versioning:** All `docker-compose.yml`, `traefik.yml`, etc., managed in a local Git repository on VIKI.
- **Data Snapshoting:** Use BTRFS snapshots for the `/mnt/data_lake` subvolumes.
- **Volume Backups:** Periodic `tar` backups of Docker volumes (e.g., NetLock internal files, GLPI DB).
- **Documentation:** A `RESTORE_LAB.sh` script to revert the environment to the last known-good state.

---

## IMPLEMENTATION ORDER
1. **Foundation:** Phase 1 (Traefik) + Mount 4TB HDD + **Init Git Repo**.
2. **Infrastructure:** Phase 7 (MinIO) + Phase 8 (Identity).
3. **Core Services:** Phase 2, 4, 6 (Velociraptor, AI, GLPI).
4. **Logic & Automation:** Phase 3 (n8n + Redis).
5. **Connectivity & Persistence:** Phase 5 (WireGuard/Backups) + Phase 9 (Vector).
6. **Stress Testing:** Phase 10 (Reflex Mode).
7. **Finalization:** Phase 11 (Snapshotting / Golden Image).
