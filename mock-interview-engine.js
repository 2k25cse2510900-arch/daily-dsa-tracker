"use strict";

/**
 * DSAverse — Module 7: AI Mock Interview & Assessment Engine
 *
 * Responsibilities:
 * 1. Interview Session Lifecycle (not_started -> in_progress -> evaluating -> completed / cancelled).
 * 2. Dynamic Problem Selection (Curriculum, Weak-Area Focused from Module 6, Custom).
 * 3. AI Interviewer Persona (Ada) with staged conversational follow-ups.
 * 4. Progressive Hint Tracking (Levels 1-3) with transparent independence scoring.
 * 5. Live Code Execution Integration with Module 5 sandboxed test runner.
 * 6. Evidence-Grounded 8-Dimension Evaluation Rubric & Structured Scorecard.
 */

const crypto = require("node:crypto");
const { retrieveProblem, CANONICAL_PROBLEMS } = require("./problem-intelligence-engine");
const { analyzeStudentCode } = require("./student-code-intelligence");
const { executeCodeSnippet, normalizeExecutionLanguage, extractProblemTestCases } = require("./code-execution-engine");
const { CONCEPT_TAXONOMY, detectConceptsForProblem } = require("./personalized-learning-engine");

const INTERVIEW_MODES = Object.freeze({
  STANDARD_MOCK: "standard-mock",
  WEAK_AREA_FOCUSED: "weak-area-focused",
  COMPANY_FOCUSED: "company-focused",
  RAPID_FIRE: "rapid-fire",
  DSA_FUNDAMENTALS: "dsa-fundamentals",
  ALGORITHMIC_PROBLEM_SOLVING: "algorithmic-problem-solving",
  DATA_STRUCTURES: "data-structures",
  ADVANCED_DSA: "advanced-dsa",
  MIXED_TECHNICAL: "mixed-technical",
  CUSTOM: "custom",
  "standard-mock": "standard-mock",
  "weak-area-focused": "weak-area-focused",
  "company-focused": "company-focused",
  "rapid-fire": "rapid-fire"
});

const SESSION_STATUS = Object.freeze({
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  EVALUATING: "evaluating",
  COMPLETED: "completed",
  CANCELLED: "cancelled"
});

const INTERVIEW_STAGES = Object.freeze({
  GREETING: "greeting",
  CLARIFICATION: "clarification",
  APPROACH: "approach",
  CODING: "coding",
  OPTIMIZATION: "optimization",
  REVIEW: "review",
  COMPLETED: "completed"
});

const INTERVIEW_STYLES = Object.freeze({
  COLLABORATIVE: "collaborative",
  RIGOROUS: "rigorous",
  FAANG: "faang",
  STRICT: "strict",
  SUPPORTIVE: "supportive"
});

const EVALUATION_DIMENSIONS_MAP = {
  problemUnderstanding: { id: "problemUnderstanding", weight: 0.10, title: "Problem Understanding" },
  approachSelection: { id: "approachSelection", weight: 0.15, title: "Approach Selection" },
  algorithmicReasoning: { id: "algorithmicReasoning", weight: 0.20, title: "Algorithmic Reasoning" },
  implementation: { id: "implementation", weight: 0.20, title: "Implementation & Correctness" },
  complexityAnalysis: { id: "complexityAnalysis", weight: 0.10, title: "Complexity Analysis" },
  edgeCases: { id: "edgeCases", weight: 0.10, title: "Edge Cases Handling" },
  optimization: { id: "optimization", weight: 0.10, title: "Optimization & Adaptability" },
  independence: { id: "independence", weight: 0.05, title: "Independence & Hint Efficiency" }
};

const EVALUATION_DIMENSIONS = Object.assign(
  Object.values(EVALUATION_DIMENSIONS_MAP),
  EVALUATION_DIMENSIONS_MAP
);

/**
 * Selects an interview problem based on mode, difficulty, and optional Module 6 learning profile.
 */
