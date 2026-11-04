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

uar = rig.pose.bones.get('upperarm.r')
ual = rig.pose.bones.get('upperarm.l')
uar.rotation_mode = 'XYZ'
ual.rotation_mode = 'XYZ'

# Test both arms forward:
# What X rotation puts both hands at y ~ -0.4 and z ~ 1.6?
for ang in [1.2, 1.4, 1.6, 1.8]:
    uar.rotation_euler = Euler((ang, 0, 0), 'XYZ')
    ual.rotation_euler = Euler((ang, 0, 0), 'XYZ')
    bpy.context.view_layer.update()
    hr = rig.pose.bones['hand.r'].head
    hl = rig.pose.bones['hand.l'].head
    print(f"ang={ang:.1f} | Right hand: ({hr.x:.2f}, {hr.y:.2f}, {hr.z:.2f}) | Left hand: ({hl.x:.2f}, {hl.y:.2f}, {hl.z:.2f})")
