"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SUPPORTED_LANGUAGES,
  EXECUTION_DISCLAIMER,
  CANONICAL_SOLUTIONS,
  normalizeLanguage,
  compareStudentImplementation,
  generateMultiTierSolutions,
  validateGeneratedSolutions
} = require("../solution-generation-engine");

const {
  createAiCodeMentorService
} = require("../ai-code-mentor");

// In-memory test DB helper
function createTestDb() {
  const store = {
    aiCodeReviews: new Map(),
    aiReviewSources: new Map(),
    aiMentorUsage: new Map(),
    dailySubmissionsV2: new Map(),
    aiUserSavedSources: new Map(),
    problemOptimalCache: new Map(),
    studentReviewCache: new Map()
  };

  const wrap = (map) => ({
    findOne: async (query) => {
      for (const doc of map.values()) {
        let match = true;
        for (const [k, v] of Object.entries(query)) {
          if (doc[k] !== v) { match = false; break; }
        }
        if (match) return doc;
      }
      return null;
    },
    find: (query = {}) => ({
      sort: () => ({
        limit: (lim) => ({
          toArray: async () => {
            const list = Array.from(map.values());
            return list.slice(0, lim);
          }
        })
      })
    }),
    insertOne: async (doc) => {
      map.set(doc._id, { ...doc });
      return { insertedId: doc._id };
    },
    updateOne: async (query, update, opts = {}) => {
      let doc = null;
      for (const d of map.values()) {
        let match = true;
        for (const [k, v] of Object.entries(query)) {
          if (d[k] !== v) { match = false; break; }
        }
        if (match) { doc = d; break; }
      }
      if (!doc && opts.upsert) {
        doc = { ...query };
        map.set(query._id || `id_${map.size + 1}`, doc);
      }
      if (doc && update.$set) {
        Object.assign(doc, update.$set);
      }
      return { matchedCount: doc ? 1 : 0, upsertedCount: opts.upsert && !doc ? 1 : 0 };
    },
    deleteOne: async (query) => {
      for (const [k, d] of map.entries()) {
        if (d._id === query._id) { map.delete(k); return { deletedCount: 1 }; }
      }
      return { deletedCount: 0 };
    },
    deleteMany: async () => ({ deletedCount: 0 })
  });

  return {
    collection: (name) => wrap(store[name] || (store[name] = new Map()))
  };
}

test("Module 4: Canonical #392 Is Subsequence generates 3-tier solutions across all 8 languages", () => {
  const problem = {
    problemSlug: "is-subsequence",
    problemTitle: "Is Subsequence",
    problemNumber: 392
  };

  for (const lang of SUPPORTED_LANGUAGES) {
    const res = generateMultiTierSolutions({ problem, language: lang });
    assert.ok(res.solutions, `Solutions generated for ${lang}`);
    assert.equal(res.selectedLanguage, normalizeLanguage(lang));

    const bf = res.solutions.bruteForce;
    const imp = res.solutions.improved;
    const opt = res.solutions.optimal;

    // Brute Force
    assert.equal(bf.available, true);
    assert.equal(bf.timeComplexity, "O(2^|t|)");
    assert.ok(bf.code && bf.code.length > 20, `Brute force code present for ${lang}`);

    // Improved (Binary search on index map)
    assert.equal(imp.available, true);
    assert.ok(imp.timeComplexity.includes("log"), `Improved has logarithmic time for ${lang}`);
    assert.ok(imp.code && imp.code.length > 20, `Improved code present for ${lang}`);

    // Optimal (Two Pointers)
    assert.equal(opt.available, true);
    assert.equal(opt.timeComplexity, "O(|s| + |t|)");
    assert.equal(opt.spaceComplexity, "O(1)");
    assert.ok(opt.code && opt.code.length > 20, `Optimal code present for ${lang}`);

    // Language-specific syntax checks
    if (lang === "java") {
      assert.ok(opt.code.includes("class Solution"), "Java uses class Solution");
      assert.ok(opt.code.includes("boolean isSubsequence"), "Java has boolean return type");
      assert.ok(!opt.code.includes("public static void main"), "Java does not include main method");
    } else if (lang === "python" || lang === "python3") {
      assert.ok(opt.code.includes("class Solution:"), "Python uses class Solution");
      assert.ok(opt.code.includes("def isSubsequence"), "Python defines isSubsequence");
    } else if (lang === "cpp") {
      assert.ok(opt.code.includes("class Solution {"), "C++ uses class Solution");
      assert.ok(opt.code.includes("bool isSubsequence"), "C++ returns bool");
    } else if (lang === "go") {
      assert.ok(opt.code.includes("func isSubsequence"), "Go uses func isSubsequence");
    } else if (lang === "rust") {
      assert.ok(opt.code.includes("impl Solution {"), "Rust uses impl Solution");
      assert.ok(opt.code.includes("pub fn is_subsequence"), "Rust defines pub fn is_subsequence");
    }

    // Execution disclaimer
    assert.equal(res.executionDisclaimer, EXECUTION_DISCLAIMER);
    assert.equal(res.verificationStatus, "ai_generated_unverified");
  }
});

