"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  starterProfile,
  validateAppearance,
  purchase,
  CHARACTER_PRICES
} = require("../characterverse-profiles");

function createMockCollection(initialDocs = []) {
  const docs = new Map(initialDocs.map(d => [d._id, JSON.parse(JSON.stringify(d))]));
  return {
    async findOne(query) {
      if (query._id && docs.has(query._id)) return JSON.parse(JSON.stringify(docs.get(query._id)));
      return null;
    },
    async updateOne(query, update, options = {}) {
      let doc = docs.get(query._id);
      if (!doc && options.upsert && update.$setOnInsert) {
        doc = JSON.parse(JSON.stringify(update.$setOnInsert));
        doc._id = query._id;
        docs.set(query._id, doc);
        return { acknowledged: true, upsertedCount: 1 };
      }
      if (!doc) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
      if (update.$set) Object.assign(doc, JSON.parse(JSON.stringify(update.$set)));
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
    },
    async findOneAndUpdate(filter, update, options = {}) {
      const doc = docs.get(filter._id);
      if (!doc) return null;
      if (filter["wallet.coins"] && filter["wallet.coins"].$gte !== undefined) {
        if ((doc.wallet?.coins ?? 0) < filter["wallet.coins"].$gte) return null;
      }
      if (filter["inventory.characters"] && filter["inventory.characters"].$ne) {
        if (doc.inventory?.characters?.includes(filter["inventory.characters"].$ne)) return null;
      }
      if (update.$inc && update.$inc["wallet.coins"] !== undefined) {
        doc.wallet = doc.wallet || { coins: 0 };
        doc.wallet.coins += update.$inc["wallet.coins"];
      }
      if (update.$addToSet && update.$addToSet["inventory.characters"]) {
        doc.inventory = doc.inventory || {};
        doc.inventory.characters = doc.inventory.characters || [];
        if (!doc.inventory.characters.includes(update.$addToSet["inventory.characters"])) {
          doc.inventory.characters.push(update.$addToSet["inventory.characters"]);
        }
      }
      if (update.$set) {
        for (const [k, v] of Object.entries(update.$set)) {
          if (k.startsWith("appearance.")) {
            const prop = k.split(".")[1];
            doc.appearance = doc.appearance || {};
            doc.appearance[prop] = v;
          } else {
            doc[k] = v;
          }
        }
      }
      return options.returnDocument === "after" ? JSON.parse(JSON.stringify(doc)) : doc;
    }
  };
}

test("Superman requirement 1: CHARACTER_PRICES is exactly 2000 for superman", () => {
  assert.equal(CHARACTER_PRICES["superman"], 2000, "Superman purchase price must be 2000 coins");
});

