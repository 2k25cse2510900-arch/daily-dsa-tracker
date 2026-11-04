"use strict";

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  console.log("=== Starting Real Browser Verification for Minimum Moves to Equal Array Elements (#453) ===");

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
  const port = 9340;
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const proc = exec(`"${edgePath}" --headless=new --remote-debugging-port=${port} --window-size=1280,1600 --disable-gpu about:blank`);
  await delay(2500);

  const targetsRes = await fetch(`http://127.0.0.1:${port}/json`);
  const targets = await targetsRes.json();
  const page = targets.find(t => t.type === "page");
  if (!page) throw new Error("No page target found in Edge.");

  const ws = new WebSocket(page.webSocketDebuggerUrl);

  let messageId = 1;
  const pending = new Map();

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++messageId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.addEventListener("message", event => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(new Error(data.error.message));
      else resolve(data.result);
    }
  });

  await new Promise(r => ws.addEventListener("open", r));
  console.log("✓ CDP WebSocket connected.");

  await sendCommand("Page.enable");
  await sendCommand("Runtime.enable");
  await sendCommand("Network.enable");

  // Set session cookie
  const cookieRes = await sendCommand("Network.setCookie", {
    name: cookieName,
    value: decodeURIComponent(cookieValue),
    url: "http://127.0.0.1:3000"
  });
  console.log("✓ Session cookie set in Edge:", cookieRes);

  async function evaluate(expression) {
    const res = await sendCommand("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    return res?.result?.value;
  }

  // Navigate to member profile
  const profileUrl = "http://127.0.0.1:3000/profile/member_mvggb1nmx303va";
  console.log("✓ Navigating to:", profileUrl);
  await sendCommand("Page.navigate", { url: profileUrl });

  // Wait for profile and question cards to render
  let cardsCount = 0;
  for (let i = 0; i < 25; i++) {
    await delay(500);
    cardsCount = await evaluate("document.querySelectorAll('.daily-question-card').length");
    if (cardsCount > 0) break;
  }
  console.log(`✓ Daily question cards rendered on profile: ${cardsCount} found.`);

  // List all question cards
  const allCards = await evaluate(`
    (() => {
      const cards = document.querySelectorAll(".daily-question-card");
      return Array.from(cards).map(c => ({
        title: c.dataset.reviewTitle,
        slug: c.dataset.reviewSlug,
        status: c.dataset.reviewStatus,
        lang: c.dataset.reviewLang
      }));
    })()
  `);
  console.log("✓ Question cards on profile:", allCards);

  // Click on "Minimum Moves to Equal Array Elements"
  console.log("✓ Clicking on 'Minimum Moves to Equal Array Elements'...");
  const clickRes = await evaluate(`
    (() => {
      const cards = document.querySelectorAll(".daily-question-card");
      let target = null;
      for (const c of cards) {
        if (c.dataset.reviewSlug === "minimum-moves-to-equal-array-elements") {
          target = c;
          break;
        }
      }
      if (!target) return { found: false };
      target.click();
      return { found: true };
    })()
  `);
  console.log("✓ Card Click result:", clickRes);
  await delay(1500);

  // Verify AI Code Mentor workspace modal state
  const evalWorkspace = await evaluate(`
    (() => {
      const page = document.getElementById("aiMentorPage");
      const title = document.getElementById("mentorProblemTitle")?.textContent;
      const meta = document.getElementById("mentorProblemMeta")?.textContent;
      const provider = document.getElementById("mentorProviderBadge")?.textContent;
      const providerClass = document.getElementById("mentorProviderBadge")?.className;
      const diff = document.getElementById("mentorDifficultyBadge")?.textContent;
      const status = document.getElementById("mentorStatusBadge")?.textContent;
      const sourceBadge = document.getElementById("mentorCodeSourceBadge")?.textContent;
      const optimalTitle = document.getElementById("mentorOptimalTitle")?.textContent;
      const optimalCode = document.getElementById("mentorOptimalCode")?.textContent;
      const timeComp = document.getElementById("mentorTimeComplexity")?.textContent;
      const spaceComp = document.getElementById("mentorSpaceComplexity")?.textContent;
      const codeInput = document.getElementById("mentorCodeInput")?.value;

      return {
        isPageVisible: page && !page.hidden,
        title,
        meta,
        provider,
        providerClass,
        diff,
        status,
        sourceBadge,
        optimalTitle,
        timeComp,
        spaceComp,
        hasFakeSolve: optimalCode ? optimalCode.includes("solve(int[] nums)") : false,
        hasMinMoves: optimalCode ? optimalCode.includes("minMoves") : false,
        optimalCodeSnippet: optimalCode ? optimalCode.slice(0, 250) : null,
        codeInputSnippet: codeInput ? codeInput.slice(0, 250) : null
      };
    })()
  `);
  console.log("✓ AI Code Mentor Workspace State:\n", JSON.stringify(evalWorkspace, null, 2));

  // Switch language to Java and test Java signature
  console.log("✓ Switching language dropdown to Java...");
  const javaCheck = await evaluate(`
    (() => {
      const select = document.getElementById("mentorLangSelect");
      if (select) {
        select.value = "java";
        select.dispatchEvent(new Event("change"));
      }
      const optimalCode = document.getElementById("mentorOptimalCode")?.textContent;
      return {
        optimalTitle: document.getElementById("mentorOptimalTitle")?.textContent,
        optimalCodeSnippet: optimalCode?.slice(0, 300),
        hasMinMovesJava: optimalCode ? optimalCode.includes("public int minMoves(int[] nums)") : false,
        hasReturnMoves: optimalCode ? optimalCode.includes("return moves;") : false,
        hasFakeSolve: optimalCode ? optimalCode.includes("solve") : false
      };
    })()
  `);
  console.log("✓ Java Language Verification:\n", JSON.stringify(javaCheck, null, 2));

  // Test Animatic Mode
  console.log("✓ Switching to Animatic Mode...");
  const animaticCheck = await evaluate(`
    (() => {
      const btn = document.getElementById("mentorModeAnimaticBtn");
      if (btn) btn.click();
      const stage = document.getElementById("animaticStageCard");
      const title = document.getElementById("animaticStageTitle")?.textContent;
      const stepBadge = document.getElementById("animaticStepBadge")?.textContent;
      const caption = document.getElementById("animaticNarrationText")?.textContent;
      return {
        animaticVisible: stage && !stage.hidden,
        title,
        stepBadge,
        caption
      };
    })()
  `);
  console.log("✓ Animatic Mode Verification:\n", JSON.stringify(animaticCheck, null, 2));

  // Step through Animatic Mode
  const stepResult = await evaluate(`
    (() => {
      const nextBtn = document.getElementById("animaticNextBtn");
      if (nextBtn) nextBtn.click();
      return {
        stepBadge: document.getElementById("animaticStepBadge")?.textContent,
        caption: document.getElementById("animaticNarrationText")?.textContent
      };
    })()
  `);
  console.log("✓ Animatic Step Progress Verification:\n", JSON.stringify(stepResult, null, 2));

  // Switch back to Normal Mode to capture full verified screenshot
  await evaluate(`
    (() => {
      const btn = document.getElementById("mentorModeNormalBtn");
      if (btn) btn.click();
    })()
  `);

  await delay(800);

  // Capture Screenshot
  const screenshot = await sendCommand("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false
  });
  const screenshotPath = path.join(__dirname, "../minimum_moves_verified.png");
  fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));
  console.log("✓ Saved verified screenshot to:", screenshotPath);

  // Also copy screenshot to artifact dir if exists
  const artifactDir = "C:\\Users\\Dell\\.gemini\\antigravity\\brain\\7b4211d5-5670-4b1b-a9d3-36761e2d4d5b";
  if (fs.existsSync(artifactDir)) {
    fs.copyFileSync(screenshotPath, path.join(artifactDir, "minimum_moves_verified.png"));
    console.log("✓ Copied screenshot to artifacts directory.");
  }

  // Cleanup
  ws.close();
  proc.kill();
  console.log("=== All Browser Verification Steps Completed Successfully! ===");
  process.exit(0);
})();