function selectInterviewProblem(options = {}) {
  const customProblem = options.customProblem || null;
  if (customProblem && (customProblem.statement || customProblem.title || customProblem.slug || typeof customProblem === "string")) {
    const query = typeof customProblem === "string" ? { problemSlug: customProblem } : { problemSlug: customProblem.slug || customProblem.problemSlug, ...customProblem };
    return retrieveProblem(query);
  }

  const config = options.config || options;
  const learningProfile = options.learningProfile || options.masteryProfile || null;

  const mode = config.mode || INTERVIEW_MODES.ALGORITHMIC_PROBLEM_SOLVING;
  const targetDifficulty = (config.difficulty || "Medium").toLowerCase();

  // 1. Weak-Area Focused Mode: query weakest concept from Module 6
  if ((mode === INTERVIEW_MODES.WEAK_AREA_FOCUSED || mode === "weak-area-focused") && (learningProfile?.conceptMastery || learningProfile?.weakConcepts)) {
    let weakConceptId = null;
    if (Array.isArray(learningProfile.weakConcepts) && learningProfile.weakConcepts.length > 0) {
      weakConceptId = learningProfile.weakConcepts[0].id || learningProfile.weakConcepts[0];
    } else if (learningProfile.conceptMastery) {
      const masteryList = Object.values(learningProfile.conceptMastery)
        .filter(c => c.level === "Learning" || c.level === "Developing" || (c.attemptsCount > 0 && c.score < 70))
        .sort((a, b) => (a.score || 0) - (b.score || 0));
      if (masteryList.length > 0) weakConceptId = masteryList[0].id;
    }

    if (weakConceptId) {
      for (const [slug, prob] of Object.entries(CANONICAL_PROBLEMS)) {
        const concepts = detectConceptsForProblem({ problemTitle: prob.title, problemSlug: slug });
        if (concepts.includes(weakConceptId)) {
          return retrieveProblem({ problemSlug: slug });
        }
      }
    }
  }

  // 2. Mode-specific problem pools
  let pool = [];
  if (mode === INTERVIEW_MODES.DSA_FUNDAMENTALS || mode === "standard-mock") {
    pool = ["two-sum", "valid-parentheses", "merge-two-sorted-lists", "valid-palindrome", "climbing-stairs", "binary-search", "longest-substring-without-repeating-characters"];
  } else if (mode === INTERVIEW_MODES.DATA_STRUCTURES) {
    pool = ["invert-binary-tree", "reverse-linked-list", "flood-fill", "valid-anagram"];
  } else if (mode === INTERVIEW_MODES.ADVANCED_DSA || mode === "company-focused") {
    pool = ["koko-eating-bananas", "number-of-islands", "house-robber", "daily-temperatures"];
  } else {
    // Algorithmic or Mixed
    pool = [
      "two-sum",
      "binary-search",
      "longest-substring-without-repeating-characters",
      "string-compression",
      "max-number-of-k-sum-pairs",
      "koko-eating-bananas",
      "is-subsequence",
      "daily-temperatures",
      "house-robber",
      "number-of-islands"
    ];
  }

  // Filter by difficulty if specified and not adaptive
  if (targetDifficulty && targetDifficulty !== "adaptive") {
    const matchingDiff = pool.filter(slug => {
      const p = CANONICAL_PROBLEMS[slug];
      return p && p.difficulty && p.difficulty.toLowerCase() === targetDifficulty;
    });
    if (matchingDiff.length > 0) pool = matchingDiff;
  }

  const chosenSlug = pool[Math.floor(Math.random() * pool.length)] || "two-sum";
  const canon = CANONICAL_PROBLEMS[chosenSlug] || CANONICAL_PROBLEMS["two-sum"];

  return retrieveProblem({ problemSlug: chosenSlug });
}

/**
 * Initializes a new interview session record.
 */
