"use strict";
const fs = require("node:fs");
const path = require("node:path");

const scriptPath = path.join(__dirname, "../script.js");
const publicScriptPath = path.join(__dirname, "../public/script.js");
let content = fs.readFileSync(scriptPath, "utf8");

// 1. Minimum Moves to Equal Array Elements Data Definition
const minMovesData = `  "minimum-moves-to-equal-array-elements": {
    title: "Minimum Moves to Equal Array Elements",
    number: "453",
    difficulty: "Medium",
    description: "Given an integer array nums of size n, return the minimum number of moves required to make all array elements equal. In one move, you can increment n - 1 elements of the array by 1.",
    acceptedCode: \`class Solution:
    def minMoves(self, nums: list[int]) -> int:
        # Incrementing n - 1 elements by 1 is mathematically equivalent
        # to decrementing 1 element by 1 relative to all other elements.
        # Therefore, to make all elements equal with minimum moves, reduce each element
        # down to the array minimum: moves = sum(nums[i] - min(nums)).
        min_val = min(nums)
        return sum(x - min_val for x in nums)\`,
    acceptedCodeByLang: {
      java: \`class Solution {
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
}\`,
      python3: \`class Solution:
    def minMoves(self, nums: list[int]) -> int:
        min_val = min(nums)
        return sum(x - min_val for x in nums)\`,
      cpp: \`class Solution {
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
};\`,
      javascript: \`var minMoves = function(nums) {
    let min = nums[0];
    for (let i = 1; i < nums.length; i++) {
        if (nums[i] < min) min = nums[i];
    }
    let moves = 0;
    for (let i = 0; i < nums.length; i++) {
        moves += nums[i] - min;
    }
    return moves;
};\`,
      typescript: \`function minMoves(nums: number[]): number {
    let min = nums[0];
    for (let i = 1; i < nums.length; i++) {
        if (nums[i] < min) min = nums[i];
    }
    let moves = 0;
    for (let i = 0; i < nums.length; i++) {
        moves += nums[i] - min;
    }
    return moves;
}\`,
      go: \`func minMoves(nums []int) int {
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
}\`,
      rust: \`impl Solution {
    pub fn min_moves(nums: Vec<i32>) -> i32 {
        let min_val = *nums.iter().min().unwrap();
        nums.iter().map(|&x| x - min_val).sum()
    }
}\`
    },
    buggyCode: \`class Solution:
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
        return moves\`,
    buggyCodeByLang: {
      java: \`class Solution {
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
}\`,
      python3: \`class Solution:
    def minMoves(self, nums: list[int]) -> int:
        moves = 0
        while len(set(nums)) > 1:
            max_idx = nums.index(max(nums))
            for i in range(len(nums)):
                if i != max_idx:
                    nums[i] += 1
            moves += 1
        return moves\`,
      cpp: \`class Solution {
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
};\`,
      javascript: \`var minMoves = function(nums) {
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
};\`,
      typescript: \`function minMoves(nums: number[]): number {
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
}\`,
      go: \`func minMoves(nums []int) int {
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
}\`,
      rust: \`impl Solution {
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
}\`
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
`;

const dataMarker = "const PROBLEM_EDUCATIONAL_DATA = {\n";
if (!content.includes(dataMarker)) {
  console.error("PROBLEM_EDUCATIONAL_DATA marker not found in script.js!");
  process.exit(1);
}
content = content.replace(dataMarker, dataMarker + minMovesData);

// 2. Strict getEducationalDataFor
const getEduStartMarker = "function getEducationalDataFor(slug, title) {";
const getEduEndMarker = "let currentMentorProblem = null;";

const eduStartIdx = content.indexOf(getEduStartMarker);
const eduEndIdx = content.indexOf(getEduEndMarker);

if (eduStartIdx === -1 || eduEndIdx === -1) {
  console.error("getEducationalDataFor boundaries not found in script.js!");
  process.exit(1);
}

const strictGetEduFunction = `function getEducationalDataFor(slug, title) {
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
    description: \`Problem description for \${cleanTitle}. Connect OpenAI API key on the server to generate real-time AI code review and optimal solutions.\`,
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

`;

content = content.substring(0, eduStartIdx) + strictGetEduFunction + content.substring(eduEndIdx);

// 3. Update renderNormalModeAnalysis to handle provider badge and unavailable local solutions
const renderAnalysisStartMarker = "function renderNormalModeAnalysis(data, isBuggy, analysisResult = null) {";
const renderAnalysisEndMarker = "function switchMentorLearningTab(tabName) {";

