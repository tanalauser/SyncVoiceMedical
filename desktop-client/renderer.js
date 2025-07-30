// Global variables
let ws = null;
let isConnected = false;
let isRecording = false;
let recognition = null;
let reconnectAttempts = 0;
let reconnectTimeout = null;
const maxReconnectAttempts = 5;
let mediaRecorder = null;
let audioStream = null;
let manuallyDisconnected = false;

// Configuration with defaults
const config = {
    serverUrl: 'wss://syncvoicemedical.onrender.com',
    email: '',
    activationCode: '',
    language: 'fr',  // Default to French
    insertMethod: 'clipboard',
    autoConnect: false
};


// Language mappings for speech recognition
const languageMap = {
    'fr': 'fr-FR',
    'en': 'en-US', 
    'de': 'de-DE',
    'es': 'es-ES',
    'it': 'it-IT',
    'pt': 'pt-PT'
};

// UI Elements
let elements = {};

// Initialize UI elements
function initializeElements() {
    elements = {
        statusText: document.getElementById('statusText'),
        statusIndicator: document.getElementById('statusIndicator'),
        connectBtn: document.getElementById('connectBtn'),
        emailInput: document.getElementById('email'),
        activationCode: document.getElementById('activationCode'),
        languageSelect: document.getElementById('language'),
        serverUrl: document.getElementById('serverUrl'),
        insertMethod: document.getElementById('insertMethod'),
        saveSettings: document.getElementById('saveSettings'),
        recordingStatus: document.getElementById('recordingStatus'),
        transcriptionPreview: document.getElementById('transcriptionPreview'),
        settingsPanel: document.getElementById('settingsPanel'),
        settingsToggle: document.getElementById('settingsToggle'),
        minimizeBtn: document.getElementById('minimizeBtn')
    };
    
    console.log('🎛️ UI elements initialized');
}

// FIXED: Load settings from storage
function loadSettings() {
    console.log('📖 Loading settings from storage...');
    
    try {
        const storage = window.electronAPI?.storage || {
            get: (key) => localStorage.getItem(key),
            set: (key, value) => localStorage.setItem(key, value)
        };
        
        const savedSettings = {
            serverUrl: storage.get('serverUrl') || 'wss://syncvoicemedical.onrender.com',
            email: storage.get('email') || '',
            activationCode: storage.get('activationCode') || '',
            language: storage.get('language') || 'fr',
            insertMethod: storage.get('insertMethod') || 'clipboard',
            autoConnect: storage.get('autoConnect') === 'true'
        };
        
        console.log('📖 Loaded settings:', { ...savedSettings, activationCode: savedSettings.activationCode ? '***' : 'empty' });
        
        // Update config object
        Object.assign(config, savedSettings);
        
        // Update form fields
        if (elements.emailInput) elements.emailInput.value = savedSettings.email;
        if (elements.activationCode) elements.activationCode.value = savedSettings.activationCode;
        if (elements.languageSelect) elements.languageSelect.value = savedSettings.language;
        if (elements.serverUrl) elements.serverUrl.value = savedSettings.serverUrl;
        if (elements.insertMethod) elements.insertMethod.value = savedSettings.insertMethod;
        
        // Update auto-connect checkbox
        const autoConnectCheckbox = document.getElementById('autoConnect');
        if (autoConnectCheckbox) {
            autoConnectCheckbox.checked = savedSettings.autoConnect;
        }
        
        console.log('✅ Settings loaded and form fields updated');
        
    } catch (error) {
        console.error('❌ Error loading settings:', error);
    }
}

