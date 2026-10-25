"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { effectiveActivityDate, addActivityDays } = require("../activity-date");
const { submissionDocument, persistSubmissionHistory, matchingActivitySubmissions, classifyFinalization, activityDatesToFinalize, manualFinalizationDecision, preserveFinalizationStatus, publicActivityRecord, acquireActivityLease, releaseActivityLease, withActivityLease } = require("../activity-jobs");

const member = { id: "member-1", name: "Test Member" };
const timestamp = value => Math.floor(Date.parse(value) / 1000);
const attempt = (statusDisplay, id, iso = "2026-10-22T00:30:00Z") => ({ id, title: "Two Sum", titleSlug: "two-sum", timestamp: timestamp(iso), statusDisplay, lang: "python3" });

function memoryLocks() {
  const rows = new Map();
  const matches = (row, filter) => Object.entries(filter).every(([key, value]) => {
    if (value && typeof value === "object" && "$exists" in value) return (key in row) === value.$exists;
    return row[key] instanceof Date && value instanceof Date ? row[key].getTime() === value.getTime() : row[key] === value;
  });
  return {
    rows,
    async findOne(filter) { return rows.get(filter._id) || null; },
    async insertOne(document) {
      if (rows.has(document._id)) { const error = new Error("duplicate"); error.code = 11000; throw error; }
      rows.set(document._id, structuredClone(document));
    },
    async updateOne(filter, update) {
      const current = rows.get(filter._id);
      if (!current || !matches(current, filter)) return { modifiedCount: 0 };
      rows.set(filter._id, { ...current, ...structuredClone(update.$set) });
      return { modifiedCount: 1 };
    },
    async deleteOne(filter) {
      const current = rows.get(filter._id);
      if (!current || !matches(current, filter)) return { deletedCount: 0 };
      rows.delete(filter._id);
      return { deletedCount: 1 };
    }
  };
}

test("persistent submission records use the shared 05:30 IST activity date", () => {
  const before = submissionDocument(member, "SampleUser", attempt("Wrong Answer", "101", "2026-10-21T23:59:59Z"));
  const at = submissionDocument(member, "SampleUser", attempt("Accepted", "102", "2026-10-22T00:00:00Z"));
  assert.equal(effectiveActivityDate(before.timestamp), "2026-10-21");
  assert.equal(before.activityDate, "2026-10-21");
  assert.equal(at.activityDate, "2026-10-22");
  assert.equal(before.verdict, "Wrong Answer");
  assert.equal(before.submissionId, "101");
});

test("persistence is deduplicated and does not overwrite the first observed record", async () => {
  const stored = new Map();
  const collection = {
    async updateOne(filter, update) {
      const existing = stored.get(filter._id);
      if (existing) return { upsertedCount: 0 };
      stored.set(filter._id, structuredClone(update.$setOnInsert));
      return { upsertedCount: 1 };
    }
  };
  const first = attempt("Wrong Answer", "42");
  const changed = { ...first, statusDisplay: "Accepted" };
  assert.equal(await persistSubmissionHistory(collection, member, "SampleUser", [first, first]), 1);
  assert.equal(await persistSubmissionHistory(collection, member, "SampleUser", [changed]), 0);
  assert.equal(stored.get("sampleuser:42").verdict, "Wrong Answer");
});

test("every submission verdict counts and duplicates count only once", () => {
  const verdicts = ["Accepted", "Wrong Answer", "Time Limit Exceeded", "Runtime Error", "Compile Error"];
  const rows = verdicts.map((verdict, index) => attempt(verdict, String(index)));
  const matches = matchingActivitySubmissions([...rows, rows[0]], "2026-10-22");
  assert.equal(matches.length, verdicts.length);
  assert.deepEqual(matches.map(row => row.statusDisplay), verdicts);
  assert.equal(classifyFinalization({ recentRows: rows, fetchSucceeded: true, date: "2026-10-22" }).status, "Done");
});

test("finalization checks persisted attempts before fresh or missing data", () => {
  const savedAttempt = { timestamp: timestamp("2026-10-21T00:00:00Z"), activityDate: "2026-10-21", submissionId: "old", verdict: "Runtime Error", problemIdentifier: "two-sum" };
  assert.equal(classifyFinalization({ historyRows: [savedAttempt], fetchSucceeded: false, date: "2026-10-21" }).status, "Done");
  assert.equal(classifyFinalization({ fetchSucceeded: false, date: "2026-10-21" }).status, "Needs review");
  const capped = Array.from({ length: 20 }, (_, index) => attempt("Wrong Answer", String(index), "2026-10-22T00:30:00Z"));
  assert.equal(classifyFinalization({ recentRows: capped, fetchSucceeded: true, date: "2026-10-21" }).status, "Needs review");
  const cappedButCollectedEarlier = Array.from({ length: 20 }, (_, index) => attempt("Wrong Answer", String(index)));
  assert.equal(classifyFinalization({ historyRows: [savedAttempt], recentRows: cappedButCollectedEarlier, fetchSucceeded: true, date: "2026-10-21" }).status, "Done");
});

