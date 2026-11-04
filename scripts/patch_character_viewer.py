import os

file_path = 'characterverse/src/components/viewer/CharacterViewer.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# Normalize line endings to LF for replacement
is_crlf = '\r\n' in code
code_norm = code.replace('\r\n', '\n')

# 1. Add refs to GLBCharacter
target_1 = """export function GLBCharacter({ characterData, onReady }) {
  const { scene, animations } = useGLTF(characterData.modelFile, false, false);"""

replacement_1 = """export function GLBCharacter({ characterData, onReady }) {
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
  const overshootRef = useRef(0);"""

# 2. Add mesh caching & cleanup effect
target_2 = """    return { clone, headMat: head, weaponMat: weapon, clothingMat: clothing, capeMat: cape };
  }, [scene]);

  // Bind animations to clonedScene
  const { actions, names: animNames } = useAnimations(animations, clonedScene);"""

replacement_2 = """    return { clone, headMat: head, weaponMat: weapon, clothingMat: clothing, capeMat: cape };
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
  const { actions, names: animNames } = useAnimations(animations, clonedScene);"""

# 3. Animation selection for Superman in Flight Mode
target_3 = """    } else if (isDriving) {
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
    }"""

replacement_3 = """    } else if (isDriving) {
      if (characterData?.id === 'superman') {
        // Superman Flight Mode: Use aerodynamic base pose so feet do not stomp or run
        const flightBases = ['Jump_Idle', 'Unarmed_Idle', 'Idle'];
        for (const name of flightBases) {
          if (actions[name]) {
            targetAction = actions[name];
            break;
          }
        }
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
    }"""

# 4. Flight Kinematics, Posing, Dynamic Cape, Hair & Shadow in useFrame
target_4 = """  // Ergonomic bone positioning for bike riding, sports car cockpit, and legendary rocket astride flight
  useFrame(({ clock }) => {
    if (!clonedScene) return;
    const vehicleType = characterData?.vehicle?.modelType;
    const isMountedBike = vehicleType === 'bike';
    const isMountedCar = vehicleType === 'car';
    const isMountedRocket = vehicleType === 'rocket';
    if (!isMountedBike && !isMountedCar && !isMountedRocket) {
      // Reset any flight offsets if unequipped
      if (clonedScene.position.y !== 0) clonedScene.position.set(0, 0, 0);
      if (clonedScene.rotation.x !== 0 || clonedScene.rotation.z !== 0) clonedScene.rotation.set(0, 0, 0);
      return;
    }

    const spine = clonedScene.getObjectByName('spine');
    const ual = clonedScene.getObjectByName('upperarm.l') || clonedScene.getObjectByName('upperarml');
    const uar = clonedScene.getObjectByName('upperarm.r') || clonedScene.getObjectByName('upperarmr');
    const ull = clonedScene.getObjectByName('upperleg.l') || clonedScene.getObjectByName('upperlegl');
    const ulr = clonedScene.getObjectByName('upperleg.r') || clonedScene.getObjectByName('upperlegr');
    const lll = clonedScene.getObjectByName('lowerleg.l') || clonedScene.getObjectByName('lowerlegl');
    const llr = clonedScene.getObjectByName('lowerleg.r') || clonedScene.getObjectByName('lowerlegr');
    const t = clock.getElapsedTime();
    const isDriving = characterData?.isDrivingMode;"""

