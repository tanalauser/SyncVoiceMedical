// This file should be included after terms.js

class TermsLoader {
    constructor() {
        this.contentCache = new Map();
        this.currentLanguage = 'fr';
        this.currentVersion = 'free';
    }

    async initialize() {
        const urlParams = new URLSearchParams(window.location.search);
        this.currentLanguage = urlParams.get('lang') || 'fr';
        this.currentVersion = urlParams.get('version') || 'free';
        
        // Update UI elements
        this.updateLanguageUI();
        
        // Load content
        await this.loadContent();
        
        // Set up event listeners
        this.setupEventListeners();
    }

    updateLanguageUI() {
        document.documentElement.lang = this.currentLanguage;
        const returnBtn = document.getElementById('returnBtn');
        if (returnBtn) {
            returnBtn.href = `form.html?lang=${this.currentLanguage}&version=${this.currentVersion}`;
        }
    }

    async loadContent() {
        const termsContent = document.getElementById('termsContent');
        if (!termsContent) return;

        try {
            // Try to get content from cache first
            let content = this.contentCache.get(`${this.currentLanguage}-${this.currentVersion}`);
            
            if (!content) {
                const response = await fetch(`terms-content-${this.currentLanguage}.json`);
                const data = await response.json();
                content = data[this.currentVersion === 'paid' ? 'cgv' : 'cge'];
                
                // Cache the content
                this.contentCache.set(`${this.currentLanguage}-${this.currentVersion}`, content);
            }

            termsContent.innerHTML = content;
            
            // Update meta tags
            this.updateMetaTags();

        } catch (error) {
            console.error('Error loading terms content:', error);
            termsContent.innerHTML = '<p class="error">Error loading content. Please try again later.</p>';
        }
    }

    updateMetaTags() {
        const title = document.getElementById('pageTitle');
        const mainTitle = document.getElementById('mainTitle');
        
        const translations = {
            fr: {
                cgv: 'Conditions Générales de Vente - SyncVoice Medical',
                cge: 'Conditions Générales d\'Essai - SyncVoice Medical'
            },
            en: {
                cgv: 'Terms and Conditions of Sale - SyncVoice Medical',
                cge: 'Trial Terms and Conditions - SyncVoice Medical'
            }
            // Add other languages as needed
        };

        const t = translations[this.currentLanguage] || translations.fr;
        const titleText = this.currentVersion === 'paid' ? t.cgv : t.cge;

        if (title) title.textContent = titleText;
        if (mainTitle) mainTitle.textContent = titleText.toUpperCase();
    }

    setupEventListeners() {
        // If we add language switcher later
        document.addEventListener('languagechange', () => {
            this.loadContent();
        });

        // Handle print functionality if needed
        if (document.getElementById('printButton')) {
            document.getElementById('printButton').addEventListener('click', () => {
                window.print();
            });
        }
    }
}

// Initialize the loader when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const loader = new TermsLoader();
    loader.initialize();
});