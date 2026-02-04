#!/bin/bash

###############################################################################
# Deployment Script for Calendar Event Management System
#
# This script:
# - Installs Node.js, PostgreSQL, and pnpm if needed
# - Sets up PostgreSQL database and user
# - Runs database migrations
# - Installs project dependencies
# - Builds the Next.js application
# - Sets up systemd service for robust process management
# - Starts/restarts the application
#
# Usage: sudo ./deploy.sh
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="calendar-events"
APP_PORT=5002
DB_NAME="calendar"
DB_USER="calendar_user"
DB_PASSWORD="calendar_pass"
DB_HOST="localhost"
DB_PORT=5432
NODE_VERSION="20"  # LTS version

# Function to check if a port is available
is_port_available() {
    local port=$1
    ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1
}

# Function to find next available port
find_available_port() {
    local start_port=$1
    local max_port=$((start_port + 100))  # Try up to 100 ports

    for ((port=start_port; port<=max_port; port++)); do
        if is_port_available $port; then
            echo $port
            return 0
        fi
    done

    log_error "No available ports found between $start_port and $max_port"
    return 1
}

# Check and update port if necessary
check_and_update_port() {
    if ! is_port_available $APP_PORT; then
        log_warning "Port $APP_PORT is already in use"
        NEW_PORT=$(find_available_port $APP_PORT)
        if [ $? -eq 0 ]; then
            log_info "Auto-incrementing to available port: $NEW_PORT"
            APP_PORT=$NEW_PORT
        else
            log_error "Could not find an available port"
            exit 1
        fi
    else
        log_info "Port $APP_PORT is available"
    fi
}

# Log functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Please run as root (sudo ./deploy.sh)"
        exit 1
    fi
}

# Get the actual user (not root when using sudo)
get_actual_user() {
    if [ -n "$SUDO_USER" ]; then
        echo "$SUDO_USER"
    else
        echo "$USER"
    fi
}

ACTUAL_USER=$(get_actual_user)
ACTUAL_HOME=$(eval echo ~$ACTUAL_USER)

###############################################################################
# Check and Install lsof (required for port checking)
###############################################################################
install_lsof() {
    if ! command -v lsof &> /dev/null; then
        log_info "Installing lsof (required for port checking)..."
        apt-get update -qq
        apt-get install -y lsof
        log_success "lsof installed"
    fi
}

###############################################################################
# 1. Check and Install Node.js
###############################################################################
install_nodejs() {
    log_info "Checking Node.js installation..."

    if command -v node &> /dev/null; then
        NODE_INSTALLED_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_INSTALLED_VERSION" -ge "$NODE_VERSION" ]; then
            log_success "Node.js $(node -v) is already installed"
            return 0
        else
            log_warning "Node.js version is too old ($(node -v)), upgrading..."
        fi
    fi

    log_info "Installing Node.js ${NODE_VERSION}.x..."

    # Install Node.js using NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs

    log_success "Node.js $(node -v) installed successfully"
}

###############################################################################
# 2. Check and Install PostgreSQL
###############################################################################
install_postgresql() {
    log_info "Checking PostgreSQL installation..."

    if command -v psql &> /dev/null; then
        log_success "PostgreSQL $(psql --version | awk '{print $3}') is already installed"

        # Check if PostgreSQL service is running
        if systemctl is-active --quiet postgresql; then
            log_success "PostgreSQL service is running"
        else
            log_info "Starting PostgreSQL service..."
            systemctl start postgresql
            systemctl enable postgresql
            log_success "PostgreSQL service started"
        fi
        return 0
    fi

    log_info "Installing PostgreSQL..."

    apt-get update
    apt-get install -y postgresql postgresql-contrib

    # Start and enable PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql

    log_success "PostgreSQL installed and started"
}

###############################################################################
# 3. Setup Database and User
###############################################################################
setup_database() {
    log_info "Setting up PostgreSQL database and user..."

    # Check if database exists
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        log_success "Database '$DB_NAME' already exists"
    else
        log_info "Creating database '$DB_NAME'..."
        sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
        log_success "Database '$DB_NAME' created"
    fi

    # Check if user exists
    if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
        log_success "Database user '$DB_USER' already exists"
        # Update password just in case
        sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
    else
        log_info "Creating database user '$DB_USER'..."
        sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
        log_success "Database user '$DB_USER' created"
    fi

    # Grant privileges
    log_info "Granting privileges..."
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
    sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

    log_success "Database setup completed"
}

###############################################################################
# 4. Check and Install pnpm
###############################################################################
install_pnpm() {
    log_info "Checking pnpm installation..."

    if su - $ACTUAL_USER -c "command -v pnpm" &> /dev/null; then
        PNPM_VERSION=$(su - $ACTUAL_USER -c "pnpm -v")
        log_success "pnpm $PNPM_VERSION is already installed"
        return 0
    fi

    log_info "Installing pnpm..."

    # Install pnpm globally using npm
    npm install -g pnpm

    log_success "pnpm $(pnpm -v) installed successfully"
}

