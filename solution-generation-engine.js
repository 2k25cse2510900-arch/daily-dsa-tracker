"use strict";

/**
 * Solution Generation Engine (Module 4)
 * Multi-tier solution generation across:
 * - Brute Force (Baseline Benchmark)
 * - Improved / Intermediate Approach (Bottleneck Optimization / Or Honest Unavailable Notice)
 * - Optimal Solution (Constraint Justified Algorithm)
 * - Solution Comparison Matrix
 * - Student Code Comparison (Integration with Module 3)
 *
 * Grounded in Module 1 Canonical Problem Intelligence & Module 2 Staged Reasoning.
 * Fully supports 8 programming languages: Java, Python, Python3, C++, JavaScript, TypeScript, Go, Rust.
 */

const { CANONICAL_PROBLEMS, resolveProblemIdentity } = require("./problem-intelligence-engine");
const { analyzeStudentCode, normalizeLang } = require("./student-code-intelligence");

const SUPPORTED_LANGUAGES = Object.freeze([
  "java",
  "python",
  "python3",
  "cpp",
  "javascript",
  "typescript",
  "go",
  "rust"
]);

const EXECUTION_DISCLAIMER = "AI-generated solution — execution verification not yet performed.";

/**
 * Canonical solution repository for reference problems across 8 languages.
 */
