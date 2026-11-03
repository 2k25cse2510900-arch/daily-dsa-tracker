"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const express = require("express");
const session = require("express-session");
const { createGroupService, createMongoGroupStore } = require("../groups");
const { createGroupRouter } = require("../group-routes");

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
  async findOne(filter) {
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
  async updateOne(filter, update) {
    const doc = this.docs.find(item => match(item, filter));
    if (!doc) return { matchedCount: 0 };
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

function createTestHarness() {
  const groupsCol = new MemoryCollection([["_id"]]);
  const membersCol = new MemoryCollection([["groupId", "userId"]]);
  const invitationsCol = new MemoryCollection([["_id"], ["codeHash"]]);
  const requestsCol = new MemoryCollection([["_id"], ["groupId", "userId", "status"]]);
  const leetcodeCol = new MemoryCollection([["_id"]]);

  const mockDb = {
    collection(name) {
      if (name === "groups") return groupsCol;
      if (name === "groupMembers") return membersCol;
      if (name === "groupInvitations") return invitationsCol;
      if (name === "groupJoinRequests") return requestsCol;
      if (name === "leetcodeProfiles") return leetcodeCol;
      throw new Error("Unknown collection: " + name);
    }
  };

  const store = createMongoGroupStore(mockDb);
  let idCounter = 0;
  const service = createGroupService({
    store,
    invitationSecret: "test-secret-key",
    now: () => new Date(),
    newGroupId: () => `group-00000000-0000-4000-8000-${String(++idCounter).padStart(12, "0")}`,
    newInvitationCode: () => `invite-code-${++idCounter}`
  });

  return { store, service, groupsCol, membersCol, invitationsCol, requestsCol, leetcodeCol };
}

// Populate legacy 8-member group
async function seedLegacyGroup(harness) {
  const legacyGroupId = "legacy-dsa-group";
  await harness.groupsCol.insertOne({
    _id: legacyGroupId,
    name: "DSA Founders",
    status: "active",
    legacy: true,
    ownerId: "krish",
    memberCount: 8,
    maxMembers: 8,
    createdAt: new Date("2026-01-01T00:00:00Z")
  });

  const legacyMembers = [
    { id: "krish", name: "Krish", role: "owner" },
    { id: "member2", name: "Alice", role: "member" },
    { id: "member3", name: "Bob", role: "member" },
    { id: "member4", name: "Charlie", role: "member" },
    { id: "member5", name: "Diana", role: "member" },
    { id: "member6", name: "Eve", role: "member" },
    { id: "member7", name: "Frank", role: "member" },
    { id: "member8", name: "Grace", role: "member" }
  ];

  for (let i = 0; i < legacyMembers.length; i++) {
    const m = legacyMembers[i];
    await harness.membersCol.insertOne({
      groupId: legacyGroupId,
      userId: m.id,
      displayName: m.name,
      role: m.role,
      status: "approved",
      joinedAt: new Date(Date.now() + i * 1000)
    });
    await harness.leetcodeCol.insertOne({
      _id: m.id,
      username: `${m.name.toLowerCase()}_lc`,
      stats: { solvedOverall: 100 + i * 10 }
    });
  }
}

test("Test A: Account A logs in, views legacy-dsa-group, sees all 8 members with Krish as Leader", async () => {
  const harness = createTestHarness();
  await seedLegacyGroup(harness);

  const detail = await harness.service.groupMembersDetail({
    groupId: "legacy-dsa-group",
    userId: "krish"
  });

  assert.equal(detail.groupId, "legacy-dsa-group");
  assert.equal(detail.groupName, "DSA Founders");
  assert.equal(detail.legacy, true);
  assert.equal(detail.members.length, 8);

  const leader = detail.members.find(m => m.id === "krish");
  assert.ok(leader, "Krish should be present in members list");
  assert.equal(leader.role, "Leader");
  assert.equal(leader.rawRole, "owner");

  const otherMembers = detail.members.filter(m => m.id !== "krish");
  assert.equal(otherMembers.length, 7);
  for (const m of otherMembers) {
    assert.equal(m.role, "Member");
    assert.equal(m.rawRole, "member");
  }

  // LeetCode profiles attached
  assert.ok(detail.leetcode.krish);
  assert.equal(detail.leetcode.krish.username, "krish_lc");
});

test("Test B: Create MYTH group, verify MYTH displays only 1 member (creator as Leader)", async () => {
  const harness = createTestHarness();
  await seedLegacyGroup(harness);

  // New creator account creates MYTH
  const creatorUser = { id: "user_myth_creator", name: "MythLeader" };
  const group = await harness.service.createGroup({
    owner: creatorUser,
    name: "MYTH"
  });

  assert.equal(group.name, "MYTH");
  assert.equal(group.role, "owner");
  assert.equal(group.memberCount, 1);

  const mythMembers = await harness.service.groupMembersDetail({
    groupId: group.id,
    userId: creatorUser.id
  });

  assert.equal(mythMembers.groupId, group.id);
  assert.equal(mythMembers.groupName, "MYTH");
  assert.equal(mythMembers.legacy, false);
  assert.equal(mythMembers.members.length, 1);

  const creator = mythMembers.members[0];
  assert.equal(creator.id, creatorUser.id);
  assert.equal(creator.name, "MythLeader");
  assert.equal(creator.role, "Leader");
  assert.equal(creator.rawRole, "owner");
});

test("Test C: Account B joins MYTH via code, approved, opens Members section, sees only MYTH members (2 members)", async () => {
  const harness = createTestHarness();
  await seedLegacyGroup(harness);

  const creatorUser = { id: "user_myth_creator", name: "MythLeader" };
  const group = await harness.service.createGroup({
    owner: creatorUser,
    name: "MYTH"
  });

  // Creator generates invite
  const invite = await harness.service.createInvitation({
    groupId: group.id,
    ownerId: creatorUser.id
  });

  // Account B requests to join
  const accountB = { id: "user_b", name: "Account B" };
  const joinReq = await harness.service.requestJoin({
    code: invite.code,
    user: accountB
  });
  assert.equal(joinReq.status, "pending");

  // Creator approves Account B
  const decision = await harness.service.decideRequest({
    groupId: group.id,
    ownerId: creatorUser.id,
    userId: accountB.id,
    approve: true
  });
  assert.equal(decision.status, "approved");

  // Account B queries MYTH members
  const detailForB = await harness.service.groupMembersDetail({
    groupId: group.id,
    userId: accountB.id
  });

  assert.equal(detailForB.members.length, 2);
  assert.deepEqual(
    detailForB.members.map(m => m.name).sort(),
    ["Account B", "MythLeader"].sort()
  );

  const leader = detailForB.members.find(m => m.id === creatorUser.id);
  const member = detailForB.members.find(m => m.id === accountB.id);
  assert.equal(leader.role, "Leader");
  assert.equal(member.role, "Member");
});

test("Test D: Account switching between Account A and Account B preserves data isolation; neither sees the other's members", async () => {
  const harness = createTestHarness();
  await seedLegacyGroup(harness);

  // Setup MYTH group with Account B and MythLeader
  const mythCreator = { id: "user_myth_creator", name: "MythLeader" };
  const mythGroup = await harness.service.createGroup({
    owner: mythCreator,
    name: "MYTH"
  });
  const invite = await harness.service.createInvitation({
    groupId: mythGroup.id,
    ownerId: mythCreator.id
  });
  const accountB = { id: "user_b", name: "Account B" };
  await harness.service.requestJoin({ code: invite.code, user: accountB });
  await harness.service.decideRequest({
    groupId: mythGroup.id,
    ownerId: mythCreator.id,
    userId: accountB.id,
    approve: true
  });

  // Account A (krish) only belongs to legacy-dsa-group
  const accountAGroups = await harness.service.listForUser("krish");
  assert.equal(accountAGroups.length, 1);
  assert.equal(accountAGroups[0].id, "legacy-dsa-group");

  const accountAMembers = await harness.service.groupMembersDetail({
    groupId: accountAGroups[0].id,
    userId: "krish"
  });
  assert.equal(accountAMembers.members.length, 8);
  assert.ok(!accountAMembers.members.some(m => m.id === "user_b" || m.id === "user_myth_creator"));

  // Account B only belongs to MYTH
  const accountBGroups = await harness.service.listForUser("user_b");
  assert.equal(accountBGroups.length, 1);
  assert.equal(accountBGroups[0].id, mythGroup.id);

  const accountBMembers = await harness.service.groupMembersDetail({
    groupId: accountBGroups[0].id,
    userId: "user_b"
  });
  assert.equal(accountBMembers.members.length, 2);
  assert.ok(!accountBMembers.members.some(m => m.id === "krish" || m.id === "member2"));
});

test("Test E: Data isolation: Unauthorized user requesting /api/groups/:groupId/members receives 403", async () => {
  const harness = createTestHarness();
  await seedLegacyGroup(harness);

  const mythCreator = { id: "user_myth_creator", name: "MythLeader" };
  const mythGroup = await harness.service.createGroup({
    owner: mythCreator,
    name: "MYTH"
  });

  // User C has no group or is not in MYTH
  await assert.rejects(
    () => harness.service.groupMembersDetail({ groupId: mythGroup.id, userId: "unauthorized_user" }),
    { code: "GROUP_MEMBERSHIP_REQUIRED", status: 403 }
  );

  // User C also cannot access legacy group
  await assert.rejects(
    () => harness.service.groupMembersDetail({ groupId: "legacy-dsa-group", userId: "unauthorized_user" }),
    { code: "GROUP_MEMBERSHIP_REQUIRED", status: 403 }
  );
});

test("Test F: Express HTTP endpoints /api/groups/:groupId/members and group-scoped /api/page-data/members", async () => {
  const harness = createTestHarness();
  await seedLegacyGroup(harness);

  const mythCreator = { id: "myth_owner", name: "MythLeader" };
  const mythGroup = await harness.service.createGroup({
    owner: mythCreator,
    name: "MYTH"
  });

  const app = express();
  app.use(express.json());

  // Mock session and member middleware
  let currentSessionUser = null;
  app.use((req, res, next) => {
    req.session = {
      memberAuth: currentSessionUser,
      activeGroupId: currentSessionUser?.activeGroupId
    };
    if (currentSessionUser) {
      req.member = {
        id: currentSessionUser.memberId,
        email: currentSessionUser.memberEmail,
        name: currentSessionUser.name || "Test User"
      };
    }
    next();
  });

  // Mount groupRouter
  const groupRouter = createGroupRouter({
    getDb: () => ({
      collection: name => {
        if (name === "groups") return harness.groupsCol;
        if (name === "groupMembers") return harness.membersCol;
        if (name === "groupInvitations") return harness.invitationsCol;
        if (name === "groupJoinRequests") return harness.requestsCol;
        if (name === "leetcodeProfiles") return harness.leetcodeCol;
        if (name === "dashboard") return { findOne: async () => null };
        throw new Error("Unknown collection: " + name);
      }
    }),
    memberOnly: (req, res, next) => {
      if (!req.member?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }
      next();
    },
    invitationSecret: "test-secret-key"
  });
  app.use("/api/groups", groupRouter);

  // Mock /api/page-data/members endpoint as implemented in server.js
  app.get("/api/page-data/members", async (req, res) => {
    const memberId = req.member?.id;
    if (!memberId) return res.status(401).json({ error: "Authentication required" });

    let targetGroupId = req.query.groupId || req.session.activeGroupId;
    if (!targetGroupId) {
      const active = await harness.store.activeMembershipForUser(memberId);
      targetGroupId = active ? active.groupId : "legacy-dsa-group";
    }

    try {
      const detail = await harness.service.groupMembersDetail({
        groupId: targetGroupId,
        userId: memberId
      });
      res.json({
        groupId: detail.groupId,
        groupName: detail.groupName,
        members: detail.members,
        leetcode: detail.leetcode
      });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  });

  const server = await listen(app);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Unauthenticated request to /api/groups/:groupId/members returns 401
    const res1 = await fetch(`${baseUrl}/api/groups/${mythGroup.id}/members`);
    assert.equal(res1.status, 401);

    // 2. Authenticated as non-member returns 403
    currentSessionUser = { memberId: "outsider", memberEmail: "outsider@example.com", name: "Outsider" };
    const res2 = await fetch(`${baseUrl}/api/groups/${mythGroup.id}/members`);
    assert.equal(res2.status, 403);
    const body2 = await res2.json();
    assert.equal(body2.code, "GROUP_MEMBERSHIP_REQUIRED");

    // 3. Authenticated as myth_owner returns 200 with MYTH members
    currentSessionUser = { memberId: "myth_owner", memberEmail: "owner@myth.com", name: "MythLeader" };
    const res3 = await fetch(`${baseUrl}/api/groups/${mythGroup.id}/members`);
    assert.equal(res3.status, 200);
    const body3 = await res3.json();
    assert.equal(body3.groupId, mythGroup.id);
    assert.equal(body3.members.length, 1);
    assert.equal(body3.members[0].name, "MythLeader");
    assert.equal(body3.members[0].role, "Leader");

    // 4. Test /api/page-data/members returns group-scoped data
    const res4 = await fetch(`${baseUrl}/api/page-data/members?groupId=${mythGroup.id}`);
    assert.equal(res4.status, 200);
    const body4 = await res4.json();
    assert.equal(body4.members.length, 1);
    assert.equal(body4.groupName, "MYTH");

    // 5. Outsider accessing /api/page-data/members for MYTH gets 403
    currentSessionUser = { memberId: "outsider", memberEmail: "outsider@example.com", name: "Outsider" };
    const res5 = await fetch(`${baseUrl}/api/page-data/members?groupId=${mythGroup.id}`);
    assert.equal(res5.status, 403);

    // 6. Krish accessing /api/page-data/members gets legacy group with 8 members
    currentSessionUser = { memberId: "krish", memberEmail: "krish@example.com", name: "Krish", activeGroupId: "legacy-dsa-group" };
    const res6 = await fetch(`${baseUrl}/api/page-data/members`);
    assert.equal(res6.status, 200);
    const body6 = await res6.json();
    assert.equal(body6.groupId, "legacy-dsa-group");
    assert.equal(body6.members.length, 8);
  } finally {
    await close(server);
  }
});
