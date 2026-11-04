const fs = require('fs');
let s = fs.readFileSync('characterverse-profiles.js', 'utf8');

// Normalize line breaks for matching if needed, or preserve \r\n
const eol = s.includes('\r\n') ? '\r\n' : '\n';

// 1. Add raceMode to starterProfile
s = s.replace(
  `equippedVehicleUpgrades: {}${eol}    },`,
  `equippedVehicleUpgrades: {},${eol}      raceMode: "character"${eol}    },`
);

// 2. Allow raceMode in validateAppearance key check
s = s.replace(
  '"equippedVehicleId", "equippedVehicleUpgrades"]',
  '"equippedVehicleId", "equippedVehicleUpgrades", "raceMode"]'
);

// 3. Add raceMode validation in validateAppearance
const target = `appearance.equippedVehicleUpgrades = next;${eol}  }`;
const addition = `appearance.equippedVehicleUpgrades = next;${eol}  }${eol}  if (input.raceMode !== undefined) {${eol}    if (input.raceMode !== "character" && input.raceMode !== "vehicle") return null;${eol}    if (input.raceMode === "vehicle") {${eol}      const hasValidVehicle = Boolean(appearance.equippedVehicleId && ownedVehicles.has(appearance.equippedVehicleId));${eol}      appearance.raceMode = hasValidVehicle ? "vehicle" : "character";${eol}    } else {${eol}      appearance.raceMode = "character";${eol}    }${eol}  }`;

if (!s.includes('raceMode: "character"')) {
  console.error("Failed to replace starterProfile raceMode");
  process.exit(1);
}

s = s.replace(target, addition);
fs.writeFileSync('characterverse-profiles.js', s, 'utf8');
console.log('Successfully patched characterverse-profiles.js');
