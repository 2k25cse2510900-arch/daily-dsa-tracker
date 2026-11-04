import bpy
import os

WORKSPACE = r"C:\Users\Dell\OneDrive\Desktop\dsa_admin_dashboard"
KNIGHT = os.path.join(WORKSPACE, "characterverse", "public", "models", "Knight.glb")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=KNIGHT)
shield = bpy.data.objects.get("Badge_Shield")
if shield:
    print("Badge_Shield verts:", len(shield.data.vertices), "faces:", len(shield.data.polygons))
    for p in shield.data.polygons[:10]:
        print("Poly vertices:", len(p.vertices), "use_smooth:", p.use_smooth)
