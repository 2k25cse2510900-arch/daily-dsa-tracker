"use strict";

const assert = require("node:assert/strict");
const express = require("express");
const session = require("express-session");
const test = require("node:test");
const { createAdminOnly, createAdminLoginHandler, createLogoutHandler } = require("../admin-auth");
const { createMemberFirebaseLoginHandler } = require("../member-auth");
const { createAdminSessionOptions } = require("../session-config");

function listen(app) {
  return new Promise(resolve => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function close(server) {
  server.closeAllConnections();
  return new Promise(resolve => server.close(resolve));
}

test("mode switches replace the server session and require the authorization for the requested mode", async () => {
  const app = express();
  app.use(express.json());
  app.use(session(createAdminSessionOptions({ secret: "unit-test-session-secret-at-least-32-bytes", store: new session.MemoryStore() })));
  app.post("/api/member/login", createMemberFirebaseLoginHandler({
    verifyIdToken: async () => ({ uid: "verified-krish-uid", email: "krishchaddha22@gmail.com", email_verified: true, firebase: { sign_in_provider: "google.com" } }),
    isAuthorizedEmail: email => email === "krishchaddha22@gmail.com",
    canRegister: () => false,
    resolveMember: async () => ({ id: "member_mvggb1nmx303va", name: "Krish (ADMIN)", sessionVersion: 2, created: false })
  }));
  app.post("/api/admin/login", createAdminLoginHandler({
    findAdmin: async email => email === "krishchaddha22@gmail.com" ? { email, passwordHash: "verified-password-hash" } : null,
    comparePassword: async (password, hash) => password === "verified-admin-password" && hash === "verified-password-hash",
    dummyPasswordHash: "dummy-password-hash",
    resolveMember: async () => ({ id: "member_mvggb1nmx303va", name: "Krish (ADMIN)" })
  }));
  app.get("/api/session", (req, res) => res.json({ role: req.session.role || null, memberId: req.session.memberId || null, adminEmail: req.session.adminEmail || null }));
  app.get("/api/admin/data", createAdminOnly(req => req.session?.role === "admin" && typeof req.session.adminEmail === "string"), (_req, res) => res.json({ ok: true }));
  app.post("/api/logout", createLogoutHandler({ secure: false }));

  const server = await listen(app);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const memberLogin = await fetch(`${base}/api/member/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: "google-token", role: "admin" }) });
    assert.equal((await memberLogin.json()).role, "member");
    let cookie = memberLogin.headers.get("set-cookie").split(";")[0];
    assert.deepEqual(await (await fetch(`${base}/api/session`, { headers: { cookie } })).json(), { role: "member", memberId: "member_mvggb1nmx303va", adminEmail: null });
    assert.equal((await fetch(`${base}/api/admin/data`, { headers: { cookie } })).status, 403);

    const adminLogin = await fetch(`${base}/api/admin/login`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ email: "krishchaddha22@gmail.com", password: "verified-admin-password", role: "admin" }) });
    assert.equal((await adminLogin.json()).role, "admin");
    cookie = adminLogin.headers.get("set-cookie").split(";")[0];
    assert.deepEqual(await (await fetch(`${base}/api/session`, { headers: { cookie } })).json(), { role: "admin", memberId: "member_mvggb1nmx303va", adminEmail: "krishchaddha22@gmail.com" });
    assert.equal((await fetch(`${base}/api/admin/data`, { headers: { cookie } })).status, 200);

    const memberMode = await fetch(`${base}/api/member/login`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ idToken: "google-token" }) });
    assert.equal((await memberMode.json()).role, "member");
    cookie = memberMode.headers.get("set-cookie").split(";")[0];
    assert.equal((await fetch(`${base}/api/admin/data`, { headers: { cookie } })).status, 403);

    assert.equal((await fetch(`${base}/api/logout`, { method: "POST", headers: { cookie } })).status, 200);
    const signedOut = await fetch(`${base}/api/session`, { headers: { cookie } });
    assert.equal((await signedOut.json()).role, null);
  } finally { await close(server); }
});
