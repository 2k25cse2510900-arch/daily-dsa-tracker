import bpy
import os

WORKSPACE = r"C:\Users\Dell\OneDrive\Desktop\dsa_admin_dashboard"
ROGUE = os.path.join(WORKSPACE, "characterverse", "public", "models", "Rogue.glb")
KNIGHT = os.path.join(WORKSPACE, "characterverse", "public", "models", "Knight.glb")

def inspect_body(path, name):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    body = bpy.data.objects.get(name)
    if body:
        print(f"\n{name} bounds: Z [{min(v.co.z for v in body.data.vertices):.3f}, {max(v.co.z for v in body.data.vertices):.3f}]")
        print(f"{name} vertex count: {len(body.data.vertices)}")
        # Check vertex groups
        vg_names = [vg.name for vg in body.vertex_groups]
        print(f"Vertex groups: {vg_names}")

inspect_body(KNIGHT, "Knight_Body")
inspect_body(ROGUE, "Rogue_Body")
