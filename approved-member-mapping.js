"use strict";

const { normalizeMemberEmail } = require("./member-allowlist");

// This configuration identifies the intended tracker member; it never proves
// identity. A Firebase-verified Google token is still required before linking.
const APPROVED_GROUP_MEMBERS = Object.freeze([
  { name: "Krish", memberNames: ["Krish", "Krish (ADMIN)"], email: "krishchaddha22@gmail.com" },
  { name: "Kartik Kumar", memberNames: ["Kartik Kumar"], email: "2k25cse2513784@gmail.com" },
  { name: "Tanmay Awasthi", memberNames: ["Tanmay Awasthi"], email: "2k25cse2511319@gmail.com" },
  { name: "Avantika Yadav", memberNames: ["Avantika Yadav"], email: "2k25cse2513597@gmail.com" },
  { name: "Kshitij Rajput", memberNames: ["Kshitij Rajput"], email: "rajputkshitij37@gmail.com" },
  { name: "Krishna Kumar Gaur", memberNames: ["Krishna Kumar Gaur"], email: "gaurkrishnakumar16@gmail.com" },
  { name: "Kanika Dwivedi", memberNames: ["Kanika Dwivedi"], email: "diyadwivedi628@gmail.com" },
  { name: "Deepanshu Sachan", memberNames: ["Deepanshu Sachan"], email: "2k25cse2513611@gmail.com" }
]);

function normalizeMemberName(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").toLocaleLowerCase() : "";
}

function approvedMemberForEmail(email) {
  const normalizedEmail = normalizeMemberEmail(email);
  return APPROVED_GROUP_MEMBERS.find(member => member.email === normalizedEmail) || null;
}

function dashboardMemberMatchesApproved(member, approved) {
  return Boolean(member && approved && approved.memberNames.some(name => normalizeMemberName(member.name) === normalizeMemberName(name)));
}

function approvedDashboardMemberForEmail(members, email) {
  const approved = approvedMemberForEmail(email);
  if (!approved || !Array.isArray(members)) return null;
  const matches = members.filter(member => dashboardMemberMatchesApproved(member, approved));
  return matches.length === 1 ? matches[0] : null;
}

function approvedIdentityConflictCategory({ member, email, emailMatches = [], otherEmailLink, linkByUid, existingLink, firebaseUid }) {
  const normalizedEmail = normalizeMemberEmail(email);
  const oldEmail = normalizeMemberEmail(member?.email);
  if (emailMatches.length > 1 || (emailMatches[0] && emailMatches[0].id !== member?.id)) return "duplicate-dashboard-email";
  if (otherEmailLink) return "email-linked-to-other-member";
  if (linkByUid && linkByUid._id !== member?.id) return "firebase-uid-linked-to-other-member";
  if (existingLink?.firebaseUid && existingLink.firebaseUid !== firebaseUid) return "firebase-uid-mismatch";
  if (existingLink?.email && normalizeMemberEmail(existingLink.email) !== normalizedEmail) return "link-email-mismatch";
  if (oldEmail && oldEmail !== normalizedEmail) return "stored-email-mismatch";
  return null;
}

function hasApprovedIdentityConflict(context) {
  return Boolean(approvedIdentityConflictCategory(context));
}

module.exports = { APPROVED_GROUP_MEMBERS, approvedMemberForEmail, dashboardMemberMatchesApproved, approvedDashboardMemberForEmail, approvedIdentityConflictCategory, hasApprovedIdentityConflict };
