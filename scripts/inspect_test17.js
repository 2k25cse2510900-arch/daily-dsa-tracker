const fs = require('fs');
const s = fs.readFileSync('test/ai-code-mentor-phase2.test.js', 'utf8');
const idx = s.indexOf('17. Educational data supports all 7 programming languages');
console.log(s.slice(idx, idx + 1200));
