"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  UNIVERSAL_ANALYSIS_SCHEMA,
  validateSchemaContract,
  adaptSchemaForGemini,
  adaptSchemaForOpenAI,
  createGeminiMentorProvider,
  createOpenAIMentorProvider,
  createUnifiedMentorProvider
} = require("../ai-code-mentor-provider");

const { validateAnalysis } = require("../ai-code-mentor");

// ---------------------------------------------------------------------------
// 1. variableTracking.steps Schema Validity
// ---------------------------------------------------------------------------
test("1. variableTracking.steps schema validity: array has valid items object and required properties", () => {
  const vt = UNIVERSAL_ANALYSIS_SCHEMA.properties.variableTracking;
  assert.ok(vt, "variableTracking must exist in UNIVERSAL_ANALYSIS_SCHEMA");
  assert.equal(vt.type, "object");
  assert.deepEqual(vt.required, ["variableNames", "steps"]);

  // variableNames array
  assert.equal(vt.properties.variableNames.type, "array");
  assert.equal(vt.properties.variableNames.items.type, "string");

  // steps array
  const steps = vt.properties.steps;
  assert.equal(steps.type, "array");
  assert.ok(steps.items, "steps array MUST have an items definition");
  assert.equal(steps.items.type, "object");

  // Step item properties
  const stepProps = steps.items.properties;
  assert.ok(stepProps.step, "step item must have step property");
  assert.ok(stepProps.vars, "step item must have vars property");
  assert.ok(stepProps.evaluation, "step item must have evaluation property");
  assert.ok(stepProps.memory, "step item must have memory property");
  assert.equal(stepProps.step.type, "string");
  assert.equal(stepProps.vars.type, "string");
  assert.equal(stepProps.evaluation.type, "string");
  assert.equal(stepProps.memory.type, "string");

  assert.deepEqual(steps.items.required, ["step", "vars", "evaluation", "memory"]);
});

// ---------------------------------------------------------------------------
// 2. Missing Array Item Definitions Detected
// ---------------------------------------------------------------------------
test("2. Missing array item definitions are rejected with AI_INVALID_ARGUMENT (400)", () => {
  const invalidSchema = {
    type: "object",
    properties: {
      itemsList: { type: "array" } // missing items
    }
  };

  assert.throws(
    () => validateSchemaContract(invalidSchema),
    err => {
      assert.equal(err.code, "AI_INVALID_ARGUMENT");
      assert.equal(err.status, 400);
      assert.match(err.message, /valid "items" schema definition/);
      return true;
    }
  );

  const emptyArrayItems = {
    type: "array",
    items: []
  };
  assert.throws(
    () => validateSchemaContract(emptyArrayItems),
    err => err.code === "AI_INVALID_ARGUMENT" && err.status === 400
  );
});

