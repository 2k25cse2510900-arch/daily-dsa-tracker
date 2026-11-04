"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  resolveProblemIdentity,
  extractSlug,
  extractNumber,
  buildProblemPromptContext,
  CANONICAL_PROBLEMS
} = require("../leetcode-problem-intelligence");

const {
  validateCodeIdentity,
  validateComplexityClaims,
  executeSandboxTest,
  validateGeneratedAnalysis
} = require("../code-validation-pipeline");

const { AiMentorCache } = require("../ai-mentor-cache");

const {
  createGeminiMentorProvider,
  createOpenAIMentorProvider,
  createLocalKnowledgeProvider,
  createUnifiedMentorProvider,
  checkProviderStatus,
  UNIVERSAL_ANALYSIS_SCHEMA
} = require("../ai-code-mentor-provider");

const {
  createAiCodeMentorService,
  validateRequest,
  validateAnalysis
} = require("../ai-code-mentor");

// In-memory mock collection for service testing
class MockCollection {
  constructor() { this.docs = []; }
  async findOne(filter) {
    const doc = this.docs.find(d => Object.entries(filter).every(([k, v]) => d[k] === v));
    return doc ? structuredClone(doc) : null;
  }
  find(filter) {
    const list = this.docs.filter(d => Object.entries(filter).every(([k, v]) => d[k] === v));
    return {
      sort: () => ({ limit: n => ({ toArray: async () => list.slice(0, n) }) }),
      toArray: async () => list
    };
  }
  async insertOne(doc) {
    this.docs.push(structuredClone(doc));
    return { insertedId: doc._id };
  }
  async updateOne(filter, update, opts = {}) {
    let doc = this.docs.find(d => Object.entries(filter).every(([k, v]) => d[k] === v));
    if (!doc && opts.upsert) {
      doc = { _id: filter._id || "auto-id" };
      if (update.$setOnInsert) Object.assign(doc, update.$setOnInsert);
      if (update.$set) Object.assign(doc, update.$set);
      this.docs.push(doc);
      return { upsertedCount: 1, matchedCount: 0 };
    }
    if (doc) {
      if (update.$set) Object.assign(doc, update.$set);
      if (update.$inc) {
        for (const [k, v] of Object.entries(update.$inc)) doc[k] = (doc[k] || 0) + v;
      }
      return { matchedCount: 1, upsertedCount: 0 };
    }
    return { matchedCount: 0, upsertedCount: 0 };
  }
  async deleteOne(filter) {
    const idx = this.docs.findIndex(d => Object.entries(filter).every(([k, v]) => d[k] === v));
    if (idx >= 0) { this.docs.splice(idx, 1); return { deletedCount: 1 }; }
    return { deletedCount: 0 };
  }
}

function mockDb() {
  const map = new Map();
  return {
    collection: (name) => {
      if (!map.has(name)) map.set(name, new MockCollection());
      return map.get(name);
    }
  };
}

// -------------------------------------------------------------
// 1. LEETCODE PROBLEM INTELLIGENCE TESTS
// -------------------------------------------------------------

test("Problem Intelligence: extracts problem number and slug accurately from diverse formats", () => {
  assert.equal(extractNumber(453), 453);
  assert.equal(extractNumber("453"), 453);
  assert.equal(extractNumber("#453. Minimum Moves"), 453);
  assert.equal(extractNumber("1. Two Sum"), 1);

  assert.equal(extractSlug("https://leetcode.com/problems/two-sum/"), "two-sum");
  assert.equal(extractSlug("https://leetcode.com/problems/minimum-moves-to-equal-array-elements/description/"), "minimum-moves-to-equal-array-elements");
  assert.equal(extractSlug("find-the-duplicate-number"), "find-the-duplicate-number");
});

