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
// REMOVED: let isRecording = false; - Let renderer handle state

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
            webSecurity: true,
            allowRunningInsecureContent: false,
            experimentalFeatures: true,
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
        null
    ];
    
    for (const iconPath of iconPaths) {
        if (iconPath === null) {
            try {
                const { nativeImage } = require('electron');
                const emptyImage = nativeImage.createEmpty();
                tray = new Tray(emptyImage);
                console.log('⚠️ Using empty tray icon (no icon files found)');
                break;
            } catch (error) {
                console.error('❌ Failed to create tray with empty icon:', error);
                return;
            }
        }
        
        try {
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
                if (mainWindow) {
                    mainWindow.webContents.send('toggle-recording-from-tray');
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
        
        // Update tooltip
        const tooltip = recording 
            ? 'SyncVoice Medical - Recording...' 
            : 'SyncVoice Medical - Press Ctrl+Shift+D to start';
        tray.setToolTip(tooltip);
        
        console.log(`🔄 Tray updated for recording: ${recording}`);
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
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('show-notification-from-main', { title, message });
    }
}

// App ready event
app.whenReady().then(() => {
    setupContentSecurityPolicy();
    
    createWindow();
    createTray();

    // Global shortcut registration
    console.log('🎯 Starting global shortcut registration...');
    
    // Clear any existing shortcuts first
    globalShortcut.unregisterAll();
    
    // Wait for window to be fully ready before registering shortcuts
    mainWindow.webContents.once('did-finish-load', () => {
        console.log('📱 Window loaded, now registering shortcuts...');
        
        // Try multiple shortcut options
        const shortcuts = [
            { key: 'CommandOrControl+Shift+D', name: 'Ctrl+Shift+D' },
            { key: 'F9', name: 'F9' },  // Less commonly used
            { key: 'CommandOrControl+Shift+R', name: 'Ctrl+Shift+R' },  // Alternative
            { key: 'Alt+R', name: 'Alt+R' }  // Simple alternative
        ];
        
        let registeredShortcut = null;
        
        for (const shortcut of shortcuts) {
            try {
                console.log(`🔧 Attempting to register ${shortcut.name}...`);
                
                // Check if already registered
                if (globalShortcut.isRegistered(shortcut.key)) {
                    console.log(`⚠️ ${shortcut.name} already registered by another app`);
                    continue;
                }
                
                // Register the shortcut - FIXED: Always send toggle signal
                const success = globalShortcut.register(shortcut.key, () => {
                    console.log(`🎤 SHORTCUT TRIGGERED: ${shortcut.name}`);
                    
                    if (!mainWindow || mainWindow.isDestroyed()) {
                        console.error('❌ Main window not available');
                        return;
                    }
                    
                    try {
                        // FIXED: Always send toggle signal, let renderer handle state
                        console.log('📡 Sending toggle-recording signal to renderer');
                        mainWindow.webContents.send('toggle-recording-global');
                        
                        // Visual feedback
                        mainWindow.flashFrame(true);
                        setTimeout(() => {
                            if (mainWindow && !mainWindow.isDestroyed()) {
                                mainWindow.flashFrame(false);
                            }
                        }, 500);
                        
                    } catch (error) {
                        console.error('❌ Error sending recording signal:', error);
                    }
                });

                if (success) {
                    console.log(`✅ SUCCESS: ${shortcut.name} registered!`);
                    registeredShortcut = shortcut;
                    
                    // Verify registration
                    const verified = globalShortcut.isRegistered(shortcut.key);
                    console.log(`🔍 Verification: ${verified ? 'CONFIRMED' : 'FAILED'}`);
                    
                    if (verified) {
                        // Update UI with active shortcut
                        mainWindow.webContents.executeJavaScript(`
                            console.log('🎯 Global shortcut registered: ${shortcut.name}');
                            const statusEl = document.getElementById('recordingStatus');
                            if (statusEl && !statusEl.classList.contains('active')) {
                                statusEl.textContent = 'Press ${shortcut.name} to start dictation';
                            }
                            const hintEl = document.querySelector('.shortcut-hint');
                            if (hintEl) {
                                hintEl.innerHTML = '<strong>Global Shortcut Active:</strong><br><span class="shortcut-key">${shortcut.name}</span> Start/Stop dictation';
                            }
                        `).catch(e => console.warn('UI update failed:', e));
                        
                        break; // Stop trying other shortcuts
                    }
                }
            } catch (error) {
                console.error(`❌ Error registering ${shortcut.name}:`, error);
            }
        }

        // Handle registration failure
        if (!registeredShortcut) {
            console.error('❌ No global shortcuts could be registered!');
            
            // Show manual recording button
            mainWindow.webContents.executeJavaScript(`
                console.error('❌ Global shortcuts unavailable');
                const recordingSection = document.querySelector('.recording-section');
                if (recordingSection && !document.getElementById('manualRecordBtn')) {
                    const btn = document.createElement('button');
                    btn.id = 'manualRecordBtn';
                    btn.className = 'connect-btn';
                    btn.style.marginTop = '1rem';
                    btn.textContent = '🎤 Start Recording';
                    btn.onclick = () => {
                        window.testShortcut(); // Use the debug function
                    };
                    recordingSection.appendChild(btn);
                }
                const statusEl = document.getElementById('recordingStatus');
                if (statusEl) {
                    statusEl.textContent = '⚠️ Use the button below to record';
                    statusEl.style.color = '#dc3545';
                }
            `).catch(e => console.warn('Manual button creation failed:', e));
        } else {
            console.log(`🎉 Global shortcut ${registeredShortcut.name} is ready!`);
            
            // Periodic verification
            setInterval(() => {
                if (registeredShortcut && !globalShortcut.isRegistered(registeredShortcut.key)) {
                    console.error('❌ Shortcut was unregistered!');
                    // Try to re-register
                    app.relaunch();
                    app.quit();
                }
            }, 30000); // Check every 30 seconds
        }
    });
});

app.on('will-quit', () => {
    console.log('🚫 Unregistering all global shortcuts...');
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

// IPC handlers - Fixed to work with renderer state
ipcMain.on('recording-started', () => {
    console.log('📹 Recording started (confirmed by renderer)');
    updateTrayForRecording(true);
});

ipcMain.on('recording-stopped', () => {
    console.log('⏹️ Recording stopped (confirmed by renderer)');
    updateTrayForRecording(false);
});

// Debug helper
ipcMain.on('test-shortcut-from-renderer', () => {
    console.log('🧪 Test shortcut triggered');
    if (mainWindow) {
        mainWindow.webContents.send('toggle-recording-global');
    }
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

ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url);
});

ipcMain.on('minimize-to-tray', () => {
    mainWindow.hide();
});

ipcMain.on('set-auto-start', (event, enable) => {
    app.setLoginItemSettings({
        openAtLogin: enable,
        path: app.getPath('exe')
    });
});

ipcMain.on('show-notification', (event, notificationData) => {
    const { Notification } = require('electron');
    
    if (Notification.isSupported()) {
        const notification = new Notification({
            title: notificationData.title || 'SyncVoice Medical',
            body: notificationData.body || notificationData.message || 'Notification',
            icon: path.join(__dirname, 'assets', 'icon.png'),
            sound: true,
            timeoutType: 'default'
        });
        
        notification.show();
        console.log('Notification shown:', notificationData.title);
    } else {
        console.log('Notifications not supported on this system');
    }
});

ipcMain.on('flash-window', () => {
    if (mainWindow) {
        try {
            mainWindow.flashFrame(true);
            
            if (!mainWindow.isVisible()) {
                mainWindow.show();
            }
            
            mainWindow.focus();
            setTimeout(() => {
                mainWindow.blur();
            }, 500);
            
            console.log('Window flashed for user attention');
        } catch (error) {
            console.error('Error flashing window:', error);
        }
    }
});

ipcMain.handle('write-to-clipboard', (event, text) => {
    try {
        clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Clipboard error:', error);
        return false;
    }
});

ipcMain.on('play-system-sound', (event, soundType) => {
    shell.beep();
});

// PowerShell automation for text insertion
ipcMain.on('insert-text-automated', (event, text) => {
    console.log('🔧 Text insertion requested:', text.substring(0, 50) + '...');
    
    if (process.platform !== 'win32') {
        console.error('❌ PowerShell automation only available on Windows');
        
        if (mainWindow) {
            mainWindow.webContents.send('text-insertion-result', { 
                success: false, 
                message: 'PowerShell automation only available on Windows' 
            });
        }
        return;
    }
    
    try {
        const { spawn } = require('child_process');
        
        const escapedText = text
            .replace(/'/g, "''")
            .replace(/"/g, '""')
            .replace(/\r?\n/g, ' ')
            .replace(/\\/g, '\\\\')
            .replace(/\$/g, '`$')
            .replace(/`/g, '``');
        
        const chunkSize = 50;
        const chunks = [];
        for (let i = 0; i < escapedText.length; i += chunkSize) {
            chunks.push(escapedText.slice(i, i + chunkSize));
        }
        
        const psScript = `
            Add-Type -AssemblyName System.Windows.Forms
            Start-Sleep -Milliseconds 500
            ${chunks.map((chunk, index) => `
            [System.Windows.Forms.SendKeys]::SendWait('${chunk}')
            Start-Sleep -Milliseconds 50
            `).join('')}
            Write-Output "Text insertion completed"
        `;
        
        console.log('⌨️ Executing PowerShell automation...');
        
        const ps = spawn('powershell.exe', [
            '-NoProfile', 
            '-ExecutionPolicy', 'Bypass',
            '-Command', psScript
        ], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let output = '';
        let errorOutput = '';
        
        ps.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        ps.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        
        ps.on('close', (code) => {
            if (code === 0) {
                console.log('✅ PowerShell automation completed');
                console.log('Output:', output.trim());
                
                if (mainWindow) {
                    mainWindow.webContents.send('text-insertion-result', { 
                        success: true, 
                        message: 'Text inserted successfully' 
                    });
                }
            } else {
                console.error('❌ PowerShell automation failed:', code);
                console.error('Error:', errorOutput);
                
                if (mainWindow) {
                    mainWindow.webContents.send('text-insertion-result', { 
                        success: false, 
                        message: `PowerShell failed: ${errorOutput}` 
                    });
                }
            }
        });
        
        ps.on('error', (error) => {
            console.error('❌ PowerShell spawn error:', error);
            
            if (mainWindow) {
                mainWindow.webContents.send('text-insertion-result', { 
                    success: false, 
                    message: `PowerShell error: ${error.message}` 
                });
            }
        });
        
    } catch (error) {
        console.error('❌ Text insertion failed:', error);
        
        if (mainWindow) {
            mainWindow.webContents.send('text-insertion-result', { 
                success: false, 
                message: error.message 
            });
        }
    }
});