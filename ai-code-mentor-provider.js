"use strict";

const { GoogleGenAI } = require("@google/genai");
const OpenAI = require("openai");
const { CANONICAL_PROBLEMS, retrieveProblem } = require("./problem-intelligence-engine");
const { analyzeStudentCode } = require("./student-code-intelligence");
const { generateMultiTierSolutions } = require("./solution-generation-engine");

const ANALYSIS_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["summary", "sections", "unavailableSections", "followUpQuestion", "uncertaintyNote"],
  properties: {
    summary: { type: "string", maxLength: 2400 },
    sections: {
      type: "array",
      maxItems: 25,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "content"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          content: { type: "string", maxLength: 5000 }
        }
      }
    },
    unavailableSections: {
      type: "array",
      maxItems: 25,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "reason"],
        properties: {
          id: { type: "string" },
          reason: { type: "string", maxLength: 500 }
        }
      }
    },
    followUpQuestion: { type: ["string", "null"], maxLength: 500 },
    uncertaintyNote: { type: ["string", "null"], maxLength: 800 }
  }
});

const UNIVERSAL_ANALYSIS_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: true,
  required: [
    "problemTitle",
    "language",
    "studentApproach",
    "correctnessStatus",
    "mistakeDiagnosis",
    "bruteForce",
    "optimalApproach",
    "optimalCode",
    "optimalComplexity",
    "summary"
  ],
  properties: {
    provider: { type: "string" },
    model: { type: "string" },
    problemId: { type: ["string", "number", "null"] },
    problemTitle: { type: "string" },
    problemMatchConfidence: { type: "string" },
    language: { type: "string" },
    studentApproach: { type: "string" },
    correctnessStatus: { type: "string" },
    mistakeDiagnosis: {
      type: "object",
      properties: {
        hasMistake: { type: "boolean" },
        title: { type: ["string", "null"] },
        detail: { type: ["string", "null"] },
        counterExample: { type: ["string", "null"] },
        suggestedFix: { type: ["string", "null"] }
      }
    },
    bruteForce: {
      type: "object",
      properties: {
        title: { type: "string" },
        algorithm: { type: "string" },
        code: { type: ["string", "null"] },
        timeComplexity: { type: "string" },
        spaceComplexity: { type: "string" },
        explanation: { type: "string" }
      }
    },
    studentComplexity: {
      type: "object",
      properties: {
        timeComplexity: { type: "string" },
        spaceComplexity: { type: "string" },
        explanation: { type: "string" }
      }
    },
    optimalApproach: {
      type: "object",
      properties: {
        title: { type: "string" },
        algorithm: { type: "string" },
        whyItWorks: { type: "string" },
        keyInvariants: { type: "string" }
      }
    },
    optimalCode: { type: "string" },
    optimalComplexity: {
      type: "object",
      properties: {
        timeComplexity: { type: "string" },
        spaceComplexity: { type: "string" },
        auxiliarySpace: { type: "string" },
        totalSpace: { type: "string" },
        explanation: { type: "string" }
      }
    },
    comparison: {
      type: "array",
      items: {
        type: "object",
        properties: {
          approach: { type: "string" },
          timeComplexity: { type: "string" },
          spaceComplexity: { type: "string" },
          verdict: { type: "string" }
        }
      }
    },
    dryRunSteps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          step: { type: ["number", "string"] },
          state: { type: "string" },
          action: { type: "string" }
        }
      }
    },
    hints: {
      type: "array",
      items: { type: "string" }
    },
    concepts: {
      type: "array",
      items: { type: "string" }
    },
    problemUnderstanding: {
      type: "object",
      properties: {
        whatItAsks: { type: "string" },
        inputOutput: { type: "string" },
        constraints: { type: "string" },
        keyObservation: { type: "string" }
      }
    },
    edgeCases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          caseName: { type: "string" },
          input: { type: "string" },
          expected: { type: "string" },
          explanation: { type: "string" },
          handledBy: { type: "string" }
        }
      }
    },
    variableTracking: {
      type: "object",
      required: ["variableNames", "steps"],
      properties: {
        variableNames: { type: "array", items: { type: "string" } },
        steps: {
          type: "array",
          items: {
            type: "object",
            required: ["step", "vars", "evaluation", "memory"],
            properties: {
              step: { type: "string" },
              vars: { type: "string" },
              evaluation: { type: "string" },
              memory: { type: "string" }
            }
          }
        }
      }
    },
    animationType: { type: "string" },
    animationSteps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          lineIndex: { type: "number" },
          description: { type: "string" },
          state: { type: "object" }
        }
      }
    },
    limitations: { type: ["string", "null"] },
    summary: { type: "string" },
    coreObservations: {
      type: "array",
      items: { type: "string" }
    },
    improvedApproach: {
      type: "object",
      properties: {
        title: { type: "string" },
        algorithm: { type: "string" },
        limitationAddressed: { type: "string" },
        timeComplexity: { type: "string" },
        spaceComplexity: { type: "string" },
        explanation: { type: "string" }
      }
    },
    correctnessReasoning: {
      type: "object",
      properties: {
        method: { type: "string" },
        explanation: { type: "string" },
        keyInvariant: { type: "string" }
      }
    },
    complexityAnalysis: {
      type: "object",
      properties: {
        timeComplexity: { type: "string" },
        spaceComplexity: { type: "string" },
        auxiliarySpace: { type: "string" },
        totalSpace: { type: "string" },
        derivation: { type: "string" },
        pointerMovement: { type: "string" }
      }
    },
    codeComparison: {
      type: "array",
      items: {
        type: "object",
        properties: {
          approach: { type: "string" },
          intuition: { type: "string" },
          timeComplexity: { type: "string" },
          auxiliarySpace: { type: "string" },
          verdict: { type: "string" },
          tradeOffs: { type: "string" }
        }
      }
    },
    keyTakeaways: {
      type: "array",
      items: { type: "string" }
    },
    provenance: {
      type: "object",
      properties: {
        provider: { type: "string" },
        model: { type: "string" },
        generatedAt: { type: "string" },
        isVerifiedCurriculum: { type: "boolean" },
        confidence: { type: "string" }
      }
    },
    sourceUnderstanding: { type: "string" },
    codeStructure: { type: "object" },
    lineByLineExplanation: {
      type: "array",
      items: {
        type: "object",
        properties: {
          line: { type: "integer" },
          code: { type: "string" },
          explanation: { type: "string" },
          significance: { type: "string" }
        }
      }
    },
    variableAnalysis: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: { type: "string" },
          role: { type: "string" },
          initialValue: { type: "string" },
          purpose: { type: "string" }
        }
      }
    },
    controlFlowAnalysis: { type: "object" },
    dataStructureAnalysis: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          purpose: { type: "string" }
        }
      }
    },
    algorithmPattern: {
      type: "object",
      properties: {
        pattern: { type: "string" },
        confidence: { type: "string" },
        explanation: { type: "string" }
      }
    },
    codeProblemConsistency: {
      type: "object",
      properties: {
        isConsistent: { type: "boolean" },
        confidence: { type: "string" }
      }
    },
    evidenceBasedFindings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          severity: { type: "string" },
          line: { type: ["integer", "null"] },
          codeSnippet: { type: "string" },
          explanation: { type: "string" },
          evidence: { type: "string" },
          confidence: { type: "string" }
        }
      }
    },
    diagnosisConfidence: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            enum: [
              "problem-understanding", "student-approach", "step-by-step-logic", "time-complexity", "space-complexity",
              "strengths", "weaknesses", "edge-cases", "optimization", "alternative-approach", "dsa-concepts",
              "brute-force", "optimal-approach", "optimized-code", "complexity-comparison", "counterexample",
              "mistake-analysis", "tle-analysis", "runtime-error", "compilation-error", "key-takeaways", "animatic-trace",
              "core-observations", "improved-approach", "correctness-reasoning",
              "line-by-line-walkthrough", "variable-analysis", "control-flow-analysis", "code-consistency", "evidence-findings"
            ]
          },
          title: { type: "string" },
          content: { type: "string" }
        }
      }
    },
    unavailableSections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          reason: { type: "string" }
        }
      }
    },
    solutions: {
      type: "object",
      properties: {
        bruteForce: {
          type: "object",
          properties: {
            title: { type: "string" },
            approach: { type: "string" },
            algorithm: { type: "string" },
            code: { type: "string" },
            timeComplexity: { type: "string" },
            spaceComplexity: { type: "string" },
            auxiliarySpace: { type: "string" },
            totalSpace: { type: "string" },
            limitations: { type: "string" },
            constraintBreakdown: { type: "string" },
            tradeOffs: { type: "string" },
            unavailableReason: { type: ["string", "null"] },
            executionDisclaimer: { type: "string" }
          }
        },
        improved: {
          type: "object",
          properties: {
            title: { type: "string" },
            approach: { type: "string" },
            algorithm: { type: "string" },
            code: { type: "string" },
            timeComplexity: { type: "string" },
            spaceComplexity: { type: "string" },
            auxiliarySpace: { type: "string" },
            totalSpace: { type: "string" },
            limitations: { type: "string" },
            bottleneckRemoved: { type: "string" },
            tradeOffs: { type: "string" },
            unavailableReason: { type: ["string", "null"] },
            executionDisclaimer: { type: "string" }
          }
        },
        optimal: {
          type: "object",
          properties: {
            title: { type: "string" },
            approach: { type: "string" },
            algorithm: { type: "string" },
            code: { type: "string" },
            timeComplexity: { type: "string" },
            spaceComplexity: { type: "string" },
            auxiliarySpace: { type: "string" },
            totalSpace: { type: "string" },
            whyItWorks: { type: "string" },
            keyInvariants: { type: "string" },
            correctnessProof: { type: "string" },
            tradeOffs: { type: "string" },
            unavailableReason: { type: ["string", "null"] },
            executionDisclaimer: { type: "string" }
          }
        }
      }
    },
    solutionComparison: {
      type: "array",
      items: {
        type: "object",
        properties: {
          property: { type: "string" },
          bruteForce: { type: "string" },
          improved: { type: "string" },
          optimal: { type: "string" }
        }
      }
    }
  }
});

