
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
  arena: { title: "Race Arena", id: "arenaPage" },
  leaderboard: { title: "Leaderboard", id: "leaderboardPage" },
  report: { title: "Weekly Report", id: "reportPage" },
  aimentor: { title: "AI Code Mentor", id: "aiMentorPage" }
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

function championFigure(rank, style = "default", memberId = null) {
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
    ${memberId ? `<div id="podium-avatar-${memberId}" class="podium-avatar-mount" style="position:absolute;inset:0;width:100%;height:100%;z-index:2;"></div>` : ""}
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
      ${championFigure(rank, selectChampionStyle(member), member.id)}
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
  if (pageName === "aimentor") {
    openAiCodeMentorWorkspace({ isStandalone: true });
    return;
  }
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
  if (pageName === "arena") {
    loadAndMountArenaPage(viewerPageData?.arena || null);
  } else {
    cleanupArenaPage();
  }

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
  if (!container) return;
  $("memberCountTag").textContent = `${state.members.length} MEMBER${state.members.length === 1 ? "" : "S"}`;

  if (!state.members.length) {
    container.innerHTML = `<div class="empty-state"><strong>No members registered</strong>No members found in the active group.</div>`;
    return;
  }

  container.innerHTML = state.members.map((member, index) => {
    const isLeader = member.role === "Leader" || member.role === "owner" || member.rawRole === "owner";
    const roleLabel = isLeader ? "LEADER" : "MEMBER";
    return `
    <article class="managed-member">
      <a class="member-avatar member-profile-open" href="/profile/${encodeURIComponent(member.id)}" data-open-profile="${escapeHTML(member.id)}" aria-label="Open ${escapeHTML(member.name)}'s profile">${escapeHTML(getInitials(member.name))}</a>
      <div class="member-info">
        <div class="member-name-row">
          <strong><a class="member-name-profile member-profile-open" href="/profile/${encodeURIComponent(member.id)}" data-open-profile="${escapeHTML(member.id)}">${escapeHTML(member.name)}</a></strong>
          <span class="tiny-tag ${isLeader ? 'is-leader' : ''}">${escapeHTML(roleLabel)}</span>
        </div>
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
    </article>`;
  }).join("");

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

let podiumAvatarInstances = [];
function mountLeaderboardPodiumAvatars(members = []) {
  podiumAvatarInstances.forEach(inst => {
    try { inst?.unmount?.(); } catch (_) {}
  });
  podiumAvatarInstances = [];
  if (!window.CharacterVerseEmbed?.mountCharacterAvatar || !Array.isArray(members)) return;
  members.forEach(member => {
    const mountEl = $(`podium-avatar-${member.id}`);
    if (!mountEl) return;
    const appearance = member.characterVerse?.appearance || null;
    if (!appearance) return;
    try {
      const instance = window.CharacterVerseEmbed.mountCharacterAvatar(mountEl, {
        appearance,
        profilePreview: false,
        autoRotate: true,
        onReady: () => {
          const svgFigure = mountEl.parentElement?.querySelector(".champion-avatar");
          if (svgFigure) svgFigure.style.display = "none";
        }
      });
      if (instance) podiumAvatarInstances.push(instance);
    } catch (_) {}
  });
}

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
  mountLeaderboardPodiumAvatars(qualified);
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
  mountLeaderboardPodiumAvatars(podiumMembers);

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
let ensureMemberCharacterVerse = () => {};
let routeAvatarInstance = null;
let memberAvatarInstance = null;
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function expireLocalSession() {
  routeAvatarInstance?.unmount();
  routeAvatarInstance = null;
  memberAvatarInstance?.unmount();
  memberAvatarInstance = null;
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

let dailyWorkspaceData = null;

function workspaceTimestamp(value) {
  if (!value) return "Not yet synchronized";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(date) : "Not available";
}

function renderDailyWorkspace(data) {
  dailyWorkspaceData = data;
  const connection = data?.connection || null;
  const workspace = data?.workspace || null;
  $("dailyWorkspaceUsername").value = connection?.username || "";
  $("dailyWorkspaceDisconnect").hidden = !connection || connection.status === "legacy";
  $("dailyWorkspaceSync").disabled = !connection;
  const activityDate = workspace?.activityDate || data?.activityDate || "Unavailable";
  $("dailyWorkspaceActivityDate").value = /^\d{4}-\d{2}-\d{2}$/.test(activityDate) ? activityDate : "";
  $("dailyWorkspaceDate").textContent = `Activity day: ${activityDate} (05:30 AM IST cutoff)`;
  const sourceNotice = workspace?.sourceWindowMayBeIncomplete ? ` The public response reached its ${workspace.sourceLimit}-submission limit, so this day may be incomplete.` : "";
  $("dailyWorkspaceStatus").textContent = connection
    ? `${connection.status === "legacy" ? "Legacy mapping available; synchronize to verify it." : "Connected to " + connection.username + "."} ${workspace ? `Last successful sync: ${workspaceTimestamp(workspace.lastSyncedAt)}.` : "No workspace has been synchronized yet."}${workspace?.syncStatus === "failed" ? ` Latest sync failed: ${workspace.syncError}.` : ""}${sourceNotice}`
    : "Connect your public LeetCode username to create today’s private workspace.";
  $("dailyWorkspaceSummary").innerHTML = workspace ? [
    ["Attempts", workspace.submissionCount], ["Accepted", workspace.acceptedCount], ["Other verdicts", workspace.otherVerdictCount]
  ].map(([label, value]) => `<article><span>${label}</span><strong>${Number(value) || 0}</strong></article>`).join("") : "";
  const rows = workspace?.submissions || [];
  $("dailyWorkspaceList").innerHTML = !connection
    ? `<p class="daily-workspace-empty">No account connected yet.</p>`
    : !workspace ? `<p class="daily-workspace-empty">No LeetCode submissions found for your current activity day. Select Sync now after connecting.</p>`
    : !rows.length ? `<p class="daily-workspace-empty">No LeetCode submissions found for your current activity day.</p>`
    : rows.map(row => `<article class="daily-submission-card"><div><h3>${escapeHTML(row.problemTitle)}</h3><p>${escapeHTML(row.language || "Language unavailable")} · ${escapeHTML(row.verdict)} · ${workspaceTimestamp(row.submittedAt)}</p>${row.problemUrl ? `<a href="${escapeHTML(row.problemUrl)}" target="_blank" rel="noopener noreferrer">Open problem</a>` : ""}</div><button class="btn btn-light btn-review-mentor" type="button" data-review-slug="${escapeHTML(row.problemSlug || '')}" data-review-title="${escapeHTML(row.problemTitle)}" data-review-status="${escapeHTML(row.verdict)}" data-review-lang="${escapeHTML(row.language || '')}" data-review-url="${escapeHTML(row.problemUrl || '')}">AI Code Mentor</button></article>`).join("");
}

async function loadDailyWorkspace(activityDate = null) {
  if (!isMember) return;
  const path = activityDate ? `/api/daily-workspace/${encodeURIComponent(activityDate)}` : "/api/daily-workspace/current";
  try { renderDailyWorkspace(await apiRequest(path)); }
  catch (error) {
    $("dailyWorkspaceStatus").textContent = error.message || "Daily workspace is temporarily unavailable.";
    $("dailyWorkspaceList").innerHTML = "";
  }
}

function initializeDailyWorkspace() {
  $("dailyWorkspaceConnectionForm").addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const result = await apiRequest("/api/leetcode/connection", { method: "POST", body: JSON.stringify({ username: $("dailyWorkspaceUsername").value }) });
      renderDailyWorkspace(result);
      showToast("LeetCode account connected and synchronized.");
    } catch (error) { $("dailyWorkspaceStatus").textContent = error.message; }
    finally { button.disabled = false; }
  });
  $("dailyWorkspaceSync").addEventListener("click", async () => {
    $("dailyWorkspaceSync").disabled = true;
    try { renderDailyWorkspace(await apiRequest("/api/daily-workspace/sync", { method: "POST", body: "{}" })); }
    catch (error) { $("dailyWorkspaceStatus").textContent = error.message; }
    finally { $("dailyWorkspaceSync").disabled = !dailyWorkspaceData?.connection; }
  });
  $("dailyWorkspaceDisconnect").addEventListener("click", async () => {
    try { await apiRequest("/api/leetcode/connection", { method: "DELETE", body: "{}" }); await loadDailyWorkspace(); showToast("LeetCode account disconnected. Existing private workspaces were retained."); }
    catch (error) { $("dailyWorkspaceStatus").textContent = error.message; }
  });
  $("dailyWorkspaceActivityDate").addEventListener("change", event => {
    const activityDate = event.currentTarget.value;
    if (activityDate) void loadDailyWorkspace(activityDate);
  });
}

let groupManagementState = { groups: [], activeGroupId: null, detail: null, pendingRequest: null };

function groupManagementMessage(message = "") {
  const element = $("groupManagementMessage");
  if (element) element.textContent = message;
}

function groupStatusLabel(group) {
  if (group.legacy) return "Legacy group";
  return group.active ? "Active" : "Pending — invite and approve one more member to activate";
}

function renderGroupManagement() {
  const panel = $("groupManagementPanel");
  if (!panel) return;
  panel.hidden = !isMember;
  if (!isMember) return;

  const forms = $("groupManagementForms");
  const pendingCard = $("groupPendingRequestCard");
  const subtitle = $("groupManagementSubtitle");
  const list = $("groupManagementList");
  const { groups, activeGroupId, detail, pendingRequest } = groupManagementState;

  const hasGroup = groups.length > 0;
  const hasPending = Boolean(pendingRequest);

  if (hasGroup) {
    if (forms) forms.hidden = true;
    if (pendingCard) pendingCard.hidden = true;
    const isOwner = detail?.group?.role === "owner";
    if (subtitle) {
      subtitle.textContent = isOwner
        ? "Your active learning group (Group Leader) · Manage members and requests."
        : "Your active learning group · Member view.";
    }

    const cards = groups.map(group => `<article class="group-card is-selected">
      <div><strong>${escapeHTML(group.name)}</strong><span>${escapeHTML(groupStatusLabel(group))} · ${group.memberCount}/${group.maxMembers} members</span></div>
      <span class="tiny-tag">${group.legacy ? "LEGACY" : group.role === "owner" ? "LEADER" : "MEMBER"}</span>
    </article>`).join("");

    const ownerControls = detail?.group?.role === "owner"
      ? `<div class="group-owner-actions">
          ${!detail.group.legacy ? `<button class="btn btn-primary" id="createGroupInvitation" type="button">Generate Invitation Token</button>` : `<p class="group-members"><em>Legacy group membership is synchronized with the community dashboard.</em></p>`}
          ${(detail.pendingRequests || []).length ? `<h5>Pending Membership Requests</h5>` + (detail.pendingRequests || []).map(request => `<div class="group-request"><span>${escapeHTML(request.displayName)}</span><button class="btn btn-light" data-group-decision="approve" data-user-id="${escapeHTML(request.userId)}" type="button">Approve</button><button class="btn btn-light" data-group-decision="reject" data-user-id="${escapeHTML(request.userId)}" type="button">Reject</button></div>`).join("") : !detail.group.legacy ? "<p class=\"group-empty\">No pending membership requests.</p>" : ""}
        </div>`
      : "";

    const details = detail?.group ? `<section class="group-detail">
      <h4>${escapeHTML(detail.group.name)}</h4>
      <p>${escapeHTML(groupStatusLabel(detail.group))}</p>
      <p class="group-members"><strong>Members:</strong> ${detail.members.map(member => `${escapeHTML(member.displayName)}${member.role === "owner" ? " (leader)" : ""}`).join(" · ")}</p>
      ${ownerControls}
    </section>` : "";

    list.innerHTML = `${cards}${details}`;
    $("createGroupInvitation")?.addEventListener("click", createGroupInvitation);
    list.querySelectorAll("[data-group-decision]").forEach(button => button.addEventListener("click", () => decideGroupRequest(button.dataset.userId, button.dataset.groupDecision)));
  } else if (hasPending) {
    if (forms) forms.hidden = true;
    if (subtitle) subtitle.textContent = "Your membership request is currently awaiting owner approval.";
    if (pendingCard) {
      pendingCard.hidden = false;
      pendingCard.innerHTML = `<article class="group-card is-pending">
        <div>
          <strong>${escapeHTML(pendingRequest.groupName || "Learning Group")}</strong>
          <span>Your request to join this group is pending owner approval. You will gain access once the group leader approves your request.</span>
          <small>Requested: ${new Date(pendingRequest.requestedAt).toLocaleString()}</small>
        </div>
        <span class="tiny-tag">PENDING APPROVAL</span>
      </article>`;
    }
    list.innerHTML = "";
  } else {
    if (forms) forms.hidden = false;
    if (pendingCard) pendingCard.hidden = true;
    if (subtitle) subtitle.textContent = "You have not joined a learning group yet. Choose an option below:";
    list.innerHTML = "<p class=\"group-empty\">You are not a member of any group yet. Create your own group above or enter an invitation code to request joining an existing group.</p>";
  }
}

async function loadGroupMembers(groupId) {
  const targetId = groupId || groupManagementState.activeGroupId || (groupManagementState.groups[0]?.id) || null;
  if (!targetId) {
    state.members = [];
    renderMembers();
    return;
  }
  try {
    const data = await apiRequest(`/api/groups/${encodeURIComponent(targetId)}/members`);
    state.members = (data.members || []).map(m => ({
      id: m.id,
      name: m.name,
      role: m.role,
      rawRole: m.rawRole,
      joinedAt: m.joinedAt
    }));
    leetcodeProfiles = data.leetcode || {};
    const titleEl = $("membersSectionTitle") || $("membersPage")?.querySelector(".members-list-heading h3");
    if (titleEl && data.groupName) {
      titleEl.textContent = `${data.groupName} Members`;
    }
    renderMembers();
  } catch (error) {
    if (error.status === 403) {
      state.members = [];
      renderMembers();
      showToast("You are not authorized to view this group's members.", "error");
    } else {
      console.warn("Could not load group members:", error.message);
    }
  }
}

async function loadGroupManagement() {
  if (!isMember) return;
  try {
    const data = await apiRequest("/api/groups");
    groupManagementState.groups = data.groups || [];
    groupManagementState.activeGroupId = data.activeGroupId || groupManagementState.groups[0]?.id || null;
    groupManagementState.pendingRequest = data.pendingRequest || null;
    groupManagementState.detail = groupManagementState.activeGroupId ? await apiRequest(`/api/groups/${encodeURIComponent(groupManagementState.activeGroupId)}`) : null;
    renderGroupManagement();
  } catch (error) {
    groupManagementMessage(error.message || "Groups are temporarily unavailable.");
    renderGroupManagement();
  }
}

async function selectActiveGroup(groupId) {
  try {
    await apiRequest("/api/groups/active", { method: "POST", body: JSON.stringify({ groupId }) });
    groupManagementState.activeGroupId = groupId;
    clearViewerData();
    state.members = [];
    state.weeks = {};
    arenaCurrentState = null;
    await loadGroupManagement();
    await loadGroupMembers(groupId);
    await loadSharedData();
    if (activePage && activePage !== "members") {
      await navigatePage(activePage);
    }
  } catch (error) { groupManagementMessage(error.message); }
}

async function createGroupInvitation() {
  if (!groupManagementState.activeGroupId) return;
  try {
    const result = await apiRequest(`/api/groups/${encodeURIComponent(groupManagementState.activeGroupId)}/invitations`, { method: "POST", body: "{}" });
    groupManagementMessage(`Invitation code (shown once): ${result.code}`);
    await loadGroupManagement();
  } catch (error) { groupManagementMessage(error.message); }
}

async function decideGroupRequest(userId, decision) {
  if (!groupManagementState.activeGroupId) return;
  try {
    await apiRequest(`/api/groups/${encodeURIComponent(groupManagementState.activeGroupId)}/requests/${encodeURIComponent(userId)}/${decision}`, { method: "POST", body: "{}" });
    groupManagementMessage(decision === "approve" ? "Member approved." : "Membership request rejected.");
    await loadGroupManagement();
    if (groupManagementState.activeGroupId) {
      await loadGroupMembers(groupManagementState.activeGroupId);
    }
  } catch (error) { groupManagementMessage(error.message); }
}

function initializeGroupManagement() {
  $("createGroupForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    try {
      const result = await apiRequest("/api/groups", { method: "POST", body: JSON.stringify({ name: new FormData(event.currentTarget).get("name") }) });
      event.currentTarget.reset();
      groupManagementMessage(`${result.group.name} is pending until a second member is approved.`);
      groupManagementState.activeGroupId = result.group.id;
      await loadGroupManagement();
      await loadGroupMembers(result.group.id);
    } catch (error) { groupManagementMessage(error.message); }
  });
  $("joinGroupForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    try {
      const result = await apiRequest("/api/groups/join-requests", { method: "POST", body: JSON.stringify({ code: new FormData(event.currentTarget).get("code") }) });
      event.currentTarget.reset();
      groupManagementMessage(`Join request sent to ${result.group.name}.`);
    } catch (error) { groupManagementMessage(error.message); }
  });
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

const resetAdminLoginForm = () => {
  const formElement = $("loginForm");
  if (!formElement) return;
  formElement.reset();
  const passwordInput = $("adminPassword");
  if (passwordInput) {
    passwordInput.value = "";
    passwordInput.type = "password";
  }
  const toggleBtn = $("togglePassword");
  if (toggleBtn) {
    toggleBtn.textContent = "Show";
    toggleBtn.setAttribute("aria-label", "Show password");
    toggleBtn.setAttribute("aria-pressed", "false");
  }
  const errorEl = $("loginError");
  if (errorEl) errorEl.textContent = "";
}

function openAdminLoginDialog() {
  resetAdminLoginForm();
  $("loginDialog")?.showModal();
}

function openMemberLoginDialog() {
  const errorEl = $("memberLoginError");
  if (errorEl) errorEl.textContent = "";
  $("memberLoginDialog")?.showModal();
}

function bindGateLoginButton(button) {
  if (!button) return;
  button.onclick = openAdminLoginDialog;
}

function bindGateMemberLoginButton(button) {
  if (!button) return;
  button.onclick = openMemberLoginDialog;
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
  const activeId = groupManagementState.activeGroupId || (groupManagementState.groups[0]?.id) || null;
  if (!isAdmin && !activeId) {
    state = { members: [], weeks: {}, currentWeek: 1 };
    leetcodeProfiles = {};
    memberFirebaseStatus = {};
    sharedReady = true;
    renderAll();
    return;
  }
  try {
    const data = await apiRequest(isAdmin ? "/api/data" : "/api/member/shared-data");
    leetcodeProfiles = data.leetcode || {};
    memberFirebaseStatus = data.memberFirebaseStatus || {};
    state = { members: data.members || [], weeks: data.weeks || {}, currentWeek: data.currentWeek || 1 };
    currentWeek = weekForDate(selectedCalendarDate) || state.currentWeek;
    state.currentWeek = currentWeek;
    sharedReady = true;
    ensureAllData();
    renderAll();
  } catch (err) {
    console.warn("Failed to load shared data:", err.message);
    state = { members: [], weeks: {}, currentWeek: 1 };
    sharedReady = true;
    renderAll();
  }
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
  $("memberDashboardHard").textContent = "Loading…";
  $("memberDashboardEasy").textContent = "Loading…";
  $("memberDashboardMedium").textContent = "Loading…";
  $("memberDashboardHard").textContent = "Loading…";
  $("memberDashboardMessage").hidden = true;
  $("memberDashboardRetry").hidden = true;
  $("memberCharacterSummary").textContent = "Loading your secure character profile...";
  $("memberCoinBalance").textContent = "-";
  $("memberEquippedOutfit").textContent = "Loading";
  $("memberEquippedVehicle").textContent = "Loading";
}

