"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  RACE_MODES,
  RACE_STATES,
  DIFFICULTY_TIERS,
  TOPIC_CATEGORIES,
  SCORING_BASE,
  createCodingRaceArenaService
} = require("../coding-race-arena");
const { TEST_DELIM_PREFIX } = require("../code-execution-engine");

// Robust In-Memory Test DB Mock supporting Mongo queries used by coding-race-arena
function createTestDb() {
  const store = {
    codingRaces: new Map(),
    codingRaceParticipants: new Map(),
    codingRaceSubmissions: new Map(),
    codingRaceEvents: new Map(),
    codingRaceAchievements: new Map(),
    groupMembers: new Map()
  };

  function getDocVal(doc, key) {
    if (key.includes(".")) {
      const parts = key.split(".");
      let cur = doc;
      for (const p of parts) {
        if (!cur) return undefined;
        cur = cur[p];
      }
      return cur;
    }
    return doc[key];
  }

  function matchesQuery(doc, query) {
    for (const [key, val] of Object.entries(query)) {
      if (key === "$and" && Array.isArray(val)) {
        if (!val.every(subQ => matchesQuery(doc, subQ))) return false;
        continue;
      }
      if (key === "$or" && Array.isArray(val)) {
        if (!val.some(subQ => matchesQuery(doc, subQ))) return false;
        continue;
      }

      const docVal = getDocVal(doc, key);

      if (val && typeof val === "object" && !(val instanceof RegExp)) {
        if ("$ne" in val && docVal === val.$ne) return false;
        if ("$in" in val && Array.isArray(val.$in) && !val.$in.includes(docVal)) return false;
        continue;
      }

      if (val instanceof RegExp) {
        if (!val.test(String(docVal || ""))) return false;
        continue;
      }

      if (docVal !== val) return false;
    }
    return true;
  }

  const wrap = (name) => {
    const map = store[name] || new Map();
    store[name] = map;

    return {
      insertOne: async (doc) => {
        const _id = doc._id || "id_" + Math.random().toString(36).substring(2, 9);
        const inserted = JSON.parse(JSON.stringify({ ...doc, _id }));
        map.set(String(_id), inserted);
        return { insertedId: _id, acknowledged: true };
      },
      findOne: async (query) => {
        for (const doc of map.values()) {
          if (matchesQuery(doc, query)) {
            return JSON.parse(JSON.stringify(doc));
          }
        }
        return null;
      },
      find: (query = {}) => {
        const matched = [];
        for (const doc of map.values()) {
          if (matchesQuery(doc, query)) {
            matched.push(JSON.parse(JSON.stringify(doc)));
          }
        }

        let sorted = matched;
        let limitVal = 1000;
        let skipVal = 0;

        const cursor = {
          sort: (sortObj) => {
            sorted.sort((a, b) => {
              for (const [k, dir] of Object.entries(sortObj)) {
                const aV = getDocVal(a, k);
                const bV = getDocVal(b, k);
                if (aV < bV) return dir === 1 ? -1 : 1;
                if (aV > bV) return dir === 1 ? 1 : -1;
              }
              return 0;
            });
            return cursor;
          },
          skip: (n) => {
            skipVal = n;
            return cursor;
          },
          limit: (n) => {
            limitVal = n;
            return cursor;
          },
          toArray: async () => {
            return sorted.slice(skipVal, skipVal + limitVal);
          }
        };
        return cursor;
      },
      countDocuments: async (query = {}) => {
        let count = 0;
        for (const doc of map.values()) {
          if (matchesQuery(doc, query)) count++;
        }
        return count;
      },
      updateOne: async (query, update, options = {}) => {
        for (const [id, doc] of map.entries()) {
          if (matchesQuery(doc, query)) {
            const updatedDoc = JSON.parse(JSON.stringify(doc));
            if (update.$set) {
              for (const [k, v] of Object.entries(update.$set)) {
                if (k.includes(".")) {
                  const parts = k.split(".");
                  updatedDoc[parts[0]] = updatedDoc[parts[0]] || {};
                  updatedDoc[parts[0]][parts[1]] = v;
                } else {
                  updatedDoc[k] = v;
                }
              }
            }
            if (update.$inc) {
              for (const [incK, incV] of Object.entries(update.$inc)) {
                updatedDoc[incK] = (updatedDoc[incK] || 0) + incV;
              }
            }
            map.set(id, updatedDoc);
            return { matchedCount: 1, modifiedCount: 1 };
          }
        }

        if (options && options.upsert) {
          const newDoc = { ...query };
          if (update.$set) {
            for (const [k, v] of Object.entries(update.$set)) {
              newDoc[k] = v;
            }
          }
          if (update.$inc) {
            for (const [incK, incV] of Object.entries(update.$inc)) {
              newDoc[incK] = (newDoc[incK] || 0) + incV;
            }
          }
          const _id = newDoc._id || "upsert_" + Math.random().toString(36).substring(2, 9);
          newDoc._id = _id;
          map.set(String(_id), newDoc);
          return { matchedCount: 0, modifiedCount: 0, upsertedId: _id };
        }

        return { matchedCount: 0, modifiedCount: 0 };
      },
      deleteOne: async (query) => {
        for (const [id, doc] of map.entries()) {
          if (matchesQuery(doc, query)) {
            map.delete(id);
            return { deletedCount: 1 };
          }
        }
        return { deletedCount: 0 };
      }
    };
  };

  return {
    collection: (name) => wrap(name),
    _rawStore: store
  };
}