test("Not Submitted requires a fresh below-limit list that proves date coverage", () => {
  const olderThanStart = attempt("Accepted", "older", "2026-10-20T23:59:59Z");
  const newerOnly = attempt("Accepted", "newer", "2026-10-22T00:30:00Z");
  assert.equal(classifyFinalization({ recentRows: [olderThanStart], fetchSucceeded: true, date: "2026-10-21" }).status, "Not Submitted");
  assert.equal(classifyFinalization({ recentRows: [newerOnly], fetchSucceeded: true, date: "2026-10-21" }).status, "Needs review");
  assert.equal(classifyFinalization({ recentRows: [], fetchSucceeded: true, date: "2026-10-21" }).status, "Needs review");
});

test("startup catch-up targets yesterday, then resumes missed dates in bounded batches", () => {
  assert.deepEqual(activityDatesToFinalize(null, "2026-10-22"), ["2026-10-21"]);
  assert.deepEqual(activityDatesToFinalize("2026-10-18", "2026-10-22"), ["2026-10-19", "2026-10-20", "2026-10-21"]);
  assert.deepEqual(activityDatesToFinalize("2026-10-01", "2026-10-22", 2), ["2026-10-02", "2026-10-03"]);
  assert.deepEqual(activityDatesToFinalize("2026-10-21", "2026-10-22"), []);
});

test("rollover finalizes yesterday and keeps today's submissions on today's date", () => {
  const atBoundary = timestamp("2026-10-22T00:00:00Z");
  const today = effectiveActivityDate(atBoundary);
  const yesterday = addActivityDays(today, -1);
  const todaysAttempt = attempt("Accepted", "today", "2026-10-22T00:00:00Z");
  assert.equal(today, "2026-10-22");
  assert.equal(yesterday, "2026-10-21");
  assert.equal(classifyFinalization({ recentRows: [todaysAttempt], fetchSucceeded: true, date: yesterday }).status, "Needs review");
  const yesterdaysAttempt = attempt("Runtime Error", "yesterday", "2026-10-21T00:00:00Z");
  assert.equal(classifyFinalization({ historyRows: [yesterdaysAttempt], date: yesterday }).status, "Done");
});

test("admin decisions record actor and time, and cannot replace an automatic verified Done", () => {
  const decidedAt = new Date("2026-10-22T01:00:00Z");
  const review = { statuses: { "member-1": { status: "Needs review", source: "automatic" } } };
  const decision = manualFinalizationDecision(review, "member-1", "Not Submitted", "Krish", decidedAt);
  assert.equal(decision.status, "Not Submitted");
  assert.equal(decision.source, "manual");
  assert.equal(decision.decidedBy, "Krish");
  assert.equal(decision.decidedAt.toISOString(), decidedAt.toISOString());
  assert.throws(() => manualFinalizationDecision({ statuses: { "member-1": { status: "Done", source: "automatic" } } }, "member-1", "Not Submitted", "Krish"), /VERIFIED_DONE_PROTECTED/);
  const manuallyConfirmed = { statuses: { "member-1": decision } };
  assert.equal(manualFinalizationDecision(manuallyConfirmed, "member-1", "Done", "Krish").status, "Done");
});

test("automatic retries preserve verified Done and admin-confirmed outcomes", () => {
  assert.equal(preserveFinalizationStatus({ status: "Done", source: "automatic" }), true);
  assert.equal(preserveFinalizationStatus({ status: "Not Submitted", source: "manual", decidedBy: "Krish" }), true);
  assert.equal(preserveFinalizationStatus({ status: "Not Submitted", source: "automatic" }), false);
  assert.equal(preserveFinalizationStatus({ status: "Needs review", source: "automatic" }), false);
});

