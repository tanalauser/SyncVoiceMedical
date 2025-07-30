const { app, BrowserWindow, globalShortcut, Tray, Menu, ipcMain, shell, clipboard, session, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// Enable features required for Web Speech API - AFTER the imports!
app.commandLine.appendSwitch('enable-speech-input');
app.commandLine.appendSwitch('enable-speech-synthesis');
app.commandLine.appendSwitch('enable-web-speech');
app.commandLine.appendSwitch('enable-media-stream');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
// Additional media permission switches for better compatibility
app.commandLine.appendSwitch('enable-media-stream-audio-source');
app.commandLine.appendSwitch('enable-media-stream-video-source');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('allow-elevated-browser');

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
                    "media-src 'self' blob: mediastream: data:; " +
                    "img-src 'self' data: blob:; " +
                    "font-src 'self'; " +
                    "object-src 'none'; " +
                    "base-uri 'self';"
                ]
            }
        });
    });
}

function setupMediaPermissions() {
    console.log('🎤 Setting up comprehensive media permissions...');
    
    // Set permission request handler for media access
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
        console.log(`🔐 Permission requested: ${permission}`, details);
        
        const allowedPermissions = [
            'media',
            'microphone', 
            'audioCapture',
            'camera',
            'videoCapture',
            'mediaKeySystem',
            'geolocation',
            'notifications',
            'pointerLock',
            'fullscreen'
        ];
        
        if (allowedPermissions.includes(permission)) {
            console.log(`✅ Auto-approving permission: ${permission}`);
            callback(true);
        } else {
            console.log(`❌ Denying permission: ${permission}`);
            callback(false);
        }
    });

    // Set permission check handler (for checking existing permissions)
    session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
        console.log(`🔍 Permission check: ${permission} from ${requestingOrigin}`);
        
        const allowedPermissions = [
            'media',
            'microphone', 
            'audioCapture',
            'camera',
            'videoCapture',
            'mediaKeySystem'
        ];
        
        const result = allowedPermissions.includes(permission);
        console.log(`🔍 Permission check result for ${permission}: ${result}`);
        return result;
    });

    // Handle device permission requests
    session.defaultSession.setDevicePermissionHandler((details) => {
        console.log('🎤 Device permission requested:', details);
        
        // Allow microphone and camera devices
        if (details.deviceType === 'microphone' || details.deviceType === 'camera') {
            console.log(`✅ Allowing ${details.deviceType} device access`);
            return true;
        }
        
        console.log(`❌ Denying device access for: ${details.deviceType}`);
        return false;
    });

    // Additional media stream permission setup
    session.defaultSession.protocol.registerHttpProtocol('media-stream', (request, callback) => {
        console.log('📡 Media stream protocol request:', request.url);
        callback({ path: '' });
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
    console.log('🏗️ Creating main window with enhanced permissions...');
    
    mainWindow = new BrowserWindow({
        width: 400,
        height: 650,
        minWidth: 350,
        minHeight: 500,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false, // Temporarily disable for better media access
            allowRunningInsecureContent: true,
            experimentalFeatures: true,
            webviewTag: true,
            javascript: true,
            webgl: true,
            plugins: true,
            // Enhanced media permissions
            enableRemoteModule: false,
            backgroundThrottling: false,
            additionalArguments: [
                '--enable-media-stream',
                '--enable-speech-input',
                '--allow-running-insecure-content',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        show: false,
        frame: true,
        resizable: true,
        title: 'SyncVoice Medical Desktop'
    });

    // Set window-specific permission handlers
    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback, details) => {
        console.log(`🪟 Window permission requested: ${permission}`, details);
        
        // Always approve media-related permissions for this window
        const mediaPermissions = ['media', 'microphone', 'audioCapture', 'camera', 'videoCapture'];
        
        if (mediaPermissions.includes(permission)) {
            console.log(`✅ Window: Auto-approving media permission: ${permission}`);
            callback(true);
            return;
        }
        
        // Approve other common permissions
        const otherAllowedPermissions = ['notifications', 'fullscreen', 'pointerLock'];
        if (otherAllowedPermissions.includes(permission)) {
            console.log(`✅ Window: Approving permission: ${permission}`);
            callback(true);
        } else {
            console.log(`❌ Window: Denying permission: ${permission}`);
            callback(false);
        }
    });

    // Handle media access errors
    mainWindow.webContents.on('media-started-playing', () => {
        console.log('🎵 Media started playing');
    });

    mainWindow.webContents.on('media-paused', () => {
        console.log('⏸️ Media paused');
    });

    // Log any permission-related console messages
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        if (message.includes('permission') || message.includes('media') || message.includes('microphone')) {
            console.log(`🖥️ Renderer permission log [${level}]:`, message);
        }
    });

    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
        console.log('🎉 Window ready - checking media permissions...');
        mainWindow.show();
        
        // Test media permissions after window loads
        setTimeout(() => {
            testMediaPermissions();
        }, 2000);
    });

    mainWindow.on('close', (event) => {
        // Give user option: minimize to tray or quit completely
        if (!app.isQuitting) {
            event.preventDefault();
            
            // For now, let's just quit the app completely to fix the launch issue
            console.log('🚪 Main window closing - quitting application...');
            app.isQuitting = true;
            
            // Clean up resources
            if (overlayWindow) {
                overlayWindow.close();
                overlayWindow = null;
            }
            
            // Unregister shortcuts
            globalShortcut.unregisterAll();
            
            // Quit the app
            app.quit();
        }
    });
}

