const fs = require('fs');
let s = fs.readFileSync('characterverse/src/context/StudioContext.jsx', 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';

// 1. Add raceMode state
const targetState = `  const [profileReady, setProfileReady] = useState(false);`;
const replacementState = `  const [raceMode, setRaceMode] = useState('character');${eol}  const [profileReady, setProfileReady] = useState(false);`;

s = s.replace(targetState, replacementState);

// 2. Add raceMode in applyServerProfile
const targetApply = `    setEquippedVehicleUpgrades(appearance.equippedVehicleUpgrades || { 'vehicle-bike': null, 'vehicle-car': null, 'vehicle-rocket': null });`;
const replacementApply = `    setEquippedVehicleUpgrades(appearance.equippedVehicleUpgrades || { 'vehicle-bike': null, 'vehicle-car': null, 'vehicle-rocket': null });${eol}    setRaceMode(appearance.raceMode || 'character');`;

s = s.replace(targetApply, replacementApply);

// 3. Add raceMode in payload
const targetPayload = `        equippedVehicleId,${eol}        equippedVehicleUpgrades,${eol}      };`;
const replacementPayload = `        equippedVehicleId,${eol}        equippedVehicleUpgrades,${eol}        raceMode,${eol}      };`;

s = s.replace(targetPayload, replacementPayload);

// 4. Update dependencies of saveAppearance useEffect
const targetDeps = `[profileReady, selectedCharacterId, equippedCharacterId, equippedCosmetics, equippedOutfits, customColors, equippedVehicleId, equippedVehicleUpgrades, ownedCharacterIds]`;
const replacementDeps = `[profileReady, selectedCharacterId, equippedCharacterId, equippedCosmetics, equippedOutfits, customColors, equippedVehicleId, equippedVehicleUpgrades, raceMode, ownedCharacterIds]`;

s = s.replace(targetDeps, replacementDeps);

// 5. Add selectRaceMode function
const targetHelper = `  const resetVehicleLoadout = () => {`;
const helperAddition = `  const selectRaceMode = (mode) => {${eol}    if (mode === 'vehicle') {${eol}      if (!equippedVehicleId || !ownedVehicles[equippedVehicleId]) {${eol}        showToast('Equip a vehicle first to select Vehicle Mode for racing.', 'error');${eol}        return;${eol}      }${eol}      setRaceMode('vehicle');${eol}      showToast('Switched to Vehicle Mode for racing!', 'success');${eol}    } else {${eol}      setRaceMode('character');${eol}      showToast('Switched to Character Mode (on foot / abilities) for racing!', 'success');${eol}    }${eol}  };${eol}${eol}  const resetVehicleLoadout = () => {`;

s = s.replace(targetHelper, helperAddition);

// 6. Export raceMode, setRaceMode, selectRaceMode in value
const targetExport = `        resetVehicleLoadout,`;
const replacementExport = `        resetVehicleLoadout,${eol}        raceMode,${eol}        setRaceMode,${eol}        selectRaceMode,`;

s = s.replace(targetExport, replacementExport);

fs.writeFileSync('characterverse/src/context/StudioContext.jsx', s, 'utf8');
console.log('Successfully patched StudioContext.jsx with raceMode management');
