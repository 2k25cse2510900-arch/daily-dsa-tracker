"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  calculateTargetMilestone,
  calculateProgress,
  buildRacerPayload,
  buildRaceArenaState
} = require("../arena-race");

test("calculateTargetMilestone handles empty, zero, and active member pools", () => {
  assert.equal(calculateTargetMilestone([]), 100);
  assert.equal(calculateTargetMilestone([0, 0, 0]), 100);
  // Leader has 553, 553 * 1.15 = 635.95 -> rounded up to nearest 50 = 650
  assert.equal(calculateTargetMilestone([553, 446, 327]), 650);
});
test("calculateProgress produces normalized, deterministic values in [0, 1]", () => {
  assert.equal(calculateProgress(0, 500), 0);
  assert.equal(calculateProgress(-10, 500), 0);
  assert.equal(calculateProgress(250, 500), 0.5);
  assert.equal(calculateProgress(500, 500), 1.0);
  assert.equal(calculateProgress(600, 500), 1.0); // clamped at 1.0
});

test("more verified solved questions strictly correspond to greater progress", () => {
  const target = 650;
  const p1 = calculateProgress(28, target);
  const p2 = calculateProgress(58, target);
  const p3 = calculateProgress(446, target);
  const p4 = calculateProgress(553, target);

  assert.ok(p1 < p2);
  assert.ok(p2 < p3);
  assert.ok(p3 < p4);
});

test("equal solved question counts produce strictly equal progress and ranks", () => {
  const members = [
    { id: "m1", name: "Alice" },
    { id: "m2", name: "Bob" },
    { id: "m3", name: "Charlie" }
  ];
  const leetCodeMap = new Map([
    ["m1", { status: "Success", stats: { total: 200 } }],
    ["m2", { status: "Success", stats: { total: 200 } }],
    ["m3", { status: "Success", stats: { total: 100 } }]
  ]);

  const state = buildRaceArenaState(members, leetCodeMap, new Map());
  const alice = state.racers.find(r => r.id === "m1");
  const bob = state.racers.find(r => r.id === "m2");
  const charlie = state.racers.find(r => r.id === "m3");

  assert.equal(alice.progress, bob.progress);
  assert.equal(alice.rank, 1);
  assert.equal(bob.rank, 1);
  assert.equal(charlie.rank, 3);
  assert.ok(charlie.progress < alice.progress);
});

test("coins, outfits, vehicles, and cosmetics cannot influence race progress or ranks", () => {
  const memberRich = { id: "m-rich", name: "Rich Player" };
  const memberModest = { id: "m-modest", name: "Modest Player" };

  const cvRich = {
    wallet: { coins: 99999 },
    inventory: { vehicles: ["vehicle-rocket"], outfits: ["outfit-royal"] },
    appearance: {
      equippedCharacterId: "nebula-nova",
      equippedOutfits: { "nebula-nova": "outfit-royal" },
      equippedVehicleId: "vehicle-rocket"
    }
  };

  const cvModest = {
    wallet: { coins: 0 },
    inventory: { vehicles: [], outfits: ["outfit-default"] },
    appearance: {
      equippedCharacterId: "buster-blitz",
      equippedOutfits: { "buster-blitz": "outfit-default" },
      equippedVehicleId: null
    }
  };

  // Both have the exact same LeetCode total solved
  const leetCodeMap = new Map([
    ["m-rich", { status: "Success", stats: { total: 150 } }],
    ["m-modest", { status: "Success", stats: { total: 150 } }]
  ]);
  const cvMap = new Map([
    ["m-rich", cvRich],
    ["m-modest", cvModest]
  ]);

  const state = buildRaceArenaState([memberRich, memberModest], leetCodeMap, cvMap);
  const racerRich = state.racers.find(r => r.id === "m-rich");
  const racerModest = state.racers.find(r => r.id === "m-modest");

  assert.equal(racerRich.progress, racerModest.progress);
  assert.equal(racerRich.rank, racerModest.rank);
  // But each character's appearance and vehicle remain isolated and correct
  assert.equal(racerRich.character.equippedVehicleId, "vehicle-rocket");
  assert.equal(racerRich.character.outfitId, "outfit-royal");
  assert.equal(racerModest.character.equippedVehicleId, null);
  assert.equal(racerModest.character.outfitId, "outfit-default");
});

test("missing or unavailable LeetCode profiles safely default to 0 solved and starting grid", () => {
  const members = [{ id: "m-new", name: "New Member" }];
  const state = buildRaceArenaState(members, new Map(), new Map());
  assert.equal(state.racers[0].solvedCount, 0);
  assert.equal(state.racers[0].progress, 0);
  assert.equal(state.racers[0].character.characterId, "buster-blitz");
  assert.equal(state.racers[0].character.outfitId, "outfit-default");
});
