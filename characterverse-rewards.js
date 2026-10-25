"use strict";

// Rewards are deliberately calculated from server-owned tracker documents only.
// There is currently no contest/PDF collection in this application; do not add
// contest rewards until a separately verified source is introduced.
const REWARDS = Object.freeze({ daily: 5, perfectWeek: 10, exactScore: 10, contestPdf: 10, perfectContest: 10 });
const WEEK_ONE_MONDAY = Date.UTC(2026, 6, 27);

function dateForSlot(week, slot) {
  const date = new Date(WEEK_ONE_MONDAY + ((week - 1) * 7 + slot) * 86400000);
  return date.toISOString().slice(0, 10);
}

function eventKey(memberId, category, sourceId) {
  return `characterverse:${category}:${memberId}:${sourceId}`;
}

function dailyEvent(memberId, week, slot) {
  const date = dateForSlot(week, slot);
  return { eventKey: eventKey(memberId, "daily-submission", date), memberId, category: "daily-submission", amount: REWARDS.daily, sourceId: `dashboard:week:${week}:slot:${slot}`, applicableDate: date, reason: `Verified daily submission for ${date}` };
}

function weekEvent(memberId, week) {
  const weekId = `week-${week}-${dateForSlot(week, 0)}`;
  return { eventKey: eventKey(memberId, "perfect-week", weekId), memberId, category: "perfect-week", amount: REWARDS.perfectWeek, sourceId: `dashboard:week:${week}`, applicablePeriod: weekId, reason: `Perfect required-submission week beginning ${dateForSlot(week, 0)}` };
}

function exactScoreEvent(memberId, week) {
  const weekId = `week-${week}-${dateForSlot(week, 0)}`;
  return { eventKey: eventKey(memberId, "exact-score", weekId), memberId, category: "exact-score", amount: REWARDS.exactScore, sourceId: `dashboard:week:${week}:exact-score`, applicablePeriod: weekId, reason: `Verified 100% (8/8) achievement for week beginning ${dateForSlot(week, 0)}` };
}

function isCompletedWeek({ statuses, slots }) {
  return slots.length > 0 && slots.every(slot => statuses?.[slot] === "done");
}

function calculateHistoricalRewards({ dashboard, scheduledSlots, currentDate }) {
  if (!dashboard || !Array.isArray(dashboard.members) || typeof scheduledSlots !== "function") throw new TypeError("A valid dashboard and schedule are required.");
  const result = {
    generatedAt: new Date().toISOString(),
    members: [],
    limitations: [
      "No contest submission/PDF or verified contest-score source exists in this deployment. Contest PDF and perfect-contest rewards are proposed as 0.",
      "In the DSA tracker scoring model (scoring.js), 100% achievement and an exact 8/8 score describe the exact same event (6 daily + 2 concept problems solved). It is credited once per week (+10 coins) to prevent double-counting mathematically identical events."
    ],
    totals: { dailySubmission: 0, perfectWeek: 0, exactScore: 0, contestPdf: 0, perfectContest: 0, coins: 0 }
  };
  const maxWeek = Math.max(0, Math.min(Number(dashboard.currentWeek) || 0, 27));
  for (const member of dashboard.members) {
    const record = { memberId: member.id, daily: [], perfectWeeks: [], exactScore: [], contestPdf: [], perfectContests: [], ineligible: [], unknown: [], events: [] };
    for (let week = 1; week <= maxWeek; week++) {
      const slots = scheduledSlots(week);
      if (!slots.length) {
        record.ineligible.push({ week, reason: "no-required-working-days" });
        continue;
      }
      const statuses = dashboard.weeks?.[String(week)]?.daily?.[member.id];
      if (!Array.isArray(statuses) || statuses.length !== 6) {
        record.unknown.push({ week, reason: "daily-status-unavailable" });
        continue;
      }
      const completedSlots = [];
      for (const slot of slots) {
        const date = dateForSlot(week, slot);
        if (currentDate && date >= currentDate) {
          record.unknown.push({ week, date, reason: "date-not-yet-historical" });
        } else if (statuses[slot] === "done") {
          const event = dailyEvent(member.id, week, slot);
          record.daily.push({ date, week, slot, coins: event.amount });
          record.events.push(event);
          completedSlots.push(slot);
        } else if (["blank", "absent"].includes(statuses[slot])) {
          record.ineligible.push({ week, date, reason: statuses[slot] === "blank" ? "unmarked" : "marked-absent" });
        } else {
          record.unknown.push({ week, date, reason: "unrecognized-status" });
        }
      }
      const finalRequiredDate = dateForSlot(week, Math.max(...slots));
      if (currentDate && finalRequiredDate >= currentDate) {
        record.unknown.push({ week, reason: "week-not-complete-yet" });
      } else {
        if (completedSlots.length === slots.length && isCompletedWeek({ statuses, slots })) {
          const event = weekEvent(member.id, week);
          record.perfectWeeks.push({ week, period: event.applicablePeriod, coins: event.amount });
          record.events.push(event);
        } else {
          record.ineligible.push({ week, reason: "required-daily-submission-missing" });
        }

        // Check 100% / exact 8 of 8 achievement (6 daily slots + 2 concepts all done)
        const conceptStatuses = dashboard.weeks?.[String(week)]?.concepts?.[member.id];
        const conceptsDone = Array.isArray(conceptStatuses) ? conceptStatuses.filter(s => s === "done").length : 0;
        if (completedSlots.length === 6 && conceptsDone === 2) {
          const event = exactScoreEvent(member.id, week);
          record.exactScore.push({ week, period: event.applicablePeriod, coins: event.amount });
          record.events.push(event);
        }
      }
    }
    record.totals = {
      dailySubmission: record.daily.length * REWARDS.daily,
      perfectWeek: record.perfectWeeks.length * REWARDS.perfectWeek,
      exactScore: record.exactScore.length * REWARDS.exactScore,
      contestPdf: 0,
      perfectContest: 0
    };
    record.totals.coins = Object.values(record.totals).reduce((sum, amount) => sum + amount, 0);
    result.members.push(record);
    result.totals.dailySubmission += record.totals.dailySubmission;
    result.totals.perfectWeek += record.totals.perfectWeek;
    result.totals.exactScore += record.totals.exactScore;
    result.totals.coins += record.totals.coins;
  }
  return result;
}

