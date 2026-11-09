"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SUPPORTED_LANGUAGES,
  JUDGE0_LANGUAGE_MAP,
  LIMITS,
  TEST_DELIM_PREFIX,
  normalizeExecutionLanguage,
  normalizeOutput,
  compareOutputs,
  extractProblemTestCases,
  parseInputArguments,
  buildExecutableHarness,
  MockExecutionProvider,
  SandboxedProcessExecutionProvider,
  Judge0ExecutionProvider,
  createExecutionProvider,
  executeCodeSnippet,
  verifyAllSolutions
} = require("../code-execution-engine");

const { createAiCodeMentorService } = require("../ai-code-mentor");
const { retrieveProblem } = require("../problem-intelligence-engine");

// In-memory Mock DB Helper
function createTestDb() {
  const store = {
    aiCodeReviews: new Map(),
    aiReviewSources: new Map(),
    aiMentorUsage: new Map(),
    dailySubmissionsV2: new Map(),
    aiUserSavedSources: new Map(),
    problemOptimalCache: new Map(),
    studentReviewCache: new Map(),
    aiCodeExecutions: new Map()
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
          toArray: async () => Array.from(map.values()).slice(0, lim)
        })
      })
    }),
    insertOne: async (doc) => {
      const _id = doc._id || `id_${Date.now()}_${Math.random()}`;
      map.set(String(_id), { ...doc, _id });
      return { insertedId: _id };
    },
    updateOne: async (filter, update, opts = {}) => {
      let existing = null;
      let existingKey = null;
      for (const [k, v] of map.entries()) {
        let match = true;
        for (const [fk, fv] of Object.entries(filter)) {
          if (v[fk] !== fv) { match = false; break; }
        }
        if (match) { existing = v; existingKey = k; break; }
      }
      if (existing) {
        if (update.$set) Object.assign(existing, update.$set);
        return { modifiedCount: 1 };
      } else if (opts.upsert) {
        const doc = { ...filter, ...(update.$set || {}) };
        const _id = doc._id || `id_${Date.now()}_${Math.random()}`;
        doc._id = _id;
        map.set(String(_id), doc);
        return { upsertedCount: 1, upsertedId: _id };
      }
      return { modifiedCount: 0 };
    }
  });

  return {
    collection: (name) => wrap(store[name] || (store[name] = new Map()))
  };
}

// -------------------------------------------------------------------
// 1. Language Normalization & Centralized Mappings
// -------------------------------------------------------------------
test("Module 5: Language normalization maps variants and preserves 8 supported languages", () => {
  assert.equal(normalizeExecutionLanguage("python"), "python3");
  assert.equal(normalizeExecutionLanguage("py"), "python3");
  assert.equal(normalizeExecutionLanguage("js"), "javascript");
  assert.equal(normalizeExecutionLanguage("ts"), "typescript");
  assert.equal(normalizeExecutionLanguage("c++"), "cpp");
  assert.equal(normalizeExecutionLanguage("golang"), "go");
  assert.equal(normalizeExecutionLanguage("rs"), "rust");
  assert.equal(normalizeExecutionLanguage("java"), "java");

  // Verify all 8 languages have Judge0 language IDs
  for (const lang of ["java", "python3", "cpp", "javascript", "typescript", "go", "rust"]) {
    assert.ok(JUDGE0_LANGUAGE_MAP[lang], `Language ${lang} must map to a Judge0 ID`);
  }
});

// -------------------------------------------------------------------
// 2. Output Normalization & Comparison
// -------------------------------------------------------------------
test("Module 5: Output normalization handles booleans, numbers, JSON arrays, and floats", () => {
  assert.equal(normalizeOutput("True"), "true");
  assert.equal(normalizeOutput("FALSE"), "false");
  assert.equal(normalizeOutput(" 42 \n"), "42");
  assert.equal(normalizeOutput("[ 1,  2, 3 ]"), "[1,2,3]");
  assert.equal(normalizeOutput('"hello"'), "hello");

  // Comparison matching
  assert.equal(compareOutputs("true", "true").status, "passed");
  assert.equal(compareOutputs("True", "true").status, "passed");
  assert.equal(compareOutputs("[1, 2, 3]", "[1,2,3]").status, "passed");
  assert.equal(compareOutputs("0.30000001", "0.3").status, "passed");
  assert.equal(compareOutputs("false", "true").status, "failed");
  assert.equal(compareOutputs("42", null).status, "unverified");
});

// -------------------------------------------------------------------
// 3. LeetCode Argument Parsing & Harness Generation
// -------------------------------------------------------------------
test("Module 5: Parses LeetCode key-value argument strings accurately", () => {
  const args1 = parseInputArguments('s = "abc", t = "ahbgdc"');
  assert.deepEqual(args1, ['"abc"', '"ahbgdc"']);

  const args2 = parseInputArguments('nums = [1, 2, 3, 4], k = 5');
  assert.deepEqual(args2, ['[1, 2, 3, 4]', '5']);

  const args3 = parseInputArguments('chars = ["a","b","c"]');
  assert.deepEqual(args3, ['["a","b","c"]']);
});

