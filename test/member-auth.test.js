"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const express = require("express");
const session = require("express-session");
const { createMemberFirebaseLoginHandler, createMemberOnly, validateOwnProgressUpdate } = require("../member-auth");
const { requiredFirebaseClientConfig, firebaseCredentialFromEnv, createFirebaseTokenVerifier } = require("../firebase-auth");
const { createAdminSessionOptions } = require("../session-config");
const { createAdminOnly, createLogoutHandler } = require("../admin-auth");
const { normalizeMemberEmail, parseMemberEmailAllowlist } = require("../member-allowlist");
const { createPersonalProfileResolver } = require("../member-profiles");

function listen(app) {
  return new Promise(resolve => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function close(server) {
  server.closeAllConnections();
  return new Promise(resolve => server.close(resolve));
}

test("Firebase client config requires all public web configuration values", () => {
  assert.equal(requiredFirebaseClientConfig({ FIREBASE_PROJECT_ID: "project" }), null);
  assert.deepEqual(requiredFirebaseClientConfig({ FIREBASE_API_KEY: "public-key", FIREBASE_AUTH_DOMAIN: "project.firebaseapp.com", FIREBASE_PROJECT_ID: "project", FIREBASE_APP_ID: "1:123:web:abc" }), { apiKey: "public-key", authDomain: "project.firebaseapp.com", projectId: "project", appId: "1:123:web:abc" });
});

test("member emails normalize case for verified Google account mapping", () => {
  assert.equal(normalizeMemberEmail(" Member1@Example.Test "), "member1@example.test");
  const sevenEmails = parseMemberEmailAllowlist("one@example.test, two@example.test; THREE@example.test four@example.test five@example.test six@example.test seven@example.test");
  assert.equal(sevenEmails.valid, true);
  assert.equal(sevenEmails.emails.size, 7);
  assert.equal(sevenEmails.emails.has("three@example.test"), true);
  assert.equal(parseMemberEmailAllowlist("one@example.test one@example.test").reason, "duplicate");
});

test("disabled self-registration rejects a verified email outside the configured group", async () => {
  const app = express();
  app.use(express.json());
  app.use(session(createAdminSessionOptions({ secret: "unit-test-session-secret-at-least-32-bytes", store: new session.MemoryStore() })));
  app.post("/login", createMemberFirebaseLoginHandler({
    verifyIdToken: async () => ({ uid: "outside-user", email: "outside@example.test", email_verified: true, firebase: { sign_in_provider: "google.com" } }),
    isAuthorizedEmail: email => email === "member@example.test",
    canRegister: () => false,
    resolveMember: async () => ({ id: "member-1" })
  }));
  const server = await listen(app);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: "token" }) });
    assert.equal(response.status, 403);
  } finally { await close(server); }
});

test("Firebase client facade loads synchronously before member handlers and uses modular SDK APIs", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const facadeScript = html.indexOf('<script src="firebase-client.js"></script>');
  const handlersScript = html.indexOf('<script src="script.js"></script>');
  const clientSource = fs.readFileSync(path.join(__dirname, "..", "firebase-client.js"), "utf8");
  assert.notEqual(facadeScript, -1);
  assert.ok(facadeScript < handlersScript);
  assert.match(clientSource, /import\("https:\/\/www\.gstatic\.com\/firebasejs\/11\.10\.0\/firebase-auth\.js"\)/);
  assert.match(clientSource, /signInWithPopup\(auth, provider\)/);
});

test("Firebase Admin uses ADC when deployment service-account variables are absent", async () => {
  const calls = [];
  const env = { FIREBASE_PROJECT_ID: "project" };
  const credential = firebaseCredentialFromEnv(env, {
    applicationDefault: () => ({ kind: "adc" }),
    cert: () => { throw new Error("service account should not be used"); }
  });
  assert.deepEqual(credential, { kind: "adc" });
  const verifyIdToken = createFirebaseTokenVerifier(env, {
    applicationDefault: () => ({ kind: "adc" }),
    cert: () => { throw new Error("service account should not be used"); },
    getApps: () => [],
    initializeApp: options => { calls.push(options); return { name: "member-auth" }; },
    getAuth: () => ({ verifyIdToken: async token => ({ token }) })
  });
  assert.deepEqual(await verifyIdToken("token"), { token: "token" });
  assert.deepEqual(calls, [{ credential: { kind: "adc" }, projectId: "project" }]);
});

