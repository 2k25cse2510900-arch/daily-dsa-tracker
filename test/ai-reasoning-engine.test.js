"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validateRequest,
  validateAnalysis,
  createAiCodeMentorService,
  instructionsFor,
  SECTION_IDS
} = require("../ai-code-mentor");

const {
  CANONICAL_PROBLEMS,
  retrieveProblem,
  buildGeminiPromptContext
} = require("../problem-intelligence-engine");

const {
  createLocalKnowledgeProvider,
  createUnifiedMentorProvider,
  UNIVERSAL_ANALYSIS_SCHEMA
} = require("../ai-code-mentor-provider");

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

test("Module 2: SECTION_IDS whitelist includes staged reasoning section IDs", () => {
  assert.ok(SECTION_IDS.has("core-observations"), "SECTION_IDS must include core-observations");
  assert.ok(SECTION_IDS.has("improved-approach"), "SECTION_IDS must include improved-approach");
  assert.ok(SECTION_IDS.has("correctness-reasoning"), "SECTION_IDS must include correctness-reasoning");
});

test("Module 2: Canonical curriculum models contain complete 8-stage reasoning structures", () => {
  const problems = [
    { slug: "is-subsequence", number: 392 },
    { slug: "string-compression", number: 443 },
    { slug: "max-number-of-k-sum-pairs", number: 1679 }
  ];

  for (const { slug, number } of problems) {
    const prob = retrieveProblem({ problemSlug: slug });
    assert.ok(prob, `Problem #${number} (${slug}) must be retrievable`);

    // Stage 1: Problem Understanding
    assert.ok(prob.whatItAsks, `Problem #${number} must have whatItAsks`);
    assert.ok(prob.inputOutput, `Problem #${number} must have inputOutput`);
    assert.ok(prob.constraints, `Problem #${number} must have constraints`);

    // Stage 2: Core Observations
    assert.ok(Array.isArray(prob.coreObservations) && prob.coreObservations.length >= 2,
      `Problem #${number} must have at least 2 coreObservations`);

    // Stage 3: Brute Force Baseline
    assert.ok(prob.bruteForceTitle, `Problem #${number} must have bruteForceTitle`);
    assert.ok(prob.bruteForceExplain, `Problem #${number} must have bruteForceExplain`);
    assert.ok(prob.bruteForceTime, `Problem #${number} must have bruteForceTime`);
    assert.ok(prob.bruteForceSpace, `Problem #${number} must have bruteForceSpace`);

    // Stage 4: Improved / Alternative Approach
    assert.ok(prob.improvedApproach, `Problem #${number} must have improvedApproach`);
    assert.ok(prob.improvedApproach.title, `Problem #${number} improvedApproach must have title`);
    assert.ok(prob.improvedApproach.algorithm, `Problem #${number} improvedApproach must have algorithm`);

    // Stage 5: Optimal Approach
    assert.ok(prob.optimalTitle, `Problem #${number} must have optimalTitle`);
    assert.ok(prob.optimalExplain, `Problem #${number} must have optimalExplain`);
    assert.ok(prob.optimalTime, `Problem #${number} must have optimalTime`);
    assert.ok(prob.optimalSpace, `Problem #${number} must have optimalSpace`);

    // Stage 6: Correctness Reasoning with Invariants
    assert.ok(prob.correctnessReasoning, `Problem #${number} must have correctnessReasoning`);
    assert.ok(prob.correctnessReasoning.keyInvariant, `Problem #${number} must have keyInvariant`);
    assert.ok(prob.correctnessReasoning.explanation, `Problem #${number} must have explanation`);

    // Stage 7: Complexity Reasoning (Derivations from pointer behavior)
    assert.ok(prob.complexityAnalysis, `Problem #${number} must have complexityAnalysis`);
    assert.ok(prob.complexityAnalysis.derivation, `Problem #${number} must have derivation`);
    assert.ok(prob.complexityAnalysis.pointerMovement, `Problem #${number} must have pointerMovement`);

    // Stage 8: Key Takeaways & Comparison
    assert.ok(Array.isArray(prob.keyTakeaways) && prob.keyTakeaways.length >= 2,
      `Problem #${number} must have keyTakeaways`);
    assert.ok(Array.isArray(prob.codeComparison) && prob.codeComparison.length >= 2,
      `Problem #${number} must have codeComparison`);
  }
});