// ---------------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------------

test("Module 10: Taxonomies, Configurations & Base Scoring", async () => {
  assert.ok(Array.isArray(RACE_MODES), "RACE_MODES must be an array");
  assert.deepEqual(RACE_MODES, ["quick", "private", "group", "scheduled", "practice"]);

  assert.ok(Array.isArray(RACE_STATES), "RACE_STATES must be an array");
  assert.ok(RACE_STATES.includes("waiting"));
  assert.ok(RACE_STATES.includes("live"));
  assert.ok(RACE_STATES.includes("completed"));
  assert.ok(RACE_STATES.includes("cancelled"));

  assert.ok(Array.isArray(DIFFICULTY_TIERS));
  assert.ok(DIFFICULTY_TIERS.includes("Easy"));
  assert.ok(DIFFICULTY_TIERS.includes("Medium"));
  assert.ok(DIFFICULTY_TIERS.includes("Hard"));

  assert.equal(SCORING_BASE.Easy, 100);
  assert.equal(SCORING_BASE.Medium, 200);
  assert.equal(SCORING_BASE.Hard, 300);
});

test("Module 10: Race Creation, Validation & Host Auto-Registration", async () => {
  const db = createTestDb();
  const service = createCodingRaceArenaService({ db });

  const hostUser = { id: "user_alice", name: "Alice" };

  // 1. Rejects missing / invalid title
  await assert.rejects(
    async () => service.createRace(hostUser, { title: "ab" }),
    /Race title must be between 3 and 80 characters/
  );

  // 2. Rejects unauthenticated user
  await assert.rejects(
    async () => service.createRace(null, { title: "Valid Title" }),
    /Sign in required/
  );

  // 3. Creates valid Quick Race
  const quickRace = await service.createRace(hostUser, {
    title: "Sprint Algorithm Clash",
    mode: "quick",
    difficulty: "Easy",
    questionCount: 2
  });

  const raceId = quickRace.id || quickRace.raceId;
  assert.ok(raceId.startsWith("race_"));
  assert.equal(quickRace.title, "Sprint Algorithm Clash");
  assert.equal(quickRace.mode, "quick");
  assert.equal(quickRace.status, "waiting");
  assert.equal(quickRace.problems.length, 2);

  // 4. Verifies host participant was inserted
  const participants = await db.collection("codingRaceParticipants").find({ raceId }).toArray();
  assert.equal(participants.length, 1);
  assert.equal(participants[0].userId, "user_alice");
  assert.equal(participants[0].isHost, true);

  // 5. Creates Private Race with 6-character room invite code
  const privateRace = await service.createRace(hostUser, {
    title: "Secret Guild Match",
    mode: "private",
    difficulty: "Medium"
  });

  assert.ok(privateRace.inviteCode, "Private race must include invite code");
  assert.equal(privateRace.inviteCode.length, 6, "Invite code must be 6 alphanumeric characters");
});