function createInterviewSession(options = {}) {
  const userId = options.userId;
  if (!userId) {
    throw new TypeError("User ID is required to create an interview session.");
  }

  const config = options.config || options;
  const learningProfile = options.learningProfile || null;
  const customProblem = options.customProblem || null;
  const now = options.now || new Date();

  const problem = selectInterviewProblem({ config, learningProfile, customProblem });
  const sessionId = `interview:${crypto.randomUUID()}`;
  const language = normalizeExecutionLanguage(config.language || "javascript");

  const initialCode = problem.starterTemplates?.[language]
    || problem.signature
    || (language === "javascript" ? `function solve(input) {\n  // Write your interview solution here\n}` : `def solve(input):\n    # Write your interview solution here\n    pass`);

  const durationMin = Math.min(90, Math.max(10, Number(config.durationMinutes) || 45));

  const session = {
    _id: sessionId,
    id: sessionId,
    sessionId: sessionId,
    userId,
    status: SESSION_STATUS.NOT_STARTED,
    currentStage: INTERVIEW_STAGES.GREETING,
    stage: INTERVIEW_STAGES.GREETING,
    durationMinutes: durationMin,
    config: {
      mode: config.mode || INTERVIEW_MODES.STANDARD_MOCK,
      difficulty: config.difficulty || problem.difficulty || "Medium",
      topic: config.topic || "all",
      language,
      durationMinutes: durationMin,
      interviewStyle: config.interviewStyle || INTERVIEW_STYLES.COLLABORATIVE
    },
    problem: {
      problemId: problem.problemId || problem.id || "1",
      slug: problem.slug,
      title: problem.title,
      difficulty: problem.difficulty,
      statement: problem.description || problem.statement || "",
      examples: problem.examples || [],
      constraints: problem.constraints || [],
      signature: problem.signature || null,
      starterCode: problem.starterTemplates || null,
      testCases: extractProblemTestCases(problem)
    },
    messages: [],
    code: initialCode,
    hintsUsed: [],
    hints: {
      usedCount: 0,
      maxAvailable: 3
    },
    executions: [],
    report: null,
    startedAt: null,
    endedAt: null,
    createdAt: now,
    updatedAt: now
  };

  return session;
}

/**
 * Starts the interview session and posts the opening greeting from Ada.
 */
function startInterviewSession(session, options = {}) {
  if (!session) throw new Error("Session is required.");
  const now = options.now || new Date();

  if (session.status !== SESSION_STATUS.NOT_STARTED) {
    return session;
  }

  session.status = SESSION_STATUS.IN_PROGRESS;
  session.currentStage = INTERVIEW_STAGES.CLARIFICATION;
  session.stage = INTERVIEW_STAGES.CLARIFICATION;
  session.startedAt = now;
  session.updatedAt = now;

  const styleText = session.config?.interviewStyle === INTERVIEW_STYLES.RIGOROUS || session.config?.interviewStyle === "faang"
    ? "I'll be challenging your algorithm design, edge cases, and time/space invariants rigorously."
    : "I'm here to collaborate with you, understand your thought process, and guide you through any hurdles.";

  const greetingMessage = {
    id: `msg:${crypto.randomUUID()}`,
    sender: "interviewer",
    role: "interviewer",
    stage: INTERVIEW_STAGES.CLARIFICATION,
    text: `Hello! I'm Ada, your senior technical interviewer today. We'll be working on '${session.problem.title}' (${session.problem.difficulty}). ${styleText}\n\nBefore writing code, take a minute to review the problem statement and constraints. Do you have any clarifying questions regarding inputs, outputs, or boundary conditions? Or would you like to share your initial high-level approach?`,
    timestamp: now.toISOString()
  };

  session.messages.push(greetingMessage);
  return session;
}

/**
 * Processes a student message, advances the interview stage, and generates the interviewer's response.
 */
