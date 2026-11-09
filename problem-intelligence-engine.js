"use strict";

/**
 * Problem Intelligence Engine
 * Comprehensive canonical data model, normalization layer,
 * multi-tier retrieval engine, identity validator, and Gemini context adapter.
 */

// Provenance & verification status constants
const VERIFICATION_STATUSES = Object.freeze({
  VERIFIED: "VERIFIED",                     // Official trusted canonical metadata
  PARTIALLY_VERIFIED: "PARTIALLY_VERIFIED", // Canonical metadata with some non-essential fields missing
  USER_PROVIDED: "USER_PROVIDED",           // User supplied custom title/statement/constraints
  INFERRED: "INFERRED",                     // Inferred from code/hints with explicit labeling
  INSUFFICIENT_CONTEXT: "INSUFFICIENT_CONTEXT", // Code-only or insufficient context
  AMBIGUOUS: "AMBIGUOUS"                    // Conflicting ID/slug/title indicators
});

const METADATA_COMPLETENESS = Object.freeze({
  COMPLETE: "COMPLETE",
  PARTIAL: "PARTIAL",
  MINIMAL: "MINIMAL",
  CODE_ONLY: "CODE_ONLY"
});

/**
 * Canonical problem dictionary
 * Includes reference problems:
 * - #392 Is Subsequence
 * - #443 String Compression
 * - #1679 Max Number of K-Sum Pairs
 * and all curriculum problems.
 */
