#!/bin/bash
# CORTEX: DASHBOARD DEPLOYMENT SCRIPT
# Version: 1.1.0 (v2 Unified)
# Path: /opt/cortex/deploy_dashboard.sh

PROJECT_ROOT="/opt/cortex"
DASHBOARD_PATH="${PROJECT_ROOT}/infrastructure/viki/services/dashboard-react"

echo "--- CORTEX: 3D NEURAL-CORE DEPLOYMENT ---"

# 1. Update Source
echo "[*] Pulling latest changes from GitHub..."
cd $PROJECT_ROOT
git pull origin main

# 2. Build & Deploy
echo "[*] Rebuilding Dashboard container..."
cd $DASHBOARD_PATH
docker compose build --no-cache dashboard
docker compose up -d dashboard

# 3. Validation
echo "[*] Verifying deployment..."
if [ "$(docker inspect -f '{{.State.Running}}' viki-dashboard-react)" == "true" ]; then
    echo "[+] SUCCESS: 3D Neural-Core is live at https://rmmservice.co.za"
else
    echo "[!] FAILURE: Dashboard container failed to start!"
    exit 1
fi

echo "--- DEPLOYMENT COMPLETE ---"
