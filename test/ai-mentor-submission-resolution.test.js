"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createAiCodeMentorService, mentorError } = require("../ai-code-mentor");
const { createLocalKnowledgeProvider, createUnifiedMentorProvider } = require("../ai-code-mentor-provider");
const { CANONICAL_PROBLEMS } = require("../problem-intelligence-engine");

class MockCollection {
  constructor() { this.docs = []; }
  async findOne(filter) {
    const doc = this.docs.find(d => Object.entries(filter).every(([k, v]) => d[k] === v));
    return doc ? structuredClone(doc) : null;
  }
  find(filter = {}) {
    const list = this.docs.filter(d => {
      return Object.entries(filter).every(([k, v]) => {
        if (v && typeof v === "object" && "$in" in v) {
          return v.$in.includes(d[k]);
        }
        return d[k] === v;
      });
    });
    return {
      sort: () => ({ limit: n => ({ toArray: async () => list.slice(0, n) }) }),
      toArray: async () => structuredClone(list)
    };
  }
  async insertOne(doc) {
    this.docs.push(structuredClone(doc));
    return { insertedId: doc._id };
  }
  async updateOne(filter, update, opts = {}) {
    let doc = this.docs.find(d => Object.entries(filter).every(([k, v]) => {
      if (k === "_id" && typeof v === "string") return d._id === v;
      if (v && typeof v === "object") return true;
      return d[k] === v;
    }));
    if (!doc && opts.upsert) {
      doc = { _id: filter._id || "auto-id" };
      if (update.$setOnInsert) Object.assign(doc, structuredClone(update.$setOnInsert));
      if (update.$set) Object.assign(doc, structuredClone(update.$set));
      this.docs.push(doc);
      return { upsertedCount: 1, matchedCount: 0 };
    }
    if (doc) {
      if (update.$set) Object.assign(doc, structuredClone(update.$set));
      if (update.$inc) {
        for (const [k, v] of Object.entries(update.$inc)) doc[k] = (doc[k] || 0) + v;
      }
      return { matchedCount: 1, upsertedCount: 0 };
    }
    return { matchedCount: 0, upsertedCount: 0 };
  }
  async deleteMany(filter) {
    const initLen = this.docs.length;
    this.docs = this.docs.filter(d => !Object.entries(filter).every(([k, v]) => d[k] === v));
    return { deletedCount: initLen - this.docs.length };
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

const sampleJavaIsSubsequence = `class Solution {
    public boolean isSubsequence(String s, String t) {
        int index = 0;
        int c = 0;
        for (int i = 0; i < s.length(); i++) {
            while (index < t.length()) {
                if (s.charAt(i) == t.charAt(index)) {
                    c++;
                    index++;
                    break;
                }
                index++;
            }
        }
        return c == s.length();
    }
}`;

const user1 = { id: "member-101", email: "student1@dsaverse.com" };
const user2 = { id: "member-202", email: "student2@dsaverse.com" };

// --------------------------------------------------------------------------
// 1. Valid selected submission
// --------------------------------------------------------------------------
test("Submission Resolution: 1. Valid selected submission executes review using stored source and metadata", async () => {
  const db = mockDb();
  await db.collection("dailySubmissionsV2").insertOne({
    _id: "daily:member-101:sub-hash-1",
    userId: user1.id,
    submissionId: "1450001",
    problemTitle: "Is Subsequence",
    problemSlug: "is-subsequence",
    language: "java",
    verdict: "Accepted",
    sourceCode: sampleJavaIsSubsequence
  });

  const localProvider = createLocalKnowledgeProvider();
  const service = createAiCodeMentorService({ db, provider: localProvider });

  const result = await service.createReview(user1, {
    submissionId: "1450001"
  });

  assert.ok(result && result.id);
  assert.equal(result.problemTitle, "Is Subsequence");
  assert.equal(result.language, "java");
  assert.equal(result.analysis.correctnessStatus, "Accepted");
  assert.ok(result.analysis.studentComplexity);
});

// --------------------------------------------------------------------------
// 2. Valid imported code associated with a submission
// --------------------------------------------------------------------------
test("Submission Resolution: 2. Valid imported code associated with a submission takes precedence", async () => {
  const db = mockDb();
  await db.collection("dailySubmissionsV2").insertOne({
    _id: "daily:member-101:sub-hash-2",
    userId: user1.id,
    submissionId: "1450002",
    problemTitle: "Is Subsequence",
    problemSlug: "is-subsequence",
    language: "java",
    verdict: "Accepted",
    sourceCode: null // original not in daily record
  });

  await db.collection("aiUserSavedSources").insertOne({
    _id: `src:${user1.id}:sub:1450002`,
    userId: user1.id,
    submissionId: "1450002",
    problemSlug: "is-subsequence",
    language: "java",
    sourceCode: sampleJavaIsSubsequence,
    sourceProvenance: "manual_import"
  });

  const localProvider = createLocalKnowledgeProvider();
  const service = createAiCodeMentorService({ db, provider: localProvider });

  const result = await service.createReview(user1, {
    submissionId: "1450002"
  });

  assert.ok(result && result.id);
  assert.equal(result.problemTitle, "Is Subsequence");
  assert.equal(result.analysis.correctnessStatus, "Accepted");
});

// --------------------------------------------------------------------------
// 3. Submission exists but source code is unavailable
// --------------------------------------------------------------------------
test("Submission Resolution: 3. Submission exists but source code is unavailable throws 400 SOURCE_CODE_REQUIRED", async () => {
  const db = mockDb();
  await db.collection("dailySubmissionsV2").insertOne({
    _id: "daily:member-101:sub-hash-3",
    userId: user1.id,
    submissionId: "1450003",
    problemTitle: "Is Subsequence",
    problemSlug: "is-subsequence",
    language: "java",
    sourceCode: null
  });

  const localProvider = createLocalKnowledgeProvider();
  const service = createAiCodeMentorService({ db, provider: localProvider });

  await assert.rejects(
    async () => {
      await service.createReview(user1, {
        submissionId: "1450003",
        sourceCode: ""
      });
    },
    (err) => {
      assert.equal(err.status, 400);
      assert.equal(err.code, "SOURCE_CODE_REQUIRED");
      assert.match(err.message, /Original source code is unavailable/);
      return true;
    }
  );
});

// --------------------------------------------------------------------------
// 4. Invalid submission ID
// --------------------------------------------------------------------------
test("Submission Resolution: 4. Invalid submission ID with no source code throws 404 SUBMISSION_NOT_FOUND", async () => {
  const db = mockDb();
  const localProvider = createLocalKnowledgeProvider();
  const service = createAiCodeMentorService({ db, provider: localProvider });

  await assert.rejects(
    async () => {
      await service.createReview(user1, {
        submissionId: "999999999",
        sourceCode: ""
      });
    },
    (err) => {
      assert.equal(err.status, 404);
      assert.equal(err.code, "SUBMISSION_NOT_FOUND");
      assert.match(err.message, /Selected submission was not found/);
      return true;
    }
  );
});

// --------------------------------------------------------------------------
// 5. MongoDB ID versus LeetCode ID mismatch
// --------------------------------------------------------------------------
test("Submission Resolution: 5. Resolves submission identically whether queried by MongoDB _id or LeetCode submissionId", async () => {
  const db = mockDb();
  const mongoDocId = "daily:member-101:hash-sha256-abc";
  const leetcodeSubId = "145987654";

  await db.collection("dailySubmissionsV2").insertOne({
    _id: mongoDocId,
    userId: user1.id,
    submissionId: leetcodeSubId,
    problemTitle: "Is Subsequence",
    problemSlug: "is-subsequence",
    language: "java",
    verdict: "Accepted",
    sourceCode: sampleJavaIsSubsequence
  });

  const localProvider = createLocalKnowledgeProvider();
  const service = createAiCodeMentorService({ db, provider: localProvider });

  // A. Query using MongoDB _id
  const res1 = await service.createReview(user1, { submissionId: mongoDocId });
  assert.equal(res1.problemTitle, "Is Subsequence");

  // B. Query using LeetCode submissionId string
  const res2 = await service.createReview(user1, { submissionId: leetcodeSubId });
  assert.equal(res2.problemTitle, "Is Subsequence");

  // C. Query using numeric submissionId
  const res3 = await service.createReview(user1, { submissionId: Number(leetcodeSubId) });
  assert.equal(res3.problemTitle, "Is Subsequence");
});

// --------------------------------------------------------------------------
// 6. Repeated submissions of the same problem
// --------------------------------------------------------------------------
test("Submission Resolution: 6. Repeated submissions of same problem are distinct and do not overwrite each other", async () => {
  const db = mockDb();

  // Attempt 1: Wrong Answer
  await db.collection("dailySubmissionsV2").insertOne({
    _id: "daily:member-101:attempt-1",
    userId: user1.id,
    submissionId: "sub-101-attempt-1",
    problemTitle: "Is Subsequence",
    problemSlug: "is-subsequence",
    language: "java",
    verdict: "Wrong Answer",
    sourceCode: "class Solution { public boolean isSubsequence(String s, String t) { return false; } }"
  });

  // Attempt 2: Accepted
  await db.collection("dailySubmissionsV2").insertOne({
    _id: "daily:member-101:attempt-2",
    userId: user1.id,
    submissionId: "sub-101-attempt-2",
    problemTitle: "Is Subsequence",
    problemSlug: "is-subsequence",
    language: "java",
    verdict: "Accepted",
    sourceCode: sampleJavaIsSubsequence
  });

  const localProvider = createLocalKnowledgeProvider();
  const service = createAiCodeMentorService({ db, provider: localProvider });

  const rev1 = await service.createReview(user1, { submissionId: "sub-101-attempt-1" });
  assert.equal(rev1.analysis.correctnessStatus, "Wrong Answer");

  const rev2 = await service.createReview(user1, { submissionId: "sub-101-attempt-2" });
  assert.equal(rev2.analysis.correctnessStatus, "Accepted");
});

// --------------------------------------------------------------------------
// 7. Another user's submission ID
// --------------------------------------------------------------------------
test("Submission Resolution: 7. Querying another user's submission ID throws 403 SUBMISSION_FORBIDDEN", async () => {
  const db = mockDb();

  // User 2 owns this submission
  await db.collection("dailySubmissionsV2").insertOne({
    _id: "daily:member-202:private-sub",
    userId: user2.id,
    submissionId: "secret-sub-202",
    problemTitle: "Is Subsequence",
    problemSlug: "is-subsequence",
    language: "java",
    verdict: "Accepted",
    sourceCode: sampleJavaIsSubsequence
  });

  const localProvider = createLocalKnowledgeProvider();
  const service = createAiCodeMentorService({ db, provider: localProvider });

  // User 1 attempts to review User 2's submission
  await assert.rejects(
    async () => {
      await service.createReview(user1, {
        submissionId: "secret-sub-202",
        sourceCode: sampleJavaIsSubsequence
      });
    },
    (err) => {
      assert.equal(err.status, 403);
      assert.equal(err.code, "SUBMISSION_FORBIDDEN");
      assert.match(err.message, /permission to access this submission/);
      return true;
    }
  );
});

// --------------------------------------------------------------------------
// 8. Missing submission ID in standalone mode
// --------------------------------------------------------------------------
test("Submission Resolution: 8. Standalone mode executes review cleanly without any submission ID", async () => {
  const db = mockDb();
  const localProvider = createLocalKnowledgeProvider();
  const service = createAiCodeMentorService({ db, provider: localProvider });

  const result = await service.createReview(user1, {
    submissionId: null,
    problemTitle: "Custom Code Review",
    language: "python3",
    sourceCode: "def twoSum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i\n    return []"
  });

  assert.ok(result && result.id);
  assert.equal(result.language, "python3");
  assert.ok(result.analysis);
});

// --------------------------------------------------------------------------
// 9. Manually pasted code without a saved submission
// --------------------------------------------------------------------------
test("Submission Resolution: 9. Manually pasted code with arbitrary or missing submission ID succeeds", async () => {
  const db = mockDb();
  const localProvider = createLocalKnowledgeProvider();
  const service = createAiCodeMentorService({ db, provider: localProvider });

  // Student pastes Java code for #443 String Compression with an arbitrary submission ID
  const result = await service.createReview(user1, {
    submissionId: "arbitrary-fresh-sub",
    problemTitle: "String Compression",
    problemSlug: "string-compression",
    language: "java",
    sourceCode: "class Solution { public int compress(char[] chars) { int write = 0, read = 0; while (read < chars.length) { char curr = chars[read]; int count = 0; while (read < chars.length && chars[read] == curr) { read++; count++; } chars[write++] = curr; if (count > 1) for (char c : Integer.toString(count).toCharArray()) chars[write++] = c; } return write; } }"
  });

  assert.ok(result && result.id);
  assert.equal(result.problemTitle, "String Compression");
  assert.equal(result.language, "java");
  assert.equal(result.analysis.studentComplexity.spaceComplexity, "O(1)");
});

// --------------------------------------------------------------------------
// 10. Page refresh followed by analysis
// --------------------------------------------------------------------------
test("Submission Resolution: 10. User source saved across refresh is retrievable by getUserSource and analyzable", async () => {
  const db = mockDb();
  const localProvider = createLocalKnowledgeProvider();
  const service = createAiCodeMentorService({ db, provider: localProvider });

  // 1. User imports code for submission 777123
  await service.saveUserSource(user1, {
    submissionId: "777123",
    problemSlug: "is-subsequence",
    problemTitle: "Is Subsequence",
    language: "java",
    sourceCode: sampleJavaIsSubsequence,
    sourceProvenance: "manual_import"
  });

  // 2. User simulates refresh -> frontend calls getUserSource
  const loaded = await service.getUserSource(user1, {
    submissionId: "777123",
    problemSlug: "is-subsequence"
  });
  assert.ok(loaded && loaded.sourceCode);
  assert.equal(loaded.language, "java");

  // 3. User clicks Get AI Analysis
  const review = await service.createReview(user1, {
    submissionId: "777123",
    language: loaded.language
  });
  assert.ok(review && review.id);
  assert.equal(review.analysis.studentComplexity.timeComplexity, "O(|s| + |t|)");
});

// --------------------------------------------------------------------------
// 11. Gemini success
// --------------------------------------------------------------------------
test("Submission Resolution: 11. Gemini provider generates analysis with Gemini attribution", async () => {
  const db = mockDb();
  const mockGeminiClient = {
    models: {
      generateContent: async () => ({
        text: JSON.stringify({
          problemTitle: "Is Subsequence",
          language: "java",
          studentApproach: "Two-pointer forward traversal scanning t monotonically.",
          correctnessStatus: "Accepted",
          mistakeDiagnosis: { hasMistake: false, mistakeType: "None", explanation: "Correct logic.", counterExample: null, suggestedFix: null },
          studentComplexity: { timeComplexity: "O(|s| + |t|)", spaceComplexity: "O(1)", explanation: "Monotonic traversal." },
          bruteForce: { title: "Exhaustive", algorithm: "Generate all subsequences", timeComplexity: "O(2^|t|)", spaceComplexity: "O(|t|)", whySuboptimal: "Exponential." },
          optimalApproach: { title: "Two Pointers Greedy Match", algorithm: "Advance match pointer.", whyItWorks: "Greedy choice.", keyInvariants: "Order preserved." },
          optimalCode: sampleJavaIsSubsequence,
          optimalComplexity: { timeComplexity: "O(|s| + |t|)", spaceComplexity: "O(1)", auxiliarySpace: "O(1)", totalSpace: "O(|s| + |t|)", explanation: "Linear." },
          comparison: [
            { approach: "Student Solution", timeComplexity: "O(|s| + |t|)", spaceComplexity: "O(1)", verdict: "Accepted" }
          ],
          summary: "Student solution is optimal O(|s| + |t|) two-pointer scan."
        })
      })
    }
  };

  const geminiProvider = createUnifiedMentorProvider({
    env: { AI_MENTOR_PROVIDER: "gemini", AI_MENTOR_GEMINI_MODEL: "gemini-3.5-flash-lite", GEMINI_API_KEY: "mock-key" },
    geminiClient: mockGeminiClient
  });

  const service = createAiCodeMentorService({ db, provider: geminiProvider });
  const result = await service.createReview(user1, {
    problemTitle: "Is Subsequence",
    problemSlug: "is-subsequence",
    language: "java",
    sourceCode: sampleJavaIsSubsequence
  });

  assert.ok(result && result.id);
  assert.equal(result.provider, "gemini");
  assert.equal(result.analysis.problemTitle, "Is Subsequence");
});

// --------------------------------------------------------------------------
// 12. Gemini failure and honest local fallback
// --------------------------------------------------------------------------
test("Submission Resolution: 12. Gemini failure falls back honestly to local educational engine with fallback notice", async () => {
  const db = mockDb();
  const mockFailingGeminiClient = {
    models: {
      generateContent: async () => {
        const err = new Error("This model is currently experiencing high demand.");
        err.status = 503;
        throw err;
      }
    }
  };

  const unifiedProvider = createUnifiedMentorProvider({
    env: { AI_MENTOR_PROVIDER: "gemini", AI_MENTOR_GEMINI_MODEL: "gemini-3.5-flash-lite", GEMINI_API_KEY: "mock-key", AI_MENTOR_MAX_RETRIES: "0" },
    geminiClient: mockFailingGeminiClient
  });

  const service = createAiCodeMentorService({ db, provider: unifiedProvider });
  const result = await service.createReview(user1, {
    problemTitle: "Is Subsequence",
    problemSlug: "is-subsequence",
    language: "java",
    sourceCode: sampleJavaIsSubsequence
  });

  assert.ok(result && result.id);
  assert.equal(result.provider, "local");
  assert.match(result.fallbackNotice, /Local Educational Knowledge Engine|local knowledge engine/i);
});
