"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const { buildRaceArenaState } = require("../arena-race");

test("arena race API payload contains authoritative standings and sanitized racer details", () => {
  const members = [
    { id: "member-1", name: "Krish" },
    { id: "member-2", name: "Kartik Kumar" },
    { id: "member-3", name: "Kanika Dwivedi" }
  ];
  const leetCodeMap = new Map([
    ["member-1", { status: "Success", username: "KrishChaddha106", stats: { total: 553, easy: 200, medium: 250, hard: 103 } }],
    ["member-2", { status: "Success", username: "Kartik_kumar_29", stats: { total: 446, easy: 150, medium: 200, hard: 96 } }],
    ["member-3", { status: "Success", username: "Kanika_Dwii", stats: { total: 28, easy: 20, medium: 8, hard: 0 } }]
  ]);
  const cvMap = new Map([
    ["member-1", {
      appearance: {
        equippedCharacterId: "buster-blitz",
        equippedOutfits: { "buster-blitz": "outfit-warrior" },
        equippedVehicleId: "vehicle-bike"
      }
    }],
    ["member-2", {
      appearance: {
        equippedCharacterId: "nebula-nova",
        equippedOutfits: { "nebula-nova": "outfit-royal" },
        equippedVehicleId: "vehicle-car"
      }
    }]
  ]);

  const arena = buildRaceArenaState(members, leetCodeMap, cvMap);

  assert.equal(arena.targetMilestone, 650);
  assert.equal(arena.baseline, 0);
  assert.equal(arena.racers.length, 3);

  // Leader is Krish (553)
  assert.equal(arena.racers[0].id, "member-1");
  assert.equal(arena.racers[0].rank, 1);
  assert.equal(arena.racers[0].solvedCount, 553);
  assert.equal(arena.racers[0].character.outfitId, "outfit-warrior");
  assert.equal(arena.racers[0].character.equippedVehicleId, "vehicle-bike");
  assert.ok(arena.racers[0].progress > 0.8 && arena.racers[0].progress < 1.0);

  // 2nd place is Kartik (446)
  assert.equal(arena.racers[1].id, "member-2");
  assert.equal(arena.racers[1].rank, 2);
  assert.equal(arena.racers[1].solvedCount, 446);
  assert.equal(arena.racers[1].character.outfitId, "outfit-royal");
  assert.equal(arena.racers[1].character.equippedVehicleId, "vehicle-car");
  assert.ok(arena.racers[1].progress < arena.racers[0].progress);

  // 3rd place is Kanika (28)
  assert.equal(arena.racers[2].id, "member-3");
  assert.equal(arena.racers[2].rank, 3);
  assert.equal(arena.racers[2].solvedCount, 28);
  assert.equal(arena.racers[2].character.outfitId, "outfit-default"); // default fallback
  assert.equal(arena.racers[2].character.equippedVehicleId, null);
  assert.ok(arena.racers[2].progress < arena.racers[1].progress);

  // Verify no sensitive tokens or private credentials leak into racer object
  for (const racer of arena.racers) {
    assert.equal(racer.password, undefined);
    assert.equal(racer.email, undefined);
    assert.equal(racer.firebaseUid, undefined);

    // Strict contract assertions to prevent "undefined solved" bug
    assert.notEqual(racer.solved, undefined, `racer.solved must not be undefined for ${racer.name}`);
    assert.notEqual(racer.solvedCount, undefined, `racer.solvedCount must not be undefined for ${racer.name}`);
    assert.equal(racer.solved, racer.solvedCount);
    assert.equal(typeof racer.solved, "number");
    assert.ok(Number.isSafeInteger(racer.solved));

    assert.notEqual(racer.memberId, undefined, `racer.memberId must not be undefined for ${racer.name}`);
    assert.notEqual(racer.id, undefined, `racer.id must not be undefined for ${racer.name}`);
    assert.equal(racer.memberId, racer.id);

    // Guaranteed template rendering check
    const formatted = `${racer.solved} solved`;
    assert.ok(!formatted.includes("undefined"), `Rendered string '${formatted}' must never contain 'undefined'`);
  }
});
test("arena race API gracefully handles missing and unavailable LeetCode profiles without undefined solved", () => {
  const members = [
    { id: "member-a", name: "Racer A" },
    { id: "member-b", name: "Racer B" }
  ];
  const leetCodeMap = new Map([
    ["member-b", { status: "Unavailable", error: "RATE_LIMITED", stats: null }]
  ]);
  const cvMap = new Map();

  const arena = buildRaceArenaState(members, leetCodeMap, cvMap);
  assert.equal(arena.racers.length, 2);

  for (const racer of arena.racers) {
    assert.notEqual(racer.solved, undefined);
    assert.equal(racer.solved, 0);
    assert.equal(racer.solvedAvailable, false);
    assert.equal(racer.progress, 0);

    const formatted = `${racer.solved} solved`;
    assert.equal(formatted, "0 solved");
  }
});
