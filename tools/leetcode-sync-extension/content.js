// DSAverse LeetCode Sync - Content Script
// Extracts submitted code on user demand without storing any user credentials or scraping session cookies.
(() => {
  "use strict";

  function extractSubmissionData() {
    const url = window.location.href;
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const problemSlug = pathParts[1] || "";
    const isSubmissionsPage = pathParts.includes("submissions");
    let submissionId = "";
    if (isSubmissionsPage) {
      const subIdx = pathParts.indexOf("submissions");
      submissionId = pathParts[subIdx + 1] || "";
    }

    // Attempt to extract source code from Monaco editor or pre/code blocks
    let sourceCode = "";
    const codeContainers = [
      document.querySelector(".view-lines"),
      document.querySelector("pre code"),
      document.querySelector("div[data-mode-id]"),
      document.querySelector(".monaco-editor")
    ];

    for (const container of codeContainers) {
      if (container && container.innerText && container.innerText.trim()) {
        sourceCode = container.innerText;
        break;
      }
    }

    // Detect language
    let language = "python3";
    const langBadge = document.querySelector("[data-cy='lang-select']") || 
                      document.querySelector(".ant-select-selection-item") ||
                      document.querySelector("button[id^='headlessui-listbox-button']");
    if (langBadge && langBadge.innerText) {
      const txt = langBadge.innerText.toLowerCase();
      if (txt.includes("python")) language = "python3";
      else if (txt.includes("java") && !txt.includes("script")) language = "java";
      else if (txt.includes("c++") || txt.includes("cpp")) language = "cpp";
      else if (txt.includes("javascript")) language = "javascript";
      else if (txt.includes("typescript")) language = "typescript";
      else if (txt.includes("go")) language = "go";
      else if (txt.includes("rust")) language = "rust";
    }

    // Detect verdict
    let verdict = "Accepted";
    const statusEl = document.querySelector("[data-e2e-locator='submission-result']") ||
                     document.querySelector(".text-green-s") ||
                     document.querySelector(".text-red-s") ||
                     document.querySelector("[class*='status-']");
    if (statusEl && statusEl.innerText) {
      const vText = statusEl.innerText.trim();
      if (/wrong\s*answer/i.test(vText)) verdict = "Wrong Answer";
      else if (/time\s*limit/i.test(vText) || /tle/i.test(vText)) verdict = "Time Limit Exceeded";
      else if (/runtime\s*error/i.test(vText)) verdict = "Runtime Error";
      else if (/compil/i.test(vText)) verdict = "Compilation Error";
      else if (/accepted/i.test(vText)) verdict = "Accepted";
    }

    return {
      problemSlug,
      submissionId,
      language,
      verdict,
      sourceCode: sourceCode.trim(),
      url,
      timestamp: new Date().toISOString()
    };
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === "EXTRACT_SUBMISSION") {
      const data = extractSubmissionData();
      sendResponse({ success: true, data });
    }
    return true;
  });
})();
