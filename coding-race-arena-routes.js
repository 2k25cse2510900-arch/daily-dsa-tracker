"use strict";

const express = require("express");

function createCodingRaceArenaRouter({
  memberOnly,
  serviceFor,
  audit = () => {}
}) {
  const router = express.Router();

  const getService = () => (typeof serviceFor === "function" ? serviceFor() : serviceFor);

  const sendError = (res, error) =>
    res.status(error?.status || 500).json({
      error: error?.message || "Race Arena encountered an error.",
      ...(error?.code ? { code: error.code } : {})
    });

  function resolveUser(req) {
    if (req.session?.role === "admin") {
      return {
        id: req.session.memberId || "admin",
        role: "admin",
        name: "Administrator"
      };
    }
    return req.member || req.user || null;
  }

  // 1. Discover / List Races
  router.get("/", async (req, res) => {
    try {
      const user = resolveUser(req);
      const result = await getService().listRaces(user, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      sendError(res, error);
    }
  });

  // 2. Personal Race Stats & Achievements
  router.get("/user/stats", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const stats = await getService().getUserRaceStats(user);
      res.json({ success: true, stats });
    } catch (error) {
      sendError(res, error);
    }
  });

  // 3. Create Race
  router.post("/", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const race = await getService().createRace(user, req.body);
      audit(req, "coding-race-created", race._id);
      res.status(201).json({ success: true, race });
    } catch (error) {
      sendError(res, error);
    }
  });

  // 4. Get Single Race State & Problems
  router.get("/:raceId", async (req, res) => {
    try {
      const user = resolveUser(req);
      const race = await getService().getRace(user, req.params.raceId);
      res.json({ success: true, race });
    } catch (error) {
      sendError(res, error);
    }
  });

  // 5. Join Race
  router.post("/:raceId/join", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const result = await getService().joinRace(user, req.params.raceId, req.body);
      audit(req, "coding-race-joined", req.params.raceId);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  // 6. Leave Race
  router.post("/:raceId/leave", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const result = await getService().leaveRace(user, req.params.raceId);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  // 7. Toggle Ready Status
  router.post("/:raceId/ready", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const result = await getService().toggleReady(user, req.params.raceId, req.body.isReady);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  // 8. Host Starts Race
  router.post("/:raceId/start", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const result = await getService().startRace(user, req.params.raceId);
      audit(req, "coding-race-started", req.params.raceId);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  // 9. Host / Admin Cancels Race
  router.post("/:raceId/cancel", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const result = await getService().cancelRace(user, req.params.raceId, req.body.reason);
      audit(req, "coding-race-cancelled", req.params.raceId);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  // 10. Run Sample Test Cases
  router.post("/:raceId/run-test", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const result = await getService().runSampleTest(user, req.params.raceId, req.body);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  // 11. Official Code Submission for Scoring
  router.post("/:raceId/submit", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const result = await getService().submitSolution(user, req.params.raceId, req.body);
      audit(req, "coding-race-submission", req.params.raceId);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  // 12. Live Leaderboard
  router.get("/:raceId/leaderboard", async (req, res) => {
    try {
      const user = resolveUser(req);
      const result = await getService().getLeaderboard(user, req.params.raceId);
      res.json({ success: true, ...result });
    } catch (error) {
      sendError(res, error);
    }
  });

  // 13. Complete Race
  router.post("/:raceId/complete", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const result = await getService().completeRace(user, req.params.raceId);
      audit(req, "coding-race-completed", req.params.raceId);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  // 14. Real-time Server-Sent Events Stream (SSE)
  router.get("/:raceId/events", (req, res) => {
    const raceId = req.params.raceId;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    });

    res.write(`event: connected\ndata: ${JSON.stringify({ raceId, connected: true })}\n\n`);

    const service = getService();
    if (service && service.sseSubscribers) {
      if (!service.sseSubscribers.has(raceId)) {
        service.sseSubscribers.set(raceId, new Set());
      }
      service.sseSubscribers.get(raceId).add(res);

      req.on("close", () => {
        const subs = service.sseSubscribers.get(raceId);
        if (subs) {
          subs.delete(res);
          if (subs.size === 0) service.sseSubscribers.delete(raceId);
        }
      });
    }
  });

  // 15. AI Race Coach Performance Analysis
  router.post("/:raceId/coach-analysis", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const analysis = await getService().generateAiCoachAnalysis(user, req.params.raceId);
      res.json(analysis);
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;
}

module.exports = {
  createCodingRaceArenaRouter
};
