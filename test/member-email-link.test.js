"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { createAdminOnly } = require("../admin-auth");
const { createMemberEmailLinkHandler } = require("../member-email-link");

const kartik = { id: "member_mvggbpb5y8e3h9", name: "Kartik Kumar", email: "kk@gmail.com" };
const approvedEmail = "2k25cse2513784@gmail.com";

function response() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

function handler(overrides = {}) {
  const calls = { dashboard: [], link: [], audit: [] };
  const route = createMemberEmailLinkHandler({
    findDashboardMemberById: async id => id === kartik.id ? kartik : null,
    findDashboardMemberByEmail: async () => null,
    findOtherAuthLinkByEmail: async () => null,
    updateDashboardMemberEmail: async (id, email) => { calls.dashboard.push({ id, email }); return true; },
    updateAuthLinkEmail: async (id, email) => { calls.link.push({ id, email }); },
    audit: (_req, action, id) => calls.audit.push({ action, id }),
    ...overrides
  });
  return { route, calls };
}

test("primary-admin email reconciliation preserves the existing member identity and link fields", async () => {
  const { route, calls } = handler();
  const res = response();
  await route({ params: { memberId: kartik.id }, body: { email: ` ${approvedEmail.toUpperCase()} ` } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.member, { id: kartik.id, name: "Kartik Kumar", email: approvedEmail });
  assert.deepEqual(calls.dashboard, [{ id: kartik.id, email: approvedEmail }]);
  assert.deepEqual(calls.link, [{ id: kartik.id, email: approvedEmail }]);
  assert.deepEqual(calls.audit, [{ action: "member-email-linked", id: kartik.id }]);
});

test("email reconciliation rejects unapproved and duplicate identities without mutating the member", async () => {
  for (const scenario of [
    { email: "outside@example.com", expected: 400 },
    { email: approvedEmail, expected: 409, findDashboardMemberByEmail: async () => ({ id: "other", name: "Other" }) },
    { email: approvedEmail, expected: 409, findOtherAuthLinkByEmail: async () => ({ _id: "other" }) }
  ]) {
    const { route, calls } = handler(scenario);
    const res = response();
    await route({ params: { memberId: kartik.id }, body: { email: scenario.email } }, res);
    assert.equal(res.statusCode, scenario.expected);
    assert.equal(calls.dashboard.length, 0);
    assert.equal(calls.link.length, 0);
  }
});

test("unauthenticated and member-mode requests cannot reach the email update handler", async () => {
  const guard = createAdminOnly(req => req.session?.role === "admin" && typeof req.session.adminEmail === "string");
  for (const [session, expected] of [[{}, 401], [{ role: "member", memberId: kartik.id, firebaseUid: "uid" }, 403]]) {
    const res = response();
    let reached = false;
    guard({ session }, res, () => { reached = true; });
    assert.equal(res.statusCode, expected);
    assert.equal(reached, false);
  }
});

test("Members Manage uses an explicit menu controller and confirmed email form", () => {
  const root = path.resolve(__dirname, "..");
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "style.css"), "utf8");
  assert.match(script, /data-member-menu=/);
  assert.match(script, /dataset\.memberManagerBound/);
  assert.match(script, /event\.stopPropagation\(\)/);
  assert.match(script, /openMemberEmailDialog\(member\)/);
  assert.match(script, /memberEmailForm"\)\.addEventListener\("submit"/);
  assert.match(html, /id="memberEmailDialog"/);
  assert.match(html, /id="memberEmailMemberId"/);
  assert.match(server, /app\.put\("\/api\/admin\/members\/:memberId\/email-link", adminOnly, primaryAdminOnly, memberEmailLink\)/);
  assert.match(script, /closeMemberActionMenus/);
  assert.match(script, /event\.key === "Escape"/);
  assert.match(css, /\.managed-member\.is-managing \{\s*flex-wrap: wrap/);
  assert.match(css, /\.member-actions-menu\.is-open \.member-actions \{ position: static/);
});
