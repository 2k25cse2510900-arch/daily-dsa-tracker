const fs = require('fs');
const s = fs.readFileSync('test/ai-code-mentor-phase2.test.js', 'utf8');
const lines = s.split('\n');
for (let i = 450; i < lines.length; i++) {
  console.log((i + 1) + ': ' + lines[i]);
}
