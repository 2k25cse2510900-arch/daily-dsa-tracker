"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { PROFILES, profileForMember, parseStats, publicRecord, parseRecentSubmissions, dateInTimezone, effectiveActivityDate, trackerPosition, activityForDate, inspectMemberActivity } = require("../leetcode");
const { createAdminOnly } = require("../admin-auth");

test("maps the eight requested profiles to existing member names", () => {
  assert.equal(PROFILES.length, 8);
  assert.deepEqual(PROFILES.map(profile => profile.username), [
    "KrishChaddha106", "Kartik_kumar_29", "tanmayawasthi_code", "avan_tika2776",
    "1729kshitij", "Deepanshu_Sachan", "Kanika_Dwii", "KrishnaKumarGaur"
  ]);
  assert.equal(profileForMember({ name: "Krish" }).username, "KrishChaddha106");
  assert.equal(profileForMember({ name: "Krish (ADMIN)" }).username, "KrishChaddha106");
  assert.equal(profileForMember({ name: "Someone else" }), undefined);
});

test("validates required public solved counts and tolerates missing optional rank", () => {
  const data = { data: { matchedUser: { username: "sample", profile: {}, submitStats: { acSubmissionNum: [
    { difficulty: "All", count: 12 }, { difficulty: "Easy", count: 4 },
    { difficulty: "Medium", count: 6 }, { difficulty: "Hard", count: 2 }
  ] } } } };
  assert.deepEqual(parseStats(data, "sample"), { total: 12, easy: 4, medium: 6, hard: 2, globalRanking: null });
  assert.throws(() => parseStats({ data: { matchedUser: null } }, "sample"), /PROFILE_UNAVAILABLE/);
  assert.throws(() => parseStats({ data: { matchedUser: { username: "sample", submitStats: { acSubmissionNum: [] } } } }, "sample"), /INVALID_STATS/);
});

test("public projection keeps cached values visible after fetch failure", () => {
  const prior = { stats: { total: 9, easy: 2, medium: 5, hard: 2 }, lastFetchedAt: new Date(), status: "Unavailable", error: "UPSTREAM_UNAVAILABLE" };
  const projected = publicRecord(prior, { username: "sample" }, "member-1");
  assert.deepEqual(projected.stats, prior.stats);
  assert.equal(projected.status, "Unavailable");
  assert.equal(projected.stale, true);
});

const submission = (statusDisplay, timestamp = Math.floor(Date.parse("2026-10-22T12:00:00Z") / 1000)) => ({
  title: "Two Sum", titleSlug: "two-sum", timestamp: String(timestamp), statusDisplay, lang: "python3"
});

test("the effective activity date changes exactly at 05:30 IST", () => {
  const cases = [
    ["2026-10-22T05:29:59+05:30", "2026-10-21"],
    ["2026-10-22T05:30:00+05:30", "2026-10-22"],
    ["2026-10-22T05:29:59.999+05:30", "2026-10-21"],
    ["2026-10-22T05:30:00.001+05:30", "2026-10-22"]
  ];
  for (const [instant, expected] of cases) assert.equal(effectiveActivityDate(Date.parse(instant) / 1000), expected, instant);
});

test("civil midnight does not roll over the activity date", () => {
  assert.equal(effectiveActivityDate(Date.parse("2026-10-21T23:59:59+05:30") / 1000), "2026-10-21");
  assert.equal(effectiveActivityDate(Date.parse("2026-10-22T00:00:00+05:30") / 1000), "2026-10-21");
  assert.equal(effectiveActivityDate(Date.parse("2026-10-22T05:29:59+05:30") / 1000), "2026-10-21");
  assert.equal(effectiveActivityDate(Date.parse("2026-10-22T05:30:00+05:30") / 1000), "2026-10-22");
});

