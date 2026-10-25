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
const { safeMongoDiagnostic, safeMongoMessage } = require("./diagnostics");
const { createRequiredIndexes } = require("./mongo-indexes");
const { createAdminOnly, createAdminLoginHandler, createLogoutHandler } = require("./admin-auth");
const { validFirebaseUid, createMemberFirebaseLoginHandler, createMemberOnly } = require("./member-auth");
const { normalizeMemberEmail } = require("./member-allowlist");
const { approvedMemberForEmail, dashboardMemberMatchesApproved, approvedDashboardMemberForEmail, approvedIdentityConflictCategory } = require("./approved-member-mapping");
const { createMemberEmailLinkHandler } = require("./member-email-link");
const { requiredFirebaseClientConfig, createFirebaseTokenVerifier } = require("./firebase-auth");
const { createMongoRateLimit } = require("./mongo-rate-limit");
const { SESSION_TTL_SECONDS, createAdminSessionOptions } = require("./session-config");
const { sameOriginMutationOnly } = require("./request-security");
const { calculateTotalActiveDays, resolveTodayActivity, calculateTotalMemberPoints, publicSolvedStats, createMemberDashboardHandler } = require("./member-dashboard");
const { createPersonalProfileResolver } = require("./member-profiles");
const { publicProfile: publicCharacterVerseProfile, ensureProfile: ensureCharacterVerseProfile, saveAppearance: saveCharacterVerseAppearance, purchase: purchaseCharacterVerseItem } = require("./characterverse-profiles");
const { awardTrustedDaily, publicLedgerEntry } = require("./characterverse-rewards");
const { REFRESH_INTERVAL_MS, REQUEST_GAP_MS, RECENT_SUBMISSION_LIMIT, profileForMember, fetchProfile, fetchRecentSubmissions, inspectMemberActivity, effectiveActivityDate, trackerPosition, publicRecord } = require("./leetcode");
const { addActivityDays, nextActivityBoundaryMs } = require("./activity-date");
const { MAX_WEEKS, scheduledSlots } = require("./tracker-calendar");
const { persistSubmissionHistory, matchingActivitySubmissions, classifyFinalization, activityDatesToFinalize, manualFinalizationDecision, preserveFinalizationStatus, publicActivityRecord, ACTIVITY_LOCK_LEASE_MS, ACTIVITY_LOCK_HEARTBEAT_MS, acquireActivityLease, renewActivityLease, releaseActivityLease } = require("./activity-jobs");

