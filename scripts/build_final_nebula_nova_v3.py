import bpy
import bmesh
import math
import mathutils
import os
import shutil

WORKSPACE = r"C:\Users\Dell\OneDrive\Desktop\dsa_admin_dashboard"
src_glb = os.path.join(WORKSPACE, "characterverse", "public", "models", "Rogue.glb")
brain_dir = r"C:\Users\Dell\.gemini\antigravity\brain\7b4211d5-5670-4b1b-a9d3-36761e2d4d5b"
temp_out_glb = os.path.join(WORKSPACE, "scratch", "Rogue_nebula_final_v3.glb")

target_destinations = [
    os.path.join(WORKSPACE, "characterverse", "public", "models", "Rogue.glb"),
    os.path.join(WORKSPACE, "characterverse", "dist", "models", "Rogue.glb"),
    os.path.join(WORKSPACE, "characterverse", "dist-embed", "models", "Rogue.glb"),
    os.path.join(WORKSPACE, "public", "characterverse", "models", "Rogue.glb"),
    os.path.join(WORKSPACE, "public", "characterverse-embed", "models", "Rogue.glb"),
]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src_glb)

rig = bpy.data.objects['Rig']
chest_bone = rig.pose.bones['chest']

# 1. Cleanly remove Knife, Throwable, 2H_Crossbow, Crossbow_Harness_Strap
for name in ['Knife', 'Throwable', '2H_Crossbow', 'Crossbow_Harness_Strap']:
    obj = bpy.data.objects.get(name)
    if obj:
        mesh_data = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        if mesh_data:
            bpy.data.meshes.remove(mesh_data, do_unlink=True)

# 2. Update affected right hand to green glove on Rogue_ArmRight
arm_r = bpy.data.objects['Rogue_ArmRight']
mesh_r = arm_r.data
uv_layer_arm = mesh_r.uv_layers.active.data

hand_poly_count = 0
for poly in mesh_r.polygons:
    p_verts = [mesh_r.vertices[vi] for vi in poly.vertices]
    if all(v.co.x < -0.805 for v in p_verts):
        hand_poly_count += 1
        for loop_idx in poly.loop_indices:
            uv_layer_arm[loop_idx].uv = (0.08, 0.12)  # Emerald green

print(f"Cleanly remapped {hand_poly_count} hand polygons to emerald green.")

# 3. Mount 1H_Crossbow to chest bone on her back
xb = bpy.data.objects['1H_Crossbow']
xb.parent = None

center_offset = mathutils.Matrix.Translation(mathutils.Vector((-0.0012, 0.3333, -0.0317)))
base_rot = mathutils.Matrix.Rotation(-math.pi/2, 4, 'X')
diag_tilt = mathutils.Matrix.Rotation(math.radians(-35), 4, 'Y')
loc_target = mathutils.Vector((-0.02, 0.44, 0.80))
world_mat = mathutils.Matrix.Translation(loc_target) @ diag_tilt @ base_rot @ center_offset
xb.matrix_world = world_mat

xb.parent = rig
xb.parent_type = 'BONE'
xb.parent_bone = 'chest'
xb.matrix_parent_inverse = chest_bone.matrix.inverted()

# 4. Create dedicated secure-looking leather mounting harness straps on the back
strap_mesh = bpy.data.meshes.new("Crossbow_Harness_Strap")
strap_obj = bpy.data.objects.new("Crossbow_Harness_Strap", strap_mesh)
bpy.context.scene.collection.objects.link(strap_obj)

bm = bmesh.new()

def add_strap_strip(points, width, normal_bias=mathutils.Vector((0, 1, 0))):
    faces = []
    for i in range(len(points) - 1):
        p0 = points[i]
        p1 = points[i + 1]
        seg_dir = (p1 - p0).normalized()
        side = seg_dir.cross(normal_bias).normalized() * (width * 0.5)
        v0 = bm.verts.new(p0 - side)
        v1 = bm.verts.new(p0 + side)
        v2 = bm.verts.new(p1 + side)
        v3 = bm.verts.new(p1 - side)
        f = bm.faces.new([v0, v1, v2, v3])
        faces.append(f)
    return faces

