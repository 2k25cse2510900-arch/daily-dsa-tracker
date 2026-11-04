"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const eduData = require("./tmp_edu_data.js");
const testDir = path.join(__dirname, "../tmp/curriculum_tests");
fs.mkdirSync(testDir, { recursive: true });

const env = {
  ...process.env,
  PATH: "C:\\msys64\\ucrt64\\bin;" + process.env.PATH,
  GOROOT: "C:\\msys64\\ucrt64\\lib\\go"
};

const fullMatrix = {};

// ============================================================================
// 1. LEETCODE #287: Find the Duplicate Number
// ============================================================================
console.log("\n=======================================================");
console.log("TESTING LEETCODE #287: Find the Duplicate Number");
console.log("=======================================================");
const prob287 = eduData["find-the-duplicate-number"];
fullMatrix["find-the-duplicate-number"] = {};

// Python 3
try {
  const pyCode = prob287.acceptedCodeByLang.python3;
  const script = `
${pyCode}
sol = Solution()
assert sol.findDuplicate([1, 3, 4, 2, 2]) == 2
assert sol.findDuplicate([3, 1, 3, 4, 2]) == 3
assert sol.findDuplicate([3, 3, 3, 3, 3]) == 3
print("PASSED")
`;
  const file = path.join(testDir, "test_287.py");
  fs.writeFileSync(file, script, "utf8");
  execSync(`python "${file}"`, { env });
  fullMatrix["find-the-duplicate-number"].python3 = "PASSED";
} catch (e) { fullMatrix["find-the-duplicate-number"].python3 = "FAILED: " + e.message; }

// JavaScript
try {
  const jsCode = prob287.acceptedCodeByLang.javascript;
  const script = `
${jsCode}
if (findDuplicate([1, 3, 4, 2, 2]) !== 2) throw new Error("tc1");
if (findDuplicate([3, 1, 3, 4, 2]) !== 3) throw new Error("tc2");
if (findDuplicate([3, 3, 3, 3, 3]) !== 3) throw new Error("tc3");
console.log("PASSED");
`;
  const file = path.join(testDir, "test_287.js");
  fs.writeFileSync(file, script, "utf8");
  execSync(`node "${file}"`, { env });
  fullMatrix["find-the-duplicate-number"].javascript = "PASSED";
} catch (e) { fullMatrix["find-the-duplicate-number"].javascript = "FAILED: " + e.message; }

// TypeScript
try {
  const tsCode = prob287.acceptedCodeByLang.typescript;
  const script = `
${tsCode}
if (findDuplicate([1, 3, 4, 2, 2]) !== 2) throw new Error("tc1");
if (findDuplicate([3, 1, 3, 4, 2]) !== 3) throw new Error("tc2");
console.log("PASSED");
`;
  const file = path.join(testDir, "test_287.ts");
  fs.writeFileSync(file, script, "utf8");
  execSync(`node --experimental-strip-types "${file}"`, { env });
  fullMatrix["find-the-duplicate-number"].typescript = "PASSED";
} catch (e) { fullMatrix["find-the-duplicate-number"].typescript = "FAILED: " + e.message; }

// Java
try {
  const javaCode = prob287.acceptedCodeByLang.java;
  const script = `
${javaCode}
public class Test287 {
    public static void main(String[] args) {
        Solution sol = new Solution();
        if (sol.findDuplicate(new int[]{1, 3, 4, 2, 2}) != 2) throw new RuntimeException("tc1");
        if (sol.findDuplicate(new int[]{3, 1, 3, 4, 2}) != 3) throw new RuntimeException("tc2");
        System.out.println("PASSED");
    }
}
`;
  const file = path.join(testDir, "Test287.java");
  fs.writeFileSync(file, script, "utf8");
  execSync(`javac "${file}"`, { env });
  execSync(`java -cp "${testDir}" Test287`, { env });
  fullMatrix["find-the-duplicate-number"].java = "PASSED";
} catch (e) { fullMatrix["find-the-duplicate-number"].java = "FAILED: " + e.message; }

