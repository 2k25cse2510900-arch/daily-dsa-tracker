"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createGroupService, normalizeGroupName } = require("../groups");

function match(doc, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    const value = doc[key];
    if (expected && typeof expected === "object" && !Array.isArray(expected)) {
      if ("$gt" in expected) return value > expected.$gt;
      if ("$lt" in expected) return value < expected.$lt;
    }
    return value === expected;
  });
}

class Collection {
  constructor(unique = []) { this.docs = []; this.unique = unique; }
  async insertOne(doc) {
    if (this.unique.some(keys => this.docs.some(existing => keys.every(key => existing[key] === doc[key])))) {
      const error = new Error("duplicate"); error.code = 11000; throw error;
    }
    this.docs.push(structuredClone(doc)); return { insertedId: doc._id };
  }
  async findOne(filter) { const doc = this.docs.find(item => match(item, filter)); return doc ? structuredClone(doc) : null; }
  find(filter) {
    let result = this.docs.filter(item => match(item, filter)).map(item => structuredClone(item));
    return { sort: () => ({ toArray: async () => result }), toArray: async () => result };
  }
  async updateOne(filter, update) {
    const doc = this.docs.find(item => match(item, filter));
    if (!doc) return { matchedCount: 0 };
    if (update.$set) Object.assign(doc, structuredClone(update.$set));
    if (update.$inc) for (const [key, value] of Object.entries(update.$inc)) doc[key] = (doc[key] || 0) + value;
    return { matchedCount: 1 };
  }
  async deleteOne(filter) { const index = this.docs.findIndex(item => match(item, filter)); if (index >= 0) this.docs.splice(index, 1); return { deletedCount: index >= 0 ? 1 : 0 }; }
}

function fixture() {
  const groups = new Collection([["_id"]]);
  const members = new Collection([["groupId", "userId"]]);
  const invitations = new Collection([["_id"], ["codeHash"]]);
  const requests = new Collection([["_id"], ["groupId", "userId", "status"]]);
  const store = {
    groups, members, invitations, requests,
    groupForId: groupId => groups.findOne({ _id: groupId }),
    membership: (groupId, userId) => members.findOne({ groupId, userId, status: "approved" }),
    membershipsForUser: userId => members.find({ userId, status: "approved" }).toArray(),
    activeMembershipForUser: userId => members.findOne({ userId, status: "approved" }),
    pendingRequestForUser: userId => requests.findOne({ userId, status: "pending" })
  };
  let id = 0;
  const service = createGroupService({ store, invitationSecret: "test-group-secret", now: () => new Date("2026-11-01T00:00:00.000Z"), newGroupId: () => `group-00000000-0000-4000-8000-${String(++id).padStart(12, "0")}`, newInvitationCode: () => `safe-code-${++id}` });
  return { store, service };
}

test("group names are normalized and constrained", () => {
  assert.equal(normalizeGroupName("  Algorithms   Club  "), "Algorithms Club");
  assert.equal(normalizeGroupName("ab"), null);
  assert.equal(normalizeGroupName("x".repeat(61)), null);
});

test("creator owns a pending group and an approved second member activates it", async () => {
  const { service } = fixture();
  const group = await service.createGroup({ owner: { id: "member-owner", name: "Owner" }, name: "Algorithms Club" });
  assert.equal(group.status, "pending");
  assert.equal(group.role, "owner");
  assert.equal(group.memberCount, 1);

  const invite = await service.createInvitation({ groupId: group.id, ownerId: "member-owner" });
  const request = await service.requestJoin({ code: invite.code, user: { id: "member-two", name: "Second" } });
  assert.equal(request.status, "pending");
  const decision = await service.decideRequest({ groupId: group.id, ownerId: "member-owner", userId: "member-two", approve: true });
  assert.equal(decision.status, "approved");
  const detail = await service.groupDetail({ groupId: group.id, userId: "member-two" });
  assert.equal(detail.group.status, "active");
  assert.equal(detail.group.memberCount, 2);
  assert.equal(detail.members.length, 2);
});

