const { contextBridge, ipcRenderer } = require('electron');
const { clipboard } = require('electron');
const robot = require('robotjs');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Recording controls
    onStartRecordingGlobal: (callback) => ipcRenderer.on('start-recording-global', callback),
    onStopRecordingGlobal: (callback) => ipcRenderer.on('stop-recording-global', callback),
    onStartRecordingFromTray: (callback) => ipcRenderer.on('start-recording-from-tray', callback),
    
    // Status updates
    sendRecordingStarted: () => ipcRenderer.send('recording-started'),
    sendRecordingStopped: () => ipcRenderer.send('recording-stopped'),
    
    // Text insertion
    insertTextAtCursor: (text) => {
        try {
            // Save current clipboard content
            const originalClipboard = clipboard.readText();
            
            // Copy text to clipboard
            clipboard.writeText(text);
            
            // Simulate Ctrl+V (or Cmd+V on Mac)
            const modifier = process.platform === 'darwin' ? 'command' : 'control';
            robot.keyTap('v', modifier);
            
            // Restore original clipboard after a delay
            setTimeout(() => {
                clipboard.writeText(originalClipboard);
            }, 100);
            
            return true;
        } catch (error) {
            console.error('Error inserting text:', error);
            return false;
        }
    },
    
    // Alternative text insertion method (typing)
    typeText: (text) => {
        try {
            robot.typeString(text);
            return true;
        } catch (error) {
            console.error('Error typing text:', error);
            return false;
        }
    },
    
    // System info
    getPlatform: () => process.platform,
    
    // Window controls
    minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),
    
    // External links
    openExternal: (url) => ipcRenderer.send('open-external', url),
    
    // Settings
    setAutoStart: (enable) => ipcRenderer.send('set-auto-start', enable),
    
    // Settings events
    onShowSettings: (callback) => ipcRenderer.on('show-settings', callback),
    
    // Storage (using localStorage in renderer)
    storage: {
        get: (key) => localStorage.getItem(key),
        set: (key, value) => localStorage.setItem(key, value),
        remove: (key) => localStorage.removeItem(key)
    }
});