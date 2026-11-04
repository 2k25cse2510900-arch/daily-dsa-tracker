import bpy
import os

WORKSPACE = r"C:\Users\Dell\OneDrive\Desktop\dsa_admin_dashboard"
KNIGHT = os.path.join(WORKSPACE, "characterverse", "public", "models", "Knight.glb")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=KNIGHT)
body = bpy.data.objects.get('Knight_Body')

# Check UVs or material of the flower
uv_layer = body.data.uv_layers.active.data
flower_faces = []
for p in body.data.polygons:
    # flower is red, located on right chest x ~ -0.12, z ~ 0.95, y ~ -0.32
    if p.center.x < -0.05 and p.center.y < -0.28 and 0.85 < p.center.z < 1.05:
        flower_faces.append(p)

print("Flower region faces:", len(flower_faces))
for f in flower_faces[:10]:
    print("center:", f.center, "normal:", f.normal)
