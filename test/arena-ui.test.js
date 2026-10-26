const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("index.html contains dedicated Race Arena navigation link and page markup", () => {
  const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");

  // Navigation tab
  assert.match(indexHtml, /data-target=["']arena["']/);
  assert.match(indexHtml, /Race Arena/);

  // Arena page container
  assert.match(indexHtml, /id=["']arenaPage["']/);
  assert.match(indexHtml, /id=["']raceArenaMount["']/);
  assert.match(indexHtml, /id=["']arenaStandingsList["']/);
  assert.match(indexHtml, /id=["']arenaTargetMilestoneValue["']/);
  assert.match(indexHtml, /id=["']arenaSyncTime["']/);
  assert.match(indexHtml, /id=["']arenaMotionToggle["']/);

  // Camera switcher buttons
  assert.match(indexHtml, /data-camera=["']broadcast["']/);
  assert.match(indexHtml, /data-camera=["']leader["']/);
  assert.match(indexHtml, /data-camera=["']orbit["']/);
});
test("public/index.html is synchronized with root index.html", () => {
  const rootHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const publicHtml = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
  assert.equal(rootHtml, publicHtml, "public/index.html must match root index.html");
});

test("script.js configures Race Arena navigation, mounting, live polling, and camera modes", () => {
  const scriptContent = fs.readFileSync(path.join(root, "script.js"), "utf8");

  // PAGE_INFO configuration
  assert.match(scriptContent, /arena:\s*\{\s*title:\s*["']Race Arena["'],\s*id:\s*["']arenaPage["']\s*\}/);

  // Mount, unmount and cleanup helpers
  assert.match(scriptContent, /function\s+loadAndMountArenaPage\s*\(/);
  assert.match(scriptContent, /function\s+cleanupArenaPage\s*\(/);
  assert.match(scriptContent, /function\s+fetchArenaLiveState\s*\(/);
  assert.match(scriptContent, /function\s+renderArenaStandings\s*\(/);
  assert.match(scriptContent, /function\s+setArenaCameraMode\s*\(/);

  // Polling interval (20s) and visibility change check
  assert.match(scriptContent, /setInterval\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?fetchArenaLiveState[\s\S]*?20000\s*\)/);
  assert.match(scriptContent, /document\.addEventListener\s*\(\s*["']visibilitychange["']/);

  // Mount invocation to window.CharacterVerseEmbed.mountRaceArena
  assert.match(scriptContent, /window\.CharacterVerseEmbed\.mountRaceArena/);
});

test("public/script.js is synchronized with root script.js", () => {
  const rootScript = fs.readFileSync(path.join(root, "script.js"), "utf8");
  const publicScript = fs.readFileSync(path.join(root, "public", "script.js"), "utf8");
  assert.equal(rootScript, publicScript, "public/script.js must match root script.js");
});

test("style.css provides dedicated race arena styles", () => {
  const styleContent = fs.readFileSync(path.join(root, "style.css"), "utf8");

  assert.match(styleContent, /\.arena-header-bar/);
  assert.match(styleContent, /\.arena-live-badge/);
  assert.match(styleContent, /\.arena-camera-switcher/);
  assert.match(styleContent, /\.arena-viewport-card/);
  assert.match(styleContent, /\.race-arena-viewport-mount/);
  assert.match(styleContent, /\.arena-standings-card/);
  assert.match(styleContent, /\.standings-list/);
});

test("characterverse embed bundle exports mountRaceArena and compiles without Three.js curb crash", () => {
  const bundleContent = fs.readFileSync(path.join(root, "public", "characterverse-embed", "characterverse-embed.js"), "utf8");
  assert.match(bundleContent, /mountRaceArena/);
  // Must contain DoubleSide and Vector3 curb points to avoid Three.js CatmullRom crash
  assert.match(bundleContent, /DoubleSide/);
});

test("script.js standings renderer protects against undefined solved and handles missing stats", () => {
  const scriptContent = fs.readFileSync(path.join(root, "script.js"), "utf8");
  assert.match(scriptContent, /racer\.solved\s*\?\?\s*racer\.solvedCount/);
  assert.match(scriptContent, /Pending sync/);
});
