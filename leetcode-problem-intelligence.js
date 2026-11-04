"use strict";

/**
 * LeetCode Problem Intelligence Layer
 * Normalizes problem identity, resolves metadata, signatures, constraints,
 * and canonical examples across Java, Python 3, C++, JavaScript, TypeScript, Go, and Rust.
 */

const CANONICAL_PROBLEMS = {
  "two-sum": {
    number: 1,
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    url: "https://leetcode.com/problems/two-sum/",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.",
    constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.",
    examples: [
      { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." },
      { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
      { input: "nums = [3,3], target = 6", output: "[0,1]" }
    ],
    signatures: {
      java: "public int[] twoSum(int[] nums, int target)",
      python3: "def twoSum(self, nums: List[int], target: int) -> List[int]:",
      cpp: "vector<int> twoSum(vector<int>& nums, int target)",
      javascript: "var twoSum = function(nums, target) {",
      typescript: "function twoSum(nums: number[], target: number): number[] {",
      go: "func twoSum(nums []int, target int) []int",
      rust: "pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32>"
    },
    methodName: {
      java: "twoSum", python3: "twoSum", cpp: "twoSum", javascript: "twoSum", typescript: "twoSum", go: "twoSum", rust: "two_sum"
    },
    tags: ["Array", "Hash Table"]
  },
  "minimum-moves-to-equal-array-elements": {
    number: 453,
    slug: "minimum-moves-to-equal-array-elements",
    title: "Minimum Moves to Equal Array Elements",
    difficulty: "Medium",
    url: "https://leetcode.com/problems/minimum-moves-to-equal-array-elements/",
    description: "Given an integer array nums of size n, return the minimum number of moves required to make all array elements equal. In one move, you can increment n - 1 elements of the array by 1.",
    constraints: "n == nums.length\n1 <= nums.length <= 10^5\n-10^9 <= nums[i] <= 10^9\nThe answer is guaranteed to fit in a 32-bit integer.",
    examples: [
      { input: "nums = [1,2,3]", output: "3", explanation: "[1,2,3] => [2,3,3] => [3,4,3] => [4,4,4]" },
      { input: "nums = [1,1,1]", output: "0" }
    ],
    signatures: {
      java: "public int minMoves(int[] nums)",
      python3: "def minMoves(self, nums: List[int]) -> int:",
      cpp: "int minMoves(vector<int>& nums)",
      javascript: "var minMoves = function(nums) {",
      typescript: "function minMoves(nums: number[]): number {",
      go: "func minMoves(nums []int) int",
      rust: "pub fn min_moves(nums: Vec<i32>) -> i32"
    },
    methodName: {
      java: "minMoves", python3: "minMoves", cpp: "minMoves", javascript: "minMoves", typescript: "minMoves", go: "minMoves", rust: "min_moves"
    },
    tags: ["Array", "Math"]
  },
  "find-the-duplicate-number": {
    number: 287,
    slug: "find-the-duplicate-number",
    title: "Find the Duplicate Number",
    difficulty: "Medium",
    url: "https://leetcode.com/problems/find-the-duplicate-number/",
    description: "Given an array of integers nums containing n + 1 integers where each integer is in the range [1, n] inclusive. There is only one repeated number in nums, return this repeated number. You must solve the problem without modifying the array nums and uses only constant extra space.",
    constraints: "1 <= n <= 10^5\nnums.length == n + 1\n1 <= nums[i] <= n\nAll integers in nums appear only once except for precisely one integer which appears two or more times.",
    examples: [
      { input: "nums = [1,3,4,2,2]", output: "2" },
      { input: "nums = [3,1,3,4,2]", output: "3" }
    ],
    signatures: {
      java: "public int findDuplicate(int[] nums)",
      python3: "def findDuplicate(self, nums: List[int]) -> int:",
      cpp: "int findDuplicate(vector<int>& nums)",
      javascript: "var findDuplicate = function(nums) {",
      typescript: "function findDuplicate(nums: number[]): number {",
      go: "func findDuplicate(nums []int) int",
      rust: "pub fn find_duplicate(nums: Vec<i32>) -> i32"
    },
    methodName: {
      java: "findDuplicate", python3: "findDuplicate", cpp: "findDuplicate", javascript: "findDuplicate", typescript: "findDuplicate", go: "findDuplicate", rust: "find_duplicate"
    },
    tags: ["Array", "Two Pointers", "Binary Search", "Bit Manipulation"]
  },
  "binary-search": {
    number: 704,
    slug: "binary-search",
    title: "Binary Search",
    difficulty: "Easy",
    url: "https://leetcode.com/problems/binary-search/",
    description: "Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, then return its index. Otherwise, return -1. You must write an algorithm with O(log n) runtime complexity.",
    constraints: "1 <= nums.length <= 10^4\n-10^4 < nums[i], target < 10^4\nAll the integers in nums are unique.\nnums is sorted in ascending order.",
    examples: [
      { input: "nums = [-1,0,3,5,9,12], target = 9", output: "4" },
      { input: "nums = [-1,0,3,5,9,12], target = 2", output: "-1" }
    ],
    signatures: {
      java: "public int search(int[] nums, int target)",
      python3: "def search(self, nums: List[int], target: int) -> int:",
      cpp: "int search(vector<int>& nums, int target)",
      javascript: "var search = function(nums, target) {",
      typescript: "function search(nums: number[], target: number): number {",
      go: "func search(nums []int, target int) int",
      rust: "pub fn search(nums: Vec<i32>, target: i32) -> i32"
    },
    methodName: {
      java: "search", python3: "search", cpp: "search", javascript: "search", typescript: "search", go: "search", rust: "search"
    },
    tags: ["Array", "Binary Search"]
  },
  "minimize-maximum-pair-sum-in-array": {
    number: 1877,
    slug: "minimize-maximum-pair-sum-in-array",
    title: "Minimize Maximum Pair Sum in Array",
    difficulty: "Medium",
    url: "https://leetcode.com/problems/minimize-maximum-pair-sum-in-array/",
    description: "The pair sum of a pair (a,b) is equal to a + b. The maximum pair sum is the largest pair sum in a list of pairs. Given an array nums of even length n, pair up the elements into n / 2 pairs such that the maximum pair sum is minimized. Return the minimized maximum pair sum.",
    constraints: "n == nums.length\n2 <= nums.length <= 10^5\nnums.length is even.\n1 <= nums[i] <= 10^5",
    examples: [
      { input: "nums = [3,5,2,3]", output: "7", explanation: "The elements can be paired up into pairs (3,3) and (5,2). The maximum pair sum is max(3+3, 5+2) = max(6, 7) = 7." },
      { input: "nums = [3,5,4,2,4,6]", output: "8" }
    ],
    signatures: {
      java: "public int minPairSum(int[] nums)",
      python3: "def minPairSum(self, nums: List[int]) -> int:",
      cpp: "int minPairSum(vector<int>& nums)",
      javascript: "var minPairSum = function(nums) {",
      typescript: "function minPairSum(nums: number[]): number {",
      go: "func minPairSum(nums []int) int",
      rust: "pub fn min_pair_sum(nums: Vec<i32>) -> i32"
    },
    methodName: {
      java: "minPairSum", python3: "minPairSum", cpp: "minPairSum", javascript: "minPairSum", typescript: "minPairSum", go: "minPairSum", rust: "min_pair_sum"
    },
    tags: ["Array", "Two Pointers", "Greedy", "Sorting"]
  },
  "contains-duplicate": {
    number: 217,
    slug: "contains-duplicate",
    title: "Contains Duplicate",
    difficulty: "Easy",
    url: "https://leetcode.com/problems/contains-duplicate/",
    description: "Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.",
    constraints: "1 <= nums.length <= 10^5\n-10^9 <= nums[i] <= 10^9",
    examples: [
      { input: "nums = [1,2,3,1]", output: "true" },
      { input: "nums = [1,2,3,4]", output: "false" },
      { input: "nums = [1,1,1,3,3,4,3,2,4,2]", output: "true" }
    ],
    signatures: {
      java: "public boolean containsDuplicate(int[] nums)",
      python3: "def containsDuplicate(self, nums: List[int]) -> bool:",
      cpp: "bool containsDuplicate(vector<int>& nums)",
      javascript: "var containsDuplicate = function(nums) {",
      typescript: "function containsDuplicate(nums: number[]): boolean {",
      go: "func containsDuplicate(nums []int) bool",
      rust: "pub fn contains_duplicate(nums: Vec<i32>) -> bool"
    },
    methodName: {
      java: "containsDuplicate", python3: "containsDuplicate", cpp: "containsDuplicate", javascript: "containsDuplicate", typescript: "containsDuplicate", go: "containsDuplicate", rust: "contains_duplicate"
    },
    tags: ["Array", "Hash Table", "Sorting"]
  },
  "valid-parentheses": {
    number: 20,
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "Easy",
    url: "https://leetcode.com/problems/valid-parentheses/",
    description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if: Open brackets must be closed by the same type of brackets. Open brackets must be closed in the correct order. Every close bracket has a corresponding open bracket of the same type.",
    constraints: "1 <= s.length <= 10^4\ns consists of parentheses only '()[]{}'.",
    examples: [
      { input: "s = \"()\"", output: "true" },
      { input: "s = \"()[]{}\"", output: "true" },
      { input: "s = \"(]\"", output: "false" }
    ],
    signatures: {
      java: "public boolean isValid(String s)",
      python3: "def isValid(self, s: str) -> bool:",
      cpp: "bool isValid(string s)",
      javascript: "var isValid = function(s) {",
      typescript: "function isValid(s: string): boolean {",
      go: "func isValid(s string) bool",
      rust: "pub fn is_valid(s: String) -> bool"
    },
    methodName: {
      java: "isValid", python3: "isValid", cpp: "isValid", javascript: "isValid", typescript: "isValid", go: "isValid", rust: "is_valid"
    },
    tags: ["String", "Stack"]
  },
  "best-time-to-buy-and-sell-stock": {
    number: 121,
    slug: "best-time-to-buy-and-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    difficulty: "Easy",
    url: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/",
    description: "You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock. Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.",
    constraints: "1 <= prices.length <= 10^5\n0 <= prices[i] <= 10^4",
    examples: [
      { input: "prices = [7,1,5,3,6,4]", output: "5", explanation: "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5." },
      { input: "prices = [7,6,4,3,1]", output: "0" }
    ],
    signatures: {
      java: "public int maxProfit(int[] prices)",
      python3: "def maxProfit(self, prices: List[int]) -> int:",
      cpp: "int maxProfit(vector<int>& prices)",
      javascript: "var maxProfit = function(prices) {",
      typescript: "function maxProfit(prices: number[]): number {",
      go: "func maxProfit(prices []int) int",
      rust: "pub fn max_profit(prices: Vec<i32>) -> i32"
    },
    methodName: {
      java: "maxProfit", python3: "maxProfit", cpp: "maxProfit", javascript: "maxProfit", typescript: "maxProfit", go: "maxProfit", rust: "max_profit"
    },
    tags: ["Array", "Dynamic Programming"]
  },
  "make-sum-divisible-by-p": {
    number: 1590,
    slug: "make-sum-divisible-by-p",
    title: "Make Sum Divisible by P",
    difficulty: "Medium",
    url: "https://leetcode.com/problems/make-sum-divisible-by-p/",
    description: "Given an array of positive integers nums, remove the smallest subarray (possibly empty) such that the sum of the remaining elements is divisible by p. It is not allowed to remove the whole array. Return the length of the smallest subarray that you need to remove, or -1 if it's impossible. A subarray is defined as a contiguous block of elements in the array.",
    constraints: "1 <= nums.length <= 10^5\n1 <= nums[i] <= 10^9\n1 <= p <= 10^9",
    examples: [
      { input: "nums = [3,1,4,2], p = 6", output: "1", explanation: "The sum of elements is 10, not divisible by 6. Removing [4] leaves sum 6, divisible by 6." },
      { input: "nums = [6,3,5,2], p = 9", output: "2", explanation: "Removing [5,2] leaves [6,3] with sum 9, which is divisible by 9. Length is 2." },
      { input: "nums = [1,2,3], p = 3", output: "0", explanation: "Sum is 6, already divisible by 3. No removal needed." }
    ],
    signatures: {
      java: "public int minSubarray(int[] nums, int p)",
      python3: "def minSubarray(self, nums: List[int], p: int) -> int:",
      cpp: "int minSubarray(vector<int>& nums, int p)",
      javascript: "var minSubarray = function(nums, p) {",
      typescript: "function minSubarray(nums: number[], p: number): number {",
      go: "func minSubarray(nums []int, p int) int",
      rust: "pub fn min_subarray(nums: Vec<i32>, p: i32) -> i32"
    },
    methodName: {
      java: "minSubarray", python3: "minSubarray", cpp: "minSubarray", javascript: "minSubarray", typescript: "minSubarray", go: "minSubarray", rust: "min_subarray"
    },
    tags: ["Array", "Hash Table", "Prefix Sum"]
  }
};

// Build index maps for fast lookup by number, slug, and title
const NUMBER_INDEX = new Map();
const SLUG_INDEX = new Map();
const TITLE_INDEX = new Map();

for (const [slug, prob] of Object.entries(CANONICAL_PROBLEMS)) {
  SLUG_INDEX.set(slug, prob);
  if (prob.number) NUMBER_INDEX.set(Number(prob.number), prob);
  TITLE_INDEX.set(prob.title.toLowerCase().trim(), prob);
}

/**
 * Extracts problem slug from URL or string
 */
function extractSlug(input) {
  if (!input || typeof input !== "string") return null;
  const str = input.trim();
  const urlMatch = str.match(/leetcode\.com\/problems\/([a-z0-9-]+)/i);
  if (urlMatch) return urlMatch[1].toLowerCase();
  if (/^[a-z0-9-]+$/.test(str)) return str.toLowerCase();
  return null;
}

/**
 * Extracts problem number from string (e.g. "453. Minimum Moves" or "#453" or "453")
 */
function extractNumber(input) {
  if (typeof input === "number" && Number.isInteger(input) && input > 0) return input;
  if (!input || typeof input !== "string") return null;
  const str = input.trim();
  const m1 = str.match(/^#?(\d{1,5})(?:\.|\s|$)/);
  if (m1) return Number(m1[1]);
  return null;
}

/**
 * Resolves problem identity from available indicators
 */
function resolveProblemIdentity({ problemNumber, problemTitle, problemSlug, problemUrl, problemDescription } = {}) {
  // 1. Check problem number
  const num = extractNumber(problemNumber) || extractNumber(problemTitle);
  if (num && NUMBER_INDEX.has(num)) {
    return { ...NUMBER_INDEX.get(num), confidence: "high", isCanonical: true };
  }

  // 2. Check problem slug
  const slug = extractSlug(problemSlug) || extractSlug(problemUrl) || (problemTitle ? extractSlug(problemTitle) : null);
  if (slug && SLUG_INDEX.has(slug)) {
    return { ...SLUG_INDEX.get(slug), confidence: "high", isCanonical: true };
  }

  // 3. Check normalized title in canonical index
  if (problemTitle && typeof problemTitle === "string") {
    const cleanTitle = problemTitle.replace(/^#?\d+[\s.-]+/, "").toLowerCase().trim();
    if (TITLE_INDEX.has(cleanTitle)) {
      return { ...TITLE_INDEX.get(cleanTitle), confidence: "high", isCanonical: true };
    }
  }

  // 4. Fallback: Parse non-canonical or arbitrary dynamic LeetCode problem
  const rawTitle = (problemTitle || slug || "").trim();
  const titleWithoutNum = rawTitle.replace(/^#?\d+[\s.-]+/, "").trim();
  const dynamicSlug = slug || titleWithoutNum.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const dynamicNum = num || null;

  // Check ambiguity: if neither title nor description has substantive content
  if (!titleWithoutNum && !problemDescription && !dynamicNum) {
    return {
      confidence: "ambiguous",
      isCanonical: false,
      clarificationNeeded: true,
      reason: "Could not identify problem. Provide a problem title, LeetCode number, URL, or problem statement."
    };
  }

  return {
    number: dynamicNum,
    slug: dynamicSlug || "custom-problem",
    title: titleWithoutNum || (dynamicNum ? `Problem #${dynamicNum}` : "LeetCode Problem"),
    difficulty: "Medium",
    url: problemUrl || (dynamicSlug ? `https://leetcode.com/problems/${dynamicSlug}/` : null),
    description: (problemDescription && typeof problemDescription === "string" && problemDescription.trim())
      ? problemDescription.trim()
      : null,
    constraints: null,
    examples: [],
    signatures: {},
    methodName: {},
    tags: [],
    confidence: problemDescription ? "medium" : "low",
    isCanonical: false
  };
}

/**
 * Formats problem context for AI prompts
 */
function buildProblemPromptContext(problem, language) {
  let prompt = `PROBLEM: ${problem.title}`;
  if (problem.number) prompt += ` (LeetCode #${problem.number})`;
  prompt += `\nSLUG: ${problem.slug}`;
  if (problem.difficulty) prompt += `\nDIFFICULTY: ${problem.difficulty}`;
  if (problem.description) prompt += `\n\nPROBLEM STATEMENT:\n${problem.description}`;
  if (problem.constraints) prompt += `\n\nCONSTRAINTS:\n${problem.constraints}`;
  if (Array.isArray(problem.examples) && problem.examples.length) {
    prompt += `\n\nEXAMPLES:\n` + problem.examples.map((ex, i) => `Example ${i + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}${ex.explanation ? `\nExplanation: ${ex.explanation}` : ""}`).join("\n\n");
  }
  if (problem.signatures?.[language]) {
    prompt += `\n\nREQUIRED METHOD SIGNATURE (${language.toUpperCase()}):\n${problem.signatures[language]}`;
  }
  return prompt;
}

module.exports = {
  CANONICAL_PROBLEMS,
  resolveProblemIdentity,
  extractSlug,
  extractNumber,
  buildProblemPromptContext
};
