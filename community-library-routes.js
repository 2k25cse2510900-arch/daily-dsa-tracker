"use strict";

const express = require("express");

function createCommunityLibraryRouter({
  memberOnly,
  serviceFor,
  aiRateLimit = (_req, _res, next) => next(),
  audit = () => {}
}) {
  const router = express.Router();

  const sendError = (res, error) =>
    res.status(error?.status || 500).json({
      error: error?.message || "Community Library encountered an error.",
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

  const requireAdmin = (req, res, next) => {
    if (req.session?.role === "admin") return next();
    return res.status(403).json({ error: "Administrator permission required." });
  };

  // 1. List / Search Resources (Public / Member)
  router.get("/resources", async (req, res) => {
    try {
      const user = resolveUser(req);
      const result = await serviceFor().listResources(user, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      sendError(res, error);
    }
  });

  // 2. Get Single Resource Detail
  router.get("/resources/:id", async (req, res) => {
    try {
      const user = resolveUser(req);
      const resource = await serviceFor().getResource(user, req.params.id);
      res.json({ success: true, resource });
    } catch (error) {
      sendError(res, error);
    }
  });

  // 3. Create Resource
  router.post("/resources", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const resource = await serviceFor().createResource(user, req.body);
      audit(req, "community-library-resource-created", resource._id);
      res.status(201).json({ success: true, resource });
    } catch (error) {
      sendError(res, error);
    }
  });

  // 4. Update Resource
  router.patch("/resources/:id", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const resource = await serviceFor().updateResource(user, req.params.id, req.body);
      audit(req, "community-library-resource-updated", req.params.id);
      res.json({ success: true, resource });
    } catch (error) {
      sendError(res, error);
    }
  });

  // 5. Delete Resource
  router.delete("/resources/:id", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const result = await serviceFor().deleteResource(user, req.params.id);
      audit(req, "community-library-resource-deleted", req.params.id);
      res.json({ success: true, ...result });
    } catch (error) {
      sendError(res, error);
    }
  });

  // 6. Publish Draft
  router.post("/resources/:id/publish", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const resource = await serviceFor().publishResource(user, req.params.id);
      res.json({ success: true, resource });
    } catch (error) {
      sendError(res, error);
    }
  });

  // 7. Archive Resource
  router.post("/resources/:id/archive", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const resource = await serviceFor().archiveResource(user, req.params.id);
      res.json({ success: true, resource });
    } catch (error) {
      sendError(res, error);
    }
  });

  // 8. Bookmarks
  router.get("/bookmarks", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const result = await serviceFor().listBookmarks(user, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/resources/:id/bookmark", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const result = await serviceFor().toggleBookmark(user, req.params.id, req.body?.collectionId);
      res.json({ success: true, ...result });
    } catch (error) {
      sendError(res, error);
    }
  });

  // 9. Collections
  router.get("/collections", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const collections = await serviceFor().listCollections(user);
      res.json({ success: true, collections });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/collections", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const collection = await serviceFor().createCollection(user, req.body);
      res.status(201).json({ success: true, collection });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.delete("/collections/:id", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const result = await serviceFor().deleteCollection(user, req.params.id);
      res.json({ success: true, ...result });
    } catch (error) {
      sendError(res, error);
    }
  });

  // 10. Reactions (Helpful)
  router.post("/resources/:id/reactions", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const result = await serviceFor().toggleReaction(user, req.params.id, req.body?.type || "helpful");
      res.json({ success: true, ...result });
    } catch (error) {
      sendError(res, error);
    }
  });

  // 11. Suggestions
  router.post("/resources/:id/suggestions", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const suggestion = await serviceFor().submitSuggestion(user, req.params.id, req.body);
      res.status(201).json({ success: true, suggestion });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get("/resources/:id/suggestions", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const suggestions = await serviceFor().listSuggestions(user, req.params.id);
      res.json({ success: true, suggestions });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get("/suggestions", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const suggestions = await serviceFor().listSuggestions(user, null);
      res.json({ success: true, suggestions });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/suggestions/:id/review", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const result = await serviceFor().reviewSuggestion(user, req.params.id, req.body);
      res.json({ success: true, ...result });
    } catch (error) {
      sendError(res, error);
    }
  });

  // 12. Reports & Moderation
  router.post("/resources/:id/report", memberOnly, async (req, res) => {
    try {
      const user = resolveUser(req);
      const result = await serviceFor().submitReport(user, req.params.id, req.body);
      res.status(201).json({ success: true, ...result });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get("/moderation/reports", requireAdmin, async (req, res) => {
    try {
      const user = resolveUser(req);
      const reports = await serviceFor().listReports(user, req.query?.status || null);
      res.json({ success: true, reports });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/moderation/reports/:id/resolve", requireAdmin, async (req, res) => {
    try {
      const user = resolveUser(req);
      const result = await serviceFor().resolveReport(user, req.params.id, req.body);
      audit(req, "community-library-report-resolved", req.params.id);
      res.json({ success: true, ...result });
    } catch (error) {
      sendError(res, error);
    }
  });

  // 13. AI Educational Assistance
  router.post("/ai/summarize", memberOnly, aiRateLimit, async (req, res) => {
    try {
      const user = resolveUser(req);
      const result = await serviceFor().summarizeResource(user, req.body?.resourceId);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/ai/explain", memberOnly, aiRateLimit, async (req, res) => {
    try {
      const user = resolveUser(req);
      const result = await serviceFor().explainConcept(user, req.body?.resourceId, req.body?.level);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/ai/revision-points", memberOnly, aiRateLimit, async (req, res) => {
    try {
      const user = resolveUser(req);
      const result = await serviceFor().generateRevisionPoints(user, req.body?.resourceId);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/ai/improve-draft", memberOnly, aiRateLimit, async (req, res) => {
    try {
      const user = resolveUser(req);
      const result = await serviceFor().improveDraftClarity(user, req.body);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;
}

module.exports = {
  createCommunityLibraryRouter
};
