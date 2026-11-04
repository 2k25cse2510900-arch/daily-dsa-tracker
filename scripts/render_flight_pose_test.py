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

# Configure Bones for Superman Flight Pose:
# Torso & Head
spine = rig.pose.bones.get('spine')
chest = rig.pose.bones.get('chest')
head = rig.pose.bones.get('head')
spine.rotation_mode = 'XYZ'
chest.rotation_mode = 'XYZ'
head.rotation_mode = 'XYZ'

# Arms
ual = rig.pose.bones.get('upperarm.l')
uar = rig.pose.bones.get('upperarm.r')
lal = rig.pose.bones.get('lowerarm.l')
lar = rig.pose.bones.get('lowerarm.r')
ual.rotation_mode = 'XYZ'
uar.rotation_mode = 'XYZ'
lal.rotation_mode = 'XYZ'
lar.rotation_mode = 'XYZ'

# Legs & Feet
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

# Apply Rotations
spine.rotation_euler = Euler((0.15, 0, 0), 'XYZ')
chest.rotation_euler = Euler((-0.22, 0, 0), 'XYZ')
head.rotation_euler = Euler((-0.52, 0, 0), 'XYZ')

# Both arms extended forward, level and shoulder-width aligned
# Slightly leading right fist or parallel fists
uar.rotation_euler = Euler((-1.42, -0.18, 0.22), 'XYZ')
lar.rotation_euler = Euler((0.08, 0, 0), 'XYZ')
ual.rotation_euler = Euler((-1.38, 0.18, -0.22), 'XYZ')
lal.rotation_euler = Euler((0.08, 0, 0), 'XYZ')

# Streamlined legs with slight knee flex and pointed feet
ull.rotation_euler = Euler((-0.22, 0.05, -0.08), 'XYZ')
ulr.rotation_euler = Euler((-0.20, -0.05, 0.08), 'XYZ')
lll.rotation_euler = Euler((0.24, 0, 0), 'XYZ')
llr.rotation_euler = Euler((0.22, 0, 0), 'XYZ')
footl.rotation_euler = Euler((0.38, 0, 0), 'XYZ')
footr.rotation_euler = Euler((0.36, 0, 0), 'XYZ')

bpy.ops.object.mode_set(mode='OBJECT')

# Pitch the entire rig forward into flight (approx 60 degrees)
rig.rotation_mode = 'YXZ'
rig.rotation_euler = Euler((1.05, 0, 0), 'YXZ')

# Render camera
cam_data = bpy.data.cameras.new("Cam")
cam = bpy.data.objects.new("Cam", cam_data)
bpy.context.scene.collection.objects.link(cam)
bpy.context.scene.camera = cam

# Set Workbench engine for instant rendering
bpy.context.scene.render.engine = 'BLENDER_WORKBENCH'
bpy.context.scene.display.shading.light = 'STUDIO'
bpy.context.scene.display.shading.color_type = 'TEXTURE'
bpy.context.scene.render.resolution_x = 900
bpy.context.scene.render.resolution_y = 600

# 1. Front Three-Quarter View
cam.location = (2.2, -3.2, 1.8)
# Look at center of Superman (0, 0, 1.0)
cam.rotation_euler = (1.20, 0, 0.60)
bpy.context.scene.render.filepath = os.path.join(OUT_DIR, "test_flight_pose_34.png")
bpy.ops.render.render(write_still=True)

# 2. Front View
cam.location = (0.0, -3.6, 1.4)
cam.rotation_euler = (1.35, 0, 0)
bpy.context.scene.render.filepath = os.path.join(OUT_DIR, "test_flight_pose_front.png")
bpy.ops.render.render(write_still=True)

# 3. Side View
cam.location = (3.6, 0.0, 1.4)
cam.rotation_euler = (1.5708, 0, 1.5708)
bpy.context.scene.render.filepath = os.path.join(OUT_DIR, "test_flight_pose_side.png")
bpy.ops.render.render(write_still=True)

print("Rendered test flight poses successfully!")
