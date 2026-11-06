"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { validateRequest, instructionsFor } = require("../ai-code-mentor");
const { resolveProblemIdentity } = require("../leetcode-problem-intelligence");

test("Phase 1 & 2: validateRequest accepts standalone code without submissionId or problem title", () => {
  const result = validateRequest({
    sourceCode: "def add(a, b):\n    return a + b\n",
    language: "python3",
    mode: "explain"
  });

  assert.equal(result.problemTitle, "Custom Code Review");
  assert.equal(result.problemSlug, null);
  assert.equal(result.problemNumber, null);
  assert.equal(result.submissionId, null);
  assert.equal(result.language, "python3");
});

test("Phase 1 & 2: validateRequest retains optional custom problem title, url, description, and verdict", () => {
  const result = validateRequest({
    sourceCode: "function solve() { return 42; }",
    language: "javascript",
    mode: "explain",
    problemTitle: "Custom Dynamic Algorithm",
    problemUrl: "https://example.com/problems/custom-alg",
    problemDescription: "Given an array, return 42.",
    verdict: "Wrong Answer"
  });

  assert.equal(result.problemTitle, "Custom Dynamic Algorithm");
  assert.equal(result.problemUrl, "https://example.com/problems/custom-alg");
  assert.equal(result.problemDescription, "Given an array, return 42.");
  assert.equal(result.verdict, "Wrong Answer");
});

test("Phase 1 & 2: instructionsFor injects GENERAL CODE REVIEW DIRECTIVE when no problem statement is provided", () => {
  const problem = resolveProblemIdentity({
    problemTitle: "Custom Code Review"
  });

  const prompt = instructionsFor("explain", problem, "python3", "Accepted");
  assert.match(prompt, /GENERAL CODE REVIEW DIRECTIVE/);
  assert.match(prompt, /No external problem statement was provided with this code submission/);
  assert.match(prompt, /Never invent a problem statement or pretend to know an unstated target output/);
  assert.match(prompt, /General Code Review: No external problem statement was provided/);
});

test("Phase 1 & 2: instructionsFor does NOT inject GENERAL CODE REVIEW DIRECTIVE when problem context is provided", () => {
  const problem = resolveProblemIdentity({
    problemSlug: "two-sum"
  });

  const prompt = instructionsFor("explain", problem, "python3", "Accepted");
  assert.doesNotMatch(prompt, /GENERAL CODE REVIEW DIRECTIVE/);
});

test("Phase 1 & 2: resolveProblemIdentity does not fabricate fake leetcode URLs for custom reviews", () => {
  const problem = resolveProblemIdentity({
    problemTitle: "Custom Code Review"
  });

  assert.equal(problem.url, null);
  assert.notEqual(problem.confidence, "ambiguous");
});

test("Phase 1 & 2: Frontend HTML and public HTML contain sidebar and member navigation for AI Mentor", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const pubHtml = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");

  assert.match(html, /id="navAiMentorBtn"/);
  assert.match(html, /data-target="aimentor"/);
  assert.match(html, /id="memberMentorNav"/);
  assert.match(html, /id="mentorProblemTitleInput"/);
  assert.match(html, /id="mentorVerdictSelect"/);
  assert.match(html, /id="mentorProblemUrlInput"/);
  assert.match(html, /id="mentorProblemDescInput"/);
  assert.match(html, /id="mentorClearContextBtn"/);

  assert.equal(html, pubHtml, "index.html and public/index.html must match byte-for-byte");
});

test("Phase 1 & 2: script.js and public script.js route aimentor page to standalone workspace", () => {
  const js = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  const pubJs = fs.readFileSync(path.join(__dirname, "../public/script.js"), "utf8");

  assert.match(js, /aimentor:\s*\{\s*title:\s*"AI Code Mentor"/);
  assert.match(js, /if\s*\(page\s*===\s*"aimentor"\)\s*\{\s*openAiCodeMentorWorkspace\(\{\s*isStandalone:\s*true\s*\}\)/);
  assert.match(js, /mentorClearContextBtn/);
  assert.match(js, /mentorProblemTitleInput/);

  assert.equal(js, pubJs, "script.js and public/script.js must match byte-for-byte");
});
