"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
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
} = require("../mock-interview-engine");

const { createAiCodeMentorService } = require("../ai-code-mentor");
const { createAiCodeMentorRouter } = require("../ai-code-mentor-routes");

function createMockProvider() {
  return {
    providerName: "gemini",
    model: "gemini-3.5-flash-lite",
    async analyze() {
      return {
        provider: "gemini",
        model: "gemini-3.5-flash-lite",
        analysis: {}
      };
    },
    async generate({ prompt }) {
      return {
        text: "That approach sounds solid. Let's go ahead and implement it.",
        model: "gemini-3.5-flash-lite"
      };
    }
  };
}

// In-Memory Test DB
function createTestDb() {
  const store = {
    aiCodeReviews: new Map(),
    aiReviewSources: new Map(),
    aiMentorUsage: new Map(),
    dailySubmissionsV2: new Map(),
    aiUserSavedSources: new Map(),
    aiCodeExecutions: new Map(),
    aiLearningRevisions: new Map(),
    aiLearningProfiles: new Map(),
    aiInterviewSessions: new Map()
  };

  const wrap = (map) => ({
    findOne: async (query) => {
      for (const doc of map.values()) {
        let match = true;
        for (const [k, v] of Object.entries(query)) {
          if (doc[k] !== v) { match = false; break; }
        }
        if (match) return doc;
      }
      return null;
    },
    find: (query = {}) => ({
      sort: () => ({
        limit: (lim) => ({
          toArray: async () => {
            const arr = [];
            for (const doc of map.values()) {
              let match = true;
              for (const [k, v] of Object.entries(query)) {
                if (doc[k] !== v) { match = false; break; }
              }
              if (match) arr.push(doc);
            }
            return typeof lim === "number" ? arr.slice(0, lim) : arr;
          }
        }),
        toArray: async () => {
          const arr = [];
          for (const doc of map.values()) {
            let match = true;
            for (const [k, v] of Object.entries(query)) {
              if (doc[k] !== v) { match = false; break; }
            }
            if (match) arr.push(doc);
          }
          return arr;
        }
      })
    }),
    insertOne: async (doc) => {
      const id = doc.sessionId || doc._id || `id_${Date.now()}_${Math.random()}`;
      const saved = { ...doc, _id: id };
      map.set(id, saved);
      return { insertedId: id };
    },
    updateOne: async (query, update) => {
      let target = null;
      for (const [id, doc] of map.entries()) {
        let match = true;
        for (const [k, v] of Object.entries(query)) {
          if (doc[k] !== v) { match = false; break; }
        }
        if (match) { target = { id, doc }; break; }
      }
      if (target && update.$set) {
        const updated = { ...target.doc, ...update.$set };
        map.set(target.id, updated);
        return { matchedCount: 1, modifiedCount: 1 };
      }
      return { matchedCount: 0, modifiedCount: 0 };
    },
    countDocuments: async () => map.size
  });

  return {
    collection: (name) => wrap(store[name] || (store[name] = new Map())),
    store
  };
}

test("Module 7: Constants & Rubric Dimensions", () => {
  assert.ok(INTERVIEW_MODES["standard-mock"], "standard-mock mode exists");
  assert.ok(INTERVIEW_MODES["weak-area-focused"], "weak-area-focused mode exists");
  assert.ok(INTERVIEW_MODES["company-focused"], "company-focused mode exists");
  assert.ok(INTERVIEW_MODES["rapid-fire"], "rapid-fire mode exists");

  assert.equal(EVALUATION_DIMENSIONS.length, 8, "Must contain exactly 8 evaluation dimensions");
  const totalWeight = EVALUATION_DIMENSIONS.reduce((sum, d) => sum + d.weight, 0);
  assert.equal(Math.round(totalWeight * 100) / 100, 1.0, "Dimension weights must sum to 100% (1.0)");
});

test("Module 7: Dynamic Problem Selection", async () => {
  // Standard Mock selection
  const prob1 = await selectInterviewProblem({ mode: "standard-mock", difficulty: "Easy" });
  assert.ok(prob1 && prob1.title, "Returns valid problem for standard-mock");
  assert.equal(prob1.difficulty, "Easy");

  // Custom problem selection
  const prob2 = await selectInterviewProblem({ customProblem: "two-sum" });
  assert.equal(String(prob2.problemId), "1");
  assert.equal(prob2.title, "Two Sum");

  // Weak area focused with mastery profile
  const mockProfile = {
    weakConcepts: [{ id: "dynamic-programming", name: "Dynamic Programming" }]
  };
  const prob3 = await selectInterviewProblem({ mode: "weak-area-focused", masteryProfile: mockProfile });
  assert.ok(prob3 && prob3.title, "Selects a problem targeting weak concepts");
});

