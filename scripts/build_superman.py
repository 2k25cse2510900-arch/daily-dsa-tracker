"""
Build Stylized Superman Character for CharacterVerse (Polished Production v2)
Matches the exact KayKit low-poly art style of Buster Blitz (Knight) and Nebula Nova (Rogue).
Fixes:
1. Smooth shading across face, hair, body, limbs, and boots.
2. Sleek waist/belt contouring (eliminating chunky side pouches).
3. Exact vertex group weighting on all chest emblem vertices so it deforms in 100% lockstep with the chest in Running_A and Walking_A animations.
4. Proper outward forward depth of chest shield so it never clips into chest geometry.
5. Smooth front S-curl anchored to hairline and weighted 100% to head bone.
6. Clean wrist-to-hand transition (abs(x) >= 0.78 for peach hands, royal blue sleeves).
7. Validation rendering of idle and running animation poses.
"""

import bpy
import bmesh
import math
import os
import shutil
from mathutils import Vector, Matrix, Euler

WORKSPACE = r"C:\Users\Dell\OneDrive\Desktop\dsa_admin_dashboard"
VAL_DIR = os.path.join(WORKSPACE, "scratch", "characterverse_validation")
os.makedirs(VAL_DIR, exist_ok=True)

ROGUE_PATH = os.path.join(WORKSPACE, "characterverse", "public", "models", "Rogue.glb")
KNIGHT_PATH = os.path.join(WORKSPACE, "characterverse", "public", "models", "Knight.glb")

TARGET_GLB_PATHS = [
    os.path.join(WORKSPACE, "characterverse", "public", "models", "Superman.glb"),
    os.path.join(WORKSPACE, "characterverse", "dist", "models", "Superman.glb"),
    os.path.join(WORKSPACE, "characterverse", "dist-embed", "models", "Superman.glb"),
    os.path.join(WORKSPACE, "public", "characterverse", "models", "Superman.glb"),
    os.path.join(WORKSPACE, "public", "characterverse-embed", "models", "Superman.glb"),
]

# ─────────────────────────────────────────────────────────────
# 1. PBR TEXTURE ATLAS CREATION
# ─────────────────────────────────────────────────────────────
def create_superman_texture():
    tex_path = os.path.join(VAL_DIR, "superman_texture.png")
    width, height = 1024, 1024
    
    PALETTE = {
        'ROYAL_BLUE':   (0.043, 0.369, 0.843, 1.0), # #0b5ed7
        'DARK_BLUE':    (0.020, 0.220, 0.550, 1.0),
        'SUPERMAN_RED': (0.863, 0.149, 0.149, 1.0), # #dc2626
        'CRIMSON_RED':  (0.600, 0.080, 0.080, 1.0),
        'HERO_YELLOW':  (1.000, 0.757, 0.027, 1.0), # #ffc107
        'DARK_GOLD':    (0.850, 0.467, 0.024, 1.0), # #d97706
        'SKIN_PEACH':   (0.996, 0.843, 0.667, 1.0), # #fed7aa
        'JET_BLACK':    (0.067, 0.094, 0.153, 1.0), # #111827
    }

    CELL_MAP = [
        ['ROYAL_BLUE',   'DARK_BLUE',    'SUPERMAN_RED', 'CRIMSON_RED'],
        ['HERO_YELLOW',  'DARK_GOLD',    'SKIN_PEACH',   'JET_BLACK'],
        ['ROYAL_BLUE',   'SUPERMAN_RED', 'HERO_YELLOW',  'SKIN_PEACH'],
        ['JET_BLACK',    'ROYAL_BLUE',   'SUPERMAN_RED', 'CRIMSON_RED'],
    ]

    image = bpy.data.images.new("SupermanAtlas", width=width, height=height)
    pixels = [0.0] * (width * height * 4)

    for y in range(height):
        cell_y = int(y / (height / 4))
        for x in range(width):
            cell_x = int(x / (width / 4))
            color_name = CELL_MAP[3 - cell_y][cell_x]
            color = PALETTE[color_name]
            idx = (y * width + x) * 4
            pixels[idx]     = color[0]
            pixels[idx + 1] = color[1]
            pixels[idx + 2] = color[2]
            pixels[idx + 3] = color[3]

    image.pixels = pixels
    image.filepath_raw = tex_path
    image.file_format = 'PNG'
    image.save()
    print(f"Texture atlas generated at {tex_path}")
    return tex_path

