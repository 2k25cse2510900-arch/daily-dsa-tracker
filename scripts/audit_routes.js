"use strict";
const fs = require("fs");

function extractRoutes(filename) {
  const content = fs.readFileSync(filename, "utf8");
  const lines = content.split("\n");
  const routes = [];
  lines.forEach((line, index) => {
    const match = line.match(/(?:app|router)\.(get|post|put|delete|patch|use)\s*\(\s*(\[[^\]]+\]|"[^"]+"|\'[^\']+\')/);
    if (match) {
      routes.push({ line: index + 1, method: match[1].toUpperCase(), path: match[2], text: line.trim() });
    }
  });
  return routes;
}

["server.js", "group-routes.js", "daily-workspace-routes.js", "ai-code-mentor-routes.js"].forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`=== ${file} ===`);
    const r = extractRoutes(file);
    r.forEach(route => console.log(`  L${route.line} ${route.method} ${route.path}`));
  }
});