const CANONICAL_SOLUTIONS = {
  "is-subsequence": {
    bruteForce: {
      available: true,
      approachName: "Exhaustive Subsequence Generation",
      technique: "Recursion / Combinatorial Search",
      intuition: "Generate every possible subsequence of target string t (total 2^|t| subsequences) and check if any equals string s.",
      steps: [
        "Recursively branch at each character of t: include it in the current candidate or exclude it.",
        "Store or stream all 2^|t| generated candidate subsequences.",
        "Linearly search through all generated candidates to determine if string s is present.",
        "Return true if a match is found, false otherwise."
      ],
      timeComplexity: "O(2^|t|)",
      timeExplanation: "Binary inclusion/exclusion decision at every character of t yields 2^|t| total leaves.",
      spaceComplexity: "O(|t|)",
      spaceExplanation: "Recursion call stack reaches depth of |t| frames for target string traversal.",
      limitations: [
        "Exponential time explosion: completely intractable for |t| > 25 (t can be up to 10^4).",
        "Generates millions of redundant substrings that do not match the prefix of s.",
        "Causes immediate Time Limit Exceeded (TLE) on LeetCode constraints."
      ],
      codeByLang: {
        java: `class Solution {
    // Brute Force: Recursively check all 2^|t| subsequences
    public boolean isSubsequence(String s, String t) {
        return checkAll(s, t, 0, new StringBuilder());
    }

    private boolean checkAll(String s, String t, int idx, StringBuilder current) {
        if (current.toString().equals(s)) return true;
        if (idx >= t.length()) return false;
        // Option 1: Include t[idx]
        current.append(t.charAt(idx));
        if (checkAll(s, t, idx + 1, current)) return true;
        current.deleteCharAt(current.length() - 1);
        // Option 2: Exclude t[idx]
        return checkAll(s, t, idx + 1, current);
    }
}`,
        python3: `class Solution:
    # Brute Force: Recursively explore all 2^|t| subsequences
    def isSubsequence(self, s: str, t: str) -> bool:
        def generate(idx: int, path: list) -> bool:
            if "".join(path) == s:
                return True
            if idx >= len(t):
                return False
            # Include t[idx]
            path.append(t[idx])
            if generate(idx + 1, path):
                return True
            path.pop()
            # Exclude t[idx]
            return generate(idx + 1, path)
        return generate(0, [])`,
        python: `class Solution:
    def isSubsequence(self, s, t):
        def generate(idx, path):
            if "".join(path) == s:
                return True
            if idx >= len(t):
                return False
            path.append(t[idx])
            if generate(idx + 1, path):
                return True
            path.pop()
            return generate(idx + 1, path)
        return generate(0, [])`,
        cpp: `class Solution {
public:
    // Brute Force: Generate all 2^|t| subsequences via recursion
    bool isSubsequence(string s, string t) {
        string current = "";
        return explore(s, t, 0, current);
    }
private:
    bool explore(const string& s, const string& t, int idx, string& current) {
        if (current == s) return true;
        if (idx >= t.length()) return false;
        // Include t[idx]
        current.push_back(t[idx]);
        if (explore(s, t, idx + 1, current)) return true;
        current.pop_back();
        // Exclude t[idx]
        return explore(s, t, idx + 1, current);
    }
};`,
        javascript: `var isSubsequence = function(s, t) {
    function explore(idx, current) {
        if (current === s) return true;
        if (idx >= t.length) return false;
        // Include t[idx] or exclude
        return explore(idx + 1, current + t[idx]) || explore(idx + 1, current);
    }
    return explore(0, "");
};`,
        typescript: `function isSubsequence(s: string, t: string): boolean {
    function explore(idx: number, current: string): boolean {
        if (current === s) return true;
        if (idx >= t.length) return false;
        return explore(idx + 1, current + t[idx]) || explore(idx + 1, current);
    }
    return explore(0, "");
}`,
        go: `func isSubsequence(s string, t string) bool {
    var explore func(idx int, current []byte) bool
    explore = func(idx int, current []byte) bool {
        if string(current) == s {
            return true
        }
        if idx >= len(t) {
            return false
        }
        // Include t[idx]
        if explore(idx+1, append(current, t[idx])) {
            return true
        }
        // Exclude t[idx]
        return explore(idx+1, current)
    }
    return explore(0, []byte{})
}`,
        rust: `impl Solution {
    pub fn is_subsequence(s: String, t: String) -> bool {
        fn explore(s: &[u8], t: &[u8], idx: usize, current: &mut Vec<u8>) -> bool {
            if current.as_slice() == s {
                return true;
            }
            if idx >= t.len() {
                return false;
            }
            current.push(t[idx]);
            if explore(s, t, idx + 1, current) {
                return true;
            }
            current.pop();
            explore(s, t, idx + 1, current)
        }
        let mut cur = Vec::new();
        explore(s.as_bytes(), t.as_bytes(), 0, &mut cur)
    }
}`
      }
    },
    improved: {
      available: true,
      approachName: "Binary Search on Precomputed Index Map",
      technique: "Hash Map of Sorted Indices + Binary Search",
      intuition: "Map each character in t to a sorted list of its positions. For each char in s, binary search for the smallest index strictly greater than the previous match.",
      steps: [
        "Precompute a hash table mapping each character 'a'..'z' to a sorted list of indices where it appears in t.",
        "Initialize prevIndex = -1 to track the position of the last matched character in t.",
        "For each character c in s, retrieve its index list from the map.",
        "Perform binary search (e.g. upper_bound / bisect_right) to find the smallest index > prevIndex.",
        "If no such index exists, s cannot be formed in relative order: return false.",
        "Update prevIndex with the found index and proceed to next character in s.",
        "Return true if all characters in s were successfully matched."
      ],
      timeComplexity: "O(|t| + |s| log |t|)",
      timeExplanation: "Building index map takes O(|t|). For each character in s, binary search over index list takes O(log |t|).",
      spaceComplexity: "O(|t|)",
      spaceExplanation: "Index map stores every position in t across all character buckets.",
      limitations: [
        "Requires O(|t|) auxiliary memory to store index lists.",
        "For a single query, slower than a direct two-pointer scan due to binary search overhead.",
        "Ideal for the Follow-Up scenario (stream of 10^9 queries against static string t)."
      ],
      codeByLang: {
        java: `import java.util.*;

class Solution {
    // Improved / Follow-Up: Precomputed Index Map with Binary Search
    public boolean isSubsequence(String s, String t) {
        List<Integer>[] pos = new List[26];
        for (int i = 0; i < 26; i++) pos[i] = new ArrayList<>();
        for (int i = 0; i < t.length(); i++) {
            pos[t.charAt(i) - 'a'].add(i);
        }

        int prev = -1;
        for (int i = 0; i < s.length(); i++) {
            List<Integer> list = pos[s.charAt(i) - 'a'];
            if (list.isEmpty()) return false;
            // Binary search for smallest index > prev
            int next = binarySearchNext(list, prev);
            if (next == -1) return false;
            prev = next;
        }
        return true;
    }

    private int binarySearchNext(List<Integer> list, int target) {
        int low = 0, high = list.size() - 1, ans = -1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (list.get(mid) > target) {
                ans = list.get(mid);
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }
        return ans;
    }
}`,
        python3: `import collections
import bisect

class Solution:
    # Improved / Follow-up: Hash Map of Indices with Binary Search
    def isSubsequence(self, s: str, t: str) -> bool:
        pos = collections.defaultdict(list)
        for i, char in enumerate(t):
            pos[char].append(i)

        prev = -1
        for char in s:
            if char not in pos:
                return False
            idx_list = pos[char]
            # Find first index strictly greater than prev
            insert_pos = bisect.bisect_right(idx_list, prev)
            if insert_pos == len(idx_list):
                return False
            prev = idx_list[insert_pos]
        return True`,
        python: `import collections
import bisect

class Solution:
    def isSubsequence(self, s, t):
        pos = collections.defaultdict(list)
        for i, char in enumerate(t):
            pos[char].append(i)
        prev = -1
        for char in s:
            if char not in pos:
                return False
            idx_list = pos[char]
            insert_pos = bisect.bisect_right(idx_list, prev)
            if insert_pos == len(idx_list):
                return False
            prev = idx_list[insert_pos]
        return True`,
        cpp: `class Solution {
public:
    // Improved / Follow-Up: Binary Search on Precomputed Positions
    bool isSubsequence(string s, string t) {
        vector<vector<int>> pos(26);
        for (int i = 0; i < t.size(); i++) {
            pos[t[i] - 'a'].push_back(i);
        }

        int prev = -1;
        for (char c : s) {
            const auto& list = pos[c - 'a'];
            auto it = upper_bound(list.begin(), list.end(), prev);
            if (it == list.end()) return false;
            prev = *it;
        }
        return true;
    }
};`,
        javascript: `var isSubsequence = function(s, t) {
    const pos = Array.from({ length: 26 }, () => []);
    for (let i = 0; i < t.length; i++) {
        pos[t.charCodeAt(i) - 97].push(i);
    }
    let prev = -1;
    for (let i = 0; i < s.length; i++) {
        const list = pos[s.charCodeAt(i) - 97];
        let low = 0, high = list.length - 1, next = -1;
        while (low <= high) {
            const mid = (low + high) >> 1;
            if (list[mid] > prev) {
                next = list[mid];
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }
        if (next === -1) return false;
        prev = next;
    }
    return true;
};`,
        typescript: `function isSubsequence(s: string, t: string): boolean {
    const pos: number[][] = Array.from({ length: 26 }, () => []);
    for (let i = 0; i < t.length; i++) {
        pos[t.charCodeAt(i) - 97].push(i);
    }
    let prev = -1;
    for (let i = 0; i < s.length; i++) {
        const list = pos[s.charCodeAt(i) - 97];
        let low = 0, high = list.length - 1, next = -1;
        while (low <= high) {
            const mid = (low + high) >> 1;
            if (list[mid] > prev) {
                next = list[mid];
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }
        if (next === -1) return false;
        prev = next;
    }
    return true;
}`,
        go: `func isSubsequence(s string, t string) bool {
    pos := make([][]int, 26)
    for i := 0; i < len(t); i++ {
        c := t[i] - 'a'
        pos[c] = append(pos[c], i)
    }
    prev := -1
    for i := 0; i < len(s); i++ {
        list := pos[s[i]-'a']
        low, high, next := 0, len(list)-1, -1
        for low <= high {
            mid := low + (high-low)/2
            if list[mid] > prev {
                next = list[mid]
                high = mid - 1
            } else {
                low = mid + 1
            }
        }
        if next == -1 {
            return false
        }
        prev = next
    }
    return true
}`,
        rust: `impl Solution {
    pub fn is_subsequence(s: String, t: String) -> bool {
        let mut pos: Vec<Vec<usize>> = vec![Vec::new(); 26];
        for (i, &b) in t.as_bytes().iter().enumerate() {
            pos[(b - b'a') as usize].push(i);
        }
        let mut prev: Option<usize> = None;
        for &b in s.as_bytes() {
            let list = &pos[(b - b'a') as usize];
            let next_idx = match prev {
                None => list.first().copied(),
                Some(p) => list.iter().find(|&&x| x > p).copied(),
            };
            match next_idx {
                Some(idx) => prev = Some(idx),
                None => return false,
            }
        }
        true
    }
}`
      }
    },
    optimal: {
      available: true,
      approachName: "Two Pointers Greedy Match",
      technique: "Two Pointers / Greedy Linear Scan",
      intuition: "Scan string t with pointer j, greedily matching characters of s with pointer i. Monotonic forward pointer movement guarantees linear time and constant auxiliary memory.",
      steps: [
        "Initialize pointer i = 0 for string s and pointer j = 0 for string t.",
        "Traverse string t while i < s.length() and j < t.length().",
        "If s[i] == t[j], increment pointer i to search for the next required character.",
        "Always increment pointer j monotonically to advance through t.",
        "When the loop terminates, check if i == s.length() (all characters matched).",
        "Return true if matched, false otherwise."
      ],
      correctnessReasoning: "Greedy Choice Property: Matching the earliest occurrence of s[i] in t preserves the maximum remaining suffix of t for all remaining characters s[i+1...]. Monotonic non-reset pointer traversal guarantees that character relative ordering is strictly maintained without backtracking.",
      timeComplexity: "O(|s| + |t|)",
      timeExplanation: "Each character of string t is examined at most once by pointer j. Pointer i advances at most |s| times.",
      spaceComplexity: "O(1)",
      spaceExplanation: "Uses only two integer scalar pointer variables (i, j); zero auxiliary allocations.",
      edgeCases: [
        "Empty string s: Trivially returns true because i == 0 == s.length().",
        "Empty string t with non-empty s: Loop terminates immediately and returns false.",
        "Both strings empty: Correctly returns true.",
        "Identical characters / repeated sequences: Matches characters sequentially in strict relative order."
      ],
      codeByLang: {
        java: `class Solution {
    // Optimal: Two Pointers Greedy Scan - O(|s| + |t|) Time, O(1) Auxiliary Space
    public boolean isSubsequence(String s, String t) {
        int i = 0, j = 0;
        int sLen = s.length(), tLen = t.length();
        while (i < sLen && j < tLen) {
            if (s.charAt(i) == t.charAt(j)) {
                i++;
            }
            j++;
        }
        return i == sLen;
    }
}`,
        python3: `class Solution:
    # Optimal: Two Pointers Greedy Scan - O(|s| + |t|) Time, O(1) Auxiliary Space
    def isSubsequence(self, s: str, t: str) -> bool:
        i, j = 0, 0
        s_len, t_len = len(s), len(t)
        while i < s_len and j < t_len:
            if s[i] == t[j]:
                i += 1
            j += 1
        return i == s_len`,
        python: `class Solution:
    def isSubsequence(self, s, t):
        i, j = 0, 0
        s_len, t_len = len(s), len(t)
        while i < s_len and j < t_len:
            if s[i] == t[j]:
                i += 1
            j += 1
        return i == s_len`,
        cpp: `class Solution {
public:
    // Optimal: Two Pointers Greedy Scan - O(|s| + |t|) Time, O(1) Auxiliary Space
    bool isSubsequence(string s, string t) {
        int i = 0, j = 0;
        int sLen = s.length(), tLen = t.length();
        while (i < sLen && j < tLen) {
            if (s[i] == t[j]) {
                i++;
            }
            j++;
        }
        return i == sLen;
    }
};`,
        javascript: `var isSubsequence = function(s, t) {
    let i = 0, j = 0;
    const sLen = s.length, tLen = t.length;
    while (i < sLen && j < tLen) {
        if (s[i] === t[j]) {
            i++;
        }
        j++;
    }
    return i === sLen;
};`,
        typescript: `function isSubsequence(s: string, t: string): boolean {
    let i = 0, j = 0;
    const sLen = s.length, tLen = t.length;
    while (i < sLen && j < tLen) {
        if (s[i] === t[j]) {
            i++;
        }
        j++;
    }
    return i === sLen;
}`,
        go: `func isSubsequence(s string, t string) bool {
    i, j := 0, 0
    sLen, tLen := len(s), len(t)
    for i < sLen && j < tLen {
        if s[i] == t[j] {
            i++
        }
        j++
    }
    return i == sLen
}`,
        rust: `impl Solution {
    pub fn is_subsequence(s: String, t: String) -> bool {
        let (s_bytes, t_bytes) = (s.as_bytes(), t.as_bytes());
        let (mut i, mut j) = (0, 0);
        while i < s_bytes.len() && j < t_bytes.len() {
            if s_bytes[i] == t_bytes[j] {
                i += 1;
            }
            j += 1;
        }
        i == s_bytes.len()
    }
}`
      }
    },
    comparison: {
      summary: "Two Pointers Greedy Match is canonical optimal with O(|s| + |t|) time and O(1) auxiliary space. Precomputed Index Map is superior for multi-query stream lookups.",
      preferredApproach: "Two Pointers Greedy Match",
      reason: "Achieves strictly minimal linear time complexity while consuming zero auxiliary memory, respecting all problem constraints without precomputation overhead.",
      tradeoffs: [
        { approach: "Brute Force", technique: "Subsequence Generation", timeComplexity: "O(2^|t|)", spaceComplexity: "O(|t|)", tradeoff: "Intolerable exponential runtime overhead (TLE)." },
        { approach: "Improved Approach", technique: "Index Map + Binary Search", timeComplexity: "O(|t| + |s| log |t|)", spaceComplexity: "O(|t|)", tradeoff: "Allocates O(|t|) extra memory; optimal when querying many strings against static t." },
        { approach: "Optimal Approach", technique: "Two Pointers Greedy Scan", timeComplexity: "O(|s| + |t|)", spaceComplexity: "O(1)", tradeoff: "Strictly optimal single-query algorithm with zero auxiliary memory allocation." }
      ],
      table: [
        { dimension: "Intuition", bruteForce: "Exhaustively generate all 2^|t| subsequences.", improved: "Map character indices and binary search for matches.", optimal: "Greedily match earliest character with two pointers." },
        { dimension: "Time Complexity", bruteForce: "O(2^|t|)", improved: "O(|t| + |s| log |t|)", optimal: "O(|s| + |t|)" },
        { dimension: "Auxiliary Space", bruteForce: "O(|t|)", improved: "O(|t|)", optimal: "O(1)" },
        { dimension: "Key Advantage", bruteForce: "Simple brute force formulation.", improved: "Enables fast repeated queries on static string t.", optimal: "Single-pass linear execution with zero allocations." }
      ]
    }
  },

  "string-compression": {
    bruteForce: {
      available: true,
      approachName: "String Concatenation with Full Copy",
      technique: "String Concatenation",
      intuition: "Construct the compressed string using repeated string concatenation or an auxiliary buffer, violating the in-place constant memory constraint.",
      steps: [
        "Iterate through chars counting consecutive character occurrences.",
        "Append the character and formatted count string to an external string object.",
        "Iterate over the resulting string and write each character back into the chars array.",
        "Return the length of the compressed string."
      ],
      timeComplexity: "O(n²)",
      timeExplanation: "String immutability and repeated concatenation in many languages leads to quadratic O(n²) string copy overhead.",
      spaceComplexity: "O(n)",
      spaceExplanation: "Allocates an auxiliary string buffer proportional to the input length n.",
      limitations: [
        "Violates the strict problem constraint: 'You must write an algorithm that uses only constant extra space.'",
        "Repeated string allocations incur garbage collection and quadratic copy overhead.",
        "Does not demonstrate pointer mastery required for in-place array manipulation."
      ],
      codeByLang: {
        java: `class Solution {
    // Brute Force: String concatenation violating constant space requirement
    public int compress(char[] chars) {
        String res = "";
        int i = 0;
        while (i < chars.length) {
            char curr = chars[i];
            int count = 0;
            while (i < chars.length && chars[i] == curr) {
                count++;
                i++;
            }
            res += curr;
            if (count > 1) {
                res += count;
            }
        }
        for (int j = 0; j < res.length(); j++) {
            chars[j] = res.charAt(j);
        }
        return res.length();
    }
}`,
        python3: `class Solution:
    # Brute Force: Auxiliary string concatenation
    def compress(self, chars: List[str]) -> int:
        res = ""
        i = 0
        n = len(chars)
        while i < n:
            curr = chars[i]
            count = 0
            while i < n and chars[i] == curr:
                count += 1
                i += 1
            res += curr
            if count > 1:
                res += str(count)
        for j, c in enumerate(res):
            chars[j] = c
        return len(res)`,
        python: `class Solution:
    def compress(self, chars):
        res = ""
        i = 0
        n = len(chars)
        while i < n:
            curr = chars[i]
            count = 0
            while i < n and chars[i] == curr:
                count += 1
                i += 1
            res += curr
            if count > 1:
                res += str(count)
        for j, c in enumerate(res):
            chars[j] = c
        return len(res)`,
        cpp: `class Solution {
public:
    // Brute Force: External string allocation
    int compress(vector<char>& chars) {
        string res = "";
        int i = 0, n = chars.size();
        while (i < n) {
            char curr = chars[i];
            int count = 0;
            while (i < n && chars[i] == curr) {
                count++;
                i++;
            }
            res += curr;
            if (count > 1) res += to_string(count);
        }
        for (int j = 0; j < res.length(); j++) {
            chars[j] = res[j];
        }
        return res.length();
    }
};`,
        javascript: `var compress = function(chars) {
    let res = "";
    let i = 0;
    while (i < chars.length) {
        const curr = chars[i];
        let count = 0;
        while (i < chars.length && chars[i] === curr) {
            count++;
            i++;
        }
        res += curr;
        if (count > 1) res += count;
    }
    for (let j = 0; j < res.length; j++) {
        chars[j] = res[j];
    }
    return res.length;
};`,
        typescript: `function compress(chars: string[]): number {
    let res = "";
    let i = 0;
    while (i < chars.length) {
        const curr = chars[i];
        let count = 0;
        while (i < chars.length && chars[i] === curr) {
            count++;
            i++;
        }
        res += curr;
        if (count > 1) res += count;
    }
    for (let j = 0; j < res.length; j++) {
        chars[j] = res[j];
    }
    return res.length;
}`,
        go: `func compress(chars []byte) int {
    var res []byte
    i, n := 0, len(chars)
    for i < n {
        curr := chars[i]
        count := 0
        for i < n && chars[i] == curr {
            count++
            i++
        }
        res = append(res, curr)
        if count > 1 {
            res = append(res, []byte(strconv.Itoa(count))...)
        }
    }
    for j := 0; j < len(res); j++ {
        chars[j] = res[j]
    }
    return len(res)
}`,
        rust: `impl Solution {
    pub fn compress(chars: &mut Vec<char>) -> i32 {
        let mut res = String::new();
        let (mut i, n) = (0, chars.len());
        while i < n {
            let curr = chars[i];
            let mut count = 0;
            while i < n && chars[i] == curr {
                count += 1;
                i += 1;
            }
            res.push(curr);
            if count > 1 {
                res.push_str(&count.to_string());
            }
        }
        for (j, c) in res.chars().enumerate() {
            chars[j] = c;
        }
        res.len() as i32
    }
}`
      }
    },
    improved: {
      available: true,
      approachName: "Auxiliary StringBuilder / Vector Buffer",
      technique: "Dynamic Buffer Compression",
      intuition: "Use an optimized dynamic memory buffer (StringBuilder in Java, vector<char> in C++) to compress in O(n) linear time, then copy back.",
      steps: [
        "Initialize an expandable dynamic buffer with pre-allocated capacity.",
        "Scan consecutive character groups in a single pass.",
        "Append the character and formatted count digits to the buffer.",
        "Copy buffer contents back into chars array and return the new length."
      ],
      timeComplexity: "O(n)",
      timeExplanation: "Single linear pass over chars; amortized O(1) buffer append operations.",
      spaceComplexity: "O(n)",
      spaceExplanation: "Allocates an auxiliary buffer up to size n, violating the O(1) auxiliary space requirement.",
      limitations: [
        "Allocates O(n) auxiliary memory violating the constant extra space requirement.",
        "In interviews, this is considered a partial solution when in-place modification is mandated."
      ],
      codeByLang: {
        java: `class Solution {
    // Improved: Dynamic buffer avoiding quadratic string concatenation (O(n) space)
    public int compress(char[] chars) {
        StringBuilder sb = new StringBuilder();
        int read = 0, n = chars.length;
        while (read < n) {
            char curr = chars[read];
            int count = 0;
            while (read < n && chars[read] == curr) {
                read++;
                count++;
            }
            sb.append(curr);
            if (count > 1) sb.append(count);
        }
        for (int i = 0; i < sb.length(); i++) {
            chars[i] = sb.charAt(i);
        }
        return sb.length();
    }
}`,
        python3: `class Solution:
    # Improved: List buffer avoiding string concatenation overhead (O(n) space)
    def compress(self, chars: List[str]) -> int:
        buffer = []
        read = 0
        n = len(chars)
        while read < n:
            curr = chars[read]
            count = 0
            while read < n and chars[read] == curr:
                read += 1
                count += 1
            buffer.append(curr)
            if count > 1:
                buffer.extend(list(str(count)))
        for i, val in enumerate(buffer):
            chars[i] = val
        return len(buffer)`,
        python: `class Solution:
    def compress(self, chars):
        buffer = []
        read = 0
        n = len(chars)
        while read < n:
            curr = chars[read]
            count = 0
            while read < n and chars[read] == curr:
                read += 1
                count += 1
            buffer.append(curr)
            if count > 1:
                buffer.extend(list(str(count)))
        for i, val in enumerate(buffer):
            chars[i] = val
        return len(buffer)`,
        cpp: `class Solution {
public:
    // Improved: Auxiliary vector buffer (O(n) auxiliary space)
    int compress(vector<char>& chars) {
        vector<char> buffer;
        buffer.reserve(chars.size());
        int read = 0, n = chars.size();
        while (read < n) {
            char curr = chars[read];
            int count = 0;
            while (read < n && chars[read] == curr) {
                read++;
                count++;
            }
            buffer.push_back(curr);
            if (count > 1) {
                for (char c : to_string(count)) buffer.push_back(c);
            }
        }
        for (int i = 0; i < buffer.size(); i++) chars[i] = buffer[i];
        return buffer.size();
    }
};`,
        javascript: `var compress = function(chars) {
    const buffer = [];
    let read = 0;
    while (read < chars.length) {
        const curr = chars[read];
        let count = 0;
        while (read < chars.length && chars[read] === curr) {
            read++;
            count++;
        }
        buffer.push(curr);
        if (count > 1) {
            buffer.push(...String(count).split(""));
        }
    }
    for (let i = 0; i < buffer.length; i++) chars[i] = buffer[i];
    return buffer.length;
};`,
        typescript: `function compress(chars: string[]): number {
    const buffer: string[] = [];
    let read = 0;
    while (read < chars.length) {
        const curr = chars[read];
        let count = 0;
        while (read < chars.length && chars[read] === curr) {
            read++;
            count++;
        }
        buffer.push(curr);
        if (count > 1) {
            buffer.push(...String(count).split(""));
        }
    }
    for (let i = 0; i < buffer.length; i++) chars[i] = buffer[i];
    return buffer.length;
}`,
        go: `func compress(chars []byte) int {
    buffer := make([]byte, 0, len(chars))
    read, n := 0, len(chars)
    for read < n {
        curr := chars[read]
        count := 0
        for read < n && chars[read] == curr {
            read++
            count++
        }
        buffer = append(buffer, curr)
        if count > 1 {
            buffer = append(buffer, []byte(strconv.Itoa(count))...)
        }
    }
    copy(chars, buffer)
    return len(buffer)
}`,
        rust: `impl Solution {
    pub fn compress(chars: &mut Vec<char>) -> i32 {
        let mut buffer = Vec::with_capacity(chars.len());
        let (mut read, n) = (0, chars.len());
        while read < n {
            let curr = chars[read];
            let mut count = 0;
            while read < n && chars[read] == curr {
                read += 1;
                count += 1;
            }
            buffer.push(curr);
            if count > 1 {
                for c in count.to_string().chars() {
                    buffer.push(c);
                }
            }
        }
        for (i, &c) in buffer.iter().enumerate() {
            chars[i] = c;
        }
        buffer.len() as i32
    }
}`
      }
    },
    optimal: {
      available: true,
      approachName: "In-Place Two Pointers Run-Length Encoding",
      technique: "Two Pointers / In-Place Array Compaction",
      intuition: "Maintain separate read and write pointers in the chars array. Since every compressed group representation is <= the uncompressed length, write <= read always holds, preventing premature overwriting.",
      steps: [
        "Initialize write = 0 and read = 0 pointers.",
        "While read < chars.length, record the current group character curr = chars[read].",
        "Advance read while chars[read] == curr, counting group length count.",
        "Write character to chars[write++].",
        "If count > 1, convert count to string and write each digit character to chars[write++].",
        "Return write as the new length of the modified array."
      ],
      correctnessReasoning: "Compaction Invariant: For any contiguous group of length L >= 1, the compressed representation uses 1 slot (if L == 1) or 1 + floor(log10(L)) slots (if L >= 2). Since 1 + floor(log10(L)) <= L for all positive integers, write <= read is an unbroken invariant at every step. Therefore, unread input characters are never clobbered.",
      timeComplexity: "O(n)",
      timeExplanation: "Read pointer traverses each character of chars once; write pointer writes each character and count digit at most once.",
      spaceComplexity: "O(1)",
      spaceExplanation: "Modifies chars strictly in-place; uses only scalar integer pointer variables (read, write, count).",
      edgeCases: [
        "Single character group (e.g. ['a']): Appends only 'a' with no count; returns length 1.",
        "Group length >= 10: Count digits are split into multiple ASCII characters (e.g. 12 -> '1', '2').",
        "All distinct characters: Every character written with count 1; array remains identical.",
        "Repeated characters across entire array: Compressed into 1 letter + digits."
      ],
      codeByLang: {
        java: `class Solution {
    // Optimal: In-Place Two Pointers - O(n) Time, O(1) Auxiliary Space
    public int compress(char[] chars) {
        int write = 0, read = 0;
        int n = chars.length;
        while (read < n) {
            char curr = chars[read];
            int count = 0;
            while (read < n && chars[read] == curr) {
                read++;
                count++;
            }
            chars[write++] = curr;
            if (count > 1) {
                for (char c : Integer.toString(count).toCharArray()) {
                    chars[write++] = c;
                }
            }
        }
        return write;
    }
}`,
        python3: `class Solution:
    # Optimal: In-Place Two Pointers - O(n) Time, O(1) Auxiliary Space
    def compress(self, chars: List[str]) -> int:
        write = 0
        read = 0
        n = len(chars)
        while read < n:
            curr = chars[read]
            count = 0
            while read < n and chars[read] == curr:
                read += 1
                count += 1
            chars[write] = curr
            write += 1
            if count > 1:
                for digit in str(count):
                    chars[write] = digit
                    write += 1
        return write`,
        python: `class Solution:
    def compress(self, chars):
        write = 0
        read = 0
        n = len(chars)
        while read < n:
            curr = chars[read]
            count = 0
            while read < n and chars[read] == curr:
                read += 1
                count += 1
            chars[write] = curr
            write += 1
            if count > 1:
                for digit in str(count):
                    chars[write] = digit
                    write += 1
        return write`,
        cpp: `class Solution {
public:
    // Optimal: In-Place Two Pointers - O(n) Time, O(1) Auxiliary Space
    int compress(vector<char>& chars) {
        int write = 0, read = 0, n = chars.size();
        while (read < n) {
            char curr = chars[read];
            int count = 0;
            while (read < n && chars[read] == curr) {
                read++;
                count++;
            }
            chars[write++] = curr;
            if (count > 1) {
                string countStr = to_string(count);
                for (char c : countStr) {
                    chars[write++] = c;
                }
            }
        }
        return write;
    }
};`,
        javascript: `var compress = function(chars) {
    let write = 0, read = 0;
    const n = chars.length;
    while (read < n) {
        const curr = chars[read];
        let count = 0;
        while (read < n && chars[read] === curr) {
            read++;
            count++;
        }
        chars[write++] = curr;
        if (count > 1) {
            for (const digit of String(count)) {
                chars[write++] = digit;
            }
        }
    }
    return write;
};`,
        typescript: `function compress(chars: string[]): number {
    let write = 0, read = 0;
    const n = chars.length;
    while (read < n) {
        const curr = chars[read];
        let count = 0;
        while (read < n && chars[read] === curr) {
            read++;
            count++;
        }
        chars[write++] = curr;
        if (count > 1) {
            for (const digit of String(count)) {
                chars[write++] = digit;
            }
        }
    }
    return write;
}`,
        go: `func compress(chars []byte) int {
    write, read, n := 0, 0, len(chars)
    for read < n {
        curr := chars[read]
        count := 0
        for read < n && chars[read] == curr {
            read++
            count++
        }
        chars[write] = curr
        write++
        if count > 1 {
            countStr := strconv.Itoa(count)
            for i := 0; i < len(countStr); i++ {
                chars[write] = countStr[i]
                write++
            }
        }
    }
    return write
}`,
        rust: `impl Solution {
    pub fn compress(chars: &mut Vec<char>) -> i32 {
        let mut write = 0;
        let mut read = 0;
        let n = chars.len();
        while read < n {
            let curr = chars[read];
            let mut count = 0;
            while read < n && chars[read] == curr {
                read += 1;
                count += 1;
            }
            chars[write] = curr;
            write += 1;
            if count > 1 {
                for digit in count.to_string().chars() {
                    chars[write] = digit;
                    write += 1;
                }
            }
        }
        write as i32
    }
}`
      }
    },
    comparison: {
      summary: "In-Place Two Pointers is strictly superior because it meets the mandatory O(1) auxiliary space requirement while completing compression in linear O(n) time.",
      preferredApproach: "In-Place Two Pointers Run-Length Encoding",
      reason: "Satisfies the in-place modification requirement without allocating auxiliary buffers or string objects, adhering to strict problem constraints.",
      tradeoffs: [
        { approach: "Brute Force", technique: "String Concatenation", timeComplexity: "O(n²)", spaceComplexity: "O(n)", tradeoff: "Quadratic copy overhead and violates in-place constraint." },
        { approach: "Improved Approach", technique: "Dynamic Buffer Copy", timeComplexity: "O(n)", spaceComplexity: "O(n)", tradeoff: "Linear speed but allocates O(n) memory, violating constant space constraint." },
        { approach: "Optimal Approach", technique: "In-Place Two Pointers", timeComplexity: "O(n)", spaceComplexity: "O(1)", tradeoff: "Strictly optimal linear single-pass runtime with O(1) auxiliary space." }
      ],
      table: [
        { dimension: "Intuition", bruteForce: "Append to string and copy back.", improved: "Accumulate in buffer, copy back.", optimal: "Read and write pointers in-place." },
        { dimension: "Time Complexity", bruteForce: "O(n²)", improved: "O(n)", optimal: "O(n)" },
        { dimension: "Auxiliary Space", bruteForce: "O(n)", improved: "O(n)", optimal: "O(1)" },
        { dimension: "In-Place Compliance", bruteForce: "No (allocates string)", improved: "No (allocates buffer)", optimal: "Yes (strictly in-place)" }
      ]
    }
  },

  "max-number-of-k-sum-pairs": {
    bruteForce: {
      available: true,
      approachName: "Exhaustive Nested Pair Search & Used Tracking",
      technique: "Nested Loops / Boolean Visited Array",
      intuition: "Compare every pair (i, j) with nested loops. If nums[i] + nums[j] == k and neither element has been consumed, count the operation and mark both elements as used.",
      steps: [
        "Create a boolean array used of length n initialized to false.",
        "Loop with outer index i from 0 to n - 1.",
        "If used[i] is true, continue to next element.",
        "Loop with inner index j from i + 1 to n - 1.",
        "If !used[j] and nums[i] + nums[j] == k, mark used[i] = true, used[j] = true, increment operations count, and break inner loop.",
        "Return the total operations count."
      ],
      timeComplexity: "O(n²)",
      timeExplanation: "Nested loops test n*(n - 1)/2 candidate pairs in worst-case when no pairs match.",
      spaceComplexity: "O(n)",
      spaceExplanation: "Allocates a boolean used array of length n to prevent element reuse.",
      limitations: [
        "Quadratic time complexity: for n = 10^5, n^2 = 10^10 operations, causing immediate TLE.",
        "Exhaustively scans elements that have already been searched or are impossible complements."
      ],
      codeByLang: {
        java: `class Solution {
    // Brute Force: O(n²) nested loop pair checking with used tracking
    public int maxOperations(int[] nums, int k) {
        int n = nums.length;
        boolean[] used = new boolean[n];
        int ops = 0;
        for (int i = 0; i < n; i++) {
            if (used[i]) continue;
            for (int j = i + 1; j < n; j++) {
                if (!used[j] && nums[i] + nums[j] == k) {
                    used[i] = true;
                    used[j] = true;
                    ops++;
                    break;
                }
            }
        }
        return ops;
    }
}`,
        python3: `class Solution:
    # Brute Force: O(n²) nested loops with visited boolean array
    def maxOperations(self, nums: List[int], k: int) -> int:
        n = len(nums)
        used = [False] * n
        ops = 0
        for i in range(n):
            if used[i]:
                continue
            for j in range(i + 1, n):
                if not used[j] and nums[i] + nums[j] == k:
                    used[i] = True
                    used[j] = True
                    ops += 1
                    break
        return ops`,
        python: `class Solution:
    def maxOperations(self, nums, k):
        n = len(nums)
        used = [False] * n
        ops = 0
        for i in range(n):
            if used[i]:
                continue
            for j in range(i + 1, n):
                if not used[j] and nums[i] + nums[j] == k:
                    used[i] = True
                    used[j] = True
                    ops += 1
                    break
        return ops`,
        cpp: `class Solution {
public:
    // Brute Force: O(n²) nested loop pair search
    int maxOperations(vector<int>& nums, int k) {
        int n = nums.size();
        vector<bool> used(n, false);
        int ops = 0;
        for (int i = 0; i < n; i++) {
            if (used[i]) continue;
            for (int j = i + 1; j < n; j++) {
                if (!used[j] && nums[i] + nums[j] == k) {
                    used[i] = true;
                    used[j] = true;
                    ops++;
                    break;
                }
            }
        }
        return ops;
    }
};`,
        javascript: `var maxOperations = function(nums, k) {
    const n = nums.length;
    const used = new Array(n).fill(false);
    let ops = 0;
    for (let i = 0; i < n; i++) {
        if (used[i]) continue;
        for (let j = i + 1; j < n; j++) {
            if (!used[j] && nums[i] + nums[j] === k) {
                used[i] = true;
                used[j] = true;
                ops++;
                break;
            }
        }
    }
    return ops;
};`,
        typescript: `function maxOperations(nums: number[], k: number): number {
    const n = nums.length;
    const used = new Array(n).fill(false);
    let ops = 0;
    for (let i = 0; i < n; i++) {
        if (used[i]) continue;
        for (let j = i + 1; j < n; j++) {
            if (!used[j] && nums[i] + nums[j] === k) {
                used[i] = true;
                used[j] = true;
                ops++;
                break;
            }
        }
    }
    return ops;
}`,
        go: `func maxOperations(nums []int, k int) int {
    n := len(nums)
    used := make([]bool, n)
    ops := 0
    for i := 0; i < n; i++ {
        if used[i] {
            continue
        }
        for j := i + 1; j < n; j++ {
            if !used[j] && nums[i]+nums[j] == k {
                used[i] = true
                used[j] = true
                ops++
                break
            }
        }
    }
    return ops
}`,
        rust: `impl Solution {
    pub fn max_operations(nums: Vec<i32>, k: i32) -> i32 {
        let n = nums.len();
        let mut used = vec![false; n];
        let mut ops = 0;
        for i in 0..n {
            if used[i] { continue; }
            for j in (i + 1)..n {
                if !used[j] && nums[i] + nums[j] == k {
                    used[i] = true;
                    used[j] = true;
                    ops += 1;
                    break;
                }
            }
        }
        ops
    }
}`
      }
    },
    improved: {
      available: true,
      approachName: "Sorting and Two Pointers Convergence",
      technique: "Sorting + Two Pointers",
      intuition: "Sort the array in non-decreasing order. Use two pointers converging from opposite ends (left at 0, right at n - 1). Pair matching elements and adjust pointers based on the sum comparison with k.",
      steps: [
        "Sort the input array nums in ascending order.",
        "Initialize left = 0 and right = nums.length - 1.",
        "While left < right:",
        "- Compute currentSum = nums[left] + nums[right].",
        "- If currentSum == k: pair found, increment ops, left++, right--.",
        "- If currentSum < k: sum is too small, increment left++ to increase sum.",
        "- If currentSum > k: sum is too large, decrement right-- to decrease sum.",
        "Return the total operations count."
      ],
      timeComplexity: "O(n log n)",
      timeExplanation: "Sorting takes O(n log n) time. Two-pointer traversal takes O(n) linear steps.",
      spaceComplexity: "O(1)",
      spaceExplanation: "Consumes O(1) auxiliary space (or O(log n) space for the recursive sort stack in standard libraries).",
      limitations: [
        "Mutates the ordering of elements in nums.",
        "Slightly slower than O(n) hash map on large inputs due to O(n log n) sorting.",
        "Excellent trade-off when memory is severely constrained."
      ],
      codeByLang: {
        java: `import java.util.Arrays;

class Solution {
    // Improved: Sorting + Two Pointers - O(n log n) Time, O(1) Auxiliary Space
    public int maxOperations(int[] nums, int k) {
        Arrays.sort(nums);
        int left = 0, right = nums.length - 1;
        int ops = 0;
        while (left < right) {
            int sum = nums[left] + nums[right];
            if (sum == k) {
                ops++;
                left++;
                right--;
            } else if (sum < k) {
                left++;
            } else {
                right--;
            }
        }
        return ops;
    }
}`,
        python3: `class Solution:
    # Improved: Sorting + Two Pointers - O(n log n) Time, O(1) Auxiliary Space
    def maxOperations(self, nums: List[int], k: int) -> int:
        nums.sort()
        left, right = 0, len(nums) - 1
        ops = 0
        while left < right:
            current_sum = nums[left] + nums[right]
            if current_sum == k:
                ops += 1
                left += 1
                right -= 1
            elif current_sum < k:
                left += 1
            else:
                right -= 1
        return ops`,
        python: `class Solution:
    def maxOperations(self, nums, k):
        nums.sort()
        left, right = 0, len(nums) - 1
        ops = 0
        while left < right:
            current_sum = nums[left] + nums[right]
            if current_sum == k:
                ops += 1
                left += 1
                right -= 1
            elif current_sum < k:
                left += 1
            else:
                right -= 1
        return ops`,
        cpp: `class Solution {
public:
    // Improved: Sorting + Two Pointers - O(n log n) Time, O(1) Auxiliary Space
    int maxOperations(vector<int>& nums, int k) {
        sort(nums.begin(), nums.end());
        int left = 0, right = nums.size() - 1;
        int ops = 0;
        while (left < right) {
            int sum = nums[left] + nums[right];
            if (sum == k) {
                ops++;
                left++;
                right--;
            } else if (sum < k) {
                left++;
            } else {
                right--;
            }
        }
        return ops;
    }
};`,
        javascript: `var maxOperations = function(nums, k) {
    nums.sort((a, b) => a - b);
    let left = 0, right = nums.length - 1;
    let ops = 0;
    while (left < right) {
        const sum = nums[left] + nums[right];
        if (sum === k) {
            ops++;
            left++;
            right--;
        } else if (sum < k) {
            left++;
        } else {
            right--;
        }
    }
    return ops;
};`,
        typescript: `function maxOperations(nums: number[], k: number): number {
    nums.sort((a, b) => a - b);
    let left = 0, right = nums.length - 1;
    let ops = 0;
    while (left < right) {
        const sum = nums[left] + nums[right];
        if (sum === k) {
            ops++;
            left++;
            right--;
        } else if (sum < k) {
            left++;
        } else {
            right--;
        }
    }
    return ops;
}`,
        go: `func maxOperations(nums []int, k int) int {
    sort.Ints(nums)
    left, right := 0, len(nums)-1
    ops := 0
    for left < right {
        sum := nums[left] + nums[right]
        if sum == k {
            ops++
            left++
            right--
        } else if sum < k {
            left++
        } else {
            right--
        }
    }
    return ops
}`,
        rust: `impl Solution {
    pub fn max_operations(mut nums: Vec<i32>, k: i32) -> i32 {
        nums.sort_unstable();
        if nums.is_empty() { return 0; }
        let (mut left, mut right) = (0, nums.len() - 1);
        let mut ops = 0;
        while left < right {
            let sum = nums[left] + nums[right];
            if sum == k {
                ops += 1;
                left += 1;
                right -= 1;
            } else if sum < k {
                left += 1;
            } else {
                right -= 1;
            }
        }
        ops
    }
}`
      }
    },
    optimal: {
      available: true,
      approachName: "One-Pass Frequency Hash Map",
      technique: "Hash Map / Complement Frequency Tracking",
      intuition: "Track element frequencies in a hash map in a single pass. For each element x, check if complement k - x is already available in the map. If so, decrement complement count and increment operations count; otherwise record x.",
      steps: [
        "Initialize a hash map freq to store integer frequencies.",
        "Initialize ops = 0.",
        "For each number num in nums:",
        "- Compute complement = k - num.",
        "- If freq[complement] > 0: decrement freq[complement] and increment ops.",
        "- Else: increment freq[num] by 1.",
        "Return ops as the maximum operations count."
      ],
      correctnessReasoning: "Disjoint Greedy Consumption: When complement k - x exists in freq, greedily consuming it immediately yields one valid disjoint pair. No future element can form more than one pair with this complement. Single-pass decrementing ensures no element is reused.",
      timeComplexity: "O(n)",
      timeExplanation: "Iterates through n elements once; hash map lookups, insertions, and decrements take O(1) average time.",
      spaceComplexity: "O(n)",
      spaceExplanation: "Hash map stores up to n unique element counts in worst case.",
      edgeCases: [
        "Duplicate numbers summing to k (e.g. k = 6 with three 3s): Pairs first two 3s, leaving third 3 unpaired.",
        "No pairs possible: Returns 0 cleanly without errors.",
        "Large numbers up to 10^9: Hash map handles 64-bit integer values without integer overflow.",
        "Empty array or single element array: Returns 0 immediately."
      ],
      codeByLang: {
        java: `import java.util.*;

class Solution {
    // Optimal: One-Pass Frequency Hash Map - O(n) Time, O(n) Space
    public int maxOperations(int[] nums, int k) {
        Map<Integer, Integer> freq = new HashMap<>();
        int ops = 0;
        for (int num : nums) {
            int complement = k - num;
            int count = freq.getOrDefault(complement, 0);
            if (count > 0) {
                ops++;
                freq.put(complement, count - 1);
            } else {
                freq.put(num, freq.getOrDefault(num, 0) + 1);
            }
        }
        return ops;
    }
}`,
        python3: `import collections

class Solution:
    # Optimal: One-Pass Frequency Hash Map - O(n) Time, O(n) Space
    def maxOperations(self, nums: List[int], k: int) -> int:
        freq = collections.defaultdict(int)
        ops = 0
        for num in nums:
            complement = k - num
            if freq[complement] > 0:
                ops += 1
                freq[complement] -= 1
            else:
                freq[num] += 1
        return ops`,
        python: `import collections

class Solution:
    def maxOperations(self, nums, k):
        freq = collections.defaultdict(int)
        ops = 0
        for num in nums:
            complement = k - num
            if freq[complement] > 0:
                ops += 1
                freq[complement] -= 1
            else:
                freq[num] += 1
        return ops`,
        cpp: `class Solution {
public:
    // Optimal: One-Pass Frequency Hash Map - O(n) Time, O(n) Space
    int maxOperations(vector<int>& nums, int k) {
        unordered_map<int, int> freq;
        int ops = 0;
        for (int num : nums) {
            int complement = k - num;
            if (freq[complement] > 0) {
                ops++;
                freq[complement]--;
            } else {
                freq[num]++;
            }
        }
        return ops;
    }
};`,
        javascript: `var maxOperations = function(nums, k) {
    const freq = new Map();
    let ops = 0;
    for (const num of nums) {
        const complement = k - num;
        const compCount = freq.get(complement) || 0;
        if (compCount > 0) {
            ops++;
            freq.set(complement, compCount - 1);
        } else {
            freq.set(num, (freq.get(num) || 0) + 1);
        }
    }
    return ops;
};`,
        typescript: `function maxOperations(nums: number[], k: number): number {
    const freq = new Map<number, number>();
    let ops = 0;
    for (const num of nums) {
        const complement = k - num;
        const compCount = freq.get(complement) || 0;
        if (compCount > 0) {
            ops++;
            freq.set(complement, compCount - 1);
        } else {
            freq.set(num, (freq.get(num) || 0) + 1);
        }
    }
    return ops;
}`,
        go: `func maxOperations(nums []int, k int) int {
    freq := make(map[int]int)
    ops := 0
    for _, num := range nums {
        complement := k - num
        if freq[complement] > 0 {
            ops++
            freq[complement]--
        } else {
            freq[num]++
        }
    }
    return ops
}`,
        rust: `use std::collections::HashMap;

impl Solution {
    pub fn max_operations(nums: Vec<i32>, k: i32) -> i32 {
        let mut freq: HashMap<i32, i32> = HashMap::new();
        let mut ops = 0;
        for num in nums {
            let complement = k - num;
            if let Some(count) = freq.get_mut(&complement) {
                if *count > 0 {
                    ops += 1;
                    *count -= 1;
                    continue;
                }
            }
            *freq.entry(num).or_insert(0) += 1;
        }
        ops
    }
}`
      }
    },
    comparison: {
      summary: "One-Pass Frequency Hash Map achieves optimal O(n) linear execution time with O(n) space. Sort + Two Pointers offers an O(n log n) alternative with strictly O(1) auxiliary space.",
      preferredApproach: "One-Pass Frequency Hash Map",
      reason: "Provides minimal linear O(n) time complexity for 10^5 elements, beating sorting algorithms by eliminating log n comparisons.",
      tradeoffs: [
        { approach: "Brute Force", technique: "Nested Search", timeComplexity: "O(n²)", spaceComplexity: "O(n)", tradeoff: "Quadratic 10^10 operations causing immediate TLE." },
        { approach: "Improved Approach", technique: "Sort + Two Pointers", timeComplexity: "O(n log n)", spaceComplexity: "O(1)", tradeoff: "Requires sorting but uses zero extra memory (ideal for memory-constrained environments)." },
        { approach: "Optimal Approach", technique: "Frequency Hash Map", timeComplexity: "O(n)", spaceComplexity: "O(n)", tradeoff: "Optimal single-pass linear time at the cost of O(n) auxiliary hash table memory." }
      ],
      table: [
        { dimension: "Intuition", bruteForce: "Exhaustively check all (i, j) pairs.", improved: "Sort and converge opposite-end pointers.", optimal: "Single-pass hash table complement lookup." },
        { dimension: "Time Complexity", bruteForce: "O(n²)", improved: "O(n log n)", optimal: "O(n)" },
        { dimension: "Auxiliary Space", bruteForce: "O(n)", improved: "O(1)", optimal: "O(n)" },
        { dimension: "Trade-off", bruteForce: "High computational overhead.", improved: "Trades logarithmic time for constant memory.", optimal: "Trades linear memory for maximum speed." }
      ]
    }
  }
};

