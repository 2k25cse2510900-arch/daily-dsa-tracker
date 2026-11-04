const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';

const target = `  if (page === "leaderboard") {${eol}    applyEligibleDenseRanks(rows, possible ? Math.ceil(possible * 0.75) : Infinity);${eol}    return res.json({ page, week: weekNumber, members: rows, participants: rows.length, qualified: rows.filter(row => row.qualified).length, highest: rows.length ? rows[0].score : 0 });${eol}  }`;

const replacement = `  if (page === "leaderboard") {${eol}    applyEligibleDenseRanks(rows, possible ? Math.ceil(possible * 0.75) : Infinity);${eol}    const memberIds = shared.members.map(member => member.id);${eol}    const cvDocs = await db.collection("characterVerseProfiles").find({ _id: { $in: memberIds } }).toArray();${eol}    const cvMap = new Map(cvDocs.map(doc => [doc._id, doc]));${eol}    const enrichedRows = rows.map(row => ({${eol}      ...row,${eol}      characterVerse: cvMap.get(row.id)?.appearance ? { appearance: cvMap.get(row.id).appearance } : null${eol}    }));${eol}    return res.json({ page, week: weekNumber, members: enrichedRows, participants: rows.length, qualified: rows.filter(row => row.qualified).length, highest: rows.length ? rows[0].score : 0 });${eol}  }`;

if (!s.includes(target)) {
  console.error("Target not found in server.js");
  process.exit(1);
}

s = s.replace(target, replacement);
fs.writeFileSync('server.js', s, 'utf8');
console.log('Successfully patched server.js for leaderboard characterVerse enrichment');
