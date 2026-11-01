import React, { Suspense, useMemo, useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLBCharacter } from '../viewer/CharacterViewer';
import { resolveCharacterDataFromAppearance } from '../viewer/CharacterAvatar';
import { VEHICLES } from '../../data/vehicles';

/* ─────────────────────────────────────────────────────────────────
   CIRCULAR 3D RACING CIRCUIT CONFIGURATION & MATHEMATICS
   - Large, closed-loop athletics-style racing circuit inspired by Olympic tracks.
   - Start line and finish line meet at the exact same physical point (closed loop).
   - Exactly eight parallel running lanes around the entire 360° circuit.
   - Distinct radii per lane: zero lane cutting or collisions.
───────────────────────────────────────────────────────────────── */
export const TRACK_CONFIG = {
  innerRadius: 30.0,
  laneWidth: 2.0,
  laneCount: 8,
  startAngle: 0, // In radians: at theta = 0 (X = 0, Z = +R), foreground start/finish
  get outerRadius() {
    return this.innerRadius + this.laneCount * this.laneWidth; // 46.0
  },
  getLaneRadius(laneIndex) {
    const lane = Math.max(0, Math.min(this.laneCount - 1, typeof laneIndex === 'number' ? laneIndex : 0));
    return this.innerRadius + (lane + 0.5) * this.laneWidth;
  },
};

/**
 * Returns the exact 3D coordinates [X, Y, Z] on the circular track for a racer.
 * Smoothly interpolates along the closed loop based on verified LeetCode progress [0, 1].
 */
export function getCircularRacerPosition(progress, laneIndex) {
  const p = Math.max(0, Math.min(1, typeof progress === 'number' ? progress : 0));
  const r = TRACK_CONFIG.getLaneRadius(laneIndex);
  // Counter-clockwise running direction: theta increases from 0 to 2*PI
  const theta = TRACK_CONFIG.startAngle + p * Math.PI * 2;
  const x = r * Math.sin(theta);
  const z = r * Math.cos(theta);
  const y = 0.05;
  return [x, y, z];
}

/**
 * Returns forward tangent angle (heading in radians) around the circular track.
 */
export function getCircularRacerHeading(progress) {
  const p = Math.max(0, Math.min(1, typeof progress === 'number' ? progress : 0));
  const theta = TRACK_CONFIG.startAngle + p * Math.PI * 2;
  // Tangent vector: dX/dtheta = r*cos(theta), dZ/dtheta = -r*sin(theta)
  // Character forward is aligned to this tangent
  return Math.atan2(Math.cos(theta), -Math.sin(theta));
}

// Backward-compatible math exports to protect external tests/imports
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
export function getExpansiveTerrainHeight(worldX, worldZ) {
  return 0.05;
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
    fogNear: 85,
    fogFar: 280,
    ambientIntensity: 1.25,
    ambientColor: '#ffffff',
    sunIntensity: 2.0,
    sunColor: '#fffbeb',
    sunPos: [35, 45, 30],
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
    fogNear: 80,
    fogFar: 270,
    ambientIntensity: 1.05,
    ambientColor: '#fef08a',
    sunIntensity: 2.2,
    sunColor: '#ff9a3c',
    sunPos: [45, 20, 25],
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
    fogNear: 75,
    fogFar: 250,
    ambientIntensity: 0.75,
    ambientColor: '#ff7c55',
    sunIntensity: 1.6,
    sunColor: '#ef4444',
    sunPos: [50, 10, 15],
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
    fogNear: 65,
    fogFar: 230,
    ambientIntensity: 0.4,
    ambientColor: '#bfdbfe',
    sunIntensity: 0.55,
    sunColor: '#c7d2fe',
    sunPos: [-30, 35, 15],
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
    fogNear: 70,
    fogFar: 250,
    ambientIntensity: 1.15,
    ambientColor: '#f0f9ff',
    sunIntensity: 1.5,
    sunColor: '#ffffff',
    sunPos: [20, 32, 25],
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

/* ─────────────────────────────────────────────────────────────────
   RACER MESH FALLBACK & PRESENTATION
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
   CIRCULAR ARENA RACER ENTITY
   Positions characters on their exact distinct circular lane,
   facing forward along the curve tangent with running strides.
───────────────────────────────────────────────────────────────── */
function ArenaRacer({ racer, reducedMotion, onFocus }) {
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

    const laneIndex = typeof racer.laneIndex === 'number' ? racer.laneIndex : 0;
    const [posX, posY, posZ] = getCircularRacerPosition(currentProgressRef.current, laneIndex);
    const heading = getCircularRacerHeading(currentProgressRef.current);

    const t = clock.getElapsedTime();
    const strideBob = reducedMotion ? 0 : Math.abs(Math.sin(t * 11 + laneIndex)) * 0.08;

    // Superman elevated flight clearance (tested in superman.test.js)
    const isSuperman = characterData?.id === 'superman';
    const verticalElevation = isSuperman
      ? 1.25 + (reducedMotion ? 0 : Math.sin(t * 3.2 + laneIndex) * 0.08)
      : 0.06 + strideBob;

    groupRef.current.position.set(posX, posY + verticalElevation, posZ);

    const flightBank = isSuperman && !reducedMotion ? Math.sin(t * 2.8 + laneIndex) * 0.08 : 0;
    groupRef.current.rotation.set(flightBank, heading, 0);
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
   CHECKERED START / FINISH TEXTURE GENERATOR
   Creates a crisp 16x6 black and white checkered grid across all 8 lanes.
───────────────────────────────────────────────────────────────── */
function createCheckeredStartTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const cols = 16;
  const rows = 6;
  const cellW = canvas.width / cols;
  const cellH = canvas.height / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#0f172a';
      ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
    }
  }

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