// ---------------------------------------------------------------------------
// 3. Nested Array Schemas Validation
// ---------------------------------------------------------------------------
test("3. Nested array schemas: deeply nested missing items are caught with path", () => {
  const deepInvalid = {
    type: "object",
    properties: {
      outer: {
        type: "array",
        items: {
          type: "object",
          properties: {
            inner: {
              type: "array" // nested missing items
            }
          }
        }
      }
    }
  };

  assert.throws(
    () => validateSchemaContract(deepInvalid),
    err => {
      assert.equal(err.code, "AI_INVALID_ARGUMENT");
      assert.equal(err.status, 400);
      assert.match(err.message, /root\.outer\.items\.inner/);
      return true;
    }
  );

  // Valid deeply nested array passes without error
  const deepValid = {
    type: "object",
    properties: {
      outer: {
        type: "array",
        items: {
          type: "object",
          properties: {
            inner: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      }
    }
  };
  assert.doesNotThrow(() => validateSchemaContract(deepValid));
});

// ---------------------------------------------------------------------------
// 4. Gemini Structured-Output Request Construction
// ---------------------------------------------------------------------------
test("4. Gemini structured-output request construction uses adapted schema with complete array items", async () => {
  let capturedConfig = null;
  const mockAiClient = {
    models: {
      generateContent: async (params) => {
        capturedConfig = params.config;
        return {
          text: JSON.stringify({
            problemTitle: "Two Sum",
            language: "python3",
            studentApproach: "Hash Map",
            correctnessStatus: "Accepted",
            mistakeDiagnosis: { hasMistake: false },
            bruteForce: { title: "Brute", algorithm: "Nested loop", timeComplexity: "O(n²)", spaceComplexity: "O(1)", explanation: "Pairwise" },
            optimalApproach: { title: "One Pass", algorithm: "Hash map", whyItWorks: "Complement lookup", keyInvariants: "One pass" },
            optimalCode: "def twoSum(): pass",
            optimalComplexity: { timeComplexity: "O(n)", spaceComplexity: "O(n)", auxiliarySpace: "O(n)", totalSpace: "O(n)", explanation: "Linear" },
            summary: "Valid review",
            variableTracking: {
              variableNames: ["nums", "target", "seen"],
              steps: [
                { step: "Init", vars: "seen = {}", evaluation: "Empty map", memory: "Stack initialized" }
              ]
            }
          })
        };
      }
    }
  };

  const provider = createGeminiMentorProvider({
    env: { GEMINI_API_KEY: "test-gemini-key", AI_MENTOR_GEMINI_MODEL: "gemini-3.1-flash-lite" },
    client: mockAiClient
  });

  const res = await provider.analyze({ instructions: "Analyze", input: "code" });
  assert.ok(capturedConfig);
  assert.equal(capturedConfig.responseMimeType, "application/json");
  assert.ok(capturedConfig.responseSchema);
  assert.doesNotThrow(() => validateSchemaContract(capturedConfig.responseSchema));
  assert.ok(capturedConfig.responseSchema.properties.variableTracking.properties.steps.items);
  assert.equal(res.analysis.variableTracking.steps.length, 1);
});

// ---------------------------------------------------------------------------
// 5. Successful Parsing of Variable Tracking Responses
// ---------------------------------------------------------------------------
test("5. Successful parsing of variable tracking responses preserves step details", async () => {
  const sampleSteps = [
    { step: "Init", vars: "left = 0, right = 4", evaluation: "Pre-loop check", memory: "O(1) pointer vars" },
    { step: "Iteration 1", vars: "left = 1, right = 4", evaluation: "nums[mid] < target", memory: "O(1) stack update" },
    { step: "Final", vars: "left = 3, right = 3", evaluation: "Converged at target", memory: "Return index" }
  ];

  const mockAiClient = {
    models: {
      generateContent: async () => ({
        text: JSON.stringify({
          problemTitle: "Binary Search",
          language: "python3",
          studentApproach: "Binary search",
          correctnessStatus: "Accepted",
          mistakeDiagnosis: { hasMistake: false },
          bruteForce: { title: "Linear", algorithm: "Scan", timeComplexity: "O(n)", spaceComplexity: "O(1)", explanation: "Sequential" },
          optimalApproach: { title: "Binary", algorithm: "Halving search space", whyItWorks: "Monotonicity", keyInvariants: "Sorted array" },
          optimalCode: "def search(): pass",
          optimalComplexity: { timeComplexity: "O(log n)", spaceComplexity: "O(1)", auxiliarySpace: "O(1)", totalSpace: "O(1)", explanation: "Logarithmic" },
          summary: "Binary search trace",
          variableTracking: {
            variableNames: ["nums", "target", "left", "right", "mid"],
            steps: sampleSteps
          }
        })
      })
    }
  };

  const provider = createGeminiMentorProvider({
    env: { GEMINI_API_KEY: "test-gemini-key" },
    client: mockAiClient
  });

  const res = await provider.analyze({ instructions: "Trace", input: "code" });
  const vt = res.analysis.variableTracking;
  assert.ok(vt);
  assert.equal(vt.steps.length, 3);
  assert.equal(vt.steps[0].step, "Init");
  assert.equal(vt.steps[1].vars, "left = 1, right = 4");
  assert.equal(vt.steps[2].evaluation, "Converged at target");
});

// ---------------------------------------------------------------------------
// 6. OpenAI Provider Compatibility
// ---------------------------------------------------------------------------
test("6. OpenAI provider compatibility: schema adapts and processes variableTracking cleanly", async () => {
  let capturedFormat = null;
  const mockOpenAIClient = {
    chat: {
      completions: {
        create: async (params) => {
          capturedFormat = params.response_format;
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  problemTitle: "Two Sum",
                  language: "python3",
                  studentApproach: "Hash Map",
                  correctnessStatus: "Accepted",
                  mistakeDiagnosis: { hasMistake: false },
                  bruteForce: { title: "Brute", algorithm: "Scan", timeComplexity: "O(n²)", spaceComplexity: "O(1)", explanation: "Pairwise" },
                  optimalApproach: { title: "Optimal", algorithm: "Lookup", whyItWorks: "Complement", keyInvariants: "One pass" },
                  optimalCode: "def twoSum(): pass",
                  optimalComplexity: { timeComplexity: "O(n)", spaceComplexity: "O(n)", auxiliarySpace: "O(n)", totalSpace: "O(n)", explanation: "Linear" },
                  summary: "OpenAI trace",
                  variableTracking: {
                    variableNames: ["nums", "target", "seen"],
                    steps: [{ step: "Step 1", vars: "seen = {}", evaluation: "Loop start", memory: "Stack frame" }]
                  }
                })
              }
            }]
          };
        }
      }
    }
  };

  const provider = createOpenAIMentorProvider({
    env: { OPENAI_API_KEY: "test-openai-key" },
    client: mockOpenAIClient
  });

  const res = await provider.analyze({ instructions: "Analyze", input: "code" });
  assert.ok(capturedFormat);
  assert.doesNotThrow(() => validateSchemaContract(capturedFormat.json_schema.schema));
  assert.equal(res.provider, "openai");
  assert.equal(res.analysis.variableTracking.steps.length, 1);
});