test("invitation requests require owner approval and are isolated to their group", async () => {
  const { service } = fixture();
  const first = await service.createGroup({ owner: { id: "owner-a", name: "Owner A" }, name: "First Group" });
  const second = await service.createGroup({ owner: { id: "owner-b", name: "Owner B" }, name: "Second Group" });
  const invite = await service.createInvitation({ groupId: first.id, ownerId: "owner-a" });
  await service.requestJoin({ code: invite.code, user: { id: "student", name: "Student" } });
  await assert.rejects(() => service.decideRequest({ groupId: first.id, ownerId: "owner-b", userId: "student", approve: true }), { code: "GROUP_OWNER_REQUIRED" });
  await service.decideRequest({ groupId: first.id, ownerId: "owner-a", userId: "student", approve: true });
  await assert.rejects(() => service.groupDetail({ groupId: second.id, userId: "student" }), { code: "GROUP_MEMBERSHIP_REQUIRED" });
  assert.deepEqual((await service.listForUser("student")).map(group => group.id), [first.id]);
});

test("revoked invitations cannot create membership requests", async () => {
  const { service } = fixture();
  const group = await service.createGroup({ owner: { id: "owner", name: "Owner" }, name: "Safe Group" });
  const invite = await service.createInvitation({ groupId: group.id, ownerId: "owner" });
  await service.revokeInvitation({ groupId: group.id, ownerId: "owner", invitationId: invite.invitation.id });
  await assert.rejects(() => service.requestJoin({ code: invite.code, user: { id: "student", name: "Student" } }), { code: "INVALID_INVITATION" });
});

test("a full group rejects additional membership requests without changing existing members", async () => {
  const { service, store } = fixture();
  const group = await service.createGroup({ owner: { id: "owner", name: "Owner" }, name: "Capacity Group" });
  await store.groups.updateOne({ _id: group.id }, { $set: { maxMembers: 2 } });
  const invite = await service.createInvitation({ groupId: group.id, ownerId: "owner" });
  await service.requestJoin({ code: invite.code, user: { id: "second", name: "Second" } });
  await service.decideRequest({ groupId: group.id, ownerId: "owner", userId: "second", approve: true });
  await assert.rejects(() => service.requestJoin({ code: invite.code, user: { id: "third", name: "Third" } }), { code: "GROUP_FULL" });
  const detail = await service.groupDetail({ groupId: group.id, userId: "owner" });
  assert.equal(detail.members.length, 2);
});

test("legacy groups remain readable but cannot issue new invitations", async () => {
  const { service, store } = fixture();
  await store.groups.insertOne({ _id: "legacy-dsa-group", name: "Legacy DSA Group", ownerId: "legacy-owner", status: "active", memberCount: 8, maxMembers: 20, legacy: true });
  await store.members.insertOne({ groupId: "legacy-dsa-group", userId: "legacy-owner", displayName: "Legacy Owner", role: "owner", status: "approved" });
  const groups = await service.listForUser("legacy-owner");
  assert.equal(groups[0].legacy, true);
  await assert.rejects(() => service.createInvitation({ groupId: "legacy-dsa-group", ownerId: "legacy-owner" }), { code: "LEGACY_GROUP_READ_ONLY" });
});

test("1. Existing group owner cannot create another group", async () => {
  const { service } = fixture();
  await service.createGroup({ owner: { id: "owner-1", name: "Owner One" }, name: "Group One" });
  await assert.rejects(
    () => service.createGroup({ owner: { id: "owner-1", name: "Owner One" }, name: "Second Group" }),
    { code: "ALREADY_IN_GROUP" }
  );
});

test("2. Existing group owner cannot join another group", async () => {
  const { service } = fixture();
  await service.createGroup({ owner: { id: "owner-1", name: "Owner One" }, name: "Group One" });
  const group2 = await service.createGroup({ owner: { id: "owner-2", name: "Owner Two" }, name: "Group Two" });
  const invite = await service.createInvitation({ groupId: group2.id, ownerId: "owner-2" });
  await assert.rejects(
    () => service.requestJoin({ code: invite.code, user: { id: "owner-1", name: "Owner One" } }),
    { code: "ALREADY_IN_GROUP" }
  );
});

test("3. Existing ordinary member cannot create another group", async () => {
  const { service } = fixture();
  const group = await service.createGroup({ owner: { id: "owner-1", name: "Owner One" }, name: "Group One" });
  const invite = await service.createInvitation({ groupId: group.id, ownerId: "owner-1" });
  await service.requestJoin({ code: invite.code, user: { id: "member-2", name: "Member Two" } });
  await service.decideRequest({ groupId: group.id, ownerId: "owner-1", userId: "member-2", approve: true });
  await assert.rejects(
    () => service.createGroup({ owner: { id: "member-2", name: "Member Two" }, name: "Rogue Group" }),
    { code: "ALREADY_IN_GROUP" }
  );
});

