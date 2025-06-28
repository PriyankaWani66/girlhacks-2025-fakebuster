console.log("✅ Fake Buster: content.js loaded");

// ===================
// IMAGE DETECTION
// ===================

const detectionEndpoint = "http://localhost:5000/detect-image"; // Change when deployed

async function detectImageAI(imgUrl) {
  try {
    const res = await fetch(detectionEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: imgUrl }),
    });
    const data = await res.json();
    return data?.deepfake ?? 0.5;
  } catch (err) {
    console.error("API call failed:", err);
    return 0.5; // fallback
  }
}

function detectImages() {
  chrome.storage.sync.get("detectionEnabled", (data) => {
    if (!data.detectionEnabled) return;

    const images = document.querySelectorAll("img[src]:not([data-fb-checked])");

    images.forEach(async (img) => {
      img.setAttribute("data-fb-checked", "true");

      const imgUrl = img.currentSrc || img.src;
      if (!imgUrl) return;

      // Mock score for testing
      const score = 0.87;
      // const score = await detectImageAI(imgUrl); // Uncomment for real API

      const popup = document.createElement("div");
      let icon = "", color = "";
      if (score < 0.3) {
        icon = "✅";
        color = "#008000";
      } else if (score < 0.8) {
        icon = "⚠️";
        color = "#FFA500";
      } else {
        icon = "❌";
        color = "#c00";
      }

      popup.innerHTML = `
        <span style="color: ${color}; font-weight: bold;">${icon} ${Math.round(score * 100)}% likely AI</span>
        <button style="margin-left:6px;">Flag</button>
      `;

      popup.style.position = "absolute";
      popup.style.background = "#fff";
      popup.style.border = "1px solid black";
      popup.style.padding = "2px 6px";
      popup.style.fontSize = "10px";
      popup.style.zIndex = 9999;

      const rect = img.getBoundingClientRect();
      popup.style.top = `${rect.top + window.scrollY + 5}px`;
      popup.style.left = `${rect.left + window.scrollX + 5}px`;

      popup.querySelector("button").onclick = () => {
        const btn = popup.querySelector("button");
        const flagged = btn.textContent === "Unflag";
        btn.textContent = flagged ? "Flag" : "Unflag";
        btn.style.backgroundColor = flagged ? "#fff" : "#ffc0cb";
      };

      document.body.appendChild(popup);
    });
  });
}

// Run on load and scroll
detectImages();
window.addEventListener("scroll", () => setTimeout(detectImages, 1000));


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
