"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validateRequest,
  instructionsFor
} = require("../ai-code-mentor");

const {
  CANONICAL_PROBLEMS,
  retrieveProblem,
  buildGeminiPromptContext
} = require("../problem-intelligence-engine");

const {
  createLocalKnowledgeProvider,
  createGeminiMentorProvider,
  createUnifiedMentorProvider
} = require("../ai-code-mentor-provider");

test("ai-code-mentor validation: empty, null, or omitted problemDescription does NOT throw INVALID_DESCRIPTION", () => {
  const basePayload = {
    sourceCode: "class Solution { public boolean isSubsequence(String s, String t) { return true; } }",
    language: "java",
    mode: "explain",
    problemTitle: "Is Subsequence",
    problemSlug: "is-subsequence",
    problemNumber: 392
  };

  // Case 1: problemDescription is omitted
  assert.doesNotThrow(() => {
    const validated = validateRequest({ ...basePayload });
    assert.equal(validated.problemDescription, null);
  });

  // Case 2: problemDescription is null
  assert.doesNotThrow(() => {
    const validated = validateRequest({ ...basePayload, problemDescription: null });
    assert.equal(validated.problemDescription, null);
  });

  // Case 3: problemDescription is empty string
  assert.doesNotThrow(() => {
    const validated = validateRequest({ ...basePayload, problemDescription: "" });
    assert.equal(validated.problemDescription, null);
  });

  // Case 4: problemDescription is whitespace only
  assert.doesNotThrow(() => {
    const validated = validateRequest({ ...basePayload, problemDescription: "   \n\t  " });
    assert.equal(validated.problemDescription, null);
  });

  // Case 5: problemDescription is valid non-empty text
  assert.doesNotThrow(() => {
    const validated = validateRequest({
      ...basePayload,
      problemDescription: "Given two strings s and t, return true if s is a subsequence of t."
    });
    assert.equal(validated.problemDescription, "Given two strings s and t, return true if s is a subsequence of t.");
  });

  // Case 6: non-string problemDescription throws INVALID_DESCRIPTION
  assert.throws(
    () => validateRequest({ ...basePayload, problemDescription: 12345 }),
    (err) => err.code === "INVALID_DESCRIPTION" && /Problem description is invalid/i.test(err.message)
  );
});

