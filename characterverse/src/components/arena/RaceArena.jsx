import React, { Suspense, useMemo, useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLBCharacter } from '../viewer/CharacterViewer';
import { resolveCharacterDataFromAppearance } from '../viewer/CharacterAvatar';
import { VEHICLES } from '../../data/vehicles';

/* ─────────────────────────────────────────────────────────────────
   ROLLING HILL TERRAIN & CONTINUOUS PATH MATHEMATICS
───────────────────────────────────────────────────────────────── */
export function getTerrainHeight(worldX) {
  return (
    Math.sin(worldX * 0.12) * 1.45 +
    Math.sin(worldX * 0.28) * 0.55 +
    Math.cos(worldX * 0.05) * 0.95 +
    Math.sin(worldX * 0.07) * 0.65 +
    0.3
  );
}

/**
 * Authoritative running path height:
 * Guarantees the racing path stays 100% continuous and dry across all hills
 * and valley water crossings (elevated scenic causeway at -0.85).
 */
export function getRunnerPathHeight(worldX) {
  const raw = getTerrainHeight(worldX);
  return Math.max(-0.85, raw);
}

export function getTerrainSlope(worldX) {
  const h = 0.05;
  return (getRunnerPathHeight(worldX + h) - getRunnerPathHeight(worldX - h)) / (2 * h);
}

/**
 * Nonlinear racer position mapping across the expansive world:
 * Maps normalized progress [0, 1] across a wide 60-unit world span [-30, +30].
 * Uses a power curve (p^0.72) to stretch separation between close racers,
 * giving every racer a clearly visible, distinct position.
 */
export function getRacerWorldX(progress) {
  const p = Math.max(0, Math.min(1, typeof progress === 'number' ? progress : 0));
  return -32.0 + Math.pow(p, 0.65) * 64.0;
}

/**
 * Unified expansive 3D terrain height function covering both X and Z:
 * - Center corridor (-6 <= Z <= 6): smooth rolling runner causeway.
 * - Foreground (+7 <= Z <= 38): slopes into a crystal river channel at Z=6..24 (below water level), then rises to lush foreground knolls.
 * - Midground & Background (-7 <= Z <= -55): rolls gently upward into green meadow foothills before mountain peaks.
 */
export function getExpansiveTerrainHeight(worldX, worldZ) {
  const baseH = getRunnerPathHeight(worldX);

  if (worldZ >= -6 && worldZ <= 6) {
    // Smooth central racing meadow
    return baseH;
  } else if (worldZ > 6 && worldZ <= 24) {
    // Beautiful foreground crystal river channel (water level is at Y = -0.75)
    const t = (worldZ - 6) / 18; // 0 to 1
    const bankH = Math.min(0.1, baseH * (1 - t * 0.7));
    const riverBed = -1.8 + Math.sin(worldX * 0.12) * 0.15;
    return THREE.MathUtils.lerp(bankH, riverBed, Math.sin(t * Math.PI));
  } else if (worldZ > 24) {
    // Foreground knolls rising up in front of the river
    const bankFactor = (worldZ - 24) / 16;
    return -0.4 + bankFactor * 1.6 + Math.sin(worldX * 0.12) * 0.35;
  } else {
    // Background green meadow gently rolling up into mountain foothills
    const dist = (-worldZ - 6);
    const hillRise = Math.min(6.5, dist * 0.15);
    const hillRolling = Math.sin(worldX * 0.08 + dist * 0.09) * 1.1 + Math.cos(worldX * 0.14) * 0.55;
    return baseH * 0.3 + hillRise + hillRolling;
  }
}

function wrap(val, min, max) {
  const range = max - min;
  return ((((val - min) % range) + range) % range) + min;
}

