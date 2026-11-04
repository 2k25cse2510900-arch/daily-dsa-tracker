import bpy
import os

WORKSPACE = r"C:\Users\Dell\OneDrive\Desktop\dsa_admin_dashboard"
KNIGHT = os.path.join(WORKSPACE, "characterverse", "public", "models", "Knight.glb")
ROGUE = os.path.join(WORKSPACE, "characterverse", "public", "models", "Rogue.glb")
OUT_DIR = os.path.join(WORKSPACE, "scratch", "characterverse_validation")

# Let's inspect objects in Knight.glb
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=KNIGHT)
print("\n--- KNIGHT OBJECTS ---")
for o in bpy.data.objects:
    if o.type == 'MESH':
        print(f"Knight mesh: {o.name}, parent={o.parent.name if o.parent else 'None'}")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ROGUE)
print("\n--- ROGUE OBJECTS ---")
for o in bpy.data.objects:
    if o.type == 'MESH':
        print(f"Rogue mesh: {o.name}, parent={o.parent.name if o.parent else 'None'}")