test("activity filtering assigns boundary submissions to the correct tracker day", async () => {
  const beforeBoundary = Math.floor(Date.parse("2026-10-21T23:59:59Z") / 1000);
  const atBoundary = Math.floor(Date.parse("2026-10-22T00:00:00Z") / 1000);
  const rows = [submission("Wrong Answer", beforeBoundary), submission("Accepted", atBoundary)];
  assert.deepEqual(activityForDate(rows, "2026-10-21").attempts.map(row => row.statusDisplay), ["Wrong Answer"]);
  assert.deepEqual(activityForDate(rows, "2026-10-22").attempts.map(row => row.statusDisplay), ["Accepted"]);

  let writes = 0;
  const beforeDay = await inspectMemberActivity({ fetchSubmissions: async () => [rows[0]], username: "sample", date: "2026-10-21", markDone: async () => { writes++; return true; } });
  assert.equal(beforeDay.verified, true);
  const afterDay = await inspectMemberActivity({ fetchSubmissions: async () => [rows[1]], username: "sample", date: "2026-10-22", markDone: async () => { writes++; return true; } });
  assert.equal(afterDay.verified, true);
  const wrongDay = await inspectMemberActivity({ fetchSubmissions: async () => [rows[0]], username: "sample", date: "2026-10-22", markDone: async () => { writes++; return true; } });
  assert.equal(wrongDay.verified, false);
  assert.equal(writes, 2);
});

test("an Accepted submission verifies the selected India date and marks Done", async () => {
  let marked = false;
  const result = await inspectMemberActivity({
    fetchSubmissions: async () => parseRecentSubmissions({ data: { matchedUser: { username: "sample" }, recentSubmissionList: [submission("Accepted")] } }, "sample"),
    username: "sample", date: "2026-10-22", markDone: async () => { marked = true; return true; }
  });
  assert.equal(dateInTimezone(Number(submission("Accepted").timestamp)), "2026-10-22");
  assert.equal(result.verified, true);
  assert.equal(result.updated, true);
  assert.equal(marked, true);
});

test("a Wrong Answer submission also verifies an attempt", async () => {
  const result = await inspectMemberActivity({ fetchSubmissions: async () => [submission("Wrong Answer")], username: "sample", date: "2026-10-22", markDone: async () => true });
  assert.equal(result.verified, true);
  assert.equal(result.detail, "Wrong Answer");
  assert.equal(result.updated, true);
});

test("multiple same-date submissions update the tracker entry once", async () => {
  let writes = 0;
  const result = await inspectMemberActivity({
    fetchSubmissions: async () => [submission("Wrong Answer"), submission("Accepted", Math.floor(Date.parse("2026-10-22T12:01:00Z") / 1000))],
    username: "sample", date: "2026-10-22", markDone: async () => { writes++; return true; }
  });
  assert.equal(result.attempts.length, 2);
  assert.equal(writes, 1);
  assert.equal(result.updated, true);
});

test("a submission on another India date does not change the selected date", async () => {
  let writes = 0;
  const priorDateTimestamp = Math.floor(Date.parse("2026-10-21T17:00:00Z") / 1000);
  const result = await inspectMemberActivity({ fetchSubmissions: async () => [submission("Accepted", priorDateTimestamp)], username: "sample", date: "2026-10-22", markDone: async () => { writes++; return true; } });
  assert.equal(dateInTimezone(priorDateTimestamp), "2026-10-21");
  assert.equal(result.verified, false);
  assert.equal(writes, 0);
});

test("API failure is unable to verify and never calls the tracker updater", async () => {
  let writes = 0;
  const result = await inspectMemberActivity({ fetchSubmissions: async () => { throw new Error("RATE_LIMITED"); }, username: "sample", date: "2026-10-22", markDone: async () => { writes++; return true; } });
  assert.equal(result.status, "Unable to verify");
  assert.equal(result.detail, "RATE_LIMITED");
  assert.equal(writes, 0);
});

test("a missing public match never changes an existing manual Done or marks absence", async () => {
  let status = "done";
  let writes = 0;
  const result = await inspectMemberActivity({ fetchSubmissions: async () => [submission("Accepted", Math.floor(Date.parse("2026-10-21T17:00:00Z") / 1000))], username: "sample", date: "2026-10-22", markDone: async () => { writes++; status = "absent"; return true; } });
  assert.equal(result.verified, false);
  assert.equal(writes, 0);
  assert.equal(status, "done");
});

test("non-admin sessions are rejected by the refresh route's admin guard", () => {
  const middleware = createAdminOnly(() => false);
  let nextCalled = false;
  let statusCode;
  let body;
  const response = { status(code) { statusCode = code; return this; }, json(value) { body = value; return this; } };
  middleware({ session: { role: "viewer" } }, response, () => { nextCalled = true; });
  assert.equal(statusCode, 401);
  assert.deepEqual(body, { error: "Authentication required." });
  assert.equal(nextCalled, false);
});

test("selected calendar dates map to the existing Monday-based tracker slot", () => {
  assert.deepEqual(trackerPosition("2026-10-22"), { week: 13, slot: 3 });
  assert.equal(trackerPosition("not-a-date"), null);
});
