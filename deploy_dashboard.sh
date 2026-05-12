#!/bin/bash
# CORTEX Dashboard Deployment Script
cd /opt/cortex/infrastructure/viki/services/dashboard-react
docker compose up -d --build
