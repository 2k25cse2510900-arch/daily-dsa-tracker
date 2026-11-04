import os

FILE_PATH = r"characterverse\src\components\viewer\CharacterViewer.jsx"

with open(FILE_PATH, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update flight positioning: flightY = 0.62, flightZ = -1.10
old_flight_pos = """        // 1. Aerodynamic Straight Flight Positioning & Orientation
        // Superman hovers in heroic forward flight centered directly over the podium.
        // Rock-solid straight heading by default with zero yaw oscillation or wobble.
        const flightY = (0.50 + Math.sin(ft * 2.0) * 0.015) * fb; // Clear elevation above podium
        const flightZ = -0.82 * fb; // Centers full horizontal flying silhouette [arms to boots] over podium center
        const flightX = 0; // Rock-solid straight flight along center axis"""

new_flight_pos = """        // 1. Aerodynamic Straight Flight Positioning & Orientation
        // Superman hovers in heroic forward flight centered directly over the podium.
        // Rock-solid straight heading by default with zero yaw oscillation or wobble.
        const flightY = (0.62 + Math.sin(ft * 2.0) * 0.015) * fb; // Elevated clearance above podium
        const flightZ = -1.10 * fb; // Centered horizontal silhouette [hands to boots] over podium center
        const flightX = 0; // Rock-solid straight flight along center axis"""

if "\r\n" in code:
    old_flight_pos = old_flight_pos.replace("\n", "\r\n")
    new_flight_pos = new_flight_pos.replace("\n", "\r\n")

if old_flight_pos in code:
    code = code.replace(old_flight_pos, new_flight_pos)
    print("Flight position updated.")
else:
    print("Warning: old_flight_pos not found!")

# 2. Update ground shadow position
old_shadow = "shadowRef.current.position.set(0, 0.015, -0.82 * fb + 0.04);"
new_shadow = "shadowRef.current.position.set(0, 0.015, -0.05 * fb + 0.04);"
if old_shadow in code:
    code = code.replace(old_shadow, new_shadow)
    print("Ground shadow position updated.")

# 3. Update camera target in CharacterScene
old_cam_target = """  // Camera smooth targeting centered on character
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

new_cam_target = """  // Camera smooth targeting centered on character
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
  });"""

if "\r\n" in code:
    old_cam_target = old_cam_target.replace("\n", "\r\n")
    new_cam_target = new_cam_target.replace("\n", "\r\n")

if old_cam_target in code:
    code = code.replace(old_cam_target, new_cam_target)
    print("Camera targeting in CharacterScene updated.")

# 4. Update initial camera positions in CharacterViewer
old_cam_preset = """  const viewParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('view') : null;
  const initialCamPos = useMemo(() => {
    if (viewParam === 'side') return [4.2, 0.35, 0];
    if (viewParam === 'rear') return [2.4, 0.75, -3.8];
    if (viewParam === 'threequarter') return [1.8, 0.70, 3.6];
    return [0, 0.65, 4.2];
  }, [viewParam]);"""

new_cam_preset = """  const viewParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('view') : null;
  const initialCamPos = useMemo(() => {
    if (viewParam === 'side') return [4.6, 0.28, 0];
    if (viewParam === 'rear') return [2.5, 0.75, -4.2];
    if (viewParam === 'threequarter') return [2.2, 0.75, 4.0];
    return [0, 0.65, 4.4];
  }, [viewParam]);"""

if "\r\n" in code:
    old_cam_preset = old_cam_preset.replace("\n", "\r\n")
    new_cam_preset = new_cam_preset.replace("\n", "\r\n")

if old_cam_preset in code:
    code = code.replace(old_cam_preset, new_cam_preset)
    print("Initial camera presets updated.")

with open(FILE_PATH, "w", encoding="utf-8") as f:
    f.write(code)

print("CharacterViewer.jsx centered updates written!")
