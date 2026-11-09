"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CANONICAL_PROBLEMS,
  VERIFICATION_STATUSES,
  METADATA_COMPLETENESS,
  retrieveProblem,
  resolveProblemIdentity,
  extractSlug,
  extractNumber,
  extractExamples,
  extractConstraints,
  inferInputOutputTypes,
  createCanonicalProblemModel,
  buildGeminiPromptContext
} = require("../problem-intelligence-engine");

const { UNIVERSAL_ANALYSIS_SCHEMA, validateSchemaContract } = require("../ai-code-mentor-provider");
const { AiMentorCache } = require("../ai-mentor-cache");

// -------------------------------------------------------------------
// A. Known problem lookup
// -------------------------------------------------------------------
test("A. Known problem lookup: resolves canonical curriculum problems with high confidence", () => {
  const p1 = retrieveProblem({ problemNumber: 1 });
  assert.equal(p1.slug, "two-sum");
  assert.equal(p1.metadataVerificationStatus, VERIFICATION_STATUSES.VERIFIED);
  assert.equal(p1.isCanonical, true);

  const p287 = retrieveProblem({ problemSlug: "find-the-duplicate-number" });
  assert.equal(p287.number, 287);
  assert.equal(p287.isCanonical, true);

  const p704 = retrieveProblem({ problemTitle: "Binary Search" });
  assert.equal(p704.slug, "binary-search");
  assert.equal(p704.number, 704);
});

// -------------------------------------------------------------------
// B. Unknown problem lookup
// -------------------------------------------------------------------
test("B. Unknown problem lookup: handles arbitrary problems with user-provided statements", () => {
  const unknown = retrieveProblem({
    problemTitle: "Matrix Spiral Path Count",
    problemDescription: "Given an m x n matrix, return the number of distinct spiral paths from top-left to bottom-right.\n\nExample 1:\nInput: m = 3, n = 3\nOutput: 6\n\nConstraints:\n1 <= m, n <= 100"
  });

  assert.equal(unknown.isCanonical, false);
  assert.equal(unknown.metadataVerificationStatus, VERIFICATION_STATUSES.USER_PROVIDED);
  assert.equal(unknown.slug, "matrix-spiral-path-count");
  assert.equal(unknown.examples.length, 1);
  assert.equal(unknown.examples[0].input, "m = 3, n = 3");
  assert.equal(unknown.examples[0].output, "6");
  assert.match(unknown.constraints, /1 <= m, n <= 100/);
});

// -------------------------------------------------------------------
// C. Exact ID/slug matching
// -------------------------------------------------------------------
test("C. Exact ID/slug matching: extracts exact numbers and slugs without fuzzy collisions", () => {
  assert.equal(extractNumber(392), 392);
  assert.equal(extractNumber("#392. Is Subsequence"), 392);
  assert.equal(extractNumber("392 - Is Subsequence"), 392);

  // Negative collision check: "3Sum" must NOT be extracted as #3!
  assert.equal(extractNumber("3Sum"), null, "3Sum must not match problem #3");
  assert.equal(extractNumber("4Sum"), null, "4Sum must not match problem #4");

  assert.equal(extractSlug("https://leetcode.com/problems/is-subsequence/"), "is-subsequence");
  assert.equal(extractSlug("https://leetcode.com/problems/string-compression/description/"), "string-compression");
  assert.equal(extractSlug("max-number-of-k-sum-pairs"), "max-number-of-k-sum-pairs");
});

// -------------------------------------------------------------------
// D. Ambiguous title matching
// -------------------------------------------------------------------
test("D. Ambiguous title matching: detects ambiguity and requests clarification", () => {
  const blank = retrieveProblem({});
  assert.equal(blank.metadataVerificationStatus, VERIFICATION_STATUSES.AMBIGUOUS);
  assert.equal(blank.confidence, "ambiguous");
  assert.equal(blank.clarificationNeeded, true);
});

// -------------------------------------------------------------------
// E. Missing problem descriptions
// -------------------------------------------------------------------
test("E. Missing problem descriptions: marks INSUFFICIENT_CONTEXT for code-only submissions without fabricating statements", () => {
  const codeOnly = retrieveProblem({
    problemTitle: "Custom Code Review",
    sourceCode: "def solve(a, b): return a + b"
  });

  assert.equal(codeOnly.metadataVerificationStatus, VERIFICATION_STATUSES.INSUFFICIENT_CONTEXT);
  assert.equal(codeOnly.statement, "");
  assert.equal(codeOnly.examples.length, 0);
  assert.equal(codeOnly.constraints, null);
  assert.equal(codeOnly.sourceUrl, null, "Must not fabricate a LeetCode URL for custom review");
});

