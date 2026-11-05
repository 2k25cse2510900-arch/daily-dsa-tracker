// DSAverse LeetCode Auto-Sync - Background Service Worker
// Manages the persistent retry queue and background sync alarms
"use strict";

const DEFAULT_DSA_SERVER = "http://localhost:3000";
const RETRY_ALARM_NAME = "dsaverse_sync_retry_alarm";

chrome.runtime.onInstalled.addListener(() => {
  console.log("[DSAverse Auto-Sync] Background service worker installed.");
  // Setup periodic retry check every 1 minute
  chrome.alarms.create(RETRY_ALARM_NAME, { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === RETRY_ALARM_NAME) {
    processPendingQueue();
  }
});

async function processPendingQueue() {
  const { syncQueue = [] } = await chrome.storage.local.get("syncQueue");
  if (!syncQueue.length) return;

  const { dsaServer = DEFAULT_DSA_SERVER } = await chrome.storage.local.get("dsaServer");
  const remainingQueue = [];

  for (const item of syncQueue) {
    if (item.attempts >= 5) {
      console.warn("[DSAverse Auto-Sync] Max retries reached for submission:", item.submissionId || item.problemSlug);
      continue;
    }
    try {
      const res = await fetch(`${dsaServer}/api/ai-code-mentor/submissions/auto-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(item.payload)
      });
      if (res.ok) {
        console.log("[DSAverse Auto-Sync] Successfully processed queued submission:", item.submissionId);
        // Mark as synced
        const { syncedSubmissions = {} } = await chrome.storage.local.get("syncedSubmissions");
        const key = item.submissionId || `${item.problemSlug}_${item.submittedAt}`;
        syncedSubmissions[key] = {
          syncedAt: new Date().toISOString(),
          status: "synced"
        };
        await chrome.storage.local.set({ syncedSubmissions });
      } else {
        item.attempts = (item.attempts || 0) + 1;
        item.lastError = `Server responded with ${res.status}`;
        remainingQueue.push(item);
      }
    } catch (err) {
      item.attempts = (item.attempts || 0) + 1;
      item.lastError = err.message || "Network unreachable";
      remainingQueue.push(item);
    }
  }

  await chrome.storage.local.set({ syncQueue: remainingQueue });
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "TRIGGER_QUEUE_PROCESS") {
    processPendingQueue().then(() => sendResponse({ status: "processing" }));
    return true;
  }
  if (request.action === "GET_SYNC_STATUS") {
    chrome.storage.local.get(["syncQueue", "syncedSubmissions", "lastSubmission"], data => {
      sendResponse(data);
    });
    return true;
  }
});
