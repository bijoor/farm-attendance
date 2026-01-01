#!/bin/bash
# ==============================================================================
# Farm Attendance Server Installation Script (macOS/Linux)
# ==============================================================================
#
# This script sets up the Farm Attendance sync server with PM2 for:
# - Auto-restart on crash
# - Auto-restart on system boot
# - Auto-update from GitHub
#
# Usage:
#   chmod +x scripts/install-server.sh
#   ./scripts/install-server.sh
#
# ==============================================================================

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     Farm Attendance Server Installation                    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed."
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✓ Node.js found: $NODE_VERSION"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed."
    exit 1
fi

echo "✓ npm found: $(npm -v)"

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo ""
echo "Project directory: $PROJECT_DIR"
echo ""

# Change to project directory
cd "$PROJECT_DIR"

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2 globally..."
    npm install -g pm2
    echo "✓ PM2 installed"
else
    echo "✓ PM2 already installed: $(pm2 -v)"
fi

# Install project dependencies (including devDependencies for build)
echo ""
echo "Installing project dependencies..."
npm install
echo "✓ Dependencies installed"

# Build the frontend
echo ""
echo "Building frontend..."
npm run build
echo "✓ Frontend built"

# Create data directory if it doesn't exist
mkdir -p data/months
echo "✓ Data directory ready"

# Stop existing PM2 process if running
pm2 stop farm-sync 2>/dev/null || true
pm2 delete farm-sync 2>/dev/null || true

# Start server with PM2
echo ""
echo "Starting server with PM2..."
pm2 start server.js --name farm-sync --time

# Save PM2 process list
pm2 save

# Setup PM2 startup script
echo ""
echo "Setting up auto-start on system boot..."
echo "You may be prompted for your password."
pm2 startup

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     Installation Complete!                                 ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║                                                           ║"
echo "║  Server running at: http://localhost:3001                 ║"
echo "║                                                           ║"
echo "║  Useful commands:                                         ║"
echo "║    pm2 status       - Check server status                 ║"
echo "║    pm2 logs farm-sync - View server logs                  ║"
echo "║    pm2 restart farm-sync - Restart server                 ║"
echo "║    pm2 stop farm-sync - Stop server                       ║"
echo "║                                                           ║"
echo "║  Auto-update:                                             ║"
echo "║    Server will check GitHub every 6 hours                 ║"
echo "║    and auto-update when new version is available          ║"
echo "║                                                           ║"
echo "║  Manual update:                                           ║"
echo "║    curl -X POST http://localhost:3001/api/update          ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
