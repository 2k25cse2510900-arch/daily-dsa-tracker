"use strict";

const { exec } = require("child_process");
const fs = require("fs");
require("dotenv").config();

async function screenshot() {
  const loginRes = await fetch("http://127.0.0.1:3000/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
  });
  const cookiePair = loginRes.headers.get("set-cookie").split(";")[0];
  const [cookieName, cookieValue] = cookiePair.split("=");

  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const proc = exec(`"${edgePath}" --headless=new --remote-debugging-port=9233 --window-size=1280,1600 --disable-gpu http://127.0.0.1:3000/`);
  await new Promise(r => setTimeout(r, 2000));
  const targetsRes = await fetch("http://127.0.0.1:9233/json");
  const targets = await targetsRes.json();
  const page = targets.find(t => t.type === "page");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  ws.addEventListener("open", () => {
    ws.send(JSON.stringify({ id: 1, method: "Network.enable" }));
    ws.send(JSON.stringify({ id: 2, method: "Network.setCookie", params: { name: cookieName, value: decodeURIComponent(cookieValue), url: "http://127.0.0.1:3000" } }));
  });

  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id === 2) {
      ws.send(JSON.stringify({ id: 3, method: "Page.navigate", params: { url: "http://127.0.0.1:3000/profile/member_mvggb1nmx303va" } }));
    }
  });

  // Poll until cards are rendered
  let interval = setInterval(() => {
    ws.send(JSON.stringify({
      id: 100,
      method: "Runtime.evaluate",
      params: {
        expression: `document.querySelectorAll('.daily-question-card').length`
      }
    }));
  }, 500);

  let captured = false;
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id === 100 && msg.result?.result?.value > 0 && !captured) {
      captured = true;
      clearInterval(interval);
      console.log("Cards rendered:", msg.result.result.value, "capturing screenshot...");
      setTimeout(() => {
        ws.send(JSON.stringify({ id: 4, method: "Page.captureScreenshot", params: { format: "png", captureBeyondViewport: true } }));
      }, 500);
    }
    if (msg.id === 4) {
      const buffer = Buffer.from(msg.result.data, "base64");
      fs.writeFileSync("profile_screenshot_full.png", buffer);
      console.log("Full screenshot saved as profile_screenshot_full.png (bytes:", buffer.length, ")");
      ws.close();
      proc.kill();
      process.exit(0);
    }
  });
}

screenshot().catch(err => {
  console.error(err);
  process.exit(1);
});
