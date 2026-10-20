
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

/* -------------------- HELPERS -------------------- */

function $(id) {
  return document.getElementById(id);
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
  return possible ? Math.round((done / possible) * 100) : 0;
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

  window.scrollTo({ top: 0, behavior: "smooth" });
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
      symbol: "✓",
      className: "done"
    };
  }

  if (status === "absent") {
    return {
      label: "Not submitted",
      symbol: "×",
      className: "absent"
    };
  }

  return {
    label: "Not marked",
    symbol: "·",
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

    html += `
      <tr>
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
        <td><span class="status-badge done">${countDone(daily)}/6</span></td>
      </tr>
    `;
  }

  html += "</tbody>";
  table.innerHTML = html;

  bindStatusButtons(table);

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

    html += `
      <tr>
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
        <td><span class="status-badge done">${countDone(concepts)}/2</span></td>
      </tr>
    `;
  }

  html += "</tbody>";
  table.innerHTML = html;

  bindStatusButtons(table);

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
      icon: "♙",
      color: "blue"
    },
    {
      label: "Daily submissions",
      value: `${dailyDone}/${totalMembers * DAYS.length}`,
      description: "Completed this week",
      icon: "✓",
      color: "green"
    },
    {
      label: "Concept proofs",
      value: `${conceptsDone}/${totalMembers * 2}`,
      description: "Completed this week",
      icon: "▤",
      color: "purple"
    },
    {
      label: "Overall completion",
      value: `${percentage(done, possible)}%`,
      description: `${marked} statuses marked`,
      icon: "↗",
      color: "orange"
    }
  ];

  $("statsGrid").innerHTML = cards.map(card => `
    <article class="stat-card ${card.color}">
      <div class="stat-label">${card.label}</div>
      <div class="stat-icon">${card.icon}</div>
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
    let fillClass = "";

    if (stats.percent >= 75) fillClass = "good";
    else if (stats.percent < 35) fillClass = "low";

    return `
      <div class="member-summary-row">
        <span class="member-summary-name" title="${escapeHTML(member.name)}">
          ${escapeHTML(member.name)}
        </span>
        <div class="progress-track" aria-label="${stats.percent}% complete">
          <div class="progress-fill ${fillClass}" style="width:${stats.percent}%"></div>
        </div>
        <span class="member-summary-percent">${stats.percent}%</span>
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
        <td>${stats.overallDone}/8 (${stats.percent}%)</td>
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

  container.innerHTML = state.members.map((member, index) => `
    <article class="managed-member">
      <span class="member-avatar">${escapeHTML(getInitials(member.name))}</span>
      <div class="member-info">
        <strong>${escapeHTML(member.name)}</strong>
        <small>${escapeHTML(member.role || `Member ${index + 1}`)}</small>
      </div>
      <div class="member-actions">
        <button class="icon-btn" type="button"
          data-member-action="rename" data-member-id="${member.id}"
          aria-label="Rename ${escapeHTML(member.name)}" title="Rename">✎</button>
        <button class="icon-btn danger" type="button"
          data-member-action="remove" data-member-id="${member.id}"
          aria-label="Remove ${escapeHTML(member.name)}" title="Remove">×</button>
      </div>
    </article>
  `).join("");

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
  const medals = { 1: "\u{1F947}", 2: "\u{1F948}", 3: "\u{1F949}" };
  $("leaderboardWeek").textContent = `WEEK ${data.week}`;
  $("leaderboardSummary").innerHTML = `
    <div class="leaderboard-stat"><span>PARTICIPANTS</span><strong>${data.participants}</strong></div>
    <div class="leaderboard-stat"><span>HIGHEST SCORE</span><strong>${data.highest}/8</strong></div>
    <div class="leaderboard-stat"><span>QUALIFIED</span><strong>${data.qualified}</strong></div>`;
  const qualified = data.members.filter(member => member.qualified && member.rank <= 3);
  $("leaderboardPodium").innerHTML = qualified.map(member => `
    <article class="winner-card winner-rank-${member.rank}">
      <div class="winner-medal">${medals[member.rank]} <span>RANK ${member.rank}</span></div>
      <h4>${escapeHTML(member.name)}</h4><strong class="winner-score">${member.score}/8 <small>points</small></strong>
      <div class="winner-progress"><span style="--progress:${member.percent}%"></span></div>
      <div class="winner-details"><span>${member.dailyDone}/6 daily</span><span>${member.conceptsDone}/2 concepts</span></div>
      <span class="winner-percent">${member.percent}% complete</span>
    </article>`).join("") || `<div class="leaderboard-empty">No members have qualified yet. Complete at least 6 of 8 tasks to appear on the podium.</div>`;
  $("leaderboardRows").innerHTML = data.members.map(member => {
    const medal = member.rank && medals[member.rank] ? medals[member.rank] + " " : "";
    const rankCell = member.qualified ? `<span class="leaderboard-rank">${medal}${member.rank}</span>` : `<span class="leaderboard-unqualified">Keep Going</span>`;
    const className = member.qualified && member.rank <= 3 ? `leaderboard-rank-${member.rank}` : "";
    return `<tr class="${className}"><td>${rankCell}</td><td><strong>${escapeHTML(member.name)}</strong></td><td>${member.dailyDone}/6</td><td>${member.conceptsDone}/2</td><td><strong>${member.score}/8</strong></td><td><div class="table-progress"><span style="--progress:${member.percent}%"></span></div><small>${member.percent}%</small></td></tr>`;
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

  const medals = { 1: "\u{1F947}", 2: "\u{1F948}", 3: "\u{1F949}" };
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

  podium.innerHTML = eligible.filter(member => member.rank <= 3).map(member => `
    <article class="winner-card winner-rank-${member.rank}">
      <div class="winner-medal">${medals[member.rank]} <span>RANK ${member.rank}</span></div>
      <h4>${escapeHTML(member.name)}</h4>
      <strong class="winner-score">${member.overallDone}/8 <small>points</small></strong>
      <div class="winner-progress"><span style="--progress:${member.percent}%"></span></div>
      <div class="winner-details"><span>${member.dailyDone}/6 daily</span><span>${member.conceptsDone}/2 concepts</span></div>
      <span class="winner-percent">${member.percent}% complete</span>
    </article>
  `).join("") || `<div class="leaderboard-empty">No members have qualified yet. Complete at least 6 of 8 tasks to appear on the podium.</div>`;

  tbody.innerHTML = rankings.map(member => {
    const isEligible = member.overallDone >= eligibleMinimum;
    const rank = isEligible ? member.rank : null;
    const medal = rank && medals[rank] ? `${medals[rank]} ` : "";
    const placeClass = rank && rank <= 3 ? ` leaderboard-rank-${rank}` : "";
    return `
      <tr class="${placeClass.trim()}">
        <td>${rank ? `<span class="leaderboard-rank">${medal}${rank}</span>` : `<span class="leaderboard-unqualified">Keep Going</span>`}</td>
        <td><strong>${escapeHTML(member.name)}</strong></td>
        <td>${member.dailyDone}/6</td>
        <td>${member.conceptsDone}/2</td>
        <td><strong>${member.overallDone}/8</strong></td>
        <td><div class="table-progress"><span style="--progress:${member.percent}%"></span></div><small>${member.percent}%</small></td>
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

    return `
      <tr>
        <td>${escapeHTML(member.name)}</td>
        <td>${stats.dailyDone}/6</td>
        <td>${stats.conceptsDone}/2</td>
        <td>${stats.overallDone}/8</td>
        <td>${stats.percent}%</td>
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
        <strong>${percentage(done, possible)}%</strong>
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
  renderPreview();
  renderDailyTable();
  renderConceptTable();
  renderMembers();
  renderLeaderboard();
  renderReport();
  setRoleUI();
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
  ["statsGrid", "memberSummary", "previewRows", "dailyTable", "conceptTable", "memberManager", "leaderboardRows", "leaderboardPodium", "leaderboardSummary", "printReport"].forEach(id => { if ($(id)) $(id).innerHTML = ""; });
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
    ["Overall completion", `${overallPossible ? Math.round(completed / overallPossible * 100) : 0}%`, "This week's progress", "orange"]
  ];
  $("statsGrid").innerHTML = stats.map(([label, value, description, color]) => `<article class="stat-card ${color}"><div class="stat-label">${label}</div><div class="stat-value">${value}</div><div class="stat-description">${description}</div></article>`).join("");
  $("weekChip").textContent = `WEEK ${data.week}`;
  $("memberSummary").innerHTML = data.summary.map(member => `<div class="member-summary-row"><span class="member-summary-name">${escapeHTML(member.name)}</span><div class="progress-track"><div class="progress-fill" style="width:${member.percent}%"></div></div><span class="member-summary-percent">${member.percent}%</span></div>`).join("") || `<div class="empty-state">No members yet.</div>`;
  $("previewRows").innerHTML = data.summary.map(member => `<tr><td>${escapeHTML(member.name)}</td><td>${member.dailyDone}/6</td><td>${member.conceptsDone}/2</td><td>${member.overallDone}/8 (${member.percent}%)</td><td>${member.overallDone === 8 ? "Complete" : member.overallDone ? "In progress" : "Not marked"}</td></tr>`).join("") || `<tr><td colspan="5">No members yet.</td></tr>`;
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
