"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const express = require("express");
const session = require("express-session");
const { createMemberFirebaseLoginHandler, createMemberOnly } = require("../member-auth");
const { createPersonalProfileResolver } = require("../member-profiles");
const { normalizeMemberEmail } = require("../member-allowlist");
const { createAdminSessionOptions } = require("../session-config");
const { createGroupService } = require("../groups");

function listen(app) {
  return new Promise(resolve => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function close(server) {
  server.closeAllConnections();
  return new Promise(resolve => server.close(resolve));
}

// In-memory collections mock simulating MongoDB
function createMemoryDb() {
  const collections = {
    memberProfiles: new Map(),
    memberAuthLinks: new Map(),
    dashboard: new Map(),
    groups: new Map(),
    groupMembers: new Map(),
    groupInvitations: new Map(),
    groupJoinRequests: new Map()
  };

  function collection(name) {
    const map = collections[name];
    return {
      async findOne(filter = {}) {
        for (const doc of map.values()) {
          let match = true;
          for (const [key, val] of Object.entries(filter)) {
            if (key === "$or" && Array.isArray(val)) {
              const anyMatch = val.some(sub => Object.entries(sub).every(([sk, sv]) => {
                if (sv && typeof sv === "object" && "$exists" in sv) return (sk in doc) === sv.$exists;
                return doc[sk] === sv;
              }));
              if (!anyMatch) { match = false; break; }
              continue;
            }
            if (key === "deactivatedAt" && val && typeof val === "object" && "$exists" in val) {
              if (("deactivatedAt" in doc) !== val.$exists) { match = false; break; }
              continue;
            }
            if (val && typeof val === "object" && "$ne" in val) {
              if (doc[key] === val.$ne) { match = false; break; }
              continue;
            }
            if (doc[key] !== val) { match = false; break; }
          }
          if (match) return structuredClone(doc);
        }
        return null;
      },
      async updateOne(filter, update, options = {}) {
        let existingKey = null;
        let existingDoc = null;
        for (const [k, doc] of map.entries()) {
          let match = true;
          for (const [fk, fv] of Object.entries(filter)) {
            if (fv && typeof fv === "object" && "$ne" in fv) {
              if (doc[fk] === fv.$ne) { match = false; break; }
              continue;
            }
            if (doc[fk] !== fv) { match = false; break; }
          }
          if (match) { existingKey = k; existingDoc = doc; break; }
        }

        if (existingDoc) {
          const next = structuredClone(existingDoc);
          if (update.$set) Object.assign(next, update.$set);
          if (update.$unset) {
            for (const uk of Object.keys(update.$unset)) delete next[uk];
          }
          if (update.$inc) {
            for (const [ik, iv] of Object.entries(update.$inc)) next[ik] = (Number(next[ik]) || 0) + iv;
          }
          map.set(existingKey, next);
          return { matchedCount: 1, modifiedCount: 1, upsertedId: null };
        } else if (options.upsert) {
          const insertId = filter._id || update.$setOnInsert?._id || `gen-${Date.now()}-${Math.random()}`;
          const newDoc = { _id: insertId, ...filter, ...update.$setOnInsert };
          if (update.$set) Object.assign(newDoc, update.$set);
          map.set(String(insertId), newDoc);
          return { matchedCount: 0, modifiedCount: 0, upsertedId: insertId };
        }
        return { matchedCount: 0, modifiedCount: 0, upsertedId: null };
      },
      async insertOne(doc) {
        const id = doc._id || `gen-${Date.now()}-${Math.random()}`;
        const newDoc = { _id: id, ...doc };
        map.set(String(id), newDoc);
        return { insertedId: id };
      },
      async find(filter = {}) {
        const results = [];
        for (const doc of map.values()) {
          let match = true;
          for (const [key, val] of Object.entries(filter)) {
            if (val && typeof val === "object" && "$ne" in val) {
              if (doc[key] === val.$ne) { match = false; break; }
              continue;
            }
            if (doc[key] !== val) { match = false; break; }
          }
          if (match) results.push(structuredClone(doc));
        }
        return {
          toArray: async () => results,
          sort: () => ({ toArray: async () => results })
        };
      }
    };
  }

  return { collection, collections };
}

function setupTestApp(db) {
  const app = express();
  app.use(express.json());
  app.use(session(createAdminSessionOptions({
    secret: "test-secret-at-least-thirty-two-chars-long",
    store: new session.MemoryStore()
  })));

  const resolvePersonalProfile = createPersonalProfileResolver({
    collection: db.collection("memberProfiles")
  });

  async function findActiveMemberById(memberId, firebaseUid, sessionVersion = 0) {
    const link = await db.collection("memberAuthLinks").findOne({ _id: memberId });
    if (link && link.firebaseUid === firebaseUid && !link.deactivatedAt && (Number(link.sessionVersion) || 0) === (Number(sessionVersion) || 0)) {
      return { id: memberId, name: link.name || "Legacy Member", email: link.email, role: "Member", legacy: true, groupMember: true };
    }
    const profile = await db.collection("memberProfiles").findOne({ _id: memberId, firebaseUid, deactivatedAt: { $exists: false } });
    if (!profile || (Number(profile.sessionVersion) || 0) !== (Number(sessionVersion) || 0)) return null;
    return { id: profile._id, name: profile.displayName, email: profile.email || null, role: "Member", legacy: false, groupMember: false };
  }

  const memberOnly = createMemberOnly({ findActiveMemberById });

  const memberLogin = createMemberFirebaseLoginHandler({
    verifyIdToken: async token => {
      if (token === "invalid-token") throw new Error("Firebase ID token verification failed.");
      try {
        const payload = JSON.parse(token);
        return payload;
      } catch {
        return { uid: token, email: `${token}@gmail.com`, email_verified: true, firebase: { sign_in_provider: "google.com" } };
      }
    },
    isAuthorizedEmail: email => email === "approved-legacy@gmail.com",
    canRegister: () => true,
    resolveMember: async ({ firebaseUid, email, displayName, photoUrl, groupAuthorized }) => {
      const normalizedEmail = normalizeMemberEmail(email);
      // Existing link in memberAuthLinks
      const link = await db.collection("memberAuthLinks").findOne({ firebaseUid, deactivatedAt: { $exists: false } });
      if (link) {
        if (link.email && normalizeMemberEmail(link.email) !== normalizedEmail) {
          const conflict = new Error("Firebase UID is already linked to another email.");
          conflict.status = 409;
          throw conflict;
        }
        return { id: link._id, name: link.name || "Legacy Member", sessionVersion: link.sessionVersion, created: false };
      }
      // Duplicate email in memberAuthLinks
      const otherAuthLink = await db.collection("memberAuthLinks").findOne({ email: normalizedEmail, firebaseUid: { $ne: firebaseUid } });
      if (otherAuthLink) {
        const conflict = new Error("This email is already associated with another member account.");
        conflict.status = 409;
        throw conflict;
      }
      // Duplicate email in memberProfiles
      const otherProfile = await db.collection("memberProfiles").findOne({ email: normalizedEmail, firebaseUid: { $ne: firebaseUid }, deactivatedAt: { $exists: false } });
      if (otherProfile) {
        const conflict = new Error("This email is already associated with another personal account.");
        conflict.status = 409;
        throw conflict;
      }
      // Duplicate UID in memberProfiles with mismatching email
      const existingProfileByUid = await db.collection("memberProfiles").findOne({ firebaseUid, deactivatedAt: { $exists: false } });
      if (existingProfileByUid && existingProfileByUid.email && normalizeMemberEmail(existingProfileByUid.email) !== normalizedEmail) {
        const conflict = new Error("Firebase UID is already associated with a different email.");
        conflict.status = 409;
        throw conflict;
      }

      const id = `member-${crypto.createHash("sha256").update(firebaseUid).digest("hex").slice(0, 32)}`;
      const { profile, created } = await resolvePersonalProfile({ id, firebaseUid, email: normalizedEmail, displayName, photoUrl });
      return profile ? { id: profile._id, name: profile.displayName, sessionVersion: profile.sessionVersion, created } : null;
    }
  });

  app.post("/api/member/login", memberLogin);

  app.get("/api/session", async (req, res) => {
    if (req.session?.role === "member") {
      const member = await findActiveMemberById(req.session.memberId, req.session.firebaseUid, req.session.memberSessionVersion);
      if (member) return res.json({ authenticated: true, role: "member", member });
      req.session.destroy(() => {});
    }
    res.json({ authenticated: false, role: null });
  });

  // Group Management service
  const groupStore = {
    groups: db.collection("groups"),
    members: db.collection("groupMembers"),
    invitations: db.collection("groupInvitations"),
    requests: db.collection("groupJoinRequests"),
    async groupForId(groupId) { return db.collection("groups").findOne({ _id: groupId }); },
    async membership(groupId, userId) { return db.collection("groupMembers").findOne({ groupId, userId, status: "approved" }); },
    async membershipsForUser(userId) { return (await db.collection("groupMembers").find({ userId, status: "approved" })).toArray(); },
    async activeMembershipForUser(userId) {
      return db.collection("groupMembers").findOne({ userId, status: "approved" });
    },
    async pendingRequestForUser(userId) {
      return db.collection("groupJoinRequests").findOne({ userId, status: "pending" });
    }
  };
  const groupService = createGroupService({
    store: groupStore,
    invitationSecret: "secret-key-at-least-16-chars-long"
  });

  app.get("/api/groups", memberOnly, async (req, res) => {
    try {
      const groups = await groupService.listForUser(req.member.id);
      const pendingRequest = groups.length === 0 ? await groupService.pendingRequestForUser(req.member.id) : null;
      res.json({ groups, activeGroupId: req.session.activeGroupId || groups[0]?.id || null, pendingRequest });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  });

  app.post("/api/groups", memberOnly, async (req, res) => {
    try {
      const group = await groupService.createGroup({ owner: req.member, name: req.body?.name });
      res.status(201).json({ group });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  });

  return app;
}

test("1. Existing Google account login authenticates and loads member account", async () => {
  const db = createMemoryDb();
  // Pre-seed an existing member in memberAuthLinks
  db.collections.memberAuthLinks.set("existing-member-id", {
    _id: "existing-member-id",
    firebaseUid: "existing-google-uid",
    email: "existing@gmail.com",
    name: "Existing Player",
    sessionVersion: 1
  });

  const app = setupTestApp(db);
  const server = await listen(app);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const token = JSON.stringify({ uid: "existing-google-uid", email: "existing@gmail.com", email_verified: true, firebase: { sign_in_provider: "google.com" } });
    const res = await fetch(`${base}/api/member/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.authenticated, true);
    assert.equal(body.role, "member");
    assert.equal(body.member.id, "existing-member-id");
    assert.equal(body.member.created, false);
  } finally {
    await close(server);
  }
});

test("2. New Google account registration safely provisions a member profile and session", async () => {
  const db = createMemoryDb();
  const app = setupTestApp(db);
  const server = await listen(app);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const token = JSON.stringify({
      uid: "new-google-uid-123",
      email: "brandnew@gmail.com",
      email_verified: true,
      name: "New Student",
      firebase: { sign_in_provider: "google.com" }
    });
    const res = await fetch(`${base}/api/member/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.authenticated, true);
    assert.equal(body.role, "member");
    assert.equal(body.member.created, true);
    assert.match(body.member.id, /^member-/);

    // Verify authenticated session establishes properly
    const cookie = res.headers.get("set-cookie").split(";")[0];
    const sessionRes = await fetch(`${base}/api/session`, { headers: { cookie } });
    assert.equal(sessionRes.status, 200);
    const sessionBody = await sessionRes.json();
    assert.equal(sessionBody.authenticated, true);
    assert.equal(sessionBody.role, "member");
    assert.equal(sessionBody.member.id, body.member.id);
  } finally {
    await close(server);
  }
});

test("3. Returning newly registered account login recognizes existing account without duplicate", async () => {
  const db = createMemoryDb();
  const app = setupTestApp(db);
  const server = await listen(app);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const token = JSON.stringify({
      uid: "returning-uid-456",
      email: "returning@gmail.com",
      email_verified: true,
      name: "Returning User",
      firebase: { sign_in_provider: "google.com" }
    });
    // First login -> created: true
    const res1 = await fetch(`${base}/api/member/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token })
    });
    const body1 = await res1.json();
    assert.equal(body1.member.created, true);

    // Second login -> created: false, same member ID
    const res2 = await fetch(`${base}/api/member/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token })
    });
    const body2 = await res2.json();
    assert.equal(body2.member.created, false);
    assert.equal(body2.member.id, body1.member.id);
    assert.equal(db.collections.memberProfiles.size, 1);
  } finally {
    await close(server);
  }
});

