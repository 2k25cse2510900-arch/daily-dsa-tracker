import bpy

bpy.ops.import_scene.gltf(filepath='characterverse/public/models/Superman.glb')
body = bpy.data.objects.get('Superman_Body')

# Find vertices with y < -0.315
emblem_verts = [v for v in body.data.vertices if v.co.y < -0.315]
print(f"Emblem verts count: {len(emblem_verts)}")
for v in emblem_verts[:10]:
    vgs = [(body.vertex_groups[g.group].name, g.weight) for g in v.groups]
    print(f"v at {v.co}: {vgs}")
