"use strict";

const { exec } = require("child_process");
const fs = require("fs");
require("dotenv").config();

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBrowserVerification() {
  console.log("=== Starting AI Code Mentor Real Browser Verification ===");

  // 1. Authenticate via Admin session
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

  // 2. Launch Edge to about:blank
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const proc = exec(`"${edgePath}" --headless=new --remote-debugging-port=9311 --window-size=1280,1600 --disable-gpu about:blank`);
  await delay(2500);

  const targetsRes = await fetch("http://127.0.0.1:9311/json");
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

  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  console.log("✓ Connected to Edge via Chrome DevTools Protocol.");

  // Enable Network and Runtime domains
  await sendCommand("Network.enable");
  await sendCommand("Page.enable");
  await sendCommand("Runtime.enable");

  // Set auth cookie BEFORE navigating to site
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

  // Navigate to member profile route with valid session cookie
  console.log("Navigating to member profile with authenticated cookie...");
  await sendCommand("Page.navigate", { url: "http://127.0.0.1:3000/profile/member_mvggb1nmx303va" });

  // Wait for profile and question cards to render
  let cardsCount = 0;
  for (let i = 0; i < 25; i++) {
    await delay(500);
    cardsCount = await evaluate("document.querySelectorAll('.daily-question-card').length");
    if (cardsCount > 0) break;
  }
  console.log(`✓ Daily question cards rendered on profile: ${cardsCount} found.`);
  if (cardsCount === 0) {
    const debug = await evaluate(`JSON.stringify({
      url: window.location.href,
      isAdmin,
      isMember,
      bodySnippet: document.body.innerText.substring(0, 200)
    })`);
    console.error("Debug info:", debug);
    throw new Error("No daily question cards rendered on profile!");
  }

  // Verify daily question card details
  const firstCard = await evaluate(`
    (() => {
      const card = document.querySelector('.daily-question-card');
      return {
        title: card?.querySelector('.question-name')?.textContent?.trim(),
        lang: card?.querySelector('.question-lang-tag')?.textContent?.trim(),
        status: card?.querySelector('.badge-status')?.textContent?.trim(),
        slug: card?.dataset?.reviewSlug,
        reviewLang: card?.dataset?.reviewLang
      };
    })()
  `);
  console.log("✓ First daily question card:", firstCard);

  // Click on the question card to open AI Code Mentor
  console.log("Clicking question card to open AI Code Mentor...");
  await evaluate(`document.querySelector('.daily-question-card').click();`);
  await delay(600);

  // Verify AI Code Mentor workspace visibility
  const mentorState = await evaluate(`
    (() => {
      const page = document.getElementById('aiMentorPage');
      const title = document.getElementById('mentorProblemTitle')?.textContent?.trim();
      const lang = document.getElementById('mentorLangSelect')?.value;
      const langBadge = document.getElementById('mentorLangBadge')?.textContent?.trim();
      const sourceBadge = document.getElementById('mentorCodeSourceBadge')?.textContent?.trim();
      const acceptedAlertHidden = document.getElementById('mentorAcceptedAlert')?.hidden;
      const mistakeAlertHidden = document.getElementById('mentorMistakeAlert')?.hidden;
      const sourceNoticeHidden = document.getElementById('mentorSourceNotice')?.hidden;
      const codeValue = document.getElementById('mentorCodeInput')?.value;

      return {
        pageVisible: page && !page.hidden,
        title,
        lang,
        langBadge,
        sourceBadge,
        acceptedAlertHidden,
        mistakeAlertHidden,
        sourceNoticeHidden,
        codeLength: codeValue?.length || 0,
        codeSnippet: codeValue?.substring(0, 60)
      };
    })()
  `);
  console.log("✓ AI Code Mentor workspace state:", mentorState);
  if (!mentorState.pageVisible) throw new Error("AI Code Mentor page did not become visible!");
  if (mentorState.lang !== "java") throw new Error(`Expected language java, got ${mentorState.lang}`);
  if (mentorState.acceptedAlertHidden === true) throw new Error("Expected Accepted alert to be visible for accepted submission!");
  if (mentorState.mistakeAlertHidden === false) throw new Error("Expected Mistake alert to be hidden for accepted submission!");

  // Test "Get AI Analysis" button
  console.log("Testing 'Get AI Analysis' button...");
  await evaluate(`document.getElementById('mentorAnalyzeBtn').click();`);
  await delay(1000);
  const analysisState = await evaluate(`
    (() => {
      const heading = document.getElementById('mentorAnalysisHeading')?.textContent?.trim();
      const body = document.getElementById('mentorAnalysisBody')?.textContent?.trim();
      const configNotice = document.getElementById('mentorAiConfigNotice')?.hidden;
      return { heading, bodySnippet: body?.substring(0, 100), configNoticeHidden: configNotice };
    })()
  `);
  console.log("✓ AI Analysis executed:", analysisState);

  // Test Learning Action Buttons
  console.log("Testing Learning Action Buttons...");

  // 1. Find My Mistake
  await evaluate(`document.querySelector('.mentor-action-chip[data-mentor-mode="mistake"]').click();`);
  await delay(300);
  const mistakeCheck = await evaluate(`
    (() => ({
      acceptedVisible: !document.getElementById('mentorAcceptedAlert')?.hidden,
      mistakeHidden: document.getElementById('mentorMistakeAlert')?.hidden,
      analysisHeading: document.getElementById('mentorAnalysisHeading')?.textContent?.trim()
    }))()
  `);
  console.log("✓ 'Find My Mistake' on Accepted submission:", mistakeCheck);
  if (!mistakeCheck.acceptedVisible || !mistakeCheck.mistakeHidden) {
    throw new Error("Mistake detection failed to affirm accepted submission!");
  }

  // 2. Time & Space
  await evaluate(`document.querySelector('.mentor-action-chip[data-mentor-mode="complexity"]').click();`);
  await delay(300);
  const complexityState = await evaluate(`
    (() => ({
      time: document.getElementById('mentorTimeComplexity')?.textContent?.trim(),
      space: document.getElementById('mentorSpaceComplexity')?.textContent?.trim()
    }))()
  `);
  console.log("✓ 'Time & Space' metrics:", complexityState);

  // 3. Optimize Code
  await evaluate(`document.querySelector('.mentor-action-chip[data-mentor-mode="optimize"]').click();`);
  await delay(300);
  const optimizeState = await evaluate(`
    (() => ({
      title: document.getElementById('mentorOptimalTitle')?.textContent?.trim(),
      codeSnippet: document.getElementById('mentorOptimalCode')?.textContent?.trim()?.substring(0, 60)
    }))()
  `);
  console.log("✓ 'Optimize Code' solution:", optimizeState);

  // 4. Test Language Switcher in Optimal Solution
  console.log("Testing multi-language switching on optimal solution...");
  await evaluate(`
    (() => {
      const sel = document.getElementById('mentorLangSelect');
      sel.value = 'cpp';
      sel.dispatchEvent(new Event('change'));
    })()
  `);
  await delay(300);
  const cppOptimal = await evaluate(`
    (() => ({
      langBadge: document.getElementById('mentorLangBadge')?.textContent?.trim(),
      optimalTitle: document.getElementById('mentorOptimalTitle')?.textContent?.trim(),
      codeSnippet: document.getElementById('mentorOptimalCode')?.textContent?.trim()?.substring(0, 60)
    }))()
  `);
  console.log("✓ Switched to C++:", cppOptimal);
  if (!cppOptimal.optimalTitle.includes("C++")) throw new Error("Optimal title failed to update to C++!");

  // Switch back to Java
  await evaluate(`
    (() => {
      const sel = document.getElementById('mentorLangSelect');
      sel.value = 'java';
      sel.dispatchEvent(new Event('change'));
    })()
  `);
  await delay(300);

  // 5. Test Copy Code buttons
  console.log("Testing Copy buttons...");
  const copyCodeResult = await evaluate(`
    (async () => {
      const btn = document.getElementById('mentorCopyCodeBtn');
      btn.click();
      await new Promise(r => setTimeout(r, 100));
      return btn.textContent.trim();
    })()
  `);
  console.log(`✓ Copy code button feedback: "${copyCodeResult}"`);

  const copyOptimalResult = await evaluate(`
    (async () => {
      const btn = document.getElementById('mentorCopyOptimalBtn');
      btn.click();
      await new Promise(r => setTimeout(r, 100));
      return btn.textContent.trim();
    })()
  `);
  console.log(`✓ Copy optimal button feedback: "${copyOptimalResult}"`);

  // 6. Test Dry Run Trace
  await evaluate(`document.querySelector('.mentor-action-chip[data-mentor-mode="dry-run"]').click();`);
  await delay(300);
  const dryRunState = await evaluate(`
    (() => ({
      cardVisible: !document.getElementById('mentorDryRunCard')?.hidden,
      rowsCount: document.querySelectorAll('#mentorDryRunTbody tr').length
    }))()
  `);
  console.log("✓ 'Dry Run Trace' table:", dryRunState);
  if (!dryRunState.cardVisible || dryRunState.rowsCount === 0) {
    throw new Error("Dry run trace table was not displayed!");
  }

  // 7. Test Progressive Hints
  await evaluate(`document.querySelector('.mentor-action-chip[data-mentor-mode="hint"]').click();`);
  await delay(300);
  const hint1 = await evaluate(`
    (() => ({
      cardVisible: !document.getElementById('mentorHintCard')?.hidden,
      title: document.getElementById('mentorHintLevelTitle')?.textContent?.trim(),
      text: document.getElementById('mentorHintText')?.textContent?.trim()
    }))()
  `);
  console.log("✓ Hint 1:", hint1);

  // Click Next Hint
  await evaluate(`document.getElementById('mentorNextHintBtn').click();`);
  await delay(300);
  const hint2 = await evaluate(`
    (() => ({
      title: document.getElementById('mentorHintLevelTitle')?.textContent?.trim(),
      text: document.getElementById('mentorHintText')?.textContent?.trim()
    }))()
  `);
  console.log("✓ Next Hint:", hint2);
  if (hint1.text === hint2.text) throw new Error("Hint progression did not advance!");

  // 8. Test Advanced Animatic Mode
  console.log("Switching to Advanced Animatic Mode...");
  await evaluate(`document.getElementById('mentorModeAnimaticBtn').click();`);
  await delay(600);
  const animaticState = await evaluate(`
    (() => ({
      workspaceVisible: !document.getElementById('mentorAnimaticWorkspace')?.hidden,
      normalHidden: document.getElementById('mentorNormalWorkspace')?.hidden,
      algoBadge: document.getElementById('animaticAlgorithmBadge')?.textContent?.trim(),
      stepCounter: document.getElementById('animaticStepCounter')?.textContent?.trim(),
      arrayCells: document.querySelectorAll('.animatic-cell').length,
      speechText: document.getElementById('animaticMentorSpeech')?.textContent?.trim()
    }))()
  `);
  console.log("✓ Advanced Animatic Mode active:", animaticState);
  if (!animaticState.workspaceVisible || !animaticState.normalHidden) {
    throw new Error("Animatic workspace failed to open!");
  }

  // 9. Test Audio Controls in Animatic Mode
  console.log("Testing Audio Controls in Animatic Mode...");
  const soundBefore = await evaluate(`
    (() => ({
      label: document.getElementById('animaticSoundLabel')?.textContent?.trim(),
      pressed: document.getElementById('animaticSoundToggle')?.getAttribute('aria-pressed')
    }))()
  `);
  console.log("Sound initial state (default muted):", soundBefore);
  if (soundBefore.pressed !== "false") throw new Error("Sound must be muted by default!");

  // Toggle sound on
  await evaluate(`document.getElementById('animaticSoundToggle').click();`);
  await delay(300);
  const soundAfter = await evaluate(`
    (() => ({
      label: document.getElementById('animaticSoundLabel')?.textContent?.trim(),
      pressed: document.getElementById('animaticSoundToggle')?.getAttribute('aria-pressed')
    }))()
  `);
  console.log("Sound after toggle:", soundAfter);
  if (soundAfter.pressed !== "true") throw new Error("Sound toggle failed to activate!");

  // Volume slider test
  await evaluate(`
    (() => {
      const slider = document.getElementById('animaticVolumeSlider');
      slider.value = '0.5';
      slider.dispatchEvent(new Event('input'));
    })()
  `);
  await delay(200);
  const volumeLabel = await evaluate(`document.getElementById('animaticVolumeLabel')?.textContent?.trim()`);
  console.log("✓ Volume slider updated to:", volumeLabel);
  if (volumeLabel !== "50%") throw new Error("Volume label failed to update!");

  // 10. Test Stepper Navigation
  console.log("Testing Stepper Navigation (Next, Prev, Last, First)...");
  await evaluate(`document.getElementById('animaticNextBtn').click();`);
  await delay(300);
  const step2Text = await evaluate(`document.getElementById('animaticStepCounter')?.textContent?.trim()`);
  console.log("✓ Clicked Next:", step2Text);

  await evaluate(`document.getElementById('animaticPrevBtn').click();`);
  await delay(300);
  const step1Text = await evaluate(`document.getElementById('animaticStepCounter')?.textContent?.trim()`);
  console.log("✓ Clicked Prev:", step1Text);

  await evaluate(`document.getElementById('animaticLastBtn').click();`);
  await delay(300);
  const stepLastText = await evaluate(`document.getElementById('animaticStepCounter')?.textContent?.trim()`);
  console.log("✓ Clicked Last:", stepLastText);

  await evaluate(`document.getElementById('animaticFirstBtn').click();`);
  await delay(300);
  const stepFirstText = await evaluate(`document.getElementById('animaticStepCounter')?.textContent?.trim()`);
  console.log("✓ Clicked First:", stepFirstText);

  // Capture screenshot of Animatic Mode for permanent artifact proof
  const screenshotRes = await sendCommand("Page.captureScreenshot", { format: "png" });
  if (screenshotRes?.data) {
    fs.writeFileSync("ai_mentor_animatic_verified.png", Buffer.from(screenshotRes.data, "base64"));
    console.log("✓ Saved verification screenshot: ai_mentor_animatic_verified.png");
  }

  // 11. Return to profile via Back to Profile button
  console.log("Testing 'Back to Profile' return button...");
  await evaluate(`document.getElementById('mentorBackToProfile').click();`);
  await delay(600);
  const returnState = await evaluate(`
    (() => ({
      mentorHidden: document.getElementById('aiMentorPage')?.hidden,
      profileVisible: !document.getElementById('profileRoutePage')?.hidden
    }))()
  `);
  console.log("✓ Returned to profile:", returnState);
  if (!returnState.mentorHidden || !returnState.profileVisible) {
    throw new Error("Failed to cleanly return to profile!");
  }

  // Close browser and exit
  ws.close();
  proc.kill();
  console.log("\n=======================================================");
  console.log("🎉 ALL REAL BROWSER VERIFICATION TESTS PASSED SUCCESSFULLY!");
  console.log("=======================================================\n");
  process.exit(0);
}

runBrowserVerification().catch(err => {
  console.error("❌ Browser verification failed:", err);
  process.exit(1);
});