test("Module 4: Canonical #443 String Compression in-place write pointer vs buffer copy", () => {
  const problem = {
    problemSlug: "string-compression",
    problemTitle: "String Compression",
    problemNumber: 443
  };

  const res = generateMultiTierSolutions({ problem, language: "java" });
  const bf = res.solutions.bruteForce;
  const imp = res.solutions.improved;
  const opt = res.solutions.optimal;

  assert.equal(bf.available, true);
  assert.equal(bf.timeComplexity, "O(n²)");
  assert.equal(bf.spaceComplexity, "O(n)");
  assert.ok(bf.limitations.some(l => l.includes("constant extra space")), "Notes in-place constraint violation");

  assert.equal(imp.available, true);
  assert.equal(imp.timeComplexity, "O(n)");
  assert.equal(imp.spaceComplexity, "O(n)");
  assert.ok(imp.technique.includes("Buffer"), "Improved identifies buffer technique");

  assert.equal(opt.available, true);
  assert.equal(opt.timeComplexity, "O(n)");
  assert.equal(opt.spaceComplexity, "O(1)");
  assert.ok(opt.correctnessReasoning.includes("write <= read"), "Explains in-place write invariant");
  assert.ok(opt.code.includes("int compress(char[] chars)"), "Java LeetCode signature for #443");
});

test("Module 4: Canonical #1679 Max Number of K-Sum Pairs frequency map vs sort+two-pointer", () => {
  const problem = {
    problemSlug: "max-number-of-k-sum-pairs",
    problemTitle: "Max Number of K-Sum Pairs",
    problemNumber: 1679
  };

  const res = generateMultiTierSolutions({ problem, language: "cpp" });
  const bf = res.solutions.bruteForce;
  const imp = res.solutions.improved;
  const opt = res.solutions.optimal;

  assert.equal(bf.timeComplexity, "O(n²)");
  assert.equal(imp.timeComplexity, "O(n log n)");
  assert.equal(imp.spaceComplexity, "O(1)");
  assert.ok(imp.technique.includes("Sorting"), "Improved uses Sorting + Two Pointers");

  assert.equal(opt.timeComplexity, "O(n)");
  assert.equal(opt.spaceComplexity, "O(n)");
  assert.ok(opt.technique.includes("Hash Map"), "Optimal uses Hash Map");
  assert.ok(opt.code.includes("unordered_map"), "C++ uses unordered_map for optimal");
});

test("Module 4: Standalone problem without submission ID resolves and generates multi-tier package", () => {
  const problem = {
    problemTitle: "392. Is Subsequence",
    problemSlug: "is-subsequence"
  };

  const res = generateMultiTierSolutions({
    problem,
    language: "python3",
    studentCode: "class Solution:\n    def isSubsequence(self, s: str, t: str) -> bool:\n        return True"
  });

  assert.ok(res.solutions.bruteForce.code);
  assert.ok(res.solutions.improved.code);
  assert.ok(res.solutions.optimal.code);
  assert.ok(Array.isArray(res.solutionComparison));
  assert.ok(res.solutionComparison.length >= 3);
});

