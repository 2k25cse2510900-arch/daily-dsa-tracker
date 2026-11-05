// DSAverse LeetCode Auto-Sync - Main World Hook
// Runs in the page's execution context to observe user-initiated submissions and judging results
// Strictly passive listener: does not touch credentials, cookies, or authenticate to LeetCode
(() => {
  "use strict";

  if (window.__dsaverse_hook_installed) return;
  window.__dsaverse_hook_installed = true;

  console.log("[DSAverse Auto-Sync] Page hook initialized.");

  // Track active submission state
  let currentSubmission = null;

  // Helper to post message to content script
  function dispatchToContent(type, detail) {
    try {
      window.postMessage({ source: "dsaverse_extension_hook", type, detail }, "*");
    } catch (e) {
      console.warn("[DSAverse Auto-Sync] postMessage error:", e);
    }
  }

  // Intercept window.fetch to observe submissions and check polling
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
    const options = args[1] || {};

    // 1. Detect Submit Request: /problems/[slug]/submit/
    if (url.includes("/submit/") && options.method === "POST") {
      try {
        let bodyData = null;
        if (typeof options.body === "string") {
          bodyData = JSON.parse(options.body);
        }

        const pathParts = window.location.pathname.split("/").filter(Boolean);
        const problemSlug = pathParts[1] || "";

        // Extract code from submit body
        const sourceCode = bodyData?.typed_code || "";
        const language = bodyData?.lang || "";
        const questionId = bodyData?.question_id || "";

        currentSubmission = {
          problemSlug,
          questionId,
          language,
          sourceCode,
          submittedAt: new Date().toISOString(),
          state: "SUBMITTED"
        };

        dispatchToContent("SUBMISSION_INITIATED", currentSubmission);
      } catch (err) {
        console.warn("[DSAverse Auto-Sync] Failed to inspect submit request:", err);
      }
    }

    // Call the original fetch
    const response = await originalFetch.apply(this, args);

    try {
      // 2. Detect Submit Response: returns { submission_id }
      if (url.includes("/submit/") && options.method === "POST" && response.ok) {
        const cloned = response.clone();
        cloned.json().then(data => {
          if (data && data.submission_id && currentSubmission) {
            currentSubmission.submissionId = String(data.submission_id);
            dispatchToContent("SUBMISSION_ID_ASSIGNED", {
              submissionId: currentSubmission.submissionId,
              problemSlug: currentSubmission.problemSlug
            });
          }
        }).catch(() => {});
      }

      // 3. Detect Check Response: /submissions/detail/[id]/check/
      if (url.includes("/check/") && response.ok) {
        const cloned = response.clone();
        cloned.json().then(data => {
          if (!data) return;

          // Check if judging finished
          if (data.state === "SUCCESS") {
            const verdict = data.status_display || "Submitted";
            const runtime = data.status_runtime || data.runtime || "";
            const memory = data.status_memory || data.memory || "";
            const submissionId = String(data.submission_id || currentSubmission?.submissionId || "");
            const lang = data.lang || currentSubmission?.language || "";

            const completedPayload = {
              submissionId,
              problemSlug: currentSubmission?.problemSlug || window.location.pathname.split("/").filter(Boolean)[1] || "",
              verdict,
              runtime,
              memory,
              language: lang,
              sourceCode: currentSubmission?.sourceCode || null,
              totalCorrect: data.total_correct,
              totalTestcases: data.total_testcases,
              compareResult: data.compare_result,
              timestamp: new Date().toISOString()
            };

            dispatchToContent("SUBMISSION_COMPLETED", completedPayload);
            currentSubmission = null;
          }
        }).catch(() => {});
      }
    } catch (err) {
      console.warn("[DSAverse Auto-Sync] Response inspection error:", err);
    }

    return response;
  };

  // Also support reading from Monaco Editor in main world if needed
  window.__dsaverse_get_editor_code = function() {
    try {
      if (window.monaco && window.monaco.editor) {
        const models = window.monaco.editor.getModels();
        if (models && models.length > 0) {
          return models[0].getValue();
        }
      }
    } catch {}
    return null;
  };
})();
