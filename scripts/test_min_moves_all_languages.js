"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const eduData = require("./tmp_edu_data.js");
const minMoves = eduData["minimum-moves-to-equal-array-elements"];
const testDir = path.join(__dirname, "../tmp/lang_tests");
fs.mkdirSync(testDir, { recursive: true });

const env = {
  ...process.env,
  PATH: "C:\\msys64\\ucrt64\\bin;" + process.env.PATH,
  GOROOT: "C:\\msys64\\ucrt64\\lib\\go"
};

const TEST_CASES = [
  { name: "[1, 2, 3]", input: [1, 2, 3], expected: 3 },
  { name: "[1, 1, 1]", input: [1, 1, 1], expected: 0 },
  { name: "[1, 2, 3, 4]", input: [1, 2, 3, 4], expected: 6 },
  { name: "Negative [-100, 0, 100]", input: [-100, 0, 100], expected: 300 },
  { name: "Negative [-1, 1]", input: [-1, 1], expected: 2 },
  { name: "Single element [1]", input: [1], expected: 0 },
  { name: "Large values [0, 1000000000]", input: [0, 1000000000], expected: 1000000000 },
  { name: "Large values [1000000000, 1000000000, 1000000000]", input: [1000000000, 1000000000, 1000000000], expected: 0 }
];

console.log("======================================================================");
console.log("EXECUTING ALL 7 LANGUAGE RUNTIMES FOR LEETCODE #453");
console.log("======================================================================");

const results = {};

// 1. Python 3
try {
  console.log("\n[1/7] Testing Python 3...");
  const pyCode = minMoves.acceptedCodeByLang.python3;
  const pyHarness = `
${pyCode}

import sys

test_cases = ${JSON.stringify(TEST_CASES)}
sol = Solution()
passed = 0
for tc in test_cases:
    actual = sol.minMoves(list(tc["input"]))
    assert actual == tc["expected"], f"Failed {tc['name']}: expected {tc['expected']}, got {actual}"
    passed += 1

print(f"PYTHON_PASSED:{passed}/{len(test_cases)}")
`;
  const pyFile = path.join(testDir, "test_min_moves.py");
  fs.writeFileSync(pyFile, pyHarness, "utf8");
  const pyOut = execSync(`python "${pyFile}"`, { env }).toString().trim();
  console.log("  Output:", pyOut);
  results.python3 = { passed: true, details: pyOut };
} catch (e) {
  console.error("  Python 3 Error:", e.message);
  results.python3 = { passed: false, error: e.message };
}

// 2. JavaScript (Node.js)
try {
  console.log("\n[2/7] Testing JavaScript...");
  const jsCode = minMoves.acceptedCodeByLang.javascript;
  const jsHarness = `
${jsCode}

const testCases = ${JSON.stringify(TEST_CASES)};
let passed = 0;
for (const tc of testCases) {
  const actual = minMoves([...tc.input]);
  if (actual !== tc.expected) throw new Error(\`Failed \${tc.name}: expected \${tc.expected}, got \${actual}\`);
  passed++;
}
console.log(\`JAVASCRIPT_PASSED:\${passed}/\${testCases.length}\`);
`;
  const jsFile = path.join(testDir, "test_min_moves.js");
  fs.writeFileSync(jsFile, jsHarness, "utf8");
  const jsOut = execSync(`node "${jsFile}"`, { env }).toString().trim();
  console.log("  Output:", jsOut);
  results.javascript = { passed: true, details: jsOut };
} catch (e) {
  console.error("  JavaScript Error:", e.message);
  results.javascript = { passed: false, error: e.message };
}

// 3. TypeScript (Node.js with --experimental-strip-types)
try {
  console.log("\n[3/7] Testing TypeScript...");
  const tsCode = minMoves.acceptedCodeByLang.typescript;
  const tsHarness = `
${tsCode}

interface TestCase {
  name: string;
  input: number[];
  expected: number;
}

const testCases: TestCase[] = ${JSON.stringify(TEST_CASES)};
let passed: number = 0;
for (const tc of testCases) {
  const actual: number = minMoves([...tc.input]);
  if (actual !== tc.expected) throw new Error(\`Failed \${tc.name}: expected \${tc.expected}, got \${actual}\`);
  passed++;
}
console.log(\`TYPESCRIPT_PASSED:\${passed}/\${testCases.length}\`);
`;
  const tsFile = path.join(testDir, "test_min_moves.ts");
  fs.writeFileSync(tsFile, tsHarness, "utf8");
  const tsOut = execSync(`node --experimental-strip-types "${tsFile}"`, { env }).toString().trim();
  console.log("  Output:", tsOut);
  results.typescript = { passed: true, details: tsOut };
} catch (e) {
  console.error("  TypeScript Error:", e.message);
  results.typescript = { passed: false, error: e.message };
}

