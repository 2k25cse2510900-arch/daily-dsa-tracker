import os

viewer_path = r"characterverse\src\components\viewer\CharacterViewer.jsx"
with open(viewer_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace flight orbit amplitudes in GLBCharacter
old_flight_coords = """        // 1. Aerodynamic 3D Flight Circuit through the Studio Environment
        // Sweeping Lissajous figure-8 flight circuit around the studio space
        const flightOrbitX = Math.sin(ft * 1.15) * 1.35;
        const flightOrbitZ = Math.sin(ft * 2.30) * 0.90;
        const flightOrbitY = 0.95 + Math.sin(ft * 1.6) * 0.16;

        // Velocity vector & Speed
        const vx = Math.cos(ft * 1.15) * 1.15 * 1.35;
        const vz = Math.cos(ft * 2.30) * 2.30 * 0.90;
        const vy = Math.cos(ft * 1.6) * 1.6 * 0.16;"""

new_flight_coords = """        // 1. Aerodynamic 3D Flight Circuit through the Studio Environment
        // Sweeping Lissajous figure-8 flight circuit around the studio space
        const flightOrbitX = Math.sin(ft * 1.15) * 0.46;
        const flightOrbitZ = Math.sin(ft * 2.30) * 0.30;
        const flightOrbitY = 0.68 + Math.sin(ft * 1.6) * 0.12;

        // Velocity vector & Speed
        const vx = Math.cos(ft * 1.15) * 1.15 * 0.46;
        const vz = Math.cos(ft * 2.30) * 2.30 * 0.30;
        const vy = Math.cos(ft * 1.6) * 1.6 * 0.12;"""

assert old_flight_coords in content, "Could not find old_flight_coords"
content = content.replace(old_flight_coords, new_flight_coords)

# Replace target tracking in CharacterScene
old_scene_target = """    if (characterData?.id === 'superman' && characterData?.isDrivingMode) {
      const t = clock.getElapsedTime();
      const targetX = Math.sin(t * 1.15) * 0.45;
      const targetY = 0.15 + 0.35;
      const targetZ = Math.sin(t * 2.30) * 0.30;
      controlsRef.current.target.lerp(new THREE.Vector3(targetX, targetY, targetZ), Math.min(1, delta * 3.5));
      controlsRef.current.update();
    }"""

new_scene_target = """    if (characterData?.id === 'superman' && characterData?.isDrivingMode) {
      const t = clock.getElapsedTime();
      const targetX = Math.sin(t * 1.15) * 0.20;
      const targetY = 0.15 + 0.35;
      const targetZ = Math.sin(t * 2.30) * 0.14;
      controlsRef.current.target.lerp(new THREE.Vector3(targetX, targetY, targetZ), Math.min(1, delta * 3.5));
      controlsRef.current.update();
    }"""

assert old_scene_target in content, "Could not find old_scene_target"
content = content.replace(old_scene_target, new_scene_target)

with open(viewer_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated CharacterViewer.jsx successfully")
