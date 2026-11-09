"use strict";

/**
 * DSAverse AI Code Mentor — Module 5: Code Execution & Verification Engine
 * 
 * Provides isolated, sandboxed execution and verification for student submissions
 * and generated multi-tier solutions (Brute Force, Improved, Optimal).
 */

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");

// Supported Languages (Matches Module 4)
const SUPPORTED_LANGUAGES = Object.freeze([
  "java",
  "python3",
  "python",
  "cpp",
  "javascript",
  "typescript",
  "go",
  "rust"
]);

// Judge0 Language IDs mapping
const JUDGE0_LANGUAGE_MAP = Object.freeze({
  java: 62,        // Java (OpenJDK 13/17)
  python3: 71,     // Python (3.8.1)
  python: 71,      // Python 3
  cpp: 54,         // C++ (GCC 9.2.0)
  javascript: 63,  // JavaScript (Node.js 12.14.0)
  typescript: 74,  // TypeScript (3.7.4)
  go: 60,          // Go (1.13.5)
  rust: 73         // Rust (1.40.0)
});

// Resource Boundaries
const LIMITS = Object.freeze({
  MAX_SOURCE_BYTES: 64 * 1024,      // 64 KB
  MAX_INPUT_BYTES: 32 * 1024,       // 32 KB
  MAX_OUTPUT_BYTES: 64 * 1024,      // 64 KB
  DEFAULT_TIMEOUT_MS: 4000,         // 4 seconds
  MAX_TIMEOUT_MS: 12000,            // 12 seconds
  DEFAULT_MEMORY_KB: 128 * 1024     // 128 MB
});

// Execution Delimiter for multi-test harness stdout parsing
const TEST_DELIM_PREFIX = "__DSA_TEST_DELIM__";

/**
 * Normalizes language string
 */
function normalizeExecutionLanguage(lang) {
  if (!lang || typeof lang !== "string") return "python3";
  const cleaned = lang.trim().toLowerCase();
  if (cleaned === "py" || cleaned === "python") return "python3";
  if (cleaned === "js" || cleaned === "node") return "javascript";
  if (cleaned === "ts") return "typescript";
  if (cleaned === "c++") return "cpp";
  if (cleaned === "golang") return "go";
  if (cleaned === "rs") return "rust";
  return SUPPORTED_LANGUAGES.includes(cleaned) ? cleaned : "python3";
}

/**
 * Normalizes expected or actual output string for safe comparison
 */
function normalizeOutput(val) {
  if (val === null || val === undefined) return "";
  let str = String(val).trim();
  // Strip enclosing quotes if single word
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1);
  }
  // Normalize booleans
  if (str.toLowerCase() === "true") return "true";
  if (str.toLowerCase() === "false") return "false";
  // Normalize numbers (e.g. 5.0 -> 5)
  if (!Number.isNaN(Number(str)) && !str.includes(" ")) {
    const num = Number(str);
    if (Number.isInteger(num)) return String(num);
  }
  // Normalize JSON arrays/objects spacing
  if ((str.startsWith("[") && str.endsWith("]")) || (str.startsWith("{") && str.endsWith("}"))) {
    try {
      return JSON.stringify(JSON.parse(str));
    } catch {
      // Non-strict JSON (e.g. single quotes or unquoted keys)
      return str.replace(/\s*([,:[\]{}])\s*/g, "$1").replace(/'/g, '"');
    }
  }
  // Normalize multiple internal whitespace/newlines
  return str.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");
}

/**
 * Compares actual output with expected output safely
 */
function compareOutputs(actual, expected) {
  if (expected === null || expected === undefined || expected === "") {
    return { matches: null, status: "unverified" };
  }
  const normActual = normalizeOutput(actual);
  const normExpected = normalizeOutput(expected);

  if (normActual === normExpected) {
    return { matches: true, status: "passed", actualNormalized: normActual, expectedNormalized: normExpected };
  }

  // Check float tolerance
  const numActual = Number(normActual);
  const numExpected = Number(normExpected);
  if (!Number.isNaN(numActual) && !Number.isNaN(numExpected)) {
    if (Math.abs(numActual - numExpected) < 1e-5) {
      return { matches: true, status: "passed", actualNormalized: normActual, expectedNormalized: normExpected };
    }
  }

  return { matches: false, status: "failed", actualNormalized: normActual, expectedNormalized: normExpected };
}

/**
 * Extracts test cases from canonical problem intelligence and user custom inputs
 */
