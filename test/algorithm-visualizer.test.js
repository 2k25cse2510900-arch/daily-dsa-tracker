"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ALGORITHM_CATEGORIES,
  ALGORITHM_REGISTRY,
  listRegisteredAlgorithms,
  getAlgorithmDetails,
  generateAlgorithmSteps,
  compareAlgorithms,
  validateAiVisualizationSteps,
  generateDryRunTrace
} = require("../algorithm-visualizer-engine");

const { createAlgorithmVisualizerService } = require("../algorithm-visualizer");
const { createAlgorithmVisualizerRouter } = require("../algorithm-visualizer-routes");

// In-Memory Test DB
function createTestDb() {
  const store = {
    aiAlgorithmVisualizations: new Map()
  };

  const wrap = (map) => ({
    insertOne: async (doc) => {
      const _id = doc._id || "vis_" + Math.random().toString(36).substring(2, 9);
      const inserted = { ...doc, _id };
      map.set(String(_id), inserted);
      return { insertedId: _id, acknowledged: true };
    },
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
            return arr.slice(0, lim);
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
    deleteOne: async (query) => {
      for (const [key, doc] of map.entries()) {
        let match = true;
        for (const [k, v] of Object.entries(query)) {
          if (doc[k] !== v) { match = false; break; }
        }
        if (match) {
          map.delete(key);
          return { deletedCount: 1 };
        }
      }
      return { deletedCount: 0 };
    }
  });

  return {
    collection: (name) => {
      if (!store[name]) store[name] = new Map();
      return wrap(store[name]);
    }
  };
}

function createMockProvider() {
  return {
    providerName: "gemini",
    model: "gemini-3.5-flash-lite",
    async generate({ prompt }) {
      return {
        text: JSON.stringify({
          detectedAlgorithm: "Two Sum AI Visualizer",
          category: "Hashing",
          totalSteps: 3,
          steps: [
            {
              stepIndex: 0,
              lineExecuted: 1,
              operation: "pointer_move",
              explanation: "Initialize seen map.",
              variables: { seen: {} },
              state: { array: [2, 7, 11, 15], variables: { seen: {} } }
            },
            {
              stepIndex: 1,
              lineExecuted: 2,
              operation: "hash_lookup",
              explanation: "Check complement in map.",
              variables: { i: 0, n: 2, comp: 7 },
              state: { array: [2, 7, 11, 15], hashTable: { 2: 0 } }
            },
            {
              stepIndex: 2,
              lineExecuted: 3,
              operation: "complete",
              explanation: "Found target pair indices.",
              variables: { result: [0, 1] },
              state: { array: [2, 7, 11, 15], found: [0, 1] }
            }
          ]
        }),
        model: "gemini-3.5-flash-lite"
      };
    }
  };
}

/* ==========================================================================
   TEST SUITE: Module 8 — AI Algorithm Visualizer
   ========================================================================== */

test("Module 8 Engine: Registry has 20 algorithms spanning all 12 categories", () => {
  const algos = listRegisteredAlgorithms();
  assert.equal(algos.length, 20, "Must register exactly 20 core algorithms");

  const categories = new Set(algos.map(a => a.category));
  for (const cat of ALGORITHM_CATEGORIES) {
    assert.ok(categories.has(cat), `Category '${cat}' must be present in registered algorithms`);
  }

  for (const algo of algos) {
    assert.ok(algo.id, "Algorithm must have an id");
    assert.ok(algo.name || algo.title, "Algorithm must have a name or title");
    assert.ok(algo.category, "Algorithm must have a category");
    assert.ok(algo.timeComplexity, "Algorithm must have a time complexity");
    assert.ok(algo.spaceComplexity, "Algorithm must have a space complexity");
    assert.ok(Array.isArray(algo.pseudocode) && algo.pseudocode.length > 0, "Algorithm must have pseudocode lines");
    assert.ok(algo.defaultInput, "Algorithm must have a default input");
  }
});

