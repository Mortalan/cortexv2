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
    DATE_STR=$(date +"%Y_%m")
    
    sudo cp "$REPORTS_DIR/cortex_monthly_report.docx" "$DATA_LAKE_REPORTS/monthly_report_pr_vip_${DATE_STR}.docx"
    sudo cp "$REPORTS_DIR/cortex_monthly_report.pdf" "$DATA_LAKE_REPORTS/monthly_report_pr_vip_${DATE_STR}.pdf"
    
    sudo chmod 777 "$DATA_LAKE_REPORTS"/*
    echo "[+] SUCCESS: Reports compiled and synced to Forensic Data Lake:"
    echo "    - $DATA_LAKE_REPORTS/monthly_report_pr_vip_${DATE_STR}.docx"
    echo "    - $DATA_LAKE_REPORTS/monthly_report_pr_vip_${DATE_STR}.pdf"
else
    echo "[!] FAILURE: Report compilation failed. Check system logs."
    exit 1
fi

echo "--------------------------------------------------------"