function extractProblemTestCases(problem, customCases = []) {
  const cases = [];
  const seenInputs = new Set();

  // 1. Canonical examples
  if (problem && Array.isArray(problem.examples)) {
    problem.examples.forEach((ex, idx) => {
      const inputStr = typeof ex === "string" ? ex : (ex.input || "");
      const outputStr = typeof ex === "object" ? (ex.output !== undefined ? String(ex.output) : null) : null;
      if (inputStr) {
        cases.push({
          id: `example-${idx + 1}`,
          input: inputStr,
          expectedOutput: outputStr,
          isExample: true,
          isCustom: false,
          explanation: ex.explanation || null
        });
        seenInputs.add(inputStr.trim());
      }
    });
  }

  // 2. Canonical testCases fixture if present
  if (problem && Array.isArray(problem.testCases)) {
    problem.testCases.forEach((tc, idx) => {
      const inputStr = tc.input || "";
      if (inputStr && !seenInputs.has(inputStr.trim())) {
        cases.push({
          id: tc.id || `canonical-${idx + 1}`,
          input: inputStr,
          expectedOutput: tc.expectedOutput !== undefined ? String(tc.expectedOutput) : null,
          isExample: false,
          isCustom: false,
          explanation: tc.explanation || null
        });
        seenInputs.add(inputStr.trim());
      }
    });
  }

  // 3. User-provided custom test cases
  if (Array.isArray(customCases)) {
    customCases.forEach((cc, idx) => {
      const inputStr = typeof cc === "string" ? cc : (cc.input || "");
      if (inputStr && !seenInputs.has(inputStr.trim())) {
        cases.push({
          id: cc.id || `custom-${idx + 1}`,
          input: inputStr,
          expectedOutput: cc.expectedOutput !== undefined ? String(cc.expectedOutput) : null,
          isExample: false,
          isCustom: true,
          explanation: "User-defined custom test case"
        });
        seenInputs.add(inputStr.trim());
      }
    });
  }

  return cases;
}

/**
 * Parses LeetCode example input string into individual arguments
 * e.g. 's = "abc", t = "ahbgdc"' -> ['"abc"', '"ahbgdc"']
 * e.g. 'nums = [1,2,3,4], k = 5' -> ['[1,2,3,4]', '5']
 */
function parseInputArguments(inputStr) {
  if (!inputStr || typeof inputStr !== "string") return [];
  const str = inputStr.trim();
  const args = [];
  let current = "";
  let inString = false;
  let stringChar = "";
  let bracketDepth = 0;
  let parenDepth = 0;
  let inKey = true;

  // Check if formatted as key = value, ...
  const hasEquals = str.includes("=");

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (inString) {
      current += ch;
      if (ch === stringChar && str[i - 1] !== "\\") {
        inString = false;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      current += ch;
      continue;
    }

    if (ch === "[" || ch === "{") {
      bracketDepth++;
      current += ch;
      continue;
    }
    if (ch === "]" || ch === "}") {
      bracketDepth = Math.max(0, bracketDepth - 1);
      current += ch;
      continue;
    }
    if (ch === "(") {
      parenDepth++;
      current += ch;
      continue;
    }
    if (ch === ")") {
      parenDepth = Math.max(0, parenDepth - 1);
      current += ch;
      continue;
    }

    if (hasEquals && inKey && ch === "=") {
      inKey = false;
      current = ""; // Reset variable name, now capture value
      continue;
    }

    if (ch === "," && bracketDepth === 0 && parenDepth === 0) {
      if (current.trim()) {
        args.push(current.trim());
      }
      current = "";
      inKey = hasEquals;
      continue;
    }

    current += ch;
  }

  if (current.trim()) {
    args.push(current.trim());
  }

  return args;
}

/**
 * Safe LeetCode Function-Style Test Harness Generator
 * Wraps class Solution / methods into self-contained executable drivers.
 */
