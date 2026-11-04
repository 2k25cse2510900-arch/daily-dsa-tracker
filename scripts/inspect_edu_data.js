const fs = require('fs');
const s = fs.readFileSync('script.js', 'utf8');

const startIdx = s.indexOf('const PROBLEM_EDUCATIONAL_DATA = {');
const endIdx = s.indexOf('function getEducationalDataFor');
console.log('Start:', startIdx, 'End:', endIdx);

const block = s.slice(startIdx, endIdx);
const lines = block.split('\n');
for (const line of lines) {
  if (line.match(/^\s*\"([a-z0-9\-]+)\":\s*\{/)) {
    console.log('Slug:', line.trim());
  }
}
