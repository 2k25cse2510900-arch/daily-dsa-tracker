import bpy
import os

WORKSPACE = r"C:\Users\Dell\OneDrive\Desktop\dsa_admin_dashboard"
KNIGHT = os.path.join(WORKSPACE, "characterverse", "public", "models", "Knight.glb")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=KNIGHT)
body = bpy.data.objects.get("Knight_Body")
print("Knight_Body has", len(body.data.vertices), "verts and", len(body.data.polygons), "faces.")

# Check UVs and face materials
uv_layer = body.data.uv_layers.active.data
uv_centers = []
for poly in body.data.polygons:
    poly_uvs = [uv_layer[loop_idx].uv for loop_idx in poly.loop_indices]
    avg_u = sum(uv.x for uv in poly_uvs) / len(poly_uvs)
    avg_v = sum(uv.y for uv in poly_uvs) / len(poly_uvs)
    uv_centers.append((avg_u, avg_v, poly.center.z))

print("Knight_Body UV samples (first 10):", uv_centers[:10])
