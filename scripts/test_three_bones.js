const fs = require('fs');
const path = require('path');
const THREE = require('./characterverse/node_modules/three');

// Load Superman.glb buffer
const glbPath = path.resolve('characterverse/public/models/Superman.glb');
const buffer = fs.readFileSync(glbPath);

// We can inspect the bone names and rotations directly
console.log("Superman.glb size:", buffer.length);
