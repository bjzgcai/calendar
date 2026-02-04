#!/bin/bash

###############################################################################
# Troubleshooting Script for Calendar Events System
#
# Usage: sudo ./troubleshoot.sh
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

APP_NAME="calendar-events"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_section() {
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
    echo -e "${YELLOW} $1${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
}

# Check service status
log_section "1. Service Status"
if systemctl is-active --quiet $APP_NAME; then
    log_success "Service is running"
    systemctl status $APP_NAME --no-pager -l
else
    log_error "Service is NOT running"
    systemctl status $APP_NAME --no-pager -l || true
fi

# Check recent logs
log_section "2. Recent Service Logs (last 50 lines)"
journalctl -u $APP_NAME -n 50 --no-pager

# Check PostgreSQL
log_section "3. PostgreSQL Status"
if systemctl is-active --quiet postgresql; then
    log_success "PostgreSQL is running"
    psql --version
else
    log_error "PostgreSQL is NOT running"
fi

# Check database connection
log_section "4. Database Connection Test"
if [ -f "$PROJECT_DIR/.env" ]; then
    # Load DATABASE_URL from .env
    source <(grep DATABASE_URL "$PROJECT_DIR/.env" | head -1)

    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*@.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

    log_info "Testing connection as user: $DB_USER to database: $DB_NAME"

    if sudo -u postgres psql -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        log_success "Database exists and is accessible"

        # Check tables
        TABLE_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
        log_info "Tables in database: $TABLE_COUNT"

        if [ "$TABLE_COUNT" -gt 0 ]; then
            log_info "Table list:"
            sudo -u postgres psql -d "$DB_NAME" -c "\dt"
        else
            log_error "No tables found! Migrations may not have run."
        fi
    else
        log_error "Cannot connect to database!"
    fi
else
    log_error ".env file not found!"
fi

# Check Node.js and dependencies
log_section "5. Node.js and Dependencies"
if command -v node &> /dev/null; then
    log_success "Node.js: $(node -v)"
else
    log_error "Node.js not found!"
fi

if command -v pnpm &> /dev/null; then
    log_success "pnpm: $(pnpm -v)"
else
    log_error "pnpm not found!"
fi

if [ -d "$PROJECT_DIR/node_modules" ]; then
    log_success "node_modules exists"
else
    log_error "node_modules not found!"
fi

if [ -d "$PROJECT_DIR/.next" ]; then
    log_success ".next build directory exists"
else
    log_error ".next build directory not found!"
fi

# Check environment file
log_section "6. Environment Configuration"
if [ -f "$PROJECT_DIR/.env" ]; then
    log_success ".env file exists"
    log_info "Environment variables (values hidden):"
    grep -v '^#' "$PROJECT_DIR/.env" | grep '=' | sed 's/=.*/=***/' || echo "Empty .env file"
else
    log_error ".env file not found!"
fi

# Check port availability
log_section "7. Port Check"
if command -v ss &> /dev/null; then
    if ss -tuln | grep -q ':5000 '; then
        log_info "Port 5000 is in use:"
        ss -tulnp | grep ':5000 '
    else
        log_error "Port 5000 is not in use (application may not be listening)"
    fi
else
    if netstat -tuln | grep -q ':5000 '; then
        log_info "Port 5000 is in use:"
        netstat -tulnp | grep ':5000 '
    else
        log_error "Port 5000 is not in use (application may not be listening)"
    fi
fi

# Check file permissions
log_section "8. File Permissions"
ls -la "$PROJECT_DIR/.env" 2>/dev/null || log_error ".env permissions cannot be checked"
ls -ld "$PROJECT_DIR" || log_error "Project directory permissions cannot be checked"

# Test application endpoint
log_section "9. Application Endpoint Test"
log_info "Testing http://localhost:5000 ..."
if command -v curl &> /dev/null; then
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 --connect-timeout 5 || echo "000")
    if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
        log_success "Application responds with HTTP $HTTP_STATUS"
    else
        log_error "Application not responding (HTTP $HTTP_STATUS)"
    fi
else
    log_error "curl not available for testing"
fi

# System resources
log_section "10. System Resources"
log_info "Memory usage:"
free -h
echo ""
log_info "Disk usage:"
df -h "$PROJECT_DIR"

# Summary and recommendations
log_section "Troubleshooting Summary"
echo ""
log_info "If the service is failing, try these steps:"
echo "  1. Check logs: sudo journalctl -u $APP_NAME -f"
echo "  2. Check environment: cat $PROJECT_DIR/.env"
echo "  3. Test database: psql -U calendar_user -d calendar -h localhost"
echo "  4. Restart service: sudo systemctl restart $APP_NAME"
echo "  5. Re-run deployment: sudo ./deploy.sh"
echo ""
log_info "For manual testing:"
echo "  cd $PROJECT_DIR"
echo "  pnpm run build    # Build the application"
echo "  pnpm start        # Start manually"
echo ""