test("4. Duplicate Google UID prevention rejects UID mismatch with different email", async () => {
  const db = createMemoryDb();
  // Register initial account
  db.collections.memberProfiles.set("member-first", {
    _id: "member-first",
    firebaseUid: "shared-uid-789",
    email: "original@gmail.com",
    displayName: "Original",
    sessionVersion: 0
  });

  const app = setupTestApp(db);
  const server = await listen(app);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    // Attempt login with same UID but conflicting email
    const token = JSON.stringify({
      uid: "shared-uid-789",
      email: "imposter@gmail.com",
      email_verified: true,
      firebase: { sign_in_provider: "google.com" }
    });
    const res = await fetch(`${base}/api/member/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token })
    });
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.match(body.error, /identity conflict/i);
  } finally {
    await close(server);
  }
});

test("5. Duplicate email prevention rejects new UID claiming an already-registered email", async () => {
  const db = createMemoryDb();
  // Register initial account
  db.collections.memberProfiles.set("member-original", {
    _id: "member-original",
    firebaseUid: "uid-original",
    email: "registered@gmail.com",
    displayName: "Registered",
    sessionVersion: 0
  });

  const app = setupTestApp(db);
  const server = await listen(app);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    // Attempt registration with same email but new UID
    const token = JSON.stringify({
      uid: "uid-different-intruder",
      email: "registered@gmail.com",
      email_verified: true,
      firebase: { sign_in_provider: "google.com" }
    });
    const res = await fetch(`${base}/api/member/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token })
    });
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.match(body.error, /identity conflict/i);
  } finally {
    await close(server);
  }
});

