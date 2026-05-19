#!/bin/bash
# CORTEX: Phase 15.1 - AI Hub & Forensic Lake Integration
# Objective: Migrate Ollama model storage from local disk to NFS-mounted 4TB Data Lake.
# Target: AI-101 (192.168.50.242)

set -e

# Configuration
LAKE_IP="192.168.50.243"
MOUNT_POINT="/mnt/data_lake"
COMPOSE_PATH="/opt/cortex/infrastructure/viki/docker-compose.yml"

echo "--------------------------------------------------------"
echo "CORTEX: MIGRATING OLLAMA TO FORENSIC LAKE"
echo "--------------------------------------------------------"

# 1. Install NFS dependencies
echo "[*] Ensuring nfs-common is installed..."
if ! dpkg -l | grep -q nfs-common; then
    sudo apt-get update -q && sudo apt-get install -y nfs-common -q
fi

# 2. Stop Ollama
echo "[*] Stopping Ollama container..."
sudo docker compose -f "$COMPOSE_PATH" stop ollama

# 3. Prepare Mount Point
echo "[*] Preparing mount point: $MOUNT_POINT..."
if [ -d "$MOUNT_POINT" ]; then
    if [ "$(ls -A $MOUNT_POINT)" ]; then
        if mountpoint -q "$MOUNT_POINT"; then
            echo "[!] $MOUNT_POINT is already a mountpoint."
        else
            echo "[!] $MOUNT_POINT is not empty. Backing up to ${MOUNT_POINT}_local..."
            sudo mv "$MOUNT_POINT" "${MOUNT_POINT}_local"
            sudo mkdir -p "$MOUNT_POINT"
        fi
    fi
else
    sudo mkdir -p "$MOUNT_POINT"
fi

# 4. Mount NFS
echo "[*] Mounting NFS share from Lake-102 ($LAKE_IP)..."
sudo mount -t nfs "$LAKE_IP:$MOUNT_POINT" "$MOUNT_POINT"

# 5. Persist Mount in /etc/fstab
if ! grep -q "$LAKE_IP:$MOUNT_POINT" /etc/fstab; then
    echo "[*] Adding mount to /etc/fstab for persistence..."
    echo "$LAKE_IP:$MOUNT_POINT $MOUNT_POINT nfs defaults,timeo=900,retrans=5,_netdev 0 0" | sudo tee -a /etc/fstab
fi

# 6. Migrate Data
echo "[*] Migrating model data to Lake storage..."
sudo mkdir -p "$MOUNT_POINT/ollama"
if [ -d "${MOUNT_POINT}_local/ollama" ]; then
    echo "[*] Copying existing models from local storage..."
    sudo cp -rv "${MOUNT_POINT}_local/ollama/." "$MOUNT_POINT/ollama/"
    echo "[*] Data migrated. Keeping local backup at ${MOUNT_POINT}_local."
fi

# 7. Restart Ollama
echo "[*] Restarting Ollama with Lake storage..."
sudo docker compose -f "$COMPOSE_PATH" up -d ollama

echo "[+] SUCCESS: Phase 15.1 Complete. Ollama models now reside on the 4TB Forensic Lake."
echo "--------------------------------------------------------"
