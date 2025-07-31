document.addEventListener('DOMContentLoaded', async () => {
    // Debug mode - set to false for production
    const DEBUG = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const log = (...args) => DEBUG && console.log(...args);

    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const plan = urlParams.get('plan') || 'free';
    const downloadIntent = urlParams.get('intent') === 'download';
    
    // Use shared language detection module
    let lang;
    if (typeof LanguageDetection !== 'undefined' && LanguageDetection.detectLanguage) {
        lang = await LanguageDetection.detectLanguage();
        log('Form: Using shared language detection:', lang);
    } else {
        // Fallback if languageDetection.js is not loaded
        const urlLang = urlParams.get('lang');
        const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
        let storedLang = null;
        try {
            storedLang = localStorage.getItem('selectedLanguage');
        } catch (e) {
            log('localStorage access error');
        }
        
        // Extract the base language code
        const langCode = browserLang.split('-')[0];
        
        // Priority: URL > stored > browser > French default
        lang = urlLang || storedLang || langCode || 'fr';
        lang = ['fr', 'en', 'de', 'es', 'it', 'pt'].includes(lang) ? lang : 'fr';
        
        // Save preference
        try {
            localStorage.setItem('selectedLanguage', lang);
        } catch (e) {
            log('localStorage write error');
        }
    }
    
    log('Form page - using language:', lang);
    log('Download intent:', downloadIntent);

    // Get DOM elements
    const form = document.getElementById('registrationForm');
    const submitButton = document.getElementById('submitButton');
    const formTitle = document.getElementById('formTitle');
    const pageTitle = document.getElementById('pageTitle');
    const returnBtn = document.getElementById('returnBtn');
    const termsAcceptCheckbox = document.getElementById('termsAccept');
    const proceedMessage = document.getElementById('proceedMessage');
    const htmlElement = document.getElementById('htmlLang');
    const paidFields = document.querySelectorAll('.paid-only-fields');

    // Initialize the submit button
    if (submitButton) {
        submitButton.style.display = 'block';
        submitButton.classList.remove('hidden');
        submitButton.disabled = false;
    }

    // Initialize Stripe with environment variable
    let stripe;
    let elements;
    let cardElement;
    let stripePublishableKey;

    // Fetch Stripe publishable key from server
    if (window.Stripe && plan === 'paid') {
        try {
            const apiBaseUrl = getApiBaseUrl();
            const configResponse = await fetch(`${apiBaseUrl}/api/config`);
            if (configResponse.ok) {
                const config = await configResponse.json();
                stripePublishableKey = config.stripePublishableKey;
            } else {
                // Fallback to test key if server doesn't provide one
                stripePublishableKey = 'pk_test_51QgwsQP3dr2cRIwx5Nll9FKqZotSsNwhKChXjloSZmyy49Z9TfWdnaCvdBhhveHfkJQioLT0gtjc2kax5J6KdX3y006odnigC0';
                log('Using fallback Stripe key');
            }

            stripe = Stripe(stripePublishableKey);
            log('Stripe initialized successfully');
            
            elements = stripe.elements();
            
            const paymentElement = document.getElementById('payment-element');
            if (paymentElement) {
                const container = document.getElementById('payment-element-container');
                if (container) {
                    container.style.display = 'block';
                    container.classList.remove('hidden');
                }
                
                cardElement = elements.create('card', {
                    style: {
                        base: {
                            color: '#333333',
                            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                            fontSmoothing: 'antialiased',
                            fontSize: '16px',
                            '::placeholder': {
                                color: '#aab7c4'
                            },
                            iconColor: '#69B578'
                        },
                        invalid: {
                            color: '#dc3545',
                            iconColor: '#dc3545'
                        }
                    }
                });
                
                cardElement.mount('#payment-element');
                
                cardElement.addEventListener('change', function(event) {
                    const displayError = document.getElementById('card-errors');
                    if (displayError) {
                        if (event.error) {
                            displayError.textContent = event.error.message;
                        } else {
                            displayError.textContent = '';
                        }
                    }
                });
                
                log('Stripe card element mounted');
            } else {
                console.error('Payment element container not found');
            }
        } catch (error) {
            console.error('Error initializing Stripe:', error);
            const t = translations[lang] || translations.fr;
            alert(t.paymentInitError || 'Error initializing payment system. Please try again later.');
        }
    }
    
    // Enhanced translations with new error messages
    const translations = {
        fr: {
            pageTitle: 'SyncVoice Medical - Formulaire',
            titles: {
                free: 'Veuillez remplir les champs ci-dessous pour obtenir votre code d\'activation.',
                paid: 'Veuillez remplir les champs ci-dessous pour obtenir votre compte et votre facture.',
                downloadFree: 'Inscrivez-vous pour télécharger l\'application desktop et obtenir votre code d\'activation.',
                downloadPaid: 'Inscrivez-vous pour télécharger l\'application desktop et obtenir votre accès premium.'
            },
            labels: {
                nom: 'Nom:',
                prenom: 'Prénom:',
                email: 'Email:',
                societe: 'Société:',
                adresse: 'Adresse:',
                adresseSuite: 'Adresse (suite):',
                codePostal: 'Code Postal:',
                ville: 'Ville:',
                pays: 'Pays:'
            },
            termsLink: 'Cliquez ici pour les Conditions Générales',
            proceedMessage: "Veuillez cocher cette case si vous souhaitez continuer",
            termsAccept: 'J\'ai lu et accepté les conditions générales.',
            termsConfirmation: 'En cochant la case ci-dessus, vous confirmez que vous avez lu et accepté les conditions générales.',
            autoRenewal: 'J\'opte pour un renouvellement automatique.',
            returnButton: 'Retour',
            submitButtons: {
                free: 'Veuillez envoyer mon code d\'activation pour 7 jours à l\'adresse email ci-dessus.',
                paid: 'Procéder au paiement de 25 € TTC pour un mois (Carte Blue, Visa, Mastercard).',
                paidUK: 'Procéder au paiement de £25 VAT Inc. pour un mois (Visa, Mastercard).',
                downloadFree: 'S\'inscrire et télécharger l\'application desktop (7 jours gratuits)',
                downloadPaid: 'S\'inscrire et télécharger l\'application desktop (25 € TTC/mois)'
            },
            loading: 'Envoi en cours...',
            activationCodeMessage: 'Veuillez vérifier votre email pour le code d\'activation.',
            emailUsedError: 'Cet email a déjà été utilisé pour un essai',
            paymentError: 'Erreur de paiement: ',
            paymentSuccess: 'Paiement réussi! Redirection...',
            processingPayment: 'Traitement du paiement...',
            paymentTitle: 'Paiement Sécurisé',
            paymentSubtitle: 'Vos informations de paiement sont sécurisées',
            subscription: 'Abonnement mensuel',
            total: 'Total',
            downloadNotification: '📥 Après inscription, vous pourrez télécharger l\'application desktop depuis la page de succès.',
            // New error messages
            fillAllFields: 'Veuillez remplir tous les champs obligatoires',
            acceptTerms: 'Veuillez accepter les conditions générales',
            paymentInitError: 'Erreur lors de l\'initialisation du système de paiement. Veuillez réessayer plus tard.',
            passwordTooWeak: 'Le mot de passe doit contenir au moins 8 caractères, incluant majuscules, minuscules et chiffres',
            serverError: 'Erreur serveur. Veuillez réessayer plus tard.'
        },
        en: {
            pageTitle: 'SyncVoice Medical - Form',
            titles: {
                free: 'Please fill in the fields below to get your activation code.',
                paid: 'Please fill in the fields below to get your account and invoice.',
                downloadFree: 'Register to download the desktop application and get your activation code.',
                downloadPaid: 'Register to download the desktop application and get your premium access.'
            },
            labels: {
                nom: 'Last Name:',
                prenom: 'First Name:',
                email: 'Email:',
                societe: 'Company:',
                adresse: 'Address:',
                adresseSuite: 'Address (continued):',
                codePostal: 'Postal Code:',
                ville: 'City:',
                pays: 'Country:'
            },
            termsLink: 'Click here for Terms and Conditions',
            proceedMessage: "Please check this box if you want to proceed",
            termsAccept: 'I have read and accepted the terms and conditions.',
            termsConfirmation: 'By checking the box above, you confirm that you have read and accepted the terms and conditions.',
            autoRenewal: 'I opt for automatic renewal.',
            returnButton: 'Return',
            submitButtons: {
                free: 'Please send my 7-day activation code to the email address above.',
                paid: 'Proceed to payment of €25 VAT Inc. for one month (Visa, Mastercard).',
                paidUK: 'Proceed to payment of £25 VAT Inc. for one month (Visa, Mastercard).',
                downloadFree: 'Register and download desktop app (7 days free)',
                downloadPaid: 'Register and download desktop app (€25 VAT Inc./month)'
            },
            loading: 'Sending...',
            activationCodeMessage: 'Please check your email for the activation code.',
            emailUsedError: 'This email has already been used for a trial',
            paymentError: 'Payment error: ',
            paymentSuccess: 'Payment successful! Redirecting...',
            processingPayment: 'Processing payment...',
            paymentTitle: 'Secure Payment',
            paymentSubtitle: 'Your payment information is secure',
            subscription: 'Monthly subscription',
            total: 'Total',
            downloadNotification: '📥 After registration, you will be able to download the desktop application from the success page.',
            // New error messages
            fillAllFields: 'Please fill in all required fields',
            acceptTerms: 'Please accept the terms and conditions',
            paymentInitError: 'Error initializing payment system. Please try again later.',
            passwordTooWeak: 'Password must be at least 8 characters long and include uppercase, lowercase letters and numbers',
            serverError: 'Server error. Please try again later.'
        },
        de: {
            pageTitle: 'SyncVoice Medical - Formular',
            titles: {
                free: 'Bitte füllen Sie die untenstehenden Felder aus, um Ihren Aktivierungscode zu erhalten.',
                paid: 'Bitte füllen Sie die untenstehenden Felder aus, um Ihr Konto und Ihre Rechnung zu erhalten.',
                downloadFree: 'Registrieren Sie sich, um die Desktop-Anwendung herunterzuladen und Ihren Aktivierungscode zu erhalten.',
                downloadPaid: 'Registrieren Sie sich, um die Desktop-Anwendung herunterzuladen und Ihren Premium-Zugang zu erhalten.'
            },
            labels: {
                nom: 'Nachname:',
                prenom: 'Vorname:',
                email: 'E-Mail:',
                societe: 'Unternehmen:',
                adresse: 'Adresse:',
                adresseSuite: 'Adresse (Fortsetzung):',
                codePostal: 'Postleitzahl:',
                ville: 'Stadt:',
                pays: 'Land:'
            },
            termsLink: 'Klicken Sie hier für die Allgemeinen Geschäftsbedingungen',
            proceedMessage: "Bitte aktivieren Sie dieses Kontrollkästchen, wenn Sie fortfahren möchten",
            termsAccept: 'Ich habe die Allgemeinen Geschäftsbedingungen gelesen und akzeptiert.',
            termsConfirmation: 'Durch Ankreuzen des obigen Kästchens bestätigen Sie, dass Sie die Allgemeinen Geschäftsbedingungen gelesen und akzeptiert haben.',
            autoRenewal: 'Ich entscheide mich für eine automatische Verlängerung.',
            returnButton: 'Zurück',
            submitButtons: {
                free: 'Bitte senden Sie meinen 7-Tage-Aktivierungscode an die oben angegebene E-Mail-Adresse.',
                paid: 'Weiter zur Zahlung von 25 € inkl. MwSt. für einen Monat (Visa, Mastercard).',
                paidUK: 'Weiter zur Zahlung von £25 inkl. MwSt. für einen Monat (Visa, Mastercard).',
                downloadFree: 'Registrieren und Desktop-App herunterladen (7 Tage kostenlos)',
                downloadPaid: 'Registrieren und Desktop-App herunterladen (25 € inkl. MwSt./Monat)'
            },
            loading: 'Senden...',
            activationCodeMessage: 'Bitte überprüfen Sie Ihre E-Mail für den Aktivierungscode.',
            emailUsedError: 'Diese E-Mail wurde bereits für eine Testversion verwendet',
            paymentError: 'Zahlungsfehler: ',
            paymentSuccess: 'Zahlung erfolgreich! Weiterleitung...',
            processingPayment: 'Zahlung wird verarbeitet...',
            paymentTitle: 'Sichere Zahlung',
            paymentSubtitle: 'Ihre Zahlungsinformationen sind sicher',
            subscription: 'Monatliches Abonnement',
            total: 'Gesamt',
            downloadNotification: '📥 Nach der Registrierung können Sie die Desktop-Anwendung von der Erfolgsseite herunterladen.',
            // New error messages
            fillAllFields: 'Bitte füllen Sie alle Pflichtfelder aus',
            acceptTerms: 'Bitte akzeptieren Sie die Allgemeinen Geschäftsbedingungen',
            paymentInitError: 'Fehler beim Initialisieren des Zahlungssystems. Bitte versuchen Sie es später erneut.',
            passwordTooWeak: 'Das Passwort muss mindestens 8 Zeichen lang sein und Groß-, Kleinbuchstaben und Zahlen enthalten',
            serverError: 'Serverfehler. Bitte versuchen Sie es später erneut.'
        },
        es: {
            pageTitle: 'SyncVoice Medical - Formulario',
            titles: {
                free: 'Por favor, complete los campos siguientes para obtener su código de activación.',
                paid: 'Por favor, complete los campos siguientes para obtener su cuenta y factura.',
                downloadFree: 'Regístrese para descargar la aplicación de escritorio y obtener su código de activación.',
                downloadPaid: 'Regístrese para descargar la aplicación de escritorio y obtener su acceso premium.'
            },
            labels: {
                nom: 'Apellido:',
                prenom: 'Nombre:',
                email: 'Correo electrónico:',
                societe: 'Empresa:',
                adresse: 'Dirección:',
                adresseSuite: 'Dirección (continuación):',
                codePostal: 'Código Postal:',
                ville: 'Ciudad:',
                pays: 'País:'
            },
            termsLink: 'Haga clic aquí para ver los Términos y Condiciones',
            proceedMessage: "Por favor, marque esta casilla si desea continuar",
            termsAccept: 'He leído y acepto los términos y condiciones.',
            termsConfirmation: 'Al marcar la casilla anterior, confirma que ha leído y aceptado los términos y condiciones.',
            autoRenewal: 'Opto por la renovación automática.',
            returnButton: 'Volver',
            submitButtons: {
                free: 'Por favor, envíe mi código de activación de 7 días a la dirección de correo electrónico anterior.',
                paid: 'Proceder al pago de 25 € IVA inc. por un mes (Visa, Mastercard).',
                paidUK: 'Proceder al pago de £25 IVA inc. por un mes (Visa, Mastercard).',
                downloadFree: 'Registrarse y descargar aplicación de escritorio (7 días gratis)',
                downloadPaid: 'Registrarse y descargar aplicación de escritorio (25 € IVA inc./mes)'
            },
            loading: 'Enviando...',
            activationCodeMessage: 'Por favor, revise su correo electrónico para el código de activación.',
            emailUsedError: 'Este correo electrónico ya ha sido utilizado para una prueba',
            paymentError: 'Error de pago: ',
            paymentSuccess: '¡Pago exitoso! Redirigiendo...',
            processingPayment: 'Procesando pago...',
            paymentTitle: 'Pago Seguro',
            paymentSubtitle: 'Su información de pago está segura',
            subscription: 'Suscripción mensual',
            total: 'Total',
            downloadNotification: '📥 Después del registro, podrá descargar la aplicación de escritorio desde la página de éxito.',
            // New error messages
            fillAllFields: 'Por favor, complete todos los campos requeridos',
            acceptTerms: 'Por favor, acepte los términos y condiciones',
            paymentInitError: 'Error al inicializar el sistema de pago. Por favor, inténtelo de nuevo más tarde.',
            passwordTooWeak: 'La contraseña debe tener al menos 8 caracteres e incluir mayúsculas, minúsculas y números',
            serverError: 'Error del servidor. Por favor, inténtelo de nuevo más tarde.'
        },
        it: {
            pageTitle: 'SyncVoice Medical - Modulo',
            titles: {
                free: 'Compila i campi sottostanti per ottenere il tuo codice di attivazione.',
                paid: 'Compila i campi sottostanti per ottenere il tuo account e la fattura.',
                downloadFree: 'Registrati per scaricare l\'applicazione desktop e ottenere il tuo codice di attivazione.',
                downloadPaid: 'Registrati per scaricare l\'applicazione desktop e ottenere il tuo accesso premium.'
            },
            labels: {
                nom: 'Cognome:',
                prenom: 'Nome:',
                email: 'Email:',
                societe: 'Azienda:',
                adresse: 'Indirizzo:',
                adresseSuite: 'Indirizzo (continuazione):',
                codePostal: 'Codice Postale:',
                ville: 'Città:',
                pays: 'Paese:'
            },
            termsLink: 'Clicca qui per i Termini e Condizioni',
            proceedMessage: "Seleziona questa casella se vuoi procedere",
            termsAccept: 'Ho letto e accettato i termini e le condizioni.',
            termsConfirmation: 'Selezionando la casella sopra, confermi di aver letto e accettato i termini e le condizioni.',
            autoRenewal: 'Scelgo il rinnovo automatico.',
            returnButton: 'Indietro',
            submitButtons: {
                free: 'Invia il mio codice di attivazione di 7 giorni all\'indirizzo email sopra indicato.',
                paid: 'Procedi al pagamento di 25 € IVA inc. per un mese (Visa, Mastercard).',
                paidUK: 'Procedi al pagamento di £25 IVA inc. per un mese (Visa, Mastercard).',
                downloadFree: 'Registrati e scarica l\'app desktop (7 giorni gratis)',
                downloadPaid: 'Registrati e scarica l\'app desktop (25 € IVA inc./mese)'
            },
            loading: 'Invio in corso...',
            activationCodeMessage: 'Controlla la tua email per il codice di attivazione.',
            emailUsedError: 'Questa email è già stata utilizzata per una prova',
            paymentError: 'Errore di pagamento: ',
            paymentSuccess: 'Pagamento riuscito! Reindirizzamento...',
            processingPayment: 'Elaborazione del pagamento...',
            paymentTitle: 'Pagamento Sicuro',
            paymentSubtitle: 'Le tue informazioni di pagamento sono sicure',
            subscription: 'Abbonamento mensile',
            total: 'Totale',
            downloadNotification: '📥 Dopo la registrazione, potrai scaricare l\'applicazione desktop dalla pagina di successo.',
            // New error messages
            fillAllFields: 'Si prega di compilare tutti i campi obbligatori',
            acceptTerms: 'Si prega di accettare i termini e le condizioni',
            paymentInitError: 'Errore durante l\'inizializzazione del sistema di pagamento. Si prega di riprovare più tardi.',
            passwordTooWeak: 'La password deve essere lunga almeno 8 caratteri e includere maiuscole, minuscole e numeri',
            serverError: 'Errore del server. Si prega di riprovare più tardi.'
        },
        pt: {
            pageTitle: 'SyncVoice Medical - Formulário',
            titles: {
                free: 'Por favor, preencha os campos abaixo para obter seu código de ativação.',
                paid: 'Por favor, preencha os campos abaixo para obter sua conta e fatura.',
                downloadFree: 'Registre-se para baixar a aplicação desktop e obter seu código de ativação.',
                downloadPaid: 'Registre-se para baixar a aplicação desktop e obter seu acesso premium.'
            },
            labels: {
                nom: 'Sobrenome:',
                prenom: 'Nome:',
                email: 'Email:',
                societe: 'Empresa:',
                adresse: 'Endereço:',
                adresseSuite: 'Endereço (continuação):',
                codePostal: 'Código Postal:',
                ville: 'Cidade:',
                pays: 'País:'
            },
            termsLink: 'Clique aqui para os Termos e Condições',
            proceedMessage: "Por favor, marque esta caixa se deseja prosseguir",
            termsAccept: 'Li e aceitei os termos e condições.',
            termsConfirmation: 'Ao marcar a caixa acima, você confirma que leu e aceitou os termos e condições.',
            autoRenewal: 'Opto pela renovação automática.',
            returnButton: 'Voltar',
            submitButtons: {
                free: 'Por favor, envie meu código de ativação de 7 dias para o endereço de email acima.',
                paid: 'Prosseguir para o pagamento de 25 € IVA inc. por um mês (Visa, Mastercard).',
                paidUK: 'Prosseguir para o pagamento de £25 IVA inc. por um mês (Visa, Mastercard).',
                downloadFree: 'Registrar e baixar app desktop (7 dias grátis)',
                downloadPaid: 'Registrar e baixar app desktop (25 € IVA inc./mês)'
            },
            loading: 'Enviando...',
            activationCodeMessage: 'Por favor, verifique seu email para o código de ativação.',
            emailUsedError: 'Este email já foi usado para um teste',
            paymentError: 'Erro de pagamento: ',
            paymentSuccess: 'Pagamento bem-sucedido! Redirecionando...',
            processingPayment: 'Processando pagamento...',
            paymentTitle: 'Pagamento Seguro',
            paymentSubtitle: 'Suas informações de pagamento estão seguras',
            subscription: 'Assinatura mensal',
            total: 'Total',
            downloadNotification: '📥 Após o registro, você poderá baixar a aplicação desktop da página de sucesso.',
            // New error messages
            fillAllFields: 'Por favor, preencha todos os campos obrigatórios',
            acceptTerms: 'Por favor, aceite os termos e condições',
            paymentInitError: 'Erro ao inicializar o sistema de pagamento. Por favor, tente novamente mais tarde.',
            passwordTooWeak: 'A senha deve ter pelo menos 8 caracteres e incluir letras maiúsculas, minúsculas e números',
            serverError: 'Erro do servidor. Por favor, tente novamente mais tarde.'
        }
    };

    // Password translations
    const passwordTranslations = {
        fr: {
            passwordLabel: 'Mot de passe :',
            confirmPasswordLabel: 'Confirmer le mot de passe :',
            passwordHelp: 'Au moins 8 caractères, avec majuscules, minuscules et chiffres'
        },
        en: {
            passwordLabel: 'Password:',
            confirmPasswordLabel: 'Confirm Password:',
            passwordHelp: 'At least 8 characters, with uppercase, lowercase and numbers'
        },
        de: {
            passwordLabel: 'Passwort:',
            confirmPasswordLabel: 'Passwort bestätigen:',
            passwordHelp: 'Mindestens 8 Zeichen, mit Groß-, Kleinbuchstaben und Zahlen'
        },
        es: {
            passwordLabel: 'Contraseña:',
            confirmPasswordLabel: 'Confirmar Contraseña:',
            passwordHelp: 'Al menos 8 caracteres, con mayúsculas, minúsculas y números'
        },
        it: {
            passwordLabel: 'Password:',
            confirmPasswordLabel: 'Conferma Password:',
            passwordHelp: 'Almeno 8 caratteri, con maiuscole, minuscole e numeri'
        },
        pt: {
            passwordLabel: 'Senha:',
            confirmPasswordLabel: 'Confirmar Senha:',
            passwordHelp: 'Pelo menos 8 caracteres, com maiúsculas, minúsculas e números'
        }
    };

    // Enhanced password validation function
    function validatePassword(password) {
        if (!password || password.length < 8) {
            return false;
        }
        
        // Check for at least one uppercase, one lowercase, and one number
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        
        return hasUpperCase && hasLowerCase && hasNumber;
    }

    // Function to determine API base URL based on environment
    function getApiBaseUrl() {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        log('Current location:', { protocol, hostname, port });
        
        // For local development
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // Check if a specific port is configured
            const devPort = port || '8080';
            return `${protocol}//${hostname}:${devPort}`;
        }
        
        // For file:// protocol (local testing)
        if (protocol === 'file:') {
            return 'http://localhost:8080';
        }
        
        // For production - use the same origin
        return `${protocol}//${hostname}${port ? ':' + port : ''}`;
    }

    // Function to check if country is UK
    function isUKCountry(country) {
        if (!country) return false;
        const ukVariants = ['uk', 'united kingdom', 'great britain', 'england', 'scotland', 'wales', 'royaume-uni', 'grande bretagne', 'angleterre'];
        return ukVariants.includes(country.toLowerCase().trim());
    }

    // Add this function to update payment UI based on language and country
    function updatePaymentUI(language, country) {
        const paymentTitle = document.getElementById('paymentTitle');
        const paymentSubtitle = document.getElementById('paymentSubtitle');
        const subscriptionLabel = document.getElementById('subscriptionLabel');
        const totalLabel = document.getElementById('totalLabel');
        const submitButton = document.getElementById('submitButton');
        
        const t = translations[language] || translations.fr;
        const isUK = isUKCountry(country);
        
        // Update payment text
        if (paymentTitle) paymentTitle.textContent = t.paymentTitle;
        if (paymentSubtitle) paymentSubtitle.textContent = t.paymentSubtitle;
        if (subscriptionLabel) subscriptionLabel.textContent = t.subscription;
        if (totalLabel) totalLabel.textContent = t.total;
        
        // Update submit button for paid plan
        if (plan === 'paid' && submitButton && t.submitButtons) {
            if (downloadIntent) {
                submitButton.textContent = t.submitButtons.downloadPaid;
            } else {
                submitButton.textContent = isUK ? t.submitButtons.paidUK : t.submitButtons.paid;
            }
        }
        
        // Update price display
        const priceDisplays = document.querySelectorAll('.payment-detail span:last-child, .payment-total span:last-child');
        priceDisplays.forEach(el => {
            if (el.textContent.includes('25')) {
                el.textContent = isUK ? '£25.00' : '25,00 €';
            }
        });
    }

    // Function to show download intent notification
    function showDownloadNotification(language) {
        if (!downloadIntent) return;
        
        const t = translations[language] || translations.fr;
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'download-notification';
        notification.style.cssText = `
            background: linear-gradient(135deg, #e3f2fd, #bbdefb);
            border: 1px solid #2196F3;
            border-radius: 8px;
            padding: 1rem;
            margin: 1rem 0;
            color: #1565C0;
            font-weight: 500;
            text-align: center;
            box-shadow: 0 2px 8px rgba(33, 150, 243, 0.2);
        `;
        notification.textContent = t.downloadNotification;
        
        // Insert after form title
        if (formTitle && formTitle.parentNode) {
            formTitle.parentNode.insertBefore(notification, formTitle.nextSibling);
        }
    }

    // Function to update content based on language
    function updateContent(language) {
        log('Updating content for language:', language, 'Plan:', plan, 'Download intent:', downloadIntent);
        const t = translations[language] || translations.fr;

        if (htmlElement) {
            htmlElement.setAttribute('lang', language);
        }

        if (pageTitle) pageTitle.textContent = t.pageTitle;
        
        // Update form title based on download intent
        if (formTitle && t.titles) {
            if (downloadIntent) {
                formTitle.textContent = plan === 'paid' ? t.titles.downloadPaid : t.titles.downloadFree;
            } else {
                formTitle.textContent = t.titles[plan] || t.titles.free;
            }
        }

        // Update submit button based on download intent
        if (submitButton && t.submitButtons) {
            if (plan === 'paid') {
                if (downloadIntent) {
                    submitButton.textContent = t.submitButtons.downloadPaid;
                } else {
                    submitButton.textContent = t.submitButtons.paid;
                }
            } else {
                if (downloadIntent) {
                    submitButton.textContent = t.submitButtons.downloadFree;
                } else {
                    submitButton.textContent = t.submitButtons[plan] || t.submitButtons.free;
                }
            }
        }

        Object.entries(t.labels || {}).forEach(([id, text]) => {
            const label = document.getElementById(`${id}Label`);
            if (label) {
                label.textContent = text;
            }
        });

        const passwordT = passwordTranslations[language] || passwordTranslations.fr;
        const passwordLabel = document.getElementById('passwordLabel');
        const confirmPasswordLabel = document.getElementById('confirmPasswordLabel');
        const passwordHelp = document.getElementById('passwordHelp');
        
        if (passwordLabel) passwordLabel.textContent = passwordT.passwordLabel;
        if (confirmPasswordLabel) confirmPasswordLabel.textContent = passwordT.confirmPasswordLabel;
        if (passwordHelp) passwordHelp.textContent = passwordT.passwordHelp;

        const termsLink = document.getElementById('termsLink');
        const termsAcceptLabel = document.getElementById('termsAcceptLabel');
        const termsConfirmation = document.getElementById('termsConfirmation');
        const autoRenewalLabel = document.getElementById('autoRenewalLabel');

        if (termsLink) {
            termsLink.textContent = t.termsLink;
        }

        termsLink.replaceWith(termsLink.cloneNode(true));
        const newTermsLink = document.getElementById('termsLink');
        if (newTermsLink) {
            newTermsLink.addEventListener('click', (e) => {
                e.preventDefault();
                const currentLang = language || 'fr';
                const currentPlan = plan || 'free';
                const termsType = currentPlan === 'paid' ? 'cgv' : 'cge';
                
                const origin = window.location.origin;
                const termsPath = `${origin}/terms/${currentLang}/${termsType}.html`;
                
                log('Terms file URL:', termsPath);
                log('Current language:', currentLang);
                log('Current plan:', currentPlan);
                log('Terms type:', termsType);
                
                window.open(termsPath, '_blank');
            });
        }

        if (termsAcceptLabel) termsAcceptLabel.textContent = t.termsAccept;
        if (termsConfirmation) termsConfirmation.textContent = t.termsConfirmation;
        if (autoRenewalLabel) autoRenewalLabel.textContent = t.autoRenewal;
        if (proceedMessage) proceedMessage.textContent = t.proceedMessage;

        if (returnBtn) {
            returnBtn.textContent = t.returnButton;
            returnBtn.href = `index.html?lang=${language}`;
        }

        // Call the payment UI update function
        updatePaymentUI(language, '');
        
        // Show download notification if applicable
        showDownloadNotification(language);
    }

    function togglePaidFields() {
        if (paidFields) {
            paidFields.forEach(field => {
                field.style.display = plan === 'paid' ? 'block' : 'none';
                if (plan === 'paid') {
                    field.classList.remove('hidden');
                } else {
                    field.classList.add('hidden');
                }
            });
        }
    }
    
    // Function to convert country names to ISO country codes
    function getCountryCode(countryName) {
        if (!countryName) return 'FR';
        
        const country = countryName.toLowerCase().trim();
        
        const countryMap = {
            'france': 'FR',
            'etats-unis': 'US',
            'états-unis': 'US',
            'royaume-uni': 'GB',
            'united kingdom': 'GB',
            'uk': 'GB',
            'great britain': 'GB',
            'grande bretagne': 'GB',
            'england': 'GB',
            'angleterre': 'GB',
            'scotland': 'GB',
            'ecosse': 'GB',
            'wales': 'GB',
            'pays de galles': 'GB',
            'allemagne': 'DE',
            'espagne': 'ES',
            'italie': 'IT',
            'portugal': 'PT',
            'belgique': 'BE',
            'suisse': 'CH',
            'canada': 'CA',
            'pays-bas': 'NL',
            'irlande': 'IE',
            'autriche': 'AT',
            'suède': 'SE',
            'danemark': 'DK',
            'finlande': 'FI',
            'norvège': 'NO',
            'grèce': 'GR',
            'pologne': 'PL',
            'luxembourg': 'LU',
            'united states': 'US',
            'usa': 'US',
            'germany': 'DE',
            'spain': 'ES',
            'italy': 'IT',
            'portugal': 'PT',
            'belgium': 'BE',
            'switzerland': 'CH',
            'canada': 'CA',
            'netherlands': 'NL',
            'ireland': 'IE',
            'austria': 'AT',
            'sweden': 'SE',
            'denmark': 'DK',
            'finland': 'FI',
            'norway': 'NO',
            'greece': 'GR',
            'poland': 'PL',
            'luxembourg': 'LU'
        };
        
        if (/^[A-Za-z]{2}$/.test(country)) {
            return country.toUpperCase();
        }
        
        return countryMap[country] || 'FR';
    }

    // Initialize page
    togglePaidFields();
    updateContent(lang);

    // Add country field change listener for dynamic pricing
    const countryField = document.getElementById('pays');
    if (countryField && plan === 'paid') {
        countryField.addEventListener('input', function() {
            updatePaymentUI(lang, this.value);
        });
    }

    if (termsAcceptCheckbox && proceedMessage) {
        termsAcceptCheckbox.addEventListener('change', function() {
            proceedMessage.style.display = this.checked ? 'block' : 'none';
        });
        proceedMessage.style.display = 'none';
    }

    // Enhanced form submission handler with improved validation
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            log('Form submitted');
            log('Current plan:', plan);
            log('Current language:', lang);
            log('Download intent:', downloadIntent);

            const t = translations[lang] || translations.fr;
            const originalButtonText = submitButton.textContent;

            try {
                submitButton.disabled = true;
                submitButton.textContent = t.loading;

                const formData = new FormData(form);
                
                // Log form data for debugging
                log('Form data collected:', {
                    firstName: formData.get('prenom'),
                    lastName: formData.get('nom'),
                    email: formData.get('email'),
                    version: plan,
                    language: lang,
                    downloadIntent: downloadIntent
                });

                // Validate required fields
                const email = formData.get('email');
                const firstName = formData.get('prenom');
                const lastName = formData.get('nom');
                const password = formData.get('password');
                const confirmPassword = formData.get('confirmPassword');
                
                if (!email || !firstName || !lastName) {
                    alert(t.fillAllFields);
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                    return;
                }

                // Enhanced password validation
                if (!validatePassword(password)) {
                    const passwordErrors = {
                        fr: 'Le mot de passe doit contenir au moins 8 caractères, avec majuscules, minuscules et chiffres',
                        en: 'Password must be at least 8 characters long and include uppercase, lowercase letters and numbers',
                        de: 'Das Passwort muss mindestens 8 Zeichen lang sein und Groß-, Kleinbuchstaben und Zahlen enthalten',
                        es: 'La contraseña debe tener al menos 8 caracteres e incluir mayúsculas, minúsculas y números',
                        it: 'La password deve essere lunga almeno 8 caratteri e includere maiuscole, minuscole e numeri',
                        pt: 'A senha deve ter pelo menos 8 caracteres e incluir letras maiúsculas, minúsculas e números'
                    };
                    alert(t.passwordTooWeak || passwordErrors[lang] || passwordErrors['fr']);
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                    return;
                }

                if (password !== confirmPassword) {
                    const matchErrors = {
                        fr: 'Les mots de passe ne correspondent pas',
                        en: 'Passwords do not match',
                        de: 'Passwörter stimmen nicht überein',
                        es: 'Las contraseñas no coinciden',
                        it: 'Le password non corrispondono',
                        pt: 'As senhas não coincidem'
                    };
                    alert(matchErrors[lang] || matchErrors['fr']);
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                    return;
                }

                // Check if terms are accepted
                if (!termsAcceptCheckbox.checked) {
                    alert(t.acceptTerms);
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                    return;
                }

                // For free plan, first check if email is within trial period
                if (plan === 'free') {
                    const apiBaseUrl = getApiBaseUrl();
                    const checkEmailUrl = `${apiBaseUrl}/api/check-email`;
                    
                    try {
                        const checkResponse = await fetch(checkEmailUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Requested-With': 'XMLHttpRequest'
                            },
                            body: JSON.stringify({ email })
                        });

                        const checkResult = await checkResponse.json();
                        log('Email check result:', checkResult);

                        if (!checkResponse.ok && !checkResult.withinTrial) {
                            const errorMessages = {
                                fr: checkResult.message || 'Cet email a déjà été utilisé pour un essai',
                                en: checkResult.message || 'This email has already been used for a trial',
                                de: checkResult.message || 'Diese E-Mail wurde bereits für eine Testversion verwendet',
                                es: checkResult.message || 'Este correo electrónico ya ha sido utilizado para una prueba',
                                it: checkResult.message || 'Questa email è già stata utilizzata per una prova',
                                pt: checkResult.message || 'Este email já foi usado para um teste'
                            };
                            
                            alert(errorMessages[lang] || errorMessages['fr']);
                            submitButton.disabled = false;
                            submitButton.textContent = originalButtonText;
                            return;
                        }

                        if (checkResult.withinTrial && checkResult.daysRemaining !== undefined) {
                            const confirmMessages = {
                                fr: `Vous avez encore ${checkResult.daysRemaining} jours dans votre période d'essai. Voulez-vous recevoir un nouveau code d'activation ?`,
                                en: `You have ${checkResult.daysRemaining} days remaining in your trial. Would you like to receive a new activation code?`,
                                de: `Sie haben noch ${checkResult.daysRemaining} Tage in Ihrer Testphase. Möchten Sie einen neuen Aktivierungscode erhalten?`,
                                es: `Tiene ${checkResult.daysRemaining} días restantes en su prueba. ¿Desea recibir un nuevo código de activación?`,
                                it: `Hai ancora ${checkResult.daysRemaining} giorni nel tuo periodo di prova. Vuoi ricevere un nuovo codice di attivazione?`,
                                pt: `Você tem ${checkResult.daysRemaining} dias restantes em seu teste. Gostaria de receber um novo código de ativação?`
                            };
                            
                            if (!confirm(confirmMessages[lang] || confirmMessages['fr'])) {
                                submitButton.disabled = false;
                                submitButton.textContent = originalButtonText;
                                return;
                            }
                        }
                    } catch (checkError) {
                        console.error('Error checking email:', checkError);
                    }
                }

                // Prepare base request data
                const requestData = {
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    password: password,
                    version: plan,
                    language: lang,
                    termsAccepted: true,
                    downloadIntent: downloadIntent
                };

                // Add currency and amount based on country
                if (plan === 'paid') {
                    const countryInput = formData.get('pays') || '';
                    const countryCode = getCountryCode(countryInput);
                    
                    let currency = 'EUR';
                    let amount = 2500;
                    
                    if (countryCode === 'GB' || countryCode === 'UK') {
                        currency = 'GBP';
                        amount = 2500;
                    } else {
                        currency = 'EUR';
                        amount = 2500;
                    }
                    
                    requestData.company = formData.get('societe') || '';
                    requestData.address = formData.get('adresse') || '';
                    requestData.addressContinued = formData.get('adresseSuite') || '';
                    requestData.postalCode = formData.get('codePostal') || '';
                    requestData.city = formData.get('ville') || '';
                    requestData.country = formData.get('pays') || '';
                    requestData.autoRenewal = document.getElementById('autoRenewal')?.checked || false;
                    requestData.currency = currency;
                    requestData.amount = amount;
                }

                log('Sending request data:', requestData);

                const apiBaseUrl = getApiBaseUrl();
                const apiUrl = `${apiBaseUrl}/api/send-activation`;

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify(requestData)
                });

                log('Response status:', response.status);
                log('Response headers:', response.headers);

                const contentType = response.headers.get('content-type');
                let result;

                if (contentType && contentType.includes('application/json')) {
                    result = await response.json();
                } else {
                    const text = await response.text();
                    console.error('Non-JSON response received:', text);
                    throw new Error(t.serverError || `Server error: ${response.status}`);
                }

                log('API response:', result);

                if (!response.ok) {
                    throw new Error(result.message || t.serverError || `Server error: ${response.status}`);
                }

                if (result.success) {
                    log('Storing user data:', {
                        email: email,
                        activationCode: result.activationCode,
                        userId: result.userId
                    });
                    
                    // Store only in sessionStorage to avoid duplicate storage
                    if (email) {
                        sessionStorage.setItem('userEmail', email);
                    }
                    
                    if (result.activationCode) {
                        sessionStorage.setItem('activationCode', result.activationCode);
                        log('Activation code stored:', result.activationCode);
                    }
                    
                    if (result.userId) {
                        sessionStorage.setItem('userId', result.userId);
                    }
                    
                    if (result.requiresPayment && plan === 'paid') {
                        if (!stripe) {
                            throw new Error('Stripe is not initialized');
                        }

                        submitButton.textContent = t.processingPayment;
                        
                        const countryInput = formData.get('pays') || '';
                        const countryCode = getCountryCode(countryInput);
                        log('Country input:', countryInput, '→ Country code:', countryCode);
                        
                        try {
                            log('Confirming card payment with client secret:', result.clientSecret);
                            
                            const { error, paymentIntent } = await stripe.confirmCardPayment(
                                result.clientSecret,
                                {
                                    payment_method: {
                                        card: cardElement,
                                        billing_details: {
                                            name: `${firstName} ${lastName}`,
                                            email: email,
                                            address: {
                                                line1: requestData.address,
                                                line2: requestData.addressContinued,
                                                city: requestData.city,
                                                postal_code: requestData.postalCode,
                                                country: countryCode
                                            }
                                        }
                                    }
                                }
                            );

                            if (error) {
                                console.error('Payment error:', error);
                                throw new Error(t.paymentError + error.message);
                            } else {
                                log('Payment successful:', paymentIntent);

                                if (result.userId) {
                                    sessionStorage.setItem('userId', result.userId);
                                }
                                if (result.activationCode) {
                                    sessionStorage.setItem('activationCode', result.activationCode);
                                }
                                if (result.userEmail || email) {
                                    sessionStorage.setItem('userEmail', result.userEmail || email);
                                }

                                alert(t.paymentSuccess);

                                const successUrl = downloadIntent 
                                    ? `success.html?lang=${lang}&paid=true&download=true&email=${encodeURIComponent(email)}`
                                    : `success.html?lang=${lang}&paid=true&email=${encodeURIComponent(email)}`;
                                window.location.href = successUrl;
                            }
                        } catch (paymentError) {
                            console.error('Stripe payment error:', paymentError);
                            throw new Error(t.paymentError + paymentError.message);
                        }
                    } else {
                        log('Free plan activation successful, preparing redirect...');

                        if (result.userId) {
                            sessionStorage.setItem('userId', result.userId);
                        }
                        if (result.activationCode) {
                            sessionStorage.setItem('activationCode', result.activationCode);
                        }
                        if (result.userEmail || email) {
                            sessionStorage.setItem('userEmail', result.userEmail || email);
                        }
                        
                        log('Saved to storage:', {
                            userId: result.userId,
                            activationCode: result.activationCode,
                            userEmail: result.userEmail || email
                        });
                        
                        let successMessage = t.activationCodeMessage;
                        
                        if (result.daysRemaining !== undefined) {
                            const daysMessages = {
                                fr: `\n\nVous avez ${result.daysRemaining} jours restants dans votre période d'essai.`,
                                en: `\n\nYou have ${result.daysRemaining} days remaining in your trial period.`,
                                de: `\n\nSie haben noch ${result.daysRemaining} Tage in Ihrer Testphase.`,
                                es: `\n\nTiene ${result.daysRemaining} días restantes en su período de prueba.`,
                                it: `\n\nHai ${result.daysRemaining} giorni rimanenti nel tuo periodo di prova.`,
                                pt: `\n\nVocê tem ${result.daysRemaining} dias restantes em seu período de teste.`
                            };
                            successMessage += daysMessages[lang] || daysMessages['fr'];
                        }
                        
                        alert(successMessage);
                        
                        log('Redirecting to success page...');
                        const successUrl = downloadIntent 
                            ? `success.html?lang=${lang}&download=true`
                            : `success.html?lang=${lang}`;
                        log('Success URL:', successUrl);
                        
                        try {
                            window.location.replace(successUrl);
                        } catch (redirectError) {
                            console.error('Redirect error:', redirectError);
                            window.location.href = successUrl;
                        }
                        
                        // Fallback UI if redirect fails
                        setTimeout(() => {
                            if (window.location.pathname.includes('form.html')) {
                                console.warn('Redirect failed, trying alternative...');
                                document.body.innerHTML = `
                                    <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
                                        <h1 style="color: #69B578;">✓ ${lang === 'fr' ? 'Succès!' : 'Success!'}</h1>
                                        <p style="font-size: 18px; margin: 20px 0;">
                                            ${t.activationCodeMessage}
                                        </p>
                                        ${downloadIntent ? `
                                        <a href="/api/download-desktop?lang=${lang}" style="display: inline-block; margin: 20px 10px; padding: 15px 30px; background: #296396; color: white; text-decoration: none; border-radius: 5px;">
                                            ${lang === 'fr' ? 'Télécharger l\'application' : 'Download Application'}
                                        </a>
                                        ` : ''}
                                        <a href="index.html?lang=${lang}" style="display: inline-block; margin-top: 30px; padding: 15px 30px; background: #69B578; color: white; text-decoration: none; border-radius: 5px;">
                                            ${lang === 'fr' ? 'Retour à l\'accueil' : 'Back to Home'}
                                        </a>
                                    </div>
                                `;
                            }
                        }, 2000);
                    }
                } else {
                    throw new Error(result.message || t.serverError || 'Unknown error occurred');
                }
            } catch (error) {
                console.error('Form Submission Error:', error);
                
                const errorMessages = {
                    fr: error.message || 'Une erreur est survenue',
                    en: error.message || 'An error occurred',
                    de: error.message || 'Ein Fehler ist aufgetreten',
                    es: error.message || 'Ocurrió un error',
                    it: error.message || 'Si è verificato un errore',
                    pt: error.message || 'Ocorreu um erro'
                };
                
                alert(errorMessages[lang] || errorMessages['fr']);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }
});