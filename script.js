
"use strict";

/* =========================================================
   DSA ADMIN DASHBOARD
   File: script.js
   ========================================================= */

const STORAGE_KEY = "dsaAdminDashboard_v1";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const STATUS_ORDER = ["blank", "done", "absent"];
const isoDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const INITIAL_MEMBERS = [];

const PAGE_INFO = {
  overview: { title: "Overview", id: "overviewPage" },
  daily: { title: "Daily Submissions", id: "dailyPage" },
  concepts: { title: "Weekly Concepts", id: "conceptsPage" },
  members: { title: "Members", id: "membersPage" },
  leaderboard: { title: "Leaderboard", id: "leaderboardPage" },
  report: { title: "Weekly Report", id: "reportPage" }
};

let state = { members: [], weeks: {}, currentWeek: 1 };
let currentWeek = 1;
let toastTimer = null;
let observedPodium = null;
let podiumVisibilityObserver = null;
const celebratedAchievementKeys = new Set();

/* -------------------- HELPERS -------------------- */

function $(id) {
  return document.getElementById(id);
}

function iconMarkup(name) {
  const paths = {
    members: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20v-1.5a6 6 0 0 1 12 0V20M16 5a3.5 3.5 0 0 1 0 6.8M18 14a5 5 0 0 1 3 4.5V20"/>',
    daily: '<path d="m5 12 4 4L19 6"/>',
    concepts: '<path d="M5 4.5h14v15H5zM8 8h8M8 12h8M8 16h5"/>',
    progress: '<path d="M4 20V12h4v8M10 20V5h4v15M16 20V9h4v11"/>',
    edit: '<path d="m14 5 5 5M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16z"/>',
    remove: '<path d="M5 5l14 14M19 5 5 19"/>'
  };
  return `<svg class="ui-icon" aria-hidden="true" viewBox="0 0 24 24">${paths[name] || paths.progress}</svg>`;
}

function renderAchievementCards(kind, total, description) {
  const particles = Array.from({ length: 10 }, (_, index) => `
    <i class="achievement-particle" style="--particle-x:${(index * 37 + 9) % 100}%;--particle-delay:${(index % 5) * -0.8}s;--particle-duration:${4 + (index % 4)}s;--particle-size:${4 + (index % 3) * 2}px;--particle-drift:${(index % 2 ? 1 : -1) * (14 + index * 2)}px"></i>`).join("");
  const scheduledTotal = kind === "daily" ? total : workingDayIndexes(currentWeek).length ? total : 0;
  return state.members.filter(member => {
    const values = kind === "daily" ? dailyStatusesForScoring(member.id) : conceptsForScoring(member.id);
    return scheduledTotal > 0 && countDone(values) === scheduledTotal;
  }).map(member => {
    const key = `${kind}:${currentWeek}:${member.id}`;
    return `
      <article class="achievement-card" data-achievement-key="${escapeHTML(key)}">
        <span class="achievement-particles" aria-hidden="true">${particles}</span>
        <span class="achievement-mark">${iconMarkup(kind === "daily" ? "daily" : "concepts")}</span>
        <span class="achievement-copy">
          <span class="achievement-kicker">WEEKLY ACHIEVEMENT</span>
          <strong>${escapeHTML(member.name)}</strong>
          <span>${description}</span>
        </span>
      <span class="achievement-score">${scheduledTotal}/${scheduledTotal}</span>
      </article>`;
  }).join("");
}

function burstConfetti(container, pieceCount = 22) {
  if (!container || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const burst = document.createElement("span");
  burst.className = "confetti-burst";
  burst.setAttribute("aria-hidden", "true");
  const colors = ["#f2c14e", "#36a889", "#62a4df", "#f27b68", "#b48bd6"];
  let remaining = pieceCount;
  for (let index = 0; index < pieceCount; index += 1) {
    const piece = document.createElement("i");
    const direction = index % 2 ? 1 : -1;
    piece.className = "confetti-piece";
    piece.style.setProperty("--burst-x", `${Math.round((22 + Math.random() * 58) * direction)}px`);
    piece.style.setProperty("--burst-y", `${Math.round(-32 - Math.random() * 50)}px`);
    piece.style.setProperty("--drift-x", `${Math.round((40 + Math.random() * 90) * direction)}px`);
    piece.style.setProperty("--drift-y", `${Math.round(24 + Math.random() * 62)}px`);
    piece.style.setProperty("--spin", `${Math.round(250 + Math.random() * 600)}deg`);
    piece.style.setProperty("--piece-size", `${4 + Math.round(Math.random() * 4)}px`);
    piece.style.setProperty("--piece-color", colors[index % colors.length]);
    piece.style.setProperty("--piece-delay", `${Math.round(Math.random() * 100)}ms`);
    piece.addEventListener("animationend", () => {
      remaining -= 1;
      if (remaining === 0) burst.remove();
    }, { once: true });
    burst.append(piece);
  }
  container.append(burst);
}

function medalMarkup(rank) {
  const ribbons = { 1: ["#315bba", "#d34d57"], 2: ["#416db8", "#e0a63d"], 3: ["#2d7791", "#b85e45"] }[rank] || ["#496b9d", "#c98e37"];
  const metal = { 1: ["#fff2a5", "#d59a20"], 2: ["#f7fafc", "#99a8b6"], 3: ["#ffd3a7", "#ae6240"] }[rank] || ["#edf2f7", "#8897a8"];
  return `<svg class="custom-medal" viewBox="0 0 56 72" aria-hidden="true"><path d="M13 2h12l7 27-12 7z" fill="${ribbons[0]}"/><path d="M31 2h12L35 36l-12-7z" fill="${ribbons[1]}"/><circle cx="28" cy="43" r="17" fill="${metal[1]}"/><circle cx="28" cy="41" r="14" fill="${metal[0]}"/><circle cx="28" cy="41" r="10.5" fill="none" stroke="#fff" stroke-opacity=".55"/><text x="28" y="47" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" font-weight="900" fill="#26344a">${rank}</text></svg>`;
}

function rankBadgeMarkup(rank) {
  return rank >= 1 && rank <= 3
    ? `<span class="rank-medal rank-medal-${rank}" role="img" aria-label="Rank ${rank}">${medalMarkup(rank)}</span>`
    : `<span class="leaderboard-rank">#${rank}</span>`;
}

function consistencyPresentation(percent) {
  if (typeof percent !== "number" || !Number.isFinite(percent)) {
    return { available: false, text: "N/A", progress: 0, tone: "unavailable" };
  }
  const progress = Math.max(0, Math.min(100, percent));
  const tone = progress === 100 ? "perfect" : progress >= 75 ? "strong" : progress >= 50 ? "building" : "low";
  return { available: true, text: `${Number.isInteger(percent) ? percent : Math.round(percent)}%`, progress, tone };
}

function perfectBadgeMarkup(value) {
  return value.available && value.progress === 100
    ? '<span class="perfect-badge">PERFECT</span>' : "";
}

function consistencyMeterMarkup(percent, label = "Consistency") {
  const value = consistencyPresentation(percent);
  const accessibleValue = value.available
    ? `role="progressbar" aria-label="${escapeHTML(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value.progress}"`
    : `role="progressbar" aria-label="${escapeHTML(label)} unavailable" aria-valuetext="Unavailable" aria-valuemin="0" aria-valuemax="100"`;
  return `<div class="consistency-meter ${value.tone}" ${accessibleValue}><span style="width:${value.progress}%"></span></div>`;
}

function championFigure(rank, style = "default") {
  const characterStyle = ["default", "boy", "girl"].includes(style) ? style : "default";
  const hairstyles = {
    default: { back: '<path class="character-back-hair" d="M37 31c-9-15-1-28 11-27 6-8 23-7 29 2 13 2 17 20 6 30l-5 17H42z"/>', front: '<path class="character-hair" d="M39 23C38 8 48 2 59 5c8-8 22-1 24 8 9 9 3 20-5 24l-2-14-8 4-4-9-8 7-8-6-8 11z"/>' },
    boy: { back: '<path class="character-back-hair" d="M39 32c-7-13-1-27 10-29 11-8 25-1 29 6 10 3 11 18 4 26l-4 13H43z"/>', front: '<path class="character-hair" d="M39 22c-2-11 6-20 16-19 9-8 24-1 26 10l-8 1-4 7-7-6-7 7-7-4-8 10z"/>' },
    girl: { back: '<path class="character-back-hair" d="M38 31C30 11 44-2 61 3c18-4 29 12 21 32l-2 36-12-2-8-20-9 24-13-3 4-35z"/>', front: '<path class="character-hair" d="M39 22c-1-14 9-21 22-17 12-4 23 6 21 19-6-8-11-11-16-12-7 8-16 12-27 13z"/><path class="character-hair-tie" d="M81 20c12 0 14 8 9 13-4 3-9 0-9-4z"/>' }
  };
  const arms = rank === 1
    ? '<g class="character-arm character-arm-left victory-arm"><path class="character-skin-stroke" d="M43 51c-8-10-13-20-18-29"/><circle class="character-skin" cx="24" cy="19" r="5"/></g><g class="character-arm character-arm-right victory-arm"><path class="character-skin-stroke" d="M77 51c8-10 13-20 18-29"/><circle class="character-skin" cx="96" cy="19" r="5"/></g>'
    : '<g class="character-arm character-arm-left"><path class="character-skin-stroke" d="M43 51c-7 9-10 17-11 27"/><circle class="character-skin" cx="32" cy="80" r="5"/></g><g class="character-arm character-arm-right"><path class="character-skin-stroke" d="M77 51c7 9 10 17 11 27"/><circle class="character-skin" cx="88" cy="80" r="5"/></g>';
  const legs = '<g class="character-leg character-leg-left"><path class="character-pants-stroke" d="M49 91c-2 15-3 29-4 43"/><path class="character-shoe" d="M45 131c-4 4-8 7-13 8-5 1-7 7-2 9h20l2-15z"/><path class="character-shoe-detail" d="M34 143h13"/></g><g class="character-leg character-leg-right"><path class="character-pants-stroke" d="M71 91c2 15 3 29 4 43"/><path class="character-shoe" d="M75 131c4 4 8 7 13 8 5 1 7 7 2 9H70l-2-15z"/><path class="character-shoe-detail" d="M73 143h13"/></g>';
  const torso = '<path class="character-shirt" d="M44 40c4-4 10-6 16-6s12 2 16 6l10 11-7 11-6-5-1 35H48l-1-35-6 5-7-11z"/><path class="character-shirt-detail" d="M52 38c2 5 5 7 8 7s6-2 8-7M60 48v17"/>';
  return `<div class="champion-character champion-character--${characterStyle} champion-character-rank-${rank}" aria-hidden="true">
    <svg class="champion-avatar" viewBox="0 0 120 155" role="presentation">
      ${hairstyles[characterStyle].back}
      ${legs}
      ${torso}
      ${arms}
      <g class="character-head"><path class="character-neck" d="M52 31h16v12H52z"/><path class="character-face" d="M43 18c0-12 7-17 17-17s17 5 17 17v9c0 12-7 20-17 20s-17-8-17-20z"/><ellipse class="character-eye-white" cx="53" cy="25" rx="4.1" ry="5.2"/><ellipse class="character-eye-white" cx="67" cy="25" rx="4.1" ry="5.2"/><circle class="character-eye" cx="54" cy="26" r="2.1"/><circle class="character-eye" cx="66" cy="26" r="2.1"/><path class="character-smile" d="M54 34c3 4 9 4 12 0"/><path class="character-blush" d="M46 32h3M71 32h3"/></g>
      ${hairstyles[characterStyle].front}
      <path class="character-shorts" d="M48 88h24l4 12-12 5-4-9-4 9-12-5z"/>
    </svg>
  </div>`;
}

function selectChampionStyle(member) {
  const profileGender = String(member?.gender || "").trim().toLowerCase();
  if (profileGender === "male" || profileGender === "female") return profileGender === "female" ? "girl" : "boy";
  // Member records lack a reliable gender field; map only the two known names.
  const normalizeName = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z\s]/g, " ").trim().replace(/\s+/g, " ");
  const parts = normalizeName(member?.name).split(" ");
  const first = parts[0];
  const surname = parts.at(-1);
  const girlNames = new Map([
    ["avantika", new Set(["yadav"])], ["avanthika", new Set(["yadav"])], ["avantikaa", new Set(["yadav"])],
    ["kanika", new Set(["dwivedi"])], ["khanika", new Set(["dwivedi"])], ["kanikaa", new Set(["dwivedi"])]
  ]);
  if (girlNames.get(first)?.has(surname)) return "girl";
  return "default";
}

function podiumCard(member, rank, score) {
  const percent = consistencyPresentation(member.percent);
  const dailyPossible = workingDayIndexes(currentWeek).length;
  const conceptsPossible = dailyPossible ? 2 : 0;
  const totalPossiblePoints = possibleForWeek();
  const nameLines = Math.max(1, Math.ceil(Array.from(member.name).length / 22));
  const podiumHeight = (rank === 1 ? 132 : rank === 2 ? 118 : 106) + (nameLines - 1) * 16;
  const safeName = escapeHTML(member.name);
  const dailyDone = member.dailyDone;
  const conceptsDone = member.conceptsDone;
  return `<article class="winner-card winner-rank-${rank}" style="--pedestal-height:${podiumHeight}px">
    <div class="champion-tower">
      <div class="champion-pedestal">
        <span class="podium-place">${rank === 1 ? "CHAMPION" : rank === 2 ? "RUNNER UP" : "THIRD PLACE"}</span>
        <h4>${safeName}</h4>
        <strong class="winner-score">${score}/${totalPossiblePoints} <small>points</small></strong>
        <div class="winner-progress ${percent.tone}"><span style="--progress:${percent.progress}%"></span></div>
        ${perfectBadgeMarkup(percent)}
        <div class="winner-details"><span>${dailyDone}/${dailyPossible} daily</span><span>${conceptsDone}/${conceptsPossible} concepts</span></div>
      </div>
      <span class="character-shadow" aria-hidden="true"></span>
      ${championFigure(rank, selectChampionStyle(member))}
      <span class="medal-ribbon">${medalMarkup(rank)}</span>
    </div>
  </article>`;
}