test("4. Existing ordinary member cannot join another group", async () => {
  const { service } = fixture();
  const group1 = await service.createGroup({ owner: { id: "owner-1", name: "Owner One" }, name: "Group One" });
  const group2 = await service.createGroup({ owner: { id: "owner-2", name: "Owner Two" }, name: "Group Two" });
  const invite1 = await service.createInvitation({ groupId: group1.id, ownerId: "owner-1" });
  const invite2 = await service.createInvitation({ groupId: group2.id, ownerId: "owner-2" });
  await service.requestJoin({ code: invite1.code, user: { id: "student", name: "Student" } });
  await service.decideRequest({ groupId: group1.id, ownerId: "owner-1", userId: "student", approve: true });
  await assert.rejects(
    () => service.requestJoin({ code: invite2.code, user: { id: "student", name: "Student" } }),
    { code: "ALREADY_IN_GROUP" }
  );
});

test("5. New account can create a group", async () => {
  const { service } = fixture();
  const group = await service.createGroup({ owner: { id: "new-user", name: "New User" }, name: "New Coding Group" });
  assert.equal(group.status, "pending");
  assert.equal(group.role, "owner");
  assert.equal(group.memberCount, 1);
  const groups = await service.listForUser("new-user");
  assert.equal(groups.length, 1);
  assert.equal(groups[0].name, "New Coding Group");
});

test("6. New account can submit a valid invitation code", async () => {
  const { service } = fixture();
  const group = await service.createGroup({ owner: { id: "owner", name: "Owner" }, name: "Dev Team" });
  const invite = await service.createInvitation({ groupId: group.id, ownerId: "owner" });
  const result = await service.requestJoin({ code: invite.code, user: { id: "candidate", name: "Candidate" } });
  assert.equal(result.status, "pending");
  assert.equal(result.alreadyRequested, false);
});

test("7. Invalid invitation code is rejected", async () => {
  const { service } = fixture();
  await assert.rejects(
    () => service.requestJoin({ code: "invalid-code-12345", user: { id: "candidate", name: "Candidate" } }),
    { code: "INVALID_INVITATION" }
  );
});

test("8. Pending join request prevents conflicting onboarding", async () => {
  const { service } = fixture();
  const group1 = await service.createGroup({ owner: { id: "owner-1", name: "Owner 1" }, name: "Team Alpha" });
  const group2 = await service.createGroup({ owner: { id: "owner-2", name: "Owner 2" }, name: "Team Beta" });
  const invite1 = await service.createInvitation({ groupId: group1.id, ownerId: "owner-1" });
  const invite2 = await service.createInvitation({ groupId: group2.id, ownerId: "owner-2" });
  await service.requestJoin({ code: invite1.code, user: { id: "applicant", name: "Applicant" } });
  // Cannot join another group while request is pending
  await assert.rejects(
    () => service.requestJoin({ code: invite2.code, user: { id: "applicant", name: "Applicant" } }),
    { code: "PENDING_REQUEST_EXISTS" }
  );
  // Cannot create a group while request is pending
  await assert.rejects(
    () => service.createGroup({ owner: { id: "applicant", name: "Applicant" }, name: "Conflicting Group" }),
    { code: "PENDING_REQUEST_EXISTS" }
  );
});

test("9. Duplicate requests cannot create multiple memberships", async () => {
  const { service } = fixture();
  const group = await service.createGroup({ owner: { id: "owner", name: "Owner" }, name: "Team Solo" });
  const invite = await service.createInvitation({ groupId: group.id, ownerId: "owner" });
  const firstReq = await service.requestJoin({ code: invite.code, user: { id: "user-1", name: "User One" } });
  assert.equal(firstReq.alreadyRequested, false);
  const secondReq = await service.requestJoin({ code: invite.code, user: { id: "user-1", name: "User One" } });
  assert.equal(secondReq.alreadyRequested, true);
});

test("10. Concurrent create/join requests cannot assign multiple groups", async () => {
  const { service } = fixture();
  const group = await service.createGroup({ owner: { id: "owner", name: "Owner" }, name: "Group Concurrency" });
  const invite = await service.createInvitation({ groupId: group.id, ownerId: "owner" });
  const candidate = { id: "race-user", name: "Race User" };
  const results = await Promise.allSettled([
    service.createGroup({ owner: candidate, name: "Race Group" }),
    service.requestJoin({ code: invite.code, user: candidate })
  ]);
  const fulfilled = results.filter(r => r.status === "fulfilled");
  const rejected = results.filter(r => r.status === "rejected");
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.match(rejected[0].reason.code, /ALREADY_IN_GROUP|PENDING_REQUEST_EXISTS/);
});

