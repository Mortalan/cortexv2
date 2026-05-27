# CORTEX: LAB EXECUTION LOG
## [VERSION 2.0]

### CURRENT PROGRESS
- [x] NetLock License & Stability.
- [x] Identity Restoration (LLDAP/Authelia).
- [x] Forensic Lake BTRFS Baseline.
- [x] Reflex Mode Validation.
- [x] **CLI Migration (Gemini -> Antigravity) Prep.**
- [x] **Real-time Telemetry HUD (Phase 16.1) Completed.**
- [x] **Sovereign Control & Active Mitigation Console (Phase 16.2) Completed.**
- [x] **Sovereign Viki Agent & DB Operations (Phase 16.7) Completed.**
- [x] **Native Firefox STT Recorder & Transcription API (Phase 16.8) Completed.**
- [x] **WebGL 3D Avatar Render Hardening (Phase 16.9) Completed.**
- [x] **High-Fidelity Viki Head & Self-Normalizing Bone Alignment (Phase 17.3) Completed.**

### CURRENT PHASE: PLATFORM ORCHESTRATION & SECURITY HARDENING
**Phase 17.1: Gateway Hardening & Webhook Orchestration**
1. [x] Implement `VikiAvatarRenderer.tsx` in Dashboard.
2. [x] Deploy `viki_sync.py` on AI-101.
3. [x] Integrate Avatar visibility into Dashboard Auth (Admin only).
4. [x] Refactor Dashboard layout for full-height Sidebar manifesting VIKI.
5. [x] Implement 3D animation and framing optimization for production.
- [x] Audit Traefik dynamic load balancing routing configurations for new public endpoints.
- [x] Inject HMAC-SHA256 verification hooks inside hermes_agent.py to secure incoming n8n automated triage webhooks.
- [ ] Implement a secure, tokenized SMTP mailing pipeline inside cortex_reporter.py to dispatch reports directly from the dashboard.

**Phase 17.3: High-Fidelity Organic Human Head Restoration & WebGL Property Hardening**
- [x] Restore high-fidelity realistic textured human companion android bust model (`viki_android_real.glb`).
- [x] Implement an automated skeletal bones traverse function inside React `useMemo` hooks.
- [x] Engineer a dynamic, self-healing mathematical offset offset algorithm that centers the camera target exactly on the model's head bone world position ($y = 0.05$).
- [x] Resolve all WebGL and browser lost context errors by mapping `scale` and `rotation` directly on parent `<mesh>` elements rather than using invalid `<primitive attach>` nodes.
- [x] Play native `Idle02_F` organic breathing cycle and cursor gaze-tracking overlays on head and neck bones.

**Phase 17.2: Holographic V.I.K.I. Core Matrix Conversion**
- [x] Source or model a low-poly head base containing standard ARKit/Oculus viseme morph targets.
- [x] Develop custom Three.js ShaderMaterial or InstancedMesh layer in VikiAvatarRenderer.tsx to render the 3D grid matrix look.
- [x] Connect Web Audio API AnalyserNode to the /api/viki audio playback hook to capture real-time audio amplitudes.
- [x] Bind real-time sound frequencies to face morph target weights inside the core frame rendering loop.

**Phase 15.4: Cognitive Dialogue**
1. [x] Implement `VikiChat.tsx` component in Dashboard sidebar.
2. [x] Establish API proxy for secure Ollama communication.
3. [x] Integrate chat state with VIKI 3D animations (speaking/thinking).
4. [x] Enable contextual memory utilizing the `viki` model.

**Phase 16.1: Real-time Telemetry HUD**
1. [x] Upgrade Reflex Daemon to support WebSockets via `flask-sock`.
2. [x] Create telemetry receiving endpoint `/api/telemetry` on Reflex Daemon.
3. [x] Configure Vector sinks in normal and reflex modes to forward telemetry to daemon.
4. [x] Upgrade React Dashboard to connect to telemetry socket and consume logs.
5. [x] Build glassmorphic cybernetic TelemetryHUD overlay component.
6. [x] Link 3D Canvas lighting, fog, and grid colors to respond dynamically to critical threat states.