replacement_4 = """  // Ergonomic bone positioning for bike riding, sports car cockpit, and legendary rocket astride flight
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

        // 1. Aerodynamic 3D Flight Circuit through the Studio Environment
        // Sweeping Lissajous figure-8 flight circuit around the studio space
        const flightOrbitX = Math.sin(ft * 1.15) * 1.35;
        const flightOrbitZ = Math.sin(ft * 2.30) * 0.90;
        const flightOrbitY = 0.95 + Math.sin(ft * 1.6) * 0.16;

        // Velocity vector & Speed
        const vx = Math.cos(ft * 1.15) * 1.15 * 1.35;
        const vz = Math.cos(ft * 2.30) * 2.30 * 0.90;
        const vy = Math.cos(ft * 1.6) * 1.6 * 0.16;
        const speed = Math.sqrt(vx * vx + vz * vz);

        // Position: elevated clearance above ground and traveling along circuit
        clonedScene.position.set(
          flightOrbitX * fb,
          flightOrbitY * fb,
          flightOrbitZ * fb
        );

        // Heading yaw: faces directly into travel vector
        const headingYaw = Math.atan2(vx, vz);
        let deltaYaw = headingYaw - lastYawRef.current;
        while (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
        while (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;
        lastYawRef.current = headingYaw;

        const rawTurnRate = delta > 0 ? deltaYaw / delta : 0;
        turnRateRef.current = THREE.MathUtils.lerp(turnRateRef.current, rawTurnRate, Math.min(1, delta * 6.0));
        const turnRate = turnRateRef.current;

        // Aerodynamic bank into turn (roll around Z)
        const bankAngle = THREE.MathUtils.clamp(-turnRate * 0.28, -0.42, 0.42);

        // Pitch (lean forward horizontally into flight with climb/dive response)
        const pitchAngle = 1.12 + THREE.MathUtils.clamp(vy * 0.35, -0.22, 0.22);

        clonedScene.rotation.set(
          pitchAngle * fb,
          headingYaw * fb,
          bankAngle * fb
        );

        // 2. Heroic Superman Flight Pose Bones
        if (spine) {
          spine.rotation.x = 0.15 * fb;
        }
        if (chest) {
          // Proud chest: arching upward/forward so the shield emblem remains fully visible and faces forward!
          chest.rotation.x = -0.18 * fb;
          chest.rotation.y = turnRate * 0.05 * fb;
        }
        if (head) {
          // Head tilted up to look directly forward along the flight path
          head.rotation.x = (-0.58 + Math.sin(ft * 12) * 0.015) * fb;
          head.rotation.y = -turnRate * 0.08 * fb;
        }
        if (uar) {
          // Right arm: Leading heroic Superman fist extended straight forward!
          uar.rotation.set(
            (-1.42 + Math.sin(ft * 14) * 0.02) * fb,
            (-0.25 - turnRate * 0.05) * fb,
            (0.32 + Math.cos(ft * 10) * 0.015) * fb
          );
        }
        if (lar) {
          lar.rotation.set(0.08 * fb, 0, 0);
        }
        if (ual) {
          // Left arm: Stabilizing arm streamlined back along left flank
          ual.rotation.set(
            (0.48 + Math.sin(ft * 10) * 0.02) * fb,
            (-0.22 + turnRate * 0.04) * fb,
            (-0.38) * fb
          );
        }
        if (lal) {
          lal.rotation.set(0.32 * fb, 0, 0);
        }
        if (ull) {
          // Trailing left leg
          ull.rotation.set(
            (-0.26 + Math.sin(ft * 8) * 0.02) * fb,
            0.08 * fb,
            (-0.12 - turnRate * 0.04) * fb
          );
        }
        if (ulr) {
          // Trailing right leg
          ulr.rotation.set(
            (-0.22 - Math.sin(ft * 8) * 0.02) * fb,
            -0.08 * fb,
            (0.12 - turnRate * 0.04) * fb
          );
        }
        if (lll) {
          lll.rotation.set(0.28 * fb, 0, 0);
        }
        if (llr) {
          llr.rotation.set(0.24 * fb, 0, 0);
        }
        if (footl) {
          footl.rotation.set(0.42 * fb, 0, 0);
        }
        if (footr) {
          footr.rotation.set(0.38 * fb, 0, 0);
        }

        // 3. Dynamic Cape Cloth Dynamics Simulation
        if (capeMeshRef.current && baseCapePositionsRef.current) {
          const posAttr = capeMeshRef.current.geometry.attributes.position;
          const posArray = posAttr.array;
          const baseArray = baseCapePositionsRef.current;
          const vertCount = posAttr.count;

          // Airflow speed
          const flightSpeedNorm = THREE.MathUtils.clamp(speed / 2.5, 0, 1) * fb;
          filteredSpeedRef.current = THREE.MathUtils.lerp(
            filteredSpeedRef.current,
            flightSpeedNorm,
            Math.min(1, delta * 5.0)
          );
          const s = filteredSpeedRef.current;

          // Inertial deceleration overshoot
          if (s < filteredSpeedRef.current - 0.01) {
            overshootRef.current = THREE.MathUtils.lerp(overshootRef.current, 1.0, delta * 6.0);
          } else {
            overshootRef.current = THREE.MathUtils.lerp(overshootRef.current, 0.0, delta * 3.5);
          }
          const overshoot = overshootRef.current;

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

            // A. Airflow backward stream & lift relative to flight travel
            const streamZ = -s * 0.42 * Math.pow(vNorm, 1.6);
            const liftY = s * 0.22 * Math.pow(vNorm, 1.8);

            // B. Traveling layered waves from shoulders to trailing edge
            const phi1 = waveTime * (14 * s + 2.5) - vNorm * 5.5;
            const phi2 = waveTime * (26 * s + 5.0) - vNorm * 11.5 + x0 * 4.0;

            const wave1 = Math.sin(phi1) * (0.09 * s + 0.016) * vFactor;
            const wave2 = Math.sin(phi2) * (0.03 * s + 0.005) * Math.pow(vNorm, 2.0);
            const edgeFlutter = Math.cos(phi2 * 1.3) * 0.025 * s * edgeFactor * Math.pow(vNorm, 1.8);
            const spanFolds = Math.cos(x0 * 7.5) * (0.02 * s + 0.006) * vNorm;

            // C. Centrifugal lag & turn swing outward
            const turnSwingX = -turnRate * 0.32 * Math.pow(vNorm, 1.8) * fb;

            // D. Deceleration overshoot & gravity settling
            const inertiaZ = overshoot * 0.05 * vFactor;

            // E. Idle breathing sway under gravity
            const idleZ = (1 - s) * Math.sin(waveTime * 2.2 + x0 * 2.0) * 0.020 * Math.pow(vNorm, 2.0);
            const idleX = (1 - s) * Math.cos(waveTime * 1.6) * 0.012 * Math.pow(vNorm, 2.0);

            posArray[idx] = x0 + turnSwingX + idleX;
            posArray[idx + 1] = y0 + liftY;
            posArray[idx + 2] = z0 + streamZ + wave1 + wave2 + edgeFlutter + spanFolds + inertiaZ + idleZ;
          }

          posAttr.needsUpdate = true;
          capeMeshRef.current.geometry.computeVertexNormals();
        }

        // 4. Hair & Front S-Curl Secondary Response
        if (headMeshRef.current && baseHeadPositionsRef.current) {
          const headPosAttr = headMeshRef.current.geometry.attributes.position;
          const headPosArray = headPosAttr.array;
          const baseHeadArray = baseHeadPositionsRef.current;
          const s = filteredSpeedRef.current;
          const waveTime = clock.getElapsedTime();

          // S-curl vertices (indices 727 to 783)
          for (let i = 727; i < 784; i++) {
            const idx = i * 3;
            const x0 = baseHeadArray[idx];
            const y0 = baseHeadArray[idx + 1];
            const z0 = baseHeadArray[idx + 2];

            const d = THREE.MathUtils.clamp((1.97 - y0) / 0.225, 0, 1);
            const d2 = d * d;

            const curlZ = -s * 0.008 * d2 + Math.sin(waveTime * 16 + d * 3.5) * 0.0035 * s * d2;
            const curlX = Math.cos(waveTime * 12) * 0.0025 * s * d2;

            headPosArray[idx] = x0 + curlX;
            headPosArray[idx + 1] = y0;
            headPosArray[idx + 2] = z0 + curlZ;
          }

          headPosAttr.needsUpdate = true;
          headMeshRef.current.geometry.computeVertexNormals();
        }

        // Ground shadow tracking
        if (shadowRef.current) {
          shadowRef.current.position.set(clonedScene.position.x, 0.015, clonedScene.position.z + 0.04);
          if (shadowRef.current.material) {
            shadowRef.current.material.opacity = THREE.MathUtils.lerp(0.42, 0.18, fb);
          }
          const scale = 1 + fb * 0.65;
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
    }"""