test("Problem Intelligence: resolves all canonical problems (#1, #453, #287, #704, and additional #217, #20, #121)", () => {
  const p1 = resolveProblemIdentity({ problemNumber: 1 });
  assert.equal(p1.slug, "two-sum");
  assert.equal(p1.confidence, "high");

  const p453 = resolveProblemIdentity({ problemTitle: "453. Minimum Moves to Equal Array Elements" });
  assert.equal(p453.slug, "minimum-moves-to-equal-array-elements");
  assert.equal(p453.number, 453);

  const p287 = resolveProblemIdentity({ problemUrl: "https://leetcode.com/problems/find-the-duplicate-number/" });
  assert.equal(p287.slug, "find-the-duplicate-number");
  assert.equal(p287.number, 287);

  const p704 = resolveProblemIdentity({ problemTitle: "Binary Search" });
  assert.equal(p704.slug, "binary-search");
  assert.equal(p704.number, 704);

  // Additional Problem 1: #217 Contains Duplicate (not in local 6-item curriculum)
  const p217 = resolveProblemIdentity({ problemNumber: 217 });
  assert.equal(p217.slug, "contains-duplicate");
  assert.equal(p217.title, "Contains Duplicate");
  assert.equal(p217.signatures.java, "public boolean containsDuplicate(int[] nums)");

  // Additional Problem 2: #20 Valid Parentheses (not in local 6-item curriculum)
  const p20 = resolveProblemIdentity({ problemTitle: "Valid Parentheses" });
  assert.equal(p20.slug, "valid-parentheses");
  assert.equal(p20.number, 20);
  assert.equal(p20.signatures.python3, "def isValid(self, s: str) -> bool:");

  // Additional Problem 3: #121 Best Time to Buy and Sell Stock
  const p121 = resolveProblemIdentity({ problemNumber: 121 });
  assert.equal(p121.slug, "best-time-to-buy-and-sell-stock");
  assert.equal(p121.signatures.cpp, "int maxProfit(vector<int>& prices)");
});

test("Problem Intelligence: ambiguous problem requests clarification without fabricating fake identities", () => {
  const ambiguous = resolveProblemIdentity({ problemTitle: "", problemSlug: "", problemDescription: "" });
  assert.equal(ambiguous.confidence, "ambiguous");
  assert.equal(ambiguous.clarificationNeeded, true);
  assert.match(ambiguous.reason, /provide/i);
});

test("Problem Intelligence: supports arbitrary non-canonical LeetCode problems when description/title supplied", () => {
  const custom = resolveProblemIdentity({
    problemTitle: "3000. Maximum Area of Longest Diagonal Rectangle",
    problemDescription: "You are given a 2D 0-indexed integer array dimensions..."
  });
  assert.equal(custom.number, 3000);
  assert.equal(custom.isCanonical, false);
  assert.equal(custom.confidence, "medium");
  assert.match(custom.title, /Maximum Area/i);
});

// -------------------------------------------------------------
// 2. CODE VALIDATION PIPELINE TESTS
// -------------------------------------------------------------

test("Code Validation: rejects placeholder solve(int[] nums) method", () => {
  const fakeJava = `
class Solution {
    public int[] solve(int[] nums) {
        return nums;
    }
}
  `;
  const res = validateCodeIdentity(fakeJava, { slug: "minimum-moves-to-equal-array-elements", title: "Minimum Moves" }, "java");
  assert.equal(res.valid, false);
  assert.match(res.reason, /solve/i);
});

test("Code Validation: verifies canonical Java and Python method signatures across problems", () => {
  // #1 Two Sum Java
  const validTwoSumJava = "class Solution { public int[] twoSum(int[] nums, int target) { return new int[]{0, 1}; } }";
  assert.equal(validateCodeIdentity(validTwoSumJava, CANONICAL_PROBLEMS["two-sum"], "java").valid, true);

  // #453 Minimum Moves Java
  const validMinMovesJava = "class Solution { public int minMoves(int[] nums) { return 0; } }";
  assert.equal(validateCodeIdentity(validMinMovesJava, CANONICAL_PROBLEMS["minimum-moves-to-equal-array-elements"], "java").valid, true);

  // #453 Minimum Moves Python
  const validMinMovesPy = "class Solution:\n    def minMoves(self, nums: List[int]) -> int:\n        return 0";
  assert.equal(validateCodeIdentity(validMinMovesPy, CANONICAL_PROBLEMS["minimum-moves-to-equal-array-elements"], "python3").valid, true);

  // #217 Contains Duplicate Java
  const validContainsDupJava = "class Solution { public boolean containsDuplicate(int[] nums) { return true; } }";
  assert.equal(validateCodeIdentity(validContainsDupJava, CANONICAL_PROBLEMS["contains-duplicate"], "java").valid, true);

  // Mismatch method name
  const invalidMethod = "class Solution { public int wrongMethod(int[] nums) { return 0; } }";
  const check = validateCodeIdentity(invalidMethod, CANONICAL_PROBLEMS["minimum-moves-to-equal-array-elements"], "java");
  assert.equal(check.valid, false);
  assert.match(check.reason, /expected method 'minMoves'/i);
});

