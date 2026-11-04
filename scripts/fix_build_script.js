const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, 'build_superman.py');
let content = fs.readFileSync(scriptPath, 'utf8');

const crlf = content.includes('\r\n');
const newline = crlf ? '\r\n' : '\n';

content = content.replace(`    os.path.join(VAL_DIR, "Superman.glb"),${newline}`, '');
content = content.replace(
  `        shutil.copy2(out_glb, dst)${newline}        print(f"Copied Superman.glb -> {dst}")`,
  `        if os.path.abspath(dst) != os.path.abspath(out_glb):${newline}            shutil.copy2(out_glb, dst)${newline}            print(f"Copied Superman.glb -> {dst}")`
);

fs.writeFileSync(scriptPath, content, 'utf8');
console.log('Fixed build_superman.py successfully!');