test("Module 4: Student Code Comparison detects optimal vs quadratic implementation accurately", () => {
  const problem = { problemSlug: "is-subsequence", problemTitle: "Is Subsequence", problemNumber: 392 };

  // 1. Optimal student code
  const optimalCode = `class Solution {
    public boolean isSubsequence(String s, String t) {
        int i = 0, j = 0;
        while (i < s.length() && j < t.length()) {
            if (s.charAt(i) == t.charAt(j)) i++;
            j++;
        }
        return i == s.length();
    }
}`;
  const compOpt = compareStudentImplementation({
    studentCode: optimalCode,
    language: "java",
    solutions: generateMultiTierSolutions({ problem, language: "java" }).solutions,
    problem,
    verdict: "Accepted"
  });

  assert.equal(compOpt.available, true);
  assert.equal(compOpt.asymptoticallyOptimal, true);
  assert.ok(compOpt.matchesApproach.includes("Two Pointers"), "Identifies two pointers match");
  assert.equal(compOpt.studentTime, "O(|s| + |t|)");
  assert.equal(compOpt.studentSpace, "O(1)");

  // 2. Quadratic student code
  const bruteCode = `class Solution {
    public boolean isSubsequence(String s, String t) {
        int last = -1;
        for (int i = 0; i < s.length(); i++) {
            boolean found = false;
            for (int j = 0; j < t.length(); j++) {
                if (j > last && s.charAt(i) == t.charAt(j)) {
                    last = j;
                    found = true;
                    break;
                }
            }
            if (!found) return false;
        }
        return true;
    }
}`;
  const compBf = compareStudentImplementation({
    studentCode: bruteCode,
    language: "java",
    solutions: generateMultiTierSolutions({ problem, language: "java" }).solutions,
    problem,
    verdict: "Time Limit Exceeded"
  });

  assert.equal(compBf.available, true);
  assert.equal(compBf.asymptoticallyOptimal, false);
  assert.equal(compBf.studentTime, "O(n²)");
  assert.ok(compBf.recommendation.includes("Two Pointers"), "Recommends two pointers optimization");
});

test("Module 4: Student code unavailable handles missing code gracefully without throwing", () => {
  const problem = { problemSlug: "is-subsequence" };
  const res = generateMultiTierSolutions({
    problem,
    language: "python3",
    studentCode: null
  });

  assert.equal(res.studentComparison.available, false);
  assert.ok(res.studentComparison.unavailableReason.includes("unavailable"));
  assert.ok(res.solutions.optimal.code);
});

test("Module 4: Server-side validation of generated solution packages", () => {
  const problem = { problemSlug: "is-subsequence" };
  const validPackage = generateMultiTierSolutions({ problem, language: "javascript" });

  // Valid package passes
  const check = validateGeneratedSolutions(validPackage, problem, "javascript");
  assert.equal(check.valid, true);

  // Missing optimal code fails validation
  const invalidPackage = {
    solutions: {
      bruteForce: { available: true, code: "console.log(1)", timeComplexity: "O(n²)" },
      optimal: { available: true, code: "", timeComplexity: "O(n)", spaceComplexity: "O(1)" }
    }
  };
  const invalidCheck = validateGeneratedSolutions(invalidPackage, problem, "javascript");
  assert.equal(invalidCheck.valid, false);
  assert.ok(invalidCheck.reason.includes("Optimal solution code"));
});

test("Module 4: Service layer attaches multi-tier solutions and comparisons to reviews", async () => {
  const db = createTestDb();
  const mockProvider = {
    providerName: "mock-gemini",
    model: "gemini-3.5-flash-lite",
    analyze: async () => ({
      provider: "gemini",
      model: "gemini-3.5-flash-lite",
      analysis: {
        summary: "Mock Gemini review",
        sections: [
          { id: "problem-understanding", title: "Overview", content: "Problem understanding." }
        ],
        unavailableSections: []
      }
    })
  };

  const service = createAiCodeMentorService({ db, provider: mockProvider });
  const user = { id: "user_test_module4" };

  const review = await service.createReview(user, {
    problemSlug: "is-subsequence",
    problemTitle: "Is Subsequence",
    problemNumber: 392,
    language: "python3",
    sourceCode: "class Solution:\n    def isSubsequence(self, s: str, t: str) -> bool:\n        i, j = 0, 0\n        while i < len(s) and j < len(t):\n            if s[i] == t[j]: i += 1\n            j += 1\n        return i == len(s)"
  });

  assert.ok(review.analysis.solutions, "Review contains solutions");
  assert.ok(review.analysis.solutions.bruteForce.code, "Contains brute force solution");
  assert.ok(review.analysis.solutions.improved.code, "Contains improved solution");
  assert.ok(review.analysis.solutions.optimal.code, "Contains optimal solution");
  assert.ok(Array.isArray(review.analysis.solutionComparison), "Contains solution comparison table");
  assert.ok(review.analysis.studentComparison, "Contains student comparison");
  assert.equal(review.analysis.studentComparison.asymptoticallyOptimal, true);

  // Test direct generateSolutions method
  const solRes = await service.generateSolutions(user, {
    problemSlug: "is-subsequence",
    language: "java"
  });
  assert.ok(solRes.solutions.optimal.code.includes("class Solution"));
  assert.equal(solRes.selectedLanguage, "java");
});
