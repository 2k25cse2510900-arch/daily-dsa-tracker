const { exec } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const dist_dir = path.resolve('characterverse/dist');

const server = http.createServer((req, res) => {
  let clean = req.url.split('?')[0].split('#')[0];
  if (clean.startsWith('/characterverse')) clean = clean.slice('/characterverse'.length);
  if (!clean || clean === '/') clean = '/index.html';
  const filePath = path.join(dist_dir, clean);
  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath);
    const contentType = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(4196, () => {
  const edge = '"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"';
  const proc = exec(`${edge} --headless=new --remote-debugging-port=9226 --disable-gpu http://127.0.0.1:4196/characterverse/?tab=vehicles`);

  setTimeout(async () => {
    try {
      const targetsRes = await fetch('http://127.0.0.1:9226/json');
      const targets = await targetsRes.json();
      const page = targets.find(t => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) {
        const WebSocket = globalThis.WebSocket || require('ws');
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        ws.addEventListener('open', () => {
          ws.send(JSON.stringify({ id: 1, method: 'Console.enable' }));
          ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
        });
        ws.addEventListener('message', (event) => {
          const msg = JSON.parse(event.data);
          if (msg.method === 'Runtime.consoleAPICalled') {
            console.log('[LOG]', msg.params.type, msg.params.args);
          } else if (msg.method === 'Runtime.exceptionThrown') {
            console.error('[EXCEPTION]', msg.params.exceptionDetails);
          }
        });
        setTimeout(() => {
          ws.close();
          proc.kill();
          server.close();
          process.exit(0);
        }, 4000);
      }
    } catch (e) {
      console.error(e);
      proc.kill();
      server.close();
      process.exit(1);
    }
  }, 2000);
});
