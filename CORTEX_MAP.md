# CORTEX: SYSTEM MAP & INDEX
## [VERSION 2.1 - MAY 2026] - ANTIGRAVITY TRANSITION

### **SESSION STARTUP COMMAND (ANTIGRAVITY CLI)**
> "agy: Initialize CORTEX Architect Mode. Load CORTEX_MAP.md and continue with the next phase. Do not read unrelated files."

---

## 1. SYSTEM STATUS SUMMARY
- **Primary Node (VIKI):** 192.168.50.240 (Proxmox 9.x) - **ACTIVE**
- **Gateway (HAProxy):** 192.168.50.239 - **ACTIVE**
- **Core (NetLock/Identity):** 192.168.50.241 - **STABLE/LICENSED** (RMM Server is ONLINE; Web Console diagnosed and pending certificate key configuration)
- **AI (Intelligence):** 192.168.50.242 - **ACTIVE**
- **Lake (Forensics):** 192.168.50.243 - **ACTIVE**
- **Interface (VIKI Chat):** Integrated with Ollama & 3D Avatar - **ACTIVE**
- **Tooling:** Transitioning to **Antigravity CLI (agy)** - **IN PROGRESS**

---

## 2. DOCUMENTATION INDEX (SURGICAL ACCESS)
| Domain | File Path | Scope |
| :--- | :--- | :--- |
| **Infrastructure** | `docs/INFRA.md` | NetLock, HAProxy, Core-100, Network Topology. |
| **Intelligence** | `docs/INTEL.md` | VIKI, Ollama, n8n, 3D Avatar Spec. |
| **Security Ops** | `docs/SEC_OPS.md` | Reflex Daemon, Velociraptor, Forensics, NIST 2.0. |
| **Execution Lab** | `docs/LAB_LOG.md` | Current Phase, Atomic Steps, and Progress Tracker. |
| **Change History** | `docs/CHANGELOG.md` | Version history and session summaries. |
| **Migration** | `docs/MIGRATION_AGY.md` | Notes on Gemini CLI -> Antigravity migration. |

---

## 3. NEXT PHASE: NETLOCK & VIKI STABILIZATION
- **Goal:** Finish resolving the NetLock Web Console boot error using newly discovered certificate configuration keys and deploy the Viki premium kinetic animations.
- **Next Step:** 
  1. Map `cert_path`, `cert_password`, `certificates_path`, and `certificates_password` root keys in `appsettings.json` and Docker Compose overrides to bind the verified certificates.
  2. Implement eye tracking, clavicle breathing, hello wave, and security jolt animations in `VikiAvatarRenderer.tsx`.

---
*Last Updated: Thursday, 21 May 2026 (Diagnostic findings on NetLock Web Console boot checks)*
