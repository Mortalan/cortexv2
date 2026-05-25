#!/bin/bash
# CORTEX: AUTOMATED REPORTING PIPELINE ORCHESTRATOR
# Version: 1.0.0

REPORTS_DIR="/opt/cortex/reports"
DATA_LAKE_REPORTS="/mnt/data_lake/reports"

echo "--------------------------------------------------------"
echo "CORTEX: INITIATING CUSTOM REPORTING PIPELINE"
echo "--------------------------------------------------------"

# 1. Dependency Verification & Installation
echo "[*] Checking python-docx library..."
if ! python3 -c "import docx" 2>/dev/null; then
    echo "[*] python-docx not found. Installing now..."
    sudo pip3 install python-docx --break-system-packages
else
    echo "[+] python-docx is already installed."
fi

# 2. Re-establish Directories
echo "[*] Ensuring output directories exist..."
mkdir -p "$REPORTS_DIR"
sudo mkdir -p "$DATA_LAKE_REPORTS"
sudo chmod -R 777 "$DATA_LAKE_REPORTS"

# 3. Trigger Report Generation
echo "[*] Compiling DOCX and headlessly converting to PDF..."
python3 /opt/cortex/infrastructure/viki/services/reporting/cortex_reporter.py

# 4. Copy to Data Lake Reports Ingress
if [ -f "$REPORTS_DIR/cortex_monthly_report.pdf" ]; then
    echo "[*] Syncing compiled reports to Forensic Data Lake..."
    
    # Extract settings from spec if exists
    if [ -f "/tmp/viki_report_spec.json" ]; then
        CLIENT_NAME=$(jq -r '.client_name // "PR VIP"' /tmp/viki_report_spec.json)
        # Parse month and year using inline python
        DATE_STR=$(python3 -c "
import json, re, datetime
try:
    with open('/tmp/viki_report_spec.json') as f:
        spec = json.load(f)
    dr = spec.get('date_range', '')
    match = re.search(r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})', dr, re.I)
    if match:
        m, y = match.groups()
        d = datetime.datetime.strptime(m.capitalize(), '%B')
        print(f'{y}_{d.month:02d}')
    else:
        print(datetime.datetime.now().strftime('%Y_%m'))
except Exception:
    print(datetime.datetime.now().strftime('%Y_%m'))
")
    else
        CLIENT_NAME="PR VIP"
        DATE_STR=$(date +"%Y_%m")
    fi
    
    # Clean client name slug
    CLIENT_SLUG=$(echo "$CLIENT_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g' | sed 's/__*/_/g' | sed 's/^_//;s/_$//')
    
    sudo cp "$REPORTS_DIR/cortex_monthly_report.docx" "$DATA_LAKE_REPORTS/monthly_report_${CLIENT_SLUG}_${DATE_STR}.docx"
    sudo cp "$REPORTS_DIR/cortex_monthly_report.pdf" "$DATA_LAKE_REPORTS/monthly_report_${CLIENT_SLUG}_${DATE_STR}.pdf"
    
    sudo chmod 777 "$DATA_LAKE_REPORTS"/*
    echo "[+] SUCCESS: Reports compiled and synced to Forensic Data Lake:"
    echo "    - $DATA_LAKE_REPORTS/monthly_report_${CLIENT_SLUG}_${DATE_STR}.docx"
    echo "    - $DATA_LAKE_REPORTS/monthly_report_${CLIENT_SLUG}_${DATE_STR}.pdf"
else
    echo "[!] FAILURE: Report compilation failed. Check system logs."
    exit 1
fi

echo "--------------------------------------------------------"