# Main diagonal strap: Anchors from right shoulder harness, crosses OVER crossbow stock (Y=0.56), connects to left waist
main_strap_pts = [
    mathutils.Vector((-0.18, 0.25, 1.04)),  # Right shoulder strap anchor
    mathutils.Vector((-0.17, 0.36, 0.98)),  # Cape surface upper right
    mathutils.Vector((-0.08, 0.48, 0.94)),  # Climbing over crossbow stock
    mathutils.Vector((-0.01, 0.56, 0.90)),  # Firmly over the crossbow wood stock
    mathutils.Vector((0.08, 0.52, 0.84)),   # Over lower stock
    mathutils.Vector((0.17, 0.37, 0.79)),   # Descending to cape surface left
    mathutils.Vector((0.24, 0.22, 0.76)),   # Anchored to left torso harness
]
s1_faces = add_strap_strip(main_strap_pts, width=0.042, normal_bias=mathutils.Vector((0, 0.9, 0.2)))

# Secondary holster retention strap: wraps horizontally around the crossbow stock
holster_pts = [
    mathutils.Vector((-0.15, 0.38, 0.92)),  # Right cape
    mathutils.Vector((-0.03, 0.55, 0.88)),  # Across crossbow front face
    mathutils.Vector((0.12, 0.38, 0.83)),   # Left cape
]
s2_faces = add_strap_strip(holster_pts, width=0.036, normal_bias=mathutils.Vector((0, 0.9, 0.2)))

# Left shoulder harness brace: connects left shoulder down to the harness
left_brace_pts = [
    mathutils.Vector((0.18, 0.25, 1.04)),   # Left shoulder strap anchor
    mathutils.Vector((0.17, 0.36, 0.97)),   # Cape surface upper left
    mathutils.Vector((0.14, 0.40, 0.88)),   # Joins the harness cluster
]
s3_faces = add_strap_strip(left_brace_pts, width=0.032, normal_bias=mathutils.Vector((0, 0.9, 0.2)))

# Silver buckle / clasp on main strap directly over the crossbow stock
buckle_center = mathutils.Vector((-0.01, 0.565, 0.90))
bw, bh, bd = 0.026, 0.024, 0.006
bv0 = bm.verts.new(buckle_center + mathutils.Vector((-bw, bd, -bh)))
bv1 = bm.verts.new(buckle_center + mathutils.Vector((bw, bd, -bh)))
bv2 = bm.verts.new(buckle_center + mathutils.Vector((bw, bd, bh)))
bv3 = bm.verts.new(buckle_center + mathutils.Vector((-bw, bd, bh)))
buckle_face = bm.faces.new([bv0, bv1, bv2, bv3])
buckle_idx = buckle_face.index

bm.to_mesh(strap_mesh)
bm.free()

mat = bpy.data.materials.get("rogue_texture")
if mat:
    strap_mesh.materials.append(mat)

uv_layer_strap = strap_mesh.uv_layers.new(name="UVMap")
for poly in strap_mesh.polygons:
    if poly.index == buckle_idx:
        for loop_idx in poly.loop_indices:
            uv_layer_strap.data[loop_idx].uv = (0.15, 0.15)  # Silver buckle
    else:
        for loop_idx in poly.loop_indices:
            uv_layer_strap.data[loop_idx].uv = (0.69, 0.34)  # Leather brown

strap_obj.parent = rig
strap_obj.parent_type = 'BONE'
strap_obj.parent_bone = 'chest'
strap_obj.matrix_parent_inverse = chest_bone.matrix.inverted()
print("Back harness straps created with clean anchor points.")

# 5. Export clean GLB
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

# 6. Render 4 views for visual verification: Front, Three-quarter, Side, Back
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
    ("nebula_final_front.png", (0, -2.4, 0.95), (math.radians(90), 0, 0)),
    ("nebula_final_threequarter.png", (-1.7, -1.7, 1.1), (math.radians(75), 0, math.radians(-45))),
    ("nebula_final_side.png", (-2.4, 0, 0.95), (math.radians(90), 0, math.radians(-90))),
    ("nebula_final_back.png", (0, 2.4, 0.95), (math.radians(90), 0, math.radians(180))),
]

for fname, pos, rot in views:
    cam_obj.location = pos
    cam_obj.rotation_euler = rot
    bpy.context.scene.render.filepath = os.path.join(brain_dir, fname)
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {fname}")

print("All nebula final views rendered successfully!")
