const fs = require('fs');
const s = fs.readFileSync('scripts/build_script_ai_mentor.js', 'utf8');
const p2 = s.indexOf('function getEducationalDataFor');
const p_render = s.indexOf('function renderNormalModeAnalysis');
console.log('getEducationalDataFor length:', p_render - p2);
console.log(s.slice(p2, p_render));
