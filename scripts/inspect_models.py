import bpy

bpy.ops.import_scene.gltf(filepath='characterverse/public/models/Knight.glb')
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        smooth_count = sum(1 for p in obj.data.polygons if p.use_smooth)
        groups = [vg.name for vg in obj.vertex_groups]
        print(f"Knight {obj.name}: polys={len(obj.data.polygons)}, smooth={smooth_count}/{len(obj.data.polygons)}, vgroups={groups}")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='characterverse/public/models/Rogue.glb')
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        smooth_count = sum(1 for p in obj.data.polygons if p.use_smooth)
        groups = [vg.name for vg in obj.vertex_groups]
        print(f"Rogue {obj.name}: polys={len(obj.data.polygons)}, smooth={smooth_count}/{len(obj.data.polygons)}, vgroups={groups}")
