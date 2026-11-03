import React, { Suspense, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { DoubleSide } from 'three';
import { GLBCharacter } from '../viewer/CharacterViewer';
import { resolveCharacterDataFromAppearance } from '../viewer/CharacterAvatar';
import { VEHICLES } from '../../data/vehicles';
import { CHARACTERS } from '../../data/characters';

// Modular Procedural World, Simulation, and Camera systems
import {
  CHUNK_LENGTH,
  ROAD_LANES,
  LANE_WIDTH,
  getLaneOffset,
  getRoadX,
  getRoadY,
  getRoadNormalXZ,
  getRoadHeading,
  getRacerWorldCoords,
  getProceduralTerrainHeight,
} from './world/WorldConfig';
import ProceduralWorld from './world/ProceduralWorld';
import { getVehicleConfig, calculateVehicleTelemetry } from './simulation/VehicleConfig';
import {
  BASE_RUNNING_SPEED,
  getRacerForwardDistance,
  getProceduralRacerPosition,
  getProceduralRacerHeading,
  getRacerKinematics,
  getRacerVehicleConfig,
} from './simulation/RaceMovementController';
import JourneyCamera from './camera/JourneyCamera';

/* ─────────────────────────────────────────────────────────────────
   BACKWARD-COMPATIBILITY EXPORTS & CONSTANTS
   Protects external tests, historical scripts, and embed harnesses.
───────────────────────────────────────────────────────────────── */
export const TRACK_CONFIG = {
  innerRadius: 30.0,
  laneWidth: LANE_WIDTH,
  laneCount: ROAD_LANES,
  startAngle: 0,
  totalLength: 538.0,
  get outerRadius() {
    return this.innerRadius + this.laneCount * this.laneWidth;
  },
  getLaneRadius(laneIndex) {
    const lane = Math.max(0, Math.min(this.laneCount - 1, typeof laneIndex === 'number' ? laneIndex : 0));
    return this.innerRadius + (lane + 0.5) * this.laneWidth;
  },
  getLaneOffset(laneIndex) {
    return getLaneOffset(laneIndex);
  },
};

export function normalizeTrackProgress(prog) {
  let p = typeof prog === 'number' && !isNaN(prog) ? prog % 1.0 : 0.0;
  if (p < 0) p += 1.0;
  return p;
}

export function getCircularRacerPosition(progress, laneIndex) {
  const normProg = normalizeTrackProgress(progress);
  const s = normProg * 538.0;
  return getRacerWorldCoords(s, laneIndex);
}

export function getCircularRacerHeading(progress) {
  const normProg = normalizeTrackProgress(progress);
  const s = normProg * 538.0;
  return getRoadHeading(s);
}

export function getSimulatedRacerProgress(racer, elapsedTime = 0, racers = []) {
  const s = getRacerForwardDistance(racer, elapsedTime, racers);
  return normalizeTrackProgress(s / 538.0);
}

export function getTerrainHeight(worldX) {
  return 0.05;
}

export function getRunnerPathHeight(worldX) {
  return 0.05;
}

export function getTerrainSlope(worldX) {
  return 0;
}

export function getRacerWorldX(progress) {
  const p = Math.max(0, Math.min(1, typeof progress === 'number' ? progress : 0));
  return -32.0 + Math.pow(p, 0.65) * 64.0;
}

export function getMountainValleyHeight(x, z) {
  return getProceduralTerrainHeight(x, z);
}

export function getExpansiveTerrainHeight(worldX, worldZ) {
  return getProceduralTerrainHeight(worldX, worldZ);
}

/* ─────────────────────────────────────────────────────────────────
   DYNAMIC WEATHER & ATMOSPHERE
───────────────────────────────────────────────────────────────── */
const WEATHER_PRESETS = [
  {
    name: 'Summer · Sunny',
    icon: '☀️',
    temp: '28°C',
    sky: '#38bdf8',
    fog: '#c7eaff',
    fogNear: 90,
    fogFar: 420,
    sunColor: '#fffbeb',
    sunIntensity: 1.4,
    ambientColor: '#ffffff',
    ambientIntensity: 0.85,
    hemiSky: '#bae6fd',
    hemiGround: '#15803d',
    hemiIntensity: 0.65,
  },
  {
    name: 'Golden Hour',
    icon: '🌅',
    temp: '24°C',
    sky: '#fb923c',
    fog: '#fed7aa',
    fogNear: 80,
    fogFar: 380,
    sunColor: '#fde047',
    sunIntensity: 1.5,
    ambientColor: '#fed7aa',
    ambientIntensity: 0.75,
    hemiSky: '#fed7aa',
    hemiGround: '#78350f',
    hemiIntensity: 0.6,
  },
];

const weatherState = {
  current: { ...WEATHER_PRESETS[0] },
};

function WeatherSky() {
  const { scene } = useThree();
  useFrame(() => {
    const w = weatherState.current;
    scene.background = new THREE.Color(w.sky);
    if (!scene.fog) {
      scene.fog = new THREE.Fog(w.fog, w.fogNear, w.fogFar);
    } else {
      scene.fog.color.set(w.fog);
      scene.fog.near = w.fogNear;
      scene.fog.far = w.fogFar;
    }
  });
  return null;
}

function ArenaAtmosphere({ reducedMotion }) {
  const lightRef = useRef();

  useFrame(({ clock }) => {
    if (lightRef.current && !reducedMotion) {
      const t = clock.getElapsedTime() * 0.05;
      lightRef.current.position.x = 80 + Math.sin(t) * 15;
      lightRef.current.position.z = 80 + Math.cos(t) * 15;
    }
  });

  const w = weatherState.current;

  return (
    <group>
      <ambientLight color={w.ambientColor} intensity={w.ambientIntensity} />
      <hemisphereLight
        args={[w.hemiSky, w.hemiGround, w.hemiIntensity]}
        position={[0, 50, 0]}
      />
      <directionalLight
        ref={lightRef}
        position={[80, 110, 80]}
        color={w.sunColor}
        intensity={w.sunIntensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.00015}
        shadow-camera-near={10}
        shadow-camera-far={420}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
      />
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   DYNAMIC PROCEDURAL CHUNK STREAMER
───────────────────────────────────────────────────────────────── */
function DynamicProceduralWorld({ racers }) {
  const [leadDistance, setLeadDistance] = useState(0);
  const lastChunkRef = useRef(-999);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const lead = t * BASE_RUNNING_SPEED;
    const currentK = Math.floor(lead / CHUNK_LENGTH);
    if (currentK !== lastChunkRef.current) {
      lastChunkRef.current = currentK;
      setLeadDistance(lead);
    }
  });

  return <ProceduralWorld leadDistance={leadDistance} />;
}

/* ─────────────────────────────────────────────────────────────────
   OVERHEAD RACER BILLBOARD TAG
───────────────────────────────────────────────────────────────── */
function createBillboardTexture(racer) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 512, 128);

  const rank = Number(racer.rank || 1);
  const isTop3 = rank <= 3;
  const bgGrad = ctx.createLinearGradient(16, 16, 496, 112);
  if (rank === 1) {
    bgGrad.addColorStop(0, 'rgba(245, 158, 11, 0.96)');
    bgGrad.addColorStop(1, 'rgba(180, 83, 9, 0.96)');
  } else if (rank === 2) {
    bgGrad.addColorStop(0, 'rgba(56, 189, 248, 0.96)');
    bgGrad.addColorStop(1, 'rgba(3, 105, 161, 0.96)');
  } else if (rank === 3) {
    bgGrad.addColorStop(0, 'rgba(236, 72, 153, 0.96)');
    bgGrad.addColorStop(1, 'rgba(168, 85, 247, 0.96)');
  } else {
    bgGrad.addColorStop(0, 'rgba(15, 23, 42, 0.92)');
    bgGrad.addColorStop(1, 'rgba(30, 41, 59, 0.92)');
  }

  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(16, 18, 480, 92, 46);
  } else {
    ctx.rect(16, 18, 480, 92);
  }
  ctx.fillStyle = bgGrad;
  ctx.fill();

  ctx.lineWidth = isTop3 ? 5 : 3;
  ctx.strokeStyle = isTop3 ? '#fef08a' : 'rgba(255, 255, 255, 0.35)';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(68, 64, 32, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.fillStyle = rank === 1 ? '#b45309' : '#0f172a';
  ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`#${rank}`, 68, 64);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  const rawName = String(racer.name || 'Member');
  const displayName = rawName.length > 14 ? rawName.slice(0, 13) + '…' : rawName;
  ctx.fillText(displayName, 116, 48);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const solvedCount = racer.solvedAvailable === false
    ? 'Pending sync'
    : `${Number(racer.solved ?? racer.solvedCount ?? 0)} Solved`;
  const laneDisplay = (typeof racer.laneIndex === 'number' ? racer.laneIndex : 0) + 1;
  ctx.fillText(`${solvedCount} · Lane ${laneDisplay}`, 116, 84);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function RacerBillboard({ racer }) {
  const solvedKey = racer.solved ?? racer.solvedCount;
  const texture = useMemo(
    () => createBillboardTexture(racer),
    [racer.rank, racer.name, solvedKey, racer.solvedAvailable, racer.laneIndex]
  );
  if (!texture) return null;

  const rank = Number(racer.rank || 1);
  const posY = 2.45 + (rank % 3) * 0.45;

  return (
    <sprite position={[0, posY, 0]} scale={[3.3, 0.85, 1]}>
      <spriteMaterial map={texture} depthTest={false} transparent />
    </sprite>
  );
}

