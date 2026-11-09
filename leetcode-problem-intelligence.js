"use strict";

/**
 * LeetCode Problem Intelligence Layer
 * Re-exports and integrates the Problem Intelligence Engine.
 * Maintains full backward compatibility with existing tests and callers.
 */

const {
  VERIFICATION_STATUSES,
  METADATA_COMPLETENESS,
  CANONICAL_PROBLEMS,
  cleanText,
  extractSlug,
  extractNumber,
  extractExamples,
  extractConstraints,
  inferInputOutputTypes,
  createCanonicalProblemModel,
  retrieveProblem,
  buildGeminiPromptContext
} = require("./problem-intelligence-engine");

/**
 * Resolves problem identity from available indicators.
 * Flags ambiguity or contradictions (e.g. ID/slug mismatch) clearly.
 */
function resolveProblemIdentity(query = {}) {
  const model = retrieveProblem(query);
  if (model.metadataVerificationStatus === VERIFICATION_STATUSES.AMBIGUOUS) {
    return {
      ...model,
      confidence: "ambiguous",
      clarificationNeeded: true,
      reason: model.ambiguityReason || "Problem identity is ambiguous. Provide the problem title, LeetCode number, URL, or problem statement."
    };
  }
  return model;
}

/**
 * Formats problem context for AI prompts.
 */
function buildProblemPromptContext(problem, language) {
  return buildGeminiPromptContext(problem, language);
}

module.exports = {
  CANONICAL_PROBLEMS,
  VERIFICATION_STATUSES,
  METADATA_COMPLETENESS,
  resolveProblemIdentity,
  retrieveProblem,
  extractSlug,
  extractNumber,
  extractExamples,
  extractConstraints,
  inferInputOutputTypes,
  createCanonicalProblemModel,
  buildProblemPromptContext,
  buildGeminiPromptContext,
  cleanText
};
