"use strict";

const express = require("express");
const { validActivityDate } = require("./daily-workspace");

function createDailyWorkspaceRouter({ memberOnly, serviceFor, manualSyncLimit, audit = () => {} }) {
  const router = express.Router();
  router.use(["/leetcode", "/daily-workspace"], memberOnly);
  const sendError = (res, error) => res.status(error?.status || 503).json({ error: error?.message || "Daily workspace is temporarily unavailable.", ...(error?.code ? { code: error.code } : {}) });

  router.get("/leetcode/connection", async (req, res) => {
    try { res.json({ connection: await serviceFor().connectionFor(req.member) }); }
    catch (error) { sendError(res, error); }
  });
  router.post("/leetcode/connection", manualSyncLimit, async (req, res) => {
    try {
      const service = serviceFor();
      const connection = await service.connect({ user: req.member, username: req.body?.username });
      audit(req, "leetcode-connection-updated", req.member.id);
      res.status(201).json({ connection, ...(await service.sync(req.member)) });
    } catch (error) { sendError(res, error); }
  });
  router.delete("/leetcode/connection", async (req, res) => {
    try { res.json(await serviceFor().disconnect(req.member)); audit(req, "leetcode-connection-disconnected", req.member.id); }
    catch (error) { sendError(res, error); }
  });

  router.get("/daily-workspace/current", async (req, res) => {
    try { res.json(await serviceFor().workspaceFor(req.member, serviceFor().currentActivityDate())); }
    catch (error) { sendError(res, error); }
  });
  router.get("/daily-workspace/:activityDate", async (req, res) => {
    if (!validActivityDate(req.params.activityDate)) return res.status(400).json({ error: "Choose a valid activity date." });
    try { res.json(await serviceFor().workspaceFor(req.member, req.params.activityDate)); }
    catch (error) { sendError(res, error); }
  });
  router.post("/daily-workspace/sync", manualSyncLimit, async (req, res) => {
    try { res.json(await serviceFor().sync(req.member)); }
    catch (error) { sendError(res, error); }
  });
  router.get("/daily-workspace/submissions/:submissionId", async (req, res) => {
    try { res.json({ submission: await serviceFor().submissionFor(req.member, req.params.submissionId) }); }
    catch (error) { sendError(res, error); }
  });
  return router;
}

module.exports = { createDailyWorkspaceRouter };
