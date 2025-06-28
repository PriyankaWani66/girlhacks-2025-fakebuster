// Configuration 
const CONFIG = {
    // API endpoints
    API: {
        BASE_URL: 'http://localhost:5000',
        ENDPOINTS: {
            DETECT_IMAGE: '/detect-image',
            DETECT_TEXT: '/detect-text'
        }
    },
    
    // Detection thresholds (0-1)
    THRESHOLDS: {
        LIKELY_REAL: 0.3,    
        LIKELY_FAKE: 0.8     
    },
    
    // UI settings
    UI: {
        POPUP_WIDTH: 400,
        POPUP_HEIGHT: 600
    }
};

// Make the config available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.FakeBusterConfig = CONFIG;
}
