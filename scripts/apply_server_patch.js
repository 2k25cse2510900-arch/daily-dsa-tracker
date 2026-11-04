"use strict";
const fs = require("fs");
const path = require("path");

const serverPath = path.join(__dirname, "..", "server.js");
let content = fs.readFileSync(serverPath, "utf8");

// Detect line ending
const crlf = content.includes("\r\n");
const EOL = crlf ? "\r\n" : "\n";

console.log("EOL detected:", crlf ? "CRLF" : "LF");

// 1. Patch findActiveMemberById
const target1 = `  const profile = await db.collection("memberProfiles").findOne({ _id: memberId, firebaseUid, deactivatedAt: { $exists: false } });
  if (!profile || (Number(profile.sessionVersion) || 0) !== (Number(sessionVersion) || 0)) return null;
  return { id: profile._id, name: profile.displayName, email: profile.email || null, role: "Member", photoUrl: profile.photoUrl || null, leetCodeUsername: profile.leetCodeUsername || null, legacy: false, groupMember: false };`;

const normTarget1 = target1.replace(/\r?\n/g, EOL);
if (!content.includes(normTarget1)) {
  console.error("Could not find target1 in server.js");
  process.exit(1);
}

const replacement1 = `  const profile = await db.collection("memberProfiles").findOne({ _id: memberId, firebaseUid, deactivatedAt: { $exists: false } });
  if (!profile || (Number(profile.sessionVersion) || 0) !== (Number(sessionVersion) || 0)) return null;
  const activeMembership = await db.collection("groupMembers").findOne({ userId: memberId, status: "approved" });
  return {
    id: profile._id,
    name: profile.displayName,
    email: profile.email || null,
    role: activeMembership?.role === "owner" ? "Leader" : "Member",
    photoUrl: profile.photoUrl || null,
    leetCodeUsername: profile.leetCodeUsername || null,
    legacy: false,
    groupMember: Boolean(activeMembership)
  };`.replace(/\r?\n/g, EOL);

content = content.replace(normTarget1, replacement1);
console.log("Patched findActiveMemberById successfully!");

// 2. Patch lines from app.get("/api/member/shared-data") down to app.get("/api/member/dashboard")
const targetStart = `app.get("/api/member/shared-data", memberOnly, async (req, res) => {`;
const targetEnd = `app.get("/api/member/dashboard", memberOnly, createMemberDashboardHandler({`;

const startIndex = content.indexOf(targetStart);
const endIndex = content.indexOf(targetEnd);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find routes section in server.js", { startIndex, endIndex });
  process.exit(1);
}

