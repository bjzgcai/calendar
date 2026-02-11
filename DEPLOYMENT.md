# Deployment Guide

This guide explains how to deploy the Calendar Events Management System on a Linux server.

## Quick Start

```bash
sudo ./deploy.sh
```

That's it! The script will handle everything automatically.

**Key Features:**
- **Automatic Port Detection**: Script starts with port 5002 and auto-increments if occupied
- **Persistent Storage**: File uploads saved to `/var/calendar-events/posters` (survives deployments)
- **Clean Builds**: Always rebuilds from scratch to prevent stale schema issues
- **Idempotent**: Safe to run multiple times, skips already-completed steps

## What the Script Does

The `deploy.sh` script is fully idempotent and will:

1. **Install lsof** (if not present)
   - Required for port availability checking

2. **Check Port Availability**
   - Default port: 5002
   - Auto-increments to next available port if occupied
   - Updates .env with selected port

3. **Check and Install Node.js** (v20 LTS)
   - Skips if Node.js >= v20 is already installed
   - Uses NodeSource repository for installation

4. **Check and Install PostgreSQL**
   - Skips if already installed
   - Starts and enables the service

5. **Setup Database**
   - Creates database: `calendar`
   - Creates user: `calendar_user` with password `calendar_pass`
   - Grants necessary privileges
   - Skips if already exists

6. **Check and Install pnpm**
   - Skips if already installed
   - Required package manager for this project

7. **Setup Environment Variables**
   - Creates `.env` file with database connection
   - Preserves existing configuration if present
   - Sets PORT to available port (5002 or higher)
   - Sets secure file permissions (600)

8. **Install Dependencies**
   - Runs `pnpm install`
   - Uses frozen lockfile if dependencies exist

9. **Run Database Migrations**
   - Executes Drizzle ORM migrations
   - Creates/updates database schema

10. **Build Application**
    - Always cleans build cache (.next) to prevent stale schema issues
    - Creates persistent storage directory at `/var/calendar-events/posters`
    - Sets proper ownership and permissions
    - Runs Next.js production build

11. **Setup Systemd Service**
    - Creates robust service configuration
    - Enables auto-start on system boot
    - Configures automatic restart on failure
    - Sets POSTERS_STORAGE_PATH environment variable
    - Sets resource limits and security hardening

12. **Start/Restart Application**
    - Starts the service if not running
    - Restarts if already running
    - Verifies successful startup with retries

## Requirements

- **OS**: Ubuntu/Debian-based Linux distribution
- **Privileges**: Root access (use `sudo`)
- **Network**: Internet connection (for package installation)
- **Ports**: Port 5002 (default) - script will auto-increment if occupied

## Manual Installation Steps

If you prefer to run steps manually:

### 1. Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs
```

### 2. Install PostgreSQL

```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3. Setup Database

```bash
sudo -u postgres psql << EOF
CREATE DATABASE calendar;
CREATE USER calendar_user WITH PASSWORD 'calendar_pass';
GRANT ALL PRIVILEGES ON DATABASE calendar TO calendar_user;
\c calendar
GRANT ALL ON SCHEMA public TO calendar_user;
EOF
```

### 4. Install pnpm

```bash
sudo npm install -g pnpm
```

### 5. Setup Environment

Create `.env` file:

```bash
cat > .env << 'EOF'
DATABASE_URL=postgresql://calendar_user:calendar_pass@localhost:5432/calendar
PGDATABASE_URL=postgresql://calendar_user:calendar_pass@localhost:5432/calendar
PORT=5002
NODE_ENV=production
EOF
```

### 6. Install Dependencies

```bash
pnpm install
```

### 7. Run Migrations

```bash
pnpm exec drizzle-kit push
```

### 8. Build Application

```bash
# Create persistent storage directory
sudo mkdir -p /var/calendar-events/posters
sudo chown -R $USER:$USER /var/calendar-events/posters
sudo chmod -R 755 /var/calendar-events/posters

# Clean build cache and build
rm -rf .next
pnpm run build
```

