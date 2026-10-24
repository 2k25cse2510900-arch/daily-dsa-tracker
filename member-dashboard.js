"use strict";

const { addActivityDays } = require("./activity-date");
const { scoreWeek } = require("./scoring");

const MAX_STREAK_LOOKBACK_DAYS = 3650;

function calculateCurrentLeetCodeStreak({ currentDate, todayHasActivity, finalizations }) {
  if (typeof currentDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(currentDate)) return null;
  const statusByDate = new Map((Array.isArray(finalizations) ? finalizations : [])
    .filter(item => typeof item?.date === "string" && typeof item.status === "string")
    .map(item => [item.date, item.status]));
  let date;
  try { date = todayHasActivity ? currentDate : addActivityDays(currentDate, -1); }
  catch { return null; }

  let streak = 0;
  for (let checked = 0; checked < MAX_STREAK_LOOKBACK_DAYS; checked++) {
    const status = date === currentDate && todayHasActivity ? "Done" : statusByDate.get(date);
    if (status === "Not Submitted") return streak;
    if (status !== "Done") return null;
    streak++;
    try { date = addActivityDays(date, -1); }
    catch { return null; }
  }
  return null;
}

function calculateTotalActiveDays({ activityDates = [], finalizations = [], memberId, currentDate, completedToday }) {
  const dates = new Set();
  for (const date of activityDates) {
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) dates.add(date);
  }
  for (const document of finalizations) {
    const date = document?.date ?? document?._id;
    const status = document?.status ?? document?.finalization?.statuses?.[memberId]?.status;
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && status === "Done") dates.add(date);
  }
  if (completedToday === true && typeof currentDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(currentDate)) dates.add(currentDate);
  return dates.size;
}

function resolveTodayActivity({ todaySubmission, collectionStatus }) {
  if (todaySubmission || collectionStatus?.status === "Attempt verified") return true;
  if (collectionStatus?.status === "No attempt observed" && !/reached its limit/i.test(collectionStatus.detail || "")) return false;
  return null;
}

function calculateTotalMemberPoints({ weeks, memberId, maxWeeks, scheduledSlots }) {
  if (!weeks || typeof weeks !== "object" || !Number.isInteger(maxWeeks) || typeof scheduledSlots !== "function") return null;
  let total = 0;
  for (let week = 1; week <= maxWeeks; week++) {
    const slots = scheduledSlots(week);
    if (!slots.length) continue;
    const saved = weeks[String(week)] || {};
    const daily = Array.isArray(saved.daily?.[memberId]) ? saved.daily[memberId] : [];
    const concepts = Array.isArray(saved.concepts?.[memberId]) ? saved.concepts[memberId] : [];
    const scheduledDaily = slots.map(slot => daily[slot] === "done" ? "done" : "blank");
    const scheduledConcepts = concepts.slice(0, 2).map(status => status === "done" ? "done" : "blank");
    total += scoreWeek(scheduledDaily, scheduledConcepts).score;
  }
  return total;
}

function publicSolvedStats(stats) {
  const categories = [stats?.easy, stats?.medium, stats?.hard];
  if (!categories.every(value => Number.isSafeInteger(value) && value >= 0)) return null;
  return { total: categories.reduce((sum, value) => sum + value, 0), easy: categories[0], medium: categories[1], hard: categories[2] };
}

function createMemberDashboardHandler({ loadMemberDashboard }) {
  return async (req, res) => {
    const member = req.member;
    if (!member || typeof member.id !== "string" || typeof member.name !== "string") {
      return res.status(401).json({ error: "Member authentication required." });
    }
    try {
      const data = await loadMemberDashboard(member.id, member);
      const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
      return res.json({
        memberName: member.name,
        memberEmail: typeof member.email === "string" && member.email ? member.email : null,
        groupMember: member.groupMember === true,
        photoUrl: typeof member.photoUrl === "string" && member.photoUrl ? member.photoUrl : null,
        leetCodeUsername: typeof data?.leetCodeUsername === "string" && data.leetCodeUsername ? data.leetCodeUsername : null,
        questionsSolved: count(data?.questionsSolved),
        easySolved: count(data?.easySolved),
        mediumSolved: count(data?.mediumSolved),
        hardSolved: count(data?.hardSolved)
      });
    } catch {
      return res.status(503).json({ error: "Personal dashboard data is temporarily unavailable." });
    }
  };
}

module.exports = { calculateCurrentLeetCodeStreak, calculateTotalActiveDays, resolveTodayActivity, calculateTotalMemberPoints, publicSolvedStats, createMemberDashboardHandler };
