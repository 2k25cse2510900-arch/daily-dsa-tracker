const fs = require('fs');
let s = fs.readFileSync('characterverse/src/components/arena/simulation/RaceMovementController.js', 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';

const target = `export function getRacerVehicleConfig(racer) {${eol}  const appearance = racer?.character || {};${eol}  const vehicleId = appearance.equippedVehicleId || appearance.vehicle?.id || null;${eol}  return getVehicleConfig(vehicleId);${eol}}`;

const replacement = `export function getRacerVehicleConfig(racer) {${eol}  const appearance = racer?.character || {};${eol}  const raceMode = appearance.raceMode || (appearance.equippedVehicleId ? 'vehicle' : 'character');${eol}  if (raceMode === 'character') {${eol}    return getVehicleConfig(null);${eol}  }${eol}  const vehicleId = appearance.equippedVehicleId || appearance.vehicle?.id || null;${eol}  return getVehicleConfig(vehicleId);${eol}}`;

if (!s.includes(target)) {
  console.error("Target not found in RaceMovementController.js");
  process.exit(1);
}

s = s.replace(target, replacement);
fs.writeFileSync('characterverse/src/components/arena/simulation/RaceMovementController.js', s, 'utf8');
console.log('Successfully patched RaceMovementController.js');
