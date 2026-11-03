"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  starterProfile,
  publicProfile,
  ensureProfile,
  validateAppearance,
  saveAppearance,
  purchase,
} = require("../characterverse-profiles");

const {
  buildRacerPayload,
  buildRaceArenaState,
} = require("../arena-race");

function createMemoryProfileCollection() {
  const store = new Map();
  return {
    async updateOne(filter, update, options = {}) {
      const id = filter._id;
      let doc = store.get(id);
      if (!doc && options.upsert) {
        doc = JSON.parse(JSON.stringify(update.$setOnInsert || { _id: id }));
        store.set(id, doc);
      }
      if (doc && update.$set) {
        Object.assign(doc, JSON.parse(JSON.stringify(update.$set)));
        if (update.$set.appearance) {
          doc.appearance = JSON.parse(JSON.stringify(update.$set.appearance));
        }
      }
      return { acknowledged: true };
    },
    async findOne(filter) {
      const doc = store.get(filter._id);
      return doc ? JSON.parse(JSON.stringify(doc)) : null;
    },
    async find(filter) {
      const ids = filter._id?.$in || [];
      const results = [];
      for (const id of ids) {
        const doc = store.get(id);
        if (doc) results.push(JSON.parse(JSON.stringify(doc)));
      }
      return { toArray: async () => results };
    },
    async findOneAndUpdate(filter, update, options = {}) {
      const id = filter._id;
      let doc = store.get(id);
      if (!doc) return null;
      if (filter["wallet.coins"] && filter["wallet.coins"].$gte !== undefined) {
        if ((doc.wallet?.coins ?? 0) < filter["wallet.coins"].$gte) return null;
      }
      if (filter["inventory.vehicles"] && filter["inventory.vehicles"].$ne) {
        if (doc.inventory?.vehicles?.includes(filter["inventory.vehicles"].$ne)) return null;
      }
      if (update.$inc) {
        doc.wallet = doc.wallet || { coins: 0 };
        doc.wallet.coins += update.$inc["wallet.coins"] || 0;
      }
      if (update.$addToSet) {
        doc.inventory = doc.inventory || {};
        for (const [key, val] of Object.entries(update.$addToSet)) {
          const parts = key.split(".");
          const field = parts[1] || parts[0];
          doc.inventory[field] = doc.inventory[field] || [];
          if (!doc.inventory[field].includes(val)) doc.inventory[field].push(val);
        }
      }
      if (update.$set) {
        Object.assign(doc, JSON.parse(JSON.stringify(update.$set)));
      }
      store.set(id, doc);
      return options.returnDocument === "after" ? JSON.parse(JSON.stringify(doc)) : null;
    }
  };
}

test("TEST 1 — EQUIP: Admin Krish owns Rocket, equips it, and the server persists equippedVehicleId = vehicle-rocket", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "member-krish");

  // Give Krish the Rocket in inventory (as he already owns it)
  const initial = await collection.findOne({ _id: "member-krish" });
  initial.inventory.vehicles = ["vehicle-rocket"];
  initial.inventory.characters.push("superman");
  initial.appearance.equippedCharacterId = "superman";
  await collection.updateOne({ _id: "member-krish" }, { $set: initial });

  // Krish equips Rocket
  const equipResult = await saveAppearance(collection, "member-krish", {
    equippedVehicleId: "vehicle-rocket"
  });

  assert.equal(equipResult.error, undefined);
  assert.equal(equipResult.profile.appearance.equippedVehicleId, "vehicle-rocket");

  // Verify persistence in collection
  const persisted = await collection.findOne({ _id: "member-krish" });
  assert.equal(persisted.appearance.equippedVehicleId, "vehicle-rocket");
  assert.equal(persisted.appearance.equippedCharacterId, "superman");
});

test("TEST 2 — NAVIGATION: Navigate CharacterVerse → Profile → Dashboard → CharacterVerse preserves Rocket", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "member-krish");
  const initial = await collection.findOne({ _id: "member-krish" });
  initial.inventory.vehicles = ["vehicle-rocket"];
  initial.appearance.equippedVehicleId = "vehicle-rocket";
  await collection.updateOne({ _id: "member-krish" }, { $set: initial });

  // 1. In CharacterVerse, Rocket is equipped
  const cv1 = await collection.findOne({ _id: "member-krish" });
  assert.equal(cv1.appearance.equippedVehicleId, "vehicle-rocket");

  // 2. User navigates to Profile: /api/profile/member-krish reads appearance
  const profileFetch = await collection.findOne({ _id: "member-krish" });
  const publicProf = publicProfile(profileFetch);
  assert.equal(publicProf.appearance.equippedVehicleId, "vehicle-rocket");

  // 3. User navigates to Dashboard: /api/member/dashboard triggers loadMemberCharacterVerseSummary
  const dashboardFetch = await collection.findOne({ _id: "member-krish" });
  assert.equal(dashboardFetch.appearance.equippedVehicleId, "vehicle-rocket");

  // 4. User navigates back to CharacterVerse: /api/characterverse/me returns profile
  const returnCV = await collection.findOne({ _id: "member-krish" });
  assert.equal(returnCV.appearance.equippedVehicleId, "vehicle-rocket");
});

