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
    Math.sin(worldX * 0.14) * 1.35 +
    Math.sin(worldX * 0.32) * 0.55 +
    Math.cos(worldX * 0.06) * 0.8 +
    0.25
  );
}

/**
 * Authoritative running path height:
 * Guarantees the racing path stays 100% continuous and dry across all hills
 * and valley water gaps (elevated scenic causeway at -0.92 above water at -1.18).
 */
export function getRunnerPathHeight(worldX) {
  const raw = getTerrainHeight(worldX);
  return Math.max(-0.92, raw);
}

export function getTerrainSlope(worldX) {
  const h = 0.05;
  return (getRunnerPathHeight(worldX + h) - getRunnerPathHeight(worldX - h)) / (2 * h);
}

function wrap(val, min, max) {
  const range = max - min;
  return ((((val - min) % range) + range) % range) + min;
}

/* ─────────────────────────────────────────────────────────────────
   OVERHEAD RACER BILLBOARD TAG (3D Canvas Sprite)
   Clear, medium-scale side-view identification tag.
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
    bgGrad.addColorStop(0, 'rgba(245, 158, 11, 0.95)');
    bgGrad.addColorStop(1, 'rgba(180, 83, 9, 0.95)');
  } else if (rank === 2) {
    bgGrad.addColorStop(0, 'rgba(56, 189, 248, 0.95)');
    bgGrad.addColorStop(1, 'rgba(3, 105, 161, 0.95)');
  } else if (rank === 3) {
    bgGrad.addColorStop(0, 'rgba(236, 72, 153, 0.95)');
    bgGrad.addColorStop(1, 'rgba(168, 85, 247, 0.95)');
  } else {
    bgGrad.addColorStop(0, 'rgba(15, 23, 42, 0.92)');
    bgGrad.addColorStop(1, 'rgba(30, 41, 59, 0.92)');
  }

  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(16, 20, 480, 88, 44);
  } else {
    ctx.rect(16, 20, 480, 88);
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

  // Rank number
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

  // Stagger height slightly between odd and even ranks to avoid overlap in tight packs
  const rank = Number(racer.rank || 1);
  const posY = rank % 2 === 0 ? 2.38 : 2.82;

  return (
    <sprite position={[0, posY, 0]} scale={[3.2, 0.8, 1]}>
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
      {/* Running torso capsule */}
      <mesh castShadow>
        <capsuleGeometry args={[0.32, 0.65, 8, 16]} />
        <meshStandardMaterial color={baseColor} metalness={0.4} roughness={0.3} />
      </mesh>
      {/* Head visor */}
      <mesh position={[0.18, 0.42, 0]}>
        <sphereGeometry args={[0.24, 14, 10]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.6} />
      </mesh>
      {/* Running arms and legs */}
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

/**
 * Racer Presentation:
 * Wraps GLBCharacter with a precise +1.01 Y-offset to cancel GLBCharacter's
 * internal Studio pedestal shift, perfectly grounding the character's feet
 * at y = 0.0.
 */
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

    // Map normalized progress [0, 1] to horizontal window [-9, +7]
    const worldX = -9.0 + currentProgressRef.current * 16.0;
    const scroll = scrollRef.current;
    const terrainHeight = getRunnerPathHeight(worldX + scroll);
    const slope = getTerrainSlope(worldX + scroll);

    // Natural running stride bounce
    const t = clock.getElapsedTime();
    const laneIndex = typeof racer.laneIndex === 'number' ? racer.laneIndex : 0;
    const strideBob = reducedMotion ? 0 : Math.abs(Math.sin(t * 11 + laneIndex)) * 0.08;

    // Lane positioning along depth (Z axis): [-3.3, +3.3]
    const laneZ = (laneIndex - 3.5) * 0.95;

    // Grounding: characters stand cleanly above the grass surface on all slopes (+0.08 clearance)
    groupRef.current.position.set(worldX, terrainHeight + 0.08 + strideBob, laneZ);

    // Facing right (+X) with natural hill incline pitch
    const slopePitch = Math.atan(slope) * 0.65;
    groupRef.current.rotation.set(0, Math.PI / 2, slopePitch);
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
   ANIMATED 3D WATER RIVER & SHORELINE TRANSITIONS
   Sparkling azure water with sunlight reflections and foam ripples.
