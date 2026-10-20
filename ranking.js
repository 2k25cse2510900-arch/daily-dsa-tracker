"use strict";

function denseRanks(scores) {
  let rank = 0;
  let previousScore = null;
  return scores.map(score => {
    if (score !== previousScore) {
      rank += 1;
      previousScore = score;
    }
    return rank;
  });
}

function applyEligibleDenseRanks(rows, minimumScore = 6) {
  let rank = 0;
  let previousScore = null;
  for (const row of rows) {
    row.qualified = row.score >= minimumScore;
    if (!row.qualified) {
      row.rank = null;
      continue;
    }
    if (row.score !== previousScore) {
      rank += 1;
      previousScore = row.score;
    }
    row.rank = rank;
  }
  return rows;
}

module.exports = { denseRanks, applyEligibleDenseRanks };
