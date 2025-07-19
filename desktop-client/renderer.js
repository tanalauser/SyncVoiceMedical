// Global variables
let ws = null;
let isConnected = false;
let isRecording = false;
let recognition = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// Configuration
const config = {
    serverUrl: window.electronAPI.storage.get('serverUrl') || 'ws://localhost:8081',
    email: window.electronAPI.storage.get('email') || '',
    activationCode: window.electronAPI.storage.get('activationCode') || '',
    language: window.electronAPI.storage.get('language') || 'en',
    insertMethod: window.electronAPI.storage.get('insertMethod') || 'clipboard'
};

// Language mappings (same as in appForm.js)
const languageMap = {
    'fr': 'fr-FR',
    'en': 'en-US',
    'de': 'de-DE',
    'es': 'es-ES',
    'it': 'it-IT',
    'pt': 'pt-PT'
};

// UI Elements
const elements = {
    status: document.getElementById('status'),
    statusText: document.getElementById('statusText'),
    statusIndicator: document.getElementById('statusIndicator'),
    connectBtn: document.getElementById('connectBtn'),
    emailInput: document.getElementById('email'),
    codeInput: document.getElementById('activationCode'),
    languageSelect: document.getElementById('language'),
    serverUrlInput: document.getElementById('serverUrl'),
    insertMethodSelect: document.getElementById('insertMethod'),
    saveSettingsBtn: document.getElementById('saveSettings'),
    recordingStatus: document.getElementById('recordingStatus'),
    transcriptionPreview: document.getElementById('transcriptionPreview'),
    settingsPanel: document.getElementById('settingsPanel'),
    settingsToggle: document.getElementById('settingsToggle'),
    minimizeBtn: document.getElementById('minimizeBtn')
};

// Initialize UI with saved values
elements.emailInput.value = config.email;
elements.codeInput.value = config.activationCode;
elements.languageSelect.value = config.language;
elements.serverUrlInput.value = config.serverUrl;
elements.insertMethodSelect.value = config.insertMethod;



class WebSocketManager {
  constructor(config) {
    this.config = config;
    this.ws = null;
    this.reconnectTimer = null;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.reconnectDecay = 1.5;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    
    try {
      this.ws = new WebSocket(this.config.serverUrl);
      this.setupEventHandlers();
    } catch (error) {
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectDelay);
    
    // Exponential backoff
    this.reconnectDelay = Math.min(
      this.reconnectDelay * this.reconnectDecay,
      this.maxReconnectDelay
    );
  }

  setupEventHandlers() {
    this.ws.onopen = () => {
      this.reconnectDelay = 1000; // Reset delay
      // ... rest of onopen handler
    };
    
    this.ws.onclose = () => {
      this.scheduleReconnect();
    };
  }
}


function createRecordingOverlay() {
  const overlay = new BrowserWindow({
    width: 200,
    height: 60,
    x: screen.width - 220,
    y: 20,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    movable: false,
    focusable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  overlay.loadFile('recording-overlay.html');
  overlay.setIgnoreMouseEvents(true);
  return overlay;
}


class VoiceActivityDetector {
  constructor(threshold = -50, silenceDelay = 2000) {
    this.threshold = threshold;
    this.silenceDelay = silenceDelay;
    this.silenceTimer = null;
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
  }

  async init(stream) {
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);
    this.analyser.fftSize = 2048;
    this.startMonitoring();
  }

  startMonitoring() {
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const checkAudio = () => {
      if (!this.monitoring) return;
      
      this.analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const db = 20 * Math.log10(average / 255);
      
      if (db > this.threshold) {
        // Voice detected, clear silence timer
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }
      } else {
        // Silence detected, start timer
        if (!this.silenceTimer) {
          this.silenceTimer = setTimeout(() => {
            this.onSilenceDetected?.();
          }, this.silenceDelay);
        }
      }
      
      requestAnimationFrame(checkAudio);
    };
    
    this.monitoring = true;
    checkAudio();
  }
}


// 6. Add keyboard shortcuts for text manipulation
const textCommands = {
  'new paragraph': () => '\n\n',
  'new line': () => '\n',
  'comma': () => ', ',
  'period': () => '. ',
  'question mark': () => '? ',
  'exclamation': () => '! ',
  'colon': () => ': ',
  'semicolon': () => '; ',
  'open quote': () => '"',
  'close quote': () => '"',
  'open paren': () => '(',
  'close paren': () => ')'
};

