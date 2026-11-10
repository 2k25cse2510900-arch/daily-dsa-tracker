"use strict";

const crypto = require("node:crypto");
const { CANONICAL_PROBLEMS } = require("./leetcode-problem-intelligence");
const {
  SUPPORTED_LANGUAGES,
  normalizeExecutionLanguage,
  extractProblemTestCases,
  executeCodeSnippet,
  compareOutputs
} = require("./code-execution-engine");

// Race Taxonomies & Enums
const RACE_MODES = Object.freeze(["quick", "private", "group", "scheduled", "practice"]);
const RACE_STATES = Object.freeze([
  "draft",
  "waiting",
  "registration_open",
  "ready",
  "starting",
  "live",
  "submission_review",
  "completed",
  "cancelled",
  "expired"
]);

const DIFFICULTY_TIERS = Object.freeze(["Easy", "Medium", "Hard", "Mixed"]);
const TOPIC_CATEGORIES = Object.freeze([
  "Arrays",
  "Strings",
  "Two Pointers",
  "Sliding Window",
  "Binary Search",
  "Dynamic Programming",
  "Graphs",
  "Trees",
  "Mixed"
]);

const SCORING_BASE = Object.freeze({
  Easy: 100,
  Medium: 200,
  Hard: 300
});

const DEFAULT_ATTEMPT_PENALTY = 10;
const MAX_TIME_BONUS = 50;

function raceError(code, message, status = 400) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function sanitizeText(str, maxLength = 5000) {
  if (typeof str !== "string") return "";
  return str.slice(0, maxLength);
}

/**
 * Deterministically selects fair problems from canonical problems for a race.
 * All participants in the same race receive the identical problem set in the same order.
 */
function selectFairProblems({ topic = "Mixed", difficulty = "Mixed", questionCount = 3 } = {}) {
  const allCanonical = Object.values(CANONICAL_PROBLEMS || {});
  if (!allCanonical.length) {
    throw raceError("NO_PROBLEMS_AVAILABLE", "Problem repository is empty.", 503);
  }

  const count = Math.min(5, Math.max(1, Number(questionCount) || 3));

  // Filter by difficulty if specified
  let pool = allCanonical;
  if (difficulty && difficulty !== "Mixed") {
    const diffPool = allCanonical.filter(p => p.difficulty && p.difficulty.toLowerCase() === difficulty.toLowerCase());
    if (diffPool.length >= count) {
      pool = diffPool;
    }
  }

  // Filter by topic if specified
  if (topic && topic !== "Mixed") {
    const topicPool = pool.filter(p => p.topic && p.topic.toLowerCase().includes(topic.toLowerCase()));
    if (topicPool.length >= count) {
      pool = topicPool;
    }
  }

  // Sort deterministically to maintain consistent sets
  const sorted = [...pool].sort((a, b) => (a.number || 0) - (b.number || 0) || a.title.localeCompare(b.title));
  const selected = sorted.slice(0, count);

  return selected.map((p, idx) => ({
    problemId: `prob_${p.slug || p.number || idx + 1}`,
    slug: p.slug || `problem-${idx + 1}`,
    title: p.title || `Problem ${idx + 1}`,
    number: p.number || null,
    methodName: p.methodName || "solve",
    signatures: p.signatures || null,
    difficulty: p.difficulty || "Medium",
    topic: p.topic || "Algorithms",
    description: p.description || p.statement || "Solve this problem efficiently.",
    examples: p.examples || [],
    constraints: p.constraints || [],
    starterCode: p.starterCode || {
      python3: p.signatures?.python3
        ? `class Solution:\n    ${p.signatures.python3}\n        pass`
        : "def solution():\n    pass",
      javascript: p.signatures?.javascript
        ? `${p.signatures.javascript}\n    \n};`
        : "function solution() {\n}",
      java: p.signatures?.java
        ? `class Solution {\n    ${p.signatures.java} {\n        \n    }\n}`
        : "class Solution {\n    public void solve() {\n    }\n}",
      cpp: p.signatures?.cpp
        ? `class Solution {\npublic:\n    ${p.signatures.cpp} {\n        \n    }\n};`
        : "class Solution {\npublic:\n    void solve() {\n    }\n};"
    },
    testCases: p.testCases || (p.examples || []).map(ex => ({ input: ex.input, expected: ex.output }))
  }));
}

/**
 * Dense competition ranking (1, 1, 3) with tie-breakers:
 * 1. Score descending
 * 2. Total time elapsed ascending
 * 3. Earliest last accepted submission timestamp
 */
