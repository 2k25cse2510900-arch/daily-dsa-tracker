"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  LIBRARY_CONTENT_TYPES,
  LIBRARY_TOPICS,
  LIBRARY_DIFFICULTIES,
  LIBRARY_VISIBILITIES,
  createCommunityLibraryService
} = require("../community-library");

// Robust In-Memory Test DB Mock supporting Mongo queries used by service
function createTestDb() {
  const store = {
    libraryResources: new Map(),
    libraryBookmarks: new Map(),
    libraryCollections: new Map(),
    libraryReactions: new Map(),
    libraryReports: new Map(),
    libraryEditSuggestions: new Map(),
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
        const allMatch = val.every(subQ => matchesQuery(doc, subQ));
        if (!allMatch) return false;
        continue;
      }

      if (key === "$or" && Array.isArray(val)) {
        const anyMatch = val.some(subQ => matchesQuery(doc, subQ));
        if (!anyMatch) return false;
        continue;
      }

      const docVal = getDocVal(doc, key);

      if (val && typeof val === "object" && !(val instanceof RegExp)) {
        if ("$ne" in val) {
          if (docVal === val.$ne) return false;
        }
        if ("$in" in val && Array.isArray(val.$in)) {
          if (!val.$in.includes(docVal)) return false;
        }
        continue;
      }

      if (val instanceof RegExp) {
        if (Array.isArray(docVal)) {
          if (!docVal.some(item => val.test(String(item)))) return false;
        } else if (!val.test(String(docVal || ""))) {
          return false;
        }
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
        const inserted = { ...doc, _id };
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
      updateMany: async (query, update) => {
        let count = 0;
        for (const [id, doc] of map.entries()) {
          if (matchesQuery(doc, query)) {
            let updatedDoc = { ...doc };
            if (update.$set) {
              for (const [k, v] of Object.entries(update.$set)) {
                updatedDoc[k] = v;
              }
            }
            map.set(id, updatedDoc);
            count++;
          }
        }
        return { matchedCount: count, modifiedCount: count };
      },
      updateOne: async (query, update) => {
        for (const [id, doc] of map.entries()) {
          if (matchesQuery(doc, query)) {
            let updatedDoc = { ...doc };
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
      },
      deleteMany: async (query) => {
        let count = 0;
        for (const [id, doc] of Array.from(map.entries())) {
          if (matchesQuery(doc, query)) {
            map.delete(id);
            count++;
          }
        }
        return { deletedCount: count };
      }
    };
  };

  return {
    collection: (name) => wrap(name)
  };
}

// Mock AI Provider with generate method
function createMockAiProvider() {
  return {
    providerName: "Gemini",
    generate: async ({ prompt }) => {
      if (prompt.includes("Summarize")) {
        return {
          text: JSON.stringify({
            summary: "Comprehensive guide to binary search and invariants.",
            bulletPoints: [
              "Maintain search space invariant L <= R.",
              "Guard against integer overflow with L + (R - L) / 2.",
              "Optimal logarithmic O(log n) time complexity."
            ],
            keyTakeaway: "Boundary conditions define binary search correctness."
          })
        };
      }
      if (prompt.includes("Explain the core DSA concept")) {
        return {
          text: JSON.stringify({
            intuition: "Binary search is like opening a dictionary in the middle.",
            whyItWorks: "Monotonic order allows discarding half the candidates in O(1).",
            commonPitfalls: ["Infinite loops on L = mid", "Off-by-one boundary checks"]
          })
        };
      }
      if (prompt.includes("revision flashcard")) {
        return {
          text: JSON.stringify({
            points: [
              "What is the time complexity? O(log n).",
              "What is the space complexity? O(1) iterative.",
              "When does binary search apply? Monotonic search spaces."
            ]
          })
        };
      }
      if (prompt.includes("Review this educational note draft")) {
        return {
          text: JSON.stringify({
            readabilityScore: "Excellent",
            suggestedTitle: "Binary Search Mastery",
            strengths: ["Clear topic alignment", "Correct complexity"],
            suggestions: [{ area: "Intuition", recommendation: "Add diagram link" }],
            improvedSampleSnippet: "int mid = left + (right - left) / 2;"
          })
        };
      }
      return { text: "AI generated educational content." };
    }
  };
}

test("Taxonomy & Allowed Options Verification", () => {
  assert.ok(LIBRARY_CONTENT_TYPES.includes("concept-note"));
  assert.ok(LIBRARY_CONTENT_TYPES.includes("algorithm-summary"));
  assert.ok(LIBRARY_CONTENT_TYPES.includes("problem-note"));
  assert.ok(LIBRARY_CONTENT_TYPES.includes("code-snippet"));
  assert.ok(LIBRARY_CONTENT_TYPES.length >= 10);

  assert.ok(LIBRARY_TOPICS.includes("Arrays"));
  assert.ok(LIBRARY_TOPICS.includes("Graphs"));
  assert.ok(LIBRARY_TOPICS.includes("Dynamic Programming"));
  assert.ok(LIBRARY_TOPICS.includes("Binary Search"));

  assert.deepEqual(LIBRARY_DIFFICULTIES, ["Beginner", "Easy", "Medium", "Hard", "Advanced"]);
  assert.deepEqual(LIBRARY_VISIBILITIES, ["private", "group", "community", "public"]);
});

test("Resource Creation & Validation", async () => {
  const db = createTestDb();
  const service = createCommunityLibraryService({ db, provider: createMockAiProvider() });

  const alice = { id: "user_alice", name: "Alice", role: "member" };

  // Invalid title (< 3 chars)
  await assert.rejects(
    async () => {
      await service.createResource(alice, { title: "ab", content: "Valid content" });
    },
    /Title must be between 3 and 120 characters/
  );

  // Unauthenticated creation
  await assert.rejects(
    async () => {
      await service.createResource(null, { title: "Valid Title", content: "Content" });
    },
    /Authentication required/
  );

  // Valid creation with full taxonomy
  const created = await service.createResource(alice, {
    title: "Binary Search Deep Dive",
    description: "Clear explanation of binary search boundaries.",
    contentType: "algorithm-summary",
    topic: "Binary Search",
    difficulty: "Medium",
    visibility: "community",
    status: "published",
    content: "## Binary Search Invariant\\n\\nL <= R",
    codeSnippet: {
      code: "def binary_search(nums, target): return -1",
      language: "python"
    },
    complexity: {
      time: "O(log n)",
      space: "O(1)"
    },
    tags: ["Search", "Algorithms"],
    problemSlug: "binary-search"
  });

  assert.ok(created._id);
  assert.equal(created.title, "Binary Search Deep Dive");
  assert.equal(created.topic, "Binary Search");
  assert.equal(created.difficulty, "Medium");
  assert.equal(created.author.id, "user_alice");
  assert.equal(created.status, "published");
  assert.equal(created.helpfulCount, 0);
  assert.equal(created.bookmarkCount, 0);
  assert.equal(created.complexity.time, "O(log n)");
});

test("Multi-Tier Visibility & Access Control", async () => {
  const db = createTestDb();
  const service = createCommunityLibraryService({ db });

  const alice = { id: "user_alice", name: "Alice", role: "member" };
  const bob = { id: "user_bob", name: "Bob", role: "member" };
  const admin = { id: "user_admin", name: "Admin", role: "admin" };

  // 1. Private Resource
  const privateRes = await service.createResource(alice, {
    title: "Alice's Secret Notes",
    visibility: "private",
    content: "Private interview tips."
  });

  // Author can access
  const readByAuthor = await service.getResource(alice, privateRes._id);
  assert.equal(readByAuthor.title, "Alice's Secret Notes");

  // Other member cannot access
  await assert.rejects(
    async () => {
      await service.getResource(bob, privateRes._id);
    },
    /permission to view this resource/
  );

  // Admin can access
  const readByAdmin = await service.getResource(admin, privateRes._id);
  assert.equal(readByAdmin.title, "Alice's Secret Notes");

  // 2. Group Resource: Alice must be approved member to create group-scoped note
  await db.collection("groupMembers").insertOne({
    groupId: "group_graph_ninjas",
    userId: "user_alice",
    status: "approved"
  });

  const groupRes = await service.createResource(alice, {
    title: "Cohort Graph Algorithms",
    visibility: "group",
    groupId: "group_graph_ninjas",
    groupName: "Graph Ninjas",
    content: "Dijkstra & A* notes."
  });

  // Bob is NOT in group -> Access denied
  await assert.rejects(
    async () => {
      await service.getResource(bob, groupRes._id);
    },
    /permission to view this resource/
  );

  // Add Bob to group
  await db.collection("groupMembers").insertOne({
    groupId: "group_graph_ninjas",
    userId: "user_bob",
    status: "approved"
  });

  // Bob can now access
  const readByBob = await service.getResource(bob, groupRes._id);
  assert.equal(readByBob.title, "Cohort Graph Algorithms");

  // Revoke Bob's membership
  await db.collection("groupMembers").deleteOne({
    groupId: "group_graph_ninjas",
    userId: "user_bob"
  });

  // Bob denied again
  await assert.rejects(
    async () => {
      await service.getResource(bob, groupRes._id);
    },
    /permission to view this resource/
  );
});

test("Draft Preservation & Publishing Workflow", async () => {
  const db = createTestDb();
  const service = createCommunityLibraryService({ db });

  const alice = { id: "user_alice", name: "Alice", role: "member" };
  const bob = { id: "user_bob", name: "Bob", role: "member" };

  // Create Draft
  const draft = await service.createResource(alice, {
    title: "Unfinished Segment Trees",
    status: "draft",
    visibility: "community",
    content: "Work in progress..."
  });
  assert.equal(draft.status, "draft");

  // Bob cannot view draft
  await assert.rejects(
    async () => {
      await service.getResource(bob, draft._id);
    },
    /permission to view this resource/
  );

  // Alice publishes draft
  const published = await service.publishResource(alice, draft._id);
  assert.equal(published.status, "published");

  // Now Bob can view
  const readByBob = await service.getResource(bob, draft._id);
  assert.equal(readByBob.title, "Unfinished Segment Trees");

  // Archive
  const archived = await service.archiveResource(alice, draft._id);
  assert.equal(archived.status, "archived");
});

test("Update & Delete Ownership Enforcement", async () => {
  const db = createTestDb();
  const service = createCommunityLibraryService({ db });

  const alice = { id: "user_alice", name: "Alice", role: "member" };
  const bob = { id: "user_bob", name: "Bob", role: "member" };
  const admin = { id: "user_admin", name: "Admin", role: "admin" };

  const res = await service.createResource(alice, {
    title: "Dynamic Programming Knapsack",
    visibility: "community",
    content: "0/1 Knapsack tabular recurrence."
  });

  // Bob cannot update
  await assert.rejects(
    async () => {
      await service.updateResource(bob, res._id, { title: "Malicious Edit" });
    },
    /You can only edit resources that you created/
  );

  // Alice can update
  const updated = await service.updateResource(alice, res._id, {
    title: "0/1 Knapsack Tabular Mastery"
  });
  assert.equal(updated.title, "0/1 Knapsack Tabular Mastery");

  // Admin can update
  const adminEdit = await service.updateResource(admin, res._id, {
    difficulty: "Hard"
  });
  assert.equal(adminEdit.difficulty, "Hard");

  // Bob cannot delete
  await assert.rejects(
    async () => {
      await service.deleteResource(bob, res._id);
    },
    /You can only delete resources that you created/
  );

  // Alice can delete
  const delRes = await service.deleteResource(alice, res._id);
  assert.equal(delRes.success, true);
  assert.equal(delRes.deletedId, res._id);
});

test("Search, Filtering & Pagination", async () => {
  const db = createTestDb();
  const service = createCommunityLibraryService({ db });

  const alice = { id: "user_alice", name: "Alice", role: "member" };

  await service.createResource(alice, {
    title: "Graph Dijkstra Algorithm",
    topic: "Graphs",
    difficulty: "Medium",
    contentType: "algorithm-summary",
    visibility: "community",
    status: "published",
    content: "Shortest path in weighted graph."
  });

  await service.createResource(alice, {
    title: "Graph Bellman Ford Algorithm",
    topic: "Graphs",
    difficulty: "Hard",
    contentType: "algorithm-summary",
    visibility: "community",
    status: "published",
    content: "Detects negative cycles in graphs."
  });

  await service.createResource(alice, {
    title: "Trie Prefix Tree",
    topic: "Tries",
    difficulty: "Medium",
    contentType: "concept-note",
    visibility: "community",
    status: "published",
    content: "Fast prefix lookups."
  });

  // Search by text "Dijkstra"
  const search1 = await service.listResources(alice, { search: "Dijkstra" });
  assert.equal(search1.resources.length, 1);
  assert.equal(search1.resources[0].title, "Graph Dijkstra Algorithm");

  // Filter by topic "Graphs"
  const graphNotes = await service.listResources(alice, { topic: "Graphs" });
  assert.equal(graphNotes.resources.length, 2);

  // Filter by difficulty "Hard"
  const hardNotes = await service.listResources(alice, { difficulty: "Hard" });
  assert.equal(hardNotes.resources.length, 1);
  assert.equal(hardNotes.resources[0].title, "Graph Bellman Ford Algorithm");
});

test("Helpful Reaction Deduplication & Self-Reaction Prevention", async () => {
  const db = createTestDb();
  const service = createCommunityLibraryService({ db });

  const alice = { id: "user_alice", name: "Alice", role: "member" };
  const bob = { id: "user_bob", name: "Bob", role: "member" };

  const res = await service.createResource(alice, {
    title: "Two Pointers Patterns",
    visibility: "community",
    status: "published",
    content: "Left and right pointer convergence."
  });

  // Author cannot react to own resource
  await assert.rejects(
    async () => {
      await service.toggleReaction(alice, res._id, "helpful");
    },
    /You cannot mark your own resource as helpful/
  );

  // Bob adds helpful reaction
  const r1 = await service.toggleReaction(bob, res._id, "helpful");
  assert.equal(r1.reacted, true);
  assert.equal(r1.helpfulCount, 1);

  // Bob toggles reaction off
  const r2 = await service.toggleReaction(bob, res._id, "helpful");
  assert.equal(r2.reacted, false);
  assert.equal(r2.helpfulCount, 0);
});

test("Bookmarks & Personal Collections", async () => {
  const db = createTestDb();
  const service = createCommunityLibraryService({ db });

  const alice = { id: "user_alice", name: "Alice", role: "member" };
  const bob = { id: "user_bob", name: "Bob", role: "member" };

  const res = await service.createResource(alice, {
    title: "Sliding Window Maximum",
    visibility: "community",
    status: "published",
    content: "Monotonic deque solution."
  });

  // Bob bookmarks note
  const bm = await service.toggleBookmark(bob, res._id);
  assert.equal(bm.bookmarked, true);

  // List bookmarks
  const myBookmarks = await service.listBookmarks(bob);
  assert.equal(myBookmarks.bookmarks.length, 1);
  assert.equal(myBookmarks.bookmarks[0].resource.title, "Sliding Window Maximum");

  // Bob creates collection
  const col = await service.createCollection(bob, {
    name: "Queue & Deque Mastery",
    description: "All monotonic queue problems"
  });
  assert.ok(col._id);
  assert.equal(col.name, "Queue & Deque Mastery");

  // List collections
  const colList = await service.listCollections(bob);
  assert.equal(colList.length, 1);
  assert.equal(colList[0].name, "Queue & Deque Mastery");

  // Delete collection
  const delCol = await service.deleteCollection(bob, col._id);
  assert.equal(delCol.success, true);
  assert.equal(delCol.deletedId, col._id);
});

test("Suggested Edits Proposal & Acceptance", async () => {
  const db = createTestDb();
  const service = createCommunityLibraryService({ db });

  const alice = { id: "user_alice", name: "Alice", role: "member" };
  const bob = { id: "user_bob", name: "Bob", role: "member" };

  const res = await service.createResource(alice, {
    title: "Quicksort Partitioning",
    visibility: "community",
    status: "published",
    content: "Initial Lomuto partitioning notes."
  });

  // Bob proposes an edit
  const sug = await service.submitSuggestion(bob, res._id, {
    suggestedContent: "Improved Hoare partitioning with boundary analysis.",
    comment: "Added Hoare partition comparison."
  });
  assert.ok(sug._id);
  assert.equal(sug.status, "pending");

  // Alice accepts the suggestion
  const reviewed = await service.reviewSuggestion(alice, sug._id, {
    decision: "accepted",
    authorNote: "Great improvement, merged!"
  });
  assert.equal(reviewed.status, "accepted");

  // Verify resource content updated
  const updatedRes = await service.getResource(alice, res._id);
  assert.equal(updatedRes.content, "Improved Hoare partitioning with boundary analysis.");
  assert.equal(updatedRes.version, 2);
});

test("Content Moderation Reporting & Resolution", async () => {
  const db = createTestDb();
  const service = createCommunityLibraryService({ db });

  const badUser = { id: "user_bad", name: "Spammer", role: "member" };
  const goodUser = { id: "user_good", name: "GoodUser", role: "member" };
  const admin = { id: "user_admin", name: "Admin", role: "admin" };

  const spamRes = await service.createResource(badUser, {
    title: "Promotional Spam Links",
    visibility: "community",
    status: "published",
    content: "Visit spam site for answers!"
  });

  // Report resource
  const report = await service.submitReport(goodUser, spamRes._id, {
    reason: "spam",
    details: "Commercial external links."
  });
  assert.ok(report.reportId);
  assert.equal(report.success, true);

  // Admin lists reports
  const reportList = await service.listReports(admin);
  assert.equal(reportList.length, 1);
  assert.equal(reportList[0].reason, "spam");

  // Admin resolves report and hides resource
  const resolved = await service.resolveReport(admin, reportList[0]._id, {
    decision: "resolved",
    hideResource: true,
    resolutionNote: "Confirmed spam and hidden."
  });
  assert.equal(resolved.status, "resolved");
  const hiddenDoc = await db.collection("libraryResources").findOne({ _id: spamRes._id });
  assert.equal(hiddenDoc.moderationStatus, "hidden");

  // Hidden resource is omitted from community search
  const browseList = await service.listResources(goodUser);
  assert.equal(browseList.resources.length, 0);
});

test("Educational AI Assistant Features", async () => {
  const db = createTestDb();
  const mockProvider = createMockAiProvider();
  const service = createCommunityLibraryService({ db, provider: mockProvider });

  const alice = { id: "user_alice", name: "Alice", role: "member" };

  const res = await service.createResource(alice, {
    title: "Binary Search Mastery",
    topic: "Binary Search",
    difficulty: "Medium",
    visibility: "community",
    status: "published",
    content: "Detailed binary search invariants..."
  });

  // AI Summarize
  const summary = await service.summarizeResource(alice, res._id);
  assert.ok(summary.success);
  assert.equal(summary.bulletPoints.length, 3);
  assert.ok(summary.bulletPoints[0].includes("invariant"));

  // AI Explain Concept
  const explain = await service.explainConcept(alice, res._id);
  assert.ok(explain.intuition);
  assert.ok(explain.intuition.includes("dictionary"));

  // AI Revision Points
  const revision = await service.generateRevisionPoints(alice, res._id);
  assert.ok(Array.isArray(revision.points));
  assert.equal(revision.points.length, 3);

  // AI Polish Draft
  const polished = await service.improveDraftClarity(alice, {
    title: "Binary Search",
    content: "binary search note draft content"
  });
  assert.ok(polished.success);
  assert.equal(polished.readabilityScore, "Excellent");
  assert.ok(Array.isArray(polished.suggestions));
});
