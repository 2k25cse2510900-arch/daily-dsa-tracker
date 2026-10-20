
"use strict";

/* =========================================================
   DSA ADMIN DASHBOARD
   File: script.js
   ========================================================= */

const STORAGE_KEY = "dsaAdminDashboard_v1";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const STATUS_ORDER = ["blank", "done", "absent"];

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
  return state.members.filter(member => {
    const values = kind === "daily" ? getDaily(member.id) : getConcepts(member.id);
    return countDone(values) === total;
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
        <span class="achievement-score">${total}/${total}</span>
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
  const podiumHeight = rank === 1 ? 116 : rank === 2 ? 94 : 78;
  const safeName = escapeHTML(member.name);
  const dailyDone = member.dailyDone;
  const conceptsDone = member.conceptsDone;
  return `<article class="winner-card winner-rank-${rank}" style="--pedestal-height:${podiumHeight}px">
    <div class="champion-tower">
      <div class="champion-pedestal">
        <span class="podium-place">${rank === 1 ? "CHAMPION" : rank === 2 ? "RUNNER UP" : "THIRD PLACE"}</span>
        <h4>${safeName}</h4>
        <strong class="winner-score">${score}/8 <small>points</small></strong>
        <div class="winner-progress ${percent.tone}"><span style="--progress:${percent.progress}%"></span></div>
        ${perfectBadgeMarkup(percent)}
        <div class="winner-details"><span>${dailyDone}/6 daily</span><span>${conceptsDone}/2 concepts</span></div>
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
  if (!(source || state.members).length) {
    container.innerHTML = '<p class="arena-achievement-empty">No member data is available for this week yet.</p>';
    return;
  }
  const members = source || state.members.map(member => ({ member, stats: memberStats(member.id), daily: getDaily(member.id) }));
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
    { title: "Perfect Week", detail: "8/8 tracked tasks · 100%", icon: "✦", winners: members.filter(item => item.stats.percent === 100).map(item => `${escapeHTML(item.member.name)} · 8/8 (100%)`), empty: "No 100% completions recorded." },
    { title: "Consistency Champion", detail: "Highest verified completion", icon: "◎", winners: champions.map(item => `${escapeHTML(item.member.name)} · ${item.stats.percent}% (${item.stats.overallDone}/8)`), empty: "Completion data is unavailable." },
    { title: "Daily Champion", detail: "6/6 daily submissions", icon: "⌁", winners: members.filter(item => item.stats.dailyDone === 6).map(item => `${escapeHTML(item.member.name)} · 6/6 daily`), empty: "No complete daily sets yet." },
    { title: "Concept Master", detail: "2/2 concept proofs", icon: "⌘", winners: members.filter(item => item.stats.conceptsDone === 2).map(item => `${escapeHTML(item.member.name)} · 2/2 concepts`), empty: "No complete concept sets yet." },
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

  for (let weekNumber = 1; weekNumber <= 12; weekNumber++) {
    for (const member of state.members) {
      ensureMemberWeek(weekNumber, member.id);
    }
  }

  if (!Number.isInteger(state.currentWeek) ||
      state.currentWeek < 1 ||
      state.currentWeek > 12) {
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
    total += countDone(getDaily(member.id));
    total += countDone(getConcepts(member.id));
  }

  return total;
}

function totalPossible() {
  return state.members.length * (DAYS.length + 2);
}

function percentage(done, possible) {
  return possible ? Math.round((done / possible) * 100) : null;
}

function memberStats(memberId) {
  const daily = getDaily(memberId);
  const concepts = getConcepts(memberId);

  const dailyDone = countDone(daily);
  const conceptsDone = countDone(concepts);
  const overallDone = dailyDone + conceptsDone;

  const possible = DAYS.length + 2;
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

/* -------------------- WEEK SELECTOR -------------------- */

function initializeWeekSelector() {
  const select = $("weekSelect");
  select.innerHTML = "";

  for (let week = 1; week <= 12; week++) {
    const option = document.createElement("option");
    option.value = String(week);
    option.textContent = "Week " + week;
    select.appendChild(option);
  }

  select.value = String(currentWeek);

  select.addEventListener("change", () => {
    currentWeek = Number(select.value);
    state.currentWeek = currentWeek;

    if (!isAdmin) {
      navigatePage(activePage).catch(error => showToast(error.message, "error"));
      return;
    }

    ensureAllData();
    saveState();
    renderAll();

    showToast("Switched to Week " + currentWeek);
  });
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
        const values = getDaily(memberId);
        values[index] = cycleStatus(values[index]);
      } else {
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
        ${DAYS.map(day => `<th>${day.toUpperCase()}</th>`).join("")}
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
    const isComplete = countDone(daily) === DAYS.length;

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
      html += `
        <td>
          ${statusButton(status, {
            "data-status-kind": "daily",
            "data-member-id": member.id,
            "data-index": index
          })}
        </td>
      `;
    });

    html += `
        <td><span class="status-badge ${isComplete ? "done" : "partial"}">${countDone(daily)}/6${isComplete ? " complete" : ""}</span></td>
      </tr>
    `;
  }

  html += "</tbody>";
  table.innerHTML = html;

  bindStatusButtons(table);
  $("dailyAchievements").innerHTML = renderAchievementCards("daily", DAYS.length, "Every daily submission is complete.");

  const allDaily = state.members.flatMap(member => getDaily(member.id));
  $("dailyCount").textContent =
    `${countDone(allDaily)} completed · ${countAbsent(allDaily)} not submitted · ${allDaily.filter(value => value === "blank").length} unmarked`;
}

/* -------------------- CONCEPTS TRACKER -------------------- */

function renderConceptTable() {
  const table = $("conceptTable");

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
    const isComplete = countDone(concepts) === 2;

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
          ${statusButton(status, {
            "data-status-kind": "concepts",
            "data-member-id": member.id,
            "data-index": index
          })}
        </td>
      `;
    });

    html += `
        <td><span class="status-badge ${isComplete ? "done" : "partial"}">${countDone(concepts)}/2${isComplete ? " complete" : ""}</span></td>
      </tr>
    `;
  }

  html += "</tbody>";
  table.innerHTML = html;

  bindStatusButtons(table);
  $("conceptAchievements").innerHTML = renderAchievementCards("concepts", 2, "Both weekly concepts are complete.");

  const allConcepts = state.members.flatMap(member => getConcepts(member.id));
  $("conceptCount").textContent =
    `${countDone(allConcepts)} proofs completed · ${countAbsent(allConcepts)} not submitted · ${allConcepts.filter(value => value === "blank").length} unmarked`;
}

