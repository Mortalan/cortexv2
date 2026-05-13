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
  "netlock-rmm-server|NetLock RMM"
  "velociraptor|Velociraptor"
  "n8n-automation|n8n"
  "glpi|GLPI"
  "authelia|Authelia"
  "viki-minio|MinIO"
  "viki-ollama|Ollama AI"
  "reflex-daemon|Reflex Engine"
)


for i in "${!services[@]}"; do
  IFS="|" read -r container name <<< "${services[$i]}"
  state=$(docker inspect -f "{{.State.Status}}" "$container" 2>/dev/null || echo "offline")
  
  if [ "$state" == "running" ]; then
    status="online"
  else
    status="offline"
  fi
  
  echo "    {\"name\": \"$name\", \"status\": \"$status\"}$( [ $i -lt $((${#services[@]} - 1)) ] && echo "," )" >> "$STATUS_FILE"
done

echo "  ]" >> "$STATUS_FILE"
echo "}" >> "$STATUS_FILE"

# Copy to dist for active deployment

