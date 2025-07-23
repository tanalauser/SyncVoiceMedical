const { app, BrowserWindow, globalShortcut, Tray, Menu, ipcMain, shell, clipboard, session, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// Enable features required for Web Speech API - AFTER the imports!
app.commandLine.appendSwitch('enable-speech-input');
app.commandLine.appendSwitch('enable-speech-synthesis');
app.commandLine.appendSwitch('enable-web-speech');
app.commandLine.appendSwitch('enable-media-stream');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');

let mainWindow = null;
let tray = null;
let overlayWindow = null;
let isRecording = false;


function setupContentSecurityPolicy() {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self'; " +
                    "script-src 'self' 'unsafe-inline'; " +
                    "style-src 'self' 'unsafe-inline'; " +
                    "connect-src 'self' ws: wss: https:; " +
                    "media-src 'self' blob: mediastream:; " +
                    "img-src 'self' data: blob:; " +
                    "font-src 'self'; " +
                    "object-src 'none'; " +
                    "base-uri 'self';"
                ]
            }
        });
    });
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 400,
        height: 650,
        minWidth: 350,
        minHeight: 500,
        webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, 'preload.js'),
    webSecurity: true,  // ← CHANGED to true for Web Speech API
    allowRunningInsecureContent: false,
    experimentalFeatures: true,
    // Add these for Web Speech API
    webviewTag: true,
    javascript: true,
    webgl: true,
    plugins: true
},
        icon: path.join(__dirname, 'assets', 'icon.png'),
        show: false,
        frame: true,
        resizable: true,
        title: 'SyncVoice Medical Desktop'
    });

    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    // Auto-approve microphone permissions
    if (permission === 'media' || permission === 'microphone') {
        callback(true);
    } else {
        callback(true); // Approve other permissions too
    }
});

mainWindow.loadFile('index.html');

    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

function createTray() {
    console.log('🔧 Creating system tray...');
    
    // Try different icon paths in order of preference
    const iconPaths = [
        path.join(__dirname, 'assets', 'tray-icon.png'),
        path.join(__dirname, 'assets', 'icon.png'),
        path.join(__dirname, 'icon.png'),
        // Fallback to a simple built-in icon if none exist
        null
    ];
    
    let trayIcon = null;
    
    for (const iconPath of iconPaths) {
        if (iconPath === null) {
            // Create a simple tray without custom icon
            try {
                // Use nativeImage to create a simple colored square as fallback
                const { nativeImage } = require('electron');
                const emptyImage = nativeImage.createEmpty();
                tray = new Tray(emptyImage);
                console.log('⚠️ Using empty tray icon (no icon files found)');
                break;
            } catch (error) {
                console.error('❌ Failed to create tray with empty icon:', error);
                return; // Give up on tray creation
            }
        }
        
        try {
            // Check if file exists
            const fs = require('fs');
            if (fs.existsSync(iconPath)) {
                tray = new Tray(iconPath);
                console.log('✅ Tray created with icon:', iconPath);
                break;
            } else {
                console.log('⚠️ Icon not found:', iconPath);
            }
        } catch (error) {
            console.log('⚠️ Failed to load icon:', iconPath, error.message);
            continue;
        }
    }
    
    if (!tray) {
        console.error('❌ Failed to create system tray');
        return;
    }
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show SyncVoice Medical',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                }
            }
        },
        {
            label: 'Start Recording (Ctrl+Shift+D)',
            click: () => {
                if (!isRecording && mainWindow) {
                    mainWindow.webContents.send('start-recording-from-tray');
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Settings',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.webContents.send('show-settings');
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('SyncVoice Medical - Press Ctrl+Shift+D to start dictation');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        if (mainWindow) {
            mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
        }
    });
    
    console.log('✅ System tray created successfully');
}

// ALSO add this function to safely handle recording tray updates
function updateTrayForRecording(recording) {
    if (!tray) return;
    
    try {
        const iconPaths = recording ? [
            path.join(__dirname, 'assets', 'tray-icon-recording.png'),
            path.join(__dirname, 'assets', 'icon.png')
        ] : [
            path.join(__dirname, 'assets', 'tray-icon.png'),
            path.join(__dirname, 'assets', 'icon.png')
        ];
        
        // Try to update icon, but don't crash if it fails
        for (const iconPath of iconPaths) {
            try {
                const fs = require('fs');
                if (fs.existsSync(iconPath)) {
                    tray.setImage(iconPath);
                    break;
                }
            } catch (error) {
                console.log('⚠️ Could not update tray icon:', error.message);
            }
        }
    } catch (error) {
        console.log('⚠️ Tray icon update failed:', error.message);
    }
}

function createRecordingOverlay(state = 'ready', data = {}) {
    if (overlayWindow) {
        overlayWindow.close();
        overlayWindow = null;
    }
    
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    
    overlayWindow = new BrowserWindow({
        width: 150,
        height: 80,
        x: width - 170,
        y: 20,
        frame: false,
        alwaysOnTop: true,
        transparent: true,
        resizable: false,
        movable: false,
        focusable: false,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            backgroundThrottling: false
        }
    });
    
    // Build URL with parameters
    let url = `file://${path.join(__dirname, 'recording-overlay.html')}?state=${state}`;
    if (data.count) {
        url += `&count=${data.count}`;
    }
    
    overlayWindow.loadURL(url);
    overlayWindow.setIgnoreMouseEvents(true);
    
    overlayWindow.on('closed', () => {
        overlayWindow = null;
    });
    
    return overlayWindow;
}

function showOverlay(state, data = {}) {
    if (!overlayWindow) {
        createRecordingOverlay(state, data);
    } else {
        overlayWindow.webContents.postMessage('update-state', { type: state, ...data });
    }
}