/* -------------------- OVERVIEW STATS -------------------- */

function renderStats() {
  const totalMembers = state.members.length;
  const done = countAllDone();
  const possible = totalPossible();
  const allStatuses = state.members.flatMap(member => [
    ...getDaily(member.id),
    ...getConcepts(member.id)
  ]);

  const dailyStatuses = state.members.flatMap(member => getDaily(member.id));
  const conceptStatuses = state.members.flatMap(member => getConcepts(member.id));

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
      value: `${dailyDone}/${totalMembers * DAYS.length}`,
      description: "Completed this week",
      icon: "daily",
      color: "green"
    },
    {
      label: "Concept proofs",
      value: `${conceptsDone}/${totalMembers * 2}`,
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

  $("weekChip").textContent = "WEEK " + currentWeek;
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
        <td>${stats.dailyDone}/6</td>
        <td>${stats.conceptsDone}/2</td>
        <td>${stats.overallDone}/8 (${stats.percent}%) ${perfectBadgeMarkup(consistencyPresentation(stats.percent))}</td>
        <td><span class="status-badge ${label.className}">${label.text}</span></td>
      </tr>
    `;
  }).join("");
}

/* -------------------- MEMBERS MANAGEMENT -------------------- */

function renderMembers() {
  const container = $("memberManager");
  $("memberCountTag").textContent = `${state.members.length} MEMBER${state.members.length === 1 ? "" : "S"}`;

  if (!state.members.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>No members registered</strong>
        Use the form above to add a member.
      </div>
    `;
    return;
  }

  container.innerHTML = state.members.map((member, index) => {
    const stats = isAdmin ? memberStats(member.id) : null;
    const consistency = stats ? consistencyPresentation(stats.percent) : null;
    const progressMarkup = stats ? `
      <div class="member-progress ${consistency.tone}" role="progressbar" aria-label="${stats.overallDone} of 8 weekly tasks complete" aria-valuemin="0" aria-valuemax="8" aria-valuenow="${stats.overallDone}">
        <span>${stats.overallDone}/8</span>
        <div class="member-progress-track ${consistency.tone}"><i style="width:${consistency.progress}%"></i></div>
        ${perfectBadgeMarkup(consistency)}
      </div>` : "";
    return `
      <article class="managed-member">
        <span class="member-avatar">${escapeHTML(getInitials(member.name))}</span>
        <div class="member-info">
          <strong>${escapeHTML(member.name)}</strong>
          <small>${escapeHTML(member.role || `Member ${index + 1}`)}</small>
        </div>
        ${progressMarkup}
        <div class="member-actions">
          <button class="icon-btn" type="button"
            data-member-action="rename" data-member-id="${member.id}"
            aria-label="Rename ${escapeHTML(member.name)}" title="Rename">${iconMarkup("edit")}</button>
          <button class="icon-btn danger" type="button"
            data-member-action="remove" data-member-id="${member.id}"
            aria-label="Remove ${escapeHTML(member.name)}" title="Remove">${iconMarkup("remove")}</button>
        </div>
      </article>`;
  }).join("");

  container.querySelectorAll("[data-member-action]").forEach(button => {
    button.addEventListener("click", () => {
      const memberId = button.dataset.memberId;
      const action = button.dataset.memberAction;
      const member = state.members.find(item => item.id === memberId);

      if (!member) return;

      if (action === "rename") renameMember(member);
      if (action === "remove") removeMember(member);
    });
  });
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

  for (let week = 1; week <= 12; week++) {
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

    $("weekSelect").value = String(currentWeek);
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
  $("leaderboardWeek").textContent = `WEEK ${data.week}`;
  $("leaderboardSummary").innerHTML = `
    <div class="leaderboard-stat"><span>PARTICIPANTS</span><strong>${data.participants}</strong></div>
    <div class="leaderboard-stat"><span>HIGHEST SCORE</span><strong>${data.highest}/8</strong></div>
    <div class="leaderboard-stat"><span>QUALIFIED</span><strong>${data.qualified}</strong></div>`;
  const qualified = data.members.filter(member => member.qualified && member.rank <= 3);
  const podium = $("leaderboardPodium");
  podium.dataset.podiumKey = qualified.length ? `leaderboard:${data.week}:${qualified.map(member => `${member.rank}:${member.name}:${member.score}`).join("|")}` : "";
  podium.innerHTML = qualified.map(member => podiumCard(member, member.rank, member.score)).join("") || `<div class="leaderboard-empty">No members have qualified yet. Complete at least 6 of 8 tasks to appear on the podium.</div>`;
  $("leaderboardRows").innerHTML = data.members.map(member => {
    const rankCell = member.qualified ? rankBadgeMarkup(member.rank) : `<span class="leaderboard-unqualified">Keep Going</span>`;
    const className = member.qualified && member.rank <= 3 ? `leaderboard-rank-${member.rank}` : "";
    const value = consistencyPresentation(member.percent);
    return `<tr class="${className}"><td>${rankCell}</td><td><strong>${escapeHTML(member.name)}</strong></td><td>${member.dailyDone}/6</td><td>${member.conceptsDone}/2</td><td><strong>${member.score}/8</strong></td><td>${consistencyMeterMarkup(member.percent, `${member.name} completion`)}<small class="${value.tone}">${value.text} ${perfectBadgeMarkup(value)}</small></td></tr>`;
  }).join("") || `<tr><td colspan="6">No members yet.</td></tr>`;
}