### 9. Start Application

```bash
pnpm start
# Or use the systemd service created by deploy.sh
```

## Managing the Service

After deployment, use these commands to manage the application:

### Check Status
```bash
sudo systemctl status calendar-events
```

### View Logs (Live)
```bash
sudo journalctl -u calendar-events -f
```

### View Recent Logs
```bash
sudo journalctl -u calendar-events -n 100
```

### Restart Service
```bash
sudo systemctl restart calendar-events
```

### Stop Service
```bash
sudo systemctl stop calendar-events
```

### Start Service
```bash
sudo systemctl start calendar-events
```

### Disable Auto-Start
```bash
sudo systemctl disable calendar-events
```

### Re-enable Auto-Start
```bash
sudo systemctl enable calendar-events
```

## Accessing the Application

Once deployed, the application will be available at:

```
http://localhost:5002
```

Or from other machines (replace with your server IP):

```
http://YOUR_SERVER_IP:5002
```

**Note**: If port 5002 was already in use during deployment, the script automatically increments to the next available port (5003, 5004, etc.). Check the deployment output or `.env` file for the actual port used.

## Configuration

### Change Database Credentials

1. Edit `.env` file
2. Update the database settings in PostgreSQL
3. Restart the service

### Change Port

1. Edit `.env` file and update `PORT`
2. Restart the service: `sudo systemctl restart calendar-events`

### Environment Variables

The `.env` file supports these variables:

```bash
# Required
DATABASE_URL=postgresql://user:pass@host:port/database
PGDATABASE_URL=postgresql://user:pass@host:port/database

# Optional
PORT=5002
NODE_ENV=production

# Storage Configuration
POSTERS_STORAGE_PATH=/var/calendar-events/posters  # Default if not set

# DingTalk Integration (Optional)
DINGTALK_APP_ID=your_app_id
DINGTALK_AGENT_ID=your_agent_id
DINGTALK_CLIENT_ID=your_client_id
DINGTALK_CLIENT_SECRET=your_client_secret
DINGTALK_CORP_ID=your_corp_id
```

## Troubleshooting

### Service Won't Start

Check the logs:
```bash
sudo journalctl -u calendar-events -n 50
```

Common issues:
- Port already in use (script auto-increments, check .env for actual port)
- Database connection failed
- Missing environment variables
- Build errors
- Storage directory permission issues

### Database Connection Errors

Verify PostgreSQL is running:
```bash
sudo systemctl status postgresql
```

Test database connection:
```bash
psql -U calendar_user -d calendar -h localhost
```

### Port Already in Use

The deployment script automatically handles this by incrementing to the next available port. If you need to manually change the port:

1. Find what's using the port:
```bash
sudo lsof -i :5002
```

2. Update `.env`:
```bash
PORT=5003
```

3. Update systemd service:
```bash
sudo nano /etc/systemd/system/calendar-events.service
# Change the PORT environment variable
sudo systemctl daemon-reload
sudo systemctl restart calendar-events
```

### Permission Errors

Ensure correct file ownership:
```bash
sudo chown -R $USER:$USER /home/carter/calendar
```

### Storage Directory Issues

If file uploads fail, check storage directory permissions:
```bash
# Check if directory exists
ls -la /var/calendar-events/posters

# Fix permissions if needed
sudo mkdir -p /var/calendar-events/posters
sudo chown -R $USER:$USER /var/calendar-events/posters
sudo chmod -R 755 /var/calendar-events/posters
```

### Troubleshooting Script

For comprehensive diagnostics, run:
```bash
sudo ./troubleshoot.sh
```

This script (if available) will check:
- Service status
- Port availability
- Database connectivity
- File permissions
- Recent logs

## Security Considerations

### Production Deployment

For production environments, consider:

1. **Change Database Password**
   ```sql
   ALTER USER calendar_user WITH PASSWORD 'strong_random_password';
   ```

