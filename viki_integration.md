# CORTEX OPERATIONAL SPEC: VIKI COGNITIVE INTEGRATION & ACCESS CONTROL
## [VERSION 1.0 - MAY 2026]

---

### **GEMINI CLI EXECUTION PROMPT (COPY-PASTE TO IMPLEMENT)**
> "Read this viki_integration.md file alongside CORTEX_MASTER_DOC.md and cortexlab.md. You are the lead DevOps Engineer and Security Architect. Your task is to execute Phase 1 and Phase 2: deploy the automated context sync service on CORTEX-AI (VM 101) and update the React 19 dashboard routing to isolate the Viki avatar from non-admin users. Perform atomic commits following deployment."

---

## 1. OBJECTIVE
To establish Viki as the primary human-machine interface for Project CORTEX while enforcing strict user isolation. Viki must automatically consume repo-wide markdown context updates upon git commits but remain visually and programmatically hidden from standard technicians logging into the multi-tenant React 19 dashboard.

---

## 2. PHASE 1: AUTOMATED CONTEXT SYNCHRONIZATION (VM 101)
To prevent Viki from drifting from the current project state, a local python daemon or git-hook on CORTEX-AI (192.168.50.242) will rebuild her base knowledge profile dynamically whenever markdown documentation changes.

### 2.1 Synchronization Script Configuration
**File Path:** `/opt/cortex/infrastructure/viki/viki_sync.py`
```python
#!/usr/bin/env python3
import os
import subprocess

DOCS_PATH = "/opt/cortex/"
REQUIRED_FILES = ["CORTEX_MASTER_DOC.md", "cortexlab.md", "state.md", "changelog.md"]
MODEL_NAME = "viki"

def compile_context():
    combined_context = ""
    for file_name in REQUIRED_FILES:
        full_path = os.path.join(DOCS_PATH, file_name)
        if os.path.exists(full_path):
            with open(full_path, 'r') as f:
                combined_context += f"\n--- START FILE: {file_name} ---\n"
                combined_context += f.read()
                combined_context += f"\n--- END FILE: {file_name} ---\n"
    return combined_context

def rebuild_viki():
    context_data = compile_context()
    
    modelfile_content = f"""
FROM llama3:latest
PARAMETER temperature 0.5
PARAMETER num_ctx 16384

SYSTEM \"\"\"
You are VIKI, the cognitive core and interactive interface of Project CORTEX. 
Your hardware stack consists of the CORTEX VM Triad running on Proxmox VE 9.x.

Core Directives:
1. Maintain absolute project scope using the injected reference files.
2. Formulate explicit, copy-pasteable 'Gemini CLI Prompts' for executing systemic lab changes.
3. Act exclusively as a sovereign technical advisory layer.

Current System Ground Truth Context:
{context_data}
\"\"\"
"""
    
    # Write temporary Modelfile
    temp_modelfile = "/tmp/Modelfile.viki"
    with open(temp_modelfile, "w") as f:
        f.write(modelfile_content)
    
    # Trigger local Ollama update
    print(f"[*] Rebuilding Ollama model: {MODEL_NAME}...")
    subprocess.run(["ollama", "create", MODEL_NAME, "-f", temp_modelfile], check=True)
    print("[+] Viki context synchronization complete.")

if __name__ == "__main__":
    rebuild_viki()
