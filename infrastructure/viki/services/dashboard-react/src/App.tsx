import { useState, useEffect } from "react";
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

const servicesData = [
  {
    category: "Operational Backbone",
    items: [
      { name: "NetLock RMM", subtitle: "Tactical Control", url: "https://rmm.rmmservice.co.za", icon: "⚡" },
      { name: "GLPI Tickets", subtitle: "Incident Command", url: "https://glpi.rmmservice.co.za", icon: "🎫" },
      { name: "Velociraptor", subtitle: "Threat Hunter", url: "https://edr.rmmservice.co.za", icon: "👻" },
    ],
  },
  {
    category: "Intelligence & Data",
    items: [
      { name: "Data Lake", subtitle: "S3 Cold Storage", url: "https://s3-console.rmmservice.co.za", icon: "🗄️" },
      { name: "Neural Links", subtitle: "n8n Automation", url: "https://automation.rmmservice.co.za", icon: "🧠" },
      { name: "Ollama AI", subtitle: "Neural Inference", url: "http://10.0.0.240:11434", icon: "🤖" },
    ],
  },
  {
    category: "Identity & Access",
    items: [
      { name: "Identity Gate", subtitle: "Authelia Portal", url: "https://auth.rmmservice.co.za", icon: "🔑" },
      { name: "User Command", subtitle: "Manage Identities", url: "https://auth-admin.rmmservice.co.za", icon: "👥" },
    ],
  },
];

function AlertOverlay({ alerts, onClear }: { alerts: Alert[], onClear: () => void }) {
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

function Topology({ status }: { status: ServiceStatus[] }) {
  const getStatus = (name: string) => status.find(s => s.name === name)?.status || "offline";

  const nodes = [
    { x: 200, y: 100, name: "NetLock RMM", path: "M400 200 L200 100" },
    { x: 200, y: 200, name: "GLPI", path: "M400 200 L200 200" },
    { x: 200, y: 300, name: "Velociraptor", path: "M400 200 L200 300" },
    { x: 600, y: 100, name: "MinIO", path: "M400 200 L600 100" },
    { x: 600, y: 200, name: "n8n", path: "M400 200 L600 200" },
    { x: 600, y: 300, name: "Ollama AI", path: "M400 200 L600 300" },
  ];

  return (
    <div className="topology-container">
      <svg viewBox="0 0 800 400" className="topology-svg">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <g className="connections">
          {nodes.map(node => (
            <path key={`line-${node.name}`} d={node.path} className="link-line" />
          ))}
        </g>

        <g className="packets">
          {nodes.map(node => {
            const isOnline = getStatus(node.name) === "online";
            if (!isOnline) return null;
            return (
              <circle key={`packet-${node.name}`} r="3" className="data-packet">
                <animateMotion 
                  dur={`${2 + Math.random() * 2}s`} 
                  repeatCount="indefinite" 
                  path={node.path} 
                />
              </circle>
            );
          })}
        </g>

        <g className="nodes">
          <circle cx="400" cy="200" r="30" className="node central-node" />
          <text x="400" y="245" textAnchor="middle" className="node-label">CORTEX</text>

          {nodes.map((node) => (
            <g key={node.name}>
              <circle 
                cx={node.x} 
                cy={node.y} 
                r="12" 
                className={`node ${getStatus(node.name)}`} 
              />
              <text 
                x={node.x} 
                y={node.y + 25} 
                textAnchor="middle" 
                className="node-label-small"
              >
                {node.name}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

function App() {
  const [status, setStatus] = useState<ServiceStatus[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
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
          const criticalAlerts = data.filter(a => a.type === "CRITICAL");
          if (criticalAlerts.length > 0) {
            setAlerts(criticalAlerts);
          }
        })
        .catch(() => {
          // Silent fail for alerts in dev/offline
        });
    };

    fetchStatus();
    fetchAlerts();
    const statusInterval = setInterval(fetchStatus, 30000);
    const alertInterval = setInterval(fetchAlerts, 10000);
    return () => {
      clearInterval(statusInterval);
      clearInterval(alertInterval);
    };
  }, []);

  const clearAlerts = () => setAlerts([]);

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
                  const isOnline = status.find(s => s.name === item.name || (item.name === "NetLock RMM" && s.name === "NetLock RMM") || (item.name === "Data Lake" && s.name === "MinIO"))?.status !== "offline";
                  return (
                    <a key={item.name} href={item.url} target="_blank" rel="noopener noreferrer" className={`card ${isOnline ? "online-card" : "offline-card"}`}>
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
        </main>

        <aside className="monitor-sidebar">
          <section className="topology-section">
            <h2 className="section-title">Status Monitor</h2>
            <Topology status={status} />
          </section>
        </aside>
      </div>

      <footer className="footer">
        <p>Project CORTEX v2.0 | Secure Sovereign Intelligence</p>
      </footer>
    </div>
  );
}

export default App;