// ---------------------------------------------------------------------------
// 7. Existing Analysis Response Validation
// ---------------------------------------------------------------------------
test("7. Existing analysis response validation preserves variableTracking, problemUnderstanding, and edgeCases", () => {
  const raw = {
    summary: "Full analysis summary",
    problemTitle: "Two Sum",
    problemUnderstanding: {
      whatItAsks: "Find two indices whose values add up to target.",
      inputOutput: "nums = int[], target = int -> [int, int]",
      constraints: "2 <= nums.length <= 10^4",
      keyObservation: "Complement can be resolved in O(1) time using hash map."
    },
    edgeCases: [
      { caseName: "Negative numbers", input: "[-1, -2, -3], target = -5", expected: "[1, 2]", explanation: "Works with negative sum", handledBy: "Signed arithmetic" }
    ],
    variableTracking: {
      variableNames: ["i", "num", "seen"],
      steps: [
        { step: "Init", vars: "seen = {}", evaluation: "Ready", memory: "Stack allocated" }
      ]
    },
    sections: [
      { id: "problem-understanding", title: "Problem Overview", content: "Details" }
    ],
    unavailableSections: []
  };

  const validated = validateAnalysis(raw);
  assert.ok(validated.problemUnderstanding);
  assert.equal(validated.problemUnderstanding.whatItAsks, "Find two indices whose values add up to target.");
  assert.equal(validated.edgeCases.length, 1);
  assert.equal(validated.variableTracking.steps.length, 1);
  assert.equal(validated.variableTracking.steps[0].step, "Init");
});

// ---------------------------------------------------------------------------
// 8. Provider Error Classification (HTTP 400 INVALID_ARGUMENT vs 503 Outage)
// ---------------------------------------------------------------------------
test("8. Provider error classification: HTTP 400 INVALID_ARGUMENT fails immediately with code AI_INVALID_ARGUMENT and does NOT retry", async () => {
  let calls = 0;
  const invalidSchemaClient = {
    models: {
      generateContent: async () => {
        calls++;
        const err = new Error("* GenerateContentRequest.generation_config.response_schema.properties[variableTracking].properties[steps].items: missing field.\n");
        err.status = 400;
        err.code = "INVALID_ARGUMENT";
        throw err;
      }
    }
  };

  const provider = createGeminiMentorProvider({
    env: { GEMINI_API_KEY: "test-key", AI_MENTOR_MAX_RETRIES: "3" },
    client: invalidSchemaClient
  });

  await assert.rejects(
    () => provider.analyze({ instructions: "Analyze", input: "code" }),
    err => {
      assert.equal(err.code, "AI_INVALID_ARGUMENT", "Error code must be AI_INVALID_ARGUMENT");
      assert.equal(err.status, 400, "HTTP status must be 400");
      assert.doesNotMatch(err.message, /temporarily unavailable/, "Must NOT mislabel schema error as temporary outage");
      assert.match(err.message, /Gemini request or schema validation failed/, "Must provide clear diagnostic message");
      return true;
    }
  );

  assert.equal(calls, 1, "Must fail immediately without retrying HTTP 400 permanent schema error");
});