function RacerMeshFallback({ racer, characterData }) {
  const baseColor = characterData?.colors?.baseColor || '#38bdf8';
  const accentColor = characterData?.colors?.accentColor || '#f59e0b';
  return (
    <group position={[0, 0.65, 0]}>
      <mesh castShadow>
        <capsuleGeometry args={[0.32, 0.65, 8, 16]} />
        <meshStandardMaterial color={baseColor} metalness={0.4} roughness={0.3} />
      </mesh>
      <mesh position={[0.18, 0.42, 0]}>
        <sphereGeometry args={[0.24, 14, 10]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0.22, -0.38, 0.2]} rotation={[0.5, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[-0.22, -0.38, -0.2]} rotation={[-0.5, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
    </group>
  );
}

class RacerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err) {
    console.warn('Racer 3D render fallback for', this.props.racer?.name, err);
  }
  render() {
    if (this.state.hasError) {
      return <RacerMeshFallback racer={this.props.racer} characterData={this.props.characterData} />;
    }
    return this.props.children;
  }
}

function RacerPresentation({ racer, characterData }) {
  return (
    <group position={[0, 1.01, 0]}>
      <GLBCharacter characterData={characterData} />
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   ARENA RACER ENTITY (Continuous Physical Forward Locomotion)
───────────────────────────────────────────────────────────────── */
function ArenaRacer({ racer, racers = [], reducedMotion, onFocus }) {
  const groupRef = useRef();

  const characterData = useMemo(() => {
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
  }, [racer.character, racer.raceModeOverride]);

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
  });

  const memberId = racer.id || racer.memberId;

  return (
    <group ref={groupRef} scale={[1.35, 1.35, 1.35]} onClick={() => onFocus?.(memberId)}>
      <RacerErrorBoundary racer={racer} characterData={characterData}>
        <Suspense fallback={<RacerMeshFallback racer={racer} characterData={characterData} />}>
          <RacerPresentation racer={racer} characterData={characterData} />
        </Suspense>
      </RacerErrorBoundary>
      <RacerBillboard racer={racer} />
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   JOURNEY MINIMAP / HUD (Verified Academic Progress Without Lap/Finish Artifacts)
───────────────────────────────────────────────────────────────── */
function ArenaMinimap({ racers, focusedMemberId, onFocusMember, milestone }) {
  if (!racers || racers.length === 0) return null;

  return (
    <div className="arena-minimap-container" aria-label="Endless World Journey HUD">
      <div className="minimap-header">
        <span className="minimap-title">🏔️ ENDLESS HIGHWAY JOURNEY</span>
        <span className="minimap-milestone">Target: {milestone || 100} Solved</span>
      </div>
      <div className="minimap-track-rail">
        <div className="minimap-track-progress-line" />
        {racers.map((racer) => {
          const memberId = racer.id || racer.memberId;
          const isFocused = memberId === focusedMemberId;
          const rank = racer.rank || 1;
          const progressPercent = Math.max(0, Math.min(100, Math.round((racer.progress || 0) * 100)));

          return (
            <button
              key={memberId}
              type="button"
              className={`minimap-pin rank-${rank <= 3 ? rank : 'other'}${isFocused ? ' focused' : ''}`}
              style={{ left: `${progressPercent}%` }}
              title={`#${rank} ${racer.name} (${Number(racer.solved ?? racer.solvedCount ?? 0)} solved · Lane ${(racer.laneIndex || 0) + 1})`}
              onClick={() => onFocusMember?.(memberId)}
            >
              <span className="minimap-pin-label">#{rank}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
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
───────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────
   RACE MODE SELECTION INTERFACE ("How would you like to race?")
───────────────────────────────────────────────────────────────── */
function RaceModeSelectionModal({
  isOpen,
  onClose,
  racer,
  currentMode,
  onSelectMode,
  isUpdating = false,
  // Authenticated user's own vehicle inventory — used as authoritative fallback
  // when racer.character (from arena state / demo data) is missing vehicle fields.
  myEquippedVehicleId = null,
  myOwnedVehicles = null,
}) {
  if (!isOpen) return null;

  const appearance = racer?.character || {};
  const characterId = appearance.equippedCharacterId || appearance.characterId || 'buster-blitz';
  const charData = CHARACTERS.find((c) => c.id === characterId) || CHARACTERS[0];
  const isSuperman = charData.id === 'superman';

  // Resolve equippedVehicleId: prefer the server-sourced racer appearance field,
  // fall back to the authenticated user's own StudioContext equipped vehicle.
  // This prevents the "LOCKED" false-positive when demo/fallback arena data omits
  // vehicle fields for a racer that actually has a vehicle equipped in their profile.
  const racerEquippedVehicleId = appearance.equippedVehicleId || null;
  // myOwnedVehicles is an object like { 'vehicle-rocket': true, 'vehicle-bike': false }
  // or null when not provided.
  const authOwnedVehicleId = (myEquippedVehicleId && (myOwnedVehicles === null || myOwnedVehicles[myEquippedVehicleId])) ? myEquippedVehicleId : null;
  const equippedVehicleId = racerEquippedVehicleId || authOwnedVehicleId;
  const equippedVehicle = equippedVehicleId ? (VEHICLES.find((v) => v.id === equippedVehicleId) || null) : null;
  const hasVehicle = Boolean(equippedVehicle);

  return (
    <div
      className="arena-mode-modal-backdrop"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        backgroundColor: 'rgba(9, 13, 22, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="arena-mode-modal-card"
        style={{
          width: '100%',
          maxWidth: '680px',
          background: 'linear-gradient(180deg, #182030 0%, #0f1523 100%)',
          border: '1px solid rgba(168, 85, 247, 0.35)',
          borderRadius: '24px',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(168, 85, 247, 0.2)',
          color: '#ffffff',
          position: 'relative',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.4)', padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '800', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            <span>🏁</span> RACE PREPARATION
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '900', margin: '4px 0', letterSpacing: '-0.02em', color: '#ffffff' }}>
            How would you like to race?
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, maxWidth: '440px', marginInline: 'auto', lineHeight: '1.45' }}>
            Choose how {racer?.name || 'your character'} enters the live circuit. You can change this anytime before or during racing.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {/* Option A: Character Mode */}
          <div
            onClick={() => onSelectMode('character')}
            style={{
              padding: '20px',
              borderRadius: '18px',
              border: currentMode === 'character' ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.12)',
              background: currentMode === 'character' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: currentMode === 'character' ? '0 0 20px rgba(56, 189, 248, 0.25)' : 'none',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '28px' }}>{isSuperman ? '🦸' : '🏃'}</span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: currentMode === 'character' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
                  color: currentMode === 'character' ? '#0f172a' : '#cbd5e1',
                  textTransform: 'uppercase',
                }}>
                  {currentMode === 'character' ? '✓ ACTIVE' : 'OPTION A'}
                </span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px', color: '#ffffff' }}>
                Character Mode
              </h3>
              <p style={{ fontSize: '12px', color: '#38bdf8', fontWeight: '600', margin: '0 0 10px' }}>
                {charData.name} {isSuperman ? '· Supersonic Flight' : '· Sprint Locomotion'}
              </p>
              <ul style={{ fontSize: '11px', color: '#cbd5e1', paddingLeft: '18px', margin: '0 0 14px', lineHeight: '1.6' }}>
                <li>Race using equipped character without a vehicle</li>
                <li>{isSuperman ? 'Authentic Superman flight animation at 1.25m elevation' : 'Natural athletic running stride with full movement cadence'}</li>
                <li>Preserves equipped outfits, colors, and accessories</li>
              </ul>
            </div>
            <button
              type="button"
              disabled={isUpdating}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '12px',
                border: 'none',
                fontWeight: '800',
                fontSize: '12px',
                background: currentMode === 'character' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
                color: currentMode === 'character' ? '#0f172a' : '#ffffff',
                cursor: 'pointer',
              }}
            >
              {currentMode === 'character' ? '✓ Selected Character Mode' : 'Select Character Mode'}
            </button>
          </div>

          {/* Option B: Vehicle Mode */}
          <div
            onClick={() => {
              if (hasVehicle) onSelectMode('vehicle');
            }}
            style={{
              padding: '20px',
              borderRadius: '18px',
              border: currentMode === 'vehicle' ? '2px solid #a855f7' : (hasVehicle ? '1px solid rgba(255, 255, 255, 0.12)' : '1px dashed rgba(255, 255, 255, 0.15)'),
              background: currentMode === 'vehicle' ? 'rgba(168, 85, 247, 0.14)' : (hasVehicle ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.01)'),
              cursor: hasVehicle ? 'pointer' : 'not-allowed',
              opacity: hasVehicle ? 1 : 0.65,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: currentMode === 'vehicle' ? '0 0 20px rgba(168, 85, 247, 0.25)' : 'none',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '28px' }}>
                  {!hasVehicle ? '🔒' : (equippedVehicle.modelType === 'bike' ? '🏍️' : equippedVehicle.modelType === 'car' ? '🏎️' : '🚀')}
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: currentMode === 'vehicle' ? '#a855f7' : 'rgba(255, 255, 255, 0.1)',
                  color: currentMode === 'vehicle' ? '#ffffff' : (hasVehicle ? '#cbd5e1' : '#f87171'),
                  textTransform: 'uppercase',
                }}>
                  {currentMode === 'vehicle' ? '✓ ACTIVE' : (hasVehicle ? 'OPTION B' : 'LOCKED')}
                </span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px', color: '#ffffff' }}>
                Vehicle Mode
              </h3>
              <p style={{ fontSize: '12px', color: hasVehicle ? '#c084fc' : '#94a3b8', fontWeight: '600', margin: '0 0 10px' }}>
                {hasVehicle ? `${equippedVehicle.name} (${equippedVehicle.category})` : 'No Vehicle Equipped'}
              </p>
              {hasVehicle ? (
                <ul style={{ fontSize: '11px', color: '#cbd5e1', paddingLeft: '18px', margin: '0 0 14px', lineHeight: '1.6' }}>
                  <li>Mount character inside/on equipped 3D vehicle</li>
                  <li>Vehicle kinematics: banking, wheel rotation, hover suspension</li>
                  <li>Displays vehicle speed and custom particle trail effects</li>
                </ul>
              ) : (
                <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '10px', padding: '10px 12px', fontSize: '11px', color: '#fda4af', lineHeight: '1.45', margin: '0 0 14px' }}>
                  ⚠️ Vehicle Mode requires an equipped vehicle. Visit the Character Store to hire a Superbike, Supercar, or Cosmic Rocket with DSA coins.
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={!hasVehicle || isUpdating}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '12px',
                border: 'none',
                fontWeight: '800',
                fontSize: '12px',
                background: !hasVehicle ? 'rgba(255, 255, 255, 0.05)' : (currentMode === 'vehicle' ? '#a855f7' : 'rgba(255, 255, 255, 0.1)'),
                color: !hasVehicle ? '#64748b' : '#ffffff',
                cursor: hasVehicle ? 'pointer' : 'not-allowed',
              }}
            >
              {!hasVehicle ? '🔒 Unavailable (No Vehicle)' : (currentMode === 'vehicle' ? '✓ Selected Vehicle Mode' : 'Select Vehicle Mode')}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            Active racer: <strong style={{ color: '#ffffff' }}>{racer?.name || 'Member'}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 24px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #7544ae 0%, #4f46e5 100%)',
              color: '#ffffff',
              fontWeight: '800',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(117, 68, 174, 0.4)',
            }}
          >
            Enter Live Arena →
          </button>
        </div>
      </div>
    </div>
  );
}

