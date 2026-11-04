import bpy
import mathutils

src = r"characterverse/public/models/Knight.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)

rig = bpy.data.objects['Rig']
arm_r = bpy.data.objects['Knight_ArmRight']
arm_l = bpy.data.objects['Knight_ArmLeft']

# Hand bones
bone_r = rig.pose.bones.get('handslot.r')
bone_l = rig.pose.bones.get('handslot.l')
wrist_r = rig.pose.bones.get('hand.r') or rig.pose.bones.get('wrist.r')
wrist_l = rig.pose.bones.get('hand.l') or rig.pose.bones.get('wrist.l')

print("Bones:")
print("handslot.r matrix in world:", bone_r.matrix if bone_r else None)
print("handslot.l matrix in world:", bone_l.matrix if bone_l else None)
print("all bones in rig:")
for b in rig.pose.bones:
    if any(k in b.name.lower() for k in ['hand', 'wrist', 'arm']):
        print(f"  {b.name}: parent={b.parent.name if b.parent else None}")

# Check 1H_Sword vs 2H_Sword handle bounds
for name in ['1H_Sword', '2H_Sword', '1H_Sword_Offhand', 'Spike_Shield']:
    o = bpy.data.objects.get(name)
    if o:
        verts_local = o.data.vertices
        min_co = [min(v.co[i] for v in verts_local) for i in range(3)]
        max_co = [max(v.co[i] for v in verts_local) for i in range(3)]
        print(f"\n{name} local bounding box:")
        print(f"  X: [{min_co[0]:.3f}, {max_co[0]:.3f}]")
        print(f"  Y: [{min_co[1]:.3f}, {max_co[1]:.3f}]")
        print(f"  Z: [{min_co[2]:.3f}, {max_co[2]:.3f}]")
        
        verts_world = [o.matrix_world @ v.co for v in verts_local]
        min_w = [min(v[i] for v in verts_world) for i in range(3)]
        max_w = [max(v[i] for v in verts_world) for i in range(3)]
        print(f"{name} world bounding box:")
        print(f"  X: [{min_w[0]:.3f}, {max_w[0]:.3f}]")
        print(f"  Y: [{min_w[1]:.3f}, {max_w[1]:.3f}]")
        print(f"  Z: [{min_w[2]:.3f}, {max_w[2]:.3f}]")
