import bpy
import os
import math
from mathutils import Euler, Vector

WORKSPACE = r"C:\Users\Dell\OneDrive\Desktop\dsa_admin_dashboard"
SUPERMAN = os.path.join(WORKSPACE, "characterverse", "public", "models", "Superman.glb")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SUPERMAN)

rig = bpy.data.objects.get('Rig')
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')

b_ual = rig.pose.bones.get('upperarm.l')
b_uar = rig.pose.bones.get('upperarm.r')
b_lal = rig.pose.bones.get('lowerarm.l')
b_lar = rig.pose.bones.get('lowerarm.r')

b_ual.rotation_mode = 'XYZ'
b_uar.rotation_mode = 'XYZ'
b_lal.rotation_mode = 'XYZ'
b_lar.rotation_mode = 'XYZ'

# Test Right Arm forward:
b_uar.rotation_euler = Euler((-1.40, -0.20, 0.25), 'XYZ')
b_lar.rotation_euler = Euler((0.05, 0, 0), 'XYZ')

# Test Left Arm forward:
# Let's test what Euler gives symmetrical forward extension for left arm!
# Try: (-1.40, 0.20, -0.25)
b_ual.rotation_euler = Euler((-1.40, 0.20, -0.25), 'XYZ')
b_lal.rotation_euler = Euler((0.05, 0, 0), 'XYZ')

bpy.context.view_layer.update()

print("Right hand position:", rig.pose.bones['hand.r'].head)
print("Left hand position: ", rig.pose.bones['hand.l'].head)
print("Right wrist position:", rig.pose.bones['wrist.r'].head)
print("Left wrist position: ", rig.pose.bones['wrist.l'].head)
