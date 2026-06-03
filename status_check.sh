#!/bin/bash
# CORTEX Service Status Generator
# CORTEX Service Status Generator (Decentralized Multi-Node Edition)
STATUS_DIR="/opt/cortex"
STATUS_FILE="$STATUS_DIR/status.json"

mkdir -p "$STATUS_DIR"

echo "{" > "$STATUS_FILE.tmp"
echo "  \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"," >> "$STATUS_FILE.tmp"
echo "  \"services\": [" >> "$STATUS_FILE.tmp"

# Matrix of checks:
# Format: type|identifier|param|[name]
# Types: 
#   local -> checks local docker container state (param is display name)
#   tcp -> checks remote TCP port ip:port (param is display name)
#   http -> checks HTTP endpoint url with host header (param is host header, name is display name)
services=(
  "local|viki-dashboard-react|Dashboard"
  "tcp|192.168.50.241:8082|NetLock RMM"
  "local|velociraptor|Velociraptor"
  "tcp|192.168.50.254:5678|n8n"
  "tcp|192.168.50.253:80|GLPI"
  "http|http://192.168.50.251/|auth.rmmservice.co.za|Authelia"
  "local|viki-minio|MinIO"
  "tcp|192.168.50.242:11434|Ollama AI"
  "local|reflex-daemon|Reflex Engine"
  "local|hermes-agent|Hermes Agent"
)

for i in "${!services[@]}"; do
  IFS="|" read -r type identifier param name <<< "${services[$i]}"
  
  status="offline"
  if [ -z "$name" ]; then
    name="$param"
  fi
  
  if [ "$type" == "local" ]; then
    # Perform Docker check for local container
    state=$(docker inspect -f "{{.State.Status}}" "$identifier" 2>/dev/null || echo "offline")
    if [ "$state" == "running" ]; then
      status="online"
    fi
  elif [ "$type" == "tcp" ]; then
    # Perform TCP port check
    IFS=":" read -r ip port <<< "$identifier"
    if timeout 1 bash -c "</dev/tcp/$ip/$port" 2>/dev/null; then
      status="online"
    fi
  elif [ "$type" == "http" ]; then
    # Perform HTTP check with Host header
    code=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: $param" -k "$identifier" || echo "500")
    if [ "$code" == "200" ] || [ "$code" == "302" ]; then
      status="online"
    fi
  fi
  
  echo "    {\"name\": \"$name\", \"status\": \"$status\"}$( [ $i -lt $((${#services[@]} - 1)) ] && echo "," )" >> "$STATUS_FILE.tmp"
done

echo "  ]" >> "$STATUS_FILE.tmp"
echo "}" >> "$STATUS_FILE.tmp"

mv "$STATUS_FILE.tmp" "$STATUS_FILE"


