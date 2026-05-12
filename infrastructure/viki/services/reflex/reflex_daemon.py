import os
import time
import socket
import json
from flask import Flask, request, jsonify

app = Flask(__name__)

BRAIN_TARGET = "traefik"
BRAIN_PORT = 80
STATE_PATH = "/mnt/data_lake/logs/reflex_state.json"
PLAYBOOKS_DIR = "/opt/cortex/infrastructure/vaki/playbooks"

def set_mode(mode):
    print(f"Switching to {mode} mode...", flush=True)
    status = "HARDENED" if mode == "REFLEX" else "STANDARD"
    data = {
        "mode": mode,
        "security_status": status,
        "timestamp": time.ctime()
    }
    if not os.path.exists(os.path.dirname(STATE_PATH)):
        os.makedirs(os.path.dirname(STATE_PATH), exist_ok=True)
    with open(STATE_PATH, "w") as f:
        json.dump(data, f)
    
    config_file = f"/etc/vector/vector_{mode.lower()}.yaml"
    if os.path.exists(config_file):
        os.system(f"cp {config_file} /etc/vector/vector.yaml")
        print(f"Vector config updated to {mode}", flush=True)

@app.route('/mode', methods=['POST'])
def api_set_mode():
    data = request.get_json()
    mode = data.get("mode")
    if mode not in ["NORMAL", "REFLEX"]:
        return jsonify({"error": "Invalid mode"}), 400
    set_mode(mode)
    return jsonify({"status": "ok"})

@app.route('/playbook', methods=['POST'])
def execute_playbook():
    data = request.get_json()
    playbook = data.get("playbook")
    target = data.get("target")
    
    playbook_path = os.path.join(PLAYBOOKS_DIR, f"{playbook}.sh")
    if not os.path.exists(playbook_path):
        return jsonify({"error": "Playbook not found"}), 444
    
    print(f"Executing playbook: {playbook} on target: {target}", flush=True)
    # Execute in background
    os.system(f"bash {playbook_path} {target} &")
    return jsonify({"status": "scheduled"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=9090)
