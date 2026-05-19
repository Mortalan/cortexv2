# CORTEX: CHANGELOG
## [MAY 2026]

### 19 MAY 2026 - ARCHITECTURAL REFACTOR
- **Modularized Docs:** Split monolithic files into `/docs` (INFRA, INTEL, SEC_OPS, LAB_LOG).
- **Session Protocol:** Established "End of Session" synchronization protocol.
- **Cleanup:** Moved legacy files to `/archive`.
- **Map:** Created `CORTEX_MAP.md` as primary entry point.

### 18 MAY 2026 - RECOVERY
- Resolved NetLock restart loop.
- Restored LLDAP/Authelia identity stack.
- Expanded LAKE-102 storage.
