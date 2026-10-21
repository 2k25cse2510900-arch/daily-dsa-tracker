"use strict";

function scoreWeek(dailyStatuses, conceptStatuses, possible = 8) {
  const dailyDone = dailyStatuses.filter(status => status === "done").length;
  const conceptsDone = conceptStatuses.filter(status => status === "done").length;
  return { dailyDone, conceptsDone, score: dailyDone + conceptsDone, percent: possible ? Math.round((dailyDone + conceptsDone) / possible * 100) : 0 };
}

module.exports = { scoreWeek };