// 4. Java (javac + java)
try {
  console.log("\n[4/7] Testing Java...");
  const javaCode = minMoves.acceptedCodeByLang.java;
  const javaHarness = `
import java.util.*;

${javaCode}

public class TestMinMoves {
    public static void main(String[] args) {
        Solution sol = new Solution();
        int passed = 0;
        
        int[][] inputs = {
            {1, 2, 3},
            {1, 1, 1},
            {1, 2, 3, 4},
            {-100, 0, 100},
            {-1, 1},
            {1},
            {0, 1000000000},
            {1000000000, 1000000000, 1000000000}
        };
        int[] expected = {3, 0, 6, 300, 2, 0, 1000000000, 0};
        String[] names = {
            "[1, 2, 3]", "[1, 1, 1]", "[1, 2, 3, 4]", "Negative [-100, 0, 100]",
            "Negative [-1, 1]", "Single element [1]", "Large values [0, 1000000000]",
            "Large values [1000000000, 1000000000, 1000000000]"
        };

        for (int i = 0; i < inputs.length; i++) {
            int actual = sol.minMoves(inputs[i].clone());
            if (actual != expected[i]) {
                throw new RuntimeException("Failed " + names[i] + ": expected " + expected[i] + ", got " + actual);
            }
            passed++;
        }
        System.out.println("JAVA_PASSED:" + passed + "/" + inputs.length);
    }
}
`;
  const javaFile = path.join(testDir, "TestMinMoves.java");
  fs.writeFileSync(javaFile, javaHarness, "utf8");
  execSync(`javac "${javaFile}"`, { env });
  const javaOut = execSync(`java -cp "${testDir}" TestMinMoves`, { env }).toString().trim();
  console.log("  Output:", javaOut);
  results.java = { passed: true, details: javaOut };
} catch (e) {
  console.error("  Java Error:", e.message);
  results.java = { passed: false, error: e.message };
}

// 5. C++ (g++)
try {
  console.log("\n[5/7] Testing C++...");
  const cppCode = minMoves.acceptedCodeByLang.cpp;
  const cppHarness = `
#include <iostream>
#include <vector>
#include <cassert>
#include <string>

using namespace std;

${cppCode}

int main() {
    Solution sol;
    int passed = 0;

    struct TestCase {
        string name;
        vector<int> input;
        int expected;
    };

    vector<TestCase> testCases = {
        {"[1, 2, 3]", {1, 2, 3}, 3},
        {"[1, 1, 1]", {1, 1, 1}, 0},
        {"[1, 2, 3, 4]", {1, 2, 3, 4}, 6},
        {"Negative [-100, 0, 100]", {-100, 0, 100}, 300},
        {"Negative [-1, 1]", {-1, 1}, 2},
        {"Single element [1]", {1}, 0},
        {"Large values [0, 1000000000]", {0, 1000000000}, 1000000000},
        {"Large values [1000000000, 1000000000, 1000000000]", {1000000000, 1000000000, 1000000000}, 0}
    };

    for (auto& tc : testCases) {
        vector<int> nums = tc.input;
        int actual = sol.minMoves(nums);
        if (actual != tc.expected) {
            cerr << "Failed " << tc.name << ": expected " << tc.expected << ", got " << actual << endl;
            return 1;
        }
        passed++;
    }

    cout << "CPP_PASSED:" << passed << "/" << testCases.size() << endl;
    return 0;
}
`;
  const cppFile = path.join(testDir, "test_min_moves.cpp");
  const cppExe = path.join(testDir, "test_min_moves_cpp.exe");
  fs.writeFileSync(cppFile, cppHarness, "utf8");
  execSync(`g++ -O2 "${cppFile}" -o "${cppExe}"`, { env });
  const cppOut = execSync(`"${cppExe}"`, { env }).toString().trim();
  console.log("  Output:", cppOut);
  results.cpp = { passed: true, details: cppOut };
} catch (e) {
  console.error("  C++ Error:", e.message);
  results.cpp = { passed: false, error: e.message };
}

