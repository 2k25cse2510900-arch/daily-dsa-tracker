"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { effectiveActivityDate, addActivityDays } = require("../activity-date");
const { submissionDocument, persistSubmissionHistory, matchingActivitySubmissions, classifyFinalization, activityDatesToFinalize, manualFinalizationDecision, preserveFinalizationStatus } = require("../activity-jobs");

const member = { id: "member-1", name: "Test Member" };
const timestamp = value => Math.floor(Date.parse(value) / 1000);
const attempt = (statusDisplay, id, iso = "2026-10-22T00:30:00Z") => ({ id, title: "Two Sum", titleSlug: "two-sum", timestamp: timestamp(iso), statusDisplay, lang: "python3" });

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
