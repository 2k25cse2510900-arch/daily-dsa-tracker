import bpy

bpy.ops.import_scene.gltf(filepath='characterverse/public/models/Rogue.glb')
body = bpy.data.objects.get('Rogue_Body')
chest_vg = body.vertex_groups.get('chest')
print(f"Chest vertex group index: {chest_vg.index if chest_vg else None}")

chest_weights = []
for v in body.data.vertices:
    if v.co.y < -0.20 and 0.8 < v.co.z < 1.1:
        for g in v.groups:
            vg_name = body.vertex_groups[g.group].name
            chest_weights.append((vg_name, g.weight))
            
print("Sample chest weights in Rogue_Body:", set(chest_weights))
