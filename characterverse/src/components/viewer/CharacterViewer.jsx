import React, { Suspense, useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, createPortal } from '@react-three/fiber';
import { OrbitControls, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useStudio } from '../../context/StudioContext';
import VehicleMesh from './VehicleMesh';

/* ─────────────────────────────────────────────────────────────────
   BONE ATTACHMENT COMPONENT
   Attaches a container Group directly into the Three.js Bone hierarchy
   so accessories inherit bone movement and rotation from animations.
───────────────────────────────────────────────────────────────── */
function BoneAttachment({ bone, children }) {
  const [container] = useState(() => new THREE.Group());

  useEffect(() => {
    if (bone && container) {
      bone.add(container);
      return () => {
        bone.remove(container);
      };
    }
  }, [bone, container]);

  if (!bone) return null;
  return createPortal(children, container);
}

/* ─────────────────────────────────────────────────────────────────
   PROCEDURAL HEAD ACCESSORIES (scaled for ~1.08 unit head width)
───────────────────────────────────────────────────────────────── */

/** Golden Spiked Crown */
function Crown({ color = '#fbbf24', accentColor = '#f59e0b' }) {
  return (
    <group position={[0, 0.98, 0]}>
      {/* Base Rim */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.44, 0.40, 0.09, 24]} />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.2} />
      </mesh>
      {/* Filigree Inlay Ring */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.445, 0.018, 10, 32]} />
        <meshStandardMaterial color="#fef08a" metalness={0.9} roughness={0.15} />
      </mesh>
      {/* 5 Flared Crown Spikes */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i * Math.PI * 2) / 5;
        const x = Math.sin(angle) * 0.40;
        const z = Math.cos(angle) * 0.40;
        return (
          <group key={i} position={[x, 0.08, z]} rotation={[0.08, -angle, 0.12]}>
            <mesh castShadow>
              <coneGeometry args={[0.065, 0.18, 8]} />
              <meshStandardMaterial color={color} metalness={0.85} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.16, 0]}>
              <sphereGeometry args={[0.03, 10, 10]} />
              <meshStandardMaterial
                color={accentColor}
                emissive={accentColor}
                emissiveIntensity={0.8}
                roughness={0.1}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Sporty Baseball Cap with Visor Brim */
