// DSAverse LeetCode Auto-Sync - Background Service Worker
// Manages safe retry queues, exponential backoff, and duplicate prevention
"use strict";

const DEFAULT_DSA_SERVER = "http://localhost:3000";
const RETRY_ALARM_NAME = "dsaverse_sync_retry_alarm";

chrome.runtime.onInstalled.addListener(() => {
  console.log("[DSAverse Auto-Sync] Background service worker initialized.");
  chrome.alarms.create(RETRY_ALARM_NAME, { periodInMinutes: 0.5 }); // Check every 30s
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === RETRY_ALARM_NAME) {
    processPendingQueue();
  }
});

function calculateBackoffMs(attempts) {
  const base = 2000;
  const max = 60000;
  const backoff = Math.min(max, base * Math.pow(2, attempts));
  const jitter = Math.floor(Math.random() * 1000);
  return backoff + jitter;
}

async function processPendingQueue() {
  const { syncQueue = [] } = await chrome.storage.local.get("syncQueue");
  if (!syncQueue.length) return;

  const { dsaServer = DEFAULT_DSA_SERVER } = await chrome.storage.local.get("dsaServer");
  const { syncedSubmissions = {} } = await chrome.storage.local.get("syncedSubmissions");

  const now = Date.now();
  const remainingQueue = [];

  for (const item of syncQueue) {
    const key = item.submissionId ? `sub:${item.submissionId}` : `slug:${item.problemSlug}:${item.submittedAt}`;

    // Prevent duplicate sync if already marked synced
    if (syncedSubmissions[key] && syncedSubmissions[key].status === "synced") {
      console.log("[DSAverse Auto-Sync] Item already synced, dropping from queue:", key);
      continue;
    }

    // Check if backoff window has elapsed
    if (item.nextRetryAt && item.nextRetryAt > now) {
      remainingQueue.push(item);
      continue;
    }

    if (item.attempts >= 8) {
      console.warn("[DSAverse Auto-Sync] Max retries reached for:", key);
      syncedSubmissions[key] = {
        status: "retry_exhausted",
        lastError: item.lastError || "Maximum retries reached",
        updatedAt: new Date().toISOString()
      };
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
        console.log("[DSAverse Auto-Sync] Successfully synced queued submission:", key);
        syncedSubmissions[key] = {
          syncedAt: new Date().toISOString(),
          status: "synced",
          submissionId: item.submissionId,
          problemSlug: item.problemSlug
        };
      } else {
        const errorData = await res.json().catch(() => ({}));
        const attempts = (item.attempts || 0) + 1;
        const nextRetryAt = now + calculateBackoffMs(attempts);
        console.warn(`[DSAverse Auto-Sync] Server error (${res.status}) on attempt ${attempts}:`, errorData.message || errorData.error);
        
        // Permanent 4xx errors (except 429) shouldn't be indefinitely retried
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          syncedSubmissions[key] = {
            status: "rejected",
            lastError: errorData.message || errorData.error || `Client error ${res.status}`,
            updatedAt: new Date().toISOString()
          };
        } else {
          remainingQueue.push({
            ...item,
            attempts,
            nextRetryAt,
            lastError: errorData.message || `Server status ${res.status}`
          });
        }
      }
    } catch (netErr) {
      const attempts = (item.attempts || 0) + 1;
      const nextRetryAt = now + calculateBackoffMs(attempts);
      console.warn(`[DSAverse Auto-Sync] Network failure on attempt ${attempts}:`, netErr.message);
      remainingQueue.push({
        ...item,
        attempts,
        nextRetryAt,
        lastError: netErr.message || "Network unreachable"
      });
    }
  }

  await chrome.storage.local.set({
    syncQueue: remainingQueue,
    syncedSubmissions
  });
}

// Runtime message listener
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "TRIGGER_QUEUE_PROCESS") {
    processPendingQueue().then(() => sendResponse({ status: "processed" }));
    return true;
  }
  if (request.action === "GET_SYNC_STATUS") {
    chrome.storage.local.get(["syncQueue", "syncedSubmissions", "lastSynced"], data => {
      sendResponse(data);
    });
    return true;
  }
  if (request.action === "ENQUEUE_SUBMISSION") {
    const { payload } = request;
    if (!payload) return;
    chrome.storage.local.get(["syncQueue", "syncedSubmissions"], async data => {
      const queue = data.syncQueue || [];
      const synced = data.syncedSubmissions || {};
      const key = payload.submissionId ? `sub:${payload.submissionId}` : `slug:${payload.problemSlug}:${payload.submittedAt}`;

      if (synced[key] && synced[key].status === "synced") {
        sendResponse({ status: "already_synced" });
        return;
      }

      const exists = queue.some(q => (q.submissionId && q.submissionId === payload.submissionId));
      if (!exists) {
        queue.push({
          submissionId: payload.submissionId,
          problemSlug: payload.problemSlug,
          submittedAt: payload.submittedAt,
          payload,
          attempts: 0,
          nextRetryAt: 0,
          enqueuedAt: new Date().toISOString()
        });
        await chrome.storage.local.set({ syncQueue: queue });
      }

      // Immediately attempt processing
      processPendingQueue().then(() => sendResponse({ status: "enqueued" }));
    });
    return true;
  }
});
