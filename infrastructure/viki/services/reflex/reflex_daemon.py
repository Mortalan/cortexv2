import os
import time
import socket
import json
import hashlib
import hmac
import threading
from flask import Flask, request, jsonify
from flask_sock import Sock

app = Flask(__name__)
sock = Sock(app)

# Active WebSocket connections
connections = set()

BRAIN_TARGET = "traefik"
BRAIN_PORT = 80
PLAYBOOKS_DIR = "/opt/cortex/infrastructure/viki/playbooks"
SECRET_KEY = b"cortex_hyper_secret_2026"
PERMISSIONS_PATH = "audit/permissions.json"

def get_data_lake_path(subpath: str) -> str:
    """Resolves data lake paths, falling back to local workspace paths if needed."""
    base = "/mnt/data_lake"
    try:
        os.makedirs(base, exist_ok=True)
        # Test writeability
        test_file = os.path.join(base, ".write_test")
        with open(test_file, "w") as f:
            f.write("test")
        os.remove(test_file)
        
        # Ensure target folder exists
        os.makedirs(os.path.join(base, os.path.dirname(subpath)), exist_ok=True)
        return os.path.join(base, subpath)
    except Exception:
        # Fall back to sandbox local workspace path
        local_base = "/home/louis/cortex/mnt/data_lake"
        os.makedirs(local_base, exist_ok=True)
        os.makedirs(os.path.join(local_base, os.path.dirname(subpath)), exist_ok=True)
        return os.path.join(local_base, subpath)

def get_alerts_path() -> str:
    return get_data_lake_path("logs/alerts.json")

def get_state_path() -> str:
    return get_data_lake_path("logs/reflex_state.json")

