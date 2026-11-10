"use strict";

/**
 * DSAverse — Module 6: Personalized Learning & Adaptive DSA Coach Engine
 *
 * Responsibilities:
 * 1. Extensible DSA Concept Taxonomy & Pattern Mapping.
 * 2. Multi-Signal Concept Mastery Estimation (Not Started -> Strong).
 * 3. Recurring Mistake Aggregation & Retrospective Diagnostics.
 * 4. Adaptive Spaced-Repetition Revision Scheduler.
 * 5. Explainable Recommendation Engine Grounded in Actual Activity Evidence.
 * 6. AI Guided Teaching & Progressive Hint Generation (Hints 1-3 & Full Walkthrough).
 */

const CONCEPT_TAXONOMY = {
  "arrays-hashing": {
    id: "arrays-hashing",
    title: "Arrays & Hashing",
    category: "Foundation",
    order: 1,
    prerequisites: [],
    description: "Frequency counters, hash maps, hash sets, and basic array indexing.",
    keywords: ["array", "hash", "frequency", "map", "set", "two sum", "contains duplicate", "anagram", "hashing"]
  },
  "two-pointers": {
    id: "two-pointers",
    title: "Two Pointers",
    category: "Linear Patterns",
    order: 2,
    prerequisites: ["arrays-hashing"],
    description: "Opposite-end converging pointers, collision pointers, and in-place partitions.",
    keywords: ["two pointer", "two-pointer", "opposite pointer", "in-place", "collision", "palindrome", "three sum", "sorted two sum"]
  },
  "sliding-window": {
    id: "sliding-window",
    title: "Sliding Window",
    category: "Linear Patterns",
    order: 3,
    prerequisites: ["two-pointers", "arrays-hashing"],
    description: "Dynamic contiguous subarray/substring tracking with window expansion and contraction.",
    keywords: ["sliding window", "window", "longest substring", "contiguous", "subarray", "at most k", "minimum window"]
  },
  "prefix-sum": {
    id: "prefix-sum",
    title: "Prefix Sum",
    category: "Linear Patterns",
    order: 4,
    prerequisites: ["arrays-hashing"],
    description: "Running cumulative totals for O(1) range sum queries and subarray sum invariants.",
    keywords: ["prefix sum", "prefix", "running sum", "range sum", "difference array", "subarray sum"]
  },
  "binary-search": {
    id: "binary-search",
    title: "Binary Search",
    category: "Divide & Conquer",
    order: 5,
    prerequisites: ["arrays-hashing"],
    description: "Logarithmic interval reduction on monotonically sorted search spaces.",
    keywords: ["binary search", "logarithmic", "bisect", "sorted array", "middle pointer", "upper bound", "lower bound"]
  },
  "binary-search-on-answer": {
    id: "binary-search-on-answer",
    title: "Binary Search on Answer Space",
    category: "Divide & Conquer",
    order: 6,
    prerequisites: ["binary-search"],
    description: "Applying monotonicity over candidate answer values with feasibility predicates.",
    keywords: ["binary search on answer", "koko", "eating bananas", "ship packages", "capacity", "feasibility predicate", "monotonic predicate"]
  },
  "linked-lists": {
    id: "linked-lists",
    title: "Linked Lists",
    category: "Linear Data Structures",
    order: 7,
    prerequisites: ["arrays-hashing"],
    description: "Singly and doubly linked nodes, fast/slow pointer cycle detection, in-place reversal.",
    keywords: ["linked list", "list node", "dummy head", "sentinel", "fast and slow", "cycle detection", "reverse list"]
  },
  "recursion": {
    id: "recursion",
    title: "Recursion & Divide and Conquer",
    category: "Foundation",
    order: 8,
    prerequisites: [],
    description: "Self-referential function calls with base cases and inductive subproblem breakdown.",
    keywords: ["recursion", "recursive", "base case", "divide and conquer", "call stack"]
  },
  "trees": {
    id: "trees",
    title: "Trees & Binary Search Trees",
    category: "Hierarchical Structures",
    order: 9,
    prerequisites: ["recursion"],
    description: "Binary search tree invariants, tree traversals (DFS/BFS), and recursive subtree processing.",
    keywords: ["tree", "binary tree", "bst", "inorder", "preorder", "postorder", "lowest common ancestor", "tree depth"]
  },
  "dfs-bfs": {
    id: "dfs-bfs",
    title: "DFS / BFS Graph Traversal",
    category: "Non-Linear Patterns",
    order: 10,
    prerequisites: ["recursion", "trees"],
    description: "Depth-first recursive exploration, breadth-first queue level-order search, grid flood-fill.",
    keywords: ["dfs", "bfs", "depth first", "breadth first", "graph", "grid", "number of islands", "flood fill", "shortest path"]
  },
  "dynamic-programming": {
    id: "dynamic-programming",
    title: "Dynamic Programming",
    category: "Optimization",
    order: 11,
    prerequisites: ["recursion", "arrays-hashing"],
    description: "Overlapping subproblems, optimal substructure, memoization, and state-transition equations.",
    keywords: ["dynamic programming", "dp", "memoization", "tabulation", "climbing stairs", "house robber", "coin change", "knapsack", "subsequence"]
  },
  "monotonic-stack": {
    id: "monotonic-stack",
    title: "Monotonic Stack",
    category: "Specialized Structures",
    order: 12,
    prerequisites: ["arrays-hashing"],
    description: "Strictly increasing or decreasing stacks to find next greater or previous smaller elements in linear time.",
    keywords: ["monotonic stack", "daily temperatures", "next greater element", "histogram", "stock span", "decreasing stack"]
  },
  "heaps-priority-queues": {
    id: "heaps-priority-queues",
    title: "Heaps & Priority Queues",
    category: "Specialized Structures",
    order: 13,
    prerequisites: ["trees"],
    description: "Min-heaps and max-heaps for constant-time minimum/maximum access and top-K elements.",
    keywords: ["heap", "priority queue", "min heap", "max heap", "kth largest", "top k", "merge k sorted"]
  },
  "backtracking": {
    id: "backtracking",
    title: "Backtracking",
    category: "Exhaustive Search",
    order: 14,
    prerequisites: ["recursion"],
    description: "Systematic state exploration with decision branch pruning, subsets, and permutations.",
    keywords: ["backtracking", "permutations", "combinations", "subsets", "n-queens", "sudoku", "word search"]
  },
  "greedy": {
    id: "greedy",
    title: "Greedy Algorithms",
    category: "Optimization",
    order: 15,
    prerequisites: ["arrays-hashing"],
    description: "Making locally optimal choices at each step to reach a global optimum.",
    keywords: ["greedy", "local optimum", "interval scheduling", "gas station", "jump game"]
  }
};