test("Module 8 Engine: getAlgorithmDetails resolves by id, slug, or title", () => {
  const byId = getAlgorithmDetails("binary-search");
  assert.ok(byId);
  assert.equal(byId.title, "Binary Search");

  const bySlug = getAlgorithmDetails("two-sum");
  assert.ok(bySlug);
  assert.equal(bySlug.category, "Hashing");

  const byTitle = getAlgorithmDetails("Bubble Sort");
  assert.ok(byTitle);
  assert.equal(byTitle.id, "bubble-sort");

  const unknown = getAlgorithmDetails("non-existent-algo");
  assert.equal(unknown, null);
});

test("Module 8 Engine: Step generation for searching & sorting algorithms", () => {
  // Binary Search
  const bs = generateAlgorithmSteps("binary-search");
  assert.ok(bs.steps.length > 3, "Binary search should generate steps");
  assert.ok(bs.steps.some(s => (s.pointers && s.pointers.mid !== undefined) || (s.state?.pointers && s.state?.pointers.mid !== undefined)), "Binary search must track mid pointer");
  assert.equal(bs.steps[bs.steps.length - 1].operation, "complete", "Default binary search target completion");
  assert.equal(bs.result, 3, "Target found at index 3");

  // Linear Search
  const ls = generateAlgorithmSteps("linear-search");
  assert.ok(ls.steps.length > 1);
  assert.equal(ls.steps[ls.steps.length - 1].operation, "complete");

  // Bubble Sort
  const bubble = generateAlgorithmSteps("bubble-sort");
  assert.ok(bubble.steps.length > 5);
  assert.ok(bubble.steps.some(s => s.operation === "swap" || s.operation === "compare"));
  assert.ok(bubble.steps[bubble.steps.length - 1].operation === "complete");

  // Quick Sort
  const quick = generateAlgorithmSteps("quick-sort");
  assert.ok(quick.steps.length > 5);
  assert.ok(quick.steps.some(s => (s.pointers && s.pointers.pivot !== undefined) || (s.state?.pointers && s.state?.pointers.pivot !== undefined)));

  // Merge Sort
  const merge = generateAlgorithmSteps("merge-sort");
  assert.ok(merge.steps.length > 5);

  // Insertion Sort
  const insertion = generateAlgorithmSteps("insertion-sort");
  assert.ok(insertion.steps.length > 5);

  // Selection Sort
  const selection = generateAlgorithmSteps("selection-sort");
  assert.ok(selection.steps.length > 5);
});

test("Module 8 Engine: Step generation for hashing, two pointers, sliding window, prefix sum", () => {
  // Two Sum
  const ts = generateAlgorithmSteps("two-sum");
  assert.ok(ts.steps.length > 2);
  assert.ok(ts.steps.some(s => (s.hashTable && Object.keys(s.hashTable).length > 0) || (s.state?.hashMap && Object.keys(s.state?.hashMap).length > 0)));
  assert.equal(ts.steps[ts.steps.length - 1].operation, "complete");

  // Two Pointers
  const pal = generateAlgorithmSteps("two-pointers");
  assert.ok(pal.steps.length > 2);
  assert.ok(pal.steps.some(s => (s.pointers && (s.pointers.left !== undefined || s.pointers.L !== undefined)) || (s.variables && s.variables.left !== undefined)));

  // Trapping Rain Water
  const trap = generateAlgorithmSteps("trapping-rain-water");
  assert.ok(trap.steps.length > 3);

  // Sliding Window
  const swm = generateAlgorithmSteps("sliding-window");
  assert.ok(swm.steps.length > 2);

  // Prefix Sum
  const ps = generateAlgorithmSteps("prefix-sum");
  assert.ok(ps.steps.length > 2);
});

