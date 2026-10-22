"use strict";

(function exposeActivityDate(root) {
  const BOUNDARY_MINUTES = 5 * 60 + 30;

  function effectiveActivityDate(timestampSeconds, timeZone = "Asia/Kolkata") {
    if (!Number.isFinite(timestampSeconds)) throw new TypeError("A finite Unix timestamp in seconds is required.");
    const activityDayInstant = new Date((timestampSeconds - BOUNDARY_MINUTES * 60) * 1000);
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(activityDayInstant);
    const values = Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function addActivityDays(date, amount) {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(amount)) throw new TypeError("An ISO activity date and integer day offset are required.");
    const value = new Date(`${date}T00:00:00.000Z`);
    if (!Number.isFinite(value.getTime()) || value.toISOString().slice(0, 10) !== date) throw new TypeError("A valid ISO activity date is required.");
    value.setUTCDate(value.getUTCDate() + amount);
    return value.toISOString().slice(0, 10);
  }

  function nextActivityBoundaryMs(nowSeconds = Date.now() / 1000) {
    const nextDate = addActivityDays(effectiveActivityDate(nowSeconds), 1);
    // Asia/Kolkata is UTC+05:30, so its 05:30 boundary is 00:00 UTC.
    return Date.parse(`${nextDate}T00:00:00.000Z`);
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { effectiveActivityDate, addActivityDays, nextActivityBoundaryMs, BOUNDARY_MINUTES };
  else Object.assign(root, { effectiveActivityDate, addActivityDays, nextActivityBoundaryMs });
})(globalThis);