function renderArenaAchievements(source = null) {
  const container = $("arenaAchievements");
  if (!container) return;
  if (!possibleForWeek()) {
    container.innerHTML = '<p class="arena-achievement-empty">No phase work is scheduled this week.</p>';
    return;
  }
  if (!(source || state.members).length) {
    container.innerHTML = '<p class="arena-achievement-empty">No member data is available for this week yet.</p>';
    return;
  }
  const members = source || state.members.map(member => ({ member, stats: memberStats(member.id), daily: getDaily(member.id) }));
  const dailyPossible = workingDayIndexes(currentWeek).length;
  const conceptsPossible = dailyPossible ? 2 : 0;
  const weeklyPossible = possibleForWeek();
  const maxPercent = Math.max(...members.map(item => item.stats.percent));
  const champions = members.filter(item => item.stats.percent === maxPercent);
  const longestStreak = members.map(item => {
    let run = 0, best = 0;
    (item.daily || []).forEach(status => {
      run = status === "done" ? run + 1 : 0;
      best = Math.max(best, run);
    });
    return { ...item, streak: best };
  });
  const maxStreak = Math.max(...longestStreak.map(item => item.streak));
  const categories = [
    { title: "Perfect Week", detail: `${weeklyPossible}/${weeklyPossible} tracked tasks · 100%`, icon: "✦", winners: members.filter(item => weeklyPossible && item.stats.percent === 100).map(item => `${escapeHTML(item.member.name)} · ${weeklyPossible}/${weeklyPossible} (100%)`), empty: "No 100% completions recorded." },
    { title: "Consistency Champion", detail: "Highest verified completion", icon: "◎", winners: champions.map(item => `${escapeHTML(item.member.name)} · ${item.stats.percent}% (${item.stats.overallDone}/${weeklyPossible})`), empty: "Completion data is unavailable." },
    { title: "Daily Champion", detail: `${dailyPossible}/${dailyPossible} daily submissions`, icon: "⌁", winners: members.filter(item => dailyPossible && item.stats.dailyDone === dailyPossible).map(item => `${escapeHTML(item.member.name)} · ${dailyPossible}/${dailyPossible} daily`), empty: "No complete daily sets yet." },
    { title: "Concept Master", detail: `${conceptsPossible}/${conceptsPossible} concept proofs`, icon: "⌘", winners: members.filter(item => conceptsPossible && item.stats.conceptsDone === conceptsPossible).map(item => `${escapeHTML(item.member.name)} · ${conceptsPossible}/${conceptsPossible} concepts`), empty: "No complete concept sets yet." },
    { title: "Streak Keeper", detail: "Consecutive completed weekdays", icon: "↗", winners: maxStreak >= 2 ? longestStreak.filter(item => item.streak === maxStreak).map(item => `${escapeHTML(item.member.name)} · ${item.streak} days in a row`) : [], empty: "No consecutive completed days recorded." }
  ];
  container.innerHTML = categories.map((award, index) => `<article class="arena-award arena-award-${index + 1}"><span class="arena-award-icon" aria-hidden="true">${award.icon}</span><div class="arena-award-copy"><strong>${award.title}</strong><small>${award.detail}</small><div class="arena-award-winners">${award.winners.length ? award.winners.map(name => `<span>${name}</span>`).join("") : `<span class="arena-award-empty">${award.empty}</span>`}</div></div></article>`).join("");
}

function animatePageAchievements(pageName) {
  const containerId = pageName === "daily" ? "dailyAchievements" :
    pageName === "concepts" ? "conceptAchievements" : null;
  if (containerId) {
    document.querySelectorAll(`#${containerId} [data-achievement-key]`).forEach(card => {
      card.classList.add("is-celebrating");
    });
  }

  if (pageName === "leaderboard") {
    const podium = $("leaderboardPodium");
    const key = podium?.dataset.podiumKey;
    if (key && !celebratedAchievementKeys.has(key)) {
      celebratedAchievementKeys.add(key);
      const champion = podium.querySelector(".winner-card.winner-rank-1") || podium;
      burstConfetti(champion, 34);
      champion.classList.add("is-celebrating");
    }
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function makeId() {
  return "member_" + Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8);
}

function getInitials(name) {
  return name.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join("")
    .toUpperCase();
}

function emptyWeek() {
  return {
    daily: {},
    concepts: {}
  };
}

function normalizeStatus(value) {
  return STATUS_ORDER.includes(value) ? value : "blank";
}

function ensureMemberWeek(weekNumber, memberId) {
  const key = String(weekNumber);

  if (!state.weeks[key]) {
    state.weeks[key] = emptyWeek();
  }

  const week = state.weeks[key];

  if (!week.daily[memberId]) {
    week.daily[memberId] = Array(DAYS.length).fill("blank");
  }

  if (!week.concepts[memberId]) {
    week.concepts[memberId] = ["blank", "blank"];
  }

  week.daily[memberId] = Array.from(
    { length: DAYS.length },
    (_, index) => normalizeStatus(week.daily[memberId][index])
  );

  week.concepts[memberId] = Array.from(
    { length: 2 },
    (_, index) => normalizeStatus(week.concepts[memberId][index])
  );
}

function ensureAllData() {
  if (!state.weeks || typeof state.weeks !== "object") {
    state.weeks = {};
  }

  if (!Array.isArray(state.members)) {
    state.members = INITIAL_MEMBERS.map(member => ({ ...member }));
  }

  for (let weekNumber = 1; weekNumber <= MAX_WEEKS; weekNumber++) {
    for (const member of state.members) {
      ensureMemberWeek(weekNumber, member.id);
    }
  }

  if (!Number.isInteger(state.currentWeek) ||
      state.currentWeek < 1 ||
      state.currentWeek > MAX_WEEKS) {
    state.currentWeek = 1;
  }

  currentWeek = state.currentWeek;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {
      const saved = JSON.parse(raw);

      if (saved && Array.isArray(saved.members) && saved.weeks) {
        return {
          members: saved.members.map(member => ({
            id: member.id,
            name: member.name,
            role: member.role || "Member"
          })),
          weeks: saved.weeks,
          currentWeek: saved.currentWeek || 1
        };
      }
    }
  } catch (error) {
    console.error("Could not load saved dashboard data:", error);
  }

  return {
    members: INITIAL_MEMBERS.map(member => ({ ...member })),
    weeks: {},
    currentWeek: 1
  };
}

let sharedSaveQueue = Promise.resolve();

function saveState() {
  if (!isAdmin || !sharedReady) return false;
  state.currentWeek = currentWeek;
  const snapshot = JSON.stringify(state);
  sharedSaveQueue = sharedSaveQueue.then(async () => {
    const response = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: snapshot });
    resetSessionExpiry();
    if (response.status === 401 && isAdmin) expireLocalSession();
    if (!response.ok) throw new Error((await response.json()).error || "Save rejected.");
  }).then(() => { if ($("saveState")) $("saveState").textContent = "Saved to shared dashboard"; })
    .catch(error => { console.error("Shared save failed:", error.message); if ($("saveState")) $("saveState").textContent = "Save failed — retry or export backup"; showToast("Could not save shared data: " + error.message, "error"); });
  return true;
}

function getWeek() {
  if (!state.weeks[String(currentWeek)]) {
    state.weeks[String(currentWeek)] = emptyWeek();
  }

  for (const member of state.members) {
    ensureMemberWeek(currentWeek, member.id);
  }

  return state.weeks[String(currentWeek)];
}

function getDaily(memberId) {
  ensureMemberWeek(currentWeek, memberId);
  return getWeek().daily[memberId];
}

function getConcepts(memberId) {
  ensureMemberWeek(currentWeek, memberId);
  return getWeek().concepts[memberId];
}

function countDone(values) {
  return values.filter(value => value === "done").length;
}

function countAbsent(values) {
  return values.filter(value => value === "absent").length;
}

function countMarked(values) {
  return values.filter(value => value !== "blank").length;
}

function countAllDone() {
  let total = 0;

  for (const member of state.members) {
    total += countDone(dailyStatusesForScoring(member.id));
    total += countDone(conceptsForScoring(member.id));
  }

  return total;
}

function totalPossible() {
  return state.members.length * possibleForWeek();
}

function percentage(done, possible) {
  return possible ? Math.round((done / possible) * 100) : null;
}

function memberStats(memberId) {
  const daily = dailyStatusesForScoring(memberId);
  const concepts = conceptsForScoring(memberId);

  const dailyDone = countDone(daily);
  const conceptsDone = countDone(concepts);
  const overallDone = dailyDone + conceptsDone;

  const possible = possibleForWeek();
  const marked = countMarked(daily) + countMarked(concepts);

  return {
    dailyDone,
    conceptsDone,
    overallDone,
    possible,
    marked,
    dailyAbsent: countAbsent(daily),
    conceptsAbsent: countAbsent(concepts),
    percent: percentage(overallDone, possible)
  };
}

function overallLabel(stats) {
  if (!stats.possible) return { text: "No scheduled work", className: "blank" };
  if (stats.overallDone === stats.possible) {
    return { text: "Complete", className: "done" };
  }

  if (stats.overallDone > 0) {
    return { text: "In progress", className: "partial" };
  }

  if (stats.marked > 0) {
    return { text: "Needs attention", className: "absent" };
  }

  return { text: "Not marked", className: "blank" };
}

function showToast(message, type = "success") {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = "toast show " + type;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = "toast";
  }, 2800);
}

/* -------------------- NAVIGATION -------------------- */

function observePodiumVisibility() {
  const podium = $("leaderboardPodium");
  if (!podium || !("IntersectionObserver" in window) || observedPodium === podium) return;
  if (podiumVisibilityObserver) podiumVisibilityObserver.disconnect();
  observedPodium = podium;
  podiumVisibilityObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle("is-in-view", entry.isIntersecting));
  }, { threshold: 0.08 });
  podium.classList.add("tracks-visibility");
  podiumVisibilityObserver.observe(podium);
}

function showPage(pageName) {
  const info = PAGE_INFO[pageName];
  if (!info) return;
  activePage = pageName;

  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active-page");
  });

  $(info.id).classList.add("active-page");
  $("pageTitle").textContent = info.title;

  document.querySelectorAll(".nav-link").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.target === pageName
    );
  });

  if (pageName === "report") {
    renderReport();
  }
  if (pageName === "daily" && isAdmin) loadDailyActivityStatus();

  animatePageAchievements(pageName);
  if (pageName === "leaderboard") observePodiumVisibility();

  // A newly activated page must be visible immediately. Smooth scrolling can
  // leave the new (shorter) page below the viewport while the old scroll
  // position is being animated away.
  window.scrollTo(0, 0);
}

document.querySelectorAll(".nav-link").forEach(button => {
  button.addEventListener("click", () => {
    navigatePage(button.dataset.target).catch(error => showToast(error.message, "error"));
  });
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => {
    navigatePage(button.dataset.go).catch(error => showToast(error.message, "error"));
  });
});

const MAX_WEEKS = 27;
const PROGRAM_START = "2026-08-01";
const CALENDAR_END = "2027-01-31";
const FIRST_WEEK_MONDAY = new Date(2026, 6, 27);
const DSA_PHASES = [
  { name: "Phase 1", label: "Phase 1", start: "2026-08-01", end: "2026-08-30", tone: "phase-one" },
  { name: "Phase 2", label: "Phase 2", start: "2026-08-31", end: null, tone: "phase-two" },
  { name: "Phase 3", label: "Phase 3 · Special Shortened Phase", start: "2026-10-12", end: "2026-10-28", tone: "phase-three" },
  { name: "Exam Break", label: "Exam Break", start: "2026-10-29", end: "2026-12-13", tone: "exam-break" },
  { name: "Phase 4", label: "Phase 4", start: "2026-12-14", end: "2027-01-16", tone: "phase-four" }
];
let selectedCalendarDate = effectiveActivityDate(Date.now() / 1000);
let calendarDateSelectedManually = false;
const CALENDAR_MONTHS = Array.from({ length: 6 }, (_, index) => new Date(2026, 7 + index, 1));
const currentMonthOffset = (new Date().getFullYear() - 2026) * 12 + new Date().getMonth() - 7;
let calendarMonthDate = CALENDAR_MONTHS[Math.min(5, Math.max(0, currentMonthOffset))];
let openPhaseName = "";
const dateLabel = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Historical dates not recorded";
const OFFICIAL_PAUSE_DATES = new Set();

function weekForDate(value) {
  if (value < PROGRAM_START || value > CALENDAR_END) return null;
  const daysSinceAnchor = Math.floor((new Date(`${value}T12:00:00`) - FIRST_WEEK_MONDAY) / 86400000);
  const week = Math.floor(daysSinceAnchor / 7) + 1;
  return week >= 1 && week <= MAX_WEEKS ? week : null;
}

function dateForWeekSlot(week, index) {
  const date = new Date(FIRST_WEEK_MONDAY);
  date.setDate(date.getDate() + (week - 1) * 7 + index);
  return isoDate(date);
}

function nonWorkingDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return date.getDay() === 0 || OFFICIAL_PAUSE_DATES.has(value) || (value >= "2026-10-29" && value <= "2026-12-13");
}

function scheduledWorkDate(value) {
  const inPhaseThree = value >= "2026-10-12" && value <= "2026-10-28";
  const inPhaseFour = value >= "2026-12-14" && value <= "2027-01-16";
  const beforePhaseThree = value >= PROGRAM_START && value < "2026-10-12";
  return !nonWorkingDate(value) && (beforePhaseThree || inPhaseThree || inPhaseFour);
}

function futureDate(value) {
  return value > effectiveActivityDate(Date.now() / 1000);
}

function workingDayIndexes(week = currentWeek) {
  if (week <= 13) return DAYS.map((_, index) => index);
  return DAYS.map((_, index) => index).filter(index => scheduledWorkDate(dateForWeekSlot(week, index)));
}

function dailyStatusesForScoring(memberId, week = currentWeek) {
  const statuses = getDaily(memberId);
  return workingDayIndexes(week).map(index => statuses[index]);
}

function conceptsForScoring(memberId, week = currentWeek) {
  return workingDayIndexes(week).length ? getConcepts(memberId) : [];
}

function possibleForWeek(week = currentWeek) {
  const dailyPossible = workingDayIndexes(week).length;
  return dailyPossible + (dailyPossible ? 2 : 0);
}

