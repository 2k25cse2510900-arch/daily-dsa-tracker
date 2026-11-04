const fs = require('fs');
const s = fs.readFileSync('scripts/build_script_ai_mentor.js', 'utf8');
const idx = s.indexOf('function formatLang');
console.log('formatLang at:', idx);
console.log(s.slice(idx - 300, idx + 100));
