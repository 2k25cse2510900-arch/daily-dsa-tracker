"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const express = require("express");
const session = require("express-session");
const { createMemberOnly } = require("../member-auth");
const { calculateCurrentLeetCodeStreak, calculateTotalActiveDays, resolveTodayActivity, calculateTotalMemberPoints, publicSolvedStats, createMemberDashboardHandler } = require("../member-dashboard");
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

test("personal dashboard streak counts only a verified consecutive run with a confirmed boundary", () => {
  assert.equal(calculateCurrentLeetCodeStreak({
    currentDate: "2026-10-23",
    todayHasActivity: false,
    finalizations: [
      { date: "2026-10-22", status: "Done" },
      { date: "2026-10-21", status: "Done" },
      { date: "2026-10-20", status: "Not Submitted" }
    ]
  }), 2);
  assert.equal(calculateCurrentLeetCodeStreak({
    currentDate: "2026-10-23",
    todayHasActivity: true,
    finalizations: [
      { date: "2026-10-22", status: "Done" },
      { date: "2026-10-21", status: "Not Submitted" }
    ]
  }), 2);
  assert.equal(calculateCurrentLeetCodeStreak({ currentDate: "2026-10-23", todayHasActivity: false, finalizations: [{ date: "2026-10-22", status: "Done" }] }), null);
  assert.equal(calculateCurrentLeetCodeStreak({ currentDate: "2026-10-23", todayHasActivity: false, finalizations: [{ date: "2026-10-22", status: "Needs review" }] }), null);
});

test("personal dashboard endpoint uses the authenticated member only and rejects other roles", async () => {
  const app = express();
  app.use(session(createAdminSessionOptions({ secret: "unit-test-session-secret-at-least-32-bytes", store: new session.MemoryStore() })));
  app.get("/test-session/:role", (req, res) => {
    req.session.role = req.params.role;
    req.session.memberId = "member-1";
    req.session.firebaseUid = "firebase-user-1";
    req.session.memberSessionVersion = 0;
    req.session.save(error => error ? res.sendStatus(500) : res.json({ ok: true }));
  });
  const loadedIds = [];
  app.get("/api/member/dashboard", createMemberOnly({
    findActiveMemberById: async (id, uid, version) => id === "member-1" && uid === "firebase-user-1" && version === 0
      ? { id, name: "Member One", role: "Member" }
      : null
  }), createMemberDashboardHandler({
    loadMemberDashboard: async memberId => {
      loadedIds.push(memberId);
      return {
        questionsSolved: memberId === "member-1" ? 12 : 999,
        leetCodeUsername: "member_one",
        easySolved: 4,
        mediumSolved: 6,
        hardSolved: 2
      };
    }
  }));
  const server = await listen(app);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const sessionResponse = await fetch(`${base}/test-session/member`);
    const cookie = sessionResponse.headers.get("set-cookie").split(";")[0];
    const dashboardResponse = await fetch(`${base}/api/member/dashboard?memberId=member-2`, { headers: { cookie } });
    assert.equal(dashboardResponse.status, 200);
    assert.deepEqual(await dashboardResponse.json(), {
      memberName: "Member One",
      memberEmail: null,
      groupMember: false,
      photoUrl: null,
      leetCodeUsername: "member_one",
      questionsSolved: 12,
      easySolved: 4,
      mediumSolved: 6,
      hardSolved: 2
    });
    assert.deepEqual(loadedIds, ["member-1"]);

    const adminSession = await fetch(`${base}/test-session/admin`);
    const adminCookie = adminSession.headers.get("set-cookie").split(";")[0];
    assert.equal((await fetch(`${base}/api/member/dashboard`, { headers: { cookie: adminCookie } })).status, 401);
    assert.deepEqual(loadedIds, ["member-1"]);
  } finally { await close(server); }
});

test("personal dashboard reports missing profile and activity fields without inventing values", async () => {
  const handler = createMemberDashboardHandler({ loadMemberDashboard: async () => ({}) });
  let responseBody;
  const response = {
    status(code) { this.statusCode = code; return this; },
    json(body) { responseBody = body; return this; }
  };
  await handler({ member: { id: "member-1", name: "Member One" } }, response);
  assert.equal(response.statusCode, undefined);
  assert.deepEqual(responseBody, {
    memberName: "Member One",
    memberEmail: null,
    groupMember: false,
    photoUrl: null,
    leetCodeUsername: null,
    questionsSolved: null,
    easySolved: null,
    mediumSolved: null,
    hardSolved: null
  });
});

