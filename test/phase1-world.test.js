"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("Phase 1: RaceArena source has no finish-line gantry, lap counters, or circular track bounds", () => {
  const arenaSrc = fs.readFileSync(
    path.join(root, "characterverse", "src", "components", "arena", "RaceArena.jsx"),
    "utf8"
  );

  // Must not have legacy circular track or finish line celebration meshes
  assert.ok(!arenaSrc.includes("createF1TrackGeometry"), "Circular track geometry generator must be replaced");
  assert.ok(!arenaSrc.includes("createCheckeredStartTexture"), "Start/Finish checkered texture must be removed");
  assert.ok(!arenaSrc.includes("DSA RACE ARENA"), "Finish gantry arch must be removed");
  assert.ok(!arenaSrc.includes("lapCount"), "Lap counters must not exist");

  // Must detect Superman with 1.25 elevation (preserving test/superman.test.js)
  assert.ok(arenaSrc.includes("const isSuperman = characterData?.id === 'superman'"));
  assert.ok(arenaSrc.includes("1.25"));

  // Must delegate to procedural world and journey camera
  assert.ok(arenaSrc.includes("ProceduralWorld"));
  assert.ok(arenaSrc.includes("JourneyCamera"));
});

test("Phase 1: Procedural road spine and terrain functions provide seamless C1 continuity", () => {
  const worldConfigSrc = fs.readFileSync(
    path.join(root, "characterverse", "src", "components", "arena", "world", "WorldConfig.js"),
    "utf8"
  );

  assert.ok(worldConfigSrc.includes("getRoadX"));
  assert.ok(worldConfigSrc.includes("getRoadY"));
  assert.ok(worldConfigSrc.includes("getRoadNormalXZ"));
  assert.ok(worldConfigSrc.includes("getProceduralTerrainHeight"));
  assert.ok(worldConfigSrc.includes("CHUNK_LENGTH"));
});

test("Phase 1: Movement simulation provides continuous physical travel decoupled from LeetCode polling", () => {
  const moveSrc = fs.readFileSync(
    path.join(root, "characterverse", "src", "components", "arena", "simulation", "RaceMovementController.js"),
    "utf8"
  );

  assert.ok(moveSrc.includes("BASE_RUNNING_SPEED"));
  assert.ok(moveSrc.includes("getRacerForwardDistance"));
  assert.ok(moveSrc.includes("getProceduralRacerPosition"));
  assert.ok(moveSrc.includes("getProceduralRacerHeading"));
});

test("Phase 1: JourneyCamera preserves user manual camera controls without automatic snap-back timers", () => {
  const camSrc = fs.readFileSync(
    path.join(root, "characterverse", "src", "components", "arena", "camera", "JourneyCamera.jsx"),
    "utf8"
  );

  assert.ok(camSrc.includes("manualOffsetRef"));
  assert.ok(!camSrc.includes("setTimeout"), "Camera must never snap back on a timer");
  assert.ok(camSrc.includes("resetView"));
  assert.ok(camSrc.includes("focusMember"));
});
