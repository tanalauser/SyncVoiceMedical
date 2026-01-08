document.addEventListener('DOMContentLoaded', async () => {
    // Check browser compatibility first
    checkBrowserCompatibility();
    
    // Add browser recommendation banner for Firefox users
    addBrowserRecommendationBanner();

    // MOVED: Translations object to the top to fix ReferenceError
    const translations = {
        fr: {
            speakNow: 'Parlez maintenant',
            countdown: 'Démarrage dans',
            gettingReady: 'Préparation...',
            listeningActive: 'Écoute active',
            speak: 'Parlez en Français',
            pause: 'Pause',
            stop: 'Stop',
            copy: 'Copiez tout dans<br>le presse-papier',
            copied: 'Copié!',
            template: 'Utilisez un modèle<br>Word',
            quit: 'Quitter',
            clearAll: 'Tout Effacer',
            clearSection: 'Effacer',
            placeholder: 'Appuyez sur le bouton "Parlez en Français", attendez que le compte à rebours se termine, puis parlez. Votre transcription apparaîtra ici...',
            confirmQuit: 'Voulez-vous vraiment quitter ? Tout texte non sauvegardé sera perdu.',
            browserSupport: 'Votre navigateur ne supporte pas la transcription vocale.',
            noCode: 'Succès du code d\'activation.',
            aiCanMakeMistakes: "* L'IA peut faire des erreurs. Veuillez vérifier la transcription.",
            libraryNotLoaded: 'Erreur : La bibliothèque de génération de documents n\'est pas chargée.',
            generating: 'Génération...',
            loading: 'Chargement...',
            noText: 'Veuillez d\'abord ajouter du texte à transcrire.',
            docError: 'Erreur lors de la génération du document : ',
            modalTitle: 'Choisissez un modèle',
            initError: 'Erreur d\'initialisation de la reconnaissance vocale.',
            consultationTitle: "CONSULTATION MÉDICALE",
            consultationReason: "MOTIF DE CONSULTATION:",
            consultationHistory: "ANTÉCÉDENTS:",
            consultationExam: "EXAMEN CLINIQUE:",
            consultationConclusion: "CONCLUSION:",
            specialistTitle: "COMPTE RENDU DE CONSULTATION SPÉCIALISÉE",
            specialistSpecialty: "SPÉCIALITÉ:",
            specialistReason: "MOTIF DE CONSULTATION:",
            specialistExams: "EXAMENS COMPLÉMENTAIRES:",
            specialistDiagnosis: "DIAGNOSTIC:",
            specialistRecommendations: "RECOMMANDATIONS:",
            generateButton: 'Générer fichier Word',
            continueEditing: 'Continuer l\'édition',
            exitTemplate: 'Sortir du modèle',
            myAccount: 'Mon Compte',
            upgrade: 'Passer à Premium',
            logout: 'Se déconnecter',
            userLabel: 'Utilisateur',
            statusLabel: 'Statut',
            daysLabel: 'Jours restants',
            trialBadge: 'Essai gratuit',
            premiumBadge: 'Premium',
            appTitle: 'Transcription Vocale',
            appSubtitle: 'Commencez à dicter pour transcrire votre texte',
            subjectLabel: 'Sujet / Référence:',
            subjectPlaceholder: 'Ex: Consultation du 31/07/2025',
            transcriptionLabel: 'Transcription:',
            transcriptionPlaceholder: 'Le texte transcrit apparaîtra ici...',
            footerText: 'Tous droits réservés.'
        },
        en: {
            speakNow: 'Speak now',
            countdown: 'Starting in',
            gettingReady: 'Getting ready...',
            listeningActive: 'Listening',
            speak: 'Speak in English',
            pause: 'Pause',
            stop: 'Stop',
            copy: 'Copy all to<br>clipboard',
            copied: 'Copied!',
            template: 'Use a Word<br>template',
            quit: 'Quit',
            clearAll: 'Clear All',
            clearSection: 'Clear',
            placeholder: 'Press the "Speak in English" button, wait for the countdown to finish, then speak. Your transcription will appear here...',
            confirmQuit: 'Do you really want to quit? Any unsaved text will be lost.',
            browserSupport: 'Your browser does not support voice transcription.',
            noCode: 'Successful activation code.',
            aiCanMakeMistakes: "* AI can make mistakes. Please verify the transcription.",
            libraryNotLoaded: 'Error: Document generation library not loaded.',
            generating: 'Generating...',
            loading: 'Loading...',
            noText: 'Please add text to transcribe first.',
            docError: 'Error generating document: ',
            modalTitle: 'Choose a template',
            initError: 'Error initializing speech recognition.',
            consultationTitle: "MEDICAL CONSULTATION",
            consultationReason: "REASON FOR CONSULTATION:",
            consultationHistory: "HISTORY:",
            consultationExam: "CLINICAL EXAMINATION:",
            consultationConclusion: "CONCLUSION:",
            specialistTitle: "SPECIALIST CONSULTATION REPORT",
            specialistSpecialty: "SPECIALTY:",
            specialistReason: "REASON FOR CONSULTATION:",
            specialistExams: "ADDITIONAL EXAMS:",
            specialistDiagnosis: "DIAGNOSIS:",
            specialistRecommendations: "RECOMMENDATIONS:",
            generateButton: 'Generate Word file',
            continueEditing: 'Continue editing',
            exitTemplate: 'Exit template',
            myAccount: 'My Account',
            upgrade: 'Upgrade to Premium',
            logout: 'Logout',
            userLabel: 'User',
            statusLabel: 'Status',
            daysLabel: 'Days remaining',
            trialBadge: 'Free Trial',
            premiumBadge: 'Premium',
            appTitle: 'Voice Transcription',
            appSubtitle: 'Start dictating to transcribe your text',
            subjectLabel: 'Subject / Reference:',
            subjectPlaceholder: 'Ex: Consultation on 07/31/2025',
            transcriptionLabel: 'Transcription:',
            transcriptionPlaceholder: 'Transcribed text will appear here...',
            footerText: 'All rights reserved.'
        },
        de: {
            speakNow: 'Sprich jetzt',
            countdown: 'Beginnend in',
            gettingReady: 'Vorbereitung...',
            listeningActive: 'Hört zu',
            speak: 'Sprechen Sie in Deutsch',
            pause: 'Pause',
            stop: 'Stopp',
            copy: 'Kopieren Sie alles<br>in die Zwischenablage',
            copied: 'Kopiert!',
            template: 'Eine Word Vorlage<br>verwenden',
            quit: 'Beenden',
            clearAll: 'Alles Löschen',
            clearSection: 'Löschen',
            placeholder: 'Drücken Sie den "Sprechen Sie in Deutsch" Knopf, warten Sie bis der Countdown abgeschlossen ist, dann sprechen Sie. Ihre Transkription erscheint hier...',
            confirmQuit: 'Möchten Sie wirklich beenden? Ungespeicherter Text geht verloren.',
            browserSupport: 'Ihr Browser unterstützt keine Sprachtranskription.',
            noCode: 'Aktivierungscode erforderlich.',
            aiCanMakeMistakes: "* KI kann Fehler machen. Bitte überprüfen Sie die Transkription.",
            libraryNotLoaded: 'Dokumentenerstellungsbibliothek nicht geladen.',
            noText: 'Bitte fügen Sie zuerst Text zum Transkribieren hinzu.',
            docError: 'Fehler beim Erstellen des Dokuments:',
            modalTitle: 'Wählen Sie eine Vorlage.',
            initError: 'Fehler bei der Initialisierung der Spracherkennung.',
            consultationTitle: "ÄRZTLICHE BERATUNG",
            consultationReason: "GRUND FÜR DIE KONSULTATION:",
            consultationHistory: "VORGESCHICHTE:",
            consultationExam: "KLINISCHE UNTERSUCHUNG:",
            consultationConclusion: "SCHLUSSFOLGERUNG:",
            specialistTitle: "SPEZIALISTENBERICHT",
            specialistSpecialty: "FACHGEBIET:",
            specialistReason: "GRUND FÜR DIE KONSULTATION:",
            specialistExams: "ZUSÄTZLICHE UNTERSUCHUNGEN:",
            specialistDiagnosis: "DIAGNOSE:",
            specialistRecommendations: "EMPFEHLUNGEN:",
            generateButton: 'Word-Datei generieren',
            continueEditing: 'Bearbeitung fortsetzen',
            exitTemplate: 'Vorlage verlassen',
            myAccount: 'Mein Konto',
        upgrade: 'Auf Premium upgraden',
        logout: 'Abmelden',
        userLabel: 'Benutzer',
        statusLabel: 'Status',
        daysLabel: 'Verbleibende Tage',
        trialBadge: 'Kostenlose Testversion',
        premiumBadge: 'Premium',
        appTitle: 'Sprachtranskription',
        appSubtitle: 'Beginnen Sie zu diktieren, um Ihren Text zu transkribieren',
        subjectLabel: 'Betreff / Referenz:',
        subjectPlaceholder: 'Beispiel: Beratung am 31.07.2025',
        transcriptionLabel: 'Transkription:',
        transcriptionPlaceholder: 'Der transkribierte Text erscheint hier...',
        footerText: 'Alle Rechte vorbehalten.'
        },
        es: {
            speakNow: 'Habla ahora',
            countdown: 'Comenzando en',
            gettingReady: 'Preparándose...',
            listeningActive: 'Escuchando',
            speak: 'Habla en español',
            pause: 'Pausar',
            stop: 'Detener',
            copy: 'Copiar todo<br>al portapapeles',
            copied: '¡Copiado!',
            template: 'Usar una plantilla<br>de Word',
            quit: 'Salir',
            clearAll: 'Borrar Todo',
            clearSection: 'Borrar',
            placeholder: 'Pulse el botón "Habla en español", espere a que termine la cuenta atrás, luego hable. Su transcripción aparecerá aquí...',
            confirmQuit: '¿Realmente quiere salir? Se perderá cualquier texto no guardado.',
            browserSupport: 'Su navegador no es compatible con la transcripción de voz.',
            noCode: 'Se requiere código de activación.',
            aiCanMakeMistakes: "* La IA puede cometer errores. Por favor, verifique la transcripción.",
            libraryNotLoaded: 'Error: Biblioteca de generación de documentos no cargada.',
            noText: 'Por favor, añada texto para transcribir primero.',
            docError: 'Error al generar el documento:',
            modalTitle: 'Elija una plantilla.',
            initError: 'Error al inicializar el reconocimiento de voz.',
            consultationTitle: "CONSULTA MÉDICA",
            consultationReason: "MOTIVO DE LA CONSULTA:",
            consultationHistory: "ANTECEDENTES:",
            consultationExam: "EXAMEN CLÍNICO:",
            consultationConclusion: "CONCLUSIÓN:",
            specialistTitle: "INFORME DE CONSULTA ESPECIALIZADA",
            specialistSpecialty: "ESPECIALIDAD:",
            specialistReason: "MOTIVO DE LA CONSULTA:",
            specialistExams: "EXÁMENES COMPLEMENTARIOS:",
            specialistDiagnosis: "DIAGNÓSTICO:",
            specialistRecommendations: "RECOMENDACIONES:",
            generateButton: 'Generar archivo Word',
            continueEditing: 'Continuar editando',
            exitTemplate: 'Salir de la plantilla',
            myAccount: 'Mi Cuenta',
        upgrade: 'Actualizar a Premium',
        logout: 'Cerrar sesión',
        userLabel: 'Usuario',
        statusLabel: 'Estado',
        daysLabel: 'Días restantes',
        trialBadge: 'Prueba gratuita',
        premiumBadge: 'Premium',
        appTitle: 'Transcripción de Voz',
        appSubtitle: 'Comience a dictar para transcribir su texto',
        subjectLabel: 'Asunto / Referencia:',
        subjectPlaceholder: 'Ej: Consulta del 31/07/2025',
        transcriptionLabel: 'Transcripción:',
        transcriptionPlaceholder: 'El texto transcrito aparecerá aquí...',
        footerText: 'Todos los derechos reservados.'
        },
        it: {
            speakNow: 'Parla ora',
            countdown: 'Inizio tra',
            gettingReady: 'Mi sto preparando...',
            listeningActive: 'In ascolto',
            speak: 'Parla in italiano',
            pause: 'Pausa',
            stop: 'Ferma',
            copy: 'Copia tutto<br>negli appunti',
            copied: 'Copiato!',
            template: 'Usa un modello<br>Word',
            quit: 'Esci',
            clearAll: 'Cancella Tutto',
            clearSection: 'Cancella',
            placeholder: 'Premi il pulsante "Parla in italiano", attendi il termine del conto alla rovescia, poi parla. La tua trascrizione apparirà qui...',
            confirmQuit: 'Vuoi davvero uscire? Qualsiasi testo non salvato andrà perso.',
            browserSupport: 'Il tuo browser non supporta la trascrizione vocale.',
            noCode: 'Codice di attivazione richiesto.',
            aiCanMakeMistakes: "* L'IA può commettere errori. Si prega di verificare la trascrizione.",
            libraryNotLoaded: 'Errore: Libreria di generazione dei documenti non caricata.',
            noText: 'Si prega di aggiungere prima il testo da trascrivere.',
            docError: 'Errore nella generazione del documento:',
            modalTitle: 'Scegli un modello.',
            initError: 'Errore durante linizializzazione del riconoscimento vocale.',
            consultationTitle: "CONSULTO MEDICO",
            consultationReason: "MOTIVO DELLA CONSULTAZIONE:",
            consultationHistory: "STORIA:",
            consultationExam: "ESAME CLINICO:",
            consultationConclusion: "CONCLUSIONE:",
            specialistTitle: "RAPPORTO DI CONSULTAZIONE SPECIALISTICA",
            specialistSpecialty: "SPECIALITÀ:",
            specialistReason: "MOTIVO DELLA CONSULTAZIONE:",
            specialistExams: "ESAMI COMPLEMENTARI:",
            specialistDiagnosis: "DIAGNOSI:",
            specialistRecommendations: "RACCOMANDAZIONI:",
            generateButton: 'Genera file Word',
            continueEditing: 'Continua a modificare',
            exitTemplate: 'Esci dal modello',
            myAccount: 'Il mio Account',
        upgrade: 'Passa a Premium',
        logout: 'Esci',
        userLabel: 'Utente',
        statusLabel: 'Stato',
        daysLabel: 'Giorni rimanenti',
        trialBadge: 'Prova gratuita',
        premiumBadge: 'Premium',
        appTitle: 'Trascrizione Vocale',
        appSubtitle: 'Inizia a dettare per trascrivere il tuo testo',
        subjectLabel: 'Oggetto / Riferimento:',
        subjectPlaceholder: 'Es: Consultazione del 31/07/2025',
        transcriptionLabel: 'Trascrizione:',
        transcriptionPlaceholder: 'Il testo trascritto apparirà qui...',
        footerText: 'Tutti i diritti riservati.'
        },
        pt: {
            speakNow: 'Fale agora',
            countdown: 'Começando em',
            gettingReady: 'Preparar-se...',
            listeningActive: 'Ouvindo',
            speak: 'Fale em português',
            pause: 'Pausa',
            stop: 'Parar',
            copy: 'Copiar tudo para a<br>área de transferência',
            copied: 'Copiado!',
            template: 'Usar um modelo<br>Word',
            quit: 'Sair',
            clearAll: 'Limpar Tudo',
            clearSection: 'Limpar',
            placeholder: 'Pressione o botão "Fale em português", aguarde a contagem regressiva terminar, então fale. Sua transcrição aparecerá aqui...',
            confirmQuit: 'Tem certeza de que deseja sair? Qualquer texto não salvo será perdido.',
            browserSupport: 'Seu navegador não suporta transcrição de voz.',
            noCode: 'Código de ativção necessário.',
            aiCanMakeMistakes: "* A IA pode cometer erros. Por favor, verifique a transcrição.",
            libraryNotLoaded: 'Erro: Biblioteca de geração de documentos não carregada.',
            noText: 'Por favor, adicione texto para transcrever primeiro.',
            docError: 'Erro ao gerar o documento:',
            modalTitle: 'Escolha um modelo.',
            initError: 'Erro ao inicializar o reconhecimento de voz.',
            consultationTitle: "CONSULTA MÉDICA",
            consultationReason: "MOTIVO DA CONSULTA:",
            consultationHistory: "HISTÓRICO:",
            consultationExam: "EXAME CLÍNICO:",
            consultationConclusion: "CONCLUSÃO:",
            specialistTitle: "RELATÓRIO DE CONSULTA ESPECIALIZADA",
            specialistSpecialty: "ESPECIALIDADE:",
            specialistReason: "MOTIVO DA CONSULTA:",
            specialistExams: "EXAMES COMPLEMENTARES:",
            specialistDiagnosis: "DIAGNÓSTICO:",
            specialistRecommendations: "RECOMENDAÇÕES:",
            generateButton: 'Gerar arquivo Word',
            continueEditing: 'Continuar editando',
            exitTemplate: 'Sair do modelo',
            myAccount: 'Minha Conta',
        upgrade: 'Atualizar para Premium',
        logout: 'Sair',
        userLabel: 'Usuário',
        statusLabel: 'Status',
        daysLabel: 'Dias restantes',
        trialBadge: 'Teste gratuito',
        premiumBadge: 'Premium',
        appTitle: 'Transcrição de Voz',
        appSubtitle: 'Comece a ditar para transcrever seu texto',
        subjectLabel: 'Assunto / Referência:',
        subjectPlaceholder: 'Ex: Consulta de 31/07/2025',
        transcriptionLabel: 'Transcrição:',
        transcriptionPlaceholder: 'O texto transcrito aparecerá aqui...',
        footerText: 'Todos os direitos reservados.'
        }
    };

// Get language using shared module
    let currentLang;
    if (typeof LanguageDetection !== 'undefined' && LanguageDetection.detectLanguage) {
        currentLang = await LanguageDetection.detectLanguage();
        console.log('AppForm: Using shared language detection:', currentLang);
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        currentLang = urlParams.get('lang') || 'fr';
        console.log('AppForm: Fallback language detection:', currentLang);
    }


    const preparationStyles = document.createElement('style');
preparationStyles.textContent = `
    /* Enhanced "getting ready" animation */
    @keyframes preparingPulse {
        0%, 100% { 
            transform: scale(1);
            opacity: 1;
        }
        50% { 
            transform: scale(1.05);
            opacity: 0.8;
        }
    }
    
    /* Enhanced "speak now" animation */
    @keyframes speakNowPulse {
        0%, 100% { 
            transform: scale(1);
            color: #4CAF50;
            text-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
        }
        50% { 
            transform: scale(1.1);
            color: #66BB6A;
            text-shadow: 0 0 30px rgba(76, 175, 80, 0.6);
        }
    }
    
    /* Template mode specific styling */
    .template-mode-countdown {
        background: linear-gradient(135deg, rgba(26, 95, 122, 0.95), rgba(0, 0, 0, 0.9)) !important;
    }
    
    .template-mode-countdown #countdownText {
        border: 2px solid #1976d2;
        padding: 20px;
        border-radius: 10px;
        background: rgba(25, 118, 210, 0.1);
    }
`;
document.head.appendChild(preparationStyles);


function debugRecognitionTiming() {
    console.log('=== RECOGNITION TIMING DEBUG ===');
    console.log('Current time:', new Date().toISOString());
    console.log('Template mode:', templateMode);
    console.log('Is recording:', isRecording);
    console.log('Is starting:', isStarting);
    console.log('Recognition object exists:', !!recognition);
    console.log('Countdown overlay visible:', countdownOverlay.style.display !== 'none');
    console.log('=== END TIMING DEBUG ===');
}

// Make debugging function globally available
window.debugTiming = debugRecognitionTiming;

const betterInstructionTexts = {
    fr: '📢 Cliquez sur "Commencer", attendez le compte à rebours ET le message "PARLEZ MAINTENANT", puis dictez section par section. ⏰ Attendez bien que l\'écoute soit prête !',
    en: '📢 Click "Start", wait for countdown AND "SPEAK NOW" message, then dictate section by section. ⏰ Wait until listening is fully ready!',
    de: '📢 Klicken Sie auf "Start", warten Sie auf den Countdown UND die Nachricht "SPRECHEN SIE JETZT", dann diktieren Sie Abschnitt für Abschnitt. ⏰ Warten Sie, bis das Zuhören bereit ist!',
    es: '📢 Haga clic en "Comenzar", espere la cuenta atrás Y el mensaje "HABLE AHORA", luego dicte sección por sección. ⏰ ¡Espere hasta que la escucha esté lista!',
    it: '📢 Fai clic su "Inizia", aspetta il conto alla rovescia E il messaggio "PARLA ORA", poi detta sezione per sezione. ⏰ Aspetta che l\'ascolto sia pronto!',
    pt: '📢 Clique em "Iniciar", aguarde a contagem regressiva E a mensagem "FALE AGORA", depois dite seção por seção. ⏰ Aguarde até que a escuta esteja pronta!'
};


    document.documentElement.lang = currentLang;
    const t = translations[currentLang] || translations.fr;

    
        // Update navigation
    document.getElementById('myAccountLink').textContent = t.myAccount || 'Mon Compte';
    document.getElementById('upgradeLink').textContent = t.upgrade || 'Passer à Premium';
    document.getElementById('logoutLink').textContent = t.logout || 'Se déconnecter';
    
    // Update form labels
    document.getElementById('userLabel').textContent = t.userLabel || 'Utilisateur';
    document.getElementById('statusLabel').textContent = t.statusLabel || 'Statut';
    document.getElementById('daysLabel').textContent = t.daysLabel || 'Jours restants';
    document.getElementById('appTitle').textContent = t.appTitle || 'Transcription Vocale';
    document.getElementById('appSubtitle').textContent = t.appSubtitle || 'Commencez à dicter pour transcrire votre texte';
    document.getElementById('subjectLabel').textContent = t.subjectLabel || 'Sujet / Référence:';
    document.getElementById('transcriptionLabel').textContent = t.transcriptionLabel || 'Transcription:';
    document.getElementById('footerText').textContent = t.footerText || 'Tous droits réservés.';
    
    // Update placeholders
    document.getElementById('subjectInput').placeholder = t.subjectPlaceholder || 'Ex: Consultation du 31/07/2025';
    document.getElementById('transcriptionText').placeholder = t.transcriptionPlaceholder || 'Le texte transcrit apparaîtra ici...';
    
    // Update badge text
    // Update badge text
    const accountTypeBadge = document.getElementById('accountTypeBadge');
    if (accountTypeBadge) {
        if (accountTypeBadge.classList.contains('trial-badge')) {
            accountTypeBadge.textContent = t.trialBadge || 'Essai gratuit';
        } else if (accountTypeBadge.classList.contains('premium-badge')) {
            accountTypeBadge.textContent = t.premiumBadge || 'Premium';
        }
    }

    // Language mapping for Web Speech API
    const languageMap = {
        'fr': 'fr-FR',
        'en': 'en-US',
        'de': 'de-DE',
        'es': 'es-ES',
        'it': 'it-IT',
        'pt': 'pt-PT'
    };


    let recognition = null;
    let isRecording = false;
    let isStarting = false;
    let isResuming = false;
    let lastProcessedIndex = 0;
    let processingTimeout = null;
    let lastAddedText = '';
    let recognitionStartupTimeout = null; // FIXED: No more window.recognitionStartupTimeout

    let hasUsedSpeechBefore = false;
let activeInputField = null;
const subjectInput = document.getElementById('subjectInput');

// Initialize buttons and elements
    const startButton = document.getElementById('startButton');
    const pauseButton = document.getElementById('pauseButton');
    const stopButton = document.getElementById('stopButton');
    const transcriptionText = document.getElementById('transcriptionText');
    const copyButton = document.getElementById('copyButton');
    const templateButton = document.getElementById('templateButton');
    const quitButton = document.getElementById('quitButton');
    const clearButton = document.getElementById('clearButton');
    const modal = document.getElementById('templateModal');
    const modalTitle = document.getElementById('templateModalTitle');
    const closeModal = document.querySelector('.close-modal');
    const templateItems = document.querySelectorAll('.template-item');
    const aiCanMakeMistakesMessage = document.getElementById('AICanMakeMistakes_message');


    // NEW: Function to track which input field is focused
function setupInputFieldTracking() {
    // Track when subject input is focused
    if (subjectInput) {
        subjectInput.addEventListener('focus', () => {
            activeInputField = 'subject';
            console.log('Subject input focused - transcription will go here');
        });
        
        subjectInput.addEventListener('blur', () => {
            // Don't immediately clear - give a small delay in case user is just clicking start button
            setTimeout(() => {
                if (document.activeElement !== startButton) {
                    activeInputField = null;
                }
            }, 100);
        });
    }
    
    // Track when main transcription area is focused
    if (transcriptionText) {
        transcriptionText.addEventListener('focus', () => {
            activeInputField = 'transcription';
            console.log('Transcription area focused - transcription will go here');
        });
        
        transcriptionText.addEventListener('blur', () => {
            setTimeout(() => {
                if (document.activeElement !== startButton) {
                    activeInputField = null;
                }
            }, 100);
        });
    }
}

//Function to add transcription to the correct field
// NEW: Function to add transcription to the correct field
function addTranscriptionToActiveField(transcript) {
    // Validate input
    if (!transcript || transcript.trim() === '') {
        console.log('Empty transcript received, skipping');
        return;
    }
    
    const cleanTranscript = transcript.trim();
    console.log(`Processing transcript: "${cleanTranscript}" | Active field: ${activeInputField} | Template mode: ${templateMode}`);
    
    // Priority 1: If subject input field is focused and active
    if (activeInputField === 'subject' && subjectInput) {
        console.log('Adding transcription to subject input field');
        
        // Add proper spacing if there's already text
        if (subjectInput.value && !subjectInput.value.endsWith(' ')) {
            subjectInput.value += ' ';
        }
        
        // Add the transcript
        subjectInput.value += cleanTranscript;
        
        // Trigger input event to ensure any listeners are notified
        subjectInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Focus back to the input to maintain cursor position
        subjectInput.focus();
        
        console.log(`Successfully added to subject field: "${cleanTranscript}"`);
        return;
    }
    
    // Priority 2: If in template mode, use template logic
    if (templateMode) {
        console.log('Adding transcription to template mode');
        try {
            processTemplateTranscript(cleanTranscript);
            console.log('Successfully processed template transcript');
        } catch (error) {
            console.error('Error processing template transcript:', error);
        }
        return;
    }
    
    // Priority 3: Normal transcription mode (default)
    console.log('Adding transcription to main transcription area');
    
    // Add proper spacing if there's already text
    if (transcriptionText.value && !transcriptionText.value.endsWith(' ')) {
        transcriptionText.value += ' ';
    }
    
    // Add the transcript
    transcriptionText.value += cleanTranscript;
    
    // Trigger input event
    transcriptionText.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Auto-scroll to bottom to show new text
    transcriptionText.scrollTop = transcriptionText.scrollHeight;
    
    console.log(`Successfully added to main transcription area: "${cleanTranscript}"`);
}

    // Add this function after your variable declarations
function resetRecognitionState() {
        console.log('=== RESETTING RECOGNITION STATE ===');
        
        // Clear any pending timeouts
        if (processingTimeout) {
            clearTimeout(processingTimeout);
            processingTimeout = null;
        }
        
        if (recognitionStartupTimeout) { // FIXED: Use local variable
            clearTimeout(recognitionStartupTimeout);
            recognitionStartupTimeout = null;
        }
        
        // Reset tracking variables
        lastProcessedIndex = 0;
        lastAddedText = '';
        
        // Stop recognition if active
        if (recognition) {
            try {
                recognition.abort();
            } catch (e) {
                console.log('Error aborting recognition:', e);
            }
            recognition = null;
        }
        
        // Reset UI state
        isRecording = false;
        isStarting = false;
        isResuming = false;
        
        console.log('State reset complete');
    }

// Call this function before creating new recognition
function ensureCleanStart() {
    resetRecognitionState();
    
    // Small delay to ensure everything is cleaned up
    return new Promise(resolve => setTimeout(resolve, 100));
}

    
    // Create elements for the countdown overlay - with better cleanup
    const countdownOverlay = document.createElement('div');
countdownOverlay.className = 'countdown-overlay';
countdownOverlay.id = 'mainCountdownOverlay';
countdownOverlay.style.cssText = `
    display: none;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 200px;
    height: 200px;
    background-color: rgba(0, 0, 0, 0.9);
    z-index: 9999;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    color: white;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
`;
    
    const countdownText = document.createElement('div');
    countdownText.id = 'countdownText';
    countdownText.style.cssText = `
        margin-bottom: 10px;
        font-size: 0.9em;
        text-align: center;
        padding: 0 10px;
    `;
    
    const countdownNumber = document.createElement('div');
    countdownNumber.id = 'countdownNumber';
    countdownNumber.style.cssText = `
        font-size: 3em;
        font-weight: bold;
    `;
    
    countdownOverlay.appendChild(countdownText);
    countdownOverlay.appendChild(countdownNumber);
    
    // Check if overlay already exists before appending
    const existingOverlay = document.getElementById('mainCountdownOverlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    document.body.appendChild(countdownOverlay);

    // Disable Pause and Stop buttons initially
    pauseButton.disabled = true;
    stopButton.disabled = true;

    // Section tracking
    let currentSection = 'reason';
    let previousTranscript = '';
    const sectionContent = {
        reason: '',
        history: '',
        exam: '',
        conclusion: '',
        specialty: '',
        additionalExams: '',
        diagnosis: '',
        recommendations: ''
    };

    let selectedTemplate = '';
    let templateMode = false;
    
    // Enhanced section commands - exact match versions for each language
    const exactSectionCommands = {
        fr: {
            reason: ['motif de consultation'],
            history: ['antécédents', 'antécédent', 'antecedents', 'antecedent'],
            exam: ['examen clinique'],
            conclusion: ['conclusion'],
            specialty: ['spécialité'],
            additionalExams: ['examens complémentaires'],
            diagnosis: ['diagnostic'],
            recommendations: ['recommandations']
        },
        en: {
            reason: ['reason for consultation'],
            history: ['history'],
            exam: ['clinical examination'],
            conclusion: ['conclusion'],
            specialty: ['specialty'],
            additionalExams: ['additional exams'],
            diagnosis: ['diagnosis'],
            recommendations: ['recommendations']
        },
        de: {
            reason: ['grund für die konsultation'],
            history: ['vorgeschichte'],
            exam: ['klinische untersuchung'],
            conclusion: ['schlussfolgerung'],
            specialty: ['fachgebiet'],
            additionalExams: ['zusätzliche untersuchungen'],
            diagnosis: ['diagnose'],
            recommendations: ['empfehlungen']
        },
        es: {
            reason: ['motivo de consulta'],
            history: ['antecedentes'],
            exam: ['examen clínico'],
            conclusion: ['conclusión'],
            specialty: ['especialidad'],
            additionalExams: ['exámenes complementarios'],
            diagnosis: ['diagnóstico'],
            recommendations: ['recomendaciones']
        },
        it: {
            reason: ['motivo della consultazione'],
            history: ['storia'],
            exam: ['esame clinico'],
            conclusion: ['conclusione'],
            specialty: ['specialità'],
            additionalExams: ['esami complementari'],
            diagnosis: ['diagnosi'],
            recommendations: ['raccomandazioni']
        },
        pt: {
            reason: ['motivo da consulta'],
            history: ['história'],
            exam: ['exame clínico'],
            conclusion: ['conclusão'],
            specialty: ['especialidade'],
            additionalExams: ['exames complementares'],
            diagnosis: ['diagnóstico'],
            recommendations: ['recomendações']
        }
    };

    // Add to translations object for each language - includes variations and partial matches
    const sectionCommands = {
        fr: {
            reason: ['motif de consultation', 'motif'],  // Keep "motif" as partial match
            history: ['antécédents', 'antécédent', 'histoire', 'antecedents', 'antecedent'],
            exam: ['examen', 'examen clinique'],
            conclusion: ['conclusion'],
            specialty: ['spécialité'],
            additionalExams: ['examens complémentaires', 'examens additionnels'],
            diagnosis: ['diagnostic'],
            recommendations: ['recommandations']
        },
        en: {
            reason: ['reason', 'reason for consultation', 'consultation reason'],
            history: ['history', 'medical history', 'patient history'],
            exam: ['examination', 'clinical examination', 'clinical exam', 'exam'],
            conclusion: ['conclusion'],
            specialty: ['specialty', 'speciality'],
            additionalExams: ['additional exams', 'additional examinations', 'further tests'],
            diagnosis: ['diagnosis'],
            recommendations: ['recommendations', 'recommendations and treatment']
        },
        de: {
            reason: ['grund', 'konsultationsgrund'],
            history: ['vorgeschichte', 'anamnese'],
            exam: ['untersuchung', 'klinische untersuchung'],
            conclusion: ['schlussfolgerung'],
            specialty: ['fachgebiet', 'spezialgebiet'],
            additionalExams: ['zusätzliche untersuchungen', 'weitere untersuchungen'],
            diagnosis: ['diagnose'],
            recommendations: ['empfehlungen']
        },
        es: {
            reason: ['motivo', 'motivo de consulta'],
            history: ['antecedentes', 'historia'],
            exam: ['examen', 'examen clínico'],
            conclusion: ['conclusión'],
            specialty: ['especialidad'],
            additionalExams: ['exámenes complementarios', 'pruebas adicionales'],
            diagnosis: ['diagnóstico'],
            recommendations: ['recomendaciones']
        },
        it: {
            reason: ['motivo', 'motivo della consultazione'],
            history: ['storia', 'anamnesi'],
            exam: ['esame', 'esame clinico'],
            conclusion: ['conclusione'],
            specialty: ['specialità'],
            additionalExams: ['esami complementari', 'esami aggiuntivi'],
            diagnosis: ['diagnosi'],
            recommendations: ['raccomandazioni']
        },
        pt: {
            reason: ['motivo', 'motivo da consulta'],
            history: ['história', 'antecedentes'],
            exam: ['exame', 'exame clínico'],
            conclusion: ['conclusão'],
            specialty: ['especialidade'],
            additionalExams: ['exames complementares', 'exames adicionais'],
            diagnosis: ['diagnóstico'],
            recommendations: ['recomendações']
        }
    };

    const templateTranslations = {
        fr: {
            modalTitle: 'Choisissez un modèle',
            generateButton: 'Générer fichier Word',
            templates: {
                consultation: {
                    title: 'Consultation Médicale',
                    description: 'Modèle pour une consultation médicale standard'
                },
                specialist: {
                    title: 'Consultation Spécialisée',
                    description: 'Modèle pour une consultation avec un spécialiste'
                },
                surgery: {
                    title: 'Chirurgie',
                    description: 'Modèle pour un rapport chirurgical'
                },
                prescription: {
                    title: 'Ordonnance',
                    description: 'Modèle pour une ordonnance médicale'
                }
            }
        },
        en: {
            modalTitle: 'Choose a template',
            generateButton: 'Generate Word file',
            templates: {
                consultation: {
                    title: 'Medical Consultation',
                    description: 'Template for a standard medical consultation'
                },
                specialist: {
                    title: 'Specialist Consultation',
                    description: 'Template for a consultation with a specialist'
                },
                surgery: {
                    title: 'Surgery',
                    description: 'Template for a surgical report'
                },
                prescription: {
                    title: 'Prescription',
                    description: 'Template for a medical prescription'
                }
            }
        },
        de: {
            modalTitle: 'Wählen Sie eine Vorlage',
            generateButton: 'Word-Datei generieren',
            templates: {
                consultation: {
                    title: 'Ärztliche Sprechstunde',
                    description: 'Vorlage für eine standardmäßige ärztliche Beratung'
                },
                specialist: {
                    title: 'Facharztberatung',
                    description: 'Vorlage für eine Beratung beim Facharzt'
                },
                surgery: {
                    title: 'Operation',
                    description: 'Vorlage für einen Operationsbericht'
                },
                prescription: {
                    title: 'Rezept',
                    description: 'Vorlage für ein ärztliches Rezept'
                }
            }
        },
        es: {
            modalTitle: 'Elija una plantilla',
            generateButton: 'Generar archivo Word',
            templates: {
                consultation: {
                    title: 'Consulta Médica',
                    description: 'Plantilla para una consulta médica estándar'
                },
                specialist: {
                    title: 'Consulta Especializada',
                    description: 'Plantilla para una consulta con un especialista'
                },
                surgery: {
                    title: 'Cirugía',
                    description: 'Plantilla para un informe quirúrgico'
                },
                prescription: {
                    title: 'Receta',
                    description: 'Plantilla para una receta médica'
                }
            }
        },
        it: {
            modalTitle: 'Scegli un modello',
            generateButton: 'Genera file Word',
            templates: {
                consultation: {
                    title: 'Visita Medica',
                    description: 'Modello per una visita medica standard'
                },
                specialist: {
                    title: 'Visita Specialistica',
                    description: 'Modello per una visita specialistica'
                },
                surgery: {
                    title: 'Chirurgia',
                    description: 'Modello per un referto chirurgico'
                },
                prescription: {
                    title: 'Prescrizione',
                    description: 'Modello per una prescrizione medica'
                }
            }
        },
        pt: {
            modalTitle: 'Escolha um modelo',
            generateButton: 'Gerar arquivo Word',
            templates: {
                consultation: {
                    title: 'Consulta Médica',
                    description: 'Modelo para uma consulta médica padrão'
                },
                specialist: {
                    title: 'Consulta Especializada',
                    description: 'Modelo para uma consulta com especialista'
                },
                surgery: {
                    title: 'Cirurgia',
                    description: 'Modelo para um relatório cirúrgico'
                },
                prescription: {
                    title: 'Receita',
                    description: 'Modelo para uma receita médica'
                }
            }
        }
    };

    // Browser compatibility check function
    function checkBrowserCompatibility() {
        console.log('=== Browser Compatibility Check ===');
        console.log('User Agent:', navigator.userAgent);
        
        const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
        const isEdge = /Edg/.test(navigator.userAgent);
        const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
        const isFirefox = /Firefox/.test(navigator.userAgent);
        
        console.log('Browser detection:', { isChrome, isEdge, isSafari, isFirefox });
        
        // Check if Web Speech API is supported
        const hasSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        console.log('Speech Recognition API available:', hasSpeechRecognition);
        
        if (isFirefox && !hasSpeechRecognition) {
            showFirefoxInstructions();
            return false;
        }
        
        if (!hasSpeechRecognition) {
            const messages = {
                fr: 'Votre navigateur ne supporte pas la reconnaissance vocale. Veuillez utiliser Chrome, Edge ou Safari.',
                en: 'Your browser does not support speech recognition. Please use Chrome, Edge, or Safari.'
            };
            
            const lang = currentLang || 'fr';
            alert(messages[lang] || messages['fr']);
            
            if (startButton) {
                startButton.disabled = true;
                startButton.style.opacity = '0.5';
                startButton.style.cursor = 'not-allowed';
            }
            
            return false;
        }
        
        return true;
    }

    function showFirefoxInstructions() {
        // Simplified Firefox instructions
        const lang = currentLang || 'fr';
        const message = lang === 'fr' 
            ? 'Firefox ne supporte pas la reconnaissance vocale. Utilisez Chrome, Edge ou Safari.'
            : 'Firefox does not support speech recognition. Please use Chrome, Edge, or Safari.';
        
        alert(message);
    }

    // Add a browser recommendation banner at the top of the page
    function addBrowserRecommendationBanner() {
        if (/Firefox/.test(navigator.userAgent)) {
            const lang = currentLang || 'fr';
            const message = lang === 'fr'
                ? '🔊 Pour une meilleure expérience, nous recommandons Chrome, Edge ou Safari.'
                : '🔊 For the best experience, we recommend Chrome, Edge, or Safari.';
            
            const banner = document.createElement('div');
            banner.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #ff6b35;
                color: white;
                padding: 10px;
                text-align: center;
                z-index: 9999;
                font-size: 14px;
            `;
            banner.textContent = message;
            
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '✕';
            closeBtn.style.cssText = `
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
            `;
            closeBtn.addEventListener('click', () => {
                document.body.removeChild(banner);
                document.body.style.paddingTop = '0';
            });
            
            banner.appendChild(closeBtn);
            document.body.appendChild(banner);
            document.body.style.paddingTop = '40px';
        }
    }

    // Enhanced microphone access function
    async function checkMicrophoneAccess() {
        try {
            // First check if we're on HTTPS (required for getUserMedia)
            if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
                console.error('HTTPS required for microphone access');
                throw new Error('HTTPS required');
            }
            
            // Check if getUserMedia is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error('getUserMedia not supported');
                throw new Error('getUserMedia not supported');
            }
            
            // Request microphone permission with specific constraints
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });
            
            // Log audio track info
            const audioTracks = stream.getAudioTracks();
            console.log('Audio tracks:', audioTracks.length);
            audioTracks.forEach(track => {
                console.log('Track:', {
                    label: track.label,
                    enabled: track.enabled,
                    muted: track.muted,
                    readyState: track.readyState
                });
            });
            
            // Microphone access granted, close the stream
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error('Microphone access error:', error);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            
            // Provide specific error messages
            if (error.name === 'NotAllowedError') {
                showNotification('Microphone permission denied. Please allow microphone access and refresh the page.', 'error');
            } else if (error.name === 'NotFoundError') {
                showNotification('No microphone found. Please connect a microphone and refresh the page.', 'error');
            } else if (error.message === 'HTTPS required') {
                showNotification('This site must be accessed via HTTPS to use the microphone.', 'error');
            } else {
                showNotification('Microphone access failed: ' + error.message, 'error');
            }
            
            return false;
        }
    }

    // Show notification function
    function showNotification(message, type = 'info') {
        // Remove any existing notification
        const existingNotification = document.querySelector('.speech-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'speech-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: ${type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
            color: white;
            padding: 16px;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    function createRecognition() {
    console.log('=== Creating Speech Recognition Instance ===');
    
    // Check for both webkit and standard SpeechRecognition APIs - FIREFOX SUPPORT
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.error('SpeechRecognition API not available');
        
        // Check if Firefox and provide specific guidance
        if (/Firefox/.test(navigator.userAgent)) {
            showFirefoxInstructions();
        } else {
            const lang = currentLang || 'fr';
            const message = translations[lang]?.browserSupport || 'Your browser does not support speech recognition.';
            alert(message);
        }
        return null;
    }
    
    try {
        const recognitionInstance = new SpeechRecognition();
        
        // Configure recognition
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = languageMap[currentLang] || 'fr-FR';
        recognitionInstance.maxAlternatives = 1;
        
        // Add Firefox-specific configuration if detected
        if (/Firefox/.test(navigator.userAgent)) {
            console.log('Applying Firefox-specific configuration');
            // Firefox may need different settings
            recognitionInstance.continuous = true;
            recognitionInstance.interimResults = false; // Firefox may have issues with interim results
        }
        
        console.log('Recognition settings:', {
            continuous: recognitionInstance.continuous,
            interimResults: recognitionInstance.interimResults,
            lang: recognitionInstance.lang,
            maxAlternatives: recognitionInstance.maxAlternatives
        });
        
        console.log('Using SpeechRecognition API:', SpeechRecognition === window.SpeechRecognition ? 'Standard' : 'Webkit');
    
        // FIXED: onstart handler with consistent state management
        // FIXED: onstart handler with consistent state management
        // FIXED: onstart handler with consistent state management
        recognitionInstance.onstart = function() {
    console.log('=== SPEECH RECOGNITION STARTED ===');
    console.log('Recognition started at:', new Date().toISOString());
    console.log('Template mode:', templateMode);
    
    // Clear timeout since recognition started successfully
    if (recognitionStartupTimeout) {
        clearTimeout(recognitionStartupTimeout);
        recognitionStartupTimeout = null;
    }
    
    // Clear the starting flag and set recording flag
    isStarting = false;
    isRecording = true;
    
    const t = translations[currentLang] || translations.fr;
    
    // Add failsafe timeout to ensure overlay is hidden
    const failsafeTimeout = setTimeout(() => {
        console.log('Failsafe: Force hiding countdown overlay');
        countdownOverlay.style.display = 'none';
        if (typeof resetCountdownStyles === 'function') {
            resetCountdownStyles();
        }
        enableRecordingButtons();
        showRecordingIndicator();
    }, 5000); // Maximum 5 seconds before force hiding
    
    // FIXED: Immediately enable recording when recognition starts
    // Enable UI right away so speech can be captured
    enableRecordingButtons();
    showRecordingIndicator();
    console.log('🎤 MICROPHONE ACTIVE - You can speak NOW! Recording enabled immediately.');
    
    // Show "SPEAK NOW" very briefly then hide overlay immediately
    countdownText.textContent = t.speakNow || 'PARLEZ MAINTENANT';
    countdownText.style.fontSize = '4em';
    countdownText.style.color = '#4CAF50';
    countdownText.style.animation = 'speakNowPulse 1s infinite';
    countdownNumber.style.display = 'none';
    
    // Hide overlay after just 200ms - recognition is already active
    setTimeout(() => {
        clearTimeout(failsafeTimeout); // Clear failsafe since we're hiding normally
        countdownOverlay.style.display = 'none';
        resetCountdownStyles();
        console.log('Overlay hidden, speech recognition fully active');
    }, 200); // Hide after just 0.2 seconds
};

function resetCountdownStyles() {
    // Reset styles for next time
    countdownText.style.fontSize = '2em';
    countdownText.style.color = 'white';
    countdownText.style.animation = 'none';
    countdownNumber.style.display = 'block';
}

function showRecordingIndicator() {
    // Show recording indicator
    const recordingIndicator = document.getElementById('recordingIndicator');
    if (recordingIndicator) {
        recordingIndicator.classList.add('active');
    }
}
        
        // Handle recognition results
        recognitionInstance.onresult = function(event) {
    console.log('=== SPEECH RECOGNITION RESULT ===');
    console.log('Result index:', event.resultIndex, 'Results length:', event.results.length);
    
    // Process all results from resultIndex onwards
    for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        
        if (result.isFinal) {
            const transcript = result[0].transcript.trim();
            
            if (transcript) {
                console.log(`Final transcript: "${transcript}"`);
                
                // REPLACE the existing transcription logic with this:
                addTranscriptionToActiveField(transcript);
            }
        } else {
            // Log interim results for debugging
            console.log('Interim result:', result[0].transcript);
        }
    }
};

        // Enhanced error handling
        recognitionInstance.onerror = function(event) {
            console.error('=== SPEECH RECOGNITION ERROR ===');
            console.error('Error type:', event.error);
            console.error('Error message:', event.message);
            console.error('Full event:', event);
            
            // FIXED: Clear local timeout variable instead of window.recognitionStartupTimeout
            if (recognitionStartupTimeout) {
                clearTimeout(recognitionStartupTimeout);
                recognitionStartupTimeout = null;
            }
            
            // Provide user-friendly error messages based on error type
            const errorMessages = {
                'no-speech': {
                    fr: 'Aucune parole détectée. Assurez-vous que votre microphone fonctionne et parlez clairement.',
                    en: 'No speech detected. Please ensure your microphone is working and speak clearly.',
                    de: 'Keine Sprache erkannt. Bitte stellen Sie sicher, dass Ihr Mikrofon funktioniert.',
                    es: 'No se detectó voz. Asegúrese de que su micrófono funcione correctamente.',
                    it: 'Nessun discorso rilevato. Assicurati che il microfono funzioni correttamente.',
                    pt: 'Nenhuma fala detectada. Certifique-se de que seu microfone está funcionando.'
                },
                'not-allowed': {
                    fr: 'Permission du microphone refusée. Veuillez autoriser l\'accès au microphone.',
                    en: 'Microphone permission denied. Please allow microphone access.',
                    de: 'Mikrofonberechtigung verweigert. Bitte erlauben Sie den Mikrofonzugriff.',
                    es: 'Permiso de micrófono denegado. Por favor, permita el acceso al micrófono.',
                    it: 'Permesso microfono negato. Consentire l\'accesso al microfono.',
                    pt: 'Permissão do microfone negada. Por favor, permita o acesso ao microfone.'
                },
                'network': {
                    fr: 'Erreur réseau. Vérifiez votre connexion Internet.',
                    en: 'Network error. Please check your internet connection.',
                    de: 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.',
                    es: 'Error de red. Por favor, verifique su conexión a Internet.',
                    it: 'Errore di rete. Controlla la tua connessione Internet.',
                    pt: 'Erro de rede. Verifique sua conexão com a Internet.'
                },
                'audio-capture': {
                    fr: 'Impossible de capturer l\'audio. Vérifiez que votre microphone est connecté.',
                    en: 'Unable to capture audio. Please check your microphone is connected.',
                    de: 'Audio kann nicht erfasst werden. Bitte überprüfen Sie Ihr Mikrofon.',
                    es: 'No se puede capturar audio. Verifique que su micrófono esté conectado.',
                    it: 'Impossibile acquisire l\'audio. Verifica che il microfono sia collegato.',
                    pt: 'Não foi possível capturar áudio. Verifique se o microfone está conectado.'
                },
                'service-not-allowed': {
                    fr: 'Service de reconnaissance vocale non autorisé sur cet appareil.',
                    en: 'Speech recognition service not allowed on this device.',
                    de: 'Spracherkennungsdienst auf diesem Gerät nicht erlaubt.',
                    es: 'Servicio de reconocimiento de voz no permitido en este dispositivo.',
                    it: 'Servizio di riconoscimento vocale non consentito su questo dispositivo.',
                    pt: 'Serviço de reconhecimento de voz não permitido neste dispositivo.'
                },
                'bad-grammar': {
                    fr: 'Erreur de configuration de la reconnaissance vocale.',
                    en: 'Speech recognition configuration error.',
                    de: 'Konfigurationsfehler der Spracherkennung.',
                    es: 'Error de configuración del reconocimiento de voz.',
                    it: 'Errore di configurazione del riconoscimento vocale.',
                    pt: 'Erro de configuração do reconhecimento de voz.'
                }
            };
            
            // Get the appropriate error message
            const errorType = event.error;
            const lang = currentLang || 'fr';
            const errorMessageSet = errorMessages[errorType] || errorMessages['no-speech'];
            const errorMessage = errorMessageSet[lang] || errorMessageSet['fr'];
            
            // Handle startup errors specially (Android compatibility)
            if (isStarting) {
                isStarting = false;
                countdownOverlay.style.display = 'none';
                countdownNumber.style.display = 'block';
                
                // Show specific startup error message
                if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
                    showNotification(errorMessage, 'error');
                } else {
                    const startupErrorMessages = {
                        fr: 'Impossible de démarrer la reconnaissance vocale. Votre appareil peut ne pas supporter cette fonctionnalité.',
                        en: 'Unable to start speech recognition. Your device may not support this feature.',
                        de: 'Spracherkennung kann nicht gestartet werden. Ihr Gerät unterstützt diese Funktion möglicherweise nicht.',
                        es: 'No se puede iniciar el reconocimiento de voz. Su dispositivo puede no admitir esta función.',
                        it: 'Impossibile avviare il riconoscimento vocale. Il dispositivo potrebbe non supportare questa funzione.',
                        pt: 'Não é possível iniciar o reconhecimento de voz. Seu dispositivo pode não suportar este recurso.'
                    };
                    showNotification(startupErrorMessages[lang] || startupErrorMessages['fr'], 'error');
                }
                resetButtons();
                return;
            }
            
            // Don't show repetitive "no-speech" errors during normal operation
            if (errorType === 'no-speech') {
                // Only show the error once, not repeatedly
                if (!this.noSpeechErrorShown) {
                    this.noSpeechErrorShown = true;
                    // Show a subtle notification instead of alert
                    showNotification(errorMessage, 'warning');
                }
            } else {
                // For other errors, show immediately
                showNotification(errorMessage, 'error');
                this.noSpeechErrorShown = false;
            }
            
            resetButtons();
            
            // For critical errors, stop recognition completely
            if (errorType === 'not-allowed' || errorType === 'audio-capture' || errorType === 'service-not-allowed') {
                isRecording = false;
                if (recognition) {
                    recognition.abort();
                }
            }
        };
    
        // Handle end of recognition
        recognitionInstance.onend = function() {
            console.log('=== RECOGNITION ENDED ===');
            
            // FIXED: Clear local timeout variable instead of window.recognitionStartupTimeout
            if (recognitionStartupTimeout) {
                clearTimeout(recognitionStartupTimeout);
                recognitionStartupTimeout = null;
            }
            
            // Handle startup failures (Android compatibility)
            if (isStarting) {
                console.log('Recognition ended during startup - likely failed to start');
                isStarting = false;
                countdownOverlay.style.display = 'none';
                countdownNumber.style.display = 'block';
                resetButtons();
                
                // Show startup failure message
                const startupFailureMessages = {
                    fr: 'Échec du démarrage de la reconnaissance vocale. Veuillez réessayer.',
                    en: 'Speech recognition failed to start. Please try again.',
                    de: 'Spracherkennung konnte nicht gestartet werden. Bitte versuchen Sie es erneut.',
                    es: 'No se pudo iniciar el reconocimiento de voz. Inténtelo de nuevo.',
                    it: 'Impossibile avviare il riconoscimento vocale. Riprova.',
                    pt: 'Falha ao iniciar o reconhecimento de voz. Tente novamente.'
                };
                const lang = currentLang || 'fr';
                showNotification(startupFailureMessages[lang] || startupFailureMessages['fr'], 'error');
                return;
            }
            
            if (isRecording) {
                // Restart recognition if still recording (with improved Android compatibility)
                setTimeout(() => {
                    if (isRecording && recognition) {
                        try {
                            console.log('Restarting recognition...');
                            recognition.start();
                        } catch (restartError) {
                            console.error('Error restarting recognition:', restartError);
                            resetButtons();
                            
                            const restartErrorMessages = {
                                fr: 'Erreur lors de la reprise de la reconnaissance vocale.',
                                en: 'Error resuming speech recognition.',
                                de: 'Fehler beim Fortsetzen der Spracherkennung.',
                                es: 'Error al reanudar el reconocimiento de voz.',
                                it: 'Errore nel riprendere il riconoscimento vocale.',
                                pt: 'Erro ao retomar o reconhecimento de voz.'
                            };
                            const lang = currentLang || 'fr';
                            showNotification(restartErrorMessages[lang] || restartErrorMessages['fr'], 'error');
                        }
                    }
                }, 300); // Increased delay for better Android compatibility
            } else {
                resetButtons();
            }
        };
        
        return recognitionInstance;
        
    } catch (error) {
        console.error('Error creating recognition instance:', error);
        
        if (/Firefox/.test(navigator.userAgent)) {
            showFirefoxInstructions();
        }
        
        return null;
    }
}


    // Function to show countdown before starting recognition
    function startWithCountdown() {
    console.log('=== PRODUCTION DEBUG START ===');
    console.log('Current URL:', window.location.href);
    console.log('Template mode:', templateMode);
    
    const t = translations[currentLang] || translations.fr;
    
    // Ensure clean state before starting
    resetRecognitionState();
    
    // Check microphone access first
    checkMicrophoneAccess().then(hasAccess => {
        console.log('Microphone access check result:', hasAccess);
        
        if (!hasAccess) {
            const lang = currentLang || 'fr';
            const messages = {
                fr: 'Veuillez autoriser l\'accès au microphone pour utiliser la transcription vocale.',
                en: 'Please allow microphone access to use voice transcription.',
                de: 'Bitte erlauben Sie den Mikrofonzugriff für die Sprachtranskription.',
                es: 'Por favor, permita el acceso al micrófono para usar la transcripción de voz.',
                it: 'Consentire l\'accesso al microfono per utilizzare la trascrizione vocale.',
                pt: 'Por favor, permita o acesso ao microfone para usar a transcrição de voz.'
            };
            showNotification(messages[lang] || messages['fr'], 'error');
            resetButtons();
            return;
        }
        
        try {
            // Create fresh recognition instance
            recognition = createRecognition();
            if (!recognition) {
                console.error('Failed to create recognition instance');
                resetButtons();
                return;
            }
            
            // If resuming after pause, skip countdown
            if (isResuming) {
                console.log("Resuming after pause - skipping countdown");
                isResuming = false;
                isRecording = true;
                
                try {
                    recognition.start();
                    enableRecordingButtons();
                } catch (error) {
                    console.error('Error resuming recognition:', error);
                    resetButtons();
                }
                return;
            }

            // FIXED: Always show countdown in template mode to help users know when to speak
            // Only skip countdown for normal transcription mode after first use
            const shouldShowCountdown = templateMode || !hasUsedSpeechBefore;
            
            if (!shouldShowCountdown) {
                console.log("Normal mode, speech used before - skipping countdown");
                isRecording = true;
                
                try {
                    recognition.start();
                    enableRecordingButtons();
                } catch (error) {
                    console.error('Error starting recognition without countdown:', error);
                    resetButtons();
                }
                return;
            }
            
            // Show countdown (always for template mode, first time for normal mode)
            isStarting = true;
            if (!templateMode) {
                hasUsedSpeechBefore = true; // Only set flag for normal mode
            }
            
            // Enhanced countdown display - REDUCED FONT SIZES TO FIT 200x200 BOX
            countdownText.textContent = t.countdown;
            countdownText.style.fontSize = '0.85em';
            countdownText.style.fontWeight = 'bold';
            countdownText.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
            
            countdownNumber.textContent = '3';
            countdownNumber.style.fontSize = '3.5em';
            countdownNumber.style.fontWeight = 'bold';
            countdownNumber.style.color = '#ff6b35';
            countdownNumber.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
            
            // Show overlay with improved visibility
            countdownOverlay.style.display = 'flex';
            countdownOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)'; // More opaque
            
            // Start countdown with 3 seconds for better user preparation
            let count = 3;
            const countdownInterval = setInterval(() => {
                count--;
                if (count > 0) {
                    countdownNumber.textContent = count.toString();
                    // Change color as countdown progresses
                    if (count === 2) countdownNumber.style.color = '#f39c12';
                    if (count === 1) countdownNumber.style.color = '#e74c3c';
                } else {
                    clearInterval(countdownInterval);
                    
                    // Update to "Getting ready..." message
                    countdownText.textContent = t.gettingReady || "Getting ready...";
                    countdownText.style.fontSize = '0.8em';
                    countdownNumber.style.display = 'none';
                    
                    // Add a preparation delay before starting recognition
                    setTimeout(() => {
                        startSpeechRecognitionWithFeedback();
                    }, 500); // Small delay to ensure user is ready
                }
            }, 1000);
            
        } catch (error) {
            console.error('Error in startWithCountdown:', error);
            resetButtons();
            isStarting = false;
            countdownOverlay.style.display = 'none';
            showErrorNotification(error);
        }
    }).catch(error => {
        console.error('Microphone access check failed:', error);
        resetButtons();
    });
}


//Separate function to start recognition with better feedback
function startSpeechRecognitionWithFeedback() {
    const t = translations[currentLang] || translations.fr;
    
    // Set a timeout to handle cases where recognition never starts
    recognitionStartupTimeout = setTimeout(() => {
        console.error('Speech recognition failed to start within timeout period');
        isStarting = false;
        countdownOverlay.style.display = 'none';
        countdownNumber.style.display = 'block';
        resetButtons();
        
        const errorMessages = {
            fr: 'Impossible de démarrer la reconnaissance vocale. Veuillez réessayer.',
            en: 'Unable to start speech recognition. Please try again.',
            de: 'Spracherkennung konnte nicht gestartet werden. Bitte versuchen Sie es erneut.',
            es: 'No se pudo iniciar el reconocimiento de voz. Inténtelo de nuevo.',
            it: 'Impossibile avviare il riconoscimento vocale. Riprova.',
            pt: 'Não foi possível iniciar o reconhecimento de voz. Tente novamente.'
        };
        const lang = currentLang || 'fr';
        showNotification(errorMessages[lang] || errorMessages['fr'], 'error');
    }, 10000);
    
    // Try to start recognition
    try {
        console.log('Calling recognition.start()...');
        recognition.start();
        console.log('recognition.start() called successfully');
        
    } catch (startError) {
        console.error('Error starting recognition:', error);
        handleRecognitionStartError(startError);
    }
}

function handleRecognitionStartError(error) {
    // Clear the timeout since we got an immediate error
    if (recognitionStartupTimeout) {
        clearTimeout(recognitionStartupTimeout);
        recognitionStartupTimeout = null;
    }
    
    // Reset state
    isStarting = false;
    isRecording = false;
    countdownOverlay.style.display = 'none';
    countdownNumber.style.display = 'block';
    resetButtons();
    
    // Show specific error message
    const startErrorMessages = {
        fr: 'Erreur lors du démarrage de la reconnaissance vocale. Veuillez vérifier vos paramètres.',
        en: 'Error starting speech recognition. Please check your settings.',
        de: 'Fehler beim Starten der Spracherkennung. Überprüfen Sie Ihre Einstellungen.',
        es: 'Error al iniciar el reconocimiento de voz. Verifique su configuración.',
        it: 'Errore nell\'avvio del riconoscimento vocale. Controlla le impostazioni.',
        pt: 'Erro ao iniciar o reconhecimento de voz. Verifique suas configurações.'
    };
    const lang = currentLang || 'fr';
    showNotification(startErrorMessages[lang] || startErrorMessages['fr'], 'error');
}

    // Function to process template transcript - SIMPLIFIED to use cursor position
    function processTemplateTranscript(transcript) {
        console.log("Processing template transcript:", transcript);
        
        // Simply add the transcript to the current section (determined by cursor position)
        // The currentSection is updated when user clicks/focuses on a section
        addContentToCurrentSection(transcript);
        console.log(`Added to ${currentSection}: "${transcript}"`);
    }
    
    // Function to update the sectionContent object from editable divs
    function updateSectionContentFromDOM() {
        document.querySelectorAll('.section-content').forEach(element => {
            const section = element.dataset.section;
            if (section) {
                sectionContent[section] = element.textContent.trim();
            }
        });
    }

    // Function to highlight the active section
    function highlightSection(section) {
        // Remove highlight from all sections
        document.querySelectorAll('.section-content, .section-header').forEach(el => {
            el.classList.remove('active-section');
        });
        
        // Add highlight to the current section
        const sectionElement = document.getElementById(`${section}-content`);
        const sectionHeaderElement = document.getElementById(`section-${section}`);
        
        if (sectionElement) {
            sectionElement.classList.add('active-section');
        }
        
        if (sectionHeaderElement) {
            sectionHeaderElement.classList.add('active-section');
        }
    }

    // Function to add content to current section - Simplified for Android
    function addContentToCurrentSection(text) {
        if (!text || text.trim() === '') return;
        
        const cleanText = text.trim();
        const currentContent = sectionContent[currentSection] || '';
        
        // Simple check: don't add if exact text already exists at the end
        if (currentContent.endsWith(cleanText)) {
            console.log('Text already exists at end, skipping');
            return;
        }
        
        // Add the new text
        console.log(`Adding to section ${currentSection}: "${cleanText}"`);
        
        if (currentContent) {
            sectionContent[currentSection] = currentContent + ' ' + cleanText;
        } else {
            sectionContent[currentSection] = cleanText;
        }
        
        // Update display
        const sectionContentElement = document.getElementById(`${currentSection}-content`);
        if (sectionContentElement) {
            sectionContentElement.textContent = sectionContent[currentSection];
        }
    }

    // Function to update the displayed text in a section
    function updateTemplateSectionDisplay(section) {
        const sectionContentElement = document.getElementById(`${section}-content`);
        if (sectionContentElement) {
            sectionContentElement.textContent = sectionContent[section];
        }
    }


    // Reset button states
    function resetButtons() {
        startButton.disabled = false;
        pauseButton.disabled = true;
        stopButton.disabled = true;
        startButton.classList.remove('recording');
        isRecording = false; // FIXED: Use individual variable consistently
    }

    function enableRecordingButtons() {
        startButton.disabled = true;
        pauseButton.disabled = false;
        stopButton.disabled = false;
        startButton.classList.add('recording');
        isRecording = true; // FIXED: Use individual variable consistently
    }

    function updateUIText() {
        const t = translations[currentLang] || translations.fr;
        startButton.querySelector('.btn-text').innerHTML = t.speak;
        pauseButton.querySelector('.btn-text').innerHTML = t.pause;
        stopButton.querySelector('.btn-text').innerHTML = t.stop;
        copyButton.querySelector('.btn-text').innerHTML = t.copy;
        templateButton.querySelector('.btn-text').innerHTML = t.template;
        quitButton.querySelector('.btn-text').innerHTML = t.quit;
        clearButton.textContent = t.clearAll;
        transcriptionText.placeholder = t.placeholder;
        aiCanMakeMistakesMessage.innerHTML = t.aiCanMakeMistakes;
    }

    // Function to create template sections - UPDATED to make all content areas editable
    // Complete createTemplateSections function with all improvements
function createTemplateSections(templateType) {
    console.log('Creating template sections for:', templateType);
    
    templateMode = true;
    selectedTemplate = templateType;
    
    // Clear section content
    Object.keys(sectionContent).forEach(key => {
        sectionContent[key] = '';
    });
    
    const t = translations[currentLang] || translations.fr;
    let templateHTML = '';
    
    // Helper function to create section header with clear button
    function createSectionHeader(sectionId, title) {
        return `
            <div class="section-header-container">
                <div id="section-${sectionId}" class="section-header" data-section="${sectionId}">[${title.replace(':', '')}]</div>
                <button type="button" id="clear-${sectionId}" class="clear-section-btn" data-section="${sectionId}">${t.clearSection || 'Clear'}</button>
            </div>
        `;
    }
    
    // Template sections HTML generation based on template type
    switch(templateType) {
        case 'consultation':
            templateHTML = `
                ${createSectionHeader('reason', t.consultationReason)}
                <div id="reason-content" class="section-content" data-section="reason" contenteditable="true" placeholder=""></div>
                
                ${createSectionHeader('history', t.consultationHistory)}
                <div id="history-content" class="section-content" data-section="history" contenteditable="true" placeholder=""></div>
                
                ${createSectionHeader('exam', t.consultationExam)}
                <div id="exam-content" class="section-content" data-section="exam" contenteditable="true" placeholder=""></div>
                
                ${createSectionHeader('conclusion', t.consultationConclusion)}
                <div id="conclusion-content" class="section-content" data-section="conclusion" contenteditable="true" placeholder=""></div>
            `;
            currentSection = 'reason';
            break;
            
        case 'specialist':
            templateHTML = `
                ${createSectionHeader('specialty', t.specialistSpecialty)}
                <div id="specialty-content" class="section-content" data-section="specialty" contenteditable="true" placeholder=""></div>
                
                ${createSectionHeader('reason', t.specialistReason)}
                <div id="reason-content" class="section-content" data-section="reason" contenteditable="true" placeholder=""></div>
                
                ${createSectionHeader('additionalExams', t.specialistExams)}
                <div id="additionalExams-content" class="section-content" data-section="additionalExams" contenteditable="true" placeholder=""></div>
                
                ${createSectionHeader('diagnosis', t.specialistDiagnosis)}
                <div id="diagnosis-content" class="section-content" data-section="diagnosis" contenteditable="true" placeholder=""></div>
                
                ${createSectionHeader('recommendations', t.specialistRecommendations)}
                <div id="recommendations-content" class="section-content" data-section="recommendations" contenteditable="true" placeholder=""></div>
            `;
            currentSection = 'specialty';
            break;
            
        case 'surgery':
            templateHTML = `
                ${createSectionHeader('specialty', t.specialistSpecialty)}
                <div id="specialty-content" class="section-content" data-section="specialty" contenteditable="true" placeholder=""></div>
                
                ${createSectionHeader('reason', t.specialistReason)}
                <div id="reason-content" class="section-content" data-section="reason" contenteditable="true" placeholder=""></div>
                
                ${createSectionHeader('additionalExams', t.specialistExams)}
                <div id="additionalExams-content" class="section-content" data-section="additionalExams" contenteditable="true" placeholder=""></div>
                
                ${createSectionHeader('diagnosis', t.specialistDiagnosis)}
                <div id="diagnosis-content" class="section-content" data-section="diagnosis" contenteditable="true" placeholder=""></div>
                
                ${createSectionHeader('recommendations', t.specialistRecommendations)}
                <div id="recommendations-content" class="section-content" data-section="recommendations" contenteditable="true" placeholder=""></div>
            `;
            currentSection = 'specialty';
            break;
            
        case 'prescription':
            templateHTML = `
                ${createSectionHeader('specialty', t.specialistSpecialty)}
                <div id="specialty-content" class="section-content" data-section="specialty" contenteditable="true" placeholder=""></div>
                
                ${createSectionHeader('reason', t.specialistReason)}
                <div id="reason-content" class="section-content" data-section="reason" contenteditable="true" placeholder=""></div>
                
                ${createSectionHeader('diagnosis', t.specialistDiagnosis)}
                <div id="diagnosis-content" class="section-content" data-section="diagnosis" contenteditable="true" placeholder=""></div>
                
                ${createSectionHeader('recommendations', t.specialistRecommendations)}
                <div id="recommendations-content" class="section-content" data-section="recommendations" contenteditable="true" placeholder=""></div>
            `;
            currentSection = 'specialty';
            break;
            
        default:
            console.error('Unknown template type:', templateType);
            return;
    }
    
    // Hide the original textarea
    transcriptionText.style.display = 'none';
    
    // Create template container
    const templateContainer = document.createElement('div');
    templateContainer.id = 'template-container';
    templateContainer.className = 'template-container';
    
    // Create and add instruction banner
    const templateInstruction = document.createElement('div');
    templateInstruction.className = 'template-instruction';
    templateInstruction.style.cssText = `
        background: linear-gradient(135deg, #e3f2fd, #bbdefb);
        border: 2px solid #1976d2;
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        font-weight: 600;
        color: #1976d2;
        text-align: center;
        font-size: 1.1em;
        box-shadow: 0 4px 12px rgba(25, 118, 210, 0.15);
        animation: slideInDown 0.5s ease-out;
    `;
    
    // Instruction text based on language
    const lang = currentLang || 'fr';
    const instructionTexts = {
        fr: '📢 Cliquez sur "Commencer", attendez le compte à rebours, placez votre curseur dans la section concernée et dictez section par section.',
        en: '📢 Click "Speak in English", wait for countdown, put your cursor in the relevant section and dictate section by section.',
        de: '📢 Klicken Sie auf "Start", warten Sie auf den Countdown, setzen Sie den Cursor in den entsprechenden Abschnitt und diktieren Sie Abschnitt für Abschnitt.',
        es: '📢 Haga clic en "Comenzar", espere la cuenta atrás, coloque el cursor en la sección correspondiente y dicte sección por sección.',
        it: '📢 Fai clic su "Inizia", aspetta il conto alla rovescia, posiziona il cursore nella sezione pertinente e detta sezione per sezione.',
        pt: '📢 Clique em "Iniciar", aguarde a contagem regressiva, coloque o cursor na seção relevante e dite seção por seção.'
    };
    
    templateInstruction.innerHTML = `
        <div style="margin-bottom: 10px;">${instructionTexts[lang] || instructionTexts['fr']}</div>
    `;
    
    // Set the HTML content
    templateContainer.appendChild(templateInstruction);
    templateContainer.innerHTML += templateHTML;
    
    // Add CSS styles for template sections
    const templateStyles = document.createElement('style');
    templateStyles.id = 'template-styles';
    templateStyles.textContent = `
        .template-container {
            margin-top: 1rem;
        }
        
        .section-header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 1rem;
            margin-bottom: 0.5rem;
        }
        
        .section-header {
            font-weight: 700;
            font-size: 0.95rem;
            color: #334155;
            cursor: pointer;
            padding: 0.5rem 0;
            transition: color 0.2s;
        }
        
        .section-header:hover {
            color: #0e7c86;
        }
        
        .section-header.active-section {
            color: #0e7c86;
        }
        
        .section-content {
            width: 100%;
            min-height: 60px;
            padding: 0.75rem 1rem;
            border: 2px solid #e2e8f0;
            border-radius: 0.5rem;
            font-size: 1rem;
            line-height: 1.6;
            background: #f8fafc;
            transition: all 0.2s;
            outline: none;
        }
        
        .section-content:focus {
            border-color: #0e7c86;
            background: #ffffff;
            box-shadow: 0 0 0 3px rgba(14, 124, 134, 0.1);
        }
        
        .section-content.active-section {
            border-color: #0e7c86;
            background: #ffffff;
            box-shadow: 0 0 0 3px rgba(14, 124, 134, 0.1);
        }
        
        .clear-section-btn {
            background: none;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
            color: #64748b;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .clear-section-btn:hover {
            background: #fee2e2;
            border-color: #ef4444;
            color: #ef4444;
        }
        
        #generateWordBtn {
            background: #69B578 !important;
            color: white !important;
            border: none !important;
        }
        
        #generateWordBtn:hover {
            background: #5a9d68 !important;
        }
        
        #exitTemplateBtn {
            background: #d32f2f !important;
            color: white !important;
            border: none !important;
        }
        
        #exitTemplateBtn:hover {
            background: #b71c1c !important;
        }
    `;
    
    // Remove existing template styles if present
    const existingStyles = document.getElementById('template-styles');
    if (existingStyles) {
        existingStyles.remove();
    }
    document.head.appendChild(templateStyles);
    
    // Add the template container to the transcription area
    const transcriptionContainer = document.querySelector('.transcription-container');
    transcriptionContainer.appendChild(templateContainer);
    
    // Create template action buttons
    const existingGenerateBtn = document.getElementById('generateWordBtn');
    const existingExitBtn = document.getElementById('exitTemplateBtn');
    
    // Remove existing buttons if they exist
    if (existingGenerateBtn) existingGenerateBtn.remove();
    if (existingExitBtn) existingExitBtn.remove();
    
    // Find the quit button to insert template buttons after it
    const quitButton = document.getElementById('quitButton');
    
    // Create Generate Word button
    const generateWordBtn = document.createElement('button');
    generateWordBtn.type = 'button';
    generateWordBtn.id = 'generateWordBtn';
    generateWordBtn.className = 'btn action-btn';
    generateWordBtn.style.backgroundColor = '#69B578';
    generateWordBtn.style.marginLeft = '0.5rem';
    generateWordBtn.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
            <path d="M14 8V2l6 6h-6z"/>
            <path d="M5 12.5h14M5 16.5h14M5 8.5h8"/>
        </svg>
        <span class="btn-text">${t.generateButton || 'Generate Word file'}</span>
    `;
    
    // Create Exit Template button
    const exitTemplateBtn = document.createElement('button');
    exitTemplateBtn.type = 'button';
    exitTemplateBtn.id = 'exitTemplateBtn';
    exitTemplateBtn.className = 'btn action-btn';
    exitTemplateBtn.style.backgroundColor = '#d32f2f';
    exitTemplateBtn.style.marginLeft = '0.5rem';
    exitTemplateBtn.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
        </svg>
        <span class="btn-text">${t.exitTemplate || 'Exit template'}</span>
    `;
    
    // Insert the buttons after the quit button
    if (quitButton && quitButton.parentNode) {
        quitButton.insertAdjacentElement('afterend', generateWordBtn);
        generateWordBtn.insertAdjacentElement('afterend', exitTemplateBtn);
    }
    
    // Add event listeners to template action buttons
    generateWordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Generate Word button clicked');
        
        // Update section content from the editable divs before generating document
        updateSectionContentFromDOM();
        
        // Check if there's any content
        const hasContent = Object.values(sectionContent).some(content => content.trim().length > 0);
        if (!hasContent) {
            const noContentMessages = {
                fr: 'Veuillez ajouter du contenu avant de générer le document.',
                en: 'Please add content before generating the document.',
                de: 'Bitte fügen Sie Inhalt hinzu, bevor Sie das Dokument generieren.',
                es: 'Por favor, agregue contenido antes de generar el documento.',
                it: 'Aggiungi contenuto prima di generare il documento.',
                pt: 'Adicione conteúdo antes de gerar o documento.'
            };
            alert(noContentMessages[lang] || noContentMessages['fr']);
            return;
        }
        
        generateWordDocument(templateType);
    });
    
    exitTemplateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Exit template button clicked');
        
        const confirmMessages = {
            fr: 'Voulez-vous vraiment quitter le mode modèle ? Le contenu sera perdu.',
            en: 'Do you really want to exit template mode? Content will be lost.',
            de: 'Möchten Sie den Vorlagenmodus wirklich verlassen? Der Inhalt geht verloren.',
            es: '¿Realmente quiere salir del modo plantilla? El contenido se perderá.',
            it: 'Vuoi davvero uscire dalla modalità modello? Il contenuto andrà perso.',
            pt: 'Você realmente quer sair do modo modelo? O conteúdo será perdido.'
        };
        
        if (confirm(confirmMessages[lang] || confirmMessages['fr'])) {
            exitTemplateMode();
        }
    });
    
    // Add click event listeners to section headers for navigation
    document.querySelectorAll('.section-header').forEach(element => {
        element.addEventListener('click', () => {
            const section = element.dataset.section;
            if (section) {
                selectSection(section);
                console.log('Section selected via header click:', section);
            }
        });
    });
    
    // Add event listeners to clear section buttons
    document.querySelectorAll('.clear-section-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent click from selecting the section
            const section = button.dataset.section;
            if (section) {
                const confirmMessages = {
                    fr: `Effacer le contenu de cette section ?`,
                    en: `Clear this section's content?`,
                    de: `Inhalt dieses Abschnitts löschen?`,
                    es: `¿Borrar el contenido de esta sección?`,
                    it: `Cancellare il contenuto di questa sezione?`,
                    pt: `Limpar o conteúdo desta seção?`
                };
                
                if (confirm(confirmMessages[lang] || confirmMessages['fr'])) {
                    clearSection(section);
                    console.log('Section cleared:', section);
                }
            }
        });
    });
    
    // Add event listeners for editable content areas
    document.querySelectorAll('.section-content').forEach(contentElement => {
        // Update the sectionContent object when user manually edits
        contentElement.addEventListener('input', () => {
            const section = contentElement.dataset.section;
            if (section) {
                sectionContent[section] = contentElement.textContent.trim();
                console.log(`Section ${section} updated via manual edit:`, sectionContent[section].substring(0, 50) + '...');
            }
        });
        
        // Handle click to focus and select section
        contentElement.addEventListener('click', () => {
            const section = contentElement.dataset.section;
            if (section) {
                selectSection(section);
                console.log('Section selected via content click:', section);
            }
        });
        
        // Handle focus event
        contentElement.addEventListener('focus', () => {
            const section = contentElement.dataset.section;
            if (section) {
                selectSection(section);
                console.log('Section focused:', section);
            }
        });
        
        // Add placeholder behavior for contenteditable divs
        const placeholder = contentElement.getAttribute('placeholder');
        if (placeholder) {
            // Set initial placeholder
            if (!contentElement.textContent.trim()) {
                contentElement.classList.add('empty');
                contentElement.setAttribute('data-placeholder', placeholder);
            }
            
            // Handle placeholder display
            contentElement.addEventListener('focus', () => {
                if (contentElement.classList.contains('empty')) {
                    contentElement.classList.remove('empty');
                }
            });
            
            contentElement.addEventListener('blur', () => {
                if (!contentElement.textContent.trim()) {
                    contentElement.classList.add('empty');
                }
            });
        }
    });
    
    // Add CSS for placeholder behavior
    const placeholderStyle = document.createElement('style');
    placeholderStyle.textContent = `
        .section-content.empty:before {
            content: attr(data-placeholder);
            color: #999;
            font-style: italic;
            pointer-events: none;
        }
        .section-content.empty:focus:before {
            display: none;
        }
    `;
    document.head.appendChild(placeholderStyle);
    
    // Highlight the initial section and provide visual feedback
    selectSection(currentSection);
    
    // Show template mode notification
    const templateMessages = {
        fr: `Mode modèle activé: ${templateType}. Commencez par "${currentSection}".`,
        en: `Template mode activated: ${templateType}. Start with "${currentSection}".`,
        de: `Vorlagenmodus aktiviert: ${templateType}. Beginnen Sie mit "${currentSection}".`,
        es: `Modo plantilla activado: ${templateType}. Comience con "${currentSection}".`,
        it: `Modalità modello attivata: ${templateType}. Inizia con "${currentSection}".`,
        pt: `Modo modelo ativado: ${templateType}. Comece com "${currentSection}".`
    };
    
    showNotification(templateMessages[lang] || templateMessages['fr'], 'info');
    
    console.log('Template sections created successfully for:', templateType);
    console.log('Current section set to:', currentSection);
    console.log('Available sections:', Object.keys(sectionContent));
}
    
    // Function to handle selecting sections based on click
    function selectSection(section) {
        // Save any modifications from the current section before switching
        const currentSectionElement = document.getElementById(`${currentSection}-content`);
        if (currentSectionElement) {
            sectionContent[currentSection] = currentSectionElement.textContent.trim();
        }
        
        // Update the current section
        currentSection = section;
        
        // Remove highlight from all sections
        document.querySelectorAll('.section-content, .section-header').forEach(el => {
            el.classList.remove('active-section');
        });
        
        // Add highlight to the selected section
        const sectionContentElement = document.getElementById(`${section}-content`);
        const sectionHeaderElement = document.getElementById(`section-${section}`);
        
        if (sectionContentElement) {
            sectionContentElement.classList.add('active-section');
            // Focus the content element for editing
            sectionContentElement.focus();
        }
        
        if (sectionHeaderElement) {
            sectionHeaderElement.classList.add('active-section');
        }
        
        console.log(`Selected section: ${section}`);
    }

    // Function to clear a specific section
    function clearSection(section) {
        sectionContent[section] = '';
        const sectionElement = document.getElementById(`${section}-content`);
        if (sectionElement) {
            sectionElement.textContent = '';
        }
        console.log(`Cleared section: ${section}`);
    }

    // Function to exit template mode and return to normal transcription
    function exitTemplateMode() {
        templateMode = false;
        
        // Remove template container
        const templateContainer = document.getElementById('template-container');
        if (templateContainer) {
            templateContainer.remove();
        }
        
        // Remove individual template action buttons
        const generateWordBtn = document.getElementById('generateWordBtn');
        if (generateWordBtn) {
            generateWordBtn.remove();
        }
        
        const exitTemplateBtn = document.getElementById('exitTemplateBtn');
        if (exitTemplateBtn) {
            exitTemplateBtn.remove();
        }
        
        // Show the original textarea again
        transcriptionText.style.display = 'block';
        
        // Reset section contents
        Object.keys(sectionContent).forEach(key => {
            sectionContent[key] = '';
        });

        
    }

    // Event listeners for control buttons
    startButton.addEventListener('click', () => {
        startWithCountdown(); // Use countdown function instead of direct start
    });

    pauseButton.addEventListener('click', () => {
        try {
            if (recognition) {
                recognition.stop();
                isRecording = false;
                isResuming = true; // Set flag to indicate we're paused and will resume
                resetButtons();
                
                // Clear processing timeout
                if (processingTimeout) {
                    clearTimeout(processingTimeout);
                    processingTimeout = null;
                }
                
                console.log('PAUSED - Ready to resume');
            }
        } catch (error) {
            console.error('Error pausing recognition:', error);
            resetButtons();
            isResuming = false;
        }
    });

    stopButton.addEventListener('click', () => {
        try {
            if (recognition) {
                recognition.stop();
                isRecording = false;
                recognition = null;
                resetButtons();
                
                // Clear processing timeout
                if (processingTimeout) {
                    clearTimeout(processingTimeout);
                    processingTimeout = null;
                }
                
                // Reset tracking variables
                lastProcessedIndex = 0;
                lastAddedText = '';
                
                console.log('STOPPED - All tracking variables reset');
            }
        } catch (error) {
            console.error('Error stopping recognition:', error);
            resetButtons();
        }
    });

    // Copy button functionality
    copyButton.addEventListener('click', async () => {
        try {
            let textToCopy = '';
            
            if (templateMode) {
                // If in template mode, collect text from all section content elements
                // First collect section content from the DOM (in case of user edits)
                updateSectionContentFromDOM();
                
                const sections = document.querySelectorAll('.section-content');
                const sectionTitles = document.querySelectorAll('[id^="section-"]');
                
                for (let i = 0; i < sectionTitles.length; i++) {
                    const title = sectionTitles[i].textContent;
                    const section = sections[i].dataset.section;
                    if (section && sectionContent[section].trim()) {
                        textToCopy += `${title}\n${sectionContent[section]}\n\n`;
                    }
                }
            } else {
                textToCopy = transcriptionText.value;
            }
            
            await navigator.clipboard.writeText(textToCopy);
            copyButton.querySelector('.btn-text').innerHTML = translations[currentLang].copied;
            setTimeout(() => {
                copyButton.querySelector('.btn-text').innerHTML = translations[currentLang].copy;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    });

    // Clear button functionality
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            if (templateMode) {
                // Clear all section content
                document.querySelectorAll('.section-content').forEach(section => {
                    section.textContent = '';
                });
                
                // Reset section content object
                Object.keys(sectionContent).forEach(key => {
                    sectionContent[key] = '';
                });
            } else {
                transcriptionText.value = '';
            }
        });
    }

    // Template button functionality
    templateButton.addEventListener('click', () => {
        modal.classList.add('show');
        updateTemplateTranslations();
    });

    // Close modal when clicking the close button or outside
    closeModal.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.classList.remove('show');
        }
    });

    // Function to load docx library dynamically
    function loadDocxLibrary() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (typeof docx !== 'undefined') {
                console.log('docx library already loaded');
                resolve();
                return;
            }
            
            // Try multiple CDN sources
            const cdnUrls = [
                'https://unpkg.com/docx@8.5.0/build/index.umd.js',
                'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js',
                'https://cdnjs.cloudflare.com/ajax/libs/docx/8.5.0/docx.umd.min.js'
            ];
            
            let urlIndex = 0;
            
            function tryNextUrl() {
                if (urlIndex >= cdnUrls.length) {
                    reject(new Error('Failed to load docx library from all CDN sources'));
                    return;
                }
                
                const script = document.createElement('script');
                script.src = cdnUrls[urlIndex];
                script.async = true;
                
                script.onload = () => {
                    console.log('docx library loaded successfully from:', cdnUrls[urlIndex]);
                    resolve();
                };
                
                script.onerror = () => {
                    console.warn('Failed to load docx from:', cdnUrls[urlIndex]);
                    urlIndex++;
                    tryNextUrl();
                };
                
                document.head.appendChild(script);
            }
            
            tryNextUrl();
        });
    }
    
    // Function to load FileSaver library dynamically
    function loadFileSaverLibrary() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (typeof saveAs !== 'undefined') {
                console.log('FileSaver library already loaded');
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js';
            script.async = true;
            
            script.onload = () => {
                console.log('FileSaver library loaded successfully');
                resolve();
            };
            
            script.onerror = () => {
                reject(new Error('Failed to load FileSaver library'));
            };
            
            document.head.appendChild(script);
        });
    }

    // Function to generate Word document
    async function generateWordDocument(templateType) {
    try {
        // Show loading state immediately
        const generateBtn = document.getElementById('generateWordBtn');
        const originalText = generateBtn.innerHTML;
        generateBtn.disabled = true;
        generateBtn.innerHTML = `<span class="btn-text">${translations[currentLang].loading || 'Loading...'}</span>`;
        
        // Load libraries if not already loaded
        try {
            await Promise.all([loadDocxLibrary(), loadFileSaverLibrary()]);
        } catch (loadError) {
            console.error('Failed to load libraries:', loadError);
            alert(translations[currentLang].libraryNotLoaded);
            generateBtn.disabled = false;
            generateBtn.innerHTML = originalText;
            return;
        }
        
        if (typeof docx === 'undefined') {
            console.error('docx library not loaded');
            alert(translations[currentLang].libraryNotLoaded);
            generateBtn.disabled = false;
            generateBtn.innerHTML = originalText;
            return;
        }

        generateBtn.innerHTML = `<span class="btn-text">${translations[currentLang].generating || 'Generating...'}</span>`;

        // Update section content from the DOM before generating the document
        updateSectionContentFromDOM();

        const doc = templateHandlers[templateType](sectionContent, currentLang);
        
        docx.Packer.toBlob(doc).then(blob => {
            saveAs(blob, `document_${templateType}_${new Date().toISOString().slice(0,10)}.docx`);
            
            // Restore button state
            generateBtn.disabled = false;
            generateBtn.innerHTML = originalText;
        }).catch(error => {
            console.error('Error packing document:', error);
            alert(`${translations[currentLang].docError}${error.message}`);
            
            // Restore button state
            generateBtn.disabled = false;
            generateBtn.innerHTML = originalText;
        });
        
    } catch (error) {
        console.error('Error generating document:', error);
        alert(`${translations[currentLang].docError}${error.message}`);
        
        // Restore button state
        const generateBtn = document.getElementById('generateWordBtn');
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.innerHTML = `<span class="btn-text">${translations[currentLang].generateWord || 'Generate Word'}</span>`;
        }
    }
}

    // Template handlers with translations
    const templateHandlers = {
        consultation: (sectionContent, lang) => {
            const t = translations[lang] || translations.fr;
            return new docx.Document({
                sections: [{
                    properties: {},
                    children: [
                        new docx.Paragraph({
                            children: [new docx.TextRun({
                                text: t.consultationTitle,
                                bold: true,
                                size: 32
                            })],
                            alignment: docx.AlignmentType.CENTER,
                            spacing: { after: 400 }
                        }),
                        new docx.Paragraph({
                            children: [new docx.TextRun({
                                text: `Date: ${new Date().toLocaleDateString()}`,
                                size: 24
                            })],
                            spacing: { after: 400 }
                        }),
                        new docx.Paragraph({
                            text: t.consultationReason,
                            heading: docx.HeadingLevel.HEADING_1,
                            spacing: { after: 200 }
                        }),
                        new docx.Paragraph({
                            children: [new docx.TextRun({ text: sectionContent.reason, size: 24 })],
                            spacing: { after: 300 }
                        }),
                        new docx.Paragraph({
                            text: t.consultationHistory,
                            heading: docx.HeadingLevel.HEADING_1,
                            spacing: { after: 200 }
                        }),
                        new docx.Paragraph({
                            children: [new docx.TextRun({ text: sectionContent.history, size: 24 })],
                            spacing: { after: 300 }
                        }),
                        new docx.Paragraph({
                            text: t.consultationExam,
                            heading: docx.HeadingLevel.HEADING_1,
                            spacing: { after: 200 }
                        }),
                        new docx.Paragraph({
                            children: [new docx.TextRun({ text: sectionContent.exam, size: 24 })],
                            spacing: { after: 300 }
                        }),
                        new docx.Paragraph({
                            text: t.consultationConclusion,
                            heading: docx.HeadingLevel.HEADING_1,
                            spacing: { after: 200 }
                        }),
                        new docx.Paragraph({
                            children: [new docx.TextRun({ text: sectionContent.conclusion, size: 24 })],
                            spacing: { after: 300 }
                        })
                    ]
                }]
            });
        },
        
        specialist: (sectionContent, lang) => {
            const t = translations[lang] || translations.fr;
            const doc = new docx.Document({
                sections: [{
                    properties: {},
                    children: [
                        new docx.Paragraph({
                            children: [
                                new docx.TextRun({
                                    text: t.specialistTitle,
                                    bold: true,
                                    size: 32
                                })
                            ],
                            alignment: docx.AlignmentType.CENTER,
                            spacing: { after: 400 }
                        }),
                        new docx.Paragraph({
                            children: [
                                new docx.TextRun({
                                    text: `Date: ${new Date().toLocaleDateString()}`,
                                    size: 24
                                })
                            ],
                            spacing: { after: 400 }
                        }),
                        new docx.Paragraph({
                            text: t.specialistSpecialty,
                            heading: docx.HeadingLevel.HEADING_1,
                            spacing: { after: 200 }
                        }),
                        new docx.Paragraph({
                            children: [new docx.TextRun({ text: sectionContent.specialty, size: 24 })],
                            spacing: { after: 300 }
                        }),
                        new docx.Paragraph({
                            text: t.specialistReason,
                            heading: docx.HeadingLevel.HEADING_1,
                            spacing: { after: 200 }
                        }),
                        new docx.Paragraph({
                            children: [new docx.TextRun({ text: sectionContent.reason, size: 24 })],
                            spacing: { after: 300 }
                        }),
                        new docx.Paragraph({
                            text: t.specialistExams,
                            heading: docx.HeadingLevel.HEADING_1,
                            spacing: { after: 200 }
                        }),
                        new docx.Paragraph({
                            children: [new docx.TextRun({ text: sectionContent.additionalExams, size: 24 })],
                            spacing: { after: 300 }
                        }),
                        new docx.Paragraph({
                            text: t.specialistDiagnosis,
                            heading: docx.HeadingLevel.HEADING_1,
                            spacing: { after: 200 }
                        }),
                        new docx.Paragraph({
                            children: [new docx.TextRun({ text: sectionContent.diagnosis, size: 24 })],
                            spacing: { after: 300 }
                        }),
                        new docx.Paragraph({
                            text: t.specialistRecommendations,
                            heading: docx.HeadingLevel.HEADING_1,
                            spacing: { after: 200 }
                        }),
                        new docx.Paragraph({
                            children: [new docx.TextRun({ text: sectionContent.recommendations, size: 24 })],
                            spacing: { after: 300 }
                        })
                    ]
                }]
            });
            return doc;
        },
        surgery: (sectionContent, lang) => {
            const t = translations[lang] || translations.fr;
            const doc = new docx.Document({
                sections: [{
                    properties: {},
                    children: [
                        new docx.Paragraph({
                            children: [
                                new docx.TextRun({
                                    text: t.specialistTitle,
                                    bold: true,
                                    size: 32
                                })
                            ],
                            alignment: docx.AlignmentType.CENTER,
                            spacing: { after: 400 }
                        }),
                        new docx.Paragraph({
                            children: [
                                new docx.TextRun({
                                    text: `Date: ${new Date().toLocaleDateString()}`,
                                    size: 24
                                })
                            ],
                            spacing: { after: 400 }
                        }),
                        new docx.Paragraph({
                            text: t.specialistSpecialty,
                            heading: docx.HeadingLevel.HEADING_1,
                            spacing: { after: 200 }
                        }),
                        new docx.Paragraph({
                            children: [new docx.TextRun({ text: sectionContent.specialty, size: 24 })],
                            spacing: { after: 300 }
                        }),
                        new docx.Paragraph({
                            text: t.specialistReason,
                            heading: docx.HeadingLevel.HEADING_1,
                            spacing: { after: 200 }
                        }),
                        new docx.Paragraph({
                            children: [new docx.TextRun({ text: sectionContent.reason, size: 24 })],
                            spacing: { after: 300 }
                        }),
                        new docx.Paragraph({
                            text: t.specialistExams,
                            heading: docx.HeadingLevel.HEADING_1,
                            spacing: { after: 200 }
                        }),
                        new docx.Paragraph({
                            children: [new docx.TextRun({ text: sectionContent.additionalExams, size: 24 })],
                            spacing: { after: 300 }
                        }),
                        new docx.Paragraph({
                            text: t.specialistDiagnosis,
                            heading: docx.HeadingLevel.HEADING_1,
                            spacing: { after: 200 }
                        }),
                        new docx.Paragraph({
                            children: [new docx.TextRun({ text: sectionContent.diagnosis, size: 24 })],
                            spacing: { after: 300 }
                        }),
                        new docx.Paragraph({
                            text: t.specialistRecommendations,
                            heading: docx.HeadingLevel.HEADING_1,
                            spacing: { after: 200 }
                        }),
                        new docx.Paragraph({
                            children: [new docx.TextRun({ text: sectionContent.recommendations, size: 24 })],
                            spacing: { after: 300 }
                        })
                    ]
                }]
            });
            return doc;
        },
        prescription: (sectionContent, lang) => {
            const t = translations[lang] || translations.fr;
            const doc = new docx.Document({
                sections: [{
                    properties: {},
                    children: [
                        new docx.Paragraph({
                            children: [
                                new docx.TextRun({
                                    text: t.specialistTitle,
                                    bold: true,
                                    size: 32
                                })
                            ],
                            alignment: docx.AlignmentType.CENTER,
                            spacing: { after: 400 }
                        }),
                        new docx.Paragraph({
                            children: [
                                new docx.TextRun({
                                    text: `Date: ${new Date().toLocaleDateString()}`,
                                    size: 24
                                })
                            ],
                            spacing: { after: 400 }
                        }),
                        new docx.Paragraph({
                            text: t.specialistSpecialty,
                            heading: docx.HeadingLevel.HEADING_1,
                            spacing: { after: 200 }
                        }),
                        new docx.Paragraph({
                            children: [new docx.TextRun({ text: sectionContent.specialty, size: 24 })],
                            spacing: { after: 300 }
                        }),
                        new docx.Paragraph({
                            text: t.specialistReason,
                            heading: docx.HeadingLevel.HEADING_1,
                            spacing: { after: 200 }
                        }),
                        new docx.Paragraph({
                            children: [new docx.TextRun({ text: sectionContent.reason, size: 24 })],
                            spacing: { after: 300 }
                        }),
                        new docx.Paragraph({
                            text: t.specialistDiagnosis,
                            heading: docx.HeadingLevel.HEADING_1,
                            spacing: { after: 200 }
                        }),
                        new docx.Paragraph({
                            children: [new docx.TextRun({ text: sectionContent.diagnosis, size: 24 })],
                            spacing: { after: 300 }
                        }),
                        new docx.Paragraph({
                            text: t.specialistRecommendations,
                            heading: docx.HeadingLevel.HEADING_1,
                            spacing: { after: 200 }
                        }),
                        new docx.Paragraph({
                            children: [new docx.TextRun({ text: sectionContent.recommendations, size: 24 })],
                            spacing: { after: 300 }
                        })
                    ]
                }]
            });
            return doc;
        }
    };

    // Initialize UI
