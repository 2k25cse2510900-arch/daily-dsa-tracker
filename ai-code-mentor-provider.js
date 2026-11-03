"use strict";

const OpenAI = require("openai");

const ANALYSIS_SCHEMA = Object.freeze({
  type: "object", additionalProperties: false,
  required: ["summary", "sections", "unavailableSections", "followUpQuestion", "uncertaintyNote"],
  properties: {
    summary: { type: "string", maxLength: 2400 },
    sections: { type: "array", maxItems: 11, items: { type: "object", additionalProperties: false, required: ["id", "title", "content"], properties: { id: { type: "string" }, title: { type: "string" }, content: { type: "string", maxLength: 5000 } } } },
    unavailableSections: { type: "array", maxItems: 11, items: { type: "object", additionalProperties: false, required: ["id", "reason"], properties: { id: { type: "string" }, reason: { type: "string", maxLength: 500 } } } },
    followUpQuestion: { type: ["string", "null"], maxLength: 500 },
    uncertaintyNote: { type: ["string", "null"], maxLength: 800 }
  }
});

function providerError(code, message, status = 503) {
  const error = new Error(message); error.code = code; error.status = status; return error;
}

function requiredConfig(env) {
  const apiKey = env.OPENAI_API_KEY;
  const model = env.AI_MENTOR_MODEL;
  if (!apiKey || /^replace-with/i.test(apiKey)) throw providerError("AI_NOT_CONFIGURED", "AI Code Mentor is not configured yet.", 503);
  if (!model || !/^[A-Za-z0-9._:-]{1,100}$/.test(model)) throw providerError("AI_MODEL_NOT_CONFIGURED", "AI Code Mentor model configuration is missing or invalid.", 503);
  return { apiKey, model };
}

function numberSetting(value, fallback, min, max) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
}

function createOpenAIMentorProvider({ env = process.env, client } = {}) {
  const config = requiredConfig(env);
  const timeout = numberSetting(env.AI_MENTOR_TIMEOUT_MS, 20_000, 1_000, 60_000);
  const maxOutputTokens = numberSetting(env.AI_MENTOR_MAX_OUTPUT_TOKENS, 2_000, 256, 8_000);
  const openai = client || new OpenAI({ apiKey: config.apiKey, timeout, maxRetries: 0 });
  return {
    model: config.model,
    async analyze({ instructions, input }) {
      let response;
      try {
        response = await openai.responses.create({ model: config.model, instructions, input, max_output_tokens: maxOutputTokens, text: { format: { type: "json_schema", name: "ai_code_mentor_analysis", strict: true, schema: ANALYSIS_SCHEMA } } });
      } catch (error) {
        if (error?.name === "APIConnectionTimeoutError" || error?.name === "AbortError") throw providerError("AI_TIMEOUT", "AI Code Mentor timed out. Try again.");
        if (error?.status === 429) throw providerError("AI_RATE_LIMITED", "AI Code Mentor is busy. Try again later.", 429);
        if (error?.status === 401 || error?.status === 403 || error?.status === 404 || error?.code === "model_not_found") throw providerError("AI_MODEL_UNAVAILABLE", "The configured AI Code Mentor model is unavailable.", 503);
        throw providerError("AI_PROVIDER_UNAVAILABLE", "AI Code Mentor is temporarily unavailable.");
      }
      if (response?.status === "incomplete") throw providerError("AI_INCOMPLETE", "AI Code Mentor could not complete this review.");
      const refusal = response?.output?.find(item => item?.type === "message")?.content?.find(item => item?.type === "refusal");
      if (refusal) throw providerError("AI_REFUSED", "AI Code Mentor could not review this request.", 422);
      if (typeof response?.output_text !== "string" || !response.output_text.trim()) throw providerError("AI_INVALID_RESPONSE", "AI Code Mentor returned an invalid response.");
      try { return { analysis: JSON.parse(response.output_text), usage: response.usage || null, model: config.model }; }
      catch { throw providerError("AI_INVALID_RESPONSE", "AI Code Mentor returned an invalid response."); }
    }
  };
}

module.exports = { ANALYSIS_SCHEMA, providerError, createOpenAIMentorProvider };
