"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  resolveProblemIdentity,
  retrieveProblem,
  CANONICAL_PROBLEMS
} = require("../leetcode-problem-intelligence");

const {
  analyzeStudentCode
} = require("../student-code-intelligence");

const {
  generateMultiTierSolutions,
  validateGeneratedSolutions,
  isPlaceholderCode
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
      for (const [k, doc] of map.entries()) {
        let match = true;
        for (const [qk, qv] of Object.entries(query)) {
          if (doc[qk] !== qv) { match = false; break; }
        }
        if (match) { map.delete(k); return { deletedCount: 1 }; }
      }
      return { deletedCount: 0 };
    }
  });

  return {
    collection: (name) => {
      if (!store[name]) store[name] = new Map();
      return wrap(store[name]);
    }
  };
}

// -------------------------------------------------------------------
// 1. Unseen Problem: #875 Koko Eating Bananas (Binary Search)
// -------------------------------------------------------------------
test("Universal AI Pipeline: #875 Koko Eating Bananas (Binary Search on Answer Space)", async () => {
  const javaCode = `class Solution {
    public int minEatingSpeed(int[] piles, int h) {
        int low = 1, high = 0;
        for (int p : piles) {
            if (p > high) high = p;
        }
        int ans = high;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            long hours = 0;
            for (int p : piles) {
                hours += (p + mid - 1) / mid;
            }
            if (hours <= h) {
                ans = mid;
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }
        return ans;
    }
}`;

  const statement = `Koko loves to eat bananas. There are n piles of bananas...
Example 1:
Input: piles = [3,6,7,11], h = 8
Output: 4

Constraints:
1 <= piles.length <= 10^4
piles.length <= h <= 10^9
1 <= piles[i] <= 10^9`;

  const problem = retrieveProblem({
    problemNumber: 875,
    problemSlug: "koko-eating-bananas",
    problemTitle: "Koko Eating Bananas",
    problemDescription: statement
  });

  assert.equal(problem.metadataVerificationStatus, "USER_PROVIDED");
  assert.ok(problem.constraints.includes("1 <= piles.length <= 10^4"));
  assert.equal(problem.examples.length, 1);

  // Analyze student code
  const intel = analyzeStudentCode({
    sourceCode: javaCode,
    language: "java",
    problem,
    verdict: "Accepted"
  });

  assert.equal(intel.algorithmPattern.pattern, "Binary Search: Monotonic Predicate on Answer Space");
  assert.equal(intel.complexity.timeComplexity, "O(n log m)");
  assert.equal(intel.complexity.auxiliarySpace, "O(1)");
  assert.equal(intel.complexity.isOptimal, true);

  // Dynamic Solution Synthesis via Provider
  const db = createTestDb();
  const mockProvider = {
    providerName: "gemini",
    model: "gemini-3.5-flash-lite",
    analyze: async () => ({
      provider: "gemini",
      model: "gemini-3.5-flash-lite",
      analysis: {
        summary: "Binary search on speed k range [1, max(piles)].",
        optimalApproach: {
          title: "Binary Search on Speed k",
          algorithm: "Binary search over range [1, max(piles)] verifying if Koko finishes within h hours.",
          whyItWorks: "Monotonicity: If speed k allows finishing within h hours, any speed > k also finishes."
        },
        optimalCode: javaCode,
        optimalComplexity: {
          timeComplexity: "O(n log m)",
          spaceComplexity: "O(1)",
          explanation: "Logarithmic binary search steps with linear check per step."
        },
        bruteForce: {
          title: "Linear Search on Speed k",
          algorithm: "Increment k starting from 1 until hours <= h.",
          code: `class Solution {\n    public int minEatingSpeed(int[] piles, int h) {\n        int k = 1;\n        while (true) {\n            long hours = 0;\n            for (int p : piles) hours += (p + k - 1) / k;\n            if (hours <= h) return k;\n            k++;\n        }\n    }\n}`,
          timeComplexity: "O(n · m)",
          spaceComplexity: "O(1)",
          explanation: "Iterates through all possible values of k up to max(piles)."
        }
      }
    })
  };

  const service = createAiCodeMentorService({ db, provider: mockProvider });
  const user = { id: "user_koko" };

  const solutionsRes = await service.generateSolutions(user, {
    problemNumber: 875,
    problemSlug: "koko-eating-bananas",
    problemTitle: "Koko Eating Bananas",
    problemDescription: statement,
    language: "java",
    studentCode: javaCode
  });

  assert.equal(solutionsRes.solutions.optimal.available, true);
  assert.ok(solutionsRes.solutions.optimal.code.includes("class Solution"));
  assert.equal(isPlaceholderCode(solutionsRes.solutions.optimal.code), false);
  assert.equal(solutionsRes.solutions.bruteForce.available, true);
  assert.ok(solutionsRes.solutions.bruteForce.code.includes("class Solution"));
  assert.equal(solutionsRes.studentComparison.asymptoticallyOptimal, true);
});

