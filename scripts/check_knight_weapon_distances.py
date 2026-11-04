import bpy
import mathutils

src = r"characterverse/public/models/Knight.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)

# Remove duplicates
for name in ['1H_Sword', '1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield']:
    o = bpy.data.objects.get(name)
    if o:
        bpy.data.objects.remove(o, do_unlink=True)

sword = bpy.data.objects['2H_Sword']
shield = bpy.data.objects['Spike_Shield']
body = bpy.data.objects['Knight_Body']
arm_l = bpy.data.objects['Knight_ArmLeft']
arm_r = bpy.data.objects['Knight_ArmRight']

# Distance between sword and shield
sword_verts = [sword.matrix_world @ v.co for v in sword.data.vertices]
shield_verts = [shield.matrix_world @ v.co for v in shield.data.vertices]
body_verts = [body.matrix_world @ v.co for v in body.data.vertices]

min_sw_sh = min((sv - shv).length for sv in sword_verts for shv in shield_verts)
min_sw_bd = min((sv - bv).length for sv in sword_verts for bv in body_verts)
min_sh_bd = min((shv - bv).length for shv in shield_verts for bv in body_verts)

print(f"Min distance sword <-> shield: {min_sw_sh:.4f} m")
print(f"Min distance sword <-> body:   {min_sw_bd:.4f} m")
print(f"Min distance shield <-> body:  {min_sh_bd:.4f} m")

# Hand grip check
hand_r_verts = [arm_r.matrix_world @ v.co for v in arm_r.data.vertices if (arm_r.matrix_world @ v.co).z < 0.75 and (arm_r.matrix_world @ v.co).x < -0.35]
sword_handle_verts = [sword.matrix_world @ v.co for v in sword.data.vertices if (sword.matrix_world @ v.co).y > -0.3]
print(f"Sword handle world Y range: [{min(v.y for v in sword_handle_verts):.3f}, {max(v.y for v in sword_handle_verts):.3f}]")
print(f"Right hand world Y range:   [{min(v.y for v in hand_r_verts):.3f}, {max(v.y for v in hand_r_verts):.3f}]")

# Left hand / forearm shield check
hand_l_verts = [arm_l.matrix_world @ v.co for v in arm_l.data.vertices if (arm_l.matrix_world @ v.co).z < 0.75 and (arm_l.matrix_world @ v.co).x > 0.35]
shield_inner_verts = [shield.matrix_world @ v.co for v in shield.data.vertices if (shield.matrix_world @ v.co).x < 0.65]
print(f"Shield inner world X: {min(v.x for v in shield_inner_verts):.3f}")
print(f"Left hand world X:    {max(v.x for v in hand_l_verts):.3f}")
