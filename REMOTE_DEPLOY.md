# Remote Deployment Guide - Port 5002 Internal Network Access

## Quick Deploy

### 1. Copy files to remote server
```bash
# From your local machine
scp -r /home/carter/calendar ubuntu@10.101.1.253:~/
```

### 2. SSH to server and deploy
```bash
# Connect to server
ssh ubuntu@10.101.1.253

# Navigate to project
cd ~/agents-589114d599

# Run deployment (installs everything, configures database, starts service)
sudo ./deploy.sh
```

### 3. Configure firewall for internal network access
```bash
# Allow port 5002 through firewall
sudo ufw allow 5002/tcp comment "Event Calendar App"

# Verify firewall rule
sudo ufw status | grep 5002
```

## Configuration Details

### Port Configuration
- **Application Port**: 5002
- **Network Binding**: 0.0.0.0 (accessible from all interfaces)
- **Internal Access URL**: http://10.101.1.253:5002

### What deploy.sh does:
1. Installs Node.js 20, PostgreSQL, and pnpm
2. Creates PostgreSQL database and user
3. Configures environment variables (PORT=5002)
4. Installs dependencies with pnpm
5. Runs database migrations
6. Builds Next.js application
7. Creates systemd service for auto-restart
8. Starts the application

### Systemd Service Management
```bash
# Check service status
sudo systemctl status calendar-events

# View live logs
sudo journalctl -u calendar-events -f

# Restart service
sudo systemctl restart calendar-events

# Stop service
sudo systemctl stop calendar-events

# Start service
sudo systemctl start calendar-events
```

## Verification

### Check if app is running and accessible
```bash
# On the server - check local access
curl http://localhost:5002

# From another machine on internal network
curl http://10.101.1.253:5002
```

### Check port binding
```bash
# Verify app is listening on 0.0.0.0:5002
sudo netstat -tlnp | grep 5002
# Should show: 0.0.0.0:5002 (not 127.0.0.1:5002)
```

## Troubleshooting

### Port already in use
The deployment script automatically finds next available port if 5002 is taken. Check logs:
```bash
sudo journalctl -u calendar-events -n 50
```

### Firewall blocking access
```bash
# Check firewall status
sudo ufw status verbose

# If UFW is inactive, enable it
sudo ufw enable

# Allow SSH (important!)
sudo ufw allow 22/tcp

# Allow port 5002
sudo ufw allow 5002/tcp
```

### Database connection issues
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test database connection
sudo -u postgres psql -d calendar -c "SELECT 1;"
```

### Check network binding
If you can access locally but not from other machines:
```bash
# Verify the app is listening on 0.0.0.0 (not 127.0.0.1)
sudo lsof -i :5002

# Should show:
# LISTEN 0.0.0.0:5002 (IPv4)
# LISTEN :::5002 (IPv6)
```

## Environment Variables

The deployment creates `/path/to/project/.env` with:
```env
DATABASE_URL=postgresql://calendar_user:calendar_pass@localhost:5432/calendar
PGDATABASE_URL=postgresql://calendar_user:calendar_pass@localhost:5432/calendar
PORT=5002
NODE_ENV=production
```

## Manual Start (without systemd)

If you need to start manually:
```bash
cd ~/agents-589114d599
PORT=5002 pnpm start
```

## Update Deployment

To redeploy after code changes:
```bash
# Copy new files
scp -r /local/path ubuntu@10.101.1.253:~/agents-589114d599

# SSH and redeploy
ssh ubuntu@10.101.1.253
cd ~/agents-589114d599
sudo ./deploy.sh
```

## One-Line Deploy Command

From your local machine:
```bash
ssh ubuntu@10.101.1.253 "cd ~/agents-589114d599 && git pull && sudo ./deploy.sh && sudo ufw allow 5002/tcp"
```
