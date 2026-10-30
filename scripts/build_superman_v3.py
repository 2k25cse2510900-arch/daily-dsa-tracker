"""
Build Stylized Superman Character for CharacterVerse (High-Quality Production v3)
Matches the exact KayKit low-poly art style and quality of Buster Blitz (Knight) and Nebula Nova (Rogue).
Fixes:
1. Symmetrical sleek athletic torso (removing rogue pouches and replacing with mirrored clean hip contour).
2. Clean neck collar transition (smoothing out rogue bandana).
3. Crisp solid 3D pentagonal S-shield emblem weighted 100% to chest bone.
4. Clean wrist and boot edge loop transitions without jagged color bleeding.
5. Consistent PBR materials with Linear texture interpolation, 0.5 roughness, 0.5 specular.
6. Export to all 5 project model paths.
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

def create_superman_texture():
    tex_path = os.path.join(VAL_DIR, "superman_texture.png")
    width, height = 1024, 1024
    
    PALETTE = {
        'ROYAL_BLUE':   (0.032, 0.260, 0.740, 1.0), # Rich, deep, heroic Royal Blue
        'DARK_BLUE':    (0.018, 0.160, 0.480, 1.0),
        'SUPERMAN_RED': (0.863, 0.149, 0.149, 1.0), # #dc2626 - Rich Cape/Trunk/Boot Red
        'CRIMSON_RED':  (0.650, 0.080, 0.080, 1.0), # Deep boot cuff red
        'HERO_YELLOW':  (1.000, 0.757, 0.027, 1.0), # #ffc107 - Bright Emblem Yellow
        'DARK_GOLD':    (0.850, 0.467, 0.024, 1.0), # #d97706 - Buckle Gold
        'SKIN_PEACH':   (0.996, 0.843, 0.667, 1.0), # #fed7aa - Stylized Face/Hand Peach
        'JET_BLACK':    (0.067, 0.094, 0.153, 1.0), # #111827 - Hair/Eyebrows Black
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
    
    # Shared PBR Material matching Knight and Rogue
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
    node_tex.interpolation = 'Linear' # Linear interpolation for smooth crisp texture sampling!
    
    node_bsdf.inputs['Roughness'].default_value = 0.55
    # Specular 0.35 matching rich velvety superhero fabric
    if 'Specular IOR Level' in node_bsdf.inputs:
        node_bsdf.inputs['Specular IOR Level'].default_value = 0.35
    elif 'Specular' in node_bsdf.inputs:
        node_bsdf.inputs['Specular'].default_value = 0.35
    node_bsdf.inputs['Metallic'].default_value = 0.0
    if 'Alpha' in node_bsdf.inputs:
        node_bsdf.inputs['Alpha'].default_value = 1.0
    superman_mat.blend_method = 'OPAQUE'
    if hasattr(superman_mat, 'shadow_method'):
        superman_mat.shadow_method = 'OPAQUE'
    
    links.new(node_tex.outputs['Color'], node_bsdf.inputs['Base Color'])
    links.new(node_bsdf.outputs['BSDF'], node_out.inputs['Surface'])
    
    for obj in [head_obj, body_obj, arm_l_obj, arm_r_obj, leg_l_obj, leg_r_obj, cape_obj]:
        obj.data.materials.clear()
        obj.data.materials.append(superman_mat)

    # ─────────────────────────────────────────────────────────────
    # A. HEAD: HEROIC SQUARE JAW, JET BLACK HAIR & ICONIC S-CURL
    # ─────────────────────────────────────────────────────────────
    bm_head = bmesh.new()
    bm_head.from_mesh(head_obj.data)
    uv_head = bm_head.loops.layers.uv.verify()
    dvert_head = bm_head.verts.layers.deform.verify()
    head_vg = head_obj.vertex_groups.get('head')
    head_group_idx = head_vg.index if head_vg else 0
    
    # Authentic KayKit UV mapping: U < 0.11 is face/skin, U >= 0.11 is hair / eyes
    for f in bm_head.faces:
        f.smooth = True
        u_vals = [loop[uv_head].uv.x for loop in f.loops]
        avg_u = sum(u_vals) / len(u_vals)
        if avg_u < 0.11:
            for loop in f.loops:
                loop[uv_head].uv = UV_SKIN_PEACH
        else:
            for loop in f.loops:
                loop[uv_head].uv = UV_JET_BLACK

    bmesh.ops.recalc_face_normals(bm_head, faces=bm_head.faces)
    bm_head.to_mesh(head_obj.data)
    bm_head.free()
    head_obj.data.update()

    # ─────────────────────────────────────────────────────────────
    # B. BODY: SLEEK SYMMETRICAL WAIST, RED TRUNKS & 100% RIGGED 3D SHIELD
    # ─────────────────────────────────────────────────────────────
    bm_body = bmesh.new()
    bm_body.from_mesh(body_obj.data)
    uv_body = bm_body.loops.layers.uv.verify()
    dvert_body = bm_body.verts.layers.deform.verify()
    
    chest_vg = body_obj.vertex_groups.get('chest')
    chest_idx = chest_vg.index if chest_vg else 0
    hips_vg = body_obj.vertex_groups.get('hips')
    hips_idx = hips_vg.index if hips_vg else 0
    
    # 1. Clean Symmetrical Waist & Remove Rogue Pouches, Scarf, Skirt Flaps & Buckle Bits:
    visited = set()
    islands = []
    for f in bm_body.faces:
        if f not in visited:
            isl = []
            st = [f]
            visited.add(f)
            while st:
                curr = st.pop()
                isl.append(curr)
                for e in curr.edges:
                    for lf in e.link_faces:
                        if lf not in visited:
                            visited.add(lf)
                            st.append(lf)
            islands.append(isl)

    del_faces = []
    for isl in islands:
        xs = [v.co.x for f in isl for v in f.verts]
        ys = [v.co.y for f in isl for v in f.verts]
        zs = [v.co.z for f in isl for v in f.verts]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        min_z, max_z = min(zs), max(zs)
        
        # Hip pouches (Z: 0.45-0.70, |X| > 0.17):
        if min_z > 0.45 and max_z < 0.70 and (min_x > 0.17 or max_x < -0.17) and len(isl) < 40:
            del_faces.extend(isl)
        # Dangling cowl triangle tip:
        elif min_z < 0.86 and min_y < -0.28 and max_z < 0.90 and len(isl) < 20:
            del_faces.extend(isl)
        # Outer flared skirt flaps (Z in 0.40-0.50, flared out |X| > 0.31 or Y > 0.25):
        elif min_z >= 0.40 and max_z <= 0.50 and (max_x > 0.31 or min_x < -0.31):
            del_faces.extend(isl)
        # Rogue buckle / front pouch bits:
        elif min_z >= 0.49 and max_z <= 0.67 and abs(min_x) < 0.15 and abs(max_x) < 0.15 and min_y < -0.22:
            del_faces.extend(isl)
        # Old flared skirt & broken lower crotch (all fragments below belt z < 0.485):
        elif max_z < 0.485:
            del_faces.extend(isl)

    # Ensure all old fragmented body faces below belt are removed for clean solid trunks rebuild
    for f in bm_body.faces:
        if f.calc_center_median().z < 0.485 and f not in del_faces:
            del_faces.append(f)

    bmesh.ops.delete(bm_body, geom=del_faces, context='FACES')

    del_loose = [v for v in bm_body.verts if not v.link_faces]
    bmesh.ops.delete(bm_body, geom=del_loose, context='VERTS')

    def get_athletic_chest_y(x, z):
        z_rel = (z - 0.94) / 0.28
        y_base = -0.325 + 0.140 * max(0.0, z_rel) ** 1.8
        x_rel = abs(x) / 0.38
        y_base += 0.040 * min(1.0, x_rel ** 2)
        return y_base

    for v in bm_body.verts:
        # Symmetrize & streamline hips/trunks (Z: 0.37 to 0.49)
        if 0.37 <= v.co.z <= 0.49:
            r = math.hypot(v.co.x, v.co.y)
            target_r = 0.285 + 0.005 * ((v.co.z - 0.37) / 0.12)
            if r > target_r and r > 0.001:
                scale = target_r / r
                v.co.x *= scale
                v.co.y *= scale
        # Symmetrize waist (Z: 0.49 to 0.64)
        elif 0.49 < v.co.z <= 0.64:
            r = math.hypot(v.co.x, v.co.y)
            if r > 0.292 and abs(v.co.x) > 0.10:
                scale = 0.290 / r
                v.co.x *= scale
                v.co.y *= scale
        # Smooth upper chest & collar flush with athletic chest contour
        if 0.88 <= v.co.z <= 1.25 and v.co.y < -0.15:
            target_y = get_athletic_chest_y(v.co.x, v.co.z)
            if v.co.y < target_y:
                v.co.y = target_y
            elif v.co.y > target_y + 0.05 and abs(v.co.x) < 0.18:
                v.co.y = target_y

    # Bridge front abdomen gap between Z ~ 0.523 and Z ~ 0.627
    low_boundary_verts = []
    up_boundary_verts = []
    for v in bm_body.verts:
        if abs(v.co.z - 0.523) < 0.006 and v.co.y < -0.05:
            if any(not e.is_manifold for e in v.link_edges):
                if v not in low_boundary_verts:
                    low_boundary_verts.append(v)
        elif abs(v.co.z - 0.627) < 0.006 and v.co.y < -0.05:
            if any(not e.is_manifold for e in v.link_edges):
                if v not in up_boundary_verts:
                    up_boundary_verts.append(v)

    def dedup_by_x(v_list):
        seen = {}
        for v in v_list:
            k = round(v.co.x, 3)
            if k not in seen:
                seen[k] = v
        return [seen[k] for k in sorted(seen.keys())]

    low_sorted = dedup_by_x(low_boundary_verts)
    up_sorted = dedup_by_x(up_boundary_verts)

    if len(low_sorted) == len(up_sorted) and len(low_sorted) > 1:
        for i in range(len(low_sorted) - 1):
            v0 = low_sorted[i]
            v1 = low_sorted[i+1]
            v2 = up_sorted[i+1]
            v3 = up_sorted[i]
            try:
                f = bm_body.faces.new([v0, v3, v2, v1])
                f.smooth = True
                for loop in f.loops:
                    loop[uv_body].uv = UV_ROYAL_BLUE
            except ValueError:
                pass

    # Recolor body faces: Royal Blue suit, Red Trunks, Yellow underlay
    for f in bm_body.faces:
        f.smooth = True
        cz = f.calc_center_median().z
        if cz < 0.485:
            # Red Trunks
            for loop in f.loops:
                loop[uv_body].uv = UV_SUPERMAN_RED
        elif cz > 0.555:
            # Royal Blue Suit
            for loop in f.loops:
                loop[uv_body].uv = UV_ROYAL_BLUE
        else:
            # Gold Belt underlay
            for loop in f.loops:
                loop[uv_body].uv = UV_HERO_YELLOW

    # 2. DEDICATED SOLID 3D BELT RING
    # Continuous 360-degree stylized superhero belt ring wrapped around waist (Z: 0.485 to 0.555)
    # Raised proud of body with beveled top and bottom rims, 100% hips bone weighting
    N_SEGS = 24
    z_belt_bot = 0.485
    z_belt_top = 0.555
    z_bevel = 0.005

    rx = 0.288
    ry = 0.295
    belt_thickness = 0.008

    top_inner_ring = []
    top_outer_ring = []
    bot_outer_ring = []
    bot_inner_ring = []

    for i in range(N_SEGS):
        phi = (2.0 * math.pi * i) / N_SEGS
        cos_p = math.cos(phi)
        sin_p = math.sin(phi)
        
        r_base = (rx * ry) / math.hypot(ry * sin_p, rx * cos_p)
        r_out = r_base + belt_thickness
        
        x_in = r_base * sin_p
        y_in = -r_base * cos_p
        x_out = r_out * sin_p
        y_out = -r_out * cos_p
        
        v_ti = bm_body.verts.new(Vector((x_in, y_in, z_belt_top)))
        v_ti[dvert_body][hips_idx] = 1.0
        top_inner_ring.append(v_ti)
        
        v_to = bm_body.verts.new(Vector((x_out, y_out, z_belt_top - z_bevel)))
        v_to[dvert_body][hips_idx] = 1.0
        top_outer_ring.append(v_to)
        
        v_bo = bm_body.verts.new(Vector((x_out, y_out, z_belt_bot + z_bevel)))
        v_bo[dvert_body][hips_idx] = 1.0
        bot_outer_ring.append(v_bo)
        
        v_bi = bm_body.verts.new(Vector((x_in, y_in, z_belt_bot)))
        v_bi[dvert_body][hips_idx] = 1.0
        bot_inner_ring.append(v_bi)

    for i in range(N_SEGS):
        i_next = (i + 1) % N_SEGS
        # Top beveled rim:
        f_top = bm_body.faces.new([top_inner_ring[i], top_inner_ring[i_next], top_outer_ring[i_next], top_outer_ring[i]])
        f_top.smooth = True
        for loop in f_top.loops:
            loop[uv_body].uv = UV_HERO_YELLOW
            
        # Vertical outer belt face:
        f_mid = bm_body.faces.new([top_outer_ring[i], top_outer_ring[i_next], bot_outer_ring[i_next], bot_outer_ring[i]])
        f_mid.smooth = True
        for loop in f_mid.loops:
            loop[uv_body].uv = UV_HERO_YELLOW
            
        # Bottom beveled rim:
        f_bot = bm_body.faces.new([bot_outer_ring[i], bot_outer_ring[i_next], bot_inner_ring[i_next], bot_inner_ring[i]])
        f_bot.smooth = True
        for loop in f_bot.loops:
            loop[uv_body].uv = UV_HERO_YELLOW

    # 3. SOLID 3D GOLD BELT BUCKLE
    # Centered on front waist, raised 7mm proud of belt outer surface
    w_buckle = 0.065
    z_buckle_top = 0.562
    z_buckle_bot = 0.478
    y_buckle_front = -(ry + belt_thickness + 0.007)
    y_belt_base = -(ry + belt_thickness)

    outer_corners = [
        (-w_buckle, z_buckle_top),
        ( w_buckle, z_buckle_top),
        ( w_buckle, z_buckle_bot),
        (-w_buckle, z_buckle_bot),
    ]

    v_b_front = []
    v_b_back = []
    for x, z in outer_corners:
        curve = 0.004 * (x / w_buckle) ** 2
        y_f = y_buckle_front + curve
        y_b = y_belt_base + curve
        
        vf = bm_body.verts.new(Vector((x, y_f, z)))
        vf[dvert_body][hips_idx] = 1.0
        v_b_front.append(vf)
        
        vb = bm_body.verts.new(Vector((x, y_b, z)))
        vb[dvert_body][hips_idx] = 1.0
        v_b_back.append(vb)

    w_plate = 0.038
    z_plate_top = 0.542
    z_plate_bot = 0.498
    y_plate = y_buckle_front + 0.003 # Inset 3mm into buckle

    inner_corners = [
        (-w_plate, z_plate_top),
        ( w_plate, z_plate_top),
        ( w_plate, z_plate_bot),
        (-w_plate, z_plate_bot),
    ]

    v_plate = []
    for x, z in inner_corners:
        curve = 0.004 * (x / w_buckle) ** 2
        vp = bm_body.verts.new(Vector((x, y_plate + curve, z)))
        vp[dvert_body][hips_idx] = 1.0
        v_plate.append(vp)

    # Inner buckle plate (Dark Gold clasp)
    f_inner = bm_body.faces.new(v_plate)
    f_inner.smooth = True
    for loop in f_inner.loops:
        loop[uv_body].uv = UV_DARK_GOLD

    # Outer buckle frame (Hero Yellow)
    for i in range(4):
        i_next = (i + 1) % 4
        f_frame = bm_body.faces.new([v_b_front[i], v_b_front[i_next], v_plate[i_next], v_plate[i]])
        f_frame.smooth = True
        for loop in f_frame.loops:
            loop[uv_body].uv = UV_HERO_YELLOW

    # Buckle side walls connecting front to belt:
    for i in range(4):
        i_next = (i + 1) % 4
        f_wall = bm_body.faces.new([v_b_front[i_next], v_b_back[i_next], v_b_back[i], v_b_front[i]])
        f_wall.smooth = True
        for loop in f_wall.loops:
            loop[uv_body].uv = UV_HERO_YELLOW

    # 4. SOLID 3D V-SHAPED SUPERMAN RED TRUNKS & SOLID PELVIS COVERAGE
    # Clean, symmetrical classic Superman briefs with recognizable V-cut in front,
    # high-cut hip openings, and solid closed crotch gusset & beveled leg cuffs.
    # 100% hips bone weighted, completely opaque with zero see-through holes from below.
    v_waist = bot_inner_ring # Seamlessly welded to bottom inner ring of belt!

    # Mid-hip ring (24 vertices):
    v_mid = []
    for i in range(N_SEGS):
        phi = (2.0 * math.pi * i) / N_SEGS
        cos_p = math.cos(phi)
        sin_p = math.sin(phi)
        
        r_x = 0.284
        r_y = 0.278
        r = (r_x * r_y) / math.hypot(r_y * sin_p, r_x * cos_p)
        x = r * sin_p
        y = -r * cos_p
        
        # Smooth V-drop in front, high hips at sides
        if cos_p >= 0:
            z = 0.468 - 0.055 * (cos_p ** 1.3)
        else:
            z = 0.468 - 0.035 * ((-cos_p) ** 1.3)
            
        vm = bm_body.verts.new(Vector((x, y, z)))
        vm[dvert_body][hips_idx] = 1.0
        v_mid.append(vm)

    for i in range(N_SEGS):
        i_next = (i + 1) % N_SEGS
        f = bm_body.faces.new([v_waist[i], v_waist[i_next], v_mid[i_next], v_mid[i]])
        f.smooth = True
        for loop in f.loops:
            loop[uv_body].uv = UV_SUPERMAN_RED

    left_cuff_coords = [
        (0.040, -0.160, 0.360), # 0: front-inner V
        (0.090, -0.185, 0.380), # 1: front-mid groin
        (0.160, -0.185, 0.405), # 2: front-outer groin
        (0.235, -0.140, 0.435), # 3: hip front
        (0.280,  0.000, 0.465), # 4: hip apex (high cut)
        (0.245,  0.135, 0.440), # 5: hip back
        (0.180,  0.185, 0.415), # 6: back-outer glute
        (0.100,  0.185, 0.395), # 7: back-mid glute
        (0.040,  0.155, 0.375), # 8: back-inner glute
        (0.048,  0.080, 0.365), # 9: crotch inner back
        (0.052,  0.000, 0.358), # 10: crotch inner mid
        (0.048, -0.080, 0.358), # 11: crotch inner front
    ]
    right_cuff_coords = [(-x, y, z) for x, y, z in left_cuff_coords]

    v_cuff_l = []
    for pt in left_cuff_coords:
        v = bm_body.verts.new(Vector(pt))
        v[dvert_body][hips_idx] = 1.0
        v_cuff_l.append(v)

    v_cuff_r = []
    for pt in right_cuff_coords:
        v = bm_body.verts.new(Vector(pt))
        v[dvert_body][hips_idx] = 1.0
        v_cuff_r.append(v)

    v_front_v = bm_body.verts.new(Vector((0.0, -0.170, 0.355)))
    v_front_v[dvert_body][hips_idx] = 1.0

    v_back_c = bm_body.verts.new(Vector((0.0, +0.165, 0.370)))
    v_back_c[dvert_body][hips_idx] = 1.0

    v_crotch_f = bm_body.verts.new(Vector((0.0, -0.080, 0.355)))
    v_crotch_f[dvert_body][hips_idx] = 1.0

    v_crotch_m = bm_body.verts.new(Vector((0.0,  0.000, 0.355)))
    v_crotch_m[dvert_body][hips_idx] = 1.0

    v_crotch_b = bm_body.verts.new(Vector((0.0, +0.080, 0.362)))
    v_crotch_b[dvert_body][hips_idx] = 1.0

    trunks_faces = []

    # Front V panel:
    trunks_faces.append(bm_body.faces.new([v_mid[0], v_mid[1], v_cuff_l[0], v_front_v]))
    trunks_faces.append(bm_body.faces.new([v_front_v, v_cuff_r[0], v_mid[23], v_mid[0]]))

    # Left groin & hip panel:
    trunks_faces.append(bm_body.faces.new([v_mid[1], v_mid[2], v_cuff_l[1], v_cuff_l[0]]))
    trunks_faces.append(bm_body.faces.new([v_mid[2], v_mid[3], v_cuff_l[2], v_cuff_l[1]]))
    trunks_faces.append(bm_body.faces.new([v_mid[3], v_mid[4], v_cuff_l[3], v_cuff_l[2]]))
    trunks_faces.append(bm_body.faces.new([v_mid[4], v_mid[5], v_cuff_l[4], v_cuff_l[3]]))
    trunks_faces.append(bm_body.faces.new([v_mid[5], v_mid[6], v_cuff_l[4]]))
    trunks_faces.append(bm_body.faces.new([v_mid[6], v_mid[7], v_cuff_l[5], v_cuff_l[4]]))
    trunks_faces.append(bm_body.faces.new([v_mid[7], v_mid[8], v_cuff_l[5]]))
    trunks_faces.append(bm_body.faces.new([v_mid[8], v_mid[9], v_cuff_l[6], v_cuff_l[5]]))
    trunks_faces.append(bm_body.faces.new([v_mid[9], v_mid[10], v_cuff_l[7], v_cuff_l[6]]))
    trunks_faces.append(bm_body.faces.new([v_mid[10], v_mid[11], v_cuff_l[8], v_cuff_l[7]]))
    trunks_faces.append(bm_body.faces.new([v_mid[11], v_mid[12], v_back_c, v_cuff_l[8]]))

    # Right groin & hip panel:
    trunks_faces.append(bm_body.faces.new([v_mid[23], v_cuff_r[0], v_cuff_r[1], v_mid[22]]))
    trunks_faces.append(bm_body.faces.new([v_mid[22], v_cuff_r[1], v_cuff_r[2], v_mid[21]]))
    trunks_faces.append(bm_body.faces.new([v_mid[21], v_cuff_r[2], v_cuff_r[3], v_mid[20]]))
    trunks_faces.append(bm_body.faces.new([v_mid[20], v_cuff_r[3], v_cuff_r[4], v_mid[19]]))
    trunks_faces.append(bm_body.faces.new([v_mid[19], v_cuff_r[4], v_mid[18]]))
    trunks_faces.append(bm_body.faces.new([v_mid[18], v_cuff_r[4], v_cuff_r[5], v_mid[17]]))
    trunks_faces.append(bm_body.faces.new([v_mid[17], v_cuff_r[5], v_mid[16]]))
    trunks_faces.append(bm_body.faces.new([v_mid[16], v_cuff_r[5], v_cuff_r[6], v_mid[15]]))
    trunks_faces.append(bm_body.faces.new([v_mid[15], v_cuff_r[6], v_cuff_r[7], v_mid[14]]))
    trunks_faces.append(bm_body.faces.new([v_mid[14], v_cuff_r[7], v_cuff_r[8], v_mid[13]]))
    trunks_faces.append(bm_body.faces.new([v_mid[12], v_mid[13], v_cuff_r[8], v_back_c]))

    # Crotch Gusset (solid underside bridge between legs):
    trunks_faces.append(bm_body.faces.new([v_front_v, v_cuff_l[0], v_cuff_l[11], v_crotch_f]))
    trunks_faces.append(bm_body.faces.new([v_front_v, v_crotch_f, v_cuff_r[11], v_cuff_r[0]]))
    trunks_faces.append(bm_body.faces.new([v_crotch_f, v_cuff_l[11], v_cuff_l[10], v_crotch_m]))
    trunks_faces.append(bm_body.faces.new([v_crotch_f, v_crotch_m, v_cuff_r[10], v_cuff_r[11]]))
    trunks_faces.append(bm_body.faces.new([v_crotch_m, v_cuff_l[10], v_cuff_l[9], v_crotch_b]))
    trunks_faces.append(bm_body.faces.new([v_crotch_m, v_crotch_b, v_cuff_r[9], v_cuff_r[10]]))
    trunks_faces.append(bm_body.faces.new([v_crotch_b, v_cuff_l[9], v_cuff_l[8], v_back_c]))
    trunks_faces.append(bm_body.faces.new([v_crotch_b, v_back_c, v_cuff_r[8], v_cuff_r[9]]))

    # Inner cuffs (beveled lips wrapping inward around thigh columns):
    x_leg_l = 0.1709
    x_leg_r = -0.1709
    for is_l, v_cuff, center_x in [(True, v_cuff_l, x_leg_l), (False, v_cuff_r, x_leg_r)]:
        v_inner = []
        for v in v_cuff:
            dx = v.co.x - center_x
            dy = v.co.y
            dist = math.hypot(dx, dy)
            scale = max(0.001, (dist - 0.008) / dist) if dist > 0.001 else 1.0
            vx = center_x + dx * scale
            vy = dy * scale
            vz = v.co.z + 0.006
            v_in = bm_body.verts.new(Vector((vx, vy, vz)))
            v_in[dvert_body][hips_idx] = 1.0
            v_inner.append(v_in)
            
        for k in range(12):
            k_next = (k + 1) % 12
            if is_l:
                f_c = bm_body.faces.new([v_cuff[k], v_cuff[k_next], v_inner[k_next], v_inner[k]])
            else:
                f_c = bm_body.faces.new([v_cuff[k_next], v_cuff[k], v_inner[k], v_inner[k_next]])
            trunks_faces.append(f_c)

    for f in trunks_faces:
        f.smooth = True
        for loop in f.loops:
            loop[uv_body].uv = UV_SUPERMAN_RED

    # 3. Solid 3D Pentagonal S-Shield Emblem
    # Raised proud of chest surface (z ~ 0.78 to 1.06, center at 0.94)
    # 100% weighted to chest bone so it moves in perfect lockstep without warping!
    def get_chest_y(x, z):
        # Smooth athletic chest profile matching actual body mesh surface
        z_diff = z - 0.94
        return -0.325 + 0.150 * (z_diff ** 2) + 0.080 * (x ** 2)

    # Base pentagon coordinates (width +/-0.140, height 0.775 to 1.060)
    base_coords = [
        (-0.140, 1.060), # 0: top left
        (0.000,  1.060), # 1: top center
        (0.140,  1.060), # 2: top right
        (0.160,  0.945), # 3: mid right
        (0.000,  0.775), # 4: bottom point
        (-0.160, 0.945), # 5: mid left
    ]
    
    # Outer Red Rim (width +/-0.155, height 0.755 to 1.075)
    rim_coords = [
        (-0.155, 1.075),
        (0.000,  1.075),
        (0.155,  1.075),
        (0.178,  0.945),
        (0.000,  0.755),
        (-0.178, 0.945),
    ]

    # Center vertex of yellow plate (subtly raised 3.5mm proud of chest)
    center_y = get_chest_y(0.0, 0.94) - 0.0035
    center_v = bm_body.verts.new(Vector((0.0, center_y, 0.94)))
    center_v[dvert_body][chest_idx] = 1.0 # 100% CHEST BONE!

    v_base = []
    for x, z in base_coords:
        y = get_chest_y(x, z) - 0.0035
        v = bm_body.verts.new(Vector((x, y, z)))
        v[dvert_body][chest_idx] = 1.0 # 100% CHEST BONE!
        v_base.append(v)

    # Yellow Plate Faces
    for i in range(len(v_base)):
        i_next = (i + 1) % len(v_base)
        f = bm_body.faces.new([center_v, v_base[i], v_base[i_next]])
        f.smooth = True
        for loop in f.loops:
            loop[uv_body].uv = UV_HERO_YELLOW

    # Raised Beveled Red Outer Rim (flush with chest surface at 0.001m beveling up to 0.0035m)
    v_rim = []
    for x, z in rim_coords:
        y = get_chest_y(x, z) - 0.0010
        v = bm_body.verts.new(Vector((x, y, z)))
        v[dvert_body][chest_idx] = 1.0 # 100% CHEST BONE!
        v_rim.append(v)

    for i in range(len(v_rim)):
        i_next = (i + 1) % len(v_rim)
        f = bm_body.faces.new([v_base[i], v_base[i_next], v_rim[i_next], v_rim[i]])
        f.smooth = True
        for loop in f.loops:
            loop[uv_body].uv = UV_SUPERMAN_RED

    # Smooth Continuous Stylized 'S' Ribbon (raised 2.5mm proud of yellow plate, 6mm total)
    s_pairs = [
        # Top-right roof serif
        (( 0.075, 1.040), ( 0.075, 1.010)),
        # Top horizontal roof
        (( 0.020, 1.040), ( 0.020, 1.010)),
        ((-0.035, 1.040), (-0.035, 1.010)),
        # Top-left curved turn
        ((-0.062, 1.032), (-0.050, 1.006)),
        ((-0.080, 1.008), (-0.056, 0.990)),
        ((-0.082, 0.970), (-0.054, 0.965)),
        # Transition into diagonal
        ((-0.065, 0.935), (-0.038, 0.950)),
        # Center diagonal slash
        ((-0.025, 0.915), ( 0.005, 0.930)),
        (( 0.005, 0.890), ( 0.035, 0.905)),
        # Transition to lower-right lobe
        (( 0.040, 0.875), ( 0.065, 0.890)),
        # Lower-right curved turn
        (( 0.082, 0.860), ( 0.054, 0.865)),
        (( 0.080, 0.822), ( 0.056, 0.840)),
        (( 0.062, 0.798), ( 0.050, 0.824)),
        # Bottom horizontal floor
        (( 0.035, 0.790), ( 0.035, 0.820)),
        ((-0.020, 0.790), (-0.020, 0.820)),
        # Bottom-left tail turn
        ((-0.055, 0.792), (-0.045, 0.820)),
        ((-0.075, 0.812), (-0.050, 0.835)),
        ((-0.075, 0.850), (-0.050, 0.850)),
    ]

    v_s_pairs = []
    for p_out, p_in in s_pairs:
        y_out = get_chest_y(p_out[0], p_out[1]) - 0.0060
        vo = bm_body.verts.new(Vector((p_out[0], y_out, p_out[1])))
        vo[dvert_body][chest_idx] = 1.0
        
        y_in = get_chest_y(p_in[0], p_in[1]) - 0.0060
        vi = bm_body.verts.new(Vector((p_in[0], y_in, p_in[1])))
        vi[dvert_body][chest_idx] = 1.0
        
        v_s_pairs.append((vo, vi))

    # Top-right serif terminal cap
    p_serif = [(0.051, 1.010), (0.075, 1.010), (0.075, 0.982), (0.051, 0.982)]
    v_serif = []
    for x, z in p_serif:
        y = get_chest_y(x, z) - 0.0060
        vs = bm_body.verts.new(Vector((x, y, z)))
        vs[dvert_body][chest_idx] = 1.0
        v_serif.append(vs)
    f_serif = bm_body.faces.new(v_serif)
    f_serif.smooth = True
    for loop in f_serif.loops:
        loop[uv_body].uv = UV_SUPERMAN_RED

    # Continuous quads along the entire S ribbon
    for i in range(len(v_s_pairs) - 1):
        vo0, vi0 = v_s_pairs[i]
        vo1, vi1 = v_s_pairs[i + 1]
        f_s = bm_body.faces.new([vi0, vo0, vo1, vi1])
        f_s.smooth = True
        for loop in f_s.loops:
            loop[uv_body].uv = UV_SUPERMAN_RED

    bmesh.ops.recalc_face_normals(bm_body, faces=bm_body.faces)
    bm_body.to_mesh(body_obj.data)
    bm_body.free()
    body_obj.data.update()

    # ─────────────────────────────────────────────────────────────
    # C. ARMS & HANDS: CLEAN WRIST TRANSITIONS & MATCHING FISTS
    # ─────────────────────────────────────────────────────────────
    for arm_obj in [arm_l_obj, arm_r_obj]:
        bm_arm = bmesh.new()
        bm_arm.from_mesh(arm_obj.data)
        uv_arm = bm_arm.loops.layers.uv.verify()
        
        # Smooth sleeve geometry: clamp bicep straps & bracer flares to sleek athletic cylinder
        for v in bm_arm.verts:
            ax = abs(v.co.x)
            if ax < 0.768:
                t = max(0.0, min(1.0, (ax - 0.15) / 0.62))
                target_r = 0.111 - 0.011 * t
                dz = v.co.z - 1.1048
                curr_r = math.hypot(v.co.y, dz)
                if curr_r > target_r and curr_r > 0.001:
                    scale = target_r / curr_r
                    v.co.y = v.co.y * scale
                    v.co.z = 1.1048 + dz * scale

        for f in bm_arm.faces:
            f.smooth = True
            cx = abs(f.calc_center_median().x)
            # Crisp wrist line: Royal Blue sleeve up to 0.768, Peach hand at >= 0.768
            if cx >= 0.768:
                for loop in f.loops:
                    loop[uv_arm].uv = UV_SKIN_PEACH
            else:
                for loop in f.loops:
                    loop[uv_arm].uv = UV_ROYAL_BLUE

        bmesh.ops.recalc_face_normals(bm_arm, faces=bm_arm.faces)
        bm_arm.to_mesh(arm_obj.data)
        bm_arm.free()
        arm_obj.data.update()

    # ─────────────────────────────────────────────────────────────
    # D. LEGS & BOOTS: SOLID, SEAMLESS SUPERHERO LEGS & RED BOOTS
    # ─────────────────────────────────────────────────────────────
    for leg_obj in [leg_l_obj, leg_r_obj]:
        is_left = ('Left' in leg_obj.name)
        center_x = 0.1709 if is_left else -0.1709
        
        bm_leg = bmesh.new()
        bm_leg.from_mesh(leg_obj.data)
        uv_leg = bm_leg.loops.layers.uv.verify()
        dvert_leg = bm_leg.verts.layers.deform.verify()
        
        vg_upper_idx = leg_obj.vertex_groups.get('upperleg.l' if is_left else 'upperleg.r').index
        vg_lower_idx = leg_obj.vertex_groups.get('lowerleg.l' if is_left else 'lowerleg.r').index
        vg_foot_idx  = leg_obj.vertex_groups.get('foot.l' if is_left else 'foot.r').index
        
        # 1. Delete old disjointed knee/thigh rings and loose strap fragments:
        del_faces = [f for f in bm_leg.faces if any(v.co.z > 0.215 for v in f.verts)]
        
        visited_leg = set()
        leg_islands = []
        for f in bm_leg.faces:
            if f not in visited_leg and f not in del_faces:
                isl = []
                st = [f]
                visited_leg.add(f)
                while st:
                    curr = st.pop()
                    isl.append(curr)
                    for e in curr.edges:
                        for lf in e.link_faces:
                            if lf not in visited_leg and lf not in del_faces:
                                visited_leg.add(lf)
                                st.append(lf)
                leg_islands.append(isl)

        for isl in leg_islands:
            zs = [v.co.z for f in isl for v in f.verts]
            if min(zs) >= 0.05 and max(zs) <= 0.22 and len(isl) < 10:
                del_faces.extend(isl)

        bmesh.ops.delete(bm_leg, geom=del_faces, context='FACES')
        
        # Delete any orphaned/floating vertices
        floating = [v for v in bm_leg.verts if not v.link_faces]
        bmesh.ops.delete(bm_leg, geom=floating, context='VERTS')

        # 2. Find the 14 boundary rim vertices at the top of the boot (Z ~ 0.2116)
        rim_verts = [v for v in bm_leg.verts if abs(v.co.z - 0.2116) < 0.005 and v.is_boundary]
        
        rim_dict = {}
        for v in rim_verts:
            dx = v.co.x - center_x
            dy = v.co.y
            a = math.atan2(dy, dx)
            key = round(math.degrees(a), 0)
            if key not in rim_dict:
                rim_dict[key] = (a, v)
                
        sorted_rim = [t[1] for t in sorted(rim_dict.values(), key=lambda t: t[0])]
        N = len(sorted_rim)
        base_offsets = [(v.co.x - center_x, v.co.y) for v in sorted_rim]

        # 3. Construct a continuous, solid athletic superhero leg column
        # seamlessly welded to the boot collar and extending deep into the pelvis under the red trunks:
        levels = [
            (0.245, 0.98),  # Crimson cuff top
            (0.290, 0.95),  # Lower knee transition
            (0.340, 0.94),  # Mid knee
            (0.400, 0.96),  # Lower thigh
            (0.460, 0.98),  # Mid thigh
            (0.510, 0.96),  # Upper thigh entering red trunks
            (0.570, 0.90),  # Deep inside pelvis
        ]

        prev_ring = sorted_rim
        for z_h, r_scale in levels:
            curr_ring = []
            if z_h >= 0.38:
                w_upper, w_lower = 1.0, 0.0
            elif z_h >= 0.24:
                t = (z_h - 0.24) / (0.38 - 0.24)
                w_upper, w_lower = t, 1.0 - t
            else:
                w_upper, w_lower = 0.0, 1.0
                
            for i in range(N):
                dx, dy = base_offsets[i]
                vx = center_x + dx * r_scale
                vy = dy * r_scale
                vz = z_h
                new_v = bm_leg.verts.new(Vector((vx, vy, vz)))
                new_v[dvert_leg][vg_upper_idx] = w_upper
                new_v[dvert_leg][vg_lower_idx] = w_lower
                curr_ring.append(new_v)
                
            for i in range(N):
                next_i = (i + 1) % N
                # Counter-clockwise winding: [prev[i], prev[next_i], curr[next_i], curr[i]]
                face_verts = [prev_ring[i], prev_ring[next_i], curr_ring[next_i], curr_ring[i]]
                f = bm_leg.faces.new(face_verts)
                f.smooth = True
                
                if z_h >= 0.28:
                    uv_target = UV_ROYAL_BLUE
                elif z_h >= 0.24:
                    uv_target = UV_CRIMSON_RED
                else:
                    uv_target = UV_SUPERMAN_RED
                    
                for loop in f.loops:
                    loop[uv_leg].uv = uv_target
                    
            prev_ring = curr_ring

        # Close top with sealed cap face inside pelvis
        top_cap = bm_leg.faces.new(prev_ring)
        top_cap.smooth = True
        for loop in top_cap.loops:
            loop[uv_leg].uv = UV_ROYAL_BLUE

        # Recolor all lower boot faces below 0.2116
        for f in bm_leg.faces:
            f.smooth = True
            cz = f.calc_center_median().z
            if cz < 0.2116:
                for loop in f.loops:
                    loop[uv_leg].uv = UV_SUPERMAN_RED

        bmesh.ops.recalc_face_normals(bm_leg, faces=bm_leg.faces)
        bm_leg.to_mesh(leg_obj.data)
        bm_leg.free()
        leg_obj.data.update()

    # ─────────────────────────────────────────────────────────────
    # E. SUPERHERO CAPE: SMOOTH VIBRANT RED
    # ─────────────────────────────────────────────────────────────
    bm_cape = bmesh.new()
    bm_cape.from_mesh(cape_obj.data)
    uv_cape = bm_cape.loops.layers.uv.verify()
    for f in bm_cape.faces:
        f.smooth = True
        for loop in f.loops:
            loop[uv_cape].uv = UV_SUPERMAN_RED
    bmesh.ops.recalc_face_normals(bm_cape, faces=bm_cape.faces)
    bm_cape.to_mesh(cape_obj.data)
    bm_cape.free()
    cape_obj.data.update()

    # ─────────────────────────────────────────────────────────────
    # F. EXPORT TO ALL PROJECT GLB PATHS
    # ─────────────────────────────────────────────────────────────
    primary_out = TARGET_GLB_PATHS[0]
    os.makedirs(os.path.dirname(primary_out), exist_ok=True)
    
    bpy.ops.export_scene.gltf(
        filepath=primary_out,
        export_format='GLB',
        use_selection=False,
        export_apply=False,
        export_materials='EXPORT',
        export_skins=True,
        export_all_influences=True,
        export_morph=True,
        export_animations=True,
    )
    print(f"Exported primary Superman.glb to {primary_out} ({os.path.getsize(primary_out)} bytes)")
    
    # Sync to all other target paths
    for target in TARGET_GLB_PATHS[1:]:
        if os.path.exists(os.path.dirname(target)):
            shutil.copy2(primary_out, target)
            print(f"Synced to {target}")

    # Also copy to validation directory
    val_glb = os.path.join(VAL_DIR, "Superman.glb")
    shutil.copy2(primary_out, val_glb)

if __name__ == "__main__":
    build_superman()
