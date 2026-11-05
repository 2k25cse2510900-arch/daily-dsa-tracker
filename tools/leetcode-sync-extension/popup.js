// DSAverse LeetCode Auto-Sync - Popup script
document.addEventListener("DOMContentLoaded", async () => {
  const slugVal = document.getElementById("slugVal");
  const langVal = document.getElementById("langVal");
  const verdictVal = document.getElementById("verdictVal");
  const codeLenVal = document.getElementById("codeLenVal");
  const syncBtn = document.getElementById("syncBtn");
  const copyBtn = document.getElementById("copyBtn");
  const statusMsg = document.getElementById("statusMsg");

  let extractedData = null;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      slugVal.textContent = "No active tab";
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: "EXTRACT_SUBMISSION" });
    if (response && response.success && response.data) {
      extractedData = response.data;
      slugVal.textContent = extractedData.problemSlug || "Unknown";
      langVal.textContent = extractedData.language || "Unknown";
      verdictVal.textContent = extractedData.verdict || "Ready to sync";
      if (extractedData.verdict === "Accepted") verdictVal.className = "val badge-accepted";
      else verdictVal.className = "val badge-wa";
      codeLenVal.textContent = `${(extractedData.sourceCode || "").length} chars`;
    } else {
      slugVal.textContent = "Not a LeetCode problem page";
    }
  } catch (err) {
    slugVal.textContent = "LeetCode page not ready";
  }

  // Display queue status if any
  chrome.storage.local.get("syncQueue", data => {
    const queue = data.syncQueue || [];
    if (queue.length > 0) {
      statusMsg.textContent = `${queue.length} submission(s) pending in retry queue.`;
      statusMsg.className = "status-msg";
    }
  });

  copyBtn.addEventListener("click", () => {
    if (!extractedData || !extractedData.sourceCode) {
      statusMsg.textContent = "No source code detected to copy.";
      statusMsg.className = "status-msg status-error";
      return;
    }
    navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2));
    statusMsg.textContent = "Submission payload copied to clipboard!";
    statusMsg.className = "status-msg status-success";
  });

  syncBtn.addEventListener("click", async () => {
    if (!extractedData || !extractedData.sourceCode) {
      statusMsg.textContent = "No code found to sync.";
      statusMsg.className = "status-msg status-error";
      return;
    }

    statusMsg.textContent = "Sending to DSAverse...";
    statusMsg.className = "status-msg";

    try {
      const res = await fetch("http://localhost:3000/api/ai-code-mentor/submissions/auto-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          problemSlug: extractedData.problemSlug,
          problemTitle: extractedData.title,
          questionFrontendId: extractedData.questionFrontendId,
          difficulty: extractedData.difficulty,
          submissionId: extractedData.submissionId || String(Date.now()),
          sourceCode: extractedData.sourceCode,
          language: extractedData.language,
          verdict: extractedData.verdict || "Accepted",
          sourceProvenance: "authorized_extension"
        })
      });

      if (res.ok) {
        statusMsg.textContent = "Successfully synced to DSAverse!";
        statusMsg.className = "status-msg status-success";
      } else {
        const data = await res.json().catch(() => ({}));
        statusMsg.textContent = data.message || data.error || `Sync failed (${res.status})`;
        statusMsg.className = "status-msg status-error";
      }
    } catch (e) {
      statusMsg.textContent = "DSAverse unreachable at localhost:3000";
      statusMsg.className = "status-msg status-error";
    }
  });
});