───────────────────────────────────────────────────────────────── */
function BeautifulWater({ scrollRef }) {
  const waterMeshRef = useRef();
  const foamMeshRef = useRef();

  const { waterGeom, baseWaterPositions } = useMemo(() => {
    const geom = new THREE.PlaneGeometry(120, 56, 48, 24);
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
          Math.sin(vx * 0.32 + t * 2.4) * 0.05 +
          Math.cos(vz * 0.42 + t * 1.9) * 0.04;
        pos.setY(i, wave);
      }
      pos.needsUpdate = true;
      waterMeshRef.current.geometry.computeVertexNormals();
    }

    if (foamMeshRef.current) {
      foamMeshRef.current.material.opacity = 0.45 + Math.sin(t * 3.5) * 0.15;
    }
  });

  return (
    <group position={[0, -1.18, 0]}>
      {/* ── Layer: Sparkling Reflective Azure Water ── */}
      <mesh ref={waterMeshRef} geometry={waterGeom}>
        <meshStandardMaterial
          color="#0284c7"
          roughness={0.12}
          metalness={0.48}
          transparent
          opacity={0.88}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Shoreline Foam Crests along Foreground and Background Water Margins ── */}
      <mesh ref={foamMeshRef} position={[0, 0.02, 4.6]}>
        <planeGeometry args={[116, 0.45]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} rotation={[-Math.PI / 2, 0, 0]} />
      </mesh>
      <mesh position={[0, 0.02, -4.6]}>
        <planeGeometry args={[116, 0.45]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} rotation={[-Math.PI / 2, 0, 0]} />
      </mesh>
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PARALLAX SCROLLING HILL-CLIMBING ENVIRONMENT
   Layer 1: Continuous Grassy Path + Cliffs + Valley Bridges (100% speed)
   Layer 2: Beautiful Water River with Sun Reflections
   Layer 3: Midground Tree-Lined Green Hills (40% parallax)
   Layer 4: Distant Mountain Range (12% parallax)
   Layer 5: Drifting Stylized Clouds (5% parallax)
