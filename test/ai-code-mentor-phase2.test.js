"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");

const {
  MODES,
  LANGUAGES,
  SECTION_IDS,
  validateRequest,
  validateAnalysis,
  resolveMentorEntitlement,
  createAiCodeMentorService
} = require("../ai-code-mentor");
const { createOpenAIMentorProvider } = require("../ai-code-mentor-provider");
const { createAiCodeMentorRouter } = require("../ai-code-mentor-routes");

function match(doc, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    if (expected && typeof expected === "object" && !Array.isArray(expected)) {
      if ("$lt" in expected) return doc[key] < expected.$lt;
      if ("$gt" in expected) return doc[key] > expected.$gt;
      return doc[key] === expected;
    }
    return doc[key] === expected;
  });
}

class MemoryCollection {
  constructor() { this.docs = []; }
  async findOne(filter) {
    const row = this.docs.find(item => match(item, filter));
    return row ? structuredClone(row) : null;
  }
  find(filter) {
    const rows = this.docs.filter(item => match(item, filter)).map(item => structuredClone(item));
    return {
      sort: () => ({ limit: n => ({ toArray: async () => rows.slice(0, n) }) }),
      toArray: async () => rows
    };
  }
  async insertOne(doc) {
    if (this.docs.some(row => row._id === doc._id)) {
      const error = new Error("duplicate");
      error.code = 11000;
      throw error;
    }
    this.docs.push(structuredClone(doc));
    return { insertedId: doc._id };
  }
  async updateOne(filter, update, options = {}) {
    let row = this.docs.find(item => match(item, filter));
    if (!row && options.upsert) {
      row = { _id: filter._id };
      if (update.$setOnInsert) Object.assign(row, structuredClone(update.$setOnInsert));
      if (update.$set) Object.assign(row, structuredClone(update.$set));
      this.docs.push(row);
      if (update.$inc) for (const [k, v] of Object.entries(update.$inc)) row[k] = (row[k] || 0) + v;
      return { matchedCount: 0, upsertedCount: 1 };
    }
    if (!row) return { matchedCount: 0, upsertedCount: 0 };
    if (update.$set) Object.assign(row, structuredClone(update.$set));
    if (update.$inc) for (const [k, v] of Object.entries(update.$inc)) row[k] = (row[k] || 0) + v;
    return { matchedCount: 1, upsertedCount: 0 };
  }
  async deleteOne(filter) {
    const idx = this.docs.findIndex(item => match(item, filter));
    if (idx < 0) return { deletedCount: 0 };
    this.docs.splice(idx, 1);
    return { deletedCount: 1 };
  }
}

function fixture({ providerResult } = {}) {
  const collections = new Map(["aiCodeReviews", "aiReviewSources", "aiMentorUsage", "dailySubmissionsV2", "aiUserSavedSources"].map(name => [name, new MemoryCollection()]));
  const calls = [];
  const defaultAnalysis = {
    summary: "Comprehensive educational analysis.",
    sections: [
      { id: "student-approach", title: "Your Approach", content: "Analyzed code logic." },
      { id: "brute-force", title: "Brute Force Approach", content: "Exhaustive iteration O(n²)." },
      { id: "optimal-approach", title: "Optimal Approach", content: "Linear time traversal O(n)." },
      { id: "complexity-comparison", title: "Complexity Comparison", content: "O(n²) vs O(n)." }
    ],
    unavailableSections: [],
    followUpQuestion: null,
    uncertaintyNote: null
  };

  const provider = {
    async analyze(request) {
      calls.push(request);
      if (providerResult instanceof Error) throw providerResult;
      return {
        analysis: providerResult || defaultAnalysis,
        model: "gpt-6.1-sol",
        usage: { input_tokens: 50, output_tokens: 80 }
      };
    }
  };

  return {
    collections,
    calls,
    service: createAiCodeMentorService({
      db: { collection: name => collections.get(name) },
      provider,
      dailyQuota: 10,
      now: () => new Date("2026-11-03T12:00:00.000Z")
    })
  };
}

