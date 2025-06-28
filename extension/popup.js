// DOM Elements
const toggleSwitch = document.getElementById('toggleSwitch');
const statusText = document.getElementById('statusText');
const scannedCountEl = document.getElementById('scannedCount');
const fakeCountEl = document.getElementById('fakeCount');
const lastCheckedEl = document.getElementById('lastChecked');

// Default stats
const defaultStats = {
    scannedCount: 0,
    fakeCount: 0,
    lastChecked: null,
    detectionEnabled: false
};

// Format date to readable string
function formatDate(date) {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
}

// Update UI with current stats
function updateUI(stats) {
    scannedCountEl.textContent = stats.scannedCount;
    fakeCountEl.textContent = stats.fakeCount;
    lastCheckedEl.textContent = stats.lastChecked ? formatDate(stats.lastChecked) : 'Never';
    toggleSwitch.checked = stats.detectionEnabled;
    
    // Update status text
    if (stats.detectionEnabled) {
        statusText.textContent = 'Active - Scanning for AI content';
        statusText.classList.add('active');
    } else {
        statusText.textContent = 'Paused - Not scanning';
        statusText.classList.remove('active');
    }
}

// Get current active tab
async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

// Toggle detection on/off
async function toggleDetection(enabled) {
    const tab = await getActiveTab();
    
    // Update storage with new state
    const data = await chrome.storage.sync.get('stats');
    const stats = data.stats || { ...defaultStats };
    
    stats.detectionEnabled = enabled;
    stats.lastChecked = new Date().toISOString();
    
    await chrome.storage.sync.set({ 
        detectionEnabled: enabled,
        stats: stats
    });
    
    // Update UI
    updateUI(stats);
    
    // Send message to content script
    try {
        await chrome.tabs.sendMessage(tab.id, { 
            action: 'toggleDetection',
            enabled: enabled 
        });
        
        // If enabling, trigger a scan
        if (enabled) {
            await chrome.tabs.sendMessage(tab.id, { action: 'scanPage' });
        }
    } catch (error) {
        console.error('Error sending message to content script:', error);
        statusText.textContent = 'Error: Could not connect to page. Try refreshing.';
        statusText.style.color = 'var(--danger-color)';
    }
}

// Initialize the popup
document.addEventListener('DOMContentLoaded', async () => {
    // Load current state
    const data = await chrome.storage.sync.get(['detectionEnabled', 'stats']);
    const stats = data.stats || { ...defaultStats };
    
    // Initialize with stored state or defaults
    const currentState = {
        ...defaultStats,
        ...stats,
        detectionEnabled: data.detectionEnabled !== undefined ? data.detectionEnabled : defaultStats.detectionEnabled
    };
    
    // Update UI with current state
    updateUI(currentState);
    
    // Save the initialized state
    await chrome.storage.sync.set({
        detectionEnabled: currentState.detectionEnabled,
        stats: currentState
    });
    
    // Set up event listeners
    toggleSwitch.addEventListener('change', (e) => {
        toggleDetection(e.target.checked);
    });
    
    // Listen for updates from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'updateStats') {
            updateUI(message.stats);
        }
        return true;
    });
    
    // Update the UI immediately with any new stats
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes.stats) {
            updateUI({
                ...defaultStats,
                ...changes.stats.newValue
            });
        }
    });
});
