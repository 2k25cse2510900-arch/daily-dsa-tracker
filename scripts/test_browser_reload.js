"use strict";

const { exec } = require("child_process");
require("dotenv").config();

async function testReload() {
  const loginRes = await fetch("http://127.0.0.1:3000/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
  });
  const cookiePair = loginRes.headers.get("set-cookie").split(";")[0];
  const [cookieName, cookieValue] = cookiePair.split("=");

  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const proc = exec(`"${edgePath}" --headless=new --remote-debugging-port=9235 --window-size=1280,1600 --disable-gpu http://127.0.0.1:3000/`);
  await new Promise(r => setTimeout(r, 2000));
  const targetsRes = await fetch("http://127.0.0.1:9235/json");
  const targets = await targetsRes.json();
  const page = targets.find(t => t.type === "page");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  ws.addEventListener("open", () => {
    ws.send(JSON.stringify({ id: 1, method: "Network.enable" }));
    ws.send(JSON.stringify({ id: 2, method: "Network.setCookie", params: { name: cookieName, value: decodeURIComponent(cookieValue), url: "http://127.0.0.1:3000" } }));
  });

  let stage = "initial";
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id === 2) {
      console.log("Navigating to profile...");
      ws.send(JSON.stringify({ id: 3, method: "Page.navigate", params: { url: "http://127.0.0.1:3000/profile/member_mvggb1nmx303va" } }));
    }
  });

  let pollCount = 0;
  let interval = setInterval(() => {
    pollCount++;
    ws.send(JSON.stringify({
      id: 200 + pollCount,
      method: "Runtime.evaluate",
      params: {
        returnByValue: true,
        expression: `JSON.stringify({
          cardsCount: document.querySelectorAll('.daily-question-card').length,
          profileName: document.getElementById('routeProfileName')?.textContent,
          pathname: location.pathname
        })`
      }
    }));
  }, 500);

  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id >= 200) {
      const parsed = JSON.parse(msg.result?.result?.value || "{}");
      console.log(`[POLL stage=${stage}]`, parsed);
      if (stage === "initial" && parsed.cardsCount === 6) {
        console.log("Initial load passed: 6 cards found! Triggering browser reload...");
        stage = "reloaded";
        ws.send(JSON.stringify({ id: 4, method: "Page.reload" }));
      } else if (stage === "reloaded" && parsed.cardsCount === 6) {
        console.log("Post-reload verification PASSED: 6 cards remain visible after browser refresh!");
        clearInterval(interval);
        ws.close();
        proc.kill();
        process.exit(0);
      }
    }
  });
}

testReload().catch(err => {
  console.error(err);
  process.exit(1);
});
