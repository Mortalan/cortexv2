#!/bin/bash
# CORTEX VM TRIAD DEPLOYMENT SCRIPT (v2.0)
# Target: Proxmox VE 9.x (VIKI)

IMAGE_URL="https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img"
IMAGE_NAME="noble-server-cloudimg-amd64.img"
STORAGE="local-lvm" # Adjust if your storage name differs

echo "[*] Downloading Ubuntu 24.04 Cloud Image..."
wget -qN $IMAGE_URL

echo "[*] Installing dependencies (libguestfs-tools)..."
apt-get update -q && apt-get install -y libguestfs-tools -q

# 1. CREATE CORTEX-CORE (ID: 100)
echo "[*] Deploying CORTEX-Core (ID: 100)..."
qm create 100 --name CORTEX-Core --memory 8192 --cores 4 --net0 virtio,bridge=vmbr0
qm importdisk 100 $IMAGE_NAME $STORAGE
qm set 100 --scsihw virtio-scsi-pci --scsi0 $STORAGE:vm-100-disk-0
qm set 100 --ide2 $STORAGE:cloudinit
qm set 100 --boot c --bootdisk scsi0
qm set 100 --serial0 socket --vga serial0
qm set 100 --ipconfig0 ip=192.168.50.241/24,gw=192.168.50.1

# 2. CREATE CORTEX-AI (ID: 101)
echo "[*] Deploying CORTEX-AI (ID: 101)..."
qm create 101 --name CORTEX-AI --memory 16384 --cores 4 --net0 virtio,bridge=vmbr0
qm importdisk 101 $IMAGE_NAME $STORAGE
qm set 101 --scsihw virtio-scsi-pci --scsi0 $STORAGE:vm-101-disk-0
qm set 101 --ide2 $STORAGE:cloudinit
qm set 101 --boot c --bootdisk scsi0
qm set 101 --hostpci0 0000:10:00,pcie=1,x-vga=1 # RTX 4060 Passthrough
qm set 101 --ipconfig0 ip=192.168.50.242/24,gw=192.168.50.1

# 3. CREATE CORTEX-LAKE (ID: 102)
echo "[*] Deploying CORTEX-Lake (ID: 102)..."
qm create 102 --name CORTEX-Lake --memory 4096 --cores 2 --net0 virtio,bridge=vmbr0
qm importdisk 102 $IMAGE_NAME $STORAGE
qm set 102 --scsihw virtio-scsi-pci --scsi0 $STORAGE:vm-102-disk-0
qm set 102 --ide2 $STORAGE:cloudinit
qm set 102 --boot c --bootdisk scsi0
# Pass through the 4TB HDD (sda)
qm set 102 --scsi1 /dev/sda,backup=0
qm set 102 --ipconfig0 ip=192.168.50.243/24,gw=192.168.50.1

echo "[+] VM Triad Scaffolded. Review settings in Proxmox GUI before starting."
