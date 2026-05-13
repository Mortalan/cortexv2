#!/bin/bash
# CORTEX: AI Triage Simulation Script
# Mimics a Velociraptor event being forwarded to n8n

WEBHOOK_URL="http://192.168.50.241:5678/webhook/triage"

echo "[*] Constructing synthetic threat telemetry..."

PAYLOAD=$(cat <<EOF
{
  "source": "Velociraptor",
  "artifact": "Cortex.Hunter.SuspiciousProcess",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
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
)

echo "[*] Injecting telemetry into n8n Webhook..."
curl -X POST -H "Content-Type: application/json" -d "$PAYLOAD" "$WEBHOOK_URL"

echo -e "\n[+] Injection complete. Check Reflex Daemon logs for AI classification and Playbook execution."
