const fs = require("fs");

let content = fs.readFileSync("script.js", "utf8");

// Helper functions for import code modal and submission management
const helperCode = `
function updateImportCharCount() {
  const textarea = $("mentorImportTextarea");
  const counter = $("mentorImportCharCount");
  if (!textarea || !counter) return;
  const val = textarea.value || "";
  const lines = val ? val.split("\\n").length : 0;
  const chars = val.length;
  counter.textContent = \`\${lines} \${lines === 1 ? 'line' : 'lines'} · \${chars} \${chars === 1 ? 'char' : 'chars'}\`;
}

function openImportCodeModal(initialCode = null) {
  const modal = $("mentorImportModal");
  if (!modal) return;
  const textarea = $("mentorImportTextarea");
  const langSelect = $("mentorImportLangSelect");
  const subtitle = $("mentorImportModalSubtitle");

  const currentLang = $("mentorLangSelect")?.value || currentMentorProblem?.language || "python3";
  if (langSelect) langSelect.value = currentLang;

  const codeToSet = initialCode !== null 
    ? initialCode 
    : ($("mentorCodeInput")?.value || "");
  if (textarea) textarea.value = codeToSet;

  if (subtitle && currentMentorProblem) {
    const subNum = currentMentorProblem.submissionId ? \` (Submission #\${currentMentorProblem.submissionId})\` : '';
    subtitle.textContent = \`Associate your submitted code with \${currentMentorProblem.title || "this problem"}\${subNum}.\`;
  }
  updateImportCharCount();
  modal.hidden = false;
  if (textarea) textarea.focus();
}

function closeImportCodeModal() {
  const modal = $("mentorImportModal");
  if (modal) modal.hidden = true;
}

function detectLanguageFromFileName(filename) {
  const ext = (filename || "").split(".").pop().toLowerCase();
  switch (ext) {
    case "java": return "java";
    case "py": return "python3";
    case "cpp": case "cc": case "cxx": case "h": case "hpp": return "cpp";
    case "js": case "mjs": case "cjs": return "javascript";
    case "ts": return "typescript";
    case "go": return "go";
    case "rs": return "rust";
    default: return null;
  }
}

function updateCardBadgeForProblem(submissionId, slug, available) {
  const cards = document.querySelectorAll(".daily-question-card");
  cards.forEach(card => {
    const cardSubId = card.dataset.submissionId;
    const cardSlug = card.dataset.reviewSlug;
    if ((submissionId && cardSubId === String(submissionId)) || (slug && cardSlug === slug)) {
      const badge = card.querySelector(".badge-source-status");
      if (badge) {
        if (available) {
          badge.textContent = "✓ Code Available";
          badge.className = "badge-source-status source-available";
        } else {
          badge.textContent = "Code Not Imported";
          badge.className = "badge-source-status source-missing";
        }
      }
    }
  });
}

async function saveImportedSourceCode() {
  const textarea = $("mentorImportTextarea");
  const langSelect = $("mentorImportLangSelect");
  const saveBtn = $("mentorImportSaveBtn");
  const text = textarea?.value?.trim() || "";
  const selectedLang = langSelect?.value || $("mentorLangSelect")?.value || "python3";

  if (!text) {
    showToast("Please enter or paste your code before saving.", "warning");
    return;
  }

  const origBtnText = saveBtn ? saveBtn.innerHTML : "";
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = "Saving…";
  }

  try {
    const payload = {
      sourceCode: text,
      language: selectedLang,
      problemSlug: currentMentorProblem?.slug || null,
      problemTitle: currentMentorProblem?.title || $("mentorProblemTitle")?.textContent || null,
      submissionId: currentMentorProblem?.submissionId || null,
      sourceProvenance: "manual_import"
    };

    const resp = await apiRequest("/api/ai-code-mentor/source", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (resp && resp.saved) {
      // 1. Update Code Editor
      const codeInput = $("mentorCodeInput");
      if (codeInput) codeInput.value = text;
      updateMentorLineNumbers();

      // 2. Update Language
      const mentorLangSelect = $("mentorLangSelect");
      if (mentorLangSelect && mentorLangSelect.value !== selectedLang) {
        mentorLangSelect.value = selectedLang;
        const langBadge = $("mentorLangBadge");
        if (langBadge) langBadge.textContent = formatLang(selectedLang);
      }

      // 3. Update Badges & Notice
      const sourceBadge = $("mentorCodeSourceBadge");
      if (sourceBadge) sourceBadge.textContent = "Source: Manually Imported";

      const sourceNotice = $("mentorSourceNotice");
      const noticeTitle = $("mentorSourceNoticeTitle");
      const noticeBody = $("mentorSourceNoticeBody");
      const replaceBtn = $("mentorReplaceCodeBtn");
      const removeBtn = $("mentorRemoveCodeBtn");
      const noticeImportBtn = $("mentorNoticeImportBtn");

      if (sourceNotice) {
        sourceNotice.hidden = false;
        if (noticeTitle) noticeTitle.textContent = "Submitted Code Loaded";
        if (noticeBody) {
          const subPrefix = currentMentorProblem?.submissionId ? '#' + currentMentorProblem.submissionId + ' · ' : '';
          noticeBody.textContent = \`Imported code loaded for this submission (\${subPrefix}\${formatLang(selectedLang)}). You can edit the code above before analyzing.\`;
        }
        if (replaceBtn) replaceBtn.hidden = false;
        if (removeBtn) removeBtn.hidden = false;
        if (noticeImportBtn) noticeImportBtn.hidden = true;
      }

      // 4. Update localStorage backup
      const storageKey = currentMentorProblem?.submissionId
        ? \`dsaverse_mentor_code_sub_\${currentMentorProblem.submissionId}\`
        : \`dsaverse_mentor_code_\${currentMentorProblem?.slug || currentMentorProblem?.title}\`;
      localStorage.setItem(storageKey, text);

      // 5. Update Daily Question Card badge on profile page if present
      updateCardBadgeForProblem(currentMentorProblem?.submissionId, currentMentorProblem?.slug, true);

      closeImportCodeModal();
      showToast("Code imported and linked to this submission!", "success");
    } else {
      showToast("Failed to save imported code.", "error");
    }
  } catch (err) {
    console.error("Error saving imported code:", err);
    showToast(err.message || "Failed to save imported code.", "error");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = origBtnText;
    }
  }
}

async function removeImportedSourceCode() {
  if (!confirm("Are you sure you want to remove the imported code for this submission?")) {
    return;
  }
  const removeBtn = $("mentorRemoveCodeBtn");
  if (removeBtn) removeBtn.disabled = true;

  try {
    await apiRequest("/api/ai-code-mentor/source", {
      method: "DELETE",
      body: JSON.stringify({
        submissionId: currentMentorProblem?.submissionId || null,
        problemSlug: currentMentorProblem?.slug || null
      })
    });

    // Clear code input
    const codeInput = $("mentorCodeInput");
    if (codeInput) codeInput.value = "";
    updateMentorLineNumbers();

    // Clear localStorage
    const storageKey = currentMentorProblem?.submissionId
      ? \`dsaverse_mentor_code_sub_\${currentMentorProblem.submissionId}\`
      : \`dsaverse_mentor_code_\${currentMentorProblem?.slug || currentMentorProblem?.title}\`;
    localStorage.removeItem(storageKey);

    // Update badges & notice
    const sourceBadge = $("mentorCodeSourceBadge");
    if (sourceBadge) sourceBadge.textContent = "Source: Original Code Unavailable";

    const sourceNotice = $("mentorSourceNotice");
    const noticeTitle = $("mentorSourceNoticeTitle");
    const noticeBody = $("mentorSourceNoticeBody");
    const replaceBtn = $("mentorReplaceCodeBtn");
    const removeBtnEl = $("mentorRemoveCodeBtn");
    const noticeImportBtn = $("mentorNoticeImportBtn");

    if (sourceNotice) {
      sourceNotice.hidden = false;
      if (noticeTitle) noticeTitle.textContent = "Submitted Code Notice";
      if (noticeBody) {
        noticeBody.textContent = "Original LeetCode submission source is unavailable for this record. You can import your code or paste it directly into the editor.";
      }
      if (replaceBtn) replaceBtn.hidden = true;
      if (removeBtnEl) removeBtnEl.hidden = true;
      if (noticeImportBtn) noticeImportBtn.hidden = false;
    }

    // Update card badge on profile page
    updateCardBadgeForProblem(currentMentorProblem?.submissionId, currentMentorProblem?.slug, false);

    showToast("Imported code removed.");
  } catch (err) {
    console.error("Error removing imported code:", err);
    showToast("Failed to remove imported code.", "error");
  } finally {
    if (removeBtn) removeBtn.disabled = false;
  }
}
`;

