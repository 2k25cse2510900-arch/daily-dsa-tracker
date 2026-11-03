"use strict";

const crypto = require("node:crypto");

const MIN_GROUP_MEMBERS = 2;
const MAX_GROUP_MEMBERS = 20;
const GROUP_NAME_MAX_LENGTH = 60;
const INVITATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function groupError(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function normalizeGroupName(value) {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 3 || name.length > GROUP_NAME_MAX_LENGTH) return null;
  return name;
}

function publicGroup(group, membership = null) {
  if (!group) return null;
  return {
    id: group._id,
    name: (typeof group.name === "string" && group.name.trim()) ? group.name.trim() : "Unnamed Group",
    status: group.status,
    ownerId: group.ownerId,
    memberCount: Number(group.memberCount) || 0,
    minMembers: MIN_GROUP_MEMBERS,
    maxMembers: Number(group.maxMembers) || MAX_GROUP_MEMBERS,
    legacy: Boolean(group.legacy),
    role: membership?.role || null,
    membershipStatus: membership?.status || null,
    active: group.status === "active"
  };
}

function createInvitationCode() {
  return crypto.randomBytes(24).toString("base64url");
}

function hashInvitationCode(code, secret) {
  if (typeof code !== "string" || !code || typeof secret !== "string" || !secret) return null;
  return crypto.createHmac("sha256", secret).update(code).digest("base64url");
}

function createGroupId() {
  return `group-${crypto.randomUUID()}`;
}

function createMongoGroupStore(db) {
  const groups = db.collection("groups");
  const members = db.collection("groupMembers");
  const invitations = db.collection("groupInvitations");
  const requests = db.collection("groupJoinRequests");
  const leetcodeProfiles = db.collection("leetcodeProfiles");
  return {
    groups, members, invitations, requests, leetcodeProfiles,
    async groupForId(groupId) { return groups.findOne({ _id: groupId }); },
    async membership(groupId, userId) { return members.findOne({ groupId, userId, status: "approved" }); },
    async membershipsForUser(userId) { return members.find({ userId, status: "approved" }).toArray(); },
    async activeMembershipForUser(userId) { return members.findOne({ userId, status: "approved" }); },
    async pendingRequestForUser(userId) { return requests.findOne({ userId, status: "pending" }); }
  };
}

