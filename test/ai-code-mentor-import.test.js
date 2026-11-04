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
    now: () => new Date("2026-11-04T12:00:00Z")
  });

  return { service, collections };
}

test("1. Accepted submission with imported code saves and retrieves cleanly", async () => {
  const { service } = fixture();
  const user = { id: "student-1" };

  const saved = await service.saveUserSource(user, {
    submissionId: "sub-1001",
    problemSlug: "two-sum",
    problemTitle: "Two Sum",
    language: "python3",
    sourceCode: "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]",
    sourceProvenance: "manual_import"
  });

  assert.equal(saved.saved, true);
  assert.equal(saved.submissionId, "sub-1001");
  assert.equal(saved.sourceProvenance, "manual_import");

  const retrieved = await service.getUserSource(user, { submissionId: "sub-1001" });
  assert.equal(retrieved.submissionId, "sub-1001");
  assert.equal(retrieved.language, "python3");
  assert.match(retrieved.sourceCode, /twoSum/);
  assert.equal(retrieved.sourceProvenance, "manual_import");
});

test("2. Wrong Answer submission with imported code preserves buggy attempt", async () => {
  const { service } = fixture();
  const user = { id: "student-1" };

  const saved = await service.saveUserSource(user, {
    submissionId: "sub-1002",
    problemSlug: "minimum-moves-to-equal-array-elements",
    problemTitle: "Minimum Moves to Equal Array Elements",
    language: "java",
    sourceCode: "class Solution {\n    public int minMoves(int[] nums) {\n        return 0; // buggy\n    }\n}",
    sourceProvenance: "manual_import"
  });

  assert.equal(saved.saved, true);

  const retrieved = await service.getUserSource(user, { submissionId: "sub-1002" });
  assert.equal(retrieved.submissionId, "sub-1002");
  assert.equal(retrieved.language, "java");
  assert.match(retrieved.sourceCode, /return 0; \/\/ buggy/);
});

test("3. Multiple submissions for the same problem maintain isolated records by submissionId", async () => {
  const { service } = fixture();
  const user = { id: "student-1" };

  // Attempt 1: Wrong Answer in Python
  await service.saveUserSource(user, {
    submissionId: "sub-attempt-1",
    problemSlug: "two-sum",
    problemTitle: "Two Sum",
    language: "python3",
    sourceCode: "# Attempt 1: Brute Force\nclass Solution: pass",
    sourceProvenance: "manual_import"
  });

  // Attempt 2: Accepted in Java
  await service.saveUserSource(user, {
    submissionId: "sub-attempt-2",
    problemSlug: "two-sum",
    problemTitle: "Two Sum",
    language: "java",
    sourceCode: "// Attempt 2: Hash Map\nclass Solution {}",
    sourceProvenance: "manual_import"
  });

  // Query attempt 1
  const attempt1 = await service.getUserSource(user, { submissionId: "sub-attempt-1" });
  assert.equal(attempt1.submissionId, "sub-attempt-1");
  assert.equal(attempt1.language, "python3");
  assert.match(attempt1.sourceCode, /Attempt 1/);

  // Query attempt 2
  const attempt2 = await service.getUserSource(user, { submissionId: "sub-attempt-2" });
  assert.equal(attempt2.submissionId, "sub-attempt-2");
  assert.equal(attempt2.language, "java");
  assert.match(attempt2.sourceCode, /Attempt 2/);
});

test("4. Different languages (Java, Python, C++, JS, TS, Go, Rust) are supported", async () => {
  const { service } = fixture();
  const user = { id: "student-polyglot" };

  const testCases = [
    { lang: "java", code: "class Solution {}" },
    { lang: "python3", code: "class Solution:\n    pass" },
    { lang: "cpp", code: "class Solution {};" },
    { lang: "javascript", code: "var twoSum = function() {};" },
    { lang: "typescript", code: "function twoSum(): number[] { return []; }" },
    { lang: "go", code: "func twoSum() []int { return nil }" },
    { lang: "rust", code: "impl Solution {}" }
  ];

  for (const { lang, code } of testCases) {
    const saved = await service.saveUserSource(user, {
      submissionId: `sub-${lang}`,
      problemSlug: "problem-polyglot",
      language: lang,
      sourceCode: code,
      sourceProvenance: "manual_import"
    });
    assert.equal(saved.saved, true);
    assert.equal(saved.language, lang);

    const retrieved = await service.getUserSource(user, { submissionId: `sub-${lang}` });
    assert.equal(retrieved.language, lang);
    assert.equal(retrieved.sourceCode, code);
  }
});