test("Superman requirement 2: client characters.js registers Superman as Legendary with 2000 coins", () => {
  const charactersFile = fs.readFileSync(path.join(__dirname, "..", "characterverse", "src", "data", "characters.js"), "utf8");
  assert.match(charactersFile, /id:\s*["']superman["']/);
  assert.match(charactersFile, /name:\s*["']Superman["']/);
  assert.match(charactersFile, /rarity:\s*["']LEGENDARY["']/);
  assert.match(charactersFile, /price:\s*2000/);
});

test("Superman requirement 3: appearance validation accepts superman when owned and rejects unowned", () => {
  const profile = starterProfile("member-test");
  // Not owned initially
  const unownedResult = validateAppearance({ selectedCharacterId: "superman" }, profile);
  assert.equal(unownedResult, null, "Should reject selecting unowned superman");

  // When owned
  profile.inventory.characters.push("superman");
  const ownedResult = validateAppearance({ selectedCharacterId: "superman" }, profile);
  assert.ok(ownedResult, "Should accept selecting owned superman");
  assert.equal(ownedResult.selectedCharacterId, "superman");
});

test("Superman requirement 4: Superman strictly rejects Warrior Mode and Royal Mode", () => {
  const profile = starterProfile("member-superman");
  profile.inventory.characters.push("superman");
  profile.inventory.outfits.push("outfit-warrior", "outfit-royal");

  // Default outfit is accepted
  const defaultRes = validateAppearance({ equippedOutfits: { "superman": "outfit-default" } }, profile);
  assert.ok(defaultRes, "Superman should support outfit-default");

  // Warrior outfit is rejected
  const warriorRes = validateAppearance({ equippedOutfits: { "superman": "outfit-warrior" } }, profile);
  assert.equal(warriorRes, null, "Superman must NOT support outfit-warrior");

  // Royal outfit is rejected
  const royalRes = validateAppearance({ equippedOutfits: { "superman": "outfit-royal" } }, profile);
  assert.equal(royalRes, null, "Superman must NOT support outfit-royal");

  // Other characters still support warrior and royal
  const busterRes = validateAppearance({ equippedOutfits: { "buster-blitz": "outfit-warrior" } }, profile);
  assert.ok(busterRes, "Buster Blitz must continue supporting outfit-warrior");
});

test("Superman requirement 5: purchase rejects when player has < 2000 coins and succeeds with 2000 coins", async () => {
  const poorDoc = starterProfile("poor-player");
  poorDoc.wallet.coins = 500;
  const richDoc = starterProfile("rich-player");
  richDoc.wallet.coins = 2500;

  const collection = createMockCollection([poorDoc, richDoc]);

  const fail = await purchase(collection, "poor-player", "character", "superman");
  assert.equal(fail.error, "INSUFFICIENT_COINS");

  const success = await purchase(collection, "rich-player", "character", "superman");
  assert.ok(success.profile);
  assert.equal(success.profile.wallet.coins, 500); // 2500 - 2000
  assert.ok(success.profile.inventory.characters.includes("superman"));
  assert.equal(success.profile.appearance.equippedCharacterId, "superman");
});

test("Superman flight mode: CharacterViewer, RaceArena, StudioControls, and StudioContext configure flight for superman", () => {
  const fs = require('fs');
  const viewerCode = fs.readFileSync('characterverse/src/components/viewer/CharacterViewer.jsx', 'utf8');
  const arenaCode = fs.readFileSync('characterverse/src/components/arena/RaceArena.jsx', 'utf8');
  const controlsCode = fs.readFileSync('characterverse/src/components/panels/StudioControls.jsx', 'utf8');
  const contextCode = fs.readFileSync('characterverse/src/context/StudioContext.jsx', 'utf8');

  // Verify CharacterViewer has Superman flight kinematics and dynamic cloth simulation
  assert.ok(viewerCode.includes("isSuperman && !isMounted"), "CharacterViewer must have dedicated flight kinematics branch for Superman");
  assert.ok(viewerCode.includes("Superman_Cape"), "CharacterViewer must reference Superman_Cape mesh for cloth dynamics");
  assert.ok(viewerCode.includes("Superman_Head"), "CharacterViewer must reference Superman_Head for hair dynamics");
  assert.ok(viewerCode.includes("flightOrbitX"), "CharacterViewer must calculate 3D flight trajectory through studio space");

  // Verify RaceArena gives Superman elevated flight clearance
  assert.ok(arenaCode.includes("const isSuperman = characterData?.id === 'superman'"), "RaceArena must detect Superman");
  assert.ok(arenaCode.includes("1.25"), "RaceArena must provide elevated flight clearance for Superman");

  // Verify StudioControls provides 'Test Flight' / 'Flight Mode (Active)' for Superman
  assert.ok(controlsCode.includes("Flight Mode (Active)"), "StudioControls must offer Flight Mode (Active) for Superman");
  assert.ok(controlsCode.includes("Test Flight"), "StudioControls must offer Test Flight for Superman");

  // Verify StudioContext announces Superman Flight Mode
  assert.ok(contextCode.includes("Superman Flight Mode activated"), "StudioContext must announce flight mode activation");
});
