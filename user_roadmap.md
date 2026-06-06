# CORTEX: USER ROADMAP & ARCHITECTURAL BLUEPRINT
## [VERSION 1.5] - STATUS DASHBOARD & REFERENCE INDEX

> [!NOTE]
> Detailed technical specifications for each roadmap category have been split into modular files under `docs/roadmap/` to optimize context token usage.
> Full backup of original roadmap: [/home/louis/cortex/archive/backup_20260603/user_roadmap.md](file:///home/louis/cortex/archive/backup_20260603/user_roadmap.md)

---

## 1. MILESTONE STATUS TRACKING

| Category | Technical Specification | Current Status |
| :--- | :--- | :--- |
| **1. Identity & Dashboards** | [1_identity_dashboards.md](file:///home/louis/cortex/docs/roadmap/1_identity_dashboards.md) | **STABLE & VERIFIED** |
| **2. Permissions Matrix** | [2_permissions_matrix.md](file:///home/louis/cortex/docs/roadmap/2_permissions_matrix.md) | **STABLE & VERIFIED** |
| **3. Web QC Scanner** | [3_qc_scanner.md](file:///home/louis/cortex/docs/roadmap/3_qc_scanner.md) | **STABLE & VERIFIED** |
| **4. Outlook Calendar Integration** | [4_outlook_integration.md](file:///home/louis/cortex/docs/roadmap/4_outlook_integration.md) | **PLANNING (Phase 20)** |
| **5. Architectural Considerations** | [5_architectural_considerations.md](file:///home/louis/cortex/docs/roadmap/5_architectural_considerations.md) | **IN PROGRESS** |
| **6. Overtime Tracker & GLPI Sync** | [6_overtime_system.md](file:///home/louis/cortex/docs/roadmap/6_overtime_system.md) | **PLANNING (Phase 21)** |
| **7. Security & Integrity Protocols** | [7_security_protocols.md](file:///home/louis/cortex/docs/roadmap/7_security_protocols.md) | **IN PROGRESS (Kill Switch: Phase 22)** |
| **8. Decentralized LXC Transition** | See [LAB_LOG.md](file:///home/louis/cortex/docs/LAB_LOG.md) | **COMPLETED (Phase 19)** |
| **9. In-Depth SEO Scanner** | [seoscan.md](file:///home/louis/cortex/seoscan.md) | **STABLE & VERIFIED (Phase 23)** |
| **10. Comprehensive Website Auditor** | [webaudit.md](file:///home/louis/cortex/webaudit.md) | **STABLE & VERIFIED (Phase 24)** |
| **11. Standalone SPIDER Crawler** | [docs/SPIDER_BOARD_PROPOSAL.md](file:///home/louis/cortex/docs/SPIDER_BOARD_PROPOSAL.md) / [docs/SPIDER_ROADMAP.md](file:///home/louis/cortex/docs/SPIDER_ROADMAP.md) | **STABLE & VERIFIED (Phase 25)** |

---

## 2. DYNAMIC WORKFLOW HIGHLIGHT

*   **Single Source of Truth (SSoT):** Microsoft 365 Outlook is target SSoT for active calendars.
*   **Legacy Port Consolidation:** Deprecating PostgreSQL and C# .NET core container sprawl by migrating Overtime system logic directly into FastAPI and React.
*   **Security Isolation:** The newly deployed 4-node LXC cluster allows granular access policies and physical container boundaries.

---
*Last Updated: Saturday, 06 June 2026*
*Author: Antigravity Architect Mode*
