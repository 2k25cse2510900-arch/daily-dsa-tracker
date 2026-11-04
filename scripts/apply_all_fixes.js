"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

// 1. Update server.js
let serverContent = fs.readFileSync(path.join(root, "server.js"), "utf8");
serverContent = serverContent.replace(
  'const { groupDailySubmissions } = require("./daily-activity-helper");',
  'const { groupDailySubmissions, fetchLeetCodeQuestionDetail } = require("./daily-activity-helper");'
);

const oldServerLogic = `      const questions = groupDailySubmissions(submissionsList);`;
const newServerLogic = `      const uniqueSlugs = [...new Set(submissionsList.map(s => s.problemSlug || s.titleSlug).filter(Boolean))];
      const detailsMap = {};
      await Promise.all(uniqueSlugs.map(async slug => {
        let detail = null;
        if (db) {
          try {
            detail = await db.collection("leetcodeProblems").findOne({ _id: slug });
          } catch {}
        }
        if (!detail) {
          detail = await fetchLeetCodeQuestionDetail(slug);
          if (detail && db) {
            try {
              await db.collection("leetcodeProblems").updateOne(
                { _id: slug },
                { $set: { _id: slug, ...detail, updatedAt: new Date() } },
                { upsert: true }
              );
            } catch {}
          }
        }
        if (detail) detailsMap[slug] = detail;
      }));

      const questions = groupDailySubmissions(submissionsList, detailsMap);`;

if (serverContent.includes(oldServerLogic)) {
  serverContent = serverContent.replace(oldServerLogic, newServerLogic.replace(/\n/g, "\r\n"));
  fs.writeFileSync(path.join(root, "server.js"), serverContent, "utf8");
  console.log("Updated server.js with problem details resolution");
} else {
  console.log("oldServerLogic not found in server.js");
}