test("Module 7: Session Lifecycle (Create -> Start -> Respond -> Hint -> Submit)", async () => {
  // 1. Create
  const session = await createInterviewSession({
    userId: "test-user-1",
    mode: "standard-mock",
    difficulty: "Medium",
    durationMinutes: 45
  });

  assert.equal(session.userId, "test-user-1");
  assert.equal(session.status, "not_started");
  assert.equal(session.stage, "greeting");
  assert.equal(session.hints.usedCount, 0);
  assert.equal(session.hints.maxAvailable, 3);

  // 2. Start
  const started = await startInterviewSession(session);
  assert.equal(started.status, "in_progress");
  assert.equal(started.stage, "clarification");
  assert.ok(started.messages.length >= 1);
  assert.equal(started.messages[0].role, "interviewer");
  assert.ok(started.messages[0].text.includes("Ada"));

  // 3. Process candidate responses through stages
  const step1 = await processStudentResponse(started, {
    message: "Could the input array contain negative numbers or duplicates? Also, what are the constraints on size?"
  });
  assert.equal(step1.stage, "approach");
  assert.ok(step1.reply && step1.reply.length > 0);

  const step2 = await processStudentResponse(step1.session, {
    message: "I plan to use a hash map to store complements, giving O(N) time and O(N) auxiliary space instead of O(N^2) brute force."
  });
  assert.equal(step2.stage, "coding");

  // 4. Request Progressive Hints
  const hint1 = await requestInterviewHint(step2.session);
  assert.equal(hint1.hint.level, 1);
  assert.equal(hint1.session.hints.usedCount, 1);

  const hint2 = await requestInterviewHint(hint1.session);
  assert.equal(hint2.hint.level, 2);
  assert.equal(hint2.session.hints.usedCount, 2);

  const hint3 = await requestInterviewHint(hint2.session);
  assert.equal(hint3.hint.level, 3);
  assert.equal(hint3.session.hints.usedCount, 3);
  assert.equal(hint3.maxReached, true);

  // Requesting 4th hint should reject / return max reached
  const hint4 = await requestInterviewHint(hint3.session);
  assert.equal(hint4.maxReached, true);
  assert.equal(hint4.session.hints.usedCount, 3);

  // 5. Code Execution against Test Harness
  const sampleCode = `
    function twoSum(nums, target) {
      const map = new Map();
      for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
          return [map.get(complement), i];
        }
        map.set(nums[i], i);
      }
      return [];
    }
  `;
  const execResult = await runInterviewCode(hint3.session, {
    code: sampleCode,
    language: "javascript"
  });
  assert.ok(execResult.totalCount > 0);
  assert.equal(execResult.passCount, execResult.totalCount, "All test cases should pass for optimal code");

  // 6. Submit & Evaluation
  const evalResult = await evaluateInterviewSession(hint3.session, {
    finalCode: sampleCode,
    language: "javascript"
  });

  assert.equal(evalResult.session.status, "completed");
  const report = evalResult.report;
  assert.ok(report.overallScore >= 70, "Passing score achieved");
  assert.ok(report.verdict, "Verdict assigned");
  assert.equal(report.dimensions.length, 8, "Report contains 8 dimensions");
  assert.ok(report.strengths.length > 0, "Demonstrated strengths included");
  assert.ok(report.improvements.length > 0, "Actionable growth areas included");
  assert.ok(report.disclaimer.includes("DSAverse Assessment Engine"), "Educational disclaimer included");
});

