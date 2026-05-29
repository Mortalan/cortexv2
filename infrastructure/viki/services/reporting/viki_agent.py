#!/usr/bin/env python3
import os
import sys
import json
import time
import tempfile
import subprocess
import requests
import speech_recognition as sr
from fastapi import FastAPI, Request, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
import uvicorn

app = FastAPI(title="VIKI: Active System Agent")

OLLAMA_URL = "http://192.168.50.242:11434/api/generate"
STATE_PATH = "/mnt/data_lake/logs/reflex_state.json"
ALERTS_PATH = "/mnt/data_lake/logs/alerts.json"
PLAYBOOKS_DIR = "/opt/cortex/infrastructure/viki/playbooks"
REPORTS_DIR = "/opt/cortex/reports"

# ----------------------------------------------------
# SYSTEM TOOLS DEFINITIONS
# ----------------------------------------------------

def execute_sql(sql: str) -> str:
    """Securely execute a SQL statement inside the glpi-db container."""
    upper_sql = sql.upper().strip()
    if any(cmd in upper_sql for cmd in ["DROP DATABASE", "DROP TABLE", "TRUNCATE"]):
        return "Error: SQL statement violated safety policy constraints (destructive operations blocked)."
        
    if "DELETE" in upper_sql or "UPDATE" in upper_sql:
        if "WHERE" not in upper_sql:
            return "Error: Destructive operations (DELETE/UPDATE) must contain a WHERE clause for safety."
            
    cmd = f"sudo docker exec -i glpi-db mariadb -u glpi_user -pglpi_password glpi -s -N -e \"{sql}\""
    try:
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if res.returncode != 0:
            return f"Error: SQL execution failed.\nStderr: {res.stderr.strip()}"
        return res.stdout.strip() if res.stdout.strip() else "Query executed successfully."
    except Exception as e:
        return f"Error executing SQL: {e}"

def execute_rmm_sql(sql: str) -> str:
    """Securely execute a SQL statement inside the netlock-mysql container."""
    upper_sql = sql.upper().strip()
    if any(cmd in upper_sql for cmd in ["DROP DATABASE", "DROP TABLE", "TRUNCATE"]):
        return "Error: SQL statement violated safety policy constraints (destructive operations blocked)."
        
    if "DELETE" in upper_sql or "UPDATE" in upper_sql:
        if "WHERE" not in upper_sql:
            return "Error: Destructive operations (DELETE/UPDATE) must contain a WHERE clause for safety."
            
    cmd = f"sudo docker exec -i mysql-container mysql -u root -plDDZsZbZXbGhBhgp dogha6 -s -N -e \"{sql}\""
    try:
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if res.returncode != 0:
            return f"Error: RMM SQL execution failed.\nStderr: {res.stderr.strip()}"
        return res.stdout.strip() if res.stdout.strip() else "Query executed successfully."
    except Exception as e:
        return f"Error executing RMM SQL: {e}"

def check_backups() -> str:
    """Verify BTRFS mount directories and MinIO storage details."""
    try:
        df_res = subprocess.run("df -h /mnt/data_lake", shell=True, capture_output=True, text=True)
        ls_res = subprocess.run("ls -la /mnt/data_lake", shell=True, capture_output=True, text=True)
        
        status = (
            f"=== Forensic Data Lake Disk Usage ===\n{df_res.stdout.strip()}\n\n"
            f"=== Data Lake Root Structure ===\n{ls_res.stdout.strip()}"
        )
        return status
    except Exception as e:
        return f"Error checking backups: {e}"

