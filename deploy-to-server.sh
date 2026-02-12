#!/bin/bash

###############################################################################
# Local to Remote Deployment Script
#
# This script:
# 1. Commits changes to git with provided message
# 2. Pushes to remote repository
# 3. SSH to production server and deploys
#
# Usage: ./deploy-to-server.sh "your commit message"
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REMOTE_USER="ubuntu"
REMOTE_HOST="10.101.1.253"
REMOTE_PROJECT_DIR="/home/ubuntu/git/calendar"
SUDO_PASSWORD="1"

# Log functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if commit message is provided
if [ -z "$1" ]; then
    log_error "Please provide a commit message"
    echo "Usage: ./deploy-to-server.sh \"your commit message\""
    exit 1
fi

COMMIT_MSG="$1"

log_info "=========================================="
log_info "Starting Deployment to Production"
log_info "=========================================="
echo ""

###############################################################################
# Step 1: Git Status Check
###############################################################################
log_info "Step 1: Checking git status..."

# Check if there are changes to commit
if git diff --quiet && git diff --cached --quiet; then
    log_warning "No changes detected to commit"
    read -p "Continue with deployment anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled"
        exit 0
    fi
else
    log_success "Changes detected"
    git status --short
    echo ""
fi

###############################################################################
# Step 2: Git Commit
###############################################################################
log_info "Step 2: Committing changes..."

git add .
if git commit -m "$COMMIT_MSG"; then
    log_success "Changes committed successfully"
else
    log_info "No changes to commit or commit failed"
fi
echo ""

###############################################################################
# Step 3: Git Push
###############################################################################
log_info "Step 3: Pushing to remote repository..."

if git push; then
    log_success "Pushed to remote repository"
else
    log_error "Failed to push to remote repository"
    exit 1
fi
echo ""

###############################################################################
# Step 4: Deploy to Remote Server
###############################################################################
log_info "Step 4: Deploying to production server ($REMOTE_HOST)..."
echo ""

# SSH to remote server and deploy
# Using heredoc to avoid issues with special characters in password
ssh -t ${REMOTE_USER}@${REMOTE_HOST} << EOF
set -e

echo "=== Connected to production server ==="
echo ""

echo "Navigating to project directory..."
cd ${REMOTE_PROJECT_DIR}

echo "Pulling latest changes..."
git pull

echo ""
echo "=== Starting deployment script ==="
echo ""

# Run deployment script with sudo password
echo "${SUDO_PASSWORD}" | sudo -S ./deploy.sh

echo ""
echo "=== Deployment complete ==="
EOF

DEPLOY_EXIT_CODE=$?

echo ""

if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
    log_success "=========================================="
    log_success "Deployment Completed Successfully!"
    log_success "=========================================="
    echo ""
    log_info "Your changes have been deployed to production"
    log_info "Server: ${REMOTE_HOST}"
else
    log_error "=========================================="
    log_error "Deployment Failed!"
    log_error "=========================================="
    echo ""
    log_info "Please check the error messages above"
    log_info "You may need to SSH to the server and check logs:"
    echo "  ssh ${REMOTE_USER}@${REMOTE_HOST}"
    echo "  cd ${REMOTE_PROJECT_DIR}"
    echo "  sudo journalctl -u calendar-events -n 50"
    exit 1
fi