test("6. Invalid Firebase token rejection fails with 401", async () => {
  const db = createMemoryDb();
  const app = setupTestApp(db);
  const server = await listen(app);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const res = await fetch(`${base}/api/member/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: "invalid-token" })
    });
    assert.equal(res.status, 401);
  } finally {
    await close(server);
  }
});

test("7. New account receives member permissions, never admin permissions", async () => {
  const db = createMemoryDb();
  const app = setupTestApp(db);
  // Add an admin-only route to test
  app.get("/api/admin/secret", (req, res) => {
    if (req.session?.role === "admin") return res.json({ secret: true });
    res.status(403).json({ error: "Admin only." });
  });

  const server = await listen(app);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const token = JSON.stringify({
      uid: "uid-student-777",
      email: "student@gmail.com",
      email_verified: true,
      firebase: { sign_in_provider: "google.com" }
    });
    const res = await fetch(`${base}/api/member/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.role, "member");

    const cookie = res.headers.get("set-cookie").split(";")[0];
    const adminRes = await fetch(`${base}/api/admin/secret`, { headers: { cookie } });
    assert.equal(adminRes.status, 403);
  } finally {
    await close(server);
  }
});

test("8. New account reaches Group Management onboarding with empty group list and no pending request", async () => {
  const db = createMemoryDb();
  const app = setupTestApp(db);
  const server = await listen(app);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const token = JSON.stringify({
      uid: "uid-onboarding-888",
      email: "onboardme@gmail.com",
      email_verified: true,
      firebase: { sign_in_provider: "google.com" }
    });
    const loginRes = await fetch(`${base}/api/member/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token })
    });
    assert.equal(loginRes.status, 200);

    const cookie = loginRes.headers.get("set-cookie").split(";")[0];
    const groupRes = await fetch(`${base}/api/groups`, { headers: { cookie } });
    assert.equal(groupRes.status, 200);
    const groupData = await groupRes.json();
    // New user has no group yet
    assert.deepEqual(groupData.groups, []);
    assert.equal(groupData.activeGroupId, null);
    assert.equal(groupData.pendingRequest, null);
  } finally {
    await close(server);
  }
});

test("9. Existing group membership remains unchanged after re-login", async () => {
  const db = createMemoryDb();
  // Pre-seed an existing group and member
  const memberId = "member-active-999";
  const groupId = "group-alpha";
  db.collections.memberProfiles.set(memberId, {
    _id: memberId,
    firebaseUid: "uid-active-999",
    email: "alpha.member@gmail.com",
    displayName: "Alpha Leader",
    sessionVersion: 0
  });
  db.collections.groups.set(groupId, {
    _id: groupId,
    id: groupId,
    name: "Alpha Group",
    ownerId: memberId,
    active: true,
    memberCount: 2,
    maxMembers: 8,
    status: "active"
  });
  db.collections.groupMembers.set(`${groupId}_${memberId}`, {
    _id: `${groupId}_${memberId}`,
    groupId,
    userId: memberId,
    displayName: "Alpha Leader",
    role: "owner",
    status: "approved"
  });

  const app = setupTestApp(db);
  const server = await listen(app);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const token = JSON.stringify({
      uid: "uid-active-999",
      email: "alpha.member@gmail.com",
      email_verified: true,
      firebase: { sign_in_provider: "google.com" }
    });
    const loginRes = await fetch(`${base}/api/member/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token })
    });
    assert.equal(loginRes.status, 200);

    const cookie = loginRes.headers.get("set-cookie").split(";")[0];
    const groupRes = await fetch(`${base}/api/groups`, { headers: { cookie } });
    assert.equal(groupRes.status, 200);
    const groupData = await groupRes.json();
    assert.equal(groupData.groups.length, 1);
    assert.equal(groupData.groups[0].name, "Alpha Group");
    assert.equal(groupData.activeGroupId, groupId);
  } finally {
    await close(server);
  }
});

