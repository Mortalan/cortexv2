#!/usr/bin/env python3
import os
import subprocess

# Adjusted for local workspace path
DOCS_PATH = "/home/louis/cortex/"
REQUIRED_FILES = [
    "CORTEX_MAP.md",
    "docs/INFRA.md",
    "docs/INTEL.md",
    "docs/SEC_OPS.md",
    "docs/LAB_LOG.md",
    "docs/CHANGELOG.md"
]
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
        else:
            print(f"[!] Warning: {full_path} not found.")
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
    try:
        subprocess.run(["ollama", "create", MODEL_NAME, "-f", temp_modelfile], check=True)
        print("[+] Viki context synchronization complete.")
    except FileNotFoundError:
        print("[!] Error: 'ollama' command not found. Ensure Ollama is installed and in PATH.")
    except subprocess.CalledProcessError as e:
        print(f"[!] Error rebuilding model: {e}")

if __name__ == "__main__":
    rebuild_viki()