test("Code Validation: complexity claims must use valid big-O notation", () => {
  assert.equal(validateComplexityClaims("O(n)", "O(1)").valid, true);
  assert.equal(validateComplexityClaims("O(n log n)", "O(n)").valid, true);
  assert.equal(validateComplexityClaims("invalid", "O(1)").valid, false);
});

// -------------------------------------------------------------
// 3. PROVIDER ARCHITECTURE & ISOLATION TESTS
// -------------------------------------------------------------

test("Provider: Gemini provider parses structured JSON and reports gemini provider name", async () => {
  const sampleJson = {
    problemTitle: "Two Sum",
    language: "python3",
    studentApproach: "One-pass hash map",
    correctnessStatus: "Accepted",
    mistakeDiagnosis: { hasMistake: false },
    bruteForce: { title: "Exhaustive", algorithm: "Nested loops", timeComplexity: "O(n²)", spaceComplexity: "O(1)", explanation: "Checks pairs" },
    optimalApproach: { title: "Hash Map", algorithm: "Stores complement", whyItWorks: "O(1) lookup", keyInvariants: "One pass" },
    optimalCode: "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        seen = {}\n        for i, x in enumerate(nums):\n            diff = target - x\n            if diff in seen:\n                return [seen[diff], i]\n            seen[x] = i\n        return []",
    optimalComplexity: { timeComplexity: "O(n)", spaceComplexity: "O(n)", auxiliarySpace: "O(n)", totalSpace: "O(n)", explanation: "Single traversal" },
    summary: "Optimal Two Sum solution."
  };

  const mockClient = {
    models: {
      generateContent: async () => ({
        text: JSON.stringify(sampleJson),
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 200 }
      })
    }
  };

  const provider = createGeminiMentorProvider({
    env: { GEMINI_API_KEY: "test-gemini-key", AI_MENTOR_GEMINI_MODEL: "gemini-2.5-flash" },
    client: mockClient
  });

  const res = await provider.analyze({ instructions: "Evaluate", input: "code" });
  assert.equal(res.provider, "gemini");
  assert.equal(res.model, "gemini-2.5-flash");
  assert.equal(res.analysis.optimalComplexity.timeComplexity, "O(n)");
});

test("Provider: Gemini provider converts timeout to 504 AI_TIMEOUT", async () => {
  const hangingClient = {
    models: {
      generateContent: () => new Promise(() => {})
    }
  };

  const provider = createGeminiMentorProvider({
    env: { GEMINI_API_KEY: "test-gemini-key", AI_MENTOR_TIMEOUT_MS: "100" },
    client: hangingClient
  });

  await assert.rejects(
    () => provider.analyze({ instructions: "Evaluate", input: "code" }),
    err => err.code === "AI_TIMEOUT" && err.status === 504
  );
});

test("Provider: Gemini provider converts quota/rate-limit (429 / RESOURCE_EXHAUSTED) to 429 AI_RATE_LIMITED", async () => {
  const rateLimitedClient = {
    models: {
      generateContent: async () => {
        const err = new Error("RESOURCE_EXHAUSTED quota exceeded");
        err.status = 429;
        throw err;
      }
    }
  };

  const provider = createGeminiMentorProvider({
    env: { GEMINI_API_KEY: "test-gemini-key" },
    client: rateLimitedClient
  });

  await assert.rejects(
    () => provider.analyze({ instructions: "Evaluate", input: "code" }),
    err => err.code === "AI_RATE_LIMITED" && err.status === 429
  );
});

