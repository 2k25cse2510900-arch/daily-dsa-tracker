"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { STARTER_COINS, VEHICLES, CHARACTER_PRICES, OUTFIT_PRICES, starterProfile, ensureProfile, validateAppearance, saveAppearance, purchase } = require("../characterverse-profiles");

test("CharacterVerse starter profile is server-defined and begins with a standing default loadout", () => {
  const profile = starterProfile("member-test", new Date("2026-01-01T00:00:00Z"));
  assert.equal(profile._id, "member-test");
  assert.equal(profile.wallet.coins, STARTER_COINS);
  assert.equal(STARTER_COINS, 0);
  assert.deepEqual(profile.inventory.vehicles, []);
  assert.equal(profile.appearance.selectedCharacterId, "buster-blitz");
  assert.equal(profile.appearance.equippedCharacterId, "buster-blitz");
  assert.equal(profile.appearance.equippedVehicleId, null);
  assert.equal(profile.appearance.equippedOutfits["buster-blitz"], "outfit-default");
  assert.deepEqual(profile.inventory.outfits, ["outfit-default"]);
});

test("ensuring a profile never resets an existing legitimate wallet balance", async () => {
  const existing = starterProfile("member-existing");
  existing.wallet.coins = 735;
  const collection = {
    async updateOne(_filter, update) {
      assert.ok(update.$setOnInsert, "only a missing profile may receive defaults");
      return { matchedCount: 1, upsertedCount: 0 };
    },
    async findOne() { return structuredClone(existing); }
  };
  const profile = await ensureProfile(collection, "member-existing");
  assert.equal(profile.wallet.coins, 735);
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

test("the complete purchasable catalogue uses the required ten-times prices in server and client data", () => {
  assert.deepEqual(Object.fromEntries(Object.entries(VEHICLES).map(([id, item]) => [id, [item.baselinePrice, item.price, item.upgradeBaselinePrice, item.upgradePrice]])), {
    "vehicle-bike": [40, 400, 25, 250],
    "vehicle-car": [90, 900, 50, 500],
    "vehicle-rocket": [150, 1500, 75, 750]
  });
  const clientCatalog = fs.readFileSync(path.join(__dirname, "..", "characterverse", "src", "data", "vehicles.js"), "utf8");
  for (const price of [400, 250, 900, 500, 1500, 750]) assert.match(clientCatalog, new RegExp(`price: ${price}`));
});

function walletCollection(profile) {
  return {
    async updateOne(_filter, update) {
      if (update.$setOnInsert && !profile._id) Object.assign(profile, update.$setOnInsert);
      return { matchedCount: 1 };
    },
    async findOneAndUpdate(filter, update) {
      if (profile._id !== filter._id || profile.wallet.coins < filter["wallet.coins"].$gte || profile.inventory.vehicles.includes("vehicle-bike")) return null;
      profile.wallet.coins += update.$inc["wallet.coins"];
      profile.inventory.vehicles.push("vehicle-bike");
      profile.walletTransactionKeys = [update.$addToSet.walletTransactionKeys];
      profile.appearance.equippedVehicleId = update.$set["appearance.equippedVehicleId"];
      return structuredClone(profile);
    },
    async findOne() { return structuredClone(profile); }
  };
}

test("a server-authoritative purchase charges the final price once and records one ledger entry", async () => {
  const profile = starterProfile("member-test");
  profile.wallet.coins = 400;
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
  const collection = walletCollection(profile);
  const result = await purchase(collection, "member-test", "vehicle", "vehicle-bike", new Date("2026-10-25T00:00:00Z"), ledger);
  assert.equal(result.profile.wallet.coins, 0);
  assert.deepEqual(result.profile.inventory.vehicles, ["vehicle-bike"]);
  const retry = await purchase(collection, "member-test", "vehicle", "vehicle-bike", new Date("2026-10-25T00:00:01Z"), ledger);
  assert.equal(retry.profile.wallet.coins, 0);
  assert.equal(ledgerRows.size, 1);
  assert.equal([...ledgerRows.values()][0].amount, -400);
  assert.equal([...ledgerRows.values()][0].status, "applied");
});

test("an insufficient purchase cannot charge the wallet or leave an applied ledger entry", async () => {
  const profile = starterProfile("member-test");
  profile.wallet.coins = 399;
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
  const result = await purchase(walletCollection(profile), "member-test", "vehicle", "vehicle-bike", new Date(), ledger);
  assert.equal(result.error, "INSUFFICIENT_COINS");
  assert.equal(profile.wallet.coins, 399);
  assert.deepEqual(profile.inventory.vehicles, []);
  assert.equal(ledgerRows.size, 0);
});

test("the purchase API has no client-controlled price input", () => {
  const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  const client = fs.readFileSync(path.join(__dirname, "..", "characterverse", "src", "context", "StudioContext.jsx"), "utf8");
  assert.match(server, /purchaseCharacterVerseItem\([^,]+, req\.member\.id, kind, itemId, new Date\(\), db\.collection/);
  assert.match(client, /purchases\/vehicle\/\$\{encodeURIComponent\(vehicleId\)\}.*body: '\{\}'/);
  assert.doesNotMatch(client, /price:\s*(?:vehicle|upgrade|v)\.price/);
});

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
      if (filter["inventory.vehicles"]) {
        if (filter["inventory.vehicles"].$ne) {
          if (doc.inventory?.vehicles?.includes(filter["inventory.vehicles"].$ne)) return null;
        } else if (typeof filter["inventory.vehicles"] === "string") {
          if (!doc.inventory?.vehicles?.includes(filter["inventory.vehicles"])) return null;
        }
      }
      if (filter["inventory.vehicleUpgrades"] && filter["inventory.vehicleUpgrades"].$ne) {
        if (doc.inventory?.vehicleUpgrades?.includes(filter["inventory.vehicleUpgrades"].$ne)) return null;
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

test("cross-member isolation: Member A and Member B receive independent character records", async () => {
  const collection = createMemoryProfileCollection();
  const profileA = await ensureProfile(collection, "member-alice");
  const profileB = await ensureProfile(collection, "member-bob");

  assert.equal(profileA._id, "member-alice");
  assert.equal(profileB._id, "member-bob");
  assert.notEqual(profileA._id, profileB._id);
});

test("cross-member isolation: updating Member A appearance does not change Member B appearance", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "member-alice");
  await ensureProfile(collection, "member-bob");

  const aliceCustomization = {
    equippedCosmetics: { "buster-blitz": { head: "head-crown-astral" } },
    customColors: { "buster-blitz": { baseColor: "#ff0000", accentColor: "#00ff00", secondaryColor: "#0000ff", glowColor: "#ffffff" } }
  };
  const saveResult = await saveAppearance(collection, "member-alice", aliceCustomization);
  assert.equal(saveResult.profile.appearance.equippedCosmetics["buster-blitz"].head, "head-crown-astral");
  assert.equal(saveResult.profile.appearance.customColors["buster-blitz"].baseColor, "#ff0000");

  const bobProfile = await collection.findOne({ _id: "member-bob" });
  assert.deepEqual(bobProfile.appearance.equippedCosmetics["buster-blitz"], {});
  assert.deepEqual(bobProfile.appearance.customColors, {});
});

test("cross-member isolation: purchasing and equipping for Member A does not affect Member B wallet or inventory", async () => {
  const collection = createMemoryProfileCollection();
  const alice = await ensureProfile(collection, "member-alice");
  const bob = await ensureProfile(collection, "member-bob");

  // Give both members 1500 coins
  alice.wallet.coins = 1500;
  bob.wallet.coins = 1500;
  await collection.updateOne({ _id: "member-alice" }, { $set: { wallet: { coins: 1500 } } });
  await collection.updateOne({ _id: "member-bob" }, { $set: { wallet: { coins: 1500 } } });

  // Member A purchases the rocket (1500 coins)
  const purchaseResult = await purchase(collection, "member-alice", "vehicle", "vehicle-rocket", new Date());
  assert.equal(purchaseResult.profile.wallet.coins, 0);
  assert.deepEqual(purchaseResult.profile.inventory.vehicles, ["vehicle-rocket"]);
  assert.equal(purchaseResult.profile.appearance.equippedVehicleId, "vehicle-rocket");

  // Member B's wallet, inventory, and appearance must remain completely untouched
  const bobAfter = await collection.findOne({ _id: "member-bob" });
  assert.equal(bobAfter.wallet.coins, 1500);
  assert.deepEqual(bobAfter.inventory.vehicles, []);
  assert.equal(bobAfter.appearance.equippedVehicleId, null);
});

test("backend authorization: saveAppearance rejects client-injected fields and forged IDs", async () => {
  const profile = starterProfile("member-alice");
  // Attacker tries to inject memberId or role into appearance payload
  const forgedPayload = {
    selectedCharacterId: "buster-blitz",
    memberId: "member-bob",
    _id: "member-bob",
    role: "admin"
  };
  const validated = validateAppearance(forgedPayload, profile);
  assert.equal(validated, null, "validateAppearance must strictly reject unknown fields like memberId");
});

test("backend authorization: member cannot equip unowned items or vehicles", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "member-alice");

  // Alice does not own vehicle-car
  const unownedVehiclePayload = {
    equippedVehicleId: "vehicle-car"
  };
  const saveResult = await saveAppearance(collection, "member-alice", unownedVehiclePayload);
  assert.equal(saveResult.error, "INVALID_APPEARANCE");
});