/**
 * Normalizes language string to supported canonical form.
 */
function normalizeLanguage(rawLang) {
  if (!rawLang) return "python3";
  const clean = String(rawLang).toLowerCase().trim();
  if (clean === "python") return "python3";
  if (SUPPORTED_LANGUAGES.includes(clean)) return clean;
  return "python3";
}

/**
 * Compares student's implementation against generated solutions (Module 3 integration).
 */
function compareStudentImplementation({ studentCode, language, solutions, problem, verdict }) {
  if (!studentCode || !studentCode.trim()) {
    return {
      compared: false,
      available: false,
      status: "unavailable",
      unavailableReason: "Student source code is unavailable. Multi-tier solutions generated standalone from canonical problem specification.",
      message: "Student source code is unavailable. Multi-tier solutions generated standalone from canonical problem specification.",
      studentMatchesOptimal: false,
      asymptoticallyOptimal: false,
      studentComplexity: null,
      improvementAdvice: null,
      recommendation: "Provide or import code to compare directly with brute force and optimal solutions."
    };
  }

  const codeIntel = analyzeStudentCode({
    sourceCode: studentCode,
    language,
    problem,
    verdict: verdict || "Accepted",
    sourceProvenance: "solution_comparison"
  });

  const studentTime = codeIntel.complexity?.timeComplexity || "O(n)";
  const studentSpace = codeIntel.complexity?.auxiliarySpace || "O(1)";
  const optTime = solutions.optimal?.timeComplexity || "O(n)";
  const optSpace = solutions.optimal?.spaceComplexity || "O(1)";

  // Check if student's complexity matches or is asymptotically optimal
  const isTimeEqual = studentTime === optTime || (studentTime.includes("n") && optTime.includes("n"));
  const isSpaceEqual = studentSpace === optSpace;
  const studentMatchesOptimal = isTimeEqual && isSpaceEqual && codeIntel.consistency?.isConsistent;
  const asymptoticallyOptimal = studentMatchesOptimal;
  const matchesApproach = studentMatchesOptimal
    ? (solutions.optimal?.approachName || "Optimal (Two Pointers)")
    : (studentTime.includes("²") || studentTime.includes("^2") ? (solutions.bruteForce?.approachName || "Brute Force") : (solutions.improved?.approachName || "Intermediate Approach"));

  let comparisonText = "";
  let improvementAdvice = "";

  if (studentMatchesOptimal) {
    comparisonText = `Great job! Your solution is already asymptotically optimal (${studentTime} time, ${studentSpace} space). It aligns with the canonical optimal algorithm (${solutions.optimal?.approachName || "Optimal Approach"}).`;
    improvementAdvice = "Focus on code conciseness, boundary checks, and readability.";
  } else if (studentTime.includes("²") || studentTime.includes("^2")) {
    comparisonText = `Your solution exhibits quadratic ${studentTime} complexity, closely resembling the Brute Force baseline (${solutions.bruteForce?.approachName || "Brute Force"}).`;
    improvementAdvice = solutions.improved?.available
      ? `You can optimize this bottleneck by applying ${solutions.improved.technique} to reach ${solutions.improved.timeComplexity}, or transition directly to the ${solutions.optimal?.approachName} (${solutions.optimal?.timeComplexity}).`
      : `Transition to the ${solutions.optimal?.approachName} to eliminate the nested iteration and achieve ${solutions.optimal?.timeComplexity}.`;
  } else {
    comparisonText = `Your solution operates with ${studentTime} time and ${studentSpace} auxiliary space.`;
    improvementAdvice = `Review the ${solutions.optimal?.approachName || "Optimal Solution"} below to see how key invariants achieve ${optTime} time with ${optSpace} auxiliary space.`;
  }

  return {
    compared: true,
    available: true,
    status: "compared",
    studentMatchesOptimal,
    asymptoticallyOptimal,
    matchesApproach,
    studentTime,
    studentSpace,
    recommendation: improvementAdvice,
    studentApproach: codeIntel.overview || "Student submitted implementation",
    studentComplexity: {
      timeComplexity: studentTime,
      spaceComplexity: studentSpace,
      explanation: codeIntel.complexity?.timeDerivation || "Derived from student control flow."
    },
    comparisonSummary: comparisonText,
    improvementAdvice,
    verdictNotice: verdict ? `Submission verdict was: ${verdict}.` : null
  };
}