function providerError(code, message, status = 503) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

/**
 * Validates that every array definition within a JSON schema specifies a valid "items" schema object.
 * Throws AI_INVALID_ARGUMENT (400) when an array lacks an items schema or defines an empty item.
 */
function validateSchemaContract(schema, path = "root") {
  if (!schema || typeof schema !== "object") return;

  if (schema.type === "array") {
    if (!schema.items || typeof schema.items !== "object" || (Array.isArray(schema.items) && schema.items.length === 0)) {
      throw providerError(
        "AI_INVALID_ARGUMENT",
        `Schema validation error at "${path}": Array property requires a valid "items" schema definition.`,
        400
      );
    }
    if (Array.isArray(schema.items)) {
      schema.items.forEach((item, idx) => validateSchemaContract(item, `${path}.items[${idx}]`));
    } else {
      validateSchemaContract(schema.items, `${path}.items`);
    }
  }

  if (schema.type === "object" || schema.properties) {
    if (schema.properties && typeof schema.properties === "object") {
      for (const [key, prop] of Object.entries(schema.properties)) {
        validateSchemaContract(prop, `${path}.${key}`);
      }
    }
  }
}

/**
 * Provider-specific schema adapter for Google Gemini API (Google GenAI SDK)
 */
function adaptSchemaForGemini(schema = UNIVERSAL_ANALYSIS_SCHEMA) {
  const cloned = JSON.parse(JSON.stringify(schema));
  function sanitizeForGemini(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node.type)) {
      const hasNull = node.type.includes("null");
      const primaryType = node.type.find(t => t !== "null") || "string";
      node.type = primaryType;
      if (hasNull) node.nullable = true;
    }
    if (node.properties && typeof node.properties === "object") {
      for (const val of Object.values(node.properties)) {
        sanitizeForGemini(val);
      }
    }
    if (node.items) {
      if (Array.isArray(node.items)) node.items.forEach(sanitizeForGemini);
      else sanitizeForGemini(node.items);
    }
  }
  sanitizeForGemini(cloned);
  validateSchemaContract(cloned, "gemini_response_schema");
  return cloned;
}

