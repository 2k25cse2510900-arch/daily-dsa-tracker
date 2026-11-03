"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  VEHICLE_CONFIGS,
  getVehicleConfig,
  calculateVehicleTelemetry,
} = require("../characterverse/src/components/arena/simulation/VehicleConfig");

const {
  getRacerForwardDistance,
  getRacerKinematics,
  getRacerVehicleConfig,
  BASE_RUNNING_SPEED,
} = require("../characterverse/src/components/arena/simulation/RaceMovementController");

const {
  buildRacerPayload,
  buildRaceArenaState,
  calculateProgress,
} = require("../arena-race");

test("Phase 2: Centralized Vehicle Configuration defines all four movement identities", () => {
  assert.ok(VEHICLE_CONFIGS.none, "Foot athlete locomotion config must exist");
  assert.ok(VEHICLE_CONFIGS["vehicle-bike"], "Ninja Superbike config must exist");
  assert.ok(VEHICLE_CONFIGS["vehicle-car"], "Apex Supercar config must exist");
  assert.ok(VEHICLE_CONFIGS["vehicle-rocket"], "Cosmic Titan Rocket config must exist");

  // Speed ratings & velocities
  assert.equal(VEHICLE_CONFIGS.none.baseSpeed, 13.5);
  assert.equal(VEHICLE_CONFIGS["vehicle-bike"].baseSpeed, 15.5);
  assert.equal(VEHICLE_CONFIGS["vehicle-car"].baseSpeed, 17.8);
  assert.equal(VEHICLE_CONFIGS["vehicle-rocket"].baseSpeed, 20.5);

  // Wheel rotation
  assert.equal(VEHICLE_CONFIGS.none.wheelRotation, false);
  assert.equal(VEHICLE_CONFIGS["vehicle-bike"].wheelRotation, true);
  assert.equal(VEHICLE_CONFIGS["vehicle-car"].wheelRotation, true);
  assert.equal(VEHICLE_CONFIGS["vehicle-rocket"].wheelRotation, false);

  // Flight elevation
  assert.equal(VEHICLE_CONFIGS.none.isFlying, false);
  assert.equal(VEHICLE_CONFIGS["vehicle-bike"].isFlying, false);
  assert.equal(VEHICLE_CONFIGS["vehicle-car"].isFlying, false);
  assert.equal(VEHICLE_CONFIGS["vehicle-rocket"].isFlying, true);
  assert.equal(VEHICLE_CONFIGS["vehicle-rocket"].flightElevation, 1.35);

  // Stride frequency (foot runners run; mounted riders do not have leg stride bob)
  assert.equal(VEHICLE_CONFIGS.none.strideFrequency, 12.0);
  assert.equal(VEHICLE_CONFIGS["vehicle-bike"].strideFrequency, 0);
  assert.equal(VEHICLE_CONFIGS["vehicle-car"].strideFrequency, 0);
  assert.equal(VEHICLE_CONFIGS["vehicle-rocket"].strideFrequency, 0);
});

test("Phase 2: getVehicleConfig gracefully falls back to foot on missing or unknown vehicle", () => {
  assert.equal(getVehicleConfig(null).id, "none");
  assert.equal(getVehicleConfig(undefined).id, "none");
  assert.equal(getVehicleConfig("unknown-vehicle-id").id, "none");
  assert.equal(getVehicleConfig("vehicle-bike").id, "vehicle-bike");
  assert.equal(getVehicleConfig({ id: "vehicle-car" }).id, "vehicle-car");
});

test("Phase 2: Vehicle Kinematics provide distinct physical banking, pitch, and elevation", () => {
  // Test Bike kinematics
  const bikeRacer = { character: { equippedVehicleId: "vehicle-bike" } };
  const bikeKinematics = getRacerKinematics(bikeRacer, {}, 100.0, 0, 5.0, false);
  assert.equal(bikeKinematics.isMounted, true);
  assert.equal(bikeKinematics.stridePhase, 0, "Bike rider should not have running stride displacement");
  assert.ok(bikeKinematics.verticalElevation < 0.1, "Bike stays ground-level with subtle suspension");

  // Test Car kinematics
  const carRacer = { character: { equippedVehicleId: "vehicle-car" } };
  const carKinematics = getRacerKinematics(carRacer, {}, 100.0, 0, 5.0, false);
  assert.equal(carKinematics.isMounted, true);
  assert.equal(carKinematics.stridePhase, 0, "Car driver should not have running stride displacement");
  assert.ok(carKinematics.verticalElevation < 0.05, "Car chassis hugs ground");

  // Test Rocket kinematics
  const rocketRacer = { character: { equippedVehicleId: "vehicle-rocket" } };
  const rocketKinematics = getRacerKinematics(rocketRacer, {}, 100.0, 0, 5.0, false);
  assert.equal(rocketKinematics.isMounted, true);
  assert.equal(rocketKinematics.stridePhase, 0, "Rocket rider does not have running stride displacement");
  assert.ok(rocketKinematics.verticalElevation >= 1.25, "Rocket must hover with flight elevation >= 1.25m");

  // Test Foot athlete kinematics
  const footRacer = { character: { equippedVehicleId: null } };
  const footKinematics = getRacerKinematics(footRacer, { id: "buster-blitz" }, 100.0, 0, 5.0, false);
  assert.equal(footKinematics.isMounted, false);
  assert.ok(footKinematics.verticalElevation < 0.25, "Runner stays near ground with stride bob");

  // Test Superman flight kinematics
  const supermanRacer = { character: { equippedVehicleId: null } };
  const supermanKinematics = getRacerKinematics(supermanRacer, { id: "superman" }, 100.0, 0, 5.0, false);
  assert.equal(supermanKinematics.isMounted, false);
  assert.ok(supermanKinematics.verticalElevation >= 1.17 && supermanKinematics.verticalElevation <= 1.35, "Superman must maintain elevated flight clearance around 1.25m");
});

