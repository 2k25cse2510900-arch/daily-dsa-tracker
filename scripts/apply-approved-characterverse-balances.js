"use strict";

/**
 * scripts/apply-approved-characterverse-balances.js
 *
 * Applies the explicitly approved CharacterVerse target balances to the database
 * with safety checks, automatic backup, idempotency, and audit trail.
 */

require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { MongoClient } = require("mongodb");
const { ensureProfile } = require("../characterverse-profiles");

const APPROVED_TARGETS = Object.freeze([
  { id: "member_mvggb1nmx303va", expectedName: "Krish", targetCoins: 5550, reason: "555 verified historical coins x 10 admin multiplier" },
  { id: "member_mvggbpb5y8e3h9", expectedName: "Kartik Kumar", targetCoins: 605, reason: "605 verified historical coins" },
  { id: "member_mvggcet3ogmjrn", expectedName: "Tanmay Awasthi", targetCoins: 290, reason: "290 verified historical coins" },
  { id: "member_mvggcs86gcby6t", expectedName: "Avantika Yadav", targetCoins: 375, reason: "375 verified historical coins" },
  { id: "member_mvggd5du6db87b", expectedName: "Kshitij Rajput", targetCoins: 235, reason: "235 verified historical coins" },
  { id: "member_mvggdgrdrgmkdf", expectedName: "Krishna Kumar Gaur", targetCoins: 160, reason: "160 verified historical coins" },
  { id: "member_mvggdw3xiz0d21", expectedName: "Kanika Dwivedi", targetCoins: 110, reason: "110 verified historical coins" },
  { id: "member_mvggeccjh94w6y", expectedName: "Deepanshu Sachan", targetCoins: 105, reason: "105 verified historical coins" },
]);

const TOTAL_EXPECTED_COINS = 7430;
const BATCH_ID = "FINAL-APPROVED-BATCH-20261026";