test("Module 2: LeetCode #392 complexity reasoning correctly explains linear non-reset pointer progression", () => {
  const prob = retrieveProblem({ problemNumber: 392 });
  assert.equal(prob.timeComplexity, "O(|s| + |t|)");
  assert.equal(prob.spaceComplexity, "O(1)");
  assert.equal(prob.auxiliarySpace, "O(1)");

  const timeDeriv = prob.complexityAnalysis.derivation;
  assert.match(timeDeriv, /linear|pointer|bounded/i);
  assert.match(timeDeriv, /never reset|monotonic|at most/i);
  assert.match(timeDeriv, /\|s\| \+ \|t\|/i);

  const spaceDeriv = prob.spaceExplain;
  assert.match(spaceDeriv, /O\(1\)/);
});

test("Module 2: LeetCode #443 complexity reasoning correctly explains two-pointer in-place write", () => {
  const prob = retrieveProblem({ problemNumber: 443 });
  assert.equal(prob.timeComplexity, "O(n)");
  assert.equal(prob.spaceComplexity, "O(1)");
  assert.equal(prob.auxiliarySpace, "O(1)");

  const timeDeriv = prob.complexityAnalysis.derivation;
  assert.match(timeDeriv, /linear|scans each|once/i);

  const ptrMovement = prob.complexityAnalysis.pointerMovement;
  assert.match(ptrMovement, /write\s*<=\s*read/i);
});

test("Module 2: LeetCode #1679 reasoning compares Hash Map vs Sorting two-pointer honest trade-offs", () => {
  const prob = retrieveProblem({ problemNumber: 1679 });
  assert.equal(prob.timeComplexity, "O(n)");
  assert.equal(prob.spaceComplexity, "O(n)");

  // Improved approach documents O(n log n) sort + O(1) space two-pointer approach
  const imp = prob.improvedApproach;
  assert.match(imp.title, /Sort/i);
  assert.match(imp.timeComplexity, /O\(n log n\)/);
  assert.match(imp.spaceComplexity, /O\(1\)/);

  // Optimal approach documents O(n) time with hash map frequency counts
  assert.match(prob.optimalTitle, /Hash Map/i);
  assert.match(prob.optimalTime, /O\(n\)/);
  assert.match(prob.optimalSpace, /O\(n\)/);

  // Code comparison acknowledges honest asymptotic trade-off
  const comp = prob.codeComparison;
  assert.ok(comp.some(c => c.timeComplexity === "O(n log n)" && c.auxiliarySpace === "O(1)"),
    "Comparison must include O(n log n) time / O(1) space variant");
  assert.ok(comp.some(c => c.timeComplexity === "O(n)" && c.auxiliarySpace === "O(n)"),
    "Comparison must include O(n) time / O(n) space variant");
});

test("Module 2: Local Knowledge Provider generates full staged reasoning for verified problems", async () => {
  const localProvider = createLocalKnowledgeProvider();

  const res = await localProvider.analyze({
    problemSlug: "is-subsequence",
    language: "java"
  });

  assert.ok(res, "Result must not be null");
  assert.equal(res.provider, "local");
  const analysis = res.analysis;
  assert.ok(analysis.provenance, "Must include provenance metadata");
  assert.equal(analysis.provenance.provider, "local");
  assert.equal(analysis.provenance.isVerifiedCurriculum, true);

  // Validate staged reasoning fields
  assert.ok(Array.isArray(analysis.coreObservations) && analysis.coreObservations.length > 0,
    "Result must include coreObservations");
  assert.ok(analysis.improvedApproach, "Result must include improvedApproach");
  assert.ok(analysis.correctnessReasoning, "Result must include correctnessReasoning");
  assert.ok(analysis.complexityAnalysis, "Result must include complexityAnalysis");
  assert.ok(analysis.complexityAnalysis.derivation, "Result must include derivation");
  assert.ok(Array.isArray(analysis.codeComparison) && analysis.codeComparison.length > 0,
    "Result must include codeComparison");
  assert.ok(Array.isArray(analysis.keyTakeaways) && analysis.keyTakeaways.length > 0,
    "Result must include keyTakeaways");
});