/**
 * Provider-specific schema adapter for OpenAI structured outputs
 */
function adaptSchemaForOpenAI(schema = UNIVERSAL_ANALYSIS_SCHEMA) {
  const cloned = JSON.parse(JSON.stringify(schema));
  validateSchemaContract(cloned, "openai_response_schema");
  return cloned;
}

function numberSetting(value, fallback, min, max) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isTransientError(error) {
  if (!error) return false;
  const status = Number(error.status || error.code || error.statusCode || 0);
  const msg = String(error.message || "").toLowerCase();

  // Explicit non-transient status codes / error types: do not retry
  if (status === 400 || status === 401 || status === 403 || status === 404 || status === 422) {
    return false;
  }
  if (/api_key_invalid|invalid_argument|bad request|unauthorized|forbidden|not_found/i.test(msg)) {
    return false;
  }

  // Transient status codes: 503 (Unavailable), 429 (Resource Exhausted / Rate limit), 502, 500
  if (status === 503 || status === 429 || status === 502 || status === 500) {
    return true;
  }
  if (/high demand|unavailable|temporarily unavailable|resource_exhausted|quota exceeded|busy|rate limit|econnreset|etimedout/i.test(msg)) {
    return true;
  }
  return false;
}

function parseRetryAfterMs(error) {
  const headers = error?.response?.headers || error?.headers;
  if (headers) {
    const headerVal = typeof headers.get === "function" ? headers.get("retry-after") : headers["retry-after"];
    if (headerVal) {
      const seconds = Number(headerVal);
      if (!Number.isNaN(seconds) && seconds > 0) {
        return Math.min(seconds * 1000, 15000);
      }
    }
  }
  const match = String(error?.message || "").match(/retry in\s+(\d+(\.\d+)?)\s*s/i);
  if (match && match[1]) {
    const s = parseFloat(match[1]);
    if (!Number.isNaN(s) && s > 0) {
      return Math.min(Math.round(s * 1000), 15000);
    }
  }
  return null;
}

/**
 * Creates Google Gemini Mentor Provider
 * Uses official @google/genai SDK with bounded retry, exponential backoff, and jitter
 */