function buildExecutableHarness({ code, language, problem, testCases }) {
  const lang = normalizeExecutionLanguage(language);
  const cleanCode = (code || "").trim();
  const methodName = problem?.methodName?.[lang] || problem?.methodName?.python3 || "solve";

  // If code already contains an entry point (e.g. main() or standalone execution), do not double-wrap
  if (lang === "python3" || lang === "python") {
    if (cleanCode.includes('if __name__ == "__main__":') || cleanCode.includes("if __name__ == '__main__':")) {
      return { wrappedCode: cleanCode, harnessType: "standalone" };
    }

    const testInvocations = testCases.map(tc => {
      const args = parseInputArguments(tc.input);
      const argsStr = args.length ? args.join(", ") : "";
      return `    try:
        sol = Solution()
        res = sol.${methodName}(${argsStr})
        print(f"${TEST_DELIM_PREFIX}${tc.id}__:{json.dumps(res)}")
    except Exception as e:
        print(f"${TEST_DELIM_PREFIX}${tc.id}__:ERROR:{type(e).__name__}: {str(e)}")`;
    }).join("\n");

    const wrappedCode = `import sys, json, math
from typing import List, Optional, Dict, Set, Tuple

${cleanCode}

def __run_dsa_harness():
${testInvocations || `    print("${TEST_DELIM_PREFIX}empty__:null")`}

if __name__ == "__main__":
    __run_dsa_harness()
`;
    return { wrappedCode, harnessType: "leetcode_function" };
  }

  if (lang === "javascript" || lang === "typescript") {
    if (cleanCode.includes("console.log(") && !cleanCode.includes("class Solution") && !cleanCode.includes("var " + methodName)) {
      // Standalone script
      return { wrappedCode: cleanCode, harnessType: "standalone" };
    }

    const testInvocations = testCases.map(tc => {
      const args = parseInputArguments(tc.input);
      const argsStr = args.length ? args.join(", ") : "";
      return `  try {
    let sol = typeof Solution === "function" ? new Solution() : (typeof ${methodName} === "function" ? { ${methodName} } : null);
    let fn = sol ? sol.${methodName}.bind(sol) : (typeof ${methodName} === "function" ? ${methodName} : null);
    if (!fn) throw new Error("Method '${methodName}' not found in solution");
    let res = fn(${argsStr});
    console.log("${TEST_DELIM_PREFIX}${tc.id}__:" + JSON.stringify(res));
  } catch (err) {
    console.log("${TEST_DELIM_PREFIX}${tc.id}__:ERROR:" + err.name + ": " + err.message);
  }`;
    }).join("\n");

    const wrappedCode = `
${cleanCode}

function __run_dsa_harness() {
${testInvocations || `  console.log("${TEST_DELIM_PREFIX}empty__:null");`}
}

__run_dsa_harness();
`;
    return { wrappedCode, harnessType: "leetcode_function" };
  }

  if (lang === "java") {
    if (cleanCode.includes("public static void main(")) {
      return { wrappedCode: cleanCode, harnessType: "standalone" };
    }

    // Java type formatting helper for harness
    const testInvocations = testCases.map(tc => {
      const rawArgs = parseInputArguments(tc.input);
      const formattedArgs = rawArgs.map(arg => {
        // Convert [1,2,3] to new int[]{1, 2, 3}
        if (arg.startsWith("[") && arg.endsWith("]")) {
          if (arg.includes('"') || arg.includes("'")) {
            return `new String[]${arg.replace(/'/g, '"')}`;
          }
          return `new int[]${arg}`;
        }
        return arg;
      }).join(", ");

      return `        try {
            Solution sol = new Solution();
            Object res = sol.${methodName}(${formattedArgs});
            System.out.println("${TEST_DELIM_PREFIX}${tc.id}__:" + String.valueOf(res));
        } catch (Exception e) {
            System.out.println("${TEST_DELIM_PREFIX}${tc.id}__:ERROR:" + e.getClass().getSimpleName() + ": " + e.getMessage());
        }`;
    }).join("\n");

    const wrappedCode = `import java.util.*;
import java.io.*;

${cleanCode}

public class Main {
    public static void main(String[] args) {
${testInvocations || `        System.out.println("${TEST_DELIM_PREFIX}empty__:null");`}
    }
}
`;
    return { wrappedCode, harnessType: "leetcode_function" };
  }

  if (lang === "cpp") {
    if (cleanCode.includes("int main(") || cleanCode.includes("int main ()")) {
      return { wrappedCode: cleanCode, harnessType: "standalone" };
    }

    const testInvocations = testCases.map(tc => {
      const rawArgs = parseInputArguments(tc.input);
      const formattedArgs = rawArgs.map(arg => {
        if (arg.startsWith("[") && arg.endsWith("]")) {
          return "{" + arg.slice(1, -1) + "}";
        }
        return arg;
      }).join(", ");

      return `    try {
        Solution sol;
        auto res = sol.${methodName}(${formattedArgs});
        cout << "${TEST_DELIM_PREFIX}${tc.id}__:" << boolalpha << res << endl;
    } catch (const exception& e) {
        cout << "${TEST_DELIM_PREFIX}${tc.id}__:ERROR:" << e.what() << endl;
    }`;
    }).join("\n");

    const wrappedCode = `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <stack>
#include <cmath>

using namespace std;

${cleanCode}

int main() {
${testInvocations || `    cout << "${TEST_DELIM_PREFIX}empty__:null" << endl;`}
    return 0;
}
`;
    return { wrappedCode, harnessType: "leetcode_function" };
  }

  // Fallback for languages without structured LeetCode harness
  return { wrappedCode: cleanCode, harnessType: "raw" };
}

