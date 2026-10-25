"use strict";

// Named, declarative index manifest keeps initialization auditable and lets us
// report precisely which immutable schema operation failed.
const INDEXES = Object.freeze([
  { collection: "sessions", name: "expires_1", key: { expires: 1 }, options: { expireAfterSeconds: 0 } },
  { collection: "rateLimits", name: "expiresAt_1", key: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  { collection: "admins", name: "email_1", key: { email: 1 }, options: { unique: true } },
  { collection: "memberAuthLinks", name: "firebaseUid_1", key: { firebaseUid: 1 }, options: { unique: true, sparse: true } },
  { collection: "memberAuthLinks", name: "email_1", key: { email: 1 }, options: { unique: true, partialFilterExpression: { email: { $type: "string" } } } },
  { collection: "memberProfiles", name: "firebaseUid_1", key: { firebaseUid: 1 }, options: { unique: true } },
  { collection: "characterVerseProfiles", name: "updatedAt_1", key: { updatedAt: 1 }, options: {} },
  // MongoDB creates _id_ automatically. Explicitly recreating it with unique:
  // true is invalid (server code 197) on the configured MongoDB deployment.
  { collection: "characterVerseRewardLedger", name: "memberId_1_appliedAt_-1", key: { memberId: 1, appliedAt: -1 }, options: {} },
  { collection: "audit", name: "at_1", key: { at: 1 }, options: { expireAfterSeconds: 90 * 24 * 60 * 60 } },
  { collection: "leetcodeSubmissions", name: "memberId_1_activityDate_1", key: { memberId: 1, activityDate: 1 }, options: {} }
]);

async function createRequiredIndexes(db) {
  for (const definition of INDEXES) {
    try {
      await db.collection(definition.collection).createIndex(definition.key, { name: definition.name, ...definition.options });
    } catch (error) {
      error.indexOperation = { collection: definition.collection, name: definition.name, key: definition.key, options: definition.options };
      throw error;
    }
  }
}

module.exports = { INDEXES, createRequiredIndexes };
