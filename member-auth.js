"use strict";

const { normalizeMemberEmail } = require("./member-allowlist");

function validFirebaseUid(value) {
  return typeof value === "string" && value.length >= 1 && value.length <= 128 && !/[\u0000-\u001f\u007f]/.test(value);
}

function validateOwnProgressUpdate(body, { maxWeeks, scheduledSlots }) {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).some(key => !["week", "kind", "slot", "status"].includes(key)) ||
      !Number.isInteger(body.week) || body.week < 1 || body.week > maxWeeks ||
      !["daily", "concepts"].includes(body.kind) || !Number.isInteger(body.slot) ||
      !["done", "blank"].includes(body.status)) return null;
  const maxSlots = body.kind === "daily" ? 6 : 2;
  if (body.slot < 0 || body.slot >= maxSlots ||
      (body.kind === "daily" && !scheduledSlots(body.week).includes(body.slot)) ||
      (body.kind === "concepts" && !scheduledSlots(body.week).length)) return null;
  return { week: body.week, kind: body.kind, slot: body.slot, status: body.status, maxSlots };
}

function createMemberFirebaseLoginHandler({ verifyIdToken, resolveMember, isAuthorizedEmail = () => false, canRegister = () => true, logStage = () => {} }) {
  return async (req, res) => {
    const idToken = req.body?.idToken;
    if (typeof idToken !== "string" || !idToken || idToken.length > 10000) {
      return res.status(400).json({ error: "A Firebase ID token is required." });
    }
    let stage = "id-token-verification";
    try {
      const claims = await verifyIdToken(idToken);
      logStage(stage, "passed");
      stage = "google-provider-check";
      const firebaseUid = claims?.uid || claims?.sub;
      if (!validFirebaseUid(firebaseUid) || claims?.firebase?.sign_in_provider !== "google.com") {
        logStage(stage, "rejected");
        return res.status(401).json({ error: "Sign in with Google to continue." });
      }
      logStage(stage, "passed");
      stage = "verified-email-check";
      const email = normalizeMemberEmail(claims?.email);
      if (claims?.email_verified !== true || !email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        logStage(stage, "rejected");
        return res.status(403).json({ error: "A verified Google email is required." });
      }
      logStage(stage, "passed");
      stage = "group-authorization";
      const groupAuthorized = await isAuthorizedEmail(email);
      if (!groupAuthorized && !canRegister(email)) {
        logStage(stage, "rejected");
        return res.status(403).json({ error: "New account registration is not available." });
      }
      logStage(stage, groupAuthorized ? "group-member" : "onboarding");
      stage = "account-resolution";
      const member = await resolveMember({ firebaseUid, email, displayName: claims?.name, photoUrl: claims?.picture, groupAuthorized });
      if (!member || typeof member.id !== "string" || !/^[\w-]{1,100}$/.test(member.id)) {
        logStage(stage, "failed");
        return res.status(503).json({ error: "Your member profile could not be created." });
      }
      logStage(stage, member.created ? "registered" : "resolved");
      stage = "session-regeneration";
      req.session.regenerate(error => {
        if (error) {
          logStage(stage, "failed");
          return res.status(500).json({ error: "Could not start a session." });
        }
        logStage(stage, "passed");
        req.session.role = "member";
        req.session.memberId = member.id;
        req.session.firebaseUid = firebaseUid;
        req.session.memberSessionVersion = Number(member.sessionVersion) || 0;
        stage = "session-save";
        req.session.save(saveError => {
          if (saveError) {
            logStage(stage, "failed");
            return res.status(500).json({ error: "Could not start a session." });
          }
          logStage(stage, "passed");
          return res.json({ authenticated: true, role: "member", member });
        });
      });
    } catch (error) {
      logStage(stage, "failed");
      if (error?.status === 409) return res.status(409).json({ error: "Identity conflict: this verified account is already linked elsewhere. An administrator must review the mapping." });
      if (error?.status === 404) return res.status(404).json({ error: "Your verified Google account is approved, but its existing group member record is missing. Contact an administrator." });
      if (error?.status === 503) return res.status(503).json({ error: "Identity mapping is temporarily unavailable. Try again later." });
      if (["group-authorization", "account-resolution"].includes(stage)) return res.status(503).json({ error: "Your verified identity could not be linked to an account. Try again later or contact an administrator." });
      return res.status(401).json({ error: "Google sign-in could not be verified." });
    }
  };
}

function createMemberOnly({ findActiveMemberById, findActiveAdminMemberById = async () => null }) {
  return async (req, res, next) => {
    const isMemberSession = req.session?.role === "member" && typeof req.session.memberId === "string" && validFirebaseUid(req.session.firebaseUid);
    const isAdminMemberSession = req.session?.role === "admin" && typeof req.session.memberId === "string" && typeof req.session.adminEmail === "string";
    if (!isMemberSession && !isAdminMemberSession) {
      return res.status(401).json({ error: "Member authentication required." });
    }
    try {
      const member = isMemberSession
        ? await findActiveMemberById(req.session.memberId, req.session.firebaseUid, req.session.memberSessionVersion)
        : await findActiveAdminMemberById(req.session.memberId, req.session.adminEmail);
      if (!member) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "Member authentication required." });
      }
      req.member = member;
      next();
    } catch {
      return res.status(503).json({ error: "Member authorization is temporarily unavailable." });
    }
  };
}

module.exports = { validFirebaseUid, validateOwnProgressUpdate, createMemberFirebaseLoginHandler, createMemberOnly };