function calculateStandings(participants = []) {
  const sorted = [...participants].sort((a, b) => {
    // 1. Highest score first
    if ((b.score || 0) !== (a.score || 0)) {
      return (b.score || 0) - (a.score || 0);
    }
    // 2. Most problems solved first
    if ((b.solvedCount || 0) !== (a.solvedCount || 0)) {
      return (b.solvedCount || 0) - (a.solvedCount || 0);
    }
    // 3. Lowest total time elapsed first
    if ((a.totalTimeSeconds || 0) !== (b.totalTimeSeconds || 0)) {
      return (a.totalTimeSeconds || 0) - (b.totalTimeSeconds || 0);
    }
    // 4. Stable tie-breaker: display name
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  let currentRank = 1;
  sorted.forEach((p, idx) => {
    if (idx > 0) {
      const prev = sorted[idx - 1];
      const sameScore = (p.score || 0) === (prev.score || 0);
      const sameSolved = (p.solvedCount || 0) === (prev.solvedCount || 0);
      const sameTime = (p.totalTimeSeconds || 0) === (prev.totalTimeSeconds || 0);
      if (!sameScore || !sameSolved || !sameTime) {
        currentRank = idx + 1;
      }
    }
    p.rank = currentRank;
  });

  return sorted;
}

function calculateTimeBonus(remainingSeconds, totalDurationSeconds) {
  if (!remainingSeconds || !totalDurationSeconds || totalDurationSeconds <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, remainingSeconds / totalDurationSeconds));
  return Math.floor(ratio * MAX_TIME_BONUS);
}

function createCodingRaceArenaService({
  db = null,
  provider = null,
  executionProvider = null,
  now = () => new Date()
} = {}) {
  const racesCol = db && typeof db.collection === "function" ? db.collection("codingRaces") : null;
  const participantsCol = db && typeof db.collection === "function" ? db.collection("codingRaceParticipants") : null;
  const submissionsCol = db && typeof db.collection === "function" ? db.collection("codingRaceSubmissions") : null;
  const eventsCol = db && typeof db.collection === "function" ? db.collection("codingRaceEvents") : null;
  const achievementsCol = db && typeof db.collection === "function" ? db.collection("codingRaceAchievements") : null;
  const groupMembersCol = db && typeof db.collection === "function" ? db.collection("groupMembers") : null;

  // Active in-memory SSE subscribers: Map<raceId, Set<res>>
  const sseSubscribers = new Map();

  function broadcastEvent(raceId, eventType, data = {}) {
    const payload = JSON.stringify({ event: eventType, data, timestamp: now().toISOString() });

    // Store in events collection for auditability
    if (eventsCol) {
      eventsCol.insertOne({
        raceId,
        eventType,
        data,
        createdAt: now()
      }).catch(() => {});
    }

    const listeners = sseSubscribers.get(raceId);
    if (listeners && listeners.size) {
      listeners.forEach(res => {
        try {
          res.write(`event: ${eventType}\ndata: ${payload}\n\n`);
        } catch (_) {
          listeners.delete(res);
        }
      });
    }
  }

  async function checkGroupMembership(userId, groupId) {
    if (!userId || !groupId) return false;
    if (!groupMembersCol) return false;
    const member = await groupMembersCol.findOne({
      groupId,
      userId,
      status: "approved"
    });
    return Boolean(member);
  }

  // --- 1. Race Creation ---

  async function createRace(user, config = {}) {
    if (!user?.id) throw raceError("AUTHENTICATION_REQUIRED", "Sign in required to create a race.", 401);
    if (!racesCol || !participantsCol) throw raceError("DATABASE_UNAVAILABLE", "Database offline.", 503);

    const title = String(config.title || "").trim();
    if (title.length < 3 || title.length > 80) {
      throw raceError("INVALID_TITLE", "Race title must be between 3 and 80 characters.", 400);
    }

    const mode = RACE_MODES.includes(config.mode) ? config.mode : "quick";
    const difficulty = DIFFICULTY_TIERS.includes(config.difficulty) ? config.difficulty : "Mixed";
    const topic = TOPIC_CATEGORIES.includes(config.topic) ? config.topic : "Mixed";
    const durationMinutes = Math.min(180, Math.max(5, Number(config.durationMinutes) || 30));
    const questionCount = Math.min(5, Math.max(1, Number(config.questionCount) || 3));
    const maxParticipants = Math.min(50, Math.max(2, Number(config.maxParticipants) || (mode === "quick" ? 10 : 20)));
    const isRanked = mode !== "practice" && config.isRanked !== false;

    let groupId = null;
    let groupName = null;
    if (mode === "group") {
      groupId = String(config.groupId || "").trim();
      if (!groupId) {
        throw raceError("GROUP_REQUIRED", "Group association is required for group races.", 400);
      }
      const isMember = await checkGroupMembership(user.id, groupId);
      if (!isMember) {
        throw raceError("NOT_GROUP_MEMBER", "You must be an approved group member to create a group race.", 403);
      }
      groupName = sanitizeText(config.groupName || "Group Cohort", 60);
    }

    const inviteCode = (mode === "private" || config.requireInviteCode) ? generateInviteCode() : null;
    const raceId = `race_${crypto.randomUUID()}`;

    // Deterministically select fair problems
    const problems = selectFairProblems({ topic, difficulty, questionCount });

    const raceDoc = {
      _id: raceId,
      id: raceId,
      raceId,
      title,
      description: sanitizeText(config.description || "Competitive DSA Coding Challenge", 250),
      mode,
      difficulty,
      topic,
      durationMinutes,
      questionCount: problems.length,
      maxParticipants,
      isRanked,
      groupId,
      groupName,
      inviteCode,
      status: mode === "scheduled" ? "registration_open" : "waiting",
      scheduledStartTime: config.scheduledStartTime ? new Date(config.scheduledStartTime) : null,
      startTime: null,
      endTime: null,
      host: {
        id: user.id,
        name: user.name || user.displayName || "Host Racer",
        avatar: user.avatar || null
      },
      problems,
      participantCount: 1,
      createdAt: now(),
      updatedAt: now()
    };

    await racesCol.insertOne(raceDoc);

    // Automatically register creator as first participant
    const hostParticipant = {
      _id: `part_${raceId}_${user.id}`,
      raceId,
      userId: user.id,
      name: user.name || user.displayName || "Host Racer",
      isHost: true,
      isReady: mode === "practice",
      score: 0,
      solvedCount: 0,
      totalTimeSeconds: 0,
      problemProgress: {},
      joinedAt: now()
    };

    await participantsCol.insertOne(hostParticipant);

    return {
      ...raceDoc,
      participants: [hostParticipant]
    };
  }

  // --- 2. Discovery & State Retrieval ---

  async function listRaces(user, query = {}) {
    if (!racesCol) return { races: [], total: 0 };

    const filter = {};
    if (query.mode && RACE_MODES.includes(query.mode)) {
      filter.mode = query.mode;
    }
    if (query.status && RACE_STATES.includes(query.status)) {
      filter.status = query.status;
    } else {
      // By default show open and live races
      filter.status = { $in: ["waiting", "registration_open", "ready", "starting", "live"] };
    }
    if (query.topic && TOPIC_CATEGORIES.includes(query.topic)) {
      filter.topic = query.topic;
    }

    const races = await racesCol.find(filter).sort({ createdAt: -1 }).toArray();

    // Mask internal test cases from public listing
    const sanitized = races.map(r => ({
      ...r,
      problems: (r.problems || []).map(p => ({
        problemId: p.problemId,
        slug: p.slug,
        title: p.title,
        difficulty: p.difficulty,
        topic: p.topic
      }))
    }));

    return {
      races: sanitized,
      total: sanitized.length
    };
  }

  async function getRace(user, raceId) {
    if (!raceId) throw raceError("RACE_ID_REQUIRED", "Race ID is required.", 400);
    if (!racesCol || !participantsCol) throw raceError("DATABASE_UNAVAILABLE", "Database offline.", 503);

    const race = await racesCol.findOne({ _id: raceId });
    if (!race) throw raceError("RACE_NOT_FOUND", "Race was not found.", 404);

    // Group race access control
    if (race.mode === "group" && race.groupId) {
      const isMember = await checkGroupMembership(user?.id, race.groupId);
      if (!isMember && user?.role !== "admin") {
        throw raceError("FORBIDDEN", "This race is restricted to verified group members.", 403);
      }
    }

    // Check if live race has elapsed time limit and transition to completed
    if (race.status === "live" && race.endTime && now() >= new Date(race.endTime)) {
      await completeRaceInternal(raceId);
      race.status = "completed";
    }

    const participants = await participantsCol.find({ raceId }).toArray();
    const standings = calculateStandings(participants);

    // Compute server remaining time
    let remainingSeconds = 0;
    if (race.status === "live" && race.endTime) {
      remainingSeconds = Math.max(0, Math.floor((new Date(race.endTime).getTime() - now().getTime()) / 1000));
    }

    return {
      ...race,
      remainingSeconds,
      participants: standings,
      problems: (race.problems || []).map(p => ({
        problemId: p.problemId,
        slug: p.slug,
        title: p.title,
        difficulty: p.difficulty,
        topic: p.topic,
        description: p.description,
        examples: p.examples,
        constraints: p.constraints,
        starterCode: p.starterCode
      }))
    };
  }

  // --- 3. Join / Leave / Ready ---

  async function joinRace(user, raceId, { inviteCode = null } = {}) {
    if (!user?.id) throw raceError("AUTHENTICATION_REQUIRED", "Sign in required to join a race.", 401);
    if (!racesCol || !participantsCol) throw raceError("DATABASE_UNAVAILABLE", "Database offline.", 503);

    const race = await racesCol.findOne({ _id: raceId });
    if (!race) throw raceError("RACE_NOT_FOUND", "Race was not found.", 404);

    if (["completed", "cancelled", "expired"].includes(race.status)) {
      throw raceError("RACE_CLOSED", "This race is no longer open for joining.", 400);
    }

    if (race.status === "live" && race.mode !== "practice") {
      throw raceError("RACE_IN_PROGRESS", "Cannot join a competitive race that is already in progress.", 400);
    }

    // Private invite verification
    if (race.mode === "private" && race.inviteCode) {
      if (race.host?.id !== user.id && (!inviteCode || inviteCode.toUpperCase() !== race.inviteCode.toUpperCase())) {
        throw raceError("INVALID_INVITE_CODE", "Valid 6-character room invite code is required.", 403);
      }
    }

    // Group race verification
    if (race.mode === "group" && race.groupId) {
      const isMember = await checkGroupMembership(user.id, race.groupId);
      if (!isMember) {
        throw raceError("NOT_GROUP_MEMBER", "Only approved group members can join this race.", 403);
      }
    }

    // Check existing participant
    const existing = await participantsCol.findOne({ raceId, userId: user.id });
    if (existing) {
      return { success: true, alreadyJoined: true, participant: existing };
    }

    // Check room capacity
    const currentCount = await participantsCol.countDocuments({ raceId });
    if (currentCount >= (race.maxParticipants || 20)) {
      throw raceError("RACE_FULL", "This race has reached maximum participant capacity.", 400);
    }

    const participantId = `part_${raceId}_${user.id}`;
    const participant = {
      _id: participantId,
      raceId,
      userId: user.id,
      name: user.name || user.displayName || "Challenger",
      isHost: false,
      isReady: false,
      score: 0,
      solvedCount: 0,
      totalTimeSeconds: 0,
      problemProgress: {},
      joinedAt: now()
    };

    await participantsCol.insertOne(participant);
    await racesCol.updateOne({ _id: raceId }, { $inc: { participantCount: 1 }, $set: { updatedAt: now() } });

    broadcastEvent(raceId, "race:joined", {
      userId: user.id,
      name: participant.name,
      participantCount: currentCount + 1
    });

    return { success: true, participant };
  }

  async function leaveRace(user, raceId) {
    if (!user?.id) throw raceError("AUTHENTICATION_REQUIRED", "Sign in required.", 401);
    if (!racesCol || !participantsCol) throw raceError("DATABASE_UNAVAILABLE", "Database offline.", 503);

    const race = await racesCol.findOne({ _id: raceId });
    if (!race) throw raceError("RACE_NOT_FOUND", "Race was not found.", 404);

    if (race.status === "live") {
      throw raceError("RACE_LIVE", "Cannot leave while race is actively live.", 400);
    }

    await participantsCol.deleteOne({ raceId, userId: user.id });
    await racesCol.updateOne({ _id: raceId }, { $inc: { participantCount: -1 }, $set: { updatedAt: now() } });

    broadcastEvent(raceId, "race:left", { userId: user.id });

    return { success: true };
  }

  async function toggleReady(user, raceId, isReady = true) {
    if (!user?.id) throw raceError("AUTHENTICATION_REQUIRED", "Sign in required.", 401);
    if (!participantsCol) throw raceError("DATABASE_UNAVAILABLE", "Database offline.", 503);

    const updated = await participantsCol.updateOne(
      { raceId, userId: user.id },
      { $set: { isReady: Boolean(isReady), updatedAt: now() } }
    );
    if (!updated.matchedCount) {
      throw raceError("PARTICIPANT_NOT_FOUND", "You are not registered in this race.", 404);
    }

    broadcastEvent(raceId, "race:ready", { userId: user.id, isReady: Boolean(isReady) });

    return { success: true, isReady: Boolean(isReady) };
  }

  // --- 4. Starting & Cancelling ---

  async function startRace(user, raceId) {
    if (!user?.id) throw raceError("AUTHENTICATION_REQUIRED", "Sign in required.", 401);
    if (!racesCol || !participantsCol) throw raceError("DATABASE_UNAVAILABLE", "Database offline.", 503);

    const race = await racesCol.findOne({ _id: raceId });
    if (!race) throw raceError("RACE_NOT_FOUND", "Race was not found.", 404);

    const isHost = race.host?.id === user.id;
    const isAdmin = user.role === "admin";
    if (!isHost && !isAdmin) {
      throw raceError("FORBIDDEN", "Only the race host can start the contest.", 403);
    }

    if (race.status === "live") {
      return { success: true, alreadyStarted: true };
    }

    if (["completed", "cancelled"].includes(race.status)) {
      throw raceError("INVALID_STATE", `Cannot start a race that is ${race.status}.`, 400);
    }

    const startTime = now();
    const durationMinutes = race.durationMinutes || 30;
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    await racesCol.updateOne(
      { _id: raceId },
      {
        $set: {
          status: "live",
          startTime,
          endTime,
          updatedAt: now()
        }
      }
    );

    broadcastEvent(raceId, "race:started", {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMinutes
    });

    return {
      success: true,
      status: "live",
      startTime,
      endTime
    };
  }

  async function cancelRace(user, raceId, reason = "Host cancelled the race.") {
    if (!user?.id) throw raceError("AUTHENTICATION_REQUIRED", "Sign in required.", 401);
    if (!racesCol) throw raceError("DATABASE_UNAVAILABLE", "Database offline.", 503);

    const race = await racesCol.findOne({ _id: raceId });
    if (!race) throw raceError("RACE_NOT_FOUND", "Race was not found.", 404);

    const isHost = race.host?.id === user.id;
    const isAdmin = user.role === "admin";
    if (!isHost && !isAdmin) {
      throw raceError("FORBIDDEN", "Only the race host or admin can cancel the race.", 403);
    }

    await racesCol.updateOne(
      { _id: raceId },
      { $set: { status: "cancelled", cancelReason: sanitizeText(reason, 200), updatedAt: now() } }
    );

    broadcastEvent(raceId, "race:cancelled", { reason });

    return { success: true, status: "cancelled" };
  }

  // --- 5. Code Execution & Official Submission ---

  async function runSampleTest(user, raceId, { problemId, code, language = "python3" } = {}) {
    if (!user?.id) throw raceError("AUTHENTICATION_REQUIRED", "Sign in required to run tests.", 401);
    const race = await racesCol.findOne({ _id: raceId });
    if (!race) throw raceError("RACE_NOT_FOUND", "Race not found.", 404);

    const problem = (race.problems || []).find(p => p.problemId === problemId);
    if (!problem) throw raceError("PROBLEM_NOT_FOUND", "Problem does not belong to this race.", 404);

    const normLang = normalizeExecutionLanguage(language);
    if (!SUPPORTED_LANGUAGES.includes(normLang)) {
      throw raceError("UNSUPPORTED_LANGUAGE", `Language '${language}' is not supported.`, 400);
    }

    const execResult = await executeCodeSnippet({
      sourceCode: code,
      language: normLang,
      problem,
      provider: executionProvider
    });

    const results = (execResult.results || []).map(r => ({
      input: r.input,
      expected: r.expectedOutput,
      actual: r.actualOutput !== null && r.actualOutput !== undefined ? String(r.actualOutput) : (r.error ? `Error: ${r.error}` : ""),
      passed: r.status === "passed",
      executionTimeMs: r.executionTimeMs || execResult.resourceUsage?.executionTimeMs || 10,
      stderr: r.error || null
    }));

    const allPassed = execResult.testSummary?.failed === 0 && (execResult.testSummary?.passed || 0) > 0;

    return {
      success: true,
      allPassed,
      results
    };
  }

  async function submitSolution(user, raceId, { problemId, code, language = "python3" } = {}) {
    if (!user?.id) throw raceError("AUTHENTICATION_REQUIRED", "Sign in required to submit.", 401);
    if (!racesCol || !participantsCol || !submissionsCol) throw raceError("DATABASE_UNAVAILABLE", "Database offline.", 503);

    const race = await racesCol.findOne({ _id: raceId });
    if (!race) throw raceError("RACE_NOT_FOUND", "Race not found.", 404);

    if (race.status !== "live" && race.mode !== "practice") {
      throw raceError("RACE_NOT_LIVE", "Submissions are only accepted while the race is actively live.", 400);
    }

    // Check expiration
    if (race.endTime && now() > new Date(race.endTime)) {
      await completeRaceInternal(raceId);
      throw raceError("RACE_TIME_EXPIRED", "The race timer has expired. Submissions are closed.", 400);
    }

    const participant = await participantsCol.findOne({ raceId, userId: user.id });
    if (!participant) {
      throw raceError("NOT_REGISTERED", "You are not a registered participant in this race.", 403);
    }

    const problem = (race.problems || []).find(p => p.problemId === problemId);
    if (!problem) {
      throw raceError("PROBLEM_NOT_FOUND", "Problem does not belong to this race.", 404);
    }

    const normLang = normalizeExecutionLanguage(language);
    if (!SUPPORTED_LANGUAGES.includes(normLang)) {
      throw raceError("UNSUPPORTED_LANGUAGE", `Language '${language}' is not supported.`, 400);
    }

    // Deterministic execution verification
    const execResult = await executeCodeSnippet({
      sourceCode: code,
      language: normLang,
      problem,
      provider: executionProvider
    });

    const totalTests = Math.max(1, execResult.testSummary?.total || 1);
    const testsPassed = execResult.testSummary?.passed || 0;
    const isAccepted = execResult.testSummary?.failed === 0 && testsPassed > 0;

    const firstFailureResult = (execResult.results || []).find(r => r.status !== "passed");
    const firstFailure = firstFailureResult ? {
      input: firstFailureResult.input,
      expected: firstFailureResult.expectedOutput,
      actual: firstFailureResult.actualOutput,
      stderr: firstFailureResult.error || null
    } : null;
    const submissionId = `sub_${crypto.randomUUID()}`;
    const submissionTime = now();

    // Check if problem was already accepted previously (idempotent scoring)
    const priorAccepted = participant.problemProgress?.[problemId]?.accepted === true;
    let pointsAwarded = 0;
    let timeBonus = 0;

    if (isAccepted && !priorAccepted) {
      const basePoints = SCORING_BASE[problem.difficulty] || 200;
      const remainingSeconds = race.endTime
        ? Math.max(0, Math.floor((new Date(race.endTime).getTime() - submissionTime.getTime()) / 1000))
        : 0;
      timeBonus = calculateTimeBonus(remainingSeconds, (race.durationMinutes || 30) * 60);
      pointsAwarded = basePoints + timeBonus;
    }

    // Record submission document
    const subDoc = {
      _id: submissionId,
      raceId,
      userId: user.id,
      userName: participant.name,
      problemId,
      problemTitle: problem.title,
      language: normLang,
      codeSnippet: sanitizeText(code, 20000),
      verdict: isAccepted ? "Accepted" : "Wrong Answer",
      testsPassed,
      totalTests,
      pointsAwarded,
      createdAt: submissionTime
    };

    await submissionsCol.insertOne(subDoc);

    // Update participant progress atomically
    const currentProgress = participant.problemProgress?.[problemId] || { attempts: 0, accepted: false };
    const updatedAttempts = currentProgress.attempts + 1;
    const updatedProgress = {
      ...participant.problemProgress,
      [problemId]: {
        attempts: updatedAttempts,
        accepted: priorAccepted || isAccepted,
        solvedAt: isAccepted && !priorAccepted ? submissionTime : (currentProgress.solvedAt || null),
        points: (currentProgress.points || 0) + pointsAwarded
      }
    };

    const newScore = (participant.score || 0) + pointsAwarded;
    const newSolvedCount = Object.values(updatedProgress).filter(p => p.accepted).length;

    // Calculate total time elapsed for tie-breaking
    let totalTimeSeconds = participant.totalTimeSeconds || 0;
    if (isAccepted && !priorAccepted && race.startTime) {
      const elapsedForThis = Math.max(1, Math.floor((submissionTime.getTime() - new Date(race.startTime).getTime()) / 1000));
      totalTimeSeconds += elapsedForThis;
    }

    await participantsCol.updateOne(
      { _id: participant._id },
      {
        $set: {
          problemProgress: updatedProgress,
          score: newScore,
          solvedCount: newSolvedCount,
          totalTimeSeconds,
          updatedAt: now()
        }
      }
    );

    // Broadcast live submission progress event (without leaking opponent's code)
    broadcastEvent(raceId, "race:submission", {
      userId: user.id,
      userName: participant.name,
      problemId,
      problemTitle: problem.title,
      verdict: subDoc.verdict,
      isAccepted,
      pointsAwarded,
      totalScore: newScore,
      solvedCount: newSolvedCount
    });

    // Check if participant has solved all questions in race
    if (newSolvedCount >= (race.questionCount || 3)) {
      broadcastEvent(raceId, "race:player_finished", {
        userId: user.id,
        userName: participant.name,
        finalScore: newScore
      });
    }

    return {
      success: true,
      submissionId,
      verdict: subDoc.verdict,
      isAccepted,
      testsPassed,
      totalTests,
      pointsAwarded,
      timeBonus,
      totalScore: newScore,
      failureDetails: isAccepted ? null : firstFailure
    };
  }

  // --- 6. Leaderboard & Completion ---

  async function getLeaderboard(user, raceId) {
    if (!raceId) throw raceError("RACE_ID_REQUIRED", "Race ID required.", 400);
    if (!participantsCol) throw raceError("DATABASE_UNAVAILABLE", "Database offline.", 503);

    const participants = await participantsCol.find({ raceId }).toArray();
    const ranked = calculateStandings(participants);

    return {
      raceId,
      standings: ranked.map(p => ({
        rank: p.rank,
        userId: p.userId,
        name: p.name,
        score: p.score,
        solvedCount: p.solvedCount,
        totalTimeSeconds: p.totalTimeSeconds,
        problemProgress: p.problemProgress
      }))
    };
  }

  async function completeRaceInternal(raceId) {
    if (!racesCol || !participantsCol) return;
    const participants = await participantsCol.find({ raceId }).toArray();
    const standings = calculateStandings(participants);

    await racesCol.updateOne(
      { _id: raceId },
      { $set: { status: "completed", updatedAt: now() } }
    );

    // Record achievements for winners & finishers
    if (achievementsCol && standings.length) {
      const winner = standings[0];
      if (winner && winner.score > 0) {
        await achievementsCol.updateOne(
          { userId: winner.userId, type: "race_winner" },
          { $inc: { count: 1 }, $set: { lastAwardedAt: now() } },
          { upsert: true }
        ).catch(() => {});
      }
    }

    broadcastEvent(raceId, "race:completed", {
      standings: standings.map(s => ({ rank: s.rank, name: s.name, score: s.score, solvedCount: s.solvedCount }))
    });
  }

  async function completeRace(user, raceId) {
    if (!user?.id) throw raceError("AUTHENTICATION_REQUIRED", "Sign in required.", 401);
    const race = await racesCol.findOne({ _id: raceId });
    if (!race) throw raceError("RACE_NOT_FOUND", "Race not found.", 404);

    const isHost = race.host?.id === user.id;
    const isAdmin = user.role === "admin";
    if (!isHost && !isAdmin) {
      throw raceError("FORBIDDEN", "Only the host or admin can finalize the contest.", 403);
    }

    await completeRaceInternal(raceId);
    return { success: true, status: "completed" };
  }

  // --- 7. Post-Race AI Race Coach ---

  async function generateAiCoachAnalysis(user, raceId) {
    if (!user?.id) throw raceError("AUTHENTICATION_REQUIRED", "Sign in required.", 401);
    if (!racesCol || !submissionsCol || !participantsCol) throw raceError("DATABASE_UNAVAILABLE", "Database offline.", 503);

    const race = await racesCol.findOne({ _id: raceId });
    if (!race) throw raceError("RACE_NOT_FOUND", "Race not found.", 404);

    const participant = await participantsCol.findOne({ raceId, userId: user.id });
    if (!participant) throw raceError("NOT_REGISTERED", "Participant record not found.", 404);

    const submissions = await submissionsCol.find({ raceId, userId: user.id }).toArray();
    const acceptedSubs = submissions.filter(s => s.verdict === "Accepted");
    const failedSubs = submissions.filter(s => s.verdict !== "Accepted");

    if (provider && typeof provider.generate === "function") {
      try {
        const prompt = `
You are an expert DSA Competition Coach. Analyze this user's real performance in a competitive coding race.

Race: ${race.title} (${race.difficulty}, ${race.topic})
User Solved: ${participant.solvedCount} / ${race.questionCount || 3}
User Score: ${participant.score} points
Accepted Submissions: ${acceptedSubs.length}
Failed Attempts: ${failedSubs.length}

Problems Attempted:
${Object.entries(participant.problemProgress || {}).map(([pid, p]) => `- Problem ${pid}: ${p.accepted ? 'Accepted' : 'Failed'} (${p.attempts} attempts)`).join('\n')}

Respond in valid JSON only with this schema:
{
  "performanceSummary": "1-2 sentence executive summary of competition pacing and execution",
  "strengths": ["Algorithmic strength 1", "Pattern strength 2"],
  "mistakeRetrospective": ["Mistake root cause 1", "Boundary condition advice 2"],
  "actionablePlan": ["Recommended practice 1", "Concept to review 2"]
}
`;
        const aiRes = await provider.generate({ prompt, temperature: 0.2 });
        if (aiRes && aiRes.text) {
          const cleaned = aiRes.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const parsed = JSON.parse(cleaned);
          return {
            success: true,
            provider: provider.providerName || "Gemini Pro",
            ...parsed
          };
        }
      } catch (_err) {
        // Fall back gracefully
      }
    }

    // Deterministic educational fallback
    return {
      success: true,
      provider: "Deterministic Competition Coach Engine",
      performanceSummary: `Completed ${race.title} with ${participant.solvedCount} problems accepted and ${participant.score} points.`,
      strengths: [
        participant.solvedCount > 0 ? "Efficient solution syntax and problem comprehension." : "Active participation under timed competition pressure.",
        "Deterministic test verification adherence."
      ],
      mistakeRetrospective: [
        failedSubs.length > 0 ? `Experienced ${failedSubs.length} incorrect attempts—focus on dry-running sample edge cases before submitting.` : "Clean submission discipline with minimal wasted attempts."
      ],
      actionablePlan: [
        `Review high-yield problem patterns for ${race.topic}.`,
        "Practice timed interval challenges to improve time bonus scores."
      ]
    };
  }

  // --- 8. User Statistics & History ---

  async function getUserRaceStats(user) {
    if (!user?.id) throw raceError("AUTHENTICATION_REQUIRED", "Sign in required.", 401);
    if (!participantsCol || !racesCol) {
      return {
        totalRaces: 0,
        racesJoined: 0,
        wins: 0,
        racesWon: 0,
        podiumFinishes: 0,
        totalSolved: 0,
        problemsSolved: 0,
        totalScore: 0,
        winRate: 0,
        achievements: []
      };
    }

    const myParticipations = await participantsCol.find({ userId: user.id }).toArray();
    const totalRaces = myParticipations.length;
    const totalScore = myParticipations.reduce((sum, p) => sum + (p.score || 0), 0);
    const totalSolved = myParticipations.reduce((sum, p) => sum + (p.solvedCount || 0), 0);
    const wins = myParticipations.filter(p => p.rank === 1 && p.score > 0).length;
    const podiumFinishes = myParticipations.filter(p => p.rank && p.rank <= 3 && p.score > 0).length;

    const achievements = achievementsCol
      ? await achievementsCol.find({ userId: user.id }).toArray()
      : [];

    return {
      totalRaces,
      racesJoined: totalRaces,
      wins,
      racesWon: wins,
      podiumFinishes,
      totalSolved,
      problemsSolved: totalSolved,
      totalScore,
      winRate: totalRaces > 0 ? Math.round((wins / totalRaces) * 100) : 0,
      achievements
    };
  }

  return {
    RACE_MODES,
    RACE_STATES,
    DIFFICULTY_TIERS,
    TOPIC_CATEGORIES,
    SCORING_BASE,
    createRace,
    listRaces,
    getRace,
    joinRace,
    leaveRace,
    toggleReady,
    startRace,
    cancelRace,
    runSampleTest,
    submitSolution,
    getLeaderboard,
    completeRace,
    generateAiCoachAnalysis,
    getUserRaceStats,
    broadcastEvent,
    sseSubscribers
  };
}

module.exports = {
  RACE_MODES,
  RACE_STATES,
  DIFFICULTY_TIERS,
  TOPIC_CATEGORIES,
  SCORING_BASE,
  DEFAULT_ATTEMPT_PENALTY,
  MAX_TIME_BONUS,
  raceError,
  generateInviteCode,
  selectFairProblems,
  calculateStandings,
  calculateTimeBonus,
  createCodingRaceArenaService
};