function createGeminiMentorProvider({ env = process.env, client } = {}) {
  const apiKey = env.GEMINI_API_KEY;
  const model = env.AI_MENTOR_GEMINI_MODEL || "gemini-3.5-flash-lite";
  const timeoutMs = numberSetting(env.AI_MENTOR_TIMEOUT_MS, 45_000, 10, 120_000);
  const maxRetries = numberSetting(env.AI_MENTOR_MAX_RETRIES, 3, 0, 5);
  const baseDelayMs = numberSetting(env.AI_MENTOR_RETRY_BASE_MS, 1200, 100, 5000);
  const maxDelayMs = numberSetting(env.AI_MENTOR_RETRY_MAX_MS, 6000, 500, 15000);

  if (!client && (!apiKey || /^replace-with/i.test(apiKey))) {
    throw providerError("AI_NOT_CONFIGURED", "Gemini API key is not configured.", 503);
  }

  const ai = client || new GoogleGenAI({ apiKey });

  return {
    providerName: "gemini",
    model,
    async analyze({ instructions, input, problemContext, problemSlug }) {
      const prompt = `${instructions}\n\n${problemContext ? `PROBLEM CONTEXT:\n${problemContext}\n\n` : ""}STUDENT SUBMISSION AND TASK:\n${input}\n\nCRITICAL: Respond ONLY with a valid JSON object strictly matching the required schema. Ensure optimalCode contains complete, non-generic, working code in the requested language for this exact problem.`;

      const startTime = Date.now();
      let lastError = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const elapsed = Date.now() - startTime;
        const remainingBudgetMs = timeoutMs - elapsed;
        if (remainingBudgetMs <= 1000) {
          throw providerError("AI_TIMEOUT", "Gemini API timed out. Try again.", 504);
        }

        let timer = null;
        try {
          const timeoutPromise = new Promise((_, reject) => {
            timer = setTimeout(() => reject(providerError("AI_TIMEOUT", "Gemini API timed out. Try again.", 504)), remainingBudgetMs);
            if (timer?.unref) timer.unref();
          });

          const adaptedSchema = adaptSchemaForGemini(UNIVERSAL_ANALYSIS_SCHEMA);

          const generatePromise = ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: adaptedSchema,
              temperature: 0.2
            }
          });

          const result = await Promise.race([generatePromise, timeoutPromise]);
          const responseText = result?.text;
          const usage = result?.usageMetadata || null;

          if (!responseText || typeof responseText !== "string") {
            throw providerError("AI_INVALID_RESPONSE", "Gemini returned an empty response.");
          }

          let parsed;
          try {
            parsed = JSON.parse(responseText);
          } catch {
            throw providerError("AI_INVALID_RESPONSE", "Gemini response could not be parsed as JSON.");
          }

          parsed.provider = "gemini";
          parsed.model = model;
          if (!parsed.provenance) {
            parsed.provenance = {
              provider: "gemini",
              model,
              generatedAt: new Date().toISOString(),
              isVerifiedCurriculum: Boolean(problemSlug && CANONICAL_PROBLEMS[problemSlug]),
              confidence: "high"
            };
          }
          return { analysis: parsed, usage, model, provider: "gemini" };
        } catch (error) {
          lastError = error;

          // Non-transient errors: do not retry, fail immediately
          if (error.code === "AI_TIMEOUT" || error.name === "AbortError") {
            throw providerError("AI_TIMEOUT", "Gemini API timed out. Try again.", 504);
          }
          if (error.code === "AI_INVALID_RESPONSE" || error.code === "AI_INVALID_ARGUMENT") {
            throw error;
          }
          if (error.status === 400 || error.code === 400 || /INVALID_ARGUMENT|response_schema/i.test(error.message)) {
            throw providerError("AI_INVALID_ARGUMENT", `Gemini request or schema validation failed: ${error.message}`, 400);
          }
          if (error.status === 401 || error.status === 403 || /API_KEY_INVALID/i.test(error.message)) {
            throw providerError("AI_MODEL_UNAVAILABLE", "Gemini API key is invalid or unauthorized.", 503);
          }
          if (error.status === 404 || /NOT_FOUND/i.test(error.message)) {
            throw providerError("AI_MODEL_UNAVAILABLE", `The configured Gemini model (${model}) was not found.`, 503);
          }

          // Check if error is transient and retries remain
          const transient = isTransientError(error);
          if (!transient || attempt >= maxRetries) {
            if (error.status === 429 || error.code === 429 || /RESOURCE_EXHAUSTED/i.test(error.message)) {
              throw providerError("AI_RATE_LIMITED", "Gemini API quota exceeded or busy. Try again later.", 429);
            }
            throw providerError("AI_PROVIDER_UNAVAILABLE", `Gemini API is temporarily unavailable: ${error.message}`);
          }

          // Calculate backoff with jitter and respect Retry-After header
          const retryAfterMs = parseRetryAfterMs(error);
          let delayMs = retryAfterMs;
          if (!delayMs) {
            const exponential = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
            const jitter = (Math.random() * 0.4 - 0.2) * exponential;
            delayMs = Math.round(exponential + jitter);
          }

          if (Date.now() - startTime + delayMs + 1000 >= timeoutMs) {
            if (error.status === 429 || /RESOURCE_EXHAUSTED/i.test(error.message)) {
              throw providerError("AI_RATE_LIMITED", "Gemini API quota exceeded or busy. Try again later.", 429);
            }
            throw providerError("AI_TIMEOUT", "Gemini API timed out during retry backoff.", 504);
          }

          console.warn(`[GEMINI RETRY]: Attempt ${attempt + 1} failed with transient error (${error.status || error.code || '503'}: ${error.message?.slice(0, 80)}). Backing off ${delayMs}ms before retry...`);
          await sleep(delayMs);
        } finally {
          if (timer) clearTimeout(timer);
        }
      }

      throw providerError("AI_PROVIDER_UNAVAILABLE", `Gemini API is temporarily unavailable: ${lastError?.message || "Exceeded retry limit"}`);
    }
  };
}

/**
 * Creates OpenAI Mentor Provider
 * Supports both openai.responses.create (for tests / preview models) and openai.chat.completions.create (standard SDK)
 * with bounded retries, exponential backoff, and transparent error handling.
 */