// FIXED: Save settings to storage
function saveSettings() {
    console.log('💾 Saving settings...');
    
    try {
        const autoConnectCheckbox = document.getElementById('autoConnect');
        
        // Store the old language before updating
        const oldLanguage = config.language;
        
        const currentSettings = {
            serverUrl: elements.serverUrl?.value || 'wss://syncvoicemedical.onrender.com',
            email: elements.emailInput?.value || '',
            activationCode: elements.activationCode?.value || '',
            language: elements.languageSelect?.value || 'fr',
            insertMethod: elements.insertMethod?.value || 'clipboard',
            autoConnect: autoConnectCheckbox?.checked || false
        };
        
        console.log('💾 Saving settings:', { ...currentSettings, activationCode: currentSettings.activationCode ? '***' : 'empty' });
        
        const storage = window.electronAPI?.storage || {
            set: (key, value) => localStorage.setItem(key, value)
        };
        
        // Save each setting locally first (CLIENT-FIRST APPROACH)
        Object.keys(currentSettings).forEach(key => {
            const value = key === 'autoConnect' ? String(currentSettings[key]) : currentSettings[key];
            storage.set(key, value);
        });
        
        // Also save to localStorage as backup
        Object.keys(currentSettings).forEach(key => {
            const value = key === 'autoConnect' ? String(currentSettings[key]) : currentSettings[key];
            localStorage.setItem(key, value);
        });
        
        // Update config object (CLIENT TAKES PRIORITY)
        Object.assign(config, currentSettings);
        
        console.log('✅ Settings saved locally first (client-first approach)');
        
        // Handle language change
        const languageChanged = oldLanguage !== currentSettings.language;
        
        if (languageChanged) {
            console.log(`🔄 Language changed from ${oldLanguage} to ${currentSettings.language}`);
            
            if (isConnected) {
                // OPTION 1: Try to update server immediately with our language choice
                const updateSent = updateServerLanguage(currentSettings.language);
                
                if (updateSent) {
                    console.log('📤 Language update sent to server (client-first approach)');
                    showNotification('Language Updated', `Changed to ${getLanguageDisplayName(currentSettings.language)} - server notified`);
                } else {
                    // If immediate update fails, we'll sync on next connection
                    console.log('⚠️ Server update failed, will sync on next connection');
                    showNotification('Language Updated', `Changed to ${getLanguageDisplayName(currentSettings.language)} - will sync when connected`);
                }
            } else {
                console.log('📝 Language updated locally, will sync when connected');
                showNotification('Language Updated', `Set to ${getLanguageDisplayName(currentSettings.language)} - will sync when connected`);
            }
        } else {
            showNotification('Settings Saved', 'Your preferences have been saved successfully!');
        }
        
        if (elements.settingsPanel) {
            elements.settingsPanel.classList.add('hidden');
        }
        
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        alert('Error saving settings: ' + error.message);
    }
}


function getLanguageDisplayName(langCode) {
    const displayNames = {
        'fr': 'French',
        'en': 'English',
        'de': 'German',
        'es': 'Spanish',
        'it': 'Italian',
        'pt': 'Portuguese'
    };
    return displayNames[langCode] || langCode;
}


function forceReconnectWithNewLanguage(newLanguage) {
    console.log(`🔄 Force reconnecting with language: ${newLanguage}`);
    
    const wasManuallyDisconnected = manuallyDisconnected;
    manuallyDisconnected = false; // Temporarily allow reconnection
    
    if (ws) {
        // Close current connection
        ws.close();
        
        // Wait for disconnect then reconnect
        setTimeout(() => {
            config.language = newLanguage; // Ensure language is set
            connectWebSocket();
            manuallyDisconnected = wasManuallyDisconnected;
            
            showNotification('Language Changed', `Reconnected with ${newLanguage === 'fr' ? 'French' : 'English'}`);
        }, 1000);
    }
}


// Verify settings were actually saved
function verifySettingsSaved(expectedSettings) {
    console.log('🔍 Verifying settings were saved...');
    
    const storage = window.electronAPI?.storage || {
        get: (key) => localStorage.getItem(key)
    };
    
    let allMatch = true;
    Object.keys(expectedSettings).forEach(key => {
        const saved = storage.get(key);
        const expected = expectedSettings[key];
        const expectedStr = key === 'autoConnect' ? String(expected) : expected;
        if (saved !== expectedStr) {
            console.error(`❌ Verification failed for ${key}: expected "${expectedStr}", got "${saved}"`);
            allMatch = false;
        }
    });
    
    if (allMatch) {
        console.log('✅ Settings verification passed');
    } else {
        console.error('❌ Settings verification failed');
        alert('Warning: Settings may not have been saved correctly. Please try again.');
    }
}

// Debug mode
let debugMode = true;

