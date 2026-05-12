import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text, Sphere, Stars } from "@react-three/drei";
import * as THREE from "three";
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
      { name: "GLPI", subtitle: "Incident Command", url: "https://glpi.rmmservice.co.za", icon: "🎫" },
      { name: "Velociraptor", subtitle: "Threat Hunter", url: "https://edr.rmmservice.co.za", icon: "👻" },
    ],
  },
  {
    category: "Intelligence & Data",
    items: [
      { name: "MinIO", subtitle: "S3 Vault", url: "https://s3-console.rmmservice.co.za", icon: "🗄️" },
      { name: "n8n", subtitle: "Neural Synapse", url: "https://automation.rmmservice.co.za", icon: "🧠" },
      { name: "Ollama AI", subtitle: "Neural Inference", url: "http://10.0.0.240:11434", icon: "🤖" },
    ],
  },
  {
    category: "Network & Security",
    items: [
      { name: "Traefik", subtitle: "Secure Gateway", url: "https://traefik.rmmservice.co.za", icon: "🚦" },
      { name: "Authelia", subtitle: "Identity Gate", url: "https://auth.rmmservice.co.za", icon: "🔑" },
      { name: "WireGuard", subtitle: "Secure Tunnel", url: "#", icon: "🛡️" },
    ],
  },
];

function ServerRack({ position, isOnline, label }: { position: [number, number, number], isOnline: boolean, label: string }) {
  const lights = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    pos: [0.36, (i * 0.2) - 0.7, 0.01] as [number, number, number],
    delay: Math.random() * 2
  })), []);

  return (
    <group position={position}>
      {/* Rack Body */}
      <mesh>
        <boxGeometry args={[0.8, 2, 0.5]} />
        <meshStandardMaterial color="#0a0f1a" roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0, 0.26]}>
        <planeGeometry args={[0.7, 1.9]} />
        <meshStandardMaterial color="#05080f" roughness={0} metalness={1} />
      </mesh>
      
      {/* Status Lights */}
      {lights.map((light, i) => (
        <StatusLight key={i} position={light.pos} isOnline={isOnline} delay={light.delay} />
      ))}

      {/* Label */}
      <Text
        position={[0, 1.2, 0]}
        fontSize={0.15}
        color={isOnline ? "#00f2ff" : "#555"}
      >
        {label}
      </Text>
    </group>
  );
}

function StatusLight({ position, isOnline, delay }: { position: [number, number, number], isOnline: boolean, delay: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      const opacity = isOnline ? 0.4 + Math.sin(state.clock.elapsedTime * 2 + delay) * 0.4 : 0.1;
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
    }
  });

  return (
    <mesh position={position} ref={meshRef}>
      <planeGeometry args={[0.05, 0.05]} />
      <meshBasicMaterial color={isOnline ? "#00ff9d" : "#ff4d4d"} transparent />
    </mesh>
  );
}

function DataCore({ status }: { status: "online" | "offline" }) {
  const coreRef = useRef<THREE.Group>(null);
  const isOnline = status === "online";

  useFrame((state) => {
    if (coreRef.current) {
      coreRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <group position={[0, 0, -8]} ref={coreRef}>
      {/* Central Chip */}
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[1.5, 1.5, 0.2]} />
        <meshStandardMaterial 
          color="#05080f" 
          emissive={isOnline ? "#00f2ff" : "#111"} 
          emissiveIntensity={isOnline ? 0.5 : 0.1}
        />
      </mesh>
      
      {/* AI Logo / Text */}
      <Text
        position={[0, 0, 0.15]}
        fontSize={0.6}
        color={isOnline ? "#00f2ff" : "#333"}
        fontWeight="bold"
      >
        AI
      </Text>

      {/* Circuit Arms */}
      {[0, Math.PI/2, Math.PI, Math.PI*1.5].map((rot, i) => (
        <group key={i} rotation={[0, 0, rot]}>
          <mesh position={[1.2, 0, 0]}>
            <boxGeometry args={[1, 0.05, 0.05]} />
            <meshBasicMaterial color={isOnline ? "#00f2ff" : "#222"} transparent opacity={0.6} />
          </mesh>
          <mesh position={[1.7, 0.2, 0]}>
            <boxGeometry args={[0.05, 0.4, 0.05]} />
            <meshBasicMaterial color={isOnline ? "#00f2ff" : "#222"} transparent opacity={0.4} />
          </mesh>
        </group>
      ))}

      {/* Outer Glow Spheres */}
      <Sphere args={[2, 32, 32]}>
        <meshBasicMaterial color="#00f2ff" transparent opacity={0.05} wireframe />
      </Sphere>
    </group>
  );
}

function DataStream({ start, end, isOnline }: { start: [number, number, number], end: [number, number, number], isOnline: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(...start),
    new THREE.Vector3(start[0], start[1], (start[2] + end[2]) / 2),
    new THREE.Vector3(...end)
  ]), [start, end]);

  useFrame((state) => {
    if (meshRef.current && isOnline) {
      const t = (state.clock.elapsedTime * 0.5) % 1;
      const pos = curve.getPointAt(t);
      meshRef.current.position.copy(pos);
    }
  });

  if (!isOnline) return null;

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.04, 8, 8]} />
      <meshBasicMaterial color="#00f2ff" />
    </mesh>
  );
}

