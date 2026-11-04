const fs = require('fs');
const s = fs.readFileSync('index.html', 'utf8');
const idx = s.indexOf('aiMentorModal');
console.log('Index:', idx);
console.log(s.slice(idx - 20, idx + 1000));
