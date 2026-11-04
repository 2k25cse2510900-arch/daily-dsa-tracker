"""
scripts/build_krish_normal.py
Builds the realistic Krish (Admin) 3D human character matching krish-real.jpg and krish-reference.png:
- Height: 1.83m (athletic male build)
- Face: Warm tan Indian skin tone, friendly confident smile, natural brown eyes, neat beard & moustache
- Hair: Voluminous wavy layered hair with fringe and distinct locks (NOT a helmet)
- Outfit: Light-blue collared shirt with rolled 3/4 sleeves and chest pocket, dark tailored trousers, brown belt with buckle, brown dress shoes, gold watch
- Relaxed natural standing pose
"""

import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix, Euler, Quaternion

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUNDLE_PATH = os.path.join(ROOT_DIR, "scratch", "human-base-meshes", "human-base-meshes-bundle-v1.4.1", "human_base_meshes_bundle.blend")
if not os.path.exists(BUNDLE_PATH):
    BUNDLE_PATH = os.path.join(ROOT_DIR, "scratch", "bundle", "human-base-meshes-bundle-v1.4.1", "human_base_meshes_bundle.blend")

KNIGHT_PATH = os.path.join(ROOT_DIR, "characterverse", "public", "models", "Knight.glb")
VAL_DIR = os.path.join(ROOT_DIR, "scratch", "characterverse_validation")
os.makedirs(VAL_DIR, exist_ok=True)

SCALE = 1.0828  # Scales 1.69m base mesh to exactly 1.83m