test("Module 8 Engine: Step generation for stacks, queues, linked lists, trees, graphs, DP", () => {
  // Valid Parentheses / Stack operations
  const vp = generateAlgorithmSteps("valid-parentheses");
  assert.ok(vp.steps.length > 2);
  assert.ok(vp.steps.some(s => Array.isArray(s.stack) || Array.isArray(s.state?.stack)));

  // Queue BFS / Queue operations
  const qbfs = generateAlgorithmSteps("queue-bfs");
  assert.ok(qbfs.steps.length > 2);
  assert.ok(qbfs.steps.some(s => Array.isArray(s.queue) || Array.isArray(s.state?.queue)));

  // Reverse Linked List
  const rll = generateAlgorithmSteps("reverse-linked-list");
  assert.ok(rll.steps.length > 2);

  // Invert Binary Tree / Tree traversal
  const ibt = generateAlgorithmSteps("invert-binary-tree");
  assert.ok(ibt.steps.length > 2);

  // Graph BFS & DFS
  const gbfs = generateAlgorithmSteps("graph-bfs");
  assert.ok(gbfs.steps.length > 2);
  const gdfs = generateAlgorithmSteps("graph-dfs");
  assert.ok(gdfs.steps.length > 2);

  // Dynamic Programming (Climbing Stairs)
  const cs = generateAlgorithmSteps("climbing-stairs");
  assert.ok(cs.steps.length > 2);
});

test("Module 8 Engine: Custom inputs with boundary conditions", () => {
  // Custom array for Bubble Sort
  const customArr = [99, 12, 45, 1];
  const customSort = generateAlgorithmSteps("bubble-sort", { arr: customArr });
  assert.deepEqual(customSort.steps[0].array || customSort.steps[0].state?.array, customArr);
  assert.deepEqual(customSort.steps[customSort.steps.length - 1].array || customSort.steps[customSort.steps.length - 1].state?.array, [1, 12, 45, 99]);

  // Target not found in Binary Search
  const notFound = generateAlgorithmSteps("binary-search", { arr: [1, 3, 5, 7], target: 4 });
  assert.equal(notFound.steps[notFound.steps.length - 1].operation, "complete");
  assert.equal(notFound.result, -1, "Result should be -1 when not found");
});

test("Module 8 Engine: Head-to-Head Algorithm Comparison", () => {
  const comp = compareAlgorithms("bubble-sort", "quick-sort");
  assert.ok(comp);
  assert.equal(comp.algo1.name, "Bubble Sort");
  assert.equal(comp.algo2.name, "Quick Sort");
  assert.equal(comp.timeComparison.best, "Bubble Sort: O(N) vs Quick Sort: O(N log N)");
  assert.equal(comp.spaceComparison.algo1, "O(1)");
  assert.equal(comp.spaceComparison.algo2, "O(log N)");
  assert.ok(comp.recommendation);
});

test("Module 8 Engine: Dry Run Trace Generator", () => {
  const trace = generateDryRunTrace("binary-search");
  assert.ok(trace);
  assert.ok(trace.codeLines.length > 0);
  assert.ok(trace.steps.length > 0);
  assert.ok(trace.steps[0].line);
  assert.ok(trace.steps[0].conditionEval);
  assert.ok(trace.steps[0].variables);
});

test("Module 8 Engine: Schema Validation for AI Generated Visualizations", () => {
  // Valid payload
  const valid = validateAiVisualizationSteps({
    steps: [
      { stepIndex: 0, lineExecuted: 1, operation: "pointer_move", explanation: "Start" },
      { stepIndex: 1, lineExecuted: 2, operation: "compare", explanation: "Check" }
    ]
  });
  assert.equal(valid.valid, true);

  // Reject missing steps
  const noSteps = validateAiVisualizationSteps({});
  assert.equal(noSteps.valid, false);

  // Reject > 40 steps
  const tooManySteps = [];
  for (let i = 0; i < 45; i++) {
    tooManySteps.push({ stepIndex: i, operation: "pointer_move", explanation: "Step " + i });
  }
  const overLimit = validateAiVisualizationSteps({ steps: tooManySteps });
  assert.equal(overLimit.valid, false);
  assert.ok(overLimit.error.includes("40 steps"));
});

