# CORTEX: INFRASTRUCTURE & NETWORK
## [VERSION 2.0]

### 1. CORE NODES (VM TRIAD)
- **CORE-100 (192.168.50.241):** 
    - Ingress: Traefik
    - RMM: NetLock 3.0.0 (Licensed)
    - Identity: LLDAP + Authelia (SSO)
    - Ticketing: GLPI
- **AI-101 (192.168.50.242):**
    - Intelligence: Ollama (RTX 4060)
    - Automation: n8n + Redis
- **LAKE-102 (192.168.50.243):**
    - Storage: 4TB BTRFS HDD (/mnt/data_lake)
    - Roles: Forensic logging, Snapshot management.

### 2. GATEWAY & EXTERNAL
- **Host:** Ubuntu 22.04 (192.168.50.239)
- **Role:** HAProxy (SSL Termination: *.rmmservice.co.za)

### 3. NETWORK TOPOLOGY
Client -> HAProxy -> Traefik -> Service Container.
Inter-VM communication via 192.168.50.0/24.
Forensic logs via WireGuard tunnel to LAKE-102.