test("11. Removed member can join or create another group", async () => {
  const { service } = fixture();
  const group1 = await service.createGroup({ owner: { id: "owner-1", name: "Owner One" }, name: "Group One" });
  const invite1 = await service.createInvitation({ groupId: group1.id, ownerId: "owner-1" });
  await service.requestJoin({ code: invite1.code, user: { id: "member-x", name: "Member X" } });
  await service.decideRequest({ groupId: group1.id, ownerId: "owner-1", userId: "member-x", approve: true });
  // Currently in group 1, cannot create
  await assert.rejects(
    () => service.createGroup({ owner: { id: "member-x", name: "Member X" }, name: "Group Three" }),
    { code: "ALREADY_IN_GROUP" }
  );
  // Owner removes member-x
  const removed = await service.removeMember({ groupId: group1.id, ownerId: "owner-1", userId: "member-x" });
  assert.equal(removed.status, "removed");
  // Now eligible to create a new group!
  const newGroup = await service.createGroup({ owner: { id: "member-x", name: "Member X" }, name: "Fresh Group" });
  assert.equal(newGroup.status, "pending");
  assert.equal(newGroup.role, "owner");
});

test("12. Legacy group members retain their existing membership", async () => {
  const { service, store } = fixture();
  await store.groups.insertOne({ _id: "legacy-dsa-group", name: "Legacy DSA Group", ownerId: "member_mvggb1nmx303va", status: "active", memberCount: 8, maxMembers: 20, legacy: true });
  await store.members.insertOne({ groupId: "legacy-dsa-group", userId: "member_mvggb1nmx303va", displayName: "Krish (ADMIN)", role: "owner", status: "approved" });
  await store.members.insertOne({ groupId: "legacy-dsa-group", userId: "member_mvggbpb5y8e3h9", displayName: "Kartik", role: "member", status: "approved" });

  const krishGroups = await service.listForUser("member_mvggb1nmx303va");
  assert.equal(krishGroups.length, 1);
  assert.equal(krishGroups[0].id, "legacy-dsa-group");
  assert.equal(krishGroups[0].role, "owner");
  assert.equal(krishGroups[0].legacy, true);

  const kartikGroups = await service.listForUser("member_mvggbpb5y8e3h9");
  assert.equal(kartikGroups.length, 1);
  assert.equal(kartikGroups[0].id, "legacy-dsa-group");
  assert.equal(kartikGroups[0].role, "member");
  assert.equal(kartikGroups[0].legacy, true);

  // Both are blocked from creating a new group
  await assert.rejects(
    () => service.createGroup({ owner: { id: "member_mvggb1nmx303va", name: "Krish" }, name: "Extra Group" }),
    { code: "ALREADY_IN_GROUP" }
  );
  await assert.rejects(
    () => service.createGroup({ owner: { id: "member_mvggbpb5y8e3h9", name: "Kartik" }, name: "Extra Group" }),
    { code: "ALREADY_IN_GROUP" }
  );
});

test("13. Frontend correctly displays existing membership rather than onboarding", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const script = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");

  // HTML has the designated forms container and pending request card
  assert.match(html, /id="groupManagementForms"/);
  assert.match(html, /id="groupPendingRequestCard"/);
  assert.match(html, /id="groupManagementSubtitle"/);
  assert.match(html, /Option 1: Create a Group/);
  assert.match(html, /Option 2: Join with Invitation Code/);

  // Script hides onboarding forms when user has a group
  assert.match(script, /const hasGroup = groups\.length > 0;/);
  assert.match(script, /if \(hasGroup\) \{[\s\S]*?if \(forms\) forms\.hidden = true;/);
  // Script hides forms when user has a pending request
  assert.match(script, /else if \(hasPending\) \{[\s\S]*?if \(forms\) forms\.hidden = true;/);
  // Script shows forms only when no group and no pending request
  assert.match(script, /if \(forms\) forms\.hidden = false;/);
  // Script only renders Generate Invitation Token for non-legacy owners, NOT ordinary members
  assert.match(script, /Generate Invitation Token/);
  assert.match(script, /Legacy group membership is synchronized with the community dashboard\./);
});
