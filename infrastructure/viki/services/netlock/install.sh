#!/bin/bash

# NetLock RMM Installation Script
# Generated with: NetLock RMM Install Builder
# Generated on: 2026-05-22

cat << 'EOF'
  _   _      _   _                _      _____  __  __ __  __
 | \ | |    | | | |              | |    |  __ \|  \/  |  \/  |
 |  \| | ___| |_| |     ___   ___| | __ | |__) | \  / | \  / |
 | . ` |/ _ \ __| |    / _ \ / __| |/ / |  _  /| |\/| | |\/| |
 | |\  |  __/ |_| |___| (_) | (__|   <  | | \ \| |  | | |  | |
 |_| \_|\___|\__|______\___/ \___|_|\_\ |_|  \_\_|  |_|_|  |_|
EOF

set -e
echo ''

# Prevent interactive debconf/dpkg prompts (e.g. openssh-server sshd_config prompt)
export DEBIAN_FRONTEND=noninteractive
export DEBCONF_NONINTERACTIVE_SEEN=true

# Update the system
echo 'Updating the system...'
sudo -E apt-get update && sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -o Dpkg::Options::="--force-confold" -o Dpkg::Options::="--force-confdef"



# Check if Docker Compose is available
if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
  echo 'Docker Compose is not installed. Please install Docker Compose and try again.'
  exit 1
fi

# Set the compose command
if docker compose version &> /dev/null; then
  COMPOSE_CMD="docker compose"
  echo 'Using Docker Compose (plugin version)'
else
  COMPOSE_CMD="docker-compose"
  echo 'Using docker-compose (standalone version)'
fi

echo 'Docker and Docker Compose are ready.'

# Create directories
echo 'Creating directories...'
sudo mkdir -p /home/netlock/mysql/data
sudo mkdir -p /home/netlock/mysql/init
sudo mkdir -p /home/netlock/certificates
sudo mkdir -p /home/netlock/web_console/internal
sudo mkdir -p /home/netlock/web_console/logs
sudo mkdir -p /home/netlock/server/logs
sudo mkdir -p /home/netlock/server/files
sudo mkdir -p /home/netlock/server/internal

# Create MySQL init script to set up a limited application user
echo 'Creating MySQL init script for the application user...'
sudo tee /home/netlock/mysql/init/01_create_app_user.sql > /dev/null <<'INITSQL'
CREATE USER IF NOT EXISTS 'zaa21d4s'@'%' IDENTIFIED BY '8E3wwVQNZHaNdsou';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE, REFERENCES ON `dogha6`.* TO 'zaa21d4s'@'%';
FLUSH PRIVILEGES;
INITSQL

# Create appsettings.json for Web Console
echo 'Creating web console appsettings.json...'
sudo tee /home/netlock/web_console/appsettings.json > /dev/null <<EOF
{
  "Logging": {
    "LogLevel": {
      "Default": "Warning",
      "Microsoft": "Error",
      "Microsoft.Hosting.Lifetime": "Warning"
    },
    "Custom": { "Enabled": false }
  },
  "AllowedHosts": "*",
  "Kestrel": {
    "Endpoint": {
      "Http": { "Enabled": true, "Port": 80 },
      "Https": {
        "Enabled": false,
        "Port": 443,
        "Force": false,
        "Hsts": { "Enabled": true },
        "Certificate": {
          "Path": "/certificates/certificate.pfx",
          "Password": ""
        }
      }
    },
    "IpWhitelist": [],
    "KnownProxies": ["192.168.50.239"]
  },
  "NetLock_Remote_Server": {
    "Server": "netlock-rmm-server",
    "Port": 7080,
    "UseSSL": false
  },
  "NetLock_File_Server": {
    "Server": "netlock-rmm-server",
    "Port": 7080,
    "UseSSL": false
  },
  "MySQL": {
    "Server": "mysql-container",
    "Port": 3306,
    "Database": "dogha6",
    "User": "zaa21d4s",
    "Password": "8E3wwVQNZHaNdsou",
    "SslMode": "None",
    "AdditionalConnectionParameters": "AllowPublicKeyRetrieval=True;"
  },
  "Webinterface": {
    "Language": "en-US",
    "PublicOverrideUrl": "https://nl-backend.rmmservice.co.za"
  },
  "Members_Portal_Api": {
    "Enabled": true,
    "ApiKeyOverride": "764286af-438b-4f83-b4ed-b4936a45c853-71090d1d-73e4-43dd-908c-b8777fd54465"
  }
}
EOF

# Create appsettings.json for Server
echo 'Creating server appsettings.json...'
sudo tee /home/netlock/server/appsettings.json > /dev/null <<EOF
{
  "Logging": {
    "LogLevel": {
      "Default": "Warning",
      "Microsoft": "Error",
      "Microsoft.Hosting.Lifetime": "Warning",
      "Microsoft.AspNetCore.SignalR": "Error",
      "Microsoft.AspNetCore.Http.Connections": "Error"
    },
    "Custom": { "Enabled": false }
  },
  "AllowedHosts": "*",
  "Kestrel": {
    "Endpoint": {
      "Http": { "Enabled": true, "Port": 7080 },
      "Https": {
        "Enabled": false,
        "Port": 7443,
        "Force": false,
        "Hsts": { "Enabled": true },
        "Certificate": {
          "Path": "/certificates/certificate.pfx",
          "Password": ""
        }
      }
    },
    "Roles": {
      "Comm": true,
      "Update": true,
      "Trust": true,
      "Remote": true,
      "Notification": true,
      "File": true,
      "LLM": true,
      "Relay": true
    }
  },
  "Relay_Server": { "Port": 7081 },
  "MySQL": {
    "Server": "mysql-container",
    "Port": 3306,
    "Database": "dogha6",
    "User": "zaa21d4s",
    "Password": "8E3wwVQNZHaNdsou",
    "SslMode": "None",
    "AdditionalConnectionParameters": "AllowPublicKeyRetrieval=True;"
  },
  "Members_Portal_Api": {
    "Enabled": true,
    "ApiKeyOverride": "764286af-438b-4f83-b4ed-b4936a45c853-71090d1d-73e4-43dd-908c-b8777fd54465"
  },
  "Environment": { "Docker": true }
}
EOF

# Create docker-compose.yml
echo 'Creating docker-compose.yml...'
sudo tee /home/netlock/docker-compose.yml > /dev/null <<'COMPOSE_EOF'
services:
  mysql:
    image: mysql:8.0
    container_name: mysql-container
    environment:
      MYSQL_ROOT_PASSWORD: "lDDZsZbZXbGhBhgp"
      MYSQL_DATABASE: "dogha6"
    volumes:
      - /home/netlock/mysql/data:/var/lib/mysql
      - /home/netlock/mysql/init:/docker-entrypoint-initdb.d:ro
      - /etc/localtime:/etc/localtime:ro
    
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETUID
      - SETGID
      - DAC_OVERRIDE
    networks:
      - netlock-network
    restart: always
    command:
      - --skip-log-bin
      - --innodb_buffer_pool_size=1G
      - --innodb_log_file_size=256M
      - --innodb_flush_log_at_trx_commit=2
      - --max_connections=200

  netlock-rmm-web-console:
    image: nicomak101/netlock-rmm-web-console:latest
    container_name: netlock-rmm-web-console
    environment:
      - TZ=Africa/Johannesburg
    volumes:
      - '/home/netlock/web_console/appsettings.json:/app/appsettings.json'
      - '/home/netlock/web_console/internal:/app/internal'
      - '/home/netlock/web_console/logs:/var/0x101 Cyber Security/NetLock RMM/Web Console/'
      - '/home/netlock/certificates:/app/certificates'
      - /etc/localtime:/etc/localtime:ro
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.netlock-console.rule=Host(`rmm.rmmservice.co.za`) || Host(`nl-webconsole.rmmservice.co.za`)'
      - 'traefik.http.routers.netlock-console.entrypoints=web'
      - 'traefik.http.services.netlock-console.loadbalancer.server.port=80'

    networks:
      - netlock-network
    restart: always
    depends_on:
      - mysql

  netlock-rmm-server:
    image: nicomak101/netlock-rmm-server:latest
    container_name: netlock-rmm-server
    environment:
      - TZ=Africa/Johannesburg
    volumes:
      - '/home/netlock/server/appsettings.json:/app/appsettings.json'
      - '/home/netlock/server/internal:/app/internal'
      - '/home/netlock/server/files:/app/www/private/files'
      - '/home/netlock/server/logs:/var/0x101 Cyber Security/NetLock RMM/Server/'
      - '/home/netlock/certificates:/app/certificates'
      - /etc/localtime:/etc/localtime:ro
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    ports:
      - '7080:7080'
      - '7081:7081'

    networks:
      - netlock-network
    restart: always
    depends_on:
      - mysql

networks:
  netlock-network:
    name: netlock_netlock-network
    external: true
COMPOSE_EOF

echo 'docker-compose.yml created in /home/netlock'

sudo $COMPOSE_CMD -f /home/netlock/docker-compose.yml up -d

sudo docker run --detach \
    --name watchtower \
    --volume /var/run/docker.sock:/var/run/docker.sock \
    --restart unless-stopped \
    nickfedor/watchtower \
    --interval 900

echo ''
echo 'Docker containers started.'
echo 'Please wait up to 10 minutes for the services to be fully operational.'
echo 'Default username and password for the web console is: admin'
echo 'If you need help, visit our documentation or contact support: support@netlockrmm.com'
echo 'Happy monitoring!'