/* ─────────────────────────────────────────────────────────────────
   DYNAMIC WEATHER & SEASON SYSTEM
   5 Atmospheric Presets: Summer Sunny, Golden Hour, Sunset, Night, Winter
───────────────────────────────────────────────────────────────── */
const WEATHER_PRESETS = [
  {
    name: 'Summer · Sunny',
    icon: '☀️',
    temp: '28°C',
    sky: '#38bdf8',
    fog: '#c7eaff',
    fogNear: 70,
    fogFar: 260,
    ambientIntensity: 1.25,
    ambientColor: '#ffffff',
    sunIntensity: 2.0,
    sunColor: '#fffbeb',
    sunPos: [25, 40, 20],
    fillIntensity: 0.6,
    fillColor: '#bae6fd',
    groundColor: '#22c55e',
    hillColor1: '#166534',
    hillColor2: '#14532d',
    mountainColor: '#3b82f6',
    snowColor: '#ffffff',
    waterColor: '#0284c7',
    cloudOpacity: 0.92,
    cloudColor: '#ffffff',
    duration: 30,
  },
  {
    name: 'Golden Hour',
    icon: '🌅',
    temp: '24°C',
    sky: '#fbbf24',
    fog: '#fde68a',
    fogNear: 65,
    fogFar: 250,
    ambientIntensity: 1.05,
    ambientColor: '#fef08a',
    sunIntensity: 2.2,
    sunColor: '#ff9a3c',
    sunPos: [35, 15, 18],
    fillIntensity: 0.4,
    fillColor: '#fed7aa',
    groundColor: '#4ade80',
    hillColor1: '#15803d',
    hillColor2: '#166534',
    mountainColor: '#78350f',
    snowColor: '#fef3c7',
    waterColor: '#f59e0b',
    cloudOpacity: 0.75,
    cloudColor: '#fde68a',
    duration: 20,
  },
  {
    name: 'Sunset · Dusk',
    icon: '🌇',
    temp: '19°C',
    sky: '#f97316',
    fog: '#fb923c',
    fogNear: 60,
    fogFar: 240,
    ambientIntensity: 0.75,
    ambientColor: '#ff7c55',
    sunIntensity: 1.6,
    sunColor: '#ef4444',
    sunPos: [42, 6, 14],
    fillIntensity: 0.3,
    fillColor: '#fca5a5',
    groundColor: '#16a34a',
    hillColor1: '#1e3a2f',
    hillColor2: '#14532d',
    mountainColor: '#581c87',
    snowColor: '#fecdd3',
    waterColor: '#c2410c',
    cloudOpacity: 0.7,
    cloudColor: '#fed7aa',
    duration: 18,
  },
  {
    name: 'Night · Stars',
    icon: '🌙',
    temp: '12°C',
    sky: '#090d16',
    fog: '#1e293b',
    fogNear: 55,
    fogFar: 220,
    ambientIntensity: 0.4,
    ambientColor: '#bfdbfe',
    sunIntensity: 0.55,
    sunColor: '#c7d2fe',
    sunPos: [-25, 32, 12],
    fillIntensity: 0.25,
    fillColor: '#93c5fd',
    groundColor: '#14532d',
    hillColor1: '#0f2d1e',
    hillColor2: '#082515',
    mountainColor: '#1e1b4b',
    snowColor: '#cbd5e1',
    waterColor: '#1e3a8a',
    cloudOpacity: 0.3,
    cloudColor: '#e0e7ff',
    duration: 22,
  },
  {
    name: 'Winter · Snow',
    icon: '❄️',
    temp: '-3°C',
    sky: '#e2e8f0',
    fog: '#f1f5f9',
    fogNear: 60,
    fogFar: 230,
    ambientIntensity: 1.15,
    ambientColor: '#f0f9ff',
    sunIntensity: 1.5,
    sunColor: '#ffffff',
    sunPos: [15, 28, 20],
    fillIntensity: 0.65,
    fillColor: '#e0f2fe',
    groundColor: '#f1f5f9',
    hillColor1: '#cbd5e1',
    hillColor2: '#94a3b8',
    mountainColor: '#64748b',
    snowColor: '#ffffff',
    waterColor: '#38bdf8',
    cloudOpacity: 0.88,
    cloudColor: '#ffffff',
    duration: 24,
  },
];

const weatherState = {
  presetIndex: 0,
  nextIndex: 1,
  t: 0,
  current: { ...WEATHER_PRESETS[0] },
};

function lerpColor(a, b, t) {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  return '#' + ca.lerp(cb, t).getHexString();
}

function lerpWeatherProp(key, preset, next, t) {
  const a = preset[key];
  const b = next[key];
  if (typeof a === 'number') return a + (b - a) * t;
  if (typeof a === 'string' && a.startsWith('#')) return lerpColor(a, b, t);
  return t < 0.5 ? a : b;
}

function updateWeatherState(delta) {
  const preset = WEATHER_PRESETS[weatherState.presetIndex];
  weatherState.t += delta / preset.duration;
  if (weatherState.t >= 1) {
    weatherState.t = 0;
    weatherState.presetIndex = weatherState.nextIndex;
    weatherState.nextIndex = (weatherState.nextIndex + 1) % WEATHER_PRESETS.length;
  }
  const t = Math.min(1, weatherState.t);
  const p = WEATHER_PRESETS[weatherState.presetIndex];
  const n = WEATHER_PRESETS[weatherState.nextIndex];
  const blendT = t > 0.85 ? (t - 0.85) / 0.15 : 0;
  for (const key of Object.keys(p)) {
    weatherState.current[key] = lerpWeatherProp(key, p, n, blendT);
  }
}

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

/* ─────────────────────────────────────────────────────────────────
   OVERHEAD RACER BILLBOARD TAG (High Resolution 3D Canvas Sprite)
   Clearly shows rank, name, verified solved count, and running lane.
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

  // Glowing border
  ctx.lineWidth = isTop3 ? 5 : 3;
  ctx.strokeStyle = isTop3 ? '#fef08a' : 'rgba(255, 255, 255, 0.35)';
  ctx.stroke();

  // Rank badge circle
  ctx.beginPath();
  ctx.arc(68, 64, 32, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Rank number or crown
  ctx.fillStyle = rank === 1 ? '#b45309' : '#0f172a';
  ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`#${rank}`, 68, 64);

  // Racer Name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  const rawName = String(racer.name || 'Member');
  const displayName = rawName.length > 14 ? rawName.slice(0, 13) + '…' : rawName;
  ctx.fillText(displayName, 116, 48);

  // Solved Stats (authoritative verified score)
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

  // Stagger height across ranks (Y = 2.45 to 3.5) to guarantee tags NEVER overlap in any view
  const rank = Number(racer.rank || 1);
  const posY = 2.45 + (rank % 3) * 0.52;

  return (
    <sprite position={[0, posY, 0]} scale={[3.3, 0.85, 1]}>
      <spriteMaterial map={texture} depthTest={false} transparent />
    </sprite>
  );
}

/* ─────────────────────────────────────────────────────────────────
   RACER MESH FALLBACK
───────────────────────────────────────────────────────────────── */
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
   SIDE-SCROLLING ARENA RACER ENTITY
   Positions characters fully above the terrain on all slopes.