function createOpenAIMentorProvider({ env = process.env, client } = {}) {
  const apiKey = env.OPENAI_API_KEY;
  const model = env.AI_MENTOR_MODEL || "gpt-4o-mini";
  const timeoutMs = numberSetting(env.AI_MENTOR_TIMEOUT_MS, 45_000, 10, 120_000);
  const maxOutputTokens = numberSetting(env.AI_MENTOR_MAX_OUTPUT_TOKENS, 3_000, 256, 12_000);
  const maxRetries = numberSetting(env.AI_MENTOR_MAX_RETRIES, 2, 0, 5);
  const baseDelayMs = numberSetting(env.AI_MENTOR_RETRY_BASE_MS, 1000, 10, 5000);

  if (!client && (!apiKey || /^replace-with/i.test(apiKey))) {
    throw providerError("AI_NOT_CONFIGURED", "OpenAI API key is not configured.", 503);
  }

  const openai = client || new OpenAI({ apiKey, timeout: timeoutMs, maxRetries: 0 });

  return {
    providerName: "openai",
    model,
    async analyze({ instructions, input, problemContext }) {
      const fullInput = problemContext ? `${problemContext}\n\n${input}` : input;

      // Path A: openai.responses.create (Mock in tests or Responses API)
      if (typeof openai?.responses?.create === "function") {
        const adaptedSchema = adaptSchemaForOpenAI(UNIVERSAL_ANALYSIS_SCHEMA);
        let response;
        try {
          response = await openai.responses.create({
            model,
            instructions,
            input: fullInput,
            max_output_tokens: maxOutputTokens,
            text: {
              format: {
                type: "json_schema",
                name: "ai_code_mentor_analysis",
                strict: true,
                schema: adaptedSchema
              }
            }
          });
        } catch (error) {
          if (error?.name === "APIConnectionTimeoutError" || error?.name === "AbortError") {
            throw providerError("AI_TIMEOUT", "AI Code Mentor timed out. Try again.", 504);
          }
          if (error?.status === 400 || /invalid_request_error|bad_request|schema/i.test(error?.message)) {
            throw providerError("AI_INVALID_ARGUMENT", `OpenAI request or schema validation failed: ${error.message}`, 400);
          }
          if (error?.status === 429) {
            throw providerError("AI_RATE_LIMITED", "AI Code Mentor is busy. Try again later.", 429);
          }
          if (error?.status === 401 || error?.status === 403 || error?.status === 404 || error?.code === "model_not_found") {
            throw providerError("AI_MODEL_UNAVAILABLE", "The configured OpenAI model is unavailable.", 503);
          }
          throw providerError("AI_PROVIDER_UNAVAILABLE", "AI Code Mentor is temporarily unavailable.");
        }

        if (response?.status === "incomplete") {
          throw providerError("AI_INCOMPLETE", "AI Code Mentor could not complete this review.");
        }
        const refusal = response?.output?.find(item => item?.type === "message")?.content?.find(item => item?.type === "refusal");
        if (refusal) {
          throw providerError("AI_REFUSED", "AI Code Mentor could not review this request.", 422);
        }
        if (typeof response?.output_text !== "string" || !response.output_text.trim()) {
          throw providerError("AI_INVALID_RESPONSE", "AI Code Mentor returned an invalid response.");
        }

        try {
          const parsed = JSON.parse(response.output_text);
          parsed.provider = "openai";
          parsed.model = model;
          return { analysis: parsed, usage: response.usage || null, model, provider: "openai" };
        } catch {
          throw providerError("AI_INVALID_RESPONSE", "AI Code Mentor returned an invalid response.");
        }
      }

      // Path B: Standard Chat Completions with Structured Outputs and Bounded Retry
      const systemPrompt = `${instructions}\n\nYou must return valid JSON that conforms to the schema. Ensure optimalCode contains complete, non-generic, working code in the requested language for this exact problem.`;
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: fullInput }
      ];

      const startTime = Date.now();
      let lastError = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const elapsed = Date.now() - startTime;
        if (timeoutMs - elapsed <= 1000) {
          throw providerError("AI_TIMEOUT", "OpenAI API timed out. Try again.", 504);
        }

        try {
          const adaptedSchema = adaptSchemaForOpenAI(UNIVERSAL_ANALYSIS_SCHEMA);
          const completion = await openai.chat.completions.create({
            model,
            messages,
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "ai_code_mentor_analysis",
                strict: true,
                schema: adaptedSchema
              }
            },
            max_tokens: maxOutputTokens,
            temperature: 0.2
          });

          const choice = completion?.choices?.[0];
          if (choice?.message?.refusal) {
            throw providerError("AI_REFUSED", "OpenAI refused this analysis request.", 422);
          }
          const rawText = choice?.message?.content;
          if (!rawText || typeof rawText !== "string") {
            throw providerError("AI_INVALID_RESPONSE", "OpenAI returned an empty response.");
          }

          let parsed;
          try {
            parsed = JSON.parse(rawText);
          } catch {
            throw providerError("AI_INVALID_RESPONSE", "OpenAI response could not be parsed as JSON.");
          }

          parsed.provider = "openai";
          parsed.model = model;
          return { analysis: parsed, usage: completion.usage || null, model, provider: "openai" };
        } catch (error) {
          lastError = error;
          if (error.code === "AI_TIMEOUT" || error.name === "AbortError" || error.name === "APIConnectionTimeoutError") {
            throw providerError("AI_TIMEOUT", "OpenAI API timed out. Try again.", 504);
          }
          if (error.code === "AI_INVALID_RESPONSE" || error.code === "AI_REFUSED" || error.code === "AI_INVALID_ARGUMENT") {
            throw error;
          }
          if (error.status === 400 || error.code === 400 || /invalid_request_error|bad_request|schema/i.test(error.message)) {
            throw providerError("AI_INVALID_ARGUMENT", `OpenAI request or schema validation failed: ${error.message}`, 400);
          }
          if (error.status === 401 || error.status === 403 || error.code === "model_not_found") {
            throw providerError("AI_MODEL_UNAVAILABLE", "The configured OpenAI model or API key is invalid.", 503);
          }

          if (attempt >= maxRetries) {
            if (error.status === 429) {
              throw providerError("AI_RATE_LIMITED", "OpenAI API rate limit or quota exceeded. Try again later.", 429);
            }
            throw providerError("AI_PROVIDER_UNAVAILABLE", `OpenAI API is temporarily unavailable: ${error.message || "Retry limit reached"}`);
          }

          const exponential = Math.min(baseDelayMs * Math.pow(2, attempt), 6000);
          const jitter = (Math.random() * 0.4 - 0.2) * exponential;
          const delayMs = Math.round(exponential + jitter);
          console.warn(`[OPENAI RETRY]: Attempt ${attempt + 1} failed (${error.status || error.code || '503'}). Backing off ${delayMs}ms...`);
          await sleep(delayMs);
        }
      }

      throw providerError("AI_PROVIDER_UNAVAILABLE", `OpenAI API is temporarily unavailable: ${lastError?.message || "Exceeded retry limit"}`);
    }
  };
}

/**
 * Creates Local Knowledge Provider
 * 100% offline, zero network required. Uses verified educational curriculum.
 */
