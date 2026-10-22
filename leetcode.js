"use strict";

const { effectiveActivityDate } = require("./activity-date");

const PROFILES = [
  { name: "Krish", aliases: ["Krish", "Krish (ADMIN)", "Krish ADMIN"], username: "KrishChaddha106" },
  { name: "Kartik Kumar", aliases: ["Kartik Kumar"], username: "Kartik_kumar_29" },
  { name: "Tanmay Awasthi", aliases: ["Tanmay Awasthi"], username: "tanmayawasthi_code" },
  { name: "Avantika Yadav", aliases: ["Avantika Yadav"], username: "avan_tika2776" },
  { name: "Kshitij Rajput", aliases: ["Kshitij Rajput"], username: "1729kshitij" },
  { name: "Deepanshu Sachan", aliases: ["Deepanshu Sachan"], username: "Deepanshu_Sachan" },
  { name: "Kanika Dwivedi", aliases: ["Kanika Dwivedi"], username: "Kanika_Dwii" },
  { name: "Krishna Kumar Gaur", aliases: ["Krishna Kumar Gaur"], username: "KrishnaKumarGaur" }
];
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
const STALE_AFTER_MS = REFRESH_INTERVAL_MS;
const REQUEST_GAP_MS = 900;
const RECENT_SUBMISSION_LIMIT = 20;

function profileForMember(member) {
  const normalized = member.name.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
  return PROFILES.find(profile => profile.aliases.some(alias => alias.toLocaleLowerCase().replace(/[^a-z0-9]/g, "") === normalized));
}

function parseStats(payload, username) {
  if (payload?.errors?.length) throw new Error("UPSTREAM_ERROR");
  const user = payload?.data?.matchedUser;
  if (!user || user.username?.toLowerCase() !== username.toLowerCase()) throw new Error("PROFILE_UNAVAILABLE");
  const rows = user.submitStats?.acSubmissionNum;
  if (!Array.isArray(rows)) throw new Error("INVALID_STATS");
  const count = difficulty => {
    const row = rows.find(item => item.difficulty === difficulty);
    return Number.isSafeInteger(row?.count) && row.count >= 0 ? row.count : null;
  };
  const easy = count("Easy");
  const medium = count("Medium");
  const hard = count("Hard");
  const all = count("All");
  if ([easy, medium, hard, all].some(value => value === null)) throw new Error("INVALID_STATS");
  return { total: all, easy, medium, hard, globalRanking: Number.isSafeInteger(user.profile?.ranking) && user.profile.ranking > 0 ? user.profile.ranking : null };
}

async function fetchProfile(username) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch("https://leetcode.com/graphql/", {
      method: "POST", signal: controller.signal,
      headers: { "content-type": "application/json", "user-agent": "DSA-Dashboard/1.0 (+public profile statistics)", referer: `https://leetcode.com/u/${encodeURIComponent(username)}/` },
      body: JSON.stringify({ query: "query userProfile($username: String!) { matchedUser(username: $username) { username profile { ranking } submitStats { acSubmissionNum { difficulty count submissions } } } }", variables: { username } })
    });
    if (response.status === 429) throw new Error("RATE_LIMITED");
    if (!response.ok) throw new Error("UPSTREAM_UNAVAILABLE");
    return parseStats(await response.json(), username);
  } finally { clearTimeout(timeout); }
}

async function fetchRecentSubmissions(username) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch("https://leetcode.com/graphql/", {
      method: "POST", signal: controller.signal,
      headers: { "content-type": "application/json", "user-agent": "DSA-Dashboard/1.0 (+public profile activity check)", referer: `https://leetcode.com/u/${encodeURIComponent(username)}/` },
      body: JSON.stringify({
        query: "query recentSubmissions($username: String!, $limit: Int) { matchedUser(username: $username) { username } recentSubmissionList(username: $username, limit: $limit) { id title titleSlug timestamp statusDisplay lang } }",
        variables: { username, limit: RECENT_SUBMISSION_LIMIT }
      })
    });
    if (response.status === 429) throw new Error("RATE_LIMITED");
    if (!response.ok) throw new Error("UPSTREAM_UNAVAILABLE");
    return parseRecentSubmissions(await response.json(), username);
  } finally { clearTimeout(timeout); }
}

