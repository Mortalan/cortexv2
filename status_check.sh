#!/bin/bash
# CORTEX Service Status Generator
STATUS_DIR="/opt/cortex"
STATUS_FILE="$STATUS_DIR/status.json"

mkdir -p "$STATUS_DIR"

echo "{" > "$STATUS_FILE"
echo "  \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"," >> "$STATUS_FILE"
echo "  \"services\": [" >> "$STATUS_FILE"

services=(
  "viki-dashboard-react|Dashboard"
  "netlock-rmm-web-console|NetLock RMM"
  "velociraptor|Velociraptor"
  "n8n-automation|n8n"
  "glpi|GLPI"
  "authelia|Authelia"
  "viki-minio|MinIO"
  "192.168.50.242:11434|Ollama AI"
  "reflex-daemon|Reflex Engine"
  "hermes-agent|Hermes Agent"
)

for i in "${!services[@]}"; do
  IFS="|" read -r identifier name <<< "${services[$i]}"
  
  if [[ "$identifier" == *":"* ]]; then
    # Perform TCP port check for remote service
    IFS=":" read -r ip port <<< "$identifier"
    if timeout 1 bash -c "</dev/tcp/$ip/$port" 2>/dev/null; then
      status="online"
    else
      status="offline"
    fi
  else
    # Perform Docker check for local container
    state=$(docker inspect -f "{{.State.Status}}" "$identifier" 2>/dev/null || echo "offline")
    if [ "$state" == "running" ]; then
      status="online"
    else
      status="offline"
    fi
  fi
  
  echo "    {\"name\": \"$name\", \"status\": \"$status\"}$( [ $i -lt $((${#services[@]} - 1)) ] && echo "," )" >> "$STATUS_FILE"
done

echo "  ]" >> "$STATUS_FILE"
echo "}" >> "$STATUS_FILE"