2. **Use Environment Secrets**
   - Don't commit `.env` to version control
   - Use secret management systems (Vault, AWS Secrets Manager, etc.)

3. **Setup Firewall**
   ```bash
   # Replace 5002 with your actual port from .env
   sudo ufw allow 5002/tcp
   sudo ufw enable
   ```

4. **Setup Reverse Proxy (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           # Update port to match your .env PORT value
           proxy_pass http://localhost:5002;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Setup SSL Certificate (Let's Encrypt)**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

6. **Enable PostgreSQL Authentication**
   - Configure `pg_hba.conf` for network security
   - Restrict connections to localhost or specific IPs

7. **Monitor Resources**
   - The systemd service has a 2GB memory limit
   - Adjust in `/etc/systemd/system/calendar-events.service` if needed

## Updating the Application

To update to a new version:

```bash
# Pull latest code
git pull origin main

# Re-run deployment script
sudo ./deploy.sh
```

The script will:
- Skip already-installed dependencies
- Update Node packages if needed
- Run new migrations
- Rebuild the application
- Restart the service

## Backup and Recovery

### Backup Database

```bash
# Create backup
sudo -u postgres pg_dump calendar > calendar_backup_$(date +%Y%m%d).sql

# Restore backup
sudo -u postgres psql calendar < calendar_backup_20250204.sql
```

### Backup Uploaded Files

```bash
# Backup posters directory (persistent storage location)
sudo tar -czf posters_backup_$(date +%Y%m%d).tar.gz /var/calendar-events/posters/

# Or if using custom POSTERS_STORAGE_PATH, check your .env file
```

### Automated Backups

Create a daily backup cron job:

```bash
sudo crontab -e
```

Add:
```
0 2 * * * sudo -u postgres pg_dump calendar > /backups/calendar_$(date +\%Y\%m\%d).sql
0 3 * * * find /backups -name "calendar_*.sql" -mtime +30 -delete
```

## Performance Tuning

### PostgreSQL

Edit `/etc/postgresql/*/main/postgresql.conf`:

```conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
max_connections = 100
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### Node.js

Adjust memory limits in systemd service:
```bash
sudo nano /etc/systemd/system/calendar-events.service
```

Change:
```ini
MemoryMax=4G  # Increase if needed
```

Reload and restart:
```bash
sudo systemctl daemon-reload
sudo systemctl restart calendar-events
```

## File Storage Architecture

### Persistent Storage Location

Uploaded event posters are stored in `/var/calendar-events/posters` (not in the project's `public/` directory). This design ensures:

- **Deployment Safety**: Files persist across deployments and rebuilds
- **Clean Separation**: User data separated from application code
- **Easy Backups**: Single directory to backup for all uploaded content

### Custom Storage Path

Override the default storage location using environment variable:

```bash
# In .env or systemd service file
POSTERS_STORAGE_PATH=/custom/path/to/posters
```

**Note**: If you change this path:
1. Create the directory: `sudo mkdir -p /custom/path/to/posters`
2. Set permissions: `sudo chown -R $USER:$USER /custom/path/to/posters`
3. Update systemd service if needed
4. Restart the service

### Migrating from Old Storage Location

If upgrading from a version that used `public/posters`:

```bash
# Copy existing files to new location
sudo mkdir -p /var/calendar-events/posters
sudo cp -r public/posters/* /var/calendar-events/posters/
sudo chown -R $USER:$USER /var/calendar-events/posters
sudo chmod -R 755 /var/calendar-events/posters

# Re-run deployment
sudo ./deploy.sh
```

## Support

For issues or questions:
- Check logs: `sudo journalctl -u calendar-events -f`
- Review this documentation
- Run diagnostics: `sudo ./troubleshoot.sh` (if available)
- Check Next.js documentation: https://nextjs.org/docs
- Check Drizzle ORM documentation: https://orm.drizzle.team/

## License

See project LICENSE file for details.
