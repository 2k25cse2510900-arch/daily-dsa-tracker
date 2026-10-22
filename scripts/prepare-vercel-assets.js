"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
fs.mkdirSync(publicDir, { recursive: true });

for (const file of ["index.html", "style.css", "activity-date.js", "script.js"]) {
  fs.copyFileSync(path.join(root, file), path.join(publicDir, file));
}