test("Module 10: Access Control — Private Rooms & Group Cohort Verification", async () => {
  const db = createTestDb();
  const service = createCodingRaceArenaService({ db });

  const host = { id: "user_host", name: "Host" };
  const bob = { id: "user_bob", name: "Bob" };

  // 1. Private race creation & join verification
  const priv = await service.createRace(host, {
    title: "Closed Room 101",
    mode: "private"
  });
  const privId = priv.id || priv.raceId;

  // Bob fails to join private race without invite code
  await assert.rejects(
    async () => service.joinRace(bob, privId),
    /Valid 6-character room invite code is required/
  );

  // Bob fails to join with wrong invite code
  await assert.rejects(
    async () => service.joinRace(bob, privId, { inviteCode: "WRONG1" }),
    /Valid 6-character room invite code is required/
  );

  // Bob succeeds with correct invite code
  const joinRes = await service.joinRace(bob, privId, { inviteCode: priv.inviteCode });
  assert.equal(joinRes.success, true);
  assert.equal(joinRes.participant.userId, "user_bob");

  // 2. Group Race Membership Enforcement via groupMembers collection
  const groupId = "group_algo_wizards";
  
  // Non-member fails to create group race
  await assert.rejects(
    async () => service.createRace(bob, {
      title: "Wizard Tourney",
      mode: "group",
      groupId
    }),
    /You must be an approved group member/
  );

  // Add host as approved group member
  await db.collection("groupMembers").insertOne({
    groupId,
    userId: host.id,
    status: "approved"
  });

  // Host now successfully creates group race
  const groupRace = await service.createRace(host, {
    title: "Wizard Tourney",
    mode: "group",
    groupId,
    groupName: "Algorithm Wizards"
  });
  const groupRaceId = groupRace.id || groupRace.raceId;
  assert.equal(groupRace.mode, "group");
  assert.equal(groupRace.groupId, groupId);

  // Bob (not approved member) fails to join group race
  await assert.rejects(
    async () => service.joinRace(bob, groupRaceId),
    /approved group member/
  );

  // Approve Bob in group
  await db.collection("groupMembers").insertOne({
    groupId,
    userId: bob.id,
    status: "approved"
  });

  // Bob now successfully joins group race
  const bobGroupJoin = await service.joinRace(bob, groupRaceId);
  assert.equal(bobGroupJoin.success, true);
});

test("Module 10: State Machine Transitions — Waiting -> Live -> Completed -> Cancelled", async () => {
  const db = createTestDb();
  let fakeTime = new Date("2026-11-10T12:00:00.000Z");
  const service = createCodingRaceArenaService({ db, now: () => fakeTime });

  const host = { id: "user_host", name: "Host" };
  const racer = { id: "user_racer", name: "Racer" };

  const race = await service.createRace(host, {
    title: "Championship Lap",
    mode: "quick",
    durationMinutes: 20
  });
  const raceId = race.id || race.raceId;

  await service.joinRace(racer, raceId);

  // 1. Racer toggles ready
  const readyRes = await service.toggleReady(racer, raceId, true);
  assert.equal(readyRes.isReady, true);

  // 2. Non-host cannot start race
  await assert.rejects(
    async () => service.startRace(racer, raceId),
    /Only the race host can start the contest/
  );

  // 3. Host starts race
  const startRes = await service.startRace(host, raceId);
  assert.equal(startRes.status, "live");
  assert.ok(startRes.startTime);
  assert.ok(startRes.endTime);

  const updatedRace = await service.getRace(host, raceId);
  assert.equal(updatedRace.status, "live");

  // 4. Starting an already live race is idempotent
  const repeatStart = await service.startRace(host, raceId);
  assert.equal(repeatStart.alreadyStarted, true);

  // 5. Host cancels an active race
  const cancelRes = await service.cancelRace(host, raceId, "Scheduled server maintenance");
  assert.equal(cancelRes.status, "cancelled");

  const cancelledDoc = await service.getRace(host, raceId);
  assert.equal(cancelledDoc.status, "cancelled");

  // 6. Starting a cancelled race fails
  await assert.rejects(
    async () => service.startRace(host, raceId),
    /Cannot start a race that is cancelled/
  );
});

test("Module 10: Problem Selection Fairness & Information Hiding", async () => {
  const db = createTestDb();
  const service = createCodingRaceArenaService({ db });

  const host = { id: "user_host", name: "Host" };
  const guest = { id: "user_guest", name: "Guest" };

  const race = await service.createRace(host, {
    title: "Fair Problem Test",
    questionCount: 3,
    difficulty: "Mixed"
  });
  const raceId = race.id || race.raceId;

  await service.joinRace(guest, raceId);

  const hostView = await service.getRace(host, raceId);
  const guestView = await service.getRace(guest, raceId);

  // Exact same problem order for all participants
  assert.equal(hostView.problems.length, 3);
  assert.equal(guestView.problems.length, 3);
  for (let i = 0; i < hostView.problems.length; i++) {
    assert.equal(hostView.problems[i].problemId, guestView.problems[i].problemId);
    assert.equal(hostView.problems[i].title, guestView.problems[i].title);
    // Ensure hidden test cases and internal solutions are NOT leaked in payload
    assert.equal(guestView.problems[i].testCases, undefined);
    assert.equal(guestView.problems[i].canonicalSolution, undefined);
  }
});

