import re

path = 'characterverse/src/components/arena/RaceArena.jsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('\r\n', '\n')

# 1. Update imports
old_imp = """import {
  BASE_RUNNING_SPEED,
  getRacerForwardDistance,
  getProceduralRacerPosition,
  getProceduralRacerHeading,
} from './simulation/RaceMovementController';"""

new_imp = """import { getVehicleConfig, calculateVehicleTelemetry } from './simulation/VehicleConfig';
import {
  BASE_RUNNING_SPEED,
  getRacerForwardDistance,
  getProceduralRacerPosition,
  getProceduralRacerHeading,
  getRacerKinematics,
  getRacerVehicleConfig,
} from './simulation/RaceMovementController';"""

assert old_imp in text, 'Import snippet not found'
text = text.replace(old_imp, new_imp)

# 2. Update ArenaRacer
old_racer = """function ArenaRacer({ racer, racers = [], reducedMotion, onFocus }) {
  const groupRef = useRef();

  const characterData = useMemo(() => {
    const appearance = racer.character || {};
    const base = resolveCharacterDataFromAppearance(appearance);
    return {
      ...base,
      vehicle: null,
      vehicleUpgrade: null,
      isDrivingMode: true, // triggers active running stride locomotion
    };
  }, [racer.character]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    // Continuous physical forward distance along endless highway
    const distance = getRacerForwardDistance(racer, t, racers);
    const laneIndex = typeof racer.laneIndex === 'number' ? racer.laneIndex : 0;
    const [posX, posY, posZ] = getProceduralRacerPosition(distance, laneIndex);
    const heading = getProceduralRacerHeading(distance);

    const strideFreq = 12.0;
    const strideBob = reducedMotion ? 0 : Math.abs(Math.sin(t * strideFreq + laneIndex)) * 0.08;
    const stridePhase = reducedMotion ? 0 : Math.sin(t * strideFreq + laneIndex) * 0.04;

    // Superman elevated flight clearance (tested in superman.test.js)
    const isSuperman = characterData?.id === 'superman';
    const verticalElevation = isSuperman
      ? 1.25 + (reducedMotion ? 0 : Math.sin(t * 3.2 + laneIndex) * 0.08)
      : 0.06 + strideBob;

    // Stride displacement along forward heading vector
    const forwardX = Math.sin(heading);
    const forwardZ = Math.cos(heading);
    const dynamicX = posX + (isSuperman ? 0 : forwardX * stridePhase);
    const dynamicZ = posZ + (isSuperman ? 0 : forwardZ * stridePhase);

    groupRef.current.position.set(dynamicX, posY + verticalElevation, dynamicZ);

    const flightBank = isSuperman && !reducedMotion ? Math.sin(t * 2.8 + laneIndex) * 0.08 : 0;
    groupRef.current.rotation.set(flightBank, heading, 0);
  });"""

new_racer = """function ArenaRacer({ racer, racers = [], reducedMotion, onFocus }) {
  const groupRef = useRef();

  const characterData = useMemo(() => {
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
  }, [racer.character]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    // Continuous physical forward distance along endless highway
    const distance = getRacerForwardDistance(racer, t, racers);
    const laneIndex = typeof racer.laneIndex === 'number' ? racer.laneIndex : 0;
    const [posX, posY, posZ] = getProceduralRacerPosition(distance, laneIndex);

    // Superman elevated flight clearance (tested in superman.test.js)
    const isSuperman = characterData?.id === 'superman';

    // Compute complete vehicle kinematics (banking, pitch, suspension, flight elevation)
    const kinematics = getRacerKinematics(racer, characterData, distance, laneIndex, t, reducedMotion);
    const { heading, bankAngle, pitchAngle, verticalElevation, stridePhase, isMounted } = kinematics;

    // Stride displacement along forward heading vector for foot runners
    const forwardX = Math.sin(heading);
    const forwardZ = Math.cos(heading);
    const dynamicX = posX + (isMounted || isSuperman ? 0 : forwardX * stridePhase);
    const dynamicZ = posZ + (isMounted || isSuperman ? 0 : forwardZ * stridePhase);

    // Elevated flight clearance: 1.25m for unmounted Superman, or vehicle flight/suspension elevation
    const finalY = isSuperman && !isMounted
      ? posY + 1.25 + (reducedMotion ? 0 : Math.sin(t * 3.2 + laneIndex) * 0.08)
      : posY + verticalElevation;

    groupRef.current.position.set(dynamicX, finalY, dynamicZ);

    const flightBank = isSuperman && !isMounted && !reducedMotion
      ? Math.sin(t * 2.8 + laneIndex) * 0.08
      : bankAngle;

    groupRef.current.rotation.set(flightBank, heading, pitchAngle);
  });"""

