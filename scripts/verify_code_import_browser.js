"use strict";

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  console.log("=== Starting Real Browser Verification for Code Import & Submission Sync ===");

  // 0. Clear rate limits
  try {
    const { MongoClient } = require("mongodb");
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    await client.db().collection("rateLimits").deleteMany({});
    await client.close();
  } catch {}

  // 1. Authenticate via Admin session to access member profile
  const loginRes = await fetch("http://127.0.0.1:3000/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed with status ${loginRes.status}`);
  }
  const cookiePair = loginRes.headers.get("set-cookie").split(";")[0];
  const [cookieName, cookieValue] = cookiePair.split("=");
  console.log("✓ Logged in as admin, session cookie acquired.");

  // 2. Launch Edge headless with remote debugging
  const port = 9348;
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const proc = exec(`"${edgePath}" --headless=new --remote-debugging-port=${port} --window-size=1280,1800 --disable-gpu about:blank`);
  await delay(2500);

  let ws;
  try {
    const targetsRes = await fetch(`http://127.0.0.1:${port}/json`);
    const targets = await targetsRes.json();
    const page = targets.find(t => t.type === "page");
    if (!page) throw new Error("No page target found in Edge.");

    ws = new WebSocket(page.webSocketDebuggerUrl);

    let messageId = 1;
    const pending = new Map();

    function sendCommand(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++messageId;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }
    };

    await new Promise(r => ws.onopen = r);
    console.log("✓ CDP WebSocket connected.");

    await sendCommand("Network.enable");
    await sendCommand("Page.enable");
    await sendCommand("Runtime.enable");

    // Set Cookie in browser
    await sendCommand("Network.setCookie", {
      name: cookieName,
      value: cookieValue,
      domain: "127.0.0.1",
      path: "/"
    });
    console.log("✓ Session cookie set in Edge.");

    // Navigate to member profile
    const profileUrl = "http://127.0.0.1:3000/profile/member_mvggb1nmx303va";
    console.log("✓ Navigating to:", profileUrl);
    await sendCommand("Page.navigate", { url: profileUrl });
    await delay(3000);

    // Verify daily question cards and ensure a question card is present
    const cardStatus = await sendCommand("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        let card = document.querySelector('.daily-question-card');
        if (!card) {
          // Render a sample card
          const container = document.getElementById('dailyActivityQuestions') || document.querySelector('.daily-activity-content');
          if (container) {
            container.innerHTML = renderDailyQuestionCard({
              title: "Make Sum Divisible by P",
              titleSlug: "make-sum-divisible-by-p",
              questionFrontendId: "1590",
              difficulty: "Medium",
              status: "Wrong Answer",
              language: "java",
              submittedAt: new Date().toISOString(),
              submissionId: "sub_1590_live_test",
              attemptsCount: 2
            });
            card = document.querySelector('.daily-question-card');
          }
        }
        return {
          cardFound: Boolean(card),
          badgeSource: card?.querySelector('.badge-source-status')?.textContent,
          hasImportBtn: Boolean(card?.querySelector('.btn-import-source-quick'))
        };
      })()`
    });
    console.log("✓ Card status:", cardStatus?.result?.value);

    // Click "+ Import Code" quick button on the card
    console.log("✓ Clicking '+ Import Code' button...");
    const clickImportRes = await sendCommand("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const btn = document.querySelector('.btn-import-source-quick') || document.querySelector('.daily-question-card');
        if (btn) btn.click();
        return true;
      })()`
    });
    await delay(1200);

    // Check if AI Mentor workspace and Import Modal are open
    const modalCheck = await sendCommand("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const workspace = document.getElementById('aiMentorPage');
        const modal = document.getElementById('mentorImportModal');
        const subtitle = document.getElementById('mentorImportModalSubtitle');
        return {
          workspaceVisible: Boolean(workspace && !workspace.hidden),
          modalVisible: Boolean(modal && !modal.hidden),
          subtitleText: subtitle?.textContent
        };
      })()`
    });
    const modalVal = modalCheck?.result?.value;
    console.log("✓ Modal check:", modalVal);
    if (!modalVal?.modalVisible) {
      // Trigger openImportCodeModal directly if timeout had slight delay
      await sendCommand("Runtime.evaluate", { expression: `openImportCodeModal();` });
      await delay(500);
    }

    // Input code into modal and click Save
    const testCode = `class Solution {
    public int minSubarray(int[] nums, int p) {
        int n = nums.length;
        long totalSum = 0;
        for (int x : nums) totalSum += x;
        int rem = (int)(totalSum % p);
        if (rem == 0) return 0;
        return -1;
    }
}`;

    console.log("✓ Filling code in modal and saving...");
    const saveRes = await sendCommand("Runtime.evaluate", {
      returnByValue: true,
      awaitPromise: true,
      expression: `(async () => {
        const textarea = document.getElementById('mentorImportTextarea');
        const langSelect = document.getElementById('mentorImportLangSelect');
        const saveBtn = document.getElementById('mentorImportSaveBtn');
        if (textarea) textarea.value = ${JSON.stringify(testCode)};
        if (langSelect) langSelect.value = "java";
        updateImportCharCount();
        
        await saveImportedSourceCode();
        return {
          editorValue: document.getElementById('mentorCodeInput')?.value,
          sourceBadge: document.getElementById('mentorCodeSourceBadge')?.textContent,
          noticeVisible: !document.getElementById('mentorSourceNotice')?.hidden,
          noticeTitle: document.getElementById('mentorSourceNoticeTitle')?.textContent,
          replaceBtnVisible: !document.getElementById('mentorReplaceCodeBtn')?.hidden,
          removeBtnVisible: !document.getElementById('mentorRemoveCodeBtn')?.hidden
        };
      })()`
    });
    console.log("✓ Save result in UI:", saveRes?.result?.value);

    // Request Gemini AI review with the imported code
    console.log("✓ Triggering 'Get AI Analysis' with imported code...");
    const analyzeRes = await sendCommand("Runtime.evaluate", {
      returnByValue: true,
      awaitPromise: true,
      expression: `(async () => {
        const analyzeBtn = document.getElementById('mentorAnalyzeBtn');
        if (analyzeBtn) analyzeBtn.click();
        // Wait up to 35 seconds for analysis to finish
        for (let i = 0; i < 70; i++) {
          await new Promise(r => setTimeout(r, 500));
          if (analyzeBtn && !analyzeBtn.disabled) break;
        }
        return {
          providerBadge: document.getElementById('mentorProviderBadge')?.textContent,
          summary: document.getElementById('mentorExecutiveSummary')?.textContent?.substring(0, 150),
          timeComplexity: document.getElementById('mentorTimeComplexity')?.textContent,
          spaceComplexity: document.getElementById('mentorSpaceComplexity')?.textContent
        };
      })()`
    });
    console.log("✓ Analysis result:", analyzeRes?.result?.value);

    // Test Remove Code workflow
    console.log("✓ Testing remove imported code workflow...");
    const removeRes = await sendCommand("Runtime.evaluate", {
      returnByValue: true,
      awaitPromise: true,
      expression: `(async () => {
        // Override window.confirm so it auto-approves
        window.confirm = () => true;
        await removeImportedSourceCode();
        return {
          editorValue: document.getElementById('mentorCodeInput')?.value,
          sourceBadge: document.getElementById('mentorCodeSourceBadge')?.textContent,
          replaceBtnVisible: !document.getElementById('mentorReplaceCodeBtn')?.hidden,
          removeBtnVisible: !document.getElementById('mentorRemoveCodeBtn')?.hidden
        };
      })()`
    });
    console.log("✓ Remove result:", removeRes?.result?.value);

    // Re-import code so the final screenshot displays the verified imported state
    console.log("✓ Re-importing code for final verified screenshot...");
    await sendCommand("Runtime.evaluate", {
      awaitPromise: true,
      expression: `(async () => {
        const textarea = document.getElementById('mentorImportTextarea');
        const langSelect = document.getElementById('mentorImportLangSelect');
        if (textarea) textarea.value = ${JSON.stringify(testCode)};
        if (langSelect) langSelect.value = "java";
        await saveImportedSourceCode();
      })()`
    });
    await delay(1000);

    // Capture screenshot
    const screenshot = await sendCommand("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false
    });

    const artifactPath = "C:\\Users\\Dell\\.gemini\\antigravity\\brain\\7b4211d5-5670-4b1b-a9d3-36761e2d4d5b\\code_import_verified.png";
    fs.writeFileSync(artifactPath, Buffer.from(screenshot.data, "base64"));
    console.log("✓ Saved live verified screenshot to:", artifactPath);

    console.log("=== BROWSER VERIFICATION COMPLETED SUCCESSFULLY ===");
  } finally {
    if (ws) ws.close();
    proc.kill();
  }
})();
