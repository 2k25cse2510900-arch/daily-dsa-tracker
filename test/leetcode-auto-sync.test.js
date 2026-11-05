"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createAiCodeMentorService } = require("../ai-code-mentor");

function createMockCollection() {
  const docs = [];
  return {
    docs,
    async insertOne(doc) {
      docs.push({ ...doc });
      return { insertedId: doc._id };
    },
    async findOne(query, options = {}) {
      let matches = docs.filter(doc => {
        for (const [k, v] of Object.entries(query)) {
          if (doc[k] !== v) return false;
        }
        return true;
      });
      if (options.sort?.updatedAt === -1) {
        matches.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      }
      return matches[0] ? { ...matches[0] } : null;
    },
    find(query) {
      let matches = docs.filter(doc => {
        if (query.userId && doc.userId !== query.userId) return false;
        if (query.memberId && doc.memberId !== query.memberId) return false;
        if (query.activityDate && doc.activityDate !== query.activityDate) return false;
        if (query.$or) {
          const matchOr = query.$or.some(clause => {
            if (clause.submissionId?.$in) {
              return clause.submissionId.$in.includes(doc.submissionId);
            }
            if (clause.problemSlug?.$in) {
              return clause.problemSlug.$in.includes(doc.problemSlug);
            }
            return false;
          });
          if (!matchOr) return false;
        }
        return true;
      });
      return {
        sort: () => ({
          toArray: async () => matches.map(d => ({ ...d }))
        }),
        async toArray() {
          return matches.map(d => ({ ...d }));
        }
      };
    },
    async updateOne(filter, update, options = {}) {
      const idx = docs.findIndex(doc => doc._id === filter._id);
      if (idx >= 0) {
        docs[idx] = { ...docs[idx], ...(update.$set || {}) };
        return { matchedCount: 1, modifiedCount: 1 };
      }
      if (options.upsert) {
        const newDoc = { _id: filter._id, ...(update.$set || {}) };
        docs.push(newDoc);
        return { matchedCount: 0, upsertedCount: 1 };
      }
      return { matchedCount: 0, modifiedCount: 0 };
    },
    async deleteMany(filter) {
      const initialLen = docs.length;
      const remaining = docs.filter(doc => {
        if (filter.userId && doc.userId !== filter.userId) return true;
        if (filter.submissionId && doc.submissionId === filter.submissionId) return false;
        if (filter.problemSlug && doc.problemSlug === filter.problemSlug) return false;
        return true;
      });
      const deletedCount = initialLen - remaining.length;
      docs.length = 0;
      docs.push(...remaining);
      return { deletedCount };
    }
  };
}

function fixture() {
  const collections = new Map();
  const getCollection = name => {
    if (!collections.has(name)) collections.set(name, createMockCollection());
    return collections.get(name);
  };
  const db = { collection: getCollection };

  const dummyProvider = {
    providerName: "gemini",
    model: "gemini-3.1-flash-lite",
    async analyze() {
      return {
        summary: "Analysis complete",
        complexity: { timeComplexity: "O(n)", spaceComplexity: "O(1)" }
      };
    }
  };

  const service = createAiCodeMentorService({
    db,
    provider: dummyProvider,
    now: () => new Date("2026-11-05T06:30:00.000Z")
  });

  return { service, db };
}

