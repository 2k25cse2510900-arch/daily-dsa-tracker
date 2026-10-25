"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
fs.mkdirSync(publicDir, { recursive: true });

for (const file of ["index.html", "style.css", "activity-date.js", "firebase-client.js", "script.js"]) {
  fs.copyFileSync(path.join(root, file), path.join(publicDir, file));
}

const characterVerseDist = path.join(root, "characterverse", "dist");
if (!fs.existsSync(characterVerseDist)) throw new Error("CharacterVerse build output is missing.");
const publicCharacterVerse = path.join(publicDir, "characterverse");
fs.rmSync(publicCharacterVerse, { recursive: true, force: true });
fs.cpSync(characterVerseDist, publicCharacterVerse, { recursive: true });

const characterVerseEmbedDist = path.join(root, "characterverse", "dist-embed");
if (!fs.existsSync(characterVerseEmbedDist)) throw new Error("CharacterVerse embedded build output is missing.");
const publicCharacterVerseEmbed = path.join(publicDir, "characterverse-embed");
fs.rmSync(publicCharacterVerseEmbed, { recursive: true, force: true });
fs.cpSync(characterVerseEmbedDist, publicCharacterVerseEmbed, { recursive: true });
