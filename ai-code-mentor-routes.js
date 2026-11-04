"use strict";
const express = require("express");
const { resolveMentorEntitlement } = require("./ai-code-mentor");
const { checkProviderStatus } = require("./ai-code-mentor-provider");

function createAiCodeMentorRouter({ memberOnly, serviceFor, reviewRateLimit, audit = () => {} }) {
  const router = express.Router();
  router.use(memberOnly);

  const sendError = (res, error) =>
    res.status(error?.status || 503).json({
      error: error?.message || "AI Code Mentor is temporarily unavailable.",
      ...(error?.code ? { code: error.code } : {})
    });

  router.get("/entitlement", (req, res) => {
    res.json({ entitlement: resolveMentorEntitlement(req.member) });
  });

  router.get("/config", (_req, res) => {
    const status = checkProviderStatus(process.env);
    res.json({
      configured: status.gemini.configured || status.openai.configured,
      activeProvider: status.activeProvider,
      model: status.activeProvider === "openai" ? status.openai.model : status.gemini.model,
      providers: status
    });
  });

  router.get("/provider-status", (_req, res) => {
    res.json(checkProviderStatus(process.env));
  });

  router.get("/source", async (req, res) => {
    try {
      const source = await serviceFor().getUserSource(req.member, {
        submissionId: req.query.submissionId,
        problemSlug: req.query.problemSlug,
        problemTitle: req.query.problemTitle
      });
      res.json(source);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/source", async (req, res) => {
    try {
      const result = await serviceFor().saveUserSource(req.member, req.body);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.delete("/source", async (req, res) => {
    try {
      const result = await serviceFor().deleteUserSource(req.member, {
        submissionId: req.query.submissionId || req.body?.submissionId,
        problemSlug: req.query.problemSlug || req.body?.problemSlug
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get("/sources/status", async (req, res) => {
    try {
      const problemSlugs = typeof req.query.problemSlugs === "string" ? req.query.problemSlugs.split(",") : [];
      const submissionIds = typeof req.query.submissionIds === "string" ? req.query.submissionIds.split(",") : [];
      const result = await serviceFor().listUserSources(req.member, { problemSlugs, submissionIds });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/optimal-solution", async (req, res) => {
    try {
      const solution = await serviceFor().getOptimalSolution(req.body);
      res.json({ solution });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/reviews", reviewRateLimit, async (req, res) => {
    try {
      const review = await serviceFor().createReview(req.member, req.body);
      audit(req, "ai-code-mentor-review-created", review.id);
      res.status(201).json({ review });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get("/reviews", async (req, res) => {
    try {
      res.json({ reviews: await serviceFor().listReviews(req.member, { limit: req.query.limit }) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get("/reviews/:reviewId", async (req, res) => {
    try {
      res.json({ review: await serviceFor().reviewFor(req.member, req.params.reviewId) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.delete("/reviews/:reviewId", async (req, res) => {
    try {
      const result = await serviceFor().deleteReview(req.member, req.params.reviewId);
      audit(req, "ai-code-mentor-review-deleted", req.params.reviewId);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;
}

module.exports = { createAiCodeMentorRouter };