/**
 * =========================================================================
 * EXECUTION PROVIDER INTERFACES & IMPLEMENTATIONS
 * =========================================================================
 */

/**
 * 1. Mock Execution Provider
 * For deterministic automated testing without external network or compiler dependencies.
 */
class MockExecutionProvider {
  constructor(options = {}) {
    this.name = "mock";
    this.options = options;
  }

  async execute({ sourceCode, language, testCases }) {
    if (this.options.forceProviderError) {
      const err = new Error(this.options.forceProviderError);
      err.code = "EXECUTION_PROVIDER_UNAVAILABLE";
      err.status = 503;
      throw err;
    }

    if (this.options.forceCompileError) {
      return {
        status: "compilation_error",
        stdout: "",
        stderr: "SyntaxError: Unexpected token ';' on line 12",
        compileOutput: "Compilation failed: 1 error encountered.",
        executionTimeMs: 15,
        memoryKb: 12000,
        exitCode: 1
      };
    }

    if (this.options.forceTimeout) {
      return {
        status: "time_limit_exceeded",
        stdout: "",
        stderr: "Execution timed out after 4000ms. Possible infinite loop.",
        compileOutput: null,
        executionTimeMs: 4000,
        memoryKb: 34000,
        exitCode: 124
      };
    }

    if (this.options.forceRuntimeError) {
      return {
        status: "runtime_error",
        stdout: "",
        stderr: "IndexOutOfBoundsException: Index 5 out of bounds for length 3",
        compileOutput: null,
        executionTimeMs: 12,
        memoryKb: 28000,
        exitCode: 1
      };
    }

    // Default mock behavior: simulate execution of testCases
    const stdoutLines = [];
    for (const tc of testCases) {
      if (this.options.failTestCaseId === tc.id) {
        // Output mismatched result
        const fakeFail = tc.expectedOutput === "true" ? "false" : "42";
        stdoutLines.push(`${TEST_DELIM_PREFIX}${tc.id}__:${fakeFail}`);
      } else {
        stdoutLines.push(`${TEST_DELIM_PREFIX}${tc.id}__:${tc.expectedOutput || "null"}`);
      }
    }

    return {
      status: "completed",
      stdout: stdoutLines.join("\n"),
      stderr: "",
      compileOutput: null,
      executionTimeMs: 18,
      memoryKb: 24500,
      exitCode: 0
    };
  }
}

/**
 * 2. Sandboxed Process Execution Provider (Secure Local Isolated Runner)
 * Strictly purges environment variables (no GEMINI_API_KEY, MONGODB_URI, Firebase keys)
 */
class SandboxedProcessExecutionProvider {
  constructor(options = {}) {
    this.name = "process_sandbox";
    this.timeoutMs = options.timeoutMs || LIMITS.DEFAULT_TIMEOUT_MS;
  }

