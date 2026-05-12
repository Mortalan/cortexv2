#!/bin/bash
# CORTEX: Local Hosts Sync Script (Pseudo-Production)
# Run this on your workstation to map rmmservice.co.za domains to the HAProxy gateway.

GATEWAY_IP="192.168.50.239"
DOMAINS=(
    "rmmservice.co.za"
    "auth.rmmservice.co.za"
    "glpi.rmmservice.co.za"
    "s3.rmmservice.co.za"
    "s3-console.rmmservice.co.za"
    "automation.rmmservice.co.za"
    "rmm.rmmservice.co.za"
    "edr.rmmservice.co.za"
    "cortex.rmmservice.co.za"
)

if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use sudo)"
   exit 1
fi

echo "[*] Updating CORTEX entries in /etc/hosts..."

# Remove old CORTEX entries (including legacy .local)
sed -i '/# CORTEX-START/,/# CORTEX-END/d' /etc/hosts

# Add new entries
{
    echo "# CORTEX-START"
    for domain in "${DOMAINS[@]}"; do
        echo "$GATEWAY_IP $domain"
    done
    echo "# CORTEX-END"
} >> /etc/hosts

echo "[+] SUCCESS: Hosts file updated."
echo "[*] You can now access the portal at: https://rmmservice.co.za"
