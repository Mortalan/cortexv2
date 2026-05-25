import os
import time
import json
import requests
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
import uvicorn

app = FastAPI(title="Hermes Agent: Cognitive Dispatcher")

OLLAMA_URL = "http://192.168.50.242:11434/api/generate"
STATE_PATH = "/mnt/data_lake/logs/reflex_state.json"
INCIDENTS_LOG = "/mnt/data_lake/logs/hermes_incidents.json"
PLAYBOOKS_DIR = "/opt/cortex/infrastructure/viki/playbooks"

def load_incidents():
    if os.path.exists(INCIDENTS_LOG):
        try:
            with open(INCIDENTS_LOG, "r") as f:
                return json.load(f)
        except:
            return []
    return []

def save_incidents(incidents):
    os.makedirs(os.path.dirname(INCIDENTS_LOG), exist_ok=True)
    with open(INCIDENTS_LOG, "w") as f:
        json.dump(incidents, f)

@app.get("/", response_class=HTMLResponse)
async def serve_dashboard():
    incidents = load_incidents()
    incidents_list_html = ""
    for inc in reversed(incidents[-10:]):
        severity_class = inc.get("severity", "info").lower()
        action_class = inc.get("action", "ignored").lower()
        incidents_list_html += f"""
        <div class="incident-item {severity_class}">
            <div class="inc-header">
                <span class="inc-time font-space">{inc.get('timestamp')}</span>
                <span class="inc-source font-space">[{inc.get('source', 'EDR')}]</span>
                <span class="inc-badge font-space action-{action_class}">{inc.get('action')}</span>
            </div>
            <p class="inc-msg">{inc.get('message')}</p>
            <div class="inc-reason font-space">Reasoning: {inc.get('reasoning')}</div>
        </div>
        """
        
    if not incidents_list_html:
        incidents_list_html = "<div class='empty-logs font-space'>NO ACTIVE INCIDENTS IN COGNITIVE PERSISTENCE</div>"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Hermes Agent: Operations Command</title>
        <meta charset="utf-8">
        <style>
            body {{
                margin: 0;
                background-color: #080c14;
                color: #e2e8f0;
                font-family: 'Arial', sans-serif;
                height: 100vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }}
            .font-space {{
                font-family: 'Courier New', Courier, monospace;
            }}
            header {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.2rem 2rem;
                background: rgba(8, 12, 20, 0.9);
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                backdrop-filter: blur(10px);
            }}
            header h1 {{
                margin: 0;
                font-size: 1.4rem;
                letter-spacing: 2px;
                text-shadow: 0 0 10px rgba(27, 54, 93, 0.8);
            }}
            header .subtitle {{
                margin: 0.1rem 0 0 0;
                font-size: 0.8rem;
                color: #718096;
            }}
            .status-indicator {{
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.8rem;
                color: #2e7559;
                border: 1px solid rgba(46, 117, 89, 0.4);
                padding: 0.4rem 0.8rem;
                border-radius: 4px;
                background: rgba(46, 117, 89, 0.05);
            }}
            .pulse-dot {{
                width: 8px;
                height: 8px;
                background-color: #2e7559;
                border-radius: 50%;
                animation: pulse 1.5s infinite;
            }}
            @keyframes pulse {{
                0% {{ transform: scale(0.9); opacity: 0.5; }}
                50% {{ transform: scale(1.2); opacity: 1; }}
                100% {{ transform: scale(0.9); opacity: 0.5; }}
            }}
            .layout {{
                display: grid;
                grid-template-columns: 450px 1fr;
                gap: 1.5rem;
                padding: 1.5rem;
                flex: 1;
                overflow: hidden;
                box-sizing: border-box;
            }}
            .glassmorphic {{
                background: rgba(18, 24, 38, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                backdrop-filter: blur(15px);
                box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                box-sizing: border-box;
                padding: 1.5rem;
            }}
            .panel-title {{
                font-size: 1rem;
                letter-spacing: 1px;
                margin: 0 0 1.2rem 0;
                color: #ffffff;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                padding-bottom: 0.5rem;
            }}
            .simulation-form {{
                display: flex;
                flex-direction: column;
                gap: 1rem;
                flex: 1;
            }}
            textarea {{
                background: rgba(11, 15, 25, 0.7);
                border: 1px solid rgba(27, 54, 93, 0.4);
                border-radius: 4px;
                color: #e2e8f0;
                padding: 0.8rem;
                font-size: 0.85rem;
                outline: none;
                flex: 1;
                resize: none;
                transition: all 0.3s ease;
            }}
            textarea:focus {{
                border-color: rgba(27, 54, 93, 0.8);
                box-shadow: 0 0 8px rgba(27, 54, 93, 0.4);
            }}
            .triage-btn {{
                background: linear-gradient(135deg, #1b365d 0%, #2e7559 100%);
                border: none;
                color: #ffffff;
                padding: 0.9rem;
                font-size: 0.85rem;
                font-weight: bold;
                border-radius: 4px;
                cursor: pointer;
                letter-spacing: 1px;
                transition: all 0.3s ease;
            }}
            .triage-btn:hover {{
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(46, 117, 89, 0.3);
            }}
            .logs-panel {{
                overflow-y: auto;
            }}
            .logs-panel::-webkit-scrollbar {{
                width: 6px;
            }}
            .logs-panel::-webkit-scrollbar-thumb {{
                background: rgba(27, 54, 93, 0.4);
                border-radius: 3px;
            }}
            .incident-item {{
                border: 1px solid rgba(255, 255, 255, 0.03);
                background: rgba(255, 255, 255, 0.01);
                border-radius: 6px;
                margin-bottom: 1rem;
                padding: 1rem;
                transition: all 0.3s ease;
            }}
            .incident-item.critical {{
                border-color: rgba(165, 0, 0, 0.3);
                background: rgba(165, 0, 0, 0.03);
            }}
            .incident-item.warning {{
                border-color: rgba(197, 90, 17, 0.3);
                background: rgba(197, 90, 17, 0.03);
            }}
            .inc-header {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.6rem;
            }}
            .inc-time {{
                font-size: 0.75rem;
                color: #718096;
            }}
            .inc-source {{
                font-size: 0.75rem;
                color: #1b365d;
                font-weight: bold;
            }}
            .inc-badge {{
                font-size: 0.7rem;
                font-weight: bold;
                padding: 0.2rem 0.5rem;
                border-radius: 4px;
            }}
            .inc-badge.action-quarantine {{
                background: #a50000;
                color: #ffffff;
            }}
            .inc-badge.action-alerted {{
                background: #c55a11;
                color: #ffffff;
            }}
            .inc-badge.action-resolved {{
                background: #2e7559;
                color: #ffffff;
            }}
            .inc-badge.action-ignored {{
                background: #4a5568;
                color: #ffffff;
            }}
            .inc-msg {{
                margin: 0 0 0.8rem 0;
                font-size: 0.9rem;
                color: #ffffff;
            }}
            .inc-reason {{
                font-size: 0.75rem;
                color: #a0aec0;
                line-height: 1.4;
                background: rgba(0, 0, 0, 0.2);
                padding: 0.5rem;
                border-radius: 4px;
                border-left: 2px solid rgba(27, 54, 93, 0.8);
            }}
            .empty-logs {{
                text-align: center;
                color: #4a5568;
                padding: 4rem 0;
                font-size: 0.9rem;
            }}
            .hud-scan-line {{
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 2px;
                background: rgba(27, 54, 93, 0.1);
                opacity: 0.3;
                animation: scan 4s linear infinite;
                pointer-events: none;
            }}
            @keyframes scan {{
                from {{ top: 0; }}
                to {{ top: 100%; }}
            }}
        </style>
        <script>
            async function runTriage(event) {{
                event.preventDefault();
                const btn = document.getElementById('btn-triage');
                const text = document.getElementById('payload-input').value;
                if (!text.trim()) return;

                btn.disabled = true;
                btn.innerText = "QUERYING COGNITIVE NEURAL RETRIEVAL...";

                try {{
                    let payload = JSON.parse(text);
                    const res = await fetch("/api/hermes/triage", {{
                        method: "POST",
                        headers: {{ "Content-Type": "application/json" }},
                        body: JSON.stringify(payload)
                    }});
                    const data = await res.json();
                    alert("Cognitive Triage Complete! Action Decided: " + data.action + "\\nReasoning: " + data.reasoning);
                    window.location.reload();
                }} catch(e) {{
                    alert("Triage Execution Fault: " + e.message);
                }} finally {{
                    btn.disabled = false;
                    btn.innerText = "RUN AUTONOMOUS TRIAGE";
                }}
            }}
        </script>
    </head>
    <body>
        <div class="hud-scan-line"></div>
        <header>
            <div class="title-group">
                <h1 class="font-space">HERMES DISPATCH CONSOLE</h1>
                <p class="subtitle">Stateful Agentic Telemetry Diagnostic Gateway</p>
            </div>
            <div class="status-indicator font-space">
                <div class="pulse-dot"></div>
                OLLAMA MODEL READY: viki:latest
            </div>
        </header>

        <div class="layout">
            <!-- Left Pane: Triage Simulator -->
            <div class="glassmorphic">
                <h2 class="panel-title font-space">TRIAGE SIMULATOR</h2>
                <form class="simulation-form" onsubmit="runTriage(event)">
                    <p style="font-size: 0.8rem; color: #718096; margin: 0 0 0.5rem 0; line-height: 1.4;">
                        Paste raw JSON telemetry log payloads here to simulate active cognitive dispatching analysis.
                    </p>
                    <textarea id="payload-input" class="font-space" placeholder='{{"severity": "CRITICAL", "client_id": "C-101", "message": "Mimikatz credential dumping detected"}}'></textarea>
                    <button id="btn-triage" type="submit" class="triage-btn font-space">RUN AUTONOMOUS TRIAGE</button>
                </form>
            </div>

            <!-- Right Pane: Active Incidents Log -->
            <div class="glassmorphic logs-panel">
                <h2 class="panel-title font-space">ACTIVE DIAGNOSTIC LOGS</h2>
                <div class="incidents-container">
                    {incidents_list_html}
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    return html_content

@app.post("/api/hermes/triage")
async def handle_triage(request: Request):
    """
    Stateful triage endpoint: Ingests unstructured alerts, 
    queries Ollama's 'viki' context model, and returns action directives.
    """
    data = await request.get_json()
    if not data:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
        
    severity = str(data.get("severity", "INFO")).upper()
    message = str(data.get("message", ""))
    client_id = data.get("client_id") or data.get("hostname") or data.get("target", "unknown")
    source = data.get("source", "EDR")
    
    # 1. Prompting the local Ollama viki model for structural decision making
    system_prompt = (
        "You are Hermes, the active sovereign cognitive dispatcher for Project CORTEX. "
        "Your task is to analyze telemetry logs and decide which mitigation action to schedule. "
        "You must respond strictly in JSON format with two keys:\n"
        "1. 'action': This must be exactly one of: 'QUARANTINE', 'ALERT', 'RESOLVE', or 'IGNORE'.\n"
        "2. 'reasoning': A brief 1-2 sentence explanation of your diagnostic logic.\n\n"
        "Rules:\n"
        "- If EDR indicators flag Mimikatz, active malware, quarantine, or brute-force, choose 'QUARANTINE'.\n"
        "- If there are general warnings, memory spikes, or disk warnings, choose 'ALERT'.\n"
        "- If it is a standard installer warning or typical process, choose 'IGNORE'.\n"
        "- If EDR states that a process was quarantined or successfully blocked by policy, choose 'RESOLVE'."
    )
    
    prompt = f"Triage Alert Analysis Request:\nSource: {source}\nHost ID: {client_id}\nSeverity: {severity}\nLog Message: {message}"
    
    action = "IGNORE"
    reasoning = "LLM inference skipped; fallback parameters applied."
    
    try:
        res = requests.post(OLLAMA_URL, json={
            "model": "viki",
            "prompt": f"{system_prompt}\n\n{prompt}",
            "stream": False,
            "format": "json"
        }, timeout=15)
        
        if res.status_code == 200:
            result_json = json.loads(res.json().get("response", "{}"))
            action = str(result_json.get("action", "IGNORE")).upper()
            reasoning = result_json.get("reasoning", "Inference parsed.")
    except Exception as e:
        print(f"[!] Ollama cognitive inference query failed: {e}", flush=True)
        # Fallback static heuristics if Ollama is loading/offline
        if "MIMIKATZ" in message.upper() or "MALWARE" in message.upper():
            action = "QUARANTINE"
            reasoning = "Local heuristic bypass triggered: High-severity indicator detected."
        elif severity == "CRITICAL":
            action = "ALERT"
            reasoning = "Local heuristic bypass triggered: Critical severity elevation."

    # 2. Trigger Active Playbooks if action requires quarantine
    if action == "QUARANTINE" and client_id != "unknown":
        playbook_path = os.path.join(PLAYBOOKS_DIR, "isolate_host.sh")
        if os.path.exists(playbook_path):
            os.system(f"bash {playbook_path} {client_id} &")
            reasoning += " (Isolation Playbook executed dynamically on host.)"
            
            # Forward telemetry update to Reflex Daemon to highlight in HUD
            try:
                requests.post("http://localhost:9090/api/telemetry", json={
                    "severity": "CRITICAL",
                    "source": "HERMES",
                    "client_id": client_id,
                    "message": f"Autonomous Quarantine scheduled by Hermes Agent reasoning: {reasoning}"
                }, timeout=3)
            except:
                pass

    # 3. Log Incident in Persistence
    incidents = load_incidents()
    incidents.append({
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "severity": severity,
        "source": source,
        "message": message,
        "action": action,
        "reasoning": reasoning
    })
    save_incidents(incidents[-50:]) # Keep last 50
    
    return JSONResponse({
        "status": "success",
        "action": action,
        "reasoning": reasoning
    })

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000)
