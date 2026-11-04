import os
import re

# 1. Update StudioControls.jsx
controls_path = 'characterverse/src/components/panels/StudioControls.jsx'
with open(controls_path, 'r', encoding='utf-8') as f:
    controls_code = f.read()

old_controls = """          label={
            selectedCharacter.vehicle
              ? isDrivingMode
                ? `Ride: ${selectedCharacter.vehicle.name} (Active)`
                : `Ride: ${selectedCharacter.vehicle.name}`
              : isDrivingMode
              ? 'Run Mode (Active)'
              : 'Test Run'
          }
          onClick={toggleDrivingMode}
          active={isDrivingMode}
          title={
            selectedCharacter.vehicle
              ? `Toggle animated driving motion for ${selectedCharacter.vehicle.name}`
              : 'Toggle character running test animation'
          }"""

new_controls = """          label={
            selectedCharacter.vehicle
              ? isDrivingMode
                ? `Ride: ${selectedCharacter.vehicle.name} (Active)`
                : `Ride: ${selectedCharacter.vehicle.name}`
              : selectedCharacter.id === 'superman'
              ? isDrivingMode
                ? 'Flight Mode (Active)'
                : 'Test Flight'
              : isDrivingMode
              ? 'Run Mode (Active)'
              : 'Test Run'
          }
          onClick={toggleDrivingMode}
          active={isDrivingMode}
          title={
            selectedCharacter.vehicle
              ? `Toggle animated driving motion for ${selectedCharacter.vehicle.name}`
              : selectedCharacter.id === 'superman'
              ? 'Toggle Superman heroic flight test animation'
              : 'Toggle character running test animation'
          }"""

if old_controls in controls_code:
    controls_code = controls_code.replace(old_controls, new_controls, 1)
    with open(controls_path, 'w', encoding='utf-8', newline='') as f:
        f.write(controls_code)
    print("Updated StudioControls.jsx")
else:
    print("WARNING: Could not find target in StudioControls.jsx")

# 2. Update StudioContext.jsx
context_path = 'characterverse/src/context/StudioContext.jsx'
with open(context_path, 'r', encoding='utf-8') as f:
    context_code = f.read()

old_toast = """  const toggleDrivingMode = () => {
    setIsDrivingMode((prev) => {
      const next = !prev;
      showToast(next ? 'Active Run & Drive Mode enabled' : 'Returned to Idle Showcase', 'info');
      return next;
    });
  };"""

new_toast = """  const toggleDrivingMode = () => {
    setIsDrivingMode((prev) => {
      const next = !prev;
      const isSuperman = selectedCharacter?.id === 'superman';
      const msg = next
        ? isSuperman
          ? 'Superman Flight Mode activated'
          : 'Active Run & Drive Mode enabled'
        : 'Returned to Idle Showcase';
      showToast(msg, 'info');
      return next;
    });
  };"""

if old_toast in context_code:
    context_code = context_code.replace(old_toast, new_toast, 1)
    with open(context_path, 'w', encoding='utf-8', newline='') as f:
        f.write(context_code)
    print("Updated StudioContext.jsx")
else:
    print("WARNING: Could not find target in StudioContext.jsx")

# 3. Update RaceArena.jsx
arena_path = 'characterverse/src/components/arena/RaceArena.jsx'
with open(arena_path, 'r', encoding='utf-8') as f:
    arena_code = f.read()

old_arena_grounding = """    // Grounding: characters stand cleanly above the grass surface on all slopes (+0.08 clearance)
    groupRef.current.position.set(worldX, terrainHeight + 0.08 + strideBob, laneZ);

    // Facing right (+X) with natural hill incline pitch
    const slopePitch = Math.atan(slope) * 0.65;
    groupRef.current.rotation.set(0, Math.PI / 2, slopePitch);"""

new_arena_grounding = """    // Grounding: characters stand cleanly above grass, or Superman flies airborne with clearance
    const isSuperman = characterData?.id === 'superman';
    const verticalElevation = isSuperman
      ? 1.25 + (reducedMotion ? 0 : Math.sin(t * 3.2 + laneIndex) * 0.08)
      : 0.08 + strideBob;

    groupRef.current.position.set(worldX, terrainHeight + verticalElevation, laneZ);

    // Facing right (+X) with natural hill incline pitch and aerodynamic flight banking
    const slopePitch = Math.atan(slope) * 0.65;
    const flightPitch = isSuperman ? slopePitch + 0.15 : slopePitch;
    const flightBank = isSuperman && !reducedMotion ? Math.sin(t * 2.8 + laneIndex) * 0.08 : 0;
    groupRef.current.rotation.set(flightBank, Math.PI / 2, flightPitch);"""

if old_arena_grounding in arena_code:
    arena_code = arena_code.replace(old_arena_grounding, new_arena_grounding, 1)
    with open(arena_path, 'w', encoding='utf-8', newline='') as f:
        f.write(arena_code)
    print("Updated RaceArena.jsx")
else:
    print("WARNING: Could not find target in RaceArena.jsx")
