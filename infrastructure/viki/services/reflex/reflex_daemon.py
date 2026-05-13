import os
import time
import socket
import json
from flask import Flask, request, jsonify

app = Flask(__name__)

BRAIN_TARGET = "traefik"
BRAIN_PORT = 80
ALERTS_PATH = "/mnt/data_lake/logs/alerts.json"
STATE_PATH = "/mnt/data_lake/logs/reflex_state.json"
PLAYBOOKS_DIR = "/opt/cortex/infrastructure/viki/playbooks"

def get_alerts():
    if os.path.exists(ALERTS_PATH):
        with open(ALERTS_PATH, "r") as f:
            try:
                return json.load(f)
            except:
                return []
    return []

def save_alerts(alerts):
    if not os.path.exists(os.path.dirname(ALERTS_PATH)):
        os.makedirs(os.path.dirname(ALERTS_PATH), exist_ok=True)
    with open(ALERTS_PATH, "w") as f:
        json.dump(alerts, f)

@app.route('/api/alerts', methods=['GET', 'POST'])
def handle_alerts():
    if request.method == 'POST':
        data = request.get_json()
        alerts = get_alerts()
        data['id'] = str(int(time.time()))
        data['timestamp'] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        alerts.append(data)
        alerts = alerts[-50:]
        save_alerts(alerts)
        return jsonify({"status": "ok", "alert_id": data['id']})
    return jsonify(get_alerts())

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
