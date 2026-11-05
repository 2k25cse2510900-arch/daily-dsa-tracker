// DSAverse LeetCode Auto-Sync - Content Script
// Captures exact submission code snapshot, tracks judging completion, and syncs automatically
(() => {
  "use strict";

  console.log("[DSAverse Auto-Sync] Content script loaded on:", window.location.href);

  // In-memory active submission state
  let pendingSubmission = null;

  // Extract problem metadata from DOM
  function extractProblemMetadata() {
    const url = window.location.href;
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const problemSlug = pathParts[1] || "";

    // Extract Title & Frontend ID
    let title = "";
    let questionFrontendId = "";
    let difficulty = "Medium";

    // 1. Modern LeetCode header (e.g. "1. Two Sum")
    const titleEl = document.querySelector("div[class*='text-title-large'] a") ||
                    document.querySelector("[data-cy='question-title']") ||
                    document.querySelector("div[class*='text-lg'] a");
    if (titleEl && titleEl.textContent) {
      const fullText = titleEl.textContent.trim();
      const match = fullText.match(/^(\d+)\.\s*(.+)$/);
      if (match) {
        questionFrontendId = match[1];
        title = match[2];
      } else {
        title = fullText;
      }
    }

    if (!title) {
      // Fallback: title from slug
      title = problemSlug
        .split("-")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }

    // Difficulty
    const diffEl = document.querySelector("div[class*='text-difficulty-']") ||
                   document.querySelector("span[class*='difficulty-']") ||
                   document.querySelector(".text-olive") ||
                   document.querySelector(".text-yellow") ||
                   document.querySelector(".text-pink");
    if (diffEl && diffEl.textContent) {
      const dt = diffEl.textContent.trim().toLowerCase();
      if (dt.includes("easy")) difficulty = "Easy";
      else if (dt.includes("hard")) difficulty = "Hard";
      else if (dt.includes("medium")) difficulty = "Medium";
    }

    // Topic tags
    const topicTags = [];
    const tagEls = document.querySelectorAll("a[href*='/tag/']");
    tagEls.forEach(el => {
      const tag = el.textContent.trim();
      if (tag && !topicTags.includes(tag)) topicTags.push(tag);
    });

    // Problem description & constraints
    let description = "";
    let constraints = "";
    const descEl = document.querySelector("[data-track-load='description_content']") ||
                   document.querySelector(".elfjS") ||
                   document.querySelector("div[class*='content__']");
    if (descEl) {
      description = descEl.innerText.trim();
      const cMatch = description.match(/Constraints?:([\s\S]*)$/i);
      if (cMatch) {
        constraints = cMatch[1].trim();
      }
    }

    return {
      problemSlug,
      title,
      questionFrontendId,
      difficulty,
      topicTags,
      description,
      constraints,
      url
    };
  }

  // Extract code from DOM editor
  function extractEditorCode() {
    // Check Monaco editor view-lines
    const viewLines = document.querySelector(".view-lines");
    if (viewLines) {
      const lines = Array.from(viewLines.querySelectorAll(".view-line"))
        .map(line => line.textContent || "");
      if (lines.length > 0 && lines.join("").trim()) {
        return lines.join("\n");
      }
    }

    // Fallbacks
    const codeContainers = [
      document.querySelector(".monaco-editor"),
      document.querySelector("pre code"),
      document.querySelector("div[data-mode-id]")
    ];
    for (const c of codeContainers) {
      if (c && c.innerText && c.innerText.trim()) {
        return c.innerText;
      }
    }
    return "";
  }

  // Detect active language from DOM
  function extractLanguage() {
    let language = "python3";
    const langBadge = document.querySelector("[data-cy='lang-select']") ||
                      document.querySelector(".ant-select-selection-item") ||
                      document.querySelector("button[id^='headlessui-listbox-button']") ||
                      document.querySelector("button[class*='rounded'][class*='px-'][id]");
    if (langBadge && langBadge.innerText) {
      const txt = langBadge.innerText.toLowerCase();
      if (txt.includes("python3") || txt.includes("python 3")) language = "python3";
      else if (txt.includes("python")) language = "python3";
      else if (txt.includes("java") && !txt.includes("script")) language = "java";
      else if (txt.includes("c++") || txt.includes("cpp")) language = "cpp";
      else if (txt.includes("javascript")) language = "javascript";
      else if (txt.includes("typescript")) language = "typescript";
      else if (txt.includes("go")) language = "go";
      else if (txt.includes("rust")) language = "rust";
      else if (txt.includes("c#")) language = "csharp";
    }
    return language;
  }

  // Snapshot submission when user triggers submit
  function onUserSubmitInitiated() {
    const meta = extractProblemMetadata();
    const sourceCode = extractEditorCode();
    const language = extractLanguage();

    pendingSubmission = {
      ...meta,
      sourceCode,
      language,
      submittedAt: new Date().toISOString(),
      status: "judging"
    };

    console.log("[DSAverse Auto-Sync] Submission initiated by user:", {
      slug: pendingSubmission.problemSlug,
      lang: pendingSubmission.language,
      codeLen: pendingSubmission.sourceCode.length
    });
  }

  // Listen for clicks on Submit buttons
  function attachSubmitListeners() {
    document.addEventListener("click", event => {
      const target = event.target;
      const submitBtn = target.closest("button[data-e2e-locator='console-submit-button']") ||
                        target.closest("[data-cypress='submit-code-btn']") ||
                        (target.tagName === "BUTTON" && /submit/i.test(target.textContent));
      if (submitBtn) {
        onUserSubmitInitiated();
      }
    }, true);

    // Keyboard shortcut: Ctrl+Enter or Cmd+Enter
    document.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        onUserSubmitInitiated();
      }
    }, true);
  }

  attachSubmitListeners();

  // DOM MutationObserver fallback for judging results
  function setupResultObserver() {
    let lastObservedVerdict = "";
    let lastObservedTime = 0;

    const observer = new MutationObserver(() => {
      // Look for result status element
      const statusEl = document.querySelector("[data-e2e-locator='submission-result']") ||
                       document.querySelector(".text-green-s") ||
                       document.querySelector(".text-red-s") ||
                       document.querySelector("[class*='result-state']") ||
                       document.querySelector("[class*='status-']");
      if (!statusEl || !statusEl.innerText) return;

      const txt = statusEl.innerText.trim();
      let verdict = null;
      if (/wrong\s*answer/i.test(txt)) verdict = "Wrong Answer";
      else if (/time\s*limit/i.test(txt) || /tle/i.test(txt)) verdict = "Time Limit Exceeded";
      else if (/runtime\s*error/i.test(txt)) verdict = "Runtime Error";
      else if (/compil/i.test(txt)) verdict = "Compilation Error";
      else if (/accepted/i.test(txt)) verdict = "Accepted";

      if (!verdict) return;

      // Throttle rapid re-detections (within 5 seconds)
      const now = Date.now();
      if (verdict === lastObservedVerdict && now - lastObservedTime < 5000) return;

      lastObservedVerdict = verdict;
      lastObservedTime = now;

      // Extract runtime and memory from sibling or parent nodes
      let runtime = "";
      let memory = "";
      const parentCard = statusEl.closest("div[class*='container']") || statusEl.parentElement;
      if (parentCard) {
        const fullText = parentCard.innerText;
        const rtMatch = fullText.match(/(\d+(?:\.\d+)?\s*(?:ms|s))/i);
        if (rtMatch) runtime = rtMatch[1];
        const memMatch = fullText.match(/(\d+(?:\.\d+)?\s*(?:mb|kb|gb))/i);
        if (memMatch) memory = memMatch[1];
      }

      console.log("[DSAverse Auto-Sync] DOM observer detected final verdict:", verdict);

      handleCompletedSubmission({
        verdict,
        runtime,
        memory,
        timestamp: new Date().toISOString()
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  setupResultObserver();

  // Listen to messages from page-hook.js
  window.addEventListener("message", event => {
    if (event.source !== window || event.data?.source !== "dsaverse_extension_hook") return;

    const { type, detail } = event.data;

    if (type === "SUBMISSION_INITIATED") {
      const meta = extractProblemMetadata();
      pendingSubmission = {
        ...meta,
        problemSlug: detail.problemSlug || meta.problemSlug,
        questionFrontendId: detail.questionId || meta.questionFrontendId,
        sourceCode: detail.sourceCode || extractEditorCode(),
        language: detail.language || extractLanguage(),
        submittedAt: detail.submittedAt || new Date().toISOString(),
        status: "judging"
      };
      console.log("[DSAverse Auto-Sync] Intercepted submit request:", pendingSubmission.problemSlug);
    }

    if (type === "SUBMISSION_ID_ASSIGNED") {
      if (pendingSubmission) {
        pendingSubmission.submissionId = detail.submissionId;
        console.log("[DSAverse Auto-Sync] Submission ID assigned:", detail.submissionId);
      }
    }

    if (type === "SUBMISSION_COMPLETED") {
      console.log("[DSAverse Auto-Sync] Submission judging completed:", detail.verdict);
      handleCompletedSubmission(detail);
    }
  });

  // Handle completed submission
  async function handleCompletedSubmission(judgingDetail) {
    const meta = extractProblemMetadata();
    const sourceCode = judgingDetail.sourceCode || pendingSubmission?.sourceCode || extractEditorCode();
    const language = judgingDetail.language || pendingSubmission?.language || extractLanguage();
    const problemSlug = judgingDetail.problemSlug || pendingSubmission?.problemSlug || meta.problemSlug;
    const submissionId = judgingDetail.submissionId || pendingSubmission?.submissionId || String(Date.now());
    const verdict = judgingDetail.verdict || "Submitted";
    const runtime = judgingDetail.runtime || "";
    const memory = judgingDetail.memory || "";
    const submittedAt = judgingDetail.timestamp || pendingSubmission?.submittedAt || new Date().toISOString();

    const payload = {
      submissionId,
      problemSlug,
      problemTitle: meta.title,
      questionFrontendId: meta.questionFrontendId,
      difficulty: meta.difficulty,
      topicTags: meta.topicTags || [],
      language,
      verdict,
      runtime,
      memory,
      sourceCode,
      submittedAt,
      problemDescription: meta.description,
      constraints: meta.constraints,
      diagnosticContext: judgingDetail.diagnosticContext || {},
      problemUrl: meta.url,
      sourceProvenance: "authorized_extension"
    };

    console.log("[DSAverse Auto-Sync] Dispatching submission to DSAverse:", {
      submissionId,
      problemSlug,
      verdict,
      codeLen: sourceCode.length
    });

    // Reset pending state
    pendingSubmission = null;

    // Dispatch to DSAverse auto-sync
    await dispatchAutoSync(payload);
  }

  // Dispatch payload to DSAverse with duplicate prevention and retry queue
  async function dispatchAutoSync(payload) {
    const key = payload.submissionId ? `sub:${payload.submissionId}` : `slug:${payload.problemSlug}:${payload.submittedAt}`;

    // Check duplicate in local extension storage
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      const data = await new Promise(resolve => {
        chrome.storage.local.get(["syncedSubmissions", "dsaServer"], resolve);
      });
      const synced = data?.syncedSubmissions || {};
      if (synced[key] && synced[key].status === "synced") {
        console.log("[DSAverse Auto-Sync] Submission already synced, skipping duplicate:", key);
        return;
      }
    }

    const defaultHost = "http://localhost:3000";
    try {
      const res = await fetch(`${defaultHost}/api/ai-code-mentor/submissions/auto-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        console.log("[DSAverse Auto-Sync] Auto-sync SUCCESS:", json);

        // Mark as synced locally
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get("syncedSubmissions", d => {
            const subs = d.syncedSubmissions || {};
            subs[key] = {
              status: "synced",
              syncedAt: new Date().toISOString(),
              submissionId: payload.submissionId,
              problemSlug: payload.problemSlug
            };
            chrome.storage.local.set({ syncedSubmissions: subs, lastSynced: payload });
          });
        }

        showSyncNotification(payload.problemTitle, payload.verdict, "synced");
        return;
      }
      console.warn("[DSAverse Auto-Sync] Auto-sync rejected with status:", res.status);
    } catch (netErr) {
      console.warn("[DSAverse Auto-Sync] Network error syncing to DSAverse:", netErr.message);
    }

    // If direct sync was unreached or errored, enqueue in background retry queue
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: "ENQUEUE_SUBMISSION", payload }, () => {
        showSyncNotification(payload.problemTitle, payload.verdict, "enqueued");
      });
    } else {
      enqueueRetry(payload);
    }
  }

  // Enqueue in storage retry queue
  function enqueueRetry(payload) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get("syncQueue", data => {
        const queue = data.syncQueue || [];
        const exists = queue.some(item => item.submissionId === payload.submissionId);
        if (!exists) {
          queue.push({
            submissionId: payload.submissionId,
            problemSlug: payload.problemSlug,
            payload,
            attempts: 0,
            enqueuedAt: new Date().toISOString()
          });
          chrome.storage.local.set({ syncQueue: queue }, () => {
            console.log("[DSAverse Auto-Sync] Enqueued submission for background retry.");
            showSyncNotification(payload.problemTitle, payload.verdict, "enqueued");
          });
        }
      });
    }
  }

  // Show unobtrusive in-page sync notification
  function showSyncNotification(title, verdict, status) {
    const existing = document.getElementById("dsaverse-sync-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "dsaverse-sync-toast";
    toast.style.position = "fixed";
    toast.style.bottom = "24px";
    toast.style.right = "24px";
    toast.style.zIndex = "999999";
    toast.style.background = "#0f172a";
    toast.style.border = "1px solid #38bdf8";
    toast.style.borderRadius = "8px";
    toast.style.padding = "12px 16px";
    toast.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
    toast.style.color = "#f8fafc";
    toast.style.fontFamily = "system-ui, -apple-system, sans-serif";
    toast.style.fontSize = "13px";
    toast.style.display = "flex";
    toast.style.alignItems = "center";
    toast.style.gap = "10px";
    toast.style.transition = "opacity 0.3s ease";

    const isSuccess = status === "synced";
    const icon = isSuccess ? "⚡" : "⏳";
    const statusText = isSuccess ? "Synced to DSAverse" : "Enqueued for Sync";
    const verdictColor = verdict === "Accepted" ? "#34d399" : "#f87171";

    toast.innerHTML = `
      <span style="font-size: 18px;">${icon}</span>
      <div>
        <div style="font-weight: 600; color: #38bdf8;">${statusText}</div>
        <div style="font-size: 11px; color: #94a3b8;">${title} · <span style="color: ${verdictColor}; font-weight: 600;">${verdict}</span></div>
      </div>
    `;

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Also support manual extract message for popup
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
      if (request.action === "EXTRACT_SUBMISSION") {
        const meta = extractProblemMetadata();
        const sourceCode = extractEditorCode();
        const language = extractLanguage();
        sendResponse({
          success: true,
          data: {
            ...meta,
            sourceCode,
            language,
            verdict: "Accepted",
            submissionId: pendingSubmission?.submissionId || ""
          }
        });
      }
      return true;
    });
  }
})();