function parseRecentSubmissions(payload, username) {
  if (payload?.errors?.length) throw new Error("UPSTREAM_ERROR");
  const user = payload?.data?.matchedUser;
  if (!user || user.username?.toLowerCase() !== username.toLowerCase()) throw new Error("PROFILE_UNAVAILABLE");
  const rows = payload?.data?.recentSubmissionList;
  if (!Array.isArray(rows) || rows.length > RECENT_SUBMISSION_LIMIT) throw new Error("INVALID_ACTIVITY");
  return rows.map(row => {
    if (!row || typeof row.title !== "string" || typeof row.statusDisplay !== "string" || !row.statusDisplay.trim() ||
        typeof row.timestamp !== "string" || !/^\d{1,12}$/.test(row.timestamp) || Number(row.timestamp) <= 0) {
      throw new Error("INVALID_ACTIVITY");
    }
    return { id: row.id === undefined || row.id === null ? null : String(row.id), title: row.title, titleSlug: typeof row.titleSlug === "string" ? row.titleSlug : "", timestamp: Number(row.timestamp), statusDisplay: row.statusDisplay.trim(), lang: typeof row.lang === "string" ? row.lang : "" };
  });
}

function dateInTimezone(timestampSeconds, timeZone = "Asia/Kolkata") {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(timestampSeconds * 1000));
  const values = Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function trackerPosition(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const value = new Date(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(value.getTime()) || value.toISOString().slice(0, 10) !== date) return null;
  const days = Math.floor((value.getTime() - Date.UTC(2026, 6, 27)) / 86400000);
  if (days < 0) return null;
  const week = Math.floor(days / 7) + 1;
  const slot = days % 7;
  return week <= 27 && slot < 6 ? { week, slot } : null;
}

function activityForDate(rows, date) {
  const attempts = rows.filter(row => Number.isFinite(Number(row.timestamp)) && effectiveActivityDate(Number(row.timestamp)) === date);
  return attempts.length ? { verified: true, attempts } : { verified: false, attempts: [] };
}

async function inspectMemberActivity({ fetchSubmissions, username, date, markDone, onSubmissions }) {
  let rows;
  try { rows = await fetchSubmissions(username); }
  catch (error) {
    const errorCode = ["RATE_LIMITED", "PROFILE_UNAVAILABLE", "UPSTREAM_UNAVAILABLE", "INVALID_ACTIVITY", "UPSTREAM_ERROR"].includes(error.message) ? error.message : error.name === "AbortError" ? "TIMEOUT" : "UPSTREAM_UNAVAILABLE";
    return { fetched: false, verified: false, status: "Unable to verify", detail: errorCode, attempts: [] };
  }
  let historyPersisted = true;
  if (onSubmissions) {
    try { await onSubmissions(rows); } catch { historyPersisted = false; }
  }
  const activity = activityForDate(rows, date);
  if (!activity.verified) return { fetched: true, verified: false, status: "Unable to verify", detail: "No matching record in the latest public submissions; older activity is not available here.", attempts: [], recentRecords: rows.length, historyPersisted };
  try {
    return { fetched: true, verified: true, status: "Attempt verified", detail: [...new Set(activity.attempts.map(attempt => attempt.statusDisplay))].join(", "), attempts: activity.attempts, updated: await markDone(), historyPersisted };
  } catch {
    return { fetched: true, verified: true, status: "Attempt verified", detail: [...new Set(activity.attempts.map(attempt => attempt.statusDisplay))].join(", "), attempts: activity.attempts, updated: false, trackerUpdateFailed: true, historyPersisted };
  }
}

function publicRecord(doc, profile, memberId) {
  return {
    memberId, username: profile.username, profileUrl: `https://leetcode.com/u/${encodeURIComponent(profile.username)}/`,
    status: doc?.status || "Pending", stats: doc?.stats || null,
    lastFetchedAt: doc?.lastFetchedAt || null,
    stale: Boolean(doc?.status === "Unavailable" || (doc?.lastFetchedAt && Date.now() - new Date(doc.lastFetchedAt).getTime() > STALE_AFTER_MS)),
    error: doc?.error || null
  };
}

module.exports = { PROFILES, REFRESH_INTERVAL_MS, STALE_AFTER_MS, REQUEST_GAP_MS, RECENT_SUBMISSION_LIMIT, profileForMember, parseStats, fetchProfile, fetchRecentSubmissions, parseRecentSubmissions, dateInTimezone, effectiveActivityDate, trackerPosition, activityForDate, inspectMemberActivity, publicRecord };