def clean_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_pbr_material(name, base_color, roughness=0.55, metalness=0.0, clearcoat=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = base_color
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metalness
        if "Coat Weight" in bsdf.inputs:
            bsdf.inputs["Coat Weight"].default_value = clearcoat
        elif "Clearcoat" in bsdf.inputs:
            bsdf.inputs["Clearcoat"].default_value = clearcoat
    return mat

def set_op_material(op_result, mat_idx):
    faces = op_result.get('faces')
    if faces is None:
        faces = [e for e in op_result.get('geom', []) if isinstance(e, bmesh.types.BMFace)]
    for f in faces:
        f.material_index = mat_idx

def add_smooth_tube(bm, pts, radii, seg=10, cap=True):
    """Creates a smooth lofted 3D tube with varying radii along a path."""
    n = len(pts)
    if n < 2: return []
    rings = []
    for i in range(n):
        p = Vector(pts[i])
        r = radii[i]
        if i == 0:
            tangent = (Vector(pts[1]) - p).normalized()
        elif i == n - 1:
            tangent = (p - Vector(pts[n - 2])).normalized()
        else:
            tangent = (Vector(pts[i + 1]) - Vector(pts[i - 1])).normalized()

        up = Vector((0, 0, 1)) if abs(tangent.z) < 0.9 else Vector((0, 1, 0))
        side = tangent.cross(up).normalized()
        norm = side.cross(tangent).normalized()

        ring_verts = []
        for s in range(seg):
            theta = (2.0 * math.pi * s) / seg
            offset = side * (math.cos(theta) * r) + norm * (math.sin(theta) * r)
            v = bm.verts.new(p + offset)
            ring_verts.append(v)
        rings.append(ring_verts)

    faces = []
    for i in range(n - 1):
        r1 = rings[i]
        r2 = rings[i + 1]
        for s in range(seg):
            s_next = (s + 1) % seg
            f = bm.faces.new([r1[s], r2[s], r2[s_next], r1[s_next]])
            faces.append(f)

    if cap:
        c1 = bm.verts.new(Vector(pts[0]))
        c2 = bm.verts.new(Vector(pts[-1]))
        r_start = rings[0]
        r_end = rings[-1]
        for s in range(seg):
            s_next = (s + 1) % seg
            faces.append(bm.faces.new([c1, r_start[s_next], r_start[s]]))
            faces.append(bm.faces.new([c2, r_end[s], r_end[s_next]]))

    return faces

def build_krish_character():
    clean_scene()

    # 1. Load CC0 Base Mesh
    with bpy.data.libraries.load(BUNDLE_PATH) as (df, dt):
        dt.objects = ['GEO-body_male_realistic', 'GEO-body_male_realistic.eye.R', 'GEO-body_male_realistic.eye.L']

    for o in dt.objects:
        bpy.context.collection.objects.link(o)

    body = bpy.data.objects['GEO-body_male_realistic']
    eye_r = bpy.data.objects['GEO-body_male_realistic.eye.R']
    eye_l = bpy.data.objects['GEO-body_male_realistic.eye.L']

    # Remove Multires modifier for clean lightweight topology
    body.modifiers.clear()

    # Center body at X=0 and scale to 1.83m
    body.location.x += 2.2643
    body.scale = (SCALE, SCALE, SCALE)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Position eyes properly inside sockets
    eye_r.location = Vector((-0.0329 * SCALE, -0.1218 * SCALE, 1.5737 * SCALE))
    eye_r.scale = (SCALE, SCALE, SCALE)
    bpy.context.view_layer.objects.active = eye_r
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    eye_l.location = Vector((0.0329 * SCALE, -0.1218 * SCALE, 1.5737 * SCALE))
    eye_l.scale = (SCALE, SCALE, SCALE)
    bpy.context.view_layer.objects.active = eye_l
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # 2. PBR Materials
    mat_skin = create_pbr_material("Krish_Skin", (0.50, 0.32, 0.18, 1.0), roughness=0.52, clearcoat=0.08) # Warm tan Indian tone
    mat_hair = create_pbr_material("Krish_Hair", (0.018, 0.014, 0.011, 1.0), roughness=0.62)             # Deep black wavy
    mat_beard = create_pbr_material("Krish_Beard", (0.020, 0.016, 0.012, 1.0), roughness=0.70)           # Neat short beard
    mat_shirt = create_pbr_material("Krish_Shirt", (0.35, 0.65, 0.92, 1.0), roughness=0.68)             # Light blue cotton shirt
    mat_pants = create_pbr_material("Krish_Pants", (0.030, 0.035, 0.040, 1.0), roughness=0.78)          # Dark charcoal trousers
    mat_belt = create_pbr_material("Krish_Belt", (0.12, 0.07, 0.04, 1.0), roughness=0.45)                # Brown leather belt
    mat_buckle = create_pbr_material("Krish_Buckle", (0.85, 0.88, 0.90, 1.0), roughness=0.18, metalness=0.92) # Silver buckle
    mat_shoes = create_pbr_material("Krish_Shoes", (0.14, 0.08, 0.05, 1.0), roughness=0.48)             # Brown dress shoes
    mat_sole = create_pbr_material("Krish_Sole", (0.05, 0.05, 0.06, 1.0), roughness=0.60)                # Dark welt/sole
    mat_watch = create_pbr_material("Krish_Watch", (0.92, 0.75, 0.18, 1.0), roughness=0.22, metalness=0.92) # Gold watch
    mat_buttons = create_pbr_material("Krish_Buttons", (0.95, 0.95, 0.97, 1.0), roughness=0.25)        # Pearl white buttons
    mat_sclera = create_pbr_material("Krish_Sclera", (0.94, 0.94, 0.96, 1.0), roughness=0.10)          # Glossy sclera
    mat_iris = create_pbr_material("Krish_Iris", (0.04, 0.024, 0.015, 1.0), roughness=0.08, clearcoat=0.5) # Warm dark brown iris

    body.data.materials.clear()
    body.data.materials.append(mat_skin)

    for eye in [eye_l, eye_r]:
        eye.data.materials.clear()
        eye.data.materials.append(mat_sclera)
        eye.data.materials.append(mat_iris)
        ey_center = sum((v.co.y for v in eye.data.vertices)) / len(eye.data.vertices)
        for p in eye.data.polygons:
            p_cy = sum(eye.data.vertices[v].co.y for v in p.vertices) / len(p.vertices)
            p.material_index = 1 if p_cy < ey_center - 0.005 else 0

    # 3. Shape the Face subtle smile & jawline
    bm = bmesh.new()
    bm.from_mesh(body.data)
    for v in bm.verts:
        # Subtle gentle smile at mouth corners
        if 1.58 < v.co.z < 1.63 and v.co.y < -0.125 and abs(v.co.x) > 0.018:
            dist = math.sqrt(v.co.x**2 + (v.co.z - 1.60)**2)
            if dist < 0.045:
                v.co.z += 0.003
                v.co.y -= 0.002
        # Friendly jawline curvature
        if 1.50 < v.co.z < 1.57 and -0.06 < v.co.y < 0.02:
            if abs(v.co.x) > 0.04:
                v.co.x *= 1.015
    bm.to_mesh(body.data)
    bm.free()

    # 4. Create 3D Hair Object
    # Multi-layered flowing wavy hair with distinct locks and natural fringe
    hair_mesh = bpy.data.meshes.new("Krish_Hair")
    hair_obj = bpy.data.objects.new("Krish_Hair", hair_mesh)
    bpy.context.collection.objects.link(hair_obj)
    hair_obj.data.materials.append(mat_hair)

    bm_hair = bmesh.new()

    # Hair scalp cap for full coverage
    bmesh.ops.create_uvsphere(
        bm_hair,
        u_segments=24,
        v_segments=16,
        radius=0.108 * SCALE,
        matrix=Matrix.Translation(Vector((0.0, -0.008 * SCALE, 1.66 * SCALE))) @ Matrix.Scale(1.08, 4, Vector((0, 0, 1)))
    )
    # Remove lower front half of sphere so face is completely open
    verts_to_remove = [v for v in bm_hair.verts if v.co.z < 1.62 * SCALE and v.co.y < 0.0]
    bmesh.ops.delete(bm_hair, geom=verts_to_remove, context='VERTS')

    # Distinct wavy locks matching krish-real.jpg and krish-reference.png:
    wavy_locks = [
        # Front Fringe - sweeps slightly left to right with soft waves
        ([(0.00, -0.105, 1.76), (0.015, -0.125, 1.73), (0.035, -0.130, 1.69), (0.050, -0.122, 1.66)], [0.018, 0.022, 0.018, 0.006]),
        ([(-0.025, -0.100, 1.75), (-0.035, -0.120, 1.72), (-0.030, -0.125, 1.68), (-0.015, -0.120, 1.65)], [0.016, 0.020, 0.016, 0.005]),
        ([(0.030, -0.100, 1.75), (0.050, -0.118, 1.72), (0.065, -0.115, 1.68), (0.075, -0.105, 1.65)], [0.016, 0.020, 0.016, 0.005]),
        ([(-0.050, -0.090, 1.74), (-0.070, -0.105, 1.71), (-0.075, -0.100, 1.67), (-0.065, -0.085, 1.63)], [0.018, 0.022, 0.018, 0.006]),
        ([(0.055, -0.090, 1.74), (0.075, -0.105, 1.71), (0.080, -0.100, 1.67), (0.070, -0.085, 1.63)], [0.018, 0.022, 0.018, 0.006]),

        # Crown & Top Volume - wavy layering
        ([(0.00, -0.050, 1.80), (0.01, -0.020, 1.83), (0.025, 0.020, 1.82), (0.02, 0.060, 1.79)], [0.022, 0.026, 0.024, 0.010]),
        ([(-0.035, -0.040, 1.79), (-0.05, -0.010, 1.82), (-0.045, 0.030, 1.81), (-0.03, 0.070, 1.78)], [0.020, 0.025, 0.022, 0.010]),
        ([(0.035, -0.040, 1.79), (0.05, -0.010, 1.82), (0.045, 0.030, 1.81), (0.03, 0.070, 1.78)], [0.020, 0.025, 0.022, 0.010]),

        # Left Sideburns & Ear Framing
        ([(-0.085, -0.060, 1.72), (-0.100, -0.040, 1.69), (-0.105, -0.015, 1.65), (-0.095, 0.005, 1.61)], [0.016, 0.020, 0.018, 0.008]),
        ([(-0.090, -0.020, 1.68), (-0.105, 0.005, 1.64), (-0.100, 0.025, 1.60), (-0.085, 0.035, 1.56)], [0.016, 0.018, 0.016, 0.008]),

        # Right Sideburns & Ear Framing
        ([(0.085, -0.060, 1.72), (0.100, -0.040, 1.69), (0.105, -0.015, 1.65), (0.095, 0.005, 1.61)], [0.016, 0.020, 0.018, 0.008]),
        ([(0.090, -0.020, 1.68), (0.105, 0.005, 1.64), (0.100, 0.025, 1.60), (0.085, 0.035, 1.56)], [0.016, 0.018, 0.016, 0.008]),

        # Rear/Back Volume down to nape
        ([(0.00, 0.040, 1.80), (0.00, 0.080, 1.77), (0.00, 0.105, 1.72), (0.00, 0.095, 1.65)], [0.024, 0.026, 0.022, 0.012]),
        ([(-0.045, 0.035, 1.79), (-0.055, 0.075, 1.75), (-0.050, 0.095, 1.70), (-0.040, 0.085, 1.64)], [0.020, 0.024, 0.020, 0.010]),
        ([(0.045, 0.035, 1.79), (0.055, 0.075, 1.75), (0.050, 0.095, 1.70), (0.040, 0.085, 1.64)], [0.020, 0.024, 0.020, 0.010]),
        ([(0.00, 0.090, 1.65), (0.00, 0.080, 1.60), (0.00, 0.065, 1.55)], [0.020, 0.018, 0.008]),
        ([(-0.035, 0.085, 1.64), (-0.040, 0.075, 1.59), (-0.035, 0.060, 1.54)], [0.018, 0.016, 0.008]),
        ([(0.035, 0.085, 1.64), (0.040, 0.075, 1.59), (0.035, 0.060, 1.54)], [0.018, 0.016, 0.008]),
    ]

    for pts, radii in wavy_locks:
        scaled_pts = [(p[0] * SCALE, p[1] * SCALE, p[2] * SCALE) for p in pts]
        scaled_radii = [r * SCALE for r in radii]
        add_smooth_tube(bm_hair, scaled_pts, scaled_radii, seg=10)

    for f in bm_hair.faces:
        f.smooth = True

    bm_hair.to_mesh(hair_mesh)
    bm_hair.free()

    # 5. Create 3D Beard & Moustache Object
    beard_mesh = bpy.data.meshes.new("Krish_Beard")
    beard_obj = bpy.data.objects.new("Krish_Beard", beard_mesh)
    bpy.context.collection.objects.link(beard_obj)
    beard_obj.data.materials.append(mat_beard)

    bm_beard = bmesh.new()

    beard_strands = [
        # Moustache - Left & Right sweeping naturally along upper lip
        ([(-0.005, -0.134, 1.618), (-0.018, -0.136, 1.616), (-0.032, -0.130, 1.610), (-0.042, -0.120, 1.602)], [0.005, 0.006, 0.005, 0.002]),
        ([(0.005, -0.134, 1.618), (0.018, -0.136, 1.616), (0.032, -0.130, 1.610), (0.042, -0.120, 1.602)], [0.005, 0.006, 0.005, 0.002]),

        # Soul patch under lower lip
        ([(0.000, -0.128, 1.588), (0.000, -0.125, 1.578), (0.000, -0.120, 1.568)], [0.005, 0.006, 0.003]),

        # Chin beard - center & curve
        ([(0.000, -0.118, 1.562), (0.000, -0.112, 1.545), (0.000, -0.095, 1.530)], [0.008, 0.010, 0.006]),
        ([(-0.015, -0.115, 1.560), (-0.020, -0.108, 1.544), (-0.022, -0.092, 1.530)], [0.007, 0.009, 0.005]),
        ([(0.015, -0.115, 1.560), (0.020, -0.108, 1.544), (0.022, -0.092, 1.530)], [0.007, 0.009, 0.005]),

        # Jawline beard - Left jaw to sideburns
        ([(-0.025, -0.095, 1.532), (-0.042, -0.075, 1.538), (-0.060, -0.045, 1.552), (-0.075, -0.015, 1.575), (-0.082, 0.005, 1.610)], [0.007, 0.008, 0.008, 0.007, 0.004]),
        # Jawline beard - Right jaw to sideburns
        ([(0.025, -0.095, 1.532), (0.042, -0.075, 1.538), (0.060, -0.045, 1.552), (0.075, -0.015, 1.575), (0.082, 0.005, 1.610)], [0.007, 0.008, 0.008, 0.007, 0.004]),
    ]

    for pts, radii in beard_strands:
        scaled_pts = [(p[0] * SCALE, p[1] * SCALE, p[2] * SCALE) for p in pts]
        scaled_radii = [r * SCALE for r in radii]
        add_smooth_tube(bm_beard, scaled_pts, scaled_radii, seg=8)

    for f in bm_beard.faces:
        f.smooth = True

    bm_beard.to_mesh(beard_mesh)
    bm_beard.free()

    # 6. Create 3D Light-Blue Shirt (Real Fitted Garment Geometry)
    shirt_mesh = bpy.data.meshes.new("Krish_Shirt")
    shirt_obj = bpy.data.objects.new("Krish_Shirt", shirt_mesh)
    bpy.context.collection.objects.link(shirt_obj)
    shirt_obj.data.materials.append(mat_shirt)
    shirt_obj.data.materials.append(mat_buttons)

    bm_shirt = bmesh.new()

    # Shirt Torso: Fitted cylinder from waist to neck with chest taper
    torso_rings = [
        # (z, radius_x, radius_y, center_y)
        (1.03 * SCALE, 0.170 * SCALE, 0.125 * SCALE, -0.008 * SCALE), # Waist hem tucked into trousers
        (1.10 * SCALE, 0.175 * SCALE, 0.130 * SCALE, -0.006 * SCALE), # Lower abdomen
        (1.20 * SCALE, 0.185 * SCALE, 0.140 * SCALE, -0.003 * SCALE), # Upper abdomen
        (1.30 * SCALE, 0.205 * SCALE, 0.155 * SCALE,  0.000 * SCALE), # Broad chest
        (1.38 * SCALE, 0.220 * SCALE, 0.158 * SCALE,  0.002 * SCALE), # Underarms/pecs
        (1.44 * SCALE, 0.210 * SCALE, 0.145 * SCALE,  0.004 * SCALE), # Shoulder line
        (1.48 * SCALE, 0.085 * SCALE, 0.085 * SCALE,  0.005 * SCALE), # Base of neck
    ]

    rings = []
    seg = 20
    for z, rx, ry, cy in torso_rings:
        r_verts = []
        for s in range(seg):
            theta = (2.0 * math.pi * s) / seg
            # Open collar notch in front at the top ring (s around seg * 0.75)
            vx = math.sin(theta) * rx
            vy = math.cos(theta) * ry + cy
            vz = z
            r_verts.append(bm_shirt.verts.new(Vector((vx, vy, vz))))
        rings.append(r_verts)

    for i in range(len(torso_rings) - 1):
        r1 = rings[i]
        r2 = rings[i + 1]
        for s in range(seg):
            s_next = (s + 1) % seg
            # Leave open V-neck notch at top front collar
            if i == len(torso_rings) - 2 and (s == 10 or s == 9):
                continue
            bm_shirt.faces.new([r1[s], r2[s], r2[s_next], r1[s_next]])

    # 3D Folded Collar around neck
    collar_pts_l = [
        (-0.015 * SCALE, -0.075 * SCALE, 1.45 * SCALE),
        (-0.055 * SCALE, -0.085 * SCALE, 1.47 * SCALE),
        (-0.085 * SCALE, -0.055 * SCALE, 1.49 * SCALE),
        (-0.080 * SCALE,  0.020 * SCALE, 1.50 * SCALE),
        ( 0.000 * SCALE,  0.065 * SCALE, 1.50 * SCALE),
    ]
    add_smooth_tube(bm_shirt, collar_pts_l, [0.015 * SCALE] * len(collar_pts_l), seg=8)

    collar_pts_r = [
        (0.015 * SCALE, -0.075 * SCALE, 1.45 * SCALE),
        (0.055 * SCALE, -0.085 * SCALE, 1.47 * SCALE),
        (0.085 * SCALE, -0.055 * SCALE, 1.49 * SCALE),
        (0.080 * SCALE,  0.020 * SCALE, 1.50 * SCALE),
        (0.000 * SCALE,  0.065 * SCALE, 1.50 * SCALE),
    ]
    add_smooth_tube(bm_shirt, collar_pts_r, [0.015 * SCALE] * len(collar_pts_r), seg=8)

    # 3/4 Sleeves: Rolled up to mid-forearm (leaving forearms and hands bare as in reference)
    for sign in [-1, 1]:
        sleeve_pts = [
            (sign * 0.20 * SCALE, -0.005 * SCALE, 1.42 * SCALE), # Shoulder seam
            (sign * 0.26 * SCALE, -0.010 * SCALE, 1.34 * SCALE), # Deltoid
            (sign * 0.31 * SCALE, -0.012 * SCALE, 1.25 * SCALE), # Mid bicep
            (sign * 0.34 * SCALE, -0.015 * SCALE, 1.16 * SCALE), # Elbow
            (sign * 0.35 * SCALE, -0.015 * SCALE, 1.09 * SCALE), # Rolled cuff!
        ]
        sleeve_radii = [0.072 * SCALE, 0.068 * SCALE, 0.064 * SCALE, 0.060 * SCALE, 0.066 * SCALE]
        add_smooth_tube(bm_shirt, sleeve_pts, sleeve_radii, seg=12)

    # Left Chest Pocket
    pocket_verts = [
        bm_shirt.verts.new(Vector((0.045 * SCALE, -0.155 * SCALE, 1.35 * SCALE))),
        bm_shirt.verts.new(Vector((0.095 * SCALE, -0.155 * SCALE, 1.35 * SCALE))),
        bm_shirt.verts.new(Vector((0.095 * SCALE, -0.150 * SCALE, 1.28 * SCALE))),
        bm_shirt.verts.new(Vector((0.045 * SCALE, -0.150 * SCALE, 1.28 * SCALE))),
    ]
    bm_shirt.faces.new(pocket_verts)

    # Front Placket with buttons
    placket_pts = [
        (0.0, -0.145 * SCALE, 1.43 * SCALE),
        (0.0, -0.155 * SCALE, 1.34 * SCALE),
        (0.0, -0.140 * SCALE, 1.20 * SCALE),
        (0.0, -0.130 * SCALE, 1.04 * SCALE),
    ]
    add_smooth_tube(bm_shirt, placket_pts, [0.012 * SCALE] * len(placket_pts), seg=8)

    # 3 Small White Pearl Buttons
    for b_z in [1.36 * SCALE, 1.26 * SCALE, 1.15 * SCALE]:
        btn = bmesh.ops.create_icosphere(
            bm_shirt,
            subdivisions=2,
            radius=0.006 * SCALE,
            matrix=Matrix.Translation(Vector((0.0, -0.158 * SCALE if b_z > 1.3 * SCALE else -0.145 * SCALE, b_z)))
        )
        set_op_material(btn, 1)

    for f in bm_shirt.faces:
        if f.material_index != 1:
            f.material_index = 0
        f.smooth = True

    bm_shirt.to_mesh(shirt_mesh)
    bm_shirt.free()

    # 7. Create 3D Leather Belt & Silver Buckle
    belt_mesh = bpy.data.meshes.new("Krish_Belt")
    belt_obj = bpy.data.objects.new("Krish_Belt", belt_mesh)
    bpy.context.collection.objects.link(belt_obj)
    belt_obj.data.materials.append(mat_belt)
    belt_obj.data.materials.append(mat_buckle)

    bm_belt = bmesh.new()
    belt_rings = [
        (1.015 * SCALE, 0.178 * SCALE, 0.132 * SCALE),
        (1.050 * SCALE, 0.178 * SCALE, 0.132 * SCALE)
    ]
    b_verts_1 = [bm_belt.verts.new(Vector((math.sin(t) * belt_rings[0][1], math.cos(t) * belt_rings[0][2] - 0.008 * SCALE, belt_rings[0][0]))) for t in [2*math.pi*s/24 for s in range(24)]]
    b_verts_2 = [bm_belt.verts.new(Vector((math.sin(t) * belt_rings[1][1], math.cos(t) * belt_rings[1][2] - 0.008 * SCALE, belt_rings[1][0]))) for t in [2*math.pi*s/24 for s in range(24)]]
    for s in range(24):
        s_next = (s + 1) % 24
        f = bm_belt.faces.new([b_verts_1[s], b_verts_2[s], b_verts_2[s_next], b_verts_1[s_next]])
        f.material_index = 0

    # Rectangular Silver Buckle in front
    buckle_box = bmesh.ops.create_cube(
        bm_belt,
        size=0.015 * SCALE,
        matrix=Matrix.Translation(Vector((0.0, -0.144 * SCALE, 1.033 * SCALE))) @ Matrix.Scale(2.5, 4, Vector((1, 0, 0))) @ Matrix.Scale(1.8, 4, Vector((0, 0, 1)))
    )
    set_op_material(buckle_box, 1)

    for f in bm_belt.faces:
        f.smooth = True
    bm_belt.to_mesh(belt_mesh)
    bm_belt.free()

    # 8. Create 3D Dark Tailored Trousers
    pants_mesh = bpy.data.meshes.new("Krish_Pants")
    pants_obj = bpy.data.objects.new("Krish_Pants", pants_mesh)
    bpy.context.collection.objects.link(pants_obj)
    pants_obj.data.materials.append(mat_pants)

    bm_pants = bmesh.new()

    # Pelvis/Seat region
    pelvis_rings = [
        (1.03 * SCALE, 0.175 * SCALE, 0.130 * SCALE, -0.008 * SCALE),
        (0.95 * SCALE, 0.180 * SCALE, 0.138 * SCALE, -0.008 * SCALE),
        (0.88 * SCALE, 0.175 * SCALE, 0.142 * SCALE, -0.008 * SCALE),
    ]
    p_rings = []
    for z, rx, ry, cy in pelvis_rings:
        r_verts = [bm_pants.verts.new(Vector((math.sin(t) * rx, math.cos(t) * ry + cy, z))) for t in [2*math.pi*s/20 for s in range(20)]]
        p_rings.append(r_verts)

    for i in range(len(pelvis_rings) - 1):
        r1 = p_rings[i]
        r2 = p_rings[i + 1]
        for s in range(20):
            s_next = (s + 1) % 20
            bm_pants.faces.new([r1[s], r2[s], r2[s_next], r1[s_next]])

    # Left & Right Legs
    for sign in [-1, 1]:
        leg_pts = [
            (sign * 0.095 * SCALE, -0.008 * SCALE, 0.88 * SCALE), # Crotch/hip
            (sign * 0.105 * SCALE, -0.008 * SCALE, 0.75 * SCALE), # Upper thigh
            (sign * 0.110 * SCALE, -0.008 * SCALE, 0.60 * SCALE), # Mid thigh
            (sign * 0.108 * SCALE, -0.004 * SCALE, 0.46 * SCALE), # Knee
            (sign * 0.105 * SCALE,  0.002 * SCALE, 0.32 * SCALE), # Calf
            (sign * 0.102 * SCALE,  0.002 * SCALE, 0.18 * SCALE), # Lower shin
            (sign * 0.100 * SCALE,  0.002 * SCALE, 0.08 * SCALE), # Ankle cuff
        ]
        leg_radii = [
            0.082 * SCALE,
            0.078 * SCALE,
            0.072 * SCALE,
            0.065 * SCALE,
            0.062 * SCALE,
            0.058 * SCALE,
            0.056 * SCALE,
        ]
        add_smooth_tube(bm_pants, leg_pts, leg_radii, seg=14)

    for f in bm_pants.faces:
        f.smooth = True
    bm_pants.to_mesh(pants_mesh)
    bm_pants.free()

    # 9. Create 3D Brown Dress Shoes
    shoes_mesh = bpy.data.meshes.new("Krish_Shoes")
    shoes_obj = bpy.data.objects.new("Krish_Shoes", shoes_mesh)
    bpy.context.collection.objects.link(shoes_obj)
    shoes_obj.data.materials.append(mat_shoes)
    shoes_obj.data.materials.append(mat_sole)

    bm_shoes = bmesh.new()

    for sign in [-1, 1]:
        cx = sign * 0.102 * SCALE
        # Main shoe upper
        shoe_box = bmesh.ops.create_cube(
            bm_shoes,
            size=0.08 * SCALE,
            matrix=Matrix.Translation(Vector((cx, -0.045 * SCALE, 0.045 * SCALE))) @ Matrix.Scale(1.05, 4, Vector((1, 0, 0))) @ Matrix.Scale(2.6, 4, Vector((0, 1, 0))) @ Matrix.Scale(0.85, 4, Vector((0, 0, 1)))
        )
        set_op_material(shoe_box, 0)

        # Front toe cap rounding
        toe_sphere = bmesh.ops.create_uvsphere(
            bm_shoes,
            u_segments=12,
            v_segments=8,
            radius=0.042 * SCALE,
            matrix=Matrix.Translation(Vector((cx, -0.125 * SCALE, 0.038 * SCALE))) @ Matrix.Scale(1.0, 4, Vector((1, 0, 0))) @ Matrix.Scale(1.2, 4, Vector((0, 1, 0))) @ Matrix.Scale(0.7, 4, Vector((0, 0, 1)))
        )
        set_op_material(toe_sphere, 0)

        # Dark shoe sole resting directly on Z=0
        sole_box = bmesh.ops.create_cube(
            bm_shoes,
            size=0.085 * SCALE,
            matrix=Matrix.Translation(Vector((cx, -0.045 * SCALE, 0.010 * SCALE))) @ Matrix.Scale(1.1, 4, Vector((1, 0, 0))) @ Matrix.Scale(2.8, 4, Vector((0, 1, 0))) @ Matrix.Scale(0.22, 4, Vector((0, 0, 1)))
        )
        set_op_material(sole_box, 1)

    for f in bm_shoes.faces:
        f.smooth = True
    bm_shoes.to_mesh(shoes_mesh)
    bm_shoes.free()

    # 10. Create 3D Golden Watch (Left Wrist)
    watch_mesh = bpy.data.meshes.new("Krish_Watch")
    watch_obj = bpy.data.objects.new("Krish_Watch", watch_mesh)
    bpy.context.collection.objects.link(watch_obj)
    watch_obj.data.materials.append(mat_watch)

    bm_watch = bmesh.new()
    # Left wrist position: x = +0.365 * SCALE, y = -0.015 * SCALE, z = 0.98 * SCALE
    watch_pos = Vector((0.365 * SCALE, -0.015 * SCALE, 0.98 * SCALE))
    # Watch strap ring
    bmesh.ops.create_circle(
        bm_watch,
        cap_ends=False,
        segments=16,
        radius=0.038 * SCALE,
        matrix=Matrix.Translation(watch_pos) @ Matrix.Rotation(math.pi * 0.5, 4, 'X')
    )
    # Extrude ring into band
    bmesh.ops.create_cone(
        bm_watch,
        cap_ends=True,
        cap_tris=False,
        segments=16,
        radius1=0.039 * SCALE,
        radius2=0.039 * SCALE,
        depth=0.018 * SCALE,
        matrix=Matrix.Translation(watch_pos) @ Matrix.Rotation(math.pi * 0.5, 4, 'Y')
    )
    # Circular gold watch face on top
    bmesh.ops.create_cone(
        bm_watch,
        cap_ends=True,
        cap_tris=False,
        segments=16,
        radius1=0.018 * SCALE,
        radius2=0.018 * SCALE,
        depth=0.008 * SCALE,
        matrix=Matrix.Translation(watch_pos + Vector((0.038 * SCALE, 0, 0))) @ Matrix.Rotation(math.pi * 0.5, 4, 'Y')
    )
    for f in bm_watch.faces:
        f.smooth = True
    bm_watch.to_mesh(watch_mesh)
    bm_watch.free()

    print("All geometry created successfully!")
    return {
        'body': body,
        'eye_r': eye_r,
        'eye_l': eye_l,
        'hair': hair_obj,
        'beard': beard_obj,
        'shirt': shirt_obj,
        'belt': belt_obj,
        'pants': pants_obj,
        'shoes': shoes_obj,
        'watch': watch_obj,
    }

def setup_studio_lighting():
    # World background
    world = bpy.data.worlds.new("StudioWorld")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.05, 0.06, 0.08, 1.0)
        bg.inputs["Strength"].default_value = 0.6

    # Key Light
    key_data = bpy.data.lights.new("KeyLight", type='AREA')
    key_data.energy = 180
    key_data.size = 1.2
    key_data.color = (1.0, 0.98, 0.94)
    key_obj = bpy.data.objects.new("KeyLight", key_data)
    key_obj.location = (-1.4, -2.8, 2.4)
    bpy.context.collection.objects.link(key_obj)

    # Fill Light
    fill_data = bpy.data.lights.new("FillLight", type='AREA')
    fill_data.energy = 80
    fill_data.size = 1.6
    fill_data.color = (0.85, 0.92, 1.0)
    fill_obj = bpy.data.objects.new("FillLight", fill_data)
    fill_obj.location = (2.0, -2.2, 1.6)
    bpy.context.collection.objects.link(fill_obj)

    # Rim / Back Light
    rim_data = bpy.data.lights.new("RimLight", type='AREA')
    rim_data.energy = 140
    rim_data.size = 1.0
    rim_data.color = (0.95, 0.98, 1.0)
    rim_obj = bpy.data.objects.new("RimLight", rim_data)
    rim_obj.location = (0.2, 2.4, 2.2)
    bpy.context.collection.objects.link(rim_obj)

    # Head Key Light for crisp face definition
    face_light_data = bpy.data.lights.new("FaceLight", type='POINT')
    face_light_data.energy = 35
    face_light_data.color = (1.0, 0.98, 0.95)
    face_light_obj = bpy.data.objects.new("FaceLight", face_light_data)
    face_light_obj.location = (0.0, -1.2, 1.7)
    bpy.context.collection.objects.link(face_light_obj)

    # Ground stage disk
    stage_mesh = bpy.data.meshes.new("Stage")
    stage_obj = bpy.data.objects.new("Stage", stage_mesh)
    bpy.context.collection.objects.link(stage_obj)
    bm_stage = bmesh.new()
    bmesh.ops.create_circle(bm_stage, cap_ends=True, segments=48, radius=1.2, matrix=Matrix.Translation(Vector((0, 0, 0))))
    bm_stage.to_mesh(stage_mesh)
    bm_stage.free()
    mat_stage = create_pbr_material("Stage_Mat", (0.04, 0.045, 0.055, 1.0), roughness=0.3, metalness=0.1)
    stage_obj.data.materials.append(mat_stage)