function renderLeaderboard() {
  if (!isAdmin && viewerPageData?.page === "leaderboard") {
    return renderViewerLeaderboard(viewerPageData);
  }
  const tbody = $("leaderboardRows");
  const podium = $("leaderboardPodium");
  const eligibleMinimum = 6;
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
  $("leaderboardSummary").innerHTML = `
    <div class="leaderboard-stat"><span>PARTICIPANTS</span><strong>${participants}</strong></div>
    <div class="leaderboard-stat"><span>HIGHEST SCORE</span><strong>${highest}/8</strong></div>
    <div class="leaderboard-stat"><span>QUALIFIED</span><strong>${eligible.length}</strong></div>
  `;

  if (!participants) {
    podium.innerHTML = `<div class="leaderboard-empty">No members yet. Add members from the Members page to start the rankings.</div>`;
    tbody.innerHTML = `<tr><td colspan="6">No members yet.</td></tr>`;
    return;
  }

  const podiumMembers = eligible.filter(member => member.rank <= 3);
  podium.dataset.podiumKey = podiumMembers.length ? `leaderboard:${currentWeek}:${podiumMembers.map(member => `${member.rank}:${member.name}:${member.overallDone}`).join("|")}` : "";
  podium.innerHTML = podiumMembers.map(member => podiumCard(member, member.rank, member.overallDone)).join("") || `<div class="leaderboard-empty">No members have qualified yet. Complete at least 6 of 8 tasks to appear on the podium.</div>`;

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
        <td>${member.dailyDone}/6</td>
        <td>${member.conceptsDone}/2</td>
        <td><strong>${member.overallDone}/8</strong></td>
        <td>${consistencyMeterMarkup(member.percent, `${member.name} completion`)}<small class="${value.tone}">${value.text} ${perfectBadgeMarkup(value)}</small></td>
      </tr>
    `;
  }).join("");
}/* -------------------- WEEKLY REPORT -------------------- */

function renderReport() {
  const report = $("printReport");
  const totalMembers = state.members.length;
  const possible = totalPossible();
  const done = countAllDone();

  const dailyStatuses = state.members.flatMap(member => getDaily(member.id));
  const conceptStatuses = state.members.flatMap(member => getConcepts(member.id));

  const dailyDone = countDone(dailyStatuses);
  const conceptDone = countDone(conceptStatuses);

  const reportRows = state.members.map(member => {
    const stats = memberStats(member.id);
    const label = overallLabel(stats);
    const consistency = consistencyPresentation(stats.percent);

    return `
      <tr class="${stats.overallDone === stats.possible ? "report-perfect-row" : ""}">
        <td>${escapeHTML(member.name)}</td>
        <td>${stats.dailyDone}/6</td>
        <td>${stats.conceptsDone}/2</td>
        <td>${stats.overallDone}/8</td>
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
        <strong>${dailyDone}/${totalMembers * DAYS.length}</strong>
      </div>
      <div class="report-stat">
        <span>Concept Proofs</span>
        <strong>${conceptDone}/${totalMembers * 2}</strong>
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
let sharedReady = false;
let activePage = "overview";
let viewerPageData = null;
let localSnapshot = null;
let sessionExpiryTimer = null;
let sessionExpiresAt = 0;

function expireLocalSession() {
  sessionExpiresAt = 0;
  isAdmin = false;
  sharedReady = false;
  clearViewerData();
  $("securityGate").hidden = true;
  setRoleUI();
  showToast("Your session expired. Sign in again to edit the dashboard.", "error");
}

function resetSessionExpiry() {
  clearTimeout(sessionExpiryTimer);
  sessionExpiresAt = Date.now() + 8 * 60 * 60 * 1000;
  sessionExpiryTimer = setTimeout(expireLocalSession, 8 * 60 * 60 * 1000);
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && sessionExpiresAt && Date.now() >= sessionExpiresAt) expireLocalSession();
});

