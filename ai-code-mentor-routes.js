"use strict";
const express = require("express");
function createAiCodeMentorRouter({ memberOnly, serviceFor, reviewRateLimit, audit = () => {} }) {
  const router = express.Router(); router.use(memberOnly);
  const sendError = (res, error) => res.status(error?.status || 503).json({ error: error?.message || "AI Code Mentor is temporarily unavailable.", ...(error?.code ? { code: error.code } : {}) });
  router.post("/reviews", reviewRateLimit, async (req, res) => { try { const review = await serviceFor().createReview(req.member, req.body); audit(req, "ai-code-mentor-review-created", review.id); res.status(201).json({ review }); } catch (error) { sendError(res, error); } });
  router.get("/reviews", async (req, res) => { try { res.json({ reviews: await serviceFor().listReviews(req.member, { limit: req.query.limit }) }); } catch (error) { sendError(res, error); } });
  router.get("/reviews/:reviewId", async (req, res) => { try { res.json({ review: await serviceFor().reviewFor(req.member, req.params.reviewId) }); } catch (error) { sendError(res, error); } });
  router.delete("/reviews/:reviewId", async (req, res) => { try { const result = await serviceFor().deleteReview(req.member, req.params.reviewId); audit(req, "ai-code-mentor-review-deleted", req.params.reviewId); res.json(result); } catch (error) { sendError(res, error); } });
  return router;
}
module.exports = { createAiCodeMentorRouter };