function hideOverlay() {
    if (overlayWindow) {
        overlayWindow.webContents.postMessage('update-state', { type: 'hide' });
        setTimeout(() => {
            if (overlayWindow) {
                overlayWindow.close();
                overlayWindow = null;
            }
        }, 400);
    }
}

function showNotification(title, message) {
    console.log(`Notification: ${title} - ${message}`);
    // Send to renderer process instead of showing in main process
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('show-notification-from-main', { title, message });
    }
}

// App ready event
// Replace the global shortcut registration section in your app.whenReady() with this:

app.whenReady().then(() => {
    // Setup CSP FIRST
    setupContentSecurityPolicy();
    
    createWindow();
    createTray();

    console.log('🔧 Setting up global shortcuts...');

    // Try different shortcut combinations if the primary ones fail
    const shortcuts = [
        { key: 'CommandOrControl+Shift+D', name: 'Ctrl+Shift+D' },
        { key: 'CommandOrControl+Alt+D', name: 'Ctrl+Alt+D' },
        { key: 'CommandOrControl+Shift+R', name: 'Ctrl+Shift+R' },
        { key: 'F4', name: 'F4' },
        { key: 'F6', name: 'F6' }
    ];

    let registeredShortcut = null;

    // Try to register shortcuts in order of preference
    for (const shortcut of shortcuts) {
        try {
            const ret = globalShortcut.register(shortcut.key, () => {
                console.log(`🎯 Global shortcut ${shortcut.name} triggered!`);
                console.log('🎤 Current recording state:', isRecording);
                
                if (!mainWindow || !mainWindow.webContents) {
                    console.error('Main window not available');
                    return;
                }
                
                if (isRecording) {
                    console.log('⏹️ Sending stop-recording-global message');
                    mainWindow.webContents.send('stop-recording-global');
                    isRecording = false;
                } else {
                    console.log('▶️ Sending start-recording-global message');
                    mainWindow.webContents.send('start-recording-global');
                    isRecording = true;
                }
            });

            if (ret) {
                console.log(`✅ ${shortcut.name} shortcut registered successfully`);
                registeredShortcut = shortcut;
                
                // Update the UI to show which shortcut is active
                mainWindow.webContents.executeJavaScript(`
                    const statusEl = document.getElementById('recordingStatus');
                    if (statusEl) {
                        statusEl.textContent = 'Press ${shortcut.name} to start dictation';
                    }
                    const hintEl = document.querySelector('.shortcut-hint');
                    if (hintEl) {
                        hintEl.innerHTML = '<strong>Global Shortcut Active:</strong><br><span class="shortcut-key">${shortcut.name}</span> Start/Stop dictation';
                    }
                `);
                
                break; // Stop trying other shortcuts once one succeeds
            } else {
                console.warn(`⚠️ Failed to register ${shortcut.name} shortcut - trying next option...`);
            }
        } catch (error) {
            console.error(`Error registering ${shortcut.name}:`, error);
        }
    }

    if (!registeredShortcut) {
        console.error('❌ Failed to register any global shortcuts!');
        console.log('Possible reasons:');
        console.log('- Another application is using these shortcuts');
        console.log('- The app needs to be run as administrator');
        console.log('- Antivirus software is blocking keyboard hooks');
        
        // Show warning in the UI
        mainWindow.webContents.once('did-finish-load', () => {
            mainWindow.webContents.executeJavaScript(`
                const statusEl = document.getElementById('recordingStatus');
                if (statusEl) {
                    statusEl.textContent = '⚠️ Global shortcuts unavailable - Click here to record';
                    statusEl.style.cursor = 'pointer';
                    statusEl.onclick = () => {
                        if (!window.isRecording) {
                            window.electronAPI.sendRecordingStarted();
                        } else {
                            window.electronAPI.sendRecordingStopped();
                        }
                    };
                }
            `);
        });
    }

    // Test if shortcuts are actually registered
    console.log('📋 Registered shortcuts:', shortcuts.filter(s => globalShortcut.isRegistered(s.key)).map(s => s.name).join(', '));
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    if (overlayWindow) {
        overlayWindow.close();
        overlayWindow = null;
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC handlers
ipcMain.on('recording-started', () => {
    console.log('📹 Recording started');
    isRecording = true;
    updateTrayForRecording(true);
});

ipcMain.on('recording-stopped', () => {
    console.log('⏹️ Recording stopped');
    isRecording = false;
    updateTrayForRecording(false);
});

ipcMain.on('countdown-started', (event, count) => {
    showOverlay('countdown', { count });
});

ipcMain.on('show-overlay', (event, state, data) => {
    showOverlay(state, data);
});

ipcMain.on('hide-overlay', () => {
    hideOverlay();
});

// Handle text insertion via simulated paste
ipcMain.on('simulate-paste', () => {
    // Since robotjs is removed, just show notification
    console.log('Notification: Text Copied - Please paste with Ctrl+V');
});

ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url);
});

ipcMain.on('minimize-to-tray', () => {
    mainWindow.hide();
});

// Handle auto-start
ipcMain.on('set-auto-start', (event, enable) => {
    app.setLoginItemSettings({
        openAtLogin: enable,
        path: app.getPath('exe')
    });
});

// Handle clipboard writing
ipcMain.handle('write-to-clipboard', (event, text) => {
    try {
        clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Clipboard error:', error);
        return false;
    }
});

// Play system sounds
ipcMain.on('play-system-sound', (event, soundType) => {
    shell.beep(); // Simple system beep
});

// Show notifications
ipcMain.on('show-notification', (event, { title, message }) => {
    showNotification(title, message);
});