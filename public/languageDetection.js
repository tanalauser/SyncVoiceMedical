// public/languageDetection.js
// Enhanced Language Detection Module with Country-based Priority

const LanguageDetection = (function() {
    // Country to language mapping
    const countryToLanguage = {
        // French-speaking countries
        'FR': 'fr', // France
        'BE': 'fr', // Belgium (French part)
        'CH': 'fr', // Switzerland (multilingual, defaulting to French)
        'CA': 'fr', // Canada (French part)
        'LU': 'fr', // Luxembourg
        'MC': 'fr', // Monaco
        'BF': 'fr', // Burkina Faso
        'BJ': 'fr', // Benin
        'CD': 'fr', // Democratic Republic of Congo
        'CI': 'fr', // Ivory Coast
        'GA': 'fr', // Gabon
        'GN': 'fr', // Guinea
        'ML': 'fr', // Mali
        'NE': 'fr', // Niger
        'SN': 'fr', // Senegal
        'TG': 'fr', // Togo
        
        // English-speaking countries
        'GB': 'en', // United Kingdom
        'US': 'en', // United States
        'AU': 'en', // Australia
        'NZ': 'en', // New Zealand
        'IE': 'en', // Ireland
        'ZA': 'en', // South Africa
        'NG': 'en', // Nigeria
        'KE': 'en', // Kenya
        'GH': 'en', // Ghana
        'IN': 'en', // India
        'PK': 'en', // Pakistan
        'PH': 'en', // Philippines
        'SG': 'en', // Singapore
        
        // German-speaking countries
        'DE': 'de', // Germany
        'AT': 'de', // Austria
        'LI': 'de', // Liechtenstein
        
        // Spanish-speaking countries
        'ES': 'es', // Spain
        'MX': 'es', // Mexico
        'AR': 'es', // Argentina
        'CO': 'es', // Colombia
        'PE': 'es', // Peru
        'VE': 'es', // Venezuela
        'CL': 'es', // Chile
        'EC': 'es', // Ecuador
        'GT': 'es', // Guatemala
        'CU': 'es', // Cuba
        'BO': 'es', // Bolivia
        'DO': 'es', // Dominican Republic
        'HN': 'es', // Honduras
        'PY': 'es', // Paraguay
        'SV': 'es', // El Salvador
        'NI': 'es', // Nicaragua
        'CR': 'es', // Costa Rica
        'PA': 'es', // Panama
        'UY': 'es', // Uruguay
        
        // Italian-speaking countries
        'IT': 'it', // Italy
        'SM': 'it', // San Marino
        'VA': 'it', // Vatican City
        
        // Portuguese-speaking countries
        'PT': 'pt', // Portugal
        'BR': 'pt', // Brazil
        'AO': 'pt', // Angola
        'MZ': 'pt', // Mozambique
        'CV': 'pt', // Cape Verde
        'GW': 'pt', // Guinea-Bissau
        'ST': 'pt', // São Tomé and Príncipe
        'TL': 'pt'  // East Timor
    };

    // Supported languages
    const supportedLanguages = ['fr', 'en', 'de', 'es', 'it', 'pt'];

    // Cache for geolocation data
    let geoDataCache = null;
    let geoDataPromise = null;

    // Function to get geolocation data with caching
    async function getGeolocationData() {
        // Return cached data if available
        if (geoDataCache) {
            return geoDataCache;
        }

        // Return existing promise if request is in progress
        if (geoDataPromise) {
            return geoDataPromise;
        }

        // Create new request
        geoDataPromise = fetch('https://ipapi.co/json/')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Geolocation request failed');
                }
                return response.json();
            })
            .then(data => {
                geoDataCache = data;
                geoDataPromise = null;
                return data;
            })
            .catch(error => {
                console.error('Geolocation detection failed:', error);
                geoDataPromise = null;
                return null;
            });

        return geoDataPromise;
    }

    // Function to detect language from country
    async function detectCountryLanguage() {
        try {
            const data = await getGeolocationData();
            
            if (data && data.country_code) {
                const countryCode = data.country_code.toUpperCase();
                const language = countryToLanguage[countryCode];
                
                if (language && supportedLanguages.includes(language)) {
                    console.log(`Detected country: ${countryCode} (${data.country_name}), setting language to: ${language}`);
                    return {
                        language: language,
                        source: 'country',
                        country: countryCode,
                        countryName: data.country_name
                    };
                }
            }
        } catch (error) {
            console.log('Country detection failed:', error);
        }
        
        return null;
    }

    // Function to detect browser language
    function detectBrowserLanguage() {
        const browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
        console.log('Browser language:', browserLang);
        
        // Check full locale first
        const langCode = browserLang.split('-')[0];
        
        if (supportedLanguages.includes(langCode)) {
            return {
                language: langCode,
                source: 'browser',
                browserLang: browserLang
            };
        }
        
        // Map common English variants
        if (browserLang.startsWith('en-')) {
            return {
                language: 'en',
                source: 'browser',
                browserLang: browserLang
            };
        }
        
        return null;
    }

    // Main detection function with priority order
    async function detectLanguage(options = {}) {
        const {
            prioritizeCountry = true,  // Set to true to prioritize country detection
            skipUrl = false,
            skipStorage = false,
            skipCountry = false,
            skipBrowser = false,
            defaultLanguage = 'en'  // Changed default from 'fr' to 'en' for better international support
        } = options;

        let detectionResult = {
            language: defaultLanguage,
            source: 'default',
            details: {}
        };

        // 1. Check URL parameter (highest priority unless disabled)
        if (!skipUrl) {
            const urlParams = new URLSearchParams(window.location.search);
            const urlLang = urlParams.get('lang');
            if (urlLang && supportedLanguages.includes(urlLang)) {
                console.log('Using language from URL:', urlLang);
                detectionResult = {
                    language: urlLang,
                    source: 'url',
                    details: { urlParam: urlLang }
                };
                await saveLanguagePreference(urlLang);
                return detectionResult.language;
            }
        }

        // 2. Check stored preference
        if (!skipStorage) {
            try {
                const storedLang = localStorage.getItem('selectedLanguage');
                if (storedLang && supportedLanguages.includes(storedLang)) {
                    console.log('Using stored language:', storedLang);
                    detectionResult = {
                        language: storedLang,
                        source: 'storage',
                        details: { storedLang: storedLang }
                    };
                    return detectionResult.language;
                }
            } catch (e) {
                console.log('localStorage not available');
            }
        }

        // 3. Try country detection (if prioritized)
        if (!skipCountry && prioritizeCountry) {
            const countryResult = await detectCountryLanguage();
            if (countryResult) {
                detectionResult = {
                    language: countryResult.language,
                    source: countryResult.source,
                    details: countryResult
                };
                await saveLanguagePreference(countryResult.language);
                return detectionResult.language;
            }
        }

        // 4. Try browser language detection
        if (!skipBrowser) {
            const browserResult = detectBrowserLanguage();
            if (browserResult) {
                detectionResult = {
                    language: browserResult.language,
                    source: browserResult.source,
                    details: browserResult
                };
                await saveLanguagePreference(browserResult.language);
                return detectionResult.language;
            }
        }

        // 5. If country detection wasn't prioritized, try it as fallback
        if (!skipCountry && !prioritizeCountry) {
            const countryResult = await detectCountryLanguage();
            if (countryResult) {
                detectionResult = {
                    language: countryResult.language,
                    source: countryResult.source,
                    details: countryResult
                };
                await saveLanguagePreference(countryResult.language);
                return detectionResult.language;
            }
        }

        // 6. Use default language
        console.log('Using default language:', defaultLanguage);
        await saveLanguagePreference(defaultLanguage);
        return detectionResult.language;
    }

    // Function to save language preference
    async function saveLanguagePreference(lang) {
        try {
            localStorage.setItem('selectedLanguage', lang);
            // Update document language attribute
            document.documentElement.lang = lang;
        } catch (e) {
            console.log('Could not save language preference');
        }
    }

    // Function to switch language
    function switchLanguage(newLang) {
        if (!supportedLanguages.includes(newLang)) {
            console.error('Unsupported language:', newLang);
            return false;
        }

        // Save preference
        saveLanguagePreference(newLang);

        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('lang', newLang);
        window.history.replaceState({}, '', url);

        // Return true to indicate success
        return true;
    }

    // Function to get current language
    function getCurrentLanguage() {
        // Check URL first
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lang');
        if (urlLang && supportedLanguages.includes(urlLang)) {
            return urlLang;
        }

        // Check stored preference
        try {
            const storedLang = localStorage.getItem('selectedLanguage');
            if (storedLang && supportedLanguages.includes(storedLang)) {
                return storedLang;
            }
        } catch (e) {
            console.log('localStorage not available');
        }

        // Return document language or default
        return document.documentElement.lang || 'en';
    }

    // Function to get language parameter for URLs
    function getLanguageParam() {
        return `lang=${getCurrentLanguage()}`;
    }

    // Public API
    return {
        detectLanguage,
        switchLanguage,
        getCurrentLanguage,
        getLanguageParam,
        saveLanguagePreference,
        supportedLanguages,
        countryToLanguage
    };
})();

// Auto-initialize on page load if this is index.html
if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
    document.addEventListener('DOMContentLoaded', async () => {
        // Detect language with country priority
        const detectedLang = await LanguageDetection.detectLanguage({ 
            prioritizeCountry: true,
            defaultLanguage: 'en'  // Or 'fr' if you prefer French as default
        });
        
        console.log('Auto-detected language on page load:', detectedLang);
    });
}