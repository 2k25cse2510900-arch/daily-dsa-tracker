"use strict";

const { MIN_GROUP_MEMBERS, MAX_GROUP_MEMBERS } = require("./groups");
const { normalizeMemberEmail } = require("./member-allowlist");

const LEGACY_GROUP_ID = "legacy-dsa-group";

// This migration is intentionally additive. It mirrors the existing shared
// dashboard membership without changing member IDs, tracker data, or auth links.
async function ensureLegacyGroup(db, now = new Date()) {
  const dashboard = await db.collection("dashboard").findOne({ _id: "shared" }, { projection: { members: 1 } });
  const members = Array.isArray(dashboard?.members) ? dashboard.members : [];
  if (!members.length) return null;
  const admin = await db.collection("admins").findOne({ _id: "primary" }, { projection: { email: 1 } });
  const owner = members.find(member => normalizeMemberEmail(member.email) === normalizeMemberEmail(admin?.email)) || members[0];
  const status = members.length >= MIN_GROUP_MEMBERS ? "active" : "pending";
  await db.collection("groups").updateOne({ _id: LEGACY_GROUP_ID }, {
    $set: { name: "Legacy DSA Group", ownerId: owner.id, status, memberCount: members.length, minMembers: MIN_GROUP_MEMBERS, maxMembers: MAX_GROUP_MEMBERS, legacy: true, updatedAt: now },
    $setOnInsert: { createdAt: now }
  }, { upsert: true });
  for (const member of members) {
    await db.collection("groupMembers").updateOne({ groupId: LEGACY_GROUP_ID, userId: member.id }, {
      $setOnInsert: { groupId: LEGACY_GROUP_ID, userId: member.id, displayName: member.name, role: member.id === owner.id ? "owner" : "member", status: "approved", joinedAt: now, approvedAt: now, legacy: true }
    }, { upsert: true });
  }
  return LEGACY_GROUP_ID;
}

module.exports = { LEGACY_GROUP_ID, ensureLegacyGroup };