───────────────────────────────────────────────────────────────── */
function ArenaRacer({ racer, scrollRef, reducedMotion, onFocus }) {
  const groupRef = useRef();
  const currentProgressRef = useRef(racer.progress || 0);

  const characterData = useMemo(() => {
    const appearance = racer.character || {};
    const base = resolveCharacterDataFromAppearance(appearance);
    return {
      ...base,
      vehicle: null,
      vehicleUpgrade: null,
      isDrivingMode: true, // triggers active running stride animation
    };
  }, [racer.character]);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const targetProgress = typeof racer.progress === 'number' ? racer.progress : 0;
    const lerpSpeed = reducedMotion ? 25 : 3.0;

    currentProgressRef.current = THREE.MathUtils.lerp(
      currentProgressRef.current,
      targetProgress,
      Math.min(1, delta * lerpSpeed)
    );

    // Authoritative world position using nonlinear wide-spread mapping
    const worldX = getRacerWorldX(currentProgressRef.current);
    const scroll = scrollRef.current;
    const terrainHeight = getRunnerPathHeight(worldX + scroll);
    const slope = getTerrainSlope(worldX + scroll);

    // Natural running stride bounce
    const t = clock.getElapsedTime();
    const laneIndex = typeof racer.laneIndex === 'number' ? racer.laneIndex : 0;
    const strideBob = reducedMotion ? 0 : Math.abs(Math.sin(t * 11 + laneIndex)) * 0.08;

    // Dedicated lane depth (Z axis): [-4.7 to +4.7] ensures zero collision between racers
    const laneZ = (laneIndex - 3.5) * 1.35;

    // Grounding: characters stand cleanly above grass, or Superman flies airborne with clearance
    const isSuperman = characterData?.id === 'superman';
    const verticalElevation = isSuperman
      ? 1.35 + (reducedMotion ? 0 : Math.sin(t * 3.2 + laneIndex) * 0.08)
      : 0.08 + strideBob;

    groupRef.current.position.set(worldX, terrainHeight + verticalElevation, laneZ);

    // Facing right (+X) with natural hill incline pitch and aerodynamic flight banking
    const slopePitch = Math.atan(slope) * 0.65;
    const flightPitch = isSuperman ? slopePitch + 0.15 : slopePitch;
    const flightBank = isSuperman && !reducedMotion ? Math.sin(t * 2.8 + laneIndex) * 0.08 : 0;
    groupRef.current.rotation.set(flightBank, Math.PI / 2, flightPitch);
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
   REALISTIC ANIMATED WATER RIVER & SHORELINE
   Expansive crystal river (width 280) with dynamic waves, reflections, and foam.
───────────────────────────────────────────────────────────────── */
function BeautifulWater({ scrollRef }) {
  const waterMeshRef = useRef();
  const foamNearRef = useRef();
  const foamFarRef = useRef();

  const { waterGeom, baseWaterPositions } = useMemo(() => {
    // 280 units along X, 18 units along Z (spanning Z = 7 to 25)
    const geom = new THREE.PlaneGeometry(280, 18, 140, 16);
    geom.rotateX(-Math.PI / 2);
    const base = new Float32Array(geom.attributes.position.array);
    return { waterGeom: geom, baseWaterPositions: base };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (waterMeshRef.current && waterMeshRef.current.geometry) {
      const pos = waterMeshRef.current.geometry.attributes.position;
      const count = pos.count;
      for (let i = 0; i < count; i++) {
        const vx = baseWaterPositions[i * 3];
        const vz = baseWaterPositions[i * 3 + 2];
        const wave =
          Math.sin(vx * 0.28 + t * 2.5) * 0.07 +
          Math.cos(vz * 0.45 + t * 1.8) * 0.05 +
          Math.sin((vx + vz) * 0.38 + t * 3.1) * 0.035;
        pos.setY(i, wave);
      }
      pos.needsUpdate = true;
      waterMeshRef.current.geometry.computeVertexNormals();

      // Dynamic water color matching weather
      const w = weatherState.current;
      if (waterMeshRef.current.material) {
        waterMeshRef.current.material.color.set(w.waterColor);
      }
    }

    if (foamNearRef.current) {
      foamNearRef.current.material.opacity = 0.45 + Math.sin(t * 3.2) * 0.15;
    }
    if (foamFarRef.current) {
      foamFarRef.current.material.opacity = 0.45 + Math.cos(t * 2.9) * 0.15;
    }
  });

  return (
    <group position={[0, -0.75, 15]}>
      {/* ── Continuous Crystal River Surface ── */}
      <mesh ref={waterMeshRef} geometry={waterGeom}>
        <meshStandardMaterial
          color="#0284c7"
          roughness={0.08}
          metalness={0.65}
          transparent
          opacity={0.88}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Shoreline Foam Strips along Near and Far Banks ── */}
      <mesh ref={foamNearRef} position={[0, 0.03, -8.8]}>
        <planeGeometry args={[276, 0.75]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.55} rotation={[-Math.PI / 2, 0, 0]} />
      </mesh>
      <mesh ref={foamFarRef} position={[0, 0.03, 8.8]}>
        <planeGeometry args={[276, 0.75]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.55} rotation={[-Math.PI / 2, 0, 0]} />
      </mesh>
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   VAST, CONTINUOUS PROCEDURAL PARALLAX ENVIRONMENT
   - 280-unit wide continuous rolling terrain (X: -140..+140, Z: -55..+40)
   - Living animated river with rocks and wildflowers
   - Multi-tier natural alpine conifer & leafy oak forests
   - Distant snow-capped mountain ranges with castle fortress
   - Atmospheric fog, day/night illumination, and winter snowfall
───────────────────────────────────────────────────────────────── */
function ParallaxEnvironment({ scrollRef, reducedMotion }) {
  const groundMeshRef = useRef();
  const groundMatRef = useRef();
  const midgroundRef = useRef();
  const distantRef = useRef();
  const cloudsRef = useRef();
  const ambientRef = useRef();
  const sunRef = useRef();
  const fillRef = useRef();
  const snowRef = useRef();

  // Expansive terrain grid: 280 wide (X), 95 deep (Z)
  const { groundGeom, basePositions } = useMemo(() => {
    const width = 280;
    const depth = 95;
    const segX = 140;
    const segZ = 48;
    const geom = new THREE.PlaneGeometry(width, depth, segX, segZ);
    geom.rotateX(-Math.PI / 2);
    // Center mesh around Z = -7.5 so it covers Z = -55 to +40
    geom.translate(0, 0, -7.5);
    const base = new Float32Array(geom.attributes.position.array);
    return { groundGeom: geom, basePositions: base };
  }, []);

  // Trackside natural items (alpine pines, broadleaf oaks, flowering bushes, boulders, signposts)
  const tracksideItems = useMemo(() => {
    const items = [];
    const types = ['pine', 'oak', 'bush', 'flower', 'rock', 'signpost'];
    for (let i = 0; i < 48; i++) {
      const initX = -65 + i * 2.8;
      // Stagger along foreground and background margins
      const zOffset = i % 2 === 0 ? -5.8 - (i % 3) * 1.5 : 6.8 + (i % 3) * 1.2;
      const type = types[i % types.length];
      const scale = 0.75 + ((i * 17) % 10) * 0.04;
      items.push({ initX, zOffset, type, scale });
    }
    return items;
  }, []);

  const tracksideRefs = useRef([]);

  // Distant volumetric clouds
  const cloudItems = useMemo(() => {
    return [
      { x: -55, y: 19, z: -45, scale: [5.5, 1.8, 2.2] },
      { x: -28, y: 22, z: -52, scale: [6.8, 2.0, 2.5] },
      { x: 5, y: 18, z: -48, scale: [5.0, 1.6, 2.0] },
      { x: 38, y: 21, z: -50, scale: [6.2, 1.9, 2.4] },
      { x: 72, y: 19, z: -46, scale: [5.2, 1.7, 2.1] },
      { x: -85, y: 20, z: -55, scale: [7.0, 2.2, 2.6] },
    ];
  }, []);

  // 3D Snow particle system (active in winter/night)
  const snowParticles = useMemo(() => {
    const count = 300;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = Math.random() * 24 + 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 35;
    }
    return positions;
  }, []);

  useFrame((state, delta) => {
    const scrollSpeed = reducedMotion ? 0.8 : 4.5;
    scrollRef.current += delta * scrollSpeed;
    const scroll = scrollRef.current;

    // Update dynamic weather transitions
    updateWeatherState(delta);
    const w = weatherState.current;

    // 1. Update continuous expansive rolling terrain
    if (groundMeshRef.current && groundMeshRef.current.geometry) {
      const geom = groundMeshRef.current.geometry;
      const pos = geom.attributes.position;
      const count = pos.count;
      for (let i = 0; i < count; i++) {
        const vx = basePositions[i * 3];
        const vz = basePositions[i * 3 + 2];
        const height = getExpansiveTerrainHeight(vx + scroll, vz);
        pos.setY(i, height);
      }
      pos.needsUpdate = true;
      geom.computeVertexNormals();
    }

    if (groundMatRef.current) {
      groundMatRef.current.color.set(w.groundColor);
    }

    // 2. Parallax midground scrolling (35% speed)
    if (midgroundRef.current) {
      midgroundRef.current.position.x = wrap(-scroll * 0.35, -45, 45);
    }

    // 3. Parallax distant mountain scrolling (10% speed)
    if (distantRef.current) {
      distantRef.current.position.x = wrap(-scroll * 0.1, -60, 60);
    }

    // 4. Parallax drifting clouds (4% speed)
    if (cloudsRef.current) {
      cloudsRef.current.position.x = wrap(-scroll * 0.04, -40, 40);
      cloudsRef.current.children.forEach((group) => {
        group.children.forEach((mesh) => {
          if (mesh.material) {
            mesh.material.color.set(w.cloudColor);
            mesh.material.opacity = w.cloudOpacity;
          }
        });
      });
    }

    // 5. Wrap trackside flora seamlessly
    tracksideItems.forEach((item, idx) => {
      const el = tracksideRefs.current[idx];
      if (el) {
        const worldX = wrap(item.initX - scroll, -65, 65);
        const currentH = getExpansiveTerrainHeight(worldX + scroll, item.zOffset);
        el.position.set(worldX, currentH, item.zOffset);
      }
    });

    // 6. Winter & night falling snow particles
    if (snowRef.current) {
      const isWinter = weatherState.presetIndex === 4 || weatherState.nextIndex === 4;
      const isNight = weatherState.presetIndex === 3 || weatherState.nextIndex === 3;
      snowRef.current.visible = isWinter || isNight;
      if (snowRef.current.visible) {
        const pos = snowRef.current.geometry.attributes.position;
        const t = state.clock.getElapsedTime();
        for (let i = 0; i < 300; i++) {
          let y = pos.getY(i) - delta * (1.2 + Math.sin(i) * 0.5);
          if (y < -1) y = 24;
          pos.setY(i, y);
          const x = pos.getX(i) + Math.sin(t * 0.6 + i) * delta * 0.3;
          pos.setX(i, x);
        }
        pos.needsUpdate = true;
      }
    }

    // 7. Update lighting from weather state
    if (ambientRef.current) {
      ambientRef.current.intensity = w.ambientIntensity;
      ambientRef.current.color.set(w.ambientColor);
    }
    if (sunRef.current) {
      sunRef.current.intensity = w.sunIntensity;
      sunRef.current.color.set(w.sunColor);
      sunRef.current.position.set(...w.sunPos);
    }
    if (fillRef.current) {
      fillRef.current.intensity = w.fillIntensity;
      fillRef.current.color.set(w.fillColor);
    }
  });

  return (
    <group>
      {/* ── Dynamic Weather Scene Lighting ── */}
      <ambientLight ref={ambientRef} intensity={1.25} color="#ffffff" />
      <directionalLight
        ref={sunRef}
        position={[25, 40, 20]}
        intensity={2.0}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight ref={fillRef} position={[-20, 25, 12]} intensity={0.6} color="#bae6fd" />

      {/* ── Continuous Vast Rolling Terrain (280 units wide, no cliffs/cuts!) ── */}
      <mesh ref={groundMeshRef} geometry={groundGeom} receiveShadow>
        <meshStandardMaterial
          ref={groundMatRef}
          color="#22c55e"
          roughness={0.78}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Living Reflective River System ── */}
      <BeautifulWater scrollRef={scrollRef} />

      {/* ── 3D Snow Particle System ── */}
      <points ref={snowRef} visible={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[snowParticles, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.16} color="#f0f9ff" transparent opacity={0.8} sizeAttenuation />
      </points>

      {/* ── Rich Natural Trackside Flora & Details ── */}
      <group>
        {tracksideItems.map((item, idx) => (
          <group
            key={idx}
            ref={(el) => (tracksideRefs.current[idx] = el)}
            position={[item.initX, 0, item.zOffset]}
            scale={[item.scale, item.scale, item.scale]}
          >
            {item.type === 'pine' ? (
              // Multi-tiered dense Alpine Pine
              <group>
                <mesh position={[0, 0.6, 0]} castShadow>
                  <cylinderGeometry args={[0.14, 0.24, 1.2, 6]} />
                  <meshStandardMaterial color="#451a03" roughness={0.9} />
                </mesh>
                <mesh position={[0, 1.8, 0]} castShadow>
                  <coneGeometry args={[1.15, 2.2, 7]} />
                  <meshStandardMaterial color="#14532d" roughness={0.8} />
                </mesh>
                <mesh position={[0, 2.9, 0]} castShadow>
                  <coneGeometry args={[0.9, 1.9, 7]} />
                  <meshStandardMaterial color="#166534" roughness={0.8} />
                </mesh>
                <mesh position={[0, 3.8, 0]} castShadow>
                  <coneGeometry args={[0.62, 1.5, 7]} />
                  <meshStandardMaterial color="#15803d" roughness={0.75} />
                </mesh>
              </group>
            ) : item.type === 'oak' ? (
              // Organic broadleaf Meadow Oak
              <group>
                <mesh position={[0, 0.8, 0]} castShadow>
                  <cylinderGeometry args={[0.18, 0.3, 1.6, 6]} />
                  <meshStandardMaterial color="#78350f" roughness={0.9} />
                </mesh>
                <mesh position={[0, 2.4, 0]} castShadow>
                  <dodecahedronGeometry args={[1.35, 1]} />
                  <meshStandardMaterial color="#15803d" roughness={0.75} />
                </mesh>
                <mesh position={[0.6, 2.8, 0.3]} castShadow>
                  <dodecahedronGeometry args={[0.9, 1]} />
                  <meshStandardMaterial color="#16a34a" roughness={0.75} />
                </mesh>
                <mesh position={[-0.5, 2.6, -0.4]} castShadow>
                  <dodecahedronGeometry args={[0.85, 1]} />
                  <meshStandardMaterial color="#22c55e" roughness={0.75} />
                </mesh>
              </group>
            ) : item.type === 'bush' ? (
              // Lush Meadow Shrub
              <group>
                <mesh position={[0, 0.45, 0]} castShadow>
                  <sphereGeometry args={[0.65, 8, 7]} />
                  <meshStandardMaterial color="#4ade80" roughness={0.8} />
                </mesh>
                <mesh position={[0.45, 0.32, 0.15]} castShadow>
                  <sphereGeometry args={[0.42, 7, 6]} />
                  <meshStandardMaterial color="#86efac" roughness={0.8} />
                </mesh>
              </group>
            ) : item.type === 'flower' ? (
              // Blooming Wildflowers
              <group>
                <mesh position={[0, 0.25, 0]}>
                  <sphereGeometry args={[0.35, 6, 5]} />
                  <meshStandardMaterial color="#22c55e" roughness={0.8} />
                </mesh>
                <mesh position={[0.15, 0.45, 0.1]}>
                  <sphereGeometry args={[0.16, 5, 4]} />
                  <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={0.3} />
                </mesh>
                <mesh position={[-0.15, 0.42, -0.1]}>
                  <sphereGeometry args={[0.14, 5, 4]} />
                  <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} />
                </mesh>
              </group>
            ) : item.type === 'rock' ? (
              // Faceted Granite Boulder
              <group>
                <mesh position={[0, 0.35, 0]} castShadow>
                  <dodecahedronGeometry args={[0.65, 0]} />
                  <meshStandardMaterial color="#64748b" roughness={0.92} metalness={0.08} />
                </mesh>
                <mesh position={[0.4, 0.22, 0.2]} castShadow>
                  <dodecahedronGeometry args={[0.38, 0]} />
                  <meshStandardMaterial color="#475569" roughness={0.92} />
                </mesh>
              </group>
            ) : (
              // Distance Landmark Signpost
              <group>
                <mesh position={[0, 0.85, 0]}>
                  <cylinderGeometry args={[0.08, 0.08, 1.7, 6]} />
                  <meshStandardMaterial color="#b45309" roughness={0.85} />
                </mesh>
                <mesh position={[0, 1.45, 0]}>
                  <boxGeometry args={[0.95, 0.42, 0.09]} />
                  <meshStandardMaterial color="#fef08a" roughness={0.6} />
                </mesh>
              </group>
            )}
          </group>
        ))}
      </group>

      {/* ── Midground Rolling Forest Hills (Z = -42, 35% Parallax) ── */}
      <group ref={midgroundRef} position={[0, -0.5, -42]}>
        {[-70, 0, 70].map((offsetX, i) => (
          <group key={i} position={[offsetX, 0, 0]}>
            {/* Gentle rolling green knolls nestled under the mountains */}
            <mesh position={[-18, 0.8, 0]}>
              <sphereGeometry args={[11, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
              <meshStandardMaterial color="#166534" roughness={0.88} />
            </mesh>
            <mesh position={[10, 1.4, -2]}>
              <sphereGeometry args={[13, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
              <meshStandardMaterial color="#14532d" roughness={0.88} />
            </mesh>
            <mesh position={[34, 0.9, 1]}>
              <sphereGeometry args={[10, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
              <meshStandardMaterial color="#166534" roughness={0.88} />
            </mesh>
            {/* Midground pine tree groves */}
            {[-22, -10, 2, 16, 28, 42].map((tx, ti) => (
              <group key={ti} position={[tx, 1.8 + (ti % 3) * 0.5, -1.0]}>
                <mesh position={[0, 0.5, 0]}>
                  <cylinderGeometry args={[0.12, 0.2, 1.0, 5]} />
                  <meshStandardMaterial color="#451a03" roughness={0.9} />
                </mesh>
                <mesh position={[0, 1.8, 0]}>
                  <coneGeometry args={[0.95, 2.4, 6]} />
                  <meshStandardMaterial color="#14532d" roughness={0.78} />
                </mesh>
              </group>
            ))}
          </group>
        ))}
      </group>

      {/* ── Radiant Morning Sun & Golden Corona ── */}
      <group position={[-36, 26, -72]}>
        <mesh>
          <circleGeometry args={[5.2, 32]} />
          <meshBasicMaterial color="#fffbeb" />
        </mesh>
        <mesh position={[0, 0, -0.1]}>
          <circleGeometry args={[9.5, 32]} />
          <meshBasicMaterial color="#fef08a" transparent opacity={0.4} />
        </mesh>
        <mesh position={[0, 0, -0.2]}>
          <circleGeometry args={[17.0, 32]} />
          <meshBasicMaterial color="#fb923c" transparent opacity={0.2} />
        </mesh>
      </group>

      {/* ── Hot Air Balloon Floating Gracefully in the Morning Breeze ── */}
      <group position={[-21, 20.5, -58]} scale={[0.85, 0.85, 0.85]}>
        <mesh position={[0, 2.6, 0]}>
          <sphereGeometry args={[2.0, 16, 14]} />
          <meshStandardMaterial color="#f97316" roughness={0.6} />
        </mesh>
        <mesh position={[0, 2.6, 0]}>
          <cylinderGeometry args={[2.02, 1.95, 1.0, 16, 1, true]} />
          <meshStandardMaterial color="#fbbf24" roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.1, 0]}>
          <coneGeometry args={[1.5, 1.6, 14]} />
          <meshStandardMaterial color="#ea580c" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.6, 4]} />
          <meshStandardMaterial color="#78350f" />
        </mesh>
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[0.7, 0.55, 0.7]} />
          <meshStandardMaterial color="#92400e" roughness={0.9} />
        </mesh>
      </group>

      {/* ── Silhouette Birds Soaring Across the Alpine Valley ── */}
      <group position={[-6, 27, -62]} scale={[0.6, 0.6, 0.6]}>
        {[
          { x: 0, y: 0, s: 1 },
          { x: 3.5, y: -0.8, s: 0.8 },
          { x: -4.2, y: -1.2, s: 0.85 },
          { x: 7.0, y: -1.9, s: 0.7 },
        ].map((b, bi) => (
          <group key={bi} position={[b.x, b.y, 0]} scale={[b.s, b.s, b.s]}>
            <mesh rotation={[0, 0, 0.4]} position={[-0.45, 0.1, 0]}>
              <boxGeometry args={[0.8, 0.08, 0.02]} />
              <meshBasicMaterial color="#1e293b" />
            </mesh>
            <mesh rotation={[0, 0, -0.4]} position={[0.45, 0.1, 0]}>
              <boxGeometry args={[0.8, 0.08, 0.02]} />
              <meshBasicMaterial color="#1e293b" />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── Distant Majestic Snow-Capped Alpine Range & Castle Fortress (Z = -75, 10% Parallax) ── */}
      <group ref={distantRef} position={[0, 8, -75]}>
        {[-90, 0, 90].map((offsetX, i) => (
          <group key={i} position={[offsetX, 0, 0]}>
            {/* Massive Granite Peak 1 */}
            <mesh position={[-32, 12, 0]}>
              <coneGeometry args={[26, 42, 8]} />
              <meshStandardMaterial color="#334155" roughness={0.88} />
            </mesh>
            {/* Glistening Snow Cap 1 */}
            <mesh position={[-32, 28, 0]}>
              <coneGeometry args={[11, 14, 8]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.4} />
            </mesh>

            {/* Central Towering Peak 2 */}
            <mesh position={[8, 18, -4]}>
              <coneGeometry args={[34, 55, 9]} />
              <meshStandardMaterial color="#1e293b" roughness={0.88} />
            </mesh>
            {/* Glistening Snow Cap 2 */}
            <mesh position={[8, 40, -4]}>
              <coneGeometry args={[15, 18, 9]} />
              <meshStandardMaterial color="#f1f5f9" roughness={0.35} />
            </mesh>

            {/* Right Shoulder Peak 3 */}
            <mesh position={[44, 10, 2]}>
              <coneGeometry args={[24, 38, 7]} />
              <meshStandardMaterial color="#334155" roughness={0.88} />
            </mesh>
            {/* Glistening Snow Cap 3 */}
            <mesh position={[44, 25, 2]}>
              <coneGeometry args={[9.5, 12, 7]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.4} />
            </mesh>

            {/* Historic Mountain Fortress / Castle (matching visual reference) */}
            <group position={[18, 16, -1]}>
              <mesh position={[0, 2.5, 0]}>
                <boxGeometry args={[5.0, 5.0, 4.0]} />
                <meshStandardMaterial color="#1e1b4b" roughness={0.92} />
              </mesh>
              <mesh position={[-3.2, 4.5, 0]}>
                <boxGeometry args={[2.0, 7.0, 2.0]} />
                <meshStandardMaterial color="#1e1b4b" roughness={0.92} />
              </mesh>
              <mesh position={[3.2, 4.5, 0]}>
                <boxGeometry args={[2.0, 7.0, 2.0]} />
                <meshStandardMaterial color="#1e1b4b" roughness={0.92} />
              </mesh>
              <mesh position={[-3.2, 9.0, 0]}>
                <coneGeometry args={[1.5, 3.2, 4]} />
                <meshStandardMaterial color="#7c3aed" roughness={0.8} />
              </mesh>
              <mesh position={[3.2, 9.0, 0]}>
                <coneGeometry args={[1.5, 3.2, 4]} />
                <meshStandardMaterial color="#7c3aed" roughness={0.8} />
              </mesh>
              <mesh position={[0, 6.5, 0]}>
                <coneGeometry args={[2.6, 4.0, 4]} />
                <meshStandardMaterial color="#9333ea" roughness={0.8} />
              </mesh>
            </group>
          </group>
        ))}
      </group>

      {/* ── Volumetric Drifting Clouds (4% Parallax) ── */}
      <group ref={cloudsRef}>
        {cloudItems.map((c, i) => (
          <group key={i} position={[c.x, c.y, c.z]} scale={c.scale}>
            <mesh>
              <sphereGeometry args={[1.2, 10, 8]} />
              <meshStandardMaterial color="#ffffff" roughness={0.6} transparent opacity={0.92} />
            </mesh>
            <mesh position={[1.2, -0.05, 0]} scale={[0.88, 0.88, 0.88]}>
              <sphereGeometry args={[1.2, 10, 8]} />
              <meshStandardMaterial color="#ffffff" roughness={0.6} transparent opacity={0.92} />
            </mesh>
            <mesh position={[-1.1, -0.12, 0]} scale={[0.8, 0.8, 0.8]}>
              <sphereGeometry args={[1.2, 10, 8]} />
              <meshStandardMaterial color="#ffffff" roughness={0.6} transparent opacity={0.92} />
            </mesh>
            <mesh position={[0.5, 0.45, 0]} scale={[0.65, 0.65, 0.65]}>
              <sphereGeometry args={[1.2, 10, 8]} />
              <meshStandardMaterial color="#ffffff" roughness={0.6} transparent opacity={0.88} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FLUID GAME CAMERA & INTERACTIVE ORBIT/PAN/ZOOM CONTROLS
───────────────────────────────────────────────────────────────── */
const SideScrollCamera = forwardRef(function SideScrollCamera(
  { cameraMode, racers, focusedMemberId, scrollRef },
  ref
) {
  const { camera } = useThree();
  const controlsRef = useRef();
  const userInteractingRef = useRef(false);
  const prevCameraModeRef = useRef(cameraMode);
  const prevFocusedRef = useRef(focusedMemberId);

  const leaderTarget = racers?.[0];
  const targetMember = focusedMemberId
    ? racers?.find((r) => r.id === focusedMemberId || r.memberId === focusedMemberId) || leaderTarget
    : leaderTarget;

  useEffect(() => {
    if (prevCameraModeRef.current !== cameraMode || prevFocusedRef.current !== focusedMemberId) {
      userInteractingRef.current = false;
      prevCameraModeRef.current = cameraMode;
      prevFocusedRef.current = focusedMemberId;
    }
  }, [cameraMode, focusedMemberId]);

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (controlsRef.current) {
        controlsRef.current.dollyIn(1.25);
        controlsRef.current.update();
      }
    },
    zoomOut: () => {
      if (controlsRef.current) {
        controlsRef.current.dollyOut(1.25);
        controlsRef.current.update();
      }
    },
    resetView: () => {
      userInteractingRef.current = false;
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 2.0, 0);
        camera.position.set(0.0, 12.0, 42.0);
        controlsRef.current.update();
      }
    },
    focusMember: (memberId) => {
      userInteractingRef.current = false;
      const m = racers?.find((r) => r.id === memberId || r.memberId === memberId);
      if (m && controlsRef.current) {
        const prog = typeof m.progress === 'number' ? m.progress : 0;
        const tx = getRacerWorldX(prog);
        const ty = getRunnerPathHeight(tx + scrollRef.current);
        controlsRef.current.target.set(tx, ty + 0.8, 0);
        camera.position.set(tx - 3.0, ty + 3.2, 16.5);
        controlsRef.current.update();
      }
    },
  }));

  useFrame((_, delta) => {
    if (userInteractingRef.current) return;

    if (cameraMode === 'leader' && targetMember) {
      const targetProgress = typeof targetMember.progress === 'number' ? targetMember.progress : 0;
      const targetX = getRacerWorldX(targetProgress);
      const scroll = scrollRef.current;
      const targetY = getRunnerPathHeight(targetX + scroll);

      const camX = targetX - 3.0;
      const camY = Math.max(2.8, targetY + 3.2);
      const camZ = 16.5;

      camera.position.x = THREE.MathUtils.lerp(camera.position.x, camX, delta * 3.0);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, camY, delta * 2.5);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, camZ, delta * 3.0);

      if (controlsRef.current) {
        controlsRef.current.target.x = THREE.MathUtils.lerp(controlsRef.current.target.x, targetX + 2.5, delta * 3.0);
        controlsRef.current.target.y = THREE.MathUtils.lerp(controlsRef.current.target.y, targetY + 1.2, delta * 2.5);
        controlsRef.current.target.z = THREE.MathUtils.lerp(controlsRef.current.target.z, 0, delta * 3.0);
        controlsRef.current.update();
      }
    } else if (cameraMode === 'broadcast') {
      // Majestic panoramic wide broadcast framing all 8 racers across the 60-unit course
      const targetCam = new THREE.Vector3(0.0, 12.0, 42.0);
      camera.position.lerp(targetCam, delta * 2.5);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(new THREE.Vector3(0, 2.0, 0), delta * 2.5);
        controlsRef.current.update();
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping={true}
      dampingFactor={0.08}
      minDistance={4}
      maxDistance={65}
      minPolarAngle={Math.PI / 8}
      maxPolarAngle={Math.PI / 2 - 0.02}
      screenSpacePanning={true}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
      onStart={() => {
        userInteractingRef.current = true;
      }}
    />
  );
});

/* ─────────────────────────────────────────────────────────────────
   INTERACTIVE RACING MINIMAP HUD COMPONENT
   Shows all 8 racers along the circuit track with rank, leader crown,
   and interactive camera focus click.
───────────────────────────────────────────────────────────────── */
function ArenaMinimap({ racers, focusedMemberId, onFocusMember, milestone }) {
  if (!racers || racers.length === 0) return null;

  return (
    <div className="arena-minimap-container" aria-label="Race Circuit Minimap">
      <div className="minimap-header">
        <span className="minimap-title">🏁 RACE CIRCUIT TRACK</span>
        <span className="minimap-milestone">Goal: {milestone || 100} solved</span>
      </div>
      <div className="minimap-track-rail">
        <div className="minimap-track-progress-line" />
        {racers.map((racer) => {
          const memberId = racer.id || racer.memberId;
          const isFocused = memberId === focusedMemberId;
          const isLeader = racer.rank === 1;
          const progressPercent = Math.max(0, Math.min(100, Math.round((racer.progress || 0) * 100)));
          const rank = racer.rank || 1;

          return (
            <button
              key={memberId}
              type="button"
              className={`minimap-pin rank-${rank <= 3 ? rank : 'other'}${isFocused ? ' focused' : ''}`}
              style={{ left: `${progressPercent}%` }}
              title={`#${rank} ${racer.name} (${Number(racer.solved ?? racer.solvedCount ?? 0)} solved)`}
              onClick={() => onFocusMember?.(memberId)}
            >
              {isLeader ? (
                <span className="minimap-crown">👑</span>
              ) : (
                <span className="minimap-num">{rank}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="minimap-track-labels">
        <span>START (0)</span>
        <span>50%</span>
        <span>FINISH ({milestone || 100}) 🏆</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   2D HILL-CLIMBING RUNNER WEBGL FALLBACK
───────────────────────────────────────────────────────────────── */
function WebGLFallbackArena({ arenaState }) {
  const racers = arenaState?.racers || [];
  const milestone = arenaState?.targetMilestone || 100;

  return (
    <div className="arena-fallback-container">
      <div className="arena-fallback-header">
        <h4>Side-Scrolling Hill Runner (2D High-Performance Mode)</h4>
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
   ROOT SIDE-SCROLLING RACE ARENA COMPONENT
───────────────────────────────────────────────────────────────── */
const RaceArena = forwardRef(function RaceArena(
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
  const scrollRef = useRef(0);
  const cameraRef = useRef();

  useImperativeHandle(ref, () => ({
    zoomIn: () => cameraRef.current?.zoomIn(),
    zoomOut: () => cameraRef.current?.zoomOut(),
    resetView: () => cameraRef.current?.resetView(),
    focusMember: (id) => cameraRef.current?.focusMember(id),
  }));

  if (hasWebGLError) {
    return <WebGLFallbackArena arenaState={arenaState} />;
  }

  return (
    <div className="race-arena-root" style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Canvas
        camera={{ position: [0.0, 12.0, 42.0], fov: 45, near: 0.5, far: 350 }}
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

        {/* Vast continuous procedural environment with living river and mountain peaks */}
        <ParallaxEnvironment scrollRef={scrollRef} reducedMotion={reducedMotion} />

        {/* 8 Individually separated racers spread across the 60-unit world course */}
        {racers.map((racer) => {
          const memberId = racer.id || racer.memberId;
          return (
            <ArenaRacer
              key={memberId}
              racer={racer}
              scrollRef={scrollRef}
              reducedMotion={reducedMotion}
              onFocus={onFocusMember}
            />
          );
        })}

        {/* Smooth cinematic game camera */}
        <SideScrollCamera
          ref={cameraRef}
          cameraMode={cameraMode}
          racers={racers}
          focusedMemberId={focusedMemberId}
          scrollRef={scrollRef}
        />
      </Canvas>

      {/* Interactive Race Minimap HUD Overlay */}
      <ArenaMinimap
        racers={racers}
        focusedMemberId={focusedMemberId}
        onFocusMember={onFocusMember}
        milestone={milestone}
      />
    </div>
  );
});

export default RaceArena;