function characterVerseLabel(value, fallback) {
  if (!value) return fallback;
  return String(value).replace(/^(outfit-|vehicle-)/, "").replace(/-/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

async function loadMemberCharacterVerseSummary() {
  try {
    const profile = await apiRequest("/api/characterverse/me");
    const appearance = profile.appearance || {};
    const selected = characterVerseLabel(appearance.equippedCharacterId || appearance.selectedCharacterId, "Starter character");
    $("memberCharacterSummary").textContent = `${selected} is ready in your 3D studio. Customize its appearance, manage your wardrobe, or visit the garage without leaving your profile.`;
    $("memberCoinBalance").textContent = Number.isSafeInteger(profile.wallet?.coins) ? profile.wallet.coins.toLocaleString() : "0";
    $("memberEquippedOutfit").textContent = characterVerseLabel(appearance.equippedOutfits?.[appearance.equippedCharacterId || appearance.selectedCharacterId], "Default");
    $("memberEquippedVehicle").textContent = characterVerseLabel(appearance.equippedVehicleId, "On foot");
  } catch (error) {
    $("memberCharacterSummary").textContent = "Your character studio is temporarily unavailable. Your DSA progress remains available.";
    $("memberCoinBalance").textContent = "Unavailable";
    $("memberEquippedOutfit").textContent = "Unavailable";
    $("memberEquippedVehicle").textContent = "Unavailable";
  }
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
    const memberFallback = $("memberProfileInitials");
    photo.hidden = !data.photoUrl;
    photo.src = data.photoUrl || "";
    if (memberFallback) memberFallback.hidden = Boolean(data.photoUrl);
    void loadMemberCharacterVerseSummary();
    void loadDailyWorkspace();

    const memberMount = $("memberProfileCharacterMount");
    if (!memberAvatarInstance && window.CharacterVerseEmbed?.mountCharacterAvatar && memberMount) {
      try {
        memberAvatarInstance = window.CharacterVerseEmbed.mountCharacterAvatar(memberMount, {
          onReady: () => {
            memberFallback.hidden = true;
            photo.hidden = true;
          },
          onError: () => {
            if (!data.photoUrl) memberFallback.hidden = false;
            else photo.hidden = false;
          }
        });
      } catch {
        if (!data.photoUrl) memberFallback.hidden = false;
        else photo.hidden = false;
      }
    }
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
  // The Three renderer must be created only after this visible, authenticated
  // member view exists. Mounting it during boot created a zero-sized canvas and
  // sent the profile request before the member session was established.
  requestAnimationFrame(ensureMemberCharacterVerse);
  loadMemberPersonalDashboard();
}

function showMemberProgressView() {
  if (!memberProfile?.groupMember) return;
  memberAvatarInstance?.unmount();
  memberAvatarInstance = null;
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
  const memberMentorNav = $("memberMentorNav");
  if (memberMentorNav) {
    memberMentorNav.addEventListener("click", () => {
      openAiCodeMentorWorkspace({ isStandalone: true });
    });
  }
  $("memberProgressNav").addEventListener("click", async () => {
    showMemberProgressView();
    try { await loadMemberProgress(memberWeek); } catch (error) { showToast(error.message, "error"); }
  });
  const characterMount = $("memberCharacterVerseMount");
  const frameFallback = $("memberCharacterFrameFallback");
  const characterStage = characterMount.closest(".member-character-stage");
  const frameStatus = $("memberCharacterFrameStatus");
  const frameRetry = $("memberCharacterFrameRetry");
  let characterFrameReady = false;
  let characterFrameTimer;
  let characterVerse;
  const showCharacterFrameFallback = (message, canRetry = false) => {
    characterFrameReady = false;
    characterStage.classList.remove("is-ready");
    frameFallback.hidden = false;
    frameStatus.textContent = message;
    frameRetry.hidden = !canRetry;
  };
  const markCharacterFrameReady = () => {
    if (characterFrameReady) return;
    characterFrameReady = true;
    clearTimeout(characterFrameTimer);
    characterStage.classList.add("is-ready");
    frameFallback.hidden = false;
    frameRetry.hidden = true;
  };
  const receiveCharacterVerseReady = (event) => {
    if (event.target === characterMount) markCharacterFrameReady();
  };
  characterMount.addEventListener("characterverse-preview-ready", receiveCharacterVerseReady);
  const mountCharacterVerse = () => {
    clearTimeout(characterFrameTimer);
    showCharacterFrameFallback("Loading your character model...");
    try {
      characterVerse?.unmount();
      if (!window.CharacterVerseEmbed?.mountCharacterVerse) throw new Error("The integrated CharacterVerse bundle is unavailable.");
      characterVerse = window.CharacterVerseEmbed.mountCharacterVerse(characterMount);
      characterFrameTimer = setTimeout(() => showCharacterFrameFallback("The 3D preview is taking longer than expected. Your saved character and DSA progress are safe.", true), 15000);
    } catch {
      showCharacterFrameFallback("The integrated 3D studio could not load. Check your connection and try again.", true);
    }
  };
  ensureMemberCharacterVerse = () => {
    if (!isMember || characterVerse) return;
    mountCharacterVerse();
  };
  frameRetry.addEventListener("click", () => {
    mountCharacterVerse();
  });
  document.querySelectorAll("[data-characterverse-tab]").forEach(button => button.addEventListener("click", () => {
    const tab = button.dataset.characterverseTab;
    characterVerse?.navigate(tab);
    characterMount.scrollIntoView({ behavior: "smooth", block: "center" });
  }));
}

let currentProfileMemberId = null;

function formatSubmissionTime(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatLang(lang) {
  if (!lang) return "Code";
  const map = {
    python3: "Python 3", python: "Python", cpp: "C++", java: "Java",
    javascript: "JavaScript", typescript: "TypeScript", golang: "Go",
    csharp: "C#", rust: "Rust", c: "C", swift: "Swift", kotlin: "Kotlin"
  };
  return map[lang.toLowerCase()] || lang;
}

function renderDailyQuestionCard(q) {
  const diffClass = q.difficulty ? `badge-${q.difficulty.toLowerCase()}` : "";
  const diffBadge = q.difficulty ? `<span class="badge-difficulty ${diffClass}">${escapeHTML(q.difficulty)}</span>` : "";
  const statusClass = q.status === "Accepted" ? "status-accepted" : "status-attempted";
  const attemptsBadge = q.attemptsCount > 1
    ? `<span class="badge-attempts" title="Attempt history: ${escapeHTML((q.verdicts || []).join(', '))}">⚡ ${q.attemptsCount} attempts</span>`
    : "";
  const langBadge = q.language ? `<span class="badge-lang">${escapeHTML(formatLang(q.language))}</span>` : "";
  const timeFormatted = formatSubmissionTime(q.submittedAt);
  const timeHtml = timeFormatted ? `<time class="question-time" datetime="${escapeHTML(q.submittedAt || '')}">Submitted at ${escapeHTML(timeFormatted)}</time>` : "";
  const leetCodeUrl = q.url || (q.titleSlug ? `https://leetcode.com/problems/${encodeURIComponent(q.titleSlug)}/` : "https://leetcode.com/");
  const problemIdText = q.questionFrontendId ? `#${escapeHTML(q.questionFrontendId)} · ` : "";
  const subId = q.submissionId || (q.attempts?.[q.attempts.length - 1]?.submissionId) || "";

  return `
    <article class="daily-question-card" data-review-slug="${escapeHTML(q.titleSlug || '')}" data-review-title="${escapeHTML(q.title || '')}" data-review-diff="${escapeHTML(q.difficulty || '')}" data-review-status="${escapeHTML(q.status || '')}" data-review-lang="${escapeHTML(q.language || '')}" data-review-url="${escapeHTML(leetCodeUrl)}" data-review-attempts="${q.attemptsCount || 1}" data-frontend-id="${escapeHTML(q.questionFrontendId || '')}" data-submission-id="${escapeHTML(subId)}">
      <div class="daily-question-top">
        <div class="daily-question-header">
          <h4 class="daily-question-title">${escapeHTML(q.title || "LeetCode Problem")}</h4>
          ${diffBadge}
        </div>
        ${q.titleSlug ? `<p class="daily-question-slug">${problemIdText}${escapeHTML(q.titleSlug)}</p>` : ""}
        <div class="daily-question-badges">
          <span class="badge-status ${statusClass}">${escapeHTML(q.status || "Submitted")}</span>
          ${attemptsBadge}
          ${langBadge}
          <span class="badge-source-status source-missing" id="sourceBadge-${escapeHTML(q.titleSlug || q.questionFrontendId || '')}">Waiting for sync</span>
        </div>
      </div>
      <div class="daily-question-bottom">
        ${timeHtml}
        <div class="daily-question-actions">
          <button type="button" class="btn-import-source-quick" data-review-slug="${escapeHTML(q.titleSlug || '')}" data-review-title="${escapeHTML(q.title || '')}" data-review-diff="${escapeHTML(q.difficulty || '')}" data-review-status="${escapeHTML(q.status || '')}" data-review-lang="${escapeHTML(q.language || '')}" data-review-url="${escapeHTML(leetCodeUrl)}" data-submission-id="${escapeHTML(subId)}" data-frontend-id="${escapeHTML(q.questionFrontendId || '')}" title="Import submitted code">
            + Import Code
          </button>
          <button type="button" class="btn-review-mentor" data-review-slug="${escapeHTML(q.titleSlug || '')}" data-review-title="${escapeHTML(q.title || '')}" data-review-diff="${escapeHTML(q.difficulty || '')}" data-review-status="${escapeHTML(q.status || '')}" data-review-lang="${escapeHTML(q.language || '')}" data-review-url="${escapeHTML(leetCodeUrl)}" data-submission-id="${escapeHTML(subId)}" data-frontend-id="${escapeHTML(q.questionFrontendId || '')}">
            <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13" aria-hidden="true"><path d="M10 2a6 6 0 00-6 6c0 1.887.87 3.567 2.227 4.673A4.004 4.004 0 005 16v1a1 1 0 001 1h8a1 1 0 001-1v-1a4.004 4.004 0 00-1.227-3.327A6.002 6.002 0 0016 8a6 6 0 00-6-6zm-1 12.938A2.001 2.001 0 0110 14c.4 0 .77.118 1 .324V16H9v-1.062zM8 8a2 2 0 114 0 2 2 0 01-4 0z"/></svg>
            AI Mentor
          </button>
          <a class="question-leetcode-link" href="${escapeHTML(leetCodeUrl)}" target="_blank" rel="noopener noreferrer">View on LeetCode ↗</a>
        </div>
      </div>
    </article>
  `;
}

async function updateDailySourceStatuses(questions) {
  if (!Array.isArray(questions) || !questions.length) return;
  const slugs = questions.map(q => q.titleSlug).filter(Boolean);
  const subIds = questions.map(q => q.submissionId || (q.attempts?.[q.attempts.length - 1]?.submissionId)).filter(Boolean);
  try {
    const res = await apiRequest(`/api/ai-code-mentor/sources/status?problemSlugs=${encodeURIComponent(slugs.join(','))}&submissionIds=${encodeURIComponent(subIds.join(','))}`);
    const sources = res?.sources || {};
    questions.forEach(q => {
      const subId = q.submissionId || (q.attempts?.[q.attempts.length - 1]?.submissionId);
      const badge = $(`sourceBadge-${q.titleSlug || q.questionFrontendId}`);
      if (!badge) return;
      const subEntry = subId ? sources[`sub:${subId}`] : null;
      const slugEntry = q.titleSlug ? sources[`slug:${q.titleSlug}`] : null;
      const entry = subEntry || slugEntry;
      const card = badge.closest(".daily-question-card");
      const quickImportBtn = card ? card.querySelector(".btn-import-source-quick") : null;

      if (entry && entry.hasCode) {
        badge.className = "badge-source-status source-available";
        if (entry.sourceProvenance === "authorized_extension") {
          badge.textContent = "✓ Synced";
          badge.title = "Automatically synchronized from LeetCode. Ready for AI Code Mentor!";
        } else {
          badge.textContent = "✓ Code Available";
          badge.title = "Submitted source code is imported and ready for AI Code Mentor";
        }
        if (quickImportBtn) {
          quickImportBtn.style.display = "none";
        }
      } else {
        badge.className = "badge-source-status source-missing";
        badge.textContent = "Waiting for sync";
        badge.title = "Awaiting automatic sync from LeetCode. You can also import manually.";
        if (quickImportBtn) {
          quickImportBtn.style.display = "";
        }
      }
    });
  } catch {}
}

function renderProfileDailyActivity(data, isSelf) {
  const dailySection = $("routeProfileDailySection");
  const dailyDate = $("routeProfileDailyDate");
  const dailyStatus = $("routeProfileDailyStatus");
  const dailyContent = $("routeProfileDailyContent");
  const dailySyncBtn = $("routeProfileDailySyncBtn");
  if (!dailySection || !dailyContent) return;

  const activity = data?.dailyActivity;
  if (!activity) {
    if (!isSelf) {
      if (dailySyncBtn) dailySyncBtn.hidden = true;
      if (dailyDate) dailyDate.textContent = "Activity is private";
      dailyContent.innerHTML = '<div class="profile-daily-private"><p>Daily LeetCode activity is private to this member\'s account.</p></div>';
      return;
    }
    if (dailySyncBtn) dailySyncBtn.hidden = true;
    if (dailyDate) dailyDate.textContent = "LeetCode account not linked";
    dailyContent.innerHTML = `
      <div class="profile-daily-empty">
        <div class="profile-daily-empty-icon" aria-hidden="true">🔗</div>
        <h4 class="profile-daily-empty-title">No LeetCode account linked</h4>
        <p class="profile-daily-empty-copy">Link your LeetCode username in your profile to automatically view and track your daily questions here.</p>
      </div>
    `;
    return;
  }

  if (dailySyncBtn) dailySyncBtn.hidden = !isSelf;

  if (dailyDate) {
    const lastSync = activity.lastSyncedAt ? ` · Last checked ${new Date(activity.lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "";
    dailyDate.innerHTML = `
      <span>Activity day: <strong>${escapeHTML(activity.date)}</strong> (05:30 AM IST cutoff)${escapeHTML(lastSync)}</span>
      <span class="profile-daily-count-badge">${activity.questionsCount || 0} unique ${(activity.questionsCount || 0) === 1 ? 'question' : 'questions'} today</span>
    `;
  }

  if (activity.syncError && dailyStatus) {
    dailyStatus.textContent = activity.syncError === "RATE_LIMITED"
      ? "LeetCode is currently rate limiting queries. Showing latest cached questions."
      : "LeetCode synchronization was delayed or unavailable. Showing latest cached questions.";
    dailyStatus.hidden = false;
  } else if (dailyStatus) {
    dailyStatus.hidden = true;
  }

  const questions = Array.isArray(activity.questions) ? activity.questions : [];
  if (questions.length === 0) {
    dailyContent.innerHTML = `
      <div class="profile-daily-empty">
        <div class="profile-daily-empty-icon" aria-hidden="true">📝</div>
        <h4 class="profile-daily-empty-title">No LeetCode questions detected for today</h4>
        <p class="profile-daily-empty-copy">Solve or submit a problem on LeetCode today, then click Refresh Activity to see it here!</p>
      </div>
    `;
  } else {
    dailyContent.innerHTML = `
      <div class="profile-daily-grid">
        ${questions.map(q => renderDailyQuestionCard(q)).join("")}
      </div>
    `;
    updateDailySourceStatuses(questions);
  }
}

async function openProfileRoute(memberId, pushHistory = false) {
  if (!/^[\w-]{1,100}$/.test(memberId || "") || (!isAdmin && !isMember)) return;
  const route = `/profile/${encodeURIComponent(memberId)}`;
  if (pushHistory && location.pathname !== route) history.pushState({}, "", route);
  document.querySelector(".app-shell").hidden = true;
  $("memberHome").hidden = true;
  $("profileRoutePage").hidden = false;
  $("routeProfileSource").textContent = "Loading statistics…";
  $("routeProfileSource").textContent = "Loading statistics…";
  $("routeProfileUsername").textContent = "Not linked";
  $("routeProfileLink").hidden = true;
  $("routeProfileMessage").hidden = true;
  ["routeProfileTotal", "routeProfileEasy", "routeProfileMedium", "routeProfileHard"].forEach(id => { $(id).textContent = "—"; });
  currentProfileMemberId = memberId;
  const dailyDate = $("routeProfileDailyDate");
  const dailyStatus = $("routeProfileDailyStatus");
  const dailyContent = $("routeProfileDailyContent");
  if (dailyStatus) dailyStatus.hidden = true;
  if (dailyDate) dailyDate.textContent = "Loading today's activity…";
  if (dailyContent) dailyContent.innerHTML = '<div class="profile-daily-loading"><span class="daily-spinner"></span> Checking today\'s LeetCode submissions…</div>';
  routeAvatarInstance?.unmount();
  routeAvatarInstance = null;
  const routeMount = $("routeProfileCharacterMount");
  const routeFallback = $("routeProfileAvatar");
  routeFallback.hidden = false;
  const characterBtn = $("routeProfileCharacterBtn");
  const portraitFallback = $("routeProfileCharacterFallback");
  const portraitStatus = $("routeProfileCharacterStatus");
  const showPortraitStatus = message => {
    if (portraitStatus) portraitStatus.textContent = message;
    if (portraitFallback) portraitFallback.hidden = false;
  };
  if (characterBtn) characterBtn.hidden = true;
  try {
    const data = await apiRequest(`/api/profile/${encodeURIComponent(memberId)}`);
    const displayName = (data.name || "Member").replace(/\s*\(ADMIN\)\s*$/i, "").trim();
    $("routeProfileName").textContent = displayName;
    routeFallback.textContent = getInitials(displayName);
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
    const isSelf = (isAdmin || isMember) && Boolean(memberProfile?.id) && memberProfile.id === memberId;
    renderProfileDailyActivity(data, isSelf);
    if (characterBtn) {
      if (isSelf) {
        characterBtn.href = `/characterverse/?returnTo=${encodeURIComponent('/profile/' + memberId)}`;
        characterBtn.hidden = false;
        characterBtn.removeAttribute("hidden");
      } else {
        characterBtn.hidden = true;
        characterBtn.setAttribute("hidden", "");
      }
    }
    if (!data.characterVerse?.appearance) {
      showPortraitStatus("Character model is temporarily unavailable.");
      return;
    }
    showPortraitStatus(isSelf ? "Loading your saved 3D character model..." : "Loading 3D character model...");
    if (window.CharacterVerseEmbed?.mountCharacterAvatar && routeMount) {
      try {
        routeAvatarInstance = window.CharacterVerseEmbed.mountCharacterAvatar(routeMount, {
          appearance: data.characterVerse?.appearance || null,
          autoRotate: false,
          profilePreview: true,
          onReady: () => {
            if (portraitFallback) portraitFallback.hidden = true;
          },
          onError: (error) => {
            showPortraitStatus(`The 3D character model could not load: ${error?.message || "unknown viewer error"}`);
          }
        });
      } catch {
        showPortraitStatus("The 3D character viewer could not start. Reload the profile and try again.");
      }
    } else {
      showPortraitStatus("The 3D character viewer bundle is unavailable. Reload the profile and try again.");
    }
  } catch (error) {
    $("routeProfileName").textContent = "Profile unavailable";
    $("routeProfileSource").textContent = "Profile statistics could not be loaded.";
    $("routeProfileMessage").textContent = error.message || "Profile data could not be loaded.";
    $("routeProfileMessage").hidden = false;
    routeFallback.hidden = false;
  }
}

function restoreDashboardRoute() {
  routeAvatarInstance?.unmount();
  routeAvatarInstance = null;
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

let liveArenaInstance = null;
let arenaPollingInterval = null;
let arenaCameraMode = "leader";
let arenaReducedMotion = false;
let arenaFocusedMemberId = null;
let arenaCurrentState = null;

function cleanupArenaPage() {
  if (arenaPollingInterval) {
    clearInterval(arenaPollingInterval);
    arenaPollingInterval = null;
  }
  if (liveArenaInstance) {
    try {
      liveArenaInstance.unmount();
    } catch (_) {}
    liveArenaInstance = null;
  }
}

async function fetchArenaLiveState() {
  try {
    const activeId = groupManagementState.activeGroupId || (groupManagementState.groups[0]?.id) || null;
    const path = activeId ? `/api/arena/live?groupId=${encodeURIComponent(activeId)}` : "/api/arena/live";
    const arena = await apiRequest(path);
    if (!arena || !arena.racers) return null;
    arenaCurrentState = arena;
    const syncEl = $("arenaSyncTime");
    if (syncEl) syncEl.textContent = `Live Sync: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    renderArenaStandings(arena);
    if (liveArenaInstance) {
      liveArenaInstance.update(arena);
    }
    return arena;
  } catch (err) {
    console.error("Live arena poll error:", err);
    return null;
  }
}

function renderArenaStandings(arena) {
  const listEl = $("arenaStandingsList");
  if (!listEl || !arena || !arena.racers) return;

  const milestoneEl = $("arenaTargetMilestoneValue");
  if (milestoneEl) milestoneEl.textContent = `${arena.targetMilestone || 100} Solved`;
  const countEl = $("arenaStandingsCount");
  if (countEl) countEl.textContent = `${arena.racers.length} Racers`;

  // Sort by rank ascending for gap calculations
  const sorted = [...arena.racers].sort((a, b) => a.rank - b.rank);
  const leaderSolved = Number(sorted[0]?.solved ?? sorted[0]?.solvedCount ?? 0);

  listEl.innerHTML = "";
  sorted.forEach((racer, idx) => {
    const memberId = racer.id || racer.memberId;
    const isFocused = memberId && memberId === arenaFocusedMemberId;
    const item = document.createElement("div");
    item.className = `standings-item${isFocused ? " focused" : ""}`;
    item.setAttribute("role", "listitem");
    item.tabIndex = 0;

    const rankClass = racer.rank <= 3 ? `standings-rank-${racer.rank}` : "standings-rank-other";
    const percent = Math.round((racer.progress || 0) * 100);
    const vehicleIcon = racer.character?.equippedVehicleId ? "🏎️" : "🏃";
    const solvedNum = Number(racer.solved ?? racer.solvedCount ?? 0);
    const solvedMarkup = racer.solvedAvailable === false
      ? `<span class="standings-pending">Pending sync</span>`
      : `${solvedNum} <small style="font-size:10px;color:var(--text-muted)">solved</small>`;

    // Gap calculations
    const nextRacer = sorted[idx - 1];
    const aheadSolved = nextRacer ? Number(nextRacer.solved ?? nextRacer.solvedCount ?? 0) : null;
    const gapToNext = (aheadSolved !== null && aheadSolved > solvedNum) ? aheadSolved - solvedNum : 0;
    const gapToLeader = leaderSolved > solvedNum ? leaderSolved - solvedNum : 0;

    // Gap and standings calculations
    const racersAheadCount = idx;
    const racersAheadText = idx === 0
      ? "🥇 Race Leader"
      : `${racersAheadCount} ${racersAheadCount === 1 ? 'racer' : 'racers'} ahead`;

    const leaderDiffText = idx === 0
      ? "Pacesetter"
      : `${gapToLeader} questions behind leader`;

    const nextDiffText = idx === 0
      ? ""
      : gapToNext > 0
        ? `▲ ${gapToNext} behind #${sorted[idx - 1].rank}`
        : "= Tied";

    item.innerHTML = `
      <div class="standings-rank-pill ${rankClass}">#${racer.rank}</div>
      <div class="standings-info">
        <div class="standings-name-row">
          <span class="standings-name" title="${escapeHTML(racer.name)}">${escapeHTML(racer.name)}</span>
          <span class="standings-solved">${solvedMarkup}</span>
        </div>
        <div class="standings-bar-bg">
          <div class="standings-bar-fill ${racer.rank <= 3 ? `rank-${racer.rank}` : ""}" style="width: ${percent}%"></div>
        </div>
        <div class="standings-meta">
          <span>Lane ${(racer.laneIndex || 0) + 1} · ${vehicleIcon}</span>
          <span style="font-weight:700;color:var(--text-primary,#f8fafc)">${percent}% progress</span>
        </div>
        <div class="standings-gap-row">
          <span class="standings-gap gap-ahead-count">${racersAheadText}</span>
          ${idx > 0 ? `<span class="standings-gap gap-leader-dist">${leaderDiffText}</span>` : ""}
          ${nextDiffText ? `<span class="standings-gap gap-behind">${nextDiffText}</span>` : ""}
        </div>
      </div>
    `;

    item.addEventListener("click", () => {
      arenaFocusedMemberId = memberId;
      document.querySelectorAll(".standings-item").forEach(el => el.classList.remove("focused"));
      item.classList.add("focused");
      if (liveArenaInstance) {
        liveArenaInstance.focusMember(memberId);
        setArenaCameraMode("leader");
      }
    });

    listEl.appendChild(item);
  });
}

function setArenaCameraMode(mode) {
  arenaCameraMode = mode;
  document.querySelectorAll(".arena-cam-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.camera === mode);
  });
  if (liveArenaInstance) {
    liveArenaInstance.setCameraMode(mode);
  }
}

async function loadAndMountArenaPage(initialArenaData = null) {
  const mountEl = $("raceArenaMount");
  if (!mountEl) return;

  let arenaData = initialArenaData || arenaCurrentState;
  if (!arenaData) {
    arenaData = await fetchArenaLiveState();
  } else {
    renderArenaStandings(arenaData);
  }

  const mountEmbed = () => {
    if (!window.CharacterVerseEmbed || typeof window.CharacterVerseEmbed.mountRaceArena !== "function") {
      setTimeout(() => {
        if (activePage === "arena" && window.CharacterVerseEmbed?.mountRaceArena && !liveArenaInstance) {
          loadAndMountArenaPage(arenaData);
        }
      }, 200);
      return;
    }
    if (liveArenaInstance) {
      try { liveArenaInstance.unmount(); } catch (_) {}
    }
    mountEl.innerHTML = "";
    liveArenaInstance = window.CharacterVerseEmbed.mountRaceArena(mountEl, {
      arenaState: arenaData,
      cameraMode: arenaCameraMode,
      reducedMotion: arenaReducedMotion,
      focusedMemberId: arenaFocusedMemberId,
      onFocusMember: (memberId) => {
        arenaFocusedMemberId = memberId;
        document.querySelectorAll(".standings-item").forEach(el => el.classList.remove("focused"));
      },
      onError: (err) => {
        console.warn("Race arena WebGL error, fallback active:", err);
      }
    });
  };
  mountEmbed();

  if (arenaPollingInterval) clearInterval(arenaPollingInterval);
  arenaPollingInterval = setInterval(() => {
    if (activePage === "arena" && document.visibilityState === "visible") {
      fetchArenaLiveState();
    }
  }, 20000);
}

function initArenaControls() {
  document.querySelectorAll(".arena-cam-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      setArenaCameraMode(btn.dataset.camera);
    });
  });

  const zoomInBtn = $("arenaZoomIn");
  if (zoomInBtn) {
    zoomInBtn.addEventListener("click", () => {
      if (liveArenaInstance && typeof liveArenaInstance.zoomIn === "function") {
        liveArenaInstance.zoomIn();
      }
    });
  }

  const zoomOutBtn = $("arenaZoomOut");
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener("click", () => {
      if (liveArenaInstance && typeof liveArenaInstance.zoomOut === "function") {
        liveArenaInstance.zoomOut();
      }
    });
  }

  const resetCamBtn = $("arenaResetCam");
  if (resetCamBtn) {
    resetCamBtn.addEventListener("click", () => {
      setArenaCameraMode("broadcast");
      if (liveArenaInstance && typeof liveArenaInstance.resetView === "function") {
        liveArenaInstance.resetView();
      }
    });
  }

  const motionBtn = $("arenaMotionToggle");
  if (motionBtn) {
    motionBtn.addEventListener("click", () => {
      arenaReducedMotion = !arenaReducedMotion;
      const label = $("arenaMotionLabel");
      if (label) label.textContent = arenaReducedMotion ? "Motion: Snapped" : "Motion: Smooth";
      if (liveArenaInstance) {
        liveArenaInstance.setReducedMotion(arenaReducedMotion);
      }
    });
  }


  // Weather badge updater — syncs with RaceArena WEATHER_PRESETS cycling
  const WEATHER_BADGE_PRESETS = [
    { icon: "☀️", label: "Summer · Sunny", temp: "28°C", dur: 28 },
    { icon: "🌅", label: "Golden Hour", temp: "24°C", dur: 18 },
    { icon: "🌇", label: "Sunset · Dusk", temp: "19°C", dur: 16 },
    { icon: "🌙", label: "Night · Stars", temp: "12°C", dur: 20 },
    { icon: "❄️", label: "Winter · Snow", temp: "-3°C", dur: 22 },
  ];
  let _wBadgeIdx = 0;
  let _wBadgeElapsed = 0;
  let _wBadgeLast = Date.now();
  function tickWeatherBadge() {
    const now = Date.now();
    _wBadgeElapsed += (now - _wBadgeLast) / 1000;
    _wBadgeLast = now;
    const preset = WEATHER_BADGE_PRESETS[_wBadgeIdx];
    if (_wBadgeElapsed >= preset.dur) {
      _wBadgeElapsed = 0;
      _wBadgeIdx = (_wBadgeIdx + 1) % WEATHER_BADGE_PRESETS.length;
    }
    const p = WEATHER_BADGE_PRESETS[_wBadgeIdx];
    const iconEl = $("arenaWeatherIcon");
    const labelEl = $("arenaWeatherLabel");
    const tempEl = $("arenaWeatherTemp");
    if (iconEl) iconEl.textContent = p.icon;
    if (labelEl) labelEl.textContent = p.label;
    if (tempEl) tempEl.textContent = "Temp: " + p.temp;
  }
  setInterval(tickWeatherBadge, 3000);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && activePage === "arena") {
      fetchArenaLiveState();
    }
  });
}

async function navigatePage(page) {
  const activeId = groupManagementState.activeGroupId || (groupManagementState.groups[0]?.id) || null;
  if (page === "members") {
    clearViewerData();
    if (activeId) {
      await loadGroupMembers(activeId);
    } else {
      state.members = [];
      renderMembers();
    }
    showPage("members");
    setRoleUI();
    return true;
  }
  if (page === "aimentor") {
    openAiCodeMentorWorkspace({ isStandalone: true });
    return true;
  }
  if (isAdmin) { showPage(page); return true; }
  if (!PAGE_INFO[page]) return;
  clearViewerData();
  const query = new URLSearchParams({ week: String(currentWeek) });
  if (page === "daily") query.set("date", selectedCalendarDate);
  if (activeId) query.set("groupId", activeId);
  try {
    const data = await apiRequest(`/api/page-data/${encodeURIComponent(page)}?${query}`);
    viewerPageData = data;
    if (page === "overview") renderViewerOverview(data);
    if (page === "leaderboard") renderViewerLeaderboard(data);
    if (page === "arena") {
      arenaCurrentState = data.arena;
    }
    if (page === "daily" || page === "concepts") {
      const weekData = page === "daily" ? { daily: data.statuses, concepts: {} } : { daily: {}, concepts: data.statuses };
      state = { members: data.members, weeks: { [String(data.week)]: weekData }, currentWeek: data.week };
      if (page === "daily") { leetcodeActivityRecord = data.activity || null; leetcodeAutomationStatus = null; }
      if (page === "daily") renderDailyTable(); else renderConceptTable();
    }
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
  $("loginBtn").addEventListener("click", openAdminLoginDialog);
  bindGateLoginButton($("gateAdminLogin"));
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
        await loadGroupManagement();
        const activeGroupId = groupManagementState.activeGroupId || (groupManagementState.groups[0]?.id) || null;
        if (activeGroupId) {
          await loadGroupMembers(activeGroupId);
          await loadSharedData();
        } else {
          state.members = [];
          renderAll();
        }
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
  $("memberSwitchAdminBtn").addEventListener("click", openAdminLoginDialog);
  
  const dailySyncBtn = $("routeProfileDailySyncBtn");
  if (dailySyncBtn && !dailySyncBtn.dataset.bound) {
    dailySyncBtn.dataset.bound = "true";
    dailySyncBtn.addEventListener("click", async () => {
      if (!currentProfileMemberId) return;
      dailySyncBtn.disabled = true;
      const originalText = dailySyncBtn.innerHTML;
      dailySyncBtn.innerHTML = "Syncing…";
      try {
        const updated = await apiRequest(`/api/profile/${encodeURIComponent(currentProfileMemberId)}?sync=1`);
        const isSelf = (isAdmin || isMember) && Boolean(memberProfile?.id) && memberProfile.id === currentProfileMemberId;
        renderProfileDailyActivity(updated, isSelf);
        showToast("Daily LeetCode activity refreshed.");
      } catch (err) {
        showToast(err.message || "Failed to sync daily activity.", "error");
      } finally {
        dailySyncBtn.disabled = false;
        dailySyncBtn.innerHTML = originalText;
      }
    });
  }

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
  dialog.addEventListener("close", resetAdminLoginForm);
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

async function logoutCurrentSession() {
  routeAvatarInstance?.unmount();
  routeAvatarInstance = null;
  memberAvatarInstance?.unmount();
  memberAvatarInstance = null;
  cleanupArenaPage();
  state = { members: [], weeks: {}, currentWeek: 1 };
  groupManagementState = { groups: [], activeGroupId: null, detail: null };
  arenaCurrentState = null;
  viewerPageData = null;
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
  initializeDailyWorkspace();
  initializeGroupManagement();
  // Do not inherit a restored scroll offset when the dashboard first opens.
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  $("securityGate").hidden = false;
  window.scrollTo(0, 0);
  const initialWeek = weekForDate(selectedCalendarDate);
  if (initialWeek) { currentWeek = initialWeek; state.currentWeek = initialWeek; }
  initializePhaseTracker();
  initializeLeetCodeActivityControls();
  initializeSecurityControls();
  initArenaControls();
  const profileRoute = location.pathname.match(/^\/profile\/([\w-]{1,100})\/?$/);
  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null;
    const session = await apiRequest("/api/session", controller ? { signal: controller.signal } : {});
    if (timeoutId) clearTimeout(timeoutId);
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
        setSecurityGate("Shared data is not initialized. Import this browser’s existing data to preserve it, or use the admin import endpoint.", true, true);
      } else {
        setSecurityGate(error.message, false, true);
      }
    } else if (isMember) {
      $("securityGate").hidden = true;
      await loadGroupManagement();
      const activeGroupId = groupManagementState.activeGroupId || (groupManagementState.groups[0]?.id) || null;
      if (activeGroupId) {
        await loadGroupMembers(activeGroupId);
        await loadSharedData(activeGroupId);
      } else {
        state.members = [];
        renderAll();
      }
      if (profileRoute) await openProfileRoute(profileRoute[1]);
      else showPage("overview");
    } else {
      state = { members: [], weeks: {}, currentWeek };
      setSecurityGate("Choose an account type to sign in.", false, true);
    }
  } catch (error) {
    setSecurityGate("Session verification timed out or secure server is unavailable. You can sign in below.", false, true);
    console.error("Dashboard security initialization failed:", error.message);
  }
}

/* ==========================================================================
   AI Code Mentor Workspace Controller & Educational Engine (Phase 2 Full)
   ========================================================================== */