  async execute({ wrappedCode, language }) {
    const lang = normalizeExecutionLanguage(language);

    // Check if host supports runtime
    if (lang !== "python3" && lang !== "python" && lang !== "javascript" && lang !== "typescript") {
      return {
        status: "unsupported",
        stdout: "",
        stderr: `Local sandboxed execution for language '${lang}' is not configured in this environment.`,
        compileOutput: null,
        executionTimeMs: 0,
        memoryKb: null,
        exitCode: 1
      };
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dsa-exec-"));
    const startTime = Date.now();

    // STRICT SANITIZATION: Environment variable purging
    const sanitizedEnv = {
      PATH: process.env.PATH || "",
      SYSTEMROOT: process.env.SYSTEMROOT || "",
      TEMP: tempDir,
      TMP: tempDir
    };

    try {
      if (lang === "python3" || lang === "python") {
        const filePath = path.join(tempDir, "solution.py");
        fs.writeFileSync(filePath, wrappedCode, "utf8");

        return await new Promise(resolve => {
          const proc = spawn("python", [filePath], {
            timeout: this.timeoutMs,
            env: sanitizedEnv, // Zero access to DSAverse application secrets
            stdio: ["ignore", "pipe", "pipe"],
            windowsHide: true
          });

          let stdout = "";
          let stderr = "";

          proc.stdout.on("data", d => {
            if (stdout.length < LIMITS.MAX_OUTPUT_BYTES) stdout += d;
          });
          proc.stderr.on("data", d => {
            if (stderr.length < LIMITS.MAX_OUTPUT_BYTES) stderr += d;
          });

          proc.on("close", (code, signal) => {
            const executionTimeMs = Date.now() - startTime;
            if (signal === "SIGTERM" || signal === "SIGKILL" || executionTimeMs >= this.timeoutMs) {
              return resolve({
                status: "time_limit_exceeded",
                stdout,
                stderr: "Execution timed out (Time Limit Exceeded).",
                executionTimeMs,
                memoryKb: null,
                exitCode: 124
              });
            }

            if (code !== 0 && !stdout.includes(TEST_DELIM_PREFIX)) {
              const isSyntax = stderr.includes("SyntaxError") || stderr.includes("IndentationError");
              return resolve({
                status: isSyntax ? "compilation_error" : "runtime_error",
                stdout,
                stderr,
                executionTimeMs,
                memoryKb: null,
                exitCode: code || 1
              });
            }

            resolve({
              status: "completed",
              stdout,
              stderr,
              executionTimeMs,
              memoryKb: null,
              exitCode: code || 0
            });
          });

          proc.on("error", err => {
            resolve({
              status: "unavailable",
              stdout: "",
              stderr: `Subprocess error: ${err.message}`,
              executionTimeMs: Date.now() - startTime,
              memoryKb: null,
              exitCode: 1
            });
          });
        });
      }

      if (lang === "javascript" || lang === "typescript") {
        const filePath = path.join(tempDir, "solution.js");
        fs.writeFileSync(filePath, wrappedCode, "utf8");

        return await new Promise(resolve => {
          const proc = spawn(process.execPath, ["--max-old-space-size=128", filePath], {
            timeout: this.timeoutMs,
            env: sanitizedEnv,
            stdio: ["ignore", "pipe", "pipe"],
            windowsHide: true
          });

          let stdout = "";
          let stderr = "";

          proc.stdout.on("data", d => {
            if (stdout.length < LIMITS.MAX_OUTPUT_BYTES) stdout += d;
          });
          proc.stderr.on("data", d => {
            if (stderr.length < LIMITS.MAX_OUTPUT_BYTES) stderr += d;
          });

          proc.on("close", (code, signal) => {
            const executionTimeMs = Date.now() - startTime;
            if (signal === "SIGTERM" || signal === "SIGKILL" || executionTimeMs >= this.timeoutMs) {
              return resolve({
                status: "time_limit_exceeded",
                stdout,
                stderr: "Execution timed out (Time Limit Exceeded).",
                executionTimeMs,
                memoryKb: null,
                exitCode: 124
              });
            }

            if (code !== 0 && !stdout.includes(TEST_DELIM_PREFIX)) {
              return resolve({
                status: stderr.includes("SyntaxError") ? "compilation_error" : "runtime_error",
                stdout,
                stderr,
                executionTimeMs,
                memoryKb: null,
                exitCode: code || 1
              });
            }

            resolve({
              status: "completed",
              stdout,
              stderr,
              executionTimeMs,
              memoryKb: null,
              exitCode: code || 0
            });
          });

          proc.on("error", err => {
            resolve({
              status: "unavailable",
              stdout: "",
              stderr: `Subprocess error: ${err.message}`,
              executionTimeMs: Date.now() - startTime,
              memoryKb: null,
              exitCode: 1
            });
          });
        });
      }
    } finally {
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
    }
  }
}

/**
 * 3. Judge0 Execution Provider
 * Integrates with standard Judge0 CE / Extra API
 */
class Judge0ExecutionProvider {
  constructor(options = {}) {
    this.name = "judge0";
    this.apiUrl = options.apiUrl || process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
    this.apiKey = options.apiKey || process.env.JUDGE0_API_KEY || null;
    this.authToken = options.authToken || process.env.JUDGE0_AUTH_TOKEN || null;
    this.timeoutMs = options.timeoutMs || LIMITS.DEFAULT_TIMEOUT_MS;
  }

