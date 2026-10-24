"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

test("frontend keeps session role distinct from the linked member profile and exposes explicit mode switches", () => {
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(script, /isAdmin = session\.role === "admin";/);
  assert.match(script, /isMember = session\.role === "member";/);
  assert.match(script, /isMember = sessionData\.role === "member";/);
  assert.match(script, /adminSwitchMemberBtn"\)\.addEventListener\("click", openMemberLoginDialog\)/);
  assert.match(script, /memberSwitchAdminBtn"\)\.addEventListener\("click"/);
  assert.match(html, /id="adminSwitchMemberBtn"/);
  assert.match(html, /id="memberSwitchAdminBtn"/);
  assert.match(html, /Member Mode/);
  assert.match(script, /document\.querySelector\("\.app-shell"\)\.hidden = !authenticated/);
  assert.match(script, /\$\("memberHome"\)\.hidden = true/);
  assert.match(script, /apiRequest\(isAdmin \? "\/api\/data" : "\/api\/member\/shared-data"\)/);
  assert.match(script, /if \(requestedProfile\) await openProfileRoute\(requestedProfile\[1\]\);\s*else showPage\("overview"\)/);
});

test("member shared dashboard uses safe read-only data and page reads while writes stay admin-only", () => {
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(server, /app\.get\("\/api\/member\/shared-data", memberOnly/);
  assert.match(server, /members: document\.members\.map\(\(\{ id, name, role \}\) => \(\{ id, name, role \}\)\)/);
  assert.match(server, /app\.get\("\/api\/page-data\/:page", dashboardViewer/);
  assert.match(server, /app\.post\("\/api\/data", adminOnly/);
  assert.match(server, /app\.post\("\/api\/admin\/import", adminOnly/);
});

test("member interface has no edit controls for tracker progress or LeetCode identity", () => {
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(script, /\$\("memberLeetCodeForm"\)\.hidden = true/);
  assert.doesNotMatch(script.slice(script.indexOf("function renderMemberProgress()"), script.indexOf("function setMemberDashboardLoading()")), /data-member-progress-kind/);
  assert.match(server, /app\.put\("\/api\/member\/profile", memberOnly, \(_req, res\) => res\.status\(403\)/);
  assert.match(server, /app\.post\("\/api\/member\/progress", memberOnly, \(_req, res\) => res\.status\(403\)/);
  assert.match(server, /app\.post\("\/api\/data", adminOnly/);
});

test("profile route identifiers, refresh handling, and Back to Dashboard control remain present", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
  assert.match(html, /id="profileRoutePage"/);
  assert.match(html, /id="profileBackToDashboard"/);
  assert.match(script, /location\.pathname\.match\(\/\^\\\/profile/);
  assert.match(script, /addEventListener\("popstate"/);
});
