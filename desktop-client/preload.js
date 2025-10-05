// desktop-client/preload.js - SyncVoice Medical Desktop Client
// Fixed version without robotjs dependency

const { contextBridge, ipcRenderer } = require('electron');

console.log('🔧 Preload script loading...');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Recording controls
    onStartRecordingGlobal: (callback) => {
        console.log('🎯 Registering toggle recording listener');
        // Listen for both old and new message names for compatibility
        ipcRenderer.on('toggle-recording-global', callback);
        ipcRenderer.on('start-recording-global', callback);
    },
    onStopRecordingGlobal: (callback) => {
        console.log('🎯 Registering stop recording global listener');
        ipcRenderer.on('stop-recording-global', callback);
    },
    onStartRecordingFromTray: (callback) => {
        console.log('🎯 Registering tray recording listener');
        ipcRenderer.on('toggle-recording-from-tray', callback);
        ipcRenderer.on('start-recording-from-tray', callback);
    },
    
    // Status updates
    sendRecordingStarted: () => {
        console.log('📡 Sending recording started to main process');
        ipcRenderer.send('recording-started');
    },
    sendRecordingStopped: () => {
        console.log('📡 Sending recording stopped to main process');
        ipcRenderer.send('recording-stopped');
    },
    
    // Text insertion methods - Simplified without robotjs
    insertTextAtCursor: (text) => {
        try {
            console.log('📋 Clipboard insertion method starting...');
            
            // Clean text
            const cleanText = text.replace(/\s+/g, ' ').trim();
            if (!cleanText) return false;
            
            // Send to main process to handle clipboard and paste
            ipcRenderer.send('insert-text-clipboard', cleanText);
            
            return true;
        } catch (error) {
            console.error('❌ Clipboard insertion error:', error);
            return false;
        }
    },
    
    typeText: (text) => {
        // Fallback to automated insertion
        console.log('⌨️ Requesting automated text insertion...');
        const cleanText = text.replace(/\s+/g, ' ').trim();
        if (!cleanText) return false;
        
        ipcRenderer.send('insert-text-automated', cleanText);
        return true;
    },
    
    typeTextSlow: (text) => {
        // Fallback to automated insertion
        console.log('🐌 Requesting slow text insertion...');
        const cleanText = text.replace(/\s+/g, ' ').trim();
        if (!cleanText) return false;
        
        ipcRenderer.send('insert-text-automated', cleanText);
        return true;
    },
    
    // Storage with enhanced persistence
    storage: {
        get: (key) => {
            try {
                const value = localStorage.getItem(key);
                console.log(`📖 Storage GET ${key}:`, key === 'activationCode' && value ? '***' : value);
                return value;
            } catch (error) {
                console.error('❌ Storage GET error:', error);
                return null;
            }
        },
        
        set: (key, value) => {
            try {
                console.log(`💾 Storage SET ${key}:`, key === 'activationCode' && value ? '***' : value);
                
                // Set the value
                localStorage.setItem(key, value);
                
                // Immediately verify it was set
                const verification = localStorage.getItem(key);
                if (verification === value) {
                    console.log(`✅ Storage SET verified for ${key}`);
                    return true;
                } else {
                    console.error(`❌ Storage SET verification failed for ${key}`);
                    return false;
                }
            } catch (error) {
                console.error('❌ Storage SET error:', error);
                return false;
            }
        },
        
        remove: (key) => {
            try {
                localStorage.removeItem(key);
                const verification = localStorage.getItem(key);
                return verification === null;
            } catch (error) {
                console.error('❌ Storage REMOVE error:', error);
                return false;
            }
        },
        
        clear: () => {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.error('❌ Storage CLEAR error:', error);
                return false;
            }
        },
        
        debug: () => {
            console.log('=== STORAGE DEBUG ===');
            const keys = ['serverUrl', 'email', 'activationCode', 'language', 'insertMethod', 'autoConnect'];
            keys.forEach(key => {
                const value = localStorage.getItem(key);
                console.log(`  ${key}: ${key === 'activationCode' && value ? '***' : value}`);
            });
            console.log(`Total items: ${localStorage.length}`);
        }
    },
    
    // System info
    getPlatform: () => process.platform,
    
    // Window controls
    minimizeToTray: () => {
        console.log('🪟 Minimizing to tray');
        ipcRenderer.send('minimize-to-tray');
    },
    
    flashWindow: () => {
        console.log('⚡ Flashing window');
        ipcRenderer.send('flash-window');
    },
    
    // External links
    openExternal: (url) => {
        console.log('🔗 Opening external URL:', url);
        ipcRenderer.send('open-external', url);
    },
    
    // Settings
    setAutoStart: (enable) => {
        console.log('⚙️ Setting auto-start:', enable);
        ipcRenderer.send('set-auto-start', enable);
    },
    
    onShowSettings: (callback) => {
        console.log('⚙️ Registering show settings listener');
        ipcRenderer.on('show-settings', callback);
    },
    
    // Notifications
    showSystemNotification: (title, message) => {
        console.log('📢 Showing system notification:', title);
        ipcRenderer.send('show-notification', { title, message });
    },
    
    // Clipboard utilities
    writeToClipboard: async (text) => {
        try {
            return await ipcRenderer.invoke('write-to-clipboard', text);
        } catch (error) {
            console.error('❌ Clipboard write error:', error);
            return false;
        }
    },
    
    readFromClipboard: async () => {
        try {
            return await ipcRenderer.invoke('read-from-clipboard');
        } catch (error) {
            console.error('❌ Clipboard read error:', error);
            return '';
        }
    },
    
    // Check automation availability
    isAutomationAvailable: () => {
        // Always return true since we use PowerShell on Windows
        return process.platform === 'win32';
    },
    
    // Listen for text insertion results
    onTextInsertionResult: (callback) => {
        ipcRenderer.on('text-insertion-result', callback);
    },
    
    // Test function
    testAutomation: () => {
        console.log('🧪 Testing automation in 3 seconds...');
        console.log('💡 Click in a text editor NOW!');
        
        setTimeout(() => {
            const testText = `Test at ${new Date().toLocaleTimeString()} - SyncVoice Medical`;
            console.log('🧪 Executing test...');
            
            ipcRenderer.send('insert-text-clipboard', testText);
            
            console.log('✅ Test initiated');
        }, 3000);
    }
});

console.log('✅ Preload script loaded successfully');