  async execute({ wrappedCode, language }) {
    const lang = normalizeExecutionLanguage(language);
    const languageId = JUDGE0_LANGUAGE_MAP[lang];

    if (!languageId) {
      return {
        status: "unsupported",
        stdout: "",
        stderr: `Language '${language}' is not mapped to a Judge0 language identifier.`,
        compileOutput: null,
        executionTimeMs: 0,
        memoryKb: null,
        exitCode: 1
      };
    }

    if (!this.apiUrl || (!this.apiKey && !this.authToken && this.apiUrl.includes("rapidapi.com"))) {
      return {
        status: "unavailable",
        stdout: "",
        stderr: "Judge0 execution provider is not configured. Provide JUDGE0_API_KEY in server environment.",
        compileOutput: null,
        executionTimeMs: 0,
        memoryKb: null,
        exitCode: 1
      };
    }

    const headers = { "Content-Type": "application/json" };
    if (this.apiKey) {
      headers["X-RapidAPI-Key"] = this.apiKey;
      headers["X-RapidAPI-Host"] = new URL(this.apiUrl).host;
    }
    if (this.authToken) {
      headers["X-Auth-Token"] = this.authToken;
    }

    const payload = {
      source_code: wrappedCode,
      language_id: languageId,
      cpu_time_limit: Math.ceil(this.timeoutMs / 1000),
      memory_limit: LIMITS.DEFAULT_MEMORY_KB
    };

    const submitUrl = `${this.apiUrl.replace(/\/+$/, "")}/submissions?base64_encoded=false&wait=true`;
    const res = await fetch(submitUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        status: "unavailable",
        stdout: "",
        stderr: `Judge0 returned HTTP ${res.status}: ${errText}`,
        compileOutput: null,
        executionTimeMs: 0,
        memoryKb: null,
        exitCode: 1
      };
    }

    const data = await res.json();
    const statusId = data.status?.id; // 3: Accepted, 6: Compilation Error, 5: TLE, etc.
    const stdout = data.stdout || "";
    const stderr = data.stderr || "";
    const compileOutput = data.compile_output || null;
    const timeMs = Math.round(Number(data.time || 0) * 1000);
    const memoryKb = data.memory || null;

    let status = "completed";
    if (statusId === 6) status = "compilation_error";
    else if (statusId === 5) status = "time_limit_exceeded";
    else if (statusId === 7 || statusId === 8 || statusId === 9 || statusId === 10 || statusId === 11 || statusId === 12) status = "runtime_error";
    else if (statusId > 12) status = "failed";

    return {
      status,
      stdout,
      stderr,
      compileOutput,
      executionTimeMs: timeMs,
      memoryKb,
      exitCode: data.exit_code || (status === "completed" ? 0 : 1)
    };
  }
}

/**
 * Provider Factory
 */
function createExecutionProvider(env = process.env, customProvider = null) {
  if (customProvider) return customProvider;
  if (env.CODE_EXECUTION_PROVIDER === "mock") {
    return new MockExecutionProvider();
  }
  if (env.JUDGE0_API_KEY || env.JUDGE0_API_URL) {
    return new Judge0ExecutionProvider({
      apiUrl: env.JUDGE0_API_URL,
      apiKey: env.JUDGE0_API_KEY,
      authToken: env.JUDGE0_AUTH_TOKEN
    });
  }
  // Default to safe isolated local process sandbox
  return new SandboxedProcessExecutionProvider();
}

/**
 * =========================================================================
 * CORE EXECUTION ENGINE ORCHESTRATOR
 * =========================================================================
 */

/**
 * Executes a single code snippet against problem test cases
 */
