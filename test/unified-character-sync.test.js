"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  starterProfile,
  validateAppearance,
} = require("../characterverse-profiles");

const {
  buildRacerPayload,
  buildRaceArenaState,
  calculateProgress,
} = require("../arena-race");

const {
  getRacerVehicleConfig,
  getRacerKinematics,
} = require("../characterverse/src/components/arena/simulation/RaceMovementController");

test("Unified Sync: starterProfile initializes with raceMode: 'character'", () => {
  const profile = starterProfile("m-user1");
  assert.equal(profile.appearance.raceMode, "character");
  assert.equal(profile.appearance.equippedVehicleId, null);
  assert.equal(profile.appearance.equippedCharacterId, "buster-blitz");
});

test("Unified Sync: validateAppearance validates and restricts raceMode", () => {
  const profile = starterProfile("m-user2");
  profile.inventory.vehicles = ["vehicle-bike"];
  profile.appearance.equippedVehicleId = "vehicle-bike";

  // Invalid raceMode rejected
  assert.equal(validateAppearance({ raceMode: "invalid-mode" }, profile), null);
  assert.equal(validateAppearance({ raceMode: 123 }, profile), null);

  // Valid character mode
  const appChar = validateAppearance({ raceMode: "character" }, profile);
  assert.equal(appChar.raceMode, "character");

  // Valid vehicle mode when vehicle is owned
  const appVeh = validateAppearance({ raceMode: "vehicle" }, profile);
  assert.equal(appVeh.raceMode, "vehicle");

  // Vehicle mode when NO vehicle is owned falls back to character mode
  const unownedProfile = starterProfile("m-user3");
  unownedProfile.inventory.vehicles = [];
  unownedProfile.appearance.equippedVehicleId = null;

  const appFallback = validateAppearance({ raceMode: "vehicle" }, unownedProfile);
  assert.equal(appFallback.raceMode, "character", "Must fall back to character mode if no vehicle is owned");
});

test("Unified Sync: buildRacerPayload resolves independent characters, appearances, and race modes for all racers", () => {
  // Member 1: Krish equips Superman, Character Mode -> Flies
  const member1 = { id: "m-krish", name: "Krish" };
  const cv1 = {
    inventory: { characters: ["buster-blitz", "superman"], vehicles: [] },
    appearance: {
      equippedCharacterId: "superman",
      raceMode: "character",
      customColors: { superman: { baseColor: "#ffffff", glowColor: "#0b5ed7" } },
      equippedOutfits: { superman: "outfit-default" },
    }
  };

  // Member 2: Kartik equips Bike, Vehicle Mode -> Rides Bike
  const member2 = { id: "m-kartik", name: "Kartik Kumar" };
  const cv2 = {
    inventory: { characters: ["buster-blitz"], vehicles: ["vehicle-bike"] },
    appearance: {
      equippedCharacterId: "buster-blitz",
      equippedVehicleId: "vehicle-bike",
      raceMode: "vehicle",
      customColors: { "buster-blitz": { baseColor: "#38bdf8" } },
      equippedOutfits: { "buster-blitz": "outfit-warrior" },
    }
  };

  // Member 3: Tanmay equips Car, but selects Character Mode -> Runs on foot!
  const member3 = { id: "m-tanmay", name: "Tanmay Awasthi" };
  const cv3 = {
    inventory: { characters: ["buster-blitz"], vehicles: ["vehicle-car"] },
    appearance: {
      equippedCharacterId: "buster-blitz",
      equippedVehicleId: "vehicle-car",
      raceMode: "character",
      customColors: { "buster-blitz": { baseColor: "#10b981" } },
      equippedOutfits: { "buster-blitz": "outfit-royal" },
    }
  };

  // Member 4: Avantika equips Rocket, Vehicle Mode -> Flies Rocket
  const member4 = { id: "m-avantika", name: "Avantika Yadav" };
  const cv4 = {
    inventory: { characters: ["buster-blitz", "nebula-nova"], vehicles: ["vehicle-rocket"] },
    appearance: {
      equippedCharacterId: "nebula-nova",
      equippedVehicleId: "vehicle-rocket",
      raceMode: "vehicle",
    }
  };

  const r1 = buildRacerPayload(member1, null, cv1, 0);
  const r2 = buildRacerPayload(member2, null, cv2, 1);
  const r3 = buildRacerPayload(member3, null, cv3, 2);
  const r4 = buildRacerPayload(member4, null, cv4, 3);

  // Racer 1 verification
  assert.equal(r1.character.characterId, "superman");
  assert.equal(r1.character.raceMode, "character");
  assert.equal(r1.character.equippedVehicleId, null);

  // Racer 2 verification
  assert.equal(r2.character.characterId, "buster-blitz");
  assert.equal(r2.character.raceMode, "vehicle");
  assert.equal(r2.character.equippedVehicleId, "vehicle-bike");
  assert.equal(r2.character.outfitId, "outfit-warrior");

  // Racer 3 verification: owns car, but chose Character Mode
  assert.equal(r3.character.characterId, "buster-blitz");
  assert.equal(r3.character.raceMode, "character");
  assert.equal(r3.character.equippedVehicleId, "vehicle-car");
  assert.equal(r3.character.outfitId, "outfit-royal");

  // Racer 4 verification: Nebula Nova in Rocket
  assert.equal(r4.character.characterId, "nebula-nova");
  assert.equal(r4.character.raceMode, "vehicle");
  assert.equal(r4.character.equippedVehicleId, "vehicle-rocket");
});