assert old_racer in text, 'Racer snippet not found'
text = text.replace(old_racer, new_racer)

# 3. Add VehicleTelemetryHUD before WebGLFallbackArena
hud_component = """/* ─────────────────────────────────────────────────────────────────
   VEHICLE TELEMETRY HUD (Phase 2 Store Vehicle Telemetry)
───────────────────────────────────────────────────────────────── */
function VehicleTelemetryHUD({ racer }) {
  if (!racer) return null;

  const appearance = racer.character || {};
  const vehicleConfig = getRacerVehicleConfig(racer);
  const isSuperman = (appearance.equippedCharacterId || appearance.characterId) === 'superman';
  const telemetry = calculateVehicleTelemetry(vehicleConfig, isSuperman, Date.now() / 1000);

  const rank = racer.rank || 1;
  const laneIndex = typeof racer.laneIndex === 'number' ? racer.laneIndex : 0;
  const solvedCount = Number(racer.solved ?? racer.solvedCount ?? 0);
  const solvedStatus = racer.solvedAvailable === false ? 'Syncing...' : `${solvedCount} Solved`;

  const upgradeActive = Boolean(
    appearance.vehicleUpgradeId ||
    (appearance.equippedVehicleUpgrades && appearance.equippedVehicleUpgrades[vehicleConfig.id])
  );

  return (
    <aside className="arena-vehicle-telemetry-hud" aria-label="Equipped Vehicle Telemetry">
      <div className="telemetry-header">
        <div className="telemetry-racer-info">
          <span className="telemetry-rank-pill">#{rank}</span>
          <span className="telemetry-racer-name">{racer.name}</span>
        </div>
        <span className="telemetry-lane-tag">Lane {laneIndex + 1}</span>
      </div>

      <div className="telemetry-vehicle-row">
        <div
          className="telemetry-vehicle-badge"
          style={{ borderColor: telemetry.badgeColor, color: telemetry.badgeColor }}
        >
          <span className="telemetry-rarity-dot" style={{ backgroundColor: telemetry.badgeColor }} />
          <span>{telemetry.rarity}</span>
        </div>
        <span className="telemetry-vehicle-name">{telemetry.name}</span>
      </div>

      <div className="telemetry-stats-grid">
        <div className="telemetry-stat-cell">
          <span className="telemetry-stat-label">Sim Speed</span>
          <span className="telemetry-stat-value speed-highlight">
            {telemetry.speedKmh} <span className="telemetry-unit">km/h</span>
          </span>
        </div>
        <div className="telemetry-stat-cell">
          <span className="telemetry-stat-label">Handling</span>
          <span className="telemetry-stat-value">
            {telemetry.handlingRating} <span className="telemetry-unit">/100</span>
          </span>
        </div>
        <div className="telemetry-stat-cell">
          <span className="telemetry-stat-label">Trail Status</span>
          <span className="telemetry-stat-value trail-status">
            {upgradeActive ? '✨ Upgraded' : (vehicleConfig.defaultTrail ? '⚡ Active' : 'Standard')}
          </span>
        </div>
      </div>

      <div className="telemetry-academic-row">
        <span className="academic-label">Verified LeetCode:</span>
        <span className="academic-value">{solvedStatus}</span>
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────────────
   2D WEBGL FALLBACK
───────────────────────────────────────────────────────────────── */"""

old_fallback = """/* ─────────────────────────────────────────────────────────────────
   2D WEBGL FALLBACK
───────────────────────────────────────────────────────────────── */"""
assert old_fallback in text, 'Fallback snippet not found'
text = text.replace(old_fallback, hud_component)