function phaseForDate(value) {
  if (value >= "2026-10-12" && value <= "2026-10-28") return DSA_PHASES[2];
  if (value >= "2026-10-29" && value <= "2026-12-13") return DSA_PHASES[3];
  if (value >= "2026-12-14" && value <= "2027-01-16") return DSA_PHASES[4];
  if (value >= DSA_PHASES[0].start && value <= DSA_PHASES[0].end) return DSA_PHASES[0];
  if (value >= DSA_PHASES[1].start && value < DSA_PHASES[2].start) return DSA_PHASES[1];
  return null;
}

function daysBetween(from, to) {
  return Math.round((new Date(`${to}T12:00:00`) - new Date(`${from}T12:00:00`)) / 86400000);
}

function currentScheduleSummary(today) {
  const phase = phaseForDate(today);
  if (today >= "2026-10-29" && today <= "2026-12-13") return { title: "Exam Break — No Phase Work Scheduled", detail: `${dateLabel(DSA_PHASES[3].start)}–${dateLabel(DSA_PHASES[3].end)}` };
  if (!phase) return today < PROGRAM_START ? { title: `Program starts ${dateLabel(PROGRAM_START)}`, detail: `Today · ${dateLabel(today)}` } : { title: `Program schedule complete · Phase 4 ended ${dateLabel(DSA_PHASES[4].end)}`, detail: `Today · ${dateLabel(today)}` };
  if (!phase.end) return { title: `${phase.label} · since ${dateLabel(phase.start)} · end date unavailable`, detail: `Today · ${dateLabel(today)}` };
  const range = `${phase.label} · ${dateLabel(phase.start)}–${dateLabel(phase.end)}`;
  const remaining = daysBetween(today, phase.end);
  const days = remaining === 0 ? "Ends today" : `${remaining} days remaining`;
  return { title: range, detail: `Today · ${dateLabel(today)} · ${days}` };
}

function weekRangeLabel(week) {
  const slots = Array.from({ length: 6 }, (_, index) => dateForWeekSlot(week, index)).filter(value => value >= PROGRAM_START && value <= CALENDAR_END);
  if (!slots.length) return `Week ${week} · no scheduled dates`;
  const work = slots.filter(scheduledWorkDate);
  const phaseBreak = slots.every(value => nonWorkingDate(value) || value > "2027-01-16");
  if (phaseBreak) return `Week ${week} · ${dateLabel(slots[0])}–${dateLabel(slots.at(-1))} · no phase work scheduled`;
  return `Week ${week} · ${dateLabel(slots[0])}–${dateLabel(slots.at(-1))} · ${work.length} scheduled working day${work.length === 1 ? "" : "s"}`;
}

function updateWeek(week, preferredDate = null) {
  calendarDateSelectedManually = true;
  currentWeek = Math.max(1, Math.min(MAX_WEEKS, week));
  state.currentWeek = currentWeek;
  const date = preferredDate && weekForDate(preferredDate) === currentWeek
    ? preferredDate
    : Array.from({ length: 6 }, (_, index) => dateForWeekSlot(currentWeek, index)).find(value => value >= PROGRAM_START && value <= CALENDAR_END) || PROGRAM_START;
  selectedCalendarDate = date;
  calendarMonthDate = new Date(`${date}T12:00:00`);
  if (isAdmin) { ensureAllData(); saveState(); renderAll(); }
  else navigatePage(activePage).catch(error => showToast(error.message, "error"));
  if (activePage === "daily" && isAdmin) loadDailyActivityStatus();
  renderPhaseTracker();
  if (activePage === "daily") renderDailyTable();
}

function renderPhaseTracker() {
  const today = isoDate(new Date());
  const current = currentScheduleSummary(today);
  const selectedPhase = phaseForDate(selectedCalendarDate);
  const selectedNote = nonWorkingDate(selectedCalendarDate)
    ? selectedCalendarDate >= "2026-10-29" && selectedCalendarDate <= "2026-12-13" ? "Exam Break — No Phase Work Scheduled" : OFFICIAL_PAUSE_DATES.has(selectedCalendarDate) ? "Official pause — no phase work scheduled" : "Sunday — Non-working day"
    : selectedPhase?.label || selectedPhase?.name || (selectedCalendarDate > "2027-01-16" ? "Program schedule complete" : "Historical phase boundary unavailable");
  $("phaseSummary").textContent = current.title;
  $("phaseToday").textContent = current.detail;
  const selectionSummary = $("phaseSelectionSummary");
  selectionSummary.hidden = selectedCalendarDate === today;
  selectionSummary.textContent = selectionSummary.hidden ? "" : `Selected · ${dateLabel(selectedCalendarDate)} · ${selectedNote}`;
  const statuses = new Map(DSA_PHASES.map(phase => {
    const active = today >= phase.start && (phase.end ? today <= phase.end : today < DSA_PHASES[2].start);
    return [phase.name, active ? "Current" : today < phase.start ? "Upcoming" : "Complete"];
  }));
  $("phaseList").innerHTML = DSA_PHASES.map(phase => {
    const range = phase.end ? `${dateLabel(phase.start)} – ${dateLabel(phase.end)}` : `Starts ${dateLabel(phase.start)} · end boundary unavailable`;
    return `<button type="button" class="phase-row ${phase.tone}${openPhaseName === phase.name ? " is-open" : ""}" data-phase="${phase.name}" aria-expanded="${openPhaseName === phase.name}" aria-controls="phaseCalendar"><span><b>${phase.label}</b><small>${range}</small></span><span class="phase-status">${statuses.get(phase.name)}</span><span aria-hidden="true">${openPhaseName === phase.name ? "−" : "+"}</span></button>`;
  }).join("");
  renderPhaseCalendar();
  $("selectedWeekLabel").textContent = weekRangeLabel(currentWeek);
  $("previousWeekBtn").disabled = currentWeek <= 1;
  $("nextWeekBtn").disabled = currentWeek >= MAX_WEEKS;
  if ($("weekChip")) $("weekChip").textContent = `SELECTED · ${dateLabel(selectedCalendarDate)}`;
}

function renderPhaseCalendar() {
  const monthSelect = $("calendarMonth");
  if (!monthSelect.options.length) CALENDAR_MONTHS.forEach(month => { const option = document.createElement("option"); option.value = `${month.getFullYear()}-${month.getMonth()}`; option.textContent = month.toLocaleDateString(undefined, { month: "long", year: "numeric" }); monthSelect.append(option); });
  monthSelect.value = `${calendarMonthDate.getFullYear()}-${calendarMonthDate.getMonth()}`;
  const year = calendarMonthDate.getFullYear(), month = calendarMonthDate.getMonth();
  const offset = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    if (day < 1 || day > days) return `<span class="calendar-empty" role="gridcell" aria-hidden="true"></span>`;
    const date = new Date(year, month, day), value = isoDate(date), phase = phaseForDate(value);
    const classes = ["calendar-day", phase?.tone || "", date.getDay() === 0 ? "is-sunday" : "", value === selectedCalendarDate ? "is-selected" : "", value === isoDate(new Date()) ? "is-today" : "", futureDate(value) ? "is-future" : "", OFFICIAL_PAUSE_DATES.has(value) ? "is-pause" : "", value < PROGRAM_START || value > CALENDAR_END ? "is-outside-range" : ""].filter(Boolean).join(" ");
    const stateLabel = value >= "2026-10-29" && value <= "2026-12-13" ? "Exam Break — no phase work scheduled" : OFFICIAL_PAUSE_DATES.has(value) ? "Official pause" : date.getDay() === 0 ? "Sunday — non-working day" : phase?.label || phase?.name || (value < PROGRAM_START ? "Before program start" : value > "2027-01-16" ? "No phase work scheduled" : "Historical phase boundary unavailable");
    const label = `${date.toLocaleDateString(undefined, { dateStyle: "full" })}, ${stateLabel}${value === todayDate() ? ", today" : ""}${value === selectedCalendarDate ? ", selected" : ""}`;
    return `<button role="gridcell" type="button" class="${classes}" data-date="${value}" aria-label="${label}" aria-pressed="${value === selectedCalendarDate}" ${value < PROGRAM_START || value > CALENDAR_END ? "disabled" : ""}>${day}</button>`;
  });
  $("calendarGrid").innerHTML = cells.join("");
  const atStart = year === 2026 && month === 7, atEnd = year === 2027 && month === 0;
  $("previousMonthBtn").disabled = atStart;
  $("nextMonthBtn").disabled = atEnd;
  $("calendarBoundaryMessage").textContent = atStart ? "August 2026 is the first supported month." : atEnd ? "January 2027 is the last supported month." : "";
}

function todayDate() { return isoDate(new Date()); }

function selectCalendarDate(value) {
  if (value < PROGRAM_START || value > CALENDAR_END) return;
  calendarDateSelectedManually = true;
  selectedCalendarDate = value;
  const date = new Date(`${value}T12:00:00`);
  calendarMonthDate = new Date(date.getFullYear(), date.getMonth(), 1);
  const week = weekForDate(value);
  if (week !== currentWeek) updateWeek(week, value);
  else { renderPhaseTracker(); if (activePage === "daily") { renderDailyTable(); loadDailyActivityStatus(); } }
}

function initializePhaseTracker() {
  $("phaseToggle").addEventListener("click", event => {
    const expanded = event.currentTarget.getAttribute("aria-expanded") === "true";
    if (!expanded && !openPhaseName) {
      const phase = phaseForDate(selectedCalendarDate) || phaseForDate(todayDate()) || DSA_PHASES[0];
      openPhaseName = phase.name;
    }
    event.currentTarget.setAttribute("aria-expanded", String(!expanded));
    event.currentTarget.textContent = expanded ? "📅 Open Phase Calendar" : "Close Calendar";
    $("phaseContent").hidden = expanded;
    $("phaseCalendar").hidden = !openPhaseName;
    if (!expanded) renderPhaseTracker();
  });
  $("phaseList").addEventListener("click", event => {
    const row = event.target.closest("[data-phase]"); if (!row) return;
    openPhaseName = openPhaseName === row.dataset.phase ? "" : row.dataset.phase;
    const phase = DSA_PHASES.find(item => item.name === openPhaseName);
    if (phase?.start) calendarMonthDate = new Date(`${phase.start}T12:00:00`);
    $("phaseCalendar").hidden = !openPhaseName;
    renderPhaseTracker();
  });
  $("calendarGrid").addEventListener("click", event => { const day = event.target.closest("[data-date]"); if (day && !day.disabled) selectCalendarDate(day.dataset.date); });
  $("calendarGrid").addEventListener("keydown", event => {
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!Object.hasOwn(moves, event.key)) return;
    event.preventDefault();
    const date = new Date(`${event.target.dataset.date || selectedCalendarDate}T12:00:00`);
    date.setDate(date.getDate() + moves[event.key]);
    if (date < new Date("2026-08-01T00:00:00") || date > new Date("2027-01-31T23:59:59")) return;
    selectCalendarDate(isoDate(date));
    requestAnimationFrame(() => $("calendarGrid").querySelector(`[data-date="${isoDate(date)}"]`)?.focus());
  });
  $("calendarMonth").addEventListener("change", event => { const [year, month] = event.target.value.split("-").map(Number); calendarMonthDate = new Date(year, month, 1); renderPhaseCalendar(); });
  $("previousMonthBtn").addEventListener("click", () => { if (calendarMonthDate.getFullYear() === 2026 && calendarMonthDate.getMonth() === 7) return; calendarMonthDate = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth() - 1, 1); renderPhaseCalendar(); });
  $("nextMonthBtn").addEventListener("click", () => { if (calendarMonthDate.getFullYear() === 2027 && calendarMonthDate.getMonth() === 0) return; calendarMonthDate = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth() + 1, 1); renderPhaseCalendar(); });
  $("returnTodayBtn").addEventListener("click", () => selectCalendarDate(todayDate()));
  $("previousWeekBtn").addEventListener("click", () => { if (currentWeek > 1) updateWeek(currentWeek - 1); });
  $("nextWeekBtn").addEventListener("click", () => { if (currentWeek < MAX_WEEKS) updateWeek(currentWeek + 1); });
  renderPhaseTracker();
}

/* -------------------- STATUS BUTTONS -------------------- */

function statusDetails(status) {
  if (status === "done") {
    return {
      label: "Done",
      symbol: "\u2713",
      className: "done"
    };
  }

  if (status === "absent") {
    return {
      label: "Not submitted",
      symbol: "\u2715",
      className: "absent"
    };
  }

  return {
    label: "Not marked",
    symbol: "\u2013",
    className: "blank"
  };
}

function statusButton(status, attributes) {
  const details = statusDetails(status);
  if (!isAdmin) return `<span class="status-button ${details.className}" aria-label="${details.label}" title="${details.label}">${details.symbol}</span>`;
  const safeAttributes = Object.entries(attributes)
    .map(([key, value]) =>
      `${key}="${escapeHTML(value)}"`
    ).join(" ");

  return `
    <button
      type="button"
      class="status-button ${details.className}"
      aria-label="${details.label}"
      title="${details.label} — click to change"
      ${safeAttributes}
    >${details.symbol}</button>
  `;
}

function cycleStatus(status) {
  const index = STATUS_ORDER.indexOf(status);
  return STATUS_ORDER[(index + 1) % STATUS_ORDER.length];
}

function bindStatusButtons(container) {
  container.querySelectorAll("[data-status-kind]").forEach(button => {
    button.addEventListener("click", () => {
      const memberId = button.dataset.memberId;
      const index = Number(button.dataset.index);
      const kind = button.dataset.statusKind;

      if (!state.members.some(member => member.id === memberId)) {
        return;
      }

      if (kind === "daily") {
        const value = button.dataset.date;
        if (!value || !scheduledWorkDate(value) || futureDate(value) || weekForDate(value) !== currentWeek) return;
        selectCalendarDate(value);
        const values = getDaily(memberId);
        values[index] = cycleStatus(values[index]);
      } else {
        if (!workingDayIndexes(currentWeek).length) return;
        const values = getConcepts(memberId);
        values[index] = cycleStatus(values[index]);
      }

      saveState();
      renderAll();
    });
  });
}

/* -------------------- DAILY TRACKER -------------------- */