###############################################################################
# 5. Setup Environment Variables
###############################################################################
setup_environment() {
    log_info "Setting up environment variables..."

    ENV_FILE="$PROJECT_DIR/.env"

    if [ -f "$ENV_FILE" ]; then
        log_success ".env file already exists"

        # Check if DATABASE_URL is set
        if grep -q "DATABASE_URL=" "$ENV_FILE"; then
            log_success "DATABASE_URL is already configured"
        else
            log_warning "DATABASE_URL not found in .env, adding it..."
            echo "" >> "$ENV_FILE"
            echo "DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" >> "$ENV_FILE"
        fi

        if grep -q "PGDATABASE_URL=" "$ENV_FILE"; then
            log_success "PGDATABASE_URL is already configured"
        else
            echo "PGDATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" >> "$ENV_FILE"
        fi

        # Update or add PORT configuration
        if grep -q "^PORT=" "$ENV_FILE"; then
            log_info "Updating PORT in .env to $APP_PORT..."
            sed -i "s/^PORT=.*/PORT=$APP_PORT/" "$ENV_FILE"
        else
            log_info "Adding PORT to .env..."
            echo "PORT=$APP_PORT" >> "$ENV_FILE"
        fi
    else
        log_info "Creating .env file..."
        cat > "$ENV_FILE" << EOF
# Database Configuration
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME
PGDATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME

# Application Configuration
PORT=$APP_PORT
NODE_ENV=production

# DingTalk Integration (Optional - configure if needed)
# DINGTALK_APP_ID=
# DINGTALK_AGENT_ID=
# DINGTALK_CLIENT_ID=
# DINGTALK_CLIENT_SECRET=
# DINGTALK_CORP_ID=
EOF
        log_success ".env file created"
    fi

    # Set proper ownership
    chown $ACTUAL_USER:$ACTUAL_USER "$ENV_FILE"
    chmod 600 "$ENV_FILE"

    log_success "Environment variables configured (PORT=$APP_PORT)"
}

###############################################################################
# 6. Install Project Dependencies
###############################################################################
install_dependencies() {
    log_info "Installing project dependencies..."

    cd "$PROJECT_DIR"

    # Check if node_modules exists
    if [ -d "$PROJECT_DIR/node_modules" ] && [ -f "$PROJECT_DIR/pnpm-lock.yaml" ]; then
        log_info "Dependencies appear to be installed, checking for updates..."
        su - $ACTUAL_USER -c "cd '$PROJECT_DIR' && pnpm install --frozen-lockfile"
    else
        log_info "Installing dependencies with pnpm..."
        su - $ACTUAL_USER -c "cd '$PROJECT_DIR' && pnpm install"
    fi

    log_success "Dependencies installed successfully"
}

###############################################################################
# 7. Run Database Migrations
###############################################################################
run_migrations() {
    log_info "Running database migrations..."

    cd "$PROJECT_DIR"

    # Test database connection first
    log_info "Testing database connection..."
    if sudo -u postgres psql -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        log_success "Database connection successful"
    else
        log_error "Database connection failed!"
        log_info "Checking if PostgreSQL is running..."
        systemctl status postgresql --no-pager -l
        exit 1
    fi

    # Check if drizzle-kit is available
    if [ -f "$PROJECT_DIR/node_modules/.bin/drizzle-kit" ]; then
        log_info "Generating and pushing database schema..."

        # Load environment variables for the migration
        export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
        export PGDATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

        if su - $ACTUAL_USER -c "cd '$PROJECT_DIR' && DATABASE_URL='$DATABASE_URL' PGDATABASE_URL='$PGDATABASE_URL' pnpm exec drizzle-kit push"; then
            log_success "Database migrations completed"
        else
            log_error "Database migration failed!"
            log_warning "You may need to run migrations manually: pnpm exec drizzle-kit push"
        fi
    else
        log_warning "drizzle-kit not found, skipping migrations (will run after dependency install)"
    fi
}

###############################################################################
# 8. Build Application
###############################################################################
build_application() {
    log_info "Building Next.js application..."

    cd "$PROJECT_DIR"

    # Always clean the build cache to prevent stale schema issues
    if [ -d "$PROJECT_DIR/.next" ]; then
        log_info "Removing old build cache to prevent stale schema issues..."
        rm -rf "$PROJECT_DIR/.next"
        log_success "Build cache cleaned"
    fi

    # Ensure public/posters directory exists for local file uploads
    # (Only needed if ENABLE_S3_STORAGE is not set to true)
    log_info "Ensuring upload directory exists..."
    if [ ! -d "$PROJECT_DIR/public/posters" ]; then
        mkdir -p "$PROJECT_DIR/public/posters"
        log_success "Created public/posters directory"
    fi

    # Set proper ownership and permissions for uploads
    chown -R $ACTUAL_USER:$ACTUAL_USER "$PROJECT_DIR/public/posters"
    chmod -R 755 "$PROJECT_DIR/public/posters"
    log_success "Upload directory configured with proper permissions"

    log_info "Running production build..."
    su - $ACTUAL_USER -c "cd '$PROJECT_DIR' && pnpm run build"

    log_success "Application built successfully"
}

