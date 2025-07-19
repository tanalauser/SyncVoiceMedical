// languageDetection.js - Simplified version that ALWAYS defaults to French
const LanguageDetection = (function() {
    // Supported languages
    const supportedLanguages = ['fr', 'en', 'de', 'es', 'it', 'pt'];
    
    // Country to language mapping
    const countryToLanguage = {
        'FR': 'fr', 'BE': 'fr', 'CH': 'fr', 'CA': 'fr', 'LU': 'fr', 'MC': 'fr',
        'GB': 'en', 'US': 'en', 'AU': 'en', 'NZ': 'en', 'IE': 'en',
        'DE': 'de', 'AT': 'de',
        'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es',
        'IT': 'it',
        'PT': 'pt', 'BR': 'pt'
    };

    // Get current language from URL parameters
    function getUrlLanguage() {
        const urlParams = new URLSearchParams(window.location.search);
        const lang = urlParams.get('lang');
        console.log('URL language parameter:', lang);
        return lang;
    }

    // Get stored language preference
    function getStoredLanguage() {
        try {
            const stored = localStorage.getItem('selectedLanguage');
            console.log('Stored language preference:', stored);
            // IMPORTANT: Clear English preference if found
            if (stored === 'en' && !getUrlLanguage()) {
                console.log('Clearing English preference to allow French default');
                localStorage.removeItem('selectedLanguage');
                return null;
            }
            return stored;
        } catch (e) {
            console.log('localStorage not available');
            return null;
        }
    }

    // Store language preference
    function storeLanguage(lang) {
        try {
            localStorage.setItem('selectedLanguage', lang);
            console.log('Stored language preference:', lang);
        } catch (e) {
            console.log('Could not save language preference');
        }
    }

    // Simple browser language detection
    function detectBrowserLanguage() {
        const browserLang = (navigator.language || navigator.userLanguage || 'fr').toLowerCase();
        console.log('Browser language:', browserLang);
        
        // Extract base language code
        const langCode = browserLang.split('-')[0];
        
        // Only use browser language if it's explicitly set and supported
        if (supportedLanguages.includes(langCode)) {
            // BUT still prefer French unless explicitly something else
            if (langCode === 'en') {
                console.log('Browser is English, but defaulting to French unless explicitly set');
                return 'fr';
            }
            return langCode;
        }
        
        return 'fr'; // Always default to French
    }

    // Main function to detect language - SIMPLIFIED
    async function detectLanguage() {
        console.log('=== Language Detection Starting ===');
        
        // 1. Check URL parameter (highest priority)
        const urlLang = getUrlLanguage();
        if (urlLang && supportedLanguages.includes(urlLang)) {
            console.log('Using language from URL:', urlLang);
            storeLanguage(urlLang);
            return urlLang;
        }
        
        // 2. Check stored preference (but not if it's English without URL param)
        const storedLang = getStoredLanguage();
        if (storedLang && supportedLanguages.includes(storedLang)) {
            console.log('Using stored language:', storedLang);
            return storedLang;
        }
        
        // 3. Try IP geolocation (but don't wait too long)
        try {
            const geoPromise = fetch('https://ipapi.co/json/');
            const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 2000)); // 2 second timeout
            
            const response = await Promise.race([geoPromise, timeoutPromise]);
            
            if (response && response.ok) {
                const data = await response.json();
                console.log('Geolocation data:', data);
                
                if (data.country_code) {
                    const countryLang = countryToLanguage[data.country_code];
                    if (countryLang) {
                        console.log('Country detected:', data.country_code, '→ Language:', countryLang);
                        storeLanguage(countryLang);
                        return countryLang;
                    }
                }
            }
        } catch (error) {
            console.log('Geolocation failed or timed out:', error);
        }
        
        // 4. Check browser language (but prefer French)
        const browserLang = detectBrowserLanguage();
        console.log('Browser/default language:', browserLang);
        
        // 5. ALWAYS default to French
        const finalLang = browserLang || 'fr';
        console.log('Final selected language:', finalLang);
        storeLanguage(finalLang);
        
        return finalLang;
    }

    // Update URL with language parameter
    function updateUrlLanguage(lang) {
        const url = new URL(window.location);
        url.searchParams.set('lang', lang);
        window.history.replaceState({}, '', url);
    }

    // Function to handle language switching
    function switchLanguage(newLang) {
        if (supportedLanguages.includes(newLang)) {
            storeLanguage(newLang);
            updateUrlLanguage(newLang);
            return true;
        }
        return false;
    }

    // Get current language (for navigation)
    function getCurrentLanguage() {
        const urlLang = getUrlLanguage();
        const storedLang = getStoredLanguage();
        return urlLang || storedLang || 'fr'; // Always default to French
    }

    // Get language parameter for URLs
    function getLanguageParam() {
        return `lang=${getCurrentLanguage()}`;
    }

    // Public API
    return {
        detectLanguage: detectLanguage,
        switchLanguage: switchLanguage,
        getLanguageParam: getLanguageParam,
        getCurrentLanguage: getCurrentLanguage,
        supportedLanguages: supportedLanguages
    };
})();

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    const detectedLang = await LanguageDetection.detectLanguage();
    console.log('Page initialized with language:', detectedLang);
});