// WebSocket connection function
function connectWebSocket() {
    console.log('🔌 Attempting to connect WebSocket...');
    
    manuallyDisconnected = false;
    
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        console.log('⚠️ Already connected or connecting');
        return;
    }
    
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }
    
    const serverUrl = elements.serverUrl?.value || config.serverUrl;
    const email = elements.emailInput?.value || config.email;
    const activationCode = elements.activationCode?.value || config.activationCode;
    
    console.log('🔍 Connecting with:', { serverUrl, email, activationCode: activationCode ? '***' : 'empty' });
    
    if (!serverUrl || !email || !activationCode) {
        updateStatus('error', 'Email and activation code required');
        return;
    }
    
    updateStatus('connecting', 'Connecting to server...');
    
    try {
        ws = new WebSocket(serverUrl);
        
        ws.onopen = () => {
            console.log('✅ WebSocket connected');
            reconnectAttempts = 0;
            updateStatus('connected', 'Connected - Authenticating...');
            
            // CLIENT-FIRST: Use our stored language preference for authentication
            const clientLanguage = config.language || localStorage.getItem('language') || 'fr';
            
            console.log(`🌐 Authenticating with CLIENT language preference: ${clientLanguage}`);
            
            // Send authentication with OUR language choice
            ws.send(JSON.stringify({
                type: 'auth',
                email: email,
                activationCode: activationCode,
                clientType: 'desktop',
                language: clientLanguage  // Send our preference to server
            }));
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('📨 WebSocket message received:', data);
                handleWebSocketMessage(data);
            } catch (error) {
                console.error('❌ Failed to parse message:', error);
            }
        };
        
        ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            updateStatus('error', 'Connection error');
        };
        
        ws.onclose = () => {
            console.log('🔌 WebSocket closed');
            ws = null;
            isConnected = false;
            updateStatus('disconnected', 'Disconnected');
            
            if (!manuallyDisconnected && reconnectAttempts < maxReconnectAttempts && !reconnectTimeout) {
                reconnectAttempts++;
                const delay = Math.min(3000 * Math.pow(2, reconnectAttempts - 1), 30000);
                console.log(`🔄 Auto-reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
                
                reconnectTimeout = setTimeout(() => {
                    reconnectTimeout = null;
                    connectWebSocket();
                }, delay);
            } else if (manuallyDisconnected) {
                console.log('⛔ Manual disconnect - not auto-reconnecting');
                reconnectAttempts = 0;
            }
        };
        
    } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        updateStatus('error', 'Failed to connect');
    }
}


// ADD: New debug function to check language state
window.checkLanguagePriority = () => {
    console.log('🔍 Language Priority Check:');
    console.log(`  - Config language: ${config.language}`);
    console.log(`  - LocalStorage language: ${localStorage.getItem('language')}`);
    console.log(`  - Form language: ${elements.languageSelect?.value}`);
    console.log(`  - Connected: ${isConnected}`);
    console.log(`  - Approach: CLIENT-FIRST`);
};

// ADD: Function to force sync language to server
window.forceSyncLanguageToServer = () => {
    if (isConnected && config.language) {
        console.log(`🔄 Force syncing language ${config.language} to server...`);
        updateServerLanguage(config.language);
    } else {
        console.log('❌ Cannot sync: not connected or no language set');
    }
};

// Handle WebSocket messages
function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'auth':
            if (data.status === 'success') {
                isConnected = true;
                
                // OPTION 1: CLIENT-FIRST APPROACH
                // Prioritize client's stored language over server's response
                const localStoredLanguage = config.language || localStorage.getItem('language');
                const serverLanguage = data.language;
                
                let finalLanguage = localStoredLanguage || serverLanguage || 'fr'; // Default to French
                
                console.log(`🌐 Language priority check:`);
                console.log(`  - Local stored: ${localStoredLanguage}`);
                console.log(`  - Server sent: ${serverLanguage}`);
                console.log(`  - Final choice: ${finalLanguage}`);
                
                // Update config and UI with final language choice
                config.language = finalLanguage;
                if (elements.languageSelect) {
                    elements.languageSelect.value = finalLanguage;
                }
                
                // If our local language differs from server's, send update to server
                if (localStoredLanguage && localStoredLanguage !== serverLanguage) {
                    console.log(`📤 Local language (${localStoredLanguage}) differs from server (${serverLanguage}), updating server...`);
                    setTimeout(() => {
                        updateServerLanguage(localStoredLanguage);
                    }, 1000); // Small delay to ensure connection is stable
                }
                
                const userInfo = data.user ? `${data.user.firstName} ${data.user.lastName} (${data.user.daysRemaining} days remaining)` : 'User authenticated';
                updateStatus('ready', `Ready - ${userInfo}`);
                showNotification('Connected', 'SyncVoice Medical is ready. Press Ctrl+Shift+D to start dictation.');
            } else {
                updateStatus('error', data.message || 'Authentication failed');
                isConnected = false;
            }
            break;
            
        case 'languageUpdated':
            // Handle language update confirmation
            if (data.language) {
                console.log(`✅ Server confirmed language update to: ${data.language}`);
                // Don't overwrite local setting - server is just confirming our request
                showNotification('Language Updated', `Server confirmed: ${data.language === 'fr' ? 'French' : data.language === 'en' ? 'English' : data.language === 'de' ? 'German' : data.language === 'es' ? 'Spanish' : data.language === 'it' ? 'Italian' : 'Portuguese'}`);
            }
            break;
            
        case 'transcriptionResult':
            if (data.transcript) {
                console.log('📝 Transcription result received:', data.transcript);
                updateTranscriptionPreview(data.transcript);
                if (data.isFinal) {
                    insertTextAtCursor(data.transcript);
                    setTimeout(stopRecording, 500);
                }
            } else {
                console.warn('⚠️ Empty transcription result received');
            }
            break;
            
        case 'transcriptionComplete':
            if (data.transcript) {
                console.log('✅ Transcription complete:', data.transcript);
                updateTranscriptionPreview(data.transcript);
                insertTextAtCursor(data.transcript);
                setTimeout(stopRecording, 500);
            } else {
                console.warn('⚠️ Empty transcription complete received');
            }
            break;
            
        case 'transcriptionError':
            console.error('❌ Transcription error:', data.message || 'Unknown error');
            showNotification('Transcription Error', data.message || 'Failed to transcribe audio');
            stopRecording();
            updateStatus('error', `Transcription failed: ${data.message || 'Unknown error'}`);
            break;
            
        case 'audioReceived':
            console.log('✅ Server confirmed audio receipt');
            break;
            
        case 'error':
            console.error('❌ Server error:', data.message);
            showNotification('Error', data.message);
            if (data.code === 'TRANSCRIPTION_FAILED' || data.code === 'AUDIO_PROCESSING_ERROR') {
                stopRecording();
            }
            break;
            
        default:
            console.log(`📨 Unhandled message type: ${data.type}`, data);
    }
}


function updateServerLanguage(newLanguage) {
    if (ws && ws.readyState === WebSocket.OPEN && isConnected) {
        console.log(`📤 Updating server language to: ${newLanguage}`);
        ws.send(JSON.stringify({
            type: 'updateLanguage',
            language: newLanguage
        }));
        return true;
    } else {
        console.warn('⚠️ Cannot update server language: not connected');
        return false;
    }
}

// Text insertion function
async function insertTextAtCursor(text) {
    if (!text) return false;
    
    console.log('🎯 Inserting text:', text.substring(0, 50) + '...');
    updateTranscriptionPreview(text);
    
    if (!window.electronAPI) {
        console.error('❌ Electron API not available');
        return false;
    }
    
    try {
        let success = false;
        const method = config.insertMethod || 'clipboard';
        
        switch (method) {
            case 'clipboard':
                success = window.electronAPI.insertTextAtCursor(text);
                break;
            case 'typing':
                success = window.electronAPI.typeText(text);
                break;
            case 'slow':
                success = window.electronAPI.typeTextSlow(text);
                break;
            case 'auto':
            default:
                success = window.electronAPI.insertTextAtCursor(text) ||
                         window.electronAPI.typeText(text) ||
                         window.electronAPI.typeTextSlow(text);
                break;
        }
        
        if (success) {
            showNotification('Transcription Complete', 'Text inserted successfully!');
        }
        
        return success;
        
    } catch (error) {
        console.error('❌ Text insertion failed:', error);
        return false;
    }
}

// Function to show manual record button
function showManualRecordButton() {
    const btn = document.getElementById('manualRecordBtn');
    if (btn) {
        btn.style.display = 'block';
        console.log('📱 Manual record button shown');
    }
}

// Function to update recording button state
function updateManualRecordButton(recording) {
    const btn = document.getElementById('manualRecordBtn');
    if (btn) {
        if (recording) {
            btn.textContent = '⏹️ Stop Recording';
            btn.style.background = '#dc3545';
        } else {
            btn.textContent = '🎤 Start Recording';
            btn.style.background = '#296396';
        }
    }
}

// Alternative: Use Web Speech API if available
async function startRecordingWithSpeechAPI() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        console.error('❌ Web Speech API not supported');
        return false;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    recognition.lang = languageMap[config.language] || 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
        console.log('🎙️ Speech recognition started');
    };
    
    recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }
        
        if (finalTranscript) {
            console.log('📝 Final:', finalTranscript);
            updateTranscriptionPreview(finalTranscript);
            
            // Send to server
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'transcriptionComplete',
                    transcript: finalTranscript,
                    isFinal: true
                }));
            }
        } else if (interimTranscript) {
            console.log('📝 Interim:', interimTranscript);
            updateTranscriptionPreview(interimTranscript);
        }
    };
    
    recognition.onerror = (event) => {
        console.error('❌ Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
            showNotification('No Speech', 'No speech was detected. Please try again.');
        } else {
            showNotification('Recognition Error', `Error: ${event.error}`);
        }
        stopRecording();
    };
    
    recognition.onend = () => {
        console.log('🎙️ Speech recognition ended');
        if (isRecording) {
            // Restart if still recording
            recognition.start();
        }
    };
    
    try {
        recognition.start();
        return true;
    } catch (error) {
        console.error('❌ Failed to start speech recognition:', error);
        return false;
    }
}

// Updated recording functions with fallback
async function startRecording() {
    if (isRecording) return;
    
    if (!isConnected) {
        showNotification('Not Connected', 'Please connect to server first');
        return;
    }
    
    console.log('🎤 Starting recording...');
    
    try {
        // Request microphone access with optimal settings for Deepgram
        audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                channelCount: 1,
                sampleRate: 16000,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            } 
        });
        
        console.log('🎙️ Microphone access granted');
        
        // Use audio/wav format which works better with Deepgram
        let mimeType = 'audio/wav';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                ? 'audio/webm;codecs=opus' 
                : 'audio/webm';
        }
        
        console.log('🎵 Using audio format:', mimeType);
        
        mediaRecorder = new MediaRecorder(audioStream, {
            mimeType: mimeType,
            audioBitsPerSecond: 128000
        });
        
        let audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
                console.log(`📦 Audio chunk collected: ${event.data.size} bytes`);
            }
        };
        
        mediaRecorder.onstop = async () => {
            console.log('📼 Processing recorded audio...');
            console.log(`📊 Collected ${audioChunks.length} audio chunks`);
            
            if (audioChunks.length === 0) {
                console.error('❌ No audio data collected!');
                showNotification('Recording Error', 'No audio data captured');
                return;
            }
            
            const audioBlob = new Blob(audioChunks, { type: mimeType });
            console.log(`📦 Audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
            
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result.split(',')[1];
                console.log(`📏 Base64 data length: ${base64data.length}`);
                
                if (ws && ws.readyState === WebSocket.OPEN) {
                    console.log('📤 Sending complete audio to server...');
                    
                    // FIXED: Always use current config language
                    const message = {
                        type: 'audioComplete',
                        audio: base64data,
                        mimeType: mimeType,
                        language: config.language || 'fr', // Use current config language
                        duration: audioChunks.length,
                        size: audioBlob.size
                    };
                    
                    console.log('📨 Sending message with language:', message.language);
                    ws.send(JSON.stringify(message));
                } else {
                    console.error('❌ WebSocket not open, cannot send audio');
                    showNotification('Connection Error', 'Lost connection to server');
                }
            };
            
            reader.onerror = (error) => {
                console.error('❌ Failed to read audio blob:', error);
                showNotification('Processing Error', 'Failed to process audio data');
            };
            
            reader.readAsDataURL(audioBlob);
        };
        
        // Start recording
        mediaRecorder.start();
        
        isRecording = true;
        updateRecordingStatus(true);
        
        // Send start signal to server with current language
        if (ws && ws.readyState === WebSocket.OPEN) {
            const startMessage = {
                type: 'startTranscription',
                language: config.language || 'fr', // Use current config language
                audioFormat: mimeType,
                clientType: 'desktop'
            };
            console.log('📤 Sending start transcription message with language:', startMessage.language);
            ws.send(JSON.stringify(startMessage));
        }
        
        if (window.electronAPI) {
            window.electronAPI.sendRecordingStarted();
        }
        
        console.log('✅ Recording started successfully');
        
    } catch (error) {
        console.error('❌ Failed to start recording:', error);
        showNotification('Recording Error', 'Failed to access microphone: ' + error.message);
        isRecording = false;
        updateRecordingStatus(false);
    }
}