**Phase 16.2: Sovereign Control & Active Mitigation Console**
1. [x] Align manual daemon control routes to `/api/mode` and `/api/playbook`.
2. [x] Add strict Python type annotations to all method signatures in `reflex_daemon.py`.
3. [x] Implement WebSocket mode-change state broadcasting inside `set_mode`.
4. [x] Declare a strict `TelemetryEvent` interface in `App.tsx` and eliminate all loose `any` types.
5. [x] Design and implement a glassmorphic Active Mitigation Console panel inside the React dashboard.
6. [x] Implement manual security state toggling and target host isolation commands using high-fidelity overlays.

**Emergency Ingress & Gateway Stabilization (Mole Run)**
1. [x] Restored NetLock RMM Web Console: Fixed CustomCertificatePath fatal crash, database binding settings, and root-level SSL bypass environment overrides.
2. [x] Resolved Velociraptor 401 Loop: Terminated authelia@docker double-wrapping on the native EDR basic auth layer.
3. [x] Restored Ollama AI API Integration: Established dynamic Traefik file provider routing (`dynamic/ollama.yml`) to proxy to AI-101 (`192.168.50.242:11434`).
4. [x] Fixed WireGuard Dashboard Interaction: Implemented safe `"disabled"` href/target handling and React preventDefault to bypass JS-blocking.
5. [x] Cleaned Up Ingress Overlaps: Set `traefik.enable=false` on the legacy dashboard service.

**NetLock Stack Reinstallation & Ingress Refinement (May 25, 2026)**
1. [x] Performed complete uninstallation and data purge of the old NetLock containers, databases, and persistent data paths on `CORTEX-Core` (`192.168.50.241`) to establish a clean slate.
2. [x] Copied the custom installer `install.sh` to the server and adapted its network layout to map dynamically to the existing shared external `netlock_netlock-network`, preventing all subnet clashes and label mismatch errors.
3. [x] Resolved host port 80 allocation conflicts by removing the direct `80:80` port binding for the Web Console container, replacing it with Traefik routing labels to enable seamless reverse proxying internally.
4. [x] Successfully resolved local static DNS conflicts by commenting out obsolete internal IP overrides for `rmm.rmmservice.co.za` in the local `/etc/hosts` file, restoring clean public DNS resolution to `156.155.97.18`.
5. [x] Ran the custom installer successfully to bring up a stable NetLock stack. Verified that all subdomains (`rmm`, `nl-webconsole`, `nl-backend`, `nl-relay`) resolve and route perfectly.

**NetLock Web Console & Viki Kinetics Diagnostics (May 21, 2026)**
1. [x] Replaced symlinks in `/home/netlock/certificates/` with direct copies of the production certificate (`dummy.pfx` and `cortex_dummy.pfx`, decryptable with password `"dummy"`).
2. [x] Resolved `netlock-rmm-server` boot loop by applying `MembersPortal__SkipSync=true` override to bypass 429 rate limits.
3. [x] Decompiled and investigated NetLock obfuscated DLLs: Uncovered that the console checks root configuration keys (`cert_path`, `cert_password`, `certificates_path`, `certificates_password`) instead of the custom Kestrel blocks on boot, leading to the certificate validation crash.
4. [x] Map the newly discovered root keys to correct paths and passwords in `appsettings.json` and Docker Compose.
5. [x] Refactor `VikiAvatarRenderer.tsx` to map eye bones, clavicles, and upper arms to correct natural skeletal constraints, resolving arm posturing conflicts.

**Phase 15.5: Cognitive Dedicated Chat & Neural Archive (May 21, 2026)**
1. [x] Build fullscreen glassmorphic conversation workspace under `/?mode=viki-chat`.
2. [x] Integrate dual STT (speech-to-text) and premium female TTS (speech-to-synthesis) engines.
3. [x] Establish local Ollama & hybrid ChatGPT (`gpt-4o`) model routing with manual override panels.
4. [x] Engineer the right collapsible **Neural Archive** sidebar to persist multiple conversation sessions.
5. [x] Support automatic session topic naming and dynamic legacy chat database migration.

**Phase 16.3: Custom Automated Reporting Engine (May 25, 2026)**
1. [x] Deployed Python-based report compiler `cortex_reporter.py` on `CORTEX-Core`.
2. [x] Installed `libreoffice-writer-nogui` on `CORTEX-Core` to handle headless DOCX-to-PDF compilation.
3. [x] Safely exposed GLPI database via `127.0.0.1:3306` on the host network for secure SQL queries.
4. [x] Created `generate_report.sh` to orchestrate pipeline and sync generated reports (DOCX/PDF) to Forensic Data Lake reports ingress (`/mnt/data_lake/reports/`).
5. [x] Automatically transferred compiled reports to Downloads folder for immediate client delivery.

