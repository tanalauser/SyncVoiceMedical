// index.js - Enhanced with dual version layout and desktop download protection
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 SyncVoice Medical - Enhanced Page Loading Started');
    console.log('🔍 User Environment:', {
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

    // Get all DOM elements - INCLUDING HIGHLIGHT FEATURES
    const elements = {
        title: document.querySelector('.title'),
        subtitle: document.querySelector('.subtitle'),
        loginBtn: document.querySelector('.login-btn'),
        languageLabel: document.querySelector('label[for="language-select"]'),
        languageSelect: document.getElementById('language-select'),
        startButtons: document.querySelectorAll('.btn'),
        browserSupportTitle: document.querySelector('.browser-support-title'),
        browserTable: document.querySelector('.browser-support-table'),
        browserNote: document.querySelector('.browser-note'),
        downloadBtnText: document.getElementById('downloadBtnText'),
        systemRequirements: document.getElementById('systemRequirements'),
        // New version selection elements
        versionTitle: document.querySelector('.version-title'),
        webVersionTitle: document.querySelector('.web-version h3'),
        webVersionDesc: document.querySelector('.web-version .version-description'),
        desktopVersionTitle: document.querySelector('.desktop-version h3'),
        desktopVersionDesc: document.querySelector('.desktop-version .version-description'),
        // Desktop highlight features elements - THESE ARE CRITICAL
        highlightFeature1Title: document.getElementById('highlight-feature-1-title'),
        highlightFeature1Desc: document.getElementById('highlight-feature-1-desc'),
        highlightFeature2Title: document.getElementById('highlight-feature-2-title'),
        highlightFeature2Desc: document.getElementById('highlight-feature-2-desc'),
        highlightFeature3Title: document.getElementById('highlight-feature-3-title'),
        highlightFeature3Desc: document.getElementById('highlight-feature-3-desc'),
        // Comparison table elements
        comparisonTitle: document.querySelector('.comparison-title'),
        comparisonTable: document.querySelector('.comparison-table'),
        // Features elements
        webFeaturesTitle: document.querySelector('.features-group:first-child .features-title'),
        desktopFeaturesTitle: document.querySelector('.features-group:last-child .features-title'),
        webFeaturesList: document.querySelector('.features-group:first-child .features-list'),
        desktopFeaturesList: document.querySelector('.features-group:last-child .features-list'),
        webFeaturesDesc: document.querySelector('.features-group:first-child .features-content p'),
        desktopFeaturesDesc: document.querySelector('.features-group:last-child .features-content p'),
        // Plan elements
        freePlanTitle: document.querySelector('.plan:first-child h4'),
        paidPlanTitle: document.querySelector('.plan:last-child h4'),
        freePlanDesc: document.querySelector('.plan:first-child p'),
        paidPlanDesc: document.querySelector('.plan:last-child p'),
        priceElement: document.querySelector('.price'),
        subscriptionNote: document.querySelector('.subscription-note')
    };

    // Enhanced translation definitions WITH HIGHLIGHT FEATURES
    const translations = {
        fr: {
            title: "TRANSCRIVEZ VOS COMPTES RENDUS MÉDICAUX AVEC L'IA - WEB OU BUREAU",
            subtitle: "Choisissez votre méthode préférée:<br><strong>Plateforme web en temps réel</strong> ou <strong>Application bureau hors ligne</strong>",
            login: "Se connecter",
            language: "Language",
            // Version selection
            versionTitle: "Choisissez Votre Version",
            webVersionTitle: "Plateforme Web",
            webVersionDesc: "Transcription en temps réel dans votre navigateur",
            desktopVersionTitle: "Application Bureau",
            desktopVersionDesc: "Intégration directe avec logiciel médical, Word, Excel, etc.",
            // Desktop highlight features
            highlightFeature1Title: "Placez votre curseur dans n'importe quel logiciel",
            highlightFeature1Desc: "Logiciel médical, Word, Excel, PowerPoint, etc.",
            highlightFeature2Title: "Appuyez sur Ctrl+Shift+D et parlez",
            highlightFeature2Desc: "La transcription apparaît directement dans votre document.",
            highlightFeature3Title: "100% Hors ligne et sécurisé",
            highlightFeature3Desc: "Aucune donnée ne quitte votre ordinateur.",
            // Plans
            freePlanTitle: "Essai Gratuit",
            freePlanDesc: "7 jours gratuits",
            paidPlanTitle: "Abonnement",
            paidPlanDesc: "Arrêtez quand vous voulez",
            price: "25 € TTC / mois",
            freeButton: "Essayer Gratuitement",
            paidButton: "Commencer Maintenant",
            subscriptionNote: "Abonnement requis après installation",
            // Comparison
            comparisonTitle: "Comparaison des Versions",
            comparisonHeaders: {
                feature: "Fonctionnalité",
                web: "🌐 Plateforme Web",
                desktop: "💻 Application Bureau"
            },
            comparisonRows: {
                internet: "Connexion Internet",
                installation: "Installation",
                security: "Sécurité des Données",
                integration: "Intégration Logiciels",
                access: "Accès",
                speed: "Vitesse"
            },
            comparisonValues: {
                required: "Requise",
                notRequired: "Non requise",
                none: "Aucune",
                windowsOnly: "Windows uniquement",
                secureCloud: "Cloud sécurisé",
                localPC: "Local sur votre PC",
                copyPaste: "Copier/coller requis",
                direct: "Directe (Word, Excel, etc.)",
                anyBrowser: "Tout navigateur",
                desktopOnly: "Bureau uniquement",
                dependsConnection: "Dépend de la connexion",
                fastLocal: "Traitement local rapide"
            },
            // Features
            webFeaturesTitle: "🌐 Fonctionnalités Plateforme Web",
            desktopFeaturesTitle: "💻 Fonctionnalités Application Bureau",
            webFeatures: [
                "Connectez-vous à notre plateforme depuis n'importe quel navigateur",
                "Saisissez votre code d'activation",
                "Parlez directement dans l'interface",
                "Copiez et collez le texte transcrit"
            ],
            desktopFeatures: [
                "<strong>Ouvrez Word, Excel, PowerPoint ou tout autre éditeur</strong>",
                "<strong>Placez votre curseur où vous voulez taper</strong>",
                "<strong>Appuyez sur Ctrl+Shift+D</strong>",
                "<strong>Parlez - la transcription apparaît instantanément</strong>"
            ],
            webFeaturesDesc: "Idéal pour un accès rapide depuis n'importe où. Partagez facilement vos documents par email avec vos collègues.",
            desktopFeaturesDesc: "<strong>Avantage majeur :</strong> Transcription directe dans vos logiciels habituels sans interruption de workflow. Fonctionne avec tous les éditeurs de texte.",
            // Desktop download
            downloadBtnText: "Télécharger pour Windows",
            systemRequirements: "Nécessite Windows 10 ou supérieur • 200 MB d'espace disque",
            // Browser support
            browserSupportTitle: "Compatibilité des navigateurs pour la reconnaissance vocale (Plateforme Web)",
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
            browserNote: "Pour une expérience optimale avec la plateforme web, nous recommandons l'utilisation de Chrome, Edge ou Opera.",
            // Download protection messages
            downloadRequiresRegistration: "Pour télécharger l'application bureau, vous devez d'abord vous inscrire.",
            downloadConfirm: "Rediriger vers l'inscription ?",
            downloadingText: "Téléchargement en cours...",
            // Pricing section
            pricingMainTitle: "Un Abonnement = Web + Bureau",
            pricingSubtitle: "Profitez des deux versions sans frais supplémentaires",
            trialTitle: "Essai Gratuit",
            trialPrice: "0 €",
            trialDuration: "7 jours",
            trialFeature1: "✓ Plateforme Web complète",
            trialFeature2: "✓ Application Bureau Windows",
            trialFeature3: "✓ Sans carte bancaire",
            trialFeature4: "✓ Annulation automatique",
            trialButton: "Essayer Gratuitement",
            popularBadge: "POPULAIRE",
            subscriptionTitle: "Abonnement Complet",
            subscriptionPrice: "25 €",
            subscriptionDuration: "TTC / mois",
            subscriptionFeature1: "✓ Plateforme Web illimitée",
            subscriptionFeature2: "✓ Application Bureau Windows",
            subscriptionFeature3: "✓ Mises à jour incluses",
            subscriptionFeature4: "✓ Support prioritaire",
            subscriptionFeature5: "✓ Résiliable à tout moment",
            subscriptionButton: "Commencer Maintenant",
            valuePropositionText: "<strong>Pourquoi payer deux fois ?</strong> Avec SyncVoice Medical, un seul abonnement vous donne accès à la plateforme web ET à l'application bureau. Utilisez celle qui convient le mieux à chaque situation.",
            whatYouGetTitle: "Ce Que Vous Obtenez",
            includedBadge: "INCLUS"
        },
        en: {
            title: "TRANSCRIBE YOUR MEDICAL REPORTS WITH AI - WEB OR DESKTOP",
            subtitle: "Choose your preferred method:<br><strong>Real-time web platform</strong> or <strong>Offline desktop application</strong>",
            login: "Login",
            language: "Language",
            // Version selection
            versionTitle: "Choose Your Version",
            webVersionTitle: "Web Platform",
            webVersionDesc: "Real-time transcription in your browser",
            desktopVersionTitle: "Desktop Application",
            desktopVersionDesc: "Direct integration with medical software, Word, Excel, etc.",
            // Desktop highlight features
            highlightFeature1Title: "Place your cursor in any software",
            highlightFeature1Desc: "Medical software, Word, Excel, PowerPoint, etc.",
            highlightFeature2Title: "Press Ctrl+Shift+D and speak",
            highlightFeature2Desc: "Transcription appears directly in your document.",
            highlightFeature3Title: "100% Offline and secure",
            highlightFeature3Desc: "No data leaves your computer.",
            // Plans
            freePlanTitle: "Free Trial",
            freePlanDesc: "7 days free",
            paidPlanTitle: "Subscription",
            paidPlanDesc: "Cancel anytime",
            price: "£25 VAT included / month",
            freeButton: "Try Free",
            paidButton: "Start Now",
            subscriptionNote: "Subscription required after installation",
            // Comparison
            comparisonTitle: "Version Comparison",
            comparisonHeaders: {
                feature: "Feature",
                web: "🌐 Web Platform",
                desktop: "💻 Desktop App"
            },
            comparisonRows: {
                internet: "Internet Connection",
                installation: "Installation",
                security: "Data Security",
                integration: "Software Integration",
                access: "Access",
                speed: "Speed"
            },
            comparisonValues: {
                required: "Required",
                notRequired: "Not required",
                none: "None",
                windowsOnly: "Windows only",
                secureCloud: "Secure cloud",
                localPC: "Local on your PC",
                copyPaste: "Copy/paste required",
                direct: "Direct (Word, Excel, etc.)",
                anyBrowser: "Any browser",
                desktopOnly: "Desktop only",
                dependsConnection: "Depends on connection",
                fastLocal: "Fast local processing"
            },
            // Features
            webFeaturesTitle: "🌐 Web Platform Features",
            desktopFeaturesTitle: "💻 Desktop Application Features",
            webFeatures: [
                "Connect to our platform from any browser",
                "Enter your activation code",
                "Speak directly into the interface",
                "Copy and paste the transcribed text"
            ],
            desktopFeatures: [
                "<strong>Open Word, Excel, PowerPoint or any other editor</strong>",
                "<strong>Place your cursor where you want to type</strong>",
                "<strong>Press Ctrl+Shift+D</strong>",
                "<strong>Speak - transcription appears instantly</strong>"
            ],
            webFeaturesDesc: "Ideal for quick access from anywhere. Easily share your documents via email with colleagues.",
            desktopFeaturesDesc: "<strong>Major advantage:</strong> Direct transcription in your usual software without workflow interruption. Works with all text editors.",
            // Desktop download
            downloadBtnText: "Download for Windows",
            systemRequirements: "Requires Windows 10 or higher • 200 MB disk space",
            // Browser support
            browserSupportTitle: "Browser compatibility for speech recognition (Web Platform)",
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
            browserNote: "For optimal experience with the web platform, we recommend using Chrome, Edge or Opera.",
            // Download protection messages
            downloadRequiresRegistration: "To download the desktop application, you must first register.",
            downloadConfirm: "Redirect to registration?",
            downloadingText: "Downloading...",
            // Pricing section
            pricingMainTitle: "One Subscription = Web + Desktop",
            pricingSubtitle: "Enjoy both versions at no extra cost",
            trialTitle: "Free Trial",
            trialPrice: "£0",
            trialDuration: "7 days",
            trialFeature1: "✓ Full Web Platform",
            trialFeature2: "✓ Windows Desktop Application",
            trialFeature3: "✓ No credit card required",
            trialFeature4: "✓ Automatic cancellation",
            trialButton: "Try Free",
            popularBadge: "POPULAR",
            subscriptionTitle: "Complete Subscription",
            subscriptionPrice: "£25",
            subscriptionDuration: "VAT incl. / month",
            subscriptionFeature1: "✓ Unlimited Web Platform",
            subscriptionFeature2: "✓ Windows Desktop Application",
            subscriptionFeature3: "✓ Updates included",
            subscriptionFeature4: "✓ Priority support",
            subscriptionFeature5: "✓ Cancel anytime",
            subscriptionButton: "Start Now",
            valuePropositionText: "<strong>Why pay twice?</strong> With SyncVoice Medical, one subscription gives you access to both the web platform AND desktop application. Use whichever suits each situation best.",
            whatYouGetTitle: "What You Get",
            includedBadge: "INCLUDED"
        },
        de: {
            title: "TRANSKRIBIEREN SIE IHRE MEDIZINISCHEN BERICHTE MIT KI - WEB ODER DESKTOP",
            subtitle: "Wählen Sie Ihre bevorzugte Methode:<br><strong>Echtzeit-Web-Plattform</strong> oder <strong>Offline-Desktop-Anwendung</strong>",
            login: "Anmelden",
            language: "Sprache",
            // Version selection
            versionTitle: "Wählen Sie Ihre Version",
            webVersionTitle: "Web-Plattform",
            webVersionDesc: "Echtzeit-Transkription in Ihrem Browser",
            desktopVersionTitle: "Desktop-Anwendung",
            desktopVersionDesc: "Direkte Integration mit medizinischer Software, Word, Excel, etc.",
            // Desktop highlight features
            highlightFeature1Title: "Platzieren Sie Ihren Cursor in beliebiger Software",
            highlightFeature1Desc: "Medizinische Software, Word, Excel, PowerPoint, etc.",
            highlightFeature2Title: "Drücken Sie Ctrl+Shift+D und sprechen",
            highlightFeature2Desc: "Die Transkription erscheint direkt in Ihrem Dokument.",
            highlightFeature3Title: "100% Offline und sicher",
            highlightFeature3Desc: "Keine Daten verlassen Ihren Computer.",
            // Plans
            freePlanTitle: "Kostenlose Testversion",
            freePlanDesc: "7 Tage kostenlos",
            paidPlanTitle: "Abonnement",
            paidPlanDesc: "Jederzeit kündbar",
            price: "25 € inkl. MwSt. / Monat",
            freeButton: "Kostenlos Testen",
            paidButton: "Jetzt Starten",
            subscriptionNote: "Abonnement nach Installation erforderlich",
            // Comparison
            comparisonTitle: "Versionsvergleich",
            comparisonHeaders: {
                feature: "Funktion",
                web: "🌐 Web-Plattform",
                desktop: "💻 Desktop-App"
            },
            comparisonRows: {
                internet: "Internetverbindung",
                installation: "Installation",
                security: "Datensicherheit",
                integration: "Software-Integration",
                access: "Zugriff",
                speed: "Geschwindigkeit"
            },
            comparisonValues: {
                required: "Erforderlich",
                notRequired: "Nicht erforderlich",
                none: "Keine",
                windowsOnly: "Nur Windows",
                secureCloud: "Sichere Cloud",
                localPC: "Lokal auf Ihrem PC",
                copyPaste: "Kopieren/Einfügen erforderlich",
                direct: "Direkt (Word, Excel, etc.)",
                anyBrowser: "Jeder Browser",
                desktopOnly: "Nur Desktop",
                dependsConnection: "Abhängig von Verbindung",
                fastLocal: "Schnelle lokale Verarbeitung"
            },
            // Features
            webFeaturesTitle: "🌐 Web-Plattform Funktionen",
            desktopFeaturesTitle: "💻 Desktop-Anwendung Funktionen",
            webFeatures: [
                "Verbinden Sie sich von jedem Browser aus mit unserer Plattform",
                "Geben Sie Ihren Aktivierungscode ein",
                "Sprechen Sie direkt in die Benutzeroberfläche",
                "Kopieren und fügen Sie den transkribierten Text ein"
            ],
            desktopFeatures: [
                "<strong>Öffnen Sie Word, Excel, PowerPoint oder einen anderen Editor</strong>",
                "<strong>Platzieren Sie Ihren Cursor dort, wo Sie tippen möchten</strong>",
                "<strong>Drücken Sie Ctrl+Shift+D</strong>",
                "<strong>Sprechen Sie - die Transkription erscheint sofort</strong>"
            ],
            webFeaturesDesc: "Ideal für schnellen Zugriff von überall. Teilen Sie Ihre Dokumente einfach per E-Mail mit Kollegen.",
            desktopFeaturesDesc: "<strong>Großer Vorteil:</strong> Direkte Transkription in Ihrer gewohnten Software ohne Workflow-Unterbrechung. Funktioniert mit allen Texteditoren.",
            // Desktop download
            downloadBtnText: "Für Windows herunterladen",
            systemRequirements: "Benötigt Windows 10 oder höher • 200 MB Speicherplatz",
            // Browser support
            browserSupportTitle: "Browser-Kompatibilität für Spracherkennung (Web-Plattform)",
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
            browserNote: "Für eine optimale Erfahrung mit der Web-Plattform empfehlen wir die Verwendung von Chrome, Edge oder Opera.",
            // Download protection messages
            downloadRequiresRegistration: "Um die Desktop-Anwendung herunterzuladen, müssen Sie sich zuerst registrieren.",
            downloadConfirm: "Zur Registrierung weiterleiten?",
            downloadingText: "Wird heruntergeladen...",
            // Pricing section
            pricingMainTitle: "Ein Abonnement = Web + Desktop",
            pricingSubtitle: "Nutzen Sie beide Versionen ohne zusätzliche Kosten",
            trialTitle: "Kostenlose Testversion",
            trialPrice: "0 €",
            trialDuration: "7 Tage",
            trialFeature1: "✓ Vollständige Web-Plattform",
            trialFeature2: "✓ Windows Desktop-Anwendung",
            trialFeature3: "✓ Keine Kreditkarte erforderlich",
            trialFeature4: "✓ Automatische Kündigung",
            trialButton: "Kostenlos Testen",
            popularBadge: "BELIEBT",
            subscriptionTitle: "Komplettabonnement",
            subscriptionPrice: "25 €",
            subscriptionDuration: "inkl. MwSt. / Monat",
            subscriptionFeature1: "✓ Unbegrenzte Web-Plattform",
            subscriptionFeature2: "✓ Windows Desktop-Anwendung",
            subscriptionFeature3: "✓ Updates inklusive",
            subscriptionFeature4: "✓ Prioritäts-Support",
            subscriptionFeature5: "✓ Jederzeit kündbar",
            subscriptionButton: "Jetzt Starten",
            valuePropositionText: "<strong>Warum zweimal bezahlen?</strong> Mit SyncVoice Medical erhalten Sie mit einem Abonnement Zugang zur Web-Plattform UND Desktop-Anwendung. Nutzen Sie, was am besten zur jeweiligen Situation passt.",
            whatYouGetTitle: "Was Sie Erhalten",
            includedBadge: "INKLUSIVE"
        },
        es: {
            title: "TRANSCRIBA SUS INFORMES MÉDICOS CON IA - WEB O ESCRITORIO",
            subtitle: "Elija su método preferido:<br><strong>Plataforma web en tiempo real</strong> o <strong>Aplicación de escritorio sin conexión</strong>",
            login: "Iniciar sesión",
            language: "Idioma",
            // Version selection
            versionTitle: "Elija Su Versión",
            webVersionTitle: "Plataforma Web",
            webVersionDesc: "Transcripción en tiempo real en su navegador",
            desktopVersionTitle: "Aplicación de Escritorio",
            desktopVersionDesc: "Integración directa con software médico, Word, Excel, etc.",
            // Desktop highlight features
            highlightFeature1Title: "Coloque su cursor en cualquier software",
            highlightFeature1Desc: "Software médico, Word, Excel, PowerPoint, etc.",
            highlightFeature2Title: "Presione Ctrl+Shift+D y hable",
            highlightFeature2Desc: "La transcripción aparece directamente en su documento.",
            highlightFeature3Title: "100% Sin conexión y seguro",
            highlightFeature3Desc: "Ningún dato sale de su computadora.",
            // Plans
            freePlanTitle: "Prueba Gratuita",
            freePlanDesc: "7 días gratis",
            paidPlanTitle: "Suscripción",
            paidPlanDesc: "Cancele cuando quiera",
            price: "25 € IVA incluido / mes",
            freeButton: "Probar Gratis",
            paidButton: "Comenzar Ahora",
            subscriptionNote: "Suscripción requerida después de la instalación",
            // Comparison
            comparisonTitle: "Comparación de Versiones",
            comparisonHeaders: {
                feature: "Característica",
                web: "🌐 Plataforma Web",
                desktop: "💻 App Escritorio"
            },
            comparisonRows: {
                internet: "Conexión a Internet",
                installation: "Instalación",
                security: "Seguridad de Datos",
                integration: "Integración de Software",
                access: "Acceso",
                speed: "Velocidad"
            },
            comparisonValues: {
                required: "Requerida",
                notRequired: "No requerida",
                none: "Ninguna",
                windowsOnly: "Solo Windows",
                secureCloud: "Nube segura",
                localPC: "Local en su PC",
                copyPaste: "Copiar/pegar requerido",
                direct: "Directa (Word, Excel, etc.)",
                anyBrowser: "Cualquier navegador",
                desktopOnly: "Solo escritorio",
                dependsConnection: "Depende de la conexión",
                fastLocal: "Procesamiento local rápido"
            },
            // Features
            webFeaturesTitle: "🌐 Características Plataforma Web",
            desktopFeaturesTitle: "💻 Características Aplicación Escritorio",
            webFeatures: [
                "Conéctese a nuestra plataforma desde cualquier navegador",
                "Ingrese su código de activación",
                "Hable directamente en la interfaz",
                "Copie y pegue el texto transcrito"
            ],
            desktopFeatures: [
                "<strong>Abra Word, Excel, PowerPoint o cualquier otro editor</strong>",
                "<strong>Coloque su cursor donde quiera escribir</strong>",
                "<strong>Presione Ctrl+Shift+D</strong>",
                "<strong>Hable - la transcripción aparece al instante</strong>"
            ],
            webFeaturesDesc: "Ideal para acceso rápido desde cualquier lugar. Comparta fácilmente sus documentos por email con colegas.",
            desktopFeaturesDesc: "<strong>Ventaja principal:</strong> Transcripción directa en su software habitual sin interrumpir el flujo de trabajo. Funciona con todos los editores de texto.",
            // Desktop download
            downloadBtnText: "Descargar para Windows",
            systemRequirements: "Requiere Windows 10 o superior • 200 MB de espacio en disco",
            // Browser support
            browserSupportTitle: "Compatibilidad de navegadores para reconocimiento de voz (Plataforma Web)",
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
            browserNote: "Para una experiencia óptima con la plataforma web, recomendamos usar Chrome, Edge u Opera.",
            // Download protection messages
            downloadRequiresRegistration: "Para descargar la aplicación de escritorio, primero debe registrarse.",
            downloadConfirm: "¿Redirigir al registro?",
            downloadingText: "Descargando...",
            // Pricing section
            pricingMainTitle: "Una Suscripción = Web + Escritorio",
            pricingSubtitle: "Disfrute de ambas versiones sin costo adicional",
            trialTitle: "Prueba Gratuita",
            trialPrice: "0 €",
            trialDuration: "7 días",
            trialFeature1: "✓ Plataforma Web completa",
            trialFeature2: "✓ Aplicación de Escritorio Windows",
            trialFeature3: "✓ Sin tarjeta de crédito",
            trialFeature4: "✓ Cancelación automática",
            trialButton: "Probar Gratis",
            popularBadge: "POPULAR",
            subscriptionTitle: "Suscripción Completa",
            subscriptionPrice: "25 €",
            subscriptionDuration: "IVA incl. / mes",
            subscriptionFeature1: "✓ Plataforma Web ilimitada",
            subscriptionFeature2: "✓ Aplicación de Escritorio Windows",
            subscriptionFeature3: "✓ Actualizaciones incluidas",
            subscriptionFeature4: "✓ Soporte prioritario",
            subscriptionFeature5: "✓ Cancele cuando quiera",
            subscriptionButton: "Comenzar Ahora",
            valuePropositionText: "<strong>¿Por qué pagar dos veces?</strong> Con SyncVoice Medical, una suscripción le da acceso a la plataforma web Y la aplicación de escritorio. Use la que mejor se adapte a cada situación.",
            whatYouGetTitle: "Lo Que Obtiene",
            includedBadge: "INCLUIDO"
        },
        it: {
            title: "TRASCRIVI I TUOI REFERTI MEDICI CON IA - WEB O DESKTOP",
            subtitle: "Scegli il tuo metodo preferito:<br><strong>Piattaforma web in tempo reale</strong> o <strong>Applicazione desktop offline</strong>",
            login: "Accedi",
            language: "Lingua",
            // Version selection
            versionTitle: "Scegli La Tua Versione",
            webVersionTitle: "Piattaforma Web",
            webVersionDesc: "Trascrizione in tempo reale nel tuo browser",
            desktopVersionTitle: "Applicazione Desktop",
            desktopVersionDesc: "Integrazione diretta con software medico, Word, Excel, ecc.",
            // Desktop highlight features
            highlightFeature1Title: "Posiziona il cursore in qualsiasi software",
            highlightFeature1Desc: "Software medico, Word, Excel, PowerPoint, ecc.",
            highlightFeature2Title: "Premi Ctrl+Shift+D e parla",
            highlightFeature2Desc: "La trascrizione appare direttamente nel tuo documento.",
            highlightFeature3Title: "100% Offline e sicuro",
            highlightFeature3Desc: "Nessun dato lascia il tuo computer.",
            // Plans
            freePlanTitle: "Prova Gratuita",
            freePlanDesc: "7 giorni gratis",
            paidPlanTitle: "Abbonamento",
            paidPlanDesc: "Cancella quando vuoi",
            price: "25 € IVA inclusa / mese",
            freeButton: "Prova Gratis",
            paidButton: "Inizia Ora",
            subscriptionNote: "Abbonamento richiesto dopo l'installazione",
            // Comparison
            comparisonTitle: "Confronto Versioni",
            comparisonHeaders: {
                feature: "Caratteristica",
                web: "🌐 Piattaforma Web",
                desktop: "💻 App Desktop"
            },
            comparisonRows: {
                internet: "Connessione Internet",
                installation: "Installazione",
                security: "Sicurezza Dati",
                integration: "Integrazione Software",
                access: "Accesso",
                speed: "Velocità"
            },
            comparisonValues: {
                required: "Richiesta",
                notRequired: "Non richiesta",
                none: "Nessuna",
                windowsOnly: "Solo Windows",
                secureCloud: "Cloud sicuro",
                localPC: "Locale sul tuo PC",
                copyPaste: "Copia/incolla richiesto",
                direct: "Diretta (Word, Excel, ecc.)",
                anyBrowser: "Qualsiasi browser",
                desktopOnly: "Solo desktop",
                dependsConnection: "Dipende dalla connessione",
                fastLocal: "Elaborazione locale veloce"
            },
            // Features
            webFeaturesTitle: "🌐 Caratteristiche Piattaforma Web",
            desktopFeaturesTitle: "💻 Caratteristiche Applicazione Desktop",
            webFeatures: [
                "Connettiti alla nostra piattaforma da qualsiasi browser",
                "Inserisci il tuo codice di attivazione",
                "Parla direttamente nell'interfaccia",
                "Copia e incolla il testo trascritto"
            ],
            desktopFeatures: [
                "<strong>Apri Word, Excel, PowerPoint o qualsiasi altro editor</strong>",
                "<strong>Posiziona il cursore dove vuoi digitare</strong>",
                "<strong>Premi Ctrl+Shift+D</strong>",
                "<strong>Parla - la trascrizione appare istantaneamente</strong>"
            ],
            webFeaturesDesc: "Ideale per accesso rapido da qualsiasi luogo. Condividi facilmente i tuoi documenti via email con i colleghi.",
            desktopFeaturesDesc: "<strong>Vantaggio principale:</strong> Trascrizione diretta nel tuo software abituale senza interruzioni del flusso di lavoro. Funziona con tutti gli editor di testo.",
            // Desktop download
            downloadBtnText: "Scarica per Windows",
            systemRequirements: "Richiede Windows 10 o superiore • 200 MB di spazio su disco",
            // Browser support
            browserSupportTitle: "Compatibilità browser per riconoscimento vocale (Piattaforma Web)",
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
            browserNote: "Per un'esperienza ottimale con la piattaforma web, raccomandiamo l'uso di Chrome, Edge o Opera.",
            // Download protection messages
            downloadRequiresRegistration: "Per scaricare l'applicazione desktop, devi prima registrarti.",
            downloadConfirm: "Reindirizzare alla registrazione?",
            downloadingText: "Scaricando...",
            // Pricing section
            pricingMainTitle: "Un Abbonamento = Web + Desktop",
            pricingSubtitle: "Goditi entrambe le versioni senza costi aggiuntivi",
            trialTitle: "Prova Gratuita",
            trialPrice: "0 €",
            trialDuration: "7 giorni",
            trialFeature1: "✓ Piattaforma Web completa",
            trialFeature2: "✓ Applicazione Desktop Windows",
            trialFeature3: "✓ Nessuna carta di credito",
            trialFeature4: "✓ Cancellazione automatica",
            trialButton: "Prova Gratis",
            popularBadge: "POPOLARE",
            subscriptionTitle: "Abbonamento Completo",
            subscriptionPrice: "25 €",
            subscriptionDuration: "IVA incl. / mese",
            subscriptionFeature1: "✓ Piattaforma Web illimitata",
            subscriptionFeature2: "✓ Applicazione Desktop Windows",
            subscriptionFeature3: "✓ Aggiornamenti inclusi",
            subscriptionFeature4: "✓ Supporto prioritario",
            subscriptionFeature5: "✓ Cancella quando vuoi",
            subscriptionButton: "Inizia Ora",
            valuePropositionText: "<strong>Perché pagare due volte?</strong> Con SyncVoice Medical, un abbonamento ti dà accesso alla piattaforma web E all'applicazione desktop. Usa quella più adatta a ogni situazione.",
            whatYouGetTitle: "Cosa Ottieni",
            includedBadge: "INCLUSO"
        },
        pt: {
            title: "TRANSCREVA SEUS RELATÓRIOS MÉDICOS COM IA - WEB OU DESKTOP",
            subtitle: "Escolha seu método preferido:<br><strong>Plataforma web em tempo real</strong> ou <strong>Aplicação desktop offline</strong>",
            login: "Entrar",
            language: "Idioma",
            // Version selection
            versionTitle: "Escolha Sua Versão",
            webVersionTitle: "Plataforma Web",
            webVersionDesc: "Transcrição em tempo real no seu navegador",
            desktopVersionTitle: "Aplicação Desktop",
            desktopVersionDesc: "Integração direta com software médico, Word, Excel, etc.",
            // Desktop highlight features
            highlightFeature1Title: "Posicione seu cursor em qualquer software",
            highlightFeature1Desc: "Software médico, Word, Excel, PowerPoint, etc.",
            highlightFeature2Title: "Pressione Ctrl+Shift+D e fale",
            highlightFeature2Desc: "A transcrição aparece diretamente no seu documento.",
            highlightFeature3Title: "100% Offline e seguro",
            highlightFeature3Desc: "Nenhum dado sai do seu computador.",
            // Plans
            freePlanTitle: "Teste Gratuito",
            freePlanDesc: "7 dias grátis",
            paidPlanTitle: "Assinatura",
            paidPlanDesc: "Cancele quando quiser",
            price: "25 € IVA incluído / mês",
            freeButton: "Testar Grátis",
            paidButton: "Começar Agora",
            subscriptionNote: "Assinatura necessária após instalação",
            // Comparison
            comparisonTitle: "Comparação de Versões",
            comparisonHeaders: {
                feature: "Característica",
                web: "🌐 Plataforma Web",
                desktop: "💻 App Desktop"
            },
            comparisonRows: {
                internet: "Conexão à Internet",
                installation: "Instalação",
                security: "Segurança de Dados",
                integration: "Integração de Software",
                access: "Acesso",
                speed: "Velocidade"
            },
            comparisonValues: {
                required: "Necessária",
                notRequired: "Não necessária",
                none: "Nenhuma",
                windowsOnly: "Apenas Windows",
                secureCloud: "Nuvem segura",
                localPC: "Local no seu PC",
                copyPaste: "Copiar/colar necessário",
                direct: "Direta (Word, Excel, etc.)",
                anyBrowser: "Qualquer navegador",
                desktopOnly: "Apenas desktop",
                dependsConnection: "Depende da conexão",
                fastLocal: "Processamento local rápido"
            },
            // Features
            webFeaturesTitle: "🌐 Características Plataforma Web",
            desktopFeaturesTitle: "💻 Características Aplicação Desktop",
            webFeatures: [
                "Conecte-se à nossa plataforma de qualquer navegador",
                "Digite seu código de ativação",
                "Fale diretamente na interface",
                "Copie e cole o texto transcrito"
            ],
            desktopFeatures: [
                "<strong>Abra Word, Excel, PowerPoint ou qualquer outro editor</strong>",
                "<strong>Posicione seu cursor onde quer digitar</strong>",
                "<strong>Pressione Ctrl+Shift+D</strong>",
                "<strong>Fale - a transcrição aparece instantaneamente</strong>"
            ],
            webFeaturesDesc: "Ideal para acesso rápido de qualquer lugar. Compartilhe facilmente seus documentos por email com colegas.",
            desktopFeaturesDesc: "<strong>Vantagem principal:</strong> Transcrição direta no seu software habitual sem interrupção do fluxo de trabalho. Funciona com todos os editores de texto.",
            // Desktop download
            downloadBtnText: "Baixar para Windows",
            systemRequirements: "Requer Windows 10 ou superior • 200 MB de espaço em disco",
            // Browser support
            browserSupportTitle: "Compatibilidade de navegadores para reconhecimento de voz (Plataforma Web)",
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
            browserNote: "Para uma experiência ideal com a plataforma web, recomendamos usar Chrome, Edge ou Opera.",
            // Download protection messages
            downloadRequiresRegistration: "Para baixar a aplicação desktop, você deve primeiro se registrar.",
            downloadConfirm: "Redirecionar para o registro?",
            downloadingText: "Baixando...",
            // Pricing section
            pricingMainTitle: "Uma Assinatura = Web + Desktop",
            pricingSubtitle: "Desfrute de ambas as versões sem custo adicional",
            trialTitle: "Teste Gratuito",
            trialPrice: "0 €",
            trialDuration: "7 dias",
            trialFeature1: "✓ Plataforma Web completa",
            trialFeature2: "✓ Aplicação Desktop Windows",
            trialFeature3: "✓ Sem cartão de crédito",
            trialFeature4: "✓ Cancelamento automático",
            trialButton: "Testar Grátis",
            popularBadge: "POPULAR",
            subscriptionTitle: "Assinatura Completa",
            subscriptionPrice: "25 €",
            subscriptionDuration: "IVA incl. / mês",
            subscriptionFeature1: "✓ Plataforma Web ilimitada",
            subscriptionFeature2: "✓ Aplicação Desktop Windows",
            subscriptionFeature3: "✓ Atualizações incluídas",
            subscriptionFeature4: "✓ Suporte prioritário",
            subscriptionFeature5: "✓ Cancele quando quiser",
            subscriptionButton: "Começar Agora",
            valuePropositionText: "<strong>Por que pagar duas vezes?</strong> Com SyncVoice Medical, uma assinatura dá acesso à plataforma web E à aplicação desktop. Use a que melhor se adequa a cada situação.",
            whatYouGetTitle: "O Que Você Obtém",
            includedBadge: "INCLUÍDO"
        }
    };

    // Country to language mapping
    const countryToLanguage = {
        'FR': 'fr', 'BE': 'fr', 'CH': 'fr', 'CA': 'fr', 'LU': 'fr', 'MC': 'fr',
        'BF': 'fr', 'BJ': 'fr', 'CD': 'fr', 'CI': 'fr', 'GA': 'fr', 'GN': 'fr',
        'ML': 'fr', 'NE': 'fr', 'SN': 'fr', 'TG': 'fr',
        'GB': 'en', 'US': 'en', 'AU': 'en', 'NZ': 'en', 'IE': 'en', 'ZA': 'en',
        'NG': 'en', 'KE': 'en', 'GH': 'en', 'IN': 'en', 'PK': 'en', 'PH': 'en', 'SG': 'en',
        'DE': 'de', 'AT': 'de', 'LI': 'de',
        'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'PE': 'es', 'VE': 'es',
        'CL': 'es', 'EC': 'es', 'GT': 'es', 'CU': 'es', 'BO': 'es', 'DO': 'es',
        'HN': 'es', 'PY': 'es', 'SV': 'es', 'NI': 'es', 'CR': 'es', 'PA': 'es', 'UY': 'es',
        'IT': 'it', 'SM': 'it', 'VA': 'it',
        'PT': 'pt', 'BR': 'pt', 'AO': 'pt', 'MZ': 'pt', 'CV': 'pt', 'GW': 'pt', 'ST': 'pt', 'TL': 'pt'
    };

    // DESKTOP DOWNLOAD PROTECTION LOGIC
    async function handleDesktopDownload(currentLang) {
        const content = translations[currentLang] || translations['fr'];
        
        const userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
        const activationCode = sessionStorage.getItem('activationCode') || localStorage.getItem('activationCode');
        
        if (userEmail && activationCode) {
            console.log('User is registered, proceeding with download');
            
            if (elements.downloadBtnText) {
                const originalText = elements.downloadBtnText.textContent;
                elements.downloadBtnText.textContent = content.downloadingText;
                
                setTimeout(() => {
                    elements.downloadBtnText.textContent = originalText;
                }, 3000);
            }
            
            window.location.href = `/api/download-desktop?lang=${currentLang}&email=${encodeURIComponent(userEmail)}&code=${activationCode}`;
            
        } else {
            alert(content.downloadRequiresRegistration);
            
            if (confirm(content.downloadConfirm)) {
                window.location.href = `form.html?plan=free&intent=download&lang=${currentLang}`;
            }
        }
    }

    // Language detection functions
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

    async function detectLanguage() {
        console.log('🔍 Starting comprehensive language detection...');
        
        if (urlLang && ['fr', 'en', 'de', 'es', 'it', 'pt'].includes(urlLang)) {
            console.log(`✅ Using URL language parameter: ${urlLang}`);
            return urlLang;
        }
        
        // Always prioritize geolocation to detect current country
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
        
        const browserLang = detectBrowserLanguage();
        console.log(`✅ Using browser language: ${browserLang}`);
        return browserLang;
    }

    // Enhanced content update function - INCLUDING HIGHLIGHT FEATURES
    function updateContent(lang) {
        console.log('🎨 Updating page content for language:', lang);
        
        const content = translations[lang] || translations['fr'];
        
        // Update basic elements
        if (elements.languageLabel) {
            elements.languageLabel.textContent = content.language + ':';
        }
        if (elements.loginBtn) {
            elements.loginBtn.textContent = content.login;
        }
        if (elements.title) elements.title.textContent = content.title;
        if (elements.subtitle) elements.subtitle.innerHTML = content.subtitle;

        // Update version selection
        if (elements.versionTitle) elements.versionTitle.textContent = content.versionTitle;
        if (elements.webVersionTitle) elements.webVersionTitle.textContent = content.webVersionTitle;
        if (elements.webVersionDesc) elements.webVersionDesc.textContent = content.webVersionDesc;
        if (elements.desktopVersionTitle) elements.desktopVersionTitle.textContent = content.desktopVersionTitle;
        if (elements.desktopVersionDesc) elements.desktopVersionDesc.textContent = content.desktopVersionDesc;

        // UPDATE DESKTOP HIGHLIGHT FEATURES - THIS IS CRITICAL
        if (elements.highlightFeature1Title) elements.highlightFeature1Title.textContent = content.highlightFeature1Title;
        if (elements.highlightFeature1Desc) elements.highlightFeature1Desc.textContent = content.highlightFeature1Desc;
        if (elements.highlightFeature2Title) elements.highlightFeature2Title.textContent = content.highlightFeature2Title;
        if (elements.highlightFeature2Desc) elements.highlightFeature2Desc.textContent = content.highlightFeature2Desc;
        if (elements.highlightFeature3Title) elements.highlightFeature3Title.textContent = content.highlightFeature3Title;
        if (elements.highlightFeature3Desc) elements.highlightFeature3Desc.textContent = content.highlightFeature3Desc;

        // Update plans
        if (elements.freePlanTitle) elements.freePlanTitle.textContent = content.freePlanTitle;
        if (elements.paidPlanTitle) elements.paidPlanTitle.textContent = content.paidPlanTitle;
        if (elements.freePlanDesc) elements.freePlanDesc.textContent = content.freePlanDesc;
        if (elements.paidPlanDesc) elements.paidPlanDesc.textContent = content.paidPlanDesc;
        if (elements.priceElement) elements.priceElement.textContent = content.price;
        if (elements.subscriptionNote) elements.subscriptionNote.innerHTML = `<em>${content.subscriptionNote}</em>`;

        // Update comparison section
        if (elements.comparisonTitle) elements.comparisonTitle.textContent = content.comparisonTitle;
        
        // Update comparison table headers
        if (elements.comparisonTable) {
            const headers = elements.comparisonTable.querySelectorAll('th');
            if (headers.length >= 3) {
                headers[0].textContent = content.comparisonHeaders.feature;
                headers[1].textContent = content.comparisonHeaders.web;
                headers[2].textContent = content.comparisonHeaders.desktop;
            }

            // Update comparison table content
            const rows = elements.comparisonTable.querySelectorAll('tbody tr');
            if (rows.length >= 6) {
                // Internet connection row
                const cells1 = rows[0].querySelectorAll('td');
                if (cells1.length >= 3) {
                    cells1[0].innerHTML = `<strong>${content.comparisonRows.internet}</strong>`;
                    cells1[1].textContent = content.comparisonValues.required;
                    cells1[2].textContent = content.comparisonValues.notRequired;
                }
                
                // Installation row
                const cells2 = rows[1].querySelectorAll('td');
                if (cells2.length >= 3) {
                    cells2[0].innerHTML = `<strong>${content.comparisonRows.installation}</strong>`;
                    cells2[1].textContent = content.comparisonValues.none;
                    cells2[2].textContent = content.comparisonValues.windowsOnly;
                }
                
                // Security row
                const cells3 = rows[2].querySelectorAll('td');
                if (cells3.length >= 3) {
                    cells3[0].innerHTML = `<strong>${content.comparisonRows.security}</strong>`;
                    cells3[1].textContent = content.comparisonValues.secureCloud;
                    cells3[2].textContent = content.comparisonValues.localPC;
                }
                
                // Integration row
                const cells4 = rows[3].querySelectorAll('td');
                if (cells4.length >= 3) {
                    cells4[0].innerHTML = `<strong>${content.comparisonRows.integration}</strong>`;
                    cells4[1].textContent = content.comparisonValues.copyPaste;
                    cells4[2].textContent = content.comparisonValues.direct;
                }
                
                // Access row
                const cells5 = rows[4].querySelectorAll('td');
                if (cells5.length >= 3) {
                    cells5[0].innerHTML = `<strong>${content.comparisonRows.access}</strong>`;
                    cells5[1].textContent = content.comparisonValues.anyBrowser;
                    cells5[2].textContent = content.comparisonValues.desktopOnly;
                }
                
                // Speed row
                const cells6 = rows[5].querySelectorAll('td');
                if (cells6.length >= 3) {
                    cells6[0].innerHTML = `<strong>${content.comparisonRows.speed}</strong>`;
                    cells6[1].textContent = content.comparisonValues.dependsConnection;
                    cells6[2].textContent = content.comparisonValues.fastLocal;
                }
            }
        }

        // Update features sections
        if (elements.webFeaturesTitle) elements.webFeaturesTitle.textContent = content.webFeaturesTitle;
        if (elements.desktopFeaturesTitle) elements.desktopFeaturesTitle.textContent = content.desktopFeaturesTitle;
        
        if (elements.webFeaturesList) {
            elements.webFeaturesList.innerHTML = content.webFeatures
                .map(feature => `<li>${feature}</li>`)
                .join('');
        }
        
        if (elements.desktopFeaturesList) {
            elements.desktopFeaturesList.innerHTML = content.desktopFeatures
                .map(feature => `<li>${feature}</li>`)
                .join('');
        }
        
        if (elements.webFeaturesDesc) elements.webFeaturesDesc.textContent = content.webFeaturesDesc;
        if (elements.desktopFeaturesDesc) elements.desktopFeaturesDesc.innerHTML = content.desktopFeaturesDesc;

        // Update start buttons
        const freeButton = document.querySelector('.btn[data-version="free"]');
        const paidButton = document.querySelector('.btn[data-version="paid"]');
        
        if (freeButton) {
            freeButton.textContent = content.freeButton;
            const url = new URL(freeButton.href, window.location.origin);
            url.searchParams.set('lang', lang);
            freeButton.href = url.pathname + url.search;
        }
        
        if (paidButton) {
            paidButton.textContent = content.paidButton;
            const url = new URL(paidButton.href, window.location.origin);
            url.searchParams.set('lang', lang);
            paidButton.href = url.pathname + url.search;
        }

        // Update desktop download section
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
            // Update browser table headers
            const tableHead = elements.browserTable.querySelector('thead tr');
            if (tableHead) {
                const headers = tableHead.querySelectorAll('th');
                if (headers.length >= 3) {
                    headers[0].textContent = content.browserTableHeaders.browser;
                    headers[1].textContent = content.browserTableHeaders.support;
                    headers[2].textContent = content.browserTableHeaders.recommendation;
                }
            }
            
            // Update browser support text
            const supportSpans = elements.browserTable.querySelectorAll('.support-full, .support-partial, .support-limited');
            supportSpans.forEach(span => {
                if (span.classList.contains('support-full')) {
                    span.textContent = content.browserSupport.full;
                } else if (span.classList.contains('support-partial')) {
                    span.textContent = content.browserSupport.partial;
                } else if (span.classList.contains('support-limited')) {
                    span.textContent = content.browserSupport.limited;
                }
            });
            
            // Update browser recommendations
            const recommendationSpans = elements.browserTable.querySelectorAll('.recommended, .limited, .not-recommended');
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
        
        if (elements.browserNote) {
            elements.browserNote.textContent = content.browserNote;
        }

        // DO NOT STORE LANGUAGE PREFERENCE - THIS IS THE FIX
        // Remove localStorage saving to always use geolocation
        
        // Update document language
        document.documentElement.lang = lang;

        // Update language selector
        if (elements.languageSelect) {
            elements.languageSelect.value = lang;
            console.log('🔄 Updated language selector to:', lang);
        }

        // UPDATE PRICING SECTION ELEMENTS - CRITICAL FIX
        if (document.getElementById('pricing-main-title')) {
            document.getElementById('pricing-main-title').textContent = content.pricingMainTitle;
        }
        if (document.getElementById('pricing-subtitle')) {
            document.getElementById('pricing-subtitle').textContent = content.pricingSubtitle;
        }
        if (document.getElementById('trial-title')) {
            document.getElementById('trial-title').textContent = content.trialTitle;
        }
        if (document.getElementById('trial-price')) {
            document.getElementById('trial-price').textContent = content.trialPrice;
        }
        if (document.getElementById('trial-duration')) {
            document.getElementById('trial-duration').textContent = content.trialDuration;
        }
        if (document.getElementById('trial-feature-1')) {
            document.getElementById('trial-feature-1').textContent = content.trialFeature1;
        }
        if (document.getElementById('trial-feature-2')) {
            document.getElementById('trial-feature-2').textContent = content.trialFeature2;
        }
        if (document.getElementById('trial-feature-3')) {
            document.getElementById('trial-feature-3').textContent = content.trialFeature3;
        }
        if (document.getElementById('trial-feature-4')) {
            document.getElementById('trial-feature-4').textContent = content.trialFeature4;
        }
        if (document.getElementById('trial-button')) {
            const trialBtn = document.getElementById('trial-button');
            trialBtn.textContent = content.trialButton;
            const url = new URL(trialBtn.href, window.location.origin);
            url.searchParams.set('lang', lang);
            trialBtn.href = url.pathname + url.search;
        }
        if (document.getElementById('popular-badge')) {
            document.getElementById('popular-badge').textContent = content.popularBadge;
        }
        if (document.getElementById('subscription-title')) {
            document.getElementById('subscription-title').textContent = content.subscriptionTitle;
        }
        if (document.getElementById('subscription-price')) {
            document.getElementById('subscription-price').textContent = content.subscriptionPrice;
        }
        if (document.getElementById('subscription-duration')) {
            document.getElementById('subscription-duration').textContent = content.subscriptionDuration;
        }
        if (document.getElementById('subscription-feature-1')) {
            document.getElementById('subscription-feature-1').textContent = content.subscriptionFeature1;
        }
        if (document.getElementById('subscription-feature-2')) {
            document.getElementById('subscription-feature-2').textContent = content.subscriptionFeature2;
        }
        if (document.getElementById('subscription-feature-3')) {
            document.getElementById('subscription-feature-3').textContent = content.subscriptionFeature3;
        }
        if (document.getElementById('subscription-feature-4')) {
            document.getElementById('subscription-feature-4').textContent = content.subscriptionFeature4;
        }
        if (document.getElementById('subscription-feature-5')) {
            document.getElementById('subscription-feature-5').textContent = content.subscriptionFeature5;
        }
        if (document.getElementById('subscription-button')) {
            const subBtn = document.getElementById('subscription-button');
            subBtn.textContent = content.subscriptionButton;
            const url = new URL(subBtn.href, window.location.origin);
            url.searchParams.set('lang', lang);
            subBtn.href = url.pathname + url.search;
        }
        if (document.getElementById('value-proposition-text')) {
            document.getElementById('value-proposition-text').innerHTML = content.valuePropositionText;
        }
        if (document.getElementById('what-you-get-title')) {
            document.getElementById('what-you-get-title').textContent = content.whatYouGetTitle;
        }
        if (document.getElementById('included-badge-web')) {
            document.getElementById('included-badge-web').textContent = content.includedBadge;
        }
        if (document.getElementById('included-badge-desktop')) {
            document.getElementById('included-badge-desktop').textContent = content.includedBadge;
        }
    }

    // Initialize the page
    console.log('🚀 Initializing SyncVoice Medical with enhanced dual version layout...');
    
    const detectedLanguage = await detectLanguage();
    
    if (!urlLang && detectedLanguage) {
        console.log(`🔗 Updating URL to include detected language: ${detectedLanguage}`);
        const url = new URL(window.location);
        url.searchParams.set('lang', detectedLanguage);
        window.history.replaceState({}, '', url);
    }
    
    updateContent(detectedLanguage);
    
    // Setup event listeners
    if (elements.languageSelect) {
        elements.languageSelect.addEventListener('change', function(e) {
            const newLang = e.target.value;
            console.log(`🔄 Language changed to: ${newLang}`);
            
            const url = new URL(window.location);
            url.searchParams.set('lang', newLang);
            window.history.pushState({}, '', url);
            
            updateContent(newLang);
        });
    }

    // LOGIN BUTTON FUNCTIONALITY
    if (elements.loginBtn) {
        elements.loginBtn.addEventListener('click', function() {
            const currentLang = elements.languageSelect ? elements.languageSelect.value : detectedLanguage;
            window.location.href = `login.html?lang=${currentLang}`;
        });
    }

    // DESKTOP DOWNLOAD BUTTON FUNCTIONALITY
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const currentLang = elements.languageSelect ? elements.languageSelect.value : detectedLanguage;
            handleDesktopDownload(currentLang);
        });
    }

    console.log('✅ SyncVoice Medical enhanced page initialization complete');
});