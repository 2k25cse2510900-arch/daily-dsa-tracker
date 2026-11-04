const fs = require('fs');
let s = fs.readFileSync('characterverse/src/components/arena/RaceArena.jsx', 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';

const targetHook = `  const focusedRacer = useMemo(() => {${eol}    if (activeFocusId) {${eol}      const found = racers.find((r) => (r.id || r.memberId) === activeFocusId);${eol}      if (found) return found;${eol}    }${eol}    return racers.find((r) => r.rank === 1) || racers[0] || null;${eol}  }, [racers, activeFocusId]);`;

const replacementHook = `  const focusedRacer = useMemo(() => {${eol}    if (activeFocusId) {${eol}      const found = racers.find((r) => (r.id || r.memberId) === activeFocusId);${eol}      if (found) return found;${eol}    }${eol}    return racers.find((r) => r.rank === 1) || racers[0] || null;${eol}  }, [racers, activeFocusId]);${eol}${eol}  const [isModeModalOpen, setIsModeModalOpen] = useState(() => {${eol}    if (typeof window !== 'undefined') {${eol}      return new URLSearchParams(window.location.search).get('selectMode') === 'true';${eol}    }${eol}    return false;${eol}  });${eol}  const [customRacerModes, setCustomRacerModes] = useState({});${eol}  const [isUpdatingMode, setIsUpdatingMode] = useState(false);${eol}${eol}  const focusedRacerId = focusedRacer ? (focusedRacer.id || focusedRacer.memberId) : null;${eol}  const activeRacerMode = (focusedRacerId && customRacerModes[focusedRacerId]) ||${eol}    focusedRacer?.character?.raceMode ||${eol}    (focusedRacer?.character?.equippedVehicleId ? 'vehicle' : 'character');${eol}${eol}  const handleSelectMode = (mode) => {${eol}    if (!focusedRacerId) return;${eol}    setCustomRacerModes((prev) => ({ ...prev, [focusedRacerId]: mode }));${eol}    setIsUpdatingMode(true);${eol}    fetch('/api/characterverse/me/appearance', {${eol}      method: 'PUT',${eol}      credentials: 'same-origin',${eol}      headers: { 'content-type': 'application/json' },${eol}      body: JSON.stringify({ raceMode: mode }),${eol}    })${eol}      .catch(() => {})${eol}      .finally(() => setIsUpdatingMode(false));${eol}  };`;

if (!s.includes(targetHook)) {
  console.log("Normalizing target Hook");
  const normS = s.replace(/\r\n/g, '\n');
  const normTarget = targetHook.replace(/\r\n/g, '\n');
  if (normS.includes(normTarget)) {
    s = s.replace(targetHook.replace(/\n/g, '\r\n'), replacementHook.replace(/\n/g, '\r\n'));
  } else {
    console.error("targetHook not found in RaceArena.jsx");
    process.exit(1);
  }
} else {
  s = s.replace(targetHook, replacementHook);
}

fs.writeFileSync('characterverse/src/components/arena/RaceArena.jsx', s, 'utf8');
console.log('Successfully added customRacerModes and modal state to RaceArena');
