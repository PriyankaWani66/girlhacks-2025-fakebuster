document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("toggleSwitch");

  // Load toggle state
  chrome.storage.sync.get("detectionEnabled", (data) => {
    toggle.checked = data.detectionEnabled ?? false;
  });

  // Save toggle state on change
  toggle.addEventListener("change", () => {
    const enabled = toggle.checked;
    chrome.storage.sync.set({ detectionEnabled: enabled });

    // Optional: notify content script if needed
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { detectionEnabled: enabled });
    });
  });
});
