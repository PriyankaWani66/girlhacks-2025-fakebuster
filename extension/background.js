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
      // ---------------------------
      // MOCK RESULT FOR TESTING
      // const resultText = "The text is 95% likely AI-generated";
      // ---------------------------

      // 🟢 UNCOMMENT BELOW TO USE API
      
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
        resultText += ` (Model: ${data.LLM}) ⚠️`;  // Add warning symbol
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