**Phase 16.4: Active Autonomous Response Mitigation (May 25, 2026)**
1. [x] Integrated `get_mode()` into the `reflex-daemon` to read the security posture state from the Forensic Data Lake.
2. [x] Intercepted incoming Vector EDR log streams inside `handle_telemetry()`.
3. [x] Configured Reflex mode to autonomously trigger the `isolate_host.sh` incident response playbook upon detecting high-severity EDR/Mimikatz indicators.
4. [x] Broadcast dynamic WebSocket `MITIGATION` visual HUD overlays to notify all connected operational dashboards of automated mitigations.
5. [x] Successfully verified the mitigation loop with simulated threat vectors, quarantining mock target `C-101` in the background.

**Phase 16.5: Cognitive Stateful Dispatcher - Hermes Agent (May 25, 2026)**
1. [x] Built the Python-based `hermes_agent.py` driven by FastAPI and equipped with Ollama `viki:latest` context-retrieval hooks.
2. [x] Designed the interactive HTML/JS **Hermes Dispatch Console** (served on root `/`) featuring real-time diagnostic log persistence and a manual Triage Simulator.
3. [x] Deployed `/opt/cortex/infrastructure/viki/services/hermes/` container stack under dynamic Traefik proxying at `hermes.rmmservice.co.za`.
4. [x] Successfully mapped automated playbooks inside `/api/hermes/triage` to autonomously execute target host quarantining and notify CORTEX's active response channels.

**Phase 16.7: Sovereign Viki Agent & DB Operations (May 25, 2026)**
1. [x] Upgraded the conversational agent (`viki_agent.py` on VM 100) running in a system-isolated Python virtual environment (`/opt/cortex/venv`) using local Ollama (`viki` model) in a stateful ReAct (Reasoning + Action) loop.
2. [x] Integrated direct, secure SQL querying of the `glpi-db` MariaDB container and NetLock RMM `mysql-container` (database `dogha6`), allowing Viki to pull tickets, list/add/remove users, change roles/permissions, and audit RMM policies autonomously.
3. [x] Programmed robust MySQL feedback capture so that when Viki encounters a SQL query error (e.g., unknown column `status`), she autonomously runs schema discovery (`SHOW TABLES;`, `DESCRIBE policies;`) to correct her own query and execute successfully.
4. [x] Upgraded `cortex_reporter.py` and `generate_report.sh` to parse spec parameters from `/tmp/viki_report_spec.json`. When asked to "pull a report from 3 months ago," Viki parses the date range (e.g., `"February 2026"`), compiles it into the BTRFS lake under the customized slug-naming structure (`monthly_report_pr_vip_2026_02.docx` and `.pdf`).

**Phase 16.8: Native Firefox Speech Recorder & Transcription API (May 25, 2026)**
1. [x] Upgraded the speech triggers inside `VikiDedicatedChat.tsx` so that if native `SpeechRecognition` is disabled or unsupported (as Firefox defaults to), the interface automatically uses `MediaRecorder` and Web Audio APIs to capture high-fidelity voice inputs natively.
2. [x] Developed a new POST endpoint `/api/transcribe` inside `viki_agent.py` on VM 100. It receives browser-recorded binary payloads (webm/ogg formats), transcodes them headlessly using `ffmpeg`, and transcribes them in Python using the Google Speech Recognition engine.
3. [x] Integrated a glowing glassmorphic HUD modal overlay inside the frontend that triggers if microphone access fails, showing Firefox users the exact flags needed to enable native Web Speech API in `about:config`.

**Phase 16.9: WebGL 3D Avatar Render Hardening (May 25, 2026)**
1. [x] Integrated automatic geometry traversal inside `VikiAvatarRenderer.tsx` to dynamically convert all loaded mesh structures to non-indexed geometries (`toNonIndexed()`), completely eliminating index buffers and successfully bypassing the Firefox/Mesa index underflow rendering driver bugs on Linux.
2. [x] Deployed a dynamic Traefik file provider router (`viki-agent.yml`) to proxy both chat and transcribe endpoints to port `9092` dynamically without requiring any container builds.


### SNAPSHOT HISTORY
- `@snapshots/baseline_20260519`: Initial stable forensic state.
