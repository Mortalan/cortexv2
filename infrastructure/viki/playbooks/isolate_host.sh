#!/bin/bash
# CORTEX PLAYBOOK: ISOLATE HOST
# Target: Client ID
CLIENT_ID=$1

if [ -z "$CLIENT_ID" ]; then
    echo "Error: No Client ID provided."
    exit 1
fi

echo "[!] Incident Response: Isolating Host $CLIENT_ID..."

# Trigger Velociraptor Quarantine
# Note: We use docker exec to talk to the neighboring container
docker exec velociraptor ./velociraptor --config /velociraptor/server.config.yaml artifacts collect Windows.Remediation.Quarantine --args Target=$CLIENT_ID

if [ $? -eq 0 ]; then
    echo "[+] Success: Isolation artifact scheduled for $CLIENT_ID."
else
    # Fallback to Linux quarantine if Windows fails or if we want to be safe
    docker exec velociraptor ./velociraptor --config /velociraptor/server.config.yaml artifacts collect Linux.Remediation.Quarantine --args Target=$CLIENT_ID
fi