const CANONICAL_PROBLEMS = {
  "is-subsequence": {
    number: 392,
    slug: "is-subsequence",
    title: "Is Subsequence",
    difficulty: "Easy",
    source: "leetcode",
    sourceUrl: "https://leetcode.com/problems/is-subsequence/",
    statement: "Given two strings s and t, return true if s is a subsequence of t, or false otherwise.\n\nA subsequence of a string is a new string that is formed from the original string by deleting some (can be none) of the characters without disturbing the relative positions of the remaining characters. (i.e., \"ace\" is a subsequence of \"abcde\" while \"aec\" is not).",
    inputDescription: "Two strings s and t consisting only of lowercase English letters.",
    outputDescription: "boolean: true if s is a subsequence of t, false otherwise.",
    expectedInputType: "String (s), String (t)",
    expectedOutputType: "boolean",
    constraints: "0 <= s.length <= 100\n0 <= t.length <= 10^4\ns and t consist only of lowercase English letters.",
    examples: [
      { input: "s = \"abc\", t = \"ahbgdc\"", output: "true" },
      { input: "s = \"axc\", t = \"ahbgdc\"", output: "false" }
    ],
    signatures: {
      java: "public boolean isSubsequence(String s, String t)",
      python3: "def isSubsequence(self, s: str, t: str) -> bool:",
      cpp: "bool isSubsequence(string s, string t)",
      javascript: "var isSubsequence = function(s, t) {",
      typescript: "function isSubsequence(s: string, t: string): boolean {",
      go: "func isSubsequence(s string, t string) bool",
      rust: "pub fn is_subsequence(s: String, t: String) -> bool"
    },
    methodName: {
      java: "isSubsequence", python3: "isSubsequence", cpp: "isSubsequence", javascript: "isSubsequence", typescript: "isSubsequence", go: "isSubsequence", rust: "is_subsequence"
    },
    topics: ["Two Pointers", "String", "Dynamic Programming"],
    bruteForceTitle: "Exhaustive Subsequence Generation",
    bruteForceExplain: "Recursively generates all 2^|t| possible subsequences of string t and checks if string s equals any generated subsequence.",
    bruteForceTime: "O(2^|t|)",
    bruteForceSpace: "O(|t|)",
    optimalTitle: "Two Pointers Greedy Match",
    optimalExplain: "Scans string t with a pointer, greedily matching characters of s in order. Preserves relative order with constant auxiliary space.",
    optimalTime: "O(|s| + |t|)",
    optimalSpace: "O(1)",
    timeComplexity: "O(|s| + |t|)",
    spaceComplexity: "O(1)",
    auxiliarySpace: "O(1)",
    totalSpace: "O(|s| + |t|)",
    timeExplain: "Inner pointer index advances through t at most once across all outer loop iterations because index is never reset. Total comparisons are bounded by |s| + |t|.",
    spaceExplain: "Uses only constant integer pointer variables (i, index, c), resulting in O(1) auxiliary space.",
    whatItAsks: "Determine whether string s is a subsequence of string t by checking whether all characters of s appear in t in the exact relative order.",
    inputOutput: "Input: two strings s and t consisting of lowercase English letters. Output: boolean (true if s is subsequence of t, false otherwise).",
    keyObservation: "The inner pointer advances monotonically through t and is never reset across outer iterations. Thus the nested loops execute at most |s| + |t| steps in total, proving linear O(|s| + |t|) time rather than quadratic.",
    coreObservations: [
      "Subsequence characters in s must appear in t in the identical relative order (order is non-commutative).",
      "Greedy matching the earliest occurrence of s[i] in t is always optimal because delaying a match never improves the ability to match subsequent characters.",
      "A monotonic pointer through t ensures each character in t is scanned at most once without backtracking."
    ],
    improvedApproach: {
      title: "Binary Search on Precomputed Index Lists (Multi-Query Stream)",
      intuition: "Map each character in t to a sorted list of its positions. For each char in s, binary search for the smallest index greater than the previous match.",
      algorithm: "1. Precompute a map from character to sorted list of indices in t. 2. For each character c in s, use binary search to find the first index > prevIndex. 3. If no valid index exists, return false. 4. Update prevIndex and continue.",
      timeComplexity: "O(|t| + |s| log |t|)",
      spaceComplexity: "O(|t|)",
      tradeOff: "Requires O(|t|) extra memory and index preprocessing, but enables fast O(|s| log |t|) lookups when checking multiple query strings against static t."
    },
    correctnessReasoning: {
      method: "Greedy Choice Property & Pointer Monotonicity",
      explanation: "Matching the first possible occurrence of s[i] in t preserves the maximum remaining suffix of t for the subsequent characters s[i+1...]. Monotonic forward pointer advancement guarantees character ordering is preserved without backtracking.",
      keyInvariant: "All characters s[0...c-1] have been found in t[0...index-1] in strict relative order.",
      invariants: [
        "All characters s[0...c-1] have been found in t[0...index-1] in strict relative order.",
        "The index pointer in t advances strictly monotonically and is never reset across outer iterations."
      ],
      proofSketch: "By mathematical induction, matching earliest character preserves maximal freedom for subsequent characters without backtracking."
    },
    complexityAnalysis: {
      timeComplexity: "O(|s| + |t|)",
      spaceComplexity: "O(1)",
      auxiliarySpace: "O(1)",
      totalSpace: "O(|s| + |t|)",
      derivation: "Outer loop runs at most |s| times. Inner pointer index increments at most |t| times across the entire algorithm because index is initialized once outside all loops and never reset. Total loop iterations are bounded by |s| + |t|.",
      pointerMovement: "Monotonic forward traversal without backtracking.",
      timeDerivation: "Outer loop runs at most |s| times. Inner pointer index increments at most |t| times across the entire algorithm because index is initialized once outside all loops and never reset. Total loop iterations are bounded by |s| + |t|.",
      spaceDerivation: "O(1) auxiliary space: only two scalar pointer variables (i, index) are allocated."
    },
    codeComparison: [
      { approach: "Brute Force (Subsequence Generation)", intuition: "Generate all 2^|t| subsequences and search for s.", timeComplexity: "O(2^|t|)", auxiliarySpace: "O(|t|)", verdict: "Exponential / TLE on large t", tradeOffs: "Exhaustive combinatorial overhead; infeasible for |t| > 25." },
      { approach: "Student's Solution", intuition: "Two pointers with nested while loop advancing inner pointer monotonically.", timeComplexity: "O(|s| + |t|)", auxiliarySpace: "O(1)", verdict: "Accepted / Asymptotically Optimal", tradeOffs: "Optimal linear complexity; can be simplified to a single while loop." },
      { approach: "Two Pointers Greedy Match", intuition: "Single while loop advancing pointers through s and t.", timeComplexity: "O(|s| + |t|)", auxiliarySpace: "O(1)", verdict: "Canonical Optimal Reference", tradeOffs: "Optimal asymptotic bounds with clean idiomatic pointer logic." }
    ],
    keyTakeaways: [
      "Nested loops do not imply quadratic complexity if the inner index is never reset between outer iterations.",
      "Greedy matching for subsequence verification is globally optimal due to the greedy choice property.",
      "Subsequence checks preserve character ordering and handle duplicate occurrences automatically."
    ],
    edgeCases: [
      { caseName: "Empty s (Empty Subsequence)", input: "s = \"\", t = \"abc\"", expected: "true", explanation: "An empty string is trivially a valid subsequence of any target string.", handledBy: "Loop condition / count comparison" },
      { caseName: "Empty t with Non-Empty s", input: "s = \"abc\", t = \"\"", expected: "false", explanation: "A non-empty string cannot be formed from an empty target string.", handledBy: "Loop boundary check" },
      { caseName: "Order-Preserved Subsequence", input: "s = \"abc\", t = \"ahbgdc\"", expected: "true", explanation: "Characters 'a', 'b', 'c' appear in matching relative order.", handledBy: "Two-pointer forward traversal" },
      { caseName: "Missing / Mismatched Character", input: "s = \"axc\", t = \"ahbgdc\"", expected: "false", explanation: "Character 'x' is not present in t.", handledBy: "Pointer exhaust" },
      { caseName: "Repeated Characters with Order Constraint", input: "s = \"aaaa\", t = \"bbaaa\"", expected: "false", explanation: "Only three 'a' characters exist in t, so four cannot be matched.", handledBy: "Match count verification" }
    ]
  },
  "string-compression": {
    number: 443,
    slug: "string-compression",
    title: "String Compression",
    difficulty: "Medium",
    source: "leetcode",
    sourceUrl: "https://leetcode.com/problems/string-compression/",
    statement: "Given an array of characters chars, compress it using the following algorithm:\n\nBegin with an empty string s. For each group of consecutive repeating characters in chars:\n- If the group's length is 1, append the character to s.\n- Otherwise, append the character followed by the group's length.\n\nThe compressed string s should not be returned separately, but instead, be stored in the input character array chars. Note that group lengths that are 10 or longer will be split into multiple characters in chars.\n\nAfter you are done modifying the input array, return the new length of the array.\n\nYou must write an algorithm that uses only constant extra space.",
    inputDescription: "A character array chars containing single characters.",
    outputDescription: "int: the new length of the compressed array. The array chars is modified in-place.",
    expectedInputType: "Character Array (chars)",
    expectedOutputType: "int (new length of compressed array)",
    constraints: "1 <= chars.length <= 2000\nchars[i] is a lowercase English letter, uppercase English letter, digit, or symbol.",
    examples: [
      { input: "chars = [\"a\",\"a\",\"b\",\"b\",\"c\",\"c\",\"c\"]", output: "6", explanation: "The groups are \"aa\", \"bb\", and \"ccc\". This compresses to \"a2b2c3\". Since the length is 6, return 6, and the first 6 characters of the input array should be: [\"a\",\"2\",\"b\",\"2\",\"c\",\"3\"]." },
      { input: "chars = [\"a\"]", output: "1", explanation: "The only group is \"a\", which remains uncompressed since it's a single character." },
      { input: "chars = [\"a\",\"b\",\"b\",\"b\",\"b\",\"b\",\"b\",\"b\",\"b\",\"b\",\"b\",\"b\",\"b\"]", output: "4", explanation: "The groups are \"a\" and \"bbbbbbbbbbbb\". This compresses to \"ab12\"." }
    ],
    signatures: {
      java: "public int compress(char[] chars)",
      python3: "def compress(self, chars: List[str]) -> int:",
      cpp: "int compress(vector<char>& chars)",
      javascript: "var compress = function(chars) {",
      typescript: "function compress(chars: string[]): number {",
      go: "func compress(chars []byte) int",
      rust: "pub fn compress(chars: &mut Vec<char>) -> i32"
    },
    methodName: {
      java: "compress", python3: "compress", cpp: "compress", javascript: "compress", typescript: "compress", go: "compress", rust: "compress"
    },
    topics: ["Two Pointers", "String"],
    bruteForceTitle: "Auxiliary Buffer Compression",
    bruteForceExplain: "Constructs the compressed string into an external buffer or list, then copies characters back to chars array.",
    bruteForceTime: "O(n)",
    bruteForceSpace: "O(n)",
    optimalTitle: "In-Place Two Pointers Run-Length Encoding",
    optimalExplain: "Maintains read and write pointers in chars, compressing groups in-place with O(1) auxiliary space.",
    optimalTime: "O(n)",
    optimalSpace: "O(1)",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    auxiliarySpace: "O(1)",
    totalSpace: "O(n)",
    timeExplain: "Read pointer traverses the chars array once in O(n) total steps.",
    spaceExplain: "Modifies array strictly in-place; uses only write and read pointers in O(1) auxiliary space.",
    whatItAsks: "Compress repeating consecutive characters in chars in-place and return the new length of the compressed array.",
    inputOutput: "Input: character array chars. Output: integer new length. Modifies chars array in-place.",
    keyObservation: "The write pointer never overtakes the read pointer because every compressed group representation is equal to or shorter than the raw consecutive sequence.",
    coreObservations: [
      "Consecutive identical characters form contiguous runs, allowing single-pass read and write pointers.",
      "The write pointer never overtakes the read pointer because every compressed run length representation is equal to or shorter than the raw character group.",
      "Single-character groups do not append a count digit, whereas counts >= 10 must be split into multiple ASCII digit characters."
    ],
    improvedApproach: {
      title: "Auxiliary Buffer Copy",
      intuition: "Accumulate character runs and formatted digit counts into an auxiliary dynamic buffer, then copy back.",
      algorithm: "1. Iterate through array counting consecutive duplicates. 2. Append character and count (> 1) to dynamic buffer. 3. Copy buffer contents back into chars array and return buffer length.",
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
      tradeOff: "Eliminates complex in-place overwrite indexing, but allocates O(n) auxiliary memory violating the constant O(1) space requirement."
    },
    correctnessReasoning: {
      method: "In-Place Array Compaction Invariant",
      explanation: "Since every compressed group of size L >= 1 occupies at most 1 + floor(log10(L)) slots in chars (which is <= L for all positive integers), write <= read holds at every iteration, guaranteeing that uncompressed characters are never overwritten prematurely.",
      keyInvariant: "chars[0...write-1] contains the valid in-place compressed representation of all groups fully traversed by read pointer.",
      invariants: [
        "write <= read holds at every iteration, guaranteeing that uncompressed characters are never overwritten prematurely.",
        "chars[0...write-1] contains the valid in-place compressed representation of all groups fully traversed by read pointer."
      ],
      proofSketch: "Since every compressed group of size L >= 1 occupies at most 1 + floor(log10(L)) slots in chars (which is <= L for all positive integers), write <= read holds at every iteration, guaranteeing that uncompressed characters are never overwritten prematurely."
    },
    complexityAnalysis: {
      timeComplexity: "O(n)",
      spaceComplexity: "O(1)",
      auxiliarySpace: "O(1)",
      totalSpace: "O(n)",
      derivation: "Read pointer scans each character in chars exactly once. Write pointer writes each compressed character and digit at most once. Total operations scale linearly with n.",
      pointerMovement: "Forward two-pointer compaction where write <= read.",
      timeDerivation: "Read pointer scans each character in chars exactly once. Write pointer writes each compressed character and digit at most once. Total operations scale linearly with n.",
      spaceDerivation: "Modifies array strictly in-place; uses only write and read pointers in O(1) auxiliary space."
    },
    codeComparison: [
      { approach: "Auxiliary Buffer Copy", intuition: "Build compressed representation in an external StringBuilder or list, then copy back.", timeComplexity: "O(n)", auxiliarySpace: "O(n)", verdict: "Valid but violates constant space constraint", tradeOffs: "Simple logic but allocates O(n) extra memory." },
      { approach: "Two Pointers In-Place Run-Length Encoding", intuition: "Maintain read and write pointers, writing character and formatted digits directly in chars.", timeComplexity: "O(n)", auxiliarySpace: "O(1)", verdict: "Canonical Optimal Reference", tradeOffs: "Satisfies in-place O(1) auxiliary space constraint with single-pass speed." }
    ],
    keyTakeaways: [
      "When modifying an array in-place, mathematically verify that write <= read to prevent clobbering unread data.",
      "Count values >= 10 must be converted to individual character digits in chars.",
      "Two pointers allow in-place run-length compaction with O(1) auxiliary memory."
    ],
    edgeCases: [
      { caseName: "Single Character Group", input: "chars = [\"a\"]", expected: "1 (chars = [\"a\"])", explanation: "Groups of length 1 append only the character with no count digit.", handledBy: "Group length check" },
      { caseName: "Multi-Digit Group Count", input: "chars = [\"a\"] * 12", expected: "3 (chars = [\"a\",\"1\",\"2\"])", explanation: "Group lengths >= 10 are split into individual digit characters.", handledBy: "Digit formatting" },
      { caseName: "All Distinct Characters", input: "chars = [\"a\",\"b\",\"c\"]", expected: "3 (chars = [\"a\",\"b\",\"c\"])", explanation: "Every character is unique; output length equals input length.", handledBy: "In-place write" }
    ]
  },
  "max-number-of-k-sum-pairs": {
    number: 1679,
    slug: "max-number-of-k-sum-pairs",
    title: "Max Number of K-Sum Pairs",
    difficulty: "Medium",
    source: "leetcode",
    sourceUrl: "https://leetcode.com/problems/max-number-of-k-sum-pairs/",
    statement: "You are given an integer array nums and an integer k.\n\nIn one operation, you can pick two numbers from the array whose sum equals k and remove them from the array.\n\nReturn the maximum number of operations you can perform on the array.",
    inputDescription: "An integer array nums and an integer target sum k.",
    outputDescription: "int: the maximum number of paired removal operations.",
    expectedInputType: "Integer Array (nums), Integer (k)",
    expectedOutputType: "int (maximum operations)",
    constraints: "1 <= nums.length <= 10^5\n1 <= nums[i] <= 10^9\n1 <= k <= 10^9",
    examples: [
      { input: "nums = [1,2,3,4], k = 5", output: "2", explanation: "Starting with nums = [1,2,3,4]:\n- Remove numbers 1 and 4, then nums = [2,3]\n- Remove numbers 2 and 3, then nums = []\nThere are no more pairs that sum up to 5, hence a total of 2 operations." },
      { input: "nums = [3,1,3,4,3], k = 6", output: "1", explanation: "Starting with nums = [3,1,3,4,3]:\n- Remove the first two 3's, then nums = [1,4,3]\nThere are no more pairs that sum up to 6, hence a total of 1 operation." }
    ],
    signatures: {
      java: "public int maxOperations(int[] nums, int k)",
      python3: "def maxOperations(self, nums: List[int], k: int) -> int:",
      cpp: "int maxOperations(vector<int>& nums, int k)",
      javascript: "var maxOperations = function(nums, k) {",
      typescript: "function maxOperations(nums: number[], k: number): number {",
      go: "func maxOperations(nums []int, k int) int",
      rust: "pub fn max_operations(nums: Vec<i32>, k: i32) -> i32"
    },
    methodName: {
      java: "maxOperations", python3: "maxOperations", cpp: "maxOperations", javascript: "maxOperations", typescript: "maxOperations", go: "maxOperations", rust: "max_operations"
    },
    topics: ["Array", "Hash Table", "Two Pointers", "Sorting"],
    bruteForceTitle: "Exhaustive Nested Search & Removal",
    bruteForceExplain: "Scans all (i, j) pairs with nested loops, marks matched elements as used, and counts pairs.",
    bruteForceTime: "O(n²)",
    bruteForceSpace: "O(n)",
    optimalTitle: "Hash Map Frequencies / Sort + Two Pointers",
    optimalExplain: "Counts complement frequencies using a hash map in O(n) time, or sorts and pairs opposite ends in O(n log n) time.",
    optimalTime: "O(n)",
    optimalSpace: "O(n)",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
    auxiliarySpace: "O(n)",
    totalSpace: "O(n)",
    timeExplain: "Single pass hash table lookup or O(n log n) two-pointer sort traversal.",
    spaceExplain: "Hash table stores element frequencies for up to n numbers.",
    whatItAsks: "Find the maximum number of operations where two numbers summing to k are picked and removed.",
    inputOutput: "Input: integer array nums, integer k. Output: integer maximum paired operations.",
    keyObservation: "Each element can participate in at most one removal. Greedy pairing of complements target - num gives the optimal maximum operations count.",
    coreObservations: [
      "Each element can participate in at most one removal operation.",
      "The complement required for any element x to sum to k is exactly k - x.",
      "A hash frequency map allows O(1) complement checks, reducing pairwise searches from O(n²) to O(n).",
      "Alternatively, sorting the array enables a two-pointer approach converging from opposite ends with O(1) auxiliary space."
    ],
    improvedApproach: {
      title: "Sort and Two Pointers",
      intuition: "Sorting array allows converging two pointers from both ends to find pairs summing to k without auxiliary frequency tracking.",
      algorithm: "Sort the array in ascending order. Place left pointer at 0 and right pointer at n - 1. If sum == k, increment count, left++, right--. If sum < k, left++. If sum > k, right--.",
      limitationAddressed: "Eliminates the O(n) auxiliary memory overhead of the frequency hash table.",
      timeComplexity: "O(n log n)",
      spaceComplexity: "O(1)",
      explanation: "Trades logarithmic time for constant auxiliary space.",
      tradeOff: "Trades O(n log n) sorting time for constant O(1) auxiliary space."
    },
    correctnessReasoning: {
      method: "Disjoint Greedy Pair Consumption",
      explanation: "Greedily matching available complements target - x as early as possible yields the maximum number of disjoint pairs. Consuming a pair removes both numbers from future operations, ensuring no number is counted twice.",
      keyInvariant: "Every counted pair sums to k, and all participating elements are strictly disjoint.",
      invariants: [
        "Every counted pair sums to k, and all participating elements are strictly disjoint.",
        "Each element in nums is consumed in at most one pair."
      ],
      proofSketch: "Greedily matching available complements target - x as early as possible yields the maximum number of disjoint pairs. Consuming a pair removes both numbers from future operations, ensuring no number is counted twice."
    },
    complexityAnalysis: {
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
      auxiliarySpace: "O(n)",
      totalSpace: "O(n)",
      derivation: "A single linear pass traverses nums to look up and decrement complement counts in O(1) average time per element.",
      pointerMovement: "Single pass hash table scan or opposite-end two-pointer convergence.",
      timeDerivation: "A single linear pass traverses nums to look up and decrement complement counts in O(1) average time per element.",
      spaceDerivation: "Hash table stores element frequencies for up to n numbers: O(n) auxiliary space."
    },
    codeComparison: [
      { approach: "Brute Force (Nested Search)", intuition: "Compare all (i, j) pairs with nested loops and mark elements used.", timeComplexity: "O(n²)", auxiliarySpace: "O(n)", verdict: "TLE on large n (10^5 elements)", tradeOffs: "Exhaustive pair checks require up to 10^10 operations." },
      { approach: "Sort + Two Pointers (Improved)", intuition: "Sort array and converge pointers from opposite ends.", timeComplexity: "O(n log n)", auxiliarySpace: "O(1)", verdict: "Accepted / Memory Efficient", tradeOffs: "Requires O(n log n) sorting time but uses only O(1) auxiliary memory." },
      { approach: "Hash Map Frequencies (Optimal)", intuition: "Track available frequencies and greedily pair with complement k - x.", timeComplexity: "O(n)", auxiliarySpace: "O(n)", verdict: "Canonical Optimal Reference", tradeOffs: "Achieves optimal O(n) linear execution time using O(n) hash table space." }
    ],
    keyTakeaways: [
      "Complement lookup k - x reduces pairwise combinatorial search to linear frequency aggregation.",
      "Sorting enables two-pointer convergence when memory is constrained to O(1) auxiliary space.",
      "Each element must be removed or marked upon forming a pair to prevent reuse."
    ],
    edgeCases: [
      { caseName: "No Matching Pairs", input: "nums = [1,2,3], k = 10", expected: "0", explanation: "No two elements sum up to target k.", handledBy: "Zero operation count" },
      { caseName: "All Duplicate Pairs", input: "nums = [2,2,2,2], k = 4", expected: "2", explanation: "Four 2s produce exactly two disjoint pairs.", handledBy: "Frequency decrement" },
      { caseName: "Odd Frequency of Half-k", input: "nums = [3,3,3], k = 6", expected: "1", explanation: "Three 3s form one valid pair; the third 3 remains unpaired.", handledBy: "Integer division" }
    ]
  },
  "two-sum": {
    number: 1,
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    source: "leetcode",
    sourceUrl: "https://leetcode.com/problems/two-sum/",
    statement: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.",
    inputDescription: "An integer array nums and an integer target.",
    outputDescription: "indices of the two numbers such that they add up to target.",
    expectedInputType: "Integer Array (nums), Integer (target)",
    expectedOutputType: "Integer Array [index1, index2]",
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
    topics: ["Array", "Hash Table"]
  },
  "minimum-moves-to-equal-array-elements": {
    number: 453,
    slug: "minimum-moves-to-equal-array-elements",
    title: "Minimum Moves to Equal Array Elements",
    difficulty: "Medium",
    source: "leetcode",
    sourceUrl: "https://leetcode.com/problems/minimum-moves-to-equal-array-elements/",
    statement: "Given an integer array nums of size n, return the minimum number of moves required to make all array elements equal. In one move, you can increment n - 1 elements of the array by 1.",
    inputDescription: "An integer array nums of size n.",
    outputDescription: "int: the minimum number of moves required to make all array elements equal.",
    expectedInputType: "Integer Array (nums)",
    expectedOutputType: "int",
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
    topics: ["Array", "Math"]
  },
  "find-the-duplicate-number": {
    number: 287,
    slug: "find-the-duplicate-number",
    title: "Find the Duplicate Number",
    difficulty: "Medium",
    source: "leetcode",
    sourceUrl: "https://leetcode.com/problems/find-the-duplicate-number/",
    statement: "Given an array of integers nums containing n + 1 integers where each integer is in the range [1, n] inclusive. There is only one repeated number in nums, return this repeated number. You must solve the problem without modifying the array nums and uses only constant extra space.",
    inputDescription: "An array of integers nums containing n + 1 integers in [1, n].",
    outputDescription: "int: the single repeated number.",
    expectedInputType: "Integer Array (nums)",
    expectedOutputType: "int",
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
    topics: ["Array", "Two Pointers", "Binary Search", "Bit Manipulation"]
  },
  "binary-search": {
    number: 704,
    slug: "binary-search",
    title: "Binary Search",
    difficulty: "Easy",
    source: "leetcode",
    sourceUrl: "https://leetcode.com/problems/binary-search/",
    statement: "Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, then return its index. Otherwise, return -1. You must write an algorithm with O(log n) runtime complexity.",
    inputDescription: "A sorted integer array nums and an integer target.",
    outputDescription: "int: index of target if found, otherwise -1.",
    expectedInputType: "Integer Array (nums), Integer (target)",
    expectedOutputType: "int",
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
    topics: ["Array", "Binary Search"]
  },
  "minimize-maximum-pair-sum-in-array": {
    number: 1877,
    slug: "minimize-maximum-pair-sum-in-array",
    title: "Minimize Maximum Pair Sum in Array",
    difficulty: "Medium",
    source: "leetcode",
    sourceUrl: "https://leetcode.com/problems/minimize-maximum-pair-sum-in-array/",
    statement: "The pair sum of a pair (a,b) is equal to a + b. The maximum pair sum is the largest pair sum in a list of pairs. Given an array nums of even length n, pair up the elements into n / 2 pairs such that the maximum pair sum is minimized. Return the minimized maximum pair sum.",
    inputDescription: "An even-length integer array nums.",
    outputDescription: "int: the minimized maximum pair sum.",
    expectedInputType: "Integer Array (nums)",
    expectedOutputType: "int",
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
    topics: ["Array", "Two Pointers", "Greedy", "Sorting"]
  },
  "contains-duplicate": {
    number: 217,
    slug: "contains-duplicate",
    title: "Contains Duplicate",
    difficulty: "Easy",
    source: "leetcode",
    sourceUrl: "https://leetcode.com/problems/contains-duplicate/",
    statement: "Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.",
    inputDescription: "An integer array nums.",
    outputDescription: "boolean: true if any value appears at least twice, false if distinct.",
    expectedInputType: "Integer Array (nums)",
    expectedOutputType: "boolean",
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
    topics: ["Array", "Hash Table", "Sorting"]
  },
  "valid-parentheses": {
    number: 20,
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "Easy",
    source: "leetcode",
    sourceUrl: "https://leetcode.com/problems/valid-parentheses/",
    statement: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if: Open brackets must be closed by the same type of brackets. Open brackets must be closed in the correct order. Every close bracket has a corresponding open bracket of the same type.",
    inputDescription: "A string s containing only parentheses characters '()[]{}'.",
    outputDescription: "boolean: true if the string is valid, false otherwise.",
    expectedInputType: "String (s)",
    expectedOutputType: "boolean",
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
    topics: ["String", "Stack"]
  },
  "best-time-to-buy-and-sell-stock": {
    number: 121,
    slug: "best-time-to-buy-and-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    difficulty: "Easy",
    source: "leetcode",
    sourceUrl: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/",
    statement: "You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock. Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.",
    inputDescription: "An integer array prices of stock prices.",
    outputDescription: "int: maximum profit achievable, or 0 if no profit.",
    expectedInputType: "Integer Array (prices)",
    expectedOutputType: "int",
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
    topics: ["Array", "Dynamic Programming"]
  },
  "make-sum-divisible-by-p": {
    number: 1590,
    slug: "make-sum-divisible-by-p",
    title: "Make Sum Divisible by P",
    difficulty: "Medium",
    source: "leetcode",
    sourceUrl: "https://leetcode.com/problems/make-sum-divisible-by-p/",
    statement: "Given an array of positive integers nums, remove the smallest subarray (possibly empty) such that the sum of the remaining elements is divisible by p. It is not allowed to remove the whole array. Return the length of the smallest subarray that you need to remove, or -1 if it's impossible. A subarray is defined as a contiguous block of elements in the array.",
    inputDescription: "A positive integer array nums and a divisor p.",
    outputDescription: "int: length of smallest subarray to remove, or -1 if impossible.",
    expectedInputType: "Integer Array (nums), Integer (p)",
    expectedOutputType: "int",
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
    topics: ["Array", "Hash Table", "Prefix Sum"]
  }
};