def write_signed_audit_log(event_type: str, message: str, metadata: dict = None) -> None:
    """Writes a structured, cryptographically signed log entry to BTRFS lake."""
    if metadata is None:
        metadata = {}
    
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    log_entry = {
        "timestamp": timestamp,
        "type": event_type,
        "message": message,
        "metadata": metadata
    }
    
    # Calculate HMAC-SHA256 signature to guarantee integrity
    payload_bytes = json.dumps(log_entry, sort_keys=True).encode("utf-8")
    sig = hmac.new(SECRET_KEY, payload_bytes, hashlib.sha256).hexdigest()
    log_entry["signature"] = sig
    
    audit_file = get_data_lake_path("audit/security_audit.jsonl")
    try:
        with open(audit_file, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
        print(f"[+] Stateful BTRFS Audit Log written: {event_type} - {message}", flush=True)
    except Exception as e:
        print(f"[!] Error writing audit log: {e}", flush=True)

def init_audit_log_if_empty() -> None:
    audit_file = get_data_lake_path("audit/security_audit.jsonl")
    if not os.path.exists(audit_file) or os.path.getsize(audit_file) == 0:
        print("[*] Initializing BTRFS security audit log with baseline records...", flush=True)
        write_signed_audit_log("SYSTEM_INITIALIZATION", "CORTEX Core Security Subsystem initialized. Forensic BTRFS Storage Engined mapped successfully.", {"status": "ACTIVE"})
        write_signed_audit_log("MODE_CHANGE", "Security Mode transitioned to NORMAL", {"mode": "NORMAL", "security_status": "STANDARD"})
        write_signed_audit_log("PERMISSION_CHANGE", "VIKI AI Assignment for user Louis granted dynamically by Authelia mapping.", {"username": "Louis", "permission": "viki_assigned", "value": True})
        write_signed_audit_log("PERMISSION_CHANGE", "VIKI AI Assignment for user Felicia granted dynamically by Authelia mapping.", {"username": "Felicia", "permission": "viki_assigned", "value": True})

DEFAULT_APPS = {
    "NetLock RMM": True,
    "GLPI": True,
    "Velociraptor": True,
    "Custom Reports": True,
    "MinIO": True,
    "n8n": True,
    "Ollama AI": True,
    "Hermes Agent": True,
    "Traefik": True,
    "Authelia": True,
    "WireGuard": True,
    "SEO Scanner": True,
    "Website Auditor": True,
    "SPIDER": True
}

_cached_permissions = None
db_lock = threading.Lock()

def get_permissions() -> dict:
    global _cached_permissions
    perm_file = get_data_lake_path(PERMISSIONS_PATH)
    perms = None
    
    with db_lock:
        if os.path.exists(perm_file):
            for attempt in range(3):
                try:
                    with open(perm_file, "r") as f:
                        content = f.read()
                        if content.strip():
                            perms = json.loads(content)
                            break
                except Exception as e:
                    print(f"[!] Database read attempt {attempt + 1} failed: {e}", flush=True)
                    time.sleep(0.05)
                    
        if not perms:
            if _cached_permissions is not None:
                print("[*] Database read failed. Falling back to last-known-good memory cache.", flush=True)
                perms = _cached_permissions
            elif not os.path.exists(perm_file) or os.path.getsize(perm_file) == 0:
                perms = {
                    "users": [
                        {
                            "username": "Louis",
                            "role": "Cortex-Admins",
                            "viki_assigned": True,
                            "permissions": {
                                "view_telemetry": True,
                                "execute_playbooks": True,
                                "run_qc_scans": True,
                                "run_seo_scans": True,
                                "run_web_audits": True,
                                "edit_appointments": True,
                                "edit_user_permissions": True
                            },
                            "apps": DEFAULT_APPS.copy(),
                            "password": "password"
                        },
                        {
                            "username": "Felicia",
                            "role": "Cortex-Admins",
                            "viki_assigned": True,
                            "permissions": {
                                "view_telemetry": True,
                                "execute_playbooks": True,
                                "run_qc_scans": True,
                                "run_seo_scans": True,
                                "run_web_audits": True,
                                "edit_appointments": True,
                                "edit_user_permissions": True
                            },
                            "apps": DEFAULT_APPS.copy(),
                            "password": "password"
                        },
                        {
                            "username": "Vitto",
                            "role": "Cortex-Technicians",
                            "viki_assigned": False,
                            "permissions": {
                                "view_telemetry": True,
                                "execute_playbooks": False,
                                "run_qc_scans": False,
                                "run_seo_scans": False,
                                "run_web_audits": False,
                                "edit_appointments": True,
                                "edit_user_permissions": False
                            },
                            "apps": DEFAULT_APPS.copy(),
                            "password": "password"
                        },
                        {
                            "username": "Sarah",
                            "role": "Cortex-Designers",
                            "viki_assigned": False,
                            "permissions": {
                                "view_telemetry": True,
                                "execute_playbooks": False,
                                "run_qc_scans": True,
                                "run_seo_scans": True,
                                "run_web_audits": True,
                                "edit_appointments": False,
                                "edit_user_permissions": False
                            },
                            "apps": DEFAULT_APPS.copy(),
                            "password": "password"
                        }
                    ]
                }
            else:
                raise RuntimeError("Permissions database exists but is corrupted or locked. Aborting default reset to protect data.")
        else:
            _cached_permissions = perms
    
    # Ensure every user has 'apps', 'password' and all defaults exist
    modified = False
    for u in perms.get("users", []):
        if "apps" not in u:
            u["apps"] = DEFAULT_APPS.copy()
            modified = True
        else:
            for app_name, app_def in DEFAULT_APPS.items():
                if app_name not in u["apps"]:
                    u["apps"][app_name] = app_def
                    modified = True
        if "permissions" not in u:
            u["permissions"] = {}
            modified = True
        if "run_seo_scans" not in u["permissions"]:
            u["permissions"]["run_seo_scans"] = u["permissions"].get("run_qc_scans", False)
            modified = True
        if "run_web_audits" not in u["permissions"]:
            u["permissions"]["run_web_audits"] = u["permissions"].get("run_qc_scans", False)
            modified = True
        if "password" not in u:
            u["password"] = "password"
            modified = True
                    
    if modified:
        save_permissions(perms)
        
    return perms

def save_permissions(data: dict) -> None:
    perm_file = get_data_lake_path(PERMISSIONS_PATH)
    with db_lock:
        temp_file = perm_file + ".tmp"
        try:
            with open(temp_file, "w") as f:
                json.dump(data, f, indent=2)
            os.replace(temp_file, perm_file)
        except Exception as e:
            print(f"[!] Error writing permissions database atomically: {e}", flush=True)
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except:
                    pass
            with open(perm_file, "w") as f:
                json.dump(data, f, indent=2)

def get_alerts() -> list:
    alerts_path = get_alerts_path()
    if os.path.exists(alerts_path):
        with open(alerts_path, "r") as f:
            try:
                return json.load(f)
            except:
                return []
    return []

def save_alerts(alerts: list) -> None:
    alerts_path = get_alerts_path()
    if not os.path.exists(os.path.dirname(alerts_path)):
        os.makedirs(os.path.dirname(alerts_path), exist_ok=True)
    with open(alerts_path, "w") as f:
        json.dump(alerts, f)

def get_mode() -> str:
    state_path = get_state_path()
    if os.path.exists(state_path):
        try:
            with open(state_path, "r") as f:
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
            # Keep alive block
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
        
        # Audit active threat alert ingested
        write_signed_audit_log(
            "ALERT_INGESTION",
            f"Threat alert ingested from {data.get('source', 'Unknown')}: {data.get('message', '')}",
            {"alert_id": data['id'], "severity": data.get('type', 'INFO')}
        )
        
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
                
                # Write to stateful audit log
                write_signed_audit_log(
                    "AUTONOMOUS_MITIGATION",
                    f"Autonomous Quarantine playbook triggered for host '{target_id}' due to critical threat indicator.",
                    {"target": target_id, "edr_indicator": data.get('message', 'Mimikatz / Critical Process')}
                )
                
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
    state_path = get_state_path()
    if not os.path.exists(os.path.dirname(state_path)):
        os.makedirs(os.path.dirname(state_path), exist_ok=True)
    with open(state_path, "w") as f:
        json.dump(data, f)
    
    config_file = f"/etc/vector/vector_{mode.lower()}.yaml"
    if os.path.exists(config_file):
        os.system(f"cp {config_file} /etc/vector/vector.yaml")
        print(f"Vector config updated to {mode}", flush=True)

    # Write stateful audit log of security posture transition
    write_signed_audit_log(
        "MODE_CHANGE",
        f"Security posture transitioned to {status} ({mode} mode).",
        {"mode": mode, "security_status": status}
    )

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
    
    # Audit manual mitigation action
    write_signed_audit_log(
        "MANUAL_MITIGATION",
        f"Manual mitigation playbook '{playbook}' executed on target '{target}'.",
        {"playbook": playbook, "target": target}
    )
    
    # Broadcast manual mitigation event to WS clients for timeline visualization
    mitigation_event = {
        "id": str(int(time.time() * 1000)),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "type": "MITIGATION",
        "severity": "WARNING",
        "source": "MANUAL",
        "message": f"Manual Quarantine playbook '{playbook}' executed for target: {target}"
    }
    broadcast_event(mitigation_event)
    
    return jsonify({"status": "scheduled"})

@app.route('/api/permissions/toggle', methods=['POST'])
def api_toggle_permission() -> object:
    data = request.get_json()
    username = data.get("username")
    permission_name = data.get("permission")  # e.g., "view_telemetry", "viki_assigned", "role", or "app_n8n"
    value = data.get("value")  # True/False (or string for role)
    
    perms = get_permissions()
    user_found = False
    
    for u in perms["users"]:
        if u["username"].lower() == username.lower():
            user_found = True
            if permission_name == "viki_assigned":
                old_val = u.get("viki_assigned", False)
                u["viki_assigned"] = value
                msg = f"VIKI AI Assignment for user {username} updated from {old_val} to {value}."
            elif permission_name == "role":
                old_val = u.get("role", "Cortex-Technicians")
                u["role"] = value
                if value == "Cortex-Admins":
                    u["permissions"] = {
                        "view_telemetry": True,
                        "execute_playbooks": True,
                        "run_qc_scans": True,
                        "run_seo_scans": True,
                        "run_web_audits": True,
                        "edit_appointments": True,
                        "edit_user_permissions": True
                    }
                elif value == "Cortex-Technicians":
                    u["permissions"] = {
                        "view_telemetry": True,
                        "execute_playbooks": False,
                        "run_qc_scans": False,
                        "run_seo_scans": False,
                        "run_web_audits": False,
                        "edit_appointments": True,
                        "edit_user_permissions": False
                    }
                elif value == "Cortex-Management":
                    u["permissions"] = {
                        "view_telemetry": True,
                        "execute_playbooks": False,
                        "run_qc_scans": True,
                        "run_seo_scans": True,
                        "run_web_audits": True,
                        "edit_appointments": True,
                        "edit_user_permissions": False
                    }
                elif value == "Cortex-Office":
                    u["permissions"] = {
                        "view_telemetry": False,
                        "execute_playbooks": False,
                        "run_qc_scans": False,
                        "run_seo_scans": False,
                        "run_web_audits": False,
                        "edit_appointments": True,
                        "edit_user_permissions": False
                    }
                else: # Cortex-Designers
                    u["permissions"] = {
                        "view_telemetry": True,
                        "execute_playbooks": False,
                        "run_qc_scans": True,
                        "run_seo_scans": True,
                        "run_web_audits": True,
                        "edit_appointments": False,
                        "edit_user_permissions": False
                    }
                msg = f"Role for user {username} updated from {old_val} to {value}."
            elif permission_name.startswith("app_"):
                app_key = permission_name[4:]
                if "apps" not in u:
                    u["apps"] = DEFAULT_APPS.copy()
                old_val = u["apps"].get(app_key, True)
                u["apps"][app_key] = value
                msg = f"Gateway app visibility '{app_key}' for user {username} updated from {old_val} to {value}."
            else:
                if "permissions" not in u:
                    u["permissions"] = {}
                old_val = u["permissions"].get(permission_name, False)
                u["permissions"][permission_name] = value
                msg = f"Permission '{permission_name}' for user {username} updated from {old_val} to {value}."
            
            # Save and log statefully
            save_permissions(perms)
            write_signed_audit_log(
                "PERMISSION_CHANGE",
                msg,
                {"username": username, "permission": permission_name, "value": value}
            )
            
            # Broadcast the change via WebSockets so the client live-refreshes!
            perm_event = {
                "type": "PERMISSION_CHANGE",
                "username": username,
                "permission": permission_name,
                "value": value,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
            broadcast_event(perm_event)
            break
            
    if not user_found:
        return jsonify({"error": f"User {username} not found"}), 404
        
    return jsonify({"status": "ok", "permissions": perms})

@app.route('/api/permissions', methods=['GET'])
def api_get_permissions() -> object:
    return jsonify(get_permissions())

@app.route('/api/permissions/user', methods=['POST'])
def api_create_user() -> object:
    data = request.get_json()
    username = data.get("username")
    role = data.get("role")
    password = data.get("password", "password")
    viki_assigned = data.get("viki_assigned", False)
    
    if not username or not role:
        return jsonify({"error": "Missing username or role"}), 400
        
    perms = get_permissions()
    for u in perms["users"]:
        if u["username"].lower() == username.lower():
            return jsonify({"error": f"User '{username}' already exists"}), 400
            
    # Apply default template per role
    if role == "Cortex-Admins":
        default_perms = {
            "view_telemetry": True,
            "execute_playbooks": True,
            "run_qc_scans": True,
            "run_seo_scans": True,
            "run_web_audits": True,
            "edit_appointments": True,
            "edit_user_permissions": True
        }
    elif role == "Cortex-Technicians":
        default_perms = {
            "view_telemetry": True,
            "execute_playbooks": False,
            "run_qc_scans": False,
            "run_seo_scans": False,
            "run_web_audits": False,
            "edit_appointments": True,
            "edit_user_permissions": False
        }
    elif role == "Cortex-Management":
        default_perms = {
            "view_telemetry": True,
            "execute_playbooks": False,
            "run_qc_scans": True,
            "run_seo_scans": True,
            "run_web_audits": True,
            "edit_appointments": True,
            "edit_user_permissions": False
        }
    elif role == "Cortex-Office":
        default_perms = {
            "view_telemetry": False,
            "execute_playbooks": False,
            "run_qc_scans": False,
            "run_seo_scans": False,
            "run_web_audits": False,
            "edit_appointments": True,
            "edit_user_permissions": False
        }
    else: # Cortex-Designers
        default_perms = {
            "view_telemetry": True,
            "execute_playbooks": False,
            "run_qc_scans": True,
            "run_seo_scans": True,
            "run_web_audits": True,
            "edit_appointments": False,
            "edit_user_permissions": False
        }

    new_user = {
        "username": username,
        "role": role,
        "password": password,
        "viki_assigned": viki_assigned,
        "permissions": default_perms,
        "apps": DEFAULT_APPS.copy()
    }
    perms["users"].append(new_user)
    save_permissions(perms)
    
    write_signed_audit_log(
        "USER_CREATION",
        f"New user '{username}' created with role '{role}' in operational directory.",
        {"username": username, "role": role}
    )
    
    broadcast_event({
        "type": "PERMISSION_CHANGE",
        "action": "CREATE",
        "username": username,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    })
    
    return jsonify({"status": "ok", "permissions": perms})

@app.route('/api/permissions/user', methods=['DELETE'])
def api_delete_user() -> object:
    data = request.get_json()
    username = data.get("username")
    
    if not username:
        return jsonify({"error": "Missing username"}), 400
        
    perms = get_permissions()
    user_found = False
    
    for i, u in enumerate(perms["users"]):
        if u["username"].lower() == username.lower():
            user_found = True
            perms["users"].pop(i)
            break
            
    if not user_found:
        return jsonify({"error": f"User '{username}' not found"}), 404
        
    save_permissions(perms)
    
    write_signed_audit_log(
        "USER_DELETION",
        f"User '{username}' was deleted from operational directory.",
        {"username": username}
    )
    
    broadcast_event({
        "type": "PERMISSION_CHANGE",
        "action": "DELETE",
        "username": username,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    })
    
    return jsonify({"status": "ok", "permissions": perms})

@app.route('/api/mitigations/history', methods=['GET'])
def api_mitigations_history() -> object:
    """Reads security audit logging history from the Forensic BTRFS Data Lake."""
    audit_file = get_data_lake_path("audit/security_audit.jsonl")
    history = []
    if os.path.exists(audit_file):
        try:
            with open(audit_file, "r") as f:
                for line in f:
                    if line.strip():
                        history.append(json.loads(line.strip()))
        except Exception as e:
            print(f"[!] Error reading security_audit.jsonl: {e}", flush=True)
            
    # Return newest incidents first
    return jsonify(history[::-1])

@app.route('/api/permissions/password', methods=['POST'])
def api_set_password() -> object:
    data = request.get_json() or {}
    username = data.get("username")
    new_password = data.get("password")
    
    if not username or not new_password:
        return jsonify({"error": "Missing username or password"}), 400
        
    perms = get_permissions()
    user_found = False
    
    for u in perms["users"]:
        if u["username"].lower() == username.lower():
            u["password"] = new_password
            user_found = True
            break
            
    if not user_found:
        return jsonify({"error": f"User '{username}' not found"}), 404
        
    save_permissions(perms)
    write_signed_audit_log("PASSWORD_RESET", f"Password for user '{username}' was updated.", {"username": username})
    
    broadcast_event({
        "type": "PERMISSION_CHANGE",
        "action": "UPDATE_PASSWORD",
        "username": username,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    })
    
    return jsonify({"status": "ok", "permissions": perms})

@app.route('/api/permissions/me', methods=['GET'])
def api_get_current_user() -> object:
    username = request.headers.get("x-forwarded-user") or request.headers.get("remote-user") or request.headers.get("x-remote-user")
    if username:
        perms = get_permissions()
        for u in perms["users"]:
            if u["username"].lower() == username.lower():
                return jsonify({"status": "ok", "user": u})
        # If user is in Authelia but not in the permissions database, yield a default Cortex-Technicians schema
        default_user = {
            "username": username,
            "role": "Cortex-Technicians",
            "viki_assigned": False,
            "permissions": {
                "view_telemetry": True,
                "execute_playbooks": False,
                "run_qc_scans": False,
                "run_seo_scans": False,
                "run_web_audits": False,
                "edit_appointments": True,
                "edit_user_permissions": False
            }
        }
        return jsonify({"status": "ok", "user": default_user})
    return jsonify({"error": "No active SSO session"}), 401

@app.route('/api/permissions/login', methods=['POST'])
def api_login() -> object:
    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")
    
    if not username or not password:
        return jsonify({"error": "Missing username or password"}), 400
        
    perms = get_permissions()
    for u in perms["users"]:
        if u["username"].lower() == username.lower():
            if u.get("password", "password") == password:
                write_signed_audit_log("USER_LOGIN", f"User '{username}' logged in successfully.", {"username": username})
                return jsonify({"status": "ok", "user": u})
            else:
                write_signed_audit_log("FAILED_LOGIN", f"Failed login attempt for user '{username}' (incorrect password).", {"username": username})
                return jsonify({"error": "Invalid credentials"}), 401
                
    write_signed_audit_log("FAILED_LOGIN", f"Failed login attempt for non-existent user '{username}'.", {"username": username})
    return jsonify({"error": "User not found"}), 404

# Initialize baseline logs if needed
init_audit_log_if_empty()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=9090)
