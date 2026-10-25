"use strict";

const assert = require("node:assert/strict");
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

// Import the real app with harmless local test settings; the CSP middleware is
// exercised directly so the test does not connect to MongoDB.
process.env.SESSION_SECRET = "test-only-session-secret-not-used-for-authentication";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/dsa-dashboard-csp-test";
const dashboardApp = require("../server");

function listen(app) {
  return new Promise(resolve => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function close(server) {
  server.closeAllConnections();
  return new Promise(resolve => server.close(resolve));
}

test("Express CSP permits Firebase Google popup auth and preserves protections", async () => {
  const helmetLayer = dashboardApp.router.stack.find(layer => layer.name === "helmetMiddleware");
  assert.ok(helmetLayer, "dashboard app must register the configured Helmet middleware");

  const probe = express();
  probe.use(helmetLayer.handle);
  probe.get("/", (req, res) => res.end("ok"));
  const server = await listen(probe);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/`);
    const policy = response.headers.get("content-security-policy");
    assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin-allow-popups");
    assert.ok(policy);
    const directives = Object.fromEntries(policy.split(";").map(part => {
      const [name, ...sources] = part.trim().split(/\s+/);
      return [name, sources];
    }));

    assert.deepEqual(directives["script-src"], ["'self'", "https://www.gstatic.com", "https://apis.google.com"]);
    assert.ok(directives["connect-src"].includes("https://identitytoolkit.googleapis.com"));
    assert.ok(directives["connect-src"].includes("https://securetoken.googleapis.com"));
    assert.ok(directives["frame-src"].includes("https://*.firebaseapp.com"));
    assert.deepEqual(directives["style-src"], ["'self'", "'unsafe-inline'"]);
    assert.deepEqual(directives["object-src"], ["'none'"]);
    assert.deepEqual(directives["frame-ancestors"], ["'none'"]);
  } finally {
    await close(server);
  }
});

test("root dashboard shell remains available when MongoDB is not ready", async () => {
  const server = await listen(dashboardApp);
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const unavailable = await fetch(`${origin}/api/session`);
    assert.equal(unavailable.status, 503);
    assert.deepEqual(await unavailable.json(), {
      error: "Dashboard services are temporarily unavailable. Check server configuration and database connectivity."
    });

    for (const route of ["/", "/index.html"]) {
      const response = await fetch(`${origin}${route}`, { redirect: "manual" });
      assert.equal(response.status, 200, route);
      assert.match(response.headers.get("content-type") || "", /^text\/html\b/i, route);
      assert.equal(response.headers.get("location"), null, route);
      assert.equal(response.headers.get("cache-control"), "no-store", route);
      assert.match(await response.text(), /<!DOCTYPE html>/i, route);
    }
  } finally {
    await close(server);
  }
});

test("API routes retain the runtime readiness guard", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.match(source, /app\.use\("\/api", requireRuntime\)/);
  assert.doesNotMatch(source, /app\.use\(requireRuntime\)/);
});

test("Vercel CSP preserves Firebase Google popup authentication", () => {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "vercel.json"), "utf8"));
  const headers = config.headers.flatMap(item => item.headers);
  const policy = headers.find(header => header.key === "Content-Security-Policy")?.value;
  assert.ok(policy);
  for (const source of ["https://www.gstatic.com", "https://apis.google.com", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com", "https://accounts.google.com", "https://*.firebaseapp.com"]) assert.ok(policy.includes(source), source);
  assert.equal(headers.find(header => header.key === "Cross-Origin-Opener-Policy")?.value, "same-origin-allow-popups");
});
