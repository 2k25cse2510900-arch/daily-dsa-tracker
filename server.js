"use strict";

require("dotenv").config();

const path = require("node:path");
const crypto = require("node:crypto");
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const { applyEligibleDenseRanks } = require("./ranking");
const { scoreWeek } = require("./scoring");
const { safeMongoDiagnostic } = require("./diagnostics");
const { createAdminOnly } = require("./admin-auth");
const { REFRESH_INTERVAL_MS, REQUEST_GAP_MS, RECENT_SUBMISSION_LIMIT, profileForMember, fetchProfile, fetchRecentSubmissions, inspectMemberActivity, effectiveActivityDate, trackerPosition, publicRecord } = require("./leetcode");
const { addActivityDays, nextActivityBoundaryMs } = require("./activity-date");
const { persistSubmissionHistory, matchingActivitySubmissions, classifyFinalization, activityDatesToFinalize, manualFinalizationDecision, preserveFinalizationStatus, publicActivityRecord, ACTIVITY_LOCK_LEASE_MS, ACTIVITY_LOCK_HEARTBEAT_MS, acquireActivityLease, renewActivityLease, releaseActivityLease } = require("./activity-jobs");

const PAGES = ["overview", "daily", "concepts", "members", "report", "leaderboard"];
const STATUSES = new Set(["blank", "done", "absent"]);
const MAX_WEEKS = 27;
const WEEK_ONE_MONDAY = Date.UTC(2026, 6, 27);
function scheduledSlots(weekNumber) {
  if (weekNumber <= 13) return [0, 1, 2, 3, 4, 5];
  return Array.from({ length: 6 }, (_, index) => index).filter(index => {
    const date = new Date(WEEK_ONE_MONDAY + ((weekNumber - 1) * 7 + index) * 86400000);
    const value = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
    return date.getUTCDay() !== 0 && ((value >= "2026-10-12" && value <= "2026-10-28") || (value >= "2026-12-14" && value <= "2027-01-16"));
  });
}
const PORT = Number(process.env.PORT) || 3000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const production = process.env.NODE_ENV === "production";
const app = express();
const mongo = createMongoClient();
let db;
let adminPasswordHash;
let adminCredentialVersion;
let mongoConnectPromise;
let runtimeInitializationPromise;
let leetcodeRefreshPromise;
let leetcodeActivityCyclePromise;
let lastLeetcodeRefreshAt = 0;
const leetcodeActivityRefreshes = new Map();
const activityLockOwnerId = `${process.pid}:${crypto.randomUUID()}`;

function requireEnv(name) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
  return process.env[name];
}

function safeDiagnosticCode(error) {
  const candidate = error?.diagnosticCode ?? error?.code;
  if (typeof candidate === "string" && /^[A-Z][A-Z0-9_-]{0,39}$/.test(candidate)) return candidate;
  if (Number.isInteger(candidate)) return `MONGO_${candidate}`;
  if (typeof error?.name === "string" && /^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(error.name)) return error.name;
  return "UNKNOWN";
}

function logInitializationFailure(stage, error) {
  // Only fixed stage labels and sanitized error identifiers go to runtime logs.
  const fields = stage === "mongodb-connection"
    ? (error?.mongoDiagnostic || safeMongoDiagnostic(error))
    : { ...safeMongoDiagnostic(error), category: "initialization-error" };
  console.error("[dashboard-init] initialization failed", { stage, ...fields });
}

function createSessionSecret() {
  try {
    return requireEnv("SESSION_SECRET");
  } catch (error) {
    logInitializationFailure("configuration-validation", error);
    throw new Error("SESSION_SECRET is required.");
  }
}

function createMongoClient() {
  try {
    return new MongoClient(requireEnv("MONGODB_URI"), { maxPoolSize: 10, serverSelectionTimeoutMS: 10000 });
  } catch (error) {
    logInitializationFailure("configuration-validation", error);
    throw new Error("MONGODB_URI is missing or invalid.");
  }
}

function connectMongo() {
  if (!mongoConnectPromise) {
    mongoConnectPromise = mongo.connect().catch(error => {
      mongoConnectPromise = undefined;
      const failure = new Error("Could not connect to MongoDB. Check MONGODB_URI and database network access.");
      failure.mongoDiagnostic = safeMongoDiagnostic(error);
      throw failure;
    });
  }
  return mongoConnectPromise;
}

function initializeRuntime() {
  if (!runtimeInitializationPromise) {
    let stage = "configuration-validation";
    runtimeInitializationPromise = (async () => {
      const password = requireEnv("ADMIN_PASSWORD");
      if (password.length < 14 || Buffer.byteLength(password, "utf8") > 72) throw new Error("ADMIN_PASSWORD must be 14–72 bytes.");
      const sessionSecret = requireEnv("SESSION_SECRET");
      if (sessionSecret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
      if (/replace-with/i.test(password) || /replace-with/i.test(sessionSecret)) throw new Error("Replace the example credentials with private values before starting the server.");

      stage = "admin-password-hashing";
      adminPasswordHash = await bcrypt.hash(password, 12);
      adminCredentialVersion = crypto.createHash("sha256").update(password).digest("hex");
      stage = "mongodb-connection";
      await connectMongo();
      db = mongo.db();
      stage = "mongodb-index-creation";
      await Promise.all([
        db.collection("sessions").createIndex({ expires: 1 }, { expireAfterSeconds: 0 }),
        db.collection("rateLimits").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        db.collection("audit").createIndex({ at: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }),
        db.collection("leetcodeSubmissions").createIndex({ memberId: 1, activityDate: 1 })
      ]);
    })().catch(error => {
      runtimeInitializationPromise = undefined;
      logInitializationFailure(stage, error);
      throw error;
    });
  }
  return runtimeInitializationPromise;
}

function requireRuntime(req, res, next) {
  initializeRuntime().then(() => next()).catch(() => {
    if (!res.headersSent) res.status(503).json({ error: "Dashboard services are temporarily unavailable. Check server configuration and database connectivity." });
  });
}


function validState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      !Array.isArray(value.members) || value.members.length > 500 ||
      !value.weeks || typeof value.weeks !== "object" || Array.isArray(value.weeks) ||
      !Number.isInteger(value.currentWeek) || value.currentWeek < 1 || value.currentWeek > MAX_WEEKS) return false;

  const ids = new Set();
  const names = new Set();
  for (const member of value.members) {
    if (!member || Object.keys(member).some(key => !["id", "name", "role"].includes(key)) ||
        typeof member.id !== "string" || !/^[\w-]{1,100}$/.test(member.id) ||
        ids.has(member.id) || typeof member.name !== "string" || !member.name.trim() ||
        member.name.length > 60 || names.has(member.name.trim().toLocaleLowerCase()) ||
        typeof member.role !== "string" || member.role.length > 80) return false;
    ids.add(member.id);
    names.add(member.name.trim().toLocaleLowerCase());
  }
  for (const [weekKey, week] of Object.entries(value.weeks)) {
    if (!/^(?:[1-9]|1[0-9]|2[0-7])$/.test(weekKey) || !week || typeof week !== "object" ||
        Object.keys(week).some(key => !["daily", "concepts"].includes(key)) ||
        !week.daily || typeof week.daily !== "object" || !week.concepts || typeof week.concepts !== "object") return false;
    for (const [id, values] of Object.entries(week.daily)) {
      if (!ids.has(id) || !Array.isArray(values) || values.length !== 6 || values.some(x => !STATUSES.has(x))) return false;
    }
    for (const [id, values] of Object.entries(week.concepts)) {
      if (!ids.has(id) || !Array.isArray(values) || values.length !== 2 || values.some(x => !STATUSES.has(x))) return false;
    }
  }
  return Object.keys(value).every(key => ["members", "weeks", "currentWeek"].includes(key));
}

