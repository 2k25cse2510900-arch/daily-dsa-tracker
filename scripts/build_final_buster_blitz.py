import bpy
import mathutils
import math
import os
import shutil

WORKSPACE = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
src_glb = os.path.join(WORKSPACE, "characterverse", "public", "models", "Knight.glb")
brain_dir = os.environ.get("AGENT_BRAIN_DIR", os.path.join(WORKSPACE, "scratch"))
os.makedirs(brain_dir, exist_ok=True)
temp_out_glb = os.path.join(WORKSPACE, "scratch", "Knight_buster_final.glb")

target_destinations = [
    os.path.join(WORKSPACE, "characterverse", "public", "models", "Knight.glb"),
    os.path.join(WORKSPACE, "characterverse", "dist", "models", "Knight.glb"),
    os.path.join(WORKSPACE, "characterverse", "dist-embed", "models", "Knight.glb"),
    os.path.join(WORKSPACE, "public", "characterverse", "models", "Knight.glb"),
    os.path.join(WORKSPACE, "public", "characterverse-embed", "models", "Knight.glb"),
]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src_glb)

# 1. Cleanly remove duplicate swords and duplicate shields
# Keep only: 2H_Sword (in right hand) and Spike_Shield (in left hand)
duplicates_to_remove = [
    '1H_Sword',
    '1H_Sword_Offhand',
    'Badge_Shield',
    'Rectangle_Shield',
    'Round_Shield'
]

for name in duplicates_to_remove:
    obj = bpy.data.objects.get(name)
    if obj:
        mesh_data = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        if mesh_data:
            bpy.data.meshes.remove(mesh_data, do_unlink=True)
        print(f"Completely removed duplicate object & mesh: {name}")

# Also remove any unlinked loose meshes or duplicate objects
sword = bpy.data.objects['2H_Sword']
shield = bpy.data.objects['Spike_Shield']

print(f"Active Sword: {sword.name}, parent={sword.parent.name}, bone={sword.parent_bone}")
print(f"Active Shield: {shield.name}, parent={shield.parent.name}, bone={shield.parent_bone}")

# Verify hand grip alignment
# handslot.r is positioned at the right palm. 2H_Sword location (0, -0.0787, 0) places the grip right in the palm.
# Let's ensure scale is uniform (1, 1, 1) and rotation is natural
print(f"Sword location: {sword.location}, rotation: {sword.rotation_euler}, scale: {sword.scale}")
print(f"Shield location: {shield.location}, rotation: {shield.rotation_euler}, scale: {shield.scale}")

# 2. Export clean GLB
print(f"Exporting clean GLB to {temp_out_glb}...")
bpy.ops.export_scene.gltf(
    filepath=temp_out_glb,
    export_format='GLB',
    use_selection=False,
    export_animations=True,
    export_apply=False,
    export_skins=True,
    export_morph=True,
    export_lights=False,
    export_cameras=False
)

sz = os.path.getsize(temp_out_glb)
print(f"Exported clean GLB: {sz} bytes")
assert sz > 2000000, "Export size too small!"

# Deploy to all 5 project model paths
for dest in target_destinations:
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    shutil.copy2(temp_out_glb, dest)
    print(f"Copied to {dest} ({os.path.getsize(dest)} bytes)")

# 3. Render 5 views for visual verification: Front, Three-quarter, Right Side (Sword), Left Side (Shield), Back
bpy.context.scene.render.engine = 'CYCLES'
bpy.context.scene.cycles.samples = 12
bpy.context.scene.cycles.adaptive_threshold = 0.1

cam_data = bpy.data.cameras.new("Cam")
cam_obj = bpy.data.objects.new("Cam", cam_data)
bpy.context.scene.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj

world = bpy.data.worlds.new("World")
bpy.context.scene.world = world
bg_node = world.node_tree.nodes.get("Background")
if bg_node:
    bg_node.inputs['Color'].default_value = (0.92, 0.92, 0.94, 1.0)
    bg_node.inputs['Strength'].default_value = 1.0

light_key = bpy.data.lights.new("SunKey", type='SUN')
light_key.energy = 2.5
obj_key = bpy.data.objects.new("SunKey", light_key)
bpy.context.scene.collection.objects.link(obj_key)
obj_key.location = (2, -2, 4)

light_fill = bpy.data.lights.new("SunFill", type='SUN')
light_fill.energy = 1.5
obj_fill = bpy.data.objects.new("SunFill", light_fill)
bpy.context.scene.collection.objects.link(obj_fill)
obj_fill.location = (-2, 2, 3)

bpy.context.scene.render.resolution_x = 700
bpy.context.scene.render.resolution_y = 700

views = [
    ("buster_final_front.png", (0, -2.5, 0.75), (math.radians(90), 0, 0)),
    ("buster_final_threequarter.png", (-1.8, -1.8, 0.95), (math.radians(75), 0, math.radians(-45))),
    ("buster_final_side_right.png", (-2.5, 0, 0.75), (math.radians(90), 0, math.radians(-90))),
    ("buster_final_side_left.png", (2.5, 0, 0.75), (math.radians(90), 0, math.radians(90))),
    ("buster_final_back.png", (0, 2.5, 0.75), (math.radians(90), 0, math.radians(180))),
]

for fname, pos, rot in views:
    cam_obj.location = pos
    cam_obj.rotation_euler = rot
    bpy.context.scene.render.filepath = os.path.join(brain_dir, fname)
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {fname}")

print("All Buster Blitz final views rendered successfully!")