// -------------------------------------------------------------------
// 2. Unseen Problem: #3 Longest Substring Without Repeating Characters (Sliding Window)
// -------------------------------------------------------------------
test("Universal AI Pipeline: #3 Longest Substring Without Repeating Characters (Sliding Window)", async () => {
  const pyCode = `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        seen = {}
        left = 0
        max_len = 0
        for right, char in enumerate(s):
            if char in seen and seen[char] >= left:
                left = seen[char] + 1
            seen[char] = right
            max_len = max(max_len, right - left + 1)
        return max_len`;

  const statement = `Given a string s, find the length of the longest substring without duplicate characters.
Example 1:
Input: s = "abcabcbb"
Output: 3

Constraints:
0 <= s.length <= 5 * 10^4`;

  const problem = retrieveProblem({
    problemNumber: 3,
    problemSlug: "longest-substring-without-repeating-characters",
    problemTitle: "Longest Substring Without Repeating Characters",
    problemDescription: statement
  });

  const intel = analyzeStudentCode({
    sourceCode: pyCode,
    language: "python3",
    problem,
    verdict: "Accepted"
  });

  assert.equal(intel.algorithmPattern.pattern, "Sliding Window: Dynamic Size Window");
  assert.equal(intel.complexity.timeComplexity, "O(n)");
  assert.equal(intel.complexity.auxiliarySpace, "O(min(m, n))");
});

// -------------------------------------------------------------------
// 3. Unseen Problem: #200 Number of Islands (Graph Traversal DFS)
// -------------------------------------------------------------------
test("Universal AI Pipeline: #200 Number of Islands (Grid DFS Traversal)", async () => {
  const jsCode = `var numIslands = function(grid) {
    if (!grid || grid.length === 0) return 0;
    const m = grid.length;
    const n = grid[0].length;
    let count = 0;

    function dfs(r, c) {
        if (r < 0 || c < 0 || r >= m || c >= n || grid[r][c] !== '1') return;
        grid[r][c] = '0';
        dfs(r + 1, c);
        dfs(r - 1, c);
        dfs(r, c + 1);
        dfs(r, c - 1);
    }

    for (let r = 0; r < m; r++) {
        for (let c = 0; c < n; c++) {
            if (grid[r][c] === '1') {
                count++;
                dfs(r, c);
            }
        }
    }
    return count;
};`;

  const problem = retrieveProblem({
    problemNumber: 200,
    problemSlug: "number-of-islands",
    problemTitle: "Number of Islands"
  });

  const intel = analyzeStudentCode({
    sourceCode: jsCode,
    language: "javascript",
    problem,
    verdict: "Accepted"
  });

  assert.equal(intel.algorithmPattern.pattern, "Graph Traversal: Grid Depth-First Search (DFS)");
  assert.equal(intel.complexity.timeComplexity, "O(m · n)");
  assert.equal(intel.complexity.auxiliarySpace, "O(m · n)");
  assert.equal(intel.complexity.isOptimal, true);
});

// -------------------------------------------------------------------
// 4. Unseen Problem: #198 House Robber (Dynamic Programming)
// -------------------------------------------------------------------
test("Universal AI Pipeline: #198 House Robber (Space-Optimized Dynamic Programming)", async () => {
  const cppCode = `class Solution {
public:
    int rob(vector<int>& nums) {
        int n = nums.size();
        if (n == 0) return 0;
        if (n == 1) return nums[0];
        int prev2 = 0;
        int prev1 = nums[0];
        for (int i = 1; i < n; i++) {
            int take = nums[i] + prev2;
            int notTake = prev1;
            int curr = max(take, notTake);
            prev2 = prev1;
            prev1 = curr;
        }
        return prev1;
    }
};`;

  const problem = retrieveProblem({
    problemNumber: 198,
    problemSlug: "house-robber",
    problemTitle: "House Robber"
  });

  const intel = analyzeStudentCode({
    sourceCode: cppCode,
    language: "cpp",
    problem,
    verdict: "Accepted"
  });

  assert.equal(intel.algorithmPattern.pattern, "Dynamic Programming: State Machine / Space-Optimized Recurrence");
  assert.equal(intel.complexity.timeComplexity, "O(n)");
  assert.equal(intel.complexity.auxiliarySpace, "O(1)");
  assert.equal(intel.complexity.isOptimal, true);
});

