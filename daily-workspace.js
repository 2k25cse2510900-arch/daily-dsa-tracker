"use strict";

const crypto = require("node:crypto");
const { effectiveActivityDate } = require("./activity-date");
const { RECENT_SUBMISSION_LIMIT } = require("./leetcode");
const { withActivityLease } = require("./activity-jobs");

const TIMEZONE = "Asia/Kolkata";
const USERNAME_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function workspaceError(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function normalizeUsername(value) {
  if (typeof value !== "string") return null;
  const username = value.trim();
  return USERNAME_PATTERN.test(username) ? username : null;
}

function validActivityDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function submissionIdentity(username, submission) {
  const id = submission?.id === undefined || submission?.id === null || submission.id === "" ? null : String(submission.id);
  if (id) return { sourceIdentity: `leetcode:${username.toLowerCase()}:${id}`, submissionId: id, identityType: "submission-id" };
  const fingerprint = [username.toLowerCase(), submission?.timestamp, submission?.titleSlug || submission?.title || "", submission?.statusDisplay || "", submission?.lang || ""].join("\u001f");
  return { sourceIdentity: `fallback:${crypto.createHash("sha256").update(fingerprint).digest("hex")}`, submissionId: null, identityType: "derived-fingerprint" };
}

function publicConnection(connection) {
  if (!connection) return null;
  return {
    username: connection.leetcodeUsername,
    status: connection.connectionStatus,
    verifiedAt: connection.verifiedAt || null,
    lastCheckedAt: connection.lastCheckedAt || null,
    legacy: connection.source === "legacy"
  };
}

function publicWorkspace(workspace, submissions = []) {
  if (!workspace) return null;
  return {
    activityDate: workspace.activityDate,
    timezone: TIMEZONE,
    status: workspace.status || "ready",
    submissionCount: Number(workspace.submissionCount) || 0,
    acceptedCount: Number(workspace.acceptedCount) || 0,
    otherVerdictCount: Number(workspace.otherVerdictCount) || 0,
    lastSyncedAt: workspace.lastSyncedAt || null,
    syncStatus: workspace.syncStatus || "not-synced",
    syncError: workspace.syncError || null,
    sourceLimit: RECENT_SUBMISSION_LIMIT,
    sourceWindowMayBeIncomplete: Boolean(workspace.sourceWindowMayBeIncomplete),
    submissions: submissions.map(submission => ({
      id: submission._id,
      submissionId: submission.submissionId || null,
      submissionIdAvailable: Boolean(submission.submissionId),
      problemTitle: submission.problemTitle,
      problemSlug: submission.problemSlug || null,
      problemUrl: submission.problemUrl || null,
      language: submission.language || null,
      verdict: submission.verdict,
      submittedAt: submission.submittedAt,
      identityType: submission.identityType
    }))
  };
}

function errorCode(error) {
  if (["RATE_LIMITED", "PROFILE_UNAVAILABLE", "UPSTREAM_UNAVAILABLE", "INVALID_ACTIVITY", "UPSTREAM_ERROR"].includes(error?.message)) return error.message;
  if (error?.name === "AbortError") return "TIMEOUT";
  return "UPSTREAM_UNAVAILABLE";
}

function createDailyWorkspaceService({ db, fetchProfile, fetchRecentSubmissions, now = () => new Date(), currentActivityDate, lockOwnerId = "daily-workspace" }) {
  if (!db || typeof fetchProfile !== "function" || typeof fetchRecentSubmissions !== "function" || typeof currentActivityDate !== "function") throw new TypeError("A database, public LeetCode fetchers, and activity clock are required.");
  const connections = db.collection("leetcodeConnections");
  const workspaces = db.collection("dailyWorkspaces");
  const submissions = db.collection("dailySubmissionsV2");
  const locks = db.collection("jobLocks");

  async function legacyConnection(user) {
    const username = normalizeUsername(user?.leetCodeUsername);
    return username ? { _id: user.id, userId: user.id, leetcodeUsername: username, normalizedUsername: username.toLowerCase(), connectionStatus: "legacy", source: "legacy", verifiedAt: null, lastCheckedAt: null } : null;
  }

  async function connectionFor(user) {
    const connection = await connections.findOne({ _id: user.id });
    if (connection) return connection.connectionStatus === "active" ? connection : null;
    return legacyConnection(user);
  }

  async function connect({ user, username }) {
    const cleanUsername = normalizeUsername(username);
    if (!user?.id || !cleanUsername) throw workspaceError("INVALID_USERNAME", "Enter a valid LeetCode username.");
    const normalizedUsername = cleanUsername.toLowerCase();
    const duplicate = await connections.findOne({ normalizedUsername, connectionStatus: "active", _id: { $ne: user.id } }, { projection: { _id: 1 } });
    if (duplicate) throw workspaceError("USERNAME_ALREADY_CONNECTED", "That LeetCode username is already connected to another account.", 409);
    try { await fetchProfile(cleanUsername); }
    catch (error) {
      const code = errorCode(error);
      const status = code === "RATE_LIMITED" ? 429 : code === "PROFILE_UNAVAILABLE" ? 404 : 503;
      throw workspaceError(code, code === "PROFILE_UNAVAILABLE" ? "That LeetCode profile could not be verified publicly." : code === "RATE_LIMITED" ? "LeetCode is rate limiting verification. Try again later." : "LeetCode verification is temporarily unavailable.", status);
    }
    const at = now();
    try {
      await connections.updateOne({ _id: user.id }, {
        $set: { userId: user.id, leetcodeUsername: cleanUsername, normalizedUsername, connectionStatus: "active", source: "member", verifiedAt: at, lastCheckedAt: at, updatedAt: at },
        $setOnInsert: { createdAt: at }
      }, { upsert: true });
    } catch (error) {
      if (error?.code === 11000) throw workspaceError("USERNAME_ALREADY_CONNECTED", "That LeetCode username is already connected to another account.", 409);
      throw error;
    }
    return publicConnection(await connections.findOne({ _id: user.id }));
  }

  async function disconnect(user) {
    if (!user?.id) throw workspaceError("MEMBER_REQUIRED", "Member authentication required.", 401);
    const active = await connections.findOne({ _id: user.id, connectionStatus: "active" });
    if (active) await connections.updateOne({ _id: user.id, connectionStatus: "active" }, { $set: { connectionStatus: "disconnected", disconnectedAt: now(), updatedAt: now() } });
    else if (await legacyConnection(user)) await connections.updateOne({ _id: user.id }, { $set: { userId: user.id, connectionStatus: "disconnected", source: "legacy", disconnectedAt: now(), updatedAt: now() }, $setOnInsert: { createdAt: now() } }, { upsert: true });
    else throw workspaceError("CONNECTION_NOT_FOUND", "No connected LeetCode account was found.", 404);
    return { status: "disconnected" };
  }

  async function workspaceFor(user, activityDate) {
    if (!user?.id || !validActivityDate(activityDate)) throw workspaceError("INVALID_ACTIVITY_DATE", "Choose a valid activity date.");
    const workspace = await workspaces.findOne({ userId: user.id, activityDate });
    if (!workspace) return { activityDate, connection: publicConnection(await connectionFor(user)), workspace: null };
    const rows = await submissions.find({ workspaceId: workspace._id, userId: user.id }).sort({ submittedAt: -1, createdAt: -1 }).toArray();
    return { activityDate, connection: publicConnection(await connectionFor(user)), workspace: publicWorkspace(workspace, rows) };
  }

  async function persistCurrentDay({ user, connection, activityDate }) {
    const at = now();
    const workspaceId = `workspace:${user.id}:${activityDate}`;
    await workspaces.updateOne({ userId: user.id, activityDate }, {
      $setOnInsert: { _id: workspaceId, userId: user.id, activityDate, timezone: TIMEZONE, status: "ready", submissionCount: 0, acceptedCount: 0, otherVerdictCount: 0, createdAt: at },
      $set: { syncStatus: "syncing", syncError: null, updatedAt: at }
    }, { upsert: true });
    try {
      const rows = await fetchRecentSubmissions(connection.leetcodeUsername);
      const currentRows = rows.filter(row => effectiveActivityDate(Number(row.timestamp), TIMEZONE) === activityDate);
      for (const row of currentRows) {
        const identity = submissionIdentity(connection.leetcodeUsername, row);
        const submittedAt = new Date(Number(row.timestamp) * 1000);
        const document = {
          _id: `daily:${user.id}:${crypto.createHash("sha256").update(`${workspaceId}\u001f${identity.sourceIdentity}`).digest("hex")}`,
          workspaceId,
          userId: user.id,
          leetcodeUsername: connection.leetcodeUsername,
          submissionId: identity.submissionId,
          sourceIdentity: identity.sourceIdentity,
          identityType: identity.identityType,
          problemTitle: row.title,
          problemSlug: row.titleSlug || null,
          problemUrl: row.titleSlug ? `https://leetcode.com/problems/${encodeURIComponent(row.titleSlug)}/` : null,
          language: row.lang || null,
          verdict: row.statusDisplay,
          submittedAt,
          activityDate,
          source: "leetcode-public-recent-submissions",
          createdAt: at,
          updatedAt: at
        };
        try { await submissions.updateOne({ workspaceId, sourceIdentity: identity.sourceIdentity }, { $setOnInsert: document }, { upsert: true }); }
        catch (error) { if (error?.code !== 11000) throw error; }
      }
      const saved = await submissions.find({ workspaceId, userId: user.id }).toArray();
      const acceptedCount = saved.filter(row => row.verdict === "Accepted").length;
      await workspaces.updateOne({ _id: workspaceId, userId: user.id }, { $set: {
        status: "ready", submissionCount: saved.length, acceptedCount, otherVerdictCount: saved.length - acceptedCount,
        lastSyncedAt: at, syncStatus: "success", syncError: null, sourceWindowMayBeIncomplete: rows.length >= RECENT_SUBMISSION_LIMIT, updatedAt: at
      } });
    } catch (error) {
      await workspaces.updateOne({ _id: workspaceId, userId: user.id }, { $set: { syncStatus: "failed", syncError: errorCode(error), updatedAt: now() } });
    }
    return workspaceFor(user, activityDate);
  }

  async function sync(user) {
    const connection = await connectionFor(user);
    if (!connection) throw workspaceError("CONNECTION_REQUIRED", "Connect a LeetCode account before synchronizing.", 409);
    const activityDate = currentActivityDate();
    const result = await withActivityLease({ collection: locks, lockId: `daily-workspace:${user.id}:${activityDate}`, token: crypto.randomUUID(), ownerId: lockOwnerId }, () => persistCurrentDay({ user, connection, activityDate }));
    if (!result.acquired) throw workspaceError("SYNC_IN_PROGRESS", "A synchronization is already in progress. Try again shortly.", 409);
    return result.value;
  }

  // Background collection uses the same per-user, per-activity-day lease as a
  // member initiated sync. This makes rollover collection safe across server
  // instances and prevents it from duplicating submissions.
  async function syncActiveConnections({ onProgress = async () => {} } = {}) {
    const activeConnections = await connections.find(
      { connectionStatus: "active" },
      { projection: { userId: 1 } }
    ).toArray();
    const results = [];
    for (const connection of activeConnections) {
      try {
        const workspace = await sync({ id: connection.userId });
        results.push({ userId: connection.userId, status: "synced", workspace });
      } catch (error) {
        // A single unavailable public profile must not stop the remaining
        // users' private workspaces from being refreshed.
        results.push({ userId: connection.userId, status: "failed", code: error?.code || errorCode(error) });
      }
      await onProgress(connection, results.at(-1));
    }
    return results;
  }

  async function submissionFor(user, submissionId) {
    if (typeof submissionId !== "string" || submissionId.length > 200) throw workspaceError("INVALID_SUBMISSION", "Submission not found.", 404);
    let submission = await submissions.findOne({ _id: submissionId, userId: user.id });
    if (!submission) {
      submission = await submissions.findOne({ submissionId, userId: user.id });
    }
    if (!submission && Number.isFinite(Number(submissionId))) {
      submission = await submissions.findOne({ submissionId: Number(submissionId), userId: user.id });
    }
    if (!submission) throw workspaceError("SUBMISSION_NOT_FOUND", "Submission not found.", 404);
    return publicWorkspace({ activityDate: submission.activityDate, status: "ready", submissionCount: 1 }, [submission]).submissions[0];
  }

  return { currentActivityDate, connect, disconnect, connectionFor: async user => publicConnection(await connectionFor(user)), workspaceFor, sync, syncActiveConnections, submissionFor };
}

module.exports = { TIMEZONE, normalizeUsername, validActivityDate, submissionIdentity, publicConnection, publicWorkspace, createDailyWorkspaceService, workspaceError };