const PROBLEM_EDUCATIONAL_DATA = {
  "minimum-moves-to-equal-array-elements": {
    title: "Minimum Moves to Equal Array Elements",
    number: "453",
    difficulty: "Medium",
    description: "Given an integer array nums of size n, return the minimum number of moves required to make all array elements equal. In one move, you can increment n - 1 elements of the array by 1.",
    acceptedCode: `class Solution:
    def minMoves(self, nums: list[int]) -> int:
        # Incrementing n - 1 elements by 1 is mathematically equivalent
        # to decrementing 1 element by 1 relative to all other elements.
        # Therefore, to make all elements equal with minimum moves, reduce each element
        # down to the array minimum: moves = sum(nums[i] - min(nums)).
        min_val = min(nums)
        return sum(x - min_val for x in nums)`,
    acceptedCodeByLang: {
      java: `class Solution {
    public int minMoves(int[] nums) {
        // Incrementing n - 1 elements by 1 is mathematically equivalent
        // to decrementing 1 element by 1 relative to all other elements.
        // To make all elements equal with minimum moves, reduce each element
        // down to the array minimum: moves = sum(nums[i] - min(nums)).
        int min = nums[0];
        for (int x : nums) {
            if (x < min) min = x;
        }
        int moves = 0;
        for (int x : nums) {
            moves += x - min;
        }
        return moves;
    }
}`,
      python3: `class Solution:
    def minMoves(self, nums: list[int]) -> int:
        min_val = min(nums)
        return sum(x - min_val for x in nums)`,
      cpp: `class Solution {
public:
    int minMoves(vector<int>& nums) {
        int min_val = nums[0];
        for (int x : nums) {
            if (x < min_val) min_val = x;
        }
        int moves = 0;
        for (int x : nums) {
            moves += x - min_val;
        }
        return moves;
    }
};`,
      javascript: `var minMoves = function(nums) {
    let min = nums[0];
    for (let i = 1; i < nums.length; i++) {
        if (nums[i] < min) min = nums[i];
    }
    let moves = 0;
    for (let i = 0; i < nums.length; i++) {
        moves += nums[i] - min;
    }
    return moves;
};`,
      typescript: `function minMoves(nums: number[]): number {
    let min = nums[0];
    for (let i = 1; i < nums.length; i++) {
        if (nums[i] < min) min = nums[i];
    }
    let moves = 0;
    for (let i = 0; i < nums.length; i++) {
        moves += nums[i] - min;
    }
    return moves;
}`,
      go: `func minMoves(nums []int) int {
    minVal := nums[0]
    for _, x := range nums {
        if x < minVal {
            minVal = x
        }
    }
    moves := 0
    for _, x := range nums {
        moves += x - minVal
    }
    return moves
}`,
      rust: `impl Solution {
    pub fn min_moves(nums: Vec<i32>) -> i32 {
        let min_val = *nums.iter().min().unwrap();
        nums.iter().map(|&x| x - min_val).sum()
    }
}`
    },
    buggyCode: `class Solution:
    def minMoves(self, nums: list[int]) -> int:
        # Naive simulation: find max and increment all other n - 1 elements until equal
        # Time complexity: O(n * (max - min)) -> Causes Time Limit Exceeded (TLE)
        moves = 0
        while len(set(nums)) > 1:
            max_idx = nums.index(max(nums))
            for i in range(len(nums)):
                if i != max_idx:
                    nums[i] += 1
            moves += 1
        return moves`,
    buggyCodeByLang: {
      java: `class Solution {
    public int minMoves(int[] nums) {
        // Naive simulation: repeatedly increment n - 1 elements until all elements are equal
        // Bottleneck: O(n * (max - min)) time complexity leads to Time Limit Exceeded (TLE)
        int moves = 0;
        while (true) {
            int minIdx = 0, maxIdx = 0;
            for (int i = 1; i < nums.length; i++) {
                if (nums[i] < nums[minIdx]) minIdx = i;
                if (nums[i] > nums[maxIdx]) maxIdx = i;
            }
            if (nums[minIdx] == nums[maxIdx]) break;
            for (int i = 0; i < nums.length; i++) {
                if (i != maxIdx) nums[i]++;
            }
            moves++;
        }
        return moves;
    }
}`,
      python3: `class Solution:
    def minMoves(self, nums: list[int]) -> int:
        moves = 0
        while len(set(nums)) > 1:
            max_idx = nums.index(max(nums))
            for i in range(len(nums)):
                if i != max_idx:
                    nums[i] += 1
            moves += 1
        return moves`,
      cpp: `class Solution {
public:
    int minMoves(vector<int>& nums) {
        int moves = 0;
        while (true) {
            int min_idx = 0, max_idx = 0;
            for (int i = 1; i < (int)nums.size(); i++) {
                if (nums[i] < nums[min_idx]) min_idx = i;
                if (nums[i] > nums[max_idx]) max_idx = i;
            }
            if (nums[min_idx] == nums[max_idx]) break;
            for (int i = 0; i < (int)nums.size(); i++) {
                if (i != max_idx) nums[i]++;
            }
            moves++;
        }
        return moves;
    }
};`,
      javascript: `var minMoves = function(nums) {
    let moves = 0;
    while (true) {
        let minIdx = 0, maxIdx = 0;
        for (let i = 1; i < nums.length; i++) {
            if (nums[i] < nums[minIdx]) minIdx = i;
            if (nums[i] > nums[maxIdx]) maxIdx = i;
        }
        if (nums[minIdx] === nums[maxIdx]) break;
        for (let i = 0; i < nums.length; i++) {
            if (i !== maxIdx) nums[i]++;
        }
        moves++;
    }
    return moves;
};`,
      typescript: `function minMoves(nums: number[]): number {
    let moves = 0;
    while (true) {
        let minIdx = 0, maxIdx = 0;
        for (let i = 1; i < nums.length; i++) {
            if (nums[i] < nums[minIdx]) minIdx = i;
            if (nums[i] > nums[maxIdx]) maxIdx = i;
        }
        if (nums[minIdx] === nums[maxIdx]) break;
        for (let i = 0; i < nums.length; i++) {
            if (i !== maxIdx) nums[i]++;
        }
        moves++;
    }
    return moves;
}`,
      go: `func minMoves(nums []int) int {
    moves := 0
    for {
        minIdx, maxIdx := 0, 0
        for i := 1; i < len(nums); i++ {
            if nums[i] < nums[minIdx] { minIdx = i }
            if nums[i] > nums[maxIdx] { maxIdx = i }
        }
        if nums[minIdx] == nums[maxIdx] { break }
        for i := range nums {
            if i != maxIdx { nums[i]++ }
        }
        moves++
    }
    return moves
}`,
      rust: `impl Solution {
    pub fn min_moves(mut nums: Vec<i32>) -> i32 {
        let mut moves = 0;
        loop {
            let mut min_idx = 0;
            let mut max_idx = 0;
            for i in 1..nums.len() {
                if nums[i] < nums[min_idx] { min_idx = i; }
                if nums[i] > nums[max_idx] { max_idx = i; }
            }
            if nums[min_idx] == nums[max_idx] { break; }
            for i in 0..nums.len() {
                if i != max_idx { nums[i] += 1; }
            }
            moves += 1;
        }
        moves
    }
}`
    },
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    timeExplain: "Single pass to identify min(nums) followed by linear summation of (nums[i] - min)",
    spaceExplain: "O(1) auxiliary memory using only primitive scalar accumulators",
    bruteForceTitle: "Step-by-step Naive Simulation",
    bruteForceTime: "O(n² · (max - min))",
    bruteForceSpace: "O(1)",
    bruteForceExplain: "Incrementing n - 1 elements one by one takes O(n * (max - min)) steps, leading to TLE.",
    optimalTitle: "Mathematical Equivalence Reduction",
    optimalTime: "O(n)",
    optimalSpace: "O(1)",
    optimalExplain: "Incrementing n - 1 elements by 1 is relatively identical to decrementing 1 element by 1 towards min(nums).",
    mistakeTitle: "Simulation Bottleneck (TLE)",
    mistakeDetail: "Simulating incrementing n - 1 numbers one move at a time takes O(n * (max - min)) steps. For large values like 10^9, this requires millions of iterations and results in Time Limit Exceeded (TLE).",
    mistakeFix: "Transform the perspective: incrementing n - 1 elements by 1 is mathematically identical to decrementing 1 element by 1 relative to the others. Every element must reach min(nums), so total moves = sum(nums[i] - min).",
    counterExample: "nums = [1, 1000000000] -> Naive simulation requires 999,999,999 iterations. Mathematical formula solves in O(1) operations directly: 1000000000 - 1 = 999999999.",
    takeaways: [
      "Perspective shift: Incrementing n - 1 elements by 1 is relatively equivalent to decrementing 1 element by 1.",
      "Target baseline: To minimize moves, reduce every element to the global minimum min(nums).",
      "Formula: Total moves = sum(nums[i] - min(nums)) = sum(nums) - n * min(nums).",
      "Avoid 32-bit integer overflow by accumulating (x - min) rather than computing sum(nums) first when numbers are large."
    ],
    hints: [
      "Hint 1: Think about relative differences. Does incrementing n - 1 elements change the gap between them and the maximum?",
      "Hint 2: Incrementing n - 1 elements by 1 is equivalent to decrementing 1 element by 1 relative to the other elements.",
      "Hint 3: To make all elements equal, what value should they all be reduced to? (Answer: the minimum element min(nums))."
    ],
    dryRun: {
      headers: ["Step", "Index", "nums[i]", "min(nums)", "Calculation (x - min)", "Cumulative Moves"],
      rows: [
        ["1", "—", "—", "1", "Find minimum of [1, 2, 3]", "0"],
        ["2", "i = 0", "1", "1", "moves += 1 - 1 = 0", "0"],
        ["3", "i = 1", "2", "1", "moves += 2 - 1 = 1", "1"],
        ["4", "i = 2", "3", "1", "moves += 3 - 1 = 2", "3 (Optimal Answer)"]
      ]
    },
    animatic: {
      initialState: {
        array: [1, 2, 3],
        highlightIndices: [],
        pointers: { min: -1, i: -1 },
        caption: "Input array nums = [1, 2, 3]. Goal: Equalize all elements with minimum moves."
      },
      steps: [
        {
          lineIndex: 2,
          description: "Scan array to find global minimum: min = 1 at index 0.",
          state: {
            array: [1, 2, 3],
            highlightIndices: [0],
            pointers: { min: 0 },
            caption: "Minimum element identified: min(nums) = 1."
          }
        },
        {
          lineIndex: 6,
          description: "Inspect nums[0] = 1. Difference from min: 1 - 1 = 0. Moves so far: 0.",
          state: {
            array: [1, 2, 3],
            highlightIndices: [0],
            pointers: { min: 0, i: 0 },
            caption: "Index 0 is already at minimum (1 - 1 = 0). Total moves = 0."
          }
        },
        {
          lineIndex: 7,
          description: "Inspect nums[1] = 2. Difference from min: 2 - 1 = 1. Moves so far: 1.",
          state: {
            array: [1, 2, 3],
            highlightIndices: [1],
            pointers: { min: 0, i: 1 },
            caption: "Index 1 needs 1 decrement to reach min (2 - 1 = 1). Total moves = 1."
          }
        },
        {
          lineIndex: 7,
          description: "Inspect nums[2] = 3. Difference from min: 3 - 1 = 2. Moves so far: 1 + 2 = 3.",
          state: {
            array: [1, 2, 3],
            highlightIndices: [2],
            pointers: { min: 0, i: 2 },
            caption: "Index 2 needs 2 decrements to reach min (3 - 1 = 2). Total moves = 3."
          }
        },
        {
          lineIndex: 9,
          description: "All elements accounted for. Total moves required = 3. Array equalized!",
          state: {
            array: [1, 1, 1],
            highlightIndices: [0, 1, 2],
            pointers: {},
            caption: "Result: 3 moves to equalize array [1, 2, 3] to [1, 1, 1] relative baseline."
          }
        }
      ]
    }
  },
  "find-the-duplicate-number": {
    title: "Find the Duplicate Number",
    number: "287",
    difficulty: "Medium",
    description: "Given an array of integers nums containing n + 1 integers where each integer is in the range [1, n] inclusive. There is only one repeated number in nums, return this repeated number. You must solve the problem without modifying the array nums and uses only constant extra space O(1).",
    acceptedCode: `class Solution:
    def findDuplicate(self, nums: list[int]) -> int:
        # Floyd's Cycle Detection (Tortoise and Hare)
        # Phase 1: Locate the intersection point within the cycle
        slow = nums[0]
        fast = nums[0]
        while True:
            slow = nums[slow]
            fast = nums[nums[fast]]
            if slow == fast:
                break

        # Phase 2: Find the entrance to the cycle (the duplicate)
        slow = nums[0]
        while slow != fast:
            slow = nums[slow]
            fast = nums[fast]
        return slow`,
    acceptedCodeByLang: {
      java: `class Solution {
    public int findDuplicate(int[] nums) {
        // Floyd's Cycle Detection (Tortoise & Hare)
        // Phase 1: Detect cycle intersection
        int slow = nums[0];
        int fast = nums[0];
        do {
            slow = nums[slow];
            fast = nums[nums[fast]];
        } while (slow != fast);

        // Phase 2: Locate cycle entrance
        slow = nums[0];
        while (slow != fast) {
            slow = nums[slow];
            fast = nums[fast];
        }
        return slow;
    }
}`,
      python3: `class Solution:
    def findDuplicate(self, nums: list[int]) -> int:
        slow = fast = nums[0]
        while True:
            slow = nums[slow]
            fast = nums[nums[fast]]
            if slow == fast:
                break
        slow = nums[0]
        while slow != fast:
            slow = nums[slow]
            fast = nums[fast]
        return slow`,
      cpp: `class Solution {
public:
    int findDuplicate(vector<int>& nums) {
        int slow = nums[0], fast = nums[0];
        do {
            slow = nums[slow];
            fast = nums[nums[fast]];
        } while (slow != fast);
        slow = nums[0];
        while (slow != fast) {
            slow = nums[slow];
            fast = nums[fast];
        }
        return slow;
    }
};`,
      javascript: `var findDuplicate = function(nums) {
    let slow = nums[0], fast = nums[0];
    do {
        slow = nums[slow];
        fast = nums[nums[fast]];
    } while (slow !== fast);
    slow = nums[0];
    while (slow !== fast) {
        slow = nums[slow];
        fast = nums[fast];
    }
    return slow;
};`,
      typescript: `function findDuplicate(nums: number[]): number {
    let slow: number = nums[0];
    let fast: number = nums[0];
    do {
        slow = nums[slow];
        fast = nums[nums[fast]];
    } while (slow !== fast);
    slow = nums[0];
    while (slow !== fast) {
        slow = nums[slow];
        fast = nums[fast];
    }
    return slow;
}`,
      go: `func findDuplicate(nums []int) int {
    slow, fast := nums[0], nums[0]
    for {
        slow = nums[slow]
        fast = nums[nums[fast]]
        if slow == fast {
            break
        }
    }
    slow = nums[0]
    for slow != fast {
        slow = nums[slow]
        fast = nums[fast]
    }
    return slow
}`,
      rust: `impl Solution {
    pub fn find_duplicate(nums: Vec<i32>) -> i32 {
        let mut slow = nums[0] as usize;
        let mut fast = nums[0] as usize;
        loop {
            slow = nums[slow] as usize;
            fast = nums[nums[fast] as usize] as usize;
            if slow == fast { break; }
        }
        slow = nums[0] as usize;
        while slow != fast {
            slow = nums[slow] as usize;
            fast = nums[fast] as usize;
        }
        slow as i32
    }
}`
    },
    buggyCode: `class Solution:
    def findDuplicate(self, nums: list[int]) -> int:
        # Inefficient nested loops: O(n²) time results in Time Limit Exceeded
        for i in range(len(nums)):
            for j in range(i + 1, len(nums)):
                if nums[i] == nums[j]:
                    return nums[i]
        return -1`,
    buggyCodeByLang: {
      java: `class Solution {
    public int findDuplicate(int[] nums) {
        // Inefficient nested loops: O(n²) time results in Time Limit Exceeded
        for (int i = 0; i < nums.length; i++) {
            for (int j = i + 1; j < nums.length; j++) {
                if (nums[i] == nums[j]) return nums[i];
            }
        }
        return -1;
    }
}`,
      python3: `class Solution:
    def findDuplicate(self, nums: list[int]) -> int:
        for i in range(len(nums)):
            for j in range(i + 1, len(nums)):
                if nums[i] == nums[j]: return nums[i]
        return -1`,
      cpp: `class Solution {
public:
    int findDuplicate(vector<int>& nums) {
        for (int i = 0; i < nums.size(); ++i) {
            for (int j = i + 1; j < nums.size(); ++j) {
                if (nums[i] == nums[j]) return nums[i];
            }
        }
        return -1;
    }
};`,
      javascript: `var findDuplicate = function(nums) {
    for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
            if (nums[i] === nums[j]) return nums[i];
        }
    }
    return -1;
};`,
      typescript: `function findDuplicate(nums: number[]): number {
    for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
            if (nums[i] === nums[j]) return nums[i];
        }
    }
    return -1;
}`,
      go: `func findDuplicate(nums []int) int {
    for i := 0; i < len(nums); i++ {
        for j := i + 1; j < len(nums); j++ {
            if nums[i] == nums[j] { return nums[i] }
        }
    }
    return -1
}`,
      rust: `impl Solution {
    pub fn find_duplicate(nums: Vec<i32>) -> i32 {
        for i in 0..nums.len() {
            for j in (i + 1)..nums.len() {
                if nums[i] == nums[j] { return nums[i]; }
            }
        }
        -1
    }
}`
    },
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    timeExplain: "Traverses cycle proportional to array length, terminating in linear time",
    spaceExplain: "Uses only two pointer variables (slow & fast) with zero array mutation",
    bruteForceTitle: "Nested Loop Search",
    bruteForceTime: "O(n²)",
    bruteForceSpace: "O(1)",
    bruteForceExplain: "Compares every pair (i, j). Exceeds 10¹⁰ operations for n=100,000, triggering TLE.",
    optimalTitle: "Floyd's Tortoise and Hare Cycle Detection",
    optimalTime: "O(n)",
    optimalSpace: "O(1)",
    optimalExplain: "Maps values to indices. Cycle entrance is mathematically guaranteed to be the duplicate.",
    mistakeTitle: "Performance Bottleneck: O(n²) Complexity Exceeds Time Limit",
    mistakeDetail: "Using nested loops to compare elements requires O(n²) comparisons. With n = 100,000, this takes over 10¹⁰ operations, failing with Time Limit Exceeded (TLE). A HashSet violates O(1) space, while sorting violates array immutability.",
    mistakeFix: "Model the array as a functional pointer graph where node i points to nums[i]. By Dirichlet's Pigeonhole Principle, at least one cycle exists. Use Floyd's Tortoise and Hare algorithm.",
    takeaways: [
      "Pigeonhole Principle: n+1 integers spanning [1, n] mathematically ensures at least one duplicate exists.",
      "Graph Interpretation: Elements serve as pointers (i -> nums[i]), creating a linked list with a cycle.",
      "Floyd's Algorithm: 2-phase pointer traversal locates the cycle entrance in O(n) time and O(1) space."
    ],
    hints: [
      "Hint 1: Can you treat the array elements as pointers to indices (i -> nums[i])?",
      "Hint 2: Since numbers are between 1 and n, this directed graph must contain at least one directed cycle.",
      "Hint 3: Use Floyd's Tortoise and Hare: advance slow by 1 step and fast by 2 steps until they collide, then reset slow to nums[0]."
    ],
    dryRun: {
      headers: ["Step", "Slow Pointer", "Fast Pointer", "State", "Action"],
      rows: [
        ["1", "slow = nums[0] (1)", "fast = nums[0] (1)", "Initialization", "Start Floyd's cycle traversal"],
        ["2", "slow = nums[1] (3)", "fast = nums[nums[1]] (2)", "Phase 1: Advancing", "Slow 1x, Fast 2x"],
        ["3", "slow = nums[3] (2)", "fast = nums[nums[2]] (2)", "Collision Detected!", "Intersection confirmed inside cycle"],
        ["4", "slow = nums[0] (1)", "fast = 2", "Phase 2: Reset", "Slow reset to array head"],
        ["5", "slow = nums[1] (3)", "fast = nums[2] (4)", "Advancing 1x", "Both advance at 1 step/sec"],
        ["6", "slow = 2", "fast = 2", "Cycle Entrance!", "Duplicate 2 identified in O(n) time"]
      ]
    },
    animatic: {
      type: "cycle-detection",
      target: 2,
      nums: [1, 3, 4, 2, 2],
      steps: [
        {
          step: 1,
          slow: 0,
          fast: 0,
          reaction: "insight",
          formula: "slow = nums[0] = 1, fast = nums[0] = 1",
          speech: "Welcome! To find the duplicate without extra space, we treat nums as a linked list where value nums[i] is the next pointer.",
          action: "Initialize Tortoise (slow) and Hare (fast) at index 0."
        },
        {
          step: 2,
          slow: 1,
          fast: 2,
          reaction: "insight",
          formula: "slow -> nums[0]=1; fast -> nums[nums[0]]=nums[1]=3 -> 2",
          speech: "Phase 1: Slow advances 1 step (to value 1). Fast advances 2 steps (to value 2).",
          action: "Advance pointers at different speeds."
        },
        {
          step: 3,
          slow: 3,
          fast: 4,
          reaction: "insight",
          formula: "slow -> nums[1]=3; fast -> nums[nums[2]]=nums[4]=2",
          speech: "Phase 1: Slow moves to value 3 (index 1). Fast hops two steps to value 2 (index 4).",
          action: "Continue cycle traversal."
        },
        {
          step: 4,
          slow: 3,
          fast: 3,
          matchedIndices: [3],
          reaction: "match",
          formula: "slow == fast == 2 (Cycle Intersection Detected!)",
          speech: "Phase 1 Complete! Slow and Fast collide at value 2! An intersection inside the cycle is confirmed.",
          action: "Collision detected! Switch to Phase 2."
        },
        {
          step: 5,
          slow: 0,
          fast: 3,
          reaction: "insight",
          formula: "Reset slow = 0; keep fast at collision point (index 3, value 2)",
          speech: "Phase 2: Reset Slow to the head of the array (index 0). Both pointers will now advance at the same 1x speed.",
          action: "Prepare equal-speed traversal to find cycle entrance."
        },
        {
          step: 6,
          slow: 3,
          fast: 3,
          matchedIndices: [3, 4],
          reaction: "optimal",
          formula: "Pointers meet at cycle entrance value = 2 (Duplicate Found!)",
          speech: "Success! Slow and Fast meet exactly at the cycle entrance, revealing duplicate number 2 in O(n) time and O(1) space!",
          action: "Return duplicate value: 2."
        }
      ]
    }
  },
  "two-sum": {
    title: "Two Sum",
    number: "1",
    difficulty: "Easy",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
    acceptedCode: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []`,
    acceptedCodeByLang: {
      java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (seen.containsKey(complement)) {
                return new int[] { seen.get(complement), i };
            }
            seen.put(nums[i], i);
        }
        return new int[0];
    }
}`,
      python3: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {}
        for i, num in enumerate(nums):
            comp = target - num
            if comp in seen:
                return [seen[comp], i]
            seen[num] = i
        return []`,
      cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;
        for (int i = 0; i < nums.size(); ++i) {
            int comp = target - nums[i];
            if (seen.count(comp)) return { seen[comp], i };
            seen[nums[i]] = i;
        }
        return {};
    }
};`,
      javascript: `var twoSum = function(nums, target) {
    const seen = new Map();
    for (let i = 0; i < nums.length; i++) {
        const comp = target - nums[i];
        if (seen.has(comp)) return [seen.get(comp), i];
        seen.set(nums[i], i);
    }
    return [];
};`,
      typescript: `function twoSum(nums: number[], target: number): number[] {
    const seen = new Map<number, number>();
    for (let i = 0; i < nums.length; i++) {
        const comp = target - nums[i];
        if (seen.has(comp)) return [seen.get(comp)!, i];
        seen.set(nums[i], i);
    }
    return [];
}`,
      go: `func twoSum(nums []int, target int) []int {
    seen := make(map[int]int)
    for i, num := range nums {
        comp := target - num
        if idx, ok := seen[comp]; ok {
            return []int{idx, i}
        }
        seen[num] = i
    }
    return nil
}`,
      rust: `use std::collections::HashMap;

impl Solution {
    pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {
        let mut seen = HashMap::new();
        for (i, &num) in nums.iter().enumerate() {
            let comp = target - num;
            if let Some(&idx) = seen.get(&comp) {
                return vec![idx as i32, i as i32];
            }
            seen.insert(num, i);
        }
        vec![]
    }
}`
    },
    buggyCode: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        # Buggy implementation: Self-pairing bug using identical index
        for i in range(len(nums)):
            for j in range(len(nums)):
                if nums[i] + nums[j] == target:
                    return [i, j] # Fails when target=6, nums=[3,2,4] -> returns [0, 0]
        return []`,
    buggyCodeByLang: {
      java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Buggy implementation: Self-pairing bug using identical index
        for (int i = 0; i < nums.length; i++) {
            for (int j = 0; j < nums.length; j++) {
                if (nums[i] + nums[j] == target) return new int[] { i, j };
            }
        }
        return new int[0];
    }
}`,
      python3: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        for i in range(len(nums)):
            for j in range(len(nums)):
                if nums[i] + nums[j] == target: return [i, j]
        return []`,
      cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        for (int i = 0; i < nums.size(); ++i) {
            for (int j = 0; j < nums.size(); ++j) {
                if (nums[i] + nums[j] == target) return { i, j };
            }
        }
        return {};
    }
};`,
      javascript: `var twoSum = function(nums, target) {
    for (let i = 0; i < nums.length; i++) {
        for (let j = 0; j < nums.length; j++) {
            if (nums[i] + nums[j] === target) return [i, j];
        }
    }
    return [];
};`,
      typescript: `function twoSum(nums: number[], target: number): number[] {
    for (let i = 0; i < nums.length; i++) {
        for (let j = 0; j < nums.length; j++) {
            if (nums[i] + nums[j] === target) return [i, j];
        }
    }
    return [];
}`,
      go: `func twoSum(nums []int, target int) []int {
    for i := 0; i < len(nums); i++ {
        for j := 0; j < len(nums); j++ {
            if nums[i] + nums[j] == target { return []int{i, j} }
        }
    }
    return nil
}`,
      rust: `impl Solution {
    pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {
        for i in 0..nums.len() {
            for j in 0..nums.len() {
                if nums[i] + nums[j] == target { return vec![i as i32, j as i32]; }
            }
        }
        vec![]
    }
}`
    },
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
    timeExplain: "Single pass through the array with O(1) hash map lookups",
    spaceExplain: "Stores up to n elements in auxiliary hash map",
    bruteForceTitle: "Nested Loops",
    bruteForceTime: "O(n²)",
    bruteForceSpace: "O(1)",
    bruteForceExplain: "Checks every pair (i, j). Inefficient on large arrays (10⁴ elements = 10⁸ ops).",
    optimalTitle: "One-Pass Hash Map Lookup",
    optimalTime: "O(n)",
    optimalSpace: "O(n)",
    optimalExplain: "Computes complement target - nums[i] and checks seen elements in O(1) average time.",
    mistakeTitle: "Self-Pairing Bug: Duplicate Index Returned",
    mistakeDetail: "When target = 6 and nums = [3, 2, 4], nested search starting j from 0 pairs nums[0] with itself, returning [0, 0] instead of [1, 2].",
    mistakeFix: "Query the hash map before inserting the current element, or ensure index j > i to avoid self-pairing.",
    takeaways: [
      "Complement Search: Looking up (target - num) converts a quadratic search into a constant-time O(1) query.",
      "One-Pass Technique: Check the map before adding the current element to avoid pairing an element with itself.",
      "Trade-off: Spending O(n) auxiliary memory drops runtime from quadratic O(n²) to linear O(n)."
    ],
    hints: [
      "Hint 1: Can you remember previously seen numbers so you don't have to scan the remaining array?",
      "Hint 2: For each element x, what exact value are you looking for? (target - x).",
      "Hint 3: Use a Hash Map to store values and their indices. Query if complement exists before inserting current value."
    ],
    dryRun: {
      headers: ["Step", "i", "nums[i]", "Complement (9 - nums[i])", "Seen Map", "Action"],
      rows: [
        ["1", "0", "2", "7", "{}", "7 not in map; insert {2: 0}"],
        ["2", "1", "7", "2", "{2: 0}", "2 in map! Found pair indices [0, 1]"],
        ["3", "Result", "-", "-", "-", "Return [0, 1] in O(1) lookups"]
      ]
    },
    animatic: {
      type: "array-map",
      target: 9,
      nums: [2, 7, 11, 15],
      steps: [
        {
          step: 1,
          pointer: 0,
          currentVal: 2,
          complement: 7,
          inMap: false,
          reaction: "insight",
          formula: "complement = 9 - nums[0] = 9 - 2 = 7",
          speech: "First step: Examine element at index 0 (value 2). We need 7 to reach target 9. Is 7 in our hash map? No.",
          action: "Check hash map for complement 7. Not found, so record {2: 0}."
        },
        {
          step: 2,
          pointer: 1,
          currentVal: 7,
          complement: 2,
          inMap: true,
          matchedIndices: [0, 1],
          reaction: "match",
          formula: "complement = 9 - nums[1] = 9 - 7 = 2 (Found in map!)",
          speech: "Match found! At index 1 (value 7), the complement 2 exists at index 0 in our map! Return [0, 1].",
          action: "Match found! Return pair indices [0, 1]."
        }
      ]
    }
  },
  "minimize-maximum-pair-sum-in-array": {
    title: "Minimize Maximum Pair Sum in Array",
    number: "1877",
    difficulty: "Medium",
    description: "The pair sum of a pair (a, b) is equal to a + b. The maximum pair sum is the largest pair sum in a list of pairs. Given an array nums of even length n, pair up the elements of nums into n / 2 pairs such that: each element is in exactly one pair, and the maximum pair sum is minimized. Return the minimized maximum pair sum.",
    acceptedCode: `class Solution:
    def minPairSum(self, nums: list[int]) -> int:
        nums.sort()
        n = len(nums)
        max_sum = 0
        for i in range(n // 2):
            max_sum = max(max_sum, nums[i] + nums[n - 1 - i])
        return max_sum`,
    acceptedCodeByLang: {
      java: `class Solution {
    public int minPairSum(int[] nums) {
        Arrays.sort(nums);
        int max = 0;
        int n = nums.length;
        for (int i = 0; i < n / 2; i++) {
            max = Math.max(max, nums[i] + nums[n - 1 - i]);
        }
        return max;
    }
}`,
      python3: `class Solution:
    def minPairSum(self, nums: list[int]) -> int:
        nums.sort()
        n = len(nums)
        return max(nums[i] + nums[n - 1 - i] for i in range(n // 2))`,
      cpp: `class Solution {
public:
    int minPairSum(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        int ans = 0, n = nums.size();
        for (int i = 0; i < n / 2; ++i) {
            ans = max(ans, nums[i] + nums[n - 1 - i]);
        }
        return ans;
    }
};`,
      javascript: `var minPairSum = function(nums) {
    nums.sort((a, b) => a - b);
    let max = 0, n = nums.length;
    for (let i = 0; i < n / 2; i++) {
        max = Math.max(max, nums[i] + nums[n - 1 - i]);
    }
    return max;
};`,
      typescript: `function minPairSum(nums: number[]): number {
    nums.sort((a, b) => a - b);
    let max = 0, n = nums.length;
    for (let i = 0; i < n / 2; i++) {
        max = Math.max(max, nums[i] + nums[n - 1 - i]);
    }
    return max;
}`,
      go: `func minPairSum(nums []int) int {
    sort.Ints(nums)
    maxSum, n := 0, len(nums)
    for i := 0; i < n/2; i++ {
        sum := nums[i] + nums[n-1-i]
        if sum > maxSum { maxSum = sum }
    }
    return maxSum
}`,
      rust: `impl Solution {
    pub fn min_pair_sum(mut nums: Vec<i32>) -> i32 {
        nums.sort();
        let n = nums.len();
        let mut max_sum = 0;
        for i in 0..(n / 2) {
            max_sum = max_sum.max(nums[i] + nums[n - 1 - i]);
        }
        max_sum
    }
}`
    },
    buggyCode: `class Solution:
    def minPairSum(self, nums: list[int]) -> int:
        # Buggy / Suboptimal: Arbitrary consecutive pairing without sorting
        max_sum = 0
        for i in range(0, len(nums), 2):
            max_sum = max(max_sum, nums[i] + nums[i + 1])
        return max_sum`,
    buggyCodeByLang: {
      java: `class Solution {
    public int minPairSum(int[] nums) {
        // Buggy pairing: fails when array is unsorted
        int max = 0;
        for (int i = 0; i < nums.length; i += 2) {
            max = Math.max(max, nums[i] + nums[i + 1]);
        }
        return max;
    }
}`,
      python3: `class Solution:
    def minPairSum(self, nums: list[int]) -> int:
        return max(nums[i] + nums[i + 1] for i in range(0, len(nums), 2))`,
      cpp: `class Solution {
public:
    int minPairSum(vector<int>& nums) {
        int ans = 0;
        for (int i = 0; i < nums.size(); i += 2) ans = max(ans, nums[i] + nums[i + 1]);
        return ans;
    }
};`,
      javascript: `var minPairSum = function(nums) {
    let max = 0;
    for (let i = 0; i < nums.length; i += 2) max = Math.max(max, nums[i] + nums[i + 1]);
    return max;
};`,
      typescript: `function minPairSum(nums: number[]): number {
    let max = 0;
    for (let i = 0; i < nums.length; i += 2) max = Math.max(max, nums[i] + nums[i + 1]);
    return max;
}`,
      go: `func minPairSum(nums []int) int {
    maxSum := 0
    for i := 0; i < len(nums); i += 2 {
        if s := nums[i] + nums[i+1]; s > maxSum { maxSum = s }
    }
    return maxSum
}`,
      rust: `impl Solution {
    pub fn min_pair_sum(nums: Vec<i32>) -> i32 {
        let mut max_sum = 0;
        for i in (0..nums.len()).step_by(2) {
            max_sum = max_sum.max(nums[i] + nums[i + 1]);
        }
        max_sum
    }
}`
    },
    timeComplexity: "O(n log n)",
    spaceComplexity: "O(1)",
    timeExplain: "Sorting dominated O(n log n) followed by linear O(n) dual pointer scan",
    spaceExplain: "In-place primitive sorting or O(log n) call stack overhead",
    bruteForceTitle: "Exhaustive Pair Enumeration",
    bruteForceTime: "O((n!)/(2^(n/2)))",
    bruteForceSpace: "O(n)",
    bruteForceExplain: "Evaluating all possible groupings is combinatorial factorial explosion.",
    optimalTitle: "Greedy Dual Pointers with Sorting",
    optimalTime: "O(n log n)",
    optimalSpace: "O(1)",
    optimalExplain: "Pairing the smallest with the largest element balances the sum across all pairs.",
    mistakeTitle: "Incorrect Pairing Strategy: Unsorted Adjacent Pairs",
    mistakeDetail: "Pairing adjacent numbers without sorting allows large numbers to pair together (e.g. 5 + 4 = 9), failing to minimize the maximum sum.",
    mistakeFix: "Sort the array in ascending order and pair nums[i] with nums[n - 1 - i].",
    takeaways: [
      "Greedy Invariant: Pairing the minimum with the maximum balances extreme values.",
      "Sorting Step: Ordering the array enables deterministic two-pointer matching.",
      "Mathematical Optimality: By the rearrangement inequality, this greedy choice is provably optimal."
    ],
    hints: [
      "Hint 1: To make the largest pair sum as small as possible, what should you pair with the largest number in the array?",
      "Hint 2: The largest number must be paired with the smallest number to balance its weight.",
      "Hint 3: Sort the array, then pair nums[i] with nums[n - 1 - i] using two pointers."
    ],
    dryRun: {
      headers: ["Step", "Left Pointer (i)", "Right Pointer (n-1-i)", "Pair Sum", "Max Sum So Far"],
      rows: [
        ["1", "nums[0] = 3", "nums[3] = 5", "3 + 5 = 8", "8"],
        ["2", "nums[1] = 3", "nums[2] = 4", "3 + 4 = 7", "max(8, 7) = 8"],
        ["Result", "-", "-", "Final Max Pair Sum", "8"]
      ]
    },
    animatic: {
      type: "dual-pointer",
      target: 8,
      nums: [3, 3, 4, 5],
      steps: [
        {
          step: 1,
          left: 0,
          right: 3,
          currentSum: 8,
          maxSum: 8,
          reaction: "insight",
          formula: "pair = nums[0] + nums[3] = 3 + 5 = 8",
          speech: "Greedy balance: Pair the smallest element 3 with the largest element 5. Pair sum = 8.",
          action: "Evaluate pair (nums[0], nums[3])."
        },
        {
          step: 2,
          left: 1,
          right: 2,
          currentSum: 7,
          maxSum: 8,
          matchedIndices: [1, 2],
          reaction: "optimal",
          formula: "pair = nums[1] + nums[2] = 3 + 4 = 7, max_sum = 8",
          speech: "Next inner pair: 3 + 4 = 7. Maximum pair sum across all pairs remains 8!",
          action: "Finish pairings and return minimized maximum sum 8."
        }
      ]
    }
  },
  "binary-search": {
    title: "Binary Search",
    number: "704",
    difficulty: "Easy",
    description: "Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, then return its index. Otherwise, return -1. You must write an algorithm with O(log n) runtime complexity.",
    acceptedCode: `class Solution:
    def search(self, nums: list[int], target: int) -> int:
        left, right = 0, len(nums) - 1
        while left <= right:
            mid = left + (right - left) // 2
            if nums[mid] == target:
                return mid
            elif nums[mid] < target:
                left = mid + 1
            else:
                right = mid - 1
        return -1`,
    acceptedCodeByLang: {
      java: `class Solution {
    public int search(int[] nums, int target) {
        int left = 0, right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            else if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
}`,
      python3: `class Solution:
    def search(self, nums: list[int], target: int) -> int:
        left, right = 0, len(nums) - 1
        while left <= right:
            mid = left + (right - left) // 2
            if nums[mid] == target: return mid
            elif nums[mid] < target: left = mid + 1
            else: right = mid - 1
        return -1`,
      cpp: `class Solution {
public:
    int search(vector<int>& nums, int target) {
        int left = 0, right = nums.size() - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            else if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
};`,
      javascript: `var search = function(nums, target) {
    let left = 0, right = nums.length - 1;
    while (left <= right) {
        let mid = Math.floor(left + (right - left) / 2);
        if (nums[mid] === target) return mid;
        else if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
};`,
      typescript: `function search(nums: number[], target: number): number {
    let left: number = 0, right: number = nums.length - 1;
    while (left <= right) {
        let mid: number = Math.floor(left + (right - left) / 2);
        if (nums[mid] === target) return mid;
        else if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}`,
      go: `func search(nums []int, target int) int {
    left, right := 0, len(nums)-1
    for left <= right {
        mid := left + (right-left)/2
        if nums[mid] == target { return mid }
        if nums[mid] < target { left = mid + 1 } else { right = mid - 1 }
    }
    return -1
}`,
      rust: `impl Solution {
    pub fn search(nums: Vec<i32>, target: i32) -> i32 {
        let mut left = 0i32;
        let mut right = nums.len() as i32 - 1;
        while left <= right {
            let mid = left + (right - left) / 2;
            let val = nums[mid as usize];
            if val == target { return mid; }
            else if val < target { left = mid + 1; }
            else { right = mid - 1; }
        }
        -1
    }
}`
    },
    buggyCode: `class Solution:
    def search(self, nums: list[int], target: int) -> int:
        # Buggy: Integer overflow & strict inequality misses single element
        left, right = 0, len(nums) - 1
        while left < right: # Fails when len == 1 or target at boundary
            mid = (left + right) // 2 # Potential integer overflow in static languages
            if nums[mid] == target: return mid
            elif nums[mid] < target: left = mid
            else: right = mid
        return -1`,
    buggyCodeByLang: {
      java: `class Solution {
    public int search(int[] nums, int target) {
        // Buggy: while (left < right) misses single-element boundary and causes infinite loop
        int left = 0, right = nums.length - 1;
        while (left < right) {
            int mid = (left + right) / 2;
            if (nums[mid] == target) return mid;
            else if (nums[mid] < target) left = mid;
            else right = mid;
        }
        return -1;
    }
}`,
      python3: `class Solution:
    def search(self, nums: list[int], target: int) -> int:
        left, right = 0, len(nums) - 1
        while left < right:
            mid = (left + right) // 2
            if nums[mid] == target: return mid
            elif nums[mid] < target: left = mid
            else: right = mid
        return -1`,
      cpp: `class Solution {
public:
    int search(vector<int>& nums, int target) {
        int left = 0, right = nums.size() - 1;
        while (left < right) {
            int mid = (left + right) / 2;
            if (nums[mid] == target) return mid;
            else if (nums[mid] < target) left = mid;
            else right = mid;
        }
        return -1;
    }
};`,
      javascript: `var search = function(nums, target) {
    let left = 0, right = nums.length - 1;
    while (left < right) {
        let mid = Math.floor((left + right) / 2);
        if (nums[mid] === target) return mid;
        else if (nums[mid] < target) left = mid;
        else right = mid;
    }
    return -1;
};`,
      typescript: `function search(nums: number[], target: number): number {
    let left = 0, right = nums.length - 1;
    while (left < right) {
        let mid = Math.floor((left + right) / 2);
        if (nums[mid] === target) return mid;
        else if (nums[mid] < target) left = mid;
        else right = mid;
    }
    return -1;
}`,
      go: `func search(nums []int, target int) int {
    left, right := 0, len(nums)-1
    for left < right {
        mid := (left + right) / 2
        if nums[mid] == target { return mid }
        if nums[mid] < target { left = mid } else { right = mid }
    }
    return -1
}`,
      rust: `impl Solution {
    pub fn search(nums: Vec<i32>, target: i32) -> i32 {
        let mut left = 0;
        let mut right = nums.len() - 1;
        while left < right {
            let mid = (left + right) / 2;
            if nums[mid] == target { return mid as i32; }
            else if nums[mid] < target { left = mid; }
            else { right = mid; }
        }
        -1
    }
}`
    },
    timeComplexity: "O(log n)",
    spaceComplexity: "O(1)",
    timeExplain: "Halves search space on every comparison step",
    spaceExplain: "Uses constant auxiliary pointers (left, mid, right)",
    bruteForceTitle: "Linear Scan",
    bruteForceTime: "O(n)",
    bruteForceSpace: "O(1)",
    bruteForceExplain: "Scans array from start to end without taking advantage of sorted order.",
    optimalTitle: "Binary Search Divide & Conquer",
    optimalTime: "O(log n)",
    optimalSpace: "O(1)",
    optimalExplain: "Bisects search interval around midpoint, discarding half the elements each step.",
    mistakeTitle: "Loop Invariant Flaw: Strict Inequality & Stagnant Pointers",
    mistakeDetail: "Using while (left < right) fails to evaluate single-element arrays (e.g. nums = [5], target = 5 returns -1). Updating left = mid without +1 leads to infinite loops.",
    mistakeFix: "Use while (left <= right) and update left = mid + 1, right = mid - 1.",
    takeaways: [
      "Midpoint Calculation: Use left + (right - left) // 2 to prevent 32-bit integer overflow.",
      "Loop Condition: left <= right ensures single-element and boundary values are evaluated.",
      "Strict Pointer Updates: Always use mid + 1 and mid - 1 to guarantee termination."
    ],
    hints: [
      "Hint 1: The input array is already sorted. What property allows you to discard half the array?",
      "Hint 2: Compare the middle element to the target. If target is larger, it must reside in the right half.",
      "Hint 3: Guard against boundary bugs: use left <= right and calculate mid = left + (right - left) / 2."
    ],
    dryRun: {
      headers: ["Step", "Left", "Right", "Mid", "nums[mid]", "Action"],
      rows: [
        ["1", "0", "5", "2", "nums[2] = 0", "Target 9 > 0; shift left to mid + 1 (3)"],
        ["2", "3", "5", "4", "nums[4] = 9", "nums[4] == target (9)! Return index 4"],
        ["Result", "-", "-", "-", "-", "Found in O(log n) comparisons"]
      ]
    },
    animatic: {
      type: "binary-search",
      target: 9,
      nums: [-1, 0, 3, 5, 9, 12],
      steps: [
        {
          step: 1,
          left: 0,
          right: 5,
          mid: 2,
          reaction: "insight",
          formula: "mid = 0 + (5 - 0) // 2 = 2, nums[2] = 3",
          speech: "Initial range [0, 5]. Midpoint is index 2 with value 3. Target 9 > 3, so eliminate left half [0, 2].",
          action: "Target > nums[mid]. Search right half."
        },
        {
          step: 2,
          left: 3,
          right: 5,
          mid: 4,
          matchedIndices: [4],
          reaction: "match",
          formula: "mid = 3 + (5 - 3) // 2 = 4, nums[4] = 9 (Target Found!)",
          speech: "Midpoint is now index 4 with value 9. Target matches! Found target at index 4.",
          action: "Match found! Return index 4."
        }
      ]
    }
  },
  "bubble-sort": {
    title: "Bubble Sort",
    number: "Sort",
    difficulty: "Easy",
    description: "Given an unsorted array of numbers, sort the array in ascending order using Bubble Sort algorithm by repeatedly swapping adjacent elements that are out of order.",
    acceptedCode: `class Solution:
    def bubbleSort(self, nums: list[int]) -> list[int]:
        n = len(nums)
        for i in range(n):
            swapped = False
            for j in range(0, n - i - 1):
                if nums[j] > nums[j + 1]:
                    nums[j], nums[j + 1] = nums[j + 1], nums[j]
                    swapped = True
            if not swapped:
                break
        return nums`,
    acceptedCodeByLang: {
      java: `class Solution {
    public void bubbleSort(int[] nums) {
        int n = nums.length;
        for (int i = 0; i < n; i++) {
            boolean swapped = false;
            for (int j = 0; j < n - i - 1; j++) {
                if (nums[j] > nums[j + 1]) {
                    int temp = nums[j];
                    nums[j] = nums[j + 1];
                    nums[j + 1] = temp;
                    swapped = true;
                }
            }
            if (!swapped) break;
        }
    }
}`,
      python3: `class Solution:
    def bubbleSort(self, nums: list[int]) -> list[int]:
        n = len(nums)
        for i in range(n):
            swapped = False
            for j in range(0, n - i - 1):
                if nums[j] > nums[j + 1]:
                    nums[j], nums[j + 1] = nums[j + 1], nums[j]
                    swapped = True
            if not swapped: break
        return nums`,
      cpp: `class Solution {
public:
    void bubbleSort(vector<int>& nums) {
        int n = nums.size();
        for (int i = 0; i < n; ++i) {
            bool swapped = false;
            for (int j = 0; j < n - i - 1; ++j) {
                if (nums[j] > nums[j + 1]) {
                    swap(nums[j], nums[j + 1]);
                    swapped = true;
                }
            }
            if (!swapped) break;
        }
    }
};`,
      javascript: `var bubbleSort = function(nums) {
    let n = nums.length;
    for (let i = 0; i < n; i++) {
        let swapped = false;
        for (let j = 0; j < n - i - 1; j++) {
            if (nums[j] > nums[j + 1]) {
                [nums[j], nums[j + 1]] = [nums[j + 1], nums[j]];
                swapped = true;
            }
        }
        if (!swapped) break;
    }
    return nums;
};`,
      typescript: `function bubbleSort(nums: number[]): number[] {
    let n = nums.length;
    for (let i = 0; i < n; i++) {
        let swapped = false;
        for (let j = 0; j < n - i - 1; j++) {
            if (nums[j] > nums[j + 1]) {
                [nums[j], nums[j + 1]] = [nums[j + 1], nums[j]];
                swapped = true;
            }
        }
        if (!swapped) break;
    }
    return nums;
}`,
      go: `func bubbleSort(nums []int) []int {
    n := len(nums)
    for i := 0; i < n; i++ {
        swapped := false
        for j := 0; j < n-i-1; j++ {
            if nums[j] > nums[j+1] {
                nums[j], nums[j+1] = nums[j+1], nums[j]
                swapped = true
            }
        }
        if !swapped { break }
    }
    return nums
}`,
      rust: `impl Solution {
    pub fn bubble_sort(mut nums: Vec<i32>) -> Vec<i32> {
        let n = nums.len();
        for i in 0..n {
            let mut swapped = false;
            for j in 0..(n - i - 1) {
                if nums[j] > nums[j + 1] {
                    nums.swap(j, j + 1);
                    swapped = true;
                }
            }
            if !swapped { break; }
        }
        nums
    }
}`
    },
    buggyCode: `class Solution:
    def bubbleSort(self, nums: list[int]) -> list[int]:
        # Buggy: Index out of bounds (n instead of n - 1) & no early termination
        for i in range(len(nums)):
            for j in range(len(nums)): # Out of bounds when j = len(nums) - 1
                if nums[j] > nums[j + 1]:
                    nums[j], nums[j + 1] = nums[j + 1], nums[j]
        return nums`,
    buggyCodeByLang: {
      java: `class Solution {
    public void bubbleSort(int[] nums) {
        // Buggy: ArrayIndexOutOfBoundsException when j + 1 == nums.length
        for (int i = 0; i < nums.length; i++) {
            for (int j = 0; j < nums.length; j++) {
                if (nums[j] > nums[j + 1]) {
                    int t = nums[j]; nums[j] = nums[j + 1]; nums[j + 1] = t;
                }
            }
        }
    }
}`,
      python3: `class Solution:
    def bubbleSort(self, nums: list[int]) -> list[int]:
        for i in range(len(nums)):
            for j in range(len(nums)):
                if nums[j] > nums[j + 1]: nums[j], nums[j + 1] = nums[j + 1], nums[j]
        return nums`,
      cpp: `class Solution {
public:
    void bubbleSort(vector<int>& nums) {
        for (int i = 0; i < nums.size(); ++i) {
            for (int j = 0; j < nums.size(); ++j) {
                if (nums[j] > nums[j + 1]) swap(nums[j], nums[j + 1]);
            }
        }
    }
};`,
      javascript: `var bubbleSort = function(nums) {
    for (let i = 0; i < nums.length; i++) {
        for (let j = 0; j < nums.length; j++) {
            if (nums[j] > nums[j + 1]) [nums[j], nums[j + 1]] = [nums[j + 1], nums[j]];
        }
    }
    return nums;
};`,
      typescript: `function bubbleSort(nums: number[]): number[] {
    for (let i = 0; i < nums.length; i++) {
        for (let j = 0; j < nums.length; j++) {
            if (nums[j] > nums[j + 1]) [nums[j], nums[j + 1]] = [nums[j + 1], nums[j]];
        }
    }
    return nums;
}`,
      go: `func bubbleSort(nums []int) []int {
    for i := 0; i < len(nums); i++ {
        for j := 0; j < len(nums); j++ {
            if nums[j] > nums[j+1] { nums[j], nums[j+1] = nums[j+1], nums[j] }
        }
    }
    return nums
}`,
      rust: `impl Solution {
    pub fn bubble_sort(mut nums: Vec<i32>) -> Vec<i32> {
        for i in 0..nums.len() {
            for j in 0..nums.len() {
                if nums[j] > nums[j + 1] { nums.swap(j, j + 1); }
            }
        }
        nums
    }
}`
    },
    timeComplexity: "O(n²)",
    spaceComplexity: "O(1)",
    timeExplain: "Quadratic comparisons O(n²), with best-case O(n) early termination",
    spaceExplain: "In-place element swapping with zero additional memory allocation",
    bruteForceTitle: "Unoptimized Nested Swaps",
    bruteForceTime: "O(n²)",
    bruteForceSpace: "O(1)",
    bruteForceExplain: "Runs all iterations unconditionally even when array is already sorted.",
    optimalTitle: "Early-Termination Bubble Sort",
    optimalTime: "O(n²)",
    optimalSpace: "O(1)",
    optimalExplain: "Uses a swapped flag to break early when array is already sorted (O(n) best case).",
    mistakeTitle: "Array Boundary Exception: Unbounded Inner Loop",
    mistakeDetail: "Accessing nums[j + 1] when j reaches length - 1 triggers an ArrayIndexOutOfBoundsException crash.",
    mistakeFix: "Bound the inner loop to j < n - i - 1 and add a boolean swapped flag for early exit.",
    takeaways: [
      "In-place sorting: Modifies original array with O(1) auxiliary memory.",
      "Bubble invariant: The largest unsorted element bubbles to its final index at the end of each pass.",
      "Early exit optimization: If no swaps occurred during a pass, the array is already sorted."
    ],
    hints: [
      "Hint 1: In each outer pass, the largest unsorted element bubbles up to its final position at the end.",
      "Hint 2: How can you avoid comparing elements that are already sorted at the end? (Limit j to n - i - 1).",
      "Hint 3: What if the array becomes sorted before all n passes complete? Add a swapped boolean flag."
    ],
    dryRun: {
      headers: ["Pass (i)", "Inner (j)", "nums[j]", "nums[j+1]", "Swapped?", "Array State"],
      rows: [
        ["0", "0", "4", "2", "Yes (4 > 2)", "[2, 4, 5, 1]"],
        ["0", "1", "4", "5", "No (4 < 5)", "[2, 4, 5, 1]"],
        ["0", "2", "5", "1", "Yes (5 > 1)", "[2, 4, 1, 5] (5 placed at end)"],
        ["1", "0", "2", "4", "No (2 < 4)", "[2, 4, 1, 5]"],
        ["1", "1", "4", "1", "Yes (4 > 1)", "[2, 1, 4, 5] (4 placed)"],
        ["2", "0", "2", "1", "Yes (2 > 1)", "[1, 2, 4, 5] (Sorted!)"]
      ]
    },
    animatic: {
      type: "pillars",
      target: null,
      nums: [5, 2, 4, 1, 3],
      steps: [
        {
          step: 1,
          left: 0,
          right: 1,
          reaction: "swap",
          formula: "nums[0]=5 > nums[1]=2 => Swap!",
          speech: "Pillar comparison: 5 is greater than 2. Swap to bubble 5 towards the right.",
          action: "Swap adjacent elements (5, 2)."
        },
        {
          step: 2,
          left: 1,
          right: 2,
          reaction: "swap",
          formula: "nums[1]=5 > nums[2]=4 => Swap!",
          speech: "5 is greater than 4. Swap to continue bubbling 5.",
          action: "Swap adjacent elements (5, 4)."
        },
        {
          step: 3,
          left: 2,
          right: 3,
          reaction: "swap",
          formula: "nums[2]=5 > nums[3]=1 => Swap!",
          speech: "5 is greater than 1. Swap adjacent pillars.",
          action: "Swap adjacent elements (5, 1)."
        },
        {
          step: 4,
          left: 3,
          right: 4,
          matchedIndices: [4],
          reaction: "optimal",
          formula: "5 reaches final rightmost position! Array sorted step-by-step.",
          speech: "Pass 1 complete! Pillar 5 is locked in its permanent sorted position.",
          action: "Pillar 5 placed in final position."
        }
      ]
    }
  },
  "is-subsequence": {
    title: "Is Subsequence",
    number: "392",
    difficulty: "Easy",
    description: "Given two strings s and t, return true if s is a subsequence of t, or false otherwise. A subsequence of a string is a new string formed from the original string by deleting some (can be none) of the characters without disturbing the relative positions of the remaining characters.",
    acceptedCode: `class Solution:
    def isSubsequence(self, s: str, t: str) -> bool:
        i, j = 0, 0
        while i < len(s) and j < len(t):
            if s[i] == t[j]:
                i += 1
            j += 1
        return i == len(s)`,
    acceptedCodeByLang: {
      java: `class Solution {
    public boolean isSubsequence(String s, String t) {
        int i = 0, j = 0;
        while (i < s.length() && j < t.length()) {
            if (s.charAt(i) == t.charAt(j)) {
                i++;
            }
            j++;
        }
        return i == s.length();
    }
}`,
      python3: `class Solution:
    def isSubsequence(self, s: str, t: str) -> bool:
        i, j = 0, 0
        while i < len(s) and j < len(t):
            if s[i] == t[j]:
                i += 1
            j += 1
        return i == len(s)`,
      cpp: `class Solution {
public:
    bool isSubsequence(string s, string t) {
        int i = 0, j = 0;
        while (i < s.length() && j < t.length()) {
            if (s[i] == t[j]) i++;
            j++;
        }
        return i == s.length();
    }
};`,
      javascript: `var isSubsequence = function(s, t) {
    let i = 0, j = 0;
    while (i < s.length && j < t.length) {
        if (s[i] === t[j]) i++;
        j++;
    }
    return i === s.length;
};`,
      typescript: `function isSubsequence(s: string, t: string): boolean {
    let i = 0, j = 0;
    while (i < s.length && j < t.length) {
        if (s[i] === t[j]) i++;
        j++;
    }
    return i === s.length;
};`,
      go: `func isSubsequence(s string, t string) bool {
    i, j := 0, 0
    for i < len(s) && j < len(t) {
        if s[i] == t[j] { i++ }
        j++
    }
    return i == len(s)
}`,
      rust: `impl Solution {
    pub fn is_subsequence(s: String, t: String) -> bool {
        let (s_bytes, t_bytes) = (s.as_bytes(), t.as_bytes());
        let (mut i, mut j) = (0, 0);
        while i < s_bytes.len() && j < t_bytes.len() {
            if s_bytes[i] == t_bytes[j] { i += 1; }
            j += 1;
        }
        i == s_bytes.len()
    }
}`
    },
    buggyCode: `class Solution:
    def isSubsequence(self, s: str, t: str) -> bool:
        # Buggy: fails to preserve character order or skips advance
        return all(c in t for c in s) # Fails on duplicate characters & ordering!`,
    buggyCodeByLang: {
      java: `class Solution {
    public boolean isSubsequence(String s, String t) {
        // Buggy: indexOf without tracking prior index fails order
        int lastIdx = -1;
        for (char c : s.toCharArray()) {
            int idx = t.indexOf(c); // Fails: does not search after lastIdx!
            if (idx == -1) return false;
        }
        return true;
    }
}`,
      python3: `class Solution:
    def isSubsequence(self, s: str, t: str) -> bool:
        return all(c in t for c in s)`
    },
    timeComplexity: "O(|s| + |t|)",
    spaceComplexity: "O(1)",
    auxiliarySpace: "O(1)",
    totalSpace: "O(|s| + |t|)",
    timeExplain: "Inner pointer index advances through t at most once across all outer iterations because index is never reset. Total comparisons are bounded by |s| + |t| (linear), NOT quadratic.",
    spaceExplain: "Uses only constant integer pointer variables (i, index, c) with O(1) auxiliary space.",
    bruteForceTitle: "Exhaustive Subsequence Generation",
    bruteForceTime: "O(2^|t|)",
    bruteForceSpace: "O(|t|)",
    bruteForceExplain: "Recursively generates all 2^|t| possible subsequences of string t and checks if string s equals any generated subsequence.",
    optimalTitle: "Two Pointers Greedy Match",
    optimalTime: "O(|s| + |t|)",
    optimalSpace: "O(1)",
    optimalExplain: "Traverses string t with two pointers, greedily matching characters of s in order. Both student's solution and canonical solution share the same O(|s| + |t|) time and O(1) auxiliary space.",
    edgeCases: [
      { caseName: "Empty s (Empty Subsequence)", input: 's = "", t = "abc"', expected: "true", explanation: "An empty string is trivially a valid subsequence of any target string.", handledBy: "Loop condition / count comparison" },
      { caseName: "Empty t with Non-Empty s", input: 's = "abc", t = ""', expected: "false", explanation: "A non-empty string cannot be formed from an empty target string.", handledBy: "Loop boundary check" },
      { caseName: "Order-Preserved Subsequence", input: 's = "abc", t = "ahbgdc"', expected: "true", explanation: "Characters 'a', 'b', 'c' appear in matching relative order.", handledBy: "Two-pointer forward traversal" },
      { caseName: "Missing / Mismatched Character", input: 's = "axc", t = "ahbgdc"', expected: "false", explanation: "Character 'x' is not present in t.", handledBy: "Pointer exhaust" },
      { caseName: "Repeated Characters with Order Constraint", input: 's = "aaaa", t = "bbaaa"', expected: "false", explanation: "Only three 'a' characters exist in t, so four cannot be matched.", handledBy: "Match count verification" }
    ],
    mistakeTitle: "Set / Unordered Lookup Error",
    mistakeDetail: "Checking whether all characters in s exist in t using sets or indexOf(c) without starting after previous matches ignores relative character ordering and duplicate frequencies (e.g. s = 'acb', t = 'ahbgdc').",
    mistakeFix: "Use two pointers i and j. Advance i only when s[i] == t[j], and advance j on every step.",
    takeaways: [
      "Character Order Preservation: Subsequence requires maintaining relative order; set membership checks fail.",
      "Greedy Choice: Matching the earliest possible occurrence of s[i] in t is always optimal.",
      "Follow-up: For multiple queries s1..sk on fixed t, precompute next-character lookup tables using binary search or trie/state-machine."
    ],
    hints: [
      "Hint 1: Can you check characters of s in order while moving through t?",
      "Hint 2: Maintain two pointers i for string s and j for string t.",
      "Hint 3: When s[i] matches t[j], advance both pointers; otherwise advance only j."
    ],
    dryRun: {
      headers: ["Step", "i (s)", "j (t)", "s[i]", "t[j]", "Action"],
      rows: [
        ["1", "0", "0", "'a'", "'a'", "Match! Advance i to 1, j to 1"],
        ["2", "1", "1", "'b'", "'h'", "No match. Advance j to 2"],
        ["3", "1", "2", "'b'", "'b'", "Match! Advance i to 2, j to 3"],
        ["4", "2", "3", "'c'", "'g'", "No match. Advance j to 4"],
        ["5", "2", "4", "'c'", "'d'", "No match. Advance j to 5"],
        ["6", "2", "5", "'c'", "'c'", "Match! Advance i to 3, j to 6"],
        ["Result", "3", "6", "-", "-", "i == len(s) => True!"]
      ]
    },
    animatic: {
      type: "two-pointers",
      target: "abc",
      s: "abc",
      t: "ahbgdc",
      steps: [
        {
          step: 1,
          i: 0,
          j: 0,
          reaction: "match",
          formula: "s[0]='a' == t[0]='a' (Match!)",
          speech: "Matching character 'a' at t[0]. Advance both pointers.",
          action: "Match found: s[0] == t[0]."
        },
        {
          step: 2,
          i: 1,
          j: 2,
          reaction: "match",
          formula: "s[1]='b' == t[2]='b' (Match!)",
          speech: "Skipped 'h'. Matched 'b' at t[2]. Advance i to 2.",
          action: "Match found: s[1] == t[2]."
        },
        {
          step: 3,
          i: 2,
          j: 5,
          reaction: "optimal",
          formula: "s[2]='c' == t[5]='c' => Subsequence Confirmed!",
          speech: "Matched all characters of 'abc' in relative order! Return true.",
          action: "All characters matched. Result: true."
        }
      ]
    }
  },
  "string-compression": {
    title: "String Compression",
    number: "443",
    difficulty: "Medium",
    description: "Given an array of characters chars, compress it in-place: for each group of consecutive repeating characters, append the character followed by the group's length (if > 1). Return the new length of the modified array.",
    acceptedCode: `class Solution:
    def compress(self, chars: list[str]) -> int:
        write = 0
        read = 0
        n = len(chars)
        while read < n:
            ch = chars[read]
            count = 0
            while read < n and chars[read] == ch:
                read += 1
                count += 1
            chars[write] = ch
            write += 1
            if count > 1:
                for digit in str(count):
                    chars[write] = digit
                    write += 1
        return write`,
    acceptedCodeByLang: {
      java: `class Solution {
    public int compress(char[] chars) {
        int write = 0, read = 0, n = chars.length;
        while (read < n) {
            char ch = chars[read];
            int count = 0;
            while (read < n && chars[read] == ch) {
                read++;
                count++;
            }
            chars[write++] = ch;
            if (count > 1) {
                for (char c : Integer.toString(count).toCharArray()) {
                    chars[write++] = c;
                }
            }
        }
        return write;
    }
}`,
      python3: `class Solution:
    def compress(self, chars: list[str]) -> int:
        write, read, n = 0, 0, len(chars)
        while read < n:
            ch = chars[read]
            count = 0
            while read < n and chars[read] == ch:
                read += 1
                count += 1
            chars[write] = ch
            write += 1
            if count > 1:
                for digit in str(count):
                    chars[write] = digit
                    write += 1
        return write`,
      cpp: `class Solution {
public:
    int compress(vector<char>& chars) {
        int write = 0, read = 0, n = chars.size();
        while (read < n) {
            char ch = chars[read];
            int count = 0;
            while (read < n && chars[read] == ch) {
                read++;
                count++;
            }
            chars[write++] = ch;
            if (count > 1) {
                string s = to_string(count);
                for (char c : s) chars[write++] = c;
            }
        }
        return write;
    }
};`,
      javascript: `var compress = function(chars) {
    let write = 0, read = 0, n = chars.length;
    while (read < n) {
        let ch = chars[read], count = 0;
        while (read < n && chars[read] === ch) {
            read++;
            count++;
        }
        chars[write++] = ch;
        if (count > 1) {
            for (let digit of String(count)) {
                chars[write++] = digit;
            }
        }
    }
    return write;
};`
    },
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    timeExplain: "Each character is inspected once by the read pointer and written at most twice (character and count digits)",
    spaceExplain: "Modifies input chars array in-place using write and read pointers with constant auxiliary space",
    bruteForceTitle: "Auxiliary String Buffer",
    bruteForceTime: "O(n)",
    bruteForceSpace: "O(n)",
    bruteForceExplain: "Builds a compressed string in a separate buffer then copies back into chars.",
    optimalTitle: "Two Pointers In-Place Write Head",
    optimalTime: "O(n)",
    optimalSpace: "O(1)",
    optimalExplain: "Maintains read head and write head in-place. Write head never overtakes read head because compressed group length <= uncompressed group length.",
    mistakeTitle: "Multi-digit Count Omission or External Allocation",
    mistakeDetail: "Failing to split multi-digit counts >= 10 into individual character digits ('1', '2') or allocating a new array violates the O(1) space constraint.",
    mistakeFix: "Iterate over string representation of count and write each digit individually to chars[write++].",
    takeaways: [
      "In-Place Invariant: write <= read is always true, so writing never overwrites unread elements.",
      "Multi-digit Splitting: Counts like 12 must be written as '1' and '2'.",
      "Single Character Count: When count is 1, do NOT append '1'."
    ],
    edgeCases: [
      { caseName: "Single Character Group", input: "chars = [\"a\"]", expected: "1 (chars = [\"a\"])", explanation: "Groups of length 1 append only the character with no count digit.", handledBy: "Group length check" },
      { caseName: "Multi-Digit Group Count", input: "chars = [\"a\"] * 12", expected: "3 (chars = [\"a\",\"1\",\"2\"])", explanation: "Group lengths >= 10 are split into individual digit characters.", handledBy: "Digit formatting" },
      { caseName: "All Distinct Characters", input: "chars = [\"a\",\"b\",\"c\"]", expected: "3 (chars = [\"a\",\"b\",\"c\"])", explanation: "Every character is unique; output length equals input length.", handledBy: "In-place write" }
    ]
  },
  "max-number-of-k-sum-pairs": {
    title: "Max Number of K-Sum Pairs",
    number: "1679",
    difficulty: "Medium",
    description: "You are given an integer array nums and an integer k. In one operation, you can pick two numbers from the array whose sum equals k and remove them. Return the maximum number of operations.",
    acceptedCode: `class Solution:
    def maxOperations(self, nums: list[int], k: int) -> int:
        freq = {}
        ops = 0
        for x in nums:
            comp = k - x
            if freq.get(comp, 0) > 0:
                ops += 1
                freq[comp] -= 1
            else:
                freq[x] = freq.get(x, 0) + 1
        return ops`,
    acceptedCodeByLang: {
      java: `class Solution {
    public int maxOperations(int[] nums, int k) {
        Map<Integer, Integer> freq = new HashMap<>();
        int ops = 0;
        for (int x : nums) {
            int comp = k - x;
            if (freq.getOrDefault(comp, 0) > 0) {
                ops++;
                freq.put(comp, freq.get(comp) - 1);
            } else {
                freq.put(x, freq.getOrDefault(x, 0) + 1);
            }
        }
        return ops;
    }
}`,
      python3: `class Solution:
    def maxOperations(self, nums: list[int], k: int) -> int:
        freq = {}
        ops = 0
        for x in nums:
            comp = k - x
            if freq.get(comp, 0) > 0:
                ops += 1
                freq[comp] -= 1
            else:
                freq[x] = freq.get(x, 0) + 1
        return ops`,
      cpp: `class Solution {
public:
    int maxOperations(vector<int>& nums, int k) {
        unordered_map<int, int> freq;
        int ops = 0;
        for (int x : nums) {
            int comp = k - x;
            if (freq[comp] > 0) {
                ops++;
                freq[comp]--;
            } else {
                freq[x]++;
            }
        }
        return ops;
    }
};`,
      javascript: `var maxOperations = function(nums, k) {
    const freq = new Map();
    let ops = 0;
    for (const x of nums) {
        const comp = k - x;
        if ((freq.get(comp) || 0) > 0) {
            ops++;
            freq.set(comp, freq.get(comp) - 1);
        } else {
            freq.set(x, (freq.get(x) || 0) + 1);
        }
    }
    return ops;
};`
    },
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
    timeExplain: "Single pass through array nums of length n with O(1) hash map operations",
    spaceExplain: "Hash map storing frequency counts for up to n unique elements",
    bruteForceTitle: "Exhaustive Pair Matching",
    bruteForceTime: "O(n²)",
    bruteForceSpace: "O(n)",
    bruteForceExplain: "Scans all pairs with nested loops, marking used indices in a boolean array.",
    optimalTitle: "Hash Map Frequency Counting",
    optimalTime: "O(n)",
    optimalSpace: "O(n)",
    optimalExplain: "Uses hash map to pair each element with its complement (k - x) in a single pass.",
    mistakeTitle: "Double Counting Pairs",
    mistakeDetail: "Counting all pairs that sum to k without tracking frequency decrements double counts elements or reuses the same element multiple times.",
    mistakeFix: "Decrement the complement's frequency count immediately upon finding a pair.",
    edgeCases: [
      { caseName: "No Matching Pairs", input: "nums = [1,2,3], k = 10", expected: "0", explanation: "No pair sums to target k.", handledBy: "Zero operation count" },
      { caseName: "All Duplicate Pairs", input: "nums = [2,2,2,2], k = 4", expected: "2", explanation: "Four 2s produce exactly two disjoint pairs.", handledBy: "Frequency decrement" },
      { caseName: "Odd Frequency of Half-k", input: "nums = [3,3,3], k = 6", expected: "1", explanation: "Three 3s form one valid pair; the third 3 remains unpaired.", handledBy: "Integer division" }
    ]
  }
};