test("Module 10: Code Execution, Scoring Idempotency & Late Submission Prevention", async () => {
  const db = createTestDb();
  let fakeTime = new Date("2026-11-10T12:00:00.000Z");

  // We provide mock execution provider to test scoring deterministically
  const mockExecProvider = {
    execute: async ({ testCases, sourceCode }) => {
      const isCorrect = sourceCode.includes("RETURN_CORRECT");
      const stdout = (testCases || []).map(tc => `${TEST_DELIM_PREFIX}${tc.id}__:${isCorrect ? (tc.expectedOutput || 'true') : 'wrong_val'}\n`).join("");
      return {
        success: true,
        status: "completed",
        stdout,
        executionTimeMs: 15
      };
    }
  };

  const service = createCodingRaceArenaService({
    db,
    executionProvider: mockExecProvider,
    now: () => fakeTime
  });

  const host = { id: "user_host", name: "Host" };
  const race = await service.createRace(host, {
    title: "Execution Verification Arena",
    questionCount: 1,
    durationMinutes: 30
  });
  const raceId = race.id || race.raceId;

  await service.startRace(host, raceId);

  const raceDoc = await service.getRace(host, raceId);
  const targetProblem = raceDoc.problems[0];

  // 1. Run Sample Test (non-scoring)
  const sampleRes = await service.runSampleTest(host, raceId, {
    problemId: targetProblem.problemId,
    code: targetProblem.starterCode?.python3 || "def solution():\n    pass",
    language: "python3"
  });

  assert.equal(sampleRes.success, true);
  assert.ok(Array.isArray(sampleRes.results));

  // Verify non-scoring: participant score still 0
  const leadBefore = await service.getLeaderboard(host, raceId);
  assert.equal(leadBefore.standings[0].score, 0);

  // 2. Official Submission Attempt 1: Wrong Answer
  const wrongSub = await service.submitSolution(host, raceId, {
    problemId: targetProblem.problemId,
    code: "def solution():\n    return 'WRONG'",
    language: "python3"
  });

  assert.equal(wrongSub.isAccepted, false);
  assert.equal(wrongSub.verdict, "Wrong Answer");
  assert.equal(wrongSub.pointsAwarded, 0);

  // Attempt 2: Accepted Solution
  const correctSub = await service.submitSolution(host, raceId, {
    problemId: targetProblem.problemId,
    code: "def solution():\n    return 'RETURN_CORRECT'",
    language: "python3"
  });

  assert.equal(correctSub.isAccepted, true);
  assert.equal(correctSub.verdict, "Accepted");
  assert.ok(correctSub.pointsAwarded > 0, "Accepted solution must award positive points");
  const firstAward = correctSub.pointsAwarded;

  // Attempt 3: Idempotency Check — Resubmitting already solved problem awards 0 duplicate points
  const repeatSub = await service.submitSolution(host, raceId, {
    problemId: targetProblem.problemId,
    code: "def solution():\n    return 'RETURN_CORRECT'",
    language: "python3"
  });

  assert.equal(repeatSub.isAccepted, true);
  assert.equal(repeatSub.pointsAwarded, 0, "Resubmission must award 0 additional points");

  const finalLeaderboard = await service.getLeaderboard(host, raceId);
  assert.equal(finalLeaderboard.standings[0].score, firstAward, "Leaderboard score must not duplicate");
  assert.equal(finalLeaderboard.standings[0].solvedCount, 1);

  // 3. Server-Authoritative Clock: Rejects Late Submissions after endsAt
  fakeTime = new Date("2026-11-10T12:35:00.000Z"); // 35 minutes later (race ended at +30m)
  await assert.rejects(
    async () => service.submitSolution(host, raceId, {
      problemId: targetProblem.problemId,
      code: "def solution():\n    return 'RETURN_CORRECT'",
      language: "python3"
    }),
    /The race timer has expired/
  );
});

