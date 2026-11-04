const fs = require('fs');
const s = fs.readFileSync('scripts/build_script_ai_mentor.js', 'utf8');
const p2 = s.indexOf('function getEducationalDataFor');
const p3 = s.indexOf('function switchMentorLearningTab');
console.log('p2:', p2, 'p3:', p3);
console.log('Between p2 and p3 length:', p3 - p2);
