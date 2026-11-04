"use strict";
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "script.js");
const publicScriptPath = path.join(root, "public", "script.js");

const currentContent = fs.readFileSync(scriptPath, "utf8");
const marker = "/* ==========================================================================\n   AI Code Mentor Workspace Controller";
let splitIdx = currentContent.indexOf(marker);

if (splitIdx === -1) {
  const fallbackMarker = "AI Code Mentor Workspace Controller";
  splitIdx = currentContent.indexOf(fallbackMarker);
  if (splitIdx !== -1) {
    // Find the comment start before this
    const commentStart = currentContent.lastIndexOf("/*", splitIdx);
    if (commentStart !== -1) splitIdx = commentStart;
  }
}

if (splitIdx === -1) {
  console.error("Marker not found in script.js");
  process.exit(1);
}

const before = currentContent.substring(0, splitIdx).trimEnd() + "\n\n";

const replacement = `/* ==========================================================================
   AI Code Mentor Workspace Controller & Educational Engine (Phase 2 Full)
   ========================================================================== */

const PROBLEM_EDUCATIONAL_DATA = {
  "minimum-moves-to-equal-array-elements": {
    title: "Minimum Moves to Equal Array Elements",
    number: "453",
    difficulty: "Medium",
    description: "Given an integer array nums of size n, return the minimum number of moves required to make all array elements equal. In one move, you can increment n - 1 elements of the array by 1.",
    acceptedCode: `class Solution:
    def minMoves(self, nums: list[int]) -> int:
        # Incrementing n - 1 elements by 1 is mathematically equivalent
        # to decrementing 1 element by 1 relative to all other elements.
        # Therefore, to make all elements equal with minimum moves, reduce each element
        # down to the array minimum: moves = sum(nums[i] - min(nums)).
        min_val = min(nums)
        return sum(x - min_val for x in nums)`,
    acceptedCodeByLang: {
      java: `class Solution {
    public int minMoves(int[] nums) {
        // Incrementing n - 1 elements by 1 is mathematically equivalent
        // to decrementing 1 element by 1 relative to all other elements.
        // To make all elements equal with minimum moves, reduce each element
        // down to the array minimum: moves = sum(nums[i] - min(nums)).
        int min = nums[0];
        for (int x : nums) {
            if (x < min) min = x;
        }
        int moves = 0;
        for (int x : nums) {
            moves += x - min;
        }
        return moves;
    }
}`,
      python3: `class Solution:
    def minMoves(self, nums: list[int]) -> int:
        min_val = min(nums)
        return sum(x - min_val for x in nums)`,
      cpp: `class Solution {
public:
    int minMoves(vector<int>& nums) {
        int min_val = nums[0];
        for (int x : nums) {
            if (x < min_val) min_val = x;
        }
        int moves = 0;
        for (int x : nums) {
            moves += x - min_val;
        }
        return moves;
    }
};`,
      javascript: `var minMoves = function(nums) {
    let min = nums[0];
    for (let i = 1; i < nums.length; i++) {
        if (nums[i] < min) min = nums[i];
    }
    let moves = 0;
    for (let i = 0; i < nums.length; i++) {
        moves += nums[i] - min;
    }
    return moves;
};`,
      typescript: `function minMoves(nums: number[]): number {
    let min = nums[0];
    for (let i = 1; i < nums.length; i++) {
        if (nums[i] < min) min = nums[i];
    }
    let moves = 0;
    for (let i = 0; i < nums.length; i++) {
        moves += nums[i] - min;
    }
    return moves;
}`,
      go: `func minMoves(nums []int) int {
    minVal := nums[0]
    for _, x := range nums {
        if x < minVal {
            minVal = x
        }
    }
    moves := 0
    for _, x := range nums {
        moves += x - minVal
    }
    return moves
}`,
      rust: `impl Solution {
    pub fn min_moves(nums: Vec<i32>) -> i32 {
        let min_val = *nums.iter().min().unwrap();
        nums.iter().map(|&x| x - min_val).sum()
    }
}`
    },
    buggyCode: `class Solution:
    def minMoves(self, nums: list[int]) -> int:
        # Naive simulation: find max and increment all other n - 1 elements until equal
        # Time complexity: O(n * (max - min)) -> Causes Time Limit Exceeded (TLE)
        moves = 0
        while len(set(nums)) > 1:
            max_idx = nums.index(max(nums))
            for i in range(len(nums)):
                if i != max_idx:
                    nums[i] += 1
            moves += 1
        return moves`,
    buggyCodeByLang: {
      java: `class Solution {
    public int minMoves(int[] nums) {
        // Naive simulation: repeatedly increment n - 1 elements until all elements are equal
        // Bottleneck: O(n * (max - min)) time complexity leads to Time Limit Exceeded (TLE)
        int moves = 0;
        while (true) {
            int minIdx = 0, maxIdx = 0;
            for (int i = 1; i < nums.length; i++) {
                if (nums[i] < nums[minIdx]) minIdx = i;
                if (nums[i] > nums[maxIdx]) maxIdx = i;
            }
            if (nums[minIdx] == nums[maxIdx]) break;
            for (int i = 0; i < nums.length; i++) {
                if (i != maxIdx) nums[i]++;
            }
            moves++;
        }
        return moves;
    }
}`,
      python3: `class Solution:
    def minMoves(self, nums: list[int]) -> int:
        moves = 0
        while len(set(nums)) > 1:
            max_idx = nums.index(max(nums))
            for i in range(len(nums)):
                if i != max_idx:
                    nums[i] += 1
            moves += 1
        return moves`,
      cpp: `class Solution {
public:
    int minMoves(vector<int>& nums) {
        int moves = 0;
        while (true) {
            int min_idx = 0, max_idx = 0;
            for (int i = 1; i < (int)nums.size(); i++) {
                if (nums[i] < nums[min_idx]) min_idx = i;
                if (nums[i] > nums[max_idx]) max_idx = i;
            }
            if (nums[min_idx] == nums[max_idx]) break;
            for (int i = 0; i < (int)nums.size(); i++) {
                if (i != max_idx) nums[i]++;
            }
            moves++;
        }
        return moves;
    }
};`,
      javascript: `var minMoves = function(nums) {
    let moves = 0;
    while (true) {
        let minIdx = 0, maxIdx = 0;
        for (let i = 1; i < nums.length; i++) {
            if (nums[i] < nums[minIdx]) minIdx = i;
            if (nums[i] > nums[maxIdx]) maxIdx = i;
        }
        if (nums[minIdx] === nums[maxIdx]) break;
        for (let i = 0; i < nums.length; i++) {
            if (i !== maxIdx) nums[i]++;
        }
        moves++;
    }
    return moves;
};`,
      typescript: `function minMoves(nums: number[]): number {
    let moves = 0;
    while (true) {
        let minIdx = 0, maxIdx = 0;
        for (let i = 1; i < nums.length; i++) {
            if (nums[i] < nums[minIdx]) minIdx = i;
            if (nums[i] > nums[maxIdx]) maxIdx = i;
        }
        if (nums[minIdx] === nums[maxIdx]) break;
        for (let i = 0; i < nums.length; i++) {
            if (i !== maxIdx) nums[i]++;
        }
        moves++;
    }
    return moves;
}`,
      go: `func minMoves(nums []int) int {
    moves := 0
    for {
        minIdx, maxIdx := 0, 0
        for i := 1; i < len(nums); i++ {
            if nums[i] < nums[minIdx] { minIdx = i }
            if nums[i] > nums[maxIdx] { maxIdx = i }
        }
        if nums[minIdx] == nums[maxIdx] { break }
        for i := range nums {
            if i != maxIdx { nums[i]++ }
        }
        moves++
    }
    return moves
}`,
      rust: `impl Solution {
    pub fn min_moves(mut nums: Vec<i32>) -> i32 {
        let mut moves = 0;
        loop {
            let mut min_idx = 0;
            let mut max_idx = 0;
            for i in 1..nums.len() {
                if nums[i] < nums[min_idx] { min_idx = i; }
                if nums[i] > nums[max_idx] { max_idx = i; }
            }
            if nums[min_idx] == nums[max_idx] { break; }
            for i in 0..nums.len() {
                if i != max_idx { nums[i] += 1; }
            }
            moves += 1;
        }
        moves
    }
}`
    },
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    timeExplain: "Single pass to identify min(nums) followed by linear summation of (nums[i] - min)",
    spaceExplain: "O(1) auxiliary memory using only primitive scalar accumulators",
    bruteForceTitle: "Step-by-step Naive Simulation",
    bruteForceTime: "O(n² · (max - min))",
    bruteForceSpace: "O(1)",
    bruteForceExplain: "Incrementing n - 1 elements one by one takes O(n * (max - min)) steps, leading to TLE.",
    optimalTitle: "Mathematical Equivalence Reduction",
    optimalTime: "O(n)",
    optimalSpace: "O(1)",
    optimalExplain: "Incrementing n - 1 elements by 1 is relatively identical to decrementing 1 element by 1 towards min(nums).",
    mistakeTitle: "Simulation Bottleneck (TLE)",
    mistakeDetail: "Simulating incrementing n - 1 numbers one move at a time takes O(n * (max - min)) steps. For large values like 10^9, this requires millions of iterations and results in Time Limit Exceeded (TLE).",
    mistakeFix: "Transform the perspective: incrementing n - 1 elements by 1 is mathematically identical to decrementing 1 element by 1 relative to the others. Every element must reach min(nums), so total moves = sum(nums[i] - min).",
    counterExample: "nums = [1, 1000000000] -> Naive simulation requires 999,999,999 iterations. Mathematical formula solves in O(1) operations directly: 1000000000 - 1 = 999999999.",
    takeaways: [
      "Perspective shift: Incrementing n - 1 elements by 1 is relatively equivalent to decrementing 1 element by 1.",
      "Target baseline: To minimize moves, reduce every element to the global minimum min(nums).",
      "Formula: Total moves = sum(nums[i] - min(nums)) = sum(nums) - n * min(nums).",
      "Avoid 32-bit integer overflow by accumulating (x - min) rather than computing sum(nums) first when numbers are large."
    ],
    hints: [
      "Hint 1: Think about relative differences. Does incrementing n - 1 elements change the gap between them and the maximum?",
      "Hint 2: Incrementing n - 1 elements by 1 is equivalent to decrementing 1 element by 1 relative to the other elements.",
      "Hint 3: To make all elements equal, what value should they all be reduced to? (Answer: the minimum element min(nums))."
    ],
    dryRun: {
      headers: ["Step", "Index", "nums[i]", "min(nums)", "Calculation (x - min)", "Cumulative Moves"],
      rows: [
        ["1", "—", "—", "1", "Find minimum of [1, 2, 3]", "0"],
        ["2", "i = 0", "1", "1", "moves += 1 - 1 = 0", "0"],
        ["3", "i = 1", "2", "1", "moves += 2 - 1 = 1", "1"],
        ["4", "i = 2", "3", "1", "moves += 3 - 1 = 2", "3 (Optimal Answer)"]
      ]
    },
    animatic: {
      initialState: {
        array: [1, 2, 3],
        highlightIndices: [],
        pointers: { min: -1, i: -1 },
        caption: "Input array nums = [1, 2, 3]. Goal: Equalize all elements with minimum moves."
      },
      steps: [
        {
          lineIndex: 2,
          description: "Scan array to find global minimum: min = 1 at index 0.",
          state: {
            array: [1, 2, 3],
            highlightIndices: [0],
            pointers: { min: 0 },
            caption: "Minimum element identified: min(nums) = 1."
          }
        },
        {
          lineIndex: 6,
          description: "Inspect nums[0] = 1. Difference from min: 1 - 1 = 0. Moves so far: 0.",
          state: {
            array: [1, 2, 3],
            highlightIndices: [0],
            pointers: { min: 0, i: 0 },
            caption: "Index 0 is already at minimum (1 - 1 = 0). Total moves = 0."
          }
        },
        {
          lineIndex: 7,
          description: "Inspect nums[1] = 2. Difference from min: 2 - 1 = 1. Moves so far: 1.",
          state: {
            array: [1, 2, 3],
            highlightIndices: [1],
            pointers: { min: 0, i: 1 },
            caption: "Index 1 needs 1 decrement to reach min (2 - 1 = 1). Total moves = 1."
          }
        },
        {
          lineIndex: 7,
          description: "Inspect nums[2] = 3. Difference from min: 3 - 1 = 2. Moves so far: 1 + 2 = 3.",
          state: {
            array: [1, 2, 3],
            highlightIndices: [2],
            pointers: { min: 0, i: 2 },
            caption: "Index 2 needs 2 decrements to reach min (3 - 1 = 2). Total moves = 3."
          }
        },
        {
          lineIndex: 9,
          description: "All elements accounted for. Total moves required = 3. Array equalized!",
          state: {
            array: [1, 1, 1],
            highlightIndices: [0, 1, 2],
            pointers: {},
            caption: "Result: 3 moves to equalize array [1, 2, 3] to [1, 1, 1] relative baseline."
          }
        }
      ]
    }
  },
  "find-the-duplicate-number": {
    title: "Find the Duplicate Number",
    number: "287",
    difficulty: "Medium",
    description: "Given an array of integers nums containing n + 1 integers where each integer is in the range [1, n] inclusive. There is only one repeated number in nums, return this repeated number. You must solve the problem without modifying the array nums and uses only constant extra space O(1).",
    acceptedCode: \`class Solution:
    def findDuplicate(self, nums: list[int]) -> int:
        # Floyd's Cycle Detection (Tortoise and Hare)
        # Phase 1: Locate the intersection point within the cycle
        slow = nums[0]
        fast = nums[0]
        while True:
            slow = nums[slow]
            fast = nums[nums[fast]]
            if slow == fast:
                break

        # Phase 2: Find the entrance to the cycle (the duplicate)
        slow = nums[0]
        while slow != fast:
            slow = nums[slow]
            fast = nums[fast]
        return slow\`,
    acceptedCodeByLang: {
      java: \`class Solution {
    public int findDuplicate(int[] nums) {
        // Floyd's Cycle Detection (Tortoise & Hare)
        // Phase 1: Detect cycle intersection
        int slow = nums[0];
        int fast = nums[0];
        do {
            slow = nums[slow];
            fast = nums[nums[fast]];
        } while (slow != fast);

        // Phase 2: Locate cycle entrance
        slow = nums[0];
        while (slow != fast) {
            slow = nums[slow];
            fast = nums[fast];
        }
        return slow;
    }
}\`,
      python3: \`class Solution:
    def findDuplicate(self, nums: list[int]) -> int:
        slow = fast = nums[0]
        while True:
            slow = nums[slow]
            fast = nums[nums[fast]]
            if slow == fast:
                break
        slow = nums[0]
        while slow != fast:
            slow = nums[slow]
            fast = nums[fast]
        return slow\`,
      cpp: \`class Solution {
public:
    int findDuplicate(vector<int>& nums) {
        int slow = nums[0], fast = nums[0];
        do {
            slow = nums[slow];
            fast = nums[nums[fast]];
        } while (slow != fast);
        slow = nums[0];
        while (slow != fast) {
            slow = nums[slow];
            fast = nums[fast];
        }
        return slow;
    }
};\`,
      javascript: \`var findDuplicate = function(nums) {
    let slow = nums[0], fast = nums[0];
    do {
        slow = nums[slow];
        fast = nums[nums[fast]];
    } while (slow !== fast);
    slow = nums[0];
    while (slow !== fast) {
        slow = nums[slow];
        fast = nums[fast];
    }
    return slow;
};\`,
      typescript: \`function findDuplicate(nums: number[]): number {
    let slow: number = nums[0];
    let fast: number = nums[0];
    do {
        slow = nums[slow];
        fast = nums[nums[fast]];
    } while (slow !== fast);
    slow = nums[0];
    while (slow !== fast) {
        slow = nums[slow];
        fast = nums[fast];
    }
    return slow;
}\`,
      go: \`func findDuplicate(nums []int) int {
    slow, fast := nums[0], nums[0]
    for {
        slow = nums[slow]
        fast = nums[nums[fast]]
        if slow == fast {
            break
        }
    }
    slow = nums[0]
    for slow != fast {
        slow = nums[slow]
        fast = nums[fast]
    }
    return slow
}\`,
      rust: \`impl Solution {
    pub fn find_duplicate(nums: Vec<i32>) -> i32 {
        let mut slow = nums[0] as usize;
        let mut fast = nums[0] as usize;
        loop {
            slow = nums[slow] as usize;
            fast = nums[nums[fast] as usize] as usize;
            if slow == fast { break; }
        }
        slow = nums[0] as usize;
        while slow != fast {
            slow = nums[slow] as usize;
            fast = nums[fast] as usize;
        }
        slow as i32
    }
}\`
    },
    buggyCode: \`class Solution:
    def findDuplicate(self, nums: list[int]) -> int:
        # Inefficient nested loops: O(n²) time results in Time Limit Exceeded
        for i in range(len(nums)):
            for j in range(i + 1, len(nums)):
                if nums[i] == nums[j]:
                    return nums[i]
        return -1\`,
    buggyCodeByLang: {
      java: \`class Solution {
    public int findDuplicate(int[] nums) {
        // Inefficient nested loops: O(n²) time results in Time Limit Exceeded
        for (int i = 0; i < nums.length; i++) {
            for (int j = i + 1; j < nums.length; j++) {
                if (nums[i] == nums[j]) return nums[i];
            }
        }
        return -1;
    }
}\`,
      python3: \`class Solution:
    def findDuplicate(self, nums: list[int]) -> int:
        for i in range(len(nums)):
            for j in range(i + 1, len(nums)):
                if nums[i] == nums[j]: return nums[i]
        return -1\`,
      cpp: \`class Solution {
public:
    int findDuplicate(vector<int>& nums) {
        for (int i = 0; i < nums.size(); ++i) {
            for (int j = i + 1; j < nums.size(); ++j) {
                if (nums[i] == nums[j]) return nums[i];
            }
        }
        return -1;
    }
};\`,
      javascript: \`var findDuplicate = function(nums) {
    for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
            if (nums[i] === nums[j]) return nums[i];
        }
    }
    return -1;
};\`,
      typescript: \`function findDuplicate(nums: number[]): number {
    for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
            if (nums[i] === nums[j]) return nums[i];
        }
    }
    return -1;
}\`,
      go: \`func findDuplicate(nums []int) int {
    for i := 0; i < len(nums); i++ {
        for j := i + 1; j < len(nums); j++ {
            if nums[i] == nums[j] { return nums[i] }
        }
    }
    return -1
}\`,
      rust: \`impl Solution {
    pub fn find_duplicate(nums: Vec<i32>) -> i32 {
        for i in 0..nums.len() {
            for j in (i + 1)..nums.len() {
                if nums[i] == nums[j] { return nums[i]; }
            }
        }
        -1
    }
}\`
    },
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    timeExplain: "Traverses cycle proportional to array length, terminating in linear time",
    spaceExplain: "Uses only two pointer variables (slow & fast) with zero array mutation",
    bruteForceTitle: "Nested Loop Search",
    bruteForceTime: "O(n²)",
    bruteForceSpace: "O(1)",
    bruteForceExplain: "Compares every pair (i, j). Exceeds 10¹⁰ operations for n=100,000, triggering TLE.",
    optimalTitle: "Floyd's Tortoise and Hare Cycle Detection",
    optimalTime: "O(n)",
    optimalSpace: "O(1)",
    optimalExplain: "Maps values to indices. Cycle entrance is mathematically guaranteed to be the duplicate.",
    mistakeTitle: "Performance Bottleneck: O(n²) Complexity Exceeds Time Limit",
    mistakeDetail: "Using nested loops to compare elements requires O(n²) comparisons. With n = 100,000, this takes over 10¹⁰ operations, failing with Time Limit Exceeded (TLE). A HashSet violates O(1) space, while sorting violates array immutability.",
    mistakeFix: "Model the array as a functional pointer graph where node i points to nums[i]. By Dirichlet's Pigeonhole Principle, at least one cycle exists. Use Floyd's Tortoise and Hare algorithm.",
    takeaways: [
      "Pigeonhole Principle: n+1 integers spanning [1, n] mathematically ensures at least one duplicate exists.",
      "Graph Interpretation: Elements serve as pointers (i -> nums[i]), creating a linked list with a cycle.",
      "Floyd's Algorithm: 2-phase pointer traversal locates the cycle entrance in O(n) time and O(1) space."
    ],
    hints: [
      "Hint 1: Can you treat the array elements as pointers to indices (i -> nums[i])?",
      "Hint 2: Since numbers are between 1 and n, this directed graph must contain at least one directed cycle.",
      "Hint 3: Use Floyd's Tortoise and Hare: advance slow by 1 step and fast by 2 steps until they collide, then reset slow to nums[0]."
    ],
    dryRun: {
      headers: ["Step", "Slow Pointer", "Fast Pointer", "State", "Action"],
      rows: [
        ["1", "slow = nums[0] (1)", "fast = nums[0] (1)", "Initialization", "Start Floyd's cycle traversal"],
        ["2", "slow = nums[1] (3)", "fast = nums[nums[1]] (2)", "Phase 1: Advancing", "Slow 1x, Fast 2x"],
        ["3", "slow = nums[3] (2)", "fast = nums[nums[2]] (2)", "Collision Detected!", "Intersection confirmed inside cycle"],
        ["4", "slow = nums[0] (1)", "fast = 2", "Phase 2: Reset", "Slow reset to array head"],
        ["5", "slow = nums[1] (3)", "fast = nums[2] (4)", "Advancing 1x", "Both advance at 1 step/sec"],
        ["6", "slow = 2", "fast = 2", "Cycle Entrance!", "Duplicate 2 identified in O(n) time"]
      ]
    },
    animatic: {
      type: "cycle-detection",
      target: 2,
      nums: [1, 3, 4, 2, 2],
      steps: [
        {
          step: 1,
          slow: 0,
          fast: 0,
          reaction: "insight",
          formula: "slow = nums[0] = 1, fast = nums[0] = 1",
          speech: "Welcome! To find the duplicate without extra space, we treat nums as a linked list where value nums[i] is the next pointer.",
          action: "Initialize Tortoise (slow) and Hare (fast) at index 0."
        },
        {
          step: 2,
          slow: 1,
          fast: 2,
          reaction: "insight",
          formula: "slow -> nums[0]=1; fast -> nums[nums[0]]=nums[1]=3 -> 2",
          speech: "Phase 1: Slow advances 1 step (to value 1). Fast advances 2 steps (to value 2).",
          action: "Advance pointers at different speeds."
        },
        {
          step: 3,
          slow: 3,
          fast: 4,
          reaction: "insight",
          formula: "slow -> nums[1]=3; fast -> nums[nums[2]]=nums[4]=2",
          speech: "Phase 1: Slow moves to value 3 (index 1). Fast hops two steps to value 2 (index 4).",
          action: "Continue cycle traversal."
        },
        {
          step: 4,
          slow: 3,
          fast: 3,
          matchedIndices: [3],
          reaction: "match",
          formula: "slow == fast == 2 (Cycle Intersection Detected!)",
          speech: "Phase 1 Complete! Slow and Fast collide at value 2! An intersection inside the cycle is confirmed.",
          action: "Collision detected! Switch to Phase 2."
        },
        {
          step: 5,
          slow: 0,
          fast: 3,
          reaction: "insight",
          formula: "Reset slow = 0; keep fast at collision point (index 3, value 2)",
          speech: "Phase 2: Reset Slow to the head of the array (index 0). Both pointers will now advance at the same 1x speed.",
          action: "Prepare equal-speed traversal to find cycle entrance."
        },
        {
          step: 6,
          slow: 3,
          fast: 3,
          matchedIndices: [3, 4],
          reaction: "optimal",
          formula: "Pointers meet at cycle entrance value = 2 (Duplicate Found!)",
          speech: "Success! Slow and Fast meet exactly at the cycle entrance, revealing duplicate number 2 in O(n) time and O(1) space!",
          action: "Return duplicate value: 2."
        }
      ]
    }
  },
  "two-sum": {
    title: "Two Sum",
    number: "1",
    difficulty: "Easy",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
    acceptedCode: \`class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []\`,
    acceptedCodeByLang: {
      java: \`class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (seen.containsKey(complement)) {
                return new int[] { seen.get(complement), i };
            }
            seen.put(nums[i], i);
        }
        return new int[0];
    }
}\`,
      python3: \`class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {}
        for i, num in enumerate(nums):
            comp = target - num
            if comp in seen:
                return [seen[comp], i]
            seen[num] = i
        return []\`,
      cpp: \`class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;
        for (int i = 0; i < nums.size(); ++i) {
            int comp = target - nums[i];
            if (seen.count(comp)) return { seen[comp], i };
            seen[nums[i]] = i;
        }
        return {};
    }
};\`,
      javascript: \`var twoSum = function(nums, target) {
    const seen = new Map();
    for (let i = 0; i < nums.length; i++) {
        const comp = target - nums[i];
        if (seen.has(comp)) return [seen.get(comp), i];
        seen.set(nums[i], i);
    }
    return [];
};\`,
      typescript: \`function twoSum(nums: number[], target: number): number[] {
    const seen = new Map<number, number>();
    for (let i = 0; i < nums.length; i++) {
        const comp = target - nums[i];
        if (seen.has(comp)) return [seen.get(comp)!, i];
        seen.set(nums[i], i);
    }
    return [];
}\`,
      go: \`func twoSum(nums []int, target int) []int {
    seen := make(map[int]int)
    for i, num := range nums {
        comp := target - num
        if idx, ok := seen[comp]; ok {
            return []int{idx, i}
        }
        seen[num] = i
    }
    return nil
}\`,
      rust: \`use std::collections::HashMap;

impl Solution {
    pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {
        let mut seen = HashMap::new();
        for (i, &num) in nums.iter().enumerate() {
            let comp = target - num;
            if let Some(&idx) = seen.get(&comp) {
                return vec![idx as i32, i as i32];
            }
            seen.insert(num, i);
        }
        vec![]
    }
}\`
    },
    buggyCode: \`class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        # Buggy implementation: Self-pairing bug using identical index
        for i in range(len(nums)):
            for j in range(len(nums)):
                if nums[i] + nums[j] == target:
                    return [i, j] # Fails when target=6, nums=[3,2,4] -> returns [0, 0]
        return []\`,
    buggyCodeByLang: {
      java: \`class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Buggy implementation: Self-pairing bug using identical index
        for (int i = 0; i < nums.length; i++) {
            for (int j = 0; j < nums.length; j++) {
                if (nums[i] + nums[j] == target) return new int[] { i, j };
            }
        }
        return new int[0];
    }
}\`,
      python3: \`class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        for i in range(len(nums)):
            for j in range(len(nums)):
                if nums[i] + nums[j] == target: return [i, j]
        return []\`,
      cpp: \`class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        for (int i = 0; i < nums.size(); ++i) {
            for (int j = 0; j < nums.size(); ++j) {
                if (nums[i] + nums[j] == target) return { i, j };
            }
        }
        return {};
    }
};\`,
      javascript: \`var twoSum = function(nums, target) {
    for (let i = 0; i < nums.length; i++) {
        for (let j = 0; j < nums.length; j++) {
            if (nums[i] + nums[j] === target) return [i, j];
        }
    }
    return [];
};\`,
      typescript: \`function twoSum(nums: number[], target: number): number[] {
    for (let i = 0; i < nums.length; i++) {
        for (let j = 0; j < nums.length; j++) {
            if (nums[i] + nums[j] === target) return [i, j];
        }
    }
    return [];
}\`,
      go: \`func twoSum(nums []int, target int) []int {
    for i := 0; i < len(nums); i++ {
        for j := 0; j < len(nums); j++ {
            if nums[i] + nums[j] == target { return []int{i, j} }
        }
    }
    return nil
}\`,
      rust: \`impl Solution {
    pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {
        for i in 0..nums.len() {
            for j in 0..nums.len() {
                if nums[i] + nums[j] == target { return vec![i as i32, j as i32]; }
            }
        }
        vec![]
    }
}\`
    },
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
    timeExplain: "Single pass through the array with O(1) hash map lookups",
    spaceExplain: "Stores up to n elements in auxiliary hash map",
    bruteForceTitle: "Nested Loops",
    bruteForceTime: "O(n²)",
    bruteForceSpace: "O(1)",
    bruteForceExplain: "Checks every pair (i, j). Inefficient on large arrays (10⁴ elements = 10⁸ ops).",
    optimalTitle: "One-Pass Hash Map Lookup",
    optimalTime: "O(n)",
    optimalSpace: "O(n)",
    optimalExplain: "Computes complement target - nums[i] and checks seen elements in O(1) average time.",
    mistakeTitle: "Self-Pairing Bug: Duplicate Index Returned",
    mistakeDetail: "When target = 6 and nums = [3, 2, 4], nested search starting j from 0 pairs nums[0] with itself, returning [0, 0] instead of [1, 2].",
    mistakeFix: "Query the hash map before inserting the current element, or ensure index j > i to avoid self-pairing.",
    takeaways: [
      "Complement Search: Looking up (target - num) converts a quadratic search into a constant-time O(1) query.",
      "One-Pass Technique: Check the map before adding the current element to avoid pairing an element with itself.",
      "Trade-off: Spending O(n) auxiliary memory drops runtime from quadratic O(n²) to linear O(n)."
    ],
    hints: [
      "Hint 1: Can you remember previously seen numbers so you don't have to scan the remaining array?",
      "Hint 2: For each element x, what exact value are you looking for? (target - x).",
      "Hint 3: Use a Hash Map to store values and their indices. Query if complement exists before inserting current value."
    ],
    dryRun: {
      headers: ["Step", "i", "nums[i]", "Complement (9 - nums[i])", "Seen Map", "Action"],
      rows: [
        ["1", "0", "2", "7", "{}", "7 not in map; insert {2: 0}"],
        ["2", "1", "7", "2", "{2: 0}", "2 in map! Found pair indices [0, 1]"],
        ["3", "Result", "-", "-", "-", "Return [0, 1] in O(1) lookups"]
      ]
    },
    animatic: {
      type: "array-map",
      target: 9,
      nums: [2, 7, 11, 15],
      steps: [
        {
          step: 1,
          pointer: 0,
          currentVal: 2,
          complement: 7,
          inMap: false,
          reaction: "insight",
          formula: "complement = 9 - nums[0] = 9 - 2 = 7",
          speech: "First step: Examine element at index 0 (value 2). We need 7 to reach target 9. Is 7 in our hash map? No.",
          action: "Check hash map for complement 7. Not found, so record {2: 0}."
        },
        {
          step: 2,
          pointer: 1,
          currentVal: 7,
          complement: 2,
          inMap: true,
          matchedIndices: [0, 1],
          reaction: "match",
          formula: "complement = 9 - nums[1] = 9 - 7 = 2 (Found in map!)",
          speech: "Match found! At index 1 (value 7), the complement 2 exists at index 0 in our map! Return [0, 1].",
          action: "Match found! Return pair indices [0, 1]."
        }
      ]
    }
  },
  "minimize-maximum-pair-sum-in-array": {
    title: "Minimize Maximum Pair Sum in Array",
    number: "1877",
    difficulty: "Medium",
    description: "The pair sum of a pair (a, b) is equal to a + b. The maximum pair sum is the largest pair sum in a list of pairs. Given an array nums of even length n, pair up the elements of nums into n / 2 pairs such that: each element is in exactly one pair, and the maximum pair sum is minimized. Return the minimized maximum pair sum.",
    acceptedCode: \`class Solution:
    def minPairSum(self, nums: list[int]) -> int:
        nums.sort()
        n = len(nums)
        max_sum = 0
        for i in range(n // 2):
            max_sum = max(max_sum, nums[i] + nums[n - 1 - i])
        return max_sum\`,
    acceptedCodeByLang: {
      java: \`class Solution {
    public int minPairSum(int[] nums) {
        Arrays.sort(nums);
        int max = 0;
        int n = nums.length;
        for (int i = 0; i < n / 2; i++) {
            max = Math.max(max, nums[i] + nums[n - 1 - i]);
        }
        return max;
    }
}\`,
      python3: \`class Solution:
    def minPairSum(self, nums: list[int]) -> int:
        nums.sort()
        n = len(nums)
        return max(nums[i] + nums[n - 1 - i] for i in range(n // 2))\`,
      cpp: \`class Solution {
public:
    int minPairSum(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        int ans = 0, n = nums.size();
        for (int i = 0; i < n / 2; ++i) {
            ans = max(ans, nums[i] + nums[n - 1 - i]);
        }
        return ans;
    }
};\`,
      javascript: \`var minPairSum = function(nums) {
    nums.sort((a, b) => a - b);
    let max = 0, n = nums.length;
    for (let i = 0; i < n / 2; i++) {
        max = Math.max(max, nums[i] + nums[n - 1 - i]);
    }
    return max;
};\`,
      typescript: \`function minPairSum(nums: number[]): number {
    nums.sort((a, b) => a - b);
    let max = 0, n = nums.length;
    for (let i = 0; i < n / 2; i++) {
        max = Math.max(max, nums[i] + nums[n - 1 - i]);
    }
    return max;
}\`,
      go: \`func minPairSum(nums []int) int {
    sort.Ints(nums)
    maxSum, n := 0, len(nums)
    for i := 0; i < n/2; i++ {
        sum := nums[i] + nums[n-1-i]
        if sum > maxSum { maxSum = sum }
    }
    return maxSum
}\`,
      rust: \`impl Solution {
    pub fn min_pair_sum(mut nums: Vec<i32>) -> i32 {
        nums.sort();
        let n = nums.len();
        let mut max_sum = 0;
        for i in 0..(n / 2) {
            max_sum = max_sum.max(nums[i] + nums[n - 1 - i]);
        }
        max_sum
    }
}\`
    },
    buggyCode: \`class Solution:
    def minPairSum(self, nums: list[int]) -> int:
        # Buggy / Suboptimal: Arbitrary consecutive pairing without sorting
        max_sum = 0
        for i in range(0, len(nums), 2):
            max_sum = max(max_sum, nums[i] + nums[i + 1])
        return max_sum\`,
    buggyCodeByLang: {
      java: \`class Solution {
    public int minPairSum(int[] nums) {
        // Buggy pairing: fails when array is unsorted
        int max = 0;
        for (int i = 0; i < nums.length; i += 2) {
            max = Math.max(max, nums[i] + nums[i + 1]);
        }
        return max;
    }
}\`,
      python3: \`class Solution:
    def minPairSum(self, nums: list[int]) -> int:
        return max(nums[i] + nums[i + 1] for i in range(0, len(nums), 2))\`,
      cpp: \`class Solution {
public:
    int minPairSum(vector<int>& nums) {
        int ans = 0;
        for (int i = 0; i < nums.size(); i += 2) ans = max(ans, nums[i] + nums[i + 1]);
        return ans;
    }
};\`,
      javascript: \`var minPairSum = function(nums) {
    let max = 0;
    for (let i = 0; i < nums.length; i += 2) max = Math.max(max, nums[i] + nums[i + 1]);
    return max;
};\`,
      typescript: \`function minPairSum(nums: number[]): number {
    let max = 0;
    for (let i = 0; i < nums.length; i += 2) max = Math.max(max, nums[i] + nums[i + 1]);
    return max;
}\`,
      go: \`func minPairSum(nums []int) int {
    maxSum := 0
    for i := 0; i < len(nums); i += 2 {
        if s := nums[i] + nums[i+1]; s > maxSum { maxSum = s }
    }
    return maxSum
}\`,
      rust: \`impl Solution {
    pub fn min_pair_sum(nums: Vec<i32>) -> i32 {
        let mut max_sum = 0;
        for i in (0..nums.len()).step_by(2) {
            max_sum = max_sum.max(nums[i] + nums[i + 1]);
        }
        max_sum
    }
}\`
    },
    timeComplexity: "O(n log n)",
    spaceComplexity: "O(1)",
    timeExplain: "Sorting dominated O(n log n) followed by linear O(n) dual pointer scan",
    spaceExplain: "In-place primitive sorting or O(log n) call stack overhead",
    bruteForceTitle: "Exhaustive Pair Enumeration",
    bruteForceTime: "O((n!)/(2^(n/2)))",
    bruteForceSpace: "O(n)",
    bruteForceExplain: "Evaluating all possible groupings is combinatorial factorial explosion.",
    optimalTitle: "Greedy Dual Pointers with Sorting",
    optimalTime: "O(n log n)",
    optimalSpace: "O(1)",
    optimalExplain: "Pairing the smallest with the largest element balances the sum across all pairs.",
    mistakeTitle: "Incorrect Pairing Strategy: Unsorted Adjacent Pairs",
    mistakeDetail: "Pairing adjacent numbers without sorting allows large numbers to pair together (e.g. 5 + 4 = 9), failing to minimize the maximum sum.",
    mistakeFix: "Sort the array in ascending order and pair nums[i] with nums[n - 1 - i].",
    takeaways: [
      "Greedy Invariant: Pairing the minimum with the maximum balances extreme values.",
      "Sorting Step: Ordering the array enables deterministic two-pointer matching.",
      "Mathematical Optimality: By the rearrangement inequality, this greedy choice is provably optimal."
    ],
    hints: [
      "Hint 1: To make the largest pair sum as small as possible, what should you pair with the largest number in the array?",
      "Hint 2: The largest number must be paired with the smallest number to balance its weight.",
      "Hint 3: Sort the array, then pair nums[i] with nums[n - 1 - i] using two pointers."
    ],
    dryRun: {
      headers: ["Step", "Left Pointer (i)", "Right Pointer (n-1-i)", "Pair Sum", "Max Sum So Far"],
      rows: [
        ["1", "nums[0] = 3", "nums[3] = 5", "3 + 5 = 8", "8"],
        ["2", "nums[1] = 3", "nums[2] = 4", "3 + 4 = 7", "max(8, 7) = 8"],
        ["Result", "-", "-", "Final Max Pair Sum", "8"]
      ]
    },
    animatic: {
      type: "dual-pointer",
      target: 8,
      nums: [3, 3, 4, 5],
      steps: [
        {
          step: 1,
          left: 0,
          right: 3,
          currentSum: 8,
          maxSum: 8,
          reaction: "insight",
          formula: "pair = nums[0] + nums[3] = 3 + 5 = 8",
          speech: "Greedy balance: Pair the smallest element 3 with the largest element 5. Pair sum = 8.",
          action: "Evaluate pair (nums[0], nums[3])."
        },
        {
          step: 2,
          left: 1,
          right: 2,
          currentSum: 7,
          maxSum: 8,
          matchedIndices: [1, 2],
          reaction: "optimal",
          formula: "pair = nums[1] + nums[2] = 3 + 4 = 7, max_sum = 8",
          speech: "Next inner pair: 3 + 4 = 7. Maximum pair sum across all pairs remains 8!",
          action: "Finish pairings and return minimized maximum sum 8."
        }
      ]
    }
  },
  "binary-search": {
    title: "Binary Search",
    number: "704",
    difficulty: "Easy",
    description: "Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, then return its index. Otherwise, return -1. You must write an algorithm with O(log n) runtime complexity.",
    acceptedCode: \`class Solution:
    def search(self, nums: list[int], target: int) -> int:
        left, right = 0, len(nums) - 1
        while left <= right:
            mid = left + (right - left) // 2
            if nums[mid] == target:
                return mid
            elif nums[mid] < target:
                left = mid + 1
            else:
                right = mid - 1
        return -1\`,
    acceptedCodeByLang: {
      java: \`class Solution {
    public int search(int[] nums, int target) {
        int left = 0, right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            else if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
}\`,
      python3: \`class Solution:
    def search(self, nums: list[int], target: int) -> int:
        left, right = 0, len(nums) - 1
        while left <= right:
            mid = left + (right - left) // 2
            if nums[mid] == target: return mid
            elif nums[mid] < target: left = mid + 1
            else: right = mid - 1
        return -1\`,
      cpp: \`class Solution {
public:
    int search(vector<int>& nums, int target) {
        int left = 0, right = nums.size() - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            else if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
};\`,
      javascript: \`var search = function(nums, target) {
    let left = 0, right = nums.length - 1;
    while (left <= right) {
        let mid = Math.floor(left + (right - left) / 2);
        if (nums[mid] === target) return mid;
        else if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
};\`,
      typescript: \`function search(nums: number[], target: number): number {
    let left: number = 0, right: number = nums.length - 1;
    while (left <= right) {
        let mid: number = Math.floor(left + (right - left) / 2);
        if (nums[mid] === target) return mid;
        else if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}\`,
      go: \`func search(nums []int, target int) int {
    left, right := 0, len(nums)-1
    for left <= right {
        mid := left + (right-left)/2
        if nums[mid] == target { return mid }
        if nums[mid] < target { left = mid + 1 } else { right = mid - 1 }
    }
    return -1
}\`,
      rust: \`impl Solution {
    pub fn search(nums: Vec<i32>, target: i32) -> i32 {
        let mut left = 0i32;
        let mut right = nums.len() as i32 - 1;
        while left <= right {
            let mid = left + (right - left) / 2;
            let val = nums[mid as usize];
            if val == target { return mid; }
            else if val < target { left = mid + 1; }
            else { right = mid - 1; }
        }
        -1
    }
}\`
    },
    buggyCode: \`class Solution:
    def search(self, nums: list[int], target: int) -> int:
        # Buggy: Integer overflow & strict inequality misses single element
        left, right = 0, len(nums) - 1
        while left < right: # Fails when len == 1 or target at boundary
            mid = (left + right) // 2 # Potential integer overflow in static languages
            if nums[mid] == target: return mid
            elif nums[mid] < target: left = mid
            else: right = mid
        return -1\`,
    buggyCodeByLang: {
      java: \`class Solution {
    public int search(int[] nums, int target) {
        // Buggy: while (left < right) misses single-element boundary and causes infinite loop
        int left = 0, right = nums.length - 1;
        while (left < right) {
            int mid = (left + right) / 2;
            if (nums[mid] == target) return mid;
            else if (nums[mid] < target) left = mid;
            else right = mid;
        }
        return -1;
    }
}\`,
      python3: \`class Solution:
    def search(self, nums: list[int], target: int) -> int:
        left, right = 0, len(nums) - 1
        while left < right:
            mid = (left + right) // 2
            if nums[mid] == target: return mid
            elif nums[mid] < target: left = mid
            else: right = mid
        return -1\`,
      cpp: \`class Solution {
public:
    int search(vector<int>& nums, int target) {
        int left = 0, right = nums.size() - 1;
        while (left < right) {
            int mid = (left + right) / 2;
            if (nums[mid] == target) return mid;
            else if (nums[mid] < target) left = mid;
            else right = mid;
        }
        return -1;
    }
};\`,
      javascript: \`var search = function(nums, target) {
    let left = 0, right = nums.length - 1;
    while (left < right) {
        let mid = Math.floor((left + right) / 2);
        if (nums[mid] === target) return mid;
        else if (nums[mid] < target) left = mid;
        else right = mid;
    }
    return -1;
};\`,
      typescript: \`function search(nums: number[], target: number): number {
    let left = 0, right = nums.length - 1;
    while (left < right) {
        let mid = Math.floor((left + right) / 2);
        if (nums[mid] === target) return mid;
        else if (nums[mid] < target) left = mid;
        else right = mid;
    }
    return -1;
}\`,
      go: \`func search(nums []int, target int) int {
    left, right := 0, len(nums)-1
    for left < right {
        mid := (left + right) / 2
        if nums[mid] == target { return mid }
        if nums[mid] < target { left = mid } else { right = mid }
    }
    return -1
}\`,
      rust: \`impl Solution {
    pub fn search(nums: Vec<i32>, target: i32) -> i32 {
        let mut left = 0;
        let mut right = nums.len() - 1;
        while left < right {
            let mid = (left + right) / 2;
            if nums[mid] == target { return mid as i32; }
            else if nums[mid] < target { left = mid; }
            else { right = mid; }
        }
        -1
    }
}\`
    },
    timeComplexity: "O(log n)",
    spaceComplexity: "O(1)",
    timeExplain: "Halves search space on every comparison step",
    spaceExplain: "Uses constant auxiliary pointers (left, mid, right)",
    bruteForceTitle: "Linear Scan",
    bruteForceTime: "O(n)",
    bruteForceSpace: "O(1)",
    bruteForceExplain: "Scans array from start to end without taking advantage of sorted order.",
    optimalTitle: "Binary Search Divide & Conquer",
    optimalTime: "O(log n)",
    optimalSpace: "O(1)",
    optimalExplain: "Bisects search interval around midpoint, discarding half the elements each step.",
    mistakeTitle: "Loop Invariant Flaw: Strict Inequality & Stagnant Pointers",
    mistakeDetail: "Using while (left < right) fails to evaluate single-element arrays (e.g. nums = [5], target = 5 returns -1). Updating left = mid without +1 leads to infinite loops.",
    mistakeFix: "Use while (left <= right) and update left = mid + 1, right = mid - 1.",
    takeaways: [
      "Midpoint Calculation: Use left + (right - left) // 2 to prevent 32-bit integer overflow.",
      "Loop Condition: left <= right ensures single-element and boundary values are evaluated.",
      "Strict Pointer Updates: Always use mid + 1 and mid - 1 to guarantee termination."
    ],
    hints: [
      "Hint 1: The input array is already sorted. What property allows you to discard half the array?",
      "Hint 2: Compare the middle element to the target. If target is larger, it must reside in the right half.",
      "Hint 3: Guard against boundary bugs: use left <= right and calculate mid = left + (right - left) / 2."
    ],
    dryRun: {
      headers: ["Step", "Left", "Right", "Mid", "nums[mid]", "Action"],
      rows: [
        ["1", "0", "5", "2", "nums[2] = 0", "Target 9 > 0; shift left to mid + 1 (3)"],
        ["2", "3", "5", "4", "nums[4] = 9", "nums[4] == target (9)! Return index 4"],
        ["Result", "-", "-", "-", "-", "Found in O(log n) comparisons"]
      ]
    },
    animatic: {
      type: "binary-search",
      target: 9,
      nums: [-1, 0, 3, 5, 9, 12],
      steps: [
        {
          step: 1,
          left: 0,
          right: 5,
          mid: 2,
          reaction: "insight",
          formula: "mid = 0 + (5 - 0) // 2 = 2, nums[2] = 3",
          speech: "Initial range [0, 5]. Midpoint is index 2 with value 3. Target 9 > 3, so eliminate left half [0, 2].",
          action: "Target > nums[mid]. Search right half."
        },
        {
          step: 2,
          left: 3,
          right: 5,
          mid: 4,
          matchedIndices: [4],
          reaction: "match",
          formula: "mid = 3 + (5 - 3) // 2 = 4, nums[4] = 9 (Target Found!)",
          speech: "Midpoint is now index 4 with value 9. Target matches! Found target at index 4.",
          action: "Match found! Return index 4."
        }
      ]
    }
  },
  "bubble-sort": {
    title: "Bubble Sort",
    number: "Sort",
    difficulty: "Easy",
    description: "Given an unsorted array of numbers, sort the array in ascending order using Bubble Sort algorithm by repeatedly swapping adjacent elements that are out of order.",
    acceptedCode: \`class Solution:
    def bubbleSort(self, nums: list[int]) -> list[int]:
        n = len(nums)
        for i in range(n):
            swapped = False
            for j in range(0, n - i - 1):
                if nums[j] > nums[j + 1]:
                    nums[j], nums[j + 1] = nums[j + 1], nums[j]
                    swapped = True
            if not swapped:
                break
        return nums\`,
    acceptedCodeByLang: {
      java: \`class Solution {
    public void bubbleSort(int[] nums) {
        int n = nums.length;
        for (int i = 0; i < n; i++) {
            boolean swapped = false;
            for (int j = 0; j < n - i - 1; j++) {
                if (nums[j] > nums[j + 1]) {
                    int temp = nums[j];
                    nums[j] = nums[j + 1];
                    nums[j + 1] = temp;
                    swapped = true;
                }
            }
            if (!swapped) break;
        }
    }
}\`,
      python3: \`class Solution:
    def bubbleSort(self, nums: list[int]) -> list[int]:
        n = len(nums)
        for i in range(n):
            swapped = False
            for j in range(0, n - i - 1):
                if nums[j] > nums[j + 1]:
                    nums[j], nums[j + 1] = nums[j + 1], nums[j]
                    swapped = True
            if not swapped: break
        return nums\`,
      cpp: \`class Solution {
public:
    void bubbleSort(vector<int>& nums) {
        int n = nums.size();
        for (int i = 0; i < n; ++i) {
            bool swapped = false;
            for (int j = 0; j < n - i - 1; ++j) {
                if (nums[j] > nums[j + 1]) {
                    swap(nums[j], nums[j + 1]);
                    swapped = true;
                }
            }
            if (!swapped) break;
        }
    }
};\`,
      javascript: \`var bubbleSort = function(nums) {
    let n = nums.length;
    for (let i = 0; i < n; i++) {
        let swapped = false;
        for (let j = 0; j < n - i - 1; j++) {
            if (nums[j] > nums[j + 1]) {
                [nums[j], nums[j + 1]] = [nums[j + 1], nums[j]];
                swapped = true;
            }
        }
        if (!swapped) break;
    }
    return nums;
};\`,
      typescript: \`function bubbleSort(nums: number[]): number[] {
    let n = nums.length;
    for (let i = 0; i < n; i++) {
        let swapped = false;
        for (let j = 0; j < n - i - 1; j++) {
            if (nums[j] > nums[j + 1]) {
                [nums[j], nums[j + 1]] = [nums[j + 1], nums[j]];
                swapped = true;
            }
        }
        if (!swapped) break;
    }
    return nums;
}\`,
      go: \`func bubbleSort(nums []int) []int {
    n := len(nums)
    for i := 0; i < n; i++ {
        swapped := false
        for j := 0; j < n-i-1; j++ {
            if nums[j] > nums[j+1] {
                nums[j], nums[j+1] = nums[j+1], nums[j]
                swapped = true
            }
        }
        if !swapped { break }
    }
    return nums
}\`,
      rust: \`impl Solution {
    pub fn bubble_sort(mut nums: Vec<i32>) -> Vec<i32> {
        let n = nums.len();
        for i in 0..n {
            let mut swapped = false;
            for j in 0..(n - i - 1) {
                if nums[j] > nums[j + 1] {
                    nums.swap(j, j + 1);
                    swapped = true;
                }
            }
            if !swapped { break; }
        }
        nums
    }
}\`
    },
    buggyCode: \`class Solution:
    def bubbleSort(self, nums: list[int]) -> list[int]:
        # Buggy: Index out of bounds (n instead of n - 1) & no early termination
        for i in range(len(nums)):
            for j in range(len(nums)): # Out of bounds when j = len(nums) - 1
                if nums[j] > nums[j + 1]:
                    nums[j], nums[j + 1] = nums[j + 1], nums[j]
        return nums\`,
    buggyCodeByLang: {
      java: \`class Solution {
    public void bubbleSort(int[] nums) {
        // Buggy: ArrayIndexOutOfBoundsException when j + 1 == nums.length
        for (int i = 0; i < nums.length; i++) {
            for (int j = 0; j < nums.length; j++) {
                if (nums[j] > nums[j + 1]) {
                    int t = nums[j]; nums[j] = nums[j + 1]; nums[j + 1] = t;
                }
            }
        }
    }
}\`,
      python3: \`class Solution:
    def bubbleSort(self, nums: list[int]) -> list[int]:
        for i in range(len(nums)):
            for j in range(len(nums)):
                if nums[j] > nums[j + 1]: nums[j], nums[j + 1] = nums[j + 1], nums[j]
        return nums\`,
      cpp: \`class Solution {
public:
    void bubbleSort(vector<int>& nums) {
        for (int i = 0; i < nums.size(); ++i) {
            for (int j = 0; j < nums.size(); ++j) {
                if (nums[j] > nums[j + 1]) swap(nums[j], nums[j + 1]);
            }
        }
    }
};\`,
      javascript: \`var bubbleSort = function(nums) {
    for (let i = 0; i < nums.length; i++) {
        for (let j = 0; j < nums.length; j++) {
            if (nums[j] > nums[j + 1]) [nums[j], nums[j + 1]] = [nums[j + 1], nums[j]];
        }
    }
    return nums;
};\`,
      typescript: \`function bubbleSort(nums: number[]): number[] {
    for (let i = 0; i < nums.length; i++) {
        for (let j = 0; j < nums.length; j++) {
            if (nums[j] > nums[j + 1]) [nums[j], nums[j + 1]] = [nums[j + 1], nums[j]];
        }
    }
    return nums;
}\`,
      go: \`func bubbleSort(nums []int) []int {
    for i := 0; i < len(nums); i++ {
        for j := 0; j < len(nums); j++ {
            if nums[j] > nums[j+1] { nums[j], nums[j+1] = nums[j+1], nums[j] }
        }
    }
    return nums
}\`,
      rust: \`impl Solution {
    pub fn bubble_sort(mut nums: Vec<i32>) -> Vec<i32> {
        for i in 0..nums.len() {
            for j in 0..nums.len() {
                if nums[j] > nums[j + 1] { nums.swap(j, j + 1); }
            }
        }
        nums
    }
}\`
    },
    timeComplexity: "O(n²)",
    spaceComplexity: "O(1)",
    timeExplain: "Quadratic comparisons O(n²), with best-case O(n) early termination",
    spaceExplain: "In-place element swapping with zero additional memory allocation",
    bruteForceTitle: "Unoptimized Nested Swaps",
    bruteForceTime: "O(n²)",
    bruteForceSpace: "O(1)",
    bruteForceExplain: "Runs all iterations unconditionally even when array is already sorted.",
    optimalTitle: "Early-Termination Bubble Sort",
    optimalTime: "O(n²)",
    optimalSpace: "O(1)",
    optimalExplain: "Uses a swapped flag to break early when array is already sorted (O(n) best case).",
    mistakeTitle: "Array Boundary Exception: Unbounded Inner Loop",
    mistakeDetail: "Accessing nums[j + 1] when j reaches length - 1 triggers an ArrayIndexOutOfBoundsException crash.",
    mistakeFix: "Bound the inner loop to j < n - i - 1 and add a boolean swapped flag for early exit.",
    takeaways: [
      "In-place sorting: Modifies original array with O(1) auxiliary memory.",
      "Bubble invariant: The largest unsorted element bubbles to its final index at the end of each pass.",
      "Early exit optimization: If no swaps occurred during a pass, the array is already sorted."
    ],
    hints: [
      "Hint 1: In each outer pass, the largest unsorted element bubbles up to its final position at the end.",
      "Hint 2: How can you avoid comparing elements that are already sorted at the end? (Limit j to n - i - 1).",
      "Hint 3: What if the array becomes sorted before all n passes complete? Add a swapped boolean flag."
    ],
    dryRun: {
      headers: ["Pass (i)", "Inner (j)", "nums[j]", "nums[j+1]", "Swapped?", "Array State"],
      rows: [
        ["0", "0", "4", "2", "Yes (4 > 2)", "[2, 4, 5, 1]"],
        ["0", "1", "4", "5", "No (4 < 5)", "[2, 4, 5, 1]"],
        ["0", "2", "5", "1", "Yes (5 > 1)", "[2, 4, 1, 5] (5 placed at end)"],
        ["1", "0", "2", "4", "No (2 < 4)", "[2, 4, 1, 5]"],
        ["1", "1", "4", "1", "Yes (4 > 1)", "[2, 1, 4, 5] (4 placed)"],
        ["2", "0", "2", "1", "Yes (2 > 1)", "[1, 2, 4, 5] (Sorted!)"]
      ]
    },
    animatic: {
      type: "pillars",
      target: null,
      nums: [5, 2, 4, 1, 3],
      steps: [
        {
          step: 1,
          left: 0,
          right: 1,
          reaction: "swap",
          formula: "nums[0]=5 > nums[1]=2 => Swap!",
          speech: "Pillar comparison: 5 is greater than 2. Swap to bubble 5 towards the right.",
          action: "Swap adjacent elements (5, 2)."
        },
        {
          step: 2,
          left: 1,
          right: 2,
          reaction: "swap",
          formula: "nums[1]=5 > nums[2]=4 => Swap!",
          speech: "5 is greater than 4. Swap to continue bubbling 5.",
          action: "Swap adjacent elements (5, 4)."
        },
        {
          step: 3,
          left: 2,
          right: 3,
          reaction: "swap",
          formula: "nums[2]=5 > nums[3]=1 => Swap!",
          speech: "5 is greater than 1. Swap adjacent pillars.",
          action: "Swap adjacent elements (5, 1)."
        },
        {
          step: 4,
          left: 3,
          right: 4,
          matchedIndices: [4],
          reaction: "optimal",
          formula: "5 reaches final rightmost position! Array sorted step-by-step.",
          speech: "Pass 1 complete! Pillar 5 is locked in its permanent sorted position.",
          action: "Pillar 5 placed in final position."
        }
      ]
    }
  }
};

// Web Audio API Synthesizer (Muted by default, zero external assets)
class WebAudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.muted = true;
    this.volume = 0.3;
  }
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }
  playTone(freq, type, duration, gainLevel = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      const targetGain = Math.max(0.0001, this.volume * gainLevel * 0.15);
      gain.gain.setValueAtTime(targetGain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch {}
  }
  step() { this.playTone(440, "sine", 0.08, 0.7); }
  pointer() { this.playTone(587.33, "triangle", 0.05, 0.6); }
  compare() {
    this.playTone(523.25, "sine", 0.07, 0.8);
    setTimeout(() => this.playTone(659.25, "sine", 0.07, 0.8), 40);
  }
  match() {
    this.playTone(523.25, "sine", 0.18, 1);
    setTimeout(() => this.playTone(659.25, "sine", 0.22, 1), 70);
    setTimeout(() => this.playTone(783.99, "sine", 0.3, 1.2), 140);
  }
  swap() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.12);
      gain.gain.setValueAtTime(this.volume * 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }
  mistake() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.2);
      gain.gain.setValueAtTime(this.volume * 0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }
  complete() {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, "sine", 0.25, 1.1), i * 90);
    });
  }
}
const soundFX = new WebAudioSynthesizer();

function formatLang(langKey) {
  const map = {
    python3: "Python 3",
    python: "Python 3",
    cpp: "C++",
    "c++": "C++",
    java: "Java",
    javascript: "JavaScript",
    js: "JavaScript",
    typescript: "TypeScript",
    ts: "TypeScript",
    go: "Go",
    golang: "Go",
    rust: "Rust"
  };
  return map[String(langKey).toLowerCase()] || String(langKey || "Python 3");
}

function normalizeLanguageKey(lang) {
  const lk = String(lang || "").toLowerCase().trim();
  if (lk.includes("java") && !lk.includes("script")) return "java";
  if (lk.includes("cpp") || lk.includes("c++")) return "cpp";
  if (lk.includes("python")) return "python3";
  if (lk.includes("typescript") || lk === "ts") return "typescript";
  if (lk.includes("rust")) return "rust";
  if (lk.includes("go") || lk === "golang") return "go";
  return "javascript";
}

function getEducationalDataFor(slug, title) {
  const normSlug = (slug || "").toLowerCase().trim();
  if (normSlug && PROBLEM_EDUCATIONAL_DATA[normSlug]) {
    return { ...PROBLEM_EDUCATIONAL_DATA[normSlug], isVerified: true, hasLocalSolution: true };
  }
  if (normSlug === "453" || normSlug.includes("minimum-moves") || normSlug.includes("equal-array")) {
    return { ...PROBLEM_EDUCATIONAL_DATA["minimum-moves-to-equal-array-elements"], isVerified: true, hasLocalSolution: true };
  }
  if (normSlug === "287" || normSlug.includes("duplicate")) {
    return { ...PROBLEM_EDUCATIONAL_DATA["find-the-duplicate-number"], isVerified: true, hasLocalSolution: true };
  }
  if (normSlug === "1" || normSlug.includes("two-sum")) {
    return { ...PROBLEM_EDUCATIONAL_DATA["two-sum"], isVerified: true, hasLocalSolution: true };
  }
  if (normSlug === "1877" || normSlug.includes("pair-sum")) {
    return { ...PROBLEM_EDUCATIONAL_DATA["minimize-maximum-pair-sum-in-array"], isVerified: true, hasLocalSolution: true };
  }
  if (normSlug === "704" || normSlug.includes("binary-search")) {
    return { ...PROBLEM_EDUCATIONAL_DATA["binary-search"], isVerified: true, hasLocalSolution: true };
  }
  if (normSlug.includes("bubble")) {
    return { ...PROBLEM_EDUCATIONAL_DATA["bubble-sort"], isVerified: true, hasLocalSolution: true };
  }

  const cleanTitle = title || "Algorithmic Problem";
  return {
    isVerified: false,
    hasLocalSolution: false,
    title: cleanTitle,
    difficulty: "Medium",
    description: `Problem description for ${cleanTitle}. Connect OpenAI API key on the server to generate real-time AI code review and optimal solutions.`,
    unavailableReason: "Problem-specific optimal code is not available in the local knowledge engine yet. Configure the AI provider or request an explanation without generated code.",
    acceptedCode: "Problem-specific optimal code is not available in the local knowledge engine yet. Configure the AI provider or request an explanation without generated code.",
    acceptedCodeByLang: null,
    buggyCode: "",
    buggyCodeByLang: null,
    timeComplexity: "—",
    spaceComplexity: "—",
    timeExplain: "Requires live AI mentor or verified curriculum entry",
    spaceExplain: "Requires live AI mentor or verified curriculum entry",
    bruteForceTitle: "Unavailable without live AI",
    bruteForceTime: "—",
    bruteForceSpace: "—",
    bruteForceExplain: "Dynamic brute-force calculation requires live AI provider.",
    optimalTitle: "Optimal Solution Unavailable",
    optimalTime: "—",
    optimalSpace: "—",
    optimalExplain: "Curated solution not present in local educational engine.",
    mistakeTitle: "Mistake Analysis Requires Live AI",
    mistakeDetail: "To diagnose syntax errors, logic flaws, or asymptotic bottlenecks for arbitrary LeetCode problems, connect OpenAI API key on the server.",
    mistakeFix: "Set OPENAI_API_KEY in server .env file to enable dynamic AI reviews.",
    takeaways: [
      "Problem-specific optimal code is not available in the local knowledge engine yet.",
      "Configure OPENAI_API_KEY on the server to analyze any of the 3000+ LeetCode problems dynamically.",
      "Curriculum problems with verified local solutions include #453 Minimum Moves, #287 Find Duplicate, #1 Two Sum, #1877 Minimize Max Pair Sum, and #704 Binary Search."
    ],
    hints: [
      "Local hints are unavailable for this unverified problem.",
      "Configure OPENAI_API_KEY on the server to generate dynamic step-by-step guidance."
    ],
    dryRun: {
      headers: ["Step", "Notice"],
      rows: [
        ["1", "Local dry run unavailable for unverified problem. Set OPENAI_API_KEY for dynamic analysis."]
      ]
    },
    animatic: {
      initialState: {
        array: [],
        highlightIndices: [],
        pointers: {},
        caption: "Local animatic unavailable for unverified problem. Set OPENAI_API_KEY for dynamic visualization."
      },
      steps: [
        {
          lineIndex: 0,
          description: "Local animatic unavailable for unverified problem. Set OPENAI_API_KEY on the server.",
          state: {
            array: [],
            highlightIndices: [],
            pointers: {},
            caption: "Local animatic unavailable for unverified problem."
          }
        }
      ]
    }
  };
}

let currentMentorProblem = null;
let currentMentorMode = "explain";
let currentMentorBuggyState = false;
let currentMentorPreviousView = "profile";
let currentMentorHintIndex = 0;

let animaticState = {
  currentStep: 0,
  isPlaying: false,
  timer: null,
  speed: 1,
  steps: [],
  nums: [2, 7, 11, 15],
  target: 9,
  type: "array-map"
};

function updateMentorLineNumbers() {
  const input = $("mentorCodeInput");
  const lineEl = $("mentorLineNumbers");
  const charEl = $("mentorCharCount");
  if (!input || !lineEl) return;
  const lines = input.value.split("\\n").length;
  lineEl.textContent = Array.from({ length: lines }, (_, i) => i + 1).join("\\n");
  if (charEl) {
    charEl.textContent = \`\${lines} \${lines === 1 ? 'line' : 'lines'} · \${input.value.length} chars\`;
  }
}

function renderNormalModeAnalysis(data, isBuggy, analysisResult = null) {
  const status = currentMentorProblem?.status || (isBuggy ? "Wrong Answer" : "Accepted");
  const timeComplexityEl = $("mentorTimeComplexity");
  const spaceComplexityEl = $("mentorSpaceComplexity");
  const timeExplainEl = $("mentorTimeExplain");
  const spaceExplainEl = $("mentorSpaceExplain");
  const optimalCodeEl = $("mentorOptimalCode");
  const optimalTitleEl = $("mentorOptimalTitle");
  const takeawaysListEl = $("mentorTakeawaysList");
  const mistakeAlertEl = $("mentorMistakeAlert");
  const mistakeTitleEl = $("mentorMistakeTitle");
  const mistakeDetailEl = $("mentorMistakeDetail");
  const mistakeFixEl = $("mentorMistakeFix");
  const acceptedAlertEl = $("mentorAcceptedAlert");
  const acceptedTitleEl = $("mentorAcceptedTitle");
  const acceptedDetailEl = $("mentorAcceptedDetail");
  const acceptedFixEl = $("mentorAcceptedFix");
  const analysisHeadingEl = $("mentorAnalysisHeading");
  const analysisBodyEl = $("mentorAnalysisBody");
  const comparisonBodyEl = $("mentorComparisonTableBody");
  const providerBadgeEl = $("mentorProviderBadge");
  const configNoticeEl = $("mentorAiConfigNotice");
  const configTextEl = $("mentorAiConfigText");

  const selectedLang = $("mentorLangSelect")?.value || "python3";
  const langName = formatLang(selectedLang);

  // Update Provider Badge
  if (providerBadgeEl) {
    if (analysisResult) {
      providerBadgeEl.textContent = "Provider: OpenAI Live AI Mentor";
      providerBadgeEl.className = "badge-provider provider-openai";
    } else if (data.hasLocalSolution !== false) {
      providerBadgeEl.textContent = "Provider: Local Educational Knowledge Engine";
      providerBadgeEl.className = "badge-provider";
    } else {
      providerBadgeEl.textContent = "Provider: Local Engine (Unverified Problem)";
      providerBadgeEl.className = "badge-provider provider-unverified";
    }
  }

  // Update AI Configuration Notice
  if (!analysisResult) {
    if (configNoticeEl) configNoticeEl.hidden = false;
    if (configTextEl) {
      if (data.hasLocalSolution === false) {
        configTextEl.innerHTML = "Problem-specific optimal code is not available in the local knowledge engine yet.<br>Set <code>OPENAI_API_KEY</code> and <code>AI_MENTOR_MODEL</code> in your server <code>.env</code> file to enable live AI analysis for all 3000+ LeetCode problems.";
      } else {
        configTextEl.innerHTML = "OpenAI API key is not configured on the server. AI Code Mentor is running in Local Educational Knowledge Engine mode with full pedagogical explanations, optimal solutions, and visual execution traces. Configure <code>OPENAI_API_KEY</code> in server <code>.env</code> to enable live AI review.";
      }
    }
  } else {
    if (configNoticeEl) configNoticeEl.hidden = true;
  }

  // Complexity Values
  if (timeComplexityEl) timeComplexityEl.textContent = data.hasLocalSolution === false ? "—" : (data.optimalTime || data.timeComplexity || "O(n)");
  if (spaceComplexityEl) spaceComplexityEl.textContent = data.hasLocalSolution === false ? "—" : (data.optimalSpace || data.spaceComplexity || "O(1)");
  if (timeExplainEl) timeExplainEl.textContent = data.timeExplain || "Optimal algorithmic traversal";
  if (spaceExplainEl) spaceExplainEl.textContent = data.spaceExplain || "Auxiliary memory footprint";

  // Multi-Language Optimal Code Rendering
  if (optimalCodeEl) {
    if (data.hasLocalSolution === false) {
      optimalCodeEl.textContent = data.unavailableReason || "Problem-specific optimal code is not available in the local knowledge engine yet. Configure the AI provider or request an explanation without generated code.";
    } else {
      const code = data.acceptedCodeByLang?.[selectedLang] || data.optimalCode || data.acceptedCode;
      optimalCodeEl.textContent = code;
    }
  }
  if (optimalTitleEl) {
    if (data.hasLocalSolution === false) {
      optimalTitleEl.textContent = "Optimal Solution (AI Provider Required)";
    } else {
      optimalTitleEl.textContent = `${data.optimalTitle || "Optimal Solution"} (${langName})`;
    }
  }

  // Approach Comparison Table
  if (comparisonBodyEl) {
    if (data.hasLocalSolution === false) {
      comparisonBodyEl.innerHTML = `
        <tr>
          <td><strong>Brute Force</strong></td>
          <td><code>—</code></td>
          <td><code>—</code></td>
          <td><span class="badge-status status-attempted">Requires Live AI</span></td>
        </tr>
        <tr class="highlight-row">
          <td><strong>Optimal Solution</strong></td>
          <td><code>—</code></td>
          <td><code>—</code></td>
          <td><span class="badge-status status-attempted">Configure OPENAI_API_KEY</span></td>
        </tr>
      `;
    } else {
      comparisonBodyEl.innerHTML = `
        <tr>
          <td><strong>Brute Force</strong> (${escapeHTML(data.bruteForceTitle || "Nested Search")})</td>
          <td><code>${escapeHTML(data.bruteForceTime || "O(n²)")}</code></td>
          <td><code>${escapeHTML(data.bruteForceSpace || "O(1)")}</code></td>
          <td><span class="badge-status status-attempted">Slow / TLE</span></td>
        </tr>
        <tr class="highlight-row">
          <td><strong>Optimal Solution</strong> (${escapeHTML(data.optimalTitle || "Recommended Approach")})</td>
          <td><code>${escapeHTML(data.optimalTime || data.timeComplexity || "O(n)")}</code></td>
          <td><code>${escapeHTML(data.optimalSpace || data.spaceComplexity || "O(1)")}</code></td>
          <td><span class="badge-status status-accepted">Optimal (Recommended)</span></td>
        </tr>
      `;
    }
  }

  // Takeaways
  if (takeawaysListEl && Array.isArray(data.takeaways)) {
    takeawaysListEl.innerHTML = data.takeaways.map(t => `<li><span class="takeaway-bullet">&#10003;</span> ${escapeHTML(t)}</li>`).join("");
  }

  // Verdict Handling: Accepted vs Flawed
  const isAccepted = status === "Accepted" && !isBuggy;
  const isTLE = status === "Time Limit Exceeded" || status === "TLE" || currentMentorMode === "tle";
  const isRuntimeError = status === "Runtime Error" || currentMentorMode === "runtime-error";
  const isCompileError = status === "Compilation Error" || currentMentorMode === "compilation-error";

  if (isAccepted) {
    // DO NOT display mistake alerts for Accepted submissions!
    if (mistakeAlertEl) mistakeAlertEl.hidden = true;
    if (acceptedAlertEl) {
      acceptedAlertEl.hidden = false;
      if (acceptedTitleEl) acceptedTitleEl.textContent = "Solution Accepted on LeetCode";
      if (acceptedDetailEl) acceptedDetailEl.textContent = "Your solution was Accepted by LeetCode and passed all test cases! No runtime errors or logic bugs detected.";
      if (acceptedFixEl) {
        if (data.hasLocalSolution === false) {
          acceptedFixEl.innerHTML = "<strong>Performance Analysis:</strong> Your algorithm is correct. Connect OpenAI API key to get deep algorithmic trade-off analysis.";
        } else {
          acceptedFixEl.innerHTML = `<strong>Performance Analysis:</strong> Your algorithm is correct. Compare with the <strong>${escapeHTML(data.optimalTitle || "Optimal Solution")}</strong> below to see if asymptotic speed can be enhanced from ${escapeHTML(data.bruteForceTime || 'O(n²)')} to ${escapeHTML(data.timeComplexity || 'O(n)')}.`;
        }
      }
    }
  } else {
    // Non-accepted submission: display diagnostic card
    if (acceptedAlertEl) acceptedAlertEl.hidden = true;
    if (mistakeAlertEl) {
      mistakeAlertEl.hidden = false;
      if (isTLE) {
        if (mistakeTitleEl) mistakeTitleEl.textContent = "Time Limit Exceeded: Bottleneck Identified";
        if (mistakeDetailEl) mistakeDetailEl.textContent = `The solution exceeded the allowable LeetCode execution time budget (${data.bruteForceTime || 'quadratic operations'}). Large inputs timed out.`;
        if (mistakeFixEl) mistakeFixEl.innerHTML = `<strong>Optimization roadmap:</strong> ${escapeHTML(data.mistakeFix || "Eliminate nested loops to lower asymptotic complexity.")}`;
      } else if (isRuntimeError) {
        if (mistakeTitleEl) mistakeTitleEl.textContent = "Runtime Error: Unsafe Boundary Operation Detected";
        if (mistakeDetailEl) mistakeDetailEl.textContent = "An unhandled exception occurred: index out of bounds, null pointer, division by zero, or recursion stack overflow.";
        if (mistakeFixEl) mistakeFixEl.innerHTML = "<strong>Defensive correction:</strong> Add input boundary validation guards (length verification and null checks) before indexing.";
      } else if (isCompileError) {
        if (mistakeTitleEl) mistakeTitleEl.textContent = "Compilation Error: Syntax / Type Issue Detected";
        if (mistakeDetailEl) mistakeDetailEl.textContent = "The code failed to compile. Method signature, return type, or syntax rules were not satisfied.";
        if (mistakeFixEl) mistakeFixEl.innerHTML = "<strong>Correction:</strong> Verify method signature and imports match the required LeetCode specification.";
      } else {
        if (mistakeTitleEl) mistakeTitleEl.textContent = data.mistakeTitle || "Mistake Detected: Logic / Boundary Bug";
        if (mistakeDetailEl) mistakeDetailEl.textContent = data.mistakeDetail || "The code fails on edge cases or produces incorrect outputs for certain inputs.";
        if (mistakeFixEl) mistakeFixEl.innerHTML = `<strong>Recommended fix:</strong> ${escapeHTML(data.mistakeFix || "Correct algorithm invariants and retest.")}`;
      }
    }
  }

  // Progressive Hints rendering
  const hintCard = $("mentorHintCard");
  if (hintCard) {
    if (currentMentorMode === "hint" && Array.isArray(data.hints) && data.hints.length) {
      hintCard.hidden = false;
      const hintTitle = $("mentorHintLevelTitle");
      const hintText = $("mentorHintText");
      if (hintTitle) hintTitle.textContent = `Hint ${currentMentorHintIndex + 1} of ${data.hints.length}: Guidance`;
      if (hintText) hintText.textContent = data.hints[currentMentorHintIndex];
    } else {
      hintCard.hidden = true;
    }
  }

  // Dry Run Trace rendering
  const dryRunCard = $("mentorDryRunCard");
  if (dryRunCard) {
    if (currentMentorMode === "dry-run" && data.dryRun) {
      dryRunCard.hidden = false;
      const thead = $("mentorDryRunThead");
      const tbody = $("mentorDryRunTbody");
      if (thead && Array.isArray(data.dryRun.headers)) {
        thead.innerHTML = `<tr>${data.dryRun.headers.map(h => `<th>${escapeHTML(h)}</th>`).join("")}</tr>`;
      }
      if (tbody && Array.isArray(data.dryRun.rows)) {
        tbody.innerHTML = data.dryRun.rows.map(r => `<tr>${r.map(c => `<td><code>${escapeHTML(String(c))}</code></td>`).join("")}</tr>`).join("");
      }
    } else {
      dryRunCard.hidden = true;
    }
  }

  // Structured Analysis or Mode-Specific Guidance
  if (analysisResult && Array.isArray(analysisResult.sections)) {
    if (analysisHeadingEl) analysisHeadingEl.textContent = "AI Code Review Analysis";
    if (analysisBodyEl) {
      analysisBodyEl.innerHTML = `<p><strong>Summary:</strong> ${escapeHTML(analysisResult.summary || '')}</p>` +
        analysisResult.sections.map(s => `<div style="margin-top:12px;"><h4>${escapeHTML(s.title)}</h4><p>${escapeHTML(s.content)}</p></div>`).join("");
    }
  } else {
    const modeTitles = {
      explain: "Deep Code Review & Logic Explanation",
      mistake: "Mistake Diagnosis & Bug Resolution",
      complexity: "Asymptotic Complexity & Memory Footprint",
      optimize: "Optimization Roadmap & Efficiency Gains",
      "dry-run": "Step-by-Step Execution Trace",
      teach: "Core DSA Concept Breakdown",
      hint: "Progressive Conceptual Hint"
    };
    if (analysisHeadingEl) analysisHeadingEl.textContent = modeTitles[currentMentorMode] || "Algorithm Analysis & Logic";

    if (analysisBodyEl) {
      if (currentMentorMode === "mistake") {
        if (isAccepted) {
          analysisBodyEl.innerHTML = `
            <p><strong>Code Quality: Valid & Accepted &#10003;</strong></p>
            <p>Your submitted code satisfies all test cases on LeetCode without runtime errors or logical flaws.</p>
            <p>To deepen your DSA mastery, examine the <strong>Optimize Code</strong> section to compare asymptotic tradeoffs.</p>
          `;
        } else {
          analysisBodyEl.innerHTML = `
            <p><strong>Identified Flaw:</strong> ${escapeHTML(data.mistakeTitle || 'Algorithmic inconsistency')}</p>
            <p>${escapeHTML(data.mistakeDetail || 'Review edge cases and invariants.')}</p>
            <p><strong>Correction:</strong> ${escapeHTML(data.mistakeFix || 'Apply optimal boundary checks.')}</p>
          `;
        }
      } else if (currentMentorMode === "complexity") {
        analysisBodyEl.innerHTML = `
          <p><strong>Time Complexity: ${data.timeComplexity}</strong> &mdash; ${escapeHTML(data.timeExplain || '')}.</p>
          <p><strong>Space Complexity: ${data.spaceComplexity}</strong> &mdash; ${escapeHTML(data.spaceExplain || '')}.</p>
          <p>Trading memory for speed often converts quadratic O(n²) bottlenecks into linear O(n) efficiency.</p>
        `;
      } else if (currentMentorMode === "teach") {
        analysisBodyEl.innerHTML = `
          <p><strong>Core Concept:</strong> ${escapeHTML(data.optimalTitle || 'Algorithmic Invariant')}</p>
          <p>${escapeHTML(data.optimalExplain || 'Preserve state efficiently across iterations.')}</p>
          <p><strong>Key Principle:</strong> ${escapeHTML(data.takeaways?.[0] || 'Observe invariant guarantees.')}</p>
        `;
      } else if (currentMentorMode === "optimize") {
        analysisBodyEl.innerHTML = `
          <p><strong>Current Approach:</strong> ${escapeHTML(data.bruteForceTitle || 'Exhaustive Search')} (${escapeHTML(data.bruteForceTime || 'O(n²)')})</p>
          <p><strong>Optimal Target:</strong> ${escapeHTML(data.optimalTitle || 'Optimal Approach')} (${escapeHTML(data.optimalTime || data.timeComplexity || 'O(n)')})</p>
          <p>Review the full executable code in the <strong>Optimal Solution</strong> panel below.</p>
        `;
      } else if (currentMentorMode === "hint") {
        analysisBodyEl.innerHTML = `
          <p>Use the <strong>Next Hint</strong> button above to reveal progressive conceptual hints step-by-step.</p>
        `;
      } else if (currentMentorMode === "dry-run") {
        analysisBodyEl.innerHTML = `
          <p>Review the step-by-step dry run trace table above to observe variable state transitions at each iteration.</p>
        `;
      } else {
        analysisBodyEl.innerHTML = `
          <p><strong>Brute Force:</strong> ${escapeHTML(data.bruteForceExplain || 'Naive search checks all permutations.')}</p>
          <p><strong>Optimal Solution:</strong> ${escapeHTML(data.optimalExplain || 'Optimal approach balances operations and storage.')}</p>
          <p>This avoids redundant computations, lowering execution time to <code>${escapeHTML(data.timeComplexity)}</code>.</p>
        `;
      }
    }
  }
}

