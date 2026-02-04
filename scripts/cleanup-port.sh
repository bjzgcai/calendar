#!/bin/bash
set -e

PORT=${1:-5002}

echo "Cleaning up port $PORT..."

# Stop the systemd service
echo "Stopping calendar-events service..."
sudo systemctl stop calendar-events || true

# Wait for graceful shutdown
sleep 2

# Find and kill all processes using the port
echo "Finding processes on port $PORT..."
PIDS=$(lsof -ti:$PORT || true)

if [ -n "$PIDS" ]; then
    echo "Killing processes: $PIDS"
    echo "$PIDS" | xargs kill -9 || true
    sleep 1
fi

# Double check port is free
if lsof -i:$PORT > /dev/null 2>&1; then
    echo "ERROR: Port $PORT is still in use!"
    lsof -i:$PORT
    exit 1
else
    echo "Port $PORT is now free"
fi

echo "Cleanup complete"
