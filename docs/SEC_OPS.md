# CORTEX: SECURITY OPERATIONS & FORENSICS
## [VERSION 2.0]

### 1. AUTONOMOUS RESPONSE
- **Engine:** Reflex Daemon (Port 9090)
- **Modes:** 
    - **Active:** Full management and monitoring.
    - **Reflex:** (Default on failure) Host isolation and log queuing.
- **Validation:** `simulate_breach.sh` verified for Mimikatz detection.

### 2. THREAT HUNTING
- **EDR:** Velociraptor
- **Telemetry:** Vector (Aggregator on Port 5140)
- **Sink:** Lake (Forensics) + n8n (Triage).

### 3. COMPLIANCE & BACKUPS
- **Frameworks:** NIST 2.0, POPIA.
- **Reporting:** `compliance_report.py` (VQL-based).
- **Backups:** Bareos (Wasabi) + Restic (B2).
