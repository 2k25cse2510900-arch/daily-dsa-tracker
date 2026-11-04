"use strict";
const fs = require("fs");
const path = require("path");

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const crlf = content.includes("\r\n");
  const EOL = crlf ? "\r\n" : "\n";

  // 1. Patch selectActiveGroup
  const oldSelect = `async function selectActiveGroup(groupId) {
  try {
    await apiRequest("/api/groups/active", { method: "POST", body: JSON.stringify({ groupId }) });
    groupManagementState.activeGroupId = groupId;
    await loadGroupManagement();
    await loadGroupMembers(groupId);
  } catch (error) { groupManagementMessage(error.message); }
}`.replace(/\r?\n/g, EOL);

  const newSelect = `async function selectActiveGroup(groupId) {
  try {
    await apiRequest("/api/groups/active", { method: "POST", body: JSON.stringify({ groupId }) });
    groupManagementState.activeGroupId = groupId;
    clearViewerData();
    state.members = [];
    state.weeks = {};
    arenaCurrentState = null;
    await loadGroupManagement();
    await loadGroupMembers(groupId);
    await loadSharedData(groupId);
    if (activePage && activePage !== "members") {
      await navigatePage(activePage);
    }
  } catch (error) { groupManagementMessage(error.message); }
}`.replace(/\r?\n/g, EOL);

  if (!content.includes(oldSelect)) {
    console.error("Could not find selectActiveGroup in " + filePath);
    process.exit(1);
  }
  content = content.replace(oldSelect, newSelect);

  // 2. Patch loadSharedData
  const oldLoadShared = `async function loadSharedData() {
  const data = await apiRequest(isAdmin ? "/api/data" : "/api/member/shared-data");
  leetcodeProfiles = data.leetcode || {};
  memberFirebaseStatus = data.memberFirebaseStatus || {};
  state = { members: data.members, weeks: data.weeks, currentWeek: data.currentWeek };
  currentWeek = weekForDate(selectedCalendarDate) || state.currentWeek;
  state.currentWeek = currentWeek;
  sharedReady = true;
  ensureAllData();
  renderAll();
}`.replace(/\r?\n/g, EOL);

  const newLoadShared = `async function loadSharedData(targetGroupId) {
  const activeId = targetGroupId || groupManagementState.activeGroupId || (groupManagementState.groups[0]?.id) || null;
  if (!isAdmin && !activeId) {
    state = { members: [], weeks: {}, currentWeek: 1 };
    leetcodeProfiles = {};
    memberFirebaseStatus = {};
    sharedReady = true;
    renderAll();
    return;
  }
  const path = isAdmin ? "/api/data" : (activeId ? \`/api/member/shared-data?groupId=\${encodeURIComponent(activeId)}\` : "/api/member/shared-data");
  try {
    const data = await apiRequest(path);
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
}`.replace(/\r?\n/g, EOL);

  if (!content.includes(oldLoadShared)) {
    console.error("Could not find loadSharedData in " + filePath);
    process.exit(1);
  }
  content = content.replace(oldLoadShared, newLoadShared);

  // 3. Patch fetchArenaLiveState
  const oldFetchArena = `async function fetchArenaLiveState() {
  try {
    const arena = await apiRequest("/api/arena/live");`.replace(/\r?\n/g, EOL);

  const newFetchArena = `async function fetchArenaLiveState() {
  try {
    const activeId = groupManagementState.activeGroupId || (groupManagementState.groups[0]?.id) || null;
    const path = activeId ? \`/api/arena/live?groupId=\${encodeURIComponent(activeId)}\` : "/api/arena/live";
    const arena = await apiRequest(path);`.replace(/\r?\n/g, EOL);

  if (!content.includes(oldFetchArena)) {
    console.error("Could not find fetchArenaLiveState in " + filePath);
    process.exit(1);
  }
  content = content.replace(oldFetchArena, newFetchArena);

  // 4. Patch navigatePage
  const oldNavigate = `async function navigatePage(page) {
  if (page === "members") {
    clearViewerData();
    const activeId = groupManagementState.activeGroupId || (groupManagementState.groups[0]?.id) || null;
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
  if (isAdmin) { showPage(page); return true; }
  if (!PAGE_INFO[page]) return;
  clearViewerData();
  const query = new URLSearchParams({ week: String(currentWeek) });
  if (page === "daily") query.set("date", selectedCalendarDate);
  try {
    const data = await apiRequest(\`/api/page-data/\${encodeURIComponent(page)}?\${query}\`);`.replace(/\r?\n/g, EOL);

  const newNavigate = `async function navigatePage(page) {
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
  if (isAdmin) { showPage(page); return true; }
  if (!PAGE_INFO[page]) return;
  clearViewerData();
  const query = new URLSearchParams({ week: String(currentWeek) });
  if (page === "daily") query.set("date", selectedCalendarDate);
  if (activeId) query.set("groupId", activeId);
  try {
    const data = await apiRequest(\`/api/page-data/\${encodeURIComponent(page)}?\${query}\`);`.replace(/\r?\n/g, EOL);

  if (!content.includes(oldNavigate)) {
    console.error("Could not find navigatePage in " + filePath);
    process.exit(1);
  }
  content = content.replace(oldNavigate, newNavigate);

  // 5. Patch login handling
  const oldLoginLoad = `      if (isMember && memberProfile) {
        await loadGroupManagement();
        if (memberProfile.groupMember) await loadSharedData();`.replace(/\r?\n/g, EOL);

  const newLoginLoad = `      if (isMember && memberProfile) {
        await loadGroupManagement();
        const activeGroupId = groupManagementState.activeGroupId || (groupManagementState.groups[0]?.id) || null;
        if (activeGroupId) {
          await loadGroupMembers(activeGroupId);
          await loadSharedData(activeGroupId);
        } else {
          state.members = [];
          renderAll();
        }`.replace(/\r?\n/g, EOL);

  if (!content.includes(oldLoginLoad)) {
    console.error("Could not find oldLoginLoad in " + filePath);
    process.exit(1);
  }
  content = content.replace(oldLoginLoad, newLoginLoad);

  // 6. Patch logoutCurrentSession
  const oldLogout = `async function logoutCurrentSession() {
  routeAvatarInstance?.unmount();
  routeAvatarInstance = null;
  memberAvatarInstance?.unmount();
  memberAvatarInstance = null;
  try {`.replace(/\r?\n/g, EOL);

  const newLogout = `async function logoutCurrentSession() {
  routeAvatarInstance?.unmount();
  routeAvatarInstance = null;
  memberAvatarInstance?.unmount();
  memberAvatarInstance = null;
  cleanupArenaPage();
  state = { members: [], weeks: {}, currentWeek: 1 };
  groupManagementState = { groups: [], activeGroupId: null, detail: null };
  arenaCurrentState = null;
  viewerPageData = null;
  try {`.replace(/\r?\n/g, EOL);

  if (!content.includes(oldLogout)) {
    console.error("Could not find oldLogout in " + filePath);
    process.exit(1);
  }
  content = content.replace(oldLogout, newLogout);

  // 7. Patch initializeApp isMember branch
  const oldInitLoad = `    } else if (isMember) {
      $("securityGate").hidden = true;
      await loadGroupManagement();
      if (memberProfile?.groupMember) await loadSharedData();`.replace(/\r?\n/g, EOL);

  const newInitLoad = `    } else if (isMember) {
      $("securityGate").hidden = true;
      await loadGroupManagement();
      const activeGroupId = groupManagementState.activeGroupId || (groupManagementState.groups[0]?.id) || null;
      if (activeGroupId) {
        await loadGroupMembers(activeGroupId);
        await loadSharedData(activeGroupId);
      } else {
        state.members = [];
        renderAll();
      }`.replace(/\r?\n/g, EOL);

  if (!content.includes(oldInitLoad)) {
    console.error("Could not find oldInitLoad in " + filePath);
    process.exit(1);
  }
  content = content.replace(oldInitLoad, newInitLoad);

  fs.writeFileSync(filePath, content, "utf8");
  console.log("Patched " + filePath + " successfully!");
}

patchFile(path.join(__dirname, "..", "script.js"));
patchFile(path.join(__dirname, "..", "public", "script.js"));