function BaseballCap({ color, accentColor }) {
  return (
    <group position={[0, 0.94, 0.02]}>
      {/* Cap Dome */}
      <mesh castShadow position={[0, 0.04, -0.04]}>
        <sphereGeometry args={[0.48, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
        <meshStandardMaterial color={color} roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* Visor Brim */}
      <group position={[0, 0.02, 0.38]} rotation={[0.22, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.48, 0.025, 0.32]} />
          <meshStandardMaterial color={accentColor} roughness={0.5} />
        </mesh>
      </group>
      {/* Top Center Squatchee Button */}
      <mesh position={[0, 0.50, -0.04]}>
        <sphereGeometry args={[0.038, 10, 10]} />
        <meshStandardMaterial color={accentColor} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** High-Tech Glass Space Bubble Helmet */
function SpaceHelmet({ color, accentColor }) {
  return (
    <group position={[0, 0.58, 0.02]}>
      {/* Physical Glass Bubble */}
      <mesh>
        <sphereGeometry args={[0.66, 32, 28]} />
        <meshPhysicalMaterial
          color="#cffafe"
          transparent
          opacity={0.32}
          roughness={0.05}
          metalness={0.15}
          transmission={0.85}
          ior={1.25}
        />
      </mesh>
      {/* Metallic Base Collar Ring */}
      <mesh position={[0, -0.52, 0]}>
        <torusGeometry args={[0.54, 0.055, 14, 32]} />
        <meshStandardMaterial color={accentColor} metalness={0.85} roughness={0.2} />
      </mesh>
    </group>
  );
}

/** Twin High-Voltage Cyber Horns */
function CyberHorns({ color }) {
  return (
    <>
      {[[-0.30, 0.94, 0.18, -0.35], [0.30, 0.94, 0.18, 0.35]].map(([x, y, z, rz], i) => (
        <group key={i} position={[x, y, z]} rotation={[0.1, 0, rz]}>
          <mesh castShadow>
            <coneGeometry args={[0.08, 0.40, 12]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.6}
              metalness={0.7}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[0, -0.17, 0]}>
            <cylinderGeometry args={[0.09, 0.10, 0.05, 14]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <torusGeometry args={[0.056, 0.012, 8, 14]} rotation={[Math.PI / 2, 0, 0]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** Over-Ear Gaming / Studio Headphones */
function Headphones({ color }) {
  return (
    <group position={[0, 0.54, 0]}>
      {/* Contoured Headband */}
      <mesh position={[0, 0.50, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.54, 0.038, 12, 32, Math.PI]} />
        <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Top Cushion Pad */}
      <mesh position={[0, 1.02, 0]}>
        <boxGeometry args={[0.38, 0.035, 0.08]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Left and Right Ear Cups */}
      {[-0.56, 0.56].map((x, i) => (
        <group key={i} position={[x, -0.02, 0]} rotation={[0, 0, x > 0 ? -0.1 : 0.1]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.15, 0.16, 0.08, 22]} rotation={[0, 0, Math.PI / 2]} />
            <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[x > 0 ? 0.045 : -0.045, 0, 0]}>
            <cylinderGeometry args={[0.10, 0.10, 0.018, 18]} rotation={[0, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[x > 0 ? -0.045 : 0.045, 0, 0]}>
            <torusGeometry args={[0.11, 0.035, 10, 22]} rotation={[0, Math.PI / 2, 0]} />
            <meshStandardMaterial color="#1e293b" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Levitating Radiant Astral Halo */
function Halo({ color }) {
  const haloRef = useRef();
  useFrame((state) => {
    if (haloRef.current) {
      haloRef.current.position.y = 1.25 + Math.sin(state.clock.getElapsedTime() * 2) * 0.03;
    }
  });

  return (
    <group ref={haloRef} position={[0, 1.25, 0]} rotation={[Math.PI * 0.08, 0, 0]}>
      <mesh>
        <torusGeometry args={[0.46, 0.045, 14, 36]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.0}
          metalness={0.4}
          roughness={0.1}
        />
      </mesh>
      <mesh>
        <torusGeometry args={[0.46, 0.016, 10, 32]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FACE ACCESSORIES (fitted to front of head at z ~ +0.52)
───────────────────────────────────────────────────────────────── */

/** Curved Optical HUD Visor */
function Visor({ color }) {
  return (
    <group position={[0, 0.56, 0.53]}>
      <mesh castShadow>
        <cylinderGeometry
          args={[0.50, 0.50, 0.16, 32, 1, true, -Math.PI * 0.38, Math.PI * 0.76]}
        />
        <meshStandardMaterial
          color={color}
          roughness={0.1}
          metalness={0.8}
          emissive={color}
          emissiveIntensity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.085, 0]}>
        <cylinderGeometry
          args={[0.505, 0.505, 0.024, 32, 1, true, -Math.PI * 0.38, Math.PI * 0.76]}
        />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Industrial Blast Goggles */
function Goggles({ color }) {
  return (
    <group position={[0, 0.56, 0.54]}>
      {[-0.18, 0.18].map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh castShadow>
            <torusGeometry args={[0.11, 0.028, 12, 24]} />
            <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, -0.01]}>
            <circleGeometry args={[0.095, 20]} />
            <meshStandardMaterial color="#0284c7" emissive="#0284c7" emissiveIntensity={0.4} roughness={0.1} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.02, -0.02]}>
        <boxGeometry args={[0.11, 0.028, 0.03]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

/** Rebel Tint Shades */
function RebelGlasses({ color, accentColor }) {
  return (
    <group position={[0, 0.56, 0.54]}>
      {[-0.18, 0.18].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} rotation={[0, x > 0 ? -0.08 : 0.08, 0]}>
          <boxGeometry args={[0.22, 0.095, 0.025]} />
          <meshStandardMaterial color="#090d16" roughness={0.1} metalness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.50, 0.02, 0.03]} />
        <meshStandardMaterial color={accentColor} metalness={0.85} roughness={0.2} />
      </mesh>
    </group>
  );
}

/** Shadow Runner Half-Mask */
function NinjaMask({ color, accentColor }) {
  return (
    <group position={[0, 0.36, 0.52]}>
      <mesh castShadow>
        <cylinderGeometry
          args={[0.48, 0.42, 0.26, 28, 1, true, -Math.PI * 0.40, Math.PI * 0.80]}
        />
        <meshStandardMaterial color={color} roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.09, 0.38]}>
        <boxGeometry args={[0.035, 0.14, 0.03]} />
        <meshStandardMaterial color={accentColor} roughness={0.6} />
      </mesh>
    </group>
  );
}

/** Robotic Jaw Breather with Glowing Slits */
function CyberFaceplate({ color, accentColor }) {
  return (
    <group position={[0, 0.36, 0.52]}>
      <mesh castShadow>
        <cylinderGeometry
          args={[0.49, 0.44, 0.25, 28, 1, true, -Math.PI * 0.38, Math.PI * 0.76]}
        />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.25} side={THREE.DoubleSide} />
      </mesh>
      {[-0.10, 0, 0.10].map((x, i) => (
        <mesh key={i} position={[x, -0.02, 0.44]}>
          <boxGeometry args={[0.035, 0.10, 0.018]} />
          <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   UPPER BODY ATTACHMENTS (attached to chest bone, front at z ~ +0.37)
───────────────────────────────────────────────────────────────── */

function StarCore({ color }) {
  return (
    <group position={[0, 0.06, 0.38]}>
      <mesh>
        <torusGeometry args={[0.15, 0.028, 12, 28]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh castShadow>
        <sphereGeometry args={[0.12, 20, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} roughness={0.1} metalness={0.2} />
      </mesh>
    </group>
  );
}

function LightningBolt({ color }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0.07, 0.32); s.lineTo(-0.03, 0.07); s.lineTo(0.10, 0.05);
    s.lineTo(-0.07, -0.32); s.lineTo(0.03, -0.07); s.lineTo(-0.10, -0.05);
    s.closePath();
    return s;
  }, []);

  return (
    <mesh position={[0, 0.04, 0.38]}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} side={THREE.DoubleSide} />
    </mesh>
  );
}

function TorsoStripes({ color }) {
  return (
    <group position={[0, 0.04, 0.38]}>
      {[-0.14, 0, 0.14].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <boxGeometry args={[0.05, 0.50, 0.02]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

function BoltedArmor({ color, accentColor }) {
  return (
    <group position={[0, 0.04, 0.38]}>
      <mesh castShadow>
        <boxGeometry args={[0.68, 0.48, 0.06]} />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.06, 0.045]}>
        <cylinderGeometry args={[0.08, 0.08, 0.02, 16]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function TacticalVest({ color, accentColor }) {
  return (
    <group position={[0, 0.04, 0.38]}>
      {[-0.22, 0.22].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <boxGeometry args={[0.22, 0.50, 0.04]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      ))}
      {[-0.22, 0.22].map((x, i) => (
        <mesh key={i} position={[x, -0.14, 0.04]}>
          <boxGeometry args={[0.15, 0.14, 0.05]} />
          <meshStandardMaterial color={accentColor} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   BACK ACCESSORIES (attached to chest bone, back at z ~ -0.36)
───────────────────────────────────────────────────────────────── */

function ThrusterPack({ color }) {
  return (
    <group position={[0, 0.06, -0.38]}>
      {/* Jetpack Housing */}
      <mesh castShadow>
        <capsuleGeometry args={[0.14, 0.28, 14, 18]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.65} />
      </mesh>
      {/* Twin Exhaust Nozzles */}
      {[-0.09, 0.09].map((x, i) => (
        <group key={i} position={[x, -0.22, 0]}>
          <mesh>
            <cylinderGeometry args={[0.055, 0.04, 0.16, 14]} />
            <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.08, 0]}>
            <circleGeometry args={[0.038, 14]} rotation={[Math.PI / 2, 0, 0]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function BatteryPack({ color }) {
  return (
    <group position={[0, 0.06, -0.38]}>
      <mesh castShadow>
        <boxGeometry args={[0.26, 0.34, 0.14]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.4} />
      </mesh>
      {[0.06, -0.06].map((y, i) => (
        <mesh key={i} position={[0, y, -0.07]}>
          <boxGeometry args={[0.18, 0.055, 0.02]} />
          <meshStandardMaterial color="#00ff99" emissive="#00ff99" emissiveIntensity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function EnergyWings({ color }) {
  return (
    <group position={[0, 0.14, -0.36]}>
      {[-1, 1].map((dir, i) => (
        <group key={i} rotation={[0, dir * 0.38, dir * -0.26]}>
          <mesh position={[dir * 0.54, 0.16, 0]}>
            <boxGeometry args={[0.72, 0.12, 0.02]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.0} transparent opacity={0.85} />
          </mesh>
          <mesh position={[dir * 0.42, -0.05, 0]}>
            <boxGeometry args={[0.50, 0.09, 0.02]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.0} transparent opacity={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CrossedKatana({ color, accentColor }) {
  return (
    <group position={[0, 0.10, -0.36]}>
      {[-0.55, 0.55].map((rot, i) => (
        <group key={i} rotation={[0, 0, rot]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.026, 0.020, 0.88, 14]} />
            <meshStandardMaterial color={color} metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.36, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.018, 14]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.48, 0]}>
            <cylinderGeometry args={[0.024, 0.024, 0.20, 14]} />
            <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function HeroCape({ color }) {
  const capeRef = useRef();
  useFrame((state) => {
    if (capeRef.current) {
      capeRef.current.rotation.x = -0.15 + Math.sin(state.clock.getElapsedTime() * 2.5) * 0.04;
    }
  });

  return (
    <group ref={capeRef} position={[0, 0.22, -0.34]} rotation={[-0.15, 0, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.62, 0.88, 0.022]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {[-0.26, 0.26].map((x, i) => (
        <mesh key={i} position={[x, 0.42, 0.03]}>
          <sphereGeometry args={[0.038, 10, 10]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   COSMETIC PARTICLE EFFECTS
───────────────────────────────────────────────────────────────── */

function ParticleEffect({ effectType, glowColor }) {
  const groupRef = useRef();

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 1.6;
    }
  });

  if (!effectType || effectType === 'none') return null;

  return (
    <group ref={groupRef} position={[0, -0.2, 0]}>
      {effectType === 'cyanSparks' && (
        <>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const angle = (i * Math.PI * 2) / 6;
            const r = 1.05;
            const y = Math.sin(i * 1.8) * 0.4 + 0.4;
            return (
              <mesh key={i} position={[Math.sin(angle) * r, y, Math.cos(angle) * r]}>
                <sphereGeometry args={[0.035, 10, 10]} />
                <meshBasicMaterial color={glowColor} />
              </mesh>
            );
          })}
        </>
      )}

      {effectType === 'solarRings' && (
        <>
          <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.15, 1.22, 36]} />
            <meshStandardMaterial
              color={glowColor}
              emissive={glowColor}
              emissiveIntensity={0.9}
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 0.58, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.88, 0.94, 36]} />
            <meshStandardMaterial
              color={glowColor}
              emissive={glowColor}
              emissiveIntensity={0.9}
              transparent
              opacity={0.5}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}

      {effectType === 'lightningArcs' && (
        <>
          {[-0.6, 0.6].map((x, i) => (
            <mesh key={i} position={[x, 0.85, 0]}>
              <octahedronGeometry args={[0.08, 0]} />
              <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={1.5} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   GLB CHARACTER MODEL WITH SKELETON-BOUND BONE ATTACHMENTS
───────────────────────────────────────────────────────────────── */

export function GLBCharacter({ characterData, onReady }) {
  const { scene, animations } = useGLTF(characterData.modelFile, false, false);
  const isSuperman = characterData?.id === 'superman';

  // Dynamic Cape, Hair & Ground Shadow simulation refs
  const capeMeshRef = useRef(null);
  const baseCapePositionsRef = useRef(null);
  const headMeshRef = useRef(null);
  const baseHeadPositionsRef = useRef(null);
  const shadowRef = useRef(null);

  const flightBlendRef = useRef(0);
  const flightTimeRef = useRef(0);
  const filteredSpeedRef = useRef(0);
  const lastYawRef = useRef(0);
  const turnRateRef = useRef(0);
  const overshootRef = useRef(0);

  // The dashboard hosts this React experience in an isolated same-origin
  // frame. Confirm readiness only after the actual character GLB resolved,
  // rather than when the frame's HTML merely finished loading.
  useEffect(() => {
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'characterverse-preview-ready' }, window.location.origin);
    }
    onReady?.();
  }, [characterData.modelFile, onReady]);

  // Clone using SkeletonUtils so skinned meshes and bone bindings stay intact.
  // We decouple the materials so clothing/armor can be customized independently
  // while skin, facial features, and weapon steel remain pristine.
  const { clone: clonedScene, headMat, weaponMat, clothingMat, capeMat } = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);

    // Locate the model's base material
    let templateMat = null;
    clone.traverse((child) => {
      if (child.isMesh && child.material && !templateMat) {
        templateMat = child.material;
      }
    });

    // 1. Head material: Always #ffffff to preserve original skin tones, eyes, eyebrows, and face texture
    const head = templateMat ? templateMat.clone() : new THREE.MeshStandardMaterial();
    head.name = 'headMaterial';
    head.color.set('#ffffff');

    // 2. Weapon material: Always #ffffff to preserve original sword steel, brass hilt, and blade textures
    const weapon = templateMat ? templateMat.clone() : new THREE.MeshStandardMaterial();
    weapon.name = 'weaponMaterial';
    weapon.color.set('#ffffff');

    // 3. Clothing / armor material: Tintable for custom colors
    const clothing = templateMat ? templateMat.clone() : new THREE.MeshStandardMaterial();
    clothing.name = 'clothingMaterial';

    // 4. Cape material: Tintable for secondary accents
    const cape = templateMat ? templateMat.clone() : new THREE.MeshStandardMaterial();
    cape.name = 'capeMaterial';

    // Assign appropriate material by mesh role
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const lower = child.name.toLowerCase();
        if (
          lower.includes('sword') ||
          lower.includes('shield') ||
          lower.includes('knife') ||
          lower.includes('crossbow') ||
          lower.includes('throwable')
        ) {
          child.material = weapon;
        } else if (lower.includes('head')) {
          child.material = head;
        } else if (lower.includes('cape')) {
          child.material = cape;
        } else {
          child.material = clothing;
        }
      }
    });

    return { clone, headMat: head, weaponMat: weapon, clothingMat: clothing, capeMat: cape };
  }, [scene]);

  // Cache original vertex positions of Superman Cape and Hair for dynamic airflow simulation
  useEffect(() => {
    if (!clonedScene) return;
    capeMeshRef.current = null;
    baseCapePositionsRef.current = null;
    headMeshRef.current = null;
    baseHeadPositionsRef.current = null;

    clonedScene.traverse((child) => {
      if (child.isMesh) {
        if (child.name === 'Superman_Cape') {
          capeMeshRef.current = child;
          baseCapePositionsRef.current = new Float32Array(child.geometry.attributes.position.array);
        } else if (child.name === 'Superman_Head') {
          headMeshRef.current = child;
          baseHeadPositionsRef.current = new Float32Array(child.geometry.attributes.position.array);
        }
      }
    });

    return () => {
      if (capeMeshRef.current && baseCapePositionsRef.current) {
        capeMeshRef.current.geometry.attributes.position.array.set(baseCapePositionsRef.current);
        capeMeshRef.current.geometry.attributes.position.needsUpdate = true;
      }
      if (headMeshRef.current && baseHeadPositionsRef.current) {
        headMeshRef.current.geometry.attributes.position.array.set(baseHeadPositionsRef.current);
        headMeshRef.current.geometry.attributes.position.needsUpdate = true;
      }
    };
  }, [clonedScene, characterData?.id]);

  // Bind animations to clonedScene
  const { actions, names: animNames } = useAnimations(animations, clonedScene);

  // Play Dynamic Idle / Driving Running / Mounted Sitting animation
  useEffect(() => {
    if (!actions) return;
    const isDriving = characterData?.isDrivingMode;
    const vehicle = characterData?.vehicle;
    const isMountedBike = vehicle?.modelType === 'bike';
    const isMountedCar = vehicle?.modelType === 'car';
    const isMountedRocket = vehicle?.modelType === 'rocket';
    const isMounted = isMountedBike || isMountedCar || isMountedRocket;

    // Pick target animation action based on mounted / driving / idle state
    let targetAction = null;
    if (isMounted) {
      const sitNames = ['Sit_Chair_Idle', 'Sit_Chair_Pose', 'Sit_Chair_Down'];
      for (const name of sitNames) {
        if (actions[name]) {
          targetAction = actions[name];
          break;
        }
      }
      if (!targetAction && animNames) {
        const sitKey = animNames.find((n) => n.toLowerCase().includes('sit'));
        if (sitKey) targetAction = actions[sitKey];
      }
    } else if (isDriving) {
      if (characterData?.id === 'superman') {
        // Superman Flight Mode: Handled authoritatively via skeletal flight controller in useFrame
        targetAction = null;
      } else {
        const runNames = ['Running_A', 'Running_B', 'Walking_A', 'Run', 'run'];
        for (const name of runNames) {
          if (actions[name]) {
            targetAction = actions[name];
            break;
          }
        }
        if (!targetAction && animNames) {
          const runKey = animNames.find((n) => n.toLowerCase().includes('run'));
          if (runKey) targetAction = actions[runKey];
        }
      }
    }

    if (!targetAction && !(characterData?.id === 'superman' && isDriving)) {
      const idleNames = ['Idle', 'Unarmed_Idle', 'idle'];
      for (const name of idleNames) {
        if (actions[name]) {
          targetAction = actions[name];
          break;
        }
      }
      if (!targetAction && animNames) {
        const idleKey = animNames.find((n) => n.toLowerCase().includes('idle'));
        if (idleKey) targetAction = actions[idleKey];
      }
    }

    if (targetAction) {
      // Fade out other running actions
      Object.values(actions).forEach((act) => {
        if (act && act !== targetAction && act.isRunning()) {
          act.fadeOut(0.25);
        }
      });
      targetAction.reset().fadeIn(0.25).play();
    } else if (characterData?.id === 'superman' && isDriving) {
      // Fade out running/idle clips so skeletal flight controller has full authoritative control
      Object.values(actions).forEach((act) => {
        if (act && act.isRunning()) {
          act.fadeOut(0.25);
        }
      });
    }

    return () => {
      if (targetAction) targetAction.fadeOut(0.25);
    };
  }, [actions, animNames, characterData.id, characterData?.isDrivingMode, characterData?.vehicle?.modelType]);

  // Hide handheld weapons while mounted on bike, car, or rocket so hands cleanly grip handlebars/steering wheel/flight controls
  useEffect(() => {
    if (!clonedScene) return;
    const isMounted =
      characterData?.vehicle?.modelType === 'bike' ||
      characterData?.vehicle?.modelType === 'car' ||
      characterData?.vehicle?.modelType === 'rocket';
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        const lower = child.name.toLowerCase();
        if (
          lower.includes('sword') ||
          lower.includes('shield') ||
          lower.includes('knife') ||
          lower.includes('crossbow') ||
          lower.includes('throwable')
        ) {
          child.visible = !isMounted;
        }
      }
    });
  }, [clonedScene, characterData?.vehicle?.modelType]);

  // Ergonomic bone positioning for bike riding, sports car cockpit, and legendary rocket astride flight
  // plus dedicated Superman heroic flight controller with aerodynamic cape & hair cloth dynamics
  useFrame(({ clock }, delta) => {
    if (!clonedScene) return;
    const vehicleType = characterData?.vehicle?.modelType;
    const isMountedBike = vehicleType === 'bike';
    const isMountedCar = vehicleType === 'car';
    const isMountedRocket = vehicleType === 'rocket';
    const isMounted = isMountedBike || isMountedCar || isMountedRocket;

    if (!isMounted && !isSuperman) {
      // Reset any flight offsets if unequipped for standard characters
      if (clonedScene.position.y !== 0) clonedScene.position.set(0, 0, 0);
      if (clonedScene.rotation.x !== 0 || clonedScene.rotation.z !== 0 || clonedScene.rotation.y !== 0) {
        clonedScene.rotation.set(0, 0, 0);
      }
      if (shadowRef.current) {
        shadowRef.current.position.set(0, 0.015, 0.04);
        if (shadowRef.current.material) shadowRef.current.material.opacity = 0.42;
        shadowRef.current.scale.set(1, 1, 1);
      }
      return;
    }

    const spine = clonedScene.getObjectByName('spine');
    const chest = clonedScene.getObjectByName('chest');
    const head = clonedScene.getObjectByName('head');
    const ual = clonedScene.getObjectByName('upperarm.l') || clonedScene.getObjectByName('upperarml');
    const uar = clonedScene.getObjectByName('upperarm.r') || clonedScene.getObjectByName('upperarmr');
    const lal = clonedScene.getObjectByName('lowerarm.l') || clonedScene.getObjectByName('lowerarml');
    const lar = clonedScene.getObjectByName('lowerarm.r') || clonedScene.getObjectByName('lowerarmr');
    const ull = clonedScene.getObjectByName('upperleg.l') || clonedScene.getObjectByName('upperlegl');
    const ulr = clonedScene.getObjectByName('upperleg.r') || clonedScene.getObjectByName('upperlegr');
    const lll = clonedScene.getObjectByName('lowerleg.l') || clonedScene.getObjectByName('lowerlegl');
    const llr = clonedScene.getObjectByName('lowerleg.r') || clonedScene.getObjectByName('lowerlegr');
    const footl = clonedScene.getObjectByName('foot.l') || clonedScene.getObjectByName('footl');
    const footr = clonedScene.getObjectByName('foot.r') || clonedScene.getObjectByName('footr');
    const t = clock.getElapsedTime();
    const isDriving = characterData?.isDrivingMode;

    if (isSuperman && !isMounted) {
      const isFlight = Boolean(isDriving);
      const blendSpeed = isFlight ? 3.0 : 4.0;
      flightBlendRef.current = THREE.MathUtils.lerp(
        flightBlendRef.current,
        isFlight ? 1 : 0,
        Math.min(1, delta * blendSpeed)
      );
      const fb = flightBlendRef.current;

      if (fb > 0.001) {
        flightTimeRef.current += delta * fb;
        const ft = flightTimeRef.current;

        // 1. Aerodynamic Straight Flight Positioning & Orientation
        // Superman hovers in heroic forward flight centered directly over the podium.
        // Rock-solid straight heading by default with zero yaw oscillation or wobble.
        const flightY = (0.62 + Math.sin(ft * 2.0) * 0.015) * fb; // Elevated clearance above podium
        const flightZ = -1.10 * fb; // Centered horizontal silhouette [hands to boots] over podium center
        const flightOrbitX = 0; // Rock-solid straight flight along center axis (neutral studio trajectory)
        const flightX = flightOrbitX;

        clonedScene.position.set(flightX, flightY, flightZ);

        // Horizontal forward pitch leans torso horizontally into heroic forward flight
        // Facing direction is strictly straight forward along Z-axis; banking is strictly 0
        const pitchAngle = 1.08 * fb;
        const headingYaw = 0;
        const bankAngle = 0;

        clonedScene.rotation.set(pitchAngle, headingYaw, bankAngle, 'YXZ');

        // 2. Heroic Superman Flight Pose — BOTH Arms Extended Forward Level with Shoulders
        if (spine) {
          spine.rotation.x = 0.10 * fb;
        }
        if (chest) {
          // Proud chest: arching upward so the solid 3D S-shield emblem faces key light and camera
          chest.rotation.set(-0.25 * fb, 0, 0);
        }
        if (head) {
          // Head tilted up to look directly forward along the flight path; face clearly visible
          head.rotation.set((-0.55 + Math.sin(ft * 2.0) * 0.01) * fb, 0, 0);
        }
        if (uar) {
          // Right arm: Leading heroic Superman fist extended straight forward level with shoulder
          uar.rotation.set(
            (1.08 + Math.sin(ft * 3.0) * 0.008) * fb,
            0.45 * fb,
            (-0.18 + Math.cos(ft * 2.5) * 0.006) * fb
          );
        }
        if (lar) {
          // Right forearm: Straight and level with upper arm
          lar.rotation.set(0.04 * fb, 0, 0);
        }
        if (ual) {
          // Left arm: Extended straight forward level with shoulder, mirroring right arm with subtle perspective lead
          ual.rotation.set(
            (1.02 + Math.sin(ft * 3.0) * 0.008) * fb,
            -0.45 * fb,
            (0.18 - Math.cos(ft * 2.5) * 0.006) * fb
          );
        }
        if (lal) {
          // Left forearm: Straight and level with upper arm
          lal.rotation.set(0.04 * fb, 0, 0);
        }
        if (ull) {
          // Streamlined trailing left leg
          ull.rotation.set(
            3.107 + Math.sin(ft * 2.5) * 0.006,
            0.02 * fb,
            -0.04 * fb
          );
        }
        if (ulr) {
          // Streamlined trailing right leg
          ulr.rotation.set(
            3.107 - Math.sin(ft * 2.5) * 0.006,
            -0.02 * fb,
            0.04 * fb
          );
        }
        if (lll) {
          // Left knee: Straightened with subtle natural flex
          lll.rotation.set(0.02 * fb, 0, 0);
        }
        if (llr) {
          // Right knee: Straightened with subtle natural flex
          llr.rotation.set(0.02 * fb, 0, 0);
        }
        if (footl) {
          // Pointed left toes
          footl.rotation.set(0.00, 0, 0);
        }
        if (footr) {
          // Pointed right toes
          footr.rotation.set(0.00, 0, 0);
        }

        // 3. Dynamic Cape Cloth Dynamics Simulation — Flowing strictly behind the legs
        if (capeMeshRef.current && baseCapePositionsRef.current) {
          const posAttr = capeMeshRef.current.geometry.attributes.position;
          const posArray = posAttr.array;
          const baseArray = baseCapePositionsRef.current;
          const vertCount = posAttr.count;

          const s = fb;
          const waveTime = clock.getElapsedTime();

          for (let i = 0; i < vertCount; i++) {
            const idx = i * 3;
            const x0 = baseArray[idx];
            const y0 = baseArray[idx + 1];
            const z0 = baseArray[idx + 2];

            // Distance from shoulder (y0 = 0) to hem (y0 = -1.12)
            const vNorm = THREE.MathUtils.clamp(-y0 / 1.12, 0, 1);
            const vFactor = Math.pow(vNorm, 1.5);
            const edgeFactor = THREE.MathUtils.clamp(Math.abs(x0) / 0.45, 0, 1);

            // Backward slipstream stream along local -Z (keeps cape behind back and trailing legs)
            const streamZ = -0.16 * s * Math.pow(vNorm, 1.4);
            const liftY = 0.04 * s * Math.pow(vNorm, 1.6);

            // Traveling layered aerodynamic waves from shoulders to hem
            const phi1 = waveTime * 8.5 - vNorm * 5.0;
            const phi2 = waveTime * 15.0 - vNorm * 9.5 + x0 * 3.0;

            const wave1 = Math.sin(phi1) * 0.030 * s * vFactor;
            const wave2 = Math.sin(phi2) * 0.012 * s * Math.pow(vNorm, 1.8);
            const edgeFlutter = Math.cos(phi2 * 1.2) * 0.010 * s * edgeFactor * Math.pow(vNorm, 1.6);
            const spanFolds = Math.cos(x0 * 6.0) * 0.008 * s * vNorm;

            // Idle breathing sway when not in flight
            const idleZ = (1 - s) * Math.sin(waveTime * 2.2 + x0 * 2.0) * 0.018 * Math.pow(vNorm, 2.0);
            const idleX = (1 - s) * Math.cos(waveTime * 1.6) * 0.010 * Math.pow(vNorm, 2.0);

            // Subtle lateral ripple (keeps cape strictly behind legs, never obscuring thighs/boots)
            const flutterX = Math.sin(waveTime * 5.0 + vNorm * 2.5) * 0.010 * s * Math.pow(vNorm, 1.5);

            posArray[idx] = x0 + flutterX + idleX;
            posArray[idx + 1] = y0 + liftY;
            posArray[idx + 2] = (z0 - 0.08 * s) + streamZ + wave1 + wave2 + edgeFlutter + spanFolds + idleZ;
          }

          posAttr.needsUpdate = true;
          capeMeshRef.current.geometry.computeVertexNormals();
        }

        // 4. Hair & Front S-Curl Secondary Response
        if (headMeshRef.current && baseHeadPositionsRef.current) {
          const headPosAttr = headMeshRef.current.geometry.attributes.position;
          const headPosArray = headPosAttr.array;
          const baseHeadArray = baseHeadPositionsRef.current;
          const s = fb;
          const waveTime = clock.getElapsedTime();

          // S-curl vertices (indices 727 to 783)
          for (let i = 727; i < 784; i++) {
            const idx = i * 3;
            const x0 = baseHeadArray[idx];
            const y0 = baseHeadArray[idx + 1];
            const z0 = baseHeadArray[idx + 2];

            const d = THREE.MathUtils.clamp((1.97 - y0) / 0.225, 0, 1);
            const d2 = d * d;

            const curlZ = -s * 0.008 * d2 + Math.sin(waveTime * 14 + d * 3.5) * 0.003 * s * d2;
            const curlX = Math.cos(waveTime * 10) * 0.002 * s * d2;

            headPosArray[idx] = x0 + curlX;
            headPosArray[idx + 1] = y0;
            headPosArray[idx + 2] = z0 + curlZ;
          }

          headPosAttr.needsUpdate = true;
          headMeshRef.current.geometry.computeVertexNormals();
        }

        // Ground shadow tracking
        if (shadowRef.current) {
          shadowRef.current.position.set(0, 0.015, -0.05 * fb + 0.04);
          if (shadowRef.current.material) {
            shadowRef.current.material.opacity = THREE.MathUtils.lerp(0.42, 0.20, fb);
          }
          const scale = 1 + fb * 0.55;
          shadowRef.current.scale.set(scale, scale, 1);
        }
      } else {
        // Reset to exact ground idle coordinates
        if (clonedScene.position.y !== 0) clonedScene.position.set(0, 0, 0);
        if (clonedScene.rotation.x !== 0 || clonedScene.rotation.z !== 0 || clonedScene.rotation.y !== 0) {
          clonedScene.rotation.set(0, 0, 0);
        }
        // Restore cape and head if they were deformed
        if (capeMeshRef.current && baseCapePositionsRef.current) {
          capeMeshRef.current.geometry.attributes.position.array.set(baseCapePositionsRef.current);
          capeMeshRef.current.geometry.attributes.position.needsUpdate = true;
        }
        if (headMeshRef.current && baseHeadPositionsRef.current) {
          headMeshRef.current.geometry.attributes.position.array.set(baseHeadPositionsRef.current);
          headMeshRef.current.geometry.attributes.position.needsUpdate = true;
        }
        if (shadowRef.current) {
          shadowRef.current.position.set(0, 0.015, 0.04);
          if (shadowRef.current.material) shadowRef.current.material.opacity = 0.42;
          shadowRef.current.scale.set(1, 1, 1);
        }
      }
      return;
    }

    if (isMountedBike) {
      // Bike: Natural forward lean over cyber tank; hands gripping handlebar grips at [±0.37, 0.78, -0.12]
      if (clonedScene.position.y !== 0) clonedScene.position.set(0, 0, 0);
      if (clonedScene.rotation.x !== 0 || clonedScene.rotation.z !== 0) clonedScene.rotation.set(0, 0, 0);
      if (spine) {
        spine.rotation.x = 0.16 + (isDriving ? Math.sin(t * 14) * 0.012 : 0);
      }
      if (ual) {
        ual.rotation.set(-0.50, -0.60, -2.15);
      }
      if (uar) {
        uar.rotation.set(-1.08, -0.80, 1.92);
      }
    } else if (isMountedCar) {
      // Sports Car: Reclined in driver cockpit; hands gripping 9 and 3 o'clock steering wheel at [±0.27, 0.85, -0.12]
      if (clonedScene.position.y !== 0) clonedScene.position.set(0, 0, 0);
      if (clonedScene.rotation.x !== 0 || clonedScene.rotation.z !== 0) clonedScene.rotation.set(0, 0, 0);
      if (spine) {
        spine.rotation.x = -0.05 + (isDriving ? Math.sin(t * 10) * 0.008 : 0);
      }
      const steer = isDriving ? Math.sin(t * 2.5) * 0.035 : 0;
      if (ual) {
        ual.rotation.set(-0.70, -0.65, -2.40 + steer);
      }
      if (uar) {
        uar.rotation.set(-0.70, 0.60, 2.25 + steer);
      }
    } else if (isMountedRocket) {
      // Rocket: Synchronize subtle floating hover with rocket mesh for unified flight presentation
      const flySpeed = isDriving ? 3.4 : 2.4;
      clonedScene.position.y = Math.sin(t * flySpeed) * 0.035;
      clonedScene.rotation.z = Math.cos(t * flySpeed * 0.7) * 0.012;
      clonedScene.rotation.x = Math.sin(t * flySpeed * 0.5) * 0.008;

      // Forward aerodynamic flight lean over rocket saddle
      if (spine) {
        spine.rotation.x = 0.22 + (isDriving ? Math.sin(t * 14) * 0.015 : 0);
      }
      // Both hands reach forward and downward gripping dual flight controls at [±0.30, 0.70, -0.12]
      if (ual) {
        ual.rotation.set(-0.55, -0.55, -2.10);
      }
      if (uar) {
        uar.rotation.set(-1.05, -0.75, 1.95);
      }
      // Both thighs spread naturally outward astride the rocket fuselage
      if (ull) {
        ull.rotation.set(1.68, -0.15, -0.52);
      }
      if (ulr) {
        ulr.rotation.set(1.68, 0.15, 0.52);
      }
      // Knees bent naturally with lower legs angled backward along rocket flanks
      if (lll) {
        lll.rotation.set(1.35, 0, -0.15);
      }
      if (llr) {
        llr.rotation.set(1.35, 0, 0.15);
      }
    }
  });

  // Real-time custom color updates:
  // ONLY tints clothing and cape — NEVER alters skin, face, or sword steel!
  useEffect(() => {
    if (!clothingMat || !capeMat) return;
    const clothingColor = characterData?.colors?.baseColor || '#ffffff';
    const capeColor = characterData?.colors?.secondaryColor || '#ffffff';

    clothingMat.color.set(clothingColor);
    capeMat.color.set(capeColor);

    // Guaranteed protection for skin and weapons
    headMat.color.set('#ffffff');
    weaponMat.color.set('#ffffff');
  }, [clothingMat, capeMat, headMat, weaponMat, characterData?.colors?.baseColor, characterData?.colors?.secondaryColor]);

  // Find head and chest bones
  const { headBone, chestBone } = useMemo(() => {
    let head = null;
    let chest = null;
    clonedScene.traverse((child) => {
      if (child.isBone) {
        if (child.name === 'head') head = child;
        if (child.name === 'chest') chest = child;
      }
    });
    return { headBone: head, chestBone: chest };
  }, [clonedScene]);

  const { colors, accessories, vehicle, vehicleUpgrade, isDrivingMode } = characterData;
  const headAccessory = accessories?.headAccessory || 'none';
  const faceAccessory = accessories?.faceAccessory || 'none';
  const upperBodyAccessory = accessories?.upperBodyAccessory || 'none';
  const backAccessory = accessories?.backAccessory || 'none';
  const effectType = accessories?.effectType || 'none';

  return (
    <group position={[0, -1.01, 0]} scale={[1.0, 1.0, 1.0]}>
      {/* 3D GLB Rigged Character */}
      <primitive object={clonedScene} />

      {/* Headwear — attached directly into Head Bone hierarchy */}
      {headBone && (
        <BoneAttachment bone={headBone}>
          {headAccessory === 'crown' && <Crown color={colors.accentColor} accentColor="#f59e0b" />}
          {headAccessory === 'cap' && <BaseballCap color={colors.baseColor} accentColor={colors.accentColor} />}
          {headAccessory === 'spaceHelmet' && <SpaceHelmet color={colors.baseColor} accentColor={colors.accentColor} />}
          {headAccessory === 'headphones' && <Headphones color={colors.accentColor} />}
          {headAccessory === 'halo' && <Halo color={colors.accentColor} />}
          {headAccessory === 'cyberHorns' && <CyberHorns color={colors.accentColor} />}

          {/* Face Accessories */}
          {faceAccessory === 'visor' && <Visor color={colors.visorColor || colors.accentColor} />}
          {faceAccessory === 'goggles' && <Goggles color={colors.accentColor} />}
          {faceAccessory === 'glasses' && <RebelGlasses color={colors.secondaryColor} accentColor={colors.accentColor} />}
          {faceAccessory === 'mask' && <NinjaMask color={colors.secondaryColor} accentColor={colors.accentColor} />}
          {faceAccessory === 'faceplate' && <CyberFaceplate color={colors.secondaryColor} accentColor={colors.accentColor} />}
        </BoneAttachment>
      )}

      {/* Upper Body & Back Accessories — attached directly into Chest Bone hierarchy */}
      {chestBone && (
        <BoneAttachment bone={chestBone}>
          {/* Back Accessories */}
          {backAccessory === 'thrusterPack' && <ThrusterPack color={colors.accentColor} />}
          {backAccessory === 'batteryPack' && <BatteryPack color={colors.accentColor} />}
          {backAccessory === 'energyWings' && <EnergyWings color={colors.accentColor} />}
          {backAccessory === 'katana' && <CrossedKatana color={colors.secondaryColor} accentColor={colors.accentColor} />}
          {backAccessory === 'cape' && <HeroCape color={colors.accentColor} />}

          {/* Upper Body Decals & Armor Plates */}
          {upperBodyAccessory === 'starCore' && <StarCore color={colors.accentColor} />}
          {upperBodyAccessory === 'lightning' && <LightningBolt color={colors.accentColor} />}
          {upperBodyAccessory === 'stripes' && <TorsoStripes color={colors.accentColor} />}
          {upperBodyAccessory === 'armorPlate' && <BoltedArmor color={colors.secondaryColor} accentColor={colors.accentColor} />}
          {upperBodyAccessory === 'vest' && <TacticalVest color={colors.secondaryColor} accentColor={colors.accentColor} />}
        </BoneAttachment>
      )}

      {/* Dynamic Aura / Particle Effect */}
      <ParticleEffect effectType={effectType} glowColor={colors.podiumGlow} />

      {/* 3D Equipped Vehicle & Animated Trail Effects */}
      {vehicle && (
        <VehicleMesh
          vehicle={vehicle}
          upgradeId={vehicleUpgrade}
          isDriving={isDrivingMode}
        />
      )}

      {/* Ground contact shadow disc right above podium surface */}
      <mesh ref={shadowRef} position={[0, 0.015, 0.04]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[vehicle ? 0.95 : 0.55, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.42} />
      </mesh>
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PREMIUM 3-TIER GAMING PODIUM & STAGE
───────────────────────────────────────────────────────────────── */

function Podium({ glowColor }) {
  return (
    <group position={[0, -1.22, 0]}>
      {/* Outer Studio Floor Plate */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.8, 48]} />
        <meshStandardMaterial color="#090e1c" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Lower Platform Tier with Beveled Rim */}
      <mesh receiveShadow position={[0, 0.06, 0]}>
        <cylinderGeometry args={[1.05, 1.15, 0.12, 40]} />
        <meshStandardMaterial color="#0e172a" roughness={0.4} metalness={0.5} />
      </mesh>

      {/* Center Elevated Stage Tier */}
      <mesh receiveShadow position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.82, 0.90, 0.10, 40]} />
        <meshStandardMaterial color="#162038" roughness={0.35} metalness={0.6} />
      </mesh>

      {/* Inner Glowing Neon Inlay Ring */}
      <mesh position={[0, 0.215, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.74, 0.81, 48]} />
        <meshStandardMaterial
          color={glowColor}
          emissive={glowColor}
          emissiveIntensity={1.0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Outer Ambient Accent Halo Ring */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 1.72, 64]} />
        <meshStandardMaterial
          color={glowColor}
          emissive={glowColor}
          emissiveIntensity={0.35}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   CANVAS LOADER
───────────────────────────────────────────────────────────────── */

function CanvasLoader() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#080b14] rounded-xl z-20">
      <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
      <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Loading 3D Studio…</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   STUDIO 3D SCENE WITH 3-POINT GAMING LIGHTING
───────────────────────────────────────────────────────────────── */

function CharacterScene({ characterData, autoRotate, resetTrigger, zoomAction, onReady }) {
  const controlsRef = useRef();

  // Support camera view presets (front, side, rear, threequarter) via URL query
  useEffect(() => {
    if (!controlsRef.current) return;
    const v = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('view') : null;
    if (v === 'side') {
      controlsRef.current.object.position.set(4.2, 0.65, 0);
    } else if (v === 'rear') {
      controlsRef.current.object.position.set(2.4, 0.95, -3.8);
    } else if (v === 'threequarter') {
      controlsRef.current.object.position.set(1.6, 0.85, 3.8);
    }
    controlsRef.current.update();
  }, []);

  // Reset camera view
  useEffect(() => {
    if (resetTrigger > 0 && controlsRef.current) {
      controlsRef.current.reset();
    }
  }, [resetTrigger]);

  // Handle zoom in / out button clicks
  useEffect(() => {
    if (zoomAction?.count > 0 && controlsRef.current) {
      if (zoomAction.delta < 0) {
        controlsRef.current.dollyIn(1.2);
      } else {
        controlsRef.current.dollyOut(1.2);
      }
      controlsRef.current.update();
    }
  }, [zoomAction]);

  // Camera smooth targeting centered on character
  useFrame(({ clock }, delta) => {
    if (!controlsRef.current) return;
    const isFlight = characterData?.id === 'superman' && characterData?.isDrivingMode;
    const targetY = isFlight ? 0.28 : 0.15;
    const targetZ = 0;
    const desiredTarget = new THREE.Vector3(0, targetY, targetZ);
    if (controlsRef.current.target.distanceTo(desiredTarget) > 0.001) {
      controlsRef.current.target.lerp(desiredTarget, Math.min(1, delta * 4.0));
      controlsRef.current.update();
    }
  });

  return (
    <>
      {/* Neutral Ambient Light - pure clean white for accurate texture rendering */}
      <ambientLight intensity={0.85} color="#ffffff" />

      {/* Primary Key Sunlight with Soft Shadows */}
      <directionalLight
        position={[4, 9, 6]}
        intensity={1.5}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={25}
        shadow-camera-left={-3.5}
        shadow-camera-right={3.5}
        shadow-camera-top={3.5}
        shadow-camera-bottom={-3.5}
        shadow-bias={-0.0005}
      />

      {/* Clean Neutral Rim Backlight for silhouette separation without color cast */}
      <directionalLight position={[-4, 4, -4]} intensity={0.4} color="#e2e8f0" />

      {/* Soft Neutral Fill Light to preserve shadow clarity */}
      <directionalLight position={[3, 2, -3]} intensity={0.45} color="#f8fafc" />

      {/* Neutral Overhead Studio Key */}
      <pointLight position={[0, 3.2, 2.8]} intensity={0.4} color="#ffffff" distance={10} />

      {/* GLB Character Model */}
      <GLBCharacter key={characterData.id} characterData={characterData} onReady={onReady} />

      {/* Stage Podium */}
      <Podium glowColor={characterData.colors.podiumGlow} />

      {/* Orbit Controls with 360 degree rotation and zoom */}
      <OrbitControls
        ref={controlsRef}
        autoRotate={autoRotate}
        autoRotateSpeed={1.8}
        enablePan={false}
        enableDamping
        dampingFactor={0.07}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.58}
        minDistance={2.0}
        maxDistance={6.0}
        target={[0, 0.15, 0]}
      />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PUBLIC COMPONENT
───────────────────────────────────────────────────────────────── */

// Preload both GLB models without WebAssembly Draco/Meshopt decoders for strict CSP compatibility
useGLTF.preload(`${import.meta.env.BASE_URL}models/Knight.glb`, false, false);
useGLTF.preload(`${import.meta.env.BASE_URL}models/Rogue.glb`, false, false);

/* ─────────────────────────────────────────────────────────────────
   MODEL ERROR BOUNDARY
───────────────────────────────────────────────────────────────── */
class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    console.error('CharacterViewer model loading error:', error);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.characterId !== this.props.characterId && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm border border-red-200 rounded-2xl p-6 text-center z-20">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-500 mb-3 shadow-xs">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3 className="text-base font-black text-[#261b35]">Unable to load {this.props.characterName || 'character'} model</h3>
          <p className="text-xs text-[#766c83] max-w-sm mt-1 leading-relaxed">
            {this.state.error?.message || 'The 3D model asset could not be loaded.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-[#7544ae] to-[#542b82] text-white rounded-xl text-xs font-bold shadow-md hover:brightness-105 active:scale-95 transition-all"
          >
            Retry Loading
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function CharacterViewer({ characterData, autoRotate, resetTrigger, onReady = null }) {
  const { zoomAction } = useStudio();

  const viewParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('view') : null;
  const initialCamPos = useMemo(() => {
    if (viewParam === 'side') return [4.6, 0.28, 0];
    if (viewParam === 'rear') return [2.5, 0.75, -4.2];
    if (viewParam === 'threequarter') return [2.2, 0.75, 4.0];
    return [0, 0.65, 4.4];
  }, [viewParam]);

  if (!characterData) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#080b14] rounded-xl">
        <p className="text-slate-500 text-sm">No character selected</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <ModelErrorBoundary characterId={characterData.id} characterName={characterData.name}>
        <Suspense fallback={<CanvasLoader />}>
          <Canvas
            shadows={{ type: THREE.PCFSoftShadowMap }}
            camera={{ position: initialCamPos, fov: 40 }}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance',
            }}
            style={{ background: 'transparent' }}
          >
            <CharacterScene
              characterData={characterData}
              autoRotate={autoRotate}
              resetTrigger={resetTrigger}
              zoomAction={zoomAction}
              onReady={onReady}
            />
          </Canvas>
        </Suspense>
      </ModelErrorBoundary>
    </div>
  );
}
