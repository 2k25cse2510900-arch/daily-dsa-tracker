"use strict";

// The single authoritative tracker calendar. Slots 0–5 are Mon–Sat; Sunday
// is never a daily slot. Later phases deliberately have only configured dates.
const MAX_WEEKS = 27;
const WEEK_ONE_MONDAY = Date.UTC(2026, 6, 27);
function scheduledSlots(weekNumber) {
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > MAX_WEEKS) return [];
  if (weekNumber <= 13) return [0, 1, 2, 3, 4, 5];
  return Array.from({ length: 6 }, (_, index) => index).filter(index => {
    const date = new Date(WEEK_ONE_MONDAY + ((weekNumber - 1) * 7 + index) * 86400000).toISOString().slice(0, 10);
    return (date >= "2026-10-12" && date <= "2026-10-28") || (date >= "2026-12-14" && date <= "2027-01-16");
  });
}
module.exports = { MAX_WEEKS, WEEK_ONE_MONDAY, scheduledSlots };