function renderDailyTable() {
  const table = $("dailyTable");
  let html = `
    <thead>
      <tr>
        <th>MEMBER</th>
        ${DAYS.map((day, index) => { const value = dateForWeekSlot(currentWeek, index); return `<th><button type="button" class="daily-date-select${value === selectedCalendarDate ? " is-selected" : ""}" data-daily-date="${value}" aria-pressed="${value === selectedCalendarDate}" aria-label="Select ${day}, ${dateLabel(value)}" ${!scheduledWorkDate(value) || futureDate(value) ? "disabled" : ""}>${day.toUpperCase()}<small>${new Date(`${value}T12:00:00`).getDate()}</small></button></th>`; }).join("")}
        <th>DONE</th>
      </tr>
    </thead>
    <tbody>
  `;

  if (!state.members.length) {
    html += `<tr><td colspan="8">No members added yet.</td></tr>`;
  }

  for (const member of state.members) {
    const daily = getDaily(member.id);
    const workIndexes = workingDayIndexes(currentWeek);
    const isComplete = workIndexes.length > 0 && countDone(workIndexes.map(index => daily[index])) === workIndexes.length;

    html += `
      <tr class="${isComplete ? "daily-complete-row" : ""}">
        <td>
          <div class="member-cell">
            <span class="member-avatar">${escapeHTML(getInitials(member.name))}</span>
            <span class="member-cell-info">
              <strong>${escapeHTML(member.name)}</strong>
              <small>${escapeHTML(member.role || "Member")}</small>
            </span>
          </div>
        </td>
    `;

    daily.forEach((status, index) => {
      const date = dateForWeekSlot(currentWeek, index);
      const scheduled = scheduledWorkDate(date);
      html += `
        <td>
          ${scheduled ? statusButton(status, {
            "data-status-kind": "daily",
            "data-member-id": member.id,
            "data-index": index,
            "data-date": date,
            ...(futureDate(date) ? { "disabled": "disabled" } : {})
          }) : `<span class="no-work-cell">${date >= "2026-10-29" && date <= "2026-12-13" ? "Exam break" : "No phase work"}</span>`}
        </td>
      `;
    });

    html += `
        <td><span class="status-badge ${isComplete ? "done" : "partial"}">${workIndexes.length ? `${countDone(workIndexes.map(index => daily[index]))}/${workIndexes.length}${isComplete ? " complete" : ""}` : "No phase work"}</span></td>
      </tr>
    `;
  }

  html += "</tbody>";
  table.innerHTML = html;

  table.querySelectorAll("[data-daily-date]").forEach(button => button.addEventListener("click", () => selectCalendarDate(button.dataset.dailyDate)));
  bindStatusButtons(table);
  $("dailyAchievements").innerHTML = renderAchievementCards("daily", workingDayIndexes(currentWeek).length, "Every daily submission is complete.");

  const allDaily = state.members.flatMap(member => dailyStatusesForScoring(member.id));
  $("dailyCount").textContent = nonWorkingDate(selectedCalendarDate)
    ? `${dateLabel(selectedCalendarDate)} is a non-working day. The table shows this record's other weekdays.`
    : `${countDone(allDaily)} completed · ${countAbsent(allDaily)} not submitted · ${allDaily.filter(value => value === "blank").length} unmarked`;
  const activityButton = $("refreshLeetCodeActivityBtn");
  if (activityButton) activityButton.disabled = !isAdmin || leetcodeActivityRefreshInProgress || !scheduledWorkDate(selectedCalendarDate) || futureDate(selectedCalendarDate);
  renderLeetCodeActivitySummary();
}

let leetcodeActivityRecord = null;
let activityStatusRequest = 0;
let leetcodeActivityRefreshInProgress = false;
let leetcodeAutomationStatus = null;
let leetcodeTrackingSummary = null;

function renderLeetCodeActivitySummary() {
  const container = $("leetcodeActivitySummary");
  if (!container) return;
  const tracking = leetcodeTrackingSummary || {};
  const displayedDate = tracking.activityDate || selectedCalendarDate;
  const lastFetch = tracking.lastSuccessfulAt
    ? `${new Date(tracking.lastSuccessfulAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`
    : "No successful fetch recorded";
  const trackingCounts = `<div class="leetcode-activity-counts"><span>Verified attempts: ${Number(tracking.verifiedAttempts) || 0}</span><span>Unable to verify: ${Number(tracking.unableToVerify) || 0}</span><span>Tracker update failures: ${Number(tracking.trackerUpdateFailures) || 0}</span></div>`;
  const automatic = leetcodeAutomationStatus;
  const finalizationMembers = automatic?.finalization?.statuses ? state.members.map(member => {
    const item = automatic.finalization.statuses[member.id];
    if (!item) return "";
    const source = item.source === "manual"
      ? `Manual confirmation by ${escapeHTML(item.decidedBy || "admin")} · ${escapeHTML(new Date(item.decidedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }))} IST`
      : item.source === "automatic" ? (item.status === "Done" ? "Automatically verified" : "Automatically assessed") : "Legacy result · origin not recorded";
    const actions = isAdmin && item.status === "Needs review" ? `<span class="activity-review-actions"><button type="button" class="btn btn-light" data-finalize-member="${escapeHTML(member.id)}" data-finalize-status="Done">Mark Done</button><button type="button" class="btn btn-light" data-finalize-member="${escapeHTML(member.id)}" data-finalize-status="Not Submitted">Mark Not Submitted</button></span>` : "";
    return `<li><strong>${escapeHTML(member.name)}</strong><span>${escapeHTML(item.status)} · ${source}</span><small>${escapeHTML(item.detail || "")}</small>${actions}</li>`;
  }).join("") : "";
  const selectedStatuses = leetcodeActivityRecord?.date === displayedDate ? leetcodeActivityRecord.statuses || {} : {};
  const memberStatuses = state.members.map(member => {
    const item = selectedStatuses[member.id];
    const isUnable = item?.status === "Unable to verify";
    const detail = item?.detail || (isUnable ? "Public submission data was incomplete or unavailable. This is not a confirmed Not Submitted result." : item?.status === "No attempt observed" ? "No matching record appeared in the available response; this does not confirm non-submission." : "");
    return `<li><strong>${escapeHTML(member.name)}</strong><span class="${item?.status === "Attempt verified" ? "verified" : isUnable ? "unverified" : "tracking-neutral"}">${escapeHTML(item?.status || "Not checked")}</span><small>${escapeHTML(detail)}${item?.attemptCount ? ` · ${item.attemptCount} attempt${item.attemptCount === 1 ? "" : "s"}` : ""}</small></li>`;
  }).join("");
  const collectionDetails = automatic?.collection ? `<div class="tracking-detail-block"><strong>Automatic collection · ${escapeHTML(dateLabel(automatic.activityDate))}</strong><span>${escapeHTML(automatic.collection.status || "Collection status unavailable")}${automatic.collection.collectedAt ? ` · last successful fetch ${escapeHTML(`${new Date(automatic.collection.collectedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`)}` : ""}</span></div>` : "";
  const finalizationDetails = automatic?.finalization ? `<div class="tracking-detail-block"><strong>Previous activity date ${escapeHTML(dateLabel(automatic.previousActivityDate))}</strong><span>${escapeHTML(automatic.finalization.status)} · Done ${automatic.finalization.done || 0} · Not Submitted ${automatic.finalization.notSubmitted || 0} · Needs review ${automatic.finalization.needsReview || 0} · verified attempts ${automatic.finalization.verifiedAttempts || 0} · tracker updates ${automatic.finalization.entriesUpdated || 0}${automatic.finalization.finalizedAt ? ` · reviewed ${escapeHTML(`${new Date(automatic.finalization.finalizedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`)}` : ""}</span>${finalizationMembers ? `<ul class="leetcode-activity-review-list">${finalizationMembers}</ul>` : ""}</div>` : automatic ? `<div class="tracking-detail-block"><strong>Previous activity date ${escapeHTML(dateLabel(automatic.previousActivityDate))}</strong><span>Not finalized yet.</span></div>` : "";
  const limitations = `<p class="tracking-limitations">LeetCode exposes a recent, capped public submission list. A missing record is shown as Unable to verify unless the available evidence proves otherwise; it is not a confirmed Not Submitted result. Activity dates roll over at 05:30 Asia/Kolkata.</p>`;
  container.innerHTML = `<div class="leetcode-activity-head"><strong>LeetCode tracking · ${escapeHTML(dateLabel(displayedDate))} (activity date)</strong><small>Last successful fetch: ${escapeHTML(lastFetch)}</small></div>${trackingCounts}<details class="tracking-details"><summary>View tracking details</summary>${limitations}${selectedStatuses && Object.keys(selectedStatuses).length ? `<h4>Member results</h4><ul>${memberStatuses}</ul>` : `<p>No member-level activity results are recorded for this date.</p>`}${collectionDetails}${finalizationDetails}</details>`;
  bindManualFinalizationActions(container);
}

function bindManualFinalizationActions(container) {
  container.querySelectorAll("[data-finalize-member]").forEach(button => button.addEventListener("click", async () => {
    if (!isAdmin || button.disabled || !leetcodeAutomationStatus?.previousActivityDate) return;
    button.disabled = true;
    const date = leetcodeAutomationStatus.previousActivityDate;
    const memberId = button.dataset.finalizeMember;
    const status = button.dataset.finalizeStatus;
    try {
      const result = await apiRequest("/api/admin/leetcode/activity/finalize", { method: "POST", body: JSON.stringify({ date, memberId, status }) });
      leetcodeAutomationStatus.finalization = result.finalization;
      await loadSharedData();
      await loadDailyActivityStatus();
      showToast(`${dateLabel(date)} · ${status} manually confirmed.`, "success");
    } catch (error) {
      showToast(error.message, "error");
      button.disabled = false;
    }
  }));
}

async function loadDailyActivityStatus() {
  const requestId = ++activityStatusRequest;
  const query = new URLSearchParams({ week: String(currentWeek), date: selectedCalendarDate });
  try {
    const data = await apiRequest(`/api/page-data/daily?${query}`);
    if (requestId !== activityStatusRequest || data.date !== selectedCalendarDate) return;
    leetcodeActivityRecord = data.activity || null;
    leetcodeTrackingSummary = data.trackingSummary || null;
    leetcodeAutomationStatus = { activityDate: data.activityDate, previousActivityDate: data.previousActivityDate, collection: data.collectionJob, finalization: data.finalizationJob };
    renderLeetCodeActivitySummary();
  } catch (error) {
    if (requestId === activityStatusRequest) {
      leetcodeActivityRecord = null;
      leetcodeTrackingSummary = null;
      leetcodeAutomationStatus = null;
      renderLeetCodeActivitySummary();
    }
  }
}

function initializeLeetCodeActivityControls() {
  const button = $("refreshLeetCodeActivityBtn");
  button.addEventListener("click", async () => {
    if (!isAdmin || button.disabled || leetcodeActivityRefreshInProgress) return;
    if (!calendarDateSelectedManually) {
      const effectiveDate = effectiveActivityDate(Date.now() / 1000);
      if (effectiveDate !== selectedCalendarDate) {
        selectedCalendarDate = effectiveDate;
        currentWeek = weekForDate(effectiveDate) || currentWeek;
        state.currentWeek = currentWeek;
        calendarMonthDate = new Date(`${effectiveDate}T12:00:00`);
        renderPhaseTracker();
        renderDailyTable();
      }
    }
    const date = selectedCalendarDate;
    const week = currentWeek;
    leetcodeActivityRefreshInProgress = true;
    button.disabled = true;
    button.textContent = "Checking LeetCode…";
    try {
      const result = await apiRequest("/api/admin/leetcode/activity/refresh", { method: "POST", body: JSON.stringify({ date, week }) });
      leetcodeActivityRecord = result;
      leetcodeTrackingSummary = {
        activityDate: result.date,
        lastSuccessfulAt: result.lastSuccessfulAt,
        verifiedAttempts: result.summary?.verifiedAttempts || 0,
        unableToVerify: result.summary?.unableToVerify || 0,
        trackerUpdateFailures: result.summary?.trackerUpdateFailures || 0
      };
      await loadSharedData();
      if (activePage === "daily") await loadDailyActivityStatus();
      const summary = result.summary || {};
      const message = `${dateLabel(date)} activity day (05:30 IST rollover): checked ${summary.membersChecked || 0}; verified ${summary.verifiedAttempts || 0} attempt(s); updated ${summary.entriesUpdated || 0}; unable to verify ${summary.unableToVerify || 0}; tracker update failures ${summary.trackerUpdateFailures || 0}.`;
      showToast(message, summary.unableToVerify || summary.trackerUpdateFailures ? "error" : "success");
    } catch (error) { showToast(error.message, "error"); }
    finally {
      leetcodeActivityRefreshInProgress = false;
      button.textContent = "Refresh LeetCode Activity";
      if (activePage === "daily") renderDailyTable();
    }
  });
}

/* -------------------- CONCEPTS TRACKER -------------------- */

function renderConceptTable() {
  const table = $("conceptTable");
  const weekHasWork = workingDayIndexes(currentWeek).length > 0;

  let html = `
    <thead>
      <tr>
        <th>MEMBER</th>
        <th>CONCEPT 1</th>
        <th>CONCEPT 2</th>
        <th>DONE</th>
      </tr>
    </thead>
    <tbody>
  `;

  if (!state.members.length) {
    html += `<tr><td colspan="4">No members added yet.</td></tr>`;
  }

  for (const member of state.members) {
    const concepts = getConcepts(member.id);
    const isComplete = weekHasWork && countDone(concepts) === 2;

    html += `
      <tr class="${isComplete ? "concept-complete-row" : ""}">
        <td>
          <div class="member-cell">
            <span class="member-avatar">${escapeHTML(getInitials(member.name))}</span>
            <span class="member-cell-info">
              <strong>${escapeHTML(member.name)}</strong>
              <small>${escapeHTML(member.role || "Member")}</small>
            </span>
          </div>
        </td>
    `;

    concepts.forEach((status, index) => {
      html += `
        <td>
          ${weekHasWork ? statusButton(status, {
            "data-status-kind": "concepts",
            "data-member-id": member.id,
            "data-index": index
          }) : `<span class="no-work-cell">No phase work</span>`}
        </td>
      `;
    });

    html += `
        <td><span class="status-badge ${isComplete ? "done" : "partial"}">${weekHasWork ? `${countDone(concepts)}/2${isComplete ? " complete" : ""}` : "No phase work"}</span></td>
      </tr>
    `;
  }

  html += "</tbody>";
  table.innerHTML = html;

  bindStatusButtons(table);
  $("conceptAchievements").innerHTML = renderAchievementCards("concepts", weekHasWork ? 2 : 0, "Both weekly concepts are complete.");

  const allConcepts = state.members.flatMap(member => getConcepts(member.id));
  $("conceptCount").textContent =
    `${countDone(allConcepts)} proofs completed · ${countAbsent(allConcepts)} not submitted · ${allConcepts.filter(value => value === "blank").length} unmarked`;
}