test("Module 7: Service Integration & Multi-User Isolation", async () => {
  const db = createTestDb();
  const provider = createMockProvider();
  const service = createAiCodeMentorService({ db, provider });

  const userA = { id: "candidate-alpha", role: "member" };
  const userB = { id: "candidate-beta", role: "member" };

  // User A creates interview
  const sessionA = await service.createInterview(userA, {
    mode: "standard-mock",
    difficulty: "Easy"
  });
  assert.ok(sessionA.sessionId);

  // User A starts interview
  const startedA = await service.startInterview(userA, sessionA.sessionId);
  assert.equal(startedA.status, "in_progress");

  // User B cannot access User A's session
  await assert.rejects(
    async () => service.getInterview(userB, sessionA.sessionId),
    (err) => err.status === 403 || err.status === 404 || err.message.includes("permission") || err.message.includes("not found")
  );

  // User B cannot respond to User A's session
  await assert.rejects(
    async () => service.respondToInterview(userB, sessionA.sessionId, { message: "Hello" }),
    (err) => err.status === 403 || err.status === 404 || err.message.includes("permission") || err.message.includes("not found")
  );

  // User A responds
  const resA = await service.respondToInterview(userA, sessionA.sessionId, {
    message: "Does the array contain distinct integers?"
  });
  assert.ok(resA.reply);

  // User A requests hint
  const hintRes = await service.requestInterviewSessionHint(userA, sessionA.sessionId);
  assert.ok(hintRes.hint);

  // User A runs code
  const runRes = await service.runInterviewExecution(userA, sessionA.sessionId, {
    code: "function twoSum(nums, target) { return [0, 1]; }",
    language: "javascript"
  });
  assert.ok(runRes.totalCount > 0);

  // User A submits
  const submitRes = await service.submitInterview(userA, sessionA.sessionId, {
    finalCode: "function twoSum(nums, target) { return [0, 1]; }",
    language: "javascript"
  });
  assert.ok(submitRes.report);
  assert.equal(submitRes.session.status, "completed");

  // User A gets report
  const report = await service.getInterviewReport(userA, sessionA.sessionId);
  assert.equal(report.overallScore, submitRes.report.overallScore);

  // List interviews for User A vs User B
  const listA = await service.listInterviews(userA);
  const listB = await service.listInterviews(userB);
  assert.equal(listA.length, 1);
  assert.equal(listB.length, 0);
});

test("Module 7: REST API Route Endpoints", async () => {
  const express = require("express");
  const db = createTestDb();
  const provider = createMockProvider();
  const service = createAiCodeMentorService({ db, provider });

  let authedUser = { id: "student-api", role: "member" };

  const memberOnly = (req, res, next) => {
    if (!authedUser) return res.status(401).json({ error: "Unauthorized" });
    req.member = authedUser;
    next();
  };

  const reviewRateLimit = (req, res, next) => next();

  const router = createAiCodeMentorRouter({
    memberOnly,
    serviceFor: () => service,
    reviewRateLimit
  });

  const app = express();
  app.use(express.json());
  app.use("/api/ai-code-mentor", router);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/ai-code-mentor`;

  try {
    // 1. Create interview
    const createRes = await fetch(`${baseUrl}/interviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "standard-mock", difficulty: "Easy" })
    });
    assert.equal(createRes.status, 201);
    const sessionData = await createRes.json();
    const sessionId = sessionData.sessionId;
    assert.ok(sessionId);

    // 2. Start interview
    const startRes = await fetch(`${baseUrl}/interviews/${sessionId}/start`, { method: "POST" });
    assert.equal(startRes.status, 200);
    const startedData = await startRes.json();
    assert.equal(startedData.status, "in_progress");

    // 3. Respond
    const respRes = await fetch(`${baseUrl}/interviews/${sessionId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "What are the time constraints?" })
    });
    assert.equal(respRes.status, 200);
    const respData = await respRes.json();
    assert.ok(respData.reply);

    // 4. Request Hint
    const hintRes = await fetch(`${baseUrl}/interviews/${sessionId}/hint`, { method: "POST" });
    assert.equal(hintRes.status, 200);
    const hintData = await hintRes.json();
    assert.ok(hintData.hint);

    // 5. Run Execution
    const runRes = await fetch(`${baseUrl}/interviews/${sessionId}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "function twoSum() { return []; }", language: "javascript" })
    });
    assert.equal(runRes.status, 200);
    const runData = await runRes.json();
    assert.ok(runData.totalCount > 0);

    // 6. Submit
    const submitRes = await fetch(`${baseUrl}/interviews/${sessionId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ finalCode: "function twoSum() { return []; }", language: "javascript" })
    });
    assert.equal(submitRes.status, 200);
    const submitData = await submitRes.json();
    assert.ok(submitData.report);

    // 7. Get Report
    const reportRes = await fetch(`${baseUrl}/interviews/${sessionId}/report`);
    assert.equal(reportRes.status, 200);
    const reportData = await reportRes.json();
    assert.equal(reportData.report.overallScore, submitData.report.overallScore);

    // 8. List
    const listRes = await fetch(`${baseUrl}/interviews`);
    assert.equal(listRes.status, 200);
    const listData = await listRes.json();
    assert.equal(listData.sessions.length, 1);

    // 9. Unauthenticated access check
    authedUser = null;
    const unauthRes = await fetch(`${baseUrl}/interviews`);
    assert.equal(unauthRes.status, 401);
  } finally {
    server.close();
  }
});
