"use strict";

/**
 * scripts/reconcile-characterverse-balances.js
 *
 * Read-only historical CharacterVerse coin reconciliation report.
 * Reconciles reported balances with verified historical DSA submissions and
 * recorded, legitimate wallet movements.
 *
 * SAFETY GUARANTEES:
 * This script intentionally never changes a wallet, inventory, or ledger. An
 * operator must resolve every reported evidence gap before any separately
 * approved migration is designed and run.
 */

require("dotenv").config();
const { MongoClient } = require("mongodb");
const { calculateHistoricalRewards } = require("../characterverse-rewards");
const { scheduledSlots } = require("../tracker-calendar");
const { effectiveActivityDate } = require("../activity-date");

async function runReconciliation({ uri, logger = console }) {
  if (!uri) throw new Error("MONGODB_URI is required.");
  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db();
    const dashboard = await db.collection("dashboard").findOne({ _id: "shared" });
    if (!dashboard) throw new Error("dashboard document '_id: shared' not found.");

    const report = calculateHistoricalRewards({
      dashboard,
      scheduledSlots,
      // The tracker day rolls over at 05:30 IST; do not treat today's still
      // active slot as historical merely because UTC has crossed midnight.
      currentDate: effectiveActivityDate(Date.now() / 1000)
    });

    const memberIds = report.members.map((m) => m.memberId);
    const existingProfiles = await db
      .collection("characterVerseProfiles")
      .find({ _id: { $in: memberIds } })
      .toArray();
    const profileMap = new Map(existingProfiles.map((p) => [p._id, p]));

    const existingTransactions = await db
      .collection("characterVerseRewardLedger")
      .find({ memberId: { $in: memberIds } })
      .toArray();
    const transactionsByMember = new Map();
    for (const tx of existingTransactions) {
      const list = transactionsByMember.get(tx.memberId) || [];
      list.push(tx);
      transactionsByMember.set(tx.memberId, list);
    }

    logger.log("================================================================================");
    logger.log("DSA CHARACTERVERSE COIN RECONCILIATION [DRY-RUN / READ-ONLY]");
    logger.log("================================================================================");
    logger.log(`Target database: ${db.databaseName}`);
    logger.log(`Timestamp:       ${new Date().toISOString()}`);
    logger.log("--------------------------------------------------------------------------------");

    const plan = [];

    for (const member of report.members) {
      const profile = profileMap.get(member.memberId);
      const memberDoc = dashboard.members.find((m) => m.id === member.memberId);
      const name = memberDoc ? memberDoc.name.replace(/\s*\(ADMIN\)\s*$/i, "") : member.memberId;
      const history = transactionsByMember.get(member.memberId) || [];

      const currentCoins = profile ? (profile.wallet?.coins ?? 0) : 0;
      const verifiedEarnedCoins = member.totals.coins;
      const applied = history.filter(entry => entry.status === "applied");
      const purchases = applied.filter(entry => entry.transactionType === "purchase");
      const recordedSpending = purchases.reduce((sum, entry) => sum + Math.abs(Number(entry.amount) || 0), 0);
      const adjustments = applied.filter(entry => ["adjustment", "refund", "reconciliation"].includes(entry.transactionType));
      const recordedAdjustments = adjustments.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
      const expectedRewardKeys = new Set(member.events.map(event => event.eventKey));
      const unexplainedRewardEntries = applied.filter(entry => entry.transactionType === "reward" && !expectedRewardKeys.has(entry.eventKey || entry._id));
      const ownedPaidItems = [
        ...(profile?.inventory?.characters || []).filter(item => item !== "buster-blitz"),
        ...(profile?.inventory?.vehicles || []),
        ...(profile?.inventory?.vehicleUpgrades || [])
      ];
      const purchasedItemIds = new Set(purchases.map(entry => entry.sourceId));
      const evidenceGaps = [];
      if (ownedPaidItems.some(itemId => !purchasedItemIds.has(itemId))) evidenceGaps.push("paid-inventory-without-applied-purchase-ledger-entry");
      if (unexplainedRewardEntries.length) evidenceGaps.push("applied-reward-ledger-entry-not-derived-from-tracker-record");
      if (member.unknown.length) evidenceGaps.push("historical-tracker-record-incomplete-or-not-yet-final");
      const proposedFinalBalance = evidenceGaps.length
        ? null
        : verifiedEarnedCoins - recordedSpending + recordedAdjustments;
      const legacyStarterCredit = profile && currentCoins === 3250 && applied.length === 0 ? 3250 : 0;

      plan.push({
        memberId: member.memberId,
        name,
        profileExists: Boolean(profile),
        currentCoins,
        legacyStarterCredit,
        verifiedEarnedCoins,
        recordedSpending,
        recordedAdjustments,
        ownedPaidItems,
        evidenceGaps,
        proposedFinalBalance,
        eventsToApply: member.events.length,
        events: member.events
      });
    }

    logger.log(
      ["Member", "Profile?", "Current Coins", "Legacy Starter", "Verified Earned", "Recorded Spend", "Proposed Final"].join(" | ")
    );
    logger.log("--------------------------------------------------------------------------------");
    for (const item of plan) {
      logger.log(
        [
          item.name.padEnd(20),
          (item.profileExists ? "YES" : "NO").padEnd(8),
          String(item.currentCoins).padStart(13),
          String(item.legacyStarterCredit).padStart(14),
          String(item.verifiedEarnedCoins).padStart(15),
          String(item.recordedSpending).padStart(14),
          String(item.proposedFinalBalance).padStart(14)
        ].join(" | ")
      );
    }
    logger.log("--------------------------------------------------------------------------------");

    const unresolved = plan.filter(item => item.evidenceGaps.length);
    logger.log("\n[DRY RUN COMPLETE] No database modifications were made.");
    logger.log(`Unresolved evidence gaps: ${unresolved.length}.`);
    return { status: "dry-run", plan, unresolvedMemberIds: unresolved.map(item => item.memberId) };
  } finally {
    await client.close();
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes("--execute") || args.some(arg => arg.startsWith("--confirm-batch="))) {
    console.error("ERROR: This reconciliation script is permanently dry-run only and cannot modify production balances.");
    process.exit(1);
  }

  runReconciliation({
    uri: process.env.MONGODB_URI
  }).catch((err) => {
    console.error("Reconciliation failed:", err);
    process.exit(1);
  });
}

module.exports = { runReconciliation };
