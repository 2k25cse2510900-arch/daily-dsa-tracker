const fs = require('fs');
const s = fs.readFileSync('index.html', 'utf8');
const idx = s.indexOf('mentor-header-tags');
console.log(s.slice(idx - 20, idx + 400));
