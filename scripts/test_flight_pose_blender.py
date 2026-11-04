import bpy
import os
import math
from mathutils import Euler, Vector

WORKSPACE = r"C:\Users\Dell\OneDrive\Desktop\dsa_admin_dashboard"
SUPERMAN = os.path.join(WORKSPACE, "characterverse", "public", "models", "Superman.glb")
OUT_DIR = os.path.join(WORKSPACE, "scratch", "characterverse_validation")
os.makedirs(OUT_DIR, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SUPERMAN)

rig = bpy.data.objects.get('Rig')
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')

# Set pose: Both arms extended forward
# We test bone rotations in Blender
# Note: Three.js and Blender use the same skeletal local axes when imported/exported via glTF
# Let's inspect local axes of upperarm.l and upperarm.r
b_ual = rig.pose.bones.get('upperarm.l')
b_uar = rig.pose.bones.get('upperarm.r')
b_lal = rig.pose.bones.get('lowerarm.l')
b_lar = rig.pose.bones.get('lowerarm.r')

print("ual rotation mode:", b_ual.rotation_mode)
print("uar rotation mode:", b_uar.rotation_mode)
