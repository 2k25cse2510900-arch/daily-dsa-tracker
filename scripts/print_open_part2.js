const fs = require('fs');
const s = fs.readFileSync('scripts/build_script_ai_mentor.js', 'utf8');
const p_open = s.indexOf('async function openAiCodeMentorWorkspace');
console.log(s.slice(p_open + 2500, p_open + 5000));
