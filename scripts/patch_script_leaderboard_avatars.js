const fs = require('fs');
let s = fs.readFileSync('script.js', 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';

// 1. Update podiumCard to include podium-avatar mount container
const targetCard = `      <span class="character-shadow" aria-hidden="true"></span>${eol}      \${championFigure(rank, selectChampionStyle(member))}${eol}      <span class="medal-ribbon">\${medalMarkup(rank)}</span>`;

const replacementCard = `      <span class="character-shadow" aria-hidden="true"></span>${eol}      <div class="champion-character champion-character--\${selectChampionStyle(member)} champion-character-rank-\${rank}" aria-hidden="true">${eol}        <div id="podium-avatar-\${member.id}" class="podium-avatar-mount" style="position:absolute;inset:0;width:100%;height:100%;z-index:2;"></div>${eol}        \${championFigure(rank, selectChampionStyle(member))}${eol}      </div>${eol}      <span class="medal-ribbon">\${medalMarkup(rank)}</span>`;

if (s.includes(targetCard)) {
  s = s.replace(targetCard, replacementCard);
} else {
  console.log("Custom replace for podiumCard");
  const normS = s.replace(/\r\n/g, '\n');
  const normTarget = targetCard.replace(/\r\n/g, '\n');
  if (normS.includes(normTarget)) {
    s = s.replace(targetCard.replace(/\n/g, '\r\n'), replacementCard.replace(/\n/g, '\r\n'));
  }
}

// 2. Add mountLeaderboardPodiumAvatars helper definition
const helperCode = `let podiumAvatarInstances = [];${eol}function mountLeaderboardPodiumAvatars(members = []) {${eol}  podiumAvatarInstances.forEach(inst => {${eol}    try { inst?.unmount?.(); } catch (_) {}${eol}  });${eol}  podiumAvatarInstances = [];${eol}  if (!window.CharacterVerseEmbed?.mountCharacterAvatar || !Array.isArray(members)) return;${eol}  members.forEach(member => {${eol}    const mountEl = $(\`podium-avatar-\${member.id}\`);${eol}    if (!mountEl) return;${eol}    const appearance = member.characterVerse?.appearance || null;${eol}    if (!appearance) return;${eol}    try {${eol}      const instance = window.CharacterVerseEmbed.mountCharacterAvatar(mountEl, {${eol}        appearance,${eol}        profilePreview: false,${eol}        autoRotate: true,${eol}        onReady: () => {${eol}          const svgFigure = mountEl.parentElement?.querySelector(".champion-avatar");${eol}          if (svgFigure) svgFigure.style.display = "none";${eol}        }${eol}      });${eol}      if (instance) podiumAvatarInstances.push(instance);${eol}    } catch (_) {}${eol}  });${eol}}${eol}`;

if (!s.includes("function mountLeaderboardPodiumAvatars")) {
  s = s.replace("function renderViewerLeaderboard(data) {", helperCode + `${eol}function renderViewerLeaderboard(data) {`);
}

// 3. Call mountLeaderboardPodiumAvatars in renderViewerLeaderboard
const targetViewerCall = `podium.innerHTML = qualified.map(member => podiumCard(member, member.rank, member.score)).join("") || \`<div class="leaderboard-empty">No members have qualified yet. Complete at least 75% of scheduled tasks to appear on the podium.</div>\`;`;
const replacementViewerCall = targetViewerCall + `${eol}  mountLeaderboardPodiumAvatars(qualified);`;

if (s.includes(targetViewerCall)) {
  s = s.replace(targetViewerCall, replacementViewerCall);
}

// 4. Call mountLeaderboardPodiumAvatars in renderLeaderboard
const targetAdminCall = `podium.innerHTML = podiumMembers.map(member => podiumCard(member, member.rank, member.overallDone)).join("") || \`<div class="leaderboard-empty">No members have qualified yet. Complete at least 75% of scheduled tasks to appear on the podium.</div>\`;`;
const replacementAdminCall = targetAdminCall + `${eol}  mountLeaderboardPodiumAvatars(podiumMembers);`;

if (s.includes(targetAdminCall)) {
  s = s.replace(targetAdminCall, replacementAdminCall);
}

fs.writeFileSync('script.js', s, 'utf8');
console.log('Successfully patched script.js with leaderboard 3D character avatars');