###############################################################################
# 9. Create Systemd Service
###############################################################################
create_systemd_service() {
    log_info "Setting up systemd service..."

    SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"
    SERVICE_EXISTS=false

    if [ -f "$SERVICE_FILE" ]; then
        log_info "Systemd service exists, updating..."
        SERVICE_EXISTS=true
    else
        log_info "Creating systemd service file..."
    fi

    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Calendar Events Management System
Documentation=https://github.com/yourusername/calendar-events
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$ACTUAL_USER
Group=$ACTUAL_USER
WorkingDirectory=$PROJECT_DIR
Environment=NODE_ENV=production
Environment=PORT=$APP_PORT
EnvironmentFile=$PROJECT_DIR/.env
ExecStart=$(which pnpm) start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$APP_NAME

# Ensure service waits for startup
TimeoutStartSec=60

# Security hardening (relaxed for Next.js requirements)
NoNewPrivileges=true
PrivateTmp=true

# Resource limits
LimitNOFILE=65536
MemoryMax=2G

[Install]
WantedBy=multi-user.target
EOF

    if [ "$SERVICE_EXISTS" = true ]; then
        log_success "Systemd service file updated"
    else
        log_success "Systemd service file created"
    fi

    # Reload systemd
    systemctl daemon-reload

    # Enable service to start on boot
    systemctl enable $APP_NAME

    log_success "Systemd service configured"
}

###############################################################################
# 10. Start/Restart Application
###############################################################################
start_application() {
    log_info "Starting application..."

    # Check if service is running
    if systemctl is-active --quiet $APP_NAME; then
        log_info "Application is running, restarting..."
        systemctl restart $APP_NAME
    else
        log_info "Starting application for the first time..."
        systemctl start $APP_NAME
    fi

    # Wait for service to start and stabilize
    log_info "Waiting for service to start..."
    sleep 5

    # Check status with retries
    MAX_RETRIES=6
    RETRY_COUNT=0
    SERVICE_STARTED=false

    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if systemctl is-active --quiet $APP_NAME; then
            SERVICE_STARTED=true
            break
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            log_info "Service not ready yet, waiting... (attempt $RETRY_COUNT/$MAX_RETRIES)"
            sleep 5
        fi
    done

    if [ "$SERVICE_STARTED" = true ]; then
        log_success "Application started successfully!"
        echo ""
        log_info "Service status:"
        systemctl status $APP_NAME --no-pager -l
        echo ""
        log_success "Application accessible at: http://localhost:$APP_PORT"
        log_info "View logs: sudo journalctl -u $APP_NAME -f"
    else
        log_error "Failed to start application!"
        echo ""
        log_error "Recent logs:"
        journalctl -u $APP_NAME -n 30 --no-pager
        echo ""
        log_info "Full logs: sudo journalctl -u $APP_NAME -f"
        log_info "Service status: sudo systemctl status $APP_NAME"
        exit 1
    fi
}

###############################################################################
# Main Deployment Flow
###############################################################################
main() {
    log_info "=========================================="
    log_info "Calendar Events Deployment Script"
    log_info "=========================================="
    echo ""

    check_root

    log_info "Project Directory: $PROJECT_DIR"
    log_info "Running as: $ACTUAL_USER"
    log_info "Initial Port: $APP_PORT"
    log_info "Database: $DB_NAME"
    echo ""

    # Install lsof if needed
    install_lsof

    # Check port availability
    check_and_update_port
    echo ""

    # Step 1: Install Node.js
    install_nodejs
    echo ""

    # Step 2: Install PostgreSQL
    install_postgresql
    echo ""

    # Step 3: Setup Database
    setup_database
    echo ""

    # Step 4: Install pnpm
    install_pnpm
    echo ""

    # Step 5: Setup Environment
    setup_environment
    echo ""

    # Step 6: Install Dependencies
    install_dependencies
    echo ""

    # Step 7: Run Migrations
    run_migrations
    echo ""

    # Step 8: Build Application
    build_application
    echo ""

    # Step 9: Create Systemd Service
    create_systemd_service
    echo ""

    # Step 10: Start Application
    start_application
    echo ""

    log_success "=========================================="
    log_success "Deployment completed successfully!"
    log_success "=========================================="
    echo ""
    log_info "Useful commands:"
    echo "  - Check status:  sudo systemctl status $APP_NAME"
    echo "  - View logs:     sudo journalctl -u $APP_NAME -f"
    echo "  - Restart:       sudo systemctl restart $APP_NAME"
    echo "  - Stop:          sudo systemctl stop $APP_NAME"
    echo "  - Start:         sudo systemctl start $APP_NAME"
    echo "  - Troubleshoot:  sudo ./troubleshoot.sh"
    echo ""
}

# Run main function
main "$@"