// Web Audio API Synthesizer (Muted by default, zero external assets)
class WebAudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.muted = true;
    this.volume = 0.3;
  }
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }
  playTone(freq, type, duration, gainLevel = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      const targetGain = Math.max(0.0001, this.volume * gainLevel * 0.15);
      gain.gain.setValueAtTime(targetGain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch {}
  }
  step() { this.playTone(440, "sine", 0.08, 0.7); }
  pointer() { this.playTone(587.33, "triangle", 0.05, 0.6); }
  compare() {
    this.playTone(523.25, "sine", 0.07, 0.8);
    setTimeout(() => this.playTone(659.25, "sine", 0.07, 0.8), 40);
  }
  match() {
    this.playTone(523.25, "sine", 0.18, 1);
    setTimeout(() => this.playTone(659.25, "sine", 0.22, 1), 70);
    setTimeout(() => this.playTone(783.99, "sine", 0.3, 1.2), 140);
  }
  swap() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.12);
      gain.gain.setValueAtTime(this.volume * 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }
  mistake() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.2);
      gain.gain.setValueAtTime(this.volume * 0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }
  complete() {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, "sine", 0.25, 1.1), i * 90);
    });
  }
}
const soundFX = new WebAudioSynthesizer();

function formatLang(langKey) {
  const map = {
    python3: "Python 3",
    python: "Python 3",
    cpp: "C++",
    "c++": "C++",
    java: "Java",
    javascript: "JavaScript",
    js: "JavaScript",
    typescript: "TypeScript",
    ts: "TypeScript",
    go: "Go",
    golang: "Go",
    rust: "Rust"
  };
  return map[String(langKey).toLowerCase()] || String(langKey || "Python 3");
}

function normalizeLanguageKey(lang) {
  const lk = String(lang || "").toLowerCase().trim();
  if (lk.includes("java") && !lk.includes("script")) return "java";
  if (lk.includes("cpp") || lk.includes("c++")) return "cpp";
  if (lk.includes("python")) return "python3";
  if (lk.includes("typescript") || lk === "ts") return "typescript";
  if (lk.includes("rust")) return "rust";
  if (lk.includes("go") || lk === "golang") return "go";
  return "javascript";
}

function getEducationalDataFor(slug, title) {
  const normSlug = (slug || "").toLowerCase().trim();
  if (normSlug && PROBLEM_EDUCATIONAL_DATA[normSlug]) {
    return { ...PROBLEM_EDUCATIONAL_DATA[normSlug], isVerified: true, hasLocalSolution: true };
  }
  if (normSlug === "392" || normSlug === "is-subsequence") {
    return { ...PROBLEM_EDUCATIONAL_DATA["is-subsequence"], isVerified: true, hasLocalSolution: true };
  }
  if (normSlug === "443" || normSlug === "string-compression") {
    return { ...PROBLEM_EDUCATIONAL_DATA["string-compression"], isVerified: true, hasLocalSolution: true };
  }
  if (normSlug === "1679" || normSlug === "max-number-of-k-sum-pairs") {
    return { ...PROBLEM_EDUCATIONAL_DATA["max-number-of-k-sum-pairs"], isVerified: true, hasLocalSolution: true };
  }
  if (normSlug === "453" || normSlug === "minimum-moves-to-equal-array-elements") {
    return { ...PROBLEM_EDUCATIONAL_DATA["minimum-moves-to-equal-array-elements"], isVerified: true, hasLocalSolution: true };
  }
  if (normSlug === "287" || normSlug === "find-the-duplicate-number") {
    return { ...PROBLEM_EDUCATIONAL_DATA["find-the-duplicate-number"], isVerified: true, hasLocalSolution: true };
  }
  if (normSlug === "1" || normSlug === "two-sum") {
    return { ...PROBLEM_EDUCATIONAL_DATA["two-sum"], isVerified: true, hasLocalSolution: true };
  }
  if (normSlug === "1877" || normSlug === "minimize-maximum-pair-sum-in-array") {
    return { ...PROBLEM_EDUCATIONAL_DATA["minimize-maximum-pair-sum-in-array"], isVerified: true, hasLocalSolution: true };
  }
  if (normSlug === "704" || normSlug === "binary-search") {
    return { ...PROBLEM_EDUCATIONAL_DATA["binary-search"], isVerified: true, hasLocalSolution: true };
  }
  if (normSlug === "bubble-sort" || normSlug === "bubble") {
    return { ...PROBLEM_EDUCATIONAL_DATA["bubble-sort"], isVerified: true, hasLocalSolution: true };
  }

  const cleanTitle = title || "Algorithmic Problem";
  return {
    isVerified: false,
    hasLocalSolution: false,
    title: cleanTitle,
    difficulty: "Medium",
    description: `Problem understanding and constraints for ${cleanTitle}. Gemini AI Mentor dynamically generates full pedagogical analysis, asymptotic bounds, and optimal solutions.`,
    unavailableReason: "Problem-specific optimal code is not available in the local knowledge engine yet. Generating optimal solution with Gemini AI Mentor...",
    acceptedCode: "// Requesting optimal solution from Gemini AI Mentor...",
    acceptedCodeByLang: null,
    buggyCode: "",
    buggyCodeByLang: null,
    timeComplexity: "—",
    spaceComplexity: "—",
    timeExplain: "Optimal algorithmic bounds analyzed by Gemini AI Mentor",
    spaceExplain: "Auxiliary space complexity analyzed by Gemini AI Mentor",
    bruteForceTitle: "Exhaustive / Brute-Force",
    bruteForceTime: "O(n²)",
    bruteForceSpace: "O(1)",
    bruteForceExplain: "Standard brute-force traversal evaluating all combinations.",
    optimalTitle: "Optimal Solution",
    optimalTime: "—",
    optimalSpace: "—",
    optimalExplain: "Optimal strategy with optimal invariant reduction.",
    mistakeTitle: "Algorithmic Analysis",
    mistakeDetail: "Analyze with Mentor to inspect execution flow, invariants, and edge cases.",
    mistakeFix: "Click Analyze with Mentor to review time and space complexity trade-offs.",
    takeaways: [
      "Gemini AI Mentor generates dynamic pedagogical analysis for all LeetCode problems.",
      "Optimal solutions include asymptotic time/space proofs, counterexamples, and interactive animatic traces."
    ],
    hints: [
      "Analyze with Mentor to generate progressive hints for this problem."
    ],
    dryRun: {
      headers: ["Step", "State", "Action"],
      rows: [
        ["1", "Initial", "Click Analyze with Mentor to generate step-by-step trace."]
      ]
    },
    animatic: {
      initialState: {
        array: [],
        highlightIndices: [],
        pointers: {},
        caption: "Click Analyze with Mentor to view animatic execution."
      },
      steps: [
        {
          lineIndex: 0,
          description: "Click Analyze with Mentor to view step-by-step animatic execution trace.",
          state: {
            array: [],
            highlightIndices: [],
            pointers: {},
            caption: "Execution trace available via Gemini AI Mentor."
          }
        }
      ]
    }
  };
}