test("Provider: Unified provider respects AI_MENTOR_PROVIDER selection and fallback", async () => {
  // If AI_MENTOR_PROVIDER=local, returns local provider without external calls
  const localUnified = createUnifiedMentorProvider({
    env: { AI_MENTOR_PROVIDER: "local" },
    localKnowledgeBase: {
      "two-sum": {
        isVerified: true,
        title: "Two Sum",
        optimalTitle: "Hash Map Complement",
        timeComplexity: "O(n)",
        spaceComplexity: "O(n)",
        acceptedCode: "function twoSum() {}"
      }
    }
  });

  const localRes = await localUnified.analyze({ problemSlug: "two-sum", language: "javascript" });
  assert.equal(localRes.provider, "local");
  assert.equal(localRes.analysis.problemTitle, "Two Sum");

  // Fallback test: when Gemini fails and AI_MENTOR_ENABLE_FALLBACK=true, serves local with notice
  const failingGeminiClient = {
    models: {
      generateContent: async () => { throw new Error("Gemini network unreachable"); }
    }
  };

  const fallbackUnified = createUnifiedMentorProvider({
    env: { AI_MENTOR_PROVIDER: "gemini", GEMINI_API_KEY: "test-key" },
    geminiClient: failingGeminiClient,
    localKnowledgeBase: {
      "two-sum": { isVerified: true, title: "Two Sum", acceptedCode: "class Solution {}" }
    }
  });

  const fallbackRes = await fallbackUnified.analyze({ problemSlug: "two-sum", language: "java" });
  assert.equal(fallbackRes.provider, "local");
  assert.match(fallbackRes.fallbackNotice, /Gemini provider failed/i);
});

test("Provider Status: safely reports configured status without exposing keys", () => {
  const env = {
    GEMINI_API_KEY: "secret-gemini-key-12345",
    OPENAI_API_KEY: "secret-openai-key-67890",
    AI_MENTOR_PROVIDER: "gemini",
    AI_MENTOR_GEMINI_MODEL: "gemini-2.5-flash"
  };

  const status = checkProviderStatus(env);
  assert.equal(status.activeProvider, "gemini");
  assert.equal(status.gemini.configured, true);
  assert.equal(status.gemini.model, "gemini-2.5-flash");
  assert.equal(status.openai.configured, true);

  // Verify secrets are NOT exposed anywhere in the status object
  const statusStr = JSON.stringify(status);
  assert.equal(statusStr.includes("secret-gemini"), false);
  assert.equal(statusStr.includes("secret-openai"), false);
});

// -------------------------------------------------------------
// 4. MULTI-TIER CACHING & COST CONTROL TESTS
// -------------------------------------------------------------

test("Caching: problem-level optimal code is cached and separated from student reviews", async () => {
  const cache = new AiMentorCache();
  const problemSlug = "two-sum";
  const lang = "java";
  const model = "gemini-2.5-flash";

  // Initially empty
  assert.equal(await cache.getProblemOptimal(problemSlug, lang, model), null);

  // Save optimal solution for the problem
  await cache.saveProblemOptimal(problemSlug, lang, model, {
    optimalCode: "class Solution { public int[] twoSum(int[] nums, int target) { return new int[]{0,1}; } }",
    optimalComplexity: { timeComplexity: "O(n)", spaceComplexity: "O(n)" }
  });

  const cached = await cache.getProblemOptimal(problemSlug, lang, model);
  assert.notEqual(cached, null);
  assert.match(cached.optimalCode, /class Solution/);

  // Student reviews are separate
  const studentHash = cache.buildStudentReviewHash("student-1", problemSlug, lang, "explain", "codeA", model, false);
  const studentReview = { id: "rev-1", userId: "student-1", notes: "student mistake analysis" };
  await cache.saveStudentReview("student-1", studentHash, studentReview);

  // Student 2 cannot read student 1's review
  assert.equal(await cache.getStudentReview("student-2", studentHash), null);
});