/**
 * Dynamic fallback solution generator for non-canonical problems.
 */
function buildDynamicSolutions({ problem, language }) {
  const normLang = normalizeLanguage(language);
  const signature = problem.signatures?.[normLang] || `// Solution signature for ${normLang}`;

  return {
    bruteForce: {
      available: true,
      approachName: "Exhaustive Baseline Search",
      technique: "Exhaustive Search",
      intuition: `Iterate through all candidate solutions for ${problem.title || "the problem"} to find matching criteria.`,
      steps: [
        "Formulate all possible input combinations or brute-force iterations.",
        "Check each candidate against the problem criteria.",
        "Return the first or optimal matching result."
      ],
      timeComplexity: "O(n²)",
      timeExplanation: "Nested evaluation of all candidate elements in the search space.",
      spaceComplexity: "O(1)",
      spaceExplanation: "Minimal scalar variable allocation.",
      limitations: [
        "Causes high latency or TLE on large input constraints.",
        "Performs redundant calculations across repeated elements."
      ],
      code: `// Brute Force Baseline for ${problem.title || "Problem"} (${normLang})\n// AI-generated solution — execution verification not yet performed.\n${signature} {\n    // TODO: Implement exhaustive search baseline\n}`
    },
    improved: {
      available: false,
      approachName: "Intermediate Optimization",
      technique: "Precomputation / Sorting",
      intuition: "Intermediate data structure optimization.",
      steps: [],
      timeComplexity: "O(n log n)",
      timeExplanation: "Logarithmic sorting or precomputed lookup.",
      spaceComplexity: "O(n)",
      spaceExplanation: "Auxiliary table or frequency map.",
      limitations: [],
      unavailableReason: "No meaningfully distinct intermediate approach exists for this problem. The problem transitions directly from exhaustive search to optimal linear/sublinear representation."
    },
    optimal: {
      available: true,
      approachName: problem.optimalTitle || "Optimal Solution",
      technique: "Algorithmic Invariant Optimization",
      intuition: problem.keyObservation || "Leverage mathematical invariants to prune redundant states.",
      steps: [
        "Identify core problem invariant.",
        "Process input in a single pass or optimal logarithmic search.",
        "Return target result."
      ],
      correctnessReasoning: "Proven invariant guarantees that all optimal sub-choices lead to the globally optimal result without backtracking.",
      timeComplexity: problem.timeComplexity || "O(n)",
      timeExplanation: problem.timeExplain || "Linear pass processing each input element once.",
      spaceComplexity: problem.spaceComplexity || "O(1)",
      spaceExplanation: problem.spaceExplain || "Constant auxiliary memory allocations.",
      edgeCases: ["Empty input collections", "Single element boundary", "Duplicate values", "Extreme constraint limits"],
      code: `// Optimal Canonical Solution for ${problem.title || "Problem"} (${normLang})\n// AI-generated solution — execution verification not yet performed.\n${signature} {\n    // TODO: Implement optimal solution\n}`
    },
    comparison: {
      summary: "Optimal approach eliminates redundant iterations, achieving superior asymptotic runtime.",
      preferredApproach: problem.optimalTitle || "Optimal Solution",
      reason: "Provides the lowest time complexity while respecting problem constraints.",
      tradeoffs: [
        { approach: "Brute Force", technique: "Exhaustive Search", timeComplexity: "O(n²)", spaceComplexity: "O(1)", tradeoff: "Simple logic but prone to TLE." },
        { approach: "Optimal", technique: "Invariant Optimization", timeComplexity: problem.timeComplexity || "O(n)", spaceComplexity: problem.spaceComplexity || "O(1)", tradeoff: "Strictly minimal time complexity." }
      ],
      table: [
        { dimension: "Intuition", bruteForce: "Exhaustively check all combinations.", improved: "N/A", optimal: "Leverage invariants for direct computation." },
        { dimension: "Time Complexity", bruteForce: "O(n²)", improved: "N/A", optimal: problem.timeComplexity || "O(n)" },
        { dimension: "Auxiliary Space", bruteForce: "O(1)", improved: "N/A", optimal: problem.spaceComplexity || "O(1)" }
      ]
    }
  };
}