function audit(req, action, affected) {
  db.collection("audit").insertOne({ at: new Date(), admin: "Krish", action, affected }).catch(() => {});
}

function isAdminSession(req) {
  return req.session?.role === "admin" && req.session?.username === "Krish" && req.session?.credentialVersion === adminCredentialVersion;
}
const adminOnly = createAdminOnly(isAdminSession);

function mongoRateLimit(bucket, limit) {
  return async (req, res, next) => {
    try {
      const windowNumber = Math.floor(Date.now() / RATE_WINDOW_MS);
      const address = req.ip || req.socket.remoteAddress || "unknown";
      const addressHash = crypto.createHmac("sha256", process.env.SESSION_SECRET).update(address).digest("hex");
      const id = `${bucket}:${windowNumber}:${addressHash}`;
      try {
        await db.collection("rateLimits").updateOne({ _id: id }, { $setOnInsert: { count: 0, expiresAt: new Date((windowNumber + 1) * RATE_WINDOW_MS) } }, { upsert: true });
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
      const increment = await db.collection("rateLimits").updateOne({ _id: id, count: { $lt: limit } }, { $inc: { count: 1 } });
      if (!increment.matchedCount) {
        res.setHeader("Retry-After", String(Math.max(1, Math.ceil(((windowNumber + 1) * RATE_WINDOW_MS - Date.now()) / 1000))));
        return res.status(429).json({ error: "Too many attempts. Try again later." });
      }
      next();
    } catch {
      res.status(503).json({ error: "Security service is temporarily unavailable." });
    }
  };
}

app.disable("x-powered-by");
app.set("trust proxy", production ? 1 : false);
app.use(helmet({ contentSecurityPolicy: { directives: { "default-src": ["'self'"], "script-src": ["'self'"], "style-src": ["'self'", "'unsafe-inline'"], "img-src": ["'self'", "data:"], "connect-src": ["'self'"], "object-src": ["'none'"], "frame-ancestors": ["'none'"] } } }));
app.use(express.json({ limit: "1mb", strict: true }));
app.use("/api", (req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
app.use(requireRuntime);
app.use(session({
  name: "dsa.sid",
  secret: createSessionSecret(),
  store: MongoStore.create({ client: mongo, collectionName: "sessions", ttl: 60 * 60 * 8, autoRemove: "disabled" }),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { httpOnly: true, secure: production, sameSite: "strict", maxAge: 8 * 60 * 60 * 1000, path: "/" }
}));
const loginLimit = mongoRateLimit("admin-login", 8);
// SameSite cookies help prevent CSRF; reject cross-origin state-changing requests too.
app.use("/api", (req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const origin = req.get("origin");
    const fetchSite = req.get("sec-fetch-site");
    if ((origin && origin !== `${req.protocol}://${req.get("host")}`) || fetchSite === "cross-site") {
      return res.status(403).json({ error: "Cross-origin request rejected." });
    }
  }
  next();
});

app.get("/api/session", (req, res) => res.json({ authenticated: isAdminSession(req), username: isAdminSession(req) ? "Krish" : null, pages: PAGES.map(page => ({ page, public: true })) }));

app.post("/api/admin/login", loginLimit, async (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const valid = username.toLowerCase() === "krish" && Buffer.byteLength(password, "utf8") <= 72 && await bcrypt.compare(password, adminPasswordHash);
  if (!valid) return res.status(401).json({ error: "Invalid username or password." });
  req.session.regenerate(error => {
    if (error) return res.status(500).json({ error: "Could not start a session." });
    req.session.role = "admin";
    req.session.username = "Krish";
    req.session.credentialVersion = adminCredentialVersion;
    req.session.save(err => err ? res.status(500).json({ error: "Could not start a session." }) : res.json({ authenticated: true, username: "Krish" }));
  });
});

app.post("/api/logout", (req, res) => req.session.destroy(() => {
  res.clearCookie("dsa.sid", { httpOnly: true, secure: production, sameSite: "strict", path: "/" });
  res.json({ ok: true });
}));

// The complete tracker is reserved for admins; viewer routes below return page projections.
app.get("/api/data", adminOnly, async (req, res) => {
  const document = await db.collection("dashboard").findOne({ _id: "shared" });
  if (!document) return res.status(404).json({ error: "Shared dashboard data has not been initialized. An admin must import the existing backup." });
  const profiles = await db.collection("leetcodeProfiles").find({}).toArray();
  const cacheById = new Map(profiles.map(profile => [profile.memberId, profile]));
  res.json({ members: document.members, weeks: document.weeks, currentWeek: document.currentWeek, leetcode: Object.fromEntries(document.members.map(member => {
    const profile = profileForMember(member);
    return profile ? [member.id, publicRecord(cacheById.get(member.id), profile, member.id)] : null;
  }).filter(Boolean)) });
});

app.get("/api/page-data/:page", async (req, res) => {
  const page = req.params.page;
  if (!PAGES.includes(page)) return res.status(404).json({ error: "Page not found." });
  const weekNumber = Number(req.query.week);
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > MAX_WEEKS) return res.status(400).json({ error: "Choose a valid week." });
  const document = await db.collection("dashboard").findOne({ _id: "shared" });
  const shared = document || { members: [], weeks: {} };
  const members = shared.members.map(({ id, name }) => ({ id, name, role: "Member" }));
  const savedWeek = shared.weeks[String(weekNumber)] || { daily: {}, concepts: {} };
  const daily = id => Array.from({ length: 6 }, (_, i) => STATUSES.has(savedWeek.daily?.[id]?.[i]) ? savedWeek.daily[id][i] : "blank");
  const concepts = id => Array.from({ length: 2 }, (_, i) => STATUSES.has(savedWeek.concepts?.[id]?.[i]) ? savedWeek.concepts[id][i] : "blank");
  const workSlots = scheduledSlots(weekNumber);
  const possible = workSlots.length + (workSlots.length ? 2 : 0);
  const rows = members.map(member => {
    const d = workSlots.map(index => daily(member.id)[index]);
    const c = workSlots.length ? concepts(member.id) : [];
    return { ...member, ...scoreWeek(d, c, possible) };
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  if (page === "daily") {
    const date = typeof req.query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : null;
    const storedActivity = date ? await db.collection("leetcodeActivity").findOne({ _id: date }, { projection: { _id: 0 } }) : null;
    const activityDate = currentActivityDate();
    const previousActivityDate = addActivityDays(activityDate, -1);
    const [collectionJob, finalizationJob] = await Promise.all([
      db.collection("leetcodeActivityJobs").findOne({ _id: activityDate }, { projection: { _id: 0 } }),
      db.collection("leetcodeActivityJobs").findOne({ _id: previousActivityDate }, { projection: { _id: 0 } })
    ]);
    const isAdmin = isAdminSession(req);
    const currentCollection = date === activityDate ? collectionJob?.collection : null;
    const activity = storedActivity || (currentCollection ? {
      date: activityDate,
      lastSuccessfulAt: currentCollection.collectedAt || null,
      summary: {
        membersChecked: currentCollection.membersChecked,
        verifiedAttempts: currentCollection.verifiedAttempts,
        unableToVerify: currentCollection.unableToVerify,
        trackerUpdateFailures: Object.values(currentCollection.statuses || {}).filter(item => item?.trackerUpdateFailed || (item?.status === "Attempt verified" && item.updated === false && /tracker update failed/i.test(item.detail || ""))).length
      },
      statuses: currentCollection.statuses || {}
    } : null);
    const safeSummary = publicActivityRecord(activity)?.summary || {};
    const trackingSummary = {
      activityDate: activity?.date || date || activityDate,
      lastSuccessfulAt: activity?.lastSuccessfulAt || null,
      verifiedAttempts: safeSummary.verifiedAttempts || 0,
      unableToVerify: safeSummary.unableToVerify || 0,
      trackerUpdateFailures: safeSummary.trackerUpdateFailures || 0
    };
    return res.json({ page, week: weekNumber, date, activity: isAdmin ? activity : publicActivityRecord(activity), trackingSummary, activityDate, previousActivityDate, collectionJob: isAdmin ? collectionJob?.collection || null : null, finalizationJob: isAdmin ? finalizationJob?.finalization || null : null, members, statuses: Object.fromEntries(members.map(member => [member.id, daily(member.id)])) });
  }
  if (page === "concepts") return res.json({ page, week: weekNumber, members, statuses: Object.fromEntries(members.map(member => [member.id, concepts(member.id)])) });
  if (page === "members") {
    const docs = await db.collection("leetcodeProfiles").find({}).toArray();
    const cacheById = new Map(docs.map(doc => [doc.memberId, doc]));
    return res.json({ page, members, leetcode: Object.fromEntries(shared.members.map(member => {
      const profile = profileForMember(member);
      return profile ? [member.id, publicRecord(cacheById.get(member.id), profile, member.id)] : null;
    }).filter(Boolean)) });
  }
  if (page === "leaderboard") {
    applyEligibleDenseRanks(rows, possible ? Math.ceil(possible * 0.75) : Infinity);
    return res.json({ page, week: weekNumber, members: rows, participants: rows.length, qualified: rows.filter(row => row.qualified).length, highest: rows.length ? rows[0].score : 0 });
  }
  if (page === "overview") {
    const summary = rows.map(row => ({ name: row.name, dailyDone: row.dailyDone, conceptsDone: row.conceptsDone, overallDone: row.score, percent: row.percent }));
    return res.json({ page, week: weekNumber, participants: rows.length, dailyDone: rows.reduce((n, row) => n + row.dailyDone, 0), conceptsDone: rows.reduce((n, row) => n + row.conceptsDone, 0), summary });
  }
  if (page === "report") {
    return res.json({ page, week: weekNumber, members, statuses: { daily: Object.fromEntries(members.map(member => [member.id, daily(member.id)])), concepts: Object.fromEntries(members.map(member => [member.id, concepts(member.id)])) } });
  }
});

app.post("/api/data", adminOnly, async (req, res) => {
  if (!validState(req.body)) return res.status(400).json({ error: "Dashboard data failed validation." });
  await db.collection("dashboard").updateOne({ _id: "shared" }, { $set: { members: req.body.members, weeks: req.body.weeks, currentWeek: req.body.currentWeek, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  audit(req, "save-dashboard", "shared");
  res.json({ ok: true });
});

async function refreshLeetCodeProfiles({ force = false } = {}) {
  if (leetcodeRefreshPromise) return leetcodeRefreshPromise;
  if (!force && Date.now() - lastLeetcodeRefreshAt < REFRESH_INTERVAL_MS) return { skipped: true };
  leetcodeRefreshPromise = (async () => {
    const locks = db.collection("jobLocks");
    const lockToken = crypto.randomUUID();
    const now = new Date();
    try {
      await locks.updateOne({ _id: "leetcode-refresh", $or: [{ expiresAt: { $lt: now } }, { expiresAt: { $exists: false } }] },
        { $set: { token: lockToken, expiresAt: new Date(Date.now() + 3 * 60 * 1000) } }, { upsert: true });
    } catch (error) {
      if (error.code === 11000) return { skipped: true, inProgress: true };
      throw error;
    }
    const acquired = await locks.findOne({ _id: "leetcode-refresh", token: lockToken });
    if (!acquired) return { skipped: true, inProgress: true };
    try {
    const document = await db.collection("dashboard").findOne({ _id: "shared" });
    if (!document) throw new Error("DASHBOARD_NOT_INITIALIZED");
    const profiles = document.members.map(member => ({ member, profile: profileForMember(member) })).filter(item => item.profile);
    const existing = new Map((await db.collection("leetcodeProfiles").find({}).toArray()).map(record => [record.memberId, record]));
    if (!force && profiles.length && profiles.every(({ member }) => {
      const fetched = existing.get(member.id)?.lastFetchedAt;
      return fetched && Date.now() - new Date(fetched).getTime() < REFRESH_INTERVAL_MS;
    })) return { skipped: true };
    lastLeetcodeRefreshAt = Date.now();
    const results = [];
    for (const { member, profile } of profiles) {
      try {
        const stats = await fetchProfile(profile.username);
        const record = { _id: member.id, memberId: member.id, username: profile.username, stats, status: "Success", lastFetchedAt: new Date(), error: null };
        await db.collection("leetcodeProfiles").replaceOne({ _id: member.id }, record, { upsert: true });
        results.push({ memberId: member.id, username: profile.username, status: "Success" });
      } catch (error) {
        const code = ["RATE_LIMITED", "PROFILE_UNAVAILABLE", "UPSTREAM_UNAVAILABLE", "INVALID_STATS", "UPSTREAM_ERROR"].includes(error.message) ? error.message : error.name === "AbortError" ? "TIMEOUT" : "UPSTREAM_UNAVAILABLE";
        await db.collection("leetcodeProfiles").updateOne({ _id: member.id }, { $set: { memberId: member.id, username: profile.username, status: "Unavailable", error: code }, $setOnInsert: { stats: null, lastFetchedAt: null } }, { upsert: true });
        results.push({ memberId: member.id, username: profile.username, status: "Unavailable", error: code });
      }
      if (results.length < profiles.length) await new Promise(resolve => setTimeout(resolve, REQUEST_GAP_MS));
    }
    return { refreshed: results.length, results };
    } finally {
      await locks.deleteOne({ _id: "leetcode-refresh", token: lockToken }).catch(() => {});
    }
  })().finally(() => { leetcodeRefreshPromise = null; });
  return leetcodeRefreshPromise;
}

app.post("/api/admin/leetcode/refresh", adminOnly, async (req, res) => {
  try {
    const result = await refreshLeetCodeProfiles({ force: true });
    res.json(result);
  } catch {
    res.status(503).json({ error: "LeetCode refresh could not complete." });
  }
});

// Persistent local servers refresh periodically. Vercel uses its configured Cron invocation.
app.get("/api/cron/leetcode-refresh", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.get("authorization") !== `Bearer ${secret}`) return res.status(401).json({ error: "Unauthorized." });
  try { res.json(await refreshLeetCodeProfiles()); }
  catch { res.status(503).json({ error: "Scheduled LeetCode refresh could not complete." }); }
});

app.get("/api/cron/leetcode-activity", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.get("authorization") !== `Bearer ${secret}`) return res.status(401).json({ error: "Unauthorized." });
  try { res.json(await runLeetCodeActivityCycle()); }
  catch { res.status(503).json({ error: "Scheduled LeetCode activity collection could not complete." }); }
});

function currentActivityDate() {
  return effectiveActivityDate(Date.now() / 1000, "Asia/Kolkata");
}

async function setVerifiedDailyDone(memberId, week, slot) {
  const field = `weeks.${week}.daily.${memberId}`;
  for (let retry = 0; retry < 3; retry++) {
    const document = await db.collection("dashboard").findOne({ _id: "shared" });
    if (!document) throw new Error("DASHBOARD_NOT_INITIALIZED");
    const saved = document.weeks?.[String(week)]?.daily?.[memberId];
    let current;
    if (Array.isArray(saved) && saved.length === 6 && saved.every(value => STATUSES.has(value))) current = saved;
    else if (saved === undefined) current = Array(6).fill("blank");
    else throw new Error("INVALID_DAILY_TRACKER");
    if (current[slot] === "done") return false;
    const updated = current.slice();
    updated[slot] = "done";
    const filter = saved === undefined ? { [field]: { $exists: false } } : { [field]: saved };
    const result = await db.collection("dashboard").updateOne({ _id: "shared", ...filter }, { $set: { [field]: updated, updatedAt: new Date() } });
    if (result.modifiedCount === 1) return true;
  }
  throw new Error("DAILY_TRACKER_CHANGED_CONCURRENTLY");
}

async function setDailyAbsentIfBlank(memberId, week, slot) {
  const field = `weeks.${week}.daily.${memberId}`;
  for (let retry = 0; retry < 3; retry++) {
    const document = await db.collection("dashboard").findOne({ _id: "shared" });
    if (!document) throw new Error("DASHBOARD_NOT_INITIALIZED");
    const saved = document.weeks?.[String(week)]?.daily?.[memberId];
    let current;
    if (Array.isArray(saved) && saved.length === 6 && saved.every(value => STATUSES.has(value))) current = saved;
    else if (saved === undefined) current = Array(6).fill("blank");
    else throw new Error("INVALID_DAILY_TRACKER");
    if (current[slot] !== "blank") return { updated: false, status: current[slot] };
    const updated = current.slice();
    updated[slot] = "absent";
    const filter = saved === undefined ? { [field]: { $exists: false } } : { [field]: saved };
    const result = await db.collection("dashboard").updateOne({ _id: "shared", ...filter }, { $set: { [field]: updated, updatedAt: new Date() } });
    if (result.modifiedCount === 1) return { updated: true, status: "absent" };
  }
  throw new Error("DAILY_TRACKER_CHANGED_CONCURRENTLY");
}

async function setDailyStatusExplicit(memberId, week, slot, status) {
  const field = `weeks.${week}.daily.${memberId}`;
  const trackerStatus = status === "Done" ? "done" : "absent";
  for (let retry = 0; retry < 3; retry++) {
    const document = await db.collection("dashboard").findOne({ _id: "shared" });
    if (!document) throw new Error("DASHBOARD_NOT_INITIALIZED");
    const saved = document.weeks?.[String(week)]?.daily?.[memberId];
    let current;
    if (Array.isArray(saved) && saved.length === 6 && saved.every(value => STATUSES.has(value))) current = saved;
    else if (saved === undefined) current = Array(6).fill("blank");
    else throw new Error("INVALID_DAILY_TRACKER");
    if (current[slot] === trackerStatus) return false;
    const updated = current.slice();
    updated[slot] = trackerStatus;
    const filter = saved === undefined ? { [field]: { $exists: false } } : { [field]: saved };
    const result = await db.collection("dashboard").updateOne({ _id: "shared", ...filter }, { $set: { [field]: updated, updatedAt: new Date() } });
    if (result.modifiedCount === 1) return true;
  }
  throw new Error("DAILY_TRACKER_CHANGED_CONCURRENTLY");
}

async function acquireLeetCodeActivityLock(lockToken, operation, activityDate, operationId) {
  const lockId = "leetcode-activity";
  const log = (event, details = {}) => console.info("[leetcode-activity] lock", { event, ...details, operation, activityDate, operationId });
  const result = await acquireActivityLease(db.collection("jobLocks"), {
    lockId, token: lockToken, ownerId: activityLockOwnerId,
    leaseMs: ACTIVITY_LOCK_LEASE_MS,
    log
  });
  if (!result.acquired) return result;
  const lock = { ...result, lockToken, operation, activityDate, operationId, log };
  lock.heartbeatPending = Promise.resolve();
  lock.heartbeat = setInterval(() => {
    lock.heartbeatPending = lock.heartbeatPending.then(() => renewActivityLease(lock)).then(() => lock.log("lease-renewed", { lockId })).catch(error => console.error("[leetcode-activity] lock", {
      event: "heartbeat-failed", lockId, operation, activityDate, operationId, code: error.message === "ACTIVITY_LEASE_LOST" ? error.message : "LEASE_RENEWAL_FAILED"
    }));
  }, ACTIVITY_LOCK_HEARTBEAT_MS);
  lock.heartbeat.unref?.();
  return lock;
}

async function releaseLeetCodeActivityLock(lock) {
  clearInterval(lock.heartbeat);
  await lock.heartbeatPending;
  lock.log(lock.completed ? "completed" : "releasing", { lockId: lock.lockId });
  try {
    await releaseActivityLease(lock, lock.log);
  } catch (error) {
    console.error("[leetcode-activity] lock", { event: "release-failed", lockId: lock.lockId, operation: lock.operation, activityDate: lock.activityDate, operationId: lock.operationId, code: safeDiagnosticCode(error) });
  }
}

async function finalizeActivityDate(date, members, recentByMember) {
  const rawPosition = trackerPosition(date);
  const position = rawPosition && scheduledSlots(rawPosition.week).includes(rawPosition.slot) ? rawPosition : null;
  if (!position) {
    const result = { status: "Not scheduled", finalizedAt: new Date(), membersChecked: 0, verifiedAttempts: 0, done: 0, notSubmitted: 0, needsReview: 0, entriesUpdated: 0, statuses: {} };
    await db.collection("leetcodeActivityJobs").updateOne({ _id: date }, { $set: { date, finalization: result, updatedAt: new Date() } }, { upsert: true });
    return result;
  }
  const statuses = {};
  const priorFinalization = await db.collection("leetcodeActivityJobs").findOne({ _id: date }, { projection: { finalization: 1 } });
  const priorStatuses = priorFinalization?.finalization?.statuses || {};
  let done = 0;
  let notSubmitted = 0;
  let needsReview = 0;
  let verifiedAttempts = 0;
  let entriesUpdated = 0;
  for (const member of members) {
    const priorStatus = priorStatuses[member.id];
    if (preserveFinalizationStatus(priorStatus)) {
      statuses[member.id] = priorStatus;
      if (priorStatus.status === "Done") done++;
      else if (priorStatus.status === "Not Submitted") notSubmitted++;
      else needsReview++;
      verifiedAttempts += priorStatus.attemptCount || 0;
      continue;
    }
    const historyRows = await db.collection("leetcodeSubmissions").find({ memberId: member.id, activityDate: date }).toArray();
    const storedAttempts = matchingActivitySubmissions(historyRows, date);
    if (priorStatus?.source === "automatic" && priorStatus.status === "Not Submitted" && !storedAttempts.length) {
      statuses[member.id] = priorStatus;
      notSubmitted++;
      continue;
    }
    const profile = profileForMember(member);
    if (!profile && !storedAttempts.length) {
      statuses[member.id] = { status: "Needs review", source: "automatic", detail: "No LeetCode profile is mapped to this member." };
      needsReview++;
      continue;
    }
    const recent = recentByMember.get(member.id);
    const result = classifyFinalization({ historyRows, recentRows: recent?.rows, fetchSucceeded: recent?.succeeded, date, limit: RECENT_SUBMISSION_LIMIT });
    if (result.status === "Done") {
      verifiedAttempts += result.attempts.length;
      try {
        const updated = position ? await setVerifiedDailyDone(member.id, position.week, position.slot) : false;
        if (updated) entriesUpdated++;
        statuses[member.id] = { status: "Done", source: "automatic", attemptCount: result.attempts.length, updated };
        done++;
      } catch {
          statuses[member.id] = { status: "Needs review", source: "automatic", detail: "Attempt verified, but tracker update failed.", attemptCount: result.attempts.length };
        needsReview++;
      }
    } else if (result.status === "Not Submitted" && position) {
      try {
        const outcome = await setDailyAbsentIfBlank(member.id, position.week, position.slot);
        if (outcome.status === "done") {
          statuses[member.id] = { status: "Needs review", source: "automatic", detail: "Existing Done status was preserved because no matching attempt was found." };
          needsReview++;
        } else {
          statuses[member.id] = { status: "Not Submitted", source: "automatic", updated: outcome.updated };
          if (outcome.updated) entriesUpdated++;
          notSubmitted++;
        }
      } catch {
        statuses[member.id] = { status: "Needs review", source: "automatic", detail: "No attempt could be recorded in the tracker." };
        needsReview++;
      }
    } else {
      statuses[member.id] = { status: "Needs review", source: "automatic", detail: result.detail || "Submission data is incomplete." };
      needsReview++;
    }
  }
  const result = {
    status: needsReview ? "Needs review" : "Finalized",
    finalizedAt: new Date(), membersChecked: members.length,
    verifiedAttempts, done, notSubmitted, needsReview, entriesUpdated, statuses
  };
  await db.collection("leetcodeActivityJobs").updateOne({ _id: date }, { $set: { date, finalization: result, updatedAt: new Date() } }, { upsert: true });
  return result;
}

async function runLeetCodeActivityCycle() {
  if (leetcodeActivityCyclePromise) return leetcodeActivityCyclePromise;
  leetcodeActivityCyclePromise = (async () => {
    const lockToken = crypto.randomUUID();
    const activityDate = currentActivityDate();
    const operationId = crypto.randomUUID();
    const lock = await acquireLeetCodeActivityLock(lockToken, "scheduled-cycle", activityDate, operationId);
    if (!lock.acquired) return { skipped: true, inProgress: true, lockState: lock.reason, retryAfterSeconds: lock.retryAfterSeconds };
    const startedAt = Date.now();
    console.info("[leetcode-activity] cycle started", { activityDate });
    try {
      const dashboard = await db.collection("dashboard").findOne({ _id: "shared" });
      if (!dashboard) throw new Error("DASHBOARD_NOT_INITIALIZED");
      const now = new Date();
      const currentDate = currentActivityDate();
      const rawCurrentPosition = trackerPosition(currentDate);
      const currentPosition = rawCurrentPosition && scheduledSlots(rawCurrentPosition.week).includes(rawCurrentPosition.slot) ? rawCurrentPosition : null;
      const recentByMember = new Map();
      const currentStatuses = {};
      let membersChecked = 0;
      let verifiedAttempts = 0;
      let entriesUpdated = 0;
      let unableToVerify = 0;
      let successfulLookups = 0;
      const mapped = dashboard.members.map(member => ({ member, profile: profileForMember(member) }));
      for (const { member, profile } of mapped) {
        if (!profile) {
          unableToVerify++;
          currentStatuses[member.id] = { status: "Unable to verify", detail: "No LeetCode profile is mapped to this member." };
          continue;
        }
        membersChecked++;
        let rows;
        try {
          rows = await fetchRecentSubmissions(profile.username);
          recentByMember.set(member.id, { rows, succeeded: true });
          successfulLookups++;
        } catch (error) {
          recentByMember.set(member.id, { rows: null, succeeded: false });
          unableToVerify++;
          currentStatuses[member.id] = { status: "Unable to verify", detail: ["RATE_LIMITED", "PROFILE_UNAVAILABLE", "UPSTREAM_UNAVAILABLE", "INVALID_ACTIVITY", "UPSTREAM_ERROR"].includes(error.message) ? error.message : "UPSTREAM_UNAVAILABLE" };
          if (membersChecked < mapped.filter(item => item.profile).length) await new Promise(resolve => setTimeout(resolve, REQUEST_GAP_MS));
          continue;
        }
        let historySaveFailed = false;
        try { await persistSubmissionHistory(db.collection("leetcodeSubmissions"), member, profile.username, rows, now); }
        catch { historySaveFailed = true; }
        const attempts = rows.filter(row => effectiveActivityDate(row.timestamp) === currentDate);
        if (attempts.length && currentPosition) {
          try {
            const updated = await setVerifiedDailyDone(member.id, currentPosition.week, currentPosition.slot);
            if (updated) entriesUpdated++;
            verifiedAttempts += attempts.length;
            currentStatuses[member.id] = { status: "Attempt verified", attemptCount: attempts.length, updated, detail: historySaveFailed ? "Submission verified; history could not be saved." : undefined };
          } catch {
            verifiedAttempts += attempts.length;
            currentStatuses[member.id] = { status: "Attempt verified", attemptCount: attempts.length, updated: false, detail: "Tracker update failed." };
          }
        } else if (attempts.length) {
          verifiedAttempts += attempts.length;
          currentStatuses[member.id] = { status: "Attempt verified", attemptCount: attempts.length, updated: false, detail: "No scheduled tracker slot exists for this date." };
        } else {
          currentStatuses[member.id] = { status: "No attempt observed", detail: rows.length >= RECENT_SUBMISSION_LIMIT ? "Recent response reached its limit; older activity may be omitted." : "No submission appeared in the latest public response." };
        }
        if (membersChecked < mapped.filter(item => item.profile).length) await new Promise(resolve => setTimeout(resolve, REQUEST_GAP_MS));
      }
      const collectedAt = successfulLookups ? new Date() : null;
      const prior = await db.collection("leetcodeActivityJobs").findOne({ _id: currentDate });
      const collection = {
        status: successfulLookups ? (unableToVerify ? "Partial" : "Success") : "Unable to verify",
        collectedAt: collectedAt || prior?.collection?.collectedAt || null,
        lastAttemptAt: new Date(), membersChecked, verifiedAttempts, entriesUpdated, unableToVerify, statuses: currentStatuses
      };
      await db.collection("leetcodeActivityJobs").updateOne({ _id: currentDate }, { $set: { date: currentDate, collection, updatedAt: new Date() } }, { upsert: true });

      const cursor = await db.collection("leetcodeActivityJobs").findOne({ _id: "scheduler" });
      const dates = activityDatesToFinalize(cursor?.lastFinalizedDate || null, currentDate, 7);
      const yesterday = addActivityDays(currentDate, -1);
      if (!dates.includes(yesterday)) {
        const yesterdayDoc = await db.collection("leetcodeActivityJobs").findOne({ _id: yesterday }, { projection: { finalization: 1 } });
        if (yesterdayDoc?.finalization?.status === "Needs review") dates.push(yesterday);
      }
      let lastFinalizedDate = cursor?.lastFinalizedDate || null;
      for (const date of dates.sort()) {
        const existing = await db.collection("leetcodeActivityJobs").findOne({ _id: date }, { projection: { finalization: 1 } });
        if (existing?.finalization?.status === "Finalized") {
          if (!lastFinalizedDate || date > lastFinalizedDate) lastFinalizedDate = date;
          continue;
        }
        await finalizeActivityDate(date, dashboard.members, date === yesterday ? recentByMember : new Map());
        if (!lastFinalizedDate || date > lastFinalizedDate) lastFinalizedDate = date;
      }
      if (lastFinalizedDate) await db.collection("leetcodeActivityJobs").updateOne({ _id: "scheduler" }, { $set: { lastFinalizedDate, updatedAt: new Date() } }, { upsert: true });
      const result = { currentDate, collection, finalizedDates: dates };
      console.info("[leetcode-activity] cycle completed", { activityDate: currentDate, operationId, membersChecked, verifiedAttempts, entriesUpdated, unableToVerify, finalizedDates: dates.length, durationMs: Date.now() - startedAt });
      lock.completed = true;
      return result;
    } catch (error) {
      console.error("[leetcode-activity] cycle failed", { activityDate, code: safeDiagnosticCode(error), durationMs: Date.now() - startedAt });
      throw error;
    } finally {
      await releaseLeetCodeActivityLock(lock);
    }
  })().finally(() => { leetcodeActivityCyclePromise = null; });
  return leetcodeActivityCyclePromise;
}

function refreshLeetCodeActivity(date, position) {
  if (leetcodeActivityRefreshes.has(date)) {
    console.info("[leetcode-activity] lock", { event: "blocked-local-active", lockId: "leetcode-activity", operation: "manual-refresh", activityDate: date, operationId: crypto.randomUUID() });
    return Promise.resolve({ inProgress: true, lockState: "active", date });
  }
  const refresh = (async () => {
    const lockToken = crypto.randomUUID();
    const operationId = crypto.randomUUID();
    const lock = await acquireLeetCodeActivityLock(lockToken, "manual-refresh", date, operationId);
    if (!lock.acquired) return { inProgress: true, lockState: lock.reason, retryAfterSeconds: lock.retryAfterSeconds, date };
    try {
      const document = await db.collection("dashboard").findOne({ _id: "shared" });
      if (!document) throw new Error("DASHBOARD_NOT_INITIALIZED");
      const statuses = {};
      const mapped = document.members.map(member => ({ member, profile: profileForMember(member) }));
      let membersChecked = 0;
      let verifiedAttempts = 0;
      let membersWithAttempts = 0;
      let entriesUpdated = 0;
      let trackerUpdateFailures = 0;
      let unableToVerify = 0;
      let successfulLookups = 0;
      for (const { member, profile } of mapped) {
        if (!profile) {
          unableToVerify++;
          statuses[member.id] = { username: null, status: "Unable to verify", detail: "No LeetCode profile is mapped to this member." };
          continue;
        }
        membersChecked++;
        const checked = await inspectMemberActivity({
          fetchSubmissions: fetchRecentSubmissions, username: profile.username, date,
          markDone: () => setVerifiedDailyDone(member.id, position.week, position.slot),
          onSubmissions: rows => persistSubmissionHistory(db.collection("leetcodeSubmissions"), member, profile.username, rows)
        });
        if (checked.fetched) successfulLookups++;
        if (!checked.verified) {
          unableToVerify++;
          statuses[member.id] = { username: profile.username, status: checked.status, detail: checked.detail, recentRecords: checked.recentRecords ?? null };
        } else {
          membersWithAttempts++;
          verifiedAttempts += checked.attempts.length;
          if (checked.updated) entriesUpdated++;
          if (checked.trackerUpdateFailed) trackerUpdateFailures++;
          statuses[member.id] = {
            username: profile.username, status: checked.status,
            detail: checked.trackerUpdateFailed ? `${checked.detail}; tracker update failed` : checked.detail,
            attemptCount: checked.attempts.length, updated: checked.updated, trackerUpdateFailed: Boolean(checked.trackerUpdateFailed)
          };
        }
        if (membersChecked < mapped.filter(item => item.profile).length) await new Promise(resolve => setTimeout(resolve, REQUEST_GAP_MS));
      }
      const summary = { membersChecked, verifiedAttempts, membersWithAttempts, entriesUpdated, unableToVerify, trackerUpdateFailures };
      const refreshedAt = new Date();
      const prior = await db.collection("leetcodeActivity").findOne({ _id: date }, { projection: { lastSuccessfulAt: 1 } });
      const lastSuccessfulAt = successfulLookups ? refreshedAt : prior?.lastSuccessfulAt || null;
      const activityResult = { _id: date, date, week: position.week, slot: position.slot, refreshedAt, lastSuccessfulAt, summary, statuses, lockRecovered: Boolean(lock.recovered) };
      await db.collection("leetcodeActivity").replaceOne({ _id: date }, activityResult, { upsert: true });
      audit({ session: { username: "Krish" } }, "leetcode-activity-refresh", date);
      lock.completed = true;
      return activityResult;
    } finally {
      await releaseLeetCodeActivityLock(lock);
    }
  })().finally(() => leetcodeActivityRefreshes.delete(date));
  leetcodeActivityRefreshes.set(date, refresh);
  return refresh;
}

app.post("/api/admin/leetcode/activity/refresh", adminOnly, async (req, res) => {
  const date = req.body?.date;
  const position = trackerPosition(date);
  const requestedWeek = Number(req.body?.week);
  if (!position || position.week !== requestedWeek || date < "2026-08-01" || date > "2027-01-16" || date > currentActivityDate() || !scheduledSlots(position.week).includes(position.slot)) {
    return res.status(400).json({ error: "Choose a past or current scheduled tracker date and its matching week." });
  }
  try {
    const result = await refreshLeetCodeActivity(date, position);
    if (result.inProgress) return res.status(409).json({
      error: result.lockState === "active" ? "A LeetCode activity refresh is already running in this server process." : "A valid LeetCode activity lease is still in effect. Retry after the estimated wait.",
      code: result.lockState === "active" ? "ACTIVITY_REFRESH_ACTIVE" : "ACTIVITY_REFRESH_LEASE_VALID", date, retryAfterSeconds: result.retryAfterSeconds || null
    });
    res.json(result);
  } catch {
    console.error("[leetcode-activity] manual refresh failed", { date, code: "ACTIVITY_REFRESH_FAILED" });
    res.status(503).json({ error: "LeetCode activity could not be refreshed." });
  }
});

app.post("/api/admin/leetcode/activity/finalize", adminOnly, async (req, res) => {
  const { date, memberId, status } = req.body || {};
  const position = trackerPosition(date);
  if (!position || date < "2026-08-01" || date >= currentActivityDate() || !scheduledSlots(position.week).includes(position.slot) || !["Done", "Not Submitted"].includes(status) || typeof memberId !== "string") {
    return res.status(400).json({ error: "Choose a previous scheduled activity date, member, and manual status." });
  }
  const lockToken = crypto.randomUUID();
  const operationId = crypto.randomUUID();
  let lock;
  try {
    lock = await acquireLeetCodeActivityLock(lockToken, "manual-finalization", date, operationId);
    if (!lock.acquired) return res.status(409).json({ error: "A valid LeetCode activity lease is still in effect. Retry after the estimated wait.", code: "ACTIVITY_REFRESH_LEASE_VALID", retryAfterSeconds: lock.retryAfterSeconds || null });
    const dashboard = await db.collection("dashboard").findOne({ _id: "shared" });
    const member = dashboard?.members.find(item => item.id === memberId);
    if (!member) return res.status(404).json({ error: "Member not found." });
    const activityJob = await db.collection("leetcodeActivityJobs").findOne({ _id: date });
    const previousFinalization = activityJob?.finalization;
    if (!previousFinalization) return res.status(409).json({ error: "This activity date has not been automatically reviewed yet." });
    const existingAttempt = await db.collection("leetcodeSubmissions").findOne({ memberId, activityDate: date });
    const legacyActivity = await db.collection("leetcodeActivity").findOne({ _id: date });
    const legacyVerified = legacyActivity?.statuses?.[memberId]?.status === "Attempt verified";
    if (status === "Not Submitted" && (existingAttempt || legacyVerified)) return res.status(409).json({ error: "A verified LeetCode attempt exists for this date. The tracker cannot be marked Not Submitted." });
    const decidedAt = new Date();
    let decision;
    try { decision = manualFinalizationDecision(previousFinalization, memberId, status, req.session.username, decidedAt); }
    catch (error) {
      if (error.message === "VERIFIED_DONE_PROTECTED") return res.status(409).json({ error: "An automatically verified Done status is protected." });
      return res.status(409).json({ error: "This member does not currently need manual review." });
    }
    const trackerChanged = await setDailyStatusExplicit(memberId, position.week, position.slot, status);
    const statuses = { ...(previousFinalization.statuses || {}), [memberId]: { ...decision, updated: trackerChanged } };
    const all = Object.values(statuses);
    const done = all.filter(item => item.status === "Done").length;
    const notSubmitted = all.filter(item => item.status === "Not Submitted").length;
    const needsReview = all.filter(item => item.status === "Needs review").length;
    const finalization = {
      ...previousFinalization,
      status: needsReview ? "Needs review" : "Finalized",
      finalizedAt: decidedAt,
      manualReviewedAt: decidedAt,
      done, notSubmitted, needsReview,
      entriesUpdated: all.filter(item => item.updated).length,
      statuses,
      decisions: [...(previousFinalization.decisions || []), { memberId, status, actor: req.session.username, at: decidedAt }]
    };
    await db.collection("leetcodeActivityJobs").updateOne({ _id: date }, { $set: { date, finalization, updatedAt: decidedAt } });
    audit(req, "leetcode-activity-manual-finalization", `${date}:${memberId}:${status}`);
    console.info("[leetcode-activity] manual decision recorded", { activityDate: date, memberId, status, actor: req.session.username });
    lock.completed = true;
    res.json({ date, finalization });
  } catch {
    console.error("[leetcode-activity] manual decision failed", { activityDate: date, code: "MANUAL_FINALIZATION_FAILED" });
    res.status(503).json({ error: "The manual activity decision could not be saved." });
  } finally {
    if (lock?.acquired) await releaseLeetCodeActivityLock(lock);
  }
});

app.post("/api/admin/import", adminOnly, async (req, res) => {
  if (!validState(req.body)) return res.status(400).json({ error: "Backup data failed validation." });
  const result = await db.collection("dashboard").updateOne({ _id: "shared" }, { $setOnInsert: { members: req.body.members, weeks: req.body.weeks, currentWeek: req.body.currentWeek, createdAt: new Date() } }, { upsert: true });
  if (!result.upsertedCount) return res.status(409).json({ error: "Shared data already exists. Use the authenticated admin save flow to update it." });
  audit(req, "import-initial-backup", "shared");
  res.status(201).json({ ok: true });
});

app.get("/api/admin/audit", adminOnly, async (req, res) => {
  const entries = await db.collection("audit").find({}, { projection: { _id: 0 } }).sort({ at: -1 }).limit(100).toArray();
  res.json(entries);
});

function startLeetCodeActivityScheduler() {
  const collect = () => runLeetCodeActivityCycle().catch(() => {});
  collect();
  setInterval(collect, 15 * 60 * 1000).unref();
  const scheduleBoundary = () => {
    const delay = Math.max(1, nextActivityBoundaryMs(Date.now() / 1000) - Date.now());
    const timer = setTimeout(() => { collect(); scheduleBoundary(); }, delay);
    timer.unref();
  };
  scheduleBoundary();
}

app.get("/", (req, res) => { res.setHeader("Cache-Control", "no-store"); res.sendFile(path.join(__dirname, "index.html")); });
app.get("/index.html", (req, res) => { res.setHeader("Cache-Control", "no-store"); res.sendFile(path.join(__dirname, "index.html")); });
app.get("/style.css", (req, res) => res.sendFile(path.join(__dirname, "style.css")));
app.get("/activity-date.js", (req, res) => res.sendFile(path.join(__dirname, "activity-date.js")));
app.get("/script.js", (req, res) => res.sendFile(path.join(__dirname, "script.js")));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  res.status(error.status || 500).json({ error: error.status === 413 ? "Request too large." : "Request could not be completed." });
});

function startLocalServer() {
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`DSA dashboard listening on port ${PORT}`);
  });

  // Make the web service available to Render's port scan while MongoDB and
  // indexes initialize. Runtime-gated routes return 503 until this completes.
  let activitySchedulerStarted = false;
  const initializeBackgroundJobs = () => initializeRuntime().then(() => {
    refreshLeetCodeProfiles().catch(() => {});
    if (!process.env.VERCEL && !activitySchedulerStarted) {
      activitySchedulerStarted = true;
      startLeetCodeActivityScheduler();
    }
  }).catch(() => {});
  initializeBackgroundJobs();
  if (!process.env.VERCEL) setInterval(() => {
    if (db) refreshLeetCodeProfiles().catch(() => {});
  }, REFRESH_INTERVAL_MS).unref();
  if (!process.env.VERCEL) setInterval(() => {
    if (!activitySchedulerStarted) initializeBackgroundJobs();
  }, 60 * 1000).unref();
  return server;
}

if (require.main === module) startLocalServer();

module.exports = app;