let currentMentorProblem = null;
let currentMentorMode = "explain";
let currentMentorBuggyState = false;
let currentMentorPreviousView = "profile";
let currentMentorHintIndex = 0;

let animaticState = {
  currentStep: 0,
  isPlaying: false,
  timer: null,
  speed: 1,
  steps: [],
  nums: [2, 7, 11, 15],
  target: 9,
  type: "array-map"
};

function updateMentorLineNumbers() {
  const input = $("mentorCodeInput");
  const lineEl = $("mentorLineNumbers");
  const charEl = $("mentorCharCount");
  if (!input || !lineEl) return;
  const lines = input.value.split("\n").length;
  lineEl.textContent = Array.from({ length: lines }, (_, i) => i + 1).join("\n");
  if (charEl) {
    charEl.textContent = `${lines} ${lines === 1 ? 'line' : 'lines'} · ${input.value.length} chars`;
  }
}

function renderNormalModeAnalysis(data, isBuggy, analysisResult = null) {
  const status = currentMentorProblem?.status || (isBuggy ? "Wrong Answer" : "Accepted");
  const timeComplexityEl = $("mentorTimeComplexity");
  const spaceComplexityEl = $("mentorSpaceComplexity");
  const timeExplainEl = $("mentorTimeExplain");
  const spaceExplainEl = $("mentorSpaceExplain");
  const optimalCodeEl = $("mentorOptimalCode");
  const optimalTitleEl = $("mentorOptimalTitle");
  const takeawaysListEl = $("mentorTakeawaysList");
  const mistakeAlertEl = $("mentorMistakeAlert");
  const mistakeTitleEl = $("mentorMistakeTitle");
  const mistakeDetailEl = $("mentorMistakeDetail");
  const mistakeFixEl = $("mentorMistakeFix");
  const acceptedAlertEl = $("mentorAcceptedAlert");
  const acceptedTitleEl = $("mentorAcceptedTitle");
  const acceptedDetailEl = $("mentorAcceptedDetail");
  const acceptedFixEl = $("mentorAcceptedFix");
  const analysisHeadingEl = $("mentorAnalysisHeading");
  const analysisBodyEl = $("mentorAnalysisBody");
  const comparisonBodyEl = $("mentorComparisonTableBody");
  const providerBadgeEl = $("mentorProviderBadge");
  const configNoticeEl = $("mentorAiConfigNotice");
  const configTextEl = $("mentorAiConfigText");

  const selectedLang = $("mentorLangSelect")?.value || "python3";
  const langName = formatLang(selectedLang);

  // Update Provider Badge
  if (providerBadgeEl) {
    if (analysisResult) {
      const p = String(analysisResult.provider || "gemini").toLowerCase();
      if (p === "gemini") {
        providerBadgeEl.textContent = "Provider: Gemini AI Mentor";
        providerBadgeEl.className = "badge-provider provider-gemini";
      } else if (p === "openai") {
        providerBadgeEl.textContent = "Provider: OpenAI Live AI Mentor";
        providerBadgeEl.className = "badge-provider provider-openai";
      } else {
        providerBadgeEl.textContent = "Provider: Local Educational Knowledge Engine";
        providerBadgeEl.className = "badge-provider provider-local";
      }
    } else if (window._aiMentorConfigured || window._aiMentorProvider === "gemini") {
      providerBadgeEl.textContent = "Provider: Gemini AI Mentor (Configured)";
      providerBadgeEl.className = "badge-provider provider-gemini";
    } else if (data.hasLocalSolution !== false) {
      providerBadgeEl.textContent = "Provider: Local Educational Knowledge Engine";
      providerBadgeEl.className = "badge-provider provider-local";
    } else {
      providerBadgeEl.textContent = "Provider: Local Engine (Unverified Problem)";
      providerBadgeEl.className = "badge-provider provider-unverified";
    }
  }

  // Update AI Configuration Notice
  if (configNoticeEl) {
    const isFallback = Boolean(analysisResult && (analysisResult.provider === "local" || analysisResult.fallbackNotice));
    if (isFallback) {
      configNoticeEl.hidden = false;
      if (configTextEl) {
        configTextEl.innerHTML = analysisResult.fallbackNotice
          ? `<strong>Local Fallback Active:</strong> ${escapeHTML(analysisResult.fallbackNotice)}`
          : "Primary AI provider is temporarily unavailable. Running in Local Educational Knowledge Engine mode.";
      }
    } else if (analysisResult && (analysisResult.provider === "gemini" || analysisResult.provider === "openai")) {
      configNoticeEl.hidden = true;
    } else if (window._aiMentorConfigured) {
      configNoticeEl.hidden = true;
    } else if (!analysisResult) {
      configNoticeEl.hidden = true;
    }
  }

  // Complexity Values (Module 4 - Grounded, never blank dashes)
  const studentTime = analysisResult?.studentComplexity?.timeComplexity || analysisResult?.optimalComplexity?.timeComplexity;
  const derivedTime = studentTime || (data.hasLocalSolution !== false ? (data.timeComplexity || data.optimalTime || "O(n)") : "O(n)");
  const studentSpace = analysisResult?.studentComplexity?.spaceComplexity || analysisResult?.optimalComplexity?.spaceComplexity;
  const derivedSpace = studentSpace || (data.hasLocalSolution !== false ? (data.spaceComplexity || data.optimalSpace || "O(1)") : "O(1)");
  const derivedAux = analysisResult?.optimalComplexity?.auxiliarySpace || (data.hasLocalSolution !== false ? (data.auxiliarySpace || "O(1)") : "O(1)");
  const derivedTotal = analysisResult?.optimalComplexity?.totalSpace || (data.hasLocalSolution !== false ? (data.totalSpace || derivedTime) : derivedTime);

  if (timeComplexityEl) timeComplexityEl.textContent = derivedTime;
  if (spaceComplexityEl) spaceComplexityEl.textContent = derivedSpace;
  const auxEl = $("mentorAuxiliarySpace");
  const totalEl = $("mentorTotalSpace");
  if (auxEl) auxEl.textContent = derivedAux;
  if (totalEl) totalEl.textContent = derivedTotal;

  if (timeExplainEl) timeExplainEl.textContent = analysisResult?.complexityAnalysis?.timeDerivation || analysisResult?.studentComplexity?.explanation || analysisResult?.optimalComplexity?.timeExplanation || analysisResult?.optimalComplexity?.explanation || data.timeExplain || "Optimal algorithmic traversal";
  if (spaceExplainEl) spaceExplainEl.textContent = analysisResult?.complexityAnalysis?.spaceDerivation || analysisResult?.studentComplexity?.spaceExplanation || analysisResult?.optimalComplexity?.spaceExplanation || data.spaceExplain || "Auxiliary memory footprint";
  const auxExplainEl = $("mentorAuxiliaryExplain");
  const totalExplainEl = $("mentorTotalExplain");
  if (auxExplainEl) auxExplainEl.textContent = analysisResult?.optimalComplexity?.auxiliaryExplanation || "Memory allocated beyond input parameters";
  if (totalExplainEl) totalExplainEl.textContent = analysisResult?.optimalComplexity?.totalExplanation || "Combined memory footprint of input array and auxiliary tables";

  // Problem Understanding Card (Module 4)
  const whatItAsksEl = $("mentorProblemWhatItAsks");
  const inputOutputEl = $("mentorProblemInputOutput");
  const constraintsEl = $("mentorProblemConstraints");
  const keyObsEl = $("mentorProblemKeyObservation");

  if (whatItAsksEl) {
    whatItAsksEl.textContent = analysisResult?.problemUnderstanding?.whatItAsks || data.whatItAsks || data.description || "Determine optimal algorithmic transformation.";
  }
  if (inputOutputEl) {
    inputOutputEl.textContent = analysisResult?.problemUnderstanding?.inputOutput || data.inputOutput || "Standard LeetCode input array and target constraints.";
  }
  if (constraintsEl) {
    constraintsEl.textContent = analysisResult?.problemUnderstanding?.constraints || data.constraints || "1 <= N <= 10^5, fits in standard 32/64-bit integer limits.";
  }
  if (keyObsEl) {
    keyObsEl.textContent = analysisResult?.problemUnderstanding?.keyObservation || (Array.isArray(analysisResult?.coreObservations) && analysisResult.coreObservations[0]) || data.keyObservation || (Array.isArray(data.coreObservations) && data.coreObservations[0]) || "Invariants allow reducing search space or trading memory for linear speed.";
  }

  // Problem Description Context
  const contextDescEl = $("mentorProblemDescription");
  if (contextDescEl) {
    if (analysisResult?.problemDescription) {
      contextDescEl.textContent = analysisResult.problemDescription;
    } else if (data.description) {
      contextDescEl.textContent = data.description;
    }
  }

  // Multi-Tier Solutions (Module 4) - Optimal Solution Rendering
  const solOpt = analysisResult?.solutions?.optimal;
  const solBf = analysisResult?.solutions?.bruteForce;
  const solImp = analysisResult?.solutions?.improved;

  if (optimalCodeEl) {
    if (solOpt?.code) {
      optimalCodeEl.textContent = solOpt.code;
    } else if (analysisResult?.optimalCode) {
      optimalCodeEl.textContent = analysisResult.optimalCode;
    } else if (data.hasLocalSolution === false) {
      optimalCodeEl.textContent = data.unavailableReason || "Generating optimal solution with Gemini AI Mentor...";
    } else {
      const code = data.acceptedCodeByLang?.[selectedLang] || data.optimalCode || data.acceptedCode;
      optimalCodeEl.textContent = code;
    }
  }
  if (optimalTitleEl) {
    if (solOpt?.title) {
      optimalTitleEl.textContent = `${solOpt.title} (${langName})`;
    } else if (analysisResult?.optimalApproach?.title) {
      optimalTitleEl.textContent = `${analysisResult.optimalApproach.title} (${langName})`;
    } else if (data.hasLocalSolution === false && !analysisResult?.optimalCode) {
      optimalTitleEl.textContent = `Optimal Solution (Generating via Gemini...)`;
    } else {
      optimalTitleEl.textContent = `${data.optimalTitle || "Optimal Solution"} (${langName})`;
    }
  }
  const optTechBadge = $("mentorOptimalTechniqueBadge");
  const optTimeBadge = $("mentorOptimalTimeBadge");
  const optSpaceBadge = $("mentorOptimalSpaceBadge");
  const optInvariantsEl = $("mentorOptimalInvariants");
  if (optTechBadge) optTechBadge.textContent = solOpt?.approach || solOpt?.technique || "Two Pointers";
  if (optTimeBadge) optTimeBadge.textContent = `${solOpt?.timeComplexity || analysisResult?.optimalComplexity?.timeComplexity || data.optimalTime || "O(n)"} Time`;
  if (optSpaceBadge) optSpaceBadge.textContent = `${solOpt?.auxiliarySpace || solOpt?.spaceComplexity || analysisResult?.optimalComplexity?.auxiliarySpace || data.optimalSpace || "O(1)"} Aux Space`;
  if (optInvariantsEl) {
    const invText = solOpt?.correctnessProof || solOpt?.whyItWorks || solOpt?.keyInvariants || analysisResult?.optimalApproach?.whyItWorks || "Loop invariant guarantees problem properties are preserved across iterations.";
    optInvariantsEl.textContent = `Correctness Invariant: ${invText}`;
  }

  // Brute Force Baseline Card (Module 4)
  const bfTitleEl = $("mentorBruteForceTitle");
  const bfAlgoEl = $("mentorBruteForceAlgorithm");
  const bfCodeEl = $("mentorBruteForceCode");
  const bfTimeBadge = $("mentorBruteForceTimeBadge");
  const bfSpaceBadge = $("mentorBruteForceSpaceBadge");
  const bfTechBadge = $("mentorBruteForceTechniqueBadge");
  const bfLimitationsEl = $("mentorBruteForceLimitations");

  if (bfTitleEl) {
    bfTitleEl.textContent = solBf?.title || analysisResult?.bruteForce?.title
      ? `Brute Force Baseline (${solBf?.title || analysisResult.bruteForce.title})`
      : (data.bruteForceTitle ? `Brute Force Baseline (${data.bruteForceTitle})` : "Brute Force Baseline (Exhaustive Search)");
  }
  if (bfTechBadge) bfTechBadge.textContent = solBf?.approach || solBf?.technique || "Exhaustive";
  if (bfAlgoEl) {
    bfAlgoEl.textContent = solBf?.algorithm || solBf?.intuition || analysisResult?.bruteForce?.algorithm || analysisResult?.bruteForce?.explanation || data.bruteForceExplain || "Exhaustively checks every possibility with nested iterations, leading to high computational overhead.";
  }
  if (bfCodeEl) {
    const bfCode = solBf?.code || analysisResult?.bruteForce?.code || data.bruteForceCodeByLang?.[selectedLang] || data.bruteForceCode || data.buggyCodeByLang?.[selectedLang] || data.buggyCode || "// Brute force baseline simulation";
    bfCodeEl.textContent = bfCode;
  }
  if (bfTimeBadge) bfTimeBadge.textContent = `${solBf?.timeComplexity || analysisResult?.bruteForce?.timeComplexity || data.bruteForceTime || "O(n²)"} Time`;
  if (bfSpaceBadge) bfSpaceBadge.textContent = `${solBf?.spaceComplexity || solBf?.auxiliarySpace || analysisResult?.bruteForce?.spaceComplexity || data.bruteForceSpace || "O(1)"} Space`;
  if (bfLimitationsEl) {
    const limText = solBf?.limitations || solBf?.constraintBreakdown || solBf?.tradeOffs || "Exceeds runtime budget on large constraint boundaries (N >= 10^5).";
    bfLimitationsEl.textContent = `Limitations & Bottlenecks: ${limText}`;
  }

  // Improved / Intermediate Approach Card (Module 4)
  const impTitleEl = $("mentorImprovedTitle");
  const impAlgoEl = $("mentorImprovedAlgorithm");
  const impCodeEl = $("mentorImprovedCode");
  const impCodeWrapEl = $("mentorImprovedCodeWrap");
  const impUnavailableEl = $("mentorImprovedUnavailable");
  const impUnavailableReasonEl = $("mentorImprovedUnavailableReason");
  const impTradeoffEl = $("mentorImprovedTradeoff");
  const impTechBadge = $("mentorImprovedTechniqueBadge");
  const impTimeBadge = $("mentorImprovedTimeBadge");
  const impSpaceBadge = $("mentorImprovedSpaceBadge");

  if (impTitleEl) {
    impTitleEl.textContent = solImp?.title || (data.improvedTitle ? `Improved Approach (${data.improvedTitle})` : "Improved / Intermediate Approach");
  }
  if (impTechBadge) impTechBadge.textContent = solImp?.approach || solImp?.technique || "Intermediate";
  if (impTimeBadge) impTimeBadge.textContent = `${solImp?.timeComplexity || "O(n log n)"} Time`;
  if (impSpaceBadge) impSpaceBadge.textContent = `${solImp?.spaceComplexity || solImp?.auxiliarySpace || "O(n)"} Space`;
  if (impAlgoEl) {
    impAlgoEl.textContent = solImp?.algorithm || solImp?.intuition || "Intermediate algorithmic enhancement addressing brute force bottlenecks.";
  }

  const isImpUnavailable = Boolean(solImp?.unavailableReason || (!solImp?.code && solImp?.available === false));
  if (isImpUnavailable) {
    if (impUnavailableEl) impUnavailableEl.hidden = false;
    if (impUnavailableReasonEl) {
      impUnavailableReasonEl.textContent = solImp?.unavailableReason || "No intermediate approach between brute force baseline and optimal exists for this problem structure.";
    }
    if (impCodeWrapEl) impCodeWrapEl.hidden = true;
  } else {
    if (impUnavailableEl) impUnavailableEl.hidden = true;
    if (impCodeWrapEl) impCodeWrapEl.hidden = false;
    if (impCodeEl) {
      impCodeEl.textContent = solImp?.code || "// Intermediate solution code unavailable in selected language";
    }
  }
  if (impTradeoffEl) {
    const tradeoffText = solImp?.bottleneckRemoved
      ? `Bottleneck Removed: ${solImp.bottleneckRemoved}. ${solImp.tradeOffs || ""}`
      : (solImp?.tradeOffs || "");
    impTradeoffEl.textContent = tradeoffText;
  }

  // Approach Comparison Table (Module 4 - 4-Way Multi-Tier Matrix)
  if (comparisonBodyEl) {
    if (Array.isArray(analysisResult?.solutionComparison) && analysisResult.solutionComparison.length) {
      comparisonBodyEl.innerHTML = analysisResult.solutionComparison.map(row => {
        const prop = row.property || row.dimension || "Metric";
        const isOptRow = row.student === row.optimal;
        return `
          <tr>
            <td><strong>${escapeHTML(prop)}</strong></td>
            <td>${escapeHTML(row.bruteForce || "—")}</td>
            <td>${escapeHTML(row.improved || "N/A")}</td>
            <td class="highlight-cell">${escapeHTML(row.optimal || "—")}</td>
            <td class="${isOptRow ? "highlight-cell" : ""}">${escapeHTML(row.student || "—")}</td>
          </tr>
        `;
      }).join("");
    } else {
      const intuitionBf = solBf?.intuition || analysisResult?.bruteForce?.algorithm || data.bruteForceExplain || "Exhaustively check all combinations with nested loops.";
      const intuitionImp = solImp?.intuition || "Binary Search / Dynamic Buffer optimization.";
      const intuitionOpt = solOpt?.intuition || analysisResult?.optimalApproach?.whyItWorks || data.optimalExplain || "Eliminate redundant computations with optimal invariants.";
      const intuitionStudent = analysisResult?.studentComparison?.matchesApproach || "Submitted Implementation";

      const timeBf = solBf?.timeComplexity || analysisResult?.bruteForce?.timeComplexity || data.bruteForceTime || "O(n²)";
      const timeImp = solImp?.timeComplexity || "O(n log n)";
      const timeOpt = solOpt?.timeComplexity || analysisResult?.optimalComplexity?.timeComplexity || data.optimalTime || "O(n)";
      const timeStudent = analysisResult?.studentComparison?.studentTime || derivedTime || "O(n)";

      const spaceBf = solBf?.auxiliarySpace || solBf?.spaceComplexity || analysisResult?.bruteForce?.spaceComplexity || data.bruteForceSpace || "O(1)";
      const spaceImp = solImp?.auxiliarySpace || solImp?.spaceComplexity || "O(n)";
      const spaceOpt = solOpt?.auxiliarySpace || solOpt?.spaceComplexity || analysisResult?.optimalComplexity?.auxiliarySpace || "O(1)";
      const spaceStudent = analysisResult?.studentComparison?.studentSpace || derivedSpace || "O(1)";

      comparisonBodyEl.innerHTML = `
        <tr>
          <td><strong>Intuition &amp; Invariant</strong></td>
          <td>${escapeHTML(intuitionBf)}</td>
          <td>${escapeHTML(intuitionImp)}</td>
          <td class="highlight-cell">${escapeHTML(intuitionOpt)}</td>
          <td>${escapeHTML(intuitionStudent)}</td>
        </tr>
        <tr>
          <td><strong>Time Complexity</strong></td>
          <td><code>${escapeHTML(timeBf)}</code></td>
          <td><code>${escapeHTML(timeImp)}</code></td>
          <td class="highlight-cell"><code>${escapeHTML(timeOpt)}</code></td>
          <td class="${timeStudent === timeOpt ? "highlight-cell" : ""}"><code>${escapeHTML(timeStudent)}</code></td>
        </tr>
        <tr>
          <td><strong>Auxiliary Space</strong></td>
          <td><code>${escapeHTML(spaceBf)}</code></td>
          <td><code>${escapeHTML(spaceImp)}</code></td>
          <td class="highlight-cell"><code>${escapeHTML(spaceOpt)}</code></td>
          <td class="${spaceStudent === spaceOpt ? "highlight-cell" : ""}"><code>${escapeHTML(spaceStudent)}</code></td>
        </tr>
      `;
    }
  }

  // Edge Cases Table (Module 4 & 5)
  const edgeCasesTbody = $("mentorEdgeCasesTableBody");
  if (edgeCasesTbody) {
    let cases = (Array.isArray(analysisResult?.edgeCases) && analysisResult.edgeCases.length)
      ? analysisResult.edgeCases
      : (Array.isArray(data.edgeCases) && data.edgeCases.length ? data.edgeCases : null);

    if (!cases) {
      const isStringProblem = Boolean(
        (data.topics && data.topics.includes("String")) ||
        (data.slug && (data.slug.includes("subsequence") || data.slug.includes("string") || data.slug.includes("parentheses")))
      );
      if (isStringProblem) {
        cases = [
          { caseName: "Empty s (Empty Subsequence)", input: 's = "", t = "abc"', expected: "true", explanation: "An empty string is trivially a valid subsequence of any target string.", handledBy: "Loop condition / count comparison" },
          { caseName: "Empty t with Non-Empty s", input: 's = "abc", t = ""', expected: "false", explanation: "A non-empty string cannot be formed from an empty target string.", handledBy: "Loop boundary check" },
          { caseName: "Order-Preserved Subsequence", input: 's = "abc", t = "ahbgdc"', expected: "true", explanation: "Characters 'a', 'b', 'c' appear in matching relative order.", handledBy: "Two-pointer forward traversal" },
          { caseName: "Missing / Mismatched Character", input: 's = "axc", t = "ahbgdc"', expected: "false", explanation: "Character 'x' is not present in t.", handledBy: "Pointer exhaust" },
          { caseName: "Repeated Characters with Order Constraint", input: 's = "aaaa", t = "bbaaa"', expected: "false", explanation: "Only three 'a' characters exist in t, so four cannot be matched.", handledBy: "Match count verification" }
        ];
      } else {
        cases = [
          { caseName: "Minimal Scale Input", input: "Minimal constraints", expected: "Base case result", explanation: "Boundary checks", handledBy: "Guard clause" },
          { caseName: "Large Scale Limits", input: "10^5 elements", expected: "Under execution budget", explanation: "Linear or sublinear runtime", handledBy: "Optimal algorithm" }
        ];
      }
    }
    edgeCasesTbody.innerHTML = cases.map(c => `
      <tr>
        <td><strong>${escapeHTML(c.caseName || c.title || "Edge Case")}</strong></td>
        <td><code>${escapeHTML(c.input || "—")}</code></td>
        <td><code>${escapeHTML(c.expected || "Valid")}</code></td>
        <td>${escapeHTML(c.explanation || c.handledBy || "Maintains algorithmic invariants.")}</td>
      </tr>
    `).join("");
  }

  // Live Variable Watch Table (Module 3 & 5)
  const trackVarsTbody = $("mentorTrackVarsTbody");
  const trackVarsCard = $("mentorTrackVariablesCard");
  if (trackVarsTbody) {
    if (trackVarsCard) trackVarsCard.hidden = false;
    let varSteps = [];
    if (Array.isArray(analysisResult?.variableAnalysis) && analysisResult.variableAnalysis.length) {
      varSteps = analysisResult.variableAnalysis.map(v => ({
        step: v.name,
        vars: `${v.type || "var"} (Init: ${v.initialValue || "0"})`,
        evaluation: v.purpose || v.role || "Tracks state",
        memory: v.role === "pointer" ? "O(1) scalar pointer" : v.role === "counter" ? "O(1) stack counter" : "Stack variable"
      }));
    } else if (Array.isArray(analysisResult?.variableTracking?.steps) && analysisResult.variableTracking.steps.length) {
      varSteps = analysisResult.variableTracking.steps;
    } else if (Array.isArray(data.variableTracking?.steps)) {
      varSteps = data.variableTracking.steps;
    } else {
      varSteps = [
        { step: "Init", vars: "pointers = 0, state = ready", evaluation: "Pre-loop invariant verified", memory: "Stack variables initialized" },
        { step: "Iteration 1", vars: "curr = element[0], memo = updated", evaluation: "Condition evaluated true", memory: "Heap state mutated" },
        { step: "Final", vars: "return = target_result", evaluation: "Algorithm converged", memory: "Garbage collection ready" }
      ];
    }
    trackVarsTbody.innerHTML = varSteps.map(s => `
      <tr>
        <td><strong>${escapeHTML(String(s.step || s.stepNumber || "Step"))}</strong></td>
        <td><code>${escapeHTML(s.vars || s.variableState || "—")}</code></td>
        <td>${escapeHTML(s.evaluation || s.action || "Evaluated")}</td>
        <td>${escapeHTML(s.memory || s.memoryImpact || "O(1) stack allocation")}</td>
      </tr>
    `).join("");
  }

  // Takeaways
  if (takeawaysListEl) {
    const takeaways = (Array.isArray(analysisResult?.keyTakeaways) && analysisResult.keyTakeaways.length)
      ? analysisResult.keyTakeaways
      : ((Array.isArray(analysisResult?.takeaways) && analysisResult.takeaways.length)
        ? analysisResult.takeaways
        : (Array.isArray(data.keyTakeaways) && data.keyTakeaways.length
          ? data.keyTakeaways
          : (Array.isArray(data.takeaways) ? data.takeaways : [])));
    if (takeaways.length) {
      takeawaysListEl.innerHTML = takeaways.map(t => `<li><span class="takeaway-bullet">&#10003;</span> ${escapeHTML(t)}</li>`).join("");
    }
  }

  const codeVal = $("mentorCodeInput")?.value?.trim() || "";
  const sourceBadgeText = $("mentorCodeSourceBadge")?.textContent || "";
  const hasRealSource = Boolean(codeVal && !sourceBadgeText.includes("Unavailable"));

  // Verdict Handling: Accepted vs Flawed
  const isAccepted = status === "Accepted" && !isBuggy;
  const isTLE = status === "Time Limit Exceeded" || status === "TLE" || currentMentorMode === "tle";
  const isRuntimeError = status === "Runtime Error" || currentMentorMode === "runtime-error";
  const isCompileError = status === "Compilation Error" || currentMentorMode === "compilation-error";

  if (isAccepted) {
    // DO NOT display mistake alerts for Accepted submissions!
    if (mistakeAlertEl) mistakeAlertEl.hidden = true;
    if (acceptedAlertEl) {
      acceptedAlertEl.hidden = false;
      if (acceptedTitleEl) acceptedTitleEl.textContent = "Solution Accepted on LeetCode";
      if (acceptedDetailEl) acceptedDetailEl.textContent = "Your solution was Accepted by LeetCode and passed all test cases! No runtime errors or logic bugs detected.";
      if (acceptedFixEl) {
        if (data.hasLocalSolution === false && !analysisResult) {
          acceptedFixEl.innerHTML = "<strong>Performance Analysis:</strong> Your algorithm is correct. Generating deep algorithmic trade-off analysis with Gemini AI Mentor.";
        } else {
          const sTime = analysisResult?.studentComplexity?.timeComplexity || data.timeComplexity || "O(n)";
          const oTime = analysisResult?.optimalComplexity?.timeComplexity || data.optimalTime || sTime;
          const sSpace = analysisResult?.studentComplexity?.spaceComplexity || data.spaceComplexity || "O(1)";
          const oSpace = analysisResult?.optimalComplexity?.spaceComplexity || data.optimalSpace || sSpace;
          const recText = analysisResult?.codeComparison?.pedagogicalRecommendation ? ` ${escapeHTML(analysisResult.codeComparison.pedagogicalRecommendation)}` : "";
          if (sTime === oTime && sSpace === oSpace) {
            acceptedFixEl.innerHTML = `<strong>Performance Analysis:</strong> Your solution is logically correct and achieves optimal asymptotic bounds (<strong>${escapeHTML(sTime)}</strong> time, <strong>${escapeHTML(sSpace)}</strong> auxiliary space). Compare with the canonical <strong>${escapeHTML(analysisResult?.optimalApproach?.title || data.optimalTitle || "Optimal Solution")}</strong> below for cleaner reference formatting.${recText}`;
          } else {
            acceptedFixEl.innerHTML = `<strong>Performance Analysis:</strong> Your solution is logically correct. Compare with the <strong>${escapeHTML(analysisResult?.optimalApproach?.title || data.optimalTitle || "Optimal Solution")}</strong> below (time: <strong>${escapeHTML(oTime)}</strong>, space: <strong>${escapeHTML(oSpace)}</strong>).${recText}`;
          }
        }
      }
    }
  } else {
    // Non-accepted submission: display diagnostic card
    if (acceptedAlertEl) acceptedAlertEl.hidden = true;
    if (mistakeAlertEl) {
      mistakeAlertEl.hidden = false;
      if (isTLE) {
        if (mistakeTitleEl) mistakeTitleEl.textContent = "Time Limit Exceeded: Bottleneck Identified";
        if (mistakeDetailEl) mistakeDetailEl.textContent = `The solution exceeded the allowable LeetCode execution time budget. Large inputs timed out.`;
        if (mistakeFixEl) mistakeFixEl.innerHTML = `<strong>Optimization roadmap:</strong> ${escapeHTML(data.mistakeFix || "Eliminate nested loops or redundant states to lower asymptotic complexity.")}`;
      } else if (isRuntimeError) {
        if (hasRealSource) {
          if (mistakeTitleEl) mistakeTitleEl.textContent = analysisResult?.mistakeDiagnosis?.title || "Runtime Error: Unhandled Exception Detected";
          if (mistakeDetailEl) mistakeDetailEl.textContent = analysisResult?.mistakeDiagnosis?.explanation || "An unhandled exception occurred during execution. Review array indexing, null pointers, or recursion depth.";
          if (mistakeFixEl) mistakeFixEl.innerHTML = `<strong>Defensive correction:</strong> ${escapeHTML(analysisResult?.mistakeDiagnosis?.suggestion || "Add input boundary validation guards before indexing.")}`;
        } else {
          if (mistakeTitleEl) mistakeTitleEl.textContent = "LeetCode Verdict: Runtime Error (Original Source Unavailable)";
          if (mistakeDetailEl) mistakeDetailEl.textContent = "LeetCode reported a Runtime Error verdict for this submission. The exact runtime exception cannot be inspected because the original submitted code is not synchronized in the database.";
          if (mistakeFixEl) mistakeFixEl.innerHTML = "<strong>Next step:</strong> Paste your submitted code in the editor above and click <em>Analyze Code with AI</em> for deep root-cause diagnosis.";
        }
      } else if (isCompileError) {
        if (mistakeTitleEl) mistakeTitleEl.textContent = "Compilation Error: Syntax / Type Issue Detected";
        if (mistakeDetailEl) mistakeDetailEl.textContent = "The code failed to compile. Method signature, return type, or syntax rules were not satisfied.";
        if (mistakeFixEl) mistakeFixEl.innerHTML = "<strong>Correction:</strong> Verify method signature and imports match the required LeetCode specification.";
      } else {
        if (mistakeTitleEl) mistakeTitleEl.textContent = analysisResult?.mistakeDiagnosis?.title || data.mistakeTitle || "Mistake Detected: Logic / Boundary Bug";
        if (mistakeDetailEl) mistakeDetailEl.textContent = analysisResult?.mistakeDiagnosis?.explanation || data.mistakeDetail || "The code fails on edge cases or produces incorrect outputs for certain inputs.";
        if (mistakeFixEl) mistakeFixEl.innerHTML = `<strong>Recommended fix:</strong> ${escapeHTML(analysisResult?.mistakeDiagnosis?.suggestion || data.mistakeFix || "Correct algorithm invariants and retest.")}`;
      }
    }
  }

  // Progressive Hints rendering
  const hintCard = $("mentorHintCard");
  if (hintCard) {
    if (currentMentorMode === "hint" && Array.isArray(data.hints) && data.hints.length) {
      hintCard.hidden = false;
      const hintTitle = $("mentorHintLevelTitle");
      const hintText = $("mentorHintText");
      if (hintTitle) hintTitle.textContent = `Hint ${currentMentorHintIndex + 1} of ${data.hints.length}: Guidance`;
      if (hintText) hintText.textContent = data.hints[currentMentorHintIndex];
    } else {
      hintCard.hidden = true;
    }
  }

  // Dry Run Trace rendering
  const dryRunCard = $("mentorDryRunCard");
  if (dryRunCard) {
    if (currentMentorMode === "dry-run" && data.dryRun) {
      dryRunCard.hidden = false;
      const thead = $("mentorDryRunThead");
      const tbody = $("mentorDryRunTbody");
      if (thead && Array.isArray(data.dryRun.headers)) {
        thead.innerHTML = `<tr>${data.dryRun.headers.map(h => `<th>${escapeHTML(h)}</th>`).join("")}</tr>`;
      }
      if (tbody && Array.isArray(data.dryRun.rows)) {
        tbody.innerHTML = data.dryRun.rows.map(r => `<tr>${r.map(c => `<td><code>${escapeHTML(String(c))}</code></td>`).join("")}</tr>`).join("");
      }
    } else {
      dryRunCard.hidden = true;
    }
  }

  // Structured Analysis or Mode-Specific Guidance
  if (analysisResult && (analysisResult.summary || (Array.isArray(analysisResult.sections) && analysisResult.sections.length) || analysisResult.coreObservations || analysisResult.correctnessReasoning)) {
    if (analysisHeadingEl) analysisHeadingEl.textContent = "AI Code Review Analysis";
    if (analysisBodyEl) {
      let html = "";
      if (analysisResult.summary) {
        html += `<p><strong>Summary:</strong> ${escapeHTML(analysisResult.summary)}</p>`;
      }
      if (analysisResult.sourceUnderstanding) {
        html += `<p style="margin-top:8px;"><strong>Source Understanding:</strong> ${escapeHTML(analysisResult.sourceUnderstanding)}</p>`;
      }
      if (analysisResult.studentApproach) {
        html += `<p style="margin-top:8px;"><strong>Student Approach:</strong> ${escapeHTML(analysisResult.studentApproach)}</p>`;
      }
      if (Array.isArray(analysisResult.coreObservations) && analysisResult.coreObservations.length) {
        html += `<div style="margin-top:12px;"><h4>Core Algorithmic Observations</h4><ul>` +
          analysisResult.coreObservations.map(o => `<li>${escapeHTML(o)}</li>`).join("") +
          `</ul></div>`;
      }
      if (Array.isArray(analysisResult.lineByLineExplanation) && analysisResult.lineByLineExplanation.length) {
        html += `<div style="margin-top:14px;"><h4>Line-by-Line Code Walkthrough</h4>`;
        html += `<div class="mentor-table-wrapper"><table class="mentor-comparison-table"><thead><tr><th style="width:70px;">Line</th><th style="width:240px;">Code Statement</th><th>Pedagogical Explanation</th></tr></thead><tbody>`;
        html += analysisResult.lineByLineExplanation.map(w => `
          <tr>
            <td><code>L${escapeHTML(String(w.line))}</code></td>
            <td><code>${escapeHTML(w.code)}</code></td>
            <td>${escapeHTML(w.explanation)}</td>
          </tr>
        `).join("");
        html += `</tbody></table></div></div>`;
      }
      if (Array.isArray(analysisResult.evidenceBasedFindings) && analysisResult.evidenceBasedFindings.length) {
        html += `<div style="margin-top:14px;"><h4>Evidence-Based Code Findings</h4>`;
        html += analysisResult.evidenceBasedFindings.map(f => `
          <div style="margin-top:8px; padding:10px; border-left:3px solid ${f.severity === 'critical' ? '#ef4444' : f.severity === 'warning' ? '#f59e0b' : '#3b82f6'}; background:rgba(255,255,255,0.03); border-radius:4px;">
            <p><strong>[${escapeHTML((f.severity || 'info').toUpperCase())}] ${escapeHTML(f.title)}</strong> (Line ${escapeHTML(String(f.line || 'General'))})</p>
            <p style="margin-top:4px;">${escapeHTML(f.explanation)}</p>
            <p style="margin-top:4px; font-size:0.85em; opacity:0.85;"><strong>Evidence:</strong> ${escapeHTML(f.evidence || 'Verified in source')}</p>
          </div>
        `).join("");
        html += `</div>`;
      }
      if (analysisResult.codeProblemConsistency) {
        const c = analysisResult.codeProblemConsistency;
        html += `<div style="margin-top:14px;"><h4>Code-to-Problem Consistency</h4>`;
        html += `<p><strong>Consistency Status:</strong> ${c.isConsistent ? 'Verified Consistent &#10003;' : 'Specification Inconsistency Flagged &#9888;'}</p>`;
        if (Array.isArray(c.issues) && c.issues.length) {
          html += `<ul>${c.issues.map(iss => `<li><strong>${escapeHTML(iss.type)}:</strong> ${escapeHTML(iss.message)}</li>`).join("")}</ul>`;
        }
        html += `</div>`;
      }
      if (analysisResult.correctnessReasoning) {
        const cr = analysisResult.correctnessReasoning;
        html += `<div style="margin-top:12px;"><h4>Correctness &amp; Invariant Reasoning</h4>`;
        if (cr.proofSketch) html += `<p>${escapeHTML(cr.proofSketch)}</p>`;
        if (Array.isArray(cr.invariants) && cr.invariants.length) {
          html += `<ul>${cr.invariants.map(inv => `<li><code>${escapeHTML(inv)}</code></li>`).join("")}</ul>`;
        }
        html += `</div>`;
      }
      if (analysisResult.improvedApproach) {
        const imp = analysisResult.improvedApproach;
        html += `<div style="margin-top:12px;"><h4>Improved / Intermediate Approach: ${escapeHTML(imp.title || "Alternative Strategy")}</h4>`;
        if (imp.intuition) html += `<p><strong>Intuition:</strong> ${escapeHTML(imp.intuition)}</p>`;
        if (imp.algorithm) html += `<p><strong>Algorithm:</strong> ${escapeHTML(imp.algorithm)}</p>`;
        if (imp.timeComplexity || imp.spaceComplexity) {
          html += `<p><strong>Complexity:</strong> <code>${escapeHTML(imp.timeComplexity || "")}</code> time, <code>${escapeHTML(imp.spaceComplexity || "")}</code> space</p>`;
        }
        if (imp.tradeOff) html += `<p><strong>Trade-Off:</strong> ${escapeHTML(imp.tradeOff)}</p>`;
        html += `</div>`;
      }
      if (analysisResult.codeComparison) {
        const cc = analysisResult.codeComparison;
        html += `<div style="margin-top:12px;"><h4>Code Comparison &amp; Paradigm Analysis</h4>`;
        if (cc.asymptoticEquivalence !== undefined) {
          html += `<p><strong>Asymptotically Equivalent:</strong> ${cc.asymptoticEquivalence ? "Yes (Matches Canonical Class)" : "No (Asymptotic Gap Exists)"}</p>`;
        }
        if (Array.isArray(cc.similarities) && cc.similarities.length) {
          html += `<p style="margin-top:4px;"><strong>Algorithmic Similarities:</strong></p><ul>${cc.similarities.map(s => `<li>${escapeHTML(s)}</li>`).join("")}</ul>`;
        }
        if (Array.isArray(cc.differences) && cc.differences.length) {
          html += `<p style="margin-top:4px;"><strong>Key Differences:</strong></p><ul>${cc.differences.map(d => `<li>${escapeHTML(d)}</li>`).join("")}</ul>`;
        }
        if (cc.pedagogicalRecommendation) {
          html += `<p style="margin-top:4px;"><strong>Pedagogical Advice:</strong> ${escapeHTML(cc.pedagogicalRecommendation)}</p>`;
        }
        html += `</div>`;
      }
      if (Array.isArray(analysisResult.sections) && analysisResult.sections.length) {
        const handledIds = new Set([
          "summary", "core-observations", "improved-approach", "correctness-reasoning",
          "line-by-line-walkthrough", "variable-analysis", "control-flow-analysis", "code-consistency", "evidence-findings"
        ]);
        const remainingSections = analysisResult.sections.filter(s => !handledIds.has(s.id));
        if (remainingSections.length) {
          html += remainingSections.map(s => `<div style="margin-top:12px;"><h4>${escapeHTML(s.title)}</h4><p>${escapeHTML(s.content)}</p></div>`).join("");
        }
      }
      analysisBodyEl.innerHTML = html;
    }
  } else {
    const modeTitles = {
      explain: "Deep Code Review & Logic Explanation",
      mistake: "Mistake Diagnosis & Bug Resolution",
      complexity: "Asymptotic Complexity & Memory Footprint",
      optimize: "Optimization Roadmap & Efficiency Gains",
      "dry-run": "Step-by-Step Execution Trace",
      teach: "Core DSA Concept Breakdown",
      hint: "Progressive Conceptual Hint"
    };
    if (analysisHeadingEl) analysisHeadingEl.textContent = modeTitles[currentMentorMode] || "Algorithm Analysis & Logic";

    if (analysisBodyEl) {
      if (currentMentorMode === "mistake") {
        if (isAccepted) {
          analysisBodyEl.innerHTML = `
            <p><strong>Code Quality: Valid & Accepted &#10003;</strong></p>
            <p>Your submitted code satisfies all test cases on LeetCode without runtime errors or logical flaws.</p>
            <p>To deepen your DSA mastery, examine the <strong>Optimize Code</strong> section to compare asymptotic tradeoffs.</p>
          `;
        } else if (isRuntimeError && !hasRealSource) {
          analysisBodyEl.innerHTML = `
            <p><strong>LeetCode Verdict: Runtime Error (Original Source Unavailable)</strong></p>
            <p>LeetCode recorded a Runtime Error verdict on this submission. Because your original code is not available in the database, the specific failing statement cannot be pointed out.</p>
            <p><strong>Recommendation:</strong> Paste your code into the editor above and click <em>Analyze Code with AI</em> for a line-by-line inspection.</p>
          `;
        } else {
          analysisBodyEl.innerHTML = `
            <p><strong>Identified Flaw:</strong> ${escapeHTML(analysisResult?.mistakeDiagnosis?.title || data.mistakeTitle || 'Algorithmic inconsistency')}</p>
            <p>${escapeHTML(analysisResult?.mistakeDiagnosis?.explanation || data.mistakeDetail || 'Review edge cases and invariants.')}</p>
            <p><strong>Correction:</strong> ${escapeHTML(analysisResult?.mistakeDiagnosis?.suggestion || data.mistakeFix || 'Apply optimal boundary checks.')}</p>
          `;
        }
      } else if (currentMentorMode === "complexity") {
        analysisBodyEl.innerHTML = `
          <p><strong>Time Complexity: ${data.timeComplexity}</strong> &mdash; ${escapeHTML(data.timeExplain || '')}.</p>
          <p><strong>Space Complexity: ${data.spaceComplexity}</strong> &mdash; ${escapeHTML(data.spaceExplain || '')}.</p>
          <p>Trading memory for speed often converts quadratic O(n²) bottlenecks into linear O(n) efficiency.</p>
        `;
      } else if (currentMentorMode === "teach") {
        analysisBodyEl.innerHTML = `
          <p><strong>Core Concept:</strong> ${escapeHTML(data.optimalTitle || 'Algorithmic Invariant')}</p>
          <p>${escapeHTML(data.optimalExplain || 'Preserve state efficiently across iterations.')}</p>
          <p><strong>Key Principle:</strong> ${escapeHTML(data.takeaways?.[0] || 'Observe invariant guarantees.')}</p>
        `;
      } else if (currentMentorMode === "optimize") {
        analysisBodyEl.innerHTML = `
          <p><strong>Current Approach:</strong> ${escapeHTML(data.bruteForceTitle || 'Exhaustive Search')} (${escapeHTML(data.bruteForceTime || 'O(n²)')})</p>
          <p><strong>Optimal Target:</strong> ${escapeHTML(data.optimalTitle || 'Optimal Approach')} (${escapeHTML(data.optimalTime || data.timeComplexity || 'O(n)')})</p>
          <p>Review the full executable code in the <strong>Optimal Solution</strong> panel below.</p>
        `;
      } else if (currentMentorMode === "hint") {
        analysisBodyEl.innerHTML = `
          <p>Use the <strong>Next Hint</strong> button above to reveal progressive conceptual hints step-by-step.</p>
        `;
      } else if (currentMentorMode === "dry-run") {
        analysisBodyEl.innerHTML = `
          <p>Review the step-by-step dry run trace table above to observe variable state transitions at each iteration.</p>
        `;
      } else {
        analysisBodyEl.innerHTML = `
          <p><strong>Brute Force:</strong> ${escapeHTML(data.bruteForceExplain || 'Naive search checks all permutations.')}</p>
          <p><strong>Optimal Solution:</strong> ${escapeHTML(data.optimalExplain || 'Optimal approach balances operations and storage.')}</p>
          <p>This avoids redundant computations, lowering execution time to <code>${escapeHTML(data.timeComplexity)}</code>.</p>
        `;
      }
    }
  }
}

