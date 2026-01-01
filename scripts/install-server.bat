@echo off
REM ==============================================================================
REM Farm Attendance Server Installation Script (Windows)
REM ==============================================================================
REM
REM This script sets up the Farm Attendance sync server with PM2 for:
REM - Auto-restart on crash
REM - Auto-restart on system boot
REM - Auto-update from GitHub
REM
REM Usage:
REM   Right-click and "Run as Administrator"
REM   OR run from command prompt: scripts\install-server.bat
REM
REM ==============================================================================

echo.
echo ================================================================
echo      Farm Attendance Server Installation
echo ================================================================
echo.

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js found: %NODE_VERSION%

REM Check for npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm is not installed.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [OK] npm found: %NPM_VERSION%

REM Get project directory (parent of scripts folder)
set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%..

echo.
echo Project directory: %PROJECT_DIR%
echo.

REM Change to project directory
cd /d "%PROJECT_DIR%"

REM Install PM2 globally if not installed
where pm2 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing PM2 globally...
    call npm install -g pm2 pm2-windows-startup
    echo [OK] PM2 installed
) else (
    for /f "tokens=*" %%i in ('pm2 -v') do set PM2_VERSION=%%i
    echo [OK] PM2 already installed: %PM2_VERSION%
)

REM Install project dependencies
echo.
echo Installing project dependencies...
call npm install --production
echo [OK] Dependencies installed

REM Build the frontend
echo.
echo Building frontend...
call npm run build
echo [OK] Frontend built

REM Create data directory if it doesn't exist
if not exist "data\months" mkdir "data\months"
echo [OK] Data directory ready

REM Stop existing PM2 process if running
pm2 stop farm-sync 2>nul
pm2 delete farm-sync 2>nul

REM Start server with PM2
echo.
echo Starting server with PM2...
pm2 start server.js --name farm-sync --time

REM Save PM2 process list
pm2 save

REM Setup PM2 Windows startup
echo.
echo Setting up auto-start on Windows boot...
echo NOTE: You may need to run this as Administrator
pm2-startup install 2>nul
pm2 save

echo.
echo ================================================================
echo      Installation Complete!
echo ================================================================
echo.
echo   Server running at: http://localhost:3001
echo.
echo   Useful commands:
echo     pm2 status           - Check server status
echo     pm2 logs farm-sync   - View server logs
echo     pm2 restart farm-sync - Restart server
echo     pm2 stop farm-sync   - Stop server
echo.
echo   Auto-update:
echo     Server will check GitHub every 6 hours
echo     and auto-update when new version is available
echo.
echo   Manual update:
echo     curl -X POST http://localhost:3001/api/update
echo.
echo ================================================================
echo.

pause