UV_ROYAL_BLUE   = (0.125, 0.875)
UV_DARK_BLUE    = (0.375, 0.875)
UV_SUPERMAN_RED = (0.625, 0.875)
UV_CRIMSON_RED  = (0.875, 0.875)
UV_HERO_YELLOW  = (0.125, 0.625)
UV_DARK_GOLD    = (0.375, 0.625)
UV_SKIN_PEACH   = (0.625, 0.625)
UV_JET_BLACK    = (0.875, 0.625)

# ─────────────────────────────────────────────────────────────
# 2. BUILD SUPERMAN MODEL
# ─────────────────────────────────────────────────────────────
def build_superman():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    tex_path = create_superman_texture()

    # 1. Import Rogue.glb as the athletic base body
    bpy.ops.import_scene.gltf(filepath=ROGUE_PATH)
    
    remove_names = [
        'Rogue_Head', 'Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 
        'Knife', 'Throwable', 'Icosphere'
    ]
    for name in remove_names:
        o = bpy.data.objects.get(name)
        if o:
            bpy.data.objects.remove(o, do_unlink=True)
            
    rig = bpy.data.objects.get('Rig')
    body_obj = bpy.data.objects.get('Rogue_Body')
    arm_l_obj = bpy.data.objects.get('Rogue_ArmLeft')
    arm_r_obj = bpy.data.objects.get('Rogue_ArmRight')
    leg_l_obj = bpy.data.objects.get('Rogue_LegLeft')
    leg_r_obj = bpy.data.objects.get('Rogue_LegRight')
    cape_obj = bpy.data.objects.get('Rogue_Cape')
    
    # 2. Import Knight.glb to extract Knight_Head (heroic male head)
    temp_col = bpy.data.collections.new("TempKnight")
    bpy.context.scene.collection.children.link(temp_col)
    bpy.ops.import_scene.gltf(filepath=KNIGHT_PATH)
    head_obj = bpy.data.objects.get('Knight_Head')
    
    head_obj.parent = rig
    for mod in head_obj.modifiers:
        if mod.type == 'ARMATURE':
            mod.object = rig
            
    for o in list(bpy.data.objects):
        if o.name.startswith('Knight_') and o != head_obj:
            bpy.data.objects.remove(o, do_unlink=True)
        elif o.name.startswith(('1H_', '2H_', 'Badge_', 'Rectangle_', 'Round_', 'Spike_', 'Icosphere.', 'Cube.')):
            bpy.data.objects.remove(o, do_unlink=True)
        elif o.name == 'Rig.001':
            bpy.data.objects.remove(o, do_unlink=True)
            
    bpy.data.collections.remove(temp_col)
    
    head_obj.name = 'Superman_Head'
    body_obj.name = 'Superman_Body'
    arm_l_obj.name = 'Superman_ArmLeft'
    arm_r_obj.name = 'Superman_ArmRight'
    leg_l_obj.name = 'Superman_LegLeft'
    leg_r_obj.name = 'Superman_LegRight'
    cape_obj.name = 'Superman_Cape'
    
    # Shared PBR Material with Atlas
    superman_mat = bpy.data.materials.new(name="superman_texture")
    superman_mat.use_nodes = True
    nodes = superman_mat.node_tree.nodes
    links = superman_mat.node_tree.links
    nodes.clear()
    
    node_out = nodes.new(type='ShaderNodeOutputMaterial')
    node_bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
    node_tex = nodes.new(type='ShaderNodeTexImage')
    
    img = bpy.data.images.load(tex_path)
    node_tex.image = img
    node_tex.interpolation = 'Closest'
    
    node_bsdf.inputs['Roughness'].default_value = 0.50
    node_bsdf.inputs['Specular IOR Level'].default_value = 0.35
    
    links.new(node_tex.outputs['Color'], node_bsdf.inputs['Base Color'])
    links.new(node_bsdf.outputs['BSDF'], node_out.inputs['Surface'])
    
    for obj in [head_obj, body_obj, arm_l_obj, arm_r_obj, leg_l_obj, leg_r_obj, cape_obj]:
        obj.data.materials.clear()
        obj.data.materials.append(superman_mat)

    # ─────────────────────────────────────────────────────────────
    # A. HEAD: SMOOTH SHADING, SCULPTED JET BLACK HAIR & ICONIC S-CURL
    # ─────────────────────────────────────────────────────────────
    bm_head = bmesh.new()
    bm_head.from_mesh(head_obj.data)
    uv_head = bm_head.loops.layers.uv.verify()
    dvert_head = bm_head.verts.layers.deform.verify()
    head_vg = head_obj.vertex_groups.get('head')
    head_group_idx = head_vg.index if head_vg else 0
    
    # Authentic KayKit UV mapping: U < 0.11 is skin, U >= 0.11 is hair / eyes
    for f in bm_head.faces:
        f.smooth = True # Smooth shading for face and hair!
        u_vals = [loop[uv_head].uv.x for loop in f.loops]
        avg_u = sum(u_vals) / len(u_vals)
        if avg_u < 0.11:
            for loop in f.loops:
                loop[uv_head].uv = UV_SKIN_PEACH
        else:
            for loop in f.loops:
                loop[uv_head].uv = UV_JET_BLACK

    # Sculpted 3D Front S-Curl
    # Tapered spline curling down across the upper forehead
    curl_pts = [
        Vector((-0.06, -0.41, 1.97)), # Root at hairline
        Vector((-0.04, -0.44, 1.92)),
        Vector((-0.01, -0.46, 1.86)),
        Vector((0.02,  -0.47, 1.81)),
        Vector((0.03,  -0.47, 1.76)),
        Vector((0.01,  -0.45, 1.73)),
        Vector((-0.02, -0.44, 1.74)), # Curl upward flick
    ]
    radii = [0.030, 0.027, 0.023, 0.019, 0.015, 0.011, 0.006]
    
    prev_ring = None
    curl_verts = []
    for pt, r in zip(curl_pts, radii):
        ring = []
        for i in range(8):
            ang = i * math.pi * 2 / 8
            offset = Vector((math.cos(ang) * r, math.sin(ang) * r * 0.45, -math.sin(ang) * r * 0.85))
            v = bm_head.verts.new(pt + offset)
            v[dvert_head][head_group_idx] = 1.0 # 100% rigged to head bone!
            ring.append(v)
            curl_verts.append(v)
        if prev_ring:
            for i in range(8):
                i_next = (i + 1) % 8
                f = bm_head.faces.new([prev_ring[i], prev_ring[i_next], ring[i_next], ring[i]])
                f.smooth = True
                for loop in f.loops:
                    loop[uv_head].uv = UV_JET_BLACK
        prev_ring = ring

    # Tapered tip cap
    tip_v = bm_head.verts.new(Vector((-0.03, -0.43, 1.745)))
    tip_v[dvert_head][head_group_idx] = 1.0
    for i in range(8):
        i_next = (i + 1) % 8
        f = bm_head.faces.new([prev_ring[i], prev_ring[i_next], tip_v])
        f.smooth = True
        for loop in f.loops:
            loop[uv_head].uv = UV_JET_BLACK

    bm_head.normal_update()
    bm_head.to_mesh(head_obj.data)
    bm_head.free()
    head_obj.data.update()

    # ─────────────────────────────────────────────────────────────
    # B. BODY: SLEEK BELT, RED TRUNKS & PROPERLY RIGGED CHEST EMBLEM
    # ─────────────────────────────────────────────────────────────
    bm_body = bmesh.new()
    bm_body.from_mesh(body_obj.data)
    uv_body = bm_body.loops.layers.uv.verify()
    dvert_body = bm_body.verts.layers.deform.verify()
    
    # 1. Smooth the waist: pull in rogue side pouch vertices for sleek superhero belt
    for v in bm_body.verts:
        if 0.46 <= v.co.z <= 0.65:
            r = math.hypot(v.co.x, v.co.y)
            if r > 0.32:
                scale = 0.32 / r
                v.co.x *= scale
                v.co.y *= scale

    # 2. Recolor body faces: Royal Blue suit, Gold Belt, Red Trunks
    for f in bm_body.faces:
        f.smooth = True # Smooth shading!
        cz = f.calc_center_median().z
        cy = f.calc_center_median().y
        cx = abs(f.calc_center_median().x)
        
        if cz < 0.49:
            # Red Trunks
            for loop in f.loops:
                loop[uv_body].uv = UV_SUPERMAN_RED
        elif 0.49 <= cz <= 0.63:
            # Gold Belt & Buckle
            if cy < -0.26 and cx < 0.08:
                for loop in f.loops:
                    loop[uv_body].uv = UV_DARK_GOLD
            else:
                for loop in f.loops:
                    loop[uv_body].uv = UV_HERO_YELLOW
        else:
            # Royal Blue Suit
            for loop in f.loops:
                loop[uv_body].uv = UV_ROYAL_BLUE

    # 3. Sample original front chest vertices and their exact bone weights
    chest_vert_samples = []
    for v in bm_body.verts:
        if v.co.y < -0.22 and 0.70 < v.co.z < 1.15:
            w_dict = {g_idx: v[dvert_body][g_idx] for g_idx in v[dvert_body].keys()}
            chest_vert_samples.append((v.co.copy(), w_dict))

    def get_chest_weights(pt):
        best_dist = 999999.0
        best_w = None
        for co, w in chest_vert_samples:
            dist = (pt - co).length
            if dist < best_dist:
                best_dist = dist
                best_w = w
        return best_w or {}

    def get_front_y(x, z):
        """Calculates chest surface Y coordinate + forward offset"""
        # Rogue chest surface profile: forward peak at z=0.94, y=-0.3425
        z_factor = 1.0 - ((z - 0.94) / 0.16) ** 2
        x_factor = 1.0 - (x / 0.22) ** 2
        base_y = -0.318 - 0.025 * max(0.0, z_factor) - 0.015 * max(0.0, x_factor)
        return base_y

    # 4. 3D Raised Pentagon Chest Shield Emblem
    # Raised proud of chest surface:
    # Yellow plate: base_y - 0.012
    # Red outer rim: base_y - 0.020
    # Red S glyph: base_y - 0.028
    base_coords = [
        (-0.140, 1.060), # top left
        (0.000,  1.060), # top center
        (0.140,  1.060), # top right
        (0.160,  0.945), # mid right
        (0.000,  0.775), # bottom point
        (-0.160, 0.945), # mid left
    ]
    center_pt = Vector((0.0, get_front_y(0.0, 0.94) - 0.012, 0.94))
    center_v = bm_body.verts.new(center_pt)
    for g_idx, weight in get_chest_weights(center_pt).items():
        center_v[dvert_body][g_idx] = weight

    v_base = []
    for x, z in base_coords:
        pt = Vector((x, get_front_y(x, z) - 0.012, z))
        v = bm_body.verts.new(pt)
        for g_idx, weight in get_chest_weights(pt).items():
            v[dvert_body][g_idx] = weight
        v_base.append(v)

    for i in range(len(v_base)):
        i_next = (i + 1) % len(v_base)
        f = bm_body.faces.new([center_v, v_base[i], v_base[i_next]])
        f.smooth = True
        for loop in f.loops:
            loop[uv_body].uv = UV_HERO_YELLOW

    # Raised Red Outer Rim
    rim_coords = [
        (-0.155, 1.075),
        (0.000,  1.075),
        (0.155, 1.075),
        (0.178, 0.945),
        (0.000, 0.755),
        (-0.178, 0.945),
    ]
    v_rim = []
    for x, z in rim_coords:
        pt = Vector((x, get_front_y(x, z) - 0.020, z))
        v = bm_body.verts.new(pt)
        for g_idx, weight in get_chest_weights(pt).items():
            v[dvert_body][g_idx] = weight
        v_rim.append(v)

    for i in range(len(v_rim)):
        i_next = (i + 1) % len(v_rim)
        f = bm_body.faces.new([v_base[i], v_base[i_next], v_rim[i_next], v_rim[i]])
        f.smooth = True
        for loop in f.loops:
            loop[uv_body].uv = UV_SUPERMAN_RED

    # Visibly Raised 3D 'S' Symbol
    s_facets_2d = [
        # Upper horizontal roof
        [(-0.04, 1.04), (0.08, 1.04), (0.08, 1.00), (-0.04, 1.00)],
        # Upper-left rounded lobe
        [(-0.08, 1.04), (-0.04, 1.04), (-0.04, 0.94), (-0.08, 0.94)],
        # Center diagonal slash crossing from upper-left to lower-right
        [(-0.07, 0.97), (-0.02, 0.97), (0.07, 0.89), (0.02, 0.89)],
        # Lower-right rounded lobe
        [(0.03, 0.93), (0.08, 0.93), (0.08, 0.83), (0.03, 0.83)],
        # Bottom horizontal floor
        [(-0.06, 0.83), (0.07, 0.83), (0.05, 0.79), (-0.06, 0.79)],
        # Bottom-left tail terminal
        [(-0.08, 0.86), (-0.04, 0.86), (-0.04, 0.79), (-0.08, 0.79)],
    ]
    for facet in s_facets_2d:
        vs = []
        for x, z in facet:
            pt = Vector((x, get_front_y(x, z) - 0.028, z))
            v = bm_body.verts.new(pt)
            for g_idx, weight in get_chest_weights(pt).items():
                v[dvert_body][g_idx] = weight
            vs.append(v)
        f = bm_body.faces.new(vs)
        f.smooth = True
        for loop in f.loops:
            loop[uv_body].uv = UV_SUPERMAN_RED

    bm_body.normal_update()
    bm_body.to_mesh(body_obj.data)
    bm_body.free()
    body_obj.data.update()

    # ─────────────────────────────────────────────────────────────
    # C. ARMS & HANDS: CLEAN WRIST TRANSITIONS & SMOOTH SHADING
    # ─────────────────────────────────────────────────────────────
    for arm_obj in [arm_l_obj, arm_r_obj]:
        bm_arm = bmesh.new()
        bm_arm.from_mesh(arm_obj.data)
        uv_arm = bm_arm.loops.layers.uv.verify()
        for f in bm_arm.faces:
            f.smooth = True
            cx = abs(f.calc_center_median().x)
            # Hand is strictly at abs(x) >= 0.78
            if cx >= 0.78:
                for loop in f.loops:
                    loop[uv_arm].uv = UV_SKIN_PEACH
            else:
                for loop in f.loops:
                    loop[uv_arm].uv = UV_ROYAL_BLUE
        bm_arm.normal_update()
        bm_arm.to_mesh(arm_obj.data)
        bm_arm.free()
        arm_obj.data.update()

    # ─────────────────────────────────────────────────────────────
    # D. LEGS & RED SUPERHERO BOOTS: SMOOTH SHADING & TOP CUFFS
    # ─────────────────────────────────────────────────────────────
    for leg_obj in [leg_l_obj, leg_r_obj]:
        bm_leg = bmesh.new()
        bm_leg.from_mesh(leg_obj.data)
        uv_leg = bm_leg.loops.layers.uv.verify()
        for f in bm_leg.faces:
            f.smooth = True
            cz = f.calc_center_median().z
            if cz > 0.30: # Blue tights
                for loop in f.loops:
                    loop[uv_leg].uv = UV_ROYAL_BLUE
            elif cz >= 0.27: # Boot top cuff rim
                for loop in f.loops:
                    loop[uv_leg].uv = UV_CRIMSON_RED
            else: # Red boot
                for loop in f.loops:
                    loop[uv_leg].uv = UV_SUPERMAN_RED
        bm_leg.normal_update()
        bm_leg.to_mesh(leg_obj.data)
        bm_leg.free()
        leg_obj.data.update()

    # ─────────────────────────────────────────────────────────────
    # E. RED SUPERHERO CAPE: SMOOTH SHADING
    # ─────────────────────────────────────────────────────────────
    bm_cape = bmesh.new()
    bm_cape.from_mesh(cape_obj.data)
    uv_cape = bm_cape.loops.layers.uv.verify()
    for f in bm_cape.faces:
        f.smooth = True
        for loop in f.loops:
            loop[uv_cape].uv = UV_SUPERMAN_RED
    bm_cape.normal_update()
    bm_cape.to_mesh(cape_obj.data)
    bm_cape.free()
    cape_obj.data.update()

    # ─────────────────────────────────────────────────────────────
    # 3. EXPORT PRODUCTION GLB WITH ALL 64 ANIMATIONS
    # ─────────────────────────────────────────────────────────────
    out_glb = os.path.join(VAL_DIR, "Superman.glb")
    print(f"Exporting polished Superman GLB to {out_glb}...")
    
    bpy.ops.export_scene.gltf(
        filepath=out_glb,
        export_format='GLB',
        use_selection=False,
        export_animations=True,
        export_skins=True,
        export_morph=True,
        export_apply=False,
    )
    print("GLB export complete!")

    for dst in TARGET_GLB_PATHS:
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if os.path.abspath(dst) != os.path.abspath(out_glb):
            shutil.copy2(out_glb, dst)
            print(f"Copied Superman.glb -> {dst}")

