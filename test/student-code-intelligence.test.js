"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  analyzeStudentCode,
  tokenizeSourceLines,
  extractSignatures,
  extractVariablesAndRoles,
  extractLoopsAndNesting,
  extractDataStructures,
  classifyAlgorithmPattern,
  deriveComplexityFromFlow,
  generateLineByLineWalkthrough,
  diagnoseVerdict,
  checkCodeProblemConsistency,
  buildEvidenceBasedFindings,
  prepareAnimaticTrace,
  normalizeLang
} = require("../student-code-intelligence");

const { retrieveProblem } = require("../problem-intelligence-engine");
const { createLocalKnowledgeProvider } = require("../ai-code-mentor-provider");
const { createAiCodeMentorService } = require("../ai-code-mentor");

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

// -------------------------------------------------------------------
// 1. Language Support: Java, Python, C++, JavaScript
// -------------------------------------------------------------------
test("Module 3: Multi-language parsing across Java, Python, C++, and JavaScript", () => {
  const javaCode = `class Solution {
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

  const pyCode = `class Solution:
    def isSubsequence(self, s: str, t: str) -> bool:
        i, j = 0, 0
        while i < len(s) and j < len(t):
            if s[i] == t[j]:
                i += 1
            j += 1
        return i == len(s)`;

  const cppCode = `class Solution {
public:
    bool isSubsequence(string s, string t) {
        int i = 0, j = 0;
        while (i < s.length() && j < t.length()) {
            if (s[i] == t[j]) i++;
            j++;
        }
        return i == s.length();
    }
};`;

  const jsCode = `var isSubsequence = function(s, t) {
    let i = 0, j = 0;
    while (i < s.length && j < t.length) {
        if (s[i] === t[j]) i++;
        j++;
    }
    return i === s.length;
};`;

  const resJava = analyzeStudentCode({ sourceCode: javaCode, language: "java" });
  assert.equal(resJava.parseStatus, "complete");
  assert.equal(resJava.signatures[0]?.name, "isSubsequence");
  assert.equal(resJava.signatures[0]?.returnType, "boolean");

  const resPy = analyzeStudentCode({ sourceCode: pyCode, language: "python3" });
  assert.equal(resPy.parseStatus, "complete");
  assert.equal(resPy.signatures[0]?.name, "isSubsequence");

  const resCpp = analyzeStudentCode({ sourceCode: cppCode, language: "cpp" });
  assert.equal(resCpp.parseStatus, "complete");
  assert.equal(resCpp.signatures[0]?.name, "isSubsequence");

  const resJs = analyzeStudentCode({ sourceCode: jsCode, language: "javascript" });
  assert.equal(resJs.parseStatus, "complete");
  assert.equal(resJs.signatures[0]?.name, "isSubsequence");
});

// -------------------------------------------------------------------
// 2. Nested Loops with Monotonic Pointers (LeetCode #392)
// -------------------------------------------------------------------
test("Module 3: LeetCode #392 Java identifies monotonic target pointer without resets (O(|s| + |t|))", () => {
  const prob = retrieveProblem({ problemNumber: 392 });
  const javaCode = `class Solution {
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

  const res = analyzeStudentCode({
    sourceCode: javaCode,
    language: "java",
    problem: prob,
    verdict: "Accepted"
  });

  assert.equal(res.algorithmPattern.pattern, "Two Pointers: Monotonic Forward Scan");
  assert.equal(res.complexity.timeComplexity, "O(|s| + |t|)");
  assert.equal(res.complexity.auxiliarySpace, "O(1)");
  assert.match(res.complexity.timeDerivation, /never reset|monotonic|bounded by \|s\| \+ \|t\|/i);

  // Line-by-line verification
  assert.ok(res.lineByLineWalkthrough.length >= 10);
  const l3 = res.lineByLineWalkthrough.find(w => w.line === 3);
  assert.ok(l3, "Must have entry for Line 3");
  assert.match(l3.code, /int index = 0/);
  assert.match(l3.explanation, /monotonic pointer/i);

  // Variable tracking
  const idxVar = res.variables.find(v => v.name === "index");
  assert.ok(idxVar, "Must track variable 'index'");
  assert.equal(idxVar.role, "pointer");
  assert.equal(idxVar.isMonotonic, true);
  assert.equal(idxVar.resetInLoop, false);

  // Finding evidence
  const monoFinding = res.evidenceBasedFindings.find(f => f.title.includes("Monotonic"));
  assert.ok(monoFinding, "Must produce evidence-based finding for monotonic pointer");
  assert.equal(monoFinding.severity, "informational");
  assert.equal(monoFinding.line, 6);
});

// -------------------------------------------------------------------
// 3. Nested Loops that Reset Pointers (Quadratic O(n^2) Detection)
// -------------------------------------------------------------------
test("Module 3: Detects nested loops that reset inner pointers and flags quadratic O(n^2)", () => {
  const resetCode = `class Solution {
    public boolean isSubsequence(String s, String t) {
        for (int i = 0; i < s.length(); i++) {
            int j = 0; // RESET in outer loop!
            boolean found = false;
            while (j < t.length()) {
                if (s.charAt(i) == t.charAt(j)) {
                    found = true;
                    break;
                }
                j++;
            }
            if (!found) return false;
        }
        return true;
    }
}`;

  const res = analyzeStudentCode({
    sourceCode: resetCode,
    language: "java",
    verdict: "Time Limit Exceeded"
  });

  assert.equal(res.complexity.timeComplexity, "O(n²)");
  assert.match(res.complexity.timeDerivation, /nested|re-evaluate|without monotonic bounds/i);
  assert.equal(res.complexity.isOptimal, false);
});

// -------------------------------------------------------------------
// 4. In-Place Array Mutation (LeetCode #443 String Compression)
// -------------------------------------------------------------------
test("Module 3: LeetCode #443 identifies in-place dual read/write pointers and O(1) auxiliary space", () => {
  const prob = retrieveProblem({ problemNumber: 443 });
  const compCode = `class Solution {
    public int compress(char[] chars) {
        int write = 0;
        int read = 0;
        while (read < chars.length) {
            char curr = chars[read];
            int count = 0;
            while (read < chars.length && chars[read] == curr) {
                read++;
                count++;
            }
            chars[write++] = curr;
            if (count > 1) {
                for (char digit : Integer.toString(count).toCharArray()) {
                    chars[write++] = digit;
                }
            }
        }
        return write;
    }
}`;

  const res = analyzeStudentCode({
    sourceCode: compCode,
    language: "java",
    problem: prob,
    verdict: "Accepted"
  });

  assert.equal(res.complexity.timeComplexity, "O(n)");
  assert.equal(res.complexity.auxiliarySpace, "O(1)");
  assert.equal(res.consistency.isConsistent, true);

  const writeVar = res.variables.find(v => v.name === "write");
  assert.ok(writeVar, "Must track 'write' variable");
  assert.equal(writeVar.role, "pointer");

  const inPlaceFinding = res.evidenceBasedFindings.find(f => f.title.includes("In-Place"));
  assert.ok(inPlaceFinding, "Must produce finding confirming in-place compaction");
});

// -------------------------------------------------------------------
// 5. Hash Map Frequency Counting (LeetCode #1679)
// -------------------------------------------------------------------
test("Module 3: LeetCode #1679 identifies HashMap complement lookup with O(n) space and time", () => {
  const prob = retrieveProblem({ problemNumber: 1679 });
  const hashPairCode = `class Solution {
    public int maxOperations(int[] nums, int k) {
        Map<Integer, Integer> map = new HashMap<>();
        int count = 0;
        for (int x : nums) {
            int complement = k - x;
            if (map.getOrDefault(complement, 0) > 0) {
                count++;
                map.put(complement, map.get(complement) - 1);
            } else {
                map.put(x, map.getOrDefault(x, 0) + 1);
            }
        }
        return count;
    }
}`;

  const res = analyzeStudentCode({
    sourceCode: hashPairCode,
    language: "java",
    problem: prob,
    verdict: "Accepted"
  });

  assert.equal(res.algorithmPattern.pattern, "Hash Map: Frequency Counting / Complement Lookup");
  assert.equal(res.complexity.timeComplexity, "O(n)");
  assert.equal(res.complexity.auxiliarySpace, "O(n)");

  assert.ok(res.dataStructures.some(ds => ds.type === "HashMap"));
  const mapFinding = res.evidenceBasedFindings.find(f => f.title.includes("Hash Map"));
  assert.ok(mapFinding, "Must produce finding confirming constant-time lookup trade-off");
});

// -------------------------------------------------------------------
// 6. Verdict-Aware Diagnosis: Accepted, Wrong Answer, TLE, RE, CE
// -------------------------------------------------------------------
test("Module 3: Verdict-aware diagnosis handles all LeetCode submission states accurately", () => {
  const code = `class Solution {
    public boolean isSubsequence(String s, String t) {
        return false;
    }
}`;

  // Accepted verdict: never invents false mistakes
  const accRes = diagnoseVerdict({ structure: { loops: [] }, verdict: "Accepted", sourceCode: code });
  assert.equal(accRes.hasMistake, false);
  assert.equal(accRes.status, "accepted");

  // Wrong Answer verdict
  const waRes = diagnoseVerdict({ structure: { loops: [] }, verdict: "Wrong Answer", sourceCode: code });
  assert.equal(waRes.hasMistake, true);
  assert.equal(waRes.status, "wrong_answer");

  // Time Limit Exceeded verdict
  const tleRes = diagnoseVerdict({ structure: { loops: [{ depth: 2, line: 4, resetsPointers: ["j"] }] }, verdict: "Time Limit Exceeded", sourceCode: code });
  assert.equal(tleRes.hasMistake, true);
  assert.equal(tleRes.status, "tle");
  assert.ok(tleRes.suspiciousLines.includes(4));

  // Runtime Error verdict
  const reRes = diagnoseVerdict({ structure: { loops: [] }, verdict: "Runtime Error", sourceCode: code });
  assert.equal(reRes.hasMistake, true);
  assert.equal(reRes.status, "runtime_error");

  // Compilation Error verdict
  const ceRes = diagnoseVerdict({ structure: { loops: [] }, verdict: "Compilation Error", sourceCode: code });
  assert.equal(ceRes.hasMistake, true);
  assert.equal(ceRes.status, "compilation_error");
});

// -------------------------------------------------------------------
// 7. Source Unavailable Graceful Handling
// -------------------------------------------------------------------
test("Module 3: Source unavailable handles empty or missing code gracefully without throwing", () => {
  const resEmpty = analyzeStudentCode({ sourceCode: "", language: "java", verdict: "Accepted" });
  assert.equal(resEmpty.sourceProvenance, "unavailable");
  assert.equal(resEmpty.parseStatus, "unavailable");
  assert.equal(resEmpty.diagnosis.status, "source_unavailable");
  assert.ok(resEmpty.overview.includes("not synchronized"));

  const resMissing = analyzeStudentCode({ sourceCode: "// Original submitted code unavailable", language: "java" });
  assert.equal(resMissing.sourceProvenance, "unavailable");
  assert.equal(resMissing.parseStatus, "unavailable");
});

// -------------------------------------------------------------------
// 8. Code-to-Problem Consistency Checks
// -------------------------------------------------------------------
test("Module 3: Detects in-place violation and signature mismatches against problem specification", () => {
  const probComp = retrieveProblem({ problemNumber: 443 }); // requires in-place chars modification

  // Code violates in-place requirement
  const violatingCode = `class Solution {
    public int compress(char[] chars) {
        StringBuilder sb = new StringBuilder();
        return sb.length();
    }
}`;

  const res = analyzeStudentCode({
    sourceCode: violatingCode,
    language: "java",
    problem: probComp
  });

  assert.equal(res.consistency.isConsistent, false);
  const inPlaceIssue = res.consistency.issues.find(i => i.type === "in_place_violation");
  assert.ok(inPlaceIssue, "Must detect in_place_violation for #443 when chars is not modified");
  assert.equal(inPlaceIssue.severity, "critical");
});

// -------------------------------------------------------------------
// 9. Zero Fabricated Line Numbers
// -------------------------------------------------------------------
test("Module 3: All walkthrough and findings line numbers strictly correspond to genuine non-empty lines", () => {
  const sampleCode = `// Comment line
class Solution {
    public int test(int x) {
        int y = x + 1;
        return y;
    }
}`;
  const res = analyzeStudentCode({ sourceCode: sampleCode, language: "java" });
  const rawLines = sampleCode.split("\n");

  for (const item of res.lineByLineWalkthrough) {
    assert.ok(item.line >= 1 && item.line <= rawLines.length, `Line ${item.line} must be within source bounds`);
    assert.equal(item.code, rawLines[item.line - 1].trimEnd(), `Line ${item.line} content must match source`);
  }

  for (const f of res.evidenceBasedFindings) {
    if (f.line !== null) {
      assert.ok(f.line >= 1 && f.line <= rawLines.length, `Finding line ${f.line} must be within source bounds`);
    }
  }
});

// -------------------------------------------------------------------
// 10. Local Provider and Service Integration
// -------------------------------------------------------------------
test("Module 3: Service integrates Student Code Intelligence into completed review payload", async () => {
  const db = mockDb();
  const localProvider = createLocalKnowledgeProvider();
  const service = createAiCodeMentorService({ db, provider: localProvider });
  const user = { id: "test-user-m3", email: "user@dsaverse.com" };

  const javaCode = `class Solution {
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

  const review = await service.createReview(user, {
    problemTitle: "Is Subsequence",
    problemSlug: "is-subsequence",
    problemNumber: 392,
    language: "java",
    sourceCode: javaCode,
    verdict: "Accepted",
    mode: "explain"
  });

  assert.ok(review && review.analysis);
  const analysis = review.analysis;

  // Verify Student Code Intelligence properties are attached
  assert.ok(analysis.sourceUnderstanding, "Must have sourceUnderstanding");
  assert.ok(Array.isArray(analysis.lineByLineExplanation) && analysis.lineByLineExplanation.length > 0,
    "Must have lineByLineExplanation");
  assert.ok(Array.isArray(analysis.variableAnalysis) && analysis.variableAnalysis.length > 0,
    "Must have variableAnalysis");
  assert.ok(analysis.algorithmPattern, "Must have algorithmPattern");
  assert.ok(Array.isArray(analysis.evidenceBasedFindings) && analysis.evidenceBasedFindings.length > 0,
    "Must have evidenceBasedFindings");
});