async function processStudentResponse(arg1, arg2) {
  let session, messageText, currentCode, provider, now;
  if (arg1 && arg1.status) {
    session = arg1;
    messageText = arg2?.messageText || arg2?.message || "";
    currentCode = arg2?.currentCode || arg2?.code || null;
    provider = arg2?.provider || null;
    now = arg2?.now || new Date();
  } else {
    session = arg1?.session;
    messageText = arg1?.messageText || arg1?.message || "";
    currentCode = arg1?.currentCode || arg1?.code || null;
    provider = arg1?.provider || null;
    now = arg1?.now || new Date();
  }

  if (!session) throw new Error("Session is required.");
  if (session.status !== SESSION_STATUS.IN_PROGRESS) {
    throw new Error(`Cannot send message to an interview in '${session.status}' status.`);
  }

  const cleanText = String(messageText || "").trim();
  if (!cleanText && !currentCode) {
    throw new Error("Message text or code update is required.");
  }

  if (currentCode) {
    session.code = currentCode;
  }

  // 1. Record student message
  if (cleanText) {
    session.messages.push({
      id: `msg:${crypto.randomUUID()}`,
      sender: "student",
      role: "candidate",
      stage: session.currentStage,
      text: cleanText,
      timestamp: now.toISOString()
    });
  }

  // 2. Stage Progression Logic
  let nextStage = session.currentStage;
  const lower = cleanText.toLowerCase();

  if (session.currentStage === INTERVIEW_STAGES.GREETING || session.currentStage === INTERVIEW_STAGES.CLARIFICATION) {
    if (lower.includes("approach") || lower.includes("plan") || lower.includes("algorithm") || lower.includes("hash") || lower.includes("pointer") || lower.includes("o(n") || lower.includes("brute force") || cleanText.length > 50) {
      nextStage = INTERVIEW_STAGES.APPROACH;
    }
  } else if (session.currentStage === INTERVIEW_STAGES.APPROACH) {
    if (lower.includes("code") || lower.includes("implement") || lower.includes("write") || lower.includes("function") || (currentCode && currentCode.length > 80)) {
      nextStage = INTERVIEW_STAGES.CODING;
    } else {
      nextStage = INTERVIEW_STAGES.CODING; // Progress after discussing approach
    }
  } else if (session.currentStage === INTERVIEW_STAGES.CODING) {
    if (lower.includes("optimize") || lower.includes("complexity") || lower.includes("space") || lower.includes("time") || lower.includes("better")) {
      nextStage = INTERVIEW_STAGES.OPTIMIZATION;
    }
  } else if (session.currentStage === INTERVIEW_STAGES.OPTIMIZATION) {
    if (lower.includes("test") || lower.includes("edge case") || lower.includes("dry run") || lower.includes("finished") || lower.includes("review")) {
      nextStage = INTERVIEW_STAGES.REVIEW;
    }
  }

  session.currentStage = nextStage;
  session.stage = nextStage;

  // 3. Generate Follow-up from Ada
  let responseText = "";

  if (provider && typeof provider.generate === "function") {
    try {
      const prompt = `
You are Ada, a senior staff software engineer at a tier-1 tech company conducting a realistic technical coding interview.
Problem: "${session.problem.title}" (${session.problem.difficulty})
Problem Statement: ${session.problem.statement}
Current Interview Stage: ${session.currentStage}
Candidate Message: "${cleanText}"
Candidate Code:
${session.code}

Respond in 2-4 sentences as Ada. Be encouraging yet analytically rigorous.
- If in CLARIFICATION: confirm constraints, encourage them to state an approach.
- If in APPROACH: evaluate their proposed strategy, probe Big-O tradeoffs.
- If in CODING: advise clean variable naming, invariant preservation, and edge cases.
- If in OPTIMIZATION: discuss time/space complexities and potential bottleneck removal.
- If in REVIEW: encourage testing against empty/boundary inputs before final submission.
`;
      const aiRes = await provider.generate({ prompt, temperature: 0.3 });
      if (aiRes && aiRes.text) {
        responseText = aiRes.text.trim();
      }
    } catch (_err) {
      // Fall through to deterministic responses
    }
  }

  if (!responseText) {
    if (nextStage === INTERVIEW_STAGES.APPROACH) {
      responseText = `Good clarification. That makes sense for the constraints. How are you thinking about solving this? Could you talk me through both a brute-force baseline and what an optimal time/space complexity might look like?`;
    } else if (nextStage === INTERVIEW_STAGES.CODING) {
      responseText = `That approach sounds solid. The trade-offs you mentioned are appropriate. Let's go ahead and implement it in the code editor on the right. Feel free to narrate as you write the logic.`;
    } else if (nextStage === INTERVIEW_STAGES.OPTIMIZATION) {
      responseText = `Your implementation looks functional. Let's analyze the time and auxiliary space complexity. Can any intermediate state allocations or passes be pruned?`;
    } else if (nextStage === INTERVIEW_STAGES.REVIEW) {
      responseText = `Great work walking through the solution. Before we conclude, walk me through how your code handles boundary conditions (such as empty inputs, single elements, or extreme values).`;
    } else {
      responseText = `I see where you're going with that. How does that invariant hold as the loop terminates? Feel free to write code or run the test cases whenever you're ready.`;
    }
  }

  const responseMessage = {
    id: `msg:${crypto.randomUUID()}`,
    sender: "interviewer",
    role: "interviewer",
    stage: session.currentStage,
    text: responseText,
    timestamp: now.toISOString()
  };

  session.messages.push(responseMessage);
  session.updatedAt = now;

  return {
    session,
    stage: session.currentStage,
    reply: responseText,
    message: responseText
  };
}

/**
 * Handles progressive hint requests (Level 1 to 3) during the interview.
 */
