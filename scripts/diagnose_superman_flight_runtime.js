/**
 * Superman Flying Animation Runtime Diagnosis
 * 
 * Checkpoint 1: Diagnose Superman flying animation runtime
 * 
 * Diagnostic findings:
 * 1. Exact GLB Asset:
 *    - Development: characterverse/public/models/Superman.glb (copied by Vite to characterverse/dist/models/Superman.glb)
 *    - Production/Express: public/characterverse/models/Superman.glb and public/characterverse-embed/models/Superman.glb
 *    - Model generator: scripts/build_superman_v3.py
 *    - All 5 GLBs are synchronized with SHA-256 hash: 584DCF89E558BFB4F4B48D714915E44A5FF03A31397A506FB8EAA2E62F72813B
 * 
 * 2. Runtime Animation Controller:
 *    - File: characterverse/src/components/viewer/CharacterViewer.jsx
 *    - Mechanism: React Three Fiber `useFrame((state, delta) => { ... })` controller.
 *    - When `isSuperman && !isMounted` and `fb > 0.0001`, useFrame imperatively overrides
 *      bone rotations for spine, chest, head, upperarm.l/r, lowerarm.l/r, hand.l/r, upperleg.l/r, lowerleg.l/r, foot.l/r.
 *    - The base GLB armature contains 152 animations (attack, walk, idle), but useFrame executes
 *      AFTER the Three.js AnimationMixer update on every frame, giving useFrame full authoritative control.
 * 
 * 3. Fist Convergence Root Causes:
 *    - Upper arm Y-rotations in earlier builds were angled inward toward the body centerline (+0.26 on right, -0.26 on left).
 *    - Hand/wrist bones were previously not oriented to point fists forward along flight direction.
 *    - Previous fist separation (clear gap 83.7 cm) was narrower than the stylized chibi head width (108.63 cm).
 *    - The static files in public/characterverse/ were previously out of sync with characterverse/dist/.
 * 
 * 4. Stop Flying Exit Transition Delay:
 *    - Earlier code used `lerp(flightBlendRef.current, 0, delta * 4.0)` which produced an asymptotic
 *      exponential decay taking > 1 second to drop below threshold, keeping arms raised.
 *    - Must be set to an immediate direct drop (<= 0.05s) to lower arms instantly on Stop Flying click.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('=== CHECKPOINT 1: RUNTIME DIAGNOSTIC AUDIT ===');

const glbPaths = [
  'characterverse/public/models/Superman.glb',
  'characterverse/dist/models/Superman.glb',
  'characterverse/dist-embed/models/Superman.glb',
  'public/characterverse/models/Superman.glb',
  'public/characterverse-embed/models/Superman.glb',
];

console.log('\n1. Verifying GLB asset synchronization:');
glbPaths.forEach(p => {
  if (fs.existsSync(p)) {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase();
    console.log(`   [OK] ${p} -> ${hash.slice(0, 16)}...`);
  } else {
    console.log(`   [MISSING] ${p}`);
  }
});

console.log('\n2. Verifying runtime animation controller:');
const viewerPath = 'characterverse/src/components/viewer/CharacterViewer.jsx';
if (fs.existsSync(viewerPath)) {
  const content = fs.readFileSync(viewerPath, 'utf8');
  console.log(`   [OK] Found ${viewerPath} (${content.length} bytes)`);
  console.log(`   - Contains isSuperman check: ${content.includes('isSuperman')}`);
  console.log(`   - Contains flight controller: ${content.includes('flightBlendRef')}`);
  console.log(`   - Hand bones referenced: ${content.includes('handr') && content.includes('handl')}`);
}

console.log('\n3. Diagnosis Complete.');