function createLocalKnowledgeProvider({ knowledgeBase = CANONICAL_PROBLEMS } = {}) {
  return {
    providerName: "local",
    model: "local-curriculum-v1",
    async analyze({ input, problemContext, problemSlug, language, sourceCode, verdict }) {
      const slug = String(problemSlug || "").toLowerCase();
      const lang = String(language || "python3").toLowerCase();
      const verified = knowledgeBase[slug] || retrieveProblem({ problemSlug: slug });
      const isVerified = Boolean(verified && (verified.isVerified || verified.metadataVerificationStatus === "VERIFIED" || knowledgeBase[slug]));

      const rawCode = typeof sourceCode === "string" ? sourceCode : (typeof input === "string" && !input.startsWith("MODE:") ? input : "");
      const codeIntel = analyzeStudentCode({
        sourceCode: rawCode,
        language: lang,
        problem: verified,
        verdict: verdict || "Accepted",
        sourceProvenance: "local_curriculum"
      });

      if (isVerified) {
        const multiTier = generateMultiTierSolutions({
          problem: verified,
          language: lang,
          studentCode: rawCode,
          verdict: verdict || "Accepted"
        });

        return {
          provider: "local",
          model: "local-curriculum-v1",
          analysis: {
            provider: "local",
            model: "local-curriculum-v1",
            problemTitle: verified.title || "Curriculum Problem",
            language: lang,
            solutions: multiTier.solutions,
            solutionComparison: multiTier.solutionComparison,
            studentComparison: multiTier.studentComparison,
            studentApproach: codeIntel.overview || verified.studentApproach || `Local curriculum reference analysis for ${verified.title}`,
            correctnessStatus: codeIntel.diagnosis?.verdict || "Accepted",
            mistakeDiagnosis: {
              hasMistake: codeIntel.diagnosis?.hasMistake || false,
              title: codeIntel.diagnosis?.title || null,
              detail: codeIntel.diagnosis?.explanation || null,
              counterExample: codeIntel.diagnosis?.counterExample || null,
              suggestedFix: codeIntel.diagnosis?.recommendation || codeIntel.diagnosis?.defensiveGuard || null
            },
            studentComplexity: (codeIntel.complexity && codeIntel.complexity.timeComplexity !== "O(n)") ? {
              timeComplexity: codeIntel.complexity.timeComplexity,
              spaceComplexity: codeIntel.complexity.auxiliarySpace,
              explanation: codeIntel.complexity.timeDerivation
            } : (verified.studentComplexity || {
              timeComplexity: verified.timeComplexity || codeIntel.complexity?.timeComplexity || "O(n)",
              spaceComplexity: verified.spaceComplexity || codeIntel.complexity?.auxiliarySpace || "O(1)",
              explanation: verified.timeExplain || codeIntel.complexity?.timeDerivation || "Linear sequence traversal."
            }),
            sourceUnderstanding: codeIntel.overview,
            codeStructure: {
              signatures: codeIntel.signatures,
              loops: codeIntel.loops
            },
            lineByLineExplanation: codeIntel.lineByLineWalkthrough,
            variableAnalysis: codeIntel.variables,
            controlFlowAnalysis: {
              loops: codeIntel.loops
            },
            dataStructureAnalysis: codeIntel.dataStructures,
            algorithmPattern: codeIntel.algorithmPattern,
            codeProblemConsistency: codeIntel.consistency,
            evidenceBasedFindings: codeIntel.evidenceBasedFindings,
            diagnosisConfidence: codeIntel.algorithmPattern.confidence,
            animationSteps: codeIntel.animaticTrace?.isSupported ? codeIntel.animaticTrace.steps : null,
            animationType: codeIntel.animaticTrace?.pattern?.includes("In-Place") ? "array-inplace" : "two-pointer",
            bruteForce: {
              title: verified.bruteForceTitle || "Exhaustive Search",
              algorithm: verified.bruteForceExplain || "Checks all combinations.",
              code: null,
              timeComplexity: verified.bruteForceTime || "O(n²)",
              spaceComplexity: verified.bruteForceSpace || "O(1)",
              explanation: verified.bruteForceExplain || "Evaluates every possibility."
            },
            optimalApproach: {
              title: verified.optimalTitle || "Optimal Solution",
              algorithm: verified.optimalExplain || "Linear or sublinear traversal.",
              whyItWorks: verified.keyObservation || "Eliminates redundant operations using algorithmic invariants.",
              keyInvariants: "Problem invariants preserved."
            },
            optimalCode: verified.acceptedCodeByLang?.[lang] || verified.optimalCode || verified.acceptedCode || "// Code available in curriculum",
            optimalComplexity: {
              timeComplexity: verified.optimalTime || verified.timeComplexity || "O(n)",
              spaceComplexity: verified.optimalSpace || verified.spaceComplexity || "O(1)",
              auxiliarySpace: verified.auxiliarySpace || verified.optimalSpace || "O(1)",
              totalSpace: verified.totalSpace || "O(n)",
              explanation: verified.timeExplain || "Optimized time bounds."
            },
            comparison: [
              { approach: "Brute Force", timeComplexity: verified.bruteForceTime || "O(n²)", spaceComplexity: verified.bruteForceSpace || "O(1)", verdict: "Valid baseline" },
              { approach: "Student Solution", timeComplexity: verified.timeComplexity || "O(n)", spaceComplexity: verified.spaceComplexity || "O(1)", verdict: "Accepted logic" },
              { approach: verified.optimalTitle || "Optimal Solution", timeComplexity: verified.optimalTime || verified.timeComplexity || "O(n)", spaceComplexity: verified.optimalSpace || "O(1)", verdict: "Optimal template" }
            ],
            codeComparison: verified.codeComparison || [
              { approach: "Brute Force", intuition: verified.bruteForceExplain || "Exhaustive evaluation", timeComplexity: verified.bruteForceTime || "O(n²)", auxiliarySpace: verified.bruteForceSpace || "O(1)", verdict: "Valid baseline", tradeOffs: "Exhaustive combinatorial overhead" },
              { approach: "Student Solution", intuition: verified.studentApproach || "Submitted logic", timeComplexity: verified.timeComplexity || "O(n)", auxiliarySpace: verified.spaceComplexity || "O(1)", verdict: "Accepted logic", tradeOffs: "Direct implementation" },
              { approach: verified.optimalTitle || "Optimal Solution", intuition: verified.optimalExplain || "Optimal invariant traversal", timeComplexity: verified.optimalTime || verified.timeComplexity || "O(n)", auxiliarySpace: verified.optimalSpace || "O(1)", verdict: "Optimal template", tradeOffs: "Minimal pointer and auxiliary footprint" }
            ],
            coreObservations: verified.coreObservations || [
              verified.keyObservation || "Maintain core algorithmic invariants."
            ],
            improvedApproach: verified.improvedApproach || null,
            correctnessReasoning: verified.correctnessReasoning || {
              method: "Invariant Verification",
              explanation: verified.optimalExplain || "Preserves problem invariants.",
              keyInvariant: verified.keyObservation || "Invariants hold throughout execution."
            },
            complexityAnalysis: verified.complexityAnalysis || {
              timeComplexity: verified.optimalTime || verified.timeComplexity || "O(n)",
              spaceComplexity: verified.optimalSpace || verified.spaceComplexity || "O(1)",
              auxiliarySpace: verified.auxiliarySpace || "O(1)",
              totalSpace: verified.totalSpace || "O(n)",
              derivation: verified.timeExplain || "Sequence traversal.",
              pointerMovement: "Monotonic forward traversal."
            },
            keyTakeaways: verified.keyTakeaways || [
              "Analyze actual pointer movement to establish true bounds.",
              "Greedy selection is optimal when greedy-choice property holds.",
              "Preserve problem-specific constraints and in-place invariants."
            ],
            provenance: {
              provider: "local",
              model: "local-curriculum-v1",
              generatedAt: new Date().toISOString(),
              isVerifiedCurriculum: true,
              confidence: "high"
            },
            summary: `Educational curriculum analysis for ${verified.title}.`,
            problemUnderstanding: {
              whatItAsks: verified.whatItAsks || `Find the optimal solution for ${verified.title}.`,
              inputOutput: verified.inputOutput || (verified.expectedInputType ? `Input: ${verified.expectedInputType}. Output: ${verified.expectedOutputType}.` : "Valid inputs to target output."),
              constraints: verified.constraints || "Standard curriculum bounds.",
              keyObservation: verified.keyObservation || verified.optimalExplain || "Maintain core algorithmic invariants."
            },
            edgeCases: verified.edgeCases || [
              { caseName: "Boundary or minimal input", input: "Minimal constraints", expected: "Base case result", explanation: "Handles edge bounds gracefully.", handledBy: "Guard clause" }
            ],
            variableTracking: verified.variableTracking || {
              variableNames: ["left", "right", "state"],
              steps: [
                { step: "Init", vars: "pointers = 0, state = ready", evaluation: "Pre-loop invariant verified", memory: "Stack variables initialized" },
                { step: "Iteration 1", vars: "curr = element[0], memo = updated", evaluation: "Condition evaluated true", memory: "Heap state mutated" },
                { step: "Final", vars: "return = target_result", evaluation: "Algorithm converged", memory: "Garbage collection ready" }
              ]
            },
            sections: [
              { id: "problem-understanding", title: "Problem Overview", content: verified.statement || verified.description || "" },
              { id: "optimal-approach", title: "Optimal Strategy", content: verified.optimalExplain || "" }
            ],
            unavailableSections: []
          }
        };
      }

      // If unverified, clearly report lack of local curated solution rather than fabricating fake code
      const fallbackMultiTier = generateMultiTierSolutions({
        problem: { title: verified?.title || "Non-Curriculum Problem", slug },
        language: lang,
        studentCode: rawCode,
        verdict: verdict || "Accepted"
      });

      return {
        provider: "local",
        model: "local-curriculum-v1",
        fallbackNotice: "Local fallback knowledge engine active. Dynamic solutions and deep reasoning for arbitrary non-curriculum problems require a configured live AI provider (Gemini or OpenAI).",
        analysis: {
          provider: "local",
          model: "local-curriculum-v1",
          problemTitle: "Unverified LeetCode Problem",
          language: lang,
          solutions: fallbackMultiTier.solutions,
          solutionComparison: fallbackMultiTier.solutionComparison,
          studentComparison: fallbackMultiTier.studentComparison,
          studentApproach: codeIntel.overview || "Student submission analyzed via local static code intelligence engine.",
          correctnessStatus: "Unanalyzed",
          mistakeDiagnosis: { hasMistake: codeIntel.diagnosis?.hasMistake || false },
          studentComplexity: {
            timeComplexity: codeIntel.complexity?.timeComplexity || "—",
            spaceComplexity: codeIntel.complexity?.auxiliarySpace || "—",
            explanation: codeIntel.complexity?.timeDerivation || "Static code flow complexity derivation."
          },
          algorithmPattern: codeIntel.algorithmPattern,
          bruteForce: {
            title: "Unavailable",
            algorithm: "Connect Gemini or OpenAI API key to analyze arbitrary problems dynamically.",
            timeComplexity: "—",
            spaceComplexity: "—",
            explanation: "Requires live AI provider."
          },
          optimalApproach: {
            title: "Unavailable without AI Provider",
            algorithm: "Curated solution not present in local educational engine.",
            whyItWorks: "Configure GEMINI_API_KEY or OPENAI_API_KEY in server .env to enable real-time dynamic analysis.",
            keyInvariants: "None"
          },
          optimalCode: null,
          optimalComplexity: {
            timeComplexity: codeIntel.complexity?.timeComplexity || "—",
            spaceComplexity: codeIntel.complexity?.auxiliarySpace || "—",
            auxiliarySpace: codeIntel.complexity?.auxiliarySpace || "—",
            totalSpace: "—",
            explanation: "Static code flow analysis."
          },
          summary: "This problem is not part of the verified offline curriculum. Configure GEMINI_API_KEY to enable live AI analysis.",
          problemUnderstanding: {
            whatItAsks: "Requires live AI mentor analysis.",
            inputOutput: "—",
            constraints: "—",
            keyObservation: "Curated solution not present in local educational engine."
          },
          edgeCases: [],
          variableTracking: {
            variableNames: [],
            steps: []
          },
          sections: [],
          unavailableSections: [
            { id: "optimal-approach", reason: "Requires GEMINI_API_KEY or OPENAI_API_KEY on the server." }
          ]
        }
      };
    }
  };
}