window.testLanguageSwitch = (newLanguage) => {
    console.log(`🧪 Testing language switch to: ${newLanguage}`);
    
    if (elements.languageSelect) {
        elements.languageSelect.value = newLanguage;
    }
    
    // Trigger save settings to test the language change
    saveSettings();
};

// NEW: Add debugging for language state
window.checkLanguageState = () => {
    console.log('🌐 Language State Check:');
    console.log(`  Config language: ${config.language}`);
    console.log(`  Form language: ${elements.languageSelect?.value}`);
    console.log(`  Stored language: ${localStorage.getItem('language')}`);
    console.log(`  Connected: ${isConnected}`);
    console.log(`  WebSocket state: ${ws ? ws.readyState : 'null'}`);
};

function stopRecording() {
    if (!isRecording) return;
    
    console.log('🛑 Stopping recording...');
    
    // Stop MediaRecorder (this will trigger onstop event)
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    
    // Stop audio stream
    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
    }
    
    isRecording = false;
    updateRecordingStatus(false);
    
    // Send stop signal to server
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'stopTranscription'
        }));
    }
    
    if (window.electronAPI) {
        window.electronAPI.sendRecordingStopped();
    }
    
    console.log('✅ Recording stopped');
}

// UI update functions
function updateStatus(state, message) {
    console.log(`📊 Status: ${state} - ${message}`);
    
    if (elements.statusText) {
        elements.statusText.textContent = message;
    }
    
    if (elements.statusIndicator) {
        elements.statusIndicator.className = `status-indicator ${state}`;
    }
    
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

function updateTranscriptionPreview(text) {
    if (elements.transcriptionPreview) {
        elements.transcriptionPreview.textContent = text || 'Transcribed text will appear here...';
    }
}

function updateRecordingStatus(isRecording) {
    if (elements.recordingStatus) {
        if (isRecording) {
            elements.recordingStatus.textContent = 'Recording... Release Ctrl+Shift+D to stop';
            elements.recordingStatus.classList.add('active');
        } else {
            elements.recordingStatus.textContent = 'Press Ctrl+Shift+D to start dictation';
            elements.recordingStatus.classList.remove('active');
        }
    }
    
    // Update manual record button if visible
    updateManualRecordButton(isRecording);
    
    console.log(`🎙️ Recording status updated: ${isRecording ? 'Recording' : 'Not recording'}`);
}

function showNotification(title, message) {
    console.log(`📢 ${title}: ${message}`);
    
    // Web notification
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            const notification = new Notification(title, {
                body: message,
                icon: 'assets/icon.png'
            });
            setTimeout(() => notification.close(), 3000);
        } catch (e) {
            console.warn('Web notification failed:', e.message);
        }
    }
    
    // System notification
    if (window.electronAPI?.showSystemNotification) {
        window.electronAPI.showSystemNotification(title, message);
    }
}


