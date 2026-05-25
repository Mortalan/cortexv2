import os
import time
import socket
import json
from flask import Flask, request, jsonify
from flask_sock import Sock

app = Flask(__name__)
sock = Sock(app)

# Active WebSocket connections
connections = set()

BRAIN_TARGET = "traefik"
BRAIN_PORT = 80
ALERTS_PATH = "/mnt/data_lake/logs/alerts.json"
STATE_PATH = "/mnt/data_lake/logs/reflex_state.json"
PLAYBOOKS_DIR = "/opt/cortex/infrastructure/viki/playbooks"

def get_alerts() -> list:
    if os.path.exists(ALERTS_PATH):
        with open(ALERTS_PATH, "r") as f:
            try:
                return json.load(f)
            except:
                return []
    return []

def save_alerts(alerts: list) -> None:
    if not os.path.exists(os.path.dirname(ALERTS_PATH)):
        os.makedirs(os.path.dirname(ALERTS_PATH), exist_ok=True)
    with open(ALERTS_PATH, "w") as f:
        json.dump(alerts, f)

def get_mode() -> str:
    if os.path.exists(STATE_PATH):
        try:
            with open(STATE_PATH, "r") as f:
                state = json.load(f)
                return state.get("mode", "NORMAL")
        except:
            return "NORMAL"
    return "NORMAL"

def broadcast_event(payload: dict) -> None:
    """Send JSON payload to all active WebSocket clients."""
    event_str = json.dumps(payload)
    disconnected_clients = []
    
    for ws in list(connections):
        try:
            ws.send(event_str)
        except Exception as e:
            print(f"[!] Error sending WS event: {e}", flush=True)
            disconnected_clients.append(ws)
            
    for ws in disconnected_clients:
        if ws in connections:
            connections.remove(ws)

@sock.route('/api/ws/telemetry')
def telemetry_ws(ws: object) -> None:
    """Handle incoming WebSocket connections for live telemetry streaming."""
    connections.add(ws)
    print(f"[+] WebSocket client connected. Active connections: {len(connections)}", flush=True)
    try:
        while True:
            # Sleep/ping interval to keep the websocket alive and detect closures
            # We don't expect incoming messages, but receive will block until close or ping timeout
            ws.receive(timeout=30)
    except Exception as e:
        print(f"[-] WebSocket connection error: {e}", flush=True)
    finally:
        if ws in connections:
            connections.remove(ws)
        print(f"[x] WebSocket connection closed. Active connections: {len(connections)}", flush=True)

@app.route('/api/alerts', methods=['GET', 'POST'])
def handle_alerts() -> object:
    if request.method == 'POST':
        data = request.get_json()
        alerts = get_alerts()
        data['id'] = str(int(time.time()))
        data['timestamp'] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        alerts.append(data)
        alerts = alerts[-50:]
        save_alerts(alerts)
        
        # Broadcast the alert event to all WebSocket clients
        alert_event = {
            "type": "ALERT",
            "id": data['id'],
            "timestamp": data['timestamp'],
            "source": data.get('source', 'Unknown'),
            "message": data.get('message', ''),
            "severity": data.get('type', 'INFO')
        }
        broadcast_event(alert_event)
        
        return jsonify({"status": "ok", "alert_id": data['id']})
    return jsonify(get_alerts())

@app.route('/api/telemetry', methods=['POST'])
def handle_telemetry() -> object:
    """Ingest telemetry data from Vector/n8n and broadcast to dashboard."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data"}), 400
        
    # Standardize data fields for the frontend HUD
    if 'timestamp' not in data:
        data['timestamp'] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    if 'id' not in data:
        data['id'] = str(int(time.time() * 1000))
    if 'type' not in data:
        data['type'] = "TELEMETRY"
    if 'severity' not in data:
        # Infer severity if absent
        data['severity'] = data.get('level', 'INFO')
        
    broadcast_event(data)
    
    # Active Mitigation Autonomous Trigger in REFLEX mode
    mode = get_mode()
    severity = str(data.get("severity", "INFO")).upper()
    message = str(data.get("message", "")).upper()
    
    if mode == "REFLEX" and (severity == "CRITICAL" or "CRITICAL" in message or "MIMIKATZ" in message or "QUARANTINE" in message):
        target_id = data.get("client_id") or data.get("hostname") or data.get("target")
        if target_id:
            print(f"[!] AUTONOMOUS REFLEX TRIGGERED: Critical threat detected on target '{target_id}' in Hardened mode. Initiating isolation playbook!", flush=True)
            playbook_path = os.path.join(PLAYBOOKS_DIR, "isolate_host.sh")
            if os.path.exists(playbook_path):
                os.system(f"bash {playbook_path} {target_id} &")
                
                # Broadcast autonomous mitigation HUD alert
                mitigation_event = {
                    "id": str(int(time.time() * 1000) + 1),
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "type": "MITIGATION",
                    "severity": "CRITICAL",
                    "source": "REFLEX",
                    "message": f"Autonomous Quarantine initiated for target: {target_id} due to EDR indicator: {data.get('message', 'Critical process execution')}"
                }
                broadcast_event(mitigation_event)

    return jsonify({"status": "ok"})

def set_mode(mode: str) -> None:
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

    # Broadcast the mode event to all WebSocket clients instantly
    mode_event = {
        "type": "MODE_CHANGE",
        "mode": mode,
        "security_status": status,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    broadcast_event(mode_event)

@app.route('/api/mode', methods=['POST'])
def api_set_mode() -> object:
    data = request.get_json()
    mode = data.get("mode")
    if mode not in ["NORMAL", "REFLEX"]:
        return jsonify({"error": "Invalid mode"}), 400
    set_mode(mode)
    return jsonify({"status": "ok"})

@app.route('/api/playbook', methods=['POST'])
def execute_playbook() -> object:
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