const MASTERY_LEVELS = {
  NOT_STARTED: "Not Started",
  LEARNING: "Learning",
  DEVELOPING: "Developing",
  PROFICIENT: "Proficient",
  STRONG: "Strong"
};

const REVISION_INTERVALS_DAYS = [1, 3, 7, 14, 30];

/**
 * Normalizes text for keyword matching.
 */
function normalizeText(str) {
  return String(str || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Detects relevant concept IDs from problem metadata, review tags, or code snippets.
 */
function detectConceptsForProblem({ problemTitle = "", problemSlug = "", tags = [], analysisConcepts = [], codeText = "" } = {}) {
  const detected = new Set();
  const searchBag = [
    normalizeText(problemTitle),
    normalizeText(problemSlug),
    ...tags.map(t => normalizeText(t)),
    ...analysisConcepts.map(c => normalizeText(c))
  ].join(" ");

  for (const [conceptId, conceptMeta] of Object.entries(CONCEPT_TAXONOMY)) {
    // Check keywords
    const matchesKeyword = conceptMeta.keywords.some(kw => searchBag.includes(kw));
    if (matchesKeyword) {
      detected.add(conceptId);
    }
  }

  // Fallback heuristic based on common problem slugs if nothing hit
  if (detected.size === 0) {
    if (searchBag.includes("sum") || searchBag.includes("array") || searchBag.includes("duplicate")) {
      detected.add("arrays-hashing");
    } else {
      detected.add("arrays-hashing");
    }
  }

  return Array.from(detected);
}

/**
 * Categorizes mistake diagnoses into standardized buckets.
 */
function normalizeMistakeCategory(title = "", detail = "") {
  const text = `${title} ${detail}`.toLowerCase();
  if (text.includes("boundary") || text.includes("out of bound") || text.includes("index") || text.includes("off-by-one") || text.includes("off by one") || text.includes("overflow")) {
    return "boundary-condition";
  }
  if (text.includes("time limit") || text.includes("tle") || text.includes("exponential") || text.includes("quadratic") || text.includes("nested loop") || text.includes("time complexity")) {
    return "time-complexity";
  }
  if (text.includes("memory") || text.includes("space limit") || text.includes("space complexity") || text.includes("heap out")) {
    return "space-complexity";
  }
  if (text.includes("null") || text.includes("undefined") || text.includes("pointer") || text.includes("dereference")) {
    return "null-pointer";
  }
  if (text.includes("infinite") || text.includes("never terminates") || text.includes("cycle")) {
    return "infinite-loop";
  }
  if (text.includes("algorithm") || text.includes("wrong approach") || text.includes("greedy fail") || text.includes("suboptimal approach")) {
    return "algorithm-selection";
  }
  if (text.includes("compil") || text.includes("syntax") || text.includes("type error")) {
    return "syntax-compilation";
  }
  return "algorithmic-logic";
}

/**
 * Calculates concept mastery across the taxonomy.
 */
function calculateConceptMastery({ reviews = [], executions = [], submissions = [], now = new Date() }) {
  const masteryMap = {};
  const currentTime = now instanceof Date ? now.getTime() : new Date(now).getTime();

  // Initialize all concepts
  for (const [id, meta] of Object.entries(CONCEPT_TAXONOMY)) {
    masteryMap[id] = {
      id,
      title: meta.title,
      category: meta.category,
      order: meta.order,
      prerequisites: meta.prerequisites,
      description: meta.description,
      attemptedProblemSlugs: new Set(),
      solvedProblemSlugs: new Set(),
      executionsCount: 0,
      executionsPassed: 0,
      mistakesCount: 0,
      lastActivityTime: 0,
      score: 0,
      level: MASTERY_LEVELS.NOT_STARTED,
      rationale: "No recorded activity yet for this concept."
    };
  }

  // 1. Process Reviews
  for (const review of reviews) {
    const pSlug = review.problemSlug || "unknown";
    const pTitle = review.problemTitle || "";
    const analysisConcepts = review.analysis?.concepts || [];
    const concepts = detectConceptsForProblem({ problemTitle: pTitle, problemSlug: pSlug, analysisConcepts });
    const reviewTime = review.createdAt ? new Date(review.createdAt).getTime() : 0;
    const isAccepted = review.analysis?.correctnessStatus === "correct" || !review.analysis?.mistakeDiagnosis?.hasMistake;
    const hasMistake = Boolean(review.analysis?.mistakeDiagnosis?.hasMistake);

    for (const cId of concepts) {
      if (!masteryMap[cId]) continue;
      masteryMap[cId].attemptedProblemSlugs.add(pSlug);
      if (isAccepted) {
        masteryMap[cId].solvedProblemSlugs.add(pSlug);
      }
      if (hasMistake) {
        masteryMap[cId].mistakesCount += 1;
      }
      if (reviewTime > masteryMap[cId].lastActivityTime) {
        masteryMap[cId].lastActivityTime = reviewTime;
      }
    }
  }

  // 2. Process Executions
  for (const exec of executions) {
    const pSlug = exec.problemSlug || "unknown";
    const concepts = detectConceptsForProblem({ problemSlug: pSlug });
    const execTime = exec.createdAt ? new Date(exec.createdAt).getTime() : 0;
    const isPassed = exec.status === "passed";

    for (const cId of concepts) {
      if (!masteryMap[cId]) continue;
      masteryMap[cId].executionsCount += 1;
      if (isPassed) {
        masteryMap[cId].executionsPassed += 1;
        masteryMap[cId].solvedProblemSlugs.add(pSlug);
      }
      if (execTime > masteryMap[cId].lastActivityTime) {
        masteryMap[cId].lastActivityTime = execTime;
      }
    }
  }

  // 3. Process Submissions
  for (const sub of submissions) {
    const pSlug = sub.problemSlug || "unknown";
    const pTitle = sub.problemTitle || "";
    const concepts = detectConceptsForProblem({ problemTitle: pTitle, problemSlug: pSlug });
    const subTime = sub.submittedAt ? new Date(sub.submittedAt).getTime() : 0;
    const isAccepted = sub.verdict === "Accepted" || sub.statusDisplay === "Accepted";

    for (const cId of concepts) {
      if (!masteryMap[cId]) continue;
      masteryMap[cId].attemptedProblemSlugs.add(pSlug);
      if (isAccepted) {
        masteryMap[cId].solvedProblemSlugs.add(pSlug);
      }
      if (subTime > masteryMap[cId].lastActivityTime) {
        masteryMap[cId].lastActivityTime = subTime;
      }
    }
  }

  // 4. Compute Scores & Levels
  const result = {};
  for (const [id, item] of Object.entries(masteryMap)) {
    const attempts = item.attemptedProblemSlugs.size;
    const solved = item.solvedProblemSlugs.size;
    const execCount = item.executionsCount;
    const execPassRate = execCount > 0 ? (item.executionsPassed / execCount) : (attempts > 0 && solved > 0 ? 1 : 0);
    const mistakes = item.mistakesCount;

    if (attempts === 0 && execCount === 0) {
      result[id] = {
        id,
        title: item.title,
        category: item.category,
        order: item.order,
        prerequisites: item.prerequisites,
        description: item.description,
        level: MASTERY_LEVELS.NOT_STARTED,
        score: 0,
        attemptsCount: 0,
        solvedCount: 0,
        executionPassRate: 0,
        mistakesCount: 0,
        lastPracticed: null,
        daysSinceLastPractice: null,
        rationale: "Not started yet. Begin practicing problems with this pattern to unlock mastery."
      };
      continue;
    }

    // Volume points: up to 30 pts (10 pts per distinct problem solved/attempted up to 3)
    const volumePoints = Math.min(30, attempts * 10);

    // Accuracy points: up to 35 pts (solved / attempts ratio * 35)
    const accuracyRatio = attempts > 0 ? (solved / attempts) : 0;
    const accuracyPoints = Math.round(accuracyRatio * 35);

    // Execution verification points: up to 25 pts
    const execPoints = Math.round(execPassRate * 25);

    // Mistake penalty: 5 pts per recorded mistake, capped at 20
    const mistakePenalty = Math.min(20, mistakes * 5);

    const rawScore = Math.max(0, volumePoints + accuracyPoints + execPoints - mistakePenalty);

    // Recency decay factor
    let recencyFactor = 1.0;
    let daysSinceLast = 0;
    if (item.lastActivityTime > 0) {
      const diffMs = Math.max(0, currentTime - item.lastActivityTime);
      daysSinceLast = Math.floor(diffMs / 86400000);
      if (daysSinceLast > 30) recencyFactor = 0.60;
      else if (daysSinceLast > 14) recencyFactor = 0.75;
      else if (daysSinceLast > 7) recencyFactor = 0.90;
    }

    const finalScore = Math.min(100, Math.round(rawScore * recencyFactor));

    // Determine Transparent Mastery Level
    let level = MASTERY_LEVELS.LEARNING;
    if (finalScore >= 85 && solved >= 2) {
      level = MASTERY_LEVELS.STRONG;
    } else if (finalScore >= 65 && solved >= 1) {
      level = MASTERY_LEVELS.PROFICIENT;
    } else if (finalScore >= 35) {
      level = MASTERY_LEVELS.DEVELOPING;
    } else {
      level = MASTERY_LEVELS.LEARNING;
    }

    let rationale = "";
    if (level === MASTERY_LEVELS.STRONG) {
      rationale = `Demonstrated strong problem-solving across ${solved} distinct problem(s) with high execution accuracy and low mistake rates.`;
    } else if (level === MASTERY_LEVELS.PROFICIENT) {
      rationale = `Consistent understanding across ${attempts} problem(s). Ready for harder variations and optimal time-space trade-offs.`;
    } else if (level === MASTERY_LEVELS.DEVELOPING) {
      rationale = `Active progression with ${attempts} attempted problem(s). Reinforce edge cases and execution reliability.`;
    } else {
      rationale = `Early learning phase with ${attempts} attempt(s). Focus on the core pattern and fundamental invariants.`;
    }

    result[id] = {
      id,
      title: item.title,
      category: item.category,
      order: item.order,
      prerequisites: item.prerequisites,
      description: item.description,
      level,
      score: finalScore,
      attemptsCount: attempts,
      solvedCount: solved,
      executionPassRate: Math.round(execPassRate * 100),
      mistakesCount: mistakes,
      lastPracticed: item.lastActivityTime > 0 ? new Date(item.lastActivityTime).toISOString() : null,
      daysSinceLastPractice: item.lastActivityTime > 0 ? daysSinceLast : null,
      rationale
    };
  }

  return result;
}

/**
 * Aggregates recurring mistakes across student reviews.
 */
function aggregateRecurringMistakes({ reviews = [] }) {
  const categoryMap = {};

  for (const review of reviews) {
    const diagnosis = review.analysis?.mistakeDiagnosis;
    if (!diagnosis || !diagnosis.hasMistake) continue;

    const category = normalizeMistakeCategory(diagnosis.title, diagnosis.detail);
    const pSlug = review.problemSlug || "unknown";

    if (!categoryMap[category]) {
      categoryMap[category] = {
        category,
        title: diagnosis.title || "Implementation Mistake",
        count: 0,
        problemSlugs: new Set(),
        samples: [],
        counterExamples: [],
        suggestedFixes: []
      };
    }

    categoryMap[category].count += 1;
    categoryMap[category].problemSlugs.add(pSlug);

    if (categoryMap[category].samples.length < 3) {
      categoryMap[category].samples.push({
        problemSlug: pSlug,
        problemTitle: review.problemTitle || pSlug,
        title: diagnosis.title,
        detail: diagnosis.detail,
        counterExample: diagnosis.counterExample || null,
        suggestedFix: diagnosis.suggestedFix || null,
        date: review.createdAt || null
      });
    }

    if (diagnosis.counterExample && !categoryMap[category].counterExamples.includes(diagnosis.counterExample)) {
      categoryMap[category].counterExamples.push(diagnosis.counterExample);
    }
    if (diagnosis.suggestedFix && !categoryMap[category].suggestedFixes.includes(diagnosis.suggestedFix)) {
      categoryMap[category].suggestedFixes.push(diagnosis.suggestedFix);
    }
  }

  const allMistakes = Object.values(categoryMap).map(item => ({
    category: item.category,
    title: item.title,
    count: item.count,
    problemSlugs: Array.from(item.problemSlugs),
    isRecurring: item.count >= 2,
    severity: item.count >= 3 ? "high" : (item.count >= 2 ? "medium" : "low"),
    samples: item.samples,
    counterExample: item.counterExamples[0] || null,
    suggestedFix: item.suggestedFixes[0] || null
  })).sort((a, b) => b.count - a.count);

  const recurringMistakes = allMistakes.filter(m => m.isRecurring);

  return {
    recurringMistakes,
    allMistakes,
    hasRecurring: recurringMistakes.length > 0
  };
}

/**
 * Calculates spaced-repetition revision schedules for practiced concepts.
 */
function calculateRevisionSchedule({ mastery = {}, revisions = [], now = new Date() }) {
  const currentTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const scheduleItems = [];

  // Group revisions by conceptId to find latest completion
  const revisionByConcept = {};
  for (const rev of revisions) {
    if (!rev.conceptId) continue;
    const revTime = rev.completedAt ? new Date(rev.completedAt).getTime() : 0;
    if (!revisionByConcept[rev.conceptId] || revTime > revisionByConcept[rev.conceptId].time) {
      revisionByConcept[rev.conceptId] = {
        count: (revisionByConcept[rev.conceptId]?.count || 0) + 1,
        time: revTime,
        lastOutcome: rev.outcome || "completed"
      };
    } else {
      revisionByConcept[rev.conceptId].count += 1;
    }
  }

  for (const [conceptId, cData] of Object.entries(mastery)) {
    // Only schedule concepts that the student has actually practiced
    if (cData.attemptsCount === 0 && (!cData.score || cData.score === 0)) continue;

    const revInfo = revisionByConcept[conceptId] || { count: 0, time: 0 };
    const revCount = revInfo.count;
    const intervalTierIndex = Math.min(revCount, REVISION_INTERVALS_DAYS.length - 1);
    const intervalDays = REVISION_INTERVALS_DAYS[intervalTierIndex];

    // Reference time is last revision time if available, otherwise last practice time
    const lastPracticeTime = cData.lastPracticed ? new Date(cData.lastPracticed).getTime() : currentTime;
    const referenceTime = revInfo.time > 0 ? revInfo.time : lastPracticeTime;
    const dueDateMs = referenceTime + (intervalDays * 86400000);
    const diffDays = Math.ceil((dueDateMs - currentTime) / 86400000);

    let status = "upcoming";
    if (diffDays <= 0) {
      status = "due";
    } else if (diffDays <= 3) {
      status = "upcoming";
    } else if (revInfo.time > 0 && (currentTime - revInfo.time) <= 7 * 86400000) {
      status = "recently_revised";
    }

    scheduleItems.push({
      conceptId,
      conceptTitle: cData.title,
      category: cData.category,
      masteryLevel: cData.level,
      masteryScore: cData.score,
      intervalDays,
      revisionCycle: revCount + 1,
      dueDate: new Date(dueDateMs).toISOString(),
      daysRemaining: diffDays,
      status, // "due" | "upcoming" | "recently_revised"
      lastRevised: revInfo.time > 0 ? new Date(revInfo.time).toISOString() : null,
      mistakesCount: cData.mistakesCount
    });
  }

  // Sort: due items first (most overdue first), then upcoming by nearest date
  scheduleItems.sort((a, b) => {
    if (a.status === "due" && b.status !== "due") return -1;
    if (b.status === "due" && a.status !== "due") return 1;
    return a.daysRemaining - b.daysRemaining;
  });

  return {
    due: scheduleItems.filter(s => s.status === "due"),
    upcoming: scheduleItems.filter(s => s.status === "upcoming"),
    recentlyRevised: scheduleItems.filter(s => s.status === "recently_revised"),
    all: scheduleItems
  };
}

/**
 * Generates transparent, explainable practice recommendations based on actual evidence.
 */
function generateAdaptiveRecommendations({ mastery = {}, mistakes = {}, revisionSchedule = {}, recentActivity = [] }) {
  const recommendations = [];

  // Check if student has any recorded attempts
  const totalAttempts = Object.values(mastery).reduce((sum, c) => sum + (c.attemptsCount || 0), 0);
  if (totalAttempts === 0) {
    return [{
      id: "rec:welcome",
      type: "onboarding",
      priority: "medium",
      conceptId: "arrays-hashing",
      conceptTitle: "Arrays & Hashing",
      title: "Welcome to Your Personalized Learning Coach",
      reason: "Your learning profile is currently building. Analyze or execute code in the AI Code Mentor workspace to generate personalized insights, weakness detection, and revision tracking.",
      suggestedAction: "Analyze Your First Problem",
      evidence: {
        status: "Profile Initializing"
      }
    }];
  }

  // 1. Spaced Repetition Due Recommendations (Highest pedagogical urgency for retention)
  const dueItems = revisionSchedule.due || [];
  for (const dueItem of dueItems.slice(0, 2)) {
    recommendations.push({
      id: `rec:revision:${dueItem.conceptId}`,
      type: "revision_due",
      priority: "high",
      conceptId: dueItem.conceptId,
      conceptTitle: dueItem.conceptTitle,
      title: `Revise ${dueItem.conceptTitle}`,
      reason: `It has been ${Math.abs(dueItem.daysRemaining)} day(s) since your scheduled review for this concept. Spaced revision prevents forgetting and solidifies memory consolidation.`,
      suggestedAction: "Run AI Guided Revision",
      evidence: {
        masteryLevel: dueItem.masteryLevel,
        intervalDays: dueItem.intervalDays,
        cycle: dueItem.revisionCycle
      }
    });
  }

  // 2. Recurring Mistake Retrospective
  const recurring = mistakes.recurringMistakes || [];
  if (recurring.length > 0) {
    const topMistake = recurring[0];
    const categoryTitle = topMistake.category.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    recommendations.push({
      id: `rec:mistake:${topMistake.category}`,
      type: "recurring_mistake",
      priority: "high",
      conceptId: null,
      conceptTitle: categoryTitle,
      title: `Eliminate Recurring ${categoryTitle} Mistakes`,
      reason: `Detected ${topMistake.count} occurrences of ${topMistake.category} issues across your recent submissions (${topMistake.problemSlugs.join(", ")}). Practice targeted invariant checks.`,
      suggestedAction: "View Mistake Retrospective",
      evidence: {
        count: topMistake.count,
        affectedProblems: topMistake.problemSlugs,
        counterExample: topMistake.counterExample,
        suggestedFix: topMistake.suggestedFix
      }
    });
  }

  // 3. Weak Concept Focus
  const developingConcepts = Object.values(mastery)
    .filter(c => (c.level === MASTERY_LEVELS.LEARNING || c.level === MASTERY_LEVELS.DEVELOPING) && c.attemptsCount > 0)
    .sort((a, b) => a.score - b.score);

  if (developingConcepts.length > 0) {
    const weakest = developingConcepts[0];
    recommendations.push({
      id: `rec:weak:${weakest.id}`,
      type: "weak_concept",
      priority: "medium",
      conceptId: weakest.id,
      conceptTitle: weakest.title,
      title: `Strengthen ${weakest.title}`,
      reason: `Your current mastery is ${weakest.level} (${weakest.score}/100) with ${weakest.mistakesCount} diagnosed mistake(s). Deepen your pattern recognition and edge-case handling.`,
      suggestedAction: "Study Concept Blueprint",
      evidence: {
        attempts: weakest.attemptsCount,
        solved: weakest.solvedCount,
        passRate: `${weakest.executionPassRate}%`,
        mistakes: weakest.mistakesCount
      }
    });
  }

  // 4. Learning Path Progression (Next logical step)
  const sortedTaxonomy = Object.values(CONCEPT_TAXONOMY).sort((a, b) => a.order - b.order);
  for (const step of sortedTaxonomy) {
    const cData = mastery[step.id];
    if (!cData || cData.level === MASTERY_LEVELS.NOT_STARTED) {
      // Check if prerequisites are met
      const prereqsMet = step.prerequisites.every(pId => {
        const pData = mastery[pId];
        return pData && (pData.level === MASTERY_LEVELS.PROFICIENT || pData.level === MASTERY_LEVELS.STRONG || pData.level === MASTERY_LEVELS.DEVELOPING);
      });

      if (prereqsMet || step.prerequisites.length === 0) {
        recommendations.push({
          id: `rec:next:${step.id}`,
          type: "next_step",
          priority: "medium",
          conceptId: step.id,
          conceptTitle: step.title,
          title: `Start Next Concept: ${step.title}`,
          reason: step.prerequisites.length > 0
            ? `You have built sufficient foundation in ${step.prerequisites.map(p => CONCEPT_TAXONOMY[p]?.title || p).join(", ")}. Advance to ${step.title}.`
            : `Kickstart your structured curriculum with ${step.title}, a core foundational pattern for interview problems.`,
          suggestedAction: "Explore Concept & Patterns",
          evidence: {
            prerequisites: step.prerequisites,
            category: step.category
          }
        });
        break;
      }
    }
  }

  // Fallback for brand-new users with zero attempts
  if (recommendations.length === 0) {
    recommendations.push({
      id: "rec:welcome",
      type: "onboarding",
      priority: "medium",
      conceptId: "arrays-hashing",
      conceptTitle: "Arrays & Hashing",
      title: "Welcome to Your Personalized Learning Coach",
      reason: "Your learning profile is currently building. Analyze or execute code in the AI Code Mentor workspace to generate personalized insights, weakness detection, and revision tracking.",
      suggestedAction: "Analyze Your First Problem",
      evidence: {
        status: "Profile Initializing"
      }
    });
  }

  return recommendations;
}

/**
 * Constructs the complete Student Learning Profile.
 */
function buildStudentLearningProfile({ reviews = [], executions = [], submissions = [], revisions = [], now = new Date() }) {
  const mastery = calculateConceptMastery({ reviews, executions, submissions, now });
  const mistakes = aggregateRecurringMistakes({ reviews });
  const revisionSchedule = calculateRevisionSchedule({ mastery, revisions, now });
  const recommendations = generateAdaptiveRecommendations({ mastery, mistakes, revisionSchedule });

  // Overview metrics
  const masteryValues = Object.values(mastery);
  const strongCount = masteryValues.filter(m => m.level === MASTERY_LEVELS.STRONG).length;
  const proficientCount = masteryValues.filter(m => m.level === MASTERY_LEVELS.PROFICIENT).length;
  const developingCount = masteryValues.filter(m => m.level === MASTERY_LEVELS.DEVELOPING).length;
  const learningCount = masteryValues.filter(m => m.level === MASTERY_LEVELS.LEARNING).length;
  const notStartedCount = masteryValues.filter(m => m.level === MASTERY_LEVELS.NOT_STARTED).length;

  const distinctAttemptedSlugs = new Set();
  const distinctSolvedSlugs = new Set();
  let latestActivityTime = 0;

  for (const r of reviews) {
    if (r.problemSlug) distinctAttemptedSlugs.add(r.problemSlug);
    if (r.analysis?.correctnessStatus === "correct" || !r.analysis?.mistakeDiagnosis?.hasMistake) {
      if (r.problemSlug) distinctSolvedSlugs.add(r.problemSlug);
    }
    const t = r.createdAt ? new Date(r.createdAt).getTime() : 0;
    if (t > latestActivityTime) latestActivityTime = t;
  }
  for (const e of executions) {
    if (e.problemSlug) distinctAttemptedSlugs.add(e.problemSlug);
    if (e.status === "passed" && e.problemSlug) distinctSolvedSlugs.add(e.problemSlug);
    const t = e.createdAt ? new Date(e.createdAt).getTime() : 0;
    if (t > latestActivityTime) latestActivityTime = t;
  }
  for (const s of submissions) {
    if (s.problemSlug) distinctAttemptedSlugs.add(s.problemSlug);
    if ((s.verdict === "Accepted" || s.statusDisplay === "Accepted") && s.problemSlug) distinctSolvedSlugs.add(s.problemSlug);
    const t = s.submittedAt ? new Date(s.submittedAt).getTime() : 0;
    if (t > latestActivityTime) latestActivityTime = t;
  }

  const totalExecutions = executions.length;
  const passedExecutions = executions.filter(e => e.status === "passed").length;
  const overallExecutionPassRate = totalExecutions > 0 ? Math.round((passedExecutions / totalExecutions) * 100) : 0;

  // Ordered Learning Path Progression
  const learningPath = Object.values(CONCEPT_TAXONOMY)
    .sort((a, b) => a.order - b.order)
    .map(c => {
      const m = mastery[c.id];
      return {
        id: c.id,
        title: c.title,
        category: c.category,
        order: c.order,
        prerequisites: c.prerequisites,
        level: m?.level || MASTERY_LEVELS.NOT_STARTED,
        score: m?.score || 0,
        attemptsCount: m?.attemptsCount || 0,
        solvedCount: m?.solvedCount || 0
      };
    });

  return {
    overview: {
      totalProblemsAttempted: distinctAttemptedSlugs.size,
      totalProblemsSolved: distinctSolvedSlugs.size,
      totalExecutions,
      executionPassRate: overallExecutionPassRate,
      strongCount,
      proficientCount,
      developingCount,
      learningCount,
      notStartedCount,
      revisionDueCount: revisionSchedule.due.length,
      recurringMistakesCount: mistakes.recurringMistakes.length,
      lastActivityAt: latestActivityTime > 0 ? new Date(latestActivityTime).toISOString() : null,
      assessmentDisclaimer: "AI assessments are educational estimations based strictly on your recorded DSAverse daily activity and code submissions. Not affiliated with official LeetCode lifetime statistics."
    },
    conceptMastery: mastery,
    recurringMistakes: mistakes.recurringMistakes,
    allMistakes: mistakes.allMistakes,
    revisionSchedule,
    recommendations,
    learningPath
  };
}

/**
 * Builds AI tutor prompts or provides deterministic pedagogical content.
 */
function buildTutorLessonContent({ type = "explain_weak_concept", conceptId, mistakeCategory, conceptA, conceptB, hintLevel = 1, studentHistory = {} }) {
  const cMeta = CONCEPT_TAXONOMY[conceptId] || CONCEPT_TAXONOMY["arrays-hashing"];

  if (type === "progressive_hint") {
    const hintNum = Number(hintLevel) || 1;
    if (hintNum === 1) {
      return {
        type: "progressive_hint",
        hintLevel: 1,
        title: "Hint 1: Conceptual Direction",
        text: `Focus on the core invariant of ${cMeta.title}: what property must remain true as you iterate? Avoid jumping directly to code—observe how the state transitions from left to right.`,
        action: "Request Hint 2 for key structural observation."
      };
    }
    if (hintNum === 2) {
      return {
        type: "progressive_hint",
        hintLevel: 2,
        title: "Hint 2: Key Observation",
        text: `Consider whether you can determine the required partner or state in O(1) time using auxiliary space, or if maintaining two pointers/bounds preserves monotonicity without redundant checks.`,
        action: "Request Hint 3 for algorithmic blueprint."
      };
    }
    if (hintNum === 3) {
      return {
        type: "progressive_hint",
        hintLevel: 3,
        title: "Hint 3: Algorithmic Blueprint",
        text: `Initialize your pointers or tracking structure before the loop. At each step, either expand your candidate range or compute the target complement. Update boundaries only after processing the invariant.`,
        action: "Request Full Walkthrough for complete reasoning."
      };
    }
    return {
      type: "progressive_hint",
      hintLevel: 4,
      title: "Full Algorithmic Walkthrough",
      text: `Full Explanation: The optimal approach for this pattern maintains invariant conditions over a single pass. For ${cMeta.title}, ensure your loop terminal conditions handle edge cases (empty or single-element inputs) and update variables without off-by-one errors.`,
      action: "Practice a problem to test this understanding."
    };
  }

  if (type === "compare_patterns") {
    const metaA = CONCEPT_TAXONOMY[conceptA] || CONCEPT_TAXONOMY["two-pointers"];
    const metaB = CONCEPT_TAXONOMY[conceptB] || CONCEPT_TAXONOMY["sliding-window"];
    return {
      type: "compare_patterns",
      title: `${metaA.title} vs ${metaB.title}`,
      text: `Key Distinction: While both use two pointers, ${metaA.title} typically moves pointers towards each other based on sorted values or in-place swapping. In contrast, ${metaB.title} maintains a contiguous interval that dynamically expands with a right pointer and contracts with a left pointer to satisfy a condition (e.g. at most K distinct elements).`,
      comparison: [
        { aspect: "Interval Contiguity", [metaA.id]: "Does not require contiguous subarray", [metaB.id]: "Strictly contiguous subarray / substring" },
        { aspect: "Pointer Movement", [metaA.id]: "Opposite ends converging (left ->, <- right)", [metaB.id]: "Same direction (both moving rightwards)" },
        { aspect: "Precondition", [metaA.id]: "Often requires sorted input array", [metaB.id]: "Works on unsorted arrays with condition monotone" }
      ],
      takeaway: `Use ${metaA.title} when pairs can be eliminated from extremes. Use ${metaB.title} when optimizing contiguous ranges.`
    };
  }

  if (type === "explain_mistake") {
    const cat = mistakeCategory || "boundary-condition";
    return {
      type: "explain_mistake",
      title: `Understanding ${cat.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())} Mistakes`,
      text: `Recurring ${cat} mistakes usually arise when the termination predicate in your while/for loop does not match the invariant. For example, using \`left < right\` when \`left <= right\` is required for single-element intervals, or updating \`right = mid\` instead of \`right = mid - 1\`.`,
      counterExample: "nums = [5], target = 5. A loop with `left < right` will terminate immediately at index 0 without evaluating the element.",
      remedy: "Define the search range explicitly as inclusive [left, right] or half-open [left, right), and maintain that definition uniformly across all branch updates."
    };
  }

  // Default: explain weak concept
  return {
    type: "explain_weak_concept",
    conceptId: cMeta.id,
    title: `Mastering ${cMeta.title}`,
    text: `${cMeta.description} The primary pitfall students encounter is applying brute force nested loops instead of leveraging structural invariants. By converting the problem into a ${cMeta.title} structure, you trade minimal auxiliary space for a dramatic asymptotic time improvement.`,
    practiceAdvice: `Start with standard canonical problems in ${cMeta.title} before moving to hybrid variations.`
  };
}

module.exports = {
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
};