// Set up event listeners
function setupEventListeners() {
    console.log('🎛️ Setting up event listeners...');
    
    // Connect button
    if (elements.connectBtn) {
        elements.connectBtn.addEventListener('click', () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                manuallyDisconnected = true;
                reconnectAttempts = 0;
                
                if (reconnectTimeout) {
                    clearTimeout(reconnectTimeout);
                    reconnectTimeout = null;
                }
                
                ws.close();
                isConnected = false;
                updateStatus('disconnected', 'Disconnected');
                console.log('👤 Manual disconnect initiated');
            } else {
                connectWebSocket();
            }
        });
    }
    
    // Save settings button
    if (elements.saveSettings) {
        elements.saveSettings.addEventListener('click', (e) => {
            e.preventDefault();
            saveSettings();
        });
    }
    
    // Settings toggle
    if (elements.settingsToggle) {
        elements.settingsToggle.addEventListener('click', () => {
            elements.settingsPanel?.classList.toggle('hidden');
        });
    }
    
    // Minimize button
    if (elements.minimizeBtn) {
        elements.minimizeBtn.addEventListener('click', () => {
            window.electronAPI?.minimizeToTray();
        });
    }
    
    // Test insertion button
    const testBtn = document.getElementById('testInsertion');
    if (testBtn) {
        testBtn.addEventListener('click', () => {
            const testText = `Test insertion at ${new Date().toLocaleTimeString()} - SyncVoice Medical works!`;
            console.log('🧪 Testing text insertion...');
            showNotification('Test Starting', 'Click in a text editor NOW! Test starts in 3 seconds...');
            setTimeout(() => insertTextAtCursor(testText), 3000);
        });
    }
    
    // Manual recording button
    const manualRecordBtn = document.getElementById('manualRecordBtn');
    if (manualRecordBtn) {
        manualRecordBtn.addEventListener('click', () => {
            if (!isRecording) {
                startRecording();
            } else {
                stopRecording();
            }
        });
    }
    
    // Real-time form updates
    if (elements.serverUrl) {
        elements.serverUrl.addEventListener('input', (e) => {
            config.serverUrl = e.target.value;
        });
    }
    
    if (elements.emailInput) {
        elements.emailInput.addEventListener('input', (e) => {
            config.email = e.target.value;
        });
    }
    
    if (elements.activationCode) {
        elements.activationCode.addEventListener('input', (e) => {
            config.activationCode = e.target.value;
        });
    }
    
    if (elements.languageSelect) {
        elements.languageSelect.addEventListener('change', (e) => {
            config.language = e.target.value;
        });
    }
    
    if (elements.insertMethod) {
        elements.insertMethod.addEventListener('change', (e) => {
            config.insertMethod = e.target.value;
        });
    }
    
    // Auto-connect checkbox listener
    const autoConnectCheckbox = document.getElementById('autoConnect');
    if (autoConnectCheckbox) {
        autoConnectCheckbox.addEventListener('change', (e) => {
            config.autoConnect = e.target.checked;
        });
    }
    
    // Global shortcut handlers
    if (window.electronAPI) {
        try {
            window.electronAPI.onStartRecordingGlobal(() => {
                console.log('🎤 Global shortcut triggered - toggling recording');
                if (!isRecording) {
                    startRecording();
                } else {
                    stopRecording();
                }
            });
        } catch (error) {
            console.error('❌ Failed to attach shortcut handler:', error);
        }
        
        try {
            window.electronAPI.onStartRecordingFromTray(() => {
                console.log('🎤 Tray menu triggered - toggling recording');
                if (!isRecording) {
                    startRecording();
                } else {
                    stopRecording();
                }
            });
        } catch (error) {
            console.error('❌ Failed to attach tray handler:', error);
        }
        
        try {
            window.electronAPI.onShowSettings(() => {
                elements.settingsPanel?.classList.remove('hidden');
            });
        } catch (error) {
            console.error('❌ Failed to attach settings handler:', error);
        }
    }

    const websiteLink = document.getElementById('websiteLink');