/**
 * Unified Provider: Coordinates Gemini, OpenAI, and Local Knowledge Engine
 * Respects AI_MENTOR_PROVIDER configuration and explicit fallbacks
 */
function createUnifiedMentorProvider({
  env = process.env,
  geminiClient,
  openAiClient,
  localKnowledgeBase = CANONICAL_PROBLEMS
} = {}) {
  const preferredProvider = String(env.AI_MENTOR_PROVIDER || "gemini").toLowerCase().trim();

  let geminiProvider = null;
  let openAiProvider = null;
  const localProvider = createLocalKnowledgeProvider({ knowledgeBase: localKnowledgeBase });

  try {
    geminiProvider = createGeminiMentorProvider({ env, client: geminiClient });
  } catch {}

  try {
    openAiProvider = createOpenAIMentorProvider({ env, client: openAiClient });
  } catch {}

  return {
    async analyze(request) {
      // 1. If provider explicitly configured as local
      if (preferredProvider === "local") {
        return await localProvider.analyze(request);
      }

      // 2. If provider is gemini (default)
      if (preferredProvider === "gemini") {
        if (geminiProvider) {
          try {
            return await geminiProvider.analyze(request);
          } catch (geminiError) {
            console.error("[GEMINI PROVIDER ERROR]:", geminiError?.message, geminiError?.status, geminiError?.code);
            // Optional fallback to OpenAI if configured
            if (openAiProvider && env.AI_MENTOR_ENABLE_FALLBACK === "true") {
              try {
                return await openAiProvider.analyze(request);
              } catch {}
            }
            // Fallback to local
            const localRes = await localProvider.analyze(request);
            localRes.fallbackNotice = `Primary Gemini provider failed (${geminiError.message}). Serving local knowledge engine.`;
            return localRes;
          }
        }
        // If Gemini not configured, try OpenAI fallback or local
        if (openAiProvider) {
          try { return await openAiProvider.analyze(request); } catch {}
        }
        return await localProvider.analyze(request);
      }

      // 3. If provider is openai
      if (preferredProvider === "openai") {
        if (openAiProvider) {
          try {
            return await openAiProvider.analyze(request);
          } catch (openAiError) {
            if (geminiProvider && env.AI_MENTOR_ENABLE_FALLBACK === "true") {
              try {
                return await geminiProvider.analyze(request);
              } catch {}
            }
            const localRes = await localProvider.analyze(request);
            localRes.fallbackNotice = `Primary OpenAI provider failed (${openAiError.message}). Serving local knowledge engine.`;
            return localRes;
          }
        }
        if (geminiProvider) {
          try { return await geminiProvider.analyze(request); } catch {}
        }
        return await localProvider.analyze(request);
      }

      // Default: local
      return await localProvider.analyze(request);
    }
  };
}