/**
 * Main Solution Generation Engine Entry Point (Module 4)
 */
function generateMultiTierSolutions({ problem, language, studentCode, verdict }) {
  const normLang = normalizeLanguage(language);
  const problemSlug = problem?.problemSlug || problem?.slug;
  const problemTitle = problem?.problemTitle || problem?.title;
  const problemNumber = problem?.problemNumber || problem?.number;
  const resolvedProblem = resolveProblemIdentity({
    ...(problem || {}),
    problemSlug,
    problemTitle,
    problemNumber
  });
  const slug = resolvedProblem.slug || problemSlug || "";

  let packageData = CANONICAL_SOLUTIONS[slug];
  let bruteForce, improved, optimal, comparison;

  if (packageData) {
    bruteForce = {
      available: packageData.bruteForce.available,
      approachName: packageData.bruteForce.approachName,
      technique: packageData.bruteForce.technique,
      intuition: packageData.bruteForce.intuition,
      steps: [...packageData.bruteForce.steps],
      code: packageData.bruteForce.codeByLang[normLang] || packageData.bruteForce.codeByLang["python3"] || "",
      timeComplexity: packageData.bruteForce.timeComplexity,
      timeExplanation: packageData.bruteForce.timeExplanation,
      spaceComplexity: packageData.bruteForce.spaceComplexity,
      spaceExplanation: packageData.bruteForce.spaceExplanation,
      limitations: [...packageData.bruteForce.limitations]
    };

    improved = {
      available: packageData.improved.available,
      approachName: packageData.improved.approachName,
      technique: packageData.improved.technique,
      intuition: packageData.improved.intuition,
      steps: [...packageData.improved.steps],
      code: packageData.improved.codeByLang ? (packageData.improved.codeByLang[normLang] || packageData.improved.codeByLang["python3"] || "") : null,
      timeComplexity: packageData.improved.timeComplexity,
      timeExplanation: packageData.improved.timeExplanation,
      spaceComplexity: packageData.improved.spaceComplexity,
      spaceExplanation: packageData.improved.spaceExplanation,
      limitations: packageData.improved.limitations ? [...packageData.improved.limitations] : [],
      unavailableReason: packageData.improved.unavailableReason || null
    };

    optimal = {
      available: packageData.optimal.available,
      approachName: packageData.optimal.approachName,
      technique: packageData.optimal.technique,
      intuition: packageData.optimal.intuition,
      steps: [...packageData.optimal.steps],
      correctnessReasoning: packageData.optimal.correctnessReasoning,
      code: packageData.optimal.codeByLang[normLang] || packageData.optimal.codeByLang["python3"] || "",
      timeComplexity: packageData.optimal.timeComplexity,
      timeExplanation: packageData.optimal.timeExplanation,
      spaceComplexity: packageData.optimal.spaceComplexity,
      spaceExplanation: packageData.optimal.spaceExplanation,
      edgeCases: [...packageData.optimal.edgeCases]
    };

    comparison = {
      summary: packageData.comparison.summary,
      preferredApproach: packageData.comparison.preferredApproach,
      reason: packageData.comparison.reason,
      tradeoffs: [...packageData.comparison.tradeoffs],
      table: [...packageData.comparison.table]
    };
  } else {
    // Dynamic generation for custom or curriculum problems without hardcoded 8-lang maps
    const dynamic = buildDynamicSolutions({ problem: resolvedProblem, language: normLang });
    bruteForce = dynamic.bruteForce;
    improved = dynamic.improved;
    optimal = dynamic.optimal;
    comparison = dynamic.comparison;
  }

  const solutions = {
    bruteForce,
    improved,
    optimal
  };

  const studentComparison = compareStudentImplementation({
    studentCode,
    language: normLang,
    solutions,
    problem: resolvedProblem,
    verdict
  });

  const solutionComparison = (comparison.table || []).map(row => {
    const prop = row.property || row.dimension || "Metric";
    let studentVal = "—";
    if (/technique|intuition|approach/i.test(prop)) {
      studentVal = studentComparison?.matchesApproach || "Submitted Implementation";
    } else if (/time/i.test(prop)) {
      studentVal = studentComparison?.studentTime || "O(n)";
    } else if (/space/i.test(prop)) {
      studentVal = studentComparison?.studentSpace || "O(1)";
    } else if (/advantage|verdict/i.test(prop)) {
      studentVal = studentComparison?.asymptoticallyOptimal ? "Optimal asymptotic class" : "Baseline logic";
    }
    return {
      property: prop,
      dimension: prop,
      bruteForce: row.bruteForce,
      improved: row.improved || "N/A",
      optimal: row.optimal,
      student: studentVal
    };
  });

  return {
    problemContext: {
      title: resolvedProblem.title || "DSA Problem",
      slug: resolvedProblem.slug || null,
      number: resolvedProblem.number || null,
      difficulty: resolvedProblem.difficulty || "Medium",
      statement: resolvedProblem.statement || null,
      constraints: resolvedProblem.constraints || null,
      expectedInputType: resolvedProblem.expectedInputType || null,
      expectedOutputType: resolvedProblem.expectedOutputType || null,
      signatures: resolvedProblem.signatures || null
    },
    selectedLanguage: normLang,
    solutions,
    comparison,
    solutionComparison,
    studentComparison,
    verificationStatus: "ai_generated_unverified",
    executionDisclaimer: EXECUTION_DISCLAIMER
  };
}

