const fs = require('fs');
let s = fs.readFileSync('arena-race.js', 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';

const target1 = `  const equippedVehicleUpgrades = appearance.equippedVehicleUpgrades || {};`;
const replacement1 = `  const equippedVehicleUpgrades = appearance.equippedVehicleUpgrades || {};${eol}  const requestedRaceMode = appearance.raceMode === 'vehicle' ? 'vehicle' : 'character';${eol}  const raceMode = (requestedRaceMode === 'vehicle' && equippedVehicleId) ? 'vehicle' : 'character';`;

const target2 = `      equippedVehicleUpgrades${eol}    }`;
const replacement2 = `      equippedVehicleUpgrades,${eol}      raceMode${eol}    }`;

s = s.replace(target1, replacement1);
s = s.replace(target2, replacement2);

fs.writeFileSync('arena-race.js', s, 'utf8');
console.log('Successfully patched arena-race.js');
