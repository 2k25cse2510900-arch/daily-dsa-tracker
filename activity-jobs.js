"use strict";

const crypto = require("node:crypto");
const { effectiveActivityDate, addActivityDays } = require("./activity-date");
const { RECENT_SUBMISSION_LIMIT } = require("./leetcode");

const ACTIVITY_LOCK_LEASE_MS = 3 * 60 * 1000;
const ACTIVITY_LOCK_HEARTBEAT_MS = 30 * 1000;

function validDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function leaseDocument(lockId, token, ownerId, now, leaseMs) {
  const leaseUntil = new Date(now.getTime() + leaseMs);
  return { _id: lockId, token, ownerId, acquiredAt: now, heartbeatAt: now, leaseUntil, expiresAt: leaseUntil };
}

function lockSnapshotFilter(current) {
  const filter = { _id: current._id };
  for (const field of ["token", "ownerId", "leaseUntil", "expiresAt", "heartbeatAt"]) {
    if (Object.hasOwn(current, field)) filter[field] = current[field];
    else filter[field] = { $exists: false };
  }
  return filter;
}

async function acquireActivityLease(collection, { lockId, token, ownerId, now, leaseMs = ACTIVITY_LOCK_LEASE_MS, log = () => {} }) {
  const readClock = () => validDate(typeof now === "function" ? now() : now) || new Date();
  if (!lockId || !token || !ownerId || leaseMs <= 0) throw new Error("INVALID_ACTIVITY_LEASE");
  let current = await collection.findOne({ _id: lockId });
  let at = readClock();
  let document = leaseDocument(lockId, token, ownerId, at, leaseMs);
  if (!current) {
    try {
      await collection.insertOne(document);
      log("acquired", { lockId });
      return { acquired: true, collection, lockId, token, ownerId, leaseMs };
    } catch (error) {
      if (error.code !== 11000) {
        // A write may have reached MongoDB even if its acknowledgement failed.
        try { await collection.deleteOne({ _id: lockId, token, ownerId }); } catch {}
        throw error;
      }
      current = await collection.findOne({ _id: lockId });
      at = readClock();
      document = leaseDocument(lockId, token, ownerId, at, leaseMs);
    }
  }
  if (!current) throw new Error("ACTIVITY_LOCK_STATE_UNAVAILABLE");

  const expiration = validDate(current.leaseUntil) || validDate(current.expiresAt);
  if (expiration && expiration > at) {
    const retryAfterSeconds = Math.max(1, Math.ceil((expiration.getTime() - at.getTime()) / 1000));
    log("blocked-valid-lease", { lockId, retryAfterSeconds, legacy: !current.ownerId, ownerIsRequester: current.ownerId === ownerId });
    return { acquired: false, reason: "valid-lease", retryAfterSeconds };
  }
  const heartbeat = validDate(current.heartbeatAt);
  if (!expiration && heartbeat && at.getTime() - heartbeat.getTime() < leaseMs) {
    const retryAfterSeconds = Math.max(1, Math.ceil((leaseMs - (at.getTime() - heartbeat.getTime())) / 1000));
    log("blocked-recent-heartbeat", { lockId, retryAfterSeconds });
    return { acquired: false, reason: "recent-heartbeat", retryAfterSeconds };
  }

  let reclaimed;
  try {
    reclaimed = await collection.updateOne(lockSnapshotFilter(current), { $set: document });
  } catch (error) {
    try { await collection.deleteOne({ _id: lockId, token, ownerId }); } catch {}
    throw error;
  }
  if (reclaimed.modifiedCount === 1) {
    log("recovered-expired-lease", { lockId });
    return { acquired: true, recovered: true, collection, lockId, token, ownerId, leaseMs };
  }
  const latest = await collection.findOne({ _id: lockId });
  const latestExpiration = validDate(latest?.leaseUntil) || validDate(latest?.expiresAt);
  const afterRead = readClock();
  const retryAfterSeconds = latestExpiration && latestExpiration > afterRead
    ? Math.max(1, Math.ceil((latestExpiration.getTime() - afterRead.getTime()) / 1000)) : 1;
  log("blocked-valid-lease", { lockId, retryAfterSeconds, legacy: !latest?.ownerId, ownerIsRequester: latest?.ownerId === ownerId });
  return { acquired: false, reason: "valid-lease", retryAfterSeconds };
}