test("Unified Sync: RaceMovementController respects raceMode (Character Mode vs Vehicle Mode kinematics)", () => {
  // Racer with Rocket equipped, but raceMode is 'character'
  const footRocketRacer = {
    id: "m-runner",
    laneIndex: 0,
    character: {
      equippedCharacterId: "buster-blitz",
      equippedVehicleId: "vehicle-rocket",
      raceMode: "character",
    }
  };

  const footConfig = getRacerVehicleConfig(footRocketRacer);
  assert.equal(footConfig.id, "none", "Character Mode must use foot locomotion config even if rocket is equipped");

  const footKinematics = getRacerKinematics(footRocketRacer, { id: "buster-blitz" }, 50, 0, 2.0, false);
  assert.equal(footKinematics.isMounted, false, "Must not be mounted in Character Mode");

  // Same racer switches to 'vehicle' mode
  const mountedRocketRacer = {
    id: "m-runner",
    laneIndex: 0,
    character: {
      equippedCharacterId: "buster-blitz",
      equippedVehicleId: "vehicle-rocket",
      raceMode: "vehicle",
    }
  };

  const vehicleConfig = getRacerVehicleConfig(mountedRocketRacer);
  assert.equal(vehicleConfig.id, "vehicle-rocket");
  assert.equal(vehicleConfig.modelType, "rocket");

  const vehicleKinematics = getRacerKinematics(mountedRocketRacer, { id: "buster-blitz" }, 50, 0, 2.0, false);
  assert.equal(vehicleKinematics.isMounted, true, "Must be mounted in Vehicle Mode");
  assert.ok(vehicleKinematics.verticalElevation >= 1.2, "Rocket must hover with elevated clearance");
});

test("Unified Sync: Superman authentic abilities preserved in Character Mode vs Vehicle Mode", () => {
  const supermanCharData = { id: "superman" };

  // Superman in Character Mode -> authentic flight kinematics at 1.25m elevation
  const supermanCharModeRacer = {
    id: "m-superman",
    laneIndex: 0,
    character: {
      equippedCharacterId: "superman",
      equippedVehicleId: null,
      raceMode: "character",
    }
  };

  const charKinematics = getRacerKinematics(supermanCharModeRacer, supermanCharData, 100, 0, 4.0, false);
  assert.equal(charKinematics.isMounted, false);
  assert.ok(charKinematics.verticalElevation >= 1.25, "Superman must fly at 1.25m clearance");

  // Superman in Vehicle Mode with Rocket -> mounted in Rocket
  const supermanRocketRacer = {
    id: "m-superman",
    laneIndex: 0,
    character: {
      equippedCharacterId: "superman",
      equippedVehicleId: "vehicle-rocket",
      raceMode: "vehicle",
    }
  };

  const rocketKinematics = getRacerKinematics(supermanRocketRacer, supermanCharData, 100, 0, 4.0, false);
  assert.equal(rocketKinematics.isMounted, true);
  assert.equal(rocketKinematics.vehicleConfig.id, "vehicle-rocket");
});
