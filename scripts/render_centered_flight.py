import bpy
import os
from mathutils import Euler, Vector

WORKSPACE = r"C:\Users\Dell\OneDrive\Desktop\dsa_admin_dashboard"
SUPERMAN = os.path.join(WORKSPACE, "characterverse", "public", "models", "Superman.glb")
OUT_DIR = os.path.join(WORKSPACE, "scratch", "characterverse_validation")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SUPERMAN)

rig = bpy.data.objects.get('Rig')
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')

# Pose bones
spine = rig.pose.bones.get('spine')
chest = rig.pose.bones.get('chest')
head = rig.pose.bones.get('head')
spine.rotation_mode = 'XYZ'
chest.rotation_mode = 'XYZ'
head.rotation_mode = 'XYZ'

ual = rig.pose.bones.get('upperarm.l')
uar = rig.pose.bones.get('upperarm.r')
lal = rig.pose.bones.get('lowerarm.l')
lar = rig.pose.bones.get('lowerarm.r')
ual.rotation_mode = 'XYZ'
uar.rotation_mode = 'XYZ'
lal.rotation_mode = 'XYZ'
lar.rotation_mode = 'XYZ'

ull = rig.pose.bones.get('upperleg.l')
ulr = rig.pose.bones.get('upperleg.r')
lll = rig.pose.bones.get('lowerleg.l')
llr = rig.pose.bones.get('lowerleg.r')
footl = rig.pose.bones.get('foot.l')
footr = rig.pose.bones.get('foot.r')
ull.rotation_mode = 'XYZ'
ulr.rotation_mode = 'XYZ'
lll.rotation_mode = 'XYZ'
llr.rotation_mode = 'XYZ'
footl.rotation_mode = 'XYZ'
footr.rotation_mode = 'XYZ'

spine.rotation_euler = Euler((0.08, 0, 0), 'XYZ')
chest.rotation_euler = Euler((-0.18, 0, 0), 'XYZ')
head.rotation_euler = Euler((-0.45, 0, 0), 'XYZ')

# BOTH ARMS EXTENDED FORWARD - LEVEL AND SHOULDER-ALIGNED
uar.rotation_euler = Euler((1.55, -0.05, 0.08), 'XYZ')
lar.rotation_euler = Euler((0.04, 0, 0), 'XYZ')
ual.rotation_euler = Euler((1.52, 0.05, -0.08), 'XYZ')
lal.rotation_euler = Euler((0.04, 0, 0), 'XYZ')

# Streamlined trailing legs with subtle knee flex and pointed toes
ull.rotation_euler = Euler((-0.18, 0.03, -0.05), 'XYZ')
ulr.rotation_euler = Euler((-0.16, -0.03, 0.05), 'XYZ')
lll.rotation_euler = Euler((0.20, 0, 0), 'XYZ')
llr.rotation_euler = Euler((0.18, 0, 0), 'XYZ')
footl.rotation_euler = Euler((0.35, 0, 0), 'XYZ')
footr.rotation_euler = Euler((0.32, 0, 0), 'XYZ')

bpy.ops.object.mode_set(mode='OBJECT')

# Pitch rig forward horizontally into flight
rig.rotation_mode = 'YXZ'
rig.rotation_euler = Euler((1.05, 0, 0), 'YXZ')
# Offset so center of torso is at (0, 0, 0.6)
rig.location = Vector((0, 0.65, -0.35))

# Camera setup: wide hero view framing the entire flying silhouette from head to boots
cam_data = bpy.data.cameras.new("Cam")
cam = bpy.data.objects.new("Cam", cam_data)
bpy.context.scene.collection.objects.link(cam)
bpy.context.scene.camera = cam

bpy.context.scene.render.engine = 'BLENDER_WORKBENCH'
bpy.context.scene.display.shading.light = 'STUDIO'
bpy.context.scene.display.shading.color_type = 'TEXTURE'
bpy.context.scene.render.resolution_x = 960
bpy.context.scene.render.resolution_y = 640

# 1. Front Three-Quarter View
cam.location = (2.8, -3.8, 1.2)
cam.rotation_euler = (1.32, 0, 0.62)
bpy.context.scene.render.filepath = os.path.join(OUT_DIR, "test_flight_pose_34.png")
bpy.ops.render.render(write_still=True)

# 2. Side Profile View
cam.location = (4.4, 0.0, 0.6)
cam.rotation_euler = (1.5708, 0, 1.5708)
bpy.context.scene.render.filepath = os.path.join(OUT_DIR, "test_flight_pose_side.png")
bpy.ops.render.render(write_still=True)

# 3. Front View
cam.location = (0.0, -4.2, 0.8)
cam.rotation_euler = (1.42, 0, 0)
bpy.context.scene.render.filepath = os.path.join(OUT_DIR, "test_flight_pose_front.png")
bpy.ops.render.render(write_still=True)

print("Rendered both-arms-forward flight poses.")
