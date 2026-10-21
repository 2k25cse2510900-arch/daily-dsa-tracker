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
        db.collection("audit").createIndex({ at: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })
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

function adminOnly(req, res, next) {
  if (!isAdminSession(req)) return res.status(401).json({ error: "Authentication required." });
  next();
}

function isAdminSession(req) {
  return req.session?.role === "admin" && req.session?.username === "Krish" && req.session?.credentialVersion === adminCredentialVersion;
}

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
  res.json({ members: document.members, weeks: document.weeks, currentWeek: document.currentWeek });
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

  if (page === "daily") return res.json({ page, week: weekNumber, members, statuses: Object.fromEntries(members.map(member => [member.id, daily(member.id)])) });
  if (page === "concepts") return res.json({ page, week: weekNumber, members, statuses: Object.fromEntries(members.map(member => [member.id, concepts(member.id)])) });
  if (page === "members") return res.json({ page, members });
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

app.get("/", (req, res) => { res.setHeader("Cache-Control", "no-store"); res.sendFile(path.join(__dirname, "index.html")); });
app.get("/index.html", (req, res) => { res.setHeader("Cache-Control", "no-store"); res.sendFile(path.join(__dirname, "index.html")); });
app.get("/style.css", (req, res) => res.sendFile(path.join(__dirname, "style.css")));
app.get("/script.js", (req, res) => res.sendFile(path.join(__dirname, "script.js")));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  res.status(error.status || 500).json({ error: error.status === 413 ? "Request too large." : "Request could not be completed." });
});

async function startLocalServer() {
  try {
    await initializeRuntime();
    app.listen(PORT, () => console.log(`DSA dashboard listening on port ${PORT}`));
  } catch {
    console.error("Could not start the dashboard. Check required environment variables and MongoDB network access.");
    await mongo.close().catch(() => {});
    process.exitCode = 1;
  }
}

if (require.main === module) startLocalServer();

module.exports = app;