test("Phase 2: Server-side buildRacerPayload validates vehicle ownership against inventory", () => {
  const member = { id: "m-test", name: "Racer One" };

  // Case 1: Unowned vehicle in appearance is rejected (falls back to null)
  const cvDocUnowned = {
    inventory: { vehicles: ["vehicle-bike"], vehicleUpgrades: [] },
    appearance: {
      equippedVehicleId: "vehicle-rocket", // Hacker trying to use rocket without buying
      vehicleUpgradeId: "rocket-warp",
    },
  };
  const payload1 = buildRacerPayload(member, null, cvDocUnowned, 0);
  assert.equal(payload1.character.equippedVehicleId, null, "Unowned rocket must fall back to null");
  assert.equal(payload1.character.vehicleUpgradeId, null, "Unowned upgrade must fall back to null");

  // Case 2: Owned vehicle in appearance is authorized
  const cvDocOwned = {
    inventory: { vehicles: ["vehicle-bike"], vehicleUpgrades: ["bike-sparks"] },
    appearance: {
      equippedVehicleId: "vehicle-bike",
      vehicleUpgradeId: "bike-sparks",
    },
  };
  const payload2 = buildRacerPayload(member, null, cvDocOwned, 0);
  assert.equal(payload2.character.equippedVehicleId, "vehicle-bike");
  assert.equal(payload2.character.vehicleUpgradeId, "bike-sparks");
});

test("Phase 2: Academic LeetCode progress and rankings are completely independent of vehicle ownership", () => {
  const members = [
    { id: "m-bike", name: "Bike Rider" },
    { id: "m-rocket", name: "Rocket Rider" },
    { id: "m-foot", name: "Foot Runner" },
  ];

  const leetCodeMap = new Map([
    ["m-bike", { status: "Success", stats: { total: 400 } }],
    ["m-rocket", { status: "Success", stats: { total: 200 } }],
    ["m-foot", { status: "Success", stats: { total: 600 } }],
  ]);

  const cvMap = new Map([
    ["m-bike", { inventory: { vehicles: ["vehicle-bike"] }, appearance: { equippedVehicleId: "vehicle-bike" } }],
    ["m-rocket", { inventory: { vehicles: ["vehicle-rocket"] }, appearance: { equippedVehicleId: "vehicle-rocket" } }],
    ["m-foot", { inventory: { vehicles: [] }, appearance: { equippedVehicleId: null } }],
  ]);

  const state = buildRaceArenaState(members, leetCodeMap, cvMap);

  // Foot runner has 600 solved -> Rank 1
  assert.equal(state.racers[0].id, "m-foot");
  assert.equal(state.racers[0].rank, 1);
  assert.equal(state.racers[0].solvedCount, 600);

  // Bike rider has 400 solved -> Rank 2
  assert.equal(state.racers[1].id, "m-bike");
  assert.equal(state.racers[1].rank, 2);
  assert.equal(state.racers[1].solvedCount, 400);

  // Rocket rider has 200 solved -> Rank 3 (Legendary rocket grants ZERO academic rank advantage)
  assert.equal(state.racers[2].id, "m-rocket");
  assert.equal(state.racers[2].rank, 3);
  assert.equal(state.racers[2].solvedCount, 200);
});

test("Phase 2: calculateVehicleTelemetry formats live telemetry HUD data", () => {
  const bikeConfig = VEHICLE_CONFIGS["vehicle-bike"];
  const telemetry = calculateVehicleTelemetry(bikeConfig, false, 2.5);

  assert.equal(telemetry.name, "Ninja Superbike");
  assert.equal(telemetry.rarity, "COMMON");
  assert.ok(telemetry.speedKmh >= 50 && telemetry.speedKmh <= 65, "Bike speed in realistic range");
  assert.equal(telemetry.badgeColor, "#10b981");

  const rocketConfig = VEHICLE_CONFIGS["vehicle-rocket"];
  const rocketTelemetry = calculateVehicleTelemetry(rocketConfig, false, 2.5);
  assert.equal(rocketTelemetry.name, "Cosmic Titan Rocket");
  assert.equal(rocketTelemetry.rarity, "LEGENDARY");
  assert.ok(rocketTelemetry.speedKmh >= 70, "Rocket speed reflects legendary propulsion");
  assert.equal(rocketTelemetry.isFlying, true);
});

test("Phase 2: RaceArena source preserves required test invariants", () => {
  const arenaSource = fs.readFileSync(path.join(__dirname, "..", "characterverse", "src", "components", "arena", "RaceArena.jsx"), "utf8");

  // Invariant 1: Superman detection & 1.25m elevation
  assert.ok(arenaSource.includes("const isSuperman = characterData?.id === 'superman'"), "Must preserve isSuperman check");
  assert.ok(arenaSource.includes("1.25"), "Must preserve 1.25 elevation invariant");

  // Invariant 2: DoubleSide export
  assert.ok(arenaSource.includes("DoubleSide"), "Must export DoubleSide");

  // Invariant 3: Telemetry HUD integration
  assert.ok(arenaSource.includes("VehicleTelemetryHUD"), "Must render VehicleTelemetryHUD");
  assert.ok(arenaSource.includes("arena-vehicle-telemetry-hud"), "Must render vehicle telemetry container");
});