function switchMentorLearningTab(tabName) {
  const normalBtn = $("mentorModeNormalBtn");
  const animaticBtn = $("mentorModeAnimaticBtn");
  const normalWorkspace = $("mentorNormalWorkspace");
  const animaticWorkspace = $("mentorAnimaticWorkspace");

  if (tabName === "animatic") {
    if (normalBtn) { normalBtn.classList.remove("active"); normalBtn.setAttribute("aria-selected", "false"); }
    if (animaticBtn) { animaticBtn.classList.add("active"); animaticBtn.setAttribute("aria-selected", "true"); }
    if (normalWorkspace) normalWorkspace.hidden = true;
    if (animaticWorkspace) animaticWorkspace.hidden = false;
    renderAnimaticStep(animaticState.currentStep);
  } else {
    stopAnimaticPlayback();
    if (normalBtn) { normalBtn.classList.add("active"); normalBtn.setAttribute("aria-selected", "true"); }
    if (animaticBtn) { animaticBtn.classList.remove("active"); animaticBtn.setAttribute("aria-selected", "false"); }
    if (normalWorkspace) normalWorkspace.hidden = false;
    if (animaticWorkspace) animaticWorkspace.hidden = true;
  }
}

function setupAnimaticMode(animaticData) {
  stopAnimaticPlayback();
  animaticState.steps = animaticData.steps || [];
  animaticState.nums = animaticData.nums || [2, 7, 11, 15];
  animaticState.target = animaticData.target !== undefined ? animaticData.target : 9;
  animaticState.type = animaticData.type || "array-map";
  animaticState.code = animaticData.code || "";
  animaticState.currentStep = 0;
  animaticState.speed = 1;

  const targetBadge = $("animaticTargetBadge");
  if (targetBadge) {
    targetBadge.textContent = animaticState.target !== null ? `Target: ${animaticState.target}` : "Algorithm Stepper";
  }

  const algoBadge = $("animaticAlgorithmBadge");
  if (algoBadge) {
    const typeNames = {
      "cycle-detection": "Floyd's Tortoise & Hare",
      "pillars": "Pillars / Height Leveling",
      "binary-search": "Binary Search Bisect",
      "dual-pointer": "Two Pointers Greedy",
      "sliding-window": "Sliding Window Frame",
      "linked-list": "Linked List Pointer Hop",
      "dp-table": "DP Memoization Grid",
      "array-map": "Hash Map Fast Lookup"
    };
    algoBadge.textContent = typeNames[animaticState.type] || "Algorithmic Trace";
  }

  renderAnimaticStep(0);
}

function renderAnimaticStep(stepIndex) {
  if (!animaticState.steps || animaticState.steps.length === 0) return;
  const safeIndex = Math.max(0, Math.min(stepIndex, animaticState.steps.length - 1));
  animaticState.currentStep = safeIndex;
  const step = animaticState.steps[safeIndex];

  // Audio effect trigger based on step event
  if (step.reaction === "match") soundFX.match();
  else if (step.reaction === "swap") soundFX.swap();
  else if (step.reaction === "optimal") soundFX.complete();
  else if (step.reaction === "mistake") soundFX.mistake();
  else if (step.slow !== undefined || step.left !== undefined) soundFX.pointer();
  else soundFX.step();

  // Scrubber & Counter
  const total = animaticState.steps.length;
  const counterEl = $("animaticStepCounter");
  const titleEl = $("animaticStepTitle");
  const barEl = $("animaticProgressBar");

  if (counterEl) counterEl.textContent = `Step ${safeIndex + 1} of ${total}`;
  if (titleEl) titleEl.textContent = step.action || "Examine array elements";
  if (barEl) barEl.style.width = `${((safeIndex + 1) / total) * 100}%`;

  // Playback buttons state
  const firstBtn = $("animaticFirstBtn");
  const prevBtn = $("animaticPrevBtn");
  const nextBtn = $("animaticNextBtn");
  const lastBtn = $("animaticLastBtn");

  if (firstBtn) firstBtn.disabled = safeIndex === 0;
  if (prevBtn) prevBtn.disabled = safeIndex === 0;
  if (nextBtn) nextBtn.disabled = safeIndex === total - 1;
  if (lastBtn) lastBtn.disabled = safeIndex === total - 1;

  // Speech bubble & Narration
  const speechEl = $("animaticMentorSpeech");
  const narrationHeading = $("animaticNarrationHeading");
  const narrationBody = $("animaticNarrationBody");
  const formulaEl = $("animaticFormula");

  if (speechEl) speechEl.textContent = `"${step.speech || step.action}"`;
  if (narrationHeading) narrationHeading.textContent = `Step ${safeIndex + 1}: ${step.action}`;
  if (narrationBody) narrationBody.textContent = step.speech || step.action;
  if (formulaEl) formulaEl.textContent = step.formula || "Evaluating step condition...";

  // Stage container visibility
  const winContainer = $("animaticWindowContainer");
  const llContainer = $("animaticLinkedListContainer");
  const dpContainer = $("animaticDpContainer");
  const pillarsContainer = $("animaticPillarsContainer");

  if (winContainer) winContainer.hidden = animaticState.type !== "sliding-window";
  if (llContainer) llContainer.hidden = animaticState.type !== "linked-list";
  if (dpContainer) dpContainer.hidden = animaticState.type !== "dp-table";
  if (pillarsContainer) pillarsContainer.hidden = animaticState.type !== "pillars";

  // Sliding window stats
  if (animaticState.type === "sliding-window") {
    const wL = step.windowLeft !== undefined ? step.windowLeft : (step.left || 0);
    const wR = step.windowRight !== undefined ? step.windowRight : (step.right !== undefined ? step.right : (step.pointer || 0));
    if ($("animaticWinL")) $("animaticWinL").textContent = wL;
    if ($("animaticWinR")) $("animaticWinR").textContent = wR;
    if ($("animaticWinVal")) $("animaticWinVal").textContent = step.windowSum || step.currentVal || (wR - wL + 1);
  }

  // Linked list stage
  if (animaticState.type === "linked-list" && $("animaticLinkedListRow")) {
    const activeNodeIdx = step.pointer !== undefined ? step.pointer : step.slow;
    $("animaticLinkedListRow").innerHTML = animaticState.nums.map((num, idx) => `
      <div class="animatic-ll-node ${idx === activeNodeIdx ? 'active-node' : ''}">
        <span>[${idx}]</span> <strong>${num}</strong>
      </div>
      ${idx < animaticState.nums.length - 1 ? '<span class="animatic-ll-arrow">&rarr;</span>' : '<span class="animatic-ll-arrow">&rarr; null</span>'}
    `).join("");
  }

  // DP table stage
  if (animaticState.type === "dp-table" && $("animaticDpGrid")) {
    const dpCells = animaticState.nums || [0, 1, 1, 2, 3, 5];
    const currCellIdx = step.pointer !== undefined ? step.pointer : safeIndex;
    $("animaticDpGrid").innerHTML = dpCells.map((val, idx) => {
      const isCurr = idx === currCellIdx;
      const isComputed = idx < currCellIdx;
      return `<div class="animatic-dp-cell ${isCurr ? 'current-dp' : isComputed ? 'computed' : ''}">dp[${idx}]=${val}</div>`;
    }).join("");
  }

  // Render Visual Arrays / Stages
  const arrayRow = $("animaticArrayRow");
  const memoryGrid = $("animaticMemoryGrid");

  if (arrayRow) {
    if (animaticState.type === "pillars") {
      arrayRow.innerHTML = `<div class="animatic-pillars-container">${animaticState.nums.map((num, idx) => {
        const height = num * 30 + 30;
        const isCompared = idx === step.left || idx === step.right;
        const isMatched = step.matchedIndices?.includes(idx);
        const cls = isMatched ? "pillar-cell matched" : isCompared ? "pillar-cell active" : "pillar-cell";
        return `<div class="${cls}" style="height: ${height}px;" data-index="${idx}">
          <span class="pillar-val">${num}</span>
          <span class="pillar-idx">${idx}</span>
        </div>`;
      }).join("")}</div>`;
    } else if (animaticState.type === "cycle-detection") {
      arrayRow.innerHTML = animaticState.nums.map((num, idx) => {
        const isSlow = idx === step.slow;
        const isFast = idx === step.fast;
        const isCollided = isSlow && isFast;
        const isMatched = step.matchedIndices?.includes(idx);
        let cellClass = "animatic-cell";
        if (isCollided) cellClass += " active cycle-match";
        else if (isSlow) cellClass += " active pointer-slow";
        else if (isFast) cellClass += " active pointer-fast";
        else if (isMatched) cellClass += " matched";

        return `
          <div class="${cellClass}" data-index="${idx}">
            <div class="cell-index">[${idx}]</div>
            <div class="cell-value">${num}</div>
            <div class="cell-pointer">
              ${isCollided ? '<span class="pointer-badge pointer-collision">Slow & Fast</span>' :
                isSlow ? '<span class="pointer-badge pointer-s">Slow</span>' :
                isFast ? '<span class="pointer-badge pointer-f">Fast</span>' : ''}
            </div>
          </div>
        `;
      }).join("");
    } else if (animaticState.type === "binary-search") {
      arrayRow.innerHTML = animaticState.nums.map((num, idx) => {
        const isLeft = idx === step.left;
        const isRight = idx === step.right;
        const isMid = idx === step.mid;
        const isMatched = step.matchedIndices?.includes(idx);
        const isEliminated = step.left !== undefined && step.right !== undefined && (idx < step.left || idx > step.right);

        let cellClass = "animatic-cell";
        if (isMatched) cellClass += " matched";
        else if (isMid) cellClass += " active";
        else if (isEliminated) cellClass += " eliminated";

        return `
          <div class="${cellClass}" data-index="${idx}">
            <div class="cell-index">[${idx}]</div>
            <div class="cell-value">${num}</div>
            <div class="cell-pointer">
              ${isMid ? '<span class="pointer-badge">Mid</span>' :
                isLeft ? '<span class="pointer-badge">L</span>' :
                isRight ? '<span class="pointer-badge">R</span>' : ''}
            </div>
          </div>
        `;
      }).join("");
    } else if (animaticState.type === "dual-pointer") {
      arrayRow.innerHTML = animaticState.nums.map((num, idx) => {
        const isL = idx === step.left;
        const isR = idx === step.right;
        const isMatched = step.matchedIndices?.includes(idx);
        let cellClass = "animatic-cell";
        if (isMatched) cellClass += " matched";
        else if (isL || isR) cellClass += " active";

        return `
          <div class="${cellClass}" data-index="${idx}">
            <div class="cell-index">[${idx}]</div>
            <div class="cell-value">${num}</div>
            <div class="cell-pointer">
              ${isL ? '<span class="pointer-badge">L</span>' : isR ? '<span class="pointer-badge">R</span>' : ''}
            </div>
          </div>
        `;
      }).join("");
    } else if (animaticState.type === "sliding-window") {
      const wL = step.windowLeft !== undefined ? step.windowLeft : (step.left || 0);
      const wR = step.windowRight !== undefined ? step.windowRight : (step.right !== undefined ? step.right : (step.pointer || 0));
      arrayRow.innerHTML = animaticState.nums.map((num, idx) => {
        const inWindow = idx >= wL && idx <= wR;
        const isMatched = step.matchedIndices?.includes(idx);
        let cellClass = "animatic-cell";
        if (inWindow) cellClass += " window-active";
        if (isMatched) cellClass += " matched";

        return `
          <div class="${cellClass}" data-index="${idx}">
            <div class="cell-index">[${idx}]</div>
            <div class="cell-value">${num}</div>
            <div class="cell-pointer">${idx === wL ? '<span class="pointer-badge">L</span>' : idx === wR ? '<span class="pointer-badge">R</span>' : ''}</div>
          </div>
        `;
      }).join("");
    } else {
      // Default: array-map
      arrayRow.innerHTML = animaticState.nums.map((num, idx) => {
        const isActive = idx === step.pointer;
        const isMatched = step.matchedIndices?.includes(idx);
        let cellClass = "animatic-cell";
        if (isMatched) cellClass += " matched";
        else if (isActive) cellClass += " active";

        return `
          <div class="${cellClass}" data-index="${idx}">
            <div class="cell-index">[${idx}]</div>
            <div class="cell-value">${num}</div>
            <div class="cell-pointer">${isActive ? '<span class="pointer-badge">i</span>' : ''}</div>
          </div>
        `;
      }).join("");
    }
  }

  // Memory Grid (Hash map state)
  if (memoryGrid) {
    if (animaticState.type === "array-map") {
      const mapEntries = [];
      for (let i = 0; i <= safeIndex; i++) {
        const s = animaticState.steps[i];
        if (s.inMap === false && s.currentVal !== undefined) {
          mapEntries.push({ key: s.currentVal, val: s.pointer });
        }
      }
      if (mapEntries.length === 0) {
        memoryGrid.innerHTML = '<span class="memory-empty-state">Empty Hash Map { }</span>';
      } else {
        memoryGrid.innerHTML = mapEntries.map(e => `
          <div class="memory-cell">
            <span class="memory-key">${e.key}</span>
            <span class="memory-arrow">&rarr;</span>
            <span class="memory-val">index ${e.val}</span>
          </div>
        `).join("");
      }
    } else {
      memoryGrid.innerHTML = `<div class="memory-cell"><span class="memory-key">Auxiliary Space</span><span class="memory-arrow">:</span><span class="memory-val">O(1) Constant Variables</span></div>`;
    }
  }

  // Synchronized Active Code Line Highlighting (Module 6)
  const syncCodeEl = $("animaticSynchronizedCode");
  const lineBadge = $("animaticLineNumberBadge");
  const rawCode = animaticState.code || $("mentorOptimalCode")?.textContent || "def solve(nums):\n    pass";
  const codeLines = rawCode.split("\n");
  const activeLineNo = step.codeLine || ((safeIndex % Math.max(1, codeLines.length)) + 1);
  if (lineBadge) lineBadge.textContent = `Line: ${activeLineNo}`;
  if (syncCodeEl && codeLines.length) {
    syncCodeEl.innerHTML = codeLines.map((line, i) => {
      const isLineActive = (i + 1) === activeLineNo;
      return `<span class="anim-code-line ${isLineActive ? 'active-anim-line' : ''}">${escapeHTML(line) || '&nbsp;'}</span>`;
    }).join("");
  }

  // Live Variable State Table
  const varsTableBody = $("animaticVarsTableBody");
  if (varsTableBody) {
    varsTableBody.innerHTML = animaticState.steps.map((st, idx) => {
      const isCurrent = idx === safeIndex;
      const rowClass = isCurrent ? "active-step-row" : "";
      return `
        <tr class="${rowClass}">
          <td>Step ${idx + 1}</td>
          <td>${st.pointer !== undefined ? st.pointer : st.slow !== undefined ? `S:${st.slow}, F:${st.fast}` : st.left !== undefined ? `L:${st.left}, R:${st.right}` : '-'}</td>
          <td>${st.currentVal !== undefined ? st.currentVal : st.nums ? st.nums.join(',') : '-'}</td>
          <td>${animaticState.target !== null ? animaticState.target : 'Sort'}</td>
          <td>${st.complement !== undefined ? st.complement : st.formula ? st.formula.slice(0, 20) : '-'}</td>
          <td>${st.inMap ? 'Yes &#10004;' : st.inMap === false ? 'No &#10008;' : '-'}</td>
          <td>${escapeHTML(st.action || '')}</td>
        </tr>
      `;
    }).join("");
  }
}

function goToAnimaticStep(stepIndex) {
  renderAnimaticStep(stepIndex);
}

function toggleAnimaticPlay() {
  if (animaticState.isPlaying) {
    stopAnimaticPlayback();
  } else {
    startAnimaticPlayback();
  }
}

function startAnimaticPlayback() {
  animaticState.isPlaying = true;
  const playLabel = $("animaticPlayLabel");
  if (playLabel) playLabel.textContent = "Pause";

  const playIcon = $("animaticPlayIcon");
  if (playIcon) {
    playIcon.innerHTML = '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>';
  }

  const interval = 1600 / animaticState.speed;
  animaticState.timer = setInterval(() => {
    if (animaticState.currentStep < animaticState.steps.length - 1) {
      renderAnimaticStep(animaticState.currentStep + 1);
    } else {
      stopAnimaticPlayback();
    }
  }, interval);
}

function stopAnimaticPlayback() {
  animaticState.isPlaying = false;
  if (animaticState.timer) {
    clearInterval(animaticState.timer);
    animaticState.timer = null;
  }
  const playLabel = $("animaticPlayLabel");
  if (playLabel) playLabel.textContent = "Play";

  const playIcon = $("animaticPlayIcon");
  if (playIcon) {
    playIcon.innerHTML = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>';
  }
}

function updateMentorContextStatusUI(dataOverride = null) {
  const badge = $("mentorContextStatusBadge");
  const guidance = $("mentorContextGuidance");
  if (!badge) return;

  const titleVal = $("mentorProblemTitleInput")?.value?.trim() || currentMentorProblem?.title || "";
  const descVal = $("mentorProblemDescInput")?.value?.trim() || currentMentorProblem?.description || "";
  const isVerified = Boolean(currentMentorProblem?.isCanonical || (dataOverride && dataOverride.isVerified) || (!currentMentorProblem?.isStandalone && currentMentorProblem?.slug));

  if (isVerified && titleVal && titleVal !== "Custom Code Review") {
    badge.textContent = "Verified Problem Context";
    badge.className = "badge-context-status status-context-verified";
    if (guidance) {
      const probNum = currentMentorProblem?.number || currentMentorProblem?.frontendId || (dataOverride && dataOverride.number) || "";
      guidance.textContent = `Verified official problem specification (${probNum ? '#' + probNum + ' · ' : ''}${titleVal}).`;
    }
  } else if (descVal && descVal.length > 20) {
    badge.textContent = "User-Provided Problem Statement";
    badge.className = "badge-context-status status-context-user";
    if (guidance) {
      guidance.textContent = "Custom problem context supplied by user. AI Mentor will evaluate logic against provided requirements.";
    }
  } else if (titleVal && titleVal !== "Custom Code Review" && titleVal !== "AI Code Mentor") {
    badge.textContent = "Partial Problem Information";
    badge.className = "badge-context-status status-context-partial";
    if (guidance) {
      guidance.textContent = "Title supplied without constraints or examples. Provide problem statement for problem-specific boundary testing.";
    }
  } else {
    badge.textContent = "General Code Review";
    badge.className = "badge-context-status status-context-unavailable";
    if (guidance) {
      guidance.textContent = "No external problem statement supplied. The AI Mentor will review code syntax, potential bugs, time/space complexity, and clean code principles.";
    }
  }
}

