@echo off
echo ============================================
echo  Farm Attendance Server - Windows Installer
echo ============================================
echo.

:: Get the directory where this script is located
set INSTALL_DIR=%~dp0
set INSTALL_DIR=%INSTALL_DIR:~0,-1%

echo Install directory: %INSTALL_DIR%
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please download and install from: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js found
node --version

:: Install npm dependencies if needed
if not exist "%INSTALL_DIR%\node_modules" (
    echo.
    echo Installing dependencies...
    cd /d "%INSTALL_DIR%"
    npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo [OK] Dependencies installed
echo.

:: Create the startup batch file
echo Creating startup script...
(
echo @echo off
echo cd /d "%INSTALL_DIR%"
echo node server.js
) > "%INSTALL_DIR%\start-server.bat"

echo [OK] Created start-server.bat
echo.

:: Create shortcut in Startup folder
echo Creating startup shortcut...
set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_PATH=%STARTUP_FOLDER%\FarmAttendanceServer.lnk

:: Use PowerShell to create the shortcut
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%INSTALL_DIR%\start-server.bat'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.WindowStyle = 7; $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo [OK] Startup shortcut created
) else (
    echo [WARNING] Could not create startup shortcut
    echo You can manually add start-server.bat to your Startup folder
)

echo.
echo ============================================
echo  Installation Complete!
echo ============================================
echo.
echo Next steps:
echo.
echo 1. Run Tailscale Funnel (one-time setup, as Administrator):
echo    tailscale funnel --bg 3001
echo.
echo 2. Start the server now:
echo    start-server.bat
echo.
echo 3. Or restart your computer to test auto-start
echo.
echo The server will automatically start when Windows boots.
echo.
pause
