"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CONCEPT_TAXONOMY,
  MASTERY_LEVELS,
  REVISION_INTERVALS_DAYS,
  detectConceptsForProblem,
  normalizeMistakeCategory,
  calculateConceptMastery,
  aggregateRecurringMistakes,
  calculateRevisionSchedule,
  generateAdaptiveRecommendations,
  buildStudentLearningProfile,
  buildTutorLessonContent
} = require("../personalized-learning-engine");

const { createAiCodeMentorService } = require("../ai-code-mentor");
const { createAiCodeMentorRouter } = require("../ai-code-mentor-routes");

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
    aiLearningProfiles: new Map()
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
            const arr = Array.from(map.values()).filter(doc => {
              if (query.userId && doc.userId !== query.userId && doc.memberId !== query.userId) return false;
              return true;
            });
            return arr.slice(0, lim);
          }
        }),
        toArray: async () => {
          return Array.from(map.values()).filter(doc => {
            if (query.userId && doc.userId !== query.userId && doc.memberId !== query.userId) return false;
            return true;
          });
        }
      }),
      toArray: async () => {
        return Array.from(map.values()).filter(doc => {
          if (query.userId && doc.userId !== query.userId && doc.memberId !== query.userId) return false;
          return true;
        });
      }
    }),
    insertOne: async (doc) => {
      const _id = doc._id || `id_${Date.now()}_${Math.random()}`;
      map.set(String(_id), { ...doc, _id });
      return { insertedId: _id };
    },
    updateOne: async (filter, update, opts = {}) => {
      let existing = null;
      let existingKey = null;
      for (const [k, v] of map.entries()) {
        let match = true;
        for (const [fk, fv] of Object.entries(filter)) {
          if (v[fk] !== fv) { match = false; break; }
        }
        if (match) { existing = v; existingKey = k; break; }
      }
      if (existing) {
        if (update.$set) Object.assign(existing, update.$set);
        return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
      }
      if (opts.upsert) {
        const newDoc = { ...filter, ...(update.$set || {}), ...(update.$setOnInsert || {}) };
        const id = newDoc._id || `up_${Date.now()}_${Math.random()}`;
        map.set(String(id), { ...newDoc, _id: id });
        return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
      }
      return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    }
  });

  return {
    collection: (name) => {
      if (!store[name]) store[name] = new Map();
      return wrap(store[name]);
    },
    _rawStore: store
  };
}

function createMockProvider() {
  return {
    providerName: "gemini",
    model: "gemini-3.5-flash-lite",
    async analyze() {
      return {
        provider: "gemini",
        model: "gemini-3.5-flash-lite",
        analysis: {
          problemUnderstanding: { taskScope: "Test", coreInvariants: "Test" },
          studentApproach: { algorithm: "Two Pointers", pattern: "Two Pointers" },
          correctnessStatus: "correct",
          mistakeDiagnosis: { hasMistake: false }
        }
      };
    }
  };
}

// ----------------------------------------------------
// 1. ENGINE UNIT TESTS
// ----------------------------------------------------

test("Module 6: Concept Taxonomy covers fundamental DSA patterns", () => {
  assert.ok(CONCEPT_TAXONOMY["arrays-hashing"], "arrays-hashing should exist");
  assert.ok(CONCEPT_TAXONOMY["two-pointers"], "two-pointers should exist");
  assert.ok(CONCEPT_TAXONOMY["sliding-window"], "sliding-window should exist");
  assert.ok(CONCEPT_TAXONOMY["binary-search"], "binary-search should exist");
  assert.ok(CONCEPT_TAXONOMY["dynamic-programming"], "dynamic-programming should exist");
  assert.ok(CONCEPT_TAXONOMY["dfs-bfs"], "dfs-bfs should exist");
  assert.ok(CONCEPT_TAXONOMY["monotonic-stack"], "monotonic-stack should exist");
  assert.equal(Object.keys(CONCEPT_TAXONOMY).length, 15, "Should have 15 core concepts");
});

