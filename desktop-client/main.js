const { app, BrowserWindow, globalShortcut, Tray, Menu, ipcMain, shell } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;
let isRecording = false;

// 1. Add auto-updater support in main.js
const { autoUpdater } = require('electron-updater');

// Configure auto-updater
autoUpdater.checkForUpdatesAndNotify();

// 2. Add error reporting
const { crashReporter } = require('electron');
crashReporter.start({
  submitURL: 'https://your-error-reporting-url.com',
  productName: 'SyncVoice Medical Desktop',
  uploadToServer: true
});

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
        height: 600,
        minWidth: 350,
        minHeight: 500,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        show: false,
        frame: true,
        resizable: true,
        title: 'SyncVoice Medical Desktop'
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
    tray = new Tray(path.join(__dirname, 'assets', 'tray-icon.png'));
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show SyncVoice Medical',
            click: () => {
                mainWindow.show();
            }
        },
        {
            label: 'Start Recording (Ctrl+Shift+D)',
            click: () => {
                if (!isRecording) {
                    mainWindow.webContents.send('start-recording-from-tray');
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Settings',
            click: () => {
                mainWindow.show();
                mainWindow.webContents.send('show-settings');
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
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });
}

app.whenReady().then(() => {
    createWindow();
    createTray();

    // Register global shortcut
    const ret = globalShortcut.register('CommandOrControl+Shift+D', () => {
        console.log('Global shortcut triggered');
        
        if (isRecording) {
            mainWindow.webContents.send('stop-recording-global');
            isRecording = false;
        } else {
            mainWindow.webContents.send('start-recording-global');
            isRecording = true;
        }
    });

    if (!ret) {
        console.log('Global shortcut registration failed');
    }

    // Alternative shortcuts for different preferences
    globalShortcut.register('F4', () => {
        if (!isRecording) {
            mainWindow.webContents.send('start-recording-global');
            isRecording = true;
        }
    });
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
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
    isRecording = true;
    if (tray) {
        tray.setImage(path.join(__dirname, 'assets', 'tray-icon-recording.png'));
    }
});

ipcMain.on('recording-stopped', () => {
    isRecording = false;
    if (tray) {
        tray.setImage(path.join(__dirname, 'assets', 'tray-icon.png'));
    }
});

ipcMain.on('insert-text', (event, text) => {
    // This will be handled by the renderer process
    mainWindow.webContents.send('perform-text-insertion', text);
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