test("state persistence: reloading character restores saved customizations and loadout", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "member-alice");

  await saveAppearance(collection, "member-alice", {
    equippedCosmetics: { "buster-blitz": { head: "head-headphones-dj" } },
    customColors: { "buster-blitz": { baseColor: "#123456", accentColor: "#654321", secondaryColor: "#abcdef", glowColor: "#fedcba" } }
  });

  // Simulate page reload / subsequent read
  const reloaded = await collection.findOne({ _id: "member-alice" });
  assert.equal(reloaded.appearance.equippedCosmetics["buster-blitz"].head, "head-headphones-dj");
  assert.equal(reloaded.appearance.customColors["buster-blitz"].glowColor, "#fedcba");
});

test("Nebula Nova unlock price is exactly 2,000 coins and client catalog matches server price", () => {
  assert.equal(CHARACTER_PRICES["nebula-nova"], 2000);
  const clientCharacters = fs.readFileSync(path.join(__dirname, "..", "characterverse", "src", "data", "characters.js"), "utf8");
  assert.match(clientCharacters, /id:\s*['"]nebula-nova['"]/);
  assert.match(clientCharacters, /price:\s*2000/);
});

test("server-authoritative purchase rejects unlocking Nebula Nova if coins < 2,000", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "member-poor");
  await collection.updateOne({ _id: "member-poor" }, { $set: { "wallet.coins": 1995 } });

  const result = await purchase(collection, "member-poor", "character", "nebula-nova");
  assert.equal(result.error, "INSUFFICIENT_COINS");

  const doc = await collection.findOne({ _id: "member-poor" });
  assert.equal(doc.wallet.coins, 1995);
  assert.equal(doc.inventory.characters.includes("nebula-nova"), false);
});