test("Module 8 Service & Persistence: MongoDB & Gemini integration", async () => {
  const db = createTestDb();
  const provider = createMockProvider();
  const service = createAlgorithmVisualizerService({ db, provider });

  // List algorithms
  const algos = await service.listAlgorithms();
  assert.equal(algos.length, 20);

  // Generate steps
  const res = await service.generateCustomSteps("two-sum");
  assert.equal(res.algorithmId, "two-sum");
  assert.ok(res.steps.length > 0);

  // AI Code analysis
  const aiRes = await service.analyzeAndVisualizeCode({
    code: "def twoSum(nums, target): return [0, 1]",
    language: "python",
    userId: "test_member_1"
  });
  assert.equal(aiRes.success, true);
  assert.equal(aiRes.isAiGenerated, true);
  assert.equal(aiRes.steps.length, 3);

  // Save history
  const saved = await service.saveVisualizationHistory({
    userId: "test_member_1",
    title: "My Custom Two Sum",
    algorithmId: "two-sum",
    initialInput: { arr: [2, 7, 11, 15], target: 9 },
    totalSteps: aiRes.steps.length,
    steps: aiRes.steps
  });
  assert.ok(saved.id);

  // List history
  const history = await service.listUserHistory("test_member_1");
  assert.equal(history.length, 1);
  assert.equal(history[0].title, "My Custom Two Sum");

  // Delete history
  const del = await service.deleteUserHistory("test_member_1", saved.id);
  assert.equal(del.success, true);
  const afterDelete = await service.listUserHistory("test_member_1");
  assert.equal(afterDelete.length, 0);
});

test("Module 8 REST API Router: Endpoints, security and rate limits", async () => {
  const db = createTestDb();
  const provider = createMockProvider();
  const service = createAlgorithmVisualizerService({ db, provider });

  let auditCalled = false;
  const mockAudit = () => { auditCalled = true; };

  const memberOnly = (req, res, next) => {
    if (req.user && req.user.role === "member") next();
    else res.status(403).json({ error: "Member authentication required." });
  };

  const router = createAlgorithmVisualizerRouter({
    memberOnly,
    serviceFor: () => service,
    analysisRateLimit: (req, res, next) => next(),
    audit: mockAudit
  });

  // Helper to execute router with fake req/res
  function executeRoute(method, url, { body = {}, query = {}, user = null } = {}) {
    return new Promise((resolve) => {
      let statusCode = 200;
      let headers = {};
      let responseBody = null;

      const req = {
        method,
        url,
        body,
        query,
        user,
        member: user,
        params: {}
      };

      const res = {
        status(c) { statusCode = c; return this; },
        setHeader(k, v) { headers[k] = v; return this; },
        json(data) { responseBody = data; resolve({ status: statusCode, body: responseBody }); },
        send(data) { responseBody = data; resolve({ status: statusCode, body: responseBody }); }
      };

      router.handle(req, res, () => {
        resolve({ status: 404, body: { error: "Route not matched" } });
      });
    });
  }

  // 1. GET /algorithms
  const algosRes = await executeRoute("GET", "/algorithms");
  assert.equal(algosRes.status, 200);
  assert.equal(algosRes.body.count, 20);

  // 2. GET /algorithms/binary-search
  const algoRes = await executeRoute("GET", "/algorithms/binary-search");
  assert.equal(algoRes.status, 200);
  assert.equal(algoRes.body.algorithm.id, "binary-search");

  // 3. POST /generate
  const genRes = await executeRoute("POST", "/generate", { body: { algorithmId: "binary-search" } });
  assert.equal(genRes.status, 200);
  assert.ok(genRes.body.steps.length > 0);

  // 4. POST /compare
  const compRes = await executeRoute("POST", "/compare", { body: { algo1Id: "bubble-sort", algo2Id: "quick-sort" } });
  assert.equal(compRes.status, 200);
  assert.ok(compRes.body.comparison);

  // 5. POST /dry-run
  const dryRes = await executeRoute("POST", "/dry-run", { body: { algorithmId: "binary-search" } });
  assert.equal(dryRes.status, 200);
  assert.ok(dryRes.body.dryRun);

  // 6. POST /analyze-code without auth -> 403
  const unauthRes = await executeRoute("POST", "/analyze-code", {
    body: { code: "def f(): pass", language: "python" }
  });
  assert.equal(unauthRes.status, 403);

  // 7. POST /analyze-code with member auth -> 200
  const authRes = await executeRoute("POST", "/analyze-code", {
    body: { code: "def twoSum(): pass", language: "python" },
    user: { id: "member_abc", role: "member" }
  });
  assert.equal(authRes.status, 200);
  assert.equal(authRes.body.isAiGenerated, true);
});
