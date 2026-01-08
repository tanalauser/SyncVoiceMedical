/**
 * SyncVoice Medical - Landing Page JavaScript
 * Handles language detection, currency selection, pricing toggle, and translations
 */

document.addEventListener('DOMContentLoaded', async function() {
    'use strict';
    
    console.log('🚀 SyncVoice Medical - Initializing...');

    // ============================================
    // Configuration
    // ============================================
    
    // Countries using GBP
    const GBP_COUNTRIES = ['GB', 'UK', 'IM', 'JE', 'GG'];
    
    // EUR countries
    const EUR_COUNTRIES = [
        'AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 
        'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'AD', 
        'MC', 'SM', 'VA', 'ME', 'XK'
    ];

    // Pricing configuration
    const PRICING = {
        EUR: { symbol: '€', monthly: 25, yearly: 250 },
        GBP: { symbol: '£', monthly: 25, yearly: 250 }
    };

    // ============================================
    // State
    // ============================================
    let currentLang = 'fr';
    let currentCurrency = 'EUR';
    let userCountry = null;

    // ============================================
    // Translations
    // ============================================
    const translations = {
        fr: {
            loginText: 'Se connecter',
            heroTitle: ['Parlez.', 'Transcrivez.', 'Soignez.'],
            heroSubtitle: 'Transcription médicale intelligente par IA.<br><strong>Dictées illimitées. Précision professionnelle.</strong>',
            ctaFreeText: 'Essai gratuit 7 jours',
            ctaPricingText: 'Voir les tarifs',
            badgeSecure: 'Sécurisé RGPD',
            badgeMedical: 'Usage médical',
            badgeUnlimited: 'Dictées illimitées',
            howItWorksTitle: 'Comment ça marche',
            step1Title: '1. Connectez-vous',
            step1Desc: 'Accédez à la plateforme depuis votre navigateur ou notre application Windows.',
            step2Title: '2. Dictez',
            step2Desc: "L'IA transcrit en temps réel avec précision médicale.",
            step3Title: '3. Utilisez',
            step3Desc: 'Copiez ou exportez directement vers Word. Partagez avec vos collègues.',
            pricingTitle: 'Tarifs simples et transparents',
            pricingSubtitle: 'Sans engagement. Annulez quand vous voulez.',
            freeTitle: 'Essai Gratuit',
            freePeriod: '7 jours',
            freeFeature1: '✓ Accès complet à la plateforme',
            freeFeature2: '✓ Dictées illimitées',
            freeBtnText: "Commencer l'essai",
            monthlyTitle: 'Mensuel',
            monthlyBtnText: 'Choisir mensuel',
            yearlyTitle: 'Annuel',
            yearlyBtnText: 'Choisir annuel',
            yearlySavings: 'Économisez 50€ par an',
            popularBadge: 'Populaire',
            proPeriodMonthly: '/mois',
            proPeriodYearly: '/an',
            proNote: 'TTC',
            desktopLabel: 'Application Bureau',
            desktopTitle: 'Travaillez directement dans Word, Excel, PowerPoint',
            desktopDesc: "Notre application Windows s'intègre parfaitement à vos outils quotidiens. Placez votre curseur, appuyez sur <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd>, et dictez directement.",
            offlineTitle: '100% Hors ligne',
            offlineDesc: 'Aucune connexion requise',
            secureTitle: 'Données locales',
            secureDesc: 'Rien ne quitte votre PC',
            fastTitle: 'Ultra rapide',
            fastDesc: 'Traitement instantané',
            downloadBtnText: 'Télécharger pour Windows',
            systemReq: 'Windows 10+ • 200 MB • Abonnement requis',
            typingText: 'Le patient présente une douleur thoracique...',
            comparisonTitle: 'Web ou Bureau ?',
            comparisonSubtitle: 'Choisissez la solution adaptée à vos besoins',
            compFeature: 'Fonctionnalité',
            compWeb: 'Plateforme Web',
            compDesktop: 'Application Bureau',
            compInternet: 'Connexion Internet',
            compInternetWeb: 'Requise',
            compInternetDesktop: 'Non requise',
            compInstall: 'Installation',
            compInstallWeb: 'Aucune',
            compInstallDesktop: 'Windows uniquement',
            compSecurity: 'Sécurité données',
            compSecurityWeb: 'Cloud sécurisé',
            compSecurityDesktop: 'Local sur PC',
            compIntegration: 'Intégration Office',
            compIntegrationWeb: 'Copier/coller',
            compIntegrationDesktop: 'Directe',
            compAccess: 'Accessibilité',
            compAccessWeb: 'Tout navigateur',
            compAccessDesktop: 'Bureau uniquement',
            browserTitle: 'Navigateurs compatibles (Plateforme Web)',
            chromeStatus: 'Recommandé',
            edgeStatus: 'Recommandé',
            operaStatus: 'Recommandé',
            safariStatus: 'Limité',
            firefoxStatus: 'Non recommandé',
            footerTagline: 'Transcription médicale intelligente',
            footerPrivacy: 'Confidentialité',
            footerTerms: 'Conditions',
            footerContact: 'Contact',
            footerRights: 'Tous droits réservés.',
            downloadRequiresRegistration: "Pour télécharger l'application, vous devez d'abord vous inscrire.",
            downloadConfirm: "Rediriger vers l'inscription ?"
        },
        en: {
            loginText: 'Login',
            heroTitle: ['Speak.', 'Transcribe.', 'Heal.'],
            heroSubtitle: 'AI-powered medical transcription.<br><strong>Unlimited dictation. Professional accuracy.</strong>',
            ctaFreeText: '7-day free trial',
            ctaPricingText: 'See pricing',
            badgeSecure: 'GDPR Secure',
            badgeMedical: 'Medical grade',
            badgeUnlimited: 'Unlimited dictation',
            howItWorksTitle: 'How it works',
            step1Title: '1. Connect',
            step1Desc: 'Access the platform from your browser or our Windows app.',
            step2Title: '2. Dictate',
            step2Desc: 'AI transcribes in real-time with medical accuracy.',
            step3Title: '3. Use',
            step3Desc: 'Copy or export directly to Word. Share with colleagues.',
            pricingTitle: 'Simple, transparent pricing',
            pricingSubtitle: 'No commitment. Cancel anytime.',
            freeTitle: 'Free Trial',
            freePeriod: '7 days',
            freeFeature1: '✓ Full platform access',
            freeFeature2: '✓ Unlimited dictation',
            freeBtnText: 'Start trial',
            monthlyTitle: 'Monthly',
            monthlyBtnText: 'Choose monthly',
            yearlyTitle: 'Yearly',
            yearlyBtnText: 'Choose yearly',
            yearlySavings: 'Save £50 per year',
            popularBadge: 'Popular',
            proPeriodMonthly: '/month',
            proPeriodYearly: '/year',
            proNote: 'VAT included',
            desktopLabel: 'Desktop Application',
            desktopTitle: 'Work directly in Word, Excel, PowerPoint',
            desktopDesc: 'Our Windows app integrates seamlessly with your daily tools. Place your cursor, press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd>, and dictate directly.',
            offlineTitle: '100% Offline',
            offlineDesc: 'No connection required',
            secureTitle: 'Local data',
            secureDesc: 'Nothing leaves your PC',
            fastTitle: 'Ultra fast',
            fastDesc: 'Instant processing',
            downloadBtnText: 'Download for Windows',
            systemReq: 'Windows 10+ • 200 MB • Subscription required',
            typingText: 'The patient presents with chest pain...',
            comparisonTitle: 'Web or Desktop?',
            comparisonSubtitle: 'Choose the solution that fits your needs',
            compFeature: 'Feature',
            compWeb: 'Web Platform',
            compDesktop: 'Desktop App',
            compInternet: 'Internet Connection',
            compInternetWeb: 'Required',
            compInternetDesktop: 'Not required',
            compInstall: 'Installation',
            compInstallWeb: 'None',
            compInstallDesktop: 'Windows only',
            compSecurity: 'Data Security',
            compSecurityWeb: 'Secure cloud',
            compSecurityDesktop: 'Local on PC',
            compIntegration: 'Office Integration',
            compIntegrationWeb: 'Copy/paste',
            compIntegrationDesktop: 'Direct',
            compAccess: 'Accessibility',
            compAccessWeb: 'Any browser',
            compAccessDesktop: 'Desktop only',
            browserTitle: 'Compatible browsers (Web Platform)',
            chromeStatus: 'Recommended',
            edgeStatus: 'Recommended',
            operaStatus: 'Recommended',
            safariStatus: 'Limited',
            firefoxStatus: 'Not recommended',
            footerTagline: 'Intelligent medical transcription',
            footerPrivacy: 'Privacy',
            footerTerms: 'Terms',
            footerContact: 'Contact',
            footerRights: 'All rights reserved.',
            downloadRequiresRegistration: 'To download the app, you must register first.',
            downloadConfirm: 'Redirect to registration?'
        },
        de: {
            loginText: 'Anmelden',
            heroTitle: ['Sprechen.', 'Transkribieren.', 'Heilen.'],
            heroSubtitle: 'KI-gestützte medizinische Transkription.<br><strong>Unbegrenzte Diktate. Professionelle Genauigkeit.</strong>',
            ctaFreeText: '7 Tage kostenlos',
            ctaPricingText: 'Preise ansehen',
            badgeSecure: 'DSGVO-konform',
            badgeMedical: 'Medizinische Qualität',
            badgeUnlimited: 'Unbegrenzte Diktate',
            howItWorksTitle: 'So funktioniert es',
            step1Title: '1. Verbinden',
            step1Desc: 'Greifen Sie über Ihren Browser oder unsere Windows-App zu.',
            step2Title: '2. Diktieren',
            step2Desc: 'KI transkribiert in Echtzeit mit medizinischer Genauigkeit.',
            step3Title: '3. Verwenden',
            step3Desc: 'Kopieren oder direkt nach Word exportieren.',
            pricingTitle: 'Einfache, transparente Preise',
            pricingSubtitle: 'Keine Bindung. Jederzeit kündbar.',
            freeTitle: 'Kostenlose Testversion',
            freePeriod: '7 Tage',
            freeFeature1: '✓ Voller Plattformzugang',
            freeFeature2: '✓ Unbegrenzte Diktate',
            freeBtnText: 'Test starten',
            monthlyTitle: 'Monatlich',
            monthlyBtnText: 'Monatlich wählen',
            yearlyTitle: 'Jährlich',
            yearlyBtnText: 'Jährlich wählen',
            yearlySavings: '50€ pro Jahr sparen',
            popularBadge: 'Beliebt',
            proPeriodMonthly: '/Monat',
            proPeriodYearly: '/Jahr',
            proNote: 'inkl. MwSt.',
            desktopLabel: 'Desktop-Anwendung',
            desktopTitle: 'Arbeiten Sie direkt in Word, Excel, PowerPoint',
            desktopDesc: 'Unsere Windows-App integriert sich nahtlos in Ihre Tools. Platzieren Sie Ihren Cursor, drücken Sie <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd>, und diktieren Sie direkt.',
            offlineTitle: '100% Offline',
            offlineDesc: 'Keine Verbindung erforderlich',
            secureTitle: 'Lokale Daten',
            secureDesc: 'Nichts verlässt Ihren PC',
            fastTitle: 'Ultra schnell',
            fastDesc: 'Sofortige Verarbeitung',
            downloadBtnText: 'Für Windows herunterladen',
            systemReq: 'Windows 10+ • 200 MB • Abonnement erforderlich',
            typingText: 'Der Patient zeigt Brustschmerzen...',
            comparisonTitle: 'Web oder Desktop?',
            comparisonSubtitle: 'Wählen Sie die passende Lösung',
            compFeature: 'Funktion',
            compWeb: 'Web-Plattform',
            compDesktop: 'Desktop-App',
            compInternet: 'Internetverbindung',
            compInternetWeb: 'Erforderlich',
            compInternetDesktop: 'Nicht erforderlich',
            compInstall: 'Installation',
            compInstallWeb: 'Keine',
            compInstallDesktop: 'Nur Windows',
            compSecurity: 'Datensicherheit',
            compSecurityWeb: 'Sichere Cloud',
            compSecurityDesktop: 'Lokal auf PC',
            compIntegration: 'Office-Integration',
            compIntegrationWeb: 'Kopieren/Einfügen',
            compIntegrationDesktop: 'Direkt',
            compAccess: 'Zugänglichkeit',
            compAccessWeb: 'Jeder Browser',
            compAccessDesktop: 'Nur Desktop',
            browserTitle: 'Kompatible Browser (Web-Plattform)',
            chromeStatus: 'Empfohlen',
            edgeStatus: 'Empfohlen',
            operaStatus: 'Empfohlen',
            safariStatus: 'Eingeschränkt',
            firefoxStatus: 'Nicht empfohlen',
            footerTagline: 'Intelligente medizinische Transkription',
            footerPrivacy: 'Datenschutz',
            footerTerms: 'AGB',
            footerContact: 'Kontakt',
            footerRights: 'Alle Rechte vorbehalten.',
            downloadRequiresRegistration: 'Zum Download müssen Sie sich registrieren.',
            downloadConfirm: 'Zur Registrierung weiterleiten?'
        },
        es: {
            loginText: 'Iniciar sesión',
            heroTitle: ['Habla.', 'Transcribe.', 'Cura.'],
            heroSubtitle: 'Transcripción médica con IA.<br><strong>Dictados ilimitados. Precisión profesional.</strong>',
            ctaFreeText: 'Prueba gratuita 7 días',
            ctaPricingText: 'Ver precios',
            badgeSecure: 'Seguro RGPD',
            badgeMedical: 'Uso médico',
            badgeUnlimited: 'Dictados ilimitados',
            howItWorksTitle: 'Cómo funciona',
            step1Title: '1. Conéctese',
            step1Desc: 'Acceda desde su navegador o nuestra aplicación Windows.',
            step2Title: '2. Dicte',
            step2Desc: 'La IA transcribe en tiempo real con precisión médica.',
            step3Title: '3. Utilice',
            step3Desc: 'Copie o exporte directamente a Word.',
            pricingTitle: 'Precios simples y transparentes',
            pricingSubtitle: 'Sin compromiso. Cancele cuando quiera.',
            monthlyTitle: 'Mensual',
            monthlyBtnText: 'Elegir mensual',
            yearlyTitle: 'Anual',
            yearlyBtnText: 'Elegir anual',
            yearlySavings: 'Ahorra 50€ al año',
            freeTitle: 'Prueba Gratuita',
            freePeriod: '7 días',
            freeFeature1: '✓ Acceso completo',
            freeFeature2: '✓ Dictados ilimitados',
            freeBtnText: 'Comenzar prueba',
            popularBadge: 'Popular',
            proPeriodMonthly: '/mes',
            proPeriodYearly: '/año',
            proNote: 'IVA incluido',
            desktopLabel: 'Aplicación de Escritorio',
            desktopTitle: 'Trabaje directamente en Word, Excel, PowerPoint',
            desktopDesc: 'Nuestra aplicación se integra perfectamente con sus herramientas. Coloque el cursor, presione <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd>, y dicte directamente.',
            offlineTitle: '100% Sin conexión',
            offlineDesc: 'No requiere conexión',
            secureTitle: 'Datos locales',
            secureDesc: 'Nada sale de su PC',
            fastTitle: 'Ultra rápido',
            fastDesc: 'Procesamiento instantáneo',
            downloadBtnText: 'Descargar para Windows',
            systemReq: 'Windows 10+ • 200 MB • Suscripción requerida',
            typingText: 'El paciente presenta dolor torácico...',
            comparisonTitle: '¿Web o Escritorio?',
            comparisonSubtitle: 'Elija la solución adaptada a sus necesidades',
            compFeature: 'Característica',
            compWeb: 'Plataforma Web',
            compDesktop: 'App Escritorio',
            compInternet: 'Conexión Internet',
            compInternetWeb: 'Requerida',
            compInternetDesktop: 'No requerida',
            compInstall: 'Instalación',
            compInstallWeb: 'Ninguna',
            compInstallDesktop: 'Solo Windows',
            compSecurity: 'Seguridad datos',
            compSecurityWeb: 'Nube segura',
            compSecurityDesktop: 'Local en PC',
            compIntegration: 'Integración Office',
            compIntegrationWeb: 'Copiar/pegar',
            compIntegrationDesktop: 'Directa',
            compAccess: 'Accesibilidad',
            compAccessWeb: 'Cualquier navegador',
            compAccessDesktop: 'Solo escritorio',
            browserTitle: 'Navegadores compatibles (Plataforma Web)',
            chromeStatus: 'Recomendado',
            edgeStatus: 'Recomendado',
            operaStatus: 'Recomendado',
            safariStatus: 'Limitado',
            firefoxStatus: 'No recomendado',
            footerTagline: 'Transcripción médica inteligente',
            footerPrivacy: 'Privacidad',
            footerTerms: 'Términos',
            footerContact: 'Contacto',
            footerRights: 'Todos los derechos reservados.',
            downloadRequiresRegistration: 'Para descargar, debe registrarse primero.',
            downloadConfirm: '¿Redirigir al registro?'
        },
        it: {
            loginText: 'Accedi',
            heroTitle: ['Parla.', 'Trascrivi.', 'Cura.'],
            heroSubtitle: 'Trascrizione medica con IA.<br><strong>Dettature illimitate. Precisione professionale.</strong>',
            ctaFreeText: 'Prova gratuita 7 giorni',
            ctaPricingText: 'Vedi prezzi',
            badgeSecure: 'Sicuro GDPR',
            badgeMedical: 'Uso medico',
            badgeUnlimited: 'Dettature illimitate',
            howItWorksTitle: 'Come funziona',
            step1Title: '1. Connettiti',
            step1Desc: 'Accedi dal browser o dalla nostra app Windows.',
            step2Title: '2. Detta',
            step2Desc: "L'IA trascrive in tempo reale con precisione medica.",
            step3Title: '3. Usa',
            step3Desc: 'Copia o esporta direttamente su Word.',
            pricingTitle: 'Prezzi semplici e trasparenti',
            pricingSubtitle: 'Senza impegno. Annulla quando vuoi.',
            freeTitle: 'Prova Gratuita',
            freePeriod: '7 giorni',
            freeFeature1: '✓ Accesso completo',
            freeFeature2: '✓ Dettature illimitate',
            freeBtnText: 'Inizia prova',
            monthlyTitle: 'Mensile',
            monthlyBtnText: 'Scegli mensile',
            yearlyTitle: 'Annuale',
            yearlyBtnText: 'Scegli annuale',
            yearlySavings: 'Risparmia 50€ all\'anno',
            popularBadge: 'Popolare',
            proPeriodMonthly: '/mese',
            proPeriodYearly: '/anno',
            proNote: 'IVA inclusa',
            desktopLabel: 'Applicazione Desktop',
            desktopTitle: 'Lavora direttamente in Word, Excel, PowerPoint',
            desktopDesc: "La nostra app si integra perfettamente con i tuoi strumenti. Posiziona il cursore, premi <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd>, e detta direttamente.",
            offlineTitle: '100% Offline',
            offlineDesc: 'Nessuna connessione richiesta',
            secureTitle: 'Dati locali',
            secureDesc: 'Nulla lascia il tuo PC',
            fastTitle: 'Ultra veloce',
            fastDesc: 'Elaborazione istantanea',
            downloadBtnText: 'Scarica per Windows',
            systemReq: 'Windows 10+ • 200 MB • Abbonamento richiesto',
            typingText: 'Il paziente presenta dolore toracico...',
            comparisonTitle: 'Web o Desktop?',
            comparisonSubtitle: 'Scegli la soluzione adatta alle tue esigenze',
            compFeature: 'Funzionalità',
            compWeb: 'Piattaforma Web',
            compDesktop: 'App Desktop',
            compInternet: 'Connessione Internet',
            compInternetWeb: 'Richiesta',
            compInternetDesktop: 'Non richiesta',
            compInstall: 'Installazione',
            compInstallWeb: 'Nessuna',
            compInstallDesktop: 'Solo Windows',
            compSecurity: 'Sicurezza dati',
            compSecurityWeb: 'Cloud sicuro',
            compSecurityDesktop: 'Locale su PC',
            compIntegration: 'Integrazione Office',
            compIntegrationWeb: 'Copia/incolla',
            compIntegrationDesktop: 'Diretta',
            compAccess: 'Accessibilità',
            compAccessWeb: 'Qualsiasi browser',
            compAccessDesktop: 'Solo desktop',
            browserTitle: 'Browser compatibili (Piattaforma Web)',
            chromeStatus: 'Consigliato',
            edgeStatus: 'Consigliato',
            operaStatus: 'Consigliato',
            safariStatus: 'Limitato',
            firefoxStatus: 'Non consigliato',
            footerTagline: 'Trascrizione medica intelligente',
            footerPrivacy: 'Privacy',
            footerTerms: 'Termini',
            footerContact: 'Contatto',
            footerRights: 'Tutti i diritti riservati.',
            downloadRequiresRegistration: 'Per scaricare, devi prima registrarti.',
            downloadConfirm: 'Reindirizzare alla registrazione?'
        },
        pt: {
            loginText: 'Entrar',
            heroTitle: ['Fale.', 'Transcreva.', 'Cure.'],
            heroSubtitle: 'Transcrição médica com IA.<br><strong>Ditados ilimitados. Precisão profissional.</strong>',
            ctaFreeText: 'Teste grátis 7 dias',
            ctaPricingText: 'Ver preços',
            badgeSecure: 'Seguro RGPD',
            badgeMedical: 'Uso médico',
            badgeUnlimited: 'Ditados ilimitados',
            howItWorksTitle: 'Como funciona',
            step1Title: '1. Conecte-se',
            step1Desc: 'Acesse pelo navegador ou nosso aplicativo Windows.',
            step2Title: '2. Dite',
            step2Desc: 'A IA transcreve em tempo real com precisão médica.',
            step3Title: '3. Use',
            step3Desc: 'Copie ou exporte diretamente para Word.',
            pricingTitle: 'Preços simples e transparentes',
            pricingSubtitle: 'Sem compromisso. Cancele quando quiser.',
            freeTitle: 'Teste Gratuito',
            freePeriod: '7 dias',
            freeFeature1: '✓ Acesso completo',
            freeFeature2: '✓ Ditados ilimitados',
            freeBtnText: 'Começar teste',
            monthlyTitle: 'Mensal',
            monthlyBtnText: 'Escolher mensal',
            yearlyTitle: 'Anual',
            yearlyBtnText: 'Escolher anual',
            yearlySavings: 'Economize 50€ por ano',
            popularBadge: 'Popular',
            proPeriodMonthly: '/mês',
            proPeriodYearly: '/ano',
            proNote: 'IVA incluído',
            desktopLabel: 'Aplicativo Desktop',
            desktopTitle: 'Trabalhe diretamente no Word, Excel, PowerPoint',
            desktopDesc: 'Nosso aplicativo se integra perfeitamente às suas ferramentas. Posicione o cursor, pressione <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd>, e dite diretamente.',
            offlineTitle: '100% Offline',
            offlineDesc: 'Sem conexão necessária',
            secureTitle: 'Dados locais',
            secureDesc: 'Nada sai do seu PC',
            fastTitle: 'Ultra rápido',
            fastDesc: 'Processamento instantâneo',
            downloadBtnText: 'Baixar para Windows',
            systemReq: 'Windows 10+ • 200 MB • Assinatura necessária',
            typingText: 'O paciente apresenta dor torácica...',
            comparisonTitle: 'Web ou Desktop?',
            comparisonSubtitle: 'Escolha a solução adequada às suas necessidades',
            compFeature: 'Funcionalidade',
            compWeb: 'Plataforma Web',
            compDesktop: 'App Desktop',
            compInternet: 'Conexão Internet',
            compInternetWeb: 'Necessária',
            compInternetDesktop: 'Não necessária',
            compInstall: 'Instalação',
            compInstallWeb: 'Nenhuma',
            compInstallDesktop: 'Apenas Windows',
            compSecurity: 'Segurança dados',
            compSecurityWeb: 'Nuvem segura',
            compSecurityDesktop: 'Local no PC',
            compIntegration: 'Integração Office',
            compIntegrationWeb: 'Copiar/colar',
            compIntegrationDesktop: 'Direta',
            compAccess: 'Acessibilidade',
            compAccessWeb: 'Qualquer navegador',
            compAccessDesktop: 'Apenas desktop',
            browserTitle: 'Navegadores compatíveis (Plataforma Web)',
            chromeStatus: 'Recomendado',
            edgeStatus: 'Recomendado',
            operaStatus: 'Recomendado',
            safariStatus: 'Limitado',
            firefoxStatus: 'Não recomendado',
            footerTagline: 'Transcrição médica inteligente',
            footerPrivacy: 'Privacidade',
            footerTerms: 'Termos',
            footerContact: 'Contato',
            footerRights: 'Todos os direitos reservados.',
            downloadRequiresRegistration: 'Para baixar, você deve se registrar primeiro.',
            downloadConfirm: 'Redirecionar para o registro?'
        }
    };

    // ============================================
    // Language & Country Detection
    // ============================================
    
    async function detectCountry() {
        try {
            // Try multiple geolocation APIs
            const apis = [
                'https://ipapi.co/json/',
                'https://ip-api.com/json/'
            ];
            
            for (const api of apis) {
                try {
                    const response = await fetch(api, { timeout: 3000 });
                    if (response.ok) {
                        const data = await response.json();
                        return data.country_code || data.countryCode || null;
                    }
                } catch (e) {
                    console.log('API failed:', api);
                }
            }
        } catch (error) {
            console.log('Country detection failed:', error);
        }
        return null;
    }

    function detectLanguageFromBrowser() {
        const browserLang = navigator.language || navigator.userLanguage || 'fr';
        const langCode = browserLang.split('-')[0].toLowerCase();
        return ['fr', 'en', 'de', 'es', 'it', 'pt'].includes(langCode) ? langCode : 'fr';
    }

    function detectCurrencyFromCountry(countryCode) {
        if (!countryCode) return 'EUR';
        if (GBP_COUNTRIES.includes(countryCode.toUpperCase())) return 'GBP';
        return 'EUR';
    }
    
    // Detect language based on country code
    function detectLanguageFromCountry(countryCode) {
        if (!countryCode) return null;
        const code = countryCode.toUpperCase();
        
        // English-speaking countries
        if (['GB', 'UK', 'US', 'AU', 'NZ', 'CA', 'IE', 'IM', 'JE', 'GG'].includes(code)) return 'en';
        // German-speaking countries
        if (['DE', 'AT', 'CH', 'LI'].includes(code)) return 'de';
        // Spanish-speaking countries
        if (['ES', 'MX', 'AR', 'CO', 'PE', 'CL', 'EC', 'VE'].includes(code)) return 'es';
        // Italian-speaking countries
        if (['IT', 'SM', 'VA'].includes(code)) return 'it';
        // Portuguese-speaking countries
        if (['PT', 'BR', 'AO', 'MZ'].includes(code)) return 'pt';
        // French-speaking countries
        if (['FR', 'BE', 'CH', 'LU', 'MC', 'CA'].includes(code)) return 'fr';
        
        return null;
    }

    async function initializeLocalization() {
        // Check URL params first
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lang');
        
        // Try to get stored preferences
        let storedLang = null;
        let storedCurrency = null;
        try {
            storedLang = localStorage.getItem('selectedLanguage');
            storedCurrency = localStorage.getItem('selectedCurrency');
        } catch (e) {}
        
        // Detect country for currency
        userCountry = await detectCountry();
        console.log('Detected country:', userCountry);
        
        // Set language: URL > stored (only if matches country) > country-based > browser
        const countryLang = detectLanguageFromCountry(userCountry);
        
        if (urlLang && translations[urlLang]) {
            currentLang = urlLang;
        } else if (storedLang && translations[storedLang]) {
            // Only use stored language if it makes sense for the detected country
            // or if no country was detected
            if (!countryLang || storedLang === countryLang) {
                currentLang = storedLang;
            } else {
                // Country changed - use country-based language
                currentLang = countryLang;
                // Clear the old stored preference
                try { localStorage.removeItem('selectedLanguage'); } catch(e) {}
            }
        } else {
            // Try country-based language first, then browser
            if (countryLang && translations[countryLang]) {
                currentLang = countryLang;
            } else {
                currentLang = detectLanguageFromBrowser();
            }
        }
        
        // Set currency: stored > country-based
        if (storedCurrency && PRICING[storedCurrency]) {
            currentCurrency = storedCurrency;
        } else {
            currentCurrency = detectCurrencyFromCountry(userCountry);
        }
        
        console.log('Language:', currentLang, 'Currency:', currentCurrency, 'Country:', userCountry);
        
        // Save preferences
        try {
            localStorage.setItem('selectedLanguage', currentLang);
            localStorage.setItem('selectedCurrency', currentCurrency);
        } catch (e) {}
        
        // Update URL if needed
        if (!urlLang) {
            const url = new URL(window.location);
            url.searchParams.set('lang', currentLang);
            window.history.replaceState({}, '', url);
        }
    }

    // ============================================
    // UI Update Functions
    // ============================================
    
    function updateText(elementId, text) {
        const el = document.getElementById(elementId);
        if (!el) {
            console.warn(`Element not found: ${elementId}`);
            return;
        }
        if (text === undefined || text === null) {
            console.warn(`Text is undefined/null for: ${elementId}`);
            return;
        }
        
        // Convert to string in case it's a number
        const textStr = String(text);
        
        if (textStr.includes('<')) {
            el.innerHTML = textStr;
        } else {
            el.textContent = textStr;
        }
    }

    function updateContent() {
        console.log('🔄 updateContent() called with lang:', currentLang, 'currency:', currentCurrency);
        
        const t = translations[currentLang] || translations.fr;
        const pricing = PRICING[currentCurrency];
        
        console.log('📝 Using translations for:', currentLang);
        console.log('💰 Using pricing for:', currentCurrency, pricing);
        
        // Update HTML lang
        document.documentElement.lang = currentLang;
        
        // Update language selector
        const langSelect = document.getElementById('language-select');
        if (langSelect) langSelect.value = currentLang;
        
        // Navigation
        updateText('loginText', t.loginText);
        
        // Hero Section
        const heroTitle = document.querySelector('.hero-title');
        if (heroTitle) {
            const lines = heroTitle.querySelectorAll('.title-line');
            if (lines.length >= 3 && t.heroTitle.length >= 3) {
                lines[0].textContent = t.heroTitle[0];
                lines[1].textContent = t.heroTitle[1];
                lines[2].textContent = t.heroTitle[2];
            }
        }
        
        updateText('heroSubtitle', t.heroSubtitle);
        updateText('ctaFreeText', t.ctaFreeText);
        updateText('ctaPricingText', t.ctaPricingText);
        updateText('badgeSecure', t.badgeSecure);
        updateText('badgeMedical', t.badgeMedical);
        updateText('badgeUnlimited', t.badgeUnlimited);
        
        // How it works
        updateText('howItWorksTitle', t.howItWorksTitle);
        updateText('step1Title', t.step1Title);
        updateText('step1Desc', t.step1Desc);
        updateText('step2Title', t.step2Title);
        updateText('step2Desc', t.step2Desc);
        updateText('step3Title', t.step3Title);
        updateText('step3Desc', t.step3Desc);
        
        // Pricing
        updateText('pricingTitle', t.pricingTitle);
        updateText('pricingSubtitle', t.pricingSubtitle);
        
        // Free Trial
        updateText('freeTitle', t.freeTitle);
        updateText('freePeriod', t.freePeriod);
        updateText('freeCurrency', pricing.symbol);
        updateText('freeFeature1', t.freeFeature1);
        updateText('freeFeature2', t.freeFeature2);
        updateText('freeBtnText', t.freeBtnText);
        
        // Monthly
        updateText('monthlyTitle', t.monthlyTitle);
        updateText('monthlyAmount', pricing.monthly);
        updateText('monthlyCurrency', pricing.symbol);
        updateText('monthlyPeriod', t.proPeriodMonthly);
        updateText('monthlyNote', t.proNote);
        updateText('monthlyFeature1', t.freeFeature1);
        updateText('monthlyFeature2', t.freeFeature2);
        updateText('monthlyBtnText', t.monthlyBtnText);
        
        // Yearly
        updateText('popularBadge', t.popularBadge);
        updateText('yearlyTitle', t.yearlyTitle);
        updateText('yearlyAmount', pricing.yearly);
        updateText('yearlyCurrency', pricing.symbol);
        updateText('yearlyPeriod', t.proPeriodYearly);
        updateText('yearlyNote', t.proNote);
        updateText('yearlySavings', t.yearlySavings);
        updateText('yearlyFeature1', t.freeFeature1);
        updateText('yearlyFeature2', t.freeFeature2);
        updateText('yearlyBtnText', t.yearlyBtnText);
        
        // Desktop App
        updateText('desktopLabel', t.desktopLabel);
        updateText('desktopTitle', t.desktopTitle);
        updateText('desktopDesc', t.desktopDesc);
        updateText('offlineTitle', t.offlineTitle);
        updateText('offlineDesc', t.offlineDesc);
        updateText('secureTitle', t.secureTitle);
        updateText('secureDesc', t.secureDesc);
        updateText('fastTitle', t.fastTitle);
        updateText('fastDesc', t.fastDesc);
        updateText('downloadBtnText', t.downloadBtnText);
        updateText('systemReq', t.systemReq);
        updateText('typingText', t.typingText);
        
        // Comparison
        updateText('comparisonTitle', t.comparisonTitle);
        updateText('comparisonSubtitle', t.comparisonSubtitle);
        updateText('compFeature', t.compFeature);
        updateText('compWeb', t.compWeb);
        updateText('compDesktop', t.compDesktop);
        updateText('compInternet', t.compInternet);
        updateText('compInternetWeb', t.compInternetWeb);
        updateText('compInternetDesktop', t.compInternetDesktop);
        updateText('compInstall', t.compInstall);
        updateText('compInstallWeb', t.compInstallWeb);
        updateText('compInstallDesktop', t.compInstallDesktop);
        updateText('compSecurity', t.compSecurity);
        updateText('compSecurityWeb', t.compSecurityWeb);
        updateText('compSecurityDesktop', t.compSecurityDesktop);
        updateText('compIntegration', t.compIntegration);
        updateText('compIntegrationWeb', t.compIntegrationWeb);
        updateText('compIntegrationDesktop', t.compIntegrationDesktop);
        updateText('compAccess', t.compAccess);
        updateText('compAccessWeb', t.compAccessWeb);
        updateText('compAccessDesktop', t.compAccessDesktop);
        
        // Browser Support
        updateText('browserTitle', t.browserTitle);
        updateText('chromeStatus', t.chromeStatus);
        updateText('edgeStatus', t.edgeStatus);
        updateText('operaStatus', t.operaStatus);
        updateText('safariStatus', t.safariStatus);
        updateText('firefoxStatus', t.firefoxStatus);
        
        // Footer
        updateText('footerTagline', t.footerTagline);
        updateText('footerPrivacy', t.footerPrivacy);
        updateText('footerTerms', t.footerTerms);
        updateText('footerContact', t.footerContact);
        updateText('footerRights', t.footerRights);
        
        // Update links
        updateLinks();
    }

    function updateLinks() {
        const currency = currentCurrency.toLowerCase();
        
        // Free trial link
        const freeBtn = document.getElementById('freeBtn');
        if (freeBtn) {
            freeBtn.href = `form.html?plan=free&lang=${currentLang}`;
        }
        
        // Monthly link
        const monthlyBtn = document.getElementById('monthlyBtn');
        if (monthlyBtn) {
            monthlyBtn.href = `form.html?plan=paid&billing=monthly&currency=${currency}&lang=${currentLang}`;
        }
        
        // Yearly link
        const yearlyBtn = document.getElementById('yearlyBtn');
        if (yearlyBtn) {
            yearlyBtn.href = `form.html?plan=paid&billing=yearly&currency=${currency}&lang=${currentLang}`;
        }
        
        // CTA free link
        const ctaFree = document.getElementById('ctaFree');
        if (ctaFree) {
            ctaFree.href = `form.html?plan=free&lang=${currentLang}`;
        }
    }

    // ============================================
    // Event Handlers
    // ============================================
    
    function setupEventListeners() {
        // Language selector
        const langSelect = document.getElementById('language-select');
        if (langSelect) {
            langSelect.addEventListener('change', (e) => {
                currentLang = e.target.value;
                try {
                    localStorage.setItem('selectedLanguage', currentLang);
                } catch (e) {}
                
                // Update URL
                const url = new URL(window.location);
                url.searchParams.set('lang', currentLang);
                window.history.pushState({}, '', url);
                
                updateContent();
            });
        }
        
        // Login button
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                window.location.href = `login.html?lang=${currentLang}`;
            });
        }
        
        // Download button
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleDesktopDownload();
            });
        }
    }

    function handleDesktopDownload() {
        const t = translations[currentLang] || translations.fr;
        
        // Check if user is registered (simplified check)
        const userEmail = sessionStorage.getItem('userEmail');
        
        if (!userEmail) {
            if (confirm(t.downloadRequiresRegistration + '\n\n' + t.downloadConfirm)) {
                window.location.href = `form.html?plan=paid&intent=download&lang=${currentLang}`;
            }
        } else {
            // Trigger download
            window.location.href = `/api/download-desktop?lang=${currentLang}`;
        }
    }

    // ============================================
    // Initialization
    // ============================================
    
    async function init() {
        console.log('🚀 init() starting...');
        await initializeLocalization();
        console.log('✅ Localization complete, calling updateContent()...');
        updateContent();
        console.log('✅ Content updated, setting up event listeners...');
        setupEventListeners();
        console.log('✅ SyncVoice Medical fully initialized');
    }

    init();
});