test("5. Deletion / removal of imported code removes both submissionId and slug records", async () => {
  const { service } = fixture();
  const user = { id: "student-1" };

  await service.saveUserSource(user, {
    submissionId: "sub-to-delete",
    problemSlug: "problem-to-delete",
    language: "python3",
    sourceCode: "print('delete me')",
    sourceProvenance: "manual_import"
  });

  const beforeDelete = await service.getUserSource(user, { submissionId: "sub-to-delete" });
  assert.equal(beforeDelete.sourceCode, "print('delete me')");

  const deleteResult = await service.deleteUserSource(user, {
    submissionId: "sub-to-delete",
    problemSlug: "problem-to-delete"
  });
  assert.equal(deleteResult.deleted, true);
  assert.ok(deleteResult.count >= 1);

  const afterDelete = await service.getUserSource(user, { submissionId: "sub-to-delete" });
  assert.equal(afterDelete.sourceCode, null);
});

test("6. Cross-user isolation: User B cannot access or modify User A's private source code", async () => {
  const { service } = fixture();
  const alice = { id: "user-alice" };
  const bob = { id: "user-bob" };

  await service.saveUserSource(alice, {
    submissionId: "alice-sub-1",
    problemSlug: "secret-problem",
    language: "python3",
    sourceCode: "# Alice's private solution",
    sourceProvenance: "manual_import"
  });

  // Bob attempts to read Alice's submission
  const bobRead = await service.getUserSource(bob, { submissionId: "alice-sub-1" });
  assert.equal(bobRead.sourceCode, null);

  // Bob attempts to read by slug
  const bobSlugRead = await service.getUserSource(bob, { problemSlug: "secret-problem" });
  assert.equal(bobSlugRead.sourceCode, null);

  // Bob attempts to delete Alice's submission
  const bobDelete = await service.deleteUserSource(bob, { submissionId: "alice-sub-1" });
  assert.equal(bobDelete.count, 0);

  // Alice's code remains completely untouched
  const aliceRead = await service.getUserSource(alice, { submissionId: "alice-sub-1" });
  assert.equal(aliceRead.sourceCode, "# Alice's private solution");
});

test("7. Bulk status check (listUserSources) accurately reports availability dictionary", async () => {
  const { service } = fixture();
  const user = { id: "student-bulk" };

  await service.saveUserSource(user, {
    submissionId: "sub-bulk-1",
    problemSlug: "problem-bulk-1",
    language: "java",
    sourceCode: "class A {}",
    sourceProvenance: "manual_import"
  });

  const status = await service.listUserSources(user, {
    submissionIds: ["sub-bulk-1", "sub-bulk-nonexistent"],
    problemSlugs: ["problem-bulk-1", "problem-bulk-nonexistent"]
  });

  assert.equal(status.sources["sub-bulk-1"]?.hasCode, true);
  assert.equal(status.sources["problem-bulk-1"]?.hasCode, true);
  assert.equal(status.sources["sub-bulk-nonexistent"], undefined);
  assert.equal(status.sources["problem-bulk-nonexistent"], undefined);
});

test("8. Frontend HTML and CSS contain all required Import modal and button elements", () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const styleCss = fs.readFileSync(path.join(__dirname, "../style.css"), "utf8");

  assert.match(indexHtml, /id="mentorImportModal"/, "index.html must have #mentorImportModal");
  assert.match(indexHtml, /id="mentorImportCodeBtn"/, "index.html must have #mentorImportCodeBtn");
  assert.match(indexHtml, /id="mentorNoticeImportBtn"/, "index.html must have #mentorNoticeImportBtn");
  assert.match(indexHtml, /id="mentorReplaceCodeBtn"/, "index.html must have #mentorReplaceCodeBtn");
  assert.match(indexHtml, /id="mentorRemoveCodeBtn"/, "index.html must have #mentorRemoveCodeBtn");
  assert.match(indexHtml, /id="mentorImportPasteClipboardBtn"/, "index.html must have #mentorImportPasteClipboardBtn");
  assert.match(indexHtml, /id="mentorImportFileInput"/, "index.html must have #mentorImportFileInput");
  assert.match(indexHtml, /id="mentorImportTextarea"/, "index.html must have #mentorImportTextarea");
  assert.match(indexHtml, /id="mentorImportSaveBtn"/, "index.html must have #mentorImportSaveBtn");

  assert.match(styleCss, /\.mentor-modal-overlay/, "style.css must have .mentor-modal-overlay");
  assert.match(styleCss, /\.mentor-modal-card/, "style.css must have .mentor-modal-card");
  assert.match(styleCss, /\.badge-source-status/, "style.css must have .badge-source-status");
  assert.match(styleCss, /\.btn-import-source-quick/, "style.css must have .btn-import-source-quick");
});

test("9. Frontend script.js implements full modal workflow and delegation", () => {
  const scriptJs = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");

  assert.match(scriptJs, /function openImportCodeModal/, "script.js must define openImportCodeModal");
  assert.match(scriptJs, /function closeImportCodeModal/, "script.js must define closeImportCodeModal");
  assert.match(scriptJs, /function saveImportedSourceCode/, "script.js must define saveImportedSourceCode");
  assert.match(scriptJs, /function removeImportedSourceCode/, "script.js must define removeImportedSourceCode");
  assert.match(scriptJs, /btn-import-source-quick/, "script.js must support quick import button");
  assert.match(scriptJs, /updateDailySourceStatuses/, "script.js must batch-update card source badges");
});
