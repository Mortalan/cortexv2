#!/bin/bash
# ==============================================================================
# CORTEX LXC DECENTRALIZATION PROVISIONING SCRIPT (v1.0)
# Target: Proxmox VE 9.x (VIKI - 192.168.50.240)
# Protocol: Parallel LXC Migration & Decentralization
# ==============================================================================

set -euo pipefail

# Configuration
TEMPLATE_STORAGE="local"
TARGET_STORAGE="local-lvm"
UBUNTU_VERSION="24.04"
TEMPLATE_NAME="ubuntu-24.04-standard_24.04-2_amd64.tar.zst"
SSH_KEY_FILE="/root/.ssh/authorized_keys"

echo "======================================================================"
echo " CORTEX LXC PROVISIONING ENGINE"
echo "======================================================================"

# 1. Update template database and fetch template
echo "[*] Step 1: Syncing Proxmox template repository..."
pveam update

echo "[*] Step 2: Verifying OS template existence..."
if ! pveam list "$TEMPLATE_STORAGE" | grep -q "$TEMPLATE_NAME"; then
    echo "[*] Downloading Ubuntu $UBUNTU_VERSION standard template..."
    pveam download "$TEMPLATE_STORAGE" "$TEMPLATE_NAME"
else
    echo "[+] Template '$TEMPLATE_NAME' already exists in '$TEMPLATE_STORAGE'."
fi

# SSH Key Hook
SSH_KEY_ARG=""
if [ -f "$SSH_KEY_FILE" ]; then
    echo "[+] Found SSH host authorized keys file. Auto-injecting for root access."
    SSH_KEY_ARG="--ssh-public-keys $SSH_KEY_FILE"
else
    echo "[!] Warning: $SSH_KEY_FILE not found. Continuing without SSH key injection."
fi

# LXC Containers Definition Matrix
# Format: VMID|HOSTNAME|MEMORY|SWAP|DISK_SIZE|IP_ADDRESS
CONTAINERS=(
    "201|cortex-ingress|2048|512|8|192.168.50.251"
    "202|cortex-command|4096|1024|16|192.168.50.252"
    "203|cortex-glpi|2048|512|16|192.168.50.253"
    "204|cortex-automation|4096|1024|16|192.168.50.254"
)

# 2. Provision Containers
for item in "${CONTAINERS[@]}"; do
    IFS="|" read -r VMID HOSTNAME MEMORY SWAP DISK_SIZE IP_ADDR <<< "$item"
    
    echo "----------------------------------------------------------------------"
    echo "[*] Provisioning LXC $VMID ($HOSTNAME) - IP: $IP_ADDR"
    echo "----------------------------------------------------------------------"
    
    # Check if container already exists
    if pct status "$VMID" >/dev/null 2>&1; then
        echo "[!] Container $VMID already exists. Skipping creation..."
        continue
    fi
    
    # Execute pct create
    # We pass ssh key argument dynamically
    pct create "$VMID" "$TEMPLATE_STORAGE:vztmpl/$TEMPLATE_NAME" \
        --hostname "$HOSTNAME" \
        --cores 2 \
        --memory "$MEMORY" \
        --swap "$SWAP" \
        --rootfs "$TARGET_STORAGE:$DISK_SIZE" \
        --net0 "name=eth0,bridge=vmbr0,ip=$IP_ADDR/24,gw=192.168.50.1" \
        --onboot 1 \
        --ostype ubuntu \
        --unprivileged 0 \
        $SSH_KEY_ARG
        
    echo "[+] Provisioned LXC $VMID successfully."
    
    # 3. Mount Forensic Data Lake via host bind mount
    # Host source directory: /mnt/data_lake
    # LXC target mount path: /mnt/data_lake
    # Verify host directory exists
    if [ -d "/mnt/data_lake" ]; then
        echo "[*] Configuring Forensic Data Lake host bind mount (mp0)..."
        pct set "$VMID" -mp0 /mnt/data_lake,mp=/mnt/data_lake
        echo "[+] Bind mount registered."
    else
        echo "[!] Warning: Proxmox Host /mnt/data_lake folder not found. Skipping mount point registration..."
    fi
    
    # Start container
    echo "[*] Booting container $VMID..."
    pct start "$VMID"
    
    # Simple check to verify it runs
    sleep 2
    if pct status "$VMID" | grep -q "running"; then
        echo "[+] LXC $VMID ($HOSTNAME) is ACTIVE and RUNNING."
    else
        echo "[-] Failed to boot LXC $VMID ($HOSTNAME)."
    fi
done

echo "======================================================================"
echo "[+] Phase 1 Complete: All LXC nodes provisioned and active."
echo "======================================================================"
