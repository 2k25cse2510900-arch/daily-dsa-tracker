const fs = require('fs');
const s = fs.readFileSync('script.js', 'utf8');

const p1 = s.indexOf('const PROBLEM_EDUCATIONAL_DATA = {');
const p2 = s.indexOf('function getEducationalDataFor');
const block = s.slice(p1, p2);

// Extract problem slugs
const slugs = [];
const lines = block.split('\n');
for (const line of lines) {
  const m = line.match(/^\s*"([a-z0-9\-]+)":\s*\{/);
  if (m) slugs.push(m[1]);
}
console.log('Registered problems:', slugs);
