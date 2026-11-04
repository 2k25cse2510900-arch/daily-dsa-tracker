import bpy
import bmesh
import math
import mathutils
import os
import shutil

WORKSPACE = r"C:\Users\Dell\OneDrive\Desktop\dsa_admin_dashboard"
src_glb = os.path.join(WORKSPACE, "characterverse", "public", "models", "Rogue.glb")
brain_dir = r"C:\Users\Dell\.gemini\antigravity\brain\7b4211d5-5670-4b1b-a9d3-36761e2d4d5b"
temp_out_glb = os.path.join(WORKSPACE, "scratch", "Rogue_nebula_final.glb")

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

# 1. Completely remove Knife, Throwable, 2H_Crossbow and any extra fragments
for name in ['Knife', 'Throwable', '2H_Crossbow']:
    obj = bpy.data.objects.get(name)
    if obj:
        mesh_data = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        if mesh_data:
            bpy.data.meshes.remove(mesh_data, do_unlink=True)
        print(f"Removed {name}")

# 2. Update affected right hand to green glove on Rogue_ArmRight
arm_r = bpy.data.objects['Rogue_ArmRight']
mesh_r = arm_r.data
uv_layer = mesh_r.uv_layers.active.data

# Target hand polygons: strictly polygons where all vertices have X < -0.805
hand_poly_count = 0
for poly in mesh_r.polygons:
    p_verts = [mesh_r.vertices[vi] for vi in poly.vertices]
    if all(v.co.x < -0.805 for v in p_verts):
        hand_poly_count += 1
        for loop_idx in poly.loop_indices:
            uv_layer[loop_idx].uv = (0.08, 0.12)  # Emerald green

print(f"Cleanly remapped {hand_poly_count} hand polygons to emerald green.")

# 3. Mount 1H_Crossbow to chest bone on her back
xb = bpy.data.objects['1H_Crossbow']
xb.parent = None

# Center offset of 1H_Crossbow
center_offset = mathutils.Matrix.Translation(mathutils.Vector((-0.0012, 0.3333, -0.0317)))
base_rot = mathutils.Matrix.Rotation(-math.pi/2, 4, 'X')
diag_tilt = mathutils.Matrix.Rotation(math.radians(-35), 4, 'Y')
# Lowered slightly to Z=0.80 and Y=0.44 so it clears the hair completely
loc_target = mathutils.Vector((-0.02, 0.44, 0.80))
world_mat = mathutils.Matrix.Translation(loc_target) @ diag_tilt @ base_rot @ center_offset
xb.matrix_world = world_mat

xb.parent = rig
xb.parent_type = 'BONE'
xb.parent_bone = 'chest'
xb.matrix_parent_inverse = chest_bone.matrix.inverted()
print("1H_Crossbow mounted diagonally on back with hair clearance.")

# 4. Create diagonal leather harness straps
strap_mesh = bpy.data.meshes.new("Crossbow_Harness_Strap")
strap_obj = bpy.data.objects.new("Crossbow_Harness_Strap", strap_mesh)
bpy.context.scene.collection.objects.link(strap_obj)

bm = bmesh.new()