function testMediaPermissions() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    
    console.log('🧪 Testing media permissions...');
    
    // Test getUserMedia availability
    mainWindow.webContents.executeJavaScript(`
        (async () => {
            try {
                console.log('🎤 Testing microphone access...');
                
                // Check if getUserMedia is available
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    console.error('❌ getUserMedia not available');
                    return { success: false, error: 'getUserMedia not available' };
                }
                
                // Try to get microphone permission
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: 44100
                    } 
                });
                
                console.log('✅ Microphone access granted!', stream);
                
                // Stop the stream immediately
                stream.getTracks().forEach(track => track.stop());
                
                return { success: true, message: 'Microphone access working' };
                
            } catch (error) {
                console.error('❌ Microphone access failed:', error);
                return { success: false, error: error.message };
            }
        })()
    `).then(result => {
        console.log('🎤 Media permission test result:', result);
        
        if (!result.success) {
            console.error('❌ Media permissions not working:', result.error);
            
            // Show user-friendly error message
            mainWindow.webContents.executeJavaScript(`
                console.warn('⚠️ Microphone access issue detected');
                const statusEl = document.getElementById('recordingStatus');
                if (statusEl && !statusEl.textContent.includes('Recording')) {
                    statusEl.innerHTML = '⚠️ Microphone access blocked. Check antivirus settings.';
                    statusEl.style.color = '#dc3545';
                }
            `).catch(e => console.warn('UI update failed:', e));
        } else {
            console.log('✅ Media permissions working correctly');
        }
    }).catch(error => {
        console.error('❌ Permission test execution failed:', error);
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
            label: 'Test Microphone',
            click: () => {
                testMediaPermissions();
            }
        },
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
    console.log('🚀 App ready - setting up permissions and window...');
    
    setupContentSecurityPolicy();
    setupMediaPermissions(); // Set up comprehensive media permissions
    
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

// Add media permission test IPC handler
ipcMain.on('test-media-permissions', () => {
    console.log('🧪 Manual media permission test requested');
    testMediaPermissions();
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

ipcMain.on('insert-text-clipboard', (event, text) => {
    console.log('📋 Clipboard insertion requested:', text.substring(0, 50) + '...');
    
    try {
        // Copy to clipboard
        clipboard.writeText(text);
        console.log('✅ Text copied to clipboard');
        
        // Try to paste using PowerShell on Windows
        if (process.platform === 'win32') {
            const { exec } = require('child_process');
            
            // PowerShell command to simulate Ctrl+V
            const command = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')"`;
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ PowerShell paste failed:', error);
                    // Fallback: Show notification
                    const { Notification } = require('electron');
                    new Notification({
                        title: 'SyncVoice Medical',
                        body: 'Text copied! Press Ctrl+V to paste.',
                        icon: path.join(__dirname, 'assets', 'icon.png')
                    }).show();
                } else {
                    console.log('✅ Text pasted successfully via PowerShell');
                }
                
                // Send result back
                event.sender.send('text-insertion-result', { 
                    success: !error,
                    method: 'clipboard'
                });
            });
        } else {
            // For Mac/Linux, just notify
            const { Notification } = require('electron');
            new Notification({
                title: 'SyncVoice Medical',
                body: 'Text copied! Press Ctrl+V (or Cmd+V) to paste.',
                icon: path.join(__dirname, 'assets', 'icon.png')
            }).show();
            
            event.sender.send('text-insertion-result', { 
                success: true,
                method: 'clipboard'
            });
        }
        
    } catch (error) {
        console.error('❌ Clipboard insertion error:', error);
        event.sender.send('text-insertion-result', { 
            success: false, 
            error: error.message 
        });
    }
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