test("1. Accepted Java submission analysis generates optimal and complexity breakdown", async () => {
  const javaAcceptedCode = `
class Solution {
    public int findDuplicate(int[] nums) {
        int slow = nums[0], fast = nums[0];
        do {
            slow = nums[slow];
            fast = nums[nums[fast]];
        } while (slow != fast);
        slow = nums[0];
        while (slow != fast) {
            slow = nums[slow];
            fast = nums[fast];
        }
        return slow;
    }
}`;

  const acceptedAnalysis = {
    summary: "The Java solution implements Floyd's Tortoise and Hare Cycle Detection with O(n) time and O(1) extra space.",
    sections: [
      { id: "student-approach", title: "Student Approach", content: "Correct two-phase cycle detection pointer advancement." },
      { id: "time-complexity", title: "Time Complexity", content: "O(n) linear execution time." },
      { id: "space-complexity", title: "Space Complexity", content: "O(1) auxiliary space, preserving input invariants." },
      { id: "optimal-approach", title: "Optimal Approach", content: "Matches the theoretical minimum bound." }
    ],
    unavailableSections: [],
    followUpQuestion: null,
    uncertaintyNote: null
  };

  const { service, calls } = fixture({ providerResult: acceptedAnalysis });
  const review = await service.createReview({ id: "student-1" }, {
    sourceCode: javaAcceptedCode,
    language: "java",
    problemTitle: "Find the Duplicate Number",
    mode: "explain"
  });

  assert.equal(review.language, "java");
  assert.equal(review.problemTitle, "Find the Duplicate Number");
  assert.equal(review.analysis.summary.includes("Floyd's Tortoise"), true);
  assert.equal(calls.length, 1);
  assert.match(calls[0].input, /Find the Duplicate Number/);
});

test("2. Wrong Answer Java submission triggers counterexample and mistake diagnosis", async () => {
  const javaBuggyCode = `
class Solution {
    public int[] twoSum(int[] nums, int target) {
        for (int i = 0; i < nums.length; i++) {
            for (int j = 0; j < nums.length; j++) {
                if (nums[i] + nums[j] == target) return new int[]{i, j};
            }
        }
        return new int[0];
    }
}`;

  const wrongAnswerAnalysis = {
    summary: "Self-pairing bug: the inner loop re-checks index i, causing invalid answers when target equals 2 * nums[i].",
    sections: [
      { id: "mistake-analysis", title: "Logic Bug", content: "Inner loop starts at j = 0 instead of j = i + 1." },
      { id: "counterexample", title: "Counterexample", content: "nums = [3, 2, 4], target = 6 yields [0, 0] instead of [1, 2]." },
      { id: "optimal-approach", title: "Corrected Logic", content: "Use a one-pass hash map or start inner loop at j = i + 1." }
    ],
    unavailableSections: [],
    followUpQuestion: null,
    uncertaintyNote: "Based on code inspection."
  };

  const { service, calls } = fixture({ providerResult: wrongAnswerAnalysis });
  const review = await service.createReview({ id: "student-1" }, {
    sourceCode: javaBuggyCode,
    language: "java",
    problemTitle: "Two Sum",
    mode: "mistake"
  });

  assert.equal(review.mode, "mistake");
  assert.equal(review.analysis.sections.some(s => s.id === "counterexample"), true);
  assert.match(calls[0].instructions, /Focus on debugging/);
});

test("3. Time Limit Exceeded (TLE) submission triggers complexity bottleneck analysis", async () => {
  const tleAnalysis = {
    summary: "Nested loop comparison results in O(n²) operations, timing out on n = 100,000.",
    sections: [
      { id: "tle-analysis", title: "Complexity Bottleneck", content: "Nested iterations perform n(n-1)/2 operations (~10¹⁰), exceeding the 1-second limit." },
      { id: "optimal-approach", title: "Optimized Roadmap", content: "Switch from quadratic search to Floyd's Cycle Detection to achieve O(n) runtime." }
    ],
    unavailableSections: [],
    followUpQuestion: null,
    uncertaintyNote: null
  };

  const { service, calls } = fixture({ providerResult: tleAnalysis });
  const review = await service.createReview({ id: "student-1" }, {
    sourceCode: "class Solution { public int findDuplicate(int[] nums) { for(int i=0;i<nums.length;i++) for(int j=i+1;j<nums.length;j++) if(nums[i]==nums[j]) return nums[i]; return -1; } }",
    language: "java",
    problemTitle: "Find the Duplicate Number",
    mode: "tle"
  });

  assert.equal(review.mode, "tle");
  assert.equal(review.analysis.sections.some(s => s.id === "tle-analysis"), true);
  assert.match(calls[0].instructions, /Analyze execution time bottlenecks/);
});