test("Module 6: Dynamic concept detection matches keywords and metadata", () => {
  const conceptsA = detectConceptsForProblem({
    problemTitle: "Longest Substring Without Repeating Characters",
    problemSlug: "longest-substring-without-repeating-characters"
  });
  assert.ok(conceptsA.includes("sliding-window"), "Should detect sliding-window");

  const conceptsB = detectConceptsForProblem({
    problemTitle: "Koko Eating Bananas",
    problemSlug: "koko-eating-bananas"
  });
  assert.ok(conceptsB.includes("binary-search-on-answer") || conceptsB.includes("binary-search"), "Should detect binary search on answer");

  const conceptsC = detectConceptsForProblem({
    problemTitle: "Daily Temperatures",
    problemSlug: "daily-temperatures"
  });
  assert.ok(conceptsC.includes("monotonic-stack"), "Should detect monotonic-stack");

  // Fallback heuristic for unknown problem
  const fallback = detectConceptsForProblem({
    problemTitle: "Custom Unseen Problem",
    problemSlug: "custom-unseen-problem"
  });
  assert.ok(fallback.length > 0, "Should fall back gracefully without crashing");
});

test("Module 6: normalizeMistakeCategory standardizes mistake descriptions", () => {
  assert.equal(normalizeMistakeCategory("Off-by-one boundary error", "Accessed index out of bounds"), "boundary-condition");
  assert.equal(normalizeMistakeCategory("Time Limit Exceeded", "Nested O(n^2) loop"), "time-complexity");
  assert.equal(normalizeMistakeCategory("Null Pointer Exception", "Dereferenced null pointer node.next"), "null-pointer");
  assert.equal(normalizeMistakeCategory("Infinite loop detected", "While loop never terminates"), "infinite-loop");
  assert.equal(normalizeMistakeCategory("Compilation Error", "Syntax error line 5"), "syntax-compilation");
});

test("Module 6: calculateConceptMastery multi-signal transparent scoring", () => {
  const now = new Date("2026-11-10T12:00:00Z");

  // Empty history
  const emptyMastery = calculateConceptMastery({ reviews: [], executions: [], submissions: [], now });
  assert.equal(emptyMastery["arrays-hashing"].level, MASTERY_LEVELS.NOT_STARTED);
  assert.equal(emptyMastery["arrays-hashing"].score, 0);

  // User with 3 solved Two Pointers problems and 100% pass rate
  const reviews = [
    {
      problemSlug: "two-sum-ii",
      problemTitle: "Two Sum II",
      createdAt: "2026-11-09T10:00:00Z",
      analysis: { correctnessStatus: "correct", mistakeDiagnosis: { hasMistake: false }, concepts: ["Two Pointers"] }
    },
    {
      problemSlug: "3sum",
      problemTitle: "3Sum",
      createdAt: "2026-11-08T10:00:00Z",
      analysis: { correctnessStatus: "correct", mistakeDiagnosis: { hasMistake: false }, concepts: ["Two Pointers"] }
    },
    {
      problemSlug: "container-with-most-water",
      problemTitle: "Container With Most Water",
      createdAt: "2026-11-07T10:00:00Z",
      analysis: { correctnessStatus: "correct", mistakeDiagnosis: { hasMistake: false }, concepts: ["Two Pointers"] }
    }
  ];

  const executions = [
    { problemSlug: "two-sum-ii", status: "passed", createdAt: "2026-11-09T10:05:00Z" },
    { problemSlug: "3sum", status: "passed", createdAt: "2026-11-08T10:05:00Z" }
  ];

  const mastery = calculateConceptMastery({ reviews, executions, submissions: [], now });
  const tp = mastery["two-pointers"];
  assert.ok(tp.score >= 80, `Expected high score for 3 solved problems, got ${tp.score}`);
  assert.equal(tp.level, MASTERY_LEVELS.STRONG);
  assert.equal(tp.attemptsCount, 3);
  assert.equal(tp.solvedCount, 3);
  assert.equal(tp.mistakesCount, 0);
});