// -------------------------------------------------------------------
// F. Partial metadata
// -------------------------------------------------------------------
test("F. Partial metadata: handles title-only without inventing constraints or examples", () => {
  const partial = retrieveProblem({
    problemTitle: "Unique Path Variations"
  });

  assert.equal(partial.metadataVerificationStatus, VERIFICATION_STATUSES.PARTIALLY_VERIFIED);
  assert.equal(partial.isCanonical, false);
  assert.equal(partial.examples.length, 0, "Must not invent examples");
  assert.equal(partial.constraints, null, "Must not invent constraints");
});

// -------------------------------------------------------------------
// G. Incorrect or mismatched problem IDs
// -------------------------------------------------------------------
test("G. Incorrect or mismatched problem IDs: flags contradiction between ID and slug", () => {
  const mismatched = retrieveProblem({
    problemNumber: 1, // Two Sum
    problemSlug: "is-subsequence" // #392 Is Subsequence
  });

  assert.equal(mismatched.metadataVerificationStatus, VERIFICATION_STATUSES.AMBIGUOUS);
  assert.match(mismatched.ambiguityReason, /Contradiction detected/i);
  assert.match(mismatched.ambiguityReason, /Two Sum/);
  assert.match(mismatched.ambiguityReason, /is-subsequence/);
});

// -------------------------------------------------------------------
// H & I. Reference Problem Case A: LeetCode #392 — Is Subsequence
// -------------------------------------------------------------------
test("P (Case A): LeetCode #392 — Is Subsequence verified string context", () => {
  const p392 = retrieveProblem({ problemNumber: 392 });

  assert.equal(p392.slug, "is-subsequence");
  assert.equal(p392.title, "Is Subsequence");
  assert.equal(p392.difficulty, "Easy");
  assert.equal(p392.metadataVerificationStatus, VERIFICATION_STATUSES.VERIFIED);
  assert.equal(p392.expectedInputType, "String (s), String (t)");
  assert.equal(p392.expectedOutputType, "boolean");

  // Verify signatures across languages
  assert.equal(p392.signatures.java, "public boolean isSubsequence(String s, String t)");
  assert.equal(p392.signatures.python3, "def isSubsequence(self, s: str, t: str) -> bool:");
  assert.equal(p392.signatures.cpp, "bool isSubsequence(string s, string t)");

  // Verify constraints are strictly string-based
  assert.match(p392.constraints, /s\.length/);
  assert.match(p392.constraints, /lowercase English letters/);
  assert.doesNotMatch(p392.constraints, /nums\[i\]/, "Must not contain array element constraints");

  // Verify examples are strings
  assert.ok(p392.examples.length >= 2);
  assert.match(p392.examples[0].input, /s = "abc"/);
  assert.match(p392.examples[0].output, /true/);

  // Negative test: #392 cannot receive #443 metadata
  assert.notEqual(p392.slug, "string-compression");
  assert.doesNotMatch(p392.statement, /array of characters/);
});

// -------------------------------------------------------------------
// P (Case B): LeetCode #443 — String Compression
// -------------------------------------------------------------------
test("P (Case B): LeetCode #443 — String Compression verified in-place character array context", () => {
  const p443 = retrieveProblem({ problemNumber: 443 });

  assert.equal(p443.slug, "string-compression");
  assert.equal(p443.title, "String Compression");
  assert.equal(p443.difficulty, "Medium");
  assert.equal(p443.expectedInputType, "Character Array (chars)");
  assert.match(p443.expectedOutputType, /int/);

  // Verify signatures
  assert.equal(p443.signatures.java, "public int compress(char[] chars)");
  assert.equal(p443.signatures.python3, "def compress(self, chars: List[str]) -> int:");
  assert.equal(p443.signatures.cpp, "int compress(vector<char>& chars)");

  // Verify in-place and return behavior
  assert.match(p443.statement, /in the input character array chars/);
  assert.match(p443.statement, /return the new length/);
  assert.match(p443.constraints, /chars\.length/);

  // Negative test: #443 is not a string subsequence problem
  assert.doesNotMatch(p443.statement, /subsequence/i);
});

