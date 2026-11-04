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
    acceptedCode: `class Solution:
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
        return slow`,
    acceptedCodeByLang: {
      java: `class Solution {
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
}`,
      python3: `class Solution:
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
        return slow`,
      cpp: `class Solution {
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
};`,
      javascript: `var findDuplicate = function(nums) {
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
};`,
      typescript: `function findDuplicate(nums: number[]): number {
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
}`,
      go: `func findDuplicate(nums []int) int {
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
}`,
      rust: `impl Solution {
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
}`
    },
    buggyCode: `class Solution:
    def findDuplicate(self, nums: list[int]) -> int:
        # Inefficient nested loops: O(n²) time results in Time Limit Exceeded
        for i in range(len(nums)):
            for j in range(i + 1, len(nums)):
                if nums[i] == nums[j]:
                    return nums[i]
        return -1`,
    buggyCodeByLang: {
      java: `class Solution {
    public int findDuplicate(int[] nums) {
        // Inefficient nested loops: O(n²) time results in Time Limit Exceeded
        for (int i = 0; i < nums.length; i++) {
            for (int j = i + 1; j < nums.length; j++) {
                if (nums[i] == nums[j]) return nums[i];
            }
        }
        return -1;
    }
}`,
      python3: `class Solution:
    def findDuplicate(self, nums: list[int]) -> int:
        for i in range(len(nums)):
            for j in range(i + 1, len(nums)):
                if nums[i] == nums[j]: return nums[i]
        return -1`,
      cpp: `class Solution {
public:
    int findDuplicate(vector<int>& nums) {
        for (int i = 0; i < nums.size(); ++i) {
            for (int j = i + 1; j < nums.size(); ++j) {
                if (nums[i] == nums[j]) return nums[i];
            }
        }
        return -1;
    }
};`,
      javascript: `var findDuplicate = function(nums) {
    for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
            if (nums[i] === nums[j]) return nums[i];
        }
    }
    return -1;
};`,
      typescript: `function findDuplicate(nums: number[]): number {
    for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
            if (nums[i] === nums[j]) return nums[i];
        }
    }
    return -1;
}`,
      go: `func findDuplicate(nums []int) int {
    for i := 0; i < len(nums); i++ {
        for j := i + 1; j < len(nums); j++ {
            if nums[i] == nums[j] { return nums[i] }
        }
    }
    return -1
}`,
      rust: `impl Solution {
    pub fn find_duplicate(nums: Vec<i32>) -> i32 {
        for i in 0..nums.len() {
            for j in (i + 1)..nums.len() {
                if nums[i] == nums[j] { return nums[i]; }
            }
        }
        -1
    }
}`
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
    acceptedCode: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []`,
    acceptedCodeByLang: {
      java: `class Solution {
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
}`,
      python3: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {}
        for i, num in enumerate(nums):
            comp = target - num
            if comp in seen:
                return [seen[comp], i]
            seen[num] = i
        return []`,
      cpp: `class Solution {
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
};`,
      javascript: `var twoSum = function(nums, target) {
    const seen = new Map();
    for (let i = 0; i < nums.length; i++) {
        const comp = target - nums[i];
        if (seen.has(comp)) return [seen.get(comp), i];
        seen.set(nums[i], i);
    }
    return [];
};`,
      typescript: `function twoSum(nums: number[], target: number): number[] {
    const seen = new Map<number, number>();
    for (let i = 0; i < nums.length; i++) {
        const comp = target - nums[i];
        if (seen.has(comp)) return [seen.get(comp)!, i];
        seen.set(nums[i], i);
    }
    return [];
}`,
      go: `func twoSum(nums []int, target int) []int {
    seen := make(map[int]int)
    for i, num := range nums {
        comp := target - num
        if idx, ok := seen[comp]; ok {
            return []int{idx, i}
        }
        seen[num] = i
    }
    return nil
}`,
      rust: `use std::collections::HashMap;

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
}`
    },
    buggyCode: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        # Buggy implementation: Self-pairing bug using identical index
        for i in range(len(nums)):
            for j in range(len(nums)):
                if nums[i] + nums[j] == target:
                    return [i, j] # Fails when target=6, nums=[3,2,4] -> returns [0, 0]
        return []`,
    buggyCodeByLang: {
      java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Buggy implementation: Self-pairing bug using identical index
        for (int i = 0; i < nums.length; i++) {
            for (int j = 0; j < nums.length; j++) {
                if (nums[i] + nums[j] == target) return new int[] { i, j };
            }
        }
        return new int[0];
    }
}`,
      python3: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        for i in range(len(nums)):
            for j in range(len(nums)):
                if nums[i] + nums[j] == target: return [i, j]
        return []`,
      cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        for (int i = 0; i < nums.size(); ++i) {
            for (int j = 0; j < nums.size(); ++j) {
                if (nums[i] + nums[j] == target) return { i, j };
            }
        }
        return {};
    }
};`,
      javascript: `var twoSum = function(nums, target) {
    for (let i = 0; i < nums.length; i++) {
        for (let j = 0; j < nums.length; j++) {
            if (nums[i] + nums[j] === target) return [i, j];
        }
    }
    return [];
};`,
      typescript: `function twoSum(nums: number[], target: number): number[] {
    for (let i = 0; i < nums.length; i++) {
        for (let j = 0; j < nums.length; j++) {
            if (nums[i] + nums[j] === target) return [i, j];
        }
    }
    return [];
}`,
      go: `func twoSum(nums []int, target int) []int {
    for i := 0; i < len(nums); i++ {
        for j := 0; j < len(nums); j++ {
            if nums[i] + nums[j] == target { return []int{i, j} }
        }
    }
    return nil
}`,
      rust: `impl Solution {
    pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {
        for i in 0..nums.len() {
            for j in 0..nums.len() {
                if nums[i] + nums[j] == target { return vec![i as i32, j as i32]; }
            }
        }
        vec![]
    }
}`
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
    acceptedCode: `class Solution:
    def minPairSum(self, nums: list[int]) -> int:
        nums.sort()
        n = len(nums)
        max_sum = 0
        for i in range(n // 2):
            max_sum = max(max_sum, nums[i] + nums[n - 1 - i])
        return max_sum`,
    acceptedCodeByLang: {
      java: `class Solution {
    public int minPairSum(int[] nums) {
        Arrays.sort(nums);
        int max = 0;
        int n = nums.length;
        for (int i = 0; i < n / 2; i++) {
            max = Math.max(max, nums[i] + nums[n - 1 - i]);
        }
        return max;
    }
}`,
      python3: `class Solution:
    def minPairSum(self, nums: list[int]) -> int:
        nums.sort()
        n = len(nums)
        return max(nums[i] + nums[n - 1 - i] for i in range(n // 2))`,
      cpp: `class Solution {
public:
    int minPairSum(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        int ans = 0, n = nums.size();
        for (int i = 0; i < n / 2; ++i) {
            ans = max(ans, nums[i] + nums[n - 1 - i]);
        }
        return ans;
    }
};`,
      javascript: `var minPairSum = function(nums) {
    nums.sort((a, b) => a - b);
    let max = 0, n = nums.length;
    for (let i = 0; i < n / 2; i++) {
        max = Math.max(max, nums[i] + nums[n - 1 - i]);
    }
    return max;
};`,
      typescript: `function minPairSum(nums: number[]): number {
    nums.sort((a, b) => a - b);
    let max = 0, n = nums.length;
    for (let i = 0; i < n / 2; i++) {
        max = Math.max(max, nums[i] + nums[n - 1 - i]);
    }
    return max;
}`,
      go: `func minPairSum(nums []int) int {
    sort.Ints(nums)
    maxSum, n := 0, len(nums)
    for i := 0; i < n/2; i++ {
        sum := nums[i] + nums[n-1-i]
        if sum > maxSum { maxSum = sum }
    }
    return maxSum
}`,
      rust: `impl Solution {
    pub fn min_pair_sum(mut nums: Vec<i32>) -> i32 {
        nums.sort();
        let n = nums.len();
        let mut max_sum = 0;
        for i in 0..(n / 2) {
            max_sum = max_sum.max(nums[i] + nums[n - 1 - i]);
        }
        max_sum
    }
}`
    },
    buggyCode: `class Solution:
    def minPairSum(self, nums: list[int]) -> int:
        # Buggy / Suboptimal: Arbitrary consecutive pairing without sorting
        max_sum = 0
        for i in range(0, len(nums), 2):
            max_sum = max(max_sum, nums[i] + nums[i + 1])
        return max_sum`,
    buggyCodeByLang: {
      java: `class Solution {
    public int minPairSum(int[] nums) {
        // Buggy pairing: fails when array is unsorted
        int max = 0;
        for (int i = 0; i < nums.length; i += 2) {
            max = Math.max(max, nums[i] + nums[i + 1]);
        }
        return max;
    }
}`,
      python3: `class Solution:
    def minPairSum(self, nums: list[int]) -> int:
        return max(nums[i] + nums[i + 1] for i in range(0, len(nums), 2))`,
      cpp: `class Solution {
public:
    int minPairSum(vector<int>& nums) {
        int ans = 0;
        for (int i = 0; i < nums.size(); i += 2) ans = max(ans, nums[i] + nums[i + 1]);
        return ans;
    }
};`,
      javascript: `var minPairSum = function(nums) {
    let max = 0;
    for (let i = 0; i < nums.length; i += 2) max = Math.max(max, nums[i] + nums[i + 1]);
    return max;
};`,
      typescript: `function minPairSum(nums: number[]): number {
    let max = 0;
    for (let i = 0; i < nums.length; i += 2) max = Math.max(max, nums[i] + nums[i + 1]);
    return max;
}`,
      go: `func minPairSum(nums []int) int {
    maxSum := 0
    for i := 0; i < len(nums); i += 2 {
        if s := nums[i] + nums[i+1]; s > maxSum { maxSum = s }
    }
    return maxSum
}`,
      rust: `impl Solution {
    pub fn min_pair_sum(nums: Vec<i32>) -> i32 {
        let mut max_sum = 0;
        for i in (0..nums.len()).step_by(2) {
            max_sum = max_sum.max(nums[i] + nums[i + 1]);
        }
        max_sum
    }
}`
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
    acceptedCode: `class Solution:
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
        return -1`,
    acceptedCodeByLang: {
      java: `class Solution {
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
}`,
      python3: `class Solution:
    def search(self, nums: list[int], target: int) -> int:
        left, right = 0, len(nums) - 1
        while left <= right:
            mid = left + (right - left) // 2
            if nums[mid] == target: return mid
            elif nums[mid] < target: left = mid + 1
            else: right = mid - 1
        return -1`,
      cpp: `class Solution {
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
};`,
      javascript: `var search = function(nums, target) {
    let left = 0, right = nums.length - 1;
    while (left <= right) {
        let mid = Math.floor(left + (right - left) / 2);
        if (nums[mid] === target) return mid;
        else if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
};`,
      typescript: `function search(nums: number[], target: number): number {
    let left: number = 0, right: number = nums.length - 1;
    while (left <= right) {
        let mid: number = Math.floor(left + (right - left) / 2);
        if (nums[mid] === target) return mid;
        else if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}`,
      go: `func search(nums []int, target int) int {
    left, right := 0, len(nums)-1
    for left <= right {
        mid := left + (right-left)/2
        if nums[mid] == target { return mid }
        if nums[mid] < target { left = mid + 1 } else { right = mid - 1 }
    }
    return -1
}`,
      rust: `impl Solution {
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
}`
    },
    buggyCode: `class Solution:
    def search(self, nums: list[int], target: int) -> int:
        # Buggy: Integer overflow & strict inequality misses single element
        left, right = 0, len(nums) - 1
        while left < right: # Fails when len == 1 or target at boundary
            mid = (left + right) // 2 # Potential integer overflow in static languages
            if nums[mid] == target: return mid
            elif nums[mid] < target: left = mid
            else: right = mid
        return -1`,
    buggyCodeByLang: {
      java: `class Solution {
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
}`,
      python3: `class Solution:
    def search(self, nums: list[int], target: int) -> int:
        left, right = 0, len(nums) - 1
        while left < right:
            mid = (left + right) // 2
            if nums[mid] == target: return mid
            elif nums[mid] < target: left = mid
            else: right = mid
        return -1`,
      cpp: `class Solution {
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
};`,
      javascript: `var search = function(nums, target) {
    let left = 0, right = nums.length - 1;
    while (left < right) {
        let mid = Math.floor((left + right) / 2);
        if (nums[mid] === target) return mid;
        else if (nums[mid] < target) left = mid;
        else right = mid;
    }
    return -1;
};`,
      typescript: `function search(nums: number[], target: number): number {
    let left = 0, right = nums.length - 1;
    while (left < right) {
        let mid = Math.floor((left + right) / 2);
        if (nums[mid] === target) return mid;
        else if (nums[mid] < target) left = mid;
        else right = mid;
    }
    return -1;
}`,
      go: `func search(nums []int, target int) int {
    left, right := 0, len(nums)-1
    for left < right {
        mid := (left + right) / 2
        if nums[mid] == target { return mid }
        if nums[mid] < target { left = mid } else { right = mid }
    }
    return -1
}`,
      rust: `impl Solution {
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
}`
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
    acceptedCode: `class Solution:
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
        return nums`,
    acceptedCodeByLang: {
      java: `class Solution {
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
}`,
      python3: `class Solution:
    def bubbleSort(self, nums: list[int]) -> list[int]:
        n = len(nums)
        for i in range(n):
            swapped = False
            for j in range(0, n - i - 1):
                if nums[j] > nums[j + 1]:
                    nums[j], nums[j + 1] = nums[j + 1], nums[j]
                    swapped = True
            if not swapped: break
        return nums`,
      cpp: `class Solution {
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
};`,
      javascript: `var bubbleSort = function(nums) {
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
};`,
      typescript: `function bubbleSort(nums: number[]): number[] {
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
}`,
      go: `func bubbleSort(nums []int) []int {
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
}`,
      rust: `impl Solution {
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
}`
    },
    buggyCode: `class Solution:
    def bubbleSort(self, nums: list[int]) -> list[int]:
        # Buggy: Index out of bounds (n instead of n - 1) & no early termination
        for i in range(len(nums)):
            for j in range(len(nums)): # Out of bounds when j = len(nums) - 1
                if nums[j] > nums[j + 1]:
                    nums[j], nums[j + 1] = nums[j + 1], nums[j]
        return nums`,
    buggyCodeByLang: {
      java: `class Solution {
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
}`,
      python3: `class Solution:
    def bubbleSort(self, nums: list[int]) -> list[int]:
        for i in range(len(nums)):
            for j in range(len(nums)):
                if nums[j] > nums[j + 1]: nums[j], nums[j + 1] = nums[j + 1], nums[j]
        return nums`,
      cpp: `class Solution {
public:
    void bubbleSort(vector<int>& nums) {
        for (int i = 0; i < nums.size(); ++i) {
            for (int j = 0; j < nums.size(); ++j) {
                if (nums[j] > nums[j + 1]) swap(nums[j], nums[j + 1]);
            }
        }
    }
};`,
      javascript: `var bubbleSort = function(nums) {
    for (let i = 0; i < nums.length; i++) {
        for (let j = 0; j < nums.length; j++) {
            if (nums[j] > nums[j + 1]) [nums[j], nums[j + 1]] = [nums[j + 1], nums[j]];
        }
    }
    return nums;
};`,
      typescript: `function bubbleSort(nums: number[]): number[] {
    for (let i = 0; i < nums.length; i++) {
        for (let j = 0; j < nums.length; j++) {
            if (nums[j] > nums[j + 1]) [nums[j], nums[j + 1]] = [nums[j + 1], nums[j]];
        }
    }
    return nums;
}`,
      go: `func bubbleSort(nums []int) []int {
    for i := 0; i < len(nums); i++ {
        for j := 0; j < len(nums); j++ {
            if nums[j] > nums[j+1] { nums[j], nums[j+1] = nums[j+1], nums[j] }
        }
    }
    return nums
}`,
      rust: `impl Solution {
    pub fn bubble_sort(mut nums: Vec<i32>) -> Vec<i32> {
        for i in 0..nums.len() {
            for j in 0..nums.len() {
                if nums[j] > nums[j + 1] { nums.swap(j, j + 1); }
            }
        }
        nums
    }
}`
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
;
module.exports = PROBLEM_EDUCATIONAL_DATA;