# Main diagonal strap: runs cleanly across torso under the cowl, avoiding chin completely
# Front path: from right chest under cowl (-0.12, -0.30, 0.93) to left waist (0.16, -0.26, 0.76)
# Left rib side: (0.28, 0.05, 0.74)
# Back path: (0.22, 0.36, 0.76) across crossbow stock (0.06, 0.46, 0.80) to upper right back (-0.14, 0.38, 0.95)
# Right rib / shoulder seam: (-0.22, 0.10, 1.05) -> (-0.18, -0.15, 1.00) -> connects back to (-0.12, -0.30, 0.93)
main_strap_pts = [
    mathutils.Vector((-0.12, -0.28, 0.94)),   # Upper right chest (under cowl)
    mathutils.Vector((0.00, -0.34, 0.85)),    # Mid chest (below cowl tip)
    mathutils.Vector((0.16, -0.28, 0.76)),    # Lower left chest
    mathutils.Vector((0.26, -0.12, 0.74)),    # Left waist front
    mathutils.Vector((0.29, 0.08, 0.74)),     # Left rib side
    mathutils.Vector((0.24, 0.36, 0.76)),     # Left back lower
    mathutils.Vector((0.08, 0.46, 0.80)),     # Back across crossbow stock
    mathutils.Vector((-0.04, 0.47, 0.88)),    # Back across crossbow body
    mathutils.Vector((-0.16, 0.38, 0.96)),    # Back upper right
    mathutils.Vector((-0.22, 0.12, 1.04)),    # Right rib/shoulder side
    mathutils.Vector((-0.18, -0.12, 1.00)),   # Right chest side
    mathutils.Vector((-0.12, -0.28, 0.94)),   # Loop closure
]

strap_width = 0.045
for i in range(len(main_strap_pts) - 1):
    p0 = main_strap_pts[i]
    p1 = main_strap_pts[i + 1]
    seg_dir = (p1 - p0).normalized()
    center = mathutils.Vector((0, 0, (p0.z + p1.z) * 0.5))
    outward = ((p0 + p1) * 0.5 - center).normalized()
    side = seg_dir.cross(outward).normalized() * (strap_width * 0.5)

    v0 = bm.verts.new(p0 - side)
    v1 = bm.verts.new(p0 + side)
    v2 = bm.verts.new(p1 + side)
    v3 = bm.verts.new(p1 - side)
    bm.faces.new([v0, v1, v2, v3])

# Cross-bracket strap securing upper crossbow stock against cape
bracket_pts = [
    mathutils.Vector((-0.16, 0.42, 0.96)),
    mathutils.Vector((-0.02, 0.48, 0.90)),
    mathutils.Vector((0.14, 0.43, 0.82)),
]
for i in range(len(bracket_pts) - 1):
    p0 = bracket_pts[i]
    p1 = bracket_pts[i + 1]
    side = mathutils.Vector((0, 0, 0.022))
    v0 = bm.verts.new(p0 - side)
    v1 = bm.verts.new(p0 + side)
    v2 = bm.verts.new(p1 + side)
    v3 = bm.verts.new(p1 - side)
    bm.faces.new([v0, v1, v2, v3])

# Buckle plate on chest center
bp_center = mathutils.Vector((0.00, -0.35, 0.85))
bp_w, bp_h, bp_d = 0.035, 0.04, 0.01
bv0 = bm.verts.new(bp_center + mathutils.Vector((-bp_w, -bp_d, -bp_h)))
bv1 = bm.verts.new(bp_center + mathutils.Vector((bp_w, -bp_d, -bp_h)))
bv2 = bm.verts.new(bp_center + mathutils.Vector((bp_w, -bp_d, bp_h)))
bv3 = bm.verts.new(bp_center + mathutils.Vector((-bp_w, -bp_d, bp_h)))
buckle_face = bm.faces.new([bv0, bv1, bv2, bv3])
buckle_idx = buckle_face.index

bm.to_mesh(strap_mesh)
bm.free()

mat = bpy.data.materials.get("rogue_texture")
if mat:
    strap_mesh.materials.append(mat)

uv_layer = strap_mesh.uv_layers.new(name="UVMap")
for poly in strap_mesh.polygons:
    if poly.index == buckle_idx:
        for loop_idx in poly.loop_indices:
            uv_layer.data[loop_idx].uv = (0.15, 0.15)  # Silver buckle
    else:
        for loop_idx in poly.loop_indices:
            uv_layer.data[loop_idx].uv = (0.69, 0.34)  # Leather brown

strap_obj.parent = rig
strap_obj.parent_type = 'BONE'
strap_obj.parent_bone = 'chest'
strap_obj.matrix_parent_inverse = chest_bone.matrix.inverted()
print("Strap created with buckle and parented to chest bone.")

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
