// index.js - Complete file with all original functionality using the shared languageDetection.js module
document.addEventListener('DOMContentLoaded', async function() {
    const languageSelect = document.getElementById('language-select');
    const urlParams = new URLSearchParams(window.location.search);

    const elements = {
        title: document.querySelector('.title'),
        subtitle: document.querySelector('.subtitle'),
        loginBtn: document.querySelector('.login-btn'),
        languageLabel: document.querySelector('label[for="language-select"]'),
        plans: document.querySelectorAll('.plan'),
        startButtons: document.querySelectorAll('.btn'),
        features: document.querySelector('.features'),
        browserSupportTitle: document.querySelector('.browser-support-title'),
        browserTable: document.querySelector('.browser-support-table'),
        browserNote: document.querySelector('.browser-note')
    };

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
                "taper votre code (Accès direct tant que vous être en ligne avec la plateforme.)",
                "Parler",
                "Copier le texte et coller."
            ],
            accurateText: "Le texte précis sera produit. Copiez et collez.",
            noDownload: "Aucun téléchargement ni installation de logiciel dans votre ordinateur. Partagez le document avec vos collègues par email.",
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
            browserNote: "Pour une expérience optimale, nous recommandons l'utilisation de Chrome, Edge ou Opera."
        },
        en: {
            title: "TRANSCRIBE YOUR MEDICAL REPORTS LIVE WITH AI ASSISTANCE.",
            subtitle: "Convert your voice to text in real-time.\nUnlimited dictation.",
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
            browserNote: "For optimal experience, we recommend using Chrome, Edge or Opera."
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
            browserNote: "Für eine optimale Erfahrung empfehlen wir die Verwendung von Chrome, Edge oder Opera."
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
            browserNote: "Para una experiencia óptima, recomendamos usar Chrome, Edge u Opera."
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
            browserNote: "Per un'esperienza ottimale, raccomandiamo l'uso di Chrome, Edge o Opera."
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
            browserNote: "Para uma experiência ideal, recomendamos usar Chrome, Edge ou Opera."
        }
    };

    // Country to language mapping (ONLY IF languageDetection.js is not available)
    // This is kept as a fallback - primary detection should come from the shared module
    const countryToLanguage = {
        'FR': 'fr', // France
        'BE': 'fr', // Belgium (French part)
        'CH': 'fr', // Switzerland (French part)
        'CA': 'fr', // Canada (French part)
        'LU': 'fr', // Luxembourg
        'MC': 'fr', // Monaco
        'GB': 'en', // United Kingdom
        'US': 'en', // United States
        'AU': 'en', // Australia
        'NZ': 'en', // New Zealand
        'IE': 'en', // Ireland
        'DE': 'de', // Germany
        'AT': 'de', // Austria
        'ES': 'es', // Spain
        'MX': 'es', // Mexico
        'AR': 'es', // Argentina
        'CO': 'es', // Colombia
        'IT': 'it', // Italy
        'PT': 'pt', // Portugal
        'BR': 'pt', // Brazil
    };

    // Fallback language detection functions (ONLY IF languageDetection.js is not loaded)
    async function fallbackDetectCountryLanguage() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            
            console.log('Fallback geolocation data:', data);
            
            if (data.country_code) {
                const countryCode = data.country_code.toUpperCase();
                const language = countryToLanguage[countryCode];
                
                if (language && translations[language]) {
                    console.log(`Fallback detected country: ${countryCode}, setting language to: ${language}`);
                    return language;
                }
            }
        } catch (error) {
            console.log('Fallback geolocation detection failed:', error);
        }
        
        return null;
    }

    function fallbackDetectBrowserLanguage() {
        console.log('Fallback detecting browser language...');
        
        const browserLang = (navigator.language || navigator.userLanguage || 'fr').toLowerCase();
        console.log('Fallback browser language:', browserLang);
        
        const langCode = browserLang.split('-')[0];
        const supportedLanguages = Object.keys(translations);
        
        if (supportedLanguages.includes(langCode)) {
            console.log('Fallback found supported language:', langCode);
            return langCode;
        }
        
        console.log('Fallback unrecognized language, defaulting to French');
        return 'fr';
    }

    async function detectLanguage() {
        // Check if the shared LanguageDetection module is available
        if (typeof LanguageDetection !== 'undefined' && LanguageDetection.detectLanguage) {
            console.log('Using shared LanguageDetection module');
            return await LanguageDetection.detectLanguage();
        }
        
        console.log('LanguageDetection module not found, using fallback');
        
        // Fallback detection logic
        let selectedLanguage;
        
        // 1. Check URL parameter
        selectedLanguage = urlParams.get('lang');
        console.log('URL lang param:', selectedLanguage);
        
        // 2. Check localStorage
        if (!selectedLanguage) {
            try {
                selectedLanguage = localStorage.getItem('selectedLanguage');
                console.log('Stored language:', selectedLanguage);
            } catch (e) {
                console.log('localStorage not available');
            }
        }
        
        // 3. Try country detection
        if (!selectedLanguage) {
            selectedLanguage = await fallbackDetectCountryLanguage();
            console.log('Country detected language:', selectedLanguage);
        }
        
        // 4. Use browser language
        if (!selectedLanguage) {
            selectedLanguage = fallbackDetectBrowserLanguage();
            console.log('Browser detected language:', selectedLanguage);
        }
        
        // Ensure we have a supported language
        const supportedLanguages = Object.keys(translations);
        if (!supportedLanguages.includes(selectedLanguage)) {
            console.log('Invalid language, defaulting to French');
            selectedLanguage = 'fr';
        }

        console.log('Final selected language:', selectedLanguage);

        // Store the selected language
        try {
            localStorage.setItem('selectedLanguage', selectedLanguage);
        } catch (e) {
            console.log('Could not save language preference');
        }

        return selectedLanguage;
    }

    function updateBrowserTable(lang) {
        const content = translations[lang];
        
        if (!elements.browserTable) {
            console.log('Browser table not found');
            return;
        }
        
        // Update table headers
        const headers = elements.browserTable.querySelectorAll('th');
        if (headers.length >= 3) {
            headers[0].textContent = content.browserTableHeaders.browser;
            headers[1].textContent = content.browserTableHeaders.support;
            headers[2].textContent = content.browserTableHeaders.recommendation;
        }
        
        // Update table content
        const rows = elements.browserTable.querySelectorAll('tbody tr');
        
        if (rows.length >= 5) {
            // Chrome row
            const chromeSupport = rows[0].querySelector('.support-full');
            const chromeRec = rows[0].querySelector('.recommended');
            if (chromeSupport) chromeSupport.textContent = content.browserSupport.full;
            if (chromeRec) chromeRec.textContent = content.browserRecommendation.recommended;
            
            // Edge row
            const edgeSupport = rows[1].querySelector('.support-full');
            const edgeRec = rows[1].querySelector('.recommended');
            if (edgeSupport) edgeSupport.textContent = content.browserSupport.full;
            if (edgeRec) edgeRec.textContent = content.browserRecommendation.recommended;
            
            // Safari row
            const safariSupport = rows[2].querySelector('.support-partial');
            const safariRec = rows[2].querySelector('.limited');
            if (safariSupport) safariSupport.textContent = content.browserSupport.partial;
            if (safariRec) safariRec.textContent = content.browserRecommendation.limited;
            
            // Firefox row
            const firefoxSupport = rows[3].querySelector('.support-limited');
            const firefoxRec = rows[3].querySelector('.not-recommended');
            if (firefoxSupport) firefoxSupport.textContent = content.browserSupport.limited;
            if (firefoxRec) firefoxRec.textContent = content.browserRecommendation.notRecommended;
            
            // Opera row
            const operaSupport = rows[4].querySelector('.support-full');
            const operaRec = rows[4].querySelector('.recommended');
            if (operaSupport) operaSupport.textContent = content.browserSupport.full;
            if (operaRec) operaRec.textContent = content.browserRecommendation.recommended;
        }
    }

    function updateContent(lang) {
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
        } catch (e) {
            console.log('Could not save language preference');
        }
        
        // Update document language
        document.documentElement.lang = lang;

        // Update language selector
        if (languageSelect) {
            languageSelect.value = lang;
        }
    }

    // Initialize with language detection
    const currentLanguage = await detectLanguage();
    updateContent(currentLanguage);

    // Set up language change listener
    if (languageSelect) {
        languageSelect.addEventListener('change', function() {
            const newLang = this.value;
            
            // Update content
            updateContent(newLang);
            
            // Save preference
            try {
                localStorage.setItem('selectedLanguage', newLang);
            } catch (e) {
                console.log('Could not save language preference');
            }
            
            // Update URL
            const url = new URL(window.location);
            url.searchParams.set('lang', newLang);
            window.history.replaceState({}, '', url);
            
            // If shared module is available, use it to switch language
            if (typeof LanguageDetection !== 'undefined' && LanguageDetection.switchLanguage) {
                LanguageDetection.switchLanguage(newLang);
            }
        });
    }

    // Fix login button event listener
    if (elements.loginBtn) {
        elements.loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get the CURRENT language from the dropdown
            const languageDropdown = document.getElementById('language-select');
            const currentLang = languageDropdown.value;
            
            console.log('Login button clicked, current language from dropdown:', currentLang);
            window.location.href = `login.html?lang=${currentLang}`;
        });
    }
});