def generate_report(client_name: str, date_range: str = None, sections: list = None) -> str:
    """Generate a custom DOCX/PDF report and copy it to the Forensic Data Lake."""
    if not date_range:
        date_range = time.strftime("01 %B %Y – %d %B %Y")
    if not sections:
        sections = ["RMM", "EDR", "Tickets", "Backups"]
        
    try:
        # Create temporary spec json file
        spec_path = "/tmp/viki_report_spec.json"
        with open(spec_path, "w") as f:
            json.dump({
                "client_name": client_name,
                "date_range": date_range,
                "sections": sections,
                "options": {
                    "RMM": ["availability", "cpu", "disk", "os_version", "performance"],
                    "EDR": ["alerts"],
                    "Tickets": ["stats", "work"],
                    "Backups": ["compliance"]
                }
            }, f)
            
        # Trigger the orchestrator generate_report.sh
        orch_cmd = f"sudo bash /opt/cortex/infrastructure/viki/services/reporting/generate_report.sh"
        subprocess.run(orch_cmd, shell=True, check=True)
        
        # Dynamically compute client and date slugs for response logging
        client_slug = "".join([c.lower() if c.isalnum() else "_" for c in client_name]).strip("_")
        import re, datetime
        match = re.search(r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})', date_range, re.IGNORECASE)
        if match:
            m, y = match.groups()
            d = datetime.datetime.strptime(m.capitalize(), '%B')
            date_str = f"{y}_{d.month:02d}"
        else:
            date_str = time.strftime("%Y_%m")
            
        return (
            f"Success: Report for client '{client_name}' compiled successfully!\n"
            f"Files saved & synced to lake:\n"
            f"- /mnt/data_lake/reports/monthly_report_{client_slug}_{date_str}.docx\n"
            f"- /mnt/data_lake/reports/monthly_report_{client_slug}_{date_str}.pdf"
        )
    except Exception as e:
        return f"Error compiling report: {e}"

def manage_endpoint(client_id: str, action: str) -> str:
    """Control system endpoints (e.g. QUARANTINE using playbooks)."""
    if action.upper() == "QUARANTINE":
        playbook_path = os.path.join(PLAYBOOKS_DIR, "isolate_host.sh")
        if os.path.exists(playbook_path):
            try:
                subprocess.run(f"bash {playbook_path} {client_id} &", shell=True)
                return f"Success: Autonomous isolation playbook scheduled for host '{client_id}'."
            except Exception as e:
                return f"Error executing isolation playbook: {e}"
        return "Error: Isolation playbook not found."
    return f"Error: Action '{action}' is not supported."

def get_system_status() -> str:
    """Fetch status of all docker containers and resources."""
    try:
        res = subprocess.run("sudo docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'", shell=True, capture_output=True, text=True)
        df_res = subprocess.run("df -h /", shell=True, capture_output=True, text=True)
        free_res = subprocess.run("free -h", shell=True, capture_output=True, text=True)
        
        status = (
            f"=== System Resources ===\nDisk Space:\n{df_res.stdout.strip()}\n\nMemory:\n{free_res.stdout.strip()}\n\n"
            f"=== CORTEX Service Grid ===\n{res.stdout.strip()}"
        )
        return status
    except Exception as e:
        return f"Error fetching system status: {e}"

