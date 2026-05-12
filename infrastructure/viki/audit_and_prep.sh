#!/bin/bash
# CORTEX GOLDEN IMAGE PREP & SECURITY AUDIT
# Version: 1.0.0

echo "--- CORTEX: THE NERVOUS SYSTEM SECURITY AUDIT ---"

# 1. Container Status
echo "[*] Checking container health..."
docker ps --format "table {{.Names}}\t{{.Status}}" | grep "Up" || echo "[!] WARNING: Some containers are down!"

# 2. MFA Verification
echo "[*] Verifying Traefik-Authelia Middleware labels (v2)..."
for svc in glpi velociraptor n8n-automation; do
    docker inspect $svc --format="{{json .Config.Labels}}" | grep "traefik.http.routers.*.middlewares\":\"authelia@docker\"" > /dev/null
    if [ $? -eq 0 ]; then
        echo "[+] SUCCESS: $svc protected by Authelia MFA."
    else
        echo "[!] FAILURE: $svc MFA middleware missing!"
    fi
done

# 3. Reflex Mode Check
echo "[*] Verifying Reflex Daemon state..."
if [ -f "/mnt/data_lake/logs/reflex_state.json" ]; then
    cat /mnt/data_lake/logs/reflex_state.json
    echo ""
    echo "[+] SUCCESS: Reflex state file found."
else
    echo "[!] FAILURE: Reflex state file missing!"
fi

# 4. Storage Integrity
echo "[*] Checking BTRFS Data Lake mount..."
mount | grep "/mnt/data_lake" > /dev/null
if [ $? -eq 0 ]; then
    echo "[+] SUCCESS: Data Lake mounted."
else
    echo "[!] FAILURE: Data Lake NOT mounted!"
fi

# 5. Cleanup (Preparation for Snapshot)
echo "[*] Cleaning up temporary logs and caches..."
rm -rf /mnt/data_lake/logs/traefik/*
docker system prune -f

echo "--- AUDIT COMPLETE ---"