// Process voice commands in transcription
function processVoiceCommands(transcript) {
  let processed = transcript;
  
  for (const [command, replacement] of Object.entries(textCommands)) {
    const regex = new RegExp(`\\b${command}\\b`, 'gi');
    processed = processed.replace(regex, replacement());
  }
  
  return processed;
}

// 7. Add medical terminology shortcuts
const medicalShortcuts = {
  'bp': 'blood pressure',
  'hr': 'heart rate',
  'rr': 'respiratory rate',
  'temp': 'temperature',
  'ox sat': 'oxygen saturation',
  'mg': 'milligrams',
  'ml': 'milliliters',
  'po': 'by mouth',
  'prn': 'as needed',
  'bid': 'twice daily',
  'tid': 'three times daily',
  'qid': 'four times daily'
};

// 8. Add secure credential storage (instead of localStorage)
const keytar = require('keytar');

async function saveCredentials(email, activationCode) {
  await keytar.setPassword('SyncVoiceMedical', email, activationCode);
}

async function getCredentials(email) {
  return await keytar.getPassword('SyncVoiceMedical', email);
}

// 9. Add better error handling and user feedback
function showErrorDialog(title, message, details) {
  const { dialog } = require('electron');
  
  dialog.showMessageBox({
    type: 'error',
    title: title,
    message: message,
    detail: details,
    buttons: ['OK', 'Report Issue'],
  }).then(result => {
    if (result.response === 1) {
      // Open issue reporter
      shell.openExternal('https://syncvoicemedical.com/support');
    }
  });
}