test("1. Auto-sync saves submission under authenticated member and reflects in sources and daily submissions", async () => {
  const { service, db } = fixture();
  const user = { id: "member-101", name: "Alice" };

  const syncResult = await service.autoSyncSubmission(user, {
    submissionId: "987654321",
    problemSlug: "two-sum",
    problemTitle: "Two Sum",
    questionFrontendId: "1",
    difficulty: "Easy",
    language: "python3",
    verdict: "Accepted",
    runtime: "38 ms",
    memory: "17.4 MB",
    sourceCode: "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]",
    submittedAt: "2026-11-05T06:25:00.000Z",
    problemDescription: "Given an array of integers nums and an integer target...",
    constraints: "2 <= nums.length <= 10^4",
    topicTags: ["Array", "Hash Table"]
  });

  assert.strictEqual(syncResult.success, true);
  assert.strictEqual(syncResult.synced, true);
  assert.strictEqual(syncResult.submissionId, "987654321");
  assert.strictEqual(syncResult.sourceProvenance, "authorized_extension");

  // Verify retrieval via getUserSource
  const fetched = await service.getUserSource(user, { submissionId: "987654321" });
  assert.strictEqual(fetched.sourceProvenance, "authorized_extension");
  assert.strictEqual(fetched.verdict, "Accepted");
  assert.strictEqual(fetched.runtime, "38 ms");
  assert.strictEqual(fetched.language, "python3");
  assert.match(fetched.sourceCode, /def twoSum/);

  // Verify persistence in leetcodeSubmissions collection
  const dailySubs = await db.collection("leetcodeSubmissions").find({ memberId: user.id }).toArray();
  assert.strictEqual(dailySubs.length, 1);
  assert.strictEqual(dailySubs[0].submissionId, "987654321");
  assert.strictEqual(dailySubs[0].problemIdentifier, "two-sum");
  assert.strictEqual(dailySubs[0].verdict, "Accepted");

  // Verify persistence in leetcodeProblems collection
  const problem = await db.collection("leetcodeProblems").findOne({ _id: "two-sum" });
  assert.ok(problem);
  assert.strictEqual(problem.title, "Two Sum");
  assert.strictEqual(problem.difficulty, "Easy");
});

test("2. Multiple submissions of the same problem are preserved individually without overwriting", async () => {
  const { service, db } = fixture();
  const user = { id: "member-101", name: "Alice" };

  // First attempt: Wrong Answer
  await service.autoSyncSubmission(user, {
    submissionId: "sub-1001",
    problemSlug: "two-sum",
    problemTitle: "Two Sum",
    language: "python3",
    verdict: "Wrong Answer",
    sourceCode: "def twoSum(nums, target): return [0, 0]",
    submittedAt: "2026-11-05T06:00:00.000Z"
  });

  // Second attempt: Accepted
  await service.autoSyncSubmission(user, {
    submissionId: "sub-1002",
    problemSlug: "two-sum",
    problemTitle: "Two Sum",
    language: "python3",
    verdict: "Accepted",
    sourceCode: "def twoSum(nums, target): return [0, 1]",
    submittedAt: "2026-11-05T06:10:00.000Z"
  });

  // Both attempts should be queryable by their respective submissionId
  const attempt1 = await service.getUserSource(user, { submissionId: "sub-1001" });
  const attempt2 = await service.getUserSource(user, { submissionId: "sub-1002" });

  assert.strictEqual(attempt1.verdict, "Wrong Answer");
  assert.match(attempt1.sourceCode, /return \[0, 0\]/);

  assert.strictEqual(attempt2.verdict, "Accepted");
  assert.match(attempt2.sourceCode, /return \[0, 1\]/);

  // leetcodeSubmissions collection has 2 records
  const allAttempts = await db.collection("leetcodeSubmissions").find({ memberId: user.id }).toArray();
  assert.strictEqual(allAttempts.length, 2);
});

test("3. Cross-user isolation: User B cannot access or view User A's synced submissions", async () => {
  const { service } = fixture();
  const userA = { id: "member-alice", name: "Alice" };
  const userB = { id: "member-bob", name: "Bob" };

  await service.autoSyncSubmission(userA, {
    submissionId: "sub-alice-1",
    problemSlug: "median-of-two-sorted-arrays",
    sourceCode: "def findMedianSortedArrays(): # Alice's secret solution",
    verdict: "Accepted"
  });

  // User B tries to fetch Alice's submission
  const bobFetch = await service.getUserSource(userB, { submissionId: "sub-alice-1" });
  assert.strictEqual(bobFetch.sourceCode, null, "User B must not see User A's source code");

  // User B tries to list sources
  const bobList = await service.listUserSources(userB, { problemSlugs: ["median-of-two-sorted-arrays"] });
  assert.deepEqual(bobList.sources, {}, "User B list must be empty");
});

