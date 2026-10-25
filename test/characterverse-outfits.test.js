"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { MongoClient } = require("mongodb");
const express = require("express");
const {
  OUTFIT_PRICES,
  starterProfile,
  ensureProfile,
  publicProfile,
  validateAppearance,
  saveAppearance,
  purchase
} = require("../characterverse-profiles");

function createMemoryProfileCollection(initialProfiles = {}) {
  const store = new Map(Object.entries(initialProfiles).map(([k, v]) => [k, structuredClone(v)]));
  return {
    async updateOne(filter, update, options = {}) {
      const id = filter._id;
      let doc = store.get(id);
      if (!doc) {
        if (options.upsert) {
          doc = structuredClone(update.$setOnInsert || { _id: id });
          store.set(id, doc);
          return { matchedCount: 0, upsertedCount: 1, upsertedId: id };
        }
        return { matchedCount: 0, modifiedCount: 0 };
      }
      if (filter["appliedRewardKeys"] && filter["appliedRewardKeys"].$ne) {
        if (doc.appliedRewardKeys?.includes(filter["appliedRewardKeys"].$ne)) {
          return { matchedCount: 0, modifiedCount: 0 };
        }
      }
      if (update.$set) {
        for (const [k, v] of Object.entries(update.$set)) {
          if (k.includes(".")) {
            const parts = k.split(".");
            let target = doc;
            for (let i = 0; i < parts.length - 1; i++) {
              target[parts[i]] = target[parts[i]] || {};
              target = target[parts[i]];
            }
            target[parts[parts.length - 1]] = structuredClone(v);
          } else {
            doc[k] = structuredClone(v);
          }
        }
      }
      if (update.$inc) {
        for (const [k, v] of Object.entries(update.$inc)) {
          const parts = k.split(".");
          let target = doc;
          for (let i = 0; i < parts.length - 1; i++) {
            target[parts[i]] = target[parts[i]] || {};
            target = target[parts[i]];
          }
          target[parts[parts.length - 1]] = (target[parts[parts.length - 1]] || 0) + v;
        }
      }
      if (update.$addToSet) {
        for (const [k, v] of Object.entries(update.$addToSet)) {
          const parts = k.split(".");
          let target = doc;
          for (let i = 0; i < parts.length - 1; i++) {
            target[parts[i]] = target[parts[i]] || [];
            target = target[parts[i]];
          }
          const field = parts[parts.length - 1];
          target[field] = target[field] || [];
          if (!target[field].includes(v)) target[field].push(v);
        }
      }
      return { matchedCount: 1, modifiedCount: 1 };
    },
    async findOneAndUpdate(filter, update, options = {}) {
      const id = filter._id;
      const doc = store.get(id);
      if (!doc) return null;
      if (filter["wallet.coins"] && filter["wallet.coins"].$gte !== undefined) {
        if ((doc.wallet?.coins ?? 0) < filter["wallet.coins"].$gte) return null;
      }
      if (filter["inventory.vehicles"] && filter["inventory.vehicles"].$ne) {
        if (doc.inventory?.vehicles?.includes(filter["inventory.vehicles"].$ne)) return null;
      }
      if (filter["inventory.characters"] && filter["inventory.characters"].$ne) {
        if (doc.inventory?.characters?.includes(filter["inventory.characters"].$ne)) return null;
      }
      if (filter["inventory.outfits"] && filter["inventory.outfits"].$ne) {
        if (doc.inventory?.outfits?.includes(filter["inventory.outfits"].$ne)) return null;
      }
      await this.updateOne({ _id: id }, update, options);
      return structuredClone(store.get(id));
    },
    async findOne(filter) {
      const id = filter._id;
      const doc = store.get(id);
      return doc ? structuredClone(doc) : null;
    }
  };
}

test("outfit rule 1: Default outfit is free and initially unlocked in starter profile", () => {
  const profile = starterProfile("member-test");
  assert.equal(OUTFIT_PRICES["outfit-default"], 0);
  assert.deepEqual(profile.inventory.outfits, ["outfit-default"]);
  assert.equal(profile.appearance.equippedOutfits["buster-blitz"], "outfit-default");
});

