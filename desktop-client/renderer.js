// Desktop Client renderer.js - FIXED VERSION (No Web Speech API)
// This version sends audio to server for Deepgram processing

// Global variables
let ws = null;
let isConnected = false;
let isRecording = false;
let mediaRecorder = null;
let audioStream = null;
let audioChunks = [];
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
let reconnectTimeout = null;

// Configuration
const config = {
    serverUrl: window.electronAPI.storage.get('serverUrl') || 'ws://localhost:8080',
    email: window.electronAPI.storage.get('email') || '',
    activationCode: window.electronAPI.storage.get('activationCode') || '',
    language: window.electronAPI.storage.get('language') || 'en',
    insertMethod: window.electronAPI.storage.get('insertMethod') || 'clipboard'
};

// UI Elements
const elements = {
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
if (elements.emailInput) elements.emailInput.value = config.email;
if (elements.codeInput) elements.codeInput.value = config.activationCode;
if (elements.languageSelect) elements.languageSelect.value = config.language;
if (elements.serverUrlInput) elements.serverUrlInput.value = config.serverUrl;
if (elements.insertMethodSelect) elements.insertMethodSelect.value = config.insertMethod;

// WebSocket connection
function connectWebSocket() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        console.log('WebSocket already connected or connecting');
        return;
    }

    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }

    updateStatus('connecting', 'Connecting to server...');
    
    try {
        ws = new WebSocket(config.serverUrl);
        
        ws.onopen = () => {
    console.log('WebSocket connected');
    reconnectAttempts = 0;
    updateStatus('connected', 'Connected - Authenticating...');
    
    // Authenticate WITH EXPLICIT CLIENT TYPE
    ws.send(JSON.stringify({
        type: 'auth',
        email: config.email,
        activationCode: config.activationCode,
        clientType: 'desktop'  // ADD THIS LINE
    }));
};
        
        ws.onmessage = (event) => {
            console.log('📨 RAW WebSocket message:', event.data);
            
            let data;
            try {
                data = JSON.parse(event.data);
            } catch (error) {
                console.error('Failed to parse message:', error);
                return;
            }
            
            console.log('📩 Parsed message type:', data.type);
            handleWebSocketMessage(data);
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            updateStatus('error', 'Connection error');
        };
        
        ws.onclose = () => {
            console.log('WebSocket closed');
            ws = null;
            isConnected = false;
            updateStatus('disconnected', 'Disconnected');
            
            if (reconnectAttempts < maxReconnectAttempts && !reconnectTimeout) {
                reconnectAttempts++;
                const delay = Math.min(3000 * Math.pow(2, reconnectAttempts - 1), 30000);
                console.log(`Reconnect attempt ${reconnectAttempts}/${maxReconnectAttempts} in ${delay}ms`);
                reconnectTimeout = setTimeout(() => {
                    reconnectTimeout = null;
                    connectWebSocket();
                }, delay);
            }
        };
    } catch (error) {
        console.error('Failed to create WebSocket:', error);
        updateStatus('error', 'Failed to connect');
    }
}

// Handle WebSocket messages
function handleWebSocketMessage(data) {
    console.log('📩 Received WebSocket message:', JSON.stringify(data, null, 2));
    
    switch (data.type) {
        case 'connection':
            console.log('Connection acknowledged:', data);
            break;
            
        case 'auth':
            if (data.status === 'success') {
                isConnected = true;
                // Update language from server response
                if (data.language) {
                    config.language = data.language;
                    console.log('Updated language to:', config.language);
                }
                console.log('Authentication successful:', data);
                updateStatus('ready', `Ready - ${data.user.firstName} ${data.user.lastName} (${data.user.daysRemaining} days remaining)`);
                showNotification('Connected', 'Press Ctrl+Shift+D to start dictation');
            } else {
                console.error('Authentication failed:', data.message);
                updateStatus('error', data.message || 'Authentication failed');
                isConnected = false;
            }
            break;
            
        case 'transcriptionStarted':
            console.log('Transcription service started');
            updateTranscriptionPreview('🎤 Recording... Speak now');
            break;
            
        case 'transcriptionReady':
            console.log('Transcription service ready');
            updateTranscriptionPreview('🎤 Ready... Speak now');
            break;
            
        case 'transcriptionStopped':
            console.log('Transcription service stopped');
            updateTranscriptionPreview('Transcription stopped');
            break;
            
        case 'transcriptionResult':
            console.log('📝 Transcription received:', data);
            if (data.transcript && data.transcript.trim()) {
                updateTranscriptionPreview(data.transcript);
                if (data.isFinal) {
                    // Add space after final transcript for natural text flow
                    insertTextAtCursor(data.transcript.trim() + ' ');
                }
            }
            break;
            
        case 'error':
            console.error('❌ Server error:', data.message);
            updateTranscriptionPreview('Error: ' + data.message);
            showNotification('Error', data.message);
            
            // If it's a transcription error, stop recording
            if (data.message.includes('Transcription failed') || data.message.includes('audio')) {
                stopRecording();
            }
            break;
            
        default:
            console.log('Unknown message type:', data.type);
            // Don't log full data unless it's truly unknown
            if (!['transcriptionReady'].includes(data.type)) {
                console.log('Full message data:', JSON.stringify(data, null, 2));
            }
    }
}

