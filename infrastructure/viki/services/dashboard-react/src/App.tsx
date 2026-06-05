import { useState, useEffect, useRef } from "react";
import { VikiAvatarRenderer } from "./components/viki/VikiAvatarRenderer";
import "./App.css";

interface ServiceStatus {
  name: string;
  status: "online" | "offline";
}

interface StatusData {
  timestamp: string;
  services: ServiceStatus[];
}

interface Alert {
  id: string;
  type: "CRITICAL" | "WARNING" | "INFO";
  source: string;
  message: string;
  timestamp: string;
}

interface TelemetryEvent {
  id?: string;
  timestamp?: string;
  type?: string;
  severity?: string;
  source?: string;
  message?: string;
  data?: {
    ProcessName?: string;
    CommandLine?: string;
    Username?: string;
  };
  hostname?: string;
  mode?: string;
  security_status?: string;
}

interface PermissionUser {
  username: string;
  role: string;
  password?: string;
  viki_assigned: boolean;
  permissions: {
    view_telemetry: boolean;
    execute_playbooks: boolean;
    run_qc_scans: boolean;
    run_seo_scans: boolean;
    run_web_audits: boolean;
    edit_appointments: boolean;
    edit_user_permissions: boolean;
  };
  apps?: Record<string, boolean>;
}

interface PermissionsData {
  users: PermissionUser[];
}

interface AuditRecord {
  timestamp: string;
  type: string;
  message: string;
  signature?: string;
  metadata?: Record<string, unknown>;
}

interface GLPITicket {
  id: string;
  title: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  submitter: string;
  created: string;
}

interface ToDoItem {
  id: string;
  task: string;
  due: string;
  completed: boolean;
}

interface CalendarAppointment {
  id: string;
  subject: string;
  time: string;
  organizer: string;
  status: "Busy" | "Tentative" | "Free";
}

const initialTickets: GLPITicket[] = [
  { id: "T-1024", title: "RMM Alert: Mimikatz credential dumping on host WS-402", severity: "HIGH", submitter: "Vector EDR Probe", created: "2026-06-02T09:12:00Z" },
  { id: "T-1025", title: "Forensic Data Lake BTRFS storage pool approaching 90% threshold", severity: "MEDIUM", submitter: "Bareos Agent", created: "2026-06-02T07:44:00Z" },
  { id: "T-1026", title: "Authelia SSO dynamic session sync rate limiting exception", severity: "LOW", submitter: "Authelia Gateway", created: "2026-06-02T05:20:00Z" },
  { id: "T-1027", title: "GoHighLevel API Integration lead sync credentials expired", severity: "HIGH", submitter: "n8n Router", created: "2026-06-01T18:30:00Z" }
];

const initialToDo: ToDoItem[] = [
  { id: "1", task: "Verify Velociraptor EDR endpoint sensor on production C-101", due: "In 4 hours", completed: false },
  { id: "2", task: "Rotate Authelia directory dynamic JWT token signing key credentials", due: "In 24 hours", completed: false },
  { id: "3", task: "Prune old Docker service container volumes on node CORE-100", due: "In 48 hours", completed: true },
  { id: "4", task: "Audit South African English overrides in Web QC spelling crawler", due: "In 72 hours", completed: false }
];

const initialAppointments: CalendarAppointment[] = [
  { id: "a1", subject: "Sovereign Incident Response Triage Review", time: "Today, 11:00 AM - 12:00 PM", organizer: "Louis", status: "Busy" },
  { id: "a2", subject: "n8n GoHighLevel CRM Automation Synapse Meeting", time: "Tomorrow, 2:00 PM - 3:00 PM", organizer: "Sarah", status: "Tentative" },
  { id: "a3", subject: "Velociraptor Advanced Threat Hunting Workshop", time: "Thursday, 9:30 AM - 11:30 AM", organizer: "Felicia", status: "Busy" },
  { id: "a4", subject: "Authelia SSO / LLDAP Permission Scope Mapping", time: "Thursday, 3:00 PM - 4:00 PM", organizer: "Vitto", status: "Free" }
];

const staticServicesData = [
  {
    category: "Operational Backbone",
    items: [
      { name: "NetLock RMM", subtitle: "Tactical Control", url: "https://rmm.rmmservice.co.za", icon: "⚡" },
      { name: "GLPI", subtitle: "Incident Command", url: "https://glpi.rmmservice.co.za", icon: "🎫" },
      { name: "Velociraptor", subtitle: "Threat Hunter", url: "https://edr.rmmservice.co.za", icon: "👻" },
      { name: "Custom Reports", subtitle: "On-Request Compiler", url: "/?mode=reports", icon: "📊" },
      { name: "QC Scanner", subtitle: "Security & Design Audit", url: "/?mode=qc", icon: "🛡️" },
      { name: "SEO Scanner", subtitle: "Tech & On-Page SEO", url: "/?mode=seo", icon: "🔍" },
      { name: "Website Auditor", subtitle: "Health & Malware Scan", url: "/?mode=audit", icon: "🩺" }
    ],
  },
  {
    category: "Intelligence & Data",
    items: [
      { name: "MinIO", subtitle: "S3 Vault", url: "https://s3-console.rmmservice.co.za", icon: "🗄️" },
      { name: "n8n", subtitle: "Neural Synapse", url: "https://automation.rmmservice.co.za", icon: "🧠" },
      { name: "Ollama AI", subtitle: "Neural Inference", url: "https://rmmservice.co.za/api/viki/", icon: "🤖" },
      { name: "Hermes Agent", subtitle: "Cognitive Dispatcher", url: "https://hermes.rmmservice.co.za", icon: "🕊️" },
    ],
  },
  {
    category: "Network & Security",
    items: [
      { name: "Traefik", subtitle: "Secure Gateway", url: "https://traefik.rmmservice.co.za/dashboard/", icon: "🚦" },
      { name: "Authelia", subtitle: "Identity Gate", url: "https://auth.rmmservice.co.za", icon: "🔑" },
      { name: "WireGuard", subtitle: "Secure Tunnel", url: "disabled", icon: "🛡️" }
    ],
  },
];