const renderStartIdx = content.indexOf(renderAnalysisStartMarker);
const renderEndIdx = content.indexOf(renderAnalysisEndMarker);

if (renderStartIdx === -1 || renderEndIdx === -1) {
  console.error("renderNormalModeAnalysis boundaries not found in script.js!");
  process.exit(1);
}

const updatedRenderFunction = `function renderNormalModeAnalysis(data, isBuggy, analysisResult = null) {
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
      optimalTitleEl.textContent = \`\${data.optimalTitle || "Optimal Solution"} (\${langName})\`;
    }
  }

  // Approach Comparison Table
  if (comparisonBodyEl) {
    if (data.hasLocalSolution === false) {
      comparisonBodyEl.innerHTML = \`
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
      \`;
    } else {
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
  }

  // Takeaways
  if (takeawaysListEl && Array.isArray(data.takeaways)) {
    takeawaysListEl.innerHTML = data.takeaways.map(t => \`<li><span class="takeaway-bullet">&#10003;</span> \${escapeHTML(t)}</li>\`).join("");
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
          acceptedFixEl.innerHTML = \`<strong>Performance Analysis:</strong> Your algorithm is correct. Compare with the <strong>\${escapeHTML(data.optimalTitle || "Optimal Solution")}</strong> below to see if asymptotic speed can be enhanced from \${escapeHTML(data.bruteForceTime || 'O(n²)')} to \${escapeHTML(data.timeComplexity || 'O(n)')}.\`;
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
        if (mistakeDetailEl) mistakeDetailEl.textContent = \`The solution exceeded the allowable LeetCode execution time budget (\${data.bruteForceTime || 'quadratic operations'}). Large inputs timed out.\`;
        if (mistakeFixEl) mistakeFixEl.innerHTML = \`<strong>Optimization roadmap:</strong> \${escapeHTML(data.mistakeFix || "Eliminate nested loops to lower asymptotic complexity.")}\`;
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
        if (mistakeFixEl) mistakeFixEl.innerHTML = \`<strong>Recommended fix:</strong> \${escapeHTML(data.mistakeFix || "Correct algorithm invariants and retest.")}\`;
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
      if (hintTitle) hintTitle.textContent = \`Hint \${currentMentorHintIndex + 1} of \${data.hints.length}: Guidance\`;
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
        thead.innerHTML = \`<tr>\${data.dryRun.headers.map(h => \`<th>\${escapeHTML(h)}</th>\`).join("")}</tr>\`;
      }
      if (tbody && Array.isArray(data.dryRun.rows)) {
        tbody.innerHTML = data.dryRun.rows.map(r => \`<tr>\${r.map(c => \`<td><code>\${escapeHTML(String(c))}</code></td>\`).join("")}</tr>\`).join("");
      }
    } else {
      dryRunCard.hidden = true;
    }
  }

  // Structured Analysis or Mode-Specific Guidance
  if (analysisResult && Array.isArray(analysisResult.sections)) {
    if (analysisHeadingEl) analysisHeadingEl.textContent = "AI Code Review Analysis";
    if (analysisBodyEl) {
      analysisBodyEl.innerHTML = \`<p><strong>Summary:</strong> \${escapeHTML(analysisResult.summary || '')}</p>\` +
        analysisResult.sections.map(s => \`<div style="margin-top:12px;"><h4>\${escapeHTML(s.title)}</h4><p>\${escapeHTML(s.content)}</p></div>\`).join("");
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
          analysisBodyEl.innerHTML = \`
            <p><strong>Code Quality: Valid & Accepted &#10003;</strong></p>
            <p>Your submitted code satisfies all test cases on LeetCode without runtime errors or logical flaws.</p>
            <p>To deepen your DSA mastery, examine the <strong>Optimize Code</strong> section to compare asymptotic tradeoffs.</p>
          \`;
        } else {
          analysisBodyEl.innerHTML = \`
            <p><strong>Identified Flaw:</strong> \${escapeHTML(data.mistakeTitle || 'Algorithmic inconsistency')}</p>
            <p>\${escapeHTML(data.mistakeDetail || 'Review edge cases and invariants.')}</p>
            <p><strong>Correction:</strong> \${escapeHTML(data.mistakeFix || 'Apply optimal boundary checks.')}</p>
          \`;
        }
      } else if (currentMentorMode === "complexity") {
        analysisBodyEl.innerHTML = \`
          <p><strong>Time Complexity: \${data.timeComplexity}</strong> &mdash; \${escapeHTML(data.timeExplain || '')}.</p>
          <p><strong>Space Complexity: \${data.spaceComplexity}</strong> &mdash; \${escapeHTML(data.spaceExplain || '')}.</p>
          <p>Trading memory for speed often converts quadratic O(n²) bottlenecks into linear O(n) efficiency.</p>
        \`;
      } else if (currentMentorMode === "teach") {
        analysisBodyEl.innerHTML = \`
          <p><strong>Core Concept:</strong> \${escapeHTML(data.optimalTitle || 'Algorithmic Invariant')}</p>
          <p>\${escapeHTML(data.optimalExplain || 'Preserve state efficiently across iterations.')}</p>
          <p><strong>Key Principle:</strong> \${escapeHTML(data.takeaways?.[0] || 'Observe invariant guarantees.')}</p>
        \`;
      } else if (currentMentorMode === "optimize") {
        analysisBodyEl.innerHTML = \`
          <p><strong>Current Approach:</strong> \${escapeHTML(data.bruteForceTitle || 'Exhaustive Search')} (\${escapeHTML(data.bruteForceTime || 'O(n²)')})</p>
          <p><strong>Optimal Target:</strong> \${escapeHTML(data.optimalTitle || 'Optimal Approach')} (\${escapeHTML(data.optimalTime || data.timeComplexity || 'O(n)')})</p>
          <p>Review the full executable code in the <strong>Optimal Solution</strong> panel below.</p>
        \`;
      } else if (currentMentorMode === "hint") {
        analysisBodyEl.innerHTML = \`
          <p>Use the <strong>Next Hint</strong> button above to reveal progressive conceptual hints step-by-step.</p>
        \`;
      } else if (currentMentorMode === "dry-run") {
        analysisBodyEl.innerHTML = \`
          <p>Review the step-by-step dry run trace table above to observe variable state transitions at each iteration.</p>
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

`;

