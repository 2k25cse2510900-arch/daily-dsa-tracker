import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ─────────────────────────────────────────────────────────────────
   ANIMATED PARTICLES & TRAIL EFFECTS
───────────────────────────────────────────────────────────────── */

/** 1. Subtle Dust Trail (Basic Bike default) */
function DustTrail({ isDriving }) {
  const count = 10;
  const meshRefs = useRef([]);

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: (Math.random() - 0.5) * 0.12,
      y: 0.08 + Math.random() * 0.10,
      z: -0.88 - i * 0.18,
      baseZ: -0.88,
      speed: 0.8 + Math.random() * 0.6,
      scale: 0.06 + Math.random() * 0.07,
      age: (i / count) * 1.0,
    }));
  }, []);

  useFrame((_, delta) => {
    particles.forEach((p, i) => {
      p.age += delta * (isDriving ? 2.6 : 0.8);
      if (p.age > 1.0) p.age = 0;

      const mesh = meshRefs.current[i];
      if (mesh) {
        mesh.position.z = p.baseZ - p.age * 1.6;
        mesh.position.y = p.y + p.age * 0.16;
        mesh.position.x = p.x + Math.sin(p.age * 4) * 0.08;
        const currentScale = p.scale * (1.0 + p.age * 2.2);
        mesh.scale.set(currentScale, currentScale, currentScale);
        if (mesh.material) {
          mesh.material.opacity = (1.0 - p.age) * (isDriving ? 0.65 : 0.25);
        }
      }
    });
  });

  return (
    <group>
      {particles.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => (meshRefs.current[i] = el)}
          position={[0, 0.08, -0.88]}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial
            color="#cbd5e1"
            transparent
            opacity={0.4}
            roughness={0.9}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** 2. High-Voltage Plasma Sparks Trail (Basic Bike upgrade) */
function SparksTrail({ isDriving }) {
  const count = 16;
  const meshRefs = useRef([]);

  const sparks = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      rx: (Math.random() - 0.5) * 0.35,
      ry: (Math.random() - 0.5) * 0.2,
      speed: 2.2 + Math.random() * 2.0,
      scale: 0.03 + Math.random() * 0.04,
      age: (i / count) * 1.0,
    }));
  }, []);

  useFrame((_, delta) => {
    sparks.forEach((s, i) => {
      s.age += delta * (isDriving ? 3.6 : 1.2);
      if (s.age > 1.0) s.age = 0;

      const mesh = meshRefs.current[i];
      if (mesh) {
        mesh.position.z = -0.88 - s.age * 2.0;
        mesh.position.y = 0.08 + Math.sin(s.age * 12 + i) * 0.14;
        mesh.position.x = s.rx * s.age * 1.8;
        const currentScale = s.scale * (1.0 - s.age * 0.5);
        mesh.scale.set(currentScale, currentScale, currentScale);
        if (mesh.material) {
          mesh.material.opacity = (1.0 - s.age) * 0.95;
        }
      }
    });
  });

  return (
    <group>
      {sparks.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => (meshRefs.current[i] = el)}
          position={[0, 0.08, -0.88]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#00f0ff"
            emissiveIntensity={2.5}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

/** 3. Tire Friction Smoke (Sports Car default) */
function TireSmokeTrail({ isDriving }) {
  const count = 12;
  const meshRefs = useRef([]);

  const smoke = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      side: i % 2 === 0 ? -0.52 : 0.52,
      drift: (Math.random() - 0.5) * 0.1,
      scale: 0.07 + Math.random() * 0.06,
      age: (i / count) * 1.0,
    }));
  }, []);

  useFrame((_, delta) => {
    smoke.forEach((s, i) => {
      s.age += delta * (isDriving ? 2.8 : 0.9);
      if (s.age > 1.0) s.age = 0;

      const mesh = meshRefs.current[i];
      if (mesh) {
        mesh.position.x = s.side + s.drift * s.age * 2.0;
        mesh.position.y = 0.10 + s.age * 0.22;
        mesh.position.z = -1.22 - s.age * 1.8;
        const currentScale = s.scale * (1.0 + s.age * 2.5);
        mesh.scale.set(currentScale, currentScale, currentScale);
        if (mesh.material) {
          mesh.material.opacity = (1.0 - s.age) * (isDriving ? 0.6 : 0.2);
        }
      }
    });
  });

  return (
    <group>
      {smoke.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => (meshRefs.current[i] = el)}
          position={[0, 0.10, -1.22]}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial
            color="#94a3b8"
            transparent
            opacity={0.4}
            roughness={0.9}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** 4. Spinning Astral Coin Trail (Sports Car upgrade) */
function CoinTrail({ isDriving }) {
  const count = 10;
  const coinRefs = useRef([]);

  const coins = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      side: (i % 2 === 0 ? -1 : 1) * 0.25,
      rotSpeed: 3 + Math.random() * 3,
      age: (i / count) * 1.0,
      scale: 0.11,
    }));
  }, []);

  useFrame((_, delta) => {
    coins.forEach((c, i) => {
      c.age += delta * (isDriving ? 2.5 : 1.0);
      if (c.age > 1.0) c.age = 0;

      const mesh = coinRefs.current[i];
      if (mesh) {
        mesh.position.x = c.side + Math.sin(c.age * 6) * 0.12;
        mesh.position.y = 0.28 + c.age * 0.65;
        mesh.position.z = -1.25 - c.age * 2.1;
        mesh.rotation.y += delta * c.rotSpeed;
        mesh.rotation.x += delta * 1.5;
        const s = c.scale * (1.0 - c.age * 0.3);
        mesh.scale.set(s, s, s);
        if (mesh.material) {
          mesh.material.opacity = (1.0 - c.age * 0.8);
        }
      }
    });
  });

  return (
    <group>
      {coins.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => (coinRefs.current[i] = el)}
          position={[0, 0.28, -1.25]}
        >
          <cylinderGeometry args={[1, 1, 0.22, 16]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#d97706"
            emissiveIntensity={1.2}
            metalness={0.8}
            roughness={0.2}
            transparent
          />
        </mesh>
      ))}
    </group>
  );
}

/** 5. Roaring Cosmic Fire Exhaust (Rocket default — legendary multi-layer flame) */
function FireExhaustTrail({ isDriving }) {
  const outerRef = useRef();
  const coreRef = useRef();
  const innerRef = useRef();
  const hotRef = useRef();
  const burstRefs = useRef([]);
  const emberRefs = useRef([]);

  const bursts = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      rx: (Math.random() - 0.5) * 0.22,
      ry: (Math.random() - 0.5) * 0.18,
      scale: 0.06 + Math.random() * 0.06,
      age: (i / 12) * 1.0,
      speed: 2.8 + Math.random() * 1.5,
    }));
  }, []);

  const embers = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => ({
      rx: (Math.random() - 0.5) * 0.30,
      ry: (Math.random() - 0.5) * 0.25,
      scale: 0.015 + Math.random() * 0.02,
      age: (i / 10) * 1.0,
      speed: 3.5 + Math.random() * 2.0,
    }));
  }, []);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime() * 16;
    const pulse = 1.0 + Math.sin(t) * 0.18;
    const pulse2 = 1.0 + Math.cos(t * 1.3) * 0.14;
    const driveMul = isDriving ? 1.8 : 1.0;
    const driveLenMul = isDriving ? 1.6 : 1.0;

    // Outer violet-cyan energy flame shroud
    if (outerRef.current) {
      outerRef.current.scale.set(0.38 * pulse, 0.38 * pulse, (1.2 + Math.sin(t * 0.8) * 0.3) * driveLenMul);
      if (outerRef.current.material) {
        outerRef.current.material.opacity = 0.35 + Math.sin(t * 1.4) * 0.08;
      }
    }
    // Main orange-crimson fire body
    if (coreRef.current) {
      coreRef.current.scale.set(0.28 * pulse2, 0.28 * pulse2, (0.95 + Math.cos(t * 1.1) * 0.22) * driveLenMul);
    }
    // Bright yellow inner flame
    if (innerRef.current) {
      innerRef.current.scale.set(0.18 * pulse, 0.18 * pulse, (0.75 + Math.sin(t * 1.5) * 0.18) * driveLenMul);
    }
    // White-hot center core
    if (hotRef.current) {
      hotRef.current.scale.set(0.10 * pulse2, 0.10 * pulse2, (0.50 + Math.cos(t * 1.8) * 0.12) * driveLenMul);
    }

    bursts.forEach((b, i) => {
      b.age += delta * b.speed * driveMul;
      if (b.age > 1.0) b.age = 0;
      const m = burstRefs.current[i];
      if (m) {
        m.position.z = -1.50 - b.age * (isDriving ? 2.5 : 1.4);
        m.position.x = b.rx * b.age * 1.5;
        m.position.y = 0.20 + b.ry * b.age * 1.2;
        const s = b.scale * (1.0 + b.age * 2.5);
        m.scale.set(s, s, s);
        if (m.material) m.material.opacity = (1.0 - b.age) * 0.80;
      }
    });

    embers.forEach((e, i) => {
      e.age += delta * e.speed * driveMul;
      if (e.age > 1.0) e.age = 0;
      const m = emberRefs.current[i];
      if (m) {
        m.position.z = -1.60 - e.age * (isDriving ? 3.5 : 2.0);
        m.position.x = e.rx * e.age * 2.0;
        m.position.y = 0.20 + e.ry * e.age * 1.8;
        const s = e.scale * (1.0 - e.age * 0.3);
        m.scale.set(s, s, s);
        if (m.material) m.material.opacity = (1.0 - e.age) * 0.95;
      }
    });
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Outermost cosmic violet energy flame shroud */}
      <mesh ref={outerRef} position={[0, 0.20, -1.40]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[1, 1, 20, 1, true]} />
        <meshStandardMaterial
          color="#7c3aed"
          emissive="#6d28d9"
          emissiveIntensity={2.0}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Main roaring orange fire body */}
      <mesh ref={coreRef} position={[0, 0.20, -1.38]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[1, 1, 18, 1, true]} />
        <meshStandardMaterial
          color="#f97316"
          emissive="#ef4444"
          emissiveIntensity={2.8}
          transparent
          opacity={0.82}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Bright yellow inner flame */}
      <mesh ref={innerRef} position={[0, 0.20, -1.36]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[1, 1, 16, 1, true]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#fef08a"
          emissiveIntensity={3.5}
          transparent
          opacity={0.88}
        />
      </mesh>
      {/* White-hot center core */}
      <mesh ref={hotRef} position={[0, 0.20, -1.35]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[1, 1, 14, 1, true]} />
        <meshStandardMaterial
          color="#fef9c3"
          emissive="#ffffff"
          emissiveIntensity={4.5}
          transparent
          opacity={0.92}
        />
      </mesh>
      {/* Billowing flame burst particles */}
      {bursts.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => (burstRefs.current[i] = el)}
          position={[0, 0.20, -1.50]}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial
            color="#f97316"
            emissive="#ef4444"
            emissiveIntensity={2.0}
            transparent
            opacity={0.70}
            depthWrite={false}
          />
        </mesh>
      ))}
      {/* Hot ember sparks */}
      {embers.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => (emberRefs.current[i] = el)}
          position={[0, 0.20, -1.60]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#f59e0b"
            emissiveIntensity={2.5}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
    </group>
  );
}