/**
 * Checks provider configuration safely without exposing secrets
 */
function checkProviderStatus(env = process.env) {
  const geminiConfigured = Boolean(env.GEMINI_API_KEY && !/^replace-with/i.test(env.GEMINI_API_KEY));
  const openAiConfigured = Boolean(env.OPENAI_API_KEY && !/^replace-with/i.test(env.OPENAI_API_KEY));
  const activeProvider = String(env.AI_MENTOR_PROVIDER || (geminiConfigured ? "gemini" : openAiConfigured ? "openai" : "local")).toLowerCase();

  return {
    activeProvider,
    gemini: {
      configured: geminiConfigured,
      model: env.AI_MENTOR_GEMINI_MODEL || "gemini-3.1-flash-lite"
    },
    openai: {
      configured: openAiConfigured,
      model: env.AI_MENTOR_MODEL || "gpt-4o-mini"
    },
    local: {
      configured: true,
      model: "local-curriculum-v1"
    },
    fallbackConfigured: env.AI_MENTOR_ENABLE_FALLBACK === "true"
  };
}

module.exports = {
  ANALYSIS_SCHEMA,
  UNIVERSAL_ANALYSIS_SCHEMA,
  providerError,
  validateSchemaContract,
  adaptSchemaForGemini,
  adaptSchemaForOpenAI,
  createGeminiMentorProvider,
  createOpenAIMentorProvider,
  createLocalKnowledgeProvider,
  createUnifiedMentorProvider,
  checkProviderStatus
};