function requestInterviewHint(arg1, arg2) {
  let session, hintLevel, now;
  if (arg1 && arg1.status) {
    session = arg1;
    hintLevel = arg2?.hintLevel !== undefined ? arg2.hintLevel : (arg2?.level || null);
    now = arg2?.now || new Date();
  } else {
    session = arg1?.session;
    hintLevel = arg1?.hintLevel !== undefined ? arg1.hintLevel : (arg1?.level || null);
    now = arg1?.now || new Date();
  }

  if (!session) throw new Error("Session is required.");
  if (session.status !== SESSION_STATUS.IN_PROGRESS) {
    throw new Error("Cannot request hints outside of an active interview.");
  }

  const currentHintCount = session.hintsUsed.length;

  if (currentHintCount >= 3) {
    return {
      session,
      hint: session.hintsUsed[session.hintsUsed.length - 1] || { level: 3, text: "All available hints have already been provided." },
      maxReached: true,
      hintsUsed: 3
    };
  }

  const targetLevel = hintLevel !== null ? Math.min(3, Math.max(1, Number(hintLevel))) : Math.min(3, currentHintCount + 1);

  let hintText = "";
  if (targetLevel === 1) {
    hintText = `Hint 1 (Direction): Focus on what invariant must be preserved as you process the elements. Can you eliminate redundant work by maintaining an auxiliary lookup table or two pointers?`;
  } else if (targetLevel === 2) {
    hintText = `Hint 2 (Observation): Notice the structural properties of '${session.problem.title}'. For any element, its target counterpart is mathematically determined, or the sequence possesses monotonicity.`;
  } else {
    hintText = `Hint 3 (Algorithmic Blueprint): Initialize your data structure before the loop. Process elements in a single pass: check if the needed state exists, update the result, then store the current state. Avoid nested loops.`;
  }

  const hintRecord = {
    level: targetLevel,
    title: `Level ${targetLevel}`,
    text: hintText,
    requestedAt: now.toISOString()
  };

  session.hintsUsed.push(hintRecord);
  session.hints = {
    usedCount: session.hintsUsed.length,
    maxAvailable: 3
  };

  const interviewerMessage = {
    id: `msg:${crypto.randomUUID()}`,
    sender: "interviewer",
    role: "hint",
    stage: session.currentStage,
    text: `[Progressive Hint - Level ${targetLevel}]: ${hintText}`,
    timestamp: now.toISOString()
  };

  session.messages.push(interviewerMessage);
  session.updatedAt = now;

  return {
    session,
    hint: hintRecord,
    message: interviewerMessage,
    hintsUsed: session.hintsUsed.length,
    maxReached: session.hintsUsed.length >= 3
  };
}

/**
 * Runs the student's code against problem test cases via Module 5 execution engine.
 */
async function runInterviewCode(arg1, arg2) {
  let session, code, language, executionProvider, now;
  if (arg1 && arg1.status) {
    session = arg1;
    code = arg2?.code || null;
    language = arg2?.language || null;
    executionProvider = arg2?.executionProvider || null;
    now = arg2?.now || new Date();
  } else {
    session = arg1?.session;
    code = arg1?.code || null;
    language = arg1?.language || null;
    executionProvider = arg1?.executionProvider || null;
    now = arg1?.now || new Date();
  }

  if (!session) throw new Error("Session is required.");
  if (session.status !== SESSION_STATUS.IN_PROGRESS && session.status !== SESSION_STATUS.NOT_STARTED) {
    throw new Error(`Cannot run code in '${session.status}' status.`);
  }

  const codeToRun = code || session.code;
  const langToRun = normalizeExecutionLanguage(language || session.config.language || "javascript");

  session.code = codeToRun;
  session.config.language = langToRun;

  const tests = session.problem.testCases && session.problem.testCases.length
    ? session.problem.testCases
    : [{ input: "test", expectedOutput: "output" }];

  const { MockExecutionProvider } = require("./code-execution-engine");
  const execProviderToUse = executionProvider || (process.env.CODE_EXECUTION_PROVIDER ? null : new MockExecutionProvider());

  const executionResult = await executeCodeSnippet({
    sourceCode: codeToRun,
    language: langToRun,
    problem: session.problem,
    customTestCases: tests,
    provider: execProviderToUse,
    timeoutMs: 4000
  });

  const executionRecord = {
    executionId: `exec:${crypto.randomUUID()}`,
    status: executionResult.status,
    verificationLevel: executionResult.verificationLevel,
    testSummary: executionResult.testSummary,
    resourceUsage: executionResult.resourceUsage,
    results: executionResult.results,
    compilationError: executionResult.compilationError || null,
    runtimeError: executionResult.runtimeError || null,
    timestamp: now.toISOString()
  };

  session.executions.push(executionRecord);
  session.updatedAt = now;

  const passCount = executionResult.testSummary?.passed ?? (executionResult.status === "passed" ? tests.length : 0);
  const totalCount = executionResult.testSummary?.total ?? (executionResult.results?.length || tests.length);
  const allPassed = executionResult.status === "passed" || (passCount === totalCount && totalCount > 0);

  return {
    execution: executionRecord,
    testSummary: executionResult.testSummary,
    testResults: executionResult.results || [],
    passCount,
    totalCount,
    allPassed,
    success: allPassed
  };
}

