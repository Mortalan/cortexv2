# CORTEX LAB: EXECUTION TRACKER

## CURRENT STATUS
- **Lab Node:** VIKI (10.0.0.240)
- **Access:** root@10.0.0.240 (SSH)
- **Hardware:** Ryzen 7 5700 / RTX 4060 / 4TB HDD
- **Path:** /opt/cortex/ (Unified v2 Structure)
- **GitHub:** https://github.com/Mortalan/cortexv2
- **Services Map (v2 Initialized):**
    - Dashboard (React 19): https://rmmservice.co.za/ (ACTIVE - AI Alerting Live)
    - NetLock RMM: https://rmm.rmmservice.co.za/ (ACTIVE)
    - Velociraptor EDR: https://edr.rmmservice.co.za/ (ACTIVE - Custom Artifacts Deployed)
    - n8n Automation: https://automation.rmmservice.co.za/ (ACTIVE - Triage v1 Live)
    - GLPI Ticketing: https://glpi.rmmservice.co.za/ (ACTIVE)
    - Authelia Identity: https://auth.rmmservice.co.za/ (ACTIVE)
    - MinIO S3: https://s3.rmmservice.co.za/ (ACTIVE)
    - Ollama AI: http://viki-ollama:11434/ (v0.3.4 - INTEGRATED with n8n)
    - WireGuard Tunnel: (ACTIVE)
    - Traefik Ingress: (ACTIVE)
- **Data Lake:** /mnt/data_lake (BTRFS)
- **Phase:** PHOENIX PROTOCOL v2 COMPLETE -> **INTELLIGENT TELEMETRY ACTIVE**

## THE 11-PHASE BLUEPRINT (v1 ARCHIVE)
1.  [x] Phase 1-11 COMPLETE.

## CORTEX v2 MILESTONES
10. [x] **Autonomous Playbooks** (Reflex API + Isolate Playbook)
1. [x] **Nuclear Wipe & Filesystem Purge** (Legacy Cleanup)
2. [x] **Unified Scaffold** (/opt/cortex/)
3. [x] **Unified Secrets** (/opt/cortex/.env)
4. [x] **Core Ingress & Identity** (Traefik + Authelia + GLPI)
5. [x] **Secondary Service Migration** (NetLock, Velociraptor, n8n)
6. [x] **Next-Gen Dashboard** (React 19 + Topology Monitor)
7. [x] **AI Telemetry Pipe** (n8n + Ollama v0.3.4 + Llama3)
8. [x] **EDR Telemetry Automation** (VQL Forwarding + n8n Triage)
9. [x] **Visual Triage Feedback** (Dashboard Critical Alerts)

## NEXT IMMEDIATE STEP
**Phase 14: Forensic Data Lake Expansion.**
- Implement automated NIST 2.0 compliance reporting.
- Aggregating Forensic Lake data for monthly security posture reviews.

## MANUAL INTERVENTION REQUIRED
1. **Load Artifacts:** Execute `/opt/cortex/infrastructure/viki/deploy_artifacts.sh` on VIKI.
2. **Enable Client Monitoring:** In Velociraptor GUI, go to "Server Events" and ensure `Cortex.Triage.Forwarder` is active. Then, go to "Client Events" and add `Cortex.Hunter.SuspiciousProcess` to the default monitoring group.
3. **Deploy Dashboard:** Execute `/opt/cortex/deploy_dashboard.sh` to apply the new React 19 alert components.

---
*Last Updated: Tuesday, 12 May 2026 (Final Update)*
