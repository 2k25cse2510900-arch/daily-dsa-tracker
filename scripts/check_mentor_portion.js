const fs = require('fs');
const s = fs.readFileSync('script.js', 'utf8');
const marker = "/* ==========================================================================\n   AI Code Mentor Workspace Controller";
const idx = s.indexOf(marker);
console.log('Marker at:', idx);
console.log('Total length:', s.length);
console.log('Mentor portion length:', s.length - idx);
