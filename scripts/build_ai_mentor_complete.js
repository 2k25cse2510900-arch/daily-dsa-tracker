"use strict";
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const indexPath = path.join(root, "index.html");
const publicIndexPath = path.join(root, "public", "index.html");
const stylePath = path.join(root, "style.css");
const publicStylePath = path.join(root, "public", "style.css");
const scriptPath = path.join(root, "script.js");
const publicScriptPath = path.join(root, "public", "script.js");

console.log("Beginning AI Code Mentor full integration...");

// -------------------------------------------------------------
// 1. UPDATE index.html
// -------------------------------------------------------------
let indexHtml = fs.readFileSync(indexPath, "utf8");

// Add mentorSourceNotice above code editor container if not present
if (!indexHtml.includes('id="mentorSourceNotice"')) {
  const target = '<div class="mentor-editor-container">';
  const sourceNotice = `<!-- Source Notice Banner -->
              <div id="mentorSourceNotice" class="mentor-alert-card source-alert" hidden>
                <div class="mentor-alert-icon">&#9432;</div>
                <div class="mentor-alert-content">
                  <strong class="mentor-alert-title">Submitted Code Notice</strong>
                  <p class="mentor-alert-body">Original submitted source code is unavailable. Paste your code to continue the analysis.</p>
                </div>
              </div>

              `;
  indexHtml = indexHtml.replace(target, sourceNotice + target);
}

// Add mentorAiConfigNotice below quota bar if not present
if (!indexHtml.includes('id="mentorAiConfigNotice"')) {
  const quotaBarTarget = '</div>\n\n            <!-- Learning Action Pills';
  const configNotice = `</div>

            <!-- AI Configuration Notice -->
            <div id="mentorAiConfigNotice" class="mentor-alert-card config-alert" hidden>
              <div class="mentor-alert-icon">&#9432;</div>
              <div class="mentor-alert-content">
                <strong class="mentor-alert-title">Knowledge Engine Active</strong>
                <p id="mentorAiConfigText" class="mentor-alert-body">OpenAI API key is not configured on the server. AI Code Mentor is running in Local Educational Knowledge Engine mode with full pedagogical explanations, optimal solutions, and visual execution traces.</p>
              </div>
            </div>

            <!-- Learning Action Pills`;
  indexHtml = indexHtml.replace(quotaBarTarget, configNotice);
}

// Add mentorAcceptedAlert above mentorMistakeAlert if not present
if (!indexHtml.includes('id="mentorAcceptedAlert"')) {
  const mistakeTarget = '<div id="mentorMistakeAlert" class="mentor-alert-card mistake-alert" hidden>';
  const acceptedAlert = `<!-- Accepted Solution Affirmation Card -->
            <div id="mentorAcceptedAlert" class="mentor-alert-card accepted-alert" hidden>
              <div class="mentor-alert-icon">&#10004;</div>
              <div class="mentor-alert-content">
                <h4 class="mentor-alert-title" id="mentorAcceptedTitle">Solution Accepted</h4>
                <p id="mentorAcceptedDetail" class="mentor-alert-body">Your solution was Accepted on LeetCode. No correctness issues identified.</p>
                <div class="mentor-alert-fix" id="mentorAcceptedFix">
                  <strong>Optimization Roadmap:</strong> Your solution is correct! Check the optimal solution below to compare asymptotic time and memory efficiency.
                </div>
              </div>
            </div>

            <div id="mentorMistakeAlert" class="mentor-alert-card mistake-alert" hidden>`;
  indexHtml = indexHtml.replace(mistakeTarget, acceptedAlert);
}

// Add mentorHintCard and mentorDryRunCard below mentorMistakeAlert block if not present
if (!indexHtml.includes('id="mentorHintCard"')) {
  const afterMistakeTarget = '</pre>\n              </div>\n            </div>\n\n            <!-- Final Takeaways Card -->';
  const hintAndDryRun = `</pre>
              </div>
            </div>

            <!-- Progressive Hint Card -->
            <div id="mentorHintCard" class="mentor-card mentor-hint-card" hidden>
              <div class="mentor-card-head">
                <div class="mentor-card-title-wrap">
                  <span class="mentor-card-kicker">PROGRESSIVE GUIDANCE</span>
                  <h4 class="mentor-card-subtitle" id="mentorHintLevelTitle">Hint 1 of 3: Conceptual Direction</h4>
                </div>
                <button id="mentorNextHintBtn" class="mentor-btn-sm" type="button">Next Hint &#8594;</button>
              </div>
              <div id="mentorHintBody" class="mentor-hint-body">
                <p id="mentorHintText">Think about what invariant must be preserved at each step.</p>
              </div>
            </div>

            <!-- Dry Run Trace Card -->
            <div id="mentorDryRunCard" class="mentor-card mentor-dryrun-card" hidden>
              <div class="mentor-card-head">
                <div class="mentor-card-title-wrap">
                  <span class="mentor-card-kicker">STEP-BY-STEP TRACE</span>
                  <h4 class="mentor-card-subtitle">Execution Trace &amp; Variable Watch</h4>
                </div>
              </div>
              <div class="mentor-table-wrapper">
                <table class="mentor-comparison-table mentor-dryrun-table">
                  <thead id="mentorDryRunThead">
                    <tr><th>Step</th><th>Pointer</th><th>Element</th><th>Target / Condition</th><th>Action</th></tr>
                  </thead>
                  <tbody id="mentorDryRunTbody">
                    <tr><td>1</td><td>0</td><td>nums[0]</td><td>Evaluate</td><td>Check condition</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Final Takeaways Card -->`;
  indexHtml = indexHtml.replace(afterMistakeTarget, hintAndDryRun);
}