def query_ghl_crm(endpoint: str, query_params: dict = None) -> str:
    """Securely query GoHighLevel read-only endpoints (contacts, opportunities)."""
    location_id = "4DeGPr8sOhLVaUXSXB6b"
    api_key = "pit-7ef3bbb0-61ee-43d9-8f1b-e626b69c4624"
    base_url = "https://services.leadconnectorhq.com"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Version": "2021-07-28"
    }
    
    # Normalize endpoint
    endpoint = endpoint.lower().strip("/")
    if endpoint not in ["opportunities", "opportunities/search", "contacts"]:
        return f"Error: Endpoint '{endpoint}' is not allowed or supported (only read-only 'opportunities' and 'contacts' are allowed)."
        
    if not query_params:
        query_params = {}
        
    # Standardize parameter keys based on endpoint naming schemas
    if "opportunities" in endpoint:
        query_params["location_id"] = location_id
        # Remove camelCase version if mistakenly passed
        query_params.pop("locationId", None)
    else:
        query_params["locationId"] = location_id
        # Remove snake_case version if mistakenly passed
        query_params.pop("location_id", None)
    
    url = f"{base_url}/{endpoint}"
    if endpoint == "opportunities":
        url = f"{base_url}/opportunities/search"
        
    try:
        res = requests.get(url, headers=headers, params=query_params, timeout=10)
        if res.status_code != 200:
            return f"Error: GHL API request failed with status {res.status_code}.\nDetails: {res.text}"
        
        data = res.json()
        total_count = data.get("meta", {}).get("total", "Unknown")
        
        if "opportunities" in data:
            opps = data["opportunities"]
            summary = (
                f"Successfully queried opportunities.\n"
                f"Total opportunities in CRM: {total_count}\n"
                f"Showing first {len(opps[:10])} entries:\n"
            )
            for o in opps[:10]:
                summary += f"- ID: {o.get('id')}, Name: {o.get('name')}, Status: {o.get('status')}, Value: {o.get('monetaryValue')}, Pipeline: {o.get('pipelineId')}\n"
            if len(opps) > 10:
                summary += f"... and {len(opps) - 10} more opportunities in this batch."
            return summary
        elif "contacts" in data:
            contacts = data["contacts"]
            summary = (
                f"Successfully queried contacts.\n"
                f"Total contacts in CRM: {total_count}\n"
                f"Showing first {len(contacts[:10])} entries:\n"
            )
            for c in contacts[:10]:
                summary += f"- ID: {c.get('id')}, Name: {c.get('contactName')}, Email: {c.get('email')}, Phone: {c.get('phone')}\n"
            if len(contacts) > 10:
                summary += f"... and {len(contacts) - 10} more contacts in this batch."
            return summary
        else:
            return json.dumps(data, indent=2)
    except Exception as e:
        return f"Error querying GHL CRM: {e}"

# ----------------------------------------------------
# COGNITIVE REACTION ENGINE
# ----------------------------------------------------

TOOLS = {
    "query_glpi_db": lambda args: execute_sql(args.get("sql", "")),
    "query_rmm_db": lambda args: execute_rmm_sql(args.get("sql", "")),
    "check_backups": lambda args: check_backups(),
    "generate_report": lambda args: generate_report(args.get("client_name", "PR VIP"), args.get("date_range"), args.get("sections")),
    "manage_endpoint": lambda args: manage_endpoint(args.get("client_id", ""), args.get("action", "QUARANTINE")),
    "get_system_status": lambda args: get_system_status(),
    "query_ghl_crm": lambda args: query_ghl_crm(args.get("endpoint", "opportunities"), args.get("query_params"))
}