test("Module 6: aggregateRecurringMistakes flags repeating patterns with counterexamples", () => {
  const reviews = [
    {
      problemSlug: "binary-search-1",
      problemTitle: "Binary Search",
      createdAt: "2026-11-05T10:00:00Z",
      analysis: {
        mistakeDiagnosis: {
          hasMistake: true,
          title: "Boundary Condition Bug",
          detail: "Using left < right excludes single element array.",
          counterExample: "nums = [5], target = 5",
          suggestedFix: "Change condition to left <= right."
        }
      }
    },
    {
      problemSlug: "search-insert-position",
      problemTitle: "Search Insert Position",
      createdAt: "2026-11-06T10:00:00Z",
      analysis: {
        mistakeDiagnosis: {
          hasMistake: true,
          title: "Boundary Index Error",
          detail: "Upper bound update right = mid instead of right = mid - 1.",
          counterExample: "nums = [1, 3, 5, 6], target = 2",
          suggestedFix: "Update right = mid - 1."
        }
      }
    }
  ];

  const result = aggregateRecurringMistakes({ reviews });
  assert.equal(result.hasRecurring, true);
  assert.equal(result.recurringMistakes.length, 1);
  const boundaryMistake = result.recurringMistakes[0];
  assert.equal(boundaryMistake.category, "boundary-condition");
  assert.equal(boundaryMistake.count, 2);
  assert.ok(boundaryMistake.counterExample.includes("nums = [5]"));
  assert.ok(boundaryMistake.suggestedFix.includes("left <= right"));
});

test("Module 6: Spaced repetition revision scheduling with interval escalation", () => {
  const now = new Date("2026-11-10T12:00:00Z");
  const mastery = {
    "two-pointers": {
      id: "two-pointers",
      title: "Two Pointers",
      category: "Linear Patterns",
      level: MASTERY_LEVELS.STRONG,
      score: 90,
      attemptsCount: 3,
      lastPracticed: "2026-11-01T12:00:00Z", // 9 days ago
      mistakesCount: 0
    }
  };

  // Case 1: First revision (interval 1 day -> overdue after 9 days)
  const schedule1 = calculateRevisionSchedule({ mastery, revisions: [], now });
  assert.equal(schedule1.due.length, 1);
  assert.equal(schedule1.due[0].status, "due");
  assert.equal(schedule1.due[0].intervalDays, 1);

  // Case 2: After completing 2 revisions, interval escalates to 7 days
  const revisions = [
    { conceptId: "two-pointers", completedAt: "2026-11-02T12:00:00Z" },
    { conceptId: "two-pointers", completedAt: "2026-11-08T12:00:00Z" }
  ];
  const schedule2 = calculateRevisionSchedule({ mastery, revisions, now });
  const item = schedule2.all.find(s => s.conceptId === "two-pointers");
  assert.ok(item, "Should find two-pointers in schedule");
  assert.equal(item.intervalDays, 7);
  assert.equal(item.revisionCycle, 3);
});

test("Module 6: Progressive AI tutor hints (Hints 1 to 4)", () => {
  const hint1 = buildTutorLessonContent({ type: "progressive_hint", conceptId: "sliding-window", hintLevel: 1 });
  assert.equal(hint1.hintLevel, 1);
  assert.ok(hint1.title.includes("Hint 1"));
  assert.ok(hint1.text.includes("invariant"));

  const hint2 = buildTutorLessonContent({ type: "progressive_hint", conceptId: "sliding-window", hintLevel: 2 });
  assert.equal(hint2.hintLevel, 2);
  assert.ok(hint2.title.includes("Hint 2"));

  const hint3 = buildTutorLessonContent({ type: "progressive_hint", conceptId: "sliding-window", hintLevel: 3 });
  assert.equal(hint3.hintLevel, 3);
  assert.ok(hint3.title.includes("Hint 3"));

  const hint4 = buildTutorLessonContent({ type: "progressive_hint", conceptId: "sliding-window", hintLevel: 4 });
  assert.equal(hint4.hintLevel, 4);
  assert.ok(hint4.title.includes("Full Algorithmic Walkthrough"));
});

test("Module 6: AI Tutor compares related patterns", () => {
  const comp = buildTutorLessonContent({
    type: "compare_patterns",
    conceptA: "two-pointers",
    conceptB: "sliding-window"
  });
  assert.equal(comp.type, "compare_patterns");
  assert.ok(comp.title.includes("Two Pointers vs Sliding Window"));
  assert.ok(Array.isArray(comp.comparison));
  assert.ok(comp.comparison.length >= 2);
});