test("Module 10: Dense Competition Ranking & Standings Calculation", async () => {
  const db = createTestDb();
  const service = createCodingRaceArenaService({ db });

  // Standings calculation logic: Dense ranking (1, 1, 3 for ties)
  const participants = [
    { userId: "u1", name: "Alice", score: 250, totalTimeSeconds: 120 },
    { userId: "u2", name: "Bob", score: 350, totalTimeSeconds: 200 },
    { userId: "u3", name: "Charlie", score: 250, totalTimeSeconds: 120 }, // Tied with Alice
    { userId: "u4", name: "David", score: 100, totalTimeSeconds: 50 }
  ];

  const host = { id: "u2", name: "Bob" };
  const race = await service.createRace(host, { title: "Ranking Test" });
  const raceId = race.id || race.raceId;

  for (const p of participants) {
    if (p.userId !== "u2") {
      await db.collection("codingRaceParticipants").insertOne({
        raceId,
        userId: p.userId,
        name: p.name,
        score: p.score,
        totalTimeSeconds: p.totalTimeSeconds,
        solvedCount: 1
      });
    } else {
      await db.collection("codingRaceParticipants").updateOne(
        { raceId, userId: "u2" },
        { $set: { score: p.score, totalTimeSeconds: p.totalTimeSeconds, solvedCount: 1 } }
      );
    }
  }

  const leaderboard = await service.getLeaderboard(host, raceId);
  const standings = leaderboard.standings;

  // Bob is #1 (350 pts)
  assert.equal(standings[0].userId, "u2");
  assert.equal(standings[0].rank, 1);

  // Alice and Charlie tie for #2 (250 pts, 120s)
  assert.equal(standings[1].rank, 2);
  assert.equal(standings[2].rank, 2);

  // David is #4 (dense tie handling: next rank is 4)
  assert.equal(standings[3].userId, "u4");
  assert.equal(standings[3].rank, 4);
});

test("Module 10: Real-Time Event Broadcasting & SSE Subscriber Management", async () => {
  const service = createCodingRaceArenaService();

  const raceId = "race_broadcast_test";
  const messages = [];

  const mockRes = {
    write: (chunk) => {
      messages.push(chunk);
    }
  };

  // Add subscriber
  if (!service.sseSubscribers.has(raceId)) {
    service.sseSubscribers.set(raceId, new Set());
  }
  service.sseSubscribers.get(raceId).add(mockRes);

  // Broadcast event
  service.broadcastEvent(raceId, "race:test_event", { foo: "bar" });

  assert.equal(messages.length, 1);
  assert.ok(messages[0].includes("event: race:test_event"));
  assert.ok(messages[0].includes('"foo":"bar"'));

  // Clean up subscriber
  service.sseSubscribers.get(raceId).delete(mockRes);
});

test("Module 10: AI Race Coach Performance Analysis & Fallback", async () => {
  const db = createTestDb();
  const service = createCodingRaceArenaService({ db });

  const host = { id: "user_alice", name: "Alice" };
  const race = await service.createRace(host, { title: "Coach Analysis Test" });
  const raceId = race.id || race.raceId;

  // Complete race
  await service.completeRace(host, raceId);

  // Generate analysis without external AI provider (deterministic fallback)
  const analysis = await service.generateAiCoachAnalysis(host, raceId);

  assert.equal(analysis.success, true);
  assert.ok(analysis.performanceSummary);
  assert.ok(Array.isArray(analysis.strengths));
  assert.ok(Array.isArray(analysis.mistakeRetrospective));
  assert.ok(Array.isArray(analysis.actionablePlan));
});

test("Module 10: User Race Statistics & Achievement Awards", async () => {
  const db = createTestDb();
  const service = createCodingRaceArenaService({ db });

  const racer = { id: "user_champion", name: "Champion" };

  // 1. Initial stats are zeroed
  const initialStats = await service.getUserRaceStats(racer);
  assert.equal(initialStats.racesJoined, 0);
  assert.equal(initialStats.racesWon, 0);
  assert.equal(initialStats.podiumFinishes, 0);

  // 2. Add finished race records for racer
  await db.collection("codingRaces").insertOne({
    _id: "race_finished_1",
    id: "race_finished_1",
    mode: "quick",
    status: "completed",
    isRanked: true
  });

  await db.collection("codingRaceParticipants").insertOne({
    raceId: "race_finished_1",
    userId: racer.id,
    name: racer.name,
    score: 300,
    solvedCount: 2,
    rank: 1
  });

  await db.collection("codingRaceAchievements").insertOne({
    userId: racer.id,
    type: "race_winner",
    count: 1
  });

  const updatedStats = await service.getUserRaceStats(racer);
  assert.equal(updatedStats.racesJoined, 1);
  assert.equal(updatedStats.racesWon, 1);
  assert.equal(updatedStats.podiumFinishes, 1);
  assert.equal(updatedStats.problemsSolved, 2);
  assert.equal(updatedStats.totalScore, 300);
  assert.ok(updatedStats.achievements.length >= 1);
});