function publicActivityRecord(record) {
  if (!record) return null;
  const statuses = Object.fromEntries(Object.entries(record.statuses || {}).map(([memberId, item]) => [memberId, {
    status: item?.status || "Unable to verify",
    attemptCount: Number.isFinite(item?.attemptCount) ? item.attemptCount : undefined,
    updated: typeof item?.updated === "boolean" ? item.updated : undefined
  }]));
  return {
    date: record.date,
    lastSuccessfulAt: record.lastSuccessfulAt || null,
    summary: {
      membersChecked: Number(record.summary?.membersChecked) || 0,
      verifiedAttempts: Number(record.summary?.verifiedAttempts) || 0,
      unableToVerify: Number(record.summary?.unableToVerify) || 0,
      trackerUpdateFailures: Number(record.summary?.trackerUpdateFailures) || 0
    },
    statuses
  };
}

async function renewActivityLease(lease, now = new Date()) {
  const at = validDate(now);
  if (!at) throw new Error("INVALID_ACTIVITY_LEASE");
  const leaseUntil = new Date(at.getTime() + lease.leaseMs);
  const result = await lease.collection.updateOne(
    { _id: lease.lockId, token: lease.token, ownerId: lease.ownerId },
    { $set: { heartbeatAt: at, leaseUntil, expiresAt: leaseUntil } }
  );
  if (result.modifiedCount !== 1) throw new Error("ACTIVITY_LEASE_LOST");
}

async function releaseActivityLease(lease, log = () => {}) {
  const result = await lease.collection.deleteOne({ _id: lease.lockId, token: lease.token, ownerId: lease.ownerId });
  log(result.deletedCount === 1 ? "released" : "release-skipped-owner-changed", { lockId: lease.lockId });
  return result.deletedCount === 1;
}

async function withActivityLease({ collection, lockId, token, ownerId, leaseMs = ACTIVITY_LOCK_LEASE_MS, heartbeatMs = ACTIVITY_LOCK_HEARTBEAT_MS, log = () => {} }, operation) {
  const lease = await acquireActivityLease(collection, { lockId, token, ownerId, leaseMs, log });
  if (!lease.acquired) return lease;
  let pendingHeartbeat = Promise.resolve();
  const timer = setInterval(() => {
    pendingHeartbeat = pendingHeartbeat.then(() => renewActivityLease(lease)).catch(error => {
      log("heartbeat-failed", { lockId, code: error.message === "ACTIVITY_LEASE_LOST" ? error.message : "LEASE_RENEWAL_FAILED" });
    });
  }, heartbeatMs);
  timer.unref?.();
  try {
    const value = await operation(lease);
    log("completed", { lockId });
    return { acquired: true, value };
  } catch (error) {
    log("failed", { lockId, code: typeof error?.code === "string" ? error.code : "ACTIVITY_JOB_FAILED" });
    throw error;
  } finally {
    clearInterval(timer);
    await pendingHeartbeat;
    try { await releaseActivityLease(lease, log); }
    catch (error) { log("release-failed", { lockId, code: typeof error?.code === "string" ? error.code : "LOCK_RELEASE_FAILED" }); }
  }
}

function submissionDocument(member, username, submission, observedAt = new Date()) {
  const timestamp = Number(submission.timestamp);
  if (!Number.isFinite(timestamp) || timestamp <= 0) throw new Error("INVALID_ACTIVITY");
  const submissionId = submission.id ? String(submission.id) : null;
  const fingerprint = [member.id, username.toLowerCase(), timestamp, submission.titleSlug || submission.title, submission.statusDisplay, submission.lang || ""].join("\u001f");
  const digest = crypto.createHash("sha256").update(fingerprint).digest("hex");
  return {
    _id: `${username.toLowerCase()}:${submissionId || digest}`,
    memberId: member.id,
    username,
    submissionId,
    problemIdentifier: submission.titleSlug || submission.title,
    title: submission.title,
    verdict: submission.statusDisplay,
    language: submission.lang || "",
    timestamp,
    submittedAt: new Date(timestamp * 1000),
    activityDate: effectiveActivityDate(timestamp),
    firstObservedAt: observedAt
  };
}

