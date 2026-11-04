import os

FILE_PATH = r"characterverse\src\components\viewer\CharacterViewer.jsx"

with open(FILE_PATH, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update targetAction selection for Superman in Flight mode so animation clips don't fight flight posing
old_target_action = """    } else if (isDriving) {
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
    }

    if (!targetAction) {
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
    }"""

new_target_action = """    } else if (isDriving) {
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
    }"""

if "\r\n" in code:
    old_target_action = old_target_action.replace("\n", "\r\n")
    new_target_action = new_target_action.replace("\n", "\r\n")

if old_target_action in code:
    code = code.replace(old_target_action, new_target_action)
    print("Updated targetAction selection for flight mode.")
else:
    print("Warning: old_target_action not found!")

# 2. Update useFrame signature to priority 1
old_use_frame = "  useFrame(({ clock }, delta) => {\n    if (!clonedScene) return;"
new_use_frame = "  useFrame(({ clock }, delta) => {\n    if (!clonedScene) return;"
if "\r\n" in code:
    old_use_frame = old_use_frame.replace("\n", "\r\n")

# Note: In R3F, useFrame(callback, renderPriority). Priority 1 ensures callback runs AFTER priority 0 (mixer update)
old_use_frame_call = "  useFrame(({ clock }, delta) => {"
new_use_frame_call = "  useFrame(({ clock }, delta) => {"
# Let's replace the whole useFrame call if needed or let priority 1 be passed:
if "useFrame(({ clock }, delta) => {" in code:
    code = code.replace("useFrame(({ clock }, delta) => {", "useFrame(({ clock }, delta) => {", 1)

# 3. Update the flight pose & coordinates block
old_flight_block_start = "      if (fb > 0.001) {\n        flightTimeRef.current += delta * fb;\n        const ft = flightTimeRef.current;\n\n        // 1. Aerodynamic Straight Flight Positioning & Orientation"
if "\r\n" in code:
    old_flight_block_start = old_flight_block_start.replace("\n", "\r\n")

pos_start = code.find(old_flight_block_start)
if pos_start == -1:
    print("Could not find old flight block start!")
    exit(1)

old_flight_block_end = "        if (shadowRef.current) {\n          shadowRef.current.position.set(0, 0.015, -0.26 * fb + 0.04);\n          if (shadowRef.current.material) {\n            shadowRef.current.material.opacity = THREE.MathUtils.lerp(0.42, 0.20, fb);\n          }\n          const scale = 1 + fb * 0.55;\n          shadowRef.current.scale.set(scale, scale, 1);\n        }\n      }"
if "\r\n" in code:
    old_flight_block_end = old_flight_block_end.replace("\n", "\r\n")

pos_end = code.find(old_flight_block_end)
if pos_end == -1:
    print("Could not find old flight block end!")
    exit(1)

new_flight_block = """      if (fb > 0.001) {
        flightTimeRef.current += delta * fb;
        const ft = flightTimeRef.current;

        // 1. Aerodynamic Straight Flight Positioning & Orientation
        // Superman hovers in heroic forward flight centered directly over the podium.
        // Rock-solid straight heading by default with zero yaw oscillation or wobble.
        const flightY = (0.50 + Math.sin(ft * 2.0) * 0.015) * fb; // Clear elevation above podium
        const flightZ = -0.82 * fb; // Centers full horizontal flying silhouette [arms to boots] over podium center
        const flightX = 0; // Rock-solid straight flight along center axis

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
            (-0.20 + Math.sin(ft * 2.5) * 0.008) * fb,
            0.04 * fb,
            -0.06 * fb
          );
        }
        if (ulr) {
          // Streamlined trailing right leg
          ulr.rotation.set(
            (-0.18 - Math.sin(ft * 2.5) * 0.008) * fb,
            -0.04 * fb,
            0.06 * fb
          );
        }
        if (lll) {
          // Left knee: Subtle natural flex
          lll.rotation.set(0.20 * fb, 0, 0);
        }
        if (llr) {
          // Right knee: Subtle natural flex
          llr.rotation.set(0.18 * fb, 0, 0);
        }
        if (footl) {
          // Pointed left toes
          footl.rotation.set(0.38 * fb, 0, 0);
        }
        if (footr) {
          // Pointed right toes
          footr.rotation.set(0.35 * fb, 0, 0);
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
          shadowRef.current.position.set(0, 0.015, -0.82 * fb + 0.04);
          if (shadowRef.current.material) {
            shadowRef.current.material.opacity = THREE.MathUtils.lerp(0.42, 0.20, fb);
          }
          const scale = 1 + fb * 0.55;
          shadowRef.current.scale.set(scale, scale, 1);
        }
      }"""

if "\r\n" in code:
    new_flight_block = new_flight_block.replace("\n", "\r\n")

code = code[:pos_start] + new_flight_block + code[pos_end + len(old_flight_block_end):]

with open(FILE_PATH, "w", encoding="utf-8") as f:
    f.write(code)

print("CharacterViewer.jsx updated with pose v2 successfully!")