/* ─────────────────────────────────────────────────────────────────
   "DSA RACE ARENA" GRAND GANTRY BANNER TEXTURE GENERATOR
   Renders the bold stadium arch banner matching the storyboard design.
───────────────────────────────────────────────────────────────── */
function createBannerTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, 1024, 256);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(0.15, '#1e3a8a');
  grad.addColorStop(0.5, '#2563eb');
  grad.addColorStop(0.85, '#1e3a8a');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 256);

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 1010, 242);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, 984, 216);

  // Left & right trophy badges
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(88, 128, 46, 0, Math.PI * 2);
  ctx.arc(1024 - 88, 128, 46, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚡', 88, 128);
  ctx.fillText('🏁', 1024 - 88, 128);

  // "DSA RACE ARENA" Bold Text
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 86px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.fillText('DSA RACE ARENA', 512, 132);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/* ─────────────────────────────────────────────────────────────────
   ALTERNATING RED & WHITE CURVED KERB GEOMETRY GENERATOR
   Constructs a chamfered rumble strip ring with vertex colors.
───────────────────────────────────────────────────────────────── */
function createAlternatingKerbGeometry(innerR, outerR, segments = 64) {
  const geom = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  const normals = [];

  const red = new THREE.Color('#e11d48');
  const white = new THREE.Color('#ffffff');

  for (let i = 0; i < segments; i++) {
    const theta1 = (i / segments) * Math.PI * 2;
    const theta2 = ((i + 1) / segments) * Math.PI * 2;
    const color = i % 2 === 0 ? red : white;

    const x1_in = innerR * Math.sin(theta1);
    const z1_in = innerR * Math.cos(theta1);
    const x1_out = outerR * Math.sin(theta1);
    const z1_out = outerR * Math.cos(theta1);

    const x2_in = innerR * Math.sin(theta2);
    const z2_in = innerR * Math.cos(theta2);
    const x2_out = outerR * Math.sin(theta2);
    const z2_out = outerR * Math.cos(theta2);

    // Quad triangle 1
    positions.push(x1_in, 0.05, z1_in);
    positions.push(x1_out, 0.05, z1_out);
    positions.push(x2_in, 0.05, z2_in);

    // Quad triangle 2
    positions.push(x2_in, 0.05, z2_in);
    positions.push(x1_out, 0.05, z1_out);
    positions.push(x2_out, 0.05, z2_out);

    for (let k = 0; k < 6; k++) {
      colors.push(color.r, color.g, color.b);
      normals.push(0, 1, 0);
    }
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geom;
}

/* ─────────────────────────────────────────────────────────────────
   COMPLETE 3D CIRCULAR RACING CIRCUIT GEOMETRY
   - Continuous closed-loop track bed (inner R=30, outer R=46)
   - 8 distinct running lanes with 9 crisp white lane divider rings
   - Inner and outer alternating red/white kerbs (rumble strips)
   - Checkered start/finish grid across all 8 lanes (closed loop start=end)
   - Grand Start/Finish Arch with "DSA RACE ARENA" banner
   - Scenic central infield plaza with tiered water fountain,
     glowing crystalline energy obelisk, radial walkways, flowerbeds, trees
───────────────────────────────────────────────────────────────── */
function CircularRaceCircuit() {
  const { innerRadius, outerRadius, laneWidth, laneCount } = TRACK_CONFIG;

  // Track surface ring
  const trackBedGeom = useMemo(() => {
    const geom = new THREE.RingGeometry(innerRadius, outerRadius, 128);
    geom.rotateX(-Math.PI / 2);
    return geom;
  }, [innerRadius, outerRadius]);

  // 9 white lane boundary rings (7 inner dividers + 2 outer boundaries)
  const laneDividerGeometries = useMemo(() => {
    const rings = [];
    for (let i = 0; i <= laneCount; i++) {
      const r = innerRadius + i * laneWidth;
      const isBoundary = i === 0 || i === laneCount;
      const thickness = isBoundary ? 0.14 : 0.08;
      const geom = new THREE.RingGeometry(r - thickness / 2, r + thickness / 2, 128);
      geom.rotateX(-Math.PI / 2);
      rings.push({ geom, isBoundary });
    }
    return rings;
  }, [innerRadius, laneCount, laneWidth]);

  // Inner and Outer alternating red-and-white kerbs
  const innerKerbGeom = useMemo(() => {
    return createAlternatingKerbGeometry(innerRadius - 1.35, innerRadius, 64);
  }, [innerRadius]);

  const outerKerbGeom = useMemo(() => {
    return createAlternatingKerbGeometry(outerRadius, outerRadius + 1.35, 64);
  }, [outerRadius]);

  // Textures
  const checkeredTexture = useMemo(() => createCheckeredStartTexture(), []);
  const bannerTexture = useMemo(() => createBannerTexture(), []);

  // Central lawn infield disc
  const centralLawnGeom = useMemo(() => {
    const geom = new THREE.CircleGeometry(innerRadius - 1.35, 64);
    geom.rotateX(-Math.PI / 2);
    return geom;
  }, [innerRadius]);

  // Outer stadium lawn ring
  const outerLawnGeom = useMemo(() => {
    const geom = new THREE.RingGeometry(outerRadius + 1.35, 135, 64);
    geom.rotateX(-Math.PI / 2);
    return geom;
  }, [outerRadius]);

  const midRadius = (innerRadius + outerRadius) / 2; // 38.0
  const trackSpan = outerRadius - innerRadius; // 16.0

  return (
    <group>
      {/* ── 1. MAIN ASPHALT COMPOSITE TRACK BED ── */}
      <mesh geometry={trackBedGeom} position={[0, 0.02, 0]} receiveShadow>
        <meshStandardMaterial
          color="#334155"
          roughness={0.72}
          metalness={0.12}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── 2. EIGHT PARALLEL RUNNING LANES WITH WHITE MARKINGS ── */}
      <group position={[0, 0.026, 0]}>
        {laneDividerGeometries.map(({ geom, isBoundary }, idx) => (
          <mesh key={idx} geometry={geom}>
            <meshStandardMaterial
              color="#ffffff"
              roughness={0.4}
              metalness={0.1}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>

      {/* ── 3. INNER & OUTER RED/WHITE RUMBLE STRIP KERBS ── */}
      <mesh geometry={innerKerbGeom} position={[0, 0.03, 0]} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={outerKerbGeom} position={[0, 0.03, 0]} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.55} side={THREE.DoubleSide} />
      </mesh>

      {/* ── 4. CHECKERED START / FINISH LINE GROUND MARKING ── */}
      {/* Positioned across all 8 lanes at theta = 0 (X = 0, spanning along Z from innerRadius to outerRadius) */}
      <mesh
        position={[0, 0.035, midRadius]}
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
      >
        <planeGeometry args={[trackSpan, 3.8]} />
        <meshStandardMaterial
          map={checkeredTexture}
          roughness={0.4}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── 5. GRAND START / FINISH ARCH & GANTRY ("DSA RACE ARENA") ── */}
      <group position={[0, 0, midRadius]}>
        {/* Inner Arch Pylon Tower (positioned safely on inner curb at Z = -trackSpan/2 - 1.2) */}
        <group position={[0, 0, -trackSpan / 2 - 1.2]}>
          <mesh position={[0, 4.5, 0]} castShadow>
            <cylinderGeometry args={[0.65, 0.85, 9.0, 12]} />
            <meshStandardMaterial color="#1e3a8a" roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[0, 9.4, 0]} castShadow>
            <coneGeometry args={[0.85, 1.6, 8]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[0, 7.5, 0]}>
            <boxGeometry args={[0.1, 2.2, 1.2]} />
            <meshStandardMaterial color="#ef4444" roughness={0.6} />
          </mesh>
        </group>

        {/* Outer Arch Pylon Tower (positioned safely on outer curb at Z = +trackSpan/2 + 1.2) */}
        <group position={[0, 0, trackSpan / 2 + 1.2]}>
          <mesh position={[0, 4.5, 0]} castShadow>
            <cylinderGeometry args={[0.65, 0.85, 9.0, 12]} />
            <meshStandardMaterial color="#1e3a8a" roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[0, 9.4, 0]} castShadow>
            <coneGeometry args={[0.85, 1.6, 8]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[0, 7.5, 0]}>
            <boxGeometry args={[0.1, 2.2, 1.2]} />
            <meshStandardMaterial color="#ef4444" roughness={0.6} />
          </mesh>
        </group>

        {/* Overhead Gantry Truss Spanning Across the 8 Lanes (along Z axis) */}
        <mesh position={[0, 8.4, 0]} castShadow>
          <boxGeometry args={[0.8, 0.8, trackSpan + 3.2]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
        </mesh>

        {/* Overhead "DSA RACE ARENA" Banner Plates (facing both directions) */}
        {bannerTexture && (
          <group position={[0, 8.5, 0]}>
            {/* Front facing (+X / camera) */}
            <mesh position={[-0.42, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[14.5, 2.2]} />
              <meshBasicMaterial map={bannerTexture} side={THREE.DoubleSide} />
            </mesh>
            {/* Back facing (-X) */}
            <mesh position={[0.42, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[14.5, 2.2]} />
              <meshBasicMaterial map={bannerTexture} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )}
      </group>

      {/* ── 6. SCENIC CENTRAL INFIELD PLAZA ── */}
      {/* Lush green infield lawn */}
      <mesh geometry={centralLawnGeom} position={[0, 0.01, 0]} receiveShadow>
        <meshStandardMaterial color="#22c55e" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>

      {/* Central Fountain with Water Basin and Glowing Beacon */}
      <group position={[0, 0, 0]}>
        {/* Outer Circular Plaza Path Ring */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[11.5, 13.8, 48]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.7} side={THREE.DoubleSide} />
        </mesh>

        {/* Circular stone fountain pool rim */}
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[7.2, 7.8, 0.9, 32]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.6} metalness={0.2} />
        </mesh>
        {/* Shimmering crystal water disc */}
        <mesh position={[0, 0.8, 0]}>
          <circleGeometry args={[6.8, 32]} />
          <meshStandardMaterial
            color="#0284c7"
            roughness={0.1}
            metalness={0.8}
            transparent
            opacity={0.88}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Tiered center pedestal */}
        <mesh position={[0, 1.4, 0]} castShadow>
          <cylinderGeometry args={[2.8, 3.6, 1.2, 16]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.5} />
        </mesh>
        {/* Soaring central glowing energy crystal / obelisk (Prompt 1 visual) */}
        <mesh position={[0, 5.2, 0]} castShadow>
          <octahedronGeometry args={[2.4, 0]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={1.5}
            roughness={0.2}
            metalness={0.6}
          />
        </mesh>
        {/* Vertical blue beacon column reaching skyward */}
        <mesh position={[0, 14.0, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 20.0, 8]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.35} />
        </mesh>

        {/* 4 Radial stone pathways from fountain to track (N, S, E, W) */}
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, i) => (
          <group key={i} rotation={[0, angle, 0]}>
            <mesh position={[0, 0.022, 18.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[2.8, innerRadius - 8.5]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.7} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}

        {/* Manicured trees, pines, and flowerbeds in the infield */}
        {[Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].map((quadAngle, qi) => {
          const dist = 18.0;
          const qx = dist * Math.sin(quadAngle);
          const qz = dist * Math.cos(quadAngle);
          return (
            <group key={qi} position={[qx, 0, qz]}>
              {/* Broadleaf shade tree */}
              <mesh position={[0, 1.0, 0]} castShadow>
                <cylinderGeometry args={[0.22, 0.34, 2.0, 6]} />
                <meshStandardMaterial color="#78350f" roughness={0.9} />
              </mesh>
              <mesh position={[0, 3.2, 0]} castShadow>
                <dodecahedronGeometry args={[1.9, 1]} />
                <meshStandardMaterial color="#15803d" roughness={0.75} />
              </mesh>
              {/* Flowerbed circle surrounding tree */}
              <mesh position={[0, 0.025, 0]}>
                <ringGeometry args={[2.2, 3.2, 16]} />
                <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={0.25} />
              </mesh>
            </group>
          );
        })}

        {/* Infield perimeter pine trees (just inside inner curb) */}
        {[0.3, 0.9, 1.8, 2.4, 3.5, 4.1, 5.0, 5.6].map((angle, pi) => {
          const px = 25.5 * Math.sin(angle);
          const pz = 25.5 * Math.cos(angle);
          return (
            <group key={pi} position={[px, 0, pz]} scale={[0.85, 0.85, 0.85]}>
              <mesh position={[0, 0.7, 0]} castShadow>
                <cylinderGeometry args={[0.15, 0.25, 1.4, 6]} />
                <meshStandardMaterial color="#451a03" roughness={0.9} />
              </mesh>
              <mesh position={[0, 2.2, 0]} castShadow>
                <coneGeometry args={[1.3, 2.5, 7]} />
                <meshStandardMaterial color="#14532d" roughness={0.8} />
              </mesh>
              <mesh position={[0, 3.4, 0]} castShadow>
                <coneGeometry args={[1.0, 2.0, 7]} />
                <meshStandardMaterial color="#166534" roughness={0.8} />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* ── 7. VAST OUTER STADIUM MEADOW & PERIMETER FLORA ── */}
      <mesh geometry={outerLawnGeom} position={[0, 0.01, 0]} receiveShadow>
        <meshStandardMaterial color="#16a34a" roughness={0.88} side={THREE.DoubleSide} />
      </mesh>

      {/* Outer perimeter spectator banners and pine trees */}
      {[0.2, 0.8, 1.5, 2.2, 2.9, 3.6, 4.3, 5.0, 5.7].map((angle, oi) => {
        const ox = 52.0 * Math.sin(angle);
        const oz = 52.0 * Math.cos(angle);
        return (
          <group key={oi} position={[ox, 0, oz]}>
            {/* Pine tree */}
            <mesh position={[0, 1.0, 0]} castShadow>
              <cylinderGeometry args={[0.18, 0.3, 2.0, 6]} />
              <meshStandardMaterial color="#451a03" roughness={0.9} />
            </mesh>
            <mesh position={[0, 2.8, 0]} castShadow>
              <coneGeometry args={[1.6, 3.2, 7]} />
              <meshStandardMaterial color="#14532d" roughness={0.8} />
            </mesh>
            <mesh position={[0, 4.4, 0]} castShadow>
              <coneGeometry args={[1.2, 2.4, 7]} />
              <meshStandardMaterial color="#166534" roughness={0.8} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   VAST SCENIC BACKGROUND & ATMOSPHERE
   Preserves distant alpine peaks, snow caps, castle fortress,
   floating hot air balloon, sky, and dynamic lighting.
───────────────────────────────────────────────────────────────── */
function ArenaAtmosphere({ reducedMotion }) {
  const ambientRef = useRef();
  const sunRef = useRef();
  const fillRef = useRef();
  const snowRef = useRef();

  const snowParticles = useMemo(() => {
    const count = 300;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 160;
      positions[i * 3 + 1] = Math.random() * 28 + 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 160;
    }
    return positions;
  }, []);

  useFrame((state, delta) => {
    updateWeatherState(delta);
    const w = weatherState.current;

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

    if (snowRef.current) {
      const isWinter = weatherState.presetIndex === 4 || weatherState.nextIndex === 4;
      const isNight = weatherState.presetIndex === 3 || weatherState.nextIndex === 3;
      snowRef.current.visible = isWinter || isNight;
      if (snowRef.current.visible) {
        const pos = snowRef.current.geometry.attributes.position;
        const t = state.clock.getElapsedTime();
        for (let i = 0; i < 300; i++) {
          let y = pos.getY(i) - delta * (1.2 + Math.sin(i) * 0.5);
          if (y < -1) y = 28;
          pos.setY(i, y);
          const x = pos.getX(i) + Math.sin(t * 0.6 + i) * delta * 0.3;
          pos.setX(i, x);
        }
        pos.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      <ambientLight ref={ambientRef} intensity={1.25} color="#ffffff" />
      <directionalLight
        ref={sunRef}
        position={[35, 45, 30]}
        intensity={2.0}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight ref={fillRef} position={[-25, 30, -20]} intensity={0.6} color="#bae6fd" />

      {/* 3D Snow Particle System */}
      <points ref={snowRef} visible={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[snowParticles, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.18} color="#f0f9ff" transparent opacity={0.8} sizeAttenuation />
      </points>

      {/* Distant Alpine Peaks & Historic Mountain Fortress (Z = -95) */}
      <group position={[0, 0, -95]}>
        {[-75, 0, 75].map((offsetX, i) => (
          <group key={i} position={[offsetX, 0, 0]}>
            {/* Peak 1 */}
            <mesh position={[-30, 14, 0]}>
              <coneGeometry args={[26, 42, 8]} />
              <meshStandardMaterial color="#334155" roughness={0.88} />
            </mesh>
            <mesh position={[-30, 30, 0]}>
              <coneGeometry args={[11, 14, 8]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.4} />
            </mesh>

            {/* Central Towering Peak 2 */}
            <mesh position={[8, 20, -5]}>
              <coneGeometry args={[34, 55, 9]} />
              <meshStandardMaterial color="#1e3a8b" roughness={0.88} />
            </mesh>
            <mesh position={[8, 42, -5]}>
              <coneGeometry args={[15, 18, 9]} />
              <meshStandardMaterial color="#f1f5f9" roughness={0.35} />
            </mesh>

            {/* Peak 3 */}
            <mesh position={[42, 12, 3]}>
              <coneGeometry args={[24, 38, 7]} />
              <meshStandardMaterial color="#334155" roughness={0.88} />
            </mesh>
            <mesh position={[42, 27, 3]}>
              <coneGeometry args={[9.5, 12, 7]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.4} />
            </mesh>

            {/* Mountain Castle Fortress */}
            <group position={[18, 16, -2]}>
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

      {/* Floating Hot Air Balloon in distant sky */}
      <group position={[-32, 28, -75]} scale={[0.9, 0.9, 0.9]}>
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
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   CIRCULAR 3D STADIUM CAMERA & INTERACTIVE CONTROLS
───────────────────────────────────────────────────────────────── */
const SideScrollCamera = forwardRef(function SideScrollCamera(
  { cameraMode, racers, focusedMemberId },
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
    userInteractingRef.current = false;
    if (controlsRef.current) {
      if (cameraMode === 'broadcast') {
        controlsRef.current.target.set(0, 2.0, 6.0);
        camera.position.set(0.0, 32.0, 64.0);
        controlsRef.current.update();
      } else if (cameraMode === 'leader' && targetMember) {
        const prog = typeof targetMember.progress === 'number' ? targetMember.progress : 0;
        const lane = typeof targetMember.laneIndex === 'number' ? targetMember.laneIndex : 0;
        const [tx, ty, tz] = getCircularRacerPosition(prog, lane);
        const theta = TRACK_CONFIG.startAngle + prog * Math.PI * 2;
        const camTheta = theta - 0.25;
        const camR = TRACK_CONFIG.getLaneRadius(lane) + 6.0;
        const camX = camR * Math.sin(camTheta);
        const camZ = camR * Math.cos(camTheta);
        camera.position.set(camX, Math.max(3.5, ty + 4.5), camZ);
        controlsRef.current.target.set(tx, ty + 1.2, tz);
        controlsRef.current.update();
      } else if (cameraMode === 'orbit') {
        controlsRef.current.target.set(0, 2.0, 0);
        camera.position.set(0.0, 36.0, 68.0);
        controlsRef.current.update();
      }
    }
  }, [cameraMode, focusedMemberId, targetMember, camera]);

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
        controlsRef.current.target.set(0, 2.0, 6.0);
        camera.position.set(0.0, 32.0, 64.0);
        controlsRef.current.update();
      }
    },
    focusMember: (memberId) => {
      userInteractingRef.current = false;
      const m = racers?.find((r) => r.id === memberId || r.memberId === memberId);
      if (m && controlsRef.current) {
        const prog = typeof m.progress === 'number' ? m.progress : 0;
        const lane = typeof m.laneIndex === 'number' ? m.laneIndex : 0;
        const [tx, ty, tz] = getCircularRacerPosition(prog, lane);
        controlsRef.current.target.set(tx, ty + 1.2, tz);
        camera.position.set(tx * 1.25, ty + 6.0, tz * 1.25);
        controlsRef.current.update();
      }
    },
  }));

  useFrame((_, delta) => {
    if (userInteractingRef.current) return;

    if (cameraMode === 'leader' && targetMember) {
      // Dynamic chase camera following target racer along the circular loop
      const prog = typeof targetMember.progress === 'number' ? targetMember.progress : 0;
      const lane = typeof targetMember.laneIndex === 'number' ? targetMember.laneIndex : 0;
      const [tx, ty, tz] = getCircularRacerPosition(prog, lane);

      const theta = TRACK_CONFIG.startAngle + prog * Math.PI * 2;
      const camTheta = theta - 0.25;
      const camR = TRACK_CONFIG.getLaneRadius(lane) + 6.0;
      const camX = camR * Math.sin(camTheta);
      const camZ = camR * Math.cos(camTheta);
      const camY = Math.max(3.5, ty + 4.5);

      camera.position.x = THREE.MathUtils.lerp(camera.position.x, camX, delta * 2.8);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, camY, delta * 2.5);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, camZ, delta * 2.8);

      if (controlsRef.current) {
        controlsRef.current.target.x = THREE.MathUtils.lerp(controlsRef.current.target.x, tx, delta * 3.0);
        controlsRef.current.target.y = THREE.MathUtils.lerp(controlsRef.current.target.y, ty + 1.2, delta * 2.5);
        controlsRef.current.target.z = THREE.MathUtils.lerp(controlsRef.current.target.z, tz, delta * 3.0);
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
      minDistance={6}
      maxDistance={140}
      minPolarAngle={Math.PI / 12}
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
───────────────────────────────────────────────────────────────── */
function ArenaMinimap({ racers, focusedMemberId, onFocusMember, milestone }) {
  if (!racers || racers.length === 0) return null;

  return (
    <div className="arena-minimap-container" aria-label="Race Circuit Minimap">
      <div className="minimap-header">
        <span className="minimap-title">🏁 3D CIRCULAR CIRCUIT</span>
        <span className="minimap-milestone">Target: {milestone || 100} Solved</span>
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
              title={`#${rank} ${racer.name} (${Number(racer.solved ?? racer.solvedCount ?? 0)} solved · Lane ${(racer.laneIndex || 0) + 1})`}
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
        <span>START (0°)</span>
        <span>LAP 50% (180°)</span>
        <span>FINISH (360°) 🏆</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   2D WEBGL FALLBACK
───────────────────────────────────────────────────────────────── */
function WebGLFallbackArena({ arenaState }) {
  const racers = arenaState?.racers || [];
  const milestone = arenaState?.targetMilestone || 100;

  return (
    <div className="arena-fallback-container">
      <div className="arena-fallback-header">
        <h4>Circular Race Circuit (2D High-Performance Mode)</h4>
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
    cameraMode = 'broadcast',
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
  }));

  if (hasWebGLError) {
    return <WebGLFallbackArena arenaState={arenaState} />;
  }

  return (
    <div className="race-arena-root" style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Canvas
        camera={{ position: [0.0, 26.0, 68.0], fov: 45, near: 0.5, far: 450 }}
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

        {/* Scenic mountain backdrop, dynamic lighting, and atmosphere */}
        <ArenaAtmosphere reducedMotion={reducedMotion} />

        {/* Complete 3D circular racing circuit with 8 lanes, kerbs, start/finish gantry, and infield */}
        <CircularRaceCircuit />

        {/* 8 Individually separated racers in distinct lanes running along the closed loop */}
        {racers.map((racer) => {
          const memberId = racer.id || racer.memberId;
          return (
            <ArenaRacer
              key={memberId}
              racer={racer}
              reducedMotion={reducedMotion}
              onFocus={onFocusMember}
            />
          );
        })}

        {/* Smooth cinematic stadium camera */}
        <SideScrollCamera
          ref={cameraRef}
          cameraMode={cameraMode}
          racers={racers}
          focusedMemberId={focusedMemberId}
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