// Insert helper functions before initializeAiCodeMentor()
content = content.replace("function initializeAiCodeMentor() {", helperCode + "\nfunction initializeAiCodeMentor() {");

// Update codeInput input listener inside initializeAiCodeMentor
const oldCodeInputHandler = `    codeInput.addEventListener("input", () => {
      const sourceBadge = $("mentorCodeSourceBadge");
      const sourceNotice = $("mentorSourceNotice");
      if (sourceBadge) sourceBadge.textContent = "Source: Manually Pasted";
      if (sourceNotice) sourceNotice.hidden = true;
      updateMentorLineNumbers();

      // Persist in localStorage and background save
      if (currentMentorProblem) {
        const storageKey = \`dsaverse_mentor_code_\${currentMentorProblem.slug || currentMentorProblem.title}\`;
        localStorage.setItem(storageKey, codeInput.value);
      }
    });`;

const newCodeInputHandler = `    codeInput.addEventListener("input", () => {
      const sourceBadge = $("mentorCodeSourceBadge");
      if (sourceBadge) sourceBadge.textContent = "Source: User Pasted";
      updateMentorLineNumbers();

      // Persist in localStorage and background save
      if (currentMentorProblem) {
        const storageKey = currentMentorProblem.submissionId
          ? \`dsaverse_mentor_code_sub_\${currentMentorProblem.submissionId}\`
          : \`dsaverse_mentor_code_\${currentMentorProblem.slug || currentMentorProblem.title}\`;
        localStorage.setItem(storageKey, codeInput.value);
      }
    });`;

