# CORTEX: CHANGELOG
## [MAY 2026]

### 21 MAY 2026 - NETLOCK WEB CONSOLE DIAGNOSTICS & VIKI PREPARATION
- **NetLock Certificate Restoration:** Substituted fragile symlinks in remote `/home/netlock/certificates/` with direct copies of the production wild-card certificates (`dummy.pfx` and `cortex_dummy.pfx`), decryptable under password `"dummy"`.
- **Members Portal Sync Bypass:** Integrated `MembersPortal__SkipSync=true` environment parameters for `netlock-rmm-server`, bypassing 429 API rate limits that crashed the backend service loop.
- **Deobfuscated Config Discovery:** Traced custom validation routines in `NetLock_RMM_Web_Console.dll` to find undocumented configuration keys (`cert_path`, `cert_password`, `certificates_path`, and `certificates_password`) checked at the root level, explaining the console's container exit loop.
- **Handoff Documentation:** Prepared the CORTEX roadmap, lab logs, and artifacts for the next agent session.

### 20 MAY 2026 - EMERGENCY INGRESS & GATEWAY STABILIZATION (MOLE RUN)
- **NetLock RMM Core Stability:** Injected missing `AllowPublicKeyRetrieval=True` MySQL parameters, bypass options, and dual environment variables to bypass strict boot validation and C# binding flaws. Resolved 404/502 Gateway crashes.
- **Velociraptor EDR Restoration:** Removed `authelia@docker` middleware wrapper from Velociraptor to resolve the 401 loop caused by double-wrapping native basic authentication.
- **Ollama AI Proxying:** Deployed a file provider configuration (`dynamic/ollama.yml`) to correctly route external LLM requests through Traefik to `192.168.50.242:11434`, fixing the 404 API connection error.
- **WireGuard UX Fix:** Programmed clean `"disabled"` state parameters inside `App.tsx` and custom `onClick` logic calling `e.preventDefault()`, resolving React security JS-blocking errors on standard browser events.
- **Traefik Route Cleanup:** Appended trailing slash to the Traefik dashboard link inside React state, and disabled the obsolete legacy HTML dashboard container labels to resolve route conflict overlaps.

### 20 MAY 2026 - SOVEREIGN CONTROL & ACTIVE MITIGATION CONSOLE (PHASE 16.2)
- **Reflex Daemon Route Alignment:** Refactored daemon endpoint controls (`/mode` and `/playbook`) to `/api/mode` and `/api/playbook` to ensure structural alignment with Traefik reverse proxy and the dashboard UI.
- **Python Type Annotations:** Enhanced `reflex_daemon.py` codebase integrity by declaring strict type hints on all helper and route handler functions.
- **Real-time Synchronization:** Built state broadcasting (`MODE_CHANGE` payload) into WebSocket streams to instantly update connected dashboard HUDs when changing security states.
- **Active Response HUD Overlay:** Built the **Active Mitigation Console** React component featuring a custom glassmorphic layout. Enabled administrators to trigger system lockdown (Standard Ops vs Reflex Mode) and run isolation playbooks (`Windows.Remediation.Quarantine`) against specific client targets.
- **TypeScript Strict Typing:** Replaced all `any` and `any[]` declarations in dashboard telemetry, status, and alert listeners with strict `TelemetryEvent`, `Alert`, and `ServiceStatus` interfaces.

### 20 MAY 2026 - PROCEDURAL 3D INTERACTION & GLASSMORPHIC HUD (PHASE 15.3 & 16.1 REFINEMENTS)
- **3D Avatar:** Implemented custom `@react-three/fiber` priority-based render updates to prevent the base idle sway animation from overriding procedural bones. Added manual `threeState.gl.render` callback execution inside `useFrame(..., 1)`.
- **Procedural Animations:** Programmed interactive head and neck tracking (`CC_Base_Head_039`/`CC_Base_NeckTwist01_037`) dynamically tracking mouse cursor coordinates, chest expansion breathing cycles (`CC_Base_Spine02_036`), and state-driven conversational nodding (idle/thinking/speaking).
- **Proportions & Framing:** Re-engineered spatial properties to primitive scale `1.5`, Y-anchor `-3.1`, and camera coordinate `[0, 0.0, 6.2]`. Centered and enlarged Viki to float transparently in the sidebar without cropping or clipping boundaries.
- **Diagnostics HUD:** Integrated host performance progress metrics (CPU, RAM, SSD) alongside service latency grids fluctuating in real-time.
- **HUD Layout:** Re-arranged Diagnostics and Telemetry log streams side-by-side inside a flattened, glassmorphic layout grid, ensuring zero viewport scrollbars.

### 20 MAY 2026 - REAL-TIME TELEMETRY HUD (PHASE 16.1)
- **API:** Upgraded Reflex Daemon with WebSocket support (`flask-sock`) and the `/api/telemetry` ingestion endpoint.
- **Sinks:** Configured Vector sinks (`vector_normal.yaml`/`vector_reflex.yaml`) to stream threat events.
- **UI:** Designed a glassmorphic Cyber Telemetry HUD overlay in the dashboard.
- **3D Canvas:** Integrated dynamic canvas lighting and fog responding to `CRITICAL` telemetry in real-time.

### 20 MAY 2026 - ANTIGRAVITY CLI TRANSITION PREP
- **Tooling:** Documented transition path from Gemini CLI to Antigravity CLI (`agy`).
- **Docs:** Updated `CORTEX_MAP.md` and `CORTEX_MASTER_DOC.md` with new startup protocols.
- **Migration:** Created `docs/MIGRATION_AGY.md` with installation and import instructions.
- **Status:** Project is ready for seamless toolset switch.

### 20 MAY 2026 - COGNITIVE DIALOGUE (PHASE 15.4)
- **UI:** Implemented `VikiChat.tsx` component in the Dashboard sidebar.
- **AI:** Established secure API proxy for Ollama via Traefik at `/api/viki/`.
- **Memory:** Integrated Ollama `/api/chat` for contextual conversation persistence.
- **Animation:** Synchronized chat states (Thinking/Speaking) with 3D Avatar animations.
- **Verification:** Verified successful production build of Dashboard.

### 20 MAY 2026 - COGNITIVE INTEGRATION REFINEMENT
- **UI:** Refactored Dashboard layout to include a full-height fixed sidebar for VIKI.
- **Animation:** Added floating and sway logic to `VikiAvatarRenderer.tsx` via `useFrame`.
- **Context:** Updated `viki_sync.py` to synchronize all files in `docs/` and `CORTEX_MAP.md`.
- **Security:** Integrated Admin-only visibility for the 3D Avatar interface.
- **Roadmap:** Defined Phase 15.4: Cognitive Dialogue for upcoming session.

### 19 MAY 2026 - ARCHITECTURAL REFACTOR
- **Modularized Docs:** Split monolithic files into `/docs` (INFRA, INTEL, SEC_OPS, LAB_LOG).
- **Session Protocol:** Established "End of Session" synchronization protocol.
- **Cleanup:** Moved legacy files to `/archive`.
- **Map:** Created `CORTEX_MAP.md` as primary entry point.

### 18 MAY 2026 - RECOVERY
- Resolved NetLock restart loop.
- Restored LLDAP/Authelia identity stack.
- Expanded LAKE-102 storage.
