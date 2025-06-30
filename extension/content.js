console.log("✅ Fake Buster: content.js loaded");


// IMAGE DETECTION

async function detectImageAI(imgUrl) {
    return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: "detectImage", url: imgUrl },
      (response) => {
        console.log("🎯 Raw response from background.js:", response);
        console.log("🐛 Image score received:", response?.score);
        resolve(response?.score ?? 0.5); // fallback
      }
    );
  });
}

const checkedImages = new Set();
function detectImages() {
  chrome.storage.sync.get("detectionEnabled", (data) => {
    if (!data.detectionEnabled) return;

    const images = document.querySelectorAll("img[src]:not([data-fb-checked])");

    images.forEach(async (img) => {
      const imgUrl = img.currentSrc || img.src;
      if (!imgUrl || checkedImages.has(imgUrl)) return;
      checkedImages.add(imgUrl); // mark as checked
      img.setAttribute("data-fb-checked", "true");
      const score = await detectImageAI(imgUrl); 
      

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

// Run once when the page fully loads
window.addEventListener("load", () => {
  detectImages();
});


// Run on load and scroll
let scrollTimeout;
window.addEventListener("scroll", () => {
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    detectImages();
  }, 1000); // adjust delay as needed
});

// TEXT DETECTION POPUP (From context menu trigger)

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
