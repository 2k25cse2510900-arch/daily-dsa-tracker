import os

FILE_PATH = r"characterverse\src\components\viewer\CharacterViewer.jsx"

with open(FILE_PATH, "r", encoding="utf-8") as f:
    code = f.read()

old_legs_block = """        if (ull) {
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
        }"""

new_legs_block = """        if (ull) {
          // Streamlined trailing left leg — relative to rest rotation (pi ~ 3.107)
          ull.rotation.set(
            3.107 - 0.18 * fb + Math.sin(ft * 2.5) * 0.008,
            0.04 * fb,
            -0.06 * fb
          );
        }
        if (ulr) {
          // Streamlined trailing right leg — relative to rest rotation (pi ~ 3.107)
          ulr.rotation.set(
            3.107 - 0.16 * fb - Math.sin(ft * 2.5) * 0.008,
            -0.04 * fb,
            0.06 * fb
          );
        }
        if (lll) {
          // Left knee: Subtle natural flex relative to rest (0.213)
          lll.rotation.set(0.213 + 0.12 * fb, 0, 0);
        }
        if (llr) {
          // Right knee: Subtle natural flex relative to rest (0.213)
          llr.rotation.set(0.213 + 0.10 * fb, 0, 0);
        }
        if (footl) {
          // Pointed left toes relative to rest (-0.945)
          footl.rotation.set(-0.945 - 0.35 * fb, 0, 0);
        }
        if (footr) {
          // Pointed right toes relative to rest (-0.945)
          footr.rotation.set(-0.945 - 0.32 * fb, 0, 0);
        }"""

if "\r\n" in code:
    old_legs_block = old_legs_block.replace("\n", "\r\n")
    new_legs_block = new_legs_block.replace("\n", "\r\n")

if old_legs_block in code:
    code = code.replace(old_legs_block, new_legs_block)
    print("Legs block updated with correct rest rotation offsets!")
else:
    print("Warning: old_legs_block not found in code!")

with open(FILE_PATH, "w", encoding="utf-8") as f:
    f.write(code)

print("CharacterViewer.jsx leg fix applied successfully!")