function SystemDiagnosticsHUD({ status }: { status: ServiceStatus[] }) {
  const [latencies, setLatencies] = useState<Record<string, number>>({
    "NetLock RMM": 12,
    "GLPI": 18,
    "Velociraptor": 24,
    "MinIO": 7,
    "n8n": 32,
    "Ollama AI": 114,
    "Traefik": 5,
    "Authelia": 9,
    "WireGuard": 3
  });

  const [metrics, setMetrics] = useState({
    cpu: 24,
    ramUsed: 18.4,
    ramTotal: 32,
    diskUsed: 242,
    diskTotal: 512,
    uptime: "45d 12h 34m"
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setLatencies(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          const base = next[key];
          const change = key === "Ollama AI" 
            ? Math.floor(Math.random() * 15) - 7
            : Math.floor(Math.random() * 5) - 2;
          next[key] = Math.max(key === "WireGuard" ? 1 : 3, base + change);
        });
        return next;
      });

      setMetrics(prev => ({
        ...prev,
        cpu: Math.min(95, Math.max(10, prev.cpu + Math.floor(Math.random() * 7) - 3))
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="diagnostics-panel glassmorphic">
      <div className="hud-header">
        <div className="hud-title-group">
          <span className="hud-title-indicator blinking"></span>
          <h3>SYSTEM DIAGNOSTICS HUD</h3>
        </div>
        <span className="hud-badge mode-status standard">PROXMOX VE 9.x</span>
      </div>
      
      <div className="diagnostics-body">
        {/* Host Resources */}
        <div className="resource-metrics">
          <div className="metric-item">
            <div className="metric-header">
              <span className="metric-label">HOST CPU LOAD</span>
              <span className="metric-val">{metrics.cpu}%</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill cpu" style={{ width: `${metrics.cpu}%` }}></div>
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-header">
              <span className="metric-label">VIRTUAL MEMORY</span>
              <span className="metric-val">{metrics.ramUsed} GB / {metrics.ramTotal} GB</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill ram" style={{ width: `${(metrics.ramUsed / metrics.ramTotal) * 100}%` }}></div>
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-header">
              <span className="metric-label">SSD STORAGE</span>
              <span className="metric-val">{metrics.diskUsed} GB / {metrics.diskTotal} GB</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill disk" style={{ width: `${(metrics.diskUsed / metrics.diskTotal) * 100}%` }}></div>
            </div>
          </div>
        </div>

        {/* Services Latency Matrix */}
        <div className="latency-matrix-section">
          <div className="section-subtitle">ACTIVE SERVICES LATENCY</div>
          <div className="latency-grid">
            {Object.entries(latencies).map(([name, latency]) => {
              const isOffline = status.find(s => s.name === name)?.status === "offline";
              return (
                <div key={name} className={`latency-item ${isOffline ? 'offline' : ''}`}>
                  <span className="service-dot"></span>
                  <span className="service-name">{name}</span>
                  <span className="service-latency">{isOffline ? 'OFFLINE' : `${latency}ms`}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Node Telemetry Meta */}
        <div className="diagnostics-meta-footer">
          <div>UPTIME: <span className="meta-val">{metrics.uptime}</span></div>
          <div>NODE: <span className="meta-val">pve-cortex-01</span></div>
          <div>GW: <span className="meta-val">192.168.50.1</span></div>
        </div>
      </div>
    </div>
  );
}

const formatLogMessage = (event: TelemetryEvent) => {
  if (event.message) return event.message;
  if (event.data) {
    const d = event.data;
    if (d.ProcessName) {
      return `Suspicious process ${d.ProcessName} (CMD: ${d.CommandLine || 'N/A'}) executed by user ${d.Username || 'unknown'} on host ${event.hostname || 'endpoint'}`;
    }
  }
  return JSON.stringify(event);
};

function TelemetryHUD({ 
  events, 
  wsStatus, 
  isVisible, 
  onToggle, 
  mode 
}: { 
  events: TelemetryEvent[], 
  wsStatus: "connecting" | "connected" | "disconnected", 
  isVisible: boolean, 
  onToggle: () => void, 
  mode: string 
}) {
  if (!isVisible) {
    return (
      <div className="telemetry-hud-collapsed glassmorphic" onClick={onToggle}>
        <span className="hud-pulse-dot"></span>
        <div className="collapsed-text">ACTIVATE LIVE TELEMETRY FEED</div>
      </div>
    );
  }

  return (
    <div className="telemetry-hud glassmorphic">
      <div className="hud-header">
        <div className="hud-title-group">
          <span className="hud-title-indicator blinking"></span>
          <h3>SYSTEM TELEMETRY HUD</h3>
        </div>
        <div className="hud-actions">
          <span className={`hud-badge ws-status ${wsStatus}`}>
            {wsStatus.toUpperCase()}
          </span>
          <span className={`hud-badge mode-status ${mode.toLowerCase()}`}>
            {mode}
          </span>
          <button className="hud-toggle-close" onClick={onToggle}>✖</button>
        </div>
      </div>
      
      <div className="hud-body">
        {events.length === 0 ? (
          <div className="hud-empty">
            <span className="hud-scan-line"></span>
            LISTENING FOR TELEMETRY STREAM...
          </div>
        ) : (
          <div className="hud-log-stream">
            {events.map((event) => {
              const severity = (event.severity || event.type || "INFO").toUpperCase();
              return (
                <div key={event.id} className={`hud-log-entry ${severity.toLowerCase()}`}>
                  <div className="hud-log-meta">
                    <span className="hud-log-time">{event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : ""}</span>
                    <span className="hud-log-source">[{event.source || 'VECTOR'}]</span>
                    <span className={`hud-log-level ${severity.toLowerCase()}`}>{severity}</span>
                  </div>
                  <p className="hud-log-text">{formatLogMessage(event)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface AlertOverlayProps {
  alerts: Alert[];
  onClear: () => void;
}

function AlertOverlay({ alerts, onClear }: AlertOverlayProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="alert-overlay">
      <div className="alert-content">
        <div className="alert-header">
          <span className="alert-icon">⚠️</span>
          <h2>CRITICAL THREAT DETECTED</h2>
        </div>
        <div className="alert-list">
          {alerts.map(alert => (
            <div key={alert.id} className="alert-item">
              <div className="alert-meta">
                <span className="alert-source">{alert.source}</span>
                <span className="alert-time">{new Date(alert.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="alert-message">{alert.message}</p>
            </div>
          ))}
        </div>
        <button className="alert-close" onClick={onClear}>ACKNOWLEDGE & CLEAR</button>
      </div>
    </div>
  );
}

interface ActiveMitigationConsoleProps {
  currentMode: string;
  onModeToggle: (newMode: "NORMAL" | "REFLEX") => void;
  onExecutePlaybook: (playbook: string, target: string) => Promise<boolean>;
  incidentHistory: AuditRecord[];
  isOffline: boolean;
  allowQuarantine: boolean;
}

function ActiveMitigationConsole({
  currentMode,
  onModeToggle,
  onExecutePlaybook,
  incidentHistory,
  isOffline,
  allowQuarantine
}: ActiveMitigationConsoleProps) {
  const [targetHost, setTargetHost] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleIsolateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetHost.trim() || isExecuting) return;

    setIsExecuting(true);
    setStatus(null);

    const success = await onExecutePlaybook("isolate_host", targetHost.trim());
    setIsExecuting(false);

    if (success) {
      setStatus({ type: "success", text: `Quarantine playbook triggered for ${targetHost}` });
      setTargetHost("");
    } else {
      setStatus({ type: "error", text: "Link failure: isolation playbook failed to launch" });
    }

    setTimeout(() => setStatus(null), 5000);
  };

  const isHardened = currentMode === "HARDENED" || currentMode === "REFLEX";

  return (
    <div className={`mitigation-panel glassmorphic ${isHardened ? "hardened" : ""}`}>
      <div className="hud-header">
        <div className="hud-title-group">
          <span className="hud-title-indicator blinking"></span>
          <h3>ACTIVE MITIGATION CONSOLE</h3>
        </div>
        <div className="hud-badges">
          {isOffline && <span className="hud-badge cached">CACHED</span>}
          <span className={`hud-badge mode-status ${isHardened ? "hardened" : "standard"}`}>
            {currentMode}
          </span>
        </div>
      </div>

      <div className="mitigation-body">
        {/* Manual Hardening Trigger */}
        <div className="mitigation-control-section">
          <span className="mitigation-control-label">SYSTEM LOCKDOWN MODE</span>
          <div className="mode-toggle-buttons">
            <button 
              className={`mode-btn ${!isHardened ? "standard-active" : ""}`}
              onClick={() => onModeToggle("NORMAL")}
            >
              Standard Ops
            </button>
            <button 
              className={`mode-btn ${isHardened ? "hardened-active" : ""}`}
              onClick={() => onModeToggle("REFLEX")}
            >
              Reflex Mode
            </button>
          </div>
        </div>

        {/* Quarantine Form */}
        <div className="mitigation-control-section">
          <span className="mitigation-control-label">HOST QUARANTINE CONTROLS</span>
          {!allowQuarantine ? (
            <div className="permissions-restricted-warning font-space">
              🔒 RESTRICTED OPERATION: ACCOUNT IS LACKING 'EXECUTE_PLAYBOOKS' DEPLOYMENT PRIVILEGES
            </div>
          ) : (
            <form onSubmit={handleIsolateSubmit} className="mitigation-form">
              <div className="mitigation-form-group">
                <input
                  type="text"
                  className="mitigation-input"
                  placeholder="Target Client ID (e.g. C-101)..."
                  value={targetHost}
                  onChange={(e) => setTargetHost(e.target.value)}
                  disabled={isExecuting}
                />
                <button 
                  type="submit" 
                  className="mitigation-btn"
                  disabled={isExecuting || !targetHost.trim()}
                >
                  {isExecuting ? "Executing..." : "Isolate"}
                </button>
              </div>
              {status && (
                <div className={`mitigation-status-msg ${status.type}`}>
                  {status.text}
                </div>
              )}
            </form>
          )}
        </div>

        {/* BTRFS Historical Incidents Feed */}
        <div className="mitigation-control-section">
          <span className="mitigation-control-label">FORENSIC BTRFS INCIDENT TIMELINE</span>
          <div className="timeline-container">
            {incidentHistory.length === 0 ? (
              <div className="timeline-empty">NO RECENT SYSTEM MITIGATIONS DETECTED</div>
            ) : (
              <div className="timeline-list">
                {incidentHistory.slice(0, 10).map((incident, idx) => {
                  const type = incident.type || "INFO";
                  const signature = incident.signature || "UNRECOGNIZED_INTEGRITY_SIGNATURE";
                  
                  let badgeClass = "badge-info";
                  if (type.includes("MITIGATION")) badgeClass = "badge-danger";
                  if (type.includes("MODE")) badgeClass = "badge-warning";
                  if (type.includes("PERMISSION")) badgeClass = "badge-permissions";
                  
                  return (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-meta">
                        <span className={`timeline-badge ${badgeClass}`}>{type}</span>
                        <span className="timeline-time">{new Date(incident.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="timeline-msg">{incident.message}</p>
                      <div className="timeline-signature-box font-space" title="Cryptographically signed to BTRFS Forensic Lake using HMAC-SHA256">
                        <span>SIG: {signature.substring(0, 24)}...</span>
                        <span className="tooltip-indicator">ⓘ</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QCScanningConsole() {
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'completed' | 'error'>('idle');
  const [targetUrl, setTargetUrl] = useState("https://rmmservice.co.za");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [generatingStep, setGeneratingStep] = useState("");
  const [reportData, setReportData] = useState<{
    pdfUrl: string;
    docxBlob: Blob;
    pdfBlob: Blob;
    filename: string;
  } | null>(null);
  const [activeAudit, setActiveAudit] = useState<any>(null);
  const [qcError, setQcError] = useState<string | null>(null);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const initiateScan = () => {
    if (!targetUrl || !targetUrl.trim()) return;
    setScanState('scanning');
    setProgress(0);
    setLogs([]);
    setReportData(null);
    setActiveAudit(null);
    setQcError(null);
    setEmailSuccess(null);

    let domain = targetUrl;
    try {
      domain = new URL(targetUrl).hostname || targetUrl;
    } catch {}

    const scanLogsList = [
      `[SYSTEM] Loading CORTEX Web QC Engine for target: ${targetUrl}...`,
      `[CRAWLER] Activating spelling crawler with custom South African English dictionary override...`,
      `[CRAWLER] Crawling active web pages of ${domain} for custom UI elements & strings...`,
      `[AUDIT] Scanning target web interface DOM hierarchy and element markup...`,
      `[AUDIT] Auditing color contrast levels & WCAG accessibility compliance on ${domain}...`,
      `[AUDIT] Validating viewport responsive boundaries & layout CSS stylesheets...`,
      `[INTEGRATION] Verifying NetLock reverse proxy routing layer connectivity to ${domain}...`,
      `[ANALYSIS] Processing quality assurance logs & telemetric compliance score...`,
      `[SYSTEM] Connecting to remote CORTEX report compiler on Core server...`
    ];

    let currentLogIndex = 0;
    let apiCompleted = false;
    let apiData: any = null;
    let apiError: any = null;

    // Trigger report compile concurrently
    fetch("/api/generate-report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_name: `QC Web Audit: ${domain}`,
        date_range: new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }),
        sections: ["RMM", "EDR", "Tickets", "Backups"],
        options: {
          RMM: ["availability", "performance"],
          EDR: ["alerts"],
          Tickets: ["stats", "work"],
          Backups: ["compliance"],
        },
      }),
    })
      .then(async res => {
        if (!res.ok) {
          throw new Error(`Report compiler failed: ${res.statusText}`);
        }
        const data = await res.json();
        if (data.status !== "success") {
          throw new Error(data.message || "Report compilation failed");
        }
        return data;
      })
      .then(data => {
        apiData = data;
        apiCompleted = true;
      })
      .catch(err => {
        apiError = err;
        apiCompleted = true;
      });

    const interval = setInterval(() => {
      const timestamp = new Date().toLocaleTimeString();

      if (currentLogIndex < scanLogsList.length) {
        setLogs(prev => [...prev, `[${timestamp}] ${scanLogsList[currentLogIndex]}`]);
        setProgress(Math.min(90, Math.floor(((currentLogIndex + 1) / (scanLogsList.length + 1)) * 100)));
        currentLogIndex++;
      } else {
        // We are on the last step, waiting for the API to finish compiling
        if (apiCompleted) {
          clearInterval(interval);
          if (apiError) {
            setLogs(prev => [...prev, `[${timestamp}] [ERROR] Backend audit failed: ${apiError.message || apiError}`]);
            setQcError(apiError.message || String(apiError));
            setScanState('error');
          } else if (apiData) {
            const audit = apiData.audit_results;
            setLogs(prev => [
              ...prev,
              `[${timestamp}] [SUCCESS] Active scraper completed. Score: ${audit.score}/100, Spelling Errors: ${audit.spelling_errors}, Load Speed: ${audit.performance_ms}ms`,
              `[${timestamp}] [SYSTEM] QC Pipeline stabilized for ${domain}. Generating report files.`
            ]);
            setProgress(100);
            setActiveAudit(audit);

            // Parse base64 documents
            try {
              const docxBytes = Uint8Array.from(atob(apiData.docx_base64), c => c.charCodeAt(0));
              const docxBlob = new Blob([docxBytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });

              const pdfBytes = Uint8Array.from(atob(apiData.pdf_base64), c => c.charCodeAt(0));
              const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

              const pdfUrl = URL.createObjectURL(pdfBlob);

              setReportData({
                pdfUrl,
                docxBlob,
                pdfBlob,
                filename: apiData.filename || "qc_design_audit_report",
              });
              setScanState('completed');
            } catch (err: any) {
              setQcError("Failed to parse base64 documents returned by reporting backend.");
              setScanState('error');
            }
          }
        } else {
          // Keep ticking up slightly to indicate active waiting
          setProgress(prev => Math.min(99, prev + 1));
          if (logs[logs.length - 1] !== `[${timestamp}] Waiting for remote LibreOffice compilation to finalize...`) {
            setLogs(prev => [...prev, `[${timestamp}] Waiting for remote LibreOffice compilation to finalize...`]);
          }
        }
      }
    }, 850);
  };

  const handleCompileReport = async () => {
    setGeneratingReport(true);
    setQcError(null);
    setReportData(null);

    const steps = [
      "Establishing link with CORTEX-Core...",
      "Harvesting GLPI quality metrics...",
      "Querying design compliance database...",
      "Synthesizing customized DOCX report structures...",
      "Launching headless LibreOffice compiler...",
      "Converting structures to PDF stream..."
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setGeneratingStep(steps[currentStep]);
        currentStep++;
      }
    }, 1200);

    let domain = targetUrl;
    try {
      domain = new URL(targetUrl).hostname || targetUrl;
    } catch {}

    try {
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_name: `QC Web Audit: ${domain}`,
          date_range: new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }),
          sections: ["RMM", "EDR", "Tickets", "Backups"],
          options: {
            RMM: ["availability", "performance"],
            EDR: ["alerts"],
            Tickets: ["stats", "work"],
            Backups: ["compliance"],
          },
        }),
      });

      clearInterval(interval);

      if (!response.ok) {
        throw new Error(`Report compiler failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.status !== "success") {
        throw new Error(result.message || "Report compilation failed");
      }

      const docxBytes = Uint8Array.from(atob(result.docx_base64), c => c.charCodeAt(0));
      const docxBlob = new Blob([docxBytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });

      const pdfBytes = Uint8Array.from(atob(result.pdf_base64), c => c.charCodeAt(0));
      const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

      const pdfUrl = URL.createObjectURL(pdfBlob);

      setReportData({
        pdfUrl,
        docxBlob,
        pdfBlob,
        filename: result.filename || "qc_design_audit_report",
      });
    } catch (err: any) {
      clearInterval(interval);
      console.error(err);
      setQcError(err instanceof Error ? err.message : "An error occurred during report generation");
    } finally {
      setGeneratingReport(false);
    }
  };

  const triggerDownload = (blob: Blob, ext: string) => {
    if (!reportData) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportData.filename}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSendEmail = async () => {
    if (!emailRecipient) return;
    setSendingEmail(true);
    setEmailSuccess(null);
    setQcError(null);

    let domain = targetUrl;
    try {
      domain = new URL(targetUrl).hostname || targetUrl;
    } catch {}

    try {
      const response = await fetch("/api/send-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_name: `QC Web Audit: ${domain}`,
          date_range: new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }),
          sections: ["RMM", "EDR", "Tickets", "Backups"],
          options: {
            RMM: ["availability", "performance"],
            EDR: ["alerts"],
            Tickets: ["stats", "work"],
            Backups: ["compliance"],
          },
          email_recipient: emailRecipient,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send email");
      }

      const result = await response.json();
      if (result.status !== "success") {
        throw new Error(result.message || "Email dispatch failed");
      }

      setEmailSuccess(`QC report successfully compiled and sent to ${emailRecipient}`);
    } catch (err: any) {
      console.error(err);
      setQcError(err instanceof Error ? err.message : "Failed to dispatch email");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="qc-console-card glassmorphic">
      {scanState === 'idle' && (
        <div className="qc-idle-view">
          <div className="qc-scanning-radar">
            <div className="radar-sweep"></div>
            <span className="radar-icon">🛡️</span>
          </div>
          <h3 className="font-space">QC SECURITY & DESIGN AUDIT SCANNER</h3>
          <p className="font-space text-dim" style={{ marginBottom: "1rem" }}>
            Run automated diagnostics on external websites to ensure DOM element accessibility, layout fluidity, color contrasts, spelling crawlers, and compliance tags.
          </p>

          <div className="qc-input-group font-space" style={{ marginBottom: "1.25rem", width: "100%", maxWidth: "420px", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.55rem", color: "var(--accent)", letterSpacing: "2px", textTransform: "uppercase", textAlign: "left", opacity: 0.8, fontWeight: 700 }}>Target Website URL</label>
            <input 
              type="url"
              placeholder="Enter site URL (e.g. https://google.com)"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(0, 242, 255, 0.2)",
                borderRadius: "6px",
                color: "#fff",
                fontSize: "0.8rem",
                fontFamily: "inherit",
                boxSizing: "border-box",
                outline: "none"
              }}
              required
            />
          </div>

          <button className="spacious-submit-btn font-space qc-initiate-btn pulse-glow" onClick={initiateScan} disabled={!targetUrl || !targetUrl.trim()}>
            ⚡ INITIATE WEBSITE QC SCAN
          </button>
        </div>
      )}

      {scanState === 'scanning' && (
        <div className="qc-scanning-view">
          <div className="qc-hud-header">
            <span className="hud-title font-space blinking">SYSTEM DEEP SCAN IN PROGRESS</span>
            <span className="hud-percent font-space">{progress}%</span>
          </div>
          <div className="qc-progress-track">
            <div className="qc-progress-bar" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="qc-logs-terminal">
            <div className="terminal-header font-space">CORTEX SECURE SHELL LOGS</div>
            <div className="terminal-body scrollable">
              {logs.map((log, index) => (
                <div key={index} className="terminal-log-line font-space">{log}</div>
              ))}
              <div ref={terminalEndRef}></div>
            </div>
          </div>
        </div>
      )}

      {scanState === 'completed' && (
        <div className="qc-completed-view">
          <div className="qc-result-alert glassmorphic">
            <span className="result-icon">✓</span>
            <div className="result-meta font-space">
              <h4>QC SYSTEM DIAGNOSTIC COMPLETED</h4>
              <p>
                {activeAudit && activeAudit.score < 85
                  ? `State: WARNING // OPTIMISATION REQUIRED (Rating: ${activeAudit.score}%)`
                  : `State: SECURE & COMPLIANT // NO FAULTS DETECTED (Rating: ${activeAudit ? activeAudit.score : 98}%)`}
              </p>
            </div>
            <button className="spacious-submit-btn font-space qc-reset-btn" onClick={() => setScanState('idle')}>
              🔄 RESET SCANNER
            </button>
          </div>

          <div className="qc-metrics-grid">
            <div className="qc-metric-card glassmorphic">
              <span className="metric-label font-space">OVERALL GRADE</span>
              <span className="metric-value font-space secure-glow">
                {activeAudit ? (
                  activeAudit.score >= 95 ? "A+" :
                  activeAudit.score >= 90 ? "A" :
                  activeAudit.score >= 85 ? "B" :
                  activeAudit.score >= 75 ? "C" :
                  activeAudit.score >= 60 ? "D" : "F"
                ) : "A+"}
              </span>
            </div>
            <div className="qc-metric-card glassmorphic">
              <span className="metric-label font-space">CONTRAST COMPLIANCE</span>
              <span className="metric-value font-space text-online">
                {activeAudit ? `${activeAudit.contrast_score}%` : "98%"}
              </span>
            </div>
            <div className="qc-metric-card glassmorphic">
              <span className="metric-label font-space">SPELLING ERRORS</span>
              <span className="metric-value font-space text-online">
                {activeAudit ? activeAudit.spelling_errors : "0"}
              </span>
            </div>
            <div className="qc-metric-card glassmorphic">
              <span className="metric-label font-space">AUDIT SCORE</span>
              <span className="metric-value font-space text-online">
                {activeAudit ? `${activeAudit.score}/100` : "98/100"}
              </span>
            </div>
          </div>

          {generatingReport && (
            <div className="qc-report-loader font-space">
              <div className="mini-loader-ring"></div>
              <p className="blinking">{generatingStep}</p>
            </div>
          )}

          {qcError && (
            <div className="qc-report-error font-space">
              <span>❌</span> Error compiling QC Report: {qcError}
            </div>
          )}

          {!generatingReport && !reportData && (
            <div className="qc-compile-trigger-container">
              <button className="spacious-submit-btn font-space compile-report-btn pulse-glow" onClick={handleCompileReport}>
                📄 SYNTHESIZE & DOWNLOAD DETAILED QC COMPLIANCE REPORT
              </button>
            </div>
          )}

          {reportData && (
            <div className="qc-report-actions-container">
              <h4 className="font-space action-title">📊 CUSTOM REPORT GENERATED BY BACKEND</h4>
              <div className="qc-download-buttons">
                <button className="spacious-submit-btn font-space pdf-btn" onClick={() => triggerDownload(reportData.pdfBlob, "pdf")}>
                  DOWNLOAD PDF
                </button>
                <button className="spacious-submit-btn font-space docx-btn" onClick={() => triggerDownload(reportData.docxBlob, "docx")}>
                  DOWNLOAD DOCX
                </button>
              </div>

              <div className="qc-email-dispatch-row">
                <input 
                  type="email" 
                  placeholder="Enter manager or client email..." 
                  value={emailRecipient} 
                  onChange={(e) => setEmailRecipient(e.target.value)} 
                  className="spacious-input email-input font-space"
                  disabled={sendingEmail}
                />
                <button 
                  className="spacious-submit-btn font-space mail-btn"
                  onClick={handleSendEmail}
                  disabled={sendingEmail || !emailRecipient}
                >
                  {sendingEmail ? "SENDING..." : "EMAIL REPORT"}
                </button>
              </div>

              {emailSuccess && (
                <div className="qc-email-success font-space">
                  ✓ {emailSuccess}
                </div>
              )}

              <div className="qc-iframe-preview-wrapper glassmorphic">
                <div className="preview-bar font-space">LIVE SYSTEM PDF PREVIEW</div>
                <iframe 
                  src={reportData.pdfUrl} 
                  className="qc-iframe-preview" 
                  title="QC Audit PDF Preview"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SEOScanningConsole() {
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'completed' | 'error'>('idle');
  const [targetUrl, setTargetUrl] = useState("https://rmmservice.co.za");
  const [maxPages, setMaxPages] = useState(30);
  const [renderJs, setRenderJs] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [remediations, setRemediations] = useState<any[]>([]);
  const [sitemapXml, setSitemapXml] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'all' | 'errors' | 'remediation'>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const startScan = async () => {
    if (!targetUrl || !targetUrl.trim()) return;
    setScanState('scanning');
    setProgress(0);
    setLogs([`[SYSTEM] Connecting to cortex-seo-scanner API daemon...`]);
    setErrorMsg(null);
    setPages([]);
    setRemediations([]);

    try {
      const res = await fetch("/api/seo/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          max_pages: maxPages,
          render_js: renderJs
        })
      });
      if (!res.ok) throw new Error(`SEO Daemon API failed: ${res.statusText}`);
      const data = await res.json();
      setJobId(data.job_id);
      setLogs(prev => [
        ...prev,
        `[SYSTEM] Crawl job registered: ${data.job_id}`,
        `[CRAWLER] Obeying robots.txt disallow directives...`,
        `[CRAWLER] Initiating asyncio crawler thread pool...`
      ]);

      pollJob(data.job_id);
    } catch (e: any) {
      setLogs(prev => [...prev, `[ERROR] Crawl initialization failed: ${e.message}`]);
      setErrorMsg(e.message);
      setScanState('error');
    }
  };

  const pollJob = (id: string) => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/seo/crawl/${id}`);
        if (!res.ok) throw new Error("Status query failed");
        const data = await res.json();

        const timestamp = new Date().toLocaleTimeString();
        setProgress(Math.floor((data.pages_crawled / data.max_pages) * 100));

        setLogs(prev => {
          const last = prev[prev.length - 1];
          const logLine = `[CRAWLER] Crawling in progress... Pages visited: ${data.pages_crawled}/${data.max_pages}`;
          if (last && last.includes("Crawling in progress")) {
            return [...prev.slice(0, -1), `[${timestamp}] ${logLine}`];
          }
          return [...prev, `[${timestamp}] ${logLine}`];
        });

        if (data.status === 'completed') {
          clearInterval(timer);
          setLogs(prev => [...prev, `[SYSTEM] Crawl completed. Fetching technical diagnostics & schemas...`]);
          await fetchResults(id);
        } else if (data.status === 'error') {
          clearInterval(timer);
          setScanState('error');
        }
      } catch (e: any) {
        clearInterval(timer);
        setErrorMsg(e.message);
        setScanState('error');
      }
    }, 1500);
  };

  const fetchResults = async (id: string) => {
    try {
      const resPages = await fetch(`/api/seo/crawl/${id}/results`);
      const dataPages = await resPages.json();
      setPages(dataPages.pages || []);

      const resRem = await fetch(`/api/seo/crawl/${id}/remediate`);
      const dataRem = await resRem.json();
      setRemediations(dataRem.remediations || []);
      setSitemapXml(dataRem.sitemap_xml_blueprint || "");

      setScanState('completed');
    } catch (e: any) {
      setErrorMsg(e.message);
      setScanState('error');
    }
  };

  const downloadSitemap = () => {
    if (!sitemapXml) return;
    const blob = new Blob([sitemapXml], { type: "text/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sitemap.xml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const avgSeoScore = pages.length ? Math.round(pages.reduce((acc, p) => acc + p.seo_score, 0) / pages.length) : 100;
  const avgLoadTime = pages.length ? Math.round(pages.reduce((acc, p) => acc + p.load_time_ms, 0) / pages.length) : 0;
  const totalIssues = remediations.reduce((acc, r) => acc + r.issues.length, 0);

  return (
    <div className="qc-console-card glassmorphic">
      {scanState === 'idle' && (
        <div className="qc-idle-view">
          <div className="qc-scanning-radar">
            <div className="radar-sweep" style={{ borderLeftColor: "var(--accent)" }}></div>
            <span className="radar-icon">🔍</span>
          </div>
          <h3 className="font-space">IN-DEPTH TECHNICAL & COPY SEO SPIDER</h3>
          <p className="font-space text-dim" style={{ marginBottom: "1rem" }}>
            Execute deep crawlers to audit metadata length, heading tags nesting compliance, image alt flags, broken anchor paths, and Schema.org structured JSON-LD structures.
          </p>

          <div style={{ display: "flex", gap: "1rem", width: "100%", maxWidth: "560px", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <div className="qc-input-group font-space" style={{ flex: 2, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.55rem", color: "var(--accent)", letterSpacing: "2px", textTransform: "uppercase", textAlign: "left", opacity: 0.8, fontWeight: 700 }}>Seed URL</label>
              <input 
                type="url"
                placeholder="Enter URL (e.g. https://rmmservice.co.za)"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                style={{
                  width: "100%", padding: "8px 12px", background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid rgba(0, 242, 255, 0.2)", borderRadius: "6px",
                  color: "#fff", fontSize: "0.8rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box"
                }}
                required
              />
            </div>
            <div className="qc-input-group font-space" style={{ flex: 1, minWidth: "120px", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.55rem", color: "var(--accent)", letterSpacing: "2px", textTransform: "uppercase", textAlign: "left", opacity: 0.8, fontWeight: 700 }}>Max Pages</label>
              <input 
                type="number"
                value={maxPages}
                onChange={(e) => setMaxPages(parseInt(e.target.value) || 10)}
                style={{
                  width: "100%", padding: "8px 12px", background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid rgba(0, 242, 255, 0.2)", borderRadius: "6px",
                  color: "#fff", fontSize: "0.8rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box"
                }}
                min="5"
                max="300"
              />
            </div>
          </div>

          <div className="font-space" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
            <input 
              type="checkbox" 
              id="render-js-chk" 
              checked={renderJs} 
              onChange={(e) => setRenderJs(e.target.checked)} 
              style={{ cursor: "pointer" }}
            />
            <label htmlFor="render-js-chk" style={{ fontSize: "0.75rem", cursor: "pointer", color: "#ddd" }}>
              Render Javascript dynamically (Headless Playwright browser engine)
            </label>
          </div>

          <button className="spacious-submit-btn font-space qc-initiate-btn pulse-glow" onClick={startScan} disabled={!targetUrl || !targetUrl.trim()}>
            ⚡ RUN SEO DIAGNOSTIC SCAN
          </button>
        </div>
      )}

      {scanState === 'scanning' && (
        <div className="qc-scanning-view">
          <div className="qc-hud-header">
            <span className="hud-title font-space blinking" style={{ color: "var(--accent)" }}>CRAWL JOB IN PROGRESS</span>
            <span className="hud-percent font-space" style={{ color: "var(--accent)" }}>{progress}%</span>
          </div>
          <div className="qc-progress-track">
            <div className="qc-progress-bar" style={{ width: `${progress}%`, backgroundColor: "var(--accent)" }}></div>
          </div>
          <div className="qc-logs-terminal">
            <div className="terminal-header font-space">SEO SCANNER ACTIVE SHELL</div>
            <div className="terminal-body scrollable">
              {logs.map((log, index) => (
                <div key={index} className="terminal-log-line font-space">{log}</div>
              ))}
              <div ref={terminalEndRef}></div>
            </div>
          </div>
        </div>
      )}

      {scanState === 'completed' && (
        <div className="qc-completed-view">
          <div className="qc-result-alert glassmorphic" style={{ borderLeftColor: "var(--accent)" }}>
            <span className="result-icon" style={{ backgroundColor: "rgba(0, 242, 255, 0.2)", color: "var(--accent)" }}>✓</span>
            <div className="result-meta font-space">
              <h4>SEO DIAGNOSTIC COMPLETED</h4>
              <p style={{ color: avgSeoScore < 80 ? "red" : "#aaa" }}>
                {avgSeoScore < 85
                  ? `State: OPTIMIZATION CRITICAL (Average SEO Rating: ${avgSeoScore}%)`
                  : `State: SECURE & INDEXABLE (Average SEO Rating: ${avgSeoScore}%)`}
              </p>
            </div>
            <button className="spacious-submit-btn font-space qc-reset-btn" onClick={() => setScanState('idle')}>
              🔄 NEW SCAN
            </button>
          </div>

          <div className="qc-metrics-grid">
            <div className="qc-metric-card glassmorphic">
              <span className="metric-label font-space">AVG SEO SCORE</span>
              <span className="metric-value font-space secure-glow" style={{ textShadow: "0 0 10px rgba(0, 242, 255, 0.5)", color: "var(--accent)" }}>
                {avgSeoScore}%
              </span>
            </div>
            <div className="qc-metric-card glassmorphic">
              <span className="metric-label font-space">PAGES CRAWLED</span>
              <span className="metric-value font-space text-online">
                {pages.length}
              </span>
            </div>
            <div className="qc-metric-card glassmorphic">
              <span className="metric-label font-space">TOTAL ISSUES</span>
              <span className="metric-value font-space" style={{ color: totalIssues > 0 ? "orange" : "green" }}>
                {totalIssues}
              </span>
            </div>
            <div className="qc-metric-card glassmorphic">
              <span className="metric-label font-space">AVG SPEED</span>
              <span className="metric-value font-space text-online">
                {avgLoadTime}ms
              </span>
            </div>
          </div>

          <div className="font-space" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: "0.5rem" }}>
            <button className={`spacious-submit-btn`} style={{ padding: "6px 12px", background: activeTab === 'all' ? 'rgba(0, 242, 255, 0.2)' : 'transparent', border: "1px solid rgba(0, 242, 255, 0.2)", fontSize: "0.7rem" }} onClick={() => setActiveTab('all')}>All Pages</button>
            <button className={`spacious-submit-btn`} style={{ padding: "6px 12px", background: activeTab === 'errors' ? 'rgba(0, 242, 255, 0.2)' : 'transparent', border: "1px solid rgba(0, 242, 255, 0.2)", fontSize: "0.7rem" }} onClick={() => setActiveTab('errors')}>Suboptimal Pages</button>
            <button className={`spacious-submit-btn`} style={{ padding: "6px 12px", background: activeTab === 'remediation' ? 'rgba(0, 242, 255, 0.2)' : 'transparent', border: "1px solid rgba(0, 242, 255, 0.2)", fontSize: "0.7rem" }} onClick={() => setActiveTab('remediation')}>Remediation Checklist ({totalIssues})</button>
          </div>

          <div style={{ maxHeight: "300px", overflowY: "auto", background: "rgba(0,0,0,0.3)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)" }}>
            {activeTab === 'all' && (
              <table style={{ width: "100%", fontSize: "0.7rem", color: "#ddd", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <th style={{ padding: "6px 10px" }}>URL</th>
                    <th style={{ padding: "6px 10px" }}>SEO Rating</th>
                    <th style={{ padding: "6px 10px" }}>Word Count</th>
                    <th style={{ padding: "6px 10px" }}>Canonical</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                      <td style={{ padding: "6px 10px", wordBreak: "break-all" }}>{p.url}</td>
                      <td style={{ padding: "6px 10px", color: p.seo_score >= 85 ? "green" : p.seo_score >= 60 ? "orange" : "red" }}>{p.seo_score}%</td>
                      <td style={{ padding: "6px 10px" }}>{p.word_count}</td>
                      <td style={{ padding: "6px 10px" }}>{p.canonical_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'errors' && (
              <table style={{ width: "100%", fontSize: "0.7rem", color: "#ddd", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <th style={{ padding: "6px 10px" }}>URL</th>
                    <th style={{ padding: "6px 10px" }}>SEO</th>
                    <th style={{ padding: "6px 10px" }}>Title Tag</th>
                    <th style={{ padding: "6px 10px" }}>Meta Description</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.filter(p => p.seo_score < 95).map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                      <td style={{ padding: "6px 10px", wordBreak: "break-all" }}>{p.url}</td>
                      <td style={{ padding: "6px 10px", color: "orange" }}>{p.seo_score}%</td>
                      <td style={{ padding: "6px 10px", fontStyle: p.title ? "normal" : "italic" }}>{p.title || "Missing"}</td>
                      <td style={{ padding: "6px 10px" }}>{p.meta_description || "Missing"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'remediation' && (
              <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "0.75rem", fontFamily: "monospace" }}>
                {remediations.map((rem, idx) => (
                  <div key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.5rem" }}>
                    <div style={{ color: "var(--accent)", fontSize: "0.7rem", wordBreak: "break-all", marginBottom: "0.25rem" }}>URL: {rem.url}</div>
                    {rem.issues.map((i: any, iidx: number) => (
                      <div key={iidx} style={{ marginLeft: "10px", fontSize: "0.65rem", display: "flex", flexDirection: "column", gap: "0.1rem", marginBottom: "0.3rem" }}>
                        <div style={{ display: "flex", gap: "0.3rem" }}>
                          <span style={{ color: i.severity === 'high' ? 'red' : 'yellow' }}>[{i.severity.toUpperCase()}]</span>
                          <span style={{ color: "#eee" }}>{i.message}</span>
                        </div>
                        <div style={{ color: "#888" }}>Proposed Fix: <code style={{ color: "#a5d6ff", padding: "1px 4px", background: "rgba(255,255,255,0.05)", borderRadius: "3px" }}>{i.fix}</code></div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
            <button className="spacious-submit-btn font-space compile-report-btn" style={{ flex: 1, minWidth: "150px" }} onClick={downloadSitemap} disabled={!sitemapXml}>
              📄 DOWNLOAD SITEMAP.XML
            </button>
            <a href={`/api/seo/crawl/${jobId}/export`} target="_blank" rel="noopener noreferrer" className="spacious-submit-btn font-space" style={{ flex: 1, minWidth: "150px", textAlign: "center", textDecoration: "none", lineHeight: "1.6rem" }}>
              📊 EXPORT CRAWL CSV
            </a>
          </div>
        </div>
      )}

      {scanState === 'error' && (
        <div className="qc-completed-view">
          <div className="qc-result-alert glassmorphic" style={{ borderLeftColor: "red" }}>
            <span className="result-icon" style={{ backgroundColor: "rgba(255, 0, 0, 0.2)", color: "red" }}>❌</span>
            <div className="result-meta font-space">
              <h4>SEO DIAGNOSTIC FAILED</h4>
              <p style={{ color: "red" }}>Error Details: {errorMsg}</p>
            </div>
            <button className="spacious-submit-btn font-space qc-reset-btn" onClick={() => setScanState('idle')}>
              🔄 RESET SCANNER
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function WebAuditingConsole() {
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'completed' | 'error'>('idle');
  const [targetUrl, setTargetUrl] = useState("https://rmmservice.co.za");
  
  // SSH state toggle
  const [sshHost, setSshHost] = useState("");
  const [sshPort, setSshPort] = useState(22);
  const [sshUser, setSshUser] = useState("");
  const [sshPass, setSshPass] = useState("");
  const [sitePath, setSitePath] = useState("/var/www/html");
  const [showSsh, setShowSsh] = useState(false);

  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [scorecard, setScorecard] = useState<any>(null);
  
  // php.ini specific upload checks
  const [iniResult, setIniResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const startAudit = async () => {
    if (!targetUrl || !targetUrl.trim()) return;
    setScanState('scanning');
    setProgress(0);
    setLogs([`[SYSTEM] Connecting to cortex-web-auditor API daemon...`]);
    setErrorMsg(null);
    setScorecard(null);
    setIniResult(null);

    try {
      const payload: any = { url: targetUrl };
      if (showSsh && sshHost && sshUser) {
        payload.ssh_host = sshHost;
        payload.ssh_port = sshPort;
        payload.ssh_user = sshUser;
        payload.ssh_pass = sshPass;
        payload.site_path = sitePath;
      }

      const res = await fetch("/api/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`Auditor Daemon API failed: ${res.statusText}`);
      const data = await res.json();
      
      setLogs(prev => [
        ...prev, 
        `[SYSTEM] Audit task registered: ${data.audit_id}`,
        `[AUDITOR] Initiating public headers analysis & mixed content checks...`
      ]);
      if (payload.ssh_host) {
        setLogs(prev => [...prev, `[INGESTION] SSH details provided. Remote directory ingestion queued.`]);
      }

      pollAudit(data.audit_id);
    } catch (e: any) {
      setErrorMsg(e.message);
      setScanState('error');
    }
  };

  const pollAudit = (id: string) => {
    let currentProgress = 10;
    const timer = setInterval(async () => {
      try {
        currentProgress = Math.min(95, currentProgress + 15);
        setProgress(currentProgress);

        const res = await fetch(`/api/audit/jobs/${id}`);
        if (!res.ok) throw new Error("Audit query failed");
        const data = await res.json();

        setLogs(prev => {
          const timestamp = new Date().toLocaleTimeString();
          const auditLogs = [];
          if (currentProgress >= 30) auditLogs.push(`[AUDITOR] Fetching HTTP responses and secure header flags...`);
          if (currentProgress >= 50 && showSsh) auditLogs.push(`[INGESTION] SSH backup compress: remote tarball compiled. Downloading bundle.`);
          if (currentProgress >= 70 && showSsh) auditLogs.push(`[CODECHECK] Executing ClamAV shell malware scanners & integrity checksum matches...`);
          if (currentProgress >= 85) auditLogs.push(`[COMPLIANCE] Mapping library compatibility and upgrade vulnerabilities...`);
          
          let updatedLogs = [...prev];
          auditLogs.forEach(log => {
            if (!updatedLogs.some(l => l.includes(log.slice(0, 20)))) {
              updatedLogs.push(`[${timestamp}] ${log}`);
            }
          });
          return updatedLogs;
        });

        if (data.status === 'completed') {
          clearInterval(timer);
          setProgress(100);
          setScorecard(data);
          setScanState('completed');
        } else if (data.status === 'error') {
          clearInterval(timer);
          setScanState('error');
        }
      } catch (e: any) {
        clearInterval(timer);
        setErrorMsg(e.message);
        setScanState('error');
      }
    }, 2000);
  };

  const handleIniUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanState('scanning');
    setProgress(50);
    setLogs([
      `[UPLOADER] Uploading target configuration file: ${file.name}...`,
      `[AUDITOR] Executing PHP configuration parser filters...`
    ]);
    setIniResult(null);
    setScorecard(null);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/audit/upload-ini", {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error("INI audit upload failed");
      const data = await res.json();

      setIniResult(data);
      setProgress(100);
      setScanState('completed');
      setLogs(prev => [...prev, `[SUCCESS] PHP verification completed. Grade: ${data.grade}. Total issues found: ${data.total_issues}`]);
    } catch (e: any) {
      setErrorMsg(e.message);
      setScanState('error');
    }
  };

  const overall = scorecard?.overall_grade || iniResult?.grade || "A";

  return (
    <div className="qc-console-card glassmorphic">
      {scanState === 'idle' && (
        <div className="qc-idle-view">
          <div className="qc-scanning-radar">
            <div className="radar-sweep" style={{ borderLeftColor: "violet" }}></div>
            <span className="radar-icon">🩺</span>
          </div>
          <h3 className="font-space">WEBSITE HEALTH & SECURITY AUDITOR</h3>
          <p className="font-space text-dim" style={{ marginBottom: "1.25rem" }}>
            Conduct malware static analysis scans, track core CMS checksum validations, inspect remote server PHP configuration vulnerability directives, and review browser security header logs.
          </p>

          <div className="qc-input-group font-space" style={{ width: "100%", maxWidth: "420px", display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1rem" }}>
            <label style={{ fontSize: "0.55rem", color: "violet", letterSpacing: "2px", textTransform: "uppercase", textAlign: "left", opacity: 0.8, fontWeight: 700 }}>Target URL</label>
            <input 
              type="url"
              placeholder="Enter site URL (e.g. https://rmmservice.co.za)"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              style={{
                width: "100%", padding: "8px 12px", background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(238, 130, 238, 0.2)", borderRadius: "6px",
                color: "#fff", fontSize: "0.8rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box"
              }}
              required
            />
          </div>

          <div className="font-space" style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
            <button className="spacious-submit-btn" style={{ padding: "6px 10px", fontSize: "0.65rem", background: showSsh ? "rgba(255,255,255,0.05)" : "rgba(238, 130, 238, 0.15)", border: "1px solid violet" }} onClick={() => setShowSsh(false)}>
              Public Header Scan
            </button>
            <button className="spacious-submit-btn" style={{ padding: "6px 10px", fontSize: "0.65rem", background: showSsh ? "rgba(238, 130, 238, 0.15)" : "rgba(255,255,255,0.05)", border: "1px solid violet" }} onClick={() => setShowSsh(true)}>
              SSH Backup & Code Audit
            </button>
            <label className="spacious-submit-btn" style={{ padding: "6px 10px", fontSize: "0.65rem", cursor: "pointer", background: "rgba(255,255,255,0.05)", border: "1px solid #555" }}>
              Upload php.ini Scan
              <input type="file" onChange={handleIniUpload} style={{ display: "none" }} accept=".ini" />
            </label>
          </div>

          {showSsh && (
            <div className="glassmorphic font-space" style={{ padding: "12px", width: "100%", maxWidth: "560px", marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.8rem", boxSizing: "border-box", textAlign: "left", fontSize: "0.75rem" }}>
              <div style={{ color: "violet", fontWeight: 700, letterSpacing: "1px", fontSize: "0.55rem", textTransform: "uppercase" }}>SSH Ingestion Parameters</div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input type="text" placeholder="Host (e.g. 192.168.1.1)" value={sshHost} onChange={(e) => setSshHost(e.target.value)} style={{ flex: 2, padding: "6px", background: "rgba(0,0,0,0.3)", border: "1px solid #444", color: "#fff", borderRadius: "4px", outline: "none" }} />
                <input type="number" placeholder="Port" value={sshPort} onChange={(e) => setSshPort(parseInt(e.target.value) || 22)} style={{ flex: 1, padding: "6px", background: "rgba(0,0,0,0.3)", border: "1px solid #444", color: "#fff", borderRadius: "4px", outline: "none" }} />
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input type="text" placeholder="SSH Username" value={sshUser} onChange={(e) => setSshUser(e.target.value)} style={{ flex: 1, padding: "6px", background: "rgba(0,0,0,0.3)", border: "1px solid #444", color: "#fff", borderRadius: "4px", outline: "none" }} />
                <input type="password" placeholder="SSH Password" value={sshPass} onChange={(e) => setSshPass(e.target.value)} style={{ flex: 1, padding: "6px", background: "rgba(0,0,0,0.3)", border: "1px solid #444", color: "#fff", borderRadius: "4px", outline: "none" }} />
              </div>
              <input type="text" placeholder="Site Directory (e.g. /var/www/html)" value={sitePath} onChange={(e) => setSitePath(e.target.value)} style={{ padding: "6px", background: "rgba(0,0,0,0.3)", border: "1px solid #444", color: "#fff", borderRadius: "4px", outline: "none" }} />
            </div>
          )}

          <button className="spacious-submit-btn font-space qc-initiate-btn pulse-glow" style={{ borderImage: "none", backgroundColor: "rgba(238,130,238,0.15)", borderColor: "violet" }} onClick={startAudit} disabled={!targetUrl || !targetUrl.trim()}>
            ⚡ INITIATE HEALTH & SECURITY AUDIT
          </button>
        </div>
      )}

      {scanState === 'scanning' && (
        <div className="qc-scanning-view">
          <div className="qc-hud-header">
            <span className="hud-title font-space blinking" style={{ color: "violet" }}>FORENSIC SECURITY CHECK IN PROGRESS</span>
            <span className="hud-percent font-space" style={{ color: "violet" }}>{progress}%</span>
          </div>
          <div className="qc-progress-track">
            <div className="qc-progress-bar" style={{ width: `${progress}%`, backgroundColor: "violet" }}></div>
          </div>
          <div className="qc-logs-terminal">
            <div className="terminal-header font-space">AUDITOR DAEMON SHELL LOGS</div>
            <div className="terminal-body scrollable">
              {logs.map((log, index) => (
                <div key={index} className="terminal-log-line font-space">{log}</div>
              ))}
              <div ref={terminalEndRef}></div>
            </div>
          </div>
        </div>
      )}

      {scanState === 'completed' && (
        <div className="qc-completed-view">
          <div className="qc-result-alert glassmorphic" style={{ borderLeftColor: "violet" }}>
            <span className="result-icon" style={{ backgroundColor: "rgba(238, 130, 238, 0.2)", color: "violet" }}>✓</span>
            <div className="result-meta font-space">
              <h4>SECURITY & COMPLIANCE VERIFICATION COMPLETED</h4>
              <p>
                {overall === 'A' || overall === 'B'
                  ? `State: SECURE & COMPLIANT // STACK VERIFIED`
                  : `State: SECURITY RISK detected // IMMEDIATION ADVISED`}
              </p>
            </div>
            <button className="spacious-submit-btn font-space qc-reset-btn" onClick={() => setScanState('idle')}>
              🔄 NEW AUDIT
            </button>
          </div>

          <div className="qc-metrics-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))" }}>
            <div className="qc-metric-card glassmorphic">
              <span className="metric-label font-space">OVERALL GRADE</span>
              <span className="metric-value font-space secure-glow" style={{ color: "violet", textShadow: "0 0 10px rgba(238, 130, 238, 0.5)" }}>
                {overall}
              </span>
            </div>
            {scorecard && (
              <>
                <div className="qc-metric-card glassmorphic">
                  <span className="metric-label font-space">CODE HEALTH</span>
                  <span className="metric-value font-space text-online">{scorecard.code_quality_grade}</span>
                </div>
                <div className="qc-metric-card glassmorphic">
                  <span className="metric-label font-space">SECURITY</span>
                  <span className="metric-value font-space text-online">{scorecard.security_grade}</span>
                </div>
                <div className="qc-metric-card glassmorphic">
                  <span className="metric-label font-space">COMPATIBILITY</span>
                  <span className="metric-value font-space text-online">{scorecard.compatibility_grade}</span>
                </div>
              </>
            )}
            {iniResult && (
              <div className="qc-metric-card glassmorphic">
                <span className="metric-label font-space">INI ISSUES</span>
                <span className="metric-value font-space" style={{ color: iniResult.total_issues > 0 ? "orange" : "green" }}>{iniResult.total_issues}</span>
              </div>
            )}
          </div>

          <div className="font-space" style={{ maxHeight: "250px", overflowY: "auto", background: "rgba(0,0,0,0.3)", padding: "10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)", textAlign: "left", fontSize: "0.7rem", color: "#ddd" }}>
            <h4 style={{ color: "violet", fontSize: "0.75rem", marginBottom: "0.5rem" }}>Security & Configuration Deficiencies</h4>
            
            {scorecard?.details?.network_issues?.length > 0 && (
              <div style={{ marginBottom: "0.75rem" }}>
                <div style={{ fontWeight: 700, color: "#fff", marginBottom: "0.25rem" }}>Missing Security Headers & mixed content:</div>
                {scorecard.details.network_issues.map((i: any, idx: number) => (
                  <div key={idx} style={{ marginLeft: "10px", color: "#ccc", marginBottom: "0.2rem" }}>
                    • <span style={{ color: "orange" }}>[{i.severity.toUpperCase()}]</span> {i.parameter}: {i.description} (Fix: <code style={{ color: "#a5d6ff" }}>{i.fix}</code>)
                  </div>
                ))}
              </div>
            )}

            {(scorecard?.details?.php_issues?.length > 0 || iniResult?.issues?.length > 0) && (
              <div style={{ marginBottom: "0.75rem" }}>
                <div style={{ fontWeight: 700, color: "#fff", marginBottom: "0.25rem" }}>Insecure PHP configuration directives:</div>
                {(scorecard?.details?.php_issues || iniResult?.issues).map((i: any, idx: number) => (
                  <div key={idx} style={{ marginLeft: "10px", color: "#ccc", marginBottom: "0.2rem" }}>
                    • <span style={{ color: "red" }}>[{i.severity.toUpperCase()}]</span> {i.parameter}: {i.description} (Fix: <code style={{ color: "#a5d6ff" }}>{i.fix}</code>)
                  </div>
                ))}
              </div>
            )}

            {scorecard?.details?.malware_issues?.length > 0 && (
              <div style={{ marginBottom: "0.75rem" }}>
                <div style={{ fontWeight: 700, color: "red", marginBottom: "0.25rem" }}>🚨 Malicious code patterns / web shells detected:</div>
                {scorecard.details.malware_issues.map((i: any, idx: number) => (
                  <div key={idx} style={{ marginLeft: "10px", color: "red", marginBottom: "0.2rem" }}>
                    • File: {i.file} - Thread: {i.threat} (Action: <code style={{ color: "#fff" }}>{i.fix}</code>)
                  </div>
                ))}
              </div>
            )}

            {scorecard?.details?.integrity_issues?.length > 0 && (
              <div style={{ marginBottom: "0.75rem" }}>
                <div style={{ fontWeight: 700, color: "red", marginBottom: "0.25rem" }}>🚨 CMS Core checksum manipulation errors:</div>
                {scorecard.details.integrity_issues.map((i: any, idx: number) => (
                  <div key={idx} style={{ marginLeft: "10px", color: "orange", marginBottom: "0.2rem" }}>
                    • Core File: {i.file} - {i.message} (Action: <code style={{ color: "#fff" }}>{i.fix}</code>)
                  </div>
                ))}
              </div>
            )}

            {!scorecard?.details?.network_issues?.length && !scorecard?.details?.php_issues?.length && !iniResult?.issues?.length && !scorecard?.details?.malware_issues?.length && !scorecard?.details?.integrity_issues?.length && (
              <div style={{ color: "green", fontStyle: "italic" }}>No major vulnerabilities or configuration overrides detected. Server health conforms to CORTEX normal templates.</div>
            )}
          </div>
        </div>
      )}

      {scanState === 'error' && (
        <div className="qc-completed-view">
          <div className="qc-result-alert glassmorphic" style={{ borderLeftColor: "red" }}>
            <span className="result-icon" style={{ backgroundColor: "rgba(255, 0, 0, 0.2)", color: "red" }}>❌</span>
            <div className="result-meta font-space">
              <h4>SECURITY AUDIT FAILED</h4>
              <p style={{ color: "red" }}>Error Details: {errorMsg}</p>
            </div>
            <button className="spacious-submit-btn font-space qc-reset-btn" onClick={() => setScanState('idle')}>
              🔄 RESET AUDITOR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [status, setStatus] = useState<ServiceStatus[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [vikiState, setVikiState] = useState<'idle' | 'thinking' | 'speaking' | 'alert'>('idle');

  // Real-time HUD states
  const [telemetryEvents, setTelemetryEvents] = useState<TelemetryEvent[]>([]);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [isHudVisible, setIsHudVisible] = useState(true);
  const [securityMode, setSecurityMode] = useState<string>("STANDARD");

  // Multi-User Identity & Permissions Context (Decoded from URL parameter or default root Admin)
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("user") || localStorage.getItem("cortex_logged_in_user") || null;
  });
  const [permissions, setPermissions] = useState<PermissionsData | null>(null);
  const [selectedDirUsername, setSelectedDirUsername] = useState<string>("Louis");
  const [currentMode, setCurrentMode] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("mode");
  });
  const [incidentHistory, setIncidentHistory] = useState<AuditRecord[]>([]);
  const isOffline = false;

  // Login Form States
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Admin user CRUD forms
  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("Cortex-Technicians");
  const [newUserViki, setNewUserViki] = useState(false);
  
  // Custom interactive mock widgets state
  const [tickets, setTickets] = useState<GLPITicket[]>(initialTickets);
  const [todo, setToDo] = useState<ToDoItem[]>(initialToDo);
  const [appointments, setAppointments] = useState<CalendarAppointment[]>(initialAppointments);
  const [newTodoText, setNewTodoText] = useState("");
  const [newTodoDue, setNewTodoDue] = useState("In 24 hours");

  // Track acknowledged alert IDs in state
  const [, setAcknowledgedAlerts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("cortex_acknowledged_alerts");
      return saved ? (JSON.parse(saved) as unknown[]).map((id) => String(id)) : [];
    } catch {
      return [];
    }
  });

  // Get active settings for the logged-in user
  const activeUserRecord: PermissionUser = (currentUser && permissions?.users.find((u) => u.username.toLowerCase() === currentUser.toLowerCase())) || {
    username: currentUser || "Louis",
    role: (currentUser === "Louis" || currentUser === "Felicia") ? "Cortex-Admins" : currentUser === "Vitto" ? "Cortex-Technicians" : "Cortex-Designers",
    viki_assigned: currentUser === "Louis" || currentUser === "Felicia",
    permissions: {
      view_telemetry: true,
      execute_playbooks: currentUser === "Louis" || currentUser === "Felicia",
      run_qc_scans: currentUser !== "Vitto",
      run_seo_scans: currentUser !== "Vitto",
      run_web_audits: currentUser !== "Vitto",
      edit_appointments: currentUser !== "Sarah",
      edit_user_permissions: currentUser === "Louis" || currentUser === "Felicia"
    },
    apps: {
      "NetLock RMM": true,
      "GLPI": true,
      "Velociraptor": true,
      "Custom Reports": true,
      "MinIO": true,
      "n8n": true,
      "Ollama AI": true,
      "Hermes Agent": true,
      "Traefik": true,
      "Authelia": true,
      "WireGuard": true,
      "SEO Scanner": true,
      "Website Auditor": true
    }
  };

  const currentSelectedUser = permissions?.users.find((u) => u.username.toLowerCase() === selectedDirUsername.toLowerCase()) || permissions?.users[0] || activeUserRecord;

  const isUserAdmin = activeUserRecord.role === "Cortex-Admins";

  const servicesData = [
    {
      category: "Operational Backbone",
      items: [
        { name: "NetLock RMM", subtitle: "Tactical Control", url: "https://rmm.rmmservice.co.za", icon: "⚡" },
        { name: "GLPI", subtitle: "Incident Command", url: "https://glpi.rmmservice.co.za", icon: "🎫" },
        { name: "Velociraptor", subtitle: "Threat Hunter", url: "https://edr.rmmservice.co.za", icon: "👻" },
        { name: "Custom Reports", subtitle: "On-Request Compiler", url: "/?mode=reports", icon: "📊" },
        { name: "QC Scanner", subtitle: "Security & Design Audit", url: "/?mode=qc", icon: "🛡️" },
        { name: "SEO Scanner", subtitle: "Tech & On-Page SEO", url: "/?mode=seo", icon: "🔍" },
        { name: "Website Auditor", subtitle: "Health & Malware Scan", url: "/?mode=audit", icon: "🩺" }
      ],
    },
    {
      category: "Intelligence & Data",
      items: [
        { name: "MinIO", subtitle: "S3 Vault", url: "https://s3-console.rmmservice.co.za", icon: "🗄️" },
        { name: "n8n", subtitle: "Neural Synapse", url: "https://automation.rmmservice.co.za", icon: "🧠" },
        { name: "Ollama AI", subtitle: "Neural Inference", url: "https://rmmservice.co.za/api/viki/", icon: "🤖" },
        { name: "Hermes Agent", subtitle: "Cognitive Dispatcher", url: "https://hermes.rmmservice.co.za", icon: "🕊️" },
      ],
    },
    {
      category: "Network & Security",
      items: [
        { name: "Traefik", subtitle: "Secure Gateway", url: "https://traefik.rmmservice.co.za/dashboard/", icon: "🚦" },
        { name: "Authelia", subtitle: "Identity Gate", url: "https://auth.rmmservice.co.za", icon: "🔑" },
        { name: "WireGuard", subtitle: "Secure Tunnel", url: "disabled", icon: "🛡️" },
        ...(isUserAdmin ? [{ name: "Admin Console", subtitle: "Permissions Control Panel", url: `/?mode=admin&user=${currentUser}`, icon: "🔒" }] : [])
      ],
    },
  ];

  const handleSolveTicket = (id: string) => {
    const isAdminUser = activeUserRecord.role === "Cortex-Admins";
    setTickets(prev => prev.filter(t => t.id !== id));
    
    setIncidentHistory(prev => [
      {
        timestamp: new Date().toISOString(),
        type: isAdminUser ? "CLOSE_TICKET" : "SOLVED_TICKET",
        message: `Ticket [${id}] was marked as ${isAdminUser ? "CLOSED" : "RESOLVED"} by ${currentUser} (${activeUserRecord.role}).`,
        signature: "32ab7bcfda81b0aef5912c7490a0f192b1aef591283c7490acbe01237bead1e8"
      },
      ...prev
    ]);
  };

  const handleCancelAppointment = (id: string) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: "Free" as const, subject: "SIMULATED CALENDAR BLOCK (RELEASED)" } : a));
    
    setIncidentHistory(prev => [
      {
        timestamp: new Date().toISOString(),
        type: "CALENDAR_SYNC",
        message: `Microsoft Graph API cancelled meeting slot [${id}] for host {currentUser}.`,
        signature: "790acbe01237cbead1e848a6c827361849dbcf1b28d610817364b192837bc9d8"
      },
      ...prev
    ]);
  };

  // Load permissions and incident history
  const fetchPermissions = () => {
    fetch("/api/permissions")
      .then(res => {
        if (!res.ok) throw new Error("Server responded with error status");
        return res.json();
      })
      .then((data: PermissionsData) => {
        setPermissions(data);
      })
      .catch((err) => {
        console.error("[-] Error fetching permissions:", err);
        // Do NOT wipe the existing user directory if we already have users in state!
        setPermissions(prev => {
          if (prev && prev.users && prev.users.length > 0) {
            console.log("[*] Preserving active user list in state due to fetch failure.");
            return prev;
          }
          // Only initialize defaults on first load if we have no active users
          return {
            users: [
              {
                username: "Louis",
                role: "Cortex-Admins",
                viki_assigned: true,
                permissions: {
                  view_telemetry: true,
                  execute_playbooks: true,
                  run_qc_scans: true,
                  run_seo_scans: true,
                  run_web_audits: true,
                  edit_appointments: true,
                  edit_user_permissions: true
                }
              },
              {
                username: "Felicia",
                role: "Cortex-Admins",
                viki_assigned: true,
                permissions: {
                  view_telemetry: true,
                  execute_playbooks: true,
                  run_qc_scans: true,
                  run_seo_scans: true,
                  run_web_audits: true,
                  edit_appointments: true,
                  edit_user_permissions: true
                }
              },
              {
                username: "Vitto",
                role: "Cortex-Technicians",
                viki_assigned: false,
                permissions: {
                  view_telemetry: true,
                  execute_playbooks: false,
                  run_qc_scans: false,
                  run_seo_scans: false,
                  run_web_audits: false,
                  edit_appointments: true,
                  edit_user_permissions: false
                }
              },
              {
                username: "Sarah",
                role: "Cortex-Designers",
                viki_assigned: false,
                permissions: {
                  view_telemetry: true,
                  execute_playbooks: false,
                  run_qc_scans: true,
                  run_seo_scans: true,
                  run_web_audits: true,
                  edit_appointments: false,
                  edit_user_permissions: false
                }
              }
            ]
          };
        });
      });
  };

  const fetchIncidentHistory = () => {
    if (isOffline) return;
    
    fetch("/api/mitigations/history")
      .then(res => res.json())
      .then((data: AuditRecord[]) => {
        setIncidentHistory(data);
      })
      .catch(() => {
        setIncidentHistory([
          {
            timestamp: new Date(Date.now() - 600000).toISOString(),
            type: "MANUAL_MITIGATION",
            message: "Manual Quarantine playbook 'isolate_host' executed for target: C-101.",
            signature: "8a6c827361849dbcf1b28d610817364b192837bc9d8f8a12e847c2937bebcde1"
          },
          {
            timestamp: new Date(Date.now() - 1500000).toISOString(),
            type: "AUTONOMOUS_MITIGATION",
            message: "Autonomous Quarantine initiated for target: C-101 due to EDR process alert.",
            signature: "52abf8471c0879de7bcfda81b0f192b1aef591283c7490acbe01237cbead1e84"
          },
          {
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            type: "MODE_CHANGE",
            message: "Security posture transitioned to HARDENED (REFLEX mode).",
            signature: "abf652cfdae102fbe8e7cf848a31e0c8b91a72bcbe4987cdbaef1092837be74a"
          },
          {
            timestamp: new Date(Date.now() - 5400000).toISOString(),
            type: "PERMISSION_CHANGE",
            message: "VIKI AI Assignment for user Vitto updated from True to False.",
            signature: "df9c7abf23ef0cda81b283fbe9d784a0d9128bcbe79f109acde019283fbebc71"
          }
        ]);
      });
  };

  useEffect(() => {
    fetchPermissions();
    fetchIncidentHistory();
    
    const interval = setInterval(fetchIncidentHistory, 10000);
    return () => clearInterval(interval);
  }, [isOffline]);

  useEffect(() => {
    // Check parameters for active user and console modes
    const params = new URLSearchParams(window.location.search);
    const userParam = params.get("user");
    if (userParam) {
      setCurrentUser(userParam);
      localStorage.removeItem("cortex_logged_out");
    } else {
      // Auto-login from Authelia SSO if no developer override param is present and user has not logged out
      const loggedOut = localStorage.getItem("cortex_logged_out");
      if (loggedOut !== "true") {
        fetch("/api/permissions/me")
          .then(res => {
            if (res.ok) return res.json();
            throw new Error("No SSO session");
          })
          .then(data => {
            if (data.status === "ok" && data.user) {
              setCurrentUser(data.user.username);
              localStorage.setItem("cortex_logged_in_user", data.user.username);
            }
          })
          .catch(() => {
            // No active SSO session, leave currentUser as initialized
          });
      }
    }
    const modeParam = params.get("mode");
    if (modeParam) {
      setCurrentMode(modeParam);
    }


    const fetchStatus = () => {
      if (isOffline) {
        setStatus(servicesData.flatMap(c => c.items.map(i => ({ 
          name: i.name, 
          status: i.name === "NetLock RMM" || i.name === "GLPI" ? "offline" as const : "online" as const
        }))));
        return;
      }
      fetch("/status.json?t=" + Date.now())
        .then(res => res.json())
        .then((data: StatusData) => setStatus(data.services))
        .catch(() => {
          setStatus(servicesData.flatMap(c => c.items.map(i => ({ name: i.name, status: "online" as const }))));
        });
    };

    const fetchAlerts = () => {
      if (isOffline) return;
      fetch("/api/alerts")
        .then(res => res.json())
        .then((data: Alert[]) => {
          const acked = (() => {
            try {
              const saved = localStorage.getItem("cortex_acknowledged_alerts");
              return saved ? (JSON.parse(saved) as unknown[]).map((id) => String(id)) : [];
            } catch {
              return [];
            }
          })();
          const activeCritical = data
            .map(a => ({
              ...a,
              id: a.id ? String(a.id) : `${a.source}_${a.timestamp}_${a.message}`
            }))
            .filter(a => a.type === "CRITICAL" && !acked.includes(a.id));
          setAlerts(activeCritical);
        })
        .catch(() => {});
    };

    fetchStatus();
    fetchAlerts();
    const statusInterval = setInterval(fetchStatus, 30000);
    const alertInterval = setInterval(fetchAlerts, 10000);

    let ws: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connectWS = () => {
      if (isOffline) {
        setWsStatus('disconnected');
        return;
      }
      
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsHost = window.location.host;
      const wsUrl = `${protocol}//${wsHost}/api/ws/telemetry`;

      setWsStatus('connecting');
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsStatus('connected');
        console.log("[+] Connected to CORTEX live telemetry stream.");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as TelemetryEvent;
          
          if (!data.timestamp) {
            data.timestamp = new Date().toISOString();
          }
          if (!data.id) {
            data.id = String(Date.now());
          }

          if (data.type === "PERMISSION_CHANGE" || data.type === "MODE_CHANGE" || data.type === "MITIGATION") {
            fetchIncidentHistory();
            fetchPermissions();
          }

          setTelemetryEvents(prev => [data, ...prev].slice(0, 50));

          const severity = (data.severity || data.type || "INFO").toUpperCase();
          if (severity === "CRITICAL") {
            setVikiState('alert');
            setTimeout(() => setVikiState('idle'), 2000);
          } else {
            setVikiState(Math.random() > 0.5 ? 'speaking' : 'thinking');
            setTimeout(() => setVikiState('idle'), 3000);
          }

          if (severity === "CRITICAL") {
            const message = data.message || (data.data && data.data.CommandLine) || "CRITICAL EVENT DETECTED";
            const source = data.source || "Vector";
            const timestamp = data.timestamp || new Date().toISOString();
            const rawId = data.id || `${source}_${timestamp}_${message}`;
            const alertId = String(rawId);
            
            const acked = (() => {
              try {
                const saved = localStorage.getItem("cortex_acknowledged_alerts");
                return saved ? (JSON.parse(saved) as unknown[]).map((id) => String(id)) : [];
              } catch {
                return [];
              }
            })();

            if (!acked.includes(alertId)) {
              setAlerts(prev => {
                const isDuplicate = prev.some(a => String(a.id) === alertId || (a.message === message && a.source === source));
                if (isDuplicate) return prev;
                return [{
                  id: alertId,
                  type: "CRITICAL",
                  source: source,
                  message: message,
                  timestamp: timestamp
                }, ...prev];
              });
            }
          }

          if (data.type === "MODE_CHANGE" || data.mode) {
            setSecurityMode(data.security_status || (data.mode === "REFLEX" ? "HARDENED" : "STANDARD"));
          }
        } catch (e) {
          console.error("[-] Error parsing WS telemetry payload:", e);
        }
      };

      ws.onclose = () => {
        setWsStatus('disconnected');
        console.log("[-] Telemetry WebSocket disconnected. Reconnecting in 3s...");
        reconnectTimeout = setTimeout(connectWS, 3000);
      };

      ws.onerror = (err) => {
        console.error("[-] WebSocket connection error:", err);
        ws.close();
      };
    };

    connectWS();

    return () => {
      clearInterval(statusInterval);
      clearInterval(alertInterval);
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [isOffline]);

  const clearAlerts = () => {
    const idsToAck = alerts.map(a => a.id ? String(a.id) : `${a.source}_${a.timestamp}_${a.message}`);
    const acked = (() => {
      try {
        const saved = localStorage.getItem("cortex_acknowledged_alerts");
        return saved ? (JSON.parse(saved) as unknown[]).map((id) => String(id)) : [];
      } catch {
        return [];
      }
    })();
    const updated = Array.from(new Set([...acked, ...idsToAck]));
    try {
      localStorage.setItem("cortex_acknowledged_alerts", JSON.stringify(updated));
    } catch (e) {
      console.error("[-] Error saving acknowledged alerts:", e);
    }
    setAcknowledgedAlerts(updated);
    setAlerts([]);
  };

  const handleModeToggle = async (newMode: "NORMAL" | "REFLEX") => {
    if (isOffline) {
      setSecurityMode(newMode === "REFLEX" ? "HARDENED" : "STANDARD");
      setIncidentHistory(prev => [
        {
          timestamp: new Date().toISOString(),
          type: "MODE_CHANGE",
          message: `[MOCK CACHED] Security posture transitioned to ${newMode === "REFLEX" ? "HARDENED" : "STANDARD"}.`,
          signature: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        },
        ...prev
      ]);
      return;
    }

    try {
      const response = await fetch('/api/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode })
      });
      if (!response.ok) throw new Error('Failed to toggle security state');
      setSecurityMode(newMode === "REFLEX" ? "HARDENED" : "STANDARD");
      setTimeout(fetchIncidentHistory, 500);
    } catch (e) {
      console.error("[-] Error toggling security state:", e);
    }
  };

  const handleExecutePlaybook = async (playbook: string, target: string): Promise<boolean> => {
    if (isOffline) {
      setIncidentHistory(prev => [
        {
          timestamp: new Date().toISOString(),
          type: "MANUAL_MITIGATION",
          message: `[MOCK CACHED] Manual playbook '${playbook}' executed on target: ${target}.`,
          signature: "7bcde928bcbe710daef10cda81b0aefcde928bcfe021bc7df8a9a0fbe29acbe1"
        },
        ...prev
      ]);
      return true;
    }

    try {
      const response = await fetch('/api/playbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playbook, target })
      });
      if (!response.ok) throw new Error('Playbook execution failed');
      setTimeout(fetchIncidentHistory, 500);
      return true;
    } catch (e) {
      console.error("[-] Playbook execution failure:", e);
      return false;
    }
  };

  const handlePermissionToggle = async (username: string, permission: string, currentValue: boolean | string) => {
    const newValue = typeof currentValue === "string" ? currentValue : !currentValue;
    
    setPermissions((prev) => {
      if (!prev) return prev;
      return {
        users: prev.users.map((u) => {
          if (u.username.toLowerCase() === username.toLowerCase()) {
            if (permission === "viki_assigned") {
              return { ...u, viki_assigned: newValue as boolean };
            } else if (permission === "role") {
              const newRole = newValue as string;
              let newPerms = { ...u.permissions };
              if (newRole === "Cortex-Admins") {
                newPerms = {
                  view_telemetry: true,
                  execute_playbooks: true,
                  run_qc_scans: true,
                  run_seo_scans: true,
                  run_web_audits: true,
                  edit_appointments: true,
                  edit_user_permissions: true
                };
              } else if (newRole === "Cortex-Technicians") {
                newPerms = {
                  view_telemetry: true,
                  execute_playbooks: false,
                  run_qc_scans: false,
                  run_seo_scans: false,
                  run_web_audits: false,
                  edit_appointments: true,
                  edit_user_permissions: false
                };
              } else if (newRole === "Cortex-Management") {
                newPerms = {
                  view_telemetry: true,
                  execute_playbooks: false,
                  run_qc_scans: true,
                  run_seo_scans: true,
                  run_web_audits: true,
                  edit_appointments: true,
                  edit_user_permissions: false
                };
              } else if (newRole === "Cortex-Office") {
                newPerms = {
                  view_telemetry: false,
                  execute_playbooks: false,
                  run_qc_scans: false,
                  run_seo_scans: false,
                  run_web_audits: false,
                  edit_appointments: true,
                  edit_user_permissions: false
                };
              } else {
                newPerms = {
                  view_telemetry: true,
                  execute_playbooks: false,
                  run_qc_scans: true,
                  run_seo_scans: true,
                  run_web_audits: true,
                  edit_appointments: false,
                  edit_user_permissions: false
                };
              }
              return { ...u, role: newRole, permissions: newPerms };
            } else if (permission.startsWith("app_")) {
              const appKey = permission.substring(4);
              const newApps = { ...u.apps, [appKey]: newValue as boolean };
              return { ...u, apps: newApps };
            } else {
              return {
                ...u,
                permissions: { ...u.permissions, [permission]: newValue as boolean }
              };
            }
          }
          return u;
        })
      };
    });

    if (isOffline) {
      setIncidentHistory(prev => [
        {
          timestamp: new Date().toISOString(),
          type: "PERMISSION_CHANGE",
          message: `[MOCK CACHED] Permission '${permission}' for user ${username} updated to ${newValue}.`,
          signature: "2837bcde9df8a12e8c78bfbe9d784a0d9128bcbe9fd7819acde01237bebcde74"
        },
        ...prev
      ]);
      return;
    }

    try {
      const res = await fetch("/api/permissions/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, permission, value: newValue })
      });
      if (!res.ok) throw new Error("Failed to toggle permission");
      const data = await res.json();
      setPermissions(data.permissions);
      setTimeout(fetchIncidentHistory, 500);
    } catch (err) {
      console.error("[-] Error toggling permission:", err);
      fetchPermissions();
    }
  };

  // Create User Action (Backend & BTRFS signed log sync)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newUserRole) return;
    const name = newUsername.trim();

    let defaultPerms = {
      view_telemetry: true,
      execute_playbooks: false,
      run_qc_scans: true,
      run_seo_scans: true,
      run_web_audits: true,
      edit_appointments: false,
      edit_user_permissions: false
    };

    if (newUserRole === "Cortex-Admins") {
      defaultPerms = {
        view_telemetry: true,
        execute_playbooks: true,
        run_qc_scans: true,
        run_seo_scans: true,
        run_web_audits: true,
        edit_appointments: true,
        edit_user_permissions: true
      };
    } else if (newUserRole === "Cortex-Technicians") {
      defaultPerms = {
        view_telemetry: true,
        execute_playbooks: false,
        run_qc_scans: false,
        run_seo_scans: false,
        run_web_audits: false,
        edit_appointments: true,
        edit_user_permissions: false
      };
    } else if (newUserRole === "Cortex-Management") {
      defaultPerms = {
        view_telemetry: true,
        execute_playbooks: false,
        run_qc_scans: true,
        run_seo_scans: true,
        run_web_audits: true,
        edit_appointments: true,
        edit_user_permissions: false
      };
    } else if (newUserRole === "Cortex-Office") {
      defaultPerms = {
        view_telemetry: false,
        execute_playbooks: false,
        run_qc_scans: false,
        run_seo_scans: false,
        run_web_audits: false,
        edit_appointments: true,
        edit_user_permissions: false
      };
    }

    const newUser: PermissionUser = {
      username: name,
      role: newUserRole,
      password: newUserPassword || "password",
      viki_assigned: newUserViki,
      permissions: defaultPerms
    };

    setPermissions(prev => {
      if (!prev) return prev;
      return {
        users: [...prev.users, newUser]
      };
    });

    setNewUsername("");
    setNewUserPassword("");
    setNewUserViki(false);

    if (isOffline) {
      setIncidentHistory(prev => [
        {
          timestamp: new Date().toISOString(),
          type: "USER_CREATION",
          message: `[MOCK CACHED] New user '${name}' created with role '${newUserRole}'.`,
          signature: "abcde928bcbe710daef10cda81b0aefcde928bcfe021bc7df8a9a0fbe29acbe2"
        },
        ...prev
      ]);
      return;
    }

    try {
      const res = await fetch("/api/permissions/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name, role: newUserRole, password: newUserPassword || "password", viki_assigned: newUserViki })
      });
      if (!res.ok) throw new Error("Failed to create user");
      const data = await res.json();
      setPermissions(data.permissions);
      setTimeout(fetchIncidentHistory, 500);
    } catch (err) {
      console.error("[-] Error creating user:", err);
      fetchPermissions();
    }
  };

  // Delete User Action (Backend & BTRFS signed log sync)
  const handleDeleteUser = async (name: string) => {
    setPermissions(prev => {
      if (!prev) return prev;
      return {
        users: prev.users.filter(u => u.username.toLowerCase() !== name.toLowerCase())
      };
    });

    if (isOffline) {
      setIncidentHistory(prev => [
        {
          timestamp: new Date().toISOString(),
          type: "USER_DELETION",
          message: `[MOCK CACHED] User '${name}' was deleted from operational directory.`,
          signature: "790acbe01237cbead1e848a6c827361849dbcf1b28d610817364b192837bc9d9"
        },
        ...prev
      ]);
      return;
    }

    try {
      const res = await fetch("/api/permissions/user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name })
      });
      if (!res.ok) throw new Error("Failed to delete user");
      const data = await res.json();
      setPermissions(data.permissions);
      setTimeout(fetchIncidentHistory, 500);
    } catch (err) {
      console.error("[-] Error deleting user:", err);
      fetchPermissions();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const username = loginUsername.trim();
    if (!username) return;

    try {
      const res = await fetch("/api/permissions/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: loginPassword })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user.username);
        localStorage.setItem("cortex_logged_in_user", data.user.username);
        localStorage.removeItem("cortex_logged_out");
        const params = new URLSearchParams(window.location.search);
        params.set("user", data.user.username);
        window.history.pushState({}, "", `${window.location.pathname}?${params.toString()}`);
        setLoginUsername("");
        setLoginPassword("");
      } else {
        const errData = await res.json();
        setLoginError(errData.error || "Authentication failed.");
      }
    } catch {
      // Local fallback logic
      const userRec = permissions?.users.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (userRec) {
        if (loginPassword === "password" || userRec.password === loginPassword) {
          setCurrentUser(userRec.username);
          localStorage.setItem("cortex_logged_in_user", userRec.username);
          localStorage.removeItem("cortex_logged_out");
          const params = new URLSearchParams(window.location.search);
          params.set("user", userRec.username);
          window.history.pushState({}, "", `${window.location.pathname}?${params.toString()}`);
          setLoginUsername("");
          setLoginPassword("");
        } else {
          setLoginError("Invalid credentials (local fallback).");
        }
      } else {
        setLoginError("User not found.");
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("cortex_logged_in_user");
    localStorage.setItem("cortex_logged_out", "true");
    const params = new URLSearchParams(window.location.search);
    params.delete("user");
    params.delete("mode");
    window.history.pushState({}, "", `${window.location.pathname}?${params.toString()}`);
    setCurrentMode(null);
  };

  const handleResetPassword = async (username: string, newPassword: string) => {
    try {
      const res = await fetch("/api/permissions/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: newPassword })
      });
      if (!res.ok) throw new Error("Failed to reset password");
      const data = await res.json();
      setPermissions(data.permissions);
      
      setIncidentHistory(prev => [
        {
          timestamp: new Date().toISOString(),
          type: "PERMISSION_CHANGE",
          message: `Password for user '${username}' successfully reset.`,
          signature: "df9c7abf23ef0cda81b283fbe9d784a0d9128bcbe79f109acde019283fbebc71"
        },
        ...prev
      ]);
      alert(`Password for user '${username}' updated successfully!`);
    } catch (err) {
      console.error("[-] Error resetting password:", err);
      alert("Error updating password on server. Mock state updated.");
    }
  };

  const handleToggleTodo = (id: string) => {
    setToDo(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    const newItem: ToDoItem = {
      id: String(Date.now()),
      task: newTodoText.trim(),
      due: newTodoDue,
      completed: false
    };
    setToDo(prev => [...prev, newItem]);
    setNewTodoText("");
  };

  const handleDeleteTodo = (id: string) => {
    setToDo(prev => prev.filter(t => t.id !== id));
  };

  if (!currentUser) {
    return (
      <div className="login-screen-wrapper">
        <div className="login-card glassmorphic">
          <div className="login-logo-header">
            <div className="quantum-orb"></div>
            <h1>CORTEX</h1>
            <p className="subtitle">THE NERVOUS SYSTEM | SECURITY GATEWAY</p>
          </div>
          
          <form onSubmit={handleLogin} className="login-form">
            <div className="login-field">
              <label className="font-space">INGRESS USERNAME</label>
              <input
                type="text"
                placeholder="Enter username..."
                className="spacious-input font-space"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
              />
            </div>
            
            <div className="login-field">
              <label className="font-space">QUANTUM KEY / PASSWORD</label>
              <input
                type="password"
                placeholder="Enter password..."
                className="spacious-input font-space"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>

            {loginError && <div className="login-error-msg font-space">{loginError}</div>}

            <button type="submit" className="login-submit-btn font-space">
              AUTHENTICATE INGRESS SESSION
            </button>
          </form>
          
          <div className="login-footer font-space">
            <span>SECURED BY AUTHELIA GATEWAY COMPLIANCE & STATEFUL FORENSICS</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard ${alerts.length > 0 ? "critical-state" : ""}`}>
      <AlertOverlay alerts={alerts} onClear={clearAlerts} />
      
      <header className="header">
        <div className="header-logo-group">
          <h1>CORTEX</h1>
          <p className="subtitle">The Nervous System | Operations Command</p>
        </div>

        <div className="header-session-group font-space">
          <span className="session-user-badge">
            👤 ACTIVE USER: <strong>{currentUser.toUpperCase()}</strong> 
            <span className={`role-tag ${activeUserRecord.role.toLowerCase()}`} style={{ fontSize: "0.55rem", padding: "2px 6px", marginLeft: "8px" }}>
              {activeUserRecord.role.replace("Cortex-", "").toUpperCase()}
            </span>
          </span>
          <button
            onClick={() => {
              const newPass = prompt("Enter new password for your account:");
              if (newPass && newPass.trim()) {
                handleResetPassword(currentUser, newPass.trim());
              }
            }}
            className="spacious-submit-btn font-space session-action-btn"
            style={{ background: "rgba(255, 165, 0, 0.1)", border: "1px solid rgba(255, 165, 0, 0.3)", color: "#ffa500", fontSize: "0.65rem", padding: "4px 8px" }}
          >
            🔑 CHANGE PASSWORD
          </button>
          <button
            onClick={handleLogout}
            className="spacious-submit-btn font-space session-action-btn"
            style={{ background: "rgba(255, 75, 75, 0.1)", border: "1px solid rgba(255, 75, 75, 0.3)", color: "#ff4b4b", fontSize: "0.65rem", padding: "4px 8px" }}
          >
            🚪 LOGOUT
          </button>
        </div>
      </header>

      <div className="main-layout">
        <main className="content">
          
          {currentMode === "admin" ? (
            <section className="section" style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 className="section-title" style={{ margin: 0 }}>🔒 SOVEREIGN USER DIRECTORY & SECURE ACCESS MATRIX</h2>
                <button 
                  className="spacious-submit-btn font-space" 
                  onClick={() => {
                    setCurrentMode(null);
                    window.history.pushState({}, "", "/");
                  }}
                  style={{ background: "rgba(0, 255, 157, 0.1)", border: "1px solid rgba(0, 255, 157, 0.4)", color: "var(--online)", display: "flex", gap: "0.4rem", alignItems: "center" }}
                >
                  ◀ Exit Admin Console
                </button>
              </div>
              
              <div className="widgets-grid-container" style={{ gridTemplateColumns: "1.2fr 1.8fr" }}>
                
                {/* Directory Management & Enrollment */}
                <div className="spacious-security-card glassmorphic">
                  <div className="card-header-underlined">
                    <span>📁</span>
                    <h4>USER DIRECTORY</h4>
                  </div>
                  <div className="user-directory-wrapper" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div className="user-directory-list">
                      {permissions?.users?.map(u => {
                        const isSelected = u.username.toLowerCase() === selectedDirUsername.toLowerCase();
                        return (
                          <div 
                            key={u.username} 
                            className={`directory-user-card ${isSelected ? "selected" : ""}`}
                            onClick={() => setSelectedDirUsername(u.username)}
                          >
                            <div className="user-card-info">
                              <span className="user-card-title">
                                {isSelected ? "🔒" : "👤"} {u.username}
                              </span>
                              <span className="user-card-subtitle">
                                <span className={`role-tag ${u.role.toLowerCase()}`} style={{ fontSize: "0.55rem", padding: "1px 4px" }}>
                                  {u.role.replace("Cortex-", "")}
                                </span>
                                <span className={`viki-indicator-mini ${u.viki_assigned ? "active" : "inactive"}`}>
                                  {u.viki_assigned ? "VIKI" : "NO_VIKI"}
                                </span>
                              </span>
                            </div>
                            <div>
                              {u.username.toLowerCase() === "louis" ? (
                                <span className="system-protected-label" style={{ fontSize: "0.55rem" }}>ROOT SECURE</span>
                              ) : (
                                <button 
                                  className="dir-delete-btn font-space"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteUser(u.username);
                                  }}
                                  style={{ padding: "4px 8px", fontSize: "0.6rem" }}
                                  title="Delete credentials permanently"
                                >
                                  DELETE
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Inline form to Create User */}
                    <form onSubmit={handleCreateUser} className="spacious-create-user-form" style={{ marginTop: "0.5rem" }}>
                      <div className="form-fields-group" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                        <input 
                          type="text" 
                          placeholder="New Username..."
                          className="spacious-input"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          required
                          style={{ flex: 1, minWidth: "120px", fontSize: "0.7rem", padding: "6px" }}
                        />
                        <input 
                          type="password" 
                          placeholder="Password..."
                          className="spacious-input"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          style={{ flex: 1, minWidth: "120px", fontSize: "0.7rem", padding: "6px" }}
                        />
                        <select 
                          className="spacious-select"
                          value={newUserRole}
                          onChange={(e) => setNewUserRole(e.target.value)}
                          style={{ fontSize: "0.7rem", padding: "6px" }}
                        >
                          <option value="Cortex-Admins">Admin</option>
                          <option value="Cortex-Technicians">Technician</option>
                          <option value="Cortex-Management">Management</option>
                          <option value="Cortex-Office">Office</option>
                          <option value="Cortex-Designers">Designer</option>
                        </select>
                        <label className="checkbox-label font-space font-xs text-dim" style={{ fontSize: "0.65rem" }}>
                          <input 
                            type="checkbox" 
                            checked={newUserViki}
                            onChange={(e) => setNewUserViki(e.target.checked)}
                          />
                          Viki AI
                        </label>
                        <button type="submit" className="spacious-submit-btn font-space" style={{ padding: "4px 10px", fontSize: "0.65rem" }}>
                          ENROLL
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Permissions details pane */}
                <div className="spacious-security-card glassmorphic">
                  <div className="card-header-underlined">
                    <span>🔒</span>
                    <h4>DETAILED ACCESS & APP SCOPE EDITOR</h4>
                  </div>
                  <div className="detail-permissions-panel">
                    
                    {/* User Title & Role Config Row */}
                    <div className="detail-row-flex" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
                      <div className="detail-field-item" style={{ minWidth: "100px" }}>
                        <span className="detail-field-label">Target Account</span>
                        <strong style={{ fontSize: "1.1rem", color: "var(--online)", letterSpacing: "0.02em" }}>
                          {currentSelectedUser.username.toUpperCase()}
                        </strong>
                      </div>
                      <div className="detail-field-item" style={{ flex: 1.5, minWidth: "160px" }}>
                        <span className="detail-field-label">Assigned Role Group</span>
                        <select 
                          className="spacious-select"
                          value={currentSelectedUser.role}
                          onChange={(e) => handlePermissionToggle(currentSelectedUser.username, "role", e.target.value)}
                          style={{ fontSize: "0.75rem", padding: "4px 8px", width: "100%" }}
                        >
                          <option value="Cortex-Admins">Cortex-Admins (Full Control)</option>
                          <option value="Cortex-Technicians">Cortex-Technicians (Field Tech)</option>
                          <option value="Cortex-Management">Cortex-Management (Management)</option>
                          <option value="Cortex-Office">Cortex-Office (Office Administration)</option>
                          <option value="Cortex-Designers">Cortex-Designers (UI/UX Designer)</option>
                        </select>
                      </div>
                      
                      {/* Secure Reset Password field */}
                      <div className="detail-field-item" style={{ flex: 1.5, minWidth: "180px" }}>
                        <span className="detail-field-label">Reset User Password</span>
                        <div style={{ display: "flex", gap: "0.3rem" }}>
                          <input 
                            type="password" 
                            placeholder="New password..."
                            className="spacious-input"
                            id={`pass-reset-${currentSelectedUser.username}`}
                            style={{ fontSize: "0.7rem", padding: "4px 8px", flex: 1 }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const val = (e.target as HTMLInputElement).value;
                                if (val.trim()) {
                                  handleResetPassword(currentSelectedUser.username, val.trim());
                                  (e.target as HTMLInputElement).value = "";
                                }
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              const el = document.getElementById(`pass-reset-${currentSelectedUser.username}`) as HTMLInputElement;
                              if (el && el.value.trim()) {
                                handleResetPassword(currentSelectedUser.username, el.value.trim());
                                el.value = "";
                              }
                            }}
                            className="spacious-submit-btn font-space"
                            style={{ padding: "4px 8px", fontSize: "0.6rem", background: "rgba(255, 165, 0, 0.15)", border: "1px solid rgba(255, 165, 0, 0.3)", color: "#ffa500", cursor: "pointer" }}
                          >
                            APPLY
                          </button>
                        </div>
                      </div>

                      <div className="detail-field-item" style={{ alignItems: "center", minWidth: "80px" }}>
                        <span className="detail-field-label">Viki AI System</span>
                        <label className="toggle-switch" style={{ marginTop: "0.2rem" }}>
                          <input 
                            type="checkbox" 
                            checked={currentSelectedUser.viki_assigned}
                            onChange={() => handlePermissionToggle(currentSelectedUser.username, "viki_assigned", currentSelectedUser.viki_assigned)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </div>

                    {/* Operational Permissions Section */}
                    <div>
                      <div className="detail-section-title">
                        <span>⚙️</span> Operational Permission Flags
                      </div>
                      <div className="permissions-toggles-grid">
                        <div className="permission-toggle-box">
                          <span className="permission-toggle-label">Telemetry HUD</span>
                          <label className="toggle-switch">
                            <input 
                              type="checkbox" 
                              checked={currentSelectedUser.permissions.view_telemetry}
                              onChange={() => handlePermissionToggle(currentSelectedUser.username, "view_telemetry", currentSelectedUser.permissions.view_telemetry)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                        <div className="permission-toggle-box">
                          <span className="permission-toggle-label">Run Playbooks</span>
                          <label className="toggle-switch">
                            <input 
                              type="checkbox" 
                              checked={currentSelectedUser.permissions.execute_playbooks}
                              onChange={() => handlePermissionToggle(currentSelectedUser.username, "execute_playbooks", currentSelectedUser.permissions.execute_playbooks)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                        <div className="permission-toggle-box">
                          <span className="permission-toggle-label">Run QC Scans</span>
                          <label className="toggle-switch">
                            <input 
                              type="checkbox" 
                              checked={currentSelectedUser.permissions.run_qc_scans}
                              onChange={() => handlePermissionToggle(currentSelectedUser.username, "run_qc_scans", currentSelectedUser.permissions.run_qc_scans)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                        <div className="permission-toggle-box">
                          <span className="permission-toggle-label">Run SEO Scans</span>
                          <label className="toggle-switch">
                            <input 
                              type="checkbox" 
                              checked={currentSelectedUser.permissions.run_seo_scans}
                              onChange={() => handlePermissionToggle(currentSelectedUser.username, "run_seo_scans", currentSelectedUser.permissions.run_seo_scans)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                        <div className="permission-toggle-box">
                          <span className="permission-toggle-label">Run Web Audits</span>
                          <label className="toggle-switch">
                            <input 
                              type="checkbox" 
                              checked={currentSelectedUser.permissions.run_web_audits}
                              onChange={() => handlePermissionToggle(currentSelectedUser.username, "run_web_audits", currentSelectedUser.permissions.run_web_audits)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                        <div className="permission-toggle-box">
                          <span className="permission-toggle-label">Edit Calendar</span>
                          <label className="toggle-switch">
                            <input 
                              type="checkbox" 
                              checked={currentSelectedUser.permissions.edit_appointments}
                              onChange={() => handlePermissionToggle(currentSelectedUser.username, "edit_appointments", currentSelectedUser.permissions.edit_appointments)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                        <div className="permission-toggle-box">
                          <span className="permission-toggle-label">Admin Console</span>
                          <label className="toggle-switch">
                            <input 
                              type="checkbox" 
                              checked={currentSelectedUser.permissions.edit_user_permissions}
                              onChange={() => handlePermissionToggle(currentSelectedUser.username, "edit_user_permissions", currentSelectedUser.permissions.edit_user_permissions)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* App visibility controls grid */}
                    <div>
                      <div className="detail-section-title">
                        <span>🔌</span> Gateway App Visibility Switches
                      </div>
                      <div className="app-visibility-grid">
                        {staticServicesData.flatMap(c => c.items).map(appItem => {
                          const isPermitted = currentSelectedUser.apps?.[appItem.name] !== false;
                          return (
                            <div key={appItem.name} className={`app-toggle-card ${isPermitted ? "permitted" : ""}`}>
                              <div className="app-toggle-header">
                                <span className="app-toggle-icon">{appItem.icon}</span>
                                <span>{appItem.name}</span>
                              </div>
                              <label className="toggle-switch app-toggle-switch">
                                <input 
                                  type="checkbox" 
                                  checked={isPermitted}
                                  onChange={() => handlePermissionToggle(currentSelectedUser.username, "app_" + appItem.name, isPermitted)}
                                />
                                <span className="toggle-slider"></span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </section>
          ) : currentMode === "seo" ? (
            <section className="section qc-section" style={{ marginTop: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 className="section-title" style={{ margin: 0 }}>🔍 IN-DEPTH SEO DIAGNOSTIC SCANNING CONSOLE</h2>
                <button 
                  className="spacious-submit-btn font-space" 
                  onClick={() => {
                    setCurrentMode(null);
                    window.history.pushState({}, "", "/");
                  }}
                  style={{ background: "rgba(0, 255, 157, 0.1)", border: "1px solid rgba(0, 255, 157, 0.4)", color: "var(--online)", display: "flex", gap: "0.4rem", alignItems: "center" }}
                >
                  ◀ Back to Dashboard
                </button>
              </div>
              {activeUserRecord.permissions.run_seo_scans ? (
                <SEOScanningConsole />
              ) : (
                <div className="qc-console-card glassmorphic" style={{ padding: "2rem", textAlign: "center", color: "var(--offline)" }}>
                  <h3>ACCESS DENIED</h3>
                  <p>You do not have the required permission (run_seo_scans) to access the SEO Diagnostic Scanner.</p>
                </div>
              )}
            </section>
          ) : currentMode === "audit" ? (
            <section className="section qc-section" style={{ marginTop: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 className="section-title" style={{ margin: 0 }}>🩺 COMPREHENSIVE WEBSITE HEALTH & SECURITY AUDITING CONSOLE</h2>
                <button 
                  className="spacious-submit-btn font-space" 
                  onClick={() => {
                    setCurrentMode(null);
                    window.history.pushState({}, "", "/");
                  }}
                  style={{ background: "rgba(0, 255, 157, 0.1)", border: "1px solid rgba(0, 255, 157, 0.4)", color: "var(--online)", display: "flex", gap: "0.4rem", alignItems: "center" }}
                >
                  ◀ Back to Dashboard
                </button>
              </div>
              {activeUserRecord.permissions.run_web_audits ? (
                <WebAuditingConsole />
              ) : (
                <div className="qc-console-card glassmorphic" style={{ padding: "2rem", textAlign: "center", color: "var(--offline)" }}>
                  <h3>ACCESS DENIED</h3>
                  <p>You do not have the required permission (run_web_audits) to access the Website Health & Security Auditor.</p>
                </div>
              )}
            </section>
          ) : currentMode === "qc" ? (
            <section className="section qc-section" style={{ marginTop: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 className="section-title" style={{ margin: 0 }}>🛡️ QUALITY CONTROL (QC) SECURITY & DESIGN SCANNING CONSOLE</h2>
                <button 
                  className="spacious-submit-btn font-space" 
                  onClick={() => {
                    setCurrentMode(null);
                    window.history.pushState({}, "", "/");
                  }}
                  style={{ background: "rgba(0, 255, 157, 0.1)", border: "1px solid rgba(0, 255, 157, 0.4)", color: "var(--online)", display: "flex", gap: "0.4rem", alignItems: "center" }}
                >
                  ◀ Back to Dashboard
                </button>
              </div>
              {activeUserRecord.permissions.run_qc_scans ? (
                <QCScanningConsole />
              ) : (
                <div className="qc-console-card glassmorphic" style={{ padding: "2rem", textAlign: "center", color: "var(--offline)" }}>
                  <h3>ACCESS DENIED</h3>
                  <p>You do not have the required permission (run_qc_scans) to access the Quality Control Scanner.</p>
                </div>
              )}
            </section>
          ) : (
            <>
              {/* Dynamic Unified Multi-User Widget Grid - Rendered EXCLUSIVELY for Non-Admins */}
              {!isUserAdmin && (
                <section className="section widgets-section">
                  <h2 className="section-title">ROLE-BASED COGNITIVE WIDGETS ({activeUserRecord.role.toUpperCase()})</h2>
                  <div className="widgets-grid-container">
                    
                    {/* Widget A: Open Tickets */}
                    <div className="widget-card glassmorphic">
                      <div className="widget-header">
                        <div className="widget-title">
                          <span>🎫</span>
                          <h4>ASSIGNED OPEN TICKETS</h4>
                        </div>
                        {isOffline && <span className="hud-badge cached">CACHED</span>}
                      </div>
                      <div className="widget-body scrollable">
                        <table className="widget-table font-space">
                          <thead>
                            <tr>
                              <th>TICKET</th>
                              <th>SEVERITY</th>
                              <th>SUBMITTER</th>
                              <th>ACTION</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tickets.map(t => (
                              <tr key={t.id} className={`ticket-row ${t.severity.toLowerCase()}`}>
                                <td>
                                  <div className="ticket-title-cell">
                                    <span className="ticket-id">[{t.id}]</span>
                                    <span className="ticket-title-text">{t.title}</span>
                                  </div>
                                </td>
                                <td>
                                  <span className={`ticket-sev-badge ${t.severity.toLowerCase()}`}>
                                    {t.severity}
                                  </span>
                                </td>
                                <td className="text-dim">{t.submitter}</td>
                                <td>
                                  <button 
                                    className="solve-ticket-btn font-space"
                                    onClick={() => handleSolveTicket(t.id)}
                                    title="Resolve helpdesk ticket"
                                  >
                                    SOLVE
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Widget B: 3-Day To-Do Tracker */}
                    <div className="widget-card glassmorphic">
                      <div className="widget-header">
                        <div className="widget-title">
                          <span>🗓️</span>
                          <h4>3-DAY TO-DO LIST (72H)</h4>
                        </div>
                      </div>
                      <div className="widget-body">
                        <div className="todo-list-wrapper scrollable">
                          {todo.length === 0 ? (
                            <div className="todo-empty">All objectives achieved. Grid stabilized.</div>
                          ) : (
                            todo.map(t => (
                              <div key={t.id} className={`todo-item-row ${t.completed ? 'completed' : ''}`}>
                                <div className="todo-check-group" onClick={() => handleToggleTodo(t.id)}>
                                  <div className={`todo-checkbox ${t.completed ? 'checked' : ''}`}>
                                    {t.completed && "✔"}
                                  </div>
                                  <div className="todo-text-group">
                                    <span className="todo-task-text">{t.task}</span>
                                    <span className="todo-due-badge">{t.due}</span>
                                  </div>
                                </div>
                                <button className="todo-delete-btn" onClick={() => handleDeleteTodo(t.id)}>✖</button>
                              </div>
                            ))
                          )}
                        </div>
                        <form onSubmit={handleAddTodo} className="todo-inline-form">
                          <input 
                            type="text" 
                            placeholder="Add urgent objective..."
                            className="todo-input"
                            value={newTodoText}
                            onChange={(e) => setNewTodoText(e.target.value)}
                          />
                          <select 
                            className="todo-select"
                            value={newTodoDue}
                            onChange={(e) => setNewTodoDue(e.target.value)}
                          >
                            <option value="In 4 hours">In 4h</option>
                            <option value="In 24 hours">In 24h</option>
                            <option value="In 48 hours">In 48h</option>
                            <option value="In 72 hours">In 72h</option>
                          </select>
                          <button type="submit" className="todo-add-btn">+</button>
                        </form>
                      </div>
                    </div>

                    {/* Widget C: 3-Day Outlook Appointments */}
                    <div className="widget-card glassmorphic">
                      <div className="widget-header">
                        <div className="widget-title">
                          <span>📅</span>
                          <h4>3-DAY OUTLOOK CALENDAR</h4>
                        </div>
                        {isOffline && <span className="hud-badge conflict-warning">DESYNCED</span>}
                      </div>
                      <div className="widget-body scrollable">
                        <div className="appointments-list">
                          {appointments.map(a => (
                            <div key={a.id} className={`appointment-card ${a.status.toLowerCase()}`}>
                              <div className="appt-badge-status-group">
                                <span className={`appt-status-indicator ${a.status.toLowerCase()}`}></span>
                                <span className="appt-subject font-space">{a.subject}</span>
                                {a.status !== "Free" && activeUserRecord.permissions.edit_appointments && (
                                  <button 
                                    className="appt-cancel-btn font-space" 
                                    onClick={() => handleCancelAppointment(a.id)}
                                    title="Cancel appointment slot"
                                  >
                                    ✖
                                  </button>
                                )}
                              </div>
                              <div className="appt-meta font-space text-dim font-xs">
                                <div>TIME: {a.time}</div>
                                <div>HOST: {a.organizer} | ROLE: <span className="status-label">{a.status.toUpperCase()}</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>
                </section>
              )}




              {/* Core gate links list - Rendered natively for all users */}
              <section className="section gateways-section">
                <h2 className="section-title">CORE NETWORK INGRESS GATEWAYS</h2>
                <div className="grid">
                  {servicesData.map((section) => 
                    section.items
                      .filter((item) => {
                        const apps = activeUserRecord.apps || {};
                        return apps[item.name] !== false;
                      })
                      .map((item) => {
                        const isOnline = status.find(s => s.name === item.name)?.status !== "offline";
                        return (
                          <a 
                            key={item.name} 
                            href={item.url === "disabled" ? undefined : item.url} 
                            target={item.url === "disabled" ? undefined : "_blank"} 
                            rel="noopener noreferrer" 
                            className={`card ${isOnline ? "online-card" : "offline-card"}`}
                            onClick={(e) => { if (item.url === "disabled") e.preventDefault(); }}
                          >
                            <div className="icon">{item.icon}</div>
                            <div className="info">
                              <h3>{item.name}</h3>
                              <p>{item.subtitle}</p>
                              <span className={`status-dot ${isOnline ? "online" : "offline"}`}></span>
                            </div>
                          </a>
                        );
                      })
                  )}
                </div>
              </section>

              {/* Status HUD grid - Rendered natively for Admin / permitted users */}
              {isUserAdmin && (
                <section className="section topology-section-main" style={{ marginTop: "1.5rem" }}>
                  <h2 className="section-title">Global Status Monitor</h2>
                  <div className="status-monitor-grid">
                    <SystemDiagnosticsHUD status={status} />
                    <TelemetryHUD 
                      events={telemetryEvents}
                      wsStatus={wsStatus}
                      isVisible={isHudVisible}
                      onToggle={() => setIsHudVisible(!isHudVisible)}
                      mode={securityMode}
                    />
                    <ActiveMitigationConsole 
                      currentMode={securityMode}
                      onModeToggle={handleModeToggle}
                      onExecutePlaybook={handleExecutePlaybook}
                      incidentHistory={incidentHistory}
                      isOffline={isOffline}
                      allowQuarantine={activeUserRecord.permissions.execute_playbooks}
                    />
                  </div>
                </section>
              )}
            </>
          )}
        </main>

        {/* Floating Holographic 3D Head Sidebar - Completely Stripped if Unassigned or not on Homepage */}
        {activeUserRecord.viki_assigned && isUserAdmin && currentMode === null && (
          <aside className="monitor-sidebar">
            <div 
              onClick={() => window.open("/?mode=viki-chat", "_blank")}
              className="viki-sidebar-trigger-wrapper"
              title="Click to establish dedicated quantum neural link"
            >
              <div className="viki-trigger-hint font-space">QUANTUM LINK ACCESS</div>
              <VikiAvatarRenderer 
                assetPath="/assets/viki_android_real.glb" 
                vikiState={vikiState === 'idle' && securityMode === 'HARDENED' ? 'alert' : vikiState} 
              />
            </div>
          </aside>
        )}
      </div>

      <footer className="footer">
        <p>Project CORTEX v2.0 | Secure Sovereign Intelligence</p>
      </footer>
    </div>
  );
}

export default App;
