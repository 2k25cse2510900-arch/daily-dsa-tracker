"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("Vercel public assets match the editable root dashboard files", () => {
  for (const file of ["index.html", "style.css", "activity-date.js", "firebase-client.js", "script.js"]) {
    assert.equal(
      fs.readFileSync(path.join(root, "public", file), "utf8"),
      fs.readFileSync(path.join(root, file), "utf8"),
      `${file} must be synced into public before deployment`
    );
  }
});

test("browser loads the shared activity date helper before dashboard logic", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.ok(html.indexOf('src="activity-date.js"') < html.indexOf('src="script.js"'));
});

test("browser loads shared helpers before dashboard logic", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.ok(html.indexOf('src="activity-date.js"') < html.indexOf('src="script.js"'));
  assert.ok(html.indexOf('<script src="firebase-client.js"></script>') < html.indexOf('<script src="script.js"></script>'));
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(serverSource, /app\.get\("\/firebase-client\.js",\s*\(req,\s*res\)\s*=>\s*res\.sendFile\(path\.join\(__dirname,\s*"firebase-client\.js"\)\)\)/);
});

test("weekly tracking details use a native disclosure and explain unavailable activity", () => {
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
  assert.match(script, /<details class="tracking-details"><summary>View tracking details<\/summary>/);
  assert.match(script, /This is not a confirmed Not Submitted result/);
  assert.match(script, /Tracker update failures:/);
});
