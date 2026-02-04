# Deployment Guide

This guide explains how to deploy the Calendar Events Management System on a Linux server.

## Quick Start

```bash
sudo ./deploy.sh
```

That's it! The script will handle everything automatically.

## What the Script Does

The `deploy.sh` script is fully idempotent and will:

1. **Check and Install Node.js** (v20 LTS)
   - Skips if Node.js >= v20 is already installed
   - Uses NodeSource repository for installation

2. **Check and Install PostgreSQL**
   - Skips if already installed
   - Starts and enables the service

3. **Setup Database**
   - Creates database: `calendar`
   - Creates user: `calendar_user` with password `calendar_pass`
   - Grants necessary privileges
   - Skips if already exists

4. **Check and Install pnpm**
   - Skips if already installed
   - Required package manager for this project

5. **Setup Environment Variables**
   - Creates `.env` file with database connection
   - Preserves existing configuration if present
   - Sets secure file permissions (600)

6. **Install Dependencies**
   - Runs `pnpm install`
   - Uses frozen lockfile if dependencies exist

7. **Run Database Migrations**
   - Executes Drizzle ORM migrations
   - Creates/updates database schema

8. **Build Application**
   - Runs Next.js production build
   - Skips if recent build exists (< 1 hour old)

9. **Setup Systemd Service**
   - Creates robust service configuration
   - Enables auto-start on system boot
   - Configures automatic restart on failure
   - Sets resource limits and security hardening

10. **Start/Restart Application**
    - Starts the service if not running
    - Restarts if already running
    - Verifies successful startup

## Requirements

- **OS**: Ubuntu/Debian-based Linux distribution
- **Privileges**: Root access (use `sudo`)
- **Network**: Internet connection (for package installation)
- **Ports**: Port 5000 must be available

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
PORT=5000
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
http://localhost:5000
```

Or from other machines (replace with your server IP):

```
http://YOUR_SERVER_IP:5000
```

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
PORT=5000
NODE_ENV=production

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
- Port 5000 already in use
- Database connection failed
- Missing environment variables
- Build errors

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

Find what's using port 5000:
```bash
sudo lsof -i :5000
```

Kill the process or change the port in `.env`:
```bash
PORT=5001
```

### Permission Errors

Ensure correct file ownership:
```bash
sudo chown -R $USER:$USER /home/carter/calendar
```

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
   sudo ufw allow 5000/tcp
   sudo ufw enable
   ```

4. **Setup Reverse Proxy (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:5000;
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
# Backup posters directory
tar -czf posters_backup_$(date +%Y%m%d).tar.gz public/posters/
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

## Support

For issues or questions:
- Check logs: `sudo journalctl -u calendar-events -f`
- Review this documentation
- Check Next.js documentation: https://nextjs.org/docs
- Check Drizzle ORM documentation: https://orm.drizzle.team/

## License

See project LICENSE file for details.