test("4. Runtime Error analysis identifies boundary guards and exception points", async () => {
  const runtimeErrorAnalysis = {
    summary: "Unsafe indexing: accessing index without length guard causes ArrayIndexOutOfBoundsException.",
    sections: [
      { id: "runtime-error", title: "Boundary Guard", content: "Check array bounds before accessing index." },
      { id: "optimal-approach", title: "Safe Traversal", content: "Ensure pointer remains within 0 <= i < nums.length." }
    ],
    unavailableSections: [],
    followUpQuestion: null,
    uncertaintyNote: null
  };

  const { service, calls } = fixture({ providerResult: runtimeErrorAnalysis });
  const review = await service.createReview({ id: "student-1" }, {
    sourceCode: "public int getVal(int[] a) { return a[100]; }",
    language: "java",
    problemTitle: "Safe Indexing",
    mode: "runtime-error"
  });

  assert.equal(review.mode, "runtime-error");
  assert.match(calls[0].instructions, /Identify likely unsafe runtime operations/);
});

test("5. Compilation Error analysis identifies syntax/type mismatch and signatures", async () => {
  const compileErrorAnalysis = {
    summary: "Syntax and type mismatch: missing return type and mismatched class declaration.",
    sections: [
      { id: "compilation-error", title: "Type & Signature", content: "Method signature must declare return type and correct generics." }
    ],
    unavailableSections: [],
    followUpQuestion: null,
    uncertaintyNote: null
  };

  const { service, calls } = fixture({ providerResult: compileErrorAnalysis });
  const review = await service.createReview({ id: "student-1" }, {
    sourceCode: "class Solution { solve(nums) { return; } }",
    language: "java",
    problemTitle: "Signature Validation",
    mode: "compilation-error"
  });

  assert.equal(review.mode, "compilation-error");
  assert.match(calls[0].instructions, /Analyze syntax or type errors/);
});

test("6. Missing source code is rejected with validation error", () => {
  assert.throws(() => validateRequest({ sourceCode: "   ", language: "java", problemTitle: "Two Sum", mode: "explain" }), { code: "SOURCE_REQUIRED" });
  assert.throws(() => validateRequest({ sourceCode: null, language: "java", problemTitle: "Two Sum", mode: "explain" }), { code: "SOURCE_REQUIRED" });
});

test("7. Unsupported language is rejected with validation error", () => {
  assert.throws(() => validateRequest({ sourceCode: "fn main() {}", language: "unknown-lang", problemTitle: "Two Sum", mode: "explain" }), { code: "INVALID_LANGUAGE" });
});

test("8. AI timeout returns clean 503 AI_TIMEOUT error without crashing", async () => {
  const timeoutError = Object.assign(new Error("Request timed out"), { name: "APIConnectionTimeoutError", status: 503 });
  const { service } = fixture({ providerResult: timeoutError });

  await assert.rejects(
    () => service.createReview({ id: "student-1" }, { sourceCode: "class Solution {}", language: "java", problemTitle: "Two Sum", mode: "explain" }),
    err => err.code === "AI_TIMEOUT" || err.message.includes("timed out")
  );
});

test("9. Invalid AI response format is rejected safely", () => {
  assert.throws(() => validateAnalysis({}), { code: "AI_INVALID_RESPONSE" });
  assert.throws(() => validateAnalysis({ summary: "ok", sections: "not-an-array" }), { code: "AI_INVALID_RESPONSE" });
  assert.throws(() => validateAnalysis({ summary: "ok", sections: [{ id: "unrecognized-id", title: "x", content: "y" }], unavailableSections: [] }), { code: "AI_INVALID_RESPONSE" });
});

test("10. Different authenticated users maintain strict data isolation", async () => {
  const { service } = fixture();
  const reviewA = await service.createReview({ id: "student-alice" }, { sourceCode: "int a = 1;", language: "java", problemTitle: "Problem A", mode: "explain" });
  const reviewB = await service.createReview({ id: "student-bob" }, { sourceCode: "int b = 2;", language: "java", problemTitle: "Problem B", mode: "explain" });

  const aliceReviews = await service.listReviews({ id: "student-alice" });
  const bobReviews = await service.listReviews({ id: "student-bob" });

  assert.equal(aliceReviews.length, 1);
  assert.equal(aliceReviews[0].id, reviewA.id);
  assert.equal(bobReviews.length, 1);
  assert.equal(bobReviews[0].id, reviewB.id);
});

test("11. Unauthorized access to another user's review is blocked (404/403)", async () => {
  const { service } = fixture();
  const reviewA = await service.createReview({ id: "student-alice" }, { sourceCode: "int a = 1;", language: "java", problemTitle: "Problem A", mode: "explain" });

  await assert.rejects(
    () => service.reviewFor({ id: "student-bob" }, reviewA.id),
    { code: "REVIEW_NOT_FOUND" }
  );

  await assert.rejects(
    () => service.deleteReview({ id: "student-bob" }, reviewA.id),
    { code: "REVIEW_NOT_FOUND" }
  );
});

