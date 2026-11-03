"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeUsername, validActivityDate, submissionIdentity, createDailyWorkspaceService } = require("../daily-workspace");

function equal(value, expected) {
  if (expected && typeof expected === "object" && !Array.isArray(expected) && !(expected instanceof Date)) {
    if ("$ne" in expected) return value !== expected.$ne;
    if ("$lt" in expected) return value < expected.$lt;
    if ("$exists" in expected) return expected.$exists ? value !== undefined : value === undefined;
  }
  return value instanceof Date && expected instanceof Date ? value.getTime() === expected.getTime() : value === expected;
}
function matches(doc, filter) { return Object.entries(filter).every(([key, expected]) => equal(doc[key], expected)); }
class Collection {
  constructor(unique = []) { this.docs = []; this.unique = unique; }
  async findOne(filter) { const found = this.docs.find(doc => matches(doc, filter)); return found ? structuredClone(found) : null; }
  find(filter) {
    let rows = this.docs.filter(doc => matches(doc, filter)).map(doc => structuredClone(doc));
    return { sort: spec => ({ toArray: async () => rows.sort((a, b) => Object.entries(spec).reduce((result, [key, direction]) => result || ((a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * direction), 0)) }), toArray: async () => rows };
  }
  async insertOne(doc) {
    if (this.unique.some(keys => this.docs.some(existing => keys.every(key => existing[key] === doc[key])))) { const error = new Error("duplicate"); error.code = 11000; throw error; }
    this.docs.push(structuredClone(doc)); return { insertedId: doc._id };
  }
  async updateOne(filter, update, options = {}) {
    let doc = this.docs.find(item => matches(item, filter));
    let inserted = false;
    if (!doc && options.upsert) { doc = {}; for (const [key, value] of Object.entries(filter)) if (!key.startsWith("$") && !(value && typeof value === "object")) doc[key] = value; if (update.$setOnInsert) Object.assign(doc, structuredClone(update.$setOnInsert)); this.docs.push(doc); inserted = true; }
    if (!doc) return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    if (update.$set) Object.assign(doc, structuredClone(update.$set));
    if (update.$inc) for (const [key, value] of Object.entries(update.$inc)) doc[key] = (doc[key] || 0) + value;
    if (!inserted && update.$setOnInsert) {}
    if (this.unique.some(keys => this.docs.filter(existing => existing !== doc).some(existing => keys.every(key => existing[key] === doc[key])))) { this.docs = this.docs.filter(item => item !== doc); const error = new Error("duplicate"); error.code = 11000; throw error; }
    return { matchedCount: inserted ? 0 : 1, modifiedCount: 1, upsertedCount: inserted ? 1 : 0, upsertedId: inserted ? doc._id : null };
  }
  async deleteOne(filter) { const i = this.docs.findIndex(doc => matches(doc, filter)); if (i < 0) return { deletedCount: 0 }; this.docs.splice(i, 1); return { deletedCount: 1 }; }
}
function fixture({ rows = [], fail = null } = {}) {
  const collections = new Map([
    ["leetcodeConnections", new Collection([["_id"], ["normalizedUsername"]])],
    ["dailyWorkspaces", new Collection([["userId", "activityDate"]])],
    ["dailySubmissionsV2", new Collection([["workspaceId", "sourceIdentity"]])],
    ["jobLocks", new Collection([["_id"]])]
  ]);
  const db = { collection: name => collections.get(name) };
  const service = createDailyWorkspaceService({
    db, now: () => new Date("2026-11-01T08:00:00.000Z"), currentActivityDate: () => "2026-11-01",
    fetchProfile: async username => { if (username === "missing") throw new Error("PROFILE_UNAVAILABLE"); return {}; },
    fetchRecentSubmissions: async () => { if (fail) throw fail; return rows; }
  });
  return { collections, service };
}
const today = timestamp => ({ id: String(timestamp), title: "Two Sum", titleSlug: "two-sum", timestamp: String(timestamp), statusDisplay: "Accepted", lang: "python3" });

test("normalizes only safe public LeetCode usernames and validates ISO activity dates", () => {
  assert.equal(normalizeUsername("  User_Name-1 "), "User_Name-1");
  assert.equal(normalizeUsername("bad name"), null);
  assert.equal(validActivityDate("2026-11-01"), true);
  assert.equal(validActivityDate("2026-02-31"), false);
});

test("submission identity preserves real IDs and labels fallback identities honestly", () => {
  assert.deepEqual(submissionIdentity("Sample", { id: "123" }), { sourceIdentity: "leetcode:sample:123", submissionId: "123", identityType: "submission-id" });
  const fallback = submissionIdentity("Sample", { timestamp: 1, title: "A", statusDisplay: "Wrong Answer", lang: "java" });
  assert.equal(fallback.submissionId, null);
  assert.equal(fallback.identityType, "derived-fingerprint");
});

test("connections are owned, verified, unique, updateable, and disconnectable", async () => {
  const { service } = fixture();
  const first = await service.connect({ user: { id: "member-a" }, username: "  Sample_User " });
  assert.equal(first.username, "Sample_User");
  await assert.rejects(() => service.connect({ user: { id: "member-b" }, username: "sample_user" }), { code: "USERNAME_ALREADY_CONNECTED" });
  const changed = await service.connect({ user: { id: "member-a" }, username: "Other_User" });
  assert.equal(changed.username, "Other_User");
  assert.deepEqual(await service.disconnect({ id: "member-a" }), { status: "disconnected" });
  assert.equal(await service.connectionFor({ id: "member-a" }), null);
});

test("sync stores all current-day attempts once, retains verdicts, and isolates workspaces", async () => {
  const first = Math.floor(Date.parse("2026-11-01T05:30:00+05:30") / 1000);
  const second = first + 60;
  const rows = [today(first), { ...today(second), id: String(second), title: "Binary Search", titleSlug: "binary-search", statusDisplay: "Wrong Answer", lang: "java" }, today(first)];
  const { service } = fixture({ rows });
  await service.connect({ user: { id: "member-a" }, username: "sample-a" });
  const synced = await service.sync({ id: "member-a" });
  assert.equal(synced.workspace.submissionCount, 2);
  assert.equal(synced.workspace.acceptedCount, 1);
  assert.equal(synced.workspace.otherVerdictCount, 1);
  assert.equal(synced.workspace.submissions[1].verdict, "Accepted");
  const repeated = await service.sync({ id: "member-a" });
  assert.equal(repeated.workspace.submissionCount, 2);
  const other = await service.workspaceFor({ id: "member-b" }, "2026-11-01");
  assert.equal(other.workspace, null);
  await assert.rejects(() => service.submissionFor({ id: "member-b" }, synced.workspace.submissions[0].id), { code: "SUBMISSION_NOT_FOUND" });
});

test("a failed sync preserves existing records and reports a safe status", async () => {
  const timestamp = Math.floor(Date.parse("2026-11-01T06:00:00+05:30") / 1000);
  const initial = fixture({ rows: [today(timestamp)] });
  await initial.service.connect({ user: { id: "member-a" }, username: "sample-a" });
  await initial.service.sync({ id: "member-a" });
  const service = createDailyWorkspaceService({
    db: { collection: name => initial.collections.get(name) }, now: () => new Date("2026-11-01T09:00:00.000Z"), currentActivityDate: () => "2026-11-01",
    fetchProfile: async () => ({}), fetchRecentSubmissions: async () => { throw new Error("RATE_LIMITED"); }
  });
  const result = await service.sync({ id: "member-a" });
  assert.equal(result.workspace.submissionCount, 1);
  assert.equal(result.workspace.syncStatus, "failed");
  assert.equal(result.workspace.syncError, "RATE_LIMITED");
  assert.ok(result.workspace.lastSyncedAt);
});

test("automatic sync uses the same private per-user workspaces", async () => {
  const timestamp = Math.floor(Date.parse("2026-11-01T06:00:00+05:30") / 1000);
  const { service, collections } = fixture({ rows: [today(timestamp)] });
  await service.connect({ user: { id: "member-a" }, username: "sample-a" });
  await service.connect({ user: { id: "member-b" }, username: "sample-b" });
  const results = await service.syncActiveConnections();
  assert.deepEqual(results.map(result => [result.userId, result.status]), [["member-a", "synced"], ["member-b", "synced"]]);
  assert.equal((await collections.get("dailyWorkspaces").find({ userId: "member-b" }).toArray()).length, 1);
});
