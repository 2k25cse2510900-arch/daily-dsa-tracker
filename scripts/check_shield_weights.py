import bpy

bpy.ops.import_scene.gltf(filepath='characterverse/public/models/Superman.glb')
body = bpy.data.objects.get('Superman_Body')

shield_verts = [v for v in body.data.vertices if 0.75 < v.co.z < 1.10 and abs(v.co.x) < 0.20 and v.co.y < -0.315]
print(f"Shield verts count: {len(shield_verts)}")
for v in shield_verts[:15]:
    vgs = [(body.vertex_groups[g.group].name, round(g.weight, 4)) for g in v.groups]
    print(f"Shield vert co={v.co}: groups={vgs}")