test("outfit rule 2: Warrior costs 250 coins and Royal costs 500 coins in server catalogue and client metadata", () => {
  assert.equal(OUTFIT_PRICES["outfit-warrior"], 250);
  assert.equal(OUTFIT_PRICES["outfit-royal"], 500);

  const wardrobeSource = fs.readFileSync(path.join(__dirname, "..", "characterverse", "src", "data", "wardrobe.js"), "utf8");
  assert.match(wardrobeSource, /id:\s*['"]outfit-default['"]/);
  assert.match(wardrobeSource, /priceCoins:\s*0/);
  assert.match(wardrobeSource, /id:\s*['"]outfit-warrior['"]/);
  assert.match(wardrobeSource, /priceCoins:\s*250/);
  assert.match(wardrobeSource, /id:\s*['"]outfit-royal['"]/);
  assert.match(wardrobeSource, /priceCoins:\s*500/);
});

test("outfit rule 3: purchase rejects when player has insufficient coins without deducting coins", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "player-1");
  await collection.updateOne({ _id: "player-1" }, { $set: { "wallet.coins": 249 } });

  // Warrior costs 250, player has 249
  const resultWarrior = await purchase(collection, "player-1", "outfit", "outfit-warrior");
  assert.equal(resultWarrior.error, "INSUFFICIENT_COINS");

  // Royal costs 500, player has 249
  const resultRoyal = await purchase(collection, "player-1", "outfit", "outfit-royal");
  assert.equal(resultRoyal.error, "INSUFFICIENT_COINS");

  // Verify wallet is unchanged
  const doc = await collection.findOne({ _id: "player-1" });
  assert.equal(doc.wallet.coins, 249);
  assert.deepEqual(doc.inventory.outfits, ["outfit-default"]);
});

test("outfit rule 4: successful purchase deducts exactly 250 coins for Warrior, unlocks and equips it", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "player-warrior");
  await collection.updateOne({ _id: "player-warrior" }, { $set: { "wallet.coins": 605 } });

  const ledgerRows = new Map();
  const ledger = {
    async updateOne(filter, update) {
      const row = ledgerRows.get(filter._id) || {};
      if (update.$setOnInsert && !ledgerRows.has(filter._id)) Object.assign(row, update.$setOnInsert);
      if (update.$set) Object.assign(row, update.$set);
      ledgerRows.set(filter._id, row);
    },
    async deleteOne(filter) { if (ledgerRows.get(filter._id)?.status === filter.status) ledgerRows.delete(filter._id); }
  };

  const result = await purchase(collection, "player-warrior", "outfit", "outfit-warrior", new Date("2026-10-26T00:00:00Z"), ledger);
  assert.ok(result.profile);
  assert.equal(result.profile.wallet.coins, 355); // 605 - 250
  assert.ok(result.profile.inventory.outfits.includes("outfit-warrior"));
  assert.equal(result.profile.appearance.equippedOutfits["buster-blitz"], "outfit-warrior");

  // Ledger entry verified
  const txKey = "characterverse:purchase:player-warrior:outfit:outfit-warrior";
  assert.equal(ledgerRows.get(txKey)?.status, "applied");
  assert.equal(ledgerRows.get(txKey)?.amount, -250);
});

test("outfit rule 5: successful purchase deducts exactly 500 coins for Royal, unlocks and equips it", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "player-royal");
  await collection.updateOne({ _id: "player-royal" }, { $set: { "wallet.coins": 5550 } });

  const ledgerRows = new Map();
  const ledger = {
    async updateOne(filter, update) {
      const row = ledgerRows.get(filter._id) || {};
      if (update.$setOnInsert && !ledgerRows.has(filter._id)) Object.assign(row, update.$setOnInsert);
      if (update.$set) Object.assign(row, update.$set);
      ledgerRows.set(filter._id, row);
    },
    async deleteOne(filter) { if (ledgerRows.get(filter._id)?.status === filter.status) ledgerRows.delete(filter._id); }
  };

  const result = await purchase(collection, "player-royal", "outfit", "outfit-royal", new Date("2026-10-26T00:00:00Z"), ledger);
  assert.ok(result.profile);
  assert.equal(result.profile.wallet.coins, 5050); // 5550 - 500
  assert.ok(result.profile.inventory.outfits.includes("outfit-royal"));
  assert.equal(result.profile.appearance.equippedOutfits["buster-blitz"], "outfit-royal");
});

