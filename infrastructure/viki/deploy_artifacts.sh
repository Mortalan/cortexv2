#!/bin/bash
# CORTEX: EDR ARTIFACT DEPLOYMENT SCRIPT
# Version: 1.0.0
# Purpose: Loads custom VQL artifacts into the Velociraptor server for automated triage.

PROJECT_ROOT="/opt/cortex"
ARTIFACTS_FILE="${PROJECT_ROOT}/infrastructure/viki/services/velociraptor/artifacts/cortex_artifacts.yaml"

echo "--- CORTEX: EDR ARTIFACT DEPLOYMENT ---"

# 1. Validation
if [ ! -f "$ARTIFACTS_FILE" ]; then
    echo "[!] FAILURE: Artifacts file not found at $ARTIFACTS_FILE"
    exit 1
fi

# 2. Check if Velociraptor is running
if ! docker ps | grep -q "velociraptor"; then
    echo "[!] FAILURE: Velociraptor container is not running!"
    exit 1
fi

# 3. Load Artifacts
echo "[*] Injecting VQL artifacts into Velociraptor..."
# Using /dev/stdin to pipe the multi-artifact YAML file
docker exec -i velociraptor ./velociraptor --config /velociraptor/server.config.yaml artifacts load < "$ARTIFACTS_FILE"

if [ $? -eq 0 ]; then
    echo "[+] SUCCESS: CORTEX artifacts loaded into server memory."
else
    echo "[!] FAILURE: Artifact injection failed."
    exit 1
fi

# 4. Verification
echo "[*] Verifying 'Cortex.' artifacts..."
docker exec velociraptor ./velociraptor --config /velociraptor/server.config.yaml artifacts list | grep "Cortex"

echo "--- DEPLOYMENT COMPLETE ---"