async function persistSubmissionHistory(collection, member, username, rows, observedAt = new Date()) {
  let inserted = 0;
  for (const row of rows) {
    const document = submissionDocument(member, username, row, observedAt);
    try {
      const result = await collection.updateOne({ _id: document._id }, { $setOnInsert: document }, { upsert: true });
      if (result.upsertedCount === 1) inserted++;
    } catch (error) {
      // Concurrent collection cycles may race on the same unique _id. The first insert wins.
      if (error.code !== 11000) throw error;
    }
  }
  return inserted;
}

function matchingActivitySubmissions(rows, date) {
  const matching = rows.filter(row => Number.isFinite(Number(row.timestamp)) && effectiveActivityDate(Number(row.timestamp)) === date);
  const unique = new Map();
  for (const row of matching) {
    const identity = row.submissionId || row.id || [row.timestamp, row.problemIdentifier || row.titleSlug || row.title, row.verdict || row.statusDisplay, row.language || row.lang || ""].join("\u001f");
    unique.set(String(identity), row);
  }
  return [...unique.values()];
}

function classifyFinalization({ historyRows = [], recentRows, fetchSucceeded, date, limit = RECENT_SUBMISSION_LIMIT }) {
  const all = [...historyRows, ...(Array.isArray(recentRows) ? recentRows : [])];
  const attempts = matchingActivitySubmissions(all, date);
  if (attempts.length) return { status: "Done", attempts };
  if (!fetchSucceeded || !Array.isArray(recentRows)) return { status: "Needs review", detail: "Public submission data could not be verified." };
  if (recentRows.length >= limit) return { status: "Needs review", detail: `The public submission response reached its ${limit}-record limit; absence is inconclusive.` };
  const activityStart = Date.parse(`${date}T00:00:00.000Z`) / 1000;
  if (!recentRows.length || Math.min(...recentRows.map(row => Number(row.timestamp))) >= activityStart) {
    return { status: "Needs review", detail: "The public response did not establish coverage back to the start of this activity date." };
  }
  return { status: "Not Submitted", attempts: [], detail: "A fresh public response contained fewer than the requested record limit and no attempt for this activity date." };
}

function activityDatesToFinalize(lastProcessedDate, currentDate, maxDates = 7) {
  const target = addActivityDays(currentDate, -1);
  let next = lastProcessedDate ? addActivityDays(lastProcessedDate, 1) : target;
  const dates = [];
  while (next <= target && dates.length < maxDates) {
    dates.push(next);
    next = addActivityDays(next, 1);
  }
  return dates;
}

function manualFinalizationDecision(existing, memberId, status, actor, decidedAt = new Date()) {
  if (!new Set(["Done", "Not Submitted"]).has(status) || typeof actor !== "string" || !actor) throw new Error("INVALID_MANUAL_DECISION");
  const prior = existing?.statuses?.[memberId];
  if (prior?.status === "Done" && prior.source !== "manual") throw new Error("VERIFIED_DONE_PROTECTED");
  if (prior?.status !== "Needs review" && prior?.source !== "manual") throw new Error("MEMBER_NOT_REVIEWABLE");
  return { status, source: "manual", decidedBy: actor, decidedAt: new Date(decidedAt) };
}

function preserveFinalizationStatus(status) {
  return status?.source === "manual" || status?.status === "Done";
}

module.exports = { submissionDocument, persistSubmissionHistory, matchingActivitySubmissions, classifyFinalization, activityDatesToFinalize, manualFinalizationDecision, preserveFinalizationStatus, publicActivityRecord, ACTIVITY_LOCK_LEASE_MS, ACTIVITY_LOCK_HEARTBEAT_MS, acquireActivityLease, renewActivityLease, releaseActivityLease, withActivityLease };
