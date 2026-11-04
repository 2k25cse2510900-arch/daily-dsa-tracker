const fs = require('fs');
const s = fs.readFileSync('script.js', 'utf8');
console.log(s.slice(260600, 261400));