async function apiRequest(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options, headers: { ...(options.headers || {}), ...(options.body ? { "Content-Type": "application/json" } : {}) } });
  resetSessionExpiry();
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && isAdmin) expireLocalSession();
    throw Object.assign(new Error(body.error || "Request failed."), { status: response.status, body });
  }
  return body;
}

function setRoleUI() {
  $("loginBtn").hidden = isAdmin;
  $("logoutBtn").hidden = !isAdmin;
  $("adminModeIndicator").hidden = !isAdmin;
  document.querySelectorAll(".admin-only").forEach(control => { control.hidden = !isAdmin; });
  $("addMemberForm").hidden = !isAdmin;
  document.querySelectorAll(".bulk-actions, #clearDailyBtn, #clearConceptsBtn, #markAllDoneBtn, #markAllBlankBtn").forEach(control => { control.hidden = !isAdmin; });
  document.querySelectorAll("#dailyTable button, #conceptTable button, #addMemberForm input, #addMemberForm button, #clearDailyBtn, #clearConceptsBtn, #markAllDoneBtn, #markAllBlankBtn").forEach(control => { control.disabled = !isAdmin; });
  document.querySelectorAll("[data-member-action]").forEach(control => { control.hidden = !isAdmin; });
  if (!isAdmin) {
    $("restoreAction")?.setAttribute("hidden", "");
  } else {
    $("restoreAction")?.removeAttribute("hidden");
  }
}