test("personal dashboard navigation is integrated and provides a return path", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
  assert.match(script, /class="member-avatar member-profile-open"/);
  assert.match(script, /class="member-name-profile member-profile-open"/);
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(html, /<nav class="member-view-nav" aria-label="Member navigation">[\s\S]*?id="memberDashboardNav"[^>]*>My Profile<\/button>[\s\S]*?id="memberProgressNav"[^>]*>My Progress<\/button>/);
  assert.match(html, /id="memberDashboardOpen"[^>]*aria-controls="memberPersonalDashboard"/);
  assert.match(html, /id="memberDashboardSolved"/);
  assert.match(html, /id="memberDashboardEasy"/);
  assert.match(html, /id="memberDashboardMedium"/);
  assert.match(html, /id="memberDashboardHard"/);
  assert.match(html, /id="memberProfilePhoto"/);
  assert.match(html, /id="memberLeetCodeForm"/);
  assert.match(script, /apiRequest\("\/api\/member\/dashboard"\)/);
  const styles = fs.readFileSync(path.join(root, "style.css"), "utf8");
  assert.match(styles, /\.member-view-nav/);
  assert.match(styles, /\*\[hidden\]\s*\{\s*display:\s*none\s*!important;/);
  assert.match(script, /function showMemberPersonalDashboard\(\)/);
  assert.match(script, /function showMemberProgressView\(\)/);
  assert.match(script, /\$\("memberProgressNav"\)\.hidden = !data\.groupMember/);
  assert.match(script, /if \(!memberProfile\?\.groupMember\) return/);
  assert.ok(script.indexOf("initializeMemberDashboardNavigation();") < script.indexOf("initializeSecurityControls();"));
  assert.match(server, /app\.get\("\/api\/member\/dashboard", memberOnly,/);
  assert.match(server, /app\.put\("\/api\/member\/profile", memberOnly/);
  const panel = html.match(/<section id="memberPersonalDashboard"[\s\S]*?<\/section>/)?.[0] || "";
  assert.ok(panel);
  assert.doesNotMatch(panel, /Daily submissions|Weekly concepts|Leaderboard|Members management/);
});

test("personal dashboard counts distinct verified activity days and resolves today's activity conservatively", () => {
  assert.equal(calculateTotalActiveDays({
    memberId: "member-1",
    currentDate: "2026-10-23",
    activityDates: ["2026-10-20", "2026-10-20", "2026-10-22"],
    finalizations: [
      { _id: "2026-10-21", finalization: { statuses: { "member-1": { status: "Done" } } } },
      { _id: "2026-10-22", finalization: { statuses: { "member-1": { status: "Done" } } } },
      { _id: "2026-10-19", finalization: { statuses: { "member-2": { status: "Done" } } } }
    ],
    completedToday: true
  }), 4);
  assert.equal(resolveTodayActivity({ todaySubmission: true }), true);
  assert.equal(resolveTodayActivity({ collectionStatus: { status: "Attempt verified" } }), true);
  assert.equal(resolveTodayActivity({ collectionStatus: { status: "No attempt observed", detail: "No submission appeared in the latest public response." } }), false);
  assert.equal(resolveTodayActivity({ collectionStatus: { status: "No attempt observed", detail: "Recent response reached its limit." } }), null);
  assert.equal(resolveTodayActivity({ collectionStatus: { status: "Unable to verify" } }), null);
});

test("personal dashboard total points reuse scheduled weekly completion scoring", () => {
  const weeks = {
    "1": { daily: { "member-1": ["done", "done", "blank", "done", "blank", "done"] }, concepts: { "member-1": ["done", "blank"] } },
    "2": { daily: { "member-1": ["done", "done", "done", "done", "done", "done"] }, concepts: { "member-1": ["done", "done"] } },
    "3": { daily: { "member-2": ["done", "done", "done", "done", "done", "done"] }, concepts: { "member-2": ["done", "done"] } }
  };
  assert.equal(calculateTotalMemberPoints({ weeks, memberId: "member-1", maxWeeks: 3, scheduledSlots: () => [0, 1, 2, 3, 4, 5] }), 13);
  assert.equal(calculateTotalMemberPoints({ weeks: null, memberId: "member-1", maxWeeks: 3, scheduledSlots: () => [0] }), null);
});

test("profile LeetCode total is derived from distinct difficulty counts and missing values stay unavailable", () => {
  assert.deepEqual(publicSolvedStats({ total: 999, easy: 42, medium: 18, hard: 5 }), { total: 65, easy: 42, medium: 18, hard: 5 });
  assert.equal(publicSolvedStats({ easy: 42, medium: null, hard: 5 }), null);
});

test("member profile route is refreshable, navigable, and protected by owner or admin checks", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(html, /id="profileRoutePage"/);
  assert.match(html, /id="profileBackToDashboard"[^>]*href="\/"/);
  assert.match(html, /id="routeProfileEmail"/);
  assert.match(html, /id="routeProfileLink"/);
  assert.match(script, /openProfileRoute\(link\.dataset\.openProfile, true\)/);
  assert.match(script, /location\.pathname\.match\(\/\^\\\/profile/);
  assert.match(server, /app\.get\("\/profile\/:memberId"/);
  assert.match(server, /app\.get\("\/api\/profile\/:memberId"/);
  assert.match(server, /const isOwner = !isAdminSession\(req\) && req\.member\?\.id === memberId/);
  assert.match(server, /const canViewGroupProfiles = !isAdminSession\(req\) && Boolean\(req\.member\?\.groupMember\)/);
  assert.match(server, /if \(!isAdminSession\(req\) && !isOwner && !canViewGroupProfiles\)/);
  assert.match(server, /if \(!isAdminSession\(req\) && !isOwner && !member\)/);
});

test("members use the shared Overview as their login landing page and retain profile routes", () => {
  const root = path.join(__dirname, "..");
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
  assert.match(script, /else showPage\("overview"\)/);
  assert.doesNotMatch(script, /history\.replaceState\(\{\}, "", `\/profile\/\$\{encodeURIComponent\(memberProfile\.id\)\}`\)/);
  assert.match(script, /openProfileRoute\(memberProfile\.id, true\)/);
  assert.match(script, /history\.replaceState\(\{\}, "", "\/"\)/);
});