const PAGES = ["overview", "daily", "concepts", "members", "report", "leaderboard"];
const STATUSES = new Set(["blank", "done", "absent"]);
const PORT = Number(process.env.PORT) || 3000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const production = process.env.NODE_ENV === "production";
const app = express();
const mongo = createMongoClient();
let db;
let mongoConnectPromise;
let runtimeInitializationPromise;
let runtimeInitializationFailure;
let runtimeRetryAfter = 0;
let leetcodeRefreshPromise;
let leetcodeActivityCyclePromise;
let lastLeetcodeRefreshAt = 0;
const leetcodeActivityRefreshes = new Map();
const activityLockOwnerId = `${process.pid}:${crypto.randomUUID()}`;
const RUNTIME_RETRY_DELAY_MS = 5000;

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
  const indexOperation = error?.indexOperation;
  console.error("[dashboard-init] initialization failed", {
    stage, ...fields,
    message: safeMongoMessage(error),
    ...(indexOperation ? { indexOperation } : {})
  });
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
  if (!runtimeInitializationPromise && runtimeInitializationFailure && Date.now() < runtimeRetryAfter) {
    return Promise.reject(runtimeInitializationFailure);
  }
  if (!runtimeInitializationPromise) {
    let stage = "configuration-validation";
    runtimeInitializationPromise = (async () => {
      const sessionSecret = requireEnv("SESSION_SECRET");
      if (sessionSecret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
      if (/replace-with/i.test(sessionSecret)) throw new Error("Replace the example session secret with a private value before starting the server.");

      stage = "mongodb-connection";
      await connectMongo();
      db = mongo.db();
      stage = "mongodb-index-creation";
      await createRequiredIndexes(db);
      runtimeInitializationFailure = undefined;
      runtimeRetryAfter = 0;
    })().catch(error => {
      runtimeInitializationPromise = undefined;
      runtimeInitializationFailure = error;
      runtimeRetryAfter = Date.now() + RUNTIME_RETRY_DELAY_MS;
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
    if (!member || Object.keys(member).some(key => !["id", "name", "role", "email"].includes(key)) ||
        typeof member.id !== "string" || !/^[\w-]{1,100}$/.test(member.id) ||
        ids.has(member.id) || typeof member.name !== "string" || !member.name.trim() ||
        member.name.length > 60 || names.has(member.name.trim().toLocaleLowerCase()) ||
        typeof member.role !== "string" || member.role.length > 80 ||
        (member.email !== undefined && (normalizeMemberEmail(member.email) !== member.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)))) return false;
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
  db.collection("audit").insertOne({ at: new Date(), admin: req.session?.adminEmail || "system", action, affected }).catch(() => {});
}

function isAdminSession(req) {
  return req.session?.role === "admin" && typeof req.session?.adminEmail === "string";
}
const adminOnly = createAdminOnly(isAdminSession);
async function primaryAdminOnly(req, res, next) {
  try {
    const admin = await db.collection("admins").findOne({ _id: "primary", email: req.session.adminEmail }, { projection: { _id: 1 } });
    if (!admin) return res.status(403).json({ error: "Primary administrator permission required." });
    return next();
  } catch {
    return res.status(503).json({ error: "Administrator authorization is temporarily unavailable." });
  }
}
async function dashboardViewer(req, res, next) {
  if (isAdminSession(req)) return next();
  return memberOnly(req, res, next);
}

async function findDashboardMemberById(memberId) {
  const dashboard = await db.collection("dashboard").findOne({ _id: "shared" }, { projection: { members: 1 } });
  return dashboard?.members?.find(member => member.id === memberId) || null;
}

async function findDashboardMemberByEmail(email) {
  const normalizedEmail = normalizeMemberEmail(email);
  if (!normalizedEmail) return null;
  const dashboard = await db.collection("dashboard").findOne({ _id: "shared" }, { projection: { members: 1 } });
  return dashboard?.members?.find(member => normalizeMemberEmail(member.email) === normalizedEmail) || null;
}

function identityConflict(memberId, category) {
  // Do not include tokens, UIDs, emails, or request data in this diagnostic.
  console.warn("[member-auth] identity conflict", { category, memberId });
  const error = new Error("Identity mapping conflict.");
  error.status = 409;
  return error;
}

function missingApprovedMember() {
  const error = new Error("The approved account has no matching existing member record.");
  error.status = 404;
  return error;
}

async function findAndLinkApprovedGroupMember(email, firebaseUid, photoUrl) {
  const approved = approvedMemberForEmail(email);
  if (!approved) return null;
  const normalizedEmail = normalizeMemberEmail(email);
  const dashboard = await db.collection("dashboard").findOne({ _id: "shared" }, { projection: { members: 1 } });
  const member = approvedDashboardMemberForEmail(dashboard?.members || [], email);
  if (!member) throw missingApprovedMember();
  const emailMatches = (dashboard?.members || []).filter(candidate => normalizeMemberEmail(candidate.email) === normalizedEmail);
  const [otherEmailLink, linkByUid, existingLink] = await Promise.all([
    db.collection("memberAuthLinks").findOne({ email: normalizedEmail, _id: { $ne: member.id } }, { projection: { _id: 1 } }),
    db.collection("memberAuthLinks").findOne({ firebaseUid, deactivatedAt: { $exists: false } }, { projection: { _id: 1 } }),
    db.collection("memberAuthLinks").findOne({ _id: member.id })
  ]);
  const oldEmail = normalizeMemberEmail(member.email);
  const conflictCategory = approvedIdentityConflictCategory({ member, email: normalizedEmail, emailMatches, otherEmailLink, linkByUid, existingLink, firebaseUid });
  if (conflictCategory) throw identityConflict(member.id, conflictCategory);
  if (!oldEmail) {
    const linked = await db.collection("dashboard").updateOne({
      _id: "shared",
      members: { $elemMatch: { id: member.id, $or: [{ email: { $exists: false } }, { email: null }, { email: "" }] } }
    }, { $set: { "members.$.email": normalizedEmail, updatedAt: new Date() } });
    if (!linked.matchedCount) {
      const refreshed = await findDashboardMemberById(member.id);
      if (normalizeMemberEmail(refreshed?.email) !== normalizedEmail) throw identityConflict(member.id, "stored-email-mismatch");
    }
  }
  const now = new Date();
  const verifiedIdentity = { email: normalizedEmail, firebaseUid, lastVerifiedAt: now, linkedAt: existingLink?.linkedAt || now, sessionVersion: Number(existingLink?.sessionVersion) || 0 };
  if (typeof photoUrl === "string" && photoUrl) verifiedIdentity.photoUrl = photoUrl;
  try {
    await db.collection("memberAuthLinks").updateOne({ _id: member.id }, { $set: verifiedIdentity, $unset: { deactivatedAt: "" } }, { upsert: true });
  } catch (error) {
    if (error?.code === 11000) throw identityConflict(member.id, "duplicate-auth-link");
    throw error;
  }
  return { id: member.id, name: member.name, sessionVersion: verifiedIdentity.sessionVersion, created: false };
}

async function memberEmailIsAuthorized(email) {
  return Boolean(approvedMemberForEmail(email));
}

async function findActiveMemberById(memberId, firebaseUid, sessionVersion = 0) {
  const [member, link] = await Promise.all([
    findDashboardMemberById(memberId),
    db.collection("memberAuthLinks").findOne({ _id: memberId }, { projection: { firebaseUid: 1, deactivatedAt: 1, sessionVersion: 1 } })
  ]);
  if (member && link?.firebaseUid === firebaseUid && !link.deactivatedAt && (Number(link.sessionVersion) || 0) === (Number(sessionVersion) || 0)) {
    return { id: member.id, name: member.name, email: member.email || link.email || null, role: member.role, photoUrl: link.photoUrl || null, leetCodeUsername: profileForMember(member)?.username || null, legacy: true, groupMember: true };
  }
  const profile = await db.collection("memberProfiles").findOne({ _id: memberId, firebaseUid, deactivatedAt: { $exists: false } });
  if (!profile || (Number(profile.sessionVersion) || 0) !== (Number(sessionVersion) || 0)) return null;
  return { id: profile._id, name: profile.displayName, email: profile.email || null, role: "Member", photoUrl: profile.photoUrl || null, leetCodeUsername: profile.leetCodeUsername || null, legacy: false, groupMember: false };
}

async function findActiveAdminMemberById(memberId, adminEmail) {
  const member = await findDashboardMemberById(memberId);
  if (!member || normalizeMemberEmail(member.email) !== normalizeMemberEmail(adminEmail)) return null;
  return { id: member.id, name: member.name, email: member.email || null, role: member.role, photoUrl: null, leetCodeUsername: profileForMember(member)?.username || null, legacy: true, groupMember: true };
}

const memberOnly = createMemberOnly({ findActiveMemberById, findActiveAdminMemberById });
const mongoRateLimit = createMongoRateLimit({ getCollection: () => db.collection("rateLimits"), secret: process.env.SESSION_SECRET, windowMs: RATE_WINDOW_MS });
const memberLoginLimit = mongoRateLimit("member-login", 8);
const resolvePersonalProfile = createPersonalProfileResolver({ collection: { updateOne: (...args) => db.collection("memberProfiles").updateOne(...args), findOne: (...args) => db.collection("memberProfiles").findOne(...args) } });

app.disable("x-powered-by");
app.set("trust proxy", production ? 1 : false);
app.use(helmet({ crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }, contentSecurityPolicy: { directives: { "default-src": ["'self'"], "script-src": ["'self'", "https://www.gstatic.com", "https://apis.google.com"], "style-src": ["'self'", "'unsafe-inline'"], "img-src": ["'self'", "data:", "blob:"], "connect-src": ["'self'", "blob:", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com", "https://www.googleapis.com", "https://*.firebaseapp.com", "https://*.web.app"], "frame-src": ["https://accounts.google.com", "https://*.firebaseapp.com", "https://*.web.app"], "object-src": ["'none'"], "frame-ancestors": ["'none'"] } } }));
app.use(express.json({ limit: "1mb", strict: true }));
app.use("/api", (req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
// The public dashboard shell must not depend on either database readiness or
// session-store availability. It loads its protected data through /api.
const dashboardIndex = path.join(__dirname, "index.html");
function sendDashboardShell(_req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(dashboardIndex);
}
app.get(["/", "/index.html"], sendDashboardShell);
app.get("/profile/:memberId", (req, res) => {
  if (!/^[\w-]{1,100}$/.test(req.params.memberId)) return res.status(404).send("Profile not found.");
  return sendDashboardShell(req, res);
});
app.get("/style.css", (req, res) => res.sendFile(path.join(__dirname, "style.css")));
app.get("/activity-date.js", (req, res) => res.sendFile(path.join(__dirname, "activity-date.js")));
app.get("/firebase-client.js", (req, res) => res.sendFile(path.join(__dirname, "firebase-client.js")));
app.get("/script.js", (req, res) => res.sendFile(path.join(__dirname, "script.js")));
app.use(session(createAdminSessionOptions({
  secret: createSessionSecret(),
  store: MongoStore.create({ client: mongo, collectionName: "sessions", ttl: SESSION_TTL_SECONDS, autoRemove: "disabled" }),
  production
})));
const loginLimit = mongoRateLimit("admin-login", 8);
// SameSite cookies help prevent CSRF; reject cross-origin state-changing requests too.
// Static dashboard documents are intentionally available during a dependency
// outage; their data requests remain readiness-gated below.
app.use("/api", requireRuntime);
app.use("/api", sameOriginMutationOnly);

app.get("/api/session", async (req, res) => {
  if (isAdminSession(req)) {
    const member = await findActiveAdminMemberById(req.session.memberId, req.session.adminEmail);
    return res.json({ authenticated: true, role: "admin", member, pages: PAGES.map(page => ({ page, public: false })) });
  }
  if (req.session?.role === "member") {
    const member = await findActiveMemberById(req.session.memberId, req.session.firebaseUid, req.session.memberSessionVersion);
    if (member) return res.json({ authenticated: true, role: "member", member });
    req.session.destroy(() => {});
  }
  res.json({ authenticated: false, role: null, pages: PAGES.map(page => ({ page, public: false })) });
});

const adminLogin = createAdminLoginHandler({
  findAdmin: email => db.collection("admins").findOne({ _id: "primary", email }),
  comparePassword: (password, hash) => bcrypt.compare(password, hash),
  dummyPasswordHash: () => "$2a$12$C6UzMDM.H6dfI/f/IKcEe.7le6Q5D3e6WbJ5nG3DqR3u8YrlAnHpe",
  resolveMember: async email => findDashboardMemberByEmail(email)
});
app.post("/api/admin/login", loginLimit, adminLogin);

const memberLogin = createMemberFirebaseLoginHandler({
  verifyIdToken: createFirebaseTokenVerifier(),
  isAuthorizedEmail: memberEmailIsAuthorized,
  canRegister: () => process.env.MEMBER_SELF_REGISTRATION !== "false",
  logStage: (stage, outcome) => console.info("[member-auth]", { stage, outcome }),
  resolveMember: async ({ firebaseUid, email, displayName, photoUrl, groupAuthorized }) => {
    if (groupAuthorized) {
      const approvedMember = await findAndLinkApprovedGroupMember(email, firebaseUid, photoUrl);
      if (approvedMember) return approvedMember;
    }
    const link = await db.collection("memberAuthLinks").findOne({ firebaseUid, deactivatedAt: { $exists: false } });
    if (link) {
      const member = await findDashboardMemberById(link._id);
      if (!member) return null;
      const verifiedIdentity = { email, lastVerifiedAt: new Date() };
      if (typeof photoUrl === "string" && photoUrl) verifiedIdentity.photoUrl = photoUrl;
      await db.collection("memberAuthLinks").updateOne({ _id: link._id, firebaseUid }, { $set: verifiedIdentity });
      return { id: member.id, name: member.name, sessionVersion: link.sessionVersion, created: false };
    }
    const legacyMember = groupAuthorized ? await findDashboardMemberByEmail(email) : null;
    if (legacyMember) {
      const existingLink = await db.collection("memberAuthLinks").findOne({ _id: legacyMember.id });
      if (existingLink?.firebaseUid && existingLink.firebaseUid !== firebaseUid) return null;
      const now = new Date();
      const verifiedIdentity = { firebaseUid, email, lastVerifiedAt: now, linkedAt: existingLink?.linkedAt || now, sessionVersion: Number(existingLink?.sessionVersion) || 0 };
      if (typeof photoUrl === "string" && photoUrl) verifiedIdentity.photoUrl = photoUrl;
      await db.collection("memberAuthLinks").updateOne({ _id: legacyMember.id }, { $set: verifiedIdentity, $unset: { deactivatedAt: "" } }, { upsert: true });
      return { id: legacyMember.id, name: legacyMember.name, sessionVersion: verifiedIdentity.sessionVersion, created: false };
    }
    const id = `member-${crypto.createHash("sha256").update(firebaseUid).digest("hex").slice(0, 32)}`;
    const { profile, created } = await resolvePersonalProfile({ id, firebaseUid, email, displayName, photoUrl });
    return profile ? { id: profile._id, name: profile.displayName, sessionVersion: profile.sessionVersion, created } : null;
  }
});
app.post("/api/member/login", memberLoginLimit, memberLogin);

app.get("/api/profile/:memberId", async (req, res, next) => {
  if (isAdminSession(req)) return next();
  return memberOnly(req, res, next);
}, async (req, res) => {
  const memberId = req.params.memberId;
  if (!/^[\w-]{1,100}$/.test(memberId)) return res.status(400).json({ error: "Profile not found." });
  const isOwner = !isAdminSession(req) && req.member?.id === memberId;
  const canViewGroupProfiles = !isAdminSession(req) && Boolean(req.member?.groupMember);
  if (!isAdminSession(req) && !isOwner && !canViewGroupProfiles) return res.status(403).json({ error: "You can only view your own profile or a group member's public profile." });

  try {
    let member = await findDashboardMemberById(memberId);
    let personal = null;
    if (!member && isOwner) personal = await db.collection("memberProfiles").findOne({ _id: memberId, firebaseUid: req.session.firebaseUid, deactivatedAt: { $exists: false } });
    if (!isAdminSession(req) && !isOwner && !member) return res.status(403).json({ error: "You can only view group member profiles." });
    if (!member && !personal) return res.status(404).json({ error: "Profile not found." });
    const username = member ? profileForMember(member)?.username || null : personal?.leetCodeUsername || null;
    const profileRecord = username ? await db.collection("leetcodeProfiles").findOne({ _id: memberId, username }, { projection: { stats: 1, status: 1, lastFetchedAt: 1 } }) : null;
    const rawStats = profileRecord?.status === "Success" ? profileRecord.stats : null;
    const stats = publicSolvedStats(rawStats);
    let cvDoc = null;
    try {
      cvDoc = await ensureCharacterVerseProfile(db.collection("characterVerseProfiles"), memberId);
    } catch {
      cvDoc = null;
    }
    res.json({
      id: memberId,
      name: member?.name || personal?.displayName || "Member",
      email: isAdminSession(req) || isOwner ? member?.email || personal?.email || null : null,
      leetCodeUsername: username,
      profileUrl: username ? `https://leetcode.com/u/${encodeURIComponent(username)}/` : null,
      stats,
      statsSource: stats ? "LeetCode public profile" : null,
      statsUpdatedAt: stats ? profileRecord.lastFetchedAt || null : null,
      statsUnavailable: Boolean(username && !stats),
      characterVerse: cvDoc?.appearance ? { appearance: cvDoc.appearance } : null
    });
  } catch {
    res.status(503).json({ error: "Profile data is temporarily unavailable." });
  }
});

app.get("/api/firebase-config", (req, res) => {
  const config = requiredFirebaseClientConfig();
  if (!config) return res.status(503).json({ error: "Google sign-in is not configured. Set FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID, and FIREBASE_APP_ID." });
  res.json(config);
});

app.put("/api/admin/members/:memberId/firebase-link", adminOnly, async (req, res) => {
  const memberId = req.params.memberId;
  const firebaseUid = req.body?.firebaseUid;
  if (!/^[\w-]{1,100}$/.test(memberId) || !validFirebaseUid(firebaseUid) || req.body?.identityVerified !== true) {
    return res.status(400).json({ error: "Confirm the member's identity and provide a valid Firebase UID." });
  }
  if (!await findDashboardMemberById(memberId)) return res.status(404).json({ error: "Member not found." });
  try {
    const existing = await db.collection("memberAuthLinks").findOne({ firebaseUid });
    if (existing && existing._id !== memberId) return res.status(409).json({ error: "This Google account is already linked to another member." });
    await db.collection("memberAuthLinks").updateOne({ _id: memberId }, {
      $set: { firebaseUid, linkedAt: new Date(), linkedBy: req.session.adminEmail },
      $unset: { deactivatedAt: "" },
      $inc: { sessionVersion: 1 }
    }, { upsert: true });
    audit(req, "member-firebase-linked", memberId);
    res.json({ ok: true });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: "This Google account is already linked to another member." });
    res.status(503).json({ error: "Member linking is temporarily unavailable." });
  }
});

const memberEmailLink = createMemberEmailLinkHandler({
  findDashboardMemberById,
  findDashboardMemberByEmail,
  findOtherAuthLinkByEmail: (email, memberId) => db.collection("memberAuthLinks").findOne({ email, _id: { $ne: memberId } }, { projection: { _id: 1 } }),
  updateDashboardMemberEmail: async (memberId, email) => {
    const result = await db.collection("dashboard").updateOne({ _id: "shared", "members.id": memberId }, { $set: { "members.$.email": email, updatedAt: new Date() } });
    return result.matchedCount > 0;
  },
  updateAuthLinkEmail: (memberId, email) => db.collection("memberAuthLinks").updateOne({ _id: memberId }, { $set: { email } }),
  audit
});
app.put("/api/admin/members/:memberId/email-link", adminOnly, primaryAdminOnly, memberEmailLink);

app.post("/api/logout", createLogoutHandler({ secure: production }));

// The complete tracker is reserved for admins; viewer routes below return page projections.
app.get("/api/data", adminOnly, async (req, res) => {
  const document = await db.collection("dashboard").findOne({ _id: "shared" });
  if (!document) return res.status(404).json({ error: "Shared dashboard data has not been initialized. An admin must import the existing backup." });
  const profiles = await db.collection("leetcodeProfiles").find({}).toArray();
  const cacheById = new Map(profiles.map(profile => [profile.memberId, profile]));
  const links = await db.collection("memberAuthLinks").find({ _id: { $in: document.members.map(member => member.id) } }, { projection: { deactivatedAt: 1 } }).toArray();
  const linkById = new Map(links.map(link => [link._id, link]));
  const memberFirebaseStatus = Object.fromEntries(document.members.map(member => [member.id, Boolean(linkById.get(member.id) && !linkById.get(member.id).deactivatedAt)]));
  const members = document.members.map(({ id, name, role, email }) => ({ id, name, role, ...(email ? { email } : {}) }));
  res.json({ members, weeks: document.weeks, currentWeek: document.currentWeek, memberFirebaseStatus, leetcode: Object.fromEntries(document.members.map(member => {
    const profile = profileForMember(member);
    return profile ? [member.id, publicRecord(cacheById.get(member.id), profile, member.id)] : null;
  }).filter(Boolean)) });
});

app.get("/api/member/shared-data", memberOnly, async (req, res) => {
  if (!req.member.groupMember) return res.status(403).json({ error: "Group dashboard data is unavailable for this account." });
  const document = await db.collection("dashboard").findOne({ _id: "shared" });
  if (!document) return res.status(404).json({ error: "Shared dashboard data has not been initialized." });
  const profiles = await db.collection("leetcodeProfiles").find({}).toArray();
  const cacheById = new Map(profiles.map(profile => [profile.memberId, profile]));
  res.json({
    members: document.members.map(({ id, name, role }) => ({ id, name, role })),
    weeks: document.weeks,
    currentWeek: document.currentWeek,
    leetcode: Object.fromEntries(document.members.map(member => {
      const profile = profileForMember(member);
      return profile ? [member.id, publicRecord(cacheById.get(member.id), profile, member.id)] : null;
    }).filter(Boolean))
  });
});

app.get("/api/page-data/:page", dashboardViewer, async (req, res) => {
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
    const linkDocs = await db.collection("memberAuthLinks").find({ _id: { $in: shared.members.map(member => member.id) } }, { projection: { deactivatedAt: 1 } }).toArray();
    const linkById = new Map(linkDocs.map(link => [link._id, link]));
    const pageMembers = shared.members.map(({ id, name, role }) => ({ id, name, role, ...(isAdminSession(req) ? { firebaseLinked: Boolean(linkById.get(id) && !linkById.get(id).deactivatedAt) } : {}) }));
    return res.json({ page, members: pageMembers, leetcode: Object.fromEntries(shared.members.map(member => {
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
  const dashboard = db.collection("dashboard");
  const previous = await dashboard.findOne({ _id: "shared" });
  const existingMembers = new Map((previous?.members || []).map(member => [member.id, member]));
  const incomingMembers = req.body.members.map(member => existingMembers.get(member.id)?.email ? { ...member, email: existingMembers.get(member.id).email } : member);
  const removedIds = [...existingMembers.keys()].filter(id => !incomingMembers.some(member => member.id === id));
  await dashboard.updateOne({ _id: "shared" }, { $set: { members: incomingMembers, weeks: req.body.weeks, currentWeek: req.body.currentWeek, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  if (removedIds.length) await db.collection("memberAuthLinks").updateMany({ _id: { $in: removedIds } }, { $set: { deactivatedAt: new Date() }, $inc: { sessionVersion: 1 } });
  audit(req, "save-dashboard", "shared");
  res.json({ ok: true });
});

app.get("/api/member/progress", memberOnly, async (req, res) => {
  const weekNumber = Number(req.query.week);
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > MAX_WEEKS) return res.status(400).json({ error: "Choose a valid week." });
  const dashboard = await db.collection("dashboard").findOne({ _id: "shared" }, { projection: { weeks: 1 } });
  const week = dashboard?.weeks?.[String(weekNumber)] || {};
  const daily = Array.from({ length: 6 }, (_, slot) => STATUSES.has(week.daily?.[req.member.id]?.[slot]) ? week.daily[req.member.id][slot] : "blank");
  const concepts = Array.from({ length: 2 }, (_, slot) => STATUSES.has(week.concepts?.[req.member.id]?.[slot]) ? week.concepts[req.member.id][slot] : "blank");
  res.json({ member: { id: req.member.id, name: req.member.name, role: "Member" }, week: weekNumber, daily, concepts, scheduledSlots: scheduledSlots(weekNumber) });
});

app.get("/api/member/group", memberOnly, async (req, res) => {
  if (!req.member.groupMember) return res.status(403).json({ error: "Group member profiles are unavailable for this account." });
  const dashboard = await db.collection("dashboard").findOne({ _id: "shared" }, { projection: { members: 1 } });
  const members = (dashboard?.members || []).map(member => ({
    id: member.id,
    name: member.name,
    leetCodeUsername: profileForMember(member)?.username || null
  }));
  res.json({ members });
});

app.get("/api/member/dashboard", memberOnly, createMemberDashboardHandler({
  loadMemberDashboard: async (memberId, member) => {
    const username = member.leetCodeUsername || profileForMember(member)?.username || null;
    const profileRecord = username ? await db.collection("leetcodeProfiles").findOne({ _id: memberId, username }, { projection: { stats: 1, status: 1 } }) : null;
    return {
      leetCodeUsername: username,
      questionsSolved: profileRecord?.status === "Success" ? profileRecord.stats?.total : null,
      easySolved: profileRecord?.status === "Success" ? profileRecord.stats?.easy : null,
      mediumSolved: profileRecord?.status === "Success" ? profileRecord.stats?.medium : null,
      hardSolved: profileRecord?.status === "Success" ? profileRecord.stats?.hard : null
    };
  }
}));

// CharacterVerse always resolves the owner from the authenticated session.
// No route or request body may select another member's profile.
app.get("/api/characterverse/me", memberOnly, async (req, res) => {
  try {
    const profile = await ensureCharacterVerseProfile(db.collection("characterVerseProfiles"), req.member.id);
    res.json(publicCharacterVerseProfile(profile));
  } catch {
    res.status(503).json({ error: "CharacterVerse profile is temporarily unavailable." });
  }
});

app.get("/api/characterverse/me/rewards", memberOnly, async (req, res) => {
  try {
    const [profile, entries] = await Promise.all([
      ensureCharacterVerseProfile(db.collection("characterVerseProfiles"), req.member.id),
      db.collection("characterVerseRewardLedger").find({ memberId: req.member.id, status: "applied" }).sort({ appliedAt: -1, createdAt: -1 }).limit(100).toArray()
    ]);
    const history = entries.map(publicLedgerEntry);
    const totalEarned = entries.filter(entry => entry.transactionType === "reward").reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
    const totalSpent = entries.filter(entry => entry.transactionType === "purchase").reduce((sum, entry) => sum + Math.abs(Number(entry.amount) || 0), 0);
    res.json({ balance: profile.wallet?.coins ?? 0, totalEarned, totalSpent, history });
  } catch {
    res.status(503).json({ error: "CharacterVerse reward history is temporarily unavailable." });
  }
});

app.put("/api/characterverse/me/appearance", memberOnly, async (req, res) => {
  try {
    const result = await saveCharacterVerseAppearance(db.collection("characterVerseProfiles"), req.member.id, req.body);
    if (result.error) return res.status(400).json({ error: "Invalid CharacterVerse appearance update." });
    res.json(publicCharacterVerseProfile(result.profile));
  } catch {
    res.status(503).json({ error: "CharacterVerse appearance could not be saved." });
  }
});

app.post("/api/characterverse/me/purchases/:kind/:itemId", memberOnly, async (req, res) => {
  const { kind, itemId } = req.params;
  if (!["vehicle", "upgrade", "character", "outfit"].includes(kind) || !/^[a-z0-9-]{1,80}$/.test(itemId)) return res.status(400).json({ error: "Unknown CharacterVerse item." });
  try {
    const result = await purchaseCharacterVerseItem(db.collection("characterVerseProfiles"), req.member.id, kind, itemId, new Date(), db.collection("characterVerseRewardLedger"));
    if (result.error === "UNKNOWN_ITEM") return res.status(404).json({ error: "CharacterVerse item was not found." });
    if (result.error === "ALREADY_OWNED") return res.status(409).json({ error: "You already own this item." });
    if (result.error === "REQUIRES_VEHICLE") return res.status(409).json({ error: "Unlock the matching vehicle before its upgrade." });
    if (result.error === "INSUFFICIENT_COINS") return res.status(409).json({ error: "You do not have enough coins." });
    res.json(publicCharacterVerseProfile(result.profile));
  } catch {
    res.status(503).json({ error: "CharacterVerse purchase could not be completed." });
  }
});

app.put("/api/member/profile", memberOnly, (_req, res) => res.status(403).json({ error: "Member Mode is read-only." }));
app.post("/api/member/progress", memberOnly, (_req, res) => res.status(403).json({ error: "Member Mode is read-only." }));
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
    if (current[slot] === "done") {
      await awardTrustedDaily({ db, memberId, week, slot, scheduledSlots, ensureProfile: ensureCharacterVerseProfile });
      return false;
    }
    const updated = current.slice();
    updated[slot] = "done";
    const filter = saved === undefined ? { [field]: { $exists: false } } : { [field]: saved };
    const result = await db.collection("dashboard").updateOne({ _id: "shared", ...filter }, { $set: { [field]: updated, updatedAt: new Date() } });
    if (result.modifiedCount === 1) {
      await awardTrustedDaily({ db, memberId, week, slot, scheduledSlots, ensureProfile: ensureCharacterVerseProfile });
      return true;
    }
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
      audit({ session: { adminEmail: "system" } }, "leetcode-activity-refresh", date);
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
    try { decision = manualFinalizationDecision(previousFinalization, memberId, status, req.session.adminEmail, decidedAt); }
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
      decisions: [...(previousFinalization.decisions || []), { memberId, status, actor: req.session.adminEmail, at: decidedAt }]
    };
    await db.collection("leetcodeActivityJobs").updateOne({ _id: date }, { $set: { date, finalization, updatedAt: decidedAt } });
    audit(req, "leetcode-activity-manual-finalization", `${date}:${memberId}:${status}`);
    console.info("[leetcode-activity] manual decision recorded", { activityDate: date, memberId, status, actor: req.session.adminEmail });
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
  const importedMembers = req.body.members.map(({ id, name, role }) => ({ id, name, role }));
  const result = await db.collection("dashboard").updateOne({ _id: "shared" }, { $setOnInsert: { members: importedMembers, weeks: req.body.weeks, currentWeek: req.body.currentWeek, createdAt: new Date() } }, { upsert: true });
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

// CharacterVerse is a separately built client application. Its assets remain
// public, while its entry document and every data operation require a member
// session. The API remains the authorization boundary.
// Render deploys tracked source files, not ignored Vite output directories.
// `vercel-build` synchronizes those artifacts into public/ for every host.
const characterVersePublicDir = path.join(__dirname, "public", "characterverse");
const characterVerseEmbedPublicDir = path.join(__dirname, "public", "characterverse-embed");
app.use("/characterverse", express.static(characterVersePublicDir, { index: false, maxAge: production ? "1h" : 0 }));
app.get(["/characterverse", "/characterverse/"], requireRuntime, memberOnly, (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(characterVersePublicDir, "index.html"));
});
// The member dashboard mounts this bundle directly in a Shadow DOM. Keeping
// the assets separate preserves CharacterVerse's standalone development build
// without exposing it as a second member-facing route.
app.use("/characterverse-embed", express.static(characterVerseEmbedPublicDir, { index: false, maxAge: production ? "1h" : 0 }));

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