content = content.replace(oldCodeInputHandler, newCodeInputHandler);

// Add Import Modal event wiring inside initializeAiCodeMentor
const modalWiring = `
  // Import Modal & Source Action Handlers
  const importCodeBtn = $("mentorImportCodeBtn");
  if (importCodeBtn && !importCodeBtn.dataset.bound) {
    importCodeBtn.dataset.bound = "true";
    importCodeBtn.addEventListener("click", () => openImportCodeModal());
  }

  const noticeImportBtn = $("mentorNoticeImportBtn");
  if (noticeImportBtn && !noticeImportBtn.dataset.bound) {
    noticeImportBtn.dataset.bound = "true";
    noticeImportBtn.addEventListener("click", () => openImportCodeModal());
  }

  const replaceCodeBtn = $("mentorReplaceCodeBtn");
  if (replaceCodeBtn && !replaceCodeBtn.dataset.bound) {
    replaceCodeBtn.dataset.bound = "true";
    replaceCodeBtn.addEventListener("click", () => openImportCodeModal());
  }

  const removeCodeBtn = $("mentorRemoveCodeBtn");
  if (removeCodeBtn && !removeCodeBtn.dataset.bound) {
    removeCodeBtn.dataset.bound = "true";
    removeCodeBtn.addEventListener("click", removeImportedSourceCode);
  }

  const importModalClose = $("mentorImportModalClose");
  if (importModalClose && !importModalClose.dataset.bound) {
    importModalClose.dataset.bound = "true";
    importModalClose.addEventListener("click", closeImportCodeModal);
  }

  const importCancelBtn = $("mentorImportCancelBtn");
  if (importCancelBtn && !importCancelBtn.dataset.bound) {
    importCancelBtn.dataset.bound = "true";
    importCancelBtn.addEventListener("click", closeImportCodeModal);
  }

  const importModalOverlay = $("mentorImportModal");
  if (importModalOverlay && !importModalOverlay.dataset.boundBackdrop) {
    importModalOverlay.dataset.boundBackdrop = "true";
    importModalOverlay.addEventListener("click", event => {
      if (event.target === importModalOverlay) closeImportCodeModal();
    });
  }

  const importTextarea = $("mentorImportTextarea");
  if (importTextarea && !importTextarea.dataset.bound) {
    importTextarea.dataset.bound = "true";
    importTextarea.addEventListener("input", updateImportCharCount);
  }

  const importSaveBtn = $("mentorImportSaveBtn");
  if (importSaveBtn && !importSaveBtn.dataset.bound) {
    importSaveBtn.dataset.bound = "true";
    importSaveBtn.addEventListener("click", saveImportedSourceCode);
  }

  const pasteClipboardBtn = $("mentorImportPasteClipboardBtn");
  if (pasteClipboardBtn && !pasteClipboardBtn.dataset.bound) {
    pasteClipboardBtn.dataset.bound = "true";
    pasteClipboardBtn.addEventListener("click", async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && importTextarea) {
          importTextarea.value = text;
          updateImportCharCount();
          showToast("Pasted code from clipboard.");
        } else {
          showToast("Clipboard is empty or clipboard permission was denied.", "warning");
        }
      } catch (err) {
        showToast("Could not access clipboard. Please paste directly using Ctrl+V.", "warning");
      }
    });
  }

  const fileInput = $("mentorImportFileInput");
  if (fileInput && !fileInput.dataset.bound) {
    fileInput.dataset.bound = "true";
    fileInput.addEventListener("change", event => {
      const file = event.target.files?.[0];
      if (!file) return;
      const detectedLang = detectLanguageFromFileName(file.name);
      if (detectedLang) {
        const modalLang = $("mentorImportLangSelect");
        if (modalLang) modalLang.value = detectedLang;
      }
      const reader = new FileReader();
      reader.onload = e => {
        if (importTextarea) {
          importTextarea.value = e.target.result;
          updateImportCharCount();
          showToast(\`Loaded \${file.name}\`);
        }
      };
      reader.onerror = () => showToast("Failed to read file.", "error");
      reader.readAsText(file);
    });
  }
`;

