/**
 * SyncVoice Medical - AppForm Layout Patch
 * 
 * This file contains the layout updates for the new button panel design.
 * Add this code to the end of appForm.js or include it as a separate file.
 * 
 * Changes:
 * - Recording status indicator
 * - Updated button text handlers
 * - Character counter
 * - Responsive layout helpers
 */

// =============================================
// Layout Enhancement Functions
// =============================================

/**
 * Initialize the recording status indicator
 */
function initRecordingStatus() {
    const recordingStatus = document.getElementById('recordingStatus');
    const recordingText = document.getElementById('recordingText');
    
    if (!recordingStatus) return;
    
    // Hide by default
    recordingStatus.classList.remove('active');
    
    // Language-specific recording text
    const recordingTexts = {
        fr: 'Enregistrement en cours...',
        en: 'Recording...',
        de: 'Aufnahme läuft...',
        es: 'Grabando...',
        it: 'Registrazione in corso...',
        pt: 'Gravando...'
    };
    
    // Export function to show/hide recording status
    window.showRecordingStatus = function(show, lang = 'fr') {
        if (show) {
            recordingStatus.classList.add('active');
            if (recordingText) {
                recordingText.textContent = recordingTexts[lang] || recordingTexts.en;
            }
        } else {
            recordingStatus.classList.remove('active');
        }
    };
}

/**
 * Initialize character counter for transcription
 */
function initCharacterCounter() {
    const transcriptionText = document.getElementById('transcriptionText');
    const charCount = document.getElementById('charCount');
    
    if (!transcriptionText || !charCount) return;
    
    const charCountTexts = {
        fr: 'caractères',
        en: 'characters',
        de: 'Zeichen',
        es: 'caracteres',
        it: 'caratteri',
        pt: 'caracteres'
    };
    
    function updateCount() {
        const count = transcriptionText.value.length;
        const lang = window.currentLang || 'fr';
        charCount.textContent = `${count} ${charCountTexts[lang] || charCountTexts.en}`;
    }
    
    transcriptionText.addEventListener('input', updateCount);
    
    // Also update when transcription is added programmatically
    const originalValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    Object.defineProperty(transcriptionText, 'value', {
        get: function() {
            return originalValue.get.call(this);
        },
        set: function(val) {
            originalValue.set.call(this, val);
            updateCount();
        }
    });
    
    updateCount();
}

/**
 * Enhanced button state management
 */
function updateButtonStates(isRecording, isPaused = false) {
    const startButton = document.getElementById('startButton');
    const pauseButton = document.getElementById('pauseButton');
    const stopButton = document.getElementById('stopButton');
    
    if (isRecording) {
        startButton?.classList.add('recording');
        startButton && (startButton.disabled = true);
        pauseButton && (pauseButton.disabled = false);
        stopButton && (stopButton.disabled = false);
        
        if (isPaused) {
            pauseButton?.classList.add('active');
        } else {
            pauseButton?.classList.remove('active');
        }
        
        // Show recording status
        if (window.showRecordingStatus) {
            window.showRecordingStatus(!isPaused, window.currentLang || 'fr');
        }
    } else {
        startButton?.classList.remove('recording');
        startButton && (startButton.disabled = false);
        pauseButton && (pauseButton.disabled = true);
        stopButton && (stopButton.disabled = true);
        pauseButton?.classList.remove('active');
        
        // Hide recording status
        if (window.showRecordingStatus) {
            window.showRecordingStatus(false);
        }
    }
}

/**
 * Copy button feedback
 */
function initCopyButtonFeedback() {
    const copyButton = document.getElementById('copyButton');
    if (!copyButton) return;
    
    const originalClick = copyButton.onclick;
    
    copyButton.addEventListener('click', async function() {
        // Add copied state
        copyButton.classList.add('copied');
        
        // Remove after 2 seconds
        setTimeout(() => {
            copyButton.classList.remove('copied');
        }, 2000);
    });
}

/**
 * Update UI text based on language
 */
