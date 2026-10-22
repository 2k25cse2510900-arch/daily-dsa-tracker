"use strict";

const crypto = require("node:crypto");
const { effectiveActivityDate, addActivityDays } = require("./activity-date");
const { RECENT_SUBMISSION_LIMIT } = require("./leetcode");

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

module.exports = { submissionDocument, persistSubmissionHistory, matchingActivitySubmissions, classifyFinalization, activityDatesToFinalize, manualFinalizationDecision, preserveFinalizationStatus };