if (websiteLink) {
    websiteLink.addEventListener('click', (e) => {
        e.preventDefault();
        const url = 'https://syncvoicemedical.onrender.com';
        
        // Check if electronAPI exists and has openExternal method
        if (window.electronAPI && window.electronAPI.openExternal) {
            window.electronAPI.openExternal(url);
        } else {
            // Fallback for development/testing
            console.warn('electronAPI.openExternal not available, opening in browser');
            window.open(url, '_blank');
        }
    });
}
}

console.log('📜 SyncVoice Medical renderer script loaded');

// Debug functions for console testing
window.testSaveSettings = () => {
    console.log('🧪 Testing save settings...');
    saveSettings();
};

window.testConnection = () => {
    console.log('🧪 Testing connection...');
    connectWebSocket();
};

window.testShortcut = () => {
    console.log('🧪 Testing shortcut manually...');
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
};

window.checkAudioSupport = () => {
    console.log('🎵 Checking audio format support...');
    const formats = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/wav',
        'audio/mp4',
        'audio/mpeg'
    ];
    
    formats.forEach(format => {
        const supported = MediaRecorder.isTypeSupported(format);
        console.log(`  ${format}: ${supported ? '✅ Supported' : '❌ Not supported'}`);
    });
    
    console.log('🌐 Web Speech API:', 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window ? '✅ Available' : '❌ Not available');
};