test("student activity projection omits technical diagnostics and admin decision metadata", () => {
  const result = publicActivityRecord({
    date: "2026-10-22", lastSuccessfulAt: new Date("2026-10-22T00:30:00Z"),
    summary: { membersChecked: 8, verifiedAttempts: 2, unableToVerify: 3, trackerUpdateFailures: 1 },
    statuses: { "member-1": { status: "Unable to verify", detail: "PROFILE_UNAVAILABLE", username: "private-name", decidedBy: "Krish", attemptCount: 0 } }
  });
  assert.equal(result.statuses["member-1"].status, "Unable to verify");
  assert.equal(result.statuses["member-1"].detail, undefined);
  assert.equal(result.statuses["member-1"].username, undefined);
  assert.equal(result.statuses["member-1"].decidedBy, undefined);
  assert.equal(result.summary.trackerUpdateFailures, 1);
});

test("activity lock releases after successful completion and thrown errors", async () => {
  const collection = memoryLocks();
  const successful = await withActivityLease({ collection, lockId: "leetcode-activity", token: "ok", ownerId: "server-a", heartbeatMs: 1000 }, async () => "done");
  assert.equal(successful.value, "done");
  assert.equal(collection.rows.has("leetcode-activity"), false);
  await assert.rejects(withActivityLease({ collection, lockId: "leetcode-activity", token: "throws", ownerId: "server-a", heartbeatMs: 1000 }, async () => { throw new Error("job failed"); }), /job failed/);
  assert.equal(collection.rows.has("leetcode-activity"), false);
});

test("activity lock timeout expiry permits recovery", async () => {
  const collection = memoryLocks();
  const now = new Date("2026-10-22T00:00:00Z");
  const logEvents = [];
  const acquired = await acquireActivityLease(collection, { lockId: "leetcode-activity", token: "old", ownerId: "server-old", now, leaseMs: 1000 });
  assert.equal(acquired.acquired, true);
  const stillActive = await acquireActivityLease(collection, { lockId: "leetcode-activity", token: "other", ownerId: "server-new", now: new Date(now.getTime() + 500), leaseMs: 1000, log: event => logEvents.push(event) });
  assert.equal(stillActive.reason, "valid-lease");
  assert.equal(logEvents[0], "blocked-valid-lease");
  const recovered = await acquireActivityLease(collection, { lockId: "leetcode-activity", token: "new", ownerId: "server-new", now: new Date(now.getTime() + 1001), leaseMs: 1000 });
  assert.equal(recovered.acquired, true);
  assert.equal(recovered.recovered, true);
});

test("heartbeat extends a lease while its operation is still active", async () => {
  const collection = memoryLocks();
  let finish;
  const waiting = new Promise(resolve => { finish = resolve; });
  const active = withActivityLease({ collection, lockId: "leetcode-activity", token: "long", ownerId: "server-a", leaseMs: 200, heartbeatMs: 30 }, async () => waiting);
  await new Promise(resolve => setTimeout(resolve, 250));
  const contender = await acquireActivityLease(collection, { lockId: "leetcode-activity", token: "contender", ownerId: "server-b" });
  assert.equal(contender.reason, "valid-lease");
  finish("done");
  await active;
});

test("legacy stale and malformed locks are safely recovered with compare-and-swap", async () => {
  const collection = memoryLocks();
  const logEvents = [];
  collection.rows.set("leetcode-activity", { _id: "leetcode-activity", token: "legacy", expiresAt: new Date("2026-10-21T00:00:00Z") });
  const recovered = await acquireActivityLease(collection, { lockId: "leetcode-activity", token: "replacement", ownerId: "server-new", now: new Date("2026-10-22T00:00:00Z"), log: event => logEvents.push(event) });
  assert.equal(recovered.recovered, true);
  assert.deepEqual(logEvents, ["recovered-expired-lease"]);
  assert.equal(collection.rows.get("leetcode-activity").token, "replacement");
});

test("retry interval is calculated after the lock read, accounting for database latency", async () => {
  const collection = memoryLocks();
  let currentTime = new Date("2026-10-22T00:00:00Z");
  collection.rows.set("leetcode-activity", {
    _id: "leetcode-activity", token: "owner", ownerId: "server-a",
    leaseUntil: new Date(currentTime.getTime() + 10_000), expiresAt: new Date(currentTime.getTime() + 10_000)
  });
  const findOne = collection.findOne.bind(collection);
  collection.findOne = async filter => {
    const value = await findOne(filter);
    currentTime = new Date(currentTime.getTime() + 3_000);
    return value;
  };
  const result = await acquireActivityLease(collection, {
    lockId: "leetcode-activity", token: "requester", ownerId: "server-b", now: () => currentTime
  });
  assert.equal(result.reason, "valid-lease");
  assert.equal(result.retryAfterSeconds, 7);
});

