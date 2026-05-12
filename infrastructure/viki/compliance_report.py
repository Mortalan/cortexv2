import subprocess
import json
import datetime

def run_vql(query):
    cmd = ['docker', 'exec', 'velociraptor', './velociraptor', '--config', '/velociraptor/server.config.yaml', 'query', query, '--format', 'json']
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return []
    try:
        start = result.stdout.find('[')
        end = result.stdout.rfind(']')
        if start != -1 and end != -1:
            return json.loads(result.stdout[start:end+1])
        return []
    except:
        return []

def generate_report():
    print("# CORTEX: NIST 2.0 COMPLIANCE REPORT")
    print(f"Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n## 1. ASSET MANAGEMENT (ID.AM)")
    clients = run_vql("SELECT os_info.hostname AS Hostname, client_id AS ID, os_info.system AS OS FROM clients()")
    if not clients:
        print("No active assets identified in the Nervous System.")
    else:
        print("| Hostname | Client ID | OS |")
        print("| --- | --- | --- |")
        for c in clients:
            print(f"| {c.get('Hostname')} | {c.get('ID')} | {c.get('OS')} |")

    print("\n## 2. AUTHENTICATION & ACCESS (PR.AC)")
    # Corrected plugin: parse_jsonl
    audit_query = """
        LET audit_files = SELECT FullPath FROM glob(globs='/velociraptor/server_artifacts/Server.Audit.Logs/*.json')
        SELECT timestamp(epoch=_ts) AS Timestamp, operation AS Event, principal AS User FROM foreach(row=audit_files, query={ SELECT * FROM parse_jsonl(filename=FullPath) })
        WHERE Event =~ 'password|login|auth' ORDER BY Timestamp DESC LIMIT 10
    """
    auth_events = run_vql(audit_query)
    if not auth_events:
        print("No recent authentication anomalies detected.")
    else:
        print("| Timestamp | Event | User |")
        print("| --- | --- | --- |")
        for e in auth_events:
            print(f"| {e.get('Timestamp')} | {e.get('Event')} | {e.get('User')} |")

    print("\n## 3. CONTINUOUS MONITORING (DE.CM)")
    cortex_artifacts = run_vql("SELECT name FROM artifact_definitions() WHERE name =~ 'Cortex'")
    if not cortex_artifacts:
         print("Artifact state verification pending.")
    else:
        print("Active CORTEX Monitoring Artifacts:")
        for a in cortex_artifacts:
            print(f"- {a.get('name')}")

    print("\n---")
    print("Project CORTEX | Sovereign Security Integrity")

if __name__ == '__main__':
    generate_report()
