# CORTEX TOPOLOGY
## Network Map
- **Gateway (HAProxy):** 10.0.0.239. Handles SSL termination for `*.rmmservice.co.za`.
- **VDS (Isando):** Public-facing, hardened, Traefik Ingress.
- **VIKI (Springs):** 10.0.0.240. Ryzen 5700 / RTX 4060.
  - **Local Ingress (Traefik):** Listens on Port 80, receives traffic from HAProxy.
- **Tunnel:** WireGuard (Point-to-Point) 10.10.10.1 (VDS) <-> 10.10.10.2 (VIKI).

## Data Flow (Lab)
1. **Public/Local Ingress:** Client -> `rmmservice.co.za` -> Public IP -> HAProxy (10.0.0.239).
2. **Reverse Proxy:** HAProxy (SSL Term) -> VIKI Traefik (10.0.0.240:80).
- **Internal Routing:** Traefik -> Service (Authelia, GLPI, etc.).
- **User Management (v2):** LLDAP (Web UI at `auth-admin.rmmservice.co.za`).
- **Command Portal (v2):** React 19 Dashboard (`rmmservice.co.za`).
- **AI Inference Engine:** Ollama (v0.3.4) running on VIKI, connected to `netlock_netlock-network` for n8n integration.

