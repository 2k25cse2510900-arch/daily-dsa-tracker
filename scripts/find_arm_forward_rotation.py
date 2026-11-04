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
uar.rotation_mode = 'XYZ'

rest_hand = rig.pose.bones['hand.r'].head.copy()
print("Rest hand position:", rest_hand)
head_pos = rig.pose.bones['head'].head.copy()
print("Head position:     ", head_pos)

# Test rotations around X, Y, Z by +1.57 and -1.57
tests = [
    ("rot X +1.57", Euler((1.57, 0, 0), 'XYZ')),
    ("rot X -1.57", Euler((-1.57, 0, 0), 'XYZ')),
    ("rot Y +1.57", Euler((0, 1.57, 0), 'XYZ')),
    ("rot Y -1.57", Euler((0, -1.57, 0), 'XYZ')),
    ("rot Z +1.57", Euler((0, 0, 1.57), 'XYZ')),
    ("rot Z -1.57", Euler((0, 0, -1.57), 'XYZ')),
]

for label, e in tests:
    uar.rotation_euler = e
    bpy.context.view_layer.update()
    h = rig.pose.bones['hand.r'].head
    # We want hand in front of face: y < -0.2 (front) and z > 1.2 (level with head/shoulders)
    print(f"{label:12s} -> Hand pos: ({h.x:6.2f}, {h.y:6.2f}, {h.z:6.2f})")