// 2. Update script.js & public/script.js
for (const target of ["script.js", "public/script.js"]) {
  const filePath = path.join(root, target);
  let content = fs.readFileSync(filePath, "utf8");
  const isCRLF = content.includes("\r\n");
  const eol = isCRLF ? "\r\n" : "\n";

  // Remove the erroneous line 2729:
  const badLineCRLF = '  routeFallback.hidden = false;\r\n    if (dailyContent) { dailyContent.innerHTML = \'<div class="profile-daily-empty"><p class="profile-daily-empty-copy">Daily activity is temporarily unavailable.</p></div>\'; }\r\n';
  const badLineLF = '  routeFallback.hidden = false;\n    if (dailyContent) { dailyContent.innerHTML = \'<div class="profile-daily-empty"><p class="profile-daily-empty-copy">Daily activity is temporarily unavailable.</p></div>\'; }\n';
  if (content.includes(badLineCRLF)) {
    content = content.replace(badLineCRLF, '  routeFallback.hidden = false;\r\n');
  } else if (content.includes(badLineLF)) {
    content = content.replace(badLineLF, '  routeFallback.hidden = false;\n');
  }

  // Update renderDailyQuestionCard
  const cardStart = "function renderDailyQuestionCard(q) {";
  const cardEnd = "function renderProfileDailyActivity(data, isSelf) {";
  const cardIndex = content.indexOf(cardStart);
  const actIndex = content.indexOf(cardEnd);

  const newCardCode = `function renderDailyQuestionCard(q) {
  const diffClass = q.difficulty ? \`badge-\${q.difficulty.toLowerCase()}\` : "";
  const diffBadge = q.difficulty ? \`<span class="badge-difficulty \${diffClass}">\${escapeHTML(q.difficulty)}</span>\` : "";
  const statusClass = q.status === "Accepted" ? "status-accepted" : "status-attempted";
  const attemptsBadge = q.attemptsCount > 1
    ? \`<span class="badge-attempts" title="Attempt history: \${escapeHTML((q.verdicts || []).join(', '))}">⚡ \${q.attemptsCount} attempts</span>\`
    : "";
  const langBadge = q.language ? \`<span class="badge-lang">\${escapeHTML(formatLang(q.language))}</span>\` : "";
  const timeFormatted = formatSubmissionTime(q.submittedAt);
  const timeHtml = timeFormatted ? \`<time class="question-time" datetime="\${escapeHTML(q.submittedAt || '')}">Submitted at \${escapeHTML(timeFormatted)}</time>\` : "";
  const leetCodeUrl = q.url || (q.titleSlug ? \`https://leetcode.com/problems/\${encodeURIComponent(q.titleSlug)}/\` : "https://leetcode.com/");
  const problemIdText = q.questionFrontendId ? \`#\${escapeHTML(q.questionFrontendId)} · \` : "";

  return \`
    <article class="daily-question-card">
      <div class="daily-question-top">
        <div class="daily-question-header">
          <h4 class="daily-question-title">\${escapeHTML(q.title || "LeetCode Problem")}</h4>
          \${diffBadge}
        </div>
        \${q.titleSlug ? \`<p class="daily-question-slug">\${problemIdText}\${escapeHTML(q.titleSlug)}</p>\` : ""}
        <div class="daily-question-badges">
          <span class="badge-status \${statusClass}">\${escapeHTML(q.status || "Submitted")}</span>
          \${attemptsBadge}
          \${langBadge}
        </div>
      </div>
      <div class="daily-question-bottom">
        \${timeHtml}
        <a class="question-leetcode-link" href="\${escapeHTML(leetCodeUrl)}" target="_blank" rel="noopener noreferrer">View on LeetCode ↗</a>
      </div>
    </article>
  \`;
}\n\n`;

  const actStart = "function renderProfileDailyActivity(data, isSelf) {";
  const actEnd = "async function openProfileRoute(memberId, pushHistory = false) {";
  const openIndex = content.indexOf(actEnd);

  const newActCode = `function renderProfileDailyActivity(data, isSelf) {
  const dailySection = $("routeProfileDailySection");
  const dailyDate = $("routeProfileDailyDate");
  const dailyStatus = $("routeProfileDailyStatus");
  const dailyContent = $("routeProfileDailyContent");
  const dailySyncBtn = $("routeProfileDailySyncBtn");
  if (!dailySection || !dailyContent) return;

  const activity = data?.dailyActivity;
  if (!activity) {
    if (!isSelf) {
      if (dailySyncBtn) dailySyncBtn.hidden = true;
      if (dailyDate) dailyDate.textContent = "Activity is private";
      dailyContent.innerHTML = '<div class="profile-daily-private"><p>Daily LeetCode activity is private to this member\\'s account.</p></div>';
      return;
    }
    if (dailySyncBtn) dailySyncBtn.hidden = true;
    if (dailyDate) dailyDate.textContent = "LeetCode account not linked";
    dailyContent.innerHTML = \`
      <div class="profile-daily-empty">
        <div class="profile-daily-empty-icon" aria-hidden="true">🔗</div>
        <h4 class="profile-daily-empty-title">No LeetCode account linked</h4>
        <p class="profile-daily-empty-copy">Link your LeetCode username in your profile to automatically view and track your daily questions here.</p>
      </div>
    \`;
    return;
  }

  if (dailySyncBtn) dailySyncBtn.hidden = !isSelf;

  if (dailyDate) {
    const lastSync = activity.lastSyncedAt ? \` · Last checked \${new Date(activity.lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}\` : "";
    dailyDate.innerHTML = \`
      <span>Activity day: <strong>\${escapeHTML(activity.date)}</strong> (05:30 AM IST cutoff)\${escapeHTML(lastSync)}</span>
      <span class="profile-daily-count-badge">\${activity.questionsCount || 0} unique \${(activity.questionsCount || 0) === 1 ? 'question' : 'questions'} today</span>
    \`;
  }

  if (activity.syncError && dailyStatus) {
    dailyStatus.textContent = activity.syncError === "RATE_LIMITED"
      ? "LeetCode is currently rate limiting queries. Showing latest cached questions."
      : "LeetCode synchronization was delayed or unavailable. Showing latest cached questions.";
    dailyStatus.hidden = false;
  } else if (dailyStatus) {
    dailyStatus.hidden = true;
  }

  const questions = Array.isArray(activity.questions) ? activity.questions : [];
  if (questions.length === 0) {
    dailyContent.innerHTML = \`
      <div class="profile-daily-empty">
        <div class="profile-daily-empty-icon" aria-hidden="true">📝</div>
        <h4 class="profile-daily-empty-title">No LeetCode questions detected for today</h4>
        <p class="profile-daily-empty-copy">Solve or submit a problem on LeetCode today, then click Refresh Activity to see it here!</p>
      </div>
    \`;
  } else {
    dailyContent.innerHTML = \`
      <div class="profile-daily-grid">
        \${questions.map(q => renderDailyQuestionCard(q)).join("")}
      </div>
    \`;
  }
}\n\n`;

  content = content.slice(0, cardIndex) +
    newCardCode.replace(/\n/g, eol) +
    newActCode.replace(/\n/g, eol) +
    content.slice(openIndex);

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Updated ${target}`);
}

// 3. Update style.css and public/style.css with badge styling
for (const target of ["style.css", "public/style.css"]) {
  const filePath = path.join(root, target);
  let content = fs.readFileSync(filePath, "utf8");
  if (!content.includes(".profile-daily-count-badge")) {
    const extraCss = `
.profile-daily-count-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #f1edfb;
  color: #6d359c;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid #dcd4e8;
  margin-top: 4px;
  width: fit-content;
}
.profile-daily-date {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
`;
    content += extraCss;
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Updated ${target} with count badge style`);
  }
}
