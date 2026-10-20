"use strict";

function scoreWeek(dailyStatuses, conceptStatuses) {
  const dailyDone = dailyStatuses.filter(status => status === "done").length;
  const conceptsDone = conceptStatuses.filter(status => status === "done").length;
  return { dailyDone, conceptsDone, score: dailyDone + conceptsDone, percent: Math.round((dailyDone + conceptsDone) / 8 * 100) };
}

module.exports = { scoreWeek };