window.testTranscription = () => {
    console.log('🧪 Testing transcription with sample text...');
    if (ws && ws.readyState === WebSocket.OPEN) {
        const testTranscript = "This is a test transcription from SyncVoice Medical.";
        ws.send(JSON.stringify({
            type: 'transcriptionComplete',
            transcript: testTranscript,
            isFinal: true
        }));
        updateTranscriptionPreview(testTranscript);
        setTimeout(() => insertTextAtCursor(testTranscript), 1000);
    } else {
        console.error('❌ WebSocket not connected');
    }
};

window.checkAudioPermissions = async () => {
    console.log('🎤 Checking audio permissions...');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('✅ Microphone access granted');
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (error) {
        console.error('❌ Microphone access denied:', error);
        return false;
    }
};

window.debugStorage = () => {
    console.log('🔍 Storage debug:');
    const keys = ['serverUrl', 'email', 'activationCode', 'language', 'insertMethod', 'autoConnect'];
    keys.forEach(key => {
        const value = localStorage.getItem(key);
        console.log(`  ${key}: ${key === 'activationCode' && value ? '***' : value}`);
    });
};

window.showManualButton = () => {
    console.log('🔧 Forcing manual button to show...');
    showManualRecordButton();
};

window.toggleDebugMode = () => {
    debugMode = !debugMode;
    console.log(`🔍 Debug mode: ${debugMode ? 'ON' : 'OFF'}`);
};

window.testAudioMessage = () => {
    console.log('🧪 Testing audio message format...');
    if (ws && ws.readyState === WebSocket.OPEN) {
        // Send a minimal audio message to test server response
        const testMessage = {
            type: 'audioData',
            audio: 'dGVzdA==', // base64 for "test"
            mimeType: 'audio/webm',
            language: 'fr',
            isFinal: true
        };
        console.log('📤 Sending test audio message:', testMessage);
        ws.send(JSON.stringify(testMessage));
    } else {
        console.error('❌ WebSocket not connected');
    }
};

window.checkRecordingState = () => {
    console.log('🔍 Recording state check:');
    console.log(`  isRecording: ${isRecording}`);
    console.log(`  mediaRecorder: ${mediaRecorder ? mediaRecorder.state : 'null'}`);
    console.log(`  audioStream: ${audioStream ? 'active' : 'null'}`);
    console.log(`  WebSocket: ${ws ? ws.readyState : 'null'}`);
    console.log(`  Language: ${config.language}`);
};

window.testLocalRecording = async () => {
    console.log('🧪 Testing local recording without server...');
    
    try {
        // Get microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('✅ Microphone access granted');
        
        // Use Web Speech API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error('❌ Speech recognition not supported');
            return;
        }
        
        const recognition = new SpeechRecognition();
        recognition.lang = languageMap[config.language] || 'fr-FR';
        recognition.continuous = false;
        recognition.interimResults = true;
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('📝 Recognized:', transcript);
            updateTranscriptionPreview(transcript);
            
            if (event.results[0].isFinal) {
                console.log('✅ Final transcript:', transcript);
                insertTextAtCursor(transcript);
            }
        };
        
        recognition.onerror = (event) => {
            console.error('❌ Recognition error:', event.error);
        };
        
        recognition.onend = () => {
            console.log('🎤 Recognition ended');
            stream.getTracks().forEach(track => track.stop());
        };
        
        console.log('🎤 Speak now...');
        recognition.start();
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

