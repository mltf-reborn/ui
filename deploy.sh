#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="/var/www/mltf-ui"
SOURCE_DIST="${PROJECT_DIR}/dist/ui/browser"
SOURCE_CONF="${PROJECT_DIR}/mltf-ui.conf"
NGINX_CONF="/etc/nginx/sites-available/mltf-ui"
NGINX_LINK="/etc/nginx/sites-enabled/mltf-ui"

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}    MLTF UI Production Deployment      ${NC}"
echo -e "${BLUE}=======================================${NC}"

# 1. Build application
echo -e "\n${YELLOW}[1/5] Building Angular production bundle...${NC}"
npm run build

# 2. Deploy web files to /var/www/mltf-ui
echo -e "\n${YELLOW}[2/5] Copying web assets to ${TARGET_DIR}...${NC}"
sudo mkdir -p "${TARGET_DIR}"
sudo rm -rf "${TARGET_DIR:?}"/*
sudo cp -r "${SOURCE_DIST}"/* "${TARGET_DIR}/"
sudo chown -R www-data:www-data "${TARGET_DIR}"
sudo chmod -R 755 "${TARGET_DIR}"

# 3. Configure Nginx site
echo -e "\n${YELLOW}[3/5] Installing Nginx configuration...${NC}"
sudo cp "${SOURCE_CONF}" "${NGINX_CONF}"

# Enable site if not already enabled
if [ ! -L "${NGINX_LINK}" ] && [ ! -f "${NGINX_LINK}" ]; then
  sudo ln -s "${NGINX_CONF}" "${NGINX_LINK}"
fi

# Remove default site if present
if [ -L "/etc/nginx/sites-enabled/default" ] || [ -f "/etc/nginx/sites-enabled/default" ]; then
  sudo rm -f "/etc/nginx/sites-enabled/default"
fi

# 4. Test configuration
echo -e "\n${YELLOW}[4/5] Testing Nginx configuration...${NC}"
sudo nginx -t

# 5. Reload Nginx
echo -e "\n${YELLOW}[5/5] Reloading Nginx service...${NC}"
sudo systemctl reload nginx || sudo systemctl restart nginx

echo -e "\n${BLUE}=======================================${NC}"
echo -e "${GREEN}✓ Deployed successfully!${NC}"
echo -e "${GREEN}  Access your app at: https://mltf.bagusxmahendra.com${NC}"
echo -e "${BLUE}=======================================${NC}\n"
