"use strict";

const { exec } = require("child_process");
require("dotenv").config();

async function inspect() {
  const loginRes = await fetch("http://127.0.0.1:3000/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
  });
  const cookieHeader = loginRes.headers.get("set-cookie");
  // Full cookie string before semicolon
  const cookiePair = cookieHeader.split(";")[0];
  const [cookieName, cookieValue] = cookiePair.split("=");
  console.log("Logged in, cookie:", cookieName, "len:", cookieValue?.length);

  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const proc = exec(`"${edgePath}" --headless=new --remote-debugging-port=9230 --disable-gpu http://127.0.0.1:3000/`);
  await new Promise(r => setTimeout(r, 2000));
  const targetsRes = await fetch("http://127.0.0.1:9230/json");
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
      console.log("Cookie set result:", msg.result);
      ws.send(JSON.stringify({ id: 3, method: "Page.navigate", params: { url: "http://127.0.0.1:3000/profile/member_mvggb1nmx303va" } }));
    }
    if (msg.method === "Console.messageAdded") {
      console.log("[CONSOLE]", msg.params.message.text);
    }
    if (msg.method === "Runtime.consoleAPICalled") {
      console.log("[CONSOLE API]", msg.params.type, msg.params.args?.map(a => a.value));
    }
  });

  setTimeout(() => {
    ws.send(JSON.stringify({
      id: 4,
      method: "Runtime.evaluate",
      params: {
        expression: `JSON.stringify({
          pathname: location.pathname,
          isAdmin: typeof isAdmin !== 'undefined' ? isAdmin : null,
          isMember: typeof isMember !== 'undefined' ? isMember : null,
          memberProfile: typeof memberProfile !== 'undefined' ? memberProfile : null,
          profileRoutePageHidden: document.getElementById('profileRoutePage')?.hidden,
          dailySectionHidden: document.getElementById('routeProfileDailySection')?.hidden,
          dailyDateText: document.getElementById('routeProfileDailyDate')?.textContent,
          cardsCount: document.querySelectorAll('.daily-question-card').length,
          cardTitles: Array.from(document.querySelectorAll('.daily-question-title')).map(el => el.textContent),
          dailyContentHTML: document.getElementById('routeProfileDailyContent')?.innerHTML?.slice(0, 300)
        })`
      }
    }));
  }, 4000);

  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id === 4) {
      console.log("BROWSER STATE:", JSON.parse(msg.result?.result?.value || "{}"));
      ws.close();
      proc.kill();
      process.exit(0);
    }
  });
}

inspect().catch(err => {
  console.error("Inspect error:", err);
  process.exit(1);
});
