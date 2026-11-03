"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const session = require("express-session");

const {
  groupDailySubmissions,
  resolveDifficulty,
  KNOWN_PROBLEM_DIFFICULTIES
} = require("../daily-activity-helper");
const { effectiveActivityDate } = require("../activity-date");

const root = path.resolve(__dirname, "..");

test("resolveDifficulty resolves known problem difficulties and respects explicit values", () => {
  assert.equal(resolveDifficulty("two-sum"), "Easy");
  assert.equal(resolveDifficulty("add-two-numbers"), "Medium");
  assert.equal(resolveDifficulty("trapping-rain-water"), "Hard");
  assert.equal(resolveDifficulty("unknown-problem-123"), null);
  assert.equal(resolveDifficulty("unknown-problem-123", "Hard"), "Hard");
  assert.equal(resolveDifficulty("two-sum", "Medium"), "Medium"); // explicit override
});

test("groupDailySubmissions formats a single submission correctly", () => {
  const submissions = [
    {
      submissionId: "sub-101",
      problemTitle: "Two Sum",
      problemSlug: "two-sum",
      verdict: "Accepted",
      language: "python3",
      submittedAt: new Date("2026-11-03T10:00:00.000Z")
    }
  ];

  const result = groupDailySubmissions(submissions);
  assert.equal(result.length, 1);
  const q = result[0];
  assert.equal(q.title, "Two Sum");
  assert.equal(q.titleSlug, "two-sum");
  assert.equal(q.difficulty, "Easy");
  assert.equal(q.status, "Accepted");
  assert.equal(q.hasAccepted, true);
  assert.equal(q.language, "python3");
  assert.equal(q.attemptsCount, 1);
  assert.deepEqual(q.verdicts, ["Accepted"]);
  assert.equal(q.url, "https://leetcode.com/problems/two-sum/");
  assert.equal(new Date(q.submittedAt).toISOString(), "2026-11-03T10:00:00.000Z");
});

test("groupDailySubmissions handles multiple distinct problems today", () => {
  const submissions = [
    {
      submissionId: "sub-1",
      problemTitle: "Two Sum",
      problemSlug: "two-sum",
      verdict: "Accepted",
      language: "python3",
      submittedAt: new Date("2026-11-03T09:00:00.000Z")
    },
    {
      submissionId: "sub-2",
      problemTitle: "Add Two Numbers",
      problemSlug: "add-two-numbers",
      verdict: "Accepted",
      language: "cpp",
      submittedAt: new Date("2026-11-03T10:30:00.000Z")
    },
    {
      submissionId: "sub-3",
      problemTitle: "Reverse Linked List",
      problemSlug: "reverse-linked-list",
      verdict: "Wrong Answer",
      language: "java",
      submittedAt: new Date("2026-11-03T11:15:00.000Z")
    }
  ];

  const result = groupDailySubmissions(submissions);
  assert.equal(result.length, 3);
  // Should be sorted most recent submission first: sub-3, then sub-2, then sub-1
  assert.equal(result[0].titleSlug, "reverse-linked-list");
  assert.equal(result[0].status, "Wrong Answer");
  assert.equal(result[0].language, "java");

  assert.equal(result[1].titleSlug, "add-two-numbers");
  assert.equal(result[1].status, "Accepted");
  assert.equal(result[1].difficulty, "Medium");

  assert.equal(result[2].titleSlug, "two-sum");
  assert.equal(result[2].status, "Accepted");
  assert.equal(result[2].difficulty, "Easy");
});

test("groupDailySubmissions deduplicates multiple attempts of the same problem cleanly", () => {
  // Scenario: 2 Wrong Answers followed by 1 Accepted
  const submissions = [
    {
      submissionId: "sub-1",
      problemTitle: "Median of Two Sorted Arrays",
      problemSlug: "median-of-two-sorted-arrays",
      verdict: "Wrong Answer",
      language: "python3",
      submittedAt: new Date("2026-11-03T08:00:00.000Z")
    },
    {
      submissionId: "sub-2",
      problemTitle: "Median of Two Sorted Arrays",
      problemSlug: "median-of-two-sorted-arrays",
      verdict: "Time Limit Exceeded",
      language: "python3",
      submittedAt: new Date("2026-11-03T08:15:00.000Z")
    },
    {
      submissionId: "sub-3",
      problemTitle: "Median of Two Sorted Arrays",
      problemSlug: "median-of-two-sorted-arrays",
      verdict: "Accepted",
      language: "python3",
      submittedAt: new Date("2026-11-03T08:30:00.000Z")
    }
  ];

  const result = groupDailySubmissions(submissions);
  // Grouped into exactly one card
  assert.equal(result.length, 1);
  const q = result[0];
  assert.equal(q.title, "Median of Two Sorted Arrays");
  assert.equal(q.titleSlug, "median-of-two-sorted-arrays");
  assert.equal(q.difficulty, "Hard");
  assert.equal(q.status, "Accepted");
  assert.equal(q.hasAccepted, true);
  assert.equal(q.attemptsCount, 3);
  assert.deepEqual(q.verdicts, ["Wrong Answer", "Time Limit Exceeded", "Accepted"]);
  assert.equal(new Date(q.submittedAt).toISOString(), "2026-11-03T08:30:00.000Z");
});