test("4. All verdicts (WA, TLE, RE, CE, Accepted) and diagnostic context are captured faithfully", async () => {
  const { service } = fixture();
  const user = { id: "member-tester" };

  const verdictsToTest = [
    { verdict: "Wrong Answer", diag: { actualOutput: "[0,0]", expectedOutput: "[0,1]", testcasesPassed: "45 / 50" } },
    { verdict: "Time Limit Exceeded", diag: { testcasesPassed: "48 / 50" } },
    { verdict: "Runtime Error", diag: { runtimeError: "IndexError: list index out of range" } },
    { verdict: "Compilation Error", diag: { compileError: "SyntaxError: invalid syntax" } },
    { verdict: "Accepted", diag: { testcasesPassed: "50 / 50" } }
  ];

  for (let i = 0; i < verdictsToTest.length; i++) {
    const item = verdictsToTest[i];
    const subId = `sub-verdict-${i}`;
    await service.autoSyncSubmission(user, {
      submissionId: subId,
      problemSlug: "two-sum",
      sourceCode: `def twoSum(): pass # attempt ${i}`,
      verdict: item.verdict,
      diagnosticContext: item.diag
    });

    const res = await service.getUserSource(user, { submissionId: subId });
    assert.strictEqual(res.verdict, item.verdict);
    assert.deepEqual(res.diagnosticContext, item.diag);
  }
});

test("5. Input validation rejects missing source code or missing problem slug", async () => {
  const { service } = fixture();
  const user = { id: "member-validator" };

  await assert.rejects(
    async () => service.autoSyncSubmission(user, { problemSlug: "two-sum" }),
    /Source code is required/
  );

  await assert.rejects(
    async () => service.autoSyncSubmission(user, { sourceCode: "print(1)" }),
    /Problem slug is required/
  );
});

test("6. Manual import fallback remains functional alongside auto-sync", async () => {
  const { service } = fixture();
  const user = { id: "member-manual" };

  const manualRes = await service.saveUserSource(user, {
    problemSlug: "climbing-stairs",
    sourceCode: "def climbStairs(n): return n",
    sourceProvenance: "manual_import",
    language: "python3"
  });

  assert.strictEqual(manualRes.saved, true);
  assert.strictEqual(manualRes.sourceProvenance, "manual_import");

  const fetched = await service.getUserSource(user, { problemSlug: "climbing-stairs" });
  assert.strictEqual(fetched.sourceProvenance, "manual_import");
  assert.match(fetched.sourceCode, /def climbStairs/);
});

test("7. Frontend UI script and HTML correctly support synced and waiting badges", () => {
  const scriptContent = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  assert.match(scriptContent, /✓ Synced/, "script.js must render ✓ Synced badge");
  assert.match(scriptContent, /Waiting for sync/, "script.js must render Waiting for sync");
  assert.match(scriptContent, /Synced LeetCode Submission Loaded/, "script.js must show Synced LeetCode Submission Loaded banner");
});

test("8. Root and public assets maintain 100% byte synchronization", () => {
  const rootScript = fs.readFileSync(path.join(__dirname, "../script.js"));
  const pubScript = fs.readFileSync(path.join(__dirname, "../public/script.js"));
  assert.deepEqual(rootScript, pubScript, "script.js and public/script.js must be byte-identical");

  const rootIndex = fs.readFileSync(path.join(__dirname, "../index.html"));
  const pubIndex = fs.readFileSync(path.join(__dirname, "../public/index.html"));
  assert.deepEqual(rootIndex, pubIndex, "index.html and public/index.html must be byte-identical");

  const rootStyle = fs.readFileSync(path.join(__dirname, "../style.css"));
  const pubStyle = fs.readFileSync(path.join(__dirname, "../public/style.css"));
  assert.deepEqual(rootStyle, pubStyle, "style.css and public/style.css must be byte-identical");
});