function updateLayoutTexts(lang) {
    const texts = {
        fr: {
            startBtn: 'Parlez en Français',
            pauseBtn: 'Pause',
            stopBtn: 'Stop',
            copyBtn: 'Copiez tout',
            templateBtn: 'Modèle Word',
            clearBtn: 'Tout Effacer',
            quitBtn: 'Quitter',
            appTitle: 'Transcription Vocale',
            appSubtitle: 'Commencez à dicter pour transcrire votre texte',
            subjectLabel: 'Sujet / Référence:',
            transcriptionLabel: 'Transcription:',
            aiNotice: "* L'IA peut faire des erreurs. Veuillez vérifier.",
            modalTitle: 'Choisissez un modèle'
        },
        en: {
            startBtn: 'Speak in English',
            pauseBtn: 'Pause',
            stopBtn: 'Stop',
            copyBtn: 'Copy all',
            templateBtn: 'Word Template',
            clearBtn: 'Clear All',
            quitBtn: 'Quit',
            appTitle: 'Voice Transcription',
            appSubtitle: 'Start dictating to transcribe your text',
            subjectLabel: 'Subject / Reference:',
            transcriptionLabel: 'Transcription:',
            aiNotice: '* AI can make mistakes. Please verify.',
            modalTitle: 'Choose a template'
        },
        de: {
            startBtn: 'Sprechen Sie Deutsch',
            pauseBtn: 'Pause',
            stopBtn: 'Stop',
            copyBtn: 'Alles kopieren',
            templateBtn: 'Word Vorlage',
            clearBtn: 'Alles löschen',
            quitBtn: 'Beenden',
            appTitle: 'Sprachtranskription',
            appSubtitle: 'Beginnen Sie mit dem Diktieren',
            subjectLabel: 'Betreff / Referenz:',
            transcriptionLabel: 'Transkription:',
            aiNotice: '* KI kann Fehler machen. Bitte überprüfen.',
            modalTitle: 'Vorlage wählen'
        },
        es: {
            startBtn: 'Hable en Español',
            pauseBtn: 'Pausa',
            stopBtn: 'Detener',
            copyBtn: 'Copiar todo',
            templateBtn: 'Plantilla Word',
            clearBtn: 'Borrar todo',
            quitBtn: 'Salir',
            appTitle: 'Transcripción de Voz',
            appSubtitle: 'Comience a dictar para transcribir',
            subjectLabel: 'Asunto / Referencia:',
            transcriptionLabel: 'Transcripción:',
            aiNotice: '* La IA puede cometer errores. Por favor verifique.',
            modalTitle: 'Elegir una plantilla'
        },
        it: {
            startBtn: 'Parla in Italiano',
            pauseBtn: 'Pausa',
            stopBtn: 'Stop',
            copyBtn: 'Copia tutto',
            templateBtn: 'Modello Word',
            clearBtn: 'Cancella tutto',
            quitBtn: 'Esci',
            appTitle: 'Trascrizione Vocale',
            appSubtitle: 'Inizia a dettare per trascrivere',
            subjectLabel: 'Oggetto / Riferimento:',
            transcriptionLabel: 'Trascrizione:',
            aiNotice: "* L'IA può commettere errori. Si prega di verificare.",
            modalTitle: 'Scegli un modello'
        },
        pt: {
            startBtn: 'Fale em Português',
            pauseBtn: 'Pausar',
            stopBtn: 'Parar',
            copyBtn: 'Copiar tudo',
            templateBtn: 'Modelo Word',
            clearBtn: 'Limpar tudo',
            quitBtn: 'Sair',
            appTitle: 'Transcrição de Voz',
            appSubtitle: 'Comece a ditar para transcrever',
            subjectLabel: 'Assunto / Referência:',
            transcriptionLabel: 'Transcrição:',
            aiNotice: '* A IA pode cometer erros. Por favor, verifique.',
            modalTitle: 'Escolha um modelo'
        }
    };
    
    const t = texts[lang] || texts.fr;
    
    // Update button texts
    const startBtnText = document.getElementById('startBtnText');
    const pauseBtnText = document.getElementById('pauseBtnText');
    const stopBtnText = document.getElementById('stopBtnText');
    const copyBtnText = document.getElementById('copyBtnText');
    const templateBtnText = document.getElementById('templateBtnText');
    const clearBtnText = document.getElementById('clearBtnText');
    const quitBtnText = document.getElementById('quitBtnText');
    
    if (startBtnText) startBtnText.textContent = t.startBtn;
    if (pauseBtnText) pauseBtnText.textContent = t.pauseBtn;
    if (stopBtnText) stopBtnText.textContent = t.stopBtn;
    if (copyBtnText) copyBtnText.textContent = t.copyBtn;
    if (templateBtnText) templateBtnText.textContent = t.templateBtn;
    if (clearBtnText) clearBtnText.textContent = t.clearBtn;
    if (quitBtnText) quitBtnText.textContent = t.quitBtn;
    
    // Update labels
    const appTitle = document.getElementById('appTitle');
    const appSubtitle = document.getElementById('appSubtitle');
    const subjectLabel = document.getElementById('subjectLabel');
    const transcriptionLabel = document.getElementById('transcriptionLabel');
    const aiNotice = document.getElementById('aiNotice');
    const modalTitle = document.getElementById('modalTitle');
    
    if (appTitle) appTitle.textContent = t.appTitle;
    if (appSubtitle) appSubtitle.textContent = t.appSubtitle;
    if (subjectLabel) subjectLabel.textContent = t.subjectLabel;
    if (transcriptionLabel) transcriptionLabel.textContent = t.transcriptionLabel;
    if (aiNotice) aiNotice.textContent = t.aiNotice;
    if (modalTitle) modalTitle.textContent = t.modalTitle;
}

/**
 * Initialize all layout enhancements
 */
function initLayoutEnhancements() {
    initRecordingStatus();
    initCharacterCounter();
    initCopyButtonFeedback();
    
    // Get initial language from URL or default
    const urlParams = new URLSearchParams(window.location.search);
    const lang = urlParams.get('lang') || 'fr';
    window.currentLang = lang;
    
    updateLayoutTexts(lang);
    
    console.log('✅ Layout enhancements initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLayoutEnhancements);
} else {
    initLayoutEnhancements();
}

// Export for use in main appForm.js
window.updateButtonStates = updateButtonStates;
window.updateLayoutTexts = updateLayoutTexts;
