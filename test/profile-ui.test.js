"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");

test("both authenticated modes expose the same-tab personal profile entry", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
  assert.match(html, /id="adminPersonalProfileBtn"/);
  assert.match(html, /id="adminProfileAvatar"/);
  assert.match(html, /id="adminProfileName"/);
  assert.match(script, /adminPersonalProfileBtn"\)\.addEventListener\("click"/);
  assert.match(script, /adminPersonalProfileBtn"\)\.hidden = !\(authenticated && memberProfile\?\.id\)/);
  assert.match(script, /openProfileRoute\(memberProfile\.id, true\)/);
  assert.match(script, /location\.pathname\.match\(\/\^\\\/profile/);
  assert.match(script, /addEventListener\("popstate"/);
  assert.match(script, /apiRequest\(`\/api\/profile\//);
});

test("member cards keep profile details off the management list", () => {
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
  const members = script.slice(script.indexOf("function renderMembers()"), script.indexOf("async function updateMemberFirebaseLink"));
  assert.match(members, /member-profile-open/);
  assert.match(members, /member-actions-menu/);
  assert.match(members, /data-member-action="firebase-link"/);
  assert.match(members, /data-member-action="email-link"/);
  assert.doesNotMatch(members, /leetcode-stats|member-progress|Sign-in email:/);
  assert.doesNotMatch(members, /member\.email[^}]*escapeHTML/);
});

test("profile route presents four fetched-or-unavailable statistics and a dashboard return", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
  assert.match(html, /id="profileBackToDashboard"/);
  for (const id of ["routeProfileTotal", "routeProfileEasy", "routeProfileMedium", "routeProfileHard"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(script, /LeetCode statistics are unavailable/);
  assert.match(script, /history\.replaceState\(\{\}, "", "\/"\)/);
});