// ----------------------------------------------------
// 2. SERVICE & BACKEND INTEGRATION TESTS
// ----------------------------------------------------

test("Module 6 Service: Brand new user gets clean learning profile with zero fabricated stats", async () => {
  const db = createTestDb();
  const provider = createMockProvider();
  const service = createAiCodeMentorService({ db, provider });

  const profile = await service.getLearningProfile({ id: "new-user-123" });
  assert.equal(profile.userId, "new-user-123");
  assert.equal(profile.overview.totalProblemsAttempted, 0);
  assert.equal(profile.overview.totalProblemsSolved, 0);
  assert.equal(profile.recurringMistakes.length, 0);
  assert.ok(profile.overview.assessmentDisclaimer.includes("educational estimations"));

  // Check onboarding recommendation
  assert.ok(profile.recommendations.length > 0);
  assert.equal(profile.recommendations[0].type, "onboarding");
  assert.ok(profile.recommendations[0].reason.includes("learning profile is currently building"));
});

test("Module 6 Service: User with reviews and executions builds accurate mastery & recommendations", async () => {
  const db = createTestDb();
  const provider = createMockProvider();
  const service = createAiCodeMentorService({ db, provider });
  const userId = "learner-alice";

  // Insert real review with Sliding Window mistake
  await db.collection("aiCodeReviews").insertOne({
    userId,
    problemSlug: "longest-substring-without-repeating-characters",
    problemTitle: "Longest Substring Without Repeating Characters",
    createdAt: new Date(),
    analysis: {
      correctnessStatus: "has_bugs",
      concepts: ["Sliding Window"],
      mistakeDiagnosis: {
        hasMistake: true,
        title: "Window Boundary Contraction Bug",
        detail: "Did not shrink left pointer boundary when repeating character encountered.",
        counterExample: "s = 'abcabcbb'",
        suggestedFix: "Advance left pointer past seen character index."
      }
    }
  });

  // Insert a second review with same mistake to trigger recurring mistake
  await db.collection("aiCodeReviews").insertOne({
    userId,
    problemSlug: "fruit-into-baskets",
    problemTitle: "Fruit Into Baskets",
    createdAt: new Date(),
    analysis: {
      correctnessStatus: "has_bugs",
      concepts: ["Sliding Window"],
      mistakeDiagnosis: {
        hasMistake: true,
        title: "Window Boundary Shrink Bug",
        detail: "Boundary condition for while loop contraction was off by one.",
        counterExample: "fruits = [1, 2, 3, 2, 2]",
        suggestedFix: "Shrink until distinct fruit count <= 2."
      }
    }
  });

  const profile = await service.getLearningProfile({ id: userId });
  assert.equal(profile.overview.totalProblemsAttempted, 2);
  assert.ok(profile.recurringMistakes.length >= 1, "Should detect recurring mistake");
  assert.equal(profile.recurringMistakes[0].category, "boundary-condition");

  // Verify recommendations contain recurring mistake and weak concept
  const recTypes = profile.recommendations.map(r => r.type);
  assert.ok(recTypes.includes("recurring_mistake") || recTypes.includes("weak_concept"));
});

test("Module 6 Service: Cross-user data isolation is strictly enforced", async () => {
  const db = createTestDb();
  const provider = createMockProvider();
  const service = createAiCodeMentorService({ db, provider });

  // User A activity
  await db.collection("aiCodeReviews").insertOne({
    userId: "user-alpha",
    problemSlug: "koko-eating-bananas",
    createdAt: new Date(),
    analysis: {
      correctnessStatus: "correct",
      concepts: ["Binary Search on Answer Space"]
    }
  });

  // User B profile should have ZERO records from User A
  const profileB = await service.getLearningProfile({ id: "user-beta" });
  assert.equal(profileB.overview.totalProblemsAttempted, 0);
  assert.equal(profileB.overview.totalProblemsSolved, 0);
});

