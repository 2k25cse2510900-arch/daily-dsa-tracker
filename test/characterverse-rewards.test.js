"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { calculateHistoricalRewards, applyReward, dateForSlot, dailyEvent } = require("../characterverse-rewards");

const allDays = () => ["done", "done", "done", "done", "done", "done"];
const schedule = week => week === 2 ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5];
function report(weeks, currentDate = "2026-08-31") {
  return calculateHistoricalRewards({ dashboard: { members: [{ id: "member-1" }], weeks, currentWeek: 2 }, scheduledSlots: schedule, currentDate });
}

test("one verified daily Done earns exactly 5 coins", () => {
  const value = report({ "1": { daily: { "member-1": ["done", "blank", "blank", "blank", "blank", "blank"] } } });
  assert.equal(value.members[0].totals.dailySubmission, 5);
  assert.equal(value.members[0].totals.perfectWeek, 0);
});

test("a complete required week earns daily rewards plus one perfect-week reward", () => {
  const value = report({ "1": { daily: { "member-1": allDays() } }, "2": { daily: { "member-1": ["blank", "blank", "blank", "blank", "blank", "blank"] } } });
  assert.equal(value.members[0].totals.dailySubmission, 30);
  assert.equal(value.members[0].totals.perfectWeek, 10);
});

test("an incomplete week never receives a perfect-week reward and configured non-working slots are excluded", () => {
  const value = report({ "1": { daily: { "member-1": ["done", "done", "done", "done", "done", "blank"] } }, "2": { daily: { "member-1": ["done", "done", "done", "done", "done", "blank"] } } });
  assert.equal(value.members[0].perfectWeeks.length, 1); // week 2 has only five required slots
  assert.equal(value.members[0].daily.length, 10);
});

test("missing historical status is reported as unknown and contest bonuses are not invented", () => {
  const value = report({ "1": { daily: {} } });
  assert.equal(value.members[0].unknown[0].reason, "daily-status-unavailable");
  assert.equal(value.totals.contestPdf, 0);
  assert.equal(value.totals.perfectContest, 0);
  assert.deepEqual(value.members[0].contestPdf, []);
  assert.deepEqual(value.members[0].perfectContests, []);
  assert.match(value.limitations[0], /No contest submission/);
});

test("reward keys use the stable member and logical date", () => {
  const event = dailyEvent("member-1", 1, 0);
  assert.equal(event.applicableDate, dateForSlot(1, 0));
  assert.match(event.eventKey, /daily-submission:member-1:2026-07-27$/);
});

test("retries and concurrent duplicate attempts increment a reward only once", async () => {
  const rows = new Map();
  const ledger = {
    async insertOne(doc) { if (rows.has(doc._id)) { const error = new Error("duplicate"); error.code = 11000; throw error; } rows.set(doc._id, { ...doc }); },
    async updateOne(filter, update) { Object.assign(rows.get(filter._id), update.$set); },
    async findOne(filter) { return rows.get(filter._id); }
  };
  const profile = { _id: "member-1", wallet: { coins: 100 }, appliedRewardKeys: [] };
  const profiles = {
    async updateOne(filter, update) {
      if (profile._id !== filter._id || profile.appliedRewardKeys.includes(filter.appliedRewardKeys.$ne)) return { matchedCount: 0 };
      profile.wallet.coins += update.$inc["wallet.coins"];
      profile.appliedRewardKeys.push(update.$addToSet.appliedRewardKeys);
      return { matchedCount: 1 };
    }
  };
  const event = dailyEvent("member-1", 1, 0);
  await Promise.all([applyReward({ profiles, ledger, event }), applyReward({ profiles, ledger, event })]);
  assert.equal(profile.wallet.coins, 105);
  assert.equal(rows.get(event.eventKey).status, "applied");
});

test("a full week with all 6 daily submissions and 2 concepts done earns exact 8/8 score bonus (+10)", () => {
  const value = calculateHistoricalRewards({
    dashboard: {
      members: [{ id: "member-1" }],
      weeks: {
        "1": {
          daily: { "member-1": allDays() },
          concepts: { "member-1": ["done", "done"] }
        }
      },
      currentWeek: 1
    },
    scheduledSlots: schedule,
    currentDate: "2026-08-31"
  });
  assert.equal(value.members[0].totals.dailySubmission, 30);
  assert.equal(value.members[0].totals.perfectWeek, 10);
  assert.equal(value.members[0].totals.exactScore, 10);
  assert.equal(value.members[0].totals.coins, 50);
});