test("outfit rule 6: idempotent purchase does not double-charge on repeated requests", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "player-idempotent");
  await collection.updateOne({ _id: "player-idempotent" }, { $set: { "wallet.coins": 1000 } });

  const ledgerRows = new Map();
  const ledger = {
    async updateOne(filter, update) {
      const row = ledgerRows.get(filter._id) || {};
      if (update.$setOnInsert && !ledgerRows.has(filter._id)) Object.assign(row, update.$setOnInsert);
      if (update.$set) Object.assign(row, update.$set);
      ledgerRows.set(filter._id, row);
    },
    async deleteOne(filter) { if (ledgerRows.get(filter._id)?.status === filter.status) ledgerRows.delete(filter._id); }
  };

  // First purchase
  const first = await purchase(collection, "player-idempotent", "outfit", "outfit-warrior", new Date("2026-10-26T00:00:00Z"), ledger);
  assert.equal(first.profile.wallet.coins, 750);

  // Repeated purchase retry with same idempotency key
  const second = await purchase(collection, "player-idempotent", "outfit", "outfit-warrior", new Date("2026-10-26T00:00:01Z"), ledger);
  assert.ok(second.profile);
  assert.equal(second.profile.wallet.coins, 750, "Coins must not be deducted again on retry");
});

test("outfit rule 7: cross-player isolation guarantees Player A purchase never unlocks or charges Player B", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "player-alice");
  await ensureProfile(collection, "player-bob");
  await collection.updateOne({ _id: "player-alice" }, { $set: { "wallet.coins": 1000 } });
  await collection.updateOne({ _id: "player-bob" }, { $set: { "wallet.coins": 605 } });

  // Alice purchases Royal outfit
  await purchase(collection, "player-alice", "outfit", "outfit-royal");

  const alice = await collection.findOne({ _id: "player-alice" });
  assert.equal(alice.wallet.coins, 500);
  assert.ok(alice.inventory.outfits.includes("outfit-royal"));

  // Bob's profile must remain completely unaffected
  const bob = await collection.findOne({ _id: "player-bob" });
  assert.equal(bob.wallet.coins, 605);
  assert.deepEqual(bob.inventory.outfits, ["outfit-default"]);
  assert.equal(bob.appearance.equippedOutfits["buster-blitz"], "outfit-default");
});

test("outfit rule 8: switching between already unlocked outfits is completely free", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "player-switch");
  await collection.updateOne({ _id: "player-switch" }, { $set: { "wallet.coins": 500 } });

  // Buy Warrior
  await purchase(collection, "player-switch", "outfit", "outfit-warrior");
  const afterBuy = await collection.findOne({ _id: "player-switch" });
  assert.equal(afterBuy.wallet.coins, 250);

  // Switch to Default
  const switchToDefault = await saveAppearance(collection, "player-switch", {
    equippedOutfits: { "buster-blitz": "outfit-default" }
  });
  assert.ok(switchToDefault.profile);
  assert.equal(switchToDefault.profile.wallet.coins, 250);

  // Switch back to Warrior
  const switchToWarrior = await saveAppearance(collection, "player-switch", {
    equippedOutfits: { "buster-blitz": "outfit-warrior" }
  });
  assert.ok(switchToWarrior.profile);
  assert.equal(switchToWarrior.profile.wallet.coins, 250);
});

test("outfit rule 9: equipping an unowned outfit is rejected by server appearance validation", async () => {
  const collection = createMemoryProfileCollection();
  const profile = await ensureProfile(collection, "player-hacker");

  // Player only owns outfit-default; trying to equip outfit-royal must fail
  const validated = validateAppearance({
    equippedOutfits: { "buster-blitz": "outfit-royal" }
  }, profile);
  assert.equal(validated, null, "Server must reject unowned outfit in appearance validation");
});