content = content.replace("// 4. Copy code buttons", modalWiring + "\n  // 4. Copy code buttons");

// Update mentorAnalyzeBtn payload to include submissionId
content = content.replace(
  `        verdict: currentMentorProblem?.status || (currentMentorBuggyState ? "Wrong Answer" : "Accepted"),`,
  `        submissionId: currentMentorProblem?.submissionId || null,\n        verdict: currentMentorProblem?.status || (currentMentorBuggyState ? "Wrong Answer" : "Accepted"),`
);

// Update Section 12 delegation to support .btn-import-source-quick
const oldDelegation = `  // 12. Global Delegation for .daily-question-card and .btn-review-mentor
  if (!document.body.dataset.mentorDelegationBound) {
    document.body.dataset.mentorDelegationBound = "true";
    document.body.addEventListener("click", event => {
      if (event.target.closest("a.question-leetcode-link")) return;
      const card = event.target.closest(".daily-question-card");
      const btn = event.target.closest(".btn-review-mentor");
      if (!card && !btn) return;
      const targetEl = btn || card;
      event.preventDefault();
      openAiCodeMentorWorkspace({
        slug: targetEl.dataset.reviewSlug || "",
        title: targetEl.dataset.reviewTitle || "LeetCode Problem",
        difficulty: targetEl.dataset.reviewDiff || "Medium",
        status: targetEl.dataset.reviewStatus || "Accepted",
        language: targetEl.dataset.reviewLang || "python3",
        url: targetEl.dataset.reviewUrl || "",
        attemptsCount: Number(targetEl.dataset.reviewAttempts) || 1,
        frontendId: targetEl.dataset.frontendId || ""
      });
    });
  }`;

const newDelegation = `  // 12. Global Delegation for .daily-question-card, .btn-review-mentor, and .btn-import-source-quick
  if (!document.body.dataset.mentorDelegationBound) {
    document.body.dataset.mentorDelegationBound = "true";
    document.body.addEventListener("click", event => {
      if (event.target.closest("a.question-leetcode-link")) return;
      const importQuickBtn = event.target.closest(".btn-import-source-quick");
      const card = event.target.closest(".daily-question-card");
      const btn = event.target.closest(".btn-review-mentor");
      if (!card && !btn && !importQuickBtn) return;
      const targetEl = importQuickBtn || btn || card;
      event.preventDefault();
      openAiCodeMentorWorkspace({
        slug: targetEl.dataset.reviewSlug || card?.dataset.reviewSlug || "",
        title: targetEl.dataset.reviewTitle || card?.dataset.reviewTitle || "LeetCode Problem",
        difficulty: targetEl.dataset.reviewDiff || card?.dataset.reviewDiff || "Medium",
        status: targetEl.dataset.reviewStatus || card?.dataset.reviewStatus || "Accepted",
        language: targetEl.dataset.reviewLang || card?.dataset.reviewLang || "python3",
        url: targetEl.dataset.reviewUrl || card?.dataset.reviewUrl || "",
        attemptsCount: Number(targetEl.dataset.reviewAttempts || card?.dataset.reviewAttempts) || 1,
        frontendId: targetEl.dataset.frontendId || card?.dataset.frontendId || "",
        submissionId: targetEl.dataset.submissionId || card?.dataset.submissionId || null
      });
      if (importQuickBtn) {
        setTimeout(() => openImportCodeModal(), 120);
      }
    });
  }`;

content = content.replace(oldDelegation, newDelegation);

fs.writeFileSync("script.js", content, "utf8");
console.log("Successfully patched script.js!");
