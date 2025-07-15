document.addEventListener('DOMContentLoaded', () => {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const plan = urlParams.get('plan') || 'free';
    const urlLang = urlParams.get('lang');

    // Language detection - FIXED to default to French
    const browserLang = (navigator.language || navigator.userLanguage || '').split('-')[0];
    let storedLang = null;
    try {
        storedLang = localStorage.getItem('selectedLanguage');
    } catch (e) {
        console.log('localStorage access error, using fallback');
    }
    let lang = urlLang || storedLang || browserLang || 'fr'; // Changed default from 'en' to 'fr'
    lang = ['fr', 'en', 'de', 'es', 'it', 'pt'].includes(lang) ? lang : 'fr'; // Changed fallback to 'fr'
    try {
        localStorage.setItem('selectedLanguage', lang);
    } catch (e) {
        console.log('localStorage write error, continuing without saving preference');
    }

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

    // Initialize Stripe
    let stripe;
    let elements;
    let cardElement;

    if (window.Stripe) {
        try {
            stripe = Stripe(
                'pk_test_51QgwsQP3dr2cRIwx5Nll9FKqZotSsNwhKChXjloSZmyy49Z9TfWdnaCvdBhhveHfkJQioLT0gtjc2kax5J6KdX3y006odnigC0'
            );
            console.log('Stripe initialized successfully');
            
            // Initialize elements if this is the paid plan
            if (plan === 'paid') {
                elements = stripe.elements();
                
                // Check if payment-element exists
                const paymentElement = document.getElementById('payment-element');
                if (paymentElement) {
                    // Make sure the container is visible
                    const container = document.getElementById('payment-element-container');
                    if (container) {
                        container.style.display = 'block';
                        container.classList.remove('hidden');
                    }
                    
                    // Create and mount the card element with enhanced styling
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
                    
                    // Add event listener for card errors
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
                    
                    console.log('Stripe card element mounted');
                } else {
                    console.error('Payment element container not found');
                }
            }
        } catch (error) {
            console.error('Error initializing Stripe:', error);
            alert('Error initializing payment system. Please try again later.');
        }
    }
    
    // FIXED: Updated translations with proper currency symbols
    const translations = {
        fr: {
            pageTitle: 'SyncVoice Medical - Formulaire',
            titles: {
                free: 'Veuillez remplir les champs ci-dessous pour obtenir votre code d\'activation.',
                paid: 'Veuillez remplir les champs ci-dessous pour obtenir votre compte et votre facture.'
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
                paidUK: 'Procéder au paiement de £25 VAT Inc. pour un mois (Visa, Mastercard).'
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
            total: 'Total'
        },
        en: {
            pageTitle: 'SyncVoice Medical - Form',
            titles: {
                free: 'Please fill in the fields below to get your activation code.',
                paid: 'Please fill in the fields below to get your account and invoice.'
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
                paidUK: 'Proceed to payment of £25 VAT Inc. for one month (Visa, Mastercard).'
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
            total: 'Total'
        },
        de: {
            pageTitle: 'SyncVoice Medical - Formular',
            titles: {
                free: 'Bitte füllen Sie die untenstehenden Felder aus, um Ihren Aktivierungscode zu erhalten.',
                paid: 'Bitte füllen Sie die untenstehenden Felder aus, um Ihr Konto und Ihre Rechnung zu erhalten.'
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
                paidUK: 'Weiter zur Zahlung von £25 inkl. MwSt. für einen Monat (Visa, Mastercard).'
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
            total: 'Gesamt'
        },
        es: {
            pageTitle: 'SyncVoice Medical - Formulario',
            titles: {
                free: 'Por favor, complete los campos siguientes para obtener su código de activación.',
                paid: 'Por favor, complete los campos siguientes para obtener su cuenta y factura.'
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
                paidUK: 'Proceder al pago de £25 IVA inc. por un mes (Visa, Mastercard).'
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
            total: 'Total'
        },
        it: {
            pageTitle: 'SyncVoice Medical - Modulo',
            titles: {
                free: 'Compila i campi sottostanti per ottenere il tuo codice di attivazione.',
                paid: 'Compila i campi sottostanti per ottenere il tuo account e la fattura.'
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
                paidUK: 'Procedi al pagamento di £25 IVA inc. per un mese (Visa, Mastercard).'
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
            total: 'Totale'
        },
        pt: {
            pageTitle: 'SyncVoice Medical - Formulário',
            titles: {
                free: 'Por favor, preencha os campos abaixo para obter seu código de ativação.',
                paid: 'Por favor, preencha os campos abaixo para obter sua conta e fatura.'
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
                paidUK: 'Prosseguir para o pagamento de £25 IVA inc. por um mês (Visa, Mastercard).'
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
            total: 'Total'
        }
    };

    // Function to determine API base URL based on environment
    function getApiBaseUrl() {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    console.log('Current location:', { protocol, hostname, port });
    
    // For local development - FIXED to use port 8080
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const devPort = port || '8080';  // Changed from 3000 to 8080
        return `${protocol}//${hostname}:${devPort}`;
    }
    
    // For file:// protocol (local testing) - FIXED to use port 8080
    if (protocol === 'file:') {
        return 'http://localhost:8080';  // Changed from 3000 to 8080
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
        // Get the payment section elements
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
            submitButton.textContent = isUK ? t.submitButtons.paidUK : t.submitButtons.paid;
        }
        
        // Update price display
        const priceDisplays = document.querySelectorAll('.payment-detail span:last-child, .payment-total span:last-child');
        priceDisplays.forEach(el => {
            if (el.textContent.includes('25')) {
                el.textContent = isUK ? '£25.00' : '25,00 €';
            }
        });
    }

    // Function to update content based on language
    function updateContent(language) {
        console.log('Updating content for language:', language, 'Plan:', plan);
        const t = translations[language] || translations.fr;

        if (htmlElement) {
            htmlElement.setAttribute('lang', language);
        }

        if (pageTitle) pageTitle.textContent = t.pageTitle;
        if (formTitle && t.titles) {
            formTitle.textContent = t.titles[plan] || t.titles.free;
        }

        if (submitButton && t.submitButtons) {
            if (plan === 'paid') {
                // Will be updated based on country selection
                submitButton.textContent = t.submitButtons.paid;
            } else {
                submitButton.textContent = t.submitButtons[plan] || t.submitButtons.free;
            }
        }

        Object.entries(t.labels || {}).forEach(([id, text]) => {
            const label = document.getElementById(`${id}Label`);
            if (label) {
                label.textContent = text;
            }
        });

        const termsLink = document.getElementById('termsLink');
        const termsAcceptLabel = document.getElementById('termsAcceptLabel');
        const termsConfirmation = document.getElementById('termsConfirmation');
        const autoRenewalLabel = document.getElementById('autoRenewalLabel');

        if (termsLink) {
            termsLink.textContent = t.termsLink;
        }

        termsLink.replaceWith(termsLink.cloneNode(true));
        // Get the new element reference again
        const newTermsLink = document.getElementById('termsLink');
        if (newTermsLink) {
            newTermsLink.addEventListener('click', (e) => {
                e.preventDefault();
                const currentLang = language || 'fr';
                const currentPlan = plan || 'free';
                const termsType = currentPlan === 'paid' ? 'cgv' : 'cge';
                
                // Use absolute path with origin
                const origin = window.location.origin;
                const termsPath = `${origin}/terms/${currentLang}/${termsType}.html`;
                
                console.log('Terms file URL:', termsPath);
                console.log('Current language:', currentLang);
                console.log('Current plan:', currentPlan);
                console.log('Terms type:', termsType);
                
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
        if (!countryName) return 'FR'; // Default to France if empty
        
        // Convert to lowercase for case-insensitive matching
        const country = countryName.toLowerCase().trim();
        
        // Map of common country names to their ISO codes
        const countryMap = {
            // French country names
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
            
            // English country names
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
        
        // Check if the country is already a 2-letter code
        if (/^[A-Za-z]{2}$/.test(country)) {
            return country.toUpperCase();
        }
        
        // Return the mapped code or default to FR
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

    // ENHANCED: Form submission handler with better error handling and redirect
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Form submitted');
            console.log('Current plan:', plan);
            console.log('Current language:', lang);

            const t = translations[lang] || translations.fr;
            const originalButtonText = submitButton.textContent;

            try {
                submitButton.disabled = true;
                submitButton.textContent = t.loading;

                const formData = new FormData(form);
                
                // Log form data for debugging
                console.log('Form data collected:', {
                    firstName: formData.get('prenom'),
                    lastName: formData.get('nom'),
                    email: formData.get('email'),
                    version: plan,
                    language: lang
                });

                // Validate required fields
                const email = formData.get('email');
                const firstName = formData.get('prenom');
                const lastName = formData.get('nom');
                
                if (!email || !firstName || !lastName) {
                    alert('Please fill in all required fields');
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                    return;
                }

                // Check if terms are accepted
                if (!termsAcceptCheckbox.checked) {
                    alert('Please accept the terms and conditions');
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
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ email })
                        });

                        const checkResult = await checkResponse.json();
                        console.log('Email check result:', checkResult);

                        if (!checkResponse.ok && !checkResult.withinTrial) {
                            // Show appropriate error message
                            const errorMessages = {
                                fr: checkResult.message || 'Cet email a déjà été utilisé pour un essai',
                                en: checkResult.message || 'This email has already been used for a trial',
                                de: checkResult.message || 'Diese E-Mail wurde bereits für eine Testversion verwendet',
                                es: checkResult.message || 'Este correo electrónico ya ha sido utilizado para una prueba',
                                it: checkResult.message || 'Questa email è già stata utilizzata per una prova',
                                pt: checkResult.message || 'Este email já foi usado para um teste'
                            };
                            
                            alert(errorMessages[lang] || errorMessages['en']);
                            submitButton.disabled = false;
                            submitButton.textContent = originalButtonText;
                            return;
                        }

                        // If within trial, show remaining days
                        if (checkResult.withinTrial && checkResult.daysRemaining !== undefined) {
                            const confirmMessages = {
                                fr: `Vous avez encore ${checkResult.daysRemaining} jours dans votre période d'essai. Voulez-vous recevoir un nouveau code d'activation ?`,
                                en: `You have ${checkResult.daysRemaining} days remaining in your trial. Would you like to receive a new activation code?`,
                                de: `Sie haben noch ${checkResult.daysRemaining} Tage in Ihrer Testphase. Möchten Sie einen neuen Aktivierungscode erhalten?`,
                                es: `Tiene ${checkResult.daysRemaining} días restantes en su prueba. ¿Desea recibir un nuevo código de activación?`,
                                it: `Hai ancora ${checkResult.daysRemaining} giorni nel tuo periodo di prova. Vuoi ricevere un nuovo codice di attivazione?`,
                                pt: `Você tem ${checkResult.daysRemaining} dias restantes em seu teste. Gostaria de receber um novo código de ativação?`
                            };
                            
                            if (!confirm(confirmMessages[lang] || confirmMessages['en'])) {
                                submitButton.disabled = false;
                                submitButton.textContent = originalButtonText;
                                return;
                            }
                        }
                    } catch (checkError) {
                        console.error('Error checking email:', checkError);
                        // Continue with the submission even if check fails
                    }
                }

                // Prepare base request data
                const requestData = {
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    version: plan,
                    language: lang,
                    termsAccepted: true
                };

                // Add currency and amount based on country
                if (plan === 'paid') {
                    const countryInput = formData.get('pays') || '';
                    const countryCode = getCountryCode(countryInput);
                    
                    // Determine currency based on country
                    let currency = 'EUR';
                    let amount = 2500;
                    
                    if (countryCode === 'GB' || countryCode === 'UK') {
                        currency = 'GBP';
                        amount = 2500; // £25.00
                    } else {
                        currency = 'EUR';
                        amount = 2500; // €25.00
                    }
                    
                    requestData.company = formData.get('societe') || '';
                    requestData.address = formData.get('adresse') || '';
                    requestData.addressContinued = formData.get('adresseSuite') || '';
                    requestData.postalCode = formData.get('codePostal') || '';
                    requestData.city = formData.get('ville') || '';
                    requestData.country = formData.get('pays') || '';
                    requestData.autoRenewal = document.getElementById('autoRenewal')?.checked || false;
                    
                    // Include payment information with country-based currency
                    requestData.currency = currency;
                    requestData.amount = amount;
                }

                console.log('Sending request data:', requestData);

                // Determine API endpoint
                const apiBaseUrl = getApiBaseUrl();
                const apiUrl = `${apiBaseUrl}/api/send-activation`;

                // Send activation request
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                });

                console.log('Response status:', response.status);
                console.log('Response headers:', response.headers);

                // Check if response is JSON before parsing
                const contentType = response.headers.get('content-type');
                let result;

                if (contentType && contentType.includes('application/json')) {
                    result = await response.json();
                } else {
                    // If not JSON, get text to see what we received
                    const text = await response.text();
                    console.error('Non-JSON response received:', text);
                    throw new Error(`Server returned non-JSON response. Status: ${response.status}. Content: ${text.substring(0, 200)}...`);
                }

                console.log('API response:', result);

                if (!response.ok) {
                    throw new Error(result.message || `Server error: ${response.status}`);
                }

                if (result.success) {
                    // Handle successful API response
                    if (result.requiresPayment && plan === 'paid') {
                        // For paid plan, handle payment
                        if (!stripe) {
                            throw new Error('Stripe is not initialized');
                        }

                        submitButton.textContent = t.processingPayment;
                        
                        // Get country code from the country input
                        const countryInput = formData.get('pays') || '';
                        const countryCode = getCountryCode(countryInput);
                        console.log('Country input:', countryInput, '→ Country code:', countryCode);
                        
                        // Process the payment with Stripe
                        try {
                            console.log('Confirming card payment with client secret:', result.clientSecret);
                            
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
                                                country: countryCode // Use the converted country code
                                            }
                                        }
                                    }
                                }
                            );

                            if (error) {
                                console.error('Payment error:', error);
                                throw new Error(t.paymentError + error.message);
                            } else {
                                // Payment succeeded
                                console.log('Payment successful:', paymentIntent);
                                alert(t.paymentSuccess);
                                
                                // Preserve the 'paid' parameter in the success URL
                                window.location.href = `success.html?lang=${lang}&paid=true`;
                            }
                        } catch (paymentError) {
                            console.error('Stripe payment error:', paymentError);
                            throw new Error(t.paymentError + paymentError.message);
                        }
                    } else {
                        // ENHANCED: For free plan, show success message and redirect properly
                        console.log('Free plan activation successful, preparing redirect...');
                        
                        let successMessage = t.activationCodeMessage;
                        
                        // Add remaining days info if available
                        if (result.daysRemaining !== undefined) {
                            const daysMessages = {
                                fr: `\n\nVous avez ${result.daysRemaining} jours restants dans votre période d'essai.`,
                                en: `\n\nYou have ${result.daysRemaining} days remaining in your trial period.`,
                                de: `\n\nSie haben noch ${result.daysRemaining} Tage in Ihrer Testphase.`,
                                es: `\n\nTiene ${result.daysRemaining} días restantes en su período de prueba.`,
                                it: `\n\nHai ${result.daysRemaining} giorni rimanenti nel tuo periodo di prova.`,
                                pt: `\n\nVocê tem ${result.daysRemaining} dias restantes em seu período de teste.`
                            };
                            successMessage += daysMessages[lang] || daysMessages['en'];
                        }
                        
                        alert(successMessage);
                        
                        // ENHANCED: Ensure redirect happens with better error handling
                        console.log('Redirecting to success page...');
                        const successUrl = `success.html?lang=${lang}`;
                        console.log('Success URL:', successUrl);
                        
                        // Check if success.html exists by trying to navigate
                        try {
                            // Force immediate redirect
                            window.location.replace(successUrl);
                        } catch (redirectError) {
                            console.error('Redirect error:', redirectError);
                            // Fallback: try alternative redirect method
                            window.location.href = successUrl;
                        }
                        
                        // Additional fallback if redirect still doesn't work
                        setTimeout(() => {
                            if (window.location.pathname.includes('form.html')) {
                                console.warn('Redirect failed, trying alternative...');
                                // Create a success message in the current page
                                document.body.innerHTML = `
                                    <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
                                        <h1 style="color: #69B578;">✓ ${lang === 'fr' ? 'Succès!' : 'Success!'}</h1>
                                        <p style="font-size: 18px; margin: 20px 0;">
                                            ${t.activationCodeMessage}
                                        </p>
                                        <a href="index.html?lang=${lang}" style="display: inline-block; margin-top: 30px; padding: 15px 30px; background: #69B578; color: white; text-decoration: none; border-radius: 5px;">
                                            ${lang === 'fr' ? 'Retour à l\'accueil' : 'Back to Home'}
                                        </a>
                                    </div>
                                `;
                            }
                        }, 2000);
                    }
                } else {
                    throw new Error(result.message || 'Unknown error occurred');
                }
            } catch (error) {
                console.error('Form Submission Error:', error);
                
                // Show user-friendly error messages
                const errorMessages = {
                    fr: error.message || 'Une erreur est survenue',
                    en: error.message || 'An error occurred',
                    de: error.message || 'Ein Fehler ist aufgetreten',
                    es: error.message || 'Ocurrió un error',
                    it: error.message || 'Si è verificato un errore',
                    pt: error.message || 'Ocorreu um erro'
                };
                
                alert(errorMessages[lang] || errorMessages['en']);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }
});