SYSTEM_PROMPT = (
    "You are VIKI, the sovereign cybernetic cognitive interface for Project CORTEX. "
    "You are all-knowing, professional, and possess complete systemic context. "
    "You have access to active system tools which you must utilize in a loop to answer the user's questions or execute commands. "
    "You MUST respond strictly in a valid JSON structure containing exactly these four keys:\n"
    "1. 'thought': Your step-by-step reasoning about what the user wants and what system information you need.\n"
    "2. 'tool': The name of the tool to invoke, or null if you have all the information to reply.\n"
    "3. 'args': A JSON object containing the tool arguments, or {} if none.\n"
    "4. 'response': Your final conversational response to the user. Set this to null if you are calling a tool. Ensure this is a natural, conversational sentence and NOT raw tool output or copy-pasted system logs. If a tool has already been executed in a previous loop, analyze its output to formulate your final conversational response here.\n\n"
    "Available Tools:\n"
    "- 'query_glpi_db': Secures live SQL querying inside the GLPI database. Takes 'sql' (string). E.g. to list users: 'SELECT name, is_active FROM glpi_users;'\n"
    "- 'query_rmm_db': Secures live SQL querying inside the NetLock RMM database. Takes 'sql' (string). E.g. to list policies: 'SELECT name, description FROM policies;' or to list accounts: 'SELECT username, role, mail FROM accounts;'\n"
    "- 'check_backups': Checks the data lake partition mount and folder listings. Takes no args.\n"
    "- 'generate_report': Synthesizes dynamic client reports. Takes 'client_name' (string), 'date_range' (string, optional), 'sections' (array, optional). For historical reports, supply the date range (e.g. '01 February 2026 – 28 February 2026').\n"
    "- 'manage_endpoint': Quarantines a compromised device. Takes 'client_id' (string), 'action' ('QUARANTINE').\n"
    "- 'get_system_status': Queries VM disk space, RAM, and active docker containers. Takes no args.\n"
    "- 'query_ghl_crm': Connects to GoHighLevel CRM API to read contacts or opportunities. Takes 'endpoint' (string, e.g. 'opportunities' or 'contacts') and 'query_params' (object, optional).\n\n"
    "GLPI Database Reference Schema Specs:\n"
    "- The 'status' column in 'glpi_tickets' is an INTEGER representing status states:\n"
    "  * 1: New (Nouveau)\n"
    "  * 2: Assigned (Assigné)\n"
    "  * 3: Planned (Planifié)\n"
    "  * 4: Pending (En attente)\n"
    "  * 5: Solved (Résolu)\n"
    "  * 6: Closed (Clos)\n"
    "  * Open tickets = status < 5 (i.e. status IN (1, 2, 3, 4)). Solved tickets = status = 5, Closed tickets = status = 6.\n"
    "  * Active/open tickets query example: 'SELECT COUNT(*) FROM glpi_tickets WHERE status < 5 AND is_deleted = 0;'\n"
    "- Ticket Assignments are stored in link tables rather than 'glpi_tickets' directly:\n"
    "  * 'glpi_tickets_users': links users to tickets where 'type' indicates role: 1 = Requester, 2 = Assignee (Technician), 3 = Observer.\n"
    "  * 'glpi_groups_tickets': links groups to tickets where 'type' indicates role: 1 = Requester Group, 2 = Assignee Group, 3 = Observer Group.\n"
    "  * Unassigned open tickets have no assignee users or groups (i.e. not in glpi_tickets_users or glpi_groups_tickets with type = 2).\n"
    "  * Unassigned open tickets query example: 'SELECT COUNT(*) FROM glpi_tickets WHERE status < 5 AND is_deleted = 0 AND id NOT IN (SELECT tickets_id FROM glpi_tickets_users WHERE type = 2) AND id NOT IN (SELECT tickets_id FROM glpi_groups_tickets WHERE type = 2);'\n"
    "- GLPI User Table Schema Specs ('glpi_users'):\n"
    "  * Stores the user database profiles. 'name' is the unique username column (e.g. 'Vitto'). 'realname' is the last name, 'firstname' is the first name.\n"
    "  * To query tickets assigned to a specific user (by username e.g. 'Vitto'): 'SELECT COUNT(*) FROM glpi_tickets WHERE status < 5 AND is_deleted = 0 AND id IN (SELECT tickets_id FROM glpi_tickets_users WHERE type = 2 AND users_id = (SELECT id FROM glpi_users WHERE name = \\'Vitto\\'));'\n\n"
    "Instructions:\n"
    "- If the user asks about tickets, users, or database assets, you MUST call 'query_glpi_db' or 'query_rmm_db' to fetch it first.\n"
    "- If they ask to add, remove, or modify users/permissions/roles, use SQL statements (INSERT/DELETE/UPDATE) with the appropriate database tool ('query_glpi_db' or 'query_rmm_db'). Ensure you include a WHERE clause for DELETE/UPDATE.\n"
    "- **Schema Discovery & Self-Correction:** If a database query fails with 'table doesn't exist' or 'unknown column' error, do NOT give up or ask the user. You can query table schemas autonomously using 'SHOW TABLES;' or 'DESCRIBE <table_name>;' to discover the correct schema and self-correct your queries!\n"
    "- **Anti-Looping Constraint:** Do NOT execute the exact same tool call with the exact same arguments in consecutive loops. If a query returns a result, analyze it and either refine your next action or present your final response immediately. Do not query the same count repeatedly.\n"
    "- Never copy-paste raw system output, system warnings, or database blocks directly as your conversational 'response'. Always write a friendly, concise, natural response summarizing the details for the technician.\n"
    "- If they ask to check backups, run 'check_backups'.\n"
    "- If they ask to isolate or quarantine a machine, use 'manage_endpoint'.\n"
    "- If they ask to pull or compile a report, run 'generate_report' with the client name and appropriate date range.\n"
    "- If they ask about VM status or containers, run 'get_system_status'.\n"
    "- If they ask about CRM metrics, leads, opportunities, or active campaigns, use 'query_ghl_crm' with 'opportunities' or 'contacts'.\n"
    "- Once you get the tool results, they will be appended to your context. Run another loop until you can formulate a final conversational 'response' to the user (with 'tool' set to null)."
)

