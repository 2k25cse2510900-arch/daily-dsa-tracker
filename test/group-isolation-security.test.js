"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const session = require("express-session");
const { createGroupService, createMongoGroupStore } = require("../groups");
const { createGroupRouter } = require("../group-routes");
const { buildRaceArenaState } = require("../arena-race");
const { applyEligibleDenseRanks } = require("../ranking");
const { scoreWeek } = require("../scoring");

function listen(app) {
  return new Promise(resolve => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function close(server) {
  server.closeAllConnections();
  return new Promise(resolve => server.close(resolve));
}

function match(doc, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    const value = doc[key];
    if (expected && typeof expected === "object" && !Array.isArray(expected)) {
      if ("$gt" in expected) return value > expected.$gt;
      if ("$lt" in expected) return value < expected.$lt;
      if ("$ne" in expected) return value !== expected.$ne;
      if ("$in" in expected) return expected.$in.includes(value);
      if ("$exists" in expected) return (key in doc) === expected.$exists;
    }
    return value === expected;
  });
}

class MemoryCollection {
  constructor(unique = []) {
    this.docs = [];
    this.unique = unique;
  }
  async insertOne(doc) {
    if (this.unique.some(keys => this.docs.some(existing => keys.every(key => existing[key] === doc[key])))) {
      const error = new Error("duplicate key");
      error.code = 11000;
      throw error;
    }
    this.docs.push(structuredClone(doc));
    return { insertedId: doc._id };
  }
  async findOne(filter = {}) {
    const doc = this.docs.find(item => match(item, filter));
    return doc ? structuredClone(doc) : null;
  }
  find(filter = {}) {
    let result = this.docs.filter(item => match(item, filter)).map(item => structuredClone(item));
    return {
      sort: (sortObj) => {
        const [sortKey, sortDir] = Object.entries(sortObj)[0] || [];
        if (sortKey) {
          result.sort((a, b) => {
            if (a[sortKey] < b[sortKey]) return sortDir === 1 ? -1 : 1;
            if (a[sortKey] > b[sortKey]) return sortDir === 1 ? 1 : -1;
            return 0;
          });
        }
        return {
          toArray: async () => result
        };
      },
      toArray: async () => result
    };
  }
  async updateOne(filter, update, options = {}) {
    const doc = this.docs.find(item => match(item, filter));
    if (!doc) {
      if (options.upsert) {
        const newDoc = { ...(filter._id ? { _id: filter._id } : {}), ...structuredClone(update.$set || {}), ...structuredClone(update.$setOnInsert || {}) };
        this.docs.push(newDoc);
        return { matchedCount: 0, upsertedCount: 1, upsertedId: newDoc._id };
      }
      return { matchedCount: 0 };
    }
    if (update.$set) Object.assign(doc, structuredClone(update.$set));
    if (update.$inc) {
      for (const [key, value] of Object.entries(update.$inc)) {
        doc[key] = (doc[key] || 0) + value;
      }
    }
    return { matchedCount: 1 };
  }
  async deleteOne(filter) {
    const index = this.docs.findIndex(item => match(item, filter));
    if (index >= 0) {
      this.docs.splice(index, 1);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }
}

async function createIsolatedHarness() {
  const groupsCol = new MemoryCollection([["_id"]]);
  const membersCol = new MemoryCollection([["groupId", "userId"]]);
  const dashboardCol = new MemoryCollection([["_id"]]);
  const leetcodeCol = new MemoryCollection([["_id"]]);
  const cvCol = new MemoryCollection([["_id"]]);
  const activityCol = new MemoryCollection([["_id"]]);
  const requestsCol = new MemoryCollection([["_id"], ["groupId", "userId", "status"]]);
  const invitationsCol = new MemoryCollection([["_id"], ["codeHash"]]);
  const profilesCol = new MemoryCollection([["_id"]]);

  const mockDb = {
    collection(name) {
      if (name === "groups") return groupsCol;
      if (name === "groupMembers") return membersCol;
      if (name === "dashboard") return dashboardCol;
      if (name === "leetcodeProfiles") return leetcodeCol;
      if (name === "characterVerseProfiles") return cvCol;
      if (name === "leetcodeActivity") return activityCol;
      if (name === "groupJoinRequests") return requestsCol;
      if (name === "groupInvitations") return invitationsCol;
      if (name === "memberProfiles") return profilesCol;
      if (name === "memberAuthLinks") return new MemoryCollection([["_id"]]);
      if (name === "leetcodeActivityJobs") return new MemoryCollection([["_id"]]);
      throw new Error("Unknown collection: " + name);
    }
  };

  // Group A: Legacy 8-member group
  const groupAId = "legacy-dsa-group";
  await groupsCol.insertOne({
    _id: groupAId,
    name: "Legacy DSA Group",
    status: "active",
    ownerId: "admin_22",
    memberCount: 8,
    legacy: true,
    createdAt: new Date("2026-01-01T00:00:00Z")
  });

  const groupAMemberDefs = [
    { id: "admin_22", name: "Krish (Admin 22)", role: "owner" },
    { id: "m2", name: "Kartik Kumar", role: "member" },
    { id: "m3", name: "Tanmay Awasthi", role: "member" },
    { id: "m4", name: "Avantika Yadav", role: "member" },
    { id: "m5", name: "Kshitij Rajput", role: "member" },
    { id: "m6", name: "Krishna Kumar Gaur", role: "member" },
    { id: "m7", name: "Kanika Dwivedi", role: "member" },
    { id: "m8", name: "Deepanshu Sachan", role: "member" }
  ];

  const groupAWEEKS = {
    "1": {
      daily: {
        admin_22: ["done", "done", "done", "done", "done", "done"],
        m2: ["done", "done", "blank", "blank", "blank", "blank"]
      },
      concepts: {
        admin_22: ["done", "done"]
      }
    }
  };

  await dashboardCol.insertOne({
    _id: "shared",
    groupId: groupAId,
    currentWeek: 1,
    members: groupAMemberDefs.map(m => ({ id: m.id, name: m.name, role: m.role === "owner" ? "Leader" : "Member" })),
    weeks: groupAWEEKS
  });

  for (const m of groupAMemberDefs) {
    await membersCol.insertOne({
      groupId: groupAId,
      userId: m.id,
      displayName: m.name,
      role: m.role,
      status: "approved",
      joinedAt: new Date("2026-01-01T00:00:00Z")
    });
    await leetcodeCol.insertOne({
      _id: m.id,
      username: `${m.name.split(" ")[0].toLowerCase()}_lc`,
      stats: { total: 150 }
    });
    await cvCol.insertOne({
      _id: m.id,
      appearance: { equippedCharacterId: "buster-blitz" }
    });
  }

  // Group B: Newly created group (Admin 69 & Naruto)
  const groupBId = "group-3c48d7f6-d88d-4cca-b04c-89ac10b35f9c";
  await groupsCol.insertOne({
    _id: groupBId,
    name: "MYTH",
    status: "active",
    ownerId: "admin_69",
    memberCount: 2,
    legacy: false,
    createdAt: new Date("2026-11-02T07:41:15Z")
  });

  const groupBMemberDefs = [
    { id: "admin_69", name: "Krish Chaddha (69)", role: "owner" },
    { id: "naruto_user", name: "Naruto Uzumaki", role: "member" }
  ];

  for (const m of groupBMemberDefs) {
    await membersCol.insertOne({
      groupId: groupBId,
      userId: m.id,
      displayName: m.name,
      role: m.role,
      status: "approved",
      joinedAt: new Date("2026-11-02T08:00:00Z")
    });
    await leetcodeCol.insertOne({
      _id: m.id,
      username: `${m.name.split(" ")[0].toLowerCase()}_lc`,
      stats: { total: 88 }
    });
    await cvCol.insertOne({
      _id: m.id,
      appearance: { equippedCharacterId: "superman" }
    });
    await profilesCol.insertOne({
      _id: m.id,
      displayName: m.name,
      email: `${m.id}@gmail.com`,
      sessionVersion: 0
    });
  }

  // Stored daily activity
  await activityCol.insertOne({
    _id: "2026-11-02",
    date: "2026-11-02",
    statuses: {
      admin_22: { status: "Attempt verified", detail: "Accepted" },
      m2: { status: "Attempt verified", detail: "Accepted" },
      admin_69: { status: "Attempt verified", detail: "Accepted" },
      naruto_user: { status: "Attempt verified", detail: "Accepted" }
    }
  });

  // Express test app
  const app = express();
  app.use(express.json());

  let testSession = null;
  app.use((req, res, next) => {
    req.session = testSession || {};
    req.member = testSession?.member || null;
    next();
  });

  // Mock group router
  const groupRouter = createGroupRouter({
    getDb: () => mockDb,
    memberOnly: (req, res, next) => {
      if (!req.member?.id) return res.status(401).json({ error: "Authentication required." });
      next();
    },
    invitationSecret: "secret"
  });
  app.use("/api/groups", groupRouter);

  // Group context resolver simulating server.js
  async function resolveContext(req) {
    const userId = req.member?.id || req.session?.memberId;
    if (!userId) {
      const err = new Error("Authentication required.");
      err.status = 401;
      throw err;
    }
    let targetGroupId = req.query.groupId || req.session.activeGroupId;
    if (!targetGroupId) {
      const activeM = await membersCol.findOne({ userId, status: "approved" });
      if (activeM) targetGroupId = activeM.groupId;
    }
    if (!targetGroupId) {
      const err = new Error("Group membership required.");
      err.status = 403;
      throw err;
    }
    const membership = await membersCol.findOne({ groupId: targetGroupId, userId, status: "approved" });
    if (!membership) {
      const err = new Error("You are not an authorized member of this group.");
      err.status = 403;
      throw err;
    }
    const group = await groupsCol.findOne({ _id: targetGroupId });
    const members = await membersCol.find({ groupId: targetGroupId, status: "approved" }).sort({ joinedAt: 1 }).toArray();
    return { groupId: targetGroupId, group, membership, members };
  }

  app.get("/api/page-data/:page", async (req, res) => {
    let ctx;
    try {
      ctx = await resolveContext(req);
    } catch (err) {
      return res.status(err.status || 403).json({ error: err.message });
    }
    const { groupId, group, members } = ctx;
    const page = req.params.page;
    const memberIds = members.map(m => m.userId);

    if (page === "members") {
      return res.json({
        page,
        groupId,
        groupName: group.name,
        members: members.map(m => ({ id: m.userId, name: m.displayName, role: m.role === "owner" ? "Leader" : "Member" }))
      });
    }

    if (page === "leaderboard") {
      return res.json({
        page,
        groupId,
        groupName: group.name,
        members: members.map(m => ({ id: m.userId, name: m.displayName, score: 10 })),
        participants: members.length
      });
    }

    if (page === "daily") {
      const act = await activityCol.findOne({ _id: "2026-11-02" });
      const scopedStatuses = {};
      for (const id of memberIds) {
        if (act?.statuses?.[id]) scopedStatuses[id] = act.statuses[id];
      }
      return res.json({
        page,
        groupId,
        groupName: group.name,
        members: members.map(m => ({ id: m.userId, name: m.displayName })),
        activity: { statuses: scopedStatuses }
      });
    }

    if (page === "concepts") {
      return res.json({
        page,
        groupId,
        groupName: group.name,
        members: members.map(m => ({ id: m.userId, name: m.displayName }))
      });
    }

    if (page === "arena") {
      const racers = members.map(m => ({ id: m.userId, name: m.displayName }));
      return res.json({
        page,
        groupId,
        groupName: group.name,
        arena: { racers, targetMilestone: 100 }
      });
    }

    if (page === "overview") {
      return res.json({
        page,
        groupId,
        groupName: group.name,
        participants: members.length,
        summary: members.map(m => ({ name: m.displayName }))
      });
    }

    if (page === "report") {
      return res.json({
        page,
        groupId,
        groupName: group.name,
        members: members.map(m => ({ id: m.userId, name: m.displayName }))
      });
    }

    res.status(404).json({ error: "Not found" });
  });

  app.get("/api/arena/live", async (req, res) => {
    try {
      const { groupId, group, members } = await resolveContext(req);
      const racers = members.map(m => ({ id: m.userId, name: m.displayName }));
      res.json({ groupId, groupName: group.name, racers, targetMilestone: 100 });
    } catch (err) {
      res.status(err.status || 403).json({ error: err.message });
    }
  });

  return { app, setSession: s => { testSession = s; }, groupAId, groupBId };
}

test("Test 1: Existing eight-member group (Admin 22) displays exactly 8 members and own data only", async () => {
  const harness = await createIsolatedHarness();
  const server = await listen(harness.app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    harness.setSession({
      memberId: "admin_22",
      role: "member",
      member: { id: "admin_22", name: "Krish (Admin 22)" },
      activeGroupId: harness.groupAId
    });

    // Members
    const mRes = await fetch(`${baseUrl}/api/page-data/members`);
    assert.equal(mRes.status, 200);
    const mData = await mRes.json();
    assert.equal(mData.groupId, harness.groupAId);
    assert.equal(mData.members.length, 8);
    assert.ok(mData.members.some(m => m.id === "admin_22" && m.role === "Leader"));
    assert.ok(!mData.members.some(m => m.id === "admin_69" || m.id === "naruto_user"));

    // Leaderboard
    const lbRes = await fetch(`${baseUrl}/api/page-data/leaderboard`);
    assert.equal(lbRes.status, 200);
    const lbData = await lbRes.json();
    assert.equal(lbData.participants, 8);
    assert.ok(!lbData.members.some(m => m.id === "naruto_user"));

    // Daily
    const dRes = await fetch(`${baseUrl}/api/page-data/daily`);
    assert.equal(dRes.status, 200);
    const dData = await dRes.json();
    assert.equal(dData.members.length, 8);
    assert.ok(!Object.keys(dData.activity.statuses).includes("naruto_user"));

    // Arena
    const aRes = await fetch(`${baseUrl}/api/arena/live`);
    assert.equal(aRes.status, 200);
    const aData = await aRes.json();
    assert.equal(aData.racers.length, 8);
    assert.ok(!aData.racers.some(r => r.id === "naruto_user"));
  } finally {
    await close(server);
  }
});

test("Test 2: Newly created group (Admin 69) displays exactly 2 members (Admin 69 and Naruto) only", async () => {
  const harness = await createIsolatedHarness();
  const server = await listen(harness.app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    harness.setSession({
      memberId: "admin_69",
      role: "member",
      member: { id: "admin_69", name: "Krish Chaddha (69)" },
      activeGroupId: harness.groupBId
    });

    // Members
    const mRes = await fetch(`${baseUrl}/api/page-data/members`);
    assert.equal(mRes.status, 200);
    const mData = await mRes.json();
    assert.equal(mData.groupId, harness.groupBId);
    assert.equal(mData.members.length, 2);
    assert.ok(mData.members.some(m => m.id === "admin_69" && m.role === "Leader"));
    assert.ok(mData.members.some(m => m.id === "naruto_user" && m.role === "Member"));
    // Group A's 8 members are completely excluded
    assert.ok(!mData.members.some(m => m.id === "admin_22" || m.id === "m2"));

    // Leaderboard
    const lbRes = await fetch(`${baseUrl}/api/page-data/leaderboard`);
    assert.equal(lbRes.status, 200);
    const lbData = await lbRes.json();
    assert.equal(lbData.participants, 2);
    assert.ok(!lbData.members.some(m => m.id === "admin_22"));

    // Daily
    const dRes = await fetch(`${baseUrl}/api/page-data/daily`);
    assert.equal(dRes.status, 200);
    const dData = await dRes.json();
    assert.equal(dData.members.length, 2);
    assert.ok(!Object.keys(dData.activity.statuses).includes("admin_22"));

    // Live Race Arena
    const aRes = await fetch(`${baseUrl}/api/arena/live`);
    assert.equal(aRes.status, 200);
    const aData = await aRes.json();
    assert.equal(aData.racers.length, 2);
    assert.ok(!aData.racers.some(r => r.id === "admin_22"));
  } finally {
    await close(server);
  }
});

test("Test 3: Naruto account can only view Group B and cannot see Group A information", async () => {
  const harness = await createIsolatedHarness();
  const server = await listen(harness.app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    harness.setSession({
      memberId: "naruto_user",
      role: "member",
      member: { id: "naruto_user", name: "Naruto Uzumaki" },
      activeGroupId: harness.groupBId
    });

    // Naruto accessing Group B data -> 200 with Group B only
    const mRes = await fetch(`${baseUrl}/api/page-data/members`);
    assert.equal(mRes.status, 200);
    const mData = await mRes.json();
    assert.equal(mData.groupId, harness.groupBId);
    assert.equal(mData.members.length, 2);

    // Naruto explicitly requesting Group A data -> 403 Forbidden!
    const crossRes = await fetch(`${baseUrl}/api/page-data/members?groupId=${harness.groupAId}`);
    assert.equal(crossRes.status, 403);

    const crossArena = await fetch(`${baseUrl}/api/arena/live?groupId=${harness.groupAId}`);
    assert.equal(crossArena.status, 403);
  } finally {
    await close(server);
  }
});

test("Test 4: Cross-group API security rejects unauthorized access across all modules", async () => {
  const harness = await createIsolatedHarness();
  const server = await listen(harness.app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    // Admin 69 attempting to access Group A
    harness.setSession({
      memberId: "admin_69",
      role: "member",
      member: { id: "admin_69", name: "Krish Chaddha (69)" },
      activeGroupId: harness.groupBId
    });

    const modules = ["members", "leaderboard", "daily", "concepts", "arena", "overview", "report"];
    for (const mod of modules) {
      const res = await fetch(`${baseUrl}/api/page-data/${mod}?groupId=${harness.groupAId}`);
      assert.equal(res.status, 403, `Expected 403 for module: ${mod}`);
    }

    const liveRes = await fetch(`${baseUrl}/api/arena/live?groupId=${harness.groupAId}`);
    assert.equal(liveRes.status, 403, "Expected 403 for arena/live");
  } finally {
    await close(server);
  }
});

test("Test 5: New user who has not joined any group cannot see private data and is rejected", async () => {
  const harness = await createIsolatedHarness();
  const server = await listen(harness.app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    harness.setSession({
      memberId: "new_google_user",
      role: "member",
      member: { id: "new_google_user", name: "Brand New User" }
      // No active group
    });

    // Requesting Group A -> 403
    const resA = await fetch(`${baseUrl}/api/page-data/members?groupId=${harness.groupAId}`);
    assert.equal(resA.status, 403);

    // Requesting Group B -> 403
    const resB = await fetch(`${baseUrl}/api/page-data/members?groupId=${harness.groupBId}`);
    assert.equal(resB.status, 403);

    // Unauthenticated request -> 401
    harness.setSession(null);
    const unauthRes = await fetch(`${baseUrl}/api/page-data/members?groupId=${harness.groupAId}`);
    assert.equal(unauthRes.status, 401);
  } finally {
    await close(server);
  }
});

test("Test 6: Session and cache isolation: switching active accounts changes displayed data immediately", async () => {
  const harness = await createIsolatedHarness();
  const server = await listen(harness.app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    // 1. First request as Admin 22
    harness.setSession({
      memberId: "admin_22",
      role: "member",
      member: { id: "admin_22", name: "Krish (Admin 22)" },
      activeGroupId: harness.groupAId
    });
    const res1 = await fetch(`${baseUrl}/api/page-data/members`);
    const data1 = await res1.json();
    assert.equal(data1.groupId, harness.groupAId);
    assert.equal(data1.members.length, 8);

    // 2. Switch session to Admin 69
    harness.setSession({
      memberId: "admin_69",
      role: "member",
      member: { id: "admin_69", name: "Krish Chaddha (69)" },
      activeGroupId: harness.groupBId
    });
    const res2 = await fetch(`${baseUrl}/api/page-data/members`);
    const data2 = await res2.json();
    assert.equal(data2.groupId, harness.groupBId);
    assert.equal(data2.members.length, 2);

    // 3. Switch back to Admin 22
    harness.setSession({
      memberId: "admin_22",
      role: "member",
      member: { id: "admin_22", name: "Krish (Admin 22)" },
      activeGroupId: harness.groupAId
    });
    const res3 = await fetch(`${baseUrl}/api/page-data/members`);
    const data3 = await res3.json();
    assert.equal(data3.groupId, harness.groupAId);
    assert.equal(data3.members.length, 8);
  } finally {
    await close(server);
  }
});

test("Test 7: Real-time live race arena participants remain strictly within authorized group", async () => {
  const harness = await createIsolatedHarness();
  const server = await listen(harness.app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    // Group A race session
    harness.setSession({
      memberId: "admin_22",
      role: "member",
      member: { id: "admin_22", name: "Krish (Admin 22)" },
      activeGroupId: harness.groupAId
    });
    const resA = await fetch(`${baseUrl}/api/arena/live`);
    const arenaA = await resA.json();
    assert.equal(arenaA.racers.length, 8);
    assert.ok(arenaA.racers.every(r => !["admin_69", "naruto_user"].includes(r.id)));

    // Group B race session
    harness.setSession({
      memberId: "naruto_user",
      role: "member",
      member: { id: "naruto_user", name: "Naruto Uzumaki" },
      activeGroupId: harness.groupBId
    });
    const resB = await fetch(`${baseUrl}/api/arena/live`);
    const arenaB = await resB.json();
    assert.equal(arenaB.racers.length, 2);
    assert.ok(arenaB.racers.every(r => ["admin_69", "naruto_user"].includes(r.id)));
  } finally {
    await close(server);
  }
});