/* -------------------- OVERVIEW STATS -------------------- */

function renderStats() {
  const totalMembers = state.members.length;
  const done = countAllDone();
  const possible = totalPossible();
  const allStatuses = state.members.flatMap(member => [...dailyStatusesForScoring(member.id), ...conceptsForScoring(member.id)]);

  const dailyStatuses = state.members.flatMap(member => dailyStatusesForScoring(member.id));
  const conceptStatuses = state.members.flatMap(member => conceptsForScoring(member.id));

  const dailyDone = countDone(dailyStatuses);
  const conceptsDone = countDone(conceptStatuses);
  const marked = countMarked(allStatuses);

  const cards = [
    {
      label: "Group members",
      value: totalMembers,
      description: "Registered members",
      icon: "members",
      color: "blue"
    },
    {
      label: "Daily submissions",
      value: `${dailyDone}/${totalMembers * workingDayIndexes(currentWeek).length}`,
      description: "Completed this week",
      icon: "daily",
      color: "green"
    },
    {
      label: "Concept proofs",
      value: `${conceptsDone}/${totalMembers * (workingDayIndexes(currentWeek).length ? 2 : 0)}`,
      description: "Completed this week",
      icon: "concepts",
      color: "purple"
    },
    {
      label: "Overall completion",
      value: possible ? `${percentage(done, possible)}%` : "N/A",
      description: `${marked} statuses marked`,
      icon: "progress",
      color: "orange"
    }
  ];

  $("statsGrid").innerHTML = cards.map(card => `
    <article class="stat-card ${card.color}">
      <div class="stat-label">${card.label}</div>
      <div class="stat-icon">${iconMarkup(card.icon)}</div>
      <div class="stat-value">${card.value}</div>
      <div class="stat-description">${card.description}</div>
    </article>
  `).join("");

  $("weekChip").textContent = weekForDate(selectedCalendarDate) === currentWeek ? `SELECTED · ${dateLabel(selectedCalendarDate)}` : `NO DATED RECORD · ${dateLabel(selectedCalendarDate)}`;
}

/* -------------------- MEMBER CONSISTENCY -------------------- */

function renderMemberSummary() {
  const container = $("memberSummary");

  if (!state.members.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>No members yet</strong>
        Add members from the Members page.
      </div>
    `;
    return;
  }

  container.innerHTML = state.members.map(member => {
    const stats = memberStats(member.id);
    const value = consistencyPresentation(stats.percent);

    return `
      <div class="member-summary-row ${value.tone}">
        <span class="member-summary-name" title="${escapeHTML(member.name)}">${escapeHTML(member.name)}</span>
        <div class="member-summary-track">${consistencyMeterMarkup(stats.percent, `${member.name} weekly consistency`)}</div>
        <span class="member-summary-percent ${value.tone}">${value.text}${perfectBadgeMarkup(value)}</span>
      </div>
    `;
  }).join("");
}

/* -------------------- REPORT PREVIEW -------------------- */

function renderPreview() {
  const tbody = $("previewRows");

  if (!state.members.length) {
    tbody.innerHTML = `<tr><td colspan="5">No members added yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.members.map(member => {
    const stats = memberStats(member.id);
    const label = overallLabel(stats);

    return `
      <tr>
        <td>${escapeHTML(member.name)}</td>
        <td>${stats.dailyDone}/${workingDayIndexes(currentWeek).length}</td>
        <td>${stats.conceptsDone}/${workingDayIndexes(currentWeek).length ? 2 : 0}</td>
        <td>${stats.overallDone}/${stats.possible} (${stats.percent ?? "N/A"}%) ${perfectBadgeMarkup(consistencyPresentation(stats.percent))}</td>
        <td><span class="status-badge ${label.className}">${label.text}</span></td>
      </tr>
    `;
  }).join("");
}

/* -------------------- MEMBERS MANAGEMENT -------------------- */

function closeMemberActionMenus(container) {
  container.querySelectorAll(".member-actions-menu.is-open").forEach(menu => {
    menu.classList.remove("is-open");
    menu.closest(".managed-member")?.classList.remove("is-managing");
    const actions = menu.querySelector(".member-actions");
    const trigger = menu.querySelector("[data-member-menu]");
    if (actions) actions.hidden = true;
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  });
}

function renderMembers() {
  const container = $("memberManager");
  $("memberCountTag").textContent = `${state.members.length} MEMBER${state.members.length === 1 ? "" : "S"}`;

  if (!state.members.length) {
    container.innerHTML = `<div class="empty-state"><strong>No members registered</strong>Use the form above to add a member.</div>`;
    return;
  }

  container.innerHTML = state.members.map((member, index) => `
    <article class="managed-member">
      <a class="member-avatar member-profile-open" href="/profile/${encodeURIComponent(member.id)}" data-open-profile="${escapeHTML(member.id)}" aria-label="Open ${escapeHTML(member.name)}'s profile">${escapeHTML(getInitials(member.name))}</a>
      <div class="member-info">
        <strong><a class="member-name-profile member-profile-open" href="/profile/${encodeURIComponent(member.id)}" data-open-profile="${escapeHTML(member.id)}">${escapeHTML(member.name)}</a></strong>
        ${leetcodeProfiles[member.id]?.username ? `<a class="member-leetcode-id" href="${escapeHTML(leetcodeProfiles[member.id].profileUrl || `https://leetcode.com/u/${encodeURIComponent(leetcodeProfiles[member.id].username)}/`)}" target="_blank" rel="noopener noreferrer">${escapeHTML(leetcodeProfiles[member.id].username)}</a>` : `<small class="member-leetcode-id unavailable">Not linked</small>`}
      </div>
      <div class="member-actions-menu" ${isAdmin ? "" : "hidden"}>
        <button class="member-actions-trigger" type="button" data-member-menu="${escapeHTML(member.id)}" aria-expanded="false" aria-controls="member-actions-${escapeHTML(member.id)}">Manage</button>
        <div class="member-actions" id="member-actions-${escapeHTML(member.id)}" hidden>
          <button class="icon-btn" type="button" data-member-action="rename" data-member-id="${escapeHTML(member.id)}" aria-label="Rename ${escapeHTML(member.name)}" title="Rename">${iconMarkup("edit")}</button>
          <button class="icon-btn danger" type="button" data-member-action="remove" data-member-id="${escapeHTML(member.id)}" aria-label="Remove ${escapeHTML(member.name)}" title="Remove">${iconMarkup("remove")}</button>
          <button class="btn btn-light" type="button" data-member-action="firebase-link" data-member-id="${escapeHTML(member.id)}">${memberFirebaseStatus[member.id] ? "Update Google link" : "Link Google account"}</button>
          <button class="btn btn-light" type="button" data-member-action="email-link" data-member-id="${escapeHTML(member.id)}">${member.email ? "Update sign-in email" : "Set sign-in email"}</button>
        </div>
      </div>
    </article>`).join("");

  if (!container.dataset.memberManagerBound) {
    container.addEventListener("click", event => {
    const menuTrigger = event.target.closest("[data-member-menu]");
    if (menuTrigger) {
      event.preventDefault();
      event.stopPropagation();
      const menu = menuTrigger.closest(".member-actions-menu");
      const actions = menu?.querySelector(".member-actions");
      if (!menu || !actions) return;
      const opening = actions.hidden;
      closeMemberActionMenus(container);
      actions.hidden = !opening;
      menu.classList.toggle("is-open", opening);
      menu.closest(".managed-member")?.classList.toggle("is-managing", opening);
      menuTrigger.setAttribute("aria-expanded", String(opening));
      return;
    }
    const button = event.target.closest("[data-member-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const member = state.members.find(item => item.id === button.dataset.memberId);
    if (!member) return showToast("That member is no longer available. Refresh and try again.", "error");
    closeMemberActionMenus(container);
    if (button.dataset.memberAction === "rename") renameMember(member);
    if (button.dataset.memberAction === "remove") removeMember(member);
    if (button.dataset.memberAction === "firebase-link") updateMemberFirebaseLink(member);
    if (button.dataset.memberAction === "email-link") openMemberEmailDialog(member);
    });
    document.addEventListener("click", event => {
      if (!container.contains(event.target)) closeMemberActionMenus(container);
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeMemberActionMenus(container);
    });
    container.dataset.memberManagerBound = "true";
  }
  container.querySelectorAll("[data-open-profile]").forEach(link => {
    link.addEventListener("click", event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (isAdmin || (isMember && link.dataset.openProfile === memberProfile?.id)) openProfileRoute(link.dataset.openProfile, true);
    });
  });
}

async function loadGroupMemberList() {
  const container = $("memberPeerList");
  if (!container || !memberProfile?.groupMember) return;
  try {
    const { members = [] } = await apiRequest("/api/member/group");
    container.innerHTML = members.map(member => `
      <article class="member-peer-row">
        <a class="member-avatar member-profile-open" href="/profile/${encodeURIComponent(member.id)}" data-open-profile="${escapeHTML(member.id)}" aria-label="Open ${escapeHTML(member.name)}'s profile">${escapeHTML(getInitials(member.name))}</a>
        <a class="member-peer-name member-profile-open" href="/profile/${encodeURIComponent(member.id)}" data-open-profile="${escapeHTML(member.id)}">${escapeHTML(member.name)}</a>
        ${member.leetCodeUsername ? `<a class="member-leetcode-id" href="https://leetcode.com/u/${encodeURIComponent(member.leetCodeUsername)}/" target="_blank" rel="noopener noreferrer">${escapeHTML(member.leetCodeUsername)}</a>` : `<span class="member-leetcode-id unavailable">Not linked</span>`}
      </article>`).join("") || `<p class="member-peer-empty">No group members are available.</p>`;
    container.querySelectorAll("[data-open-profile]").forEach(link => link.addEventListener("click", event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openProfileRoute(link.dataset.openProfile, true);
    }));
  } catch {
    container.innerHTML = `<p class="member-peer-empty">Group members could not be loaded.</p>`;
  }
}
async function updateMemberFirebaseLink(member) {
  if (!confirm(`Confirm that you have verified ${member.name}'s identity and their Firebase UID before linking this Google account.`)) return;
  const firebaseUid = prompt("Enter the Firebase UID shown to the member after Google sign-in:");
  if (firebaseUid === null) return;
  try {
    await apiRequest(`/api/admin/members/${encodeURIComponent(member.id)}/firebase-link`, {
      method: "PUT",
      body: JSON.stringify({ firebaseUid, identityVerified: true })
    });
    memberFirebaseStatus[member.id] = true;
    showToast("Google account linked.", "success");
    renderMembers();
  } catch (error) {
    showToast(error.message || "The Google account could not be linked.", "error");
  }
}

let memberEmailTarget = null;

function openMemberEmailDialog(member) {
  if (!isAdmin) return showToast("Administrator permission is required.", "error");
  memberEmailTarget = member;
  $("memberEmailMemberName").textContent = member.name;
  $("memberEmailMemberId").textContent = member.id;
  $("memberEmailInput").value = member.email || "";
  $("memberEmailError").textContent = "";
  $("memberEmailDialog").showModal();
  $("memberEmailInput").focus();
}

async function updateMemberEmailLink(email) {
  const member = memberEmailTarget;
  if (!member || !isAdmin) return showToast("Administrator permission is required.", "error");
  try {
    await apiRequest(`/api/admin/members/${encodeURIComponent(member.id)}/email-link`, {
      method: "PUT",
      body: JSON.stringify({ email })
    });
    member.email = email.trim().toLowerCase();
    showToast("Sign-in email linked. The member can now sign in with that verified Google account.", "success");
    $("memberEmailDialog").close();
    memberEmailTarget = null;
    renderMembers();
  } catch (error) {
    $("memberEmailError").textContent = error.message || "The email could not be updated.";
    showToast(error.message || "The email could not be updated.", "error");
  }
}

function renameMember(member) {
  const newName = prompt("Enter the new member name:", member.name);

  if (newName === null) return;

  const cleaned = newName.trim();

  if (!cleaned) {
    showToast("Name cannot be empty.", "error");
    return;
  }

  const duplicate = state.members.some(item =>
    item.id !== member.id &&
    item.name.toLowerCase() === cleaned.toLowerCase()
  );

  if (duplicate) {
    showToast("A member with that name already exists.", "error");
    return;
  }

  member.name = cleaned;
  saveState();
  renderAll();
  showToast("Member name updated.");
}

function removeMember(member) {
  const confirmed = confirm(
    `Remove ${member.name} from the dashboard?\n\nTheir records will also be removed from this browser's tracker.`
  );

  if (!confirmed) return;

  state.members = state.members.filter(item => item.id !== member.id);

  for (const week of Object.values(state.weeks)) {
    if (week.daily) delete week.daily[member.id];
    if (week.concepts) delete week.concepts[member.id];
  }

  saveState();
  renderAll();
  showToast("Member removed.");
}

$("addMemberForm").addEventListener("submit", event => {
  event.preventDefault();

  const input = $("memberName");
  const name = input.value.trim();

  if (!name) {
    showToast("Please enter a member name.", "error");
    return;
  }

  const duplicate = state.members.some(member =>
    member.name.toLowerCase() === name.toLowerCase()
  );

  if (duplicate) {
    showToast("That member already exists.", "error");
    return;
  }

  const member = {
    id: makeId(),
    name,
    role: `Member ${state.members.length + 1}`
  };

  state.members.push(member);

  for (let week = 1; week <= MAX_WEEKS; week++) {
    ensureMemberWeek(week, member.id);
  }

  input.value = "";
  saveState();
  renderAll();
  showToast(`${name} added successfully.`);
});

/* -------------------- BULK STATUS ACTIONS -------------------- */