test("an old owner cannot release a lock reclaimed by another owner", async () => {
  const collection = memoryLocks();
  const oldLease = await acquireActivityLease(collection, { lockId: "leetcode-activity", token: "old-token", ownerId: "server-old" });
  collection.rows.set("leetcode-activity", {
    ...collection.rows.get("leetcode-activity"), token: "new-token", ownerId: "server-new"
  });
  assert.equal(await releaseActivityLease(oldLease), false);
  assert.equal(collection.rows.get("leetcode-activity").token, "new-token");
});

test("concurrent scheduler and manual refreshes coordinate on the shared lock", async () => {
  const collection = memoryLocks();
  let finish;
  const waiting = new Promise(resolve => { finish = resolve; });
  const scheduler = withActivityLease({ collection, lockId: "leetcode-activity", token: "scheduled", ownerId: "server-a", heartbeatMs: 1000 }, async () => waiting);
  await new Promise(resolve => setImmediate(resolve));
  const manual = await acquireActivityLease(collection, { lockId: "leetcode-activity", token: "manual", ownerId: "server-a" });
  assert.equal(manual.reason, "valid-lease");
  finish("complete");
  assert.equal((await scheduler).value, "complete");
  const manualAfterCompletion = await acquireActivityLease(collection, { lockId: "leetcode-activity", token: "manual-2", ownerId: "server-a" });
  assert.equal(manualAfterCompletion.acquired, true);
});

test("acquire -> complete -> release guarantees database deletion and enables immediate reacquire by another worker", async () => {
  const collection = memoryLocks();
  const logEvents = [];
  const log = (event, details = {}) => logEvents.push({ event, ...details });

  // Worker 1 acquires lock
  const worker1Lease = await acquireActivityLease(collection, {
    lockId: "leetcode-activity",
    token: "token-worker-1",
    ownerId: "pid-1:uuid-1",
    log
  });
  assert.equal(worker1Lease.acquired, true);
  assert.equal(collection.rows.has("leetcode-activity"), true);
  assert.equal(collection.rows.get("leetcode-activity").ownerId, "pid-1:uuid-1");

  // Worker 1 releases lock
  const released = await releaseActivityLease(worker1Lease, log);
  assert.equal(released, true);
  assert.equal(collection.rows.has("leetcode-activity"), false);
  const releaseLog = logEvents.find(e => e.event === "released");
  assert.ok(releaseLog, "released event must be logged when deletedCount is 1");
  assert.equal(releaseLog.lockId, "leetcode-activity");

  // Worker 2 immediately acquires lock with different owner and token
  const worker2Lease = await acquireActivityLease(collection, {
    lockId: "leetcode-activity",
    token: "token-worker-2",
    ownerId: "pid-2:uuid-2",
    log
  });
  assert.equal(worker2Lease.acquired, true);
  assert.equal(collection.rows.has("leetcode-activity"), true);
  assert.equal(collection.rows.get("leetcode-activity").ownerId, "pid-2:uuid-2");
  assert.equal(collection.rows.get("leetcode-activity").token, "token-worker-2");
});

test("unexpired lease held by another worker blocks contender with blocked-valid-lease and ownerIsRequester: false", async () => {
  const collection = memoryLocks();
  const logEvents = [];
  const log = (event, details = {}) => logEvents.push({ event, ...details });

  const now = new Date("2026-10-25T12:00:00Z");
  // Worker 1 holds a lock with 78 seconds remaining
  const leaseUntil = new Date(now.getTime() + 78_000);
  collection.rows.set("leetcode-activity", {
    _id: "leetcode-activity",
    token: "token-cloud-worker",
    ownerId: "pid-render:uuid-cloud",
    acquiredAt: new Date(now.getTime() - 102_000),
    heartbeatAt: new Date(now.getTime() - 102_000),
    leaseUntil,
    expiresAt: leaseUntil
  });

  // Worker 2 (local restart) attempts acquisition
  const result = await acquireActivityLease(collection, {
    lockId: "leetcode-activity",
    token: "token-local-restart",
    ownerId: "pid-local:uuid-local",
    now,
    log
  });

  assert.equal(result.acquired, false);
  assert.equal(result.reason, "valid-lease");
  assert.equal(result.retryAfterSeconds, 78);

  const blockLog = logEvents.find(e => e.event === "blocked-valid-lease");
  assert.ok(blockLog);
  assert.equal(blockLog.lockId, "leetcode-activity");
  assert.equal(blockLog.retryAfterSeconds, 78);
  assert.equal(blockLog.legacy, false);
  assert.equal(blockLog.ownerIsRequester, false);
});
