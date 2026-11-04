const fs = require('fs');
let s = fs.readFileSync('characterverse/src/components/arena/RaceArena.jsx', 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';

// 1. Import CHARACTERS from data/characters if not present
if (!s.includes("import { CHARACTERS }")) {
  s = s.replace(
    "import { VEHICLES } from '../../data/vehicles';",
    `import { VEHICLES } from '../../data/vehicles';${eol}import { CHARACTERS } from '../../data/characters';`
  );
}

// 2. In ArenaRacer, respect raceMode
const racerTarget = `  const characterData = useMemo(() => {
    const appearance = racer.character || {};
    const base = resolveCharacterDataFromAppearance(appearance);

    // Resolve legitimately equipped vehicle & upgrade
    const vehicleId = appearance.equippedVehicleId || (appearance.vehicle?.id || null);
    const vehicleObj = vehicleId ? (VEHICLES.find((v) => v.id === vehicleId) || null) : null;
    const upgradeId = appearance.vehicleUpgradeId ||
      (vehicleId && appearance.equippedVehicleUpgrades?.[vehicleId]) ||
      appearance.vehicleUpgrade ||
      null;

    return {
      ...base,
      vehicle: vehicleObj,
      vehicleUpgrade: upgradeId,
      isDrivingMode: true, // triggers active movement/riding kinematics
    };
  }, [racer.character]);`;

const racerReplacement = `  const characterData = useMemo(() => {
    const appearance = racer.character || {};
    const base = resolveCharacterDataFromAppearance(appearance);

    const raceMode = racer.raceModeOverride || appearance.raceMode || (appearance.equippedVehicleId ? 'vehicle' : 'character');
    const isVehicleMode = raceMode === 'vehicle';

    // Resolve legitimately equipped vehicle & upgrade only if in vehicle mode
    const vehicleId = isVehicleMode ? (appearance.equippedVehicleId || (appearance.vehicle?.id || null)) : null;
    const vehicleObj = vehicleId ? (VEHICLES.find((v) => v.id === vehicleId) || null) : null;
    const upgradeId = isVehicleMode ? (appearance.vehicleUpgradeId ||
      (vehicleId && appearance.equippedVehicleUpgrades?.[vehicleId]) ||
      appearance.vehicleUpgrade ||
      null) : null;

    return {
      ...base,
      vehicle: vehicleObj,
      vehicleUpgrade: upgradeId,
      isDrivingMode: true, // triggers active movement/riding kinematics
    };
  }, [racer.character, racer.raceModeOverride]);`;

// Normalize \r\n in target check
const normRacerTarget = racerTarget.replace(/\r\n/g, '\n');
const currentNorm = s.replace(/\r\n/g, '\n');

if (currentNorm.includes(normRacerTarget)) {
  s = s.replace(racerTarget, racerReplacement);
  if (!s.includes('racer.raceModeOverride')) {
    // try with \r\n replacement
    s = s.replace(racerTarget.replace(/\n/g, '\r\n'), racerReplacement.replace(/\n/g, '\r\n'));
  }
} else {
  console.log("Custom replace for ArenaRacer");
  const marker = "function ArenaRacer({ racer, racers = [], reducedMotion, onFocus }) {";
  const endMarker = "useFrame(({ clock }) => {";
  const startIdx = s.indexOf(marker);
  const endIdx = s.indexOf(endMarker, startIdx);
  if (startIdx !== -1 && endIdx !== -1) {
    const before = s.slice(0, startIdx + marker.length);
    const after = s.slice(endIdx);
    const body = `${eol}  const groupRef = useRef();${eol}${eol}` + racerReplacement + `${eol}${eol}  `;
    s = before + body + after;
  }
}

// 3. Add RaceModeSelectionModal definition
const modalCode = `${eol}/* ─────────────────────────────────────────────────────────────────${eol}   RACE MODE SELECTION INTERFACE ("How would you like to race?")${eol}───────────────────────────────────────────────────────────────── */${eol}function RaceModeSelectionModal({${eol}  isOpen,${eol}  onClose,${eol}  racer,${eol}  currentMode,${eol}  onSelectMode,${eol}  isUpdating = false,${eol}}) {${eol}  if (!isOpen) return null;${eol}${eol}  const appearance = racer?.character || {};${eol}  const characterId = appearance.equippedCharacterId || appearance.characterId || 'buster-blitz';${eol}  const charData = CHARACTERS.find((c) => c.id === characterId) || CHARACTERS[0];${eol}  const isSuperman = charData.id === 'superman';${eol}${eol}  const equippedVehicleId = appearance.equippedVehicleId || null;${eol}  const equippedVehicle = equippedVehicleId ? (VEHICLES.find((v) => v.id === equippedVehicleId) || null) : null;${eol}  const hasVehicle = Boolean(equippedVehicle);${eol}${eol}  return (${eol}    <div${eol}      className="arena-mode-modal-backdrop"${eol}      style={{${eol}        position: 'absolute',${eol}        inset: 0,${eol}        zIndex: 50,${eol}        backgroundColor: 'rgba(9, 13, 22, 0.85)',${eol}        backdropFilter: 'blur(8px)',${eol}        display: 'flex',${eol}        alignItems: 'center',${eol}        justifyContent: 'center',${eol}        padding: '16px',${eol}      }}${eol}      onClick={(e) => {${eol}        if (e.target === e.currentTarget) onClose();${eol}      }}${eol}    >${eol}      <div${eol}        className="arena-mode-modal-card"${eol}        style={{${eol}          width: '100%',${eol}          maxWidth: '680px',${eol}          background: 'linear-gradient(180deg, #182030 0%, #0f1523 100%)',${eol}          border: '1px solid rgba(168, 85, 247, 0.35)',${eol}          borderRadius: '24px',${eol}          padding: '28px',${eol}          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(168, 85, 247, 0.2)',${eol}          color: '#ffffff',${eol}          position: 'relative',${eol}        }}${eol}      >${eol}        <div style={{ textAlign: 'center', marginBottom: '24px' }}>${eol}          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.4)', padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '800', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>${eol}            <span>🏁</span> RACE PREPARATION${eol}          </div>${eol}          <h2 style={{ fontSize: '24px', fontWeight: '900', margin: '4px 0', letterSpacing: '-0.02em', color: '#ffffff' }}>${eol}            How would you like to race?${eol}          </h2>${eol}          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, maxWidth: '440px', marginInline: 'auto', lineHeight: '1.45' }}>${eol}            Choose how {racer?.name || 'your character'} enters the live circuit. You can change this anytime before or during racing.${eol}          </p>${eol}        </div>${eol}${eol}        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>${eol}          {/* Option A: Character Mode */}${eol}          <div${eol}            onClick={() => onSelectMode('character')}${eol}            style={{${eol}              padding: '20px',${eol}              borderRadius: '18px',${eol}              border: currentMode === 'character' ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.12)',${eol}              background: currentMode === 'character' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)',${eol}              cursor: 'pointer',${eol}              display: 'flex',${eol}              flexDirection: 'column',${eol}              justifyContent: 'space-between',${eol}              boxShadow: currentMode === 'character' ? '0 0 20px rgba(56, 189, 248, 0.25)' : 'none',${eol}            }}${eol}          >${eol}            <div>${eol}              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>${eol}                <span style={{ fontSize: '28px' }}>{isSuperman ? '🦸' : '🏃'}</span>${eol}                <span style={{${eol}                  fontSize: '10px',${eol}                  fontWeight: '800',${eol}                  padding: '3px 8px',${eol}                  borderRadius: '999px',${eol}                  background: currentMode === 'character' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',${eol}                  color: currentMode === 'character' ? '#0f172a' : '#cbd5e1',${eol}                  textTransform: 'uppercase',${eol}                }}>${eol}                  {currentMode === 'character' ? '✓ ACTIVE' : 'OPTION A'}${eol}                </span>${eol}              </div>${eol}              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px', color: '#ffffff' }}>${eol}                Character Mode${eol}              </h3>${eol}              <p style={{ fontSize: '12px', color: '#38bdf8', fontWeight: '600', margin: '0 0 10px' }}>${eol}                {charData.name} {isSuperman ? '· Supersonic Flight' : '· Sprint Locomotion'}${eol}              </p>${eol}              <ul style={{ fontSize: '11px', color: '#cbd5e1', paddingLeft: '18px', margin: '0 0 14px', lineHeight: '1.6' }}>${eol}                <li>Race using equipped character without a vehicle</li>${eol}                <li>{isSuperman ? 'Authentic Superman flight animation at 1.25m elevation' : 'Natural athletic running stride with full movement cadence'}</li>${eol}                <li>Preserves equipped outfits, colors, and accessories</li>${eol}              </ul>${eol}            </div>${eol}            <button${eol}              type="button"${eol}              disabled={isUpdating}${eol}              style={{${eol}                width: '100%',${eol}                padding: '10px',${eol}                borderRadius: '12px',${eol}                border: 'none',${eol}                fontWeight: '800',${eol}                fontSize: '12px',${eol}                background: currentMode === 'character' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',${eol}                color: currentMode === 'character' ? '#0f172a' : '#ffffff',${eol}                cursor: 'pointer',${eol}              }}${eol}            >${eol}              {currentMode === 'character' ? '✓ Selected Character Mode' : 'Select Character Mode'}${eol}            </button>${eol}          </div>${eol}${eol}          {/* Option B: Vehicle Mode */}${eol}          <div${eol}            onClick={() => {${eol}              if (hasVehicle) onSelectMode('vehicle');${eol}            }}${eol}            style={{${eol}              padding: '20px',${eol}              borderRadius: '18px',${eol}              border: currentMode === 'vehicle' ? '2px solid #a855f7' : (hasVehicle ? '1px solid rgba(255, 255, 255, 0.12)' : '1px dashed rgba(255, 255, 255, 0.15)'),${eol}              background: currentMode === 'vehicle' ? 'rgba(168, 85, 247, 0.14)' : (hasVehicle ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.01)'),${eol}              cursor: hasVehicle ? 'pointer' : 'not-allowed',${eol}              opacity: hasVehicle ? 1 : 0.65,${eol}              display: 'flex',${eol}              flexDirection: 'column',${eol}              justifyContent: 'space-between',${eol}              boxShadow: currentMode === 'vehicle' ? '0 0 20px rgba(168, 85, 247, 0.25)' : 'none',${eol}            }}${eol}          >${eol}            <div>${eol}              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>${eol}                <span style={{ fontSize: '28px' }}>${eol}                  {!hasVehicle ? '🔒' : (equippedVehicle.modelType === 'bike' ? '🏍️' : equippedVehicle.modelType === 'car' ? '🏎️' : '🚀')}${eol}                </span>${eol}                <span style={{${eol}                  fontSize: '10px',${eol}                  fontWeight: '800',${eol}                  padding: '3px 8px',${eol}                  borderRadius: '999px',${eol}                  background: currentMode === 'vehicle' ? '#a855f7' : 'rgba(255, 255, 255, 0.1)',${eol}                  color: currentMode === 'vehicle' ? '#ffffff' : (hasVehicle ? '#cbd5e1' : '#f87171'),${eol}                  textTransform: 'uppercase',${eol}                }}>${eol}                  {currentMode === 'vehicle' ? '✓ ACTIVE' : (hasVehicle ? 'OPTION B' : 'LOCKED')}${eol}                </span>${eol}              </div>${eol}              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px', color: '#ffffff' }}>${eol}                Vehicle Mode${eol}              </h3>${eol}              <p style={{ fontSize: '12px', color: hasVehicle ? '#c084fc' : '#94a3b8', fontWeight: '600', margin: '0 0 10px' }}>${eol}                {hasVehicle ? \`\${equippedVehicle.name} (\${equippedVehicle.category})\` : 'No Vehicle Equipped'}${eol}              </p>${eol}              {hasVehicle ? (${eol}                <ul style={{ fontSize: '11px', color: '#cbd5e1', paddingLeft: '18px', margin: '0 0 14px', lineHeight: '1.6' }}>${eol}                  <li>Mount character inside/on equipped 3D vehicle</li>${eol}                  <li>Vehicle kinematics: banking, wheel rotation, hover suspension</li>${eol}                  <li>Displays vehicle speed and custom particle trail effects</li>${eol}                </ul>${eol}              ) : (${eol}                <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '10px', padding: '10px 12px', fontSize: '11px', color: '#fda4af', lineHeight: '1.45', margin: '0 0 14px' }}>${eol}                  ⚠️ Vehicle Mode requires an equipped vehicle. Visit the Character Store to hire a Superbike, Supercar, or Cosmic Rocket with DSA coins.${eol}                </div>${eol}              )}${eol}            </div>${eol}            <button${eol}              type="button"${eol}              disabled={!hasVehicle || isUpdating}${eol}              style={{${eol}                width: '100%',${eol}                padding: '10px',${eol}                borderRadius: '12px',${eol}                border: 'none',${eol}                fontWeight: '800',${eol}                fontSize: '12px',${eol}                background: !hasVehicle ? 'rgba(255, 255, 255, 0.05)' : (currentMode === 'vehicle' ? '#a855f7' : 'rgba(255, 255, 255, 0.1)'),${eol}                color: !hasVehicle ? '#64748b' : '#ffffff',${eol}                cursor: hasVehicle ? 'pointer' : 'not-allowed',${eol}              }}${eol}            >${eol}              {!hasVehicle ? '🔒 Unavailable (No Vehicle)' : (currentMode === 'vehicle' ? '✓ Selected Vehicle Mode' : 'Select Vehicle Mode')}${eol}            </button>${eol}          </div>${eol}        </div>${eol}${eol}        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>${eol}          <span style={{ fontSize: '11px', color: '#94a3b8' }}>${eol}            Active racer: <strong style={{ color: '#ffffff' }}>{racer?.name || 'Member'}</strong>${eol}          </span>${eol}          <button${eol}            type="button"${eol}            onClick={onClose}${eol}            style={{${eol}              padding: '10px 24px',${eol}              borderRadius: '12px',${eol}              border: 'none',${eol}              background: 'linear-gradient(135deg, #7544ae 0%, #4f46e5 100%)',${eol}              color: '#ffffff',${eol}              fontWeight: '800',${eol}              fontSize: '13px',${eol}              cursor: 'pointer',${eol}              boxShadow: '0 4px 14px rgba(117, 68, 174, 0.4)',${eol}            }}${eol}          >${eol}            Enter Live Arena →${eol}          </button>${eol}        </div>${eol}      </div>${eol}    </div>${eol}  );${eol}}`;

if (!s.includes("function RaceModeSelectionModal")) {
  const insertBefore = "function WebGLFallbackArena({ arenaState }) {";
  s = s.replace(insertBefore, modalCode + `${eol}${eol}` + insertBefore);
}

// 4. In RaceArena main component, add modal state and toggle pill
const rootTarget = "  const focusedRacer = racers.find((r) => (r.id || r.memberId) === activeFocusId) || racers[0] || null;";
const rootAddition = `  const [isModeModalOpen, setIsModeModalOpen] = useState(() => {${eol}    if (typeof window !== 'undefined') {${eol}      return new URLSearchParams(window.location.search).get('selectMode') === 'true';${eol}    }${eol}    return false;${eol}  });${eol}  const [customRacerModes, setCustomRacerModes] = useState({});${eol}  const [isUpdatingMode, setIsUpdatingMode] = useState(false);${eol}${eol}  const focusedRacer = racers.find((r) => (r.id || r.memberId) === activeFocusId) || racers[0] || null;${eol}  const focusedRacerId = focusedRacer ? (focusedRacer.id || focusedRacer.memberId) : null;${eol}  const activeRacerMode = (focusedRacerId && customRacerModes[focusedRacerId]) ||${eol}    focusedRacer?.character?.raceMode ||${eol}    (focusedRacer?.character?.equippedVehicleId ? 'vehicle' : 'character');${eol}${eol}  const handleSelectMode = (mode) => {${eol}    if (!focusedRacerId) return;${eol}    setCustomRacerModes((prev) => ({ ...prev, [focusedRacerId]: mode }));${eol}    setIsUpdatingMode(true);${eol}    fetch('/api/characterverse/me/appearance', {${eol}      method: 'PUT',${eol}      credentials: 'same-origin',${eol}      headers: { 'content-type': 'application/json' },${eol}      body: JSON.stringify({ raceMode: mode }),${eol}    })${eol}      .catch(() => {})${eol}      .finally(() => setIsUpdatingMode(false));${eol}  };`;

s = s.replace(rootTarget, rootAddition);

// 5. Update ArenaRacer rendering to pass racer with raceModeOverride
const racerMapTarget = `<ArenaRacer
              key={memberId}
              racer={racer}
              racers={racers}
              reducedMotion={reducedMotion}
              onFocus={handleFocusMember}
            />`;

const racerMapReplacement = `<ArenaRacer
              key={memberId}
              racer={{
                ...racer,
                raceModeOverride: customRacerModes[memberId] || null,
              }}
              racers={racers}
              reducedMotion={reducedMotion}
              onFocus={handleFocusMember}
            />`;

// Replace in both \n and \r\n formats
if (s.includes(racerMapTarget)) {
  s = s.replace(racerMapTarget, racerMapReplacement);
} else {
  s = s.replace(racerMapTarget.replace(/\n/g, '\r\n'), racerMapReplacement.replace(/\n/g, '\r\n'));
}

// 6. Add Mode Button and Modal to JSX overlay
const overlayTarget = `{/* Compact Vehicle Information Section (Phase 2 Store Vehicle Telemetry) */}`;
const overlayAddition = `{/* Active Race Mode Selector Pill Button */}${eol}      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 25 }}>${eol}        <button${eol}          type="button"${eol}          onClick={() => setIsModeModalOpen(true)}${eol}          style={{${eol}            display: 'flex',${eol}            alignItems: 'center',${eol}            gap: '8px',${eol}            padding: '8px 14px',${eol}            background: 'rgba(15, 23, 42, 0.90)',${eol}            backdropFilter: 'blur(10px)',${eol}            border: '1px solid rgba(255, 255, 255, 0.20)',${eol}            borderRadius: '999px',${eol}            color: '#ffffff',${eol}            fontSize: '12px',${eol}            fontWeight: '700',${eol}            cursor: 'pointer',${eol}            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',${eol}          }}${eol}          title="Choose between Character Mode and Vehicle Mode"${eol}        >${eol}          <span>{activeRacerMode === 'vehicle' ? '🚀 Vehicle Mode' : '🏃 Character Mode'}</span>${eol}          <span style={{ fontSize: '10px', background: 'rgba(168, 85, 247, 0.25)', border: '1px solid rgba(168, 85, 247, 0.4)', padding: '2px 8px', borderRadius: '999px', color: '#d8b4fe' }}>${eol}            Change Mode${eol}          </span>${eol}        </button>${eol}      </div>${eol}${eol}      {/* Race Mode Selection Modal */}${eol}      <RaceModeSelectionModal${eol}        isOpen={isModeModalOpen}${eol}        onClose={() => setIsModeModalOpen(false)}${eol}        racer={focusedRacer}${eol}        currentMode={activeRacerMode}${eol}        onSelectMode={handleSelectMode}${eol}        isUpdating={isUpdatingMode}${eol}      />${eol}${eol}      {/* Compact Vehicle Information Section (Phase 2 Store Vehicle Telemetry) */}`;

s = s.replace(overlayTarget, overlayAddition);

fs.writeFileSync('characterverse/src/components/arena/RaceArena.jsx', s, 'utf8');
console.log('Successfully patched RaceArena.jsx with unified Race Mode Selection Modal');