test("10. One-account-one-group restrictions prevent user with an active group from creating another", async () => {
  const db = createMemoryDb();
  const memberId = "member-one-group";
  const groupId = "group-existing";
  db.collections.memberProfiles.set(memberId, {
    _id: memberId,
    firebaseUid: "uid-one-group",
    email: "onegroup@gmail.com",
    displayName: "One Group User",
    sessionVersion: 0
  });
  db.collections.groups.set(groupId, {
    _id: groupId,
    id: groupId,
    name: "Existing Group",
    ownerId: memberId,
    active: true,
    memberCount: 2,
    maxMembers: 8,
    status: "active"
  });
  db.collections.groupMembers.set(`${groupId}_${memberId}`, {
    _id: `${groupId}_${memberId}`,
    groupId,
    userId: memberId,
    displayName: "One Group User",
    role: "owner",
    status: "approved"
  });

  const app = setupTestApp(db);
  const server = await listen(app);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const token = JSON.stringify({
      uid: "uid-one-group",
      email: "onegroup@gmail.com",
      email_verified: true,
      firebase: { sign_in_provider: "google.com" }
    });
    const loginRes = await fetch(`${base}/api/member/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token })
    });
    assert.equal(loginRes.status, 200);

    const cookie = loginRes.headers.get("set-cookie").split(";")[0];
    // Attempt creating another group
    const createRes = await fetch(`${base}/api/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ name: "Second Group" })
    });
    assert.equal(createRes.status, 409);
    const body = await createRes.json();
    assert.equal(body.code, "ALREADY_IN_GROUP");
  } finally {
    await close(server);
  }
});