function setSecurityGate(message, canImport = false) {
  const gate = $("securityGate");
  gate.hidden = false;
  gate.innerHTML = `<strong>${escapeHTML(message)}</strong>${canImport ? '<button class="btn btn-primary" id="importLocalDataBtn" type="button">Import this browser’s existing data</button>' : ""}`;
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
  const data = await apiRequest("/api/data");
  state = { members: data.members, weeks: data.weeks, currentWeek: data.currentWeek };
  currentWeek = state.currentWeek;
  sharedReady = true;
  $("weekSelect").value = String(currentWeek);
  ensureAllData();
  renderAll();
}

function clearViewerData() {
  state = { members: [], weeks: {}, currentWeek };
  viewerPageData = null;
  ["statsGrid", "memberSummary", "previewRows", "dailyTable", "conceptTable", "dailyAchievements", "conceptAchievements", "memberManager", "leaderboardRows", "leaderboardPodium", "leaderboardSummary", "printReport"].forEach(id => { if ($(id)) $(id).innerHTML = ""; });
  ["memberCountTag", "dailyCount", "conceptCount"].forEach(id => { if ($(id)) $(id).textContent = ""; });
}

function renderViewerOverview(data) {
  const members = data.participants;
  const dailyPossible = members * 6;
  const conceptsPossible = members * 2;
  const overallPossible = members * 8;
  const completed = data.dailyDone + data.conceptsDone;
  const stats = [
    ["Group members", members, "Registered members", "blue"],
    ["Daily submissions", `${data.dailyDone}/${dailyPossible}`, "Completed this week", "green"],
    ["Concept proofs", `${data.conceptsDone}/${conceptsPossible}`, "Completed this week", "purple"],
    ["Overall completion", `${overallPossible ? Math.round(completed / overallPossible * 100) : "N/A"}${overallPossible ? "%" : ""}`, "This week's progress", "orange"]
  ];
  $("statsGrid").innerHTML = stats.map(([label, value, description, color]) => `<article class="stat-card ${color}"><div class="stat-label">${label}</div><div class="stat-value">${value}</div><div class="stat-description">${description}</div></article>`).join("");
  $("weekChip").textContent = `WEEK ${data.week}`;
  $("memberSummary").innerHTML = data.summary.map(member => {
    const value = consistencyPresentation(member.percent);
    return `<div class="member-summary-row ${value.tone}"><span class="member-summary-name">${escapeHTML(member.name)}</span><div class="member-summary-track">${consistencyMeterMarkup(member.percent, `${member.name} weekly consistency`)}</div><span class="member-summary-percent ${value.tone}">${value.text} ${perfectBadgeMarkup(value)}</span></div>`;
  }).join("") || `<div class="empty-state">No members yet.</div>`;
  $("previewRows").innerHTML = data.summary.map(member => `<tr><td>${escapeHTML(member.name)}</td><td>${member.dailyDone}/6</td><td>${member.conceptsDone}/2</td><td>${member.overallDone}/8 (${member.percent}%) ${perfectBadgeMarkup(consistencyPresentation(member.percent))}</td><td>${member.overallDone === 8 ? "Complete" : member.overallDone ? "In progress" : "Not marked"}</td></tr>`).join("") || `<tr><td colspan="5">No members yet.</td></tr>`;
  renderArenaAchievements(data.summary.map(member => ({ member, stats: member, daily: [] })));
}

