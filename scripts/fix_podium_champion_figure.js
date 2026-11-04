const fs = require('fs');
let s = fs.readFileSync('script.js', 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';

// 1. Fix podiumCard back to single call
const targetCard = `      <div class="champion-character champion-character--\${selectChampionStyle(member)} champion-character-rank-\${rank}" aria-hidden="true">${eol}        <div id="podium-avatar-\${member.id}" class="podium-avatar-mount" style="position:absolute;inset:0;width:100%;height:100%;z-index:2;"></div>${eol}        \${championFigure(rank, selectChampionStyle(member))}${eol}      </div>`;
const replacementCard = `      \${championFigure(rank, selectChampionStyle(member), member.id)}`;

s = s.replace(targetCard, replacementCard);

// 2. Update championFigure definition to support memberId
const targetFig = `function championFigure(rank, style = "default") {`;
const replacementFig = `function championFigure(rank, style = "default", memberId = null) {`;
s = s.replace(targetFig, replacementFig);

// 3. Update return statement in championFigure
const targetReturn = `  return \`<div class="champion-character champion-character--\${characterStyle} champion-character-rank-\${rank}" aria-hidden="true">${eol}    <svg class="champion-avatar"`;
const replacementReturn = `  return \`<div class="champion-character champion-character--\${characterStyle} champion-character-rank-\${rank}" aria-hidden="true">${eol}    \${memberId ? \`<div id="podium-avatar-\${memberId}" class="podium-avatar-mount" style="position:absolute;inset:0;width:100%;height:100%;z-index:2;"></div>\` : ""}${eol}    <svg class="champion-avatar"`;
s = s.replace(targetReturn, replacementReturn);

fs.writeFileSync('script.js', s, 'utf8');
console.log('Fixed championFigure and podiumCard in script.js');