test("server-authoritative purchase unlocks Nebula Nova for 2,000 coins, equips it, and is idempotent on retry", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "member-rich");
  await collection.updateOne({ _id: "member-rich" }, { $set: { "wallet.coins": 2500 } });

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

  const result = await purchase(collection, "member-rich", "character", "nebula-nova", new Date("2026-10-25T00:00:00Z"), ledger);
  assert.ok(result.profile);
  assert.equal(result.profile.wallet.coins, 500);
  assert.ok(result.profile.inventory.characters.includes("nebula-nova"));
  assert.equal(result.profile.appearance.selectedCharacterId, "nebula-nova");
  assert.equal(result.profile.appearance.equippedCharacterId, "nebula-nova");

  // Idempotent retry: does not charge again
  const retry = await purchase(collection, "member-rich", "character", "nebula-nova", new Date("2026-10-25T00:00:01Z"), ledger);
  assert.ok(retry.profile);
  assert.equal(retry.profile.wallet.coins, 500);
});

test("unlocking Nebula Nova for Member A does not unlock it or charge Member B", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "member-a");
  await ensureProfile(collection, "member-b");
  await collection.updateOne({ _id: "member-a" }, { $set: { "wallet.coins": 2000 } });
  await collection.updateOne({ _id: "member-b" }, { $set: { "wallet.coins": 2000 } });

  const resultA = await purchase(collection, "member-a", "character", "nebula-nova");
  assert.ok(resultA.profile);
  assert.equal(resultA.profile.wallet.coins, 0);
  assert.ok(resultA.profile.inventory.characters.includes("nebula-nova"));

  const memberB = await collection.findOne({ _id: "member-b" });
  assert.equal(memberB.wallet.coins, 2000);
  assert.equal(memberB.inventory.characters.includes("nebula-nova"), false);
  assert.equal(memberB.appearance.equippedCharacterId, "buster-blitz");
});