resetButtons();
updateUIText();

// NEW: Setup input field tracking
setupInputFieldTracking();

    // Template selection handler
    templateItems.forEach(item => {
        item.addEventListener('click', () => {
            const templateType = item.dataset.template;
            modal.classList.remove('show');
            createTemplateSections(templateType);
        });
    });

    // Quit button functionality
    quitButton.addEventListener('click', () => {
        if (confirm(translations[currentLang].confirmQuit)) {
            // If using shared module, get language param
            const langParam = typeof LanguageDetection !== 'undefined' ? LanguageDetection.getLanguageParam() : `lang=${currentLang}`;
            window.location.href = `index.html?${langParam}`;
        }
    });

    // Update template translations based on language
    function updateTemplateTranslations() {
        const t = templateTranslations[currentLang] || templateTranslations.fr;
        modalTitle.textContent = t.modalTitle;

        templateItems.forEach(item => {
            const templateType = item.dataset.template;
            const titleElement = item.querySelector('h3');
            const descElement = item.querySelector('p');

            if (t.templates[templateType]) {
                titleElement.textContent = t.templates[templateType].title;
                descElement.textContent = t.templates[templateType].description;
            }
        });
    }


    // Debug helper function
    // Replace the existing debugSpeechRecognition function with this enhanced version
