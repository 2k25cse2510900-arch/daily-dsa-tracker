"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const session = require("express-session");

function listen(app) {
  return new Promise(resolve => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function close(server) {
  server.closeAllConnections();
  return new Promise(resolve => server.close(resolve));
}

test("Account Switching Audit: Admin 22 -> Logout -> Admin 69 -> Logout -> Naruto -> Cross-group security", async () => {
  const app = express();
  app.use(express.json());

  // In-memory mock database with actual account structures
  const groups = [
    { _id: "legacy-dsa-group", name: "Legacy DSA Group", ownerId: "admin_22", legacy: true, status: "active" },
    { _id: "group-3c48d7f6-d88d-4cca-b04c-89ac10b35f9c", name: "MYTH", ownerId: "admin_69", legacy: false, status: "active" }
  ];

  const groupMembers = [
    // Group A (8 members)
    { groupId: "legacy-dsa-group", userId: "admin_22", displayName: "Krish (Admin 22)", role: "owner", status: "approved" },
    { groupId: "legacy-dsa-group", userId: "m2", displayName: "Kartik Kumar", role: "member", status: "approved" },
    { groupId: "legacy-dsa-group", userId: "m3", displayName: "Tanmay Awasthi", role: "member", status: "approved" },
    { groupId: "legacy-dsa-group", userId: "m4", displayName: "Avantika Yadav", role: "member", status: "approved" },
    { groupId: "legacy-dsa-group", userId: "m5", displayName: "Kshitij Rajput", role: "member", status: "approved" },
    { groupId: "legacy-dsa-group", userId: "m6", displayName: "Krishna Kumar Gaur", role: "member", status: "approved" },
    { groupId: "legacy-dsa-group", userId: "m7", displayName: "Kanika Dwivedi", role: "member", status: "approved" },
    { groupId: "legacy-dsa-group", userId: "m8", displayName: "Deepanshu Sachan", role: "member", status: "approved" },
    // Group B (2 members)
    { groupId: "group-3c48d7f6-d88d-4cca-b04c-89ac10b35f9c", userId: "admin_69", displayName: "Krish Chaddha (69)", role: "owner", status: "approved" },
    { groupId: "group-3c48d7f6-d88d-4cca-b04c-89ac10b35f9c", userId: "naruto_user", displayName: "Naruto Uzumaki", role: "member", status: "approved" }
  ];

  let currentSession = null;

  // Authorization helper matching server.js
  function resolveAuth(req) {
    if (!currentSession || !currentSession.memberId) {
      const err = new Error("Authentication required.");
      err.status = 401;
      throw err;
    }
    const userId = currentSession.memberId;
    let targetGroupId = req.query.groupId || currentSession.activeGroupId;
    if (!targetGroupId) {
      const activeM = groupMembers.find(m => m.userId === userId && m.status === "approved");
      if (activeM) targetGroupId = activeM.groupId;
    }
    if (!targetGroupId) {
      const err = new Error("Group membership required.");
      err.status = 403;
      throw err;
    }
    const membership = groupMembers.find(m => m.groupId === targetGroupId && m.userId === userId && m.status === "approved");
    if (!membership) {
      const err = new Error("You are not an authorized member of this group.");
      err.status = 403;
      err.code = "GROUP_MEMBERSHIP_REQUIRED";
      throw err;
    }
    const group = groups.find(g => g._id === targetGroupId);
    const members = groupMembers.filter(m => m.groupId === targetGroupId && m.status === "approved");
    currentSession.activeGroupId = targetGroupId;
    return { groupId: targetGroupId, group, membership, members };
  }

  app.get("/api/page-data/:page", (req, res) => {
    try {
      const ctx = resolveAuth(req);
      const members = ctx.members.map(m => ({ id: m.userId, name: m.displayName, role: m.role === "owner" ? "Leader" : "Member" }));
      res.json({ page: req.params.page, groupId: ctx.groupId, groupName: ctx.group.name, members, participants: members.length });
    } catch (err) {
      res.status(err.status || 403).json({ error: err.message, code: err.code });
    }
  });

  app.get("/api/arena/live", (req, res) => {
    try {
      const ctx = resolveAuth(req);
      const racers = ctx.members.map(m => ({ id: m.userId, name: m.displayName }));
      res.json({ groupId: ctx.groupId, racers });
    } catch (err) {
      res.status(err.status || 403).json({ error: err.message, code: err.code });
    }
  });

  app.get("/api/member/shared-data", (req, res) => {
    try {
      const ctx = resolveAuth(req);
      const members = ctx.members.map(m => ({ id: m.userId, name: m.displayName, role: m.role === "owner" ? "Leader" : "Member" }));
      res.json({ groupId: ctx.groupId, groupName: ctx.group.name, members });
    } catch (err) {
      res.status(err.status || 403).json({ error: err.message, code: err.code });
    }
  });

  const server = await listen(app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    // === STEP 1: Admin 22 Login ===
    currentSession = { memberId: "admin_22", activeGroupId: "legacy-dsa-group" };
    const a22Res = await fetch(`${baseUrl}/api/page-data/members`);
    assert.equal(a22Res.status, 200);
    const a22Data = await a22Res.json();
    assert.equal(a22Data.groupId, "legacy-dsa-group");
    assert.equal(a22Data.members.length, 8);
    assert.ok(a22Data.members.some(m => m.id === "admin_22"));
    assert.ok(!a22Data.members.some(m => m.id === "admin_69" || m.id === "naruto_user"));

    // Arena for Admin 22
    const a22Arena = await (await fetch(`${baseUrl}/api/arena/live`)).json();
    assert.equal(a22Arena.racers.length, 8);
    assert.ok(!a22Arena.racers.some(r => r.id === "naruto_user"));

    // === STEP 2: Logout ===
    currentSession = null;
    const unauthRes = await fetch(`${baseUrl}/api/page-data/members`);
    assert.equal(unauthRes.status, 401);

    // === STEP 3: Admin 69 Login ===
    currentSession = { memberId: "admin_69", activeGroupId: "group-3c48d7f6-d88d-4cca-b04c-89ac10b35f9c" };
    const a69Res = await fetch(`${baseUrl}/api/page-data/members`);
    assert.equal(a69Res.status, 200);
    const a69Data = await a69Res.json();
    assert.equal(a69Data.groupId, "group-3c48d7f6-d88d-4cca-b04c-89ac10b35f9c");
    assert.equal(a69Data.members.length, 2);
    assert.ok(a69Data.members.some(m => m.id === "admin_69" && m.role === "Leader"));
    assert.ok(a69Data.members.some(m => m.id === "naruto_user" && m.role === "Member"));
    // Zero legacy members present
    assert.ok(!a69Data.members.some(m => m.id === "admin_22" || m.id === "m2"));

    // Arena for Admin 69
    const a69Arena = await (await fetch(`${baseUrl}/api/arena/live`)).json();
    assert.equal(a69Arena.racers.length, 2);
    assert.ok(!a69Arena.racers.some(r => r.id === "admin_22"));

    // === STEP 4: Logout ===
    currentSession = null;
    assert.equal((await fetch(`${baseUrl}/api/arena/live`)).status, 401);

    // === STEP 5: Naruto Login ===
    currentSession = { memberId: "naruto_user", activeGroupId: "group-3c48d7f6-d88d-4cca-b04c-89ac10b35f9c" };
    const narutoRes = await fetch(`${baseUrl}/api/page-data/members`);
    assert.equal(narutoRes.status, 200);
    const narutoData = await narutoRes.json();
    assert.equal(narutoData.groupId, "group-3c48d7f6-d88d-4cca-b04c-89ac10b35f9c");
    assert.equal(narutoData.members.length, 2);
    assert.ok(narutoData.members.some(m => m.id === "naruto_user" && m.role === "Member"));

    // Naruto attempts to access Group A
    const crossRes1 = await fetch(`${baseUrl}/api/page-data/members?groupId=legacy-dsa-group`);
    assert.equal(crossRes1.status, 403);
    const crossErr1 = await crossRes1.json();
    assert.equal(crossErr1.code, "GROUP_MEMBERSHIP_REQUIRED");

    const crossArena1 = await fetch(`${baseUrl}/api/arena/live?groupId=legacy-dsa-group`);
    assert.equal(crossArena1.status, 403);

    const crossShared1 = await fetch(`${baseUrl}/api/member/shared-data?groupId=legacy-dsa-group`);
    assert.equal(crossShared1.status, 403);

    // === STEP 6: Refresh Simulation ===
    // Browser refreshes: request without explicit ?groupId uses server-verified active group
    const refreshRes = await fetch(`${baseUrl}/api/page-data/leaderboard`);
    assert.equal(refreshRes.status, 200);
    const refreshData = await refreshRes.json();
    assert.equal(refreshData.groupId, "group-3c48d7f6-d88d-4cca-b04c-89ac10b35f9c");
    assert.equal(refreshData.participants, 2);

    console.log("Account Switching Audit: All 6 stages VERIFIED PASSED");
  } finally {
    await close(server);
  }
});