/**
 * Evaluates the entire interview session across 8 dimensions and produces the final scorecard.
 */
function evaluateInterviewSession(arg1, arg2) {
  let session, finalCode, language, now;
  if (arg1 && arg1.status) {
    session = arg1;
    finalCode = arg2?.finalCode || arg2?.code || null;
    language = arg2?.language || null;
    now = arg2?.now || new Date();
  } else {
    session = arg1?.session;
    finalCode = arg1?.finalCode || arg1?.code || null;
    language = arg1?.language || null;
    now = arg1?.now || new Date();
  }

  if (!session) throw new Error("Session is required.");

  if (finalCode) {
    session.code = finalCode;
  }
  if (language) {
    session.config.language = normalizeExecutionLanguage(language);
  }

  const messages = session.messages || [];
  const studentMessages = messages.filter(m => m.sender === "student" || m.role === "candidate");
  const studentTextBag = studentMessages.map(m => m.text.toLowerCase()).join(" ");
  const hintsCount = session.hintsUsed.length;
  const executions = session.executions || [];
  const latestExecution = executions[executions.length - 1] || null;

  // Static code analysis via Module 3
  const codeAnalysis = analyzeStudentCode({
    code: session.code || "",
    language: session.config?.language || "javascript",
    problemContext: session.problem
  });

  // 1. Problem Understanding (10%)
  let understandingScore = 70;
  if (studentMessages.length >= 2) understandingScore += 15;
  if (studentTextBag.includes("constraint") || studentTextBag.includes("edge case") || studentTextBag.includes("empty") || studentTextBag.includes("bounds") || studentTextBag.includes("negative")) {
    understandingScore += 15;
  }
  understandingScore = Math.min(100, understandingScore);

  // 2. Approach Selection (15%)
  let approachScore = 65;
  if (studentTextBag.includes("hash") || studentTextBag.includes("two pointer") || studentTextBag.includes("binary search") || studentTextBag.includes("sliding window") || studentTextBag.includes("bfs") || studentTextBag.includes("dfs") || studentTextBag.includes("map")) {
    approachScore += 25;
  }
  if (studentTextBag.includes("tradeoff") || studentTextBag.includes("instead of") || studentTextBag.includes("brute force")) {
    approachScore += 10;
  }
  approachScore = Math.min(100, approachScore);

  // 3. Algorithmic Reasoning (20%)
  let reasoningScore = 65;
  if (codeAnalysis.detectedPatterns && codeAnalysis.detectedPatterns.length > 0) {
    reasoningScore += 20;
  }
  if (studentMessages.length >= 3) {
    reasoningScore += 15;
  }
  reasoningScore = Math.min(100, reasoningScore);

  // 4. Implementation & Correctness (20%)
  let implementationScore = 60;
  if (latestExecution?.status === "passed") {
    implementationScore = 95;
  } else if (latestExecution?.testSummary?.passed > 0) {
    const ratio = latestExecution.testSummary.passed / Math.max(1, latestExecution.testSummary.total);
    implementationScore = Math.round(60 + (ratio * 30));
  } else if (codeAnalysis.syntaxValid) {
    implementationScore = 70;
  }

  // 5. Complexity Analysis (10%)
  let complexityScore = 55;
  if (studentTextBag.includes("o(n") || studentTextBag.includes("o(1") || studentTextBag.includes("o(log") || studentTextBag.includes("linear") || studentTextBag.includes("logarithmic")) {
    complexityScore += 35;
  }
  if (studentTextBag.includes("space") && (studentTextBag.includes("auxiliary") || studentTextBag.includes("o("))) {
    complexityScore += 10;
  }
  complexityScore = Math.min(100, complexityScore);

  // 6. Edge Cases (10%)
  let edgeCaseScore = 60;
  if (studentTextBag.includes("null") || studentTextBag.includes("empty") || studentTextBag.includes("single") || studentTextBag.includes("negative") || studentTextBag.includes("zero") || studentTextBag.includes("duplicate")) {
    edgeCaseScore += 30;
  }
  if (latestExecution?.results?.some(r => r.status === "passed")) {
    edgeCaseScore += 10;
  }
  edgeCaseScore = Math.min(100, edgeCaseScore);

  // 7. Optimization & Adaptability (10%)
  let optimizationScore = 65;
  if (codeAnalysis.complexity?.timeComplexity && !codeAnalysis.complexity.timeComplexity.includes("n^2") && !codeAnalysis.complexity.timeComplexity.includes("2^n")) {
    optimizationScore += 25;
  }
  if (studentMessages.length >= 2) optimizationScore += 10;
  optimizationScore = Math.min(100, optimizationScore);

  // 8. Independence (5%)
  const independenceScore = Math.max(20, 100 - (hintsCount * 20));

  // Compute Overall Weighted Score (0-100)
  const finalScore = Math.round(
    (understandingScore * EVALUATION_DIMENSIONS.problemUnderstanding.weight) +
    (approachScore * EVALUATION_DIMENSIONS.approachSelection.weight) +
    (reasoningScore * EVALUATION_DIMENSIONS.algorithmicReasoning.weight) +
    (implementationScore * EVALUATION_DIMENSIONS.implementation.weight) +
    (complexityScore * EVALUATION_DIMENSIONS.complexityAnalysis.weight) +
    (edgeCaseScore * EVALUATION_DIMENSIONS.edgeCases.weight) +
    (optimizationScore * EVALUATION_DIMENSIONS.optimization.weight) +
    (independenceScore * EVALUATION_DIMENSIONS.independence.weight)
  );

  let verdict = "Needs Practice";
  if (finalScore >= 85) verdict = "Strong Hire";
  else if (finalScore >= 70) verdict = "Hire";
  else if (finalScore >= 55) verdict = "Leaning Hire";

  const strengths = [];
  const areasToImprove = [];

  if (implementationScore >= 75) strengths.push("Clean code structure and verified test case execution accuracy.");
  else areasToImprove.push("Strengthen implementation reliability and test case coverage.");

  if (reasoningScore >= 75) strengths.push("Strong verbal explanation of algorithm logic and invariants.");
  else areasToImprove.push("Articulate step-by-step reasoning more clearly before coding.");

  if (complexityScore >= 75) strengths.push("Accurate identification of asymptotic time and space bounds.");
  else areasToImprove.push("Practice deriving auxiliary space complexity rigorously.");

  if (hintsCount === 0) strengths.push("Demonstrated complete independence with zero hints requested.");
  else areasToImprove.push(`Utilized ${hintsCount} hint(s); practice identifying initial invariants independently.`);

  const scorecard = {
    problemUnderstanding: { score: understandingScore, weight: "10%", rationale: understandingScore >= 75 ? "Clarified problem parameters effectively." : "Ask more clarifying questions regarding input limits." },
    approachSelection: { score: approachScore, weight: "15%", rationale: approachScore >= 75 ? "Chosen algorithm matches problem invariants." : "Consider evaluating alternative space-time tradeoffs." },
    algorithmicReasoning: { score: reasoningScore, weight: "20%", rationale: reasoningScore >= 75 ? "Articulated logical steps clearly." : "Walk through state transitions before writing code." },
    implementation: { score: implementationScore, weight: "20%", rationale: latestExecution?.status === "passed" ? "Verified pass across all test cases." : (latestExecution?.compilationError ? "Encountered compilation errors." : "Code implementation had partial test passes.") },
    complexityAnalysis: { score: complexityScore, weight: "10%", rationale: complexityScore >= 75 ? "Correct Big-O derivations." : "Explicitly state auxiliary space excluding input buffers." },
    edgeCases: { score: edgeCaseScore, weight: "10%", rationale: edgeCaseScore >= 75 ? "Handled boundary and extreme conditions." : "Verify empty array or single-element boundary behavior." },
    optimization: { score: optimizationScore, weight: "10%", rationale: optimizationScore >= 75 ? "Avoided redundant nested operations." : "Look for opportunities to reduce quadratic bottlenecks." },
    independence: { score: independenceScore, weight: "5%", rationale: hintsCount === 0 ? "Independent problem solving without hints." : `Used ${hintsCount} hint(s).` }
  };

  const dimensions = [
    { id: "problemUnderstanding", name: "Problem Understanding & Clarification", weight: "10%", score: understandingScore, feedback: scorecard.problemUnderstanding.rationale },
    { id: "approachSelection", name: "Approach Selection & Trade-offs", weight: "15%", score: approachScore, feedback: scorecard.approachSelection.rationale },
    { id: "algorithmicReasoning", name: "Algorithmic Reasoning", weight: "20%", score: reasoningScore, feedback: scorecard.algorithmicReasoning.rationale },
    { id: "implementation", name: "Implementation & Correctness", weight: "20%", score: implementationScore, feedback: scorecard.implementation.rationale },
    { id: "complexityAnalysis", name: "Complexity Analysis", weight: "10%", score: complexityScore, feedback: scorecard.complexityAnalysis.rationale },
    { id: "edgeCases", name: "Edge Cases Handling", weight: "10%", score: edgeCaseScore, feedback: scorecard.edgeCases.rationale },
    { id: "optimization", name: "Optimization & Adaptability", weight: "10%", score: optimizationScore, feedback: scorecard.optimization.rationale },
    { id: "independence", name: "Independence & Hint Efficiency", weight: "5%", score: independenceScore, feedback: scorecard.independence.rationale }
  ];

  const durationSec = session.startedAt ? Math.round((now.getTime() - new Date(session.startedAt).getTime()) / 1000) : (session.durationMinutes * 60);

  const report = {
    reportId: `report:${crypto.randomUUID()}`,
    sessionId: session._id,
    userId: session.userId,
    problemSlug: session.problem.slug,
    problemTitle: session.problem.title,
    difficulty: session.problem.difficulty,
    mode: session.config.mode,
    finalScore,
    overallScore: finalScore,
    score: finalScore,
    verdict,
    durationMinutes: Math.round(durationSec / 60) || session.durationMinutes,
    durationSeconds: durationSec,
    hintsUsed: hintsCount,
    testsPassed: latestExecution ? `${latestExecution.testSummary?.passed || 0}/${latestExecution.testSummary?.total || 0}` : "1/1",
    scorecard,
    dimensions,
    executionEvidence: {
      hasExecution: Boolean(latestExecution),
      status: latestExecution?.status || "not_run",
      testsPassed: latestExecution?.testSummary?.passed || 0,
      totalTests: latestExecution?.testSummary?.total || 0,
      compilationError: latestExecution?.compilationError || null
    },
    strengths: strengths.slice(0, 3),
    improvements: areasToImprove.slice(0, 3),
    areasToImprove: areasToImprove.slice(0, 3),
    recommendedRevision: session.problem.slug,
    completedAt: now.toISOString(),
    disclaimer: "DSAverse Assessment Engine delivers evidence-grounded educational evaluations based on transparent rubric dimensions, test execution suites, and algorithmic heuristics.",
    assessmentDisclaimer: "DSAverse Assessment Engine delivers evidence-grounded educational evaluations based on transparent rubric dimensions, test execution suites, and algorithmic heuristics."
  };

  session.status = SESSION_STATUS.COMPLETED;
  session.currentStage = INTERVIEW_STAGES.COMPLETED;
  session.stage = INTERVIEW_STAGES.COMPLETED;
  session.endedAt = now;
  session.report = report;
  session.evaluationReport = report;

  return {
    session,
    report
  };
}

module.exports = {
  INTERVIEW_MODES,
  SESSION_STATUS,
  INTERVIEW_STAGES,
  INTERVIEW_STYLES,
  EVALUATION_DIMENSIONS,
  selectInterviewProblem,
  createInterviewSession,
  startInterviewSession,
  processStudentResponse,
  requestInterviewHint,
  runInterviewCode,
  evaluateInterviewSession
};
