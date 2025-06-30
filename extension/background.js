chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "check-text",
    title: "Check if AI-generated",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "check-text") {
    const selectedText = info.selectionText;
    if (!selectedText) return;

    try {
    
      const response = await fetch("http://127.0.0.1:8000/detect-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text_str: selectedText }),
      });

      const data = await response.json();

      const percentMatch = data.result.match(/(\d+(\.\d+)?)%/);
      const score = percentMatch ? parseFloat(percentMatch[1]) : 0;

      let resultText = data.result;
      if (score >= 80) {
        resultText += ` (Model: ${data.LLM}) ⚠️`; 
      }

      // Send to content.js
      chrome.tabs.sendMessage(tab.id, {
        action: "showResult",
        resultText,
      });

    } catch (err) {
      console.error("❌ Text detection API error:", err);
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "detectImage" && message.url) {
    console.log("📩 Received image detection request:", message.url);

    fetch("http://127.0.0.1:8000/detect-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: message.url }),
    })
      .then(response => {
        console.log("📦 Raw response from backend:", response);
        return response.json();
      })
      .then(data => {
        console.log("✅ Parsed data from backend:", data);
        sendResponse({ score: data?.deepfake_score ?? 0.5 });
 // fallback to 0.5
      })
      .catch(err => {
        console.error("❌ Error fetching image score:", err);
        sendResponse({ score: 0.5 }); // fallback on error
      });

    return true; // keeps message channel open for async sendResponse
  }
});