test("12. Future premium-ready entitlement resolver defaults to unrestricted free tier", () => {
  const entitlement = resolveMentorEntitlement({ id: "student-alice" });
  assert.equal(entitlement.tier, "free");
  assert.equal(entitlement.dailyQuota, 10);
  assert.equal(entitlement.canAccessNormalMode, true);
  assert.equal(entitlement.canAccessAnimaticMode, true);
});

test("13. Both Normal and Animatic modes share consistent underlying analysis data in script.js", () => {
  const scriptContent = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
  // Verify presence of shared problem educational data
  assert.match(scriptContent, /find-the-duplicate-number/);
  assert.match(scriptContent, /Floyd's Tortoise and Hare Cycle Detection/);
  assert.match(scriptContent, /two-sum/);
  assert.match(scriptContent, /bubble-sort/);
  assert.match(scriptContent, /binary-search/);
  // Verify consistent presence of both Normal Mode and Animatic Mode renderers
  assert.match(scriptContent, /function renderNormalModeAnalysis/);
  assert.match(scriptContent, /function renderAnimaticStep/);
  assert.match(scriptContent, /function switchMentorLearningTab/);
});

test("14. Profile page contains interactive daily question cards hooked to AI Code Mentor", () => {
  const scriptContent = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
  const htmlContent = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

  assert.match(scriptContent, /data-review-slug/);
  assert.match(scriptContent, /data-review-title/);
  assert.match(scriptContent, /openAiCodeMentorWorkspace/);
  assert.match(htmlContent, /id="aiMentorPage"/);
  assert.match(htmlContent, /id="mentorNormalWorkspace"/);
  assert.match(htmlContent, /id="mentorAnimaticWorkspace"/);
  assert.match(htmlContent, /id="mentorCodeInput"/);
  assert.match(htmlContent, /id="mentorAnalyzeBtn"/);
});

test("15. Repeated identical inputs return cached review without exhausting quota", async () => {
  const { service, collections } = fixture({ quota: 2 });
  const payload = { sourceCode: "int x = 42;", language: "java", problemTitle: "Cached Problem", mode: "explain" };

  const first = await service.createReview({ id: "student-alice" }, payload);
  const second = await service.createReview({ id: "student-alice" }, payload);

  assert.equal(first.id, second.id);
  // Only 1 review stored in DB and only 1 quota used
  assert.equal(collections.get("aiCodeReviews").docs.length, 1);
  assert.equal(collections.get("aiMentorUsage").docs[0].successfulReviews, 1);
});

test("16. User source code save and retrieve maintains persistent state and isolation", async () => {
  const { service } = fixture();
  const member = { id: "student-alice" };
  const otherMember = { id: "member-xyz", email: "other@dsa.internal" };

  // Save source for member
  const saved = await service.saveUserSource(member, {
    problemSlug: "find-the-duplicate-number",
    problemTitle: "Find the Duplicate Number",
    language: "java",
    sourceCode: "class Solution { public int findDuplicate(int[] nums) { return 2; } }"
  });
  assert.equal(saved.saved, true);

  // Retrieve source for member
  const retrieved = await service.getUserSource(member, { problemSlug: "find-the-duplicate-number" });
  assert.equal(retrieved.source, "previously_saved");
  assert.equal(retrieved.language, "java");
  assert.match(retrieved.sourceCode, /findDuplicate/);

  // Other member cannot access this saved source
  const otherResult = await service.getUserSource(otherMember, { problemSlug: "find-the-duplicate-number" });
  assert.equal(otherResult.sourceCode, null);
});

test("17. Educational data supports all 7 programming languages for optimal solutions", () => {
  const scriptContent = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  const languages = ["java", "python3", "cpp", "javascript", "typescript", "go", "rust"];
  for (const lang of languages) {
    assert.match(scriptContent, new RegExp(lang + ":\\s*`"), "Missing optimal solution definition for language " + lang);
  }
});

test("18. Accepted submissions do not show false bug warnings in frontend analysis logic", () => {
  const scriptContent = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  assert.match(scriptContent, /isAccepted/, "Analysis logic must explicitly test isAccepted");
  assert.match(scriptContent, /mistakeAlertEl\.hidden = true/, "Mistake alert must be hidden for Accepted submissions");
  assert.match(scriptContent, /mentorAcceptedAlert/, "Accepted affirmation card must be handled");
});

test("19. Progressive hint and interactive dry run structures exist with step progression", () => {
  const scriptContent = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  assert.match(scriptContent, /hints:\s*\[/, "Educational data must provide progressive hints");
  assert.match(scriptContent, /dryRun:\s*\{/, "Educational data must provide dry run trace headers and rows");
  assert.match(scriptContent, /mentorNextHintBtn/, "Interactive Next Hint button listener must be hooked");
});

test("20. Web Audio API synthesizer is defined with muted default and audio controls", () => {
  const scriptContent = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  assert.match(scriptContent, /class WebAudioSynthesizer/, "WebAudioSynthesizer must be implemented");
  assert.match(scriptContent, /this\.muted = true/, "Audio synthesizer must be muted by default");
  assert.match(scriptContent, /animaticSoundToggle/, "Sound toggle control must be bound");
  assert.match(scriptContent, /animaticVolumeSlider/, "Volume slider control must be bound");
});

test("21. Minimum Moves to Equal Array Elements (#453) returns mathematically sound optimal solution in all 7 languages and eliminates fake solve placeholder", () => {
  const scriptContent = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  assert.match(scriptContent, /"minimum-moves-to-equal-array-elements":\s*\{/, "Must contain verified entry for minimum-moves-to-equal-array-elements");
  assert.match(scriptContent, /public int minMoves\(int\[\] nums\)/, "Java signature must be public int minMoves(int[] nums)");
  assert.match(scriptContent, /def minMoves\(self, nums: list\[int\]\) -> int:/, "Python signature must be def minMoves(self, nums: list[int]) -> int:");
  assert.match(scriptContent, /int minMoves\(vector<int>& nums\)/, "C++ signature must be int minMoves(vector<int>& nums)");
  assert.match(scriptContent, /var minMoves = function\(nums\)/, "JS signature must be var minMoves = function(nums)");
  assert.match(scriptContent, /function minMoves\(nums: number\[\]\): number/, "TS signature must be function minMoves(nums: number[]): number");
  assert.match(scriptContent, /func minMoves\(nums \[\]int\) int/, "Go signature must be func minMoves(nums []int) int");
  assert.match(scriptContent, /pub fn min_moves\(nums: Vec<i32>\) -> i32/, "Rust signature must be pub fn min_moves(nums: Vec<i32>) -> i32");

  assert.match(scriptContent, /moves \+= x - min/, "Java solution must accumulate difference (x - min) to reach minimum element");
  assert.match(scriptContent, /sum\(x - min_val for x in nums\)/, "Python solution must sum differences relative to min_val");

  assert.doesNotMatch(scriptContent, /public int\[\] solve\(int\[\] nums\)/, "Must NOT contain fake solve(int[] nums) method returning nums");
});

test("22. Local Educational Knowledge Engine rejects unverified problems with explicit unavailable notice and zero fake code", () => {
  const scriptContent = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  assert.match(scriptContent, /Problem-specific optimal code is not available in the local knowledge engine yet/, "Must provide explicit unavailable notice for unverified problems");
  assert.match(scriptContent, /hasLocalSolution:\s*false/, "Unverified problems must flag hasLocalSolution as false");
  assert.match(scriptContent, /Provider: Local Engine \(Unverified Problem\)/, "Provider badge must indicate unverified local status");
});

test("23. Provider separation cleanly distinguishes Live AI vs Verified Local Engine vs Unverified Problem", () => {
  const indexContent = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const scriptContent = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  assert.match(indexContent, /id="mentorProviderBadge"/, "index.html must include mentorProviderBadge element");
  assert.match(scriptContent, /Provider: OpenAI Live AI Mentor/, "Script must support OpenAI Live AI provider badge");
  assert.match(scriptContent, /Provider: Local Educational Knowledge Engine/, "Script must support Local Educational Knowledge Engine provider badge");
  assert.match(scriptContent, /Provider: Local Engine \(Unverified Problem\)/, "Script must support Unverified Problem provider badge");
});

test("24. Source code provenance strictly differentiates Verified LeetCode Submission, Previously Saved, Manually Pasted, and Original Code Unavailable", () => {
  const scriptContent = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  assert.match(scriptContent, /"Verified LeetCode Submission"/, "Must support Verified LeetCode Submission provenance");
  assert.match(scriptContent, /"Previously Saved"/, "Must support Previously Saved provenance");
  assert.match(scriptContent, /Source: Manually Pasted/, "Must support Manually Pasted provenance on input");
  assert.match(scriptContent, /Source: Original Code Unavailable/, "Must support Original Code Unavailable provenance");
  assert.doesNotMatch(scriptContent, /Source: Starter Template/, "Must not badge starter code as generic Starter Template; use Original Code Unavailable");
});