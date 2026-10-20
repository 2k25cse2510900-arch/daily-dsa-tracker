"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("Vercel public assets match the editable root dashboard files", () => {
  for (const file of ["index.html", "style.css", "script.js"]) {
    assert.equal(
      fs.readFileSync(path.join(root, "public", file), "utf8"),
      fs.readFileSync(path.join(root, file), "utf8"),
      `${file} must be synced into public before deployment`
    );
  }
});
