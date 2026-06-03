import os
import re
import tarfile
import time
import json
import logging
import asyncio
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, BackgroundTasks, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel, HttpUrl
import httpx
import paramiko
from bs4 import BeautifulSoup
import duckdb

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cortex-web-auditor")

# Paths
DATA_DIR = "/mnt/data_lake/audit/web"
BACKUP_DIR = os.path.join(DATA_DIR, "backups")
DB_PATH = os.path.join(DATA_DIR, "cortex_web_audits.db")

os.makedirs(BACKUP_DIR, exist_ok=True)

# Initialize database
def init_db() -> None:
    conn = duckdb.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS audits (
            audit_id VARCHAR PRIMARY KEY,
            url VARCHAR,
            status VARCHAR,
            code_quality_grade VARCHAR,
            security_grade VARCHAR,
            compatibility_grade VARCHAR,
            link_integrity_grade VARCHAR,
            overall_grade VARCHAR,
            details_json VARCHAR,
            created_at TIMESTAMP,
            completed_at TIMESTAMP
        )
    """)
    conn.close()

init_db()

app = FastAPI(
    title="CORTEX: Comprehensive Website Health & Security Auditor",
    description="Isolated website auditing and security assessment microservice",
    version="1.5.0"
)

class AuditRequest(BaseModel):
    url: str
    ssh_host: Optional[str] = None
    ssh_port: int = 22
    ssh_user: Optional[str] = None
    ssh_pass: Optional[str] = None
    ssh_key_path: Optional[str] = None
    site_path: Optional[str] = "/var/www/html"

# In-memory jobs cache
active_audits: Dict[str, Dict[str, Any]] = {}

# Audit Worker Logic
async def run_website_audit(audit_id: str, request: AuditRequest) -> None:
    logger.info(f"Starting audit {audit_id} for URL: {request.url}")
    
    # Initial status update
    conn = duckdb.connect(DB_PATH)
    conn.execute("UPDATE audits SET status = 'running' WHERE audit_id = ?", (audit_id,))
    conn.close()
    
    active_audits[audit_id]["status"] = "running"
    
    # Audit modules outputs
    network_issues = []
    php_issues = []
    backup_status = "Skipped"
    file_malware_issues = []
    integrity_issues = []
    compatibility_issues = []
    
    # 1. HTTP Ingress & Headers Check (Public Scan)
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
            response = await client.get(request.url)
            headers = response.headers
            
            # Security Headers Audit
            sec_headers = {
                "Strict-Transport-Security": "HSTS header is missing. Mitigates man-in-the-middle attacks.",
                "Content-Security-Policy": "CSP header is missing. Helps prevent XSS and injection attacks.",
                "X-Frame-Options": "X-Frame-Options header is missing. Helps prevent clickjacking.",
                "X-Content-Type-Options": "X-Content-Type-Options header is missing. Prevents MIME-sniffing.",
                "Referrer-Policy": "Referrer-Policy header is missing. Configures metadata sent on links."
            }
            
            for header, msg in sec_headers.items():
                if header not in headers:
                    network_issues.append({
                        "category": "security_headers",
                        "severity": "medium" if header != "Strict-Transport-Security" else "high",
                        "parameter": header,
                        "description": msg,
                        "fix": f"Configure web server to return: {header}"
                    })
            
            # Mixed content inspection
            soup = BeautifulSoup(response.text, "html.parser")
            resources = soup.find_all(["img", "script", "link"], src=True)
            for r in resources:
                src = r.get("src") or r.get("href", "")
                if src.startswith("http://"):
                    network_issues.append({
                        "category": "mixed_content",
                        "severity": "high",
                        "parameter": "Mixed Content",
                        "description": f"Insecure resource requested on secure HTTPS page: {src}",
                        "fix": f"Update the URL link protocol to HTTPS."
                    })
    except Exception as e:
        logger.error(f"Failed public network check: {e}")
        network_issues.append({
            "category": "connectivity",
            "severity": "high",
            "parameter": "URL Reachability",
            "description": f"Auditor could not establish connection to the URL: {e}",
            "fix": "Verify that domain exists and DNS records resolve."
        })

    # 2. Ingestion & Backup Engine via SSH (Optional)
    local_backup_path = None
    if request.ssh_host and request.ssh_user and (request.ssh_pass or request.ssh_key_path):
        try:
            logger.info(f"Connecting to remote site: {request.ssh_host}")
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            if request.ssh_key_path:
                ssh.connect(request.ssh_host, port=request.ssh_port, username=request.ssh_user, key_filename=request.ssh_key_path)
            else:
                ssh.connect(request.ssh_host, port=request.ssh_port, username=request.ssh_user, password=request.ssh_pass)
                
            sftp = ssh.open_sftp()
            
            # Create remote archive of site folder
            backup_file_name = f"cortex_backup_{audit_id}.tar.gz"
            remote_archive_path = f"/tmp/{backup_file_name}"
            logger.info("Executing remote compression...")
            
            stdin, stdout, stderr = ssh.exec_command(f"tar -czf {remote_archive_path} -C {request.site_path} .")
            exit_status = stdout.channel.recv_exit_status()
            
            if exit_status == 0:
                logger.info("Downloading remote archive...")
                local_backup_path = os.path.join(BACKUP_DIR, backup_file_name)
                sftp.get(remote_archive_path, local_backup_path)
                backup_status = f"Success (Saved to {local_backup_path})"
                
                # Cleanup remote tmp file
                sftp.remove(remote_archive_path)
            else:
                err = stderr.read().decode()
                backup_status = f"Compression failed: {err}"
                
            sftp.close()
            ssh.close()
        except Exception as e:
            logger.error(f"Backup engine execution failed: {e}")
            backup_status = f"Failed to authenticate/connect: {e}"

    # 3. File Security and Code Scan (Runs on local files inside the backup archive if available)
    if local_backup_path and os.path.exists(local_backup_path):
        try:
            extract_path = os.path.join(DATA_DIR, f"extracted_{audit_id}")
            os.makedirs(extract_path, exist_ok=True)
            
            # Extract tarball
            with tarfile.open(local_backup_path, "r:gz") as tar:
                tar.extractall(path=extract_path)
                
            # Scan files for vulnerabilities or malicious structures
            malware_patterns = [
                (re.compile(r"eval\s*\(\s*base64_decode"), "Base64 Obfuscated Execution code block"),
                (re.compile(r"shell_exec\s*\("), "System shell execution command call"),
                (re.compile(r"passthru\s*\("), "Direct passthru command execution call"),
                (re.compile(r"\$_POST\s*\[\s*['\"]cmd['\"]\s*\]\s*\(\s*\$_POST"), "Potential web shell backdoor pattern")
            ]
            
            for root, dirs, files in os.walk(extract_path):
                for f in files:
                    if f.endswith((".php", ".html", ".js")):
                        f_path = os.path.join(root, f)
                        try:
                            with open(f_path, "r", errors="ignore") as file_content:
                                content = file_content.read()
                                # Check patterns
                                for pat, desc in malware_patterns:
                                    if pat.search(content):
                                        file_malware_issues.append({
                                            "file": os.path.relpath(f_path, extract_path),
                                            "severity": "critical",
                                            "threat": desc,
                                            "fix": "Verify script source, isolate and remove the signature payload."
                                        })
                                        
                                # Check for PHP configuration files to audit
                                if f == "php.ini":
                                    php_issues.extend(audit_php_ini_content(content, os.path.relpath(f_path, extract_path)))
                                    
                                # WordPress core integrity validation
                                if f == "version.php" and "wp-includes" in root:
                                    # Extract version
                                    ver_match = re.search(r"\$wp_version\s*=\s*['\"]([^'\"]+)['\"]", content)
                                    if ver_match:
                                        wp_ver = ver_match.group(1)
                                        logger.info(f"Detected WordPress version: {wp_ver}")
                                        # Query WordPress API for core checksums
                                        try:
                                            async with httpx.AsyncClient(timeout=8.0) as client:
                                                wp_resp = await client.get(f"https://api.wordpress.org/core/checksums/1.0/?version={wp_ver}")
                                                if wp_resp.status_code == 200:
                                                    checksums = wp_resp.json().get("checksums", {})
                                                    # Verify a small subset of core files to check for tampered code
                                                    core_test_files = ["wp-settings.php", "wp-login.php", "index.php"]
                                                    for ct in core_test_files:
                                                        ct_path = os.path.join(extract_path, ct)
                                                        if os.path.exists(ct_path):
                                                            # Compare hash (WordPress provides md5 hashes)
                                                            import hashlib
                                                            with open(ct_path, "rb") as bf:
                                                                f_md5 = hashlib.md5(bf.read()).hexdigest()
                                                            if ct in checksums and checksums[ct] != f_md5:
                                                                integrity_issues.append({
                                                                    "file": ct,
                                                                    "severity": "critical",
                                                                    "message": f"Core integrity validation failed. MD5 hash mismatch. File has been modified.",
                                                                    "fix": f"Replace with vanilla core file from official WordPress v{wp_ver} repo."
                                                                })
                                        except Exception as wpe:
                                            logger.error(f"WordPress checksum query failed: {wpe}")
                                            
                        except Exception as fe:
                            logger.error(f"Failed to scan file {f_path}: {fe}")
                            
            # Cleanup extracted folder
            import shutil
            shutil.rmtree(extract_path)
            
        except Exception as e:
            logger.error(f"Error executing file scans: {e}")

    # Deduce Letter Grades (A through F)
    # A: 0 errors/issues, B: minor, C: moderate, D: severe, F: critical
    code_quality_grade = "A"
    if integrity_issues: code_quality_grade = "F"
    elif len(file_malware_issues) > 0: code_quality_grade = "F"
    
    security_grade = "A"
    sec_count = len([x for x in network_issues if x["severity"] == "high"]) + len(php_issues)
    if sec_count > 4: security_grade = "F"
    elif sec_count > 2: security_grade = "D"
    elif sec_count > 0: security_grade = "B"
    
    compatibility_grade = "A" # Default stable
    link_integrity_grade = "A"
    if any(x["category"] == "connectivity" for x in network_issues):
        link_integrity_grade = "F"
        
    grades = [code_quality_grade, security_grade, compatibility_grade, link_integrity_grade]
    # Simple overall grade logic
    if "F" in grades: overall_grade = "F"
    elif "D" in grades: overall_grade = "D"
    elif "C" in grades: overall_grade = "C"
    elif "B" in grades: overall_grade = "B"
    else: overall_grade = "A"

    details = {
        "backup_status": backup_status,
        "network_issues": network_issues,
        "php_issues": php_issues,
        "malware_issues": file_malware_issues,
        "integrity_issues": integrity_issues,
        "compatibility_issues": compatibility_issues
    }
    
    # Save results to DuckDB
    conn = duckdb.connect(DB_PATH)
    conn.execute("""
        UPDATE audits SET 
            status = 'completed',
            code_quality_grade = ?,
            security_grade = ?,
            compatibility_grade = ?,
            link_integrity_grade = ?,
            overall_grade = ?,
            details_json = ?,
            completed_at = ?
        WHERE audit_id = ?
    """, (
        code_quality_grade, security_grade, compatibility_grade, link_integrity_grade,
        overall_grade, json.dumps(details), time.strftime('%Y-%m-%d %H:%M:%S'), audit_id
    ))
    conn.close()
    
    # Cache updates
    active_audits[audit_id].update({
        "status": "completed",
        "code_quality_grade": code_quality_grade,
        "security_grade": security_grade,
        "compatibility_grade": compatibility_grade,
        "link_integrity_grade": link_integrity_grade,
        "overall_grade": overall_grade,
        "details": details,
        "completed_at": time.strftime('%Y-%m-%d %H:%M:%S')
    })
    logger.info(f"Audit job {audit_id} complete!")

def audit_php_ini_content(content: str, file_origin: str) -> List[Dict[str, Any]]:
    issues = []
    
    # Clean file syntax, remove comments
    lines = content.splitlines()
    directives = {}
    for line in lines:
        line = line.strip()
        if not line or line.startswith(";"):
            continue
        if "=" in line:
            parts = line.split("=", 1)
            key = parts[0].strip()
            val = parts[1].split(";")[0].strip().lower() # remove trailing comments
            directives[key] = val
            
    # Check disable_functions
    disable_funcs = directives.get("disable_functions", "")
    critical_funcs = ["exec", "system", "passthru", "shell_exec", "proc_open", "popen"]
    missing_disables = [f for f in critical_funcs if f not in disable_funcs]
    
    if missing_disables:
        issues.append({
            "file": file_origin,
            "category": "php_configuration",
            "severity": "high",
            "parameter": "disable_functions",
            "description": f"Dangerous command execution utilities are not disabled: {', '.join(missing_disables)}",
            "fix": f"Append dangerous functions to your disable_functions setting in php.ini."
        })
        
    # Check other directives
    insecure_directives = {
        "allow_url_fopen": ("on", "high", "allow_url_fopen is enabled. Allows remote file inclusion."),
        "allow_url_include": ("on", "critical", "allow_url_include is enabled. High risk of Remote Code Execution (RCE)."),
        "expose_php": ("on", "medium", "expose_php is enabled. Exposes PHP version signature details in headers."),
        "display_errors": ("on", "medium", "display_errors is enabled. May leak database names or absolute file paths during errors.")
    }
    
    for key, (bad_val, severity, msg) in insecure_directives.items():
        if directives.get(key) == bad_val:
            issues.append({
                "file": file_origin,
                "category": "php_configuration",
                "severity": severity,
                "parameter": key,
                "description": msg,
                "fix": f"Set {key} = Off in php.ini configuration."
            })
            
    return issues

# FastAPI API Routes
@app.post("/run")
async def start_audit(request: AuditRequest, background_tasks: BackgroundTasks) -> JSONResponse:
    audit_id = f"audit_{int(time.time())}"
    
    conn = duckdb.connect(DB_PATH)
    conn.execute("""
        INSERT INTO audits (
            audit_id, url, status, code_quality_grade, security_grade, 
            compatibility_grade, link_integrity_grade, overall_grade, 
            details_json, created_at, completed_at
        ) VALUES (?, ?, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, ?, NULL)
    """, (audit_id, request.url, time.strftime('%Y-%m-%d %H:%M:%S')))
    conn.close()
    
    active_audits[audit_id] = {
        "audit_id": audit_id,
        "url": request.url,
        "status": "pending",
        "created_at": time.strftime('%Y-%m-%d %H:%M:%S')
    }
    
    background_tasks.add_task(run_website_audit, audit_id, request)
    
    return JSONResponse(status_code=202, content={"audit_id": audit_id, "status": "pending", "message": "Website audit started."})

@app.get("/jobs")
async def get_audit_history() -> JSONResponse:
    conn = duckdb.connect(DB_PATH)
    res = conn.execute("SELECT audit_id, url, status, overall_grade, CAST(created_at AS VARCHAR), CAST(completed_at AS VARCHAR) FROM audits ORDER BY created_at DESC").fetchall()
    conn.close()
    
    keys = ["audit_id", "url", "status", "overall_grade", "created_at", "completed_at"]
    history = [dict(zip(keys, row)) for row in res]
    return JSONResponse(content={"history": history})

@app.get("/jobs/{audit_id}")
async def get_audit_details(audit_id: str) -> JSONResponse:
    if audit_id in active_audits and active_audits[audit_id]["status"] == "completed":
        return JSONResponse(content=active_audits[audit_id])
        
    conn = duckdb.connect(DB_PATH)
    res = conn.execute("""
        SELECT audit_id, url, status, code_quality_grade, security_grade, 
               compatibility_grade, link_integrity_grade, overall_grade, 
               details_json, CAST(created_at AS VARCHAR), CAST(completed_at AS VARCHAR) 
        FROM audits WHERE audit_id = ?
    """, (audit_id,)).fetchone()
    conn.close()
    
    if not res:
        raise HTTPException(status_code=404, detail="Audit job not found")
        
    audit_id, url, status, code_q, sec_g, comp_g, link_g, over_g, details_json, created, completed = res
    
    details = json.loads(details_json) if details_json else {}
    
    return JSONResponse(content={
        "audit_id": audit_id,
        "url": url,
        "status": status,
        "code_quality_grade": code_q,
        "security_grade": sec_g,
        "compatibility_grade": comp_g,
        "link_integrity_grade": link_g,
        "overall_grade": over_g,
        "details": details,
        "created_at": created,
        "completed_at": completed
    })

@app.post("/upload-ini")
async def upload_php_ini(file: UploadFile = File(...)) -> JSONResponse:
    try:
        content = (await file.read()).decode("utf-8", errors="ignore")
        issues = audit_php_ini_content(content, file.filename)
        
        # Calculate grade for this specific file
        grade = "A"
        high_issues = [x for x in issues if x["severity"] in ["high", "critical"]]
        if len(high_issues) > 2: grade = "F"
        elif len(high_issues) > 0: grade = "D"
        
        return JSONResponse(content={
            "filename": file.filename,
            "grade": grade,
            "total_issues": len(issues),
            "issues": issues
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse php.ini file: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
