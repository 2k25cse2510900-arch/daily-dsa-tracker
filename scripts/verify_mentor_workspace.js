"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

async function main() {
  const cdpPort = 9222;
  // Check if Edge with debugging is listening
  let version;
  try {
    version = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${cdpPort}/json/version`, res => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => resolve(JSON.parse(data)));
      }).on("error", reject);
    });
  } catch (err) {
    console.log("No remote debugging browser on 9222, running DOM simulation test instead.");
    return runDOMTest();
  }

  // Connect to target
  const list = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${cdpPort}/json/list`, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });

  const page = list.find(t => t.type === "page");
  if (!page) {
    console.log("No page target found");
    return;
  }

  const WebSocket = require("ws");
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  let id = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const curId = id++;
    const handler = msg => {
      const resp = JSON.parse(msg);
      if (resp.id === curId) {
        ws.off("message", handler);
        if (resp.error) reject(resp.error);
        else resolve(resp.result);
      }
    };
    ws.on("message", handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  await new Promise(r => ws.on("open", r));

  console.log("Navigating to profile...");
  await send("Page.navigate", { url: "http://localhost:3000/profile/member_mvggb1nmx303va" });
  await new Promise(r => setTimeout(r, 2500));

  console.log("Checking daily question cards...");
  const evalCards = await send("Runtime.evaluate", {
    expression: `document.querySelectorAll('.daily-question-card').length`
  });
  console.log("Cards count:", evalCards.result.value);

  console.log("Simulating click on first question card...");
  const clickResult = await send("Runtime.evaluate", {
    expression: `(() => {
      const card = document.querySelector('.daily-question-card');
      if (!card) return 'no card';
      card.click();
      return 'clicked: ' + (card.dataset.reviewTitle || '');
    })()`
  });
  console.log("Click result:", clickResult.result.value);
  await new Promise(r => setTimeout(r, 1000));

  const mentorVisible = await send("Runtime.evaluate", {
    expression: `(() => {
      const page = document.getElementById('aiMentorPage');
      return page && !page.hidden;
    })()`
  });
  console.log("AI Mentor page visible:", mentorVisible.result.value);

  const titleText = await send("Runtime.evaluate", {
    expression: `document.getElementById('mentorProblemTitle')?.textContent`
  });
  console.log("Mentor Problem Title:", titleText.result.value);

  console.log("Toggling to Animatic Mode...");
  await send("Runtime.evaluate", {
    expression: `document.getElementById('mentorModeAnimaticBtn')?.click()`
  });
  await new Promise(r => setTimeout(r, 1000));

  const animaticVisible = await send("Runtime.evaluate", {
    expression: `(() => {
      const anim = document.getElementById('mentorAnimaticWorkspace');
      return anim && !anim.hidden;
    })()`
  });
  console.log("Animatic workspace visible:", animaticVisible.result.value);

  const screenshot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(__dirname, "..", "mentor_screenshot.png"), Buffer.from(screenshot.data, "base64"));
  console.log("Captured mentor_screenshot.png successfully!");

  ws.close();
}

function runDOMTest() {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const script = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
  assert.ok(html.includes('id="aiMentorPage"'), "AI Mentor page element must exist");
  assert.ok(html.includes('id="mentorNormalWorkspace"'), "Normal workspace element must exist");
  assert.ok(html.includes('id="mentorAnimaticWorkspace"'), "Animatic workspace element must exist");
  assert.ok(script.includes("openAiCodeMentorWorkspace"), "Workspace opening logic must exist");
  assert.ok(script.includes("renderAnimaticStep"), "Animatic renderer must exist");
  console.log("DOM and script assertions passed successfully!");
}

main().catch(err => {
  console.error("Verification error:", err);
  process.exit(1);
});
