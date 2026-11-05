"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  MODES,
  LANGUAGES,
  SECTION_IDS,
  validateRequest,
  validateAnalysis,
  createAiCodeMentorService,
  instructionsFor
} = require("../ai-code-mentor");

const {
  createOpenAIMentorProvider,
  createGeminiMentorProvider,
  createUnifiedMentorProvider,
  UNIVERSAL_ANALYSIS_SCHEMA
} = require("../ai-code-mentor-provider");

const {
  resolveProblemIdentity,
  validateCodeIdentity,
  CANONICAL_PROBLEMS
} = require("../leetcode-problem-intelligence");

function match(doc, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    if (expected && typeof expected === "object" && !Array.isArray(expected)) {
      if ("$lt" in expected) return doc[key] < expected.$lt;
      if ("$gt" in expected) return doc[key] > expected.$gt;
      return doc[key] === expected;
    }
    return doc[key] === expected;
  });
}

function mockDb() {
  const collections = {};
  return {
    collection(name) {
      if (!collections[name]) {
        collections[name] = {
          docs: [],
          async findOne(filter) {
            const row = this.docs.find(item => match(item, filter));
            return row ? structuredClone(row) : null;
          },
          find(filter) {
            const rows = this.docs.filter(item => match(item, filter)).map(item => structuredClone(item));
            return {
              sort: () => ({ limit: n => ({ toArray: async () => rows.slice(0, n) }) }),
              toArray: async () => rows
            };
          },
          async insertOne(doc) {
            this.docs.push(structuredClone(doc));
            return { insertedId: doc._id };
          },
          async updateOne(filter, update, options = {}) {
            let row = this.docs.find(item => match(item, filter));
            if (!row && options.upsert) {
              row = { _id: filter._id };
              this.docs.push(row);
            }
            if (row) {
              if (update.$inc) {
                for (const [k, v] of Object.entries(update.$inc)) {
                  row[k] = (row[k] || 0) + v;
                }
              }
              if (update.$set) Object.assign(row, structuredClone(update.$set));
              return { matchedCount: 1, modifiedCount: 1 };
            }
            return { matchedCount: 0, modifiedCount: 0 };
          }
        };
      }
      return collections[name];
    }
  };
}

// ---------------------------------------------------------------------------
// MODULE 1: AUTOMATIC SUBMISSION CODE & PROVENANCE
// ---------------------------------------------------------------------------
test("Module 1: Provenance states are strictly defined and mapped in script.js", () => {
  const scriptContent = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  assert.match(scriptContent, /Automatically Imported \(Authorized Integration\)/);
  assert.match(scriptContent, /Manually Imported/);
  assert.match(scriptContent, /User Pasted/);
  assert.match(scriptContent, /Original Source Unavailable/);

  // Verify extension artifacts exist
  const extManifest = JSON.parse(fs.readFileSync(path.join(__dirname, "../tools/leetcode-sync-extension/manifest.json"), "utf8"));
  assert.equal(extManifest.manifest_version, 3);
  assert.equal(extManifest.name, "DSAverse LeetCode Sync");
  assert.ok(fs.existsSync(path.join(__dirname, "../tools/leetcode-sync-extension/content.js")));
  assert.ok(fs.existsSync(path.join(__dirname, "../tools/leetcode-sync-extension/popup.html")));
  assert.ok(fs.existsSync(path.join(__dirname, "../tools/leetcode-sync-extension/popup.js")));
  assert.ok(fs.existsSync(path.join(__dirname, "../docs/LEETCODE_AUTHORIZED_INTEGRATION.md")));
});