async function main() {
  const requiredConfirmation = `--apply-approved-batch=${BATCH_ID}`;
  if (process.argv[2] !== requiredConfirmation) {
    throw new Error(`Refusing to apply approved balances without ${requiredConfirmation}.`);
  }
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  try {
    const db = client.db();

    // ─── Step 1: Pre-flight Validations ───
    const dashboard = await db.collection("dashboard").findOne({ _id: "shared" });
    if (!dashboard) throw new Error("Dashboard shared document not found.");

    const dashboardMemberMap = new Map(dashboard.members.map(m => [m.id, m]));
    for (const target of APPROVED_TARGETS) {
      const match = dashboardMemberMap.get(target.id);
      if (!match) throw new Error(`Member ID ${target.id} not found in dashboard.`);
      const cleanName = match.name.replace(/\s*\(ADMIN\)\s*$/i, "").trim();
      if (!cleanName.toLowerCase().startsWith(target.expectedName.toLowerCase())) {
        throw new Error(`Name mismatch for ${target.id}: expected ${target.expectedName}, got ${match.name}`);
      }
    }

    const calculatedSum = APPROVED_TARGETS.reduce((sum, t) => sum + t.targetCoins, 0);
    if (calculatedSum !== TOTAL_EXPECTED_COINS) {
      throw new Error(`Integrity error: target sum ${calculatedSum} does not match expected ${TOTAL_EXPECTED_COINS}`);
    }

    const ledgerCol = db.collection("characterVerseRewardLedger");
    const existingBatchEntries = await ledgerCol.countDocuments({ batchId: BATCH_ID });
    if (existingBatchEntries > 0) {
      throw new Error(`Batch ${BATCH_ID} already has ${existingBatchEntries} ledger entries; refusing to apply it again.`);
    }

    // ─── Step 2: Create Restorable Backup ───
    const backupDir = path.join(__dirname, "..", "backups");
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const existingProfiles = await db.collection("characterVerseProfiles").find({}).toArray();
    const existingLedger = await db.collection("characterVerseRewardLedger").find({}).toArray();

    const backupTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFilePath = path.join(backupDir, `characterverse-backup-${backupTimestamp}.json`);

    fs.writeFileSync(
      backupFilePath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          batchId: BATCH_ID,
          characterVerseProfiles: existingProfiles,
          characterVerseRewardLedger: existingLedger,
        },
        null,
        2
      ),
      "utf8"
    );
    console.log(`[BACKUP CREATED] Saved ${existingProfiles.length} profiles and ${existingLedger.length} ledger rows to: ${backupFilePath}`);

    // ─── Step 3: Apply Reconciliations ───
    const now = new Date();
    const results = [];

    const profilesCol = db.collection("characterVerseProfiles");
    const auditCol = db.collection("audit");

    for (const target of APPROVED_TARGETS) {
      // Ensure profile exists through official factory
      await ensureProfile(profilesCol, target.id, now);

      const current = await profilesCol.findOne({ _id: target.id });
      const previousBalance = current?.wallet?.coins ?? 0;
      const adjustment = target.targetCoins - previousBalance;

      const txKey = `characterverse:reconciliation:${target.id}:${BATCH_ID}`;

      // Idempotent ledger record
      const ledgerEntry = {
        _id: txKey,
        transactionId: txKey,
        memberId: target.id,
        transactionType: "reconciliation",
        category: "approved-target-reconciliation",
        previousBalance,
        finalBalance: target.targetCoins,
        amount: adjustment,
        reason: target.reason,
        status: "applied",
        batchId: BATCH_ID,
        createdAt: now,
        appliedAt: now,
      };

      await ledgerCol.updateOne(
        { _id: txKey },
        { $setOnInsert: ledgerEntry },
        { upsert: true }
      );

      // Targeted, non-destructive atomic update of wallet balance only
      await profilesCol.updateOne(
        { _id: target.id },
        {
          $set: {
            "wallet.coins": target.targetCoins,
            updatedAt: now,
          },
          $addToSet: {
            walletTransactionKeys: txKey,
            appliedRewardKeys: txKey,
          },
        }
      );

      // Write to audit log
      await auditCol.insertOne({
        action: "characterverse_reconciliation_applied",
        memberId: target.id,
        memberName: target.expectedName,
        previousBalance,
        finalBalance: target.targetCoins,
        adjustment,
        batchId: BATCH_ID,
        timestamp: now,
      });

      results.push({
        id: target.id,
        name: target.expectedName,
        previousBalance,
        finalBalance: target.targetCoins,
        adjustment,
      });
    }

    // ─── Step 4: Verification of Database State ───
    console.log("\n================================================================================");
    console.log("RECONCILIATION COMPLETE — DATABASE VERIFICATION");
    console.log("================================================================================");

    let verifiedTotal = 0;
    const postProfiles = await profilesCol.find({ _id: { $in: APPROVED_TARGETS.map(t => t.id) } }).toArray();
    const postMap = new Map(postProfiles.map(p => [p._id, p]));

    for (const res of results) {
      const doc = postMap.get(res.id);
      const actualCoins = doc?.wallet?.coins;
      verifiedTotal += (actualCoins || 0);

      const isMatch = actualCoins === res.finalBalance;
      console.log(
        `${res.name.padEnd(20)} | Prev: ${String(res.previousBalance).padStart(5)} | Target: ${String(res.finalBalance).padStart(5)} | DB: ${String(actualCoins).padStart(5)} | ${isMatch ? "VERIFIED OK" : "MISMATCH ERROR"}`
      );
      if (!isMatch) {
        throw new Error(`Verification failure for ${res.name}: expected ${res.finalBalance}, got ${actualCoins}`);
      }
    }

    console.log("--------------------------------------------------------------------------------");
    console.log(`Total Persisted Coins in Database: ${verifiedTotal} (Expected: ${TOTAL_EXPECTED_COINS})`);
    if (verifiedTotal !== TOTAL_EXPECTED_COINS) {
      throw new Error(`Total balance mismatch: got ${verifiedTotal}, expected ${TOTAL_EXPECTED_COINS}`);
    }

    console.log("[SUCCESS] All 8 member wallets successfully updated and verified.");
  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
