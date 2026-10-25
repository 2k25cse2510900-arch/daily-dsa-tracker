"use strict";

// This catalog is deliberately server-owned for the Phase 1 purchasable items.
// Client catalog data is presentation only and must never decide a price or grant.
const STARTER_COINS = 0;
const DEFAULT_CHARACTER_ID = "buster-blitz";
const CHARACTER_IDS = new Set(["buster-blitz", "nebula-nova"]);
const CHARACTER_PRICES = Object.freeze({
  "nebula-nova": 2000
});
const OUTFIT_IDS = new Set(["outfit-default", "outfit-warrior", "outfit-royal"]);
const OUTFIT_PRICES = Object.freeze({
  "outfit-default": 0,
  "outfit-warrior": 250,
  "outfit-royal": 500
});
const COSMETIC_IDS = new Set([
  "head-blitz-visor", "head-headphones-dj", "head-crown-astral", "head-halo-nova", "head-cyber-horns", "head-space-helmet",
  "face-cyber-visor", "face-punk-goggles", "face-rebel-shades", "face-ninja-mask", "face-cyber-plate",
  "upper-racing-vest", "upper-star-core", "upper-lightning-bolt", "upper-bolted-armor", "upper-tactical-vest",
  "lower-track-pants", "lower-armored-greaves", "lower-cargo-joggers", "lower-cyber-stripes",
  "feet-aero-kicks", "feet-hover-boots", "feet-plasma-stompers", "feet-speed-wings",
  "back-dual-thruster", "back-flux-battery", "back-energy-wings", "back-cyber-katana", "back-hero-cape",
  "effect-cyan-sparks", "effect-solar-flare", "effect-lightning-storm"
]);
const VEHICLES = Object.freeze({
  "vehicle-bike": { baselinePrice: 40, price: 400, upgradeId: "bike-sparks", upgradeBaselinePrice: 25, upgradePrice: 250 },
  "vehicle-car": { baselinePrice: 90, price: 900, upgradeId: "car-coins", upgradeBaselinePrice: 50, upgradePrice: 500 },
  "vehicle-rocket": { baselinePrice: 150, price: 1500, upgradeId: "rocket-warp", upgradeBaselinePrice: 75, upgradePrice: 750 }
});
const EQUIPMENT_SLOTS = new Set(["head", "face", "upperBody", "lowerBody", "footwear", "backAccessory", "effect"]);
const COLOR_KEYS = new Set(["baseColor", "accentColor", "secondaryColor", "glowColor"]);

function starterProfile(memberId, now = new Date()) {
  return {
    _id: memberId,
    schemaVersion: 1,
    wallet: { coins: 0 },
    // The pre-existing no-price wardrobe remains starter content. Vehicles and
    // upgrades are the only Phase 1 purchasable catalog entries.
    inventory: {
      characters: [DEFAULT_CHARACTER_ID],
      cosmetics: [...COSMETIC_IDS],
      outfits: ["outfit-default"],
      vehicles: [],
      vehicleUpgrades: []
    },
    appearance: {
      selectedCharacterId: DEFAULT_CHARACTER_ID,
      equippedCharacterId: DEFAULT_CHARACTER_ID,
      equippedCosmetics: { [DEFAULT_CHARACTER_ID]: {} },
      equippedOutfits: { [DEFAULT_CHARACTER_ID]: "outfit-default" },
      customColors: {},
      equippedVehicleId: null,
      equippedVehicleUpgrades: {}
    },
    createdAt: now,
    updatedAt: now
  };
}

function publicProfile(profile) {
  return {
    schemaVersion: profile.schemaVersion,
    wallet: { coins: profile.wallet?.coins ?? 0 },
    inventory: profile.inventory,
    appearance: profile.appearance
  };
}

