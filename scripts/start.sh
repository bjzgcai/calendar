#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
PORT=5002
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-$PORT}"

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

    echo "Error: No available ports found between $start_port and $max_port" >&2
    return 1
}

# Find available port if the configured one is in use
if ! is_port_available $DEPLOY_RUN_PORT; then
    echo "Warning: Port $DEPLOY_RUN_PORT is already in use"
    NEW_PORT=$(find_available_port $DEPLOY_RUN_PORT)
    if [ $? -eq 0 ]; then
        echo "Auto-incrementing to available port: $NEW_PORT"
        DEPLOY_RUN_PORT=$NEW_PORT
    else
        echo "Error: Could not find an available port"
        exit 1
    fi
fi

start_service() {
    cd "${COZE_WORKSPACE_PATH}"
    echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
    npx next start --hostname 0.0.0.0 --port ${DEPLOY_RUN_PORT}
}

echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
start_service
