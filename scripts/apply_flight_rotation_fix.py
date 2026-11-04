import re

viewer_path = r"characterverse\src\components\viewer\CharacterViewer.jsx"
with open(viewer_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update rotation to use 'YXZ' order
old_rot = """        clonedScene.rotation.set(
          pitchAngle * fb,
          headingYaw * fb,
          bankAngle * fb
        );"""

new_rot = """        clonedScene.rotation.set(
          pitchAngle * fb,
          headingYaw * fb,
          bankAngle * fb,
          'YXZ'
        );"""

assert old_rot in code, "old_rot not found"
code = code.replace(old_rot, new_rot)

# 2. Update camera tracking in CharacterScene to keep flight centered with organic damping
old_tracking = """    if (characterData?.id === 'superman' && characterData?.isDrivingMode) {
      const t = clock.getElapsedTime();
      const targetX = Math.sin(t * 1.15) * 0.20;
      const targetY = 0.15 + 0.35;
      const targetZ = Math.sin(t * 2.30) * 0.14;
      controlsRef.current.target.lerp(new THREE.Vector3(targetX, targetY, targetZ), Math.min(1, delta * 3.5));
      controlsRef.current.update();
    } else {
      if (controlsRef.current.target.distanceTo(new THREE.Vector3(0, 0.15, 0)) > 0.001) {
        controlsRef.current.target.lerp(new THREE.Vector3(0, 0.15, 0), Math.min(1, delta * 4.0));
        controlsRef.current.update();
      }
    }"""

new_tracking = """    if (characterData?.id === 'superman' && characterData?.isDrivingMode) {
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

assert old_tracking in code, "old_tracking not found"
code = code.replace(old_tracking, new_tracking)

with open(viewer_path, "w", encoding="utf-8") as f:
    f.write(code)

print("CharacterViewer.jsx updated with 'YXZ' rotation and smooth camera tracking.")
