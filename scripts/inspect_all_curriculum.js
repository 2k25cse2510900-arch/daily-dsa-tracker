const fs = require('fs');

// We can extract PROBLEM_EDUCATIONAL_DATA from script.js
const scriptContent = fs.readFileSync('script.js', 'utf8');
const startIdx = scriptContent.indexOf('const PROBLEM_EDUCATIONAL_DATA = {');
const endIdx = scriptContent.indexOf('class WebAudioSynthesizer');
const codeToEval = scriptContent.substring(startIdx, endIdx) + ';\nmodule.exports = PROBLEM_EDUCATIONAL_DATA;';

fs.writeFileSync('scripts/tmp_edu_data.js', codeToEval, 'utf8');
const eduData = require('./tmp_edu_data.js');

const problems = Object.keys(eduData);
console.log('Total problems in curriculum:', problems.length);

const languages = ['java', 'python3', 'cpp', 'javascript', 'typescript', 'go', 'rust'];

for (const p of problems) {
  const item = eduData[p];
  console.log(`\n==================================================`);
  console.log(`Problem: ${item.title} (Slug: ${p}, #${item.number || 'N/A'})`);
  console.log(`Difficulty: ${item.difficulty}`);
  console.log(`Time Complexity: ${item.timeComplexity} | Space Complexity: ${item.spaceComplexity}`);
  console.log(`Optimal Title: ${item.optimalTitle}`);
  
  for (const lang of languages) {
    const code = item.acceptedCodeByLang?.[lang];
    const hasCode = Boolean(code && code.trim());
    console.log(`  - [${lang}]: ${hasCode ? 'OK (' + code.length + ' chars)' : 'MISSING'}`);
    if (hasCode) {
      // Find method name / signature line
      const firstLines = code.split('\n').filter(l => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('class ') && !l.trim().startsWith('impl ')).slice(0, 2);
      console.log(`      Signature: ${firstLines.map(l => l.trim()).join(' ')}`);
    }
  }
}