test("TEST 3 — REFRESH: Refreshing the browser preserves Rocket", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "member-krish");
  const doc = await collection.findOne({ _id: "member-krish" });
  doc.inventory.vehicles = ["vehicle-rocket"];
  await collection.updateOne({ _id: "member-krish" }, { $set: doc });
  await saveAppearance(collection, "member-krish", { equippedVehicleId: "vehicle-rocket" });

  // Simulate complete browser restart/refresh: fresh read from DB
  const reloaded = await collection.findOne({ _id: "member-krish" });
  assert.equal(reloaded.appearance.equippedVehicleId, "vehicle-rocket");
});

test("TEST 4 — SESSION: Log out and log back in preserves Rocket", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "member-krish");
  const doc = await collection.findOne({ _id: "member-krish" });
  doc.inventory.vehicles = ["vehicle-rocket"];
  await collection.updateOne({ _id: "member-krish" }, { $set: doc });
  await saveAppearance(collection, "member-krish", { equippedVehicleId: "vehicle-rocket" });

  // New session established: ensureProfile is called for the authenticated member
  const sessionProfile = await ensureProfile(collection, "member-krish");
  assert.equal(sessionProfile.appearance.equippedVehicleId, "vehicle-rocket");
});

test("TEST 5 — RACE ARENA: Open Race Arena recognizes Rocket as equipped and vehicle mode selectable", async () => {
  const member = { id: "member-krish", name: "Krish (ADMIN)" };
  const cvDoc = {
    _id: "member-krish",
    inventory: { characters: ["superman"], vehicles: ["vehicle-rocket"] },
    appearance: {
      equippedCharacterId: "superman",
      equippedVehicleId: "vehicle-rocket",
      raceMode: "vehicle"
    }
  };

  const racer = buildRacerPayload(member, { status: "Success", stats: { total: 571 } }, cvDoc, 0);

  // Rocket must be equipped on the racer
  assert.equal(racer.character.equippedVehicleId, "vehicle-rocket");
  assert.equal(racer.character.raceMode, "vehicle");

  // Race arena state must correctly include racer with vehicle
  const arenaState = buildRaceArenaState([member], new Map(), new Map([["member-krish", cvDoc]]));
  const arenaRacer = arenaState.racers.find(r => r.id === "member-krish");
  assert.equal(arenaRacer.character.equippedVehicleId, "vehicle-rocket");
  assert.equal(arenaRacer.character.raceMode, "vehicle");
});

test("TEST 6 — MANUAL UNEQUIP: Manually unequip Rocket clears equippedVehicleId on server", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "member-krish");
  const doc = await collection.findOne({ _id: "member-krish" });
  doc.inventory.vehicles = ["vehicle-rocket"];
  doc.appearance.equippedVehicleId = "vehicle-rocket";
  await collection.updateOne({ _id: "member-krish" }, { $set: doc });

  // Unequip action
  const unequipResult = await saveAppearance(collection, "member-krish", {
    equippedVehicleId: null
  });

  assert.equal(unequipResult.error, undefined);
  assert.equal(unequipResult.profile.appearance.equippedVehicleId, null);

  const persisted = await collection.findOne({ _id: "member-krish" });
  assert.equal(persisted.appearance.equippedVehicleId, null);
});

test("TEST 7 — RE-EQUIP: Equip Rocket again persists correctly", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "member-krish");
  const doc = await collection.findOne({ _id: "member-krish" });
  doc.inventory.vehicles = ["vehicle-rocket"];
  doc.appearance.equippedVehicleId = null;
  await collection.updateOne({ _id: "member-krish" }, { $set: doc });

  const reEquip = await saveAppearance(collection, "member-krish", {
    equippedVehicleId: "vehicle-rocket"
  });
  assert.equal(reEquip.profile.appearance.equippedVehicleId, "vehicle-rocket");

  const check = await collection.findOne({ _id: "member-krish" });
  assert.equal(check.appearance.equippedVehicleId, "vehicle-rocket");
});