// WebSocket connection
function connectWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        return;
    }

    updateStatus('connecting', 'Connecting to server...');
    
    try {
        ws = new WebSocket(config.serverUrl);
        
        ws.onopen = () => {
            console.log('WebSocket connected');
            reconnectAttempts = 0;
            updateStatus('connected', 'Connected - Authenticating...');
            
            // Authenticate
            ws.send(JSON.stringify({
                type: 'auth',
                email: config.email,
                activationCode: config.activationCode
            }));
        };
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            updateStatus('error', 'Connection error');
        };
        
        ws.onclose = () => {
            console.log('WebSocket closed');
            isConnected = false;
            updateStatus('disconnected', 'Disconnected');
            
            // Auto-reconnect
            if (reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                setTimeout(() => {
                    console.log(`Reconnect attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
                    connectWebSocket();
                }, 3000);
            }
        };
    } catch (error) {
        console.error('Failed to create WebSocket:', error);
        updateStatus('error', 'Failed to connect');
    }
}



// Handle WebSocket messages
function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'auth':
            if (data.status === 'success') {
                isConnected = true;
                config.language = data.language;
                elements.languageSelect.value = data.language;
                updateStatus('ready', `Ready - ${data.user.firstName} ${data.user.lastName} (${data.user.daysRemaining} days remaining)`);
                showNotification('Connected', 'SyncVoice Medical is ready. Press Ctrl+Shift+D to start dictation.');
            } else {
                updateStatus('error', data.message || 'Authentication failed');
                isConnected = false;
            }
            break;
            
        case 'transcriptionResult':
            if (data.transcript) {
                updateTranscriptionPreview(data.transcript);
                if (data.isFinal) {
                    insertTextAtCursor(data.transcript);
                }
            }
            break;
            
        case 'error':
            console.error('Server error:', data.message);
            showNotification('Error', data.message);
            break;
    }
}

// Speech recognition setup
function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        showNotification('Error', 'Speech recognition not supported in this environment');
        return null;
    }
    
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = languageMap[config.language] || 'en-US';
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
        console.log('Speech recognition started');
        isRecording = true;
        window.electronAPI.sendRecordingStarted();
        updateRecordingStatus(true);
        showRecordingOverlay(true);
    };
    
    recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript.trim();
            
            if (result.isFinal && transcript) {
                // Send to server for processing (if needed)
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'transcriptionChunk',
                        transcript: transcript,
                        isFinal: true
                    }));
                } else {
                    // Direct insertion without server processing
                    insertTextAtCursor(transcript + ' ');
                }
            } else {
                // Show interim results
                updateTranscriptionPreview(transcript);
            }
        }
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
            showNotification('Recognition Error', `Error: ${event.error}`);
        }
        stopRecording();
    };
    
    recognition.onend = () => {
        console.log('Speech recognition ended');
        if (isRecording) {
            // Restart if still recording
            recognition.start();
        } else {
            updateRecordingStatus(false);
            showRecordingOverlay(false);
        }
    };
    
    return recognition;
}

// Start recording
function startRecording() {
    if (isRecording) return;
    
    if (!recognition) {
        recognition = setupSpeechRecognition();
    }
    
    if (recognition) {
        try {
            recognition.start();
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'startTranscription' }));
            }
        } catch (error) {
            console.error('Failed to start recognition:', error);
            showNotification('Error', 'Failed to start speech recognition');
        }
    }
}

// Stop recording
function stopRecording() {
    if (!isRecording) return;
    
    isRecording = false;
    if (recognition) {
        recognition.stop();
    }
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'stopTranscription' }));
    }
    
    window.electronAPI.sendRecordingStopped();
    updateRecordingStatus(false);
    showRecordingOverlay(false);
    elements.transcriptionPreview.textContent = '';
}

// Insert text at cursor position
function insertTextAtCursor(text) {
    if (!text) return;
    
    const success = config.insertMethod === 'clipboard' 
        ? window.electronAPI.insertTextAtCursor(text)
        : window.electronAPI.typeText(text);
        
    if (!success) {
        showNotification('Insertion Error', 'Failed to insert text. Try changing the insertion method in settings.');
    }
}

// UI update functions
function updateStatus(state, message) {
    elements.statusText.textContent = message;
    elements.statusIndicator.className = `status-indicator ${state}`;
    
    // Update connect button
    if (state === 'ready') {
        elements.connectBtn.textContent = 'Disconnect';
        elements.connectBtn.classList.add('connected');
    } else {
        elements.connectBtn.textContent = 'Connect';
        elements.connectBtn.classList.remove('connected');
    }
}

function updateRecordingStatus(recording) {
    if (recording) {
        elements.recordingStatus.classList.add('active');
        elements.recordingStatus.textContent = '🔴 Recording... (Press Ctrl+Shift+D to stop)';
    } else {
        elements.recordingStatus.classList.remove('active');
        elements.recordingStatus.textContent = 'Press Ctrl+Shift+D to start dictation';
    }
}

function updateTranscriptionPreview(text) {
    elements.transcriptionPreview.textContent = text;
}

function showRecordingOverlay(show) {
    // This would show a small overlay on screen indicating recording status
    // Implementation depends on additional UI requirements
}

function showNotification(title, message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: 'assets/icon.png'
        });
    }
}

// Event listeners
elements.connectBtn.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
        isConnected = false;
        updateStatus('disconnected', 'Disconnected');
    } else {
        connectWebSocket();
    }
});

elements.saveSettingsBtn.addEventListener('click', () => {
    config.email = elements.emailInput.value;
    config.activationCode = elements.codeInput.value;
    config.language = elements.languageSelect.value;
    config.serverUrl = elements.serverUrlInput.value;
    config.insertMethod = elements.insertMethodSelect.value;
    
    // Save to storage
    window.electronAPI.storage.set('email', config.email);
    window.electronAPI.storage.set('activationCode', config.activationCode);
    window.electronAPI.storage.set('language', config.language);
    window.electronAPI.storage.set('serverUrl', config.serverUrl);
    window.electronAPI.storage.set('insertMethod', config.insertMethod);
    
    showNotification('Settings Saved', 'Your settings have been saved successfully');
    
    // Reconnect if needed
    if (ws) {
        ws.close();
        setTimeout(connectWebSocket, 500);
    }
});

elements.settingsToggle.addEventListener('click', () => {
    elements.settingsPanel.classList.toggle('hidden');
});

elements.minimizeBtn.addEventListener('click', () => {
    window.electronAPI.minimizeToTray();
});

// Global shortcut handlers
window.electronAPI.onStartRecordingGlobal(() => {
    if (!isRecording) {
        startRecording();
    }
});

window.electronAPI.onStopRecordingGlobal(() => {
    if (isRecording) {
        stopRecording();
    }
});

window.electronAPI.onStartRecordingFromTray(() => {
    if (!isRecording) {
        startRecording();
    }
});

window.electronAPI.onShowSettings(() => {
    elements.settingsPanel.classList.remove('hidden');
});

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// Auto-connect on startup if credentials are saved
if (config.email && config.activationCode) {
    setTimeout(connectWebSocket, 1000);
}