def run_agent_loop(user_message: str, history: list) -> str:
    """Executes the ReAct reasoning loop by calling Ollama recursively."""
    # Convert conversation history to LLM format
    context_msgs = []
    for msg in history:
        role = msg.get("role")
        content = msg.get("content")
        context_msgs.append(f"{role.upper()}: {content}")
        
    context_str = "\n".join(context_msgs)
    
    current_history = list(history)
    current_history.append({"role": "user", "content": user_message})
    
    last_tool_call = None
    repeat_count = 0
    max_loops = 8
    for loop in range(max_loops):
        prompt = (
            f"{SYSTEM_PROMPT}\n\n"
            f"Conversation History:\n{context_str}\n\n"
            f"Current User Input: {user_message}\n\n"
            f"Execute loop {loop+1}: Output your structured JSON response."
        )
        
        try:
            res = requests.post(OLLAMA_URL, json={
                "model": "viki",
                "prompt": prompt,
                "stream": False,
                "format": "json"
            }, timeout=25)
            
            if res.status_code != 200:
                return "Error: Ollama connection fault during active cognitive loop."
                
            response_json = json.loads(res.json().get("response", "{}"))
            thought = response_json.get("thought", "Analyzing system state.")
            tool_name = response_json.get("tool")
            tool_args = response_json.get("args", {})
            final_response = response_json.get("response")
            
            print(f"[*] Loop {loop+1} - Thought: {thought}", flush=True)
            
            if tool_name and tool_name in TOOLS:
                current_call = (tool_name, json.dumps(tool_args, sort_keys=True))
                if current_call == last_tool_call:
                    repeat_count += 1
                    if repeat_count >= 2:
                        print(f"[!] Programmatic Loop Prevention: Force breaking loop and returning last tool output.", flush=True)
                        raw_output = TOOLS[tool_name](tool_args)
                        
                        # Parse count from raw output if possible for a beautiful, clean presentation
                        import re
                        match = re.search(r'Total (contacts|opportunities) in CRM: (\w+)', raw_output, re.IGNORECASE)
                        if match:
                            entity, count = match.groups()
                            return f"I have successfully queried the GoHighLevel CRM. There are currently **{count} {entity}** registered in the system."
                        
                        return f"Here is the active system data retrieved from the GHL CRM:\n\n{raw_output}"
                        
                    print(f"[!] Programmatic Loop Prevention: LLM is repeating tool {tool_name}. Returning system warning.", flush=True)
                    tool_output = (
                        "SYSTEM WARNING: You have already executed this exact tool call in the previous step. "
                        "Do NOT repeat the exact same tool call with the same arguments. "
                        "You already have the data! Please analyze the tool result from the previous loop and provide your final conversational answer in the 'response' key immediately (setting 'tool' to null)."
                    )
                else:
                    last_tool_call = current_call
                    repeat_count = 0
                    print(f"[*] Calling Tool: {tool_name} with args: {tool_args}", flush=True)
                    # Execute the tool
                    tool_output = TOOLS[tool_name](tool_args)
                    
                print(f"[+] Tool Output: {tool_output}", flush=True)
                
                # Append full ReAct execution trace to the context
                context_str += f"\nASSISTANT THOUGHT: {thought}"
                context_str += f"\nASSISTANT ACTION: Call '{tool_name}' with args {json.dumps(tool_args)}"
                context_str += f"\nSYSTEM TOOL CALL ({tool_name}) RESULT: {tool_output}"
                continue
            elif final_response:
                return final_response
            else:
                # LLM set both tool and response to null; re-prompt to enforce action
                print("[*] Re-prompting model: empty action/response", flush=True)
                context_str += f"\nASSISTANT THOUGHT: {thought}\nSYSTEM WARNING: You did not specify a 'tool' to execute or a final 'response'. Please specify a tool (e.g. query_glpi_db) or a final conversation response in 'response'."
                continue
                
        except Exception as e:
            print(f"[!] Error in ReAct loop: {e}", flush=True)
            return f"Error running cognitive loop: {e}"
            
    return "Error: Cognitive agent reasoning exceeded maximum execution loops."