window.testStreamingAudio = async () => {
    console.log('🧪 Testing streaming audio approach...');
    
    if (!isConnected) {
        console.error('❌ Not connected to server');
        return;
    }
    
    try {
        // Get microphone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        
        // Send start signal
        ws.send(JSON.stringify({
            type: 'startTranscription',
            language: 'fr',
            streaming: true
        }));
        
        // Send chunks as they come
        recorder.ondataavailable = (event) => {
            if (event.data.size > 0 && ws && ws.readyState === WebSocket.OPEN) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result.split(',')[1];
                    ws.send(JSON.stringify({
                        type: 'audioChunk',
                        audio: base64,
                        mimeType: recorder.mimeType
                    }));
                    console.log('📤 Sent audio chunk:', event.data.size, 'bytes');
                };
                reader.readAsDataURL(event.data);
            }
        };
        
        // Start recording with 1 second chunks
        recorder.start(1000);
        console.log('🎤 Streaming started - speak now...');
        
        // Stop after 5 seconds
        setTimeout(() => {
            recorder.stop();
            stream.getTracks().forEach(track => track.stop());
            ws.send(JSON.stringify({ type: 'stopTranscription' }));
            console.log('⏹️ Streaming stopped');
        }, 5000);
        
    } catch (error) {
        console.error('❌ Streaming test failed:', error);
    }
};

// Function to manually reset auto-connect setting
window.resetAutoConnect = () => {
    console.log('🔄 Resetting auto-connect to false...');
    
    const storage = window.electronAPI?.storage || {
        set: (key, value) => localStorage.setItem(key, value)
    };
    
    // Force reset to false
    storage.set('autoConnect', 'false');
    localStorage.setItem('autoConnect', 'false');
    config.autoConnect = false;
    
    // Update checkbox
    const autoConnectCheckbox = document.getElementById('autoConnect');
    if (autoConnectCheckbox) {
        autoConnectCheckbox.checked = false;
    }
    
    console.log('✅ Auto-connect reset to false');
};

// SINGLE DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing SyncVoice Medical Desktop...');
    
    // Initialize elements first
    initializeElements();
    
    // Then load settings
    loadSettings();
    
    // Then setup event listeners
    setupEventListeners();
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    // Auto-connect if enabled (with a small delay to ensure everything is ready)
    setTimeout(() => {
        if (config.autoConnect && config.email && config.activationCode) {
            console.log('🔐 Auto-connecting with saved credentials...');
            connectWebSocket();
        } else {
            console.log('🔌 Auto-connect disabled or missing credentials');
        }
    }, 500);
    
    console.log('✅ SyncVoice Medical Desktop initialized');
});

console.log('📜 SyncVoice Medical renderer script loaded');

window.testWavRecording = async () => {
    console.log('🎤 Testing WAV format recording...');
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        
        let audioData = [];
        
        processor.onaudioprocess = (e) => {
            const channelData = e.inputBuffer.getChannelData(0);
            audioData.push(...channelData);
        };
        
        source.connect(processor);
        processor.connect(audioContext.destination);
        
        console.log('Recording for 3 seconds...');
        
        setTimeout(() => {
            processor.disconnect();
            source.disconnect();
            stream.getTracks().forEach(track => track.stop());
            
            // Convert to WAV
            const wav = audioToWav(audioData, audioContext.sampleRate);
            const base64 = btoa(String.fromCharCode(...new Uint8Array(wav)));
            
            console.log('Sending WAV audio...');
            ws.send(JSON.stringify({
                type: 'audioData',
                audio: base64,
                mimeType: 'audio/wav',
                language: 'en',
                isFinal: true
            }));
        }, 3000);
        
    } catch (error) {
        console.error('❌ WAV recording failed:', error);
    }
};

function audioToWav(audioData, sampleRate) {
    const length = audioData.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
        const sample = Math.max(-1, Math.min(1, audioData[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
    }
    
    return arrayBuffer;
}

window.testDeepgramConnection = async () => {
    console.log('🧪 Testing Deepgram connection from client...');
    
    try {
        // Note: This should be called through your server, not directly
        const response = await fetch('/api/test-deepgram');
        const data = await response.json();
        
        console.log('Deepgram test result:', data);
        
        if (data.success) {
            showNotification('Deepgram Test', 'Connection successful!');
        } else {
            showNotification('Deepgram Test Failed', data.message || 'Connection failed');
        }
        
        return data;
    } catch (error) {
        console.error('❌ Deepgram test error:', error);
        showNotification('Deepgram Test Error', error.message);
        return { success: false, error: error.message };
    }
};