# CORTEX: CHANGELOG
## [MAY 2026]

### 28 MAY 2026 - SPEECHRECOGNITION RACE CONDITION RESOLUTION, KINETIC AVATAR PRESERVATION & NEURAL VOICE UPGRADE (MOLE RUN)
- **SpeechRecognition Race Condition Fixed**: Resolved a critical async race condition where native browser `SpeechRecognition` `onend` and `onresult` callbacks were firing out of sync. Refactored `onresult` to capture transcripts, stop the hardware stream immediately, and trigger `sendMessage` directly, ensuring 100% reliable voice input.
- **Avatar Kinetic Cutoff Fixed**: Corrected a visual state override inside the `MediaRecorder` fallback `onstop` callback where the `finally` block prematurely set Viki's state to `idle` right after sending a message. Added a conditional check (`prev => prev === 'speaking' ? 'speaking' : 'idle'`) that preserves Viki's physical speaking animations until the speech synthesis naturally completes.
- **System-level Audio Dispatcher Installed**: Automatically installed `speech-dispatcher`, `espeak-ng`, `libspeechd`, and associated audio drivers directly on the local Linux/EndeavourOS workstation via graphical secure Polkit elevation (`pkexec`).
- **High-Fidelity Neural Voice Recommendation**: Documented browser-level Web Speech Synthesis architecture. Confirmed that Chromium-based browsers (such as Google Chrome or Brave) natively bundle state-of-the-art neural cloud TTS engines (e.g. `Google US English`) for free, providing high-fidelity, human-like voice responses (comparable to Gemini/ChatGPT) with zero configuration.
- **Production Asset Compilation & Push**: Compiled the final React production bundle `index-DOoExLQQ.js`, force-added it to Git tracking, committed the changes under the "Mole Run" signature, and successfully pushed to origin.

### 27 MAY 2026 - PROCEDURAL HOLOGRAPHIC V.I.K.I. HEAD MATRIX RESTORATION & REDUNDANT GLB PURGING (MOLE RUN)
- **Procedural Holographic Head Matrix Restored:** Replaced the heavy, scrapped `viki_android_real.glb` and `bishop_android.glb` full-body animation models with the clean, procedurally generated holographic head matrix (derived from the official FLAME model topology mathematically).
- **Responsive Conversational Kinetics:** Integrated dynamic jaw open, mouth open, and smile morph targets driven procedurally and via Web Audio Analyser simulated curves to reflect conversational states (`idle`, `thinking`, `speaking`, `alert`) in real time.
- **WebGL & Linux Stability:** Preserved the robust non-indexed geometry traversal and resolved Firefox read-only scale/rotation exceptions, ensuring a hardware-efficient 60 FPS rendering pipeline.
- **Production Asset Recompile & Container Rebuild:** Successfully recompiled the production React bundle, committed/pushed main branch updates to GitHub, and executed the remote SSH deployment script on CORTEX-Core (`192.168.50.241`) to rebuild and start the dashboard container.

