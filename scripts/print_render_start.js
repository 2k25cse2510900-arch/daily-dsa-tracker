const fs = require('fs');
const s = fs.readFileSync('scripts/build_script_ai_mentor.js', 'utf8');
const p_render = s.indexOf('function renderNormalModeAnalysis');
console.log(s.slice(p_render, p_render + 2500));