// C++
try {
  const cppCode = prob287.acceptedCodeByLang.cpp;
  const script = `
#include <iostream>
#include <vector>
using namespace std;
${cppCode}
int main() {
    Solution sol;
    vector<int> a = {1, 3, 4, 2, 2};
    vector<int> b = {3, 1, 3, 4, 2};
    if (sol.findDuplicate(a) != 2) return 1;
    if (sol.findDuplicate(b) != 3) return 2;
    cout << "PASSED" << endl;
    return 0;
}
`;
  const file = path.join(testDir, "test_287.cpp");
  const exe = path.join(testDir, "test_287_cpp.exe");
  fs.writeFileSync(file, script, "utf8");
  execSync(`g++ -O2 "${file}" -o "${exe}"`, { env });
  execSync(`"${exe}"`, { env });
  fullMatrix["find-the-duplicate-number"].cpp = "PASSED";
} catch (e) { fullMatrix["find-the-duplicate-number"].cpp = "FAILED: " + e.message; }

// Go
try {
  const goCode = prob287.acceptedCodeByLang.go;
  const script = `
package main
import ("fmt"; "os")
${goCode}
func main() {
    if findDuplicate([]int{1, 3, 4, 2, 2}) != 2 { os.Exit(1) }
    if findDuplicate([]int{3, 1, 3, 4, 2}) != 3 { os.Exit(2) }
    fmt.Println("PASSED")
}
`;
  const file = path.join(testDir, "test_287.go");
  fs.writeFileSync(file, script, "utf8");
  execSync(`C:\\msys64\\ucrt64\\bin\\go.exe run "${file}"`, { env });
  fullMatrix["find-the-duplicate-number"].go = "PASSED";
} catch (e) { fullMatrix["find-the-duplicate-number"].go = "FAILED: " + e.message; }

// Rust
try {
  const rustCode = prob287.acceptedCodeByLang.rust;
  const script = `
struct Solution;
${rustCode}
fn main() {
    if Solution::find_duplicate(vec![1, 3, 4, 2, 2]) != 2 { std::process::exit(1); }
    if Solution::find_duplicate(vec![3, 1, 3, 4, 2]) != 3 { std::process::exit(2); }
    println!("PASSED");
}
`;
  const file = path.join(testDir, "test_287.rs");
  const exe = path.join(testDir, "test_287_rs.exe");
  fs.writeFileSync(file, script, "utf8");
  execSync(`C:\\msys64\\ucrt64\\bin\\rustc.exe "${file}" -o "${exe}"`, { env });
  execSync(`"${exe}"`, { env });
  fullMatrix["find-the-duplicate-number"].rust = "PASSED";
} catch (e) { fullMatrix["find-the-duplicate-number"].rust = "FAILED: " + e.message; }

console.log("Find the Duplicate Number Results:", JSON.stringify(fullMatrix["find-the-duplicate-number"], null, 2));


// ============================================================================
// 2. LEETCODE #1: Two Sum
// ============================================================================
console.log("\n=======================================================");
console.log("TESTING LEETCODE #1: Two Sum");
console.log("=======================================================");
const prob1 = eduData["two-sum"];
fullMatrix["two-sum"] = {};

// Python 3
try {
  const pyCode = prob1.acceptedCodeByLang.python3;
  const script = `
${pyCode}
sol = Solution()
assert sol.twoSum([2, 7, 11, 15], 9) == [0, 1]
assert sol.twoSum([3, 2, 4], 6) == [1, 2]
assert sol.twoSum([3, 3], 6) == [0, 1]
print("PASSED")
`;
  const file = path.join(testDir, "test_1.py");
  fs.writeFileSync(file, script, "utf8");
  execSync(`python "${file}"`, { env });
  fullMatrix["two-sum"].python3 = "PASSED";
} catch (e) { fullMatrix["two-sum"].python3 = "FAILED: " + e.message; }

// JavaScript
try {
  const jsCode = prob1.acceptedCodeByLang.javascript;
  const script = `
${jsCode}
const res = twoSum([2, 7, 11, 15], 9);
if (res[0] !== 0 || res[1] !== 1) throw new Error("tc1");
console.log("PASSED");
`;
  const file = path.join(testDir, "test_1.js");
  fs.writeFileSync(file, script, "utf8");
  execSync(`node "${file}"`, { env });
  fullMatrix["two-sum"].javascript = "PASSED";
} catch (e) { fullMatrix["two-sum"].javascript = "FAILED: " + e.message; }

