console.log("✅ Fake Buster: content.js loaded");

// ===================
// IMAGE DETECTION
// ===================

// Load configuration
const config = window.FakeBusterConfig || {
    API: { 
        BASE_URL: 'http://localhost:5000', 
        ENDPOINTS: { 
            DETECT_IMAGE: '/detect-image',
            DETECT_TEXT: '/detect-text'
        }
    },
    THRESHOLDS: { 
        LIKELY_REAL: 0.3, 
        LIKELY_FAKE: 0.8 
    },
    DEBUG: true
};

const { API, THRESHOLDS, DEBUG } = config;

/**
 * Detects if an image is AI-generated using the backend API
 * @param {string} imgUrl - The URL of the image to analyze
 * @returns {Promise<number>} - A score between 0 (real) and 1 (fake)
 */
async function detectImageAI(imgUrl) {
    if (DEBUG) {
        console.log(`Analyzing image: ${imgUrl.substring(0, 50)}...`);
    }
    
    try {
        const response = await fetch(`${API.BASE_URL}${API.ENDPOINTS.DETECT_IMAGE}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_url: imgUrl })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        const score = data?.deepfake ?? 0.5; // Default to 0.5 if no score is returned
        
        if (DEBUG) {
            console.log(`Image analysis result: ${(score * 100).toFixed(1)}% likely fake`);
        }
        
        return score;
    } catch (error) {
        console.error('Error detecting image:', error);
        return 0.5; // Fallback to neutral score on error
    }
}

/**
 * Creates a visual indicator for the detection result
 * @param {number} score - The detection score (0-1)
 * @param {HTMLElement} img - The image element
 */
function createDetectionIndicator(score, img) {
    let icon, color, label;
    
    if (score < THRESHOLDS.LIKELY_REAL) {
        icon = '✅';
        color = '#008000';
        label = 'Real';
    } else if (score < THRESHOLDS.LIKELY_FAKE) {
        icon = '⚠️';
        color = '#FFA500';
        label = 'Suspicious';
    } else {
        icon = '❌';
        color = '#c00';
        label = 'Fake';
    }
    
    const percentage = Math.round(score * 100);
    const indicator = document.createElement('div');
    
    indicator.innerHTML = `
        <div style="position: absolute; 
                   background: rgba(255, 255, 255, 0.9); 
                   border: 2px solid ${color}; 
                   border-radius: 4px; 
                   padding: 4px 8px; 
                   z-index: 9999; 
                   pointer-events: none;
                   transform: translate(-50%, -100%); 
                   top: -10px; 
                   left: 50%;
                   font-size: 12px; 
                   color: ${color}; 
                   font-weight: bold;
                   white-space: nowrap;
                   box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                   backdrop-filter: blur(2px);">
            ${icon} ${label} (${percentage}%)
        </div>
    `;
    
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.style.lineHeight = '0';
    
    // Insert the wrapper before the image, and move the image into the wrapper
    if (img.parentNode) {
        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);
        wrapper.appendChild(indicator);
    }
    
    return wrapper;
}

/**
 * Scans the page for images and analyzes them
 */
async function detectImages() {
    try {
        const { detectionEnabled } = await chrome.storage.sync.get('detectionEnabled');
        if (!detectionEnabled) return;

        const images = document.querySelectorAll('img[src]:not([data-fb-checked])');
        if (DEBUG) {
            console.log(`Found ${images.length} new images to analyze`);
        }

        for (const img of images) {
            try {
                // Mark as processed to avoid duplicates
                img.setAttribute('data-fb-checked', 'true');
                
                // Skip tiny images and data URIs
                const imgUrl = img.currentSrc || img.src;
                if (!imgUrl || imgUrl.startsWith('data:') || 
                    img.naturalWidth < 50 || img.naturalHeight < 50) {
                    continue;
                }
                
                // Only process visible images
                const style = window.getComputedStyle(img);
                if (style.display === 'none' || style.visibility === 'hidden' || 
                    style.opacity === '0' || img.offsetParent === null) {
                    continue;
                }
                
                // Process the image
                const score = await detectImageAI(imgUrl);
                createDetectionIndicator(score, img);
                
                // Save scan to history
                await saveScanToHistory({
                    url: window.location.href,
                    timestamp: new Date().toISOString(),
                    result: score >= THRESHOLDS.LIKELY_FAKE ? 'fake' : 'real',
                    confidence: score,
                    type: 'image',
                    sourceUrl: imgUrl
                });
                
            } catch (error) {
                console.error('Error processing image:', error);
            }
        }
    } catch (error) {
        console.error('Error in detectImages:', error);
    }
}

// Run detection when the page loads
document.addEventListener('DOMContentLoaded', () => {
    detectImages();
    
    // Also run detection when images are loaded dynamically
    const observer = new MutationObserver((mutations) => {
        let shouldCheck = false;
        
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                shouldCheck = true;
                break;
            }
        }
        
        if (shouldCheck) {
            // Debounce to avoid too many checks
            clearTimeout(window.fakeBusterCheckTimeout);
            window.fakeBusterCheckTimeout = setTimeout(detectImages, 500);
        }
    });
    
    // Start observing the document with the configured parameters
    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
    
    // Also check on scroll (with debouncing)
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(detectImages, 500);
    }, { passive: true });
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'detectImages') {
        detectImages();
        sendResponse({ status: 'success' });
    }
    return true; // Required for async sendResponse
});

// Save scan to history
async function saveScanToHistory(scanData) {
    try {
        const data = await chrome.storage.sync.get(['scanHistory', 'stats']);
        const history = data.scanHistory || [];
        const stats = data.stats || { totalScans: 0, fakeDetections: 0 };
        
        // Add new scan to history
        history.push(scanData);
        
        // Update stats
        stats.totalScans = (stats.totalScans || 0) + 1;
        if (scanData.result === 'fake') {
            stats.fakeDetections = (stats.fakeDetections || 0) + 1;
        }
        
        // Save updated history and stats
        await chrome.storage.sync.set({
            scanHistory: history,
            stats: stats
        });
        
    } catch (error) {
        console.error('Error saving scan to history:', error);
    }
}

// ===================
// TEXT DETECTION POPUP (From context menu trigger)
// ===================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "showResult") {
    const result = message.resultText;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const popup = document.createElement("div");
    popup.textContent = result;
    popup.style.position = "absolute";
    popup.style.left = `${rect.left + window.scrollX}px`;
    popup.style.top = `${rect.top + window.scrollY - 30}px`;
    popup.style.background = "#fff";
    popup.style.border = "1px solid #000";
    popup.style.padding = "4px 6px";
    popup.style.fontSize = "12px";
    popup.style.color = "#000";
    popup.style.zIndex = "9999";
    popup.style.boxShadow = "0px 0px 4px rgba(0,0,0,0.3)";
    popup.style.borderRadius = "4px";

    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 5000);
  }
});