test("Firebase Admin uses service-account environment variables only when both are present", () => {
  let certificate;
  const credential = firebaseCredentialFromEnv({
    FIREBASE_PROJECT_ID: "project",
    FIREBASE_CLIENT_EMAIL: "firebase-admin@example.test",
    FIREBASE_PRIVATE_KEY: "line-one\\nline-two"
  }, {
    applicationDefault: () => { throw new Error("ADC should not be used"); },
    cert: value => { certificate = value; return { kind: "service-account" }; }
  });
  assert.deepEqual(credential, { kind: "service-account" });
  assert.deepEqual(certificate, { projectId: "project", clientEmail: "firebase-admin@example.test", privateKey: "line-one\nline-two" });
  assert.throws(() => firebaseCredentialFromEnv({ FIREBASE_PROJECT_ID: "project", FIREBASE_CLIENT_EMAIL: "only-one" }), /incomplete/);
});

test("verified Google token creates or restores only its own member session", async () => {
  const member = { id: "member-1", sessionVersion: 3 };
  const authStages = [];
  const app = express();
  app.use(express.json());
  app.use(session(createAdminSessionOptions({ secret: "unit-test-session-secret-at-least-32-bytes", store: new session.MemoryStore() })));
  app.post("/login", createMemberFirebaseLoginHandler({
    verifyIdToken: async token => {
      if (token === "invalid") throw new Error("invalid");
      return {
        uid: token,
        email: token === "unapproved-user" ? "unapproved@example.test" : token === "malformed-email" ? "not-an-email" : "member1@example.test",
        email_verified: token !== "unverified-user",
        firebase: { sign_in_provider: token === "password-user" ? "password" : "google.com" }
      };
    },
    isAuthorizedEmail: email => email === "member1@example.test",
    resolveMember: async ({ firebaseUid, email }) => firebaseUid === "google-user" ? member : { id: "member-new", sessionVersion: 0, created: true, email },
    logStage: (stage, outcome) => authStages.push({ stage, outcome })
  }));
  const server = await listen(app);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const accepted = await fetch(`${base}/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: "google-user" }) });
    assert.equal(accepted.status, 200);
    assert.deepEqual(await accepted.json(), { authenticated: true, role: "member", member });
    assert.match(accepted.headers.get("set-cookie"), /dsa\.sid=/);
    assert.deepEqual(authStages.slice(0, 7), [
      { stage: "id-token-verification", outcome: "passed" },
      { stage: "google-provider-check", outcome: "passed" },
      { stage: "verified-email-check", outcome: "passed" },
      { stage: "group-authorization", outcome: "group-member" },
      { stage: "account-resolution", outcome: "resolved" },
      { stage: "session-regeneration", outcome: "passed" },
      { stage: "session-save", outcome: "passed" }
    ]);
    const registered = await fetch(`${base}/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: "other-user" }) });
    assert.equal(registered.status, 200);
    assert.equal((await registered.json()).member.id, "member-new");
    const invalid = await fetch(`${base}/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: "invalid" }) });
    assert.equal(invalid.status, 401);
    const nonGoogle = await fetch(`${base}/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: "password-user" }) });
    assert.equal(nonGoogle.status, 401);
    const unapproved = await fetch(`${base}/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: "unapproved-user" }) });
    assert.equal(unapproved.status, 200);
    const unapprovedBody = await unapproved.json();
    assert.equal(unapprovedBody.member.id, "member-new");
    assert.equal(unapprovedBody.role, "member");
    const unverified = await fetch(`${base}/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: "unverified-user" }) });
    assert.equal(unverified.status, 403);
    const malformed = await fetch(`${base}/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: "malformed-email" }) });
    assert.equal(malformed.status, 403);
  } finally { await close(server); }
});

test("Member Login for the primary-admin email stays member-only and preserves the existing Krish member", async () => {
  const krish = { id: "member_mvggb1nmx303va", name: "Krish (ADMIN)", sessionVersion: 2, created: false };
  const app = express();
  app.use(express.json());
  app.use(session(createAdminSessionOptions({ secret: "unit-test-session-secret-at-least-32-bytes", store: new session.MemoryStore() })));
  app.post("/login", createMemberFirebaseLoginHandler({
    verifyIdToken: async () => ({ uid: "verified-krish-uid", email: " KrishChaddha22@Gmail.com ", email_verified: true, firebase: { sign_in_provider: "google.com" } }),
    isAuthorizedEmail: email => email === "krishchaddha22@gmail.com",
    canRegister: () => false,
    resolveMember: async identity => {
      assert.equal(identity.email, "krishchaddha22@gmail.com");
      assert.equal(Object.hasOwn(identity, "admin"), false);
      return krish;
    }
  }));
  app.get("/session", (req, res) => res.json({ role: req.session.role, adminEmail: req.session.adminEmail, memberId: req.session.memberId }));
  app.get("/admin-data", createAdminOnly(req => req.session?.role === "admin" && typeof req.session.adminEmail === "string"), (_req, res) => res.json({ ok: true }));
  app.post("/logout", createLogoutHandler({ secure: false }));
  const server = await listen(app);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(`${base}/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: "verified-token", role: "admin", isAdmin: true, adminEmail: "krishchaddha22@gmail.com" }) });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.role, "member");
    assert.equal(body.member.id, krish.id);
    assert.equal(body.member.created, false);
    const cookie = response.headers.get("set-cookie").split(";")[0];
    assert.deepEqual(await (await fetch(`${base}/session`, { headers: { cookie } })).json(), { role: "member", memberId: krish.id });
    assert.equal((await fetch(`${base}/admin-data`, { headers: { cookie } })).status, 403);
    assert.equal((await fetch(`${base}/logout`, { method: "POST", headers: { cookie } })).status, 200);
    const afterLogout = await fetch(`${base}/session`, { headers: { cookie } });
    assert.equal((await afterLogout.json()).role, undefined);
    const reLogin = await fetch(`${base}/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: "verified-token" }) });
    assert.equal((await reLogin.json()).role, "member");
    const serverSource = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    assert.match(serverSource, /const legacyMember = groupAuthorized \? await findDashboardMemberByEmail\(email\) : null/);
    assert.doesNotMatch(serverSource, /resolveAdmin: findAdminByVerifiedEmail/);
  } finally { await close(server); }
});

test("identity conflicts return a useful error without creating or merging profiles", async () => {
  const app = express();
  app.use(express.json());
  app.use(session(createAdminSessionOptions({ secret: "unit-test-session-secret-at-least-32-bytes", store: new session.MemoryStore() })));
  app.post("/login", createMemberFirebaseLoginHandler({
    verifyIdToken: async () => ({ uid: "verified-krish-uid", email: "krishchaddha22@gmail.com", email_verified: true, firebase: { sign_in_provider: "google.com" } }),
    resolveMember: async () => { const error = new Error("conflict"); error.status = 409; throw error; }
  }));
  const server = await listen(app);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: "token" }) });
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /identity conflict/i);
  } finally { await close(server); }
});

test("duplicate email and Firebase UID conflicts fail closed before a member session is created", async () => {
  for (const conflict of ["duplicate-email", "firebase-uid"]) {
    const app = express();
    app.use(express.json());
    app.use(session(createAdminSessionOptions({ secret: "unit-test-session-secret-at-least-32-bytes", store: new session.MemoryStore() })));
    app.post("/login", createMemberFirebaseLoginHandler({
      verifyIdToken: async () => ({ uid: "verified-user", email: "member@example.test", email_verified: true, firebase: { sign_in_provider: "google.com" } }),
      isAuthorizedEmail: () => true,
      resolveMember: async () => { const error = new Error(conflict); error.status = 409; throw error; }
    }));
    const server = await listen(app);
    try {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: "token" }) });
      assert.equal(response.status, 409, conflict);
      assert.match((await response.json()).error, /identity conflict/i);
    } finally { await close(server); }
  }
});

test("member login rejects an unverified Google identity before registration", async () => {
  let resolutionCalls = 0;
  const app = express();
  app.use(express.json());
  app.post("/login", createMemberFirebaseLoginHandler({
    verifyIdToken: async () => ({ uid: "user", email: "user@example.test", email_verified: false, firebase: { sign_in_provider: "google.com" } }),
    resolveMember: async () => { resolutionCalls++; return null; }
  }));
  const server = await listen(app);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: "token" }) });
    assert.equal(response.status, 403);
    assert.equal(resolutionCalls, 0);
  } finally { await close(server); }
});

test("member authorization uses the linked Firebase UID and session version", async () => {
  const app = express();
  app.use(session(createAdminSessionOptions({ secret: "unit-test-session-secret-at-least-32-bytes", store: new session.MemoryStore() })));
  app.get("/progress", (req, res, next) => {
    req.session.role = "member";
    req.session.memberId = "member-1";
    req.session.firebaseUid = req.query.uid;
    req.session.memberSessionVersion = 2;
    next();
  }, createMemberOnly({ findActiveMemberById: async (id, uid, version) => id === "member-1" && uid === "google-user" && version === 2 ? { id } : null }), (req, res) => res.json(req.member));
  const server = await listen(app);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(`${base}/progress?uid=google-user`)).status, 200);
    assert.equal((await fetch(`${base}/progress?uid=another-user`)).status, 401);
  } finally { await close(server); }
});

test("first-time verified Google identities get an idempotent personal profile without group membership", async () => {
  const rows = new Map();
  const collection = {
    async updateOne(filter, update) {
      const previous = rows.get(filter.firebaseUid);
      const next = previous ? { ...previous } : { ...update.$setOnInsert };
      Object.assign(next, update.$set);
      rows.set(filter.firebaseUid, next);
      return { upsertedId: previous ? null : next._id };
    },
    async findOne(filter) { return rows.get(filter.firebaseUid) || null; }
  };
  const resolve = createPersonalProfileResolver({ collection, clock: () => new Date("2026-10-24T00:00:00.000Z") });
  const identity = { id: "member-personal-1", firebaseUid: "google-user", email: "person@example.test", displayName: "Person", photoUrl: "https://example.test/photo" };
  const first = await resolve(identity);
  assert.equal(first.created, true);
  assert.equal(first.profile.onboarding, true);
  assert.equal(first.profile.leetCodeUsername, null);
  const second = await resolve({ ...identity, displayName: "Person Updated" });
  assert.equal(second.created, false);
  assert.equal(rows.size, 1);
  assert.equal(second.profile._id, first.profile._id);
  assert.equal(second.profile.displayName, "Person Updated");
});

test("personal-profile initialization leaves existing group progress untouched", async () => {
  const groupState = { members: [{ id: "member-1", name: "Approved" }], weeks: { "1": { daily: { "member-1": ["done"] } } } };
  const before = structuredClone(groupState);
  const rows = new Map();
  const resolve = createPersonalProfileResolver({
    collection: {
      async updateOne(filter, update) { rows.set(filter.firebaseUid, { ...update.$setOnInsert, ...update.$set }); return { upsertedId: "personal-id" }; },
      async findOne(filter) { return rows.get(filter.firebaseUid); }
    }
  });
  await resolve({ id: "personal-id", firebaseUid: "new-google-user", email: "new@example.test", displayName: "New" });
  assert.deepEqual(groupState, before);
});

test("a newly onboarded personal account cannot read private group data", async () => {
  const app = express();
  app.use(session(createAdminSessionOptions({ secret: "unit-test-session-secret-at-least-32-bytes", store: new session.MemoryStore() })));
  app.get("/login-as-personal", (req, res) => {
    req.session.role = "member";
    req.session.memberId = "member-personal";
    req.session.firebaseUid = "google-personal";
    req.session.save(error => error ? res.sendStatus(500) : res.json({ ok: true }));
  });
  let privateDataReads = 0;
  app.get("/api/data", createAdminOnly(req => req.session?.role === "admin"), (_req, res) => {
    privateDataReads++;
    res.json({ members: [{ id: "private-member" }] });
  });
  const server = await listen(app);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const login = await fetch(`${base}/login-as-personal`);
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const response = await fetch(`${base}/api/data?memberId=private-member`, { headers: { cookie } });
    assert.equal(response.status, 403);
    assert.equal(privateDataReads, 0);
  } finally { await close(server); }
});

test("an admin who is also a linked member can use member-only routes", async () => {
  const app = express();
  app.use(session(createAdminSessionOptions({ secret: "unit-test-session-secret-at-least-32-bytes", store: new session.MemoryStore() })));
  app.get("/member", (req, res, next) => {
    req.session.role = "admin";
    req.session.adminEmail = "admin@example.test";
    req.session.memberId = "member-admin";
    next();
  }, createMemberOnly({
    findActiveMemberById: async () => null,
    findActiveAdminMemberById: async (id, email) => id === "member-admin" && email === "admin@example.test" ? { id, name: "Admin Member" } : null
  }), (req, res) => res.json(req.member));
  const server = await listen(app);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/member`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { id: "member-admin", name: "Admin Member" });
  } finally { await close(server); }
});

test("member progress permits only self-owned scheduled updates", () => {
  assert.deepEqual(validateOwnProgressUpdate({ week: 1, kind: "daily", slot: 0, status: "done" }, { maxWeeks: 27, scheduledSlots: () => [0] }), { week: 1, kind: "daily", slot: 0, status: "done", maxSlots: 6 });
  assert.equal(validateOwnProgressUpdate({ week: 1, kind: "daily", slot: 1, status: "done", memberId: "another-member" }, { maxWeeks: 27, scheduledSlots: () => [0] }), null);
});

test("server removes activation and password endpoints while retaining member ownership checks", () => {
  const serverSource = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.doesNotMatch(serverSource, /memberAccounts/);
  assert.doesNotMatch(serverSource, /\/api\/member\/activate/);
  assert.doesNotMatch(serverSource, /\/activation/);
  assert.match(serverSource, /app\.post\("\/api\/member\/login", memberLoginLimit, memberLogin\)/);
  assert.match(serverSource, /app\.post\("\/api\/member\/progress", memberOnly,/);
  assert.match(serverSource, /app\.put\("\/api\/admin\/members\/:memberId\/firebase-link", adminOnly,/);
  assert.match(serverSource, /Set FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID, and FIREBASE_APP_ID/);
});