function BinaryDust() {
  const particles = useMemo(() => Array.from({ length: 50 }, () => ({
    pos: [(Math.random() - 0.5) * 10, Math.random() * 5, -Math.random() * 15] as [number, number, number],
    speed: 0.01 + Math.random() * 0.02,
    val: Math.random() > 0.5 ? "1" : "0"
  })), []);

  return (
    <group>
      {particles.map((p, i) => (
        <BinaryBit key={i} {...p} />
      ))}
    </group>
  );
}

function BinaryBit({ pos, speed, val }: { pos: [number, number, number], speed: number, val: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) {
      ref.current.position.z += speed;
      if (ref.current.position.z > 5) ref.current.position.z = -15;
    }
  });

  return (
    <group position={pos} ref={ref}>
      <Text fontSize={0.1} color="#00f2ff" fillOpacity={0.2}>
        {val}
      </Text>
    </group>
  );
}

function Topology({ status }: { status: ServiceStatus[] }) {
  const getStatus = (name: string) => status.find(s => s.name === name || (name === "MinIO" && s.name === "Data Lake"))?.status || "offline";

  const nodes = [
    { id: "rmm", pos: [-2, 0, -2] as [number, number, number], name: "NetLock RMM", label: "RMM" },
    { id: "edr", pos: [-2, 0, -4] as [number, number, number], name: "Velociraptor", label: "EDR" },
    { id: "glpi", pos: [-2, 0, -6] as [number, number, number], name: "GLPI", label: "GLPI" },
    { id: "s3", pos: [2, 0, -2] as [number, number, number], name: "MinIO", label: "S3" },
    { id: "n8n", pos: [2, 0, -4] as [number, number, number], name: "n8n", label: "n8n" },
    { id: "ai", pos: [2, 0, -6] as [number, number, number], name: "Ollama AI", label: "AI" },
  ];

  const coreStatus = "online"; // Keep core lit

  return (
    <div className="topology-container">
      <Canvas shadows camera={{ position: [0, 1.2, 2], fov: 60 }}>
        <Suspense fallback={null}>
          <color attach="background" args={["#010204"]} />
          <fog attach="fog" args={["#010204", 2, 12]} />
          
          <ambientLight intensity={1.5} />
          <pointLight position={[0, 3, -5]} intensity={5} color="#00f2ff" />
          <spotLight position={[0, 8, 0]} angle={0.4} penumbra={1} intensity={5} castShadow />

          {/* Hallway Floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, -5]}>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#080c14" roughness={0.1} metalness={0.9} />
          </mesh>
          <gridHelper args={[20, 40, "#00f2ff", "#002a2a"]} position={[0, -0.99, -5]} />

          <DataCore status={coreStatus} />
          <BinaryDust />
          
          {nodes.map(node => (
            <group key={node.id}>
              <ServerRack 
                position={node.pos} 
                isOnline={getStatus(node.name) === "online"} 
                label={node.label} 
              />
              <DataStream 
                start={[node.pos[0] > 0 ? node.pos[0] - 0.4 : node.pos[0] + 0.4, 0, node.pos[2]]} 
                end={[0, 0, -7.8]} 
                isOnline={getStatus(node.name) === "online"}
              />
            </group>
          ))}

          {/* Floating Binary Dust */}
          <Stars radius={50} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
        </Suspense>
      </Canvas>
    </div>
  );
}

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
        .catch(() => {});
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
                  const isOnline = status.find(s => s.name === item.name)?.status !== "offline";
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
