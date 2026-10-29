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
        'ROYAL_BLUE':   (0.043, 0.369, 0.843, 1.0), # #0b5ed7 - Classic Superman Royal Blue
        'DARK_BLUE':    (0.020, 0.200, 0.520, 1.0),
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
    
    node_bsdf.inputs['Roughness'].default_value = 0.50
    # Specular 0.50 matching Knight and Rogue
    if 'Specular IOR Level' in node_bsdf.inputs:
        node_bsdf.inputs['Specular IOR Level'].default_value = 0.50
    elif 'Specular' in node_bsdf.inputs:
        node_bsdf.inputs['Specular'].default_value = 0.50
    node_bsdf.inputs['Metallic'].default_value = 0.0
    
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

    # Sculpted 3D Front S-Curl: Anchored to hairline, curling naturally across forehead
    curl_pts = [
        Vector((-0.055, -0.415, 1.965)), # Root at hairline
        Vector((-0.035, -0.440, 1.915)),
        Vector((-0.010, -0.455, 1.855)),
        Vector((0.018,  -0.460, 1.805)),
        Vector((0.025,  -0.455, 1.760)),
        Vector((0.008,  -0.442, 1.730)),
        Vector((-0.018, -0.435, 1.740)), # Curl flick
    ]
    radii = [0.028, 0.025, 0.022, 0.018, 0.014, 0.010, 0.006]
    
    prev_ring = None
    for pt, r in zip(curl_pts, radii):
        ring = []
        for i in range(8):
            ang = i * math.pi * 2 / 8
            offset = Vector((math.cos(ang) * r, math.sin(ang) * r * 0.45, -math.sin(ang) * r * 0.85))
            v = bm_head.verts.new(pt + offset)
            v[dvert_head][head_group_idx] = 1.0 # 100% rigged to head bone!
            ring.append(v)
        if prev_ring:
            for i in range(8):
                i_next = (i + 1) % 8
                f = bm_head.faces.new([prev_ring[i], prev_ring[i_next], ring[i_next], ring[i]])
                f.smooth = True
                for loop in f.loops:
                    loop[uv_head].uv = UV_JET_BLACK
        prev_ring = ring

    # Tapered tip cap
    tip_v = bm_head.verts.new(Vector((-0.028, -0.430, 1.745)))
    tip_v[dvert_head][head_group_idx] = 1.0
    for i in range(8):
        i_next = (i + 1) % 8
        f = bm_head.faces.new([prev_ring[i], prev_ring[i_next], tip_v])
        f.smooth = True
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
    
    # 1. Clean Symmetrical Waist:
    # On the right waist (where Rogue pouch was, x > 0.16 and 0.46 <= z <= 0.65),
    # smoothly pull vertices to match the clean rounded left waist contour
    for v in bm_body.verts:
        if 0.46 <= v.co.z <= 0.65:
            # Find radius in XY plane
            r = math.hypot(v.co.x, v.co.y)
            # Left waist radius is ~0.285 - 0.30
            if v.co.x > 0.16 and r > 0.295:
                # Smoothly pull in towards clean cylinder contour
                scale = 0.295 / r
                v.co.x = v.co.x * 0.3 + (v.co.x * scale) * 0.7
                v.co.y = v.co.y * 0.3 + (v.co.y * scale) * 0.7
        # 2. Smooth the upper chest/neck bandana bump
        if v.co.y < -0.28 and 0.95 <= v.co.z <= 1.15:
            if v.co.y < -0.345:
                v.co.y = -0.340 # Flatten rogue scarf ridge flush with chest

    # Recolor body faces: Royal Blue suit, Gold Belt, Red Trunks
    for f in bm_body.faces:
        f.smooth = True
        cz = f.calc_center_median().z
        cy = f.calc_center_median().y
        cx = abs(f.calc_center_median().x)
        
        if cz < 0.49:
            # Red Trunks
            for loop in f.loops:
                loop[uv_body].uv = UV_SUPERMAN_RED
        elif 0.49 <= cz <= 0.63:
            # Gold Belt & Buckle
            if cy < -0.25 and cx < 0.08:
                for loop in f.loops:
                    loop[uv_body].uv = UV_DARK_GOLD
            else:
                for loop in f.loops:
                    loop[uv_body].uv = UV_HERO_YELLOW
        else:
            # Royal Blue Suit
            for loop in f.loops:
                loop[uv_body].uv = UV_ROYAL_BLUE

    # 3. Solid 3D Pentagonal S-Shield Emblem
    # Raised proud of chest surface (z ~ 0.78 to 1.06, center at 0.94)
    # 100% weighted to chest bone so it moves in perfect lockstep without warping!
    def get_chest_y(x, z):
        # Smooth athletic chest profile
        z_factor = 1.0 - ((z - 0.94) / 0.16) ** 2
        x_factor = 1.0 - (x / 0.22) ** 2
        return -0.320 - 0.022 * max(0.0, z_factor) - 0.012 * max(0.0, x_factor)

    # Base pentagon coordinates (width +/-0.14, height 0.775 to 1.060)
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

    # Center vertex of yellow plate
    center_y = get_chest_y(0.0, 0.94) - 0.015
    center_v = bm_body.verts.new(Vector((0.0, center_y, 0.94)))
    center_v[dvert_body][chest_idx] = 1.0 # 100% CHEST BONE!

    v_base = []
    for x, z in base_coords:
        y = get_chest_y(x, z) - 0.015
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

    # Raised Beveled Red Outer Rim
    v_rim = []
    for x, z in rim_coords:
        y = get_chest_y(x, z) - 0.022
        v = bm_body.verts.new(Vector((x, y, z)))
        v[dvert_body][chest_idx] = 1.0 # 100% CHEST BONE!
        v_rim.append(v)

    for i in range(len(v_rim)):
        i_next = (i + 1) % len(v_rim)
        f = bm_body.faces.new([v_base[i], v_base[i_next], v_rim[i_next], v_rim[i]])
        f.smooth = True
        for loop in f.loops:
            loop[uv_body].uv = UV_SUPERMAN_RED

    # Solid 3D Raised Red 'S' Symbol (proud of yellow plate at offset -0.026)
    s_facets = [
        # Upper horizontal roof
        [(-0.040, 1.040), (0.075, 1.040), (0.075, 1.000), (-0.040, 1.000)],
        # Upper-left rounded lobe
        [(-0.075, 1.040), (-0.040, 1.040), (-0.040, 0.940), (-0.075, 0.940)],
        # Center diagonal slash crossing from upper-left to lower-right
        [(-0.065, 0.970), (-0.020, 0.970), (0.065, 0.890), (0.020, 0.890)],
        # Lower-right rounded lobe
        [(0.030, 0.930), (0.075, 0.930), (0.075, 0.830), (0.030, 0.830)],
        # Bottom horizontal floor
        [(-0.055, 0.830), (0.065, 0.830), (0.045, 0.790), (-0.055, 0.790)],
        # Bottom-left tail terminal
        [(-0.075, 0.860), (-0.035, 0.860), (-0.035, 0.790), (-0.075, 0.790)],
    ]

    for facet in s_facets:
        vs = []
        for x, z in facet:
            y = get_chest_y(x, z) - 0.028
            v = bm_body.verts.new(Vector((x, y, z)))
            v[dvert_body][chest_idx] = 1.0 # 100% CHEST BONE!
            vs.append(v)
        f = bm_body.faces.new(vs)
        f.smooth = True
        for loop in f.loops:
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
        for f in bm_arm.faces:
            f.smooth = True
            cx = abs(f.calc_center_median().x)
            # Crisp wrist line: Royal Blue sleeve up to 0.76, Peach hand at >= 0.76
            if cx >= 0.76:
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
    # D. LEGS & BOOTS: CRISP RED SUPERHERO BOOTS WITH TOP CUFFS
    # ─────────────────────────────────────────────────────────────
    for leg_obj in [leg_l_obj, leg_r_obj]:
        bm_leg = bmesh.new()
        bm_leg.from_mesh(leg_obj.data)
        uv_leg = bm_leg.loops.layers.uv.verify()
        for f in bm_leg.faces:
            f.smooth = True
            cz = f.calc_center_median().z
            if cz > 0.28: # Blue tights
                for loop in f.loops:
                    loop[uv_leg].uv = UV_ROYAL_BLUE
            elif cz >= 0.25: # Boot top cuff
                for loop in f.loops:
                    loop[uv_leg].uv = UV_CRIMSON_RED
            else: # Red boots
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
