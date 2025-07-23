#!/bin/bash

echo "SyncVoice Medical Desktop Client"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed or not in PATH."
    echo "Please install Node.js from https://nodejs.org/"
    echo ""
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found."
    echo "Please run this script from the desktop-client directory."
    echo ""
    exit 1
fi

# Check if node_modules exists, if not, install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install dependencies."
        echo ""
        exit 1
    fi
fi

# Check for macOS and inform about permissions
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "macOS detected:"
    echo "- You may need to grant microphone permissions"
    echo "- You may need to grant accessibility permissions for global hotkeys"
    echo "- Check System Preferences > Security & Privacy if prompted"
    echo ""
fi

# Start the application
echo "Starting SyncVoice Medical Desktop..."
echo ""
echo "Press Ctrl+C to stop the application"
echo "Global shortcut: Ctrl+Shift+D (or Cmd+Shift+D on Mac) to start/stop dictation"
echo ""

npm start

if [ $? -ne 0 ]; then
    echo ""
    echo "Error: Application failed to start."
    echo "Please check the console output above for error details."
    echo ""
    exit 1
fi

echo ""
echo "Application has been closed."