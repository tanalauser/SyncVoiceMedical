const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onStartRecordingGlobal: (callback) => ipcRenderer.on('start-recording-global', callback),
    onStopRecordingGlobal: (callback) => ipcRenderer.on('stop-recording-global', callback),
    onStartRecordingFromTray: (callback) => ipcRenderer.on('start-recording-from-tray', callback),
    sendRecordingStarted: () => ipcRenderer.send('recording-started'),
    sendRecordingStopped: () => ipcRenderer.send('recording-stopped'),
    
    insertTextAtCursor: async (text) => {
        try {
            const result = await ipcRenderer.invoke('write-to-clipboard', text);
            if (result) {
                console.log('Text copied to clipboard. Press Ctrl+V to paste.');
            }
            return result;
        } catch (error) {
            console.error('Error copying text:', error);
            return false;
        }
    },
    
    typeText: async (text) => {
        try {
            const result = await ipcRenderer.invoke('write-to-clipboard', text);
            if (result) {
                console.log('Text copied to clipboard. Press Ctrl+V to paste.');
            }
            return result;
        } catch (error) {
            console.error('Error copying text:', error);
            return false;
        }
    },
    
    getPlatform: () => process.platform,
    minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),
    openExternal: (url) => ipcRenderer.send('open-external', url),
    setAutoStart: (enable) => ipcRenderer.send('set-auto-start', enable),
    onShowSettings: (callback) => ipcRenderer.on('show-settings', callback),
    
    storage: {
        get: (key) => localStorage.getItem(key),
        set: (key, value) => localStorage.setItem(key, value),
        remove: (key) => localStorage.removeItem(key)
    }
});
