const fs = require('fs');
const s = fs.readFileSync('test/ai-code-mentor-phase2.test.js', 'utf8');
console.log('Length:', s.length);
const tests = s.match(/test\([\"'][^\"']+[\"']/g);
console.log('Tests found:', tests);
