"use strict";
require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");
const { UNIVERSAL_ANALYSIS_SCHEMA } = require("../ai-code-mentor-provider");

(async () => {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3.1-flash-lite";

  const prompt = "You are DSAverse AI Code Mentor. Return analysis for Two Sum in python3. Respond ONLY with valid JSON conforming to the schema.";

  async function generateWithRetry(maxRetries = 3) {
    let attempt = 0;
    while (attempt <= maxRetries) {
      attempt++;
      const t0 = Date.now();
      try {
        console.log(`Attempt ${attempt}...`);
        const result = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: UNIVERSAL_ANALYSIS_SCHEMA,
            temperature: 0.2
          }
        });
        console.log(`SUCCESS on attempt ${attempt} in ${Date.now() - t0}ms!`);
        return result;
      } catch (err) {
        console.log(`Attempt ${attempt} FAILED in ${Date.now() - t0}ms: status=${err.status || err.code}, msg=${err.message?.slice(0, 100)}`);
        const isTransient = err.status === 503 || err.status === 429 || /high demand|RESOURCE_EXHAUSTED|UNAVAILABLE/i.test(err.message);
        if (!isTransient || attempt > maxRetries) throw err;
        const backoff = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 500, 5000);
        console.log(`Waiting ${Math.round(backoff)}ms before retry...`);
        await new Promise(r => setTimeout(r, backoff));
      }
    }
  }

  try {
    const res = await generateWithRetry(3);
    console.log("Result text length:", res.text?.length);
    const json = JSON.parse(res.text);
    console.log("Optimal code preview:", json.optimalCode?.slice(0, 80));
    console.log("Optimal complexity:", json.optimalComplexity);
  } catch (finalErr) {
    console.error("All retries failed:", finalErr.message);
  }
})();