# 5. Shadow ref in JSX
target_5 = """      {/* Ground contact shadow disc right above podium surface */}
      <mesh position={[0, 0.015, 0.04]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[vehicle ? 0.95 : 0.55, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.42} />
      </mesh>"""

replacement_5 = """      {/* Ground contact shadow disc right above podium surface */}
      <mesh ref={shadowRef} position={[0, 0.015, 0.04]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[vehicle ? 0.95 : 0.55, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.42} />
      </mesh>"""

# 6. Camera tracking in CharacterScene
target_6 = """  // Handle zoom in / out button clicks
  useEffect(() => {
    if (zoomAction?.count > 0 && controlsRef.current) {
      if (zoomAction.delta < 0) {
        controlsRef.current.dollyIn(1.2);
      } else {
        controlsRef.current.dollyOut(1.2);
      }
      controlsRef.current.update();
    }
  }, [zoomAction]);"""

replacement_6 = """  // Handle zoom in / out button clicks
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

  // ASC Cinematography: Camera smoothly follows Superman's aerial movement with organic damping
  useFrame(({ clock }, delta) => {
    if (!controlsRef.current) return;
    if (characterData?.id === 'superman' && characterData?.isDrivingMode) {
      const t = clock.getElapsedTime();
      const targetX = Math.sin(t * 1.15) * 0.45;
      const targetY = 0.15 + 0.35;
      const targetZ = Math.sin(t * 2.30) * 0.30;
      controlsRef.current.target.lerp(new THREE.Vector3(targetX, targetY, targetZ), Math.min(1, delta * 3.5));
      controlsRef.current.update();
    } else {
      if (controlsRef.current.target.distanceTo(new THREE.Vector3(0, 0.15, 0)) > 0.001) {
        controlsRef.current.target.lerp(new THREE.Vector3(0, 0.15, 0), Math.min(1, delta * 4.0));
        controlsRef.current.update();
      }
    }
  });"""

for i, (t, r) in enumerate([
    (target_1, replacement_1),
    (target_2, replacement_2),
    (target_3, replacement_3),
    (target_4, replacement_4),
    (target_5, replacement_5),
    (target_6, replacement_6)
]):
    if t in code_norm:
        code_norm = code_norm.replace(t, r, 1)
        print(f"Applied replacement {i+1}")
    else:
        print(f"WARNING: target {i+1} NOT FOUND!")

# Write back
if is_crlf:
    code_final = code_norm.replace('\n', '\r\n')
else:
    code_final = code_norm

with open(file_path, 'w', encoding='utf-8', newline='') as f:
    f.write(code_final)

print("CharacterViewer.jsx updated successfully!")