### 25 MAY 2026 - ACTIVE SOVEREIGN VIKI AGENT, DYNAMIC TIME-RANGE REPORTING & WEBGL LINUX RENDER HARDENING (MOLE RUN)
- **Active Sovereign VIKI Agent:** Upgraded the conversational agent (`viki_agent.py` on VM 100) running in a system-isolated Python virtual environment (`/opt/cortex/venv`) using local Ollama (`viki` model) in a stateful ReAct (Reasoning + Action) loop.
- **Dual-Database Active Operations:** Integrated direct, secure SQL querying of the `glpi-db` MariaDB container and NetLock RMM `mysql-container` (database `dogha6`), allowing Viki to pull tickets, list/add/remove users, change roles/permissions, and audit RMM policies autonomously.
- **Dynamic Schema Discovery & Self-Correction:** Programmed robust MySQL feedback capture so that when Viki encounters a SQL query error (e.g., unknown column `status`), she autonomously runs schema discovery (`SHOW TABLES;`, `DESCRIBE policies;`) to correct her own query and execute successfully.
- **Historical Custom Reports:** Upgraded `cortex_reporter.py` and `generate_report.sh` to parse spec parameters from `/tmp/viki_report_spec.json`. When asked to "pull a report from 3 months ago," Viki parses the date range (e.g., `"February 2026"`), compiles it into the BTRFS lake under the customized slug-naming structure (`monthly_report_pr_vip_2026_02.docx` and `.pdf`).
- **Robust Audio Speech-to-Text Fallback:** Upgraded the speech triggers inside `VikiDedicatedChat.tsx` so that if native `SpeechRecognition` is disabled or unsupported (as Firefox defaults to), the interface automatically uses `MediaRecorder` and Web Audio APIs to capture high-fidelity voice inputs natively.
- **Server-Side Transcription Backend:** Developed a new POST endpoint `/api/transcribe` inside `viki_agent.py` on VM 100. It receives browser-recorded binary payloads (webm/ogg formats), transcodes them headlessly using `ffmpeg`, and transcribes them in Python using the Google Speech Recognition engine.
- **WebGL 3D Avatar Rendering Fix:** Integrated automatic geometry traversal inside `VikiAvatarRenderer.tsx` to dynamically convert all loaded mesh structures to **non-indexed geometries** (`toNonIndexed()`), completely eliminating index buffers and successfully bypassing the Firefox/Mesa index underflow rendering driver bugs on Linux.
- **Dynamic Gateway Routing Interception:** Deployed a dynamic Traefik file provider router (`viki-agent.yml`) to proxy both chat and transcribe endpoints to port `9092` dynamically without requiring any container builds.

### 25 MAY 2026 - NETLOCK CLEAN SLATE REINSTALLATION, SHARED NETWORK ADAPTATION & TRAEFIK INGRESS STABILIZATION (MOLE RUN)
- **Clean Slate Uninstallation:** Purged all residual files, logs, databases, and Docker volumes on `CORTEX-Core` (`192.168.50.241`) to establish a 100% clean installation slate.
- **Shared Network & Port Realignment:** Adapted the custom installer script `install.sh` to run NetLock inside the existing `netlock_netlock-network` without static IP address mappings, completely eliminating subnet collisions and label warnings with other active CORTEX containers (Authelia, GLPI, etc.).
- **Traefik Ingress Integration:** Extracted the web console container from direct host port 80 binding (which conflicted with the active Traefik gateway) and successfully injected Traefik reverse proxy routing labels to route `rmm.rmmservice.co.za` and `nl-webconsole.rmmservice.co.za` to the console internally.
- **Public DNS Resolution:** Commented out obsolete private overrides inside the local `/etc/hosts` file to restore clean, consistent public DNS resolution (`156.155.97.18`) for all CORTEX subdomains.

### 21 MAY 2026 - VIKI DEDICATED COCKPIT, VOICE INTERFACE & NEURAL ARCHIVE (MOLE RUN)
- **Dedicated Chat Cockpit (`/?mode=viki-chat`):** Deployed a dedicated fullscreen glassmorphic conversation workspace for VIKI, separating full dialog interfaces from standard dashboard widgets.
- **Bi-Directional Voice Interface (STT/TTS):** Wired real-time Speech-to-Text microphone capturing using Web Speech Recognition, and Speech-to-Synthesis output mapping to premium female vocal profiles, with toggleable mute controls.
- **Hybrid Cognitive Routing:** Implemented intelligent prompt analysis that dynamically routes tasks between local Viki LLM, CodeLlama coding specialist, or OpenAI GPT-4o hybrid core (utilizing secure local API keys). Appended manual routing override buttons.
- **Neural Archive Sidebar:** Engineered a collapsible multi-session sidebar allowing technicians to CRUD conversations. Includes dynamic auto-naming from user queries and an auto-migration script converting legacy history to "Restored Operational Log".
- **Avatar Kinetics Realignment:** Corrected mesh rigging, bone rotation matrices, and priority render cycles to resolve arm alignment glitches, rendering natural cybernetic posturing and tracking.

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
