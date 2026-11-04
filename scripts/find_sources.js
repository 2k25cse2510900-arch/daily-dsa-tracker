const fs = require('fs');
const s = fs.readFileSync('script.js', 'utf8');
let pos = 0;
while ((pos = s.indexOf('Source:', pos)) !== -1) {
  console.log('Match at', pos, s.slice(pos - 10, pos + 50));
  pos += 7;
}