test("Default outfit is free and unlocked, Warrior costs 250, and Royal costs 500", () => {
  assert.equal(OUTFIT_PRICES["outfit-default"], 0);
  assert.equal(OUTFIT_PRICES["outfit-warrior"], 250);
  assert.equal(OUTFIT_PRICES["outfit-royal"], 500);

  const clientWardrobe = fs.readFileSync(path.join(__dirname, "..", "characterverse", "src", "data", "wardrobe.js"), "utf8");
  assert.match(clientWardrobe, /id:\s*['"]outfit-default['"]/);
  assert.match(clientWardrobe, /price:\s*['"]Free['"]/);
  assert.match(clientWardrobe, /id:\s*['"]outfit-warrior['"]/);
  assert.match(clientWardrobe, /priceCoins:\s*250/);
  assert.match(clientWardrobe, /id:\s*['"]outfit-royal['"]/);
  assert.match(clientWardrobe, /priceCoins:\s*500/);
});

test("server-authoritative purchase rejects unlocking Warrior or Royal if coins are insufficient", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "member-poor");
  await collection.updateOne({ _id: "member-poor" }, { $set: { "wallet.coins": 200 } });

  // Warrior costs 250; 200 is insufficient
  const resultWarrior = await purchase(collection, "member-poor", "outfit", "outfit-warrior");
  assert.equal(resultWarrior.error, "INSUFFICIENT_COINS");

  // Royal costs 500; 200 is insufficient
  const resultRoyal = await purchase(collection, "member-poor", "outfit", "outfit-royal");
  assert.equal(resultRoyal.error, "INSUFFICIENT_COINS");

  const doc = await collection.findOne({ _id: "member-poor" });
  assert.equal(doc.wallet.coins, 200);
  assert.deepEqual(doc.inventory.outfits, ["outfit-default"]);
});

test("purchasing Warrior outfit deducts 250 coins, unlocks it, equips it, and is idempotent", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "member-hero");
  await collection.updateOne({ _id: "member-hero" }, { $set: { "wallet.coins": 1000 } });

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

  const result = await purchase(collection, "member-hero", "outfit", "outfit-warrior", new Date("2026-10-26T00:00:00Z"), ledger);
  assert.ok(result.profile);
  assert.equal(result.profile.wallet.coins, 750);
  assert.ok(result.profile.inventory.outfits.includes("outfit-warrior"));
  assert.equal(result.profile.appearance.equippedOutfits["buster-blitz"], "outfit-warrior");

  // Idempotent retry: does not charge again
  const retry = await purchase(collection, "member-hero", "outfit", "outfit-warrior", new Date("2026-10-26T00:00:01Z"), ledger);
  assert.ok(retry.profile);
  assert.equal(retry.profile.wallet.coins, 750);
});

test("purchasing Royal outfit deducts 500 coins, unlocks it, equips it, and is idempotent", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "member-noble");
  await collection.updateOne({ _id: "member-noble" }, { $set: { "wallet.coins": 605 } });

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

  const result = await purchase(collection, "member-noble", "outfit", "outfit-royal", new Date("2026-10-26T00:00:00Z"), ledger);
  assert.ok(result.profile);
  assert.equal(result.profile.wallet.coins, 105);
  assert.ok(result.profile.inventory.outfits.includes("outfit-royal"));
  assert.equal(result.profile.appearance.equippedOutfits["buster-blitz"], "outfit-royal");

  // Idempotent retry: does not charge again
  const retry = await purchase(collection, "member-noble", "outfit", "outfit-royal", new Date("2026-10-26T00:00:01Z"), ledger);
  assert.ok(retry.profile);
  assert.equal(retry.profile.wallet.coins, 105);
});

test("players cannot equip an unowned outfit, and switching between unlocked outfits is free", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "member-test");
  await collection.updateOne({ _id: "member-test" }, { $set: { "wallet.coins": 500 } });

  // Unowned outfit equip rejected
  const invalidEquip = await saveAppearance(collection, "member-test", {
    equippedOutfits: { "buster-blitz": "outfit-warrior" }
  });
  assert.equal(invalidEquip.error, "INVALID_APPEARANCE");

  // Purchase Warrior
  await purchase(collection, "member-test", "outfit", "outfit-warrior");

  // Free switch back to Default
  const switchToDefault = await saveAppearance(collection, "member-test", {
    equippedOutfits: { "buster-blitz": "outfit-default" }
  });
  assert.ok(switchToDefault.profile);
  assert.equal(switchToDefault.profile.appearance.equippedOutfits["buster-blitz"], "outfit-default");
  assert.equal(switchToDefault.profile.wallet.coins, 250); // Balance unchanged by equip

  // Free switch back to Warrior
  const switchToWarrior = await saveAppearance(collection, "member-test", {
    equippedOutfits: { "buster-blitz": "outfit-warrior" }
  });
  assert.ok(switchToWarrior.profile);
  assert.equal(switchToWarrior.profile.appearance.equippedOutfits["buster-blitz"], "outfit-warrior");
  assert.equal(switchToWarrior.profile.wallet.coins, 250); // Balance unchanged by equip
});

