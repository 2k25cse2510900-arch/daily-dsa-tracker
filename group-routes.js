"use strict";

const express = require("express");
const { createMongoGroupStore, createGroupService } = require("./groups");
const { ensureLegacyGroup } = require("./group-migration");

function validGroupId(value) {
  return typeof value === "string" && /^(?:legacy-dsa-group|group-[0-9a-f-]{36})$/.test(value);
}

function createGroupRouter({ getDb, memberOnly, invitationSecret, audit = () => {} }) {
  const router = express.Router();
  router.use(memberOnly);
  router.use(async (_req, res, next) => {
    try {
      await ensureLegacyGroup(getDb());
      next();
    } catch {
      res.status(503).json({ error: "Group data is temporarily unavailable." });
    }
  });

  const serviceFor = () => createGroupService({ store: createMongoGroupStore(getDb()), invitationSecret });
  const sendError = (res, error) => res.status(error?.status || 503).json({ error: error?.message || "Group request could not be completed.", ...(error?.code ? { code: error.code } : {}) });
  const userFor = req => ({ id: req.member.id, name: req.member.name });

  router.get("/", async (req, res) => {
    try {
      const groups = await serviceFor().listForUser(req.member.id);
      const pendingRequest = groups.length === 0 ? await serviceFor().pendingRequestForUser(req.member.id) : null;
      if (req.session.activeGroupId && !groups.some(g => g.id === req.session.activeGroupId)) {
        req.session.activeGroupId = null;
      }
      const activeGroupId = req.session.activeGroupId || groups[0]?.id || null;
      req.session.activeGroupId = activeGroupId;
      res.json({ groups, activeGroupId, pendingRequest });
    } catch (error) { sendError(res, error); }
  });

  router.post("/", async (req, res) => {
    try {
      const group = await serviceFor().createGroup({ owner: userFor(req), name: req.body?.name });
      req.session.activeGroupId = group.id;
      audit(req, "group-created", group.id);
      res.status(201).json({ group });
    } catch (error) { sendError(res, error); }
  });

  router.post("/join-requests", async (req, res) => {
    try {
      const result = await serviceFor().requestJoin({ code: req.body?.code, user: userFor(req) });
      audit(req, "group-join-requested", result.group.id);
      res.status(result.alreadyRequested ? 200 : 201).json(result);
    } catch (error) { sendError(res, error); }
  });

  router.post("/active", async (req, res) => {
    const groupId = req.body?.groupId;
    if (!validGroupId(groupId)) return res.status(400).json({ error: "Choose a valid group." });
    try {
      const group = await serviceFor().setActiveGroup({ groupId, userId: req.member.id });
      req.session.activeGroupId = groupId;
      res.json({ group });
    } catch (error) { sendError(res, error); }
  });

  router.get("/:groupId", async (req, res) => {
    if (!validGroupId(req.params.groupId)) return res.status(404).json({ error: "Group not found." });
    try { res.json(await serviceFor().groupDetail({ groupId: req.params.groupId, userId: req.member.id })); }
    catch (error) { sendError(res, error); }
  });

  router.get("/:groupId/members", async (req, res) => {
    if (!validGroupId(req.params.groupId)) return res.status(404).json({ error: "Group not found." });
    try {
      const data = await serviceFor().groupMembersDetail({ groupId: req.params.groupId, userId: req.member.id });
      res.json(data);
    } catch (error) { sendError(res, error); }
  });

  router.post("/:groupId/invitations", async (req, res) => {
    if (!validGroupId(req.params.groupId)) return res.status(404).json({ error: "Group not found." });
    try {
      const result = await serviceFor().createInvitation({ groupId: req.params.groupId, ownerId: req.member.id });
      audit(req, "group-invitation-created", req.params.groupId);
      res.status(201).json(result);
    } catch (error) { sendError(res, error); }
  });

  router.delete("/:groupId/invitations/:invitationId", async (req, res) => {
    if (!validGroupId(req.params.groupId) || !/^invite-[0-9a-f-]{36}$/.test(req.params.invitationId)) return res.status(404).json({ error: "Invitation not found." });
    try {
      res.json(await serviceFor().revokeInvitation({ groupId: req.params.groupId, ownerId: req.member.id, invitationId: req.params.invitationId }));
      audit(req, "group-invitation-revoked", req.params.groupId);
    } catch (error) { sendError(res, error); }
  });

  router.delete("/:groupId/members/:userId", async (req, res) => {
    if (!validGroupId(req.params.groupId) || !/^[\w-]{1,100}$/.test(req.params.userId)) return res.status(400).json({ error: "Invalid member." });
    try {
      const result = await serviceFor().removeMember({ groupId: req.params.groupId, ownerId: req.member.id, userId: req.params.userId });
      audit(req, "group-member-removed", `${req.params.groupId}:${req.params.userId}`);
      res.json(result);
    } catch (error) { sendError(res, error); }
  });

  router.post("/:groupId/requests/:userId/:decision", async (req, res) => {
    if (!validGroupId(req.params.groupId) || !/^[\w-]{1,100}$/.test(req.params.userId) || !["approve", "reject"].includes(req.params.decision)) return res.status(400).json({ error: "Invalid membership decision." });
    try {
      const result = await serviceFor().decideRequest({ groupId: req.params.groupId, ownerId: req.member.id, userId: req.params.userId, approve: req.params.decision === "approve" });
      audit(req, `group-member-${req.params.decision}d`, `${req.params.groupId}:${req.params.userId}`);
      res.json(result);
    } catch (error) { sendError(res, error); }
  });

  return router;
}

module.exports = { createGroupRouter, validGroupId };
