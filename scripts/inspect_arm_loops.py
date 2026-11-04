import bpy
import os

WORKSPACE = r"C:\Users\Dell\OneDrive\Desktop\dsa_admin_dashboard"
ROGUE = os.path.join(WORKSPACE, "characterverse", "public", "models", "Rogue.glb")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ROGUE)

arm = bpy.data.objects.get('Rogue_ArmLeft')
print("Arm polygons X centers:")
x_centers = sorted(list(set(round(p.center.x, 3) for p in arm.data.polygons if p.center.x > 0.60)))
print("Unique X centers > 0.60:", x_centers)