// Initialize audio recording for desktop client
async function initializeAudioRecording() {
    try {
        console.log('🎤 Initializing desktop audio recording...');
        
        audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                sampleRate: 16000,
                channelCount: 1
            } 
        });
        
        // Find best supported MIME type
        const mimeTypes = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/wav'
        ];
        
        let selectedMimeType = null;
        for (const mimeType of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                selectedMimeType = mimeType;
                console.log('✅ Using audio format:', mimeType);
                break;
            }
        }
        
        if (!selectedMimeType) {
            selectedMimeType = 'audio/webm'; // Fallback
        }
        
        mediaRecorder = new MediaRecorder(audioStream, {
            mimeType: selectedMimeType
        });
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
                // Send audio chunk to server immediately
                sendAudioChunk(event.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            console.log('MediaRecorder stopped');
            // Send final audio signal to server
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ 
                    type: 'audioComplete',
                    language: config.language 
                }));
            }
            audioChunks = [];
        };
        
        mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event.error);
            showNotification('Recording Error', 'Failed to record audio');
            stopRecording();
        };
        
        console.log('✅ Desktop audio recording initialized');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize audio recording:', error);
        showNotification('Microphone Error', 'Failed to access microphone');
        return false;
    }
}

// Send audio chunk to server for Deepgram processing
function sendAudioChunk(audioData) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Audio = reader.result.split(',')[1];
            
            console.log(`📤 Sending audio chunk to server:`, {
                size: audioData.size,
                type: audioData.type,
                base64Length: base64Audio.length,
                language: config.language
            });
            
            ws.send(JSON.stringify({
                type: 'audioChunk',
                audio: base64Audio,
                mimeType: audioData.type || 'audio/webm;codecs=opus',
                language: config.language,
                format: 'base64',
                sampleRate: 16000,
                channels: 1
            }));
        };
        reader.readAsDataURL(audioData);
    }
}

// Start recording - Desktop client sends audio to server
async function startRecording() {
    if (isRecording) {
        console.log('Already recording');
        return;
    }
    
    if (!isConnected) {
        showNotification('Error', 'Not connected to server');
        return;
    }
    
    console.log('🎤 Starting desktop recording...');
    isRecording = true;
    updateRecordingStatus(true);
    window.electronAPI.sendRecordingStarted();
    
    // Initialize audio recording if needed
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        const initialized = await initializeAudioRecording();
        if (!initialized) {
            isRecording = false;
            return;
        }
    }
    
    try {
        audioChunks = [];
        
        // Tell server we're starting transcription
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ 
                type: 'startTranscription',
                language: config.language 
            }));
        }
        
        // Start recording audio in chunks
        mediaRecorder.start(1000); // Send chunk every 1 second
        
    } catch (error) {
        console.error('Failed to start recording:', error);
        showNotification('Error', 'Failed to start recording');
        isRecording = false;
        updateRecordingStatus(false);
    }
}

// Stop recording
function stopRecording() {
    if (!isRecording) {
        console.log('Not recording');
        return;
    }
    
    console.log('🛑 Stopping desktop recording...');
    isRecording = false;
    updateRecordingStatus(false);
    window.electronAPI.sendRecordingStopped();
    
    try {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
        
        // Tell server we're stopping transcription
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'stopTranscription' }));
        }
        
        // Clean up audio stream
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            audioStream = null;
        }
        mediaRecorder = null;
        
    } catch (error) {
        console.error('Error stopping recording:', error);
    }
}