function debugSpeechRecognition() {
        console.log('=== SPEECH RECOGNITION DEBUG ===');
        console.log('Browser:', navigator.userAgent);
        console.log('Speech API available:', 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
        console.log('Current state:', {
            recognition: !!recognition,
            isRecording,
            isStarting,
            isResuming,
            currentLang
        });
        console.log('=== END DEBUG ===');
    }

// Make it globally available
window.debugSpeech = debugSpeechRecognition;

    // Initialize UI
    resetButtons();
    updateUIText();

    // Cleanup function for page unload (Android compatibility)
    window.addEventListener('beforeunload', () => {
        if (recognitionStartupTimeout) { // FIXED: Use local variable
            clearTimeout(recognitionStartupTimeout);
        }
        
        if (recognition && isRecording) {
            try {
                recognition.stop();
            } catch (error) {
                console.log('Error stopping recognition on page unload:', error);
            }
        }
    });

    // Add visibility change handler for mobile app switching (Android compatibility)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Page is hidden (app switched or locked)
            if (recognition && isRecording) {
                console.log('Page hidden, pausing recognition');
                try {
                    recognition.stop();
                    isRecording = false;
                    resetButtons();
                } catch (error) {
                    console.log('Error stopping recognition on visibility change:', error);
                }
            }
        }
    });
});