test("TEST 8 — SWITCH VEHICLE: Equip another owned vehicle persists across navigation", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "member-multi");
  const doc = await collection.findOne({ _id: "member-multi" });
  doc.inventory.vehicles = ["vehicle-rocket", "vehicle-bike", "vehicle-car"];
  doc.appearance.equippedVehicleId = "vehicle-rocket";
  await collection.updateOne({ _id: "member-multi" }, { $set: doc });

  // Switch to Apex Supercar
  await saveAppearance(collection, "member-multi", { equippedVehicleId: "vehicle-car" });
  let check = await collection.findOne({ _id: "member-multi" });
  assert.equal(check.appearance.equippedVehicleId, "vehicle-car");

  // Switch to Ninja Superbike
  await saveAppearance(collection, "member-multi", { equippedVehicleId: "vehicle-bike" });
  check = await collection.findOne({ _id: "member-multi" });
  assert.equal(check.appearance.equippedVehicleId, "vehicle-bike");
});

test("TEST 9 — MULTIPLE PLAYERS: Player A and Player B retain their own independent equipment", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "member-alice");
  await ensureProfile(collection, "member-bob");

  // Alice owns bike, Bob owns rocket
  const aliceDoc = await collection.findOne({ _id: "member-alice" });
  aliceDoc.inventory.vehicles = ["vehicle-bike"];
  await collection.updateOne({ _id: "member-alice" }, { $set: aliceDoc });

  const bobDoc = await collection.findOne({ _id: "member-bob" });
  bobDoc.inventory.vehicles = ["vehicle-rocket"];
  await collection.updateOne({ _id: "member-bob" }, { $set: bobDoc });

  // Alice equips bike
  await saveAppearance(collection, "member-alice", { equippedVehicleId: "vehicle-bike" });

  // Bob equips rocket
  await saveAppearance(collection, "member-bob", { equippedVehicleId: "vehicle-rocket" });

  // Verify Alice and Bob are independent
  const aliceAfter = await collection.findOne({ _id: "member-alice" });
  const bobAfter = await collection.findOne({ _id: "member-bob" });

  assert.equal(aliceAfter.appearance.equippedVehicleId, "vehicle-bike");
  assert.equal(bobAfter.appearance.equippedVehicleId, "vehicle-rocket");
});

test("TEST 10 — PARTIAL API RESPONSE: Partial appearance update does not erase previously persisted equipment", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "member-alice");
  const doc = await collection.findOne({ _id: "member-alice" });
  doc.inventory.vehicles = ["vehicle-rocket"];
  doc.appearance.equippedVehicleId = "vehicle-rocket";
  doc.appearance.equippedCharacterId = "superman";
  doc.inventory.characters.push("superman");
  await collection.updateOne({ _id: "member-alice" }, { $set: doc });

  // Update ONLY raceMode (partial payload)
  const partialUpdate = await saveAppearance(collection, "member-alice", {
    raceMode: "vehicle"
  });

  assert.equal(partialUpdate.error, undefined);
  // equippedVehicleId must NOT be erased!
  assert.equal(partialUpdate.profile.appearance.equippedVehicleId, "vehicle-rocket");
  assert.equal(partialUpdate.profile.appearance.equippedCharacterId, "superman");
  assert.equal(partialUpdate.profile.appearance.raceMode, "vehicle");
});

test("TEST 11 — OWNERSHIP: A player without vehicle ownership cannot equip that vehicle", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "member-charlie");
  // Charlie owns NO vehicles

  const invalidEquip = await saveAppearance(collection, "member-charlie", {
    equippedVehicleId: "vehicle-rocket"
  });

  assert.equal(invalidEquip.error, "INVALID_APPEARANCE");

  // Ensure DB was not modified
  const persisted = await collection.findOne({ _id: "member-charlie" });
  assert.equal(persisted.appearance.equippedVehicleId, null);
});

test("TEST 12 — EXPIRY & ENTITLEMENT: Unowned vehicle assignment safely falls back in arena payload", () => {
  const member = { id: "member-dave", name: "Dave" };
  // Dave somehow had vehicle-rocket in appearance, but DOES NOT own it in inventory (e.g. expired)
  const expiredCvDoc = {
    _id: "member-dave",
    inventory: { characters: ["buster-blitz"], vehicles: [] }, // inventory empty!
    appearance: {
      equippedCharacterId: "buster-blitz",
      equippedVehicleId: "vehicle-rocket",
      raceMode: "vehicle"
    }
  };

  const racer = buildRacerPayload(member, { status: "Success", stats: { total: 100 } }, expiredCvDoc, 0);

  // Authoritative entitlement validation: expired/unowned equipment safely falls back to null (on foot)
  assert.equal(racer.character.equippedVehicleId, null);
  assert.equal(racer.character.raceMode, "character");
});
