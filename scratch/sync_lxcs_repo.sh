#!/bin/bash
# Sync CORTEX repository from workspace to all 4 LXC containers

set -euo pipefail

EXCLUDES=(
    --exclude='.git'
    --exclude='node_modules'
    --exclude='venv'
    --exclude='__pycache__'
    --exclude='.antigravitycli'
    --exclude='*.png'
    --exclude='*.jpg'
)

CONTAINERS=(
    "192.168.50.251"
    "192.168.50.252"
    "192.168.50.253"
    "192.168.50.254"
)

for ip in "${CONTAINERS[@]}"; do
    echo "=========================================================="
    echo "Syncing repository to $ip..."
    echo "=========================================================="
    ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o BatchMode=yes root@$ip "mkdir -p /opt/cortex"
    rsync -e "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" -avz "${EXCLUDES[@]}" /home/louis/cortex/ root@$ip:/opt/cortex/
done

echo "=========================================================="
echo "[+] Sync completed successfully for all containers."
echo "=========================================================="