function createGroupService({ store, invitationSecret, now = () => new Date(), newGroupId = createGroupId, newInvitationCode = createInvitationCode }) {
  if (!store || !invitationSecret) throw new TypeError("A group store and invitation secret are required.");

  async function assertOwner(groupId, userId) {
    const [group, membership] = await Promise.all([store.groupForId(groupId), store.membership(groupId, userId)]);
    if (!group) throw groupError("GROUP_NOT_FOUND", "Group not found.", 404);
    if (!membership || membership.role !== "owner") throw groupError("GROUP_OWNER_REQUIRED", "Group owner permission required.", 403);
    return group;
  }

  const userLocks = new Map();
  async function withUserLock(userId, fn) {
    if (!userId) return fn();
    while (userLocks.has(userId)) {
      await userLocks.get(userId);
    }
    let release;
    const promise = new Promise(resolve => { release = resolve; });
    userLocks.set(userId, promise);
    try {
      return await fn();
    } finally {
      userLocks.delete(userId);
      release();
    }
  }

  async function getActiveMembership(userId) {
    if (typeof store.activeMembershipForUser === "function") return store.activeMembershipForUser(userId);
    const rows = await store.membershipsForUser(userId);
    return rows[0] || null;
  }

  async function getPendingRequest(userId) {
    if (typeof store.pendingRequestForUser === "function") return store.pendingRequestForUser(userId);
    return store.requests?.findOne ? store.requests.findOne({ userId, status: "pending" }) : null;
  }

  return {
    async createGroup({ owner, name }) {
      return withUserLock(owner?.id, async () => {
        const normalizedName = normalizeGroupName(name);
        if (!owner?.id || !normalizedName) throw groupError("INVALID_GROUP", "Enter a group name between 3 and 60 characters.");
        
        const existingMembership = await getActiveMembership(owner.id);
        if (existingMembership) {
          throw groupError("ALREADY_IN_GROUP", "You already belong to a group. Accounts can only belong to one group at a time.", 409);
        }
        const existingPending = await getPendingRequest(owner.id);
        if (existingPending) {
          throw groupError("PENDING_REQUEST_EXISTS", "You have a pending group join request. Wait for it to be resolved before creating a group.", 409);
        }

        const group = {
          _id: newGroupId(), name: normalizedName, ownerId: owner.id, status: "pending",
          memberCount: 1, minMembers: MIN_GROUP_MEMBERS, maxMembers: MAX_GROUP_MEMBERS,
          legacy: false, createdAt: now(), updatedAt: now()
        };
        await store.groups.insertOne(group);
        try {
          await store.members.insertOne({ groupId: group._id, userId: owner.id, displayName: owner.name || "Member", role: "owner", status: "approved", joinedAt: now(), approvedAt: now() });
        } catch (error) {
          await store.groups.deleteOne({ _id: group._id });
          if (error?.code === 11000) {
            throw groupError("ALREADY_IN_GROUP", "You already belong to a group. Accounts can only belong to one group at a time.", 409);
          }
          throw error;
        }
        return publicGroup(group, { role: "owner", status: "approved" });
      });
    },

    async createInvitation({ groupId, ownerId }) {
      const group = await assertOwner(groupId, ownerId);
      if (group.legacy) throw groupError("LEGACY_GROUP_READ_ONLY", "Legacy group invitations are managed by the existing dashboard.", 409);
      const code = newInvitationCode();
      const createdAt = now();
      const invitation = { _id: `invite-${crypto.randomUUID()}`, groupId, codeHash: hashInvitationCode(code, invitationSecret), status: "active", createdBy: ownerId, createdAt, expiresAt: new Date(createdAt.getTime() + INVITATION_TTL_MS) };
      await store.invitations.insertOne(invitation);
      return { invitation: { id: invitation._id, groupId, status: invitation.status, expiresAt: invitation.expiresAt }, code };
    },

    async requestJoin({ code, user }) {
      return withUserLock(user?.id, async () => {
        const codeHash = hashInvitationCode(typeof code === "string" ? code.trim() : "", invitationSecret);
        if (!codeHash || !user?.id) throw groupError("INVALID_INVITATION", "Enter a valid invitation code.");

        const existingMembership = await getActiveMembership(user.id);
        if (existingMembership) {
          throw groupError("ALREADY_IN_GROUP", "You already belong to a group. Accounts can only belong to one group at a time.", 409);
        }

        const invitation = await store.invitations.findOne({ codeHash, status: "active", expiresAt: { $gt: now() } });
        if (!invitation) throw groupError("INVALID_INVITATION", "That invitation is invalid, revoked, or expired.", 404);
        const [group, existingPending] = await Promise.all([
          store.groupForId(invitation.groupId),
          getPendingRequest(user.id)
        ]);
        if (!group || group.legacy) throw groupError("GROUP_UNAVAILABLE", "This group is unavailable.", 409);
        if (existingPending) {
          if (existingPending.groupId === invitation.groupId) {
            return { group: publicGroup(group), status: "pending", alreadyRequested: true };
          }
          throw groupError("PENDING_REQUEST_EXISTS", "You already have a pending join request for another group. Accounts can only have one pending request at a time.", 409);
        }
        if ((Number(group.memberCount) || 0) >= (Number(group.maxMembers) || MAX_GROUP_MEMBERS)) throw groupError("GROUP_FULL", "This group has reached its member limit.", 409);
        try {
          await store.requests.insertOne({ _id: `join-${crypto.randomUUID()}`, groupId: group._id, userId: user.id, displayName: user.name || "Member", status: "pending", invitationId: invitation._id, requestedAt: now() });
        } catch (error) {
          if (error?.code === 11000) {
            const req = await getPendingRequest(user.id);
            if (req && req.groupId === group._id) return { group: publicGroup(group), status: "pending", alreadyRequested: true };
            throw groupError("PENDING_REQUEST_EXISTS", "You already have a pending join request for another group.", 409);
          }
          throw error;
        }
        return { group: publicGroup(group), status: "pending", alreadyRequested: false };
      });
    },

    async decideRequest({ groupId, ownerId, userId, approve }) {
      return withUserLock(userId, async () => {
        const group = await assertOwner(groupId, ownerId);
        const request = await store.requests.findOne({ groupId, userId, status: "pending" });
        if (!request) throw groupError("REQUEST_NOT_FOUND", "Pending membership request not found.", 404);
        if (!approve) {
          await store.requests.updateOne({ _id: request._id, status: "pending" }, { $set: { status: "rejected", reviewedBy: ownerId, reviewedAt: now() } });
          return { status: "rejected" };
        }
        if (group.legacy) throw groupError("LEGACY_GROUP_READ_ONLY", "Legacy group membership remains managed by the existing dashboard.", 409);

        const existingMembership = await getActiveMembership(userId);
        if (existingMembership) {
          if (existingMembership.groupId === groupId) {
            await store.requests.updateOne({ _id: request._id, status: "pending" }, { $set: { status: "approved", reviewedBy: ownerId, reviewedAt: now() } });
            return { status: "approved", alreadyMember: true };
          }
          await store.requests.updateOne({ _id: request._id, status: "pending" }, { $set: { status: "rejected", rejectReason: "already_in_another_group", reviewedBy: ownerId, reviewedAt: now() } });
          throw groupError("ALREADY_IN_ANOTHER_GROUP", "This user is already a member of another group.", 409);
        }

        try {
          await store.members.insertOne({ groupId, userId, displayName: request.displayName || "Member", role: "member", status: "approved", joinedAt: now(), approvedAt: now() });
        } catch (error) {
          if (error?.code === 11000) {
            const m = await store.membership(groupId, userId);
            if (m) {
              await store.requests.updateOne({ _id: request._id, status: "pending" }, { $set: { status: "approved", reviewedBy: ownerId, reviewedAt: now() } });
              return { status: "approved", alreadyMember: true };
            }
            await store.requests.updateOne({ _id: request._id, status: "pending" }, { $set: { status: "rejected", rejectReason: "already_in_another_group", reviewedBy: ownerId, reviewedAt: now() } });
            throw groupError("ALREADY_IN_ANOTHER_GROUP", "This user is already a member of another group.", 409);
          }
          throw error;
        }
        const updated = await store.groups.updateOne({ _id: groupId, memberCount: { $lt: Number(group.maxMembers) || MAX_GROUP_MEMBERS } }, { $inc: { memberCount: 1 }, $set: { status: "active", updatedAt: now() } });
        if (!updated.matchedCount) {
          await store.members.deleteOne({ groupId, userId, role: "member" });
          throw groupError("GROUP_FULL", "This group has reached its member limit.", 409);
        }
        await store.requests.updateOne({ _id: request._id, status: "pending" }, { $set: { status: "approved", reviewedBy: ownerId, reviewedAt: now() } });
        return { status: "approved", active: true };
      });
    },

    async revokeInvitation({ groupId, ownerId, invitationId }) {
      await assertOwner(groupId, ownerId);
      const result = await store.invitations.updateOne({ _id: invitationId, groupId, status: "active" }, { $set: { status: "revoked", revokedAt: now(), revokedBy: ownerId } });
      if (!result.matchedCount) throw groupError("INVITATION_NOT_FOUND", "Active invitation not found.", 404);
      return { status: "revoked" };
    },

    async removeMember({ groupId, ownerId, userId }) {
      const group = await store.groupForId(groupId);
      if (!group) throw groupError("GROUP_NOT_FOUND", "Group not found.", 404);
      if (group.legacy) throw groupError("LEGACY_GROUP_READ_ONLY", "Legacy group membership is managed by the administrator.", 409);
      if (ownerId !== userId) {
        await assertOwner(groupId, ownerId);
      }
      if (group.ownerId === userId) throw groupError("CANNOT_REMOVE_OWNER", "Group owners cannot remove themselves from their group.", 400);
      const membership = await store.membership(groupId, userId);
      if (!membership) throw groupError("MEMBER_NOT_FOUND", "Member not found in this group.", 404);
      await store.members.deleteOne({ groupId, userId });
      const current = await store.members.find({ groupId, status: "approved" }).toArray();
      const count = current.length;
      await store.groups.updateOne({ _id: groupId }, { $set: { memberCount: count, status: count >= MIN_GROUP_MEMBERS ? "active" : "pending", updatedAt: now() } });
      return { status: "removed", userId, groupId };
    },

    async listForUser(userId) {
      const memberships = await store.membershipsForUser(userId);
      if (!memberships.length) return [];
      // Prioritize legacy group if user belongs to it
      memberships.sort((a, b) => {
        if (a.groupId === "legacy-dsa-group") return -1;
        if (b.groupId === "legacy-dsa-group") return 1;
        return (new Date(a.joinedAt || 0)) - (new Date(b.joinedAt || 0));
      });
      const list = [];
      for (const m of memberships) {
        const group = await store.groupForId(m.groupId);
        if (group) {
          list.push(publicGroup(group, m));
        }
      }
      return list;
    },

    async pendingRequestForUser(userId) {
      const req = await getPendingRequest(userId);
      if (!req) return null;
      const group = await store.groupForId(req.groupId);
      return {
        id: req._id,
        groupId: req.groupId,
        groupName: group?.name || "Learning Group",
        requestedAt: req.requestedAt,
        status: req.status
      };
    },

    async groupDetail({ groupId, userId }) {
      const membership = await store.membership(groupId, userId);
      if (!membership) throw groupError("GROUP_MEMBERSHIP_REQUIRED", "Group membership required.", 403);
      const group = await store.groupForId(groupId);
      if (!group) throw groupError("GROUP_NOT_FOUND", "Group not found.", 404);
      const members = await store.members.find({ groupId, status: "approved" }).sort({ joinedAt: 1 }).toArray();
      const detail = { group: publicGroup(group, membership), members: members.map(member => ({ userId: member.userId, displayName: member.displayName, role: member.role, joinedAt: member.joinedAt })) };
      if (membership.role === "owner") {
        const [requests, invitations] = await Promise.all([
          store.requests.find({ groupId, status: "pending" }).sort({ requestedAt: 1 }).toArray(),
          store.invitations.find({ groupId, status: "active" }).sort({ createdAt: -1 }).toArray()
        ]);
        detail.pendingRequests = requests.map(request => ({ userId: request.userId, displayName: request.displayName, requestedAt: request.requestedAt }));
        detail.invitations = invitations.map(invitation => ({ id: invitation._id, status: invitation.status, expiresAt: invitation.expiresAt }));
      }
      return detail;
    },

    async groupMembersDetail({ groupId, userId }) {
      const membership = await store.membership(groupId, userId);
      if (!membership) throw groupError("GROUP_MEMBERSHIP_REQUIRED", "Group membership required.", 403);
      const group = await store.groupForId(groupId);
      if (!group) throw groupError("GROUP_NOT_FOUND", "Group not found.", 404);
      const members = await store.members.find({ groupId, status: "approved" }).sort({ joinedAt: 1 }).toArray();
      const userIds = members.map(m => m.userId);

      const leetcode = {};
      if (store.leetcodeProfiles) {
        try {
          const profiles = await store.leetcodeProfiles.find({ _id: { $in: userIds } }).toArray();
          for (const p of profiles) {
            if (p.username) {
              leetcode[p._id] = {
                username: p.username,
                profileUrl: `https://leetcode.com/u/${encodeURIComponent(p.username)}/`,
                stats: p.stats || null
              };
            }
          }
        } catch {
          for (const uid of userIds) {
            try {
              const p = await store.leetcodeProfiles.findOne({ _id: uid });
              if (p?.username) {
                leetcode[uid] = {
                  username: p.username,
                  profileUrl: `https://leetcode.com/u/${encodeURIComponent(p.username)}/`,
                  stats: p.stats || null
                };
              }
            } catch {}
          }
        }
      }

      const pageMembers = members.map(m => ({
        id: m.userId,
        name: m.displayName,
        role: m.role === "owner" ? "Leader" : "Member",
        rawRole: m.role,
        joinedAt: m.joinedAt
      }));

      return {
        groupId: group._id,
        groupName: (typeof group.name === "string" && group.name.trim()) ? group.name.trim() : "Unnamed Group",
        legacy: Boolean(group.legacy),
        role: membership.role,
        members: pageMembers,
        leetcode
      };
    },

    async setActiveGroup({ groupId, userId }) {
      const membership = await store.membership(groupId, userId);
      if (!membership) throw groupError("GROUP_MEMBERSHIP_REQUIRED", "Group membership required.", 403);
      return publicGroup(await store.groupForId(groupId), membership);
    }
  };
}

module.exports = { MIN_GROUP_MEMBERS, MAX_GROUP_MEMBERS, GROUP_NAME_MAX_LENGTH, normalizeGroupName, publicGroup, createInvitationCode, hashInvitationCode, createMongoGroupStore, createGroupService, groupError };
