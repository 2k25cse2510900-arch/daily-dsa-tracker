const fs = require('fs');
const s = fs.readFileSync('scripts/verify_mentor_browser_complete.js', 'utf8');
const lines = s.split('\n');
console.log(lines.slice(70, 120).join('\n'));