// -------------------------------------------------------------
// 5. FULL END-TO-END SERVICE REVIEW FLOW (ACCEPTED & WRONG ANSWER)
// -------------------------------------------------------------

test("Service: generates dynamic analysis for non-curriculum problem (#217 Contains Duplicate)", async () => {
  const db = mockDb();
  const sampleAnalysis = {
    problemTitle: "Contains Duplicate",
    language: "java",
    studentApproach: "Hash set tracking",
    correctnessStatus: "Accepted",
    mistakeDiagnosis: { hasMistake: false },
    bruteForce: { title: "Nested Loops", algorithm: "Compare all pairs", timeComplexity: "O(n²)", spaceComplexity: "O(1)", explanation: "Pairwise" },
    optimalApproach: { title: "Hash Set", algorithm: "Single pass insertion", whyItWorks: "O(1) duplicate lookup", keyInvariants: "Set properties" },
    optimalCode: "class Solution {\n    public boolean containsDuplicate(int[] nums) {\n        Set<Integer> seen = new HashSet<>();\n        for (int x : nums) {\n            if (!seen.add(x)) return true;\n        }\n        return false;\n    }\n}",
    optimalComplexity: { timeComplexity: "O(n)", spaceComplexity: "O(n)", auxiliarySpace: "O(n)", totalSpace: "O(n)", explanation: "O(n) set storage" },
    summary: "Optimal hash set approach for Contains Duplicate."
  };

  const mockProvider = {
    providerName: "gemini",
    model: "gemini-2.5-flash",
    analyze: async () => ({
      provider: "gemini",
      model: "gemini-2.5-flash",
      analysis: sampleAnalysis
    })
  };

  const service = createAiCodeMentorService({
    db,
    provider: mockProvider
  });

  const review = await service.createReview(
    { id: "student-100" },
    {
      problemNumber: 217,
      problemTitle: "Contains Duplicate",
      language: "java",
      sourceCode: "class Solution { public boolean containsDuplicate(int[] nums) { return false; } }",
      mode: "explain",
      verdict: "Accepted"
    }
  );

  assert.equal(review.problemTitle, "Contains Duplicate");
  assert.equal(review.language, "java");
  assert.equal(review.provider, "gemini");
  assert.equal(review.analysis.optimalComplexity.timeComplexity, "O(n)");
  assert.match(review.analysis.optimalCode, /class Solution/);
  assert.match(review.analysis.optimalCode, /containsDuplicate/);
});

test("Service: diagnoses Wrong Answer submission with counterexample and suggested fix", async () => {
  const db = mockDb();
  const sampleWrongAnswer = {
    problemTitle: "Two Sum",
    language: "python3",
    studentApproach: "Sorted array assumption without sorting",
    correctnessStatus: "Wrong Answer",
    mistakeDiagnosis: {
      hasMistake: true,
      title: "Unsorted Array Two-Pointer Failure",
      detail: "Two-pointer approach assumes sorted array, but input array is unsorted.",
      counterExample: "nums = [3, 2, 4], target = 6 yields incorrect indices",
      suggestedFix: "Use a hash map to preserve original indices while achieving O(n) lookup."
    },
    bruteForce: { title: "Exhaustive", algorithm: "Nested search", timeComplexity: "O(n²)", spaceComplexity: "O(1)", explanation: "Pairwise" },
    optimalApproach: { title: "Hash Map", algorithm: "One pass", whyItWorks: "Complement lookup", keyInvariants: "One pass" },
    optimalCode: "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        seen = {}\n        for i, x in enumerate(nums):\n            diff = target - x\n            if diff in seen:\n                return [seen[diff], i]\n            seen[x] = i\n        return []",
    optimalComplexity: { timeComplexity: "O(n)", spaceComplexity: "O(n)", auxiliarySpace: "O(n)", totalSpace: "O(n)", explanation: "Single pass" },
    summary: "Identified unsorted array bug in two-pointer implementation."
  };

  const mockProvider = {
    providerName: "gemini",
    model: "gemini-2.5-flash",
    analyze: async () => ({
      provider: "gemini",
      model: "gemini-2.5-flash",
      analysis: sampleWrongAnswer
    })
  };

  const service = createAiCodeMentorService({
    db,
    provider: mockProvider
  });

  const review = await service.createReview(
    { id: "student-101" },
    {
      problemTitle: "Two Sum",
      language: "python3",
      sourceCode: "class Solution:\n    def twoSum(self, nums, target):\n        l, r = 0, len(nums)-1\n        return []",
      mode: "mistake",
      verdict: "Wrong Answer"
    }
  );

  assert.equal(review.analysis.correctnessStatus, "Wrong Answer");
  assert.equal(review.analysis.mistakeDiagnosis.hasMistake, true);
  assert.match(review.analysis.mistakeDiagnosis.detail, /unsorted/i);
  assert.match(review.analysis.mistakeDiagnosis.counterExample, /\[3, 2, 4\]/);
});

