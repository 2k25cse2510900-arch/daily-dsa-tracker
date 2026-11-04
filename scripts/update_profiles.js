const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'characterverse-profiles.js');
let content = fs.readFileSync(filePath, 'utf8');

const crlf = content.includes('\r\n');
const newline = crlf ? '\r\n' : '\n';

const target1 = `const CHARACTER_IDS = new Set(["buster-blitz", "nebula-nova"]);
const CHARACTER_PRICES = Object.freeze({
  "nebula-nova": 2000
});`;

const repl1 = `const CHARACTER_IDS = new Set(["buster-blitz", "nebula-nova", "superman"]);
const CHARACTER_PRICES = Object.freeze({
  "nebula-nova": 2000,
  "superman": 2000
});`;

const target2 = `    for (const [characterId, outfitId] of Object.entries(input.equippedOutfits)) {
      if (!CHARACTER_IDS.has(characterId)) return null;
      if (outfitId !== null && (!OUTFIT_IDS.has(outfitId) || !ownedOutfits.has(outfitId))) return null;`;

const repl2 = `    for (const [characterId, outfitId] of Object.entries(input.equippedOutfits)) {
      if (!CHARACTER_IDS.has(characterId)) return null;
      if (characterId === "superman" && outfitId !== null && outfitId !== "outfit-default") return null;
      if (outfitId !== null && (!OUTFIT_IDS.has(outfitId) || !ownedOutfits.has(outfitId))) return null;`;

const normTarget1 = target1.replace(/\n/g, newline);
const normRepl1 = repl1.replace(/\n/g, newline);
const normTarget2 = target2.replace(/\n/g, newline);
const normRepl2 = repl2.replace(/\n/g, newline);

if (content.includes(normTarget1) && content.includes(normTarget2)) {
  content = content.replace(normTarget1, normRepl1).replace(normTarget2, normRepl2);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated characterverse-profiles.js!');
} else {
  console.error('Failed to find targets in characterverse-profiles.js');
  process.exit(1);
}
