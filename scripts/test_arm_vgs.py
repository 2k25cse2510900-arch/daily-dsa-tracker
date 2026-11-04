import bpy

bpy.ops.import_scene.gltf(filepath='characterverse/public/models/Rogue.glb')
arm = bpy.data.objects.get('Rogue_ArmLeft')

hand_vg = arm.vertex_groups.get('hand.l')
wrist_vg = arm.vertex_groups.get('wrist.l')
lowerarm_vg = arm.vertex_groups.get('lowerarm.l')

hand_verts = [v for v in arm.data.vertices if hand_vg.index in [g.group for g in v.groups if g.weight > 0.5]]
print(f"Hand verts count: {len(hand_verts)}")
for v in hand_verts[:5]:
    print(f"Hand v.co: {v.co}")

non_hand_verts = [v for v in arm.data.vertices if v not in hand_verts]
print(f"Arm sleeve verts count: {len(non_hand_verts)}")