test("Retry & Reliability: Gemini provider retries on transient 503 and succeeds on subsequent attempt", async () => {
  let calls = 0;
  const retryClient = {
    models: {
      generateContent: async () => {
        calls++;
        if (calls < 3) {
          const err = new Error("This model is currently experiencing high demand.");
          err.status = 503;
          throw err;
        }
        return {
          text: JSON.stringify({
            problemTitle: "Two Sum",
            language: "python3",
            studentApproach: "Hash map",
            correctnessStatus: "Accepted",
            mistakeDiagnosis: { hasMistake: false },
            bruteForce: { title: "Brute", algorithm: "Search", timeComplexity: "O(n²)", spaceComplexity: "O(1)", explanation: "Pairwise" },
            optimalApproach: { title: "Hash", algorithm: "Map", whyItWorks: "O(1)", keyInvariants: "Invariants" },
            optimalCode: "def twoSum(): pass",
            optimalComplexity: { timeComplexity: "O(n)", spaceComplexity: "O(n)", auxiliarySpace: "O(n)", totalSpace: "O(n)", explanation: "Linear" },
            summary: "Success after retries"
          })
        };
      }
    }
  };

  const provider = createGeminiMentorProvider({
    env: { GEMINI_API_KEY: "test-key", AI_MENTOR_RETRY_BASE_MS: "10", AI_MENTOR_MAX_RETRIES: "3" },
    client: retryClient
  });

  const res = await provider.analyze({ instructions: "Evaluate", input: "code" });
  assert.equal(calls, 3);
  assert.equal(res.provider, "gemini");
  assert.equal(res.analysis.summary, "Success after retries");
});

test("Retry & Reliability: Gemini provider does NOT retry non-transient 401 or 400 errors", async () => {
  let calls = 0;
  const invalidKeyClient = {
    models: {
      generateContent: async () => {
        calls++;
        const err = new Error("API_KEY_INVALID: API key not valid");
        err.status = 401;
        throw err;
      }
    }
  };

  const provider = createGeminiMentorProvider({
    env: { GEMINI_API_KEY: "bad-key", AI_MENTOR_RETRY_BASE_MS: "10", AI_MENTOR_MAX_RETRIES: "3" },
    client: invalidKeyClient
  });

  await assert.rejects(
    () => provider.analyze({ instructions: "Evaluate", input: "code" }),
    err => err.code === "AI_MODEL_UNAVAILABLE" && err.status === 503
  );
  assert.equal(calls, 1, "Must fail immediately without retrying non-transient auth failure");
});

