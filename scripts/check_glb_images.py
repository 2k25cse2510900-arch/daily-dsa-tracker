import bpy
import os

WORKSPACE = r"C:\Users\Dell\OneDrive\Desktop\dsa_admin_dashboard"
KNIGHT = os.path.join(WORKSPACE, "characterverse", "public", "models", "Knight.glb")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=KNIGHT)
for img in bpy.data.images:
    print(f"Image name: {img.name}, size: {img.size[0]}x{img.size[1]}, filepath: {img.filepath}")