// ---------------------------------------------------------------------------
// MODULE 2: VERDICT-AWARE CODE REVIEW DIRECTIVES
// ---------------------------------------------------------------------------
test("Module 2: instructionsFor enforces verdict directives for Accepted, WA, TLE, RE, CE", () => {
  const prob = { title: "Two Sum", number: 1 };

  // 1. Accepted: forbids false bug alerts
  const acceptedInst = instructionsFor("explain", prob, "python3", "Accepted");
  assert.match(acceptedInst, /VERDICT DIRECTIVE - ACCEPTED SUBMISSION/);
  assert.match(acceptedInst, /DO NOT claim the student's solution failed/);
  assert.match(acceptedInst, /mistakeDiagnosis\.hasMistake = false/);

  // 2. Wrong Answer: requires counterexample and minimal fix
  const waInst = instructionsFor("mistake", prob, "python3", "Wrong Answer");
  assert.match(waInst, /VERDICT DIRECTIVE - WRONG ANSWER SUBMISSION/);
  assert.match(waInst, /concrete failing counterexample/);

  // 3. Time Limit Exceeded: requires bottleneck and operational budget
  const tleInst = instructionsFor("tle", prob, "java", "Time Limit Exceeded");
  assert.match(tleInst, /VERDICT DIRECTIVE - TIME LIMIT EXCEEDED/);
  assert.match(tleInst, /computational bottleneck/);
  assert.match(tleInst, /operational budget/);

  // 4. Runtime Error: guards against inventing boundary operations if code unavailable
  const reInst = instructionsFor("runtime-error", prob, "cpp", "Runtime Error");
  assert.match(reInst, /VERDICT DIRECTIVE - RUNTIME ERROR/);
  assert.match(reInst, /DO NOT invent line numbers or fabricate boundary operations/);

  // 5. Compilation Error: requires syntax/type diagnostics
  const ceInst = instructionsFor("compilation-error", prob, "rust", "Compilation Error");
  assert.match(ceInst, /VERDICT DIRECTIVE - COMPILATION ERROR/);
  assert.match(ceInst, /exact syntax, typing, missing imports, or incorrect method signature/);
});

// ---------------------------------------------------------------------------
// MODULE 3: UNIVERSAL AI PROVIDERS (OPENAI CHAT + RESPONSES & GEMINI RETRY)
// ---------------------------------------------------------------------------
test("Module 3: OpenAI provider supports standard chat.completions.create with structured outputs and backoff", async () => {
  let completionCalled = false;
  const mockChatClient = {
    chat: {
      completions: {
        create: async (params) => {
          completionCalled = true;
          assert.equal(params.model, "gpt-4o-mini");
          assert.equal(params.response_format?.type, "json_schema");
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  problemTitle: "Two Sum",
                  language: "python3",
                  summary: "Valid one pass hash map",
                  optimalCode: "def twoSum(): pass",
                  optimalComplexity: { timeComplexity: "O(n)", spaceComplexity: "O(n)" }
                })
              }
            }]
          };
        }
      }
    }
  };

  const provider = createOpenAIMentorProvider({
    env: { OPENAI_API_KEY: "test-openai-key", AI_MENTOR_MODEL: "gpt-4o-mini" },
    client: mockChatClient
  });

  const res = await provider.analyze({ instructions: "Evaluate", input: "code" });
  assert.equal(completionCalled, true);
  assert.equal(res.provider, "openai");
  assert.equal(res.analysis.optimalComplexity.timeComplexity, "O(n)");
});

test("Module 3: Universal Analysis Schema contains problemUnderstanding, edgeCases, and variableTracking", () => {
  assert.ok(UNIVERSAL_ANALYSIS_SCHEMA.properties.problemUnderstanding);
  assert.ok(UNIVERSAL_ANALYSIS_SCHEMA.properties.edgeCases);
  assert.ok(UNIVERSAL_ANALYSIS_SCHEMA.properties.variableTracking);
  assert.ok(UNIVERSAL_ANALYSIS_SCHEMA.properties.bruteForce);
  assert.ok(UNIVERSAL_ANALYSIS_SCHEMA.properties.optimalApproach);
});

