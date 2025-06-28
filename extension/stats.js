// Initialize the statistics page
document.addEventListener('DOMContentLoaded', async () => {
    // Load statistics from storage
    const stats = await loadStatistics();
    
    // Update the UI with the loaded statistics
    updateStatsUI(stats);
    
    // Load and display scan history
    const scanHistory = await loadScanHistory();
    updateScanHistoryUI(scanHistory);
    
    // Request current counts from the active tab's content script
    requestCountsFromActiveTab();
});

// Request current counts from the active tab's content script
async function requestCountsFromActiveTab() {
    try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab) {
            // Send a message to the content script to get current counts
            chrome.tabs.sendMessage(tab.id, { action: 'getDetectionCounts' }, (response) => {
                if (chrome.runtime.lastError) {
                    // Handle the case where the content script might not be loaded
                    console.log('Could not get counts from content script:', chrome.runtime.lastError.message);
                    return;
                }
                
                if (response) {
                    // Update the UI with the received counts
                    updateCountsUI(response);
                }
            });
        }
    } catch (error) {
        console.error('Error requesting counts from active tab:', error);
    }
}

// Update the UI with the latest counts
function updateCountsUI(counts) {
    const updateStat = (elementId, value) => {
        const container = document.getElementById(elementId);
        if (!container) return;
        
        const numberElement = container.querySelector('.stat-number');
        if (numberElement) {
            numberElement.textContent = value !== undefined ? value : '0';
            // Add 'loaded' class to trigger the fade-in animation
            requestAnimationFrame(() => {
                container.classList.add('loaded');
            });
        }
    };

    updateStat('total-detections', counts.totalDetectionCount);
    updateStat('fake-image-count', counts.totalFakeImageCount);
    updateStat('fake-text-count', counts.totalFakeTextCount);
}

// Load statistics from chrome.storage
async function loadStatistics() {
    try {
        // Get both the old stats and the new counters
        const [statsData, countersData] = await Promise.all([
            chrome.storage.sync.get(['stats']),
            chrome.storage.sync.get(['detectionCounters'])
        ]);

        // If we have the new counters, use them
        if (countersData.detectionCounters) {
            return {
                totalScans: countersData.detectionCounters.total || 0,
                fakeImageCount: countersData.detectionCounters.fakeImages || 0,
                fakeTextCount: countersData.detectionCounters.fakeTexts || 0,
                lastUpdated: new Date().toISOString()
            };
        }
        
        // Fall back to old stats if new counters don't exist
        return statsData.stats || {
            totalScans: 0,
            fakeImageCount: 0,
            fakeTextCount: 0,
            lastUpdated: null
        };
    } catch (error) {
        console.error('Error loading statistics:', error);
        return {
            totalScans: 0,
            fakeImageCount: 0,
            fakeTextCount: 0,
            lastUpdated: null
        };
    }
}

// Load scan history from chrome.storage
async function loadScanHistory() {
    try {
        const data = await chrome.storage.sync.get(['scanHistory']);
        return data.scanHistory || [];
    } catch (error) {
        console.error('Error loading scan history:', error);
        return [];
    }
}

// Update the statistics UI
function updateStatsUI(stats) {
    // Update the stats cards with stored values
    const updateStat = (elementId, value) => {
        const container = document.getElementById(elementId);
        if (!container) return;
        
        const numberElement = container.querySelector('.stat-number');
        if (numberElement) {
            // Format large numbers with commas
            const formattedValue = value !== undefined ? value.toLocaleString() : '0';
            numberElement.textContent = formattedValue;
            
            // Add 'loaded' class to trigger the fade-in animation
            requestAnimationFrame(() => {
                container.classList.add('loaded');
            });
        }
    };

    // Ensure we have valid numbers (handle undefined/NaN cases)
    const totalScans = Number.isInteger(stats.totalScans) ? stats.totalScans : 0;
    const fakeImageCount = Number.isInteger(stats.fakeImageCount) ? stats.fakeImageCount : 0;
    const fakeTextCount = Number.isInteger(stats.fakeTextCount) ? stats.fakeTextCount : 0;

    updateStat('total-detections', totalScans);
    updateStat('fake-image-count', fakeImageCount);
    updateStat('fake-text-count', fakeTextCount);
    
    // Calculate and display accuracy percentage
    const totalFakes = fakeImageCount + fakeTextCount;
    const accuracy = totalScans > 0 ? Math.round((totalFakes / totalScans) * 100) : 0;
    const accuracyElement = document.getElementById('accuracy');
    if (accuracyElement) {
        accuracyElement.textContent = `${accuracy}%`;
    }
}

// Update the scan history table
function updateScanHistoryUI(history) {
    const tbody = document.getElementById('scan-history');
    tbody.innerHTML = ''; // Clear existing rows
    
    if (history.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="4" style="text-align: center; padding: 20px; color: #999;">
                No scan history available
            </td>
        `;
        tbody.appendChild(row);
        return;
    }
    
    // Sort by date (newest first)
    const sortedHistory = [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Display up to 10 most recent scans
    const recentScans = sortedHistory.slice(0, 10);
    
    recentScans.forEach(scan => {
        const row = document.createElement('tr');
        
        // Format date
        const date = new Date(scan.timestamp);
        const formattedDate = date.toLocaleString();
        
        // Format URL to show only domain
        let domain = '';
        try {
            const url = new URL(scan.url);
            domain = url.hostname.replace('www.', '');
        } catch (e) {
            domain = 'Unknown';
        }
        
        // Determine status class and text
        let statusClass = '';
        let statusText = '';
        
        if (scan.result === 'fake') {
            statusClass = 'status-fake';
            statusText = 'Fake';
        } else if (scan.result === 'real') {
            statusClass = 'status-real';
            statusText = 'Real';
        } else {
            statusClass = '';
            statusText = 'Unknown';
        }
        
        // Create row HTML
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td title="${scan.url}">${domain}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${scan.confidence ? `${Math.round(scan.confidence * 100)}%` : 'N/A'}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Listen for storage updates
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        if (changes.stats) {
            updateStatsUI(changes.stats.newValue);
        }
        if (changes.scanHistory) {
            updateScanHistoryUI(changes.scanHistory.newValue);
        }
    }
});