function WebGLFallbackArena({ arenaState }) {
  const racers = arenaState?.racers || [];
  const milestone = arenaState?.targetMilestone || 100;

  return (
    <div className="arena-fallback-container">
      <div className="arena-fallback-header">
        <h4>Endless World Journey (2D High-Performance Mode)</h4>
        <p>Target Milestone: {milestone} LeetCode Solved</p>
      </div>
      <div className="arena-fallback-track">
        {racers.map((racer) => {
          const memberId = racer.id || racer.memberId;
          const solvedText = racer.solvedAvailable === false
            ? 'Pending sync'
            : `${Number(racer.solved ?? racer.solvedCount ?? 0)} solved`;
          return (
            <div key={memberId} className="arena-fallback-lane">
              <div className="lane-badge">#{racer.rank}</div>
              <div className="lane-info">
                <span className="lane-name">{racer.name}</span>
                <span className="lane-score">{solvedText}</span>
              </div>
              <div className="lane-bar-track">
                <div
                  className={`lane-bar-fill rank-${racer.rank <= 3 ? racer.rank : 'other'}`}
                  style={{ width: `${Math.round((racer.progress || 0) * 100)}%` }}
                >
                  <span className="lane-avatar-icon">🏃</span>
                </div>
              </div>
              <div className="lane-percent">{Math.round((racer.progress || 0) * 100)}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   ROOT 3D LIVE RACE ARENA COMPONENT
───────────────────────────────────────────────────────────────── */
const RaceArena = forwardRef(function RaceArena(
  {
    arenaState,
    cameraMode = 'leader',
    reducedMotion = false,
    focusedMemberId = null,
    onFocusMember = null,
    onError = null,
    // Authenticated user's own vehicle state (from StudioContext).
    // Passed in so the Race Mode modal correctly reflects ownership even when
    // the arena state demo data omits vehicle fields for a racer.
    myEquippedVehicleId = null,
    myOwnedVehicles = null,
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

  const [isModeModalOpen, setIsModeModalOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('selectMode') === 'true';
    }
    return false;
  });
  const [customRacerModes, setCustomRacerModes] = useState({});
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);

  const focusedRacerId = focusedRacer ? (focusedRacer.id || focusedRacer.memberId) : null;
  // Derive the active race mode for the pill label.
  // Priority: local override → server raceMode field → vehicle in racer data
  // → vehicle in authenticated user's own StudioContext profile (fallback for
  //   demo data that omits equippedVehicleId for a racer).
  const resolvedDefaultMode = focusedRacer?.character?.raceMode ||
    (focusedRacer?.character?.equippedVehicleId ? 'vehicle' :
      ((myEquippedVehicleId && myOwnedVehicles && myOwnedVehicles[myEquippedVehicleId]) ? 'vehicle' : 'character'));
  const activeRacerMode = (focusedRacerId && customRacerModes[focusedRacerId]) || resolvedDefaultMode;

  const handleSelectMode = (mode) => {
    if (!focusedRacerId) return;
    setCustomRacerModes((prev) => ({ ...prev, [focusedRacerId]: mode }));
    setIsUpdatingMode(true);
    fetch('/api/characterverse/me/appearance', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ raceMode: mode }),
    })
      .catch(() => {})
      .finally(() => setIsUpdatingMode(false));
  };

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
  }));

  if (hasWebGLError) {
    return <WebGLFallbackArena arenaState={arenaState} />;
  }

  return (
    <div className="race-arena-root" style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Canvas
        camera={{ position: [0.0, 15.0, 75.0], fov: 48, near: 0.5, far: 550 }}
        dpr={Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.5)}
        gl={{ antialias: true, powerPreference: 'default' }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            setHasWebGLError(true);
            onError?.(new Error('WebGL context lost'));
          });
        }}
      >
        {/* Dynamic weather sky and distance fog */}
        <WeatherSky />

        {/* Dynamic lighting and sky elements */}
        <ArenaAtmosphere reducedMotion={reducedMotion} />

        {/* Endless Procedural Mountain-Valley World (Chunk Streaming) */}
        <DynamicProceduralWorld racers={racers} />

        {/* 8 Individually separated racers physically traveling forward along their lanes */}
        {racers.map((racer) => {
          const memberId = racer.id || racer.memberId;
          return (
            <ArenaRacer
              key={memberId}
              racer={{
                ...racer,
                raceModeOverride: customRacerModes[memberId] || null,
              }}
              racers={racers}
              reducedMotion={reducedMotion}
              onFocus={handleFocusMember}
            />
          );
        })}

        {/* User-controlled game camera with manual preservation */}
        <JourneyCamera
          ref={cameraRef}
          cameraMode={cameraMode}
          racers={racers}
          focusedMemberId={activeFocusId}
        />
      </Canvas>

      {/* Interactive Academic Journey HUD Overlay */}
      <ArenaMinimap
        racers={racers}
        focusedMemberId={activeFocusId}
        onFocusMember={handleFocusMember}
        milestone={milestone}
      />

      {/* Active Race Mode Selector Pill Button */}
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 25 }}>
        <button
          type="button"
          onClick={() => setIsModeModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            background: 'rgba(15, 23, 42, 0.90)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.20)',
            borderRadius: '999px',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
          }}
          title="Choose between Character Mode and Vehicle Mode"
        >
          <span>{activeRacerMode === 'vehicle' ? '🚀 Vehicle Mode' : '🏃 Character Mode'}</span>
          <span style={{ fontSize: '10px', background: 'rgba(168, 85, 247, 0.25)', border: '1px solid rgba(168, 85, 247, 0.4)', padding: '2px 8px', borderRadius: '999px', color: '#d8b4fe' }}>
            Change Mode
          </span>
        </button>
      </div>

      {/* Race Mode Selection Modal */}
      <RaceModeSelectionModal
        isOpen={isModeModalOpen}
        onClose={() => setIsModeModalOpen(false)}
        racer={focusedRacer}
        currentMode={activeRacerMode}
        onSelectMode={handleSelectMode}
        isUpdating={isUpdatingMode}
        myEquippedVehicleId={myEquippedVehicleId}
        myOwnedVehicles={myOwnedVehicles}
      />

      {/* Compact Vehicle Information Section (Phase 2 Store Vehicle Telemetry) */}
      <VehicleTelemetryHUD racer={focusedRacer} />
    </div>
  );
});

export default RaceArena;
