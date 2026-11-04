"use strict";
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "script.js");
const publicScriptPath = path.join(root, "public", "script.js");

const currentContent = fs.readFileSync(scriptPath, "utf8");
const marker = "/* ==========================================================================\n   AI Code Mentor Workspace Controller";
let splitIdx = currentContent.indexOf(marker);

if (splitIdx === -1) {
  const fallbackMarker = "AI Code Mentor Workspace Controller";
  splitIdx = currentContent.indexOf(fallbackMarker);
  if (splitIdx !== -1) {
    const commentStart = currentContent.lastIndexOf("/*", splitIdx);
    if (commentStart !== -1) splitIdx = commentStart;
  }
}

if (splitIdx === -1) {
  console.error("Marker not found in script.js");
  process.exit(1);
}

const before = currentContent.substring(0, splitIdx).trimEnd() + "\n\n";

// Load our comprehensive, verified AI mentor controller source
const controllerSource = fs.readFileSync(path.join(__dirname, "mentor_controller_template.js"), "utf8");

fs.writeFileSync(scriptPath, before + controllerSource, "utf8");
fs.writeFileSync(publicScriptPath, before + controllerSource, "utf8");
console.log("Successfully rebuilt script.js and public/script.js with verified knowledge engine!");
