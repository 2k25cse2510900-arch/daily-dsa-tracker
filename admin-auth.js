"use strict";

const ADMIN_ID = "primary";

function normalizeAdminEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function validEmail(value) {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateAdminCredentials(emailValue, passwordValue) {
  const email = normalizeAdminEmail(emailValue);
  const password = typeof passwordValue === "string" ? passwordValue : "";
  if (!validEmail(email) || !password || Buffer.byteLength(password, "utf8") > 72) return null;
  return { email, password };
}

function createAdminOnly(isAdminSession) {
  return (req, res, next) => {
    if (isAdminSession(req)) return next();
    const isAuthenticatedMember = req.session?.role === "member" &&
      typeof req.session.memberId === "string" &&
      typeof req.session.firebaseUid === "string";
    if (isAuthenticatedMember) return res.status(403).json({ error: "Administrator permission required." });
    return res.status(401).json({ error: "Authentication required." });
  };
}

function createAdminLoginHandler({ findAdmin, comparePassword, dummyPasswordHash, resolveMember = async () => null }) {
  return async (req, res) => {
    const credentials = validateAdminCredentials(req.body?.email, req.body?.password);
    if (!credentials) return res.status(400).json({ error: "Enter a valid email and password." });
    try {
      const admin = await findAdmin(credentials.email);
      const fallbackHash = typeof dummyPasswordHash === "function" ? dummyPasswordHash() : dummyPasswordHash;
      const matches = await comparePassword(credentials.password, admin?.passwordHash || fallbackHash);
      if (!admin || !matches) return res.status(401).json({ error: "Invalid email or password." });
      const member = await resolveMember(admin.email);
      req.session.regenerate(error => {
        if (error) return res.status(500).json({ error: "Could not start a session." });
        req.session.role = "admin";
        req.session.adminEmail = admin.email;
        if (member?.id) req.session.memberId = member.id;
        req.session.save(saveError => saveError
          ? res.status(500).json({ error: "Could not start a session." })
          : res.json({ authenticated: true, role: "admin", member: member || null }));
      });
    } catch {
      res.status(503).json({ error: "Sign-in is temporarily unavailable." });
    }
  };
}

async function provisionInitialAdmin({ collection, email: emailValue, password, hashPassword }) {
  const credentials = validateAdminCredentials(emailValue, password);
  if (!credentials || Buffer.byteLength(credentials.password, "utf8") < 14) {
    throw new Error("ADMIN_EMAIL must be valid and ADMIN_PASSWORD must be 14-72 UTF-8 bytes.");
  }
  const passwordHash = await hashPassword(credentials.password, 12);
  await collection.insertOne({
    _id: ADMIN_ID,
    email: credentials.email,
    passwordHash,
    createdAt: new Date()
  });
}

function createLogoutHandler({ secure }) {
  return (req, res) => {
    if (!req.session) return res.clearCookie("dsa.sid", { httpOnly: true, secure, sameSite: "lax", path: "/" }).json({ ok: true });
    req.session.destroy(error => {
      res.clearCookie("dsa.sid", { httpOnly: true, secure, sameSite: "lax", path: "/" });
      if (error) return res.status(500).json({ error: "Could not end the session." });
      res.json({ ok: true });
    });
  };
}

module.exports = { ADMIN_ID, normalizeAdminEmail, validEmail, validateAdminCredentials, createAdminOnly, createAdminLoginHandler, provisionInitialAdmin, createLogoutHandler };