───────────────────────────────────────────────────────────────── */
function ParallaxEnvironment({ scrollRef, reducedMotion }) {
  const groundMeshRef = useRef();
  const frontCliffRef = useRef();
  const backCliffRef = useRef();
  const midgroundRef = useRef();
  const distantRef = useRef();
  const cloudsRef = useRef();

  // Ground grid: 64 segments along X, depth 9.2 along Z
  const { groundGeom, basePositions } = useMemo(() => {
    const width = 64;
    const depth = 9.2;
    const segX = 64;
    const segZ = 12;
    const geom = new THREE.PlaneGeometry(width, depth, segX, segZ);
    geom.rotateX(-Math.PI / 2);
    const base = new Float32Array(geom.attributes.position.array);
    return { groundGeom: geom, basePositions: base };
  }, []);

  // Cliff skirt geometries for front (Z = +4.6) and back (Z = -4.6)
  const { frontCliffGeom, backCliffGeom } = useMemo(() => {
    const width = 64;
    const segX = 64;
    const fg = new THREE.PlaneGeometry(width, 5, segX, 1);
    const bg = new THREE.PlaneGeometry(width, 5, segX, 1);
    return { frontCliffGeom: fg, backCliffGeom: bg };
  }, []);

  // Trackside decoration items (trees, bushes, distance signposts)
  const tracksideItems = useMemo(() => {
    const items = [];
    for (let i = 0; i < 18; i++) {
      const initX = -30 + i * 3.6;
      const zOffset = i % 2 === 0 ? -4.1 : 4.1;
      const type = i % 4 === 0 ? 'signpost' : i % 2 === 0 ? 'tree' : 'bush';
      items.push({ initX, zOffset, type });
    }
    return items;
  }, []);

  // Bridge posts along the valley water crossing
  const bridgePosts = useMemo(() => {
    const posts = [];
    for (let i = -28; i <= 28; i += 4) {
      posts.push({ x: i, z: 4.65 });
      posts.push({ x: i, z: -4.65 });
    }
    return posts;
  }, []);

  // Low-poly cloud models
  const cloudItems = useMemo(() => {
    return [
      { x: -24, y: 13, z: -20, scale: [3.8, 1.2, 1.6] },
      { x: -8, y: 15, z: -22, scale: [4.6, 1.4, 1.8] },
      { x: 10, y: 12.5, z: -19, scale: [3.4, 1.1, 1.5] },
      { x: 26, y: 14.5, z: -21, scale: [4.2, 1.3, 1.7] },
    ];
  }, []);

  const tracksideRefs = useRef([]);

  useFrame((_, delta) => {
    const scrollSpeed = reducedMotion ? 0.8 : 4.5;
    scrollRef.current += delta * scrollSpeed;
    const scroll = scrollRef.current;

    // 1. Update continuous rolling ground path vertices
    if (groundMeshRef.current && groundMeshRef.current.geometry) {
      const geom = groundMeshRef.current.geometry;
      const pos = geom.attributes.position;
      const count = pos.count;
      for (let i = 0; i < count; i++) {
        const vx = basePositions[i * 3];
        const vz = basePositions[i * 3 + 2];
        const rawH = getTerrainHeight(vx + scroll);
        // The center running path stays continuous across valley water
        const pathH = Math.max(-0.92, rawH);

        // Smooth slope toward shoreline on outer edges
        const edgeFactor = Math.max(0, (Math.abs(vz) - 3.4) / 1.2);
        const finalH = pathH * (1 - edgeFactor * 0.35) - edgeFactor * 0.25;

        pos.setY(i, finalH);
      }
      pos.needsUpdate = true;
      geom.computeVertexNormals();
    }

    // 2. Front Cliff Skirt: top vertices welded to ground, bottom fixed deep underwater
    if (frontCliffRef.current && frontCliffRef.current.geometry) {
      const pos = frontCliffRef.current.geometry.attributes.position;
      const segX = 64;
      for (let i = 0; i <= segX; i++) {
        const x = -32 + (i / segX) * 64;
        const groundH = getRunnerPathHeight(x + scroll) * 0.65 - 0.25;
        // Top vertex (row 0)
        pos.setY(i, groundH);
        // Bottom vertex (row 1)
        pos.setY(i + segX + 1, -5.2);
      }
      pos.needsUpdate = true;
    }

    // 3. Back Cliff Skirt: top vertices welded to ground, bottom fixed deep underwater
    if (backCliffRef.current && backCliffRef.current.geometry) {
      const pos = backCliffRef.current.geometry.attributes.position;
      const segX = 64;
      for (let i = 0; i <= segX; i++) {
        const x = -32 + (i / segX) * 64;
        const groundH = getRunnerPathHeight(x + scroll) * 0.65 - 0.25;
        pos.setY(i, groundH);
        pos.setY(i + segX + 1, -5.2);
      }
      pos.needsUpdate = true;
    }

    // 4. Parallax midground scrolling (40% speed)
    if (midgroundRef.current) {
      midgroundRef.current.position.x = wrap(-scroll * 0.4, -30, 30);
    }

    // 5. Parallax distant mountains scrolling (12% speed)
    if (distantRef.current) {
      distantRef.current.position.x = wrap(-scroll * 0.12, -40, 40);
    }

    // 6. Parallax drifting clouds (5% speed)
    if (cloudsRef.current) {
      cloudsRef.current.position.x = wrap(-scroll * 0.05, -30, 30);
    }

    // 7. Trackside decorations wrap seamlessly
    tracksideItems.forEach((item, idx) => {
      const el = tracksideRefs.current[idx];
      if (el) {
        const worldX = wrap(item.initX - scroll, -30, 30);
        const currentH = getRunnerPathHeight(worldX + scroll);
        el.position.set(worldX, currentH, item.zOffset);
      }
    });
  });

  return (
    <group>
      {/* ── LAYER 1: Continuous Rolling Grassy Running Path ── */}
      <mesh ref={groundMeshRef} geometry={groundGeom} receiveShadow>
        <meshStandardMaterial
          color="#22c55e"
          roughness={0.72}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Dynamic Front Cliff Skirt (Warm Terracotta Earth - NO black slabs!) */}
      <mesh ref={frontCliffRef} geometry={frontCliffGeom} position={[0, 0, 4.6]}>
        <meshStandardMaterial color="#78350f" roughness={0.88} side={THREE.DoubleSide} />
      </mesh>

      {/* Dynamic Back Cliff Skirt */}
      <mesh ref={backCliffRef} geometry={backCliffGeom} position={[0, 0, -4.6]}>
        <meshStandardMaterial color="#78350f" roughness={0.88} side={THREE.DoubleSide} />
      </mesh>

      {/* ── LAYER 2: Sparkling Blue Water & Shorelines ── */}
      <BeautifulWater scrollRef={scrollRef} />

      {/* Trackside decoration elements */}
      <group position={[0, 0, 0]}>
        {tracksideItems.map((item, idx) => (
          <group
            key={idx}
            ref={(el) => (tracksideRefs.current[idx] = el)}
            position={[item.initX, 0, item.zOffset]}
          >
            {item.type === 'tree' ? (
              <group scale={[0.85, 0.85, 0.85]}>
                <mesh position={[0, 0.75, 0]} castShadow>
                  <cylinderGeometry args={[0.18, 0.28, 1.5, 6]} />
                  <meshStandardMaterial color="#78350f" roughness={0.9} />
                </mesh>
                <mesh position={[0, 2.2, 0]} castShadow>
                  <coneGeometry args={[1.1, 2.2, 7]} />
                  <meshStandardMaterial color="#15803d" roughness={0.8} />
                </mesh>
                <mesh position={[0, 3.1, 0]} castShadow>
                  <coneGeometry args={[0.85, 1.8, 7]} />
                  <meshStandardMaterial color="#16a34a" roughness={0.8} />
                </mesh>
              </group>
            ) : item.type === 'bush' ? (
              <group scale={[0.7, 0.7, 0.7]}>
                <mesh position={[0, 0.45, 0]} castShadow>
                  <sphereGeometry args={[0.55, 7, 6]} />
                  <meshStandardMaterial color="#4ade80" roughness={0.85} />
                </mesh>
              </group>
            ) : (
              <group scale={[0.65, 0.65, 0.65]}>
                <mesh position={[0, 0.8, 0]}>
                  <cylinderGeometry args={[0.08, 0.08, 1.6, 6]} />
                  <meshStandardMaterial color="#b45309" roughness={0.8} />
                </mesh>
                <mesh position={[0, 1.4, 0]}>
                  <boxGeometry args={[0.9, 0.4, 0.08]} />
                  <meshStandardMaterial color="#fef08a" roughness={0.6} />
                </mesh>
              </group>
            )}
          </group>
        ))}
      </group>

      {/* ── LAYER 3: Midground Rolling Green Hills (40% Parallax) ── */}
      <group ref={midgroundRef} position={[0, 2.5, -14]}>
        {[-30, 0, 30].map((offsetX, i) => (
          <group key={i} position={[offsetX, 0, 0]}>
            <mesh position={[-6, 0.5, 0]}>
              <sphereGeometry args={[9, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
              <meshStandardMaterial color="#166534" roughness={0.88} />
            </mesh>
            <mesh position={[7, 1.2, -1]}>
              <sphereGeometry args={[11, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
              <meshStandardMaterial color="#14532d" roughness={0.88} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── LAYER 4: Distant Majestic Mountain Peaks (12% Parallax) ── */}
      <group ref={distantRef} position={[0, 5, -29]}>
        {[-40, 0, 40].map((offsetX, i) => (
          <group key={i} position={[offsetX, 0, 0]}>
            <mesh position={[-14, 4, 0]}>
              <coneGeometry args={[14, 16, 5]} />
              <meshStandardMaterial color="#4338ca" roughness={0.92} />
            </mesh>
            <mesh position={[4, 6, -3]}>
              <coneGeometry args={[18, 20, 5]} />
              <meshStandardMaterial color="#3730a3" roughness={0.92} />
            </mesh>
            <mesh position={[20, 3, 1]}>
              <coneGeometry args={[12, 14, 5]} />
              <meshStandardMaterial color="#4f46e5" roughness={0.92} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── LAYER 5: Drifting Stylized Cumulus Clouds (5% Parallax) ── */}
      <group ref={cloudsRef}>
        {cloudItems.map((c, i) => (
          <group key={i} position={[c.x, c.y, c.z]} scale={c.scale}>
            <mesh>
              <sphereGeometry args={[1, 10, 8]} />
              <meshStandardMaterial color="#ffffff" roughness={0.6} transparent opacity={0.92} />
            </mesh>
            <mesh position={[0.8, -0.1, 0]} scale={[0.8, 0.8, 0.8]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshStandardMaterial color="#ffffff" roughness={0.6} transparent opacity={0.92} />
            </mesh>
            <mesh position={[-0.8, -0.15, 0]} scale={[0.75, 0.75, 0.75]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshStandardMaterial color="#ffffff" roughness={0.6} transparent opacity={0.92} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FLUID GAME CAMERA & INTERACTIVE ORBIT/PAN/ZOOM CONTROLS
   Allows full mouse drag/pan, wheel zoom in/out, and auto tracking.
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

  // Reset user-interacting override when camera mode or focused contestant changes
  useEffect(() => {
    if (prevCameraModeRef.current !== cameraMode || prevFocusedRef.current !== focusedMemberId) {
      userInteractingRef.current = false;
      prevCameraModeRef.current = cameraMode;
      prevFocusedRef.current = focusedMemberId;
    }
  }, [cameraMode, focusedMemberId]);

  // Imperative handle for zoom in/out and view reset
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
        controlsRef.current.target.set(-1.0, 1.0, 0);
        camera.position.set(-1.0, 4.6, 24.5);
        controlsRef.current.update();
      }
    },
    focusMember: (memberId) => {
      userInteractingRef.current = false;
      const m = racers?.find((r) => r.id === memberId || r.memberId === memberId);
      if (m && controlsRef.current) {
        const prog = typeof m.progress === 'number' ? m.progress : 0;
        const tx = -9.0 + prog * 16.0;
        const ty = getRunnerPathHeight(tx + scrollRef.current);
        controlsRef.current.target.set(tx, ty + 0.8, 0);
        camera.position.set(tx - 0.5, ty + 2.5, 12.5);
        controlsRef.current.update();
      }
    },
  }));

  useFrame((_, delta) => {
    // If user is actively dragging or zooming, let OrbitControls handle camera freely
    if (userInteractingRef.current) return;

    if (cameraMode === 'leader' && targetMember) {
      // Smoothly track the focused runner or leader along the rolling hills
      const targetProgress = typeof targetMember.progress === 'number' ? targetMember.progress : 0;
      const targetX = -9.0 + targetProgress * 16.0;
      const scroll = scrollRef.current;
      const targetY = getRunnerPathHeight(targetX + scroll);

      const camX = targetX - 0.5;
      const camY = Math.max(2.6, targetY + 2.4);
      const camZ = 13.5;

      camera.position.x = THREE.MathUtils.lerp(camera.position.x, camX, delta * 3.0);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, camY, delta * 2.5);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, camZ, delta * 3.0);

      if (controlsRef.current) {
        controlsRef.current.target.x = THREE.MathUtils.lerp(controlsRef.current.target.x, targetX + 1.2, delta * 3.0);
        controlsRef.current.target.y = THREE.MathUtils.lerp(controlsRef.current.target.y, targetY + 0.8, delta * 2.5);
        controlsRef.current.target.z = THREE.MathUtils.lerp(controlsRef.current.target.z, 0, delta * 3.0);
        controlsRef.current.update();
      }
    } else if (cameraMode === 'broadcast') {
      // Panoramic Wide Hill Track view framing all 8 racers
      const targetCam = new THREE.Vector3(-1.0, 4.6, 24.5);
      camera.position.lerp(targetCam, delta * 2.5);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(new THREE.Vector3(-1.0, 1.0, 0), delta * 2.5);
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
      maxDistance={45}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2 - 0.04}
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
    <div className="race-arena-root">
      <Canvas
        camera={{ position: [-1.0, 4.6, 24.5], fov: 42, near: 0.5, far: 200 }}
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
        {/* Sunny stylized sky background */}
        <color attach="background" args={['#7dd3fc']} />

        {/* Sunlight & Nature Lighting */}
        <ambientLight intensity={1.15} />
        <directionalLight
          position={[20, 35, 18]}
          intensity={1.8}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-15, 20, 10]} intensity={0.5} color="#bae6fd" />

        {/* Parallax rolling hills & water environment layers */}
        <ParallaxEnvironment scrollRef={scrollRef} reducedMotion={reducedMotion} />

        {/* Medium-sized running characters */}
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

        {/* Fluid side-scrolling & interactive pan/zoom camera */}
        <SideScrollCamera
          ref={cameraRef}
          cameraMode={cameraMode}
          racers={racers}
          focusedMemberId={focusedMemberId}
          scrollRef={scrollRef}
        />
      </Canvas>
    </div>
  );
});

export default RaceArena;