// TypeScript
try {
  const tsCode = prob1.acceptedCodeByLang.typescript;
  const script = `
${tsCode}
const res = twoSum([2, 7, 11, 15], 9);
if (res[0] !== 0 || res[1] !== 1) throw new Error("tc1");
console.log("PASSED");
`;
  const file = path.join(testDir, "test_1.ts");
  fs.writeFileSync(file, script, "utf8");
  execSync(`node --experimental-strip-types "${file}"`, { env });
  fullMatrix["two-sum"].typescript = "PASSED";
} catch (e) { fullMatrix["two-sum"].typescript = "FAILED: " + e.message; }

// Java
try {
  const javaCode = prob1.acceptedCodeByLang.java;
  const script = `
import java.util.*;
${javaCode}
public class Test1 {
    public static void main(String[] args) {
        Solution sol = new Solution();
        int[] res = sol.twoSum(new int[]{2, 7, 11, 15}, 9);
        if (res[0] != 0 || res[1] != 1) throw new RuntimeException("tc1");
        System.out.println("PASSED");
    }
}
`;
  const file = path.join(testDir, "Test1.java");
  fs.writeFileSync(file, script, "utf8");
  execSync(`javac "${file}"`, { env });
  execSync(`java -cp "${testDir}" Test1`, { env });
  fullMatrix["two-sum"].java = "PASSED";
} catch (e) { fullMatrix["two-sum"].java = "FAILED: " + e.message; }

// C++
try {
  const cppCode = prob1.acceptedCodeByLang.cpp;
  const script = `
#include <iostream>
#include <vector>
#include <unordered_map>
using namespace std;
${cppCode}
int main() {
    Solution sol;
    vector<int> nums = {2, 7, 11, 15};
    vector<int> res = sol.twoSum(nums, 9);
    if (res[0] != 0 || res[1] != 1) return 1;
    cout << "PASSED" << endl;
    return 0;
}
`;
  const file = path.join(testDir, "test_1.cpp");
  const exe = path.join(testDir, "test_1_cpp.exe");
  fs.writeFileSync(file, script, "utf8");
  execSync(`g++ -O2 "${file}" -o "${exe}"`, { env });
  execSync(`"${exe}"`, { env });
  fullMatrix["two-sum"].cpp = "PASSED";
} catch (e) { fullMatrix["two-sum"].cpp = "FAILED: " + e.message; }

// Go
try {
  const goCode = prob1.acceptedCodeByLang.go;
  const script = `
package main
import ("fmt"; "os")
${goCode}
func main() {
    res := twoSum([]int{2, 7, 11, 15}, 9)
    if res[0] != 0 || res[1] != 1 { os.Exit(1) }
    fmt.Println("PASSED")
}
`;
  const file = path.join(testDir, "test_1.go");
  fs.writeFileSync(file, script, "utf8");
  execSync(`C:\\msys64\\ucrt64\\bin\\go.exe run "${file}"`, { env });
  fullMatrix["two-sum"].go = "PASSED";
} catch (e) { fullMatrix["two-sum"].go = "FAILED: " + e.message; }

// Rust
try {
  const rustCode = prob1.acceptedCodeByLang.rust;
  const script = `
struct Solution;
${rustCode}
fn main() {
    let res = Solution::two_sum(vec![2, 7, 11, 15], 9);
    if res != vec![0, 1] { std::process::exit(1); }
    println!("PASSED");
}
`;
  const file = path.join(testDir, "test_1.rs");
  const exe = path.join(testDir, "test_1_rs.exe");
  fs.writeFileSync(file, script, "utf8");
  execSync(`C:\\msys64\\ucrt64\\bin\\rustc.exe "${file}" -o "${exe}"`, { env });
  execSync(`"${exe}"`, { env });
  fullMatrix["two-sum"].rust = "PASSED";
} catch (e) { fullMatrix["two-sum"].rust = "FAILED: " + e.message; }

console.log("Two Sum Results:", JSON.stringify(fullMatrix["two-sum"], null, 2));


// ============================================================================
// 3. LEETCODE #1877: Minimize Maximum Pair Sum in Array
// ============================================================================
console.log("\n=======================================================");
console.log("TESTING LEETCODE #1877: Minimize Maximum Pair Sum in Array");
console.log("=======================================================");
const prob1877 = eduData["minimize-maximum-pair-sum-in-array"];
fullMatrix["minimize-maximum-pair-sum-in-array"] = {};