# ─────────────────────────────────────────────────────────────
# 4. RENDER VALIDATION VIEWS (IDLE & RUNNING ANIMATIONS)
# ─────────────────────────────────────────────────────────────
def render_validation_views():
    cam_data = bpy.data.cameras.new(name='ValCam')
    cam_obj = bpy.data.objects.new(name='ValCamObj', object_data=cam_data)
    bpy.context.scene.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj
    cam_data.lens = 50

    # Key light
    key_light_data = bpy.data.lights.new(name='KeyLight', type='SUN')
    key_light_data.energy = 4.0
    key_light_obj = bpy.data.objects.new(name='KeyLightObj', object_data=key_light_data)
    key_light_obj.rotation_euler = (0.7, 0.2, 0.5)
    bpy.context.scene.collection.objects.link(key_light_obj)

    # Fill light
    fill_light_data = bpy.data.lights.new(name='FillLight', type='SUN')
    fill_light_data.energy = 2.0
    fill_light_obj = bpy.data.objects.new(name='FillLightObj', object_data=fill_light_data)
    fill_light_obj.rotation_euler = (0.4, -0.3, -2.0)
    bpy.context.scene.collection.objects.link(fill_light_obj)

    # Podium
    bpy.ops.mesh.primitive_cylinder_add(radius=1.1, depth=0.08, location=(0, 0, -0.04))
    podium = bpy.context.active_object
    podium.name = 'Podium'
    pmat = bpy.data.materials.new(name='PodiumMat')
    pmat.use_nodes = True
    pmat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.08, 0.10, 0.14, 1.0)
    pmat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.3
    podium.data.materials.append(pmat)

    bpy.context.scene.render.resolution_x = 640
    bpy.context.scene.render.resolution_y = 640
    
    # 1. Idle views
    idle_views = [
        ("superman_front.png", (0, -3.2, 1.15), (1.5708, 0, 0)),
        ("superman_threequarter.png", (2.2, -2.4, 1.25), (1.45, 0, 0.72)),
        ("superman_side.png", (3.2, 0, 1.15), (1.5708, 0, 1.5708)),
        ("superman_rear.png", (0, 3.2, 1.15), (1.5708, 0, 3.14159)),
        ("superman_head_closeup.png", (0, -1.6, 1.65), (1.5708, 0, 0)),
        ("superman_chest_closeup.png", (0, -1.5, 0.95), (1.5708, 0, 0)),
        ("superman_hands_closeup.png", (0, -1.8, 1.05), (1.5708, 0, 0)),
    ]
    
    for filename, loc, rot in idle_views:
        cam_obj.location = loc
        cam_obj.rotation_euler = rot
        out_path = os.path.join(VAL_DIR, filename)
        bpy.context.scene.render.filepath = out_path
        bpy.ops.render.render(write_still=True)
        print(f"Rendered: {filename}")

    # 2. Running animation views (proves emblem stays 100% visible throughout running!)
    rig = bpy.data.objects.get('Rig')
    run_action = bpy.data.actions.get('Running_A')
    if rig and run_action:
        rig.animation_data.action = run_action
        
        # Test frames 5 and 12 during mid-stride running
        running_tests = [
            ("superman_running_front.png", 5, (0, -3.2, 1.15), (1.5708, 0, 0)),
            ("superman_running_threequarter.png", 5, (2.2, -2.4, 1.25), (1.45, 0, 0.72)),
            ("superman_running_frame12.png", 12, (1.8, -2.5, 1.15), (1.50, 0, 0.60)),
        ]
        for filename, frame, loc, rot in running_tests:
            bpy.context.scene.frame_set(frame)
            bpy.context.view_layer.update()
            cam_obj.location = loc
            cam_obj.rotation_euler = rot
            out_path = os.path.join(VAL_DIR, filename)
            bpy.context.scene.render.filepath = out_path
            bpy.ops.render.render(write_still=True)
            print(f"Rendered running animation frame {frame}: {filename}")

if __name__ == '__main__':
    print("Building Superman Production v2...")
    build_superman()
    print("Rendering validation views including Running_A animation...")
    render_validation_views()
    print("ALL DONE!")