test("groupDailySubmissions returns empty array for empty submissions list", () => {
  assert.deepEqual(groupDailySubmissions([]), []);
  assert.deepEqual(groupDailySubmissions(null), []);
});

test("effectiveActivityDate correctly enforces 05:30 IST rollover boundary", () => {
  // 05:29:59 IST is 23:59:59 UTC of previous day -> belongs to previous date
  // 2026-11-03 05:29:59 IST = 2026-11-02 23:59:59 UTC
  const preRolloverSeconds = Math.floor(Date.parse("2026-11-02T23:59:59.000Z") / 1000);
  assert.equal(effectiveActivityDate(preRolloverSeconds, "Asia/Kolkata"), "2026-11-02");

  // 2026-11-03 05:30:00 IST = 2026-11-03 00:00:00 UTC
  const postRolloverSeconds = Math.floor(Date.parse("2026-11-03T00:00:00.000Z") / 1000);
  assert.equal(effectiveActivityDate(postRolloverSeconds, "Asia/Kolkata"), "2026-11-03");
});

test("profile HTML contains Daily LeetCode Activity section with required UI hooks", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /id="routeProfileDailySection"/);
  assert.match(html, /id="routeProfileDailyTitle"/);
  assert.match(html, /id="routeProfileDailyDate"/);
  assert.match(html, /id="routeProfileDailySyncBtn"/);
  assert.match(html, /id="routeProfileDailyStatus"/);
  assert.match(html, /id="routeProfileDailyContent"/);
  assert.match(html, /Daily LeetCode Activity/);
  assert.match(html, /Refresh Activity/);
});

test("profile style.css contains responsive Daily LeetCode Activity styles", () => {
  const css = fs.readFileSync(path.join(root, "style.css"), "utf8");
  assert.match(css, /\.profile-daily-section/);
  assert.match(css, /\.profile-daily-grid/);
  assert.match(css, /\.daily-question-card/);
  assert.match(css, /\.badge-difficulty/);
  assert.match(css, /\.badge-status\.status-accepted/);
  assert.match(css, /\.badge-status\.status-attempted/);
  assert.match(css, /\.badge-attempts/);
  assert.match(css, /\.badge-lang/);
  assert.match(css, /\.profile-daily-empty/);
  assert.match(css, /\.profile-daily-private/);
});

test("script.js includes daily activity rendering, isolation checks, and sync binding", () => {
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
  assert.match(script, /renderProfileDailyActivity/);
  assert.match(script, /renderDailyQuestionCard/);
  assert.match(script, /routeProfileDailySyncBtn/);
  assert.match(script, /Activity is private/);
  assert.match(script, /No LeetCode questions detected for today/);
  assert.match(script, /api\/profile\/\$\{encodeURIComponent\(currentProfileMemberId\)\}\?sync=1/);
});


