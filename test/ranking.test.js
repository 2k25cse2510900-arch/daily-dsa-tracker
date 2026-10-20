"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { denseRanks, applyEligibleDenseRanks } = require("../ranking");
const { scoreWeek } = require("../scoring");

test("weekly score counts only explicit done statuses", () => {
  assert.deepEqual(scoreWeek(Array(6).fill("done"), Array(2).fill("done")), { dailyDone: 6, conceptsDone: 2, score: 8, percent: 100 });
  assert.deepEqual(scoreWeek(Array(6).fill("blank"), Array(2).fill("absent")), { dailyDone: 0, conceptsDone: 0, score: 0, percent: 0 });
  assert.deepEqual(scoreWeek(["done", "blank", "absent", "done", "unknown", "blank"], ["done", "absent"]), { dailyDone: 2, conceptsDone: 1, score: 3, percent: 38 });
});

test("dense rank sequences skip no positions after ties", () => {
  assert.deepEqual(denseRanks([8, 8, 8, 7, 4, 2, 2, 0]), [1, 1, 1, 2, 3, 4, 4, 5]);
  assert.deepEqual(denseRanks([8, 7, 7, 7, 6]), [1, 2, 2, 2, 3]);
  assert.deepEqual(denseRanks([5, 5, 5, 5]), [1, 1, 1, 1]);
  assert.deepEqual(denseRanks([0, 0, 0]), [1, 1, 1]);
});

test("only scores at or above six receive eligible ranks", () => {
  const rows = [8, 8, 7, 6, 5, 0].map(score => ({ score }));
  applyEligibleDenseRanks(rows, 6);
  assert.deepEqual(rows.map(row => row.rank), [1, 1, 2, 3, null, null]);
  assert.deepEqual(rows.map(row => row.qualified), [true, true, true, true, false, false]);
});