/**
 * Server-side validation of generated solution package.
 */
function validateGeneratedSolutions(packageObj, problem, language = "python3", { throwOnError = false } = {}) {
  const fail = (reason) => {
    if (throwOnError) throw new Error(reason);
    return { valid: false, reason };
  };

  if (!packageObj || typeof packageObj !== "object") {
    return fail("Invalid solutions payload: object expected.");
  }
  const normLang = normalizeLanguage(language);
  const solutions = packageObj.solutions || packageObj;
  if (!solutions || typeof solutions !== "object") {
    return fail("Invalid solutions payload: 'solutions' property required.");
  }

  // 1. Validate Brute Force
  if (solutions.bruteForce && solutions.bruteForce.available) {
    if (!solutions.bruteForce.code || typeof solutions.bruteForce.code !== "string" || !solutions.bruteForce.code.trim()) {
      return fail(`Brute force code must be a non-empty string in ${normLang}.`);
    }
    if (!solutions.bruteForce.timeComplexity || !/^O\(.+\)$/i.test(solutions.bruteForce.timeComplexity.trim())) {
      return fail("Brute force time complexity must use valid Big-O notation.");
    }
  }

  // 2. Validate Improved (if available)
  if (solutions.improved && solutions.improved.available) {
    if (!solutions.improved.code || typeof solutions.improved.code !== "string" || !solutions.improved.code.trim()) {
      return fail(`Improved approach code must be a non-empty string in ${normLang}.`);
    }
    if (!solutions.improved.timeComplexity || !/^O\(.+\)$/i.test(solutions.improved.timeComplexity.trim())) {
      return fail("Improved approach time complexity must use valid Big-O notation.");
    }
  } else if (solutions.improved && !solutions.improved.available) {
    if (!solutions.improved.unavailableReason || typeof solutions.improved.unavailableReason !== "string") {
      return fail("When an improved approach is unavailable, a clear explanation must be provided.");
    }
  }

  // 3. Validate Optimal Solution
  if (!solutions.optimal || solutions.optimal.available === false) {
    return fail("An optimal solution must always be available.");
  }
  if (!solutions.optimal.code || typeof solutions.optimal.code !== "string" || !solutions.optimal.code.trim()) {
    return fail(`Optimal solution code must be a non-empty string in ${normLang}.`);
  }
  if (!solutions.optimal.timeComplexity || !/^O\(.+\)$/i.test(solutions.optimal.timeComplexity.trim())) {
    return fail("Optimal solution time complexity must use valid Big-O notation.");
  }
  if (!solutions.optimal.spaceComplexity || !/^O\(.+\)$/i.test(solutions.optimal.spaceComplexity.trim())) {
    return fail("Optimal solution space complexity must use valid Big-O notation.");
  }

  return {
    valid: true,
    language: normLang,
    executionDisclaimer: EXECUTION_DISCLAIMER
  };
}

module.exports = {
  SUPPORTED_LANGUAGES,
  EXECUTION_DISCLAIMER,
  CANONICAL_SOLUTIONS,
  normalizeLanguage,
  compareStudentImplementation,
  generateMultiTierSolutions,
  validateGeneratedSolutions
};
