#!/bin/bash
# CORTEX: AI Triage Simulation Script
# Mimics a Velociraptor event being forwarded to n8n

WEBHOOK_URL="http://192.168.50.241:5678/webhook/89ecafed-8deb-4ed1-b2de-bbc526e25cb1/telemetry/triage"

echo "[*] Constructing synthetic threat telemetry..."

TEMP_PAYLOAD=$(mktemp)
cat <<'EOF' > "$TEMP_PAYLOAD"
{
  "source": "Velociraptor",
  "artifact": "Cortex.Hunter.SuspiciousProcess",
  "timestamp": "2026-05-18T14:30:00Z",
  "hostname": "TEST-ENDPOINT-01",
  "client_id": "C.1234567890abcdef",
  "data": {
    "ProcessName": "mimikatz.exe",
    "CommandLine": "mimikatz.exe privilege::debug sekurlsa::logonpasswords exit",
    "ParentProcess": "cmd.exe",
    "Username": "cortex_admin",
    "FilePath": "C:\\Users\\cortex_admin\\Downloads\\mimikatz.exe"
  }
}
EOF

echo "[*] Injecting telemetry into n8n Webhook..."
curl -X POST -H "Content-Type: application/json" -d @"$TEMP_PAYLOAD" "$WEBHOOK_URL"

rm "$TEMP_PAYLOAD"

echo -e "\n[+] Injection complete. Check Reflex Daemon logs for AI classification and Playbook execution."
