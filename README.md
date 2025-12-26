# Graminno - Farm Attendance Management

A bilingual (English/Marathi) farm attendance tracking application with P2P sync support.

## Features

- Track daily attendance for farm workers
- Record activities and work areas
- Bilingual support (English/Marathi)
- P2P sync across devices via Tailscale
- Per-file sync for efficiency
- Works offline with auto-sync when online

## Quick Start (Windows Server Setup)

### Prerequisites

1. **Install Node.js**
   - Download from: https://nodejs.org/ (LTS version)
   - Run installer, accept all defaults
   - Verify: Open Command Prompt and run `node --version`

2. **Install Git**
   - Download from: https://git-scm.com/download/win
   - Run installer, accept all defaults

3. **Install Tailscale** (for remote access)
   - Download from: https://tailscale.com/download/windows
   - Sign in with your account

### Installation

1. Open Command Prompt and run:
   ```cmd
   cd C:\
   git clone https://github.com/YOUR_USERNAME/farm-attendance.git
   cd farm-attendance
   npm install
   ```

2. Start the server:
   ```cmd
   npm run server
   ```

3. The server will show:
   ```
   Server running at: http://localhost:3001
   ```

### Enable Remote Access with Tailscale

1. Open a new Command Prompt as Administrator
2. Run:
   ```cmd
   tailscale funnel 3001
   ```
3. This gives you a URL like: `https://your-laptop.tailnet-name.ts.net`
4. Use this URL in the app on other devices

### Auto-Start on Boot (Optional)

Create a batch file `C:\farm-attendance\start-server.bat`:
```batch
@echo off
cd C:\farm-attendance
node server.js
```

Add to Windows Startup folder.

## Using the App

### On Server Device
- Open browser to: http://localhost:3001

### On Other Devices (iPad, Phone, etc.)
1. Open browser to your Tailscale URL
2. Enter the sync URL on the Home screen
3. Click "Start Session"
4. Changes auto-sync to the server

## Development

```bash
# Install dependencies
npm install

# Run development server (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm run server
```

## Data Storage

Data is stored in the `data/` folder:
- `workers.json` - Worker list
- `areas.json` - Work areas
- `activities.json` - Activity types
- `months/YYYY-MM.json` - Attendance per month

## Backup

Copy the entire `data/` folder to backup your data.