function listen(app) {
  return new Promise(resolve => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function close(server) {
  server.closeAllConnections();
  return new Promise(resolve => server.close(resolve));
}

test("profile endpoint daily activity integration: privacy isolation and grouping", async () => {
  const app = express();
  app.use(express.json());
  app.use(session({
    secret: "test-secret-at-least-32-chars-long!!",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  }));

  // Mock session setter
  app.get("/test-login/:id", (req, res) => {
    req.session.role = "member";
    req.session.memberId = req.params.id;
    req.session.firebaseUid = `uid-${req.params.id}`;
    req.session.save(() => res.json({ ok: true }));
  });

  const today = "2026-11-03";
  const yesterday = "2026-11-02";

  // Mock members
  const members = [
    { id: "member-1", name: "Alice", email: "alice@example.com", leetCodeUsername: "alice_lc" },
    { id: "member-2", name: "Bob", email: "bob@example.com", leetCodeUsername: "bob_lc" }
  ];

  // Mock submissions database
  const submissionsStore = [
    // Alice's submissions today: 2 attempts on Two Sum (1 Wrong Answer, 1 Accepted), 1 attempt on Add Two Numbers
    {
      id: "s1",
      userId: "member-1",
      activityDate: today,
      problemTitle: "Two Sum",
      problemSlug: "two-sum",
      verdict: "Wrong Answer",
      language: "python3",
      submittedAt: new Date("2026-11-03T08:00:00.000Z")
    },
    {
      id: "s2",
      userId: "member-1",
      activityDate: today,
      problemTitle: "Two Sum",
      problemSlug: "two-sum",
      verdict: "Accepted",
      language: "python3",
      submittedAt: new Date("2026-11-03T08:10:00.000Z")
    },
    {
      id: "s3",
      userId: "member-1",
      activityDate: today,
      problemTitle: "Add Two Numbers",
      problemSlug: "add-two-numbers",
      verdict: "Accepted",
      language: "java",
      submittedAt: new Date("2026-11-03T09:00:00.000Z")
    },
    // Alice's submission yesterday (must NOT be returned today)
    {
      id: "s4",
      userId: "member-1",
      activityDate: yesterday,
      problemTitle: "LRU Cache",
      problemSlug: "lru-cache",
      verdict: "Accepted",
      language: "python3",
      submittedAt: new Date("2026-11-02T10:00:00.000Z")
    }
  ];

  // Mock endpoint mirroring server.js logic
  app.get("/api/profile/:memberId", (req, res) => {
    const memberId = req.params.memberId;
    const member = members.find(m => m.id === memberId);
    if (!member) return res.status(404).json({ error: "Profile not found." });

    const isOwner = req.session?.memberId === memberId;
    let dailyActivity = null;

    if (isOwner) {
      const todaySubmissions = submissionsStore.filter(s => s.userId === memberId && s.activityDate === today);
      const questions = groupDailySubmissions(todaySubmissions);
      dailyActivity = {
        date: today,
        timezone: "Asia/Kolkata",
        lastSyncedAt: new Date().toISOString(),
        syncStatus: "success",
        totalSubmissions: todaySubmissions.length,
        questionsCount: questions.length,
        acceptedCount: questions.filter(q => q.hasAccepted).length,
        questions
      };
    }

    res.json({
      id: member.id,
      name: member.name,
      leetCodeUsername: member.leetCodeUsername,
      stats: { total: 100, easy: 50, medium: 40, hard: 10 },
      dailyActivity
    });
  });

  const server = await listen(app);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;

    // 1. Log in as Alice (member-1)
    const loginRes1 = await fetch(`${base}/test-login/member-1`);
    const cookieAlice = loginRes1.headers.get("set-cookie").split(";")[0];

    // Alice views her own profile: should get dailyActivity with 2 unique questions (Two Sum deduplicated to 1 card with 2 attempts)
    const aliceSelfRes = await fetch(`${base}/api/profile/member-1`, { headers: { cookie: cookieAlice } });
    assert.equal(aliceSelfRes.status, 200);
    const aliceSelfData = await aliceSelfRes.json();
    assert.ok(aliceSelfData.dailyActivity, "Alice must receive dailyActivity on her own profile");
    assert.equal(aliceSelfData.dailyActivity.date, today);
    assert.equal(aliceSelfData.dailyActivity.questionsCount, 2);
    assert.equal(aliceSelfData.dailyActivity.totalSubmissions, 3);
    assert.equal(aliceSelfData.dailyActivity.questions.length, 2);

    // Verify deduplication of Two Sum
    const twoSum = aliceSelfData.dailyActivity.questions.find(q => q.titleSlug === "two-sum");
    assert.ok(twoSum, "Two Sum card exists");
    assert.equal(twoSum.attemptsCount, 2, "Two Sum grouped both attempts");
    assert.equal(twoSum.status, "Accepted", "Latest status is Accepted");
    assert.deepEqual(twoSum.verdicts, ["Wrong Answer", "Accepted"]);
    assert.equal(twoSum.difficulty, "Easy");

    // Verify yesterday's question (LRU Cache) is NOT in today's active questions
    const lruCache = aliceSelfData.dailyActivity.questions.find(q => q.titleSlug === "lru-cache");
    assert.equal(lruCache, undefined, "Yesterday's submission must not appear in today's daily activity");

    // 2. Alice views Bob's profile (member-2): dailyActivity MUST BE null (account privacy & isolation)
    const aliceViewsBobRes = await fetch(`${base}/api/profile/member-2`, { headers: { cookie: cookieAlice } });
    assert.equal(aliceViewsBobRes.status, 200);
    const aliceViewsBobData = await aliceViewsBobRes.json();
    assert.equal(aliceViewsBobData.dailyActivity, null, "Other member's daily activity must be strictly private (null)");

    // 3. Log in as Bob (member-2)
    const loginRes2 = await fetch(`${base}/test-login/member-2`);
    const cookieBob = loginRes2.headers.get("set-cookie").split(";")[0];

    // Bob views Bob's profile (no submissions today): should get dailyActivity with questions: []
    const bobSelfRes = await fetch(`${base}/api/profile/member-2`, { headers: { cookie: cookieBob } });
    assert.equal(bobSelfRes.status, 200);
    const bobSelfData = await bobSelfRes.json();
    assert.ok(bobSelfData.dailyActivity, "Bob receives dailyActivity on his own profile");
    assert.equal(bobSelfData.dailyActivity.questions.length, 0, "Empty state when no questions submitted today");

    // Bob views Alice's profile: dailyActivity MUST BE null
    const bobViewsAliceRes = await fetch(`${base}/api/profile/member-1`, { headers: { cookie: cookieBob } });
    assert.equal(bobViewsAliceRes.status, 200);
    const bobViewsAliceData = await bobViewsAliceRes.json();
    assert.equal(bobViewsAliceData.dailyActivity, null, "Alice's daily activity must be strictly private to Bob");
  } finally {
    await close(server);
  }
});