test("Module 2: validateAnalysis synthesizes staged reasoning sections when missing", () => {
  const rawAnalysis = {
    summary: "Two pointer optimal solution",
    studentApproach: "Two-pointer linear sweep",
    coreObservations: [
      "Subsequence preserves relative order without requiring contiguity.",
      "Greedy matching of first occurrence in t is always optimal."
    ],
    improvedApproach: {
      title: "Binary Search on Index Lists",
      intuition: "Precompute character indices in t for multi-query subsequence checks.",
      algorithm: "Map characters to sorted lists of indices; binary search for next match.",
      timeComplexity: "O(|s| log |t|)",
      spaceComplexity: "O(|t|)",
      tradeOff: "Trades memory and precomputation for fast repeated queries."
    },
    correctnessReasoning: {
      keyInvariant: "At step i, s[0..i-1] has been successfully matched against t[0..j-1].",
      explanation: "By mathematical induction, matching earliest character preserves maximal freedom."
    },
    complexityAnalysis: {
      derivation: "Both pointers advance monotonically without backtracking: O(|s| + |t|).",
      auxiliarySpace: "O(1)"
    },
    optimalApproach: {
      title: "Greedy Two-Pointer Scan",
      algorithm: "Advance j through t; when s[i] == t[j], advance i.",
      whyItWorks: "Greedy choice property holds for subsequence verification."
    },
    sections: []
  };

  const validated = validateAnalysis(rawAnalysis);
  assert.ok(validated);

  const secIds = validated.sections.map(s => s.id);
  assert.ok(secIds.includes("core-observations"), "Must synthesize core-observations into sections");
  assert.ok(secIds.includes("improved-approach"), "Must synthesize improved-approach into sections");
  assert.ok(secIds.includes("correctness-reasoning"), "Must synthesize correctness-reasoning into sections");
});

test("Module 2: Independent student-code analysis across verdicts via service", async () => {
  const db = mockDb();
  const localProvider = createLocalKnowledgeProvider();
  const service = createAiCodeMentorService({ db, provider: localProvider });
  const user = { id: "test-user-1", email: "user@dsaverse.com" };

  // 1. Accepted solution
  const acceptedReview = await service.createReview(user, {
    problemTitle: "Is Subsequence",
    problemSlug: "is-subsequence",
    problemNumber: 392,
    language: "java",
    sourceCode: "class Solution { public boolean isSubsequence(String s, String t) { int i=0, j=0; while(i<s.length() && j<t.length()) { if(s.charAt(i)==t.charAt(j)) i++; j++; } return i==s.length(); } }",
    verdict: "Accepted",
    mode: "explain"
  });
  assert.ok(acceptedReview && acceptedReview.analysis);
  assert.equal(acceptedReview.provider, "local");
  assert.equal(acceptedReview.analysis.problemTitle, "Is Subsequence");
  assert.equal(acceptedReview.analysis.studentComplexity.timeComplexity, "O(|s| + |t|)");
  assert.equal(acceptedReview.analysis.studentComplexity.spaceComplexity, "O(1)");

  // 2. Wrong Answer verdict
  const waReview = await service.createReview(user, {
    problemTitle: "Is Subsequence",
    problemSlug: "is-subsequence",
    problemNumber: 392,
    language: "java",
    sourceCode: "class Solution { public boolean isSubsequence(String s, String t) { return false; } }",
    verdict: "Wrong Answer",
    mode: "mistake"
  });
  assert.ok(waReview && waReview.analysis);

  // 3. Time Limit Exceeded (TLE)
  const tleReview = await service.createReview(user, {
    problemTitle: "Is Subsequence",
    problemSlug: "is-subsequence",
    problemNumber: 392,
    language: "java",
    sourceCode: "class Solution { public boolean isSubsequence(String s, String t) { for(int i=0;i<s.length();i++) for(int j=0;j<t.length();j++) {} return true; } }",
    verdict: "Time Limit Exceeded",
    mode: "optimize"
  });
  assert.ok(tleReview && tleReview.analysis);

  // 4. Runtime Error
  const reReview = await service.createReview(user, {
    problemTitle: "Is Subsequence",
    problemSlug: "is-subsequence",
    problemNumber: 392,
    language: "java",
    sourceCode: "class Solution { public boolean isSubsequence(String s, String t) { return s.charAt(100) == 'a'; } }",
    verdict: "Runtime Error",
    mode: "mistake"
  });
  assert.ok(reReview && reReview.analysis);

  // 5. Source Unavailable (Standalone Review without code or with placeholder)
  const noSourceReview = await service.createReview(user, {
    problemTitle: "Is Subsequence",
    problemSlug: "is-subsequence",
    problemNumber: 392,
    language: "java",
    sourceCode: "// Original submitted code unavailable",
    verdict: "Accepted",
    mode: "explain"
  });
  assert.ok(noSourceReview && noSourceReview.analysis);
  assert.ok(noSourceReview.analysis.summary, "Must still provide educational summary");
});

