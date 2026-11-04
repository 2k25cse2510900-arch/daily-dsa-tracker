import bpy
import os
from mathutils import Euler, Vector

WORKSPACE = r"C:\Users\Dell\OneDrive\Desktop\dsa_admin_dashboard"
SUPERMAN = os.path.join(WORKSPACE, "characterverse", "public", "models", "Superman.glb")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SUPERMAN)

rig = bpy.data.objects.get('Rig')
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')

print("\n=== POSE BONES IN SUPERMAN.GLB ===")
for b in rig.pose.bones:
    if any(k in b.name.lower() for k in ['arm', 'chest', 'spine', 'head', 'leg', 'foot', 'wrist', 'hand']):
        print(f"Bone: {b.name:15s} | head: {b.head} | tail: {b.tail} | rot_mode: {b.rotation_mode}")
