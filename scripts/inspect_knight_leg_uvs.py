import bpy
import os

WORKSPACE = r"C:\Users\Dell\OneDrive\Desktop\dsa_admin_dashboard"
KNIGHT = os.path.join(WORKSPACE, "characterverse", "public", "models", "Knight.glb")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=KNIGHT)

leg = bpy.data.objects.get('Knight_LegLeft')
uv_leg = leg.data.uv_layers.active.data
leg_uvs = {}
for p in leg.data.polygons:
    u = sum(uv_leg[i].uv.x for i in p.loop_indices) / len(p.loop_indices)
    v = sum(uv_leg[i].uv.y for i in p.loop_indices) / len(p.loop_indices)
    key = (round(u, 2), round(v, 2))
    leg_uvs[key] = leg_uvs.get(key, 0) + 1

print("Knight_LegLeft UV clusters:", leg_uvs)