test("Module 2: Unknown custom problem handles free-form review gracefully", async () => {
  const localProvider = createLocalKnowledgeProvider();

  const res = await localProvider.analyze({
    problemSlug: "custom-binary-tree-traversal",
    language: "python3",
    input: "def traverse(root):\n    return [root.val] if root else []"
  });

  assert.ok(res, "Must return analysis for unknown problem");
  assert.equal(res.provider, "local");
  assert.equal(res.analysis.problemTitle, "Unverified LeetCode Problem");
  assert.equal(res.analysis.correctnessStatus, "Unanalyzed");
});

test("Module 2: buildGeminiPromptContext includes Directive 10 for Staged Reasoning Pipeline", () => {
  const prob = retrieveProblem({ problemNumber: 392 });
  const promptContext = buildGeminiPromptContext(prob, "java");

  assert.match(promptContext, /10\.\s*STAGED AI REASONING PIPELINE/i);
  assert.match(promptContext, /Stage 1 \(Problem Understanding\)/i);
  assert.match(promptContext, /Stage 2 \(Core Observations\)/i);
  assert.match(promptContext, /Stage 3 \(Brute Force Reasoning\)/i);
  assert.match(promptContext, /Stage 4 \(Improved Approach\)/i);
  assert.match(promptContext, /Stage 5 \(Optimal Approach\)/i);
  assert.match(promptContext, /Stage 6 \(Correctness Reasoning\)/i);
  assert.match(promptContext, /Stage 7 \(Complexity Reasoning\)/i);
  assert.match(promptContext, /Stage 8 \(Edge Cases & Constraints\)/i);
});

test("Module 2: UNIVERSAL_ANALYSIS_SCHEMA defines optional staged reasoning fields for Gemini structured output", () => {
  const props = UNIVERSAL_ANALYSIS_SCHEMA.properties;
  assert.ok(props.coreObservations, "Schema must include coreObservations");
  assert.equal(props.coreObservations.type, "array");

  assert.ok(props.improvedApproach, "Schema must include improvedApproach");
  assert.equal(props.improvedApproach.type, "object");

  assert.ok(props.correctnessReasoning, "Schema must include correctnessReasoning");
  assert.equal(props.correctnessReasoning.type, "object");

  assert.ok(props.complexityAnalysis, "Schema must include complexityAnalysis");
  assert.equal(props.complexityAnalysis.type, "object");

  assert.ok(props.codeComparison, "Schema must include codeComparison");
  assert.equal(props.codeComparison.type, "array");

  assert.ok(props.keyTakeaways, "Schema must include keyTakeaways");
  assert.equal(props.keyTakeaways.type, "array");

  assert.ok(props.provenance, "Schema must include provenance");
  assert.equal(props.provenance.type, "object");

  // Backwards compatibility check: core schema required fields
  assert.ok(UNIVERSAL_ANALYSIS_SCHEMA.required.includes("summary"));
  assert.ok(!UNIVERSAL_ANALYSIS_SCHEMA.required.includes("coreObservations"));
  assert.ok(!UNIVERSAL_ANALYSIS_SCHEMA.required.includes("improvedApproach"));
});
