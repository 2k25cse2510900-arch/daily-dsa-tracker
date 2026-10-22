"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("Vercel public assets match the editable root dashboard files", () => {
  for (const file of ["index.html", "style.css", "activity-date.js", "script.js"]) {
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
