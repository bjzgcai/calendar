#!/bin/bash
###############################################################################
# Quick Network Setup Script
# Configures firewall and verifies network accessibility for port 5002
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_PORT=5002

echo -e "${BLUE}=== Port 5002 Network Configuration ===${NC}\n"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run with sudo: sudo ./setup-network.sh${NC}"
    exit 1
fi

# 1. Install lsof if not present
if ! command -v lsof &> /dev/null; then
    echo -e "${BLUE}Installing lsof...${NC}"
    apt-get update -qq
    apt-get install -y lsof netstat-nat
fi

# 2. Check if port is in use
echo -e "${BLUE}Checking port $APP_PORT status...${NC}"
if lsof -Pi :$APP_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Port $APP_PORT is in use (application running)${NC}"

    # Show what's listening
    echo -e "\n${BLUE}Process listening on port $APP_PORT:${NC}"
    lsof -i :$APP_PORT

    # Check binding address
    BINDING=$(netstat -tlnp 2>/dev/null | grep :$APP_PORT | awk '{print $4}')
    echo -e "\n${BLUE}Binding address: ${NC}$BINDING"

    if echo "$BINDING" | grep -q "0.0.0.0:$APP_PORT\|:::$APP_PORT"; then
        echo -e "${GREEN}✓ Correctly bound to 0.0.0.0 (network accessible)${NC}"
    elif echo "$BINDING" | grep -q "127.0.0.1:$APP_PORT"; then
        echo -e "${YELLOW}⚠ Bound to localhost only (not accessible from network)${NC}"
        echo -e "${YELLOW}  Application needs to bind to 0.0.0.0${NC}"
    fi
else
    echo -e "${YELLOW}Port $APP_PORT is not in use${NC}"
    echo -e "${YELLOW}Make sure the application is running first${NC}"
fi

# 3. Configure UFW firewall
echo -e "\n${BLUE}Configuring firewall...${NC}"

# Check if UFW is installed
if ! command -v ufw &> /dev/null; then
    echo -e "${YELLOW}UFW not installed, installing...${NC}"
    apt-get install -y ufw
fi

# Check UFW status
UFW_STATUS=$(ufw status | head -1)
if echo "$UFW_STATUS" | grep -q "inactive"; then
    echo -e "${YELLOW}UFW is inactive${NC}"
    echo -e "${BLUE}Enabling UFW (will allow SSH first)...${NC}"

    # Always allow SSH before enabling
    ufw allow 22/tcp
    ufw --force enable
    echo -e "${GREEN}✓ UFW enabled${NC}"
fi

# Add rule for app port
if ufw status | grep -q "$APP_PORT"; then
    echo -e "${GREEN}✓ Firewall rule for port $APP_PORT already exists${NC}"
else
    echo -e "${BLUE}Adding firewall rule for port $APP_PORT...${NC}"
    ufw allow $APP_PORT/tcp comment "Event Calendar App"
    echo -e "${GREEN}✓ Firewall rule added${NC}"
fi

# Show UFW status
echo -e "\n${BLUE}Current firewall rules:${NC}"
ufw status | grep -E "$APP_PORT|22/tcp"

# 4. Get server IP addresses
echo -e "\n${BLUE}Server IP addresses:${NC}"
hostname -I | tr ' ' '\n' | grep -E '^[0-9]' | head -5

# 5. Test local connectivity
echo -e "\n${BLUE}Testing local connectivity...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:$APP_PORT --max-time 5 | grep -q "200\|404\|301\|302"; then
    echo -e "${GREEN}✓ Application responds locally on port $APP_PORT${NC}"
else
    echo -e "${YELLOW}⚠ Cannot connect to localhost:$APP_PORT${NC}"
    echo -e "${YELLOW}  Make sure the application is running${NC}"
fi

# Summary
echo -e "\n${BLUE}=== Summary ===${NC}"
echo -e "Application Port: ${GREEN}$APP_PORT${NC}"
echo -e "Access URL: ${GREEN}http://$(hostname -I | awk '{print $1}'):$APP_PORT${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Ensure application is running: sudo systemctl status calendar-events"
echo "2. Access from internal network: http://$(hostname -I | awk '{print $1}'):$APP_PORT"
echo "3. View logs: sudo journalctl -u calendar-events -f"
echo ""
echo -e "${GREEN}✓ Network configuration complete!${NC}"