const newRoutesSection = `async function resolveAuthorizedGroupContext(req, db, { requiredRole = null, allowEmpty = false } = {}) {
  const isAdmin = isAdminSession(req);
  const isMember = (req.session?.role === "member" && typeof req.session.memberId === "string") || Boolean(req.member?.id);
  if (!isAdmin && !isMember) {
    const error = new Error("Authentication required.");
    error.status = 401;
    error.code = "AUTHENTICATION_REQUIRED";
    throw error;
  }

  const userId = req.member?.id || req.session?.memberId;
  let targetGroupId = req.query?.groupId || req.headers?.["x-group-id"] || req.session?.activeGroupId;

  if (!targetGroupId && userId) {
    const activeM = await db.collection("groupMembers").findOne({ userId, status: "approved" });
    if (activeM) {
      targetGroupId = activeM.groupId;
    } else if (isAdmin) {
      targetGroupId = "legacy-dsa-group";
    }
  }

  if (!targetGroupId) {
    if (allowEmpty) {
      return { groupId: null, group: null, membership: null, groupMembers: [] };
    }
    const error = new Error("Group membership required.");
    error.status = 403;
    error.code = "GROUP_MEMBERSHIP_REQUIRED";
    throw error;
  }

  let membership = null;
  if (!isAdmin) {
    membership = await db.collection("groupMembers").findOne({ groupId: targetGroupId, userId, status: "approved" });
    if (!membership) {
      const error = new Error("You are not an authorized member of this group.");
      error.status = 403;
      error.code = "GROUP_MEMBERSHIP_REQUIRED";
      throw error;
    }
    if (requiredRole === "owner" && membership.role !== "owner") {
      const error = new Error("Group owner permission required.");
      error.status = 403;
      error.code = "GROUP_OWNER_REQUIRED";
      throw error;
    }
  } else {
    membership = await db.collection("groupMembers").findOne({ groupId: targetGroupId, userId, status: "approved" })
      || { groupId: targetGroupId, userId, role: "owner", status: "approved" };
  }

  const group = await db.collection("groups").findOne({ _id: targetGroupId });
  if (!group) {
    const error = new Error("Group not found.");
    error.status = 404;
    error.code = "GROUP_NOT_FOUND";
    throw error;
  }

  const groupMembers = await db.collection("groupMembers")
    .find({ groupId: targetGroupId, status: "approved" })
    .sort({ joinedAt: 1 })
    .toArray();

  if (req.session) {
    req.session.activeGroupId = targetGroupId;
  }

  return { groupId: targetGroupId, group, membership, groupMembers };
}

async function getGroupDashboardDocument(db, groupId, groupMembers) {
  if (groupId === "legacy-dsa-group") {
    const doc = await db.collection("dashboard").findOne({ _id: "legacy-dsa-group" })
      || await db.collection("dashboard").findOne({ _id: "shared" });
    if (doc) return doc;
  } else {
    const doc = await db.collection("dashboard").findOne({ _id: groupId });
    if (doc) return doc;
  }
  const newDoc = {
    _id: groupId,
    groupId,
    currentWeek: 1,
    members: (groupMembers || []).map(m => ({
      id: m.userId,
      name: m.displayName,
      role: m.role === "owner" ? "Leader" : "Member"
    })),
    weeks: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };
  try {
    await db.collection("dashboard").insertOne(newDoc);
  } catch (err) {
    if (err.code !== 11000) throw err;
  }
  return newDoc;
}

app.get("/api/member/shared-data", memberOnly, async (req, res) => {
  try {
    const { groupId, group, groupMembers } = await resolveAuthorizedGroupContext(req, db);
    const document = await getGroupDashboardDocument(db, groupId, groupMembers);
    const memberIds = groupMembers.map(m => m.userId);
    const profiles = await db.collection("leetcodeProfiles").find({ _id: { $in: memberIds } }).toArray();
    const cacheById = new Map(profiles.map(profile => [profile._id, profile]));
    const leetcode = {};
    for (const m of groupMembers) {
      const p = cacheById.get(m.userId);
      if (p?.username) {
        leetcode[m.userId] = {
          username: p.username,
          profileUrl: \`https://leetcode.com/u/\${encodeURIComponent(p.username)}/\`,
          stats: p.stats || null
        };
      }
    }
    const pageMembers = groupMembers.map(m => ({
      id: m.userId,
      name: m.displayName,
      role: m.role === "owner" ? "Leader" : "Member",
      rawRole: m.role
    }));
    const groupDisplayName = (group.name && group.name.trim()) ? group.name.trim() : "Unnamed Group";
    res.json({
      groupId,
      groupName: groupDisplayName,
      members: pageMembers,
      weeks: document.weeks || {},
      currentWeek: document.currentWeek || 1,
      leetcode
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message, code: error.code });
  }
});

app.get("/api/page-data/:page", dashboardViewer, async (req, res) => {
  const page = req.params.page;
  if (!PAGES.includes(page)) return res.status(404).json({ error: "Page not found." });
  const weekNumber = Number(req.query.week);
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > MAX_WEEKS) return res.status(400).json({ error: "Choose a valid week." });

  let groupCtx;
  try {
    groupCtx = await resolveAuthorizedGroupContext(req, db, { allowEmpty: true });
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message, code: err.code });
  }

  const { groupId, group, groupMembers } = groupCtx;
  if (!groupId || !groupMembers.length) {
    return res.json({
      page,
      week: weekNumber,
      groupId: null,
      groupName: null,
      members: [],
      participants: 0,
      qualified: 0,
      highest: 0,
      statuses: page === "report" ? { daily: {}, concepts: {} } : {},
      leetcode: {},
      summary: [],
      arena: { racers: [], targetMilestone: 100 }
    });
  }

  const groupDoc = await getGroupDashboardDocument(db, groupId, groupMembers);
  const members = groupMembers.map(m => ({
    id: m.userId,
    name: m.displayName,
    role: m.role === "owner" ? "Leader" : "Member",
    rawRole: m.role,
    joinedAt: m.joinedAt
  }));
  const memberIds = members.map(m => m.id);

  const savedWeek = groupDoc.weeks?.[String(weekNumber)] || { daily: {}, concepts: {} };
  const daily = id => Array.from({ length: 6 }, (_, i) => STATUSES.has(savedWeek.daily?.[id]?.[i]) ? savedWeek.daily[id][i] : "blank");
  const concepts = id => Array.from({ length: 2 }, (_, i) => STATUSES.has(savedWeek.concepts?.[id]?.[i]) ? savedWeek.concepts[id][i] : "blank");
  const workSlots = scheduledSlots(weekNumber);
  const possible = workSlots.length + (workSlots.length ? 2 : 0);

  const rows = members.map(member => {
    const d = workSlots.map(index => daily(member.id)[index]);
    const c = workSlots.length ? concepts(member.id) : [];
    return { ...member, ...scoreWeek(d, c, possible) };
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  const groupDisplayName = (group.name && group.name.trim()) ? group.name.trim() : "Unnamed Group";

  if (page === "daily") {
    const date = typeof req.query.date === "string" && /^\\d{4}-\\d{2}-\\d{2}$/.test(req.query.date) ? req.query.date : null;
    const storedActivity = date ? await db.collection("leetcodeActivity").findOne({ _id: date }, { projection: { _id: 0 } }) : null;
    const activityDate = currentActivityDate();
    const previousActivityDate = addActivityDays(activityDate, -1);
    const [collectionJob, finalizationJob] = await Promise.all([
      db.collection("leetcodeActivityJobs").findOne({ _id: activityDate }, { projection: { _id: 0 } }),
      db.collection("leetcodeActivityJobs").findOne({ _id: previousActivityDate }, { projection: { _id: 0 } })
    ]);
    const isAdmin = isAdminSession(req);
    const currentCollection = date === activityDate ? collectionJob?.collection : null;
    const rawActivity = storedActivity || (currentCollection ? {
      date: activityDate,
      lastSuccessfulAt: currentCollection.collectedAt || null,
      summary: {
        membersChecked: currentCollection.membersChecked,
        verifiedAttempts: currentCollection.verifiedAttempts,
        unableToVerify: currentCollection.unableToVerify,
        trackerUpdateFailures: Object.values(currentCollection.statuses || {}).filter(item => item?.trackerUpdateFailed || (item?.status === "Attempt verified" && item.updated === false && /tracker update failed/i.test(item.detail || ""))).length
      },
      statuses: currentCollection.statuses || {}
    } : null);

    let scopedActivity = null;
    if (rawActivity) {
      const scopedStatuses = {};
      let verifiedCount = 0;
      let unableCount = 0;
      let failureCount = 0;
      for (const mId of memberIds) {
        if (rawActivity.statuses && rawActivity.statuses[mId]) {
          scopedStatuses[mId] = rawActivity.statuses[mId];
          if (rawActivity.statuses[mId].status === "Attempt verified") verifiedCount++;
          else if (rawActivity.statuses[mId].status === "Unable to verify") unableCount++;
          if (rawActivity.statuses[mId].trackerUpdateFailed) failureCount++;
        }
      }
      scopedActivity = {
        date: rawActivity.date,
        lastSuccessfulAt: rawActivity.lastSuccessfulAt,
        summary: {
          membersChecked: memberIds.length,
          verifiedAttempts: verifiedCount,
          unableToVerify: unableCount,
          trackerUpdateFailures: failureCount
        },
        statuses: scopedStatuses
      };
    }

    const safeSummary = publicActivityRecord(scopedActivity)?.summary || {};
    const trackingSummary = {
      activityDate: scopedActivity?.date || date || activityDate,
      lastSuccessfulAt: scopedActivity?.lastSuccessfulAt || null,
      verifiedAttempts: safeSummary.verifiedAttempts || 0,
      unableToVerify: safeSummary.unableToVerify || 0,
      trackerUpdateFailures: safeSummary.trackerUpdateFailures || 0
    };
    return res.json({
      page,
      groupId,
      groupName: groupDisplayName,
      week: weekNumber,
      date,
      activity: isAdmin ? scopedActivity : publicActivityRecord(scopedActivity),
      trackingSummary,
      activityDate,
      previousActivityDate,
      collectionJob: isAdmin ? collectionJob?.collection || null : null,
      finalizationJob: isAdmin ? finalizationJob?.finalization || null : null,
      members,
      statuses: Object.fromEntries(members.map(member => [member.id, daily(member.id)]))
    });
  }

  if (page === "concepts") {
    return res.json({
      page,
      groupId,
      groupName: groupDisplayName,
      week: weekNumber,
      members,
      statuses: Object.fromEntries(members.map(member => [member.id, concepts(member.id)]))
    });
  }

  if (page === "members") {
    const docs = await db.collection("leetcodeProfiles").find({ _id: { $in: memberIds } }).toArray();
    const cacheById = new Map(docs.map(doc => [doc._id, doc]));
    const linkDocs = await db.collection("memberAuthLinks").find({ _id: { $in: memberIds } }, { projection: { deactivatedAt: 1 } }).toArray();
    const linkById = new Map(linkDocs.map(link => [link._id, link]));
    const pageMembers = groupMembers.map(m => ({
      id: m.userId,
      name: m.displayName,
      role: m.role === "owner" ? "Leader" : "Member",
      rawRole: m.role,
      joinedAt: m.joinedAt,
      ...(isAdminSession(req) ? { firebaseLinked: Boolean(linkById.get(m.userId) && !linkById.get(m.userId).deactivatedAt) } : {})
    }));
    return res.json({
      page,
      groupId,
      groupName: groupDisplayName,
      members: pageMembers,
      leetcode: Object.fromEntries(pageMembers.map(member => {
        const profile = cacheById.get(member.id);
        return profile?.username ? [member.id, { username: profile.username, profileUrl: \`https://leetcode.com/u/\${encodeURIComponent(profile.username)}/\`, stats: profile.stats }] : null;
      }).filter(Boolean))
    });
  }

  if (page === "leaderboard") {
    applyEligibleDenseRanks(rows, possible ? Math.ceil(possible * 0.75) : Infinity);
    const cvDocs = await db.collection("characterVerseProfiles").find({ _id: { $in: memberIds } }).toArray();
    const cvMap = new Map(cvDocs.map(doc => [doc._id, doc]));
    const enrichedRows = rows.map(row => ({
      ...row,
      characterVerse: cvMap.get(row.id)?.appearance ? { appearance: cvMap.get(row.id).appearance } : null
    }));
    return res.json({
      page,
      groupId,
      groupName: groupDisplayName,
      week: weekNumber,
      members: enrichedRows,
      participants: rows.length,
      qualified: rows.filter(row => row.qualified).length,
      highest: rows.length ? rows[0].score : 0
    });
  }

  if (page === "overview") {
    const summary = rows.map(row => ({ name: row.name, dailyDone: row.dailyDone, conceptsDone: row.conceptsDone, overallDone: row.score, percent: row.percent }));
    return res.json({
      page,
      groupId,
      groupName: groupDisplayName,
      week: weekNumber,
      participants: rows.length,
      dailyDone: rows.reduce((n, row) => n + row.dailyDone, 0),
      conceptsDone: rows.reduce((n, row) => n + row.conceptsDone, 0),
      summary
    });
  }

  if (page === "arena") {
    const [leetcodeDocs, cvDocs] = await Promise.all([
      db.collection("leetcodeProfiles").find({ _id: { $in: memberIds } }).toArray(),
      db.collection("characterVerseProfiles").find({ _id: { $in: memberIds } }).toArray()
    ]);
    const leetCodeMap = new Map(leetcodeDocs.map(doc => [doc._id, doc]));
    const cvMap = new Map(cvDocs.map(doc => [doc._id, doc]));
    const groupRacers = members.map(m => ({
      id: m.id,
      name: m.name,
      leetCodeUsername: leetCodeMap.get(m.id)?.username || null
    }));
    const arena = buildRaceArenaState(groupRacers, leetCodeMap, cvMap);
    arena.groupId = groupId;
    arena.groupName = groupDisplayName;
    return res.json({
      page,
      groupId,
      groupName: groupDisplayName,
      week: weekNumber,
      arena
    });
  }

  if (page === "report") {
    return res.json({
      page,
      groupId,
      groupName: groupDisplayName,
      week: weekNumber,
      members,
      statuses: {
        daily: Object.fromEntries(members.map(member => [member.id, daily(member.id)])),
        concepts: Object.fromEntries(members.map(member => [member.id, concepts(member.id)]))
      }
    });
  }
});

app.get("/api/arena/live", dashboardViewer, async (req, res) => {
  try {
    const { groupId, group, groupMembers } = await resolveAuthorizedGroupContext(req, db);
    const memberIds = groupMembers.map(m => m.userId);
    const [leetcodeDocs, cvDocs] = await Promise.all([
      db.collection("leetcodeProfiles").find({ _id: { $in: memberIds } }).toArray(),
      db.collection("characterVerseProfiles").find({ _id: { $in: memberIds } }).toArray()
    ]);
    const leetCodeMap = new Map(leetcodeDocs.map(doc => [doc._id, doc]));
    const cvMap = new Map(cvDocs.map(doc => [doc._id, doc]));
    const groupRacers = groupMembers.map(m => ({
      id: m.userId,
      name: m.displayName,
      leetCodeUsername: leetCodeMap.get(m.userId)?.username || null
    }));
    const arena = buildRaceArenaState(groupRacers, leetCodeMap, cvMap);
    arena.groupId = groupId;
    arena.groupName = (group.name && group.name.trim()) ? group.name.trim() : "Unnamed Group";
    res.json(arena);
  } catch (error) {
    res.status(error.status || 503).json({ error: error.message || "Race arena standings are temporarily unavailable." });
  }
});

app.post("/api/data", adminOnly, async (req, res) => {
  if (!validState(req.body)) return res.status(400).json({ error: "Dashboard data failed validation." });
  const targetGroupId = req.query.groupId || req.body?.groupId || "legacy-dsa-group";
  const group = await db.collection("groups").findOne({ _id: targetGroupId });
  if (!group) return res.status(404).json({ error: "Group not found." });
  const targetDocId = targetGroupId === "legacy-dsa-group" ? "shared" : targetGroupId;
  const dashboard = db.collection("dashboard");
  const previous = await dashboard.findOne({ _id: targetDocId });
  const existingMembers = new Map((previous?.members || []).map(member => [member.id, member]));
  const incomingMembers = req.body.members.map(member => existingMembers.get(member.id)?.email ? { ...member, email: existingMembers.get(member.id).email } : member);
  const removedIds = [...existingMembers.keys()].filter(id => !incomingMembers.some(member => member.id === id));
  await dashboard.updateOne({ _id: targetDocId }, { $set: { members: incomingMembers, weeks: req.body.weeks, currentWeek: req.body.currentWeek, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  if (removedIds.length) await db.collection("memberAuthLinks").updateMany({ _id: { $in: removedIds } }, { $set: { deactivatedAt: new Date() }, $inc: { sessionVersion: 1 } });
  audit(req, "save-dashboard", targetDocId);
  res.json({ ok: true });
});

app.get("/api/member/progress", memberOnly, async (req, res) => {
  const weekNumber = Number(req.query.week);
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > MAX_WEEKS) return res.status(400).json({ error: "Choose a valid week." });
  try {
    const { groupId, groupMembers } = await resolveAuthorizedGroupContext(req, db);
    const dashboard = await getGroupDashboardDocument(db, groupId, groupMembers);
    const week = dashboard?.weeks?.[String(weekNumber)] || {};
    const daily = Array.from({ length: 6 }, (_, slot) => STATUSES.has(week.daily?.[req.member.id]?.[slot]) ? week.daily[req.member.id][slot] : "blank");
    const concepts = Array.from({ length: 2 }, (_, slot) => STATUSES.has(week.concepts?.[req.member.id]?.[slot]) ? week.concepts[req.member.id][slot] : "blank");
    const myMembership = groupMembers.find(m => m.userId === req.member.id);
    res.json({
      member: { id: req.member.id, name: req.member.name, role: myMembership?.role === "owner" ? "Leader" : "Member" },
      groupId,
      week: weekNumber,
      daily,
      concepts,
      scheduledSlots: scheduledSlots(weekNumber)
    });
  } catch (error) {
    res.status(error.status || 403).json({ error: error.message });
  }
});

app.get("/api/member/group", memberOnly, async (req, res) => {
  try {
    const { groupId, groupMembers } = await resolveAuthorizedGroupContext(req, db);
    const memberIds = groupMembers.map(m => m.userId);
    const profiles = await db.collection("leetcodeProfiles").find({ _id: { $in: memberIds } }).toArray();
    const profileMap = new Map(profiles.map(p => [p._id, p]));
    const members = groupMembers.map(m => ({
      id: m.userId,
      name: m.displayName,
      role: m.role === "owner" ? "Leader" : "Member",
      leetCodeUsername: profileMap.get(m.userId)?.username || null
    }));
    res.json({ groupId, members });
  } catch (error) {
    res.status(error.status || 403).json({ error: error.message });
  }
});\n\n`.replace(/\r?\n/g, EOL);

content = content.slice(0, startIndex) + newRoutesSection + content.slice(endIndex);
fs.writeFileSync(serverPath, content, "utf8");
console.log("Patched server.js routes section successfully!");
