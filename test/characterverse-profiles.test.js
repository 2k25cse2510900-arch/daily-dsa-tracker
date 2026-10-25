"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { STARTER_COINS, starterProfile, validateAppearance } = require("../characterverse-profiles");

test("CharacterVerse starter profile is server-defined and begins with a standing default loadout", () => {
  const profile = starterProfile("member-test", new Date("2026-01-01T00:00:00Z"));
  assert.equal(profile._id, "member-test");
  assert.equal(profile.wallet.coins, STARTER_COINS);
  assert.deepEqual(profile.inventory.vehicles, []);
  assert.equal(profile.appearance.selectedCharacterId, "buster-blitz");
  assert.equal(profile.appearance.equippedCharacterId, "buster-blitz");
  assert.equal(profile.appearance.equippedVehicleId, null);
  assert.equal(profile.appearance.equippedOutfits["buster-blitz"], "outfit-default");
});

test("CharacterVerse appearance validation rejects unowned items and unknown fields", () => {
  const profile = starterProfile("member-test");
  profile.inventory.characters = ["buster-blitz"];
  profile.inventory.cosmetics = [];
  assert.equal(validateAppearance({ selectedCharacterId: "nebula-nova" }, profile), null);
  assert.equal(validateAppearance({ equippedCosmetics: { "buster-blitz": { head: "head-headphones-dj" } } }, profile), null);
  assert.equal(validateAppearance({ wallet: { coins: 999999 } }, profile), null);
});

test("CharacterVerse appearance validation accepts only owned, catalogued appearance data", () => {
  const profile = starterProfile("member-test");
  const appearance = validateAppearance({
    equippedCosmetics: { "buster-blitz": { head: "head-headphones-dj", effect: null } },
    customColors: { "buster-blitz": { baseColor: "#ffffff", accentColor: "#38bdf8", secondaryColor: "#ffffff", glowColor: "#00f0ff" } }
  }, profile);
  assert.equal(appearance.equippedCosmetics["buster-blitz"].head, "head-headphones-dj");
  assert.equal(appearance.customColors["buster-blitz"].glowColor, "#00f0ff");
});