test("cross-player isolation: Player A unlocking an outfit does not unlock it or charge Player B", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "player-a");
  await ensureProfile(collection, "player-b");
  await collection.updateOne({ _id: "player-a" }, { $set: { "wallet.coins": 500 } });
  await collection.updateOne({ _id: "player-b" }, { $set: { "wallet.coins": 500 } });

  // Player A buys Warrior
  await purchase(collection, "player-a", "outfit", "outfit-warrior");

  const playerA = await collection.findOne({ _id: "player-a" });
  assert.equal(playerA.wallet.coins, 250);
  assert.ok(playerA.inventory.outfits.includes("outfit-warrior"));

  const playerB = await collection.findOne({ _id: "player-b" });
  assert.equal(playerB.wallet.coins, 500);
  assert.equal(playerB.inventory.outfits.includes("outfit-warrior"), false);
  assert.deepEqual(playerB.inventory.outfits, ["outfit-default"]);
});

test("outfit unlocks and equipped outfit persist across reloads", async () => {
  const collection = createMemoryProfileCollection();
  await ensureProfile(collection, "player-persist");
  await collection.updateOne({ _id: "player-persist" }, { $set: { "wallet.coins": 600 } });

  await purchase(collection, "player-persist", "outfit", "outfit-warrior");

  // Reload profile from collection
  const reloaded = await collection.findOne({ _id: "player-persist" });
  assert.ok(reloaded.inventory.outfits.includes("outfit-warrior"));
  assert.equal(reloaded.appearance.equippedOutfits["buster-blitz"], "outfit-warrior");
});