// UI update functions
function updateStatus(state, message) {
    if (elements.statusText) elements.statusText.textContent = message;
    if (elements.statusIndicator) elements.statusIndicator.className = `status-indicator ${state}`;
    
    if (elements.connectBtn) {
        if (state === 'ready') {
            elements.connectBtn.textContent = 'Disconnect';
            elements.connectBtn.classList.add('connected');
        } else {
            elements.connectBtn.textContent = 'Connect';
            elements.connectBtn.classList.remove('connected');
        }
    }
}

function updateRecordingStatus(recording) {
    if (elements.recordingStatus) {
        if (recording) {
            elements.recordingStatus.classList.add('active');
            elements.recordingStatus.textContent = '🔴 Recording... (Press Ctrl+Shift+D to stop)';
        } else {
            elements.recordingStatus.classList.remove('active');
            elements.recordingStatus.textContent = 'Press Ctrl+Shift+D to start dictation';
        }
    }
}

function updateTranscriptionPreview(text) {
    if (elements.transcriptionPreview) {
        elements.transcriptionPreview.textContent = text;
    }
}

function showNotification(title, message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: 'assets/icon.png'
        });
    }
    console.log(`${title}: ${message}`);
}

// Insert text at cursor position
async function insertTextAtCursor(text) {
    if (!text) return;
    
    const success = config.insertMethod === 'clipboard' 
        ? await window.electronAPI.insertTextAtCursor(text)
        : await window.electronAPI.typeText(text);
        
    if (!success) {
        showNotification('Insertion Error', 'Failed to insert text. Try changing the insertion method in settings.');
    }
}

// Event listeners
if (elements.connectBtn) {
    elements.connectBtn.addEventListener('click', () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
            }
            reconnectAttempts = maxReconnectAttempts;
            isConnected = false;
            updateStatus('disconnected', 'Disconnected');
        } else {
            reconnectAttempts = 0;
            connectWebSocket();
        }
    });
}

if (elements.saveSettingsBtn) {
    elements.saveSettingsBtn.addEventListener('click', () => {
        config.email = elements.emailInput.value;
        config.activationCode = elements.codeInput.value;
        config.language = elements.languageSelect.value;
        config.serverUrl = elements.serverUrlInput.value;
        config.insertMethod = elements.insertMethodSelect.value;
        
        window.electronAPI.storage.set('email', config.email);
        window.electronAPI.storage.set('activationCode', config.activationCode);
        window.electronAPI.storage.set('language', config.language);
        window.electronAPI.storage.set('serverUrl', config.serverUrl);
        window.electronAPI.storage.set('insertMethod', config.insertMethod);
        
        alert('Settings saved successfully');
        
        if (ws) {
            ws.close();
            setTimeout(connectWebSocket, 500);
        }
    });
}

if (elements.settingsToggle) {
    elements.settingsToggle.addEventListener('click', () => {
        elements.settingsPanel.classList.toggle('hidden');
    });
}

if (elements.minimizeBtn) {
    elements.minimizeBtn.addEventListener('click', () => {
        window.electronAPI.minimizeToTray();
    });
}

// Global shortcut handlers
let shortcutDebounce = null;

window.electronAPI.onStartRecordingGlobal(() => {
    if (shortcutDebounce) return;
    shortcutDebounce = setTimeout(() => {
        shortcutDebounce = null;
    }, 500);
    
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
});

window.electronAPI.onStopRecordingGlobal(() => {
    if (shortcutDebounce) return;
    shortcutDebounce = setTimeout(() => {
        shortcutDebounce = null;
    }, 500);
    
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
    if (elements.settingsPanel) {
        elements.settingsPanel.classList.remove('hidden');
    }
});

// Request microphone permission on load
navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
        console.log('✅ Microphone permission granted');
        stream.getTracks().forEach(track => track.stop());
    })
    .catch(err => console.error('❌ Microphone permission denied:', err));

console.log('🖥️ Desktop client ready. Click Connect to start.');
console.log('📡 This version sends audio to server for Deepgram processing.');