def point_at(obj, target):
    direction = target - obj.location
    rot_quat = direction.to_track_quat('-Z', 'Y')
    obj.rotation_euler = rot_quat.to_euler()

def render_character_views(prefix="krish"):
    setup_studio_lighting()

    cam_data = bpy.data.cameras.new("RenderCam")
    cam_obj = bpy.data.objects.new("RenderCam", cam_data)
    bpy.context.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj

    scene = bpy.context.scene
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 1024
    scene.render.film_transparent = False

    views = [
        (f"{prefix}_front_full.png", Vector((0.0, -3.0, 0.95)), Vector((0.0, 0.0, 0.92)), 45),
        (f"{prefix}_threequarter.png", Vector((-2.1, -2.1, 1.0)), Vector((0.0, 0.0, 0.92)), 45),
        (f"{prefix}_side.png", Vector((-3.0, 0.0, 0.95)), Vector((0.0, 0.0, 0.92)), 45),
        (f"{prefix}_rear.png", Vector((0.0, 3.0, 0.95)), Vector((0.0, 0.0, 0.92)), 45),
        (f"{prefix}_face_closeup.png", Vector((0.0, -0.68, 1.62)), Vector((0.0, 0.0, 1.62)), 60),
    ]

    for fname, cam_pos, target, focal_len in views:
        cam_obj.location = cam_pos
        cam_data.lens = focal_len
        point_at(cam_obj, target)
        scene.render.filepath = os.path.join(VAL_DIR, fname)
        bpy.ops.render.render(write_still=True)
        print(f"Rendered: {fname}")

if __name__ == "__main__":
    objects = build_krish_character()
    render_character_views("krish")
    print("Done building and rendering Krish Normal character.")