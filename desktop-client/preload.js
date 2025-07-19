const { contextBridge, ipcRenderer } = require('electron');
const { clipboard } = require('electron');
// Replace robotjs with nut-js
const { keyboard, Key } = require('@nut-tree/nut-js');

const { keyboard, Key, mouse, screen, clipboard as nutClipboard } = require('nut-js');

// Configure nut-js for better performance
keyboard.config.autoDelayMs = 0;

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {

    insertFormattedText: async (text, format) => {
    try {
        switch (format) {
            case 'uppercase':
                await keyboard.type(text.toUpperCase());
                break;
            case 'lowercase':
                await keyboard.type(text.toLowerCase());
                break;
            case 'title':
                const titleCase = text.replace(/\w\S*/g, (txt) => 
                    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                );
                await keyboard.type(titleCase);
                break;
            case 'sentence':
                const sentenceCase = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
                await keyboard.type(sentenceCase);
                break;
            default:
                await keyboard.type(text);
        }
        return true;
    } catch (error) {
        console.error('Error inserting formatted text:', error);
        return false;
    }
},

// Medical template shortcuts
insertMedicalTemplate: async (templateType) => {
    const templates = {
        'vitals': 'Vital Signs:\nBP: ___/___\nHR: ___ bpm\nRR: ___ /min\nTemp: ___°F\nO2 Sat: ___%\n',
        'soap': 'SUBJECTIVE:\n\nOBJECTIVE:\n\nASSESSMENT:\n\nPLAN:\n',
        'hpi': 'HISTORY OF PRESENT ILLNESS:\nThe patient is a ___-year-old ___ who presents with ___.\n',
        'ros': 'REVIEW OF SYSTEMS:\nConstitutional: Denies fever, chills, weight loss\nHEENT: Denies headache, vision changes\nCardiovascular: Denies chest pain, palpitations\nRespiratory: Denies shortness of breath, cough\nGI: Denies abdominal pain, nausea, vomiting\nGU: Denies dysuria, hematuria\nMusculoskeletal: Denies joint pain, swelling\nNeurological: Denies numbness, weakness\nPsychiatric: Denies depression, anxiety\n',
        'physical': 'PHYSICAL EXAMINATION:\nGeneral: Alert and oriented x3, no acute distress\nHEENT: Normocephalic, PERRLA, EOMI\nNeck: Supple, no lymphadenopathy\nCardiovascular: RRR, no murmurs\nRespiratory: CTAB, no wheezes/rales/rhonchi\nAbdomen: Soft, non-tender, non-distended\nExtremities: No edema, pulses intact\nNeurological: CN II-XII intact, strength 5/5\n'
    };
    
    const template = templates[templateType];
    if (template) {
        await keyboard.type(template);
        return true;
    }
    return false;
},

// Smart navigation
navigateToField: async (direction) => {
    try {
        if (direction === 'next') {
            await keyboard.pressKey(Key.Tab);
            await keyboard.releaseKey(Key.Tab);
        } else if (direction === 'previous') {
            await keyboard.pressKey(Key.LeftShift, Key.Tab);
            await keyboard.releaseKey(Key.LeftShift, Key.Tab);
        }
        return true;
    } catch (error) {
        console.error('Navigation error:', error);
        return false;
    }
},

// Undo/Redo support
performEditAction: async (action) => {
    try {
        const modifier = process.platform === 'darwin' ? Key.LeftCmd : Key.LeftControl;
        
        switch (action) {
            case 'undo':
                await keyboard.pressKey(modifier, Key.Z);
                await keyboard.releaseKey(modifier, Key.Z);
                break;
            case 'redo':
                if (process.platform === 'darwin') {
                    await keyboard.pressKey(Key.LeftCmd, Key.LeftShift, Key.Z);
                    await keyboard.releaseKey(Key.LeftCmd, Key.LeftShift, Key.Z);
                } else {
                    await keyboard.pressKey(Key.LeftControl, Key.Y);
                    await keyboard.releaseKey(Key.LeftControl, Key.Y);
                }
                break;
            case 'selectAll':
                await keyboard.pressKey(modifier, Key.A);
                await keyboard.releaseKey(modifier, Key.A);
                break;
            case 'cut':
                await keyboard.pressKey(modifier, Key.X);
                await keyboard.releaseKey(modifier, Key.X);
                break;
            case 'copy':
                await keyboard.pressKey(modifier, Key.C);
                await keyboard.releaseKey(modifier, Key.C);
                break;
            case 'paste':
                await keyboard.pressKey(modifier, Key.V);
                await keyboard.releaseKey(modifier, Key.V);
                break;
        }
        return true;
    } catch (error) {
        console.error('Edit action error:', error);
        return false;
    }
},

// Smart text replacement (useful for medical abbreviations)
replaceLastWord: async (replacement) => {
    try {
        // Select the last word
        if (process.platform === 'darwin') {
            await keyboard.pressKey(Key.LeftAlt, Key.Left);
            await keyboard.releaseKey(Key.LeftAlt, Key.Left);
            await keyboard.pressKey(Key.LeftShift, Key.LeftAlt, Key.Right);
            await keyboard.releaseKey(Key.LeftShift, Key.LeftAlt, Key.Right);
        } else {
            await keyboard.pressKey(Key.LeftControl, Key.Left);
            await keyboard.releaseKey(Key.LeftControl, Key.Left);
            await keyboard.pressKey(Key.LeftShift, Key.LeftControl, Key.Right);
            await keyboard.releaseKey(Key.LeftShift, Key.LeftControl, Key.Right);
        }
        
        // Type the replacement
        await keyboard.type(replacement);
        return true;
    } catch (error) {
        console.error('Replace error:', error);
        return false;
    }
},

// Get current application info (useful for app-specific behavior)
getCurrentWindow: async () => {
    try {
        // This would require additional native modules like active-win
        // For now, return a placeholder
        return { app: 'unknown', title: 'unknown' };
    } catch (error) {
        console.error('Window info error:', error);
        return null;
    }
},
    
    // Recording controls
    onStartRecordingGlobal: (callback) => ipcRenderer.on('start-recording-global', callback),
    onStopRecordingGlobal: (callback) => ipcRenderer.on('stop-recording-global', callback),
    onStartRecordingFromTray: (callback) => ipcRenderer.on('start-recording-from-tray', callback),
    
    // Status updates
    sendRecordingStarted: () => ipcRenderer.send('recording-started'),
    sendRecordingStopped: () => ipcRenderer.send('recording-stopped'),
    
    // Text insertion using nut-js
    insertTextAtCursor: async (text) => {
        try {
            // Save current clipboard content
            const originalClipboard = clipboard.readText();
            
            // Copy text to clipboard
            clipboard.writeText(text);
            
            // Small delay to ensure clipboard is ready
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Simulate Ctrl+V (or Cmd+V on Mac) using nut-js
            if (process.platform === 'darwin') {
                await keyboard.pressKey(Key.LeftCmd, Key.V);
                await keyboard.releaseKey(Key.LeftCmd, Key.V);
            } else {
                await keyboard.pressKey(Key.LeftControl, Key.V);
                await keyboard.releaseKey(Key.LeftControl, Key.V);
            }
            
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
    
    // Alternative text insertion method (direct typing with nut-js)
    typeText: async (text) => {
        try {
            // nut-js provides better text typing than robotjs
            await keyboard.type(text);
            return true;
        } catch (error) {
            console.error('Error typing text:', error);
            return false;
        }
    },
    
    // Additional nut-js powered features
    typeSpecialKey: async (key) => {
        try {
            const keyMap = {
                'enter': Key.Enter,
                'tab': Key.Tab,
                'backspace': Key.Backspace,
                'delete': Key.Delete,
                'escape': Key.Escape,
                'space': Key.Space,
                'up': Key.Up,
                'down': Key.Down,
                'left': Key.Left,
                'right': Key.Right,
                'home': Key.Home,
                'end': Key.End,
                'pageup': Key.PageUp,
                'pagedown': Key.PageDown
            };
            
            const nutKey = keyMap[key.toLowerCase()];
            if (nutKey) {
                await keyboard.pressKey(nutKey);
                await keyboard.releaseKey(nutKey);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error typing special key:', error);
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

// Add voice commands for these features
const voiceCommands = {
    'insert vitals': () => window.electronAPI.insertMedicalTemplate('vitals'),
    'insert soap note': () => window.electronAPI.insertMedicalTemplate('soap'),
    'undo that': () => window.electronAPI.performEditAction('undo'),
    'next field': () => window.electronAPI.navigateToField('next'),
    'previous field': () => window.electronAPI.navigateToField('previous'),
    'select all': () => window.electronAPI.performEditAction('selectAll')
};

// Process voice commands in transcription
async function processTranscription(transcript) {
    // Check for voice commands
    for (const [command, action] of Object.entries(voiceCommands)) {
        if (transcript.toLowerCase().includes(command)) {
            await action();
            return; // Don't insert the command as text
        }
    }
    
    // Check for medical abbreviations to expand
    const abbreviations = {
        'bp': 'blood pressure',
        'hr': 'heart rate',
        'sob': 'shortness of breath',
        'htn': 'hypertension',
        'dm': 'diabetes mellitus',
        'copd': 'chronic obstructive pulmonary disease'
    };
    
    let processedText = transcript;
    for (const [abbr, full] of Object.entries(abbreviations)) {
        const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
        processedText = processedText.replace(regex, full);
    }
    
    await insertTextAtCursor(processedText);
}
