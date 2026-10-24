"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const express = require("express");
const session = require("express-session");
const { SESSION_MAX_AGE_MS, SESSION_TTL_SECONDS, createAdminSessionOptions } = require("../session-config");
const { createAdminOnly, createAdminLoginHandler, createLogoutHandler, provisionInitialAdmin } = require("../admin-auth");

const password = "a-long-password-created-for-auth-tests";

test("valid credentials regenerate the session and authenticate subsequent requests", async t => {
  const passwordHash = await bcrypt.hash(password, 4);
  const app = express();
  app.use(express.json());
  app.use(session(createAdminSessionOptions({ secret: "unit-test-session-secret-at-least-32-bytes", store: new session.MemoryStore() })));
  const login = createAdminLoginHandler({
    findAdmin: async email => email === "admin@example.com" ? { email, passwordHash } : null,
    comparePassword: bcrypt.compare,
    dummyPasswordHash: await bcrypt.hash("dummy-password", 4)
  });
  const isAdmin = req => req.session?.role === "admin" && typeof req.session.adminEmail === "string";
  app.post("/login", login);
  app.get("/session", (req, res) => res.json({ authenticated: isAdmin(req) }));
  app.get("/protected", createAdminOnly(isAdmin), (_req, res) => res.json({ ok: true }));
  app.post("/logout", createLogoutHandler({ secure: false }));
  const server = app.listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (route, options = {}) => fetch(`${base}${route}`, options);

  assert.equal((await request("/protected")).status, 401);
  const loginResponse = await request("/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: " ADMIN@example.com ", password }) });
  assert.equal(loginResponse.status, 200);
  const cookie = loginResponse.headers.get("set-cookie").split(";")[0];
  assert.match(loginResponse.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(loginResponse.headers.get("set-cookie"), /SameSite=Lax/i);
  assert.match(loginResponse.headers.get("set-cookie"), /Expires=/i);
  assert.deepEqual(await (await request("/session", { headers: { cookie } })).json(), { authenticated: true });
  assert.equal((await request("/protected", { headers: { cookie } })).status, 200);

  const logout = await request("/logout", { method: "POST", headers: { cookie } });
  assert.equal(logout.status, 200);
  const afterLogout = await request("/session", { headers: { cookie } });
  assert.equal(afterLogout.status, 200);
  assert.deepEqual(await afterLogout.json(), { authenticated: false });
  assert.equal((await request("/protected", { headers: { cookie } })).status, 401);
});

test("a signed-in member receives 403 from admin-only APIs while an unauthenticated request receives 401", () => {
  const middleware = createAdminOnly(req => req.session?.role === "admin" && typeof req.session.adminEmail === "string");
  const invoke = session => {
    let status;
    let body;
    middleware({ session }, { status(code) { status = code; return this; }, json(value) { body = value; return this; } }, () => { status = 200; });
    return { status, body };
  };
  assert.deepEqual(invoke(undefined), { status: 401, body: { error: "Authentication required." } });
  assert.deepEqual(invoke({ role: "member", memberId: "member-1", firebaseUid: "verified-uid" }), { status: 403, body: { error: "Administrator permission required." } });
  assert.equal(invoke({ role: "admin", adminEmail: "admin@example.test" }).status, 200);
});

test("an admin login returns a linked personal member identity while preserving the admin role", async t => {
  const passwordHash = await bcrypt.hash(password, 4);
  const app = express();
  app.use(express.json());
  app.use(session(createAdminSessionOptions({ secret: "unit-test-session-secret-at-least-32-bytes", store: new session.MemoryStore() })));
  app.post("/login", createAdminLoginHandler({
    findAdmin: async email => email === "admin@example.com" ? { email, passwordHash } : null,
    comparePassword: bcrypt.compare,
    dummyPasswordHash: passwordHash,
    resolveMember: async email => email === "admin@example.com" ? { id: "member-admin", name: "Admin Member" } : null
  }));
  app.get("/session", (req, res) => res.json({ role: req.session.role, memberId: req.session.memberId }));
  const server = app.listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "admin@example.com", password }) });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).member, { id: "member-admin", name: "Admin Member" });
  const cookie = response.headers.get("set-cookie").split(";")[0];
  assert.deepEqual(await (await fetch(`http://127.0.0.1:${server.address().port}/session`, { headers: { cookie } })).json(), { role: "admin", memberId: "member-admin" });
});

test("admin session cookie and MongoDB TTL are configured for seven rolling days", () => {
  assert.equal(SESSION_MAX_AGE_MS, 7 * 24 * 60 * 60 * 1000);
  assert.equal(SESSION_TTL_SECONDS, 7 * 24 * 60 * 60);
  const options = createAdminSessionOptions({ secret: "unit-test-session-secret-at-least-32-bytes", store: {}, production: true });
  assert.equal(options.name, "dsa.sid");
  assert.equal(options.rolling, true);
  assert.equal(options.cookie.maxAge, SESSION_MAX_AGE_MS);
  assert.equal(options.cookie.httpOnly, true);
  assert.equal(options.cookie.secure, true);
  assert.equal(options.cookie.sameSite, "lax");
});