test("LeetCode #392 Is Subsequence: authoritative canonical grounding and linear complexity fidelity", () => {
  const problem = retrieveProblem({ problemSlug: "is-subsequence" });
  assert.ok(problem, "Problem #392 must be resolvable from canonical engine");
  assert.equal(problem.number, 392);
  assert.equal(problem.title, "Is Subsequence");
  assert.equal(problem.timeComplexity, "O(|s| + |t|)");
  assert.equal(problem.spaceComplexity, "O(1)");
  assert.equal(problem.auxiliarySpace, "O(1)");
  assert.equal(problem.optimalTime, "O(|s| + |t|)");
  assert.equal(problem.optimalSpace, "O(1)");

  // Time explanation explicitly explains linear progression of non-reset inner pointer
  assert.match(problem.timeExplain, /index is never reset/i);
  assert.match(problem.timeExplain, /\|s\| \+ \|t\|/i);

  // Brute force is genuine exponential subsequence generation, not broken indexOf
  assert.equal(problem.bruteForceTime, "O(2^|t|)");
  assert.match(problem.bruteForceExplain, /2\^\|t\||subsequences/i);
  assert.doesNotMatch(problem.bruteForceExplain, /broken|indexOf/i);

  // Edge cases must be domain-bound strings, not array numbers
  assert.ok(Array.isArray(problem.edgeCases) && problem.edgeCases.length >= 4);
  for (const ec of problem.edgeCases) {
    assert.match(ec.input, /s\s*=|t\s*=/);
    assert.doesNotMatch(ec.input, /nums\s*=|\[-5/);
  }
});

test("LeetCode #443 String Compression: in-place O(n) time, O(1) auxiliary space and char array edge cases", () => {
  const problem = retrieveProblem({ problemSlug: "string-compression" });
  assert.ok(problem);
  assert.equal(problem.number, 443);
  assert.equal(problem.timeComplexity, "O(n)");
  assert.equal(problem.auxiliarySpace, "O(1)");
  assert.equal(problem.optimalTime, "O(n)");
  assert.equal(problem.optimalSpace, "O(1)");

  // Edge cases test char array behaviors
  assert.ok(Array.isArray(problem.edgeCases) && problem.edgeCases.length >= 3);
  const inputs = problem.edgeCases.map(e => e.input).join(" ");
  assert.match(inputs, /chars/);
});

test("LeetCode #1679 Max Number of K-Sum Pairs: O(n) frequency map or O(n log n) two-pointer bounds", () => {
  const problem = retrieveProblem({ problemSlug: "max-number-of-k-sum-pairs" });
  assert.ok(problem);
  assert.equal(problem.number, 1679);
  assert.equal(problem.timeComplexity, "O(n)");
  assert.equal(problem.optimalTime, "O(n)");
  assert.equal(problem.optimalSpace, "O(n)");

  // Edge cases test pairs and frequencies
  assert.ok(Array.isArray(problem.edgeCases) && problem.edgeCases.length >= 3);
  const inputs = problem.edgeCases.map(e => e.input).join(" ");
  assert.match(inputs, /nums.*k/);
});

test("AI instructions include complexity & algorithmic fidelity directives", () => {
  const problem = retrieveProblem({ problemSlug: "is-subsequence" });
  const instructions = instructionsFor("explain", problem, "java", "Accepted");

  assert.match(instructions, /COMPLEXITY & ALGORITHMIC FIDELITY DIRECTIVES/);
  assert.match(instructions, /DO NOT automatically assume nested loops imply quadratic O\(N²\) time/);
  assert.match(instructions, /never reset between outer iterations/);
  assert.match(instructions, /Do NOT fabricate an asymptotic speedup claim/);
  assert.match(instructions, /Derive edge cases directly from the actual problem input types/);
});

test("Prompt context builder encodes monotonic pointer and edge case directives", () => {
  const problem = retrieveProblem({ problemSlug: "is-subsequence" });
  const promptContext = buildGeminiPromptContext(problem, "java");

  assert.match(promptContext, /ALGORITHMIC & COMPLEXITY FIDELITY/);
  assert.match(promptContext, /Carefully trace loop variable advancement/);
  assert.match(promptContext, /O\(\|s\| \+ \|t\|\) or O\(n\)/);
  assert.match(promptContext, /Never output unrelated array examples for string problems/);
});

test("Local Knowledge Provider returns grounded canonical curriculum analysis with O(|s| + |t|) complexity", async () => {
  const localProvider = createLocalKnowledgeProvider({ knowledgeBase: CANONICAL_PROBLEMS });
  
  const result = await localProvider.analyze({
    input: "class Solution { public boolean isSubsequence(String s, String t) { ... } }",
    problemSlug: "is-subsequence",
    language: "java"
  });

  assert.equal(result.provider, "local");
  assert.equal(result.analysis.problemTitle, "Is Subsequence");
  assert.equal(result.analysis.studentComplexity.timeComplexity, "O(|s| + |t|)");
  assert.equal(result.analysis.studentComplexity.spaceComplexity, "O(1)");
  assert.equal(result.analysis.optimalComplexity.timeComplexity, "O(|s| + |t|)");
  assert.equal(result.analysis.optimalComplexity.spaceComplexity, "O(1)");
  assert.equal(result.analysis.bruteForce.timeComplexity, "O(2^|t|)");

  // 3-approach comparison table
  assert.ok(Array.isArray(result.analysis.comparison));
  assert.equal(result.analysis.comparison.length, 3);
  assert.equal(result.analysis.comparison[0].approach, "Brute Force");
  assert.equal(result.analysis.comparison[1].approach, "Student Solution");
  assert.equal(result.analysis.comparison[2].approach, "Two Pointers Greedy Match");

  // String-specific edge cases
  assert.ok(Array.isArray(result.analysis.edgeCases));
  assert.ok(result.analysis.edgeCases.length >= 4);
  assert.match(result.analysis.edgeCases[0].input, /s\s*=|t\s*=/);
});

test("Unified Provider selects Gemini when configured, and falls back to Local with accurate attribution", async () => {
  // Scenario 1: Gemini succeeds
  const mockGeminiClient = {
    models: {
      generateContent: async () => ({
        text: JSON.stringify({
          problemTitle: "Is Subsequence",
          language: "java",
          studentApproach: "Two-pointer forward traversal scanning t monotonically.",
          correctnessStatus: "Accepted",
          mistakeDiagnosis: { hasMistake: false, mistakeType: "None", explanation: "Correct logic.", counterExample: null, suggestedFix: null },
          studentComplexity: {
            timeComplexity: "O(|s| + |t|)",
            spaceComplexity: "O(1)",
            explanation: "Inner pointer never resets; scans t at most once."
          },
          bruteForce: {
            title: "Exhaustive Subsequence Generation",
            algorithm: "Generates all 2^|t| subsequences.",
            timeComplexity: "O(2^|t|)",
            spaceComplexity: "O(|t|)",
            whySuboptimal: "Exponential complexity."
          },
          optimalApproach: {
            title: "Two Pointers Greedy Match",
            algorithm: "Advance match pointer.",
            whyItWorks: "Greedy choice property holds.",
            keyInvariants: "Relative order is preserved."
          },
          optimalCode: "class Solution { ... }",
          optimalComplexity: {
            timeComplexity: "O(|s| + |t|)",
            spaceComplexity: "O(1)",
            auxiliarySpace: "O(1)",
            totalSpace: "O(|s| + |t|)",
            explanation: "Linear single-pass traversal."
          },
          comparison: [
            { approach: "Brute Force", timeComplexity: "O(2^|t|)", spaceComplexity: "O(|t|)", verdict: "Valid baseline" },
            { approach: "Student Solution", timeComplexity: "O(|s| + |t|)", spaceComplexity: "O(1)", verdict: "Accepted logic" },
            { approach: "Two Pointers Greedy Match", timeComplexity: "O(|s| + |t|)", spaceComplexity: "O(1)", verdict: "Optimal template" }
          ],
          summary: "Student solution is optimal O(|s| + |t|) two-pointer scan.",
          problemUnderstanding: {
            whatItAsks: "Check if s is subsequence of t.",
            inputOutput: "s: string, t: string -> boolean",
            constraints: "0 <= s.length <= 100, 0 <= t.length <= 10^4",
            keyObservation: "Monotonic inner pointer ensures linear execution."
          },
          edgeCases: [
            { caseName: "Empty s", input: "s=\"\", t=\"abc\"", expected: "true", explanation: "Empty string matches.", handledBy: "count == 0" }
          ],
          sections: [
            { id: "overview", title: "Overview", content: "Valid linear implementation." }
          ],
          unavailableSections: []
        })
      })
    }
  };

  const unifiedGemini = createUnifiedMentorProvider({
    env: { GEMINI_API_KEY: "test-key-123", AI_MENTOR_PROVIDER: "gemini" },
    geminiClient: mockGeminiClient
  });

  const geminiResult = await unifiedGemini.analyze({
    input: "class Solution { ... }",
    problemSlug: "is-subsequence",
    language: "java"
  });

  assert.equal(geminiResult.provider, "gemini");
  assert.equal(geminiResult.model, "gemini-3.1-flash-lite");
  assert.equal(geminiResult.analysis.studentComplexity.timeComplexity, "O(|s| + |t|)");

  // Scenario 2: Gemini fails -> falls back to local knowledge provider
  const failingGeminiClient = {
    models: {
      generateContent: async () => {
        throw new Error("HTTP 503 Service Unavailable");
      }
    }
  };

  const fallbackUnified = createUnifiedMentorProvider({
    env: { GEMINI_API_KEY: "test-key-123", AI_MENTOR_PROVIDER: "gemini", AI_MENTOR_MAX_RETRIES: "0" },
    geminiClient: failingGeminiClient
  });

  const fallbackResult = await fallbackUnified.analyze({
    input: "class Solution { ... }",
    problemSlug: "is-subsequence",
    language: "java"
  });

  assert.equal(fallbackResult.provider, "local");
  assert.equal(fallbackResult.model, "local-curriculum-v1");
  assert.equal(fallbackResult.analysis.problemTitle, "Is Subsequence");
  assert.equal(fallbackResult.analysis.studentComplexity.timeComplexity, "O(|s| + |t|)");
  assert.equal(fallbackResult.analysis.optimalComplexity.timeComplexity, "O(|s| + |t|)");
});