function switchMentorLearningTab(tabName) {
  const normalBtn = $("mentorModeNormalBtn");
  const animaticBtn = $("mentorModeAnimaticBtn");
  const normalWorkspace = $("mentorNormalWorkspace");
  const animaticWorkspace = $("mentorAnimaticWorkspace");

  if (tabName === "animatic") {
    if (normalBtn) { normalBtn.classList.remove("active"); normalBtn.setAttribute("aria-selected", "false"); }
    if (animaticBtn) { animaticBtn.classList.add("active"); animaticBtn.setAttribute("aria-selected", "true"); }
    if (normalWorkspace) normalWorkspace.hidden = true;
    if (animaticWorkspace) animaticWorkspace.hidden = false;
    renderAnimaticStep(animaticState.currentStep);
  } else {
    stopAnimaticPlayback();
    if (normalBtn) { normalBtn.classList.add("active"); normalBtn.setAttribute("aria-selected", "true"); }
    if (animaticBtn) { animaticBtn.classList.remove("active"); animaticBtn.setAttribute("aria-selected", "false"); }
    if (normalWorkspace) normalWorkspace.hidden = false;
    if (animaticWorkspace) animaticWorkspace.hidden = true;
  }
}

function setupAnimaticMode(animaticData) {
  stopAnimaticPlayback();
  animaticState.steps = animaticData.steps || [];
  animaticState.nums = animaticData.nums || [2, 7, 11, 15];
  animaticState.target = animaticData.target !== undefined ? animaticData.target : 9;
  animaticState.type = animaticData.type || "array-map";
  animaticState.currentStep = 0;
  animaticState.speed = 1;

  const targetBadge = $("animaticTargetBadge");
  if (targetBadge) {
    targetBadge.textContent = animaticState.target !== null ? \`Target: \${animaticState.target}\` : "Sorting Sequence";
  }

  const algoBadge = $("animaticAlgorithmBadge");
  if (algoBadge) {
    algoBadge.textContent = animaticState.type === "cycle-detection" ? "Floyd's Tortoise & Hare"
      : animaticState.type === "pillars" ? "Pillar Comparisons"
      : animaticState.type === "binary-search" ? "Binary Search Bisect"
      : animaticState.type === "dual-pointer" ? "Two Pointers Greedy"
      : "Hash Map Algorithm";
  }

  renderAnimaticStep(0);
}

function renderAnimaticStep(stepIndex) {
  if (!animaticState.steps || animaticState.steps.length === 0) return;
  const safeIndex = Math.max(0, Math.min(stepIndex, animaticState.steps.length - 1));
  animaticState.currentStep = safeIndex;
  const step = animaticState.steps[safeIndex];

  // Audio effect trigger based on step event
  if (step.reaction === "match") soundFX.match();
  else if (step.reaction === "swap") soundFX.swap();
  else if (step.reaction === "optimal") soundFX.complete();
  else if (step.reaction === "mistake") soundFX.mistake();
  else if (step.slow !== undefined || step.left !== undefined) soundFX.pointer();
  else soundFX.step();

  // Scrubber & Counter
  const total = animaticState.steps.length;
  const counterEl = $("animaticStepCounter");
  const titleEl = $("animaticStepTitle");
  const barEl = $("animaticProgressBar");

  if (counterEl) counterEl.textContent = \`Step \${safeIndex + 1} of \${total}\`;
  if (titleEl) titleEl.textContent = step.action || "Examine array elements";
  if (barEl) barEl.style.width = \`\${((safeIndex + 1) / total) * 100}%\`;

  // Playback buttons state
  const firstBtn = $("animaticFirstBtn");
  const prevBtn = $("animaticPrevBtn");
  const nextBtn = $("animaticNextBtn");
  const lastBtn = $("animaticLastBtn");

  if (firstBtn) firstBtn.disabled = safeIndex === 0;
  if (prevBtn) prevBtn.disabled = safeIndex === 0;
  if (nextBtn) nextBtn.disabled = safeIndex === total - 1;
  if (lastBtn) lastBtn.disabled = safeIndex === total - 1;

  // Speech bubble & Narration
  const speechEl = $("animaticMentorSpeech");
  const narrationHeading = $("animaticNarrationHeading");
  const narrationBody = $("animaticNarrationBody");
  const formulaEl = $("animaticFormula");

  if (speechEl) speechEl.textContent = \`"\${step.speech || step.action}"\`;
  if (narrationHeading) narrationHeading.textContent = \`Step \${safeIndex + 1}: \${step.action}\`;
  if (narrationBody) narrationBody.textContent = step.speech || step.action;
  if (formulaEl) formulaEl.textContent = step.formula || "Evaluating step condition...";

  // Render Visual Arrays / Stages
  const arrayRow = $("animaticArrayRow");
  const memoryGrid = $("animaticMemoryGrid");

  if (arrayRow) {
    if (animaticState.type === "pillars") {
      arrayRow.innerHTML = \`<div class="animatic-pillars-container">\${animaticState.nums.map((num, idx) => {
        const height = num * 30 + 30;
        const isCompared = idx === step.left || idx === step.right;
        const isMatched = step.matchedIndices?.includes(idx);
        const cls = isMatched ? "pillar-cell matched" : isCompared ? "pillar-cell active" : "pillar-cell";
        return \`<div class="\${cls}" style="height: \${height}px;" data-index="\${idx}">
          <span class="pillar-val">\${num}</span>
          <span class="pillar-idx">\${idx}</span>
        </div>\`;
      }).join("")}</div>\`;
    } else if (animaticState.type === "cycle-detection") {
      arrayRow.innerHTML = animaticState.nums.map((num, idx) => {
        const isSlow = idx === step.slow;
        const isFast = idx === step.fast;
        const isCollided = isSlow && isFast;
        const isMatched = step.matchedIndices?.includes(idx);
        let cellClass = "animatic-cell";
        if (isCollided) cellClass += " active cycle-match";
        else if (isSlow) cellClass += " active pointer-slow";
        else if (isFast) cellClass += " active pointer-fast";
        else if (isMatched) cellClass += " matched";

        return \`
          <div class="\${cellClass}" data-index="\${idx}">
            <div class="cell-index">[\${idx}]</div>
            <div class="cell-value">\${num}</div>
            <div class="cell-pointer">
              \${isCollided ? '<span class="pointer-badge pointer-collision">Slow & Fast</span>' :
                isSlow ? '<span class="pointer-badge pointer-s">Slow</span>' :
                isFast ? '<span class="pointer-badge pointer-f">Fast</span>' : ''}
            </div>
          </div>
        \`;
      }).join("");
    } else if (animaticState.type === "binary-search") {
      arrayRow.innerHTML = animaticState.nums.map((num, idx) => {
        const isLeft = idx === step.left;
        const isRight = idx === step.right;
        const isMid = idx === step.mid;
        const isMatched = step.matchedIndices?.includes(idx);
        const isEliminated = step.left !== undefined && step.right !== undefined && (idx < step.left || idx > step.right);

        let cellClass = "animatic-cell";
        if (isMatched) cellClass += " matched";
        else if (isMid) cellClass += " active";
        else if (isEliminated) cellClass += " eliminated";

        return \`
          <div class="\${cellClass}" data-index="\${idx}">
            <div class="cell-index">[\${idx}]</div>
            <div class="cell-value">\${num}</div>
            <div class="cell-pointer">
              \${isMid ? '<span class="pointer-badge">Mid</span>' :
                isLeft ? '<span class="pointer-badge">L</span>' :
                isRight ? '<span class="pointer-badge">R</span>' : ''}
            </div>
          </div>
        \`;
      }).join("");
    } else if (animaticState.type === "dual-pointer") {
      arrayRow.innerHTML = animaticState.nums.map((num, idx) => {
        const isL = idx === step.left;
        const isR = idx === step.right;
        const isMatched = step.matchedIndices?.includes(idx);
        let cellClass = "animatic-cell";
        if (isMatched) cellClass += " matched";
        else if (isL || isR) cellClass += " active";

        return \`
          <div class="\${cellClass}" data-index="\${idx}">
            <div class="cell-index">[\${idx}]</div>
            <div class="cell-value">\${num}</div>
            <div class="cell-pointer">
              \${isL ? '<span class="pointer-badge">L</span>' : isR ? '<span class="pointer-badge">R</span>' : ''}
            </div>
          </div>
        \`;
      }).join("");
    } else {
      // Default: array-map
      arrayRow.innerHTML = animaticState.nums.map((num, idx) => {
        const isActive = idx === step.pointer;
        const isMatched = step.matchedIndices?.includes(idx);
        let cellClass = "animatic-cell";
        if (isMatched) cellClass += " matched";
        else if (isActive) cellClass += " active";

        return \`
          <div class="\${cellClass}" data-index="\${idx}">
            <div class="cell-index">[\${idx}]</div>
            <div class="cell-value">\${num}</div>
            <div class="cell-pointer">\${isActive ? '<span class="pointer-badge">i</span>' : ''}</div>
          </div>
        \`;
      }).join("");
    }
  }

  // Memory Grid (Hash map state)
  if (memoryGrid) {
    if (animaticState.type === "array-map") {
      const mapEntries = [];
      for (let i = 0; i <= safeIndex; i++) {
        const s = animaticState.steps[i];
        if (s.inMap === false && s.currentVal !== undefined) {
          mapEntries.push({ key: s.currentVal, val: s.pointer });
        }
      }
      if (mapEntries.length === 0) {
        memoryGrid.innerHTML = '<span class="memory-empty-state">Empty Hash Map { }</span>';
      } else {
        memoryGrid.innerHTML = mapEntries.map(e => \`
          <div class="memory-cell">
            <span class="memory-key">\${e.key}</span>
            <span class="memory-arrow">&rarr;</span>
            <span class="memory-val">index \${e.val}</span>
          </div>
        \`).join("");
      }
    } else {
      memoryGrid.innerHTML = \`<div class="memory-cell"><span class="memory-key">Auxiliary Space</span><span class="memory-arrow">:</span><span class="memory-val">O(1) Constant Variables</span></div>\`;
    }
  }

  // Live Variable State Table
  const varsTableBody = $("animaticVarsTableBody");
  if (varsTableBody) {
    varsTableBody.innerHTML = animaticState.steps.map((st, idx) => {
      const isCurrent = idx === safeIndex;
      const rowClass = isCurrent ? "active-step-row" : "";
      return \`
        <tr class="\${rowClass}">
          <td>Step \${idx + 1}</td>
          <td>\${st.pointer !== undefined ? st.pointer : st.slow !== undefined ? \`S:\${st.slow}, F:\${st.fast}\` : st.left !== undefined ? \`L:\${st.left}, R:\${st.right}\` : '-'}</td>
          <td>\${st.currentVal !== undefined ? st.currentVal : st.nums ? st.nums.join(',') : '-'}</td>
          <td>\${animaticState.target !== null ? animaticState.target : 'Sort'}</td>
          <td>\${st.complement !== undefined ? st.complement : st.formula ? st.formula.slice(0, 20) : '-'}</td>
          <td>\${st.inMap ? 'Yes &#10004;' : st.inMap === false ? 'No &#10008;' : '-'}</td>
          <td>\${escapeHTML(st.action || '')}</td>
        </tr>
      \`;
    }).join("");
  }
}

function goToAnimaticStep(stepIndex) {
  renderAnimaticStep(stepIndex);
}

function toggleAnimaticPlay() {
  if (animaticState.isPlaying) {
    stopAnimaticPlayback();
  } else {
    startAnimaticPlayback();
  }
}

function startAnimaticPlayback() {
  animaticState.isPlaying = true;
  const playLabel = $("animaticPlayLabel");
  if (playLabel) playLabel.textContent = "Pause";

  const playIcon = $("animaticPlayIcon");
  if (playIcon) {
    playIcon.innerHTML = '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>';
  }

  const interval = 1600 / animaticState.speed;
  animaticState.timer = setInterval(() => {
    if (animaticState.currentStep < animaticState.steps.length - 1) {
      renderAnimaticStep(animaticState.currentStep + 1);
    } else {
      stopAnimaticPlayback();
    }
  }, interval);
}

function stopAnimaticPlayback() {
  animaticState.isPlaying = false;
  if (animaticState.timer) {
    clearInterval(animaticState.timer);
    animaticState.timer = null;
  }
  const playLabel = $("animaticPlayLabel");
  if (playLabel) playLabel.textContent = "Play";

  const playIcon = $("animaticPlayIcon");
  if (playIcon) {
    playIcon.innerHTML = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>';
  }
}

async function openAiCodeMentorWorkspace(params) {
  currentMentorProblem = params;
  currentMentorMode = "explain";
  currentMentorHintIndex = 0;

  // View Return Memory
  if ($("profileRoutePage") && !$("profileRoutePage").hidden) {
    currentMentorPreviousView = "profile";
  } else if ($("memberHome") && !$("memberHome").hidden) {
    currentMentorPreviousView = "memberHome";
  } else {
    currentMentorPreviousView = "overview";
  }

  // Hide other pages
  const appShell = document.querySelector(".app-shell");
  if (appShell) appShell.hidden = true;
  if ($("memberHome")) $("memberHome").hidden = true;
  if ($("profileRoutePage")) $("profileRoutePage").hidden = true;

  const page = $("aiMentorPage");
  if (!page) return;
  page.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });

  const data = getEducationalDataFor(params.slug, params.title);

  // Populate Header
  const titleEl = $("mentorProblemTitle");
  if (titleEl) titleEl.textContent = params.title || data.title;

  const metaEl = $("mentorProblemMeta");
  const problemNum = params.frontendId || data.number || (params.slug ? params.slug : '');
  if (metaEl) metaEl.textContent = \`\${problemNum ? '#' + escapeHTML(problemNum) + ' · ' : ''}AI Code Mentor Review\`;

  const diff = params.difficulty || data.difficulty;
  const diffBadge = $("mentorDifficultyBadge");
  if (diffBadge) {
    diffBadge.textContent = diff;
    diffBadge.className = \`badge-difficulty badge-\${diff.toLowerCase()}\`;
  }

  const status = params.status || "Accepted";
  const statusBadge = $("mentorStatusBadge");
  if (statusBadge) {
    statusBadge.textContent = status;
    statusBadge.className = \`badge-status \${status === "Accepted" ? "status-accepted" : "status-attempted"}\`;
  }

  const attemptsBadge = $("mentorAttemptsBadge");
  const attemptsCount = params.attemptsCount || 1;
  if (attemptsBadge) attemptsBadge.textContent = \`⚡ \${attemptsCount} \${attemptsCount === 1 ? 'attempt' : 'attempts'}\`;

  // Language mapping: match the actual submission language!
  const selectedLang = normalizeLanguageKey(params.language);
  const langBadge = $("mentorLangBadge");
  if (langBadge) langBadge.textContent = formatLang(selectedLang);

  const langSelect = $("mentorLangSelect");
  if (langSelect) langSelect.value = selectedLang;

  const leetCodeUrl = params.url || (params.slug ? \`https://leetcode.com/problems/\${encodeURIComponent(params.slug)}/\` : "https://leetcode.com/");
  const leetCodeLink = $("mentorLeetCodeLink");
  if (leetCodeLink) leetCodeLink.href = leetCodeUrl;

  // Problem Context
  const contextTitle = $("mentorProblemContextTitle");
  if (contextTitle) contextTitle.textContent = params.title || data.title;
  const contextDesc = $("mentorProblemDescription");
  if (contextDesc) contextDesc.textContent = data.description;

  // Code input & Source indication
  currentMentorBuggyState = status !== "Accepted";
  const codeInput = $("mentorCodeInput");
  const sourceBadge = $("mentorCodeSourceBadge");
  const sourceNotice = $("mentorSourceNotice");

  // Determine source code
  let resolvedCode = null;
  let resolvedSourceType = "Starter Template";

  if (params.code && typeof params.code === "string" && params.code.trim()) {
    resolvedCode = params.code;
    resolvedSourceType = "Verified LeetCode";
  } else {
    // Check locally saved code
    const storageKey = \`dsaverse_mentor_code_\${params.slug || params.title}\`;
    const locallySaved = localStorage.getItem(storageKey);
    if (locallySaved && locallySaved.trim()) {
      resolvedCode = locallySaved;
      resolvedSourceType = "Previously Saved";
    } else {
      // Try fetching saved source from server
      try {
        const query = params.slug ? \`problemSlug=\${encodeURIComponent(params.slug)}\` : \`problemTitle=\${encodeURIComponent(params.title)}\`;
        const resp = await apiRequest(\`/api/ai-code-mentor/source?\${query}\`);
        if (resp && resp.sourceCode) {
          resolvedCode = resp.sourceCode;
          resolvedSourceType = "Previously Saved";
        }
      } catch {}
    }
  }

  if (resolvedCode) {
    if (codeInput) codeInput.value = resolvedCode;
    if (sourceBadge) sourceBadge.textContent = \`Source: \${resolvedSourceType}\`;
    if (sourceNotice) sourceNotice.hidden = true;
  } else {
    // Code is unavailable from public LeetCode GraphQL
    const starterCode = currentMentorBuggyState
      ? (data.buggyCodeByLang?.[selectedLang] || data.buggyCode)
      : (data.acceptedCodeByLang?.[selectedLang] || data.acceptedCode);
    if (codeInput) codeInput.value = starterCode;
    if (sourceBadge) sourceBadge.textContent = "Source: Starter Template";
    if (sourceNotice) sourceNotice.hidden = false;
  }
  updateMentorLineNumbers();

  // Check AI Mentor configuration status
  try {
    const configResp = await apiRequest("/api/ai-code-mentor/config");
    const configNotice = $("mentorAiConfigNotice");
    if (configNotice) {
      if (!configResp || !configResp.configured) {
        configNotice.hidden = false;
      } else {
        configNotice.hidden = true;
      }
    }
  } catch {}

  // Render normal mode analysis
  renderNormalModeAnalysis(data, currentMentorBuggyState);

  // Setup animatic mode
  setupAnimaticMode(data.animatic || PROBLEM_EDUCATIONAL_DATA["two-sum"].animatic);

  // Switch to normal tab
  switchMentorLearningTab("normal");
}

function closeAiCodeMentorWorkspace() {
  stopAnimaticPlayback();
  const page = $("aiMentorPage");
  if (page) page.hidden = true;

  if (currentMentorPreviousView === "memberHome" && $("memberHome")) {
    $("memberHome").hidden = false;
  } else if ($("profileRoutePage")) {
    $("profileRoutePage").hidden = false;
  } else {
    const appShell = document.querySelector(".app-shell");
    if (appShell) appShell.hidden = false;
  }
}

function initializeAiCodeMentor() {
  // 1. Back to profile button
  const backBtn = $("mentorBackToProfile");
  if (backBtn && !backBtn.dataset.bound) {
    backBtn.dataset.bound = "true";
    backBtn.addEventListener("click", closeAiCodeMentorWorkspace);
  }

  // 2. Learning Mode switcher
  const normalTabBtn = $("mentorModeNormalBtn");
  const animaticTabBtn = $("mentorModeAnimaticBtn");
  if (normalTabBtn && !normalTabBtn.dataset.bound) {
    normalTabBtn.dataset.bound = "true";
    normalTabBtn.addEventListener("click", () => switchMentorLearningTab("normal"));
  }
  if (animaticTabBtn && !animaticTabBtn.dataset.bound) {
    animaticTabBtn.dataset.bound = "true";
    animaticTabBtn.addEventListener("click", () => switchMentorLearningTab("animatic"));
  }

  // 3. Code Editor interactions
  const codeInput = $("mentorCodeInput");
  if (codeInput && !codeInput.dataset.bound) {
    codeInput.dataset.bound = "true";
    codeInput.addEventListener("input", () => {
      const sourceBadge = $("mentorCodeSourceBadge");
      const sourceNotice = $("mentorSourceNotice");
      if (sourceBadge) sourceBadge.textContent = "Source: Manually Pasted";
      if (sourceNotice) sourceNotice.hidden = true;
      updateMentorLineNumbers();

      // Persist in localStorage and background save
      if (currentMentorProblem) {
        const storageKey = \`dsaverse_mentor_code_\${currentMentorProblem.slug || currentMentorProblem.title}\`;
        localStorage.setItem(storageKey, codeInput.value);
      }
    });

    codeInput.addEventListener("scroll", () => {
      const lineEl = $("mentorLineNumbers");
      if (lineEl) lineEl.scrollTop = codeInput.scrollTop;
    });

    // Tab key support
    codeInput.addEventListener("keydown", event => {
      if (event.key === "Tab") {
        event.preventDefault();
        const start = codeInput.selectionStart;
        const end = codeInput.selectionEnd;
        codeInput.value = codeInput.value.substring(0, start) + "    " + codeInput.value.substring(end);
        codeInput.selectionStart = codeInput.selectionEnd = start + 4;
        updateMentorLineNumbers();
      }
    });
  }

  // Language dropdown change
  const langSelect = $("mentorLangSelect");
  if (langSelect && !langSelect.dataset.bound) {
    langSelect.dataset.bound = "true";
    langSelect.addEventListener("change", () => {
      const selectedLang = langSelect.value;
      const data = getEducationalDataFor(currentMentorProblem?.slug, currentMentorProblem?.title);
      const input = $("mentorCodeInput");
      const sourceBadge = $("mentorCodeSourceBadge");

      // Update optimal code display immediately
      const optimalCodeEl = $("mentorOptimalCode");
      const optimalTitleEl = $("mentorOptimalTitle");
      if (optimalCodeEl) {
        optimalCodeEl.textContent = data.acceptedCodeByLang?.[selectedLang] || data.optimalCode || data.acceptedCode;
      }
      if (optimalTitleEl) {
        optimalTitleEl.textContent = \`\${data.optimalTitle || "Optimal Solution"} (\${formatLang(selectedLang)})\`;
      }

      // If user hasn't edited the starter template, load the template for the new language
      if (input && sourceBadge && sourceBadge.textContent.includes("Original Code Unavailable") && data.hasLocalSolution) {
        const starter = currentMentorBuggyState
          ? (data.buggyCodeByLang?.[selectedLang] || data.buggyCode)
          : (data.acceptedCodeByLang?.[selectedLang] || data.acceptedCode);
        input.value = starter;
        updateMentorLineNumbers();
      }

      const langBadge = $("mentorLangBadge");
      if (langBadge) langBadge.textContent = formatLang(selectedLang);
    });
  }

  // 4. Copy code buttons
  const copyCodeBtn = $("mentorCopyCodeBtn");
  if (copyCodeBtn && !copyCodeBtn.dataset.bound) {
    copyCodeBtn.dataset.bound = "true";
    copyCodeBtn.addEventListener("click", async () => {
      const input = $("mentorCodeInput");
      if (!input || !input.value) return;
      await navigator.clipboard.writeText(input.value).catch(() => {});
      const originalText = copyCodeBtn.textContent;
      copyCodeBtn.textContent = "Copied!";
      setTimeout(() => { copyCodeBtn.textContent = originalText; }, 1500);
    });
  }

  const copyOptimalBtn = $("mentorCopyOptimalBtn");
  if (copyOptimalBtn && !copyOptimalBtn.dataset.bound) {
    copyOptimalBtn.dataset.bound = "true";
    copyOptimalBtn.addEventListener("click", async () => {
      const optimalCode = $("mentorOptimalCode");
      if (!optimalCode || !optimalCode.textContent || optimalCode.textContent.startsWith("Problem-specific optimal code is not available")) {
        showToast("Optimal code is unavailable for this problem. Configure OPENAI_API_KEY.");
        return;
      }
      await navigator.clipboard.writeText(optimalCode.textContent).catch(() => {});
      const originalText = copyOptimalBtn.textContent;
      copyOptimalBtn.textContent = "Copied!";
      setTimeout(() => { copyOptimalBtn.textContent = originalText; }, 1500);
    });
  }

  // 5. Toggle sample code button
  const sampleToggleBtn = $("mentorSampleToggleBtn");
  if (sampleToggleBtn && !sampleToggleBtn.dataset.bound) {
    sampleToggleBtn.dataset.bound = "true";
    sampleToggleBtn.addEventListener("click", () => {
      const data = getEducationalDataFor(currentMentorProblem?.slug, currentMentorProblem?.title);
      currentMentorBuggyState = !currentMentorBuggyState;
      const input = $("mentorCodeInput");
      const selectedLang = $("mentorLangSelect")?.value || "python3";
      if (input) {
        input.value = currentMentorBuggyState
          ? (data.buggyCodeByLang?.[selectedLang] || data.buggyCode)
          : (data.acceptedCodeByLang?.[selectedLang] || data.acceptedCode);
        updateMentorLineNumbers();
      }
      renderNormalModeAnalysis(data, currentMentorBuggyState);
      showToast(currentMentorBuggyState ? "Loaded mistake example." : "Loaded optimal solution.");
    });
  }

  // 6. Action Chips (Deep Analysis, Find Mistake, Time & Space, Optimize, Dry Run, Teach, Hint)
  document.querySelectorAll(".mentor-action-chip").forEach(chip => {
    if (!chip.dataset.bound) {
      chip.dataset.bound = "true";
      chip.addEventListener("click", () => {
        document.querySelectorAll(".mentor-action-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        currentMentorMode = chip.dataset.mentorMode || "explain";
        const data = getEducationalDataFor(currentMentorProblem?.slug, currentMentorProblem?.title);
        renderNormalModeAnalysis(data, currentMentorBuggyState);

        // Smooth scroll to relevant section
        if (currentMentorMode === "optimize") {
          $("mentorOptimalTitle")?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (currentMentorMode === "dry-run") {
          $("mentorDryRunCard")?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (currentMentorMode === "hint") {
          $("mentorHintCard")?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (currentMentorMode === "complexity") {
          $("mentorTimeComplexity")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }
  });

  // 7. Find Mistake Quick Button
  const findMistakeBtn = $("mentorFindMistakeQuickBtn");
  if (findMistakeBtn && !findMistakeBtn.dataset.bound) {
    findMistakeBtn.dataset.bound = "true";
    findMistakeBtn.addEventListener("click", () => {
      currentMentorMode = "mistake";
      document.querySelectorAll(".mentor-action-chip").forEach(c => {
        if (c.dataset.mentorMode === "mistake") c.classList.add("active");
        else c.classList.remove("active");
      });
      const data = getEducationalDataFor(currentMentorProblem?.slug, currentMentorProblem?.title);
      renderNormalModeAnalysis(data, currentMentorBuggyState);
      const targetAlert = currentMentorBuggyState ? $("mentorMistakeAlert") : $("mentorAcceptedAlert");
      if (targetAlert) targetAlert.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  // 8. Progressive Hint Next Button
  const nextHintBtn = $("mentorNextHintBtn");
  if (nextHintBtn && !nextHintBtn.dataset.bound) {
    nextHintBtn.dataset.bound = "true";
    nextHintBtn.addEventListener("click", () => {
      const data = getEducationalDataFor(currentMentorProblem?.slug, currentMentorProblem?.title);
      if (Array.isArray(data.hints) && data.hints.length) {
        currentMentorHintIndex = (currentMentorHintIndex + 1) % data.hints.length;
        renderNormalModeAnalysis(data, currentMentorBuggyState);
      }
    });
  }

  // 9. Analyze with AI Mentor Button (Calls backend /api/ai-code-mentor/reviews)
  const analyzeBtn = $("mentorAnalyzeBtn");
  if (analyzeBtn && !analyzeBtn.dataset.bound) {
    analyzeBtn.dataset.bound = "true";
    analyzeBtn.addEventListener("click", async () => {
      const input = $("mentorCodeInput");
      if (!input || !input.value.trim()) return showToast("Paste or type code to analyze.", "error");

      const origText = analyzeBtn.innerHTML;
      analyzeBtn.disabled = true;
      analyzeBtn.innerHTML = "Analyzing with Mentor…";

      const payload = {
        sourceCode: input.value,
        language: $("mentorLangSelect")?.value || "python3",
        problemTitle: $("mentorProblemTitle")?.textContent || "Two Sum",
        mode: currentMentorMode,
        retainSource: Boolean($("mentorRetainSource")?.checked)
      };

      const data = getEducationalDataFor(currentMentorProblem?.slug, currentMentorProblem?.title);

      try {
        const response = await apiRequest("/api/ai-code-mentor/reviews", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        if (response && response.review) {
          $("mentorAiConfigNotice").hidden = true;
          renderNormalModeAnalysis(data, currentMentorBuggyState, response.review.analysis);
          showToast("AI Code Mentor analysis complete.");
        } else {
          $("mentorAiConfigNotice").hidden = false;
          renderNormalModeAnalysis(data, currentMentorBuggyState);
          showToast("Educational review generated from local knowledge engine.");
        }
      } catch (err) {
        // Fallback to local pedagogical mentor analysis gracefully
        const configNotice = $("mentorAiConfigNotice");
        if (configNotice) configNotice.hidden = false;
        renderNormalModeAnalysis(data, currentMentorBuggyState);
        showToast("Educational review generated from local knowledge engine.");
      } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = origText;
      }
    });
  }

  // 10. Sound Controls for Animatic Mode
  const soundToggle = $("animaticSoundToggle");
  const soundIcon = $("animaticSoundIcon");
  const soundLabel = $("animaticSoundLabel");
  const volumeSlider = $("animaticVolumeSlider");
  const volumeLabel = $("animaticVolumeLabel");

  if (soundToggle && !soundToggle.dataset.bound) {
    soundToggle.dataset.bound = "true";
    soundToggle.addEventListener("click", () => {
      soundFX.muted = !soundFX.muted;
      soundToggle.setAttribute("aria-pressed", String(!soundFX.muted));
      if (soundIcon) soundIcon.textContent = soundFX.muted ? "🔇" : "🔊";
      if (soundLabel) soundLabel.textContent = soundFX.muted ? "Sound: Muted" : "Sound: On";
      soundToggle.classList.toggle("active", !soundFX.muted);
      if (!soundFX.muted) {
        soundFX.step();
        showToast("Audio feedback enabled.");
      } else {
        showToast("Audio muted.");
      }
    });
  }

  if (volumeSlider && !volumeSlider.dataset.bound) {
    volumeSlider.dataset.bound = "true";
    volumeSlider.addEventListener("input", () => {
      soundFX.volume = Number(volumeSlider.value) || 0.3;
      if (volumeLabel) volumeLabel.textContent = \`\${Math.round(soundFX.volume * 100)}%\`;
    });
  }

  // 11. Animatic Playback Controls
  const firstBtn = $("animaticFirstBtn");
  const prevBtn = $("animaticPrevBtn");
  const playBtn = $("animaticPlayBtn");
  const nextBtn = $("animaticNextBtn");
  const lastBtn = $("animaticLastBtn");
  const resetBtn = $("animaticResetBtn");

  if (firstBtn && !firstBtn.dataset.bound) {
    firstBtn.dataset.bound = "true";
    firstBtn.addEventListener("click", () => goToAnimaticStep(0));
  }
  if (prevBtn && !prevBtn.dataset.bound) {
    prevBtn.dataset.bound = "true";
    prevBtn.addEventListener("click", () => goToAnimaticStep(animaticState.currentStep - 1));
  }
  if (playBtn && !playBtn.dataset.bound) {
    playBtn.dataset.bound = "true";
    playBtn.addEventListener("click", toggleAnimaticPlay);
  }
  if (nextBtn && !nextBtn.dataset.bound) {
    nextBtn.dataset.bound = "true";
    nextBtn.addEventListener("click", () => goToAnimaticStep(animaticState.currentStep + 1));
  }
  if (lastBtn && !lastBtn.dataset.bound) {
    lastBtn.dataset.bound = "true";
    lastBtn.addEventListener("click", () => goToAnimaticStep(animaticState.steps.length - 1));
  }
  if (resetBtn && !resetBtn.dataset.bound) {
    resetBtn.dataset.bound = "true";
    resetBtn.addEventListener("click", () => {
      stopAnimaticPlayback();
      goToAnimaticStep(0);
    });
  }

  // Speed controls
  document.querySelectorAll(".animatic-speed-btn").forEach(btn => {
    if (!btn.dataset.bound) {
      btn.dataset.bound = "true";
      btn.addEventListener("click", () => {
        document.querySelectorAll(".animatic-speed-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        animaticState.speed = Number(btn.dataset.speed) || 1;
        if (animaticState.isPlaying) {
          stopAnimaticPlayback();
          toggleAnimaticPlay();
        }
      });
    }
  });

  // Scrubber click
  const scrubber = $("animaticProgressTrack");
  if (scrubber && !scrubber.dataset.bound) {
    scrubber.dataset.bound = "true";
    scrubber.addEventListener("click", event => {
      if (!animaticState.steps.length) return;
      const rect = scrubber.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const stepIdx = Math.round(fraction * (animaticState.steps.length - 1));
      goToAnimaticStep(stepIdx);
    });
  }

  // 12. Global Delegation for .daily-question-card and .btn-review-mentor
  if (!document.body.dataset.mentorDelegationBound) {
    document.body.dataset.mentorDelegationBound = "true";
    document.body.addEventListener("click", event => {
      if (event.target.closest("a.question-leetcode-link")) return;
      const card = event.target.closest(".daily-question-card");
      const btn = event.target.closest(".btn-review-mentor");
      if (!card && !btn) return;
      const targetEl = btn || card;
      event.preventDefault();
      openAiCodeMentorWorkspace({
        slug: targetEl.dataset.reviewSlug || "",
        title: targetEl.dataset.reviewTitle || "LeetCode Problem",
        difficulty: targetEl.dataset.reviewDiff || "Medium",
        status: targetEl.dataset.reviewStatus || "Accepted",
        language: targetEl.dataset.reviewLang || "python3",
        url: targetEl.dataset.reviewUrl || "",
        attemptsCount: Number(targetEl.dataset.reviewAttempts) || 1,
        frontendId: targetEl.dataset.frontendId || ""
      });
    });
  }
}

initializeAiCodeMentor();
initializeApp();
`;

fs.writeFileSync(scriptPath, before + replacement, "utf8");
fs.writeFileSync(publicScriptPath, before + replacement, "utf8");
console.log("Successfully rebuilt script.js and public/script.js without duplicates!");
