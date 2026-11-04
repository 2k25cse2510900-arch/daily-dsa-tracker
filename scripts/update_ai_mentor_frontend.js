"use strict";
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "script.js");
const publicScriptPath = path.join(root, "public", "script.js");

const currentContent = fs.readFileSync(scriptPath, "utf8");
const marker = "const PROBLEM_EDUCATIONAL_DATA = {";
const splitIdx = currentContent.indexOf(marker);

if (splitIdx === -1) {
  console.error("Marker not found in script.js");
  process.exit(1);
}

const before = currentContent.substring(0, splitIdx);

const replacement = `const PROBLEM_EDUCATIONAL_DATA = {
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
      cpp: \`class Solution {
public:
    int findDuplicate(vector<int>& nums) {
        int slow = nums[0];
        int fast = nums[0];
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
    let slow = nums[0];
    let fast = nums[0];
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
      python3: \`class Solution:
    def findDuplicate(self, nums: list[int]) -> int:
        slow = fast = nums[0]
        while True:
            slow = nums[slow]
            fast = nums[nums[fast]]
            if slow == fast: break
        slow = nums[0]
        while slow != fast:
            slow = nums[slow]
            fast = nums[fast]
        return slow\`
    },
    buggyCode: \`class Solution:
    def findDuplicate(self, nums: list[int]) -> int:
        # Buggy / Inefficient: Nested loops causing Time Limit Exceeded (TLE)
        # Fails performance constraints when n = 100,000 (O(n²) comparisons)
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
    optimalCode: \`class Solution:
    def findDuplicate(self, nums: list[int]) -> int:
        slow = fast = nums[0]
        while True:
            slow = nums[slow]
            fast = nums[nums[fast]]
            if slow == fast: break
        slow = nums[0]
        while slow != fast:
            slow = nums[slow]
            fast = nums[fast]
        return slow\`,
    mistakeTitle: "Mistake / Inefficiency Detected: O(n²) Complexity Bottleneck",
    mistakeDetail: "Using nested loops to compare elements requires O(n²) comparisons. With n = 100,000, this takes over 10¹⁰ operations, failing with Time Limit Exceeded (TLE). Alternatively, using a HashSet violates the O(1) auxiliary space constraint, while sorting violates the rule against mutating the array.",
    mistakeFix: "Model the array as a functional graph where pointer i points to nums[i]. Because there are n+1 values in range [1, n], Dirichlet's Pigeonhole Principle guarantees at least one cycle. Use Floyd's Tortoise and Hare algorithm.",
    takeaways: [
      "Pigeonhole Principle: n+1 integers spanning [1, n] mathematically ensures at least one duplicate exists.",
      "Graph Interpretation: Elements serve as pointers (i -> nums[i]), creating a linked list with a cycle.",
      "Floyd's Algorithm: 2-phase pointer traversal locates the cycle entrance in O(n) time and O(1) space."
    ],
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
      cpp: \`class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;
        for (int i = 0; i < nums.size(); i++) {
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
      python3: \`class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {}
        for i, num in enumerate(nums):
            comp = target - num
            if comp in seen: return [seen[comp], i]
            seen[num] = i
        return []\`
    },
    buggyCode: \`class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        # Buggy implementation: Duplicate index used when target equals 2 * nums[i]
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
}\`
    },
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
    timeExplain: "Single linear pass through the array with O(1) average hash map lookup time",
    spaceExplain: "Auxiliary hash table storing up to n key-value pairs in memory",
    bruteForceTitle: "Nested Loop Search",
    bruteForceTime: "O(n²)",
    bruteForceSpace: "O(1)",
    bruteForceExplain: "Examines all n(n-1)/2 pairs using nested loops.",
    optimalTitle: "One-Pass Hash Table",
    optimalTime: "O(n)",
    optimalSpace: "O(n)",
    optimalExplain: "Computes complement target - num and queries hash map in O(1) average time.",
    optimalCode: \`class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []\`,
    mistakeTitle: "Mistake Detected: Self-Pairing & Duplicate Index Bug",
    mistakeDetail: "When target = 6 and nums = [3, 2, 4], the inner loop checks i = 0 and j = 0. Since 3 + 3 = 6, it incorrectly returns [0, 0] instead of unique element indices [1, 2].",
    mistakeFix: "Avoid reusing the same element index by starting the inner loop at j = i + 1, or better yet, use a one-pass hash map where elements are checked before insertion.",
    takeaways: [
      "Space-Time Tradeoff: Trading O(n) memory in a hash map drops time complexity from O(n²) to O(n).",
      "Complement Formula: Look up target - current to verify pairs in constant O(1) average time.",
      "Self-Pairing Avoidance: Query the map before storing the current element to guarantee distinct indices."
    ],
    animatic: {
      type: "array-map",
      target: 9,
      nums: [2, 7, 11, 15],
      steps: [
        {
          step: 1,
          pointer: 0,
          value: 2,
          complement: 7,
          inMap: false,
          seen: {},
          reaction: "insight",
          formula: "complement = 9 - 2 = 7",
          speech: "First, pointer i points to index 0 (value 2). Complement is 9 - 2 = 7. Seen map is empty, so 7 is not found.",
          action: "Record seen[2] = 0 and advance pointer."
        },
        {
          step: 2,
          pointer: 1,
          value: 7,
          complement: 2,
          inMap: true,
          seen: { 2: 0 },
          reaction: "match",
          formula: "complement = 9 - 7 = 2",
          speech: "Pointer i advances to index 1 (value 7). Complement is 9 - 7 = 2. Looking up 2 in seen map... Found at index 0!",
          action: "Match discovered! Return pair [seen[2], 1] = [0, 1]."
        },
        {
          step: 3,
          pointer: 1,
          value: 7,
          complement: 2,
          inMap: true,
          matchedIndices: [0, 1],
          seen: { 2: 0 },
          reaction: "optimal",
          formula: "nums[0] + nums[1] = 2 + 7 = 9 (Target Match!)",
          speech: "Solution verified! Indices 0 and 1 sum to target 9. The algorithm terminates in just 2 steps instead of quadratic comparisons.",
          action: "Return [0, 1]. Total time: O(n)."
        }
      ]
    }
  },
  "minimize-maximum-pair-sum-in-array": {
    title: "Minimize Maximum Pair Sum in Array",
    number: "1877",
    difficulty: "Medium",
    description: "The pair sum of a pair (a,b) is equal to a + b. The maximum pair sum is the largest pair sum in a list of pairs. Given an array nums of even length n, pair up the elements of nums into n / 2 pairs such that the maximum pair sum is minimized. Return the minimized maximum pair sum.",
    acceptedCode: \`class Solution:
    def minPairSum(self, nums: list[int]) -> int:
        nums.sort()
        max_sum = 0
        n = len(nums)
        for i in range(n // 2):
            max_sum = max(max_sum, nums[i] + nums[n - 1 - i])
        return max_sum\`,
    acceptedCodeByLang: {
      java: \`class Solution {
    public int minPairSum(int[] nums) {
        Arrays.sort(nums);
        int maxSum = 0;
        int n = nums.length;
        for (int i = 0; i < n / 2; i++) {
            maxSum = Math.max(maxSum, nums[i] + nums[n - 1 - i]);
        }
        return maxSum;
    }
}\`
    },
    buggyCode: \`class Solution:
    def minPairSum(self, nums: list[int]) -> int:
        # Buggy greedy: pairing adjacent elements without sorting
        max_sum = 0
        for i in range(0, len(nums), 2):
            max_sum = max(max_sum, nums[i] + nums[i + 1])
        return max_sum\`,
    timeComplexity: "O(n log n)",
    spaceComplexity: "O(1)",
    timeExplain: "Dominated by sorting the array; subsequent two-pointer scan takes linear O(n) time",
    spaceExplain: "In-place two-pointer traversal using constant auxiliary space",
    bruteForceTitle: "All Permutation Pairings",
    bruteForceTime: "O(n!)",
    bruteForceSpace: "O(n)",
    bruteForceExplain: "Evaluating every possible combination of pairs grows factorially, timing out on even small arrays.",
    optimalTitle: "Greedy Dual-Pointer with Sorting",
    optimalTime: "O(n log n)",
    optimalSpace: "O(1)",
    optimalExplain: "Sort array and pair smallest with largest. By rearrangement inequality, this minimizes the maximum sum.",
    optimalCode: \`class Solution:
    def minPairSum(self, nums: list[int]) -> int:
        nums.sort()
        return max(nums[i] + nums[len(nums) - 1 - i] for i in range(len(nums) // 2))\`,
    mistakeTitle: "Mistake Detected: Suboptimal Greedy Pairing",
    mistakeDetail: "Pairing adjacent elements without sorting can pair the largest numbers together. For example, in [3, 5, 2, 3], pairing adjacent (3, 5) and (2, 3) gives max sum 8, whereas sorting produces (2, 5) and (3, 3) with a minimized max sum of 7.",
    mistakeFix: "Sort the array in non-decreasing order first. Then use two pointers (i at start, j at end) to pair each smallest element with the remaining largest element.",
    takeaways: [
      "Greedy Balancing: Pairing smallest with largest balances extreme values, pulling down the ceiling.",
      "Rearrangement Inequality: Any deviation from pairing sorted extremes increases or maintains the max sum.",
      "Two Pointers: After sorting, a single dual-end pass computes the optimal answer in O(n) steps."
    ],
    animatic: {
      type: "dual-pointer",
      target: 7,
      nums: [2, 3, 3, 5],
      steps: [
        {
          step: 1,
          left: 0,
          right: 3,
          reaction: "insight",
          formula: "Sorted nums = [2, 3, 3, 5]. Pointers at left=0 (val 2), right=3 (val 5)",
          speech: "After sorting, we place pointers at the opposite ends of the array to balance extreme magnitudes.",
          action: "Initialize dual-end pointers at boundaries."
        },
        {
          step: 2,
          left: 0,
          right: 3,
          matchedIndices: [0, 3],
          reaction: "match",
          formula: "Pair sum = nums[0] + nums[3] = 2 + 5 = 7. max_sum = 7",
          speech: "First pair: Smallest (2) + Largest (5) = 7. We record max_sum = 7 and move inward.",
          action: "Record pair (2, 5) and advance pointers inward."
        },
        {
          step: 3,
          left: 1,
          right: 2,
          matchedIndices: [1, 2],
          reaction: "match",
          formula: "Pair sum = nums[1] + nums[2] = 3 + 3 = 6. max_sum = max(7, 6) = 7",
          speech: "Next pair: nums[1] (3) + nums[2] (3) = 6. Since 6 < 7, our maximum pair sum remains 7.",
          action: "Evaluate inner pair (3, 3)."
        },
        {
          step: 4,
          left: 2,
          right: 1,
          reaction: "optimal",
          formula: "All pairs evaluated! Minimized maximum pair sum = 7",
          speech: "All elements paired! The minimized maximum pair sum is 7, achieved in O(n log n) time.",
          action: "Return optimal result: 7."
        }
      ]
    }
  },
  "bubble-sort": {
    title: "Bubble Sort",
    number: "Sorting",
    difficulty: "Easy",
    description: "Given an array of integers, sort the elements in ascending order by repeatedly stepping through the list, comparing adjacent elements and swapping them if they are in the wrong order.",
    acceptedCode: \`def bubbleSort(nums: list[int]) -> list[int]:
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
    buggyCode: \`def bubbleSort(nums: list[int]) -> list[int]:
    # Missing swapped flag & boundary check: O(n²) even on already sorted arrays
    for i in range(len(nums)):
        for j in range(len(nums) - 1):
            if nums[j] > nums[j + 1]:
                nums[j], nums[j + 1] = nums[j + 1], nums[j]
    return nums\`,
    timeComplexity: "O(n²)",
    spaceComplexity: "O(1)",
    timeExplain: "Quadratic time in average and worst case due to nested comparisons",
    spaceExplain: "In-place sorting requiring constant auxiliary memory",
    bruteForceTitle: "Unoptimized Nested Swaps",
    bruteForceTime: "O(n²)",
    bruteForceSpace: "O(1)",
    bruteForceExplain: "Checks all pairs repeatedly even if array becomes sorted early.",
    optimalTitle: "Optimized Bubble Sort with Early Exit",
    optimalTime: "O(n) best / O(n²) worst",
    optimalSpace: "O(1)",
    optimalExplain: "Track swaps with a boolean flag to terminate in linear O(n) time on sorted data.",
    optimalCode: \`def bubbleSort(nums):
    n = len(nums)
    for i in range(n):
        swapped = False
        for j in range(n - 1 - i):
            if nums[j] > nums[j+1]:
                nums[j], nums[j+1] = nums[j+1], nums[j]
                swapped = True
        if not swapped: break
    return nums\`,
    mistakeTitle: "Optimization Notice: Unnecessary Passes on Sorted Data",
    mistakeDetail: "Without an early-exit 'swapped' flag, the algorithm always executes the full n(n-1)/2 iterations even when the array is already sorted.",
    mistakeFix: "Add a boolean flag 'swapped' reset before each pass. If no swaps occur, the array is sorted and we break immediately.",
    takeaways: [
      "Bubble Invariant: After pass i, the i-th largest element has bubbled up to its final position.",
      "Early Exit Optimization: A boolean swap flag brings best-case time from O(n²) down to O(n).",
      "In-Place & Stable: Bubble sort never allocates auxiliary arrays and preserves relative order of equal keys."
    ],
    animatic: {
      type: "pillars",
      target: null,
      nums: [5, 2, 8, 1],
      steps: [
        {
          step: 1,
          comparing: [0, 1],
          nums: [5, 2, 8, 1],
          reaction: "insight",
          formula: "Compare nums[0]=5 with nums[1]=2. Since 5 > 2, swap!",
          speech: "Pass 1: Compare adjacent pillars 5 and 2. Since 5 > 2, they are out of order.",
          action: "Swap pillars 5 and 2."
        },
        {
          step: 2,
          comparing: [1, 2],
          nums: [2, 5, 8, 1],
          reaction: "insight",
          formula: "Compare nums[1]=5 with nums[2]=8. 5 < 8 (In order).",
          speech: "Pillars 5 and 8 are already in correct relative order. No swap required.",
          action: "Advance to next adjacent pair."
        },
        {
          step: 3,
          comparing: [2, 3],
          nums: [2, 5, 8, 1],
          reaction: "insight",
          formula: "Compare nums[2]=8 with nums[3]=1. Since 8 > 1, swap!",
          speech: "Pillar 8 is greater than 1. Swap them so 8 continues bubbling rightward.",
          action: "Swap 8 and 1."
        },
        {
          step: 4,
          comparing: [],
          sorted: [3],
          nums: [2, 5, 1, 8],
          reaction: "match",
          formula: "Pass 1 complete. Largest element 8 is locked in final index [3].",
          speech: "Notice how the largest pillar 8 has bubbled to the far right! It is now locked in its final sorted position.",
          action: "Lock index 3 as sorted."
        },
        {
          step: 5,
          comparing: [],
          sorted: [0, 1, 2, 3],
          nums: [1, 2, 5, 8],
          reaction: "optimal",
          formula: "All passes complete! Final sorted array: [1, 2, 5, 8]",
          speech: "Array is completely sorted! Total auxiliary space used: O(1).",
          action: "Sorting completed."
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
            if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
}\`
    },
    buggyCode: \`class Solution:
    def search(self, nums: list[int], target: int) -> int:
        # Buggy: Potential integer overflow & infinite loop on left = mid
        left, right = 0, len(nums) - 1
        while left < right:
            mid = (left + right) // 2
            if nums[mid] < target:
                left = mid
            else:
                right = mid
        return left if nums[left] == target else -1\`,
    timeComplexity: "O(log n)",
    spaceComplexity: "O(1)",
    timeExplain: "Halves the active search space at every comparison step",
    spaceExplain: "Constant auxiliary pointers (left, mid, right)",
    bruteForceTitle: "Linear Scan",
    bruteForceTime: "O(n)",
    bruteForceSpace: "O(1)",
    bruteForceExplain: "Checks elements sequentially from left to right, ignoring sorted order.",
    optimalTitle: "Binary Search Interval Elimination",
    optimalTime: "O(log n)",
    optimalSpace: "O(1)",
    optimalExplain: "Bisects the search range, discarding half the search window at each step.",
    optimalCode: \`class Solution:
    def search(self, nums: list[int], target: int) -> int:
        l, r = 0, len(nums) - 1
        while l <= r:
            m = l + (r - l) // 2
            if nums[m] == target: return m
            if nums[m] < target: l = m + 1
            else: r = m - 1
        return -1\`,
    mistakeTitle: "Boundary Bug & Integer Overflow Notice",
    mistakeDetail: "Using mid = (left + right) // 2 can overflow in typed languages when left + right exceeds 2³¹ - 1. Additionally, using while left < right misses checking single-element intervals.",
    mistakeFix: "Use mid = left + (right - left) // 2 to safely prevent overflow, and use left <= right so the loop checks when left == right.",
    takeaways: [
      "Logarithmic Halving: Halving n at every step requires at most ceil(log2(n)) comparisons.",
      "Overflow Safety: Calculate midpoint as left + (right - left) / 2 instead of (left + right) / 2.",
      "Loop Condition: left <= right ensures single-element search windows are never skipped."
    ],
    animatic: {
      type: "binary-search",
      target: 9,
      nums: [-1, 0, 3, 5, 9, 12],
      steps: [
        {
          step: 1,
          left: 0,
          mid: 2,
          right: 5,
          reaction: "insight",
          formula: "left=0, right=5, mid=2. nums[mid] = 3. Target = 9",
          speech: "We compute mid = 0 + (5 - 0) // 2 = 2. nums[2] is 3. Since 3 < 9, target must be in the right half!",
          action: "Eliminate left half [0..2] and set left = mid + 1 = 3."
        },
        {
          step: 2,
          left: 3,
          mid: 4,
          right: 5,
          eliminated: [0, 1, 2],
          reaction: "insight",
          formula: "left=3, right=5, mid=4. nums[mid] = 9. Target = 9",
          speech: "Compute new mid = 3 + (5 - 3) // 2 = 4. nums[4] is 9. nums[mid] == target!",
          action: "Match discovered at index 4!"
        },
        {
          step: 3,
          left: 3,
          mid: 4,
          right: 5,
          matchedIndices: [4],
          eliminated: [0, 1, 2],
          reaction: "optimal",
          formula: "Target 9 located at index 4! Total comparisons: 2",
          speech: "Target found in just 2 iterations! Linear scan would have required 5 comparisons.",
          action: "Return index: 4."
        }
      ]
    }
  }
};

function getEducationalDataFor(slug, title) {
  const normSlug = (slug || "").toLowerCase().trim();
  if (normSlug && PROBLEM_EDUCATIONAL_DATA[normSlug]) return PROBLEM_EDUCATIONAL_DATA[normSlug];
  if (normSlug === "287" || normSlug.includes("duplicate")) return PROBLEM_EDUCATIONAL_DATA["find-the-duplicate-number"];
  if (normSlug === "1" || normSlug.includes("two-sum")) return PROBLEM_EDUCATIONAL_DATA["two-sum"];
  if (normSlug === "1877" || normSlug.includes("pair-sum")) return PROBLEM_EDUCATIONAL_DATA["minimize-maximum-pair-sum-in-array"];
  if (normSlug === "704" || normSlug.includes("binary-search")) return PROBLEM_EDUCATIONAL_DATA["binary-search"];
  if (normSlug.includes("bubble")) return PROBLEM_EDUCATIONAL_DATA["bubble-sort"];

  const cleanTitle = title || "Algorithmic Problem";
  return {
    title: cleanTitle,
    difficulty: "Medium",
    description: \`Educational review and algorithmic decomposition for \${cleanTitle}.\`,
    acceptedCode: \`// Optimal solution for \${cleanTitle}
function solution(data) {
  // Linear time approach with optimal state tracking
  let result = [];
  return result;
}\`,
    buggyCode: \`// Initial attempt for \${cleanTitle}
function solution(data) {
  // Unoptimized search pattern
  return null;
}\`,
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    timeExplain: "Linear scan through the input space with constant overhead",
    spaceExplain: "In-place modifications or auxiliary variables",
    bruteForceTitle: "Exhaustive Search",
    bruteForceTime: "O(n²)",
    bruteForceSpace: "O(1)",
    bruteForceExplain: "Evaluates all combinations sequentially without pruning.",
    optimalTitle: "Pruned Invariant Traversal",
    optimalTime: "O(n)",
    optimalSpace: "O(1)",
    optimalExplain: "Maintains optimal bounds and terminates in linear time.",
    mistakeTitle: "Boundary / Edge Case Notice",
    mistakeDetail: \`Ensure boundary indices and empty/single-element collections are properly verified for \${cleanTitle}.\`,
    mistakeFix: "Include guards for edge cases before entering the main loop.",
    optimalCode: \`// Optimal implementation for \${cleanTitle}
function solve(input) {
  // Clean invariant preservation
  return input;
}\`,
    takeaways: [
      "Always identify algorithm invariants before writing loops.",
      "Check space/time tradeoffs: hash sets or two-pointer techniques often convert O(n²) to O(n).",
      "Verify edge cases: null inputs, single-element structures, and extreme value limits."
    ],
    animatic: {
      type: "array-map",
      target: 9,
      nums: [2, 7, 11, 15],
      steps: [
        {
          step: 1,
          pointer: 0,
          value: 2,
          complement: 7,
          inMap: false,
          seen: {},
          reaction: "insight",
          formula: "Examine element at index 0",
          speech: \`Analyzing \${cleanTitle}: Initializing pointers and state structures.\`,
          action: "Initialize tracking state."
        },
        {
          step: 2,
          pointer: 1,
          value: 7,
          complement: 2,
          inMap: true,
          seen: { 2: 0 },
          reaction: "match",
          formula: "Target state matched",
          speech: "Processing next element: optimal conditions satisfied.",
          action: "State updated successfully."
        }
      ]
    }
  };
}

function updateMentorLineNumbers() {
  const input = $("mentorCodeInput");
  const linesEl = $("mentorLineNumbers");
  const statsEl = $("mentorCharCount");
  if (!input || !linesEl) return;
  const lineCount = (input.value.match(/\\n/g) || []).length + 1;
  const numArr = [];
  for (let i = 1; i <= Math.max(lineCount, 12); i++) numArr.push(i);
  linesEl.textContent = numArr.join("\\n");
  if (statsEl) statsEl.textContent = \`\${lineCount} \${lineCount === 1 ? 'line' : 'lines'} · \${input.value.length} chars\`;
}

function renderNormalModeAnalysis(data, isBuggy, analysisResult = null) {
  const status = currentMentorProblem?.status || (isBuggy ? "Wrong Answer" : "Accepted");
  const timeComplexityEl = $("mentorTimeComplexity");
  const spaceComplexityEl = $("mentorSpaceComplexity");
  const timeExplainEl = $("mentorTimeExplain");
  const spaceExplainEl = $("mentorSpaceExplain");
  const optimalCodeEl = $("mentorOptimalCode");
  const takeawaysListEl = $("mentorTakeawaysList");
  const mistakeAlertEl = $("mentorMistakeAlert");
  const mistakeTitleEl = $("mentorMistakeTitle");
  const mistakeDetailEl = $("mentorMistakeDetail");
  const mistakeFixEl = $("mentorMistakeFix");
  const analysisHeadingEl = $("mentorAnalysisHeading");
  const analysisBodyEl = $("mentorAnalysisBody");
  const comparisonBodyEl = $("mentorComparisonTableBody");

  if (timeComplexityEl) timeComplexityEl.textContent = data.timeComplexity || "O(n)";
  if (spaceComplexityEl) spaceComplexityEl.textContent = data.spaceComplexity || "O(1)";
  if (timeExplainEl) timeExplainEl.textContent = data.timeExplain || "Optimal algorithmic traversal";
  if (spaceExplainEl) spaceExplainEl.textContent = data.spaceExplain || "Auxiliary memory footprint";
  if (optimalCodeEl) optimalCodeEl.textContent = data.optimalCode || data.acceptedCode;

  // Comparison Table
  if (comparisonBodyEl) {
    comparisonBodyEl.innerHTML = \`
      <tr>
        <td><strong>Brute Force</strong> (\${escapeHTML(data.bruteForceTitle || "Nested Search")})</td>
        <td><code>\${escapeHTML(data.bruteForceTime || "O(n²)")}</code></td>
        <td><code>\${escapeHTML(data.bruteForceSpace || "O(1)")}</code></td>
        <td><span class="badge-status status-attempted">Slow / TLE</span></td>
      </tr>
      <tr class="highlight-row">
        <td><strong>Optimal Solution</strong> (\${escapeHTML(data.optimalTitle || "Recommended Approach")})</td>
        <td><code>\${escapeHTML(data.optimalTime || data.timeComplexity || "O(n)")}</code></td>
        <td><code>\${escapeHTML(data.optimalSpace || data.spaceComplexity || "O(1)")}</code></td>
        <td><span class="badge-status status-accepted">Optimal (Recommended)</span></td>
      </tr>
    \`;
  }

  // Takeaways
  if (takeawaysListEl && Array.isArray(data.takeaways)) {
    takeawaysListEl.innerHTML = data.takeaways.map(t => \`<li><span class="takeaway-bullet">&#10003;</span> \${escapeHTML(t)}</li>\`).join("");
  }

  // Handle Submission Statuses (Wrong Answer, TLE, Runtime Error, Compilation Error, Accepted)
  const isTLE = status === "Time Limit Exceeded" || status === "TLE" || currentMentorMode === "tle";
  const isRuntimeError = status === "Runtime Error" || currentMentorMode === "runtime-error";
  const isCompileError = status === "Compilation Error" || currentMentorMode === "compilation-error";
  const isMistake = isBuggy || status === "Wrong Answer" || currentMentorMode === "mistake";

  if (mistakeAlertEl) {
    if (isTLE) {
      mistakeAlertEl.hidden = false;
      if (mistakeTitleEl) mistakeTitleEl.textContent = "Time Limit Exceeded: Complexity Bottleneck Detected";
      if (mistakeDetailEl) mistakeDetailEl.textContent = \`The algorithm exceeds the execution budget on large inputs. Nested loops or redundant evaluations produce \${data.bruteForceTime || 'O(n²)'} operations, timing out the evaluator.\`;
      if (mistakeFixEl) mistakeFixEl.innerHTML = \`<strong>Optimization roadmap:</strong> Eliminate the inner loop using an optimal data structure (e.g. Hash Map, Two Pointers, or Binary Search) to reduce complexity from \${data.bruteForceTime || 'O(n²)'} down to \${data.timeComplexity || 'O(n)'}.\`;
    } else if (isRuntimeError) {
      mistakeAlertEl.hidden = false;
      if (mistakeTitleEl) mistakeTitleEl.textContent = "Runtime Error: Unsafe Boundary Operation Detected";
      if (mistakeDetailEl) mistakeDetailEl.textContent = "An unhandled exception occurred during execution: null pointer dereference, array index out of bounds, division by zero, or recursion stack overflow.";
      if (mistakeFixEl) mistakeFixEl.innerHTML = \`<strong>Defensive correction:</strong> Add input boundary validation guards (e.g. length verification and null checks) before array indexing.\`;
    } else if (isCompileError) {
      mistakeAlertEl.hidden = false;
      if (mistakeTitleEl) mistakeTitleEl.textContent = "Compilation Error: Syntax / Type Issue Detected";
      if (mistakeDetailEl) mistakeDetailEl.textContent = "The code failed to compile. Method signature, return type, or syntax rules were not satisfied.";
      if (mistakeFixEl) mistakeFixEl.innerHTML = \`<strong>Correction:</strong> Verify method signatures and imports match the required LeetCode problem specification.\`;
    } else if (isMistake) {
      mistakeAlertEl.hidden = false;
      if (mistakeTitleEl) mistakeTitleEl.textContent = data.mistakeTitle || "Mistake Detected: Logic / Boundary Bug";
      if (mistakeDetailEl) mistakeDetailEl.textContent = data.mistakeDetail || "The code fails on edge cases or produces incorrect outputs for certain inputs.";
      if (mistakeFixEl) mistakeFixEl.innerHTML = \`<strong>Recommended fix:</strong> \${escapeHTML(data.mistakeFix || "Correct algorithm invariants and retest.")}\`;
    } else {
      mistakeAlertEl.hidden = true;
    }
  }

  // If we received structured analysis from server API
  if (analysisResult && Array.isArray(analysisResult.sections)) {
    if (analysisHeadingEl) analysisHeadingEl.textContent = "AI Code Review Analysis";
    if (analysisBodyEl) {
      analysisBodyEl.innerHTML = \`<p><strong>Summary:</strong> \${escapeHTML(analysisResult.summary || '')}</p>\` +
        analysisResult.sections.map(s => \`<div><h4>\${escapeHTML(s.title)}</h4><p>\${escapeHTML(s.content)}</p></div>\`).join("");
    }
  } else {
    // Mode-specific pedagogical guidance
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
      if (currentMentorMode === "mistake" || isMistake) {
        analysisBodyEl.innerHTML = \`
          <p><strong>Identified Flaw:</strong> \${escapeHTML(data.mistakeTitle || 'Algorithmic inconsistency')}</p>
          <p>\${escapeHTML(data.mistakeDetail || 'Review edge cases and invariants.')}</p>
          <p><strong>Correction:</strong> \${escapeHTML(data.mistakeFix || 'Apply optimal boundary checks.')}</p>
        \`;
      } else if (currentMentorMode === "complexity") {
        analysisBodyEl.innerHTML = \`
          <p><strong>Time Complexity: \${data.timeComplexity}</strong> &mdash; \${escapeHTML(data.timeExplain || '')}.</p>
          <p><strong>Space Complexity: \${data.spaceComplexity}</strong> &mdash; \${escapeHTML(data.spaceExplain || '')}.</p>
          <p>Trading memory for speed often converts quadratic O(n²) bottlenecks into linear O(n) or logarithmic O(log n) efficiency.</p>
        \`;
      } else if (currentMentorMode === "hint") {
        analysisBodyEl.innerHTML = \`
          <p><strong>Hint 1:</strong> What invariant must be preserved across each iteration?</p>
          <p><strong>Hint 2:</strong> Can prior computed values be queried in O(1) time rather than rescanning?</p>
        \`;
      } else {
        analysisBodyEl.innerHTML = \`
          <p><strong>Brute Force:</strong> \${escapeHTML(data.bruteForceExplain || 'Naive search checks all permutations.')}</p>
          <p><strong>Optimal Solution:</strong> \${escapeHTML(data.optimalExplain || 'Optimal approach balances operations and storage.')}</p>
          <p>This avoids redundant computations, lowering execution time to <code>\${escapeHTML(data.timeComplexity)}</code>.</p>
        \`;
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

  // 1. Scrubber & Counter
  const total = animaticState.steps.length;
  const counterEl = $("animaticStepCounter");
  const titleEl = $("animaticStepTitle");
  const barEl = $("animaticProgressBar");

  if (counterEl) counterEl.textContent = \`Step \${safeIndex + 1} of \${total}\`;
  if (titleEl) titleEl.textContent = step.action || "Examine array elements";
  if (barEl) barEl.style.width = \`\${((safeIndex + 1) / total) * 100}%\`;

  // 2. Playback buttons state
  const firstBtn = $("animaticFirstBtn");
  const prevBtn = $("animaticPrevBtn");
  const nextBtn = $("animaticNextBtn");
  const lastBtn = $("animaticLastBtn");

  if (firstBtn) firstBtn.disabled = safeIndex === 0;
  if (prevBtn) prevBtn.disabled = safeIndex === 0;
  if (nextBtn) nextBtn.disabled = safeIndex === total - 1;
  if (lastBtn) lastBtn.disabled = safeIndex === total - 1;

  // 3. Array & Visual Stage Rendering
  const arrayRow = $("animaticArrayRow");
  if (arrayRow) {
    if (step.type === "pillars" || animaticState.type === "pillars") {
      arrayRow.innerHTML = \`
        <div class="animatic-pillars-container">
          \${(step.nums || animaticState.nums).map((val, idx) => {
            const isComparing = step.comparing && step.comparing.includes(idx);
            const isSorted = step.sorted && step.sorted.includes(idx);
            const pillarClass = isSorted ? "animatic-pillar sorted" : isComparing ? "animatic-pillar comparing" : "animatic-pillar";
            const heightPx = Math.max(24, Math.min(120, val * 14));
            return \`
              <div class="animatic-pillar-wrap">
                <div class="\${pillarClass}" style="height: \${heightPx}px;">\${val}</div>
                <span class="animatic-index-label">[\${idx}]</span>
              </div>
            \`;
          }).join("")}
        </div>
      \`;
    } else if (step.type === "binary-search" || animaticState.type === "binary-search") {
      arrayRow.innerHTML = animaticState.nums.map((val, idx) => {
        const isTarget = step.matchedIndices && step.matchedIndices.includes(idx);
        const isEliminated = step.eliminated && step.eliminated.includes(idx);
        const isMid = step.mid === idx;
        const isLeft = step.left === idx;
        const isRight = step.right === idx;
        let cellClass = isTarget ? "animatic-cell target-match" : isMid ? "animatic-cell active" : isEliminated ? "animatic-cell eliminated" : "animatic-cell";
        let label = \`[\${idx}]\`;
        if (isMid) label = \`[M:\${idx}]\`;
        else if (isLeft && isRight) label = \`[L,R:\${idx}]\`;
        else if (isLeft) label = \`[L:\${idx}]\`;
        else if (isRight) label = \`[R:\${idx}]\`;
        return \`
          <div class="animatic-cell-wrap">
            <span class="animatic-index-label">\${label}</span>
            <div class="\${cellClass}">\${val}</div>
            \${isMid ? '<span class="animatic-pointer-arrow" aria-hidden="true">&#9650; mid</span>' : ''}
          </div>
        \`;
      }).join("");
    } else if (step.type === "cycle-detection" || animaticState.type === "cycle-detection") {
      arrayRow.innerHTML = animaticState.nums.map((val, idx) => {
        const isCollision = step.slow === idx && step.fast === idx;
        const isSlow = step.slow === idx;
        const isFast = step.fast === idx;
        const isMatch = step.matchedIndices && step.matchedIndices.includes(idx);
        let cellClass = isMatch ? "animatic-cell cycle-match" : isCollision ? "animatic-cell cycle-match" : isSlow ? "animatic-cell pointer-slow" : isFast ? "animatic-cell pointer-fast" : "animatic-cell";
        let pointerText = "";
        if (isCollision) pointerText = '<span class="animatic-pointer-arrow">&#9650; Slow & Fast</span>';
        else if (isSlow) pointerText = '<span class="animatic-pointer-arrow">&#9650; Slow (🐢)</span>';
        else if (isFast) pointerText = '<span class="animatic-pointer-arrow">&#9650; Fast (🐇)</span>';
        return \`
          <div class="animatic-cell-wrap">
            <span class="animatic-index-label">[\${idx}]</span>
            <div class="\${cellClass}">\${val}</div>
            \${pointerText}
          </div>
        \`;
      }).join("");
    } else if (step.type === "dual-pointer" || animaticState.type === "dual-pointer") {
      arrayRow.innerHTML = animaticState.nums.map((val, idx) => {
        const isMatched = step.matchedIndices && step.matchedIndices.includes(idx);
        const isLeft = step.left === idx;
        const isRight = step.right === idx;
        let cellClass = isMatched ? "animatic-cell target-match" : (isLeft || isRight) ? "animatic-cell active" : "animatic-cell";
        let pointerText = "";
        if (isLeft && isRight) pointerText = '<span class="animatic-pointer-arrow">&#9650; i,j</span>';
        else if (isLeft) pointerText = '<span class="animatic-pointer-arrow">&#9650; i</span>';
        else if (isRight) pointerText = '<span class="animatic-pointer-arrow">&#9650; j</span>';
        return \`
          <div class="animatic-cell-wrap">
            <span class="animatic-index-label">[\${idx}]</span>
            <div class="\${cellClass}">\${val}</div>
            \${pointerText}
          </div>
        \`;
      }).join("");
    } else {
      // Default array + hash map
      arrayRow.innerHTML = animaticState.nums.map((val, idx) => {
        const isMatched = step.matchedIndices && step.matchedIndices.includes(idx);
        const isActive = step.pointer === idx && !isMatched;
        const cellClass = isMatched ? "animatic-cell target-match" : isActive ? "animatic-cell active" : "animatic-cell";
        const pointerHtml = isActive ? '<span class="animatic-pointer-arrow" aria-hidden="true">&#9650;</span>' : '';
        return \`
          <div class="animatic-cell-wrap">
            <span class="animatic-index-label">[\${idx}]</span>
            <div class="\${cellClass}">\${val}</div>
            \${pointerHtml}
          </div>
        \`;
      }).join("");
    }
  }

  // 4. Equation Formula
  const formulaEl = $("animaticFormula");
  if (formulaEl) formulaEl.textContent = step.formula || \`pointer = \${step.pointer}\`;

  // 5. Memory Map Grid
  const memoryGrid = $("animaticMemoryGrid");
  if (memoryGrid) {
    const keys = Object.keys(step.seen || {});
    if (keys.length === 0) {
      memoryGrid.innerHTML = '<span class="animatic-memory-empty">Hash map is empty { }</span>';
    } else {
      memoryGrid.innerHTML = keys.map(k => \`<span class="animatic-memory-tile">{ \${k}: \${step.seen[k]} }</span>\`).join("");
    }
  }

  // 6. Mentor Avatar Reaction & Speech
  const avatarEl = document.querySelector(".mentor-badge-avatar");
  if (avatarEl) {
    if (step.reaction === "match" || step.reaction === "found") avatarEl.textContent = "🎯";
    else if (step.reaction === "optimal") avatarEl.textContent = "🚀";
    else if (step.reaction === "bug" || step.reaction === "warning") avatarEl.textContent = "⚠️";
    else if (step.reaction === "insight") avatarEl.textContent = "💡";
    else avatarEl.textContent = "🤖";
  }

  const speechEl = $("animaticMentorSpeech");
  if (speechEl) speechEl.textContent = \`"\${step.speech || ''}"\`;

  // 7. Narration Card
  const narrationHeading = $("animaticNarrationHeading");
  const narrationBody = $("animaticNarrationBody");
  if (narrationHeading) narrationHeading.textContent = \`Step \${safeIndex + 1}: \${step.action || ''}\`;
  if (narrationBody) narrationBody.textContent = step.speech || '';

  // 8. Variable Table
  const varsTableBody = $("animaticVarsTableBody");
  if (varsTableBody) {
    varsTableBody.innerHTML = animaticState.steps.map((s, idx) => {
      const isCurrent = idx === safeIndex;
      const statusBadge = s.matchedIndices ? '<span class="badge-status status-accepted">Match</span>' : s.eliminated ? '<span class="badge-status status-attempted">Narrowed</span>' : '<span class="badge-status">Traversing</span>';
      const pointerVal = s.pointer !== undefined ? s.pointer : (s.mid !== undefined ? s.mid : (s.slow !== undefined ? s.slow : (s.left !== undefined ? s.left : idx)));
      const elemVal = s.value !== undefined ? s.value : (s.nums ? s.nums.join(',') : '');
      return \`
        <tr class="\${isCurrent ? 'active-var-row' : ''}">
          <td>Step \${s.step}</td>
          <td><code>\${pointerVal}</code></td>
          <td><code>\${elemVal}</code></td>
          <td>\${animaticState.target !== null && animaticState.target !== undefined ? animaticState.target : '-'}</td>
          <td><code>\${s.formula || ''}</code></td>
          <td>\${statusBadge}</td>
          <td>\${escapeHTML(s.action)}</td>
        </tr>
      \`;
    }).join("");
  }
}

function goToAnimaticStep(stepIndex) {
  renderAnimaticStep(stepIndex);
}

function stopAnimaticPlayback() {
  if (animaticState.timer) {
    clearInterval(animaticState.timer);
    animaticState.timer = null;
  }
  animaticState.isPlaying = false;
  const playLabel = $("animaticPlayLabel");
  const playIcon = $("animaticPlayIcon");
  if (playLabel) playLabel.textContent = "Play";
  if (playIcon) playIcon.innerHTML = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>';
}

function toggleAnimaticPlay() {
  if (animaticState.isPlaying) {
    stopAnimaticPlayback();
  } else {
    if (animaticState.currentStep >= animaticState.steps.length - 1) {
      animaticState.currentStep = 0;
      renderAnimaticStep(0);
    }
    animaticState.isPlaying = true;
    const playLabel = $("animaticPlayLabel");
    const playIcon = $("animaticPlayIcon");
    if (playLabel) playLabel.textContent = "Pause";
    if (playIcon) playIcon.innerHTML = '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>';

    const interval = Math.round(1800 / animaticState.speed);
    animaticState.timer = setInterval(() => {
      if (animaticState.currentStep < animaticState.steps.length - 1) {
        goToAnimaticStep(animaticState.currentStep + 1);
      } else {
        stopAnimaticPlayback();
      }
    }, interval);
  }
}

function openAiCodeMentorWorkspace(params) {
  currentMentorProblem = params;
  currentMentorMode = "explain";

  // Remember previous view for clean return
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

  const lang = params.language || "python3";
  const langBadge = $("mentorLangBadge");
  if (langBadge) langBadge.textContent = formatLang(lang);

  const langSelect = $("mentorLangSelect");
  if (langSelect) {
    const lk = lang.toLowerCase();
    langSelect.value = lk.includes("python") ? "python3" : lk.includes("cpp") ? "cpp" : lk.includes("java") ? "java" : lk.includes("go") ? "go" : lk.includes("rust") ? "rust" : lk.includes("typescript") ? "typescript" : "javascript";
  }

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
  if (codeInput) {
    const selectedLang = langSelect?.value || "python3";
    const starterCode = currentMentorBuggyState
      ? (data.buggyCodeByLang?.[selectedLang] || data.buggyCode)
      : (data.acceptedCodeByLang?.[selectedLang] || data.acceptedCode);
    codeInput.value = starterCode;
    updateMentorLineNumbers();
  }
  if (sourceBadge) {
    sourceBadge.textContent = params.code ? "Source: LeetCode Verified" : "Source: Manual Input / Editor";
  }

  // Normal mode analysis
  renderNormalModeAnalysis(data, currentMentorBuggyState);

  // Animatic mode
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
      if (sourceBadge) sourceBadge.textContent = "Source: Pasted / Manual Input";
      updateMentorLineNumbers();
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
      if (input) {
        if (data.acceptedCodeByLang && data.acceptedCodeByLang[selectedLang]) {
          input.value = currentMentorBuggyState ? (data.buggyCodeByLang?.[selectedLang] || data.buggyCode) : data.acceptedCodeByLang[selectedLang];
          updateMentorLineNumbers();
        }
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
      if (!optimalCode || !optimalCode.textContent) return;
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

  // 6. Action Chips (Deep Analysis, Find Mistake, Complexity, etc.)
  document.querySelectorAll(".mentor-action-chip").forEach(chip => {
    if (!chip.dataset.bound) {
      chip.dataset.bound = "true";
      chip.addEventListener("click", () => {
        document.querySelectorAll(".mentor-action-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        currentMentorMode = chip.dataset.mentorMode || "explain";
        const data = getEducationalDataFor(currentMentorProblem?.slug, currentMentorProblem?.title);
        renderNormalModeAnalysis(data, currentMentorBuggyState);
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
      renderNormalModeAnalysis(data, true);
      const alertEl = $("mentorMistakeAlert");
      if (alertEl) alertEl.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  // 8. Analyze with AI Mentor Button (Calls backend /api/ai-code-mentor/reviews)
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
          renderNormalModeAnalysis(data, currentMentorBuggyState, response.review.analysis);
          showToast("AI Code Mentor analysis complete.");
        } else {
          renderNormalModeAnalysis(data, currentMentorBuggyState);
          showToast("AI Code Mentor review generated.");
        }
      } catch (err) {
        // Fallback to local pedagogical mentor analysis gracefully
        renderNormalModeAnalysis(data, currentMentorBuggyState);
        showToast("Educational review generated from local mentor knowledge.");
      } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = origText;
      }
    });
  }

  // 9. Animatic Playback Controls
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

  // 10. Global Delegation for .daily-question-card and .btn-review-mentor
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
console.log("Successfully updated script.js and public/script.js");
