import bpy
import os

WORKSPACE = r"C:\Users\Dell\OneDrive\Desktop\dsa_admin_dashboard"
ROGUE = os.path.join(WORKSPACE, "characterverse", "public", "models", "Rogue.glb")
KNIGHT = os.path.join(WORKSPACE, "characterverse", "public", "models", "Knight.glb")
SUPERMAN = os.path.join(WORKSPACE, "characterverse", "public", "models", "Superman.glb")

def inspect_glb(path, label):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    print(f"\n=== INSPECTING {label} ({path}) ===")
    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            smooth_count = sum(1 for f in obj.data.polygons if f.use_smooth)
            flat_count = sum(1 for f in obj.data.polygons if not f.use_smooth)
            print(f"Mesh: {obj.name:20s} | Verts: {len(obj.data.vertices):4d} | Faces: {len(obj.data.polygons):4d} | Smooth: {smooth_count:4d} | Flat: {flat_count:4d}")
            mats = [m.name for m in obj.data.materials if m]
            print(f"   Materials: {mats}")

inspect_glb(KNIGHT, "KNIGHT (Buster Blitz)")
inspect_glb(ROGUE, "ROGUE (Nebula Nova)")
inspect_glb(SUPERMAN, "SUPERMAN")