// Populate fast-lookup indexes
const NUMBER_INDEX = new Map();
const SLUG_INDEX = new Map();
const TITLE_INDEX = new Map();

for (const [slug, prob] of Object.entries(CANONICAL_PROBLEMS)) {
  SLUG_INDEX.set(slug, prob);
  if (prob.number) NUMBER_INDEX.set(Number(prob.number), prob);
  TITLE_INDEX.set(prob.title.toLowerCase().trim(), prob);
}

/**
 * Normalizes plain text, markdown, or HTML-derived text into clean string.
 */
function cleanText(input) {
  if (typeof input !== "string") return "";
  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|li|tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extracts problem slug from URL or string safely
 */
function extractSlug(input) {
  if (!input || typeof input !== "string") return null;
  const str = input.trim();
  const urlMatch = str.match(/leetcode\.com\/problems\/([a-z0-9-]+)/i);
  if (urlMatch) return urlMatch[1].toLowerCase();
  if (/^[a-z0-9-]+$/.test(str) && !/^\d+$/.test(str)) return str.toLowerCase();
  return null;
}

/**
 * Strictly extracts problem number.
 * Prevents "3Sum" or "4Sum" from being falsely treated as LeetCode #3 or #4!
 */
function extractNumber(input) {
  if (typeof input === "number" && Number.isInteger(input) && input > 0) return input;
  if (!input || typeof input !== "string") return null;
  const str = input.trim();

  // Pure digits: "392"
  if (/^\d{1,5}$/.test(str)) return Number(str);

  // Hash prefix: "#392", "# 392"
  const hashMatch = str.match(/^#\s*(\d{1,5})\b/);
  if (hashMatch) return Number(hashMatch[1]);

  // Dot, colon, dash prefix: "392. Is Subsequence", "392 - Is Subsequence", "392: Is Subsequence"
  const prefixMatch = str.match(/^(\d{1,5})\s*[\.\:\-]\s+[A-Za-z]/);
  if (prefixMatch) return Number(prefixMatch[1]);

  return null;
}

/**
 * Extracts examples from structured or free-form text.
 */
function extractExamples(text) {
  if (!text || typeof text !== "string") return [];
  const examples = [];
  const exampleRegex = /Example\s*(\d+)?\s*:?\s*[\r\n]*Input:\s*([^\r\n]+(?:\r?\n(?!(?:Output:|Example\s*\d+:|Constraints:))[^\r\n]+)*)[\r\n]*Output:\s*([^\r\n]+)(?:[\r\n]*Explanation:\s*([^\r\n]+(?:\r?\n(?!(?:Example\s*\d+:|Constraints:))[^\r\n]+)*))?/gi;

  let match;
  while ((match = exampleRegex.exec(text)) !== null) {
    examples.push({
      input: match[2]?.trim() || "",
      output: match[3]?.trim() || "",
      ...(match[4] ? { explanation: match[4].trim() } : {})
    });
  }

  return examples;
}

/**
 * Extracts constraints block from text.
 */
function extractConstraints(text) {
  if (!text || typeof text !== "string") return null;
  const match = text.match(/Constraints:?\s*([\s\S]*?)(?=(?:Follow[- ]up:|$|\n\n\n))/i);
  if (match && match[1]) {
    const raw = match[1].trim();
    return raw.replace(/^[•\-\*]\s*/gm, "").trim();
  }
  return null;
}

/**
 * Infers input and output types from method signature or statement text.
 */
function inferInputOutputTypes(signature, statement = "") {
  let expectedInputType = null;
  let expectedOutputType = null;

  if (signature && typeof signature === "string") {
    // Java/C++ style: returnType methodName(argType argName, ...)
    const jm = signature.match(/(?:public\s+)?([A-Za-z0-9_<>[\]]+)\s+\w+\s*\(([^)]*)\)/);
    if (jm) {
      expectedOutputType = jm[1];
      expectedInputType = jm[2].trim() || "void";
    }
    // Python style: def methodName(self, argName: argType, ...) -> returnType:
    const pm = signature.match(/def\s+\w+\s*\(\s*(?:self\s*,\s*)?([^)]*)\)\s*->\s*([^:]+):/);
    if (pm) {
      expectedInputType = pm[1].trim();
      expectedOutputType = pm[2].trim();
    }
  }

  if (!expectedInputType && statement) {
    if (/\bstrings?\s+[a-z]\s+and\s+[a-z]\b/i.test(statement)) {
      expectedInputType = "String (s, t)";
      expectedOutputType = "boolean";
    } else if (/\barray of characters\b|\bcharacter array\b/i.test(statement)) {
      expectedInputType = "Character Array (chars)";
      expectedOutputType = "int";
    } else if (/\binteger array\b|\barray of integers\b/i.test(statement)) {
      expectedInputType = "Integer Array (nums)";
      expectedOutputType = "int or array";
    }
  }

  return { expectedInputType, expectedOutputType };
}

