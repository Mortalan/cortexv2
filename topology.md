# CORTEX NETWORK TOPOLOGY & HARDWARE MAP [v1.5]

## 1. PHYSICAL NODE: VIKI (192.168.50.240)
- **CPU:** Intel i7-12700K (12C/20T)
- **RAM:** 64GB DDR4
- **GPU:** NVIDIA RTX 4060 8GB (Passthrough to 101)
- **Storage:** 
  - 1TB NVMe (OS / VM Root)
  - 4TB HDD (Mounted at /mnt/data_lake)
- **Hypervisor:** Proxmox VE 9.x

## 2. VIRTUAL INFRASTRUCTURE (VM TRIAD)

### VM 100: CORTEX-CORE (192.168.50.241)
- **Role:** Management & Routing (Traefik, NetLock, Identity)
- **CPU:** 4 Cores (x86-64-v2-AES) -> *Required for MySQL 8.0*
- **RAM:** 8GB
- **Storage:** 24GB NVMe
- **OS:** Ubuntu 24.04 LTS (Noble)

### VM 101: CORTEX-AI (192.168.50.242)
- **Role:** Intelligence Hub (Ollama, Private LLM)
- **CPU:** 4 Cores (Host)
- **RAM:** 16GB
- **GPU:** RTX 4060 8GB (CUDA Ready)
- **Storage:** 20GB NVMe -> *Expanded from 3.5GB*
- **OS:** Ubuntu 24.04 LTS (Noble)

### VM 102: CORTEX-LAKE (192.168.50.243)
- **Role:** Data Persistence & Backup Simulation
- **CPU:** 2 Cores
- **RAM:** 4GB
- **Storage:** 20GB (Root) + Passthrough to 4TB HDD
- **OS:** Ubuntu 24.04 LTS (Noble)

## 3. EXTERNAL NODES
- **GLPI Server:** 192.168.50.232 (Legacy / Maintenance)
- **Reverse Proxy:** 192.168.50.239 (HAProxy)
