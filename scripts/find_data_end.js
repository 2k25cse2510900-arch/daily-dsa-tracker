const fs = require('fs');
const s = fs.readFileSync('scripts/build_script_ai_mentor.js', 'utf8');
const p1 = s.indexOf('const PROBLEM_EDUCATIONAL_DATA = {');
const p2 = s.indexOf('class WebAudioSynthesizer');
console.log('PROBLEM_EDUCATIONAL_DATA at:', p1, 'WebAudioSynthesizer at:', p2);
console.log(s.slice(p2 - 200, p2 + 50));