async function applyReward({ profiles, ledger, event, batchId = null, now = new Date() }) {
  const entry = { _id: event.eventKey, transactionId: event.eventKey, transactionType: "reward", ...event, status: "pending", createdAt: now, ...(batchId ? { batchId } : {}) };
  try { await ledger.insertOne(entry); } catch (error) { if (error?.code !== 11000) throw error; }
  // This recoverable protocol is safe without MongoDB transactions: the profile
  // remembers each applied key atomically with its increment. A retry can finish
  // a pending ledger entry, but can never increment that key twice.
  await profiles.updateOne(
    { _id: event.memberId, appliedRewardKeys: { $ne: event.eventKey } },
    { $inc: { "wallet.coins": event.amount }, $addToSet: { appliedRewardKeys: event.eventKey }, $set: { updatedAt: now } }
  );
  await ledger.updateOne({ _id: event.eventKey }, { $set: { status: "applied", appliedAt: now } });
  return ledger.findOne({ _id: event.eventKey });
}

async function awardTrustedDaily({ db, memberId, week, slot, scheduledSlots, ensureProfile, now = new Date() }) {
  if (!scheduledSlots(week).includes(slot)) return [];
  await ensureProfile(db.collection("characterVerseProfiles"), memberId, now);
  const events = [dailyEvent(memberId, week, slot)];
  const dashboard = await db.collection("dashboard").findOne({ _id: "shared" }, { projection: { weeks: 1 } });
  const statuses = dashboard?.weeks?.[String(week)]?.daily?.[memberId];
  const slots = scheduledSlots(week);
  if (isCompletedWeek({ statuses, slots })) events.push(weekEvent(memberId, week));
  return Promise.all(events.map(event => applyReward({ profiles: db.collection("characterVerseProfiles"), ledger: db.collection("characterVerseRewardLedger"), event, now })));
}

function publicLedgerEntry(entry) {
  return { transactionId: entry.transactionId || entry._id, eventKey: entry._id, transactionType: entry.transactionType || "reward", category: entry.category, amount: entry.amount, applicableDate: entry.applicableDate || null, applicablePeriod: entry.applicablePeriod || null, reason: entry.reason, appliedAt: entry.appliedAt || entry.createdAt };
}

module.exports = { REWARDS, dateForSlot, dailyEvent, weekEvent, exactScoreEvent, isCompletedWeek, calculateHistoricalRewards, applyReward, awardTrustedDaily, publicLedgerEntry };