/** 6. Hyper-Drive Ultra Boost Warp Flame & Cosmic Shock Rings (Rocket upgrade) */
function UltraBoostTrail({ isDriving }) {
  const outerBeamRef = useRef();
  const beamRef = useRef();
  const coreBeamRef = useRef();
  const ringRefs = useRef([]);
  const sparkRefs = useRef([]);

  const rings = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => ({
      age: (i / 7) * 1.0,
      scale: 0.24,
    }));
  }, []);

  const sparks = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => ({
      rx: (Math.random() - 0.5) * 0.40,
      ry: (Math.random() - 0.5) * 0.30,
      speed: 4.0 + Math.random() * 2.5,
      scale: 0.02 + Math.random() * 0.025,
      age: (i / 14) * 1.0,
    }));
  }, []);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime() * 22;
    const pulse = 1.0 + Math.sin(t) * 0.22;
    const pulse2 = 1.0 + Math.cos(t * 1.2) * 0.18;
    const driveMul = isDriving ? 2.2 : 1.2;
    const driveLenMul = isDriving ? 2.0 : 1.2;

    // Outer cosmic violet hyper-drive envelope
    if (outerBeamRef.current) {
      outerBeamRef.current.scale.set(0.42 * pulse, 0.42 * pulse, (1.5 + Math.sin(t * 0.9) * 0.4) * driveLenMul);
      if (outerBeamRef.current.material) {
        outerBeamRef.current.material.opacity = 0.40 + Math.sin(t * 1.5) * 0.10;
      }
    }
    // High-energy cyan warp plasma beam
    if (beamRef.current) {
      beamRef.current.scale.set(0.30 * pulse2, 0.30 * pulse2, (1.3 + Math.cos(t * 1.3) * 0.35) * driveLenMul);
    }
    // Pure white-hot supersonic energy needle
    if (coreBeamRef.current) {
      coreBeamRef.current.scale.set(0.15 * pulse, 0.15 * pulse, (0.90 + Math.sin(t * 1.7) * 0.25) * driveLenMul);
    }

    // Supersonic shock diamond rings travelling backward
    rings.forEach((r, i) => {
      r.age += delta * (isDriving ? 5.0 : 2.2);
      if (r.age > 1.0) r.age = 0;
      const m = ringRefs.current[i];
      if (m) {
        m.position.z = -1.45 - r.age * (isDriving ? 3.5 : 2.0);
        const s = r.scale * (1.0 + r.age * 4.0);
        m.scale.set(s, s, s);
        if (m.material) m.material.opacity = (1.0 - r.age) * 0.90;
      }
    });

    // Cosmic energy plasma streaks
    sparks.forEach((s, i) => {
      s.age += delta * s.speed * (isDriving ? 1.5 : 0.8);
      if (s.age > 1.0) s.age = 0;
      const m = sparkRefs.current[i];
      if (m) {
        m.position.z = -1.55 - s.age * (isDriving ? 4.0 : 2.5);
        m.position.x = s.rx * s.age * 2.2;
        m.position.y = 0.20 + s.ry * s.age * 1.8;
        const sc = s.scale * (1.0 - s.age * 0.4);
        m.scale.set(sc, sc, sc);
        if (m.material) m.material.opacity = (1.0 - s.age) * 0.92;
      }
    });
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Outer violet hyper-drive sheath */}
      <mesh ref={outerBeamRef} position={[0, 0.20, -1.42]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[1, 1, 24, 1, true]} />
        <meshStandardMaterial
          color="#7c3aed"
          emissive="#a855f7"
          emissiveIntensity={3.0}
          transparent
          opacity={0.40}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Cyan hyper-plasma beam */}
      <mesh ref={beamRef} position={[0, 0.20, -1.39]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[1, 1, 22, 1, true]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#06b6d4"
          emissiveIntensity={3.5}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* White-hot warp needle core */}
      <mesh ref={coreBeamRef} position={[0, 0.20, -1.36]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[1, 1, 18, 1, true]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={5.0}
          transparent
          opacity={0.92}
        />
      </mesh>
      {/* Supersonic shock diamond rings */}
      {rings.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => (ringRefs.current[i] = el)}
          position={[0, 0.20, -1.45]}
        >
          <torusGeometry args={[1, 0.10, 12, 32]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#00f0ff"
            emissiveIntensity={3.5}
            transparent
            opacity={0.85}
            depthWrite={false}
          />
        </mesh>
      ))}
      {/* Cosmic plasma sparks */}
      {sparks.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => (sparkRefs.current[i] = el)}
          position={[0, 0.20, -1.55]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#c084fc"
            emissive="#a855f7"
            emissiveIntensity={3.0}
            transparent
            opacity={0.90}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   1. NINJA SUPERBIKE 3D MODEL (Kawasaki H2-Inspired Premium Superbike)
   - Color Scheme: Vivid metallic emerald green body (#10b981), exposed green
     trellis frame, dark slate carbon accents (#0f172a / #1e293b), silver
     mechanical components (#cbd5e1), and contrasting bright diamond-cut rims (#f8fafc).
   - Tuned PBR materials: metalness 0.28, roughness 0.24 ensuring bright, saturated
     color visibility under ambient and directional lighting without dark washout.
   - Proportional scale increase: lengthened wheelbase (1.80m, z: 0.84 to -0.96),
     enlarged front (r: 0.32) and rear (r: 0.34) sport tires, wide front fairing
     with twin aerodynamic downforce winglets, belly pan fairing, upswept titanium exhaust.
   - Strict Rider Seating Alignment (100% preserved):
     * Saddle: [0, 0.44, -0.40]
     * Handlebar Grips: [±0.37, 0.78, -0.12]
     * Footpegs: [±0.20, 0.38, -0.12]
   - Forward Wheel Rotation: Wheels and spokes roll naturally forward around the X axle.
───────────────────────────────────────────────────────────────── */
function CyberBikeMesh({ isDriving, isSparksUpgraded }) {
  const frontWheelRef = useRef();
  const rearWheelRef = useRef();
  const bikeRef = useRef();

  useFrame((_, delta) => {
    const rotSpeed = isDriving ? 16 : 2;
    // Wheels roll naturally forward around their X axle (perpendicular to wheel face)
    if (frontWheelRef.current) frontWheelRef.current.rotation.x += delta * rotSpeed;
    if (rearWheelRef.current) rearWheelRef.current.rotation.x += delta * rotSpeed;
    if (bikeRef.current && isDriving) {
      bikeRef.current.position.y = Math.sin(Date.now() * 0.014) * 0.008;
    }
  });

  // Premium automotive emerald green & sport accents (tuned for vivid lighting)
  const fairingPrimary = '#10b981';    // Vivid emerald green (highly saturated)
  const fairingAccent = '#059669';     // Deep forest emerald
  const fairingGlow = '#34d399';       // Neon mint highlight
  const carbonDark = '#0f172a';        // Deep dark slate/carbon
  const carbonAccent = '#1e293b';      // Subtle textured carbon
  const silverAlloy = '#cbd5e1';       // Bright mechanical silver
  const chromeMetal = '#f1f5f9';       // Polished chrome
  const goldForks = '#eab308';         // Anodized Brembo gold
  const brakeRed = '#ef4444';          // Racing caliper red
  const brightRims = '#f8fafc';        // Diamond-cut bright silver/white rims

  return (
    <group ref={bikeRef} position={[0, 0, 0]}>
      {/* ── AERODYNAMIC UPPER FAIRINGS & NOSE CONE ── */}
      <group>
        {/* Main upper fairing shell — sharp angular nose tapering forward */}
        <mesh position={[0, 0.54, 0.16]} rotation={[-0.28, 0, 0]}>
          <boxGeometry args={[0.34, 0.24, 0.72]} />
          <meshStandardMaterial color={fairingPrimary} metalness={0.28} roughness={0.24} />
        </mesh>

        {/* Sculpted aerodynamic side fairings */}
        {[-1, 1].map((side, i) => (
          <mesh key={i} position={[side * 0.19, 0.48, 0.04]} rotation={[-0.18, side * 0.10, 0]}>
            <boxGeometry args={[0.07, 0.22, 0.68]} />
            <meshStandardMaterial color={fairingPrimary} metalness={0.28} roughness={0.24} />
          </mesh>
        ))}

        {/* Aerodynamic Downforce Winglets (Kawasaki H2 / MotoGP signature) */}
        {[-1, 1].map((side, i) => (
          <group key={i} position={[side * 0.22, 0.54, 0.32]}>
            <mesh rotation={[0, side * -0.15, side * 0.10]}>
              <boxGeometry args={[0.16, 0.022, 0.18]} />
              <meshStandardMaterial color={carbonDark} metalness={0.5} roughness={0.3} />
            </mesh>
            {/* Winglet neon edge stripe */}
            <mesh position={[side * 0.08, 0, 0]}>
              <boxGeometry args={[0.015, 0.024, 0.17]} />
              <meshStandardMaterial color={fairingGlow} emissive={fairingGlow} emissiveIntensity={1.8} />
            </mesh>
          </group>
        ))}

        {/* Contrasting metallic center fairing stripe */}
        <mesh position={[0, 0.61, 0.12]} rotation={[-0.28, 0, 0]}>
          <boxGeometry args={[0.08, 0.02, 0.62]} />
          <meshStandardMaterial color={silverAlloy} metalness={0.65} roughness={0.2} />
        </mesh>

        {/* Neon accent line flanking the fairing */}
        {[-0.14, 0.14].map((x, i) => (
          <mesh key={i} position={[x, 0.57, 0.12]} rotation={[-0.28, 0, 0]}>
            <boxGeometry args={[0.015, 0.012, 0.55]} />
            <meshStandardMaterial color={fairingGlow} emissive={fairingGlow} emissiveIntensity={2.0} />
          </mesh>
        ))}

        {/* Aggressive LED Headlight assembly */}
        <group position={[0, 0.54, 0.52]}>
          {/* Main projector beam */}
          <mesh>
            <boxGeometry args={[0.20, 0.07, 0.06]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={3.2} />
          </mesh>
          {/* Mint DRL eyebrows */}
          {[-0.13, 0.13].map((x, i) => (
            <mesh key={i} position={[x, -0.04, 0]}>
              <boxGeometry args={[0.05, 0.018, 0.05]} />
              <meshStandardMaterial color={fairingGlow} emissive={fairingGlow} emissiveIntensity={2.4} />
            </mesh>
          ))}
        </group>

        {/* Tinted aerodynamic windscreen */}
        <mesh position={[0, 0.70, 0.28]} rotation={[-0.68, 0, 0]}>
          <boxGeometry args={[0.28, 0.25, 0.016]} />
          <meshPhysicalMaterial
            color="#0f172a"
            transparent
            opacity={0.50}
            roughness={0.06}
            metalness={0.15}
            transmission={0.6}
          />
        </mesh>
      </group>

      {/* ── SCULPTED FUEL TANK (Ergonomic knees clearance) ── */}
      <group position={[0, 0.52, -0.16]}>
        <mesh rotation={[-0.14, 0, 0]}>
          <boxGeometry args={[0.30, 0.17, 0.42]} />
          <meshStandardMaterial color={fairingPrimary} metalness={0.28} roughness={0.24} />
        </mesh>
        {/* Tank side knee cutouts (carbon fiber) */}
        {[-0.16, 0.16].map((x, i) => (
          <mesh key={i} position={[x, -0.02, 0]} rotation={[-0.14, 0, 0]}>
            <boxGeometry args={[0.04, 0.13, 0.32]} />
            <meshStandardMaterial color={carbonDark} metalness={0.6} roughness={0.35} />
          </mesh>
        ))}
        {/* Polished fuel filler cap */}
        <mesh position={[0, 0.09, 0.09]}>
          <cylinderGeometry args={[0.035, 0.035, 0.02, 14]} />
          <meshStandardMaterial color={silverAlloy} metalness={0.8} roughness={0.15} />
        </mesh>
      </group>

      {/* ── SADDLE SEAT & TAIL SECTION (Hips at [0, 0.48, -0.40]) ── */}
      <group position={[0, 0.44, -0.40]}>
        {/* Sport contoured seat cushion */}
        <mesh>
          <boxGeometry args={[0.26, 0.07, 0.42]} />
          <meshStandardMaterial color={carbonDark} roughness={0.7} metalness={0.15} />
        </mesh>
        {/* Neon seat stitching accent */}
        <mesh position={[0, 0.038, 0]}>
          <boxGeometry args={[0.022, 0.006, 0.36]} />
          <meshStandardMaterial color={fairingGlow} emissive={fairingGlow} emissiveIntensity={1.0} />
        </mesh>
        {/* Aerodynamic pillion tail cowl (emerald green) */}
        <mesh position={[0, 0.03, -0.28]} rotation={[0.24, 0, 0]}>
          <boxGeometry args={[0.24, 0.13, 0.22]} />
          <meshStandardMaterial color={fairingPrimary} metalness={0.28} roughness={0.24} />
        </mesh>
        {/* Integrated dual LED tail light */}
        <mesh position={[0, 0.01, -0.40]}>
          <boxGeometry args={[0.18, 0.035, 0.02]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3.0} />
        </mesh>
      </group>

      {/* ── FOOTPEGS: Rider feet rest at [±0.18, 0.40, -0.12] ── */}
      <group position={[0, 0.38, -0.12]}>
        {/* Billet aluminum rearset brackets */}
        {[-0.14, 0.14].map((x, i) => (
          <mesh key={i} position={[x, -0.04, 0]}>
            <boxGeometry args={[0.035, 0.09, 0.07]} />
            <meshStandardMaterial color={silverAlloy} metalness={0.75} roughness={0.2} />
          </mesh>
        ))}
        {/* Left footpeg */}
        <mesh position={[0.20, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.032, 0.032, 0.15, 12]} />
          <meshStandardMaterial color={carbonAccent} metalness={0.65} roughness={0.35} />
        </mesh>
        {/* Right footpeg */}
        <mesh position={[-0.20, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.032, 0.032, 0.15, 12]} />
          <meshStandardMaterial color={carbonAccent} metalness={0.65} roughness={0.35} />
        </mesh>
        {/* Knurled grip accent rings */}
        {[-0.20, 0.20].map((x, i) => (
          <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.032, 0.005, 6, 12]} />
            <meshStandardMaterial color={silverAlloy} metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
      </group>

      {/* ── TRELLIS CHASSIS & POWERTRAIN ── */}
      <group>
        {/* Main trellis frame backbone in iconic Kawasaki emerald green */}
        <mesh position={[0, 0.36, -0.08]} rotation={[0.18, 0, 0]}>
          <boxGeometry args={[0.14, 0.11, 1.25]} />
          <meshStandardMaterial color={fairingAccent} metalness={0.4} roughness={0.3} />
        </mesh>

        {/* Visible side trellis tubular lattice (emerald green) */}
        {[-0.08, 0.08].map((x, i) => (
          <group key={i} position={[x, 0.34, -0.08]}>
            <mesh rotation={[0.18, 0, 0]}>
              <cylinderGeometry args={[0.018, 0.018, 1.10, 8]} />
              <meshStandardMaterial color={fairingPrimary} metalness={0.35} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0.06, 0.15]} rotation={[-0.4, 0, 0]}>
              <cylinderGeometry args={[0.016, 0.016, 0.35, 8]} />
              <meshStandardMaterial color={fairingPrimary} metalness={0.35} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0.06, -0.15]} rotation={[0.4, 0, 0]}>
              <cylinderGeometry args={[0.016, 0.016, 0.35, 8]} />
              <meshStandardMaterial color={fairingPrimary} metalness={0.35} roughness={0.25} />
            </mesh>
          </group>
        ))}

        {/* Supercharged inline engine block (detailed mechanicals) */}
        <mesh position={[0, 0.26, -0.14]}>
          <boxGeometry args={[0.26, 0.24, 0.44]} />
          <meshStandardMaterial color={carbonDark} metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Billet silver cylinder head covers */}
        <mesh position={[0, 0.38, -0.14]}>
          <boxGeometry args={[0.24, 0.04, 0.38]} />
          <meshStandardMaterial color={silverAlloy} metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Cooling fins */}
        {[-0.10, -0.04, 0.02, 0.08].map((z, i) => (
          <mesh key={i} position={[0, 0.28, -0.14 + z]}>
            <boxGeometry args={[0.28, 0.016, 0.03]} />
            <meshStandardMaterial color={silverAlloy} metalness={0.85} roughness={0.15} />
          </mesh>
        ))}

        {/* Lower belly-pan fairing (emerald green + carbon) */}
        <mesh position={[0, 0.16, 0.04]} rotation={[-0.08, 0, 0]}>
          <boxGeometry args={[0.28, 0.12, 0.76]} />
          <meshStandardMaterial color={fairingPrimary} metalness={0.28} roughness={0.24} />
        </mesh>
        <mesh position={[0, 0.10, 0.04]}>
          <boxGeometry args={[0.29, 0.02, 0.74]} />
          <meshStandardMaterial color={carbonDark} metalness={0.5} roughness={0.4} />
        </mesh>

        {/* Titanium exhaust headers & upswept sport silencer */}
        {[-0.08, 0.08].map((x, i) => (
          <mesh key={i} position={[x, 0.16, -0.38]} rotation={[0.32, 0, 0]}>
            <cylinderGeometry args={[0.028, 0.038, 0.48, 10]} />
            <meshStandardMaterial color={silverAlloy} metalness={0.85} roughness={0.15} />
          </mesh>
        ))}
        {/* Upswept titanium sport muffler on right side */}
        <group position={[0.15, 0.22, -0.72]} rotation={[-0.18, 0.12, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.048, 0.040, 0.32, 14]} />
            <meshStandardMaterial color={silverAlloy} metalness={0.85} roughness={0.18} />
          </mesh>
          {/* Carbon fiber heat shield band */}
          <mesh position={[0, 0.04, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.051, 0.051, 0.10, 14]} />
            <meshStandardMaterial color={carbonDark} metalness={0.6} roughness={0.4} />
          </mesh>
          {/* Angled exhaust tip with afterburner accent */}
          <mesh position={[0, 0, -0.17]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.042, 0.042, 0.03, 14]} />
            <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.8} />
          </mesh>
        </group>
      </group>

      {/* ── CLIP-ON HANDLEBARS: Rider hands align at [±0.37, 0.78, -0.12] ── */}
      <group>
        {/* Billet top triple clamp */}
        <mesh position={[0, 0.72, 0.02]}>
          <boxGeometry args={[0.32, 0.038, 0.11]} />
          <meshStandardMaterial color={carbonDark} metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Crossbar tube */}
        <mesh position={[0, 0.78, -0.12]}>
          <boxGeometry args={[0.74, 0.032, 0.035]} />
          <meshStandardMaterial color={carbonAccent} metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Digital TFT instrument gauge display */}
        <mesh position={[0, 0.81, -0.05]} rotation={[-0.52, 0, 0]}>
          <boxGeometry args={[0.16, 0.006, 0.11]} />
          <meshStandardMaterial color="#0b0f19" roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.812, -0.05]} rotation={[-0.52, 0, 0]}>
          <boxGeometry args={[0.14, 0.003, 0.09]} />
          <meshStandardMaterial color={fairingGlow} emissive={fairingGlow} emissiveIntensity={2.2} />
        </mesh>

        {/* Left Sport Grip at [0.37, 0.78, -0.12] */}
        <mesh position={[0.37, 0.78, -0.12]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.034, 0.034, 0.14, 16]} />
          <meshStandardMaterial color={fairingPrimary} roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0.445, 0.78, -0.12]}>
          <sphereGeometry args={[0.034, 10, 10]} />
          <meshStandardMaterial color={silverAlloy} metalness={0.85} roughness={0.15} />
        </mesh>

        {/* Right Sport Grip at [-0.37, 0.78, -0.12] */}
        <mesh position={[-0.37, 0.78, -0.12]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.034, 0.034, 0.14, 16]} />
          <meshStandardMaterial color={fairingPrimary} roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[-0.445, 0.78, -0.12]}>
          <sphereGeometry args={[0.034, 10, 10]} />
          <meshStandardMaterial color={silverAlloy} metalness={0.85} roughness={0.15} />
        </mesh>
      </group>

      {/* ── FRONT SUSPENSION & FRONT WHEEL (Axle at z = 0.84) ── */}
      <group>
        {/* Inverted USD (Upside Down) fork tubes — Gold Brembo anodized */}
        {[-0.10, 0.10].map((x, i) => (
          <mesh key={i} position={[x, 0.52, 0.48]} rotation={[-0.40, 0, 0]}>
            <cylinderGeometry args={[0.030, 0.030, 0.72, 14]} />
            <meshStandardMaterial color={goldForks} metalness={0.85} roughness={0.18} />
          </mesh>
        ))}
        {/* Polished lower stanchions */}
        {[-0.10, 0.10].map((x, i) => (
          <mesh key={i} position={[x, 0.32, 0.68]} rotation={[-0.40, 0, 0]}>
            <cylinderGeometry args={[0.024, 0.024, 0.38, 14]} />
            <meshStandardMaterial color={chromeMetal} metalness={0.9} roughness={0.08} />
          </mesh>
        ))}
        {/* Front aerodynamic tire hugger / fender */}
        <mesh position={[0, 0.44, 0.74]} rotation={[-0.30, 0, 0]}>
          <boxGeometry args={[0.20, 0.018, 0.44]} />
          <meshStandardMaterial color={fairingPrimary} metalness={0.28} roughness={0.24} />
        </mesh>
        {/* Brembo radial brake caliper (racing red) */}
        <mesh position={[0.13, 0.30, 0.80]}>
          <boxGeometry args={[0.038, 0.07, 0.07]} />
          <meshStandardMaterial color={brakeRed} metalness={0.6} roughness={0.3} />
        </mesh>

        {/* FRONT WHEEL ASSEMBLY (Axle: z = 0.84, radius: 0.32) */}
        <group ref={frontWheelRef} position={[0, 0.32, 0.84]}>
          {/* Performance sport tire (thick, grippy compound) */}
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.25, 0.075, 16, 32]} />
            <meshStandardMaterial color="#111827" roughness={0.88} />
          </mesh>

          {/* Diamond-cut bright silver contrasting rim ring */}
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.18, 0.016, 8, 28]} />
            <meshStandardMaterial color={brightRims} metalness={0.35} roughness={0.2} />
          </mesh>

          {/* Emerald green rim-tape accent stripe */}
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.184, 0.005, 6, 28]} />
            <meshStandardMaterial color={fairingPrimary} emissive={fairingPrimary} emissiveIntensity={0.8} />
          </mesh>

          {/* Multi-spoke bright silver sport rim (both sides) */}
          {[-0.045, 0.045].map((xOff, si) => (
            <group key={si}>
              {[0, 1, 2, 3, 4].map((i) => {
                const angle = (i * Math.PI) / 5;
                return (
                  <mesh key={i} position={[xOff, 0, 0]} rotation={[angle, 0, 0]}>
                    <boxGeometry args={[0.014, 0.50, 0.018]} />
                    <meshStandardMaterial color={brightRims} metalness={0.4} roughness={0.2} />
                  </mesh>
                );
              })}
            </group>
          ))}

          {/* Center wheel hub */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.05, 0.11, 14]} />
            <meshStandardMaterial color={carbonDark} metalness={0.7} roughness={0.25} />
          </mesh>

          {/* Perforated stainless steel brake rotor */}
          <mesh position={[0.065, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <ringGeometry args={[0.10, 0.22, 24]} />
            <meshStandardMaterial color={silverAlloy} metalness={0.85} roughness={0.15} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>

      {/* ── REAR SWINGARM & REAR WHEEL (Axle at z = -0.96) ── */}
      <group>
        {/* Sculpted aluminum swingarm */}
        <mesh position={[0.07, 0.32, -0.68]} rotation={[0.05, 0, 0]}>
          <boxGeometry args={[0.08, 0.075, 0.65]} />
          <meshStandardMaterial color={carbonDark} metalness={0.8} roughness={0.22} />
        </mesh>
        <mesh position={[-0.07, 0.32, -0.68]} rotation={[0.05, 0, 0]}>
          <boxGeometry args={[0.06, 0.065, 0.62]} />
          <meshStandardMaterial color={carbonDark} metalness={0.8} roughness={0.22} />
        </mesh>
        {/* Monoshock rear suspension with gold spring */}
        <mesh position={[0, 0.40, -0.54]} rotation={[-0.28, 0, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.28, 10]} />
          <meshStandardMaterial color={goldForks} metalness={0.85} roughness={0.18} />
        </mesh>
        {/* Rear drive chain & sprocket */}
        <mesh position={[-0.085, 0.32, -0.96]} rotation={[0, Math.PI / 2, 0]}>
          <ringGeometry args={[0.065, 0.12, 18]} />
          <meshStandardMaterial color={goldForks} metalness={0.85} roughness={0.2} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-0.075, 0.28, -0.58]} rotation={[0.06, 0, 0]}>
          <boxGeometry args={[0.016, 0.016, 0.74]} />
          <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* REAR WHEEL ASSEMBLY (Axle: z = -0.96, radius: 0.34, extra wide 200-section sport tire) */}
        <group ref={rearWheelRef} position={[0, 0.34, -0.96]}>
          {/* Wide sport tire */}
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.26, 0.095, 16, 32]} />
            <meshStandardMaterial color="#111827" roughness={0.88} />
          </mesh>

          {/* Diamond-cut bright silver contrasting rim ring */}
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.19, 0.018, 8, 28]} />
            <meshStandardMaterial color={brightRims} metalness={0.35} roughness={0.2} />
          </mesh>

          {/* Emerald green rim-tape accent stripe */}
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.194, 0.005, 6, 28]} />
            <meshStandardMaterial color={fairingPrimary} emissive={fairingPrimary} emissiveIntensity={0.8} />
          </mesh>

          {/* Multi-spoke bright silver sport rim */}
          {[-0.055, 0.055].map((xOff, si) => (
            <group key={si}>
              {[0, 1, 2, 3, 4].map((i) => {
                const angle = (i * Math.PI) / 5;
                return (
                  <mesh key={i} position={[xOff, 0, 0]} rotation={[angle, 0, 0]}>
                    <boxGeometry args={[0.016, 0.52, 0.020]} />
                    <meshStandardMaterial color={brightRims} metalness={0.4} roughness={0.2} />
                  </mesh>
                );
              })}
            </group>
          ))}

          {/* Center wheel hub */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.055, 0.055, 0.13, 14]} />
            <meshStandardMaterial color={carbonDark} metalness={0.7} roughness={0.25} />
          </mesh>

          {/* Rear brake rotor */}
          <mesh position={[-0.075, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <ringGeometry args={[0.09, 0.20, 24]} />
            <meshStandardMaterial color={silverAlloy} metalness={0.85} roughness={0.15} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>

      {/* ── DYNAMIC TRAIL / PARTICLE EFFECT (spawns behind rear wheel) ── */}
      {isSparksUpgraded ? (
        <SparksTrail isDriving={isDriving} />
      ) : (
        <DustTrail isDriving={isDriving} />
      )}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   2. LAMBORGHINI-INSPIRED SUPERCAR 3D MODEL (With Driver Cockpit)
   - Color Scheme: Radiant glossy metallic Rosso Corsa red (#dc2626 / #ef4444),
     dark slate carbon-fiber aerodynamic skirts and diffuser (#1e293b / #0f172a),
     bright diamond-cut silver 10-spoke rims (#f8fafc), and gold Brembo calipers (#fbbf24).
   - Tuned PBR materials: metalness 0.28, roughness 0.22 ensuring the supercar is
     brilliant, saturated red under scene lighting and never washed out to black.
   - Proportional scale increase: 2.88m overall length (z: 1.38 to -1.48),
     1.56m body width (widening to 1.70m over wide flared wheel arches),
     1.84m wheelbase (axles at z = ±0.92), large 20-inch low-profile wheels (r: 0.30),
     prominent 1.64m swan-neck GT rear downforce wing and aggressive quad diffuser.
   - Strict Cockpit Driver Seating Alignment (100% preserved):
     * Driver Bucket Seat Cushion: [0, 0.43, -0.40]
     * Driver Seatback: [0, 0.74, -0.63] angled naturally
     * Sport Steering Wheel: [0, 0.85, -0.12] with grips at [±0.27, 0.85, -0.12]
     * Drilled pedals: [±0.16, 0.40, 0.12]
     * Cockpit is spacious (1.10m interior width) with frameless clear windshield
       so driver is 100% visible from all camera angles with zero clipping.
   - Forward Wheel Rotation: All 4 wheels roll forward around the X axle.
───────────────────────────────────────────────────────────────── */
function SportsCarMesh({ isDriving, isCoinsUpgraded }) {
  const wheelsRef = useRef([]);
  const carRef = useRef();

  useFrame((_, delta) => {
    const rotSpeed = isDriving ? 18 : 2;
    // Wheels roll naturally forward around their X axle (perpendicular to flat circular face)
    wheelsRef.current.forEach((w) => {
      if (w) w.rotation.x += delta * rotSpeed;
    });
    if (carRef.current && isDriving) {
      carRef.current.position.y = Math.sin(Date.now() * 0.016) * 0.007;
    }
  });

  // Radiant Ferrari/Lamborghini-inspired colors (tuned for vivid lighting)
  const bodyPrimary = '#dc2626';       // Radiant Rosso Corsa (vivid red)
  const bodyAccent = '#ef4444';        // Bright crimson highlight
  const bodyDark = '#b91c1c';          // Deep metallic red for shadows
  const carbonDark = '#0f172a';        // Deep dark slate/carbon
  const carbonAero = '#1e293b';        // Carbon fiber aero splitters & diffuser
  const interiorDark = '#0b0f19';      // Cockpit upholstery
  const brightSilver = '#f8fafc';      // Contrasting diamond-cut silver rims
  const silverMetal = '#cbd5e1';       // Exhaust & mechanical metal
  const brakeCaliper = '#fbbf24';      // Signature Lambo gold brake calipers
  const neonGlow = '#f43f5e';          // Rose neon accent lines
  const headlightYellow = '#fef08a';

  return (
    <group ref={carRef} position={[0, 0, 0]}>
      {/* ── DRIVER RACING BUCKET SEAT ── */}
      <group>
        {/* Base Cushion: Driver Hips at [0, 0.48, -0.40] */}
        <mesh position={[0, 0.43, -0.40]}>
          <boxGeometry args={[0.60, 0.08, 0.48]} />
          <meshStandardMaterial color={interiorDark} roughness={0.7} metalness={0.15} />
        </mesh>
        {/* Left Sport Bolster */}
        <mesh position={[0.29, 0.47, -0.40]}>
          <boxGeometry args={[0.07, 0.10, 0.46]} />
          <meshStandardMaterial color={bodyPrimary} metalness={0.28} roughness={0.24} />
        </mesh>
        {/* Right Sport Bolster */}
        <mesh position={[-0.29, 0.47, -0.40]}>
          <boxGeometry args={[0.07, 0.10, 0.46]} />
          <meshStandardMaterial color={bodyPrimary} metalness={0.28} roughness={0.24} />
        </mesh>
        {/* Inclined Bucket Seatback */}
        <mesh position={[0, 0.74, -0.63]} rotation={[-0.28, 0, 0]}>
          <boxGeometry args={[0.56, 0.66, 0.10]} />
          <meshStandardMaterial color={interiorDark} roughness={0.7} metalness={0.15} />
        </mesh>
        {/* Red accent center cushion on seatback */}
        <mesh position={[0, 0.74, -0.58]} rotation={[-0.28, 0, 0]}>
          <boxGeometry args={[0.38, 0.58, 0.015]} />
          <meshStandardMaterial color={bodyAccent} metalness={0.28} roughness={0.25} />
        </mesh>
        {/* Racing Headrest */}
        <mesh position={[0, 1.12, -0.74]}>
          <boxGeometry args={[0.30, 0.17, 0.10]} />
          <meshStandardMaterial color={interiorDark} roughness={0.6} />
        </mesh>
      </group>

      {/* ── COCKPIT FOOTWELL & PEDALS ── */}
      <group>
        {/* Cockpit tub floor (roomy 1.10m interior width) */}
        <mesh position={[0, 0.35, -0.15]}>
          <boxGeometry args={[1.04, 0.06, 1.25]} />
          <meshStandardMaterial color={carbonDark} roughness={0.8} />
        </mesh>
        {/* Drilled aluminum pedals at [±0.16, 0.40, 0.12] */}
        {[0.16, -0.16].map((x, i) => (
          <mesh key={i} position={[x, 0.40, 0.12]} rotation={[-0.4, 0, 0]}>
            <boxGeometry args={[0.07, 0.10, 0.02]} />
            <meshStandardMaterial color={silverMetal} metalness={0.85} roughness={0.15} />
          </mesh>
        ))}
        {/* Center transmission tunnel (carbon fiber) */}
        <mesh position={[0, 0.42, -0.15]}>
          <boxGeometry args={[0.18, 0.10, 0.85]} />
          <meshStandardMaterial color={carbonAero} metalness={0.5} roughness={0.35} />
        </mesh>
      </group>

      {/* ── SPORT STEERING WHEEL: Grips at [±0.27, 0.85, -0.12] ── */}
      <group>
        {/* Steering Column */}
        <mesh position={[0, 0.70, 0.02]} rotation={[-0.60, 0, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.36, 16]} />
          <meshStandardMaterial color={carbonDark} metalness={0.7} />
        </mesh>
        {/* Wheel Hub */}
        <mesh position={[0, 0.85, -0.12]} rotation={[-0.35, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.04, 6]} />
          <meshStandardMaterial color={interiorDark} metalness={0.8} />
        </mesh>
        {/* Lambo-style gold emblem in hub */}
        <mesh position={[0, 0.86, -0.11]} rotation={[-0.35, 0, 0]}>
          <circleGeometry args={[0.048, 6]} />
          <meshStandardMaterial color={brakeCaliper} emissive="#d97706" emissiveIntensity={1.0} />
        </mesh>
        {/* Flat-bottom steering wheel rim */}
        <mesh position={[0, 0.85, -0.12]} rotation={[-0.35, 0, 0]}>
          <torusGeometry args={[0.27, 0.030, 14, 32]} />
          <meshStandardMaterial color={interiorDark} roughness={0.6} metalness={0.3} />
        </mesh>
        {/* Red leather grip pads aligning with hands at [±0.27, 0.85, -0.12] */}
        <mesh position={[0.27, 0.85, -0.12]} rotation={[-0.35, 0, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.12, 12]} />
          <meshStandardMaterial color={bodyAccent} metalness={0.28} roughness={0.3} />
        </mesh>
        <mesh position={[-0.27, 0.85, -0.12]} rotation={[-0.35, 0, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.12, 12]} />
          <meshStandardMaterial color={bodyAccent} metalness={0.28} roughness={0.3} />
        </mesh>
        {/* Paddle shifters */}
        {[-0.20, 0.20].map((x, i) => (
          <mesh key={i} position={[x, 0.82, -0.16]} rotation={[-0.35, 0, 0]}>
            <boxGeometry args={[0.06, 0.025, 0.04]} />
            <meshStandardMaterial color={silverMetal} metalness={0.9} roughness={0.1} />
          </mesh>
        ))}
      </group>

      {/* ── DASHBOARD & INSTRUMENT CLUSTER ── */}
      <group position={[0, 0.68, 0.06]}>
        {/* Main dashboard shell */}
        <mesh>
          <boxGeometry args={[1.14, 0.16, 0.36]} />
          <meshStandardMaterial color={interiorDark} roughness={0.4} metalness={0.4} />
        </mesh>
        {/* Leather dash topper */}
        <mesh position={[0, 0.09, 0]}>
          <boxGeometry args={[1.16, 0.02, 0.38]} />
          <meshStandardMaterial color={carbonDark} roughness={0.7} />
        </mesh>
        {/* Digital instrument display */}
        <mesh position={[0, 0.11, -0.06]} rotation={[-0.3, 0, 0]}>
          <boxGeometry args={[0.36, 0.065, 0.02]} />
          <meshStandardMaterial color={neonGlow} emissive={neonGlow} emissiveIntensity={2.2} />
        </mesh>
        {/* Central touchscreen */}
        <mesh position={[0.24, 0.05, -0.10]} rotation={[-0.25, 0.15, 0]}>
          <boxGeometry args={[0.18, 0.09, 0.008]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1.4} />
        </mesh>
      </group>

      {/* ── PANORAMIC WINDSHIELD & COCKPIT GLASS (Clear visibility) ── */}
      <group>
        {/* Ultra-clear frameless windshield */}
        <mesh position={[0, 0.82, 0.18]} rotation={[-0.55, 0, 0]}>
          <boxGeometry args={[1.12, 0.40, 0.018]} />
          <meshPhysicalMaterial
            color="#cffafe"
            transparent
            opacity={0.24}
            roughness={0.04}
            metalness={0.08}
            transmission={0.92}
            ior={1.3}
          />
        </mesh>
        {/* Windshield lower base cowl */}
        <mesh position={[0, 0.68, 0.26]}>
          <boxGeometry args={[1.16, 0.04, 0.06]} />
          <meshStandardMaterial color={carbonDark} metalness={0.8} />
        </mesh>
        {/* Slender A-pillars */}
        {[-0.56, 0.56].map((x, i) => (
          <mesh key={i} position={[x, 0.80, 0.10]} rotation={[-0.45, x > 0 ? 0.15 : -0.15, 0]}>
            <boxGeometry args={[0.035, 0.36, 0.04]} />
            <meshStandardMaterial color={carbonDark} metalness={0.8} />
          </mesh>
        ))}
        {/* Aerodynamic door sills with Rosso Corsa paint */}
        {[-0.60, 0.60].map((x, i) => (
          <mesh key={i} position={[x, 0.55, -0.22]}>
            <boxGeometry args={[0.12, 0.24, 1.10]} />
            <meshStandardMaterial color={bodyPrimary} metalness={0.28} roughness={0.22} />
          </mesh>
        ))}
        {/* Door panel neon accent line */}
        {[-0.66, 0.66].map((x, i) => (
          <mesh key={i} position={[x, 0.50, -0.22]}>
            <boxGeometry args={[0.010, 0.08, 1.00]} />
            <meshStandardMaterial color={neonGlow} emissive={neonGlow} emissiveIntensity={1.8} />
          </mesh>
        ))}
      </group>

      {/* ── EXTERIOR SUPERCAR WIDEBODY (Rosso Corsa Paint & Carbon Aero) ── */}
      <group>
        {/* Lower monocoque chassis (Length: 2.88m, Width: 1.48m) */}
        <mesh position={[0, 0.24, -0.05]}>
          <boxGeometry args={[1.44, 0.18, 2.76]} />
          <meshStandardMaterial color={bodyPrimary} metalness={0.28} roughness={0.22} />
        </mesh>

        {/* Flared front wheel arches (Width: 1.66m) */}
        {[-0.76, 0.76].map((x, i) => (
          <mesh key={i} position={[x, 0.36, 0.92]}>
            <boxGeometry args={[0.14, 0.22, 0.72]} />
            <meshStandardMaterial color={bodyPrimary} metalness={0.28} roughness={0.22} />
          </mesh>
        ))}

        {/* Flared rear muscular wheel arches (Width: 1.70m) */}
        {[-0.78, 0.78].map((x, i) => (
          <mesh key={i} position={[x, 0.38, -0.92]}>
            <boxGeometry args={[0.16, 0.25, 0.80]} />
            <meshStandardMaterial color={bodyPrimary} metalness={0.28} roughness={0.22} />
          </mesh>
        ))}

        {/* Carbon fiber aerodynamic side skirts with winglets */}
        {[-0.74, 0.74].map((x, i) => (
          <group key={i} position={[x, 0.17, -0.05]}>
            <mesh>
              <boxGeometry args={[0.06, 0.05, 2.65]} />
              <meshStandardMaterial color={carbonAero} metalness={0.65} roughness={0.25} />
            </mesh>
            {/* Aero bargeboard fin */}
            <mesh position={[x > 0 ? 0.03 : -0.03, 0.06, -0.40]}>
              <boxGeometry args={[0.015, 0.12, 0.30]} />
              <meshStandardMaterial color={carbonAero} metalness={0.65} roughness={0.25} />
            </mesh>
          </group>
        ))}

        {/* Dramatically low angular wedge hood (Rosso Corsa) */}
        <mesh position={[0, 0.40, 0.82]} rotation={[-0.14, 0, 0]}>
          <boxGeometry args={[1.32, 0.10, 1.15]} />
          <meshStandardMaterial color={bodyPrimary} metalness={0.28} roughness={0.22} />
        </mesh>
        {/* Hood center aerodynamic air extractor channel */}
        <mesh position={[0, 0.46, 0.78]} rotation={[-0.14, 0, 0]}>
          <boxGeometry args={[0.42, 0.015, 0.80]} />
          <meshStandardMaterial color={carbonDark} metalness={0.6} roughness={0.35} />
        </mesh>

        {/* Y-shaped front carbon air intakes */}
        {[-0.40, 0.40].map((x, i) => (
          <mesh key={i} position={[x, 0.30, 1.30]}>
            <boxGeometry args={[0.26, 0.11, 0.10]} />
            <meshStandardMaterial color={carbonDark} roughness={0.5} />
          </mesh>
        ))}
        {/* Center front air intake */}
        <mesh position={[0, 0.20, 1.34]}>
          <boxGeometry args={[0.46, 0.09, 0.08]} />
          <meshStandardMaterial color={carbonDark} roughness={0.5} />
        </mesh>

        {/* Aggressive front carbon fiber splitter (Width: 1.54m, forward to z = 1.38) */}
        <mesh position={[0, 0.12, 1.38]}>
          <boxGeometry args={[1.54, 0.04, 0.26]} />
          <meshStandardMaterial color={carbonAero} metalness={0.7} roughness={0.25} />
        </mesh>
        {/* Front splitter side winglets */}
        {[-0.76, 0.76].map((x, i) => (
          <mesh key={i} position={[x, 0.16, 1.38]}>
            <boxGeometry args={[0.02, 0.08, 0.24]} />
            <meshStandardMaterial color={carbonAero} metalness={0.7} roughness={0.25} />
          </mesh>
        ))}

        {/* Lamborghini signature Y-shaped LED headlights */}
        {[-1, 1].map((side, i) => (
          <group key={i} position={[side * 0.52, 0.38, 1.25]}>
            {/* Main high-beam projector */}
            <mesh>
              <boxGeometry args={[0.22, 0.04, 0.06]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={3.2} />
            </mesh>
            {/* Upper DRL signature eyebrow */}
            <mesh position={[side * 0.06, 0.035, -0.02]}>
              <boxGeometry args={[0.14, 0.014, 0.04]} />
              <meshStandardMaterial color={headlightYellow} emissive={headlightYellow} emissiveIntensity={2.0} />
            </mesh>
          </group>
        ))}

        {/* Rear mid-engine decklid with ventilation louvers */}
        <mesh position={[0, 0.58, -0.96]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[1.28, 0.18, 0.90]} />
          <meshStandardMaterial color={bodyDark} metalness={0.28} roughness={0.24} />
        </mesh>
        {/* Glass engine display canopy */}
        <mesh position={[0, 0.68, -0.90]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[0.56, 0.006, 0.46]} />
          <meshPhysicalMaterial
            color="#0f172a"
            transparent
            opacity={0.45}
            roughness={0.06}
            metalness={0.15}
            transmission={0.6}
          />
        </mesh>
        {/* Engine cover carbon louvers */}
        {[-0.14, -0.05, 0.05, 0.14].map((z, i) => (
          <mesh key={i} position={[0, 0.69, -0.90 + z]} rotation={[0.08, 0, 0]}>
            <boxGeometry args={[0.60, 0.009, 0.016]} />
            <meshStandardMaterial color={carbonDark} metalness={0.7} />
          </mesh>
        ))}

        {/* Swan-neck GT Rear Downforce Wing (Span: 1.64m) */}
        <group position={[0, 0.82, -1.32]}>
          {/* Twin swan-neck carbon pylons */}
          {[-0.52, 0.52].map((x, i) => (
            <mesh key={i} position={[x, -0.18, 0]}>
              <boxGeometry args={[0.04, 0.35, 0.09]} />
              <meshStandardMaterial color={carbonAero} metalness={0.75} roughness={0.2} />
            </mesh>
          ))}
          {/* Main high-downforce airfoil blade (1.64m wide) */}
          <mesh>
            <boxGeometry args={[1.64, 0.04, 0.32]} />
            <meshStandardMaterial color={carbonAero} metalness={0.75} roughness={0.2} />
          </mesh>
          {/* Endplates */}
          {[-0.82, 0.82].map((x, i) => (
            <mesh key={i} position={[x, -0.02, 0]}>
              <boxGeometry args={[0.02, 0.14, 0.36]} />
              <meshStandardMaterial color={carbonDark} metalness={0.8} />
            </mesh>
          ))}
          {/* Neon accent on wing trailing edge */}
          <mesh position={[0, 0.025, -0.16]}>
            <boxGeometry args={[1.58, 0.014, 0.014]} />
            <meshStandardMaterial color={neonGlow} emissive={neonGlow} emissiveIntensity={2.2} />
          </mesh>
        </group>

        {/* Full-width continuous LED taillight bar */}
        <mesh position={[0, 0.40, -1.42]}>
          <boxGeometry args={[1.36, 0.045, 0.04]} />
          <meshStandardMaterial color="#ef4444" emissive={neonGlow} emissiveIntensity={3.0} />
        </mesh>

        {/* Aggressive lower rear aerodynamic diffuser (z = -1.48) */}
        <mesh position={[0, 0.16, -1.44]}>
          <boxGeometry args={[1.24, 0.13, 0.10]} />
          <meshStandardMaterial color={carbonAero} metalness={0.7} roughness={0.25} />
        </mesh>
        {/* Diffuser vertical aerodynamic strakes */}
        {[-0.34, -0.12, 0.12, 0.34].map((x, i) => (
          <mesh key={i} position={[x, 0.16, -1.42]}>
            <boxGeometry args={[0.018, 0.11, 0.14]} />
            <meshStandardMaterial color={carbonAero} metalness={0.7} />
          </mesh>
        ))}

        {/* Quad titanium exhaust tips with orange afterburner glow */}
        {[-0.24, -0.11, 0.11, 0.24].map((x, i) => (
          <group key={i} position={[x, 0.22, -1.46]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.044, 0.044, 0.09, 14]} />
              <meshStandardMaterial color={silverMetal} metalness={0.9} roughness={0.10} />
            </mesh>
            {/* Exhaust flame/glow interior */}
            <mesh position={[0, 0, -0.045]} rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.034, 12]} />
              <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={1.8} />
            </mesh>
          </group>
        ))}

        {/* Ground effect underglow */}
        <mesh position={[0, 0.10, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.70, 0.72, 32, 1, 0, Math.PI * 2]} />
          <meshStandardMaterial
            color={neonGlow}
            emissive={neonGlow}
            emissiveIntensity={1.2}
            transparent
            opacity={0.45}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ── 4 PREMIUM CONTRASTING WHEELS — Rolling forward around X axis ── */}
      {[
        [-0.78, 0.30, 0.92],   // Front Left (pushed out to match flared arches)
        [0.78, 0.30, 0.92],    // Front Right
        [-0.80, 0.32, -0.92],  // Rear Left (wider stance)
        [0.80, 0.32, -0.92],   // Rear Right
      ].map(([x, y, z], idx) => {
        const isRear = idx >= 2;
        const tireR = isRear ? 0.26 : 0.24;
        const tireW = isRear ? 0.11 : 0.09;
        const rimR = isRear ? 0.18 : 0.16;
        const outward = x > 0 ? 1 : -1;

        return (
          <group
            key={idx}
            ref={(el) => (wheelsRef.current[idx] = el)}
            position={[x, y, z]}
          >
            {/* Low-profile performance tire */}
            <mesh rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[tireR, tireW, 16, 32]} />
              <meshStandardMaterial color="#111827" roughness={0.88} />
            </mesh>

            {/* Contrasting bright diamond-cut silver 10-spoke rim */}
            {[0, 1, 2, 3, 4].map((i) => {
              const angle = (i * Math.PI) / 5;
              const spokeLen = tireR * 1.7;
              return (
                <mesh key={i}
                  position={[0, 0, 0]}
                  rotation={[angle, 0, 0]}
                >
                  <boxGeometry args={[0.018, spokeLen, 0.014]} />
                  <meshStandardMaterial color={brightSilver} metalness={0.35} roughness={0.2} />
                </mesh>
              );
            })}

            {/* Bright diamond-cut outer rim lip */}
            <mesh rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[rimR, 0.014, 8, 28]} />
              <meshStandardMaterial color={brightSilver} metalness={0.35} roughness={0.2} />
            </mesh>

            {/* Center wheel hub */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.045, 0.045, 0.11, 6]} />
              <meshStandardMaterial color={carbonDark} metalness={0.7} roughness={0.2} />
            </mesh>

            {/* Center lock cap with Rosso Corsa red accent */}
            <mesh position={[outward * 0.06, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <circleGeometry args={[0.038, 6]} />
              <meshStandardMaterial color={bodyPrimary} metalness={0.5} roughness={0.2} />
            </mesh>

            {/* Brembo Gold Brake Caliper (Signature Lamborghini contrast) */}
            <mesh position={[outward * -0.04, -0.06, 0]}>
              <boxGeometry args={[0.035, 0.07, 0.09]} />
              <meshStandardMaterial color={brakeCaliper} metalness={0.75} roughness={0.25} />
            </mesh>

            {/* Cross-drilled carbon-ceramic brake rotor */}
            <mesh position={[outward * -0.03, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <ringGeometry args={[0.09, rimR - 0.01, 24]} />
              <meshStandardMaterial color={silverMetal} metalness={0.85} roughness={0.15} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}

      {/* ── DYNAMIC TRAIL / PARTICLE EFFECT (spawns behind rear wheels) ── */}
      {isCoinsUpgraded ? (
        <CoinTrail isDriving={isDriving} />
      ) : (
        <TireSmokeTrail isDriving={isDriving} />
      )}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   3. COSMIC TITAN ROCKET — LEGENDARY 3D MODEL
   Futuristic, premium cosmic vehicle worthy of the highest legendary rarity:
   - Striking color palette: metallic violet (#7c3aed / #6d28d9), deep cosmic
     blue (#1e1b4b / #312e81), glowing cyan (#22d3ee), and gold accents (#eab308 / #fbbf24).
   - Tuned PBR materials (metalness: 0.32, roughness: 0.22) ensuring vibrant, colorful
     visibility under ambient and directional lighting without dark washout.
   - Distinctive pointed aerodynamic nose cone with cyan energy spire, layered
     fuselage armor plating, intricate glowing panel channels, and reactor core dome.
   - Triple pulsating and rotating energy rings around the fuselage.
   - Dual streamlined cosmic side booster pods with gold intakes and auxiliary nozzles.
   - Swept atmospheric delta fins with beveled gold leading edges and cyan trailing edges.
   - Heavy supersonic nozzle bell with gold vectoring petals and glowing heat throat.
   - Critical Rider Alignment (Character sits astride on top):
     * Saddle: [0, 0.44, -0.40] (rider hips sit directly on upper surface)
     * Dual Flight Control Handles: [±0.30, 0.70, -0.12]
     * Aerodynamic Footrests / Stirrups: [±0.34, 0.36, -0.14]
   - Animated gentle flight hover motion.
───────────────────────────────────────────────────────────────── */
function RocketMesh({ isDriving, isWarpUpgraded }) {
  const rocketRef = useRef();
  const energyRing1 = useRef();
  const energyRing2 = useRef();
  const energyRing3 = useRef();
  const coreGlowRef = useRef();
  const boosterGlow1 = useRef();
  const boosterGlow2 = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const flySpeed = isDriving ? 3.4 : 2.4;
    if (rocketRef.current) {
      // Subtle floating flight motion
      rocketRef.current.position.y = Math.sin(t * flySpeed) * 0.035;
      rocketRef.current.rotation.z = Math.cos(t * flySpeed * 0.7) * 0.012;
      rocketRef.current.rotation.x = Math.sin(t * flySpeed * 0.5) * 0.008;
    }

    // Animated energy rings pulsing and rotating
    const ringPulse = 1.0 + Math.sin(t * 6) * 0.12;
    if (energyRing1.current) {
      energyRing1.current.rotation.x += 0.02;
      energyRing1.current.scale.setScalar(ringPulse);
    }
    if (energyRing2.current) {
      energyRing2.current.rotation.x -= 0.015;
      energyRing2.current.scale.setScalar(1.0 + Math.sin(t * 5 + 1.0) * 0.10);
    }
    if (energyRing3.current) {
      energyRing3.current.rotation.x += 0.025;
      energyRing3.current.scale.setScalar(1.0 + Math.cos(t * 7) * 0.14);
    }

    // Pulsing energy core glow
    if (coreGlowRef.current && coreGlowRef.current.material) {
      coreGlowRef.current.material.emissiveIntensity = 2.2 + Math.sin(t * 8) * 0.8;
    }

    // Booster nozzle glow pulsing
    const boostPulse = 1.6 + Math.sin(t * 10) * 0.5;
    if (boosterGlow1.current && boosterGlow1.current.material) {
      boosterGlow1.current.material.emissiveIntensity = boostPulse;
    }
    if (boosterGlow2.current && boosterGlow2.current.material) {
      boosterGlow2.current.material.emissiveIntensity = boostPulse;
    }
  });

  // Premium cosmic color palette (tuned for vivid lighting)
  const hullViolet = '#7c3aed';        // Metallic violet hull
  const hullDeep = '#6d28d9';          // Deep violet accent panels
  const cosmicBlue = '#312e81';        // Deep cosmic blue structural
  const cosmicDeep = '#1e1b4b';        // Darkest cosmic blue
  const cyanGlow = '#22d3ee';          // Bright glowing cyan
  const cyanDeep = '#06b6d4';          // Saturated cyan
  const goldAccent = '#eab308';        // Gold trim
  const goldBright = '#fbbf24';        // Bright gold
  const silverMech = '#cbd5e1';        // Silver mechanical
  const chromeMetal = '#f1f5f9';       // Polished chrome

  return (
    <group ref={rocketRef} position={[0, 0, 0]}>

      {/* ══════════════════════════════════════════════════════════
         1. MAIN ROCKET FUSELAGE & LAYERED ARMOR
         Fuselage center Y = 0.20, radius 0.26 -> top surface Y = 0.46
      ══════════════════════════════════════════════════════════ */}

      {/* Primary hull body — tapered aerodynamic cylinder */}
      <mesh position={[0, 0.20, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.26, 0.32, 2.05, 28]} />
        <meshStandardMaterial color={hullViolet} metalness={0.32} roughness={0.22} />
      </mesh>

      {/* Upper fuselage spine armor */}
      <mesh position={[0, 0.41, -0.20]} rotation={[-0.04, 0, 0]}>
        <boxGeometry args={[0.34, 0.08, 1.45]} />
        <meshStandardMaterial color={hullDeep} metalness={0.32} roughness={0.22} />
      </mesh>

      {/* Lower belly keel armor */}
      <mesh position={[0, 0.01, -0.15]}>
        <boxGeometry args={[0.34, 0.06, 1.60]} />
        <meshStandardMaterial color={cosmicBlue} metalness={0.42} roughness={0.25} />
      </mesh>

      {/* Left side armor plating */}
      <mesh position={[0.29, 0.20, -0.15]}>
        <boxGeometry args={[0.05, 0.26, 1.50]} />
        <meshStandardMaterial color={cosmicBlue} metalness={0.40} roughness={0.25} />
      </mesh>
      {/* Right side armor plating */}
      <mesh position={[-0.29, 0.20, -0.15]}>
        <boxGeometry args={[0.05, 0.26, 1.50]} />
        <meshStandardMaterial color={cosmicBlue} metalness={0.40} roughness={0.25} />
      </mesh>

      {/* Luminous panel line grooves on top spine */}
      {[-0.60, -0.15, 0.20].map((z, i) => (
        <mesh key={i} position={[0, 0.455, z]}>
          <boxGeometry args={[0.32, 0.006, 0.02]} />
          <meshStandardMaterial color={cyanGlow} emissive={cyanGlow} emissiveIntensity={1.8} />
        </mesh>
      ))}

      {/* Lateral glowing cyan pinstripes */}
      {[-1, 1].map((side, i) => (
        <mesh key={i} position={[side * 0.32, 0.20, -0.15]}>
          <boxGeometry args={[0.008, 0.008, 1.45]} />
          <meshStandardMaterial color={cyanGlow} emissive={cyanGlow} emissiveIntensity={2.0} />
        </mesh>
      ))}

      {/* ══════════════════════════════════════════════════════════
         2. POINTED AERODYNAMIC NOSE CONE
      ══════════════════════════════════════════════════════════ */}

      {/* Main forward nose cone */}
      <mesh position={[0, 0.20, 1.02]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.26, 0.70, 28]} />
        <meshStandardMaterial color={goldAccent} metalness={0.45} roughness={0.20} />
      </mesh>

      {/* Nose cone gold bevel ring */}
      <mesh position={[0, 0.20, 0.68]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.27, 0.018, 10, 28]} />
        <meshStandardMaterial color={goldBright} emissive={goldBright} emissiveIntensity={1.2} />
      </mesh>

      {/* Glowing cyan nose spire tip */}
      <mesh position={[0, 0.20, 1.38]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.05, 0.18, 14]} />
        <meshStandardMaterial color={cyanGlow} emissive={cyanGlow} emissiveIntensity={3.2} />
      </mesh>

      {/* Aerodynamic nose fairing cowl */}
      <mesh position={[0, 0.35, 0.74]} rotation={[-0.22, 0, 0]}>
        <boxGeometry args={[0.26, 0.06, 0.38]} />
        <meshStandardMaterial color={hullViolet} metalness={0.32} roughness={0.22} />
      </mesh>

      {/* ══════════════════════════════════════════════════════════
         3. RIDER SADDLE & FLIGHT CONTROL HANDLES
         Character sits astride: Hips at [0, 0.48, -0.40]
         Hands at [±0.30, 0.70, -0.12]
         Feet at [±0.34, 0.36, -0.14]
      ══════════════════════════════════════════════════════════ */}

      {/* Contoured rider saddle cushion */}
      <mesh position={[0, 0.44, -0.40]}>
        <boxGeometry args={[0.28, 0.06, 0.46]} />
        <meshStandardMaterial color={cosmicDeep} roughness={0.7} metalness={0.15} />
      </mesh>
      {/* Saddle ergonomic side bolsters */}
      {[-0.15, 0.15].map((x, i) => (
        <mesh key={i} position={[x, 0.455, -0.40]}>
          <boxGeometry args={[0.035, 0.045, 0.42]} />
          <meshStandardMaterial color={hullDeep} metalness={0.35} roughness={0.25} />
        </mesh>
      ))}
      {/* Cyan neon saddle stitching */}
      <mesh position={[0, 0.472, -0.40]}>
        <boxGeometry args={[0.02, 0.006, 0.38]} />
        <meshStandardMaterial color={cyanGlow} emissive={cyanGlow} emissiveIntensity={1.2} />
      </mesh>

      {/* Dual Flight Control Grips at [±0.30, 0.70, -0.12] */}
      {[-1, 1].map((side, i) => (
        <group key={i} position={[side * 0.30, 0.70, -0.12]}>
          {/* Angled mounting bracket from hull */}
          <mesh position={[side * -0.06, -0.12, 0.04]} rotation={[0.25, 0, side * 0.20]}>
            <cylinderGeometry args={[0.022, 0.026, 0.24, 10]} />
            <meshStandardMaterial color={silverMech} metalness={0.8} roughness={0.18} />
          </mesh>
          {/* Flight grip */}
          <mesh rotation={[0.25, 0, side * 0.15]}>
            <cylinderGeometry args={[0.032, 0.032, 0.14, 12]} />
            <meshStandardMaterial color={cosmicDeep} roughness={0.5} metalness={0.25} />
          </mesh>
          {/* Gold end-cap with cyan status LED */}
          <mesh position={[0, 0.08, 0]}>
            <sphereGeometry args={[0.032, 8, 8]} />
            <meshStandardMaterial color={goldAccent} metalness={0.65} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.095, 0]}>
            <sphereGeometry args={[0.015, 6, 6]} />
            <meshStandardMaterial color={cyanGlow} emissive={cyanGlow} emissiveIntensity={2.5} />
          </mesh>
        </group>
      ))}

      {/* Aerodynamic rider footrests / stirrups on rocket flanks */}
      {[-1, 1].map((side, i) => (
        <group key={i} position={[side * 0.34, 0.36, -0.14]}>
          {/* Footrest mounting bracket */}
          <mesh position={[side * -0.05, 0, 0]}>
            <boxGeometry args={[0.06, 0.035, 0.08]} />
            <meshStandardMaterial color={silverMech} metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Titanium footpeg */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.028, 0.028, 0.12, 10]} />
            <meshStandardMaterial color={silverMech} metalness={0.85} roughness={0.15} />
          </mesh>
          {/* Gold knurled accent ring */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.030, 0.005, 6, 12]} />
            <meshStandardMaterial color={goldBright} metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* ══════════════════════════════════════════════════════════
         4. GLOWING ENERGY REACTOR & LUMINOUS RINGS
      ══════════════════════════════════════════════════════════ */}

      {/* Central energy reactor core (pulsing cyan sphere) */}
      <mesh ref={coreGlowRef} position={[0, 0.22, 0.15]}>
        <sphereGeometry args={[0.13, 16, 14]} />
        <meshStandardMaterial
          color={cyanGlow}
          emissive={cyanGlow}
          emissiveIntensity={2.2}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Translucent protective energy dome */}
      <mesh position={[0, 0.35, 0.15]}>
        <sphereGeometry args={[0.15, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshPhysicalMaterial
          color="#c7d2fe"
          transparent
          opacity={0.35}
          roughness={0.05}
          metalness={0.1}
          transmission={0.65}
        />
      </mesh>

      {/* Animated Energy Ring 1 — Forward section */}
      <group ref={energyRing1} position={[0, 0.20, 0.35]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.29, 0.016, 10, 32]} />
          <meshStandardMaterial color={cyanGlow} emissive={cyanGlow} emissiveIntensity={2.4} transparent opacity={0.85} />
        </mesh>
      </group>

      {/* Animated Energy Ring 2 — Center section */}
      <group ref={energyRing2} position={[0, 0.20, -0.12]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.31, 0.018, 10, 32]} />
          <meshStandardMaterial color={cyanDeep} emissive={cyanGlow} emissiveIntensity={2.0} transparent opacity={0.80} />
        </mesh>
      </group>

      {/* Animated Energy Ring 3 — Rear section */}
      <group ref={energyRing3} position={[0, 0.20, -0.65]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.33, 0.020, 10, 32]} />
          <meshStandardMaterial color={cyanGlow} emissive={cyanDeep} emissiveIntensity={2.2} transparent opacity={0.82} />
        </mesh>
      </group>

      {/* Illuminated cosmic data nodes along the flanks */}
      {[0.40, 0.15, -0.10, -0.35, -0.60].map((z, i) => (
        <group key={i}>
          {[-0.30, 0.30].map((x, j) => (
            <mesh key={j} position={[x, 0.20, z]}>
              <sphereGeometry args={[0.016, 8, 8]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? cyanGlow : goldBright}
                emissive={i % 2 === 0 ? cyanGlow : goldBright}
                emissiveIntensity={2.2 + Math.sin(i * 1.5) * 0.5}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* ══════════════════════════════════════════════════════════
         5. SWEPT ATMOSPHERIC DELTA FINS
      ══════════════════════════════════════════════════════════ */}

      {/* Left delta fin */}
      <group position={[-0.32, 0.20, -0.85]} rotation={[0, -0.10, -Math.PI / 2.7]}>
        <mesh>
          <boxGeometry args={[0.035, 0.52, 0.65]} />
          <meshStandardMaterial color={cosmicBlue} metalness={0.45} roughness={0.22} />
        </mesh>
        {/* Beveled gold leading edge */}
        <mesh position={[0, 0.26, 0.30]}>
          <boxGeometry args={[0.040, 0.035, 0.65]} />
          <meshStandardMaterial color={goldAccent} metalness={0.55} roughness={0.20} />
        </mesh>
        {/* Cyan neon trailing edge */}
        <mesh position={[0, -0.22, -0.30]}>
          <boxGeometry args={[0.040, 0.016, 0.16]} />
          <meshStandardMaterial color={cyanGlow} emissive={cyanGlow} emissiveIntensity={2.0} />
        </mesh>
      </group>

      {/* Right delta fin */}
      <group position={[0.32, 0.20, -0.85]} rotation={[0, 0.10, Math.PI / 2.7]}>
        <mesh>
          <boxGeometry args={[0.035, 0.52, 0.65]} />
          <meshStandardMaterial color={cosmicBlue} metalness={0.45} roughness={0.22} />
        </mesh>
        {/* Beveled gold leading edge */}
        <mesh position={[0, 0.26, 0.30]}>
          <boxGeometry args={[0.040, 0.035, 0.65]} />
          <meshStandardMaterial color={goldAccent} metalness={0.55} roughness={0.20} />
        </mesh>
        {/* Cyan neon trailing edge */}
        <mesh position={[0, -0.22, -0.30]}>
          <boxGeometry args={[0.040, 0.016, 0.16]} />
          <meshStandardMaterial color={cyanGlow} emissive={cyanGlow} emissiveIntensity={2.0} />
        </mesh>
      </group>

      {/* Top dorsal stabilizer fin */}
      <group position={[0, 0.50, -0.80]}>
        <mesh>
          <boxGeometry args={[0.035, 0.38, 0.55]} />
          <meshStandardMaterial color={cosmicBlue} metalness={0.45} roughness={0.22} />
        </mesh>
        <mesh position={[0, 0.20, 0.25]}>
          <boxGeometry args={[0.040, 0.035, 0.55]} />
          <meshStandardMaterial color={goldAccent} metalness={0.55} roughness={0.20} />
        </mesh>
        <mesh position={[0, -0.14, -0.25]}>
          <boxGeometry args={[0.040, 0.016, 0.14]} />
          <meshStandardMaterial color={cyanGlow} emissive={cyanGlow} emissiveIntensity={2.0} />
        </mesh>
      </group>

      {/* Bottom ventral keel fin */}
      <group position={[0, -0.10, -0.80]} rotation={[0, 0, Math.PI]}>
        <mesh>
          <boxGeometry args={[0.030, 0.28, 0.45]} />
          <meshStandardMaterial color={cosmicBlue} metalness={0.45} roughness={0.22} />
        </mesh>
        <mesh position={[0, 0.15, 0.20]}>
          <boxGeometry args={[0.035, 0.030, 0.45]} />
          <meshStandardMaterial color={goldAccent} metalness={0.55} roughness={0.20} />
        </mesh>
      </group>

      {/* ══════════════════════════════════════════════════════════
         6. STREAMLINED COSMIC SIDE BOOSTER PODS
      ══════════════════════════════════════════════════════════ */}

      {[-1, 1].map((side, si) => (
        <group key={si} position={[side * 0.46, 0.16, -0.60]}>
          {/* Booster fuselage cylinder */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.12, 0.80, 16]} />
            <meshStandardMaterial color={hullDeep} metalness={0.35} roughness={0.22} />
          </mesh>
          {/* Booster forward cone */}
          <mesh position={[0, 0, 0.44]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.09, 0.20, 16]} />
            <meshStandardMaterial color={goldAccent} metalness={0.45} roughness={0.20} />
          </mesh>
          {/* Booster exhaust nozzle ring */}
          <mesh position={[0, 0, -0.42]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.11, 0.07, 0.10, 16]} />
            <meshStandardMaterial color={cosmicDeep} metalness={0.55} roughness={0.20} />
          </mesh>
          {/* Booster auxiliary nozzle inner glow */}
          <mesh ref={side < 0 ? boosterGlow1 : boosterGlow2} position={[0, 0, -0.48]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.065, 14]} />
            <meshStandardMaterial color="#f97316" emissive="#ef4444" emissiveIntensity={1.8} />
          </mesh>
          {/* Booster cyan accent ring */}
          <mesh position={[0, 0, 0.10]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.105, 0.007, 8, 20]} />
            <meshStandardMaterial color={cyanGlow} emissive={cyanGlow} emissiveIntensity={1.6} />
          </mesh>
          {/* Aerodynamic mounting pylon struts */}
          <mesh position={[side * -0.14, 0.03, 0.06]}>
            <boxGeometry args={[0.18, 0.032, 0.06]} />
            <meshStandardMaterial color={silverMech} metalness={0.7} roughness={0.2} />
          </mesh>
          <mesh position={[side * -0.14, 0.03, -0.22]}>
            <boxGeometry args={[0.18, 0.032, 0.06]} />
            <meshStandardMaterial color={silverMech} metalness={0.7} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* ══════════════════════════════════════════════════════════
         7. MAIN ENGINE HOUSING & SUPERSONIC NOZZLE BELL
         Nozzle bell at Z = -1.35 (where exhaust trails originate)
      ══════════════════════════════════════════════════════════ */}

      {/* Stepped engine housing */}
      <mesh position={[0, 0.20, -1.02]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.34, 0.31, 0.28, 28]} />
        <meshStandardMaterial color={cosmicBlue} metalness={0.45} roughness={0.22} />
      </mesh>

      {/* Main engine nozzle bell */}
      <mesh position={[0, 0.20, -1.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.31, 0.22, 0.38, 24]} />
        <meshStandardMaterial color={cosmicDeep} metalness={0.55} roughness={0.20} />
      </mesh>

      {/* Inner nozzle throat */}
      <mesh position={[0, 0.20, -1.28]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.27, 0.18, 0.22, 22]} />
        <meshStandardMaterial color={cosmicDeep} metalness={0.60} roughness={0.18} />
      </mesh>

      {/* Engine nozzle glowing heat ring */}
      <mesh position={[0, 0.20, -1.35]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.20, 0.014, 10, 24]} />
        <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={2.8} />
      </mesh>

      {/* Engine nozzle outer gold trim ring */}
      <mesh position={[0, 0.20, -1.05]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.35, 0.016, 10, 28]} />
        <meshStandardMaterial color={goldAccent} emissive={goldBright} emissiveIntensity={1.0} />
      </mesh>

      {/* Supersonic thrust vectoring petals */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i * Math.PI * 2) / 6;
        return (
          <mesh
            key={i}
            position={[
              Math.sin(angle) * 0.24,
              0.20 + Math.cos(angle) * 0.24,
              -1.35
            ]}
            rotation={[Math.PI / 2, 0, angle]}
          >
            <boxGeometry args={[0.035, 0.07, 0.08]} />
            <meshStandardMaterial color={silverMech} metalness={0.8} roughness={0.15} />
          </mesh>
        );
      })}

      {/* Cosmic aura glow field */}
      <mesh position={[0, 0.20, -0.15]}>
        <sphereGeometry args={[0.60, 16, 14]} />
        <meshStandardMaterial
          color={hullViolet}
          emissive={hullViolet}
          emissiveIntensity={0.35}
          transparent
          opacity={0.08}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── DYNAMIC TRAIL / PARTICLE EFFECT (spawns behind engine nozzle) ── */}
      {isWarpUpgraded ? (
        <UltraBoostTrail isDriving={isDriving} />
      ) : (
        <FireExhaustTrail isDriving={isDriving} />
      )}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   ROOT EXPORT: VehicleMesh
───────────────────────────────────────────────────────────────── */
export default function VehicleMesh({ vehicle, upgradeId, isDriving }) {
  if (!vehicle) return null;

  switch (vehicle.modelType) {
    case 'bike':
      return (
        <CyberBikeMesh
          isDriving={isDriving}
          isSparksUpgraded={upgradeId === 'bike-sparks'}
        />
      );
    case 'car':
      return (
        <SportsCarMesh
          isDriving={isDriving}
          isCoinsUpgraded={upgradeId === 'car-coins'}
        />
      );
    case 'rocket':
      return (
        <RocketMesh
          isDriving={isDriving}
          isWarpUpgraded={upgradeId === 'rocket-warp'}
        />
      );
    default:
      return null;
  }
}