function setEveryStatus(status) {
  const confirmed = confirm(
    status === "done"
      ? "Mark ALL daily submissions and both concepts as DONE for every member in Week " + currentWeek + "?"
      : "Clear ALL daily submissions and concept statuses for every member in Week " + currentWeek + "?"
  );

  if (!confirmed) return;

  const week = getWeek();

  for (const member of state.members) {
    week.daily[member.id] = Array(DAYS.length).fill(status);
    week.concepts[member.id] = ["done" === status ? "done" : status,
                                "done" === status ? "done" : status];
  }

  saveState();
  renderAll();

  showToast(
    status === "done"
      ? "Everything marked as done."
      : "All statuses reset to blank."
  );
}

$("markAllDoneBtn").addEventListener("click", () => {
  setEveryStatus("done");
});

$("markAllBlankBtn").addEventListener("click", () => {
  setEveryStatus("blank");
});

/* -------------------- RESET BUTTONS -------------------- */

$("clearDailyBtn").addEventListener("click", () => {
  if (!confirm(`Reset all daily statuses for Week ${currentWeek}?`)) return;

  const week = getWeek();

  for (const member of state.members) {
    week.daily[member.id] = Array(DAYS.length).fill("blank");
  }

  saveState();
  renderAll();
  showToast("Daily statuses reset.");
});

$("clearConceptsBtn").addEventListener("click", () => {
  if (!confirm(`Reset all concept statuses for Week ${currentWeek}?`)) return;

  const week = getWeek();

  for (const member of state.members) {
    week.concepts[member.id] = ["blank", "blank"];
  }

  saveState();
  renderAll();
  showToast("Concept statuses reset.");
});

/* -------------------- BACKUP DOWNLOAD -------------------- */

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$("backupBtn").addEventListener("click", () => {
  const backup = {
    app: "DSA Admin Dashboard",
    version: 1,
    exportedAt: new Date().toISOString(),
    currentWeek,
    members: state.members,
    weeks: state.weeks
  };

  const date = new Date().toISOString().slice(0, 10);

  downloadFile(
    `dsa-backup-${date}.json`,
    JSON.stringify(backup, null, 2),
    "application/json"
  );

  showToast("Backup file exported.");
});

/* -------------------- RESTORE BACKUP -------------------- */

$("restoreAction").addEventListener("click", () => {
  $("restoreFile").click();
});

$("restoreFile").addEventListener("change", async event => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const imported = JSON.parse(text);

    if (!imported || !Array.isArray(imported.members) || !imported.weeks) {
      throw new Error("This file is not a valid DSA dashboard backup.");
    }

    const membersValid = imported.members.every(member =>
      member &&
      typeof member.id === "string" &&
      typeof member.name === "string"
    );

    if (!membersValid) {
      throw new Error("The backup contains invalid member data.");
    }

    const confirmed = confirm(
      "Restore this backup?\n\nThe current dashboard data will be replaced."
    );

    if (!confirmed) {
      event.target.value = "";
      return;
    }

    state = {
      members: imported.members.map(member => ({
        id: member.id,
        name: member.name,
        role: member.role || "Member"
      })),
      weeks: imported.weeks,
      currentWeek: Number(imported.currentWeek) || 1
    };

    currentWeek = state.currentWeek;
    ensureAllData();

    saveState();
    renderAll();

    showToast("Backup restored successfully.");
  } catch (error) {
    console.error("Backup restore error:", error);
    showToast(error.message || "Could not restore this backup.", "error");
  } finally {
    event.target.value = "";
  }
});

/* -------------------- LEADERBOARD -------------------- */

function renderViewerLeaderboard(data) {
  const dailyPossible = workingDayIndexes(data.week).length;
  const conceptsPossible = dailyPossible ? 2 : 0;
  const totalPossiblePoints = possibleForWeek(data.week);
  $("leaderboardWeek").textContent = `WEEK ${data.week}`;
  $("leaderboardSummary").innerHTML = `
    <div class="leaderboard-stat"><span>PARTICIPANTS</span><strong>${data.participants}</strong></div>
    <div class="leaderboard-stat"><span>HIGHEST SCORE</span><strong>${data.highest}/${totalPossiblePoints}</strong></div>
    <div class="leaderboard-stat"><span>QUALIFIED</span><strong>${data.qualified}</strong></div>`;
  const qualified = data.members.filter(member => member.qualified && member.rank <= 3);
  const podium = $("leaderboardPodium");
  podium.dataset.podiumKey = qualified.length ? `leaderboard:${data.week}:${qualified.map(member => `${member.rank}:${member.name}:${member.score}`).join("|")}` : "";
  podium.innerHTML = qualified.map(member => podiumCard(member, member.rank, member.score)).join("") || `<div class="leaderboard-empty">No members have qualified yet. Complete at least 75% of scheduled tasks to appear on the podium.</div>`;
  $("leaderboardRows").innerHTML = data.members.map(member => {
    const rankCell = member.qualified ? rankBadgeMarkup(member.rank) : `<span class="leaderboard-unqualified">Keep Going</span>`;
    const className = member.qualified && member.rank <= 3 ? `leaderboard-rank-${member.rank}` : "";
    const value = consistencyPresentation(totalPossiblePoints ? member.percent : null);
    return `<tr class="${className}"><td>${rankCell}</td><td><strong>${escapeHTML(member.name)}</strong></td><td>${member.dailyDone}/${dailyPossible}</td><td>${member.conceptsDone}/${conceptsPossible}</td><td><strong>${member.score}/${totalPossiblePoints}</strong></td><td>${consistencyMeterMarkup(totalPossiblePoints ? member.percent : null, `${member.name} completion`)}<small class="${value.tone}">${totalPossiblePoints ? value.text : "No scheduled work"} ${totalPossiblePoints ? perfectBadgeMarkup(value) : ""}</small></td></tr>`;
  }).join("") || `<tr><td colspan="6">No members yet.</td></tr>`;
}

function renderLeaderboard() {
  if (!isAdmin && viewerPageData?.page === "leaderboard") {
    return renderViewerLeaderboard(viewerPageData);
  }
  const tbody = $("leaderboardRows");
  const podium = $("leaderboardPodium");
  const eligibleMinimum = possibleForWeek() ? Math.ceil(possibleForWeek() * 0.75) : Infinity;
  $("leaderboardWeek").textContent = `WEEK ${currentWeek}`;

  const rankings = state.members.map(member => ({
    name: member.name,
    ...memberStats(member.id)
  })).sort((a, b) => b.overallDone - a.overallDone ||
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  const eligible = rankings.filter(member => member.overallDone >= eligibleMinimum);

  let previousScore = null;
  let denseRank = 0;
  eligible.forEach(member => {
    if (member.overallDone !== previousScore) {
      denseRank += 1;
      previousScore = member.overallDone;
    }
    member.rank = denseRank;
  });

  const participants = state.members.length;
  const highest = rankings.length ? Math.max(...rankings.map(member => member.overallDone)) : 0;
  const dailyPossible = workingDayIndexes(currentWeek).length;
  const conceptsPossible = dailyPossible ? 2 : 0;
  const totalPossiblePoints = possibleForWeek();
  $("leaderboardSummary").innerHTML = `
    <div class="leaderboard-stat"><span>PARTICIPANTS</span><strong>${participants}</strong></div>
    <div class="leaderboard-stat"><span>HIGHEST SCORE</span><strong>${highest}/${totalPossiblePoints}</strong></div>
    <div class="leaderboard-stat"><span>QUALIFIED</span><strong>${eligible.length}</strong></div>
  `;

  if (!participants) {
    podium.innerHTML = `<div class="leaderboard-empty">No members yet. Add members from the Members page to start the rankings.</div>`;
    tbody.innerHTML = `<tr><td colspan="6">No members yet.</td></tr>`;
    return;
  }

  const podiumMembers = eligible.filter(member => member.rank <= 3);
  podium.dataset.podiumKey = podiumMembers.length ? `leaderboard:${currentWeek}:${podiumMembers.map(member => `${member.rank}:${member.name}:${member.overallDone}`).join("|")}` : "";
  podium.innerHTML = podiumMembers.map(member => podiumCard(member, member.rank, member.overallDone)).join("") || `<div class="leaderboard-empty">No members have qualified yet. Complete at least 75% of scheduled tasks to appear on the podium.</div>`;

  tbody.innerHTML = rankings.map(member => {
    const isEligible = member.overallDone >= eligibleMinimum;
    const rank = isEligible ? member.rank : null;
    const placeClass = rank && rank <= 3 ? ` leaderboard-rank-${rank}` : "";
    const value = consistencyPresentation(member.percent);
    const rankCell = rank ? rankBadgeMarkup(rank) : `<span class="leaderboard-unqualified">Keep Going</span>`;
    return `
      <tr class="${placeClass.trim()}">
        <td>${rankCell}</td>
        <td><strong>${escapeHTML(member.name)}</strong></td>
        <td>${member.dailyDone}/${dailyPossible}</td>
        <td>${member.conceptsDone}/${conceptsPossible}</td>
        <td><strong>${member.overallDone}/${totalPossiblePoints}</strong></td>
        <td>${consistencyMeterMarkup(member.percent, `${member.name} completion`)}<small class="${value.tone}">${value.text} ${perfectBadgeMarkup(value)}</small></td>
      </tr>
    `;
  }).join("");
}/* -------------------- WEEKLY REPORT -------------------- */

function renderReport() {
  const report = $("printReport");
  const totalMembers = state.members.length;
  const possible = totalPossible();
  const dailyPossible = workingDayIndexes(currentWeek).length;
  const conceptsPossible = dailyPossible ? 2 : 0;
  const done = countAllDone();

  const dailyStatuses = state.members.flatMap(member => dailyStatusesForScoring(member.id));
  const conceptStatuses = state.members.flatMap(member => conceptsForScoring(member.id));

  const dailyDone = countDone(dailyStatuses);
  const conceptDone = countDone(conceptStatuses);

  const reportRows = state.members.map(member => {
    const stats = memberStats(member.id);
    const label = overallLabel(stats);
    const consistency = consistencyPresentation(stats.percent);

    return `
      <tr class="${stats.possible > 0 && stats.overallDone === stats.possible ? "report-perfect-row" : ""}">
        <td>${escapeHTML(member.name)}</td>
        <td>${stats.dailyDone}/${dailyPossible}</td>
        <td>${stats.conceptsDone}/${conceptsPossible}</td>
        <td>${stats.overallDone}/${stats.possible}</td>
        <td><div class="report-progress ${consistency.tone}" role="progressbar" aria-label="${escapeHTML(member.name)} completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${consistency.progress}"><span style="width:${consistency.progress}%"></span></div><strong class="${consistency.tone}">${consistency.text} ${perfectBadgeMarkup(consistency)}</strong></td>
        <td><span class="status-badge ${label.className}">${label.text}</span></td>
      </tr>
    `;
  }).join("");

  const detailedRows = state.members.map(member => {
    const daily = getDaily(member.id);
    const concepts = getConcepts(member.id);

    return `
      <tr>
        <td>${escapeHTML(member.name)}</td>
        ${daily.map(status => `<td>${statusDetails(status).label}</td>`).join("")}
        ${concepts.map(status => `<td>${statusDetails(status).label}</td>`).join("")}
      </tr>
    `;
  }).join("");

  report.innerHTML = `
    <div class="report-header">
      <div>
        <div class="report-brand">DSA COMMUNITY · ADMIN REPORT</div>
        <h2>Weekly Progress Report</h2>
        <p>Week ${currentWeek} · Daily coding submissions and concept proofs</p>
      </div>
      <div class="report-date">
        Generated on<br>
        <strong>${escapeHTML(new Date().toLocaleDateString())}</strong>
      </div>
    </div>

    <div class="report-stat-grid">
      <div class="report-stat">
        <span>Group Members</span>
        <strong>${totalMembers}</strong>
      </div>
      <div class="report-stat">
        <span>Daily Submissions</span>
        <strong>${dailyDone}/${totalMembers * dailyPossible}</strong>
      </div>
      <div class="report-stat">
        <span>Concept Proofs</span>
        <strong>${conceptDone}/${totalMembers * conceptsPossible}</strong>
      </div>
      <div class="report-stat">
        <span>Overall Completion</span>
        <strong>${possible ? `${percentage(done, possible)}%` : "N/A"}</strong>
      </div>
    </div>

    <section class="report-section">
      <h3>Member Summary</h3>
      <div class="table-wrap">
        <table class="report-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Daily</th>
              <th>Concepts</th>
              <th>Total Done</th>
              <th>Completion</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${reportRows || '<tr><td colspan="6">No members registered.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    <section class="report-section">
      <h3>Detailed Status Breakdown</h3>
      <div class="table-wrap">
        <table class="report-table">
          <thead>
            <tr>
              <th>Member</th>
              ${DAYS.map(day => `<th>${day.slice(0, 3)}</th>`).join("")}
              <th>Concept 1</th>
              <th>Concept 2</th>
            </tr>
          </thead>
          <tbody>
            ${detailedRows || '<tr><td colspan="9">No member data.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    <div class="report-notes">
      <strong>Status key:</strong>
      Done = submitted/completed ·
      Not submitted = marked as missed ·
      Not marked = no status entered yet.
      <br>
      This report reflects the data recorded in the browser for Week ${currentWeek}.
    </div>

    <div class="report-footer">
      <span>DSA Admin Dashboard</span>
      <span>One Question. One Concept. One Day at a Time.</span>
    </div>
  `;
}

function printReport() {
  if (!isAdmin) {
    navigatePage("report").then(loaded => { if (loaded) requestAnimationFrame(() => window.print()); });
    return;
  }
  renderReport();
  showPage("report");

  // Wait for the report page to become visible before opening print.
  requestAnimationFrame(() => {
    window.print();
  });
}

$("exportBtn").addEventListener("click", printReport);
$("reportPrintBtn").addEventListener("click", printReport);

/* -------------------- RENDER EVERYTHING -------------------- */

function renderAll() {
  renderStats();
  renderMemberSummary();
  renderArenaAchievements();
  renderPreview();
  renderDailyTable();
  renderConceptTable();
  renderMembers();
  renderLeaderboard();
  renderReport();
  setRoleUI();
  animatePageAchievements(activePage);
}

/* -------------------- INITIALIZE APP -------------------- */

let isAdmin = false;
let isMember = false;
let memberProfile = null;
let memberProgress = null;
let memberWeek = 1;
let memberFirebaseStatus = {};
let sharedReady = false;
let activePage = "overview";
let viewerPageData = null;
let leetcodeProfiles = {};
let localSnapshot = null;
let sessionExpiryTimer = null;
let sessionExpiresAt = 0;
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function expireLocalSession() {
  clearTimeout(sessionExpiryTimer);
  sessionExpiresAt = 0;
  isAdmin = false;
  isMember = false;
  memberProfile = null;
  memberProgress = null;
  sharedReady = false;
  memberFirebaseStatus = {};
  clearViewerData();
  setRoleUI();
  setSecurityGate("Your secure session expired. Sign in again to continue.", false, true);
}

function resetSessionExpiry() {
  clearTimeout(sessionExpiryTimer);
  sessionExpiresAt = Date.now() + SESSION_MAX_AGE_MS;
  sessionExpiryTimer = setTimeout(expireLocalSession, SESSION_MAX_AGE_MS);
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && sessionExpiresAt && Date.now() >= sessionExpiresAt) expireLocalSession();
});

