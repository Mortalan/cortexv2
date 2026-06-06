# CORTEX: INTELLIGENCE & INTERFACE (VIKI)
## [VERSION 2.2]

### 1. THE BRAIN (LLM) & SOVEREIGN AGENT
- **Engine:** Ollama on GPU (AI-101) + local stateful ReAct dispatcher (`viki_agent.py` on VM 100).
- **Models:** `viki` (Contextual), `llama3:latest`, `hermes3` (GEO Audits), `phi`
- **Context Sync:** `viki_sync.py` (ACTIVE - Synchronizes `docs/` and `CORTEX_MAP.md`).
- **Database Operations:** Native SQL execution and schema-discovery self-correction for GLPI MariaDB and NetLock RMM MySQL (`mysql-container` in `dogha6`), granting active administrative control over users, roles, tickets, and RMM policies.
- **Dynamic Reporting:** Orchestrates DOCX and PDF compiling via `cortex_reporter.py` with custom historical window spec extraction.

### 2. THE VISAGE (3D AVATAR) & VOICE STT
- **Asset:** `viki_android_real.glb` (14MB local)
- **Renderer:** React 19 + @react-three/fiber
- **WebGL Hardening:** Converts model geometry dynamically using `.toNonIndexed()`, resolving Linux/Firefox Mesa driver index buffer bugs and stabilizing 3D execution at 60 FPS.
- **Voice STT Support:** Hybrid engine offering native Web Speech API alongside a high-fidelity client-side `MediaRecorder` audio capture fallback.
- **Transcription API:** Backed by headless `/api/transcribe` server-side transcoder (`viki_agent.py` with FFmpeg transcoding webm/ogg to PCM WAV and Google Speech Transcription).
- **Voice Synthesis (TTS) Engines**:
  - **Chromium-based browsers (Google Chrome, Brave, Edge)**: *Highly Recommended*. Natively bundle proprietary, free, state-of-the-art Neural Cloud TTS engines (e.g. `Google US English (Neural)`, `Microsoft Aria (Natural)`). These models sound completely human-like and natural, matching the quality of Gemini/ChatGPT out-of-the-box.
  - **Firefox on Linux**: Delegates synthesis entirely to the local operating system's `speech-dispatcher` service. On Arch Linux/EndeavourOS, this falls back to `espeak-ng` (formant-based, robotic TTS) which can be installed via `sudo pacman -S speech-dispatcher espeak-ng`.

### 3. AUTOMATION LOGIC
- **Platform:** n8n
- **Triage Webhook:** `https://automation.rmmservice.co.za/webhook/.../telemetry/triage`
- **Logic:** Telemetry -> AI Classification -> Reflex Action.