# 4. Update RaceArena root component
old_root = """const RaceArena = forwardRef(function RaceArena(
  {
    arenaState,
    cameraMode = 'leader',
    reducedMotion = false,
    focusedMemberId = null,
    onFocusMember = null,
    onError = null,
  },
  ref
) {
  const [hasWebGLError, setHasWebGLError] = useState(false);
  const racers = arenaState?.racers || [];
  const milestone = arenaState?.targetMilestone || 100;
  const cameraRef = useRef();

  useImperativeHandle(ref, () => ({
    zoomIn: () => cameraRef.current?.zoomIn(),
    zoomOut: () => cameraRef.current?.zoomOut(),
    resetView: () => cameraRef.current?.resetView(),
    focusMember: (id) => cameraRef.current?.focusMember(id),
  }));"""

new_root = """const RaceArena = forwardRef(function RaceArena(
  {
    arenaState,
    cameraMode = 'leader',
    reducedMotion = false,
    focusedMemberId = null,
    onFocusMember = null,
    onError = null,
  },
  ref
) {
  const [hasWebGLError, setHasWebGLError] = useState(false);
  const [internalFocusedId, setInternalFocusedId] = useState(null);
  const racers = arenaState?.racers || [];
  const milestone = arenaState?.targetMilestone || 100;
  const cameraRef = useRef();

  const activeFocusId = focusedMemberId || internalFocusedId;
  const focusedRacer = useMemo(() => {
    if (activeFocusId) {
      const found = racers.find((r) => (r.id || r.memberId) === activeFocusId);
      if (found) return found;
    }
    return racers.find((r) => r.rank === 1) || racers[0] || null;
  }, [racers, activeFocusId]);

  const handleFocusMember = (id) => {
    setInternalFocusedId(id);
    cameraRef.current?.focusMember(id);
    onFocusMember?.(id);
  };

  useImperativeHandle(ref, () => ({
    zoomIn: () => cameraRef.current?.zoomIn(),
    zoomOut: () => cameraRef.current?.zoomOut(),
    resetView: () => cameraRef.current?.resetView(),
    focusMember: (id) => handleFocusMember(id),
  }));"""

assert old_root in text, 'Root snippet not found'
text = text.replace(old_root, new_root)

# 5. Update ArenaRacer onFocus and Minimap/HUD in JSX
old_jsx = """      {/* Interactive Academic Journey HUD Overlay */}
      <ArenaMinimap
        racers={racers}
        focusedMemberId={focusedMemberId}
        onFocusMember={onFocusMember}
        milestone={milestone}
      />"""

new_jsx = """      {/* Interactive Academic Journey HUD Overlay */}
      <ArenaMinimap
        racers={racers}
        focusedMemberId={activeFocusId}
        onFocusMember={handleFocusMember}
        milestone={milestone}
      />

      {/* Compact Vehicle Information Section (Phase 2 Store Vehicle Telemetry) */}
      <VehicleTelemetryHUD racer={focusedRacer} />"""

assert old_jsx in text, 'JSX snippet not found'
text = text.replace(old_jsx, new_jsx)

# Also update ArenaRacer onFocus in the map
old_map = """            <ArenaRacer
              key={memberId}
              racer={racer}
              racers={racers}
              reducedMotion={reducedMotion}
              onFocus={onFocusMember}
            />"""

new_map = """            <ArenaRacer
              key={memberId}
              racer={racer}
              racers={racers}
              reducedMotion={reducedMotion}
              onFocus={handleFocusMember}
            />"""

assert old_map in text, 'Map snippet not found'
text = text.replace(old_map, new_map)

# Also update JourneyCamera focusedMemberId
old_cam = """        <JourneyCamera
          ref={cameraRef}
          cameraMode={cameraMode}
          racers={racers}
          focusedMemberId={focusedMemberId}
        />"""

new_cam = """        <JourneyCamera
          ref={cameraRef}
          cameraMode={cameraMode}
          racers={racers}
          focusedMemberId={activeFocusId}
        />"""

assert old_cam in text, 'Cam snippet not found'
text = text.replace(old_cam, new_cam)

with open(path, 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(text)

print('Successfully patched RaceArena.jsx')
