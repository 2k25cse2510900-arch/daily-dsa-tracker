require('dotenv').config();
const { exec } = require('child_process');

(async () => {
  const loginRes = await fetch('http://127.0.0.1:3000/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
  });
  const cookiePair = loginRes.headers.get('set-cookie').split(';')[0];
  const [cookieName, cookieValue] = cookiePair.split('=');
  const port = 9348;
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const proc = exec(`"${edgePath}" --headless=new --remote-debugging-port=${port} about:blank`);
  await new Promise(r => setTimeout(r, 2000));
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  ws.send(JSON.stringify({ id: 1, method: 'Network.setCookie', params: { name: cookieName, value: cookieValue, domain: '127.0.0.1', path: '/' } }));
  await new Promise(r => setTimeout(r, 500));
  ws.send(JSON.stringify({ id: 2, method: 'Page.navigate', params: { url: 'http://127.0.0.1:3000/profile/member_mvggb1nmx303va' } }));
  await new Promise(r => setTimeout(r, 3500));
  ws.send(JSON.stringify({ id: 3, method: 'Runtime.evaluate', params: { expression: 'Array.from(document.querySelectorAll(".daily-question-card")).map(c => ({ title: c.dataset.reviewTitle, slug: c.dataset.reviewSlug }))', returnByValue: true } }));
  ws.onmessage = e => {
    const d = JSON.parse(e.data);
    if (d.id === 3) {
      console.log('Cards:', d.result.result.value);
      ws.close();
      try { proc.kill(); } catch {}
      process.exit(0);
    }
  };
})();
