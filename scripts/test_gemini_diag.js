"use strict";
require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

async function runDiagnostic() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY in environment.");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });

  console.log("=== 1. Listing Available Gemini Models ===");
  const allModels = [];
  try {
    const listRes = await ai.models.list();
    for await (const m of listRes) {
      if (m.name) allModels.push(m.name);
    }
    console.log(`Found ${allModels.length} models total.`);
    const flashAndPro = allModels.filter(m => m.includes("flash") || m.includes("pro") || m.includes("gemini"));
    console.log("Candidate model names available:", flashAndPro);
  } catch (err) {
    console.error("Failed to list models:", err.message);
  }

  console.log("\n=== 2. Testing 3 Candidate Models with Server API Key ===");
  const testCandidates = [
    "gemini-2.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-2.5-pro"
  ];

  const results = [];
  for (const model of testCandidates) {
    const t0 = Date.now();
    try {
      const resp = await ai.models.generateContent({
        model,
        contents: "Respond only with the word: READY"
      });
      const durationMs = Date.now() - t0;
      const text = resp.text ? resp.text.trim() : "";
      console.log(`[PASS] Model: ${model} | Time: ${durationMs}ms | Result: 200 OK | Response: "${text}"`);
      results.push({ model, success: true, durationMs, text });
    } catch (err) {
      const durationMs = Date.now() - t0;
      const status = err.status || err.code || (err.message?.includes("503") ? 503 : (err.message?.includes("404") ? 404 : "ERROR"));
      console.log(`[FAIL] Model: ${model} | Time: ${durationMs}ms | Status: ${status} | Error: ${err.message}`);
      results.push({ model, success: false, durationMs, status, error: err.message });
    }
  }

  // Also test gemini-3.8-flash if others hit 503
  const anySuccess = results.some(r => r.success);
  let workingModel = results.find(r => r.success)?.model;

  if (!anySuccess) {
    console.log("\nTesting fallback candidate: gemini-3.8-flash or gemini-3.5-flash-lite...");
    for (const alt of ["gemini-3.5-flash-lite", "gemini-3.8-flash"]) {
      const t0 = Date.now();
      try {
        const resp = await ai.models.generateContent({
          model: alt,
          contents: "Respond only with the word: READY"
        });
        const durationMs = Date.now() - t0;
        console.log(`[PASS] Model: ${alt} | Time: ${durationMs}ms | Result: 200 OK | Response: "${resp.text?.trim()}"`);
        workingModel = alt;
        break;
      } catch (err) {
        const durationMs = Date.now() - t0;
        const status = err.status || err.code || "ERROR";
        console.log(`[FAIL] Model: ${alt} | Time: ${durationMs}ms | Status: ${status} | Error: ${err.message}`);
      }
    }
  }

  console.log("\n=== 3. Summary of Candidate Diagnostic ===");
  console.log("Working model determined:", workingModel || "NONE (all returned errors)");

  return { workingModel, results };
}

runDiagnostic();
