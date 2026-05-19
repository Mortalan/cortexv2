# CORTEX: INTELLIGENCE & INTERFACE (VIKI)
## [VERSION 2.0]

### 1. THE BRAIN (LLM)
- **Engine:** Ollama on GPU (AI-101)
- **Models:** `llama3:latest`, `phi`
- **Context Sync:** `viki_sync.py` (Drafted, pending implementation).

### 2. THE VISAGE (3D AVATAR)
- **Asset:** `viki_android_real.glb` (14MB local)
- **Renderer:** React 19 + @react-three/fiber
- **Component:** `VikiAvatarRenderer.tsx` (Spec drafted).

### 3. AUTOMATION LOGIC
- **Platform:** n8n
- **Triage Webhook:** `https://automation.rmmservice.co.za/webhook/.../telemetry/triage`
- **Logic:** Telemetry -> AI Classification -> Reflex Action.