// Python 3
try {
  const pyCode = prob1877.acceptedCodeByLang.python3;
  const script = `
${pyCode}
sol = Solution()
assert sol.minPairSum([3, 5, 2, 3]) == 7
assert sol.minPairSum([3, 5, 4, 2, 4, 6]) == 8
print("PASSED")
`;
  const file = path.join(testDir, "test_1877.py");
  fs.writeFileSync(file, script, "utf8");
  execSync(`python "${file}"`, { env });
  fullMatrix["minimize-maximum-pair-sum-in-array"].python3 = "PASSED";
} catch (e) { fullMatrix["minimize-maximum-pair-sum-in-array"].python3 = "FAILED: " + e.message; }

// JavaScript
try {
  const jsCode = prob1877.acceptedCodeByLang.javascript;
  const script = `
${jsCode}
if (minPairSum([3, 5, 2, 3]) !== 7) throw new Error("tc1");
if (minPairSum([3, 5, 4, 2, 4, 6]) !== 8) throw new Error("tc2");
console.log("PASSED");
`;
  const file = path.join(testDir, "test_1877.js");
  fs.writeFileSync(file, script, "utf8");
  execSync(`node "${file}"`, { env });
  fullMatrix["minimize-maximum-pair-sum-in-array"].javascript = "PASSED";
} catch (e) { fullMatrix["minimize-maximum-pair-sum-in-array"].javascript = "FAILED: " + e.message; }

// TypeScript
try {
  const tsCode = prob1877.acceptedCodeByLang.typescript;
  const script = `
${tsCode}
if (minPairSum([3, 5, 2, 3]) !== 7) throw new Error("tc1");
console.log("PASSED");
`;
  const file = path.join(testDir, "test_1877.ts");
  fs.writeFileSync(file, script, "utf8");
  execSync(`node --experimental-strip-types "${file}"`, { env });
  fullMatrix["minimize-maximum-pair-sum-in-array"].typescript = "PASSED";
} catch (e) { fullMatrix["minimize-maximum-pair-sum-in-array"].typescript = "FAILED: " + e.message; }

// Java
try {
  const javaCode = prob1877.acceptedCodeByLang.java;
  const script = `
import java.util.*;
${javaCode}
public class Test1877 {
    public static void main(String[] args) {
        Solution sol = new Solution();
        if (sol.minPairSum(new int[]{3, 5, 2, 3}) != 7) throw new RuntimeException("tc1");
        if (sol.minPairSum(new int[]{3, 5, 4, 2, 4, 6}) != 8) throw new RuntimeException("tc2");
        System.out.println("PASSED");
    }
}
`;
  const file = path.join(testDir, "Test1877.java");
  fs.writeFileSync(file, script, "utf8");
  execSync(`javac "${file}"`, { env });
  execSync(`java -cp "${testDir}" Test1877`, { env });
  fullMatrix["minimize-maximum-pair-sum-in-array"].java = "PASSED";
} catch (e) { fullMatrix["minimize-maximum-pair-sum-in-array"].java = "FAILED: " + e.message; }

// C++
try {
  const cppCode = prob1877.acceptedCodeByLang.cpp;
  const script = `
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;
${cppCode}
int main() {
    Solution sol;
    vector<int> a = {3, 5, 2, 3};
    vector<int> b = {3, 5, 4, 2, 4, 6};
    if (sol.minPairSum(a) != 7) return 1;
    if (sol.minPairSum(b) != 8) return 2;
    cout << "PASSED" << endl;
    return 0;
}
`;
  const file = path.join(testDir, "test_1877.cpp");
  const exe = path.join(testDir, "test_1877_cpp.exe");
  fs.writeFileSync(file, script, "utf8");
  execSync(`g++ -O2 "${file}" -o "${exe}"`, { env });
  execSync(`"${exe}"`, { env });
  fullMatrix["minimize-maximum-pair-sum-in-array"].cpp = "PASSED";
} catch (e) { fullMatrix["minimize-maximum-pair-sum-in-array"].cpp = "FAILED: " + e.message; }

// Go
try {
  const goCode = prob1877.acceptedCodeByLang.go;
  const script = `
package main
import ("fmt"; "os"; "sort")
${goCode}
func main() {
    if minPairSum([]int{3, 5, 2, 3}) != 7 { os.Exit(1) }
    if minPairSum([]int{3, 5, 4, 2, 4, 6}) != 8 { os.Exit(2) }
    fmt.Println("PASSED")
}
`;
  const file = path.join(testDir, "test_1877.go");
  fs.writeFileSync(file, script, "utf8");
  execSync(`C:\\msys64\\ucrt64\\bin\\go.exe run "${file}"`, { env });
  fullMatrix["minimize-maximum-pair-sum-in-array"].go = "PASSED";
} catch (e) { fullMatrix["minimize-maximum-pair-sum-in-array"].go = "FAILED: " + e.message; }

