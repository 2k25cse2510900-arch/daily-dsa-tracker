"use strict";

const KNOWN_PROBLEM_DIFFICULTIES = {
  "two-sum": "Easy",
  "add-two-numbers": "Medium",
  "longest-substring-without-repeating-characters": "Medium",
  "median-of-two-sorted-arrays": "Hard",
  "longest-palindromic-substring": "Medium",
  "reverse-integer": "Medium",
  "palindrome-number": "Easy",
  "regular-expression-matching": "Hard",
  "container-with-most-water": "Medium",
  "roman-to-integer": "Easy",
  "valid-parentheses": "Easy",
  "merge-two-sorted-lists": "Easy",
  "generate-parentheses": "Medium",
  "merge-k-sorted-lists": "Hard",
  "search-in-rotated-sorted-array": "Medium",
  "trapping-rain-water": "Hard",
  "maximum-subarray": "Medium",
  "climbing-stairs": "Easy",
  "binary-tree-inorder-traversal": "Easy",
  "symmetric-tree": "Easy",
  "maximum-depth-of-binary-tree": "Easy",
  "best-time-to-buy-and-sell-stock": "Easy",
  "binary-tree-maximum-path-sum": "Hard",
  "valid-palindrome": "Easy",
  "single-number": "Easy",
  "word-break": "Medium",
  "linked-list-cycle": "Easy",
  "lru-cache": "Medium",
  "reverse-linked-list": "Easy",
  "number-of-islands": "Medium",
  "kth-largest-element-in-an-array": "Medium",
  "invert-binary-tree": "Easy",
  "lowest-common-ancestor-of-a-binary-search-tree": "Medium",
  "delete-node-in-a-linked-list": "Medium",
  "product-of-array-except-self": "Medium",
  "first-bad-version": "Easy",
  "coin-change": "Medium",
  "binary-search": "Easy",
  "minimize-maximum-pair-sum-in-array": "Medium",
  "find-the-duplicate-number": "Medium",
  "find-first-and-last-position-of-element-in-sorted-array": "Medium",
  "merge-in-between-linked-lists": "Medium",
  "minimum-moves-to-equal-array-elements": "Medium",
  "minimum-moves-to-equal-array-elements-iii": "Easy"
};

const memoryProblemCache = new Map();

function resolveDifficulty(slug, explicitDifficulty) {
  if (explicitDifficulty && typeof explicitDifficulty === "string") {
    const norm = explicitDifficulty.trim().toLowerCase();
    if (norm === "easy") return "Easy";
    if (norm === "medium") return "Medium";
    if (norm === "hard") return "Hard";
  }
  if (slug && typeof slug === "string") {
    const key = slug.trim().toLowerCase();
    if (KNOWN_PROBLEM_DIFFICULTIES[key]) return KNOWN_PROBLEM_DIFFICULTIES[key];
  }
  return null;
}

async function fetchLeetCodeQuestionDetail(titleSlug) {
  if (!titleSlug || typeof titleSlug !== "string") return null;
  const slug = titleSlug.trim().toLowerCase();
  if (memoryProblemCache.has(slug)) return memoryProblemCache.get(slug);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const query = `query getQuestionDetail($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionFrontendId
        difficulty
        title
      }
    }`;
    const response = await fetch("https://leetcode.com/graphql/", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "user-agent": "DSA-Dashboard/1.0 (+public problem metadata)"
      },
      body: JSON.stringify({ query, variables: { titleSlug: slug } })
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const q = payload?.data?.question;
    if (q) {
      const result = {
        questionFrontendId: q.questionFrontendId ? String(q.questionFrontendId) : null,
        difficulty: q.difficulty || null,
        title: q.title || null
      };
      memoryProblemCache.set(slug, result);
      return result;
    }
  } catch {
    // Graceful fallback if LeetCode GraphQL is rate limited or unavailable
  } finally {
    clearTimeout(timeout);
  }
  return null;
}

function groupDailySubmissions(submissions = [], questionDetailsMap = {}) {
  if (!Array.isArray(submissions) || submissions.length === 0) return [];

  // Sort submissions chronologically ascending to track attempts in order
  const sorted = [...submissions].sort((a, b) => {
    const timeA = new Date(a.submittedAt || (a.timestamp ? a.timestamp * 1000 : 0)).getTime();
    const timeB = new Date(b.submittedAt || (b.timestamp ? b.timestamp * 1000 : 0)).getTime();
    return timeA - timeB;
  });

  const groups = new Map();

  for (const sub of sorted) {
    const slug = (sub.titleSlug || sub.problemSlug || "").trim().toLowerCase();
    const detail = questionDetailsMap[slug] || null;
    const title = (sub.title || sub.problemTitle || detail?.title || slug || "LeetCode Problem").trim();
    const key = slug || title.toLowerCase();
    if (!key) continue;

    if (!groups.has(key)) {
      const difficulty = detail?.difficulty || resolveDifficulty(slug, sub.difficulty);
      const questionFrontendId = detail?.questionFrontendId || sub.questionFrontendId || sub.problemId || null;
      groups.set(key, {
        title,
        titleSlug: slug || null,
        questionFrontendId,
        difficulty,
        url: sub.problemUrl || (slug ? `https://leetcode.com/problems/${encodeURIComponent(slug)}/` : null),
        attempts: []
      });
    }

    const entry = groups.get(key);
    if (!entry.difficulty) {
      entry.difficulty = detail?.difficulty || resolveDifficulty(slug, sub.difficulty);
    }
    if (!entry.questionFrontendId && (detail?.questionFrontendId || sub.questionFrontendId)) {
      entry.questionFrontendId = detail?.questionFrontendId || sub.questionFrontendId;
    }
    const verdict = sub.verdict || sub.statusDisplay || "Submitted";
    const language = sub.language || sub.lang || null;
    const submittedAt = sub.submittedAt instanceof Date
      ? sub.submittedAt.toISOString()
      : sub.submittedAt
      ? new Date(sub.submittedAt).toISOString()
      : sub.timestamp
      ? new Date(sub.timestamp * 1000).toISOString()
      : new Date().toISOString();

    entry.attempts.push({
      submissionId: sub.submissionId || sub.id || null,
      verdict,
      language,
      submittedAt
    });
  }

  const results = [];
  for (const entry of groups.values()) {
    const attempts = entry.attempts;
    const latestAttempt = attempts[attempts.length - 1];
    const hasAccepted = attempts.some(a => a.verdict === "Accepted");

    results.push({
      title: entry.title,
      titleSlug: entry.titleSlug,
      questionFrontendId: entry.questionFrontendId || null,
      difficulty: entry.difficulty || null,
      status: latestAttempt.verdict,
      hasAccepted,
      language: latestAttempt.language,
      submittedAt: latestAttempt.submittedAt,
      submissionId: latestAttempt.submissionId || null,
      url: entry.url,
      attemptsCount: attempts.length,
      verdicts: attempts.map(a => a.verdict),
      attempts
    });
  }

  // Sort final questions descending by latest submission time (most recent first)
  return results.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

module.exports = {
  KNOWN_PROBLEM_DIFFICULTIES,
  resolveDifficulty,
  fetchLeetCodeQuestionDetail,
  groupDailySubmissions
};