async function ensureProfile(collection, memberId, now = new Date()) {
  const starter = starterProfile(memberId, now);
  await collection.updateOne({ _id: memberId }, { $setOnInsert: starter }, { upsert: true });
  return collection.findOne({ _id: memberId });
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validHex(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function validateAppearance(input, profile) {
  if (!isPlainObject(input) || Object.keys(input).some(key => !["selectedCharacterId", "equippedCharacterId", "equippedCosmetics", "equippedOutfits", "customColors", "equippedVehicleId", "equippedVehicleUpgrades"].includes(key))) return null;
  const appearance = { ...profile.appearance };
  const ownedCharacters = new Set(profile.inventory?.characters || []);
  const ownedCosmetics = new Set(profile.inventory?.cosmetics || []);
  const ownedOutfits = new Set(profile.inventory?.outfits || []);
  const ownedVehicles = new Set(profile.inventory?.vehicles || []);
  const ownedUpgrades = new Set(profile.inventory?.vehicleUpgrades || []);

  for (const key of ["selectedCharacterId", "equippedCharacterId"]) {
    if (input[key] !== undefined) {
      if (!CHARACTER_IDS.has(input[key]) || !ownedCharacters.has(input[key])) return null;
      appearance[key] = input[key];
    }
  }
  if (input.equippedCosmetics !== undefined) {
    if (!isPlainObject(input.equippedCosmetics)) return null;
    const next = {};
    for (const [characterId, slots] of Object.entries(input.equippedCosmetics)) {
      if (!CHARACTER_IDS.has(characterId) || !ownedCharacters.has(characterId) || !isPlainObject(slots) || Object.keys(slots).some(slot => !EQUIPMENT_SLOTS.has(slot))) return null;
      next[characterId] = {};
      for (const [slot, itemId] of Object.entries(slots)) {
        if (itemId !== null && (!COSMETIC_IDS.has(itemId) || !ownedCosmetics.has(itemId))) return null;
        next[characterId][slot] = itemId;
      }
    }
    appearance.equippedCosmetics = next;
  }
  if (input.equippedOutfits !== undefined) {
    if (!isPlainObject(input.equippedOutfits)) return null;
    const next = {};
    for (const [characterId, outfitId] of Object.entries(input.equippedOutfits)) {
      if (!CHARACTER_IDS.has(characterId) || !ownedCharacters.has(characterId) || (outfitId !== null && (!OUTFIT_IDS.has(outfitId) || !ownedOutfits.has(outfitId)))) return null;
      next[characterId] = outfitId;
    }
    appearance.equippedOutfits = next;
  }
  if (input.customColors !== undefined) {
    if (!isPlainObject(input.customColors)) return null;
    const next = {};
    for (const [characterId, colors] of Object.entries(input.customColors)) {
      if (!CHARACTER_IDS.has(characterId) || !ownedCharacters.has(characterId) || !isPlainObject(colors) || Object.keys(colors).some(key => !COLOR_KEYS.has(key) || !validHex(colors[key]))) return null;
      next[characterId] = colors;
    }
    appearance.customColors = next;
  }
  if (input.equippedVehicleId !== undefined) {
    if (input.equippedVehicleId !== null && (!VEHICLES[input.equippedVehicleId] || !ownedVehicles.has(input.equippedVehicleId))) return null;
    appearance.equippedVehicleId = input.equippedVehicleId;
  }
  if (input.equippedVehicleUpgrades !== undefined) {
    if (!isPlainObject(input.equippedVehicleUpgrades)) return null;
    const next = {};
    for (const [vehicleId, upgradeId] of Object.entries(input.equippedVehicleUpgrades)) {
      if (!VEHICLES[vehicleId] || (upgradeId !== null && (VEHICLES[vehicleId].upgradeId !== upgradeId || !ownedUpgrades.has(upgradeId)))) return null;
      next[vehicleId] = upgradeId;
    }
    appearance.equippedVehicleUpgrades = next;
  }
  return appearance;
}

async function saveAppearance(collection, memberId, input, now = new Date()) {
  const profile = await ensureProfile(collection, memberId, now);
  const appearance = validateAppearance(input, profile);
  if (!appearance) return { error: "INVALID_APPEARANCE" };
  await collection.updateOne({ _id: memberId }, { $set: { appearance, updatedAt: now } });
  return { profile: await collection.findOne({ _id: memberId }) };
}

async function purchase(collection, memberId, kind, itemId, now = new Date(), ledger = null) {
  if (kind === "character") {
    const price = CHARACTER_PRICES[itemId];
    if (!CHARACTER_IDS.has(itemId) || !Number.isSafeInteger(price)) return { error: "UNKNOWN_ITEM" };
    await ensureProfile(collection, memberId, now);
    const transactionId = `characterverse:purchase:${memberId}:${kind}:${itemId}`;
    const ledgerEntry = {
      _id: transactionId, transactionId, memberId, transactionType: "purchase",
      category: kind, amount: -price, sourceId: itemId, reason: `Purchased character ${itemId}`,
      status: "pending", createdAt: now
    };
    if (ledger) await ledger.updateOne({ _id: transactionId }, { $setOnInsert: ledgerEntry }, { upsert: true });
    const filter = { _id: memberId, "wallet.coins": { $gte: price }, "inventory.characters": { $ne: itemId } };
    const result = await collection.findOneAndUpdate(
      filter,
      {
        $inc: { "wallet.coins": -price },
        $addToSet: { "inventory.characters": itemId, walletTransactionKeys: transactionId },
        $set: { "appearance.selectedCharacterId": itemId, "appearance.equippedCharacterId": itemId, updatedAt: now }
      },
      { returnDocument: "after" }
    );
    if (result) {
      if (ledger) {
        await ledger.updateOne({ _id: transactionId }, { $set: { status: "applied", appliedAt: now } });
      }
      return { profile: result };
    }
    const current = await collection.findOne({ _id: memberId }, { projection: { wallet: 1, inventory: 1, walletTransactionKeys: 1, appearance: 1 } });
    if (current?.inventory?.characters?.includes(itemId)) {
      if (ledger && current.walletTransactionKeys?.includes(transactionId)) {
        await ledger.updateOne({ _id: transactionId }, { $set: { status: "applied", appliedAt: now } });
        return { profile: current };
      }
      return { error: "ALREADY_OWNED" };
    }
    if (ledger) await ledger.deleteOne({ _id: transactionId, status: "pending" });
    return { error: "INSUFFICIENT_COINS" };
  }

  if (kind === "outfit") {
    const price = OUTFIT_PRICES[itemId];
    if (!OUTFIT_IDS.has(itemId) || itemId === "outfit-default" || !Number.isSafeInteger(price)) {
      return { error: "UNKNOWN_ITEM" };
    }
    await ensureProfile(collection, memberId, now);
    const transactionId = `characterverse:purchase:${memberId}:${kind}:${itemId}`;
    const ledgerEntry = {
      _id: transactionId, transactionId, memberId, transactionType: "purchase",
      category: kind, amount: -price, sourceId: itemId, reason: `Purchased outfit ${itemId}`,
      status: "pending", createdAt: now
    };
    if (ledger) await ledger.updateOne({ _id: transactionId }, { $setOnInsert: ledgerEntry }, { upsert: true });
    const filter = { _id: memberId, "wallet.coins": { $gte: price }, "inventory.outfits": { $ne: itemId } };

    const existing = await collection.findOne({ _id: memberId });
    const selectedCharId = existing?.appearance?.selectedCharacterId || DEFAULT_CHARACTER_ID;

    const result = await collection.findOneAndUpdate(
      filter,
      {
        $inc: { "wallet.coins": -price },
        $addToSet: { "inventory.outfits": itemId, walletTransactionKeys: transactionId },
        $set: { [`appearance.equippedOutfits.${selectedCharId}`]: itemId, updatedAt: now }
      },
      { returnDocument: "after" }
    );
    if (result) {
      if (ledger) {
        await ledger.updateOne({ _id: transactionId }, { $set: { status: "applied", appliedAt: now } });
      }
      return { profile: result };
    }
    const current = await collection.findOne({ _id: memberId }, { projection: { wallet: 1, inventory: 1, walletTransactionKeys: 1, appearance: 1 } });
    if (current?.inventory?.outfits?.includes(itemId)) {
      if (ledger && current.walletTransactionKeys?.includes(transactionId)) {
        await ledger.updateOne({ _id: transactionId }, { $set: { status: "applied", appliedAt: now } });
        return { profile: current };
      }
      return { error: "ALREADY_OWNED" };
    }
    if (ledger) await ledger.deleteOne({ _id: transactionId, status: "pending" });
    return { error: "INSUFFICIENT_COINS" };
  }

  const vehicle = kind === "vehicle" ? VEHICLES[itemId] : Object.values(VEHICLES).find(candidate => candidate.upgradeId === itemId);
  const price = kind === "vehicle" ? vehicle?.price : vehicle?.upgradePrice;
  const inventoryField = kind === "vehicle" ? "inventory.vehicles" : "inventory.vehicleUpgrades";
  const equipmentField = kind === "vehicle" ? "appearance.equippedVehicleId" : `appearance.equippedVehicleUpgrades.${Object.keys(VEHICLES).find(id => VEHICLES[id] === vehicle)}`;
  if (!vehicle || !Number.isSafeInteger(price)) return { error: "UNKNOWN_ITEM" };
  await ensureProfile(collection, memberId, now);
  // A single MongoDB document update is atomic: the balance, ownership, and
  // equipped state are changed together only if its conditional filter matches.
  const requiredVehicleId = kind === "upgrade" ? Object.keys(VEHICLES).find(id => VEHICLES[id] === vehicle) : null;
  const transactionId = `characterverse:purchase:${memberId}:${kind}:${itemId}`;
  const ledgerEntry = {
    _id: transactionId, transactionId, memberId, transactionType: "purchase",
    category: kind, amount: -price, sourceId: itemId, reason: `Purchased ${itemId}`,
    status: "pending", createdAt: now
  };
  // Record an idempotency marker before changing the wallet. If the audit
  // database write fails, no wallet debit occurs. The profile update itself is
  // a single-document atomic operation, so concurrent purchase attempts can
  // debit and grant ownership at most once.
  if (ledger) await ledger.updateOne({ _id: transactionId }, { $setOnInsert: ledgerEntry }, { upsert: true });
  const filter = { _id: memberId, "wallet.coins": { $gte: price }, [inventoryField]: { $ne: itemId } };
  if (requiredVehicleId) filter["inventory.vehicles"] = requiredVehicleId;
  const result = await collection.findOneAndUpdate(
    filter,
    { $inc: { "wallet.coins": -price }, $addToSet: { [inventoryField]: itemId, walletTransactionKeys: transactionId }, $set: { [equipmentField]: itemId, updatedAt: now } },
    { returnDocument: "after" }
  );
  if (result) {
    if (ledger) {
      await ledger.updateOne({ _id: transactionId }, { $set: { status: "applied", appliedAt: now } });
    }
    return { profile: result };
  }
  const current = await collection.findOne({ _id: memberId }, { projection: { wallet: 1, inventory: 1, walletTransactionKeys: 1, appearance: 1 } });
  if (current?.inventory) {
    const items = kind === "vehicle" ? current.inventory?.vehicles : current.inventory?.vehicleUpgrades;
    if (items?.includes(itemId)) {
      // A retry after an interrupted ledger-finalization sees the already
      // atomic purchase and completes its audit record without charging again.
      if (ledger && current.walletTransactionKeys?.includes(transactionId)) {
        await ledger.updateOne({ _id: transactionId }, { $set: { status: "applied", appliedAt: now } });
        return { profile: current };
      }
      return { error: "ALREADY_OWNED" };
    }
  }
  if (ledger) await ledger.deleteOne({ _id: transactionId, status: "pending" });
  if (requiredVehicleId && !current?.inventory?.vehicles?.includes(requiredVehicleId)) return { error: "REQUIRES_VEHICLE" };
  return { error: "INSUFFICIENT_COINS" };
}

module.exports = { STARTER_COINS, VEHICLES, CHARACTER_PRICES, OUTFIT_PRICES, starterProfile, publicProfile, ensureProfile, validateAppearance, saveAppearance, purchase };
