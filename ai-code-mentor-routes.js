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

  router.post("/submissions/auto-sync", async (req, res) => {
    try {
      const result = await serviceFor().autoSyncSubmission(req.member, req.body);
      audit(req, "ai-code-mentor-auto-sync", result.submissionId);
      res.status(201).json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/submissions/import-source", async (req, res) => {
    try {
      const result = await serviceFor().autoSyncSubmission(req.member, req.body);
      audit(req, "ai-code-mentor-import-source", result.submissionId);
      res.status(201).json(result);
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

  router.post("/solutions", async (req, res) => {
    try {
      const result = await serviceFor().generateSolutions(req.member, req.body);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/execute", reviewRateLimit, async (req, res) => {
    try {
      const result = await serviceFor().executeCode(req.member, req.body);
      audit(req, "ai-code-mentor-executed", result.executionId);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/verify-solutions", reviewRateLimit, async (req, res) => {
    try {
      const result = await serviceFor().verifySolutions(req.member, req.body);
      audit(req, "ai-code-mentor-solutions-verified", req.body?.problemSlug || "unknown");
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get("/executions/:executionId", async (req, res) => {
    try {
      const result = await serviceFor().getExecution(req.member, req.params.executionId);
      res.json({ execution: result });
    } catch (error) {
      sendError(res, error);
    }
  });

  // Module 6: Personalized Learning & Adaptive DSA Coach Endpoints
  router.get("/learning/profile", async (req, res) => {
    try {
      const profile = await serviceFor().getLearningProfile(req.member);
      res.json(profile);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get("/learning/mastery", async (req, res) => {
    try {
      const mastery = await serviceFor().getConceptMastery(req.member);
      res.json(mastery);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get("/learning/recommendations", async (req, res) => {
    try {
      const recommendations = await serviceFor().getAdaptiveRecommendations(req.member);
      res.json(recommendations);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get("/learning/path", async (req, res) => {
    try {
      const profile = await serviceFor().getLearningProfile(req.member);
      res.json({ learningPath: profile.learningPath, overview: profile.overview });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get("/learning/revision", async (req, res) => {
    try {
      const schedule = await serviceFor().getRevisionSchedule(req.member);
      res.json(schedule);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/learning/revision/complete", async (req, res) => {
    try {
      const result = await serviceFor().completeRevision(req.member, req.body);
      audit(req, "ai-code-mentor-revision-complete", req.body?.conceptId);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/learning/tutor-lesson", reviewRateLimit, async (req, res) => {
    try {
      const lesson = await serviceFor().generateTutorLesson(req.member, req.body);
      audit(req, "ai-code-mentor-tutor-lesson", req.body?.conceptId || req.body?.type);
      res.json(lesson);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/learning/assess", reviewRateLimit, async (req, res) => {
    try {
      const lesson = await serviceFor().generateTutorLesson(req.member, req.body);
      res.json(lesson);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/learning/refresh", async (req, res) => {
    try {
      const profile = await serviceFor().getLearningProfile(req.member);
      res.json(profile);
    } catch (error) {
      sendError(res, error);
    }
  });

  // Module 7: AI Mock Interview & Assessment Engine Endpoints
  router.post("/interviews", async (req, res) => {
    try {
      const session = await serviceFor().createInterview(req.member, req.body);
      audit(req, "ai-code-mentor-interview-created", session.sessionId);
      res.status(201).json(session);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get("/interviews", async (req, res) => {
    try {
      const sessions = await serviceFor().listInterviews(req.member, { limit: req.query.limit });
      res.json({ sessions });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get("/interviews/:sessionId", async (req, res) => {
    try {
      const session = await serviceFor().getInterview(req.member, req.params.sessionId);
      res.json(session);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/interviews/:sessionId/start", async (req, res) => {
    try {
      const session = await serviceFor().startInterview(req.member, req.params.sessionId);
      res.json(session);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/interviews/:sessionId/respond", reviewRateLimit, async (req, res) => {
    try {
      const result = await serviceFor().respondToInterview(req.member, req.params.sessionId, req.body);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/interviews/:sessionId/hint", reviewRateLimit, async (req, res) => {
    try {
      const result = await serviceFor().requestInterviewSessionHint(req.member, req.params.sessionId, req.body);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/interviews/:sessionId/run", reviewRateLimit, async (req, res) => {
    try {
      const result = await serviceFor().runInterviewExecution(req.member, req.params.sessionId, req.body);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/interviews/:sessionId/submit", reviewRateLimit, async (req, res) => {
    try {
      const result = await serviceFor().submitInterview(req.member, req.params.sessionId, req.body);
      audit(req, "ai-code-mentor-interview-submitted", req.params.sessionId);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get("/interviews/:sessionId/report", async (req, res) => {
    try {
      const report = await serviceFor().getInterviewReport(req.member, req.params.sessionId);
      res.json({ report });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/interviews/:sessionId/cancel", async (req, res) => {
    try {
      const result = await serviceFor().cancelInterview(req.member, req.params.sessionId);
      audit(req, "ai-code-mentor-interview-cancelled", req.params.sessionId);
      res.json(result);
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
