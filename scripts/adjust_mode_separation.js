"use strict";
const fs = require("fs");
const path = require("path");

// 1. Update server.js
const serverPath = path.join(__dirname, "..", "server.js");
let serverContent = fs.readFileSync(serverPath, "utf8");
const crlfServer = serverContent.includes("\r\n");
const EOLServer = crlfServer ? "\r\n" : "\n";

serverContent = serverContent.replace(
  `    const pageMembers = groupMembers.map(m => ({\n      id: m.userId,\n      name: m.displayName,\n      role: m.role === "owner" ? "Leader" : "Member",\n      rawRole: m.role\n    }));\n    const groupDisplayName = (group.name && group.name.trim()) ? group.name.trim() : "Unnamed Group";\n    res.json({\n      groupId,\n      groupName: groupDisplayName,\n      members: pageMembers,`.replace(/\r?\n/g, EOLServer),
  `    const groupDisplayName = (group.name && group.name.trim()) ? group.name.trim() : "Unnamed Group";\n    res.json({\n      groupId,\n      groupName: groupDisplayName,\n      members: document.members.map(({ id, name, role }) => ({ id, name, role })),`.replace(/\r?\n/g, EOLServer)
);
fs.writeFileSync(serverPath, serverContent, "utf8");
console.log("Updated server.js");

// 2. Update script.js & public/script.js
function updateScript(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const crlf = content.includes("\r\n");
  const EOL = crlf ? "\r\n" : "\n";

  // Replace loadSharedData
  const oldLoad = `async function loadSharedData(targetGroupId) {
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
    const data = await apiRequest(path);`.replace(/\r?\n/g, EOL);

  const newLoad = `async function loadSharedData() {
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
    const data = await apiRequest(isAdmin ? "/api/data" : "/api/member/shared-data");`.replace(/\r?\n/g, EOL);

  if (content.includes(oldLoad)) {
    content = content.replace(oldLoad, newLoad);
  }

  // Ensure selectActiveGroup calls loadSharedData() without args
  content = content.replace(`await loadSharedData(groupId);`.replace(/\r?\n/g, EOL), `await loadSharedData();`.replace(/\r?\n/g, EOL));

  // Ensure loginLoad has loadSharedData()
  content = content.replace(`await loadSharedData(activeGroupId);`.replace(/\r?\n/g, EOL), `await loadSharedData();`.replace(/\r?\n/g, EOL));

  fs.writeFileSync(filePath, content, "utf8");
  console.log("Updated " + filePath);
}

updateScript(path.join(__dirname, "..", "script.js"));
updateScript(path.join(__dirname, "..", "public", "script.js"));