// -------------------------------------------------------------------
// 5. Unseen Problem: #739 Daily Temperatures (Monotonic Stack)
// -------------------------------------------------------------------
test("Universal AI Pipeline: #739 Daily Temperatures (Monotonic Decreasing Stack)", async () => {
  const javaCode = `class Solution {
    public int[] dailyTemperatures(int[] temperatures) {
        int n = temperatures.length;
        int[] res = new int[n];
        Deque<Integer> stack = new ArrayDeque<>();
        for (int i = 0; i < n; i++) {
            while (!stack.isEmpty() && temperatures[i] > temperatures[stack.peek()]) {
                int prev = stack.pop();
                res[prev] = i - prev;
            }
            stack.push(i);
        }
        return res;
    }
}`;

  const problem = retrieveProblem({
    problemNumber: 739,
    problemSlug: "daily-temperatures",
    problemTitle: "Daily Temperatures"
  });

  const intel = analyzeStudentCode({
    sourceCode: javaCode,
    language: "java",
    problem,
    verdict: "Accepted"
  });

  assert.equal(intel.algorithmPattern.pattern, "Monotonic Stack: Nearest Greater/Smaller Element");
  assert.equal(intel.complexity.timeComplexity, "O(n)");
  assert.equal(intel.complexity.auxiliarySpace, "O(n)");
  assert.match(intel.complexity.timeDerivation, /amortized/i);
});

// -------------------------------------------------------------------
// 6. Arbitrary User-Supplied Problem Statement (Non-LeetCode Custom Problem)
// -------------------------------------------------------------------
test("Universal AI Pipeline: Arbitrary user-supplied custom problem dynamically ingested and reviewed", async () => {
  const customStatement = `You are given a mountain array of integers altitudes.
Find the peak altitude in O(log n) time.
Example 1:
Input: altitudes = [0, 2, 5, 3, 1]
Output: 5

Constraints:
3 <= altitudes.length <= 10^5
All elements are distinct`;

  const customJavaCode = `class Solution {
    public int peakAltitude(int[] altitudes) {
        int low = 0, high = altitudes.length - 1;
        while (low < high) {
            int mid = low + (high - low) / 2;
            if (altitudes[mid] < altitudes[mid + 1]) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        return altitudes[low];
    }
}`;

  const prob = retrieveProblem({
    problemTitle: "Peak Altitude in Mountain",
    problemDescription: customStatement
  });

  assert.equal(prob.metadataVerificationStatus, "USER_PROVIDED");
  assert.equal(prob.isCanonical, false);
  assert.ok(prob.constraints.includes("3 <= altitudes.length <= 10^5"));
  assert.equal(prob.examples.length, 1);

  const intel = analyzeStudentCode({
    sourceCode: customJavaCode,
    language: "java",
    problem: prob,
    verdict: "Accepted"
  });

  assert.equal(intel.algorithmPattern.pattern, "Binary Search: Direct Key Lookup");
  assert.equal(intel.complexity.timeComplexity, "O(log n)");
  assert.equal(intel.complexity.auxiliarySpace, "O(1)");
});

// -------------------------------------------------------------------
// 7. Strict Validation: Rejection of Placeholder / TODO Stubs
// -------------------------------------------------------------------
test("Universal AI Pipeline: Strict rejection of TODO and placeholder stubs in solution validator", () => {
  // 1. Rejects TODO comment in optimal code
  const todoPackage = {
    solutions: {
      optimal: { available: true, code: "// Optimal Solution\n// TODO: Implement optimal solution\nclass Solution {}", timeComplexity: "O(n)", spaceComplexity: "O(1)" }
    }
  };
  const res1 = validateGeneratedSolutions(todoPackage);
  assert.equal(res1.valid, false);
  assert.ok(res1.reason.includes("placeholder or TODO stubs"));

  // 2. Rejects placeholder method in brute force
  const placeholderPackage = {
    solutions: {
      optimal: { available: true, code: "class Solution { public int solve() { return 1; } }", timeComplexity: "O(n)", spaceComplexity: "O(1)" },
      bruteForce: { available: true, code: "/* placeholder brute force */", timeComplexity: "O(n²)" }
    }
  };
  const res2 = validateGeneratedSolutions(placeholderPackage);
  assert.equal(res2.valid, false);
  assert.ok(res2.reason.includes("placeholder or TODO stubs"));

  // 3. Rejects empty dummy function
  const emptyPackage = {
    solutions: {
      optimal: { available: true, code: "def solve():\n    pass", timeComplexity: "O(n)", spaceComplexity: "O(1)" }
    }
  };
  const res3 = validateGeneratedSolutions(emptyPackage);
  assert.equal(res3.valid, false);
});
