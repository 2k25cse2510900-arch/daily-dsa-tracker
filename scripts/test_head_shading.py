import bpy

bpy.ops.import_scene.gltf(filepath='characterverse/public/models/Knight.glb')
head = bpy.data.objects.get('Knight_Head')

smooth_polys = [p for p in head.data.polygons if p.use_smooth]
flat_polys = [p for p in head.data.polygons if not p.use_smooth]
print(f"Knight_Head: {len(smooth_polys)} smooth, {len(flat_polys)} flat")
for p in flat_polys[:10]:
    print(f"Flat poly center: {p.center}")