/**
 * Creates canonical problem model instance conforming to Phase 2 schema.
 */
function createCanonicalProblemModel(data = {}) {
  const statement = cleanText(data.statement || data.description || "");
  const examples = Array.isArray(data.examples) && data.examples.length ? data.examples : extractExamples(statement);
  const constraints = data.constraints || extractConstraints(statement) || null;

  const signatures = (data.signatures && typeof data.signatures === "object") ? { ...data.signatures } : {};
  const methodName = (data.methodName && typeof data.methodName === "object") ? { ...data.methodName } : {};

  // Infer input and output types if missing
  const primarySig = signatures.python3 || signatures.java || Object.values(signatures)[0] || "";
  const inferredTypes = inferInputOutputTypes(primarySig, statement);

  const expectedInputType = data.expectedInputType || inferredTypes.expectedInputType || null;
  const expectedOutputType = data.expectedOutputType || inferredTypes.expectedOutputType || null;

  const supportedLanguages = Object.keys(signatures).length ? Object.keys(signatures) : ["c", "cpp", "java", "python3", "javascript", "typescript", "go", "rust"];

  // Determine completeness
  let metadataCompleteness = METADATA_COMPLETENESS.COMPLETE;
  if (!statement && !data.title) {
    metadataCompleteness = METADATA_COMPLETENESS.CODE_ONLY;
  } else if (!constraints || examples.length === 0 || !Object.keys(signatures).length) {
    metadataCompleteness = statement ? METADATA_COMPLETENESS.PARTIAL : METADATA_COMPLETENESS.MINIMAL;
  }

  const status = data.metadataVerificationStatus || (data.isCanonical ? VERIFICATION_STATUSES.VERIFIED : (statement ? VERIFICATION_STATUSES.USER_PROVIDED : VERIFICATION_STATUSES.INSUFFICIENT_CONTEXT));

  const nowIso = new Date().toISOString();

  return {
    problemId: typeof data.number === "number" ? data.number : (typeof data.problemId === "number" ? data.problemId : null),
    number: typeof data.number === "number" ? data.number : (typeof data.problemId === "number" ? data.problemId : null),
    slug: data.slug || "custom-problem",
    title: data.title || "Custom Problem",
    source: data.source || (data.isCanonical ? "leetcode" : "custom"),
    sourceUrl: data.sourceUrl || data.url || (data.slug && !data.slug.startsWith("custom-") ? `https://leetcode.com/problems/${data.slug}/` : null),
    url: data.sourceUrl || data.url || (data.slug && !data.slug.startsWith("custom-") ? `https://leetcode.com/problems/${data.slug}/` : null),
    difficulty: data.difficulty || "Medium",
    statement,
    description: statement, // alias for backwards compatibility
    problemDescription: data.problemDescription || statement || null,
    inputDescription: data.inputDescription || null,
    outputDescription: data.outputDescription || null,
    examples,
    constraints,
    topics: Array.isArray(data.topics) ? data.topics : [],
    tags: Array.isArray(data.topics) ? data.topics : (Array.isArray(data.tags) ? data.tags : []),
    expectedInputType,
    expectedOutputType,
    functionSignature: signatures,
    signatures, // alias
    methodName,
    supportedLanguages,
    metadataCompleteness,
    metadataVerificationStatus: status,
    retrievalMethod: data.retrievalMethod || (data.isCanonical ? "canonical_index" : "user_input"),
    retrievedAt: data.retrievedAt || nowIso,
    updatedAt: data.updatedAt || nowIso,
    ambiguityReason: data.ambiguityReason || null,
    reason: data.reason || data.ambiguityReason || null,
    clarificationNeeded: Boolean(data.clarificationNeeded || status === VERIFICATION_STATUSES.AMBIGUOUS),
    isCanonical: Boolean(data.isCanonical),
    confidence: data.confidence || (status === VERIFICATION_STATUSES.AMBIGUOUS ? "ambiguous" : (status === VERIFICATION_STATUSES.VERIFIED ? "high" : (status === VERIFICATION_STATUSES.PARTIALLY_VERIFIED || status === VERIFICATION_STATUSES.USER_PROVIDED ? "medium" : "low"))),
    timeComplexity: data.timeComplexity || null,
    spaceComplexity: data.spaceComplexity || null,
    auxiliarySpace: data.auxiliarySpace || null,
    totalSpace: data.totalSpace || null,
    timeExplain: data.timeExplain || null,
    spaceExplain: data.spaceExplain || null,
    bruteForceTitle: data.bruteForceTitle || null,
    bruteForceExplain: data.bruteForceExplain || null,
    bruteForceTime: data.bruteForceTime || null,
    bruteForceSpace: data.bruteForceSpace || null,
    optimalTitle: data.optimalTitle || null,
    optimalExplain: data.optimalExplain || null,
    optimalTime: data.optimalTime || null,
    optimalSpace: data.optimalSpace || null,
    whatItAsks: data.whatItAsks || null,
    inputOutput: data.inputOutput || null,
    keyObservation: data.keyObservation || null,
    edgeCases: Array.isArray(data.edgeCases) ? data.edgeCases : [],
    coreObservations: Array.isArray(data.coreObservations) ? data.coreObservations : (data.keyObservation ? [data.keyObservation] : []),
    improvedApproach: data.improvedApproach || null,
    correctnessReasoning: data.correctnessReasoning || null,
    complexityAnalysis: data.complexityAnalysis || null,
    codeComparison: Array.isArray(data.codeComparison) ? data.codeComparison : (Array.isArray(data.comparison) ? data.comparison : []),
    keyTakeaways: Array.isArray(data.keyTakeaways) ? data.keyTakeaways : []
  };
}