test("wrong passwords and unknown accounts use the same generic login error", async () => {
  const passwordHash = await bcrypt.hash(password, 4);
  const errors = [];
  for (const email of ["admin@example.com", "missing@example.com"]) {
    let responseBody;
    let status;
    const req = { body: { email, password: "incorrect-password" } };
    const res = { status(code) { status = code; return this; }, json(body) { responseBody = body; return this; } };
    await createAdminLoginHandler({
      findAdmin: async value => value === "admin@example.com" ? { email: value, passwordHash } : null,
      comparePassword: bcrypt.compare,
      dummyPasswordHash: passwordHash
    })(req, res);
    errors.push([status, responseBody]);
  }
  assert.deepEqual(errors[0], errors[1]);
  assert.deepEqual(errors[0], [401, { error: "Invalid email or password." }]);
});

test("invalid email and oversized bcrypt passwords are rejected", async () => {
  let called = false;
  const handler = createAdminLoginHandler({ findAdmin: async () => { called = true; }, comparePassword: async () => false, dummyPasswordHash: "hash" });
  for (const body of [{ email: "not-an-email", password: "x" }, { email: "admin@example.com", password: "x".repeat(73) }]) {
    let status;
    const response = { status(code) { status = code; return this; }, json() { return this; } };
    await handler({ body }, response);
    assert.equal(status, 400);
  }
  assert.equal(called, false);
});

test("admin provisioning hashes the configured password and never overwrites an existing account", async () => {
  let inserted;
  const collection = { async insertOne(document) { inserted = document; } };
  await provisionInitialAdmin({ collection, email: " Admin@Example.com ", password, hashPassword: bcrypt.hash });
  assert.equal(inserted._id, "primary");
  assert.equal(inserted.email, "admin@example.com");
  assert.notEqual(inserted.passwordHash, password);
  assert.equal(await bcrypt.compare(password, inserted.passwordHash), true);

  const duplicateCollection = { async insertOne() { const error = new Error("duplicate"); error.code = 11000; throw error; } };
  await assert.rejects(provisionInitialAdmin({ collection: duplicateCollection, email: "admin@example.com", password, hashPassword: bcrypt.hash }), error => error.code === 11000);
});

test("production logout clears an HttpOnly, Secure, SameSite Lax session cookie", () => {
  let cookie;
  let body;
  createLogoutHandler({ secure: true })({ session: { destroy(callback) { callback(); } } }, {
    clearCookie(name, options) { cookie = { name, options }; },
    json(value) { body = value; return this; }
  });
  assert.deepEqual(cookie, { name: "dsa.sid", options: { httpOnly: true, secure: true, sameSite: "lax", path: "/" } });
  assert.deepEqual(body, { ok: true });
});

test("the actual Mongo-backed rate-limit middleware blocks attempts above the configured threshold", async () => {
  const { createMongoRateLimit } = require("../mongo-rate-limit");
  const rows = new Map();
  const collection = {
    async updateOne(filter, update, options = {}) {
      const row = rows.get(filter._id);
      if (!row && options.upsert) {
        rows.set(filter._id, { ...update.$setOnInsert });
        return { matchedCount: 1 };
      }
      if (row && filter.count && row.count < filter.count.$lt) {
        row.count += update.$inc.count;
        return { matchedCount: 1 };
      }
      return { matchedCount: 0 };
    }
  };
  const middleware = createMongoRateLimit({ getCollection: () => collection, secret: "unit-test-secret", windowMs: 60_000, clock: () => 120_000 })("admin-login", 2);
  for (let attempt = 0; attempt < 2; attempt++) {
    let next = false;
    await middleware({ ip: "127.0.0.1" }, { setHeader() {}, status() { return this; }, json() {} }, () => { next = true; });
    assert.equal(next, true);
  }
  let status;
  let next = false;
  await middleware({ ip: "127.0.0.1" }, { setHeader() {}, status(code) { status = code; return this; }, json() {} }, () => { next = true; });
  assert.equal(status, 429);
  assert.equal(next, false);
});

test("protected dashboard APIs remain admin-only", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  for (const route of [
    'app.get("/api/data", adminOnly,',
    'app.post("/api/data", adminOnly,',
    'app.get("/api/page-data/:page", dashboardViewer,',
    'app.post("/api/admin/leetcode/refresh", adminOnly,',
    'app.post("/api/admin/leetcode/activity/refresh", adminOnly,',
    'app.post("/api/admin/leetcode/activity/finalize", adminOnly,',
    'app.post("/api/admin/import", adminOnly,',
    'app.get("/api/admin/audit", adminOnly,'
  ]) assert.ok(source.includes(route), `missing admin protection: ${route}`);
  assert.match(source, /db\.collection\("dashboard"\)\.findOne\(\{ _id: "shared" \}\)/);
  assert.match(source, /app\.post\("\/api\/data", adminOnly, async \(req, res\) =>/);
  assert.match(source, /app\.post\("\/api\/admin\/import", adminOnly,/);
  assert.match(source, /if \(!result\.upsertedCount\) return res\.status\(409\)/);
});
