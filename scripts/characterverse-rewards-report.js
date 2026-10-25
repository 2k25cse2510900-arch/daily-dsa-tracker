"use strict";

require("dotenv").config();
const { MongoClient } = require("mongodb");
const { calculateHistoricalRewards } = require("../characterverse-rewards");
const { scheduledSlots } = require("../tracker-calendar");
const { effectiveActivityDate } = require("../activity-date");

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  try {
    const db = client.db();
    const dashboard = await db.collection("dashboard").findOne({ _id: "shared" });
    if (!dashboard) throw new Error("dashboard.shared was not found.");
    const report = calculateHistoricalRewards({ dashboard, scheduledSlots, currentDate: effectiveActivityDate(Date.now() / 1000) });
    const profiles = await db.collection("characterVerseProfiles").find({ _id: { $in: report.members.map(member => member.memberId) } }, { projection: { wallet: 1, inventory: 1, appearance: 1 } }).toArray();
    const profilesById = new Map(profiles.map(profile => [profile._id, profile]));
    const transactions = await db.collection("characterVerseRewardLedger").find({ memberId: { $in: report.members.map(member => member.memberId) }, status: "applied" }).toArray();
    const transactionsByMember = new Map();
    for (const transaction of transactions) transactionsByMember.set(transaction.memberId, [...(transactionsByMember.get(transaction.memberId) || []), transaction]);
    for (const member of report.members) {
      const profile = profilesById.get(member.memberId);
      const history = transactionsByMember.get(member.memberId) || [];
      const spending = history.filter(entry => entry.transactionType === "purchase").reduce((sum, entry) => sum + Math.abs(Number(entry.amount) || 0), 0);
      const adjustments = history.filter(entry => ["refund", "adjustment", "reconciliation"].includes(entry.transactionType)).reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
      const ownedPaidItems = [
        ...(profile?.inventory?.characters || []).filter(item => item !== "buster-blitz"),
        ...(profile?.inventory?.vehicles || []),
        ...(profile?.inventory?.vehicleUpgrades || [])
      ];
      const purchasedItemIds = new Set(history.filter(entry => entry.transactionType === "purchase").map(entry => entry.sourceId));
      const expectedRewardKeys = new Set(member.events.map(event => event.eventKey));
      member.displayName = dashboard.members.find(candidate => candidate.id === member.memberId)?.name || null;
      member.profileExists = Boolean(profile);
      member.existingBalance = profile ? profile.wallet?.coins ?? 0 : null;
      member.identifiableStarterCredit = profile?.wallet?.coins === 3250 && history.length === 0 ? 3250 : 0;
      member.recordedSpending = spending;
      member.recordedAdjustments = adjustments;
      member.ownedPaidItems = ownedPaidItems;
      member.reconciliationIssues = [];
      if (ownedPaidItems.some(itemId => !purchasedItemIds.has(itemId))) member.reconciliationIssues.push("paid-inventory-without-applied-purchase-ledger-entry");
      if (history.some(entry => entry.transactionType === "reward" && !expectedRewardKeys.has(entry.eventKey || entry._id))) member.reconciliationIssues.push("applied-reward-ledger-entry-not-derived-from-tracker-record");
      if (member.unknown.length) member.reconciliationIssues.push("historical-tracker-record-incomplete-or-not-yet-final");
      member.proposedStartingBalance = 0;
      member.proposedFinalBalance = member.reconciliationIssues.length ? null : member.totals.coins - spending + adjustments;
    }
    const output = process.argv.includes("--summary") ? {
      generatedAt: report.generatedAt,
      limitations: report.limitations,
      totals: report.totals,
      members: report.members.map(member => ({
        memberId: member.memberId,
        displayName: member.displayName,
        profileExists: member.profileExists,
        existingBalance: member.existingBalance,
        proposedStartingBalance: member.proposedStartingBalance,
        proposedFinalBalance: member.proposedFinalBalance,
        identifiableStarterCredit: member.identifiableStarterCredit,
        recordedSpending: member.recordedSpending,
        recordedAdjustments: member.recordedAdjustments,
        ownedPaidItems: member.ownedPaidItems,
        reconciliationIssues: member.reconciliationIssues,
        totals: member.totals,
        verifiedDailySubmissions: member.daily.length,
        verifiedPerfectWeeks: member.perfectWeeks.length,
        verifiedExactScoreWeeks: member.exactScore ? member.exactScore.length : 0,
        ineligibleRecords: member.ineligible.length,
        unknownRecords: member.unknown.length
      }))
    } : report;
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } finally { await client.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