/**
 * Phase 3 & 5: Problem Retrieval Engine & Validation
 * Strict tiered retrieval with ambiguity and mismatch detection.
 */
function retrieveProblem({
  problemNumber = null,
  problemSlug = null,
  problemTitle = null,
  problemUrl = null,
  problemDescription = null,
  sourceCode = null,
  language = "python3"
} = {}) {
  const normSlug = extractSlug(problemSlug) || extractSlug(problemUrl);
  const normNumber = extractNumber(problemNumber) || extractNumber(problemTitle);

  // 1. MISMATCH DETECTION: Detect if number and slug contradict each other!
  if (normNumber && normSlug) {
    const numProb = NUMBER_INDEX.get(normNumber);
    const slugProb = SLUG_INDEX.get(normSlug);
    if (numProb && slugProb && numProb.slug !== slugProb.slug) {
      return createCanonicalProblemModel({
        number: normNumber,
        slug: normSlug,
        title: problemTitle || numProb.title,
        metadataVerificationStatus: VERIFICATION_STATUSES.AMBIGUOUS,
        ambiguityReason: `Contradiction detected: Problem #${normNumber} (${numProb.title}) conflicts with slug '${normSlug}' (${slugProb.title}).`,
        retrievalMethod: "ambiguity_detected"
      });
    }
  }

  // 2. Exact Canonical Number Match
  if (normNumber && NUMBER_INDEX.has(normNumber)) {
    const canonical = NUMBER_INDEX.get(normNumber);
    // Double check that problemTitle doesn't contradict canonical
    if (problemTitle && typeof problemTitle === "string") {
      const cleanT = problemTitle.replace(/^#?\d+[\s.-]+/, "").toLowerCase().trim();
      const numFromTitle = extractNumber(problemTitle);
      if (cleanT && TITLE_INDEX.has(cleanT) && TITLE_INDEX.get(cleanT).number !== canonical.number) {
        return createCanonicalProblemModel({
          number: normNumber,
          slug: canonical.slug,
          title: problemTitle,
          metadataVerificationStatus: VERIFICATION_STATUSES.AMBIGUOUS,
          ambiguityReason: `Contradiction detected: Number #${normNumber} (${canonical.title}) conflicts with title '${problemTitle}'.`,
          retrievalMethod: "ambiguity_detected"
        });
      }
    }
    return createCanonicalProblemModel({
      ...canonical,
      isCanonical: true,
      metadataVerificationStatus: VERIFICATION_STATUSES.VERIFIED,
      retrievalMethod: "id_lookup"
    });
  }

  // 3. Exact Canonical Slug Match
  if (normSlug && SLUG_INDEX.has(normSlug)) {
    const canonical = SLUG_INDEX.get(normSlug);
    return createCanonicalProblemModel({
      ...canonical,
      isCanonical: true,
      metadataVerificationStatus: VERIFICATION_STATUSES.VERIFIED,
      retrievalMethod: "slug_lookup"
    });
  }

  // 4. Exact Canonical Title Match (strict, NOT loose substring!)
  if (problemTitle && typeof problemTitle === "string") {
    const cleanT = problemTitle.replace(/^#?\d+[\s.-]+/, "").toLowerCase().trim();
    if (TITLE_INDEX.has(cleanT)) {
      const canonical = TITLE_INDEX.get(cleanT);
      return createCanonicalProblemModel({
        ...canonical,
        isCanonical: true,
        metadataVerificationStatus: VERIFICATION_STATUSES.VERIFIED,
        retrievalMethod: "title_exact"
      });
    }
  }

  // 5. Check if query is completely empty / ambiguous (no title, slug, number, or statement)
  const cleanStatement = cleanText(problemDescription || "");
  const hasUserStatement = cleanStatement.length > 0;
  const rawTitle = (problemTitle || normSlug || "").trim();
  const titleWithoutNum = rawTitle.replace(/^#?\d+[\s.-]+/, "").trim();

  if (!normNumber && !normSlug && !titleWithoutNum && !hasUserStatement) {
    return createCanonicalProblemModel({
      number: null,
      slug: "custom-problem",
      title: "Unidentified Problem",
      source: "user_paste",
      sourceUrl: null,
      statement: "",
      metadataVerificationStatus: VERIFICATION_STATUSES.AMBIGUOUS,
      confidence: "ambiguous",
      clarificationNeeded: true,
      ambiguityReason: "Could not identify problem. Provide a problem title, LeetCode number, URL, or problem statement.",
      retrievalMethod: "ambiguity_detected",
      isCanonical: false
    });
  }

  // 6. User-Provided Problem Context (statement/description explicitly provided)
  if (hasUserStatement) {
    const dynamicSlug = normSlug || (titleWithoutNum && titleWithoutNum !== "Custom Code Review" ? titleWithoutNum.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : "custom-problem");
    const parsedExamples = extractExamples(cleanStatement);
    const parsedConstraints = extractConstraints(cleanStatement);
    const inferred = inferInputOutputTypes(null, cleanStatement);

    return createCanonicalProblemModel({
      number: normNumber,
      slug: dynamicSlug,
      title: titleWithoutNum || (normNumber ? `Problem #${normNumber}` : "Custom Problem"),
      statement: cleanStatement,
      examples: parsedExamples,
      constraints: parsedConstraints,
      expectedInputType: inferred.expectedInputType,
      expectedOutputType: inferred.expectedOutputType,
      metadataVerificationStatus: VERIFICATION_STATUSES.USER_PROVIDED,
      retrievalMethod: "user_input",
      isCanonical: false
    });
  }

  // 7. Non-canonical LeetCode problem with title/slug but NO statement
  if (titleWithoutNum && titleWithoutNum !== "Custom Code Review" && titleWithoutNum !== "Selected submission") {
    const dynamicSlug = normSlug || titleWithoutNum.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return createCanonicalProblemModel({
      number: normNumber,
      slug: dynamicSlug,
      title: titleWithoutNum,
      metadataVerificationStatus: VERIFICATION_STATUSES.PARTIALLY_VERIFIED,
      retrievalMethod: "inferred",
      isCanonical: false
    });
  }

  // 8. Standalone / Code-Only review: No external problem statement supplied
  return createCanonicalProblemModel({
    number: null,
    slug: "custom-code-review",
    title: "Custom Code Review",
    source: "user_paste",
    sourceUrl: null,
    statement: "",
    metadataVerificationStatus: VERIFICATION_STATUSES.INSUFFICIENT_CONTEXT,
    retrievalMethod: "user_input",
    isCanonical: false
  });
}

/**
 * Builds structured, canonical Gemini Prompt Context.
 * Conforms to Phase 6 requirements:
 * Explicitly instructs model on input/output types, supplied constraints,
 * facts vs inferences, and strictly prohibits generic array explanations for string problems.
 */
function buildGeminiPromptContext(problem, language) {
  let context = `CANONICAL PROBLEM SPECIFICATION:\n`;
  context += `Title: ${problem.title}`;
  if (problem.number) context += ` (LeetCode #${problem.number})`;
  context += `\nSlug: ${problem.slug}`;
  context += `\nDifficulty: ${problem.difficulty || "Medium"}`;
  context += `\nContext Quality: ${problem.metadataVerificationStatus} (${problem.metadataCompleteness || "COMPLETE"})`;

  if (problem.expectedInputType) {
    context += `\nExpected Input Type: ${problem.expectedInputType}`;
  }
  if (problem.expectedOutputType) {
    context += `\nExpected Output Type: ${problem.expectedOutputType}`;
  }

  if (problem.statement) {
    context += `\n\nPROBLEM STATEMENT:\n${problem.statement}`;
  } else {
    context += `\n\nPROBLEM STATEMENT:\n[No problem statement supplied. Perform a thorough general code review of the student code.]`;
  }

  if (problem.constraints) {
    context += `\n\nCONSTRAINTS:\n${problem.constraints}`;
  } else if (problem.metadataVerificationStatus !== VERIFICATION_STATUSES.INSUFFICIENT_CONTEXT) {
    context += `\n\nCONSTRAINTS:\n[No explicit constraints supplied. Infer reasonable algorithmic bounds and state your assumptions clearly.]`;
  }

  if (Array.isArray(problem.examples) && problem.examples.length) {
    context += `\n\nVERIFIED EXAMPLES:\n` + problem.examples.map((ex, i) =>
      `Example ${i + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}${ex.explanation ? `\nExplanation: ${ex.explanation}` : ""}`
    ).join("\n\n");
  }

  if (problem.signatures?.[language]) {
    context += `\n\nREQUIRED METHOD SIGNATURE (${String(language).toUpperCase()}):\n${problem.signatures[language]}`;
  }

  if (Array.isArray(problem.topics) && problem.topics.length) {
    context += `\n\nRELEVANT TOPICS:\n${problem.topics.join(", ")}`;
  }

  // Explicit Directives to Gemini (Phase 6)
  context += `\n\nCRITICAL PEDAGOGICAL DIRECTIVES:
1. Solve ONLY the supplied problem "${problem.title}". Do not substitute another problem with a similar name.
2. Respect the actual input and output types (${problem.expectedInputType || "as specified"} -> ${problem.expectedOutputType || "as specified"}).
3. For string problems, NEVER explain the algorithm using integer array analogies or negative numbers.
4. For character arrays (e.g. chars in string compression), remember the array must be modified in-place and return the new length.
5. Use only the supplied constraints. Never invent unstated official examples or constraints.
6. Clearly distinguish verified facts from inferences.
7. If the context is insufficient to verify problem-specific correctness, explain exactly what information is missing.
8. Do not fabricate LeetCode URLs or pretend code was executed in a sandbox unless execution results are provided.
9. ALGORITHMIC & COMPLEXITY FIDELITY:
   - Carefully trace loop variable advancement. If an inner loop pointer is initialized outside and never reset (e.g., advancing monotonically through a string or array), the total steps are bounded by the input sequence lengths: O(|s| + |t|) or O(n). DO NOT automatically classify nested loops as quadratic O(n²).
   - Auxiliary space must reflect only extra allocated memory beyond inputs: integer variables or pointers count as O(1) auxiliary space.
   - For brute-force analysis, describe a genuine valid baseline algorithm with its true complexity (e.g. for Subsequence, generating all 2^|t| subsequences in O(2^|t|) time). Never label a broken partial check as brute force.
   - When student code has already achieved optimal asymptotic bounds, acknowledge that honestly in the comparison: do not claim an asymptotic speedup (e.g. from O(n²) or O(2^n) to O(n)) unless the student's code actually exhibits that baseline bottleneck.
   - Edge cases must match the actual problem input types and domain (e.g., empty string, single character, mismatched order, duplicate counts). Never output unrelated array examples for string problems.
10. STAGED AI REASONING PIPELINE (MODULE 2):
    - Stage 1 (Problem Understanding): State what must be returned, exact input/output types, and core requirements in plain English.
    - Stage 2 (Core Observations): Identify mathematical or sequence properties, monotonicity, invariants, ordering, or frequency constraints that govern the problem. Populate coreObservations array.
    - Stage 3 (Brute Force Reasoning): Describe a genuine baseline approach with its asymptotic complexity and why it falls short on upper constraints.
    - Stage 4 (Improved Approach): If a meaningful intermediate strategy exists (e.g., sorting vs hash table), explain the tradeoff in improvedApproach; if redundant or none, set to null.
    - Stage 5 (Optimal Approach): Detail the optimal algorithm, its core invariant, and step-by-step logic with complete optimal code.
    - Stage 6 (Correctness Reasoning): Prove why the algorithm works using loop invariants, greedy choice property, induction, or monotonic pointer arguments in correctnessReasoning.
    - Stage 7 (Complexity Reasoning): Derive time and auxiliary space from actual pointer steps and allocations in complexityAnalysis. Distinguish auxiliary memory from total memory.
    - Stage 8 (Edge Cases & Constraints): Include boundary cases, empty inputs, single elements, duplicates, and extreme constraints directly from problem specs. Populate codeComparison and keyTakeaways.
11. STUDENT CODE INTELLIGENCE DIRECTIVE (MODULE 3):
    - Ground your code review directly in the student's actual source code.
    - Reference exact 1-based source lines. NEVER fabricate line numbers or code statements that do not exist in the submission.
    - If the submission verdict is "Accepted", acknowledge that the solution is logically correct and passed all test cases. Do not invent false logic bugs, runtime errors, or off-by-one flaws.
    - If the submission verdict is "Wrong Answer" or "Time Limit Exceeded", pinpoint the exact line and invariant that failed.
    - Distinguish auxiliary space from input parameters and recursion call stack cleanly.
    - If student code is unavailable or empty, state that source-level diagnosis is unavailable while providing problem-level guidance.`;

  return context;
}

function resolveProblemIdentity(query = {}) {
  const model = retrieveProblem(query);
  if (model.metadataVerificationStatus === VERIFICATION_STATUSES.AMBIGUOUS) {
    return {
      ...model,
      confidence: "ambiguous",
      clarificationNeeded: true,
      reason: model.ambiguityReason || "Problem identity is ambiguous. Provide the problem title, LeetCode number, URL, or problem statement."
    };
  }
  return model;
}

module.exports = {
  VERIFICATION_STATUSES,
  METADATA_COMPLETENESS,
  CANONICAL_PROBLEMS,
  cleanText,
  extractSlug,
  extractNumber,
  extractExamples,
  extractConstraints,
  inferInputOutputTypes,
  createCanonicalProblemModel,
  retrieveProblem,
  resolveProblemIdentity,
  buildGeminiPromptContext
};
