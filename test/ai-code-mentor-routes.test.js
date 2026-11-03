"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { createAiCodeMentorRouter } = require("../ai-code-mentor-routes");

function listen(app) { return new Promise(resolve => { const server = app.listen(0, "127.0.0.1", () => resolve(server)); }); }
function close(server) { return new Promise(resolve => server.close(resolve)); }

test("AI mentor routes require membership and delegate only authenticated ownership", async () => {
  const calls = [];
  const service = {
    async createReview(user, body) { calls.push(["create", user.id, body]); return { id: "review:one" }; },
    async listReviews(user) { calls.push(["list", user.id]); return []; },
    async reviewFor(user, id) { calls.push(["get", user.id, id]); return { id }; },
    async deleteReview(user, id) { calls.push(["delete", user.id, id]); return { deleted: true }; }
  };
  const app = express(); app.use(express.json());
  app.use("/api/ai-code-mentor", createAiCodeMentorRouter({ memberOnly: (req, _res, next) => { req.member = { id: "member-a" }; next(); }, serviceFor: () => service, reviewRateLimit: (_req, _res, next) => next() }));
  const server = await listen(app); const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(`${base}/api/ai-code-mentor/reviews`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceCode: "x" }) })).status, 201);
    assert.equal((await fetch(`${base}/api/ai-code-mentor/reviews`)).status, 200);
    assert.equal((await fetch(`${base}/api/ai-code-mentor/reviews/review:one`)).status, 200);
    assert.equal((await fetch(`${base}/api/ai-code-mentor/reviews/review:one`, { method: "DELETE" })).status, 200);
    assert.deepEqual(calls.map(call => call.slice(0, 2)), [["create", "member-a"], ["list", "member-a"], ["get", "member-a"], ["delete", "member-a"]]);
  } finally { await close(server); }
});

test("AI mentor route converts service failures to safe API errors", async () => {
  const app = express(); app.use(express.json());
  app.use("/api/ai-code-mentor", createAiCodeMentorRouter({ memberOnly: (req, _res, next) => { req.member = { id: "member-a" }; next(); }, serviceFor: () => ({ async createReview() { const error = new Error("Daily quota reached"); error.code = "AI_QUOTA_EXCEEDED"; error.status = 429; throw error; } }), reviewRateLimit: (_req, _res, next) => next() }));
  const server = await listen(app);
  try { const response = await fetch(`http://127.0.0.1:${server.address().port}/api/ai-code-mentor/reviews`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }); assert.equal(response.status, 429); assert.equal((await response.json()).code, "AI_QUOTA_EXCEEDED"); }
  finally { await close(server); }
});