async function openAiCodeMentorWorkspace(params = {}) {
  const isStandalone = Boolean(params.isStandalone || (!params.slug && !params.submissionId));
  currentMentorProblem = {
    ...params,
    isStandalone,
    title: params.title || (isStandalone ? "Custom Code Review" : "LeetCode Problem"),
    difficulty: params.difficulty || "Medium",
    status: params.status || (isStandalone ? "Unspecified" : "Accepted"),
    language: params.language || "python3"
  };
  currentMentorMode = "explain";
  currentMentorHintIndex = 0;

  // View Return Memory
  if ($("profileRoutePage") && !$("profileRoutePage").hidden) {
    currentMentorPreviousView = "profile";
  } else if ($("memberHome") && !$("memberHome").hidden) {
    currentMentorPreviousView = "memberHome";
  } else {
    currentMentorPreviousView = "overview";
  }

  // Hide other pages
  const appShell = document.querySelector(".app-shell");
  if (appShell) appShell.hidden = true;
  if ($("memberHome")) $("memberHome").hidden = true;
  if ($("profileRoutePage")) $("profileRoutePage").hidden = true;

  const page = $("aiMentorPage");
  if (!page) return;
  page.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });

  const data = getEducationalDataFor(params.slug, params.title);

  // Populate Header
  const titleEl = $("mentorProblemTitle");
  if (titleEl) titleEl.textContent = params.title || data.title;

  const metaEl = $("mentorProblemMeta");
  const problemNum = params.frontendId || data.number || (params.slug ? params.slug : '');
  if (metaEl) metaEl.textContent = `${problemNum ? '#' + escapeHTML(problemNum) + ' · ' : ''}AI Code Mentor Review`;

  const diff = params.difficulty || data.difficulty;
  const diffBadge = $("mentorDifficultyBadge");
  if (diffBadge) {
    diffBadge.textContent = diff;
    diffBadge.className = `badge-difficulty badge-${diff.toLowerCase()}`;
  }

  const status = params.status || "Accepted";
  const statusBadge = $("mentorStatusBadge");
  if (statusBadge) {
    statusBadge.textContent = status;
    statusBadge.className = `badge-status ${status === "Accepted" ? "status-accepted" : "status-attempted"}`;
  }

  const attemptsBadge = $("mentorAttemptsBadge");
  const attemptsCount = params.attemptsCount || 1;
  if (attemptsBadge) attemptsBadge.textContent = `⚡ ${attemptsCount} ${attemptsCount === 1 ? 'attempt' : 'attempts'}`;

  // Language mapping: match the actual submission language!
  const selectedLang = normalizeLanguageKey(params.language);
  const langBadge = $("mentorLangBadge");
  if (langBadge) langBadge.textContent = formatLang(selectedLang);

  const langSelect = $("mentorLangSelect");
  if (langSelect) langSelect.value = selectedLang;

  const leetCodeUrl = params.url || (params.slug ? `https://leetcode.com/problems/${encodeURIComponent(params.slug)}/` : "https://leetcode.com/");
  const leetCodeLink = $("mentorLeetCodeLink");
  if (leetCodeLink) leetCodeLink.href = leetCodeUrl;

  // Problem Context
  const contextTitle = $("mentorProblemContextTitle");
  const contextDesc = $("mentorProblemDescription");
  const titleInput = $("mentorProblemTitleInput");
  const verdictSelect = $("mentorVerdictSelect");
  const urlInput = $("mentorProblemUrlInput");
  const descInput = $("mentorProblemDescInput");

  try {
    sessionStorage.setItem("dsaverse_mentor_workspace", JSON.stringify(currentMentorProblem));
  } catch {}

  if (isStandalone) {
    if (titleInput) titleInput.value = "";
    if (verdictSelect) verdictSelect.value = "";
    if (urlInput) urlInput.value = "";
    if (descInput) descInput.value = "";
    if (contextTitle) contextTitle.textContent = "Custom Problem Review";
    if (titleEl) titleEl.textContent = "AI Code Mentor";
    if (metaEl) metaEl.textContent = "Interactive DSA Code Learning & Review";
    if (contextDesc) contextDesc.textContent = "";
  } else {
    if (titleInput) titleInput.value = params.title || "";
    if (verdictSelect) verdictSelect.value = params.status || "Accepted";
    if (urlInput) urlInput.value = params.url || (params.slug ? `https://leetcode.com/problems/${encodeURIComponent(params.slug)}/` : "");
    if (descInput) descInput.value = "";
    if (contextTitle) contextTitle.textContent = params.title || data.title;
    if (contextDesc) contextDesc.textContent = data.description;
  }
  updateMentorContextStatusUI(data);

  // Code input & Source indication
  currentMentorBuggyState = status !== "Accepted";
  const codeInput = $("mentorCodeInput");
  const sourceBadge = $("mentorCodeSourceBadge");
  const sourceNotice = $("mentorSourceNotice");

  // Determine source code provenance (Module 1)
  let resolvedCode = null;
  let resolvedSourceType = "Original Source Unavailable";
  let resolvedLang = selectedLang;

  const subIdQuery = params.submissionId ? `&submissionId=${encodeURIComponent(params.submissionId)}` : "";
  const query = `problemSlug=${encodeURIComponent(params.slug || '')}&problemTitle=${encodeURIComponent(params.title || '')}${subIdQuery}`;

  if (params.code && typeof params.code === "string" && params.code.trim()) {
    resolvedCode = params.code;
    resolvedSourceType = "Automatically Imported (Authorized Integration)";
  } else {
    // 1. Try fetching saved/imported source from server linked to this user and submission/slug
    try {
      const resp = await apiRequest(`/api/ai-code-mentor/source?${query}`);
      if (resp && resp.sourceCode && resp.sourceCode.trim()) {
        resolvedCode = resp.sourceCode;
        if (resp.language) resolvedLang = normalizeLanguageKey(resp.language);
        if (resp.verdict) {
          params.status = resp.verdict;
          currentMentorBuggyState = resp.verdict !== "Accepted";
          if (statusBadge) {
            statusBadge.textContent = resp.verdict;
            statusBadge.className = `badge-status ${resp.verdict === "Accepted" ? "status-accepted" : "status-attempted"}`;
          }
        }
        if (resp.difficulty && !params.difficulty) {
          params.difficulty = resp.difficulty;
          if (diffBadge) {
            diffBadge.textContent = resp.difficulty;
            diffBadge.className = `badge-difficulty badge-${resp.difficulty.toLowerCase()}`;
          }
        }
        if (resp.problemTitle && (!params.title || params.title === "LeetCode Problem")) {
          params.title = resp.problemTitle;
          if (titleEl) titleEl.textContent = resp.problemTitle;
          if (contextTitle) contextTitle.textContent = resp.problemTitle;
        }
        if (resp.submissionId && !params.submissionId) {
          params.submissionId = resp.submissionId;
        }
        if (resp.sourceProvenance === "manual_import") {
          resolvedSourceType = "Manually Imported";
        } else if (resp.sourceProvenance === "user_paste") {
          resolvedSourceType = "User Pasted";
        } else if (resp.sourceProvenance === "authorized_extension" || resp.sourceProvenance === "verified_submission") {
          resolvedSourceType = "Automatically Imported (Authorized Integration)"; // Provenance alias: "Verified LeetCode Submission"
        } else {
          resolvedSourceType = "Automatically Imported (Authorized Integration)"; // Provenance alias: "Verified LeetCode Submission"
        }
      }
    } catch {}

    // 2. If not on server, check locally saved code for this submission/slug
    if (!resolvedCode) {
      const storageKey = params.submissionId
        ? `dsaverse_mentor_code_sub_${params.submissionId}`
        : `dsaverse_mentor_code_${params.slug || params.title}`;
      const locallySaved = localStorage.getItem(storageKey);
      if (locallySaved && locallySaved.trim()) {
        resolvedCode = locallySaved;
        resolvedSourceType = "User Pasted"; // Provenance alias: "Previously Saved"
      }
    }
    const langKey = params.submissionId
      ? `dsaverse_mentor_lang_sub_${params.submissionId}`
      : `dsaverse_mentor_lang_${params.slug || params.title}`;
    const locallySavedLang = localStorage.getItem(langKey);
    if (locallySavedLang && !params.language) {
      resolvedLang = normalizeLanguageKey(locallySavedLang);
    }
  }

  // Update language select if imported code had a saved language
  if (resolvedLang && resolvedLang !== selectedLang) {
    if (langSelect) langSelect.value = resolvedLang;
    if (langBadge) langBadge.textContent = formatLang(resolvedLang);
  }

  const replaceBtn = $("mentorReplaceCodeBtn");
  const removeBtn = $("mentorRemoveCodeBtn");
  const noticeImportBtn = $("mentorNoticeImportBtn");
  const noticeTitle = $("mentorSourceNoticeTitle");
  const noticeBody = $("mentorSourceNoticeBody");

  if (resolvedCode) {
    if (codeInput) codeInput.value = resolvedCode;
    if (sourceBadge) sourceBadge.textContent = `Source: ${resolvedSourceType}`;
    if (sourceNotice) {
      sourceNotice.hidden = false;
      if (noticeTitle) {
        noticeTitle.textContent = resolvedSourceType.includes("Automatically")
          ? "Synced LeetCode Submission Loaded"
          : "Submitted Code Loaded";
      }
      if (noticeBody) {
        noticeBody.textContent = resolvedSourceType.includes("Automatically")
          ? `Your exact code submitted to LeetCode was automatically synchronized (${params.submissionId ? '#' + params.submissionId + ' · ' : ''}${formatLang(resolvedLang)}${params.status ? ' · ' + params.status : ''}). Ready for AI analysis!`
          : `Imported code loaded for this submission (${params.submissionId ? '#' + params.submissionId + ' · ' : ''}${formatLang(resolvedLang)}). You can edit the code above before analyzing.`;
      }
      if (replaceBtn) replaceBtn.hidden = false;
      if (removeBtn) removeBtn.hidden = false;
      if (noticeImportBtn) noticeImportBtn.hidden = true;
    }
  } else {
    // Original submission code unavailable or standalone mode
    if (isStandalone) {
      if (codeInput && !params.code) codeInput.value = "";
      if (sourceBadge) sourceBadge.textContent = "Source: Standalone Code Input";
      if (sourceNotice) sourceNotice.hidden = true;
    } else {
      if (data.hasLocalSolution && data.buggyCodeByLang) {
        const templateCode = currentMentorBuggyState
          ? (data.buggyCodeByLang?.[selectedLang] || data.buggyCode)
          : (data.acceptedCodeByLang?.[selectedLang] || data.acceptedCode);
        if (codeInput) codeInput.value = templateCode;
      } else {
        if (codeInput) codeInput.value = "";
      }
      if (sourceBadge) sourceBadge.textContent = "Source: Original Source Unavailable"; // Source: Original Code Unavailable
      if (sourceNotice) {
        sourceNotice.hidden = false;
        if (noticeTitle) noticeTitle.textContent = "Submitted Code Notice";
        if (noticeBody) {
          noticeBody.textContent = "Original LeetCode submission source is unavailable for this record. You can import your code or paste it directly into the editor.";
        }
        if (replaceBtn) replaceBtn.hidden = true;
        if (removeBtn) removeBtn.hidden = true;
        if (noticeImportBtn) noticeImportBtn.hidden = false;
      }
    }
  }
  updateMentorLineNumbers();

  // Check AI Mentor configuration status
  try {
    const configResp = await apiRequest("/api/ai-code-mentor/config");
    window._aiMentorConfigured = Boolean(configResp && configResp.configured);
    window._aiMentorProvider = configResp?.provider || "gemini";
    const configNotice = $("mentorAiConfigNotice");
    if (configNotice) {
      configNotice.hidden = window._aiMentorConfigured;
    }
  } catch {}

  // Render normal mode analysis
  renderNormalModeAnalysis(data, currentMentorBuggyState);

  // Setup animatic mode (Module 6)
  const codeForAnimatic = data.acceptedCodeByLang?.[selectedLang] || data.optimalCode || data.acceptedCode || "";
  setupAnimaticMode({
    ...(data.animatic || PROBLEM_EDUCATIONAL_DATA["two-sum"].animatic),
    code: codeForAnimatic
  });

  // Switch to normal tab
  switchMentorLearningTab("normal");

  // Automatically fetch Gemini optimal solution for unverified problems or when no local solution exists
  if (!data.hasLocalSolution) {
    await fetchOptimalSolutionForMentor(params, selectedLang, data);
  }
}

async function fetchOptimalSolutionForMentor(params, selectedLang, data) {
  const providerBadge = $("mentorProviderBadge");
  if (providerBadge) {
    providerBadge.textContent = "Provider: Gemini AI Mentor";
    providerBadge.className = "badge-provider provider-gemini";
  }
  const optimalTitleEl = $("mentorOptimalTitle");
  if (optimalTitleEl) optimalTitleEl.textContent = `Optimal Solution (Generating via Gemini...)`;
  const optimalCodeEl = $("mentorOptimalCode");
  if (optimalCodeEl) optimalCodeEl.textContent = "// Requesting optimal solution from Gemini AI Mentor...";

  try {
    const res = await apiRequest("/api/ai-code-mentor/optimal-solution", {
      method: "POST",
      body: JSON.stringify({
        problemNumber: params.number || params.frontendId || data.number,
        problemTitle: params.title || data.title,
        problemSlug: params.slug || data.slug || "",
        language: selectedLang
      })
    });
    const sol = res?.solution;
    if (sol && (sol.optimalCode || sol.summary)) {
      if (sol.problemDescription && $("mentorProblemDescription")) {
        $("mentorProblemDescription").textContent = sol.problemDescription;
      }
      if (sol.animationSteps && sol.animationSteps.length) {
        setupAnimaticMode({
          type: sol.animationType || "array-map",
          steps: sol.animationSteps
        });
      }
      if (providerBadge) {
        if (sol.provider === "gemini") {
          providerBadge.textContent = "Provider: Gemini AI Mentor";
          providerBadge.className = "badge-provider provider-gemini";
        } else if (sol.provider === "openai") {
          providerBadge.textContent = "Provider: OpenAI Live AI Mentor";
          providerBadge.className = "badge-provider provider-openai";
        } else {
          providerBadge.textContent = "Provider: Local Educational Knowledge Engine";
          providerBadge.className = "badge-provider provider-local";
        }
      }
      renderNormalModeAnalysis(data, currentMentorBuggyState, sol);
      // Pre-fill editor with optimal code if editor was empty
      const codeInput = $("mentorCodeInput");
      if (codeInput && !codeInput.value.trim() && sol.optimalCode) {
        codeInput.value = sol.optimalCode;
        updateMentorLineNumbers();
      }
    }
  } catch (err) {
    console.warn("Could not load dynamic optimal solution:", err);
    if (providerBadge) {
      providerBadge.textContent = "Provider: Local Engine (Unverified Problem)";
      providerBadge.className = "badge-provider provider-unverified";
    }
    if (optimalCodeEl) {
      optimalCodeEl.textContent = data.unavailableReason || "Problem-specific optimal code is not available.";
    }
  }
}

function closeAiCodeMentorWorkspace() {
  stopAnimaticPlayback();
  const page = $("aiMentorPage");
  if (page) page.hidden = true;

  if (currentMentorPreviousView === "memberHome" && $("memberHome")) {
    $("memberHome").hidden = false;
  } else if ($("profileRoutePage")) {
    $("profileRoutePage").hidden = false;
  } else {
    const appShell = document.querySelector(".app-shell");
    if (appShell) appShell.hidden = false;
  }
}


function updateImportCharCount() {
  const textarea = $("mentorImportTextarea");
  const counter = $("mentorImportCharCount");
  if (!textarea || !counter) return;
  const val = textarea.value || "";
  const lines = val ? val.split("\n").length : 0;
  const chars = val.length;
  counter.textContent = `${lines} ${lines === 1 ? 'line' : 'lines'} · ${chars} ${chars === 1 ? 'char' : 'chars'}`;
}

function openImportCodeModal(initialCode = null) {
  const modal = $("mentorImportModal");
  if (!modal) return;
  const textarea = $("mentorImportTextarea");
  const langSelect = $("mentorImportLangSelect");
  const subtitle = $("mentorImportModalSubtitle");

  const currentLang = $("mentorLangSelect")?.value || currentMentorProblem?.language || "python3";
  if (langSelect) langSelect.value = currentLang;

  const codeToSet = initialCode !== null 
    ? initialCode 
    : ($("mentorCodeInput")?.value || "");
  if (textarea) textarea.value = codeToSet;

  if (subtitle && currentMentorProblem) {
    const subNum = currentMentorProblem.submissionId ? ` (Submission #${currentMentorProblem.submissionId})` : '';
    subtitle.textContent = `Associate your submitted code with ${currentMentorProblem.title || "this problem"}${subNum}.`;
  }
  updateImportCharCount();
  modal.hidden = false;
  if (textarea) textarea.focus();
}

function closeImportCodeModal() {
  const modal = $("mentorImportModal");
  if (modal) modal.hidden = true;
}

function detectLanguageFromFileName(filename) {
  const ext = (filename || "").split(".").pop().toLowerCase();
  switch (ext) {
    case "java": return "java";
    case "py": return "python3";
    case "cpp": case "cc": case "cxx": case "h": case "hpp": return "cpp";
    case "js": case "mjs": case "cjs": return "javascript";
    case "ts": return "typescript";
    case "go": return "go";
    case "rs": return "rust";
    default: return null;
  }
}

function updateCardBadgeForProblem(submissionId, slug, available) {
  const cards = document.querySelectorAll(".daily-question-card");
  cards.forEach(card => {
    const cardSubId = card.dataset.submissionId;
    const cardSlug = card.dataset.reviewSlug;
    if ((submissionId && cardSubId === String(submissionId)) || (slug && cardSlug === slug)) {
      const badge = card.querySelector(".badge-source-status");
      if (badge) {
        if (available) {
          badge.textContent = "✓ Code Available";
          badge.className = "badge-source-status source-available";
        } else {
          badge.textContent = "Code Not Imported";
          badge.className = "badge-source-status source-missing";
        }
      }
    }
  });
}

async function saveImportedSourceCode() {
  const textarea = $("mentorImportTextarea");
  const langSelect = $("mentorImportLangSelect");
  const saveBtn = $("mentorImportSaveBtn");
  const text = textarea?.value?.trim() || "";
  const selectedLang = langSelect?.value || $("mentorLangSelect")?.value || "python3";

  if (!text) {
    showToast("Please enter or paste your code before saving.", "warning");
    return;
  }

  const origBtnText = saveBtn ? saveBtn.innerHTML : "";
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = "Saving…";
  }

  try {
    const payload = {
      sourceCode: text,
      language: selectedLang,
      problemSlug: currentMentorProblem?.slug || null,
      problemTitle: currentMentorProblem?.title || $("mentorProblemTitle")?.textContent || null,
      submissionId: currentMentorProblem?.submissionId || null,
      sourceProvenance: "manual_import"
    };

    const resp = await apiRequest("/api/ai-code-mentor/source", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (resp && resp.saved) {
      // 1. Update Code Editor
      const codeInput = $("mentorCodeInput");
      if (codeInput) codeInput.value = text;
      updateMentorLineNumbers();

      // 2. Update Language
      const mentorLangSelect = $("mentorLangSelect");
      if (mentorLangSelect && mentorLangSelect.value !== selectedLang) {
        mentorLangSelect.value = selectedLang;
        const langBadge = $("mentorLangBadge");
        if (langBadge) langBadge.textContent = formatLang(selectedLang);
      }

      // 3. Update Badges & Notice
      const sourceBadge = $("mentorCodeSourceBadge");
      if (sourceBadge) sourceBadge.textContent = "Source: Manually Imported";

      const sourceNotice = $("mentorSourceNotice");
      const noticeTitle = $("mentorSourceNoticeTitle");
      const noticeBody = $("mentorSourceNoticeBody");
      const replaceBtn = $("mentorReplaceCodeBtn");
      const removeBtn = $("mentorRemoveCodeBtn");
      const noticeImportBtn = $("mentorNoticeImportBtn");

      if (sourceNotice) {
        sourceNotice.hidden = false;
        if (noticeTitle) noticeTitle.textContent = "Submitted Code Loaded";
        if (noticeBody) {
          const subPrefix = currentMentorProblem?.submissionId ? '#' + currentMentorProblem.submissionId + ' · ' : '';
          noticeBody.textContent = `Imported code loaded for this submission (${subPrefix}${formatLang(selectedLang)}). You can edit the code above before analyzing.`;
        }
        if (replaceBtn) replaceBtn.hidden = false;
        if (removeBtn) removeBtn.hidden = false;
        if (noticeImportBtn) noticeImportBtn.hidden = true;
      }

      // 4. Update localStorage backup
      const storageKey = currentMentorProblem?.submissionId
        ? `dsaverse_mentor_code_sub_${currentMentorProblem.submissionId}`
        : `dsaverse_mentor_code_${currentMentorProblem?.slug || currentMentorProblem?.title}`;
      localStorage.setItem(storageKey, text);

      const langKey = currentMentorProblem?.submissionId
        ? `dsaverse_mentor_lang_sub_${currentMentorProblem.submissionId}`
        : `dsaverse_mentor_lang_${currentMentorProblem?.slug || currentMentorProblem?.title}`;
      localStorage.setItem(langKey, selectedLang);

      try {
        sessionStorage.setItem("dsaverse_mentor_workspace", JSON.stringify(currentMentorProblem));
      } catch {}

      // 5. Update Daily Question Card badge on profile page if present
      updateCardBadgeForProblem(currentMentorProblem?.submissionId, currentMentorProblem?.slug, true);

      closeImportCodeModal();
      showToast("Code imported and linked to this submission!", "success");
    } else {
      showToast("Failed to save imported code.", "error");
    }
  } catch (err) {
    console.error("Error saving imported code:", err);
    showToast(err.message || "Failed to save imported code.", "error");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = origBtnText;
    }
  }
}

async function removeImportedSourceCode() {
  if (!confirm("Are you sure you want to remove the imported code for this submission?")) {
    return;
  }
  const removeBtn = $("mentorRemoveCodeBtn");
  if (removeBtn) removeBtn.disabled = true;

  try {
    await apiRequest("/api/ai-code-mentor/source", {
      method: "DELETE",
      body: JSON.stringify({
        submissionId: currentMentorProblem?.submissionId || null,
        problemSlug: currentMentorProblem?.slug || null
      })
    });

    // Clear code input
    const codeInput = $("mentorCodeInput");
    if (codeInput) codeInput.value = "";
    updateMentorLineNumbers();

    // Clear localStorage
    const storageKey = currentMentorProblem?.submissionId
      ? `dsaverse_mentor_code_sub_${currentMentorProblem.submissionId}`
      : `dsaverse_mentor_code_${currentMentorProblem?.slug || currentMentorProblem?.title}`;
    localStorage.removeItem(storageKey);

    // Update badges & notice
    const sourceBadge = $("mentorCodeSourceBadge");
    if (sourceBadge) sourceBadge.textContent = "Source: Original Source Unavailable"; // Source: Original Code Unavailable

    const sourceNotice = $("mentorSourceNotice");
    const noticeTitle = $("mentorSourceNoticeTitle");
    const noticeBody = $("mentorSourceNoticeBody");
    const replaceBtn = $("mentorReplaceCodeBtn");
    const removeBtnEl = $("mentorRemoveCodeBtn");
    const noticeImportBtn = $("mentorNoticeImportBtn");

    if (sourceNotice) {
      sourceNotice.hidden = false;
      if (noticeTitle) noticeTitle.textContent = "Submitted Code Notice";
      if (noticeBody) {
        noticeBody.textContent = "Original LeetCode submission source is unavailable for this record. You can import your code or paste it directly into the editor.";
      }
      if (replaceBtn) replaceBtn.hidden = true;
      if (removeBtnEl) removeBtnEl.hidden = true;
      if (noticeImportBtn) noticeImportBtn.hidden = false;
    }

    // Update card badge on profile page
    updateCardBadgeForProblem(currentMentorProblem?.submissionId, currentMentorProblem?.slug, false);

    showToast("Imported code removed.");
  } catch (err) {
    console.error("Error removing imported code:", err);
    showToast("Failed to remove imported code.", "error");
  } finally {
    if (removeBtn) removeBtn.disabled = false;
  }
}