test("Cache Isolation: Fallback review is NOT cached as Gemini review in optimal cache or student review cache", async () => {
  const db = mockDb();
  let geminiCalls = 0;
  const failingGeminiClient = {
    models: {
      generateContent: async () => {
        geminiCalls++;
        const err = new Error("Gemini network unreachable");
        err.status = 503;
        throw err;
      }
    }
  };

  const unifiedProvider = createUnifiedMentorProvider({
    env: { AI_MENTOR_PROVIDER: "gemini", GEMINI_API_KEY: "test-key", AI_MENTOR_MAX_RETRIES: "0" },
    geminiClient: failingGeminiClient,
    localKnowledgeBase: {
      "two-sum": {
        isVerified: true,
        title: "Two Sum",
        optimalTitle: "Hash Map Complement",
        timeComplexity: "O(n)",
        spaceComplexity: "O(n)",
        acceptedCode: "function twoSum() { return []; }"
      }
    }
  });

  const service = createAiCodeMentorService({
    db,
    provider: unifiedProvider
  });

  const fallbackReview = await service.createReview(
    { id: "student-fallback-user" },
    {
      problemTitle: "Two Sum",
      problemSlug: "two-sum",
      language: "javascript",
      sourceCode: "function twoSum() {}",
      mode: "explain",
      verdict: "Accepted"
    }
  );

  assert.equal(fallbackReview.provider, "local");
  assert.ok(fallbackReview.fallbackNotice, "Must have fallback notice");
  assert.match(fallbackReview.fallbackNotice, /Gemini provider failed/i);

  // Verify that the problem optimal cache did NOT cache this fallback under Gemini
  const optimalDoc = await db.collection("aiProblemOptimalSolutions").findOne({ _id: "optimal:two-sum:javascript:gemini-3.1-flash-lite" });
  assert.equal(optimalDoc, null, "Fallback must NOT be cached in aiProblemOptimalSolutions under Gemini model tag");

  // Verify student review was NOT cached under Gemini so future requests can still reach Gemini
  const inputHash = service.cache.buildStudentReviewHash("student-fallback-user", "two-sum", "javascript", "explain", "function twoSum() {}", "gemini", false);
  const cachedReview = await service.cache.getStudentReview("student-fallback-user", inputHash);
  assert.equal(cachedReview, null, "Fallback must NOT be cached in student review cache under Gemini");
});

test("LeetCode #1590: resolves canonical problem identity and validates Java minSubarray signature", () => {
  const resolved = resolveProblemIdentity({ problemSlug: "make-sum-divisible-by-p" });
  assert.equal(resolved.number, 1590);
  assert.equal(resolved.slug, "make-sum-divisible-by-p");
  assert.equal(resolved.title, "Make Sum Divisible by P");
  assert.match(resolved.signatures.java, /public int minSubarray\(int\[\] nums, int p\)/);

  const byNumber = resolveProblemIdentity({ problemNumber: "1590" });
  assert.equal(byNumber.slug, "make-sum-divisible-by-p");

  const validJava = `class Solution {
    public int minSubarray(int[] nums, int p) {
        int n = nums.length;
        long totalSum = 0;
        for (int num : nums) totalSum += num;
        int rem = (int)(totalSum % p);
        if (rem == 0) return 0;
        java.util.Map<Integer, Integer> map = new java.util.HashMap<>();
        map.put(0, -1);
        long prefixSum = 0;
        int minLen = n;
        for (int i = 0; i < n; i++) {
            prefixSum += nums[i];
            int currRem = (int)(prefixSum % p);
            int target = (currRem - rem + p) % p;
            if (map.containsKey(target)) {
                minLen = Math.min(minLen, i - map.get(target));
            }
            map.put(currRem, i);
        }
        return minLen == n ? -1 : minLen;
    }
}`;
  const validation = validateCodeIdentity(validJava, resolved, "java");
  assert.equal(validation.valid, true);

  const fakePlaceholder = `class Solution {
    public int[] solve(int[] nums) {
        return nums;
    }
}`;
  const fakeValidation = validateCodeIdentity(fakePlaceholder, resolved, "java");
  assert.equal(fakeValidation.valid, false);
});

test("Frontend Routing: eliminates hardcoded OpenAI prompts and provides honest attribution", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const scriptContent = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  const indexContent = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

  assert.doesNotMatch(scriptContent, /Configure OPENAI_API_KEY/, "Must not hardcode Configure OPENAI_API_KEY in table or UI");
  assert.match(scriptContent, /Provider: Gemini AI Mentor/, "Script must support Gemini AI Mentor provider badge");
  assert.match(scriptContent, /LeetCode Verdict: Runtime Error \(Original Source Unavailable\)/, "Must honestly explain missing source code rather than fabricating boundary errors");
  assert.doesNotMatch(indexContent, /OpenAI API key is not configured/, "Default HTML notice must not hardcode OpenAI when Gemini is provider");
});
