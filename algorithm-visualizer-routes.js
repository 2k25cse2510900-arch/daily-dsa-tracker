"use strict";

const express = require("express");

function createAlgorithmVisualizerRouter({
  memberOnly,
  serviceFor,
  analysisRateLimit = (_req, _res, next) => next(),
  audit = () => {}
}) {
  const router = express.Router();

  const sendError = (res, error) =>
    res.status(error?.status || 500).json({
      error: error?.message || "Algorithm Visualizer encountered an error.",
      ...(error?.code ? { code: error.code } : {})
    });

  // Public / Member: List registered algorithms
  router.get("/algorithms", async (req, res) => {
    try {
      const category = req.query.category || null;
      const algorithms = await serviceFor().listAlgorithms(category);
      res.json({ success: true, count: algorithms.length, algorithms });
    } catch (error) {
      sendError(res, error);
    }
  });

  // Public / Member: Get algorithm detail and default steps
  router.get("/algorithms/:algorithmId", async (req, res) => {
    try {
      const algorithm = await serviceFor().getAlgorithm(req.params.algorithmId);
      res.json({ success: true, algorithm });
    } catch (error) {
      sendError(res, error);
    }
  });

  // Generate steps for custom inputs
  router.post("/generate", async (req, res) => {
    try {
      const result = await serviceFor().generateCustomSteps({
        algorithmId: req.body?.algorithmId,
        customInput: req.body?.customInput || req.body?.input || {}
      });
      res.json({ success: true, ...result });
    } catch (error) {
      sendError(res, error);
    }
  });

  // Compare two algorithms
  router.post("/compare", async (req, res) => {
    try {
      const result = await serviceFor().compareTwoAlgorithms({
        algorithm1Id: req.body?.algorithm1Id || req.body?.algo1Id || req.body?.algo1,
        algorithm2Id: req.body?.algorithm2Id || req.body?.algo2Id || req.body?.algo2
      });
      res.json({ success: true, comparison: result });
    } catch (error) {
      sendError(res, error);
    }
  });

  // Dry run trace
  router.post("/dry-run", async (req, res) => {
    try {
      const result = await serviceFor().getDryRun({
        algorithmId: req.body?.algorithmId,
        customInput: req.body?.customInput || req.body?.input || {}
      });
      res.json({ success: true, dryRun: result });
    } catch (error) {
      sendError(res, error);
    }
  });

  // AI-powered code analysis and validated step generation (Rate limited & Member only)
  router.post("/analyze-code", memberOnly, analysisRateLimit, async (req, res) => {
    try {
      const user = req.member || req.user;
      const result = await serviceFor().analyzeAndVisualizeCode({
        user,
        userId: user?.id,
        code: req.body?.code,
        language: req.body?.language || "javascript",
        problemStatement: req.body?.problemStatement || req.body?.problemContext || "",
        customInput: req.body?.customInput || null
      });
      audit(req, "algorithm-visualizer-code-analyzed", result.detectedAlgorithm);
      res.json({ success: true, ...result });
    } catch (error) {
      sendError(res, error);
    }
  });

  // History endpoints (Member only)
  router.get("/history", memberOnly, async (req, res) => {
    try {
      const user = req.member || req.user;
      const history = await serviceFor().listUserHistory(user, req.query.limit);
      res.json({ success: true, count: history.length, history });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/history", memberOnly, async (req, res) => {
    try {
      const user = req.member || req.user;
      const result = await serviceFor().saveVisualizationHistory(user, req.body || {});
      res.json({ success: true, ...result });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.delete("/history/:id", memberOnly, async (req, res) => {
    try {
      const user = req.member || req.user;
      const result = await serviceFor().deleteUserHistory(user, req.params.id);
      res.json({ success: true, ...result });
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;
}

module.exports = {
  createAlgorithmVisualizerRouter
};