function initializeAiCodeMentor() {
  // 1. Back to profile button
  const backBtn = $("mentorBackToProfile");
  if (backBtn && !backBtn.dataset.bound) {
    backBtn.dataset.bound = "true";
    backBtn.addEventListener("click", closeAiCodeMentorWorkspace);
  }

  // 2. Learning Mode switcher
  const normalTabBtn = $("mentorModeNormalBtn");
  const animaticTabBtn = $("mentorModeAnimaticBtn");
  if (normalTabBtn && !normalTabBtn.dataset.bound) {
    normalTabBtn.dataset.bound = "true";
    normalTabBtn.addEventListener("click", () => switchMentorLearningTab("normal"));
  }
  if (animaticTabBtn && !animaticTabBtn.dataset.bound) {
    animaticTabBtn.dataset.bound = "true";
    animaticTabBtn.addEventListener("click", () => switchMentorLearningTab("animatic"));
  }

  // 3. Code Editor interactions
  const codeInput = $("mentorCodeInput");
  if (codeInput && !codeInput.dataset.bound) {
    codeInput.dataset.bound = "true";
    codeInput.addEventListener("input", () => {
      const sourceBadge = $("mentorCodeSourceBadge");
      if (sourceBadge) sourceBadge.textContent = "Source: User Pasted"; // Source: Manually Pasted
      updateMentorLineNumbers();

      // Persist in localStorage and background save
      if (currentMentorProblem) {
        const storageKey = currentMentorProblem.submissionId
          ? `dsaverse_mentor_code_sub_${currentMentorProblem.submissionId}`
          : `dsaverse_mentor_code_${currentMentorProblem.slug || currentMentorProblem.title}`;
        localStorage.setItem(storageKey, codeInput.value);
      }
    });

    codeInput.addEventListener("scroll", () => {
      const lineEl = $("mentorLineNumbers");
      if (lineEl) lineEl.scrollTop = codeInput.scrollTop;
    });

    // Tab key support
    codeInput.addEventListener("keydown", event => {
      if (event.key === "Tab") {
        event.preventDefault();
        const start = codeInput.selectionStart;
        const end = codeInput.selectionEnd;
        codeInput.value = codeInput.value.substring(0, start) + "    " + codeInput.value.substring(end);
        codeInput.selectionStart = codeInput.selectionEnd = start + 4;
        updateMentorLineNumbers();
      }
    });
  }

  // Language dropdown change (Module 4 Multi-Tier Solutions)
  const langSelect = $("mentorLangSelect");
  if (langSelect && !langSelect.dataset.bound) {
    langSelect.dataset.bound = "true";
    langSelect.addEventListener("change", () => {
      const selectedLang = langSelect.value;
      const data = getEducationalDataFor(currentMentorProblem?.slug, currentMentorProblem?.title);
      const input = $("mentorCodeInput");
      const sourceBadge = $("mentorCodeSourceBadge");

      // Update optimal code display immediately
      const optimalCodeEl = $("mentorOptimalCode");
      const optimalTitleEl = $("mentorOptimalTitle");
      if (optimalTitleEl) {
        optimalTitleEl.textContent = `${data.optimalTitle || "Optimal Solution"} (${formatLang(selectedLang)})`;
      }

      // Fetch complete multi-tier solutions for newly selected language
      apiRequest("/api/ai-code-mentor/solutions", {
        method: "POST",
        body: JSON.stringify({
          problemSlug: currentMentorProblem?.slug,
          problemTitle: currentMentorProblem?.title,
          problemNumber: currentMentorProblem?.number || currentMentorProblem?.frontendQuestionId,
          language: selectedLang,
          studentCode: $("mentorCodeInput")?.value || null,
          verdict: currentMentorProblem?.status || "Accepted"
        })
      }).then(res => {
        if (res?.solutions) {
          renderNormalModeAnalysis(data, currentMentorBuggyState, {
            ...res,
            solutions: res.solutions,
            solutionComparison: res.solutionComparison,
            studentComparison: res.studentComparison,
            optimalCode: res.solutions?.optimal?.code
          });
        } else if (optimalCodeEl) {
          optimalCodeEl.textContent = data.acceptedCodeByLang?.[selectedLang] || data.acceptedCode || data.optimalCode || "// Optimal code unavailable in selected language";
        }
      }).catch(() => {
        if (optimalCodeEl) {
          optimalCodeEl.textContent = data.acceptedCodeByLang?.[selectedLang] || data.acceptedCode || data.optimalCode || "// Optimal code unavailable in selected language";
        }
      });

      // Preserve student editor code without overwriting when switching languages
      const langBadge = $("mentorLangBadge");
      if (langBadge) langBadge.textContent = formatLang(selectedLang);
    });
  }

  
  // Problem Context Input & Clear Handlers
  const problemTitleInput = $("mentorProblemTitleInput");
  if (problemTitleInput && !problemTitleInput.dataset.bound) {
    problemTitleInput.dataset.bound = "true";
    problemTitleInput.addEventListener("input", () => {
      const val = problemTitleInput.value.trim();
      const contextTitle = $("mentorProblemContextTitle");
      if (contextTitle) contextTitle.textContent = val || "Custom Problem Review";
      const titleEl = $("mentorProblemTitle");
      if (titleEl && (currentMentorProblem?.isStandalone || !currentMentorProblem?.slug)) {
        titleEl.textContent = val || "AI Code Mentor";
      }
      updateMentorContextStatusUI();
    });
  }

  const problemDescInput = $("mentorProblemDescInput");
  if (problemDescInput && !problemDescInput.dataset.bound) {
    problemDescInput.dataset.bound = "true";
    problemDescInput.addEventListener("input", () => {
      updateMentorContextStatusUI();
    });
  }

  const clearContextBtn = $("mentorClearContextBtn");
  if (clearContextBtn && !clearContextBtn.dataset.bound) {
    clearContextBtn.dataset.bound = "true";
    clearContextBtn.addEventListener("click", () => {
      if ($("mentorProblemTitleInput")) $("mentorProblemTitleInput").value = "";
      if ($("mentorVerdictSelect")) $("mentorVerdictSelect").value = "";
      if ($("mentorProblemUrlInput")) $("mentorProblemUrlInput").value = "";
      if ($("mentorProblemDescInput")) $("mentorProblemDescInput").value = "";
      if ($("mentorProblemContextTitle")) $("mentorProblemContextTitle").textContent = "Custom Problem Review";
      if (currentMentorProblem?.isStandalone && $("mentorProblemTitle")) {
        $("mentorProblemTitle").textContent = "AI Code Mentor";
      }
      updateMentorContextStatusUI();
      showToast("Problem context cleared.");
    });
  }

  // Import Modal & Source Action Handlers
  const importCodeBtn = $("mentorImportCodeBtn");
  if (importCodeBtn && !importCodeBtn.dataset.bound) {
    importCodeBtn.dataset.bound = "true";
    importCodeBtn.addEventListener("click", () => openImportCodeModal());
  }

  const noticeImportBtn = $("mentorNoticeImportBtn");
  if (noticeImportBtn && !noticeImportBtn.dataset.bound) {
    noticeImportBtn.dataset.bound = "true";
    noticeImportBtn.addEventListener("click", () => openImportCodeModal());
  }

  const replaceCodeBtn = $("mentorReplaceCodeBtn");
  if (replaceCodeBtn && !replaceCodeBtn.dataset.bound) {
    replaceCodeBtn.dataset.bound = "true";
    replaceCodeBtn.addEventListener("click", () => openImportCodeModal());
  }

  const removeCodeBtn = $("mentorRemoveCodeBtn");
  if (removeCodeBtn && !removeCodeBtn.dataset.bound) {
    removeCodeBtn.dataset.bound = "true";
    removeCodeBtn.addEventListener("click", removeImportedSourceCode);
  }

  const importModalClose = $("mentorImportModalClose");
  if (importModalClose && !importModalClose.dataset.bound) {
    importModalClose.dataset.bound = "true";
    importModalClose.addEventListener("click", closeImportCodeModal);
  }

  const importCancelBtn = $("mentorImportCancelBtn");
  if (importCancelBtn && !importCancelBtn.dataset.bound) {
    importCancelBtn.dataset.bound = "true";
    importCancelBtn.addEventListener("click", closeImportCodeModal);
  }

  const importModalOverlay = $("mentorImportModal");
  if (importModalOverlay && !importModalOverlay.dataset.boundBackdrop) {
    importModalOverlay.dataset.boundBackdrop = "true";
    importModalOverlay.addEventListener("click", event => {
      if (event.target === importModalOverlay) closeImportCodeModal();
    });
  }

  const importTextarea = $("mentorImportTextarea");
  if (importTextarea && !importTextarea.dataset.bound) {
    importTextarea.dataset.bound = "true";
    importTextarea.addEventListener("input", updateImportCharCount);
  }

  const importSaveBtn = $("mentorImportSaveBtn");
  if (importSaveBtn && !importSaveBtn.dataset.bound) {
    importSaveBtn.dataset.bound = "true";
    importSaveBtn.addEventListener("click", saveImportedSourceCode);
  }

  const pasteClipboardBtn = $("mentorImportPasteClipboardBtn");
  if (pasteClipboardBtn && !pasteClipboardBtn.dataset.bound) {
    pasteClipboardBtn.dataset.bound = "true";
    pasteClipboardBtn.addEventListener("click", async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && importTextarea) {
          importTextarea.value = text;
          updateImportCharCount();
          showToast("Pasted code from clipboard.");
        } else {
          showToast("Clipboard is empty or clipboard permission was denied.", "warning");
        }
      } catch (err) {
        showToast("Could not access clipboard. Please paste directly using Ctrl+V.", "warning");
      }
    });
  }

  const fileInput = $("mentorImportFileInput");
  if (fileInput && !fileInput.dataset.bound) {
    fileInput.dataset.bound = "true";
    fileInput.addEventListener("change", event => {
      const file = event.target.files?.[0];
      if (!file) return;
      const detectedLang = detectLanguageFromFileName(file.name);
      if (detectedLang) {
        const modalLang = $("mentorImportLangSelect");
        if (modalLang) modalLang.value = detectedLang;
      }
      const reader = new FileReader();
      reader.onload = e => {
        if (importTextarea) {
          importTextarea.value = e.target.result;
          updateImportCharCount();
          showToast(`Loaded ${file.name}`);
        }
      };
      reader.onerror = () => showToast("Failed to read file.", "error");
      reader.readAsText(file);
    });
  }

  // 4. Copy code buttons
  const copyCodeBtn = $("mentorCopyCodeBtn");
  if (copyCodeBtn && !copyCodeBtn.dataset.bound) {
    copyCodeBtn.dataset.bound = "true";
    copyCodeBtn.addEventListener("click", async () => {
      const input = $("mentorCodeInput");
      if (!input || !input.value) return;
      await navigator.clipboard.writeText(input.value).catch(() => {});
      const originalText = copyCodeBtn.textContent;
      copyCodeBtn.textContent = "Copied!";
      setTimeout(() => { copyCodeBtn.textContent = originalText; }, 1500);
    });
  }

  const copyOptimalBtn = $("mentorCopyOptimalBtn");
  if (copyOptimalBtn && !copyOptimalBtn.dataset.bound) {
    copyOptimalBtn.dataset.bound = "true";
    copyOptimalBtn.addEventListener("click", async () => {
      const optimalCode = $("mentorOptimalCode");
      if (!optimalCode || !optimalCode.textContent || optimalCode.textContent.startsWith("Problem-specific optimal code is not available")) {
        showToast("Optimal code is unavailable for this problem. Configure AI provider in server .env.");
        return;
      }
      await navigator.clipboard.writeText(optimalCode.textContent).catch(() => {});
      const originalText = copyOptimalBtn.textContent;
      copyOptimalBtn.textContent = "Copied!";
      setTimeout(() => { copyOptimalBtn.textContent = originalText; }, 1500);
    });
  }

  // 5. Toggle sample code button
  const sampleToggleBtn = $("mentorSampleToggleBtn");
  if (sampleToggleBtn && !sampleToggleBtn.dataset.bound) {
    sampleToggleBtn.dataset.bound = "true";
    sampleToggleBtn.addEventListener("click", () => {
      const data = getEducationalDataFor(currentMentorProblem?.slug, currentMentorProblem?.title);
      currentMentorBuggyState = !currentMentorBuggyState;
      const input = $("mentorCodeInput");
      const selectedLang = $("mentorLangSelect")?.value || "python3";
      if (input) {
        input.value = currentMentorBuggyState
          ? (data.buggyCodeByLang?.[selectedLang] || data.buggyCode)
          : (data.acceptedCodeByLang?.[selectedLang] || data.acceptedCode);
        updateMentorLineNumbers();
      }
      renderNormalModeAnalysis(data, currentMentorBuggyState);
      showToast(currentMentorBuggyState ? "Loaded mistake example." : "Loaded optimal solution.");
    });
  }

  // 6. 11 Action Chips (Module 5)
  document.querySelectorAll(".mentor-action-chip").forEach(chip => {
    if (!chip.dataset.bound) {
      chip.dataset.bound = "true";
      chip.addEventListener("click", () => {
        document.querySelectorAll(".mentor-action-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        const chipType = chip.dataset.mentorChip || chip.dataset.mentorMode || "deep-analysis";
        currentMentorMode = chipType;
        const data = getEducationalDataFor(currentMentorProblem?.slug, currentMentorProblem?.title);
        renderNormalModeAnalysis(data, currentMentorBuggyState);

        // Smooth scroll to corresponding card
        let targetEl = null;
        if (chipType === "deep-analysis" || chipType === "explain") {
          targetEl = $("mentorAnalysisCard");
        } else if (chipType === "dry-run") {
          const dryRunCard = $("mentorDryRunCard");
          if (dryRunCard) dryRunCard.hidden = false;
          targetEl = dryRunCard;
        } else if (chipType === "track-vars") {
          const varsCard = $("mentorTrackVariablesCard");
          if (varsCard) varsCard.hidden = false;
          targetEl = varsCard;
        } else if (chipType === "learn-concepts" || chipType === "teach") {
          targetEl = $("mentorTakeawaysCard");
        } else if (chipType === "hints" || chipType === "hint") {
          const hintCard = $("mentorHintCard");
          if (hintCard) hintCard.hidden = false;
          targetEl = hintCard;
        } else if (chipType === "find-mistakes" || chipType === "mistake") {
          targetEl = currentMentorBuggyState ? $("mentorMistakeAlert") : $("mentorAcceptedAlert");
        } else if (chipType === "brute-force") {
          targetEl = $("mentorBruteForceCard");
        } else if (chipType === "optimal-solution" || chipType === "optimize") {
          targetEl = $("mentorSolutionCard");
        } else if (chipType === "complexity") {
          targetEl = $("mentorComplexityCard");
        } else if (chipType === "edge-cases") {
          targetEl = $("mentorEdgeCasesCard");
        } else if (chipType === "code-comparison") {
          targetEl = $("mentorComparisonTableCard");
        }

        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }
  });

  // Copy Brute Force Code Button
  const copyBfBtn = $("mentorCopyBruteForceBtn");
  if (copyBfBtn && !copyBfBtn.dataset.bound) {
    copyBfBtn.dataset.bound = "true";
    copyBfBtn.addEventListener("click", () => {
      const code = $("mentorBruteForceCode")?.textContent || "";
      if (code) {
        navigator.clipboard.writeText(code).catch(() => {});
        showToast("Copied brute force code!");
      }
    });
  }

  // Copy Improved Approach Code Button (Module 4)
  const copyImpBtn = $("mentorCopyImprovedBtn");
  if (copyImpBtn && !copyImpBtn.dataset.bound) {
    copyImpBtn.dataset.bound = "true";
    copyImpBtn.addEventListener("click", () => {
      const code = $("mentorImprovedCode")?.textContent || "";
      if (code && !code.startsWith("// Intermediate solution code unavailable")) {
        navigator.clipboard.writeText(code).catch(() => {});
        showToast("Copied improved approach code!");
      } else {
        showToast("No improved approach code available to copy.");
      }
    });
  }

  // 7. Find Mistake Quick Button
  const findMistakeBtn = $("mentorFindMistakeQuickBtn");
  if (findMistakeBtn && !findMistakeBtn.dataset.bound) {
    findMistakeBtn.dataset.bound = "true";
    findMistakeBtn.addEventListener("click", () => {
      currentMentorMode = "mistake";
      document.querySelectorAll(".mentor-action-chip").forEach(c => {
        if (c.dataset.mentorMode === "mistake") c.classList.add("active");
        else c.classList.remove("active");
      });
      const data = getEducationalDataFor(currentMentorProblem?.slug, currentMentorProblem?.title);
      renderNormalModeAnalysis(data, currentMentorBuggyState);
      const targetAlert = currentMentorBuggyState ? $("mentorMistakeAlert") : $("mentorAcceptedAlert");
      if (targetAlert) targetAlert.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  // 8. Progressive Hint Next Button
  const nextHintBtn = $("mentorNextHintBtn");
  if (nextHintBtn && !nextHintBtn.dataset.bound) {
    nextHintBtn.dataset.bound = "true";
    nextHintBtn.addEventListener("click", () => {
      const data = getEducationalDataFor(currentMentorProblem?.slug, currentMentorProblem?.title);
      if (Array.isArray(data.hints) && data.hints.length) {
        currentMentorHintIndex = (currentMentorHintIndex + 1) % data.hints.length;
        renderNormalModeAnalysis(data, currentMentorBuggyState);
      }
    });
  }

  // 9. Module 5 Execution & Verification Controls
  function updateCardExecutionBadge(badgeEl, status, summary) {
    if (!badgeEl) return;
    badgeEl.hidden = false;
    badgeEl.className = "badge-tag";
    const st = String(status || "").toLowerCase();
    if (st === "passed") {
      badgeEl.classList.add("badge-exec-passed");
      badgeEl.textContent = summary?.total ? `✓ Passed (${summary.passed}/${summary.total})` : "✓ Passed";
    } else if (st === "failed") {
      badgeEl.classList.add("badge-exec-failed");
      badgeEl.textContent = summary?.total ? `✕ Failed (${summary.passed}/${summary.total})` : "✕ Failed";
    } else if (st === "compilation_error") {
      badgeEl.classList.add("badge-exec-failed");
      badgeEl.textContent = "Compile Error";
    } else if (st === "time_limit_exceeded") {
      badgeEl.classList.add("badge-exec-failed");
      badgeEl.textContent = "Time Limit Exceeded";
    } else if (st === "runtime_error") {
      badgeEl.classList.add("badge-exec-failed");
      badgeEl.textContent = "Runtime Error";
    } else if (st === "execution_only") {
      badgeEl.classList.add("badge-exec-amber");
      badgeEl.textContent = "Execution Only";
    } else {
      badgeEl.classList.add("badge-exec-grey");
      badgeEl.textContent = st ? st.replace(/_/g, " ") : "Not Run";
    }
  }

  function renderExecutionResults(containerEl, execResult) {
    if (!containerEl || !execResult) return;
    containerEl.hidden = false;
    const summary = execResult.testSummary || { total: 0, passed: 0, failed: 0 };
    const runtime = execResult.resourceUsage?.executionTimeMs || 0;
    const results = Array.isArray(execResult.results) ? execResult.results : [];
    const isPassed = execResult.status === "passed";

    let rowsHtml = results.map((r, idx) => {
      const pass = r.status === "passed";
      const statusClass = pass ? "pass" : "fail";
      const actualText = r.actualOutput !== null && r.actualOutput !== undefined ? escapeHTML(String(r.actualOutput)) : (r.error ? `<em>${escapeHTML(r.error)}</em>` : "&mdash;");
      return `<tr>
        <td><strong>#${idx + 1}</strong></td>
        <td><code>${escapeHTML(r.input || "")}</code></td>
        <td><code>${escapeHTML(r.expectedOutput || "&mdash;")}</code></td>
        <td><code class="${statusClass}">${actualText}</code></td>
        <td class="${statusClass}">${pass ? "✓ PASS" : "✕ FAIL"}</td>
      </tr>`;
    }).join("");

    let errorBlock = "";
    if (Array.isArray(execResult.errors) && execResult.errors.length) {
      errorBlock = `<div class="mentor-exec-error-box" style="margin-top:6px; color:#b91c1c; font-family:monospace; font-size:11px; white-space:pre-wrap; background:#fef2f2; padding:6px 8px; border-radius:4px;">${escapeHTML(execResult.errors.join("\n"))}</div>`;
    }

    containerEl.innerHTML = `
      <details class="mentor-exec-details" ${!isPassed ? "open" : ""}>
        <summary>
          <strong>Execution Details:</strong> ${isPassed ? "✓ All test cases passed" : "✕ Test case failures detected"} &middot; 
          <span>${summary.passed}/${summary.total} Passed</span> &middot; 
          <span>Runtime: ${runtime}ms</span>
        </summary>
        ${errorBlock}
        <table class="mentor-exec-table">
          <thead>
            <tr><th>Test</th><th>Input</th><th>Expected</th><th>Actual</th><th>Verdict</th></tr>
          </thead>
          <tbody>
            ${rowsHtml || "<tr><td colspan='5'>No test cases recorded</td></tr>"}
          </tbody>
        </table>
      </details>
    `;
  }

  function updateMatrixRow(tier, execResult) {
    const summary = execResult?.testSummary || {};
    const runtime = execResult?.resourceUsage?.executionTimeMs !== undefined ? `${execResult.resourceUsage.executionTimeMs} ms` : "&mdash;";
    const status = execResult?.status || "Not Run";
    const passedStr = summary.total !== undefined ? `${summary.passed}/${summary.total} Passed` : "&mdash;";

    if (tier === "bruteForce") {
      const tEl = $("mentorCompTestsBf"); if (tEl) tEl.innerHTML = `<span class="badge-tag ${status === "passed" ? "badge-exec-passed" : "badge-exec-failed"}">${passedStr}</span>`;
      const rEl = $("mentorCompRuntimeBf"); if (rEl) rEl.textContent = runtime;
      const sEl = $("mentorCompStatusBf"); if (sEl) sEl.textContent = status.replace(/_/g, " ");
    } else if (tier === "improved") {
      const tEl = $("mentorCompTestsImp"); if (tEl) tEl.innerHTML = `<span class="badge-tag ${status === "passed" ? "badge-exec-passed" : "badge-exec-failed"}">${passedStr}</span>`;
      const rEl = $("mentorCompRuntimeImp"); if (rEl) rEl.textContent = runtime;
      const sEl = $("mentorCompStatusImp"); if (sEl) sEl.textContent = status.replace(/_/g, " ");
    } else if (tier === "optimal") {
      const tEl = $("mentorCompTestsOpt"); if (tEl) tEl.innerHTML = `<span class="badge-tag ${status === "passed" ? "badge-exec-passed" : "badge-exec-failed"}">${passedStr}</span>`;
      const rEl = $("mentorCompRuntimeOpt"); if (rEl) rEl.textContent = runtime;
      const sEl = $("mentorCompStatusOpt"); if (sEl) sEl.textContent = status.replace(/_/g, " ");
    } else if (tier === "studentSubmission" || tier === "student") {
      const tEl = $("mentorCompTestsStudent"); if (tEl) tEl.innerHTML = `<span class="badge-tag ${status === "passed" ? "badge-exec-passed" : "badge-exec-failed"}">${passedStr}</span>`;
      const rEl = $("mentorCompRuntimeStudent"); if (rEl) rEl.textContent = runtime;
      const sEl = $("mentorCompStatusStudent"); if (sEl) sEl.textContent = status.replace(/_/g, " ");
    }
  }

  async function runSingleExecution(tier, code, buttonEl, badgeEl, resultsContainerEl) {
    if (!code || !code.trim() || code.startsWith("Problem-specific") || code.startsWith("// Improved solution code unavailable")) {
      showToast("No executable code available for this approach.", "warning");
      return;
    }
    if (buttonEl.disabled) return;
    const originalText = buttonEl.textContent;
    buttonEl.disabled = true;
    buttonEl.textContent = "Running...";

    try {
      const payload = {
        sourceCode: code,
        language: $("mentorLangSelect")?.value || "python3",
        problemNumber: currentMentorProblem?.number,
        problemSlug: currentMentorProblem?.slug,
        problemTitle: currentMentorProblem?.title,
        tier
      };
      const res = await apiRequest("/api/ai-code-mentor/execute", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      updateCardExecutionBadge(badgeEl, res.status, res.testSummary);
      renderExecutionResults(resultsContainerEl, res);
      updateMatrixRow(tier, res);
      showToast(`Verification: ${res.status.toUpperCase()} (${res.testSummary?.passed || 0}/${res.testSummary?.total || 0})`);
    } catch (err) {
      showToast(`Execution failed: ${err.message}`, "error");
      if (badgeEl) {
        badgeEl.hidden = false;
        badgeEl.className = "badge-tag badge-exec-failed";
        badgeEl.textContent = "Error";
      }
    } finally {
      buttonEl.disabled = false;
      buttonEl.textContent = originalText;
    }
  }

  // Brute Force Execution Button
  const runBfBtn = $("mentorRunBruteForceBtn");
  if (runBfBtn && !runBfBtn.dataset.bound) {
    runBfBtn.dataset.bound = "true";
    runBfBtn.addEventListener("click", () => {
      const code = $("mentorBruteForceCode")?.textContent || "";
      runSingleExecution("bruteForce", code, runBfBtn, $("mentorBruteForceExecBadge"), $("mentorBruteForceExecResult"));
    });
  }

  // Improved Approach Execution Button
  const runImpBtn = $("mentorRunImprovedBtn");
  if (runImpBtn && !runImpBtn.dataset.bound) {
    runImpBtn.dataset.bound = "true";
    runImpBtn.addEventListener("click", () => {
      const code = $("mentorImprovedCode")?.textContent || "";
      runSingleExecution("improved", code, runImpBtn, $("mentorImprovedExecBadge"), $("mentorImprovedExecResult"));
    });
  }

  // Optimal Solution Execution Button
  const runOptBtn = $("mentorRunOptimalBtn");
  if (runOptBtn && !runOptBtn.dataset.bound) {
    runOptBtn.dataset.bound = "true";
    runOptBtn.addEventListener("click", () => {
      const code = $("mentorOptimalCode")?.textContent || "";
      runSingleExecution("optimal", code, runOptBtn, $("mentorOptimalExecBadge"), $("mentorOptimalExecResult"));
    });
  }

  // Student Code Execution Button
  const runStudentBtn = $("mentorRunStudentBtn");
  if (runStudentBtn && !runStudentBtn.dataset.bound) {
    runStudentBtn.dataset.bound = "true";
    runStudentBtn.addEventListener("click", () => {
      const code = $("mentorCodeInput")?.value || "";
      runSingleExecution("studentSubmission", code, runStudentBtn, $("mentorStudentExecBadge"), $("mentorStudentExecResult"));
    });
  }

  // Verify All Solutions Button
  const verifyAllBtn = $("mentorVerifyAllBtn");
  if (verifyAllBtn && !verifyAllBtn.dataset.bound) {
    verifyAllBtn.dataset.bound = "true";
    verifyAllBtn.addEventListener("click", async () => {
      if (verifyAllBtn.disabled) return;
      verifyAllBtn.disabled = true;
      const originalText = verifyAllBtn.textContent;
      verifyAllBtn.textContent = "Verifying All...";
      const statusEl = $("mentorVerifyAllStatus");
      if (statusEl) statusEl.textContent = "Executing independent verification across all solution tiers...";

      try {
        const payload = {
          language: $("mentorLangSelect")?.value || "python3",
          problemNumber: currentMentorProblem?.number,
          problemSlug: currentMentorProblem?.slug,
          problemTitle: currentMentorProblem?.title,
          studentCode: $("mentorCodeInput")?.value || null,
          submissionId: currentMentorProblem?.submissionId || null,
          solutions: {
            optimal: { code: $("mentorOptimalCode")?.textContent, available: Boolean($("mentorOptimalCode")?.textContent) },
            bruteForce: { code: $("mentorBruteForceCode")?.textContent, available: Boolean($("mentorBruteForceCode")?.textContent) },
            improved: { code: $("mentorImprovedCode")?.textContent, available: Boolean($("mentorImprovedCode")?.textContent && !$("mentorImprovedCode")?.textContent.startsWith("// Improved solution code unavailable")) }
          }
        };

        const res = await apiRequest("/api/ai-code-mentor/verify-solutions", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        if (res?.solutions) {
          if (res.solutions.optimal) {
            updateCardExecutionBadge($("mentorOptimalExecBadge"), res.solutions.optimal.status, res.solutions.optimal.testSummary);
            renderExecutionResults($("mentorOptimalExecResult"), res.solutions.optimal);
            updateMatrixRow("optimal", res.solutions.optimal);
          }
          if (res.solutions.bruteForce) {
            updateCardExecutionBadge($("mentorBruteForceExecBadge"), res.solutions.bruteForce.status, res.solutions.bruteForce.testSummary);
            renderExecutionResults($("mentorBruteForceExecResult"), res.solutions.bruteForce);
            updateMatrixRow("bruteForce", res.solutions.bruteForce);
          }
          if (res.solutions.improved) {
            updateCardExecutionBadge($("mentorImprovedExecBadge"), res.solutions.improved.status, res.solutions.improved.testSummary);
            renderExecutionResults($("mentorImprovedExecResult"), res.solutions.improved);
            updateMatrixRow("improved", res.solutions.improved);
          }
          if (res.solutions.studentSubmission) {
            updateCardExecutionBadge($("mentorStudentExecBadge"), res.solutions.studentSubmission.status, res.solutions.studentSubmission.testSummary);
            renderExecutionResults($("mentorStudentExecResult"), res.solutions.studentSubmission);
            updateMatrixRow("studentSubmission", res.solutions.studentSubmission);
          }
        }
        if (statusEl) statusEl.textContent = "All available solution tiers verified.";
        showToast("Multi-tier execution verification complete!");
      } catch (err) {
        showToast(`Verification failed: ${err.message}`, "error");
        if (statusEl) statusEl.textContent = `Verification error: ${err.message}`;
      } finally {
        verifyAllBtn.disabled = false;
        verifyAllBtn.textContent = originalText;
      }
    });
  }

function normalizeMentorMode(rawMode) {
  const m = String(rawMode || "explain").toLowerCase().trim();
  const map = {
    "deep-analysis": "explain",
    "track-vars": "dry-run",
    "learn-concepts": "teach",
    "hints": "hint",
    "find-mistakes": "mistake",
    "optimal-solution": "optimal",
    "edge-cases": "explain",
    "code-comparison": "explain",
    "complexity": "complexity",
    "brute-force": "brute-force",
    "dry-run": "dry-run"
  };
  return map[m] || "explain";
}

  // 9. Analyze with AI Mentor Button (Calls backend /api/ai-code-mentor/reviews)
  const analyzeBtn = $("mentorAnalyzeBtn");
  if (analyzeBtn && !analyzeBtn.dataset.bound) {
    analyzeBtn.dataset.bound = "true";
    analyzeBtn.addEventListener("click", async () => {
      if (window._isMentorAnalyzing) return; // Prevent duplicate concurrent requests
      window._isMentorAnalyzing = true;

      const input = $("mentorCodeInput");
      const selectedLang = $("mentorLangSelect")?.value || "python3";
      const data = getEducationalDataFor(currentMentorProblem?.slug, currentMentorProblem?.title);
      const configNotice = $("mentorAiConfigNotice");
      const configText = $("mentorAiConfigText");
      const providerBadge = $("mentorProviderBadge");

      const origText = analyzeBtn.innerHTML;
      analyzeBtn.disabled = true;
      analyzeBtn.innerHTML = "Analyzing with Mentor…";

      if (configNotice) configNotice.hidden = false;
      if (configText) {
        const provName = window._aiMentorProvider === "openai" ? "OpenAI" : "Google Gemini";
        configText.innerHTML = `<strong>AI Mentor Working:</strong> Analyzing solution with ${provName} structured intelligence...`;
      }

      let codeToAnalyze = input ? input.value.trim() : "";
      if (!codeToAnalyze && data.hasLocalSolution && data.buggyCodeByLang) {
        codeToAnalyze = currentMentorBuggyState
          ? (data.buggyCodeByLang[selectedLang] || data.buggyCode)
          : (data.acceptedCodeByLang[selectedLang] || data.acceptedCode);
        if (input) {
          input.value = codeToAnalyze;
          updateMentorLineNumbers();
        }
      }

      try {
        if (!codeToAnalyze) {
          // If no code is entered and no local template exists, generate full optimal problem analysis
          await fetchOptimalSolutionForMentor(currentMentorProblem, selectedLang, data);
          showToast("AI Mentor problem analysis loaded.", "success");
          return;
        }

        const customTitle = $("mentorProblemTitleInput")?.value?.trim();
        const customVerdict = $("mentorVerdictSelect")?.value;
        const customUrl = $("mentorProblemUrlInput")?.value?.trim();
        const customDesc = $("mentorProblemDescInput")?.value?.trim();

        const isStandalone = Boolean(currentMentorProblem?.isStandalone);
        const canonicalTitle = currentMentorProblem?.title || data.title || "";
        const canonicalSlug = currentMentorProblem?.slug || data.slug || null;

        const problemTitle = customTitle || (!isStandalone ? canonicalTitle : "Custom Code Review");
        const problemSlug = (!isStandalone && canonicalSlug && (!customTitle || customTitle.toLowerCase() === canonicalTitle.toLowerCase()))
          ? canonicalSlug
          : (customTitle ? null : (isStandalone ? null : canonicalSlug));
        const problemNumber = (!isStandalone && (currentMentorProblem?.number || currentMentorProblem?.frontendId || data.number))
          ? Number(currentMentorProblem?.number || currentMentorProblem?.frontendId || data.number)
          : null;
        const problemUrl = customUrl || (isStandalone ? null : (currentMentorProblem?.url || null));
        const verdict = customVerdict || currentMentorProblem?.status || (currentMentorBuggyState ? "Wrong Answer" : "Accepted");

        const payload = {
          sourceCode: codeToAnalyze,
          language: selectedLang,
          problemTitle,
          problemSlug,
          problemNumber,
          problemUrl,
          ...(customDesc ? { problemDescription: customDesc } : {}),
          submissionId: isStandalone ? null : (currentMentorProblem?.submissionId || null),
          verdict,
          mode: normalizeMentorMode(currentMentorMode),
          retainSource: Boolean($("mentorRetainSource")?.checked)
        };

        const response = await apiRequest("/api/ai-code-mentor/reviews", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        if (response && response.review) {
          const rev = response.review;
          const isFallback = rev.provider === "local" || Boolean(rev.fallbackNotice);

          if (providerBadge) {
            if (rev.provider === "gemini") {
              providerBadge.textContent = "Provider: Gemini AI Mentor";
              providerBadge.className = "badge-provider provider-gemini";
            } else if (rev.provider === "openai") {
              providerBadge.textContent = "Provider: OpenAI Live AI Mentor";
              providerBadge.className = "badge-provider provider-openai";
            } else {
              providerBadge.textContent = "Provider: Local Educational Knowledge Engine";
              providerBadge.className = "badge-provider provider-local";
            }
          }

          if (isFallback) {
            if (configNotice) configNotice.hidden = false;
            if (configText) {
              configText.innerHTML = rev.fallbackNotice
                ? `<strong>Local Fallback Active:</strong> ${escapeHTML(rev.fallbackNotice)}`
                : "Primary AI provider is temporarily unavailable. Running in Local Educational Knowledge Engine mode.";
            }
          } else {
            if (configNotice) configNotice.hidden = true;
          }

          if (rev.analysis?.animationSteps && rev.analysis.animationSteps.length) {
            setupAnimaticMode({
              steps: rev.analysis.animationSteps,
              type: rev.analysis.animationType || "array-map"
            });
          }

          renderNormalModeAnalysis(data, currentMentorBuggyState, {
            ...rev.analysis,
            provider: rev.provider || rev.analysis?.provider,
            model: rev.model || rev.analysis?.model,
            fallbackNotice: rev.fallbackNotice || rev.analysis?.fallbackNotice
          });

          const pLabel = rev.provider === "gemini" ? "Google Gemini" : rev.provider === "openai" ? "OpenAI" : "Local Engine";
          showToast(`AI Code Mentor analysis complete (${pLabel}).`, "success");
        } else {
          if (configNotice) configNotice.hidden = false;
          renderNormalModeAnalysis(data, currentMentorBuggyState);
          showToast("Educational review generated from local knowledge engine.");
        }
      } catch (err) {
        console.error("[AI MENTOR CLIENT ERROR]:", err);
        if (configNotice) configNotice.hidden = false;
        let actionableMsg = err.message || "Failed to generate AI analysis.";
        if (err.status === 404 || /not found/i.test(err.message)) {
          actionableMsg = "Selected submission record was not found. You can paste or import your code to run a review.";
        } else if (err.status === 403 || /permission|forbidden/i.test(err.message)) {
          actionableMsg = "You do not have permission to access this submission. Please select your own submission or use Standalone mode.";
        } else if (/unavailable|paste or import/i.test(err.message)) {
          actionableMsg = "Original source code is unavailable for this submission. Please paste or import your code using the editor above.";
          const input = $("mentorCodeInput");
          if (input) input.focus();
        }
        if (configText) {
          configText.innerHTML = `<strong>AI Analysis Notice:</strong> ${escapeHTML(actionableMsg)}`;
        }
        showToast(actionableMsg, err.status === 403 ? "warning" : "error");
        renderNormalModeAnalysis(data, currentMentorBuggyState);
      } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = origText;
        window._isMentorAnalyzing = false;
      }
    });
  }

  // 10. Sound Controls for Animatic Mode
  const soundToggle = $("animaticSoundToggle");
  const soundIcon = $("animaticSoundIcon");
  const soundLabel = $("animaticSoundLabel");
  const volumeSlider = $("animaticVolumeSlider");
  const volumeLabel = $("animaticVolumeLabel");

  if (soundToggle && !soundToggle.dataset.bound) {
    soundToggle.dataset.bound = "true";
    soundToggle.addEventListener("click", () => {
      soundFX.muted = !soundFX.muted;
      soundToggle.setAttribute("aria-pressed", String(!soundFX.muted));
      if (soundIcon) soundIcon.textContent = soundFX.muted ? "🔇" : "🔊";
      if (soundLabel) soundLabel.textContent = soundFX.muted ? "Sound: Muted" : "Sound: On";
      soundToggle.classList.toggle("active", !soundFX.muted);
      if (!soundFX.muted) {
        soundFX.step();
        showToast("Audio feedback enabled.");
      } else {
        showToast("Audio muted.");
      }
    });
  }

  if (volumeSlider && !volumeSlider.dataset.bound) {
    volumeSlider.dataset.bound = "true";
    volumeSlider.addEventListener("input", () => {
      soundFX.volume = Number(volumeSlider.value) || 0.3;
      if (volumeLabel) volumeLabel.textContent = `${Math.round(soundFX.volume * 100)}%`;
    });
  }

  // 11. Animatic Playback Controls
  const firstBtn = $("animaticFirstBtn");
  const prevBtn = $("animaticPrevBtn");
  const playBtn = $("animaticPlayBtn");
  const nextBtn = $("animaticNextBtn");
  const lastBtn = $("animaticLastBtn");
  const resetBtn = $("animaticResetBtn");

  if (firstBtn && !firstBtn.dataset.bound) {
    firstBtn.dataset.bound = "true";
    firstBtn.addEventListener("click", () => goToAnimaticStep(0));
  }
  if (prevBtn && !prevBtn.dataset.bound) {
    prevBtn.dataset.bound = "true";
    prevBtn.addEventListener("click", () => goToAnimaticStep(animaticState.currentStep - 1));
  }
  if (playBtn && !playBtn.dataset.bound) {
    playBtn.dataset.bound = "true";
    playBtn.addEventListener("click", toggleAnimaticPlay);
  }
  if (nextBtn && !nextBtn.dataset.bound) {
    nextBtn.dataset.bound = "true";
    nextBtn.addEventListener("click", () => goToAnimaticStep(animaticState.currentStep + 1));
  }
  if (lastBtn && !lastBtn.dataset.bound) {
    lastBtn.dataset.bound = "true";
    lastBtn.addEventListener("click", () => goToAnimaticStep(animaticState.steps.length - 1));
  }
  if (resetBtn && !resetBtn.dataset.bound) {
    resetBtn.dataset.bound = "true";
    resetBtn.addEventListener("click", () => {
      stopAnimaticPlayback();
      goToAnimaticStep(0);
    });
  }

  // Speed controls
  document.querySelectorAll(".animatic-speed-btn").forEach(btn => {
    if (!btn.dataset.bound) {
      btn.dataset.bound = "true";
      btn.addEventListener("click", () => {
        document.querySelectorAll(".animatic-speed-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        animaticState.speed = Number(btn.dataset.speed) || 1;
        if (animaticState.isPlaying) {
          stopAnimaticPlayback();
          toggleAnimaticPlay();
        }
      });
    }
  });

  // Scrubber click
  const scrubber = $("animaticProgressTrack");
  if (scrubber && !scrubber.dataset.bound) {
    scrubber.dataset.bound = "true";
    scrubber.addEventListener("click", event => {
      if (!animaticState.steps.length) return;
      const rect = scrubber.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const stepIdx = Math.round(fraction * (animaticState.steps.length - 1));
      goToAnimaticStep(stepIdx);
    });
  }

  // 12. Global Delegation for .daily-question-card, .btn-review-mentor, and .btn-import-source-quick
  if (!document.body.dataset.mentorDelegationBound) {
    document.body.dataset.mentorDelegationBound = "true";
    document.body.addEventListener("click", event => {
      if (event.target.closest("a.question-leetcode-link")) return;
      const importQuickBtn = event.target.closest(".btn-import-source-quick");
      const card = event.target.closest(".daily-question-card");
      const btn = event.target.closest(".btn-review-mentor");
      if (!card && !btn && !importQuickBtn) return;
      const targetEl = importQuickBtn || btn || card;
      event.preventDefault();
      openAiCodeMentorWorkspace({
        slug: targetEl.dataset.reviewSlug || card?.dataset.reviewSlug || "",
        title: targetEl.dataset.reviewTitle || card?.dataset.reviewTitle || "LeetCode Problem",
        difficulty: targetEl.dataset.reviewDiff || card?.dataset.reviewDiff || "Medium",
        status: targetEl.dataset.reviewStatus || card?.dataset.reviewStatus || "Accepted",
        language: targetEl.dataset.reviewLang || card?.dataset.reviewLang || "python3",
        url: targetEl.dataset.reviewUrl || card?.dataset.reviewUrl || "",
        attemptsCount: Number(targetEl.dataset.reviewAttempts || card?.dataset.reviewAttempts) || 1,
        frontendId: targetEl.dataset.frontendId || card?.dataset.frontendId || "",
        submissionId: targetEl.dataset.submissionId || card?.dataset.submissionId || null
      });
      if (importQuickBtn) {
        setTimeout(() => openImportCodeModal(), 120);
      }
    });
  }

  // 13. Restore mentor workspace on refresh if previous session was in AI Mentor
  try {
    const savedWs = sessionStorage.getItem("dsaverse_mentor_workspace");
    if (savedWs) {
      const parsedWs = JSON.parse(savedWs);
      if (parsedWs && (parsedWs.submissionId || parsedWs.slug || parsedWs.title)) {
        if (location.pathname.includes("mentor") || location.hash.includes("mentor") || activePage === "aimentor") {
          openAiCodeMentorWorkspace(parsedWs);
        }
      }
    }
  } catch {}
}

initializeAiCodeMentor();
initializeApp();
