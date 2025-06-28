// Initialize the statistics page
document.addEventListener('DOMContentLoaded', async () => {
    // Load statistics from storage
    const stats = await loadStatistics();
    
    // Update the UI with the loaded statistics
    updateStatsUI(stats);
    
    // Load and display scan history
    const scanHistory = await loadScanHistory();
    updateScanHistoryUI(scanHistory);
});

// Load statistics from chrome.storage
async function loadStatistics() {
    try {
        const data = await chrome.storage.sync.get(['stats']);
        return data.stats || {
            totalScans: 0,
            fakeDetections: 0,
            lastUpdated: null
        };
    } catch (error) {
        console.error('Error loading statistics:', error);
        return {
            totalScans: 0,
            fakeDetections: 0,
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
    // Update the stats cards
    document.getElementById('total-scans').textContent = stats.totalScans || 0;
    document.getElementById('fake-detections').textContent = stats.fakeDetections || 0;
    
    // Calculate and display accuracy percentage
    const accuracy = stats.totalScans > 0 
        ? Math.round((stats.fakeDetections / stats.totalScans) * 100) 
        : 0;
    document.getElementById('accuracy').textContent = `${accuracy}%`;
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
