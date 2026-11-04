"use strict";
const fs = require("fs");
const file = "test/ai-code-mentor-phase2.test.js";
let s = fs.readFileSync(file, "utf8");
s = s.replace('const { service, member } = fixture();', 'const { service } = fixture();\n  const member = { id: "student-alice" };');
fs.writeFileSync(file, s, "utf8");
console.log("Patched test 16 successfully.");