content = content.substring(0, renderStartIdx) + updatedRenderFunction + content.substring(renderEndIdx);

// 4. Update Source code provenance in openAiCodeMentorWorkspace
content = content.replace(
  `  // Determine source code
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
  }`,
  `  // Determine source code provenance
  let resolvedCode = null;
  let resolvedSourceType = "Original Code Unavailable";

  if (params.code && typeof params.code === "string" && params.code.trim()) {
    resolvedCode = params.code;
    resolvedSourceType = "Verified LeetCode Submission";
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
        if (resp && resp.sourceCode && resp.sourceCode.trim()) {
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
    // Original submission code unavailable
    if (data.hasLocalSolution && data.buggyCodeByLang) {
      const templateCode = currentMentorBuggyState
        ? (data.buggyCodeByLang?.[selectedLang] || data.buggyCode)
        : (data.acceptedCodeByLang?.[selectedLang] || data.acceptedCode);
      if (codeInput) codeInput.value = templateCode;
    } else {
      if (codeInput) codeInput.value = "";
    }
    if (sourceBadge) sourceBadge.textContent = "Source: Original Code Unavailable";
    if (sourceNotice) {
      sourceNotice.hidden = false;
      const noticeBody = sourceNotice.querySelector(".mentor-alert-body");
      if (noticeBody) {
        noticeBody.textContent = "Original LeetCode submission source is unavailable for this record. You can paste your submitted code directly into the editor or analyze the curriculum template.";
      }
    }
  }`
);

// 5. Update language change listener and copy button
content = content.replace(
  `      // If user hasn't edited the starter template, load the template for the new language
      if (input && sourceBadge && sourceBadge.textContent.includes("Starter Template")) {
        const starter = currentMentorBuggyState
          ? (data.buggyCodeByLang?.[selectedLang] || data.buggyCode)
          : (data.acceptedCodeByLang?.[selectedLang] || data.acceptedCode);
        input.value = starter;
        updateMentorLineNumbers();
      }`,
  `      // If user hasn't edited the starter template, load the template for the new language
      if (input && sourceBadge && sourceBadge.textContent.includes("Original Code Unavailable") && data.hasLocalSolution) {
        const starter = currentMentorBuggyState
          ? (data.buggyCodeByLang?.[selectedLang] || data.buggyCode)
          : (data.acceptedCodeByLang?.[selectedLang] || data.acceptedCode);
        input.value = starter;
        updateMentorLineNumbers();
      }`
);

content = content.replace(
  `  const copyOptimalBtn = $("mentorCopyOptimalBtn");
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
  }`,
  `  const copyOptimalBtn = $("mentorCopyOptimalBtn");
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
  }`
);

// Save directly to script.js and public/script.js
fs.writeFileSync(scriptPath, content, "utf8");
fs.writeFileSync(publicScriptPath, content, "utf8");
console.log("Updated script.js and public/script.js directly and successfully!");