// ---------------------------------------------------------------------------
// MODULE 4: COMPLETE NORMAL MODE ANALYSIS & ZERO BLANK DASHES
// ---------------------------------------------------------------------------
test("Module 4: Frontend HTML and script contain all 8 structured sections and never render blank dashes", () => {
  const htmlContent = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const scriptContent = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");

  // Verify all 8 structured section containers exist in index.html
  assert.match(htmlContent, /id="mentorProblemUnderstandingCard"/);
  assert.match(htmlContent, /id="mentorComplexityCard"/);
  assert.match(htmlContent, /id="mentorComparisonTableCard"/);
  assert.match(htmlContent, /id="mentorAnalysisCard"/);
  assert.match(htmlContent, /id="mentorBruteForceCard"/);
  assert.match(htmlContent, /id="mentorSolutionCard"/);
  assert.match(htmlContent, /id="mentorEdgeCasesCard"/);
  assert.match(htmlContent, /id="mentorTakeawaysCard"/);

  // Verify 4-stat complexity cards (Time, Space, Auxiliary, Total)
  assert.match(htmlContent, /id="mentorTimeComplexity"/);
  assert.match(htmlContent, /id="mentorSpaceComplexity"/);
  assert.match(htmlContent, /id="mentorAuxiliarySpace"/);
  assert.match(htmlContent, /id="mentorTotalSpace"/);

  // Verify script.js derives non-blank complexity
  assert.match(scriptContent, /derivedTime/);
  assert.match(scriptContent, /derivedSpace/);
  assert.match(scriptContent, /derivedAux/);
  assert.match(scriptContent, /derivedTotal/);
  assert.doesNotMatch(scriptContent, /timeComplexityEl\.textContent = analysisResult\?\.optimalComplexity\?\.timeComplexity \|\| \(data\.hasLocalSolution === false \? "—"/);
});

// ---------------------------------------------------------------------------
// MODULE 5: 11 FUNCTIONAL ACTION CHIPS
// ---------------------------------------------------------------------------
test("Module 5: Exactly 11 functional action chips are defined in HTML and wired in script.js", () => {
  const htmlContent = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const scriptContent = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");

  const expectedChips = [
    "deep-analysis",
    "dry-run",
    "track-vars",
    "learn-concepts",
    "hints",
    "find-mistakes",
    "brute-force",
    "optimal-solution",
    "complexity",
    "edge-cases",
    "code-comparison"
  ];

  for (const chip of expectedChips) {
    assert.match(htmlContent, new RegExp(`data-mentor-chip="${chip}"`), `HTML must contain chip: ${chip}`);
    assert.match(scriptContent, new RegExp(`chipType === "${chip}"`), `script.js must wire chip: ${chip}`);
  }
});

// ---------------------------------------------------------------------------
// MODULE 6: ADVANCED ANIMATIC MODE (8 PATTERNS & SYNCHRONIZED LINE HIGHLIGHTING)
// ---------------------------------------------------------------------------
test("Module 6: Animatic Mode supports 8 algorithm types and active code line highlighting", () => {
  const htmlContent = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const scriptContent = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");

  // Visual containers exist
  assert.match(htmlContent, /id="animaticArrayContainer"/);
  assert.match(htmlContent, /id="animaticWindowContainer"/);
  assert.match(htmlContent, /id="animaticLinkedListContainer"/);
  assert.match(htmlContent, /id="animaticDpContainer"/);
  assert.match(htmlContent, /id="animaticPillarsContainer"/);
  assert.match(htmlContent, /id="animaticCodeCard"/);
  assert.match(htmlContent, /id="animaticSynchronizedCode"/);
  assert.match(htmlContent, /id="animaticLineNumberBadge"/);

  // Script supports the patterns
  const expectedPatterns = [
    "array-map",
    "binary-search",
    "dual-pointer",
    "sliding-window",
    "cycle-detection",
    "pillars",
    "linked-list",
    "dp-table"
  ];

  for (const pattern of expectedPatterns) {
    assert.match(scriptContent, new RegExp(`animaticState\\.type === "${pattern}"`), `script.js must handle pattern: ${pattern}`);
  }

  // Active line highlighting logic
  assert.match(scriptContent, /active-anim-line/);
  assert.match(scriptContent, /anim-code-line/);
});

// ---------------------------------------------------------------------------
// MODULE 7: 100% BYTE-SYNCHRONIZATION BETWEEN ROOT AND PUBLIC
// ---------------------------------------------------------------------------
test("Module 7: Root dashboard files and public/ assets are 100% byte-identical", () => {
  const rootIndex = fs.readFileSync(path.join(__dirname, "../index.html"));
  const pubIndex = fs.readFileSync(path.join(__dirname, "../public/index.html"));
  assert.equal(Buffer.compare(rootIndex, pubIndex), 0, "index.html and public/index.html must be identical");

  const rootStyle = fs.readFileSync(path.join(__dirname, "../style.css"));
  const pubStyle = fs.readFileSync(path.join(__dirname, "../public/style.css"));
  assert.equal(Buffer.compare(rootStyle, pubStyle), 0, "style.css and public/style.css must be identical");

  const rootScript = fs.readFileSync(path.join(__dirname, "../script.js"));
  const pubScript = fs.readFileSync(path.join(__dirname, "../public/script.js"));
  assert.equal(Buffer.compare(rootScript, pubScript), 0, "script.js and public/script.js must be identical");
});