// Add audio controls to animatic stage if not present
if (!indexHtml.includes('id="animaticSoundToggle"')) {
  const animaticControlsTarget = '<div class="animatic-stage-badges">';
  const soundControls = `<div class="animatic-sound-controls" role="group" aria-label="Audio feedback">
              <button id="animaticSoundToggle" class="animatic-sound-btn" type="button" aria-pressed="false" title="Toggle audio feedback">
                <span id="animaticSoundIcon">&#128263;</span>
                <span id="animaticSoundLabel">Sound: Muted</span>
              </button>
              <div class="animatic-volume-wrap">
                <label for="animaticVolumeSlider" class="sr-only">Volume</label>
                <input id="animaticVolumeSlider" class="animatic-volume-slider" type="range" min="0" max="1" step="0.05" value="0.3" aria-label="Volume">
                <span id="animaticVolumeLabel" class="animatic-volume-label">30%</span>
              </div>
            </div>
            <div class="animatic-stage-badges">`;
  indexHtml = indexHtml.replace(animaticControlsTarget, soundControls);
}

fs.writeFileSync(indexPath, indexHtml, "utf8");
fs.writeFileSync(publicIndexPath, indexHtml, "utf8");
console.log("Updated index.html and public/index.html");

// -------------------------------------------------------------
// 2. UPDATE style.css
// -------------------------------------------------------------
let styleCss = fs.readFileSync(stylePath, "utf8");

const additionalStyles = `
/* ==========================================================================
   AI CODE MENTOR - PHASE 2 EXTENDED STYLES (Source, Accepted, Hints, Audio)
   ========================================================================== */
.source-alert {
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.35);
  margin-bottom: 12px;
}
.source-alert .mentor-alert-icon {
  color: #38bdf8;
}

.config-alert {
  background: rgba(234, 179, 8, 0.1);
  border: 1px solid rgba(234, 179, 8, 0.3);
  margin-bottom: 12px;
}
.config-alert .mentor-alert-icon {
  color: #eab308;
}

.accepted-alert {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.35);
  margin-bottom: 12px;
}
.accepted-alert .mentor-alert-icon {
  color: #10b981;
}
.accepted-alert .mentor-alert-title {
  color: #10b981;
}
.accepted-alert .mentor-alert-fix {
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(16, 185, 129, 0.08);
  border-left: 3px solid #10b981;
  font-size: 0.85rem;
  color: #d1fae5;
  border-radius: 0 4px 4px 0;
}

.mentor-hint-card {
  margin-bottom: 14px;
  border-left: 3px solid #f59e0b;
}
.mentor-hint-body {
  padding: 12px 14px;
  font-size: 0.92rem;
  line-height: 1.5;
  color: #e2e8f0;
  background: rgba(245, 158, 11, 0.06);
  border-radius: 6px;
}

.mentor-dryrun-card {
  margin-bottom: 14px;
}
.mentor-dryrun-table {
  width: 100%;
  font-size: 0.84rem;
}
.mentor-dryrun-table th {
  background: #1e293b;
  color: #94a3b8;
  font-weight: 600;
  padding: 8px 10px;
  text-align: left;
}
.mentor-dryrun-table td {
  padding: 8px 10px;
  border-top: 1px solid #334155;
  color: #cbd5e1;
}
.mentor-dryrun-table tr:hover {
  background: rgba(56, 189, 248, 0.05);
}

.animatic-sound-controls {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #1e293b;
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid #334155;
}
.animatic-sound-btn {
  background: transparent;
  border: none;
  color: #cbd5e1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.82rem;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 12px;
  transition: all 0.2s ease;
}
.animatic-sound-btn:hover {
  background: #334155;
  color: #f8fafc;
}
.animatic-sound-btn.active {
  color: #38bdf8;
}
.animatic-volume-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.animatic-volume-slider {
  width: 60px;
  height: 4px;
  accent-color: #38bdf8;
  cursor: pointer;
}
.animatic-volume-label {
  font-size: 0.75rem;
  color: #94a3b8;
  min-width: 28px;
}
`;

if (!styleCss.includes(".source-alert")) {
  styleCss += additionalStyles;
  fs.writeFileSync(stylePath, styleCss, "utf8");
  fs.writeFileSync(publicStylePath, styleCss, "utf8");
  console.log("Updated style.css and public/style.css");
}

console.log("Stage 1 and 2 completed.");
