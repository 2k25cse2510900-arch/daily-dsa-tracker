import re

viewer_path = r"characterverse\src\components\viewer\CharacterViewer.jsx"
with open(viewer_path, "r", encoding="utf-8") as f:
    code = f.read()

# Update flight orbit kinematics
old_kinematics = """        // 1. Aerodynamic 3D Flight Circuit through the Studio Environment
        // Sweeping Lissajous figure-8 flight circuit around the studio space
        const flightOrbitX = Math.sin(ft * 1.15) * 0.46;
        const flightOrbitZ = Math.sin(ft * 2.30) * 0.30;
        const flightOrbitY = 0.68 + Math.sin(ft * 1.6) * 0.12;

        // Velocity vector & Speed
        const vx = Math.cos(ft * 1.15) * 1.15 * 0.46;
        const vz = Math.cos(ft * 2.30) * 2.30 * 0.30;
        const vy = Math.cos(ft * 1.6) * 1.6 * 0.12;
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
        const pitchAngle = 1.12 + THREE.MathUtils.clamp(vy * 0.35, -0.22, 0.22);"""

new_kinematics = """        // 1. Aerodynamic 3D Flight Circuit through the Studio Environment
        // Sweeping Lissajous figure-8 flight circuit around the studio space
        const flightOrbitX = Math.sin(ft * 1.15) * 0.34;
        const flightOrbitZ = Math.sin(ft * 2.30) * 0.20;
        const flightOrbitY = 0.44 + Math.sin(ft * 1.6) * 0.08;

        // Velocity vector & Speed
        const vx = Math.cos(ft * 1.15) * 1.15 * 0.34;
        const vz = Math.cos(ft * 2.30) * 2.30 * 0.20;
        const vy = Math.cos(ft * 1.6) * 1.6 * 0.08;
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
        const bankAngle = THREE.MathUtils.clamp(-turnRate * 0.25, -0.38, 0.38);

        // Pitch (heroic horizontal flight stream angled so chest emblem stays proud and visible)
        const pitchAngle = 0.96 + THREE.MathUtils.clamp(vy * 0.35, -0.15, 0.15);"""

assert old_kinematics in code, "old_kinematics not found"
code = code.replace(old_kinematics, new_kinematics)

# Update chest arch
old_chest = """        if (chest) {
          // Proud chest: arching upward/forward so the shield emblem remains fully visible and faces forward!
          chest.rotation.x = -0.18 * fb;
          chest.rotation.y = turnRate * 0.05 * fb;
        }"""

new_chest = """        if (chest) {
          // Proud chest: arching upward/forward so the shield emblem remains fully visible and faces forward!
          chest.rotation.x = -0.24 * fb;
          chest.rotation.y = turnRate * 0.06 * fb;
        }"""

assert old_chest in code, "old_chest not found"
code = code.replace(old_chest, new_chest)

# Update CharacterScene camera tracking
old_cam_tracking = """    if (characterData?.id === 'superman' && characterData?.isDrivingMode) {
      const t = clock.getElapsedTime();
      // Gentle cinematic tracking following aerial flight centroid with organic damping (ASC Henry Braham)
      const targetX = Math.sin(t * 1.15) * 0.18;
      const targetY = 0.28 + Math.sin(t * 1.6) * 0.05;
      const targetZ = Math.sin(t * 2.30) * 0.10;
      controlsRef.current.target.lerp(new THREE.Vector3(targetX, targetY, targetZ), Math.min(1, delta * 2.5));
      controlsRef.current.update();
    } else {
      if (controlsRef.current.target.distanceTo(new THREE.Vector3(0, 0.15, 0)) > 0.001) {
        controlsRef.current.target.lerp(new THREE.Vector3(0, 0.15, 0), Math.min(1, delta * 4.0));
        controlsRef.current.update();
      }
    }"""

new_cam_tracking = """    if (characterData?.id === 'superman' && characterData?.isDrivingMode) {
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
    }"""

assert old_cam_tracking in code, "old_cam_tracking not found"
code = code.replace(old_cam_tracking, new_cam_tracking)

with open(viewer_path, "w", encoding="utf-8") as f:
    f.write(code)

print("CharacterViewer.jsx updated with refined flight kinematics and framing.")