// Rust
try {
  const rustCode = prob1877.acceptedCodeByLang.rust;
  const script = `
struct Solution;
${rustCode}
fn main() {
    if Solution::min_pair_sum(vec![3, 5, 2, 3]) != 7 { std::process::exit(1); }
    if Solution::min_pair_sum(vec![3, 5, 4, 2, 4, 6]) != 8 { std::process::exit(2); }
    println!("PASSED");
}
`;
  const file = path.join(testDir, "test_1877.rs");
  const exe = path.join(testDir, "test_1877_rs.exe");
  fs.writeFileSync(file, script, "utf8");
  execSync(`C:\\msys64\\ucrt64\\bin\\rustc.exe "${file}" -o "${exe}"`, { env });
  execSync(`"${exe}"`, { env });
  fullMatrix["minimize-maximum-pair-sum-in-array"].rust = "PASSED";
} catch (e) { fullMatrix["minimize-maximum-pair-sum-in-array"].rust = "FAILED: " + e.message; }

console.log("Minimize Maximum Pair Sum Results:", JSON.stringify(fullMatrix["minimize-maximum-pair-sum-in-array"], null, 2));


// ============================================================================
// 4. LEETCODE #704: Binary Search
// ============================================================================
console.log("\n=======================================================");
console.log("TESTING LEETCODE #704: Binary Search");
console.log("=======================================================");
const prob704 = eduData["binary-search"];
fullMatrix["binary-search"] = {};

// Python 3
try {
  const pyCode = prob704.acceptedCodeByLang.python3;
  const script = `
${pyCode}
sol = Solution()
assert sol.search([-1, 0, 3, 5, 9, 12], 9) == 4
assert sol.search([-1, 0, 3, 5, 9, 12], 2) == -1
print("PASSED")
`;
  const file = path.join(testDir, "test_704.py");
  fs.writeFileSync(file, script, "utf8");
  execSync(`python "${file}"`, { env });
  fullMatrix["binary-search"].python3 = "PASSED";
} catch (e) { fullMatrix["binary-search"].python3 = "FAILED: " + e.message; }

// JavaScript
try {
  const jsCode = prob704.acceptedCodeByLang.javascript;
  const script = `
${jsCode}
if (search([-1, 0, 3, 5, 9, 12], 9) !== 4) throw new Error("tc1");
if (search([-1, 0, 3, 5, 9, 12], 2) !== -1) throw new Error("tc2");
console.log("PASSED");
`;
  const file = path.join(testDir, "test_704.js");
  fs.writeFileSync(file, script, "utf8");
  execSync(`node "${file}"`, { env });
  fullMatrix["binary-search"].javascript = "PASSED";
} catch (e) { fullMatrix["binary-search"].javascript = "FAILED: " + e.message; }

// TypeScript
try {
  const tsCode = prob704.acceptedCodeByLang.typescript;
  const script = `
${tsCode}
if (search([-1, 0, 3, 5, 9, 12], 9) !== 4) throw new Error("tc1");
console.log("PASSED");
`;
  const file = path.join(testDir, "test_704.ts");
  fs.writeFileSync(file, script, "utf8");
  execSync(`node --experimental-strip-types "${file}"`, { env });
  fullMatrix["binary-search"].typescript = "PASSED";
} catch (e) { fullMatrix["binary-search"].typescript = "FAILED: " + e.message; }

// Java
try {
  const javaCode = prob704.acceptedCodeByLang.java;
  const script = `
${javaCode}
public class Test704 {
    public static void main(String[] args) {
        Solution sol = new Solution();
        if (sol.search(new int[]{-1, 0, 3, 5, 9, 12}, 9) != 4) throw new RuntimeException("tc1");
        if (sol.search(new int[]{-1, 0, 3, 5, 9, 12}, 2) != -1) throw new RuntimeException("tc2");
        System.out.println("PASSED");
    }
}
`;
  const file = path.join(testDir, "Test704.java");
  fs.writeFileSync(file, script, "utf8");
  execSync(`javac "${file}"`, { env });
  execSync(`java -cp "${testDir}" Test704`, { env });
  fullMatrix["binary-search"].java = "PASSED";
} catch (e) { fullMatrix["binary-search"].java = "FAILED: " + e.message; }

