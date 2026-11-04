"use strict";
const fs = require("node:fs");
const path = require("node:path");

const testFile = path.resolve(__dirname, "..", "test", "ai-code-mentor-phase2.test.js");
let content = fs.readFileSync(testFile, "utf8");

// Remove broken appended test
const idx = content.indexOf('test("17.');
if (idx !== -1) {
  content = content.substring(0, idx).trimEnd() + "\n";
}

const extraTests = [
  'test("17. Educational data supports all 7 programming languages for optimal solutions", () => {',
  '  const scriptContent = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");',
  '  const languages = ["java", "python3", "cpp", "javascript", "typescript", "go", "rust"];',
  '  for (const lang of languages) {',
  '    assert.match(scriptContent, new RegExp(lang + ":\\\\s*`"), "Missing optimal solution definition for language " + lang);',
  '  }',
  '});',
  '',
  'test("18. Accepted submissions do not show false bug warnings in frontend analysis logic", () => {',
  '  const scriptContent = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");',
  '  assert.match(scriptContent, /isAccepted/, "Analysis logic must explicitly test isAccepted");',
  '  assert.match(scriptContent, /mistakeAlertEl\\.hidden = true/, "Mistake alert must be hidden for Accepted submissions");',
  '  assert.match(scriptContent, /mentorAcceptedAlert/, "Accepted affirmation card must be handled");',
  '});',
  '',
  'test("19. Progressive hint and interactive dry run structures exist with step progression", () => {',
  '  const scriptContent = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");',
  '  assert.match(scriptContent, /hints:\\s*\\[/, "Educational data must provide progressive hints");',
  '  assert.match(scriptContent, /dryRun:\\s*\\{/, "Educational data must provide dry run trace headers and rows");',
  '  assert.match(scriptContent, /mentorNextHintBtn/, "Interactive Next Hint button listener must be hooked");',
  '});',
  '',
  'test("20. Web Audio API synthesizer is defined with muted default and audio controls", () => {',
  '  const scriptContent = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");',
  '  assert.match(scriptContent, /class WebAudioSynthesizer/, "WebAudioSynthesizer must be implemented");',
  '  assert.match(scriptContent, /this\\.muted = true/, "Audio synthesizer must be muted by default");',
  '  assert.match(scriptContent, /animaticSoundToggle/, "Sound toggle control must be bound");',
  '  assert.match(scriptContent, /animaticVolumeSlider/, "Volume slider control must be bound");',
  '});'
].join("\n");

content = content + "\n" + extraTests;
fs.writeFileSync(testFile, content, "utf8");
console.log("Appended tests 17-20 successfully.");