async function navigatePage(page) {
  if (isAdmin) { showPage(page); return true; }
  if (!PAGE_INFO[page]) return;
  clearViewerData();
  const query = new URLSearchParams({ week: String(currentWeek) });
  try {
    const data = await apiRequest(`/api/page-data/${encodeURIComponent(page)}?${query}`);
    viewerPageData = data;
    if (page === "overview") renderViewerOverview(data);
    if (page === "leaderboard") renderViewerLeaderboard(data);
    if (page === "daily" || page === "concepts") {
      const weekData = page === "daily" ? { daily: data.statuses, concepts: {} } : { daily: {}, concepts: data.statuses };
      state = { members: data.members, weeks: { [String(data.week)]: weekData }, currentWeek: data.week };
      if (page === "daily") renderDailyTable(); else renderConceptTable();
    }
    if (page === "members") { state = { members: data.members, weeks: {}, currentWeek }; renderMembers(); }
    if (page === "report") {
      state = { members: data.members, weeks: { [String(data.week)]: { daily: data.statuses.daily, concepts: data.statuses.concepts } }, currentWeek: data.week };
      renderReport();
    }
    showPage(page);
    setRoleUI();
    return true;
  } catch (error) {
    setSecurityGate(error.message);
    return false;
  }
}

function initializeSecurityControls() {
  const dialog = $("loginDialog");
  const formElement = $("loginForm");
  $("loginBtn").addEventListener("click", () => { $("loginError").textContent = ""; dialog.showModal(); });
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
      await apiRequest("/api/admin/login", { method: "POST", body: JSON.stringify({ username: form.get("username"), password: form.get("password") }) });
      isAdmin = true;
      setRoleUI();
      formElement.reset();
      $("adminPassword").type = "password";
      $("togglePassword").textContent = "Show";
      $("loginDialog").close();
      try {
        await loadSharedData();
        showToast("Signed in as Krish.");
      } catch (error) {
        if (error.status !== 404) throw error;
        localSnapshot = loadState();
        state = localSnapshot;
        currentWeek = state.currentWeek || 1;
        ensureAllData();
        $("weekSelect").value = String(currentWeek);
        $("loginDialog").close();
        renderAll();
        setSecurityGate("Shared data is not initialized. Import this browser's existing data to preserve it.", true);
      }
    } catch (error) { $("loginError").textContent = error.message; }
    finally { submit.disabled = false; submit.textContent = "Login & Continue"; }
  });
  $("logoutBtn").addEventListener("click", async () => {
    await apiRequest("/api/logout", { method: "POST", body: "{}" });
    isAdmin = false;
    sharedReady = false;
    window.location.reload();
  });
}

async function initializeApp() {
  // Do not inherit a restored scroll offset when the dashboard first opens.
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  initializeWeekSelector();
  initializeSecurityControls();
  try {
    const session = await apiRequest("/api/session");
    isAdmin = session.authenticated;
    setRoleUI();
    if (isAdmin) try {
      await loadSharedData();
      $("securityGate").hidden = true;
    } catch (error) {
      if (error.status === 404) {
        localSnapshot = loadState();
        state = localSnapshot;
        currentWeek = state.currentWeek || 1;
        ensureAllData();
        $("weekSelect").value = String(currentWeek);
        renderAll();
        setSecurityGate("Shared data is not initialized. Import this browser’s existing data to preserve it, or use the admin import endpoint.", true);
      } else {
        setSecurityGate(error.message);
      }
    } else {
      state = { members: [], weeks: {}, currentWeek };
      const loaded = await navigatePage("overview");
      if (loaded) $("securityGate").hidden = true;
    }
  } catch (error) {
    setSecurityGate("Secure server unavailable. Start the dashboard server; local-only mode is disabled.");
    console.error("Dashboard security initialization failed:", error.message);
  }
}

initializeApp();
