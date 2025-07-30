// index.js - Enhanced with desktop download protection
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 SyncVoice Medical - Page Loading Started');
    console.log('📍 User Environment:', {
        userAgent: navigator.userAgent,
        language: navigator.language,
        languages: navigator.languages,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        url: window.location.href,
        protocol: window.location.protocol,
        hostname: window.location.hostname
    });

    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    console.log('🔗 URL Language Parameter:', urlLang);

    // Get all DOM elements - UPDATED to include desktop client elements
    const elements = {
        title: document.querySelector('.title'),
        subtitle: document.querySelector('.subtitle'),
        loginBtn: document.querySelector('.login-btn'),
        languageLabel: document.querySelector('label[for="language-select"]'),
        languageSelect: document.getElementById('language-select'),
        plans: document.querySelectorAll('.plan'),
        startButtons: document.querySelectorAll('.btn'),
        features: document.querySelector('.features'),
        browserSupportTitle: document.querySelector('.browser-support-title'),
        browserTable: document.querySelector('.browser-support-table'),
        browserNote: document.querySelector('.browser-note'),
        // Desktop client elements
        desktopClientTitle: document.getElementById('desktopClientTitle'),
        desktopClientSubtitle: document.getElementById('desktopClientSubtitle'),
        offlineFeatureTitle: document.getElementById('offlineFeatureTitle'),
        offlineFeatureDesc: document.getElementById('offlineFeatureDesc'),
        securityFeatureTitle: document.getElementById('securityFeatureTitle'),
        securityFeatureDesc: document.getElementById('securityFeatureDesc'),
        performanceFeatureTitle: document.getElementById('performanceFeatureTitle'),
        performanceFeatureDesc: document.getElementById('performanceFeatureDesc'),
        downloadBtnText: document.getElementById('downloadBtnText'),
        systemRequirements: document.getElementById('systemRequirements'),
        desktopDownloadBtn: document.getElementById('desktopDownloadBtn')
    };

    // Translation definitions - Updated with desktop client translations
    const translations = {
        fr: {
            title: "TRANSCRIVEZ EN DIRECT VOS COMPTES RENDUS MEDICAUX AVEC L'AIDE DE L'IA.",
            subtitle: "Convertissez en direct votre voix en texte.\nDictées illimitées.",
            login: "Se connecter",
            language: "Language",
            freePlan: "Essayez gratuitement pendant 7 jours",
            paidPlan: "Achetez, arrêtez quand vous voulez.",
            price: "25 € TTC / mois",
            startButton: "Commencez",
            instructionsTitle: "Il suffit de:",
            instructions: [
                "vous connecter à notre plateforme.",
                "saisir votre code d'activation (Accès direct tant que vous êtes en ligne avec la plateforme.)",
                "Parler",
                "Copier et coller le texte."
            ],
            accurateText: "Un texte précis sera produit. Copier et coller.",
            noDownload: "Aucun téléchargement ou installation de logiciel requis sur votre ordinateur. Partager le document avec les collègues par email.",
            browserSupportTitle: "Compatibilité des navigateurs pour la reconnaissance vocale",
            browserTableHeaders: {
                browser: "Navigateur",
                support: "Support",
                recommendation: "Recommandation"
            },
            browserSupport: {
                full: "Complet",
                partial: "Partiel",
                limited: "Limité"
            },
            browserRecommendation: {
                recommended: "Recommandé",
                limited: "Limité",
                notRecommended: "Non recommandé"
            },
            browserNote: "Pour une expérience optimale, nous recommandons l'utilisation de Chrome, Edge ou Opera.",
            // Desktop client translations
            desktopClientTitle: "Application Desktop SyncVoice Medical",
            desktopClientSubtitle: "Travaillez hors ligne avec notre application desktop Windows",
            offlineFeatureTitle: "Utilisation Hors ligne",
            offlineFeatureDesc: "Transcrivez sans connexion internet",
            securityFeatureTitle: "Sécurité Renforcée", 
            securityFeatureDesc: "Vos données restent sur votre ordinateur",
            performanceFeatureTitle: "Performance Optimale",
            performanceFeatureDesc: "Transcription rapide et précise",
            downloadBtnText: "Télécharger pour Windows",
            systemRequirements: "Nécessite Windows 10 ou supérieur • 200 MB d'espace disque",
            // Download protection messages
            downloadRequiresRegistration: "Pour télécharger l'application desktop, vous devez d'abord vous inscrire.",
            downloadConfirm: "Rediriger vers l'inscription ?",
            downloadingText: "Téléchargement en cours..."
        },
        en: {
            title: "TRANSCRIBE YOUR MEDICAL REPORTS LIVE WITH AI ASSISTANCE.",
            subtitle: "Convert your voice to text in real time.\nUnlimited dictation.",
            login: "Login",
            language: "Language",
            freePlan: "Try free for 7 days",
            paidPlan: "Buy now, cancel anytime.",
            price: "£25 VAT included / month",
            startButton: "Start",
            instructionsTitle: "Simply:",
            instructions: [
                "connect to our platform.",
                "enter your code (Direct access while online with the platform.)",
                "Speak",
                "Copy and paste the text."
            ],
            accurateText: "Accurate text will be produced. Copy and paste.",
            noDownload: "No software download or installation required on your computer. Share the document with colleagues via email.",
            browserSupportTitle: "Browser compatibility for speech recognition",
            browserTableHeaders: {
                browser: "Browser",
                support: "Support",
                recommendation: "Recommendation"
            },
            browserSupport: {
                full: "Full",
                partial: "Partial",
                limited: "Limited"
            },
            browserRecommendation: {
                recommended: "Recommended",
                limited: "Limited",
                notRecommended: "Not recommended"
            },
            browserNote: "For optimal experience, we recommend using Chrome, Edge or Opera.",
            // Desktop client translations
            desktopClientTitle: "SyncVoice Medical Desktop Application",
            desktopClientSubtitle: "Work offline with our Windows desktop application",
            offlineFeatureTitle: "Offline Usage",
            offlineFeatureDesc: "Transcribe without internet connection",
            securityFeatureTitle: "Enhanced Security",
            securityFeatureDesc: "Your data stays on your computer",
            performanceFeatureTitle: "Optimal Performance",
            performanceFeatureDesc: "Fast and accurate transcription",
            downloadBtnText: "Download for Windows",
            systemRequirements: "Requires Windows 10 or higher • 200 MB disk space",
            // Download protection messages
            downloadRequiresRegistration: "To download the desktop application, you must first register.",
            downloadConfirm: "Redirect to registration?",
            downloadingText: "Downloading..."
        },
        de: {
            title: "TRANSKRIBIEREN SIE IHRE MEDIZINISCHEN BERICHTE LIVE MIT KI-UNTERSTÜTZUNG.",
            subtitle: "Konvertieren Sie Ihre Stimme in Echtzeit in Text.\nUnbegrenzte Diktierung.",
            login: "Anmelden",
            language: "Sprache",
            freePlan: "7 Tage kostenlos testen",
            paidPlan: "Jetzt kaufen, jederzeit kündbar.",
            price: "25 € inkl. MwSt. / Monat",
            startButton: "Starten",
            instructionsTitle: "Einfach:",
            instructions: [
                "mit unserer Plattform verbinden.",
                "Code eingeben (Direkter Zugriff während der Online-Verbindung mit der Plattform.)",
                "Sprechen",
                "Text kopieren und einfügen."
            ],
            accurateText: "Präziser Text wird erstellt. Kopieren und einfügen.",
            noDownload: "Keine Software-Downloads oder Installationen auf Ihrem Computer erforderlich. Teilen Sie das Dokument per E-Mail mit Kollegen.",
            browserSupportTitle: "Browser-Kompatibilität für Spracherkennung",
            browserTableHeaders: {
                browser: "Browser",
                support: "Unterstützung",
                recommendation: "Empfehlung"
            },
            browserSupport: {
                full: "Vollständig",
                partial: "Teilweise",
                limited: "Begrenzt"
            },
            browserRecommendation: {
                recommended: "Empfohlen",
                limited: "Begrenzt",
                notRecommended: "Nicht empfohlen"
            },
            browserNote: "Für eine optimale Erfahrung empfehlen wir die Verwendung von Chrome, Edge oder Opera.",
            // Desktop client translations
            desktopClientTitle: "SyncVoice Medical Desktop-Anwendung",
            desktopClientSubtitle: "Arbeiten Sie offline mit unserer Windows-Desktop-Anwendung",
            offlineFeatureTitle: "Offline-Nutzung",
            offlineFeatureDesc: "Transkribieren ohne Internetverbindung",
            securityFeatureTitle: "Erhöhte Sicherheit",
            securityFeatureDesc: "Ihre Daten bleiben auf Ihrem Computer",
            performanceFeatureTitle: "Optimale Leistung",
            performanceFeatureDesc: "Schnelle und präzise Transkription",
            downloadBtnText: "Für Windows herunterladen",
            systemRequirements: "Benötigt Windows 10 oder höher • 200 MB Speicherplatz",
            // Download protection messages
            downloadRequiresRegistration: "Um die Desktop-Anwendung herunterzuladen, müssen Sie sich zuerst registrieren.",
            downloadConfirm: "Zur Registrierung weiterleiten?",
            downloadingText: "Wird heruntergeladen..."
        },
        es: {
            title: "TRANSCRIBA SUS INFORMES MÉDICOS EN VIVO CON AYUDA DE IA.",
            subtitle: "Convierta su voz en texto en tiempo real.\nDictado ilimitado.",
            login: "Iniciar sesión",
            language: "Idioma",
            freePlan: "Prueba gratuita de 7 días",
            paidPlan: "Compre ahora, cancele cuando quiera.",
            price: "25 € IVA incluido / mes",
            startButton: "Comenzar",
            instructionsTitle: "Simplemente:",
            instructions: [
                "conéctese a nuestra plataforma.",
                "introduzca su código (Acceso directo mientras esté en línea con la plataforma.)",
                "Hable",
                "Copie y pegue el texto."
            ],
            accurateText: "Se producirá texto preciso. Copie y pegue.",
            noDownload: "No se requiere descarga ni instalación de software en su ordenador. Comparta el documento con colegas por correo electrónico.",
            browserSupportTitle: "Compatibilidad de navegadores para reconocimiento de voz",
            browserTableHeaders: {
                browser: "Navegador",
                support: "Soporte",
                recommendation: "Recomendación"
            },
            browserSupport: {
                full: "Completo",
                partial: "Parcial",
                limited: "Limitado"
            },
            browserRecommendation: {
                recommended: "Recomendado",
                limited: "Limitado",
                notRecommended: "No recomendado"
            },
            browserNote: "Para una experiencia óptima, recomendamos usar Chrome, Edge u Opera.",
            // Desktop client translations
            desktopClientTitle: "Aplicación de Escritorio SyncVoice Medical",
            desktopClientSubtitle: "Trabaje sin conexión con nuestra aplicación de escritorio Windows",
            offlineFeatureTitle: "Uso Sin Conexión",
            offlineFeatureDesc: "Transcriba sin conexión a internet",
            securityFeatureTitle: "Seguridad Mejorada",
            securityFeatureDesc: "Sus datos permanecen en su ordenador",
            performanceFeatureTitle: "Rendimiento Óptimo",
            performanceFeatureDesc: "Transcripción rápida y precisa",
            downloadBtnText: "Descargar para Windows",
            systemRequirements: "Requiere Windows 10 o superior • 200 MB de espacio en disco",
            // Download protection messages
            downloadRequiresRegistration: "Para descargar la aplicación de escritorio, primero debe registrarse.",
            downloadConfirm: "¿Redirigir al registro?",
            downloadingText: "Descargando..."
        },
        it: {
            title: "TRASCRIVI I TUOI REFERTI MEDICI IN DIRETTA CON L'AIUTO DELL'IA.",
            subtitle: "Converti la tua voce in testo in tempo reale.\nDettatura illimitata.",
            login: "Accedi",
            language: "Lingua",
            freePlan: "Prova gratuita di 7 giorni",
            paidPlan: "Acquista ora, cancella quando vuoi.",
            price: "25 € IVA inclusa / mese",
            startButton: "Inizia",
            instructionsTitle: "Semplicemente:",
            instructions: [
                "connettiti alla nostra piattaforma.",
                "inserisci il tuo codice (Accesso diretto mentre sei online con la piattaforma.)",
                "Parla",
                "Copia e incolla il testo."
            ],
            accurateText: "Verrà prodotto un testo accurato. Copia e incolla.",
            noDownload: "Nessun download o installazione di software necessario sul tuo computer. Condividi il documento con i colleghi via email.",
            browserSupportTitle: "Compatibilità browser per il riconoscimento vocale",
            browserTableHeaders: {
                browser: "Browser",
                support: "Supporto",
                recommendation: "Raccomandazione"
            },
            browserSupport: {
                full: "Completo",
                partial: "Parziale",
                limited: "Limitato"
            },
            browserRecommendation: {
                recommended: "Raccomandato",
                limited: "Limitato",
                notRecommended: "Non raccomandato"
            },
            browserNote: "Per un'esperienza ottimale, raccomandiamo l'uso di Chrome, Edge o Opera.",
            // Desktop client translations
            desktopClientTitle: "Applicazione Desktop SyncVoice Medical",
            desktopClientSubtitle: "Lavora offline con la nostra applicazione desktop Windows",
            offlineFeatureTitle: "Utilizzo Offline",
            offlineFeatureDesc: "Trascrivi senza connessione internet",
            securityFeatureTitle: "Sicurezza Avanzata",
            securityFeatureDesc: "I tuoi dati rimangono sul tuo computer",
            performanceFeatureTitle: "Prestazioni Ottimali",
            performanceFeatureDesc: "Trascrizione veloce e accurata",
            downloadBtnText: "Scarica per Windows",
            systemRequirements: "Richiede Windows 10 o superiore • 200 MB di spazio su disco",
            // Download protection messages
            downloadRequiresRegistration: "Per scaricare l'applicazione desktop, devi prima registrarti.",
            downloadConfirm: "Reindirizzare alla registrazione?",
            downloadingText: "Scaricando..."
        },
        pt: {
            title: "TRANSCREVA SEUS RELATÓRIOS MÉDICOS AO VIVO COM AJUDA DE IA.",
            subtitle: "Converta sua voz em texto em tempo real.\nDitado ilimitado.",
            login: "Entrar",
            language: "Idioma",
            freePlan: "Experimente gratuitamente por 7 dias",
            paidPlan: "Compre agora, cancele quando quiser.",
            price: "25 € IVA incluído / mês",
            startButton: "Começar",
            instructionsTitle: "Simplesmente:",
            instructions: [
                "conecte-se à nossa plataforma.",
                "digite seu código (Acesso direto enquanto estiver online com a plataforma.)",
                "Fale",
                "Copie e cole o texto."
            ],
            accurateText: "Texto preciso será produzido. Copie e cole.",
            noDownload: "Não é necessário baixar ou instalar software no seu computador. Compartilhe o documento com colegas por email.",
            browserSupportTitle: "Compatibilidade de navegadores para reconhecimento de voz",
            browserTableHeaders: {
                browser: "Navegador",
                support: "Suporte",
                recommendation: "Recomendação"
            },
            browserSupport: {
                full: "Completo",
                partial: "Parcial",
                limited: "Limitado"
            },
            browserRecommendation: {
                recommended: "Recomendado",
                limited: "Limitado",
                notRecommended: "Não recomendado"
            },
            browserNote: "Para uma experiência ideal, recomendamos usar Chrome, Edge ou Opera.",
            // Desktop client translations
            desktopClientTitle: "Aplicação Desktop SyncVoice Medical",
            desktopClientSubtitle: "Trabalhe offline com nossa aplicação desktop Windows",
            offlineFeatureTitle: "Uso Offline",
            offlineFeatureDesc: "Transcreva sem conexão à internet",
            securityFeatureTitle: "Segurança Reforçada",
            securityFeatureDesc: "Seus dados permanecem em seu computador",
            performanceFeatureTitle: "Desempenho Ideal",
            performanceFeatureDesc: "Transcrição rápida e precisa",
            downloadBtnText: "Baixar para Windows",
            systemRequirements: "Requer Windows 10 ou superior • 200 MB de espaço em disco",
            // Download protection messages
            downloadRequiresRegistration: "Para baixar a aplicação desktop, você deve primeiro se registrar.",
            downloadConfirm: "Redirecionar para o registro?",
            downloadingText: "Baixando..."
        }
    };

    // Country to language mapping
    const countryToLanguage = {
        // French-speaking countries
        'FR': 'fr', 'BE': 'fr', 'CH': 'fr', 'CA': 'fr', 'LU': 'fr', 'MC': 'fr',
        'BF': 'fr', 'BJ': 'fr', 'CD': 'fr', 'CI': 'fr', 'GA': 'fr', 'GN': 'fr',
        'ML': 'fr', 'NE': 'fr', 'SN': 'fr', 'TG': 'fr',
        // English-speaking countries
        'GB': 'en', 'US': 'en', 'AU': 'en', 'NZ': 'en', 'IE': 'en', 'ZA': 'en',
        'NG': 'en', 'KE': 'en', 'GH': 'en', 'IN': 'en', 'PK': 'en', 'PH': 'en', 'SG': 'en',
        // German-speaking countries
        'DE': 'de', 'AT': 'de', 'LI': 'de',
        // Spanish-speaking countries
        'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'PE': 'es', 'VE': 'es',
        'CL': 'es', 'EC': 'es', 'GT': 'es', 'CU': 'es', 'BO': 'es', 'DO': 'es',
        'HN': 'es', 'PY': 'es', 'SV': 'es', 'NI': 'es', 'CR': 'es', 'PA': 'es', 'UY': 'es',
        // Italian-speaking countries
        'IT': 'it', 'SM': 'it', 'VA': 'it',
        // Portuguese-speaking countries
        'PT': 'pt', 'BR': 'pt', 'AO': 'pt', 'MZ': 'pt', 'CV': 'pt', 'GW': 'pt', 'ST': 'pt', 'TL': 'pt'
    };

    // DESKTOP DOWNLOAD PROTECTION LOGIC
    function checkUserRegistration() {
        // Check for user session or authentication
        const isLoggedIn = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
        const hasActivationCode = sessionStorage.getItem('activationCode') || localStorage.getItem('activationCode');
        
        return !!(isLoggedIn && hasActivationCode);
    }

    async function handleDesktopDownload(currentLang) {
    const content = translations[currentLang] || translations['fr'];
    
    // Check if user is registered
    const userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
    const activationCode = sessionStorage.getItem('activationCode') || localStorage.getItem('activationCode');
    
    if (userEmail && activationCode) {
        // User is registered, proceed with download
        console.log('User is registered, proceeding with download');
        
        // Update button text to show downloading
        if (elements.downloadBtnText) {
            const originalText = elements.downloadBtnText.textContent;
            elements.downloadBtnText.textContent = content.downloadingText;
            
            // Reset after 3 seconds
            setTimeout(() => {
                elements.downloadBtnText.textContent = originalText;
            }, 3000);
        }
        
        // Redirect to protected download endpoint with credentials
        window.location.href = `/api/download-desktop?lang=${currentLang}&email=${encodeURIComponent(userEmail)}&code=${activationCode}`;
        
    } else {
        // User is not registered, show message and redirect to registration
        alert(content.downloadRequiresRegistration);
        
        if (confirm(content.downloadConfirm)) {
            // Redirect to form with download intent
            window.location.href = `form.html?plan=free&intent=download&lang=${currentLang}`;
        }
    }
}

    // Language detection functions (previous code remains the same)
    async function detectCountryLanguage() {
        console.log('🌍 Starting geolocation detection...');
        
        const services = [
            {
                name: 'ipapi.co',
                url: 'https://ipapi.co/json/',
                parseResponse: (data) => ({ 
                    country: data.country_code, 
                    city: data.city, 
                    region: data.region,
                    country_name: data.country_name 
                })
            },
            {
                name: 'ipgeolocation.io',
                url: 'https://api.ipgeolocation.io/ipgeo?apiKey=demo',
                parseResponse: (data) => ({ 
                    country: data.country_code2, 
                    city: data.city, 
                    region: data.state_prov,
                    country_name: data.country_name 
                })
            }
        ];

        for (const service of services) {
            try {
                console.log(`🔍 Trying ${service.name}...`);
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 3000);
                
                const response = await fetch(service.url, {
                    signal: controller.signal,
                    headers: { 'Accept': 'application/json' }
                });
                
                clearTimeout(timeout);
                
                if (response.ok) {
                    const data = await response.json();
                    const result = service.parseResponse(data);
                    
                    console.log(`✅ ${service.name} response:`, result);
                    
                    if (result.country) {
                        const language = countryToLanguage[result.country.toUpperCase()];
                        console.log(`🎯 Detected country: ${result.country} → Language: ${language}`);
                        return { 
                            language: language || 'fr', 
                            country: result.country,
                            city: result.city,
                            region: result.region,
                            country_name: result.country_name,
                            source: service.name
                        };
                    }
                }
            } catch (error) {
                console.log(`❌ ${service.name} failed:`, error.message);
            }
        }
        
        console.log('🔄 All geolocation services failed, using fallback');
        return null;
    }

    // Browser language detection
    function detectBrowserLanguage() {
        console.log('🌍 Starting browser language detection...');
        
        const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
        const langCode = browserLang.split('-')[0];
        
        console.log('Browser language details:', {
            navigator_language: navigator.language,
            navigator_userLanguage: navigator.userLanguage,
            extracted_code: langCode
        });
        
        if (['fr', 'en', 'de', 'es', 'it', 'pt'].includes(langCode)) {
            console.log(`✅ Valid browser language detected: ${langCode}`);
            return langCode;
        }
        
        console.log(`⚠️ Browser language "${langCode}" not supported, using French as default`);
        return 'fr';
    }

    // Combined language detection
    async function detectLanguage() {
        console.log('🔍 Starting comprehensive language detection...');
        
        // Priority 1: URL parameter
        if (urlLang && ['fr', 'en', 'de', 'es', 'it', 'pt'].includes(urlLang)) {
            console.log(`✅ Using URL language parameter: ${urlLang}`);
            return urlLang;
        }
        
        // Priority 2: Stored preference
        try {
            const storedLang = localStorage.getItem('selectedLanguage');
            if (storedLang && ['fr', 'en', 'de', 'es', 'it', 'pt'].includes(storedLang)) {
                console.log(`✅ Using stored language preference: ${storedLang}`);
                return storedLang;
            }
        } catch (e) {
            console.log('⚠️ Cannot access localStorage:', e.message);
        }
        
        // Priority 3: Geolocation (with timeout)
        try {
            const geoResult = await Promise.race([
                detectCountryLanguage(),
                new Promise(resolve => setTimeout(() => resolve(null), 4000))
            ]);
            
            if (geoResult && geoResult.language) {
                console.log(`✅ Using geolocation language: ${geoResult.language} (from ${geoResult.source})`);
                return geoResult.language;
            }
        } catch (error) {
            console.log('❌ Geolocation detection failed:', error.message);
        }
        
        // Priority 4: Browser language
        const browserLang = detectBrowserLanguage();
        console.log(`✅ Using browser language: ${browserLang}`);
        return browserLang;
    }

    // Browser table update function
    function updateBrowserTable(lang) {
        const content = translations[lang] || translations['fr'];
        
        const tableHead = elements.browserTable.querySelector('thead tr');
        if (tableHead) {
            const headers = tableHead.querySelectorAll('th');
            if (headers.length >= 3) {
                headers[0].textContent = content.browserTableHeaders.browser;
                headers[1].textContent = content.browserTableHeaders.support;
                headers[2].textContent = content.browserTableHeaders.recommendation;
            }
        }
        
        const supportSpans = elements.browserTable.querySelectorAll('.support');
        supportSpans.forEach(span => {
            if (span.classList.contains('full')) {
                span.textContent = content.browserSupport.full;
            } else if (span.classList.contains('partial')) {
                span.textContent = content.browserSupport.partial;
            } else if (span.classList.contains('limited')) {
                span.textContent = content.browserSupport.limited;
            }
        });
        
        const recommendationSpans = elements.browserTable.querySelectorAll('.recommendation');
        recommendationSpans.forEach(span => {
            if (span.classList.contains('recommended')) {
                span.textContent = content.browserRecommendation.recommended;
            } else if (span.classList.contains('limited')) {
                span.textContent = content.browserRecommendation.limited;
            } else if (span.classList.contains('not-recommended')) {
                span.textContent = content.browserRecommendation.notRecommended;
            }
        });
    }

    // Content update function
    function updateContent(lang) {
        console.log('🎨 Updating page content for language:', lang);
        
        const content = translations[lang] || translations['fr'];
        
        // Update language label
        if (elements.languageLabel) {
            elements.languageLabel.textContent = content.language + ':';
        }

        // Update login button
        if (elements.loginBtn) {
            elements.loginBtn.textContent = content.login;
        }
        
        // Update main content
        if (elements.title) elements.title.textContent = content.title;
        if (elements.subtitle) elements.subtitle.innerHTML = content.subtitle.replace('\n', '<br>');
        
        // Update plans
        if (elements.plans.length >= 2) {
            const plan1Title = elements.plans[0].querySelector('h3');
            const plan2Title = elements.plans[1].querySelector('h3');
            const price = elements.plans[1].querySelector('.price');
            
            if (plan1Title) plan1Title.textContent = content.freePlan;
            if (plan2Title) plan2Title.textContent = content.paidPlan;
            if (price) price.textContent = content.price;
        }
        
        // Update the start buttons text and href
        elements.startButtons.forEach(button => {
            button.textContent = content.startButton;
            const url = new URL(button.href);
            url.searchParams.set('lang', lang);
            button.href = url.toString();
        });
        
        // Update features section
        if (elements.features) {
            const featuresH4 = elements.features.querySelector('h4');
            const featuresList = elements.features.querySelector('ul');
            const featuresPs = elements.features.querySelectorAll('p');
            
            if (featuresH4) featuresH4.textContent = content.instructionsTitle;
            if (featuresList) {
                featuresList.innerHTML = content.instructions
                    .map(instruction => `<li>${instruction}</li>`)
                    .join('');
            }
            if (featuresPs.length >= 2) {
                featuresPs[0].textContent = content.accurateText;
                featuresPs[1].textContent = content.noDownload;
            }
        }

        // UPDATE DESKTOP CLIENT SECTION
        if (elements.desktopClientTitle) {
            elements.desktopClientTitle.textContent = content.desktopClientTitle;
        }
        if (elements.desktopClientSubtitle) {
            elements.desktopClientSubtitle.textContent = content.desktopClientSubtitle;
        }
        if (elements.offlineFeatureTitle) {
            elements.offlineFeatureTitle.textContent = content.offlineFeatureTitle;
        }
        if (elements.offlineFeatureDesc) {
            elements.offlineFeatureDesc.textContent = content.offlineFeatureDesc;
        }
        if (elements.securityFeatureTitle) {
            elements.securityFeatureTitle.textContent = content.securityFeatureTitle;
        }
        if (elements.securityFeatureDesc) {
            elements.securityFeatureDesc.textContent = content.securityFeatureDesc;
        }
        if (elements.performanceFeatureTitle) {
            elements.performanceFeatureTitle.textContent = content.performanceFeatureTitle;
        }
        if (elements.performanceFeatureDesc) {
            elements.performanceFeatureDesc.textContent = content.performanceFeatureDesc;
        }
        if (elements.downloadBtnText) {
            elements.downloadBtnText.textContent = content.downloadBtnText;
        }
        if (elements.systemRequirements) {
            elements.systemRequirements.textContent = content.systemRequirements;
        }

        // Update browser support section
        if (elements.browserSupportTitle) {
            elements.browserSupportTitle.textContent = content.browserSupportTitle;
        }
        
        if (elements.browserTable) {
            updateBrowserTable(lang);
        }
        
        if (elements.browserNote) {
            elements.browserNote.textContent = content.browserNote;
        }

        // Store language preference
        try {
            localStorage.setItem('selectedLanguage', lang);
            console.log('💾 Saved language preference:', lang);
        } catch (e) {
            console.log('💾 Could not save language preference:', e.message);
        }
        
        // Update document language
        document.documentElement.lang = lang;

        // Update language selector
        if (elements.languageSelect) {
            elements.languageSelect.value = lang;
            console.log('🔄 Updated language selector to:', lang);
        }
    }

    // Initialize the page
    console.log('🚀 Initializing SyncVoice Medical with language detection...');
    
    // Detect language
    const detectedLanguage = await detectLanguage();
    
    // Update URL if no language parameter
    if (!urlLang && detectedLanguage) {
        console.log(`🔗 Updating URL to include detected language: ${detectedLanguage}`);
        const url = new URL(window.location);
        url.searchParams.set('lang', detectedLanguage);
        window.history.replaceState({}, '', url);
    }
    
    // Update content with detected language
    updateContent(detectedLanguage);
    
    // Setup event listeners
    
    // Language selector change
    if (elements.languageSelect) {
        elements.languageSelect.addEventListener('change', function(e) {
            const newLang = e.target.value;
            console.log(`🔄 Language changed to: ${newLang}`);
            
            // Update URL
            const url = new URL(window.location);
            url.searchParams.set('lang', newLang);
            window.history.pushState({}, '', url);
            
            // Update content
            updateContent(newLang);
        });
    }

    // LOGIN BUTTON FUNCTIONALITY
    if (elements.loginBtn) {
        elements.loginBtn.addEventListener('click', function() {
            const currentLang = elements.languageSelect.value || detectedLanguage;
            window.location.href = `login.html?lang=${currentLang}`;
        });
    }

    // DESKTOP DOWNLOAD BUTTON FUNCTIONALITY
    const downloadBtn = document.getElementById('downloadBtn');
if (downloadBtn) {
    downloadBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const currentLang = elements.languageSelect.value || detectedLanguage;
        handleDesktopDownload(currentLang);
    });
}

    console.log('✅ SyncVoice Medical page initialization complete');
});