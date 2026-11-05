// DSAverse LeetCode Auto-Sync - Popup script
document.addEventListener("DOMContentLoaded", async () => {
  const statusBanner = document.getElementById("statusBanner");
  const statusIcon = document.getElementById("statusIcon");
  const statusText = document.getElementById("statusText");

  const slugVal = document.getElementById("slugVal");
  const langVal = document.getElementById("langVal");
  const verdictVal = document.getElementById("verdictVal");
  const codeLenVal = document.getElementById("codeLenVal");
  const queueRow = document.getElementById("queueRow");
  const queueVal = document.getElementById("queueVal");

  const syncBtn = document.getElementById("syncBtn");
  const retryBtn = document.getElementById("retryBtn");
  const copyBtn = document.getElementById("copyBtn");
  const statusMsg = document.getElementById("statusMsg");

  let extractedData = null;

  function setStatus(type, text, icon) {
    statusBanner.className = `status-banner status-${type}`;
    statusText.textContent = text;
    statusIcon.textContent = icon;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      slugVal.textContent = "No active tab";
      setStatus("unsupported", "Unsupported integration", "⚠️");
      return;
    }

    if (!tab.url || (!tab.url.includes("leetcode.com") && !tab.url.includes("leetcode.cn"))) {
      slugVal.textContent = "Not a LeetCode tab";
      setStatus("unsupported", "Unsupported integration", "⚠️");
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: "EXTRACT_SUBMISSION" }).catch(() => null);
    if (response && response.success && response.data) {
      extractedData = response.data;
      slugVal.textContent = extractedData.problemSlug || "Unknown";
      langVal.textContent = extractedData.language || "Unknown";
      verdictVal.textContent = extractedData.verdict || "Ready to sync";
      if (extractedData.verdict === "Accepted") verdictVal.className = "val badge-accepted";
      else verdictVal.className = "val badge-wa";
      
      const codeLen = (extractedData.sourceCode || "").length;
      codeLenVal.textContent = `${codeLen} chars`;

      if (codeLen === 0) {
        setStatus("unavailable", "Source code unavailable", "❌");
      } else {
        // Check if synced
        const key = extractedData.submissionId ? `sub:${extractedData.submissionId}` : `slug:${extractedData.problemSlug}`;
        chrome.storage.local.get("syncedSubmissions", data => {
          const synced = data?.syncedSubmissions || {};
          if (synced[key] && synced[key].status === "synced") {
            setStatus("synced", "Synced", "✓");
          } else {
            setStatus("waiting", "Waiting for synchronization", "⏳");
          }
        });
      }
    } else {
      slugVal.textContent = "LeetCode page loading";
      setStatus("waiting", "Waiting for synchronization", "⏳");
    }
  } catch (err) {
    slugVal.textContent = "LeetCode page not ready";
    setStatus("waiting", "Waiting for synchronization", "⏳");
  }

  // Check retry queue
  function checkQueue() {
    chrome.storage.local.get("syncQueue", data => {
      const queue = data.syncQueue || [];
      if (queue.length > 0) {
        queueRow.style.display = "flex";
        queueVal.textContent = `${queue.length} pending`;
        retryBtn.style.display = "block";
        setStatus("retry", "Retry required", "⚠️");
      } else {
        queueRow.style.display = "none";
        retryBtn.style.display = "none";
      }
    });
  }
  checkQueue();

  retryBtn.addEventListener("click", () => {
    statusMsg.textContent = "Retrying queued items...";
    chrome.runtime.sendMessage({ action: "TRIGGER_QUEUE_PROCESS" }, () => {
      setTimeout(() => {
        checkQueue();
        statusMsg.textContent = "Queue processed.";
      }, 1000);
    });
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
      setStatus("unavailable", "Source code unavailable", "❌");
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
        setStatus("synced", "Synced", "✓");
      } else {
        const data = await res.json().catch(() => ({}));
        statusMsg.textContent = data.message || data.error || `Sync failed (${res.status})`;
        statusMsg.className = "status-msg status-error";
        setStatus("retry", "Retry required", "⚠️");
      }
    } catch (e) {
      statusMsg.textContent = "DSAverse unreachable at localhost:3000";
      statusMsg.className = "status-msg status-error";
      setStatus("retry", "Retry required", "⚠️");
    }
  });
});