test("Module 5: LeetCode harness generator wraps functions for Python, JS, Java, and C++", () => {
  const prob = retrieveProblem({ problemNumber: 392 }); // Is Subsequence
  const testCases = [{ id: "case-1", input: 's = "abc", t = "ahbgdc"', expectedOutput: "true" }];

  // Python
  const pyHarness = buildExecutableHarness({
    code: "class Solution:\n    def isSubsequence(self, s: str, t: str) -> bool:\n        return True",
    language: "python3",
    problem: prob,
    testCases
  });
  assert.equal(pyHarness.harnessType, "leetcode_function");
  assert.match(pyHarness.wrappedCode, /def __run_dsa_harness/);
  assert.match(pyHarness.wrappedCode, /sol\.isSubsequence/);
  assert.match(pyHarness.wrappedCode, new RegExp(TEST_DELIM_PREFIX));

  // JavaScript
  const jsHarness = buildExecutableHarness({
    code: "var isSubsequence = function(s, t) { return true; };",
    language: "javascript",
    problem: prob,
    testCases
  });
  assert.equal(jsHarness.harnessType, "leetcode_function");
  assert.match(jsHarness.wrappedCode, /function __run_dsa_harness/);

  // Java
  const javaHarness = buildExecutableHarness({
    code: "class Solution { public boolean isSubsequence(String s, String t) { return true; } }",
    language: "java",
    problem: prob,
    testCases
  });
  assert.equal(javaHarness.harnessType, "leetcode_function");
  assert.match(javaHarness.wrappedCode, /public class Main/);
  assert.match(javaHarness.wrappedCode, /sol\.isSubsequence/);

  // C++
  const cppHarness = buildExecutableHarness({
    code: "class Solution { public: bool isSubsequence(string s, string t) { return true; } };",
    language: "cpp",
    problem: prob,
    testCases
  });
  assert.equal(cppHarness.harnessType, "leetcode_function");
  assert.match(cppHarness.wrappedCode, /int main\(\)/);
});

// -------------------------------------------------------------------
// 4. Test Execution & Evaluation (All Passed, Some Failed, Compilation Error)
// -------------------------------------------------------------------
test("Module 5: executeCodeSnippet evaluates all test cases passing", async () => {
  const prob = retrieveProblem({ problemNumber: 392 });
  const mockProvider = new MockExecutionProvider();

  const result = await executeCodeSnippet({
    sourceCode: "class Solution:\n    def isSubsequence(self, s, t):\n        return True",
    language: "python3",
    problem: prob,
    provider: mockProvider
  });

  assert.equal(result.success, true);
  assert.equal(result.status, "passed");
  assert.equal(result.verificationLevel, "verified");
  assert.equal(result.testSummary.passed, result.testSummary.total);
  assert.equal(result.testSummary.failed, 0);
  assert.ok(result.results.length > 0);
  assert.equal(result.results[0].status, "passed");
});

test("Module 5: executeCodeSnippet accurately flags failing test cases", async () => {
  const prob = retrieveProblem({ problemNumber: 392 });
  // Force example-2 to fail
  const mockProvider = new MockExecutionProvider({ failTestCaseId: "example-2" });

  const result = await executeCodeSnippet({
    sourceCode: "class Solution:\n    def isSubsequence(self, s, t):\n        return True",
    language: "python3",
    problem: prob,
    provider: mockProvider
  });

  assert.equal(result.success, true);
  assert.equal(result.status, "failed");
  assert.equal(result.verificationLevel, "failed");
  assert.equal(result.testSummary.failed, 1);
  assert.equal(result.results.find(r => r.testCaseId === "example-2")?.status, "failed");
});

test("Module 5: executeCodeSnippet handles compilation error and timeout gracefully", async () => {
  const prob = retrieveProblem({ problemNumber: 392 });

  // Compilation Error
  const compileErrorProvider = new MockExecutionProvider({ forceCompileError: true });
  const compResult = await executeCodeSnippet({
    sourceCode: "class Solution { broken syntax",
    language: "java",
    problem: prob,
    provider: compileErrorProvider
  });
  assert.equal(compResult.status, "compilation_error");
  assert.equal(compResult.verificationLevel, "failed");
  assert.ok(compResult.errors.length > 0);

  // Timeout / TLE
  const timeoutProvider = new MockExecutionProvider({ forceTimeout: true });
  const timeoutResult = await executeCodeSnippet({
    sourceCode: "while True: pass",
    language: "python3",
    problem: prob,
    provider: timeoutProvider
  });
  assert.equal(timeoutResult.status, "time_limit_exceeded");
  assert.equal(timeoutResult.verificationLevel, "failed");
});