// -------------------------------------------------------------------
// P (Case C): LeetCode #1679 — Max Number of K-Sum Pairs
// -------------------------------------------------------------------
test("P (Case C): LeetCode #1679 — Max Number of K-Sum Pairs verified integer array & target context", () => {
  const p1679 = retrieveProblem({ problemNumber: 1679 });

  assert.equal(p1679.slug, "max-number-of-k-sum-pairs");
  assert.equal(p1679.title, "Max Number of K-Sum Pairs");
  assert.equal(p1679.difficulty, "Medium");
  assert.equal(p1679.expectedInputType, "Integer Array (nums), Integer (k)");
  assert.match(p1679.expectedOutputType, /int/);

  assert.equal(p1679.signatures.java, "public int maxOperations(int[] nums, int k)");
  assert.equal(p1679.signatures.python3, "def maxOperations(self, nums: List[int], k: int) -> int:");
  assert.equal(p1679.signatures.cpp, "int maxOperations(vector<int>& nums, int k)");

  assert.match(p1679.statement, /sum equals k/);
  assert.match(p1679.statement, /maximum number of operations/);
  assert.match(p1679.constraints, /1 <= k <= 10\^9/);
});

// -------------------------------------------------------------------
// K. Gemini context payload
// -------------------------------------------------------------------
test("K. Gemini context payload: formats canonical prompt with explicit directives", () => {
  const p392 = retrieveProblem({ problemNumber: 392 });
  const prompt = buildGeminiPromptContext(p392, "python3");

  assert.match(prompt, /Is Subsequence \(LeetCode #392\)/);
  assert.match(prompt, /Expected Input Type: String \(s\), String \(t\)/);
  assert.match(prompt, /Expected Output Type: boolean/);
  assert.match(prompt, /REQUIRED METHOD SIGNATURE \(PYTHON3\):\s*def isSubsequence/);
  assert.match(prompt, /For string problems, NEVER explain the algorithm using integer array analogies/);
  assert.match(prompt, /Do not fabricate LeetCode URLs/);
});

// -------------------------------------------------------------------
// L. Gemini schema compatibility
// -------------------------------------------------------------------
test("L. Gemini schema compatibility: schema contract passes validation", () => {
  assert.doesNotThrow(() => validateSchemaContract(UNIVERSAL_ANALYSIS_SCHEMA));
});

// -------------------------------------------------------------------
// M. Cache isolation
// -------------------------------------------------------------------
test("M. Cache isolation: different problems generate distinct problem cache keys", () => {
  const cache = new AiMentorCache();
  const key1 = cache.buildProblemCacheKey("two-sum", "python3", "gemini");
  const key2 = cache.buildProblemCacheKey("is-subsequence", "python3", "gemini");
  const key3 = cache.buildProblemCacheKey("custom-problem", "python3", "gemini", "hashA");
  const key4 = cache.buildProblemCacheKey("custom-problem", "python3", "gemini", "hashB");

  assert.notEqual(key1, key2);
  assert.notEqual(key3, key4, "Custom problems with different statement hashes must not collide");
});

// -------------------------------------------------------------------
// N. User account isolation
// -------------------------------------------------------------------
test("N. User account isolation: reviews for User A and User B produce distinct hashes", () => {
  const cache = new AiMentorCache();
  const hashUserA = cache.buildStudentReviewHash("user_123", "two-sum", "python3", "explain", "def solve(): pass", "gemini");
  const hashUserB = cache.buildStudentReviewHash("user_999", "two-sum", "python3", "explain", "def solve(): pass", "gemini");

  assert.notEqual(hashUserA, hashUserB, "Hashes for different user IDs must never collide");
});

// -------------------------------------------------------------------
// O. Missing submission ID
// -------------------------------------------------------------------
test("O. Missing submission ID: standalone request resolves problem identity cleanly without submissionId", () => {
  const res = resolveProblemIdentity({
    problemSlug: "is-subsequence",
    problemTitle: "Is Subsequence"
  });

  assert.equal(res.slug, "is-subsequence");
  assert.equal(res.number, 392);
  assert.equal(res.clarificationNeeded, false);
});
