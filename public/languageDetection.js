// Create a new file: public/languageDetection.js
// This will be shared across all pages for consistent language detection

function detectUserLanguage() {
    console.log('Detecting user language...');
    
    // 1. Check URL parameter (highest priority)
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (urlLang) {
        console.log('Using language from URL:', urlLang);
        return urlLang;
    }
    
    // 2. Check stored preference
    let storedLang = null;
    try {
        storedLang = localStorage.getItem('selectedLanguage');
        if (storedLang) {
            console.log('Using stored language:', storedLang);
            return storedLang;
        }
    } catch (e) {
        console.log('localStorage not available');
    }
    
    // 3. Detect from browser
    const browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    console.log('Browser language:', browserLang);
    
    // Map browser languages to our supported languages
    const languageMap = {
        // English variants - ALL map to 'en'
        'en': 'en',
        'en-gb': 'en',
        'en-us': 'en',
        'en-au': 'en',
        'en-ca': 'en',
        'en-nz': 'en',
        'en-ie': 'en',
        'en-za': 'en',
        'en-in': 'en',
        
        // French variants
        'fr': 'fr',
        'fr-fr': 'fr',
        'fr-ca': 'fr',
        'fr-be': 'fr',
        'fr-ch': 'fr',
        
        // German variants
        'de': 'de',
        'de-de': 'de',
        'de-at': 'de',
        'de-ch': 'de',
        
        // Spanish variants
        'es': 'es',
        'es-es': 'es',
        'es-mx': 'es',
        'es-ar': 'es',
        
        // Italian variants
        'it': 'it',
        'it-it': 'it',
        'it-ch': 'it',
        
        // Portuguese variants
        'pt': 'pt',
        'pt-pt': 'pt',
        'pt-br': 'pt'
    };
    
    // Check full locale first (e.g., 'en-gb')
    if (languageMap[browserLang]) {
        console.log('Mapped language:', languageMap[browserLang]);
        return languageMap[browserLang];
    }
    
    // Check just the language part (e.g., 'en' from 'en-gb')
    const langOnly = browserLang.split('-')[0];
    if (languageMap[langOnly]) {
        console.log('Mapped language (short):', languageMap[langOnly]);
        return languageMap[langOnly];
    }
    
    // Default to English for any unrecognized language
    console.log('Defaulting to English');
    return 'en';
}

// Function to save language preference
function saveLanguagePreference(lang) {
    try {
        localStorage.setItem('selectedLanguage', lang);
    } catch (e) {
        console.log('Could not save language preference');
    }
}

// Function to update URL with language parameter
function updateUrlLanguage(lang) {
    const url = new URL(window.location);
    url.searchParams.set('lang', lang);
    window.history.replaceState({}, '', url);
}