async function executeCodeSnippet({
  sourceCode,
  language = "python3",
  problem = null,
  customTestCases = [],
  provider = null,
  timeoutMs = LIMITS.DEFAULT_TIMEOUT_MS
}) {
  const cleanSource = (sourceCode || "").trim();
  const lang = normalizeExecutionLanguage(language);
  const nowIso = new Date().toISOString();
  const execId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // 1. Validation checks
  if (!cleanSource) {
    return {
      success: false,
      executionId: execId,
      problemId: problem?.number || null,
      problemSlug: problem?.slug || null,
      language: lang,
      status: "unavailable",
      verificationLevel: "not_run",
      reason: "Source code is empty.",
      testSummary: { total: 0, passed: 0, failed: 0, unverified: 0 },
      results: [],
      errors: ["Source code is empty."],
      resourceUsage: { executionTimeMs: 0, memoryKb: null },
      verifiedAt: nowIso
    };
  }

  if (cleanSource.length > LIMITS.MAX_SOURCE_BYTES) {
    return {
      success: false,
      executionId: execId,
      problemId: problem?.number || null,
      problemSlug: problem?.slug || null,
      language: lang,
      status: "failed",
      verificationLevel: "not_run",
      reason: `Source code exceeds allowable limit of ${LIMITS.MAX_SOURCE_BYTES / 1024} KB.`,
      testSummary: { total: 0, passed: 0, failed: 0, unverified: 0 },
      results: [],
      errors: ["Payload size limit exceeded."],
      resourceUsage: { executionTimeMs: 0, memoryKb: null },
      verifiedAt: nowIso
    };
  }

  // 2. Extract test cases
  const testCases = extractProblemTestCases(problem, customTestCases);
  if (!testCases.length) {
    return {
      success: true,
      executionId: execId,
      problemId: problem?.number || null,
      problemSlug: problem?.slug || null,
      language: lang,
      status: "completed",
      verificationLevel: "execution_only",
      reason: "No problem examples or test cases available. Verification cannot be confirmed.",
      testSummary: { total: 0, passed: 0, failed: 0, unverified: 0 },
      results: [],
      errors: [],
      resourceUsage: { executionTimeMs: 0, memoryKb: null },
      verifiedAt: nowIso
    };
  }

  // 3. Build executable LeetCode harness
  const { wrappedCode, harnessType } = buildExecutableHarness({
    code: cleanSource,
    language: lang,
    problem,
    testCases
  });

  // 4. Execute via provider
  const execProvider = provider || createExecutionProvider();
  let rawExec;
  try {
    rawExec = await execProvider.execute({
      wrappedCode,
      sourceCode: cleanSource,
      language: lang,
      testCases,
      timeoutMs: Math.min(timeoutMs, LIMITS.MAX_TIMEOUT_MS)
    });
  } catch (err) {
    return {
      success: false,
      executionId: execId,
      problemId: problem?.number || null,
      problemSlug: problem?.slug || null,
      language: lang,
      status: "unavailable",
      verificationLevel: "not_run",
      reason: `Execution provider failed: ${err.message}`,
      testSummary: { total: testCases.length, passed: 0, failed: 0, unverified: testCases.length },
      results: [],
      errors: [err.message],
      resourceUsage: { executionTimeMs: 0, memoryKb: null },
      verifiedAt: nowIso
    };
  }

  // 5. Handle compilation / runtime error or timeout
  if (rawExec.status === "compilation_error" || rawExec.status === "time_limit_exceeded" || rawExec.status === "runtime_error" || rawExec.status === "unsupported") {
    return {
      success: true,
      executionId: execId,
      problemId: problem?.number || null,
      problemSlug: problem?.slug || null,
      language: lang,
      status: rawExec.status,
      verificationLevel: "failed",
      harnessType,
      testSummary: { total: testCases.length, passed: 0, failed: testCases.length, unverified: 0 },
      results: testCases.map(tc => ({
        testCaseId: tc.id,
        status: rawExec.status,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: null,
        error: rawExec.stderr || rawExec.compileOutput || rawExec.status
      })),
      errors: [rawExec.stderr || rawExec.compileOutput || rawExec.status].filter(Boolean),
      resourceUsage: {
        executionTimeMs: rawExec.executionTimeMs || 0,
        memoryKb: rawExec.memoryKb || null
      },
      verifiedAt: nowIso
    };
  }

  // 6. Parse structured test delimiter outputs from stdout
  const parsedResultsMap = new Map();
  const stdout = rawExec.stdout || "";
  const lines = stdout.split(/\r?\n/);

  for (const line of lines) {
    if (line.includes(TEST_DELIM_PREFIX)) {
      const idx = line.indexOf(TEST_DELIM_PREFIX);
      const content = line.substring(idx + TEST_DELIM_PREFIX.length);
      const sepIdx = content.indexOf("__:");
      if (sepIdx !== -1) {
        const tcId = content.substring(0, sepIdx);
        const actualVal = content.substring(sepIdx + 3);
        parsedResultsMap.set(tcId, actualVal);
      }
    }
  }

  let passedCount = 0;
  let failedCount = 0;
  let unverifiedCount = 0;

  const testResults = testCases.map(tc => {
    const rawActual = parsedResultsMap.get(tc.id);
    if (rawActual === undefined) {
      // Test case output was not emitted
      failedCount++;
      return {
        testCaseId: tc.id,
        status: "failed",
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: null,
        isExample: tc.isExample,
        isCustom: tc.isCustom,
        error: "No output produced for test case"
      };
    }

    if (rawActual.startsWith("ERROR:")) {
      failedCount++;
      return {
        testCaseId: tc.id,
        status: "runtime_error",
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: null,
        isExample: tc.isExample,
        isCustom: tc.isCustom,
        error: rawActual.substring(6)
      };
    }

    const comp = compareOutputs(rawActual, tc.expectedOutput);
    if (comp.status === "passed") {
      passedCount++;
    } else if (comp.status === "failed") {
      failedCount++;
    } else {
      unverifiedCount++;
    }

    return {
      testCaseId: tc.id,
      status: comp.status,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      actualOutput: rawActual,
      isExample: tc.isExample,
      isCustom: tc.isCustom,
      executionTimeMs: Math.round(rawExec.executionTimeMs / Math.max(1, testCases.length))
    };
  });

  const overallStatus = failedCount > 0 ? "failed" : (passedCount === testCases.length ? "passed" : "execution_only");
  const verificationLevel = unverifiedCount > 0 ? "execution_only" : (failedCount === 0 ? "verified" : "failed");

  return {
    success: true,
    executionId: execId,
    problemId: problem?.number || null,
    problemSlug: problem?.slug || null,
    language: lang,
    status: overallStatus,
    verificationLevel,
    harnessType,
    testSummary: {
      total: testCases.length,
      passed: passedCount,
      failed: failedCount,
      unverified: unverifiedCount
    },
    results: testResults,
    errors: rawExec.stderr ? [rawExec.stderr] : [],
    resourceUsage: {
      executionTimeMs: rawExec.executionTimeMs || 0,
      memoryKb: rawExec.memoryKb || null
    },
    verifiedAt: nowIso
  };
}

