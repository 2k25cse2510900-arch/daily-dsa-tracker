import os

FILE_PATH = r"characterverse\src\components\viewer\CharacterViewer.jsx"

with open(FILE_PATH, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Replace the flight simulation block
old_start = "      if (fb > 0.001) {\n        flightTimeRef.current += delta * fb;\n        const ft = flightTimeRef.current;\n\n        // 1. Aerodynamic 3D Flight Circuit through the Studio Environment"
if old_start not in code:
    # Try with CRLF
    old_start = old_start.replace("\n", "\r\n")

pos_start = code.find(old_start)
if pos_start == -1:
    print("Could not find start marker for flight block!")
    exit(1)

old_end_marker = "        if (shadowRef.current) {\n          shadowRef.current.position.set(clonedScene.position.x, 0.015, clonedScene.position.z + 0.04);\n          if (shadowRef.current.material) {\n            shadowRef.current.material.opacity = THREE.MathUtils.lerp(0.42, 0.18, fb);\n          }\n          const scale = 1 + fb * 0.65;\n          shadowRef.current.scale.set(scale, scale, 1);\n        }\n      }"
if old_end_marker not in code:
    old_end_marker = old_end_marker.replace("\n", "\r\n")

pos_end = code.find(old_end_marker)
if pos_end == -1:
    print("Could not find end marker for flight block!")
    exit(1)

new_flight_block = """      if (fb > 0.001) {
        flightTimeRef.current += delta * fb;
        const ft = flightTimeRef.current;

        // 1. Aerodynamic Straight Flight Positioning & Orientation
        // Superman maintains a consistent, straight flight heading by default with zero oscillation,
        // no circular/elliptical drifting, and no random yaw or banking.
        const flightY = (0.44 + Math.sin(ft * 2.0) * 0.015) * fb; // Clear elevation above podium
        const flightZ = -0.26 * fb; // Centers horizontal flying silhouette [arms to boots] over podium
        const flightX = 0; // Rock-solid straight line along center axis

        clonedScene.position.set(flightX, flightY, flightZ);

        // Horizontal forward pitch leans torso horizontally into heroic forward flight
        // Facing direction is strictly straight forward along Z-axis; banking is strictly 0
        const pitchAngle = 0.98 * fb;
        const headingYaw = 0;
        const bankAngle = 0;

        clonedScene.rotation.set(pitchAngle, headingYaw, bankAngle, 'YXZ');

        // 2. Heroic Superman Flight Pose — BOTH Arms Extended Forward Level with Shoulders
        if (spine) {
          spine.rotation.x = 0.12 * fb;
        }
        if (chest) {
          // Proud chest: arching upward so the solid 3D S-shield emblem faces key light and camera
          chest.rotation.x = -0.28 * fb;
          chest.rotation.y = 0;
          chest.rotation.z = 0;
        }
        if (head) {
          // Head tilted up to look directly forward along the flight path; face clearly visible
          head.rotation.x = (-0.68 + Math.sin(ft * 2.0) * 0.01) * fb;
          head.rotation.y = 0;
          head.rotation.z = 0;
        }
        if (uar) {
          // Right arm: Leading heroic Superman fist extended straight forward level with shoulder
          uar.rotation.set(
            (-1.44 + Math.sin(ft * 3.5) * 0.008) * fb,
            -0.18 * fb,
            (0.20 + Math.cos(ft * 2.5) * 0.006) * fb
          );
        }
        if (lar) {
          // Right forearm: Straight and level with upper arm
          lar.rotation.set(0.06 * fb, 0, 0);
        }
        if (ual) {
          // Left arm: Extended straight forward level with shoulder, mirroring right arm
          ual.rotation.set(
            (-1.38 + Math.sin(ft * 3.5) * 0.008) * fb,
            0.18 * fb,
            (-0.20 - Math.cos(ft * 2.5) * 0.006) * fb
          );
        }
        if (lal) {
          // Left forearm: Straight and level with upper arm
          lal.rotation.set(0.06 * fb, 0, 0);
        }
        if (ull) {
          // Streamlined trailing left leg
          ull.rotation.set(
            (-0.24 + Math.sin(ft * 2.5) * 0.008) * fb,
            0.06 * fb,
            -0.08 * fb
          );
        }
        if (ulr) {
          // Streamlined trailing right leg
          ulr.rotation.set(
            (-0.20 - Math.sin(ft * 2.5) * 0.008) * fb,
            -0.06 * fb,
            0.08 * fb
          );
        }
        if (lll) {
          // Left knee: Subtle natural flex
          lll.rotation.set(0.24 * fb, 0, 0);
        }
        if (llr) {
          // Right knee: Subtle natural flex
          llr.rotation.set(0.20 * fb, 0, 0);
        }
        if (footl) {
          // Pointed left toes
          footl.rotation.set(0.48 * fb, 0, 0);
        }
        if (footr) {
          // Pointed right toes
          footr.rotation.set(0.44 * fb, 0, 0);
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
            const streamZ = -0.28 * s * Math.pow(vNorm, 1.4);
            const liftY = 0.06 * s * Math.pow(vNorm, 1.6);

            // Traveling layered aerodynamic waves from shoulders to hem
            const phi1 = waveTime * 8.5 - vNorm * 5.0;
            const phi2 = waveTime * 15.0 - vNorm * 9.5 + x0 * 3.0;

            const wave1 = Math.sin(phi1) * 0.040 * s * vFactor;
            const wave2 = Math.sin(phi2) * 0.015 * s * Math.pow(vNorm, 1.8);
            const edgeFlutter = Math.cos(phi2 * 1.2) * 0.012 * s * edgeFactor * Math.pow(vNorm, 1.6);
            const spanFolds = Math.cos(x0 * 6.0) * 0.010 * s * vNorm;

            // Idle breathing sway when not in flight
            const idleZ = (1 - s) * Math.sin(waveTime * 2.2 + x0 * 2.0) * 0.018 * Math.pow(vNorm, 2.0);
            const idleX = (1 - s) * Math.cos(waveTime * 1.6) * 0.010 * Math.pow(vNorm, 2.0);

            // Subtle lateral ripple (keeps cape strictly behind legs, never obscuring thighs/boots)
            const flutterX = Math.sin(waveTime * 5.0 + vNorm * 2.5) * 0.012 * s * Math.pow(vNorm, 1.5);

            posArray[idx] = x0 + flutterX + idleX;
            posArray[idx + 1] = y0 + liftY;
            posArray[idx + 2] = (z0 - 0.06 * s) + streamZ + wave1 + wave2 + edgeFlutter + spanFolds + idleZ;
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
          shadowRef.current.position.set(0, 0.015, -0.26 * fb + 0.04);
          if (shadowRef.current.material) {
            shadowRef.current.material.opacity = THREE.MathUtils.lerp(0.42, 0.20, fb);
          }
          const scale = 1 + fb * 0.55;
          shadowRef.current.scale.set(scale, scale, 1);
        }
      }"""

if "\r\n" in code:
    new_flight_block = new_flight_block.replace("\n", "\r\n")

code = code[:pos_start] + new_flight_block + code[pos_end + len(old_end_marker):]

# 2. Replace camera target tracking in CharacterScene
old_cam_target = """  // ASC Cinematography: Camera smoothly follows Superman's aerial movement with organic damping
  useFrame(({ clock }, delta) => {
    if (!controlsRef.current) return;
    if (characterData?.id === 'superman' && characterData?.isDrivingMode) {
      const t = clock.getElapsedTime();
      // Gentle cinematic tracking following aerial flight centroid with organic damping (ASC Henry Braham)
      const targetX = Math.sin(t * 1.15) * 0.14;
      const targetY = 0.16 + Math.sin(t * 1.6) * 0.04;
      const targetZ = Math.sin(t * 2.30) * 0.08;
      controlsRef.current.target.lerp(new THREE.Vector3(targetX, targetY, targetZ), Math.min(1, delta * 2.5));
      controlsRef.current.update();
    } else {
      if (controlsRef.current.target.distanceTo(new THREE.Vector3(0, 0.15, 0)) > 0.001) {
        controlsRef.current.target.lerp(new THREE.Vector3(0, 0.15, 0), Math.min(1, delta * 4.0));
        controlsRef.current.update();
      }
    }
  });"""

new_cam_target = """  // Camera smooth targeting centered on character
  useFrame(({ clock }, delta) => {
    if (!controlsRef.current) return;
    const isFlight = characterData?.id === 'superman' && characterData?.isDrivingMode;
    const targetY = isFlight ? 0.20 : 0.15;
    const targetZ = isFlight ? -0.12 : 0;
    const desiredTarget = new THREE.Vector3(0, targetY, targetZ);
    if (controlsRef.current.target.distanceTo(desiredTarget) > 0.001) {
      controlsRef.current.target.lerp(desiredTarget, Math.min(1, delta * 4.0));
      controlsRef.current.update();
    }
  });"""

if "\r\n" in code:
    old_cam_target = old_cam_target.replace("\n", "\r\n")
    new_cam_target = new_cam_target.replace("\n", "\r\n")

if old_cam_target in code:
    code = code.replace(old_cam_target, new_cam_target)
    print("Replaced camera targeting in CharacterScene.")
else:
    print("Warning: old_cam_target not found in code!")

# 3. Adjust Canvas camera distance
old_canvas_cam = "camera={{ position: [0, 0.8, 3.8], fov: 42 }}"
new_canvas_cam = "camera={{ position: [0, 0.75, 4.2], fov: 42 }}"
if old_canvas_cam in code:
    code = code.replace(old_canvas_cam, new_canvas_cam)
    print("Updated Canvas camera position to [0, 0.75, 4.2].")
else:
    print("Note: old_canvas_cam string not matched exactly.")

with open(FILE_PATH, "w", encoding="utf-8") as f:
    f.write(code)

print("CharacterViewer.jsx successfully patched!")
