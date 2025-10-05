document.addEventListener('DOMContentLoaded', () => {
    console.log("Terms.js loaded");
    
    // Button translations for all languages
    const buttonTranslations = {
        fr: {
            returnBtn: "Retour",
            printBtn: "Imprimer"
        },
        en: {
            returnBtn: "Return",
            printBtn: "Print"
        },
        de: {
            returnBtn: "Zurück",
            printBtn: "Drucken"
        },
        es: {
            returnBtn: "Volver",
            printBtn: "Imprimir"
        },
        it: {
            returnBtn: "Indietro",
            printBtn: "Stampare"
        },
        pt: {
            returnBtn: "Voltar",
            printBtn: "Imprimir"
        }
    };
    
    // Detect which terms document we're in (cge or cgv)
    const path = window.location.pathname;
    const isCgv = path.includes('cgv.html');
    const isCge = path.includes('cge.html');
    
    // Determine the plan type based on the document
    const planType = isCgv ? 'paid' : 'free';
    console.log("Detected plan type:", planType);
    
    // Get language from path
    const pathParts = path.split('/');
    const langIndex = pathParts.indexOf('terms') + 1;
    const currentLang = pathParts[langIndex] || 'fr';
    console.log("Detected language:", currentLang);
    
    // Get the translations for the current language
    const t = buttonTranslations[currentLang] || buttonTranslations.fr;
    
    // Update button texts based on language
    const returnButton = document.getElementById('returnBtn');
    const printButton = document.getElementById('printBtn');
    
    if (returnButton) {
        returnButton.textContent = t.returnBtn;
    }
    
    if (printButton) {
        printButton.textContent = t.printBtn;
    }
    
    // Handle Print button click
    if (printButton) {
        printButton.addEventListener('click', () => {
            console.log("Print button clicked");
            window.print();
        });
    }
    
    // Update Return button href and click handler
    if (returnButton) {
        // Set the correct form URL with plan parameter
        const formUrl = `/form.html?lang=${currentLang}&plan=${planType}`;
        
        // Update the onclick handler as a backup to the HTML onclick
        returnButton.onclick = function() {
            console.log("Navigating to:", formUrl);
            window.location.href = formUrl;
            return false;
        };
    }
});