// C++
try {
  const cppCode = prob704.acceptedCodeByLang.cpp;
  const script = `
#include <iostream>
#include <vector>
using namespace std;
${cppCode}
int main() {
    Solution sol;
    vector<int> nums = {-1, 0, 3, 5, 9, 12};
    if (sol.search(nums, 9) != 4) return 1;
    if (sol.search(nums, 2) != -1) return 2;
    cout << "PASSED" << endl;
    return 0;
}
`;
  const file = path.join(testDir, "test_704.cpp");
  const exe = path.join(testDir, "test_704_cpp.exe");
  fs.writeFileSync(file, script, "utf8");
  execSync(`g++ -O2 "${file}" -o "${exe}"`, { env });
  execSync(`"${exe}"`, { env });
  fullMatrix["binary-search"].cpp = "PASSED";
} catch (e) { fullMatrix["binary-search"].cpp = "FAILED: " + e.message; }

// Go
try {
  const goCode = prob704.acceptedCodeByLang.go;
  const script = `
package main
import ("fmt"; "os")
${goCode}
func main() {
    if search([]int{-1, 0, 3, 5, 9, 12}, 9) != 4 { os.Exit(1) }
    if search([]int{-1, 0, 3, 5, 9, 12}, 2) != -1 { os.Exit(2) }
    fmt.Println("PASSED")
}
`;
  const file = path.join(testDir, "test_704.go");
  fs.writeFileSync(file, script, "utf8");
  execSync(`C:\\msys64\\ucrt64\\bin\\go.exe run "${file}"`, { env });
  fullMatrix["binary-search"].go = "PASSED";
} catch (e) { fullMatrix["binary-search"].go = "FAILED: " + e.message; }

// Rust
try {
  const rustCode = prob704.acceptedCodeByLang.rust;
  const script = `
struct Solution;
${rustCode}
fn main() {
    if Solution::search(vec![-1, 0, 3, 5, 9, 12], 9) != 4 { std::process::exit(1); }
    if Solution::search(vec![-1, 0, 3, 5, 9, 12], 2) != -1 { std::process::exit(2); }
    println!("PASSED");
}
`;
  const file = path.join(testDir, "test_704.rs");
  const exe = path.join(testDir, "test_704_rs.exe");
  fs.writeFileSync(file, script, "utf8");
  execSync(`C:\\msys64\\ucrt64\\bin\\rustc.exe "${file}" -o "${exe}"`, { env });
  execSync(`"${exe}"`, { env });
  fullMatrix["binary-search"].rust = "PASSED";
} catch (e) { fullMatrix["binary-search"].rust = "FAILED: " + e.message; }

console.log("Binary Search Results:", JSON.stringify(fullMatrix["binary-search"], null, 2));


// ============================================================================
// 5. Bubble Sort Educational Example
// ============================================================================
console.log("\n=======================================================");
console.log("TESTING Bubble Sort Educational Example");
console.log("=======================================================");
const probBubble = eduData["bubble-sort"];
fullMatrix["bubble-sort"] = {};

// Python 3
try {
  const pyCode = probBubble.acceptedCodeByLang.python3;
  const script = `
${pyCode}
sol = Solution()
assert sol.bubbleSort([5, 1, 4, 2, 8]) == [1, 2, 4, 5, 8]
print("PASSED")
`;
  const file = path.join(testDir, "test_bubble.py");
  fs.writeFileSync(file, script, "utf8");
  execSync(`python "${file}"`, { env });
  fullMatrix["bubble-sort"].python3 = "PASSED";
} catch (e) { fullMatrix["bubble-sort"].python3 = "FAILED: " + e.message; }

// JavaScript
try {
  const jsCode = probBubble.acceptedCodeByLang.javascript;
  const script = `
${jsCode}
const res = bubbleSort([5, 1, 4, 2, 8]);
if (JSON.stringify(res) !== JSON.stringify([1, 2, 4, 5, 8])) throw new Error("tc1");
console.log("PASSED");
`;
  const file = path.join(testDir, "test_bubble.js");
  fs.writeFileSync(file, script, "utf8");
  execSync(`node "${file}"`, { env });
  fullMatrix["bubble-sort"].javascript = "PASSED";
} catch (e) { fullMatrix["bubble-sort"].javascript = "FAILED: " + e.message; }