async function apiRequest(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options, headers: { ...(options.headers || {}), ...(options.body ? { "Content-Type": "application/json" } : {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const path = new URL(url, location.href).pathname;
    const isLoginAttempt = path === "/api/admin/login" || path === "/api/member/login";
    if (response.status === 401 && !isLoginAttempt && (isAdmin || isMember)) expireLocalSession();
    throw Object.assign(new Error(body.error || "Request failed."), { status: response.status, body });
  }
  if (isAdmin || isMember) resetSessionExpiry();
  return body;
}

function setRoleUI() {
  const authenticated = isAdmin || isMember;
  if (isMember && memberProfile) $("memberWelcomeName").textContent = memberProfile.name;
  $("loginBtn").hidden = authenticated;
  $("logoutBtn").hidden = !authenticated;
  $("adminModeIndicator").hidden = !isAdmin;
  $("memberModeIndicator").hidden = !isMember;
  $("dashboardModeHeading").textContent = `DSA COMMUNITY / ${isAdmin ? "ADMIN" : isMember ? "MEMBER" : "DASHBOARD"}`;
  $("adminSwitchMemberBtn").hidden = !isAdmin;
  $("memberSwitchAdminBtn").hidden = !isMember;
  $("adminPersonalProfileBtn").hidden = !(authenticated && memberProfile?.id);
  if (authenticated && memberProfile?.name) {
    const displayName = memberProfile.name.replace(/\s*\(ADMIN\)\s*$/i, "").trim();
    $("adminProfileName").textContent = displayName;
    $("adminProfileAvatar").textContent = getInitials(displayName);
    $("adminPersonalProfileBtn").setAttribute("aria-label", `Open ${displayName}'s profile`);
  }
  document.querySelector(".app-shell").hidden = !authenticated;
  $("memberHome").hidden = true;
  document.querySelectorAll(".admin-only").forEach(control => { control.hidden = !isAdmin; });
  $("addMemberForm").hidden = !isAdmin;
  $("memberLeetCodeForm").hidden = true;
  document.querySelectorAll(".bulk-actions, #clearDailyBtn, #clearConceptsBtn, #markAllDoneBtn, #markAllBlankBtn").forEach(control => { control.hidden = !isAdmin; });
  document.querySelectorAll("#dailyTable button, #conceptTable button, #addMemberForm input, #addMemberForm button, #clearDailyBtn, #clearConceptsBtn, #markAllDoneBtn, #markAllBlankBtn").forEach(control => { control.disabled = !isAdmin; });
  if (!isAdmin) {
    $("restoreAction")?.setAttribute("hidden", "");
  } else {
    $("restoreAction")?.removeAttribute("hidden");
  }
}

function bindGateLoginButton(button) {
  if (!button) return;
  button.addEventListener("click", () => $("loginBtn").click());
}

function bindGateMemberLoginButton(button) {
  if (!button) return;
  button.addEventListener("click", openMemberLoginDialog);
}

function setSecurityGate(message, canImport = false, canSignIn = false) {
  const gate = $("securityGate");
  gate.hidden = false;
  gate.innerHTML = `<strong>${escapeHTML(message)}</strong>${canImport ? '<button class="btn btn-primary" id="importLocalDataBtn" type="button">Import this browser’s existing data</button>' : ""}`;
  if (canSignIn) {
    const actions = document.createElement("div");
    actions.className = "gate-actions";
      actions.innerHTML = '<button class="btn btn-primary" id="gateAdminLogin" type="button">Admin Login</button><button class="btn btn-light" id="gateMemberLogin" type="button">Member Login</button>';
    gate.append(actions);
    bindGateLoginButton($("gateAdminLogin"));
      bindGateMemberLoginButton($("gateMemberLogin"));
  }
  if (canImport) $("importLocalDataBtn").addEventListener("click", async () => {
    try {
      const backup = { ...localSnapshot, currentWeek: Number(localSnapshot.currentWeek) || 1 };
      await apiRequest("/api/admin/import", { method: "POST", body: JSON.stringify(backup) });
      state = backup;
      await loadSharedData();
      try { localStorage.removeItem(STORAGE_KEY); } catch (error) { console.warn("Could not clear the migrated local copy."); }
      localSnapshot = null;
      gate.hidden = true;
      showToast("Existing data imported without replacing any server records.");
    } catch (error) { showToast(error.message, "error"); }
  });
}

async function loadSharedData() {
  const data = await apiRequest(isAdmin ? "/api/data" : "/api/member/shared-data");
  leetcodeProfiles = data.leetcode || {};
  memberFirebaseStatus = data.memberFirebaseStatus || {};
  state = { members: data.members, weeks: data.weeks, currentWeek: data.currentWeek };
  currentWeek = weekForDate(selectedCalendarDate) || state.currentWeek;
  state.currentWeek = currentWeek;
  sharedReady = true;
  ensureAllData();
  renderAll();
}

function renderMemberProgress() {
  if (!memberProfile || !memberProgress) return;
  $("memberWelcomeName").textContent = memberProfile.name;
  $("memberWeekLabel").textContent = `Week ${memberProgress.week}`;
  const scheduled = new Set(memberProgress.scheduledSlots || []);
  const dailyLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  $("memberDailyProgress").innerHTML = memberProgress.daily.map((status, slot) => {
    const available = scheduled.has(slot);
    const label = dailyLabels[slot];
    return `<div class="member-progress-item"><span>${label}</span><span class="member-progress-readonly">${available ? (status === "done" ? "Completed" : status === "absent" ? "Missed" : "Not marked") : "Not scheduled"}</span></div>`;
  }).join("");
  $("memberConceptProgress").innerHTML = memberProgress.concepts.map((status, slot) => {
    const available = scheduled.size > 0;
    return `<div class="member-progress-item"><span>Concept ${slot + 1}</span><span class="member-progress-readonly">${available ? (status === "done" ? "Completed" : status === "absent" ? "Missed" : "Not marked") : "Not scheduled"}</span></div>`;
  }).join("");
  $("memberPreviousWeek").disabled = memberWeek <= 1;
  $("memberNextWeek").disabled = memberWeek >= MAX_WEEKS;
}

function setMemberDashboardLoading() {
  $("memberDashboardName").textContent = memberProfile?.name || "Not available yet";
  $("memberDashboardSolved").textContent = "Loading…";
  $("memberDashboardEasy").textContent = "Loading…";
  $("memberDashboardMedium").textContent = "Loading…";
  $("memberDashboardHard").textContent = "Loading…";
  $("memberDashboardMessage").hidden = true;
  $("memberDashboardRetry").hidden = true;
}

async function loadMemberPersonalDashboard() {
  setMemberDashboardLoading();
  try {
    const data = await apiRequest("/api/member/dashboard");
    $("memberDashboardName").textContent = data.memberName || memberProfile?.name || "Not available yet";
    $("memberDashboardEmail").textContent = data.memberEmail || "";
    $("memberDashboardEmail").hidden = !data.memberEmail;
    const initials = (data.memberName || memberProfile?.name || "M").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
    $("memberProfileInitials").textContent = initials || "M";
    $("memberProfileInitials").hidden = Boolean(data.photoUrl);
    $("memberGroupStatus").textContent = data.groupMember
      ? "You are a member of the private DSA group."
      : "Your personal profile is ready. You are not yet a member of a group; group access requires an invitation from a group administrator.";
    $("memberProgressNav").hidden = !data.groupMember;
    $("memberLeetCodeUsername").value = data.leetCodeUsername || "";
    $("memberDashboardSolved").textContent = Number.isSafeInteger(data.questionsSolved) ? data.questionsSolved.toLocaleString() : "Not available yet";
    $("memberDashboardEasy").textContent = Number.isSafeInteger(data.easySolved) ? data.easySolved.toLocaleString() : "Not available yet";
    $("memberDashboardMedium").textContent = Number.isSafeInteger(data.mediumSolved) ? data.mediumSolved.toLocaleString() : "Not available yet";
    $("memberDashboardHard").textContent = Number.isSafeInteger(data.hardSolved) ? data.hardSolved.toLocaleString() : "Not available yet";
    const photo = $("memberProfilePhoto");
    photo.hidden = !data.photoUrl;
    photo.src = data.photoUrl || "";
  } catch (error) {
    $("memberDashboardSolved").textContent = "Not available yet";
    $("memberDashboardEasy").textContent = "Not available yet";
    $("memberDashboardMedium").textContent = "Not available yet";
    $("memberDashboardHard").textContent = "Not available yet";
    $("memberDashboardMessage").textContent = error.message || "Personal dashboard could not be loaded.";
    $("memberDashboardMessage").hidden = false;
    $("memberDashboardRetry").hidden = false;
  }
}

function showMemberPersonalDashboard() {
  if (!isMember) return;
  $("memberProgressView").hidden = true;
  $("memberPersonalDashboard").hidden = false;
  $("memberViewTitle").textContent = "My profile";
  $("memberDashboardOpen").setAttribute("aria-expanded", "true");
  $("memberDashboardNav").setAttribute("aria-pressed", "true");
  $("memberProgressNav").setAttribute("aria-pressed", "false");
  loadMemberPersonalDashboard();
}

function showMemberProgressView() {
  if (!memberProfile?.groupMember) return;
  $("memberPersonalDashboard").hidden = true;
  $("memberProgressView").hidden = false;
  $("memberViewTitle").textContent = "My progress";
  $("memberDashboardOpen").setAttribute("aria-expanded", "false");
  $("memberDashboardNav").setAttribute("aria-pressed", "false");
  $("memberProgressNav").setAttribute("aria-pressed", "true");
}

function initializeMemberDashboardNavigation() {
  $("memberDashboardOpen").addEventListener("click", showMemberPersonalDashboard);
  $("memberDashboardNav").addEventListener("click", showMemberPersonalDashboard);
  $("memberProgressNav").addEventListener("click", async () => {
    showMemberProgressView();
    try { await loadMemberProgress(memberWeek); } catch (error) { showToast(error.message, "error"); }
  });
}

async function openProfileRoute(memberId, pushHistory = false) {
  if (!/^[\w-]{1,100}$/.test(memberId || "") || (!isAdmin && !isMember)) return;
  const route = `/profile/${encodeURIComponent(memberId)}`;
  if (pushHistory && location.pathname !== route) history.pushState({}, "", route);
  document.querySelector(".app-shell").hidden = true;
  $("memberHome").hidden = true;
  $("profileRoutePage").hidden = false;
  $("routeProfileName").textContent = "Loading profile…";
  $("routeProfileSource").textContent = "Loading statistics…";
  $("routeProfileUsername").textContent = "Not linked";
  $("routeProfileLink").hidden = true;
  $("routeProfileMessage").hidden = true;
  ["routeProfileTotal", "routeProfileEasy", "routeProfileMedium", "routeProfileHard"].forEach(id => { $(id).textContent = "—"; });
  try {
    const data = await apiRequest(`/api/profile/${encodeURIComponent(memberId)}`);
    const displayName = (data.name || "Member").replace(/\s*\(ADMIN\)\s*$/i, "").trim();
    $("routeProfileName").textContent = displayName;
    $("routeProfileAvatar").textContent = getInitials(displayName);
    $("routeProfileUsername").textContent = data.leetCodeUsername || "Not linked";
    if (data.profileUrl) {
      $("routeProfileLink").href = data.profileUrl;
      $("routeProfileLink").hidden = false;
    }
    if (data.stats) {
      $("routeProfileTotal").textContent = data.stats.total.toLocaleString();
      $("routeProfileEasy").textContent = data.stats.easy.toLocaleString();
      $("routeProfileMedium").textContent = data.stats.medium.toLocaleString();
      $("routeProfileHard").textContent = data.stats.hard.toLocaleString();
      const updated = data.statsUpdatedAt ? ` · Updated ${new Date(data.statsUpdatedAt).toLocaleString()}` : "";
      $("routeProfileSource").textContent = `${data.statsSource || "LeetCode public profile"}${updated}`;
    } else {
      $("routeProfileSource").textContent = "LeetCode statistics are unavailable until the public profile can be verified.";
    }
  } catch (error) {
    $("routeProfileName").textContent = "Profile unavailable";
    $("routeProfileSource").textContent = "Profile statistics could not be loaded.";
    $("routeProfileMessage").textContent = error.message || "Profile data could not be loaded.";
    $("routeProfileMessage").hidden = false;
  }
}

function restoreDashboardRoute() {
  $("profileRoutePage").hidden = true;
  setRoleUI();
  if (isAdmin || isMember) showPage("overview");
}

async function loadMemberProgress(week = memberWeek) {
  memberWeek = Math.max(1, Math.min(MAX_WEEKS, week));
  memberProgress = await apiRequest(`/api/member/progress?week=${memberWeek}`);
  memberWeek = memberProgress.week;
  renderMemberProgress();
}

async function updateMemberProgress(button) {
  if (!isAdmin || button.disabled) return;
  button.disabled = true;
  const status = button.dataset.status === "done" ? "blank" : "done";
  try {
    await apiRequest("/api/member/progress", { method: "POST", body: JSON.stringify({ week: memberWeek, kind: button.dataset.memberProgressKind, slot: Number(button.dataset.memberProgressSlot), status }) });
    await loadMemberProgress(memberWeek);
  } catch (error) {
    showToast(error.message, "error");
    button.disabled = false;
  }
}

function clearViewerData() {
  state = { members: [], weeks: {}, currentWeek };
  viewerPageData = null;
  ["statsGrid", "memberSummary", "previewRows", "dailyTable", "conceptTable", "dailyAchievements", "conceptAchievements", "memberManager", "leaderboardRows", "leaderboardPodium", "leaderboardSummary", "printReport"].forEach(id => { if ($(id)) $(id).innerHTML = ""; });
  ["memberCountTag", "dailyCount", "conceptCount"].forEach(id => { if ($(id)) $(id).textContent = ""; });
  leetcodeActivityRecord = null;
  leetcodeTrackingSummary = null;
  leetcodeAutomationStatus = null;
  if ($("leetcodeActivitySummary")) $("leetcodeActivitySummary").innerHTML = "";
}

function renderViewerOverview(data) {
  const members = data.participants;
  const dailyPossible = members * workingDayIndexes(data.week).length;
  const conceptsPossible = members * (workingDayIndexes(data.week).length ? 2 : 0);
  const overallPossible = members * possibleForWeek(data.week);
  const completed = data.dailyDone + data.conceptsDone;
  const stats = [
    ["Group members", members, "Registered members", "blue"],
    ["Daily submissions", `${data.dailyDone}/${dailyPossible}`, "Completed this week", "green"],
    ["Concept proofs", `${data.conceptsDone}/${conceptsPossible}`, "Completed this week", "purple"],
    ["Overall completion", `${overallPossible ? Math.round(completed / overallPossible * 100) : "N/A"}${overallPossible ? "%" : ""}`, "This week's progress", "orange"]
  ];
  $("statsGrid").innerHTML = stats.map(([label, value, description, color]) => `<article class="stat-card ${color}"><div class="stat-label">${label}</div><div class="stat-value">${value}</div><div class="stat-description">${description}</div></article>`).join("");
  $("weekChip").textContent = weekForDate(selectedCalendarDate) === data.week ? `SELECTED · ${dateLabel(selectedCalendarDate)}` : `NO DATED RECORD · ${dateLabel(selectedCalendarDate)}`;
  $("memberSummary").innerHTML = data.summary.map(member => {
    const value = consistencyPresentation(overallPossible ? member.percent : null);
    return `<div class="member-summary-row ${value.tone}"><span class="member-summary-name">${escapeHTML(member.name)}</span><div class="member-summary-track">${consistencyMeterMarkup(overallPossible ? member.percent : null, `${member.name} weekly consistency`)}</div><span class="member-summary-percent ${value.tone}">${overallPossible ? value.text : "No scheduled work"} ${overallPossible ? perfectBadgeMarkup(value) : ""}</span></div>`;
  }).join("") || `<div class="empty-state">No members yet.</div>`;
  const dailyPerMember = workingDayIndexes(data.week).length;
  const conceptsPerMember = dailyPerMember ? 2 : 0;
  const overallPerMember = possibleForWeek(data.week);
  $("previewRows").innerHTML = data.summary.map(member => `<tr><td>${escapeHTML(member.name)}</td><td>${member.dailyDone}/${dailyPerMember}</td><td>${member.conceptsDone}/${conceptsPerMember}</td><td>${member.overallDone}/${overallPerMember} (${overallPerMember ? member.percent : "N/A"}%) ${perfectBadgeMarkup(consistencyPresentation(overallPerMember ? member.percent : null))}</td><td>${overallPerMember ? member.overallDone === overallPerMember ? "Complete" : member.overallDone ? "In progress" : "Not marked" : "No scheduled work"}</td></tr>`).join("") || `<tr><td colspan="5">No members yet.</td></tr>`;
  renderArenaAchievements(data.summary.map(member => ({ member, stats: member, daily: [] })));
}

async function navigatePage(page) {
  if (isAdmin) { showPage(page); return true; }
  if (!PAGE_INFO[page]) return;
  clearViewerData();
  const query = new URLSearchParams({ week: String(currentWeek) });
  if (page === "daily") query.set("date", selectedCalendarDate);
  try {
    const data = await apiRequest(`/api/page-data/${encodeURIComponent(page)}?${query}`);
    viewerPageData = data;
    if (page === "overview") renderViewerOverview(data);
    if (page === "leaderboard") renderViewerLeaderboard(data);
    if (page === "daily" || page === "concepts") {
      const weekData = page === "daily" ? { daily: data.statuses, concepts: {} } : { daily: {}, concepts: data.statuses };
      state = { members: data.members, weeks: { [String(data.week)]: weekData }, currentWeek: data.week };
      if (page === "daily") { leetcodeActivityRecord = data.activity || null; leetcodeAutomationStatus = null; }
      if (page === "daily") renderDailyTable(); else renderConceptTable();
    }
    if (page === "members") { state = { members: data.members, weeks: {}, currentWeek }; leetcodeProfiles = data.leetcode || {}; renderMembers(); }
    if (page === "report") {
      state = { members: data.members, weeks: { [String(data.week)]: { daily: data.statuses.daily, concepts: data.statuses.concepts } }, currentWeek: data.week };
      renderReport();
    }
    showPage(page);
    setRoleUI();
    return true;
  } catch (error) {
      setSecurityGate(error.message, false, !isAdmin);
    return false;
  }
}

function initializeSecurityControls() {
  const dialog = $("loginDialog");
  const formElement = $("loginForm");
  $("loginBtn").addEventListener("click", () => { $("loginError").textContent = ""; dialog.showModal(); });
  bindGateMemberLoginButton($("gateMemberLogin"));
  $("cancelMemberLogin").addEventListener("click", () => $("memberLoginDialog").close());
  $("cancelMemberEmail").addEventListener("click", () => { memberEmailTarget = null; $("memberEmailDialog").close(); });
  $("memberEmailForm").addEventListener("submit", async event => {
    event.preventDefault();
    const email = $("memberEmailInput").value.trim();
    const submit = $("saveMemberEmail");
    $("memberEmailError").textContent = "";
    if (!email) { $("memberEmailError").textContent = "Enter the approved verified Google email."; return; }
    submit.disabled = true;
    await updateMemberEmailLink(email);
    submit.disabled = false;
  });
  $("memberGoogleLogin").addEventListener("click", async () => {
    const submit = $("memberGoogleLogin");
    let google;
    let authStage = "firebase-popup-and-id-token";
    submit.disabled = true;
    submit.textContent = "Connecting…";
    $("memberLoginError").textContent = "";
    try {
      google = await window.memberFirebaseAuth.signIn();
      authStage = "backend-verification-and-profile-registration";
      console.info("[member-auth]", { stage: authStage, outcome: "started" });
      await apiRequest("/api/member/login", { method: "POST", body: JSON.stringify({ idToken: google.idToken }) });
      console.info("[member-auth]", { stage: authStage, outcome: "passed" });
      authStage = "session-confirmation";
      const sessionData = await apiRequest("/api/session");
      if (sessionData.role !== "member") throw new Error("Member Login did not start a member-only session.");
      console.info("[member-auth]", { stage: authStage, outcome: "passed" });
      isAdmin = false;
      isMember = sessionData.role === "member";
      memberProfile = sessionData.member || null;
      memberWeek = weekForDate(selectedCalendarDate) || 1;
      resetSessionExpiry();
      setRoleUI();
      $("memberLoginDialog").close();
      $("securityGate").hidden = true;
      if (isMember && memberProfile) {
        await loadSharedData();
        const requestedProfile = location.pathname.match(/^\/profile\/([\w-]{1,100})\/?$/);
        if (requestedProfile) await openProfileRoute(requestedProfile[1]);
        else showPage("overview");
        $("securityGate").hidden = true;
      }
    } catch (error) {
      console.warn("[member-auth]", { stage: authStage, outcome: "failed", code: error?.code || "request-error", status: Number.isInteger(error?.status) ? error.status : undefined });
      if (window.memberFirebaseAuth) await window.memberFirebaseAuth.signOut().catch(() => {});
      $("memberLoginError").textContent = error.message;
    }
    finally { submit.disabled = false; submit.textContent = "Continue with Google"; }
  });
  $("memberLoginDialog").addEventListener("close", () => { $("memberLoginError").textContent = ""; });
  $("memberPreviousWeek").addEventListener("click", () => { if (memberWeek > 1) loadMemberProgress(memberWeek - 1).catch(error => showToast(error.message, "error")); });
  $("memberNextWeek").addEventListener("click", () => { if (memberWeek < MAX_WEEKS) loadMemberProgress(memberWeek + 1).catch(error => showToast(error.message, "error")); });
  $("memberDashboardRetry").addEventListener("click", loadMemberPersonalDashboard);
  $("memberLeetCodeForm").addEventListener("submit", async event => {
    event.preventDefault();
    const username = $("memberLeetCodeUsername").value.trim();
    if (!username) return showToast("Enter your LeetCode username.", "error");
    try {
      await apiRequest("/api/member/profile", { method: "PUT", body: JSON.stringify({ leetCodeUsername: username }) });
      await loadMemberPersonalDashboard();
      showToast("LeetCode profile linked.");
    } catch (error) { showToast(error.message, "error"); }
  });
  $("memberLogoutBtn").addEventListener("click", logoutCurrentSession);
  $("adminSwitchMemberBtn").addEventListener("click", openMemberLoginDialog);
  $("memberSwitchAdminBtn").addEventListener("click", () => {
    const emailField = formElement.elements.namedItem("email");
    if (emailField && memberProfile?.email) emailField.value = memberProfile.email;
    $("loginError").textContent = "";
    dialog.showModal();
  });
  $("adminPersonalProfileBtn").addEventListener("click", () => {
    if (memberProfile?.id) openProfileRoute(memberProfile.id, true);
  });
  $("profileBackToDashboard").addEventListener("click", event => {
    event.preventDefault();
    history.replaceState({}, "", "/");
    restoreDashboardRoute();
  });
  window.addEventListener("popstate", () => {
    const match = location.pathname.match(/^\/profile\/([\w-]{1,100})\/?$/);
    if (match) openProfileRoute(match[1]);
    else restoreDashboardRoute();
  });
  bindGateLoginButton($("gateAdminLogin"));
  $("cancelLogin").addEventListener("click", () => dialog.close());
  $("togglePassword").addEventListener("click", event => {
    const input = $("adminPassword");
    const showing = input.type === "password";
    input.type = showing ? "text" : "password";
    event.currentTarget.textContent = showing ? "Hide" : "Show";
    event.currentTarget.setAttribute("aria-label", showing ? "Hide password" : "Show password");
    event.currentTarget.setAttribute("aria-pressed", String(showing));
    input.focus();
  });
  formElement.addEventListener("submit", async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submit = $("loginSubmit");
    submit.disabled = true;
    submit.textContent = "Verifying…";
    $("loginError").textContent = "";
    try {
      const login = await apiRequest("/api/admin/login", { method: "POST", body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
      isAdmin = true;
      isMember = false;
      memberProfile = login.member || null;
      resetSessionExpiry();
      setRoleUI();
      formElement.reset();
      $("adminPassword").type = "password";
      $("togglePassword").textContent = "Show";
      $("loginDialog").close();
      try {
        await loadSharedData();
        $("securityGate").hidden = true;
        showToast("Admin Mode is active.");
      } catch (error) {
        if (error.status === 404) {
          localSnapshot = loadState();
          state = localSnapshot;
          currentWeek = weekForDate(selectedCalendarDate) || state.currentWeek || 1;
          state.currentWeek = currentWeek;
          ensureAllData();
          renderAll();
          setSecurityGate("Shared data is not initialized. Import this browser's existing data to preserve it.", true);
        } else if (!isAdmin) {
          setSecurityGate("Your admin session expired. Sign in again to continue.", false, true);
        } else {
          setSecurityGate(error.message);
        }
      }
    } catch (error) { $("loginError").textContent = error.message; }
    finally { submit.disabled = false; submit.textContent = "Login & Continue"; }
  });
  $("logoutBtn").addEventListener("click", logoutCurrentSession);
}

function openMemberLoginDialog() {
  $("memberLoginError").textContent = "";
  $("memberLoginDialog").showModal();
}

async function logoutCurrentSession() {
  try {
    await apiRequest("/api/logout", { method: "POST", body: "{}" });
    if (isMember && window.memberFirebaseAuth) await window.memberFirebaseAuth.signOut().catch(() => {});
    isAdmin = false;
    isMember = false;
    memberProfile = null;
    memberProgress = null;
    sharedReady = false;
    window.location.reload();
  } catch (error) { showToast(error.message, "error"); }
}

async function initializeApp() {
  // Bind this view independently of the broader security-control setup so a
  // member's navigation does not depend on unrelated login controls binding.
  initializeMemberDashboardNavigation();
  // Do not inherit a restored scroll offset when the dashboard first opens.
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  $("securityGate").hidden = false;
  window.scrollTo(0, 0);
  const initialWeek = weekForDate(selectedCalendarDate);
  if (initialWeek) { currentWeek = initialWeek; state.currentWeek = initialWeek; }
  initializePhaseTracker();
  initializeLeetCodeActivityControls();
  initializeSecurityControls();
  const profileRoute = location.pathname.match(/^\/profile\/([\w-]{1,100})\/?$/);
  try {
    const session = await apiRequest("/api/session");
    isAdmin = session.role === "admin";
    isMember = session.role === "member";
    memberProfile = session.member || null;
    if (isAdmin || isMember) resetSessionExpiry();
    setRoleUI();
    if (isAdmin) try {
      await loadSharedData();
      $("securityGate").hidden = true;
      if (profileRoute) await openProfileRoute(profileRoute[1]);
    } catch (error) {
      if (error.status === 404) {
        localSnapshot = loadState();
        state = localSnapshot;
        currentWeek = weekForDate(selectedCalendarDate) || state.currentWeek || 1;
        state.currentWeek = currentWeek;
        ensureAllData();
        renderAll();
        setSecurityGate("Shared data is not initialized. Import this browser’s existing data to preserve it, or use the admin import endpoint.", true);
      } else {
        setSecurityGate(error.message);
      }
    } else if (isMember) {
      $("securityGate").hidden = true;
      await loadSharedData();
      if (profileRoute) await openProfileRoute(profileRoute[1]);
      else showPage("overview");
    } else {
      state = { members: [], weeks: {}, currentWeek };
      setSecurityGate("Choose an account type to sign in.", false, true);
    }
  } catch (error) {
    setSecurityGate("Secure server unavailable. Start the dashboard server; local-only mode is disabled.", false, true);
    console.error("Dashboard security initialization failed:", error.message);
  }
}

initializeApp();