// 6. Go (go run)
try {
  console.log("\n[6/7] Testing Go...");
  const goCode = minMoves.acceptedCodeByLang.go;
  const goHarness = `
package main

import (
	"fmt"
	"os"
)

${goCode}

func main() {
	testCases := []struct {
		name     string
		input    []int
		expected int
	}{
		{"[1, 2, 3]", []int{1, 2, 3}, 3},
		{"[1, 1, 1]", []int{1, 1, 1}, 0},
		{"[1, 2, 3, 4]", []int{1, 2, 3, 4}, 6},
		{"Negative [-100, 0, 100]", []int{-100, 0, 100}, 300},
		{"Negative [-1, 1]", []int{-1, 1}, 2},
		{"Single element [1]", []int{1}, 0},
		{"Large values [0, 1000000000]", []int{0, 1000000000}, 1000000000},
		{"Large values [1000000000, 1000000000, 1000000000]", []int{1000000000, 1000000000, 1000000000}, 0},
	}

	passed := 0
	for _, tc := range testCases {
		inputCopy := make([]int, len(tc.input))
		copy(inputCopy, tc.input)
		actual := minMoves(inputCopy)
		if actual != tc.expected {
			fmt.Fprintf(os.Stderr, "Failed %s: expected %d, got %d\\n", tc.name, tc.expected, actual)
			os.Exit(1)
		}
		passed++
	}

	fmt.Printf("GO_PASSED:%d/%d\\n", passed, len(testCases))
}
`;
  const goFile = path.join(testDir, "test_min_moves.go");
  fs.writeFileSync(goFile, goHarness, "utf8");
  const goOut = execSync(`C:\\msys64\\ucrt64\\bin\\go.exe run "${goFile}"`, { env }).toString().trim();
  console.log("  Output:", goOut);
  results.go = { passed: true, details: goOut };
} catch (e) {
  console.error("  Go Error:", e.message);
  results.go = { passed: false, error: e.message };
}

// 7. Rust (rustc)
try {
  console.log("\n[7/7] Testing Rust...");
  const rustCode = minMoves.acceptedCodeByLang.rust;
  const rustHarness = `
struct Solution;

${rustCode}

fn main() {
    struct TestCase {
        name: &'static str,
        input: Vec<i32>,
        expected: i32,
    }

    let test_cases = vec![
        TestCase { name: "[1, 2, 3]", input: vec![1, 2, 3], expected: 3 },
        TestCase { name: "[1, 1, 1]", input: vec![1, 1, 1], expected: 0 },
        TestCase { name: "[1, 2, 3, 4]", input: vec![1, 2, 3, 4], expected: 6 },
        TestCase { name: "Negative [-100, 0, 100]", input: vec![-100, 0, 100], expected: 300 },
        TestCase { name: "Negative [-1, 1]", input: vec![-1, 1], expected: 2 },
        TestCase { name: "Single element [1]", input: vec![1], expected: 0 },
        TestCase { name: "Large values [0, 1000000000]", input: vec![0, 1000000000], expected: 1000000000 },
        TestCase { name: "Large values [1000000000, 1000000000, 1000000000]", input: vec![1000000000, 1000000000, 1000000000], expected: 0 },
    ];

    let mut passed = 0;
    for tc in &test_cases {
        let actual = Solution::min_moves(tc.input.clone());
        if actual != tc.expected {
            eprintln!("Failed {}: expected {}, got {}", tc.name, tc.expected, actual);
            std::process::exit(1);
        }
        passed += 1;
    }

    println!("RUST_PASSED:{}/{}", passed, test_cases.len());
}
`;
  const rsFile = path.join(testDir, "test_min_moves.rs");
  const rsExe = path.join(testDir, "test_min_moves_rs.exe");
  fs.writeFileSync(rsFile, rustHarness, "utf8");
  execSync(`C:\\msys64\\ucrt64\\bin\\rustc.exe "${rsFile}" -o "${rsExe}"`, { env });
  const rsOut = execSync(`"${rsExe}"`, { env }).toString().trim();
  console.log("  Output:", rsOut);
  results.rust = { passed: true, details: rsOut };
} catch (e) {
  console.error("  Rust Error:", e.message);
  results.rust = { passed: false, error: e.message };
}

console.log("\n======================================================================");
console.log("FINAL EXECUTION MATRIX FOR #453:");
console.log(JSON.stringify(results, null, 2));
console.log("======================================================================");
