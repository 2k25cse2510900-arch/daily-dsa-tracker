"use strict";
const { exec } = require("child_process");
require("dotenv").config();

async function diagnose() {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const proc = exec(`"${edgePath}" --headless=new --remote-debugging-port=9288 --window-size=1280,1600 --disable-gpu about:blank`);
  await new Promise(r => setTimeout(r, 2000));

  const targetsRes = await fetch("http://127.0.0.1:9288/json");
  const targets = await targetsRes.json();
  const page = targets.find(t => t.type === "page");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener("open", r, { once: true }));

  let id = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const curId = ++id;
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === curId) {
        ws.removeEventListener("message", handler);
        resolve(msg.result);
      }
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === "Runtime.exceptionThrown") {
      console.log("EXACT EXCEPTION:", JSON.stringify(msg.params.exceptionDetails, null, 2));
    }
  });

  await send("Runtime.enable");
  await send("Page.navigate", { url: "http://127.0.0.1:3000/" });
  await new Promise(r => setTimeout(r, 2500));

  ws.close();
  proc.kill();
}

diagnose().catch(console.error);