// -------------------------------------------------------------------
// 5. Multi-Tier Solution Verification (Module 4 Integration)
// -------------------------------------------------------------------
test("Module 5: verifyAllSolutions independently verifies Brute Force, Improved, Optimal, and Student Submission", async () => {
  const prob = retrieveProblem({ problemNumber: 392 });
  const mockProvider = new MockExecutionProvider();

  const solutions = {
    optimal: { code: "class Solution:\n    def isSubsequence(self, s, t): return True", available: true },
    bruteForce: { code: "class Solution:\n    def isSubsequence(self, s, t): return True", available: true },
    improved: { code: "class Solution:\n    def isSubsequence(self, s, t): return True", available: true }
  };
  const studentCode = "class Solution:\n    def isSubsequence(self, s, t): return True";

  const result = await verifyAllSolutions({
    solutions,
    studentCode,
    submissionVerdict: "Accepted",
    language: "python3",
    problem: prob,
    provider: mockProvider
  });

  assert.equal(result.success, true);
  assert.ok(result.solutions.optimal);
  assert.equal(result.solutions.optimal.status, "passed");
  assert.ok(result.solutions.bruteForce);
  assert.equal(result.solutions.bruteForce.status, "passed");
  assert.ok(result.solutions.improved);
  assert.equal(result.solutions.improved.status, "passed");
  assert.ok(result.solutions.studentSubmission);
  assert.equal(result.solutions.studentSubmission.status, "passed");
  assert.equal(result.solutions.studentSubmission.officialVerdict, "Accepted");
});

test("Module 5: verifyAllSolutions reports not_run when student code is absent without faking data", async () => {
  const prob = retrieveProblem({ problemNumber: 392 });
  const mockProvider = new MockExecutionProvider();

  const solutions = {
    optimal: { code: "class Solution:\n    def isSubsequence(self, s, t): return True", available: true }
  };

  const result = await verifyAllSolutions({
    solutions,
    studentCode: null, // No student code supplied
    language: "python3",
    problem: prob,
    provider: mockProvider
  });

  assert.equal(result.success, true);
  assert.equal(result.solutions.studentSubmission.status, "not_run");
  assert.equal(result.solutions.studentSubmission.verificationLevel, "not_run");
  assert.ok(result.solutions.studentSubmission.reason.includes("No student source code implementation supplied"));
});

// -------------------------------------------------------------------
// 6. Security Isolation & Environment Sanitization
// -------------------------------------------------------------------
test("Module 5: SandboxedProcessExecutionProvider strips sensitive environment variables", async () => {
  const provider = new SandboxedProcessExecutionProvider({ timeoutMs: 3000 });

  // Python code that prints environment keys
  const probeScript = `
import os, sys
keys = list(os.environ.keys())
has_gemini = "GEMINI_API_KEY" in keys
has_mongo = "MONGODB_URI" in keys
print(f"HAS_GEMINI:{has_gemini}")
print(f"HAS_MONGO:{has_mongo}")
sys.exit(0)
`;

  const exec = await provider.execute({
    wrappedCode: probeScript,
    language: "python3"
  });

  assert.equal(exec.status, "completed");
  assert.ok(exec.stdout.includes("HAS_GEMINI:False"), "GEMINI_API_KEY must NOT be exposed to sandbox");
  assert.ok(exec.stdout.includes("HAS_MONGO:False"), "MONGODB_URI must NOT be exposed to sandbox");
});

test("Module 5: Rejects empty source code and oversized payloads exceeding 64KB", async () => {
  const prob = retrieveProblem({ problemNumber: 392 });

  // Empty code
  const emptyRes = await executeCodeSnippet({
    sourceCode: "   ",
    language: "python3",
    problem: prob,
    provider: new MockExecutionProvider()
  });
  assert.equal(emptyRes.success, false);
  assert.equal(emptyRes.status, "unavailable");

  // Oversized code
  const hugeCode = "x = 1\n".repeat(15000); // > 64KB
  const hugeRes = await executeCodeSnippet({
    sourceCode: hugeCode,
    language: "python3",
    problem: prob,
    provider: new MockExecutionProvider()
  });
  assert.equal(hugeRes.success, false);
  assert.equal(hugeRes.status, "failed");
  assert.ok(hugeRes.reason.includes("exceeds allowable limit"));
});

// -------------------------------------------------------------------
// 7. Service Integration, Persistence & Cross-User Security
// -------------------------------------------------------------------
test("Module 5: Service executes, stores history in MongoDB, and prevents cross-user access", async () => {
  const db = createTestDb();
  const mockExecProvider = new MockExecutionProvider();
  const service = createAiCodeMentorService({
    db,
    provider: { model: "mock", analyze: async () => ({}) },
    executionProvider: mockExecProvider
  });

  const userAlice = { id: "user_alice" };
  const userBob = { id: "user_bob" };

  // Alice executes code
  const execAlice = await service.executeCode(userAlice, {
    sourceCode: "class Solution:\n    def isSubsequence(self, s, t): return True",
    language: "python3",
    problemNumber: 392
  });

  assert.equal(execAlice.success, true);
  assert.ok(execAlice.executionId);

  // Alice can retrieve her execution history
  const retrieved = await service.getExecution(userAlice, execAlice.executionId);
  assert.equal(retrieved._id, execAlice.executionId);
  assert.equal(retrieved.userId, "user_alice");

  // Bob CANNOT retrieve Alice's execution history (403 Forbidden)
  await assert.rejects(
    async () => service.getExecution(userBob, execAlice.executionId),
    err => err.code === "EXECUTION_FORBIDDEN" && err.status === 403
  );
});