/**
 * Verifies all available solution tiers (Optimal, Brute Force, Improved, and Student Submission)
 */
async function verifyAllSolutions({
  solutions = {},
  studentCode = null,
  submissionVerdict = null,
  language = "python3",
  problem = null,
  customTestCases = [],
  provider = null
}) {
  const lang = normalizeExecutionLanguage(language);
  const nowIso = new Date().toISOString();
  const tiersToVerify = [];

  // Optimal Tier
  if (solutions.optimal?.code && solutions.optimal?.available !== false) {
    tiersToVerify.push({
      tier: "optimal",
      code: solutions.optimal.code
    });
  }

  // Brute Force Tier
  if (solutions.bruteForce?.code && solutions.bruteForce?.available !== false) {
    tiersToVerify.push({
      tier: "bruteForce",
      code: solutions.bruteForce.code
    });
  }

  // Improved Tier
  if (solutions.improved?.code && solutions.improved?.available !== false) {
    tiersToVerify.push({
      tier: "improved",
      code: solutions.improved.code
    });
  }

  // Student Submission
  const hasStudentCode = Boolean(studentCode && studentCode.trim() && !studentCode.includes("unavailable"));
  if (hasStudentCode) {
    tiersToVerify.push({
      tier: "studentSubmission",
      code: studentCode.trim()
    });
  }

  const resultsByTier = {};

  // Execute with bounded concurrency (2 parallel max)
  const CONCURRENCY = 2;
  for (let i = 0; i < tiersToVerify.length; i += CONCURRENCY) {
    const chunk = tiersToVerify.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(async item => {
      const execResult = await executeCodeSnippet({
        sourceCode: item.code,
        language: lang,
        problem,
        customTestCases,
        provider
      });
      resultsByTier[item.tier] = {
        tier: item.tier,
        status: execResult.status,
        verificationLevel: execResult.verificationLevel,
        testSummary: execResult.testSummary,
        resourceUsage: execResult.resourceUsage,
        results: execResult.results,
        errors: execResult.errors
      };
    }));
  }

  // If student submission was not provided, set honest not_run status
  if (!resultsByTier.studentSubmission) {
    resultsByTier.studentSubmission = {
      tier: "studentSubmission",
      status: "not_run",
      verificationLevel: "not_run",
      reason: "No student source code implementation supplied or imported.",
      officialVerdict: submissionVerdict || null,
      testSummary: { total: 0, passed: 0, failed: 0, unverified: 0 },
      results: []
    };
  } else if (submissionVerdict) {
    resultsByTier.studentSubmission.officialVerdict = submissionVerdict;
  }

  return {
    success: true,
    problemSlug: problem?.slug || null,
    problemNumber: problem?.number || null,
    problemTitle: problem?.title || null,
    language: lang,
    verifiedAt: nowIso,
    solutions: resultsByTier
  };
}

module.exports = {
  SUPPORTED_LANGUAGES,
  JUDGE0_LANGUAGE_MAP,
  LIMITS,
  TEST_DELIM_PREFIX,
  normalizeExecutionLanguage,
  normalizeOutput,
  compareOutputs,
  extractProblemTestCases,
  parseInputArguments,
  buildExecutableHarness,
  MockExecutionProvider,
  SandboxedProcessExecutionProvider,
  Judge0ExecutionProvider,
  createExecutionProvider,
  executeCodeSnippet,
  verifyAllSolutions
};
