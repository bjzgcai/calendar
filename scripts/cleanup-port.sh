#!/bin/bash
set -e

PORT=${1:-5002}

echo "Cleaning up port $PORT..."

# Stop the systemd service
echo "Stopping calendar-events service..."
sudo systemctl stop calendar-events || true

# Wait for graceful shutdown
sleep 2

# Find and kill all processes using the port (lsof may not work reliably in WSL2)
echo "Finding processes on port $PORT..."
PIDS=$(lsof -ti:$PORT 2>/dev/null || true)

# Fallback: use ss + grep to find PIDs when lsof misses them
if [ -z "$PIDS" ]; then
    PIDS=$(ss -tlnp "sport = :$PORT" 2>/dev/null | grep -oP 'pid=\K[0-9]+' || true)
fi

if [ -n "$PIDS" ]; then
    echo "Killing processes: $PIDS"
    echo "$PIDS" | xargs kill -9 || true
    sleep 1
fi

# Also kill any lingering next dev processes on this port by command match
NEXT_PIDS=$(pgrep -f "next.*--port $PORT" || true)
if [ -n "$NEXT_PIDS" ]; then
    echo "Killing next dev processes: $NEXT_PIDS"
    echo "$NEXT_PIDS" | xargs kill -9 || true
    sleep 1
fi

# Double check using ss (more reliable in WSL2)
if ss -tlnp "sport = :$PORT" 2>/dev/null | grep -q ":$PORT"; then
    echo "ERROR: Port $PORT is still in use!"
    ss -tlnp "sport = :$PORT"
    exit 1
else
    echo "Port $PORT is now free"
fi

echo "Cleanup complete"
