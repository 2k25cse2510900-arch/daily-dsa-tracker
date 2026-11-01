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
  return getMountainValleyHeight(worldX, worldZ);
}

/* ─────────────────────────────────────────────────────────────────
   MASSIVE 3D MOUNTAIN-VALLEY PROCEDURAL TERRAIN MATHEMATICS
   - Perfect flat terrace for the 8-lane racing circuit at Y = 0.
   - Natural sculpted central infield park with an inner lake/pond.
   - Pristine alpine lake basin in the northern valley (Z = -45 to -76).
   - Towering rocky cliff crag & plateau (Z = -80 to -118, Y = 16 to 24).
   - High alpine mountain ranges with jagged snow-capped peaks (360° horizon).
───────────────────────────────────────────────────────────────── */
export function getMountainValleyHeight(x, z) {
  const r = Math.sqrt(x * x + z * z);

  // 1. Perfectly flat, smooth racing track corridor (R = 28.0 to 48.0)
  if (r >= 28.0 && r <= 48.0) {
    return 0.0;
  }

  // 2. Central Infield Park & Scenic Basin (R < 28.0)
  if (r < 28.0) {
    if (r < 11.5) {
      // Natural central pond basin depression
      const t = r / 11.5;
      return -0.55 * (1 - t * t) - 0.1;
    }
    // Gentle grassy slope rising up to track level
    const t = (r - 11.5) / (28.0 - 11.5);
    return THREE.MathUtils.lerp(-0.1, 0.02, t);
  }

  // 3. Northern Valley: Alpine Lake Basin & Waterfall Cliff Crag (Z < -44)
  if (z < -44 && z >= -78 && Math.abs(x) < 52) {
    // Alpine Lake basin depression
    const normX = Math.abs(x) / 52;
    const normZ = (z + 61) / 17;
    const distSq = normX * normX + normZ * normZ;
    if (distSq < 1.0) {
      return THREE.MathUtils.lerp(-1.8, 0.0, Math.sqrt(distSq));
    }
  }

  // Waterfall & Castle Cliff Promontory (Z = -78 to -122, |X| < 58)
  if (z < -78 && z >= -122 && Math.abs(x) < 58) {
    const cliffT = Math.min(1, (-z - 78) / 12); // Steep rise
    const plateauT = Math.min(1, Math.max(0, (-z - 90) / 32));
    const cliffBase = THREE.MathUtils.lerp(0.0, 18.5, Math.pow(cliffT, 0.65));
    const cragVariation = Math.sin(x * 0.18) * 2.2 + Math.cos(z * 0.15) * 1.8;

    // Waterfall notch carved into center of cliff
    if (Math.abs(x) < 6.0 && z > -88) {
      const notchT = Math.abs(x) / 6.0;
      return THREE.MathUtils.lerp(-0.2, cliffBase, notchT);
    }
    return cliffBase + cragVariation;
  }

  // 4. Distant Alpine Mountain Ranges (North, East, West, South)
  let mountainRise = 0;
  const distFromCenter = Math.max(0, r - 50.0);

  // Far North main massif (Z < -115)
  if (z < -115) {
    const northDist = -z - 115;
    const peakWave1 = Math.sin(x * 0.055) * 18.0;
    const peakWave2 = Math.cos(x * 0.11 + z * 0.04) * 11.0;
    const peakWave3 = Math.abs(Math.sin(x * 0.03)) * 24.0;
    mountainRise += Math.min(58.0, northDist * 0.65) + peakWave1 + peakWave2 + peakWave3;
  }

  // West Flank Mountain Ridge (X < -50)
  if (x < -50) {
    const westDist = -x - 50;
    const ridgeWave = Math.sin(z * 0.065) * 8.5 + Math.cos(x * 0.08) * 6.0;
    mountainRise += Math.min(32.0, westDist * 0.45) + ridgeWave;
  }

  // East Flank Mountain Ridge (X > 50)
  if (x > 50) {
    const eastDist = x - 50;
    const ridgeWave = Math.cos(z * 0.065) * 8.5 + Math.sin(x * 0.08) * 6.0;
    mountainRise += Math.min(32.0, eastDist * 0.45) + ridgeWave;
  }

  // South Foreground & Backdrop Knolls (Z > 48)
  if (z > 48) {
    const southDist = z - 48;
    const meadowRolling = Math.sin(x * 0.075) * 2.8 + Math.cos(z * 0.09) * 2.2;
    if (southDist < 45) {
      mountainRise += Math.min(6.5, southDist * 0.12) + meadowRolling;
    } else {
      // Distant southern enclosure ridge
      mountainRise += 6.5 + Math.min(28.0, (southDist - 45) * 0.4) + meadowRolling * 2.0;
    }
  }

  // Micro-topography natural harmonics
  const naturalNoise = Math.sin(x * 0.14) * Math.cos(z * 0.14) * 0.45;
  return Math.max(-1.8, mountainRise + naturalNoise);
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
    fogNear: 110,
    fogFar: 360,
    ambientIntensity: 1.25,
    ambientColor: '#ffffff',
    sunIntensity: 2.1,
    sunColor: '#fffbeb',
    sunPos: [45, 55, 35],
    fillIntensity: 0.65,
    fillColor: '#bae6fd',
    duration: 30,
  },
  {
    name: 'Golden Hour',
    icon: '🌅',
    temp: '24°C',
    sky: '#fbbf24',
    fog: '#fde68a',
    fogNear: 100,
    fogFar: 340,
    ambientIntensity: 1.1,
    ambientColor: '#fef08a',
    sunIntensity: 2.3,
    sunColor: '#ff9a3c',
    sunPos: [55, 25, 30],
    fillIntensity: 0.45,
    fillColor: '#fed7aa',
    duration: 20,
  },
  {
    name: 'Sunset · Dusk',
    icon: '🌇',
    temp: '19°C',
    sky: '#f97316',
    fog: '#fb923c',
    fogNear: 95,
    fogFar: 320,
    ambientIntensity: 0.8,
    ambientColor: '#ff7c55',
    sunIntensity: 1.7,
    sunColor: '#ef4444',
    sunPos: [60, 14, 20],
    fillIntensity: 0.35,
    fillColor: '#fca5a5',
    duration: 18,
  },
  {
    name: 'Night · Stars',
    icon: '🌙',
    temp: '12°C',
    sky: '#090d16',
    fog: '#1e293b',
    fogNear: 85,
    fogFar: 300,
    ambientIntensity: 0.45,
    ambientColor: '#bfdbfe',
    sunIntensity: 0.6,
    sunColor: '#c7d2fe',
    sunPos: [-35, 42, 20],
    fillIntensity: 0.3,
    fillColor: '#93c5fd',
    duration: 22,
  },
  {
    name: 'Winter · Snow',
    icon: '❄️',
    temp: '-3°C',
    sky: '#e2e8f0',
    fog: '#f1f5f9',
    fogNear: 90,
    fogFar: 320,
    ambientIntensity: 1.2,
    ambientColor: '#f0f9ff',
    sunIntensity: 1.6,
    sunColor: '#ffffff',
    sunPos: [25, 38, 30],
    fillIntensity: 0.7,
    fillColor: '#e0f2fe',
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
    const stridePhase = reducedMotion ? 0 : Math.sin(t * 11 + laneIndex) * 0.04;

    // Superman elevated flight clearance (tested in superman.test.js)
    const isSuperman = characterData?.id === 'superman';
    const verticalElevation = isSuperman
      ? 1.25 + (reducedMotion ? 0 : Math.sin(t * 3.2 + laneIndex) * 0.08)
      : 0.06 + strideBob;

    // Subtle physical stride motion along tangent
    const dynamicX = posX + (isSuperman ? 0 : Math.cos(heading) * stridePhase);
    const dynamicZ = posZ - (isSuperman ? 0 : Math.sin(heading) * stridePhase);

    groupRef.current.position.set(dynamicX, posY + verticalElevation, dynamicZ);

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
   SCULPTED 3D MOUNTAIN-VALLEY TERRAIN MESH
   - Vast 320x320 procedural terrain with custom vertex colors
   - Granite slate cliffs, snow-capped peaks, lush valley meadows,
     and sandy shorelines seamlessly rendered with high performance.
───────────────────────────────────────────────────────────────── */
function MountainValleyTerrain() {
  const { terrainGeom } = useMemo(() => {
    const width = 320;
    const depth = 320;
    const segX = 110;
    const segZ = 110;
    const geom = new THREE.PlaneGeometry(width, depth, segX, segZ);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    const count = pos.count;
    const colors = new Float32Array(count * 3);

    const colSnow = new THREE.Color('#f8fafc');
    const colPeakRock = new THREE.Color('#334155');
    const colCliffRock = new THREE.Color('#475569');
    const colHighGrass = new THREE.Color('#14532d');
    const colLushGrass = new THREE.Color('#16a34a');
    const colValleyMeadow = new THREE.Color('#22c55e');
    const colShoreSand = new THREE.Color('#b45309');

    for (let i = 0; i < count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const vy = getMountainValleyHeight(vx, vz);
      pos.setY(i, vy);

      // Procedural natural vertex color blending
      let c = colLushGrass;
      if (vy < -0.3) {
        c = colShoreSand;
      } else if (vy > 34.0) {
        c = colSnow;
      } else if (vy > 18.0) {
        const t = (vy - 18.0) / 16.0;
        c = new THREE.Color().lerpColors(colCliffRock, colPeakRock, t);
      } else if (vy > 7.0) {
        const t = (vy - 7.0) / 11.0;
        c = new THREE.Color().lerpColors(colHighGrass, colCliffRock, t);
      } else if (vy > 0.05) {
        const t = vy / 7.0;
        c = new THREE.Color().lerpColors(colValleyMeadow, colHighGrass, t);
      }

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.computeVertexNormals();
    return { terrainGeom: geom };
  }, []);

  return (
    <mesh geometry={terrainGeom} receiveShadow>
      <meshStandardMaterial
        vertexColors
        roughness={0.82}
        metalness={0.06}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ─────────────────────────────────────────────────────────────────
   GRAND CASTLE FORTRESS PERCHED ATOP WATERFALL CRAG (Prompt 2 Reference)
───────────────────────────────────────────────────────────────── */
function GrandCliffCastle() {
  return (
    <group position={[0, 18.5, -96]}>
      {/* Stone Foundation Bastion anchoring into the cliff rock */}
      <mesh position={[0, -2.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[32.0, 7.0, 22.0]} />
        <meshStandardMaterial color="#334155" roughness={0.92} metalness={0.15} />
      </mesh>

      {/* Main Citadel Keep */}
      <mesh position={[0, 5.0, -2.0]} castShadow receiveShadow>
        <boxGeometry args={[18.0, 11.0, 14.0]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.78} metalness={0.1} />
      </mesh>
      {/* Citadel Pitched Slate Roof */}
      <mesh position={[0, 12.5, -2.0]} castShadow>
        <coneGeometry args={[11.5, 6.0, 4]} rotation={[0, Math.PI / 4, 0]} />
        <meshStandardMaterial color="#475569" roughness={0.65} />
      </mesh>

      {/* Central Soaring Spire Tower (matching fairytale castle in Prompt 2) */}
      <group position={[0, 10.0, 0]}>
        <mesh position={[0, 6.0, 0]} castShadow>
          <cylinderGeometry args={[2.8, 3.4, 14.0, 10]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
        </mesh>
        <mesh position={[0, 15.5, 0]} castShadow>
          <coneGeometry args={[3.2, 7.0, 10]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Glowing Beacon Spire Finial */}
        <mesh position={[0, 19.5, 0]}>
          <octahedronGeometry args={[0.7, 0]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
      </group>

      {/* Flanking Western Round Watchtower */}
      <group position={[-11.5, 4.0, 4.0]}>
        <mesh position={[0, 4.0, 0]} castShadow>
          <cylinderGeometry args={[3.0, 3.4, 12.0, 10]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.75} />
        </mesh>
        <mesh position={[0, 11.5, 0]} castShadow>
          <coneGeometry args={[3.4, 5.5, 10]} />
          <meshStandardMaterial color="#475569" roughness={0.6} />
        </mesh>
        {/* Watchtower Flag */}
        <mesh position={[0, 14.8, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 2.0, 4]} />
          <meshStandardMaterial color="#b45309" />
        </mesh>
        <mesh position={[0.7, 15.2, 0]}>
          <boxGeometry args={[1.2, 0.7, 0.05]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
      </group>

      {/* Flanking Eastern Round Watchtower */}
      <group position={[11.5, 4.0, 4.0]}>
        <mesh position={[0, 4.0, 0]} castShadow>
          <cylinderGeometry args={[3.0, 3.4, 12.0, 10]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.75} />
        </mesh>
        <mesh position={[0, 11.5, 0]} castShadow>
          <coneGeometry args={[3.4, 5.5, 10]} />
          <meshStandardMaterial color="#475569" roughness={0.6} />
        </mesh>
        {/* Watchtower Flag */}
        <mesh position={[0, 14.8, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 2.0, 4]} />
          <meshStandardMaterial color="#b45309" />
        </mesh>
        <mesh position={[-0.7, 15.2, 0]}>
          <boxGeometry args={[1.2, 0.7, 0.05]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
      </group>

      {/* Arched Stone Entrance Gate & Canyon Bridge */}
      <group position={[0, 0.5, 8.5]}>
        <mesh position={[-2.8, 2.0, 0]} castShadow>
          <boxGeometry args={[2.0, 5.0, 2.0]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        <mesh position={[2.8, 2.0, 0]} castShadow>
          <boxGeometry args={[2.0, 5.0, 2.0]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        <mesh position={[0, 4.5, 0]} castShadow>
          <boxGeometry args={[7.6, 1.2, 2.2]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        {/* Arched stone bridge extension projecting over the waterfall canyon */}
        <mesh position={[0, 0.4, 6.0]} castShadow receiveShadow>
          <boxGeometry args={[5.2, 1.0, 10.0]} />
          <meshStandardMaterial color="#64748b" roughness={0.88} />
        </mesh>
      </group>

      {/* Warm Glowing Castle Windows */}
      {[
        [-4.5, 6.5, 5.2],
        [4.5, 6.5, 5.2],
        [0, 8.5, 5.2],
        [-11.5, 5.5, 7.2],
        [11.5, 5.5, 7.2],
      ].map(([wx, wy, wz], wi) => (
        <mesh key={wi} position={[wx, wy, wz]}>
          <boxGeometry args={[0.9, 1.4, 0.1]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   NATURAL ROCK FORMATIONS & CLIFF OUT CROPPINGS
   Faceted granite ridges along waterfall cliffs, lake shorelines, and valley verges.
───────────────────────────────────────────────────────────────── */
function RockyCragsAndFormations() {
  const rockPositions = useMemo(() => {
    return [
      // Waterfall cliff flanks (Z = -78 to -84)
      { pos: [-10.5, 12.0, -82.0], scale: [5.5, 8.0, 4.5], rot: [0.3, 0.5, -0.2] },
      { pos: [10.5, 12.0, -82.0], scale: [5.5, 8.0, 4.5], rot: [-0.3, -0.5, 0.2] },
      { pos: [-18.0, 8.5, -79.0], scale: [7.0, 7.0, 5.0], rot: [0.1, 0.8, 0.4] },
      { pos: [18.0, 8.5, -79.0], scale: [7.0, 7.0, 5.0], rot: [0.2, -0.8, -0.4] },
      { pos: [-5.5, 3.2, -74.0], scale: [3.5, 4.2, 3.0], rot: [0.4, 0.2, 0.1] },
      { pos: [5.5, 3.2, -74.0], scale: [3.5, 4.2, 3.0], rot: [-0.4, -0.2, -0.1] },

      // Alpine Lake shoreline boulders (Z = -50 to -72)
      { pos: [-38.0, 0.2, -62.0], scale: [4.2, 2.5, 4.0], rot: [0.2, 1.1, 0.3] },
      { pos: [38.0, 0.2, -62.0], scale: [4.2, 2.5, 4.0], rot: [-0.2, -1.1, -0.3] },
      { pos: [-24.0, 0.1, -48.0], scale: [2.8, 1.6, 2.5], rot: [0.1, 0.4, 0.2] },
      { pos: [24.0, 0.1, -48.0], scale: [2.8, 1.6, 2.5], rot: [-0.1, -0.4, -0.2] },

      // Outer track roadside granite boulders
      { pos: [-48.5, 0.4, 18.0], scale: [3.2, 2.2, 2.8], rot: [0.3, 0.6, 0.1] },
      { pos: [48.5, 0.4, 18.0], scale: [3.2, 2.2, 2.8], rot: [-0.3, -0.6, -0.1] },
      { pos: [-36.0, 0.3, 46.0], scale: [2.6, 1.8, 2.4], rot: [0.1, 0.9, 0.2] },
      { pos: [36.0, 0.3, 46.0], scale: [2.6, 1.8, 2.4], rot: [-0.1, -0.9, -0.2] },
    ];
  }, []);

  return (
    <group>
      {rockPositions.map((r, i) => (
        <mesh
          key={i}
          position={r.pos}
          scale={r.scale}
          rotation={r.rot}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[1.0, 1]} />
          <meshStandardMaterial
            color="#475569"
            roughness={0.9}
            metalness={0.12}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   LAYERED 360° ALPINE MOUNTAIN RANGES
   Natural sculpted polygonal mountain massifs encircling the arena.
───────────────────────────────────────────────────────────────── */
function AlpineMountainRanges() {
  const peaks = useMemo(() => {
    return [
      // ── Main Northern Alps (Behind Castle, Z = -140 to -175) ──
      { pos: [-65, 32, -150], args: [38, 62, 7], snowArgs: [18, 22, 7], snowY: 21 },
      { pos: [-24, 40, -165], args: [46, 75, 8], snowArgs: [22, 28, 8], snowY: 25 },
      { pos: [0, 45, -170], args: [52, 85, 9], snowArgs: [26, 32, 9], snowY: 28 },
      { pos: [32, 38, -160], args: [44, 72, 8], snowArgs: [20, 26, 8], snowY: 24 },
      { pos: [72, 30, -148], args: [36, 58, 7], snowArgs: [16, 20, 7], snowY: 20 },

      // ── Western Mountain Flank (X = -85 to -125) ──
      { pos: [-105, 24, -80], args: [32, 48, 6], snowArgs: [14, 18, 6], snowY: 16 },
      { pos: [-110, 26, 0], args: [35, 52, 7], snowArgs: [15, 19, 7], snowY: 17 },
      { pos: [-100, 22, 80], args: [30, 44, 6], snowArgs: [12, 16, 6], snowY: 15 },

      // ── Eastern Mountain Flank (X = 85 to 125) ──
      { pos: [105, 24, -80], args: [32, 48, 6], snowArgs: [14, 18, 6], snowY: 16 },
      { pos: [110, 26, 0], args: [35, 52, 7], snowArgs: [15, 19, 7], snowY: 17 },
      { pos: [100, 22, 80], args: [30, 44, 6], snowArgs: [12, 16, 6], snowY: 15 },

      // ── Southern Distant Horizon Ridge (Behind Camera, Z = 135 to 165) ──
      { pos: [-55, 20, 145], args: [32, 42, 6], snowArgs: [12, 15, 6], snowY: 14 },
      { pos: [0, 22, 155], args: [36, 46, 7], snowArgs: [14, 17, 7], snowY: 15 },
      { pos: [55, 20, 145], args: [32, 42, 6], snowArgs: [12, 15, 6], snowY: 14 },
    ];
  }, []);

  return (
    <group>
      {peaks.map((p, i) => (
        <group key={i} position={p.pos}>
          {/* Granite Rock Massif */}
          <mesh castShadow receiveShadow>
            <coneGeometry args={p.args} />
            <meshStandardMaterial
              color="#334155"
              roughness={0.88}
              metalness={0.08}
              flatShading
            />
          </mesh>
          {/* Glistening Alpine Snowcap */}
          <mesh position={[0, p.snowY, 0]}>
            <coneGeometry args={p.snowArgs} />
            <meshStandardMaterial
              color="#f8fafc"
              roughness={0.4}
              metalness={0.05}
              flatShading
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   ANIMATED ALPINE LAKE, WATERFALL, AND CENTRAL INFIELD POND
   Pristine mountain water bodies, animated cascading waterfall, and mist.
───────────────────────────────────────────────────────────────── */
function AlpineLakeAndWaterfall() {
  const lakeMeshRef = useRef();
  const waterfallMeshRef = useRef();
  const mistMeshRef = useRef();
  const infieldPondRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Subtle water surface shimmer / ripple
    if (lakeMeshRef.current) {
      lakeMeshRef.current.position.y = -0.3 + Math.sin(t * 1.5) * 0.04;
    }
    if (infieldPondRef.current) {
      infieldPondRef.current.position.y = -0.12 + Math.sin(t * 1.8 + 1.0) * 0.02;
    }
    // Waterfall animated flow (oscillate scale & slight position)
    if (waterfallMeshRef.current) {
      waterfallMeshRef.current.scale.x = 1.0 + Math.sin(t * 8.0) * 0.06;
      waterfallMeshRef.current.scale.y = 1.0 + Math.cos(t * 10.0) * 0.04;
    }
    // Foaming plunge pool mist pulse
    if (mistMeshRef.current) {
      const mistScale = 1.0 + Math.sin(t * 4.5) * 0.15;
      mistMeshRef.current.scale.set(mistScale, mistScale, mistScale);
    }
  });

  return (
    <group>
      {/* ── 1. Pristine Northern Alpine Lake (Z = -61) ── */}
      <mesh
        ref={lakeMeshRef}
        position={[0, -0.3, -61.0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[84, 34, 32, 16]} />
        <meshStandardMaterial
          color="#0284c7"
          roughness={0.12}
          metalness={0.35}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* Lake Shoreline Sandy Foam Fringe */}
      <mesh position={[0, -0.29, -61.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[14.0, 16.5, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.3} />
      </mesh>

      {/* ── 2. Cascading Cliffside Waterfall (From Castle Crag Notch to Lake) ── */}
      <group position={[0, 9.2, -78.0]} rotation={[0.42, 0, 0]}>
        <mesh ref={waterfallMeshRef}>
          <planeGeometry args={[8.8, 22.0, 16, 32]} />
          <meshStandardMaterial
            color="#f0f9ff"
            roughness={0.25}
            metalness={0.1}
            transparent
            opacity={0.92}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Foaming Water Rushes Highlights */}
        <mesh position={[0, 0, 0.08]}>
          <planeGeometry args={[6.2, 21.0]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* ── 3. Waterfall Plunge Pool Spray & Mist ── */}
      <group position={[0, 0.15, -73.0]}>
        <mesh ref={mistMeshRef} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 6.2, 24]} />
          <meshBasicMaterial color="#e0f2fe" transparent opacity={0.65} side={THREE.DoubleSide} />
        </mesh>
        {/* Frothing splash base rocks */}
        <mesh position={[-3.2, 0.4, 0]}>
          <dodecahedronGeometry args={[1.1, 0]} />
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </mesh>
        <mesh position={[3.2, 0.4, 0]}>
          <dodecahedronGeometry args={[1.1, 0]} />
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </mesh>
      </group>

      {/* ── 4. Central Infield Reflective Lake / Park Pond (R ~ 10.8) ── */}
      <mesh
        ref={infieldPondRef}
        position={[0, -0.12, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[10.6, 48]} />
        <meshStandardMaterial
          color="#0284c7"
          roughness={0.15}
          metalness={0.3}
          transparent
          opacity={0.86}
        />
      </mesh>

      {/* Central Pond Stepping Stones */}
      {[
        [-3.2, -0.06, 1.2],
        [-1.0, -0.05, 2.8],
        [1.8, -0.06, 2.0],
        [3.6, -0.05, 0.2],
        [2.2, -0.06, -2.4],
        [-1.2, -0.05, -2.8],
      ].map(([sx, sy, sz], idx) => (
        <mesh key={idx} position={[sx, sy, sz]} rotation={[0, idx * 0.7, 0]}>
          <cylinderGeometry args={[0.7, 0.85, 0.2, 7]} />
          <meshStandardMaterial color="#64748b" roughness={0.85} flatShading />
        </mesh>
      ))}

      {/* Shoreline Reeds & Cattails Clusters */}
      {[
        // Northern lake edge reeds
        [-18, 0.1, -48],
        [-14, 0.1, -47],
        [14, 0.1, -47],
        [18, 0.1, -48],
        [-28, 0.1, -66],
        [28, 0.1, -66],
        // Infield pond reeds
        [-7.5, 0.05, 7.5],
        [7.5, 0.05, 7.5],
        [-7.5, 0.05, -7.5],
        [7.5, 0.05, -7.5],
      ].map(([rx, ry, rz], ri) => (
        <group key={ri} position={[rx, ry, rz]} scale={[0.85, 0.85, 0.85]}>
          <mesh position={[0, 0.7, 0]}>
            <coneGeometry args={[0.08, 1.4, 4]} />
            <meshStandardMaterial color="#15803d" />
          </mesh>
          <mesh position={[0.2, 0.6, 0.1]} rotation={[0, 0, -0.15]}>
            <coneGeometry args={[0.07, 1.2, 4]} />
            <meshStandardMaterial color="#166534" />
          </mesh>
          <mesh position={[-0.2, 0.65, -0.1]} rotation={[0, 0, 0.18]}>
            <coneGeometry args={[0.07, 1.3, 4]} />
            <meshStandardMaterial color="#15803d" />
          </mesh>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.45, 5]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   DENSE NATURAL 3D FORESTS & VEGETATION
   Layered alpine conifer pines, deciduous broadleaf trees, and meadow shrubs.
───────────────────────────────────────────────────────────────── */
function LayeredAlpinePine({ pos, scale = 1 }) {
  return (
    <group position={pos} scale={[scale, scale, scale]}>
      {/* Natural Bark Trunk */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.44, 2.4, 6]} />
        <meshStandardMaterial color="#582f0e" roughness={0.95} />
      </mesh>
      {/* Tier 1 (Lowest, Widest Needle Canopy) */}
      <mesh position={[0, 2.4, 0]} castShadow>
        <coneGeometry args={[2.5, 2.6, 7]} />
        <meshStandardMaterial color="#14532d" roughness={0.85} flatShading />
      </mesh>
      {/* Tier 2 (Middle Canopy) */}
      <mesh position={[0, 3.8, 0]} castShadow>
        <coneGeometry args={[2.0, 2.4, 7]} />
        <meshStandardMaterial color="#166534" roughness={0.82} flatShading />
      </mesh>
      {/* Tier 3 (Upper Canopy) */}
      <mesh position={[0, 5.0, 0]} castShadow>
        <coneGeometry args={[1.5, 2.0, 7]} />
        <meshStandardMaterial color="#15803d" roughness={0.8} flatShading />
      </mesh>
      {/* Tier 4 (Spire Tip) */}
      <mesh position={[0, 6.0, 0]} castShadow>
        <coneGeometry args={[0.9, 1.4, 6]} />
        <meshStandardMaterial color="#16a34a" roughness={0.78} flatShading />
      </mesh>
    </group>
  );
}

function LushBroadleafTree({ pos, scale = 1 }) {
  return (
    <group position={pos} scale={[scale, scale, scale]}>
      {/* Gnarled Oak Trunk */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.48, 2.8, 6]} />
        <meshStandardMaterial color="#78350f" roughness={0.95} />
      </mesh>
      {/* Cluster of Foliage Dodecahedrons */}
      <mesh position={[0, 3.4, 0]} castShadow>
        <dodecahedronGeometry args={[2.0, 1]} />
        <meshStandardMaterial color="#16a34a" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[-0.8, 3.8, 0.5]} castShadow>
        <dodecahedronGeometry args={[1.4, 1]} />
        <meshStandardMaterial color="#22c55e" roughness={0.82} flatShading />
      </mesh>
      <mesh position={[0.8, 3.6, -0.4]} castShadow>
        <dodecahedronGeometry args={[1.5, 1]} />
        <meshStandardMaterial color="#15803d" roughness={0.84} flatShading />
      </mesh>
      <mesh position={[0, 4.6, 0]} castShadow>
        <dodecahedronGeometry args={[1.3, 1]} />
        <meshStandardMaterial color="#4ade80" roughness={0.8} flatShading />
      </mesh>
    </group>
  );
}

function MeadowFlowerBush({ pos, scale = 1, flowerColor = "#fbbf24" }) {
  return (
    <group position={pos} scale={[scale, scale, scale]}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <dodecahedronGeometry args={[0.9, 0]} />
        <meshStandardMaterial color="#16a34a" roughness={0.9} flatShading />
      </mesh>
      {/* Tiny flower accents */}
      <mesh position={[0.4, 1.0, 0.3]}>
        <sphereGeometry args={[0.2, 5, 4]} />
        <meshBasicMaterial color={flowerColor} />
      </mesh>
      <mesh position={[-0.4, 0.9, 0.2]}>
        <sphereGeometry args={[0.18, 5, 4]} />
        <meshBasicMaterial color="#f43f5e" />
      </mesh>
      <mesh position={[0.1, 1.2, -0.3]}>
        <sphereGeometry args={[0.18, 5, 4]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
    </group>
  );
}

function DenseNaturalForests() {
  const trees = useMemo(() => {
    const list = [];

    // ── 1. Castle Mountain Slopes & Waterfall Crags (Z = -75 to -108) ──
    const cliffPines = [
      { pos: [-24, 7.5, -82], s: 1.1 },
      { pos: [-20, 6.2, -78], s: 0.95 },
      { pos: [-28, 9.8, -88], s: 1.25 },
      { pos: [-16, 5.0, -75], s: 0.9 },
      { pos: [16, 5.0, -75], s: 0.9 },
      { pos: [20, 6.2, -78], s: 0.95 },
      { pos: [24, 7.5, -82], s: 1.1 },
      { pos: [28, 9.8, -88], s: 1.25 },
      { pos: [-14, 15.0, -96], s: 1.1 },
      { pos: [14, 15.0, -96], s: 1.1 },
      { pos: [-22, 17.5, -104], s: 1.3 },
      { pos: [22, 17.5, -104], s: 1.3 },
      { pos: [0, 18.0, -112], s: 1.2 },
    ];
    cliffPines.forEach((p, idx) => list.push({ ...p, type: 'pine', key: `cp_${idx}` }));

    // ── 2. North Shoreline Forest Flanking the Lake (Z = -45 to -68) ──
    const northFlank = [
      { pos: [-42, 0.3, -54], s: 1.2, type: 'pine' },
      { pos: [-36, 0.2, -60], s: 1.1, type: 'broadleaf' },
      { pos: [-32, 0.2, -50], s: 1.0, type: 'pine' },
      { pos: [-26, 0.1, -45], s: 0.9, type: 'broadleaf' },
      { pos: [26, 0.1, -45], s: 0.9, type: 'broadleaf' },
      { pos: [32, 0.2, -50], s: 1.0, type: 'pine' },
      { pos: [36, 0.2, -60], s: 1.1, type: 'broadleaf' },
      { pos: [42, 0.3, -54], s: 1.2, type: 'pine' },
    ];
    northFlank.forEach((p, idx) => list.push({ ...p, key: `nf_${idx}` }));

    // ── 3. Central Infield Park & Garden (R = 12 to 25) ──
    const infieldAngles = [0.3, 0.8, 1.4, 2.1, 2.7, 3.5, 4.1, 4.8, 5.4, 6.0];
    infieldAngles.forEach((ang, idx) => {
      const r = 16.5 + (idx % 3) * 3.5;
      const x = r * Math.cos(ang);
      const z = r * Math.sin(ang);
      const isPine = idx % 2 === 0;
      list.push({
        pos: [x, 0.05, z],
        s: 0.75 + (idx % 4) * 0.1,
        type: isPine ? 'pine' : 'broadleaf',
        key: `inf_${idx}`,
      });
    });

    // ── 4. Outer Valley Foothills & Mountain Approaches (X = ±52 to ±72) ──
    const outerValley = [
      { pos: [-55, 1.5, -28], s: 1.3, type: 'pine' },
      { pos: [-62, 2.5, -12], s: 1.4, type: 'pine' },
      { pos: [-58, 2.0, 15], s: 1.3, type: 'broadleaf' },
      { pos: [-64, 3.0, 35], s: 1.4, type: 'pine' },
      { pos: [55, 1.5, -28], s: 1.3, type: 'pine' },
      { pos: [62, 2.5, -12], s: 1.4, type: 'pine' },
      { pos: [58, 2.0, 15], s: 1.3, type: 'broadleaf' },
      { pos: [64, 3.0, 35], s: 1.4, type: 'pine' },
    ];
    outerValley.forEach((p, idx) => list.push({ ...p, key: `ov_${idx}` }));

    // ── 5. Southern Foreground Meadow (Z = 52 to 74) ──
    const southMeadow = [
      { pos: [-28, 0.8, 56], s: 1.05, type: 'pine' },
      { pos: [-16, 0.4, 54], s: 0.9, type: 'broadleaf' },
      { pos: [16, 0.4, 54], s: 0.9, type: 'broadleaf' },
      { pos: [28, 0.8, 56], s: 1.05, type: 'pine' },
      { pos: [-40, 1.5, 66], s: 1.3, type: 'pine' },
      { pos: [40, 1.5, 66], s: 1.3, type: 'pine' },
    ];
    southMeadow.forEach((p, idx) => list.push({ ...p, key: `sm_${idx}` }));

    return list;
  }, []);

  const bushes = useMemo(() => {
    return [
      // Trackside flowering shrubs along outer rim
      { pos: [-46, 0.05, -15], s: 1.0, f: '#fbbf24' },
      { pos: [-47, 0.05, 12], s: 1.1, f: '#f43f5e' },
      { pos: [46, 0.05, -15], s: 1.0, f: '#38bdf8' },
      { pos: [47, 0.05, 12], s: 1.1, f: '#fbbf24' },
      { pos: [-22, 0.05, 49], s: 0.9, f: '#f43f5e' },
      { pos: [22, 0.05, 49], s: 0.9, f: '#38bdf8' },
      // Central infield shrubs
      { pos: [-8, 0.02, 11], s: 0.8, f: '#fbbf24' },
      { pos: [9, 0.02, 10], s: 0.85, f: '#f43f5e' },
      { pos: [10, 0.02, -8], s: 0.8, f: '#38bdf8' },
      { pos: [-10, 0.02, -9], s: 0.85, f: '#fbbf24' },
    ];
  }, []);

  return (
    <group>
      {trees.map((t) =>
        t.type === 'pine' ? (
          <LayeredAlpinePine key={t.key} pos={t.pos} scale={t.s} />
        ) : (
          <LushBroadleafTree key={t.key} pos={t.pos} scale={t.s} />
        )
      )}
      {bushes.map((b, i) => (
        <MeadowFlowerBush key={i} pos={b.pos} scale={b.s} flowerColor={b.f} />
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   TRACKSIDE TIMBER FENCING, STONE BRIDGE, AND EVENT BANNERS
   Continuous rustic timber guard fence (Prompt 2 reference) and stone bridge.
───────────────────────────────────────────────────────────────── */
function TracksideFencingAndProps() {
  const outerFencePosts = useMemo(() => {
    const posts = [];
    const count = 48;
    const r = 47.6;
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2;
      const diffFromStart = Math.abs(theta - TRACK_CONFIG.startAngle);
      if (diffFromStart > 0.08 && Math.abs(diffFromStart - Math.PI * 2) > 0.08) {
        posts.push({
          x: r * Math.sin(theta),
          z: r * Math.cos(theta),
          ang: theta,
        });
      }
    }
    return posts;
  }, []);

  const outerFenceRails = useMemo(() => {
    const r = 47.6;
    const geom1 = new THREE.TorusGeometry(r, 0.05, 6, 96);
    geom1.rotateX(Math.PI / 2);
    const geom2 = new THREE.TorusGeometry(r, 0.05, 6, 96);
    geom2.rotateX(Math.PI / 2);
    return { geom1, geom2 };
  }, []);

  const infieldFencePosts = useMemo(() => {
    const posts = [];
    const count = 36;
    const r = 28.5;
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2;
      const diffFromStart = Math.abs(theta - TRACK_CONFIG.startAngle);
      if (diffFromStart > 0.1 && Math.abs(diffFromStart - Math.PI * 2) > 0.1) {
        posts.push({
          x: r * Math.sin(theta),
          z: r * Math.cos(theta),
        });
      }
    }
    return posts;
  }, []);

  return (
    <group>
      {/* ── 1. Outer Rustic Timber Guard Fence (Prompt 2 Match) ── */}
      {outerFencePosts.map((p, i) => (
        <mesh key={i} position={[p.x, 0.65, p.z]} castShadow>
          <cylinderGeometry args={[0.11, 0.13, 1.3, 6]} />
          <meshStandardMaterial color="#78350f" roughness={0.9} />
        </mesh>
      ))}
      <mesh geometry={outerFenceRails.geom1} position={[0, 0.5, 0]}>
        <meshStandardMaterial color="#854d0e" roughness={0.88} />
      </mesh>
      <mesh geometry={outerFenceRails.geom2} position={[0, 1.05, 0]}>
        <meshStandardMaterial color="#854d0e" roughness={0.88} />
      </mesh>

      {/* ── 2. Infield Low Timber Perimeter Barrier ── */}
      {infieldFencePosts.map((p, i) => (
        <mesh key={i} position={[p.x, 0.45, p.z]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, 0.9, 6]} />
          <meshStandardMaterial color="#78350f" roughness={0.9} />
        </mesh>
      ))}

      {/* ── 3. Rustic Stone Arch Bridge crossing the Valley Inlet (Prompt 2) ── */}
      <group position={[32.0, 0.4, -45.0]} rotation={[0, -0.4, 0]}>
        <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.2, 0.5, 12.0]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.85} />
        </mesh>
        <mesh position={[-2.0, 1.1, 0]} castShadow>
          <boxGeometry args={[0.4, 0.7, 12.0]} />
          <meshStandardMaterial color="#64748b" roughness={0.9} />
        </mesh>
        <mesh position={[2.0, 1.1, 0]} castShadow>
          <boxGeometry args={[0.4, 0.7, 12.0]} />
          <meshStandardMaterial color="#64748b" roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.6, -3.5]} castShadow>
          <cylinderGeometry args={[1.2, 1.4, 2.2, 8]} />
          <meshStandardMaterial color="#475569" roughness={0.95} />
        </mesh>
        <mesh position={[0, -0.6, 3.5]} castShadow>
          <cylinderGeometry args={[1.2, 1.4, 2.2, 8]} />
          <meshStandardMaterial color="#475569" roughness={0.95} />
        </mesh>
      </group>

      {/* ── 4. Festive Circuit Pennant Flags & Banner Poles ── */}
      {[
        { theta: 0.8, color: '#3b82f6' },
        { theta: 1.6, color: '#ef4444' },
        { theta: 2.4, color: '#eab308' },
        { theta: 3.2, color: '#10b981' },
        { theta: 4.0, color: '#8b5cf6' },
        { theta: 4.8, color: '#f97316' },
        { theta: 5.6, color: '#06b6d4' },
      ].map((flag, idx) => {
        const r = 48.8;
        const fx = r * Math.sin(flag.theta);
        const fz = r * Math.cos(flag.theta);
        return (
          <group key={idx} position={[fx, 0, fz]}>
            <mesh position={[0, 2.8, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.09, 5.6, 6]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[0.7, 5.0, 0]} rotation={[0, flag.theta, 0]}>
              <planeGeometry args={[1.3, 0.8]} />
              <meshStandardMaterial
                color={flag.color}
                roughness={0.5}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   COMPLETE 3D CIRCULAR RACING CIRCUIT GEOMETRY
   Preserves all 8 lanes, kerbs, checkered start line, and gantry arch.
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

        {/* Overhead "DSA RACE ARENA" Banner Plates (facing approach, exit, and overhead broadcast) */}
        {bannerTexture && (
          <group position={[0, 8.5, 0]}>
            <mesh position={[-0.42, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[14.5, 2.2]} />
              <meshBasicMaterial map={bannerTexture} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0.42, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[14.5, 2.2]} />
              <meshBasicMaterial map={bannerTexture} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 0.45, 0]} rotation={[-Math.PI / 3, 0, 0]}>
              <planeGeometry args={[14.5, 2.0]} />
              <meshBasicMaterial map={bannerTexture} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   DYNAMIC SCENIC ENVIRONMENT & ATMOSPHERIC LIGHTING
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
      positions[i * 3] = (Math.random() - 0.5) * 180;
      positions[i * 3 + 1] = Math.random() * 32 + 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 180;
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
          if (y < -1) y = 32;
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
        position={[45, 55, 35]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight ref={fillRef} position={[-35, 35, -25]} intensity={0.65} color="#bae6fd" />

      {/* 3D Snow Particle System */}
      <points ref={snowRef} visible={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[snowParticles, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.18} color="#f0f9ff" transparent opacity={0.8} sizeAttenuation />
      </points>

      {/* Floating Hot Air Balloon in distant sky */}
      <group position={[-42, 34, -85]} scale={[0.9, 0.9, 0.9]}>
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

  const leaderTarget = racers?.[0];
  const targetMember = focusedMemberId
    ? racers?.find((r) => r.id === focusedMemberId || r.memberId === focusedMemberId) || leaderTarget
    : leaderTarget;

  useEffect(() => {
    userInteractingRef.current = false;
    if (controlsRef.current) {
      if (cameraMode === 'broadcast') {
        controlsRef.current.target.set(0, 5.0, -10.0);
        camera.position.set(0.0, 34.0, 68.0);
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
        controlsRef.current.target.set(0, 4.0, 0);
        camera.position.set(0.0, 42.0, 78.0);
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
        controlsRef.current.target.set(0, 5.0, -10.0);
        camera.position.set(0.0, 34.0, 68.0);
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
      maxDistance={220}
      minPolarAngle={Math.PI / 16}
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
        camera={{ position: [0.0, 34.0, 68.0], fov: 45, near: 0.5, far: 550 }}
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

        {/* Layered 360° Alpine Mountain Ranges surrounding the valley */}
        <AlpineMountainRanges />

        {/* Grand Medieval Castle perched atop the waterfall cliff plateau */}
        <GrandCliffCastle />

        {/* Natural Granite Rock Formations along cliffs and valley */}
        <RockyCragsAndFormations />

        {/* Continuous Sculpted Mountain-Valley Terrain Mesh */}
        <MountainValleyTerrain />

        {/* Animated Alpine Lake, Cascading Cliffside Waterfall & Infield Pond */}
        <AlpineLakeAndWaterfall />

        {/* Dense 3D Forests: Layered Alpine Pines, Broadleaf Trees & Meadow Flora */}
        <DenseNaturalForests />

        {/* Trackside Rustic Timber Fencing, Stone Bridge, and Event Banners */}
        <TracksideFencingAndProps />

        {/* Complete 3D circular racing circuit with 8 lanes, kerbs, and gantry */}
        <CircularRaceCircuit />

        {/* 8 Individually separated racers running in distinct lanes along the closed loop */}
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