test("Module 6 Service: completeRevision records revision and updates schedule", async () => {
  const db = createTestDb();
  const provider = createMockProvider();
  const service = createAiCodeMentorService({ db, provider });
  const userId = "learner-bob";

  // Rejects invalid concept
  await assert.rejects(
    async () => service.completeRevision({ id: userId }, { conceptId: "nonexistent-concept" }),
    (err) => err.code === "INVALID_CONCEPT" || err.message.includes("Unknown concept ID")
  );

  // Succeeds with valid concept
  const result = await service.completeRevision({ id: userId }, { conceptId: "two-pointers", notes: "Reviewed 3Sum two-pointer movement." });
  assert.equal(result.success, true);
  assert.equal(result.completedRevision.conceptId, "two-pointers");
  assert.ok(result.revisionSchedule);
});

test("Module 6 Service: generateTutorLesson provides structured tutoring", async () => {
  const db = createTestDb();
  const provider = createMockProvider();
  const service = createAiCodeMentorService({ db, provider });
  const userId = "learner-charlie";

  const lesson = await service.generateTutorLesson({ id: userId }, {
    type: "explain_weak_concept",
    conceptId: "dynamic-programming"
  });
  assert.ok(lesson.title.includes("Dynamic Programming"));
  assert.ok(lesson.text.includes("optimal substructure") || lesson.text.includes("memoization"));
});

// ----------------------------------------------------
// 3. API ROUTES INTEGRATION TESTS
// ----------------------------------------------------

function listen(app) {
  return new Promise(resolve => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}
function close(server) {
  return new Promise(resolve => server.close(resolve));
}

test("Module 6 Routes: Endpoints handle valid calls and require authentication", async () => {
  const db = createTestDb();
  const provider = createMockProvider();
  const service = createAiCodeMentorService({ db, provider });

  let memberSession = { id: "test-member-99" };
  const memberOnly = (req, res, next) => {
    if (!memberSession) return res.status(401).json({ error: "Unauthorized" });
    req.member = memberSession;
    next();
  };

  const router = createAiCodeMentorRouter({
    memberOnly,
    serviceFor: () => service,
    reviewRateLimit: (_req, _res, next) => next()
  });

  const express = require("express");
  const app = express();
  app.use(express.json());
  app.use("/api/ai-code-mentor", router);

  const server = await listen(app);
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    // 1. GET /learning/profile
    const res1 = await fetch(`${base}/api/ai-code-mentor/learning/profile`);
    assert.equal(res1.status, 200);
    const body1 = await res1.json();
    assert.ok(body1.conceptMastery);
    assert.ok(body1.recommendations);

    // 2. GET /learning/mastery
    const res2 = await fetch(`${base}/api/ai-code-mentor/learning/mastery`);
    assert.equal(res2.status, 200);
    const body2 = await res2.json();
    assert.ok(body2.conceptMastery);

    // 3. GET /learning/recommendations
    const res3 = await fetch(`${base}/api/ai-code-mentor/learning/recommendations`);
    assert.equal(res3.status, 200);
    const body3 = await res3.json();
    assert.ok(Array.isArray(body3.recommendations));

    // 4. GET /learning/revision
    const res4 = await fetch(`${base}/api/ai-code-mentor/learning/revision`);
    assert.equal(res4.status, 200);
    const body4 = await res4.json();
    assert.ok(body4.due !== undefined);

    // 5. POST /learning/revision/complete
    const res5 = await fetch(`${base}/api/ai-code-mentor/learning/revision/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conceptId: "sliding-window" })
    });
    assert.equal(res5.status, 200);
    const body5 = await res5.json();
    assert.equal(body5.success, true);

    // 6. POST /learning/tutor-lesson
    const res6 = await fetch(`${base}/api/ai-code-mentor/learning/tutor-lesson`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "progressive_hint", conceptId: "two-pointers", hintLevel: 2 })
    });
    assert.equal(res6.status, 200);
    const body6 = await res6.json();
    assert.equal(body6.hintLevel, 2);

    // 7. Authentication rejection when session absent
    memberSession = null;
    const res7 = await fetch(`${base}/api/ai-code-mentor/learning/profile`);
    assert.equal(res7.status, 401);
  } finally {
    await close(server);
  }
});
