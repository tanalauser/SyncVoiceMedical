@echo off
echo SyncVoice Medical Desktop Client
echo ================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist "package.json" (
    echo Error: package.json not found.
    echo Please run this script from the desktop-client directory.
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exists, if not, install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    echo.
    npm install
    if errorlevel 1 (
        echo Error: Failed to install dependencies.
        echo.
        pause
        exit /b 1
    )
)

REM Start the application
echo Starting SyncVoice Medical Desktop...
echo.
echo Press Ctrl+C to stop the application
echo Global shortcut: Ctrl+Shift+D to start/stop dictation
echo.

npm start

if errorlevel 1 (
    echo.
    echo Error: Application failed to start.
    echo Please check the console output above for error details.
    echo.
    pause
    exit /b 1
)

echo.
echo Application has been closed.
pause