// TypeScript
try {
  const tsCode = probBubble.acceptedCodeByLang.typescript;
  const script = `
${tsCode}
const res = bubbleSort([5, 1, 4, 2, 8]);
if (JSON.stringify(res) !== JSON.stringify([1, 2, 4, 5, 8])) throw new Error("tc1");
console.log("PASSED");
`;
  const file = path.join(testDir, "test_bubble.ts");
  fs.writeFileSync(file, script, "utf8");
  execSync(`node --experimental-strip-types "${file}"`, { env });
  fullMatrix["bubble-sort"].typescript = "PASSED";
} catch (e) { fullMatrix["bubble-sort"].typescript = "FAILED: " + e.message; }

// Java
try {
  const javaCode = probBubble.acceptedCodeByLang.java;
  const script = `
import java.util.*;
${javaCode}
public class TestBubble {
    public static void main(String[] args) {
        Solution sol = new Solution();
        int[] arr = {5, 1, 4, 2, 8};
        sol.bubbleSort(arr);
        if (!Arrays.equals(arr, new int[]{1, 2, 4, 5, 8})) throw new RuntimeException("tc1");
        System.out.println("PASSED");
    }
}
`;
  const file = path.join(testDir, "TestBubble.java");
  fs.writeFileSync(file, script, "utf8");
  execSync(`javac "${file}"`, { env });
  execSync(`java -cp "${testDir}" TestBubble`, { env });
  fullMatrix["bubble-sort"].java = "PASSED";
} catch (e) { fullMatrix["bubble-sort"].java = "FAILED: " + e.message; }

// C++
try {
  const cppCode = probBubble.acceptedCodeByLang.cpp;
  const script = `
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;
${cppCode}
int main() {
    Solution sol;
    vector<int> a = {5, 1, 4, 2, 8};
    sol.bubbleSort(a);
    if (a != vector<int>{1, 2, 4, 5, 8}) return 1;
    cout << "PASSED" << endl;
    return 0;
}
`;
  const file = path.join(testDir, "test_bubble.cpp");
  const exe = path.join(testDir, "test_bubble_cpp.exe");
  fs.writeFileSync(file, script, "utf8");
  execSync(`g++ -O2 "${file}" -o "${exe}"`, { env });
  execSync(`"${exe}"`, { env });
  fullMatrix["bubble-sort"].cpp = "PASSED";
} catch (e) { fullMatrix["bubble-sort"].cpp = "FAILED: " + e.message; }

// Go
try {
  const goCode = probBubble.acceptedCodeByLang.go;
  const script = `
package main
import ("fmt"; "os"; "reflect")
${goCode}
func main() {
    res := bubbleSort([]int{5, 1, 4, 2, 8})
    if !reflect.DeepEqual(res, []int{1, 2, 4, 5, 8}) { os.Exit(1) }
    fmt.Println("PASSED")
}
`;
  const file = path.join(testDir, "test_bubble.go");
  fs.writeFileSync(file, script, "utf8");
  execSync(`C:\\msys64\\ucrt64\\bin\\go.exe run "${file}"`, { env });
  fullMatrix["bubble-sort"].go = "PASSED";
} catch (e) { fullMatrix["bubble-sort"].go = "FAILED: " + e.message; }

// Rust
try {
  const rustCode = probBubble.acceptedCodeByLang.rust;
  const script = `
struct Solution;
${rustCode}
fn main() {
    let res = Solution::bubble_sort(vec![5, 1, 4, 2, 8]);
    if res != vec![1, 2, 4, 5, 8] { std::process::exit(1); }
    println!("PASSED");
}
`;
  const file = path.join(testDir, "test_bubble.rs");
  const exe = path.join(testDir, "test_bubble_rs.exe");
  fs.writeFileSync(file, script, "utf8");
  execSync(`C:\\msys64\\ucrt64\\bin\\rustc.exe "${file}" -o "${exe}"`, { env });
  execSync(`"${exe}"`, { env });
  fullMatrix["bubble-sort"].rust = "PASSED";
} catch (e) { fullMatrix["bubble-sort"].rust = "FAILED: " + e.message; }

console.log("Bubble Sort Results:", JSON.stringify(fullMatrix["bubble-sort"], null, 2));

console.log("\n=======================================================");
console.log("COMPLETE CURRICULUM EXECUTION MATRIX (ALL PROBLEMS X ALL 7 LANGUAGES)");
console.log("=======================================================");
console.log(JSON.stringify(fullMatrix, null, 2));
