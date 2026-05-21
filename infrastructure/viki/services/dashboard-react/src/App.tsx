import { useState, useEffect } from "react";
import { VikiAvatarRenderer } from "./components/viki/VikiAvatarRenderer";
import { VikiChat } from "./components/viki/VikiChat";
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

const servicesData = [
  {
    category: "Operational Backbone",
    items: [
      { name: "NetLock RMM", subtitle: "Tactical Control", url: "https://rmm.rmmservice.co.za", icon: "⚡" },
      { name: "GLPI", subtitle: "Incident Command", url: "https://glpi.rmmservice.co.za", icon: "🎫" },
      { name: "Velociraptor", subtitle: "Threat Hunter", url: "https://edr.rmmservice.co.za", icon: "👻" },
    ],
  },
  {
    category: "Intelligence & Data",
    items: [
      { name: "MinIO", subtitle: "S3 Vault", url: "https://s3-console.rmmservice.co.za", icon: "🗄️" },
      { name: "n8n", subtitle: "Neural Synapse", url: "https://automation.rmmservice.co.za", icon: "🧠" },
      { name: "Ollama AI", subtitle: "Neural Inference", url: "https://cortex.rmmservice.co.za/api/viki/", icon: "🤖" },
    ],
  },
  {
    category: "Network & Security",
    items: [
      { name: "Traefik", subtitle: "Secure Gateway", url: "https://traefik.rmmservice.co.za/dashboard/", icon: "🚦" },
      { name: "Authelia", subtitle: "Identity Gate", url: "https://auth.rmmservice.co.za", icon: "🔑" },
      { name: "WireGuard", subtitle: "Secure Tunnel", url: "disabled", icon: "🛡️" },
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
}

function ActiveMitigationConsole({
  currentMode,
  onModeToggle,
  onExecutePlaybook
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
        <span className={`hud-badge mode-status ${isHardened ? "hardened" : "standard"}`}>
          {currentMode}
        </span>
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
        </div>
      </div>
    </div>
  );
}

function App() {
  const [status, setStatus] = useState<ServiceStatus[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [vikiState, setVikiState] = useState<'idle' | 'thinking' | 'speaking' | 'alert'>('idle');

  // Real-time HUD states
  const [telemetryEvents, setTelemetryEvents] = useState<TelemetryEvent[]>([]);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [isHudVisible, setIsHudVisible] = useState(true);
  const [securityMode, setSecurityMode] = useState<string>("STANDARD");

  // Track acknowledged alert IDs in state
  const [, setAcknowledgedAlerts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("cortex_acknowledged_alerts");
      return saved ? JSON.parse(saved).map((id: any) => String(id)) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    // Check for admin mode in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "admin") {
      setIsAdmin(true);
    }

    const fetchStatus = () => {
      fetch("/status.json")
        .then(res => res.json())
        .then((data: StatusData) => setStatus(data.services))
        .catch(() => {
          setStatus(servicesData.flatMap(c => c.items.map(i => ({ name: i.name, status: "online" as const }))));
        });
    };

    const fetchAlerts = () => {
      fetch("/api/alerts")
        .then(res => res.json())
        .then((data: Alert[]) => {
          // Get fresh acknowledged list from localStorage
          const acked = (() => {
            try {
              const saved = localStorage.getItem("cortex_acknowledged_alerts");
              return saved ? JSON.parse(saved).map((id: any) => String(id)) : [];
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

    // --- TELEMETRY WEBSOCKET INTEGRATION ---
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = window.location.host;
    const wsUrl = `${protocol}//${wsHost}/api/ws/telemetry`;

    let ws: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connectWS = () => {
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

          // Append event to state log (keep last 50)
          setTelemetryEvents(prev => [data, ...prev].slice(0, 50));

          // Make Viki react to incoming live telemetry event!
          const severity = (data.severity || data.type || "INFO").toUpperCase();
          if (severity === "CRITICAL") {
            setVikiState('alert');
            setTimeout(() => setVikiState('idle'), 2000);
          } else {
            setVikiState(Math.random() > 0.5 ? 'speaking' : 'thinking');
            setTimeout(() => setVikiState('idle'), 3000);
          }

          // Elevate CRITICAL telemetry to active alerts if not already acknowledged
          if (severity === "CRITICAL") {
            const message = data.message || (data.data && data.data.CommandLine) || "CRITICAL EVENT DETECTED";
            const source = data.source || "Vector";
            const timestamp = data.timestamp || new Date().toISOString();
            const rawId = data.id || `${source}_${timestamp}_${message}`;
            const alertId = String(rawId);
            
            // Get fresh acknowledged list
            const acked = (() => {
              try {
                const saved = localStorage.getItem("cortex_acknowledged_alerts");
                return saved ? JSON.parse(saved).map((id: any) => String(id)) : [];
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

          // Dynamically sync security mode
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
  }, []);

  const clearAlerts = () => {
    const idsToAck = alerts.map(a => a.id ? String(a.id) : `${a.source}_${a.timestamp}_${a.message}`);
    const acked = (() => {
      try {
        const saved = localStorage.getItem("cortex_acknowledged_alerts");
        return saved ? JSON.parse(saved).map((id: any) => String(id)) : [];
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
    try {
      const response = await fetch('/api/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode })
      });
      if (!response.ok) throw new Error('Failed to toggle security state');
      // The server will broadcast the new mode via WS, but let's update locally for instant responsiveness
      setSecurityMode(newMode === "REFLEX" ? "HARDENED" : "STANDARD");
      console.log(`[+] Security mode transitioned to ${newMode}`);
    } catch (e) {
      console.error("[-] Error toggling security state:", e);
    }
  };

  const handleExecutePlaybook = async (playbook: string, target: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/playbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playbook, target })
      });
      if (!response.ok) throw new Error('Playbook execution failed');
      console.log(`[+] Playbook ${playbook} executed successfully on ${target}`);
      return true;
    } catch (e) {
      console.error("[-] Playbook execution failure:", e);
      return false;
    }
  };

  return (
    <div className={`dashboard ${alerts.length > 0 ? "critical-state" : ""}`}>
      <AlertOverlay alerts={alerts} onClear={clearAlerts} />
      
      <header className="header">
        <h1>CORTEX</h1>
        <p className="subtitle">The Nervous System | Operations Command</p>
      </header>

      <div className="main-layout">
        <main className="content">
          {servicesData.map((section) => (
            <section key={section.category} className="section">
              <h2 className="section-title">{section.category}</h2>
              <div className="grid">
                {section.items.map((item) => {
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
                })}
              </div>
            </section>
          ))}

          {/* Upgraded reactive status monitor and aligned HUD layout container */}
          <section className="section topology-section-main" style={{ marginTop: "0.5rem" }}>
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
              />
            </div>
          </section>
        </main>

        {isAdmin && (
          <aside className="monitor-sidebar">
            <div 
              onClick={() => window.open("/?mode=viki-chat", "_blank")}
              className="viki-sidebar-trigger-wrapper"
              title="Click to establish dedicated quantum neural link"
            >
              <div className="viki-trigger-hint font-space">QUANTUM LINK ACCESS</div>
              <VikiAvatarRenderer 
                assetPath="/assets/viki_android_real.glb" 
                vikiState={vikiState} 
              />
            </div>
            <VikiChat onStateChange={(s) => setVikiState(s)} />
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