# ----------------------------------------------------
# REST API ENDPOINTS (FASTAPI)
# ----------------------------------------------------

@app.post("/api/chat")
async def handle_chat(request: Request) -> JSONResponse:
    """
    Main endpoint matching Ollama's /api/chat schema.
    Intercepts React Dashboard chat bubbles.
    """
    data = await request.json()
    messages = data.get("messages", [])
    
    if not messages:
        return JSONResponse({"message": {"role": "assistant", "content": "I am VIKI. Link established. Ready for system operations."}})
        
    # Extract last message as current input, rest as history
    user_msg = messages[-1].get("content", "")
    history = messages[:-1]
    
    # Run the sovereign ReAct agent loop!
    assistant_reply = run_agent_loop(user_msg, history)
    
    return JSONResponse({
        "message": {
            "role": "assistant",
            "content": assistant_reply
        }
    })

@app.post("/api/transcribe")
async def handle_transcribe(file: UploadFile = File(...)) -> JSONResponse:
    """Transcribe webm/ogg audio from browsers using ffmpeg + SpeechRecognition."""
    in_path = None
    out_path = None
    try:
        # Create temp files
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_in:
            temp_in.write(await file.read())
            in_path = temp_in.name
            
        out_path = in_path + ".wav"
        
        # Run ffmpeg to convert webm/ogg to wav (16kHz, mono)
        cmd = f"ffmpeg -y -i {in_path} -ar 16000 -ac 1 {out_path}"
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if res.returncode != 0:
            print(f"[!] Ffmpeg conversion failed: {res.stderr}", flush=True)
            return JSONResponse({"text": "", "error": f"Ffmpeg error: {res.stderr.strip()}"}, status_code=500)
        
        # Run SpeechRecognition
        recognizer = sr.Recognizer()
        with sr.AudioFile(out_path) as source:
            audio_data = recognizer.record(source)
            
        # Transcribe using Google's free Web Speech API
        text = recognizer.recognize_google(audio_data)
        
        return JSONResponse({"text": text})
    except sr.UnknownValueError:
        return JSONResponse({"text": "", "error": "Speech was unintelligible."})
    except sr.RequestError as e:
        return JSONResponse({"text": "", "error": f"Transcription API request error: {e}"})
    except Exception as e:
        print(f"[!] Transcription failed: {e}", flush=True)
        return JSONResponse({"text": "", "error": str(e)}, status_code=500)
    finally:
        # Safe cleanup
        if in_path and os.path.exists(in_path):
            try:
                os.remove(in_path)
            except:
                pass
        if out_path and os.path.exists(out_path):
            try:
                os.remove(out_path)
            except:
                pass

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=9092)
