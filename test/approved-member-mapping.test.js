"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { APPROVED_GROUP_MEMBERS, approvedDashboardMemberForEmail, approvedMemberForEmail, approvedIdentityConflictCategory, hasApprovedIdentityConflict } = require("../approved-member-mapping");

const existingMembers = [
  ["member_mvggb1nmx303va", "Krish (ADMIN)"],
  ["member_mvggbpb5y8e3h9", "Kartik Kumar"],
  ["member_mvggcet3ogmjrn", "Tanmay Awasthi"],
  ["member_mvggcs86gcby6t", "Avantika Yadav"],
  ["member_mvggd5du6db87b", "Kshitij Rajput"],
  ["member_mvggdgrdrgmkdf", "Krishna Kumar Gaur"],
  ["member_mvggdw3xiz0d21", "Kanika Dwivedi"],
  ["member_mvggeccjh94w6y", "Deepanshu Sachan"]
].map(([id, name]) => ({ id, name }));

test("every approved verified email resolves to its preserved existing tracker member ID", () => {
  assert.equal(APPROVED_GROUP_MEMBERS.length, 8);
  assert.equal(new Set(APPROVED_GROUP_MEMBERS.map(member => member.email)).size, APPROVED_GROUP_MEMBERS.length, "approved email configuration must not contain duplicates");
  for (const approved of APPROVED_GROUP_MEMBERS) {
    const member = approvedDashboardMemberForEmail(existingMembers, ` ${approved.email.toUpperCase()} `);
    assert.ok(member, approved.email);
    assert.equal(member.name, approved.memberNames.at(-1));
    assert.equal(approvedMemberForEmail(approved.email)?.email, approved.email);
  }
});

test("ambiguous or missing tracker records are never selected for account linking", () => {
  assert.equal(approvedDashboardMemberForEmail(existingMembers.filter(member => member.name !== "Kanika Dwivedi"), "diyadwivedi628@gmail.com"), null);
  assert.equal(approvedDashboardMemberForEmail([...existingMembers, { id: "duplicate", name: "Tanmay Awasthi" }], "2k25cse2511319@gmail.com"), null);
});

test("a configured email cannot resolve to a member with a conflicting stored email without server reconciliation", () => {
  const kartik = approvedDashboardMemberForEmail(existingMembers.map(member => member.name === "Kartik Kumar" ? { ...member, email: "kk@gmail.com" } : member), "2k25cse2513784@gmail.com");
  assert.deepEqual(kartik, { id: "member_mvggbpb5y8e3h9", name: "Kartik Kumar", email: "kk@gmail.com" });
  // The resolver deliberately returns the original member; server.js then
  // rejects the mismatched stored email with a 409 rather than overwriting it.
});

test("Kartik's exact stored-email conflict reports its category and a different Firebase UID fails closed", () => {
  const kartik = { id: "member_mvggbpb5y8e3h9", name: "Kartik Kumar", email: "kk@gmail.com" };
  const approvedEmail = "2k25cse2513784@gmail.com";
  assert.equal(approvedIdentityConflictCategory({ member: kartik, email: approvedEmail, firebaseUid: "existing-uid", existingLink: { firebaseUid: "existing-uid" } }), "stored-email-mismatch");
  assert.equal(hasApprovedIdentityConflict({ member: kartik, email: approvedEmail, firebaseUid: "existing-uid", existingLink: { firebaseUid: "existing-uid" } }), true, "the mismatched stored email must block automatic reassignment");
  assert.equal(hasApprovedIdentityConflict({ member: { ...kartik, email: approvedEmail }, email: approvedEmail, firebaseUid: "new-uid", existingLink: { firebaseUid: "existing-uid", email: approvedEmail } }), true, "a UID belonging to a different account must block linking");
  const reconciled = { member: { ...kartik, email: approvedEmail }, email: approvedEmail, firebaseUid: "existing-uid", existingLink: { firebaseUid: "existing-uid", email: approvedEmail } };
  assert.equal(approvedIdentityConflictCategory(reconciled), null, "the verified existing UID may be retained after explicit email reconciliation");
  assert.equal(hasApprovedIdentityConflict(reconciled), false);
});
